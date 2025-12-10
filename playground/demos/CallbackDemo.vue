<template>
  <div class="callback-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
      :duration="simulation.duration.value"
      :remote-uri="simulation.remoteUri.value"
      :remote-display-name="simulation.remoteDisplayName.value"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="simulation.isMuted.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">🔙</span>
          <span>Callback Requests</span>
        </div>
      </template>
      <template #subtitle>Schedule and manage callback requests</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to manage callback requests
          </Message>
          <div class="connection-form">
            <InputText v-model="amiUrl" placeholder="ws://pbx:8089/ws" class="url-input" />
            <Button label="Connect" icon="pi pi-link" @click="connectAmi" :loading="connecting" />
          </div>
        </div>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <Tag :severity="isConnected ? 'success' : 'danger'" :value="isConnected ? 'Connected' : 'Disconnected'" />
            <Tag severity="info" :value="`${pendingCount} pending`" />
            <Tag v-if="isExecuting" severity="warning" value="Callback in progress" />
          </div>

          <!-- Schedule New Callback -->
          <Panel header="Schedule New Callback" :toggleable="true" class="section-panel">
            <div class="form-grid">
              <div class="form-field">
                <label>Caller Number *</label>
                <InputText v-model="newCallback.callerNumber" placeholder="+1-555-123-4567" />
              </div>
              <div class="form-field">
                <label>Caller Name</label>
                <InputText v-model="newCallback.callerName" placeholder="John Doe" />
              </div>
              <div class="form-field">
                <label>Queue</label>
                <InputText v-model="newCallback.targetQueue" placeholder="sales" />
              </div>
              <div class="form-field">
                <label>Priority</label>
                <Dropdown
                  v-model="newCallback.priority"
                  :options="priorities"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select priority"
                />
              </div>
              <div class="form-field">
                <label>Reason</label>
                <InputText v-model="newCallback.reason" placeholder="Sales inquiry" />
              </div>
              <div class="form-field">
                <label>Schedule Time (optional)</label>
                <Calendar v-model="newCallback.scheduledAt" showTime hourFormat="12" showIcon />
              </div>
            </div>
            <div class="form-actions">
              <Button
                label="Schedule Callback"
                icon="pi pi-plus"
                @click="scheduleNewCallback"
                :loading="isLoading"
                :disabled="!newCallback.callerNumber"
              />
            </div>
          </Panel>

          <!-- Pending Callbacks -->
          <Panel header="Pending Callbacks" :toggleable="true" class="section-panel" :collapsed="pendingCallbacks.length === 0">
            <DataTable :value="pendingCallbacks" size="small" :rows="5" :paginator="pendingCallbacks.length > 5">
              <Column field="callerNumber" header="Number" />
              <Column field="callerName" header="Name" />
              <Column field="priority" header="Priority">
                <template #body="{ data }">
                  <Tag :severity="getPrioritySeverity(data.priority)" :value="data.priority" />
                </template>
              </Column>
              <Column field="targetQueue" header="Queue" />
              <Column field="scheduledAt" header="Scheduled">
                <template #body="{ data }">
                  {{ data.scheduledAt ? formatDate(data.scheduledAt) : 'ASAP' }}
                </template>
              </Column>
              <Column header="Actions" style="width: 150px">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      icon="pi pi-phone"
                      size="small"
                      severity="success"
                      @click="executeCallback(data.id)"
                      :disabled="isExecuting"
                      v-tooltip="'Execute now'"
                    />
                    <Button
                      icon="pi pi-times"
                      size="small"
                      severity="danger"
                      @click="cancelCallback(data.id)"
                      v-tooltip="'Cancel'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <div v-if="pendingCallbacks.length === 0" class="empty-state">
              <i class="pi pi-inbox"></i>
              <span>No pending callbacks</span>
            </div>
          </Panel>

          <!-- Active Callback -->
          <Panel v-if="activeCallback" header="Active Callback" class="section-panel active-panel">
            <div class="active-callback-info">
              <div class="callback-detail">
                <span class="label">Number:</span>
                <span class="value">{{ activeCallback.callerNumber }}</span>
              </div>
              <div class="callback-detail">
                <span class="label">Name:</span>
                <span class="value">{{ activeCallback.callerName || 'Unknown' }}</span>
              </div>
              <div class="callback-detail">
                <span class="label">Duration:</span>
                <span class="value">{{ activeCallback.duration || 0 }}s</span>
              </div>
              <div class="callback-detail">
                <span class="label">Attempts:</span>
                <span class="value">{{ activeCallback.attempts }}/{{ activeCallback.maxAttempts }}</span>
              </div>
            </div>
            <div class="active-actions">
              <Button
                label="Mark Completed"
                icon="pi pi-check"
                severity="success"
                @click="markCallbackCompleted(activeCallback.id)"
              />
              <Button
                label="Cancel"
                icon="pi pi-times"
                severity="danger"
                @click="cancelCallback(activeCallback.id)"
              />
            </div>
          </Panel>

          <!-- Stats -->
          <Panel header="Statistics" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">{{ stats.pending }}</span>
                <span class="stat-label">Pending</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.scheduled }}</span>
                <span class="stat-label">Scheduled</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.completedToday }}</span>
                <span class="stat-label">Completed Today</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.failedToday }}</span>
                <span class="stat-label">Failed Today</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.successRate }}%</span>
                <span class="stat-label">Success Rate</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.avgCallbackTime }}s</span>
                <span class="stat-label">Avg Duration</span>
              </div>
            </div>
          </Panel>

          <!-- History -->
          <Panel header="Callback History" :toggleable="true" :collapsed="true" class="section-panel">
            <DataTable :value="completedCallbacks" size="small" :rows="5" :paginator="completedCallbacks.length > 5">
              <Column field="callerNumber" header="Number" />
              <Column field="callerName" header="Name" />
              <Column field="status" header="Status">
                <template #body="{ data }">
                  <Tag :severity="getStatusSeverity(data.status)" :value="data.status" />
                </template>
              </Column>
              <Column field="disposition" header="Result" />
              <Column field="completedAt" header="Completed">
                <template #body="{ data }">
                  {{ data.completedAt ? formatDate(data.completedAt) : '-' }}
                </template>
              </Column>
            </DataTable>
            <div class="history-actions">
              <Button
                label="Clear Completed"
                icon="pi pi-trash"
                size="small"
                severity="secondary"
                @click="clearCompleted"
              />
            </div>
          </Panel>
        </template>

        <Divider />

        <h4>Code Example</h4>
        <pre class="code-block">{{ codeExample }}</pre>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAmiCallback, type CallbackPriority } from '@/composables'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Divider from 'primevue/divider'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Connection - use standardized storage key
