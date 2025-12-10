import type { ExampleDefinition } from './types'
import QueueMonitorDemo from '../demos/QueueMonitorDemo.vue'

export const queueMonitorExample: ExampleDefinition = {
  id: 'queue-monitor',
  icon: '📊',
  title: 'Queue Monitor',
  description: 'Real-time call queue monitoring and statistics',
  category: 'ami',
  tags: ['Advanced', 'Queue', 'Call Center'],
  component: QueueMonitorDemo,
  setupGuide: `<p>Monitor call queues in real-time with wait times, agent availability, and queue statistics.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the queues composable for real-time queue monitoring</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI Service',
      description: 'Connect to AMI via the unified service layer',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Check connection state
console.log('Connected:', amiService.isConnected.value)
console.log('State:', amiService.connectionState.value)`,
    },
    {
      title: 'Monitor Queues',
      description: 'Subscribe to real-time queue statistics',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch } from 'vue'

const amiService = getAmiService()

// Get the queues composable via the unified service
const queues = amiService.useQueues({
  autoRefresh: true,
  refreshInterval: 5000,
})

// Reactive queue data
watch(queues.queues, (queueList) => {
  queueList.forEach(queue => {
    console.log(\`Queue: \${queue.name}\`)
    console.log(\`  Calls waiting: \${queue.callers}\`)
    console.log(\`  Agents logged in: \${queue.members.length}\`)
    console.log(\`  Average wait: \${queue.holdtime}s\`)
  })
})

// Access specific queue stats
const salesQueue = queues.queues.value.find(q => q.name === 'sales')`,
    },
    {
      title: 'Queue Membership Actions',
      description: 'Add, remove, and manage queue agents',
      code: `const amiService = getAmiService()
const queues = amiService.useQueues()

// Add agent to queue
await queues.addMember('sales-queue', 'PJSIP/1001', {
  penalty: 1,
  paused: false,
  stateInterface: 'PJSIP/1001',
})

// Remove agent from queue
await queues.removeMember('sales-queue', 'PJSIP/1001')

// Pause agent in queue (e.g., for break)
await queues.pauseMember('sales-queue', 'PJSIP/1001', true, 'Lunch break')

// Unpause agent
await queues.pauseMember('sales-queue', 'PJSIP/1001', false)

// Set agent penalty (affects call distribution priority)
await queues.setMemberPenalty('sales-queue', 'PJSIP/1001', 5)`,
    },
    {
      title: 'Queue Statistics Dashboard',
      description: 'Build a real-time queue dashboard',
      code: `<template>
  <div class="queue-dashboard">
    <div v-for="queue in queues.queues.value" :key="queue.name" class="queue-card">
      <h3>{{ queue.name }}</h3>

      <!-- Queue Metrics -->
      <div class="metrics">
        <div class="metric">
          <span class="value">{{ queue.callers }}</span>
          <span class="label">Waiting</span>
        </div>
        <div class="metric">
          <span class="value">{{ queue.members.filter(m => !m.paused).length }}</span>
          <span class="label">Available Agents</span>
        </div>
        <div class="metric">
          <span class="value">{{ formatTime(queue.holdtime) }}</span>
          <span class="label">Avg Wait</span>
        </div>
        <div class="metric">
          <span class="value">{{ queue.completed }}</span>
          <span class="label">Answered</span>
        </div>
      </div>

      <!-- Agent List -->
      <div class="agents">
        <div
          v-for="member in queue.members"
          :key="member.interface"
          class="agent"
          :class="{ paused: member.paused, busy: member.inCall }"
        >
          <span class="name">{{ member.name || member.interface }}</span>
          <span class="status">{{ member.paused ? 'Paused' : member.inCall ? 'On Call' : 'Ready' }}</span>
          <span class="calls-taken">{{ member.callsTaken }} calls</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const queues = amiService.useQueues({ autoRefresh: true })

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return \`\${mins}:\${secs.toString().padStart(2, '0')}\`
}
</script>`,
    },
    {
      title: 'Queue Event Handling',
      description: 'React to real-time queue events',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const queues = amiService.useQueues()

// Listen for queue events via the AMI event bus
amiService.on('QueueMemberStatus', (event) => {
  console.log(\`Agent \${event.Interface} status changed to \${event.Status}\`)
})

amiService.on('QueueCallerJoin', (event) => {
  console.log(\`Caller joined queue \${event.Queue} at position \${event.Position}\`)
  // Trigger alert if wait time exceeds threshold
  if (event.Position > 5) {
    notifyHighQueueVolume(event.Queue)
  }
})

amiService.on('QueueCallerLeave', (event) => {
  console.log(\`Caller left queue \${event.Queue}\`)
})

amiService.on('QueueMemberPause', (event) => {
  console.log(\`Agent \${event.Interface} \${event.Paused ? 'paused' : 'unpaused'}\`)
})`,
    },
    {
      title: 'Queue Performance Analytics',
      description: 'Calculate and display queue performance metrics',
      code: `import { computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const queues = amiService.useQueues()

// Computed performance metrics
const queuePerformance = computed(() => {
  return queues.queues.value.map(queue => {
    const availableAgents = queue.members.filter(m => !m.paused && !m.inCall)
    const totalCalls = queue.completed + queue.abandoned
    const sla = totalCalls > 0
      ? ((queue.completed / totalCalls) * 100).toFixed(1)
      : '100'

    return {
      name: queue.name,
      serviceLevel: \`\${sla}%\`,
      abandonRate: totalCalls > 0
        ? ((queue.abandoned / totalCalls) * 100).toFixed(1) + '%'
        : '0%',
      avgHandleTime: queue.talktime || 0,
      longestWait: queue.maxHoldtime || 0,
      agentUtilization: queue.members.length > 0
        ? ((queue.members.filter(m => m.inCall).length / queue.members.length) * 100).toFixed(0) + '%'
        : '0%',
      callsPerAgent: queue.members.length > 0
        ? (queue.completed / queue.members.length).toFixed(1)
        : '0',
    }
  })
})

// Real-time SLA monitoring
const slaThreshold = 80 // 80% target
const queuesAboveSLA = computed(() =>
  queuePerformance.value.filter(q => parseFloat(q.serviceLevel) >= slaThreshold)
)
const queuesBelowSLA = computed(() =>
  queuePerformance.value.filter(q => parseFloat(q.serviceLevel) < slaThreshold)
)`,
    },
  ],
}
