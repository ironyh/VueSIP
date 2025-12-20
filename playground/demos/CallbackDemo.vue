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

    <!-- Demo Card -->
    <div class="demo-card">
      <!-- Header -->
      <div class="demo-header">
        <div class="header-content">
          <span class="demo-icon">🔙</span>
          <div class="header-text">
            <h2>Callback Requests</h2>
            <p class="subtitle">Schedule and manage callback requests</p>
          </div>
        </div>
      </div>

      <div class="demo-content">
        <!-- Connection Panel -->
        <div v-if="!isConnected" class="connection-panel">
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <span>Connect to AMI to manage callback requests</span>
          </div>
          <div class="connection-form">
            <input
              v-model="amiUrl"
              type="text"
              placeholder="ws://pbx:8089/ws"
              class="url-input"
            />
            <button
              @click="connectAmi"
              :disabled="connecting"
              class="btn btn-primary"
            >
              {{ connecting ? 'Connecting...' : '🔗 Connect' }}
            </button>
          </div>
        </div>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <div class="status-badges">
              <span :class="['status-badge', isConnected ? 'success' : 'danger']">
                {{ isConnected ? '✓ Connected' : '✗ Disconnected' }}
              </span>
              <span class="status-badge info">
                {{ pendingCount }} pending
              </span>
              <span v-if="isExecuting" class="status-badge warning">
                ⏳ Callback in progress
              </span>
            </div>
          </div>

          <!-- Schedule New Callback Panel -->
          <div class="section-panel">
            <div class="panel-header">
              <h3>📝 Schedule New Callback</h3>
            </div>
            <div class="panel-content">
              <div class="form-grid">
                <div class="form-field">
                  <label>Caller Number *</label>
                  <input
                    v-model="newCallback.callerNumber"
                    type="text"
                    placeholder="+1-555-123-4567"
                  />
                </div>
                <div class="form-field">
                  <label>Caller Name</label>
                  <input
                    v-model="newCallback.callerName"
                    type="text"
                    placeholder="John Doe"
                  />
                </div>
                <div class="form-field">
                  <label>Queue</label>
                  <input
                    v-model="newCallback.targetQueue"
                    type="text"
                    placeholder="sales"
                  />
                </div>
                <div class="form-field">
                  <label>Priority</label>
                  <select v-model="newCallback.priority">
                    <option v-for="p in priorities" :key="p.value" :value="p.value">
                      {{ p.label }}
                    </option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Reason</label>
                  <input
                    v-model="newCallback.reason"
                    type="text"
                    placeholder="Sales inquiry"
                  />
                </div>
                <div class="form-field">
                  <label>Schedule Time (optional)</label>
                  <input
                    v-model="newCallback.scheduledAt"
                    type="datetime-local"
                  />
                </div>
              </div>
              <div class="form-actions">
                <button
                  @click="scheduleNewCallback"
                  :disabled="!newCallback.callerNumber || isLoading"
                  class="btn btn-primary"
                >
                  {{ isLoading ? 'Scheduling...' : '➕ Schedule Callback' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Pending Callbacks Panel -->
          <div class="section-panel">
            <div class="panel-header">
              <h3>📋 Pending Callbacks</h3>
              <span class="badge">{{ pendingCallbacks.length }}</span>
            </div>
            <div class="panel-content">
              <div v-if="pendingCallbacks.length === 0" class="empty-state">
                <span class="empty-icon">📥</span>
                <span class="empty-text">No pending callbacks</span>
              </div>
              <div v-else class="callbacks-table">
                <div class="table-header">
                  <div class="th">Number</div>
                  <div class="th">Name</div>
                  <div class="th">Priority</div>
                  <div class="th">Queue</div>
                  <div class="th">Scheduled</div>
                  <div class="th">Actions</div>
                </div>
                <div
                  v-for="callback in pendingCallbacks"
                  :key="callback.id"
                  class="table-row"
                >
                  <div class="td">{{ callback.callerNumber }}</div>
                  <div class="td">{{ callback.callerName || '-' }}</div>
                  <div class="td">
                    <span :class="['priority-badge', callback.priority]">
                      {{ callback.priority }}
                    </span>
                  </div>
                  <div class="td">{{ callback.targetQueue }}</div>
                  <div class="td">
                    {{ callback.scheduledAt ? formatDate(callback.scheduledAt) : 'ASAP' }}
                  </div>
                  <div class="td actions">
                    <button
                      @click="executeCallback(callback.id)"
                      :disabled="isExecuting"
                      class="btn-icon btn-success"
                      title="Execute now"
                    >
                      📞
                    </button>
                    <button
                      @click="cancelCallback(callback.id)"
                      class="btn-icon btn-danger"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Callback Panel -->
          <div v-if="activeCallback" class="section-panel active-panel">
            <div class="panel-header">
              <h3>📞 Active Callback</h3>
              <span class="status-dot pulsing"></span>
            </div>
            <div class="panel-content">
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
                <button
                  @click="markCallbackCompleted(activeCallback.id)"
                  class="btn btn-success"
                >
                  ✓ Mark Completed
                </button>
                <button
                  @click="cancelCallback(activeCallback.id)"
                  class="btn btn-danger"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          </div>

          <!-- Statistics Panel -->
          <div class="section-panel">
            <div class="panel-header">
              <h3>📊 Statistics</h3>
            </div>
            <div class="panel-content">
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-value">{{ stats.pending }}</span>
                  <span class="stat-label">Pending</span>
                </div>
                <div class="stat-card">
                  <span class="stat-value">{{ stats.scheduled }}</span>
                  <span class="stat-label">Scheduled</span>
                </div>
                <div class="stat-card success">
                  <span class="stat-value">{{ stats.completedToday }}</span>
                  <span class="stat-label">Completed Today</span>
                </div>
                <div class="stat-card danger">
                  <span class="stat-value">{{ stats.failedToday }}</span>
                  <span class="stat-label">Failed Today</span>
                </div>
                <div class="stat-card info">
                  <span class="stat-value">{{ stats.successRate }}%</span>
                  <span class="stat-label">Success Rate</span>
                </div>
                <div class="stat-card">
                  <span class="stat-value">{{ stats.avgCallbackTime }}s</span>
                  <span class="stat-label">Avg Duration</span>
                </div>
              </div>
            </div>
          </div>

          <!-- History Panel -->
          <div class="section-panel">
            <div class="panel-header">
              <h3>📜 Callback History</h3>
              <button
                @click="clearCompleted"
                class="btn-small btn-secondary"
              >
                🗑️ Clear Completed
              </button>
            </div>
            <div class="panel-content">
              <div v-if="completedCallbacks.length === 0" class="empty-state">
                <span class="empty-icon">📜</span>
                <span class="empty-text">No callback history</span>
              </div>
              <div v-else class="history-table">
                <div class="table-header">
                  <div class="th">Number</div>
                  <div class="th">Name</div>
                  <div class="th">Status</div>
                  <div class="th">Result</div>
                  <div class="th">Completed</div>
                </div>
                <div
                  v-for="callback in completedCallbacks"
                  :key="callback.id"
                  class="table-row"
                >
                  <div class="td">{{ callback.callerNumber }}</div>
                  <div class="td">{{ callback.callerName || '-' }}</div>
                  <div class="td">
                    <span :class="['status-badge', callback.status]">
                      {{ callback.status }}
                    </span>
                  </div>
                  <div class="td">{{ callback.disposition || '-' }}</div>
                  <div class="td">
                    {{ callback.completedAt ? formatDate(callback.completedAt) : '-' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Divider -->
        <div class="divider"></div>

        <!-- Code Example -->
        <div class="code-section">
          <h4>Code Example</h4>
          <pre class="code-block">{{ codeExample }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAmiCallback, type CallbackPriority } from '@/composables'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

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
/* Import global theme system */
@import '../styles/themes.css';

/* Demo Container */
.callback-demo {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

/* Demo Card */
.demo-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  margin: var(--spacing-md);
  overflow: hidden;
}

/* Demo Header */
.demo-header {
  padding: var(--spacing-xl);
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.demo-icon {
  font-size: var(--text-4xl);
}

.header-text h2 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
}

.subtitle {
  margin: 0;
  font-size: var(--text-sm);
  opacity: 0.9;
}

/* Demo Content */
.demo-content {
  padding: var(--spacing-xl);
}

/* Connection Panel */
.connection-panel {
  margin-bottom: var(--spacing-xl);
}

.warning-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-warning-light);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  color: var(--color-warning);
  margin-bottom: var(--spacing-md);
}

.warning-icon {
  font-size: var(--text-xl);
}

.connection-form {
  display: flex;
  gap: var(--spacing-sm);
}

.url-input {
  flex: 1;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.url-input:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Status Bar */
.status-bar {
  margin-bottom: var(--spacing-xl);
}

.status-badges {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.status-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}

.status-badge.success {
  background: var(--bg-success-light);
  color: var(--color-success);
}

.status-badge.danger {
  background: var(--bg-danger-light);
  color: var(--color-danger);
}

.status-badge.info {
  background: var(--bg-info-light);
  color: var(--color-info);
}

.status-badge.warning {
  background: var(--bg-warning-light);
  color: var(--color-warning);
}

/* Section Panels */
.section-panel {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xl);
  overflow: hidden;
  transition: all var(--transition-base);
}

.section-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-blue);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.section-panel:hover::before {
  opacity: 1;
}

.active-panel {
  border-color: var(--color-info);
  box-shadow: var(--shadow-blue);
}

.active-panel::before {
  opacity: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
}

.panel-content {
  padding: var(--spacing-lg);
}

/* Form Styles */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-field label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

.form-field input,
.form-field select {
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  margin-top: var(--spacing-lg);
  display: flex;
  justify-content: flex-end;
}

/* Buttons */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
}

