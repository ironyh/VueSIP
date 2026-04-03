/**
 * Unit tests for useErrorBoundary composable
 *
 * Tests error handling, classification, recovery options, retry logic,
 * and global error event listeners.
 *
 * @module composables/useErrorBoundary.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useErrorBoundary } from '@/composables/useErrorBoundary'
import type { RecoveryOption } from '@/composables/useErrorBoundary'

// Mock the error utilities
vi.mock('@/utils/errorContext', () => ({
  ErrorSeverity: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
  createErrorContext: vi.fn(),
  logErrorWithContext: vi.fn(),
}))

vi.mock('@/utils/errorHelpers', () => ({
  formatUnknownError: vi.fn((error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'UnknownError',
    stack: error instanceof Error ? error.stack : undefined,
  })),
}))

describe('useErrorBoundary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with no error', () => {
      const { hasError, error, errorInfo, retryCount, isRetrying, isDismissing } =
        useErrorBoundary()

      expect(hasError.value).toBe(false)
      expect(error.value).toBe(null)
      expect(errorInfo.value).toBe(null)
      expect(retryCount.value).toBe(0)
      expect(isRetrying.value).toBe(false)
      expect(isDismissing.value).toBe(false)
    })

    it('should initialize with empty recovery options', () => {
      const { recoveryOptions } = useErrorBoundary()
      expect(recoveryOptions.value).toEqual([])
    })

    it('should initialize classification flags as false', () => {
      const {
        isPermissionError,
        isNetworkError,
        isTimeoutError,
        isSessionError,
        isRecoverableError,
      } = useErrorBoundary()

      expect(isPermissionError.value).toBe(false)
      expect(isNetworkError.value).toBe(false)
      expect(isTimeoutError.value).toBe(false)
      expect(isSessionError.value).toBe(false)
      // Initially false (no error yet, shouldRetry hasn't been called)
      expect(isRecoverableError.value).toBe(false)
    })
  })

  describe('handleError', () => {
    it('should set error state when handling an Error', () => {
      const { handleError, hasError, error } = useErrorBoundary()

      const testError = new Error('Test error')
      handleError(testError)

      expect(hasError.value).toBe(true)
      expect(error.value).toBe(testError)
    })

    it('should set error state when handling a non-Error value', () => {
      const { handleError, hasError, error } = useErrorBoundary()

      handleError('string error')

      expect(hasError.value).toBe(true)
      expect(error.value).toBe('string error')
    })

    it('should set errorInfo from formatUnknownError', () => {
      const { handleError, errorInfo } = useErrorBoundary()

      const testError = new Error('Test error')
      testError.name = 'TestError'
      handleError(testError)

      expect(errorInfo.value).toBeDefined()
      expect(errorInfo.value?.message).toBe('Test error')
      expect(errorInfo.value?.name).toBe('TestError')
    })

    it('should pass context to error logging', async () => {
      const { handleError } = useErrorBoundary()

      const testError = new Error('Test error')
      const context = { filename: 'test.ts', lineno: 42 }
      handleError(testError, context)

      const { createErrorContext } = await import('@/utils/errorContext')
      expect(createErrorContext).toHaveBeenCalled()
    })

    it('should set isRecoverableError to true by default after handling an error', () => {
      const { handleError, isRecoverableError } = useErrorBoundary()

      handleError(new Error('Test'))

      expect(isRecoverableError.value).toBe(true)
    })

    it('should not set isRecoverableError when recovery is disabled', () => {
      const { handleError, isRecoverableError } = useErrorBoundary({
        enableRecovery: false,
      })

      handleError(new Error('Test'))

      expect(isRecoverableError.value).toBe(false)
    })

    it('should respect custom shouldRetry function', () => {
      const { handleError, clearError, isRecoverableError } = useErrorBoundary({
        shouldRetry: (err) => err instanceof Error && err.message.includes('retryable'),
      })

      handleError(new Error('generic error'))
      expect(isRecoverableError.value).toBe(false)

      clearError()
      handleError(new Error('retryable error'))
      expect(isRecoverableError.value).toBe(true)
    })
  })

  describe('clearError', () => {
    it('should reset all error state', () => {
      const { handleError, clearError, hasError, error, errorInfo, retryCount } = useErrorBoundary()

      handleError(new Error('Test error'))
      expect(hasError.value).toBe(true)

      clearError()

      expect(hasError.value).toBe(false)
      expect(error.value).toBe(null)
      expect(errorInfo.value).toBe(null)
      expect(retryCount.value).toBe(0)
    })

    it('should reset isRetrying and isDismissing flags', () => {
      const { clearError, state } = useErrorBoundary()
      clearError()
      expect(state.isRetrying).toBe(false)
      expect(state.isDismissing).toBe(false)
    })
  })

  describe('retry', () => {
    it('should clear error if no error is active', async () => {
      const { retry, hasError } = useErrorBoundary()
      await retry()
      expect(hasError.value).toBe(false)
    })

    it('should execute retry/refresh recovery option and clear error on success', async () => {
      const retryAction = vi.fn().mockResolvedValue(undefined)
      const { handleError, retry, addRecoveryOption, hasError } = useErrorBoundary()

      addRecoveryOption({ label: 'Retry Operation', action: retryAction })

      handleError(new Error('Test error'))
      await retry()

      expect(retryAction).toHaveBeenCalled()
      expect(hasError.value).toBe(false)
    })

    it('should execute refresh-labeled recovery option', async () => {
      const refreshAction = vi.fn().mockResolvedValue(undefined)
      const { handleError, retry, addRecoveryOption, hasError } = useErrorBoundary()

      addRecoveryOption({ label: 'Refresh Page', action: refreshAction })

      handleError(new Error('Test error'))
      await retry()

      expect(refreshAction).toHaveBeenCalled()
      expect(hasError.value).toBe(false)
    })

    it('should handle retry action failure', async () => {
      const retryAction = vi.fn().mockRejectedValue(new Error('Retry failed'))
      const { handleError, retry, addRecoveryOption, hasError, error } = useErrorBoundary({
        maxRetries: 3,
      })

      addRecoveryOption({ label: 'Retry', action: retryAction })

      handleError(new Error('Original error'))
      await retry()

      expect(hasError.value).toBe(true)
      expect(error.value).toBeInstanceOf(Error)
    })

    it('should not retry when recovery is disabled', async () => {
      const { handleError, retry, hasError } = useErrorBoundary({ enableRecovery: false })

      handleError(new Error('Test'))
      await retry()

      expect(hasError.value).toBe(false)
    })
  })

  describe('dismiss', () => {
    it('should set isDismissing to true initially', () => {
      const { handleError, dismiss, isDismissing } = useErrorBoundary()

      handleError(new Error('Test error'))
      dismiss()

      expect(isDismissing.value).toBe(true)
    })

    it('should clear error after animation timeout', () => {
      const { handleError, dismiss, hasError, isDismissing } = useErrorBoundary()

      handleError(new Error('Test error'))
      dismiss()

      expect(hasError.value).toBe(true)

      vi.advanceTimersByTime(300)

      expect(hasError.value).toBe(false)
      expect(isDismissing.value).toBe(false)
    })
  })

  describe('recoveryOptions', () => {
    it('should add a recovery option', () => {
      const { addRecoveryOption, recoveryOptions } = useErrorBoundary()

      const option: RecoveryOption = { label: 'Retry', action: () => {} }
      addRecoveryOption(option)

      expect(recoveryOptions.value).toHaveLength(1)
      expect(recoveryOptions.value[0].label).toBe('Retry')
    })

    it('should update existing recovery option with same label', () => {
      const { addRecoveryOption, recoveryOptions } = useErrorBoundary()

      addRecoveryOption({ label: 'Retry', action: () => {} })
      addRecoveryOption({ label: 'Retry', action: () => {}, primary: true })

      expect(recoveryOptions.value).toHaveLength(1)
      expect(recoveryOptions.value[0].primary).toBe(true)
    })

    it('should remove a recovery option', () => {
      const { addRecoveryOption, removeRecoveryOption, recoveryOptions } = useErrorBoundary()

      addRecoveryOption({ label: 'Retry', action: () => {} })
      addRecoveryOption({ label: 'Dismiss', action: () => {} })

      expect(recoveryOptions.value).toHaveLength(2)

      removeRecoveryOption('Retry')

      expect(recoveryOptions.value).toHaveLength(1)
      expect(recoveryOptions.value[0].label).toBe('Dismiss')
    })

    it('should handle removing non-existent option gracefully', () => {
      const { removeRecoveryOption, recoveryOptions } = useErrorBoundary()

      removeRecoveryOption('NonExistent')

      expect(recoveryOptions.value).toHaveLength(0)
    })
  })

  describe('error classification - permission errors', () => {
    it('should classify NotAllowedError as permission error', () => {
      const { handleError, isPermissionError } = useErrorBoundary()

      const err = new Error('denied')
      err.name = 'NotAllowedError'
      handleError(err)

      expect(isPermissionError.value).toBe(true)
    })

    it('should classify SecurityError as permission error', () => {
      const { handleError, isPermissionError } = useErrorBoundary()

      const err = new Error('security')
      err.name = 'SecurityError'
      handleError(err)

      expect(isPermissionError.value).toBe(true)
    })

    it('should classify PermissionDeniedError as permission error', () => {
      const { handleError, isPermissionError } = useErrorBoundary()

      const err = new Error('denied')
      err.name = 'PermissionDeniedError'
      handleError(err)

      expect(isPermissionError.value).toBe(true)
    })

    it('should not classify non-Error values as permission errors', () => {
      const { handleError, isPermissionError } = useErrorBoundary()

      handleError('string error')

      expect(isPermissionError.value).toBe(false)
    })
  })

  describe('error classification - network errors', () => {
    it('should classify NetworkError as network error', () => {
      const { handleError, isNetworkError } = useErrorBoundary()

      const err = new Error('network failure')
      err.name = 'NetworkError'
      handleError(err)

      expect(isNetworkError.value).toBe(true)
    })

    it('should classify connection message as network error', () => {
      const { handleError, isNetworkError } = useErrorBoundary()

      handleError(new Error('connection refused'))

      expect(isNetworkError.value).toBe(true)
    })

    it('should classify fetch message as network error', () => {
      const { handleError, isNetworkError } = useErrorBoundary()

      handleError(new Error('fetch failed'))

      expect(isNetworkError.value).toBe(true)
    })

    it('should classify TypeError as network error', () => {
      const { handleError, isNetworkError } = useErrorBoundary()

      const err = new TypeError('type error')
      handleError(err)

      expect(isNetworkError.value).toBe(true)
    })

    it('should not classify non-Error values as network errors', () => {
      const { handleError, isNetworkError } = useErrorBoundary()

      handleError(42)

      expect(isNetworkError.value).toBe(false)
    })
  })

  describe('error classification - timeout errors', () => {
    it('should classify TimeoutError as timeout error', () => {
      const { handleError, isTimeoutError } = useErrorBoundary()

      const err = new Error('timed out')
      err.name = 'TimeoutError'
      handleError(err)

      expect(isTimeoutError.value).toBe(true)
    })

    it('should classify AbortError as timeout error', () => {
      const { handleError, isTimeoutError } = useErrorBoundary()

      const err = new Error('aborted')
      err.name = 'AbortError'
      handleError(err)

      expect(isTimeoutError.value).toBe(true)
    })

    it('should classify timeout message as timeout error', () => {
      const { handleError, isTimeoutError } = useErrorBoundary()

      handleError(new Error('request timeout'))

      expect(isTimeoutError.value).toBe(true)
    })

    it('should classify deadline exceeded message as timeout error', () => {
      const { handleError, isTimeoutError } = useErrorBoundary()

      handleError(new Error('deadline exceeded'))

      expect(isTimeoutError.value).toBe(true)
    })

    it('should classify timed out message as timeout error', () => {
      const { handleError, isTimeoutError } = useErrorBoundary()

      handleError(new Error('operation timed out'))

      expect(isTimeoutError.value).toBe(true)
    })

    it('should not classify non-Error values as timeout errors', () => {
      const { handleError, isTimeoutError } = useErrorBoundary()

      handleError({ custom: 'error' })

      expect(isTimeoutError.value).toBe(false)
    })
  })

  describe('error classification - session errors', () => {
    it('should classify ServerError name as session error', () => {
      const { handleError, isSessionError } = useErrorBoundary()

      const err = new Error('server error')
      err.name = 'ServerError'
      handleError(err)

      expect(isSessionError.value).toBe(true)
    })

    it('should classify invite message as session error', () => {
      const { handleError, isSessionError } = useErrorBoundary()

      handleError(new Error('invite failed'))

      expect(isSessionError.value).toBe(true)
    })

    it('should classify session message as session error', () => {
      const { handleError, isSessionError } = useErrorBoundary()

      handleError(new Error('session expired'))

      expect(isSessionError.value).toBe(true)
    })

    it('should not classify non-Error values as session errors', () => {
      const { handleError, isSessionError } = useErrorBoundary()

      handleError(undefined)

      expect(isSessionError.value).toBe(false)
    })
  })

  describe('multiple sequential errors', () => {
    it('should update state when handling multiple errors', () => {
      const { handleError, hasError, error, clearError } = useErrorBoundary()

      handleError(new Error('First error'))
      expect(hasError.value).toBe(true)
      expect((error.value as Error).message).toBe('First error')

      clearError()
      expect(hasError.value).toBe(false)

      handleError(new Error('Second error'))
      expect(hasError.value).toBe(true)
      expect((error.value as Error).message).toBe('Second error')
    })
  })

  describe('state reactivity', () => {
    it('should expose reactive state object', () => {
      const { state, handleError } = useErrorBoundary()

      expect(state.hasError).toBe(false)

      handleError(new Error('Test'))

      expect(state.hasError).toBe(true)
    })

    it('should update state.error on handleError', () => {
      const { state, handleError } = useErrorBoundary()

      const testError = new Error('State test')
      handleError(testError)

      expect(state.error).toBe(testError)
    })
  })

  describe('isRecoverableError', () => {
    it('should be false when recovery is disabled', () => {
      const { handleError, isRecoverableError } = useErrorBoundary({ enableRecovery: false })

      handleError(new Error('Test'))

      expect(isRecoverableError.value).toBe(false)
    })

    it('should be false when shouldRetry returns false', () => {
      const { handleError, isRecoverableError } = useErrorBoundary({
        shouldRetry: () => false,
      })

      handleError(new Error('Test'))

      expect(isRecoverableError.value).toBe(false)
    })

    it('should be true by default when error occurs', () => {
      const { handleError, isRecoverableError } = useErrorBoundary()

      handleError(new Error('Test'))

      expect(isRecoverableError.value).toBe(true)
    })
  })
})
