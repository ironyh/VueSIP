/**
 * useCallQualityHistory - Call Quality History Storage & Retrieval
 *
 * Provides persistent storage and retrieval of call quality metrics
 * for trend analysis and troubleshooting. Stores snapshots during
 * active calls and summaries after call completion.
 *
 * @module composables/useCallQualityHistory
 */
import { ref, computed, watch, type ComputedRef } from 'vue'
import type {
  CallQualityRecord,
  CallQualitySnapshot,
  CallQualitySummary,
  CallQualityHistoryOptions,
  CallQualityHistoryEntry,
  HistoryQualityLevel,
  CallDirection,
  TerminationCause,
} from '@/types/call.types'
import type { CallQualityStats, QualityLevel } from './useCallQualityStats'

/**
 * Active call recording session
 */
interface ActiveRecording {
  callId: string
  direction: CallDirection
  remoteParty: string
  startTime: number
  snapshots: CallQualitySnapshot[]
  wasAnswered: boolean
  terminationCause?: TerminationCause
}

/**
 * Composable return type
 */
export interface UseCallQualityHistoryReturn {
  /** All historical call records (newest first) */
  history: ComputedRef<CallQualityRecord[]>
  /** Simplified history entries for list views */
  entries: ComputedRef<CallQualityHistoryEntry[]>
  /** Number of calls in history */
  callCount: ComputedRef<number>
  /** Whether currently recording a call */
  isRecording: ComputedRef<boolean>
  /** Start recording a new call */
  startRecording: (callId: string, direction: CallDirection, remoteParty: string) => void
  /** Record a quality snapshot during active call */
  recordSnapshot: (stats: CallQualityStats, qualityLevel: QualityLevel) => void
  /** Mark call as answered */
  markAnswered: () => void
  /** Stop recording and save call to history */
  stopRecording: (terminationCause?: TerminationCause) => void
  /** Clear all history */
  clearHistory: () => void
  /** Delete a specific call record */
  deleteRecord: (callId: string) => void
  /** Get calls with poor quality for troubleshooting */
  getPoorQualityCalls: () => CallQualityRecord[]
  /** Export history as JSON */
  exportHistory: () => string
  /** Import history from JSON */
  importHistory: (json: string) => boolean
}

/**
 * Default configuration
 */
const DEFAULT_OPTIONS: Required<CallQualityHistoryOptions> = {
  maxCalls: 50,
  storageKey: 'vuesip_call_quality_history',
  persist: true,
}

/**
 * Convert QualityLevel to HistoryQualityLevel
 */
function toHistoryLevel(level: QualityLevel): HistoryQualityLevel {
  return level as HistoryQualityLevel
}

/**
 * Compute summary statistics from snapshots
 */
function computeSummary(
  snapshots: CallQualitySnapshot[],
  callDurationSeconds: number
): CallQualitySummary {
  if (snapshots.length === 0) {
    return {
      avgRtt: null,
      maxRtt: null,
      avgJitter: null,
      maxJitter: null,
      avgPacketLoss: null,
      maxPacketLoss: null,
      overallQuality: 'unknown',
      snapshotCount: 0,
      callDurationSeconds,
    }
  }

  const validRtt = snapshots
    .filter((s): s is CallQualitySnapshot & { rtt: number } => s.rtt !== null)
    .map((s) => s.rtt)
  const validJitter = snapshots
    .filter((s): s is CallQualitySnapshot & { jitter: number } => s.jitter !== null)
    .map((s) => s.jitter)
  const validLoss = snapshots
    .filter(
      (s): s is CallQualitySnapshot & { packetLossPercent: number } => s.packetLossPercent !== null
    )
    .map((s) => s.packetLossPercent)

  // Calculate averages and maximums
  const avgRtt = validRtt.length > 0 ? validRtt.reduce((a, b) => a + b, 0) / validRtt.length : null
  const maxRtt = validRtt.length > 0 ? Math.max(...validRtt) : null

  const avgJitter =
    validJitter.length > 0 ? validJitter.reduce((a, b) => a + b, 0) / validJitter.length : null
  const maxJitter = validJitter.length > 0 ? Math.max(...validJitter) : null

  const avgPacketLoss =
    validLoss.length > 0 ? validLoss.reduce((a, b) => a + b, 0) / validLoss.length : null
  const maxPacketLoss = validLoss.length > 0 ? Math.max(...validLoss) : null

  // Determine overall quality (worst observed, weighted toward end of call)
  const qualityCounts: Record<HistoryQualityLevel, number> = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    unknown: 0,
  }

  snapshots.forEach((s) => {
    qualityCounts[s.qualityLevel]++
  })

  let overallQuality: HistoryQualityLevel = 'unknown'
  if (qualityCounts.poor > 0) {
    overallQuality = 'poor'
  } else if (qualityCounts.fair > snapshots.length * 0.2) {
    // More than 20% fair = overall fair
    overallQuality = 'fair'
  } else if (qualityCounts.good + qualityCounts.excellent > 0) {
    overallQuality = qualityCounts.excellent > qualityCounts.good ? 'excellent' : 'good'
  }

  return {
    avgRtt,
    maxRtt,
    avgJitter,
    maxJitter,
    avgPacketLoss,
    maxPacketLoss,
    overallQuality,
    snapshotCount: snapshots.length,
    callDurationSeconds,
  }
}

/**
 * Load history from localStorage
 */
function loadFromStorage(storageKey: string): CallQualityRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []

    const parsed = JSON.parse(stored) as CallQualityRecord[]

    // Validate and sanitize
    if (!Array.isArray(parsed)) return []

    return parsed.filter((record) => {
      return (
        record &&
        typeof record.callId === 'string' &&
        typeof record.startTime === 'number' &&
        Array.isArray(record.snapshots)
      )
    })
  } catch {
    return []
  }
}

