/**
 * Agent Statistics Types
 *
 * Type definitions for individual agent analytics and performance metrics.
 * Supports per-agent tracking, historical data, and KPI calculations.
 *
 * @module types/agentstats
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * Time period for statistics aggregation
 */
export type AgentStatsPeriod = 'today' | 'week' | 'month' | 'custom'

/**
 * Agent performance level based on KPIs
 */
export type AgentPerformanceLevel = 'excellent' | 'good' | 'average' | 'needs_improvement' | 'critical'

/**
 * Call direction for agent statistics
 */
export type AgentCallDirection = 'inbound' | 'outbound' | 'internal'

/**
 * Individual call record for agent
 */
export interface AgentCallRecord {
  /** Unique call identifier */
  callId: string

  /** Queue name (for inbound) */
  queue?: string

  /** Caller/callee identifier */
  remoteParty: string

  /** Call direction */
  direction: AgentCallDirection

  /** Call start timestamp */
  startTime: Date

  /** Call answer timestamp */
  answerTime?: Date

  /** Call end timestamp */
  endTime?: Date

  /** Wait time before answer (seconds) - for queue calls */
  waitTime: number

  /** Talk time (seconds) */
  talkTime: number

  /** Hold time during call (seconds) */
  holdTime: number

  /** Wrap/ACW time after call (seconds) */
  wrapTime: number

  /** Call disposition */
  disposition: 'answered' | 'missed' | 'abandoned' | 'transferred' | 'voicemail'

  /** Transfer destination if transferred */
  transferredTo?: string

  /** Whether call was recorded */
  recorded: boolean

  /** Call quality score (MOS) if available */
  qualityScore?: number

  /** Custom tags */
  tags?: string[]
}

/**
 * Hourly statistics bucket
 */
export interface HourlyStats {
  /** Hour (0-23) */
  hour: number

  /** Number of calls */
  callCount: number

  /** Total talk time (seconds) */
  talkTime: number

  /** Average handle time (seconds) */
  avgHandleTime: number

  /** Service level percentage */
  serviceLevel: number
}

/**
 * Queue-specific agent statistics
 */
export interface AgentQueueStats {
  /** Queue name */
  queue: string

  /** Calls handled from this queue */
  callsHandled: number

  /** Calls missed from this queue */
  callsMissed: number

  /** Total talk time in this queue (seconds) */
  talkTime: number

  /** Average handle time for this queue (seconds) */
  avgHandleTime: number

  /** Average wait time for calls from this queue (seconds) */
  avgWaitTime: number

  /** Service level for this queue (percentage) */
  serviceLevel: number

  /** Time spent logged into this queue (seconds) */
  loginTime: number

  /** Time spent available in this queue (seconds) */
  availableTime: number

  /** Time spent paused in this queue (seconds) */
  pausedTime: number
}

/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  /** Calls per hour */
  callsPerHour: number

  /** Average handle time (seconds) */
  avgHandleTime: number

  /** Average talk time (seconds) */
  avgTalkTime: number

  /** Average wrap time (seconds) */
  avgWrapTime: number

  /** Average hold time per call (seconds) */
  avgHoldTime: number

  /** First call resolution rate (percentage) */
  fcrRate: number

  /** Service level percentage (calls answered within threshold) */
  serviceLevel: number

  /** Occupancy rate (talk time / logged in time) */
  occupancy: number

  /** Utilization rate ((talk + wrap) / logged in time) */
  utilization: number

  /** Average quality score (MOS) */
  avgQualityScore: number

  /** Transfer rate (percentage) */
  transferRate: number

  /** Hold rate (percentage of calls with holds) */
  holdRate: number
}

/**
 * Aggregated agent statistics
 */
export interface AgentStats {
  /** Agent identifier */
  agentId: string

  /** Agent interface (e.g., PJSIP/1001) */
  interface: string

  /** Agent display name */
  name: string

  /** Statistics period */
  period: AgentStatsPeriod

  /** Period start date */
  periodStart: Date

  /** Period end date */
  periodEnd: Date

  /** Total calls handled */
  totalCalls: number

  /** Inbound calls */
  inboundCalls: number

