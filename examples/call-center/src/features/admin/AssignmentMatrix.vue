<template>
  <section class="assignment-matrix" aria-label="Patient-to-role responsibility matrix">
    <header class="matrix-header">
      <div>
        <p class="eyebrow">Responsibility matrix</p>
        <h2>Vem är ansvarig för varje roll per patient?</h2>
        <p class="matrix-copy">
          Klicka en cell för att välja ansvarig person för den rollen. Grön = tillsatt, röd ram =
          rollen saknas, gul = nyligen omtilldelad.
        </p>
      </div>
      <div class="matrix-legend">
        <span class="legend-item"><span class="dot dot-assigned"></span> Tillsatt</span>
        <span class="legend-item"><span class="dot dot-recent"></span> Nyligen ändrad</span>
        <span class="legend-item"><span class="dot dot-missing"></span> Saknas</span>
      </div>
    </header>

    <div class="role-filter" role="group" aria-label="Filter by role">
      <span class="filter-label">Visa:</span>
      <button
        type="button"
        class="filter-chip"
        :class="{ active: activeRoleFilter === null }"
        @click="activeRoleFilter = null"
      >
        Alla roller
      </button>
      <button
        v-for="role in directory.roles"
        :key="role.id"
        type="button"
        class="filter-chip"
        :class="{ active: activeRoleFilter === role.id }"
        @click="activeRoleFilter = role.id"
      >
        {{ role.label }}
      </button>
    </div>

    <div v-if="unassigned.length > 0" class="alert-banner" role="status">
      <strong>{{ unassigned.length }}</strong> patient(er) saknar ansvarig för någon roll — klicka
      en cell för att tillsätta.
    </div>

    <div class="matrix-scroll">
      <table class="matrix-table">
        <thead>
          <tr>
            <th scope="col" class="col-patient">Patient</th>
            <th scope="col" class="col-team">Team</th>
            <th v-for="role in visibleRoles" :key="role.id" scope="col" class="col-role">
              <span class="role-col-label">{{ role.label }}</span>
              <span v-if="role.inboundQueue" class="role-col-queue"
                >📞 {{ role.inboundQueue }}</span
              >
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="assignment in directory.assignments"
            :key="assignment.patientId"
            :class="{ 'row-missing': isMissingAnyRole(assignment) }"
          >
            <th scope="row" class="cell-patient">
              <span class="patient-name">{{ assignment.patientName }}</span>
              <span class="patient-id">{{ assignment.patientId }}</span>
            </th>
            <td class="cell-team">{{ teamName(assignment.teamId) }}</td>
            <td v-for="role in visibleRoles" :key="role.id" class="cell-assign">
              <div class="cell-inner">
                <button
                  type="button"
                  class="assign-cell"
                  :class="cellClass(assignment, role.id)"
                  :aria-label="`Välj ansvarig ${role.label} för ${assignment.patientName}`"
                  @click="togglePicker(assignment.patientId, role.id)"
                >
                  <template v-if="assigneeName(assignment, role.id)">
                    {{ assigneeName(assignment, role.id) }}
                  </template>
                  <span v-else class="cell-empty">—</span>
                </button>
                <button
                  v-if="assignment.responsibilities[role.id]"
                  type="button"
                  class="clear-btn"
                  :aria-label="`Ta bort ansvarig ${role.label} för ${assignment.patientName}`"
                  @click="unassignRole(assignment.patientId, role.id)"
                >
                  ×
                </button>
                <div
                  v-if="openPicker === `${assignment.patientId}:${role.id}`"
                  class="picker"
                  role="listbox"
                  :aria-label="`Välj person för ${role.label}`"
                >
                  <button
                    v-for="person in peopleForRole(role.id)"
                    :key="person.id"
                    type="button"
                    class="picker-option"
                    :class="{ selected: assignment.responsibilities[role.id] === person.id }"
                    role="option"
                    :aria-selected="assignment.responsibilities[role.id] === person.id"
                    @click="choose(assignment.patientId, role.id, person.id)"
                  >
                    <span class="picker-name">{{ person.name }}</span>
                    <span class="picker-ext">ext {{ person.extension }}</span>
                  </button>
                  <p v-if="peopleForRole(role.id).length === 0" class="picker-empty">
                    Ingen person har rollen "{{ role.label }}".
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="matrix-footer">
      <span class="footer-count">
        {{ fullyCovered.length }} / {{ directory.assignments.length }} patienter har full täckning
      </span>
      <button type="button" class="btn btn-ghost btn-sm" @click="resetToSeed">
        Återställ demo-data
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePatientAssignments } from './usePatientAssignments'
import type { PatientAssignment } from './admin-types'

