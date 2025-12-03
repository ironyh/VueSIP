/**
 * CDR (Call Detail Record) Types for AMI Integration
 *
 * Type definitions for real-time CDR processing via AMI.
 * Supports both standard Cdr events and CEL (Channel Event Logging).
 *
 * @module types/cdr
 */

import type { Ref, ComputedRef } from 'vue'
import type { AmiEventData } from './ami.types'

/**
 * Call disposition (final status)
 */
export type CdrDisposition =
  | 'ANSWERED' // Call was answered
  | 'NO ANSWER' // Call was not answered (timeout)
  | 'BUSY' // Callee was busy
  | 'FAILED' // Call failed to connect
  | 'CONGESTION' // Network congestion
  | 'CANCEL' // Caller hung up before answer

/**
 * Call direction
 */
export type CdrDirection = 'inbound' | 'outbound' | 'internal' | 'unknown'

/**
 * CDR aggregation period
 */
export type CdrAggregationPeriod = 'hour' | 'day' | 'week' | 'month'

/**
 * Individual CDR record
 */
export interface CdrRecord {
  /** Unique ID for the CDR */
  uniqueId: string

  /** Account code */
  accountCode: string

  /** Source (caller) number */
  source: string

  /** Destination number */
  destination: string

  /** Destination context */
  destinationContext: string

  /** Caller ID */
  callerId: string

  /** Channel used */
  channel: string

  /** Destination channel */
  destinationChannel: string

  /** Last application executed */
  lastApplication: string

  /** Last application data */
  lastData: string

  /** Call start time */
  startTime: Date

  /** Call answer time */
  answerTime: Date | null

  /** Call end time */
  endTime: Date

  /** Total call duration in seconds (ring + talk) */
  duration: number

  /** Billable seconds (time after answer) */
  billableSeconds: number

  /** Call disposition */
  disposition: CdrDisposition

  /** AMA flags */
  amaFlags: string

  /** User field */
  userField: string

  /** Call direction */
  direction: CdrDirection

  /** Server ID for multi-server setups */
  serverId?: number

  /** Queue name if applicable */
  queue?: string

  /** Agent who handled if applicable */
  agent?: string

  /** Additional custom fields */
  customFields?: Record<string, string>
}

/**
 * Aggregated CDR statistics
 */
export interface CdrStats {
  /** Total number of calls */
  totalCalls: number

  /** Number of answered calls */
  answeredCalls: number

  /** Number of missed calls */
  missedCalls: number

  /** Number of failed calls */
  failedCalls: number

  /** Total talk time in seconds */
  totalTalkTime: number

  /** Average talk time in seconds */
  averageTalkTime: number

  /** Average ring time in seconds */
  averageRingTime: number

  /** Answer rate percentage (0-100) */
  answerRate: number

  /** Calls by disposition */
  byDisposition: Record<CdrDisposition, number>

  /** Calls by hour of day (0-23) */
  byHour: Record<number, number>

  /** Calls by day of week (0-6, 0=Sunday) */
  byDayOfWeek: Record<number, number>

  /** Start of the period */
  periodStart: Date

  /** End of the period */
  periodEnd: Date
}

/**
 * Agent-specific CDR statistics
 */
export interface AgentCdrStats {
  /** Agent identifier */
  agent: string

  /** Total calls handled */
  callsHandled: number

  /** Total talk time in seconds */
  totalTalkTime: number

  /** Average talk time in seconds */
  averageTalkTime: number

  /** Total wrap time in seconds (if tracked) */
  totalWrapTime: number

  /** Average handle time (talk + wrap) */
  averageHandleTime: number

  /** Calls by disposition */
  byDisposition: Record<CdrDisposition, number>

  /** Service level achievement percentage */
  serviceLevelPct?: number

  /** Period start */
  periodStart: Date

  /** Period end */
  periodEnd: Date
}

/**
 * Queue-specific CDR statistics
 */
export interface QueueCdrStats {
  /** Queue name */
  queue: string

  /** Total calls offered */
  callsOffered: number

  /** Total calls answered */
  callsAnswered: number

  /** Total calls abandoned */
  callsAbandoned: number

  /** Average wait time in seconds */
  averageWaitTime: number

  /** Average talk time in seconds */
  averageTalkTime: number

  /** Service level percentage */
  serviceLevelPct: number

  /** Service level threshold in seconds */
  serviceLevelThreshold: number

  /** Abandonment rate percentage */
  abandonmentRate: number

  /** Calls by agent */
  byAgent: Record<string, number>

  /** Period start */
  periodStart: Date

  /** Period end */
  periodEnd: Date
}

/**
 * CDR filter options
 */
export interface CdrFilter {
  /** Filter by source number */
  source?: string

  /** Filter by destination number */
  destination?: string

  /** Filter by call direction */
  direction?: CdrDirection

