/**
 * useCallQualityHistory - Persistent Call Quality History Storage
 *
 * Stores and retrieves call quality metrics for trend analysis.
 * Uses LocalStorage with optional export/import functionality.
 *
 * @module composables/useCallQualityHistory
 */
import { ref, computed, type Ref, type DeepReadonly } from 'vue'
import type { CallQualityStats, QualityLevel } from './useCallQualityStats'

/**
 * Single call quality snapshot (stored per call)
 */
export interface CallQualityRecord {
  /** Unique call identifier */
  callId: string
  /** Start timestamp */
  startedAt: Date
  /** End timestamp (null if ongoing) */
  endedAt: Date | null
  /** Duration in seconds (null if ongoing) */
  durationSeconds: number | null
  /** Quality snapshots collected during call */
  snapshots: QualitySnapshot[]
  /** Overall call quality assessment */
  overallQuality: QualityLevel
  /** Worst quality level observed */
  worstQuality: QualityLevel
  /** Average metrics across entire call */
  averages: {
    rtt: number | null
    jitter: number | null
    packetLossPercent: number | null
    bitrateKbps: number | null
  }
  /** Number of quality alerts triggered */
  alertCount: number
  /** Call metadata (optional) */
  metadata?: {
    direction?: 'inbound' | 'outbound'
    remoteNumber?: string
    localAccount?: string
  }
}

/**
 * Individual quality measurement snapshot
 */
export interface QualitySnapshot {
  /** Timestamp of snapshot */
  timestamp: Date
  /** RTT in milliseconds */
  rtt: number | null
  /** Jitter in milliseconds */
  jitter: number | null
  /** Packet loss percentage */
  packetLossPercent: number | null
  /** Bitrate in kbps */
  bitrateKbps: number | null
  /** Current quality level */
  qualityLevel: QualityLevel
  /** Codec used */
  codec: string | null
}

/**
 * Query options for retrieving history
 */
export interface HistoryQueryOptions {
  /** Start date filter */
  from?: Date
  /** End date filter */
  to?: Date
  /** Minimum quality filter */
  minQuality?: QualityLevel
  /** Maximum results */
  limit?: number
  /** Sort direction */
  sort?: 'asc' | 'desc'
}

/**
 * Aggregated quality statistics
 */
export interface QualityAggregates {
  /** Total calls in period */
  totalCalls: number
  /** Completed calls (non-zero duration) */
  completedCalls: number
  /** Average call duration in seconds */
  avgDurationSeconds: number | null
  /** Calls by quality level */
  qualityDistribution: Record<QualityLevel, number>
  /** Average RTT across all calls */
  avgRtt: number | null
  /** Average packet loss */
  avgPacketLoss: number | null
  /** Percentage of calls with alerts */
  alertRate: number
  /** Trend direction: 'improving' | 'stable' | 'degrading' */
  trend: 'improving' | 'stable' | 'degrading' | 'unknown'
}

/**
 * Storage configuration
 */
export interface HistoryStorageConfig {
  /** LocalStorage key prefix (default: 'vuesip-quality') */
  storageKey: string
  /** Max records to store (default: 100) */
  maxRecords: number
  /** Auto-cleanup older records (default: true) */
  autoCleanup: boolean
}

const DEFAULT_CONFIG: HistoryStorageConfig = {
  storageKey: 'vuesip-quality',
  maxRecords: 100,
  autoCleanup: true,
}

/**
 * Serialize record for storage (Dates to ISO strings)
 */
function serializeRecord(record: CallQualityRecord): string {
  return JSON.stringify({
    ...record,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    snapshots: record.snapshots.map((s) => ({
      ...s,
      timestamp: s.timestamp.toISOString(),
    })),
  })
}

/**
 * Deserialize record from storage (ISO strings to Dates)
 */
