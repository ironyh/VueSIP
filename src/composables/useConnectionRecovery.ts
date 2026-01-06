/**
 * useConnectionRecovery - Connection recovery with ICE restart handling
 * @packageDocumentation
 */

import { ref, computed } from 'vue'
import type {
  RecoveryState,
  RecoveryAttempt,
  IceHealthStatus,
  ConnectionRecoveryOptions,
  UseConnectionRecoveryReturn,
} from '@/types/connection-recovery.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useConnectionRecovery')

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<
  Omit<ConnectionRecoveryOptions, 'onRecoveryStart' | 'onRecoverySuccess' | 'onRecoveryFailed'>
> = {
  autoRecover: true,
  maxAttempts: 3,
  attemptDelay: 2000,
  iceRestartTimeout: 10000,
  strategy: 'ice-restart',
}

/**
 * Composable for managing connection recovery with ICE restart
 *
 * @param options - Configuration options
 * @returns Connection recovery state and methods
 *
 * @example
 * ```ts
 * const { state, isRecovering, recover, monitor } = useConnectionRecovery({
 *   maxAttempts: 3,
 *   onRecoverySuccess: () => console.log('Recovered!')
 * })
 *
 * // Start monitoring a peer connection
 * monitor(peerConnection)
 * ```
 */
