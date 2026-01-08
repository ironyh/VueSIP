/**
 * Call Hold Composable
 *
 * Provides reactive call hold/resume functionality using SDP manipulation.
 * Supports both local and remote hold detection with state management and event handling.
 *
 * @module composables/useCallHold
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { CallSession } from '@/core/CallSession'
import { HoldState, type HoldOptions, type HoldEvent, type HoldResult } from '@/types/call.types'
import type { BaseEvent } from '@/types/events.types'
import { createLogger } from '@/utils/logger'
import { logErrorWithContext, ErrorSeverity, createOperationTimer } from '@/utils/errorContext'

const log = createLogger('useCallHold')

/**
 * Return type for useCallHold composable
 */
export interface UseCallHoldReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Current hold state */
  holdState: Ref<HoldState>
  /** Is call on hold (local) */
  isOnHold: ComputedRef<boolean>
  /** Is call on hold by local party */
  isLocalHold: ComputedRef<boolean>
  /** Is call on hold by remote party */
  isRemoteHold: ComputedRef<boolean>
  /** Is hold operation in progress */
  isHolding: ComputedRef<boolean>
  /** Is resume operation in progress */
  isResuming: ComputedRef<boolean>
  /** Hold error message */
  holdError: Ref<string | null>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Place call on hold */
  holdCall: (options?: HoldOptions) => Promise<HoldResult>
  /** Resume call from hold */
  resumeCall: () => Promise<HoldResult>
  /** Toggle hold state */
  toggleHold: () => Promise<HoldResult>
  /** Clear hold state and errors */
  clearHold: () => void
}

/**
 * Call Hold Composable
 *
 * Manages SIP call hold/resume with reactive state, supporting SDP manipulation for hold state.
 * Integrates with CallSession core class and handles hold/unhold events.
 *
 * @param session - Active call session reference
 * @returns Call hold state and methods
 *
 * @example
 * ```typescript
 * const {
 *   holdState,
 *   isOnHold,
 *   isLocalHold,
 *   isRemoteHold,
 *   holdCall,
 *   resumeCall,
 *   toggleHold
 * } = useCallHold(sessionRef)
 *
 * // Place call on hold
 * await holdCall()
 *
 * // Resume from hold
 * await resumeCall()
 *
 * // Toggle hold state
 * await toggleHold()
 * ```
 */
