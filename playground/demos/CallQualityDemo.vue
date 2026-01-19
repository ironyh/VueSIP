<template>
  <div class="call-quality-demo">
    <div class="info-section">
      <p>
        Monitor real-time call quality metrics including audio codec information, packet statistics,
        jitter, and round-trip time. Essential for diagnosing call quality issues and network
        problems.
      </p>
      <p class="note">
        <strong>Note:</strong> Statistics are available only during active calls. Some metrics may
        vary depending on browser support.
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

    <!-- Connection Status -->
    <Message v-if="!effectiveIsConnected" severity="info" :closable="false" class="mb-4">
      {{
        isSimulationMode
          ? 'Enable simulation and run a scenario to see quality metrics'
          : 'Connect to a SIP server to view call quality metrics (use the Basic Call demo to connect)'
      }}
    </Message>

    <Message
      v-else-if="effectiveCallState !== 'active'"
      severity="warn"
      :closable="false"
      class="mb-4"
    >
      {{
        isSimulationMode
          ? 'Run the "Active Call" scenario to see quality metrics'
          : 'Make or answer a call to see real-time quality metrics'
      }}
    </Message>

    <!-- Quality Metrics -->
    <div v-else class="quality-metrics">
      <!-- Overall Quality Score -->
      <div class="quality-score-card">
        <div class="score-container">
          <div
            class="score-circle"
            :class="qualityLevel"
            role="img"
            :aria-label="`Call quality score: ${qualityScore} out of 100, ${qualityText} quality`"
          >
            <div class="score-value">{{ qualityScore }}</div>
            <div class="score-label">Quality</div>
          </div>
          <div class="score-indicator">
            <div
              class="indicator-bar"
              role="progressbar"
              :aria-valuenow="qualityScore"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`Quality level: ${qualityScore}%`"
            >
              <div
                class="indicator-fill"
                :style="{ width: qualityScore + '%' }"
                :class="qualityLevel"
              ></div>
            </div>
            <div class="indicator-text">{{ qualityText }}</div>
          </div>
        </div>
      </div>

      <!-- Audio Codec Information -->
      <div class="metrics-section">
        <h3>Audio Codec</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Codec:</span>
            <span class="info-value">{{ codecInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Sample Rate:</span>
            <span class="info-value">{{ codecInfo.sampleRate }} Hz</span>
          </div>
          <div class="info-item">
            <span class="info-label">Channels:</span>
            <span class="info-value">{{ codecInfo.channels }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Bitrate:</span>
            <span class="info-value">{{ codecInfo.bitrate }} kbps</span>
          </div>
        </div>
      </div>

      <!-- Network Statistics -->
      <div class="metrics-section">
        <h3>Network Statistics</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ networkStats.packetLoss }}%</div>
              <div class="stat-label">Packet Loss</div>
              <div class="stat-quality" :class="getPacketLossLevel(networkStats.packetLoss)">
                {{ getPacketLossText(networkStats.packetLoss) }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ networkStats.jitter }}ms</div>
              <div class="stat-label">Jitter</div>
              <div class="stat-quality" :class="getJitterLevel(networkStats.jitter)">
                {{ getJitterText(networkStats.jitter) }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ networkStats.rtt }}ms</div>
              <div class="stat-label">Round Trip Time</div>
              <div class="stat-quality" :class="getRttLevel(networkStats.rtt)">
                {{ getRttText(networkStats.rtt) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Packet Information -->
      <div class="metrics-section">
        <h3>Packet Statistics</h3>
        <div class="packet-stats">
          <div class="packet-row">
            <span class="packet-label">Packets Sent:</span>
            <span class="packet-value">{{ formatNumber(packetStats.sent) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Packets Received:</span>
            <span class="packet-value">{{ formatNumber(packetStats.received) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Packets Lost:</span>
            <span class="packet-value lost">{{ formatNumber(packetStats.lost) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Bytes Sent:</span>
            <span class="packet-value">{{ formatBytes(packetStats.bytesSent) }}</span>
          </div>
          <div class="packet-row">
            <span class="packet-label">Bytes Received:</span>
            <span class="packet-value">{{ formatBytes(packetStats.bytesReceived) }}</span>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div
        v-if="recommendations.length > 0"
        class="recommendations"
        role="region"
        aria-label="Call quality recommendations"
      >
        <h3>Recommendations</h3>
        <ul>
          <li v-for="(rec, index) in recommendations" :key="index">{{ rec }}</li>
        </ul>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { ref, onUnmounted } from 'vue'
import { useCallSession } from 'vuesip'

const { session, state } = useCallSession(sipClient)

// Get RTC peer connection stats
const getCallStats = async () => {
  if (!session.value?.connection) return null

  const stats = await session.value.connection.getStats()

  const audioStats = {
    codec: null,
    packetLoss: 0,
    jitter: 0,
    rtt: 0,
    packetsSent: 0,
    packetsReceived: 0
  }

  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      audioStats.packetsReceived = report.packetsReceived || 0
      audioStats.packetLoss = report.packetsLost || 0
      audioStats.jitter = report.jitter ? (report.jitter * 1000).toFixed(2) : 0
    }

    if (report.type === 'outbound-rtp' && report.kind === 'audio') {
      audioStats.packetsSent = report.packetsSent || 0
    }

    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      audioStats.rtt = report.currentRoundTripTime
        ? (report.currentRoundTripTime * 1000).toFixed(2)
        : 0
    }
  })

  return audioStats
}

// Poll stats every 2 seconds
const statsInterval = setInterval(async () => {
  if (state.value === 'active') {
    const stats = await getCallStats()
    // Update UI with stats
  }
}, 2000)

onUnmounted(() => {
  clearInterval(statsInterval)
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Call Quality Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Message for status messages with appropriate severity levels
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Client and Call Session
const { isConnected, getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  session: _session,
  duration: realDuration,
  remoteUri: realRemoteUri,
  remoteDisplayName: realRemoteDisplayName,
} = useCallSession(sipClientRef)

// Effective values - use simulation or real data based on mode
const effectiveIsConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : isConnected.value
)

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

// State
const codecInfo = ref({
  name: 'Unknown',
  sampleRate: 0,
  channels: 0,
  bitrate: 0,
})

const networkStats = ref({
  packetLoss: 0,
  jitter: 0,
  rtt: 0,
})

const packetStats = ref({
  sent: 0,
  received: 0,
  lost: 0,
  bytesSent: 0,
  bytesReceived: 0,
})

let statsInterval: number | null = null

// Computed
const qualityScore = computed(() => {
  // Calculate quality score based on metrics (0-100)
  let score = 100

  // Deduct points for packet loss (max 30 points)
  score -= Math.min(networkStats.value.packetLoss * 30, 30)

  // Deduct points for jitter (max 25 points)
  if (networkStats.value.jitter > 30) {
    score -= Math.min((networkStats.value.jitter - 30) / 2, 25)
  }

  // Deduct points for high RTT (max 25 points)
  if (networkStats.value.rtt > 150) {
    score -= Math.min((networkStats.value.rtt - 150) / 10, 25)
  }

  return Math.max(0, Math.min(100, Math.round(score)))
})

const qualityLevel = computed(() => {
  if (qualityScore.value >= 80) return 'excellent'
  if (qualityScore.value >= 60) return 'good'
  if (qualityScore.value >= 40) return 'fair'
  return 'poor'
})

const qualityText = computed(() => {
  if (qualityScore.value >= 80) return 'Excellent'
  if (qualityScore.value >= 60) return 'Good'
  if (qualityScore.value >= 40) return 'Fair'
  return 'Poor'
})

const recommendations = computed(() => {
  const recs: string[] = []

  if (networkStats.value.packetLoss > 2) {
    recs.push(
      'High packet loss detected. Check network congestion or switch to a wired connection.'
    )
  }

  if (networkStats.value.jitter > 30) {
    recs.push(
      'High jitter may cause choppy audio. Consider closing bandwidth-intensive applications.'
    )
  }

  if (networkStats.value.rtt > 200) {
    recs.push('High latency detected. You may experience delays in conversation.')
  }

  if (qualityScore.value < 60) {
    recs.push('Overall call quality is suboptimal. Consider improving your network connection.')
  }

  return recs
})

// Methods
const getPacketLossLevel = (loss: number): string => {
  if (loss < 1) return 'excellent'
  if (loss < 3) return 'good'
  if (loss < 5) return 'fair'
  return 'poor'
}

const getPacketLossText = (loss: number): string => {
  if (loss < 1) return 'Excellent'
  if (loss < 3) return 'Acceptable'
  if (loss < 5) return 'Noticeable'
  return 'Poor'
}

const getJitterLevel = (jitter: number): string => {
  if (jitter < 20) return 'excellent'
  if (jitter < 30) return 'good'
  if (jitter < 50) return 'fair'
  return 'poor'
}

const getJitterText = (jitter: number): string => {
  if (jitter < 20) return 'Excellent'
  if (jitter < 30) return 'Good'
  if (jitter < 50) return 'Fair'
  return 'Poor'
}

const getRttLevel = (rtt: number): string => {
  if (rtt < 150) return 'excellent'
  if (rtt < 200) return 'good'
  if (rtt < 300) return 'fair'
  return 'poor'
}

const getRttText = (rtt: number): string => {
  if (rtt < 150) return 'Excellent'
  if (rtt < 200) return 'Good'
  if (rtt < 300) return 'Fair'
  return 'Poor'
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const updateStats = async () => {
  // Simulated stats for demo purposes
  // In a real implementation, you would get these from the WebRTC peer connection
  networkStats.value = {
    packetLoss: Math.random() * 5,
    jitter: 15 + Math.random() * 20,
    rtt: 100 + Math.random() * 100,
  }

  packetStats.value = {
    sent: Math.floor(Math.random() * 10000) + 5000,
    received: Math.floor(Math.random() * 10000) + 5000,
    lost: Math.floor(Math.random() * 100),
    bytesSent: Math.floor(Math.random() * 1000000) + 500000,
    bytesReceived: Math.floor(Math.random() * 1000000) + 500000,
  }

  codecInfo.value = {
    name: 'PCMU',
    sampleRate: 8000,
    channels: 1,
    bitrate: 64,
  }
}

// Watch for active calls and start polling stats
watch(effectiveCallState, (newState) => {
  if (newState === 'active') {
    // Start polling stats
    updateStats()
    statsInterval = window.setInterval(updateStats, 2000)
  } else {
    // Stop polling
    if (statsInterval) {
      clearInterval(statsInterval)
      statsInterval = null
    }
  }
})

// Cleanup
onUnmounted(() => {
  if (statsInterval) {
    clearInterval(statsInterval)
  }
})
</script>

<style scoped>
.call-quality-demo {
  max-width: 900px;
  margin: 0 auto;
}

.info-section {
  padding: var(--spacing-lg);
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  transition: background-color 0.3s ease;
}

.info-section p {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
  line-height: 1.6;
  transition: color 0.3s ease;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: var(--spacing-md);
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

/* Design Decision: PrimeVue Message component handles status message styling.
   Removed custom .status-message classes as they're no longer needed. */

.quality-metrics {
  padding: var(--spacing-md);
}

@media (min-width: 640px) {
  .quality-metrics {
    padding: var(--spacing-lg);
  }
}

.quality-score-card {
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  border: var(--border-width-thick) solid var(--surface-border);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
}

@media (min-width: 640px) {
  .quality-score-card {
    padding: var(--spacing-2xl);
    margin-bottom: var(--spacing-2xl);
  }
}

.score-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

@media (min-width: 640px) {
  .score-container {
    gap: var(--spacing-2xl);
  }
}

.score-circle {
  width: 100px;
  height: 100px;
  border-radius: var(--radius-full);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 8px solid;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.score-circle.excellent {
  border-color: var(--success);
  background: rgba(16, 185, 129, 0.15);
}

.score-circle.good {
  border-color: var(--info);
  background: rgba(59, 130, 246, 0.15);
}

.score-circle.fair {
  border-color: var(--warning);
  background: rgba(245, 158, 11, 0.15);
}

.score-circle.poor {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.15);
}

.score-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

@media (min-width: 640px) {
  .score-value {
    font-size: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .score-value {
    font-size: 3rem;
  }
}

.score-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
  transition: color 0.3s ease;
}

.score-indicator {
  flex: 1;
}

.indicator-bar {
  height: 12px;
  background: var(--surface-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
  transition: background-color 0.3s ease;
}

.indicator-fill {
  height: 100%;
  transition:
    width 0.5s ease,
    background 0.3s ease;
}

.indicator-fill.excellent {
  background: linear-gradient(90deg, var(--success), var(--success-dark));
}

.indicator-fill.good {
  background: linear-gradient(90deg, var(--info), var(--info-dark));
}

.indicator-fill.fair {
  background: linear-gradient(90deg, var(--warning), var(--warning-dark));
}

.indicator-fill.poor {
  background: linear-gradient(90deg, var(--danger), var(--danger-dark));
}

.indicator-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.metrics-section {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: var(--border-width-thick) solid var(--surface-border);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
}

.metrics-section h3 {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--text-primary);
  font-size: 1rem;
  transition: color 0.3s ease;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-sm);
}

@media (min-width: 640px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}

@media (min-width: 1024px) {
  .info-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}

.info-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.info-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-sm);
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

.stat-card {
  display: flex;
  gap: var(--spacing-sm);
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  border: var(--border-width-thick) solid transparent;
  transition: all 0.3s ease;
}

@media (min-width: 640px) {
  .stat-card {
    gap: var(--spacing-md);
    padding: 1.25rem;
  }
}

.stat-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
  transition: color 0.3s ease;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-sm);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.3s ease;
}

.stat-quality {
  display: inline-block;
  padding: 0.25rem var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.stat-quality.excellent {
  background: rgba(16, 185, 129, 0.15);
  color: var(--text-success);
}

.stat-quality.good {
  background: rgba(59, 130, 246, 0.15);
  color: var(--text-info);
}

.stat-quality.fair {
  background: rgba(245, 158, 11, 0.15);
  color: var(--text-warning);
}

.stat-quality.poor {
  background: rgba(239, 68, 68, 0.15);
  color: var(--text-danger);
}

.packet-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.packet-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.625rem;
  background: var(--surface-ground);
  border-radius: var(--radius-md);
  transition: all 0.3s ease;
}

@media (min-width: 640px) {
  .packet-row {
    flex-direction: row;
    justify-content: space-between;
    gap: 0;
    padding: 0.75rem;
  }
}

.packet-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.packet-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  transition: color 0.3s ease;
}

.packet-value.lost {
  color: var(--danger);
}

.recommendations {
  background: rgba(59, 130, 246, 0.1);
  border: var(--border-width-thick) solid var(--info);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  transition: all 0.3s ease;
}

.recommendations h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-info);
  font-size: 1rem;
  transition: color 0.3s ease;
}

.recommendations ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.recommendations li {
  color: var(--text-info);
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: var(--spacing-sm);
  transition: color 0.3s ease;
}

.recommendations li:last-child {
  margin-bottom: 0;
}

.code-example {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-lg);
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  transition: all 0.3s ease;
}

.code-example h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.code-example pre {
  background: var(--gray-900);
  color: var(--gray-100);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 0;
  transition: all 0.3s ease;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .score-container {
    flex-direction: column;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 320px) {
  .info-section {
    padding: var(--spacing-md);
  }

  .quality-score-card {
    padding: var(--spacing-lg);
  }

  .score-circle {
    width: 100px;
    height: 100px;
    border-width: 6px;
  }

  .score-value {
    font-size: 2rem;
  }
}
</style>
