/**
 * useCallQualityStats - Unit Tests
 *
 * Tests for WebRTC call quality statistics composable
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { useCallQualityStats } from '@/composables/useCallQualityStats'
import type { CallSession } from '@/types/call.types'

// Mock RTCPeerConnection
const mockGetStats = vi.fn()

class MockRTCPeerConnection {
  getStats = mockGetStats
}

vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection)

describe('useCallQualityStats', () => {
  let sessionRef: Ref<CallSession | null>
  let mockPeerConnection: MockRTCPeerConnection

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock peer connection
    mockPeerConnection = new MockRTCPeerConnection()

    // Create a mock session with connection
    sessionRef = ref<CallSession | null>({
      id: 'test-call-1',
      direction: 'outgoing',
      remoteUri: 'sip:test@example.com',
      state: 'active',
      connection: mockPeerConnection,
    } as CallSession)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('quality level computation', () => {
    it('should return unknown when no stats available', () => {
      mockGetStats.mockResolvedValue([])

      const { qualityLevel } = useCallQualityStats(sessionRef, { pollIntervalMs: 10000 })
      expect(qualityLevel.value).toBe('unknown')
    })

    it('should return excellent for low RTT and no packet loss', async () => {
      // Mock getStats to return excellent quality
      mockGetStats.mockResolvedValue([
        {
          type: 'inbound-rtp',
          kind: 'audio',
          packetsReceived: 1000,
          packetsLost: 0,
          bytesReceived: 50000,
          timestamp: 1000,
          jitter: 0.01,
        },
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.05, // 50ms
        },
        {
          type: 'codec',
          mimeType: 'audio/opus',
        },
      ])

      const { start, qualityLevel, stats } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999, // Don't auto-poll
        minBitrateSamples: 1,
      })

      start()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(stats.value.rtt).toBe(50) // Converted to ms
      expect(qualityLevel.value).toBe('excellent')
    })

    it('should return good for moderate RTT and low packet loss', async () => {
      mockGetStats.mockResolvedValue([
        {
          type: 'inbound-rtp',
          kind: 'audio',
          packetsReceived: 1000,
          packetsLost: 10, // ~1% loss
          bytesReceived: 50000,
          timestamp: 1000,
          jitter: 0.02,
        },
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.2, // 200ms
        },
      ])

      const { start, qualityLevel } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
        minBitrateSamples: 1,
      })

      start()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(qualityLevel.value).toBe('good')
    })

    it('should return fair for higher RTT and packet loss', async () => {
      mockGetStats.mockResolvedValue([
        {
          type: 'inbound-rtp',
          kind: 'audio',
          packetsReceived: 1000,
          packetsLost: 30, // ~3% loss
          bytesReceived: 50000,
          timestamp: 1000,
          jitter: 0.03,
        },
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.4, // 400ms
        },
      ])

      const { start, qualityLevel } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
        minBitrateSamples: 1,
      })

      start()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(qualityLevel.value).toBe('fair')
    })

    it('should return poor for high RTT and packet loss', async () => {
      mockGetStats.mockResolvedValue([
        {
          type: 'inbound-rtp',
          kind: 'audio',
          packetsReceived: 1000,
          packetsLost: 100, // ~10% loss
          bytesReceived: 50000,
          timestamp: 1000,
          jitter: 0.05,
        },
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.8, // 800ms
        },
      ])

      const { start, qualityLevel } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
        minBitrateSamples: 1,
      })

      start()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 20))

      expect(qualityLevel.value).toBe('poor')
    })
  })

  describe('start/stop/reset', () => {
    it('should start collecting when start() is called', async () => {
      mockGetStats.mockResolvedValue([])

      // Use null session initially to avoid auto-start
      const sessionRef = ref<CallSession | null>(null)

      const { start, isCollecting, stats } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
      })

      expect(isCollecting.value).toBe(false)

      // Manually start - this should work even with null session
      start()

      expect(isCollecting.value).toBe(true)
      expect(stats.value.lastUpdated).toBeInstanceOf(Date)
    })

    it('should stop collecting on stop()', async () => {
      mockGetStats.mockResolvedValue([])

      const { start, stop, isCollecting } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
      })

      start()
      expect(isCollecting.value).toBe(true)

      stop()
      expect(isCollecting.value).toBe(false)
    })

    it('should reset stats on reset()', async () => {
      mockGetStats.mockResolvedValue([
        {
          type: 'inbound-rtp',
          kind: 'audio',
          packetsReceived: 100,
          packetsLost: 0,
          bytesReceived: 5000,
          timestamp: 1000,
        },
        {
          type: 'candidate-pair',
          state: 'succeeded',
          currentRoundTripTime: 0.1,
        },
      ])

      const { start, reset, stats, qualityLevel, stop } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
        minBitrateSamples: 1,
      })

      start()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Should have stats now
      expect(stats.value.rtt).not.toBeNull()

      reset()

      expect(stats.value.rtt).toBeNull()
      expect(stats.value.jitter).toBeNull()
      expect(stats.value.packetLossPercent).toBeNull()
      expect(stats.value.bitrateKbps).toBeNull()
      expect(stats.value.lastUpdated).toBeNull()
      expect(qualityLevel.value).toBe('unknown')

      stop()
    })
  })

  describe('session watching', () => {
    it('should auto-start when session becomes active', async () => {
      mockGetStats.mockResolvedValue([])

      // Start with null session
      const sessionRef = ref<CallSession | null>(null)
      const { stop, isCollecting } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
      })

      // The composable starts with isCollecting=false when session is null
      expect(isCollecting.value).toBe(false)

      // Set session to active
      sessionRef.value = {
        id: 'test-call',
        state: 'active',
        connection: mockPeerConnection,
      } as CallSession

      await nextTick()

      // Should auto-start due to watch
      expect(isCollecting.value).toBe(true)

      stop()
    })

    it('should auto-stop and reset when session becomes inactive', async () => {
      mockGetStats.mockResolvedValue([])

      const { start, stop, isCollecting, stats } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
      })

      start()
      expect(isCollecting.value).toBe(true)

      // Set session to terminated
      sessionRef.value = {
        ...sessionRef.value!,
        state: 'terminated',
      } as CallSession

      await nextTick()

      expect(isCollecting.value).toBe(false)
      expect(stats.value.lastUpdated).toBeNull()

      stop()
    })
  })

  describe('bitrate calculation', () => {
    it('should calculate bitrate across multiple samples', async () => {
      let callCount = 0
      mockGetStats.mockImplementation(async () => {
        callCount++
        const baseTime = callCount * 2000
        return [
          {
            type: 'inbound-rtp',
            kind: 'audio',
            packetsReceived: 100 * callCount,
            packetsLost: 0,
            bytesReceived: 10000 * callCount,
            timestamp: baseTime,
          },
        ]
      })

      const { start, stats, stop } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 30,
        minBitrateSamples: 2,
      })

      start()

      // Wait for multiple samples
      await new Promise((resolve) => setTimeout(resolve, 150))
      await nextTick()

      stop()

      // After 2+ samples, bitrate should be calculated
      expect(stats.value.bitrateKbps).not.toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle getStats errors gracefully', async () => {
      mockGetStats.mockRejectedValue(new Error('Stats error'))

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { start, stats, stop } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 999999,
      })

      start()
      await nextTick()
      await new Promise((resolve) => setTimeout(resolve, 20))

      // Should reset stats on error
      expect(stats.value.rtt).toBeNull()

      consoleWarnSpy.mockRestore()
      stop()
    })

    it('should handle missing peer connection', async () => {
      const sessionWithoutConnection = ref<CallSession | null>({
        id: 'test-call',
        state: 'active',
      } as CallSession)

      const { start, stats, isCollecting, stop } = useCallQualityStats(sessionWithoutConnection, {
        pollIntervalMs: 999999,
      })

      start()

      // Should still start but stats should be null (no connection)
      expect(isCollecting.value).toBe(true)
      expect(stats.value.lastUpdated).toBeNull()

      stop()
    })
  })
})
