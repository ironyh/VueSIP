import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isE2EMode,
  getE2EEmit,
  getEventBridge,
  setListenersReady,
  type E2EEmitFn,
} from '../e2eHarness'
import type { EventBus } from '@/core/EventBus'

describe('e2eHarness', () => {
  const originalEmitSipEvent = global.window?.__emitSipEvent
  const originalSipEventBridge = global.window?.__sipEventBridge
  const originalSipListenersReady = global.window?.__sipListenersReady

  beforeEach(() => {
    // Clean up any existing globals
    delete (global.window as unknown as Record<string, unknown>).__emitSipEvent
    delete (global.window as unknown as Record<string, unknown>).__sipEventBridge
    delete (global.window as unknown as Record<string, unknown>).__sipListenersReady
  })

  afterEach(() => {
    // Restore original state
    if (originalEmitSipEvent !== undefined) {
      ;(global.window as unknown as Record<string, unknown>).__emitSipEvent = originalEmitSipEvent
    } else {
      delete (global.window as unknown as Record<string, unknown>).__emitSipEvent
    }
    if (originalSipEventBridge !== undefined) {
      ;(global.window as unknown as Record<string, unknown>).__sipEventBridge =
        originalSipEventBridge
    } else {
      delete (global.window as unknown as Record<string, unknown>).__sipEventBridge
    }
    if (originalSipListenersReady !== undefined) {
      ;(global.window as unknown as Record<string, unknown>).__sipListenersReady =
        originalSipListenersReady
    } else {
      delete (global.window as unknown as Record<string, unknown>).__sipListenersReady
    }
  })

  describe('isE2EMode', () => {
    it('should return false when window is undefined', () => {
      const result = isE2EMode()
      expect(result).toBe(false)
    })

    it('should return false when no E2E globals are set', () => {
      // window is defined in JSDOM but no E2E globals are set
      const result = isE2EMode()
      expect(result).toBe(false)
    })

    it('should return true when __emitSipEvent is a function', () => {
      const emitFn: E2EEmitFn = () => {}
      ;(global.window as unknown as Record<string, unknown>).__emitSipEvent = emitFn

      const result = isE2EMode()
      expect(result).toBe(true)
    })

    it('should return true when __sipEventBridge is defined', () => {
      ;(global.window as unknown as Record<string, unknown>).__sipEventBridge = {} as EventBus

      const result = isE2EMode()
      expect(result).toBe(true)
    })

    it('should return true when both E2E globals are set', () => {
      const emitFn: E2EEmitFn = () => {}
      ;(global.window as unknown as Record<string, unknown>).__emitSipEvent = emitFn
      ;(global.window as unknown as Record<string, unknown>).__sipEventBridge = {} as EventBus

      const result = isE2EMode()
      expect(result).toBe(true)
    })
  })

  describe('getE2EEmit', () => {
    it('should return null when window is undefined', () => {
      const result = getE2EEmit()
      expect(result).toBeNull()
    })

    it('should return null when __emitSipEvent is not defined', () => {
      const result = getE2EEmit()
      expect(result).toBeNull()
    })

    it('should return null when __emitSipEvent is not a function', () => {
      ;(global.window as unknown as Record<string, unknown>).__emitSipEvent = 'not a function'

      const result = getE2EEmit()
      expect(result).toBeNull()
    })

    it('should return the emit function when defined', () => {
      const emitFn: E2EEmitFn = (_event, _data) => {}
      ;(global.window as unknown as Record<string, unknown>).__emitSipEvent = emitFn

      const result = getE2EEmit()
      expect(result).toBe(emitFn)
    })
  })

  describe('getEventBridge', () => {
    it('should return undefined when window is undefined', () => {
      const result = getEventBridge()
      expect(result).toBeUndefined()
    })

    it('should return undefined when __sipEventBridge is not defined', () => {
      const result = getEventBridge()
      expect(result).toBeUndefined()
    })

    it('should return the EventBridge when defined', () => {
      const mockBridge = {} as EventBus
      ;(global.window as unknown as Record<string, unknown>).__sipEventBridge = mockBridge

      const result = getEventBridge()
      expect(result).toBe(mockBridge)
    })
  })

  describe('setListenersReady', () => {
    it('should do nothing when window is undefined', () => {
      // Should not throw
      expect(() => setListenersReady()).not.toThrow()
    })

    it('should not set __sipListenersReady when not in E2E mode', () => {
      setListenersReady()
      expect(
        (global.window as unknown as Record<string, unknown>).__sipListenersReady
      ).toBeUndefined()
    })

    it('should set __sipListenersReady to true when in E2E mode', () => {
      const emitFn: E2EEmitFn = () => {}
      ;(global.window as unknown as Record<string, unknown>).__emitSipEvent = emitFn

      setListenersReady()
      expect((global.window as unknown as Record<string, unknown>).__sipListenersReady).toBe(true)
    })
  })
})
