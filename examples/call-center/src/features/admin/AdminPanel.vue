<template>
  <section class="admin-panel" aria-label="Admin and setup">
    <header class="admin-header">
      <div>
        <p class="eyebrow">Admin &amp; setup</p>
        <h1>Patient responsibility</h1>
        <p class="admin-copy">
          Set up which nurse is the omvårdnadsansvarig sjuksköterska (OAS) for each patient. The
          matrix below is the single source of truth — assignments take effect immediately across
          the agent workspace.
        </p>
      </div>
    </header>

    <div class="admin-stats">
      <article class="stat-card">
        <span class="stat-value">{{ directory.assignments.length }}</span>
        <span class="stat-label">Patients</span>
      </article>
      <article class="stat-card" :class="{ 'stat-warn': unassigned.length > 0 }">
        <span class="stat-value">{{ unassigned.length }}</span>
        <span class="stat-label">Without OAS</span>
      </article>
      <article class="stat-card">
        <span class="stat-value">{{ oasNurses.length }}</span>
        <span class="stat-label">Eligible OAS nurses</span>
      </article>
      <article class="stat-card">
        <span class="stat-value">{{ directory.teams.length }}</span>
        <span class="stat-label">Teams</span>
      </article>
    </div>

    <AssignmentMatrix />

    <section class="team-overview" aria-label="Team overview">
      <h2>Teams</h2>
      <div class="team-grid">
        <article v-for="team in directory.teams" :key="team.id" class="team-card">
          <header class="team-card-header">
            <h3>{{ team.name }}</h3>
            <span class="team-count">{{ teamNurses(team.id).length }} nurses</span>
          </header>
          <ul class="nurse-list">
            <li v-for="nurse in teamNurses(team.id)" :key="nurse.id">
              <span class="nurse-dot" :class="{ 'nurse-oas': nurse.isOas }"></span>
              <span class="nurse-list-name">{{ nurse.name }}</span>
              <span class="nurse-list-ext">ext {{ nurse.extension }}</span>
              <span v-if="nurse.isOas" class="nurse-badge">OAS</span>
            </li>
          </ul>
          <p class="team-patients">{{ patientsOnTeam(team.id).length }} patient(s) on this team</p>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AssignmentMatrix from './AssignmentMatrix.vue'
import { usePatientAssignments } from './usePatientAssignments'

const { directory, oasNurses, unassigned } = usePatientAssignments()

function teamNurses(teamId: string) {
  return directory.value.nurses.filter((n) => n.teamId === teamId)
}

function patientsOnTeam(teamId: string) {
  return directory.value.assignments.filter((a) => a.teamId === teamId)
}

void computed
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
  background: #cbd5e1;
  flex-shrink: 0;
}

.nurse-dot.nurse-oas {
  background: #16a34a;
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
  background: #dcfce7;
  color: #166534;
  padding: 0.0625rem 0.3125rem;
  border-radius: 4px;
}

.team-patients {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}
</style>
