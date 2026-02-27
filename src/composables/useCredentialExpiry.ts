/**
 * Credential Expiry Composable
 *
 * Detects SIP credential expiration by monitoring registration failures
 * (401/403 responses) and provides re-authentication flow hooks.
 * This composable watches registration state — it does not implement
 * the actual auth mechanism (that's app-level via callbacks).
 *
 * @module composables/useCredentialExpiry
 */

import {
  ref,
  computed,
  watch,
  onScopeDispose,
  getCurrentScope,
  type ComputedRef,
  type Ref,
} from 'vue'
import { createLogger } from '@/utils/logger'
import { CREDENTIAL_EXPIRY_CONSTANTS } from './constants'
import type { UseSipRegistrationReturn } from './useSipRegistration'
import type { UseNotificationsReturn } from './useNotifications'

const logger = createLogger('useCredentialExpiry')

/**
 * Credential health status
 */
export type CredentialStatus = 'valid' | 'expiring' | 'expired' | 'auth-failed'

/**
 * Options for the credential expiry composable
 */
export interface CredentialExpiryOptions {
  /** Registration composable instance to watch */
  registration: UseSipRegistrationReturn
  /** Notifications composable for alerting the user */
  notifications?: UseNotificationsReturn
  /** SIP error codes that indicate credential issues (default: [401, 403]) */
  authErrorCodes?: number[]
  /** Time before expiry to warn user in seconds (default: 60) */
  warningThreshold?: number
  /** Callback when re-auth is needed */
  onAuthRequired?: () => void | Promise<void>
  /** Callback to perform credential refresh — returns new credentials or null on failure */
  onRefreshCredentials?: () => Promise<{ username: string; password: string } | null>
}

/**
 * Return type for useCredentialExpiry composable
 */
export interface UseCredentialExpiryReturn {
  /** Current credential health status */
  credentialStatus: ComputedRef<CredentialStatus>
  /** Whether re-authentication is required */
  isAuthRequired: Ref<boolean>
  /** Last authentication error message */
  lastAuthError: Ref<string | null>
  /** Number of consecutive auth failures */
  authFailureCount: Ref<number>
  /** Whether auto-refresh is available (onRefreshCredentials provided) */
  canAutoRefresh: ComputedRef<boolean>

  /** Attempt to refresh credentials via the provided callback, then re-register */
  refreshCredentials: () => Promise<boolean>
  /** Dismiss the auth-required state without refreshing */
  dismissAuthRequired: () => void
  /** Reset all error state */
  resetState: () => void
}

/**
 * Composable that detects SIP credential expiration and provides
 * re-authentication flow hooks.
 *
 * Watches registration state for auth-related errors (401, 403, Unauthorized, Forbidden)
 * and expiry warnings, then surfaces notifications and triggers callbacks.
 *
 * @param options - Configuration options
 * @returns Reactive credential state and methods
 *
 * @example
 * ```ts
 * const { credentialStatus, isAuthRequired, refreshCredentials } = useCredentialExpiry({
 *   registration,
 *   notifications,
 *   onAuthRequired: () => showLoginModal(),
 *   onRefreshCredentials: async () => {
 *     const token = await myAuthService.refreshToken()
 *     return token ? { username: token.user, password: token.sipPassword } : null
 *   },
 * })
 * ```
 */
