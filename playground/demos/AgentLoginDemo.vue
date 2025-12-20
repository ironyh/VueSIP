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
    <Card v-if="!amiConnected" class="demo-card config-card">
      <template #title>
        <div class="demo-header">
          <i class="pi pi-sitemap" style="font-size: 1.5rem; color: var(--primary-500)"></i>
          <span>AMI Server Configuration</span>
        </div>
      </template>
      <template #content>
        <Message severity="info" :closable="false" class="config-message">
          Configure your AMI WebSocket connection to test agent queue login/logout functionality. This
          demo allows agents to log in/out of queues, pause/unpause, and track session metrics.
        </Message>

        <div class="form-grid">
          <div class="form-field">
            <label for="ami-url">AMI WebSocket URL</label>
            <InputText
              id="ami-url"
              v-model="config.url"
              placeholder="ws://pbx.example.com:8080/ami"
              :disabled="connecting"
              class="w-full"
            />
            <small class="field-hint">Example: ws://your-pbx:8080/ami</small>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="ami-username">
                Username <small class="optional-label">(optional)</small>
              </label>
              <InputText
                id="ami-username"
                v-model="config.username"
                placeholder="admin"
                :disabled="connecting"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="ami-password">
                Password <small class="optional-label">(optional)</small>
              </label>
              <Password
                id="ami-password"
                v-model="config.password"
                placeholder="Enter password"
                :disabled="connecting"
                :feedback="false"
                toggle-mask
                class="w-full"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="agent-id">Agent ID</label>
              <InputText
                id="agent-id"
                v-model="agentConfig.agentId"
                placeholder="agent1001"
                :disabled="connecting"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="agent-interface">Agent Interface</label>
              <InputText
                id="agent-interface"
                v-model="agentConfig.interface"
                placeholder="PJSIP/1001"
                :disabled="connecting"
                class="w-full"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="agent-name">
              Agent Name <small class="optional-label">(Optional)</small>
            </label>
            <InputText
              id="agent-name"
              v-model="agentConfig.name"
              placeholder="John Doe"
              :disabled="connecting"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="available-queues">Available Queues (comma-separated)</label>
            <InputText
              id="available-queues"
              v-model="queuesInput"
              placeholder="sales,support,billing"
              :disabled="connecting"
              class="w-full"
            />
            <small class="field-hint">Enter the queues the agent can log into</small>
          </div>

          <Button
            label="Connect to AMI"
            icon="pi pi-plug"
            :loading="connecting"
            :disabled="!isConfigValid"
            @click="handleConnect"
            class="w-full"
          />

          <Message v-if="connectionError" severity="error" :closable="false">
            {{ connectionError }}
          </Message>

          <Message severity="info" :closable="false" class="demo-tip">
            <strong>Tip:</strong> This demo requires an AMI WebSocket proxy. Make sure your Asterisk
            server has the AMI interface configured and a WebSocket proxy is running.
          </Message>
        </div>
      </template>
    </Card>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Toolbar -->
      <Card class="demo-card status-card">
        <template #content>
          <div class="status-toolbar">
            <div class="status-items">
              <div class="status-item">
                <span class="status-indicator connected"></span>
                <span>AMI Connected</span>
              </div>
              <Divider layout="vertical" />
              <div class="status-item">
                <Tag :value="formatStatus(status)" :severity="getStatusSeverity(status)" />
              </div>
              <Divider layout="vertical" v-if="isOnShift !== undefined" />
              <div v-if="isOnShift !== undefined" class="status-item">
                <Tag
                  :value="isOnShift ? 'On Shift' : 'Off Shift'"
                  :severity="isOnShift ? 'success' : 'secondary'"
                />
              </div>
            </div>
            <div class="status-actions">
              <Button
                label="Disconnect"
                icon="pi pi-times"
                severity="danger"
                size="small"
                @click="handleDisconnect"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Agent Panel -->
      <div class="agent-panels">
        <!-- Session Info -->
        <Card class="demo-card session-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-user" style="color: var(--primary-500)"></i>
              <span>Agent Session</span>
            </div>
          </template>
          <template #content>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Agent ID</span>
                <span class="info-value">{{ session.agentId }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Interface</span>
                <span class="info-value">{{ session.interface }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Session Duration</span>
                <span class="info-value session-duration">{{ sessionDurationFormatted }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Calls Handled</span>
                <span class="info-value">{{ session.totalCallsHandled }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Login Time</span>
                <span class="info-value">
                  {{ session.loginTime ? formatDateTime(session.loginTime) : 'Not logged in' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <Tag :value="formatStatus(status)" :severity="getStatusSeverity(status)" />
              </div>
            </div>
          </template>
        </Card>

        <!-- Queue Management -->
        <Card class="demo-card queue-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-list" style="color: var(--primary-500)"></i>
              <span>Queue Management</span>
            </div>
          </template>
          <template #content>
            <div class="queue-list">
              <div
                v-for="queue in availableQueues"
                :key="queue"
                class="queue-item"
                :class="{ 'logged-in': isLoggedIntoQueue(queue) }"
              >
                <div class="queue-info">
                  <span class="queue-name">{{ queue }}</span>
                  <Tag
                    v-if="isLoggedIntoQueue(queue)"
                    :value="getQueueStatusText(queue)"
                    :severity="getQueueStatusSeverity(queue)"
                    size="small"
                  />
                </div>
                <div class="queue-actions">
                  <Button
                    v-if="!isLoggedIntoQueue(queue)"
                    label="Login"
                    icon="pi pi-sign-in"
                    severity="success"
                    size="small"
                    :loading="isLoading"
                    @click="handleLoginQueue(queue)"
                  />
                  <Button
                    v-else
                    label="Logout"
                    icon="pi pi-sign-out"
                    severity="danger"
                    size="small"
                    :loading="isLoading"
                    @click="handleLogoutQueue(queue)"
                  />
                </div>
              </div>
            </div>

            <Divider />

            <div class="queue-actions-bar">
              <Button
                label="Login to All"
                icon="pi pi-sign-in"
                :loading="isLoading"
                :disabled="loggedInQueues.length === availableQueues.length"
                @click="handleLoginAll"
              />
              <Button
                label="Logout from All"
                icon="pi pi-sign-out"
                severity="danger"
                :loading="isLoading"
                :disabled="loggedInQueues.length === 0"
                @click="handleLogoutAll"
              />
            </div>
          </template>
        </Card>

        <!-- Pause Management -->
        <Card class="demo-card pause-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-pause" style="color: var(--primary-500)"></i>
              <span>Pause Management</span>
            </div>
          </template>
          <template #content>
            <div v-if="!isPaused" class="pause-form">
              <div class="form-field">
                <label for="pause-reason">Pause Reason</label>
                <Dropdown
                  id="pause-reason"
                  v-model="selectedPauseReason"
                  :options="pauseReasons"
                  placeholder="Select a reason..."
                  :disabled="!isLoggedIn || isLoading"
                  class="w-full"
                />
              </div>
              <Button
                label="Pause Agent"
                icon="pi pi-pause"
                severity="warning"
                :disabled="!isLoggedIn || !selectedPauseReason || isLoading"
                :loading="isLoading"
                @click="handlePause"
                class="w-full"
              />
            </div>

            <div v-else class="paused-state">
              <div class="paused-info">
                <i class="pi pi-pause-circle paused-icon"></i>
                <div class="paused-details">
                  <span class="paused-label">Currently Paused</span>
                  <span class="paused-reason">{{ session.pauseReason || 'No reason' }}</span>
                </div>
              </div>
              <Button
                label="Unpause Agent"
                icon="pi pi-play"
                severity="success"
                :loading="isLoading"
                @click="handleUnpause"
              />
            </div>
          </template>
        </Card>

        <!-- Queue Memberships -->
        <Card v-if="loggedInQueues.length > 0" class="demo-card membership-card">
          <template #title>
            <div class="section-header">
              <i class="pi pi-users" style="color: var(--primary-500)"></i>
              <span>Queue Memberships ({{ loggedInQueues.length }})</span>
            </div>
          </template>
          <template #content>
            <div class="membership-list">
              <Card
                v-for="membership in session.queues.filter((q) => q.isMember)"
                :key="membership.queue"
                class="membership-item"
              >
                <template #title>
                  <div class="membership-header">
                    <span class="membership-queue">{{ membership.queue }}</span>
                    <Tag
                      :value="
                        membership.isPaused
                          ? 'Paused'
                          : membership.inCall
                            ? 'On Call'
                            : 'Ready'
                      "
                      :severity="
                        membership.isPaused
                          ? 'warning'
                          : membership.inCall
                            ? 'info'
                            : 'success'
                      "
                    />
                  </div>
                </template>
                <template #content>
                  <div class="membership-stats">
                    <div class="stat">
                      <span class="stat-label">Calls Taken</span>
                      <span class="stat-value">{{ membership.callsTaken }}</span>
                    </div>
                    <div class="stat">
                      <span class="stat-label">Penalty</span>
                      <span class="stat-value">{{ membership.penalty }}</span>
                    </div>
                    <div class="stat">
                      <span class="stat-label">Last Call</span>
                      <span class="stat-value">
                        {{ membership.lastCall ? formatTimestamp(membership.lastCall) : 'Never' }}
                      </span>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </template>
        </Card>

        <!-- Error Display -->
        <Message v-if="error" severity="error" :closable="true" @close="error = null">
          {{ error }}
        </Message>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, reactive } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
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

function getQueueStatusSeverity(
  queue: string
): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
  const membership = session.queues.find((q) => q.queue === queue)
  if (!membership) return 'secondary'
  if (membership.isPaused) return 'warning'
  if (membership.inCall) return 'info'
  return 'success'
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

function getStatusSeverity(
  status: AgentLoginStatus
): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
  const severities: Record<AgentLoginStatus, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
    logged_out: 'secondary',
    logged_in: 'success',
    paused: 'warning',
    on_call: 'info',
  }
  return severities[status] || 'secondary'
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
  max-width: 1000px;
  margin: 0 auto;
}

/* Demo Card */
.demo-card {
  margin: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

/* Configuration Card */
.config-card {
  max-width: 700px;
  margin: 2rem auto;
}

.config-message {
  margin-bottom: 1.5rem;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 500;
  color: var(--text-color);
}

.optional-label {
  font-weight: 400;
  color: var(--text-color-secondary);
}

.field-hint {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.demo-tip {
  margin-top: 0.5rem;
}

/* Status Toolbar */
.status-card {
  margin-bottom: 1.5rem;
}

.status-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.status-items {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--red-500);
}

.status-indicator.connected {
  background: var(--green-500);
}

.status-actions {
  display: flex;
  gap: 0.5rem;
}

/* Agent Panels */
.agent-panels {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Session Info */
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
  color: var(--text-color-secondary);
  text-transform: uppercase;
  font-weight: 500;
}

.info-value {
  font-weight: 600;
  color: var(--text-color);
}

.session-duration {
  font-family: monospace;
  font-size: 1.125rem;
  color: var(--primary-500);
}

/* Queue Management */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  transition: all 0.2s;
}

.queue-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.queue-item.logged-in {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: var(--green-400);
}

.queue-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.queue-name {
  font-weight: 600;
  color: var(--text-color);
}

.queue-actions-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Pause Management */
.pause-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.paused-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid var(--yellow-400);
  border-radius: 8px;
  gap: 1rem;
}

.paused-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.paused-icon {
  font-size: 2rem;
  color: var(--yellow-700);
}

.paused-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.paused-label {
  font-weight: 600;
  color: var(--yellow-900);
}

.paused-reason {
  font-size: 0.875rem;
  color: var(--yellow-800);
}

/* Membership Details */
.membership-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.membership-item {
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.membership-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.membership-queue {
  font-weight: 600;
  color: var(--text-color);
}

.membership-stats {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  font-weight: 500;
}

.stat-value {
  font-weight: 600;
  color: var(--text-color);
}

/* Responsive */
@media (max-width: 768px) {
  .demo-card {
    margin: 1rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .status-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .queue-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .queue-actions-bar {
    flex-direction: column;
  }

  .queue-actions-bar .p-button {
    width: 100%;
  }

  .paused-state {
    flex-direction: column;
    align-items: flex-start;
  }

  .paused-state .p-button {
    width: 100%;
  }

  .membership-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
