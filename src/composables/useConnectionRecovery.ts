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
   * Manually trigger recovery
   */
  async function recover(): Promise<boolean> {
    logger.info('Manual recovery triggered')
    return false // TODO: Implement in Task 7
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
