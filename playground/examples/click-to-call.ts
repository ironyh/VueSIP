import type { ExampleDefinition } from './types'
import ClickToCallDemo from '../demos/ClickToCallDemo.vue'

export const clickToCallExample: ExampleDefinition = {
  id: 'click-to-call',
  icon: '👆',
  title: 'AMI Click-to-Call (Agent-First)',
  description: 'Originate calls via AMI: your phone rings first, then the destination',
  category: 'ami',
  tags: ['AMI', 'Agent-First', 'Click-to-Call', 'CRM'],
  component: ClickToCallDemo,
  setupGuide:
    '<p>Agent-first click-to-call via Asterisk AMI. Your desk phone or softphone rings first; when answered, the PBX dials the destination. Great for CRMs and call centers. For a browser-based SIP widget, see the "Click-to-Call Widget" example under SIP.</p>',
  codeSnippets: [
    {
      title: 'Click-to-Call Setup',
      description: 'Initialize click-to-call handler',
      code: `import { useClickToCall } from 'vuesip'

const clickToCall = useClickToCall(sipClientRef, {
  selector: '[data-phone], a[href^="tel:"]',
  onCallStart: (number) => {
    console.log('Calling:', number)
  },
})

// Enable click-to-call on the page
clickToCall.enable()`,
    },
    {
      title: 'Programmatic Call',
      description: 'Trigger call programmatically',
      code: `// Call a number directly
await clickToCall.call('+1-555-123-4567')

// Call with caller ID
await clickToCall.call('1001', {
  callerId: 'Sales Team',
  headers: { 'X-CRM-Contact': 'contact-123' },
})

// Disable click-to-call
clickToCall.disable()`,
    },
  ],
}
