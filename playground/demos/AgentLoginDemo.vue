<template>
  <div class="agent-login-demo">
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

    <!-- Configuration Panel -->
    <div v-if="!amiConnected" class="config-panel">
      <h3>AMI Server Configuration</h3>
      <p class="info-text">
        Configure your AMI WebSocket connection to test agent queue login/logout functionality. This
        demo allows agents to log in/out of queues, pause/unpause, and track session metrics.
      </p>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <input
          id="ami-url"
          v-model="config.url"
          type="text"
          placeholder="ws://pbx.example.com:8080/ami"
          :disabled="connecting"
        />
        <small>Example: ws://your-pbx:8080/ami</small>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="ami-username">Username <small>(optional)</small></label>
          <input
            id="ami-username"
            v-model="config.username"
            type="text"
            placeholder="admin"
            :disabled="connecting"
          />
        </div>

        <div class="form-group">
          <label for="ami-password">Password <small>(optional)</small></label>
          <input
            id="ami-password"
            v-model="config.password"
            type="password"
            placeholder="Enter password"
            :disabled="connecting"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="agent-id">Agent ID</label>
          <input
            id="agent-id"
            v-model="agentConfig.agentId"
            type="text"
            placeholder="agent1001"
            :disabled="connecting"
          />
        </div>

        <div class="form-group">
          <label for="agent-interface">Agent Interface</label>
          <input
            id="agent-interface"
            v-model="agentConfig.interface"
            type="text"
            placeholder="PJSIP/1001"
            :disabled="connecting"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="agent-name">Agent Name (Optional)</label>
        <input
          id="agent-name"
          v-model="agentConfig.name"
          type="text"
          placeholder="John Doe"
          :disabled="connecting"
        />
      </div>

      <div class="form-group">
        <label for="available-queues">Available Queues (comma-separated)</label>
        <input
          id="available-queues"
          v-model="queuesInput"
          type="text"
          placeholder="sales,support,billing"
          :disabled="connecting"
        />
        <small>Enter the queues the agent can log into</small>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!isConfigValid || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect to AMI' }}
      </button>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> This demo requires an AMI WebSocket proxy. Make sure your Asterisk
        server has the AMI interface configured and a WebSocket proxy is running.
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-items">
          <div class="status-item">
            <span class="status-dot connected"></span>
            <span>AMI Connected</span>
          </div>
          <div class="status-item">
            <span class="status-icon" :class="getStatusClass(status)">
              <span class="status-badge">{{ getStatusIcon(status) }}</span>
            </span>
            <span>{{ formatStatus(status) }}</span>
          </div>
          <div v-if="isOnShift !== undefined" class="status-item">
            <span class="status-icon" :class="{ 'on-shift': isOnShift }">
              <span class="shift-badge">{{ isOnShift ? 'ON' : 'OFF' }}</span>
            </span>
            <span>{{ isOnShift ? 'On Shift' : 'Off Shift' }}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">Disconnect</button>
      </div>

      <!-- Agent Panel -->
      <div class="agent-panel">
        <!-- Session Info -->
        <div class="session-info">
          <h3>Agent Session</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Agent ID:</span>
              <span class="info-value">{{ session.agentId }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Interface:</span>
              <span class="info-value">{{ session.interface }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Session Duration:</span>
              <span class="info-value">{{ sessionDurationFormatted }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Calls Handled:</span>
              <span class="info-value">{{ session.totalCallsHandled }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Login Time:</span>
              <span class="info-value">
                {{ session.loginTime ? formatDateTime(session.loginTime) : 'Not logged in' }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value" :class="getStatusClass(status)">
                {{ formatStatus(status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Queue Login Section -->
        <div class="queue-section">
          <h3>Queue Management</h3>

          <div class="queue-list">
            <div
              v-for="queue in availableQueues"
              :key="queue"
              class="queue-item"
              :class="{ 'logged-in': isLoggedIntoQueue(queue) }"
            >
              <div class="queue-info">
                <span class="queue-name">{{ queue }}</span>
                <span v-if="isLoggedIntoQueue(queue)" class="queue-status">
                  {{ getQueueStatusText(queue) }}
                </span>
              </div>
              <div class="queue-actions">
                <button
                  v-if="!isLoggedIntoQueue(queue)"
                  class="btn btn-sm btn-success"
                  :disabled="isLoading"
                  @click="handleLoginQueue(queue)"
                >
                  Login
                </button>
                <button
                  v-else
                  class="btn btn-sm btn-danger"
                  :disabled="isLoading"
                  @click="handleLogoutQueue(queue)"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div class="queue-actions-bar">
            <button
              class="btn btn-primary"
              :disabled="isLoading || loggedInQueues.length === availableQueues.length"
              @click="handleLoginAll"
            >
              Login to All
            </button>
            <button
              class="btn btn-danger"
              :disabled="isLoading || loggedInQueues.length === 0"
              @click="handleLogoutAll"
            >
              Logout from All
            </button>
          </div>
        </div>

        <!-- Pause Section -->
        <div class="pause-section">
          <h3>Pause Management</h3>

          <div v-if="!isPaused" class="pause-form">
            <div class="form-group">
              <label for="pause-reason">Pause Reason</label>
              <select
                id="pause-reason"
                v-model="selectedPauseReason"
                class="pause-select"
                :disabled="!isLoggedIn || isLoading"
              >
                <option value="">Select a reason...</option>
                <option v-for="reason in pauseReasons" :key="reason" :value="reason">
                  {{ reason }}
                </option>
              </select>
            </div>
            <button
              class="btn btn-warning"
              :disabled="!isLoggedIn || !selectedPauseReason || isLoading"
              @click="handlePause"
            >
              Pause Agent
            </button>
          </div>

          <div v-else class="paused-state">
            <div class="paused-info">
              <span class="paused-icon">PAUSED</span>
              <div class="paused-details">
                <span class="paused-label">Currently Paused</span>
                <span class="paused-reason">{{ session.pauseReason || 'No reason' }}</span>
              </div>
            </div>
            <button class="btn btn-success" :disabled="isLoading" @click="handleUnpause">
              Unpause Agent
            </button>
          </div>
        </div>

        <!-- Logged In Queues Details -->
        <div v-if="loggedInQueues.length > 0" class="membership-details">
          <h3>Queue Memberships ({{ loggedInQueues.length }})</h3>
          <div class="membership-list">
            <div
              v-for="membership in session.queues.filter((q) => q.isMember)"
              :key="membership.queue"
              class="membership-item"
            >
              <div class="membership-header">
                <span class="membership-queue">{{ membership.queue }}</span>
                <span class="membership-status" :class="{ paused: membership.isPaused }">
                  {{ membership.isPaused ? 'Paused' : membership.inCall ? 'On Call' : 'Ready' }}
                </span>
              </div>
              <div class="membership-stats">
                <div class="stat">
                  <span class="stat-label">Calls Taken:</span>
                  <span class="stat-value">{{ membership.callsTaken }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Penalty:</span>
                  <span class="stat-value">{{ membership.penalty }}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Last Call:</span>
                  <span class="stat-value">
                    {{ membership.lastCall ? formatTimestamp(membership.lastCall) : 'Never' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, reactive } from 'vue'
import type { AmiClient } from '../../src/core/AmiClient'
import type { AgentLoginStatus } from '../../src/types/agent.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
// Note: In production, import from the library
// import { useAmiAgentLogin } from 'vuesip'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Mock AMI client state (replace with actual useAmi when connected)
const amiConnected = ref(false)
const connecting = ref(false)
const connectionError = ref('')
// Note: In production, use actual AmiClient from useAmi composable
let _mockClient: AmiClient | null = null

// Configuration
const config = reactive({
  url: 'ws://localhost:8080/ami',
  username: 'admin',
  password: '',
})

const agentConfig = reactive({
  agentId: 'agent1001',
  interface: 'PJSIP/1001',
  name: 'Demo Agent',
})

const queuesInput = ref('sales,support,billing')

// Derived state
const availableQueues = computed(() =>
  queuesInput.value
    .split(',')
    .map((q) => q.trim())
    .filter((q) => q.length > 0)
)

// Agent state (simulated - would come from useAmiAgentLogin)
const session = reactive({
  agentId: '',
  interface: '',
  name: '',
  status: 'logged_out' as AgentLoginStatus,
  queues: [] as Array<{
    queue: string
    interface: string
    isMember: boolean
    isPaused: boolean
    pauseReason?: string
    penalty: number
    callsTaken: number
    lastCall: number
    loginTime: number
    inCall: boolean
  }>,
  loginTime: null as Date | null,
  sessionDuration: 0,
  totalCallsHandled: 0,
  totalTalkTime: 0,
  isPaused: false,
  pauseReason: undefined as string | undefined,
  isOnShift: true,
})

const isLoading = ref(false)
const error = ref<string | null>(null)

// Pause state
const selectedPauseReason = ref('')
const pauseReasons = ['Break', 'Lunch', 'Meeting', 'Training', 'Personal', 'Other']

// Session timer
let sessionTimer: ReturnType<typeof setInterval> | null = null

// Computed
const status = computed(() => session.status)
const isLoggedIn = computed(() => session.queues.some((q) => q.isMember))
const isPaused = computed(() => session.isPaused)
const isOnShift = computed(() => session.isOnShift)
const loggedInQueues = computed(() => session.queues.filter((q) => q.isMember).map((q) => q.queue))
const sessionDurationFormatted = computed(() => formatDuration(session.sessionDuration))

const isConfigValid = computed(
  () =>
    config.url && // username/password optional - some AMI setups allow unauthenticated connections
    agentConfig.agentId &&
    agentConfig.interface
)

// Methods
function isLoggedIntoQueue(queue: string): boolean {
  return session.queues.some((q) => q.queue === queue && q.isMember)
}

function getQueueStatusText(queue: string): string {
  const membership = session.queues.find((q) => q.queue === queue)
  if (!membership) return ''
  if (membership.isPaused) return 'Paused'
  if (membership.inCall) return 'On Call'
  return 'Ready'
}

function formatStatus(status: AgentLoginStatus): string {
  const labels: Record<AgentLoginStatus, string> = {
    logged_out: 'Logged Out',
    logged_in: 'Logged In',
    paused: 'Paused',
    on_call: 'On Call',
  }
  return labels[status] || status
}

function getStatusIcon(status: AgentLoginStatus): string {
  const icons: Record<AgentLoginStatus, string> = {
    logged_out: 'OFF',
    logged_in: 'ON',
    paused: 'PAUSE',
    on_call: 'CALL',
  }
  return icons[status] || 'UNK'
}

function getStatusClass(status: AgentLoginStatus): string {
  return `status-${status.replace('_', '-')}`
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString()
}

function formatTimestamp(ts: number): string {
  if (ts === 0) return 'Never'
  return new Date(ts * 1000).toLocaleTimeString()
}

function updateStatus(): void {
  if (!session.queues.some((q) => q.isMember)) {
    session.status = 'logged_out'
  } else if (session.queues.some((q) => q.inCall)) {
    session.status = 'on_call'
  } else if (session.isPaused) {
    session.status = 'paused'
  } else {
    session.status = 'logged_in'
  }
}

function startSessionTimer(): void {
  if (sessionTimer) return
  sessionTimer = setInterval(() => {
    if (session.loginTime) {
      session.sessionDuration = Math.floor((Date.now() - session.loginTime.getTime()) / 1000)
    }
  }, 1000)
}

function stopSessionTimer(): void {
  if (sessionTimer) {
    clearInterval(sessionTimer)
    sessionTimer = null
  }
}

// Connection handlers
async function handleConnect() {
  connecting.value = true
  connectionError.value = ''

  try {
    // Simulate connection (in production, use actual AMI client)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Initialize agent session
    session.agentId = agentConfig.agentId
    session.interface = agentConfig.interface
    session.name = agentConfig.name || agentConfig.agentId

    amiConnected.value = true
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

async function handleDisconnect() {
  stopSessionTimer()
  session.queues = []
  session.loginTime = null
  session.sessionDuration = 0
  session.isPaused = false
  session.status = 'logged_out'
  amiConnected.value = false
}

// Queue handlers
async function handleLoginQueue(queue: string) {
  isLoading.value = true
  error.value = null

  try {
    // Simulate login (in production, use actual AMI client)
    await new Promise((resolve) => setTimeout(resolve, 500))

    session.queues.push({
      queue,
      interface: session.interface,
      isMember: true,
      isPaused: false,
      penalty: 0,
      callsTaken: 0,
      lastCall: 0,
      loginTime: Math.floor(Date.now() / 1000),
      inCall: false,
    })

    if (!session.loginTime) {
      session.loginTime = new Date()
      startSessionTimer()
    }

    updateStatus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to login to queue'
  } finally {
    isLoading.value = false
  }
}

async function handleLogoutQueue(queue: string) {
  isLoading.value = true
  error.value = null

  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const idx = session.queues.findIndex((q) => q.queue === queue)
    if (idx >= 0) {
      session.queues.splice(idx, 1)
    }

    if (!session.queues.some((q) => q.isMember)) {
      session.loginTime = null
      stopSessionTimer()
    }

    updateStatus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to logout from queue'
  } finally {
    isLoading.value = false
  }
}

async function handleLoginAll() {
  for (const queue of availableQueues.value) {
    if (!isLoggedIntoQueue(queue)) {
      await handleLoginQueue(queue)
    }
  }
}

async function handleLogoutAll() {
  for (const queue of [...loggedInQueues.value]) {
    await handleLogoutQueue(queue)
  }
}

// Pause handlers
async function handlePause() {
  if (!selectedPauseReason.value) return

  isLoading.value = true
  error.value = null

  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    session.isPaused = true
    session.pauseReason = selectedPauseReason.value

    for (const q of session.queues) {
      if (q.isMember) {
        q.isPaused = true
        q.pauseReason = selectedPauseReason.value
      }
    }

    updateStatus()
    selectedPauseReason.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to pause agent'
  } finally {
    isLoading.value = false
  }
}

async function handleUnpause() {
  isLoading.value = true
  error.value = null

  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    session.isPaused = false
    session.pauseReason = undefined

    for (const q of session.queues) {
      if (q.isMember) {
        q.isPaused = false
        q.pauseReason = undefined
      }
    }

    updateStatus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to unpause agent'
  } finally {
    isLoading.value = false
  }
}

// Cleanup
onUnmounted(() => {
  stopSessionTimer()
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
  color: #333;
}

.info-text {
  margin-bottom: 1.5rem;
  color: #666;
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
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group input:disabled,
.form-group select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}
.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-success {
  background: #10b981;
  color: white;
}
.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-danger {
  background: #ef4444;
  color: white;
}
.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}
.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 0.875rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f0f9ff;
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
  font-size: 0.875rem;
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
  background: #f9fafb;
  border-radius: 8px;
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
  background: #ef4444;
}

.status-dot.connected {
  background: #10b981;
}

.status-icon {
  font-size: 1.25rem;
}
.status-icon.on-shift {
  color: #10b981;
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
.membership-details {
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.session-info h3,
.queue-section h3,
.pause-section h3,
.membership-details h3 {
  margin-bottom: 1rem;
  color: #111827;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
}

.info-value {
  font-weight: 500;
  color: #111827;
}

/* Queue Section */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.queue-item.logged-in {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.queue-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.queue-name {
  font-weight: 500;
  color: #111827;
}

.queue-status {
  font-size: 0.75rem;
  color: #059669;
}

.queue-actions-bar {
  display: flex;
  gap: 1rem;
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
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.paused-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
}

.paused-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.paused-icon {
  font-size: 2rem;
}

.paused-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.paused-label {
  font-weight: 500;
  color: #92400e;
}

.paused-reason {
  font-size: 0.875rem;
  color: #b45309;
}

/* Membership Details */
.membership-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.membership-item {
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.membership-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.membership-queue {
  font-weight: 500;
  color: #111827;
}

.membership-status {
  padding: 0.25rem 0.75rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.membership-status.paused {
  background: #fef3c7;
  color: #92400e;
}

.membership-stats {
  display: flex;
  gap: 2rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.stat-value {
  font-weight: 500;
  color: #111827;
}

/* Status Colors */
.status-logged-out {
  color: #6b7280;
}
.status-logged-in {
  color: #10b981;
}
.status-paused {
  color: #f59e0b;
}
.status-on-call {
  color: #3b82f6;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .status-bar {
    flex-direction: column;
    gap: 1rem;
  }

  .status-items {
    flex-direction: column;
    gap: 0.5rem;
  }

  .queue-actions-bar {
    flex-direction: column;
  }

  .pause-form {
    flex-direction: column;
  }

  .membership-stats {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
