import type { ExampleDefinition } from './types'
import CodecPolicyDemo from '../demos/CodecPolicyDemo.vue'

export const codecPolicyExample: ExampleDefinition = {
  id: 'codec-policy',
  icon: '🎛️',
  title: 'Codec Policy (Audio)',
  description: 'Inspect local audio codecs and toggle Opus-first vs G.711-first',
  category: 'utility',
  tags: ['Codecs', 'WebRTC', 'Audio'],
  component: CodecPolicyDemo,
  setupGuide:
    '<p>Displays local audio codec capabilities via RTCRtpSender.getCapabilities and lets you toggle ordering policy. In browsers without setCodecPreferences, use the SDP transformer fallback.</p>',
  codeSnippets: [
    {
      title: 'Basic Usage',
      description: 'Prefer Opus with G.711 fallbacks',
      code: `import { useCodecs, DefaultSdpTransformer } from 'vuesip'

const transformer = new DefaultSdpTransformer()
const { policy, getLocalCapabilities, applyToTransceiver } = useCodecs(undefined, transformer)

policy.value = {
  ...policy.value,
  audio: [
    { id: 'opus', priority: 100 },
    { id: 'pcmu', priority: 60 },
    { id: 'pcma', priority: 55 }
  ]
}

// Use applyToTransceiver when available
pc.getTransceivers().forEach(t => {
  if (t.sender.track?.kind === 'audio' || t.receiver.track?.kind === 'audio') {
    applyToTransceiver(t, 'audio')
  }
})`,
    },
    {
      title: 'G.711 First Policy',
      description: 'Interoperability with legacy PBXs',
      code: `policy.value = {
  ...policy.value,
  audio: [
    { id: 'pcmu', priority: 100 },
    { id: 'pcma', priority: 95 },
    { id: 'opus', priority: 60 }
  ]
}`,
    },
  ],
}
