import type { ExampleDefinition } from './types'
import WebRTCStatsDemo from '../demos/WebRTCStatsDemo.vue'

export const webrtcStatsExample: ExampleDefinition = {
  id: 'webrtc-stats',
  icon: '📊',
  title: 'WebRTC Stats',
  description: 'Real-time call quality metrics and MOS scores',
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
  ],
}
