<template>
  <div class="network-simulator-demo">
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

    <h2>Network Condition Simulator</h2>
    <p class="description">
      Simulate various network conditions to test call quality and resilience.
    </p>

    <!-- Connection Status -->
    <div class="status-section">
      <div :class="['status-badge', connectionState]">
        {{ connectionState.toUpperCase() }}
      </div>
      <div class="network-status">
        <span class="indicator" :style="{ backgroundColor: networkQualityColor }"></span>
        <span>{{ activeProfile }}</span>
      </div>
      <div v-if="!isConnected" class="connection-hint">
        Configure SIP credentials in <strong>Settings</strong> or <strong>Basic Call</strong> demo
      </div>
    </div>

    <!-- Network Profiles -->
    <div class="profiles-section">
      <h3>Network Profiles</h3>
      <div class="profiles-grid">
        <div
          v-for="profile in networkProfiles"
          :key="profile.name"
          :class="['profile-card', { active: activeProfile === profile.name }]"
          @click="applyProfile(profile)"
        >
          <div class="profile-icon">
            <span :class="['profile-indicator', getProfileClass(profile.name)]"></span>
          </div>
          <div class="profile-name">{{ profile.name }}</div>
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-label">Latency:</span>
              <span class="stat-value">{{ profile.latency }}ms</span>
            </div>
            <div class="stat">
              <span class="stat-label">Packet Loss:</span>
              <span class="stat-value">{{ profile.packetLoss }}%</span>
            </div>
            <div class="stat">
              <span class="stat-label">Jitter:</span>
              <span class="stat-value">{{ profile.jitter }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Network Settings -->
    <div class="custom-settings-section">
      <h3>Custom Network Settings</h3>
      <div class="settings-grid">
        <div class="setting-group">
          <label>Latency (ms)</label>
          <input type="range" v-model.number="customLatency" min="0" max="1000" step="10" />
          <span class="value">{{ customLatency }}ms</span>
          <div class="indicator-bar">
            <div
              class="indicator-fill latency"
              :style="{ width: (customLatency / 1000) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <div class="setting-group">
          <label>Packet Loss (%)</label>
          <input type="range" v-model.number="customPacketLoss" min="0" max="50" step="1" />
          <span class="value">{{ customPacketLoss }}%</span>
          <div class="indicator-bar">
            <div
              class="indicator-fill packet-loss"
              :style="{ width: (customPacketLoss / 50) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <div class="setting-group">
          <label>Jitter (ms)</label>
          <input type="range" v-model.number="customJitter" min="0" max="200" step="5" />
          <span class="value">{{ customJitter }}ms</span>
          <div class="indicator-bar">
            <div
              class="indicator-fill jitter"
              :style="{ width: (customJitter / 200) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <div class="setting-group">
          <label>Bandwidth (kbps)</label>
          <input type="range" v-model.number="customBandwidth" min="16" max="10000" step="16" />
          <span class="value">{{ customBandwidth }}kbps</span>
          <div class="indicator-bar">
            <div
              class="indicator-fill bandwidth"
              :style="{ width: (customBandwidth / 10000) * 100 + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <button @click="applyCustomSettings" class="apply-btn">Apply Custom Settings</button>
    </div>

    <!-- Call Section -->
    <div v-if="isConnected" class="call-section">
      <h3>Test Call</h3>
      <div class="form-group">
        <label>Target SIP URI</label>
        <input
          v-model="targetUri"
          type="text"
          placeholder="sip:target@example.com"
          @keyup.enter="makeCall"
        />
      </div>
      <button @click="makeCall" :disabled="hasActiveCall">Make Test Call</button>
    </div>

    <!-- Active Call with Network Stats -->
    <div v-if="hasActiveCall" class="active-call-section">
      <h3>Active Call</h3>

      <!-- Real-time Network Metrics -->
      <div class="metrics-section">
        <h4>Real-time Network Metrics</h4>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon latency-icon"></div>
            <div class="metric-value">{{ currentMetrics.latency }}ms</div>
            <div class="metric-label">Current Latency</div>
            <div :class="['quality-indicator', getQualityClass(currentMetrics.latency, 'latency')]">
              {{ getQualityLabel(currentMetrics.latency, 'latency') }}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon packet-loss-icon"></div>
            <div class="metric-value">{{ currentMetrics.packetLoss.toFixed(1) }}%</div>
            <div class="metric-label">Packet Loss</div>
            <div
              :class="[
                'quality-indicator',
                getQualityClass(currentMetrics.packetLoss, 'packetLoss'),
              ]"
            >
              {{ getQualityLabel(currentMetrics.packetLoss, 'packetLoss') }}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon jitter-icon"></div>
            <div class="metric-value">{{ currentMetrics.jitter }}ms</div>
            <div class="metric-label">Jitter</div>
            <div :class="['quality-indicator', getQualityClass(currentMetrics.jitter, 'jitter')]">
              {{ getQualityLabel(currentMetrics.jitter, 'jitter') }}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon quality-icon"></div>
            <div class="metric-value">{{ currentMetrics.quality }}</div>
            <div class="metric-label">Overall Quality</div>
            <div :class="['quality-score', currentMetrics.quality.toLowerCase()]">
              {{ currentMetrics.quality }}
            </div>
          </div>
        </div>
      </div>

      <!-- Historical Chart -->
      <div class="chart-section">
        <h4>Metrics History</h4>
        <div class="chart">
          <div
            v-for="(point, index) in metricsHistory"
            :key="index"
            class="chart-bar"
            :style="{
              height: (point.latency / 500) * 100 + '%',
              backgroundColor: getLatencyColor(point.latency),
            }"
          ></div>
        </div>
        <div class="chart-legend">
          <span>Latency over time (last {{ metricsHistory.length }} measurements)</span>
        </div>
      </div>

      <!-- Network Events Log -->
      <div class="events-section">
        <h4>Network Events</h4>
        <div class="events-list">
          <div
            v-for="(event, index) in networkEvents"
            :key="index"
            :class="['event-item', event.severity]"
          >
            <span class="event-time">{{ event.time }}</span>
            <span class="event-message">{{ event.message }}</span>
          </div>
        </div>
      </div>

      <!-- Call Controls -->
      <div class="button-group">
        <button @click="answer" v-if="callState === 'incoming'">Answer</button>
        <button @click="hangup" class="danger">Hang Up</button>
      </div>
    </div>

    <!-- Recommendations -->
    <div v-if="recommendations.length > 0" class="recommendations-section">
      <h3>Recommendations</h3>
      <ul>
        <li v-for="(rec, index) in recommendations" :key="index">
          {{ rec }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useCallSession } from '../../src/composables/useCallSession'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Configuration
