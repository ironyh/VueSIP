/**
 * useCallQualityStats - WebRTC Call Quality Statistics Composable
 *
 * Provides real-time call quality metrics (RTT, jitter, packet loss, bitrate)
 * by polling RTCPeerConnection.getStats() during active calls.
 *
 * @module composables/useCallQualityStats
 */
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { CallSession } from '@/types/call.types'
import type { DtmfSessionSource } from './useDTMF'
import { createLogger } from '../utils/logger'

const logger = createLogger('composables:useCallQualityStats')

type CallSessionForQualityRef =
  | Ref<CallSession | null | undefined>
  | ComputedRef<CallSession | null | undefined>

/**
 * Call quality statistics
 */
export interface CallQualityStats {
  /** Round-trip time in milliseconds */
  rtt: number | null
  /** Jitter in milliseconds */
  jitter: number | null
  /** Packet loss percentage (0-100) */
  packetLossPercent: number | null
  /** Incoming bitrate in kbps */
  bitrateKbps: number | null
  /** Audio codec name */
  codec: string | null
  /** Packets received */
  packetsReceived: number | null
  /** Packets lost (absolute count) */
  packetsLost: number | null
  /** Timestamp of last update */
  lastUpdated: Date | null
}

/**
 * Quality level based on metrics
 */
export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'

/**
 * Options for useCallQualityStats
 */
export interface UseCallQualityStatsOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollIntervalMs?: number
  /** Minimum samples before calculating bitrate (default: 2) */
  minBitrateSamples?: number
}

/**
 * Composable return type
 */
export interface UseCallQualityStatsReturn {
  /** Current quality statistics */
  stats: Ref<CallQualityStats>
  /** Overall quality level */
  qualityLevel: ComputedRef<QualityLevel>
  /** Whether stats are currently being collected */
  isCollecting: Ref<boolean>
  /** Start collecting stats */
  start: () => void
  /** Stop collecting stats */
  stop: () => void
  /** Reset all stats */
  reset: () => void
}

/**
 * Default stats values
 */
const DEFAULT_STATS: CallQualityStats = {
  rtt: null,
  jitter: null,
  packetLossPercent: null,
  bitrateKbps: null,
  codec: null,
  packetsReceived: null,
  packetsLost: null,
  lastUpdated: null,
}

/**
 * Compute quality level from RTT and packet loss
 */
function computeQualityLevel(rtt: number | null, packetLossPercent: number | null): QualityLevel {
  if (rtt === null && packetLossPercent === null) {
    return 'unknown'
  }

  const effectiveRtt = rtt ?? 0
  const effectiveLoss = packetLossPercent ?? 0

  if (effectiveRtt < 150 && effectiveLoss < 1) {
    return 'excellent'
  }
  if (effectiveRtt < 300 && effectiveLoss < 3) {
    return 'good'
  }
  if (effectiveRtt < 500 && effectiveLoss < 5) {
    return 'fair'
  }
  return 'poor'
}

/**
 * Vue composable for monitoring WebRTC call quality statistics
 *
 * @param sessionRef - Reactive reference to the current call session
 * @param options - Configuration options
 * @returns Composable interface with stats and controls
 *
 * @example
 * ```ts
 * const { stats, qualityLevel, isCollecting } = useCallQualityStats(
 *   computed(() => phone.session.value)
 * )
 * // stats.value.rtt, stats.value.jitter, etc.
 * ```
 */
