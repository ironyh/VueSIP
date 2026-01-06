import { describe, it, expect, vi } from 'vitest'
import {
  createAbortError,
  isAbortError,
  abortableSleep,
  throwIfAborted,
} from '@/utils/abortController'

describe('abortController utils', () => {
  it('createAbortError returns DOMException with AbortError name', () => {
    const err = createAbortError('Stopped')
    expect(err).toBeInstanceOf(DOMException)
    expect(err.name).toBe('AbortError')
    expect(err.message).toBe('Stopped')
  })

  it('isAbortError detects abort errors', () => {
    const abortErr = createAbortError()
    const otherErr = new Error('nope')
    expect(isAbortError(abortErr)).toBe(true)
    expect(isAbortError(otherErr)).toBe(false)
  })

  it('abortableSleep resolves after timeout', async () => {
    vi.useFakeTimers()
    const promise = abortableSleep(100)
    await vi.advanceTimersByTimeAsync(100)
    await expect(promise).resolves.toBeUndefined()
    vi.useRealTimers()
  })

  it('abortableSleep rejects immediately when already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(abortableSleep(100, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('abortableSleep rejects when aborted after start', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const promise = abortableSleep(1000, controller.signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    vi.useRealTimers()
  })

  it('throwIfAborted throws only when aborted', () => {
    const controller = new AbortController()
    expect(() => throwIfAborted(controller.signal)).not.toThrow()
    controller.abort()
    expect(() => throwIfAborted(controller.signal)).toThrowError(/AbortError|abort/i)
  })
})

