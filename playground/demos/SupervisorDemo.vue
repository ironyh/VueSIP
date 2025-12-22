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
        Monitor, whisper, and barge into active calls. This demo demonstrates call center supervisor
        features using Asterisk's ChanSpy application.
      </p>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <InputText
          id="ami-url"
          v-model="amiConfig.url"
          placeholder="ws://pbx.example.com:8080"
          :disabled="connecting"
          class="w-full"
        />
        <small>amiws WebSocket proxy URL</small>
      </div>

      <Button
        :label="connecting ? 'Connecting...' : 'Connect to AMI'"
        :disabled="!amiConfig.url || connecting"
        @click="handleConnect"
      />

      <Message v-if="connectionError" severity="error" class="mt-2">
        {{ connectionError }}
      </Message>

      <div class="demo-tip">
        <strong>Supervisor Features:</strong>
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
        <Button
          label="Refresh"
          severity="secondary"
          size="small"
          @click="handleRefresh"
          :disabled="loading"
        />
        <Button label="Disconnect" severity="secondary" size="small" @click="handleDisconnect" />
      </div>

      <!-- Supervisor Extension -->
      <div class="supervisor-config">
        <h4>Supervisor Channel</h4>
        <p class="info-text">
          Enter your supervisor extension to use for monitoring/whisper/barge.
        </p>
        <div class="form-row">
          <InputText
            v-model="supervisorChannel"
            placeholder="SIP/supervisor or PJSIP/9000"
            class="w-full"
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
              <span class="mode-label">{{ getModeLabel(session.mode) }}</span>
            </div>
            <div class="session-info">
              <div class="session-target">Target: {{ session.targetChannel }}</div>
              <div class="session-supervisor">Your Channel: {{ session.supervisorChannel }}</div>
              <div class="session-time">Started: {{ formatTime(session.startTime) }}</div>
            </div>
            <div class="session-actions">
              <div class="mode-switcher">
                <Button
                  v-if="session.mode !== 'monitor'"
                  label="Monitor"
                  size="small"
                  class="btn-monitor"
                  @click="handleSwitchMode(session.id, 'monitor')"
                  title="Switch to silent monitor"
                />
                <Button
                  v-if="session.mode !== 'whisper'"
                  label="Whisper"
                  size="small"
                  class="btn-whisper"
                  @click="handleSwitchMode(session.id, 'whisper')"
                  title="Switch to whisper"
                />
                <Button
                  v-if="session.mode !== 'barge'"
                  label="Barge"
                  size="small"
                  class="btn-barge"
                  @click="handleSwitchMode(session.id, 'barge')"
                  title="Switch to barge"
                />
              </div>
              <Button
                label="End Session"
                severity="danger"
                size="small"
                @click="handleEndSession(session.id)"
              />
            </div>
          </div>
        </div>
        <Button
          v-if="sessionList.length > 1"
          label="End All Sessions"
          severity="secondary"
          @click="handleEndAllSessions"
        />
      </div>

      <!-- Active Calls -->
      <div class="calls-panel">
        <h4>Active Calls</h4>

        <div v-if="loading" class="loading-state">Loading calls...</div>

        <div v-else-if="callList.length === 0" class="empty-state">
          <p>No active calls</p>
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
                <span class="callee">{{
                  call.connectedLineName || call.connectedLineNum || 'Unknown'
                }}</span>
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
                <Button
                  label="Monitor"
                  size="small"
                  class="btn-monitor"
                  :disabled="!canSupervise"
                  @click="handleMonitor(call.channel)"
                  title="Silent listen"
                />
                <Button
                  label="Whisper"
                  size="small"
                  class="btn-whisper"
                  :disabled="!canSupervise"
                  @click="handleWhisper(call.channel)"
                  title="Speak to agent only"
                />
                <Button
                  label="Barge"
                  size="small"
                  class="btn-barge"
                  :disabled="!canSupervise"
                  @click="handleBarge(call.channel)"
                  title="Join the call"
                />
              </div>
              <div v-else class="hint">Enter supervisor channel to enable</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <Message v-if="error" severity="error" class="mt-2">
        {{ error }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAmi, useAmiCalls, useAmiSupervisor, type SupervisionMode } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { ChannelState } from '../../src/types/ami.types'
import { Button, InputText, Message } from './shared-components'

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
  isConnected: _realIsAmiConnected,
  getClient,
} = useAmi()

// Composables
const callsComposable = ref<ReturnType<typeof useAmiCalls> | null>(null)
const supervisorComposable = ref<ReturnType<typeof useAmiSupervisor> | null>(null)

// Computed
const isAmiConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : _realIsAmiConnected.value
)
const loading = computed(() => callsComposable.value?.loading.value ?? false)
const callList = computed(() => callsComposable.value?.callList.value ?? [])
const callCount = computed(() => callsComposable.value?.callCount.value ?? 0)
const sessionList = computed(() =>
  supervisorComposable.value ? Array.from(supervisorComposable.value.sessions.value.values()) : []
)
const sessionCount = computed(() => supervisorComposable.value?.activeSessionCount.value ?? 0)
const canSupervise = computed(() => supervisorChannel.value.trim().length > 0)

