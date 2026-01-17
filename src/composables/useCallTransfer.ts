/**
 * Call Transfer Composable
 *
 * Provides reactive call transfer functionality using SIP REFER method.
 * Supports both blind and attended transfers with state management and event handling.
 *
 * @module composables/useCallTransfer
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { CallSession } from '@/core/CallSession'
import {
  TransferType,
  TransferState,
  type TransferOptions,
  type TransferProgress,
} from '@/types/transfer.types'
import type {
  CallTransferInitiatedEvent,
  CallTransferAcceptedEvent,
  BaseEvent,
} from '@/types/events.types'
import { createLogger } from '@/utils/logger'
import { toEventBus } from '@/utils/eventBus'
import { validateSipUri } from '@/utils/validators'
import { logErrorWithContext, ErrorSeverity, createOperationTimer } from '@/utils/errorContext'

const log = createLogger('useCallTransfer')

/**
 * Transfer result interface
 */
export interface TransferResult {
  /** Whether transfer was successful */
  success: boolean
  /** Transfer ID */
  transferId?: string
  /** Error message if failed */
  error?: string
  /** Transfer state */
  state: TransferState
}

/**
 * Return type for useCallTransfer composable
 */
export interface UseCallTransferReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Current transfer state */
  transferState: Ref<TransferState>
  /** Current transfer type */
  transferType: Ref<TransferType | null>
  /** Transfer target URI */
  transferTarget: Ref<string | null>
  /** Transfer error message */
  transferError: Ref<string | null>
  /** Transfer progress information */
  transferProgress: Ref<TransferProgress | null>
  /** Is transfer currently in progress */
  isTransferring: ComputedRef<boolean>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Initiate call transfer (blind or attended) */
  transferCall: (target: string, options: TransferOptions) => Promise<TransferResult>
  /** Accept incoming transfer request */
  acceptTransfer: () => Promise<void>
  /** Reject incoming transfer request */
  rejectTransfer: (reason?: string) => Promise<void>
  /** Clear transfer state */
  clearTransfer: () => void
}

/**
 * Call Transfer Composable
 *
 * Manages SIP call transfers with reactive state, supporting both blind and attended transfer modes.
 * Integrates with CallSession core class and handles REFER method events.
 *
 * @param session - Active call session reference
 * @returns Call transfer state and methods
 *
 * @example
 * ```typescript
 * const {
 *   transferState,
 *   transferCall,
 *   acceptTransfer,
 *   rejectTransfer,
 *   isTransferring
 * } = useCallTransfer(sessionRef)
 *
 * // Blind transfer
 * await transferCall('sip:target@domain.com', {
 *   type: TransferType.Blind,
 *   target: 'sip:target@domain.com'
 * })
 *
 * // Attended transfer
 * await transferCall('sip:target@domain.com', {
 *   type: TransferType.Attended,
 *   target: 'sip:target@domain.com',
 *   consultationCallId: 'call-123'
 * })
 * ```
 */
