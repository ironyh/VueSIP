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
    <div v-if="!isAmiConnected" class="config-panel">
      <h3>AMI Queue Monitor</h3>
      <p class="info-text">
        Connect to Asterisk via
        <a href="https://github.com/staskobzar/amiws" target="_blank">amiws</a>
        WebSocket proxy to monitor call queues in real-time.
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

      <Button
        :label="connecting ? 'Connecting...' : 'Connect to AMI'"
        :disabled="!amiConfig.url || connecting"
        @click="handleConnect"
      />

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> This demo requires Asterisk with queues configured and an amiws proxy
        running to expose AMI via WebSocket.
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
          <span>Queues: {{ queueList.length }}</span>
        </div>
        <div class="status-item">
          <span>Total Callers: {{ totalCallers }}</span>
        </div>
        <div class="status-item">
          <span>Available Agents: {{ totalAvailable }}</span>
        </div>
        <div class="status-item">
          <span class="stat-paused">Paused: {{ totalPaused }}</span>
        </div>
        <div class="status-item">
          <span class="stat-sl">SL: {{ overallServiceLevel }}%</span>
        </div>
        <Button
          :label="loading ? 'Refreshing...' : 'Refresh'"
          severity="secondary"
          size="small"
          @click="handleRefresh"
          :disabled="loading"
        />
        <Button label="Disconnect" severity="secondary" size="small" @click="handleDisconnect" />
      </div>

      <!-- Queue Overview -->
      <div class="queue-overview">
        <h3>Queue Overview</h3>

        <div v-if="loading" class="loading-state">Loading queue data...</div>

        <div v-else-if="queueList.length === 0" class="empty-state">
          <p>No queues found</p>
          <p class="info-text">Make sure you have queues configured in Asterisk.</p>
        </div>

        <div v-else class="queue-cards">
          <div
            v-for="queue in queueList"
            :key="queue.name"
            class="queue-card"
            :class="{ expanded: expandedQueue === queue.name }"
            @click="toggleQueue(queue.name)"
          >
            <div class="queue-header">
              <div class="queue-name">{{ queue.name }}</div>
              <div class="queue-stats">
                <span class="stat callers" :class="{ alert: queue.calls > 5 }">
                  {{ queue.calls }} waiting
                </span>
                <span class="stat members"> {{ queue.members.length }} agents </span>
                <span class="stat available"> {{ availableCount(queue) }} available </span>
              </div>
            </div>

            <div class="queue-metrics">
              <div class="metric">
                <label>Hold Time</label>
                <span>{{ formatTime(queue.holdtime) }}</span>
              </div>
              <div class="metric">
                <label>Talk Time</label>
                <span>{{ formatTime(queue.talktime) }}</span>
              </div>
              <div class="metric">
                <label>Completed</label>
                <span>{{ queue.completed }}</span>
              </div>
              <div class="metric">
                <label>Abandoned</label>
                <span class="abandoned">{{ queue.abandoned }}</span>
              </div>
              <div class="metric">
                <label>SL %</label>
                <span>{{ queue.serviceLevelPerf.toFixed(1) }}%</span>
              </div>
            </div>

            <!-- Expanded Details -->
            <div v-if="expandedQueue === queue.name" class="queue-details">
              <!-- Members Section -->
              <div class="members-section">
                <h4>Agents ({{ queue.members.length }})</h4>
                <div class="members-list">
                  <div
                    v-for="member in queue.members"
                    :key="member.interface"
                    class="member-card"
                    :class="{ paused: member.paused }"
                  >
                    <div class="member-info">
                      <div class="member-name">{{ member.name || member.interface }}</div>
                      <div class="member-interface">{{ member.interface }}</div>
                    </div>
                    <div class="member-status">
                      <span class="status-badge" :class="getStatusClass(member.status)">
                        {{ member.statusLabel }}
                      </span>
                      <span v-if="member.paused" class="paused-badge">
                        {{ member.pausedReason || 'Paused' }}
                      </span>
                    </div>
                    <div class="member-stats">
                      <span>Calls: {{ member.callsTaken }}</span>
                      <span v-if="member.lastCall">
                        Last: {{ formatTimestamp(member.lastCall) }}
                      </span>
                    </div>
                    <div class="member-actions">
                      <Button
                        v-if="!member.paused"
                        label="Pause"
                        severity="warn"
                        size="small"
                        @click.stop="handlePause(queue.name, member.interface)"
                      />
                      <Button
                        v-else
                        label="Unpause"
                        severity="success"
                        size="small"
                        @click.stop="handleUnpause(queue.name, member.interface)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Callers Section -->
              <div v-if="queue.entries.length > 0" class="callers-section">
                <h4>Waiting Callers ({{ queue.entries.length }})</h4>
                <div class="callers-list">
                  <div
                    v-for="entry in queue.entries"
                    :key="entry.uniqueId"
                    class="caller-card"
                    :class="{ long: entry.wait > 60 }"
                  >
                    <div class="caller-position">#{{ entry.position }}</div>
                    <div class="caller-info">
                      <div class="caller-id">
                        {{ entry.callerIdName || entry.callerIdNum || 'Unknown' }}
                      </div>
                      <div class="caller-number">{{ entry.callerIdNum }}</div>
                    </div>
                    <div class="caller-wait" :class="{ alert: entry.wait > 120 }">
                      {{ formatTime(entry.wait) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pause Reason Dialog -->
      <div v-if="showPauseDialog" class="dialog-overlay" @click.self="cancelPause">
        <div class="dialog">
          <h3>Pause Agent</h3>
          <p>Select a reason for pausing:</p>
          <div class="pause-reasons">
            <Button
              v-for="reason in pauseReasons"
              :key="reason"
              :label="reason"
              class="btn-reason"
              @click="confirmPause(reason)"
            />
          </div>
          <Button label="Cancel" severity="secondary" @click="cancelPause" />
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
import { ref, computed, onMounted, watch as _watch } from 'vue'
import { useAmi, useAmiQueues } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button } from './shared-components'
import type { QueueInfo } from '../../src/types/ami.types'
import { QueueMemberStatus } from '../../src/types/ami.types'

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

const getStatusClass = (status: QueueMemberStatus): string => {
  switch (status) {
    case QueueMemberStatus.NotInUse:
      return 'available'
    case QueueMemberStatus.InUse:
    case QueueMemberStatus.Busy:
    case QueueMemberStatus.RingInUse:
      return 'busy'
    case QueueMemberStatus.Ringing:
    case QueueMemberStatus.Ring:
      return 'ringing'
    case QueueMemberStatus.Unavailable:
    case QueueMemberStatus.Invalid:
      return 'offline'
    case QueueMemberStatus.OnHold:
      return 'hold'
    default:
      return 'unknown'
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

.info-text a {
  color: var(--vuesip-primary);
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

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius);
  font-size: 0.875rem;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--vuesip-text-tertiary);
  font-size: 0.75rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--vuesip-danger-light);
  border: 1px solid var(--vuesip-danger);
  border-radius: var(--vuesip-border-radius);
  color: var(--vuesip-danger-dark);
  font-size: 0.875rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--vuesip-info-light);
  border-left: 4px solid var(--vuesip-info);
  border-radius: var(--vuesip-border-radius);
  font-size: 0.875rem;
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

