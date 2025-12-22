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
  if (quality === 'excellent') return '#10b981'
  if (quality === 'good') return '#84cc16'
  if (quality === 'fair') return '#f59e0b'
  if (quality === 'poor') return '#ef4444'
  return '#6b7280'
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
  if (latency < 100) return '#10b981'
  if (latency < 200) return '#84cc16'
  if (latency < 300) return '#f59e0b'
  return '#ef4444'
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
  color: var(--text-secondary);
  margin-bottom: var(--spacing-2xl);
  line-height: 1.6;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2xl);
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.status-badge {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.status-badge.connected {
  background: var(--gradient-green);
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-green);
}

.status-badge.disconnected {
  background: var(--bg-neutral-light);
  color: var(--color-neutral);
  border: 1px solid var(--color-neutral);
}

.status-badge.connecting {
  background: var(--gradient-orange);
  color: var(--text-on-gradient);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.network-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.connection-hint {
  font-size: var(--text-sm);
  color: var(--color-warning);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-warning-light);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-warning);
}

.connection-hint strong {
  color: var(--color-warning);
  font-weight: var(--font-semibold);
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
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.config-section:hover,
.profiles-section:hover,
.custom-settings-section:hover,
.call-section:hover,
.active-call-section:hover,
.recommendations-section:hover {
  box-shadow: var(--shadow-md);
}

h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

h4 {
  margin-top: 0;
  margin-bottom: var(--spacing-md);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.form-group input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--bg-card);
  color: var(--text-primary);
  transition: all var(--transition-base);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--gradient-blue);
  color: var(--text-on-gradient);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

button:hover:not(:disabled) {
  background: var(--gradient-blue-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-blue);
}

button:disabled {
  background: var(--bg-neutral-light);
  color: var(--color-neutral);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

button.danger {
  background: var(--gradient-red);
}

button.danger:hover:not(:disabled) {
  background: var(--gradient-red-hover);
  box-shadow: 0 8px 16px rgba(239, 68, 68, 0.2);
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
}

.profile-card {
  position: relative;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-base);
  overflow: hidden;
}

.profile-card::before {
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

.profile-card:hover {
  border-color: var(--color-info);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.profile-card:hover::before {
  opacity: 1;
}

.profile-card.active {
  border-color: var(--color-info);
  background: var(--bg-info-light);
}

.profile-card.active::before {
  opacity: 1;
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
  background: var(--color-success, #10b981);
  border-color: var(--color-success, #10b981);
}

.profile-indicator.good {
  background: var(--color-warning, #f59e0b);
  border-color: var(--color-warning, #f59e0b);
}

.profile-indicator.mobile4g,
.profile-indicator.mobile3g {
  background: var(--color-info, #3b82f6);
  border-color: var(--color-info, #3b82f6);
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
  background: white;
  clip-path: polygon(0% 100%, 50% 0%, 100% 100%);
}

.profile-indicator.wifi-poor {
  background: var(--color-warning, #f59e0b);
  border-color: var(--color-warning, #f59e0b);
}

.profile-indicator.congested {
  background: var(--color-error, #ef4444);
  border-color: var(--color-error, #ef4444);
}

.profile-name {
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
  font-size: var(--text-base);
}

.profile-stats {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.stat {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
  padding: var(--spacing-xs) 0;
}

.stat-label {
  font-weight: var(--font-medium);
  color: var(--text-tertiary);
}

.stat-value {
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.setting-group label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.setting-group input[type='range'] {
  width: 100%;
  margin-bottom: var(--spacing-xs);
  cursor: pointer;
}

.setting-group .value {
  display: inline-block;
  font-weight: var(--font-semibold);
  color: var(--color-info);
  font-size: var(--text-sm);
}

.indicator-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-top: var(--spacing-sm);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.indicator-fill {
  height: 100%;
  transition: width var(--transition-base);
}

.indicator-fill.latency {
  background: linear-gradient(90deg, var(--color-success), var(--color-warning), var(--color-danger));
}

.indicator-fill.packet-loss {
  background: linear-gradient(90deg, var(--color-success), var(--color-warning), var(--color-danger));
}

.indicator-fill.jitter {
  background: linear-gradient(90deg, var(--color-success), var(--color-warning), var(--color-danger));
}

.indicator-fill.bandwidth {
  background: linear-gradient(90deg, var(--color-danger), var(--color-warning), var(--color-success));
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
  gap: var(--spacing-md);
}

.metric-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  text-align: center;
  transition: all var(--transition-base);
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.metric-card:hover::before {
  opacity: 1;
}

.metric-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--spacing-sm);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.metric-icon.latency-icon {
  background: var(--gradient-blue);
}

.metric-card:has(.latency-icon)::before {
  background: var(--gradient-blue);
}

.metric-card:has(.latency-icon):hover {
  box-shadow: var(--shadow-blue);
}

.metric-icon.packet-loss-icon {
  background: var(--gradient-orange);
}

.metric-card:has(.packet-loss-icon)::before {
  background: var(--gradient-orange);
}

.metric-card:has(.packet-loss-icon):hover {
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
}

.metric-icon.jitter-icon {
  background: var(--gradient-cyan);
}

.metric-card:has(.jitter-icon)::before {
  background: var(--gradient-cyan);
}

.metric-card:has(.jitter-icon):hover {
  box-shadow: 0 8px 16px rgba(6, 182, 212, 0.2);
}

.metric-icon.quality-icon {
  background: var(--gradient-green);
}

.metric-card:has(.quality-icon)::before {
  background: var(--gradient-green);
}

.metric-card:has(.quality-icon):hover {
  box-shadow: var(--shadow-green);
}

.metric-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-xs);
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.metric-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--spacing-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--font-medium);
}

.quality-indicator {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}

.quality-indicator.good {
  background: var(--bg-success-light);
  color: var(--color-success);
}

.quality-indicator.fair {
  background: var(--bg-warning-light);
  color: var(--color-warning);
}

.quality-indicator.poor {
  background: var(--bg-danger-light);
  color: var(--color-danger);
}

.quality-score {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}

.quality-score.excellent {
  background: var(--bg-success-light);
  color: var(--color-success);
}

.quality-score.good {
  background: var(--bg-success-light);
  color: var(--color-success);
}

.quality-score.fair {
  background: var(--bg-warning-light);
  color: var(--color-warning);
}

.quality-score.poor {
  background: var(--bg-danger-light);
  color: var(--color-danger);
}

.chart-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 100px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  border: 1px solid var(--border-color);
}

.chart-bar {
  flex: 1;
  min-height: 2px;
  border-radius: 2px;
  transition: height var(--transition-base), background-color var(--transition-base);
}

.chart-legend {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-align: center;
  font-weight: var(--font-medium);
}

.events-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.events-list {
  max-height: 200px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border-left: 3px solid transparent;
  margin-bottom: var(--spacing-xs);
  font-size: var(--text-sm);
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.event-item:hover {
  transform: translateX(4px);
}

.event-item.info {
  border-color: var(--color-info);
  background: var(--bg-info-light);
}

.event-item.warning {
  border-color: var(--color-warning);
  background: var(--bg-warning-light);
}

.event-item.error {
  border-color: var(--color-danger);
  background: var(--bg-danger-light);
}

.event-time {
  font-weight: var(--font-semibold);
  white-space: nowrap;
  color: var(--text-primary);
}

.button-group {
  display: flex;
  gap: var(--spacing-sm);
}

.recommendations-section ul {
  margin: 0;
  padding-left: var(--spacing-lg);
}

.recommendations-section li {
  margin-bottom: var(--spacing-sm);
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
