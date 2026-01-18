import type { ExampleDefinition } from './types'
import ClickToCallWidgetDemo from '../demos/ClickToCallWidgetDemo.vue'

export const clickToCallWidgetExample: ExampleDefinition = {
  id: 'click-to-call-widget',
  icon: '📱',
  title: 'Click-to-Call Widget',
  description: 'Embed a compact click-to-call dialer with mock or real SIP',
  category: 'sip',
  tags: ['Click-to-Call', 'Widget', 'SIP', 'WebRTC'],
  component: ClickToCallWidgetDemo,
  setupGuide:
    '<p>Use <code>useClickToCall</code> for a drop-in widget that supports mock mode and real SIP/WebRTC. Configure SIP on the right to try it live.</p>',
  codeSnippets: [
    {
      title: 'Basic Setup',
      description: 'Initialize in mock mode with a default number',
      code: `import { useClickToCall } from 'vuesip'

const { call, hangup, answer, callState, callDuration, remoteNumber, cssVars } = useClickToCall({
  mockMode: true,
  defaultNumber: '+15551234567',
})

await call()`,
    },
    {
      title: 'Real SIP Mode',
      description: 'Enable SIP/WebRTC by providing sipConfig and setting mockMode to false',
      code: `const ctc = useClickToCall({
  mockMode: false,
  sipConfig: {
    wsUri: 'wss://sip.example.com',
    sipUri: 'sip:user@example.com',
    password: 'secret',
  },
})

await ctc.call('+15551234567')`,
    },
  ],
}
