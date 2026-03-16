/**
 * useCallQualityHistory - Persistent Call Quality History Composable
 *
 * Stores call quality snapshots during active calls and persists
 * completed call summaries for historical analysis and trends.
 *
 * @module composables/useCallQualityHistory
 */
import { ref, computed, type ComputedRef } from 'vue'
import type { CallQualityStats, QualityLevel } from './useCallQualityStats'
import { createLogger } from '../utils/logger'

const logger = createLogger('composables:useCallQualityHistory')

/**
 * A single quality snapshot taken during a call
 */
export interface QualitySnapshot {
  /** Timestamp when snapshot was taken */
  timestamp: number
  /** RTT in milliseconds */
  rtt: number | null
  /** Jitter in milliseconds */
  jitter: number | null
  /** Packet loss percentage */
  packetLossPercent: number | null
  /** Bitrate in kbps */
  bitrateKbps: number | null
  /** Current quality level at snapshot time */
  qualityLevel: QualityLevel
}

/**
 * Aggregate statistics for a completed call
 */
export interface CallQualityAggregate {
  /** Minimum RTT observed */
  minRtt: number | null
  /** Maximum RTT observed */
  maxRtt: number | null
  /** Average RTT */
  avgRtt: number | null
  /** Minimum jitter observed */
  minJitter: number | null
  /** Maximum jitter observed */
  maxJitter: number | null
  /** Average jitter */
  avgJitter: number | null
  /** Minimum packet loss observed */
  minPacketLoss: number | null
  /** Maximum packet loss observed */
  maxPacketLoss: number | null
  /** Average packet loss */
  avgPacketLoss: number | null
  /** Percentage of time in each quality level */
  qualityDistribution: Record<QualityLevel, number>
}

/**
 * Summary record for a completed call
 */
export interface CallQualityRecord {
  /** Unique call identifier */
  id: string
  /** Call start timestamp */
  startTime: number
  /** Call end timestamp */
  endTime: number
  /** Call duration in milliseconds */
  durationMs: number
  /** Overall quality rating for the call */
  overallQuality: QualityLevel
  /** Number of quality alerts during call */
  alertCount: number
  /** Aggregate statistics */
  aggregates: CallQualityAggregate
  /** Quality snapshots (sampled every 2s) */
  snapshots: QualitySnapshot[]
  /** Remote party identifier (phone number/URI) */
  remoteIdentity?: string
  /** Call direction */
  direction?: 'incoming' | 'outgoing'
}

/**
 * History filter options
 */
export interface HistoryFilter {
  /** Start date for filtering */
  fromDate?: Date
  /** End date for filtering */
  toDate?: Date
  /** Minimum quality level to include */
  minQuality?: QualityLevel
  /** Maximum number of records to return */
  limit?: number
}

/**
 * Trend data for charting
 */
export interface QualityTrend {
  /** Date labels */
  labels: string[]
  /** Average quality scores per day (0-100) */
  scores: number[]
  /** Call counts per day */
  callCounts: number[]
}

/**
 * Options for useCallQualityHistory
 */
export interface UseCallQualityHistoryOptions {
  /** localStorage key prefix (default: 'vuesip-quality') */
  storageKey?: string
  /** Maximum records to store (default: 100) */
  maxRecords?: number
  /** Snapshot sample interval in ms (default: 2000) */
  snapshotIntervalMs?: number
  /** Days to retain history (default: 30) */
  retentionDays?: number
}

/**
 * Active call tracking state (internal)
 */
interface ActiveCallState {
  id: string
  startTime: number
  snapshots: QualitySnapshot[]
  alertCount: number
  remoteIdentity?: string
  direction?: 'incoming' | 'outgoing'
  lastSnapshotTime: number
}

// localStorage key constants
const STORAGE_KEYS = {
  records: (prefix: string) => `${prefix}:records`,
  metadata: (prefix: string) => `${prefix}:metadata`,
}

/**
 * Quality level to numeric score mapping
 */
const QUALITY_SCORES: Record<QualityLevel, number> = {
  excellent: 100,
  good: 80,
  fair: 50,
  poor: 20,
  unknown: 0,
}

