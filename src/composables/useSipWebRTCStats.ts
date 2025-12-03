/**
 * WebRTC Statistics Composable
 *
 * Vue composable for collecting and analyzing WebRTC call quality metrics.
 * Provides real-time quality monitoring, MOS estimation, and quality alerts.
 *
 * @module composables/useSipWebRTCStats
 */

import { ref, computed, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import type { CallSession } from '@/core/CallSession'
import type {
  CallQualityStats,
  ConnectionQuality,
  MosScore,
  InboundRtpStats,
  OutboundRtpStats,
  IceCandidatePairStats,
  QualityAlert,
  QualityThresholds,
  StatsHistoryEntry,
  UseSipWebRTCStatsOptions,
  AudioCodecInfo,
  VideoCodecInfo,
} from '@/types/webrtc-stats.types'
import { DEFAULT_QUALITY_THRESHOLDS } from '@/types/webrtc-stats.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useSipWebRTCStats')

/**
 * Return type for useSipWebRTCStats composable
 */
export interface UseSipWebRTCStatsReturn {
  // State
  /** Current call quality statistics */
  stats: Ref<CallQualityStats | null>
  /** Current connection quality level */
  quality: ComputedRef<ConnectionQuality>
  /** Current MOS score */
  mosScore: ComputedRef<MosScore | null>
  /** Stats collection history */
  history: Ref<StatsHistoryEntry[]>
  /** Active quality alerts */
  alerts: Ref<QualityAlert[]>
  /** Whether stats collection is active */
  isCollecting: Ref<boolean>
  /** Error message if any */
  error: Ref<string | null>

  // Computed metrics
  /** Average packet loss (percentage) */
  avgPacketLoss: ComputedRef<number>
  /** Average jitter (ms) */
  avgJitter: ComputedRef<number>
  /** Average round-trip time (ms) */
  avgRtt: ComputedRef<number | null>
  /** Current bitrate (kbps) */
  currentBitrate: ComputedRef<number>

  // Methods
  /** Start collecting stats */
  start: () => void
  /** Stop collecting stats */
  stop: () => void
  /** Get current stats snapshot */
  getSnapshot: () => Promise<CallQualityStats | null>
  /** Clear stats history */
  clearHistory: () => void
  /** Clear alerts */
  clearAlerts: () => void
  /** Update quality thresholds */
  setThresholds: (thresholds: Partial<QualityThresholds>) => void
  /** Listen for quality alerts */
  onAlert: (callback: (alert: QualityAlert) => void) => () => void
  /** Listen for quality changes */
  onQualityChange: (callback: (newQuality: ConnectionQuality, oldQuality: ConnectionQuality) => void) => () => void
}

/**
 * WebRTC Statistics Composable
 *
 * Collects and analyzes WebRTC statistics from an active call session.
 *
 * @param sessionRef - Ref to CallSession instance
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const callSession = useCallSession(sipClient)
 * const {
 *   stats,
 *   quality,
 *   mosScore,
 *   start,
 *   stop,
 *   onAlert
 * } = useSipWebRTCStats(callSession.getCurrentSession())
 *
 * // Start collecting when call is active
 * watch(() => callSession.callState.value, (state) => {
 *   if (state === 'active') start()
 * })
 *
 * // Listen for quality alerts
 * onAlert((alert) => {
 *   if (alert.severity === 'critical') {
 *     console.warn('Call quality issue:', alert.message)
 *   }
 * })
 *
 * // Watch quality level
 * watch(quality, (q) => {
 *   console.log(`Call quality: ${q}`)
 * })
 * ```
 */
