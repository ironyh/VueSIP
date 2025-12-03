<template>
  <div class="agent-stats-demo">
    <div class="info-section">
      <p>
        The Agent Statistics feature tracks individual agent performance metrics in real-time.
        Monitor KPIs like calls per hour, average handle time, service level, and occupancy rates.
      </p>
      <p class="note">
        <strong>Note:</strong> This demo simulates agent call activity. In production, statistics
        are automatically collected from AMI events when agents handle queue calls.
      </p>
    </div>

    <!-- Controls -->
    <div class="controls-section">
      <div class="agent-config">
        <div class="input-group">
          <label>Agent ID</label>
          <input
            v-model="agentIdInput"
            type="text"
            placeholder="e.g., 1001"
            :disabled="isTracking"
          />
        </div>
        <div class="input-group">
          <label>Period</label>
          <select v-model="selectedPeriod" :disabled="isTracking" @change="handlePeriodChange">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div class="action-buttons">
        <button
          v-if="!isTracking"
          class="btn btn-primary"
          @click="handleStartTracking"
        >
          Start Tracking
        </button>
        <button
          v-else
          class="btn btn-danger"
          @click="handleStopTracking"
        >
          Stop Tracking
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!isTracking"
          @click="handleSimulateCall"
        >
          Simulate Call
        </button>
        <button
          class="btn btn-secondary"
          :disabled="!isTracking || !stats"
          @click="handleRefresh"
        >
          Refresh
        </button>
      </div>
    </div>

    <!-- Performance Level Badge -->
    <div v-if="stats" class="performance-badge-container">
      <div
        class="performance-badge"
        :class="performanceLevel || 'average'"
      >
        <span class="badge-icon">{{ performanceIcon }}</span>
        <span class="badge-text">{{ formatPerformanceLevel(performanceLevel) }}</span>
      </div>
      <div class="last-updated">
        Last updated: {{ formatTime(stats.lastUpdated) }}
      </div>
    </div>

    <!-- KPI Cards -->
    <div v-if="stats" class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon">📞</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ callsPerHour.toFixed(1) }}</div>
          <div class="kpi-label">Calls/Hour</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">⏱️</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ formatSeconds(avgHandleTime) }}</div>
          <div class="kpi-label">Avg Handle Time</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">🎯</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ serviceLevel.toFixed(1) }}%</div>
          <div class="kpi-label">Service Level</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📊</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ occupancy.toFixed(1) }}%</div>
          <div class="kpi-label">Occupancy</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">⚡</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ utilization.toFixed(1) }}%</div>
          <div class="kpi-label">Utilization</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">🗣️</div>
        <div class="kpi-content">
          <div class="kpi-value">{{ formattedTalkTime }}</div>
          <div class="kpi-label">Total Talk Time</div>
        </div>
      </div>
    </div>

    <!-- Call Statistics -->
    <div v-if="stats" class="stats-section">
      <h3>Call Statistics</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Total Calls</span>
          <span class="stat-value">{{ stats.totalCalls }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Inbound</span>
          <span class="stat-value">{{ stats.inboundCalls }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Outbound</span>
          <span class="stat-value">{{ stats.outboundCalls }}</span>
        </div>
        <div class="stat-item missed">
          <span class="stat-label">Missed</span>
          <span class="stat-value">{{ stats.missedCalls }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Transferred</span>
          <span class="stat-value">{{ stats.transferredCalls }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">FCR Rate</span>
          <span class="stat-value">{{ stats.performance.fcrRate.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="alerts.length > 0" class="alerts-section">
      <h3>
        Active Alerts
        <span class="alert-count">{{ alertCount }}</span>
      </h3>
      <div class="alerts-list">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="alert-item"
          :class="{ [alert.level]: true, acknowledged: alert.acknowledged }"
        >
          <div class="alert-icon">
            {{ alert.level === 'critical' ? '🚨' : '⚠️' }}
          </div>
          <div class="alert-content">
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
          </div>
          <button
            v-if="!alert.acknowledged"
            class="btn-icon"
            title="Acknowledge"
            @click="acknowledgeAlert(alert.id)"
          >
            ✓
          </button>
        </div>
      </div>
      <button
        v-if="alertCount > 0"
        class="btn btn-sm btn-secondary"
        @click="acknowledgeAllAlerts"
      >
        Acknowledge All
      </button>
    </div>

    <!-- Queue Stats -->
    <div v-if="stats && topQueues.length > 0" class="queue-stats-section">
      <h3>Queue Performance</h3>
      <div class="queue-list">
        <div
          v-for="queue in topQueues"
          :key="queue.queue"
          class="queue-item"
        >
          <div class="queue-name">{{ queue.queue }}</div>
          <div class="queue-metrics">
            <span class="queue-metric">
              <strong>{{ queue.callsHandled }}</strong> handled
            </span>
            <span class="queue-metric">
              <strong>{{ queue.callsMissed }}</strong> missed
            </span>
            <span class="queue-metric">
              AHT: <strong>{{ formatSeconds(queue.avgHandleTime) }}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Hourly Distribution -->
    <div v-if="stats && hasHourlyData" class="hourly-section">
      <h3>Hourly Distribution</h3>
      <div class="hourly-chart">
        <div
          v-for="hour in getHourlyBreakdown()"
          :key="hour.hour"
          class="hour-bar-container"
        >
          <div
            class="hour-bar"
            :style="{ height: getBarHeight(hour.callCount) + '%' }"
            :title="`${hour.hour}:00 - ${hour.callCount} calls`"
          ></div>
          <span class="hour-label">{{ hour.hour }}</span>
        </div>
      </div>
      <div v-if="peakHours.length > 0" class="peak-hours">
        Peak hours: {{ peakHours.map(h => `${h}:00`).join(', ') }}
      </div>
    </div>

    <!-- Recent Calls -->
    <div v-if="stats && stats.recentCalls.length > 0" class="recent-calls-section">
      <h3>Recent Calls</h3>
      <div class="calls-list">
        <div
          v-for="call in stats.recentCalls.slice(0, 10)"
          :key="call.callId"
          class="call-item"
          :class="{ missed: call.disposition === 'missed' }"
        >
          <div class="call-icon">
            {{ call.direction === 'inbound' ? '📥' : '📤' }}
          </div>
          <div class="call-info">
            <div class="call-party">{{ call.remoteParty }}</div>
            <div class="call-details">
              <span v-if="call.queue">{{ call.queue }}</span>
              <span>{{ formatTime(call.startTime) }}</span>
            </div>
          </div>
          <div class="call-stats">
            <div class="call-duration" v-if="call.disposition === 'answered'">
              {{ formatSeconds(call.talkTime) }}
            </div>
            <div class="call-disposition" :class="call.disposition">
              {{ call.disposition }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Actions -->
    <div v-if="stats" class="export-section">
      <h3>Export Data</h3>
      <div class="export-buttons">
        <button class="btn btn-secondary" @click="handleExportCsv">
          📥 Export CSV
        </button>
        <button class="btn btn-secondary" @click="handleExportJson">
          📥 Export JSON
        </button>
        <button class="btn btn-danger-outline" @click="handleResetStats">
          🗑️ Reset Stats
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!stats && !isTracking" class="empty-state">
      <div class="empty-icon">📊</div>
      <h4>No Statistics Available</h4>
      <p>Enter an agent ID and click "Start Tracking" to begin monitoring agent performance.</p>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useAmiAgentStats } from 'vuesip'
import { useAmi } from 'vuesip'

const ami = useAmi()
const {
  stats,
  performanceLevel,
  callsPerHour,
  avgHandleTime,
  serviceLevel,
  occupancy,
  alerts,
  startTracking,
  stopTracking,
  refresh,
  compareToTeam,
  exportCsv,
  acknowledgeAlert
} = useAmiAgentStats(ami.getClient(), {
  agentId: '1001',
  queues: ['sales', 'support'],
  period: 'today',
  realTimeUpdates: true,
  serviceLevelThreshold: 20,
  onAlert: (alert) => {
    console.log('Alert:', alert.message)
  }
})

// Start tracking
startTracking()

// Access metrics
console.log('Performance:', performanceLevel.value)
console.log('Calls/hour:', callsPerHour.value)

// Compare to team
const comparison = compareToTeam()
console.log('Strengths:', comparison?.strengths)

// Export data
const csv = exportCsv()
downloadFile(csv, 'agent-stats.csv')</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type {
  AgentStatsPeriod,
  AgentPerformanceLevel,
  AgentCallDirection,
} from '../../src/types/agentstats.types'

// Simulated composable state (since AMI client is not available in playground)
const stats = ref<any>(null)
const _allAgentStats = ref<Map<string, any>>(new Map())
const alerts = ref<any[]>([])
const _isLoading = ref(false)
const _error = ref<string | null>(null)
const isTracking = ref(false)

// Form inputs
const agentIdInput = ref('1001')
const selectedPeriod = ref<AgentStatsPeriod>('today')

// Computed values
const performanceLevel = computed<AgentPerformanceLevel | null>(() => {
  return stats.value?.performanceLevel ?? null
})

const callsPerHour = computed(() => stats.value?.performance.callsPerHour ?? 0)
const avgHandleTime = computed(() => stats.value?.performance.avgHandleTime ?? 0)
const serviceLevel = computed(() => stats.value?.performance.serviceLevel ?? 100)
const occupancy = computed(() => stats.value?.performance.occupancy ?? 0)
const utilization = computed(() => stats.value?.performance.utilization ?? 0)
const formattedTalkTime = computed(() => formatDuration(stats.value?.totalTalkTime ?? 0))
const alertCount = computed(() => alerts.value.filter(a => !a.acknowledged).length)

const topQueues = computed(() => {
  if (!stats.value?.queueStats.length) return []
  return [...stats.value.queueStats]
    .sort((a: any, b: any) => b.callsHandled - a.callsHandled)
    .slice(0, 5)
})

const peakHours = computed(() => {
  if (!stats.value?.hourlyStats.length) return []
  const sorted = [...stats.value.hourlyStats]
    .filter((h: any) => h.callCount > 0)
    .sort((a: any, b: any) => b.callCount - a.callCount)
  return sorted.slice(0, 3).map((h: any) => h.hour)
})

const hasHourlyData = computed(() => {
  return stats.value?.hourlyStats.some((h: any) => h.callCount > 0)
})

const performanceIcon = computed(() => {
  switch (performanceLevel.value) {
    case 'excellent': return '🌟'
    case 'good': return '👍'
    case 'average': return '📊'
    case 'needs_improvement': return '📉'
    case 'critical': return '🚨'
    default: return '📊'
  }
})

// Simulated tracking
let simulationTimer: ReturnType<typeof setInterval> | null = null

function handleStartTracking() {
  if (!agentIdInput.value.trim()) {
    alert('Please enter an agent ID')
    return
  }

  isTracking.value = true

  // Initialize stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  stats.value = {
    agentId: agentIdInput.value,
    interface: `PJSIP/${agentIdInput.value}`,
    name: `Agent ${agentIdInput.value}`,
    period: selectedPeriod.value,
    periodStart: todayStart,
    periodEnd: todayEnd,
    totalCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    internalCalls: 0,
    missedCalls: 0,
    transferredCalls: 0,
    voicemailCalls: 0,
    totalTalkTime: 0,
    totalHoldTime: 0,
    totalWrapTime: 0,
    totalHandleTime: 0,
    totalLoginTime: 3600, // Simulated 1 hour login
    totalAvailableTime: 0,
    totalPausedTime: 0,
    totalOnCallTime: 0,
    performance: {
      callsPerHour: 0,
      avgHandleTime: 0,
      avgTalkTime: 0,
      avgWrapTime: 0,
      avgHoldTime: 0,
      fcrRate: 100,
      serviceLevel: 100,
      occupancy: 0,
      utilization: 0,
      avgQualityScore: 0,
      transferRate: 0,
      holdRate: 0,
    },
    queueStats: [],
    hourlyStats: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      callCount: 0,
      talkTime: 0,
      avgHandleTime: 0,
      serviceLevel: 0,
    })),
    recentCalls: [],
    performanceLevel: 'average' as AgentPerformanceLevel,
    lastUpdated: new Date(),
  }
}

function handleStopTracking() {
  isTracking.value = false
  if (simulationTimer) {
    clearInterval(simulationTimer)
    simulationTimer = null
  }
}

function handleSimulateCall() {
  if (!stats.value) return

  const queues = ['sales', 'support', 'billing']
  const directions: AgentCallDirection[] = ['inbound', 'outbound']
  const dispositions = ['answered', 'answered', 'answered', 'missed', 'transferred'] as const

  const direction = directions[Math.floor(Math.random() * directions.length)]
  const disposition = dispositions[Math.floor(Math.random() * dispositions.length)]
  const queue = queues[Math.floor(Math.random() * queues.length)]
  const talkTime = disposition === 'answered' ? Math.floor(Math.random() * 300) + 60 : 0
  const waitTime = Math.floor(Math.random() * 30)
  const wrapTime = disposition === 'answered' ? Math.floor(Math.random() * 60) : 0
  const hour = new Date().getHours()

  const call = {
    callId: `call-${Date.now()}`,
    queue: direction === 'inbound' ? queue : undefined,
    remoteParty: `+1555${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    direction,
    startTime: new Date(Date.now() - (talkTime + waitTime) * 1000),
    answerTime: disposition === 'answered' ? new Date(Date.now() - talkTime * 1000) : undefined,
    endTime: new Date(),
    waitTime,
    talkTime,
    holdTime: 0,
    wrapTime,
    disposition,
    recorded: Math.random() > 0.5,
    qualityScore: disposition === 'answered' ? 3 + Math.random() * 2 : undefined,
  }

  // Add call to recent calls
  stats.value.recentCalls.unshift(call)
  if (stats.value.recentCalls.length > 50) {
    stats.value.recentCalls = stats.value.recentCalls.slice(0, 50)
  }

  // Update totals
  stats.value.totalCalls++
  stats.value.totalTalkTime += talkTime
  stats.value.totalWrapTime += wrapTime
  stats.value.totalHandleTime += talkTime + wrapTime

  if (direction === 'inbound') stats.value.inboundCalls++
  else if (direction === 'outbound') stats.value.outboundCalls++

  if (disposition === 'missed') stats.value.missedCalls++
  else if (disposition === 'transferred') stats.value.transferredCalls++

  // Update hourly stats
  const hourlyBucket = stats.value.hourlyStats[hour]
  hourlyBucket.callCount++
  hourlyBucket.talkTime += talkTime

  // Update queue stats
  if (call.queue) {
    let queueStats = stats.value.queueStats.find((q: any) => q.queue === call.queue)
    if (!queueStats) {
      queueStats = {
        queue: call.queue,
        callsHandled: 0,
        callsMissed: 0,
        talkTime: 0,
        avgHandleTime: 0,
        avgWaitTime: 0,
        serviceLevel: 100,
        loginTime: 0,
        availableTime: 0,
        pausedTime: 0,
      }
      stats.value.queueStats.push(queueStats)
    }
    if (disposition === 'answered') {
      queueStats.callsHandled++
      queueStats.talkTime += talkTime
    } else if (disposition === 'missed') {
      queueStats.callsMissed++
    }
  }

  // Update performance metrics
  updatePerformance()

  // Check thresholds
  checkThresholds()

  stats.value.lastUpdated = new Date()
}

function updatePerformance() {
  if (!stats.value) return

  const { totalCalls, totalTalkTime, totalHandleTime, totalWrapTime, totalLoginTime, transferredCalls } = stats.value
  const loginHours = totalLoginTime / 3600

  stats.value.performance = {
    callsPerHour: loginHours > 0 ? totalCalls / loginHours : 0,
    avgHandleTime: totalCalls > 0 ? totalHandleTime / totalCalls : 0,
    avgTalkTime: totalCalls > 0 ? totalTalkTime / totalCalls : 0,
    avgWrapTime: totalCalls > 0 ? totalWrapTime / totalCalls : 0,
    avgHoldTime: 0,
    fcrRate: totalCalls > 0 ? ((totalCalls - transferredCalls) / totalCalls) * 100 : 100,
    serviceLevel: calculateServiceLevel(),
    occupancy: totalLoginTime > 0 ? (totalTalkTime / totalLoginTime) * 100 : 0,
    utilization: totalLoginTime > 0 ? ((totalTalkTime + totalWrapTime) / totalLoginTime) * 100 : 0,
    avgQualityScore: calculateAvgQualityScore(),
    transferRate: totalCalls > 0 ? (transferredCalls / totalCalls) * 100 : 0,
    holdRate: 0,
  }

  stats.value.performanceLevel = calculatePerformanceLevel()
}

function calculateServiceLevel(): number {
  if (!stats.value) return 100
  const answeredInTime = stats.value.recentCalls.filter(
    (c: any) => c.disposition === 'answered' && c.waitTime <= 20
  ).length
  const totalAnswered = stats.value.recentCalls.filter((c: any) => c.disposition === 'answered').length
  return totalAnswered > 0 ? (answeredInTime / totalAnswered) * 100 : 100
}

function calculateAvgQualityScore(): number {
  if (!stats.value) return 0
  const callsWithQuality = stats.value.recentCalls.filter((c: any) => c.qualityScore !== undefined)
  if (callsWithQuality.length === 0) return 0
  const sum = callsWithQuality.reduce((acc: number, c: any) => acc + (c.qualityScore || 0), 0)
  return sum / callsWithQuality.length
}

function calculatePerformanceLevel(): AgentPerformanceLevel {
  if (!stats.value) return 'average'

  const metrics = stats.value.performance
  let score = 0
  let factors = 0

  // Service level (weight: 3)
  if (metrics.serviceLevel >= 90) score += 15
  else if (metrics.serviceLevel >= 80) score += 12
  else if (metrics.serviceLevel >= 70) score += 9
  else if (metrics.serviceLevel >= 60) score += 6
  else score += 3
  factors += 15

  // Occupancy (weight: 2)
  if (metrics.occupancy >= 80) score += 10
  else if (metrics.occupancy >= 60) score += 8
  else if (metrics.occupancy >= 40) score += 6
  else if (metrics.occupancy >= 20) score += 4
  else score += 2
  factors += 10

  // Handle time (weight: 2)
  if (metrics.avgHandleTime > 0) {
    if (metrics.avgHandleTime <= 180) score += 10
    else if (metrics.avgHandleTime <= 300) score += 8
    else if (metrics.avgHandleTime <= 450) score += 6
    else if (metrics.avgHandleTime <= 600) score += 4
    else score += 2
    factors += 10
  }

  // Calls per hour (weight: 1)
  if (metrics.callsPerHour >= 10) score += 5
  else if (metrics.callsPerHour >= 7) score += 4
  else if (metrics.callsPerHour >= 5) score += 3
  else if (metrics.callsPerHour >= 3) score += 2
  else score += 1
  factors += 5

  const percentage = (score / factors) * 100

  if (percentage >= 85) return 'excellent'
  if (percentage >= 70) return 'good'
  if (percentage >= 55) return 'average'
  if (percentage >= 40) return 'needs_improvement'
  return 'critical'
}

function checkThresholds() {
  if (!stats.value) return

  const thresholds = [
    { metric: 'avgHandleTime', warningThreshold: 300, criticalThreshold: 600, higherIsBetter: false },
    { metric: 'serviceLevel', warningThreshold: 80, criticalThreshold: 60, higherIsBetter: true },
    { metric: 'occupancy', warningThreshold: 30, criticalThreshold: 20, higherIsBetter: true },
  ]

  for (const threshold of thresholds) {
    const value = stats.value.performance[threshold.metric]
    let level: 'warning' | 'critical' | null = null

    if (threshold.higherIsBetter) {
      if (value < threshold.criticalThreshold) level = 'critical'
      else if (value < threshold.warningThreshold) level = 'warning'
    } else {
      if (value > threshold.criticalThreshold) level = 'critical'
      else if (value > threshold.warningThreshold) level = 'warning'
    }

    if (level) {
      const existingAlert = alerts.value.find(
        a => a.agentId === stats.value.agentId && a.metric === threshold.metric && !a.acknowledged
      )

      if (!existingAlert) {
        alerts.value.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          agentId: stats.value.agentId,
          metric: threshold.metric,
          currentValue: value,
          thresholdValue: level === 'critical' ? threshold.criticalThreshold : threshold.warningThreshold,
          level,
          message: `${threshold.metric} is ${threshold.higherIsBetter ? 'below' : 'above'} ${level} threshold: ${value.toFixed(1)}`,
          timestamp: new Date(),
          acknowledged: false,
        })
      }
    }
  }
}

function handleRefresh() {
  if (!stats.value) return
  updatePerformance()
  stats.value.lastUpdated = new Date()
}

function handlePeriodChange() {
  // Period change would reset stats in real implementation
  if (stats.value) {
    stats.value.period = selectedPeriod.value
  }
}

function acknowledgeAlert(alertId: string) {
  const alert = alerts.value.find(a => a.id === alertId)
  if (alert) {
    alert.acknowledged = true
  }
}

function acknowledgeAllAlerts() {
  alerts.value.forEach(alert => {
    alert.acknowledged = true
  })
}

function getHourlyBreakdown() {
  return stats.value?.hourlyStats || []
}

function getBarHeight(callCount: number): number {
  if (!stats.value) return 0
  const maxCalls = Math.max(...stats.value.hourlyStats.map((h: any) => h.callCount), 1)
  return (callCount / maxCalls) * 100
}

function handleExportCsv() {
  if (!stats.value) return

  const headers = [
    'Call ID', 'Queue', 'Remote Party', 'Direction', 'Start Time',
    'End Time', 'Wait Time', 'Talk Time', 'Disposition'
  ]

  const rows = stats.value.recentCalls.map((call: any) => [
    call.callId,
    call.queue || '',
    call.remoteParty,
    call.direction,
    call.startTime.toISOString(),
    call.endTime?.toISOString() || '',
    call.waitTime,
    call.talkTime,
    call.disposition,
  ].join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  downloadFile(csv, 'agent-stats.csv', 'text/csv')
}

function handleExportJson() {
  if (!stats.value) return
  const json = JSON.stringify(stats.value, null, 2)
  downloadFile(json, 'agent-stats.json', 'application/json')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function handleResetStats() {
  if (!confirm('Are you sure you want to reset all statistics?')) return
  if (stats.value) {
    handleStopTracking()
    stats.value = null
    alerts.value = []
  }
}

// Utility functions
function formatSeconds(seconds: number): string {
  if (seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatPerformanceLevel(level: AgentPerformanceLevel | null): string {
  if (!level) return 'Unknown'
  return level.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

onUnmounted(() => {
  handleStopTracking()
})
</script>

<style scoped>
.agent-stats-demo {
  max-width: 1000px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0 0 1rem 0;
  color: #666;
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: 1rem;
  background: #eff6ff;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.875rem;
}

.controls-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.agent-config {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.input-group input,
.input-group select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  min-width: 150px;
}

.input-group input:focus,
.input-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-group input:disabled,
.input-group select:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5a67d8;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger-outline {
  background: white;
  color: #ef4444;
  border: 1px solid #ef4444;
}

.btn-danger-outline:hover:not(:disabled) {
  background: #ef4444;
  color: white;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-icon {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-icon:hover {
  background: #f3f4f6;
  color: #10b981;
}

.performance-badge-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.performance-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  font-size: 1rem;
}

.performance-badge.excellent {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.performance-badge.good {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.performance-badge.average {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.performance-badge.needs_improvement {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
}

.performance-badge.critical {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.badge-icon {
  font-size: 1.25rem;
}

.last-updated {
  font-size: 0.75rem;
  color: #9ca3af;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.kpi-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.kpi-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.kpi-content {
  flex: 1;
  min-width: 0;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.kpi-label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
  margin-top: 0.25rem;
}

.stats-section,
.alerts-section,
.queue-stats-section,
.hourly-section,
.recent-calls-section,
.export-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.stats-section h3,
.alerts-section h3,
.queue-stats-section h3,
.hourly-section h3,
.recent-calls-section h3,
.export-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-item.missed {
  background: #fef2f2;
}

.stat-item .stat-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-item .stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #333;
}

.stat-item.missed .stat-value {
  color: #ef4444;
}

.alert-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.5rem;
  background: #ef4444;
  color: white;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 600;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid;
}

.alert-item.warning {
  background: #fffbeb;
  border-color: #fcd34d;
}

.alert-item.critical {
  background: #fef2f2;
  border-color: #fca5a5;
}

.alert-item.acknowledged {
  opacity: 0.5;
}

.alert-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-message {
  font-size: 0.875rem;
  color: #333;
  margin-bottom: 0.25rem;
}

.alert-time {
  font-size: 0.75rem;
  color: #666;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.queue-name {
  font-weight: 600;
  color: #333;
}

.queue-metrics {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.queue-metric strong {
  color: #333;
}

.hourly-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100px;
  padding: 0.5rem 0;
}

.hour-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.hour-bar {
  width: 100%;
  background: linear-gradient(to top, #667eea, #a78bfa);
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}

.hour-label {
  font-size: 0.625rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.peak-hours {
  margin-top: 1rem;
  font-size: 0.875rem;
  color: #666;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.call-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  transition: background 0.2s;
}

.call-item:hover {
  background: #f3f4f6;
}

.call-item.missed {
  background: #fef2f2;
}

.call-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.call-info {
  flex: 1;
  min-width: 0;
}

.call-party {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.call-details {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
}

.call-stats {
  text-align: right;
  flex-shrink: 0;
}

.call-duration {
  font-family: monospace;
  font-weight: 500;
  color: #667eea;
}

.call-disposition {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-top: 0.25rem;
  display: inline-block;
}

.call-disposition.answered {
  background: #d1fae5;
  color: #065f46;
}

.call-disposition.missed {
  background: #fee2e2;
  color: #991b1b;
}

.call-disposition.transferred {
  background: #dbeafe;
  color: #1e40af;
}

.export-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #666;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

.code-example {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.code-example pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }

  .agent-config {
    flex-direction: column;
  }

  .input-group input,
  .input-group select {
    min-width: 100%;
  }

  .action-buttons {
    justify-content: stretch;
  }

  .action-buttons .btn {
    flex: 1;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .queue-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .queue-metrics {
    flex-wrap: wrap;
  }

  .performance-badge-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