/**
 * Vue composable for tracking and persisting call quality history
 *
 * @param options - Configuration options
 * @returns Composable interface for quality history management
 *
 * @example
 * ```ts
 * const {
 *   startCall,
 *   recordSnapshot,
 *   endCall,
 *   getHistory,
 *   getTrends
 * } = useCallQualityHistory()
 *
 * // During call
 * startCall('call-123', '+46123456789')
 * recordSnapshot(stats, qualityLevel)
 * endCall()
 *
 * // Review history
 * const recentCalls = getHistory({ limit: 10 })
 * ```
 */
/**
 * UI-friendly record shape for components
 */
export interface UICallQualityRecord {
  /** Unique call identifier */
  callId: string
  /** Call start timestamp */
  startedAt: Date
  /** Call duration in seconds */
  durationSeconds: number | null
  /** Overall quality rating */
  overallQuality: QualityLevel
  /** Number of alerts during call */
  alertCount: number
  /** Call metadata */
  metadata?: {
    remoteNumber?: string
    direction?: 'incoming' | 'outgoing'
  }
}

/**
 * UI-friendly aggregate shape
 */
export interface UIAggregates {
  /** Total number of calls */
  totalCalls: number
  /** Average RTT in ms */
  avgRtt: number | null
  /** Average packet loss percentage */
  avgPacketLoss: number | null
  /** Trend direction */
  trend: 'improving' | 'degrading' | 'stable'
  /** Quality distribution by level */
  qualityDistribution: Record<QualityLevel, number>
}