export function useConnectionRecovery(
  options: ConnectionRecoveryOptions = {}
): UseConnectionRecoveryReturn {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // State
  const state = ref<RecoveryState>('stable')
  const attempts = ref<RecoveryAttempt[]>([])
  const error = ref<string | null>(null)

  // ICE health
  const iceHealth = ref<IceHealthStatus>({
    iceState: 'new',
    stateAge: 0,
    recoveryAttempts: 0,
    isHealthy: true,
  })

  // Computed
  const isRecovering = computed(() => state.value === 'recovering')
  const isHealthy = computed(() => state.value === 'stable' && iceHealth.value.isHealthy)

  // Peer connection reference
  let peerConnection: RTCPeerConnection | null = null
  let stateChangeTime = Date.now()

  // Event handler reference for cleanup
  let iceStateHandler: (() => void) | null = null

  /**
   * Update ICE health status
   */
  function updateIceHealth(): void {
    if (!peerConnection) return

    const currentState = peerConnection.iceConnectionState
    const isHealthyState = currentState === 'connected' || currentState === 'completed'

    iceHealth.value = {
      iceState: currentState,
      stateAge: Date.now() - stateChangeTime,
      recoveryAttempts: attempts.value.length,
      isHealthy: isHealthyState,
    }

    // Update overall state based on ICE health
    if (!isHealthyState && state.value === 'stable') {
      if (currentState === 'disconnected' || currentState === 'failed') {
        state.value = 'monitoring'
      }
    } else if (isHealthyState && state.value !== 'stable') {
      state.value = 'stable'
    }
  }

  /**
   * Handle ICE state changes
   */
  function handleIceStateChange(): void {
    if (!peerConnection) return

    const currentState = peerConnection.iceConnectionState
    logger.debug('ICE state changed', { state: currentState })

    if (currentState === 'failed' && config.autoRecover) {
      // Start automatic recovery
      recover()
    }
  }

  /**
   * Monitor a peer connection for failures
   */
  function monitor(pc: RTCPeerConnection): void {
    // Clean up existing monitoring
    if (peerConnection && iceStateHandler) {
      peerConnection.removeEventListener('iceconnectionstatechange', iceStateHandler)
    }

    peerConnection = pc
    stateChangeTime = Date.now()

    // Update initial state
    updateIceHealth()

    // Setup event listener
    iceStateHandler = () => {
      stateChangeTime = Date.now()
      updateIceHealth()
      handleIceStateChange()
    }

    pc.addEventListener('iceconnectionstatechange', iceStateHandler)

    logger.info('Started monitoring peer connection', {
      iceState: pc.iceConnectionState,
    })
  }

  /**
   * Stop monitoring
   */
  function stopMonitoring(): void {
    if (peerConnection && iceStateHandler) {
      peerConnection.removeEventListener('iceconnectionstatechange', iceStateHandler)
      iceStateHandler = null
    }
    peerConnection = null
    logger.info('Stopped monitoring peer connection')
  }

  /**
   * Perform ICE restart
   */
  async function performIceRestart(): Promise<void> {
    if (!peerConnection) throw new Error('No peer connection')

    logger.debug('Performing ICE restart')

    // Trigger ICE restart
    peerConnection.restartIce()

    // Create new offer with ICE restart flag
    const offer = await peerConnection.createOffer({ iceRestart: true })

    // Set local description to trigger renegotiation
    await peerConnection.setLocalDescription(offer)

    logger.debug('ICE restart initiated')
  }

  /**
   * Wait for connection to stabilize
   */
  async function waitForConnection(): Promise<boolean> {
    if (!peerConnection) return false

    // If already connected, return immediately
    if (
      peerConnection.iceConnectionState === 'connected' ||
      peerConnection.iceConnectionState === 'completed'
    ) {
      return true
    }

    // Wait for connection with timeout
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup()
        resolve(false)
      }, config.iceRestartTimeout)

      const handler = () => {
        if (
          peerConnection?.iceConnectionState === 'connected' ||
          peerConnection?.iceConnectionState === 'completed'
        ) {
          cleanup()
          resolve(true)
        } else if (peerConnection?.iceConnectionState === 'failed') {
          cleanup()
          resolve(false)
        }
      }

      function cleanup() {
        clearTimeout(timeout)
        peerConnection?.removeEventListener('iceconnectionstatechange', handler)
      }

      peerConnection?.addEventListener('iceconnectionstatechange', handler)
    })
  }

  // Track if recovery is in progress
  let recoveryInProgress = false

  /**
   * Helper to delay execution
   */
  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Manually trigger recovery with retry logic
   */
  async function recover(): Promise<boolean> {
    if (!peerConnection) {
      logger.warn('Cannot recover: no peer connection')
      error.value = 'No peer connection to recover'
      return false
    }

    if (recoveryInProgress) {
      logger.warn('Recovery already in progress')
      return false
    }

    recoveryInProgress = true
    state.value = 'recovering'
    error.value = null

    // Notify recovery start
    options.onRecoveryStart?.()

    logger.info('Starting connection recovery', {
      strategy: config.strategy,
      maxAttempts: config.maxAttempts,
    })

    const allAttempts: RecoveryAttempt[] = []

    try {
      for (let i = 0; i < config.maxAttempts; i++) {
        const attemptNumber = i + 1
        const startTime = Date.now()

        logger.debug(`Recovery attempt ${attemptNumber}/${config.maxAttempts}`)

        try {
          if (config.strategy === 'ice-restart') {
            await performIceRestart()
          }

          // Wait for connection to stabilize
          const success = await waitForConnection()

          const attempt: RecoveryAttempt = {
            attempt: attemptNumber,
            strategy: config.strategy,
            success,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          }

          allAttempts.push(attempt)
          attempts.value = [...attempts.value, attempt]

          if (success) {
            state.value = 'stable'
            recoveryInProgress = false
            options.onRecoverySuccess?.(attempt)
            logger.info('Recovery successful', { attempt: attemptNumber })
            return true
          }

          // Wait before next attempt (except for last attempt)
          if (i < config.maxAttempts - 1) {
            await delay(config.attemptDelay)
          }
        } catch (err) {
          const attempt: RecoveryAttempt = {
            attempt: attemptNumber,
            strategy: config.strategy,
            success: false,
            duration: Date.now() - startTime,
            error: err instanceof Error ? err.message : 'Unknown error',
            timestamp: Date.now(),
          }

          allAttempts.push(attempt)
          attempts.value = [...attempts.value, attempt]

          // Wait before next attempt (except for last attempt)
          if (i < config.maxAttempts - 1) {
            await delay(config.attemptDelay)
          }
        }
      }

      // All attempts exhausted
      state.value = 'failed'
      error.value = `Recovery failed after ${config.maxAttempts} attempts`
      recoveryInProgress = false
      options.onRecoveryFailed?.(allAttempts)

      logger.error('All recovery attempts failed', { attempts: allAttempts.length })
      return false
    } catch (err) {
      state.value = 'failed'
      error.value = err instanceof Error ? err.message : 'Unknown error'
      recoveryInProgress = false

      logger.error('Recovery error', { error: err })
      return false
    }
  }

  /**
   * Reset recovery state
   */
  function reset(): void {
    state.value = 'stable'
    attempts.value = []
    error.value = null
    iceHealth.value = {
      iceState: 'new',
      stateAge: 0,
      recoveryAttempts: 0,
      isHealthy: true,
    }
    logger.debug('Recovery state reset')
  }

  return {
    state: computed(() => state.value),
    iceHealth: computed(() => iceHealth.value),
    attempts: computed(() => attempts.value),
    isRecovering,
    isHealthy,
    error: computed(() => error.value),
    recover,
    reset,
    monitor,
    stopMonitoring,
  }
}
