import type { ExampleDefinition } from './types'
import SupervisorDemo from '../demos/SupervisorDemo.vue'

export const supervisorExample: ExampleDefinition = {
  id: 'supervisor',
  icon: '👁️',
  title: 'Supervisor Panel',
  description: 'Monitor and manage agent calls with supervisor features',
  category: 'ami',
  tags: ['Advanced', 'Supervisor', 'Call Center'],
  component: SupervisorDemo,
  setupGuide: `<p>Monitor agent calls, whisper coaching, barge-in capabilities, and call statistics for call center supervisors.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy with supervisor permissions</li>
  <li>Connect via the unified AmiService</li>
  <li>Use supervisor features like ChanSpy, whisper, and barge</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize Supervisor Session',
      description: 'Connect to AMI and access supervisor features',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI (requires supervisor/admin permissions)
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'supervisor',
  password: 'secret',
})

// Get supervisor composable via unified service
const supervisor = amiService.useSupervisor({
  monitorExtensions: ['1001', '1002', '1003', '1004'],
  autoRefreshAgents: true,
})

// Check available agents
console.log('Monitored agents:', supervisor.agents.value)`,
    },
    {
      title: 'Silent Monitor (Spy)',
      description: 'Listen to agent calls without being heard',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const supervisor = amiService.useSupervisor()

// Start silent monitoring - agent and caller cannot hear you
await supervisor.spy({
  channel: 'PJSIP/1001-00000042',
  whisperMode: 'none',  // Silent spy
  options: {
    volume: 4,  // Spy volume adjustment
    group: '',  // Spy only specific group
  },
})

// Listen for monitoring events
supervisor.onSpyStarted((event) => {
  console.log('Now monitoring:', event.channel)
})

supervisor.onSpyEnded((event) => {
  console.log('Monitoring ended:', event.reason)
})`,
    },
    {
      title: 'Whisper Coaching',
      description: 'Speak to the agent only (caller cannot hear)',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const supervisor = amiService.useSupervisor()

// Start whisper mode - only agent hears supervisor
await supervisor.spy({
  channel: 'PJSIP/1001-00000042',
  whisperMode: 'whisper',  // Agent hears, caller doesn't
})

// Alternatively, use the dedicated whisper method
await supervisor.whisper('PJSIP/1001-00000042')

// Coaching scenarios
const coachAgent = async (agentChannel: string, coachingMessage: string) => {
  await supervisor.whisper(agentChannel)
  // Now supervisor can speak coaching tips that only the agent hears
  console.log(\`Coaching agent: \${coachingMessage}\`)
}

// Example: Help agent handle difficult customer
await coachAgent('PJSIP/1001-00000042', 'Offer the 10% discount if needed')`,
    },
    {
      title: 'Barge Into Call',
      description: 'Join the call (all parties can hear)',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const supervisor = amiService.useSupervisor()

// Barge in - supervisor joins as third party, everyone hears
await supervisor.spy({
  channel: 'PJSIP/1001-00000042',
  whisperMode: 'barge',  // All parties hear each other
})

// Or use dedicated barge method
await supervisor.barge('PJSIP/1001-00000042')

// Handle barge events
supervisor.onBargeStarted((event) => {
  console.log('Barging into:', event.channel)
  // Update UI to show supervisor is now part of the call
})`,
    },
    {
      title: 'Real-time Agent Monitoring Dashboard',
      description: 'Vue component for supervisor call monitoring',
      code: `<template>
  <div class="supervisor-dashboard">
    <!-- Active Calls Grid -->
    <div class="active-calls">
      <h3>Active Agent Calls</h3>
      <div v-for="call in activeCalls" :key="call.uniqueId" class="call-card">
        <div class="call-info">
          <span class="agent">{{ call.agentName }}</span>
          <span class="caller">{{ call.callerNumber }}</span>
          <span class="duration">{{ formatDuration(call.duration) }}</span>
          <span class="status" :class="call.status">{{ call.status }}</span>
        </div>

        <div class="supervisor-actions">
          <button
            @click="startSpy(call.channel)"
            :disabled="isMonitoring"
            title="Silent Monitor"
          >
            👁️ Spy
          </button>
          <button
            @click="startWhisper(call.channel)"
            :disabled="isMonitoring"
            title="Whisper to Agent"
          >
            🗣️ Whisper
          </button>
          <button
            @click="startBarge(call.channel)"
            :disabled="isMonitoring"
            title="Barge In"
          >
            📞 Barge
          </button>
        </div>

        <!-- Quality Indicators -->
        <div class="quality-bar">
          <span :class="getQualityClass(call.mos)">
            MOS: {{ call.mos?.toFixed(1) || 'N/A' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Monitoring Controls (when active) -->
    <div v-if="isMonitoring" class="monitoring-panel">
      <h4>Currently Monitoring: {{ currentMonitorTarget }}</h4>
      <div class="monitor-controls">
        <button @click="escalateToWhisper">Escalate to Whisper</button>
        <button @click="escalateToBarge">Escalate to Barge</button>
        <button @click="endMonitoring" class="danger">End Monitoring</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const supervisor = amiService.useSupervisor({ autoRefreshAgents: true })

const isMonitoring = ref(false)
const currentMonitorTarget = ref('')

const activeCalls = computed(() => supervisor.activeCalls.value)

const startSpy = async (channel: string) => {
  await supervisor.spy({ channel, whisperMode: 'none' })
  isMonitoring.value = true
  currentMonitorTarget.value = channel
}

const startWhisper = async (channel: string) => {
  await supervisor.whisper(channel)
  isMonitoring.value = true
  currentMonitorTarget.value = channel
}

const startBarge = async (channel: string) => {
  await supervisor.barge(channel)
  isMonitoring.value = true
  currentMonitorTarget.value = channel
}

const endMonitoring = async () => {
  await supervisor.stopMonitoring()
  isMonitoring.value = false
  currentMonitorTarget.value = ''
}
</script>`,
    },
    {
      title: 'Agent Performance Tracking',
      description: 'Track and display agent statistics',
      code: `import { computed } from 'vue'
import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const supervisor = amiService.useSupervisor()
const agentStats = amiService.useAgentStats()

// Combined agent performance view
const agentPerformance = computed(() => {
  return supervisor.agents.value.map(agent => {
    const stats = agentStats.getAgentStats(agent.extension)
    return {
      extension: agent.extension,
      name: agent.name,
      state: agent.state,  // available, busy, away, dnd
      currentCall: agent.currentCall,

      // Today's statistics
      callsTaken: stats?.callsTaken || 0,
      callsMissed: stats?.callsMissed || 0,
      totalTalkTime: stats?.totalTalkTime || 0,
      avgTalkTime: stats?.avgTalkTime || 0,
      avgWrapTime: stats?.avgWrapTime || 0,

      // Calculated metrics
      answerRate: stats?.callsTaken > 0
        ? ((stats.callsTaken / (stats.callsTaken + stats.callsMissed)) * 100).toFixed(1)
        : '0',
      productivity: calculateProductivity(stats),
    }
  })
})

const calculateProductivity = (stats: any) => {
  if (!stats) return 0
  // Productivity = talk time / logged in time
  const loggedInTime = stats.loggedInDuration || 1
  return ((stats.totalTalkTime / loggedInTime) * 100).toFixed(1)
}

// Leaderboard sorted by calls taken
const topAgents = computed(() =>
  [...agentPerformance.value]
    .sort((a, b) => b.callsTaken - a.callsTaken)
    .slice(0, 5)
)`,
    },
    {
      title: 'Supervisor Event Notifications',
      description: 'Real-time alerts for supervisor actions',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const supervisor = amiService.useSupervisor()

// Configure supervisor alerts
const setupSupervisorAlerts = () => {
  // Alert when agent has been on call too long
  supervisor.onCallDurationExceeded((event) => {
    if (event.duration > 600) {  // 10 minutes
      showAlert({
        type: 'warning',
        title: 'Long Call Alert',
        message: \`Agent \${event.agent} has been on call for \${event.duration}s\`,
        action: () => startSpy(event.channel),
      })
    }
  })

  // Alert when agent goes to DND/unavailable
  amiService.on('DeviceStateChange', (event) => {
    if (event.State === 'UNAVAILABLE') {
      showAlert({
        type: 'info',
        title: 'Agent Unavailable',
        message: \`Agent \${event.Device} is now unavailable\`,
      })
    }
  })

  // Alert when queue wait time exceeds threshold
  amiService.on('QueueCallerJoin', (event) => {
    if (event.Wait > 120) {  // 2 minutes
      showAlert({
        type: 'urgent',
        title: 'Long Wait Time',
        message: \`Caller waiting \${event.Wait}s in \${event.Queue}\`,
      })
    }
  })

  // Alert when call recording fails
  amiService.on('MixMonitor', (event) => {
    if (event.State === 'StopError') {
      showAlert({
        type: 'error',
        title: 'Recording Failed',
        message: \`Recording failed for channel \${event.Channel}\`,
      })
    }
  })
}

// Show alert with actions
const showAlert = (alert: {
  type: string
  title: string
  message: string
  action?: () => void
}) => {
  // Implement your notification system here
  console.log(\`[\${alert.type.toUpperCase()}] \${alert.title}: \${alert.message}\`)
  if (alert.action) {
    // Optionally auto-trigger action for urgent alerts
  }
}`,
    },
  ],
}