function deserializeRecord(data: string): CallQualityRecord {
  const parsed = JSON.parse(data)
  return {
    ...parsed,
    startedAt: new Date(parsed.startedAt),
    endedAt: parsed.endedAt ? new Date(parsed.endedAt) : null,
    snapshots: parsed.snapshots.map((s: QualitySnapshot & { timestamp: string }) => ({
      ...s,
      timestamp: new Date(s.timestamp),
    })),
  }
}

/**
 * Calculate quality level from snapshot metrics
 */
function calculateQualityLevel(rtt: number | null, packetLossPercent: number | null): QualityLevel {
  if (rtt === null && packetLossPercent === null) return 'unknown'

  const effectiveRtt = rtt ?? 0
  const effectiveLoss = packetLossPercent ?? 0

  if (effectiveRtt < 150 && effectiveLoss < 1) return 'excellent'
  if (effectiveRtt < 300 && effectiveLoss < 3) return 'good'
  if (effectiveRtt < 500 && effectiveLoss < 5) return 'fair'
  return 'poor'
}

/**
 * Composable return type
 */
export interface UseCallQualityHistoryReturn {
  /** All stored call records */
  records: DeepReadonly<Ref<CallQualityRecord[]>>
  /** Currently active call record (null if no active call) */
  activeCall: DeepReadonly<Ref<CallQualityRecord | null>>
  /** Aggregated statistics for all records */
  aggregates: DeepReadonly<Ref<QualityAggregates>>
  /** Start recording a new call */
  startCall: (callId: string, metadata?: CallQualityRecord['metadata']) => void
  /** Add quality snapshot to active call */
  addSnapshot: (stats: CallQualityStats) => void
  /** End recording current call */
  endCall: () => void
  /** Query records with filters */
  query: (options?: HistoryQueryOptions) => CallQualityRecord[]
  /** Export all records to JSON */
  exportToJson: () => string
  /** Import records from JSON */
  importFromJson: (json: string) => void
  /** Clear all history */
  clearHistory: () => void
  /** Delete specific record */
  deleteRecord: (callId: string) => void
}

/**
 * Vue composable for persistent call quality history
 *
 * @param config - Storage configuration options
 * @returns Composable interface for history management
 *
 * @example
 * ```ts
 * const history = useCallQualityHistory()
 *
 * // Start recording a call
 * history.startCall('call-123', { direction: 'outbound', remoteNumber: '555-0100' })
 *
 * // During call, add snapshots
 * history.addSnapshot({ rtt: 45, jitter: 2, packetLossPercent: 0.1, ... })
 *
 * // End call
 * history.endCall()
 *
 * // Query history
 * const recentCalls = history.query({ from: new Date(Date.now() - 86400000), limit: 10 })
 * ```
 */
