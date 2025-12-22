<template>
  <div class="click-to-call-demo">
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
      <h3>Click-to-Call Demo</h3>
      <p class="info-text">
        Connect to Asterisk via AMI to originate calls. This demonstrates agent-first click-to-call
        where your phone rings first, then connects to the destination.
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
          <span>Dialing: {{ dialingCount }}</span>
        </div>
        <div class="status-item">
          <span>Total Duration: {{ formatTotalDuration }}</span>
        </div>
        <div v-if="lastRefresh" class="status-item">
          <span class="last-refresh">Last: {{ formatLastRefresh }}</span>
        </div>
        <button class="btn btn-sm btn-secondary" @click="handleRefresh" :disabled="loading">
          🔄 Refresh
        </button>
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">Disconnect</button>
      </div>

      <!-- Click-to-Call Form -->
      <div class="call-form">
        <h3>Make a Call</h3>
        <p class="info-text">
          Enter your extension and the destination number. Your phone will ring first, then when you
          answer, the destination will be dialed.
        </p>

        <div class="form-row">
          <div class="form-group">
            <label for="agent-channel">Your Extension/Channel</label>
            <input
              id="agent-channel"
              v-model="agentChannel"
              type="text"
              placeholder="SIP/1000 or PJSIP/1000"
            />
            <small>Your SIP channel (e.g., SIP/1000, PJSIP/100)</small>
          </div>

          <div class="form-group">
            <label for="destination">Destination Number</label>
            <input id="destination" v-model="destination" type="text" placeholder="18005551234" />
            <small>Number to dial after you answer</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="caller-id">Caller ID (Optional)</label>
            <input id="caller-id" v-model="callerId" type="text" placeholder="Sales <1000>" />
            <small>Caller ID to present to the destination</small>
          </div>

          <div class="form-group">
            <label for="timeout">Ring Timeout (seconds)</label>
            <input id="timeout" v-model.number="timeout" type="number" min="10" max="120" />
            <small>How long to ring before giving up</small>
          </div>
        </div>

        <div class="call-actions">
          <button
            class="btn btn-primary btn-lg"
            :disabled="!canCall || calling"
            @click="handleCall"
          >
            {{ calling ? 'Calling...' : 'Call Now' }}
          </button>
        </div>

        <div v-if="callError" class="error-message">
          {{ callError }}
        </div>

        <div v-if="lastCallResult" class="call-result" :class="{ success: lastCallResult.success }">
          <strong>{{ lastCallResult.success ? 'Call Initiated' : 'Call Failed' }}</strong>
          <p v-if="lastCallResult.message">{{ lastCallResult.message }}</p>
          <p v-if="lastCallResult.channel">Channel: {{ lastCallResult.channel }}</p>
        </div>
      </div>

      <!-- Quick Dial -->
      <div class="quick-dial">
        <h3>Quick Dial</h3>
        <p class="info-text">Click a number to dial it quickly.</p>
        <div class="quick-dial-buttons">
          <button
            v-for="number in quickDialNumbers"
            :key="number.label"
            class="btn btn-quick"
            @click="quickDial(number.number)"
          >
            {{ number.label }}
            <span class="quick-number">{{ number.number }}</span>
          </button>
        </div>
      </div>

      <!-- Active Calls -->
      <div class="active-calls">
        <h3>Active Calls ({{ callCount }})</h3>

        <div v-if="callList.length === 0" class="empty-state">
          <p>No active calls</p>
        </div>

        <div v-else class="calls-list">
          <div
            v-for="call in callList"
            :key="call.uniqueId"
            class="call-card"
            :class="getCallStateClass(call.state)"
          >
            <div class="call-info">
              <div class="call-parties">
                <span class="caller">{{ call.callerIdName || call.callerIdNum }}</span>
                <span class="arrow">→</span>
                <span class="callee">{{
                  call.connectedLineName || call.connectedLineNum || 'Dialing...'
                }}</span>
              </div>
              <div class="call-details">
                <span class="channel">{{ call.channel }}</span>
                <span class="duration">{{ formatDuration(call.duration) }}</span>
              </div>
            </div>
            <div class="call-state">
              <span class="state-badge" :class="getCallStateClass(call.state)">
                {{ call.stateDesc }}
              </span>
            </div>
            <div class="call-actions">
              <button class="btn btn-sm btn-danger" @click="handleHangup(call.uniqueId)">
                Hangup
              </button>
              <button class="btn btn-sm btn-secondary" @click="showTransfer(call)">Transfer</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Transfer Dialog -->
      <div v-if="transferTarget" class="dialog-overlay" @click.self="cancelTransfer">
        <div class="dialog">
          <h3>Transfer Call</h3>
          <p>Transfer {{ transferTarget.callerIdNum }} to:</p>
          <div class="form-group">
            <input
              v-model="transferDestination"
              type="text"
              placeholder="Extension or number"
              @keyup.enter="handleTransfer"
            />
          </div>
          <div class="dialog-actions">
            <button
              class="btn btn-primary"
              @click="handleTransfer"
              :disabled="!transferDestination"
            >
              Transfer
            </button>
            <button class="btn btn-secondary" @click="cancelTransfer">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAmi, useAmiCalls, type ActiveCall } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { ChannelState, type OriginateResult } from '../../src/types/ami.types'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Configuration
