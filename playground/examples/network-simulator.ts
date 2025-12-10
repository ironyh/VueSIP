import type { ExampleDefinition } from './types'
import NetworkSimulatorDemo from '../demos/NetworkSimulatorDemo.vue'

export const networkSimulatorExample: ExampleDefinition = {
  id: 'network-simulator',
  icon: '📡',
  title: 'Network Simulator',
  description: 'Simulate network conditions',
  category: 'utility',
  tags: ['Debug', 'Testing', 'Advanced'],
  component: NetworkSimulatorDemo,
  setupGuide: '<p>Test your application under various network conditions. Simulate latency, packet loss, jitter, and bandwidth constraints to see how your calls perform.</p>',
  codeSnippets: [
    {
      title: 'Network Condition Profiles',
      description: 'Pre-defined network profiles',
      code: `interface NetworkProfile {
  name: string
  latency: number     // ms
  packetLoss: number  // %
  jitter: number      // ms
  bandwidth: number   // kbps
}

const profiles: NetworkProfile[] = [
  {
    name: 'Excellent',
    latency: 20,
    packetLoss: 0,
    jitter: 5,
    bandwidth: 10000
  },
  {
    name: '4G Mobile',
    latency: 100,
    packetLoss: 2,
    jitter: 25,
    bandwidth: 500
  },
  {
    name: 'Poor WiFi',
    latency: 300,
    packetLoss: 10,
    jitter: 100,
    bandwidth: 256
  }
]

const applyProfile = (profile: NetworkProfile) => {
  console.log(\`Simulating: \${profile.name}\`)
  // Apply settings to connection
}`,
    },
    {
      title: 'Quality Metrics',
      description: 'Calculate call quality score',
      code: `const calculateQuality = (
  latency: number,
  packetLoss: number,
  jitter: number
): string => {
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
}`,
    },
    {
      title: 'Extended Network Profiles',
      description: 'Real-world network condition presets',
      code: `const extendedProfiles: NetworkProfile[] = [
  // Excellent conditions
  {
    name: 'Fiber/LAN',
    latency: 5,
    packetLoss: 0,
    jitter: 1,
    bandwidth: 100000,
    description: 'Ideal conditions - office or fiber connection'
  },
  {
    name: 'Cable Internet',
    latency: 25,
    packetLoss: 0.1,
    jitter: 10,
    bandwidth: 50000,
    description: 'Typical home cable connection'
  },
  // Mobile networks
  {
    name: '5G Mobile',
    latency: 30,
    packetLoss: 0.5,
    jitter: 15,
    bandwidth: 10000,
    description: '5G mobile network'
  },
  {
    name: '4G/LTE',
    latency: 80,
    packetLoss: 1,
    jitter: 30,
    bandwidth: 2000,
    description: 'Standard 4G connection'
  },
  {
    name: '3G',
    latency: 200,
    packetLoss: 3,
    jitter: 80,
    bandwidth: 500,
    description: 'Older 3G mobile network'
  },
  // Problematic conditions
  {
    name: 'Congested Network',
    latency: 150,
    packetLoss: 5,
    jitter: 100,
    bandwidth: 256,
    description: 'Heavily loaded network'
  },
  {
    name: 'Poor WiFi',
    latency: 100,
    packetLoss: 8,
    jitter: 150,
    bandwidth: 512,
    description: 'Weak WiFi signal or interference'
  },
  {
    name: 'Satellite',
    latency: 600,
    packetLoss: 2,
    jitter: 50,
    bandwidth: 1000,
    description: 'High latency satellite connection'
  },
  // Edge cases
  {
    name: 'Airplane Mode Transition',
    latency: 1000,
    packetLoss: 50,
    jitter: 500,
    bandwidth: 100,
    description: 'Connection dropping in/out'
  }
]`,
    },
    {
      title: 'Dynamic Network Simulation',
      description: 'Simulate changing network conditions over time',
      code: `interface NetworkEvent {
  time: number  // seconds from start
  profile: NetworkProfile
  duration: number  // how long this condition lasts
}

const networkScenarios = {
  mobileCommute: [
    { time: 0, profile: profiles['4G/LTE'], duration: 30 },
    { time: 30, profile: profiles['3G'], duration: 10 },
    { time: 40, profile: profiles['Poor WiFi'], duration: 5 },
    { time: 45, profile: profiles['Fiber/LAN'], duration: 60 }
  ],

  wifiDropout: [
    { time: 0, profile: profiles['Cable Internet'], duration: 20 },
    { time: 20, profile: profiles['Poor WiFi'], duration: 5 },
    { time: 25, profile: profiles['Airplane Mode Transition'], duration: 3 },
    { time: 28, profile: profiles['Cable Internet'], duration: 30 }
  ]
}

class NetworkSimulator {
  private timeline: NetworkEvent[] = []
  private startTime: number = 0
  private intervalId: number | null = null
  private onConditionChange: (profile: NetworkProfile) => void

  constructor(onConditionChange: (profile: NetworkProfile) => void) {
    this.onConditionChange = onConditionChange
  }

  loadScenario(events: NetworkEvent[]) {
    this.timeline = [...events].sort((a, b) => a.time - b.time)
  }

  start() {
    this.startTime = Date.now()
    this.intervalId = window.setInterval(() => this.tick(), 1000)
    this.tick() // Initial state
  }

  private tick() {
    const elapsed = (Date.now() - this.startTime) / 1000

    // Find current condition
    const currentEvent = this.timeline
      .filter(e => e.time <= elapsed)
      .pop()

    if (currentEvent) {
      this.onConditionChange(currentEvent.profile)
    }
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
      title: 'WebRTC Connection Simulation',
      description: 'Apply network conditions to WebRTC connection',
      code: `// Note: True network simulation requires server-side support
// This demonstrates client-side quality adaptation

class WebRTCNetworkSimulator {
  private pc: RTCPeerConnection
  private originalBitrate: number | null = null

  constructor(peerConnection: RTCPeerConnection) {
    this.pc = peerConnection
  }

  async applyBandwidthLimit(kbps: number) {
    const senders = this.pc.getSenders()

    for (const sender of senders) {
      if (sender.track?.kind === 'video') {
        const params = sender.getParameters()

        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}]
        }

        params.encodings[0].maxBitrate = kbps * 1000

        await sender.setParameters(params)
      }
    }
  }

  async simulatePacketLoss(percentage: number) {
    // Packet loss simulation would require server-side relay
    // Here we track what the impact would be
    console.log(\`Simulating \${percentage}% packet loss\`)

    // Trigger quality degradation handling
    if (percentage > 5) {
      await this.applyBandwidthLimit(256) // Force low bitrate
    }
  }

  async restoreNormalConditions() {
    const senders = this.pc.getSenders()

    for (const sender of senders) {
      const params = sender.getParameters()
      if (params.encodings?.[0]) {
        delete params.encodings[0].maxBitrate
        await sender.setParameters(params)
      }
    }
  }
}`,
    },
    {
      title: 'MOS Score Calculator',
      description: 'Calculate Mean Opinion Score for call quality',
      code: `// ITU-T G.107 E-model simplified implementation
const calculateMOS = (
  latency: number,      // one-way delay in ms
  jitter: number,       // jitter in ms
  packetLoss: number,   // packet loss percentage
  codec: 'G711' | 'G729' | 'OPUS' = 'OPUS'
): number => {
  // Base R-factor for codec
  const codecFactors = {
    G711: 93.2,  // Uncompressed, highest quality
    G729: 82.0,  // Compressed, lower quality baseline
    OPUS: 91.0   // Modern, adaptive codec
  }

  let R = codecFactors[codec]

  // Delay impairment (Id)
  const effectiveDelay = latency + jitter
  if (effectiveDelay > 177.3) {
    const Id = 0.024 * effectiveDelay +
               0.11 * (effectiveDelay - 177.3) *
               Math.sign(effectiveDelay - 177.3)
    R -= Id
  }

  // Packet loss impairment (Ie)
  // Simplified - actual formula is more complex
  const Ie = 30 * Math.log(1 + 15 * packetLoss)
  R -= Ie

  // Clamp R to valid range
  R = Math.max(0, Math.min(100, R))

  // Convert R-factor to MOS (1-5 scale)
  if (R < 6.5) return 1.0
  if (R > 100) return 4.5

  const MOS = 1 + 0.035 * R +
              R * (R - 60) * (100 - R) * 7e-6

  return Math.round(MOS * 10) / 10
}

// Quality labels
const getMOSLabel = (mos: number): string => {
  if (mos >= 4.3) return 'Excellent'
  if (mos >= 4.0) return 'Good'
  if (mos >= 3.6) return 'Fair'
  if (mos >= 3.1) return 'Poor'
  return 'Bad'
}

// Example usage
const metrics = { latency: 80, jitter: 20, packetLoss: 1 }
const mos = calculateMOS(metrics.latency, metrics.jitter, metrics.packetLoss)
console.log(\`MOS: \${mos} (\${getMOSLabel(mos)})\`)`,
    },
    {
      title: 'Network Simulator UI',
      description: 'Interactive network condition controls',
      code: `<template>
  <div class="network-simulator">
    <h3>Network Simulator</h3>

    <!-- Profile Selector -->
    <div class="profile-selector">
      <button
        v-for="profile in profiles"
        :key="profile.name"
        @click="selectProfile(profile)"
        :class="{ active: selectedProfile?.name === profile.name }"
      >
        {{ profile.name }}
      </button>
    </div>

    <!-- Custom Sliders -->
    <div class="custom-controls">
      <div class="slider-group">
        <label>
          Latency: {{ customSettings.latency }}ms
          <input
            type="range"
            v-model.number="customSettings.latency"
            min="0"
            max="1000"
            step="10"
          />
        </label>
      </div>

      <div class="slider-group">
        <label>
          Packet Loss: {{ customSettings.packetLoss }}%
          <input
            type="range"
            v-model.number="customSettings.packetLoss"
            min="0"
            max="50"
            step="1"
          />
        </label>
      </div>

      <div class="slider-group">
        <label>
          Jitter: {{ customSettings.jitter }}ms
          <input
            type="range"
            v-model.number="customSettings.jitter"
            min="0"
            max="200"
            step="5"
          />
        </label>
      </div>

      <div class="slider-group">
        <label>
          Bandwidth: {{ customSettings.bandwidth }}kbps
          <input
            type="range"
            v-model.number="customSettings.bandwidth"
            min="64"
            max="10000"
            step="64"
          />
        </label>
      </div>
    </div>

    <!-- Quality Preview -->
    <div class="quality-preview">
      <div class="mos-score" :class="mosClass">
        <span class="score">{{ mos }}</span>
        <span class="label">{{ mosLabel }}</span>
      </div>
      <div class="quality-bar">
        <div
          class="quality-fill"
          :style="{ width: \`\${(mos / 5) * 100}%\` }"
        ></div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button @click="applySettings" class="apply-btn">
        Apply Conditions
      </button>
      <button @click="resetToNormal" class="reset-btn">
        Reset to Normal
      </button>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Network Quality Monitoring',
      description: 'Real-time network condition tracking',
      code: `import { ref, computed, onMounted, onUnmounted } from 'vue'

interface NetworkMetrics {
  timestamp: number
  latency: number
  jitter: number
  packetLoss: number
  bandwidth: number
  mos: number
}

const metricsHistory = ref<NetworkMetrics[]>([])
const maxHistoryLength = 60 // 1 minute of data at 1s intervals

const currentMetrics = ref<NetworkMetrics | null>(null)

const collectMetrics = async (pc: RTCPeerConnection) => {
  const stats = await pc.getStats()
  let latency = 0
  let jitter = 0
  let packetsLost = 0
  let packetsReceived = 0
  let bytesReceived = 0

  stats.forEach(report => {
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      latency = (report.currentRoundTripTime || 0) * 1000
    }

    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      jitter = (report.jitter || 0) * 1000
      packetsLost = report.packetsLost || 0
      packetsReceived = report.packetsReceived || 0
    }

    if (report.type === 'inbound-rtp') {
      bytesReceived = report.bytesReceived || 0
    }
  })

  const packetLoss = packetsReceived > 0
    ? (packetsLost / (packetsLost + packetsReceived)) * 100
    : 0

  const metrics: NetworkMetrics = {
    timestamp: Date.now(),
    latency: Math.round(latency),
    jitter: Math.round(jitter),
    packetLoss: Math.round(packetLoss * 10) / 10,
    bandwidth: Math.round(bytesReceived * 8 / 1000), // kbps estimate
    mos: calculateMOS(latency / 2, jitter, packetLoss)
  }

  currentMetrics.value = metrics
  metricsHistory.value.push(metrics)

  // Trim history
  if (metricsHistory.value.length > maxHistoryLength) {
    metricsHistory.value.shift()
  }

  return metrics
}

// Average metrics over time
const averageMetrics = computed(() => {
  if (metricsHistory.value.length === 0) return null

  const sum = metricsHistory.value.reduce((acc, m) => ({
    latency: acc.latency + m.latency,
    jitter: acc.jitter + m.jitter,
    packetLoss: acc.packetLoss + m.packetLoss,
    mos: acc.mos + m.mos
  }), { latency: 0, jitter: 0, packetLoss: 0, mos: 0 })

  const count = metricsHistory.value.length
  return {
    latency: Math.round(sum.latency / count),
    jitter: Math.round(sum.jitter / count),
    packetLoss: Math.round(sum.packetLoss / count * 10) / 10,
    mos: Math.round(sum.mos / count * 10) / 10
  }
})`,
    },
  ],
}
