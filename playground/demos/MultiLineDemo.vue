<template>
  <div class="multi-line-demo">
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
    <Card v-if="!sipConnected" class="demo-card config-card">
      <template #title>
        <div class="demo-header">
          <i class="pi pi-phone" style="font-size: 1.5rem; color: var(--primary-500)"></i>
          <span>Multi-Line Configuration</span>
        </div>
      </template>
      <template #content>
        <Message severity="info" :closable="false" class="config-message">
          Configure your SIP connection to test multi-line call functionality. This demo supports
          multiple concurrent calls across different lines.
        </Message>

        <div class="form-grid">
          <div class="form-field">
            <label for="sip-server">SIP Server</label>
            <InputText
              id="sip-server"
              v-model="config.server"
              placeholder="wss://sip.example.com"
              :disabled="connecting"
              class="w-full"
            />
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="sip-username">Username</label>
              <InputText
                id="sip-username"
                v-model="config.username"
                placeholder="1001"
                :disabled="connecting"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="sip-password">Password</label>
              <Password
                id="sip-password"
                v-model="config.password"
                placeholder="Enter password"
                :disabled="connecting"
                :feedback="false"
                toggle-mask
                class="w-full"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="line-count">Number of Lines</label>
            <Dropdown
              id="line-count"
              v-model="lineCountConfig"
              :options="lineCountOptions"
              option-label="label"
              option-value="value"
              :disabled="connecting"
              placeholder="Select number of lines"
              class="w-full"
            />
            <small class="field-hint">Number of simultaneous call lines to support</small>
          </div>

          <div class="form-field checkbox-field">
            <Checkbox
              id="auto-hold"
              v-model="autoHoldEnabled"
              :binary="true"
              :disabled="connecting"
            />
            <label for="auto-hold">Auto-hold other lines when making/answering calls</label>
          </div>

          <Button
            label="Connect"
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
            <strong>Tip:</strong> Multi-line support allows handling multiple calls simultaneously.
            Each line can be independently controlled (hold, mute, transfer).
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
                <span>SIP Connected</span>
              </div>
              <Divider layout="vertical" />
              <div class="status-item">
                <i class="pi pi-phone"></i>
                <span>Active: {{ activeCallCount }}</span>
              </div>
              <Divider layout="vertical" v-if="incomingCallCount > 0" />
              <div v-if="incomingCallCount > 0" class="status-item ringing">
                <i class="pi pi-bell"></i>
                <span>Incoming: {{ incomingCallCount }}</span>
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

      <!-- Lines Grid -->
      <div class="lines-grid">
        <Card
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
          <template #title>
            <div class="line-header">
              <span class="line-number">Line {{ line.lineNumber }}</span>
              <Tag :value="formatStatus(line.status)" :severity="getLineSeverity(line.status)" />
            </div>
          </template>
          <template #content>
            <div class="line-content">
              <!-- Idle State -->
              <div v-if="line.status === 'idle'" class="line-idle">
                <i class="pi pi-phone idle-icon"></i>
                <span class="idle-text">Available</span>
              </div>

              <!-- Ringing State -->
              <div v-else-if="line.status === 'ringing'" class="line-ringing">
                <div class="caller-info">
                  <span class="caller-name">{{ line.remoteDisplayName || 'Unknown' }}</span>
                  <span class="caller-uri">{{ line.remoteUri }}</span>
                </div>
                <div class="ringing-actions">
                  <Button
                    label="Answer"
                    icon="pi pi-check"
                    severity="success"
                    size="small"
                    @click.stop="answerCall(line.lineNumber)"
                  />
                  <Button
                    label="Reject"
                    icon="pi pi-times"
                    severity="danger"
                    size="small"
                    @click.stop="rejectCall(line.lineNumber)"
                  />
                </div>
              </div>

              <!-- Active/Held State -->
              <div v-else class="line-active">
                <div class="remote-info">
                  <span class="remote-party">{{ line.remoteDisplayName || line.remoteUri }}</span>
                  <span class="call-duration">{{ formatDuration(line.duration) }}</span>
                </div>
                <div class="call-indicators">
                  <Tag v-if="line.isOnHold" value="Hold" severity="warning" size="small" />
                  <Tag v-if="line.isMuted" value="Muted" severity="secondary" size="small" />
                  <Tag v-if="line.hasVideo" value="Video" severity="info" size="small" />
                </div>
              </div>
            </div>

            <!-- Line Controls -->
            <div v-if="line.status !== 'idle'" class="line-controls">
              <Button
                v-if="line.status === 'active' || line.status === 'held'"
                :icon="line.isOnHold ? 'pi pi-play' : 'pi pi-pause'"
                :severity="line.isOnHold ? 'info' : 'warning'"
                :label="line.isOnHold ? 'Resume' : 'Hold'"
                size="small"
                text
                rounded
                v-tooltip.top="line.isOnHold ? 'Resume call' : 'Put on hold'"
                @click.stop="toggleHoldLine(line.lineNumber)"
              />

              <Button
                v-if="line.status === 'active'"
                :icon="line.isMuted ? 'pi pi-volume-up' : 'pi pi-volume-off'"
                :severity="line.isMuted ? 'info' : 'secondary'"
                :label="line.isMuted ? 'Unmute' : 'Mute'"
                size="small"
                text
                rounded
                v-tooltip.top="line.isMuted ? 'Unmute microphone' : 'Mute microphone'"
                @click.stop="toggleMuteLine(line.lineNumber)"
              />

              <Button
                v-if="line.status !== 'ringing'"
                icon="pi pi-phone"
                severity="danger"
                label="End"
                size="small"
                text
                rounded
                v-tooltip.top="'End call'"
                @click.stop="hangupCall(line.lineNumber)"
              />
            </div>
          </template>
        </Card>
      </div>

      <!-- Dial Section -->
      <Card class="demo-card dial-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-phone" style="color: var(--primary-500)"></i>
            <span>Make Call</span>
          </div>
        </template>
        <template #content>
          <div class="dial-form">
            <InputText
              v-model="dialTarget"
              placeholder="Enter number or SIP URI"
              :disabled="isLoading || allLinesBusy"
              class="dial-input"
              @keyup.enter="handleDial"
            />
            <Dropdown
              v-model="dialLine"
              :options="dialLineOptions"
              option-label="label"
              option-value="value"
              :disabled="isLoading || availableLines.length === 0"
              placeholder="Line"
              class="line-select"
            />
            <Button
              label="Call"
              icon="pi pi-phone"
              :loading="isLoading"
              :disabled="!dialTarget || isLoading || allLinesBusy"
              @click="handleDial"
            />
          </div>
          <Message v-if="allLinesBusy" severity="warn" :closable="false" class="busy-message">
            All lines are busy. Hangup a call to make a new one.
          </Message>
        </template>
      </Card>

      <!-- Quick Actions -->
      <Card class="demo-card actions-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-bolt" style="color: var(--primary-500)"></i>
            <span>Quick Actions</span>
          </div>
        </template>
        <template #content>
          <div class="action-buttons">
            <Button
              label="Hold All"
              icon="pi pi-pause"
              severity="warning"
              :disabled="activeLines.length === 0"
              @click="holdAllLines"
            />
            <Button
              label="Hangup All"
              icon="pi pi-times"
              severity="danger"
              :disabled="activeCallCount === 0"
              @click="hangupAll"
            />
            <Button
              label="Swap Lines"
              icon="pi pi-arrows-h"
              severity="secondary"
              :disabled="heldLines.length < 2 && activeLines.length < 1"
              @click="handleSwap"
            />
          </div>
        </template>
      </Card>

      <!-- DTMF Pad -->
      <Card v-if="selectedLineState?.status === 'active'" class="demo-card dtmf-card">
        <template #title>
          <div class="section-header">
            <i class="pi pi-th" style="color: var(--primary-500)"></i>
            <span>DTMF (Line {{ selectedLine }})</span>
          </div>
        </template>
        <template #content>
          <div class="dtmf-pad">
            <Button
              v-for="digit in dtmfDigits"
              :key="digit"
              :label="digit"
              severity="secondary"
              outlined
              @click="handleDTMF(digit)"
              class="dtmf-button"
            />
          </div>
        </template>
      </Card>

      <!-- Error Display -->
      <Message v-if="error" severity="error" :closable="true" @close="error = null">
        {{ error }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import type { LineState, LineStatus } from '../../src/types/multiline.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Configuration state
const realSipConnected = ref(false)

// Effective values for simulation
const sipConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realSipConnected.value
)
const connecting = ref(false)
const connectionError = ref('')
const lineCountConfig = ref(4)
const autoHoldEnabled = ref(true)

