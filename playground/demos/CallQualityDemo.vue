<template>
  <div class="call-quality-demo">
    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">
            <i class="pi pi-chart-line" style="font-size: 1.5rem"></i>
          </span>
          <span>Call Quality Monitor</span>
        </div>
      </template>
      <template #subtitle>Monitor real-time call quality metrics</template>
      <template #content>
        <Message severity="info" :closable="false" class="mb-4">
          <template #icon><i class="pi pi-info-circle"></i></template>
          <div>
            <p class="m-0">
              Monitor real-time call quality metrics including audio codec information, packet statistics,
              jitter, and round-trip time. Essential for diagnosing call quality issues and network
              problems.
            </p>
            <p class="note mt-2 mb-0">
              <strong>Note:</strong> Statistics are available only during active calls. Some metrics may
              vary depending on browser support.
            </p>
          </div>
        </Message>

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
        <Message v-if="!effectiveIsConnected" severity="info" :closable="false" class="mt-4">
          <template #icon><i class="pi pi-info-circle"></i></template>
          {{
            isSimulationMode
              ? 'Enable simulation and run a scenario to see quality metrics'
              : 'Connect to a SIP server to view call quality metrics (use the Basic Call demo to connect)'
          }}
        </Message>

        <Message v-else-if="effectiveCallState !== 'active'" severity="warn" :closable="false" class="mt-4">
          <template #icon><i class="pi pi-exclamation-triangle"></i></template>
          {{
            isSimulationMode
              ? 'Run the "Active Call" scenario to see quality metrics'
              : 'Make or answer a call to see real-time quality metrics'
          }}
        </Message>

        <!-- Quality Metrics -->
        <div v-else class="quality-metrics mt-4">
          <!-- Overall Quality Score -->
          <Panel header="Overall Quality Score" class="mb-4">
            <div class="score-container">
              <div class="score-circle" :class="qualityLevel">
                <div class="score-value">{{ qualityScore }}</div>
                <div class="score-label">Quality</div>
              </div>
              <div class="score-indicator">
                <ProgressBar :value="qualityScore" :showValue="false" class="mb-2" />
                <div class="indicator-text">
                  <Tag :severity="getQualitySeverity(qualityLevel)" :value="qualityText" />
                </div>
              </div>
            </div>
          </Panel>

          <!-- Audio Codec Information -->
          <Panel header="Audio Codec" class="mb-4">
            <div class="info-grid">
              <div class="info-item codec">
                <div class="info-icon">
                  <i class="pi pi-microphone"></i>
                </div>
                <div class="info-content">
                  <span class="info-label">Codec</span>
                  <span class="info-value">{{ codecInfo.name }}</span>
                </div>
              </div>
              <div class="info-item sample-rate">
                <div class="info-icon">
                  <i class="pi pi-wave-pulse"></i>
                </div>
                <div class="info-content">
                  <span class="info-label">Sample Rate</span>
                  <span class="info-value">{{ codecInfo.sampleRate }} Hz</span>
                </div>
              </div>
              <div class="info-item channels">
                <div class="info-icon">
                  <i class="pi pi-volume-up"></i>
                </div>
                <div class="info-content">
                  <span class="info-label">Channels</span>
                  <span class="info-value">{{ codecInfo.channels }}</span>
                </div>
              </div>
              <div class="info-item bitrate">
                <div class="info-icon">
                  <i class="pi pi-bolt"></i>
                </div>
                <div class="info-content">
                  <span class="info-label">Bitrate</span>
                  <span class="info-value">{{ codecInfo.bitrate }} kbps</span>
                </div>
              </div>
            </div>
          </Panel>

          <!-- Network Statistics -->
          <Panel header="Network Statistics" class="mb-4">
            <div class="stats-grid">
              <div class="stat-card packet-loss">
                <div class="stat-icon">
                  <i class="pi pi-exclamation-circle"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ networkStats.packetLoss.toFixed(2) }}%</div>
                  <div class="stat-label">Packet Loss</div>
                  <Tag :severity="getQualitySeverity(getPacketLossLevel(networkStats.packetLoss))" :value="getPacketLossText(networkStats.packetLoss)" />
                </div>
              </div>

              <div class="stat-card jitter">
                <div class="stat-icon">
                  <i class="pi pi-chart-line"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ networkStats.jitter.toFixed(2) }}ms</div>
                  <div class="stat-label">Jitter</div>
                  <Tag :severity="getQualitySeverity(getJitterLevel(networkStats.jitter))" :value="getJitterText(networkStats.jitter)" />
                </div>
              </div>

              <div class="stat-card rtt">
                <div class="stat-icon">
                  <i class="pi pi-sync"></i>
                </div>
                <div class="stat-content">
                  <div class="stat-value">{{ networkStats.rtt.toFixed(2) }}ms</div>
                  <div class="stat-label">Round Trip Time</div>
                  <Tag :severity="getQualitySeverity(getRttLevel(networkStats.rtt))" :value="getRttText(networkStats.rtt)" />
                </div>
              </div>
            </div>
          </Panel>

          <!-- Packet Information -->
          <Panel header="Packet Statistics" class="mb-4" toggleable collapsed>
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
                <Tag severity="danger" :value="formatNumber(packetStats.lost)" />
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
          </Panel>

          <!-- Recommendations -->
          <Message v-if="recommendations.length > 0" severity="warn" :closable="false" class="mb-4">
            <template #icon><i class="pi pi-lightbulb"></i></template>
            <div>
              <strong>Recommendations</strong>
              <ul class="mt-2 mb-0 pl-4">
                <li v-for="(rec, index) in recommendations" :key="index">{{ rec }}</li>
              </ul>
            </div>
          </Message>
        </div>

        <Divider />

        <h4>Code Example</h4>
        <pre class="code-block"><code>import { ref, onUnmounted } from 'vue'
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
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// PrimeVue components
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Divider from 'primevue/divider'

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

