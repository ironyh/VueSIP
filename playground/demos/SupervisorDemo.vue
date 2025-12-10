<template>
  <div class="supervisor-demo">
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
    <div v-if="!isAmiConnected" class="config-panel">
      <h3>Supervisor Demo</h3>
      <p class="info-text">
        Monitor, whisper, and barge into active calls. This demo demonstrates
        call center supervisor features using Asterisk's ChanSpy application.
      </p>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <input
          id="ami-url"
          v-model="amiConfig.url"
          type="text"
          placeholder="ws://pbx.example.com:8080"
          :disabled="connecting"
        />
        <small>amiws WebSocket proxy URL</small>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!amiConfig.url || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect to AMI' }}
      </button>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>💡 Supervisor Features:</strong>
        <ul>
          <li><strong>Monitor:</strong> Silent listen to agent calls</li>
          <li><strong>Whisper:</strong> Speak to agent only (coaching)</li>
          <li><strong>Barge:</strong> Join the call and speak to both parties</li>
        </ul>
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-item">
          <span class="status-dot connected"></span>
          <span>AMI Connected</span>
        </div>
        <div class="status-item">
          <span>Active Calls: {{ callCount }}</span>
        </div>
        <div class="status-item">
          <span>Sessions: {{ sessionCount }}</span>
        </div>
        <button class="btn btn-sm btn-secondary" @click="handleRefresh" :disabled="loading">
          🔄 Refresh
        </button>
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">
          Disconnect
        </button>
      </div>

      <!-- Supervisor Extension -->
      <div class="supervisor-config">
        <h4>Supervisor Channel</h4>
        <p class="info-text">
          Enter your supervisor extension to use for monitoring/whisper/barge.
        </p>
        <div class="form-row">
          <input
            v-model="supervisorChannel"
            type="text"
            placeholder="SIP/supervisor or PJSIP/9000"
          />
          <small>Your supervisor phone will ring when you start a session</small>
        </div>
      </div>

      <!-- Active Supervision Sessions -->
      <div v-if="sessionList.length > 0" class="sessions-panel">
        <h4>Active Supervision Sessions</h4>
        <div class="sessions-list">
          <div
            v-for="session in sessionList"
            :key="session.id"
            class="session-card"
            :class="session.mode"
          >
            <div class="session-mode">
              <span class="mode-icon">{{ getModeIcon(session.mode) }}</span>
              <span class="mode-label">{{ getModeLabel(session.mode) }}</span>
            </div>
            <div class="session-info">
              <div class="session-target">Target: {{ session.targetChannel }}</div>
              <div class="session-supervisor">Your Channel: {{ session.supervisorChannel }}</div>
              <div class="session-time">Started: {{ formatTime(session.startTime) }}</div>
            </div>
            <div class="session-actions">
              <div class="mode-switcher">
                <button
                  v-if="session.mode !== 'monitor'"
                  class="btn btn-sm btn-monitor"
                  @click="handleSwitchMode(session.id, 'monitor')"
                  title="Switch to silent monitor"
                >
                  👁️
                </button>
                <button
                  v-if="session.mode !== 'whisper'"
                  class="btn btn-sm btn-whisper"
                  @click="handleSwitchMode(session.id, 'whisper')"
                  title="Switch to whisper"
                >
                  🗣️
                </button>
                <button
                  v-if="session.mode !== 'barge'"
                  class="btn btn-sm btn-barge"
                  @click="handleSwitchMode(session.id, 'barge')"
                  title="Switch to barge"
                >
                  📢
                </button>
              </div>
              <button
                class="btn btn-sm btn-danger"
                @click="handleEndSession(session.id)"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
        <button
          v-if="sessionList.length > 1"
          class="btn btn-secondary"
          @click="handleEndAllSessions"
        >
          End All Sessions
        </button>
      </div>

      <!-- Active Calls -->
      <div class="calls-panel">
        <h4>Active Calls</h4>

        <div v-if="loading" class="loading-state">
          Loading calls...
        </div>

        <div v-else-if="callList.length === 0" class="empty-state">
          <p>📭 No active calls</p>
          <p class="info-text">Waiting for calls to monitor...</p>
        </div>

        <div v-else class="calls-list">
          <div
            v-for="call in callList"
            :key="call.uniqueId"
            class="call-card"
            :class="{ supervised: isSupervising(call.channel) }"
          >
            <div class="call-info">
              <div class="call-parties">
                <span class="caller">{{ call.callerIdName || call.callerIdNum || 'Unknown' }}</span>
                <span class="arrow">↔</span>
                <span class="callee">{{ call.connectedLineName || call.connectedLineNum || 'Unknown' }}</span>
              </div>
              <div class="call-details">
                <span class="channel">{{ call.channel }}</span>
                <span class="duration">{{ formatDuration(call.duration) }}</span>
                <span class="state-badge" :class="getCallStateClass(call.state)">
                  {{ call.stateDesc }}
                </span>
              </div>
            </div>

            <div class="supervision-actions">
              <div v-if="isSupervising(call.channel)" class="supervised-badge">
                {{ getSessionMode(call.channel) }}
              </div>
              <div v-else-if="supervisorChannel" class="action-buttons">
                <button
                  class="btn btn-sm btn-monitor"
                  :disabled="!canSupervise"
                  @click="handleMonitor(call.channel)"
                  title="Silent listen"
                >
                  👁️ Monitor
                </button>
                <button
                  class="btn btn-sm btn-whisper"
                  :disabled="!canSupervise"
                  @click="handleWhisper(call.channel)"
                  title="Speak to agent only"
                >
                  🗣️ Whisper
                </button>
                <button
                  class="btn btn-sm btn-barge"
                  :disabled="!canSupervise"
                  @click="handleBarge(call.channel)"
                  title="Join the call"
                >
                  📢 Barge
                </button>
              </div>
              <div v-else class="hint">
                Enter supervisor channel to enable
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAmi, useAmiCalls, useAmiSupervisor, type SupervisionMode } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { ChannelState } from '../../src/types/ami.types'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Configuration
const amiConfig = ref({ url: '' })
const connecting = ref(false)
const connectionError = ref('')

