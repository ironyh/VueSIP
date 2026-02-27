/**
 * Call Waiting Composable
 *
 * Manages incoming calls while another call is active, providing a queue
 * of waiting calls with accept, reject, ignore, and swap functionality.
 *
 * @module composables/useCallWaiting
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { CallSession } from '../types/call.types'
import type { SipClient } from '../core/SipClient'
import { createLogger } from '../utils/logger'
import { CALL_WAITING_CONSTANTS } from './constants'
import { type ExtendedCallSession } from './types'

const log = createLogger('useCallWaiting')

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a waiting call
 */
export interface WaitingCall {
  /** Unique call ID */
  callId: string
  /** Caller SIP URI */
  callerUri: string
  /** Caller display name */
  callerName: string
  /** Timestamp when the call started waiting */
  waitingSince: number
  /** The underlying call session */
  session: CallSession
}

/**
 * Options for the useCallWaiting composable
 */
export interface CallWaitingOptions {
  /** Maximum number of waiting calls (default: 5) */
  maxWaitingCalls?: number
  /** Auto-reject timeout in ms (0 = never auto-reject) */
  autoRejectAfter?: number
  /** Play a waiting tone notification (default: true) */
  playWaitingTone?: boolean
}

/**
 * Return type for useCallWaiting composable
 */
export interface UseCallWaitingReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** List of waiting calls */
  waitingCalls: Ref<WaitingCall[]>
  /** Whether there is at least one waiting call */
  hasWaitingCall: ComputedRef<boolean>
  /** Number of waiting calls */
  waitingCallCount: ComputedRef<number>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Add an incoming call to the waiting queue */
  addIncomingCall: (session: CallSession) => void
  /** Accept a waiting call (hold current, answer waiting) */
  acceptWaiting: (callId: string) => Promise<void>
  /** Reject a specific waiting call */
  rejectWaiting: (callId: string) => Promise<void>
  /** Reject all waiting calls */
  rejectAllWaiting: () => Promise<void>
  /** Swap between active and most recent held call */
  swapCalls: () => Promise<void>
}

/**
 * Call Waiting Composable
 *
 * Manages a queue of incoming calls while a call is active, providing
 * coordination for accept (hold current + answer waiting), reject, and swap operations.
 *
 * @param currentSession - Ref to the currently active call session
 * @param sipClient - Ref to the SIP client instance
 * @param options - Call waiting configuration options
 * @returns Call waiting state and methods
 *
 * @example
 * ```typescript
 * const {
 *   waitingCalls,
 *   hasWaitingCall,
 *   waitingCallCount,
 *   addIncomingCall,
 *   acceptWaiting,
 *   rejectWaiting,
 *   rejectAllWaiting,
 *   swapCalls
 * } = useCallWaiting(currentSession, sipClient, {
 *   maxWaitingCalls: 3,
 *   autoRejectAfter: 30000,
 *   playWaitingTone: true
 * })
 *
 * // When a new incoming call arrives while busy
 * addIncomingCall(incomingSession)
 *
 * // Accept the waiting call (holds current, answers waiting)
 * await acceptWaiting(waitingCalls.value[0].callId)
 *
 * // Swap between active and held call
 * await swapCalls()
 * ```
 */
