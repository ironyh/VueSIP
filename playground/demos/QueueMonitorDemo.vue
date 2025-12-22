<template>
  <div class="queue-monitor-demo">
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
    <Panel v-if="!isAmiConnected" header="AMI Queue Monitor" class="mb-4">
      <template #icons>
        <i class="pi pi-server text-primary"></i>
      </template>

      <Message severity="info" :closable="false" class="mb-4">
        Connect to Asterisk via
        <a href="https://github.com/staskobzar/amiws" target="_blank" class="text-primary font-medium">amiws</a>
        WebSocket proxy to monitor call queues in real-time.
      </Message>

      <div class="flex flex-column gap-2 mb-4">
        <label for="ami-url" class="font-medium">AMI WebSocket URL</label>
        <InputText
          id="ami-url"
          v-model="amiConfig.url"
          type="text"
          placeholder="ws://pbx.example.com:8080"
          :disabled="connecting"
          class="w-full"
        />
        <small class="text-color-secondary">amiws WebSocket proxy URL</small>
      </div>

      <Button
        :label="connecting ? 'Connecting...' : 'Connect to AMI'"
        icon="pi pi-link"
        :disabled="!amiConfig.url || connecting"
        :loading="connecting"
        @click="handleConnect"
        class="mb-3"
      />

      <Message v-if="connectionError" severity="error" :closable="false" class="mt-3">
        {{ connectionError }}
      </Message>

      <Message severity="warn" :closable="false" class="mt-3">
        <i class="pi pi-lightbulb mr-2"></i>
        <strong>Tip:</strong> This demo requires Asterisk with queues configured and an amiws proxy
        running to expose AMI via WebSocket.
      </Message>
    </Panel>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="flex flex-wrap align-items-center gap-3 p-3 surface-card border-round mb-4">
        <Tag severity="success" class="px-3 py-2">
          <i class="pi pi-shield mr-2"></i>
          AMI Connected
        </Tag>
        <Tag severity="secondary" class="px-3 py-2">
          <i class="pi pi-th-large mr-2"></i>
          {{ queueList.length }} Queues
        </Tag>
        <Tag severity="info" class="px-3 py-2">
          <i class="pi pi-users mr-2"></i>
          {{ totalCallers }} Callers
        </Tag>
        <Tag severity="success" class="px-3 py-2">
          <i class="pi pi-user-plus mr-2"></i>
          {{ totalAvailable }} Available
        </Tag>
        <Tag severity="warn" class="px-3 py-2">
          <i class="pi pi-pause mr-2"></i>
          {{ totalPaused }} Paused
        </Tag>
        <Tag :severity="overallServiceLevel >= 80 ? 'success' : overallServiceLevel >= 60 ? 'warn' : 'danger'" class="px-3 py-2">
          <i class="pi pi-chart-line mr-2"></i>
          {{ overallServiceLevel }}% SL
        </Tag>
        <div class="flex gap-2 ml-auto">
          <Button
            :label="loading ? 'Refreshing...' : 'Refresh'"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            :loading="loading"
            @click="handleRefresh"
          />
          <Button
            label="Disconnect"
            icon="pi pi-sign-out"
            size="small"
            severity="secondary"
            @click="handleDisconnect"
          />
        </div>
      </div>

      <!-- Queue Overview -->
      <Panel header="Queue Overview" class="mb-4">
        <template #icons>
          <i class="pi pi-th-large text-primary"></i>
        </template>

        <div v-if="loading" class="flex align-items-center justify-content-center p-5">
          <i class="pi pi-spin pi-spinner text-4xl text-primary mr-3"></i>
          <span class="text-lg">Loading queue data...</span>
        </div>

        <Message v-else-if="queueList.length === 0" severity="info" :closable="false" class="text-center">
          <div class="flex flex-column align-items-center">
            <i class="pi pi-inbox text-4xl mb-3"></i>
            <p class="font-semibold mb-2">No queues found</p>
            <p class="text-color-secondary">Make sure you have queues configured in Asterisk.</p>
          </div>
        </Message>

        <div v-else class="flex flex-column gap-3">
          <Card
            v-for="queue in queueList"
            :key="queue.name"
            class="queue-card cursor-pointer"
            :class="{ 'border-primary': expandedQueue === queue.name }"
            @click="toggleQueue(queue.name)"
          >
            <template #header>
              <div class="flex justify-content-between align-items-center p-3 surface-50 border-round-top">
                <div class="flex align-items-center gap-2">
                  <i class="pi pi-server text-primary text-xl"></i>
                  <span class="font-bold text-lg">{{ queue.name }}</span>
                </div>
                <div class="flex gap-2">
                  <Tag :severity="queue.calls > 5 ? 'danger' : 'info'">
                    {{ queue.calls }} waiting
                  </Tag>
                  <Tag severity="secondary">
                    {{ queue.members.length }} agents
                  </Tag>
                  <Tag severity="success">
                    {{ availableCount(queue) }} available
                  </Tag>
                </div>
              </div>
            </template>

            <template #content>
              <div class="grid">
                <div class="col-12 md:col-6 lg:col-2">
                  <div class="metric-card hold-time">
                    <div class="metric-icon">
                      <i class="pi pi-clock"></i>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">{{ formatTime(queue.holdtime) }}</div>
                      <div class="metric-label">Hold Time</div>
                    </div>
                  </div>
                </div>
                <div class="col-12 md:col-6 lg:col-2">
                  <div class="metric-card talk-time">
                    <div class="metric-icon">
                      <i class="pi pi-comments"></i>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">{{ formatTime(queue.talktime) }}</div>
                      <div class="metric-label">Talk Time</div>
                    </div>
                  </div>
                </div>
                <div class="col-12 md:col-6 lg:col-2">
                  <div class="metric-card completed">
                    <div class="metric-icon">
                      <i class="pi pi-check-circle"></i>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">{{ queue.completed }}</div>
                      <div class="metric-label">Completed</div>
                    </div>
                  </div>
                </div>
                <div class="col-12 md:col-6 lg:col-2">
                  <div class="metric-card abandoned">
                    <div class="metric-icon">
                      <i class="pi pi-times-circle"></i>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">{{ queue.abandoned }}</div>
                      <div class="metric-label">Abandoned</div>
                    </div>
                  </div>
                </div>
                <div class="col-12 md:col-6 lg:col-2">
                  <div class="metric-card service-level">
                    <div class="metric-icon">
                      <i class="pi pi-bullseye"></i>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">{{ queue.serviceLevelPerf.toFixed(1) }}%</div>
                      <div class="metric-label">Service Level</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Expanded Details -->
              <div v-if="expandedQueue === queue.name" class="mt-4 pt-4 border-top-1 surface-border">
                <!-- Members Section -->
                <div class="mb-4">
                  <div class="flex align-items-center gap-2 mb-3">
                    <i class="pi pi-users text-primary"></i>
                    <span class="font-semibold">Agents ({{ queue.members.length }})</span>
                  </div>
                  <div class="flex flex-column gap-2">
                    <div
                      v-for="member in queue.members"
                      :key="member.interface"
                      class="flex align-items-center gap-3 p-3 border-round"
                      :class="member.paused ? 'bg-yellow-50 border-1 border-yellow-300' : 'surface-100'"
                    >
                      <div class="flex-1">
                        <div class="font-medium">{{ member.name || member.interface }}</div>
                        <small class="text-color-secondary">{{ member.interface }}</small>
                      </div>
                      <div class="flex gap-2 align-items-center">
                        <Tag :severity="getTagSeverity(member.status)">
                          {{ member.statusLabel }}
                        </Tag>
                        <Tag v-if="member.paused" severity="warn">
                          {{ member.pausedReason || 'Paused' }}
                        </Tag>
                      </div>
                      <div class="flex flex-column text-right text-sm">
                        <span>Calls: {{ member.callsTaken }}</span>
                        <span v-if="member.lastCall" class="text-color-secondary">
                          Last: {{ formatTimestamp(member.lastCall) }}
                        </span>
                      </div>
                      <div>
                        <Button
                          v-if="!member.paused"
                          label="Pause"
                          icon="pi pi-pause"
                          size="small"
                          severity="warn"
                          @click.stop="handlePause(queue.name, member.interface)"
                        />
                        <Button
                          v-else
                          label="Unpause"
                          icon="pi pi-play"
                          size="small"
                          severity="success"
                          @click.stop="handleUnpause(queue.name, member.interface)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Callers Section -->
                <div v-if="queue.entries.length > 0">
                  <div class="flex align-items-center gap-2 mb-3">
                    <i class="pi pi-phone text-primary"></i>
                    <span class="font-semibold">Waiting Callers ({{ queue.entries.length }})</span>
                  </div>
                  <div class="flex flex-column gap-2">
                    <div
                      v-for="entry in queue.entries"
                      :key="entry.uniqueId"
                      class="flex align-items-center gap-3 p-3 border-round"
                      :class="entry.wait > 60 ? 'bg-yellow-50 border-1 border-yellow-300' : 'surface-100'"
                    >
                      <Tag severity="info" class="text-lg font-bold">#{{ entry.position }}</Tag>
                      <div class="flex-1">
                        <div class="font-medium">
                          {{ entry.callerIdName || entry.callerIdNum || 'Unknown' }}
                        </div>
                        <small class="text-color-secondary">{{ entry.callerIdNum }}</small>
                      </div>
                      <Tag :severity="entry.wait > 120 ? 'danger' : entry.wait > 60 ? 'warn' : 'secondary'">
                        <i class="pi pi-clock mr-1"></i>
                        {{ formatTime(entry.wait) }}
                      </Tag>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </Panel>

      <!-- Pause Reason Dialog -->
      <Dialog
        v-model:visible="showPauseDialog"
        header="Pause Agent"
        :modal="true"
        :style="{ width: '400px' }"
        :closable="true"
        @hide="cancelPause"
      >
        <p class="text-color-secondary mb-4">Select a reason for pausing:</p>
        <div class="flex flex-wrap gap-2 mb-4">
          <Button
            v-for="reason in pauseReasons"
            :key="reason"
            :label="reason"
            severity="secondary"
            outlined
            @click="confirmPause(reason)"
          />
        </div>
        <template #footer>
          <Button label="Cancel" severity="secondary" @click="cancelPause" />
        </template>
      </Dialog>

      <!-- Error Display -->
      <Message v-if="error" severity="error" :closable="false" class="mt-3">
        {{ error }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch as _watch } from 'vue'
