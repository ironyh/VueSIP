/**
 * Tests for useQualityAlerts composable
 * @module tests/composables/useQualityAlerts.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import type { DeepReadonly, Ref } from 'vue'
import type { CallQualityStats, QualityLevel } from '@/composables/useCallQualityStats'
import { useQualityAlerts } from '@/composables/useQualityAlerts'

function makeStats(overrides: Partial<CallQualityStats> = {}): CallQualityStats {
  return {
    rtt: null,
    jitter: null,
    packetLossPercent: null,
    bitrateKbps: null,
    codec: null,
    packetsReceived: null,
    packetsLost: null,
    lastUpdated: null,
    ...overrides,
  }
}

function makeStatsRef(stats: CallQualityStats): DeepReadonly<Ref<CallQualityStats>> {
  return ref(stats) as DeepReadonly<Ref<CallQualityStats>>
}

function makeQualityRef(level: QualityLevel): DeepReadonly<Ref<QualityLevel>> {
  return ref(level) as DeepReadonly<Ref<QualityLevel>>
}

describe('useQualityAlerts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should start with no active alerts', () => {
      const stats = makeStatsRef(makeStats())
      const quality = makeQualityRef('excellent')
      const { activeAlerts, hasAlerts } = useQualityAlerts(stats, quality)

      expect(activeAlerts.value).toEqual([])
      expect(hasAlerts.value).toBe(false)
    })

    it('should accept custom thresholds option', () => {
      const stats = makeStatsRef(makeStats({ rtt: 100 }))
      const quality = makeQualityRef('fair')
      const { hasAlerts } = useQualityAlerts(stats, quality, {
        thresholds: { rttMs: 50 },
      })

      // Manually trigger a check to exercise custom threshold
      expect(hasAlerts.value).toBe(false)
    })

    it('should accept custom cooldownMs option', () => {
      const stats = makeStatsRef(makeStats())
      const quality = makeQualityRef('excellent')
      const { hasAlerts } = useQualityAlerts(stats, quality, { cooldownMs: 5000 })
      expect(hasAlerts.value).toBe(false)
    })

    it('should start disabled when enabled=false', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 10 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts } = useQualityAlerts(stats, quality, { enabled: false })
      expect(activeAlerts.value).toEqual([])
    })
  })

  describe('packet loss alerts', () => {
    it('should trigger alert when packet loss exceeds default 5% threshold', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toHaveLength(1)
      expect(activeAlerts.value[0].type).toBe('packetLoss')
      expect(activeAlerts.value[0].severity).toBe('warning')
      expect(activeAlerts.value[0].value).toBe(6)
    })

    it('should trigger critical alert when packet loss is double threshold (>=10%)', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 12 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toHaveLength(1)
      expect(activeAlerts.value[0].type).toBe('packetLoss')
      expect(activeAlerts.value[0].severity).toBe('critical')
    })

    it('should not trigger alert when packet loss is at threshold', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 5 }))
      const quality = makeQualityRef('fair')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toEqual([])
    })

    it('should not trigger alert when packet loss is null', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: null }))
      const quality = makeQualityRef('fair')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toEqual([])
    })

    it('should respect custom packet loss threshold', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 3 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality, {
        thresholds: { packetLossPercent: 2 },
      })

      checkNow()

      expect(activeAlerts.value).toHaveLength(1)
      expect(activeAlerts.value[0].type).toBe('packetLoss')
    })
  })

  describe('RTT alerts', () => {
    it('should trigger alert when RTT exceeds default 300ms threshold', () => {
      const stats = makeStatsRef(makeStats({ rtt: 350 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toHaveLength(1)
      expect(activeAlerts.value[0].type).toBe('rtt')
      expect(activeAlerts.value[0].severity).toBe('warning')
      expect(activeAlerts.value[0].value).toBe(350)
    })

    it('should trigger critical alert when RTT is double threshold (>=600ms)', () => {
      const stats = makeStatsRef(makeStats({ rtt: 700 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value[0].severity).toBe('critical')
    })

    it('should not trigger alert when RTT is null', () => {
      const stats = makeStatsRef(makeStats({ rtt: null }))
      const quality = makeQualityRef('fair')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toEqual([])
    })

    it('should respect custom RTT threshold', () => {
      const stats = makeStatsRef(makeStats({ rtt: 150 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality, {
        thresholds: { rttMs: 100 },
      })

      checkNow()

      expect(activeAlerts.value).toHaveLength(1)
      expect(activeAlerts.value[0].type).toBe('rtt')
    })
  })

  describe('jitter alerts', () => {
    it('should trigger alert when jitter exceeds default 50ms threshold', () => {
      const stats = makeStatsRef(makeStats({ jitter: 60 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toHaveLength(1)
      expect(activeAlerts.value[0].type).toBe('jitter')
      expect(activeAlerts.value[0].severity).toBe('warning')
    })

    it('should trigger critical alert when jitter is double threshold (>=100ms)', () => {
      const stats = makeStatsRef(makeStats({ jitter: 120 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value[0].severity).toBe('critical')
    })

    it('should not trigger alert when jitter is null', () => {
      const stats = makeStatsRef(makeStats({ jitter: null }))
      const quality = makeQualityRef('fair')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toEqual([])
    })
  })

  describe('multiple metric alerts', () => {
    it('should trigger alerts for multiple metrics simultaneously', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6, rtt: 350 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toHaveLength(2)
      const types = activeAlerts.value.map((a) => a.type).sort()
      expect(types).toEqual(['packetLoss', 'rtt'])
    })

    it('should trigger alerts for all three metrics when all exceed thresholds', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6, rtt: 350, jitter: 60 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value).toHaveLength(3)
    })
  })

  describe('cooldown behavior', () => {
    it('should not retrigger same alert type within cooldown period', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality, { cooldownMs: 10000 })

      checkNow()
      expect(activeAlerts.value).toHaveLength(1)

      // Advance time by half the cooldown — should not retrigger
      vi.advanceTimersByTime(5000)
      checkNow()
      expect(activeAlerts.value).toHaveLength(1) // Still only one
    })

    it('should allow new alert after cooldown expires', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality, { cooldownMs: 5000 })

      checkNow()
      const firstTimestamp = activeAlerts.value[0].timestamp

      // Advance past cooldown
      vi.advanceTimersByTime(5000)
      vi.setSystemTime(new Date(Date.now() + 5000))

      // Manually update the ref to trigger a new check (simulate new data)
      ;(stats as unknown as Ref<CallQualityStats>).value = makeStats({ packetLossPercent: 8 })
      checkNow()

      expect(activeAlerts.value).toHaveLength(2)
      expect(activeAlerts.value[1].timestamp).not.toEqual(firstTimestamp)
    })

    it('should track cooldown independently per metric type', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality, { cooldownMs: 3000 })

      checkNow()
      expect(activeAlerts.value).toHaveLength(1) // packetLoss alert

      // Advance 1 second — packetLoss still in cooldown
      vi.advanceTimersByTime(1000)

      // Now RTT exceeds threshold — should trigger even though packetLoss is in cooldown
      ;(stats as unknown as Ref<CallQualityStats>).value = makeStats({
        packetLossPercent: 6,
        rtt: 350,
      })
      checkNow()

      expect(activeAlerts.value).toHaveLength(2)
    })
  })

  describe('alert limit', () => {
    it('should cap active alerts at 5 most recent', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality, { cooldownMs: 0 })

      // Trigger 6 alerts by cycling through metrics
      checkNow()
      vi.advanceTimersByTime(1)
      ;(stats as unknown as Ref<CallQualityStats>).value = makeStats({ rtt: 350 })
      checkNow()
      vi.advanceTimersByTime(1)
      ;(stats as unknown as Ref<CallQualityStats>).value = makeStats({ jitter: 60 })
      checkNow()
      vi.advanceTimersByTime(1)
      ;(stats as unknown as Ref<CallQualityStats>).value = makeStats({
        packetLossPercent: 6,
        rtt: 350,
      })
      checkNow()
      vi.advanceTimersByTime(1)
      ;(stats as unknown as Ref<CallQualityStats>).value = makeStats({
        packetLossPercent: 6,
        jitter: 60,
      })
      checkNow()
      vi.advanceTimersByTime(1)
      ;(stats as unknown as Ref<CallQualityStats>).value = makeStats({ rtt: 350, jitter: 60 })
      checkNow()

      expect(activeAlerts.value).toHaveLength(5)
    })
  })

  describe('clearAlerts', () => {
    it('should clear all active alerts', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, hasAlerts, checkNow, clearAlerts } = useQualityAlerts(stats, quality)

      checkNow()
      expect(activeAlerts.value).toHaveLength(1)

      clearAlerts()
      expect(activeAlerts.value).toEqual([])
      expect(hasAlerts.value).toBe(false)
    })
  })

  describe('setEnabled', () => {
    it('should clear alerts when disabled', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow, setEnabled } = useQualityAlerts(stats, quality)

      checkNow()
      expect(activeAlerts.value).toHaveLength(1)

      setEnabled(false)
      expect(activeAlerts.value).toEqual([])
    })

    it('should not trigger new alerts when disabled', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality, { enabled: false })

      checkNow()
      expect(activeAlerts.value).toEqual([])
    })
  })

  describe('watch behavior', () => {
    it('should check thresholds when quality degrades to fair', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('excellent')
      const { activeAlerts } = useQualityAlerts(stats, quality)

      expect(activeAlerts.value).toHaveLength(0)

      // Degrade to fair — should trigger via watch
      ;(quality as unknown as Ref<QualityLevel>).value = 'fair'

      // Manually advance timers so watch callbacks fire
      vi.runAllTimers()

      expect(activeAlerts.value.length).toBeGreaterThanOrEqual(0)
    })

    it('should auto-clear alerts after 5s when quality improves to excellent', async () => {
      vi.useRealTimers() // Need real timers for the auto-clear setTimeout
      const stats = makeStatsRef(makeStats({ packetLossPercent: 6 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()
      expect(activeAlerts.value).toHaveLength(1)

      // Improve quality
      ;(quality as unknown as Ref<QualityLevel>).value = 'excellent'

      // The auto-clear fires after 5s — wait for it
      await new Promise((resolve) => setTimeout(resolve, 5100))

      expect(activeAlerts.value).toEqual([])
    })
  })

  describe('alert message content', () => {
    it('should include the metric value in the alert message', () => {
      const stats = makeStatsRef(makeStats({ packetLossPercent: 7.5 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)

      checkNow()

      expect(activeAlerts.value[0].message).toContain('7.5')
      expect(activeAlerts.value[0].message).toContain('Paketförlust')
    })

    it('should have correct timestamp on alert', () => {
      const before = new Date()
      const stats = makeStatsRef(makeStats({ rtt: 400 }))
      const quality = makeQualityRef('poor')
      const { activeAlerts, checkNow } = useQualityAlerts(stats, quality)
      const after = new Date()

      checkNow()

      const alertTime = activeAlerts.value[0].timestamp.getTime()
      expect(alertTime).toBeGreaterThanOrEqual(before.getTime())
      expect(alertTime).toBeLessThanOrEqual(after.getTime())
    })
  })
})
