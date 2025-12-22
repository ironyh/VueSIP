<template>
  <div class="webrtc-stats-demo">
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

    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">
            <i class="pi pi-chart-bar" style="font-size: 1.5rem"></i>
          </span>
          <span>WebRTC Statistics</span>
        </div>
      </template>
      <template #subtitle>Monitor real-time call quality metrics</template>
      <template #content>
        <!-- No Active Call Warning -->
        <Message v-if="!hasActiveSession" severity="info" :closable="false" class="info-message">
          <template #icon><i class="pi pi-info-circle"></i></template>
          <div>
            <strong>No Active Call</strong>
            <p>Start a call to see real-time WebRTC statistics. This demo monitors:</p>
            <ul>
              <li>Audio/video quality metrics (jitter, packet loss)</li>
              <li>Network latency and round-trip time</li>
              <li>Bandwidth and bitrate usage</li>
              <li>MOS score estimation</li>
            </ul>
          </div>
        </Message>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <Tag
              :severity="isCollecting ? 'success' : 'secondary'"
              :value="isCollecting ? 'Collecting' : 'Stopped'"
            />
            <Tag :severity="getQualitySeverity(quality)" :value="quality" />
            <Tag v-if="mosScore" severity="info" :value="`MOS: ${mosScore.value.toFixed(1)}`" />
            <Tag v-if="alerts.length > 0" severity="warning" :value="`${alerts.length} alerts`" />
          </div>

          <!-- Controls -->
          <div class="controls">
            <Button
              v-if="!isCollecting"
              label="Start Monitoring"
              icon="pi pi-play"
              @click="start"
            />
            <Button
              v-else
              label="Stop Monitoring"
              icon="pi pi-stop"
              severity="secondary"
              @click="stop"
            />
            <Button
              label="Clear History"
              icon="pi pi-trash"
              severity="secondary"
              size="small"
              @click="clearHistory"
            />
          </div>

          <!-- Quality Overview -->
          <Panel header="Call Quality" class="section-panel">
            <div class="quality-grid">
              <div class="quality-card" :class="getQualityClass('packetLoss')">
                <div class="quality-icon">PKT</div>
                <div class="quality-info">
                  <span class="quality-label">Packet Loss</span>
                  <span class="quality-value">{{ avgPacketLoss.toFixed(2) }}%</span>
                </div>
                <div class="quality-status">
                  <i :class="getStatusIcon(avgPacketLoss, 1, 5)"></i>
                </div>
              </div>

              <div class="quality-card" :class="getQualityClass('jitter')">
                <div class="quality-icon">JTR</div>
                <div class="quality-info">
                  <span class="quality-label">Jitter</span>
                  <span class="quality-value">{{ avgJitter.toFixed(1) }} ms</span>
                </div>
                <div class="quality-status">
                  <i :class="getStatusIcon(avgJitter, 30, 100)"></i>
                </div>
              </div>

              <div class="quality-card" :class="getQualityClass('rtt')">
                <div class="quality-icon">RTT</div>
                <div class="quality-info">
                  <span class="quality-label">Round Trip</span>
                  <span class="quality-value">{{ avgRtt ? avgRtt.toFixed(0) : 'N/A' }} ms</span>
                </div>
                <div class="quality-status">
                  <i :class="getStatusIcon(avgRtt || 0, 150, 300)"></i>
                </div>
              </div>

              <div class="quality-card">
                <div class="quality-icon">BPS</div>
                <div class="quality-info">
                  <span class="quality-label">Bitrate</span>
                  <span class="quality-value">{{ currentBitrate.toFixed(0) }} kbps</span>
                </div>
              </div>
            </div>

            <!-- MOS Score Display -->
            <div v-if="mosScore" class="mos-display">
              <div class="mos-gauge">
                <div
                  class="mos-value"
                  :style="{ '--mos-percentage': getMosPercentage(mosScore.value) + '%' }"
                >
                  {{ mosScore.value.toFixed(2) }}
                </div>
                <div class="mos-label">MOS Score</div>
                <div class="mos-description">{{ getMosDescription(mosScore.value) }}</div>
              </div>
              <div class="mos-breakdown">
                <div class="mos-factor">
                  <span>Audio Quality</span>
                  <ProgressBar :value="mosScore.audioQuality * 100" :showValue="false" />
                </div>
                <div class="mos-factor">
                  <span>Network Quality</span>
                  <ProgressBar :value="mosScore.networkQuality * 100" :showValue="false" />
                </div>
              </div>
            </div>
          </Panel>

          <!-- Alerts -->
          <Panel
            v-if="alerts.length > 0"
            header="Quality Alerts"
            class="section-panel alerts-panel"
          >
            <div class="alerts-list">
              <div
                v-for="alert in alerts"
                :key="alert.id"
                class="alert-item"
                :class="alert.severity"
              >
                <i :class="getAlertIcon(alert.severity)"></i>
                <div class="alert-content">
                  <span class="alert-message">{{ alert.message }}</span>
                  <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                </div>
                <Tag :severity="getAlertTagSeverity(alert.severity)" :value="alert.metric" />
              </div>
            </div>
            <Button
              label="Clear Alerts"
              icon="pi pi-times"
              size="small"
              severity="secondary"
              @click="clearAlerts"
              class="mt-2"
            />
          </Panel>

          <!-- Detailed Stats -->
          <Panel header="Detailed Statistics" class="section-panel" toggleable collapsed>
            <div v-if="stats" class="stats-detail">
              <h5>Audio</h5>
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Packets Received</span>
                  <span class="stat-value">{{ stats.audio?.packetsReceived || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Packets Lost</span>
                  <span class="stat-value">{{ stats.audio?.packetsLost || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Bytes Received</span>
                  <span class="stat-value">{{ formatBytes(stats.audio?.bytesReceived || 0) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Codec</span>
                  <span class="stat-value">{{ stats.audio?.codec || 'N/A' }}</span>
                </div>
              </div>

              <h5 v-if="stats.video">Video</h5>
              <div v-if="stats.video" class="stats-grid">
                <div class="stat-item">
                  <span class="stat-label">Resolution</span>
                  <span class="stat-value">{{ stats.video.width }}x{{ stats.video.height }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Frame Rate</span>
                  <span class="stat-value">{{ stats.video.frameRate?.toFixed(1) || 0 }} fps</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Codec</span>
                  <span class="stat-value">{{ stats.video.codec || 'N/A' }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state small">
              <span>No statistics available</span>
            </div>
          </Panel>

          <!-- History Chart Placeholder -->
          <Panel header="Quality History" class="section-panel" toggleable collapsed>
            <div class="history-info">
              <Tag severity="info" :value="`${history.length} samples`" />
              <span class="text-muted"
              >Last {{ Math.min(history.length, 300) / 60 }} minutes of data</span
              >
            </div>
            <div class="history-preview">
              <div class="mini-chart">
                <div
                  v-for="(entry, index) in recentHistory"
                  :key="index"
                  class="chart-bar"
                  :style="{ height: getMosBarHeight(entry.mosScore) + '%' }"
                  :class="getQualityClassFromMos(entry.mosScore)"
                ></div>
              </div>
            </div>
          </Panel>
        </template>

        <Divider />

        <h4>Code Example</h4>
        <pre class="code-block">{{ codeExample }}</pre>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useSipWebRTCStats, useCallSession } from '@/composables'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// PrimeVue components
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import ProgressBar from 'primevue/progressbar'
import Divider from 'primevue/divider'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Get call session from playground SIP client
const callSession = useCallSession(playgroundSipClient)
const sessionRef = computed(() => callSession?.session?.value)
const realHasActiveSession = computed(() => callSession?.callState?.value === 'active')

// Effective values for simulation
const hasActiveSession = computed(() =>
  isSimulationMode.value ? simulation.state.value === 'active' : realHasActiveSession.value
)

// WebRTC Stats composable
const {
  stats,
  quality,
  mosScore,
  history,
  alerts,
  isCollecting,
  avgPacketLoss,
  avgJitter,
  avgRtt,
  currentBitrate,
  start,
  stop,
  clearHistory,
  clearAlerts,
  onAlert,
  onQualityChange,
} = useSipWebRTCStats(sessionRef, {
  pollInterval: 1000,
  autoStart: false,
  onQualityAlert: (alert) => {
    console.log('Quality alert:', alert)
  },
})

// Recent history for mini chart
const recentHistory = computed(() => history.value.slice(-60))

// Auto-start when call becomes active
watch(
  () => callSession?.callState?.value,
  (state) => {
    if (state === 'active') {
      start()
    } else {
      stop()
    }
  }
)

// Register listeners
onAlert((alert) => {
  console.log('Alert:', alert.severity, alert.message)
})

onQualityChange((newQuality, oldQuality) => {
  console.log('Quality changed:', oldQuality, '->', newQuality)
})

// Helpers
const getQualitySeverity = (q: string) => {
  switch (q) {
    case 'excellent':
      return 'success'
    case 'good':
      return 'info'
    case 'fair':
      return 'warning'
    case 'poor':
      return 'danger'
    default:
      return 'secondary'
  }
}

const getQualityClass = (metric: string) => {
  const value =
    metric === 'packetLoss'
      ? avgPacketLoss.value
      : metric === 'jitter'
        ? avgJitter.value
        : metric === 'rtt'
          ? (avgRtt.value ?? 0)
          : 0

  if (metric === 'packetLoss') {
    if (value < 1) return 'excellent'
    if (value < 3) return 'good'
    if (value < 5) return 'fair'
    return 'poor'
  }

  if (metric === 'jitter') {
    if (value < 30) return 'excellent'
    if (value < 50) return 'good'
    if (value < 100) return 'fair'
    return 'poor'
  }

  if (metric === 'rtt') {
    if (value < 100) return 'excellent'
    if (value < 200) return 'good'
    if (value < 300) return 'fair'
    return 'poor'
  }

  return ''
}

const getStatusIcon = (value: number, good: number, bad: number) => {
  if (value < good) return 'pi pi-check-circle text-success'
  if (value < bad) return 'pi pi-exclamation-circle text-warning'
  return 'pi pi-times-circle text-danger'
}

const getMosPercentage = (mos: number) => {
  return Math.max(0, Math.min(100, ((mos - 1) / 4) * 100))
}

const getMosDescription = (mos: number) => {
  if (mos >= 4.3) return 'Excellent'
  if (mos >= 4.0) return 'Good'
  if (mos >= 3.6) return 'Fair'
  if (mos >= 3.0) return 'Poor'
  return 'Bad'
}

const getMosBarHeight = (mos: number | undefined) => {
  if (!mos) return 20
  return Math.max(10, ((mos - 1) / 4) * 100)
}

const getQualityClassFromMos = (mos: number | undefined) => {
  if (!mos) return ''
  if (mos >= 4.0) return 'excellent'
  if (mos >= 3.5) return 'good'
  if (mos >= 3.0) return 'fair'
  return 'poor'
}

const getAlertIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'pi pi-exclamation-triangle'
    case 'warning':
      return 'pi pi-exclamation-circle'
    default:
      return 'pi pi-info-circle'
  }
}

const getAlertTagSeverity = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const codeExample = `import { useSipWebRTCStats } from 'vuesip'

const {
  stats,
  quality,
  mosScore,
  avgPacketLoss,
  avgJitter,
  avgRtt,
  currentBitrate,
  start,
  stop,
  onAlert,
  onQualityChange,
} = useSipWebRTCStats(callSessionRef, {
  pollInterval: 1000,
  onQualityAlert: (alert) => {
    if (alert.severity === 'critical') {
      console.warn('Call quality issue:', alert.message)
    }
  },
})

// Start collecting when call is active
watch(() => callState.value, (state) => {
  if (state === 'active') start()
})

// Monitor quality changes
onQualityChange((newQuality, oldQuality) => {
  console.log('Quality:', oldQuality, '->', newQuality)
})

// Listen for alerts
onAlert((alert) => {
  showNotification(alert.message, alert.severity)
})

// Access current stats
console.log('MOS score:', mosScore.value?.value)
console.log('Packet loss:', avgPacketLoss.value + '%')
console.log('Jitter:', avgJitter.value + 'ms')
console.log('RTT:', avgRtt.value + 'ms')`
</script>

<style scoped>
/* Import global theme system for light/dark mode support */
@import '../styles/themes.css';

.webrtc-stats-demo {
  max-width: 900px;
  margin: 0 auto;
  font-family: var(--font-sans);
  color: var(--text-primary);
}

/* Demo Card Container */
.demo-card {
  position: relative;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
  margin: var(--spacing-md);
  overflow: hidden;
  transition: all var(--transition-base);
}

.demo-card::before {
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

.demo-card:hover::before {
  opacity: 1;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.demo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-blue);
}

.demo-icon svg {
  width: 24px;
  height: 24px;
}

.demo-titles h2 {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.demo-subtitle {
  margin: var(--spacing-xs) 0 0 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.demo-content {
  /* Container for all demo content */
}

/* Info Message Banner */
.info-message {
  position: relative;
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-info-light);
  border: 2px solid var(--color-info);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xl);
  overflow: hidden;
  animation: fadeIn 0.3s ease-out;
}

.info-message::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-blue);
  opacity: 1;
}

.info-icon {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-content strong {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.info-content p {
  margin: var(--spacing-xs) 0;
  color: var(--text-secondary);
}

.info-content ul {
  margin: var(--spacing-sm) 0 0 var(--spacing-lg);
  padding: 0;
  list-style: disc;
}

.info-content li {
  margin: var(--spacing-xs) 0;
  color: var(--text-secondary);
}

/* Status Bar */
.status-bar {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
}

.status-badge {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-on-gradient);
  transition: all var(--transition-fast);
}

.status-badge.collecting {
  background: var(--gradient-green);
  box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2);
}

.status-badge.stopped {
  background: var(--bg-neutral-light);
  color: var(--text-secondary);
  border: 2px solid var(--border-color);
}

.status-badge.quality-excellent {
  background: var(--gradient-green);
}

.status-badge.quality-good {
  background: var(--gradient-blue);
}

.status-badge.quality-fair {
  background: var(--gradient-orange);
}

.status-badge.quality-poor {
  background: var(--gradient-red);
}

.status-badge.badge-info {
  background: var(--gradient-blue);
}

.status-badge.badge-warning {
  background: var(--gradient-orange);
}

.status-badge.badge-danger {
  background: var(--gradient-red);
}

/* Controls */
.controls {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.btn-primary {
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover {
  background: var(--gradient-blue-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-blue);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.btn-secondary:hover {
  border-color: var(--color-info);
  background: var(--bg-hover);
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
}

/* Section Panels */
.section-panel {
  position: relative;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  overflow: hidden;
  transition: all var(--transition-base);
}

.section-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-indigo);
  opacity: 0;
  transition: opacity var(--transition-base);
}

.section-panel:hover::before {
  opacity: 1;
}

.panel-header {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.collapsible-panel summary {
  cursor: pointer;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.collapsible-panel summary::-webkit-details-marker {
  display: none;
}

.collapsible-panel summary::before {
  content: '▶';
  font-size: var(--text-sm);
  transition: transform var(--transition-fast);
  color: var(--text-secondary);
}

.collapsible-panel[open] summary::before {
  transform: rotate(90deg);
}

/* Quality Cards Grid */
.quality-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.quality-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-base);
}

.quality-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.quality-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.quality-card:hover::before {
  opacity: 1;
}

.quality-card.excellent::before {
  background: var(--gradient-green);
}

.quality-card.good::before {
  background: var(--gradient-blue);
}

.quality-card.fair::before {
  background: var(--gradient-orange);
}

.quality-card.poor::before {
  background: var(--gradient-red);
}

.quality-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--gradient-indigo);
  color: var(--text-on-gradient);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.quality-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.quality-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quality-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
}

.quality-status i {
  font-size: var(--text-lg);
}

.text-success {
  color: var(--color-success);
}

.text-warning {
  color: var(--color-warning);
}

.text-danger {
  color: var(--color-danger);
}

/* MOS Score Display */
.mos-display {
  display: flex;
  gap: var(--spacing-2xl);
  padding: var(--spacing-xl);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  align-items: center;
  transition: all var(--transition-base);
}

.mos-gauge {
  text-align: center;
  padding: var(--spacing-lg);
  background: var(--gradient-blue);
  border-radius: var(--radius-md);
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-blue);
  min-width: 140px;
}

.mos-value {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: 1;
  margin-bottom: var(--spacing-xs);
}

.mos-label {
  font-size: var(--text-sm);
  opacity: 0.9;
  font-weight: var(--font-medium);
}

.mos-description {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-top: var(--spacing-xs);
}

.mos-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.mos-factor {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.mos-factor span {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
}

/* Progress Bar */
.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--gradient-green);
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}

