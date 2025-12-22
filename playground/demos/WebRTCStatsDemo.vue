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
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
          </span>
          <span>WebRTC Statistics</span>
        </div>
      </template>
      <template #subtitle>Monitor real-time call quality metrics</template>
      <template #content>
        <!-- No Active Call Warning -->
        <Message v-if="!hasActiveSession" severity="info" :closable="false" class="info-message">
          <template #icon><i class="pi pi-info-circle text-xl"></i></template>
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
          <div class="controls flex flex-column sm:flex-row gap-2">
            <Button
              v-if="!isCollecting"
              label="Start Monitoring"
              icon="pi pi-play"
              @click="start"
              class="w-full sm:w-auto"
            />
            <Button
              v-else
              label="Stop Monitoring"
              icon="pi pi-stop"
              severity="secondary"
              @click="stop"
              class="w-full sm:w-auto"
            />
            <Button
              label="Clear History"
              icon="pi pi-trash"
              severity="secondary"
              size="small"
              @click="clearHistory"
              class="w-full sm:w-auto"
            />
          </div>

          <!-- Quality Overview -->
          <Panel header="Call Quality" class="section-panel">
            <div class="quality-grid grid">
              <div
                class="quality-card col-12 sm:col-6 lg:col-3"
                :class="getQualityClass('packetLoss')"
              >
                <div class="quality-icon">PKT</div>
                <div class="quality-info">
                  <span class="quality-label">Packet Loss</span>
                  <span class="quality-value">{{ avgPacketLoss.toFixed(2) }}%</span>
                </div>
                <div class="quality-status">
                  <i :class="getStatusIcon(avgPacketLoss, 1, 5)"></i>
                </div>
              </div>

              <div class="quality-card col-12 sm:col-6 lg:col-3" :class="getQualityClass('jitter')">
                <div class="quality-icon">JTR</div>
                <div class="quality-info">
                  <span class="quality-label">Jitter</span>
                  <span class="quality-value">{{ avgJitter.toFixed(1) }} ms</span>
                </div>
                <div class="quality-status">
                  <i :class="getStatusIcon(avgJitter, 30, 100)"></i>
                </div>
              </div>

              <div class="quality-card col-12 sm:col-6 lg:col-3" :class="getQualityClass('rtt')">
                <div class="quality-icon">RTT</div>
                <div class="quality-info">
                  <span class="quality-label">Round Trip</span>
                  <span class="quality-value">{{ avgRtt ? avgRtt.toFixed(0) : 'N/A' }} ms</span>
                </div>
                <div class="quality-status">
                  <i :class="getStatusIcon(avgRtt || 0, 150, 300)"></i>
                </div>
              </div>

              <div class="quality-card col-12 sm:col-6 lg:col-3">
                <div class="quality-icon">BPS</div>
                <div class="quality-info">
                  <span class="quality-label">Bitrate</span>
                  <span class="quality-value">{{ currentBitrate.toFixed(0) }} kbps</span>
                </div>
              </div>
            </div>

            <!-- MOS Score Display -->
            <div
              v-if="mosScore"
              class="mos-display flex flex-column md:flex-row gap-3 md:gap-4 p-3 md:p-4 surface-ground border-round"
            >
              <div class="mos-gauge text-center md:text-left">
                <div
                  class="mos-value"
                  :style="{ '--mos-percentage': getMosPercentage(mosScore.value) + '%' }"
                >
                  {{ mosScore.value.toFixed(2) }}
                </div>
                <div class="mos-label">MOS Score</div>
                <div class="mos-description">{{ getMosDescription(mosScore.value) }}</div>
              </div>
              <div class="mos-breakdown flex-1">
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
          <Panel
            header="Detailed Statistics"
            :toggleable="true"
            :collapsed="true"
            class="section-panel"
          >
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
          <Panel
            header="Quality History"
            :toggleable="true"
            :collapsed="true"
            class="section-panel"
          >
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
import { Card, Panel, Button, Tag, ProgressBar, Message, Divider } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Get call session from playground SIP client
const callSession = useCallSession(playgroundSipClient)
const sessionRef = computed(() => callSession.session.value)
const realHasActiveSession = computed(() => callSession.callState.value === 'active')

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
  () => callSession.callState.value,
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
.webrtc-stats-demo {
  max-width: 900px;
  margin: 0 auto;
}

.demo-card {
  margin: 1rem;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-icon {
  font-size: 1.5rem;
}

.info-message {
  margin-bottom: 1rem;
}

.info-message ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

.info-message li {
  margin: 0.25rem 0;
}

.status-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.section-panel {
  margin-bottom: 1rem;
}

.quality-grid {
  margin-bottom: 1rem;
}

.quality-grid .quality-card {
  margin-bottom: 0;
}

.quality-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
  border-left: 4px solid var(--surface-border);
}

.quality-card.excellent {
  border-left-color: var(--green-500);
}
.quality-card.good {
  border-left-color: var(--blue-500);
}
.quality-card.fair {
  border-left-color: var(--orange-500);
}
.quality-card.poor {
  border-left-color: var(--red-500);
}

.quality-icon {
  font-size: 1.5rem;
}

.quality-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.quality-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.quality-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.text-success {
  color: var(--green-500);
}
.text-warning {
  color: var(--orange-500);
}
.text-danger {
  color: var(--red-500);
}

/* Removed duplicate mos-display styles - now using PrimeFlex classes in template */

.mos-gauge {
  text-align: center;
}

.mos-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.mos-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.mos-description {
  font-weight: 500;
}

.mos-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mos-factor {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mos-factor span {
  font-size: 0.875rem;
}

.alerts-panel {
  border-color: var(--orange-200);
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--surface-ground);
}

.alert-item.critical {
  background: var(--red-50);
}
.alert-item.warning {
  background: var(--orange-50);
}

.alert-item i {
  font-size: 1.25rem;
}

.alert-item.critical i {
  color: var(--red-500);
}
.alert-item.warning i {
  color: var(--orange-500);
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.alert-message {
  font-size: 0.875rem;
}

.alert-time {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.stats-detail h5 {
  margin: 1rem 0 0.5rem 0;
}

.stats-detail h5:first-child {
  margin-top: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: 6px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.stat-value {
  font-weight: 500;
}

.history-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.history-preview {
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 6px;
}

.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
}

.chart-bar {
  flex: 1;
  min-width: 2px;
  background: var(--primary-color);
  border-radius: 2px 2px 0 0;
  transition: height 0.2s;
}

.chart-bar.excellent {
  background: var(--green-500);
}
.chart-bar.good {
  background: var(--blue-500);
}
.chart-bar.fair {
  background: var(--orange-500);
}
.chart-bar.poor {
  background: var(--red-500);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.empty-state.small {
  padding: 1rem;
}

.text-muted {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.mt-2 {
  margin-top: 0.5rem;
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
