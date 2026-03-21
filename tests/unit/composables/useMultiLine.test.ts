/**
 * useMultiLine Composable Unit Tests
 *
 * Tests for the multi-line management composable
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMultiLine } from '../../../src/composables/useMultiLine'

describe('useMultiLine', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const { lines, activeLine, activeLineId, stats } = useMultiLine()

      // Default config creates 4 lines (1-indexed)
      expect(lines.value).toHaveLength(4)
      expect(activeLine.value).toBeDefined()
      expect(activeLineId.value).toBe(1)
      expect(stats.value).toEqual({
        totalLines: 4,
        activeLines: 0,
        heldLines: 0,
        idleLines: 4,
        activeConferences: 0,
        parkedCalls: 0,
        totalCallsHandled: 0,
      })
    })

    it('should initialize with custom max lines', () => {
      const { lines } = useMultiLine({ maxLines: 8 })

      expect(lines.value).toHaveLength(8)
    })
  })

  describe('line state', () => {
    it('should track hasAvailableLine correctly', () => {
      const { hasAvailableLine } = useMultiLine()

      // With default 4 lines, all should be idle
      expect(hasAvailableLine.value).toBe(true)
    })

    it('should count active and held calls', () => {
      const { activeCallCount, heldCallCount } = useMultiLine()

      expect(activeCallCount.value).toBe(0)
      expect(heldCallCount.value).toBe(0)
    })
  })

  describe('line operations', () => {
    it('should get line by id', () => {
      const { getLine } = useMultiLine({ maxLines: 4 })

      const line = getLine(1)
      expect(line).toBeDefined()
      expect(line?.id).toBe(1)
    })

    it('should return undefined for non-existent line', () => {
      const { getLine } = useMultiLine()

      const line = getLine(999)
      expect(line).toBeUndefined()
    })
  })

  describe('status helpers', () => {
    it('should correctly identify idle lines', () => {
      const { isLineIdle } = useMultiLine({ maxLines: 4 })

      // All lines start as idle (1-indexed, lines 1-4)
      expect(isLineIdle(1)).toBe(true)
      expect(isLineIdle(2)).toBe(true)
    })

    it('should return false for non-existent line in status helpers', () => {
      const { isLineActive, isLineHeld, isLineIdle } = useMultiLine()

      expect(isLineActive(999)).toBe(false)
      expect(isLineHeld(999)).toBe(false)
      expect(isLineIdle(999)).toBe(false)
    })
  })

  describe('manager access', () => {
    it('should expose the manager for advanced use', () => {
      const { manager } = useMultiLine()

      expect(manager).toBeDefined()
      expect(typeof manager.getAllLines).toBe('function')
      expect(typeof manager.getActiveLine).toBe('function')
      expect(typeof manager.reset).toBe('function')
    })
  })
})
