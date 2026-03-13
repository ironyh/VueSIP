import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventBus, createEventBus, cleanupGlobalEventBus } from '@/core/EventBus'

// Define test event map
interface TestEvents {
  test: string
  number: number
  object: { value: string }
  async: Promise<string>
}

describe('EventBus', () => {
  let bus: EventBus<TestEvents>

  beforeEach(() => {
    bus = new EventBus<TestEvents>()
  })

  afterEach(() => {
    bus.destroy()
    cleanupGlobalEventBus()
  })

  describe('on()', () => {
    it('should register an event listener', () => {
      const handler = vi.fn()
      bus.on('test', handler)

      expect(bus.listenerCount('test')).toBe(1)
    })

    it('should call handler when event is emitted', async () => {
      const handler = vi.fn()
      bus.on('test', handler)

      await bus.emit('test', 'hello')

      expect(handler).toHaveBeenCalledWith('hello')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should return listener ID', () => {
      const handler = vi.fn()
      const id = bus.on('test', handler)

      expect(typeof id).toBe('string')
      expect(id).toContain('listener_')
    })

    it('should support priority option', async () => {
      const lowPriority = vi.fn()
      const highPriority = vi.fn()

      bus.on('test', lowPriority, { priority: 1 })
      bus.on('test', highPriority, { priority: 10 })

      await bus.emit('test', 'hello')

      // Higher priority should be called first
      expect(highPriority).toHaveBeenCalledBefore(lowPriority)
    })

    it('should support custom ID', () => {
      const handler = vi.fn()
      const id = bus.on('test', handler, { id: 'custom-id' })

      expect(id).toBe('custom-id')
    })
  })

  describe('once()', () => {
    it('should register a one-time listener', async () => {
      const handler = vi.fn()
      bus.once('test', handler)

      await bus.emit('test', 'hello')
      await bus.emit('test', 'world')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith('hello')
    })

    it('should return listener ID', () => {
      const handler = vi.fn()
      const id = bus.once('test', handler)

      expect(typeof id).toBe('string')
    })
  })

  describe('off()', () => {
    it('should remove listener by handler function', async () => {
      const handler = vi.fn()
      bus.on('test', handler)

      bus.off('test', handler)

      await bus.emit('test', 'hello')

      expect(handler).not.toHaveBeenCalled()
    })

    it('should remove listener by ID', async () => {
      const handler = vi.fn()
      const id = bus.on('test', handler)

      bus.off('test', id)

      await bus.emit('test', 'hello')

      expect(handler).not.toHaveBeenCalled()
    })

    it('should return false for non-existent listener', () => {
      const handler = vi.fn()
      const result = bus.off('test', handler)

      expect(result).toBe(false)
    })
  })

  describe('removeById()', () => {
    it('should remove listener across all events by ID', () => {
      const handler = vi.fn()
      const id = bus.on('test1', handler)
      bus.on('test2', handler)

      const result = bus.removeById(id)

      expect(result).toBe(true)
      expect(bus.listenerCount('test1')).toBe(0)
    })

    it('should return false for non-existent ID', () => {
      const result = bus.removeById('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('emit()', () => {
    it('should pass data to handlers', async () => {
      const handler = vi.fn()
      bus.on('object', handler)

      await bus.emit('object', { value: 'test' })

      expect(handler).toHaveBeenCalledWith({ value: 'test' })
    })

    it('should handle async handlers', async () => {
      const handler = vi.fn().mockResolvedValue('async result')
      bus.on('async', handler)

      await bus.emit('async', 'test')

      expect(handler).toHaveBeenCalled()
    })

    it('should continue if handler throws', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()

      bus.on('test', errorHandler)
      bus.on('test', normalHandler)

      // Should not throw
      await bus.emit('test', 'hello')

      expect(normalHandler).toHaveBeenCalledWith('hello')
    })

    it('should buffer events when no listeners', async () => {
      // No listener registered yet
      await bus.emit('test', 'buffered')

      // Now register a listener
      const handler = vi.fn()
      bus.on('test', handler)

      // The buffered event should be replayed
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handler).toHaveBeenCalledWith('buffered')
    })

    it('should drop buffered events after BUFFER_TTL expires', async () => {
      // Emit an event - it gets buffered (no listeners yet)
      bus.emit('test', 'old event')

      // Wait longer than BUFFER_TTL (5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 5100))

      // Now register a listener - expired events should NOT be replayed
      const handler = vi.fn()
      bus.on('test', handler)

      // Wait for any potential replay
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Handler should NOT have been called because the buffered event expired
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('emitSync()', () => {
    it('should emit synchronously', () => {
      const handler = vi.fn()
      bus.on('test', handler)

      bus.emitSync('test', 'sync')

      expect(handler).toHaveBeenCalledWith('sync')
    })
  })

  describe('removeAllListeners()', () => {
    it('should remove all listeners for specific event', () => {
      bus.on('test', vi.fn())
      bus.on('test', vi.fn())
      bus.on('other', vi.fn())

      bus.removeAllListeners('test')

      expect(bus.listenerCount('test')).toBe(0)
      expect(bus.listenerCount('other')).toBe(1)
    })

    it('should remove all listeners when no event specified', () => {
      bus.on('test', vi.fn())
      bus.on('other', vi.fn())

      bus.removeAllListeners()

      expect(bus.listenerCount('test')).toBe(0)
      expect(bus.listenerCount('other')).toBe(0)
    })
  })

  describe('waitFor()', () => {
    it('should resolve when event is emitted', async () => {
      const promise = bus.waitFor('test', 1000)

      await bus.emit('test', 'hello')

      await expect(promise).resolves.toBe('hello')
    })

    it('should reject on timeout', async () => {
      const promise = bus.waitFor('test', 100)

      await expect(promise).rejects.toThrow('Timeout')
    })
  })

  describe('listenerCount()', () => {
    it('should return correct count', () => {
      bus.on('test', vi.fn())
      bus.on('test', vi.fn())

      expect(bus.listenerCount('test')).toBe(2)
    })

    it('should return 0 for non-existent event', () => {
      expect(bus.listenerCount('nonexistent')).toBe(0)
    })
  })

  describe('eventNames()', () => {
    it('should return all event names with listeners', () => {
      bus.on('test', vi.fn())
      bus.on('other', vi.fn())

      const names = bus.eventNames()

      expect(names).toContain('test')
      expect(names).toContain('other')
    })
  })

  describe('hasListeners()', () => {
    it('should return true when listeners exist', () => {
      bus.on('test', vi.fn())

      expect(bus.hasListeners('test')).toBe(true)
    })

    it('should return false when no listeners', () => {
      expect(bus.hasListeners('test')).toBe(false)
    })
  })

  describe('setBufferingEnabled()', () => {
    it('should disable buffering', async () => {
      bus.setBufferingEnabled(false)

      await bus.emit('test', 'hello')

      const handler = vi.fn()
      bus.on('test', handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handler).not.toHaveBeenCalled()
    })

    it('should clear buffer when disabled', async () => {
      await bus.emit('test', 'buffered')

      bus.setBufferingEnabled(false)
      bus.setBufferingEnabled(true)

      const handler = vi.fn()
      bus.on('test', handler)

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('destroy()', () => {
    it('should remove all listeners and clear buffer', () => {
      bus.on('test', vi.fn())
      bus.emitSync('test', 'data')

      bus.destroy()

      expect(bus.listenerCount('test')).toBe(0)
      expect(bus.eventNames()).toHaveLength(0)
    })
  })

  describe('createEventBus()', () => {
    it('should create a new EventBus instance', () => {
      const newBus = createEventBus<TestEvents>()

      expect(newBus).toBeInstanceOf(EventBus)
      newBus.destroy()
    })
  })

  describe('wildcard listeners', () => {
    it('should match wildcard * for all events', async () => {
      const wildcardHandler = vi.fn()
      bus.on('*', wildcardHandler)

      await bus.emit('test', 'hello')

      expect(wildcardHandler).toHaveBeenCalledWith('hello')
    })

    it('should match namespace wildcards', async () => {
      const namespaceHandler = vi.fn()
      bus.on('call:*', namespaceHandler)

      await bus.emit('call:started', { value: 'test' })

      expect(namespaceHandler).toHaveBeenCalledWith({ value: 'test' })
    })

    it('should work with emitSync for wildcard events', () => {
      const wildcardHandler = vi.fn()
      bus.on('*', wildcardHandler)

      bus.emitSync('any-event', 'sync data')

      expect(wildcardHandler).toHaveBeenCalledWith('sync data')
    })

    it('should respect priority for wildcard listeners', async () => {
      const order: string[] = []

      bus.on('call:*', () => order.push('low'), { priority: 0 })
      bus.on('call:*', () => order.push('high'), { priority: 10 })

      await bus.emit('call:ringing', {})

      // Higher priority should execute first
      expect(order).toEqual(['high', 'low'])
    })
  })
})
