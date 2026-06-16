/**
 * Store for patient→OAS responsibility assignments.
 *
 * The single source of truth for "which nurse is the omvårdnadsansvarig
 * sjuksköterska (OAS) for each patient". Persisted to localStorage so the
 * assignment matrix survives reloads in demo mode.
 *
 * @module features/admin/usePatientAssignments
 */

import { computed, ref, watch } from 'vue'
import type { AdminDirectory, Nurse, PatientAssignment, Team } from './admin-types'

const STORAGE_KEY = 'callcenter:admin-directory'

/** Seed directory so the matrix is legible on first open (clearly synthetic). */
function seedDirectory(): AdminDirectory {
  const teamA: Team = { id: 'team-a', name: 'Team A — Medicine', memberNurseIds: ['n1', 'n2'] }
  const teamB: Team = { id: 'team-b', name: 'Team B — Surgery', memberNurseIds: ['n3'] }
  const nurses: Nurse[] = [
    { id: 'n1', name: 'Anna Andersson', teamId: 'team-a', extension: '1001', isOas: true },
    { id: 'n2', name: 'Bo Bengtsson', teamId: 'team-a', extension: '1002', isOas: true },
    { id: 'n3', name: 'Cecilia Carlsson', teamId: 'team-b', extension: '1003', isOas: true },
  ]
  const assignments: PatientAssignment[] = [
    {
      patientId: 'p1',
      patientName: 'Patient 1177 — Erik',
      primaryNurseId: 'n1',
      teamId: 'team-a',
      fallbackQueue: 'support',
      lastAssignedAt: null,
    },
    {
      patientId: 'p2',
      patientName: 'Patient 1178 — Sara',
      primaryNurseId: null,
      teamId: 'team-a',
      fallbackQueue: 'support',
      lastAssignedAt: null,
    },
    {
      patientId: 'p3',
      patientName: 'Patient 1179 — Per',
      primaryNurseId: 'n3',
      teamId: 'team-b',
      fallbackQueue: 'billing',
      lastAssignedAt: null,
    },
  ]
  return { teams: [teamA, teamB], nurses, assignments }
}

function loadDirectory(): AdminDirectory {
  if (typeof window === 'undefined') return seedDirectory()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedDirectory()
    const parsed = JSON.parse(raw) as AdminDirectory
    if (!parsed.teams || !parsed.nurses || !parsed.assignments) return seedDirectory()
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

  /** Nurses eligible to be a primary (OAS) nurse. */
  const oasNurses = computed(() => directory.value.nurses.filter((n) => n.isOas))

  /** Patients that have NO designated OAS — the most urgent admin signal. */
  const unassigned = computed(() => directory.value.assignments.filter((a) => !a.primaryNurseId))

  /** Lookup: patientId → its assignment. */
  const assignmentByPatient = computed(() => {
    const map = new Map<string, PatientAssignment>()
    for (const a of directory.value.assignments) map.set(a.patientId, a)
    return map
  })

  /** Lookup: nurseId → nurse. */
  const nurseById = computed(() => {
    const map = new Map<string, Nurse>()
    for (const n of directory.value.nurses) map.set(n.id, n)
    return map
  })

  function getAssigneeFor(patientId: string): Nurse | null {
    const assignment = assignmentByPatient.value.get(patientId)
    if (!assignment || !assignment.primaryNurseId) return null
    return nurseById.value.get(assignment.primaryNurseId) ?? null
  }

  /**
   * Assign (or reassign) the OAS for a patient. This is the "ta ansvar" action —
   * one call, immediate effect, persisted.
   */
  function assignNurse(patientId: string, nurseId: string): void {
    const idx = directory.value.assignments.findIndex((a) => a.patientId === patientId)
    if (idx === -1) return
    const next = [...directory.value.assignments]
    next[idx] = {
      ...next[idx],
      primaryNurseId: nurseId,
      lastAssignedAt: new Date().toISOString(),
    }
    directory.value = { ...directory.value, assignments: next }
  }

  /** Remove the OAS assignment for a patient (back to "unassigned"). */
  function unassign(patientId: string): void {
    const idx = directory.value.assignments.findIndex((a) => a.patientId === patientId)
    if (idx === -1) return
    const next = [...directory.value.assignments]
    next[idx] = {
      ...next[idx],
      primaryNurseId: null,
      lastAssignedAt: new Date().toISOString(),
    }
    directory.value = { ...directory.value, assignments: next }
  }

  /** Add a new patient (admin creates a row, then assigns an OAS). */
  function addPatient(patientId: string, patientName: string, teamId: string): void {
    if (directory.value.assignments.some((a) => a.patientId === patientId)) return
    const assignment: PatientAssignment = {
      patientId,
      patientName,
      primaryNurseId: null,
      teamId,
      fallbackQueue: 'support',
      lastAssignedAt: null,
    }
    directory.value = {
      ...directory.value,
      assignments: [...directory.value.assignments, assignment],
    }
  }

  /** Reset to the seeded directory (demo convenience). */
  function resetToSeed(): void {
    directory.value = seedDirectory()
  }

  return {
    directory,
    oasNurses,
    unassigned,
    assignmentByPatient,
    nurseById,
    getAssigneeFor,
    assignNurse,
    unassign,
    addPatient,
    resetToSeed,
  }
}

export type UsePatientAssignmentsReturn = ReturnType<typeof usePatientAssignments>