const config = reactive({
  server: 'wss://sip.example.com',
  username: '',
  password: '',
})

// Line count options
const lineCountOptions = [
  { label: '2 Lines', value: 2 },
  { label: '3 Lines', value: 3 },
  { label: '4 Lines', value: 4 },
  { label: '6 Lines', value: 6 },
]

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
const isConfigValid = computed(() => config.server && config.username && config.password)

const selectedLineState = computed(
  () => lines.value.find((l) => l.lineNumber === selectedLine.value) ?? null
)

const activeCallCount = computed(
  () => lines.value.filter((l) => l.status === 'active' || l.status === 'held').length
)

const incomingCallCount = computed(() => lines.value.filter((l) => l.status === 'ringing').length)

const allLinesBusy = computed(() => lines.value.every((l) => l.status !== 'idle'))

const availableLines = computed(() => lines.value.filter((l) => l.status === 'idle'))

const activeLines = computed(() => lines.value.filter((l) => l.status === 'active'))

const heldLines = computed(() => lines.value.filter((l) => l.status === 'held'))

const dialLineOptions = computed(() => [
  { label: 'Auto-select line', value: 0 },
  ...availableLines.value.map((line) => ({
    label: `Line ${line.lineNumber}`,
    value: line.lineNumber,
  })),
])

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

