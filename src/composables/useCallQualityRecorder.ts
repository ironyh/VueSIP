/**
 * useCallQualityRecorder - Bridge composable for recording call quality history
 *
 * Connects useCallQualityStats (real-time metrics) with useCallQualityScore
 * (quality scoring) to automatically record quality snapshots during calls.
 *
 * @module composables/useCallQualityRecorder
 */
import { watch, type Ref, type DeepReadonly } from 'vue'
import type { CallQualityStats } from './useCallQualityStats'
import type { QualityScoreInput, CallQualityScore } from '@/types/call-quality.types'
import { useCallQualityScore } from './useCallQualityScore'

/**
 * Options for useCallQualityRecorder
 */
export interface UseCallQualityRecorderOptions {
  /** Update interval in ms (default: 2000, matching stats poll) */
  recordIntervalMs?: number
  /** History size for quality score (default: 30 = ~1 minute at 2s intervals) */
  historySize?: number
  /** Enable trend analysis (default: true) */
  enableTrendAnalysis?: boolean
}

/**
 * Return type for useCallQualityRecorder
 */
export interface UseCallQualityRecorderReturn {
  /** Current quality score */
  currentScore: DeepReadonly<Ref<CallQualityScore | null>>
  /** Quality trend */
  trend: DeepReadonly<
    Ref<{
      direction: 'improving' | 'stable' | 'degrading'
      rate: number
      confidence: number
    } | null>
  >
  /** Quality history for charting */
  history: DeepReadonly<Ref<CallQualityScore[]>>
  /** Whether recording is active */
  isRecording: DeepReadonly<Ref<boolean>>
  /** Start recording */
  start: () => void
  /** Stop recording */
  stop: () => void
  /** Reset history */
  reset: () => void
}

import { ref, readonly } from 'vue'

/**
 * Vue composable for recording call quality history
 *
 * Bridges real-time stats from useCallQualityStats with useCallQualityScore
 * to build a quality history timeline during calls.
 *
 * @param statsRef - Reactive reference to call quality stats
 * @param isCallActive - Whether a call is currently active
 * @param options - Configuration options
 * @returns Recording interface
 *
 * @example
 * ```ts
 * const { stats } = useCallQualityStats(sessionRef)
 * const { history, currentScore, trend } = useCallQualityRecorder(
 *   stats,
 *   computed(() => sessionRef.value?.state === 'active')
 * )
 * ```
 */
export function useCallQualityRecorder(
  statsRef: DeepReadonly<Ref<CallQualityStats>>,
  isCallActive: Ref<boolean>,
  options: UseCallQualityRecorderOptions = {}
): UseCallQualityRecorderReturn {
  const { recordIntervalMs = 2000, historySize = 30, enableTrendAnalysis = true } = options

  const isRecording = ref(false)
  let recordTimer: ReturnType<typeof setInterval> | null = null

  // Initialize quality score composable with our history size
  const {
    score,
    trend,
    history,
    updateScore,
    reset: resetScore,
  } = useCallQualityScore({
    historySize,
    enableTrendAnalysis,
  })

  /**
   * Convert CallQualityStats to QualityScoreInput
   */
  function mapStatsToScoreInput(stats: CallQualityStats): QualityScoreInput {
    return {
      packetLoss: stats.packetLossPercent ?? undefined,
      jitter: stats.jitter ?? undefined,
      rtt: stats.rtt ?? undefined,
      bitrate: stats.bitrateKbps ?? undefined,
      audioOnly: true, // VueSIP softphone is audio-only
    }
  }

  /**
   * Record a quality snapshot
   */
  function recordSnapshot(): void {
    const stats = statsRef.value
    // Only record if we have meaningful data
    if (stats.rtt !== null || stats.packetLossPercent !== null) {
      const input = mapStatsToScoreInput(stats)
      updateScore(input)
    }
  }

  /**
   * Start recording quality snapshots
   */
  function start(): void {
    if (recordTimer) return

    // Record immediately
    recordSnapshot()

    // Set up interval recording
    recordTimer = setInterval(() => {
      recordSnapshot()
    }, recordIntervalMs)

    isRecording.value = true
  }

  /**
   * Stop recording
   */
  function stop(): void {
    if (recordTimer) {
      clearInterval(recordTimer)
      recordTimer = null
    }
    isRecording.value = false
  }

  /**
   * Reset history
   */
  function reset(): void {
    stop()
    resetScore()
  }

  /**
   * Watch call state changes to auto-start/stop recording
   */
  watch(
    () => isCallActive.value,
    (active) => {
      if (active) {
        start()
      } else {
        stop()
      }
    },
    { immediate: true }
  )

  /**
   * Cleanup on stats changes (new call)
   */
  watch(
    () => statsRef.value.lastUpdated,
    (newTimestamp, oldTimestamp) => {
      // If timestamp jumped significantly, we might have a new call
      if (oldTimestamp && newTimestamp) {
        const timeDiff = newTimestamp.getTime() - oldTimestamp.getTime()
        // If gap > 5 seconds, likely a new call - reset history
        if (timeDiff > 5000) {
          resetScore()
        }
      }
    }
  )

  return {
    currentScore: readonly(score) as DeepReadonly<Ref<CallQualityScore | null>>,
    trend: readonly(trend) as DeepReadonly<
      Ref<{
        direction: 'improving' | 'stable' | 'degrading'
        rate: number
        confidence: number
      } | null>
    >,
    history: readonly(history) as DeepReadonly<Ref<CallQualityScore[]>>,
    isRecording: readonly(isRecording) as DeepReadonly<Ref<boolean>>,
    start,
    stop,
    reset,
  }
}

export default useCallQualityRecorder
