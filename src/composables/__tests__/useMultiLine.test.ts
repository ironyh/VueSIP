/**
 * useMultiLine composable unit tests
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMultiLine } from '../useMultiLine'

describe('useMultiLine', () => {
  let composable: ReturnType<typeof useMultiLine>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should return a composable with all required properties', () => {
      composable = useMultiLine()

      // Check state properties
      expect(composable.lines).toBeDefined()
      expect(composable.stats).toBeDefined()
      expect(composable.activeLine).toBeDefined()
      expect(composable.activeLineId).toBeDefined()

      // Check computed properties
      expect(composable.hasAvailableLine).toBeDefined()
      expect(composable.activeCallCount).toBeDefined()
      expect(composable.heldCallCount).toBeDefined()

      // Check method properties
      expect(composable.getLine).toBeDefined()
      expect(typeof composable.getLine).toBe('function')

      expect(composable.switchToLine).toBeDefined()
      expect(typeof composable.switchToLine).toBe('function')

      expect(composable.holdLine).toBeDefined()
      expect(typeof composable.holdLine).toBe('function')

      expect(composable.resumeLine).toBeDefined()
      expect(typeof composable.resumeLine).toBe('function')

      expect(composable.assignCallToLine).toBeDefined()
      expect(typeof composable.assignCallToLine).toBe('function')

      expect(composable.releaseCall).toBeDefined()
      expect(typeof composable.releaseCall).toBe('function')

      expect(composable.createConference).toBeDefined()
      expect(typeof composable.createConference).toBe('function')

      expect(composable.addToConference).toBeDefined()
      expect(typeof composable.addToConference).toBe('function')

      expect(composable.removeFromConference).toBeDefined()
      expect(typeof composable.removeFromConference).toBe('function')

      expect(composable.getActiveConferences).toBeDefined()
      expect(typeof composable.getActiveConferences).toBe('function')

      expect(composable.parkLine).toBeDefined()
      expect(typeof composable.parkLine).toBe('function')

      expect(composable.retrieveParked).toBeDefined()
      expect(typeof composable.retrieveParked).toBe('function')

      expect(composable.getParkedCalls).toBeDefined()
      expect(typeof composable.getParkedCalls).toBe('function')

      expect(composable.isLineActive).toBeDefined()
      expect(typeof composable.isLineActive).toBe('function')

      expect(composable.isLineHeld).toBeDefined()
      expect(typeof composable.isLineHeld).toBe('function')

      expect(composable.isLineIdle).toBeDefined()
      expect(typeof composable.isLineIdle).toBe('function')

      expect(composable.manager).toBeDefined()
    })

    it('should accept config options', () => {
      composable = useMultiLine({ maxLines: 8 })
      expect(composable).toBeDefined()
    })
  })

  describe('type exports', () => {
    it('should export LineState from the module', async () => {
      // Check if the module exports LineState
      const module = await import('../useMultiLine')
      expect(module.LineState).toBeDefined()
    })
  })
})