const amiConfig = ref({ url: '' })
const connecting = ref(false)
const connectionError = ref('')

// Call form
const agentChannel = ref('')
const destination = ref('')
const callerId = ref('')
const timeout = ref(30)
const calling = ref(false)
const callError = ref('')
const lastCallResult = ref<OriginateResult | null>(null)

// Transfer
const transferTarget = ref<ActiveCall | null>(null)
const transferDestination = ref('')

// Quick dial
const quickDialNumbers = ref([
  { label: 'Sales', number: '1001' },
  { label: 'Support', number: '1002' },
  { label: 'Reception', number: '1000' },
  { label: 'Mobile', number: '5551234567' },
])

// AMI Client
const {
  connect: amiConnect,
  disconnect: amiDisconnect,
  isConnected: isAmiConnected,
  getClient,
} = useAmi()

// Calls composable
const callsComposable = ref<ReturnType<typeof useAmiCalls> | null>(null)

// Computed
const loading = computed(() => callsComposable.value?.loading.value ?? false)
const callList = computed(() => callsComposable.value?.callList.value ?? [])
const callCount = computed(() => callsComposable.value?.callCount.value ?? 0)
const dialingCount = computed(() => callsComposable.value?.dialingCalls.value.length ?? 0)
const totalDuration = computed(() => callsComposable.value?.totalDuration.value ?? 0)
const lastRefresh = computed(() => callsComposable.value?.lastRefresh.value ?? null)

