<template>
  <div class="auto-answer-demo">
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
        Auto-Answer mode automatically answers incoming calls based on configurable rules.
        Supports SIP header detection (intercom mode), whitelisted callers, and configurable delays.
        Perfect for hands-free operation, intercom systems, and call center auto-answer scenarios.
      </p>
    </div>

    <!-- Connection Status -->
    <div v-if="!isConnected" class="status-message info">
      Connect to a SIP server to use Auto-Answer (use the Basic Call demo to connect)
    </div>

    <!-- Auto-Answer Interface -->
    <div v-else class="auto-answer-interface">
      <!-- Main Toggle -->
      <div class="toggle-card">
        <div class="toggle-header">
          <div class="toggle-icon" :class="{ active: isEnabled }">
            {{ isEnabled ? '📞' : '📵' }}
          </div>
          <div class="toggle-info">
            <h3>Auto-Answer</h3>
            <p>{{ getStatusDescription() }}</p>
          </div>
        </div>

        <div class="toggle-control">
          <label class="switch">
            <input type="checkbox" :checked="isEnabled" @change="handleToggle" />
            <span class="slider"></span>
          </label>
          <span class="toggle-label">
            {{ isEnabled ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>

      <!-- Mode Selection -->
      <div class="mode-section">
        <h4>Auto-Answer Mode</h4>
        <div class="mode-grid">
          <button
            v-for="modeOption in modeOptions"
            :key="modeOption.value"
            class="mode-btn"
            :class="{ active: mode === modeOption.value }"
            @click="setMode(modeOption.value)"
          >
            <span class="mode-icon">{{ modeOption.icon }}</span>
            <span class="mode-label">{{ modeOption.label }}</span>
            <span class="mode-desc">{{ modeOption.desc }}</span>
          </button>
        </div>
      </div>

      <!-- Delay Settings -->
      <div class="delay-section">
        <h4>Answer Delay</h4>
        <div class="delay-control">
          <input
            type="range"
            min="0"
            max="5000"
            step="100"
            :value="settings.delay"
            @input="handleDelayChange"
          />
          <div class="delay-labels">
            <span>Instant</span>
            <span class="delay-value">{{ formatDelay(settings.delay) }}</span>
            <span>5 seconds</span>
          </div>
        </div>
        <p class="delay-info">
          Delay before automatically answering the call. Set to 0 for instant answer.
        </p>
      </div>

      <!-- Whitelist Section -->
      <div v-if="mode === 'whitelist'" class="whitelist-section">
        <h4>Whitelist</h4>
        <p class="section-desc">
          Only auto-answer calls from these numbers or patterns. Use * as wildcard.
        </p>

        <!-- Add Entry Form -->
        <div class="add-entry-form">
          <input
            v-model="newPattern"
            type="text"
            placeholder="Phone number or pattern (e.g., +1555* or sip:*@domain.com)"
            class="input-text"
          />
          <input
            v-model="newName"
            type="text"
            placeholder="Name (optional)"
            class="input-text input-small"
          />
          <button class="btn btn-primary" @click="handleAddToWhitelist">Add</button>
        </div>

        <!-- Whitelist Entries -->
        <div v-if="settings.whitelist.length > 0" class="whitelist-entries">
          <div
            v-for="entry in settings.whitelist"
            :key="entry.pattern"
            class="whitelist-entry"
          >
            <label class="entry-enabled">
              <input
                type="checkbox"
                :checked="entry.enabled"
                @change="handleToggleWhitelistEntry(entry.pattern)"
              />
            </label>
            <div class="entry-info">
              <div class="entry-pattern">{{ entry.pattern }}</div>
              <div v-if="entry.name" class="entry-name">{{ entry.name }}</div>
            </div>
            <div v-if="entry.delay !== undefined" class="entry-delay">
              {{ formatDelay(entry.delay) }}
            </div>
            <button
              class="btn btn-icon btn-danger"
              @click="removeFromWhitelist(entry.pattern)"
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>
        <div v-else class="empty-whitelist">
          No entries in whitelist. Add phone numbers or patterns above.
        </div>
      </div>

      <!-- Intercom Settings -->
      <div v-if="mode === 'intercom'" class="intercom-section">
        <h4>Intercom Settings</h4>
        <div class="intercom-options">
          <div class="option-group">
            <label class="radio-label">
              <input
                type="radio"
                name="intercomMode"
                value="duplex"
                :checked="settings.intercomMode === 'duplex'"
                @change="setIntercomMode('duplex')"
              />
              <span class="radio-text">
                <strong>Duplex (Two-way)</strong>
                <span class="radio-desc">Both parties can speak and hear</span>
              </span>
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="intercomMode"
                value="simplex"
                :checked="settings.intercomMode === 'simplex'"
                @change="setIntercomMode('simplex')"
              />
              <span class="radio-text">
                <strong>Simplex (One-way)</strong>
                <span class="radio-desc">Caller speaks, you listen only</span>
              </span>
            </label>
          </div>

          <div class="option-item">
            <label>
              <input
                type="checkbox"
                :checked="settings.intercomMuteOnAnswer"
                @change="handleIntercomMuteToggle"
              />
              Mute microphone on auto-answer
            </label>
            <p class="option-desc">
              Start with microphone muted when auto-answering intercom calls
            </p>
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="notification-section">
        <h4>Notifications</h4>
        <div class="notification-options">
          <div class="option-item">
            <label>
              <input
                type="checkbox"
                :checked="settings.playBeep"
                @change="handleBeepToggle"
              />
              Play beep sound before answering
            </label>
          </div>
          <div class="option-item">
            <label>
              <input
                type="checkbox"
                :checked="settings.showNotification"
                @change="handleNotificationToggle"
              />
              Show visual notification before answering
            </label>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="stats-section">
        <h4>Statistics</h4>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalAutoAnswered }}</div>
            <div class="stat-label">Total Auto-Answered</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.headerTriggered }}</div>
            <div class="stat-label">Header Triggered</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.whitelistTriggered }}</div>
            <div class="stat-label">Whitelist Triggered</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.intercomTriggered }}</div>
            <div class="stat-label">Intercom Triggered</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ formatDelay(stats.averageDelay) }}</div>
            <div class="stat-label">Average Delay</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.skipped }}</div>
            <div class="stat-label">Skipped</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" @click="resetStats">
          Reset Statistics
        </button>
      </div>

      <!-- Pending Calls -->
      <div v-if="pendingCalls.length > 0" class="pending-section">
        <h4>Pending Auto-Answer</h4>
        <div class="pending-list">
          <div
            v-for="pending in pendingCalls"
            :key="pending.callId"
            class="pending-item"
          >
            <div class="pending-info">
              <div class="pending-caller">{{ pending.caller }}</div>
              <div class="pending-trigger">{{ pending.trigger }}</div>
            </div>
            <div class="pending-countdown">
              {{ formatDelay(pending.remainingTime) }}
            </div>
            <button
              v-if="pending.cancellable"
              class="btn btn-icon btn-warning"
              @click="cancelPending(pending.callId)"
              title="Cancel"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Status Banner -->
      <div v-if="isEnabled" class="status-banner" :class="mode">
        <div class="banner-content">
          <span class="banner-icon">{{ getBannerIcon() }}</span>
          <span class="banner-text">{{ getBannerText() }}</span>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>{{ codeExample }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSipClient, useCallSession } from '../../src'
