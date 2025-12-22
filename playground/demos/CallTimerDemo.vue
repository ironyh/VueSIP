<template>
  <div class="call-timer-demo">
    <div class="info-section">
      <p>
        Display call duration in various formats. This demo shows how to format and display elapsed
        time during calls using VueSip's built-in duration tracking.
      </p>
    </div>

    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
      :duration="effectiveDuration"
      :remote-uri="effectiveRemoteUri"
      :remote-display-name="effectiveRemoteDisplayName"
      :is-on-hold="effectiveIsOnHold"
      :is-muted="effectiveIsMuted"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Timer Display Formats -->
    <div class="timer-showcase">
      <h3>Timer Formats</h3>

      <div v-if="effectiveCallState !== 'active' || !effectiveDuration" class="timer-placeholder">
        <svg
          class="placeholder-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2" />
          <path d="M16.24 7.76l1.42-1.42M6.34 7.76L4.92 6.34M12 2v2" />
        </svg>
        <p>
          {{
            isSimulationMode
              ? 'Run a simulation scenario to see the timer'
              : 'Start a call to see the timer in action'
          }}
        </p>
      </div>

      <div v-else class="timer-displays">
        <!-- Default Format -->
        <div class="timer-card">
          <div class="timer-label">Default (MM:SS)</div>
          <div class="timer-value">{{ formatMMSS(effectiveDuration) }}</div>
          <div class="timer-desc">Standard call timer format</div>
        </div>

        <!-- Long Format -->
        <div class="timer-card">
          <div class="timer-label">Long (HH:MM:SS)</div>
          <div class="timer-value">{{ formatHHMMSS(effectiveDuration) }}</div>
          <div class="timer-desc">For calls over 1 hour</div>
        </div>

        <!-- Human Readable -->
        <div class="timer-card">
          <div class="timer-label">Human Readable</div>
          <div class="timer-value human">{{ formatHuman(effectiveDuration) }}</div>
          <div class="timer-desc">Natural language format</div>
        </div>

        <!-- Compact -->
        <div class="timer-card">
          <div class="timer-label">Compact</div>
          <div class="timer-value">{{ formatCompact(effectiveDuration) }}</div>
          <div class="timer-desc">Space-efficient display</div>
        </div>
      </div>
    </div>

    <!-- Call Status with Timer -->
    <div class="call-status-section">
      <h3>Call Status Display Example</h3>
      <div class="status-card" :class="{ active: effectiveCallState === 'active' }">
        <div class="status-header">
          <svg
            v-if="effectiveCallState === 'active'"
            class="status-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
            />
          </svg>
          <svg v-else class="status-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <span class="status-text">
            {{ effectiveCallState === 'active' ? 'In Call' : 'No Active Call' }}
          </span>
        </div>

        <div v-if="effectiveCallState === 'active'" class="status-details">
          <div v-if="effectiveRemoteUri" class="detail-row">
            <span class="label">Connected to:</span>
            <span class="value">{{ effectiveRemoteDisplayName || effectiveRemoteUri }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Duration:</span>
            <span class="value timer">{{ formatMMSS(effectiveDuration) }}</span>
          </div>
        </div>

        <div v-else class="empty-status">
          {{
            isSimulationMode
              ? 'Use simulation controls above to start a call'
              : 'Connect to a SIP server and make a call to see the timer'
          }}
        </div>
      </div>
    </div>

    <!-- Statistics -->
    <div v-if="effectiveCallState === 'active'" class="timer-stats">
      <h3>Timer Information</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">Total Seconds</div>
          <div class="stat-value">{{ effectiveDuration }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Minutes</div>
          <div class="stat-value">{{ Math.floor(effectiveDuration / 60) }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Hours</div>
          <div class="stat-value">{{ Math.floor(effectiveDuration / 3600) }}</div>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useCallSession } from 'vuesip'

const { duration, state } = useCallSession(sipClient)

// Format MM:SS (e.g., "05:23")
const formatMMSS = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return \`\${mins}:\${secs.toString().padStart(2, '0')}\`
}

// Format HH:MM:SS (e.g., "01:05:23")
const formatHHMMSS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return \`\${hours}:\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`
}

// Human readable (e.g., "5 minutes, 23 seconds")
const formatHuman = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(\`\${hours}h\`)
  if (mins > 0) parts.push(\`\${mins}m\`)
  if (secs > 0 || parts.length === 0) parts.push(\`\${secs}s\`)

  return parts.join(' ')
}

// Use in template
&lt;div v-if="state === 'active'"&gt;
  Duration: {{ formatMMSS(duration) }}
&lt;/div&gt;</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSipClient, useCallSession } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Get real SIP client and call session
const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  duration: realDuration,
  remoteUri: realRemoteUri,
  remoteDisplayName: realRemoteDisplayName,
} = useCallSession(sipClientRef)

// Effective values - use simulation or real data based on mode
const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : realCallState.value
)

const effectiveDuration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : realDuration.value || 0
)

const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : realRemoteUri.value
)

const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : realRemoteDisplayName.value
)

const effectiveIsOnHold = computed(() =>
  isSimulationMode.value ? simulation.isOnHold.value : false
)

const effectiveIsMuted = computed(() => (isSimulationMode.value ? simulation.isMuted.value : false))

// Formatting functions
const formatMMSS = (seconds: number): string => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatHHMMSS = (seconds: number): string => {
  if (!seconds) return '0:00:00'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatHuman = (seconds: number): string => {
  if (!seconds) return '0 seconds'

  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

const formatCompact = (seconds: number): string => {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }

  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}
</script>

<style scoped>
.call-timer-demo {
  max-width: 800px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: var(--bg-secondary, #f8fafc);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0;
  color: var(--text-secondary, #64748b);
  line-height: 1.6;
}

.timer-showcase {
  margin-bottom: 2rem;
}

.timer-showcase h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary, #1e293b);
}

.timer-placeholder {
  text-align: center;
  padding: 3rem;
  background: var(--bg-primary, white);
  border-radius: 8px;
  border: 2px dashed var(--border-color, #e2e8f0);
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  opacity: 0.5;
  color: var(--text-secondary, #64748b);
}

.timer-placeholder p {
  margin: 0;
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
}

.timer-displays {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.timer-card {
  background: var(--bg-primary, white);
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid var(--border-color, #e2e8f0);
  text-align: center;
  transition: all 0.2s;
}

.timer-card:hover {
  border-color: var(--primary, #6366f1);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.timer-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.timer-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary, #6366f1);
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.5rem;
}

.timer-value.human {
  font-size: 1.5rem;
}

.timer-desc {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
}

.call-status-section {
  margin-bottom: 2rem;
}

.call-status-section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #1e293b);
}

.status-card {
  background: var(--bg-primary, white);
  border-radius: 8px;
  border: 2px solid var(--border-color, #e2e8f0);
  padding: 1.5rem;
  transition: all 0.3s;
}

.status-card.active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-icon {
  width: 32px;
  height: 32px;
  color: var(--primary, #6366f1);
}

.status-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.status-details {
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.detail-row .label {
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
}

.detail-row .value {
  color: var(--text-primary, #1e293b);
  font-weight: 500;
}

.detail-row .value.timer {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary, #6366f1);
  font-variant-numeric: tabular-nums;
}

.empty-status {
  text-align: center;
  padding: 1.5rem;
  color: var(--text-muted, #94a3b8);
  font-size: 0.875rem;
}

.timer-stats {
  background: var(--bg-secondary, #f8fafc);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.timer-stats h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #1e293b);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-item {
  background: var(--bg-primary, white);
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  margin-bottom: 0.5rem;
  display: block;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary, #6366f1);
  font-variant-numeric: tabular-nums;
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary, #f8fafc);
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #1e293b);
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
  font-size: 0.875rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .timer-displays {
    grid-template-columns: repeat(2, 1fr);
  }

  .timer-value {
    font-size: 1.5rem;
  }

  .timer-value.human {
    font-size: 1.125rem;
  }
}
</style>
