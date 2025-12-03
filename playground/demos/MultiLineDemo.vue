<template>
  <div class="multi-line-demo">
    <!-- Configuration Panel -->
    <div v-if="!sipConnected" class="config-panel">
      <h3>Multi-Line Configuration</h3>
      <p class="info-text">
        Configure your SIP connection to test multi-line call functionality.
        This demo supports multiple concurrent calls across different lines.
      </p>

      <div class="form-group">
        <label for="sip-server">SIP Server</label>
        <input
          id="sip-server"
          v-model="config.server"
          type="text"
          placeholder="wss://sip.example.com"
          :disabled="connecting"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="sip-username">Username</label>
          <input
            id="sip-username"
            v-model="config.username"
            type="text"
            placeholder="1001"
            :disabled="connecting"
          />
        </div>

        <div class="form-group">
          <label for="sip-password">Password</label>
          <input
            id="sip-password"
            v-model="config.password"
            type="password"
            placeholder="Enter password"
            :disabled="connecting"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="line-count">Number of Lines</label>
        <select id="line-count" v-model.number="lineCountConfig" :disabled="connecting">
          <option :value="2">2 Lines</option>
          <option :value="3">3 Lines</option>
          <option :value="4">4 Lines</option>
          <option :value="6">6 Lines</option>
        </select>
        <small>Number of simultaneous call lines to support</small>
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" v-model="autoHoldEnabled" :disabled="connecting" />
          Auto-hold other lines when making/answering calls
        </label>
      </div>

      <button
        class="btn btn-primary"
        :disabled="!isConfigValid || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect' }}
      </button>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> Multi-line support allows handling multiple calls simultaneously.
        Each line can be independently controlled (hold, mute, transfer).
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-items">
          <div class="status-item">
            <span class="status-dot connected"></span>
            <span>SIP Connected</span>
          </div>
          <div class="status-item">
            <span class="status-icon">📞</span>
            <span>{{ activeCallCount }} Active</span>
          </div>
          <div v-if="incomingCallCount > 0" class="status-item ringing">
            <span class="status-icon">🔔</span>
            <span>{{ incomingCallCount }} Incoming</span>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">
          Disconnect
        </button>
      </div>

      <!-- Lines Grid -->
      <div class="lines-grid">
        <div
          v-for="line in lines"
          :key="line.lineNumber"
          class="line-card"
          :class="{
            selected: line.lineNumber === selectedLine,
            idle: line.status === 'idle',
            ringing: line.status === 'ringing',
            active: line.status === 'active',
            held: line.status === 'held',
            busy: line.status === 'busy',
          }"
          @click="selectLine(line.lineNumber)"
        >
          <div class="line-header">
            <span class="line-number">Line {{ line.lineNumber }}</span>
            <span class="line-status" :class="line.status">
              {{ formatStatus(line.status) }}
            </span>
          </div>

          <div class="line-content">
            <div v-if="line.status === 'idle'" class="line-idle">
              <span class="idle-icon">📱</span>
              <span class="idle-text">Available</span>
            </div>

            <div v-else-if="line.status === 'ringing'" class="line-ringing">
              <span class="caller-name">{{ line.remoteDisplayName || 'Unknown' }}</span>
              <span class="caller-uri">{{ line.remoteUri }}</span>
              <div class="ringing-actions">
                <button
                  class="btn btn-sm btn-success"
                  @click.stop="answerCall(line.lineNumber)"
                >
                  Answer
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  @click.stop="rejectCall(line.lineNumber)"
                >
                  Reject
                </button>
              </div>
            </div>

            <div v-else class="line-active">
              <span class="remote-party">{{ line.remoteDisplayName || line.remoteUri }}</span>
              <span class="call-duration">{{ formatDuration(line.duration) }}</span>
              <div class="call-indicators">
                <span v-if="line.isOnHold" class="indicator hold">🔇 Hold</span>
                <span v-if="line.isMuted" class="indicator mute">🔈 Muted</span>
                <span v-if="line.hasVideo" class="indicator video">📹 Video</span>
              </div>
            </div>
          </div>

          <div v-if="line.status !== 'idle'" class="line-controls">
            <button
              v-if="line.status === 'active' || line.status === 'held'"
              class="btn-icon"
              :class="{ active: line.isOnHold }"
              :title="line.isOnHold ? 'Resume' : 'Hold'"
              @click.stop="toggleHoldLine(line.lineNumber)"
            >
              {{ line.isOnHold ? '▶️' : '⏸️' }}
            </button>

            <button
              v-if="line.status === 'active'"
              class="btn-icon"
              :class="{ active: line.isMuted }"
              :title="line.isMuted ? 'Unmute' : 'Mute'"
              @click.stop="toggleMuteLine(line.lineNumber)"
            >
              {{ line.isMuted ? '🔊' : '🔇' }}
            </button>

            <button
              v-if="line.status !== 'ringing'"
              class="btn-icon hangup"
              title="Hangup"
              @click.stop="hangupCall(line.lineNumber)"
            >
              📵
            </button>
          </div>
        </div>
      </div>

      <!-- Dial Pad -->
      <div class="dial-section">
        <h3>Make Call</h3>
        <div class="dial-form">
          <input
            v-model="dialTarget"
            type="text"
            placeholder="Enter number or SIP URI"
            :disabled="isLoading || allLinesBusy"
            @keyup.enter="handleDial"
          />
          <select v-model.number="dialLine" :disabled="isLoading || availableLines.length === 0">
            <option :value="0">Auto-select line</option>
            <option
              v-for="line in availableLines"
              :key="line.lineNumber"
              :value="line.lineNumber"
            >
              Line {{ line.lineNumber }}
            </option>
          </select>
          <button
            class="btn btn-primary"
            :disabled="!dialTarget || isLoading || allLinesBusy"
            @click="handleDial"
          >
            {{ isLoading ? 'Calling...' : 'Call' }}
          </button>
        </div>
        <div v-if="allLinesBusy" class="warning-message">
          All lines are busy. Hangup a call to make a new one.
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="actions-section">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button
            class="btn btn-secondary"
            :disabled="activeLines.length === 0"
            @click="holdAllLines"
          >
            Hold All
          </button>
          <button
            class="btn btn-danger"
            :disabled="activeCallCount === 0"
            @click="hangupAll"
          >
            Hangup All
          </button>
          <button
            class="btn btn-secondary"
            :disabled="heldLines.length < 2 && activeLines.length < 1"
            @click="handleSwap"
          >
            Swap Lines
          </button>
        </div>
      </div>

      <!-- DTMF Pad (for selected line) -->
      <div v-if="selectedLineState?.status === 'active'" class="dtmf-section">
        <h3>DTMF (Line {{ selectedLine }})</h3>
        <div class="dtmf-pad">
          <button
            v-for="digit in dtmfDigits"
            :key="digit"
            class="dtmf-btn"
            @click="handleDTMF(digit)"
          >
            {{ digit }}
          </button>
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
import { ref, computed, reactive, onUnmounted } from 'vue'
import type { LineState, LineStatus } from '../../src/types/multiline.types'