const {
  directory,
  unassigned,
  fullyCovered,
  defaultRoles,
  peopleForRole,
  personById,
  assignRole,
  unassignRole,
  resetToSeed,
} = usePatientAssignments()

/** null = show all roles; otherwise filter to one role (single-column compact view). */
const activeRoleFilter = ref<string | null>(null)
const visibleRoles = computed(() =>
  activeRoleFilter.value
    ? directory.value.roles.filter((r) => r.id === activeRoleFilter.value)
    : directory.value.roles
)

/** Open picker key: `${patientId}:${roleId}` or null. */
const openPicker = ref<string | null>(null)

function togglePicker(patientId: string, roleId: string) {
  const key = `${patientId}:${roleId}`
  openPicker.value = openPicker.value === key ? null : key
}

function choose(patientId: string, roleId: string, personId: string) {
  assignRole(patientId, roleId, personId)
  openPicker.value = null
}

function teamName(teamId: string): string {
  return directory.value.teams.find((t) => t.id === teamId)?.name ?? teamId
}

function assigneeName(assignment: PatientAssignment, roleId: string): string | null {
  const personId = assignment.responsibilities[roleId]
  if (!personId) return null
  return personById.value.get(personId)?.name ?? null
}

function isMissingAnyRole(assignment: PatientAssignment): boolean {
  return defaultRoles.value.some((r) => !assignment.responsibilities[r.id])
}

function cellClass(assignment: PatientAssignment, roleId: string): string {
  if (!assignment.responsibilities[roleId]) return 'is-empty'
  const ts = assignment.assignedAt[roleId]
  if (ts) {
    const ageMs = Date.now() - new Date(ts).getTime()
    if (ageMs < 10 * 60 * 1000) return 'is-assigned is-recent'
  }
  return 'is-assigned'
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

.col-role {
  min-width: 9rem;
  text-align: center !important;
}

.role-col-label {
  display: block;
  font-weight: 600;
}

.role-col-queue {
  display: block;
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--text-secondary, #94a3b8);
  margin-top: 0.125rem;
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

.cell-inner {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.assign-cell {
  min-width: 6rem;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  border: 1px solid var(--surface-border, #e2e8f0);
  background: transparent;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
  text-align: center;
}

.assign-cell:hover {
  border-color: var(--primary-color, #6366f1);
}

.assign-cell.is-empty {
  border-style: dashed;
  border-color: #cbd5e1;
  color: var(--text-secondary, #94a3b8);
}

.assign-cell.is-assigned {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.assign-cell.is-assigned.is-recent {
  background: #fed7aa;
  border-color: #fdba74;
  color: #9a3412;
}

.assign-cell:focus-visible {
  outline: 2px solid var(--primary-color, #6366f1);
  outline-offset: 2px;
}

.cell-empty {
  color: var(--text-secondary, #cbd5e1);
}

.clear-btn {
  border: none;
  background: transparent;
  color: #dc2626;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
}

.clear-btn:hover {
  background: #fee2e2;
}

.picker {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--surface-border, #e2e8f0);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  min-width: 12rem;
  padding: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.picker-option {
  border: none;
  background: transparent;
  text-align: left;
  padding: 0.375rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-primary, #0f172a);
}

.picker-option:hover {
  background: var(--surface-hover, #f1f5f9);
}

.picker-option.selected {
  background: #dcfce7;
  color: #166534;
}

.picker-name {
  font-weight: 600;
}

.picker-ext {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.picker-empty {
  margin: 0;
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.role-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 0.8125rem;
  color: var(--text-secondary, #64748b);
  font-weight: 600;
}

.filter-chip {
  border: 1px solid var(--surface-border, #e2e8f0);
  background: transparent;
  color: var(--text-secondary, #64748b);
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.filter-chip:hover {
  border-color: var(--primary-color, #6366f1);
}

.filter-chip.active {
  background: var(--primary-color, #6366f1);
  color: #ffffff;
  border-color: var(--primary-color, #6366f1);
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