.btn-primary:hover:not(:disabled) {
  background: var(--gradient-blue-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-blue);
}

.btn-success {
  background: var(--gradient-green);
  color: var(--text-on-gradient);
}

.btn-success:hover:not(:disabled) {
  background: var(--gradient-green-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-green);
}

.btn-danger {
  background: var(--gradient-red);
  color: var(--text-on-gradient);
}

.btn-danger:hover:not(:disabled) {
  background: var(--gradient-red-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-color-hover);
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
}

.btn-icon {
  padding: var(--spacing-xs);
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-base);
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon.btn-success {
  background: var(--gradient-green);
  color: var(--text-on-gradient);
}

.btn-icon.btn-danger {
  background: var(--gradient-red);
  color: var(--text-on-gradient);
}

.btn-icon:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Tables */
.callbacks-table,
.history-table {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr 0.8fr;
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border-color);
}

.history-table .table-header {
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr;
}

.th {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-secondary);
}

.table-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr 0.8fr;
  border-bottom: 1px solid var(--border-color);
  transition: all var(--transition-base);
}

.history-table .table-row {
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr;
}

.table-row:hover {
  background: var(--bg-hover);
  transform: translateX(4px);
}

.table-row:last-child {
  border-bottom: none;
}

.td {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--text-primary);
  display: flex;
  align-items: center;
}

.td.actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* Priority Badges */
.priority-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}

.priority-badge.urgent {
  background: var(--bg-danger-light);
  color: var(--color-danger);
}

.priority-badge.high {
  background: var(--bg-warning-light);
  color: var(--color-warning);
}

.priority-badge.normal {
  background: var(--bg-info-light);
  color: var(--color-info);
}

.priority-badge.low {
  background: var(--bg-neutral-light);
  color: var(--color-neutral);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-2xl);
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: var(--text-4xl);
}

.empty-text {
  font-size: var(--text-base);
}

/* Active Callback */
.active-callback-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.callback-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.callback-detail .label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.callback-detail .value {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.active-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-info);
}

.status-dot.pulsing {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Statistics Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-blue);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card.success::before {
  background: var(--gradient-green);
}

.stat-card.danger::before {
  background: var(--gradient-red);
}

.stat-card.info::before {
  background: var(--gradient-blue);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Divider */
.divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--spacing-2xl) 0;
}

/* Code Section */
.code-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.code-block {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  white-space: pre;
  color: var(--text-primary);
}
</style>
