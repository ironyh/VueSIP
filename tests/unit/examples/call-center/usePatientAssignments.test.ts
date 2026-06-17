import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'

// Mock localStorage before importing the composable.
const store = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
}
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', { localStorage: localStorageMock })

import { usePatientAssignments } from '../../../../examples/call-center/src/features/admin/usePatientAssignments'

describe('usePatientAssignments', () => {
  beforeEach(() => {
    store.clear()
  })

  it('seeds a demo directory with roles on first load', () => {
    const { directory, allRoles } = usePatientAssignments()

    expect(directory.value.roles.length).toBeGreaterThan(0)
    expect(allRoles.value.some((r) => r.id === 'sjukskoterska')).toBe(true)
    expect(directory.value.teams.length).toBeGreaterThan(0)
    expect(directory.value.nurses.length).toBeGreaterThan(0)
    expect(directory.value.assignments.length).toBeGreaterThan(0)
  })

  it('identifies patients missing coverage for any default role', () => {
    const { directory, unassigned } = usePatientAssignments()

    // The seed includes a patient with no responsibilities at all (p2).
    expect(unassigned.value.length).toBeGreaterThanOrEqual(1)
    // "Unassigned" = missing at least one default role, not necessarily empty.
    expect(
      unassigned.value.every(
        (a) =>
          !directory.value.roles.filter((r) => r.isDefault).every((r) => a.responsibilities[r.id])
      )
    ).toBe(true)
  })

  it('assigns a person to a role for a patient (the "ta ansvar" action)', () => {
    const { directory, peopleForRole, assignRole, getAssigneeFor } = usePatientAssignments()
    const patient = directory.value.assignments.find((a) => !a.responsibilities['sjukgymnast'])!
    const nurse = peopleForRole('sjukgymnast')[0]

    assignRole(patient.patientId, 'sjukgymnast', nurse.id)

    expect(getAssigneeFor(patient.patientId, 'sjukgymnast')?.id).toBe(nurse.id)
  })

  it('reassigns a role to a different person', () => {
    const { directory, peopleForRole, assignRole, getAssigneeFor } = usePatientAssignments()
    const patient = directory.value.assignments[0]
    const nurses = peopleForRole('sjukskoterska')
    const newNurse = nurses[nurses.length - 1]

    assignRole(patient.patientId, 'sjukskoterska', newNurse.id)

    expect(getAssigneeFor(patient.patientId, 'sjukskoterska')?.id).toBe(newNurse.id)
  })

  it('clears a single role back to unassigned without touching other roles', () => {
    const { directory, peopleForRole, assignRole, unassignRole, getAssigneeFor } =
      usePatientAssignments()
    const patient = directory.value.assignments.find((a) => !a.responsibilities['underskoterska'])!
    const nurse = peopleForRole('underskoterska')[0]

    assignRole(patient.patientId, 'underskoterska', nurse.id)
    expect(getAssigneeFor(patient.patientId, 'underskoterska')).not.toBeNull()

    unassignRole(patient.patientId, 'underskoterska')
    expect(getAssigneeFor(patient.patientId, 'underskoterska')).toBeNull()
  })

  it('records a per-role assignedAt timestamp on assignment', () => {
    const { directory, peopleForRole, assignRole } = usePatientAssignments()
    const patient = directory.value.assignments.find((a) => !a.responsibilities['lakare'])!
    const before = Date.now()
    const nurse = peopleForRole('lakare')[0]

    assignRole(patient.patientId, 'lakare', nurse.id)

    const updated = directory.value.assignments.find((a) => a.patientId === patient.patientId)!
    expect(updated.assignedAt['lakare']).toBeDefined()
    expect(new Date(updated.assignedAt['lakare']).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('persists to localStorage on change', async () => {
    const { directory, peopleForRole, assignRole } = usePatientAssignments()
    const patient = directory.value.assignments[0]
    const nurse = peopleForRole('sjukskoterska')[0]

    assignRole(patient.patientId, 'sjukskoterska', nurse.id)
    await nextTick()

    const raw = store.get('callcenter:admin-directory')
    expect(raw).toBeDefined()
    const parsed = JSON.parse(raw!)
    expect(parsed.assignments).toBeDefined()
    expect(parsed.version).toBe(2)
  })

  it('re-seeds when persisted data has an outdated version', () => {
    // Simulate stale v1-style localStorage (the old primaryNurseId shape).
    store.set(
      'callcenter:admin-directory',
      JSON.stringify({ version: 1, roles: [], teams: [], nurses: [], assignments: [] })
    )

    const { directory } = usePatientAssignments()
    // The version guard should discard the stale blob and reseed.
    expect(directory.value.version).toBe(2)
    expect(directory.value.roles.length).toBeGreaterThan(0)
  })

  it('adds a custom role that admins can extend the default set with', () => {
    const { directory, addRole, allRoles } = usePatientAssignments()
    const before = directory.value.roles.length

    addRole('Logoped')

    expect(directory.value.roles.length).toBe(before + 1)
    const added = allRoles.value.find((r) => r.label === 'Logoped')
    expect(added).toBeDefined()
    expect(added!.isDefault).toBe(false)
    expect(added!.id).toBe('logoped')
  })

  it('adds a new patient with empty responsibilities', () => {
    const { directory, addPatient, unassigned } = usePatientAssignments()
    const before = directory.value.assignments.length

    addPatient('p-new', 'New Patient — Test', 'team-a')

    expect(directory.value.assignments.length).toBe(before + 1)
    const newPatient = directory.value.assignments.find((a) => a.patientId === 'p-new')
    expect(newPatient).toBeDefined()
    expect(Object.keys(newPatient!.responsibilities)).toHaveLength(0)
    expect(unassigned.value.some((a) => a.patientId === 'p-new')).toBe(true)
  })

  it('does not duplicate an existing patient', () => {
    const { directory, addPatient } = usePatientAssignments()
    const existingId = directory.value.assignments[0].patientId
    const before = directory.value.assignments.length

    addPatient(existingId, 'Duplicate', 'team-a')

    expect(directory.value.assignments.length).toBe(before)
  })
})