function getLineSeverity(status: LineStatus): 'success' | 'info' | 'warning' | 'danger' | 'secondary' {
  const severities: Record<LineStatus, 'success' | 'info' | 'warning' | 'danger' | 'secondary'> = {
    idle: 'secondary',
    ringing: 'warning',
    active: 'success',
    held: 'info',
    busy: 'danger',
    error: 'danger',
  }
  return severities[status] || 'secondary'
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
    await new Promise((resolve) => setTimeout(resolve, 1000))

    initializeLines(lineCountConfig.value)
    realSipConnected.value = true

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
  realSipConnected.value = false
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
    await new Promise((resolve) => setTimeout(resolve, 500))

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

    await new Promise((resolve) => setTimeout(resolve, 300))

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
  max-width: 1200px;
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
  max-width: 600px;
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

.field-hint {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.checkbox-field label {
  margin: 0;
  cursor: pointer;
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

.status-item.ringing {
  color: var(--orange-500);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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

/* Lines Grid */
.lines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin: 0 1.5rem 1.5rem;
}

.line-card {
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.line-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.line-card.selected {
  border: 2px solid var(--primary-500);
  box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.2);
}

.line-card.idle {
  background: linear-gradient(135deg, var(--surface-50) 0%, var(--surface-100) 100%);
}

.line-card.ringing {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: var(--orange-400);
  animation: ring-pulse 1s ease-in-out infinite;
}

.line-card.active {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: var(--green-400);
}

.line-card.held {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: var(--blue-400);
}

.line-card.busy {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: var(--red-400);
}

@keyframes ring-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.line-number {
  font-weight: 600;
  font-size: 0.875rem;
}

.line-content {
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.line-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color-secondary);
}

.idle-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.idle-text {
  font-size: 0.875rem;
}

.line-ringing {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.caller-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.caller-name {
  font-weight: 600;
  color: var(--text-color);
}

.caller-uri {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.ringing-actions {
  display: flex;
  gap: 0.5rem;
}

.line-active {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.remote-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.remote-party {
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.call-duration {
  font-family: monospace;
  font-size: 1.5rem;
  color: var(--green-600);
  font-weight: 600;
}

.call-indicators {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.line-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--surface-border);
  margin-top: 0.75rem;
}

/* Dial Section */
.dial-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.dial-input {
  flex: 1;
}

.line-select {
  min-width: 160px;
}

.busy-message {
  margin-top: 1rem;
}

/* Actions Section */
.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* DTMF Section */
.dtmf-pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  max-width: 300px;
}

.dtmf-button {
  aspect-ratio: 1;
  font-size: 1.25rem;
  font-weight: 600;
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

  .lines-grid {
    grid-template-columns: 1fr;
    margin: 0 1rem 1.5rem;
  }

  .dial-form {
    flex-direction: column;
  }

  .dial-input,
  .line-select {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .p-button {
    width: 100%;
  }
}
</style>