import { useSipAutoAnswer } from '../../src/composables/useSipAutoAnswer'
import type { AutoAnswerMode, IntercomMode as _IntercomMode } from '../../src/types/autoanswer.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Client
const { isConnected: realIsConnected, getClient } = useSipClient()

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)
const sipClientRef = computed(() => getClient())
const { state: callState, remoteUri, answer } = useCallSession(sipClientRef)

// Auto-Answer composable
const {
  settings,
  isEnabled,
  mode,
  pendingCalls,
  stats,
  enable: _enable,
  disable: _disable,
  toggle,
  setMode,
  setDelay,
  setIntercomMode,
  addToWhitelist,
  removeFromWhitelist,
  updateWhitelistEntry,
  shouldAutoAnswer,
  cancelPending,
  resetStats,
  updateSettings,
} = useSipAutoAnswer({
  persist: true,
  storageKey: 'vuesip_playground_auto_answer',
  onAutoAnswer: (event) => {
    console.log('Auto-answered call:', event)
  },
  onSkipped: (callId, reason) => {
    console.log('Skipped auto-answer:', callId, reason)
  },
})

// Local state for form
const newPattern = ref('')
const newName = ref('')

// Mode options
const modeOptions = [
  { value: 'disabled' as AutoAnswerMode, icon: '🚫', label: 'Disabled', desc: 'No auto-answer' },
  { value: 'all' as AutoAnswerMode, icon: '📞', label: 'All Calls', desc: 'Answer all incoming calls' },
  { value: 'whitelist' as AutoAnswerMode, icon: '📋', label: 'Whitelist', desc: 'Only whitelisted numbers' },
  { value: 'intercom' as AutoAnswerMode, icon: '📢', label: 'Intercom', desc: 'Only intercom calls' },
]

