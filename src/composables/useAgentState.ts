/**
 * Provider-Agnostic Agent State Composable
 *
 * Provides reactive agent state management that works with any CallCenterProvider.
 * Abstracts login, logout, pause, and status management behind a unified API.
 *
 * @module composables/useAgentState
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import type {
  CallCenterProvider,
  AgentState,
  AgentStatus,
  AgentLoginOptions,
  AgentLogoutOptions,
  CurrentCallInfo,
  BreakType,
  Unsubscribe,
} from '@/providers/call-center/types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useAgentState')

/**
 * Options for useAgentState
 */
export interface UseAgentStateOptions {
  /** Auto-subscribe to provider state changes */
  autoSubscribe?: boolean
  /** Default queues to join on login */
  defaultQueues?: string[]
  /** Update session duration interval (ms) */
  sessionUpdateInterval?: number
}

/**
 * Return type for useAgentState
 */
export interface UseAgentStateReturn {
  // State
  /** Agent ID */
  agentId: ComputedRef<string | null>
  /** Agent display name */
  displayName: ComputedRef<string | null>
  /** Current status */
  status: ComputedRef<AgentStatus>
  /** Whether agent is logged in */
  isLoggedIn: ComputedRef<boolean>
  /** Whether agent is on a call */
  isOnCall: ComputedRef<boolean>
  /** Whether agent is paused */
  isPaused: ComputedRef<boolean>
  /** Current pause reason */
  pauseReason: ComputedRef<string | undefined>
  /** Current break type */
  breakType: ComputedRef<BreakType | undefined>
  /** Current call info */
  currentCall: ComputedRef<CurrentCallInfo | null>
  /** Session duration formatted (HH:MM:SS) */
  sessionDuration: ComputedRef<string>
  /** Raw session duration in seconds */
  sessionDurationSeconds: ComputedRef<number>
  /** Loading state */
  isLoading: Ref<boolean>
  /** Error message */
  error: Ref<string | null>

  // Methods
  /** Login to queues */
  login: (options?: AgentLoginOptions) => Promise<void>
  /** Logout from queues */
  logout: (options?: AgentLogoutOptions) => Promise<void>
  /** Pause with reason */
  pause: (reason: string, breakType?: BreakType, duration?: number) => Promise<void>
  /** Unpause */
  unpause: () => Promise<void>
  /** Set status directly */
  setStatus: (status: AgentStatus, reason?: string) => Promise<void>
  /** Refresh state from provider */
  refresh: () => void
}

/**
 * Format seconds as HH:MM:SS
 */
function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Provider-agnostic agent state composable
 *
 * @param providerRef - Ref to the CallCenterProvider instance
 * @param options - Configuration options
 * @returns Reactive agent state and methods
 *
 * @example
 * ```typescript
 * const { provider } = useCallCenterProvider(config)
 * const {
 *   status,
 *   isLoggedIn,
 *   isOnCall,
 *   login,
 *   logout,
 *   pause,
 *   unpause,
 * } = useAgentState(provider)
 *
 * // Login to queues
 * await login({ queues: ['support', 'sales'] })
 *
 * // Pause for lunch
 * await pause('Lunch', 'lunch', 3600)
 *
 * // Resume
 * await unpause()
 * ```
 */
