/**
 * useQualityAlerts unit tests
 *
 * @module composables/__tests__/useQualityAlerts.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useQualityAlerts } from '../useQualityAlerts'
import type { CallQualityStats, QualityLevel } from '../useCallQualityStats'

// Helper to create mock stats
function createMockStats(overrides: Partial<CallQualityStats> = {}): CallQualityStats {
  return {
    packetLossPercent: null,
    rtt: null,
    jitter: null,
    bandwidthUp: null,
    bandwidthDown: null,
    qualityScore: null,
    fractionLost: null,
    ...overrides,
  }
}

// Helper to create mock quality level
function createMockQualityLevel(level: QualityLevel = 'good'): QualityLevel {
  return level
}

describe('useQualityAlerts', () => {
  let statsRef: Ref<CallQualityStats>
  let qualityLevelRef: Ref<QualityLevel>

  beforeEach(() => {
    statsRef = ref(createMockStats())
    qualityLevelRef = ref(createMockQualityLevel('good'))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty alerts', () => {
      const { activeAlerts, hasAlerts } = useQualityAlerts(statsRef, qualityLevelRef)

      expect(activeAlerts.value).toEqual([])
      expect(hasAlerts.value).toBe(false)
    })

    it('should accept custom thresholds', () => {
      const customThresholds = {
        packetLossPercent: 10,
        rttMs: 500,
        jitterMs: 100,
      }

      const { activeAlerts } = useQualityAlerts(statsRef, qualityLevelRef, {
        thresholds: customThresholds,
      })

      // Should not trigger with values below custom threshold
      statsRef.value = createMockStats({ packetLossPercent: 5 })
      // Trigger check manually
      expect(activeAlerts.value.length).toBe(0)
    })

    it('should accept custom cooldown', () => {
      const { clearAlerts } = useQualityAlerts(statsRef, qualityLevelRef, {
        cooldownMs: 1000,
      })

      expect(clearAlerts).toBeDefined()
    })

    it('should accept initial enabled state', () => {
      const { hasAlerts: hasAlertsEnabled } = useQualityAlerts(statsRef, qualityLevelRef, {
        enabled: true,
      })

      const { hasAlerts: hasAlertsDisabled } = useQualityAlerts(statsRef, qualityLevelRef, {
        enabled: false,
      })

      expect(hasAlertsEnabled.value).toBe(false)
      expect(hasAlertsDisabled.value).toBe(false)
    })
  })

  describe('alert triggering', () => {
    it('should trigger packet loss alert when threshold exceeded', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      // Set packet loss above threshold but below critical (2x threshold = 10%)
      // Use 7% which is above 5% but below 10% critical threshold
      statsRef.value = createMockStats({ packetLossPercent: 7 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)
      expect(activeAlerts.value[0].type).toBe('packetLoss')
      expect(activeAlerts.value[0].severity).toBe('warning')
    })

    it('should trigger critical alert when packet loss exceeds 2x threshold', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      // Set packet loss at 2x threshold (default: 5% * 2 = 10%)
      statsRef.value = createMockStats({ packetLossPercent: 12 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)
      expect(activeAlerts.value[0].severity).toBe('critical')
    })

    it('should trigger RTT alert when threshold exceeded', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      // Set RTT above threshold (default: 300ms)
      statsRef.value = createMockStats({ rtt: 400 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)
      expect(activeAlerts.value[0].type).toBe('rtt')
    })

    it('should trigger jitter alert when threshold exceeded', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      // Set jitter above threshold (default: 50ms)
      statsRef.value = createMockStats({ jitter: 75 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)
      expect(activeAlerts.value[0].type).toBe('jitter')
    })

    it('should trigger multiple alerts for multiple metrics', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      // Set multiple metrics above threshold
      statsRef.value = createMockStats({
        packetLossPercent: 10,
        rtt: 400,
        jitter: 75,
      })
      checkNow()

      expect(activeAlerts.value.length).toBe(3)
      expect(activeAlerts.value.map((a) => a.type).sort()).toEqual(['jitter', 'packetLoss', 'rtt'])
    })

    it('should not trigger alert when stats are below threshold', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      // Set all metrics below threshold
      statsRef.value = createMockStats({
        packetLossPercent: 1,
        rtt: 100,
        jitter: 10,
      })
      checkNow()

      expect(activeAlerts.value.length).toBe(0)
    })

    it('should not trigger alert when metric is null', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      // Set packet loss to null
      statsRef.value = createMockStats({ packetLossPercent: null })
      checkNow()

      expect(activeAlerts.value.length).toBe(0)
    })
  })

  describe('cooldown', () => {
    it('should not trigger duplicate alerts within cooldown period', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef, {
        cooldownMs: 60000, // 1 minute cooldown
      })

      // Set packet loss above threshold
      statsRef.value = createMockStats({ packetLossPercent: 10 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)

      // Try to trigger again immediately
      checkNow()

      // Should still only have 1 alert (cooldown prevents duplicate)
      expect(activeAlerts.value.length).toBe(1)
    })
  })

  describe('clearAlerts', () => {
    it('should clear all active alerts', () => {
      const { activeAlerts, checkNow, clearAlerts } = useQualityAlerts(statsRef, qualityLevelRef)

      // Trigger an alert
      statsRef.value = createMockStats({ packetLossPercent: 10 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)

      // Clear alerts
      clearAlerts()

      expect(activeAlerts.value.length).toBe(0)
      expect(activeAlerts.value).toEqual([])
    })
  })

  describe('setEnabled', () => {
    it('should clear alerts when disabled', () => {
      const { activeAlerts, checkNow, setEnabled } = useQualityAlerts(statsRef, qualityLevelRef, {
        enabled: true,
      })

      // Trigger an alert with 7% packet loss (warning threshold)
      statsRef.value = createMockStats({ packetLossPercent: 7 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)

      // Disable alerts - this also clears existing alerts
      setEnabled(false)

      // Alerts should be cleared when disabled
      expect(activeAlerts.value.length).toBe(0)
    })

    it('should not trigger alerts when disabled', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef, {
        enabled: false,
      })

      // Trigger an alert - should not work since disabled
      statsRef.value = createMockStats({ packetLossPercent: 7 })
      checkNow()

      // Should not add alert since disabled
      expect(activeAlerts.value.length).toBe(0)
    })

    it('should trigger alerts after re-enabling', () => {
      const { activeAlerts, checkNow, setEnabled } = useQualityAlerts(statsRef, qualityLevelRef, {
        enabled: true,
      })

      // Trigger an alert
      statsRef.value = createMockStats({ packetLossPercent: 7 })
      checkNow()
      expect(activeAlerts.value.length).toBe(1)

      // Disable then re-enable - this clears alerts
      setEnabled(false)
      setEnabled(true)

      // Need to update stats to trigger - use different metric type (rtt)
      statsRef.value = createMockStats({ rtt: 400 })
      checkNow()
      // Should have 1 alert (new RTT alert after re-enable)
      expect(activeAlerts.value.length).toBe(1)
    })
  })

  describe('alert properties', () => {
    it('should include timestamp in alert', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      const beforeTime = new Date()
      statsRef.value = createMockStats({ packetLossPercent: 10 })
      checkNow()
      const afterTime = new Date()

      expect(activeAlerts.value.length).toBe(1)
      const alert = activeAlerts.value[0]
      expect(alert.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(alert.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })

    it('should include current metric value in alert', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      statsRef.value = createMockStats({ packetLossPercent: 7.5 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)
      expect(activeAlerts.value[0].value).toBe(7.5)
    })

    it('should include human-readable message in alert', () => {
      const { activeAlerts, checkNow } = useQualityAlerts(statsRef, qualityLevelRef)

      statsRef.value = createMockStats({ packetLossPercent: 10 })
      checkNow()

      expect(activeAlerts.value.length).toBe(1)
      expect(typeof activeAlerts.value[0].message).toBe('string')
      expect(activeAlerts.value[0].message.length).toBeGreaterThan(0)
    })
  })
})
