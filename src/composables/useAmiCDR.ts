/**
 * AMI CDR (Call Detail Record) Composable
 *
 * Vue composable for real-time CDR processing via AMI WebSocket proxy.
 * Provides CDR event streaming, aggregation, statistics, and export.
 *
 * @module composables/useAmiCDR
 *
 * @example
 * ```typescript
 * import { computed } from 'vue'
 * import { useAmi, useAmiCDR } from 'vuesip'
 *
 * const ami = useAmi()
 * const {
 *   records,
 *   stats,
 *   agentStats,
 *   queueStats,
 *   getRecords,
 *   exportRecords
 * } = useAmiCDR(computed(() => ami.getClient()))
 *
 * // Get today's calls
 * const todayCalls = getTodayCalls()
 *
 * // Get statistics
 * console.log(`Answer rate: ${stats.value.answerRate}%`)
 *
 * // Export to CSV
 * const csv = exportRecords({ format: 'csv' })
 * ```
 */

import { ref, computed, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import type { AmiClient } from '../core/AmiClient'
import type { AmiMessage, AmiEventData } from '../types/ami.types'
import type {
  CdrRecord,
  CdrStats,
  AgentCdrStats,
  QueueCdrStats,
  CdrFilter,
  CdrExportOptions,
  CdrDisposition,
  CdrDirection,
  AmiCdrEvent,
  UseAmiCDROptions,
  UseAmiCDRReturn,
} from '../types/cdr.types'
import { createLogger } from '../utils/logger'

const logger = createLogger('useAmiCDR')

/**
 * Default maximum records to keep in memory
 */
const DEFAULT_MAX_RECORDS = 1000

/**
 * Parse date string safely, returning null for invalid dates
 */
function parseDateSafe(dateString: string | undefined | null): Date | null {
  if (!dateString || dateString.trim() === '') return null
  const date = new Date(dateString)
  // Check for Invalid Date
  if (isNaN(date.getTime())) return null
  return date
}

/**
 * Parse AMI CDR event into CdrRecord
 */
function parseCdrEvent(
  event: AmiCdrEvent,
  detectDirection?: (cdr: CdrRecord) => CdrDirection
): CdrRecord {
  const startTime = parseDateSafe(event.StartTime) || new Date()
  const answerTime = parseDateSafe(event.AnswerTime)
  const endTime = parseDateSafe(event.EndTime) || new Date()
  const duration = parseInt(event.Duration, 10) || 0
  const billableSeconds = parseInt(event.BillableSeconds, 10) || 0

  // Map disposition string to type
  const dispositionMap: Record<string, CdrDisposition> = {
    ANSWERED: 'ANSWERED',
    'NO ANSWER': 'NO ANSWER',
    NOANSWER: 'NO ANSWER',
    BUSY: 'BUSY',
    FAILED: 'FAILED',
    CONGESTION: 'CONGESTION',
    CANCEL: 'CANCEL',
  }

  const disposition = dispositionMap[event.Disposition?.toUpperCase()] || 'FAILED'

  const cdr: CdrRecord = {
    uniqueId: event.UniqueID,
    accountCode: event.AccountCode || '',
    source: event.Source || '',
    destination: event.Destination || '',
    destinationContext: event.DestinationContext || '',
    callerId: event.CallerID || '',
    channel: event.Channel || '',
    destinationChannel: event.DestinationChannel || '',
    lastApplication: event.LastApplication || '',
    lastData: event.LastData || '',
    startTime,
    answerTime,
    endTime,
    duration,
    billableSeconds,
    disposition,
    amaFlags: event.AMAFlags || '',
    userField: event.UserField || '',
    direction: 'unknown',
  }

  // Detect direction
  if (detectDirection) {
    cdr.direction = detectDirection(cdr)
  } else {
    cdr.direction = detectCallDirection(cdr)
  }

  // Extract queue and agent from channel/app data
  if (cdr.lastApplication === 'Queue') {
    cdr.queue = cdr.lastData.split(',')[0]
  }

  // Try to extract agent from destination channel
  const agentMatch = cdr.destinationChannel.match(/^(?:SIP|PJSIP|IAX2)\/(\d+)-/)
  if (agentMatch) {
    cdr.agent = agentMatch[1]
  }

  return cdr
}

/**
 * Default call direction detection
 */
function detectCallDirection(cdr: CdrRecord): CdrDirection {
  // Check for external trunks (common patterns)
  const externalTrunkPatterns = [
    /^(?:SIP|PJSIP|IAX2|DAHDI)\/trunk/i,
    /^(?:SIP|PJSIP|IAX2|DAHDI)\/provider/i,
    /^(?:SIP|PJSIP|IAX2|DAHDI)\/gateway/i,
  ]

  const isSourceExternal = externalTrunkPatterns.some((p) => p.test(cdr.channel))
  const isDestExternal = externalTrunkPatterns.some((p) => p.test(cdr.destinationChannel))

  if (isSourceExternal && !isDestExternal) {
    return 'inbound'
  } else if (!isSourceExternal && isDestExternal) {
    return 'outbound'
  } else if (!isSourceExternal && !isDestExternal) {
    return 'internal'
  }

  return 'unknown'
}

/**
 * Calculate statistics from CDR records
 */
function calculateStats(records: CdrRecord[], startDate?: Date, endDate?: Date): CdrStats {
  const filtered = records.filter((r) => {
    if (startDate && r.startTime < startDate) return false
    if (endDate && r.startTime > endDate) return false
    return true
  })

  const totalCalls = filtered.length
  const answeredCalls = filtered.filter((r) => r.disposition === 'ANSWERED').length
  const missedCalls = filtered.filter(
    (r) => r.disposition === 'NO ANSWER' || r.disposition === 'CANCEL'
  ).length
  const failedCalls = filtered.filter(
    (r) => r.disposition === 'FAILED' || r.disposition === 'CONGESTION'
  ).length

  const answeredRecords = filtered.filter((r) => r.disposition === 'ANSWERED')
  const totalTalkTime = answeredRecords.reduce((sum, r) => sum + r.billableSeconds, 0)
  const averageTalkTime = answeredRecords.length > 0 ? totalTalkTime / answeredRecords.length : 0

  // Calculate average ring time (duration - billable for answered calls)
  const totalRingTime = answeredRecords.reduce(
    (sum, r) => sum + (r.duration - r.billableSeconds),
    0
  )
  const averageRingTime = answeredRecords.length > 0 ? totalRingTime / answeredRecords.length : 0

  const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0

  // Count by disposition
  const byDisposition: Record<CdrDisposition, number> = {
    ANSWERED: 0,
    'NO ANSWER': 0,
    BUSY: 0,
    FAILED: 0,
    CONGESTION: 0,
    CANCEL: 0,
  }
  filtered.forEach((r) => {
    byDisposition[r.disposition]++
  })

  // Count by hour
  const byHour: Record<number, number> = {}
  for (let i = 0; i < 24; i++) byHour[i] = 0
  filtered.forEach((r) => {
    byHour[r.startTime.getHours()]++
  })

  // Count by day of week
  const byDayOfWeek: Record<number, number> = {}
  for (let i = 0; i < 7; i++) byDayOfWeek[i] = 0
  filtered.forEach((r) => {
    byDayOfWeek[r.startTime.getDay()]++
  })

  return {
    totalCalls,
    answeredCalls,
    missedCalls,
    failedCalls,
    totalTalkTime,
    averageTalkTime,
    averageRingTime,
    answerRate,
    byDisposition,
    byHour,
    byDayOfWeek,
    periodStart: startDate || (filtered[filtered.length - 1]?.startTime ?? new Date()),
    periodEnd: endDate || (filtered[0]?.startTime ?? new Date()),
  }
}

/**
 * Calculate agent statistics
 */
function calculateAgentStats(
  records: CdrRecord[],
  agent: string,
  startDate?: Date,
  endDate?: Date
): AgentCdrStats | null {
  const filtered = records.filter((r) => {
    if (r.agent !== agent) return false
    if (startDate && r.startTime < startDate) return false
    if (endDate && r.startTime > endDate) return false
    return true
  })

  if (filtered.length === 0) return null

  const callsHandled = filtered.filter((r) => r.disposition === 'ANSWERED').length
  const totalTalkTime = filtered.reduce(
    (sum, r) => sum + (r.disposition === 'ANSWERED' ? r.billableSeconds : 0),
    0
  )
  const averageTalkTime = callsHandled > 0 ? totalTalkTime / callsHandled : 0

  const byDisposition: Record<CdrDisposition, number> = {
    ANSWERED: 0,
    'NO ANSWER': 0,
    BUSY: 0,
    FAILED: 0,
    CONGESTION: 0,
    CANCEL: 0,
  }
  filtered.forEach((r) => {
    byDisposition[r.disposition]++
  })

  return {
    agent,
    callsHandled,
    totalTalkTime,
    averageTalkTime,
    totalWrapTime: 0, // Wrap time needs separate tracking
    averageHandleTime: averageTalkTime, // Without wrap time, same as talk time
    byDisposition,
    periodStart: startDate || filtered[filtered.length - 1]?.startTime || new Date(),
    periodEnd: endDate || filtered[0]?.startTime || new Date(),
  }
}

/**
 * Calculate queue statistics
 */
function calculateQueueStats(
  records: CdrRecord[],
  queue: string,
  startDate?: Date,
  endDate?: Date,
  serviceLevelThreshold = 20
): QueueCdrStats | null {
  const filtered = records.filter((r) => {
    if (r.queue !== queue) return false
    if (startDate && r.startTime < startDate) return false
    if (endDate && r.startTime > endDate) return false
    return true
  })

  if (filtered.length === 0) return null

  const callsOffered = filtered.length
  const callsAnswered = filtered.filter((r) => r.disposition === 'ANSWERED').length
  const callsAbandoned = filtered.filter(
    (r) => r.disposition === 'NO ANSWER' || r.disposition === 'CANCEL'
  ).length

  // Calculate wait time (ring time) for answered calls
  const answeredRecords = filtered.filter((r) => r.disposition === 'ANSWERED')
  const totalWaitTime = answeredRecords.reduce(
    (sum, r) => sum + (r.duration - r.billableSeconds),
    0
  )
  const averageWaitTime = answeredRecords.length > 0 ? totalWaitTime / answeredRecords.length : 0
  const averageTalkTime =
    answeredRecords.length > 0
      ? answeredRecords.reduce((sum, r) => sum + r.billableSeconds, 0) / answeredRecords.length
      : 0

  // Service level: % of calls answered within threshold
  const answeredInTime = answeredRecords.filter(
    (r) => r.duration - r.billableSeconds <= serviceLevelThreshold
  ).length
  const serviceLevelPct = callsOffered > 0 ? (answeredInTime / callsOffered) * 100 : 0

  const abandonmentRate = callsOffered > 0 ? (callsAbandoned / callsOffered) * 100 : 0

  // Count by agent
  const byAgent: Record<string, number> = {}
  filtered.forEach((r) => {
    if (r.agent) {
      byAgent[r.agent] = (byAgent[r.agent] || 0) + 1
    }
  })

  return {
    queue,
    callsOffered,
    callsAnswered,
    callsAbandoned,
    averageWaitTime,
    averageTalkTime,
    serviceLevelPct,
    serviceLevelThreshold,
    abandonmentRate,
    byAgent,
    periodStart: startDate || filtered[filtered.length - 1]?.startTime || new Date(),
    periodEnd: endDate || filtered[0]?.startTime || new Date(),
  }
}

/**
 * Filter CDR records
 */
function filterRecords(records: CdrRecord[], filter: CdrFilter): CdrRecord[] {
  let result = [...records]

  if (filter.source) {
    const source = filter.source
    result = result.filter((r) => r.source.includes(source))
  }

  if (filter.destination) {
    const destination = filter.destination
    result = result.filter((r) => r.destination.includes(destination))
  }

  if (filter.direction) {
    result = result.filter((r) => r.direction === filter.direction)
  }

  if (filter.disposition) {
    const dispositions = Array.isArray(filter.disposition)
      ? filter.disposition
      : [filter.disposition]
    result = result.filter((r) => dispositions.includes(r.disposition))
  }

  if (filter.queue) {
    result = result.filter((r) => r.queue === filter.queue)
  }

  if (filter.agent) {
    result = result.filter((r) => r.agent === filter.agent)
  }

  if (filter.accountCode) {
    result = result.filter((r) => r.accountCode === filter.accountCode)
  }

  if (filter.startDate) {
    const startDate = filter.startDate
    result = result.filter((r) => r.startTime >= startDate)
  }

  if (filter.endDate) {
    const endDate = filter.endDate
    result = result.filter((r) => r.startTime <= endDate)
  }

  if (filter.minDuration !== undefined) {
    const minDuration = filter.minDuration
    result = result.filter((r) => r.duration >= minDuration)
  }

  if (filter.maxDuration !== undefined) {
    const maxDuration = filter.maxDuration
    result = result.filter((r) => r.duration <= maxDuration)
  }

  // Sort
  if (filter.sortBy) {
    const sortOrder = filter.sortOrder === 'asc' ? 1 : -1
    const sortBy = filter.sortBy
    result.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      if (aVal instanceof Date && bVal instanceof Date) {
        return (aVal.getTime() - bVal.getTime()) * sortOrder
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * sortOrder
      }
      return String(aVal).localeCompare(String(bVal)) * sortOrder
    })
  }

  // Pagination
  if (filter.offset) {
    result = result.slice(filter.offset)
  }

  if (filter.limit) {
    result = result.slice(0, filter.limit)
  }

  return result
}

