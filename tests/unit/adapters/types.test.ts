/**
 * Adapter Types unit tests
 */

import { describe, it, expect } from 'vitest'
import { AdapterNotSupportedError } from '@/adapters/types'

describe('AdapterNotSupportedError', () => {
  it('should create error with operation and adapter name', () => {
    const error = new AdapterNotSupportedError('subscribe', 'JsSIP Adapter')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AdapterNotSupportedError)
    expect(error.name).toBe('AdapterNotSupportedError')
    expect(error.operation).toBe('subscribe')
    expect(error.adapterName).toBe('JsSIP Adapter')
    expect(error.suggestion).toBeUndefined()
    expect(error.message).toBe('subscribe is not supported by JsSIP Adapter')
  })

  it('should create error with suggestion', () => {
    const error = new AdapterNotSupportedError(
      'publish',
      'JsSIP Adapter',
      'Use a custom implementation instead.'
    )

    expect(error.operation).toBe('publish')
    expect(error.adapterName).toBe('JsSIP Adapter')
    expect(error.suggestion).toBe('Use a custom implementation instead.')
    expect(error.message).toBe(
      'publish is not supported by JsSIP Adapter. Use a custom implementation instead.'
    )
  })

  it('should be catchable as Error', () => {
    const error = new AdapterNotSupportedError('unsubscribe', 'TestAdapter')

    try {
      throw error
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect((e as Error).message).toContain('unsubscribe')
    }
  })

  it('should be identifiable by instanceof', () => {
    const error = new AdapterNotSupportedError('subscribe', 'TestAdapter')

    expect(error instanceof AdapterNotSupportedError).toBe(true)
    expect(error instanceof Error).toBe(true)
  })

  it('should have readonly properties', () => {
    const error = new AdapterNotSupportedError(
      'publish',
      'CustomAdapter',
      'Try alternative approach'
    )

    // Properties should be accessible
    expect(error.operation).toBe('publish')
    expect(error.adapterName).toBe('CustomAdapter')
    expect(error.suggestion).toBe('Try alternative approach')

    // TypeScript won't allow assignment, but we verify the values are correct
    expect(typeof error.operation).toBe('string')
    expect(typeof error.adapterName).toBe('string')
    expect(typeof error.suggestion).toBe('string')
  })

  it('should work in async/await context', async () => {
    const asyncOperation = async (): Promise<void> => {
      throw new AdapterNotSupportedError('subscribe', 'AsyncAdapter', 'Not implemented for async')
    }

    await expect(asyncOperation()).rejects.toThrow(AdapterNotSupportedError)
    await expect(asyncOperation()).rejects.toThrow('subscribe is not supported by AsyncAdapter')
  })

  it('should preserve stack trace', () => {
    const error = new AdapterNotSupportedError('test', 'TestAdapter')

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('AdapterNotSupportedError')
  })
})