export function useCallWaiting(
  currentSession: Ref<CallSession | null>,
  _sipClient: Ref<SipClient | null>,
  options: CallWaitingOptions = {}
): UseCallWaitingReturn {
  // ============================================================================
  // Configuration
  // ============================================================================

  const {
    maxWaitingCalls = CALL_WAITING_CONSTANTS.DEFAULT_MAX_WAITING_CALLS,
    autoRejectAfter = CALL_WAITING_CONSTANTS.DEFAULT_AUTO_REJECT_AFTER,
    playWaitingTone = CALL_WAITING_CONSTANTS.DEFAULT_PLAY_WAITING_TONE,
  } = options

  // ============================================================================
  // Reactive State
  // ============================================================================

  const waitingCalls = ref<WaitingCall[]>([])

  /** Track auto-reject timers by callId */
  const autoRejectTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** Track the most recently held session for swap */
  const heldSession = ref<CallSession | null>(null)

  // ============================================================================
  // Computed Values
  // ============================================================================

  const hasWaitingCall = computed(() => waitingCalls.value.length > 0)

  const waitingCallCount = computed(() => waitingCalls.value.length)

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  /**
   * Remove a waiting call from the queue by callId
   */
  const removeFromQueue = (callId: string): WaitingCall | undefined => {
    const index = waitingCalls.value.findIndex((wc) => wc.callId === callId)
    if (index === -1) {
      return undefined
    }
    const [removed] = waitingCalls.value.splice(index, 1)
    clearAutoRejectTimer(callId)
    return removed
  }

  /**
   * Clear an auto-reject timer for a specific call
   */
  const clearAutoRejectTimer = (callId: string): void => {
    const timer = autoRejectTimers.get(callId)
    if (timer) {
      clearTimeout(timer)
      autoRejectTimers.delete(callId)
    }
  }

  /**
   * Clear all auto-reject timers
   */
  const clearAllAutoRejectTimers = (): void => {
    for (const [callId, timer] of autoRejectTimers) {
      clearTimeout(timer)
      autoRejectTimers.delete(callId)
    }
  }

  /**
   * Set up an auto-reject timer for a waiting call
   */
  const setupAutoRejectTimer = (callId: string): void => {
    if (autoRejectAfter <= 0) return

    const timer = setTimeout(() => {
      log.info(`Auto-rejecting waiting call ${callId} after ${autoRejectAfter}ms`)
      rejectWaiting(callId).catch((error) => {
        log.error(`Failed to auto-reject call ${callId}:`, error)
      })
    }, autoRejectAfter)

    autoRejectTimers.set(callId, timer)
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Add an incoming call to the waiting queue
   *
   * @param session - The incoming call session to queue
   */
  const addIncomingCall = (session: CallSession): void => {
    // Check if queue is full
    if (waitingCalls.value.length >= maxWaitingCalls) {
      log.warn(`Waiting queue full (max: ${maxWaitingCalls}), rejecting call ${session.id}`)
      const extSession = session as ExtendedCallSession
      if (extSession.hangup) {
        extSession.hangup().catch((error) => {
          log.error(`Failed to reject overflow call ${session.id}:`, error)
        })
      }
      return
    }

    // Check for duplicate
    if (waitingCalls.value.some((wc) => wc.callId === session.id)) {
      log.warn(`Call ${session.id} is already in the waiting queue`)
      return
    }

    const callerUri =
      typeof session.remoteUri === 'string'
        ? session.remoteUri
        : (session.remoteUri?.toString() ?? 'unknown')

    const waitingCall: WaitingCall = {
      callId: session.id,
      callerUri,
      callerName: session.remoteDisplayName ?? callerUri,
      waitingSince: Date.now(),
      session,
    }

    waitingCalls.value.push(waitingCall)
    log.info(`Added call ${session.id} to waiting queue (count: ${waitingCalls.value.length})`)

    if (playWaitingTone) {
      log.debug('Call waiting tone notification triggered')
    }

    // Set up auto-reject timer
    setupAutoRejectTimer(session.id)
  }

  /**
   * Accept a waiting call
   *
   * Holds the current active call and answers the specified waiting call.
   *
   * @param callId - ID of the waiting call to accept
   * @throws Error if call not found in queue or operations fail
   */
  const acceptWaiting = async (callId: string): Promise<void> => {
    const waitingCall = removeFromQueue(callId)
    if (!waitingCall) {
      const error = `Call ${callId} not found in waiting queue`
      log.error(error)
      throw new Error(error)
    }

    try {
      // Hold the current active call
      if (currentSession.value) {
        const currentExt = currentSession.value as ExtendedCallSession
        if (currentExt.hold) {
          log.debug(`Holding current call ${currentSession.value.id}`)
          await currentExt.hold()
          heldSession.value = currentSession.value
        } else {
          log.warn('Current session does not support hold')
        }
      }

      const waitingExt = waitingCall.session as ExtendedCallSession
      if (waitingExt.answer) {
        log.debug(`Answering waiting call ${callId}`)
        await waitingExt.answer()
        currentSession.value = waitingCall.session
      } else {
        log.warn('Waiting session does not support answer()')
      }

      log.info(`Accepted waiting call ${callId}`)
    } catch (error) {
      log.error(`Failed to accept waiting call ${callId}:`, error)
      throw error
    }
  }

  /**
   * Reject a specific waiting call
   *
   * @param callId - ID of the waiting call to reject
   * @throws Error if call not found in queue or reject fails
   */
  const rejectWaiting = async (callId: string): Promise<void> => {
    const waitingCall = removeFromQueue(callId)
    if (!waitingCall) {
      const error = `Call ${callId} not found in waiting queue`
      log.error(error)
      throw new Error(error)
    }

    try {
      const extSession = waitingCall.session as ExtendedCallSession
      if (extSession.hangup) {
        log.debug(`Rejecting waiting call ${callId}`)
        await extSession.hangup()
      }
      log.info(`Rejected waiting call ${callId}`)
    } catch (error) {
      log.error(`Failed to reject waiting call ${callId}:`, error)
      throw error
    }
  }

  /**
   * Reject all waiting calls
   */
  const rejectAllWaiting = async (): Promise<void> => {
    const calls = [...waitingCalls.value]
    waitingCalls.value = []
    clearAllAutoRejectTimers()

    const errors: Error[] = []

    for (const waitingCall of calls) {
      try {
        const extSession = waitingCall.session as ExtendedCallSession
        if (extSession.hangup) {
          await extSession.hangup()
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        errors.push(err)
        log.error(`Failed to reject call ${waitingCall.callId}:`, error)
      }
    }

    log.info(`Rejected all waiting calls (${calls.length} total, ${errors.length} errors)`)

    if (errors.length > 0) {
      throw new Error(`Failed to reject ${errors.length} of ${calls.length} waiting calls`)
    }
  }

  /**
   * Swap between active and most recent held call
   *
   * Holds the current active call and resumes the most recently held call.
   *
   * @throws Error if no held call to swap with or operations fail
   */
  const swapCalls = async (): Promise<void> => {
    if (!heldSession.value) {
      const error = 'No held call to swap with'
      log.error(error)
      throw new Error(error)
    }

    if (!currentSession.value) {
      const error = 'No active call to swap'
      log.error(error)
      throw new Error(error)
    }

    try {
      const currentExt = currentSession.value as ExtendedCallSession
      const heldExt = heldSession.value as ExtendedCallSession

      // Hold the current call
      if (currentExt.hold) {
        log.debug(`Holding current call ${currentSession.value.id}`)
        await currentExt.hold()
      }

      // Resume the held call
      if (heldExt.unhold) {
        log.debug(`Resuming held call ${heldSession.value.id}`)
        await heldExt.unhold()
      }

      // Swap references
      const previouslyHeld = heldSession.value
      heldSession.value = currentSession.value
      currentSession.value = previouslyHeld

      log.info('Swapped active and held calls')
    } catch (error) {
      log.error('Failed to swap calls:', error)
      throw error
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    log.debug('Composable unmounting, clearing call waiting state')
    clearAllAutoRejectTimers()
    waitingCalls.value = []
    heldSession.value = null
  })

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // State
    waitingCalls,
    hasWaitingCall,
    waitingCallCount,

    // Methods
    addIncomingCall,
    acceptWaiting,
    rejectWaiting,
    rejectAllWaiting,
    swapCalls,
  }
}
