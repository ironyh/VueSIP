/**
 * waitForCondition - Async helper utility for condition-based polling in tests
 * 
 * Polls a condition function until it returns a truthy value or timeout is reached.
 * This replaces arbitrary timeout waits with reliable condition-based testing.
 * 
 * @param conditionFn - Async function that returns truthy when condition is met
 * @param options - Configuration options
 * @param options.timeout - Maximum time to wait in ms (default: 5000)
 * @param options.interval - Time between polling attempts in ms (default: 50)
 * @param options.onTimeout - Optional callback when timeout occurs
 * @returns The truthy value returned by conditionFn
 * @throws Error if timeout is reached and no onTimeout is provided
 * 
 * @example
 * // Basic usage
 * await waitForCondition(async () => element.isVisible());
 * 
 * @example
 * // With custom timeout and onTimeout
 * await waitForCondition(
 *   async () => data.isLoaded,
 *   { timeout: 10000, onTimeout: () => console.warn('Timed out!') }
 * );
 */
export async function waitForCondition<T>(
  conditionFn: () => Promise<T>,
  options: {
    timeout?: number;
    interval?: number;
    onTimeout?: () => void | Promise<void>;
  } = {}
): Promise<T> {
  const {
    timeout = 5000,
    interval = 50,
    onTimeout
  } = options;

  const startTime = Date.now();

  while (true) {
    const result = await conditionFn();
    
    if (result) {
      return result;
    }

    if (Date.now() - startTime >= timeout) {
      if (onTimeout) {
        await onTimeout();
        // Return last result even on timeout if onTimeout handles it
        return result;
      }
      throw new Error(`waitForCondition timed out after ${timeout}ms`);
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * waitForTrue - Shorthand for waiting for a boolean condition
 * 
 * @param conditionFn - Async function that returns boolean
 * @param options - waitForCondition options
 * @returns Promise that resolves when condition returns true
 */
export async function waitForTrue(
  conditionFn: () => Promise<boolean>,
  options?: {
    timeout?: number;
    interval?: number;
    onTimeout?: () => void | Promise<void>;
  }
): Promise<boolean> {
  return waitForCondition(async () => {
    const result = await conditionFn();
    return result === true;
  }, options);
}
