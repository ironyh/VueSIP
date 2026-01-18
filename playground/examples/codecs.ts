import type { ExampleDefinition } from './types'
import CodecsDemo from '../components/CodecsDemo.vue'

export const codecsExample: ExampleDefinition = {
  id: 'codecs',
  title: 'Codec Policy & Negotiation',
  description:
    'Choose preferred codecs with Auto option; see capabilities and copy code snippets for config and per-call overrides.',
  tags: ['codecs', 'webrtc', 'interop', 'policy'],
  category: 'utility',
  component: CodecsDemo,
  codeSnippets: [
    {
      title: 'Global codec policy (config)',
      description: 'Add codecPolicy to your SipClient configuration.',
      code: `import type { CodecPolicy } from 'vuesip'

const codecPolicy: CodecPolicy = {
  preferTransceiverApi: true,
  allowLegacyFallbacks: true,
  audio: [ { id: 'opus', priority: 100 }, { id: 'pcmu', priority: 50 } ],
  video: [ { id: 'vp8', priority: 100 }, { id: 'h264', priority: 70 } ]
}

await adapter.initialize({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: 'secret',
  codecPolicy
})`,
    },
    {
      title: 'Per-call override',
      description: 'Override policy for a specific call.',
      code: `await adapter.call('sip:2000@example.com', {
  codecPolicy: { audio: [{ id: 'pcmu', priority: 100 }], video: [{ id: 'h264', priority: 100 }] }
})`,
    },
  ],
  setupGuide: `<p>Use the controls to set your preferred codecs. The policy persists in local storage and applies across demos. When your PBX has specific requirements (e.g., H264 baseline or PCMU), enable legacy fallbacks and prioritize accordingly.</p>`,
}