export function useCredentialExpiry(options: CredentialExpiryOptions): UseCredentialExpiryReturn {
  const {
    registration,
    notifications,
    authErrorCodes = CREDENTIAL_EXPIRY_CONSTANTS.DEFAULT_AUTH_ERROR_CODES as unknown as number[],
    warningThreshold: _warningThreshold = CREDENTIAL_EXPIRY_CONSTANTS.DEFAULT_WARNING_THRESHOLD,
    onAuthRequired,
    onRefreshCredentials,
  } = options

  // ============================================================================
  // Reactive State
  // ============================================================================

  const credentialStatusRef = ref<CredentialStatus>('valid')
  const isAuthRequired = ref(false)
  const lastAuthError = ref<string | null>(null)
  const authFailureCount = ref(0)
  let errorDebounceTimer: ReturnType<typeof setTimeout> | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const credentialStatus = computed<CredentialStatus>(() => credentialStatusRef.value)
  const canAutoRefresh = computed(() => typeof onRefreshCredentials === 'function')

  // ============================================================================
  // Internal Methods
  // ============================================================================

  function isAuthError(errorMessage: string): boolean {
    const patterns = CREDENTIAL_EXPIRY_CONSTANTS.AUTH_ERROR_PATTERNS
    const lowerError = errorMessage.toLowerCase()

    // Check for auth error code patterns
    for (const code of authErrorCodes) {
      if (errorMessage.includes(String(code))) {
        return true
      }
    }

    // Check for auth error text patterns
    for (const pattern of patterns) {
      if (lowerError.includes(pattern.toLowerCase())) {
        return true
      }
    }

    return false
  }

  function handleAuthFailure(errorMessage: string): void {
    authFailureCount.value++
    lastAuthError.value = errorMessage
    credentialStatusRef.value = 'auth-failed'
    isAuthRequired.value = true

    logger.warn(`Auth failure detected (count: ${authFailureCount.value}): ${errorMessage}`)

    // Notify user with action button
    if (notifications) {
      notifications.error(
        'Authentication Failed',
        `SIP credentials may have expired. ${errorMessage}`,
        canAutoRefresh.value
          ? {
              label: 'Re-authenticate',
              handler: () => {
                refreshCredentials()
              },
            }
          : undefined
      )
    }

    // Call the onAuthRequired callback
    if (onAuthRequired) {
      try {
        const result = onAuthRequired()
        if (result instanceof Promise) {
          result.catch((err) => logger.error('onAuthRequired callback error:', err))
        }
      } catch (err) {
        logger.error('onAuthRequired callback error:', err)
      }
    }
  }

  function clearErrorDebounce(): void {
    if (errorDebounceTimer !== null) {
      clearTimeout(errorDebounceTimer)
      errorDebounceTimer = null
    }
  }

  // ============================================================================
  // Watchers
  // ============================================================================

  // Watch registration.lastError for auth-related errors
  const stopErrorWatch = watch(
    () => registration.lastError.value,
    (newError) => {
      if (!newError) return

      clearErrorDebounce()
      errorDebounceTimer = setTimeout(() => {
        errorDebounceTimer = null
        if (isAuthError(newError)) {
          handleAuthFailure(newError)
        }
      }, CREDENTIAL_EXPIRY_CONSTANTS.ERROR_DEBOUNCE_DELAY)
    }
  )

  // Watch registration.isExpiringSoon — set status to 'expiring' and notify
  const stopExpiringSoonWatch = watch(
    () => registration.isExpiringSoon.value,
    (expiringSoon) => {
      if (expiringSoon && credentialStatusRef.value === 'valid') {
        credentialStatusRef.value = 'expiring'
        logger.info('Registration expiring soon — credential refresh may be needed')

        if (notifications) {
          notifications.warning(
            'Credentials Expiring',
            'SIP registration is about to expire. Re-authentication may be required.',
            canAutoRefresh.value
              ? {
                  label: 'Re-authenticate',
                  handler: () => {
                    refreshCredentials()
                  },
                }
              : undefined
          )
        }
      }
    }
  )

  // Watch registration.hasExpired — set status to 'expired'
  const stopExpiredWatch = watch(
    () => registration.hasExpired.value,
    (expired) => {
      if (expired && credentialStatusRef.value !== 'auth-failed') {
        credentialStatusRef.value = 'expired'
        logger.warn('Registration has expired')

        if (notifications) {
          notifications.error(
            'Registration Expired',
            'SIP registration has expired. Re-authentication is required.',
            canAutoRefresh.value
              ? {
                  label: 'Re-authenticate',
                  handler: () => {
                    refreshCredentials()
                  },
                }
              : undefined
          )
        }
      }
    }
  )

  // ============================================================================
  // Public Methods
  // ============================================================================

  async function refreshCredentials(): Promise<boolean> {
    if (!onRefreshCredentials) {
      logger.warn('No onRefreshCredentials callback provided')
      return false
    }

    logger.info('Attempting credential refresh...')

    try {
      const newCredentials = await onRefreshCredentials()

      if (!newCredentials) {
        logger.warn('Credential refresh returned null — refresh failed')
        lastAuthError.value = 'Credential refresh failed: no credentials returned'
        return false
      }

      logger.info('Credentials refreshed, triggering re-registration')

      // Re-register with new credentials
      try {
        await registration.register()

        // Success — reset state
        credentialStatusRef.value = 'valid'
        isAuthRequired.value = false
        lastAuthError.value = null
        authFailureCount.value = 0

        logger.info('Re-registration successful after credential refresh')

        if (notifications) {
          notifications.success(
            'Re-authenticated',
            'SIP credentials have been refreshed successfully.'
          )
        }

        return true
      } catch (regError) {
        const errorMsg = regError instanceof Error ? regError.message : 'Re-registration failed'
        logger.error('Re-registration failed after credential refresh:', errorMsg)
        lastAuthError.value = errorMsg
        return false
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Credential refresh failed'
      logger.error('Credential refresh error:', errorMsg)
      lastAuthError.value = errorMsg
      return false
    }
  }

  function dismissAuthRequired(): void {
    isAuthRequired.value = false
    logger.debug('Auth-required state dismissed')
  }

  function resetState(): void {
    clearErrorDebounce()
    credentialStatusRef.value = 'valid'
    isAuthRequired.value = false
    lastAuthError.value = null
    authFailureCount.value = 0
    logger.debug('Credential expiry state reset')
  }

  // ============================================================================
  // Lifecycle Cleanup
  // ============================================================================

  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearErrorDebounce()
      stopErrorWatch()
      stopExpiringSoonWatch()
      stopExpiredWatch()
      logger.debug('Credential expiry composable disposed')
    })
  }

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    credentialStatus,
    isAuthRequired,
    lastAuthError,
    authFailureCount,
    canAutoRefresh,
    refreshCredentials,
    dismissAuthRequired,
    resetState,
  }
}
