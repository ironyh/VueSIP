import type { ExampleDefinition } from './types'
import AgentStatsDemo from '../demos/AgentStatsDemo.vue'

export const agentStatsExample: ExampleDefinition = {
  id: 'agent-stats',
  icon: '📊',
  title: 'Agent Statistics',
  description: 'Real-time agent performance metrics and analytics',
  tags: ['Call Center', 'Analytics', 'Performance'],
  component: AgentStatsDemo,
  setupGuide: '<p>Monitor agent performance with real-time statistics. Track call counts, handle times, and availability metrics.</p>',
  codeSnippets: [
    {
      title: 'Monitor Agent Stats',
      description: 'Track real-time agent performance',
      code: `import { useAgentStats } from 'vuesip'

const agentStats = useAgentStats(amiClientRef, {
  agentId: 'Agent/1001',
  refreshInterval: 5000,
  onStatsUpdate: (stats) => {
    console.log('Calls today:', stats.callsHandled)
    console.log('Avg handle time:', stats.avgHandleTime)
  },
})

// Get current stats
const stats = agentStats.current.value
console.log('Status:', stats.status)
console.log('Calls handled:', stats.callsHandled)
console.log('Average handle time:', stats.avgHandleTime, 'seconds')
console.log('Talk time:', stats.totalTalkTime)`,
    },
    {
      title: 'Historical Analytics',
      description: 'Query historical performance data',
      code: `// Get stats for a date range
const history = await agentStats.getHistory({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
})

history.forEach(day => {
  console.log('Date:', day.date)
  console.log('Calls:', day.callsHandled)
  console.log('Avg handle:', day.avgHandleTime)
})

// Get performance summary
const summary = agentStats.summary.value
console.log('Performance score:', summary.performanceScore)
console.log('Availability rate:', summary.availabilityRate + '%')`,
    },
  ],
}
