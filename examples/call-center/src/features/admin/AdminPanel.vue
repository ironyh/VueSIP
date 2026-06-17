<template>
  <section class="admin-panel" aria-label="Admin and setup">
    <header class="admin-header">
      <div>
        <p class="eyebrow">Admin &amp; setup</p>
        <h1>Ansvar per roll</h1>
        <p class="admin-copy">
          Tillsätt en ansvarig person per yrkesroll (sjuksköterska, sjukgymnast, undersköterska,
          läkare…) för varje patient. Matrisen nedan är enda källan till sanning — ändringar slår
          igenom direkt i agent-arbetsytan.
        </p>
      </div>
    </header>

    <div class="admin-stats">
      <article class="stat-card">
        <span class="stat-value">{{ directory.assignments.length }}</span>
        <span class="stat-label">Patienter</span>
      </article>
      <article class="stat-card" :class="{ 'stat-warn': unassigned.length > 0 }">
        <span class="stat-value">{{ unassigned.length }}</span>
        <span class="stat-label">Saknar täckning</span>
      </article>
      <article class="stat-card">
        <span class="stat-value">{{ directory.roles.length }}</span>
        <span class="stat-label">Roller</span>
      </article>
      <article class="stat-card">
        <span class="stat-value">{{ directory.teams.length }}</span>
        <span class="stat-label">Team</span>
      </article>
    </div>

    <AssignmentMatrix />

    <section class="role-manager" aria-label="Manage roles">
      <h2>Hantera roller</h2>
      <p class="role-manager-copy">
        Grundrollerna är förvalda. Lägg till en egen roll om ni har en yrkesgrupp som saknas.
      </p>
      <form class="role-add" @submit.prevent="handleAddRole">
        <input
          v-model="newRoleLabel"
          type="text"
          class="role-add-input"
          placeholder="t.ex. BRT-team, Logoped"
          aria-label="Ny roll-etikett"
        />
        <button type="submit" class="btn btn-primary btn-sm" :disabled="!newRoleLabel.trim()">
          Lägg till roll
        </button>
      </form>
      <ul class="role-list">
        <li v-for="role in directory.roles" :key="role.id">
          <span class="role-pill" :class="{ 'role-default': role.isDefault }">
            {{ role.label }}
          </span>
          <span class="role-tag">{{ role.isDefault ? 'grundroll' : 'egen' }}</span>
          <span class="role-count">{{ peopleForRole(role.id).length }} personer</span>
        </li>
      </ul>
    </section>

    <section class="team-overview" aria-label="Team overview">
      <h2>Team</h2>
      <div class="team-grid">
        <article v-for="team in directory.teams" :key="team.id" class="team-card">
          <header class="team-card-header">
            <h3>{{ team.name }}</h3>
            <span class="team-count">{{ teamNurses(team.id).length }} personer</span>
          </header>
          <ul class="nurse-list">
            <li v-for="nurse in teamNurses(team.id)" :key="nurse.id">
              <span class="nurse-dot"></span>
              <span class="nurse-list-name">{{ nurse.name }}</span>
              <span class="nurse-list-ext">ext {{ nurse.extension }}</span>
              <span
                v-for="rid in nurse.roleIds"
                :key="rid"
                class="nurse-badge"
                :title="roleById.get(rid)?.label ?? rid"
              >
                {{ roleById.get(rid)?.label ?? rid }}
              </span>
            </li>
          </ul>
          <p class="team-patients">{{ patientsOnTeam(team.id).length }} patient(er) på teamet</p>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AssignmentMatrix from './AssignmentMatrix.vue'
import { usePatientAssignments } from './usePatientAssignments'

const { directory, unassigned, allRoles, roleById, peopleForRole, addRole } =
  usePatientAssignments()

const newRoleLabel = ref('')

function handleAddRole() {
  const label = newRoleLabel.value.trim()
  if (!label) return
  addRole(label)
  newRoleLabel.value = ''
}

function teamNurses(teamId: string) {
  return directory.value.nurses.filter((n) => n.teamId === teamId)
}

function patientsOnTeam(teamId: string) {
  return directory.value.assignments.filter((a) => a.teamId === teamId)
}

void allRoles
</script>

<style scoped>
.admin-panel {
  padding: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
}

.admin-header {
  margin-bottom: 1.5rem;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #64748b);
  margin: 0 0 0.25rem;
}

.admin-header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  color: var(--text-primary, #0f172a);
}

.admin-copy {
  margin: 0;
  color: var(--text-secondary, #64748b);
  font-size: 0.9375rem;
  max-width: 65ch;
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--surface-border, #e2e8f0);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.stat-warn {
  border-color: #fcd34d;
  background: #fffbeb;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
  line-height: 1;
}

.stat-label {
  font-size: 0.8125rem;
  color: var(--text-secondary, #64748b);
}

.team-overview {
  margin-top: 2rem;
}

.team-overview h2 {
  font-size: 1.125rem;
  color: var(--text-primary, #0f172a);
  margin: 0 0 1rem;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.team-card {
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--surface-border, #e2e8f0);
  border-radius: 10px;
  padding: 1.25rem;
}

.team-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}

.team-card-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text-primary, #0f172a);
}

.team-count {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.nurse-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.nurse-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary, #0f172a);
}

.nurse-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
}

.nurse-list-name {
  flex: 1;
}

.nurse-list-ext {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.nurse-badge {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.0625rem 0.3125rem;
  border-radius: 4px;
  white-space: nowrap;
}

.role-manager {
  margin-top: 2rem;
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--surface-border, #e2e8f0);
  border-radius: 10px;
  padding: 1.25rem;
}

.role-manager h2 {
  margin: 0 0 0.375rem;
  font-size: 1.125rem;
  color: var(--text-primary, #0f172a);
}

.role-manager-copy {
  margin: 0 0 0.875rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #64748b);
}

.role-add {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.875rem;
  flex-wrap: wrap;
}

.role-add-input {
  flex: 1;
  min-width: 12rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--surface-border, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-primary, #0f172a);
}

.role-add-input:focus-visible {
  outline: 2px solid var(--primary-color, #6366f1);
  outline-offset: 1px;
}

.btn-primary {
  background: var(--primary-color, #6366f1);
  color: #ffffff;
  border: none;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.role-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.role-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.role-pill {
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.role-pill.role-default {
  color: var(--text-secondary, #475569);
}

.role-tag {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--surface-hover, #f1f5f9);
  color: var(--text-secondary, #64748b);
  padding: 0.0625rem 0.3125rem;
  border-radius: 4px;
}

.role-count {
  margin-left: auto;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
}

.team-patients {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}
</style>