const formatTotalDuration = computed(() => {
  const secs = totalDuration.value
  const mins = Math.floor(secs / 60)
  const remaining = secs % 60
  return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`
})

const formatLastRefresh = computed(() => {
  if (!lastRefresh.value) return ''
  return lastRefresh.value.toLocaleTimeString()
})

const canCall = computed(() => {
  return agentChannel.value.trim() && destination.value.trim()
})

// Helpers
const getCallStateClass = (state: ChannelState): string => {
  switch (state) {
    case ChannelState.Up:
      return 'connected'
    case ChannelState.Ringing:
    case ChannelState.Ring:
      return 'ringing'
    case ChannelState.Down:
      return 'ended'
    default:
      return 'unknown'
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
      callsComposable.value = useAmiCalls(client, {
        useEvents: true,
        agentFirst: true,
        defaultContext: 'from-internal',
        dialTimeout: timeout.value * 1000,
        onCallStart: (call) => {
          console.log('Call started:', call.channel)
        },
        onCallEnd: (call) => {
          console.log('Call ended:', call.channel)
        },
        onCallStateChange: (call, oldState) => {
          console.log('Call state changed:', call.channel, oldState, '->', call.state)
        },
      })

      // Initial refresh
      await callsComposable.value.refresh()
    }

    // Save URL
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
}

async function handleRefresh() {
  await callsComposable.value?.refresh()
}

async function handleCall() {
  if (!callsComposable.value || !canCall.value) return

  calling.value = true
  callError.value = ''
  lastCallResult.value = null

  try {
    const result = await callsComposable.value.clickToCall(
      agentChannel.value.trim(),
      destination.value.trim(),
      {
        callerId: callerId.value || undefined,
        timeout: timeout.value * 1000,
      }
    )

    lastCallResult.value = result

    if (result.success) {
      // Clear destination on success
      destination.value = ''
    }
  } catch (err) {
    callError.value = err instanceof Error ? err.message : 'Call failed'
    lastCallResult.value = {
      success: false,
      message: callError.value,
    }
  } finally {
    calling.value = false
  }
}

async function quickDial(number: string) {
  if (!agentChannel.value.trim()) {
    callError.value = 'Please enter your extension first'
    return
  }

  destination.value = number
  await handleCall()
}

async function handleHangup(uniqueId: string) {
  if (!callsComposable.value) return

  try {
    await callsComposable.value.hangup(uniqueId)
  } catch (err) {
    console.error('Hangup failed:', err)
  }
}

function showTransfer(call: ActiveCall) {
  transferTarget.value = call
  transferDestination.value = ''
}

function cancelTransfer() {
  transferTarget.value = null
  transferDestination.value = ''
}

async function handleTransfer() {
  if (!callsComposable.value || !transferTarget.value || !transferDestination.value) return

  try {
    await callsComposable.value.transfer(transferTarget.value.uniqueId, transferDestination.value)
    cancelTransfer()
  } catch (err) {
    console.error('Transfer failed:', err)
  }
}

// Load saved settings
onMounted(() => {
  const savedUrl = localStorage.getItem('vuesip-ami-url')
  if (savedUrl) {
    amiConfig.value.url = savedUrl
  }

  const savedChannel = localStorage.getItem('vuesip-agent-channel')
  if (savedChannel) {
    agentChannel.value = savedChannel
  }
})

// Save agent channel when changed
watch(agentChannel, (value) => {
  if (value.trim()) {
    localStorage.setItem('vuesip-agent-channel', value)
  }
})
</script>

<style scoped>
.click-to-call-demo {
  max-width: 900px;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

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
.btn-danger {
  background: #ef4444;
  color: white;
}
.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}
.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
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

.last-refresh {
  color: #6b7280;
  font-size: 0.75rem;
}

/* Call Form */
.call-form {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.call-form h3 {
  margin-bottom: 0.5rem;
  color: #111827;
}

.call-actions {
  text-align: center;
  margin-top: 1.5rem;
}

.call-result {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
  background: #fee2e2;
  border: 1px solid #fecaca;
}

.call-result.success {
  background: #d1fae5;
  border-color: #6ee7b7;
}

/* Quick Dial */
.quick-dial {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.quick-dial h3 {
  margin-bottom: 0.5rem;
  color: #111827;
}

.quick-dial-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.btn-quick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn-quick:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.quick-number {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Active Calls */
.active-calls {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.active-calls h3 {
  margin-bottom: 1rem;
  color: #111827;
}

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
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  border-left: 4px solid #e5e7eb;
}

.call-card.connected {
  border-left-color: #10b981;
}

.call-card.ringing {
  border-left-color: #3b82f6;
  animation: pulse 1s infinite;
}

.call-card.ended {
  border-left-color: #6b7280;
  opacity: 0.7;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
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
}

.arrow {
  color: #6b7280;
}

.call-details {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.call-state {
  padding: 0 1rem;
}

.state-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.state-badge.connected {
  background: #d1fae5;
  color: #065f46;
}
.state-badge.ringing {
  background: #dbeafe;
  color: #1e40af;
}
.state-badge.ended {
  background: #f3f4f6;
  color: #6b7280;
}
.state-badge.unknown {
  background: #e5e7eb;
  color: #374151;
}

.call-actions {
  display: flex;
  gap: 0.5rem;
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
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}

.dialog h3 {
  margin-bottom: 0.5rem;
}

.dialog p {
  color: #6b7280;
  margin-bottom: 1rem;
}

.dialog-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .status-bar {
    flex-direction: column;
  }

  .call-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .call-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
