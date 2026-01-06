/**
 * Tests for useNetworkQualityIndicator composable
 *
 * TDD specifications for network quality indicator functionality
 * including quality level detection, signal bars, colors, and accessibility.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useNetworkQualityIndicator } from '@/composables/useNetworkQualityIndicator'
import { DEFAULT_NETWORK_COLORS, type NetworkQualityLevel } from '@/types/call-quality.types'

describe('useNetworkQualityIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ==========================================================================
  // Initialization and Default State
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with unknown state when no data provided', () => {
      const { indicator, isAvailable } = useNetworkQualityIndicator()

      expect(isAvailable.value).toBe(false)
      expect(indicator.value.level).toBe('unknown')
      expect(indicator.value.bars).toBe(1)
      expect(indicator.value.icon).toBe('signal-unknown')
      expect(indicator.value.color).toBe(DEFAULT_NETWORK_COLORS.unknown)
    })

    it('should have proper default details structure', () => {
      const { indicator } = useNetworkQualityIndicator()

      expect(indicator.value.details).toEqual({
        rtt: 0,
        jitter: 0,
        packetLoss: 0,
        bandwidth: 0,
        connectionType: 'unknown',
      })
    })

    it('should accept custom color scheme', () => {
      const customColors = {
        excellent: '#00ff00',
        poor: '#ff0000',
      }
      const { indicator, update } = useNetworkQualityIndicator({
        colors: customColors,
      })

      // Update to excellent quality
      update({ rtt: 20, jitter: 5, packetLoss: 0.1 })

      expect(indicator.value.color).toBe('#00ff00')
    })

    it('should accept custom thresholds', () => {
      const customThresholds = {
        rtt: [25, 50, 100, 200] as [number, number, number, number],
      }
      const { indicator, update } = useNetworkQualityIndicator({
        thresholds: customThresholds,
      })

      // With default thresholds, 30ms RTT would be excellent
      // With custom thresholds (25 for excellent), 30ms should be good
      update({ rtt: 30, jitter: 5, packetLoss: 0 })

      expect(indicator.value.level).toBe('good')
    })
  })

  // ==========================================================================
  // Quality Level Detection
  // ==========================================================================

  describe('Quality Level Detection', () => {
    describe('Excellent Quality', () => {
      it('should detect excellent quality with optimal metrics', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 20,
          jitter: 5,
          packetLoss: 0.1,
        })

        expect(indicator.value.level).toBe('excellent')
        expect(indicator.value.bars).toBe(5)
        expect(indicator.value.icon).toBe('signal-excellent')
      })

      it('should detect excellent when all metrics are at threshold boundaries', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 50, // Exactly at excellent threshold
          jitter: 10,
          packetLoss: 0.5,
        })

        expect(indicator.value.level).toBe('excellent')
      })
    })

    describe('Good Quality', () => {
      it('should detect good quality with slightly elevated metrics', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 75,
          jitter: 15,
          packetLoss: 0.8,
        })

        expect(indicator.value.level).toBe('good')
        expect(indicator.value.bars).toBe(4)
        expect(indicator.value.icon).toBe('signal-good')
      })

      it('should detect good when one metric is in good range', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 80, // Good range (50-100)
          jitter: 5, // Excellent
          packetLoss: 0.2, // Excellent
        })

        expect(indicator.value.level).toBe('good')
      })
    })

    describe('Fair Quality', () => {
      it('should detect fair quality with moderate issues', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 150,
          jitter: 30,
          packetLoss: 1.5,
        })

        expect(indicator.value.level).toBe('fair')
        expect(indicator.value.bars).toBe(3)
        expect(indicator.value.icon).toBe('signal-fair')
      })
    })

    describe('Poor Quality', () => {
      it('should detect poor quality with significant issues', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 300,
          jitter: 60,
          packetLoss: 3,
        })

        expect(indicator.value.level).toBe('poor')
        expect(indicator.value.bars).toBe(2)
        expect(indicator.value.icon).toBe('signal-poor')
      })
    })

    describe('Critical Quality', () => {
      it('should detect critical quality with severe issues', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 500,
          jitter: 100,
          packetLoss: 10,
        })

        expect(indicator.value.level).toBe('critical')
        expect(indicator.value.bars).toBe(1)
        expect(indicator.value.icon).toBe('signal-critical')
      })

      it('should detect critical when any metric exceeds worst threshold', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        // Only packet loss is critical
        update({
          rtt: 50, // Excellent
          jitter: 10, // Excellent
          packetLoss: 8, // Critical (>5%)
        })

        expect(indicator.value.level).toBe('critical')
      })
    })

    describe('Worst Metric Determines Level', () => {
      it('should use worst metric to determine quality level', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        // Two excellent, one poor
        update({
          rtt: 20, // Excellent
          jitter: 5, // Excellent
          packetLoss: 3.5, // Poor (2-5%)
        })

        expect(indicator.value.level).toBe('poor')
      })

      it('should handle mixed quality levels correctly', () => {
        const { indicator, update } = useNetworkQualityIndicator()

        update({
          rtt: 150, // Fair (100-200)
          jitter: 15, // Good (10-20)
          packetLoss: 0.3, // Excellent (<0.5)
        })

        expect(indicator.value.level).toBe('fair')
      })
    })
  })

  // ==========================================================================
  // Signal Bars Mapping
  // ==========================================================================

  describe('Signal Bars', () => {
    it.each([
      ['excellent', 5],
      ['good', 4],
      ['fair', 3],
      ['poor', 2],
      ['critical', 1],
      ['unknown', 1],
    ] as [NetworkQualityLevel, number][])(
      'should return %i bars for %s quality',
      (level, expectedBars) => {
        const { indicator, update, reset } = useNetworkQualityIndicator()

        if (level === 'unknown') {
          reset()
        } else {
          // Use metrics that produce each quality level
          const metricsForLevel = {
            excellent: { rtt: 20, jitter: 5, packetLoss: 0.1 },
            good: { rtt: 75, jitter: 15, packetLoss: 0.7 },
            fair: { rtt: 150, jitter: 30, packetLoss: 1.5 },
            poor: { rtt: 300, jitter: 60, packetLoss: 3 },
            critical: { rtt: 500, jitter: 100, packetLoss: 10 },
          }
          update(metricsForLevel[level])
        }

        expect(indicator.value.bars).toBe(expectedBars)
      }
    )
  })

  // ==========================================================================
  // Color Mapping
  // ==========================================================================

  describe('Colors', () => {
    it('should use default colors when not customized', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 20, jitter: 5, packetLoss: 0.1 })
      expect(indicator.value.color).toBe(DEFAULT_NETWORK_COLORS.excellent)

      update({ rtt: 500, jitter: 100, packetLoss: 10 })
      expect(indicator.value.color).toBe(DEFAULT_NETWORK_COLORS.critical)
    })

    it('should merge custom colors with defaults', () => {
      const customColors = {
        excellent: '#00ff00',
      }
      const { indicator, update } = useNetworkQualityIndicator({
        colors: customColors,
      })

      update({ rtt: 20, jitter: 5, packetLoss: 0.1 })
      expect(indicator.value.color).toBe('#00ff00')

      // Other levels should still use defaults
      update({ rtt: 500, jitter: 100, packetLoss: 10 })
      expect(indicator.value.color).toBe(DEFAULT_NETWORK_COLORS.critical)
    })
  })

  // ==========================================================================
  // Icon Mapping
  // ==========================================================================

  describe('Icons', () => {
    it.each([
      ['excellent', 'signal-excellent'],
      ['good', 'signal-good'],
      ['fair', 'signal-fair'],
      ['poor', 'signal-poor'],
      ['critical', 'signal-critical'],
    ] as [NetworkQualityLevel, string][])(
      'should return %s icon for %s quality',
      (level, expectedIcon) => {
        const { indicator, update } = useNetworkQualityIndicator()

        const metricsForLevel = {
          excellent: { rtt: 20, jitter: 5, packetLoss: 0.1 },
          good: { rtt: 75, jitter: 15, packetLoss: 0.7 },
          fair: { rtt: 150, jitter: 30, packetLoss: 1.5 },
          poor: { rtt: 300, jitter: 60, packetLoss: 3 },
          critical: { rtt: 500, jitter: 100, packetLoss: 10 },
        }
        update(metricsForLevel[level])

        expect(indicator.value.icon).toBe(expectedIcon)
      }
    )
  })

  // ==========================================================================
  // Accessibility Labels
  // ==========================================================================

  describe('Accessibility', () => {
    it('should generate descriptive aria labels', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 20, jitter: 5, packetLoss: 0.1 })

      expect(indicator.value.ariaLabel).toContain('excellent')
      expect(indicator.value.ariaLabel.toLowerCase()).toMatch(/network|connection|quality/)
    })

    it('should update aria label when quality changes', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 20, jitter: 5, packetLoss: 0.1 })
      const excellentLabel = indicator.value.ariaLabel

      update({ rtt: 500, jitter: 100, packetLoss: 10 })
      const criticalLabel = indicator.value.ariaLabel

      expect(excellentLabel).not.toBe(criticalLabel)
      expect(criticalLabel).toContain('critical')
    })

    it('should have aria label for unknown state', () => {
      const { indicator } = useNetworkQualityIndicator()

      expect(indicator.value.ariaLabel).toBeTruthy()
      expect(indicator.value.ariaLabel.toLowerCase()).toMatch(/unknown|no data|unavailable/)
    })
  })

  // ==========================================================================
  // Network Details
  // ==========================================================================

  describe('Network Details', () => {
    it('should update details with provided metrics', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: 75,
        jitter: 15,
        packetLoss: 0.8,
        bitrate: 1500,
        candidateType: 'host',
      })

      expect(indicator.value.details.rtt).toBe(75)
      expect(indicator.value.details.jitter).toBe(15)
      expect(indicator.value.details.packetLoss).toBe(0.8)
      expect(indicator.value.details.connectionType).toBe('host')
    })

    it('should estimate bandwidth from bitrate when available', () => {
      const { indicator, update } = useNetworkQualityIndicator({
        estimateBandwidth: true,
      })

      update({
        rtt: 50,
        jitter: 10,
        packetLoss: 0.3,
        bitrate: 2000,
      })

      expect(indicator.value.details.bandwidth).toBeGreaterThan(0)
    })

    it('should use availableOutgoingBitrate for bandwidth when provided', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: 50,
        jitter: 10,
        packetLoss: 0.3,
        availableOutgoingBitrate: 3000,
      })

      expect(indicator.value.details.bandwidth).toBe(3000)
    })

    it('should preserve previous values for missing metrics', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      // First update with full data
      update({
        rtt: 75,
        jitter: 15,
        packetLoss: 0.8,
        candidateType: 'relay',
      })

      // Second update with partial data
      update({
        rtt: 100,
        // jitter, packetLoss, candidateType not provided
      })

      expect(indicator.value.details.rtt).toBe(100)
      expect(indicator.value.details.jitter).toBe(15) // Preserved
      expect(indicator.value.details.packetLoss).toBe(0.8) // Preserved
      expect(indicator.value.details.connectionType).toBe('relay') // Preserved
    })
  })

  // ==========================================================================
  // Update Behavior
  // ==========================================================================

  describe('Update Behavior', () => {
    it('should set isAvailable to true after first update', () => {
      const { isAvailable, update } = useNetworkQualityIndicator()

      expect(isAvailable.value).toBe(false)

      update({ rtt: 50 })

      expect(isAvailable.value).toBe(true)
    })

    it('should handle updates with only RTT', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 30 })

      expect(indicator.value.level).not.toBe('unknown')
      expect(indicator.value.details.rtt).toBe(30)
    })

    it('should handle updates with only jitter', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ jitter: 15 })

      expect(indicator.value.level).not.toBe('unknown')
      expect(indicator.value.details.jitter).toBe(15)
    })

    it('should handle updates with only packet loss', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ packetLoss: 0.5 })

      expect(indicator.value.level).not.toBe('unknown')
      expect(indicator.value.details.packetLoss).toBe(0.5)
    })

    it('should handle empty updates gracefully', () => {
      const { indicator, isAvailable, update } = useNetworkQualityIndicator()

      update({})

      // Should remain in unknown state with empty update
      expect(isAvailable.value).toBe(false)
      expect(indicator.value.level).toBe('unknown')
    })
  })

  // ==========================================================================
  // Reset Functionality
  // ==========================================================================

  describe('Reset', () => {
    it('should reset to unknown state', () => {
      const { indicator, isAvailable, update, reset } = useNetworkQualityIndicator()

      // First update to good state
      update({ rtt: 50, jitter: 10, packetLoss: 0.3 })
      expect(isAvailable.value).toBe(true)
      expect(indicator.value.level).toBe('excellent')

      // Reset
      reset()

      expect(isAvailable.value).toBe(false)
      expect(indicator.value.level).toBe('unknown')
      expect(indicator.value.bars).toBe(1)
      expect(indicator.value.icon).toBe('signal-unknown')
    })

    it('should clear network details on reset', () => {
      const { indicator, update, reset } = useNetworkQualityIndicator()

      update({
        rtt: 50,
        jitter: 10,
        packetLoss: 0.3,
        candidateType: 'host',
      })

      reset()

      expect(indicator.value.details.rtt).toBe(0)
      expect(indicator.value.details.jitter).toBe(0)
      expect(indicator.value.details.packetLoss).toBe(0)
      expect(indicator.value.details.bandwidth).toBe(0)
      expect(indicator.value.details.connectionType).toBe('unknown')
    })
  })

  // ==========================================================================
  // Custom Thresholds
  // ==========================================================================

  describe('Custom Thresholds', () => {
    it('should use custom RTT thresholds', () => {
      const { indicator, update } = useNetworkQualityIndicator({
        thresholds: {
          rtt: [30, 60, 120, 240] as [number, number, number, number],
        },
      })

      // 40ms would be excellent with default (50ms), but good with custom (30ms)
      update({ rtt: 40, jitter: 5, packetLoss: 0.1 })

      expect(indicator.value.level).toBe('good')
    })

    it('should use custom packet loss thresholds', () => {
      const { indicator, update } = useNetworkQualityIndicator({
        thresholds: {
          packetLoss: [0.1, 0.5, 1, 2] as [number, number, number, number],
        },
      })

      // 0.3% would be excellent with default (0.5%), but good with custom (0.1%)
      update({ rtt: 30, jitter: 5, packetLoss: 0.3 })

      expect(indicator.value.level).toBe('good')
    })

    it('should use custom jitter thresholds', () => {
      const { indicator, update } = useNetworkQualityIndicator({
        thresholds: {
          jitter: [5, 10, 20, 40] as [number, number, number, number],
        },
      })

      // 8ms would be excellent with default (10ms), but good with custom (5ms)
      update({ rtt: 30, jitter: 8, packetLoss: 0.1 })

      expect(indicator.value.level).toBe('good')
    })

    it('should merge custom thresholds with defaults', () => {
      const { indicator, update } = useNetworkQualityIndicator({
        thresholds: {
          rtt: [25, 50, 100, 200] as [number, number, number, number],
          // jitter and packetLoss use defaults
        },
      })

      // Test that RTT uses custom, but packet loss uses default
      update({ rtt: 30, jitter: 5, packetLoss: 0.4 })

      // RTT 30 with custom threshold (25) = good
      // Packet loss 0.4 with default threshold (0.5) = excellent
      // Worst is good
      expect(indicator.value.level).toBe('good')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: 0,
        jitter: 0,
        packetLoss: 0,
      })

      expect(indicator.value.level).toBe('excellent')
    })

    it('should handle very high values', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: 10000,
        jitter: 500,
        packetLoss: 50,
      })

      expect(indicator.value.level).toBe('critical')
    })

    it('should handle negative values as zero', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: -10,
        jitter: -5,
        packetLoss: -1,
      })

      // Negative values should be treated as 0 (excellent)
      expect(indicator.value.level).toBe('excellent')
    })

    it('should handle undefined individual metrics in update', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: 50,
        jitter: undefined,
        packetLoss: 0.3,
      })

      expect(indicator.value.level).not.toBe('unknown')
      expect(indicator.value.details.rtt).toBe(50)
    })

    it('should handle rapid consecutive updates', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      // Rapid updates
      for (let i = 0; i < 100; i++) {
        update({ rtt: 50 + i, jitter: 10, packetLoss: 0.3 })
      }

      // Should have the last update's RTT
      expect(indicator.value.details.rtt).toBe(149)
    })
  })

  // ==========================================================================
  // Connection Type Handling
  // ==========================================================================

  describe('Connection Type', () => {
    it('should store host connection type', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 50, candidateType: 'host' })

      expect(indicator.value.details.connectionType).toBe('host')
    })

    it('should store relay connection type', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 50, candidateType: 'relay' })

      expect(indicator.value.details.connectionType).toBe('relay')
    })

    it('should store srflx connection type', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 50, candidateType: 'srflx' })

      expect(indicator.value.details.connectionType).toBe('srflx')
    })

    it('should store prflx connection type', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 50, candidateType: 'prflx' })

      expect(indicator.value.details.connectionType).toBe('prflx')
    })
  })

  // ==========================================================================
  // Bandwidth Estimation Option
  // ==========================================================================

  describe('Bandwidth Estimation', () => {
    it('should disable bandwidth estimation when option is false', () => {
      const { indicator, update } = useNetworkQualityIndicator({
        estimateBandwidth: false,
      })

      update({
        rtt: 50,
        bitrate: 2000,
      })

      // Bandwidth should be 0 when estimation is disabled
      expect(indicator.value.details.bandwidth).toBe(0)
    })

    it('should estimate bandwidth by default', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: 50,
        bitrate: 2000,
      })

      // Bandwidth should be estimated from bitrate
      expect(indicator.value.details.bandwidth).toBeGreaterThan(0)
    })

    it('should prefer availableOutgoingBitrate over bitrate for bandwidth', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({
        rtt: 50,
        bitrate: 1000,
        availableOutgoingBitrate: 3000,
      })

      expect(indicator.value.details.bandwidth).toBe(3000)
    })
  })

  // ==========================================================================
  // Reactive Updates
  // ==========================================================================

  describe('Reactivity', () => {
    it('should trigger reactive updates on update()', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      const levels: string[] = []

      // Manually track changes
      update({ rtt: 20, jitter: 5, packetLoss: 0.1 })
      levels.push(indicator.value.level)

      update({ rtt: 500, jitter: 100, packetLoss: 10 })
      levels.push(indicator.value.level)

      expect(levels).toEqual(['excellent', 'critical'])
    })

    it('should update all indicator properties atomically', () => {
      const { indicator, update } = useNetworkQualityIndicator()

      update({ rtt: 20, jitter: 5, packetLoss: 0.1 })

      // All properties should be consistent with excellent quality
      expect(indicator.value.level).toBe('excellent')
      expect(indicator.value.bars).toBe(5)
      expect(indicator.value.icon).toBe('signal-excellent')
      expect(indicator.value.color).toBe(DEFAULT_NETWORK_COLORS.excellent)
    })
  })
})
