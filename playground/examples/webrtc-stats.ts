import type { ExampleDefinition } from './types'
import WebRTCStatsDemo from '../demos/WebRTCStatsDemo.vue'

export const webrtcStatsExample: ExampleDefinition = {
  id: 'webrtc-stats',
  icon: '📊',
  title: 'WebRTC Stats',
  description: 'Real-time call quality metrics and MOS scores',
  category: 'sip',
  tags: ['Advanced', 'Quality', 'Monitoring'],
  component: WebRTCStatsDemo,
  setupGuide: '<p>Monitor real-time call quality using WebRTC statistics. View MOS scores, jitter, packet loss, and latency metrics.</p>',
  codeSnippets: [
    {
      title: 'Access Call Quality Metrics',
      description: 'Get real-time quality statistics during a call',
      code: `import { useWebRTCStats } from 'vuesip'

const stats = useWebRTCStats(sessionRef)

// Access current quality
console.log('Quality:', stats.quality.value)
console.log('MOS Score:', stats.mosScore.value?.value)
console.log('Jitter:', stats.jitter.value, 'ms')
console.log('Packet Loss:', stats.packetLoss.value, '%')`,
    },
    {
      title: 'Monitor Quality Changes',
      description: 'React to quality degradation',
      code: `// Watch for quality changes
watch(stats.quality, (quality) => {
  if (quality === 'poor') {
    console.warn('Call quality is degrading')
  }
})

// Get detailed statistics
const detailed = stats.getDetailedStats()
console.log('RTT:', detailed.rtt, 'ms')
console.log('Bitrate:', detailed.bitrate, 'kbps')`,
    },
    {
      title: 'Complete Stats Data Model',
      description: 'Comprehensive WebRTC statistics structure',
      code: `interface WebRTCStats {
  // Audio metrics
  audio: {
    inbound: {
      packetsReceived: number
      packetsLost: number
      jitter: number
      bytesReceived: number
      codec: string
      clockRate: number
    }
    outbound: {
      packetsSent: number
      bytesSent: number
      codec: string
      targetBitrate: number
    }
    level: {
      local: number  // 0-1
      remote: number // 0-1
    }
  }

  // Video metrics (if applicable)
  video?: {
    inbound: {
      width: number
      height: number
      framesReceived: number
      framesDecoded: number
      framesDropped: number
      bytesReceived: number
      codec: string
    }
    outbound: {
      width: number
      height: number
      framesSent: number
      framesEncoded: number
      bytesSent: number
      qualityLimitationReason: string
    }
  }

  // Connection metrics
  connection: {
    rtt: number
    availableOutgoingBitrate: number
    candidateType: 'host' | 'srflx' | 'prflx' | 'relay'
    localAddress: string
    remoteAddress: string
    protocol: 'udp' | 'tcp'
    state: RTCIceConnectionState
  }

  // Calculated metrics
  quality: {
    mos: number
    rating: 'excellent' | 'good' | 'fair' | 'poor'
    packetLossPercent: number
    effectiveJitter: number
  }

  timestamp: number
}`,
    },
    {
      title: 'Stats Collection Engine',
      description: 'Real-time statistics gathering from RTCPeerConnection',
      code: `class WebRTCStatsCollector {
  private pc: RTCPeerConnection
  private intervalId: number | null = null
  private history: WebRTCStats[] = []
  private maxHistory = 60 // 1 minute at 1s intervals

  constructor(peerConnection: RTCPeerConnection) {
    this.pc = peerConnection
  }

  async collectStats(): Promise<WebRTCStats> {
    const stats = await this.pc.getStats()
    const result: Partial<WebRTCStats> = {
      audio: { inbound: {}, outbound: {}, level: {} },
      connection: {},
      quality: {},
      timestamp: Date.now()
    }

    stats.forEach(report => {
      switch (report.type) {
        case 'inbound-rtp':
          if (report.kind === 'audio') {
            result.audio!.inbound = {
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              jitter: report.jitter * 1000, // Convert to ms
              bytesReceived: report.bytesReceived,
              codec: this.getCodecName(stats, report.codecId),
              clockRate: 0
            }
          } else if (report.kind === 'video') {
            result.video = result.video || { inbound: {}, outbound: {} }
            result.video.inbound = {
              width: report.frameWidth,
              height: report.frameHeight,
              framesReceived: report.framesReceived,
              framesDecoded: report.framesDecoded,
              framesDropped: report.framesDropped || 0,
              bytesReceived: report.bytesReceived,
              codec: this.getCodecName(stats, report.codecId)
            }
          }
          break

        case 'outbound-rtp':
          if (report.kind === 'audio') {
            result.audio!.outbound = {
              packetsSent: report.packetsSent,
              bytesSent: report.bytesSent,
              codec: this.getCodecName(stats, report.codecId),
              targetBitrate: report.targetBitrate || 0
            }
          }
          break

        case 'candidate-pair':
          if (report.state === 'succeeded') {
            result.connection = {
              rtt: report.currentRoundTripTime * 1000,
              availableOutgoingBitrate: report.availableOutgoingBitrate,
              ...this.getCandidateInfo(stats, report)
            }
          }
          break
      }
    })

    // Calculate quality metrics
    result.quality = this.calculateQuality(result as WebRTCStats)

    this.history.push(result as WebRTCStats)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    return result as WebRTCStats
  }

  private getCodecName(stats: RTCStatsReport, codecId: string): string {
    const codec = stats.get(codecId)
    return codec?.mimeType?.split('/')[1] || 'unknown'
  }

  start(intervalMs = 1000) {
    this.intervalId = window.setInterval(() => {
      this.collectStats()
    }, intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}`,
    },
    {
      title: 'MOS Score Calculation',
      description: 'Calculate Mean Opinion Score using E-model',
      code: `const calculateMOS = (
  latency: number,
  jitter: number,
  packetLoss: number,
  codec: string = 'opus'
): { mos: number; rating: string } => {
  // Base R-factor for codec (ITU-T G.107)
  const codecFactors: Record<string, number> = {
    'opus': 93.0,
    'g711': 93.2,
    'g722': 92.0,
    'g729': 82.0,
    'ilbc': 85.0
  }

  let R = codecFactors[codec.toLowerCase()] || 93.0

  // Delay impairment (Id)
  const effectiveDelay = latency + (jitter * 2)
  if (effectiveDelay > 177.3) {
    const Id = 0.024 * effectiveDelay +
               0.11 * (effectiveDelay - 177.3) *
               Math.sign(effectiveDelay - 177.3)
    R -= Math.min(Id, 25) // Cap at 25
  }

  // Equipment impairment due to packet loss (Ie)
  const Ie = 30 * Math.log(1 + 15 * packetLoss)
  R -= Math.min(Ie, 30) // Cap at 30

  // Clamp R-factor
  R = Math.max(0, Math.min(100, R))

  // Convert R-factor to MOS (1-5 scale)
  let mos: number
  if (R < 6.5) {
    mos = 1.0
  } else if (R > 100) {
    mos = 4.5
  } else {
    mos = 1 + 0.035 * R + R * (R - 60) * (100 - R) * 7e-6
  }

  mos = Math.round(mos * 100) / 100

  // Quality rating
  let rating: string
  if (mos >= 4.3) rating = 'excellent'
  else if (mos >= 4.0) rating = 'good'
  else if (mos >= 3.6) rating = 'fair'
  else rating = 'poor'

  return { mos, rating }
}

// Real-time MOS tracking
const mosHistory = ref<Array<{ time: number; mos: number }>>([])

const updateMOS = (stats: WebRTCStats) => {
  const { mos, rating } = calculateMOS(
    stats.connection.rtt / 2, // One-way delay
    stats.audio.inbound.jitter,
    stats.quality.packetLossPercent,
    stats.audio.inbound.codec
  )

  mosHistory.value.push({
    time: stats.timestamp,
    mos
  })

  // Keep last 5 minutes
  const fiveMinutesAgo = Date.now() - 300000
  mosHistory.value = mosHistory.value.filter(m => m.time > fiveMinutesAgo)

  return { mos, rating }
}`,
    },
    {
      title: 'Quality Alerts System',
      description: 'Alert when quality degrades',
      code: `interface QualityAlert {
  id: string
  type: 'warning' | 'critical'
  metric: string
  value: number
  threshold: number
  message: string
  timestamp: Date
  acknowledged: boolean
}

const qualityThresholds = {
  warning: {
    packetLoss: 2,    // %
    jitter: 50,       // ms
    rtt: 300,         // ms
    mos: 3.6
  },
  critical: {
    packetLoss: 5,
    jitter: 100,
    rtt: 500,
    mos: 3.0
  }
}

const activeAlerts = ref<QualityAlert[]>([])

const checkQualityThresholds = (stats: WebRTCStats) => {
  const checks: Array<{
    metric: string
    value: number
    warningThreshold: number
    criticalThreshold: number
    comparator: 'gt' | 'lt'
  }> = [
    {
      metric: 'Packet Loss',
      value: stats.quality.packetLossPercent,
      warningThreshold: qualityThresholds.warning.packetLoss,
      criticalThreshold: qualityThresholds.critical.packetLoss,
      comparator: 'gt'
    },
    {
      metric: 'Jitter',
      value: stats.audio.inbound.jitter,
      warningThreshold: qualityThresholds.warning.jitter,
      criticalThreshold: qualityThresholds.critical.jitter,
      comparator: 'gt'
    },
    {
      metric: 'Round Trip Time',
      value: stats.connection.rtt,
      warningThreshold: qualityThresholds.warning.rtt,
      criticalThreshold: qualityThresholds.critical.rtt,
      comparator: 'gt'
    },
    {
      metric: 'MOS Score',
      value: stats.quality.mos,
      warningThreshold: qualityThresholds.warning.mos,
      criticalThreshold: qualityThresholds.critical.mos,
      comparator: 'lt'
    }
  ]

  checks.forEach(check => {
    const isWarning = check.comparator === 'gt'
      ? check.value > check.warningThreshold
      : check.value < check.warningThreshold

    const isCritical = check.comparator === 'gt'
      ? check.value > check.criticalThreshold
      : check.value < check.criticalThreshold

    if (isCritical || isWarning) {
      addAlert({
        type: isCritical ? 'critical' : 'warning',
        metric: check.metric,
        value: check.value,
        threshold: isCritical ? check.criticalThreshold : check.warningThreshold
      })
    }
  })
}

const addAlert = (alert: Omit<QualityAlert, 'id' | 'message' | 'timestamp' | 'acknowledged'>) => {
  // Deduplicate - only add if not already active for this metric
  const existing = activeAlerts.value.find(
    a => a.metric === alert.metric && !a.acknowledged
  )

  if (!existing) {
    activeAlerts.value.push({
      ...alert,
      id: \`alert-\${Date.now()}\`,
      message: \`\${alert.metric} \${alert.type}: \${alert.value.toFixed(1)} (threshold: \${alert.threshold})\`,
      timestamp: new Date(),
      acknowledged: false
    })
  }
}`,
    },
    {
      title: 'Stats Dashboard Component',
      description: 'Real-time quality monitoring UI',
      code: `<template>
  <div class="webrtc-stats-dashboard">
    <!-- MOS Score Display -->
    <div class="mos-display" :class="quality.rating">
      <div class="mos-value">{{ quality.mos.toFixed(2) }}</div>
      <div class="mos-label">MOS Score</div>
      <div class="mos-rating">{{ quality.rating }}</div>
    </div>

    <!-- Key Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Packet Loss</span>
        <span class="metric-value" :class="getMetricClass('packetLoss', stats.quality.packetLossPercent)">
          {{ stats.quality.packetLossPercent.toFixed(2) }}%
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Jitter</span>
        <span class="metric-value" :class="getMetricClass('jitter', stats.audio.inbound.jitter)">
          {{ stats.audio.inbound.jitter.toFixed(1) }} ms
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Round Trip</span>
        <span class="metric-value" :class="getMetricClass('rtt', stats.connection.rtt)">
          {{ stats.connection.rtt.toFixed(0) }} ms
        </span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Bitrate</span>
        <span class="metric-value">
          {{ formatBitrate(stats.connection.availableOutgoingBitrate) }}
        </span>
      </div>
    </div>

    <!-- Connection Info -->
    <div class="connection-info">
      <span>{{ stats.connection.protocol.toUpperCase() }}</span>
      <span>{{ stats.connection.candidateType }}</span>
      <span>{{ stats.audio.inbound.codec }}</span>
    </div>

    <!-- Alerts -->
    <div class="alerts-panel" v-if="activeAlerts.length > 0">
      <div
        v-for="alert in activeAlerts"
        :key="alert.id"
        class="alert"
        :class="alert.type"
      >
        <span class="alert-icon">{{ alert.type === 'critical' ? '🚨' : '⚠️' }}</span>
        <span class="alert-message">{{ alert.message }}</span>
        <button @click="acknowledgeAlert(alert.id)">Dismiss</button>
      </div>
    </div>

    <!-- MOS History Graph -->
    <div class="mos-graph">
      <svg :viewBox="\`0 0 300 100\`">
        <path :d="mosGraphPath" fill="none" stroke="#4CAF50" stroke-width="2" />
        <line x1="0" y1="60" x2="300" y2="60" stroke="#FF9800" stroke-dasharray="4" />
      </svg>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Stats Export and Reporting',
      description: 'Export call quality data for analysis',
      code: `interface CallQualityReport {
  callId: string
  duration: number
  startTime: Date
  endTime: Date
  averages: {
    mos: number
    packetLoss: number
    jitter: number
    rtt: number
  }
  minimums: {
    mos: number
  }
  maximums: {
    packetLoss: number
    jitter: number
    rtt: number
  }
  alerts: QualityAlert[]
  connectionType: string
  codec: string
  samples: number
}

const generateQualityReport = (history: WebRTCStats[]): CallQualityReport => {
  if (history.length === 0) {
    throw new Error('No stats to generate report')
  }

  const mosValues = history.map(s => s.quality.mos)
  const packetLossValues = history.map(s => s.quality.packetLossPercent)
  const jitterValues = history.map(s => s.audio.inbound.jitter)
  const rttValues = history.map(s => s.connection.rtt)

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

  return {
    callId: currentCallId.value,
    duration: (history[history.length - 1].timestamp - history[0].timestamp) / 1000,
    startTime: new Date(history[0].timestamp),
    endTime: new Date(history[history.length - 1].timestamp),
    averages: {
      mos: Math.round(avg(mosValues) * 100) / 100,
      packetLoss: Math.round(avg(packetLossValues) * 100) / 100,
      jitter: Math.round(avg(jitterValues) * 10) / 10,
      rtt: Math.round(avg(rttValues))
    },
    minimums: {
      mos: Math.min(...mosValues)
    },
    maximums: {
      packetLoss: Math.max(...packetLossValues),
      jitter: Math.max(...jitterValues),
      rtt: Math.max(...rttValues)
    },
    alerts: [...activeAlerts.value],
    connectionType: history[0].connection.candidateType,
    codec: history[0].audio.inbound.codec,
    samples: history.length
  }
}

const exportReport = (format: 'json' | 'csv') => {
  const report = generateQualityReport(statsHistory.value)

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    downloadBlob(blob, \`call-quality-\${report.callId}.json\`)
  } else {
    const csv = convertReportToCSV(report)
    const blob = new Blob([csv], { type: 'text/csv' })
    downloadBlob(blob, \`call-quality-\${report.callId}.csv\`)
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}`,
    },
  ],
}
