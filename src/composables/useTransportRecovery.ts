/**
 * Transport Recovery Composable
 *
 * Coordinates WebSocket reconnection with SIP re-registration.
 * Listens to TransportManager events and triggers re-registration
 * after transport reconnects with a configurable stabilization delay.
 *
 * @module composables/useTransportRecovery
 */

import { ref, computed, onScopeDispose, getCurrentScope, type Ref, type ComputedRef } from 'vue'
import { TransportEvent, type TransportManager } from '@/core/TransportManager'
import { ConnectionState } from '@/types/sip.types'
import type { SipClient } from '@/core/SipClient'
import { createLogger } from '@/utils/logger'
import { TRANSPORT_RECOVERY_CONSTANTS, RETRY_CONFIG } from './constants'

const logger = createLogger('useTransportRecovery')

/**
 * Transport recovery options
 */
export interface TransportRecoveryOptions {
  /** Delay after transport connects before triggering re-registration (ms) */
  stabilizationDelay?: number
  /** Maximum recovery attempts before giving up */
  maxRecoveryAttempts?: number
  /** Called when recovery process starts */
  onRecoveryStart?: () => void
  /** Called when recovery succeeds (re-registration complete) */
  onRecovered?: () => void
  /** Called when recovery fails after all attempts */
  onRecoveryFailed?: (error: string) => void
}

/**
 * Recovery metrics tracking
 */
export interface TransportRecoveryMetrics {
  /** Total number of recovery attempts across all recovery cycles */
  totalAttempts: number
  /** Timestamp of last successful recovery */
  lastSuccessTime: Date | null
  /** Total number of successful recoveries */
  totalRecoveries: number
}

/**
 * Return type for useTransportRecovery composable
 */
export interface UseTransportRecoveryReturn {
  /** Current connection state from transport */
  connectionState: ComputedRef<ConnectionState>
  /** Whether a recovery is currently in progress */
  isRecovering: ComputedRef<boolean>
  /** Timestamp of last successful recovery */
  lastRecoveryTime: Ref<Date | null>
  /** Number of attempts in the current recovery cycle */
  recoveryAttempts: Ref<number>
  /** Last recovery error message */
  lastError: Ref<string | null>
  /** Recovery metrics */
  metrics: ComputedRef<TransportRecoveryMetrics>
  /** Manually trigger a recovery attempt */
  triggerRecovery: () => Promise<void>
  /** Reset recovery state */
  reset: () => void
}

/**
 * Composable that coordinates WebSocket reconnection with SIP re-registration.
 *
 * When TransportManager emits a Connected event (after reconnection), this composable
 * waits for a stabilization delay then triggers SIP re-registration via the SipClient.
 *
 * @param transportManager - TransportManager instance to listen for connection events
 * @param sipClient - Ref to SipClient instance for triggering re-registration
 * @param options - Configuration options
 * @returns Reactive recovery state and methods
 *
 * @example
 * ```ts
 * const { isRecovering, connectionState, lastRecoveryTime } = useTransportRecovery(
 *   transportManager,
 *   sipClient,
 *   {
 *     stabilizationDelay: 1500,
 *     onRecovered: () => console.log('SIP re-registered after reconnect'),
 *     onRecoveryFailed: (err) => console.error('Recovery failed:', err),
 *   }
 * )
 * ```
 */
