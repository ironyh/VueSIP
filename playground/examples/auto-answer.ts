import type { ExampleDefinition } from './types'
import AutoAnswerDemo from '../demos/AutoAnswerDemo.vue'

export const autoAnswerExample: ExampleDefinition = {
  id: 'auto-answer',
  icon: '📞',
  title: 'Auto Answer',
  description: 'Automatically answer incoming calls with configurable rules',
  tags: ['Automation', 'Calls', 'Intercom'],
  component: AutoAnswerDemo,
  setupGuide: '<p>Configure automatic call answering for specific scenarios like intercom calls, trusted callers, or specific queues.</p>',
  codeSnippets: [
    {
      title: 'Configure Auto Answer',
      description: 'Set up automatic answer rules',
      code: `import { useAutoAnswer } from 'vuesip'

const autoAnswer = useAutoAnswer(sipClientRef, {
  enabled: true,
  delay: 500, // ms before answering
  onAutoAnswered: (session) => {
    console.log('Auto-answered call from:', session.remoteUri)
  },
})

// Enable auto-answer for intercom calls
autoAnswer.addRule({
  name: 'Intercom',
  match: (session) => {
    return session.headers['Alert-Info']?.includes('auto-answer')
  },
  delay: 0,
})

// Auto-answer calls from specific extensions
autoAnswer.addRule({
  name: 'Trusted Extensions',
  match: (session) => {
    const trustedList = ['1001', '1002', '1003']
    return trustedList.some(ext => session.remoteUri.includes(ext))
  },
  delay: 1000,
})`,
    },
    {
      title: 'Manage Auto Answer Rules',
      description: 'Enable, disable, and query rules',
      code: `// Toggle auto-answer globally
autoAnswer.setEnabled(true)
autoAnswer.setEnabled(false)

// Check if auto-answer is active
console.log('Auto-answer enabled:', autoAnswer.isEnabled.value)

// List all rules
const rules = autoAnswer.rules.value
rules.forEach(rule => {
  console.log('Rule:', rule.name, 'Active:', rule.enabled)
})

// Remove a rule
autoAnswer.removeRule('Intercom')`,
    },
  ],
}
