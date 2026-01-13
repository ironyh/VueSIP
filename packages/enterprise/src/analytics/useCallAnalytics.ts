/**
 * @vuesip/enterprise - Call Analytics Composable
 *
 * Vue composable for call center analytics and reporting.
 * Provides real-time metrics calculation, agent tracking, and export capabilities.
 *
 * @module analytics/useCallAnalytics
 */

import { ref, computed, watch, onUnmounted, shallowRef, type Ref, type ComputedRef } from 'vue'
import type {
  CallMetrics,
  AgentMetrics,
  QueueMetrics,
  SentimentMetrics,
  TimeRange,
  DataPoint,
  AnalyticsConfig,
  CallRecordData,
  CallRecord,
  AgentState,
  AgentStateRecord,
  QueueStateRecord,
  ReportOptions,
} from './types'

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Return type for useCallAnalytics composable
 */
export interface UseCallAnalyticsReturn {
  // State
  /** Aggregated call metrics */
  metrics: Ref<CallMetrics>
  /** Per-agent performance metrics */
  agentMetrics: Ref<AgentMetrics[]>
  /** Per-queue health metrics */
  queueMetrics: Ref<QueueMetrics[]>
  /** Sentiment analysis metrics */
  sentimentMetrics: Ref<SentimentMetrics>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message if any */
  error: Ref<string | null>

  // Time series data
  /** Call volume over time */
  callVolume: Ref<DataPoint[]>
  /** Handle time history */
  handleTimeHistory: Ref<DataPoint[]>
  /** Sentiment score history */
  sentimentHistory: Ref<DataPoint[]>
  /** Service level history */
  serviceLevelHistory: Ref<DataPoint[]>

  // Computed
  /** Top performing agents by service level */
  topPerformers: ComputedRef<AgentMetrics[]>
  /** Underperforming agents */
  underperformers: ComputedRef<AgentMetrics[]>
  /** Busiest queues by calls waiting */
  busiestQueues: ComputedRef<QueueMetrics[]>

  // Methods
  /** Refresh all metrics */
  refresh: () => Promise<void>
  /** Set the time range for queries */
  setTimeRange: (range: TimeRange) => void
  /** Get metrics for a specific agent */
  getAgentReport: (agentId: string) => AgentMetrics | null
  /** Get metrics for a specific queue */
  getQueueReport: (queueName: string) => QueueMetrics | null

  // Data ingestion
  /** Record a completed call */
  recordCall: (callData: CallRecordData) => void
  /** Update an agent's state */
  updateAgentState: (agentId: string, state: AgentState, agentName?: string) => void

  // Export
  /** Export metrics in JSON or CSV format */
  exportMetrics: (format: 'json' | 'csv') => string
  /** Generate a formatted report */
  generateReport: (options?: ReportOptions) => string
}

/**
 * Default call metrics
 */
function createDefaultCallMetrics(): CallMetrics {
  return {
    totalCalls: 0,
    completedCalls: 0,
    missedCalls: 0,
    abandonedCalls: 0,
    averageHandleTime: 0,
    averageWaitTime: 0,
    serviceLevelPercent: 0,
    firstCallResolution: 0,
  }
}

/**
 * Default sentiment metrics
 */
function createDefaultSentimentMetrics(): SentimentMetrics {
  return {
    averageSentiment: 0,
    positivePercent: 0,
    neutralPercent: 0,
    negativePercent: 0,
    escalationRate: 0,
    trendDirection: 'stable',
  }
}

/**
 * Vue composable for call center analytics
 *
 * @param config - Analytics configuration options
 * @returns Analytics management interface
 *
 * @example
 * ```ts
 * const analytics = useCallAnalytics({
 *   enableRealtime: true,
 *   refreshInterval: 30000,
 *   serviceLevelThreshold: 20, // 20 seconds
 * })
 *
 * // Record a call
 * analytics.recordCall({
 *   duration: 180,
 *   waitTime: 15,
 *   agentId: 'agent-1',
 *   queueName: 'support',
 *   outcome: 'completed',
 *   sentiment: 0.7,
 * })
 *
 * // Get metrics
 * console.log(analytics.metrics.value.serviceLevelPercent)
 * ```
 */
