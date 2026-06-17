/**
 * Store for patient→role responsibility assignments.
 *
 * The single source of truth for "which person is responsible for which
 * professional role for each patient". A patient has one responsible person
 * per role (sjuksköterska, sjukgymnast, undersköterska, läkare, …), tracked in
 * `responsibilities: Record<roleId, personId>`. Persisted to localStorage so
 * the assignment matrix survives reloads in demo mode.
 *
 * @module features/admin/usePatientAssignments
 */

import { computed, ref, watch } from 'vue'
import {
  ADMIN_DIRECTORY_VERSION,
  type AdminDirectory,
  type Nurse,
  type PatientAssignment,
  type Role,
  type Team,
} from './admin-types'

const STORAGE_KEY = 'callcenter:admin-directory'

/** The fixed default role set shipped with the app. */
const DEFAULT_ROLES: Role[] = [
  {
    id: 'sjukskoterska',
    label: 'Sjuksköterska',
    isDefault: true,
    inboundQueue: 'sjukskoterska-linjen',
  },
  {
    id: 'underskoterska',
    label: 'Undersköterska',
    isDefault: true,
    inboundQueue: 'underskoterska-linjen',
  },
  { id: 'sjukgymnast', label: 'Sjukgymnast', isDefault: true, inboundQueue: 'sjukgymnast-linjen' },
  {
    id: 'arbetsterapeut',
    label: 'Arbetsterapeut',
    isDefault: true,
    inboundQueue: 'arbetsterapeut-linjen',
  },
  { id: 'lakare', label: 'Läkare', isDefault: true, inboundQueue: 'lakare-linjen' },
  { id: 'kurator', label: 'Kurator', isDefault: true, inboundQueue: 'kurator-linjen' },
  { id: 'dietist', label: 'Dietist', isDefault: true, inboundQueue: 'dietist-linjen' },
  { id: 'chef', label: 'Chef', isDefault: true, inboundQueue: 'chef-linjen' },
]

/** Seed directory so the matrix is legible on first open (clearly synthetic). */
function seedDirectory(): AdminDirectory {
  const teamA: Team = {
    id: 'team-a',
    name: 'Team A — Medicine',
    memberNurseIds: ['n1', 'n2', 'n4'],
  }
  const teamB: Team = { id: 'team-b', name: 'Team B — Surgery', memberNurseIds: ['n3'] }
  const nurses: Nurse[] = [
    {
      id: 'n1',
      name: 'Anna Andersson',
      teamId: 'team-a',
      extension: '1001',
      roleIds: ['sjukskoterska'],
    },
    {
      id: 'n2',
      name: 'Bo Bengtsson',
      teamId: 'team-a',
      extension: '1002',
      roleIds: ['underskoterska'],
    },
    {
      id: 'n3',
      name: 'Cecilia Carlsson',
      teamId: 'team-b',
      extension: '1003',
      roleIds: ['lakare'],
    },
    {
      id: 'n4',
      name: 'David Dahl',
      teamId: 'team-a',
      extension: '1004',
      roleIds: ['sjukgymnast', 'arbetsterapeut'],
    },
  ]
  const assignments: PatientAssignment[] = [
    {
      patientId: 'p1',
      patientName: 'Patient 1177 — Erik',
      teamId: 'team-a',
      fallbackQueue: 'support',
      responsibilities: { sjukskoterska: 'n1' },
      assignedAt: {},
    },
    {
      patientId: 'p2',
      patientName: 'Patient 1178 — Sara',
      teamId: 'team-a',
      fallbackQueue: 'support',
      responsibilities: {},
      assignedAt: {},
    },
    {
      patientId: 'p3',
      patientName: 'Patient 1179 — Per',
      teamId: 'team-b',
      fallbackQueue: 'billing',
      responsibilities: { lakare: 'n3', sjukgymnast: 'n4' },
      assignedAt: {},
    },
  ]
  return {
    version: ADMIN_DIRECTORY_VERSION,
    roles: DEFAULT_ROLES,
    teams: [teamA, teamB],
    nurses,
    assignments,
  }
}

function loadDirectory(): AdminDirectory {
  if (typeof window === 'undefined') return seedDirectory()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDirectory()
    const parsed = JSON.parse(raw) as AdminDirectory
    // Version guard: if the persisted shape is stale (e.g. the old primaryNurseId
    // model), discard it and reseed rather than risk a broken render.
    if (parsed.version !== ADMIN_DIRECTORY_VERSION) return seedDirectory()
    if (!parsed.roles || !parsed.teams || !parsed.nurses || !parsed.assignments) {
      return seedDirectory()
    }
    return parsed
  } catch {
    return seedDirectory()
  }
}

