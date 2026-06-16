/**
 * Registration Store
 *
 * Reactive store for managing SIP registration state, including registration
 * status, expiry tracking, and auto-refresh logic.
 *
 * @module stores/registrationStore
 */

import { reactive, computed, type ComputedRef } from 'vue'
import { RegistrationState } from '../types/sip.types'
import { createLogger } from '../utils/logger'
import { DEFAULT_REGISTER_EXPIRES } from '../utils/constants'

const log = createLogger('RegistrationStore')

/**
 * Computed values interface for type safety
 */
interface RegistrationComputedValues {
  isRegistered: ComputedRef<boolean>
  isRegistering: ComputedRef<boolean>
  isUnregistering: ComputedRef<boolean>
  hasRegistrationFailed: ComputedRef<boolean>
  secondsUntilExpiry: ComputedRef<number>
  isExpiringSoon: ComputedRef<boolean>
  hasExpired: ComputedRef<boolean>
}

/**
 * Registration store state interface
 */
interface RegistrationStoreState {
  /** Current registration state */
  state: RegistrationState
  /** Registered SIP URI */
  registeredUri: string | null
  /** Registration expiry time in seconds */
  expires: number
  /** Timestamp when registration was last successful */
  lastRegistrationTime: Date | null
  /** Timestamp when registration will expire */
  expiryTime: Date | null
  /** Number of registration retry attempts */
  retryCount: number
  /** Last registration error message */
  lastError: string | null
  /** @deprecated Removed — auto-refresh is handled by useSipRegistration composable */
  autoRefreshTimerId: number | null
  /** Time trigger for computed property updates (internal, for testing) */
  _timeTrigger: number
}

/**
 * Internal reactive state
 */
const state = reactive<RegistrationStoreState>({
  state: RegistrationState.Unregistered,
  registeredUri: null,
  expires: DEFAULT_REGISTER_EXPIRES,
  lastRegistrationTime: null,
  expiryTime: null,
  retryCount: 0,
  lastError: null,
  autoRefreshTimerId: null, // deprecated — unused, kept for type compat
  _timeTrigger: 0,
})

/**
 * Helper function to calculate seconds until expiry
 */
function getSecondsUntilExpiry(): number {
  // Access _timeTrigger to make this computed reactive to time changes
  state._timeTrigger
  if (!state.expiryTime) return 0
  const now = new Date().getTime()
  const expiry = state.expiryTime.getTime()
  return Math.max(0, Math.floor((expiry - now) / 1000))
}

/**
 * Computed values
 */
const computed_values: RegistrationComputedValues = {
  /** Whether currently registered */
  isRegistered: computed(() => state.state === RegistrationState.Registered),

  /** Whether registration is in progress */
  isRegistering: computed(() => state.state === RegistrationState.Registering),

  /** Whether unregistration is in progress */
  isUnregistering: computed(() => state.state === RegistrationState.Unregistering),

  /** Whether registration has failed */
  hasRegistrationFailed: computed(() => state.state === RegistrationState.RegistrationFailed),

  /** Seconds remaining until registration expires */
  secondsUntilExpiry: computed(() => getSecondsUntilExpiry()),

  /** Whether registration is about to expire (less than 30 seconds) */
  isExpiringSoon: computed(() => getSecondsUntilExpiry() < 30),

  /** Whether registration has expired */
  hasExpired: computed(() => getSecondsUntilExpiry() === 0),
}

/**
 * Registration Store
 *
 * Manages SIP registration state with auto-refresh capabilities.
 */
