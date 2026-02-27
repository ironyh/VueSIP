/**
 * useCredentialExpiry composable unit tests
 *
 * Tests for credential expiry detection, auth failure handling,
 * and re-authentication flow hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCredentialExpiry } from '@/composables/useCredentialExpiry'
import { CREDENTIAL_EXPIRY_CONSTANTS } from '@/composables/constants'
import { withSetup } from '../../utils/test-helpers'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

/**
 * Create a mock registration composable
 */
function createMockRegistration(
  overrides?: Partial<{
    lastError: ReturnType<typeof ref<string | null>>
    isExpiringSoon: ReturnType<typeof ref<boolean>>
    hasExpired: ReturnType<typeof ref<boolean>>
    register: ReturnType<typeof vi.fn>
  }>
) {
  return {
    lastError: ref<string | null>(null),
    isExpiringSoon: ref(false),
    hasExpired: ref(false),
    register: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

/**
 * Create a mock notifications composable
 */
function createMockNotifications() {
  return {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}

describe('useCredentialExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have valid credential status initially', () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.credentialStatus.value).toBe('valid')
      unmount()
    })

    it('should have isAuthRequired as false initially', () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.isAuthRequired.value).toBe(false)
      unmount()
    })

    it('should have lastAuthError as null initially', () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.lastAuthError.value).toBeNull()
      unmount()
    })

    it('should have authFailureCount as 0 initially', () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.authFailureCount.value).toBe(0)
      unmount()
    })

    it('should have canAutoRefresh as false when no callback provided', () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.canAutoRefresh.value).toBe(false)
      unmount()
    })

    it('should have canAutoRefresh as true when onRefreshCredentials provided', () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onRefreshCredentials: async () => ({ username: 'test', password: 'test' }),
        })
      )

      expect(result.canAutoRefresh.value).toBe(true)
      unmount()
    })
  })

  describe('401 Unauthorized Detection', () => {
    it('should detect 401 error code in error message', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // Trigger error
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(result.isAuthRequired.value).toBe(true)
      expect(result.lastAuthError.value).toBe('Registration failed: 401 Unauthorized')
      expect(result.authFailureCount.value).toBe(1)
      unmount()
    })

    it('should detect "Unauthorized" text in error message', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      registration.lastError.value = 'SIP Unauthorized response received'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(result.isAuthRequired.value).toBe(true)
      unmount()
    })
  })

  describe('403 Forbidden Detection', () => {
    it('should detect 403 error code in error message', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      registration.lastError.value = 'Registration failed: 403 Forbidden'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(result.isAuthRequired.value).toBe(true)
      expect(result.lastAuthError.value).toBe('Registration failed: 403 Forbidden')
      unmount()
    })

    it('should detect "Forbidden" text in error message', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      registration.lastError.value = 'Access Forbidden - credentials expired'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(result.isAuthRequired.value).toBe(true)
      unmount()
    })
  })

  describe('Custom Auth Error Codes', () => {
    it('should detect custom auth error codes', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          authErrorCodes: [407, 423],
        })
      )

      registration.lastError.value = 'Proxy Authentication Required: 407'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(result.isAuthRequired.value).toBe(true)
      unmount()
    })

    it('should not detect non-auth errors', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      registration.lastError.value = 'Network timeout: 500 Internal Server Error'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('valid')
      expect(result.isAuthRequired.value).toBe(false)
      unmount()
    })
  })

  describe('onAuthRequired Callback', () => {
    it('should trigger onAuthRequired callback on auth failure', async () => {
      const registration = createMockRegistration()
      const onAuthRequired = vi.fn()
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onAuthRequired,
        })
      )

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(onAuthRequired).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should handle async onAuthRequired callback', async () => {
      const registration = createMockRegistration()
      const onAuthRequired = vi.fn().mockResolvedValue(undefined)
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onAuthRequired,
        })
      )

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(onAuthRequired).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should handle onAuthRequired callback errors gracefully', async () => {
      const registration = createMockRegistration()
      const onAuthRequired = vi.fn().mockRejectedValue(new Error('Callback error'))
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onAuthRequired,
        })
      )

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Should still update state despite callback error
      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(onAuthRequired).toHaveBeenCalledTimes(1)
      unmount()
    })

    it('should handle synchronous onAuthRequired callback errors gracefully', async () => {
      const registration = createMockRegistration()
      const onAuthRequired = vi.fn().mockImplementation(() => {
        throw new Error('Sync callback error')
      })
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onAuthRequired,
        })
      )

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Should still update state despite callback error
      expect(result.credentialStatus.value).toBe('auth-failed')
      unmount()
    })
  })

  describe('refreshCredentials Method', () => {
    it('should return false when no onRefreshCredentials callback provided', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      const success = await result.refreshCredentials()

      expect(success).toBe(false)
      unmount()
    })

    it('should refresh credentials and re-register on success', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn().mockResolvedValue({
        username: 'newuser',
        password: 'newpass',
      })
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onRefreshCredentials,
        })
      )

      // Set up auth-failed state first
      result.isAuthRequired.value = true
      result.lastAuthError.value = 'Previous error'
      result.authFailureCount.value = 2

      const success = await result.refreshCredentials()

      expect(success).toBe(true)
      expect(onRefreshCredentials).toHaveBeenCalledTimes(1)
      expect(registration.register).toHaveBeenCalledTimes(1)
      expect(result.credentialStatus.value).toBe('valid')
      expect(result.isAuthRequired.value).toBe(false)
      expect(result.lastAuthError.value).toBeNull()
      expect(result.authFailureCount.value).toBe(0)
      unmount()
    })

    it('should return false when onRefreshCredentials returns null', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn().mockResolvedValue(null)
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onRefreshCredentials,
        })
      )

      const success = await result.refreshCredentials()

      expect(success).toBe(false)
      expect(result.lastAuthError.value).toBe('Credential refresh failed: no credentials returned')
      expect(registration.register).not.toHaveBeenCalled()
      unmount()
    })

    it('should return false when onRefreshCredentials throws', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn().mockRejectedValue(new Error('Token refresh failed'))
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onRefreshCredentials,
        })
      )

      const success = await result.refreshCredentials()

      expect(success).toBe(false)
      expect(result.lastAuthError.value).toBe('Token refresh failed')
      unmount()
    })

    it('should return false when re-registration fails', async () => {
      const registration = createMockRegistration({
        register: vi.fn().mockRejectedValue(new Error('Re-registration failed')),
      })
      const onRefreshCredentials = vi.fn().mockResolvedValue({
        username: 'newuser',
        password: 'newpass',
      })
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onRefreshCredentials,
        })
      )

      const success = await result.refreshCredentials()

      expect(success).toBe(false)
      expect(result.lastAuthError.value).toBe('Re-registration failed')
      unmount()
    })

    it('should show success notification on successful refresh', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()
      const onRefreshCredentials = vi.fn().mockResolvedValue({
        username: 'newuser',
        password: 'newpass',
      })
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          notifications,
          onRefreshCredentials,
        })
      )

      await result.refreshCredentials()

      expect(notifications.success).toHaveBeenCalledWith(
        'Re-authenticated',
        'SIP credentials have been refreshed successfully.'
      )
      unmount()
    })
  })

  describe('isExpiringSoon Watcher', () => {
    it('should set status to expiring when registration is expiring soon', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.credentialStatus.value).toBe('valid')

      registration.isExpiringSoon.value = true
      await nextTick()

      expect(result.credentialStatus.value).toBe('expiring')
      unmount()
    })

    it('should show warning notification when expiring soon', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          notifications,
        })
      )

      registration.isExpiringSoon.value = true
      await nextTick()

      expect(notifications.warning).toHaveBeenCalledWith(
        'Credentials Expiring',
        'SIP registration is about to expire. Re-authentication may be required.',
        undefined
      )
      unmount()
    })

    it('should show warning notification with action when canAutoRefresh', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          notifications,
          onRefreshCredentials: async () => ({ username: 'test', password: 'test' }),
        })
      )

      registration.isExpiringSoon.value = true
      await nextTick()

      expect(notifications.warning).toHaveBeenCalledWith(
        'Credentials Expiring',
        'SIP registration is about to expire. Re-authentication may be required.',
        expect.objectContaining({
          label: 'Re-authenticate',
          handler: expect.any(Function),
        })
      )
      unmount()
    })

    it('should not change status if already auth-failed', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // First trigger auth failure
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')

      // Now trigger expiring soon - should not override auth-failed
      registration.isExpiringSoon.value = true
      await nextTick()

      // Status should remain auth-failed (expiring only triggers when status is 'valid')
      expect(result.credentialStatus.value).toBe('auth-failed')
      unmount()
    })
  })

  describe('hasExpired Watcher', () => {
    it('should set status to expired when registration has expired', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.credentialStatus.value).toBe('valid')

      registration.hasExpired.value = true
      await nextTick()

      expect(result.credentialStatus.value).toBe('expired')
      unmount()
    })

    it('should show error notification when expired', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          notifications,
        })
      )

      registration.hasExpired.value = true
      await nextTick()

      expect(notifications.error).toHaveBeenCalledWith(
        'Registration Expired',
        'SIP registration has expired. Re-authentication is required.',
        undefined
      )
      unmount()
    })

    it('should not change status if already auth-failed', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // First trigger auth failure
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')

      // Now trigger expired - should not override auth-failed
      registration.hasExpired.value = true
      await nextTick()

      expect(result.credentialStatus.value).toBe('auth-failed')
      unmount()
    })
  })

  describe('resetState Method', () => {
    it('should reset all error state', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // Set up error state
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(result.isAuthRequired.value).toBe(true)
      expect(result.lastAuthError.value).not.toBeNull()
      expect(result.authFailureCount.value).toBe(1)

      // Reset state
      result.resetState()

      expect(result.credentialStatus.value).toBe('valid')
      expect(result.isAuthRequired.value).toBe(false)
      expect(result.lastAuthError.value).toBeNull()
      expect(result.authFailureCount.value).toBe(0)
      unmount()
    })

    it('should clear pending error debounce timer', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // Trigger error but don't wait for debounce
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()

      // Reset before debounce completes
      result.resetState()

      // Advance past debounce time
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // State should still be valid (debounced handler was cleared)
      expect(result.credentialStatus.value).toBe('valid')
      expect(result.isAuthRequired.value).toBe(false)
      unmount()
    })
  })

  describe('dismissAuthRequired Method', () => {
    it('should set isAuthRequired to false', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // Set up auth required state
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.isAuthRequired.value).toBe(true)

      result.dismissAuthRequired()

      expect(result.isAuthRequired.value).toBe(false)
      // Other state should remain unchanged
      expect(result.credentialStatus.value).toBe('auth-failed')
      expect(result.lastAuthError.value).not.toBeNull()
      unmount()
    })
  })

  describe('Error Debouncing', () => {
    it('should debounce rapid error changes', async () => {
      const registration = createMockRegistration()
      const onAuthRequired = vi.fn()
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onAuthRequired,
        })
      )

      // Trigger multiple errors rapidly
      registration.lastError.value = 'Error 1: 401'
      await nextTick()
      await vi.advanceTimersByTimeAsync(100)

      registration.lastError.value = 'Error 2: 401'
      await nextTick()
      await vi.advanceTimersByTimeAsync(100)

      registration.lastError.value = 'Error 3: 401'
      await nextTick()

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Should only process the last error
      expect(result.lastAuthError.value).toBe('Error 3: 401')
      expect(result.authFailureCount.value).toBe(1)
      expect(onAuthRequired).toHaveBeenCalledTimes(1)
      unmount()
    })
  })

  describe('Auth Failure Count', () => {
    it('should increment auth failure count on each auth error', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // First error
      registration.lastError.value = 'Error 1: 401'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)
      expect(result.authFailureCount.value).toBe(1)

      // Second error
      registration.lastError.value = 'Error 2: 401'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)
      expect(result.authFailureCount.value).toBe(2)

      // Third error
      registration.lastError.value = 'Error 3: 403'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)
      expect(result.authFailureCount.value).toBe(3)

      unmount()
    })
  })

  describe('Notifications Integration', () => {
    it('should show error notification on auth failure', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          notifications,
        })
      )

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(notifications.error).toHaveBeenCalledWith(
        'Authentication Failed',
        expect.stringContaining('SIP credentials may have expired'),
        undefined
      )
      unmount()
    })

    it('should show error notification with action when canAutoRefresh', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          notifications,
          onRefreshCredentials: async () => ({ username: 'test', password: 'test' }),
        })
      )

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(notifications.error).toHaveBeenCalledWith(
        'Authentication Failed',
        expect.stringContaining('SIP credentials may have expired'),
        expect.objectContaining({
          label: 'Re-authenticate',
          handler: expect.any(Function),
        })
      )
      unmount()
    })

    it('should not show notifications when notifications composable not provided', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Should still update state
      expect(result.credentialStatus.value).toBe('auth-failed')
      // No error thrown
      unmount()
    })
  })

  describe('Cleanup on Dispose', () => {
    it('should stop watchers on dispose', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      expect(result.credentialStatus.value).toBe('valid')

      // Unmount to trigger cleanup
      unmount()

      // Trigger changes after unmount
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // State should not have changed (watchers stopped)
      expect(result.credentialStatus.value).toBe('valid')
    })

    it('should clear debounce timer on dispose', async () => {
      const registration = createMockRegistration()
      const onAuthRequired = vi.fn()
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onAuthRequired,
        })
      )

      // Trigger error but don't wait for debounce
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()

      // Unmount before debounce completes
      unmount()

      // Advance past debounce time
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Callback should not have been called (timer was cleared)
      expect(onAuthRequired).not.toHaveBeenCalled()
    })
  })

  describe('Null Error Handling', () => {
    it('should ignore null error values', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      // Set error then clear it
      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')

      // Reset state
      result.resetState()
      expect(result.credentialStatus.value).toBe('valid')

      // Set error to null
      registration.lastError.value = null
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Should remain valid
      expect(result.credentialStatus.value).toBe('valid')
      unmount()
    })
  })

  describe('Notification Action Handlers', () => {
    it('should call refreshCredentials when notification action is triggered', async () => {
      const registration = createMockRegistration()
      const notifications = createMockNotifications()
      const onRefreshCredentials = vi.fn().mockResolvedValue({
        username: 'newuser',
        password: 'newpass',
      })
      const { unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          notifications,
          onRefreshCredentials,
        })
      )

      registration.lastError.value = 'Registration failed: 401 Unauthorized'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Get the action handler from the notification call
      const errorCall = notifications.error.mock.calls[0]
      const action = errorCall[2]
      expect(action).toBeDefined()
      expect(action.handler).toBeDefined()

      // Trigger the action
      action.handler()

      // Wait for async refresh
      await vi.advanceTimersByTimeAsync(0)

      expect(onRefreshCredentials).toHaveBeenCalled()
      unmount()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty error string', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      registration.lastError.value = ''
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      // Empty string is falsy, should be ignored
      expect(result.credentialStatus.value).toBe('valid')
      unmount()
    })

    it('should handle case-insensitive error pattern matching', async () => {
      const registration = createMockRegistration()
      const { result, unmount } = withSetup(() => useCredentialExpiry({ registration }))

      registration.lastError.value = 'UNAUTHORIZED ACCESS DENIED'
      await nextTick()
      await vi.advanceTimersByTimeAsync(CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY + 10)

      expect(result.credentialStatus.value).toBe('auth-failed')
      unmount()
    })

    it('should handle re-registration error with non-Error object', async () => {
      const registration = createMockRegistration({
        register: vi.fn().mockRejectedValue('String error'),
      })
      const onRefreshCredentials = vi.fn().mockResolvedValue({
        username: 'newuser',
        password: 'newpass',
      })
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onRefreshCredentials,
        })
      )

      const success = await result.refreshCredentials()

      expect(success).toBe(false)
      expect(result.lastAuthError.value).toBe('Re-registration failed')
      unmount()
    })

    it('should handle onRefreshCredentials error with non-Error object', async () => {
      const registration = createMockRegistration()
      const onRefreshCredentials = vi.fn().mockRejectedValue('String error')
      const { result, unmount } = withSetup(() =>
        useCredentialExpiry({
          registration,
          onRefreshCredentials,
        })
      )

      const success = await result.refreshCredentials()

      expect(success).toBe(false)
      expect(result.lastAuthError.value).toBe('Credential refresh failed')
      unmount()
    })
  })
})