export function useCallQualityStats(
  sessionRef: CallSessionForQualityRef,
  options: UseCallQualityStatsOptions = {}
): UseCallQualityStatsReturn {
  const { pollIntervalMs = 2000, minBitrateSamples = 2 } = options

  // Reactive state
  const stats = ref<CallQualityStats>({ ...DEFAULT_STATS })
  const isCollecting = ref(false)

  // Internal state for bitrate calculation
  let lastBytesReceived = 0
  let lastTimestamp = 0
  let bitrateSampleCount = 0
  let pollTimer: ReturnType<typeof setInterval> | null = null

  /**
   * Get the RTCPeerConnection from the session
   */
  function getPeerConnection(): RTCPeerConnection | null {
    const session = sessionRef.value
    if (!session) return null

    // Access peer connection through session data or connection property
    const conn = (session as DtmfSessionSource).connection
    if (conn instanceof RTCPeerConnection) {
      return conn
    }

    // Fallback: try to access through sessionDescriptionHandler (JsSIP pattern)
    const sdh = (session as DtmfSessionSource).sessionDescriptionHandler
    if (sdh?.peerConnection instanceof RTCPeerConnection) {
      return sdh.peerConnection
    }

    return null
  }

  /**
   * Collect statistics from peer connection
   */
  async function collectStats(): Promise<void> {
    const pc = getPeerConnection()
    if (!pc) {
      reset()
      return
    }

    try {
      const reports = await pc.getStats()
      // Convert RTCStatsReport to array for proper TypeScript narrowing
      const statsArray = Array.from(reports.values())

      let inboundRtp: RTCInboundRtpStreamStats | null = null
      let candidatePair: RTCIceCandidatePairStats | null = null
      let codec: string | null = null

      for (const report of statsArray) {
        // Find inbound RTP stats for audio
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          inboundRtp = report as RTCInboundRtpStreamStats
        }

        // Find ICE candidate pair (for RTT)
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          candidatePair = report as RTCIceCandidatePairStats
        }

        // Find codec info
        if (report.type === 'codec' && report.mimeType?.includes('audio')) {
          codec = report.mimeType.replace('audio/', '')
        }
      }

      // Extract values before narrowing is lost
      const inbound = inboundRtp
      const pair = candidatePair

      // Calculate packet loss percentage
      let packetLossPercent: number | null = null
      if (inbound) {
        const received = inbound.packetsReceived ?? 0
        const lost = inbound.packetsLost ?? 0
        const total = received + lost
        if (total > 0) {
          packetLossPercent = (lost / total) * 100
        }
      }

      // Calculate bitrate
      let bitrateKbps: number | null = null
      if (inbound?.bytesReceived && inbound.timestamp) {
        const bytesReceived = inbound.bytesReceived
        const timestamp = inbound.timestamp

        if (lastBytesReceived > 0 && lastTimestamp > 0 && timestamp > lastTimestamp) {
          const bytesDiff = bytesReceived - lastBytesReceived
          const timeDiff = timestamp - lastTimestamp // in milliseconds

          if (timeDiff > 0) {
            // Convert to kbps: bytes * 8 / 1000 = bits / 1000 = kbps
            // Time is in ms, so multiply by 1000 to get per-second rate
            bitrateKbps = (bytesDiff * 8) / (timeDiff / 1000) / 1000
            bitrateSampleCount++
          }
        }

        lastBytesReceived = bytesReceived
        lastTimestamp = timestamp
      }

      // Only report bitrate after enough samples for stability
      const stableBitrate = bitrateSampleCount >= minBitrateSamples ? bitrateKbps : null

      // Update stats - use extracted values to avoid TS narrowing issues
      stats.value = {
        rtt: pair?.currentRoundTripTime
          ? pair.currentRoundTripTime * 1000 // Convert to ms
          : null,
        jitter: inbound?.jitter ? inbound.jitter * 1000 : null, // Convert to ms
        packetLossPercent,
        bitrateKbps: stableBitrate,
        codec,
        packetsReceived: inbound?.packetsReceived ?? null,
        packetsLost: inbound?.packetsLost ?? null,
        lastUpdated: new Date(),
      }
    } catch (error) {
      logger.warn('Failed to collect stats:', error)
    }
  }

  /**
   * Start collecting statistics
   */
  function start(): void {
    if (pollTimer) return

    // Reset bitrate calculation state
    lastBytesReceived = 0
    lastTimestamp = 0
    bitrateSampleCount = 0

    // Collect immediately
    void collectStats()

    // Set up polling
    pollTimer = setInterval(() => {
      void collectStats()
    }, pollIntervalMs)

    isCollecting.value = true
  }

  /**
   * Stop collecting statistics
   */
  function stop(): void {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    isCollecting.value = false
  }

  /**
   * Reset all statistics
   */
  function reset(): void {
    stats.value = { ...DEFAULT_STATS }
    lastBytesReceived = 0
    lastTimestamp = 0
    bitrateSampleCount = 0
  }

  /**
   * Watch session changes to auto-start/stop
   */
  watch(
    () => sessionRef.value,
    (session) => {
      if (session?.state === 'active') {
        start()
      } else {
        stop()
        reset()
      }
    },
    { immediate: true }
  )

  /**
   * Cleanup on unmount
   */
  onUnmounted(() => {
    stop()
  })

  /**
   * Computed quality level
   */
  const qualityLevel = computed<QualityLevel>(() => {
    return computeQualityLevel(stats.value.rtt, stats.value.packetLossPercent)
  })

  return {
    stats,
    qualityLevel,
    isCollecting,
    start,
    stop,
    reset,
  }
}

export default useCallQualityStats