export function useCallHold(session: Ref<CallSession | null>): UseCallHoldReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  const holdState = ref<HoldState>(HoldState.Active)
  const holdError = ref<string | null>(null)

  // Hold timeout timer (5 seconds default)
  let holdTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  const HOLD_TIMEOUT_MS = 5000

  // Event listener cleanup functions
  const eventListenerCleanups: (() => void)[] = []

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isOnHold = computed(() => {
    return holdState.value === HoldState.Held || holdState.value === HoldState.RemoteHeld
  })

  const isLocalHold = computed(() => {
    return holdState.value === HoldState.Held
  })

  const isRemoteHold = computed(() => {
    return holdState.value === HoldState.RemoteHeld
  })

  const isHolding = computed(() => {
    return holdState.value === HoldState.Holding
  })

  const isResuming = computed(() => {
    return holdState.value === HoldState.Resuming
  })

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Clear hold timeout timer
   */
  const clearHoldTimeout = (): void => {
    if (holdTimeoutTimer !== null) {
      clearTimeout(holdTimeoutTimer)
      holdTimeoutTimer = null
      log.debug('Hold timeout cleared')
    }
  }

  /**
   * Start hold timeout timer
   */
  const startHoldTimeout = (operation: 'hold' | 'unhold'): void => {
    clearHoldTimeout()

    holdTimeoutTimer = setTimeout(() => {
      if (
        (operation === 'hold' && holdState.value === HoldState.Holding) ||
        (operation === 'unhold' && holdState.value === HoldState.Resuming)
      ) {
        log.warn(`${operation} operation timeout after ${HOLD_TIMEOUT_MS}ms`)
        holdState.value = HoldState.Active
        holdError.value = `${operation} operation timeout`

        // Emit timeout event
        if (session.value?.eventBus) {
          session.value.eventBus.emit('call:hold_failed', {
            type: `${operation}_failed`,
            state: holdState.value,
            originator: 'local',
            error: `${operation} operation timeout`,
            callId: session.value.id,
            timestamp: new Date(),
          } as HoldEvent)
        }
      }
    }, HOLD_TIMEOUT_MS)

    log.debug(`${operation} timeout started (${HOLD_TIMEOUT_MS}ms)`)
  }

  /**
   * Validate hold prerequisites
   */
  const validateHoldPrerequisites = (operation: 'hold' | 'unhold'): void => {
    if (!session.value) {
      throw new Error('No active call session')
    }

    if (session.value.state !== 'active' && session.value.state !== 'held') {
      throw new Error(`Call must be in active or held state to ${operation}`)
    }

    if (operation === 'hold' && holdState.value === HoldState.Held) {
      throw new Error('Call is already on hold')
    }

    if (operation === 'unhold' && holdState.value !== HoldState.Held) {
      throw new Error('Call is not on hold')
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Set up event listeners for hold events
   */
  const setupEventListeners = (callSession: CallSession): void => {
    const eventBus = callSession.eventBus
    if (!eventBus) {
      log.warn('Session has no eventBus, hold events will not be handled')
      return
    }

    // Hold event
    const holdListenerId = eventBus.on('call:hold', (event) => {
      log.debug('Hold event:', event)

      if (event.originator === 'local') {
        holdState.value = HoldState.Held
        holdError.value = null
        clearHoldTimeout()
      } else {
        holdState.value = HoldState.RemoteHeld
      }
    })

    // Unhold event
    const unholdListenerId = eventBus.on('call:unhold', (event) => {
      log.debug('Unhold event:', event)

      if (event.originator === 'local') {
        holdState.value = HoldState.Active
        holdError.value = null
        clearHoldTimeout()
      } else if (holdState.value === HoldState.RemoteHeld) {
        holdState.value = HoldState.Active
      }
    })

    // Hold failed event
    const holdFailedListenerId = eventBus.on(
      'call:hold_failed',
      (event: BaseEvent & { error?: string }) => {
        log.error('Hold failed event:', event)
        holdState.value = HoldState.Active
        holdError.value = event.error || 'Hold operation failed'
        clearHoldTimeout()
      }
    )

    // Unhold failed event
    const unholdFailedListenerId = eventBus.on(
      'call:unhold_failed',
      (event: BaseEvent & { error?: string }) => {
        log.error('Unhold failed event:', event)
        holdState.value = HoldState.Held
        holdError.value = event.error || 'Unhold operation failed'
        clearHoldTimeout()
      }
    )

    // Store cleanup functions
    eventListenerCleanups.push(() => {
      eventBus.off('call:hold', holdListenerId)
      eventBus.off('call:unhold', unholdListenerId)
      eventBus.off('call:hold_failed', holdFailedListenerId)
      eventBus.off('call:unhold_failed', unholdFailedListenerId)
    })

    log.debug('Hold event listeners set up')
  }

  /**
   * Clean up all event listeners
   */
  const cleanupEventListeners = (): void => {
    eventListenerCleanups.forEach((cleanup) => cleanup())
    eventListenerCleanups.length = 0
    log.debug('Hold event listeners cleaned up')
  }

  // ============================================================================
  // Hold Methods
  // ============================================================================

  /**
   * Place call on hold
   *
   * @param options - Hold options
   * @returns Hold result
   * @throws {Error} If no active session
   * @throws {Error} If call is already on hold
   * @throws {Error} If call state is not suitable for hold
   */
  const holdCall = async (options?: HoldOptions): Promise<HoldResult> => {
    const timer = createOperationTimer()

    try {
      log.info('Placing call on hold')

      // Validate prerequisites
      validateHoldPrerequisites('hold')

      // Clear previous error
      holdError.value = null

      // Update state to holding
      holdState.value = HoldState.Holding

      // Start timeout timer
      startHoldTimeout('hold')

      // Execute hold via session
      if (!session.value) {
        throw new Error('No active session')
      }
      await session.value.hold()

      // State will be updated via event listener
      log.info(`Call placed on hold successfully (${timer.elapsed()}ms)`)

      return {
        success: true,
        state: holdState.value,
      }
    } catch (error) {
      // Handle hold failure
      holdState.value = HoldState.Active
      holdError.value = error instanceof Error ? error.message : String(error)

      logErrorWithContext(
        log,
        'Failed to place call on hold',
        error,
        'holdCall',
        'useCallHold',
        ErrorSeverity.MEDIUM,
        {
          context: {
            options,
          },
          state: {
            sessionId: session.value?.id,
            sessionState: session.value?.state,
            holdState: holdState.value,
          },
          duration: timer.elapsed(),
        }
      )

      return {
        success: false,
        error: holdError.value,
        state: holdState.value,
      }
    }
  }

  /**
   * Resume call from hold
   *
   * @returns Hold result
   * @throws {Error} If no active session
   * @throws {Error} If call is not on hold
   */
  const resumeCall = async (): Promise<HoldResult> => {
    const timer = createOperationTimer()

    try {
      log.info('Resuming call from hold')

      // Validate prerequisites
      validateHoldPrerequisites('unhold')

      // Clear previous error
      holdError.value = null

      // Update state to resuming
      holdState.value = HoldState.Resuming

      // Start timeout timer
      startHoldTimeout('unhold')

      // Execute unhold via session
      if (!session.value) {
        throw new Error('No active session')
      }
      await session.value.unhold()

      // State will be updated via event listener
      log.info(`Call resumed from hold successfully (${timer.elapsed()}ms)`)

      return {
        success: true,
        state: holdState.value,
      }
    } catch (error) {
      // Handle unhold failure
      holdState.value = HoldState.Held
      holdError.value = error instanceof Error ? error.message : String(error)

      logErrorWithContext(
        log,
        'Failed to resume call from hold',
        error,
        'resumeCall',
        'useCallHold',
        ErrorSeverity.MEDIUM,
        {
          context: {},
          state: {
            sessionId: session.value?.id,
            sessionState: session.value?.state,
            holdState: holdState.value,
          },
          duration: timer.elapsed(),
        }
      )

      return {
        success: false,
        error: holdError.value,
        state: holdState.value,
      }
    }
  }

  /**
   * Toggle hold state
   *
   * @returns Hold result
   */
  const toggleHold = async (): Promise<HoldResult> => {
    if (isLocalHold.value) {
      return resumeCall()
    } else {
      return holdCall()
    }
  }

  /**
   * Clear hold state and errors
   */
  const clearHold = (): void => {
    log.debug('Clearing hold state')

    holdState.value = HoldState.Active
    holdError.value = null

    clearHoldTimeout()
  }

  // ============================================================================
  // Watchers
  // ============================================================================

  // Watch for session changes
  watch(
    session,
    (newSession, oldSession) => {
      // Clean up old session listeners
      if (oldSession !== newSession) {
        cleanupEventListeners()
        clearHold()
      }

      // Set up new session listeners
      if (newSession) {
        setupEventListeners(newSession)

        // Sync initial hold state from session
        if (newSession.isOnHold) {
          holdState.value = HoldState.Held
        } else {
          holdState.value = HoldState.Active
        }
      }
    },
    { immediate: true }
  )

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    log.debug('useCallHold composable unmounting')
    cleanupEventListeners()
    clearHoldTimeout()
    clearHold()
  })

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // State
    holdState,
    isOnHold,
    isLocalHold,
    isRemoteHold,
    isHolding,
    isResuming,
    holdError,

    // Methods
    holdCall,
    resumeCall,
    toggleHold,
    clearHold,
  }
}
