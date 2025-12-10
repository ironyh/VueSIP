import type { ExampleDefinition } from './types'
import CallQualityDemo from '../demos/CallQualityDemo.vue'

export const callQualityExample: ExampleDefinition = {
  id: 'call-quality',
  icon: '📊',
  title: 'Call Quality Metrics',
  description: 'Monitor real-time call statistics',
  category: 'sip',
  tags: ['Advanced', 'Monitoring', 'Debug'],
  component: CallQualityDemo,
  setupGuide: '<p>View real-time call quality metrics including packet loss, jitter, RTT, and codec information. Essential for diagnosing call quality issues.</p>',
  codeSnippets: [
    {
      title: 'Getting Call Statistics',
      description: 'Access WebRTC stats during calls',
      code: `import { useCallSession } from 'vuesip'

const { session } = useCallSession(sipClient)

const getCallStats = async () => {
  if (!session.value?.connection) return

  const stats = await session.value.connection.getStats()

  const metrics = {
    packetLoss: 0,
    jitter: 0,
    rtt: 0
  }

  stats.forEach(report => {
    if (report.type === 'inbound-rtp') {
      metrics.packetLoss = report.packetsLost || 0
      metrics.jitter = report.jitter * 1000
    }

    if (report.type === 'candidate-pair') {
      metrics.rtt = report.currentRoundTripTime * 1000
    }
  })

  return metrics
}

// Poll every 2 seconds
setInterval(getCallStats, 2000)`,
    },
    {
      title: 'Comprehensive Stats Model',
      description: 'Complete WebRTC statistics data model',
      code: `interface CallQualityStats {
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
    }
    level: {
      input: number   // 0-1, microphone level
      output: number  // 0-1, speaker level
    }
  }
  // Video metrics (if video call)
  video: {
    inbound: {
      width: number
      height: number
      framesReceived: number
      framesDropped: number
      framesPerSecond: number
    }
    outbound: {
      width: number
      height: number
      framesSent: number
      framesPerSecond: number
    }
  } | null
  // Connection metrics
  connection: {
    rtt: number           // Round-trip time in ms
    localCandidateType: string
    remoteCandidateType: string
    protocol: 'udp' | 'tcp'
    relayed: boolean
  }
  // Quality scores
  quality: {
    mos: number          // Mean Opinion Score (1-5)
    score: number        // Percentage (0-100)
    label: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  }
}`,
    },
    {
      title: 'Real-time Stats Collection',
      description: 'Collect detailed stats with history tracking',
      code: `import { ref, onUnmounted } from 'vue'

const statsHistory = ref<CallQualityStats[]>([])
const currentStats = ref<CallQualityStats | null>(null)
const isCollecting = ref(false)

let collectionInterval: number | null = null
let previousStats: RTCStatsReport | null = null

const collectStats = async (pc: RTCPeerConnection) => {
  const stats = await pc.getStats()
  const result: Partial<CallQualityStats> = {
    audio: { inbound: {}, outbound: {}, level: {} },
    connection: {},
    quality: {}
  }

  stats.forEach(report => {
    // Inbound RTP (receiving)
    if (report.type === 'inbound-rtp') {
      if (report.kind === 'audio') {
        result.audio!.inbound = {
          packetsReceived: report.packetsReceived,
          packetsLost: report.packetsLost,
          jitter: report.jitter * 1000,
          bytesReceived: report.bytesReceived,
          codec: report.codecId,
          clockRate: 0 // Lookup from codec report
        }
      } else if (report.kind === 'video') {
        result.video = {
          inbound: {
            width: report.frameWidth,
            height: report.frameHeight,
            framesReceived: report.framesReceived,
            framesDropped: report.framesDropped,
            framesPerSecond: report.framesPerSecond
          },
          outbound: {}
        }
      }
    }

    // Outbound RTP (sending)
    if (report.type === 'outbound-rtp') {
      if (report.kind === 'audio') {
        result.audio!.outbound = {
          packetsSent: report.packetsSent,
          bytesSent: report.bytesSent,
          codec: report.codecId
        }
      }
    }

    // Connection quality
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      result.connection = {
        rtt: (report.currentRoundTripTime || 0) * 1000,
        localCandidateType: '',
        remoteCandidateType: '',
        protocol: 'udp',
        relayed: false
      }
    }
  })

  // Calculate quality score
  const audio = result.audio!.inbound
  const lossRate = audio.packetsReceived > 0
    ? audio.packetsLost / (audio.packetsLost + audio.packetsReceived)
    : 0

  result.quality = calculateQualityScore(
    result.connection!.rtt,
    audio.jitter,
    lossRate * 100
  )

  currentStats.value = result as CallQualityStats
  statsHistory.value.push(currentStats.value)
  previousStats = stats
}

const startCollection = (pc: RTCPeerConnection, intervalMs = 1000) => {
  isCollecting.value = true
  collectionInterval = window.setInterval(() => {
    collectStats(pc)
  }, intervalMs)
}

const stopCollection = () => {
  if (collectionInterval) {
    clearInterval(collectionInterval)
    collectionInterval = null
  }
  isCollecting.value = false
}

onUnmounted(stopCollection)`,
    },
    {
      title: 'Quality Score Calculation',
      description: 'Calculate MOS and quality labels',
      code: `interface QualityScore {
  mos: number
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor'
  details: {
    latencyImpact: number
    jitterImpact: number
    lossImpact: number
  }
}

const calculateQualityScore = (
  rtt: number,
  jitter: number,
  packetLoss: number
): QualityScore => {
  // Start with perfect score
  let score = 100
  const details = { latencyImpact: 0, jitterImpact: 0, lossImpact: 0 }

  // Latency penalties (one-way = RTT/2)
  const latency = rtt / 2
  if (latency > 400) {
    details.latencyImpact = 40
  } else if (latency > 300) {
    details.latencyImpact = 30
  } else if (latency > 200) {
    details.latencyImpact = 20
  } else if (latency > 150) {
    details.latencyImpact = 10
  } else if (latency > 100) {
    details.latencyImpact = 5
  }
  score -= details.latencyImpact

  // Jitter penalties
  if (jitter > 100) {
    details.jitterImpact = 25
  } else if (jitter > 50) {
    details.jitterImpact = 15
  } else if (jitter > 30) {
    details.jitterImpact = 10
  } else if (jitter > 20) {
    details.jitterImpact = 5
  }
  score -= details.jitterImpact

  // Packet loss penalties (most severe)
  if (packetLoss > 10) {
    details.lossImpact = 50
  } else if (packetLoss > 5) {
    details.lossImpact = 35
  } else if (packetLoss > 2) {
    details.lossImpact = 20
  } else if (packetLoss > 1) {
    details.lossImpact = 10
  } else if (packetLoss > 0.5) {
    details.lossImpact = 5
  }
  score -= details.lossImpact

  score = Math.max(0, Math.min(100, score))

  // Convert to MOS (1-5 scale)
  const mos = 1 + (score / 100) * 4

  // Determine label
  let label: QualityScore['label']
  if (score >= 80) label = 'Excellent'
  else if (score >= 60) label = 'Good'
  else if (score >= 40) label = 'Fair'
  else label = 'Poor'

  return { mos: Math.round(mos * 10) / 10, score, label, details }
}`,
    },
    {
      title: 'Audio Level Monitoring',
      description: 'Track real-time audio levels',
      code: `class AudioLevelMonitor {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private animationFrame: number | null = null
  private onLevelChange: (level: number) => void

  constructor(onLevelChange: (level: number) => void) {
    this.onLevelChange = onLevelChange
  }

  start(stream: MediaStream) {
    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 256

    const source = this.audioContext.createMediaStreamSource(stream)
    source.connect(this.analyser)

    this.monitor()
  }

  private monitor() {
    if (!this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(dataArray)

    // Calculate RMS level
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)

    // Normalize to 0-1
    const level = Math.min(1, rms / 128)

    this.onLevelChange(level)
    this.animationFrame = requestAnimationFrame(() => this.monitor())
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    this.audioContext?.close()
    this.audioContext = null
    this.analyser = null
  }
}

// Usage
const inputLevel = ref(0)
const outputLevel = ref(0)

const inputMonitor = new AudioLevelMonitor((level) => {
  inputLevel.value = level
})

const outputMonitor = new AudioLevelMonitor((level) => {
  outputLevel.value = level
})

// Start monitoring local and remote streams
inputMonitor.start(localStream)
outputMonitor.start(remoteStream)`,
    },
    {
      title: 'Quality Alerts',
      description: 'Detect and alert on quality degradation',
      code: `interface QualityThresholds {
  latency: { warning: number; critical: number }
  jitter: { warning: number; critical: number }
  packetLoss: { warning: number; critical: number }
  mos: { warning: number; critical: number }
}

const defaultThresholds: QualityThresholds = {
  latency: { warning: 200, critical: 400 },
  jitter: { warning: 30, critical: 100 },
  packetLoss: { warning: 2, critical: 5 },
  mos: { warning: 3.5, critical: 2.5 }
}

interface QualityAlert {
  type: 'warning' | 'critical'
  metric: keyof QualityThresholds
  value: number
  threshold: number
  message: string
  timestamp: Date
}

const activeAlerts = ref<QualityAlert[]>([])

const checkQualityThresholds = (
  stats: CallQualityStats,
  thresholds = defaultThresholds
) => {
  const alerts: QualityAlert[] = []

  // Check latency
  const latency = stats.connection.rtt / 2
  if (latency >= thresholds.latency.critical) {
    alerts.push({
      type: 'critical',
      metric: 'latency',
      value: latency,
      threshold: thresholds.latency.critical,
      message: \`High latency: \${Math.round(latency)}ms\`,
      timestamp: new Date()
    })
  } else if (latency >= thresholds.latency.warning) {
    alerts.push({
      type: 'warning',
      metric: 'latency',
      value: latency,
      threshold: thresholds.latency.warning,
      message: \`Elevated latency: \${Math.round(latency)}ms\`,
      timestamp: new Date()
    })
  }

  // Check jitter
  const jitter = stats.audio.inbound.jitter
  if (jitter >= thresholds.jitter.critical) {
    alerts.push({
      type: 'critical',
      metric: 'jitter',
      value: jitter,
      threshold: thresholds.jitter.critical,
      message: \`Severe jitter: \${Math.round(jitter)}ms\`,
      timestamp: new Date()
    })
  }

  // Check packet loss
  const lossPercent = stats.audio.inbound.packetsLost /
    (stats.audio.inbound.packetsReceived + stats.audio.inbound.packetsLost) * 100
  if (lossPercent >= thresholds.packetLoss.critical) {
    alerts.push({
      type: 'critical',
      metric: 'packetLoss',
      value: lossPercent,
      threshold: thresholds.packetLoss.critical,
      message: \`High packet loss: \${lossPercent.toFixed(1)}%\`,
      timestamp: new Date()
    })
  }

  activeAlerts.value = alerts
  return alerts
}`,
    },
    {
      title: 'Quality Metrics Dashboard',
      description: 'Visual display of call quality metrics',
      code: `<template>
  <div class="quality-dashboard">
    <!-- Overall Quality -->
    <div class="quality-overview" :class="quality.label.toLowerCase()">
      <div class="mos-display">
        <span class="mos-value">{{ quality.mos }}</span>
        <span class="mos-label">MOS</span>
      </div>
      <div class="quality-label">{{ quality.label }}</div>
      <div class="quality-bar">
        <div
          class="quality-fill"
          :style="{ width: \`\${quality.score}%\` }"
        ></div>
      </div>
    </div>

    <!-- Individual Metrics -->
    <div class="metrics-grid">
      <div class="metric" :class="getMetricClass('latency')">
        <span class="metric-icon">⏱️</span>
        <span class="metric-label">Latency</span>
        <span class="metric-value">{{ stats?.connection.rtt || 0 }}ms</span>
      </div>

      <div class="metric" :class="getMetricClass('jitter')">
        <span class="metric-icon">📊</span>
        <span class="metric-label">Jitter</span>
        <span class="metric-value">
          {{ Math.round(stats?.audio.inbound.jitter || 0) }}ms
        </span>
      </div>

      <div class="metric" :class="getMetricClass('packetLoss')">
        <span class="metric-icon">📦</span>
        <span class="metric-label">Packet Loss</span>
        <span class="metric-value">{{ packetLossPercent }}%</span>
      </div>

      <div class="metric">
        <span class="metric-icon">🔊</span>
        <span class="metric-label">Codec</span>
        <span class="metric-value">{{ codec }}</span>
      </div>
    </div>

    <!-- Audio Levels -->
    <div class="audio-levels">
      <div class="level-bar">
        <label>🎤 Input</label>
        <div class="bar-track">
          <div
            class="bar-fill input"
            :style="{ width: \`\${inputLevel * 100}%\` }"
          ></div>
        </div>
      </div>
      <div class="level-bar">
        <label>🔈 Output</label>
        <div class="bar-track">
          <div
            class="bar-fill output"
            :style="{ width: \`\${outputLevel * 100}%\` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Active Alerts -->
    <div v-if="activeAlerts.length > 0" class="alerts">
      <div
        v-for="alert in activeAlerts"
        :key="alert.metric"
        class="alert"
        :class="alert.type"
      >
        {{ alert.message }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.quality-overview.excellent { background: #22c55e; }
.quality-overview.good { background: #84cc16; }
.quality-overview.fair { background: #eab308; }
.quality-overview.poor { background: #ef4444; }

.metric.warning { color: #eab308; }
.metric.critical { color: #ef4444; }

.alert.warning { background: #fef3c7; border-left: 4px solid #eab308; }
.alert.critical { background: #fee2e2; border-left: 4px solid #ef4444; }
</style>`,
    },
    {
      title: 'Quality History Graph',
      description: 'Visualize quality trends over time',
      code: `import { ref, computed, watch } from 'vue'

interface DataPoint {
  timestamp: number
  mos: number
  latency: number
  jitter: number
  packetLoss: number
}

const historyData = ref<DataPoint[]>([])
const maxDataPoints = 60 // 1 minute at 1 point/second

const addDataPoint = (stats: CallQualityStats) => {
  historyData.value.push({
    timestamp: Date.now(),
    mos: stats.quality.mos,
    latency: stats.connection.rtt / 2,
    jitter: stats.audio.inbound.jitter,
    packetLoss: calculatePacketLossPercent(stats)
  })

  // Trim old data
  if (historyData.value.length > maxDataPoints) {
    historyData.value.shift()
  }
}

// Generate SVG path for line graph
const generatePath = (
  data: number[],
  width: number,
  height: number,
  minVal: number,
  maxVal: number
): string => {
  if (data.length < 2) return ''

  const xStep = width / (data.length - 1)
  const range = maxVal - minVal || 1

  const points = data.map((val, i) => {
    const x = i * xStep
    const y = height - ((val - minVal) / range) * height
    return \`\${x},\${y}\`
  })

  return 'M' + points.join(' L')
}

const mosPath = computed(() => {
  const mosValues = historyData.value.map(d => d.mos)
  return generatePath(mosValues, 300, 100, 1, 5)
})

const latencyPath = computed(() => {
  const values = historyData.value.map(d => d.latency)
  const max = Math.max(...values, 200)
  return generatePath(values, 300, 100, 0, max)
})

// Stats summary
const averageStats = computed(() => {
  if (historyData.value.length === 0) return null

  const sum = historyData.value.reduce((acc, d) => ({
    mos: acc.mos + d.mos,
    latency: acc.latency + d.latency,
    jitter: acc.jitter + d.jitter,
    packetLoss: acc.packetLoss + d.packetLoss
  }), { mos: 0, latency: 0, jitter: 0, packetLoss: 0 })

  const count = historyData.value.length
  return {
    mos: (sum.mos / count).toFixed(1),
    latency: Math.round(sum.latency / count),
    jitter: Math.round(sum.jitter / count),
    packetLoss: (sum.packetLoss / count).toFixed(1)
  }
})`,
    },
  ],
}
