import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAbortError, isAbortError, abortableSleep, throwIfAborted } from '../abortController'

describe('abortController', () => {
  describe('createAbortError', () => {
    it('should create DOMException with AbortError name', () => {
      const error = createAbortError()
      expect(error).toBeInstanceOf(DOMException)
      expect(error.name).toBe('AbortError')
    })

    it('should use custom message when provided', () => {
      const error = createAbortError('Custom abort message')
      expect(error.message).toBe('Custom abort message')
      expect(error.name).toBe('AbortError')
    })
  })

  describe('isAbortError', () => {
    it('should return true for AbortError DOMException', () => {
      const error = createAbortError()
      expect(isAbortError(error)).toBe(true)
    })

    it('should return false for non-DOMException errors', () => {
      expect(isAbortError(new Error('regular error'))).toBe(false)
      expect(isAbortError('string error')).toBe(false)
      expect(isAbortError(null)).toBe(false)
      expect(isAbortError(undefined)).toBe(false)
    })

    it('should return false for DOMException with different name', () => {
      const error = new DOMException('Not abort', 'NotSupportedError')
      expect(isAbortError(error)).toBe(false)
    })
  })

  describe('abortableSleep', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should resolve after specified duration', async () => {
      const promise = abortableSleep(1000)

      vi.advanceTimersByTime(1000)

      await expect(promise).resolves.toBeUndefined()
    })

    it('should reject when already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      const promise = abortableSleep(1000, controller.signal)

      await expect(promise).rejects.toThrow()
      expect(isAbortError(await promise.catch((e) => e))).toBe(true)
    })

    it('should reject when aborted during sleep', async () => {
      const controller = new AbortController()
      const promise = abortableSleep(1000, controller.signal)

      vi.advanceTimersByTime(500)
      controller.abort()

      await expect(promise).rejects.toThrow()
      expect(isAbortError(await promise.catch((e) => e))).toBe(true)
    })

    it('should not reject if already resolved', async () => {
      const controller = new AbortController()
      const promise = abortableSleep(100, controller.signal)

      vi.advanceTimersByTime(100)
      await expect(promise).resolves.toBeUndefined()

      // Abort after resolution should not cause issues
      controller.abort()

      // Should still resolve, not reject
      await expect(promise).resolves.toBeUndefined()
    })
  })

  describe('throwIfAborted', () => {
    it('should not throw when signal is not provided', () => {
      expect(() => throwIfAborted()).not.toThrow()
      expect(() => throwIfAborted(undefined)).not.toThrow()
    })

    it('should not throw when signal is not aborted', () => {
      const controller = new AbortController()
      expect(() => throwIfAborted(controller.signal)).not.toThrow()
    })

    it('should throw abort error when signal is already aborted', () => {
      const controller = new AbortController()
      controller.abort()

      expect(() => throwIfAborted(controller.signal)).toThrow()
      expect(() => throwIfAborted(controller.signal)).toThrow(DOMException)
    })
  })
})