.stat-paused {
  color: var(--vuesip-warning);
  font-weight: 500;
}

.stat-sl {
  color: var(--vuesip-success);
  font-weight: 500;
}

/* Queue Overview */
.queue-overview h3 {
  margin-bottom: 1rem;
  color: var(--vuesip-text-primary);
}

.loading-state,
.empty-state {
  padding: 2rem;
  text-align: center;
  background: var(--vuesip-bg-secondary);
  border: 1px dashed var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
  color: var(--vuesip-text-tertiary);
}

/* Queue Cards */
.queue-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.queue-card {
  background: var(--vuesip-bg-primary);
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
  padding: 1rem;
  cursor: pointer;
  transition: all var(--vuesip-transition);
}

.queue-card:hover {
  border-color: var(--vuesip-primary);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.queue-card.expanded {
  border-color: var(--vuesip-primary);
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.queue-name {
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--vuesip-text-primary);
}

.queue-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius);
}

.stat.callers.alert {
  background: var(--vuesip-danger-light);
  color: var(--vuesip-danger-dark);
}

.stat.available {
  background: var(--vuesip-success-light);
  color: var(--vuesip-success-dark);
}

.queue-metrics {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric label {
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
  text-transform: uppercase;
}

.metric span {
  font-weight: 500;
  color: var(--vuesip-text-primary);
}

.metric .abandoned {
  color: var(--vuesip-danger-dark);
}

/* Queue Details */
.queue-details {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vuesip-border);
}

