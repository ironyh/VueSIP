import type { ExampleDefinition } from './types'
import ClickToCallDemo from '../demos/ClickToCallDemo.vue'

export const clickToCallExample: ExampleDefinition = {
  id: 'click-to-call',
  icon: '👆',
  title: 'Click-to-Call',
  description: 'Initiate calls by clicking phone numbers on web pages',
  category: 'utility',
  tags: ['Integration', 'Click-to-Call', 'CRM'],
  component: ClickToCallDemo,
  setupGuide: '<p>Enable click-to-call functionality for phone numbers in your application. Integrates with CRM and contact management systems.</p>',
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
