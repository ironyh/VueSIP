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

    <div class="info-section" role="region" aria-label="IVR Monitor Overview">
      <p>
        Monitor IVR (Interactive Voice Response) systems in real-time. Track callers, view menu
        navigation, and breakout callers to live agents when needed.
      </p>
      <p class="note" role="note">
        <strong>Note:</strong> This demo simulates IVR monitoring. In production, data comes from
        AMI events tracking IVR activity.
      </p>
    </div>

    <!-- Controls -->
    <div class="controls-section" role="region" aria-label="IVR Monitor Controls">
      <div class="input-group">
        <label for="ivr-id-input">IVR ID</label>
        <input
          id="ivr-id-input"
          v-model="newIVRId"
          type="text"
          placeholder="e.g., ivr-main"
          :disabled="isMonitoring"
          aria-describedby="ivr-id-help"
        />
        <span id="ivr-id-help" class="visually-hidden">
          Enter an IVR system identifier to monitor
        </span>
      </div>
      <div class="action-buttons">
        <Button
          v-if="!isMonitoring"
          label="Start Monitoring"
          @click="handleStartMonitoring"
          aria-label="Start monitoring IVR systems"
        />
        <Button
          v-else
          label="Stop Monitoring"
          severity="danger"
          @click="handleStopMonitoring"
          aria-label="Stop monitoring IVR systems"
        />
        <Button
          label="Refresh"
          severity="secondary"
          :disabled="!isMonitoring"
          @click="handleRefresh"
          :aria-disabled="!isMonitoring"
          aria-label="Refresh IVR data"
        />
        <Button
          label="Add IVR"
          severity="secondary"
          :disabled="!isMonitoring || !newIVRId"
          @click="handleAddIVR"
          :aria-disabled="!isMonitoring || !newIVRId"
          aria-label="Add new IVR system to monitor"
        />
      </div>
    </div>

    <!-- IVR List -->
    <div v-if="ivrList.length > 0" class="ivrs-section" role="region" aria-label="IVR Systems List">
      <h3 id="ivr-systems-heading">IVR Systems</h3>
      <div class="ivrs-grid" role="list" aria-labelledby="ivr-systems-heading">
        <div
          v-for="ivr in ivrList"
          :key="ivr.id"
          class="ivr-card"
          :class="{ selected: selectedIVR?.id === ivr.id, disabled: !ivr.enabled }"
          role="listitem button"
          :tabindex="ivr.enabled ? 0 : -1"
          @click="selectIVR(ivr.id)"
          @keydown.enter="selectIVR(ivr.id)"
          @keydown.space.prevent="selectIVR(ivr.id)"
          :aria-label="`IVR ${ivr.id}, ${ivr.name}, ${ivr.callers.size} callers, ${ivr.enabled ? (ivr.callers.size > 0 ? 'Active' : 'Idle') : 'Disabled'}`"
          :aria-selected="selectedIVR?.id === ivr.id"
          :aria-disabled="!ivr.enabled"
        >
          <div class="ivr-header">
            <span class="ivr-id">{{ ivr.id }}</span>
            <span
              class="ivr-status"
              :class="{ active: ivr.callers.size > 0, disabled: !ivr.enabled }"
              role="status"
              aria-live="polite"
            >
              <span aria-hidden="true">●</span>
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
    <div v-if="selectedIVR" class="ivr-details" role="region" aria-label="Selected IVR Details">
      <div class="details-header">
        <h3 id="selected-ivr-heading">{{ selectedIVR.name }} ({{ selectedIVR.id }})</h3>
        <div class="details-actions">
          <Button
            v-if="selectedIVR.enabled"
            label="Disable"
            severity="warn"
            size="small"
            @click="handleDisableIVR"
            aria-label="Disable this IVR system"
          />
          <Button
            v-else
            label="Enable"
            severity="success"
            size="small"
            @click="handleEnableIVR"
            aria-label="Enable this IVR system"
          />
          <Button
            label="Clear Stats"
            severity="secondary"
            size="small"
            @click="handleClearStats"
            aria-label="Clear statistics for this IVR"
          />
        </div>
      </div>

      <!-- Callers in IVR -->
      <div class="callers-section">
        <div class="callers-header">
          <h4 id="callers-heading">Callers in IVR ({{ callersInSelectedIVR.length }})</h4>
          <Button
            v-if="callersInSelectedIVR.length > 0"
            label="Breakout All"
            size="small"
            @click="showBreakoutAllModal = true"
            aria-label="Breakout all callers to extension"
          />
        </div>

        <ul
          v-if="callersInSelectedIVR.length > 0"
          class="callers-list"
          role="list"
          aria-labelledby="callers-heading"
        >
          <li
            v-for="caller in callersInSelectedIVR"
            :key="caller.id"
            class="caller-item"
            :class="caller.state"
            role="listitem"
          >
            <div class="caller-info">
              <div
                class="caller-state-icon"
                role="status"
                :aria-label="`Caller state: ${caller.state}`"
              >
                {{ getStateIcon(caller.state) }}
              </div>
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
              <Button
                label="Breakout"
                size="small"
                @click="openBreakoutModal(caller)"
                :aria-label="`Breakout caller ${caller.callerIdNum} to extension`"
              />
            </div>
          </li>
        </ul>
        <div v-else class="empty-callers" role="status">No callers currently in this IVR.</div>
      </div>

      <!-- Statistics -->
      <div class="stats-section" role="region" aria-label="IVR Statistics">
        <h4 id="stats-heading">Statistics</h4>
        <div class="stats-grid" role="list" aria-labelledby="stats-heading">
          <div class="stat-card" role="listitem">
            <div
              class="stat-value"
              aria-label="Total callers: {{ selectedIVR.stats.totalCallers }}"
            >
              {{ selectedIVR.stats.totalCallers }}
            </div>
            <div class="stat-label">Total Callers</div>
          </div>
          <div class="stat-card" role="listitem">
            <div
              class="stat-value"
              aria-label="Current callers: {{ selectedIVR.stats.currentCallers }}"
            >
              {{ selectedIVR.stats.currentCallers }}
            </div>
            <div class="stat-label">Current</div>
          </div>
          <div class="stat-card" role="listitem">
            <div
              class="stat-value"
              aria-label="Successful exits: {{ selectedIVR.stats.successfulExits }}"
            >
              {{ selectedIVR.stats.successfulExits }}
            </div>
            <div class="stat-label">Successful</div>
          </div>
          <div class="stat-card" role="listitem">
            <div
              class="stat-value"
              aria-label="Abandoned calls: {{ selectedIVR.stats.abandonedCalls }}"
            >
              {{ selectedIVR.stats.abandonedCalls }}
            </div>
            <div class="stat-label">Abandoned</div>
          </div>
          <div class="stat-card" role="listitem">
            <div
              class="stat-value"
              aria-label="Timed out calls: {{ selectedIVR.stats.timedOutCalls }}"
            >
              {{ selectedIVR.stats.timedOutCalls }}
            </div>
            <div class="stat-label">Timed Out</div>
          </div>
          <div class="stat-card" role="listitem">
            <div class="stat-value" aria-label="Peak callers: {{ selectedIVR.stats.peakCallers }}">
              {{ selectedIVR.stats.peakCallers }}
            </div>
            <div class="stat-label">Peak</div>
          </div>
          <div class="stat-card" role="listitem">
            <div
              class="stat-value"
              aria-label="Average time in IVR: {{ formatAvgTime(selectedIVR.stats.avgTimeInIVR) }}"
            >
              {{ formatAvgTime(selectedIVR.stats.avgTimeInIVR) }}
            </div>
            <div class="stat-label">Avg Time</div>
          </div>
          <div class="stat-card" role="listitem">
            <div
              class="stat-value"
              aria-label="Average menu selections: {{ selectedIVR.stats.avgMenuSelections.toFixed(1) }}"
            >
              {{ selectedIVR.stats.avgMenuSelections.toFixed(1) }}
            </div>
            <div class="stat-label">Avg Selections</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Simulation Controls -->
    <div
      v-if="isMonitoring && selectedIVR"
      class="simulation-section"
      role="region"
      aria-label="Simulation Controls"
    >
      <h4>Simulate Activity</h4>
      <div class="simulation-buttons">
        <Button
          label="Simulate Caller Enter"
          severity="secondary"
          @click="simulateCallerEnter"
          aria-label="Simulate caller entering IVR"
        />
        <Button
          label="Simulate DTMF"
          severity="secondary"
          @click="simulateDTMF"
          aria-label="Simulate DTMF input from caller"
        />
        <Button
          label="Simulate Caller Exit"
          severity="secondary"
          @click="simulateCallerExit"
          aria-label="Simulate caller exiting IVR"
        />
        <Button
          label="Simulate Abandon"
          severity="secondary"
          @click="simulateAbandon"
          aria-label="Simulate caller abandoning call"
        />
      </div>
    </div>

    <!-- Breakout Modal -->
    <div
      v-if="showBreakoutModal"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakout-modal-title"
      @click.self="showBreakoutModal = false"
    >
      <div class="modal">
        <h4 id="breakout-modal-title">Breakout Caller</h4>
        <p>Transfer {{ breakoutTarget?.callerIdNum }} to:</p>
        <label for="breakout-extension-input" class="visually-hidden">
          Destination extension
        </label>
        <input
          id="breakout-extension-input"
          v-model="breakoutDestination"
          type="text"
          placeholder="Extension (e.g., 1001)"
          aria-describedby="breakout-help"
        />
        <span id="breakout-help" class="visually-hidden">
          Enter the extension number to transfer this caller to
        </span>
        <div class="modal-actions">
          <Button label="Cancel" severity="secondary" @click="showBreakoutModal = false" />
          <Button
            label="Breakout"
            :disabled="!breakoutDestination"
            :aria-disabled="!breakoutDestination"
            @click="handleBreakout"
          />
        </div>
      </div>
    </div>

    <!-- Breakout All Modal -->
    <div
      v-if="showBreakoutAllModal"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakout-all-modal-title"
      @click.self="showBreakoutAllModal = false"
    >
      <div class="modal">
        <h4 id="breakout-all-modal-title">Breakout All Callers</h4>
        <p>Transfer all {{ callersInSelectedIVR.length }} callers to:</p>
        <label for="breakout-all-extension-input" class="visually-hidden">
          Destination extension for all callers
        </label>
        <input
          id="breakout-all-extension-input"
          v-model="breakoutDestination"
          type="text"
          placeholder="Extension (e.g., 1001)"
          aria-describedby="breakout-all-help"
        />
        <span id="breakout-all-help" class="visually-hidden">
          Enter the extension number to transfer all callers to
        </span>
        <div class="modal-actions">
          <Button label="Cancel" severity="secondary" @click="showBreakoutAllModal = false" />
          <Button
            label="Breakout All"
            :disabled="!breakoutDestination"
            :aria-disabled="!breakoutDestination"
            @click="handleBreakoutAll"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isMonitoring" class="empty-state" role="status">
      <div class="empty-icon" aria-hidden="true">IVR</div>
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
import { Button } from './shared-components'

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
  padding: 1rem;
}