const getQualitySeverity = (level: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' => {
  switch (level) {
    case 'excellent':
      return 'success'
    case 'good':
      return 'info'
    case 'fair':
      return 'warn'
    case 'poor':
      return 'danger'
    default:
      return 'secondary'
  }
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
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
}

.info-section p {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: var(--spacing-md);
  background: var(--bg-info-light);
  border-left: 3px solid var(--color-info);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.status-message {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  text-align: center;
  font-size: var(--text-sm);
}

.status-message.info {
  background: var(--bg-info-light);
  color: var(--color-info);
}

.status-message.warning {
  background: var(--bg-warning-light);
  color: var(--color-warning);
}

.quality-metrics {
  padding: var(--spacing-lg);
}

.quality-score-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.quality-score-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.score-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-2xl);
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 8px solid;
  flex-shrink: 0;
  transition: all var(--transition-base);
}

.score-circle.excellent {
  border-color: var(--color-success);
  background: var(--bg-success-light);
}

.score-circle.good {
  border-color: var(--color-info);
  background: var(--bg-info-light);
}

.score-circle.fair {
  border-color: var(--color-warning);
  background: var(--bg-warning-light);
}

.score-circle.poor {
  border-color: var(--color-danger);
  background: var(--bg-danger-light);
}

.score-value {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.score-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  font-weight: var(--font-medium);
}

.score-indicator {
  flex: 1;
}

.indicator-bar {
  height: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.indicator-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.indicator-fill.excellent {
  background: var(--gradient-green);
}

.indicator-fill.good {
  background: var(--gradient-blue);
}

.indicator-fill.fair {
  background: var(--gradient-orange);
}

.indicator-fill.poor {
  background: var(--gradient-red);
}

.indicator-text {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.metrics-section {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.metrics-section h3 {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
}

.info-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  overflow: hidden;
}

.info-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.info-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.info-item:hover::before {
  opacity: 1;
}

/* Info item gradient styling */
.info-item.codec .info-icon {
  background: var(--gradient-blue);
}
.info-item.codec::before {
  background: var(--gradient-blue);
}
.info-item.codec:hover {
  box-shadow: var(--shadow-blue);
}

.info-item.sample-rate .info-icon {
  background: var(--gradient-purple);
}
.info-item.sample-rate::before {
  background: var(--gradient-purple);
}
.info-item.sample-rate:hover {
  box-shadow: var(--shadow-purple);
}

.info-item.channels .info-icon {
  background: var(--gradient-pink);
}
.info-item.channels::before {
  background: var(--gradient-pink);
}
.info-item.channels:hover {
  box-shadow: var(--shadow-pink);
}

.info-item.bitrate .info-icon {
  background: var(--gradient-orange);
}
.info-item.bitrate::before {
  background: var(--gradient-orange);
}
.info-item.bitrate:hover {
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-sm);
}

.info-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
}

.stat-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
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

/* Stat card gradient styling */
.stat-card.packet-loss .stat-icon {
  background: var(--gradient-red);
}
.stat-card.packet-loss::before {
  background: var(--gradient-red);
}
.stat-card.packet-loss:hover {
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.stat-card.jitter .stat-icon {
  background: var(--gradient-orange);
}
.stat-card.jitter::before {
  background: var(--gradient-orange);
}
.stat-card.jitter:hover {
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
}

.stat-card.rtt .stat-icon {
  background: var(--gradient-blue);
}
.stat-card.rtt::before {
  background: var(--gradient-blue);
}
.stat-card.rtt:hover {
  box-shadow: var(--shadow-blue);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-sm);
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-quality {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.stat-quality.excellent {
  background: var(--bg-success-light);
  color: var(--color-success);
}

.stat-quality.good {
  background: var(--bg-info-light);
  color: var(--color-info);
}

.stat-quality.fair {
  background: var(--bg-warning-light);
  color: var(--color-warning);
}

.stat-quality.poor {
  background: var(--bg-danger-light);
  color: var(--color-danger);
}

.packet-stats {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.packet-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
}

.packet-row:hover {
  background: var(--bg-hover);
  border-color: var(--border-color-hover);
}

.packet-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.packet-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.packet-value.lost {
  color: var(--color-danger);
}

.recommendations {
  background: var(--bg-info-light);
  border: 2px solid var(--color-info);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
}

.recommendations h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--color-info);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.recommendations ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.recommendations li {
  color: var(--color-info);
  font-size: var(--text-sm);
  line-height: 1.6;
  margin-bottom: var(--spacing-sm);
}

.recommendations li:last-child {
  margin-bottom: 0;
}

.code-example {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.code-example h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.code-example pre {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
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
</style>