const amiUrl = ref(localStorage.getItem('vuesip-ami-url') || 'ws://localhost:8089/ws')
const connecting = ref(false)
const realIsConnected = computed(() => playgroundAmiClient.isConnected.value)

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)

const connectAmi = async () => {
  connecting.value = true
  try {
    localStorage.setItem('vuesip-ami-url', amiUrl.value)
    await playgroundAmiClient.connect({ url: amiUrl.value })
  } catch (e) {
    console.error('Failed to connect:', e)
  } finally {
    connecting.value = false
  }
}

// Callback composable
const {
  callbacks: _callbacks,
  activeCallback,
  stats,
  isLoading,
  pendingCallbacks,
  completedCallbacks,
  isExecuting,
  pendingCount,
  scheduleCallback,
  executeCallback: execCallback,
  cancelCallback: cancelCb,
  markCompleted,
  clearCompleted,
} = useAmiCallback(playgroundAmiClient.getClient(), {
  defaultQueue: 'support',
  onCallbackCompleted: (cb) => console.log('Callback completed:', cb.callerNumber),
  onCallbackFailed: (cb, reason) => console.log('Callback failed:', cb.callerNumber, reason),
})

// Form state
const newCallback = reactive({
  callerNumber: '',
  callerName: '',
  targetQueue: '',
  priority: 'normal' as CallbackPriority,
  reason: '',
  scheduledAt: null as Date | null,
})

const priorities = [
  { label: 'Low', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

// Actions
const scheduleNewCallback = async () => {
  try {
    await scheduleCallback({
      callerNumber: newCallback.callerNumber,
      callerName: newCallback.callerName || undefined,
      targetQueue: newCallback.targetQueue || undefined,
      priority: newCallback.priority,
      reason: newCallback.reason || undefined,
      scheduledAt: newCallback.scheduledAt || undefined,
    })
    // Reset form
    newCallback.callerNumber = ''
    newCallback.callerName = ''
    newCallback.targetQueue = ''
    newCallback.priority = 'normal'
    newCallback.reason = ''
    newCallback.scheduledAt = null
  } catch (e) {
    console.error('Failed to schedule callback:', e)
  }
}

const executeCallback = async (id: string) => {
  try {
    await execCallback(id)
  } catch (e) {
    console.error('Failed to execute callback:', e)
  }
}

const cancelCallback = async (id: string) => {
  try {
    await cancelCb(id)
  } catch (e) {
    console.error('Failed to cancel callback:', e)
  }
}

const markCallbackCompleted = (id: string) => {
  markCompleted(id, 'answered')
}

// Helpers
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const getPrioritySeverity = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'danger'
    case 'high': return 'warning'
    case 'normal': return 'info'
    case 'low': return 'secondary'
    default: return 'info'
  }
}

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'danger'
    case 'cancelled': return 'secondary'
    default: return 'info'
  }
}

const codeExample = `import { useAmiCallback } from 'vuesip'

const {
  callbacks,
  pendingCallbacks,
  activeCallback,
  stats,
  scheduleCallback,
  executeCallback,
  executeNext,
  cancelCallback,
} = useAmiCallback(amiClient, {
  defaultQueue: 'sales',
  onCallbackCompleted: (callback) => {
    console.log('Callback completed:', callback.callerNumber)
  },
})

// Schedule a callback
await scheduleCallback({
  callerNumber: '+1-555-123-4567',
  callerName: 'John Doe',
  priority: 'high',
  reason: 'Sales inquiry',
  scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
})

// Execute next pending callback
await executeNext()

// Cancel a callback
await cancelCallback(callbackId)`
</script>

<style scoped>
.callback-demo {
  max-width: 900px;
  margin: 0 auto;
}

.demo-card {
  margin: 1rem;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-icon {
  font-size: 1.5rem;
}

.connection-panel {
  margin-bottom: 1rem;
}

.connection-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.url-input {
  flex: 1;
}

.status-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.section-panel {
  margin-bottom: 1rem;
}

.active-panel {
  border: 2px solid var(--primary-color);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.form-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.empty-state i {
  font-size: 2rem;
}

.active-callback-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.callback-detail {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.callback-detail .label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.callback-detail .value {
  font-weight: 500;
}

.active-actions {
  display: flex;
  gap: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: 6px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.history-actions {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
