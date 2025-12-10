import type { ExampleDefinition } from './types'
import AgentStatsDemo from '../demos/AgentStatsDemo.vue'

export const agentStatsExample: ExampleDefinition = {
  id: 'agent-stats',
  icon: '📊',
  title: 'Agent Statistics',
  description: 'Real-time agent performance metrics and analytics',
  category: 'ami',
  tags: ['Call Center', 'Analytics', 'Performance'],
  component: AgentStatsDemo,
  setupGuide: `<p>Monitor agent performance with real-time statistics. Track call counts, handle times, and availability metrics.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the agent stats composable for real-time metrics</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & Agent Stats',
      description: 'Connect to AMI and access agent statistics',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get agent stats composable via unified service
const agentStats = amiService.useAgentStats({
  agents: ['1001', '1002', '1003'],
  autoRefresh: true,
  refreshInterval: 5000,
})

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Monitor Agent Performance',
      description: 'Track real-time agent performance metrics',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch } from 'vue'

const amiService = getAmiService()
const agentStats = amiService.useAgentStats()

// Get stats for a specific agent
const stats = agentStats.getAgentStats('1001')
console.log('Agent 1001 stats:', {
  status: stats?.status,
  callsHandled: stats?.callsHandled,
  avgHandleTime: stats?.avgHandleTime,
  totalTalkTime: stats?.totalTalkTime,
})

// Watch all agents reactively
watch(agentStats.agents, (agents) => {
  agents.forEach(agent => {
    console.log(\`Agent \${agent.extension}:\`)
    console.log(\`  Status: \${agent.status}\`)
    console.log(\`  Calls: \${agent.callsHandled}\`)
    console.log(\`  Avg Handle: \${agent.avgHandleTime}s\`)
  })
}, { deep: true })`,
    },
    {
      title: 'Historical Analytics',
      description: 'Query historical performance data',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const agentStats = amiService.useAgentStats()

// Get stats for a date range
const history = await agentStats.getHistory({
  agentId: '1001',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
})

history.forEach(day => {
  console.log('Date:', day.date)
  console.log('Calls:', day.callsHandled)
  console.log('Avg handle:', day.avgHandleTime)
})

// Get performance summary
const summary = agentStats.getSummary('1001')
console.log('Performance score:', summary?.performanceScore)
console.log('Availability rate:', summary?.availabilityRate + '%')`,
    },
    {
      title: 'Agent Statistics Data Models',
      description: 'TypeScript interfaces for agent metrics',
      code: `// Complete agent statistics data models
interface AgentStats {
  agentId: string
  agentName: string
  extension: string

  // Current status
  status: AgentStatus
  statusSince: Date
  currentCall?: ActiveCallInfo

  // Session metrics
  loginTime: Date
  logoutTime?: Date
  totalLoginTime: number // seconds

  // Call metrics
  callsHandled: number
  callsAbandoned: number
  callsMissed: number
  callsTransferred: number

  // Time metrics (seconds)
  totalTalkTime: number
  totalHoldTime: number
  totalWrapTime: number
  totalIdleTime: number
  avgTalkTime: number
  avgHoldTime: number
  avgWrapTime: number
  avgHandleTime: number // Talk + Hold + Wrap

  // Quality metrics
  avgRingTime: number
  firstCallResolution: number // percentage
  customerSatisfaction?: number // 1-5 scale

  // Queue membership
  queues: string[]
  queueStats: Record<string, QueueAgentStats>
}

type AgentStatus =
  | 'available'
  | 'on_call'
  | 'wrap_up'
  | 'paused'
  | 'unavailable'
  | 'offline'

interface ActiveCallInfo {
  callId: string
  direction: 'inbound' | 'outbound'
  callerIdNum: string
  callerIdName: string
  queue?: string
  startTime: Date
  duration: number
  onHold: boolean
}

interface QueueAgentStats {
  queueName: string
  callsHandled: number
  avgWaitTime: number
  avgTalkTime: number
  longestCall: number
  lastCallTime?: Date
}

interface AgentPerformanceSummary {
  performanceScore: number // 0-100
  availabilityRate: number // percentage
  utilizationRate: number // percentage
  serviceLevel: number // percentage of calls answered within threshold
  qualityScore: number // 0-100

  // Rankings
  callsRank: number
  handleTimeRank: number
  satisfactionRank: number
  overallRank: number

  // Trends
  trend: 'improving' | 'stable' | 'declining'
  trendPercentage: number
}`,
    },
    {
      title: 'Real-time Agent Monitor',
      description: 'Live agent status tracking with AMI events',
      code: `import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

class AgentMonitor {
  private amiClient: any
  private updateInterval: number | null = null

  public agents = ref<Map<string, AgentStats>>(new Map())
  public selectedAgent = ref<string | null>(null)

  constructor(amiClient: any, refreshInterval: number = 5000) {
    this.amiClient = amiClient
    this.setupEventListeners()
    this.startPolling(refreshInterval)
  }

  private setupEventListeners(): void {
    // Agent status changes
    this.amiClient.on('AgentCalled', (event: any) => {
      this.updateAgentStatus(event.Agent, 'on_call', {
        callId: event.Uniqueid,
        direction: 'inbound',
        callerIdNum: event.CallerIDNum,
        callerIdName: event.CallerIDName,
        queue: event.Queue,
        startTime: new Date(),
      })
    })

    this.amiClient.on('AgentConnect', (event: any) => {
      this.incrementAgentCalls(event.Agent)
    })

    this.amiClient.on('AgentComplete', (event: any) => {
      const talkTime = parseInt(event.TalkTime) || 0
      const holdTime = parseInt(event.HoldTime) || 0
      this.recordCallCompletion(event.Agent, talkTime, holdTime)
      this.updateAgentStatus(event.Agent, 'wrap_up')
    })

    this.amiClient.on('QueueMemberPause', (event: any) => {
      const status = event.Paused === '1' ? 'paused' : 'available'
      this.updateAgentStatus(event.Interface, status)
    })

    this.amiClient.on('QueueMemberAdded', (event: any) => {
      this.addAgentToQueue(event.Interface, event.Queue)
    })

    this.amiClient.on('QueueMemberRemoved', (event: any) => {
      this.removeAgentFromQueue(event.Interface, event.Queue)
    })
  }

  private startPolling(interval: number): void {
    this.updateInterval = window.setInterval(() => {
      this.refreshAllAgents()
    }, interval)
  }

  async refreshAllAgents(): Promise<void> {
    const response = await this.amiClient.action({
      action: 'QueueStatus',
    })
    // Process response and update agent states
  }

  private updateAgentStatus(
    agentId: string,
    status: AgentStatus,
    callInfo?: Partial<ActiveCallInfo>
  ): void {
    const agent = this.agents.value.get(agentId)
    if (agent) {
      agent.status = status
      agent.statusSince = new Date()
      if (callInfo) {
        agent.currentCall = { ...agent.currentCall, ...callInfo } as ActiveCallInfo
      } else if (status !== 'on_call') {
        agent.currentCall = undefined
      }
    }
  }

  private incrementAgentCalls(agentId: string): void {
    const agent = this.agents.value.get(agentId)
    if (agent) {
      agent.callsHandled++
    }
  }

  private recordCallCompletion(agentId: string, talkTime: number, holdTime: number): void {
    const agent = this.agents.value.get(agentId)
    if (agent) {
      agent.totalTalkTime += talkTime
      agent.totalHoldTime += holdTime

      // Recalculate averages
      const totalCalls = agent.callsHandled
      agent.avgTalkTime = agent.totalTalkTime / totalCalls
      agent.avgHoldTime = agent.totalHoldTime / totalCalls
      agent.avgHandleTime = agent.avgTalkTime + agent.avgHoldTime + agent.avgWrapTime
    }
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }
}`,
    },
    {
      title: 'Agent Dashboard UI Component',
      description: 'Vue component for displaying agent statistics',
      code: `<template>
  <div class="agent-dashboard">
    <!-- Agent Status Overview -->
    <div class="status-overview">
      <div
        v-for="status in statusCounts"
        :key="status.status"
        class="status-card"
        :class="status.status"
      >
        <span class="count">{{ status.count }}</span>
        <span class="label">{{ status.label }}</span>
      </div>
    </div>

    <!-- Agent List -->
    <div class="agent-list">
      <div
        v-for="agent in sortedAgents"
        :key="agent.agentId"
        class="agent-card"
        :class="{ selected: selectedAgent === agent.agentId }"
        @click="selectAgent(agent.agentId)"
      >
        <div class="agent-header">
          <span class="status-indicator" :class="agent.status"></span>
          <span class="agent-name">{{ agent.agentName }}</span>
          <span class="agent-ext">x{{ agent.extension }}</span>
        </div>

        <div class="agent-metrics">
          <div class="metric">
            <span class="value">{{ agent.callsHandled }}</span>
            <span class="label">Calls</span>
          </div>
          <div class="metric">
            <span class="value">{{ formatTime(agent.avgHandleTime) }}</span>
            <span class="label">AHT</span>
          </div>
          <div class="metric">
            <span class="value">{{ formatTime(agent.totalTalkTime) }}</span>
            <span class="label">Talk</span>
          </div>
        </div>

        <!-- Current Call Info -->
        <div v-if="agent.currentCall" class="current-call">
          <span class="call-icon">📞</span>
          <span class="caller">{{ agent.currentCall.callerIdNum }}</span>
          <span class="duration">{{ formatDuration(agent.currentCall.duration) }}</span>
        </div>

        <!-- Status Duration -->
        <div class="status-duration">
          {{ agent.status }} for {{ formatDuration(getStatusDuration(agent)) }}
        </div>
      </div>
    </div>

    <!-- Selected Agent Details -->
    <div v-if="selectedAgentData" class="agent-details">
      <h3>{{ selectedAgentData.agentName }} Details</h3>

      <!-- Performance Score -->
      <div class="performance-score">
        <div class="score-circle" :style="{ '--score': summary.performanceScore }">
          <span class="score-value">{{ summary.performanceScore }}</span>
        </div>
        <span class="score-label">Performance Score</span>
      </div>

      <!-- Detailed Metrics -->
      <div class="detail-grid">
        <div class="detail-item">
          <span class="label">Availability</span>
          <span class="value">{{ summary.availabilityRate.toFixed(1) }}%</span>
        </div>
        <div class="detail-item">
          <span class="label">Utilization</span>
          <span class="value">{{ summary.utilizationRate.toFixed(1) }}%</span>
        </div>
        <div class="detail-item">
          <span class="label">Service Level</span>
          <span class="value">{{ summary.serviceLevel.toFixed(1) }}%</span>
        </div>
        <div class="detail-item">
          <span class="label">Quality Score</span>
          <span class="value">{{ summary.qualityScore }}</span>
        </div>
      </div>

      <!-- Queue Breakdown -->
      <div class="queue-stats">
        <h4>Queue Performance</h4>
        <div v-for="(stats, queue) in selectedAgentData.queueStats" :key="queue" class="queue-row">
          <span class="queue-name">{{ queue }}</span>
          <span class="queue-calls">{{ stats.callsHandled }} calls</span>
          <span class="queue-aht">{{ formatTime(stats.avgTalkTime) }} AHT</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const statusCounts = computed(() => [
  { status: 'available', label: 'Available', count: countByStatus('available') },
  { status: 'on_call', label: 'On Call', count: countByStatus('on_call') },
  { status: 'paused', label: 'Paused', count: countByStatus('paused') },
  { status: 'wrap_up', label: 'Wrap Up', count: countByStatus('wrap_up') },
])

const sortedAgents = computed(() =>
  [...agents.value.values()].sort((a, b) => b.callsHandled - a.callsHandled)
)
</script>`,
    },
    {
      title: 'Agent Performance Calculator',
      description: 'Calculate performance scores and rankings',
      code: `// Performance calculation engine
class AgentPerformanceCalculator {
  private targets = {
    avgHandleTime: 300, // 5 minutes target
    serviceLevel: 80, // 80% of calls answered within threshold
    serviceLevelThreshold: 20, // seconds
    availabilityTarget: 85, // 85% availability
    utilizationTarget: 75, // 75% utilization
  }

  calculatePerformance(agent: AgentStats): AgentPerformanceSummary {
    const availabilityRate = this.calculateAvailability(agent)
    const utilizationRate = this.calculateUtilization(agent)
    const serviceLevel = this.calculateServiceLevel(agent)
    const qualityScore = this.calculateQualityScore(agent)

    // Weighted performance score
    const performanceScore = Math.round(
      availabilityRate * 0.2 +
      utilizationRate * 0.2 +
      serviceLevel * 0.3 +
      qualityScore * 0.3
    )

    return {
      performanceScore,
      availabilityRate,
      utilizationRate,
      serviceLevel,
      qualityScore,
      callsRank: 0, // Set by team comparison
      handleTimeRank: 0,
      satisfactionRank: 0,
      overallRank: 0,
      trend: this.determineTrend(agent),
      trendPercentage: 0,
    }
  }

  private calculateAvailability(agent: AgentStats): number {
    const totalTime = agent.totalLoginTime
    const unavailableTime = agent.totalIdleTime // Time in paused/unavailable
    const availableTime = totalTime - unavailableTime
    return (availableTime / totalTime) * 100
  }

  private calculateUtilization(agent: AgentStats): number {
    const totalTime = agent.totalLoginTime
    const productiveTime = agent.totalTalkTime + agent.totalHoldTime + agent.totalWrapTime
    return (productiveTime / totalTime) * 100
  }

  private calculateServiceLevel(agent: AgentStats): number {
    // Percentage of calls answered within threshold
    // This would need call-level data
    return 85 // Placeholder
  }

  private calculateQualityScore(agent: AgentStats): number {
    let score = 100

    // Penalize for long handle times
    if (agent.avgHandleTime > this.targets.avgHandleTime) {
      const overTime = agent.avgHandleTime - this.targets.avgHandleTime
      score -= Math.min(overTime / 10, 20) // Max 20 point penalty
    }

    // Penalize for abandoned calls
    const abandonRate = agent.callsAbandoned / (agent.callsHandled + agent.callsAbandoned)
    score -= abandonRate * 30 // Up to 30 point penalty

    // Bonus for customer satisfaction
    if (agent.customerSatisfaction) {
      score += (agent.customerSatisfaction - 3) * 10 // +/-20 based on 1-5 scale
    }

    return Math.max(0, Math.min(100, score))
  }

  private determineTrend(agent: AgentStats): 'improving' | 'stable' | 'declining' {
    // Would compare to historical data
    return 'stable'
  }

  // Calculate team rankings
  calculateRankings(agents: AgentStats[]): Map<string, AgentPerformanceSummary> {
    const summaries = new Map<string, AgentPerformanceSummary>()

    // Calculate individual scores
    agents.forEach(agent => {
      summaries.set(agent.agentId, this.calculatePerformance(agent))
    })

    // Sort and assign ranks
    const byScore = [...agents].sort((a, b) =>
      summaries.get(b.agentId)!.performanceScore - summaries.get(a.agentId)!.performanceScore
    )

    byScore.forEach((agent, index) => {
      summaries.get(agent.agentId)!.overallRank = index + 1
    })

    return summaries
  }
}`,
    },
    {
      title: 'Agent Leaderboard Component',
      description: 'Gamified leaderboard for agent performance',
      code: `<template>
  <div class="agent-leaderboard">
    <h3>🏆 Agent Leaderboard</h3>

    <!-- Time Period Selector -->
    <div class="period-selector">
      <button
        v-for="period in periods"
        :key="period.value"
        :class="{ active: selectedPeriod === period.value }"
        @click="selectedPeriod = period.value"
      >
        {{ period.label }}
      </button>
    </div>

    <!-- Top 3 Podium -->
    <div class="podium">
      <div class="podium-place second" v-if="topAgents[1]">
        <div class="avatar">🥈</div>
        <span class="name">{{ topAgents[1].agentName }}</span>
        <span class="score">{{ topAgents[1].score }}</span>
      </div>
      <div class="podium-place first" v-if="topAgents[0]">
        <div class="avatar">🥇</div>
        <span class="name">{{ topAgents[0].agentName }}</span>
        <span class="score">{{ topAgents[0].score }}</span>
      </div>
      <div class="podium-place third" v-if="topAgents[2]">
        <div class="avatar">🥉</div>
        <span class="name">{{ topAgents[2].agentName }}</span>
        <span class="score">{{ topAgents[2].score }}</span>
      </div>
    </div>

    <!-- Full Rankings -->
    <div class="rankings-list">
      <div
        v-for="(agent, index) in rankedAgents"
        :key="agent.agentId"
        class="ranking-row"
        :class="{ highlight: agent.agentId === currentAgentId }"
      >
        <span class="rank">{{ index + 1 }}</span>
        <span class="trend-indicator" :class="agent.trend">
          {{ getTrendIcon(agent.trend) }}
        </span>
        <span class="name">{{ agent.agentName }}</span>
        <div class="metrics">
          <span class="calls">{{ agent.callsHandled }} calls</span>
          <span class="score">{{ agent.score }} pts</span>
        </div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: (agent.score / maxScore * 100) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- Achievements -->
    <div class="achievements">
      <h4>🎖️ Recent Achievements</h4>
      <div class="achievement-list">
        <div v-for="achievement in recentAchievements" :key="achievement.id" class="achievement">
          <span class="badge">{{ achievement.badge }}</span>
          <div class="details">
            <span class="title">{{ achievement.title }}</span>
            <span class="agent">{{ achievement.agentName }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const periods = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

const achievements = [
  { id: '1', badge: '🌟', title: 'Star Performer', agentName: 'John D.', description: '50 calls handled' },
  { id: '2', badge: '⚡', title: 'Speed Demon', agentName: 'Sarah M.', description: 'Lowest AHT' },
  { id: '3', badge: '🎯', title: 'Perfect Score', agentName: 'Mike R.', description: '100% satisfaction' },
]

const getTrendIcon = (trend: string) => {
  return { improving: '📈', stable: '➡️', declining: '📉' }[trend] || '➡️'
}
</script>

<style scoped>
.podium {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 1rem;
  padding: 2rem;
}

.podium-place {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 8px;
  background: linear-gradient(180deg, #f8fafc, #e2e8f0);
}

.podium-place.first {
  order: 2;
  transform: scale(1.1);
  background: linear-gradient(180deg, #fef3c7, #fcd34d);
}

.podium-place.second { order: 1; }
.podium-place.third { order: 3; }
</style>`,
    },
    {
      title: 'Agent Statistics Export',
      description: 'Export agent metrics to various formats',
      code: `// Agent stats export utilities
class AgentStatsExporter {
  // Export to CSV
  static toCSV(agents: AgentStats[]): string {
    const headers = [
      'Agent ID', 'Name', 'Extension', 'Status',
      'Calls Handled', 'Calls Abandoned', 'Calls Missed',
      'Total Talk Time', 'Avg Handle Time', 'Availability %'
    ].join(',')

    const rows = agents.map(a => [
      a.agentId,
      \`"\${a.agentName}"\`,
      a.extension,
      a.status,
      a.callsHandled,
      a.callsAbandoned,
      a.callsMissed,
      a.totalTalkTime,
      Math.round(a.avgHandleTime),
      ((a.totalLoginTime - a.totalIdleTime) / a.totalLoginTime * 100).toFixed(1)
    ].join(','))

    return [headers, ...rows].join('\\n')
  }

  // Generate team summary report
  static generateTeamReport(agents: AgentStats[], period: string): string {
    const totalCalls = agents.reduce((sum, a) => sum + a.callsHandled, 0)
    const totalTalkTime = agents.reduce((sum, a) => sum + a.totalTalkTime, 0)
    const avgHandleTime = agents.reduce((sum, a) => sum + a.avgHandleTime, 0) / agents.length

    const topPerformer = [...agents].sort((a, b) => b.callsHandled - a.callsHandled)[0]

    return \`
# Team Performance Report
Period: \${period}
Generated: \${new Date().toLocaleString()}

## Team Overview
- Total Agents: \${agents.length}
- Total Calls Handled: \${totalCalls}
- Total Talk Time: \${formatDuration(totalTalkTime)}
- Team Avg Handle Time: \${formatDuration(Math.round(avgHandleTime))}

## Top Performer
- Name: \${topPerformer.agentName}
- Calls: \${topPerformer.callsHandled}
- Avg Handle Time: \${formatDuration(Math.round(topPerformer.avgHandleTime))}

## Status Distribution
\${agents.reduce((acc, a) => {
  acc[a.status] = (acc[a.status] || 0) + 1
  return acc
}, {} as Record<string, number>)}

## Individual Stats
\${agents.map(a => \`- \${a.agentName}: \${a.callsHandled} calls, \${formatDuration(Math.round(a.avgHandleTime))} AHT\`).join('\\n')}
\`
  }

  // Real-time dashboard data for external systems
  static toRealtimeJSON(agents: AgentStats[]): object {
    return {
      timestamp: new Date().toISOString(),
      agentCount: agents.length,
      statusBreakdown: {
        available: agents.filter(a => a.status === 'available').length,
        on_call: agents.filter(a => a.status === 'on_call').length,
        paused: agents.filter(a => a.status === 'paused').length,
        wrap_up: agents.filter(a => a.status === 'wrap_up').length,
      },
      agents: agents.map(a => ({
        id: a.agentId,
        name: a.agentName,
        status: a.status,
        callsHandled: a.callsHandled,
        currentCall: a.currentCall ? {
          caller: a.currentCall.callerIdNum,
          duration: a.currentCall.duration,
        } : null,
      })),
    }
  }
}

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return \`\${h}h \${m}m\`
  if (m > 0) return \`\${m}m \${s}s\`
  return \`\${s}s\`
}`,
    },
  ],
}