const targetUri = ref('sip:1000@example.com')

// SIP Client - use shared playground instance (credentials managed globally)
const {
  connectionState: realConnectionState,
  isConnected: realIsConnected,
  getClient,
} = playgroundSipClient

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)
const connectionState = computed(() =>
  isSimulationMode.value
    ? simulation.isConnected.value
      ? 'connected'
      : 'disconnected'
    : realConnectionState.value
)

// Call Management - useCallSession requires a Ref
const sipClientRef = computed(() => getClient())
const {
  makeCall: makeCallFn,
  answer,
  hangup,
  session: _currentCall,
  state: callState,
  isActive: hasActiveCall,
} = useCallSession(sipClientRef)

// Network Profiles
interface NetworkProfile {
  name: string
  icon: string
  latency: number
  packetLoss: number
  jitter: number
  bandwidth: number
}

const networkProfiles: NetworkProfile[] = [
  {
    name: 'Excellent',
    icon: 'excellent',
    latency: 20,
    packetLoss: 0,
    jitter: 5,
    bandwidth: 10000,
  },
  {
    name: 'Good',
    icon: 'good',
    latency: 80,
    packetLoss: 1,
    jitter: 15,
    bandwidth: 1000,
  },
  {
    name: '4G Mobile',
    icon: 'mobile4g',
    latency: 100,
    packetLoss: 2,
    jitter: 25,
    bandwidth: 500,
  },
  {
    name: '3G Mobile',
    icon: 'mobile3g',
    latency: 200,
    packetLoss: 5,
    jitter: 50,
    bandwidth: 128,
  },
  {
    name: 'Poor WiFi',
    icon: 'wifi-poor',
    latency: 300,
    packetLoss: 10,
    jitter: 100,
    bandwidth: 256,
  },
  {
    name: 'Congested',
    icon: 'congested',
    latency: 500,
    packetLoss: 20,
    jitter: 150,
    bandwidth: 64,
  },
]