  /** Outbound calls */
  outboundCalls: number

  /** Internal calls */
  internalCalls: number

  /** Missed calls */
  missedCalls: number

  /** Transferred calls */
  transferredCalls: number

  /** Calls sent to voicemail */
  voicemailCalls: number

  /** Total talk time (seconds) */
  totalTalkTime: number

  /** Total hold time (seconds) */
  totalHoldTime: number

  /** Total wrap/ACW time (seconds) */
  totalWrapTime: number

  /** Total handle time (talk + hold + wrap) (seconds) */
  totalHandleTime: number

  /** Total login time (seconds) */
  totalLoginTime: number

  /** Total available time (seconds) */
  totalAvailableTime: number

  /** Total paused time (seconds) */
  totalPausedTime: number

  /** Total on-call time (seconds) */
  totalOnCallTime: number

  /** Performance metrics */
  performance: AgentPerformanceMetrics

  /** Per-queue statistics */
  queueStats: AgentQueueStats[]

  /** Hourly breakdown (24 hours) */
  hourlyStats: HourlyStats[]

  /** Recent call records */
  recentCalls: AgentCallRecord[]

  /** Performance level assessment */
  performanceLevel: AgentPerformanceLevel

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Agent statistics comparison
 */
export interface AgentStatsComparison {
  /** Agent being compared */
  agent: AgentStats

  /** Team/queue average for comparison */
  teamAverage: AgentPerformanceMetrics

  /** Percentile rank (0-100) */
  percentileRank: number

  /** Areas where agent excels */
  strengths: string[]

  /** Areas for improvement */
  improvementAreas: string[]
}

/**
 * Statistics threshold for alerts
 */
export interface StatsThreshold {
  /** Metric name */
  metric: keyof AgentPerformanceMetrics

  /** Warning threshold */
  warningThreshold: number

  /** Critical threshold */
  criticalThreshold: number

  /** Whether higher is better */
  higherIsBetter: boolean
}

/**
 * Statistics alert
 */
export interface StatsAlert {
  /** Alert ID */
  id: string

  /** Agent ID */
  agentId: string

  /** Metric that triggered alert */
  metric: keyof AgentPerformanceMetrics

  /** Current value */
  currentValue: number

  /** Threshold value */
  thresholdValue: number

  /** Alert level */
  level: 'warning' | 'critical'

  /** Alert message */
  message: string

  /** Alert timestamp */
  timestamp: Date

  /** Whether alert has been acknowledged */
  acknowledged: boolean
}

/**
 * Options for useAmiAgentStats composable
 */
export interface UseAmiAgentStatsOptions {
  /** Agent ID to track (optional, track all if not specified) */
  agentId?: string

  /** Agent interface pattern to track (e.g., 'PJSIP/*') */
  interfacePattern?: string

  /** Queues to track (optional, all queues if not specified) */
  queues?: string[]

  /** Statistics period */
  period?: AgentStatsPeriod

  /** Custom period start (for period='custom') */
  customStart?: Date

  /** Custom period end (for period='custom') */
  customEnd?: Date

  /** Service level threshold in seconds (default: 20) */
  serviceLevelThreshold?: number

  /** Maximum recent calls to keep (default: 50) */
  maxRecentCalls?: number

  /** Stats refresh interval in ms (default: 30000) */
  refreshInterval?: number

  /** Enable real-time updates via AMI events */
  realTimeUpdates?: boolean

  /** Performance thresholds for alerts */
  thresholds?: StatsThreshold[]

  /** Callback when stats are updated */
  onStatsUpdate?: (stats: AgentStats) => void

  /** Callback when alert is triggered */
  onAlert?: (alert: StatsAlert) => void

  /** Callback on error */
  onError?: (error: string) => void

  /** Persist stats to localStorage */
  persist?: boolean

  /** Storage key for persistence */
  storageKey?: string
}

/**
 * Return type for useAmiAgentStats composable
 */
export interface UseAmiAgentStatsReturn {
  // State
  /** Current agent statistics */
  stats: Ref<AgentStats | null>

  /** All tracked agents statistics (when tracking multiple) */
  allAgentStats: Ref<Map<string, AgentStats>>