/**
 * Sanitize string value for CSV export to prevent CSV injection attacks.
 * Prefixes potentially dangerous formula characters with a single quote.
 */
function sanitizeCsvValue(value: string): string {
  // CSV injection prevention: prefix formula characters with single quote
  // These characters could be interpreted as formulas in spreadsheet applications
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`
  }
  return value
}

/**
 * Export CDR records to specified format
 */
function exportToFormat(records: CdrRecord[], options: CdrExportOptions): string {
  const fields = options.fields || [
    'uniqueId',
    'startTime',
    'source',
    'destination',
    'duration',
    'billableSeconds',
    'disposition',
    'direction',
  ]

  const dateFormat = options.dateFormat || 'yyyy-MM-dd HH:mm:ss'

  const formatDate = (date: Date | null): string => {
    if (!date) return ''
    // Simple date formatting (could use a library for complex formats)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return dateFormat
      .replace('yyyy', date.getFullYear().toString())
      .replace('MM', pad(date.getMonth() + 1))
      .replace('dd', pad(date.getDate()))
      .replace('HH', pad(date.getHours()))
      .replace('mm', pad(date.getMinutes()))
      .replace('ss', pad(date.getSeconds()))
  }

  if (options.format === 'json') {
    const data = records.map((r) => {
      const obj: Record<string, unknown> = {}
      fields.forEach((field) => {
        const value = r[field]
        if (value instanceof Date) {
          obj[field] = formatDate(value)
        } else {
          obj[field] = value
        }
      })
      return obj
    })
    return JSON.stringify(data, null, 2)
  }

  // CSV format
  const lines: string[] = []

  if (options.includeHeader !== false) {
    lines.push(fields.join(','))
  }

  records.forEach((r) => {
    const values = fields.map((field) => {
      const value = r[field]
      if (value instanceof Date) {
        return `"${formatDate(value)}"`
      } else if (typeof value === 'string') {
        // Sanitize string values to prevent CSV injection
        const sanitized = sanitizeCsvValue(value)
        if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
          return `"${sanitized.replace(/"/g, '""')}"`
        }
        return sanitized
      }
      return String(value ?? '')
    })
    lines.push(values.join(','))
  })

  return lines.join('\n')
}