// Watch for incoming calls
watch(callState, async (newState) => {
  if (newState === 'incoming' && isEnabled.value) {
    const result = shouldAutoAnswer(
      `call-${Date.now()}`,
      remoteUri.value || 'unknown',
      // Headers would come from the SIP invite - simulated here
      {}
    )

    if (result.shouldAnswer) {
      console.log('Auto-answering call with delay:', result.delay)

      if (result.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, result.delay))
      }

      try {
        await answer()
        console.log('Call auto-answered')
      } catch (error) {
        console.error('Failed to auto-answer:', error)
      }
    }
  }
})

// Methods
const handleToggle = () => {
  toggle()
}

const handleDelayChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  setDelay(parseInt(target.value, 10))
}

const handleAddToWhitelist = () => {
  if (!newPattern.value.trim()) return

  addToWhitelist({
    pattern: newPattern.value.trim(),
    name: newName.value.trim() || undefined,
    enabled: true,
  })

  newPattern.value = ''
  newName.value = ''
}

const handleToggleWhitelistEntry = (pattern: string) => {
  const entry = settings.value.whitelist.find(e => e.pattern === pattern)
  if (entry) {
    updateWhitelistEntry(pattern, { enabled: !entry.enabled })
  }
}

const handleIntercomMuteToggle = () => {
  updateSettings({ intercomMuteOnAnswer: !settings.value.intercomMuteOnAnswer })
}

const handleBeepToggle = () => {
  updateSettings({ playBeep: !settings.value.playBeep })
}

const handleNotificationToggle = () => {
  updateSettings({ showNotification: !settings.value.showNotification })
}

const formatDelay = (ms: number): string => {
  if (ms === 0) return 'Instant'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const getStatusDescription = (): string => {
  if (!isEnabled.value) return 'Auto-answer is currently disabled'

  switch (mode.value) {
    case 'all':
      return 'All incoming calls will be auto-answered'
    case 'whitelist':
      return `Auto-answering ${settings.value.whitelist.filter(e => e.enabled).length} whitelisted numbers`
    case 'intercom':
      return 'Only intercom calls will be auto-answered'
    default:
      return 'Auto-answer is disabled'
  }
}

const getBannerIcon = (): string => {
  switch (mode.value) {
    case 'all': return '📞'
    case 'whitelist': return '📋'
    case 'intercom': return '📢'
    default: return '📵'
  }
}

const getBannerText = (): string => {
  switch (mode.value) {
    case 'all':
      return `Auto-Answer enabled (${formatDelay(settings.value.delay)} delay)`
    case 'whitelist':
      return `Whitelist mode active (${settings.value.whitelist.filter(e => e.enabled).length} entries)`
    case 'intercom':
      return `Intercom mode (${settings.value.intercomMode})`
    default:
      return 'Auto-Answer disabled'
  }
}

// Code example
const codeExample = `import { useSipAutoAnswer } from 'vuesip'

const {
  settings,
  isEnabled,
  mode,
  pendingCalls,
  stats,
  enable,
  disable,
  setMode,
  setDelay,
  addToWhitelist,
  shouldAutoAnswer,
  cancelPending,
} = useSipAutoAnswer({
  persist: true,
  onAutoAnswer: (event) => {
    console.log('Auto-answered:', event.caller, event.trigger)
  }
})

// Enable auto-answer for all calls
setMode('all')
enable()

// Or use whitelist mode
setMode('whitelist')
addToWhitelist({ pattern: '+1555*', name: 'Office', enabled: true })

// Check if a call should be auto-answered
const result = shouldAutoAnswer('call-id', 'sip:1234@example.com', {
  'Call-Info': '<sip:example.com>;answer-after=2'
})

if (result.shouldAnswer) {
  console.log('Will auto-answer with delay:', result.delay)
}`
</script>

<style scoped>
.auto-answer-demo {
  max-width: 800px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.status-message.info {
  background: #eff6ff;
  color: #1e40af;
}

.auto-answer-interface {
  padding: 1.5rem;
}

/* Toggle Card */
.toggle-card {
  background: white;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  padding: 2rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

.toggle-icon {
  font-size: 3rem;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f3f4f6;
  transition: all 0.3s;
}

.toggle-icon.active {
  background: #dcfce7;
}

.toggle-info h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.25rem;
}

.toggle-info p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}

.toggle-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.toggle-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

/* Switch Toggle */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #22c55e;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

/* Mode Section */
.mode-section {
  margin-bottom: 1.5rem;
}

.mode-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  border-color: #667eea;
}