  /** Active alerts */
  alerts: Ref<StatsAlert[]>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message */
  error: Ref<string | null>

  /** Whether real-time tracking is active */
  isTracking: Ref<boolean>

  // Computed
  /** Current performance level */
  performanceLevel: ComputedRef<AgentPerformanceLevel | null>

  /** Calls per hour (current) */
  callsPerHour: ComputedRef<number>

  /** Average handle time */
  avgHandleTime: ComputedRef<number>

  /** Service level percentage */
  serviceLevel: ComputedRef<number>

  /** Occupancy rate */
  occupancy: ComputedRef<number>

  /** Utilization rate */
  utilization: ComputedRef<number>

  /** Formatted talk time (HH:MM:SS) */
  formattedTalkTime: ComputedRef<string>

  /** Formatted login time (HH:MM:SS) */
  formattedLoginTime: ComputedRef<string>

  /** Unacknowledged alerts count */
  alertCount: ComputedRef<number>

  /** Top performing queues for agent */
  topQueues: ComputedRef<AgentQueueStats[]>

  /** Peak hours based on call volume */
  peakHours: ComputedRef<number[]>

  // Methods
  /** Start tracking agent statistics */
  startTracking: () => void

  /** Stop tracking agent statistics */
  stopTracking: () => void

  /** Refresh statistics from AMI */
  refresh: () => Promise<void>

  /** Set statistics period */
  setPeriod: (period: AgentStatsPeriod, customStart?: Date, customEnd?: Date) => void

  /** Get statistics for specific agent */
  getAgentStats: (agentId: string) => AgentStats | null

  /** Compare agent to team average */
  compareToTeam: (agentId?: string) => AgentStatsComparison | null

  /** Get call history for agent */
  getCallHistory: (agentId?: string, limit?: number) => AgentCallRecord[]

  /** Get hourly breakdown */
  getHourlyBreakdown: (agentId?: string) => HourlyStats[]

  /** Get queue-specific stats */
  getQueueStats: (agentId?: string, queue?: string) => AgentQueueStats[]

  /** Export statistics as CSV */
  exportCsv: (agentId?: string) => string

  /** Export statistics as JSON */
  exportJson: (agentId?: string) => string

  /** Acknowledge an alert */
  acknowledgeAlert: (alertId: string) => void

  /** Acknowledge all alerts */
  acknowledgeAllAlerts: () => void

  /** Clear old call records */
  clearHistory: (agentId?: string) => void

  /** Reset statistics for current period */
  resetStats: (agentId?: string) => void

  /** Register a call completion (for manual tracking) */
  recordCall: (call: Omit<AgentCallRecord, 'callId'>) => void

  /** Update wrap time for last call */
  recordWrapTime: (callId: string, wrapTime: number) => void
}

/**
 * AMI AgentComplete event (queue call completed)
 */
export interface AmiAgentCompleteEvent {
  Event: 'AgentComplete'
  Queue: string
  Uniqueid: string
  Channel: string
  Member: string
  MemberName: string
  Interface: string
  HoldTime: string
  TalkTime: string
  Reason: 'operator' | 'caller' | 'transfer'
  RingTime?: string
}

/**
 * AMI AgentConnect event (agent connected to caller)
 */
export interface AmiAgentConnectEvent {
  Event: 'AgentConnect'
  Queue: string
  Uniqueid: string
  Channel: string
  Member: string
  MemberName: string
  Interface: string
  HoldTime: string
  RingTime?: string
  Bridgedchannel?: string
}

/**
 * AMI AgentCalled event (queue trying to reach agent)
 */
export interface AmiAgentCalledEvent {
  Event: 'AgentCalled'
  Queue: string
  Uniqueid: string
  Channel: string
  Interface: string
  MemberName: string
  CallerId?: string
  CallerIdNum?: string
  CallerIdName?: string
}

/**
 * AMI AgentRingNoAnswer event (agent didn't answer)
 */
export interface AmiAgentRingNoAnswerEvent {
  Event: 'AgentRingNoAnswer'
  Queue: string
  Uniqueid: string
  Channel: string
  Interface: string
  MemberName: string
  Member: string
  RingTime: string
}