// Helper for profile indicator class
const getProfileClass = (profileName: string): string => {
  const mapping: Record<string, string> = {
    Excellent: 'excellent',
    Good: 'good',
    '4G Mobile': 'mobile4g',
    '3G Mobile': 'mobile3g',
    'Poor WiFi': 'wifi-poor',
    Congested: 'congested',
  }
  return mapping[profileName] || 'default'
}

const activeProfile = ref('Excellent')
const customLatency = ref(20)
const customPacketLoss = ref(0)
const customJitter = ref(5)
const customBandwidth = ref(10000)

// Current Metrics
interface Metrics {
  latency: number
  packetLoss: number
  jitter: number
  quality: string
}

const currentMetrics = ref<Metrics>({
  latency: 20,
  packetLoss: 0,
  jitter: 5,
  quality: 'Excellent',
})

const metricsHistory = ref<Array<{ latency: number; timestamp: number }>>([])
const networkEvents = ref<Array<{ time: string; message: string; severity: string }>>([])

// Timers
const metricsTimer = ref<number | null>(null)

// Computed
const networkQualityColor = computed(() => {
  const quality = currentMetrics.value.quality.toLowerCase()
  if (quality === 'excellent') return 'var(--success)'
  if (quality === 'good') return 'var(--success)'
  if (quality === 'fair') return 'var(--warning)'
  if (quality === 'poor') return 'var(--danger)'
  return 'var(--text-secondary)'
})

const recommendations = computed(() => {
  const recs: string[] = []

  if (currentMetrics.value.latency > 200) {
    recs.push(
      'High latency detected. Consider using a wired connection or moving closer to your router.'
    )
  }

  if (currentMetrics.value.packetLoss > 5) {
    recs.push(
      'Significant packet loss. Check your network connection and reduce other network usage.'
    )
  }

  if (currentMetrics.value.jitter > 50) {
    recs.push(
      'High jitter detected. This may cause audio quality issues. Close bandwidth-intensive applications.'
    )
  }

  if (customBandwidth.value < 100) {
    recs.push('Low bandwidth. Consider disabling video or reducing quality settings.')
  }

  return recs
})

// Make Call
const makeCall = async () => {
  if (!targetUri.value) return
  await makeCallFn(targetUri.value)
}

// Apply Network Profile
const applyProfile = (profile: NetworkProfile) => {
  activeProfile.value = profile.name
  customLatency.value = profile.latency
  customPacketLoss.value = profile.packetLoss
  customJitter.value = profile.jitter
  customBandwidth.value = profile.bandwidth

  updateMetrics()

  logEvent(`Network profile changed to ${profile.name}`, 'info')
}

// Apply Custom Settings
const applyCustomSettings = () => {
  activeProfile.value = 'Custom'
  updateMetrics()
  logEvent('Custom network settings applied', 'info')
}

// Update Metrics
const updateMetrics = () => {
  // Add some variance to simulate real network conditions
  const latencyVariance = Math.random() * 20 - 10
  const packetLossVariance = Math.random() * 2 - 1
  const jitterVariance = Math.random() * 10 - 5

  const latency = Math.max(0, customLatency.value + latencyVariance)
  const packetLoss = Math.max(0, Math.min(100, customPacketLoss.value + packetLossVariance))
  const jitter = Math.max(0, customJitter.value + jitterVariance)

  currentMetrics.value = {
    latency: Math.round(latency),
    packetLoss: Math.round(packetLoss * 10) / 10,
    jitter: Math.round(jitter),
    quality: calculateQuality(latency, packetLoss, jitter),
  }

  // Add to history
  metricsHistory.value.push({
    latency: currentMetrics.value.latency,
    timestamp: Date.now(),
  })

  // Keep only last 50 measurements
  if (metricsHistory.value.length > 50) {
    metricsHistory.value.shift()
  }

  // Log quality changes
  if (currentMetrics.value.quality === 'Poor') {
    logEvent('Poor network quality detected', 'warning')
  }
}