export function usePatientAssignments() {
  const directory = ref<AdminDirectory>(loadDirectory())

  // Persist on every change.
  watch(
    directory,
    (value) => {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // Quota or serialization errors are non-fatal for the demo.
      }
    },
    { deep: true }
  )

  /** All roles (default + admin-added). */
  const allRoles = computed<Role[]>(() => directory.value.roles)

  /** The default roles — the ones every patient is expected to have covered. */
  const defaultRoles = computed<Role[]>(() => directory.value.roles.filter((r) => r.isDefault))

  /** Lookup: roleId → role. */
  const roleById = computed<Map<string, Role>>(() => {
    const map = new Map<string, Role>()
    for (const r of directory.value.roles) map.set(r.id, r)
    return map
  })

  /** People eligible to hold a given role. */
  function peopleForRole(roleId: string): Nurse[] {
    return directory.value.nurses.filter((n) => n.roleIds.includes(roleId))
  }

  /**
   * Patients that are missing a responsible person for ANY default role — the
   * most urgent admin signal. A patient is "covered" only when every default
   * role has an assignee.
   */
  const unassigned = computed(() =>
    directory.value.assignments.filter((a) =>
      defaultRoles.value.some((r) => !a.responsibilities[r.id])
    )
  )

  /** Patients with full coverage: every default role assigned. */
  const fullyCovered = computed(() =>
    directory.value.assignments.filter(
      (a) => !defaultRoles.value.some((r) => !a.responsibilities[r.id])
    )
  )

  /** Lookup: patientId → its assignment. */
  const assignmentByPatient = computed<Map<string, PatientAssignment>>(() => {
    const map = new Map<string, PatientAssignment>()
    for (const a of directory.value.assignments) map.set(a.patientId, a)
    return map
  })

  /** Lookup: personId → nurse. */
  const personById = computed<Map<string, Nurse>>(() => {
    const map = new Map<string, Nurse>()
    for (const n of directory.value.nurses) map.set(n.id, n)
    return map
  })

  /** The responsible person for a given (patient, role), or null. */
  function getAssigneeFor(patientId: string, roleId: string): Nurse | null {
    const assignment = assignmentByPatient.value.get(patientId)
    const personId = assignment?.responsibilities[roleId]
    if (!personId) return null
    return personById.value.get(personId) ?? null
  }

  /**
   * Assign (or reassign) the responsible person for a (patient, role). This is
   * the "ta ansvar" action — one call, immediate effect, persisted.
   */
  function assignRole(patientId: string, roleId: string, personId: string): void {
    const idx = directory.value.assignments.findIndex((a) => a.patientId === patientId)
    if (idx === -1) return
    const next = [...directory.value.assignments]
    next[idx] = {
      ...next[idx],
      responsibilities: { ...next[idx].responsibilities, [roleId]: personId },
      assignedAt: { ...next[idx].assignedAt, [roleId]: new Date().toISOString() },
    }
    directory.value = { ...directory.value, assignments: next }
  }

  /** Clear the responsible person for a (patient, role) — back to unassigned. */
  function unassignRole(patientId: string, roleId: string): void {
    const idx = directory.value.assignments.findIndex((a) => a.patientId === patientId)
    if (idx === -1) return
    const current = directory.value.assignments[idx]
    const responsibilities = { ...current.responsibilities }
    delete responsibilities[roleId]
    const assignedAt = { ...current.assignedAt, [roleId]: new Date().toISOString() }
    const next = [...directory.value.assignments]
    next[idx] = { ...current, responsibilities, assignedAt }
    directory.value = { ...directory.value, assignments: next }
  }

  /** Add a new patient (admin creates a row, then assigns per role). */
  function addPatient(patientId: string, patientName: string, teamId: string): void {
    if (directory.value.assignments.some((a) => a.patientId === patientId)) return
    const assignment: PatientAssignment = {
      patientId,
      patientName,
      teamId,
      fallbackQueue: 'support',
      responsibilities: {},
      assignedAt: {},
    }
    directory.value = {
      ...directory.value,
      assignments: [...directory.value.assignments, assignment],
    }
  }

  /** Add a custom role (admin extension). Returns the new role id. */
  function addRole(label: string): string {
    const id = label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (directory.value.roles.some((r) => r.id === id)) return id
    const role: Role = { id, label, isDefault: false }
    directory.value = { ...directory.value, roles: [...directory.value.roles, role] }
    return id
  }

  /** Reset to the seeded directory (demo convenience). */
  function resetToSeed(): void {
    directory.value = seedDirectory()
  }

  return {
    directory,
    allRoles,
    defaultRoles,
    roleById,
    unassigned,
    fullyCovered,
    assignmentByPatient,
    personById,
    peopleForRole,
    getAssigneeFor,
    assignRole,
    unassignRole,
    addPatient,
    addRole,
    resetToSeed,
  }
}

export type UsePatientAssignmentsReturn = ReturnType<typeof usePatientAssignments>

export type UsePatientAssignmentsReturn = ReturnType<typeof usePatientAssignments>