.members-section h4,
.callers-section h4 {
  margin-bottom: 1rem;
  color: var(--vuesip-text-primary);
}

.members-list,
.callers-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Member Card */
.member-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius);
}

.member-card.paused {
  background: var(--vuesip-warning-light);
  border: 1px solid var(--yellow-400);
}

.member-info {
  flex: 1;
}

.member-name {
  font-weight: 500;
  color: var(--vuesip-text-primary);
}

.member-interface {
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
}

.member-status {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--vuesip-border-radius);
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.available {
  background: var(--vuesip-success-light);
  color: var(--vuesip-success-dark);
}
.status-badge.busy {
  background: var(--vuesip-danger-light);
  color: var(--vuesip-danger-dark);
}
.status-badge.ringing {
  background: var(--vuesip-info-light);
  color: var(--vuesip-info-dark);
}
.status-badge.hold {
  background: var(--vuesip-warning-light);
  color: var(--vuesip-warning-dark);
}
.status-badge.offline {
  background: var(--vuesip-bg-secondary);
  color: var(--vuesip-text-tertiary);
}
.status-badge.unknown {
  background: var(--vuesip-border);
  color: var(--vuesip-text-primary);
}

.paused-badge {
  font-size: 0.75rem;
  color: var(--vuesip-warning-dark);
}

.member-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
}

.member-actions {
  display: flex;
  gap: 0.5rem;
}

/* Caller Card */
.caller-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius);
}

.caller-card.long {
  background: var(--vuesip-warning-light);
  border: 1px solid var(--yellow-400);
}

.caller-position {
  font-weight: 600;
  font-size: 1.25rem;
  color: var(--vuesip-primary);
  min-width: 40px;
}

.caller-info {
  flex: 1;
}

.caller-id {
  font-weight: 500;
  color: var(--vuesip-text-primary);
}

.caller-number {
  font-size: 0.75rem;
  color: var(--vuesip-text-tertiary);
}

.caller-wait {
  font-weight: 500;
}

.caller-wait.alert {
  color: var(--vuesip-danger-dark);
}

/* Callers Section */
.callers-section {
  margin-top: 1.5rem;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.dialog {
  background: var(--vuesip-bg-primary);
  padding: 2rem;
  border-radius: var(--vuesip-border-radius-lg);
  max-width: 400px;
  width: 90%;
}

.dialog h3 {
  margin-bottom: 0.5rem;
}

.dialog p {
  color: var(--vuesip-text-tertiary);
  margin-bottom: 1rem;
}

.pause-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.btn-reason {
  background: var(--vuesip-bg-secondary);
  color: var(--vuesip-text-primary);
  border: 1px solid var(--vuesip-border);
}

.btn-reason:hover {
  background: var(--vuesip-primary);
  color: var(--surface-0);
  border-color: var(--vuesip-primary);
}

/* Responsive */
@media (max-width: 768px) {
  .queue-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .queue-stats {
    flex-wrap: wrap;
    width: 100%;
  }

  .queue-metrics {
    justify-content: space-between;
    grid-template-columns: repeat(2, 1fr);
  }

  .member-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .member-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .member-stats {
    width: 100%;
  }

  .member-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .caller-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .status-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .pause-reasons {
    flex-direction: column;
  }

  .btn-reason {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .queue-metrics {
    grid-template-columns: 1fr;
  }

  .stat {
    width: 100%;
    display: block;
    text-align: center;
  }

  .connected-interface {
    padding: 1rem;
  }

  .queue-card {
    padding: 0.75rem;
  }
}
</style>
