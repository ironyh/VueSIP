/**
 * AMI Agent Statistics Composable
 *
 * Vue composable for tracking individual agent performance metrics and analytics.
 * Provides real-time statistics, KPI calculations, and historical data.
 *
 * @module composables/useAmiAgentStats
 */

import { ref, computed, onUnmounted, watch, type Ref } from 'vue'
import type { AmiClient } from '@/core/AmiClient'
import type {
  AgentStats,
  AgentCallRecord,
  AgentQueueStats,
  AgentPerformanceMetrics,
  AgentPerformanceLevel,
  AgentStatsPeriod,
  AgentStatsComparison,
  StatsAlert,
  StatsThreshold,
  HourlyStats,
  UseAmiAgentStatsOptions,
  UseAmiAgentStatsReturn,
  AmiAgentCompleteEvent,
  AmiAgentRingNoAnswerEvent,
} from '@/types/agentstats.types'
import type { AmiQueueMemberStatusEvent, AmiEventData } from '@/types/ami.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAmiAgentStats')

/**
 * Default performance thresholds
 */
const DEFAULT_THRESHOLDS: StatsThreshold[] = [
  { metric: 'avgHandleTime', warningThreshold: 300, criticalThreshold: 600, higherIsBetter: false },
  { metric: 'serviceLevel', warningThreshold: 80, criticalThreshold: 60, higherIsBetter: true },
  { metric: 'occupancy', warningThreshold: 30, criticalThreshold: 20, higherIsBetter: true },
  { metric: 'callsPerHour', warningThreshold: 5, criticalThreshold: 2, higherIsBetter: true },
]

/**
 * Default options
 */
const DEFAULT_OPTIONS: Partial<UseAmiAgentStatsOptions> = {
  period: 'today',
  serviceLevelThreshold: 20,
  maxRecentCalls: 50,
  refreshInterval: 30000,
  realTimeUpdates: true,
  persist: false,
  storageKey: 'vuesip_agent_stats',
}

/**
 * Create empty agent stats
 */
function createEmptyStats(
  agentId: string,
  agentInterface: string,
  name: string,
  period: AgentStatsPeriod,
  periodStart: Date,
  periodEnd: Date
): AgentStats {
  return {
    agentId,
    interface: agentInterface,
    name,
    period,
    periodStart,
    periodEnd,
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
    totalLoginTime: 0,
    totalAvailableTime: 0,
    totalPausedTime: 0,
    totalOnCallTime: 0,
    performance: createEmptyPerformance(),
    queueStats: [],
    hourlyStats: createEmptyHourlyStats(),
    recentCalls: [],
    performanceLevel: 'average',
    lastUpdated: new Date(),
  }
}

/**
 * Create empty performance metrics
 */
function createEmptyPerformance(): AgentPerformanceMetrics {
  return {
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
  }
}

/**
 * Create empty hourly stats
 */
function createEmptyHourlyStats(): HourlyStats[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    callCount: 0,
    talkTime: 0,
    avgHandleTime: 0,
    serviceLevel: 0,
  }))
}

/**
 * Get period boundaries
 */
function getPeriodBoundaries(
  period: AgentStatsPeriod,
  customStart?: Date,
  customEnd?: Date
): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      }
    case 'week': {
      const dayOfWeek = today.getDay()
      const weekStart = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
      return {
        start: weekStart,
        end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      }
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      return { start: monthStart, end: monthEnd }
    }
    case 'custom':
      return {
        start: customStart || today,
        end: customEnd || new Date(today.getTime() + 24 * 60 * 60 * 1000),
      }
    default:
      return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
  }
}

/**
 * Determine performance level from metrics
 */
