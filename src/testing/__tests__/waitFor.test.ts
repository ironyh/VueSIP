/**
 * Testing Utilities Unit Tests
 *
 * @group testing
 * @group waitFor
 */

import { describe, expect, test, vi } from 'vitest'
import { waitForCondition, waitForResult, waitForDefined } from '../waitFor'

describe('waitForCondition', () => {
  test('resolves immediately when condition is true', async () => {
    const condition = vi.fn().mockReturnValue(true)

    await expect(waitForCondition(condition)).resolves.toBeUndefined()

    expect(condition).toHaveBeenCalledTimes(1)
  })

  test('polls until condition returns true', async () => {
    let callCount = 0
    const condition = vi.fn().mockImplementation(() => {
      callCount++
      return callCount >= 3
    })

    await expect(
      waitForCondition(condition, { timeout: 1000, interval: 50 })
    ).resolves.toBeUndefined()

    expect(condition).toHaveBeenCalledTimes(3)
  })

  test('throws error on timeout', async () => {
    const condition = vi.fn().mockReturnValue(false)

    await expect(
      waitForCondition(condition, { timeout: 100, interval: 10, errorMessage: 'Custom timeout' })
    ).rejects.toThrow('Custom timeout')
  })

  test('supports async condition functions', async () => {
    let resolveCount = 0
    const condition = vi.fn().mockImplementation(async () => {
      resolveCount++
      return resolveCount >= 2
    })

    await expect(waitForCondition(condition, { timeout: 1000 })).resolves.toBeUndefined()
  })

  test('uses custom interval', async () => {
    const condition = vi.fn().mockReturnValue(false)

    await expect(waitForCondition(condition, { timeout: 200, interval: 50 })).rejects.toThrow()
  })
})

describe('waitForResult', () => {
  test('returns result when condition returns truthy value', async () => {
    const condition = vi.fn().mockReturnValue('success')

    const result = await waitForResult(condition)

    expect(result).toBe('success')
  })

  test('returns result from async condition', async () => {
    const condition = vi.fn().mockResolvedValue('async-result')

    const result = await waitForResult(condition)

    expect(result).toBe('async-result')
  })

  test('polls until truthy result', async () => {
    let callCount = 0
    const condition = vi.fn().mockImplementation(() => {
      callCount++
      return callCount >= 2 ? 'found' : ''
    })

    const result = await waitForResult(condition, { timeout: 1000, interval: 50 })

    expect(result).toBe('found')
    expect(condition).toHaveBeenCalledTimes(2)
  })

  test('throws on timeout with falsy results', async () => {
    const condition = vi.fn().mockReturnValue(null)

    await expect(
      waitForResult(condition, { timeout: 100, interval: 10, errorMessage: 'Never found' })
    ).rejects.toThrow('Never found')
  })
})

describe('waitForDefined', () => {
  test('returns value when already defined', async () => {
    const getter = vi.fn().mockReturnValue('defined-value')

    const result = await waitForDefined(getter)

    expect(result).toBe('defined-value')
  })

  test('waits for value to become defined', async () => {
    let callCount = 0
    const getter = vi.fn().mockImplementation(() => {
      callCount++
      return callCount >= 2 ? 'eventually-defined' : null
    })

    const result = await waitForDefined(getter, { timeout: 1000, interval: 50 })

    expect(result).toBe('eventually-defined')
  })

  test('works with undefined as "not defined"', async () => {
    let callCount = 0
    const getter = vi.fn().mockImplementation(() => {
      callCount++
      return callCount >= 2 ? 'defined' : undefined
    })

    const result = await waitForDefined(getter)

    expect(result).toBe('defined')
  })

  test('throws custom error message on timeout', async () => {
    const getter = vi.fn().mockReturnValue(null)

    await expect(
      waitForDefined(getter, { timeout: 100, errorMessage: 'Value never defined' })
    ).rejects.toThrow('Value never defined')
  })

  test('uses default error message when not provided', async () => {
    const getter = vi.fn().mockReturnValue(null)

    await expect(waitForDefined(getter, { timeout: 100 })).rejects.toThrow(
      'Value never became defined'
    )
  })
})
