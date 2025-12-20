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
    <Panel v-if="!isAmiConnected" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-users"></i>
          <span class="font-semibold text-xl">Supervisor Demo</span>
        </div>
      </template>
      <p class="text-500 mb-4 line-height-3">
        Monitor, whisper, and barge into active calls. This demo demonstrates call center supervisor
        features using Asterisk's ChanSpy application.
      </p>

      <div class="mb-4">
        <label for="ami-url" class="block text-sm font-medium mb-2">AMI WebSocket URL</label>
        <InputText
          id="ami-url"
          v-model="amiConfig.url"
          type="text"
          placeholder="ws://pbx.example.com:8080"
          :disabled="connecting"
          class="w-full"
        />
        <small class="text-500 block mt-1">amiws WebSocket proxy URL</small>
      </div>

      <Button
        :label="connecting ? 'Connecting...' : 'Connect to AMI'"
        icon="pi pi-link"
        :disabled="!amiConfig.url || connecting"
        :loading="connecting"
        @click="handleConnect"
      />

      <Message v-if="connectionError" severity="error" :closable="false" class="mt-3">
        {{ connectionError }}
      </Message>

      <Message severity="info" :closable="false" class="mt-4">
        <template #icon><i class="pi pi-info-circle"></i></template>
        <div>
          <strong>Supervisor Features:</strong>
          <ul class="mt-2 ml-4 pl-0">
            <li><strong>Monitor:</strong> Silent listen to agent calls</li>
            <li><strong>Whisper:</strong> Speak to agent only (coaching)</li>
            <li><strong>Barge:</strong> Join the call and speak to both parties</li>
          </ul>
        </div>
      </Message>
    </Panel>

    <!-- Connected Interface -->
    <div v-else>
      <!-- Status Bar -->
      <div class="flex flex-wrap align-items-center gap-3 mb-4">
        <Tag severity="success" class="px-3 py-2">
          <i class="pi pi-check-circle mr-2"></i>
          AMI Connected
        </Tag>
        <Tag severity="info" class="px-3 py-2">
          <i class="pi pi-phone mr-2"></i>
          Active Calls: {{ callCount }}
        </Tag>
        <Tag severity="secondary" class="px-3 py-2">
          <i class="pi pi-eye mr-2"></i>
          Sessions: {{ sessionCount }}
        </Tag>
        <div class="flex gap-2 ml-auto">
          <Button label="Refresh" icon="pi pi-refresh" severity="secondary" size="small" :loading="loading" @click="handleRefresh" />
          <Button label="Disconnect" icon="pi pi-power-off" severity="danger" size="small" @click="handleDisconnect" />
        </div>
      </div>

      <!-- Supervisor Extension -->
      <Panel class="mb-4">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-headphones"></i>
            <span class="font-semibold">Supervisor Channel</span>
          </div>
        </template>
        <p class="text-500 text-sm mb-3">
          Enter your supervisor extension to use for monitoring/whisper/barge.
        </p>
        <div class="flex flex-column gap-2" style="max-width: 400px">
          <InputText
            v-model="supervisorChannel"
            placeholder="SIP/supervisor or PJSIP/9000"
            class="w-full"
          />
          <small class="text-500">Your supervisor phone will ring when you start a session</small>
        </div>
      </Panel>

      <!-- Active Supervision Sessions -->
      <Panel v-if="sessionList.length > 0" class="mb-4 surface-warning-subtle">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-eye"></i>
            <span class="font-semibold">Active Supervision Sessions</span>
            <Tag severity="warn" class="ml-2">{{ sessionList.length }}</Tag>
          </div>
        </template>
        <div class="flex flex-column gap-3">
          <Card v-for="session in sessionList" :key="session.id" class="session-card" :class="session.mode">
            <template #content>
              <div class="flex flex-wrap align-items-center gap-4">
                <Tag :severity="getModeSeverity(session.mode)" class="px-3 py-2">
                  {{ getModeLabel(session.mode) }}
                </Tag>
                <div class="flex-1">
                  <div class="font-medium mb-1">Target: <code class="text-primary">{{ session.targetChannel }}</code></div>
                  <div class="text-sm text-500">Your Channel: {{ session.supervisorChannel }}</div>
                  <div class="text-sm text-500">Started: {{ formatTime(session.startTime) }}</div>
                </div>
                <div class="flex flex-column gap-2 align-items-end">
                  <div class="flex gap-1">
                    <Button
                      v-if="session.mode !== 'monitor'"
                      label="Monitor"
                      icon="pi pi-eye"
                      severity="info"
                      size="small"
                      @click="handleSwitchMode(session.id, 'monitor')"
                      v-tooltip.top="'Switch to silent monitor'"
                    />
                    <Button
                      v-if="session.mode !== 'whisper'"
                      label="Whisper"
                      icon="pi pi-volume-up"
                      severity="warn"
                      size="small"
                      @click="handleSwitchMode(session.id, 'whisper')"
                      v-tooltip.top="'Switch to whisper'"
                    />
                    <Button
                      v-if="session.mode !== 'barge'"
                      label="Barge"
                      icon="pi pi-sign-in"
                      severity="danger"
                      size="small"
                      @click="handleSwitchMode(session.id, 'barge')"
                      v-tooltip.top="'Switch to barge'"
                    />
                  </div>
                  <Button label="End Session" icon="pi pi-times" severity="danger" size="small" outlined @click="handleEndSession(session.id)" />
                </div>
              </div>
            </template>
          </Card>
        </div>
        <Button
          v-if="sessionList.length > 1"
          label="End All Sessions"
          icon="pi pi-times-circle"
          severity="danger"
          outlined
          class="mt-3"
          @click="handleEndAllSessions"
        />
      </Panel>

      <!-- Active Calls -->
      <Panel class="mb-4">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-phone"></i>
            <span class="font-semibold">Active Calls</span>
          </div>
        </template>

        <div v-if="loading" class="flex align-items-center justify-content-center p-5">
          <i class="pi pi-spin pi-spinner text-3xl text-500"></i>
          <span class="ml-3 text-500">Loading calls...</span>
        </div>

        <div v-else-if="callList.length === 0" class="text-center p-5 surface-ground border-round">
          <i class="pi pi-phone-slash text-4xl text-500 mb-3"></i>
          <p class="text-lg font-medium m-0">No active calls</p>
          <p class="text-500 text-sm mt-2">Waiting for calls to monitor...</p>
        </div>

        <div v-else class="flex flex-column gap-3">
          <Card
            v-for="call in callList"
            :key="call.uniqueId"
            :class="{ 'border-left-3 border-primary': isSupervising(call.channel) }"
          >
            <template #content>
              <div class="flex flex-wrap align-items-center gap-4">
                <div class="flex-1">
                  <div class="flex align-items-center gap-2 mb-2">
                    <span class="font-medium">{{ call.callerIdName || call.callerIdNum || 'Unknown' }}</span>
                    <i class="pi pi-arrows-h text-500"></i>
                    <span class="font-medium">{{ call.connectedLineName || call.connectedLineNum || 'Unknown' }}</span>
                  </div>
                  <div class="flex flex-wrap align-items-center gap-3 text-sm">
                    <code class="text-500">{{ call.channel }}</code>
                    <Tag severity="secondary">{{ formatDuration(call.duration) }}</Tag>
                    <Tag :severity="getCallStateSeverity(call.state)">{{ call.stateDesc }}</Tag>
                  </div>
                </div>

                <div class="flex align-items-center gap-2">
                  <Tag v-if="isSupervising(call.channel)" severity="info" class="px-3 py-2">
                    <i class="pi pi-eye mr-2"></i>
                    {{ getSessionMode(call.channel) }}
                  </Tag>
                  <template v-else-if="supervisorChannel">
                    <Button
                      label="Monitor"
                      icon="pi pi-eye"
                      severity="info"
                      size="small"
                      :disabled="!canSupervise"
                      @click="handleMonitor(call.channel)"
                      v-tooltip.top="'Silent listen'"
                    />
                    <Button
                      label="Whisper"
                      icon="pi pi-volume-up"
                      severity="warn"
                      size="small"
                      :disabled="!canSupervise"
                      @click="handleWhisper(call.channel)"
                      v-tooltip.top="'Speak to agent only'"
                    />
                    <Button
                      label="Barge"
                      icon="pi pi-sign-in"
                      severity="danger"
                      size="small"
                      :disabled="!canSupervise"
                      @click="handleBarge(call.channel)"
                      v-tooltip.top="'Join the call'"
                    />
                  </template>
                  <span v-else class="text-sm text-500 font-italic">Enter supervisor channel to enable</span>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </Panel>

      <!-- Error Display -->
      <Message v-if="error" severity="error" :closable="true" @close="error = ''" class="mb-4">
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