function calculatePerformanceLevel(metrics: AgentPerformanceMetrics): AgentPerformanceLevel {
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

  // Handle time (weight: 2, lower is better - assume 180s is excellent, 600s is critical)
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

/**
 * Format duration in seconds to HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Sanitize string input
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  return input.replace(/[<>'";&|`$\\]/g, '').trim().slice(0, 255)
}

/**
 * Escape CSV field value
 */
function escapeCsvField(value: string | number): string {
  const str = String(value)
  // If contains comma, quote, newline, or carriage return, wrap in quotes and escape inner quotes
  if (/[,"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Match interface against glob pattern safely
 * Converts simple glob pattern to regex safely to prevent ReDoS
 */
function matchInterfacePattern(interfaceValue: string, pattern: string): boolean {
  if (!pattern || !interfaceValue) return true
  // Simple wildcard matching: only allow * at the end (e.g., "PJSIP/*")
  // This prevents complex regex patterns that could cause ReDoS
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2)
    return interfaceValue.startsWith(prefix + '/')
  }
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return interfaceValue.startsWith(prefix)
  }
  // Exact match if no wildcard
  return interfaceValue === pattern
}

/**
 * AMI Agent Statistics Composable
 *
 * Track individual agent performance metrics with real-time updates.
 *
 * @param client - AMI client instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const ami = useAmi()
 * const {
 *   stats,
 *   performanceLevel,
 *   callsPerHour,
 *   avgHandleTime,
 *   startTracking,
 *   stopTracking,
 *   refresh,
 * } = useAmiAgentStats(ami.getClient(), {
 *   agentId: '1001',
 *   queues: ['sales', 'support'],
 *   period: 'today',
 *   realTimeUpdates: true,
 *   onAlert: (alert) => console.log('Alert:', alert),
 * })
 *
 * startTracking()
 * ```
 */
export function useAmiAgentStats(
  client: Ref<AmiClient | null>,
  options: UseAmiAgentStatsOptions = {}
): UseAmiAgentStatsReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const {
    agentId,
    interfacePattern,
    queues,
    serviceLevelThreshold = 20,
    maxRecentCalls = 50,
    refreshInterval = 30000,
    realTimeUpdates = true,
    thresholds = DEFAULT_THRESHOLDS,
    onStatsUpdate,
    onAlert,
    onError,
    persist,
    storageKey = 'vuesip_agent_stats',
  } = opts

  // State
  const stats = ref<AgentStats | null>(null)
  const allAgentStats = ref<Map<string, AgentStats>>(new Map())
  const alerts = ref<StatsAlert[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isTracking = ref(false)

  // Internal state
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  const eventListeners: Array<() => void> = []
  let currentPeriod: AgentStatsPeriod = opts.period || 'today'
  let customStart: Date | undefined = opts.customStart
  let customEnd: Date | undefined = opts.customEnd

  // Computed
  const performanceLevel = computed<AgentPerformanceLevel | null>(() => {
    return stats.value?.performanceLevel ?? null
  })

  const callsPerHour = computed<number>(() => {
    return stats.value?.performance.callsPerHour ?? 0
  })

  const avgHandleTime = computed<number>(() => {
    return stats.value?.performance.avgHandleTime ?? 0
  })

  const serviceLevel = computed<number>(() => {
    return stats.value?.performance.serviceLevel ?? 0
  })

  const occupancy = computed<number>(() => {
    return stats.value?.performance.occupancy ?? 0
  })

  const utilization = computed<number>(() => {
    return stats.value?.performance.utilization ?? 0
  })

  const formattedTalkTime = computed<string>(() => {
    return formatDuration(stats.value?.totalTalkTime ?? 0)
  })

  const formattedLoginTime = computed<string>(() => {
    return formatDuration(stats.value?.totalLoginTime ?? 0)
  })

  const alertCount = computed<number>(() => {
    return alerts.value.filter((a) => !a.acknowledged).length
  })

  const topQueues = computed<AgentQueueStats[]>(() => {
    if (!stats.value?.queueStats.length) return []
    return [...stats.value.queueStats].sort((a, b) => b.callsHandled - a.callsHandled).slice(0, 5)
  })

  const peakHours = computed<number[]>(() => {
    if (!stats.value?.hourlyStats.length) return []
    const sorted = [...stats.value.hourlyStats]
      .filter((h) => h.callCount > 0)
      .sort((a, b) => b.callCount - a.callCount)
    return sorted.slice(0, 3).map((h) => h.hour)
  })

  /**
   * Initialize stats for an agent
   */
  function initializeAgentStats(id: string, agentInterface: string, name: string): AgentStats {
    const { start, end } = getPeriodBoundaries(currentPeriod, customStart, customEnd)
    return createEmptyStats(id, agentInterface, name, currentPeriod, start, end)
  }

  /**
   * Get or create stats for an agent
   */
  function getOrCreateStats(id: string, agentInterface: string, name: string): AgentStats {
    let agentStats = allAgentStats.value.get(id)
    if (!agentStats) {
      agentStats = initializeAgentStats(id, agentInterface, name)
      allAgentStats.value.set(id, agentStats)
    }
    return agentStats
  }

  /**
   * Update performance metrics
   */
  function updatePerformance(agentStats: AgentStats): void {
    const { totalCalls, totalTalkTime, totalHandleTime, totalWrapTime, totalHoldTime, totalLoginTime, transferredCalls } =
      agentStats

    // Calculate login hours
    const loginHours = totalLoginTime / 3600

    agentStats.performance = {
      callsPerHour: loginHours > 0 ? totalCalls / loginHours : 0,
      avgHandleTime: totalCalls > 0 ? totalHandleTime / totalCalls : 0,
      avgTalkTime: totalCalls > 0 ? totalTalkTime / totalCalls : 0,
      avgWrapTime: totalCalls > 0 ? totalWrapTime / totalCalls : 0,
      avgHoldTime: totalCalls > 0 ? totalHoldTime / totalCalls : 0,
      fcrRate: totalCalls > 0 ? ((totalCalls - transferredCalls) / totalCalls) * 100 : 100,
      serviceLevel: calculateServiceLevel(agentStats),
      occupancy: totalLoginTime > 0 ? (totalTalkTime / totalLoginTime) * 100 : 0,
      utilization: totalLoginTime > 0 ? ((totalTalkTime + totalWrapTime) / totalLoginTime) * 100 : 0,
      avgQualityScore: calculateAvgQualityScore(agentStats.recentCalls),
      transferRate: totalCalls > 0 ? (transferredCalls / totalCalls) * 100 : 0,
      holdRate: totalCalls > 0 ? (agentStats.recentCalls.filter((c) => c.holdTime > 0).length / totalCalls) * 100 : 0,
    }

    agentStats.performanceLevel = calculatePerformanceLevel(agentStats.performance)
  }

  /**
   * Calculate service level
   */
  function calculateServiceLevel(agentStats: AgentStats): number {
    const answeredInTime = agentStats.recentCalls.filter(
      (c) => c.disposition === 'answered' && c.waitTime <= serviceLevelThreshold
    ).length
    const totalAnswered = agentStats.recentCalls.filter((c) => c.disposition === 'answered').length
    return totalAnswered > 0 ? (answeredInTime / totalAnswered) * 100 : 100
  }

  /**
   * Calculate average quality score
   */
  function calculateAvgQualityScore(calls: AgentCallRecord[]): number {
    const callsWithQuality = calls.filter((c) => c.qualityScore !== undefined)
    if (callsWithQuality.length === 0) return 0
    const sum = callsWithQuality.reduce((acc, c) => acc + (c.qualityScore || 0), 0)
    return sum / callsWithQuality.length
  }

  /**
   * Update hourly stats
   */
  function updateHourlyStats(agentStats: AgentStats, call: AgentCallRecord): void {
    const hour = call.startTime.getHours()
    const hourlyBucket = agentStats.hourlyStats[hour]
    if (hourlyBucket) {
      hourlyBucket.callCount++
      hourlyBucket.talkTime += call.talkTime
      hourlyBucket.avgHandleTime =
        (hourlyBucket.avgHandleTime * (hourlyBucket.callCount - 1) + call.talkTime + call.wrapTime + call.holdTime) /
        hourlyBucket.callCount
    }
  }

  /**
   * Update queue stats
   */
  function updateQueueStats(agentStats: AgentStats, call: AgentCallRecord): void {
    if (!call.queue) return

    let queueStats = agentStats.queueStats.find((q) => q.queue === call.queue)
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
      agentStats.queueStats.push(queueStats)
    }

    if (call.disposition === 'answered') {
      queueStats.callsHandled++
      queueStats.talkTime += call.talkTime
      queueStats.avgHandleTime =
        (queueStats.avgHandleTime * (queueStats.callsHandled - 1) + call.talkTime + call.wrapTime + call.holdTime) /
        queueStats.callsHandled
      queueStats.avgWaitTime =
        (queueStats.avgWaitTime * (queueStats.callsHandled - 1) + call.waitTime) / queueStats.callsHandled
    } else if (call.disposition === 'missed') {
      queueStats.callsMissed++
    }
  }

  /**
   * Check thresholds and generate alerts
   */
  function checkThresholds(agentStats: AgentStats): void {
    for (const threshold of thresholds) {
      const value = agentStats.performance[threshold.metric]
      let level: 'warning' | 'critical' | null = null

      if (threshold.higherIsBetter) {
        if (value < threshold.criticalThreshold) level = 'critical'
        else if (value < threshold.warningThreshold) level = 'warning'
      } else {
        if (value > threshold.criticalThreshold) level = 'critical'
        else if (value > threshold.warningThreshold) level = 'warning'
      }

      if (level) {
        // Check if alert already exists
        const existingAlert = alerts.value.find(
          (a) => a.agentId === agentStats.agentId && a.metric === threshold.metric && !a.acknowledged
        )

        if (!existingAlert) {
          const alert: StatsAlert = {
            id: generateId(),
            agentId: agentStats.agentId,
            metric: threshold.metric,
            currentValue: value,
            thresholdValue: level === 'critical' ? threshold.criticalThreshold : threshold.warningThreshold,
            level,
            message: `${threshold.metric} is ${threshold.higherIsBetter ? 'below' : 'above'} ${level} threshold: ${value.toFixed(1)}`,
            timestamp: new Date(),
            acknowledged: false,
          }
          alerts.value.push(alert)
          onAlert?.(alert)
        }
      }
    }
  }

  /**
   * Record a call completion
   */
  function recordCall(call: Omit<AgentCallRecord, 'callId'>): void {
    const targetAgentId = agentId || 'default'
    const agentStats = getOrCreateStats(targetAgentId, interfacePattern || '', '')

    const callRecord: AgentCallRecord = {
      ...call,
      callId: generateId(),
    }

    // Add to recent calls (maintain max limit)
    agentStats.recentCalls.unshift(callRecord)
    if (agentStats.recentCalls.length > maxRecentCalls) {
      agentStats.recentCalls = agentStats.recentCalls.slice(0, maxRecentCalls)
    }

    // Update totals
    agentStats.totalCalls++
    agentStats.totalTalkTime += call.talkTime
    agentStats.totalHoldTime += call.holdTime
    agentStats.totalWrapTime += call.wrapTime
    agentStats.totalHandleTime += call.talkTime + call.holdTime + call.wrapTime

    // Update by direction
    switch (call.direction) {
      case 'inbound':
        agentStats.inboundCalls++
        break
      case 'outbound':
        agentStats.outboundCalls++
        break
      case 'internal':
        agentStats.internalCalls++
        break
    }

    // Update by disposition
    switch (call.disposition) {
      case 'missed':
        agentStats.missedCalls++
        break
      case 'transferred':
        agentStats.transferredCalls++
        break
      case 'voicemail':
        agentStats.voicemailCalls++
        break
    }

    // Update hourly and queue stats
    updateHourlyStats(agentStats, callRecord)
    updateQueueStats(agentStats, callRecord)

    // Update performance metrics
    updatePerformance(agentStats)

    // Check thresholds
    checkThresholds(agentStats)

    // Update timestamp
    agentStats.lastUpdated = new Date()

    // Update primary stats if tracking specific agent
    if (!agentId || agentStats.agentId === agentId) {
      stats.value = agentStats
    }

    // Persist if enabled
    if (persist) {
      saveToStorage()
    }

    // Callback
    onStatsUpdate?.(agentStats)
  }

  /**
   * Update wrap time for a call
   */
  function recordWrapTime(callId: string, wrapTime: number): void {
    for (const agentStats of allAgentStats.value.values()) {
      const call = agentStats.recentCalls.find((c) => c.callId === callId)
      if (call) {
        const oldWrapTime = call.wrapTime
        call.wrapTime = wrapTime
        agentStats.totalWrapTime += wrapTime - oldWrapTime
        agentStats.totalHandleTime += wrapTime - oldWrapTime
        updatePerformance(agentStats)
        agentStats.lastUpdated = new Date()

        if (stats.value?.agentId === agentStats.agentId) {
          stats.value = agentStats
        }

        if (persist) {
          saveToStorage()
        }

        onStatsUpdate?.(agentStats)
        break
      }
    }
  }

  /**
   * Handle AgentComplete AMI event
   */
  function handleAgentComplete(event: AmiAgentCompleteEvent): void {
    // Filter by queues if specified
    if (queues && queues.length > 0 && !queues.includes(event.Queue)) {
      return
    }

    // Filter by interface pattern if specified (safe pattern matching to prevent ReDoS)
    if (interfacePattern && !matchInterfacePattern(event.Interface, interfacePattern)) {
      return
    }

    // Extract agent ID from interface (e.g., PJSIP/1001 -> 1001)
    const extractedAgentId = event.Interface.split('/').pop() || event.Interface

    // Filter by specific agentId if specified
    if (agentId && extractedAgentId !== agentId) {
      return
    }

    const talkTime = parseInt(event.TalkTime, 10) || 0
    const holdTime = parseInt(event.HoldTime, 10) || 0

    recordCall({
      queue: event.Queue,
      remoteParty: event.Channel,
      direction: 'inbound',
      startTime: new Date(Date.now() - (talkTime + holdTime) * 1000),
      answerTime: new Date(Date.now() - talkTime * 1000),
      endTime: new Date(),
      waitTime: holdTime,
      talkTime,
      holdTime: 0, // HoldTime in event is wait time, not call hold time
      wrapTime: 0, // Will be updated later
      disposition: event.Reason === 'transfer' ? 'transferred' : 'answered',
      transferredTo: event.Reason === 'transfer' ? 'transfer' : undefined,
      recorded: false,
    })
  }

  /**
   * Handle AgentRingNoAnswer AMI event
   */
  function handleAgentRingNoAnswer(event: AmiAgentRingNoAnswerEvent): void {
    // Filter by queues if specified
    if (queues && queues.length > 0 && !queues.includes(event.Queue)) {
      return
    }

    // Filter by interface pattern if specified (safe pattern matching to prevent ReDoS)
    if (interfacePattern && !matchInterfacePattern(event.Interface, interfacePattern)) {
      return
    }

    // Extract agent ID from interface
    const extractedAgentId = event.Interface.split('/').pop() || event.Interface

    // Filter by specific agentId if specified
    if (agentId && extractedAgentId !== agentId) {
      return
    }

    const ringTime = parseInt(event.RingTime, 10) || 0

    recordCall({
      queue: event.Queue,
      remoteParty: event.Channel,
      direction: 'inbound',
      startTime: new Date(Date.now() - ringTime * 1000),
      endTime: new Date(),
      waitTime: ringTime,
      talkTime: 0,
      holdTime: 0,
      wrapTime: 0,
      disposition: 'missed',
      recorded: false,
    })
  }

  /**
   * Handle QueueMemberStatus event for login time tracking
   */
  function handleQueueMemberStatus(event: AmiQueueMemberStatusEvent): void {
    // Filter by queues if specified
    if (queues && queues.length > 0 && !queues.includes(event.Queue)) {
      return
    }

    // Filter by interface pattern if specified (safe pattern matching to prevent ReDoS)
    if (interfacePattern && !matchInterfacePattern(event.Interface, interfacePattern)) {
      return
    }

    // Extract agent ID from interface
    const extractedAgentId = event.Interface.split('/').pop() || event.Interface

    // Filter by specific agentId if specified
    if (agentId && extractedAgentId !== agentId) {
      return
    }

    const agentStats = getOrCreateStats(
      extractedAgentId,
      event.Interface,
      sanitizeInput(event.MemberName || extractedAgentId)
    )

    // Update login time from LastCall (timestamp of last activity)
    const lastPause = event.LastPause ? parseInt(event.LastPause, 10) : 0
    const callsTaken = parseInt(event.CallsTaken || '0', 10)

    // Update queue-specific stats
    let queueStats = agentStats.queueStats.find((q) => q.queue === event.Queue)
    if (!queueStats) {
      queueStats = {
        queue: event.Queue,
        callsHandled: callsTaken,
        callsMissed: 0,
        talkTime: 0,
        avgHandleTime: 0,
        avgWaitTime: 0,
        serviceLevel: 100,
        loginTime: 0,
        availableTime: 0,
        pausedTime: lastPause,
      }
      agentStats.queueStats.push(queueStats)
    } else {
      queueStats.callsHandled = callsTaken
      queueStats.pausedTime = lastPause
    }

    // Update primary stats if this is the tracked agent
    if (!agentId || agentStats.agentId === agentId) {
      stats.value = agentStats
    }
  }

  /**
   * Setup AMI event listeners
   */
  function setupEventListeners(): void {
    const amiClient = client.value
    if (!amiClient || !realTimeUpdates) return

    // AgentComplete - call ended
    const completeHandler = (event: { data: AmiEventData }) => {
      if (event.data.Event === 'AgentComplete') {
        handleAgentComplete(event.data as unknown as AmiAgentCompleteEvent)
      }
    }

    // AgentRingNoAnswer - missed call
    const ringNoAnswerHandler = (event: { data: AmiEventData }) => {
      if (event.data.Event === 'AgentRingNoAnswer') {
        handleAgentRingNoAnswer(event.data as unknown as AmiAgentRingNoAnswerEvent)
      }
    }

    // QueueMemberStatus - member status updates
    const memberStatusHandler = (event: { data: AmiEventData }) => {
      if (event.data.Event === 'QueueMemberStatus') {
        handleQueueMemberStatus(event.data as unknown as AmiQueueMemberStatusEvent)
      }
    }

    amiClient.on('event', completeHandler)
    amiClient.on('event', ringNoAnswerHandler)
    amiClient.on('event', memberStatusHandler)

    eventListeners.push(
      () => amiClient.off('event', completeHandler),
      () => amiClient.off('event', ringNoAnswerHandler),
      () => amiClient.off('event', memberStatusHandler)
    )
  }

  /**
   * Remove event listeners
   */
  function removeEventListeners(): void {
    eventListeners.forEach((cleanup) => cleanup())
    eventListeners.length = 0
  }

  /**
   * Refresh stats from AMI
   */
  async function refresh(): Promise<void> {
    const amiClient = client.value
    if (!amiClient) {
      error.value = 'AMI client not available'
      onError?.('AMI client not available')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Get queue members to update login time and call counts
      const queueList = queues || []

      for (const queueName of queueList) {
        try {
          await amiClient.sendAction({
            Action: 'QueueStatus',
            Queue: queueName,
          })
        } catch (err) {
          logger.warn(`Failed to get status for queue ${queueName}:`, err)
        }
      }

      // If tracking specific agent, refresh their stats
      if (agentId && stats.value) {
        updatePerformance(stats.value)
        checkThresholds(stats.value)
        stats.value.lastUpdated = new Date()
        onStatsUpdate?.(stats.value)
      }

      // Persist if enabled
      if (persist) {
        saveToStorage()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh agent stats'
      error.value = message
      onError?.(message)
      logger.error('Failed to refresh agent stats:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Start tracking
   */
  function startTracking(): void {
    if (isTracking.value) return

    isTracking.value = true

    // Load from storage if persist enabled
    if (persist) {
      loadFromStorage()
    }

    // Initialize stats if tracking specific agent
    if (agentId) {
      stats.value = getOrCreateStats(agentId, interfacePattern || `PJSIP/${agentId}`, agentId)
    }

    // Setup event listeners
    setupEventListeners()

    // Start refresh timer
    if (refreshInterval > 0) {
      refreshTimer = setInterval(() => {
        refresh()
      }, refreshInterval)
    }

    // Initial refresh
    refresh()

    logger.info('Agent stats tracking started', { agentId, queues })
  }

  /**
   * Stop tracking
   */
  function stopTracking(): void {
    if (!isTracking.value) return

    isTracking.value = false

    // Remove event listeners
    removeEventListeners()

    // Stop refresh timer
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }

    // Persist before stopping
    if (persist) {
      saveToStorage()
    }

    logger.info('Agent stats tracking stopped', { agentId })
  }

  /**
   * Set statistics period
   */
  function setPeriod(period: AgentStatsPeriod, start?: Date, end?: Date): void {
    currentPeriod = period
    customStart = start
    customEnd = end

    // Reset stats for new period
    const { start: periodStart, end: periodEnd } = getPeriodBoundaries(period, start, end)

    for (const agentStats of allAgentStats.value.values()) {
      const newStats = createEmptyStats(
        agentStats.agentId,
        agentStats.interface,
        agentStats.name,
        period,
        periodStart,
        periodEnd
      )
      allAgentStats.value.set(agentStats.agentId, newStats)
    }

    if (agentId && stats.value) {
      stats.value = allAgentStats.value.get(agentId) || null
    }

    // Refresh with new period
    refresh()
  }

  /**
   * Get stats for specific agent
   */
  function getAgentStats(id: string): AgentStats | null {
    return allAgentStats.value.get(id) || null
  }

  /**
   * Compare agent to team average
   */
  function compareToTeam(id?: string): AgentStatsComparison | null {
    const targetId = id || agentId
    if (!targetId) return null

    const agentStats = allAgentStats.value.get(targetId)
    if (!agentStats) return null

    // Calculate team average
    const allStats = Array.from(allAgentStats.value.values())
    if (allStats.length === 0) return null

    const teamAverage: AgentPerformanceMetrics = {
      callsPerHour: allStats.reduce((sum, s) => sum + s.performance.callsPerHour, 0) / allStats.length,
      avgHandleTime: allStats.reduce((sum, s) => sum + s.performance.avgHandleTime, 0) / allStats.length,
      avgTalkTime: allStats.reduce((sum, s) => sum + s.performance.avgTalkTime, 0) / allStats.length,
      avgWrapTime: allStats.reduce((sum, s) => sum + s.performance.avgWrapTime, 0) / allStats.length,
      avgHoldTime: allStats.reduce((sum, s) => sum + s.performance.avgHoldTime, 0) / allStats.length,
      fcrRate: allStats.reduce((sum, s) => sum + s.performance.fcrRate, 0) / allStats.length,
      serviceLevel: allStats.reduce((sum, s) => sum + s.performance.serviceLevel, 0) / allStats.length,
      occupancy: allStats.reduce((sum, s) => sum + s.performance.occupancy, 0) / allStats.length,
      utilization: allStats.reduce((sum, s) => sum + s.performance.utilization, 0) / allStats.length,
      avgQualityScore: allStats.reduce((sum, s) => sum + s.performance.avgQualityScore, 0) / allStats.length,
      transferRate: allStats.reduce((sum, s) => sum + s.performance.transferRate, 0) / allStats.length,
      holdRate: allStats.reduce((sum, s) => sum + s.performance.holdRate, 0) / allStats.length,
    }

    // Calculate percentile rank based on total calls
    const sortedByPerformance = allStats
      .map((s) => ({ id: s.agentId, score: s.performance.serviceLevel * s.totalCalls }))
      .sort((a, b) => b.score - a.score)
    const rank = sortedByPerformance.findIndex((s) => s.id === targetId)
    const percentileRank = ((allStats.length - rank) / allStats.length) * 100

    // Identify strengths and improvement areas
    const strengths: string[] = []
    const improvementAreas: string[] = []

    if (agentStats.performance.serviceLevel > teamAverage.serviceLevel) strengths.push('Service Level')
    else if (agentStats.performance.serviceLevel < teamAverage.serviceLevel * 0.9) improvementAreas.push('Service Level')

    if (agentStats.performance.avgHandleTime < teamAverage.avgHandleTime) strengths.push('Handle Time')
    else if (agentStats.performance.avgHandleTime > teamAverage.avgHandleTime * 1.1)
      improvementAreas.push('Handle Time')

    if (agentStats.performance.callsPerHour > teamAverage.callsPerHour) strengths.push('Calls Per Hour')
    else if (agentStats.performance.callsPerHour < teamAverage.callsPerHour * 0.9)
      improvementAreas.push('Calls Per Hour')

    if (agentStats.performance.occupancy > teamAverage.occupancy) strengths.push('Occupancy')
    else if (agentStats.performance.occupancy < teamAverage.occupancy * 0.9) improvementAreas.push('Occupancy')

    return {
      agent: agentStats,
      teamAverage,
      percentileRank,
      strengths,
      improvementAreas,
    }
  }

  /**
   * Get call history
   */
  function getCallHistory(id?: string, limit?: number): AgentCallRecord[] {
    const targetId = id || agentId
    if (!targetId) {
      // Return all calls from all agents
      const allCalls: AgentCallRecord[] = []
      for (const agentStats of allAgentStats.value.values()) {
        allCalls.push(...agentStats.recentCalls)
      }
      allCalls.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      return limit ? allCalls.slice(0, limit) : allCalls
    }

    const agentStats = allAgentStats.value.get(targetId)
    if (!agentStats) return []

    return limit ? agentStats.recentCalls.slice(0, limit) : agentStats.recentCalls
  }

  /**
   * Get hourly breakdown
   */
  function getHourlyBreakdown(id?: string): HourlyStats[] {
    const targetId = id || agentId
    if (!targetId) return []

    const agentStats = allAgentStats.value.get(targetId)
    return agentStats?.hourlyStats || createEmptyHourlyStats()
  }

  /**
   * Get queue-specific stats
   */
  function getQueueStats(id?: string, queue?: string): AgentQueueStats[] {
    const targetId = id || agentId
    if (!targetId) return []

    const agentStats = allAgentStats.value.get(targetId)
    if (!agentStats) return []

    if (queue) {
      const queueStat = agentStats.queueStats.find((q) => q.queue === queue)
      return queueStat ? [queueStat] : []
    }

    return agentStats.queueStats
  }

  /**
   * Export as CSV
   */
  function exportCsv(id?: string): string {
    const targetId = id || agentId
    const calls = getCallHistory(targetId)

    const headers = [
      'Call ID',
      'Queue',
      'Remote Party',
      'Direction',
      'Start Time',
      'End Time',
      'Wait Time',
      'Talk Time',
      'Hold Time',
      'Wrap Time',
      'Disposition',
    ]

    const rows = calls.map((call) =>
      [
        escapeCsvField(call.callId),
        escapeCsvField(call.queue || ''),
        escapeCsvField(call.remoteParty),
        escapeCsvField(call.direction),
        escapeCsvField(call.startTime.toISOString()),
        escapeCsvField(call.endTime?.toISOString() || ''),
        escapeCsvField(call.waitTime),
        escapeCsvField(call.talkTime),
        escapeCsvField(call.holdTime),
        escapeCsvField(call.wrapTime),
        escapeCsvField(call.disposition),
      ].join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  /**
   * Export as JSON
   */
  function exportJson(id?: string): string {
    const targetId = id || agentId
    if (targetId) {
      const agentStats = allAgentStats.value.get(targetId)
      return JSON.stringify(agentStats, null, 2)
    }

    return JSON.stringify(Array.from(allAgentStats.value.values()), null, 2)
  }

  /**
   * Acknowledge an alert
   */
  function acknowledgeAlert(alertId: string): void {
    const alert = alerts.value.find((a) => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  /**
   * Acknowledge all alerts
   */
  function acknowledgeAllAlerts(): void {
    alerts.value.forEach((alert) => {
      alert.acknowledged = true
    })
  }

  /**
   * Clear history
   */
  function clearHistory(id?: string): void {
    const targetId = id || agentId
    if (targetId) {
      const agentStats = allAgentStats.value.get(targetId)
      if (agentStats) {
        agentStats.recentCalls = []
      }
    } else {
      for (const agentStats of allAgentStats.value.values()) {
        agentStats.recentCalls = []
      }
    }

    if (persist) {
      saveToStorage()
    }
  }

  /**
   * Reset stats
   */
  function resetStats(id?: string): void {
    const targetId = id || agentId
    const { start, end } = getPeriodBoundaries(currentPeriod, customStart, customEnd)

    if (targetId) {
      const existing = allAgentStats.value.get(targetId)
      if (existing) {
        const newStats = createEmptyStats(existing.agentId, existing.interface, existing.name, currentPeriod, start, end)
        allAgentStats.value.set(targetId, newStats)
        if (stats.value?.agentId === targetId) {
          stats.value = newStats
        }
      }
    } else {
      for (const [id, existing] of allAgentStats.value.entries()) {
        const newStats = createEmptyStats(existing.agentId, existing.interface, existing.name, currentPeriod, start, end)
        allAgentStats.value.set(id, newStats)
      }
      stats.value = agentId ? allAgentStats.value.get(agentId) || null : null
    }

    if (persist) {
      saveToStorage()
    }
  }

  /**
   * Save to localStorage
   */
  function saveToStorage(): void {
    try {
      const data = {
        stats: Array.from(allAgentStats.value.entries()).map(([_id, s]) => ({
          ...s,
          periodStart: s.periodStart.toISOString(),
          periodEnd: s.periodEnd.toISOString(),
          lastUpdated: s.lastUpdated.toISOString(),
          recentCalls: s.recentCalls.map((c) => ({
            ...c,
            startTime: c.startTime.toISOString(),
            answerTime: c.answerTime?.toISOString(),
            endTime: c.endTime?.toISOString(),
          })),
        })),
        alerts: alerts.value.map((a) => ({
          ...a,
          timestamp: a.timestamp.toISOString(),
        })),
      }
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (err) {
      logger.warn('Failed to save agent stats to storage:', err)
    }
  }

  /**
   * Load from localStorage
   */
  function loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return

      const data = JSON.parse(stored)

      // Validate data structure
      if (!data || typeof data !== 'object') return

      // Load stats
      if (Array.isArray(data.stats)) {
        for (const s of data.stats) {
          if (typeof s.agentId === 'string') {
            const agentStats: AgentStats = {
              ...s,
              periodStart: new Date(s.periodStart),
              periodEnd: new Date(s.periodEnd),
              lastUpdated: new Date(s.lastUpdated),
              recentCalls: (s.recentCalls || []).map((c: Record<string, unknown>) => ({
                ...c,
                startTime: new Date(c.startTime as string),
                answerTime: c.answerTime ? new Date(c.answerTime as string) : undefined,
                endTime: c.endTime ? new Date(c.endTime as string) : undefined,
              })),
            }
            allAgentStats.value.set(s.agentId, agentStats)
          }
        }
      }

      // Load alerts
      if (Array.isArray(data.alerts)) {
        alerts.value = data.alerts.map((a: Record<string, unknown>) => ({
          ...a,
          timestamp: new Date(a.timestamp as string),
        })) as StatsAlert[]
      }

      // Update primary stats
      if (agentId) {
        stats.value = allAgentStats.value.get(agentId) || null
      }
    } catch (err) {
      logger.warn('Failed to load agent stats from storage:', err)
    }
  }

  // Watch for client changes
  watch(client, (newClient, oldClient) => {
    if (oldClient && isTracking.value) {
      removeEventListeners()
    }
    if (newClient && isTracking.value) {
      setupEventListeners()
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    // State
    stats,
    allAgentStats,
    alerts,
    isLoading,
    error,
    isTracking,

    // Computed
    performanceLevel,
    callsPerHour,
    avgHandleTime,
    serviceLevel,
    occupancy,
    utilization,
    formattedTalkTime,
    formattedLoginTime,
    alertCount,
    topQueues,
    peakHours,

    // Methods
    startTracking,
    stopTracking,
    refresh,
    setPeriod,
    getAgentStats,
    compareToTeam,
    getCallHistory,
    getHourlyBreakdown,
    getQueueStats,
    exportCsv,
    exportJson,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    clearHistory,
    resetStats,
    recordCall,
    recordWrapTime,
  }
}

export type { UseAmiAgentStatsReturn }
