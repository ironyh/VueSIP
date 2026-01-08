<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import type { QueueStats, QueueCaller } from '../composables/useQueues'

const props = defineProps<{
  queues: Map<string, QueueStats>
  callers: readonly QueueCaller[]
  totalCalls: number
  availableAgents: number
  longestWait: number
  averageServiceLevel: number
}>()

const queueList = computed(() => Array.from(props.queues.values()))

function getAvailableAgentCount(agents: QueueStats['agents']): number {
  return agents.filter((a) => a.status === 'available').length
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getServiceLevelSeverity(level: number): string {
  if (level >= 80) return 'success'
  if (level >= 60) return 'warning'
  return 'danger'
}

function getWaitSeverity(wait: number): string {
  if (wait < 30) return 'success'
  if (wait < 60) return 'warning'
  return 'danger'
}
</script>

<template>
  <div class="queue-stats">
    <div class="stats-header">
      <h3>Queue Statistics</h3>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-icon calls">
          <i class="pi pi-phone" />
        </div>
        <div class="card-content">
          <span class="card-value">{{ totalCalls }}</span>
          <span class="card-label">Calls Waiting</span>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon agents">
          <i class="pi pi-users" />
        </div>
        <div class="card-content">
          <span class="card-value">{{ availableAgents }}</span>
          <span class="card-label">Available Agents</span>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon wait">
          <i class="pi pi-clock" />
        </div>
        <div class="card-content">
          <span class="card-value">{{ formatDuration(longestWait) }}</span>
          <span class="card-label">Longest Wait</span>
        </div>
      </div>

      <div class="summary-card">
        <div class="card-icon service">
          <i class="pi pi-chart-line" />
        </div>
        <div class="card-content">
          <span class="card-value">{{ averageServiceLevel }}%</span>
          <span class="card-label">Service Level</span>
        </div>
      </div>
    </div>

    <!-- Queue Table -->
    <div class="queue-table">
      <h4>Queues</h4>
      <DataTable :value="queueList" size="small" striped-rows>
        <Column field="name" header="Queue" />
        <Column field="calls" header="Calls" />
        <Column header="Agents">
          <template #body="slotProps">
            {{ getAvailableAgentCount(slotProps.data.agents) }}
            / {{ slotProps.data.agents.length }}
          </template>
        </Column>
        <Column header="Service Level">
          <template #body="slotProps">
            <ProgressBar
              :value="slotProps.data.servicelevel"
              :show-value="true"
              style="height: 20px"
              :class="getServiceLevelSeverity(slotProps.data.servicelevel)"
            />
          </template>
        </Column>
        <Column field="holdtime" header="Avg Wait">
          <template #body="slotProps">
            {{ formatDuration(slotProps.data.holdtime) }}
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Waiting Callers -->
    <div v-if="callers.length > 0" class="callers-list">
      <h4>Waiting Callers</h4>
      <DataTable :value="[...callers]" size="small" striped-rows>
        <Column field="position" header="#" style="width: 50px" />
        <Column field="callerIdNum" header="Caller ID" />
        <Column field="callerIdName" header="Name" />
        <Column field="queue" header="Queue" />
        <Column header="Wait Time">
          <template #body="slotProps">
            <Tag
              :value="formatDuration(slotProps.data.wait)"
              :severity="getWaitSeverity(slotProps.data.wait)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.queue-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-header h3 {
  margin: 0;
  font-size: 1.125rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--surface-card);
  border-radius: 8px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon i {
  font-size: 1.5rem;
  color: white;
}

.card-icon.calls {
  background: var(--blue-500);
}

.card-icon.agents {
  background: var(--green-500);
}

.card-icon.wait {
  background: var(--orange-500);
}

.card-icon.service {
  background: var(--purple-500);
}

.card-content {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.card-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.queue-table h4,
.callers-list h4 {
  margin: 0 0 12px;
  font-size: 1rem;
}

:deep(.success .p-progressbar-value) {
  background: var(--green-500);
}

:deep(.warning .p-progressbar-value) {
  background: var(--orange-500);
}

:deep(.danger .p-progressbar-value) {
  background: var(--red-500);
}
</style>