// PrimeVue components
import Panel from 'primevue/panel'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

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

const getModeSeverity = (mode: SupervisionMode): 'info' | 'warn' | 'danger' => {
  switch (mode) {
    case 'monitor':
      return 'info'
    case 'whisper':
      return 'warn'
    case 'barge':
      return 'danger'
    default:
      return 'info'
  }
}

const getCallStateSeverity = (state: ChannelState): 'success' | 'info' | 'secondary' => {
  switch (state) {
    case ChannelState.Up:
      return 'success'
    case ChannelState.Ringing:
    case ChannelState.Ring:
      return 'info'
    default:
      return 'secondary'
  }
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

.description {
  color: var(--text-color-secondary);
  margin-bottom: 2rem;
}

/* Warning background for active sessions panel */
.surface-warning,
.surface-warning-subtle {
  background: var(--yellow-50);
}

/* Card with active supervision indicator */
:deep(.border-left-3) {
  border-left-width: 3px !important;
  border-left-style: solid !important;
}

/* Monospace for channel/caller info */
.font-mono {
  font-family: var(--font-family-monospace, monospace);
}

/* Tabular numbers for duration */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  :deep(.p-card .p-card-content) {
    padding: 0.75rem;
  }

  .flex-wrap {
    flex-direction: column;
    align-items: flex-start !important;
  }
}
</style>
