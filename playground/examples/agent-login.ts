import type { ExampleDefinition } from './types'
import AgentLoginDemo from '../demos/AgentLoginDemo.vue'

export const agentLoginExample: ExampleDefinition = {
  id: 'agent-login',
  icon: '🎧',
  title: 'Agent Login',
  description: 'Queue agent login, logout, and status management',
  tags: ['Call Center', 'Queues', 'Agent'],
  component: AgentLoginDemo,
  setupGuide: '<p>Manage call center agent sessions. Login to queues, set availability status, and handle queue membership.</p>',
  codeSnippets: [
    {
      title: 'Agent Login/Logout',
      description: 'Login and logout from queues',
      code: `import { useAgentLogin } from 'vuesip'

const agent = useAgentLogin(amiClientRef, {
  agentId: 'Agent/1001',
  interface: 'PJSIP/1001',
  onStatusChange: (status, session) => {
    console.log('Agent status:', status)
  },
})

// Login to a queue
await agent.login('sales-queue')

// Logout from queue
await agent.logout('sales-queue')`,
    },
    {
      title: 'Manage Agent Status',
      description: 'Set pause status and availability',
      code: `// Pause agent (break time)
await agent.pause('sales-queue', 'Break')

// Unpause agent
await agent.unpause('sales-queue')

// Check agent status
console.log('Is logged in:', agent.isLoggedIn.value)
console.log('Is paused:', agent.isPaused.value)
console.log('Current queues:', agent.queues.value)`,
    },
  ],
}
