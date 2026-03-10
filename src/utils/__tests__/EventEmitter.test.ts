/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from '../EventEmitter'

interface TestEvents {
  test: { message: string }
  numeric: number
  empty: void
}

describe('EventEmitter', () => {
  let emitter: EventEmitter<TestEvents>

  beforeEach(() => {
    emitter = new EventEmitter<TestEvents>()
  })

  describe('on/off', () => {
    it('should subscribe to an event', () => {
      const handler = vi.fn()
      emitter.on('test', handler)

      emitter.emit('test', { message: 'hello' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ message: 'hello' })
    })

    it('should unsubscribe via returned function', () => {
      const handler = vi.fn()
      const unsubscribe = emitter.on('test', handler)

      emitter.emit('test', { message: 'first' })
      unsubscribe()
      emitter.emit('test', { message: 'second' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ message: 'first' })
    })

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('test', handler1)
      emitter.on('test', handler2)

      emitter.emit('test', { message: 'hello' })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should remove specific handler with off', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.off('test', handler1)

      emitter.emit('test', { message: 'hello' })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should remove all handlers for event when handler not specified', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.off('test')

      emitter.emit('test', { message: 'hello' })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('once', () => {
    it('should call handler only once', () => {
      const handler = vi.fn()
      emitter.once('test', handler)

      emitter.emit('test', { message: 'first' })
      emitter.emit('test', { message: 'second' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ message: 'first' })
    })

    it('should return unsubscribe function', () => {
      const handler = vi.fn()
      const unsubscribe = emitter.once('test', handler)

      unsubscribe()
      emitter.emit('test', { message: 'hello' })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('emit', () => {
    it('should pass data to handlers', () => {
      const handler = vi.fn()
      emitter.on('test', handler)

      emitter.emit('test', { message: 'test data' })

      expect(handler).toHaveBeenCalledWith({ message: 'test data' })
    })

    it('should handle numeric payload', () => {
      const handler = vi.fn()
      emitter.on('numeric', handler)

      emitter.emit('numeric', 42)

      expect(handler).toHaveBeenCalledWith(42)
    })

    it('should handle empty/undefined payload', () => {
      const handler = vi.fn()
      emitter.on('empty', handler)

      emitter.emit('empty', undefined)

      expect(handler).toHaveBeenCalledWith(undefined)
    })

    it('should not fail when emitting to non-existent event', () => {
      expect(() => {
        emitter.emit('nonexistent', { message: 'test' })
      }).not.toThrow()
    })

    it('should continue calling handlers even if one throws', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()

      emitter.on('test', errorHandler)
      emitter.on('test', normalHandler)

      emitter.emit('test', { message: 'hello' })

      expect(errorHandler).toHaveBeenCalled()
      expect(normalHandler).toHaveBeenCalled()
    })
  })

  describe('listenerCount', () => {
    it('should return 0 for event with no listeners', () => {
      expect(emitter.listenerCount('test')).toBe(0)
    })

    it('should return correct count after adding listeners', () => {
      emitter.on('test', vi.fn())
      emitter.on('test', vi.fn())

      expect(emitter.listenerCount('test')).toBe(2)
    })

    it('should return 0 after removing all listeners', () => {
      emitter.on('test', vi.fn())
      emitter.off('test')

      expect(emitter.listenerCount('test')).toBe(0)
    })
  })

  describe('eventNames', () => {
    it('should return empty array when no listeners', () => {
      expect(emitter.eventNames()).toEqual([])
    })

    it('should return all event names with listeners', () => {
      emitter.on('test', vi.fn())
      emitter.on('numeric', vi.fn())

      const names = emitter.eventNames()

      expect(names).toContain('test')
      expect(names).toContain('numeric')
      expect(names).toHaveLength(2)
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all listeners', () => {
      emitter.on('test', vi.fn())
      emitter.on('numeric', vi.fn())

      emitter.removeAllListeners()

      expect(emitter.listenerCount('test')).toBe(0)
      expect(emitter.listenerCount('numeric')).toBe(0)
      expect(emitter.eventNames()).toEqual([])
    })
  })
})
