# Call Quality Monitoring Guide

This guide covers call quality monitoring in VueSIP using the `useSipWebRTCStats` composable, enabling you to build applications with real-time quality metrics, MOS score tracking, and quality alerts.

## Overview

Call quality monitoring is essential for maintaining a professional VoIP experience. VueSIP provides comprehensive WebRTC statistics collection that allows you to:

- **Monitor Quality Metrics**: Track jitter, packet loss, and round-trip time
- **Calculate MOS Scores**: Estimate Mean Opinion Score using the E-Model
- **Detect Quality Issues**: Get alerts when metrics exceed thresholds
- **Track History**: Maintain a history of quality measurements
- **Display Status**: Show real-time quality indicators to users

**Why Call Quality Monitoring Matters:**
- **User Experience**: Identify and address quality issues before users complain
- **Troubleshooting**: Diagnose network problems with concrete data
- **SLA Compliance**: Track quality metrics for service level agreements
- **Proactive Maintenance**: Detect degradation trends early

## Table of Contents

- [Prerequisites](#prerequisites)
- [Basic Setup](#basic-setup)
- [Quality Metrics](#quality-metrics)
- [MOS Score](#mos-score)
- [Quality Alerts](#quality-alerts)
- [Stats History](#stats-history)
- [Advanced Usage](#advanced-usage)
- [Understanding Metrics](#understanding-metrics)

---

## Prerequisites

Before using `useSipWebRTCStats`, ensure you have:

1. **Active Call Session**: An established WebRTC call
2. **VueSIP SIP Client**: Connected and registered SIP client
3. **Modern Browser**: With RTCPeerConnection.getStats() support

## Basic Setup

### Creating the Stats Composable

```typescript
import { ref, computed } from 'vue'
import { useSipClient, useSipWebRTCStats } from 'vuesip'

// Get the current call session
const { currentCall } = useSipClient()

// Create the stats composable
const {
  stats,              // Current stats snapshot
  quality,            // Quality level (excellent/good/fair/poor/bad)
  mosScore,           // Mean Opinion Score (1.0-5.0)
  isCollecting,       // Whether stats collection is active
  history,            // Historical stats entries
  alerts,             // Active quality alerts
  error,              // Error message if any

  // Computed metrics
  avgPacketLoss,      // Average packet loss percentage
  avgJitter,          // Average jitter in ms
  avgRtt,             // Average round-trip time in ms
  currentBitrate,     // Current bitrate

  // Methods
  start,              // Start collecting stats
  stop,               // Stop collecting stats
  getSnapshot,        // Get current stats snapshot
  clearHistory,       // Clear stats history
  clearAlerts,        // Clear active alerts
  setThresholds,      // Update quality thresholds
  onAlert,            // Listen for quality alerts
  onQualityChange,    // Listen for quality level changes
} = useSipWebRTCStats(
  computed(() => currentCall.value)
)
```

### With Options

```typescript
const stats = useSipWebRTCStats(
  computed(() => currentCall.value),
  {
    // Collection interval in ms (default: 1000)
    interval: 1000,

    // Auto-start when call connects (default: true)
    autoStart: true,

    // Include video stats (default: false)
    includeVideo: false,

    // Calculate MOS score (default: true)
    calculateMos: true,

    // Max history entries (default: 100)
    historyLimit: 100,

    // Custom quality thresholds
    thresholds: {
      packetLossWarning: 1,      // % loss for warning
      packetLossCritical: 5,     // % loss for critical
      jitterWarning: 30,         // ms jitter for warning
      jitterCritical: 100,       // ms jitter for critical
      rttWarning: 150,           // ms RTT for warning
      rttCritical: 300,          // ms RTT for critical
      mosWarning: 3.5,           // MOS for warning
      mosCritical: 2.5,          // MOS for critical
    },

    // Callbacks
    onStatsUpdate: (snapshot) => {
      console.log('Stats updated:', snapshot)
    },
    onQualityChange: (level, prevLevel) => {
      console.log(`Quality changed: ${prevLevel} → ${level}`)
    },
    onQualityAlert: (alert) => {
      console.log('Quality alert:', alert)
    },
  }
)
```

## Quality Metrics

### Stats Snapshot Structure

Each stats snapshot contains:

```typescript
interface WebRTCStatsSnapshot {
  timestamp: Date

  // Inbound (receiving) stats
  inbound: {
    packetsReceived: number
    packetsLost: number
    bytesReceived: number
    jitter: number              // in seconds
    framesDecoded?: number      // for video
    framesDropped?: number      // for video
  }

  // Outbound (sending) stats
  outbound: {
    packetsSent: number
    bytesSent: number
    retransmittedPacketsSent: number
  }

  // Connection stats
  connection: {
    currentRoundTripTime: number  // in seconds
    availableOutgoingBitrate: number
    availableIncomingBitrate: number
  }

  // Calculated metrics
  calculated: {
    packetLossPercent: number
    jitterMs: number
    rttMs: number
    mosScore: number | null
    qualityLevel: QualityLevel
  }
}
```

### Quality Levels

```typescript
type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'bad' | 'unknown'
```

Quality is determined by these default thresholds:

| Level | Packet Loss | Jitter | RTT | MOS |
|-------|-------------|--------|-----|-----|
| Excellent | < 0.5% | < 20ms | < 100ms | > 4.0 |
| Good | < 1% | < 30ms | < 150ms | > 3.5 |
| Fair | < 3% | < 50ms | < 200ms | > 3.0 |
| Poor | < 5% | < 100ms | < 300ms | > 2.5 |
| Bad | ≥ 5% | ≥ 100ms | ≥ 300ms | ≤ 2.5 |

### Accessing Current Metrics

```typescript
// Get current stats
const currentStats = stats.value

if (currentStats) {
  const { calculated } = currentStats

  console.log(`Packet Loss: ${calculated.packetLossPercent.toFixed(2)}%`)
  console.log(`Jitter: ${calculated.jitterMs.toFixed(1)}ms`)
  console.log(`RTT: ${calculated.rttMs.toFixed(1)}ms`)
  console.log(`Quality: ${calculated.qualityLevel}`)
}
```

### Using Computed Averages

```typescript
// These are computed from the history
console.log(`Average Packet Loss: ${avgPacketLoss.value?.toFixed(2)}%`)
console.log(`Average Jitter: ${avgJitter.value?.toFixed(1)}ms`)
console.log(`Average RTT: ${avgRtt.value?.toFixed(1)}ms`)
console.log(`Current Bitrate: ${currentBitrate.value} bps`)
```

## MOS Score

### What is MOS?

Mean Opinion Score (MOS) is a standard measure of voice quality, rated on a scale of 1 to 5:

| Score | Quality | Description |
|-------|---------|-------------|
| 4.3 - 5.0 | Excellent | Imperceptible quality loss |
| 4.0 - 4.3 | Good | Perceptible but not annoying |
| 3.6 - 4.0 | Fair | Slightly annoying |
| 3.1 - 3.6 | Poor | Annoying |
| 2.6 - 3.1 | Bad | Very annoying |
| 1.0 - 2.6 | Unacceptable | Unintelligible |

### Accessing MOS Score

```typescript
// Get current MOS score
const mos = mosScore.value

if (mos !== null) {
  console.log(`MOS Score: ${mos.toFixed(2)}`)

  if (mos >= 4.0) {
    console.log('Excellent call quality')
  } else if (mos >= 3.5) {
    console.log('Good call quality')
  } else if (mos >= 3.0) {
    console.log('Fair call quality')
  } else {
    console.log('Poor call quality - may need attention')
  }
}
```

### MOS Calculation

VueSIP calculates MOS using a simplified E-Model based on:
- Packet loss percentage
- Jitter (converted to effective delay)
- Round-trip time

```typescript
// The calculation approximates:
// R = 93.2 - Id - Ie
// Where:
//   Id = delay impairment
//   Ie = equipment impairment (based on codec + packet loss)
// MOS = 1 + 0.035*R + 7*10^-6 * R * (R-60) * (100-R)
```

## Quality Alerts

### Alert Structure

```typescript
interface QualityAlert {
  id: string
  type: 'packet_loss' | 'jitter' | 'rtt' | 'mos'
  severity: 'warning' | 'critical'
  metric: string
  value: number
  threshold: number
  message: string
  timestamp: Date
}
```

### Listening for Alerts

```typescript
// Register an alert listener
const unsubscribe = onAlert((alert) => {
  console.log(`[${alert.severity}] ${alert.message}`)

  if (alert.severity === 'critical') {
    showCriticalWarning(alert)
  } else {
    showWarning(alert)
  }
})

// Later: unsubscribe
unsubscribe()
```

### Accessing Active Alerts

```typescript
// Check for active alerts
if (alerts.value.length > 0) {
  console.log('Active quality alerts:')
  alerts.value.forEach(alert => {
    console.log(`  ${alert.type}: ${alert.message}`)
  })
}

// Clear alerts
clearAlerts()
```

### Listening for Quality Changes

```typescript
const unsubscribe = onQualityChange((newLevel, oldLevel) => {
  if (newLevel === 'poor' || newLevel === 'bad') {
    showQualityWarning(`Call quality is ${newLevel}`)
  } else if (oldLevel === 'poor' && newLevel === 'good') {
    showInfo('Call quality has improved')
  }
})
```

## Stats History

### Accessing History

```typescript
// Get all history entries
const historyEntries = history.value

// Most recent entry
const latest = historyEntries[historyEntries.length - 1]

// Calculate trends
const recentEntries = historyEntries.slice(-10)
const avgRecentLoss = recentEntries.reduce(
  (sum, e) => sum + e.calculated.packetLossPercent, 0
) / recentEntries.length
```

### Clearing History

```typescript
// Clear all history
clearHistory()
```

### History Limit

```typescript
// Set during initialization
const stats = useSipWebRTCStats(callRef, {
  historyLimit: 300, // Keep 5 minutes at 1s interval
})
```

## Advanced Usage

### Quality Indicator Component

```vue
<template>
  <div class="quality-indicator" :class="qualityClass">
    <div class="quality-bars">
      <span
        v-for="i in 5"
        :key="i"
        class="bar"
        :class="{ active: qualityBars >= i }"
      />
    </div>
    <span class="quality-label">{{ quality }}</span>
    <span v-if="mosScore" class="mos-score">
      MOS: {{ mosScore.toFixed(1) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSipWebRTCStats } from 'vuesip'

const { quality, mosScore } = useSipWebRTCStats(callRef)

const qualityClass = computed(() => `quality-${quality.value}`)

const qualityBars = computed(() => {
  switch (quality.value) {
    case 'excellent': return 5
    case 'good': return 4
    case 'fair': return 3
    case 'poor': return 2
    case 'bad': return 1
    default: return 0
  }
})
</script>

<style scoped>
.quality-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.quality-bars {
  display: flex;
  gap: 2px;
}

.bar {
  width: 4px;
  height: 16px;
  background: var(--inactive-color);
  border-radius: 2px;
}

.bar.active {
  background: var(--quality-color);
}

.quality-excellent { --quality-color: #22c55e; }
.quality-good { --quality-color: #84cc16; }
.quality-fair { --quality-color: #eab308; }
.quality-poor { --quality-color: #f97316; }
.quality-bad { --quality-color: #ef4444; }
</style>
```

### Real-Time Stats Dashboard

```vue
<template>
  <div class="stats-dashboard">
    <div class="metric-cards">
      <div class="metric-card">
        <span class="label">Packet Loss</span>
        <span class="value" :class="getMetricClass('packetLoss')">
          {{ formatPercent(stats?.calculated.packetLossPercent) }}
        </span>
      </div>

      <div class="metric-card">
        <span class="label">Jitter</span>
        <span class="value" :class="getMetricClass('jitter')">
          {{ formatMs(stats?.calculated.jitterMs) }}
        </span>
      </div>

      <div class="metric-card">
        <span class="label">RTT</span>
        <span class="value" :class="getMetricClass('rtt')">
          {{ formatMs(stats?.calculated.rttMs) }}
        </span>
      </div>

      <div class="metric-card">
        <span class="label">MOS</span>
        <span class="value" :class="getMetricClass('mos')">
          {{ mosScore?.toFixed(2) || 'N/A' }}
        </span>
      </div>
    </div>

    <div v-if="alerts.length" class="alerts">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="alert"
        :class="alert.severity"
      >
        {{ alert.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSipWebRTCStats } from 'vuesip'

const { stats, mosScore, alerts } = useSipWebRTCStats(callRef)

function formatPercent(value?: number) {
  return value !== undefined ? `${value.toFixed(2)}%` : 'N/A'
}

function formatMs(value?: number) {
  return value !== undefined ? `${value.toFixed(1)}ms` : 'N/A'
}

function getMetricClass(metric: string) {
  const s = stats.value?.calculated
  if (!s) return ''

  switch (metric) {
    case 'packetLoss':
      return s.packetLossPercent > 5 ? 'critical' :
             s.packetLossPercent > 1 ? 'warning' : 'good'
    case 'jitter':
      return s.jitterMs > 100 ? 'critical' :
             s.jitterMs > 30 ? 'warning' : 'good'
    case 'rtt':
      return s.rttMs > 300 ? 'critical' :
             s.rttMs > 150 ? 'warning' : 'good'
    case 'mos':
      const mos = mosScore.value
      return !mos ? '' :
             mos < 2.5 ? 'critical' :
             mos < 3.5 ? 'warning' : 'good'
    default:
      return ''
  }
}
</script>
```

### History Graph Component

```vue
<template>
  <div class="stats-graph">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSipWebRTCStats } from 'vuesip'

const { history } = useSipWebRTCStats(callRef)
const canvasRef = ref<HTMLCanvasElement>()

function drawGraph() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const data = history.value.slice(-60) // Last 60 seconds
  const width = canvas.width
  const height = canvas.height

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Draw packet loss line
  ctx.strokeStyle = '#ef4444'
  ctx.beginPath()
  data.forEach((point, i) => {
    const x = (i / data.length) * width
    const y = height - (point.calculated.packetLossPercent / 10) * height
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  // Draw jitter line
  ctx.strokeStyle = '#f97316'
  ctx.beginPath()
  data.forEach((point, i) => {
    const x = (i / data.length) * width
    const y = height - (point.calculated.jitterMs / 100) * height
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

watch(history, drawGraph, { deep: true })
onMounted(drawGraph)
</script>
```

### Custom Thresholds

```typescript
// Update thresholds at runtime
setThresholds({
  packetLossWarning: 2,
  packetLossCritical: 8,
  jitterWarning: 50,
  jitterCritical: 150,
})

// Or set during initialization for stricter monitoring
const stats = useSipWebRTCStats(callRef, {
  thresholds: {
    // More strict thresholds for high-quality requirements
    packetLossWarning: 0.5,
    packetLossCritical: 2,
    jitterWarning: 20,
    jitterCritical: 50,
    rttWarning: 100,
    rttCritical: 200,
    mosWarning: 4.0,
    mosCritical: 3.5,
  },
})
```

## Understanding Metrics

### Packet Loss

**What it is**: The percentage of audio packets that don't arrive at their destination.

**Impact**:
- 0-1%: Generally imperceptible
- 1-3%: Noticeable degradation
- 3-5%: Annoying, choppy audio
- >5%: Severe, difficult to understand

**Common Causes**:
- Network congestion
- WiFi interference
- Firewall issues
- ISP problems

### Jitter

**What it is**: Variation in packet arrival times, measured in milliseconds.

**Impact**:
- <20ms: Excellent, no issues
- 20-50ms: Good, minor buffering needed
- 50-100ms: Fair, noticeable delays
- >100ms: Poor, significant audio problems

**Common Causes**:
- Network congestion
- Route changes
- Variable processing delays
- Competing traffic

### Round-Trip Time (RTT)

**What it is**: Time for a packet to travel to the destination and back, in milliseconds.

**Impact**:
- <150ms: Good for interactive conversation
- 150-300ms: Noticeable delay
- 300-450ms: Difficult conversation
- >450ms: Very difficult communication

**Common Causes**:
- Geographic distance
- Network routing
- Processing delays
- Satellite connections

### MOS (Mean Opinion Score)

**What it is**: A calculated estimate of perceived voice quality on a 1-5 scale.

**Interpretation**:
- 4.0+: Toll quality (PSTN equivalent)
- 3.5-4.0: Acceptable for business
- 3.0-3.5: Minimum acceptable
- <3.0: Below acceptable quality

**Note**: VueSIP calculates MOS using the E-Model algorithm, which is an estimation. Actual perceived quality may vary based on codecs and other factors.

## Best Practices

### 1. Start Collection When Call Connects

```typescript
const { currentCall } = useSipClient()
const { start, stop } = useSipWebRTCStats(
  computed(() => currentCall.value),
  { autoStart: true } // Automatically starts when call is available
)
```

### 2. Display Quality Indicators

```vue
<template>
  <div class="call-ui">
    <!-- Always show quality indicator during calls -->
    <QualityIndicator v-if="isInCall" />

    <!-- Show detailed stats on demand -->
    <StatsPanel v-if="showDetails" />
  </div>
</template>
```

### 3. Log Quality Issues

```typescript
const stats = useSipWebRTCStats(callRef, {
  onQualityAlert: (alert) => {
    // Log to analytics
    analytics.track('call_quality_alert', {
      type: alert.type,
      severity: alert.severity,
      value: alert.value,
      callId: currentCall.value?.id,
    })
  },
})
```

### 4. Notify Users of Quality Issues

```typescript
onQualityChange((level) => {
  if (level === 'poor' || level === 'bad') {
    showToast({
      type: 'warning',
      message: 'Call quality is degraded. Try moving closer to your router.',
    })
  }
})
```

### 5. Clean Up Resources

```typescript
import { onUnmounted } from 'vue'

// Stop collection when component unmounts
onUnmounted(() => {
  stop()
  clearHistory()
})
```

## Related Guides

- [Making Calls](/guide/making-calls)
- [Call Controls](/guide/call-controls)
- [Error Handling](/guide/error-handling)
- [Performance](/guide/performance)