export function useCallAnalytics(config?: AnalyticsConfig): UseCallAnalyticsReturn {
  // ============================================
  // Configuration
  // ============================================

  const serviceLevelThreshold = config?.serviceLevelThreshold ?? 20 // seconds
  const refreshInterval = config?.refreshInterval ?? 0

  // ============================================
  // Internal State
  // ============================================

  const callRecords = shallowRef<CallRecord[]>([])
  const agentStates = shallowRef<Map<string, AgentStateRecord>>(new Map())
  const queueStates = shallowRef<Map<string, QueueStateRecord>>(new Map())
  const currentTimeRange = ref<TimeRange | undefined>(config?.timeRange)

  // ============================================
  // Public State
  // ============================================

  const metrics = ref<CallMetrics>(createDefaultCallMetrics())
  const agentMetrics = ref<AgentMetrics[]>([])
  const queueMetrics = ref<QueueMetrics[]>([])
  const sentimentMetrics = ref<SentimentMetrics>(createDefaultSentimentMetrics())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Time series data
  const callVolume = ref<DataPoint[]>([])
  const handleTimeHistory = ref<DataPoint[]>([])
  const sentimentHistory = ref<DataPoint[]>([])
  const serviceLevelHistory = ref<DataPoint[]>([])

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * Filter calls by time range
   */
  function getCallsInRange(range?: TimeRange): CallRecord[] {
    if (!range) {
      return callRecords.value
    }
    return callRecords.value.filter((c) => c.timestamp >= range.start && c.timestamp <= range.end)
  }

  /**
   * Calculate aggregated metrics from call records
   */
  function calculateMetrics(): void {
    const calls = getCallsInRange(currentTimeRange.value)

    if (calls.length === 0) {
      metrics.value = createDefaultCallMetrics()
      return
    }

    const completed = calls.filter((c) => c.outcome === 'completed')
    const missed = calls.filter((c) => c.outcome === 'missed')
    const abandoned = calls.filter((c) => c.outcome === 'abandoned')
    const withinSLA = completed.filter((c) => c.waitTime <= serviceLevelThreshold)
    const resolved = completed.filter((c) => c.firstCallResolved === true)

    const totalHandleTime = completed.reduce((sum, c) => sum + c.duration, 0)
    const totalWaitTime = calls.reduce((sum, c) => sum + c.waitTime, 0)

    metrics.value = {
      totalCalls: calls.length,
      completedCalls: completed.length,
      missedCalls: missed.length,
      abandonedCalls: abandoned.length,
      averageHandleTime: completed.length > 0 ? totalHandleTime / completed.length : 0,
      averageWaitTime: calls.length > 0 ? totalWaitTime / calls.length : 0,
      serviceLevelPercent: calls.length > 0 ? (withinSLA.length / calls.length) * 100 : 0,
      firstCallResolution: completed.length > 0 ? (resolved.length / completed.length) * 100 : 0,
    }
  }

  /**
   * Calculate per-agent metrics
   */
  function calculateAgentMetrics(): void {
    const result: AgentMetrics[] = []

    for (const [agentId, state] of agentStates.value.entries()) {
      const stats = state.callStats

      // Calculate total time tracked
      const totalTime = Object.values(state.stateTime).reduce((a, b) => a + b, 0)
      const busyTime = state.stateTime.busy + state.stateTime['wrap-up']
      const availableTime = state.stateTime.available

      result.push({
        agentId,
        agentName: state.agentName,
        totalCalls: stats.totalCalls,
        averageHandleTime: stats.totalCalls > 0 ? stats.totalHandleTime / stats.totalCalls : 0,
        averageTalkTime: stats.totalCalls > 0 ? stats.totalTalkTime / stats.totalCalls : 0,
        averageWrapUpTime: stats.totalCalls > 0 ? stats.totalWrapUpTime / stats.totalCalls : 0,
        occupancy: totalTime > 0 ? (busyTime / totalTime) * 100 : 0,
        availability: totalTime > 0 ? (availableTime / totalTime) * 100 : 0,
        serviceLevel: stats.totalCalls > 0 ? (stats.serviceLevelMet / stats.totalCalls) * 100 : 0,
        customerSatisfaction: undefined, // Would come from surveys
        sentimentScore:
          stats.sentimentCount > 0 ? stats.totalSentiment / stats.sentimentCount : undefined,
      })
    }

    agentMetrics.value = result
  }

  /**
   * Calculate per-queue metrics
   */
  function calculateQueueMetrics(): void {
    const result: QueueMetrics[] = []

    for (const [queueName, state] of queueStates.value.entries()) {
      const now = new Date()

      // Calculate longest wait
      let longestWait = 0
      for (const call of state.waitingCalls) {
        const wait = (now.getTime() - call.waitingSince.getTime()) / 1000
        if (wait > longestWait) {
          longestWait = wait
        }
      }

      // Count agent states
      let agentsAvailable = 0
      let agentsBusy = 0
      let agentsPaused = 0

      for (const agentId of state.agents) {
        const agentState = agentStates.value.get(agentId)
        if (agentState) {
          switch (agentState.state) {
            case 'available':
              agentsAvailable++
              break
            case 'busy':
            case 'wrap-up':
              agentsBusy++
              break
            case 'paused':
              agentsPaused++
              break
          }
        }
      }

      result.push({
        queueName,
        callsWaiting: state.waitingCalls.length,
        callsInProgress: state.inProgressCalls.length,
        longestWait,
        averageWait: state.totalCalls > 0 ? state.totalWaitTime / state.totalCalls : 0,
        abandonRate: state.totalCalls > 0 ? (state.abandonedCalls / state.totalCalls) * 100 : 0,
        serviceLevelPercent:
          state.totalCalls > 0 ? (state.serviceLevelMet / state.totalCalls) * 100 : 0,
        agentsAvailable,
        agentsBusy,
        agentsPaused,
      })
    }

    queueMetrics.value = result
  }

  /**
   * Calculate sentiment metrics
   */
  function calculateSentimentMetrics(): void {
    const calls = getCallsInRange(currentTimeRange.value).filter((c) => c.sentiment !== undefined)

    if (calls.length === 0) {
      sentimentMetrics.value = createDefaultSentimentMetrics()
      return
    }

<<<<<<< HEAD
    const positive = calls.filter((c) => (c.sentiment ?? 0) > 0.3)
    const negative = calls.filter((c) => (c.sentiment ?? 0) < -0.3)
    const neutral = calls.filter((c) => (c.sentiment ?? 0) >= -0.3 && (c.sentiment ?? 0) <= 0.3)

    const totalSentiment = calls.reduce((sum, c) => sum + (c.sentiment ?? 0), 0)
=======
    const positive = calls.filter((c) => c.sentiment! > 0.3)
    const negative = calls.filter((c) => c.sentiment! < -0.3)
    const neutral = calls.filter((c) => c.sentiment! >= -0.3 && c.sentiment! <= 0.3)

    const totalSentiment = calls.reduce((sum, c) => sum + c.sentiment!, 0)
>>>>>>> 18c2136 (feat(enterprise): add enterprise package with analytics, compliance, and CRM)
    const averageSentiment = totalSentiment / calls.length

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(calls.length / 2)
    const firstHalf = calls.slice(0, midpoint)
    const secondHalf = calls.slice(midpoint)

    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable'
    if (firstHalf.length > 0 && secondHalf.length > 0) {
<<<<<<< HEAD
      const firstAvg = firstHalf.reduce((sum, c) => sum + (c.sentiment ?? 0), 0) / firstHalf.length
      const secondAvg =
        secondHalf.reduce((sum, c) => sum + (c.sentiment ?? 0), 0) / secondHalf.length
=======
      const firstAvg = firstHalf.reduce((sum, c) => sum + c.sentiment!, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, c) => sum + c.sentiment!, 0) / secondHalf.length
>>>>>>> 18c2136 (feat(enterprise): add enterprise package with analytics, compliance, and CRM)
      const diff = secondAvg - firstAvg

      if (diff > 0.1) {
        trendDirection = 'improving'
      } else if (diff < -0.1) {
        trendDirection = 'declining'
      }
    }

    // Placeholder for escalation rate - would need escalation tracking
    const escalationRate = 0

    sentimentMetrics.value = {
      averageSentiment,
      positivePercent: (positive.length / calls.length) * 100,
      neutralPercent: (neutral.length / calls.length) * 100,
      negativePercent: (negative.length / calls.length) * 100,
      escalationRate,
      trendDirection,
    }
  }

  /**
   * Update time series data
   */
  function updateTimeSeries(): void {
    const range = currentTimeRange.value
    const calls = getCallsInRange(range)

    if (calls.length === 0) {
      callVolume.value = []
      handleTimeHistory.value = []
      sentimentHistory.value = []
      serviceLevelHistory.value = []
      return
    }

    // Group calls by time bucket
    const granularity = range?.granularity ?? 'hour'
    const buckets = new Map<
      string,
      {
        timestamp: Date
        calls: CallRecord[]
      }
    >()

    for (const call of calls) {
      const key = getBucketKey(call.timestamp, granularity)
      const existing = buckets.get(key)
      if (existing) {
        existing.calls.push(call)
      } else {
        buckets.set(key, { timestamp: getBucketStart(call.timestamp, granularity), calls: [call] })
      }
    }

    // Sort buckets by timestamp
    const sortedBuckets = Array.from(buckets.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )

    // Generate data points
    callVolume.value = sortedBuckets.map((b) => ({
      timestamp: b.timestamp,
      value: b.calls.length,
    }))

    handleTimeHistory.value = sortedBuckets.map((b) => {
      const completed = b.calls.filter((c) => c.outcome === 'completed')
      const avg =
        completed.length > 0
          ? completed.reduce((sum, c) => sum + c.duration, 0) / completed.length
          : 0
      return { timestamp: b.timestamp, value: avg }
    })

    sentimentHistory.value = sortedBuckets.map((b) => {
      const withSentiment = b.calls.filter((c) => c.sentiment !== undefined)
      const avg =
        withSentiment.length > 0
<<<<<<< HEAD
          ? withSentiment.reduce((sum, c) => sum + (c.sentiment ?? 0), 0) / withSentiment.length
=======
          ? withSentiment.reduce((sum, c) => sum + c.sentiment!, 0) / withSentiment.length
>>>>>>> 18c2136 (feat(enterprise): add enterprise package with analytics, compliance, and CRM)
          : 0
      return { timestamp: b.timestamp, value: avg }
    })

    serviceLevelHistory.value = sortedBuckets.map((b) => {
      const withinSLA = b.calls.filter((c) => c.waitTime <= serviceLevelThreshold)
      const percent = b.calls.length > 0 ? (withinSLA.length / b.calls.length) * 100 : 0
      return { timestamp: b.timestamp, value: percent }
    })
  }

  /**
   * Get bucket key for a timestamp
   */
  function getBucketKey(date: Date, granularity: string): string {
    const d = new Date(date)
    switch (granularity) {
      case 'minute':
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`
      case 'hour':
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
      case 'day':
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      case 'week':
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        return `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`
      case 'month':
        return `${d.getFullYear()}-${d.getMonth()}`
      default:
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
    }
  }

  /**
   * Get bucket start timestamp
   */
  function getBucketStart(date: Date, granularity: string): Date {
    const d = new Date(date)
    switch (granularity) {
      case 'minute':
        d.setSeconds(0, 0)
        break
      case 'hour':
        d.setMinutes(0, 0, 0)
        break
      case 'day':
        d.setHours(0, 0, 0, 0)
        break
      case 'week':
        d.setDate(d.getDate() - d.getDay())
        d.setHours(0, 0, 0, 0)
        break
      case 'month':
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        break
    }
    return d
  }

  /**
   * Refresh all metrics
   */
  function recalculateAll(): void {
    calculateMetrics()
    calculateAgentMetrics()
    calculateQueueMetrics()
    calculateSentimentMetrics()
    updateTimeSeries()
  }

  // ============================================
  // Computed Properties
  // ============================================

  const topPerformers = computed<AgentMetrics[]>(() => {
    return [...agentMetrics.value]
      .filter((a) => a.totalCalls > 0)
      .sort((a, b) => b.serviceLevel - a.serviceLevel)
      .slice(0, 5)
  })

  const underperformers = computed<AgentMetrics[]>(() => {
    const avgServiceLevel = metrics.value.serviceLevelPercent
    return [...agentMetrics.value]
      .filter((a) => a.totalCalls > 0 && a.serviceLevel < avgServiceLevel * 0.8)
      .sort((a, b) => a.serviceLevel - b.serviceLevel)
  })

  const busiestQueues = computed<QueueMetrics[]>(() => {
    return [...queueMetrics.value].sort((a, b) => b.callsWaiting - a.callsWaiting).slice(0, 5)
  })

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Refresh metrics (async for potential API calls)
   */
  async function refresh(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      recalculateAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error during refresh'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set time range for queries
   */
  function setTimeRange(range: TimeRange): void {
    currentTimeRange.value = range
    recalculateAll()
  }

  /**
   * Get report for a specific agent
   */
  function getAgentReport(agentId: string): AgentMetrics | null {
    return agentMetrics.value.find((a) => a.agentId === agentId) ?? null
  }

  /**
   * Get report for a specific queue
   */
  function getQueueReport(queueName: string): QueueMetrics | null {
    return queueMetrics.value.find((q) => q.queueName === queueName) ?? null
  }

  /**
   * Record a call for analytics
   */
  function recordCall(callData: CallRecordData): void {
    const record: CallRecord = {
      ...callData,
      id: generateId(),
      timestamp: callData.timestamp ?? new Date(),
    }

    callRecords.value = [...callRecords.value, record]

    // Update agent stats
    const agentState = agentStates.value.get(callData.agentId)
    if (agentState) {
      const stats = agentState.callStats
      stats.totalCalls++
      stats.totalHandleTime += callData.duration

      if (callData.talkTime !== undefined) {
        stats.totalTalkTime += callData.talkTime
      }
      if (callData.wrapUpTime !== undefined) {
        stats.totalWrapUpTime += callData.wrapUpTime
      }
      if (callData.waitTime <= serviceLevelThreshold && callData.outcome === 'completed') {
        stats.serviceLevelMet++
      }
      if (callData.firstCallResolved) {
        stats.firstCallResolutions++
      }
      if (callData.sentiment !== undefined) {
        stats.totalSentiment += callData.sentiment
        stats.sentimentCount++
      }

      // Trigger reactivity
      agentStates.value = new Map(agentStates.value)
    }

    // Update queue stats
    const queueState = queueStates.value.get(callData.queueName)
    if (queueState) {
      queueState.totalCalls++
      queueState.totalWaitTime += callData.waitTime

      if (callData.waitTime <= serviceLevelThreshold && callData.outcome === 'completed') {
        queueState.serviceLevelMet++
      }
      if (callData.outcome === 'abandoned') {
        queueState.abandonedCalls++
      }

      // Trigger reactivity
      queueStates.value = new Map(queueStates.value)
    } else {
      // Create queue if it doesn't exist
      const newQueue: QueueStateRecord = {
        queueName: callData.queueName,
        waitingCalls: [],
        inProgressCalls: [],
        totalCalls: 1,
        serviceLevelMet:
          callData.waitTime <= serviceLevelThreshold && callData.outcome === 'completed' ? 1 : 0,
        abandonedCalls: callData.outcome === 'abandoned' ? 1 : 0,
        totalWaitTime: callData.waitTime,
        agents: new Set([callData.agentId]),
      }
      queueStates.value = new Map(queueStates.value).set(callData.queueName, newQueue)
    }

    recalculateAll()
  }

  /**
   * Update an agent's state
   */
  function updateAgentState(agentId: string, state: AgentState, agentName?: string): void {
    const now = new Date()
    const existing = agentStates.value.get(agentId)

    if (existing) {
      // Calculate time in previous state
      const elapsed = (now.getTime() - existing.stateChangedAt.getTime()) / 1000
      existing.stateTime[existing.state] = (existing.stateTime[existing.state] || 0) + elapsed

      // Update state
      existing.state = state
      existing.stateChangedAt = now
      if (agentName) {
        existing.agentName = agentName
      }

      agentStates.value = new Map(agentStates.value)
    } else {
      // Create new agent record
      const newAgent: AgentStateRecord = {
        agentId,
        agentName: agentName ?? agentId,
        state,
        stateChangedAt: now,
        stateTime: {
          available: 0,
          busy: 0,
          paused: 0,
          'wrap-up': 0,
          offline: 0,
        },
        callStats: {
          totalCalls: 0,
          totalTalkTime: 0,
          totalHoldTime: 0,
          totalWrapUpTime: 0,
          totalHandleTime: 0,
          serviceLevelMet: 0,
          firstCallResolutions: 0,
          totalSentiment: 0,
          sentimentCount: 0,
        },
      }
      agentStates.value = new Map(agentStates.value).set(agentId, newAgent)
    }

    calculateAgentMetrics()
    calculateQueueMetrics()
  }

  /**
   * Export metrics to JSON or CSV
   */
  function exportMetrics(format: 'json' | 'csv'): string {
    const data = {
      exportedAt: new Date().toISOString(),
      timeRange: currentTimeRange.value
        ? {
            start: currentTimeRange.value.start.toISOString(),
            end: currentTimeRange.value.end.toISOString(),
            granularity: currentTimeRange.value.granularity,
          }
        : null,
      callMetrics: metrics.value,
      agentMetrics: agentMetrics.value,
      queueMetrics: queueMetrics.value,
      sentimentMetrics: sentimentMetrics.value,
    }

    if (format === 'json') {
      return JSON.stringify(data, null, 2)
    }

    // CSV format - export call metrics summary
    const headers = ['metric', 'value']
    const rows = [
      ['totalCalls', metrics.value.totalCalls],
      ['completedCalls', metrics.value.completedCalls],
      ['missedCalls', metrics.value.missedCalls],
      ['abandonedCalls', metrics.value.abandonedCalls],
      ['averageHandleTime', metrics.value.averageHandleTime.toFixed(2)],
      ['averageWaitTime', metrics.value.averageWaitTime.toFixed(2)],
      ['serviceLevelPercent', metrics.value.serviceLevelPercent.toFixed(2)],
      ['firstCallResolution', metrics.value.firstCallResolution.toFixed(2)],
    ]

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  }

  /**
   * Generate a formatted report
   */
  function generateReport(options?: ReportOptions): string {
    const title = options?.title ?? 'Call Center Analytics Report'
    const lines: string[] = []

    lines.push(`# ${title}`)
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push('')

    // Summary metrics
    lines.push('## Summary Metrics')
    lines.push(`- Total Calls: ${metrics.value.totalCalls}`)
    lines.push(`- Completed: ${metrics.value.completedCalls}`)
    lines.push(`- Missed: ${metrics.value.missedCalls}`)
    lines.push(`- Abandoned: ${metrics.value.abandonedCalls}`)
    lines.push(`- Average Handle Time: ${metrics.value.averageHandleTime.toFixed(1)}s`)
    lines.push(`- Average Wait Time: ${metrics.value.averageWaitTime.toFixed(1)}s`)
    lines.push(`- Service Level: ${metrics.value.serviceLevelPercent.toFixed(1)}%`)
    lines.push(`- First Call Resolution: ${metrics.value.firstCallResolution.toFixed(1)}%`)
    lines.push('')

    // Agent metrics
    if (options?.includeAgents !== false && agentMetrics.value.length > 0) {
      lines.push('## Agent Performance')
      for (const agent of agentMetrics.value) {
        lines.push(`### ${agent.agentName} (${agent.agentId})`)
        lines.push(`- Total Calls: ${agent.totalCalls}`)
        lines.push(`- Avg Handle Time: ${agent.averageHandleTime.toFixed(1)}s`)
        lines.push(`- Service Level: ${agent.serviceLevel.toFixed(1)}%`)
        lines.push(`- Occupancy: ${agent.occupancy.toFixed(1)}%`)
        if (agent.sentimentScore !== undefined) {
          lines.push(`- Avg Sentiment: ${agent.sentimentScore.toFixed(2)}`)
        }
        lines.push('')
      }
    }

    // Queue metrics
    if (options?.includeQueues !== false && queueMetrics.value.length > 0) {
      lines.push('## Queue Status')
      for (const queue of queueMetrics.value) {
        lines.push(`### ${queue.queueName}`)
        lines.push(`- Calls Waiting: ${queue.callsWaiting}`)
        lines.push(`- Calls In Progress: ${queue.callsInProgress}`)
        lines.push(`- Longest Wait: ${queue.longestWait.toFixed(1)}s`)
        lines.push(`- Average Wait: ${queue.averageWait.toFixed(1)}s`)
        lines.push(`- Abandon Rate: ${queue.abandonRate.toFixed(1)}%`)
        lines.push(`- Service Level: ${queue.serviceLevelPercent.toFixed(1)}%`)
        lines.push(
          `- Agents: ${queue.agentsAvailable} available, ${queue.agentsBusy} busy, ${queue.agentsPaused} paused`
        )
        lines.push('')
      }
    }

    // Sentiment metrics
    if (options?.includeSentiment !== false) {
      lines.push('## Sentiment Analysis')
      lines.push(`- Average Sentiment: ${sentimentMetrics.value.averageSentiment.toFixed(2)}`)
      lines.push(`- Positive: ${sentimentMetrics.value.positivePercent.toFixed(1)}%`)
      lines.push(`- Neutral: ${sentimentMetrics.value.neutralPercent.toFixed(1)}%`)
      lines.push(`- Negative: ${sentimentMetrics.value.negativePercent.toFixed(1)}%`)
      lines.push(`- Trend: ${sentimentMetrics.value.trendDirection}`)
      lines.push('')
    }

    return lines.join('\n')
  }

  // ============================================
  // Auto-refresh Timer
  // ============================================

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  if (config?.enableRealtime && refreshInterval > 0) {
    refreshTimer = setInterval(() => {
      recalculateAll()
    }, refreshInterval)
  }

  onUnmounted(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
  })

  // ============================================
  // Watch for time range changes
  // ============================================

  watch(
    currentTimeRange,
    () => {
      recalculateAll()
    },
    { deep: true }
  )

  // ============================================
  // Return
  // ============================================

  return {
    // State
    metrics,
    agentMetrics,
    queueMetrics,
    sentimentMetrics,
    isLoading,
    error,

    // Time series
    callVolume,
    handleTimeHistory,
    sentimentHistory,
    serviceLevelHistory,

    // Computed
    topPerformers,
    underperformers,
    busiestQueues,

    // Methods
    refresh,
    setTimeRange,
    getAgentReport,
    getQueueReport,
    recordCall,
    updateAgentState,
    exportMetrics,
    generateReport,
  }
}
