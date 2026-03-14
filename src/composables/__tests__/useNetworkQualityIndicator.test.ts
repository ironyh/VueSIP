/**
 * useNetworkQualityIndicator Unit Tests
 *
 * @group composables/network-quality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useNetworkQualityIndicator } from '../useNetworkQualityIndicator'

describe('useNetworkQualityIndicator', () => {
  let composable: ReturnType<typeof useNetworkQualityIndicator>

  beforeEach(() => {
    composable = useNetworkQualityIndicator()
  })

  describe('initial state', () => {
    it('should have unknown level by default', () => {
      expect(composable.indicator.value.level).toBe('unknown')
    })

    it('should have 1 bar when unknown', () => {
      expect(composable.indicator.value.bars).toBe(1)
    })

    it('should not be available initially', () => {
      expect(composable.isAvailable.value).toBe(false)
    })

    it('should have empty details by default', () => {
      expect(composable.indicator.value.details.rtt).toBe(0)
      expect(composable.indicator.value.details.jitter).toBe(0)
      expect(composable.indicator.value.details.packetLoss).toBe(0)
    })
  })

  describe('update with RTT', () => {
    it('should set excellent level for low RTT', () => {
      composable.update({ rtt: 50 })
      expect(composable.indicator.value.level).toBe('excellent')
      expect(composable.isAvailable.value).toBe(true)
    })

    it('should set good level for moderate RTT', () => {
      composable.update({ rtt: 100 })
      expect(composable.indicator.value.level).toBe('good')
    })

    it('should set fair level for higher RTT', () => {
      composable.update({ rtt: 200 })
      expect(composable.indicator.value.level).toBe('fair')
    })

    it('should set poor level for high RTT', () => {
      composable.update({ rtt: 400 })
      expect(composable.indicator.value.level).toBe('poor')
    })

    it('should set critical level for very high RTT', () => {
      composable.update({ rtt: 500 })
      expect(composable.indicator.value.level).toBe('critical')
    })

    it('should handle negative RTT as zero', () => {
      composable.update({ rtt: -50 })
      expect(composable.indicator.value.level).toBe('excellent')
    })
  })

  describe('update with packet loss', () => {
    it('should set excellent level for no packet loss', () => {
      composable.update({ packetLoss: 0 })
      expect(composable.indicator.value.level).toBe('excellent')
    })

    it('should set good level for low packet loss', () => {
      composable.update({ packetLoss: 1 })
      expect(composable.indicator.value.level).toBe('good')
    })

    it('should set fair level for moderate packet loss', () => {
      composable.update({ packetLoss: 2 })
      expect(composable.indicator.value.level).toBe('fair')
    })

    it('should set poor level for high packet loss', () => {
      composable.update({ packetLoss: 5 })
      expect(composable.indicator.value.level).toBe('poor')
    })

    it('should set critical level for very high packet loss', () => {
      composable.update({ packetLoss: 6 })
      expect(composable.indicator.value.level).toBe('critical')
    })
  })

  describe('update with jitter', () => {
    it('should set excellent level for low jitter', () => {
      composable.update({ jitter: 5 })
      expect(composable.indicator.value.level).toBe('excellent')
    })

    it('should set good level for moderate jitter', () => {
      composable.update({ jitter: 20 })
      expect(composable.indicator.value.level).toBe('good')
    })

    it('should set critical level for high jitter', () => {
      composable.update({ jitter: 100 })
      expect(composable.indicator.value.level).toBe('critical')
    })
  })

  describe('worst level selection', () => {
    it('should return worst level when multiple metrics provided', () => {
      // Excellent RTT but critical packet loss
      composable.update({ rtt: 50, packetLoss: 20 })
      expect(composable.indicator.value.level).toBe('critical')
    })

    it('should consider jitter in worst level calculation', () => {
      // Good RTT but critical jitter
      composable.update({ rtt: 100, jitter: 100 })
      expect(composable.indicator.value.level).toBe('critical')
    })
  })

  describe('details update', () => {
    it('should update RTT in details', () => {
      composable.update({ rtt: 150 })
      expect(composable.indicator.value.details.rtt).toBe(150)
    })

    it('should update jitter in details', () => {
      composable.update({ jitter: 25 })
      expect(composable.indicator.value.details.jitter).toBe(25)
    })

    it('should update packet loss in details', () => {
      composable.update({ packetLoss: 5 })
      expect(composable.indicator.value.details.packetLoss).toBe(5)
    })

    it('should update connection type', () => {
      composable.update({ candidateType: 'relay' })
      expect(composable.indicator.value.details.connectionType).toBe('relay')
    })
  })

  describe('reset', () => {
    it('should reset to unknown state', () => {
      composable.update({ rtt: 500 })
      composable.reset()

      expect(composable.indicator.value.level).toBe('unknown')
      expect(composable.isAvailable.value).toBe(false)
      expect(composable.indicator.value.details.rtt).toBe(0)
    })
  })

  describe('indicator computed properties', () => {
    it('should have correct bars for each level', () => {
      composable.update({ rtt: 50 }) // excellent
      expect(composable.indicator.value.bars).toBe(5)

      composable.update({ rtt: 100 }) // good
      expect(composable.indicator.value.bars).toBe(4)

      composable.update({ rtt: 200 }) // fair
      expect(composable.indicator.value.bars).toBe(3)

      composable.update({ rtt: 400 }) // poor
      expect(composable.indicator.value.bars).toBe(2)

      composable.update({ rtt: 500 }) // critical
      expect(composable.indicator.value.bars).toBe(1)
    })

    it('should have icon for each level', () => {
      composable.update({ rtt: 50 })
      expect(composable.indicator.value.icon).toBe('signal-excellent')
    })

    it('should have aria label for each level', () => {
      composable.update({ rtt: 50 })
      expect(composable.indicator.value.ariaLabel).toBe('Network quality: excellent connection')
    })
  })

  describe('with custom options', () => {
    it('should use custom colors when provided', () => {
      const customComposable = useNetworkQualityIndicator({
        colors: {
          excellent: '#00FF00',
          good: '#ADFF2F',
          fair: '#FFFF00',
          poor: '#FFA500',
          critical: '#FF0000',
          unknown: '#808080',
        },
      })

      customComposable.update({ rtt: 50 })
      expect(customComposable.indicator.value.color).toBe('#00FF00')
    })

    it('should use custom thresholds when provided', () => {
      const customComposable = useNetworkQualityIndicator({
        thresholds: {
          rtt: [20, 50, 100, 200],
          packetLoss: [0.5, 1, 3, 5],
          jitter: [5, 10, 20, 50],
        },
      })

      // With default thresholds: 100ms = good
      const defaultComposable = useNetworkQualityIndicator()
      defaultComposable.update({ rtt: 100 })
      expect(defaultComposable.indicator.value.level).toBe('good')

      // With custom thresholds: 100ms = fair
      customComposable.update({ rtt: 100 })
      expect(customComposable.indicator.value.level).toBe('fair')
    })
  })
})