/* Alerts Panel */
.alerts-panel {
  border-color: var(--color-warning);
  background: var(--bg-warning-light);
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.alert-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  transition: all var(--transition-fast);
}

.alert-item:hover {
  border-color: var(--color-info);
  box-shadow: var(--shadow-sm);
}

.alert-item.critical {
  background: var(--bg-danger-light);
  border-color: var(--color-danger);
}

.alert-item.warning {
  background: var(--bg-warning-light);
  border-color: var(--color-warning);
}

.alert-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.alert-message {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.alert-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.alert-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--text-on-gradient);
}

.mt-2 {
  margin-top: var(--spacing-md);
}

/* Detailed Stats */
.stats-detail h5 {
  margin: var(--spacing-xl) 0 var(--spacing-md) 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.stats-detail h5:first-child {
  margin-top: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-sm);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.stat-item:hover {
  border-color: var(--color-info);
  background: var(--bg-hover);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

/* History Chart */
.history-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.history-preview {
  padding: var(--spacing-lg);
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
}

.chart-bar {
  flex: 1;
  min-width: 3px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: all var(--transition-base);
}

.chart-bar:hover {
  opacity: 0.8;
}

.chart-bar.excellent {
  background: var(--gradient-green);
}

.chart-bar.good {
  background: var(--gradient-blue);
}

.chart-bar.fair {
  background: var(--gradient-orange);
}

.chart-bar.poor {
  background: var(--gradient-red);
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-2xl);
  color: var(--text-muted);
  text-align: center;
}

.empty-state.small {
  padding: var(--spacing-lg);
}

.text-muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

/* Divider */
.divider {
  height: 2px;
  background: var(--border-color);
  margin: var(--spacing-2xl) 0;
  border-radius: var(--radius-full);
}

/* Code Block */
h4 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.code-block {
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  white-space: pre;
  color: var(--text-primary);
}

/* Responsive Design */
@media (max-width: 768px) {
  .webrtc-stats-demo {
    padding: 0 var(--spacing-sm);
  }

  .demo-card {
    margin: var(--spacing-sm);
    padding: var(--spacing-lg);
  }

  .demo-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .quality-grid {
    grid-template-columns: 1fr;
  }

  .mos-display {
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .mos-gauge {
    width: 100%;
  }
}

/* Accessibility - Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Animation Keyframes */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