// Calculate Quality
const calculateQuality = (latency: number, packetLoss: number, jitter: number): string => {
  let score = 100

  // Penalize for latency
  if (latency > 400) score -= 50
  else if (latency > 200) score -= 30
  else if (latency > 100) score -= 15

  // Penalize for packet loss
  if (packetLoss > 10) score -= 40
  else if (packetLoss > 5) score -= 25
  else if (packetLoss > 2) score -= 10

  // Penalize for jitter
  if (jitter > 100) score -= 30
  else if (jitter > 50) score -= 15
  else if (jitter > 25) score -= 5

  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

// Quality Helpers
const getQualityClass = (value: number, type: string): string => {
  if (type === 'latency') {
    if (value < 100) return 'good'
    if (value < 200) return 'fair'
    return 'poor'
  } else if (type === 'packetLoss') {
    if (value < 2) return 'good'
    if (value < 5) return 'fair'
    return 'poor'
  } else if (type === 'jitter') {
    if (value < 25) return 'good'
    if (value < 50) return 'fair'
    return 'poor'
  }
  return 'good'
}

const getQualityLabel = (value: number, type: string): string => {
  const qualityClass = getQualityClass(value, type)
  if (qualityClass === 'good') return 'Good'
  if (qualityClass === 'fair') return 'Fair'
  return 'Poor'
}

const getLatencyColor = (latency: number): string => {
  if (latency < 100) return 'var(--success)'
  if (latency < 200) return 'var(--success)'
  if (latency < 300) return 'var(--warning)'
  return 'var(--danger)'
}

// Log Event
const logEvent = (message: string, severity: 'info' | 'warning' | 'error') => {
  const time = new Date().toLocaleTimeString()
  networkEvents.value.unshift({ time, message, severity })

  // Keep only last 10 events
  if (networkEvents.value.length > 10) {
    networkEvents.value.pop()
  }
}

// Start Metrics Monitoring
const startMetricsMonitoring = () => {
  metricsTimer.value = window.setInterval(() => {
    if (hasActiveCall.value) {
      updateMetrics()
    }
  }, 1000)
}

const stopMetricsMonitoring = () => {
  if (metricsTimer.value) {
    clearInterval(metricsTimer.value)
    metricsTimer.value = null
  }
}

// Watch call state
watch(callState, (newState, oldState) => {
  if (newState === 'active' && oldState !== 'active') {
    // Call became active
    startMetricsMonitoring()
    logEvent('Call connected', 'info')
  } else if (newState === 'terminated' || newState === 'disconnected') {
    // Call ended
    stopMetricsMonitoring()
    logEvent('Call ended', 'info')
  }
})

// Cleanup
onUnmounted(() => {
  stopMetricsMonitoring()
})
</script>

<style scoped>
.network-simulator-demo {
  max-width: 1200px;
  margin: 0 auto;
}

.description {
  color: #666;
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .status-section {
    flex-direction: column;
    align-items: flex-start;
  }
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: var(--success);
  color: var(--surface-0);
}

.status-badge.disconnected {
  background-color: var(--text-secondary);
  color: var(--surface-0);
}

.status-badge.connecting {
  background-color: var(--warning);
  color: var(--surface-0);
}

.network-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.connection-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.5rem 0.75rem;
  background: #fef3c7;
  border-radius: 6px;
  border: 1px solid #fcd34d;
}