// Supervisor
const supervisorChannel = ref('')
const error = ref('')

// AMI Client
const {
  connect: amiConnect,
  disconnect: amiDisconnect,
  isConnected: realIsAmiConnected,
  getClient,
} = useAmi()

// Composables
const callsComposable = ref<ReturnType<typeof useAmiCalls> | null>(null)
const supervisorComposable = ref<ReturnType<typeof useAmiSupervisor> | null>(null)

// Computed
const loading = computed(() => callsComposable.value?.loading.value ?? false)
const callList = computed(() => callsComposable.value?.callList.value ?? [])
const callCount = computed(() => callsComposable.value?.callCount.value ?? 0)
const sessionList = computed(() =>
  supervisorComposable.value
    ? Array.from(supervisorComposable.value.sessions.value.values())
    : []
)
const sessionCount = computed(() => supervisorComposable.value?.activeSessionCount.value ?? 0)
const canSupervise = computed(() => supervisorChannel.value.trim().length > 0)

// Helpers
const getModeIcon = (mode: SupervisionMode): string => {
  switch (mode) {
    case 'monitor': return '👁️'
    case 'whisper': return '🗣️'
    case 'barge': return '📢'
    default: return '❓'
  }
}

const getModeLabel = (mode: SupervisionMode): string => {
  switch (mode) {
    case 'monitor': return 'Monitoring'
    case 'whisper': return 'Whispering'
    case 'barge': return 'Barging'
    default: return 'Unknown'
  }
}

