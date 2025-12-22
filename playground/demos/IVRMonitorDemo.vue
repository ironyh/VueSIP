<template>
  <div class="ivr-monitor-demo">
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

    <div class="info-section">
      <p>
        Monitor IVR (Interactive Voice Response) systems in real-time. Track callers, view menu
        navigation, and breakout callers to live agents when needed.
      </p>
      <p class="note">
        <strong>Note:</strong> This demo simulates IVR monitoring. In production, data comes from
        AMI events tracking IVR activity.
      </p>
    </div>

    <!-- Controls -->
    <div class="controls-section">
      <div class="input-group">
        <label>IVR ID</label>
        <input
          v-model="newIVRId"
          type="text"
          placeholder="e.g., ivr-main"
          :disabled="isMonitoring"
        />
      </div>
      <div class="action-buttons">
        <button v-if="!isMonitoring" class="btn btn-primary" @click="handleStartMonitoring">
          Start Monitoring
        </button>
        <button v-else class="btn btn-danger" @click="handleStopMonitoring">Stop Monitoring</button>
        <button class="btn btn-secondary" :disabled="!isMonitoring" @click="handleRefresh">
          Refresh
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!isMonitoring || !newIVRId"
          @click="handleAddIVR"
        >
          Add IVR
        </button>
      </div>
    </div>

    <!-- IVR List -->
    <div v-if="ivrList.length > 0" class="ivrs-section">
      <h3>IVR Systems</h3>
      <div class="ivrs-grid">
        <div
          v-for="ivr in ivrList"
          :key="ivr.id"
          class="ivr-card"
          :class="{ selected: selectedIVR?.id === ivr.id, disabled: !ivr.enabled }"
          @click="selectIVR(ivr.id)"
        >
          <div class="ivr-header">
            <span class="ivr-id">{{ ivr.id }}</span>
            <span
              class="ivr-status"
              :class="{ active: ivr.callers.size > 0, disabled: !ivr.enabled }"
            >
              {{ ivr.enabled ? (ivr.callers.size > 0 ? 'Active' : 'Idle') : 'Disabled' }}
            </span>
          </div>
          <div class="ivr-name">{{ ivr.name }}</div>
          <div class="ivr-callers">
            <span class="callers-count">{{ ivr.callers.size }}</span> callers in IVR
          </div>
          <div class="ivr-stats">
            <span class="stat">
              <strong>{{ ivr.stats.totalCallers }}</strong> total
            </span>
            <span class="stat">
              <strong>{{ ivr.stats.abandonedCalls }}</strong> abandoned
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected IVR Details -->
    <div v-if="selectedIVR" class="ivr-details">
      <div class="details-header">
        <h3>{{ selectedIVR.name }} ({{ selectedIVR.id }})</h3>
        <div class="details-actions">
          <button
            v-if="selectedIVR.enabled"
            class="btn btn-sm btn-warning"
            @click="handleDisableIVR"
          >
            Disable
          </button>
          <button v-else class="btn btn-sm btn-success" @click="handleEnableIVR">Enable</button>
          <button class="btn btn-sm btn-secondary" @click="handleClearStats">Clear Stats</button>
        </div>
      </div>

      <!-- Callers in IVR -->
      <div class="callers-section">
        <div class="callers-header">
          <h4>Callers in IVR ({{ callersInSelectedIVR.length }})</h4>
          <button
            v-if="callersInSelectedIVR.length > 0"
            class="btn btn-sm btn-primary"
            @click="showBreakoutAllModal = true"
          >
            Breakout All
          </button>
        </div>

        <div v-if="callersInSelectedIVR.length > 0" class="callers-list">
          <div
            v-for="caller in callersInSelectedIVR"
            :key="caller.id"
            class="caller-item"
            :class="caller.state"
          >
            <div class="caller-info">
              <div class="caller-state-icon">{{ getStateIcon(caller.state) }}</div>
              <div class="caller-details">
                <span class="caller-id">{{ caller.callerIdNum }}</span>
                <span class="caller-name">{{ caller.callerIdName || 'Unknown' }}</span>
              </div>
            </div>
            <div class="caller-menu">
              <span class="menu-label">Menu:</span>
              <span class="menu-id">{{ caller.currentMenuId }}</span>
            </div>
            <div class="caller-time">
              <span class="time-label">Time:</span>
              <span class="time-value">{{ formatDuration(caller.enteredAt) }}</span>
            </div>
            <div class="caller-dtmf">
              <span class="dtmf-label">Input:</span>
              <span class="dtmf-value">{{ caller.dtmfInput || '-' }}</span>
            </div>
            <div class="caller-actions">
              <button class="btn btn-sm btn-primary" @click="openBreakoutModal(caller)">
                Breakout
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-callers">No callers currently in this IVR.</div>
      </div>

      <!-- Statistics -->
      <div class="stats-section">
        <h4>Statistics</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ selectedIVR.stats.totalCallers }}</div>
            <div class="stat-label">Total Callers</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selectedIVR.stats.currentCallers }}</div>
            <div class="stat-label">Current</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selectedIVR.stats.successfulExits }}</div>
            <div class="stat-label">Successful</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selectedIVR.stats.abandonedCalls }}</div>
            <div class="stat-label">Abandoned</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selectedIVR.stats.timedOutCalls }}</div>
            <div class="stat-label">Timed Out</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selectedIVR.stats.peakCallers }}</div>
            <div class="stat-label">Peak</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatAvgTime(selectedIVR.stats.avgTimeInIVR) }}</div>
            <div class="stat-label">Avg Time</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ selectedIVR.stats.avgMenuSelections.toFixed(1) }}</div>
            <div class="stat-label">Avg Selections</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Simulation Controls -->
    <div v-if="isMonitoring && selectedIVR" class="simulation-section">
      <h4>Simulate Activity</h4>
      <div class="simulation-buttons">
        <button class="btn btn-secondary" @click="simulateCallerEnter">
          Simulate Caller Enter
        </button>
        <button class="btn btn-secondary" @click="simulateDTMF">Simulate DTMF</button>
        <button class="btn btn-secondary" @click="simulateCallerExit">Simulate Caller Exit</button>
        <button class="btn btn-secondary" @click="simulateAbandon">Simulate Abandon</button>
      </div>
    </div>

    <!-- Breakout Modal -->
    <div v-if="showBreakoutModal" class="modal-overlay" @click.self="showBreakoutModal = false">
      <div class="modal">
        <h4>Breakout Caller</h4>
        <p>Transfer {{ breakoutTarget?.callerIdNum }} to:</p>
        <input v-model="breakoutDestination" type="text" placeholder="Extension (e.g., 1001)" />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showBreakoutModal = false">Cancel</button>
          <button class="btn btn-primary" :disabled="!breakoutDestination" @click="handleBreakout">
            Breakout
          </button>
        </div>
      </div>
    </div>

    <!-- Breakout All Modal -->
    <div
      v-if="showBreakoutAllModal"
      class="modal-overlay"
      @click.self="showBreakoutAllModal = false"
    >
      <div class="modal">
        <h4>Breakout All Callers</h4>
        <p>Transfer all {{ callersInSelectedIVR.length }} callers to:</p>
        <input v-model="breakoutDestination" type="text" placeholder="Extension (e.g., 1001)" />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showBreakoutAllModal = false">Cancel</button>
          <button
            class="btn btn-primary"
            :disabled="!breakoutDestination"
            @click="handleBreakoutAll"
          >
            Breakout All
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isMonitoring" class="empty-state">
      <div class="empty-icon">IVR</div>
      <h4>IVR Monitoring</h4>
      <p>Enter an IVR ID and click "Start Monitoring" to track IVR activity.</p>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useAmi, useAmiIVR } from 'vuesip'