export function useAgentState(
  providerRef: ShallowRef<CallCenterProvider | null> | Ref<CallCenterProvider | null>,
  options: UseAgentStateOptions = {}
): UseAgentStateReturn {
  const { autoSubscribe = true, defaultQueues = [], sessionUpdateInterval = 1000 } = options

  // Internal state
  const state = ref<AgentState | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const sessionSeconds = ref(0)

  let stateUnsubscribe: Unsubscribe | null = null
  let sessionTimer: ReturnType<typeof setInterval> | null = null

  // Computed properties
  const agentId = computed(() => state.value?.agentId ?? null)
  const displayName = computed(() => state.value?.displayName ?? null)
  const status = computed<AgentStatus>(() => state.value?.status ?? 'offline')
  const isLoggedIn = computed(
    () => state.value?.loginTime !== null && state.value?.loginTime !== undefined
  )
  const isOnCall = computed(() => state.value?.currentCall !== null)
  const isPaused = computed(() => state.value?.isPaused ?? false)
  const pauseReason = computed(() => state.value?.pauseReason)
  const breakType = computed(() => state.value?.breakType)
  const currentCall = computed(() => state.value?.currentCall ?? null)
  const sessionDurationSeconds = computed(() => sessionSeconds.value)
  const sessionDuration = computed(() => formatDuration(sessionSeconds.value))

  // Subscribe to provider state changes
  function subscribeToState() {
    if (!providerRef.value || stateUnsubscribe) return

    stateUnsubscribe = providerRef.value.onStateChange((newState) => {
      state.value = newState
      logger.debug('State updated:', newState.status)
    })
  }

  // Unsubscribe from state changes
  function unsubscribeFromState() {
    if (stateUnsubscribe) {
      stateUnsubscribe()
      stateUnsubscribe = null
    }
  }

  // Start session timer
  function startSessionTimer() {
    if (sessionTimer) return

    sessionTimer = setInterval(() => {
      if (state.value?.loginTime) {
        sessionSeconds.value = Math.floor((Date.now() - state.value.loginTime.getTime()) / 1000)
      }
    }, sessionUpdateInterval)
  }

  // Stop session timer
  function stopSessionTimer() {
    if (sessionTimer) {
      clearInterval(sessionTimer)
      sessionTimer = null
    }
    sessionSeconds.value = 0
  }

  // Watch for provider changes
  watch(
    providerRef,
    (newProvider, oldProvider) => {
      if (oldProvider) {
        unsubscribeFromState()
        stopSessionTimer()
        state.value = null
      }
      if (newProvider && autoSubscribe) {
        subscribeToState()
      }
    },
    { immediate: autoSubscribe }
  )

  // Methods
  async function login(loginOptions?: AgentLoginOptions): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const opts = loginOptions ?? (defaultQueues.length ? { queues: defaultQueues } : undefined)
      const newState = await providerRef.value.login(opts)
      state.value = newState
      startSessionTimer()
      logger.info('Agent logged in')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      logger.error('Login failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout(logoutOptions?: AgentLogoutOptions): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true

    try {
      await providerRef.value.logout(logoutOptions)
      state.value = state.value
        ? { ...state.value, status: 'offline', loginTime: null, queues: [] }
        : null
      stopSessionTimer()
      logger.info('Agent logged out')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Logout failed'
      logger.error('Logout failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function pause(reason: string, breakTypeVal?: BreakType, duration?: number): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true

    try {
      await providerRef.value.pause({ reason, breakType: breakTypeVal, duration })
      logger.info(`Agent paused: ${reason}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Pause failed'
      logger.error('Pause failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function unpause(): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true

    try {
      await providerRef.value.unpause()
      logger.info('Agent unpaused')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unpause failed'
      logger.error('Unpause failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function setStatus(newStatus: AgentStatus, reason?: string): Promise<void> {
    if (!providerRef.value) {
      error.value = 'Provider not initialized'
      return
    }

    isLoading.value = true

    try {
      await providerRef.value.setStatus(newStatus, reason)
      logger.info(`Status set to: ${newStatus}`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Set status failed'
      logger.error('Set status failed:', error.value)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function refresh(): void {
    // Re-subscribe to get latest state
    unsubscribeFromState()
    subscribeToState()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeFromState()
    stopSessionTimer()
  })

  return {
    // State
    agentId,
    displayName,
    status,
    isLoggedIn,
    isOnCall,
    isPaused,
    pauseReason,
    breakType,
    currentCall,
    sessionDuration,
    sessionDurationSeconds,
    isLoading,
    error,

    // Methods
    login,
    logout,
    pause,
    unpause,
    setStatus,
    refresh,
  }
}