.connection-hint strong {
  color: #92400e;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.config-section,
.profiles-section,
.custom-settings-section,
.call-section,
.active-call-section,
.recommendations-section {
  background: var(--surface-50);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

button {
  padding: 0.625rem 1.25rem;
  background-color: var(--info);
  color: var(--surface-0);
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: var(--info-hover);
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

button.danger {
  background-color: var(--danger);
}

button.danger:hover:not(:disabled) {
  background-color: var(--danger-hover);
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .profiles-grid {
    grid-template-columns: 1fr;
  }
}

.profile-card {
  background: var(--surface-0);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-card:hover {
  border-color: var(--info);
  transform: translateY(-2px);
}

.profile-card.active {
  border-color: var(--info);
  background: var(--surface-ground);
}

.profile-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  height: 2rem;
}

.profile-indicator {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 2px solid currentColor;
}

.profile-indicator.excellent {
  background: var(--success);
  border-color: var(--success);
}

.profile-indicator.good {
  background: var(--warning);
  border-color: var(--warning);
}

.profile-indicator.mobile4g,
.profile-indicator.mobile3g {
  background: var(--info);
  border-color: var(--info);
  position: relative;
}

.profile-indicator.mobile4g::after,
.profile-indicator.mobile3g::after {
  content: '';
  position: absolute;
  width: 0.5rem;
  height: 0.75rem;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface-0);
  clip-path: polygon(0% 100%, 50% 0%, 100% 100%);
}

.profile-indicator.wifi-poor {
  background: var(--warning);
  border-color: var(--warning);
}

.profile-indicator.congested {
  background: var(--danger);
  border-color: var(--danger);
}

.profile-name {
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.profile-stats {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-weight: 500;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

.setting-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.setting-group input[type='range'] {
  width: 100%;
  margin-bottom: 0.25rem;
}

.setting-group .value {
  display: inline-block;
  font-weight: 600;
  color: var(--info);
}

.indicator-bar {
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.indicator-fill {
  height: 100%;
  transition: width 0.3s;
}

.indicator-fill.latency {
  background: linear-gradient(90deg, var(--success), var(--warning), var(--danger));
}

.indicator-fill.packet-loss {
  background: linear-gradient(90deg, var(--success), var(--warning), var(--danger));
}

.indicator-fill.jitter {
  background: linear-gradient(90deg, var(--success), var(--warning), var(--danger));
}

.indicator-fill.bandwidth {
  background: linear-gradient(90deg, var(--danger), var(--warning), var(--success));
}

.apply-btn {
  width: 100%;
}

.metrics-section {
  margin-bottom: 1.5rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}

.metric-card {
  background: var(--surface-0);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.metric-icon {
  width: 1.5rem;
  height: 1.5rem;
  margin: 0 auto 0.5rem;
  border-radius: 4px;
}

.metric-icon.latency-icon {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
}

.metric-icon.packet-loss-icon {
  background: linear-gradient(135deg, var(--warning) 0%, var(--warning-dark) 100%);
}

.metric-icon.jitter-icon {
  background: linear-gradient(135deg, var(--info) 0%, var(--info-dark) 100%);
}

.metric-icon.quality-icon {
  background: linear-gradient(135deg, var(--success) 0%, var(--success-dark) 100%);
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.quality-indicator {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.quality-indicator.good {
  background: #d1fae5;
  color: #065f46;
}

.quality-indicator.fair {
  background: #fef3c7;
  color: #92400e;
}

.quality-indicator.poor {
  background: #fee2e2;
  color: #991b1b;
}

.quality-score {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.quality-score.excellent {
  background: #d1fae5;
  color: #065f46;
}

.quality-score.good {
  background: #d9f99d;
  color: #365314;
}

.quality-score.fair {
  background: #fef3c7;
  color: #92400e;
}

.quality-score.poor {
  background: #fee2e2;
  color: #991b1b;
}

.chart-section {
  background: var(--surface-0);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 100px;
  background: var(--surface-50);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

.chart-bar {
  flex: 1;
  min-height: 2px;
  border-radius: 2px;
  transition:
    height 0.3s,
    background-color 0.3s;
}

.chart-legend {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
}

.events-section {
  background: var(--surface-0);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.events-list {
  max-height: 200px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-left: 3px solid transparent;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.event-item.info {
  border-color: var(--info);
  background: var(--surface-ground);
}

.event-item.warning {
  border-color: var(--warning);
  background: #fef3c7;
}

.event-item.error {
  border-color: var(--danger);
  background: #fee2e2;
}

.event-time {
  font-weight: 600;
  white-space: nowrap;
}

.button-group {
  display: flex;
  gap: 0.75rem;
}

.recommendations-section ul {
  margin: 0;
  padding-left: 1.5rem;
}

.recommendations-section li {
  margin-bottom: 0.5rem;
  color: #4b5563;
}
</style>
