/**
 * Async condition waiting utilities for tests
 *
 * Provides helpers for waiting for conditions in async tests,
 * replacing arbitrary timeouts with polling.
 *
 * @module testing/waitFor
 */

/**
 * Options for waitForCondition
 */
export interface WaitForOptions {
  /** Maximum time to wait in milliseconds */
  timeout?: number
  /** Interval between checks in milliseconds */
  interval?: number
  /** Error message when timeout is reached */
  errorMessage?: string
}

/**
 * Options for waitForValue
 */
export interface WaitForValueOptions<T> extends WaitForOptions {
  /** Custom predicate to determine if the value is ready */
  predicate?: (value: T) => boolean
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<WaitForOptions> = {
  timeout: 5000,
  interval: 50,
  errorMessage: 'Condition not met within timeout',
}

/**
 * Wait for a condition to be true
 *
 * Polls the condition function at regular intervals until it returns true,
 * or until the timeout is reached.
 *
 * @param condition - Function that returns true when condition is met
 * @param options - Wait options
 * @returns Promise that resolves when condition is met
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * // Wait for element to be visible
 * await waitForCondition(
 *   () => document.querySelector('.modal')?.classList.contains('visible'),
 *   { timeout: 2000 }
 * )
 *
 * // Wait for API response
 * await waitForCondition(
 *   () => apiCallComplete === true,
 *   { timeout: 5000, interval: 100 }
 * )
 * ```
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: WaitForOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()

  while (true) {
    const result = await condition()

    if (result) {
      return
    }

    if (Date.now() - startTime >= opts.timeout) {
      throw new Error(opts.errorMessage)
    }

    await new Promise((resolve) => setTimeout(resolve, opts.interval))
  }
}

/**
 * Wait for a condition to be true, returning the result
 *
 * Like waitForCondition but returns the final result instead of void.
 *
 * @param condition - Function that returns T when condition is met
 * @param options - Wait options
 * @returns Promise that resolves with the result when condition is met
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * const element = await waitForResult(
 *   () => document.querySelector('.loaded') as HTMLElement | null,
 *   { timeout: 3000 }
 * )
 * ```
 */
export async function waitForResult<T>(
  condition: () => T | Promise<T>,
  options: WaitForOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()

  while (true) {
    const result = await condition()

    if (result) {
      return result
    }

    if (Date.now() - startTime >= opts.timeout) {
      throw new Error(opts.errorMessage)
    }

    await new Promise((resolve) => setTimeout(resolve, opts.interval))
  }
}

/**
 * Wait for a value to not be undefined/null
 *
 * Shortcut for waiting for optional values to be defined.
 *
 * @param getter - Function that returns the value
 * @param options - Wait options
 * @returns Promise that resolves with the value when defined
 *
 * @example
 * ```typescript
 * const user = await waitForDefined(
 *   () => cachedUser,
 *   { timeout: 2000 }
 * )
 * ```
 */
export async function waitForDefined<T>(
  getter: () => T | undefined | null,
  options: WaitForOptions = {}
): Promise<T> {
  return waitForResult(
    () => {
      const value = getter()
      return value ?? undefined
    },
    { ...options, errorMessage: options.errorMessage ?? 'Value never became defined' }
  ) as Promise<T>
}

/**
 * Wait for a value to match a specific expected value or predicate
 *
 * Unlike waitForResult which treats any falsy value as "not ready",
 * this function allows waiting for specific values including falsy ones
 * like `false`, `0`, or `''`.
 *
 * @param getter - Function that returns the value to check
 * @param expected - Expected value or predicate function
 * @param options - Wait options
 * @returns Promise that resolves with the value when it matches
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * // Wait for a toggle to become false
 * const result = await waitForValue(
 *   () => settings.autoSave,
 *   false,
 *   { timeout: 3000 }
 * )
 *
 * // Wait for count to reach specific number
 * const count = await waitForValue(
 *   () => notifications.length,
 *   5,
 *   { timeout: 5000 }
 * )
 *
 * // Wait using custom predicate
 * const item = await waitForValue(
 *   () => getListItem(id),
 *   (item) => item?.status === 'ready',
 *   { timeout: 2000 }
 * )
 * ```
 */
export async function waitForValue<T>(
  getter: () => T,
  expected: T | ((value: T) => boolean),
  options: WaitForValueOptions<T> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const predicate =
    typeof expected === 'function'
      ? (expected as (value: T) => boolean)
      : (value: T) => value === expected

  const startTime = Date.now()

  while (true) {
    const result = getter()

    if (predicate(result)) {
      return result
    }

    if (Date.now() - startTime >= opts.timeout) {
      const expectedStr =
        typeof expected === 'function' ? 'predicate to match' : `value ${JSON.stringify(expected)}`
      throw new Error(
        opts.errorMessage ??
          `Expected ${expectedStr} within ${opts.timeout}ms, got ${JSON.stringify(result)}`
      )
    }

    await new Promise((resolve) => setTimeout(resolve, opts.interval))
  }
}