/**
 * AMI CDR Composable
 *
 * Provides reactive CDR processing for Vue components.
 *
 * @param amiClientRef - Ref to AMI client instance
 * @param options - Configuration options
 */
export function useAmiCDR(
  amiClientRef: Ref<AmiClient | null> | ComputedRef<AmiClient | null>,
  options: UseAmiCDROptions = {}
): UseAmiCDRReturn {
  const {
    maxRecords = DEFAULT_MAX_RECORDS,
    autoStats = true,
    filter: defaultFilter,
    detectDirection,
    onCdr,
    onStatsUpdate,
    transformCdr,
  } = options

  // State
  const records = ref<CdrRecord[]>([])
  const isProcessing = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)
  const eventListeners = ref<Set<(cdr: CdrRecord) => void>>(new Set())

  // Track CDR event handler for cleanup
  let cdrHandler: ((event: AmiMessage<AmiEventData>) => void) | null = null

  // Computed statistics
  const stats = computed<CdrStats>(() => {
    if (!autoStats) {
      return calculateStats([])
    }
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    return calculateStats(records.value, startOfDay)
  })

  const agentStats = computed<Record<string, AgentCdrStats>>(() => {
    if (!autoStats) return {}

    const agents = new Set<string>()
    records.value.forEach((r) => {
      if (r.agent) agents.add(r.agent)
    })

    const result: Record<string, AgentCdrStats> = {}
    agents.forEach((agent) => {
      const stats = calculateAgentStats(records.value, agent)
      if (stats) result[agent] = stats
    })

    return result
  })

  const queueStats = computed<Record<string, QueueCdrStats>>(() => {
    if (!autoStats) return {}

    const queues = new Set<string>()
    records.value.forEach((r) => {
      if (r.queue) queues.add(r.queue)
    })

    const result: Record<string, QueueCdrStats> = {}
    queues.forEach((queue) => {
      const stats = calculateQueueStats(records.value, queue)
      if (stats) result[queue] = stats
    })

    return result
  })

  /**
   * Process incoming CDR event
   */
  function processCdrEvent(event: AmiCdrEvent): void {
    try {
      let cdr = parseCdrEvent(event, detectDirection)

      // Apply transform if provided
      if (transformCdr) {
        cdr = transformCdr(cdr)
      }

      // Check against default filter
      if (defaultFilter) {
        const filtered = filterRecords([cdr], defaultFilter)
        if (filtered.length === 0) {
          logger.debug('CDR filtered out by default filter', { uniqueId: cdr.uniqueId })
          return
        }
      }

      // Add to records (newest first)
      records.value.unshift(cdr)
      totalCount.value++

      // Trim to max records
      if (records.value.length > maxRecords) {
        records.value = records.value.slice(0, maxRecords)
      }

      // Notify listeners
      eventListeners.value.forEach((listener) => {
        try {
          listener(cdr)
        } catch (e) {
          logger.error('CDR event listener error:', e)
        }
      })

      // Call callback
      onCdr?.(cdr)

      // Notify stats update
      if (autoStats && onStatsUpdate) {
        onStatsUpdate(stats.value)
      }

      logger.debug('Processed CDR event', {
        uniqueId: cdr.uniqueId,
        source: cdr.source,
        destination: cdr.destination,
        disposition: cdr.disposition,
      })
    } catch (e) {
      logger.error('Error processing CDR event:', e)
      error.value = e instanceof Error ? e.message : 'Unknown error processing CDR'
    }
  }

  /**
   * Get filtered CDR records
   */
  function getRecords(filter?: CdrFilter): CdrRecord[] {
    if (!filter) return [...records.value]
    return filterRecords(records.value, filter)
  }

  /**
   * Get statistics for a specific period
   */
  function getStats(startDate: Date, endDate: Date): CdrStats {
    return calculateStats(records.value, startDate, endDate)
  }

  /**
   * Get agent statistics
   */
  function getAgentStats(agent: string, startDate?: Date, endDate?: Date): AgentCdrStats | null {
    return calculateAgentStats(records.value, agent, startDate, endDate)
  }

  /**
   * Get queue statistics
   */
  function getQueueStats(queue: string, startDate?: Date, endDate?: Date): QueueCdrStats | null {
    return calculateQueueStats(records.value, queue, startDate, endDate)
  }

  /**
   * Export CDR records
   */
  function exportRecords(exportOptions: CdrExportOptions, filter?: CdrFilter): string {
    const data = filter ? filterRecords(records.value, filter) : records.value
    return exportToFormat(data, exportOptions)
  }

  /**
   * Clear all records
   */
  function clearRecords(): void {
    records.value = []
    totalCount.value = 0
    error.value = null
  }

  /**
   * Subscribe to CDR events
   */
  function onCdrEvent(callback: (cdr: CdrRecord) => void): () => void {
    eventListeners.value.add(callback)
    return () => {
      eventListeners.value.delete(callback)
    }
  }

  /**
   * Get calls for today
   */
  function getTodayCalls(): CdrRecord[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return records.value.filter((r) => r.startTime >= today)
  }

  /**
   * Get hourly breakdown for a date
   */
  function getHourlyBreakdown(date: Date): Record<number, CdrStats> {
    const result: Record<number, CdrStats> = {}

    for (let hour = 0; hour < 24; hour++) {
      const startDate = new Date(date)
      startDate.setHours(hour, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(hour, 59, 59, 999)

      result[hour] = calculateStats(records.value, startDate, endDate)
    }

    return result
  }

  /**
   * Calculate service level percentage
   */
  function calculateServiceLevel(threshold: number, startDate?: Date, endDate?: Date): number {
    const filtered = records.value.filter((r) => {
      if (startDate && r.startTime < startDate) return false
      if (endDate && r.startTime > endDate) return false
      return true
    })

    if (filtered.length === 0) return 0

    const answeredInTime = filtered.filter((r) => {
      if (r.disposition !== 'ANSWERED') return false
      const ringTime = r.duration - r.billableSeconds
      return ringTime <= threshold
    }).length

    return (answeredInTime / filtered.length) * 100
  }

  /**
   * Get call detail by unique ID
   */
  function getCallDetail(uniqueId: string): CdrRecord | undefined {
    return records.value.find((r) => r.uniqueId === uniqueId)
  }

  // Watch for client changes
  watch(
    () => amiClientRef.value,
    (client, oldClient) => {
      // Clean up old client listener
      if (oldClient && cdrHandler) {
        oldClient.off('event', cdrHandler)
        cdrHandler = null
      }

      // Set up new client listener
      if (client) {
        cdrHandler = (event: AmiMessage<AmiEventData>) => {
          if (event.data.Event === 'Cdr') {
            processCdrEvent(event.data as AmiCdrEvent)
          }
        }
        client.on('event', cdrHandler)
        logger.info('CDR event listener registered')
      }
    },
    { immediate: true }
  )

  // Cleanup on unmount
  onUnmounted(() => {
    if (amiClientRef.value && cdrHandler) {
      amiClientRef.value.off('event', cdrHandler)
      cdrHandler = null
    }
    eventListeners.value.clear()
  })

  return {
    // State
    records,
    stats,
    agentStats,
    queueStats,
    isProcessing,
    error,
    totalCount,

    // Methods
    getRecords,
    getStats,
    getAgentStats,
    getQueueStats,
    exportRecords,
    clearRecords,
    onCdrEvent,
    getTodayCalls,
    getHourlyBreakdown,
    calculateServiceLevel,
    getCallDetail,
  }
}

// Re-export types for convenience
export type { UseAmiCDRReturn }