// Helpers
const getModeLabel = (mode: SupervisionMode): string => {
  switch (mode) {
    case 'monitor':
      return 'Monitoring'
    case 'whisper':
      return 'Whispering'
    case 'barge':
      return 'Barging'
    default:
      return 'Unknown'
  }
}

const getCallStateClass = (state: ChannelState): string => {
  switch (state) {
    case ChannelState.Up:
      return 'connected'
    case ChannelState.Ringing:
    case ChannelState.Ring:
      return 'ringing'
    default:
      return 'unknown'
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
  return session ? getModeLabel(session.mode) : ''
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
  color: var(--vuesip-text-primary);
}

.info-text {
  margin-bottom: 1.5rem;
  color: var(--vuesip-text-secondary);
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
  color: var(--vuesip-text-primary);
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--vuesip-text-tertiary);
  font-size: 0.75rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Custom button styling for PrimeVue Button components */
:deep(.btn-monitor) {
  background: var(--vuesip-info);
  border-color: var(--vuesip-info);
}
:deep(.btn-monitor:hover:not(:disabled)) {
  background: var(--vuesip-info-dark);
  border-color: var(--vuesip-info-dark);
}
:deep(.btn-whisper) {
  background: var(--vuesip-warning);
  border-color: var(--vuesip-warning);
}
:deep(.btn-whisper:hover:not(:disabled)) {
  background: var(--vuesip-warning-dark);
  border-color: var(--vuesip-warning-dark);
}
:deep(.btn-barge) {
  background: var(--vuesip-danger);
  border-color: var(--vuesip-danger);
}
:deep(.btn-barge:hover:not(:disabled)) {
  background: var(--vuesip-danger-dark);
  border-color: var(--vuesip-danger-dark);
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--vuesip-info-light);
  border-left: 4px solid var(--vuesip-info);
  border-radius: var(--vuesip-border-radius);
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
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius-lg);
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
  background: var(--vuesip-danger);
}

.status-dot.connected {
  background: var(--vuesip-success);
}

/* Supervisor Config */
.supervisor-config {
  background: var(--vuesip-bg-primary);
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.supervisor-config h4 {
  margin-bottom: 0.5rem;
  color: var(--vuesip-text-primary);
}

/* Sessions Panel */
.sessions-panel {
  background: var(--vuesip-warning-light);
  border: 1px solid #fbbf24;
  border-radius: var(--vuesip-border-radius-lg);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.sessions-panel h4 {
  margin-bottom: 1rem;
  color: var(--vuesip-warning-dark);
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
  background: var(--vuesip-bg-primary);
  border-radius: var(--vuesip-border-radius);
  border-left: 4px solid var(--vuesip-warning);
}

.session-card.monitor {
  border-left-color: var(--vuesip-info);
}
.session-card.whisper {
  border-left-color: var(--vuesip-warning);
}
.session-card.barge {
  border-left-color: var(--vuesip-danger);
}

.session-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 80px;
}

.mode-label {
  font-size: 1rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  background: rgba(102, 126, 234, 0.1);
  border-radius: var(--vuesip-border-radius);
}

.session-info {
  flex: 1;
}

.session-target {
  font-weight: 500;
  color: var(--vuesip-text-primary);
}

.session-supervisor,
.session-time {
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
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

.mode-switcher :deep(.p-button) {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

/* Calls Panel */
.calls-panel {
  background: var(--vuesip-bg-primary);
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
  padding: 1.5rem;
}

.calls-panel h4 {
  margin-bottom: 1rem;
  color: var(--vuesip-text-primary);
}

.loading-state,
.empty-state {
  padding: 2rem;
  text-align: center;
  background: var(--vuesip-bg-secondary);
  border: 1px dashed var(--vuesip-border);
  border-radius: var(--vuesip-border-radius);
  color: var(--vuesip-text-tertiary);
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
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius);
  border-left: 4px solid var(--vuesip-border);
}

.call-card.supervised {
  border-left-color: var(--vuesip-info);
  background: var(--surface-ground);
}

.call-info {
  flex: 1;
}

.call-parties {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--vuesip-text-primary);
  margin-bottom: 0.5rem;
}

.arrow {
  color: var(--vuesip-text-tertiary);
}

.call-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
}

.state-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--vuesip-border-radius);
  font-weight: 500;
}

.state-badge.connected {
  background: var(--vuesip-success-light);
  color: var(--vuesip-success-dark);
}
.state-badge.ringing {
  background: var(--vuesip-info-light);
  color: var(--vuesip-info-dark);
}
.state-badge.unknown {
  background: var(--vuesip-border);
  color: var(--vuesip-text-primary);
}

.supervision-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.supervised-badge {
  padding: 0.5rem 1rem;
  background: var(--vuesip-info);
  color: var(--surface-0);
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
  color: var(--vuesip-text-tertiary);
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

/* Utility Classes */
.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}
</style>