.mode-btn.active {
  border-color: #667eea;
  background: #eff6ff;
}

.mode-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.mode-label {
  font-weight: 600;
  font-size: 0.875rem;
  color: #333;
}

.mode-desc {
  font-size: 0.75rem;
  color: #666;
  text-align: center;
  margin-top: 0.25rem;
}

/* Delay Section */
.delay-section {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.delay-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.delay-control {
  margin-bottom: 0.75rem;
}

.delay-control input[type="range"] {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  background: #e5e7eb;
  border-radius: 4px;
  outline: none;
}

.delay-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #667eea;
  border-radius: 50%;
  cursor: pointer;
}

.delay-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #666;
}

.delay-value {
  font-weight: 600;
  color: #667eea;
}

.delay-info {
  margin: 0;
  font-size: 0.75rem;
  color: #666;
}

/* Whitelist Section */
.whitelist-section {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.whitelist-section h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1rem;
}

.section-desc {
  margin: 0 0 1rem 0;
  font-size: 0.75rem;
  color: #666;
}

.add-entry-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.input-text {
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
}

.input-text:focus {
  outline: none;
  border-color: #667eea;
}

.input-small {
  flex: 0.5;
  min-width: 120px;
}

.whitelist-entries {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.whitelist-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.whitelist-entry:last-child {
  border-bottom: none;
}

.entry-enabled input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.entry-info {
  flex: 1;
  min-width: 0;
}

.entry-pattern {
  font-weight: 500;
  font-size: 0.875rem;
  color: #333;
}

.entry-name {
  font-size: 0.75rem;
  color: #666;
}

.entry-delay {
  font-size: 0.75rem;
  color: #667eea;
  font-weight: 500;
}

.empty-whitelist {
  text-align: center;
  padding: 1.5rem;
  color: #666;
  font-size: 0.875rem;
}

/* Intercom Section */
.intercom-section {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.intercom-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.option-group {
  margin-bottom: 1rem;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: all 0.2s;
}

.radio-label:hover {
  border-color: #667eea;
}

.radio-label input:checked ~ .radio-text {
  color: #667eea;
}

.radio-text {
  display: flex;
  flex-direction: column;
}

.radio-text strong {
  font-size: 0.875rem;
}

.radio-desc {
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
}

.option-item {
  margin-bottom: 1rem;
}

.option-item:last-child {
  margin-bottom: 0;
}

.option-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  cursor: pointer;
}

.option-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.option-desc {
  margin: 0.5rem 0 0 1.625rem;
  font-size: 0.75rem;
  color: #666;
}

/* Notification Section */
.notification-section {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.notification-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

/* Stats Section */
.stats-section {
  margin-bottom: 1.5rem;
}

.stats-section h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.625rem;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
}

/* Pending Section */
.pending-section {
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.pending-section h4 {
  margin: 0 0 1rem 0;
  color: #92400e;
  font-size: 1rem;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
}

.pending-info {
  flex: 1;
}

.pending-caller {
  font-weight: 600;
  font-size: 0.875rem;
  color: #333;
}

.pending-trigger {
  font-size: 0.75rem;
  color: #666;
}

.pending-countdown {
  font-weight: 700;
  font-size: 1rem;
  color: #f59e0b;
}

/* Status Banner */
.status-banner {
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
}

.status-banner.all {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 2px solid #22c55e;
}

.status-banner.whitelist {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
}

.status-banner.intercom {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.banner-icon {
  font-size: 1.5rem;
}

.banner-text {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-icon {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
}

/* Code Example */
.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.code-example pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 768px) {
  .toggle-card {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .toggle-header {
    flex-direction: column;
  }

  .add-entry-form {
    flex-direction: column;
  }

  .input-text,
  .input-small {
    min-width: 100%;
  }
}
</style>
