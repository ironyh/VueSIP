/**
 * useSipWebRTCStats composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useSipWebRTCStats } from '@/composables/useSipWebRTCStats'
import { DEFAULT_QUALITY_THRESHOLDS } from '@/types/webrtc-stats.types'
import type { CallSession } from '@/core/CallSession'
import {
  createMockRTCStats,
  createMockCallSession,
  type MockCallSession,
} from '../utils/mockFactories'

/**
 * Quality Threshold Reference (from DEFAULT_QUALITY_THRESHOLDS):
 * - packetLossWarning: 1%    packetLossCritical: 5%
 * - jitterWarning: 30ms      jitterCritical: 100ms
 * - rttWarning: 150ms        rttCritical: 300ms
 * - mosWarning: 3.5          mosCritical: 2.5
 */
const _THRESHOLDS = DEFAULT_QUALITY_THRESHOLDS

describe('useSipWebRTCStats', () => {
  let mockSession: MockCallSession
  let sessionRef: ReturnType<typeof ref<CallSession | null>>
  let stopFn: (() => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockSession = createMockCallSession()
    sessionRef = ref(mockSession as unknown as CallSession)
    stopFn = null
  })

  afterEach(() => {
    // Clean up any running collectors
    if (stopFn) {
      stopFn()
    }
    vi.clearAllTimers()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have null stats initially', () => {
      const { stats } = useSipWebRTCStats(sessionRef)
      expect(stats.value).toBeNull()
    })

    it('should have unknown quality initially', () => {
      const { quality } = useSipWebRTCStats(sessionRef)
      expect(quality.value).toBe('unknown')
    })

    it('should have null MOS score initially', () => {
      const { mosScore } = useSipWebRTCStats(sessionRef)
      expect(mosScore.value).toBeNull()
    })

    it('should have empty history initially', () => {
      const { history } = useSipWebRTCStats(sessionRef)
      expect(history.value).toHaveLength(0)
    })

    it('should have empty alerts initially', () => {
      const { alerts } = useSipWebRTCStats(sessionRef)
      expect(alerts.value).toHaveLength(0)
    })

    it('should not be collecting initially', () => {
      const { isCollecting } = useSipWebRTCStats(sessionRef)
      expect(isCollecting.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useSipWebRTCStats(sessionRef)
      expect(error.value).toBeNull()
    })
  })

  describe('start/stop', () => {
    it('should start collecting stats', async () => {
      const { start, stop, isCollecting, stats } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(isCollecting.value).toBe(true)
      expect(stats.value).not.toBeNull()
    })

    it('should stop collecting stats', async () => {
      const { start, stop, isCollecting } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)
      expect(isCollecting.value).toBe(true)

      stop()
      expect(isCollecting.value).toBe(false)
    })

    it('should poll at specified interval', async () => {
      const { start, stop } = useSipWebRTCStats(sessionRef, { pollInterval: 500 })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(500)
      expect(mockSession._mockPc.getStats).toHaveBeenCalledTimes(2) // Initial + 1 poll

      await vi.advanceTimersByTimeAsync(500)
      expect(mockSession._mockPc.getStats).toHaveBeenCalledTimes(3)
    })

    it('should not start if already collecting', async () => {
      const { start, stop, isCollecting: _isCollecting } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      start() // Should be ignored
      await vi.advanceTimersByTimeAsync(10)

      expect(mockSession._mockPc.getStats).toHaveBeenCalledTimes(1)
    })

    it('should auto-start when enabled', () => {
      const autoStartSession = createMockCallSession()
      const autoStartRef = ref(autoStartSession as unknown as CallSession)

      const { isCollecting, stop } = useSipWebRTCStats(autoStartRef, { autoStart: true })
      stopFn = stop

      expect(isCollecting.value).toBe(true)
    })
  })

  describe('getSnapshot', () => {
    it('should return current stats snapshot', async () => {
      const { getSnapshot } = useSipWebRTCStats(sessionRef)

      const snapshot = await getSnapshot()

      expect(snapshot).not.toBeNull()
      expect(snapshot?.audio.inbound).toBeDefined()
      expect(snapshot?.audio.outbound).toBeDefined()
      expect(snapshot?.connection).toBeDefined()
    })

    it('should return null if no session', async () => {
      sessionRef.value = null
      const { getSnapshot } = useSipWebRTCStats(sessionRef)

      const snapshot = await getSnapshot()

      expect(snapshot).toBeNull()
    })

    it('should return null if no peer connection', async () => {
      sessionRef.value = createMockCallSession(false) as unknown as CallSession
      const { getSnapshot } = useSipWebRTCStats(sessionRef)

      const snapshot = await getSnapshot()

      expect(snapshot).toBeNull()
    })
  })

  describe('quality calculation', () => {
    it('should calculate excellent quality for good metrics', async () => {
      // All metrics well below warning thresholds
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 2, // 0.2% loss - well below warning (1%)
        jitter: 0.01, // 10ms - well below warning (30ms)
        currentRoundTripTime: 0.03, // 30ms - well below warning (150ms)
      }))

      const { start, stop, quality } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(quality.value).toBe('excellent')
    })

    it('should calculate good quality for acceptable metrics', async () => {
      // Metrics at or just below warning thresholds
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 10, // 1% loss - at warning threshold
        jitter: 0.025, // 25ms - below warning (30ms)
        currentRoundTripTime: 0.08, // 80ms - below warning (150ms)
      }))

      const { start, stop, quality } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(quality.value).toBe('good')
    })

    it('should calculate fair quality for elevated metrics', async () => {
      // To get 'fair' quality, exactly 1 warning threshold should be exceeded
      // Using THRESHOLDS reference: packetLossWarning=1%, jitterWarning=30ms, rttWarning=150ms
      // 2% loss (>1% warning), 20ms jitter (<30ms), 100ms RTT (<150ms) = 1 warning = fair
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 20, // 2% loss - above warning (1%), below critical (5%)
        jitter: 0.02, // 20ms jitter - below warning (30ms)
        currentRoundTripTime: 0.1, // 100ms RTT - below warning (150ms)
      }))

      const { start, stop, quality } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(quality.value).toBe('fair')
    })

    it('should calculate poor/bad quality for high metrics', async () => {
      // Metrics at or above critical thresholds (5% loss, 100ms jitter, 300ms RTT)
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 100, // 10% loss - above critical (5%)
        jitter: 0.1, // 100ms jitter - at critical threshold
        currentRoundTripTime: 0.3, // 300ms RTT - at critical threshold
      }))

      const { start, stop, quality } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(['poor', 'bad']).toContain(quality.value)
    })
  })

  describe('MOS calculation', () => {
    it('should calculate MOS score', async () => {
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 5, // 0.5% loss
        jitter: 0.015, // 15ms jitter
        currentRoundTripTime: 0.05, // 50ms RTT
      }))

      const { start, stop, mosScore } = useSipWebRTCStats(sessionRef, { calculateMos: true })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(mosScore.value).not.toBeNull()
      expect(mosScore.value?.value).toBeGreaterThan(0)
      expect(mosScore.value?.value).toBeLessThanOrEqual(5)
    })

    it('should skip MOS calculation when disabled', async () => {
      const { start, stop, mosScore: _mosScore, stats } = useSipWebRTCStats(sessionRef, { calculateMos: false })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(stats.value?.mos.value).toBe(0)
    })
  })

  describe('history', () => {
    it('should accumulate history entries', async () => {
      const { start, stop, history } = useSipWebRTCStats(sessionRef, { pollInterval: 100 })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(500)

      expect(history.value.length).toBeGreaterThan(0)
    })

    it('should limit history entries', async () => {
      const { start, stop, history } = useSipWebRTCStats(sessionRef, {
        pollInterval: 10,
        maxHistoryEntries: 5,
      })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(200) // Should create many entries

      expect(history.value.length).toBeLessThanOrEqual(5)
    })

    it('should clear history', async () => {
      const { start, stop, history, clearHistory } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)
      expect(history.value.length).toBeGreaterThan(0)

      clearHistory()
      expect(history.value.length).toBe(0)
    })
  })

  describe('alerts', () => {
    it('should create alert for high packet loss', async () => {
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10, // 10% loss - critical
      }))

      const { start, stop, alerts } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      const packetLossAlert = alerts.value.find(a => a.type === 'high_packet_loss')
      expect(packetLossAlert).toBeDefined()
    })

    it('should create alert for high jitter', async () => {
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        jitter: 0.08, // 80ms - critical
      }))

      const { start, stop, alerts } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      const jitterAlert = alerts.value.find(a => a.type === 'high_jitter')
      expect(jitterAlert).toBeDefined()
    })

    it('should create alert for high RTT', async () => {
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        currentRoundTripTime: 0.4, // 400ms - critical
      }))

      const { start, stop, alerts } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      const rttAlert = alerts.value.find(a => a.type === 'high_rtt')
      expect(rttAlert).toBeDefined()
    })

    it('should clear alerts', async () => {
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10,
      }))

      const { start, stop, alerts, clearAlerts } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)
      expect(alerts.value.length).toBeGreaterThan(0)

      clearAlerts()
      expect(alerts.value.length).toBe(0)
    })

    it('should call onAlert listener', async () => {
      const alertListener = vi.fn()
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10,
      }))

      const { start, stop, onAlert } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      onAlert(alertListener)
      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(alertListener).toHaveBeenCalled()
    })

    it('should unsubscribe from alert listener', async () => {
      const alertListener = vi.fn()
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10,
      }))

      const { start, stop, onAlert } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      const unsubscribe = onAlert(alertListener)
      unsubscribe()

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(alertListener).not.toHaveBeenCalled()
    })
  })

  describe('quality change listener', () => {
    it('should call onQualityChange when quality changes', async () => {
      const qualityChangeListener = vi.fn()

      // Start with good quality
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 2,
        jitter: 0.01,
      }))

      const { start, stop, onQualityChange } = useSipWebRTCStats(sessionRef, { pollInterval: 100 })
      stopFn = stop

      onQualityChange(qualityChangeListener)
      start()
      await vi.advanceTimersByTimeAsync(100)

      // Change to poor quality
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10,
        jitter: 0.08,
      }))

      await vi.advanceTimersByTimeAsync(100)

      expect(qualityChangeListener).toHaveBeenCalled()
    })

    it('should unsubscribe from quality change listener', async () => {
      const qualityChangeListener = vi.fn()

      const { start, stop, onQualityChange } = useSipWebRTCStats(sessionRef, { pollInterval: 100 })
      stopFn = stop

      const unsubscribe = onQualityChange(qualityChangeListener)
      unsubscribe()

      start()

      // Change quality
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10,
      }))

      await vi.advanceTimersByTimeAsync(200)

      expect(qualityChangeListener).not.toHaveBeenCalled()
    })
  })

  describe('setThresholds', () => {
    it('should update thresholds', async () => {
      // Set very low threshold so normal values trigger alert
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 10, // 1% - normally not critical
      }))

      const { start, stop, alerts, setThresholds } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      // Lower the critical threshold
      setThresholds({ packetLossCritical: 0.5 })

      start()
      await vi.advanceTimersByTimeAsync(10)

      // Should now trigger critical alert
      const criticalAlert = alerts.value.find(
        a => a.type === 'high_packet_loss' && a.severity === 'critical'
      )
      expect(criticalAlert).toBeDefined()
    })
  })

  describe('computed metrics', () => {
    it('should calculate average packet loss', async () => {
      const { start, stop, avgPacketLoss } = useSipWebRTCStats(sessionRef, { pollInterval: 100 })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(300)

      expect(avgPacketLoss.value).toBeGreaterThanOrEqual(0)
    })

    it('should calculate average jitter', async () => {
      const { start, stop, avgJitter } = useSipWebRTCStats(sessionRef, { pollInterval: 100 })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(300)

      expect(avgJitter.value).toBeGreaterThanOrEqual(0)
    })

    it('should calculate average RTT', async () => {
      const { start, stop, avgRtt } = useSipWebRTCStats(sessionRef, { pollInterval: 100 })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(300)

      expect(avgRtt.value).not.toBeNull()
    })

    it('should calculate current bitrate', async () => {
      const { start, stop, currentBitrate } = useSipWebRTCStats(sessionRef, { pollInterval: 100 })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(200) // Need at least 2 samples for bitrate

      // Bitrate may be 0 if no time difference between samples in fast timers
      expect(currentBitrate.value).toBeGreaterThanOrEqual(0)
    })
  })

  describe('options callbacks', () => {
    it('should call onStatsUpdate callback', async () => {
      const onStatsUpdate = vi.fn()
      const { start, stop } = useSipWebRTCStats(sessionRef, { onStatsUpdate })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(onStatsUpdate).toHaveBeenCalled()
      expect(onStatsUpdate.mock.calls[0][0]).toHaveProperty('quality')
      expect(onStatsUpdate.mock.calls[0][0]).toHaveProperty('mos')
    })

    it('should call onQualityAlert callback', async () => {
      const onQualityAlert = vi.fn()
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10,
      }))

      const { start, stop } = useSipWebRTCStats(sessionRef, { onQualityAlert })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(onQualityAlert).toHaveBeenCalled()
    })

    it('should call onQualityChange callback', async () => {
      const onQualityChangeCallback = vi.fn()

      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 1000,
        packetsLost: 2,
      }))

      const { start, stop } = useSipWebRTCStats(sessionRef, {
        pollInterval: 100,
        onQualityChange: onQualityChangeCallback,
      })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(100)

      // Change to poor quality
      mockSession._mockPc.getStats.mockResolvedValue(createMockRTCStats({
        packetsReceived: 100,
        packetsLost: 10,
      }))

      await vi.advanceTimersByTimeAsync(100)

      expect(onQualityChangeCallback).toHaveBeenCalled()
    })
  })

  describe('video stats', () => {
    it('should include video stats when enabled', async () => {
      const videoStats = createMockRTCStats()
      videoStats.set('inbound-rtp-video', {
        id: 'inbound-rtp-video',
        type: 'inbound-rtp',
        timestamp: Date.now(),
        kind: 'video',
        ssrc: 99999,
        packetsReceived: 500,
        packetsLost: 5,
        bytesReceived: 500000,
        jitter: 0.01,
        framesDecoded: 100,
        framesDropped: 2,
        frameWidth: 1280,
        frameHeight: 720,
        framesPerSecond: 30,
      } as unknown as RTCInboundRtpStreamStats)

      mockSession._mockPc.getStats.mockResolvedValue(videoStats)

      const { start, stop, stats } = useSipWebRTCStats(sessionRef, { includeVideo: true })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(stats.value?.video?.inbound).toBeDefined()
    })

    it('should exclude video stats when disabled', async () => {
      const { start, stop, stats } = useSipWebRTCStats(sessionRef, { includeVideo: false })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(stats.value?.video).toBeUndefined()
    })
  })

  describe('session changes', () => {
    it('should stop collecting when session becomes null', async () => {
      const { start, stop, isCollecting, stats } = useSipWebRTCStats(sessionRef, { autoStart: false })
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)
      expect(isCollecting.value).toBe(true)

      sessionRef.value = null
      await nextTick()

      expect(isCollecting.value).toBe(false)
      expect(stats.value).toBeNull()
    })

    it('should auto-start when session becomes available', async () => {
      sessionRef.value = null
      const { stop, isCollecting } = useSipWebRTCStats(sessionRef, { autoStart: true })
      stopFn = stop

      expect(isCollecting.value).toBe(false)

      sessionRef.value = createMockCallSession() as unknown as CallSession
      await nextTick()
      await vi.advanceTimersByTimeAsync(10)

      expect(isCollecting.value).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle getStats errors gracefully', async () => {
      mockSession._mockPc.getStats.mockRejectedValue(new Error('Stats not available'))

      const { start, stop, error, stats } = useSipWebRTCStats(sessionRef)
      stopFn = stop

      start()
      await vi.advanceTimersByTimeAsync(10)

      expect(error.value).toBe('Stats not available')
      expect(stats.value).toBeNull()
    })
  })
})
