<template>
  <div class="call-quality-dashboard">
    <!-- Header with Overall Score Gauge -->
    <div class="dashboard-header">
      <div class="score-gauge-container">
        <div
          class="score-gauge"
          :class="scoreGradeClass"
          role="img"
          :aria-label="`Overall call quality: ${qualityScore?.grade ?? 'N/A'} grade, ${qualityScore?.overall ?? 0} out of 100`"
        >
          <div class="gauge-value">{{ qualityScore?.overall ?? '--' }}</div>
          <div class="gauge-grade">{{ qualityScore?.grade ?? '-' }}</div>
        </div>
        <div class="gauge-label">
          <span class="label-text">{{ qualityScore?.description ?? 'No data' }}</span>
          <span v-if="qualityTrend" class="trend-indicator" :class="qualityTrend.direction">
            <svg v-if="qualityTrend.direction === 'improving'" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3l6 6H2z"/>
            </svg>
            <svg v-else-if="qualityTrend.direction === 'degrading'" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 13l6-6H2z"/>
            </svg>
            <span v-else>—</span>
            {{ qualityTrend.direction }}
          </span>
        </div>
      </div>
    </div>

    <!-- Score Breakdown Cards -->
    <div class="score-breakdown">
      <div class="score-card" :class="getScoreClass(qualityScore?.audio)">
        <div class="card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-label">Audio</div>
          <div class="card-value">{{ qualityScore?.audio?.toFixed(0) ?? '--' }}</div>
        </div>
      </div>

      <div class="score-card" :class="getScoreClass(qualityScore?.video)">
        <div class="card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-label">Video</div>
          <div class="card-value">{{ qualityScore?.video?.toFixed(0) ?? 'N/A' }}</div>
        </div>
      </div>

      <div class="score-card" :class="getScoreClass(qualityScore?.network)">
        <div class="card-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-label">Network</div>
          <div class="card-value">{{ qualityScore?.network?.toFixed(0) ?? '--' }}</div>
        </div>
      </div>
    </div>

    <!-- Network Quality Indicator (Signal Bars) -->
    <div class="network-indicator-section">
      <h3>Network Quality Indicator</h3>
      <div class="signal-bars-container" :style="{ '--indicator-color': networkIndicator.color }">
        <div class="signal-bars" :aria-label="networkIndicator.ariaLabel" role="img">
          <div
            v-for="bar in 5"
            :key="bar"
            class="signal-bar"
            :class="{ active: bar <= networkIndicator.bars }"
            :style="{ height: `${bar * 20}%` }"
          ></div>
        </div>
        <div class="signal-info">
          <span class="signal-level" :class="networkIndicator.level">{{ networkIndicator.level }}</span>
          <div class="signal-details">
            <span>RTT: {{ networkIndicator.details.rtt.toFixed(0) }}ms</span>
            <span>Jitter: {{ networkIndicator.details.jitter.toFixed(1) }}ms</span>
            <span>Loss: {{ networkIndicator.details.packetLoss.toFixed(2) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bandwidth Recommendations -->
    <div class="recommendations-section">
      <h3>Bandwidth Adaptation</h3>
      <div class="recommendation-header">
        <span class="action-badge" :class="bandwidthRecommendation.action">
          {{ bandwidthRecommendation.action }}
        </span>
        <span class="priority-badge" :class="bandwidthRecommendation.priority">
          {{ bandwidthRecommendation.priority }} priority
        </span>
      </div>

      <div v-if="bandwidthRecommendation.suggestions.length > 0" class="suggestions-list">
        <div
          v-for="(suggestion, index) in bandwidthRecommendation.suggestions"
          :key="index"
          class="suggestion-card"
          :class="suggestion.type"
        >
          <div class="suggestion-header">
            <span class="suggestion-type">{{ suggestion.type }}</span>
            <span class="suggestion-impact">+{{ suggestion.impact }}% impact</span>
          </div>
          <div class="suggestion-message">{{ suggestion.message }}</div>
          <div class="suggestion-values">
            <span class="current">{{ suggestion.current }}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="arrow">
              <path d="M1 8h14M9 2l6 6-6 6"/>
            </svg>
            <span class="recommended">{{ suggestion.recommended }}</span>
          </div>
        </div>
      </div>
      <div v-else class="no-suggestions">
        No bandwidth adaptations needed
      </div>
    </div>

    <!-- Historical Trend Chart (Simple) -->
    <div class="history-section">
      <h3>Quality History</h3>
      <div class="history-chart">
        <div class="chart-container">
          <div
            v-for="(entry, index) in scoreHistory"
            :key="index"
            class="chart-bar"
            :class="getGradeClass(entry.grade)"
            :style="{ height: `${entry.overall}%` }"
            :title="`${entry.grade}: ${entry.overall.toFixed(0)}`"
          ></div>
        </div>
        <div class="chart-labels">
          <span>{{ scoreHistory.length > 0 ? 'Oldest' : '' }}</span>
          <span>{{ scoreHistory.length }} samples</span>
          <span>{{ scoreHistory.length > 0 ? 'Latest' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Simulation Controls -->
    <div class="simulation-section">
      <h3>Simulate Network Conditions</h3>
      <div class="simulation-controls">
        <button
          v-for="condition in networkConditions"
          :key="condition.name"
          class="condition-button"
          :class="{ active: activeCondition === condition.name }"
          @click="applyCondition(condition)"
        >
          {{ condition.name }}
        </button>
      </div>
      <div class="simulation-status" v-if="isSimulating">
        <span class="pulse"></span>
        Simulating: {{ activeCondition }}
      </div>
    </div>

    <!-- Auto-Adaptation Toggle -->
    <div class="controls-section">
      <label class="toggle-control">
        <input type="checkbox" v-model="autoAdaptEnabled" @change="toggleAutoAdapt" />
        <span class="toggle-slider"></span>
        <span class="toggle-label">Auto-adapt bandwidth</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCallQualityScore } from '../../src/composables/useCallQualityScore'
import { useNetworkQualityIndicator } from '../../src/composables/useNetworkQualityIndicator'
import { useBandwidthAdaptation } from '../../src/composables/useBandwidthAdaptation'
import type { QualityGrade } from '../../src/types/call-quality.types'

// Initialize composables
const {
  score: qualityScore,
  trend: qualityTrend,
  history: scoreHistory,
  updateScore,
  reset: resetScore,
} = useCallQualityScore({
  historySize: 20,
  enableTrendAnalysis: true,
})

const {
  indicator: networkIndicator,
  update: updateNetworkIndicator,
  reset: resetNetworkIndicator,
} = useNetworkQualityIndicator()

const {
  recommendation: bandwidthRecommendation,
  isAutoAdapting,
  update: updateBandwidthAdaptation,
  setAutoAdapt,
  reset: resetBandwidthAdaptation,
} = useBandwidthAdaptation({
  sensitivity: 0.6,
  autoAdapt: false,
})

// Local state
const isSimulating = ref(false)
const activeCondition = ref<string | null>(null)
const autoAdaptEnabled = ref(false)
const simulationInterval = ref<number | null>(null)

// Network condition presets for simulation
const networkConditions = [
  {
    name: 'Excellent',
    packetLoss: 0.1,
    jitter: 5,
    rtt: 30,
    bitrate: 2500,
    mos: 4.5,
  },
  {
    name: 'Good',
    packetLoss: 0.5,
    jitter: 15,
    rtt: 80,
    bitrate: 1500,
    mos: 4.0,
  },
  {
    name: 'Fair',
    packetLoss: 2,
    jitter: 35,
    rtt: 180,
    bitrate: 800,
    mos: 3.2,
  },
  {
    name: 'Poor',
    packetLoss: 5,
    jitter: 70,
    rtt: 350,
    bitrate: 300,
    mos: 2.2,
  },
  {
    name: 'Critical',
    packetLoss: 12,
    jitter: 120,
    rtt: 600,
    bitrate: 100,
    mos: 1.5,
  },
]

// Computed
const scoreGradeClass = computed(() => {
  const grade = qualityScore.value?.grade
  return grade ? `grade-${grade.toLowerCase()}` : 'grade-unknown'
})

// Helper functions
function getScoreClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'score-na'
  if (score >= 90) return 'score-excellent'
  if (score >= 75) return 'score-good'
  if (score >= 60) return 'score-fair'
  if (score >= 40) return 'score-poor'
  return 'score-critical'
}

function getGradeClass(grade: QualityGrade): string {
  return `grade-${grade.toLowerCase()}`
}

function toggleAutoAdapt() {
  setAutoAdapt(autoAdaptEnabled.value)
}

function applyCondition(condition: typeof networkConditions[0]) {
  activeCondition.value = condition.name
  isSimulating.value = true

  // Clear existing interval
  if (simulationInterval.value) {
    clearInterval(simulationInterval.value)
  }

  // Update all composables with the condition
  const updateWithVariation = () => {
    // Add some random variation to make it realistic
    const variation = () => 0.8 + Math.random() * 0.4 // 80%-120%

    const packetLoss = condition.packetLoss * variation()
    const jitter = condition.jitter * variation()
    const rtt = condition.rtt * variation()
    const bitrate = condition.bitrate * variation()
    const mos = Math.min(5, Math.max(1, condition.mos * variation()))

    // Update quality score
    updateScore({
      packetLoss,
      jitter,
      rtt,
      mos,
      bitrate,
      previousBitrate: bitrate * 0.95,
    })

    // Update network indicator
    updateNetworkIndicator({
      rtt,
      jitter,
      packetLoss,
      bitrate,
    })

    // Update bandwidth adaptation
    updateBandwidthAdaptation({
      availableBitrate: bitrate * 1.2,
      currentBitrate: bitrate,
      packetLoss,
      rtt,
      videoEnabled: true,
      currentFramerate: condition.mos > 3 ? 30 : 15,
      currentResolution: { width: 1280, height: 720, label: '720p' },
    })
  }

  // Initial update
  updateWithVariation()

  // Continuous updates every second
  simulationInterval.value = window.setInterval(updateWithVariation, 1000)
}

function stopSimulation() {
  isSimulating.value = false
  activeCondition.value = null
  if (simulationInterval.value) {
    clearInterval(simulationInterval.value)
    simulationInterval.value = null
  }
}

// Watch auto-adapt state
watch(isAutoAdapting, (enabled) => {
  autoAdaptEnabled.value = enabled
})

// Lifecycle
onMounted(() => {
  // Start with "Good" conditions by default
  applyCondition(networkConditions[1]!)
})

onUnmounted(() => {
  stopSimulation()
  resetScore()
  resetNetworkIndicator()
  resetBandwidthAdaptation()
})
</script>

<style scoped>
.call-quality-dashboard {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* Header / Gauge */
.dashboard-header {
  display: flex;
  justify-content: center;
}

.score-gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.score-gauge {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 8px solid;
  transition: all 0.3s ease;
  background: var(--surface-card);
}

.score-gauge.grade-a {
  border-color: var(--success);
}
.score-gauge.grade-b {
  border-color: var(--info);
}
.score-gauge.grade-c {
  border-color: var(--warning);
}
.score-gauge.grade-d {
  border-color: var(--danger);
}
.score-gauge.grade-f,
.score-gauge.grade-unknown {
  border-color: var(--surface-border);
}

.gauge-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.gauge-grade {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.gauge-label {
  text-align: center;
}

.label-text {
  display: block;
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.trend-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
  text-transform: capitalize;
}

.trend-indicator.improving {
  color: var(--success);
}
.trend-indicator.stable {
  color: var(--text-secondary);
}
.trend-indicator.degrading {
  color: var(--danger);
}

/* Score Breakdown Cards */
.score-breakdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

@media (max-width: 640px) {
  .score-breakdown {
    grid-template-columns: 1fr;
  }
}

.score-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.score-card.score-excellent {
  border-left-color: var(--success);
}
.score-card.score-good {
  border-left-color: var(--info);
}
.score-card.score-fair {
  border-left-color: var(--warning);
}
.score-card.score-poor {
  border-left-color: var(--danger);
}
.score-card.score-critical,
.score-card.score-na {
  border-left-color: var(--surface-border);
}

.card-icon {
  color: var(--text-secondary);
}

.card-content {
  flex: 1;
}

.card-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* Network Indicator Section */
.network-indicator-section,
.recommendations-section,
.history-section,
.simulation-section,
.controls-section {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--surface-border);
}

h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.signal-bars-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
}

.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 40px;
}

.signal-bar {
  width: 8px;
  background: var(--surface-border);
  border-radius: var(--radius-sm);
  transition: all 0.3s ease;
}

.signal-bar.active {
  background: var(--indicator-color, var(--primary));
}

.signal-info {
  flex: 1;
}

.signal-level {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: var(--spacing-xs);
}

.signal-level.excellent {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}
.signal-level.good {
  background: rgba(59, 130, 246, 0.15);
  color: var(--info);
}
.signal-level.fair {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}
.signal-level.poor,
.signal-level.critical {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}
.signal-level.unknown {
  background: var(--surface-ground);
  color: var(--text-secondary);
}

.signal-details {
  display: flex;
  gap: var(--spacing-md);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Recommendations Section */
.recommendation-header {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.action-badge,
.priority-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.action-badge.upgrade {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}
.action-badge.maintain {
  background: rgba(59, 130, 246, 0.15);
  color: var(--info);
}
.action-badge.downgrade {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}
.action-badge.critical {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.priority-badge.low {
  background: var(--surface-ground);
  color: var(--text-secondary);
}
.priority-badge.medium {
  background: rgba(59, 130, 246, 0.1);
  color: var(--info);
}
.priority-badge.high {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}
.priority-badge.critical {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.suggestion-card {
  padding: var(--spacing-md);
  background: var(--surface-ground);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--surface-border);
}

.suggestion-card.video {
  border-left-color: var(--primary);
}
.suggestion-card.audio {
  border-left-color: var(--info);
}
.suggestion-card.network {
  border-left-color: var(--warning);
}
.suggestion-card.codec {
  border-left-color: var(--success);
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-xs);
}

.suggestion-type {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 600;
}

.suggestion-impact {
  font-size: 0.75rem;
  color: var(--success);
  font-weight: 500;
}

.suggestion-message {
  font-size: 0.875rem;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.suggestion-values {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
}

.suggestion-values .current {
  color: var(--text-secondary);
  text-decoration: line-through;
}

.suggestion-values .arrow {
  color: var(--text-secondary);
}

.suggestion-values .recommended {
  color: var(--success);
  font-weight: 500;
}

.no-suggestions {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-style: italic;
}

/* History Chart */
.history-chart {
  padding: var(--spacing-md);
  background: var(--surface-ground);
  border-radius: var(--radius-md);
}

.chart-container {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 100px;
  padding-bottom: var(--spacing-sm);
}

.chart-bar {
  flex: 1;
  min-width: 4px;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: height 0.3s ease;
}

.chart-bar.grade-a {
  background: var(--success);
}
.chart-bar.grade-b {
  background: var(--info);
}
.chart-bar.grade-c {
  background: var(--warning);
}
.chart-bar.grade-d {
  background: var(--danger);
}
.chart-bar.grade-f {
  background: var(--text-secondary);
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Simulation Controls */
.simulation-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.condition-button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
}

.condition-button:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.condition-button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.simulation-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.pulse {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

/* Toggle Control */
.toggle-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  cursor: pointer;
}

.toggle-control input {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: var(--surface-border);
  border-radius: 12px;
  position: relative;
  transition: background 0.2s ease;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.toggle-control input:checked + .toggle-slider {
  background: var(--primary);
}

.toggle-control input:checked + .toggle-slider::after {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 0.875rem;
  color: var(--text-primary);
}
</style>

