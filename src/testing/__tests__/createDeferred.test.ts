import { describe, it, expect } from 'vitest'
import { createDeferred } from '../index'

describe('createDeferred', () => {
  it('should create a deferred promise', () => {
    const { promise, resolve } = createDeferred<string>()

    expect(promise).toBeInstanceOf(Promise)
    expect(typeof resolve).toBe('function')
  })

  it('should resolve with a value', async () => {
    const { promise, resolve } = createDeferred<string>()

    resolve('test value')

    await expect(promise).resolves.toBe('test value')
  })

  it('should reject with an error', async () => {
    const { promise, reject } = createDeferred<string>()

    reject(new Error('test error'))

    await expect(promise).rejects.toThrow('test error')
  })

  it('should work with void type', async () => {
    const { promise, resolve } = createDeferred()

    resolve()

    await expect(promise).resolves.toBeUndefined()
  })

  it('should work with object type', async () => {
    const { promise, resolve } = createDeferred<{ id: number; name: string }>()

    resolve({ id: 1, name: 'test' })

    await expect(promise).resolves.toEqual({ id: 1, name: 'test' })
  })

  it('should handle resolve being called multiple times', async () => {
    const { promise, resolve } = createDeferred<string>()

    resolve('first')
    resolve('second') // Should have no effect after first resolve

    await expect(promise).resolves.toBe('first')
  })
})