// Configuration state
const sipConnected = ref(false)
const connecting = ref(false)
const connectionError = ref('')
const lineCountConfig = ref(4)
const autoHoldEnabled = ref(true)

const config = reactive({
  server: 'wss://sip.example.com',
  username: '',
  password: '',
})

// Simulated multi-line state
const lines = ref<LineState[]>([])
const selectedLine = ref(1)
const isLoading = ref(false)
const error = ref<string | null>(null)

// Dial state
const dialTarget = ref('')
const dialLine = ref(0)

// DTMF digits
const dtmfDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Duration timers
const durationTimers = new Map<number, ReturnType<typeof setInterval>>()

// Computed
const isConfigValid = computed(() =>
  config.server && config.username && config.password
)

const selectedLineState = computed(() =>
  lines.value.find(l => l.lineNumber === selectedLine.value) ?? null
)

const activeCallCount = computed(() =>
  lines.value.filter(l => l.status === 'active' || l.status === 'held').length
)

const incomingCallCount = computed(() =>
  lines.value.filter(l => l.status === 'ringing').length
)

const allLinesBusy = computed(() =>
  lines.value.every(l => l.status !== 'idle')
)

const availableLines = computed(() =>
  lines.value.filter(l => l.status === 'idle')
)

const activeLines = computed(() =>
  lines.value.filter(l => l.status === 'active')
)

