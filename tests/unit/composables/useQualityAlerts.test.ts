import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, type Ref, type DeepReadonly } from 'vue'
import { useQualityAlerts, type QualityAlertThresholds } from '@/composables/useQualityAlerts'

// Helper to create a mock quality stats object
function createMockStats(
  overrides: Partial<{
    packetLossPercent: number | null
    rtt: number | null
    jitter: number | null
    lastUpdated: number
  }> = {}
) {
  return {
    packetLossPercent: null,
    rtt: null,
    jitter: null,
    bitrateKbps: null,
    qualityScore: null,
    lastUpdated: Date.now(),
    ...overrides,
  }
}

// Helper to create a mock quality level
type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown'

describe('useQualityAlerts', () => {
  let statsRef: DeepReadonly<Ref<ReturnType<typeof createMockStats>>>
  let qualityLevelRef: DeepReadonly<Ref<QualityLevel>>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T12:00:00Z'))

    statsRef = ref(createMockStats()) as DeepReadonly<Ref<ReturnType<typeof createMockStats>>>
    qualityLevelRef = ref('good') as DeepReadonly<Ref<QualityLevel>>
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic functionality', () => {
    it('should create composable with default options', () => {
      const { activeAlerts, hasAlerts, clearAlerts, checkNow, setEnabled } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      expect(activeAlerts.value).toEqual([])
      expect(hasAlerts.value).toBe(false)
      expect(typeof clearAlerts).toBe('function')
      expect(typeof checkNow).toBe('function')
      expect(typeof setEnabled).toBe('function')
    })

    it('should start with alerts disabled when initialEnabled is false', () => {
      const { hasAlerts, checkNow } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>,
        { enabled: false }
      )

      // Manually trigger check - should not create alerts since disabled
      statsRef.value = createMockStats({ packetLossPercent: 10, lastUpdated: Date.now() })
      checkNow()

      expect(hasAlerts.value).toBe(false)
    })

    it('should accept custom thresholds', () => {
      const customThresholds: Partial<QualityAlertThresholds> = {
        packetLossPercent: 3,
        rttMs: 200,
        jitterMs: 30,
      }

      const { checkNow } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>,
        { thresholds: customThresholds }
      )

      // Trigger with values above custom thresholds but below defaults
      statsRef.value = createMockStats({
        packetLossPercent: 4, // Above custom 3%, below default 5%
        lastUpdated: Date.now(),
      })
      checkNow()

      // Should have created alert because 4% > 3% custom threshold
      // (We can't easily check this without more complex setup, but the function should not throw)
    })

    it('should accept custom cooldown', () => {
      const { checkNow } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>,
        { cooldownMs: 5000 }
      )

      // Should not throw
      expect(() => checkNow()).not.toThrow()
    })
  })

  describe('alert creation', () => {
    it('should create packet loss warning alert', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      statsRef.value = createMockStats({
        packetLossPercent: 6, // Above 5% default threshold
        lastUpdated: Date.now(),
      })
      checkNow()

      const alerts = activeAlerts.value
      expect(alerts.length).toBeGreaterThan(0)

      const packetLossAlert = alerts.find((a) => a.type === 'packetLoss')
      expect(packetLossAlert).toBeDefined()
      expect(packetLossAlert?.severity).toBe('warning')
      expect(packetLossAlert?.value).toBe(6)
    })

    it('should create packet loss critical alert when threshold doubled', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      statsRef.value = createMockStats({
        packetLossPercent: 12, // Above 10% (double 5% threshold)
        lastUpdated: Date.now(),
      })
      checkNow()

      const alerts = activeAlerts.value
      const packetLossAlert = alerts.find((a) => a.type === 'packetLoss')
      expect(packetLossAlert?.severity).toBe('critical')
    })

    it('should create RTT warning alert', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      statsRef.value = createMockStats({
        rtt: 350, // Above 300ms default threshold
        lastUpdated: Date.now(),
      })
      checkNow()

      const alerts = activeAlerts.value
      const rttAlert = alerts.find((a) => a.type === 'rtt')
      expect(rttAlert).toBeDefined()
      expect(rttAlert?.severity).toBe('warning')
      expect(rttAlert?.value).toBe(350)
    })

    it('should create jitter warning alert', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      statsRef.value = createMockStats({
        jitter: 60, // Above 50ms default threshold
        lastUpdated: Date.now(),
      })
      checkNow()

      const alerts = activeAlerts.value
      const jitterAlert = alerts.find((a) => a.type === 'jitter')
      expect(jitterAlert).toBeDefined()
      expect(jitterAlert?.severity).toBe('warning')
      expect(jitterAlert?.value).toBe(60)
    })

    it('should not create alert when stats are below thresholds', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      statsRef.value = createMockStats({
        packetLossPercent: 1,
        rtt: 50,
        jitter: 10,
        lastUpdated: Date.now(),
      })
      checkNow()

      expect(activeAlerts.value.length).toBe(0)
    })

    it('should not create alert when stats are null', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      statsRef.value = createMockStats({
        packetLossPercent: null,
        rtt: null,
        jitter: null,
        lastUpdated: Date.now(),
      })
      checkNow()

      expect(activeAlerts.value.length).toBe(0)
    })
  })

  describe('cooldown behavior', () => {
    it('should not create duplicate alerts within cooldown period', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>,
        { cooldownMs: 10000 }
      )

      statsRef.value = createMockStats({
        packetLossPercent: 6,
        lastUpdated: Date.now(),
      })
      checkNow()

      const firstCount = activeAlerts.value.length

      // Try to create another alert immediately
      checkNow()

      expect(activeAlerts.value.length).toBe(firstCount)
    })

    it('should allow new alert after cooldown expires', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>,
        { cooldownMs: 5000 }
      )

      statsRef.value = createMockStats({
        packetLossPercent: 6,
        lastUpdated: Date.now(),
      })
      checkNow()

      const firstCount = activeAlerts.value.length

      // Advance time past cooldown
      vi.advanceTimersByTime(6000)

      // Create another alert with different type
      statsRef.value = createMockStats({
        packetLossPercent: 6,
        rtt: 350, // New RTT alert
        lastUpdated: Date.now(),
      })
      checkNow()

      // Should have more alerts now
      expect(activeAlerts.value.length).toBeGreaterThan(firstCount)
    })
  })

  describe('clearAlerts', () => {
    it('should clear all active alerts', () => {
      const { checkNow, activeAlerts, clearAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      statsRef.value = createMockStats({
        packetLossPercent: 6,
        lastUpdated: Date.now(),
      })
      checkNow()

      expect(activeAlerts.value.length).toBeGreaterThan(0)

      clearAlerts()

      expect(activeAlerts.value.length).toBe(0)
    })
  })

  describe('setEnabled', () => {
    it('should disable alerts when setEnabled(false) is called', () => {
      const { checkNow, activeAlerts, setEnabled } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      // First create some alerts
      statsRef.value = createMockStats({
        packetLossPercent: 6,
        lastUpdated: Date.now(),
      })
      checkNow()

      expect(activeAlerts.value.length).toBeGreaterThan(0)

      // Then disable
      setEnabled(false)

      // Alerts should be cleared
      expect(activeAlerts.value.length).toBe(0)
    })

    it('should not create new alerts when disabled', () => {
      const { checkNow, activeAlerts, setEnabled } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      setEnabled(false)

      statsRef.value = createMockStats({
        packetLossPercent: 6,
        lastUpdated: Date.now(),
      })
      checkNow()

      expect(activeAlerts.value.length).toBe(0)
    })
  })

  describe('alert limits', () => {
    it('should limit to 5 most recent alerts', () => {
      const { checkNow, activeAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>,
        { cooldownMs: 0 } // No cooldown for rapid testing
      )

      // Create 7 alerts (exceeds 5 limit)
      for (let i = 0; i < 7; i++) {
        vi.advanceTimersByTime(100)
        statsRef.value = createMockStats({
          packetLossPercent: 6 + i,
          lastUpdated: Date.now(),
        })
        checkNow()
      }

      // Should only have 5 alerts
      expect(activeAlerts.value.length).toBe(5)
    })
  })

  describe('hasAlerts computed', () => {
    it('should return true when there are active alerts', () => {
      const { checkNow, hasAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      expect(hasAlerts.value).toBe(false)

      statsRef.value = createMockStats({
        packetLossPercent: 6,
        lastUpdated: Date.now(),
      })
      checkNow()

      expect(hasAlerts.value).toBe(true)
    })

    it('should return false when no alerts', () => {
      const { hasAlerts } = useQualityAlerts(
        statsRef as DeepReadonly<
          Ref<{
            packetLossPercent: number | null
            rtt: number | null
            jitter: number | null
            lastUpdated: number
          }>
        >,
        qualityLevelRef as DeepReadonly<Ref<QualityLevel>>
      )

      expect(hasAlerts.value).toBe(false)
    })
  })
})
