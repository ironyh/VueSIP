<template>
  <div class="agent-login-demo">
    <!-- Simulation Controls (for call simulation, kept for future integration) -->
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

    <!-- Configuration Panel -->
    <div v-if="!isConnected" class="config-panel">
      <h3>Call Center Provider Configuration</h3>
      <p class="info-text">
        Configure your call center provider connection. This demo uses the provider-agnostic
        composables that support Asterisk, FreeSWITCH, and cloud-based call centers.
      </p>

      <div class="form-group">
        <label for="provider-type">Provider Type</label>
        <select
          id="provider-type"
          v-model="config.type"
          :disabled="isLoading"
          class="provider-select"
        >
          <option value="asterisk">Asterisk AMI</option>
          <option value="freeswitch" disabled>FreeSWITCH (Coming Soon)</option>
          <option value="cloud" disabled>Cloud API (Coming Soon)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="ami-host">Host</label>
        <input
          id="ami-host"
          v-model="config.host"
          type="text"
          placeholder="pbx.example.com"
          :disabled="isLoading"
        />
        <small>Hostname or IP of your PBX server</small>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="ami-port">Port</label>
          <input
            id="ami-port"
            v-model.number="config.port"
            type="number"
            placeholder="5038"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="ami-username">Username</label>
          <input
            id="ami-username"
            v-model="config.username"
            type="text"
            placeholder="admin"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="ami-password">Password/Secret</label>
          <input
            id="ami-password"
            v-model="config.secret"
            type="password"
            placeholder="Enter secret"
            :disabled="isLoading"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="agent-id">Agent ID</label>
          <input
            id="agent-id"
            v-model="config.agentId"
            type="text"
            placeholder="agent-001"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="agent-extension">Extension</label>
          <input
            id="agent-extension"
            v-model="config.extension"
            type="text"
            placeholder="PJSIP/1001"
            :disabled="isLoading"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="agent-name">Agent Name (Optional)</label>
        <input
          id="agent-name"
          v-model="config.agentName"
          type="text"
          placeholder="John Doe"
          :disabled="isLoading"
        />
      </div>

      <div class="form-group">
        <label for="default-queues">Default Queues (comma-separated)</label>
        <input
          id="default-queues"
          v-model="queuesInput"
          type="text"
          placeholder="sales,support,billing"
          :disabled="isLoading"
        />
        <small>Queues to join automatically on login</small>
      </div>

      <Button
        :label="isLoading ? 'Connecting...' : 'Connect to Provider'"
        :disabled="!isConfigValid || isLoading"
        @click="handleConnect"
      />

      <div v-if="providerError" class="error-message">
        {{ providerError }}
      </div>

      <div class="demo-tip">
        <strong>Provider-Agnostic:</strong> This demo uses the new provider adapter pattern. The
        same composables work with Asterisk, FreeSWITCH, or cloud-based call centers.
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-items">
          <div class="status-item">
            <span class="status-dot connected"></span>
            <span>{{ providerName }} Connected</span>
          </div>
          <div class="status-item">
            <span class="status-icon" :class="getStatusClass(status)">
              <span class="status-badge">{{ getStatusIcon(status) }}</span>
            </span>
            <span>{{ formatStatus(status) }}</span>
          </div>
          <div v-if="isOnCall" class="status-item">
            <span class="status-icon on-call">
              <span class="call-badge">CALL</span>
            </span>
            <span>On Call</span>
          </div>
        </div>
        <Button label="Disconnect" severity="secondary" size="small" @click="handleDisconnect" />
      </div>

      <!-- Agent Panel -->
      <div class="agent-panel">
        <!-- Session Info -->
        <div class="session-info">
          <h3>Agent Session</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Agent ID:</span>
              <span class="info-value">{{ agentId || config.agentId }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Extension:</span>
              <span class="info-value">{{ config.extension }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Session Duration:</span>
              <span class="info-value">{{ sessionDuration }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Calls Handled:</span>
              <span class="info-value">{{ totalCallsHandled }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Calls/Hour:</span>
              <span class="info-value">{{ callsPerHour.toFixed(1) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Utilization:</span>
              <span class="info-value">{{ utilizationPercent.toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <!-- Queue Login Section -->
        <div class="queue-section">
          <h3>Queue Management</h3>

          <div v-if="!isLoggedIn" class="login-actions">
            <Button label="Login to All Queues" :disabled="stateLoading" @click="handleLogin" />
            <small>Queues: {{ availableQueues.join(', ') }}</small>
          </div>

          <div v-else class="queue-list">
            <div v-for="queue in queues" :key="queue.name" class="queue-item logged-in">
              <div class="queue-info">
                <span class="queue-name">{{ queue.displayName }}</span>
                <span class="queue-status" :class="{ paused: queue.isPaused }">
                  {{ queue.isPaused ? 'Paused' : 'Active' }}
                </span>
              </div>
              <div class="queue-stats">
                <span class="stat">{{ queue.callsHandled }} calls</span>
                <span class="stat">Penalty: {{ queue.penalty }}</span>
              </div>
              <div class="queue-actions">
                <Button
                  v-if="!queue.isPaused"
                  label="Pause"
                  severity="warn"
                  size="small"
                  :disabled="queueLoading"
                  @click="handlePauseInQueue(queue.name)"
                />
                <Button
                  v-else
                  label="Unpause"
                  severity="success"
                  size="small"
                  :disabled="queueLoading"
                  @click="handleUnpauseInQueue(queue.name)"
                />
                <Button
                  label="Leave"
                  severity="danger"
                  size="small"
                  :disabled="queueLoading"
                  @click="handleLeaveQueue(queue.name)"
                />
              </div>
            </div>
          </div>

          <div v-if="isLoggedIn" class="queue-actions-bar">
            <div class="join-queue-form">
              <input
                v-model="newQueueName"
                type="text"
                placeholder="Queue name to join"
                class="queue-input"
                :disabled="queueLoading"
              />
              <Button
                label="Join Queue"
                size="small"
                :disabled="!newQueueName || queueLoading"
                @click="handleJoinQueue"
              />
            </div>
            <Button
              label="Logout from All"
              severity="danger"
              :disabled="stateLoading"
              @click="handleLogout"
            />
          </div>
        </div>

        <!-- Pause Section -->
        <div class="pause-section">
          <h3>Global Pause Management</h3>

          <div v-if="!isPaused" class="pause-form">
            <div class="form-group">
              <label for="pause-reason">Pause Reason</label>
              <select
                id="pause-reason"
                v-model="selectedPauseReason"
                class="pause-select"
                :disabled="!isLoggedIn || stateLoading"
              >
                <option value="">Select a reason...</option>
                <option v-for="reason in pauseReasons" :key="reason" :value="reason">
                  {{ reason }}
                </option>
              </select>
            </div>
            <Button
              label="Pause Agent"
              severity="warn"
              :disabled="!isLoggedIn || !selectedPauseReason || stateLoading"
              @click="handlePause"
            />
          </div>

          <div v-else class="paused-state">
            <div class="paused-info">
              <span class="paused-icon">PAUSED</span>
              <div class="paused-details">
                <span class="paused-label">Currently Paused</span>
                <span class="paused-reason">{{ pauseReason || 'No reason' }}</span>
              </div>
            </div>
            <Button
              label="Unpause Agent"
              severity="success"
              :disabled="stateLoading"
              @click="handleUnpause"
            />
          </div>
        </div>

        <!-- Current Call Info -->
        <div v-if="currentCall" class="call-section">
          <h3>Current Call</h3>
          <div class="call-info">
            <div class="info-item">
              <span class="info-label">Caller:</span>
              <span class="info-value">{{ currentCall.callerInfo }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">From Queue:</span>
              <span class="info-value">{{ currentCall.fromQueue || 'Direct' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Duration:</span>
              <span class="info-value">{{ formatCallDuration(currentCall.duration) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">On Hold:</span>
              <span class="info-value">{{ currentCall.isOnHold ? 'Yes' : 'No' }}</span>
            </div>
          </div>
        </div>

        <!-- Metrics Section -->
        <div class="metrics-section">
          <h3>Session Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-value">{{ metrics?.callsHandled ?? 0 }}</span>
              <span class="metric-label">Calls Handled</span>
            </div>
            <div class="metric-card">
              <span class="metric-value">{{ totalTalkTimeFormatted }}</span>
              <span class="metric-label">Total Talk Time</span>
            </div>
            <div class="metric-card">
              <span class="metric-value">{{ averageHandleTimeFormatted }}</span>
              <span class="metric-label">Avg Handle Time</span>
            </div>
            <div class="metric-card">
              <span class="metric-value">{{ metrics?.missedCalls ?? 0 }}</span>
              <span class="metric-label">Missed Calls</span>
            </div>
          </div>
          <Button
            label="Refresh Metrics"
            severity="secondary"
            size="small"
            :disabled="metricsLoading"
            @click="refreshMetrics"
          />
        </div>

        <!-- Error Display -->
        <div v-if="stateError || queueError" class="error-message">
          {{ stateError || queueError }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, reactive } from 'vue'
import { useCallCenterProvider, useAgentState, useAgentQueue, useAgentMetrics } from '../../src'
import type { AgentStatus } from '../../src/providers/call-center/types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button } from './shared-components'

// Simulation system (for call simulation, separate from agent login)
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Provider configuration
const config = reactive({
  type: 'asterisk' as const,
  host: 'localhost',
  port: 5038,
  username: 'admin',
  secret: '',
  agentId: 'agent-001',
  extension: 'PJSIP/1001',
  agentName: 'Demo Agent',
})

const queuesInput = ref('sales,support,billing')
const availableQueues = computed(() =>
  queuesInput.value
    .split(',')
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
)

// Configuration validation
const isConfigValid = computed(
  () => config.host && config.port && config.agentId && config.extension
)

// Provider instance (created on connect)
let providerInstance: ReturnType<typeof useCallCenterProvider> | null = null

// Reactive state from composables
const providerRef = ref<ReturnType<typeof useCallCenterProvider>['provider']['value']>(null)
const isConnected = ref(false)
const isLoading = ref(false)
const providerError = ref<string | null>(null)
const providerName = computed(() => (config.type === 'asterisk' ? 'Asterisk AMI' : config.type))

// Agent state composable
const {
  agentId,
  status,
  isLoggedIn,
  isOnCall,
  isPaused,
  pauseReason,
  currentCall,
  sessionDuration,
  isLoading: stateLoading,
  error: stateError,
  login,
  logout,
  pause,
  unpause,
} = useAgentState(providerRef)

// Queue composable
const {
  queues,
  totalCallsHandled,
  isLoading: queueLoading,
  error: queueError,
  joinQueue,
  leaveQueue,
  pauseInQueue,
  unpauseInQueue,
} = useAgentQueue(providerRef)

// Metrics composable
const {
  metrics,
  totalTalkTimeFormatted,
  averageHandleTimeFormatted,
  callsPerHour,
  utilizationPercent,
  isLoading: metricsLoading,
  fetchMetrics,
  startAutoRefresh,
  stopAutoRefresh,
} = useAgentMetrics(providerRef, { autoRefreshInterval: 30000 })

// UI state
const selectedPauseReason = ref('')
const newQueueName = ref('')
const pauseReasons = ['Break', 'Lunch', 'Meeting', 'Training', 'Personal', 'Other']

// Connection handlers
async function handleConnect() {
  isLoading.value = true
  providerError.value = null

  try {
    // Create provider instance with configuration
    providerInstance = useCallCenterProvider({
      type: config.type,
      connection: {
        host: config.host,
        port: config.port,
        username: config.username,
        secret: config.secret,
      },
      agent: {
        id: config.agentId,
        extension: config.extension,
        name: config.agentName || config.agentId,
      },
      defaultQueues: availableQueues.value,
      pauseReasons,
    })

    // Connect to provider
    await providerInstance.connect()

    // Update reactive ref to trigger composables
    providerRef.value = providerInstance.provider.value
    isConnected.value = true

    // Start metrics auto-refresh
    startAutoRefresh()
  } catch (err) {
    providerError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    isLoading.value = false
  }
}

async function handleDisconnect() {
  stopAutoRefresh()

  if (providerInstance) {
    await providerInstance.disconnect()
    providerInstance = null
  }

  providerRef.value = null
  isConnected.value = false
}

// Agent state handlers
async function handleLogin() {
  try {
    await login({ queues: availableQueues.value })
  } catch {
    // Error is handled in composable
  }
}

async function handleLogout() {
  try {
    await logout()
  } catch {
    // Error is handled in composable
  }
}

async function handlePause() {
  if (!selectedPauseReason.value) return
  try {
    await pause(selectedPauseReason.value)
    selectedPauseReason.value = ''
  } catch {
    // Error is handled in composable
  }
}

async function handleUnpause() {
  try {
    await unpause()
  } catch {
    // Error is handled in composable
  }
}

// Queue handlers
async function handleJoinQueue() {
  if (!newQueueName.value) return
  try {
    await joinQueue(newQueueName.value)
    newQueueName.value = ''
  } catch {
    // Error is handled in composable
  }
}

async function handleLeaveQueue(queue: string) {
  try {
    await leaveQueue(queue)
  } catch {
    // Error is handled in composable
  }
}

async function handlePauseInQueue(queue: string) {
  try {
    await pauseInQueue(queue, 'Manual pause')
  } catch {
    // Error is handled in composable
  }
}

async function handleUnpauseInQueue(queue: string) {
  try {
    await unpauseInQueue(queue)
  } catch {
    // Error is handled in composable
  }
}

// Metrics handler
async function refreshMetrics() {
  try {
    await fetchMetrics()
  } catch {
    // Error is handled in composable
  }
}

// Formatting helpers
function formatStatus(status: AgentStatus): string {
  const labels: Record<AgentStatus, string> = {
    offline: 'Offline',
    available: 'Available',
    busy: 'Busy',
    'wrap-up': 'Wrap-up',
    break: 'On Break',
    meeting: 'In Meeting',
  }
  return labels[status] || status
}

function getStatusIcon(status: AgentStatus): string {
  const icons: Record<AgentStatus, string> = {
    offline: 'OFF',
    available: 'ON',
    busy: 'BUSY',
    'wrap-up': 'WRAP',
    break: 'BRK',
    meeting: 'MTG',
  }
  return icons[status] || 'UNK'
}

function getStatusClass(status: AgentStatus): string {
  return `status-${status}`
}

function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Cleanup
onUnmounted(() => {
  stopAutoRefresh()
  if (providerInstance) {
    providerInstance.disconnect()
  }
})
</script>

<style scoped>
.agent-login-demo {
  max-width: 900px;
  margin: 0 auto;
}

/* Config Panel */
.config-panel {
  padding: 2rem;
}

.config-panel h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.info-text {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--surface-card);
  color: var(--text-primary);
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group input:disabled,
.form-group select:disabled {
  background: var(--surface-ground);
  cursor: not-allowed;
  opacity: 0.6;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.provider-select {
  cursor: pointer;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  color: var(--text-danger);
  font-size: 0.875rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.15);
  border-left: 4px solid var(--info);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-primary);
}

/* Connected Interface */
.connected-interface {
  padding: 2rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  margin-bottom: 2rem;
}

.status-items {
  display: flex;
  gap: 1.5rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
}

.status-dot.connected {
  background: var(--success);
}

.status-icon {
  font-size: 1.25rem;
}

.status-icon.on-call {
  color: var(--info);
}

.status-badge,
.call-badge {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  background: var(--surface-card);
}

/* Agent Panel */
.agent-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.session-info,
.queue-section,
.pause-section,
.call-section,
.metrics-section {
  padding: 1rem;
  background: var(--surface-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
}

@media (min-width: 640px) {
  .session-info,
  .queue-section,
  .pause-section,
  .call-section,
  .metrics-section {
    padding: 1.5rem;
  }
}

.session-info h3,
.queue-section h3,
.pause-section h3,
.call-section h3,
.metrics-section h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .info-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.info-value {
  font-weight: 500;
  color: var(--text-primary);
}

/* Queue Section */
.login-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.login-actions small {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.queue-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem;
  background: var(--surface-ground);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}

@media (min-width: 640px) {
  .queue-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }
}

.queue-item.logged-in {
  background: rgba(16, 185, 129, 0.1);
  border-color: var(--success);
}

.queue-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.queue-name {
  font-weight: 500;
  color: var(--text-primary);
}

.queue-status {
  font-size: 0.75rem;
  color: var(--success);
}

.queue-status.paused {
  color: var(--warning);
}

.queue-stats {
  display: flex;
  gap: 1rem;
}

.queue-stats .stat {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.queue-actions {
  display: flex;
  gap: 0.5rem;
}

.queue-actions-bar {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.join-queue-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.queue-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--surface-card);
  color: var(--text-primary);
  width: 200px;
}

/* Pause Section */
.pause-form {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.pause-form .form-group {
  flex: 1;
  margin-bottom: 0;
}

.pause-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  background: var(--surface-card);
  color: var(--text-primary);
  transition: border-color 0.3s ease;
  cursor: pointer;
}

.pause-select:focus {
  outline: none;
  border-color: var(--primary);
}

.paused-state {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid var(--warning);
  border-radius: var(--radius-md);
}

@media (min-width: 640px) {
  .paused-state {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
  }
}

.paused-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.paused-icon {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--warning);
}

.paused-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.paused-label {
  font-weight: 500;
  color: var(--text-warning);
}

.paused-reason {
  font-size: 0.875rem;
  color: var(--text-warning);
}

/* Call Section */
.call-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

/* Metrics Section */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .metrics-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: var(--radius-md);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
}

/* Status Colors */
.status-offline {
  color: var(--text-secondary);
}
.status-available {
  color: var(--success);
}
.status-busy {
  color: var(--info);
}
.status-wrap-up {
  color: var(--warning);
}
.status-break {
  color: var(--warning);
}
.status-meeting {
  color: var(--info);
}

/* Mobile-First Responsive */
.form-row {
  flex-direction: column;
  gap: 0;
}

@media (min-width: 640px) {
  .form-row {
    flex-direction: row;
    gap: 1rem;
  }
}

.status-bar {
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 640px) {
  .status-bar {
    flex-direction: row;
    gap: 1.5rem;
  }
}

.status-items {
  flex-direction: column;
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .status-items {
    flex-direction: row;
    gap: 1.5rem;
  }
}

.queue-actions-bar {
  flex-direction: column;
}

@media (min-width: 640px) {
  .queue-actions-bar {
    flex-direction: row;
    justify-content: space-between;
  }
}

.pause-form {
  flex-direction: column;
}

@media (min-width: 640px) {
  .pause-form {
    flex-direction: row;
    align-items: flex-end;
  }
}
</style>