export function useCallQualityHistory(options: UseCallQualityHistoryOptions = {}): {
  /** Whether a call is currently being tracked */
  isTracking: ComputedRef<boolean>
  /** Currently active call ID */
  activeCallId: ComputedRef<string | null>
  /** Currently active call details (for UI) */
  activeCall: ComputedRef<UICallQualityRecord | null>
  /** All records as reactive ref (for UI) */
  records: ComputedRef<UICallQualityRecord[]>
  /** Aggregated statistics (for UI) */
  aggregates: ComputedRef<UIAggregates>
  /** Start tracking a new call */
  startCall: (callId: string, remoteIdentity?: string, direction?: 'incoming' | 'outgoing') => void
  /** Record a quality snapshot */
  recordSnapshot: (stats: CallQualityStats, qualityLevel: QualityLevel) => void
  /** Increment alert counter for active call */
  recordAlert: () => void
  /** End tracking and save call record */
  endCall: () => CallQualityRecord | null
  /** Get call history with optional filtering */
  getHistory: (filter?: HistoryFilter) => CallQualityRecord[]
  /** Get quality trends over time */
  getTrends: (days?: number) => QualityTrend
  /** Get aggregated statistics for a period */
  getAggregateStats: (days?: number) => {
    totalCalls: number
    avgQualityScore: number
    avgDurationMs: number
  }
  /** Export history as JSON */
  exportHistory: (filter?: HistoryFilter) => string
  /** Alias for exportHistory (component compatibility) */
  exportToJson: () => string
  /** Import history from JSON */
  importHistory: (json: string) => { success: boolean; imported: number; errors: string[] }
  /** Alias for importHistory (component compatibility) */
  importFromJson: (json: string) => { success: boolean; imported: number; errors: string[] }
  /** Clear all history */
  clearHistory: () => void
  /** Delete specific record */
  deleteRecord: (callId: string) => boolean
} {
  const {
    storageKey = 'vuesip-quality',
    maxRecords = 100,
    snapshotIntervalMs = 2000,
    retentionDays = 30,
  } = options

  // Reactive state
  const activeCall = ref<ActiveCallState | null>(null)
  const records = ref<CallQualityRecord[]>(loadRecords())

  // Computed
  const isTracking = computed(() => activeCall.value !== null)
  const activeCallId = computed(() => activeCall.value?.id ?? null)

  /**
   * UI-friendly active call computed property
   */
  const uiActiveCall = computed<UICallQualityRecord | null>(() => {
    if (!activeCall.value) return null
    return {
      callId: activeCall.value.id,
      startedAt: new Date(activeCall.value.startTime),
      durationSeconds: null, // Active call has no duration yet
      overallQuality: 'unknown' as QualityLevel, // Will be determined on end
      alertCount: activeCall.value.alertCount,
      metadata: {
        remoteNumber: activeCall.value.remoteIdentity,
        direction: activeCall.value.direction,
      },
    }
  })

  /**
   * Load records from localStorage
   */
  function loadRecords(): CallQualityRecord[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.records(storageKey))
      if (!stored) return []

      const parsed = JSON.parse(stored) as CallQualityRecord[]

      // Filter out expired records
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
      const valid = parsed.filter((r) => r.startTime > cutoff)

      // Sort by start time descending and trim to maxRecords
      return valid.sort((a, b) => b.startTime - a.startTime).slice(0, maxRecords)
    } catch {
      return []
    }
  }

  /**
   * Save records to localStorage
   */
  function saveRecords(): void {
    if (typeof window === 'undefined') return

    try {
      // Trim to max records
      const trimmed = records.value.slice(0, maxRecords)
      localStorage.setItem(STORAGE_KEYS.records(storageKey), JSON.stringify(trimmed))
    } catch (e) {
      logger.warn('Failed to save records:', e)
    }
  }

  /**
   * Calculate aggregate statistics from snapshots
   */
  function calculateAggregates(snapshots: QualitySnapshot[]): CallQualityAggregate {
    if (snapshots.length === 0) {
      return {
        minRtt: null,
        maxRtt: null,
        avgRtt: null,
        minJitter: null,
        maxJitter: null,
        avgJitter: null,
        minPacketLoss: null,
        maxPacketLoss: null,
        avgPacketLoss: null,
        qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0, unknown: 0 },
      }
    }

    const rtts = snapshots.map((s) => s.rtt).filter((v): v is number => v !== null)
    const jitters = snapshots.map((s) => s.jitter).filter((v): v is number => v !== null)
    const packetLosses = snapshots
      .map((s) => s.packetLossPercent)
      .filter((v): v is number => v !== null)

    // Quality distribution
    const distribution: Record<QualityLevel, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unknown: 0,
    }
    snapshots.forEach((s) => {
      distribution[s.qualityLevel]++
    })
    const total = snapshots.length
    Object.keys(distribution).forEach((key) => {
      distribution[key as QualityLevel] = (distribution[key as QualityLevel] / total) * 100
    })

    return {
      minRtt: rtts.length > 0 ? Math.min(...rtts) : null,
      maxRtt: rtts.length > 0 ? Math.max(...rtts) : null,
      avgRtt: rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : null,
      minJitter: jitters.length > 0 ? Math.min(...jitters) : null,
      maxJitter: jitters.length > 0 ? Math.max(...jitters) : null,
      avgJitter: jitters.length > 0 ? jitters.reduce((a, b) => a + b, 0) / jitters.length : null,
      minPacketLoss: packetLosses.length > 0 ? Math.min(...packetLosses) : null,
      maxPacketLoss: packetLosses.length > 0 ? Math.max(...packetLosses) : null,
      avgPacketLoss:
        packetLosses.length > 0
          ? packetLosses.reduce((a, b) => a + b, 0) / packetLosses.length
          : null,
      qualityDistribution: distribution,
    }
  }

  /**
   * Determine overall call quality from distribution
   */
  function determineOverallQuality(distribution: Record<QualityLevel, number>): QualityLevel {
    // If more than 50% poor, call is poor
    if (distribution.poor > 50) return 'poor'
    // If more than 50% fair or below, call is fair
    if (distribution.fair + distribution.poor > 50) return 'fair'
    // If more than 80% excellent, call is excellent
    if (distribution.excellent > 80) return 'excellent'
    // Default to good
    return 'good'
  }

  /**
   * Start tracking a new call
   */
  function startCall(
    callId: string,
    remoteIdentity?: string,
    direction?: 'incoming' | 'outgoing'
  ): void {
    if (activeCall.value) {
      logger.warn('Ending previous call before starting new one')
      endCall()
    }

    activeCall.value = {
      id: callId,
      startTime: Date.now(),
      snapshots: [],
      alertCount: 0,
      remoteIdentity,
      direction,
      lastSnapshotTime: 0,
    }
  }

  /**
   * Record a quality snapshot for the active call
   */
  function recordSnapshot(stats: CallQualityStats, qualityLevel: QualityLevel): void {
    if (!activeCall.value) return

    const now = Date.now()

    // Throttle snapshots to configured interval
    if (now - activeCall.value.lastSnapshotTime < snapshotIntervalMs) {
      return
    }

    const snapshot: QualitySnapshot = {
      timestamp: now,
      rtt: stats.rtt,
      jitter: stats.jitter,
      packetLossPercent: stats.packetLossPercent,
      bitrateKbps: stats.bitrateKbps,
      qualityLevel,
    }

    activeCall.value.snapshots.push(snapshot)
    activeCall.value.lastSnapshotTime = now
  }

  /**
   * Record an alert occurrence
   */
  function recordAlert(): void {
    if (activeCall.value) {
      activeCall.value.alertCount++
    }
  }

  /**
   * End tracking and save the call record
   */
  function endCall(): CallQualityRecord | null {
    if (!activeCall.value) return null

    const endTime = Date.now()
    const state = activeCall.value

    const aggregates = calculateAggregates(state.snapshots)
    const overallQuality = determineOverallQuality(aggregates.qualityDistribution)

    const record: CallQualityRecord = {
      id: state.id,
      startTime: state.startTime,
      endTime,
      durationMs: endTime - state.startTime,
      overallQuality,
      alertCount: state.alertCount,
      aggregates,
      snapshots: state.snapshots,
      remoteIdentity: state.remoteIdentity,
      direction: state.direction,
    }

    // Add to records and save
    records.value = [record, ...records.value].slice(0, maxRecords)
    saveRecords()

    // Clear active call
    activeCall.value = null

    return record
  }

  /**
   * Get filtered history
   */
  function getHistory(filter: HistoryFilter = {}): CallQualityRecord[] {
    let result = [...records.value]

    if (filter.fromDate) {
      const fromTime = filter.fromDate.getTime()
      result = result.filter((r) => r.startTime >= fromTime)
    }

    if (filter.toDate) {
      const toTime = filter.toDate.getTime()
      result = result.filter((r) => r.startTime <= toTime)
    }

    if (filter.minQuality) {
      const qualityOrder: QualityLevel[] = ['poor', 'fair', 'good', 'excellent']
      const minIndex = qualityOrder.indexOf(filter.minQuality)
      result = result.filter((r) => qualityOrder.indexOf(r.overallQuality) >= minIndex)
    }

    if (filter.limit) {
      result = result.slice(0, filter.limit)
    }

    return result
  }

  /**
   * Get quality trends over specified days
   */
  function getTrends(days = 7): QualityTrend {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days + 1)

    const labels: string[] = []
    const scores: number[] = []
    const callCounts: number[] = []

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      const dayEnd = dayStart + 24 * 60 * 60 * 1000

      const dayCalls = records.value.filter((r) => r.startTime >= dayStart && r.startTime < dayEnd)

      const avgScore =
        dayCalls.length > 0
          ? dayCalls.reduce((sum, c) => sum + QUALITY_SCORES[c.overallQuality], 0) / dayCalls.length
          : 0

      labels.push(date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }))
      scores.push(Math.round(avgScore))
      callCounts.push(dayCalls.length)
    }

    return { labels, scores, callCounts }
  }

  /**
   * Get aggregate statistics for a period
   */
  function getAggregateStats(days = 7): {
    totalCalls: number
    avgQualityScore: number
    avgDurationMs: number
  } {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const recent = records.value.filter((r) => r.startTime > cutoff)

    if (recent.length === 0) {
      return { totalCalls: 0, avgQualityScore: 0, avgDurationMs: 0 }
    }

    const totalScore = recent.reduce((sum, r) => sum + QUALITY_SCORES[r.overallQuality], 0)
    const totalDuration = recent.reduce((sum, r) => sum + r.durationMs, 0)

    return {
      totalCalls: recent.length,
      avgQualityScore: Math.round(totalScore / recent.length),
      avgDurationMs: Math.round(totalDuration / recent.length),
    }
  }

  /**
   * Export history as JSON
   */
  function exportHistory(filter?: HistoryFilter): string {
    const data = getHistory(filter)
    return JSON.stringify(data, null, 2)
  }

  /**
   * Import history from JSON
   */
  function importHistory(json: string): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = []

    try {
      const parsed = JSON.parse(json) as unknown

      if (!Array.isArray(parsed)) {
        return { success: false, imported: 0, errors: ['Invalid format: expected array'] }
      }

      let imported = 0
      const newRecords: CallQualityRecord[] = []

      for (const item of parsed) {
        // Basic validation
        if (typeof item === 'object' && item !== null && 'id' in item && 'startTime' in item) {
          newRecords.push(item as CallQualityRecord)
          imported++
        } else {
          errors.push(`Invalid record: ${JSON.stringify(item).slice(0, 100)}`)
        }
      }

      // Merge with existing, dedupe by ID
      const existingIds = new Set(records.value.map((r) => r.id))
      const merged = [...newRecords.filter((r) => !existingIds.has(r.id)), ...records.value]
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, maxRecords)

      records.value = merged
      saveRecords()

      return { success: true, imported, errors }
    } catch (e) {
      return { success: false, imported: 0, errors: [String(e)] }
    }
  }

  /**
   * Clear all history
   */
  function clearHistory(): void {
    records.value = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.records(storageKey))
    }
  }

  /**
   * Delete a specific record
   */
  function deleteRecord(callId: string): boolean {
    const before = records.value.length
    records.value = records.value.filter((r) => r.id !== callId)

    if (records.value.length < before) {
      saveRecords()
      return true
    }
    return false
  }

  /**
   * UI-friendly records computed property
   */
  const uiRecords = computed<UICallQualityRecord[]>(() => {
    return records.value.map((r) => ({
      callId: r.id,
      startedAt: new Date(r.startTime),
      durationSeconds: r.durationMs > 0 ? Math.round(r.durationMs / 1000) : null,
      overallQuality: r.overallQuality,
      alertCount: r.alertCount,
      metadata: {
        remoteNumber: r.remoteIdentity,
        direction: r.direction,
      },
    }))
  })

  /**
   * UI-friendly aggregates computed property
   */
  const uiAggregates = computed<UIAggregates>(() => {
    const allRecords = records.value
    const totalCalls = allRecords.length

    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        avgRtt: null,
        avgPacketLoss: null,
        trend: 'stable',
        qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0, unknown: 0 },
      }
    }

    // Calculate averages from aggregates
    let totalAvgRtt = 0
    let rttCount = 0
    let totalAvgPacketLoss = 0
    let packetLossCount = 0
    const qualityDistribution: Record<QualityLevel, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unknown: 0,
    }

    allRecords.forEach((r) => {
      if (r.aggregates.avgRtt !== null) {
        totalAvgRtt += r.aggregates.avgRtt
        rttCount++
      }
      if (r.aggregates.avgPacketLoss !== null) {
        totalAvgPacketLoss += r.aggregates.avgPacketLoss
        packetLossCount++
      }
      qualityDistribution[r.overallQuality]++
    })

    // Calculate trend (compare recent 7 days vs previous 7 days)
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const recentCalls = allRecords.filter((r) => r.startTime > now - sevenDays)
    const previousCalls = allRecords.filter(
      (r) => r.startTime <= now - sevenDays && r.startTime > now - 2 * sevenDays
    )

    let trend: 'improving' | 'degrading' | 'stable' = 'stable'
    if (recentCalls.length > 0 && previousCalls.length > 0) {
      const recentScore =
        recentCalls.reduce((sum, r) => sum + QUALITY_SCORES[r.overallQuality], 0) /
        recentCalls.length
      const prevScore =
        previousCalls.reduce((sum, r) => sum + QUALITY_SCORES[r.overallQuality], 0) /
        previousCalls.length

      if (recentScore > prevScore + 5) trend = 'improving'
      else if (recentScore < prevScore - 5) trend = 'degrading'
    }

    return {
      totalCalls,
      avgRtt: rttCount > 0 ? Math.round(totalAvgRtt / rttCount) : null,
      avgPacketLoss:
        packetLossCount > 0 ? parseFloat((totalAvgPacketLoss / packetLossCount).toFixed(1)) : null,
      trend,
      qualityDistribution,
    }
  })

  return {
    isTracking,
    activeCallId,
    activeCall: uiActiveCall,
    records: uiRecords,
    aggregates: uiAggregates,
    startCall,
    recordSnapshot,
    recordAlert,
    endCall,
    getHistory,
    getTrends,
    getAggregateStats,
    exportHistory,
    exportToJson: () => exportHistory(),
    importHistory,
    importFromJson: importHistory,
    clearHistory,
    deleteRecord,
  }
}

export default useCallQualityHistory
