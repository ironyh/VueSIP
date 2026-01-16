<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import type { QueueStats, QueueAgent } from '../composables/useQueues'

const props = defineProps<{
  queues: Map<string, QueueStats>
  isSupervisorMode: boolean
}>()

const emit = defineEmits<{
  spy: [agentInterface: string]
  whisper: [agentInterface: string]
  barge: [agentInterface: string]
  stopMonitor: []
}>()

const selectedAgent = ref<QueueAgent | null>(null)
const showMonitorDialog = ref(false)
const monitorMode = ref<'spy' | 'whisper' | 'barge' | null>(null)

const allAgents = computed(() => {
  const agents: (QueueAgent & { queue: string })[] = []
  props.queues.forEach((queue) => {
    queue.agents.forEach((agent) => {
      // Avoid duplicates if agent is in multiple queues
      if (!agents.find((a) => a.interface === agent.interface)) {
        agents.push({ ...agent, queue: queue.name })
      }
    })
  })
  return agents
})

function getStatusSeverity(status: string): string {
  switch (status) {
    case 'available':
      return 'success'
    case 'busy':
      return 'info'
    case 'paused':
      return 'warning'
    default:
      return 'danger'
  }
}

function openMonitorDialog(agent: QueueAgent) {
  selectedAgent.value = agent
  showMonitorDialog.value = true
}

function startMonitor(mode: 'spy' | 'whisper' | 'barge') {
  if (!selectedAgent.value) return

  monitorMode.value = mode
  const agentInterface = selectedAgent.value.interface

  switch (mode) {
    case 'spy':
      emit('spy', agentInterface)
      break
    case 'whisper':
      emit('whisper', agentInterface)
      break
    case 'barge':
      emit('barge', agentInterface)
      break
  }

  showMonitorDialog.value = false
}

function stopMonitor() {
  emit('stopMonitor')
  monitorMode.value = null
  selectedAgent.value = null
}
</script>

<template>
  <div class="supervisor-panel">
    <div class="panel-header">
      <h3>Supervisor Controls</h3>
      <Tag v-if="monitorMode" :value="`Monitoring: ${monitorMode.toUpperCase()}`" severity="info" />
    </div>

    <!-- Active Monitor Session -->
    <div v-if="monitorMode && selectedAgent" class="monitor-session">
      <div class="monitor-info">
        <i class="pi pi-headphones" />
        <div class="monitor-details">
          <span class="monitor-agent">{{ selectedAgent.name }}</span>
          <span class="monitor-mode">{{ monitorMode }} mode</span>
        </div>
      </div>
      <Button
        label="Stop Monitoring"
        icon="pi pi-times"
        class="p-button-danger"
        @click="stopMonitor"
      />
    </div>

    <!-- Agent List -->
    <div class="agent-list">
      <h4>Active Agents</h4>
      <DataTable :value="allAgents" size="small" striped-rows>
        <Column field="name" header="Agent" />
        <Column header="Status">
          <template #body="slotProps">
            <Tag
              :value="slotProps.data.status"
              :severity="getStatusSeverity(slotProps.data.status)"
            />
          </template>
        </Column>
        <Column field="callsTaken" header="Calls" />
        <Column header="Actions">
          <template #body="slotProps">
            <Button
              v-if="slotProps.data.status === 'busy'"
              icon="pi pi-headphones"
              class="p-button-text p-button-sm"
              :disabled="!!monitorMode"
              @click="openMonitorDialog(slotProps.data)"
            />
            <span v-else class="no-action">-</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Monitor Mode Dialog -->
    <Dialog
      v-model:visible="showMonitorDialog"
      header="Monitor Agent"
      :style="{ width: '350px' }"
      modal
    >
      <div v-if="selectedAgent" class="monitor-options">
        <p>
          Select monitoring mode for <strong>{{ selectedAgent.name }}</strong
          >:
        </p>

        <div class="monitor-buttons">
          <Button
            label="Spy"
            icon="pi pi-eye"
            class="p-button-outlined monitor-btn"
            @click="startMonitor('spy')"
          >
            <template #default>
              <div class="btn-content">
                <i class="pi pi-eye" />
                <span class="btn-label">Spy</span>
                <span class="btn-desc">Listen only</span>
              </div>
            </template>
          </Button>

          <Button
            label="Whisper"
            icon="pi pi-comments"
            class="p-button-outlined monitor-btn"
            @click="startMonitor('whisper')"
          >
            <template #default>
              <div class="btn-content">
                <i class="pi pi-comments" />
                <span class="btn-label">Whisper</span>
                <span class="btn-desc">Talk to agent</span>
              </div>
            </template>
          </Button>

          <Button
            label="Barge"
            icon="pi pi-megaphone"
            class="p-button-outlined monitor-btn"
            @click="startMonitor('barge')"
          >
            <template #default>
              <div class="btn-content">
                <i class="pi pi-megaphone" />
                <span class="btn-label">Barge</span>
                <span class="btn-desc">Join call</span>
              </div>
            </template>
          </Button>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.supervisor-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--surface-card);
  border-radius: 8px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.125rem;
}

.monitor-session {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--blue-50);
  border-radius: 8px;
  border: 1px solid var(--blue-200);
}

.monitor-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.monitor-info i {
  font-size: 1.5rem;
  color: var(--blue-500);
}

.monitor-details {
  display: flex;
  flex-direction: column;
}

.monitor-agent {
  font-weight: 600;
}

.monitor-mode {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  text-transform: capitalize;
}

.agent-list h4 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.no-action {
  color: var(--text-color-secondary);
}

.monitor-options p {
  margin: 0 0 16px;
}

.monitor-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.monitor-btn {
  width: 100%;
  justify-content: flex-start;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.btn-content i {
  font-size: 1.25rem;
}

.btn-label {
  font-weight: 600;
}

.btn-desc {
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}
</style>
