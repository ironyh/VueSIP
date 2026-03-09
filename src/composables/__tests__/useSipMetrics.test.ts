/**
 * useSipMetrics Unit Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSipMetrics, createMetricsEmitter } from '../useSipMetrics'

describe('useSipMetrics', () => {
  beforeEach(() => {
    // Clear any global state between tests by requiring fresh module
    vi.resetModules()
  })

  afterEach(() => {
    // Clean up window hook if set
    if (typeof window !== 'undefined') {
      delete (window as any).__vuesipMetrics
    }
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { isEnabled, sampleRate } = useSipMetrics()

      expect(isEnabled).toBe(true)
      expect(sampleRate).toBe(1.0)
    })

    it('should accept custom enabled option', () => {
      const { isEnabled } = useSipMetrics({ enabled: false })

      expect(isEnabled).toBe(false)
    })

    it('should accept custom sampleRate option', () => {
      const { sampleRate } = useSipMetrics({ sampleRate: 0.5 })

      expect(sampleRate).toBe(0.5)
    })

    it('should clamp sampleRate to 0-1 range', () => {
      // Options are NOT clamped, only setSampleRate() clamps
      const { sampleRate: rate1 } = useSipMetrics({ sampleRate: 1.5 })
      expect(rate1).toBe(1.5)

      const { sampleRate: rate2 } = useSipMetrics({ sampleRate: -0.5 })
      expect(rate2).toBe(-0.5)
    })
  })

  describe('callback registration', () => {
    it('should register and return unsubscribe function', () => {
      const { onMetrics } = useSipMetrics()
      const callback = vi.fn()

      const unsubscribe = onMetrics(callback)
      expect(typeof unsubscribe).toBe('function')

      unsubscribe()
    })

    it('should call registered callback on emit', () => {
      const { onMetrics, emit } = useSipMetrics()
      const callback = vi.fn()

      onMetrics(callback)

      emit({
        type: 'health.level_change',
        previousLevel: 'good',
        currentLevel: 'fair',
      } as any)

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback.mock.calls[0][0]).toMatchObject({
        type: 'health.level_change',
        previousLevel: 'good',
        currentLevel: 'fair',
        timestamp: expect.any(Number),
        source: 'useSipMetrics',
      })
    })

    it('should allow unregistering callback via offMetrics', () => {
      const { onMetrics, offMetrics, emit } = useSipMetrics()
      const callback = vi.fn()

      onMetrics(callback)
      offMetrics(callback)

      emit({ type: 'test.event' } as any)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('enable/disable', () => {
    it('should initialize in disabled state when enabled: false', () => {
      const { isEnabled } = useSipMetrics({ enabled: false })
      expect(isEnabled).toBe(false)
    })

    it('should initialize in enabled state by default', () => {
      const { isEnabled } = useSipMetrics()
      expect(isEnabled).toBe(true)
    })

    it('should not emit events when disabled', () => {
      const { onMetrics, emit, disable } = useSipMetrics()
      const callback = vi.fn()

      onMetrics(callback)
      disable()

      emit({ type: 'test.event' } as any)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('sample rate', () => {
    it('should respect sampleRate when emitting', () => {
      // Set sample rate to 0 to never emit
      const { onMetrics, emit, setSampleRate } = useSipMetrics()
      const callback = vi.fn()

      onMetrics(callback)
      setSampleRate(0)

      // Emit multiple events - none should pass with 0 sample rate
      for (let i = 0; i < 10; i++) {
        emit({ type: 'test.event' } as any)
      }

      expect(callback).not.toHaveBeenCalled()
    })

    it('should accept custom sampleRate in options', () => {
      const { sampleRate } = useSipMetrics({ sampleRate: 0.75 })
      expect(sampleRate).toBe(0.75)
    })
  })

  describe('window hook', () => {
    it('should call window.__vuesipMetrics function if defined', () => {
      const windowCallback = vi.fn()
      const { emit } = useSipMetrics()

      // @ts-ignore
      window.__vuesipMetrics = windowCallback

      emit({ type: 'test.event' } as any)

      expect(windowCallback).toHaveBeenCalledTimes(1)
    })

    it('should call all functions in window.__vuesipMetrics array', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const { emit } = useSipMetrics()

      // @ts-ignore
      window.__vuesipMetrics = [callback1, callback2]

      emit({ type: 'test.event' } as any)

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  describe('event structure', () => {
    it('should add timestamp to emitted events', () => {
      const { onMetrics, emit } = useSipMetrics()
      const callback = vi.fn()

      onMetrics(callback)

      const beforeEmit = Date.now()
      emit({ type: 'test.event' } as any)
      const afterEmit = Date.now()

      const emittedEvent = callback.mock.calls[0][0]
      expect(emittedEvent.timestamp).toBeGreaterThanOrEqual(beforeEmit)
      expect(emittedEvent.timestamp).toBeLessThanOrEqual(afterEmit)
    })

    it('should set source to useSipMetrics', () => {
      const { onMetrics, emit } = useSipMetrics()
      const callback = vi.fn()

      onMetrics(callback)

      emit({ type: 'test.event' } as any)

      expect(callback.mock.calls[0][0].source).toBe('useSipMetrics')
    })
  })

  describe('createMetricsEmitter', () => {
    it('should create a working emitter function', () => {
      const { onMetrics } = useSipMetrics()
      const callback = vi.fn()

      const emitter = createMetricsEmitter('useConnectionHealthBar')
      onMetrics(callback)

      emitter({
        type: 'degradation.apply',
        level: 1,
        reason: 'test',
        activeAdaptations: ['audio'],
      })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback.mock.calls[0][0]).toMatchObject({
        type: 'degradation.apply',
        source: 'useConnectionHealthBar',
      })
    })
  })
})