/**
 * Save history to localStorage
 */
function saveToStorage(storageKey: string, history: CallQualityRecord[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(storageKey, JSON.stringify(history))
  } catch (error) {
    console.warn('[useCallQualityHistory] Failed to save to localStorage:', error)
  }
}

/**
 * Vue composable for managing call quality history
 *
 * @param options - Configuration options
 * @returns Composable interface for history management
 *
 * @example
 * ```ts
 * const history = useCallQualityHistory()
 *
 * // Start recording when call begins
 * history.startRecording(callId, 'outgoing', '+46123456789')
 *
 * // Record snapshots during call (every 5-10 seconds)
 * history.recordSnapshot(stats.value, qualityLevel.value)
 *
 * // Stop recording when call ends
 * history.stopRecording()
 *
 * // Access history
 * console.log(history.entries.value) // Simplified entries for UI
 * ```
 */
export function useCallQualityHistory(
  options: CallQualityHistoryOptions = {}
): UseCallQualityHistoryReturn {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // Reactive state
  const history = ref<CallQualityRecord[]>(config.persist ? loadFromStorage(config.storageKey) : [])
  const activeRecording = ref<ActiveRecording | null>(null)

  /**
   * Computed simplified entries for list views
   */
  const entries = computed<CallQualityHistoryEntry[]>(() => {
    return history.value.map((record) => ({
      callId: record.callId,
      remoteParty: record.remoteParty,
      date: new Date(record.startTime),
      duration: record.duration,
      quality: record.summary.overallQuality,
      hadAlerts:
        record.summary.overallQuality === 'poor' || record.summary.overallQuality === 'fair',
    }))
  })

  /**
   * Computed call count
   */
  const callCount = computed(() => history.value.length)

  /**
   * Computed recording state
   */
  const isRecording = computed(() => activeRecording.value !== null)

  /**
   * Persist history when it changes
   */
  if (config.persist) {
    watch(
      () => history.value,
      (newHistory) => {
        saveToStorage(config.storageKey, newHistory)
      },
      { deep: true }
    )
  }

  /**
   * Start recording a new call
   */
  function startRecording(callId: string, direction: CallDirection, remoteParty: string): void {
    activeRecording.value = {
      callId,
      direction,
      remoteParty,
      startTime: Date.now(),
      snapshots: [],
      wasAnswered: false,
    }
  }

  /**
   * Record a quality snapshot during active call
   */
  function recordSnapshot(stats: CallQualityStats, qualityLevel: QualityLevel): void {
    if (!activeRecording.value) return

    const snapshot: CallQualitySnapshot = {
      timestamp: Date.now(),
      rtt: stats.rtt,
      jitter: stats.jitter,
      packetLossPercent: stats.packetLossPercent,
      bitrateKbps: stats.bitrateKbps,
      codec: stats.codec,
      qualityLevel: toHistoryLevel(qualityLevel),
    }

    activeRecording.value.snapshots.push(snapshot)
  }

  /**
   * Mark call as answered
   */
  function markAnswered(): void {
    if (activeRecording.value) {
      activeRecording.value.wasAnswered = true
    }
  }

  /**
   * Stop recording and save call to history
   */
  function stopRecording(terminationCause?: TerminationCause): void {
    if (!activeRecording.value) return

    const recording = activeRecording.value
    const endTime = Date.now()
    const duration = Math.round((endTime - recording.startTime) / 1000)

    const record: CallQualityRecord = {
      callId: recording.callId,
      direction: recording.direction,
      remoteParty: recording.remoteParty,
      startTime: recording.startTime,
      endTime,
      duration,
      wasAnswered: recording.wasAnswered,
      terminationCause,
      snapshots: recording.snapshots,
      summary: computeSummary(recording.snapshots, duration),
    }

    // Add to history (newest first)
    history.value.unshift(record)

    // Enforce max calls limit
    if (history.value.length > config.maxCalls) {
      history.value = history.value.slice(0, config.maxCalls)
    }

    activeRecording.value = null
  }

  /**
   * Clear all history
   */
  function clearHistory(): void {
    history.value = []
    if (config.persist) {
      localStorage.removeItem(config.storageKey)
    }
  }

  /**
   * Delete a specific call record
   */
  function deleteRecord(callId: string): void {
    history.value = history.value.filter((r) => r.callId !== callId)
  }

  /**
   * Get calls with poor quality for troubleshooting
   */
  function getPoorQualityCalls(): CallQualityRecord[] {
    return history.value.filter(
      (r) => r.summary.overallQuality === 'poor' || r.summary.overallQuality === 'fair'
    )
  }

  /**
   * Export history as JSON string
   */
  function exportHistory(): string {
    return JSON.stringify(history.value, null, 2)
  }

  /**
   * Import history from JSON string
   */
  function importHistory(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as CallQualityRecord[]
      if (!Array.isArray(parsed)) return false

      // Validate records
      const valid = parsed.filter((record) => {
        return (
          record &&
          typeof record.callId === 'string' &&
          typeof record.startTime === 'number' &&
          Array.isArray(record.snapshots)
        )
      })

      history.value = valid
      return true
    } catch {
      return false
    }
  }

  return {
    history: computed(() => history.value),
    entries,
    callCount,
    isRecording,
    startRecording,
    recordSnapshot,
    markAnswered,
    stopRecording,
    clearHistory,
    deleteRecord,
    getPoorQualityCalls,
    exportHistory,
    importHistory,
  }
}

export default useCallQualityHistory
