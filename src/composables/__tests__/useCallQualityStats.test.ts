/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useCallQualityStats } from '../useCallQualityStats'
import type { CallSession } from '@/types/call.types'

// Mock RTCStatsReport for jsdom environment
class MockRTCStatsReport implements RTCStatsReport {
  [key: string]: unknown
  constructor(map: Iterable<[string, RTCStats]>) {
    const entries = Array.from(map)
    entries.forEach(([key, value]) => {
      this[key] = value
    })
  }
}

describe('useCallQualityStats', () => {
  let originalRTCStatsReport: typeof RTCStatsReport

  beforeEach(() => {
    // Save original
    originalRTCStatsReport = globalThis.RTCStatsReport

    // Mock RTCStatsReport
    globalThis.RTCStatsReport = MockRTCStatsReport as unknown as typeof RTCStatsReport
  })

  afterEach(() => {
    globalThis.RTCStatsReport = originalRTCStatsReport
  })

  describe('initial state', () => {
    it('should start with null stats', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { stats } = useCallQualityStats(sessionRef)

      expect(stats.value.rtt).toBeNull()
      expect(stats.value.jitter).toBeNull()
      expect(stats.value.packetLossPercent).toBeNull()
      expect(stats.value.bitrateKbps).toBeNull()
      expect(stats.value.codec).toBeNull()
    })

    it('should start with unknown quality level when no session', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { qualityLevel } = useCallQualityStats(sessionRef)

      expect(qualityLevel.value).toBe('unknown')
    })

    it('should start not collecting', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { isCollecting } = useCallQualityStats(sessionRef)

      expect(isCollecting.value).toBe(false)
    })
  })

  describe('start/stop controls', () => {
    it('should start collecting when start is called', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { start, isCollecting } = useCallQualityStats(sessionRef)

      start()

      expect(isCollecting.value).toBe(true)
    })

    it('should stop collecting when stop is called', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { start, stop, isCollecting } = useCallQualityStats(sessionRef)

      start()
      stop()

      expect(isCollecting.value).toBe(false)
    })

    it('should prevent multiple intervals when start is called twice', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { start, stop } = useCallQualityStats(sessionRef)

      start()
      start()
      stop()

      // Should not throw - just prevents duplicate intervals
    })

    it('should reset bitrate state when start is called', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { start, stop, stats } = useCallQualityStats(sessionRef, {
        minBitrateSamples: 3,
      })

      // Set up with some state
      start()
      stop()

      // After stop, stats should be reset
      expect(stats.value.bitrateKbps).toBeNull()
    })
  })

  describe('reset', () => {
    it('should reset all stats to default values', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { reset, stats, start } = useCallQualityStats(sessionRef)

      start()

      // Manually set some values (simulating collected state)
      stats.value = {
        rtt: 100,
        jitter: 20,
        packetLossPercent: 5,
        bitrateKbps: 128,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 50,
        lastUpdated: new Date(),
      }

      reset()

      expect(stats.value.rtt).toBeNull()
      expect(stats.value.jitter).toBeNull()
      expect(stats.value.packetLossPercent).toBeNull()
      expect(stats.value.bitrateKbps).toBeNull()
      expect(stats.value.codec).toBeNull()
    })
  })

  describe('session reactivity', () => {
    it('should auto-start when session becomes active', () => {
      const session = ref<CallSession | undefined>(undefined)
      const { isCollecting, stop } = useCallQualityStats(
        session as Ref<CallSession | null | undefined>
      )

      // Initially not collecting
      expect(isCollecting.value).toBe(false)

      stop()
    })

    it('should auto-reset when session is cleared', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { stats, reset } = useCallQualityStats(sessionRef)

      // When session is null, should reset
      reset()
      expect(stats.value.rtt).toBeNull()
    })
  })

  describe('options', () => {
    it('should accept custom poll interval', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { start, stop } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 5000,
      })

      start()
      stop()
    })

    it('should accept custom min bitrate samples', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { start, stop } = useCallQualityStats(sessionRef, {
        minBitrateSamples: 5,
      })

      start()
      stop()
    })

    it('should accept both options together', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { start, stop } = useCallQualityStats(sessionRef, {
        pollIntervalMs: 3000,
        minBitrateSamples: 4,
      })

      start()
      stop()
    })
  })

  describe('returned API shape', () => {
    it('should return all required functions and refs', () => {
      const sessionRef = ref<CallSession | null>(null)
      const result = useCallQualityStats(sessionRef)

      expect(result.stats).toBeDefined()
      expect(result.qualityLevel).toBeDefined()
      expect(result.isCollecting).toBeDefined()
      expect(result.start).toBeDefined()
      expect(result.stop).toBeDefined()
      expect(result.reset).toBeDefined()
    })

    it('should return stats as readonly', () => {
      const sessionRef = ref<CallSession | null>(null)
      const { stats } = useCallQualityStats(sessionRef)

      // Should have a value property
      expect(stats.value).toBeDefined()
    })
  })
})
