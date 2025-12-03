<template>
  <div class="ivr-monitor-demo">
    <div class="info-section">
      <p>
        Monitor IVR (Interactive Voice Response) systems in real-time. Track callers,
        view menu navigation, and breakout callers to live agents when needed.
      </p>
      <p class="note">
        <strong>Note:</strong> This demo simulates IVR monitoring. In production,
        data comes from AMI events tracking IVR activity.
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
        <button
          v-if="!isMonitoring"
          class="btn btn-primary"
          @click="handleStartMonitoring"
        >
          Start Monitoring
        </button>
        <button
          v-else
          class="btn btn-danger"
          @click="handleStopMonitoring"
        >
          Stop Monitoring
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!isMonitoring"
          @click="handleRefresh"
        >
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
            <span class="ivr-status" :class="{ active: ivr.callers.size > 0, disabled: !ivr.enabled }">
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
          <button
            v-else
            class="btn btn-sm btn-success"
            @click="handleEnableIVR"
          >
            Enable
          </button>
          <button
            class="btn btn-sm btn-secondary"
            @click="handleClearStats"
          >
            Clear Stats
          </button>
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
              <button
                class="btn btn-sm btn-primary"
                @click="openBreakoutModal(caller)"
              >
                Breakout
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-callers">
          No callers currently in this IVR.
        </div>
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
        <button class="btn btn-secondary" @click="simulateDTMF">
          Simulate DTMF
        </button>
        <button class="btn btn-secondary" @click="simulateCallerExit">
          Simulate Caller Exit
        </button>
        <button class="btn btn-secondary" @click="simulateAbandon">
          Simulate Abandon
        </button>
      </div>
    </div>

    <!-- Breakout Modal -->
    <div v-if="showBreakoutModal" class="modal-overlay" @click.self="showBreakoutModal = false">
      <div class="modal">
        <h4>Breakout Caller</h4>
        <p>Transfer {{ breakoutTarget?.callerIdNum }} to:</p>
        <input
          v-model="breakoutDestination"
          type="text"
          placeholder="Extension (e.g., 1001)"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showBreakoutModal = false">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            :disabled="!breakoutDestination"
            @click="handleBreakout"
          >
            Breakout
          </button>
        </div>
      </div>
    </div>

    <!-- Breakout All Modal -->
    <div v-if="showBreakoutAllModal" class="modal-overlay" @click.self="showBreakoutAllModal = false">
      <div class="modal">
        <h4>Breakout All Callers</h4>
        <p>Transfer all {{ callersInSelectedIVR.length }} callers to:</p>
        <input
          v-model="breakoutDestination"
          type="text"
          placeholder="Extension (e.g., 1001)"
        />
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showBreakoutAllModal = false">
            Cancel
          </button>
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
      <div class="empty-icon">📞</div>
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
import { ref, computed, onUnmounted } from 'vue'
import type {
  IVR,
  IVRCaller,
  IVRCallerState,
  IVRStats,
} from '../../src/types/ivr.types'

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
    entering: '➡️',
    listening: '👂',
    inputting: '🔢',
    navigating: '🔄',
    transferring: '📤',
    exiting: '🚪',
    timeout: '⏰',
    error: '❌',
  }
  return icons[state] || '❓'
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
  padding: 1rem;
}

.info-section {
  margin-bottom: 1.5rem;
}

.note {
  background: var(--color-warning-bg, #fff3cd);
  padding: 0.75rem;
  border-radius: 4px;
  border-left: 4px solid var(--color-warning, #ffc107);
  font-size: 0.9rem;
}

.controls-section {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group label {
  font-size: 0.85rem;
  font-weight: 500;
}

.input-group input {
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  width: 150px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary { background: var(--color-primary, #007bff); color: white; }
.btn-secondary { background: var(--color-secondary, #6c757d); color: white; }
.btn-danger { background: var(--color-danger, #dc3545); color: white; }
.btn-success { background: var(--color-success, #28a745); color: white; }
.btn-warning { background: var(--color-warning, #ffc107); color: #212529; }
.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.85rem; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.ivrs-section {
  margin-bottom: 2rem;
}

.ivrs-section h3 {
  margin-bottom: 1rem;
}

.ivrs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.ivr-card {
  background: var(--color-card-bg, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.ivr-card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
.ivr-card.selected { border-color: var(--color-primary, #007bff); background: var(--color-primary-bg, #e7f1ff); }
.ivr-card.disabled { opacity: 0.6; }

.ivr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.ivr-id { font-weight: 600; font-size: 1.1rem; }

.ivr-status {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  background: var(--color-secondary, #6c757d);
  color: white;
}

.ivr-status.active { background: var(--color-success, #28a745); }
.ivr-status.disabled { background: var(--color-danger, #dc3545); }

.ivr-name {
  color: var(--color-text-secondary, #666);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.ivr-callers {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.callers-count {
  font-weight: 600;
  color: var(--color-primary, #007bff);
}

.ivr-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
}

.ivr-details {
  background: var(--color-card-bg, #fff);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.details-header h3 { margin: 0; }
.details-actions { display: flex; gap: 0.5rem; }

.callers-section {
  margin-bottom: 1.5rem;
}

.callers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.callers-header h4 { margin: 0; }

.callers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.caller-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--color-bg-secondary, #f8f9fa);
  border-radius: 6px;
  flex-wrap: wrap;
}

.caller-item.timeout { background: var(--color-warning-bg, #fff3cd); }
.caller-item.error { background: var(--color-danger-bg, #f8d7da); }

.caller-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 150px;
}

.caller-state-icon { font-size: 1.2rem; }

.caller-details {
  display: flex;
  flex-direction: column;
}

.caller-id { font-weight: 600; }
.caller-name { font-size: 0.85rem; color: var(--color-text-secondary, #666); }

.caller-menu,
.caller-time,
.caller-dtmf {
  font-size: 0.85rem;
}

.menu-label,
.time-label,
.dtmf-label {
  color: var(--color-text-secondary, #666);
  margin-right: 0.25rem;
}

.menu-id { font-family: monospace; }
.dtmf-value { font-family: monospace; font-weight: 600; }

.empty-callers {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary, #666);
}

.stats-section h4 { margin-bottom: 0.75rem; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--color-bg-secondary, #f8f9fa);
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary, #007bff);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #666);
}

.simulation-section {
  background: var(--color-bg-secondary, #f8f9fa);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.simulation-section h4 { margin-bottom: 0.75rem; }
.simulation-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-card-bg, #fff);
  padding: 1.5rem;
  border-radius: 8px;
  min-width: 300px;
}

.modal h4 { margin-top: 0; }

.modal input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  margin: 1rem 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #666);
}

.empty-icon { font-size: 3rem; margin-bottom: 1rem; }

.code-example {
  margin-top: 2rem;
  background: var(--color-code-bg, #1e1e1e);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.code-example h4 {
  color: var(--color-text-light, #fff);
  margin-bottom: 0.75rem;
}

.code-example pre { margin: 0; }

.code-example code {
  color: var(--color-code-text, #d4d4d4);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}
</style>