  /** Filter by disposition */
  disposition?: CdrDisposition | CdrDisposition[]

  /** Filter by queue */
  queue?: string

  /** Filter by agent */
  agent?: string

  /** Filter by account code */
  accountCode?: string

  /** Start date/time */
  startDate?: Date

  /** End date/time */
  endDate?: Date

  /** Minimum duration in seconds */
  minDuration?: number

  /** Maximum duration in seconds */
  maxDuration?: number

  /** Limit number of results */
  limit?: number

  /** Offset for pagination */
  offset?: number

  /** Sort by field */
  sortBy?: 'startTime' | 'duration' | 'billableSeconds' | 'source' | 'destination'

  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}

/**
 * CDR export options
 */
export interface CdrExportOptions {
  /** Export format */
  format: 'csv' | 'json'

  /** Fields to include */
  fields?: (keyof CdrRecord)[]

  /** Include header row (CSV only) */
  includeHeader?: boolean

  /** Date format string */
  dateFormat?: string

  /** Filename for download */
  filename?: string
}

/**
 * AMI Cdr event data
 */
export interface AmiCdrEvent extends AmiEventData {
  Event: 'Cdr'
  AccountCode: string
  Source: string
  Destination: string
  DestinationContext: string
  CallerID: string
  Channel: string
  DestinationChannel: string
  LastApplication: string
  LastData: string
  StartTime: string
  AnswerTime: string
  EndTime: string
  Duration: string
  BillableSeconds: string
  Disposition: string
  AMAFlags: string
  UniqueID: string
  UserField: string
}

/**
 * AMI CEL (Channel Event Logging) event
 */
export interface AmiCelEvent extends AmiEventData {
  Event: 'CEL'
  EventName: string
  AccountCode: string
  CallerIDnum: string
  CallerIDname: string
  CallerIDani: string
  CallerIDrdnis: string
  CallerIDdnid: string
  Exten: string
  Context: string
  Channel: string
  Application: string
  AppData: string
  EventTime: string
  AMAFlags: string
  UniqueID: string
  LinkedID: string
  Userfield: string
  Peer: string
  PeerAccount: string
  Extra: string
}

/**
 * Options for useAmiCDR composable
 */
export interface UseAmiCDROptions {
  /** Maximum CDR records to keep in memory */
  maxRecords?: number

  /** Auto-calculate statistics */
  autoStats?: boolean

  /** Statistics aggregation period */
  statsPeriod?: CdrAggregationPeriod

  /** Enable CEL event tracking */
  trackCel?: boolean

  /** Filter for incoming CDRs */
  filter?: CdrFilter

  /** Custom direction detection function */
  detectDirection?: (cdr: CdrRecord) => CdrDirection

  /** Callback when CDR is received */
  onCdr?: (cdr: CdrRecord) => void

  /** Callback when stats are updated */
  onStatsUpdate?: (stats: CdrStats) => void

  /** Transform CDR record */
  transformCdr?: (cdr: CdrRecord) => CdrRecord
}

/**
 * Return type for useAmiCDR composable
 */
export interface UseAmiCDRReturn {
  // State
  /** List of CDR records */
  records: Ref<CdrRecord[]>

  /** Current statistics */
  stats: ComputedRef<CdrStats>

  /** Statistics by agent */
  agentStats: ComputedRef<Record<string, AgentCdrStats>>

  /** Statistics by queue */
  queueStats: ComputedRef<Record<string, QueueCdrStats>>

  /** Whether currently processing */
  isProcessing: Ref<boolean>

  /** Error message if any */
  error: Ref<string | null>

  /** Total CDR count (may be higher than records.length due to maxRecords) */
  totalCount: Ref<number>

  // Methods
  /** Get filtered CDR records */
  getRecords: (filter?: CdrFilter) => CdrRecord[]

  /** Get statistics for a specific period */
  getStats: (startDate: Date, endDate: Date) => CdrStats

  /** Get agent statistics */
  getAgentStats: (agent: string, startDate?: Date, endDate?: Date) => AgentCdrStats | null

  /** Get queue statistics */
  getQueueStats: (queue: string, startDate?: Date, endDate?: Date) => QueueCdrStats | null

  /** Export CDR records */
  exportRecords: (options: CdrExportOptions, filter?: CdrFilter) => string

  /** Clear all records */
  clearRecords: () => void

  /** Subscribe to CDR events */
  onCdrEvent: (callback: (cdr: CdrRecord) => void) => () => void

  /** Get calls for today */
  getTodayCalls: () => CdrRecord[]

  /** Get hourly breakdown for a date */
  getHourlyBreakdown: (date: Date) => Record<number, CdrStats>

  /** Calculate service level percentage */
  calculateServiceLevel: (threshold: number, startDate?: Date, endDate?: Date) => number

  /** Get call detail by unique ID */
  getCallDetail: (uniqueId: string) => CdrRecord | undefined
}
