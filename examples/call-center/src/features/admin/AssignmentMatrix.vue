<template>
  <section class="assignment-matrix" aria-label="Patient-to-OAS assignment matrix">
    <header class="matrix-header">
      <div>
        <p class="eyebrow">Responsibility matrix</p>
        <h2>Who is the OAS for each patient?</h2>
        <p class="matrix-copy">
          Click a cell to assign (or reassign) the omvårdnadsansvarig sjuksköterska for a patient.
          Green = assigned, red outline = no OAS yet, yellow = reassigned recently.
        </p>
      </div>
      <div class="matrix-legend">
        <span class="legend-item"><span class="dot dot-assigned"></span> Assigned</span>
        <span class="legend-item"><span class="dot dot-recent"></span> Reassigned recently</span>
        <span class="legend-item"><span class="dot dot-missing"></span> No OAS</span>
      </div>
    </header>

    <div v-if="unassigned.length > 0" class="alert-banner" role="status">
      <strong>{{ unassigned.length }}</strong> patient(s) have no designated OAS — click a cell to
      assign.
    </div>

    <div class="matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr>
            <th scope="col" class="col-patient">Patient</th>
            <th scope="col" class="col-team">Team</th>
            <th
              v-for="nurse in oasNurses"
              :key="nurse.id"
              scope="col"
              class="col-nurse"
              :title="`${nurse.name} (ext ${nurse.extension})`"
            >
              <span class="nurse-name">{{ nurse.name }}</span>
              <span class="nurse-ext">ext {{ nurse.extension }}</span>
            </th>
            <th scope="col" class="col-action">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="assignment in directory.assignments"
            :key="assignment.patientId"
            :class="{ 'row-missing': !assignment.primaryNurseId }"
          >
            <th scope="row" class="cell-patient">
              <span class="patient-name">{{ assignment.patientName }}</span>
              <span class="patient-id">{{ assignment.patientId }}</span>
            </th>
            <td class="cell-team">{{ teamName(assignment.teamId) }}</td>
            <td v-for="nurse in oasNurses" :key="nurse.id" class="cell-assign">
              <button
                type="button"
                class="assign-cell"
                :class="cellClass(assignment, nurse.id)"
                :aria-label="`Assign ${nurse.name} as OAS for ${assignment.patientName}`"
                :aria-pressed="assignment.primaryNurseId === nurse.id"
                @click="assignNurse(assignment.patientId, nurse.id)"
              >
                <span v-if="assignment.primaryNurseId === nurse.id" aria-hidden="true">✓</span>
              </button>
            </td>
            <td class="cell-action">
              <button
                v-if="assignment.primaryNurseId"
                type="button"
                class="btn btn-ghost btn-sm"
                @click="unassign(assignment.patientId)"
              >
                Clear
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="matrix-footer">
      <span class="footer-count">
        {{ directory.assignments.length - unassigned.length }} / {{ directory.assignments.length }}
        patients have an OAS
      </span>
      <button type="button" class="btn btn-ghost btn-sm" @click="resetToSeed">
        Reset to demo seed
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { usePatientAssignments } from './usePatientAssignments'
import type { PatientAssignment } from './admin-types'

const { directory, oasNurses, unassigned, assignNurse, unassign, resetToSeed } =
  usePatientAssignments()

function teamName(teamId: string): string {
  return directory.value.teams.find((t) => t.id === teamId)?.name ?? teamId
}

function cellClass(assignment: PatientAssignment, nurseId: string): string {
  if (assignment.primaryNurseId === nurseId) {
    // Recently reassigned (within last 10 minutes)?
    if (assignment.lastAssignedAt) {
      const ageMs = Date.now() - new Date(assignment.lastAssignedAt).getTime()
      if (ageMs < 10 * 60 * 1000) return 'is-assigned is-recent'
    }
    return 'is-assigned'
  }
  return 'is-empty'
}
</script>

<style scoped>
.assignment-matrix {
  background: var(--surface-card, #ffffff);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--surface-border, #e2e8f0);
}

.matrix-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #64748b);
  margin: 0 0 0.25rem;
}

.matrix-header h2 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  color: var(--text-primary, #0f172a);
}

.matrix-copy {
  margin: 0;
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
  max-width: 60ch;
}

.matrix-legend {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #64748b);
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  display: inline-block;
}
.dot-assigned {
  background: #16a34a;
}
.dot-recent {
  background: #d97706;
}
.dot-missing {
  background: transparent;
  border: 2px solid #dc2626;
}

.alert-banner {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.matrix-scroll {
  overflow-x: auto;
}

.matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.875rem;
}

.matrix-table thead th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  border-bottom: 2px solid var(--surface-border, #e2e8f0);
  color: var(--text-secondary, #64748b);
  font-weight: 600;
  white-space: nowrap;
}

.col-nurse {
  min-width: 7rem;
  text-align: center !important;
}

.nurse-name {
  display: block;
  color: var(--text-primary, #0f172a);
}

.nurse-ext {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
  font-weight: 400;
}

.matrix-table tbody th,
.matrix-table tbody td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--surface-border, #e2e8f0);
  vertical-align: middle;
}

.row-missing {
  background: #fffbeb;
}

.cell-patient {
  text-align: left;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.patient-name {
  display: block;
}

.patient-id {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-secondary, #94a3b8);
}

.cell-team {
  color: var(--text-secondary, #64748b);
  white-space: nowrap;
}

.cell-assign {
  text-align: center;
}

.assign-cell {
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  border: 1px solid var(--surface-border, #e2e8f0);
  background: transparent;
  cursor: pointer;
  font-weight: 700;
  color: #ffffff;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.assign-cell:hover {
  border-color: var(--primary-color, #6366f1);
  transform: scale(1.05);
}

.assign-cell.is-empty {
  background: transparent;
  border-style: dashed;
  border-color: #cbd5e1;
}

.assign-cell.is-assigned {
  background: #16a34a;
  border-color: #16a34a;
}

.assign-cell.is-assigned.is-recent {
  background: #d97706;
  border-color: #d97706;
}

.assign-cell:focus-visible {
  outline: 2px solid var(--primary-color, #6366f1);
  outline-offset: 2px;
}

.matrix-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #64748b);
}

.btn {
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  transition: background-color 0.15s ease;
}

.btn-sm {
  padding: 0.3125rem 0.625rem;
  font-size: 0.8125rem;
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary, #64748b);
  border: 1px solid var(--surface-border, #e2e8f0);
}

.btn-ghost:hover {
  background: var(--surface-hover, #f1f5f9);
}
</style>