const ami = useAmi()
const {
  ivrs,
  ivrList,
  allCallers,
  startMonitoring,
  breakoutCaller,
  breakoutAllCallers,
  getStats
} = useAmiIVR(ami.getClient(), {
  ivrIds: ['ivr-main', 'ivr-support'],
  onCallerEntered: (ivrId, caller) => {
    console.log(`Caller ${caller.callerIdNum} entered ${ivrId}`)
  },
  onCallerExited: (ivrId, callerId, destination) => {
    console.log(`Caller exited to ${destination}`)
  },
  onTimeout: (ivrId, caller) => {
    console.log(`Caller ${caller.callerIdNum} timed out`)
  }
})

// Start monitoring
startMonitoring()

// Breakout a caller to an extension
await breakoutCaller('ivr-main', channelId, '1001')

// Breakout all callers
await breakoutAllCallers('ivr-main', '1001')</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch as _watch } from 'vue'
import type { IVR, IVRCaller, IVRCallerState, IVRStats } from '../../src/types/ivr.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Simulated state
const ivrs = ref<Map<string, IVR>>(new Map())
const selectedIVRId = ref<string | null>(null)
const isMonitoring = ref(false)

// Form inputs
const newIVRId = ref('ivr-main')
const breakoutDestination = ref('')
const showBreakoutModal = ref(false)
const showBreakoutAllModal = ref(false)
const breakoutTarget = ref<IVRCaller | null>(null)