import { useAmi, useAmiQueues } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import type { QueueInfo } from '../../src/types/ami.types'
import { QueueMemberStatus } from '../../src/types/ami.types'

// PrimeVue Components
import Panel from 'primevue/panel'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'

// AMI Configuration
const amiConfig = ref({ url: '' })
const connecting = ref(false)
const connectionError = ref('')

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Client
const {
  connect: amiConnect,
  disconnect: amiDisconnect,
  isConnected: realIsAmiConnected,
  getClient,
} = useAmi()

// Effective values for simulation
const isAmiConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsAmiConnected.value
)

// Queue composable - initialized after connection
const queuesComposable = ref<ReturnType<typeof useAmiQueues> | null>(null)

// Local state
const expandedQueue = ref<string | null>(null)
const showPauseDialog = ref(false)
const pauseTarget = ref<{ queue: string; iface: string } | null>(null)

// Computed from queues composable
const loading = computed(() => queuesComposable.value?.loading.value ?? false)
const error = computed(() => queuesComposable.value?.error.value ?? null)
const queueList = computed(() => queuesComposable.value?.queueList.value ?? [])
const totalCallers = computed(() => queuesComposable.value?.totalCallers.value ?? 0)
const totalAvailable = computed(() => queuesComposable.value?.totalAvailable.value ?? 0)
const totalPaused = computed(() => queuesComposable.value?.totalPaused.value ?? 0)
const overallServiceLevel = computed(() => queuesComposable.value?.overallServiceLevel.value ?? 0)
const pauseReasons = computed(
  () =>
    queuesComposable.value?.getPauseReasons() ?? ['Break', 'Lunch', 'Meeting', 'Training', 'Other']
)