const heldLines = computed(() =>
  lines.value.filter(l => l.status === 'held')
)

// Helpers
function formatStatus(status: LineStatus): string {
  const labels: Record<LineStatus, string> = {
    idle: 'Available',
    ringing: 'Incoming',
    active: 'Active',
    held: 'On Hold',
    busy: 'Busy',
    error: 'Error',
  }
  return labels[status] || status
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function initializeLines(count: number): void {
  lines.value = []
  for (let i = 1; i <= count; i++) {
    lines.value.push({
      lineNumber: i,
      status: 'idle',
      callId: null,
      callState: null,
      direction: null,
      remoteUri: null,
      remoteDisplayName: null,
      isOnHold: false,
      isMuted: false,
      hasVideo: false,
      timing: null,
      duration: 0,
      error: null,
      config: {
        lineNumber: i,
        enabled: true,
        defaultAudio: true,
        defaultVideo: false,
      },
    })
  }
}

function startDurationTimer(lineNumber: number): void {
  stopDurationTimer(lineNumber)
  const timer = setInterval(() => {
    const idx = lineNumber - 1
    if (lines.value[idx]) {
      lines.value[idx].duration++
    }
  }, 1000)
  durationTimers.set(lineNumber, timer)
}

function stopDurationTimer(lineNumber: number): void {
  const timer = durationTimers.get(lineNumber)
  if (timer) {
    clearInterval(timer)
    durationTimers.delete(lineNumber)
  }
}

function findAvailableLine(): number | null {
  for (const line of lines.value) {
    if (line.status === 'idle') {
      return line.lineNumber
    }
  }
  return null
}

// Connection handlers
async function handleConnect(): Promise<void> {
  connecting.value = true
  connectionError.value = ''

  try {
    // Simulate connection
    await new Promise(resolve => setTimeout(resolve, 1000))

    initializeLines(lineCountConfig.value)
    sipConnected.value = true

    // Simulate an incoming call after 3 seconds
    setTimeout(() => {
      simulateIncomingCall()
    }, 3000)
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

function handleDisconnect(): void {
  // Stop all timers
  for (const [lineNumber] of durationTimers) {
    stopDurationTimer(lineNumber)
  }
  lines.value = []
  sipConnected.value = false
}

// Line selection
function selectLine(lineNumber: number): void {
  selectedLine.value = lineNumber
}

// Call methods
async function handleDial(): Promise<void> {
  if (!dialTarget.value || isLoading.value) return

  isLoading.value = true
  error.value = null

  try {
    const lineNumber = dialLine.value > 0 ? dialLine.value : findAvailableLine()
    if (!lineNumber) {
      throw new Error('No available lines')
    }

    // Auto-hold other lines
    if (autoHoldEnabled.value) {
      for (const line of lines.value) {
        if (line.status === 'active' && line.lineNumber !== lineNumber) {
          lines.value[line.lineNumber - 1].status = 'held'
          lines.value[line.lineNumber - 1].isOnHold = true
        }
      }
    }

    // Simulate call initiation
    await new Promise(resolve => setTimeout(resolve, 500))

    const idx = lineNumber - 1
    lines.value[idx] = {
      ...lines.value[idx],
      status: 'active',
      callId: `call-${Date.now()}`,
      callState: 'active',
      direction: 'outgoing',
      remoteUri: dialTarget.value,
      remoteDisplayName: null,
      duration: 0,
      timing: { startTime: new Date(), answerTime: new Date() },
    }

    startDurationTimer(lineNumber)
    selectLine(lineNumber)
    dialTarget.value = ''
    dialLine.value = 0
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Call failed'
  } finally {
    isLoading.value = false
  }
}

async function answerCall(lineNumber: number): Promise<void> {
  const idx = lineNumber - 1
  const line = lines.value[idx]
  if (!line || line.status !== 'ringing') return

  isLoading.value = true

  try {
    // Auto-hold other lines
    if (autoHoldEnabled.value) {
      for (const otherLine of lines.value) {
        if (otherLine.status === 'active' && otherLine.lineNumber !== lineNumber) {
          lines.value[otherLine.lineNumber - 1].status = 'held'
          lines.value[otherLine.lineNumber - 1].isOnHold = true
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 300))

    lines.value[idx] = {
      ...lines.value[idx],
      status: 'active',
      callState: 'active',
      duration: 0,
      timing: {
        ...line.timing,
        answerTime: new Date(),
      },
    }

    startDurationTimer(lineNumber)
    selectLine(lineNumber)
  } finally {
    isLoading.value = false
  }
}

async function rejectCall(lineNumber: number): Promise<void> {
  const idx = lineNumber - 1
  const line = lines.value[idx]
  if (!line || line.status !== 'ringing') return

  lines.value[idx] = {
    ...lines.value[idx],
    status: 'idle',
    callId: null,
    callState: null,
    direction: null,
    remoteUri: null,
    remoteDisplayName: null,
    timing: null,
  }
}

async function hangupCall(lineNumber: number): Promise<void> {
  const idx = lineNumber - 1
  const line = lines.value[idx]
  if (!line || line.status === 'idle') return

  stopDurationTimer(lineNumber)

  lines.value[idx] = {
    ...lines.value[idx],
    status: 'idle',
    callId: null,
    callState: null,
    direction: null,
    remoteUri: null,
    remoteDisplayName: null,
    isOnHold: false,
    isMuted: false,
    hasVideo: false,
    timing: null,
    duration: 0,
  }
}

async function toggleHoldLine(lineNumber: number): Promise<void> {
  const idx = lineNumber - 1
  const line = lines.value[idx]
  if (!line) return

  if (line.isOnHold) {
    // Unhold - auto-hold others
    if (autoHoldEnabled.value) {
      for (const otherLine of lines.value) {
        if (otherLine.status === 'active' && otherLine.lineNumber !== lineNumber) {
          lines.value[otherLine.lineNumber - 1].status = 'held'
          lines.value[otherLine.lineNumber - 1].isOnHold = true
        }
      }
    }

    lines.value[idx].status = 'active'
    lines.value[idx].isOnHold = false
  } else {
    lines.value[idx].status = 'held'
    lines.value[idx].isOnHold = true
  }
}

function toggleMuteLine(lineNumber: number): void {
  const idx = lineNumber - 1
  if (lines.value[idx]) {
    lines.value[idx].isMuted = !lines.value[idx].isMuted
  }
}

function holdAllLines(): void {
  for (const line of lines.value) {
    if (line.status === 'active') {
      lines.value[line.lineNumber - 1].status = 'held'
      lines.value[line.lineNumber - 1].isOnHold = true
    }
  }
}

async function hangupAll(): Promise<void> {
  for (const line of [...lines.value]) {
    if (line.status !== 'idle') {
      await hangupCall(line.lineNumber)
    }
  }
}

function handleSwap(): void {
  const active = activeLines.value[0]
  const held = heldLines.value[0]

  if (active && held) {
    // Swap active and held
    lines.value[active.lineNumber - 1].status = 'held'
    lines.value[active.lineNumber - 1].isOnHold = true
    lines.value[held.lineNumber - 1].status = 'active'
    lines.value[held.lineNumber - 1].isOnHold = false
    selectLine(held.lineNumber)
  }
}

function handleDTMF(digit: string): void {
  // In production, this would send DTMF via the SIP client
  console.log(`DTMF: ${digit} on line ${selectedLine.value}`)
}

function simulateIncomingCall(): void {
  const availableLine = findAvailableLine()
  if (!availableLine) return

  const idx = availableLine - 1
  lines.value[idx] = {
    ...lines.value[idx],
    status: 'ringing',
    callId: `call-incoming-${Date.now()}`,
    callState: 'ringing',
    direction: 'incoming',
    remoteUri: 'sip:alice@example.com',
    remoteDisplayName: 'Alice Smith',
    timing: { startTime: new Date() },
  }
}

// Cleanup
onUnmounted(() => {
  for (const [lineNumber] of durationTimers) {
    stopDurationTimer(lineNumber)
  }
})
</script>

<style scoped>
.multi-line-demo {
  max-width: 1000px;
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

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
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

.btn-primary { background: #667eea; color: white; }
.btn-primary:hover:not(:disabled) { background: #5568d3; }

.btn-secondary { background: #6b7280; color: white; }
.btn-secondary:hover:not(:disabled) { background: #4b5563; }

.btn-success { background: #10b981; color: white; }
.btn-success:hover:not(:disabled) { background: #059669; }

.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }

.btn-sm { padding: 0.5rem 1rem; font-size: 0.875rem; }

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 0.875rem;
}

.warning-message {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fef3c7;
  border-radius: 4px;
  color: #92400e;
  font-size: 0.75rem;
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

.status-item.ringing {
  color: #f59e0b;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.connected { background: #10b981; }

.status-icon { font-size: 1.25rem; }

/* Lines Grid */
.lines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.line-card {
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.line-card:hover {
  border-color: #667eea;
}

.line-card.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.line-card.idle { background: #f9fafb; }
.line-card.ringing {
  background: #fef3c7;
  border-color: #f59e0b;
  animation: ring-pulse 1s ease-in-out infinite;
}
.line-card.active { background: #d1fae5; border-color: #10b981; }
.line-card.held { background: #fef3c7; border-color: #f59e0b; }
.line-card.busy { background: #fee2e2; border-color: #ef4444; }

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.line-number {
  font-weight: 600;
  color: #374151;
}

.line-status {
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
}

.line-status.idle { background: #e5e7eb; color: #6b7280; }
.line-status.ringing { background: #f59e0b; color: white; }
.line-status.active { background: #10b981; color: white; }
.line-status.held { background: #6b7280; color: white; }
.line-status.busy { background: #ef4444; color: white; }

.line-content {
  min-height: 60px;
  margin-bottom: 0.75rem;
}

.line-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: #9ca3af;
}

.idle-icon { font-size: 1.5rem; }
.idle-text { font-size: 0.75rem; }

.line-ringing {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.caller-name {
  font-weight: 500;
  color: #1f2937;
}

.caller-uri {
  font-size: 0.75rem;
  color: #6b7280;
}

.ringing-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.line-active {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.remote-party {
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.call-duration {
  font-family: monospace;
  font-size: 1.25rem;
  color: #059669;
}

.call-indicators {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.indicator {
  padding: 0.125rem 0.375rem;
  background: #e5e7eb;
  border-radius: 4px;
  font-size: 0.65rem;
  color: #4b5563;
}

.line-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #f3f4f6;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e5e7eb;
}

.btn-icon.active {
  background: #667eea;
}

.btn-icon.hangup {
  background: #fee2e2;
}

.btn-icon.hangup:hover {
  background: #fecaca;
}

/* Dial Section */
.dial-section {
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.dial-section h3 {
  margin-bottom: 1rem;
  color: #111827;
}

.dial-form {
  display: flex;
  gap: 0.5rem;
}

.dial-form input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.dial-form select {
  width: 140px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

/* Actions Section */
.actions-section {
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.actions-section h3 {
  margin-bottom: 1rem;
  color: #111827;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* DTMF Section */
.dtmf-section {
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.dtmf-section h3 {
  margin-bottom: 1rem;
  color: #111827;
}

.dtmf-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  max-width: 240px;
}

.dtmf-btn {
  padding: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.1s;
}

.dtmf-btn:hover {
  background: #f3f4f6;
}

.dtmf-btn:active {
  background: #667eea;
  color: white;
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

  .lines-grid {
    grid-template-columns: 1fr;
  }

  .dial-form {
    flex-direction: column;
  }

  .dial-form select {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .btn {
    width: 100%;
  }
}
</style>