.info-section {
  margin-bottom: 1.5rem;
}

.note {
  background: rgba(245, 158, 11, 0.15);
  padding: 0.75rem;
  border-radius: 4px;
  border-left: 4px solid var(--warning);
  transition: all 0.3s ease;
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
  border: var(--border-width) solid var(--surface-border);
  border-radius: var(--radius-md);
  width: 150px;
  background: var(--surface-card);
  color: var(--text-primary);
  transition: border-color 0.3s ease;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

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
  background: var(--surface-card);
  border: var(--border-width) solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  cursor: pointer;
  transition: all 0.3s ease;
}

.ivr-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.ivr-card.selected {
  border-color: var(--primary);
  background: rgba(102, 126, 234, 0.15);
}
.ivr-card.disabled {
  opacity: 0.6;
}

.ivr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.ivr-id {
  font-weight: 600;
  font-size: 1.1rem;
}

.ivr-status {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-md);
  background: var(--text-secondary);
  color: var(--surface-0);
  transition: background-color 0.3s ease;
}

.ivr-status.active {
  background: var(--success);
}
.ivr-status.disabled {
  background: var(--danger);
}

.ivr-name {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.ivr-callers {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.callers-count {
  font-weight: 600;
  color: var(--primary);
  transition: color 0.3s ease;
}

.ivr-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.ivr-details {
  background: var(--surface-card);
  border: var(--border-width) solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-2xl);
  transition: all 0.3s ease;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.details-header h3 {
  margin: 0;
}
.details-actions {
  display: flex;
  gap: 0.5rem;
}

.callers-section {
  margin-bottom: 1.5rem;
}

.callers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.callers-header h4 {
  margin: 0;
}

.callers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.caller-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
  transition: background-color 0.3s ease;
}

.caller-item.timeout {
  background: rgba(245, 158, 11, 0.15);
}
.caller-item.error {
  background: rgba(239, 68, 68, 0.15);
}

.caller-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 150px;
}