export function useCallQualityHistory(
  config: Partial<HistoryStorageConfig> = {}
): UseCallQualityHistoryReturn {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Reactive state
  const records = ref<CallQualityRecord[]>([])
  const activeCall = ref<CallQualityRecord | null>(null)

  // Load from LocalStorage on init
  const storageKey = cfg.storageKey
  const loadFromStorage = (): void => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        records.value = parsed.map((r: string) => deserializeRecord(r))
      }
    } catch (error) {
      console.warn('[useCallQualityHistory] Failed to load from storage:', error)
      records.value = []
    }
  }

  // Save to LocalStorage
  const saveToStorage = (): void => {
    try {
      const serialized = records.value.map(serializeRecord)
      localStorage.setItem(storageKey, JSON.stringify(serialized))
    } catch (error) {
      console.warn('[useCallQualityHistory] Failed to save to storage:', error)
    }
  }

  // Cleanup old records if over limit
  const cleanupIfNeeded = (): void => {
    if (!cfg.autoCleanup || records.value.length <= cfg.maxRecords) return

    // Sort by start date desc, keep newest maxRecords
    records.value = records.value
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, cfg.maxRecords)
  }

  // Calculate aggregates
  const aggregates = computed<QualityAggregates>(() => {
    const all = records.value
    if (all.length === 0) {
      return {
        totalCalls: 0,
        completedCalls: 0,
        avgDurationSeconds: null,
        qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0, unknown: 0 },
        avgRtt: null,
        avgPacketLoss: null,
        alertRate: 0,
        trend: 'unknown',
      }
    }

    const completed = all.filter((r) => r.durationSeconds !== null && r.durationSeconds > 0)
    const durations = completed.map((r) => r.durationSeconds as number)
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null

    // Quality distribution
    const distribution: Record<QualityLevel, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unknown: 0,
    }
    all.forEach((r) => {
      distribution[r.overallQuality]++
    })

    // Average RTT and packet loss from snapshots
    let totalRtt = 0
    let rttCount = 0
    let totalLoss = 0
    let lossCount = 0
    all.forEach((r) => {
      r.snapshots.forEach((s) => {
        if (s.rtt !== null) {
          totalRtt += s.rtt
          rttCount++
        }
        if (s.packetLossPercent !== null) {
          totalLoss += s.packetLossPercent
          lossCount++
        }
      })
    })

    // Alert rate
    const callsWithAlerts = all.filter((r) => r.alertCount > 0).length

    // Simple trend: compare first half vs second half avg quality
    const sorted = [...all].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    const mid = Math.floor(sorted.length / 2)
    const firstHalf = sorted.slice(0, mid)
    const secondHalf = sorted.slice(mid)

    const qualityScore = (q: QualityLevel): number =>
      ({ excellent: 4, good: 3, fair: 2, poor: 1, unknown: 0 })[q]

    const firstAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((sum, r) => sum + qualityScore(r.overallQuality), 0) / firstHalf.length
        : 0
    const secondAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((sum, r) => sum + qualityScore(r.overallQuality), 0) / secondHalf.length
        : 0

    let trend: QualityAggregates['trend'] = 'stable'
    if (secondAvg > firstAvg + 0.5) trend = 'improving'
    else if (secondAvg < firstAvg - 0.5) trend = 'degrading'

    return {
      totalCalls: all.length,
      completedCalls: completed.length,
      avgDurationSeconds: avgDuration,
      qualityDistribution: distribution,
      avgRtt: rttCount > 0 ? totalRtt / rttCount : null,
      avgPacketLoss: lossCount > 0 ? totalLoss / lossCount : null,
      alertRate: all.length > 0 ? (callsWithAlerts / all.length) * 100 : 0,
      trend,
    }
  })

  /**
   * Start recording a new call
   */
  const startCall = (callId: string, metadata?: CallQualityRecord['metadata']): void => {
    // End any existing active call first
    if (activeCall.value) {
      endCall()
    }

    activeCall.value = {
      callId,
      startedAt: new Date(),
      endedAt: null,
      durationSeconds: null,
      snapshots: [],
      overallQuality: 'unknown',
      worstQuality: 'unknown',
      averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
      alertCount: 0,
      metadata,
    }
  }

  /**
   * Add quality snapshot to active call
   */
  const addSnapshot = (stats: CallQualityStats): void => {
    if (!activeCall.value) return

    const qualityLevel = calculateQualityLevel(stats.rtt, stats.packetLossPercent)

    const snapshot: QualitySnapshot = {
      timestamp: stats.lastUpdated ?? new Date(),
      rtt: stats.rtt,
      jitter: stats.jitter,
      packetLossPercent: stats.packetLossPercent,
      bitrateKbps: stats.bitrateKbps,
      qualityLevel,
      codec: stats.codec,
    }

    activeCall.value.snapshots.push(snapshot)

    // Update worst quality
    const qualityRanking: Record<QualityLevel, number> = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1,
      unknown: 0,
    }

    if (
      activeCall.value.worstQuality === 'unknown' ||
      qualityRanking[qualityLevel] < qualityRanking[activeCall.value.worstQuality]
    ) {
      activeCall.value.worstQuality = qualityLevel
    }
  }

  /**
   * End recording current call and save to history
   */
  const endCall = (): void => {
    if (!activeCall.value) return

    const call = activeCall.value
    call.endedAt = new Date()
    call.durationSeconds = Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)

    // Calculate averages from snapshots
    if (call.snapshots.length > 0) {
      const rtts = call.snapshots.map((s) => s.rtt).filter((v): v is number => v !== null)
      const jitters = call.snapshots.map((s) => s.jitter).filter((v): v is number => v !== null)
      const losses = call.snapshots
        .map((s) => s.packetLossPercent)
        .filter((v): v is number => v !== null)
      const bitrates = call.snapshots
        .map((s) => s.bitrateKbps)
        .filter((v): v is number => v !== null)

      call.averages = {
        rtt: rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : null,
        jitter: jitters.length > 0 ? jitters.reduce((a, b) => a + b, 0) / jitters.length : null,
        packetLossPercent:
          losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : null,
        bitrateKbps:
          bitrates.length > 0 ? bitrates.reduce((a, b) => a + b, 0) / bitrates.length : null,
      }

      // Overall quality is the most common quality level
      const qualityCounts: Record<QualityLevel, number> = {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        unknown: 0,
      }
      call.snapshots.forEach((s) => qualityCounts[s.qualityLevel]++)
      call.overallQuality = (Object.entries(qualityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        'unknown') as QualityLevel
    }

    // Save to records
    records.value.push({ ...call })
    cleanupIfNeeded()
    saveToStorage()

    activeCall.value = null
  }

  /**
   * Query records with filters
   */
  const query = (options: HistoryQueryOptions = {}): CallQualityRecord[] => {
    let result = [...records.value]

    if (options.from) {
      const fromTime = options.from.getTime()
      result = result.filter((r) => r.startedAt.getTime() >= fromTime)
    }
    if (options.to) {
      const toTime = options.to.getTime()
      result = result.filter((r) => r.startedAt.getTime() <= toTime)
    }
    if (options.minQuality) {
      const qualityRanking: Record<QualityLevel, number> = {
        excellent: 4,
        good: 3,
        fair: 2,
        poor: 1,
        unknown: 0,
      }
      const minRank = qualityRanking[options.minQuality]
      result = result.filter((r) => qualityRanking[r.overallQuality] >= minRank)
    }

    result.sort((a, b) =>
      options.sort === 'asc'
        ? a.startedAt.getTime() - b.startedAt.getTime()
        : b.startedAt.getTime() - a.startedAt.getTime()
    )

    if (options.limit) {
      result = result.slice(0, options.limit)
    }

    return result
  }

  /**
   * Export all records to JSON
   */
  const exportToJson = (): string => {
    return JSON.stringify(records.value.map(serializeRecord), null, 2)
  }

  /**
   * Import records from JSON
   */
  const importFromJson = (json: string): void => {
    try {
      const parsed = JSON.parse(json)
      records.value = parsed.map((r: string) => deserializeRecord(r))
      saveToStorage()
    } catch (error) {
      console.error('[useCallQualityHistory] Failed to import:', error)
      throw new Error('Invalid import data')
    }
  }

  /**
   * Clear all history
   */
  const clearHistory = (): void => {
    records.value = []
    localStorage.removeItem(storageKey)
  }

  /**
   * Delete specific record
   */
  const deleteRecord = (callId: string): void => {
    records.value = records.value.filter((r) => r.callId !== callId)
    saveToStorage()
  }

  // Load initial data
  loadFromStorage()

  return {
    records: records as unknown as DeepReadonly<Ref<CallQualityRecord[]>>,
    activeCall: activeCall as unknown as DeepReadonly<Ref<CallQualityRecord | null>>,
    aggregates: aggregates as unknown as DeepReadonly<Ref<QualityAggregates>>,
    startCall,
    addSnapshot,
    endCall,
    query,
    exportToJson,
    importFromJson,
    clearHistory,
    deleteRecord,
  }
}

export default useCallQualityHistory