// Simulation counter
let simulationCounter = 0

// Input validation
function isValidIVRId(ivrId: string): boolean {
  if (!ivrId || typeof ivrId !== 'string') return false
  return /^[a-zA-Z0-9_-]+$/.test(ivrId) && ivrId.length <= 64
}

function isValidDestination(dest: string): boolean {
  if (!dest || typeof dest !== 'string') return false
  return /^[a-zA-Z0-9_*#-]+$/.test(dest) && dest.length <= 32
}

// Computed
const ivrList = computed(() => Array.from(ivrs.value.values()))

const selectedIVR = computed(() =>
  selectedIVRId.value ? ivrs.value.get(selectedIVRId.value) || null : null
)

const callersInSelectedIVR = computed(() =>
  selectedIVR.value ? Array.from(selectedIVR.value.callers.values()) : []
)

// Utility functions
function getStateIcon(state: IVRCallerState): string {
  const icons: Record<IVRCallerState, string> = {
    entering: 'ENTER',
    listening: 'LISTEN',
    inputting: 'INPUT',
    navigating: 'NAV',
    transferring: 'XFER',
    exiting: 'EXIT',
    timeout: 'TIME',
    error: 'ERR',
  }
  return icons[state] || 'UNKN'
}

function formatDuration(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatAvgTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function createEmptyStats(): IVRStats {
  return {
    totalCallers: 0,
    currentCallers: 0,
    successfulExits: 0,
    abandonedCalls: 0,
    timedOutCalls: 0,
    avgTimeInIVR: 0,
    avgMenuSelections: 0,
    peakCallers: 0,
  }
}

function createEmptyIVR(id: string): IVR {
  const rootMenuId = `${id}-main`
  return {
    id,
    name: `IVR ${id}`,
    extension: id,
    rootMenuId,
    menus: new Map(),
    callers: new Map(),
    stats: createEmptyStats(),
    enabled: true,
    lastUpdated: new Date(),
  }
}

// Handlers
function handleStartMonitoring() {
  isMonitoring.value = true

  if (newIVRId.value && isValidIVRId(newIVRId.value) && !ivrs.value.has(newIVRId.value)) {
    ivrs.value.set(newIVRId.value, createEmptyIVR(newIVRId.value))
  }

  if (ivrs.value.size > 0) {
    selectedIVRId.value = Array.from(ivrs.value.keys())[0]
  }
}

function handleStopMonitoring() {
  isMonitoring.value = false
  selectedIVRId.value = null
}

function handleRefresh() {
  if (selectedIVR.value) {
    selectedIVR.value.lastUpdated = new Date()
  }
}

function handleAddIVR() {
  if (!newIVRId.value || !isValidIVRId(newIVRId.value)) return

  if (!ivrs.value.has(newIVRId.value)) {
    ivrs.value.set(newIVRId.value, createEmptyIVR(newIVRId.value))
    selectedIVRId.value = newIVRId.value
  }
}

function selectIVR(ivrId: string) {
  selectedIVRId.value = ivrId
}

function handleEnableIVR() {
  if (selectedIVR.value) {
    selectedIVR.value.enabled = true
    selectedIVR.value.lastUpdated = new Date()
  }
}

function handleDisableIVR() {
  if (selectedIVR.value) {
    selectedIVR.value.enabled = false
    selectedIVR.value.lastUpdated = new Date()
  }
}

function handleClearStats() {
  if (selectedIVR.value) {
    selectedIVR.value.stats = createEmptyStats()
    selectedIVR.value.stats.currentCallers = selectedIVR.value.callers.size
    selectedIVR.value.lastUpdated = new Date()
  }
}

function openBreakoutModal(caller: IVRCaller) {
  breakoutTarget.value = caller
  breakoutDestination.value = ''
  showBreakoutModal.value = true
}

function handleBreakout() {
  if (!selectedIVR.value || !breakoutTarget.value || !breakoutDestination.value) return
  if (!isValidDestination(breakoutDestination.value)) return

  // Remove caller from IVR
  selectedIVR.value.callers.delete(breakoutTarget.value.id)
  selectedIVR.value.stats.currentCallers = selectedIVR.value.callers.size
  selectedIVR.value.stats.successfulExits++
  selectedIVR.value.lastUpdated = new Date()

  showBreakoutModal.value = false
  breakoutTarget.value = null
}

function handleBreakoutAll() {
  if (!selectedIVR.value || !breakoutDestination.value) return
  if (!isValidDestination(breakoutDestination.value)) return

  const count = selectedIVR.value.callers.size
  selectedIVR.value.callers.clear()
  selectedIVR.value.stats.currentCallers = 0
  selectedIVR.value.stats.successfulExits += count
  selectedIVR.value.lastUpdated = new Date()

  showBreakoutAllModal.value = false
}

// Simulation functions
function simulateCallerEnter() {
  if (!selectedIVR.value) return

  simulationCounter++
  const channel = `PJSIP/caller${simulationCounter}-0000000${simulationCounter}`
  const caller: IVRCaller = {
    id: channel,
    channel,
    callerIdNum: `555${String(simulationCounter).padStart(7, '0')}`,
    callerIdName: `Caller ${simulationCounter}`,
    ivrId: selectedIVR.value.id,
    currentMenuId: selectedIVR.value.rootMenuId,
    state: 'listening',
    enteredAt: new Date(),
    menuEnteredAt: new Date(),
    navigationHistory: [selectedIVR.value.rootMenuId],
    dtmfInput: '',
    invalidAttempts: 0,
    timedOut: false,
    lastActivity: new Date(),
  }

  selectedIVR.value.callers.set(channel, caller)
  selectedIVR.value.stats.totalCallers++
  selectedIVR.value.stats.currentCallers = selectedIVR.value.callers.size

  if (selectedIVR.value.callers.size > selectedIVR.value.stats.peakCallers) {
    selectedIVR.value.stats.peakCallers = selectedIVR.value.callers.size
  }

  selectedIVR.value.lastUpdated = new Date()
}

function simulateDTMF() {
  if (!selectedIVR.value || selectedIVR.value.callers.size === 0) return

  const caller = Array.from(selectedIVR.value.callers.values())[0]
  const digit = String(Math.floor(Math.random() * 10))
  caller.dtmfInput += digit
  caller.state = 'inputting'
  caller.lastActivity = new Date()
  selectedIVR.value.lastUpdated = new Date()
}

function simulateCallerExit() {
  if (!selectedIVR.value || selectedIVR.value.callers.size === 0) return

  const callerId = Array.from(selectedIVR.value.callers.keys())[0]
  selectedIVR.value.callers.delete(callerId)
  selectedIVR.value.stats.currentCallers = selectedIVR.value.callers.size
  selectedIVR.value.stats.successfulExits++
  selectedIVR.value.stats.lastCallTime = new Date()
  selectedIVR.value.lastUpdated = new Date()
}

function simulateAbandon() {
  if (!selectedIVR.value || selectedIVR.value.callers.size === 0) return

  const callerId = Array.from(selectedIVR.value.callers.keys())[0]
  selectedIVR.value.callers.delete(callerId)
  selectedIVR.value.stats.currentCallers = selectedIVR.value.callers.size
  selectedIVR.value.stats.abandonedCalls++
  selectedIVR.value.stats.lastCallTime = new Date()
  selectedIVR.value.lastUpdated = new Date()
}

// Cleanup
onUnmounted(() => {
  handleStopMonitoring()
})
</script>

<style scoped>
.ivr-monitor-demo {
  padding: var(--spacing-md);
  max-width: 1200px;
  margin: 0 auto;
}

.info-section {
  margin-bottom: var(--spacing-2xl);
  line-height: 1.6;
  color: var(--text-secondary);
}

.note {
  background: var(--bg-warning-light);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--color-warning);
  font-size: var(--text-sm);
  margin-top: var(--spacing-md);
  transition: all var(--transition-base);
}

.note:hover {
  box-shadow: var(--shadow-sm);
  transform: translateX(2px);
}

.note strong {
  color: var(--color-warning);
  font-weight: var(--font-semibold);
}

.controls-section {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: var(--spacing-2xl);
  padding: var(--spacing-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.input-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.input-group input {
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  width: 150px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.input-group input:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-group input:disabled {
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.btn-primary {
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
}

.btn-primary:hover:not(:disabled) {
  background: var(--gradient-blue-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-blue);
}

.btn-secondary {
  background: var(--bg-neutral-light);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-danger {
  background: var(--gradient-red);
  color: var(--text-on-gradient);
}

.btn-danger:hover:not(:disabled) {
  background: var(--gradient-red-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.btn-success {
  background: var(--gradient-green);
  color: var(--text-on-gradient);
}

.btn-success:hover:not(:disabled) {
  background: var(--gradient-green-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-green);
}

.btn-warning {
  background: var(--gradient-orange);
  color: var(--text-on-gradient);
}

.btn-warning:hover:not(:disabled) {
  background: var(--gradient-orange-hover);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
}

.btn-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
}

.btn:disabled {
  background: var(--bg-neutral-light);
  color: var(--color-neutral);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.ivrs-section {
  margin-bottom: var(--spacing-2xl);
}

.ivrs-section h3 {
  margin-bottom: var(--spacing-md);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.ivrs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-md);
}

.ivr-card {
  position: relative;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-base);
  overflow: hidden;
}

.ivr-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-blue);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.ivr-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-info);
}

.ivr-card:hover::before {
  opacity: 1;
}

.ivr-card.selected {
  border-color: var(--color-info);
  background: var(--bg-info-light);
}

.ivr-card.selected::before {
  opacity: 1;
}

.ivr-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ivr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.ivr-id {
  font-weight: var(--font-semibold);
  font-size: var(--text-lg);
  color: var(--text-primary);
}

.ivr-status {
  font-size: var(--text-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  background: var(--bg-neutral-light);
  color: var(--text-on-gradient);
  font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}

.ivr-status.active {
  background: var(--gradient-green);
  box-shadow: var(--shadow-green);
}

.ivr-status.disabled {
  background: var(--gradient-red);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.2);
}

.ivr-name {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-sm);
}

.ivr-callers {
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-sm);
  color: var(--text-secondary);
}

.callers-count {
  font-weight: var(--font-semibold);
  color: var(--color-info);
}

.ivr-stats {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.ivr-stats .stat strong {
  color: var(--text-primary);
  font-weight: var(--font-semibold);
}

.ivr-details {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
  box-shadow: var(--shadow-md);
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.details-header h3 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.details-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.callers-section {
  margin-bottom: var(--spacing-xl);
}

.callers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.callers-header h4 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.callers-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.caller-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
  transition: all var(--transition-base);
}

.caller-item:hover {
  background: var(--bg-hover);
  box-shadow: var(--shadow-sm);
  transform: translateX(4px);
}

.caller-item.timeout {
  background: var(--bg-warning-light);
  border-color: var(--color-warning);
}

.caller-item.error {
  background: var(--bg-danger-light);
  border-color: var(--color-danger);
}

.caller-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
  min-width: 150px;
}

.caller-state-icon {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
  border-radius: var(--radius-sm);
  min-width: 50px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.caller-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.caller-id {
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.caller-name {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.caller-menu,
.caller-time,
.caller-dtmf {
  font-size: var(--text-sm);
  display: flex;
  gap: var(--spacing-xs);
}

.menu-label,
.time-label,
.dtmf-label {
  color: var(--text-tertiary);
  font-weight: var(--font-medium);
}

.menu-id {
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.time-value {
  font-family: var(--font-mono);
  color: var(--text-primary);
  font-weight: var(--font-semibold);
}

.dtmf-value {
  font-family: var(--font-mono);
  font-weight: var(--font-semibold);
  color: var(--color-info);
}

.empty-callers {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--text-tertiary);
  font-size: var(--text-sm);
}

.stats-section h4 {
  margin-bottom: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  text-align: center;
  transition: all var(--transition-base);
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-blue);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-info);
  margin-bottom: var(--spacing-xs);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--font-medium);
}

.simulation-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-2xl);
  box-shadow: var(--shadow-sm);
}

.simulation-section h4 {
  margin-bottom: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.simulation-buttons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-card);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  min-width: 350px;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-color);
  z-index: var(--z-modal);
}

.modal h4 {
  margin-top: 0;
  margin-bottom: var(--spacing-lg);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.modal input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin: var(--spacing-md) 0;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.modal input:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  padding: var(--spacing-md) var(--spacing-xl);
  margin-bottom: var(--spacing-md);
  background: var(--bg-neutral-light);
  color: var(--text-tertiary);
  border-radius: var(--radius-md);
  display: inline-block;
  transition: all var(--transition-base);
}

.empty-icon:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-sm);
}

.code-example {
  margin-top: var(--spacing-xl);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  overflow-x: auto;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.code-example h4 {
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.code-example pre {
  margin: 0;
  background: var(--bg-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.code-example code {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
}
</style>
