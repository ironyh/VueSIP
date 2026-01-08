# Call Quality Dashboard Guide

This guide covers building comprehensive call quality dashboards in VueSIP using the call quality scoring and network quality indicator composables, enabling you to visualize real-time quality metrics, track trends, and provide users with actionable feedback.

## Overview

VueSIP provides advanced composables for building call quality dashboards that go beyond basic statistics:

- **Quality Scoring**: Calculate overall quality grades (A-F) with weighted metrics
- **Trend Analysis**: Track quality trends over time with confidence scoring
- **Network Indicators**: Visual signal strength indicators with accessibility support
- **Quality Recommendations**: Actionable suggestions based on current metrics

**Why Build a Quality Dashboard?**

- **User Transparency**: Show users their connection quality in real-time
- **Issue Prevention**: Detect degradation before calls fail
- **Support Efficiency**: Provide diagnostic data for troubleshooting
- **Quality Tracking**: Historical analysis for service improvement

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quality Scoring](#quality-scoring)
- [Network Quality Indicator](#network-quality-indicator)
- [Building a Dashboard](#building-a-dashboard)
- [Trend Analysis](#trend-analysis)
- [Quality Recommendations](#quality-recommendations)
- [Advanced Usage](#advanced-usage)

---

## Prerequisites

Before building a quality dashboard, ensure you have:

1. **Active Call with WebRTC Stats**: Use `useSipWebRTCStats` to collect metrics
2. **VueSIP Client**: Connected and registered SIP client
3. **Modern Browser**: With RTCPeerConnection.getStats() support

## Quality Scoring

The `useCallQualityScore` composable calculates comprehensive quality scores from WebRTC metrics.

### Basic Usage

```typescript
import { ref, watch } from 'vue'
import { useSipClient, useSipWebRTCStats, useCallQualityScore } from 'vuesip'

// Get current call and stats
const { currentCall } = useSipClient()
const stats = useSipWebRTCStats(currentCall)

// Create quality scorer
const {
  score, // Current quality score (0-100)
  trend, // Quality trend analysis
  history, // Score history
  updateScore, // Update with new metrics
  reset, // Reset score and history
  setWeights, // Customize metric weights
} = useCallQualityScore({
  historySize: 20, // Keep last 20 scores
  enableTrendAnalysis: true, // Enable trend detection
})

// Update score when stats change
watch(
  () => stats.stats,
  (newStats) => {
    if (newStats) {
      updateScore({
        packetLoss: newStats.audio.packetsLostPercent,
        jitter: newStats.audio.jitterMs,
        rtt: newStats.rtt,
        mos: stats.mosScore.value,
      })
    }
  }
)
```

### Quality Grades

The composable converts raw metrics into intuitive grades:

| Grade | Score Range | Description                              |
| ----- | ----------- | ---------------------------------------- |
| A     | 90-100      | Excellent call quality                   |
| B     | 75-89       | Good call quality                        |
| C     | 60-74       | Fair call quality - some issues detected |
| D     | 40-59       | Poor call quality - noticeable problems  |
| F     | 0-39        | Very poor - consider reconnecting        |

### Score Structure

```typescript
interface CallQualityScore {
  overall: number // 0-100 combined score
  audio: number // Audio quality score
  video: number | null // Video quality score (null for audio-only)
  network: number // Network conditions score
  grade: QualityGrade // A, B, C, D, or F
  description: string // Human-readable description
  timestamp: Date // When score was calculated
}
```

### Custom Weights

Adjust metric importance based on your use case:

```typescript
const { setWeights } = useCallQualityScore({
  weights: {
    packetLoss: 0.35, // Packet loss (default: 0.30)
    jitter: 0.2, // Jitter (default: 0.20)
    rtt: 0.2, // Round-trip time (default: 0.20)
    mos: 0.15, // MOS score (default: 0.15)
    bitrateStability: 0.1, // Bitrate stability (default: 0.15)
  },
})

// Update weights dynamically
setWeights({
  packetLoss: 0.4, // Prioritize packet loss for audio calls
  rtt: 0.3,
})
```

---

## Network Quality Indicator

The `useNetworkQualityIndicator` composable provides visual signal strength indicators.

### Basic Usage

```typescript
import { useNetworkQualityIndicator } from 'vuesip'

const {
  indicator, // Current indicator data
  isAvailable, // Whether data is available
  update, // Update with network metrics
  reset, // Reset indicator
} = useNetworkQualityIndicator()

// Update from WebRTC stats
update({
  rtt: 50,
  jitter: 10,
  packetLoss: 0.5,
  candidateType: 'host', // ICE candidate type
})
```

### Indicator Data

```typescript
interface NetworkQualityIndicatorData {
  level: NetworkQualityLevel // excellent/good/fair/poor/critical/unknown
  bars: SignalBars // 1-5 signal bars
  color: string // Color for the indicator
  icon: NetworkQualityIcon // Icon name
  ariaLabel: string // Accessibility label
  details: NetworkDetails // Detailed metrics
}
```

### Signal Bars Visualization

Create a visual signal strength indicator:

```vue
<template>
  <div class="signal-indicator" :aria-label="indicator.ariaLabel" role="img">
    <div
      v-for="bar in 5"
      :key="bar"
      class="signal-bar"
      :class="{
        active: bar <= indicator.bars,
        inactive: bar > indicator.bars,
      }"
      :style="{ backgroundColor: bar <= indicator.bars ? indicator.color : '#ccc' }"
    />
  </div>
</template>

<script setup lang="ts">
import { useNetworkQualityIndicator } from 'vuesip'

const { indicator } = useNetworkQualityIndicator()
</script>

<style scoped>
.signal-indicator {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 20px;
}

.signal-bar {
  width: 4px;
  border-radius: 1px;
  transition: background-color 0.3s;
}

.signal-bar:nth-child(1) {
  height: 20%;
}
.signal-bar:nth-child(2) {
  height: 40%;
}
.signal-bar:nth-child(3) {
  height: 60%;
}
.signal-bar:nth-child(4) {
  height: 80%;
}
.signal-bar:nth-child(5) {
  height: 100%;
}
</style>
```

### Custom Thresholds

Adjust quality level thresholds:

```typescript
const indicator = useNetworkQualityIndicator({
  thresholds: {
    rtt: [50, 100, 200, 400], // Excellent/Good/Fair/Poor thresholds
    jitter: [10, 25, 50, 100],
    packetLoss: [0.5, 1, 3, 8],
  },
  colors: {
    excellent: '#22c55e', // Green
    good: '#84cc16', // Lime
    fair: '#eab308', // Yellow
    poor: '#f97316', // Orange
    critical: '#ef4444', // Red
    unknown: '#6b7280', // Gray
  },
})
```

---

## Building a Dashboard

Combine composables to create a comprehensive dashboard.

### Complete Dashboard Example

```vue
<template>
  <div class="quality-dashboard">
    <!-- Overall Quality -->
    <div class="quality-summary">
      <div class="grade-display" :class="gradeClass">
        {{ score?.grade || '-' }}
      </div>
      <div class="quality-details">
        <span class="quality-score">{{ score?.overall?.toFixed(0) || '--' }}/100</span>
        <span class="quality-description">{{ score?.description || 'No data' }}</span>
      </div>
      <NetworkSignal :indicator="networkIndicator.indicator.value" />
    </div>

    <!-- Metric Cards -->
    <div class="metrics-grid">
      <MetricCard
        title="Packet Loss"
        :value="formatPercent(currentMetrics.packetLoss)"
        :status="getMetricStatus('packetLoss', currentMetrics.packetLoss)"
      />
      <MetricCard
        title="Jitter"
        :value="formatMs(currentMetrics.jitter)"
        :status="getMetricStatus('jitter', currentMetrics.jitter)"
      />
      <MetricCard
        title="Round Trip"
        :value="formatMs(currentMetrics.rtt)"
        :status="getMetricStatus('rtt', currentMetrics.rtt)"
      />
      <MetricCard
        title="MOS Score"
        :value="currentMetrics.mos?.toFixed(1) || '--'"
        :status="getMetricStatus('mos', currentMetrics.mos)"
      />
    </div>

    <!-- Trend Indicator -->
    <div class="trend-section" v-if="trend">
      <TrendIndicator
        :direction="trend.direction"
        :rate="trend.rate"
        :confidence="trend.confidence"
      />
    </div>

    <!-- History Chart -->
    <div class="history-chart">
      <QualityChart :history="history" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import {
  useSipClient,
  useSipWebRTCStats,
  useCallQualityScore,
  useNetworkQualityIndicator,
} from 'vuesip'

// Core composables
const { currentCall } = useSipClient()
const stats = useSipWebRTCStats(currentCall)
const { score, trend, history, updateScore } = useCallQualityScore()
const networkIndicator = useNetworkQualityIndicator()

// Current metrics
const currentMetrics = ref({
  packetLoss: 0,
  jitter: 0,
  rtt: 0,
  mos: undefined as number | undefined,
})

// Update on stats change
watch(
  () => stats.stats,
  (newStats) => {
    if (!newStats) return

    const metrics = {
      packetLoss: newStats.audio.packetsLostPercent || 0,
      jitter: newStats.audio.jitterMs || 0,
      rtt: newStats.rtt || 0,
      mos: stats.mosScore.value,
    }

    currentMetrics.value = metrics
    updateScore(metrics)
    networkIndicator.update(metrics)
  }
)

// Grade styling
const gradeClass = computed(() => ({
  'grade-a': score.value?.grade === 'A',
  'grade-b': score.value?.grade === 'B',
  'grade-c': score.value?.grade === 'C',
  'grade-d': score.value?.grade === 'D',
  'grade-f': score.value?.grade === 'F',
}))

// Metric status helpers
function getMetricStatus(metric: string, value?: number) {
  if (value === undefined) return 'unknown'

  const thresholds: Record<string, number[]> = {
    packetLoss: [0.5, 1, 3, 5],
    jitter: [10, 25, 50, 80],
    rtt: [50, 100, 200, 400],
    mos: [4.2, 4.0, 3.5, 3.0],
  }

  const t = thresholds[metric]
  if (!t) return 'unknown'

  if (metric === 'mos') {
    // Higher is better for MOS
    if (value >= t[0]) return 'excellent'
    if (value >= t[1]) return 'good'
    if (value >= t[2]) return 'fair'
    if (value >= t[3]) return 'poor'
    return 'critical'
  } else {
    // Lower is better for other metrics
    if (value <= t[0]) return 'excellent'
    if (value <= t[1]) return 'good'
    if (value <= t[2]) return 'fair'
    if (value <= t[3]) return 'poor'
    return 'critical'
  }
}

// Formatters
function formatPercent(value?: number) {
  return value !== undefined ? `${value.toFixed(2)}%` : '--'
}

function formatMs(value?: number) {
  return value !== undefined ? `${value.toFixed(0)}ms` : '--'
}
</script>
```

---

## Trend Analysis

Track quality changes over time with confidence-weighted trend analysis.

### Understanding Trends

```typescript
interface QualityTrend {
  direction: 'improving' | 'stable' | 'degrading'
  rate: number // Change rate per measurement
  confidence: number // 0-1 confidence level
}
```

### Trend Visualization

```vue
<template>
  <div class="trend-indicator" v-if="trend">
    <span class="trend-icon" :class="trendClass">
      <ArrowUp v-if="trend.direction === 'improving'" />
      <Minus v-else-if="trend.direction === 'stable'" />
      <ArrowDown v-else />
    </span>
    <span class="trend-label">
      {{ trendLabel }}
    </span>
    <span class="trend-confidence"> ({{ confidenceLabel }} confidence) </span>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { QualityTrend } from 'vuesip'

const props = defineProps<{
  trend: QualityTrend
}>()

const trendClass = computed(() => ({
  improving: props.trend.direction === 'improving',
  stable: props.trend.direction === 'stable',
  degrading: props.trend.direction === 'degrading',
}))

const trendLabel = computed(() => {
  const rate = Math.abs(props.trend.rate)
  if (props.trend.direction === 'improving') {
    return `Improving (${rate.toFixed(1)} pts/interval)`
  } else if (props.trend.direction === 'degrading') {
    return `Degrading (${rate.toFixed(1)} pts/interval)`
  }
  return 'Stable'
})

const confidenceLabel = computed(() => {
  if (props.trend.confidence >= 0.8) return 'high'
  if (props.trend.confidence >= 0.5) return 'medium'
  return 'low'
})
</script>
```

---

## Quality Recommendations

Generate actionable recommendations based on current metrics.

### Recommendation Logic

```typescript
function getRecommendations(metrics: {
  packetLoss: number
  jitter: number
  rtt: number
  candidateType?: string
}): string[] {
  const recommendations: string[] = []

  if (metrics.packetLoss > 2) {
    recommendations.push('High packet loss detected. Check network stability.')
    if (metrics.packetLoss > 5) {
      recommendations.push('Consider switching to a wired connection.')
    }
  }

  if (metrics.jitter > 50) {
    recommendations.push('High jitter detected. Close bandwidth-heavy applications.')
  }

  if (metrics.rtt > 200) {
    recommendations.push('High latency detected. Consider using a closer server.')
    if (metrics.candidateType === 'relay') {
      recommendations.push('Connection is relayed. Try disabling VPN if using one.')
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Call quality is good. No action needed.')
  }

  return recommendations
}
```

### Recommendations Component

```vue
<template>
  <div class="recommendations" v-if="recommendations.length">
    <h4>Recommendations</h4>
    <ul>
      <li v-for="(rec, index) in recommendations" :key="index" class="recommendation">
        {{ rec }}
      </li>
    </ul>
  </div>
</template>
```

---

## Advanced Usage

### Persisting Quality History

Store quality data for post-call analysis:

```typescript
import { watch } from 'vue'
import { useCallQualityScore } from 'vuesip'

const { history } = useCallQualityScore({
  historySize: 1000, // Store more history
})

// Export history after call
function exportQualityReport() {
  return {
    callId: currentCall.value?.id,
    startTime: history.value[0]?.timestamp,
    endTime: history.value[history.value.length - 1]?.timestamp,
    averageScore: calculateAverage(history.value.map((h) => h.overall)),
    minScore: Math.min(...history.value.map((h) => h.overall)),
    maxScore: Math.max(...history.value.map((h) => h.overall)),
    qualityTimeline: history.value.map((h) => ({
      timestamp: h.timestamp,
      score: h.overall,
      grade: h.grade,
    })),
  }
}
```

### Multi-Call Quality Tracking

Track quality across multiple simultaneous calls:

```typescript
import { reactive } from 'vue'
import { useCallQualityScore } from 'vuesip'

const qualityScorers = reactive(new Map<string, ReturnType<typeof useCallQualityScore>>())

function addCallQualityTracker(callId: string) {
  if (!qualityScorers.has(callId)) {
    qualityScorers.set(callId, useCallQualityScore())
  }
  return qualityScorers.get(callId)!
}

function removeCallQualityTracker(callId: string) {
  const tracker = qualityScorers.get(callId)
  if (tracker) {
    tracker.reset()
    qualityScorers.delete(callId)
  }
}
```

### Quality-Based Adaptive Actions

Automatically respond to quality changes:

```typescript
watch(score, (newScore) => {
  if (!newScore) return

  // Reduce video quality on poor network
  if (newScore.grade === 'D' || newScore.grade === 'F') {
    reduceVideoQuality()
  }

  // Show warning on degradation
  if (newScore.grade === 'D') {
    showQualityWarning('Connection quality is degraded')
  }

  // Suggest reconnection on critical
  if (newScore.grade === 'F') {
    suggestReconnection()
  }
})
```

---

## Related Resources

- [Call Quality Monitoring](/guide/call-quality) - Basic WebRTC stats collection
- [Error Handling](/guide/error-handling) - Handling quality-related errors
- [Performance Guide](/guide/performance) - Optimizing call performance
- [API Reference: Composables](/api/composables) - Full API documentation