.caller-state-icon {
  font-size: 0.7rem;
  font-weight: 700;
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(102, 126, 234, 0.15);
  color: var(--primary-dark);
  border-radius: var(--radius-md);
  min-width: 50px;
  text-align: center;
  transition: all 0.3s ease;
}

.caller-details {
  display: flex;
  flex-direction: column;
}

.caller-id {
  font-weight: 600;
}
.caller-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.caller-menu,
.caller-time,
.caller-dtmf {
  font-size: 0.85rem;
}

.menu-label,
.time-label,
.dtmf-label {
  color: var(--text-secondary);
  margin-right: var(--spacing-xs);
  transition: color 0.3s ease;
}

.menu-id {
  font-family: monospace;
}
.dtmf-value {
  font-family: monospace;
  font-weight: 600;
}

.empty-callers {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.stats-section h4 {
  margin-bottom: 0.75rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--surface-ground);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  text-align: center;
  transition: background-color 0.3s ease;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary);
  transition: color 0.3s ease;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.simulation-section {
  background: var(--surface-ground);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-2xl);
  transition: background-color 0.3s ease;
}

.simulation-section h4 {
  margin-bottom: 0.75rem;
}
.simulation-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

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
  background: var(--surface-card);
  padding: var(--spacing-xl);
  border-radius: var(--radius-lg);
  min-width: 300px;
  transition: all 0.3s ease;
}