export const registrationStore = {
  // ============================================================================
  // State Access (readonly to prevent direct mutation)
  // ============================================================================

  /**
   * Get current registration state
   */
  get state() {
    return state.state
  },

  /**
   * Get registered URI
   */
  get registeredUri() {
    return state.registeredUri
  },

  /**
   * Get registration expiry in seconds
   */
  get expires() {
    return state.expires
  },

  /**
   * Get last registration time
   */
  get lastRegistrationTime() {
    return state.lastRegistrationTime
  },

  /**
   * Get expiry time
   */
  get expiryTime() {
    return state.expiryTime
  },

  /**
   * Get retry count
   */
  get retryCount() {
    return state.retryCount
  },

  /**
   * Get last error
   */
  get lastError() {
    return state.lastError
  },

  /**
   * Check if registered
   */
  get isRegistered() {
    return computed_values.isRegistered.value
  },

  /**
   * Check if registering
   */
  get isRegistering() {
    return computed_values.isRegistering.value
  },

  /**
   * Check if unregistering
   */
  get isUnregistering() {
    return computed_values.isUnregistering.value
  },

  /**
   * Check if registration failed
   */
  get hasRegistrationFailed() {
    return computed_values.hasRegistrationFailed.value
  },

  /**
   * Get seconds until expiry
   */
  get secondsUntilExpiry() {
    return computed_values.secondsUntilExpiry.value
  },

  /**
   * Check if expiring soon
   */
  get isExpiringSoon() {
    return computed_values.isExpiringSoon.value
  },

  /**
   * Check if expired
   */
  get hasExpired() {
    return computed_values.hasExpired.value
  },

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Set registration state to Registering
   *
   * @param uri - SIP URI being registered
   */
  setRegistering(uri: string): void {
    state.state = RegistrationState.Registering
    state.registeredUri = uri
    state.lastError = null
    log.debug(`Registration started for ${uri}`)
  },

  /**
   * Set registration state to Registered
   *
   * @param uri - Registered SIP URI
   * @param expires - Registration expiry time in seconds (default: 600)
   */
  setRegistered(uri: string, expires?: number): void {
    const expirySeconds = expires || state.expires
    const now = new Date()

    state.state = RegistrationState.Registered
    state.registeredUri = uri
    state.expires = expirySeconds
    state.lastRegistrationTime = now
    state.expiryTime = new Date(now.getTime() + expirySeconds * 1000)
    state.retryCount = 0
    state.lastError = null

    log.info(`Registered ${uri} (expires in ${expirySeconds}s)`)

    // Note: auto-refresh is handled by useSipRegistration composable, not the store
  },

  /**
   * Set registration state to RegistrationFailed
   *
   * @param error - Error message
   */
  setRegistrationFailed(error: string): void {
    state.state = RegistrationState.RegistrationFailed
    state.lastError = error
    state.retryCount++
    state.expiryTime = null

    log.error(`Registration failed: ${error} (retry count: ${state.retryCount})`)
  },

  /**
   * Set registration state to Unregistering
   */
  setUnregistering(): void {
    state.state = RegistrationState.Unregistering
    state.lastError = null
    log.debug('Unregistration started')
  },

  /**
   * Set registration state to Unregistered
   */
  setUnregistered(): void {
    state.state = RegistrationState.Unregistered
    state.registeredUri = null
    state.expiryTime = null
    state.lastError = null
    log.info('Unregistered')
  },

  // ============================================================================
  // Auto-Refresh Logic (removed — handled by useSipRegistration composable)
  // ============================================================================

  // The store previously had its own auto-refresh timer that called triggerRefresh(),
  // which was a no-op (just logged). The composable useSipRegistration has its own
  // working auto-refresh timer that directly calls refresh(). The store's timer was
  // dead code that allocated a setTimeout on every setRegistered() call for no benefit.

  /**
   * @deprecated No-op. Auto-refresh is handled by useSipRegistration composable.
   */
  setupAutoRefresh(): void {
    // No-op — auto-refresh handled by useSipRegistration composable
  },

  /**
   * @deprecated No-op. Auto-refresh is handled by useSipRegistration composable.
   */
  clearAutoRefresh(): void {
    // No-op — timer is managed by useSipRegistration composable
  },

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Set default expiry time
   *
   * @param expires - Expiry time in seconds (must be > 0)
   */
  setDefaultExpiry(expires: number): void {
    if (expires <= 0) {
      log.warn('Expiry must be greater than 0, ignoring')
      return
    }
    state.expires = expires
    log.debug(`Default expiry set to ${expires}s`)
  },

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Reset retry count
   */
  resetRetryCount(): void {
    state.retryCount = 0
    log.debug('Reset retry count')
  },

  /**
   * Increment retry count
   *
   * @returns New retry count
   */
  incrementRetryCount(): number {
    state.retryCount++
    log.debug(`Retry count incremented to ${state.retryCount}`)
    return state.retryCount
  },

  /**
   * Reset the store to initial state
   */
  reset(): void {
    state.state = RegistrationState.Unregistered
    state.registeredUri = null
    state.expires = DEFAULT_REGISTER_EXPIRES
    state.lastRegistrationTime = null
    state.expiryTime = null
    state.retryCount = 0
    state.lastError = null
    state._timeTrigger = 0
    log.info('Registration store reset to initial state')
  },

  /**
   * Trigger time-based computed properties to re-evaluate
   * (Internal method for testing with fake timers)
   */
  _triggerTimeUpdate(): void {
    state._timeTrigger++
  },

  /**
   * Get store statistics
   *
   * @returns Object with store statistics
   */
  getStatistics() {
    return {
      state: state.state,
      registeredUri: state.registeredUri,
      isRegistered: computed_values.isRegistered.value,
      expires: state.expires,
      secondsUntilExpiry: computed_values.secondsUntilExpiry.value,
      retryCount: state.retryCount,
      // autoRefreshTimer removed — handled by composable
      lastError: state.lastError,
    }
  },
}
