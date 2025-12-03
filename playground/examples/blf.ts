import type { ExampleDefinition } from './types'
import BLFDemo from '../demos/BLFDemo.vue'

export const blfExample: ExampleDefinition = {
  id: 'blf',
  icon: '💡',
  title: 'BLF (Busy Lamp Field)',
  description: 'Monitor extension status in real-time',
  tags: ['Advanced', 'Presence', 'Monitoring'],
  component: BLFDemo,
  setupGuide: '<p>BLF allows you to monitor the status of other extensions. Subscribe to extensions to see their real-time state (idle, ringing, in-call).</p>',
  codeSnippets: [
    {
      title: 'Subscribe to Extension Status',
      description: 'Monitor a single extension state',
      code: `import { useDialog } from 'vuesip'

const { subscribe, getStatus } = useDialog(sipClientRef)

// Subscribe to an extension
await subscribe('sip:1001@pbx.example.com')

// Get current status
const status = getStatus('sip:1001@pbx.example.com')
console.log('Extension status:', status?.state)`,
    },
    {
      title: 'Monitor Multiple Extensions',
      description: 'Subscribe to multiple extensions at once',
      code: `const { subscribeMany, watchedExtensions } = useDialog(sipClientRef)

// Subscribe to multiple extensions
const extensions = [
  'sip:1001@pbx.example.com',
  'sip:1002@pbx.example.com',
  'sip:1003@pbx.example.com',
]
await subscribeMany(extensions)

// Access all statuses reactively
watchedExtensions.value.forEach((status, uri) => {
  console.log('Extension:', uri, 'State:', status.state)
})`,
    },
    {
      title: 'React to State Changes',
      description: 'Listen for extension state change events',
      code: `const { onDialogEvent } = useDialog(sipClientRef)

// Listen for state changes
onDialogEvent((event) => {
  console.log('Extension changed:', event.uri, 'to', event.status.state)

  if (event.status.state === 'ringing') {
    // Show visual indicator for ringing extension
  }
})`,
    },
  ],
}