// Helpers
const availableCount = (queue: QueueInfo): number => {
  return queue.members.filter((m) => !m.paused && m.status === QueueMemberStatus.NotInUse).length
}


// PrimeVue Tag severity helper
const getTagSeverity = (status: QueueMemberStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' => {
  switch (status) {
    case QueueMemberStatus.NotInUse:
      return 'success'
    case QueueMemberStatus.InUse:
    case QueueMemberStatus.Busy:
    case QueueMemberStatus.RingInUse:
      return 'danger'
    case QueueMemberStatus.Ringing:
    case QueueMemberStatus.Ring:
      return 'info'
    case QueueMemberStatus.Unavailable:
    case QueueMemberStatus.Invalid:
      return 'secondary'
    case QueueMemberStatus.OnHold:
      return 'warn'
    default:
      return 'secondary'
  }
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

const formatTimestamp = (timestamp: number): string => {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString()
}

// Handlers
async function handleConnect() {
  if (!amiConfig.value.url) return

  connecting.value = true
  connectionError.value = ''

  try {
    await amiConnect({ url: amiConfig.value.url })

    // Initialize queues composable
    const client = getClient()
    if (client) {
      queuesComposable.value = useAmiQueues(client, {
        useEvents: true,
        pauseReasons: ['Break', 'Lunch', 'Meeting', 'Training', 'Personal', 'Other'],
        onQueueUpdate: (queue) => {
          console.log('Queue updated:', queue.name, queue.calls, 'callers')
        },
        onCallerJoin: (entry, queueName) => {
          console.log(`Caller joined ${queueName}:`, entry.callerIdNum)
        },
        onCallerAbandon: (entry, queueName) => {
          console.log(`Caller abandoned ${queueName}:`, entry.callerIdNum)
        },
      })

      // Initial refresh
      await queuesComposable.value.refresh()
    }
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

function handleDisconnect() {
  amiDisconnect()
  queuesComposable.value = null
}

async function handleRefresh() {
  await queuesComposable.value?.refresh()
}

function toggleQueue(name: string) {
  expandedQueue.value = expandedQueue.value === name ? null : name
}

function handlePause(queue: string, iface: string) {
  pauseTarget.value = { queue, iface }
  showPauseDialog.value = true
}

async function confirmPause(reason: string) {
  if (!pauseTarget.value || !queuesComposable.value) return

  try {
    await queuesComposable.value.pauseMember(
      pauseTarget.value.queue,
      pauseTarget.value.iface,
      reason
    )
  } catch (err) {
    console.error('Failed to pause member:', err)
  } finally {
    showPauseDialog.value = false
    pauseTarget.value = null
  }
}

function cancelPause() {
  showPauseDialog.value = false
  pauseTarget.value = null
}

async function handleUnpause(queue: string, iface: string) {
  if (!queuesComposable.value) return

  try {
    await queuesComposable.value.unpauseMember(queue, iface)
  } catch (err) {
    console.error('Failed to unpause member:', err)
  }
}

// Load saved AMI URL
onMounted(() => {
  const saved = localStorage.getItem('vuesip-ami-url')
  if (saved) {
    amiConfig.value.url = saved
  }
})
</script>

<style scoped>
.queue-monitor-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* Connected Interface */
.connected-interface {
  padding: 0;
}

/* Queue Card PrimeVue styling */
.queue-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.queue-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

/* Metric Cards */
.metric-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.3s;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.metric-card:hover::before {
  opacity: 1;
}

/* Card-specific styling */
.metric-card.hold-time .metric-icon { background: linear-gradient(135deg, var(--orange-500), var(--orange-400)); }
.metric-card.hold-time::before { background: linear-gradient(90deg, var(--orange-500), var(--orange-400)); }

.metric-card.talk-time .metric-icon { background: linear-gradient(135deg, var(--blue-500), var(--blue-400)); }
.metric-card.talk-time::before { background: linear-gradient(90deg, var(--blue-500), var(--blue-400)); }

.metric-card.completed .metric-icon { background: linear-gradient(135deg, var(--green-500), var(--green-400)); }
.metric-card.completed::before { background: linear-gradient(90deg, var(--green-500), var(--green-400)); }

.metric-card.abandoned .metric-icon { background: linear-gradient(135deg, var(--red-500), var(--red-400)); }
.metric-card.abandoned::before { background: linear-gradient(90deg, var(--red-500), var(--red-400)); }

.metric-card.service-level .metric-icon { background: linear-gradient(135deg, var(--purple-500), var(--purple-400)); }
.metric-card.service-level::before { background: linear-gradient(90deg, var(--purple-500), var(--purple-400)); }

/* Metric icon */
.metric-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  font-size: 1.125rem;
}

/* Metric content */
.metric-content {
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.2;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

/* Gradient text for specific metrics */
.metric-card.completed .metric-value {
  background: linear-gradient(135deg, var(--green-600), var(--green-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-card.abandoned .metric-value {
  background: linear-gradient(135deg, var(--red-600), var(--red-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-card.service-level .metric-value {
  background: linear-gradient(135deg, var(--purple-600), var(--purple-500));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Responsive */
@media (max-width: 768px) {
  .queue-monitor-demo {
    padding: 1rem 0.5rem;
  }
}
</style>