export function useSipWebRTCStats(
  sessionRef: Ref<CallSession | null>,
  options: UseSipWebRTCStatsOptions = {}
): UseSipWebRTCStatsReturn {
  const {
    pollInterval = 1000,
    autoStart = false,
    maxHistoryEntries = 300, // 5 minutes at 1s intervals
    thresholds: initialThresholds,
    onStatsUpdate,
    onQualityAlert,
    onQualityChange: onQualityChangeCallback,
    includeVideo = true,
    calculateMos = true,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const stats = ref<CallQualityStats | null>(null)
  const history = ref<StatsHistoryEntry[]>([])
  const alerts = ref<QualityAlert[]>([])
  const isCollecting = ref(false)
  const error = ref<string | null>(null)
  const thresholds = ref<QualityThresholds>({
    ...DEFAULT_QUALITY_THRESHOLDS,
    ...initialThresholds,
  })

  const alertListeners = ref<Array<(alert: QualityAlert) => void>>([])
  const qualityChangeListeners = ref<Array<(newQuality: ConnectionQuality, oldQuality: ConnectionQuality) => void>>([])

  let pollTimer: number | null = null
  let previousQuality: ConnectionQuality = 'unknown'
  let previousStats: {
    bytesReceived: number
    bytesSent: number
    timestamp: number
  } | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const quality = computed<ConnectionQuality>(() => stats.value?.quality || 'unknown')

  const mosScore = computed<MosScore | null>(() => stats.value?.mos || null)

  const avgPacketLoss = computed(() => {
    if (history.value.length === 0) return 0
    const sum = history.value.reduce((acc, entry) => acc + entry.packetLoss, 0)
    return sum / history.value.length
  })

  const avgJitter = computed(() => {
    if (history.value.length === 0) return 0
    const sum = history.value.reduce((acc, entry) => acc + entry.jitter, 0)
    return sum / history.value.length
  })

  const avgRtt = computed(() => {
    const entries = history.value.filter((e) => e.rtt !== undefined)
    if (entries.length === 0) return null
    const sum = entries.reduce((acc, entry) => acc + (entry.rtt || 0), 0)
    return sum / entries.length
  })

  const currentBitrate = computed(() => {
    return stats.value?.audio.inbound?.bitrate
      ? Math.round(stats.value.audio.inbound.bitrate / 1000)
      : 0
  })

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Calculate MOS score from network metrics
   * Uses E-Model simplified formula
   */
  const calculateMosScore = (
    packetLoss: number,
    jitterMs: number,
    rttMs: number = 0
  ): MosScore => {
    // Simplified E-Model calculation
    // R = 93.2 - Is - Id - Ie
    // Where:
    // - Is = 0 (no simultaneous impairment)
    // - Id = 0.024*d + 0.11*(d-177.3)*H(d-177.3) (delay impairment)
    // - Ie = effective equipment impairment

    const d = rttMs / 2 + jitterMs // One-way delay approximation
    const H = (x: number) => (x > 0 ? 1 : 0) // Heaviside function

    // Delay impairment
    const Id = 0.024 * d + 0.11 * (d - 177.3) * H(d - 177.3)

    // Packet loss impairment (codec-dependent, simplified)
    const Ie = packetLoss * 2.5 + packetLoss * packetLoss * 0.1

    // Calculate R-factor
    let R = 93.2 - Id - Ie

    // Clamp R to valid range
    R = Math.max(0, Math.min(100, R))

    // Convert R to MOS
    let mos: number
    if (R < 0) {
      mos = 1
    } else if (R > 100) {
      mos = 4.5
    } else {
      mos = 1 + 0.035 * R + 7e-6 * R * (R - 60) * (100 - R)
    }

    // Round to 1 decimal
    mos = Math.round(mos * 10) / 10

    // Determine quality label
    let qualityLabel: ConnectionQuality
    if (mos >= 4.3) qualityLabel = 'excellent'
    else if (mos >= 4.0) qualityLabel = 'good'
    else if (mos >= 3.6) qualityLabel = 'fair'
    else if (mos >= 3.1) qualityLabel = 'poor'
    else qualityLabel = 'bad'

    return {
      value: mos,
      quality: qualityLabel,
      timestamp: Date.now(),
    }
  }

  /**
   * Determine overall connection quality
   */
  const determineQuality = (
    packetLoss: number,
    jitterMs: number,
    rttMs?: number
  ): ConnectionQuality => {
    const t = thresholds.value

    // Check critical thresholds
    if (packetLoss >= t.packetLossCritical || jitterMs >= t.jitterCritical) {
      return 'bad'
    }
    if (rttMs !== undefined && rttMs >= t.rttCritical) {
      return 'bad'
    }

    // Check warning thresholds
    const warnings = [
      packetLoss >= t.packetLossWarning,
      jitterMs >= t.jitterWarning,
      rttMs !== undefined && rttMs >= t.rttWarning,
    ].filter(Boolean).length

    if (warnings >= 2) return 'poor'
    if (warnings >= 1) return 'fair'
    if (packetLoss < 0.5 && jitterMs < 20) return 'excellent'

    return 'good'
  }

  /**
   * Check for quality alerts
   */
  const checkAlerts = (
    packetLoss: number,
    jitterMs: number,
    rttMs?: number,
    mosValue?: number
  ): void => {
    const t = thresholds.value
    const newAlerts: QualityAlert[] = []

    // Packet loss alerts
    if (packetLoss >= t.packetLossCritical) {
      newAlerts.push({
        type: 'high_packet_loss',
        severity: 'critical',
        message: `Critical packet loss: ${packetLoss.toFixed(1)}%`,
        value: packetLoss,
        threshold: t.packetLossCritical,
        timestamp: new Date(),
      })
    } else if (packetLoss >= t.packetLossWarning) {
      newAlerts.push({
        type: 'high_packet_loss',
        severity: 'warning',
        message: `High packet loss: ${packetLoss.toFixed(1)}%`,
        value: packetLoss,
        threshold: t.packetLossWarning,
        timestamp: new Date(),
      })
    }

    // Jitter alerts
    if (jitterMs >= t.jitterCritical) {
      newAlerts.push({
        type: 'high_jitter',
        severity: 'critical',
        message: `Critical jitter: ${jitterMs.toFixed(0)}ms`,
        value: jitterMs,
        threshold: t.jitterCritical,
        timestamp: new Date(),
      })
    } else if (jitterMs >= t.jitterWarning) {
      newAlerts.push({
        type: 'high_jitter',
        severity: 'warning',
        message: `High jitter: ${jitterMs.toFixed(0)}ms`,
        value: jitterMs,
        threshold: t.jitterWarning,
        timestamp: new Date(),
      })
    }

    // RTT alerts
    if (rttMs !== undefined) {
      if (rttMs >= t.rttCritical) {
        newAlerts.push({
          type: 'high_rtt',
          severity: 'critical',
          message: `Critical latency: ${rttMs.toFixed(0)}ms`,
          value: rttMs,
          threshold: t.rttCritical,
          timestamp: new Date(),
        })
      } else if (rttMs >= t.rttWarning) {
        newAlerts.push({
          type: 'high_rtt',
          severity: 'warning',
          message: `High latency: ${rttMs.toFixed(0)}ms`,
          value: rttMs,
          threshold: t.rttWarning,
          timestamp: new Date(),
        })
      }
    }

    // MOS alerts
    if (mosValue !== undefined) {
      if (mosValue <= t.mosCritical) {
        newAlerts.push({
          type: 'quality_degradation',
          severity: 'critical',
          message: `Critical call quality: MOS ${mosValue.toFixed(1)}`,
          value: mosValue,
          threshold: t.mosCritical,
          timestamp: new Date(),
        })
      } else if (mosValue <= t.mosWarning) {
        newAlerts.push({
          type: 'quality_degradation',
          severity: 'warning',
          message: `Degraded call quality: MOS ${mosValue.toFixed(1)}`,
          value: mosValue,
          threshold: t.mosWarning,
          timestamp: new Date(),
        })
      }
    }

    // Notify listeners for new alerts
    newAlerts.forEach((alert) => {
      alerts.value.push(alert)

      // Call option callback
      if (onQualityAlert) {
        try {
          onQualityAlert(alert)
        } catch (err) {
          logger.error('Error in onQualityAlert callback', err)
        }
      }

      // Call registered listeners
      alertListeners.value.forEach((listener) => {
        try {
          listener(alert)
        } catch (err) {
          logger.error('Error in alert listener', err)
        }
      })
    })

    // Limit alerts array size
    if (alerts.value.length > 100) {
      alerts.value = alerts.value.slice(-100)
    }
  }

  /**
   * Parse codec info from RTCCodecStats
   */
  const parseCodecInfo = (
    codecStats: RTCStatsReport,
    codecId: string | undefined,
    kind: 'audio' | 'video'
  ): AudioCodecInfo | VideoCodecInfo | undefined => {
    if (!codecId) return undefined

    const codec = codecStats.get(codecId)
    if (!codec || codec.type !== 'codec') return undefined

    const base = {
      name: codec.mimeType?.split('/')[1] || 'unknown',
      payloadType: codec.payloadType || 0,
      clockRate: codec.clockRate || 0,
      mimeType: codec.mimeType || '',
    }

    if (kind === 'audio') {
      return {
        ...base,
        channels: codec.channels,
      } as AudioCodecInfo
    }

    return base as VideoCodecInfo
  }

  /**
   * Collect stats from RTCPeerConnection
   */
  const collectStats = async (): Promise<CallQualityStats | null> => {
    const session = sessionRef.value
    if (!session) return null

    // Get RTCPeerConnection from session
    const pc = session.connection
    if (!pc) {
      logger.debug('No RTCPeerConnection available')
      return null
    }

    try {
      const rtcStats = await pc.getStats()
      const timestamp = Date.now()

      let audioInbound: InboundRtpStats | undefined
      let audioOutbound: OutboundRtpStats | undefined
      let videoInbound: InboundRtpStats | undefined
      let videoOutbound: OutboundRtpStats | undefined
      let candidatePair: IceCandidatePairStats | undefined

      rtcStats.forEach((report: RTCStats) => {
        if (report.type === 'inbound-rtp') {
          const inbound = parseInboundRtp(report as RTCInboundRtpStreamStats, rtcStats, timestamp)
          if ((report as RTCInboundRtpStreamStats).kind === 'audio') {
            audioInbound = inbound
          } else if ((report as RTCInboundRtpStreamStats).kind === 'video' && includeVideo) {
            videoInbound = inbound
          }
        } else if (report.type === 'outbound-rtp') {
          const outbound = parseOutboundRtp(report as RTCOutboundRtpStreamStats, rtcStats, timestamp)
          if ((report as RTCOutboundRtpStreamStats).kind === 'audio') {
            audioOutbound = outbound
          } else if ((report as RTCOutboundRtpStreamStats).kind === 'video' && includeVideo) {
            videoOutbound = outbound
          }
        } else if (report.type === 'candidate-pair' && (report as RTCIceCandidatePairStats).state === 'succeeded') {
          if ((report as RTCIceCandidatePairStats).nominated || !candidatePair) {
            candidatePair = parseCandidatePair(report as RTCIceCandidatePairStats, rtcStats, timestamp)
          }
        }
      })

      // Calculate metrics
      const packetLoss = audioInbound?.packetLossPercent || 0
      const jitterMs = audioInbound?.jitterMs || 0
      const rttMs = candidatePair?.currentRoundTripTimeMs

      // Calculate MOS
      const mos = calculateMos
        ? calculateMosScore(packetLoss, jitterMs, rttMs)
        : { value: 0, quality: 'unknown' as ConnectionQuality, timestamp }

      // Determine quality
      const overallQuality = determineQuality(packetLoss, jitterMs, rttMs)

      // Check for quality change
      if (overallQuality !== previousQuality) {
        notifyQualityChange(overallQuality, previousQuality)
        previousQuality = overallQuality
      }

      // Check for alerts
      checkAlerts(packetLoss, jitterMs, rttMs, mos.value)

      const qualityStats: CallQualityStats = {
        quality: overallQuality,
        mos,
        audio: {
          inbound: audioInbound,
          outbound: audioOutbound,
        },
        video: includeVideo
          ? {
              inbound: videoInbound,
              outbound: videoOutbound,
            }
          : undefined,
        connection: candidatePair,
        network: {
          rtt: rttMs,
          jitter: jitterMs,
          packetLoss,
          bandwidth: candidatePair?.availableOutgoingBitrate
            ? Math.round(candidatePair.availableOutgoingBitrate / 1000)
            : undefined,
        },
        timestamp,
      }

      // Update state
      stats.value = qualityStats

      // Add to history
      addToHistory(qualityStats)

      // Notify callbacks
      if (onStatsUpdate) {
        try {
          onStatsUpdate(qualityStats)
        } catch (err) {
          logger.error('Error in onStatsUpdate callback', err)
        }
      }

      return qualityStats
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to collect stats'
      logger.error('Failed to collect WebRTC stats', err)
      return null
    }
  }

  const parseInboundRtp = (
    report: RTCInboundRtpStreamStats,
    allStats: RTCStatsReport,
    timestamp: number
  ): InboundRtpStats => {
    const packetsLost = report.packetsLost || 0
    const packetsReceived = report.packetsReceived || 0
    const totalPackets = packetsReceived + packetsLost
    const packetLossPercent = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0

    // Calculate bitrate
    let bitrate = 0
    if (previousStats) {
      const timeDiff = (timestamp - previousStats.timestamp) / 1000
      if (timeDiff > 0) {
        const bytesDiff = (report.bytesReceived || 0) - previousStats.bytesReceived
        bitrate = (bytesDiff * 8) / timeDiff
      }
    }

    return {
      ssrc: report.ssrc,
      kind: report.kind as 'audio' | 'video',
      codec: parseCodecInfo(allStats, report.codecId, report.kind as 'audio' | 'video'),
      packetsReceived,
      packetsLost,
      packetLossPercent,
      bytesReceived: report.bytesReceived || 0,
      jitter: report.jitter || 0,
      jitterMs: (report.jitter || 0) * 1000,
      roundTripTime: (report as RTCInboundRtpStreamStats & { roundTripTime?: number }).roundTripTime,
      roundTripTimeMs: ((report as RTCInboundRtpStreamStats & { roundTripTime?: number }).roundTripTime || 0) * 1000,
      framesDecoded: report.framesDecoded,
      framesDropped: report.framesDropped,
      frameWidth: report.frameWidth,
      frameHeight: report.frameHeight,
      framesPerSecond: report.framesPerSecond,
      bitrate,
      timestamp,
    }
  }

  const parseOutboundRtp = (
    report: RTCOutboundRtpStreamStats,
    allStats: RTCStatsReport,
    timestamp: number
  ): OutboundRtpStats => {
    // Calculate bitrate
    let bitrate = 0
    if (previousStats) {
      const timeDiff = (timestamp - previousStats.timestamp) / 1000
      if (timeDiff > 0) {
        const bytesDiff = (report.bytesSent || 0) - previousStats.bytesSent
        bitrate = (bytesDiff * 8) / timeDiff
      }
    }

    return {
      ssrc: report.ssrc,
      kind: report.kind as 'audio' | 'video',
      codec: parseCodecInfo(allStats, report.codecId, report.kind as 'audio' | 'video'),
      packetsSent: report.packetsSent || 0,
      bytesSent: report.bytesSent || 0,
      retransmittedPacketsSent: report.retransmittedPacketsSent,
      targetBitrate: report.targetBitrate,
      framesEncoded: report.framesEncoded,
      frameWidth: report.frameWidth,
      frameHeight: report.frameHeight,
      framesPerSecond: report.framesPerSecond,
      qualityLimitationReason: (report as RTCOutboundRtpStreamStats & { qualityLimitationReason?: string }).qualityLimitationReason as 'none' | 'cpu' | 'bandwidth' | 'other' | undefined,
      bitrate,
      timestamp,
    }
  }

  const parseCandidatePair = (
    report: RTCIceCandidatePairStats,
    allStats: RTCStatsReport,
    timestamp: number
  ): IceCandidatePairStats => {
    const localCandidate = allStats.get(report.localCandidateId)
    const remoteCandidate = allStats.get(report.remoteCandidateId)

    // Extended ICE candidate pair with optional fields
    type ExtendedIceCandidatePairStats = RTCIceCandidatePairStats & {
      priority?: number
      consentRequestsSent?: number
    }
    const extReport = report as ExtendedIceCandidatePairStats

    return {
      id: report.id,
      state: report.state,
      nominated: report.nominated || false,
      priority: extReport.priority,
      localCandidateType: localCandidate?.candidateType || 'host',
      remoteCandidateType: remoteCandidate?.candidateType || 'host',
      localAddress: localCandidate?.address,
      remoteAddress: remoteCandidate?.address,
      currentRoundTripTime: report.currentRoundTripTime,
      currentRoundTripTimeMs: (report.currentRoundTripTime || 0) * 1000,
      availableOutgoingBitrate: report.availableOutgoingBitrate,
      availableIncomingBitrate: report.availableIncomingBitrate,
      bytesSent: report.bytesSent || 0,
      bytesReceived: report.bytesReceived || 0,
      requestsSent: report.requestsSent || 0,
      responsesReceived: report.responsesReceived || 0,
      consentRequestsSent: extReport.consentRequestsSent,
      timestamp,
    }
  }

  const addToHistory = (qualityStats: CallQualityStats): void => {
    const entry: StatsHistoryEntry = {
      timestamp: qualityStats.timestamp,
      mos: qualityStats.mos.value,
      packetLoss: qualityStats.network.packetLoss || 0,
      jitter: qualityStats.network.jitter || 0,
      rtt: qualityStats.network.rtt,
      bitrate: qualityStats.network.bandwidth || 0,
    }

    history.value.push(entry)

    // Limit history size
    if (history.value.length > maxHistoryEntries) {
      history.value = history.value.slice(-maxHistoryEntries)
    }

    // Update previous stats for bitrate calculation
    previousStats = {
      bytesReceived: qualityStats.audio.inbound?.bytesReceived || 0,
      bytesSent: qualityStats.audio.outbound?.bytesSent || 0,
      timestamp: qualityStats.timestamp,
    }
  }

  const notifyQualityChange = (newQuality: ConnectionQuality, oldQuality: ConnectionQuality): void => {
    // Call option callback
    if (onQualityChangeCallback) {
      try {
        onQualityChangeCallback(newQuality, oldQuality)
      } catch (err) {
        logger.error('Error in onQualityChange callback', err)
      }
    }

    // Call registered listeners
    qualityChangeListeners.value.forEach((listener) => {
      try {
        listener(newQuality, oldQuality)
      } catch (err) {
        logger.error('Error in quality change listener', err)
      }
    })
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Start collecting stats
   */
  const start = (): void => {
    if (isCollecting.value) return

    isCollecting.value = true
    previousQuality = 'unknown'
    previousStats = null

    // Collect immediately
    collectStats()

    // Start polling
    pollTimer = window.setInterval(() => {
      collectStats()
    }, pollInterval)
  }

  /**
   * Stop collecting stats
   */
  const stop = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    isCollecting.value = false
  }

  /**
   * Get current stats snapshot
   */
  const getSnapshot = async (): Promise<CallQualityStats | null> => {
    return collectStats()
  }

  /**
   * Clear stats history
   */
  const clearHistory = (): void => {
    history.value = []
    previousStats = null
  }

  /**
   * Clear alerts
   */
  const clearAlerts = (): void => {
    alerts.value = []
  }

  /**
   * Update quality thresholds
   */
  const setThresholds = (newThresholds: Partial<QualityThresholds>): void => {
    thresholds.value = {
      ...thresholds.value,
      ...newThresholds,
    }
  }

  /**
   * Listen for quality alerts
   */
  const onAlert = (callback: (alert: QualityAlert) => void): (() => void) => {
    alertListeners.value.push(callback)
    return () => {
      const index = alertListeners.value.indexOf(callback)
      if (index !== -1) {
        alertListeners.value.splice(index, 1)
      }
    }
  }

  /**
   * Listen for quality changes
   */
  const onQualityChange = (
    callback: (newQuality: ConnectionQuality, oldQuality: ConnectionQuality) => void
  ): (() => void) => {
    qualityChangeListeners.value.push(callback)
    return () => {
      const index = qualityChangeListeners.value.indexOf(callback)
      if (index !== -1) {
        qualityChangeListeners.value.splice(index, 1)
      }
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Watch for session changes
  watch(
    sessionRef,
    (session, oldSession) => {
      if (session && autoStart) {
        start()
      } else if (!session && oldSession) {
        stop()
        stats.value = null
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    stop()
    clearHistory()
    clearAlerts()
    alertListeners.value = []
    qualityChangeListeners.value = []
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    stats,
    quality,
    mosScore,
    history,
    alerts,
    isCollecting,
    error,

    // Computed metrics
    avgPacketLoss,
    avgJitter,
    avgRtt,
    currentBitrate,

    // Methods
    start,
    stop,
    getSnapshot,
    clearHistory,
    clearAlerts,
    setThresholds,
    onAlert,
    onQualityChange,
  }
}
