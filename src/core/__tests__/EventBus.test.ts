/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventBus, createEventBus } from '../EventBus'

// Minimal EventMap for testing
interface TestEventMap {
  test: { message: string }
  numeric: number
  empty: void
  async: Promise<string>
}

describe('EventBus', () => {
  let bus: EventBus<TestEventMap>

  beforeEach(() => {
    bus = createEventBus<TestEventMap>()
  })

  afterEach(() => {
    bus.destroy()
  })

  describe('on/off', () => {
    it('should add and call event handler', () => {
      const handler = vi.fn()
      bus.on('test', handler)

      bus.emit('test', { message: 'hello' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ message: 'hello' })
    })

    it('should return listener ID', () => {
      const handler = vi.fn()
      const id = bus.on('test', handler)

      expect(id).toMatch(/^listener_\d+_\d+$/)
    })

    it('should support custom listener ID', () => {
      const handler = vi.fn()
      const id = bus.on('test', handler, { id: 'my-custom-id' })

      expect(id).toBe('my-custom-id')
    })

    it('should support priority option', () => {
      const lowPriority = vi.fn()
      const highPriority = vi.fn()

      bus.on('test', lowPriority, { priority: 0 })
      bus.on('test', highPriority, { priority: 10 })

      bus.emit('test', { message: 'test' })

      // Higher priority should be called first
      expect(highPriority).toHaveBeenCalledBefore(lowPriority)
    })

    it('should unsubscribe via off method', () => {
      const handler = vi.fn()
      bus.on('test', handler)
      bus.off('test', handler)

      bus.emit('test', { message: 'hello' })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should unsubscribe via returned ID', () => {
      const handler = vi.fn()
      const id = bus.on('test', handler)

      bus.off('test', id)
      bus.emit('test', { message: 'hello' })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should remove by ID across all events', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const id = bus.on('test', handler1)
      bus.on('numeric', handler2)

      bus.removeById(id)
      bus.emit('test', { message: 'hello' })
      bus.emit('numeric', 42)

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })
  })

  describe('once', () => {
    it('should call handler only once', () => {
      const handler = vi.fn()
      bus.once('test', handler)

      bus.emit('test', { message: 'first' })
      bus.emit('test', { message: 'second' })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should return listener ID', () => {
      const handler = vi.fn()
      const id = bus.once('test', handler)

      expect(id).toMatch(/^listener_\d+_\d+$/)
    })
  })

  describe('emit', () => {
    it('should pass data to handlers', () => {
      const handler = vi.fn()
      bus.on('test', handler)

      bus.emit('test', { message: 'test data' })

      expect(handler).toHaveBeenCalledWith({ message: 'test data' })
    })

    it('should handle numeric payload', () => {
      const handler = vi.fn()
      bus.on('numeric', handler)

      bus.emit('numeric', 42)

      expect(handler).toHaveBeenCalledWith(42)
    })

    it('should handle async handlers', async () => {
      const handler = vi.fn()
      bus.on('async', handler)

      await bus.emit('async', Promise.resolve('result'))

      expect(handler).toHaveBeenCalled()
    })

    it('should continue calling handlers even if one throws', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()

      bus.on('test', errorHandler)
      bus.on('test', normalHandler)

      bus.emit('test', { message: 'hello' })

      expect(errorHandler).toHaveBeenCalled()
      expect(normalHandler).toHaveBeenCalled()
    })

    it('should remove once handlers after emission', () => {
      const handler = vi.fn()
      bus.once('test', handler)

      bus.emit('test', { message: 'first' })
      bus.emit('test', { message: 'second' })

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should not fail when emitting to non-existent event', async () => {
      await expect(async () => {
        await bus.emit('nonexistent' as keyof TestEventMap, { message: 'test' } as unknown as void)
      }).not.toThrow()
    })
  })

  describe('emitSync', () => {
    it('should emit synchronously', () => {
      const handler = vi.fn()
      bus.on('test', handler)

      bus.emitSync('test', { message: 'hello' })

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('listenerCount', () => {
    it('should return 0 for event with no listeners', () => {
      expect(bus.listenerCount('test')).toBe(0)
    })

    it('should return correct count after adding listeners', () => {
      bus.on('test', vi.fn())
      bus.on('test', vi.fn())

      expect(bus.listenerCount('test')).toBe(2)
    })

    it('should return 0 after removing all listeners', () => {
      const handler = vi.fn()
      bus.on('test', handler)
      bus.off('test', handler)

      expect(bus.listenerCount('test')).toBe(0)
    })
  })

  describe('eventNames', () => {
    it('should return empty array when no listeners', () => {
      expect(bus.eventNames()).toEqual([])
    })

    it('should return all event names with listeners', () => {
      bus.on('test', vi.fn())
      bus.on('numeric', vi.fn())

      const names = bus.eventNames()

      expect(names).toContain('test')
      expect(names).toContain('numeric')
    })
  })

  describe('hasListeners', () => {
    it('should return false for event with no listeners', () => {
      expect(bus.hasListeners('test')).toBe(false)
    })

    it('should return true for event with listeners', () => {
      bus.on('test', vi.fn())

      expect(bus.hasListeners('test')).toBe(true)
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      bus.on('test', vi.fn())
      bus.on('test', vi.fn())

      bus.removeAllListeners('test')

      expect(bus.listenerCount('test')).toBe(0)
    })

    it('should remove all listeners for all events', () => {
      bus.on('test', vi.fn())
      bus.on('numeric', vi.fn())

      bus.removeAllListeners()

      expect(bus.listenerCount('test')).toBe(0)
      expect(bus.listenerCount('numeric')).toBe(0)
      expect(bus.eventNames()).toEqual([])
    })
  })

  describe('waitFor', () => {
    it('should resolve when event is emitted', async () => {
      const promise = bus.waitFor('test', 1000)

      bus.emit('test', { message: 'hello' })

      await expect(promise).resolves.toEqual({ message: 'hello' })
    })

    it('should reject on timeout', async () => {
      const promise = bus.waitFor('test', 50)

      await expect(promise).rejects.toThrow('Timeout waiting for event: test')
    })

    it('should not timeout if event emitted before timeout', async () => {
      const promise = bus.waitFor('test', 1000)

      // Emit after 50ms
      setTimeout(() => {
        bus.emit('test', { message: 'delayed' })
      }, 50)

      await expect(promise).resolves.toEqual({ message: 'delayed' })
    })
  })

  describe('buffering', () => {
    it('should buffer events when no listeners', async () => {
      bus.emit('test', { message: 'buffered' })

      const handler = vi.fn()
      bus.on('test', handler)

      // Wait for async emission
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handler).toHaveBeenCalledWith({ message: 'buffered' })
    })

    it('should clear buffer after successful emission', async () => {
      bus.emit('test', { message: 'first' })

      const handler = vi.fn()
      bus.on('test', handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      // First emission (buffer replay) should have happened
      // Now emit again - it should go to listeners directly, not be buffered
      bus.emit('test', { message: 'second' })

      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenCalledWith({ message: 'second' })
    })

    it('should respect max buffer size', async () => {
      // Emit more than MAX_BUFFER_SIZE (50) events
      for (let i = 0; i < 60; i++) {
        bus.emit('test', { message: `msg${i}` })
      }

      const handler = vi.fn()
      bus.on('test', handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Should only replay last 50
      expect(handler).toHaveBeenCalled()
    })

    it('should disable buffering', async () => {
      bus.setBufferingEnabled(false)
      bus.emit('test', { message: 'buffered' })

      const handler = vi.fn()
      bus.on('test', handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should remove all listeners', () => {
      bus.on('test', vi.fn())
      bus.on('numeric', vi.fn())

      bus.destroy()

      expect(bus.listenerCount('test')).toBe(0)
      expect(bus.listenerCount('numeric')).toBe(0)
    })

    it('should clear event buffer', () => {
      bus.emit('test', { message: 'buffered' })

      bus.destroy()

      bus.on('test', vi.fn())
      // Should not replay buffered event
    })
  })
})