.modal h4 {
  margin-top: 0;
}

.modal input {
  width: 100%;
  padding: var(--spacing-sm);
  border: var(--border-width) solid var(--surface-border);
  border-radius: var(--radius-md);
  margin: var(--spacing-lg) 0;
  background: var(--surface-card);
  color: var(--text-primary);
  transition: border-color 0.3s ease;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.empty-icon {
  font-size: 1.25rem;
  font-weight: 700;
  padding: var(--spacing-lg) var(--spacing-2xl);
  margin-bottom: var(--spacing-lg);
  background: var(--surface-ground);
  color: var(--text-secondary);
  border-radius: var(--radius-lg);
  display: inline-block;
  transition: all 0.3s ease;
}

/* Visually hidden class for screen readers */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.code-example {
  margin-top: var(--spacing-2xl);
  background: var(--gray-900);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  overflow-x: auto;
  transition: background-color 0.3s ease;
}

.code-example h4 {
  color: var(--gray-50);
  margin-bottom: 0.75rem;
  transition: color 0.3s ease;
}

.code-example pre {
  margin: 0;
}

.code-example code {
  color: var(--gray-100);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  transition: color 0.3s ease;
}

/* Responsive - Mobile-First Patterns */
@media (max-width: 768px) {
  /* Touch-friendly buttons - min 44px */
  .btn {
    min-height: 44px;
    padding: 0.75rem 1.25rem;
  }

  .btn-sm {
    min-height: 44px;
    padding: 0.5rem 1rem;
  }

  /* Controls: stack vertically */
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }

  .input-group {
    width: 100%;
  }

  .input-group input {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.75rem;
  }

  .action-buttons .btn {
    width: 100%;
  }

  /* IVR cards: single column */
  .ivrs-grid {
    grid-template-columns: 1fr;
  }

  /* Details header: stack actions */
  .details-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .details-actions {
    width: 100%;
    flex-direction: column;
  }

  .details-actions .btn {
    width: 100%;
  }

  /* Callers header: stack button */
  .callers-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .callers-header .btn {
    width: 100%;
  }

  /* Caller items: stack content */
  .caller-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .caller-info {
    width: 100%;
  }

  .caller-menu,
  .caller-time,
  .caller-dtmf {
    width: 100%;
  }

  .caller-actions {
    width: 100%;
  }

  .caller-actions .btn {
    width: 100%;
  }

  /* Stats grid: 2 columns on mobile */
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Simulation buttons: stack */
  .simulation-buttons {
    flex-direction: column;
  }

  .simulation-buttons .btn {
    width: 100%;
  }

  /* Modal: full width on mobile */
  .modal {
    width: 95%;
    max-width: none;
  }
}
</style>