const getCallStateClass = (state: ChannelState): string => {
  switch (state) {
    case ChannelState.Up: return 'connected'
    case ChannelState.Ringing:
    case ChannelState.Ring: return 'ringing'
    default: return 'unknown'
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString()
}

const isSupervising = (channel: string): boolean => {
  return supervisorComposable.value?.isSupervising(channel) ?? false
}

const getSessionMode = (channel: string): string => {
  const session = supervisorComposable.value?.getSessionForChannel(channel)
  return session ? `${getModeIcon(session.mode)} ${getModeLabel(session.mode)}` : ''
}

// Handlers
async function handleConnect() {
  if (!amiConfig.value.url) return

  connecting.value = true
  connectionError.value = ''

  try {
    await amiConnect({ url: amiConfig.value.url })

    const client = getClient()
    if (client) {
      // Initialize calls composable
      callsComposable.value = useAmiCalls(client, {
        useEvents: true,
        channelFilter: (ch) => ch.channelState === ChannelState.Up, // Only connected calls
      })

      // Initialize supervisor composable
      supervisorComposable.value = useAmiSupervisor(client, {
        onSessionStart: (session) => {
          console.log(`Supervision started: ${session.mode} on ${session.targetChannel}`)
        },
        onSessionEnd: (session) => {
          console.log(`Supervision ended: ${session.id}`)
        },
      })

      // Initial refresh
      await callsComposable.value.refresh()
    }

    localStorage.setItem('vuesip-ami-url', amiConfig.value.url)
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

function handleDisconnect() {
  amiDisconnect()
  callsComposable.value = null
  supervisorComposable.value = null
}

async function handleRefresh() {
  await callsComposable.value?.refresh()
}

async function handleMonitor(targetChannel: string) {
  if (!supervisorComposable.value || !supervisorChannel.value) return

  error.value = ''
  try {
    await supervisorComposable.value.monitor(supervisorChannel.value, targetChannel)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Monitor failed'
  }
}

async function handleWhisper(targetChannel: string) {
  if (!supervisorComposable.value || !supervisorChannel.value) return

  error.value = ''
  try {
    await supervisorComposable.value.whisper(supervisorChannel.value, targetChannel)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Whisper failed'
  }
}

async function handleBarge(targetChannel: string) {
  if (!supervisorComposable.value || !supervisorChannel.value) return

  error.value = ''
  try {
    await supervisorComposable.value.barge(supervisorChannel.value, targetChannel)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Barge failed'
  }
}

async function handleEndSession(sessionId: string) {
  if (!supervisorComposable.value) return

  try {
    await supervisorComposable.value.endSession(sessionId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'End session failed'
  }
}

async function handleSwitchMode(sessionId: string, newMode: SupervisionMode) {
  if (!supervisorComposable.value) return

  error.value = ''
  try {
    await supervisorComposable.value.switchMode(sessionId, newMode)
    console.log(`Switched session ${sessionId} to ${newMode} mode`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Switch mode failed'
  }
}

async function handleEndAllSessions() {
  if (!supervisorComposable.value) return

  try {
    await supervisorComposable.value.endAllSessions()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'End all sessions failed'
  }
}

// Load saved settings
onMounted(() => {
  const savedUrl = localStorage.getItem('vuesip-ami-url')
  if (savedUrl) {
    amiConfig.value.url = savedUrl
  }

  const savedChannel = localStorage.getItem('vuesip-supervisor-channel')
  if (savedChannel) {
    supervisorChannel.value = savedChannel
  }
})

// Save supervisor channel
watch(supervisorChannel, (value) => {
  if (value.trim()) {
    localStorage.setItem('vuesip-supervisor-channel', value)
  }
})
</script>

<style scoped>
.supervisor-demo {
  max-width: 1000px;
  margin: 0 auto;
}

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

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #667eea; color: white; }
.btn-primary:hover:not(:disabled) { background: #5568d3; }
.btn-secondary { background: #6b7280; color: white; }
.btn-secondary:hover:not(:disabled) { background: #4b5563; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }

.btn-monitor { background: #3b82f6; color: white; }
.btn-monitor:hover:not(:disabled) { background: #2563eb; }
.btn-whisper { background: #f59e0b; color: white; }
.btn-whisper:hover:not(:disabled) { background: #d97706; }
.btn-barge { background: #ef4444; color: white; }
.btn-barge:hover:not(:disabled) { background: #dc2626; }

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

.demo-tip ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

.demo-tip li {
  margin-bottom: 0.25rem;
}

/* Connected Interface */
.connected-interface {
  padding: 2rem;
}

.status-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 2rem;
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

/* Supervisor Config */
.supervisor-config {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.supervisor-config h4 {
  margin-bottom: 0.5rem;
  color: #111827;
}

/* Sessions Panel */
.sessions-panel {
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.sessions-panel h4 {
  margin-bottom: 1rem;
  color: #92400e;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.session-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 6px;
  border-left: 4px solid #f59e0b;
}

.session-card.monitor { border-left-color: #3b82f6; }
.session-card.whisper { border-left-color: #f59e0b; }
.session-card.barge { border-left-color: #ef4444; }

.session-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 80px;
}

.mode-icon {
  font-size: 1.5rem;
}

.mode-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.session-info {
  flex: 1;
}

.session-target {
  font-weight: 500;
  color: #111827;
}

.session-supervisor,
.session-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.session-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.mode-switcher {
  display: flex;
  gap: 0.25rem;
}

.mode-switcher .btn {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

/* Calls Panel */
.calls-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.calls-panel h4 {
  margin-bottom: 1rem;
  color: #111827;
}

.loading-state,
.empty-state {
  padding: 2rem;
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  color: #6b7280;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.call-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  border-left: 4px solid #e5e7eb;
}

.call-card.supervised {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.call-info {
  flex: 1;
}

.call-parties {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.5rem;
}

.arrow {
  color: #6b7280;
}

.call-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.state-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.state-badge.connected { background: #d1fae5; color: #065f46; }
.state-badge.ringing { background: #dbeafe; color: #1e40af; }
.state-badge.unknown { background: #e5e7eb; color: #374151; }

.supervision-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.supervised-badge {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.hint {
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .status-bar {
    flex-direction: column;
  }

  .call-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .supervision-actions {
    width: 100%;
    align-items: flex-start;
  }

  .action-buttons {
    width: 100%;
    justify-content: flex-start;
  }

  .session-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
