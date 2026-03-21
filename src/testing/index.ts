/**
 * Testing utilities
 *
 * @module testing
 */

export {
  waitForCondition,
  waitForResult,
  waitForDefined,
  waitForValue,
  type WaitForOptions,
  type WaitForValueOptions,
} from './waitFor'
export {
  isE2EMode,
  getE2EEmit,
  getEventBridge,
  setListenersReady,
  type E2EEmitFn,
} from './e2eHarness'

/**
 * Create a deferred promise that can be resolved externally
 *
 * Useful for testing async operations where you need to control when a promise resolves.
 *
 * @returns Object with promise, resolve, and reject functions
 *
 * @example
 * ```typescript
 * const { promise, resolve, reject } = createDeferred<string>()
 *
 * // Later in test:
 * resolve('success')
 * // or:
 * reject(new Error('failed'))
 *
 * await expect(promise).resolves.toBe('success')
 * ```
 */
export function createDeferred<T = void>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}
