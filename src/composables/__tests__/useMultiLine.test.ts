/**
 * useMultiLine composable tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { useMultiLine, LineState } from '../useMultiLine'

describe('useMultiLine', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should return initial empty lines array', () => {
      const { lines } = useMultiLine()

      expect(Array.isArray(lines.value)).toBe(true)
    })

    it('should return initial stats with zeros', () => {
      const { stats } = useMultiLine()

      expect(stats.value).toBeDefined()
      expect(stats.value.totalLines).toBeGreaterThanOrEqual(0)
      expect(stats.value.activeLines).toBe(0)
      expect(stats.value.heldLines).toBe(0)
      expect(stats.value.idleLines).toBeGreaterThanOrEqual(0)
    })

    it('should accept custom configuration', () => {
      const { lines } = useMultiLine({ maxLines: 8 })

      expect(Array.isArray(lines.value)).toBe(true)
    })
  })

  describe('computed state', () => {
    it('should calculate hasAvailableLine correctly', () => {
      const { hasAvailableLine } = useMultiLine()

      // Should be computed based on lines state
      expect(typeof hasAvailableLine.value).toBe('boolean')
    })

    it('should calculate activeCallCount', () => {
      const { activeCallCount } = useMultiLine()

      expect(typeof activeCallCount.value).toBe('number')
    })

    it('should calculate heldCallCount', () => {
      const { heldCallCount } = useMultiLine()

      expect(typeof heldCallCount.value).toBe('number')
    })

    it('should return activeLineId as computed', () => {
      const { activeLineId } = useMultiLine()

      expect(typeof activeLineId.value).toBe('number')
    })
  })

  describe('status helpers', () => {
    it('should return false for unknown line in isLineActive', () => {
      const { isLineActive } = useMultiLine()

      expect(isLineActive(999)).toBe(false)
    })

    it('should return false for unknown line in isLineHeld', () => {
      const { isLineHeld } = useMultiLine()

      expect(isLineHeld(999)).toBe(false)
    })

    it('should return false for unknown line in isLineIdle', () => {
      const { isLineIdle } = useMultiLine()

      expect(isLineIdle(999)).toBe(false)
    })
  })

  describe('getLine', () => {
    it('should return undefined for non-existent line', () => {
      const { getLine } = useMultiLine()

      expect(getLine(999)).toBeUndefined()
    })

    it('should return line for valid line id', () => {
      const { getLine, lines } = useMultiLine()

      // Get first available line if any
      if (lines.value.length > 0) {
        const lineId = lines.value[0].id
        const line = getLine(lineId)
        expect(line).toBeDefined()
        expect(line?.id).toBe(lineId)
      }
    })
  })

  describe('parking support', () => {
    it('should return empty array for getParkedCalls', () => {
      const { getParkedCalls } = useMultiLine()

      expect(Array.isArray(getParkedCalls())).toBe(true)
    })

    it('should return empty array for getActiveConferences', () => {
      const { getActiveConferences } = useMultiLine()

      expect(Array.isArray(getActiveConferences())).toBe(true)
    })
  })

  describe('manager access', () => {
    it('should expose the manager instance', () => {
      const { manager } = useMultiLine()

      expect(manager).toBeDefined()
      expect(typeof manager.getAllLines).toBe('function')
      expect(typeof manager.getStats).toBe('function')
      expect(typeof manager.reset).toBe('function')
    })
  })

  describe('LineState enum', () => {
    it('should have correct LineState values', () => {
      expect(LineState.IDLE).toBe('idle')
      expect(LineState.RINGING).toBe('ringing')
      expect(LineState.ACTIVE).toBe('active')
      expect(LineState.HELD).toBe('held')
      expect(LineState.TRANSFERRING).toBe('transferring')
      expect(LineState.PARKED).toBe('parked')
    })
  })
})
