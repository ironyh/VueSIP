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

  it('seeds a demo directory on first load', () => {
    const { directory, oasNurses } = usePatientAssignments()

    expect(directory.value.teams.length).toBeGreaterThan(0)
    expect(directory.value.nurses.length).toBeGreaterThan(0)
    expect(directory.value.assignments.length).toBeGreaterThan(0)
    expect(oasNurses.value.length).toBeGreaterThan(0)
  })

  it('identifies patients with no designated OAS', () => {
    const { unassigned } = usePatientAssignments()

    // The seed includes at least one patient with primaryNurseId: null.
    expect(unassigned.value.length).toBeGreaterThanOrEqual(1)
    expect(unassigned.value.every((a) => a.primaryNurseId === null)).toBe(true)
  })

  it('assigns a nurse to a patient (the "ta ansvar" action)', () => {
    const { directory, oasNurses, assignNurse, getAssigneeFor } = usePatientAssignments()
    const unassignedPatient = directory.value.assignments.find((a) => !a.primaryNurseId)!
    const nurse = oasNurses.value[0]

    assignNurse(unassignedPatient.patientId, nurse.id)

    const assignee = getAssigneeFor(unassignedPatient.patientId)
    expect(assignee?.id).toBe(nurse.id)
  })

  it('reassigns a patient to a different nurse', () => {
    const { directory, oasNurses, assignNurse, getAssigneeFor } = usePatientAssignments()
    const patient = directory.value.assignments[0]
    const newNurse = oasNurses.value[1]

    assignNurse(patient.patientId, newNurse.id)

    expect(getAssigneeFor(patient.patientId)?.id).toBe(newNurse.id)
  })

  it('clears an assignment back to unassigned', () => {
    const { directory, assignNurse, unassign, getAssigneeFor } = usePatientAssignments()
    const patient = directory.value.assignments.find((a) => !a.primaryNurseId)!

    assignNurse(patient.patientId, directory.value.nurses[0].id)
    expect(getAssigneeFor(patient.patientId)).not.toBeNull()

    unassign(patient.patientId)
    expect(getAssigneeFor(patient.patientId)).toBeNull()
  })

  it('records the lastAssignedAt timestamp on assignment', () => {
    const { directory, oasNurses, assignNurse } = usePatientAssignments()
    const patient = directory.value.assignments.find((a) => !a.primaryNurseId)!
    const before = Date.now()

    assignNurse(patient.patientId, oasNurses.value[0].id)

    const updated = directory.value.assignments.find((a) => a.patientId === patient.patientId)!
    expect(updated.lastAssignedAt).not.toBeNull()
    expect(new Date(updated.lastAssignedAt!).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('persists to localStorage on change', async () => {
    const { directory, oasNurses, assignNurse } = usePatientAssignments()
    const patient = directory.value.assignments[0]

    assignNurse(patient.patientId, oasNurses.value[0].id)
    await nextTick()

    const raw = store.get('callcenter:admin-directory')
    expect(raw).toBeDefined()
    const parsed = JSON.parse(raw!)
    expect(parsed.assignments).toBeDefined()
  })

  it('adds a new patient', () => {
    const { directory, addPatient, unassigned } = usePatientAssignments()
    const before = directory.value.assignments.length

    addPatient('p-new', 'New Patient — Test', 'team-a')

    expect(directory.value.assignments.length).toBe(before + 1)
    const newPatient = directory.value.assignments.find((a) => a.patientId === 'p-new')
    expect(newPatient).toBeDefined()
    expect(newPatient!.primaryNurseId).toBeNull()
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
