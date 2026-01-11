import type { ExampleDefinition } from './types'
import AgentLoginDemo from '../demos/AgentLoginDemo.vue'

export const agentLoginExample: ExampleDefinition = {
  id: 'agent-login',
  icon: '🎧',
  title: 'Agent Login',
  description: 'Provider-agnostic call center agent management with queue operations',
  tags: ['Call Center', 'Queues', 'Agent', 'Provider-Agnostic'],
  component: AgentLoginDemo,
  setupGuide: `<p>Manage call center agent sessions using provider-agnostic composables.
    Works with Asterisk AMI, FreeSWITCH (planned), and cloud providers.</p>
    <ul>
      <li><strong>useCallCenterProvider</strong> - Factory to create provider instances</li>
      <li><strong>useAgentState</strong> - Login, logout, pause, and status management</li>
      <li><strong>useAgentQueue</strong> - Queue membership and per-queue operations</li>
      <li><strong>useAgentMetrics</strong> - Session statistics and performance metrics</li>
    </ul>`,
  codeSnippets: [
    {
      title: 'Connect to Provider',
      description: 'Create provider instance and connect',
      code: `import { useCallCenterProvider, useAgentState, useAgentQueue, useAgentMetrics } from 'vuesip'

// Create provider instance (Asterisk example)
const { provider, connect, disconnect, isConnected } = useCallCenterProvider({
  type: 'asterisk',
  connection: {
    host: 'pbx.example.com',
    port: 5038,
    username: 'admin',
    secret: 'secret',
  },
  agent: {
    id: 'agent-001',
    extension: 'PJSIP/1001',
    name: 'John Doe',
  },
  defaultQueues: ['support', 'sales'],
  pauseReasons: ['Lunch', 'Break', 'Meeting'],
})

// Connect to the provider
await connect()`,
    },
    {
      title: 'Agent State Management',
      description: 'Login, logout, and manage agent status',
      code: `// Use agent state composable
const {
  status,
  isLoggedIn,
  isOnCall,
  isPaused,
  pauseReason,
  sessionDuration,
  login,
  logout,
  pause,
  unpause,
} = useAgentState(provider)

// Login to default queues
await login()

// Or login to specific queues with penalties
await login({
  queues: ['support', 'sales'],
  penalties: { support: 0, sales: 5 },
})

// Pause agent with reason
await pause({ reason: 'Lunch Break' })

// Resume availability
await unpause()

// Logout from all queues
await logout()`,
    },
    {
      title: 'Queue Operations',
      description: 'Manage queue membership and per-queue pause',
      code: `// Use queue composable
const {
  queues,
  activeQueues,
  pausedQueues,
  totalCallsHandled,
  joinQueue,
  leaveQueue,
  pauseInQueue,
  unpauseInQueue,
} = useAgentQueue(provider)

// Join a new queue
await joinQueue('premium-support', 0) // queue name, penalty

// Leave a queue
await leaveQueue('sales')

// Pause in specific queue only
await pauseInQueue('support', 'Training')

// Resume in specific queue
await unpauseInQueue('support')

// Access queue data
queues.value.forEach(q => {
  console.log(\`\${q.name}: \${q.callsHandled} calls, paused: \${q.isPaused}\`)
})`,
    },
    {
      title: 'Session Metrics',
      description: 'Track agent performance and statistics',
      code: `// Use metrics composable with auto-refresh
const {
  metrics,
  totalTalkTimeFormatted,
  averageHandleTimeFormatted,
  callsPerHour,
  utilizationPercent,
  fetchMetrics,
  startAutoRefresh,
  stopAutoRefresh,
} = useAgentMetrics(provider, { autoRefreshInterval: 30000 })

// Start auto-refresh on login
startAutoRefresh()

// Access metrics
console.log('Calls handled:', metrics.value?.callsHandled)
console.log('Total talk time:', totalTalkTimeFormatted.value)
console.log('Avg handle time:', averageHandleTimeFormatted.value)
console.log('Calls per hour:', callsPerHour.value.toFixed(1))
console.log('Utilization:', utilizationPercent.value.toFixed(1) + '%')

// Stop auto-refresh on logout
stopAutoRefresh()`,
    },
  ],
}