export function useCallTransfer(session: Ref<CallSession | null>): UseCallTransferReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  const transferState = ref<TransferState>(TransferState.Idle)
  const transferType = ref<TransferType | null>(null)
  const transferTarget = ref<string | null>(null)
  const transferError = ref<string | null>(null)
  const transferProgress = ref<TransferProgress | null>(null)

  // Transfer timeout timer (30 seconds default)
  let transferTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  const TRANSFER_TIMEOUT_MS = 30000

  // Event listener cleanup functions
  const eventListenerCleanups: (() => void)[] = []

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isTransferring = computed(() => {
    return (
      transferState.value === TransferState.Initiated ||
      transferState.value === TransferState.InProgress ||
      transferState.value === TransferState.Accepted
    )
  })

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Clear transfer timeout timer
   */
  const clearTransferTimeout = (): void => {
    if (transferTimeoutTimer !== null) {
      clearTimeout(transferTimeoutTimer)
      transferTimeoutTimer = null
      log.debug('Transfer timeout cleared')
    }
  }

  /**
   * Start transfer timeout timer
   */
  const startTransferTimeout = (): void => {
    clearTransferTimeout()

    transferTimeoutTimer = setTimeout(() => {
      if (isTransferring.value) {
        log.warn('Transfer timeout after 30 seconds')
        transferState.value = TransferState.Failed
        transferError.value = 'Transfer timeout'

        // Emit timeout event
        if (session.value?.eventBus) {
          session.value.eventBus.emit('call:transfer_failed', {
            type: 'call:transfer_failed',
            target: transferTarget.value || '',
            error: 'Transfer timeout',
            timestamp: new Date(),
          })
        }
      }
    }, TRANSFER_TIMEOUT_MS)

    log.debug('Transfer timeout started (30s)')
  }

  /**
   * Generate unique transfer ID
   */
  const generateTransferId = (): string => {
    return `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate transfer prerequisites
   */
  const validateTransferPrerequisites = (target: string): void => {
    if (!session.value) {
      throw new Error('No active call session')
    }

    if (!target || target.trim() === '') {
      throw new Error('Target URI cannot be empty')
    }

    const validation = validateSipUri(target)
    if (!validation.isValid) {
      throw new Error(
        `Invalid target URI: ${validation.errors?.join(', ') || validation.error || 'Unknown error'}`
      )
    }

    if (session.value.state !== 'active') {
      throw new Error('Call must be in active state to transfer')
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Set up event listeners for transfer events
   */
  const setupEventListeners = (callSession: CallSession): void => {
    const eventBus = toEventBus(callSession.eventBus)
    if (!eventBus) {
      log.warn('Session has no eventBus, transfer events will not be handled')
      return
    }

    // Transfer initiated
    const initiatedListenerId = eventBus.on(
      'call:transfer_initiated',
      (event: CallTransferInitiatedEvent) => {
        log.debug('Transfer initiated event:', event)
        transferState.value = TransferState.Initiated
        transferType.value = (event.transferType as TransferType) || null
        transferTarget.value = event.target || null
        startTransferTimeout()
      }
    )

    // Transfer accepted
    const acceptedListenerId = eventBus.on(
      'call:transfer_accepted',
      (event: CallTransferAcceptedEvent) => {
        log.debug('Transfer accepted event:', event)
        transferState.value = TransferState.Accepted
        transferError.value = null
      }
    )

    // Transfer progress
    const progressListenerId = eventBus.on(
      'call:transfer_progress',
      (event: BaseEvent & { transferId?: string; state?: string; progress?: number }) => {
        log.debug('Transfer progress event:', event)
        transferState.value = TransferState.InProgress
        transferProgress.value = {
          id: event.transferId || '',
          state: (event.state as TransferState) || TransferState.InProgress,
          type: transferType.value || TransferType.Blind,
          target: transferTarget.value || '',
          progress: event.progress || 0,
        }
      }
    )

    // Transfer completed
    const completedListenerId = eventBus.on('call:transfer_completed', (event) => {
      log.info('Transfer completed event:', event)
      transferState.value = TransferState.Completed
      transferError.value = null
      clearTransferTimeout()
    })

    // Transfer failed
    const failedListenerId = eventBus.on('call:transfer_failed', (event) => {
      log.error('Transfer failed event:', event)
      transferState.value = TransferState.Failed
      transferError.value = event.error || 'Unknown transfer error'
      clearTransferTimeout()
    })

    // Transfer canceled
    const canceledListenerId = eventBus.on('call:transfer_canceled', (event) => {
      log.info('Transfer canceled event:', event)
      transferState.value = TransferState.Canceled
      transferError.value = null
      clearTransferTimeout()
    })

    // Store cleanup functions
    eventListenerCleanups.push(() => {
      eventBus.off('call:transfer_initiated', initiatedListenerId as number)
      eventBus.off('call:transfer_accepted', acceptedListenerId as number)
      eventBus.off('call:transfer_progress', progressListenerId as number)
      eventBus.off('call:transfer_completed', completedListenerId as number)
      eventBus.off('call:transfer_failed', failedListenerId as number)
      eventBus.off('call:transfer_canceled', canceledListenerId as number)
    })

    log.debug('Transfer event listeners set up')
  }

  /**
   * Clean up all event listeners
   */
  const cleanupEventListeners = (): void => {
    eventListenerCleanups.forEach((cleanup) => cleanup())
    eventListenerCleanups.length = 0
    log.debug('Transfer event listeners cleaned up')
  }

  // ============================================================================
  // Transfer Methods
  // ============================================================================

  /**
   * Initiate call transfer
   *
   * @param target - Target SIP URI for transfer
   * @param options - Transfer options (type, consultationCallId, extraHeaders)
   * @returns Transfer result
   * @throws {Error} If no active session
   * @throws {Error} If invalid target URI
   * @throws {Error} If call state is not suitable for transfer
   */
  const transferCall = async (
    target: string,
    options: TransferOptions
  ): Promise<TransferResult> => {
    const timer = createOperationTimer()

    try {
      log.info(`Initiating ${options.type} transfer to ${target}`)

      // Validate prerequisites
      validateTransferPrerequisites(target)

      // Clear previous transfer state
      clearTransfer()

      // Set transfer metadata
      transferType.value = options.type
      transferTarget.value = target

      // Execute transfer based on type
      if (!session.value) {
        throw new Error('No active session')
      }
      if (options.type === TransferType.Blind) {
        // Blind transfer
        await session.value.transfer(target, options.extraHeaders)
      } else if (options.type === TransferType.Attended) {
        // Attended transfer requires consultation call ID
        if (!options.consultationCallId) {
          throw new Error('Consultation call ID required for attended transfer')
        }
        await session.value.attendedTransfer(target, options.consultationCallId)
      } else {
        throw new Error(`Unsupported transfer type: ${options.type}`)
      }

      // Transfer initiated successfully
      transferState.value = TransferState.Initiated

      log.info(`Transfer initiated successfully (${timer.elapsed()}ms)`)

      return {
        success: true,
        transferId: generateTransferId(),
        state: transferState.value,
      }
    } catch (error) {
      // Handle transfer failure
      transferState.value = TransferState.Failed
      transferError.value = error instanceof Error ? error.message : String(error)

      logErrorWithContext(
        log,
        'Failed to initiate transfer',
        error,
        'transferCall',
        'useCallTransfer',
        ErrorSeverity.HIGH,
        {
          context: {
            target,
            transferType: options.type,
            consultationCallId: options.consultationCallId,
          },
          state: {
            sessionId: session.value?.id,
            sessionState: session.value?.state,
            hasEventBus: !!session.value?.eventBus,
          },
          duration: timer.elapsed(),
        }
      )

      return {
        success: false,
        error: transferError.value,
        state: transferState.value,
      }
    }
  }

  /**
   * Accept incoming transfer request
   *
   * @throws {Error} If no active session
   */
  const acceptTransfer = async (): Promise<void> => {
    if (!session.value) {
      throw new Error('No active call session')
    }

    try {
      log.info('Accepting incoming transfer request')

      // Emit accept event through event bus
      if (session.value.eventBus) {
        session.value.eventBus.emit('call:transfer_accepted', {
          type: 'call:transfer_accepted',
          target: transferTarget.value || '',
          timestamp: new Date(),
        })
      }

      transferState.value = TransferState.Accepted

      log.info('Transfer accepted')
    } catch (error) {
      log.error('Failed to accept transfer:', error)
      throw error
    }
  }

  /**
   * Reject incoming transfer request
   *
   * @param reason - Optional rejection reason
   * @throws {Error} If no active session
   */
  const rejectTransfer = async (reason?: string): Promise<void> => {
    if (!session.value) {
      throw new Error('No active call session')
    }

    try {
      log.info(`Rejecting incoming transfer request: ${reason || 'No reason provided'}`)

      // Emit reject event through event bus
      if (session.value.eventBus) {
        session.value.eventBus.emit('call:transfer_failed', {
          type: 'call:transfer_failed',
          target: transferTarget.value || '',
          error: reason || 'Transfer rejected by user',
          timestamp: new Date(),
        })
      }

      transferState.value = TransferState.Failed
      transferError.value = reason || 'Transfer rejected by user'

      log.info('Transfer rejected')
    } catch (error) {
      log.error('Failed to reject transfer:', error)
      throw error
    }
  }

  /**
   * Clear transfer state
   */
  const clearTransfer = (): void => {
    log.debug('Clearing transfer state')

    transferState.value = TransferState.Idle
    transferType.value = null
    transferTarget.value = null
    transferError.value = null
    transferProgress.value = null

    clearTransferTimeout()
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
        clearTransfer()
      }

      // Set up new session listeners
      if (newSession) {
        setupEventListeners(newSession)
      }
    },
    { immediate: true }
  )

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    log.debug('useCallTransfer composable unmounting')
    cleanupEventListeners()
    clearTransferTimeout()
    clearTransfer()
  })

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // State
    transferState,
    transferType,
    transferTarget,
    transferError,
    transferProgress,
    isTransferring,

    // Methods
    transferCall,
    acceptTransfer,
    rejectTransfer,
    clearTransfer,
  }
}
