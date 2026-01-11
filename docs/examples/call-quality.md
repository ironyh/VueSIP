# Call Quality Monitoring

Real-time call quality metrics with scoring, trend analysis, and recommendations.

::: tip Try It Live
Run `pnpm dev` → Navigate to **CallQualityDemo** in the playground
:::

## Overview

Monitor call quality in real-time with:

- Quality scores (A-F grades, 0-100 scale)
- Jitter, latency, and packet loss metrics
- Trend analysis with confidence scoring
- Actionable recommendations for improvement
- Network quality indicators

## Quick Start

```vue
<script setup lang="ts">
import { useCallSession, useCallQualityScore, useNetworkQualityIndicator } from 'vuesip'

const { currentCall } = useCallSession()

const { score, grade, factors, trend, recommendations } = useCallQualityScore(currentCall)

const { level, signalBars, details, colors } = useNetworkQualityIndicator(currentCall)
</script>

<template>
  <div class="quality-demo">
    <!-- Quality Score -->
    <div class="score-card">
      <div class="grade" :style="{ color: colors.text }">
        {{ grade }}
      </div>
      <div class="score">{{ score }}/100</div>
      <div class="trend" :class="trend.direction">
        {{ trend.direction === 'improving' ? '↑' : trend.direction === 'declining' ? '↓' : '→' }}
        {{ trend.direction }}
      </div>
    </div>

    <!-- Signal Bars -->
    <div class="signal-bars">
      <div
        v-for="i in 5"
        :key="i"
        class="bar"
        :class="{ active: i <= signalBars }"
        :style="{ backgroundColor: i <= signalBars ? colors.primary : '#ddd' }"
      />
    </div>

    <!-- Metrics -->
    <div class="metrics">
      <div class="metric">
        <span class="label">Latency</span>
        <span class="value">{{ factors.latency?.toFixed(0) }}ms</span>
      </div>
      <div class="metric">
        <span class="label">Jitter</span>
        <span class="value">{{ factors.jitter?.toFixed(1) }}ms</span>
      </div>
      <div class="metric">
        <span class="label">Packet Loss</span>
        <span class="value">{{ (factors.packetLoss * 100)?.toFixed(2) }}%</span>
      </div>
    </div>

    <!-- Recommendations -->
    <div v-if="recommendations.length" class="recommendations">
      <h4>Recommendations</h4>
      <ul>
        <li v-for="rec in recommendations" :key="rec">{{ rec }}</li>
      </ul>
    </div>
  </div>
</template>
```

## Features

- **Quality Score**: 0-100 numeric score with letter grade
- **Real-Time Metrics**: Latency, jitter, packet loss, MOS
- **Trend Analysis**: Improving, stable, or declining quality
- **Signal Indicator**: Visual 1-5 bar signal strength
- **Recommendations**: Actionable suggestions for improvement
- **Customizable Thresholds**: Configure quality boundaries

## Key Composables

| Composable                   | Purpose                            |
| ---------------------------- | ---------------------------------- |
| `useCallQualityScore`        | Quality scoring and trend analysis |
| `useNetworkQualityIndicator` | Visual quality indicators          |
| `useBandwidthAdaptation`     | Adaptive quality recommendations   |
| `useSipWebRTCStats`          | Raw WebRTC statistics              |

## Quality Grades

| Grade | Score  | Description                      |
| ----- | ------ | -------------------------------- |
| A     | 90-100 | Excellent - Crystal clear audio  |
| B     | 75-89  | Good - Minor imperfections       |
| C     | 60-74  | Fair - Noticeable quality issues |
| D     | 40-59  | Poor - Significant degradation   |
| F     | 0-39   | Failing - Unusable quality       |

## Quality Factors

```typescript
interface QualityFactors {
  latency: number // Round-trip time in ms
  jitter: number // Variation in packet timing
  packetLoss: number // Percentage of lost packets (0-1)
  mos: number // Mean Opinion Score (1-5)
  bandwidth: number // Available bandwidth
}
```

## Trend Analysis

```typescript
const { trend } = useCallQualityScore(call)

// trend.direction: 'improving' | 'stable' | 'declining'
// trend.confidence: 0-1 (how reliable the trend is)
// trend.rate: Rate of change per second
```

## Custom Thresholds

```typescript
const quality = useCallQualityScore(call, {
  weights: {
    latency: 0.3,
    jitter: 0.25,
    packetLoss: 0.35,
    mos: 0.1,
  },
  thresholds: {
    excellent: { latency: 50, jitter: 10, packetLoss: 0.001 },
    good: { latency: 100, jitter: 20, packetLoss: 0.01 },
    fair: { latency: 200, jitter: 40, packetLoss: 0.03 },
    poor: { latency: 400, jitter: 80, packetLoss: 0.08 },
  },
})
```

## Related

- [Connection Recovery](/examples/connection-recovery)
- [Call Quality Guide](/guide/call-quality)
- [Quality Dashboard Guide](/guide/call-quality-dashboard)
- [API: useCallQualityScore](/api/composables#usecallqualityscore)
