/**
 * @vuesip/enterprise - Analytics Types
 *
 * Type definitions for call center analytics and reporting.
 *
 * @module analytics/types
 */

/**
 * Aggregated call metrics for a time period
 */
export interface CallMetrics {
  /** Total number of calls in the period */
  totalCalls: number
  /** Number of calls that were completed successfully */
  completedCalls: number
  /** Number of calls that were missed (not answered) */
  missedCalls: number
  /** Number of calls abandoned by caller before answer */
  abandonedCalls: number
  /** Average handle time in seconds (talk time + wrap-up) */
  averageHandleTime: number
  /** Average wait time in queue in seconds */
  averageWaitTime: number
  /** Percentage of calls answered within service level threshold */
  serviceLevelPercent: number
  /** Percentage of calls resolved on first contact */
  firstCallResolution: number
}

/**
 * Individual agent performance metrics
 */
export interface AgentMetrics {
  /** Unique identifier for the agent */
  agentId: string
  /** Display name of the agent */
  agentName: string
  /** Total number of calls handled */
  totalCalls: number
  /** Average handle time in seconds (talk + hold + wrap-up) */
  averageHandleTime: number
  /** Average talk time in seconds */
  averageTalkTime: number
  /** Average wrap-up/after-call work time in seconds */
  averageWrapUpTime: number
  /** Percentage of time spent on calls (0-100) */
  occupancy: number
  /** Percentage of time in available state (0-100) */
  availability: number
  /** Percentage of calls meeting service level */
  serviceLevel: number
  /** Customer satisfaction score (1-5 scale) */
  customerSatisfaction?: number
  /** Average sentiment score (-1 to 1) */
  sentimentScore?: number
}

/**
 * Queue health and status metrics
 */
export interface QueueMetrics {
  /** Name of the queue */
  queueName: string
  /** Number of calls currently waiting in queue */
  callsWaiting: number
  /** Number of calls currently being handled */
  callsInProgress: number
  /** Longest current wait time in seconds */
  longestWait: number
  /** Average wait time in seconds */
  averageWait: number
  /** Percentage of calls abandoned (0-100) */
  abandonRate: number
  /** Percentage meeting service level (0-100) */
  serviceLevelPercent: number
  /** Number of agents in available state */
  agentsAvailable: number
  /** Number of agents currently on calls */
  agentsBusy: number
  /** Number of agents in paused/break state */
  agentsPaused: number
}

/**
 * Sentiment analysis metrics
 */
export interface SentimentMetrics {
  /** Average sentiment score (-1 to 1) */
  averageSentiment: number
  /** Percentage of calls with positive sentiment (0-100) */
  positivePercent: number
  /** Percentage of calls with neutral sentiment (0-100) */
  neutralPercent: number
  /** Percentage of calls with negative sentiment (0-100) */
  negativePercent: number
  /** Percentage of calls escalated (0-100) */
  escalationRate: number
  /** Direction of sentiment trend */
  trendDirection: 'improving' | 'declining' | 'stable'
}

/**
 * Time range for analytics queries
 */
export interface TimeRange {
  /** Start of the time range */
  start: Date
  /** End of the time range */
  end: Date
  /** Data aggregation granularity */
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month'
}

/**
 * Single data point for time series charts
 */
export interface DataPoint {
  /** Timestamp of the data point */
  timestamp: Date
  /** Numeric value */
  value: number
  /** Optional label for display */
  label?: string
}

/**
 * Configuration options for analytics
 */
export interface AnalyticsConfig {
  /** Refresh interval in milliseconds */
  refreshInterval?: number
  /** Time range for data queries */
  timeRange?: TimeRange
  /** Enable real-time updates */
  enableRealtime?: boolean
  /** Service level threshold in seconds (default: 20) */
  serviceLevelThreshold?: number
}

/**
 * Call outcome types
 */
export type CallOutcome = 'completed' | 'missed' | 'abandoned'

/**
 * Agent state types
 */
export type AgentState = 'available' | 'busy' | 'paused' | 'wrap-up' | 'offline'

/**
 * Data for recording a call
 */
export interface CallRecordData {
  /** Call duration in seconds */
  duration: number
  /** Wait time before answer in seconds */
  waitTime: number
  /** Agent who handled the call */
  agentId: string
  /** Queue the call came from */
  queueName: string
  /** Call outcome */
  outcome: CallOutcome
  /** Sentiment score (-1 to 1) */
  sentiment?: number
  /** Whether call was resolved on first contact */
  firstCallResolved?: boolean
  /** Talk time in seconds */
  talkTime?: number
  /** Hold time in seconds */
  holdTime?: number
  /** Wrap-up time in seconds */
  wrapUpTime?: number
  /** Timestamp of the call */
  timestamp?: Date
}

/**
 * Internal call record with computed fields
 */
export interface CallRecord extends CallRecordData {
  /** Unique identifier */
  id: string
  /** Timestamp of the call */
  timestamp: Date
}

/**
 * Internal agent state record
 */
export interface AgentStateRecord {
  /** Agent identifier */
  agentId: string
  /** Agent display name */
  agentName: string
  /** Current state */
  state: AgentState
  /** When state last changed */
  stateChangedAt: Date
  /** Cumulative time in each state (seconds) */
  stateTime: Record<AgentState, number>
  /** Call statistics */
  callStats: {
    totalCalls: number
    totalTalkTime: number
    totalHoldTime: number
    totalWrapUpTime: number
    totalHandleTime: number
    serviceLevelMet: number
    firstCallResolutions: number
    totalSentiment: number
    sentimentCount: number
  }
}

/**
 * Internal queue state record
 */
export interface QueueStateRecord {
  /** Queue name */
  queueName: string
  /** Calls currently waiting */
  waitingCalls: Array<{ id: string; waitingSince: Date }>
  /** Calls currently in progress */
  inProgressCalls: string[]
  /** Total calls received */
  totalCalls: number
  /** Calls answered within SLA */
  serviceLevelMet: number
  /** Calls abandoned */
  abandonedCalls: number
  /** Cumulative wait time */
  totalWaitTime: number
  /** Assigned agents */
  agents: Set<string>
}

/**
 * Report generation options
 */
export interface ReportOptions {
  /** Include agent details */
  includeAgents?: boolean
  /** Include queue details */
  includeQueues?: boolean
  /** Include sentiment analysis */
  includeSentiment?: boolean
  /** Include time series data */
  includeTimeSeries?: boolean
  /** Custom title for the report */
  title?: string
}