export function useTransportRecovery(
  transportManager: TransportManager,
  sipClient: Ref<SipClient | null>,
  options: TransportRecoveryOptions = {}
): UseTransportRecoveryReturn {
  const {
    stabilizationDelay = TRANSPORT_RECOVERY_CONSTANTS.STABILIZATION_DELAY,
    maxRecoveryAttempts = TRANSPORT_RECOVERY_CONSTANTS.MAX_RECOVERY_ATTEMPTS,
    onRecoveryStart,
    onRecovered,
    onRecoveryFailed,
  } = options

  // ============================================================================
  // Reactive State
  // ============================================================================

  const connectionState = ref<ConnectionState>(transportManager.state)
  const isRecoveringRef = ref(false)
  const lastRecoveryTime = ref<Date | null>(null)
  const recoveryAttempts = ref(0)
  const lastError = ref<string | null>(null)
  const totalAttempts = ref(0)
  const totalRecoveries = ref(0)

  // Internal timers
  let stabilizationTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  // ============================================================================
  // Computed
  // ============================================================================

  const isRecovering = computed(() => isRecoveringRef.value)

  const metrics = computed<TransportRecoveryMetrics>(() => ({
    totalAttempts: totalAttempts.value,
    lastSuccessTime: lastRecoveryTime.value,
    totalRecoveries: totalRecoveries.value,
  }))

  // ============================================================================
  // Internal Methods
  // ============================================================================

  function clearStabilizationTimer(): void {
    if (stabilizationTimer !== null) {
      clearTimeout(stabilizationTimer)
      stabilizationTimer = null
    }
  }

  function clearRetryTimer(): void {
    if (retryTimer !== null) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
  }

  function clearAllTimers(): void {
    clearStabilizationTimer()
    clearRetryTimer()
  }

  async function attemptReRegistration(): Promise<void> {
    if (!sipClient.value) {
      const errorMsg = 'SIP client not available for re-registration'
      logger.warn(errorMsg)
      lastError.value = errorMsg
      return
    }

    recoveryAttempts.value++
    totalAttempts.value++

    logger.info(`Recovery attempt ${recoveryAttempts.value}/${maxRecoveryAttempts}`)

    try {
      await sipClient.value.register()

      // Success
      isRecoveringRef.value = false
      lastRecoveryTime.value = new Date()
      lastError.value = null
      totalRecoveries.value++

      logger.info('Transport recovery successful - SIP re-registered')
      onRecovered?.()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Re-registration failed'
      logger.error('Re-registration attempt failed:', errorMsg)
      lastError.value = errorMsg

      if (recoveryAttempts.value >= maxRecoveryAttempts) {
        isRecoveringRef.value = false
        const failMsg = `Recovery failed after ${maxRecoveryAttempts} attempts: ${errorMsg}`
        logger.error(failMsg)
        onRecoveryFailed?.(failMsg)
      } else {
        // Schedule retry with exponential backoff
        const delay = RETRY_CONFIG.calculateBackoff(
          recoveryAttempts.value - 1,
          TRANSPORT_RECOVERY_CONSTANTS.BASE_RETRY_DELAY,
          TRANSPORT_RECOVERY_CONSTANTS.MAX_RETRY_DELAY
        )

        logger.info(`Scheduling retry in ${delay}ms`)

        retryTimer = setTimeout(() => {
          retryTimer = null
          // Only retry if still recovering and transport is connected
          if (isRecoveringRef.value && transportManager.isConnected) {
            attemptReRegistration().catch((err) => logger.error('Retry attempt error:', err))
          }
        }, delay)
      }
    }
  }

  function startRecovery(): void {
    if (isRecoveringRef.value) {
      logger.debug('Recovery already in progress, skipping')
      return
    }

    isRecoveringRef.value = true
    recoveryAttempts.value = 0
    lastError.value = null

    logger.info('Transport recovery started')
    onRecoveryStart?.()

    // Wait for stabilization before attempting re-registration
    clearStabilizationTimer()
    stabilizationTimer = setTimeout(() => {
      stabilizationTimer = null
      // Verify transport is still connected after stabilization
      if (transportManager.isConnected) {
        attemptReRegistration().catch((err) => logger.error('Initial recovery attempt error:', err))
      } else {
        logger.warn('Transport disconnected during stabilization, aborting recovery')
        isRecoveringRef.value = false
      }
    }, stabilizationDelay)
  }

  function cancelRecovery(): void {
    clearAllTimers()
    if (isRecoveringRef.value) {
      isRecoveringRef.value = false
      logger.info('Recovery cancelled due to transport disconnect')
    }
  }

  // ============================================================================
  // Transport Event Handlers
  // ============================================================================

  function handleConnected(): void {
    connectionState.value = ConnectionState.Connected
    logger.debug('Transport connected, initiating recovery')
    startRecovery()
  }

  function handleDisconnected(): void {
    connectionState.value = ConnectionState.Disconnected
    cancelRecovery()
  }

  function handleReconnecting(): void {
    connectionState.value = ConnectionState.Reconnecting
  }

  function handleConnecting(): void {
    connectionState.value = ConnectionState.Connecting
  }

  function handleError(): void {
    connectionState.value = ConnectionState.Error
    cancelRecovery()
  }

  // ============================================================================
  // Event Listener Registration
  // ============================================================================

  transportManager.on(TransportEvent.Connected, handleConnected)
  transportManager.on(TransportEvent.Disconnected, handleDisconnected)
  transportManager.on(TransportEvent.Reconnecting, handleReconnecting)
  transportManager.on(TransportEvent.Connecting, handleConnecting)
  transportManager.on(TransportEvent.Error, handleError)

  // ============================================================================
  // Public Methods
  // ============================================================================

  async function triggerRecovery(): Promise<void> {
    if (!transportManager.isConnected) {
      const errorMsg = 'Cannot trigger recovery: transport not connected'
      logger.warn(errorMsg)
      lastError.value = errorMsg
      return
    }

    cancelRecovery()
    startRecovery()
  }

  function reset(): void {
    clearAllTimers()
    isRecoveringRef.value = false
    recoveryAttempts.value = 0
    lastError.value = null
    connectionState.value = transportManager.state
    logger.debug('Transport recovery state reset')
  }

  // ============================================================================
  // Lifecycle Cleanup
  // ============================================================================

  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearAllTimers()
      transportManager.off(TransportEvent.Connected, handleConnected)
      transportManager.off(TransportEvent.Disconnected, handleDisconnected)
      transportManager.off(TransportEvent.Reconnecting, handleReconnecting)
      transportManager.off(TransportEvent.Connecting, handleConnecting)
      transportManager.off(TransportEvent.Error, handleError)
      logger.debug('Transport recovery composable disposed')
    })
  }

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    connectionState: computed(() => connectionState.value),
    isRecovering,
    lastRecoveryTime,
    recoveryAttempts,
    lastError,
    metrics,
    triggerRecovery,
    reset,
  }
}
