/**
 * Call Session Composable
 *
 * Provides reactive call session management with support for outgoing/incoming calls,
 * call controls (hold, mute, DTMF), media streams, and call statistics.
 *
 * @module composables/useCallSession
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { CallSession } from '../core/CallSession'
import { toEventBus } from '@/utils/eventBus'
import type { CallSessionEventMap } from '@/types/call-internal.types'
import type { EventMap } from '@/types/events.types'
import { MediaManager } from '../core/MediaManager'
import { callStore } from '../stores/callStore'
import type { SipClient } from '../core/SipClient'
import type {
  CallState,
  CallDirection,
  AnswerOptions,
  DTMFOptions,
  CallTimingInfo,
} from '../types/call.types'
import { TransferState } from '../types/transfer.types'
import type { CallStatistics, TerminationCause } from '../types/call.types'
import type { TransferOptions, TransferResult } from '../types/transfer.types'
import { createLogger } from '../utils/logger'
import { validateSipUri } from '@/utils/validators'
import { throwIfAborted, isAbortError } from '../utils/abortController'
import { ErrorSeverity, logErrorWithContext, createOperationTimer } from '../utils/errorContext'
import { usePictureInPicture } from './usePictureInPicture'

const log = createLogger('useCallSession')

/**
 * Call session options
 */
export interface CallSessionOptions {
  /** Enable audio (default: true) */
  audio?: boolean
  /** Enable video (default: false) */
  video?: boolean
  /** Custom call data */
  data?: Record<string, unknown>
  /** Auto-cleanup on hangup (default: true) */
  autoCleanup?: boolean
}

/**
 * Return type for useCallSession composable
 */
export interface UseCallSessionReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Active call session */
  session: Ref<CallSession | null>
  /** Call state */
  state: ComputedRef<CallState>
  /** Call ID */
  callId: ComputedRef<string | null>
  /** Call direction */
  direction: ComputedRef<CallDirection | null>
  /** Local SIP URI */
  localUri: ComputedRef<string | null>
  /** Remote SIP URI */
  remoteUri: ComputedRef<string | null>
  /** Remote display name */
  remoteDisplayName: ComputedRef<string | null>
  /** Is call active */
  isActive: ComputedRef<boolean>
  /** Is on hold */
  isOnHold: ComputedRef<boolean>
  /** Is muted */
  isMuted: ComputedRef<boolean>
  /** Has remote video */
  hasRemoteVideo: ComputedRef<boolean>
  /** Has local video */
  hasLocalVideo: ComputedRef<boolean>
  /** Local media stream */
  localStream: ComputedRef<MediaStream | null>
  /** Remote media stream */
  remoteStream: ComputedRef<MediaStream | null>
  /** Call timing information */
  timing: ComputedRef<CallTimingInfo>
  /** Call duration in seconds (if active) */
  duration: ComputedRef<number>
  /** Termination cause (if ended) */
  terminationCause: ComputedRef<TerminationCause | undefined>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Make an outgoing call with optional abort signal */
  makeCall: (target: string, options?: CallSessionOptions, signal?: AbortSignal) => Promise<void>
  /** Answer an incoming call */
  answer: (options?: AnswerOptions) => Promise<void>
  /** Reject an incoming call */
  reject: (statusCode?: number) => Promise<void>
  /** Hangup the call */
  hangup: () => Promise<void>
  /** Put call on hold */
  hold: () => Promise<void>
  /** Resume call from hold */
  unhold: () => Promise<void>
  /** Toggle hold state */
  toggleHold: () => Promise<void>
  /** Mute audio */
  mute: () => void
  /** Unmute audio */
  unmute: () => void
  /** Toggle mute state */
  toggleMute: () => void
  /** Disable video */
  disableVideo: () => void
  /** Enable video */
  enableVideo: () => void
  /** Toggle video state */
  toggleVideo: () => void
  /** Send DTMF tone */
  sendDTMF: (tone: string, options?: DTMFOptions) => Promise<void>
  /** Get call statistics */
  getStats: () => Promise<CallStatistics | null>
  /** Clear current session */
  clearSession: () => void
  /** Transfer call (blind or attended) */
  transferCall: (target: string, options: TransferOptions) => Promise<TransferResult>

  // ============================================================================
  // Picture-in-Picture Integration
  // ============================================================================

  /** Whether PiP is supported by the browser */
  isPiPSupported: Ref<boolean>
  /** Whether PiP mode is currently active */
  isPiPActive: Ref<boolean>
  /** Current PiP window reference (dimensions accessible) */
  pipWindow: Ref<PictureInPictureWindow | null>
  /** Current PiP error state */
  pipError: Ref<Error | null>
  /** Set video element for PiP */
  setVideoRef: (element: HTMLVideoElement | null) => void
  /**
   * Enter PiP mode
   * @param videoElement - Optional video element to use (if not provided, uses element from setVideoRef)
   * @returns The PictureInPictureWindow if successful, null otherwise
   */
  enterPiP: (videoElement?: HTMLVideoElement) => Promise<PictureInPictureWindow | null>
  /** Exit PiP mode */
  exitPiP: () => Promise<void>
  /**
   * Toggle PiP mode
   * @param videoElement - Optional video element to use (if not provided, uses element from setVideoRef)
   */
  togglePiP: (videoElement?: HTMLVideoElement) => Promise<void>
}

/**
 * Call Session Composable
 *
 * Manages SIP call sessions with reactive state, media handling, and call controls.
 * Integrates with CallSession core class, MediaManager, and callStore.
 *
 * @param sipClient - SIP client instance
 * @param mediaManager - Media manager instance (optional, will create if not provided)
 * @returns Call session state and methods
 *
 * @example
 * ```typescript
 * const {
 *   state,
 *   makeCall,
 *   answer,
 *   hangup,
 *   hold,
 *   unhold,
 *   mute,
 *   sendDTMF
 * } = useCallSession(sipClient, mediaManager)
 *
 * // Make a call
 * await makeCall('sip:bob@domain.com', { audio: true, video: false })
 *
 * // Answer incoming call
 * await answer()
 *
 * // Put on hold
 * await hold()
 *
 * // Send DTMF
 * await sendDTMF('1')
 *
 * // Hangup
 * await hangup()
 * ```
 */
export function useCallSession(
  sipClient: Ref<SipClient | null>,
  mediaManager?: Ref<MediaManager | null>
): UseCallSessionReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  const session = ref<CallSession | null>(null)

  // ============================================================================
  // Picture-in-Picture Integration
  // ============================================================================

  // Video element ref for PiP - set by setVideoRef()
  const pipVideoRef = ref<HTMLVideoElement | null>(null)

  // Initialize PiP composable with persistence enabled
  const pip = usePictureInPicture(pipVideoRef, { persistPreference: true })

  /**
   * Set the video element reference for Picture-in-Picture
   * @param element - HTMLVideoElement to use for PiP, or null to clear
   */
  const setVideoRef = (element: HTMLVideoElement | null): void => {
    pipVideoRef.value = element
    log.debug('PiP video ref updated', { hasElement: !!element })
  }

  /**
   * Enter Picture-in-Picture mode
   * Supports both patterns:
   * 1. Call with videoElement parameter directly
   * 2. Use element set via setVideoRef() if no parameter provided
   *
   * @param videoElement - Optional video element to use for PiP
   * @returns The PictureInPictureWindow if successful, null otherwise
   */
  const enterPiP = async (
    videoElement?: HTMLVideoElement
  ): Promise<PictureInPictureWindow | null> => {
    // If videoElement provided, set it first
    if (videoElement) {
      setVideoRef(videoElement)
    }
    await pip.enterPiP()
    // Explicitly return null if pipWindow is undefined/null for spec compliance
    return pip.pipWindow.value ?? null
  }

  /**
   * Toggle Picture-in-Picture mode
   * Supports both patterns:
   * 1. Call with videoElement parameter directly
   * 2. Use element set via setVideoRef() if no parameter provided
   *
   * @param videoElement - Optional video element to use for PiP
   */
  const togglePiP = async (videoElement?: HTMLVideoElement): Promise<void> => {
    // If videoElement provided and not currently in PiP, set it first
    if (videoElement && !pip.isPiPActive.value) {
      setVideoRef(videoElement)
    }
    return pip.togglePiP()
  }

  // Duration tracking (updated every second when in call)
  const durationSeconds = ref(0)
  let durationInterval: number | null = null

  // Concurrent operation guard to prevent race conditions
  const isOperationInProgress = ref(false)

  // Internal AbortController for automatic cleanup on unmount
  const internalAbortController = ref(new AbortController())

  // Session state version - incremented to force Vue reactivity updates
  // when CallSession internal state changes (needed because Vue doesn't track
  // internal properties of objects stored in refs)
  const sessionStateVersion = ref(0)

  // Cleanup function for session event listeners
  let sessionEventCleanup: (() => void) | null = null

  /**
   * Set up event listeners on a CallSession to track state changes
   * and force Vue reactivity updates when the internal state changes.
   */
  const setupSessionEventListeners = (callSession: CallSession): void => {
    // Clean up previous listeners if any
    if (sessionEventCleanup) {
      sessionEventCleanup()
      sessionEventCleanup = null
    }

    // Get the eventBus from the session
    type CombinedEventMap = EventMap & CallSessionEventMap
    const eventBus = toEventBus<CombinedEventMap>(callSession.eventBus)
    if (!eventBus) {
      log.warn('Session has no eventBus, state changes may not be reactive')
      return
    }

    // Listen for state changes and increment version to trigger reactivity
    // EventBus.on() returns a listener ID string
    const stateChangedListenerId = eventBus.on('call:state_changed', () => {
      sessionStateVersion.value++
      log.debug(`Session state changed, version: ${sessionStateVersion.value}`)
    })

    // Also listen for confirmed, ended, hold, unhold events
    const confirmedListenerId = eventBus.on('call:confirmed', () => {
      sessionStateVersion.value++
    })
    const endedListenerId = eventBus.on('call:ended', () => {
      sessionStateVersion.value++
    })
    const holdListenerId = eventBus.on('call:hold', () => {
      sessionStateVersion.value++
    })
    const unholdListenerId = eventBus.on('call:unhold', () => {
      sessionStateVersion.value++
    })
    const mutedListenerId = eventBus.on('call:muted', () => {
      sessionStateVersion.value++
    })
    const unmutedListenerId = eventBus.on('call:unmuted', () => {
      sessionStateVersion.value++
    })

    // Store cleanup function that removes listeners by their IDs
    sessionEventCleanup = () => {
      eventBus.off('call:state_changed', stateChangedListenerId as unknown as string)
      eventBus.off('call:confirmed', confirmedListenerId as number)
      eventBus.off('call:ended', endedListenerId as number)
      eventBus.off('call:hold', holdListenerId as number)
      eventBus.off('call:unhold', unholdListenerId as number)
      eventBus.off('call:muted', mutedListenerId as number)
      eventBus.off('call:unmuted', unmutedListenerId as number)
    }
  }

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Include sessionStateVersion in the dependency to force re-computation
  // when CallSession internal state changes
  const state = computed<CallState>(() => {
    // Access sessionStateVersion to create a dependency
    const _version = sessionStateVersion.value
    void _version // Explicitly mark as used
    return session.value?.state ?? ('idle' as CallState)
  })

  const callId = computed(() => session.value?.id ?? null)
  const direction = computed(() => session.value?.direction ?? null)
  const localUri = computed(() => session.value?.localUri ?? null)
  const remoteUri = computed(() => session.value?.remoteUri ?? null)
  const remoteDisplayName = computed(() => session.value?.remoteDisplayName ?? null)

  const isActive = computed(() => {
    const s = state.value
    return (
      s === 'active' ||
      s === 'ringing' ||
      s === 'calling' ||
      s === 'answering' ||
      s === 'early_media'
    )
  })

  const isOnHold = computed(() => {
    const _version = sessionStateVersion.value
    void _version // Force dependency on version for reactivity
    return session.value?.isOnHold ?? false
  })
  const isMuted = computed(() => {
    const _version = sessionStateVersion.value
    void _version // Force dependency on version for reactivity
    return session.value?.isMuted ?? false
  })
  const hasRemoteVideo = computed(() => {
    const _version = sessionStateVersion.value
    void _version // Force dependency on version for reactivity
    return session.value?.hasRemoteVideo ?? false
  })
  const hasLocalVideo = computed(() => {
    const _version = sessionStateVersion.value
    void _version // Force dependency on version for reactivity
    return session.value?.hasLocalVideo ?? false
  })

  const localStream = computed(() => session.value?.localStream ?? null)
  const remoteStream = computed(() => session.value?.remoteStream ?? null)

  const timing = computed<CallTimingInfo>(() => session.value?.timing ?? {})

  const duration = computed(() => durationSeconds.value)

  const terminationCause = computed(() => session.value?.terminationCause)

  // ============================================================================
  // Duration Tracking
  // ============================================================================

  /**
   * Start duration tracking timer
   */
  const startDurationTracking = (): void => {
    stopDurationTracking()

    durationInterval = window.setInterval(() => {
      if (session.value && session.value.timing.answerTime) {
        const now = new Date().getTime()
        const answerTime = session.value.timing.answerTime.getTime()
        durationSeconds.value = Math.floor((now - answerTime) / 1000)
      }
    }, 1000) // Update every second

    log.debug('Started duration tracking')
  }

  /**
   * Stop duration tracking timer
   */
  const stopDurationTracking = (): void => {
    if (durationInterval !== null) {
      clearInterval(durationInterval)
      durationInterval = null
      log.debug('Stopped duration tracking')
    }
  }

  /**
   * Reset duration
   */
  const resetDuration = (): void => {
    durationSeconds.value = 0
  }

  // Watch state to start/stop duration tracking and auto-exit PiP
  watch(
    state,
    (newState, oldState) => {
      try {
        if (newState === 'active' && oldState !== 'active') {
          startDurationTracking()
        } else if (newState === 'terminated' || newState === 'failed') {
          // Stop timer on terminated OR failed state to prevent leaks
          if (oldState !== newState) {
            stopDurationTracking()
          }
          // Auto-exit PiP when call ends
          if (pip.isPiPActive.value) {
            log.debug('Auto-exiting PiP due to call end')
            pip.exitPiP().catch((error) => {
              log.warn('Failed to auto-exit PiP:', error)
            })
          }
        } else if (oldState === 'active' && newState !== 'active') {
          // Catch-all: Stop timer when leaving 'active' state for ANY reason
          // This prevents memory leak if state changes unexpectedly
          stopDurationTracking()
        }
      } catch (error) {
        log.error('Error in state watcher:', error)
        // Always stop timer on any error to prevent leaks
        stopDurationTracking()
      }
    },
    { flush: 'sync' }
  )

  // ============================================================================
  // Call Methods
  // ============================================================================

  /**
   * Make an outgoing call
   *
   * @param target - Target SIP URI (e.g., 'sip:bob@domain.com' or just 'bob')
   * @param options - Call options
   * @returns Promise that resolves when call is initiated
   * @throws {Error} If another call operation is already in progress
   * @throws {Error} If SIP client is not initialized
   * @throws {Error} If target URI is empty or whitespace-only
   * @throws {Error} If target URI format is invalid
   * @throws {Error} If media acquisition fails
   * @throws {Error} If call initiation fails
   */
  /**
   * Make an outgoing call
   *
   * @param target - Target SIP URI
   * @param options - Call options
   * @param signal - Optional AbortSignal to cancel the operation
   * @throws {Error} If call initiation fails
   * @throws {DOMException} with name 'AbortError' if aborted
   *
   * @example
   * ```typescript
   * // Basic usage (backward compatible)
   * await makeCall('sip:user@domain.com')
   *
   * // With abort support
   * const controller = new AbortController()
   * const promise = makeCall('sip:user@domain.com', {}, controller.signal)
   * // Later: controller.abort()
   * ```
   */
  const makeCall = async (
    target: string,
    options: CallSessionOptions = {},
    signal?: AbortSignal
  ): Promise<void> => {
    // Use internal abort signal if none provided (auto-cleanup on unmount)
    const effectiveSignal = signal ?? internalAbortController.value.signal

    // Guard against concurrent operations
    if (isOperationInProgress.value) {
      const error = 'Call operation already in progress'
      log.warn(error)
      throw new Error(error)
    }

    // Validate SIP client
    if (!sipClient.value) {
      const error = 'SIP client not initialized'
      log.error(error)
      throw new Error(error)
    }

    // Check if aborted before starting
    throwIfAborted(effectiveSignal)

    // Validate target URI
    if (!target || target.trim() === '') {
      const error = 'Target URI cannot be empty'
      log.error(error)
      throw new Error(error)
    }

    const validation = validateSipUri(target)
    if (!validation.isValid) {
      const error = `Invalid target URI: ${validation.errors?.join(', ') || validation.error || 'Unknown error'}`
      log.error(error, { target, validation })
      throw new Error(error)
    }

    isOperationInProgress.value = true
    let mediaAcquired = false
    let localStreamBeforeCall: MediaStream | null = null
    const timer = createOperationTimer()

    try {
      console.log('[useCallSession] makeCall STARTING', {
        target,
        hasMediaManager: !!mediaManager?.value,
      })
      log.info(`Making call to ${target}`)

      // Clear any existing session
      clearSession()
      console.log('[useCallSession] Session cleared')

      // Check if aborted after clearing session
      throwIfAborted(effectiveSignal)

      // Acquire local media if mediaManager is provided
      if (mediaManager?.value) {
        const { audio = true, video = false } = options
        console.log('[useCallSession] About to acquire media', { audio, video })
        log.debug(`Acquiring local media (audio: ${audio}, video: ${video})`)
        await mediaManager.value.getUserMedia({ audio, video })
        console.log('[useCallSession] Media acquired successfully')
        mediaAcquired = true
        // Store reference to local stream for cleanup if call fails
        localStreamBeforeCall = mediaManager.value.getLocalStream() || null

        // Check if aborted after media acquisition
        throwIfAborted(effectiveSignal)
      }

      console.log('[useCallSession] About to call sipClient.call()', {
        hasSipClient: !!sipClient.value,
        hasLocalStream: !!localStreamBeforeCall,
      })
      // Initiate call via SIP client
      // call() method now properly returns CallSession instance
      // Pass the already-acquired mediaStream to avoid double getUserMedia call
      const callOptions: Record<string, unknown> = {
        extraHeaders: [],
        ...options.data,
      }

      // If we already acquired a stream, pass it directly to JsSIP
      // Otherwise, let JsSIP handle getUserMedia via mediaConstraints
      if (localStreamBeforeCall) {
        callOptions.mediaStream = localStreamBeforeCall
        console.log('[useCallSession] Passing existing mediaStream to JsSIP')
      } else {
        callOptions.mediaConstraints = {
          audio: options.audio ?? true,
          video: options.video ?? false,
        }
        console.log('[useCallSession] Using mediaConstraints for JsSIP')
      }

      const newSession = await sipClient.value.call(target, callOptions)

      console.log('[useCallSession] sipClient.call() returned', { sessionId: newSession.id })

      // Check if aborted after call initiation
      throwIfAborted(effectiveSignal)

      // Store session
      session.value = newSession
      console.log('[useCallSession] Session stored')

      // Set up event listeners to track state changes for Vue reactivity
      setupSessionEventListeners(newSession)

      // Add to call store
      callStore.addActiveCall(newSession)
      console.log('[useCallSession] Added to call store')

      // Reset duration
      resetDuration()

      log.info(`Call initiated: ${newSession.id}`)
      console.log('[useCallSession] makeCall COMPLETED successfully')
    } catch (error) {
      console.error('[useCallSession] makeCall FAILED', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        mediaAcquired,
        target,
      })

      // Handle abort errors gracefully
      if (isAbortError(error)) {
        log.info('Call initiation aborted by user', {
          target,
          duration: timer.elapsed(),
          mediaAcquired,
        })
      } else {
        logErrorWithContext(
          log,
          'Failed to make call',
          error,
          'makeCall',
          'useCallSession',
          ErrorSeverity.HIGH,
          {
            context: {
              target,
              audio: options.audio ?? true,
              video: options.video ?? false,
              hasMediaManager: !!mediaManager?.value,
            },
            state: {
              sipClientConnected: !!sipClient.value,
              mediaAcquired,
              hasExistingSession: !!session.value,
              isOperationInProgress: isOperationInProgress.value,
            },
            duration: timer.elapsed(),
          }
        )
      }

      // Critical fix: Cleanup media if acquired but call failed or aborted
      if (mediaAcquired && localStreamBeforeCall) {
        log.debug('Cleaning up acquired media after call failure/abort')
        localStreamBeforeCall.getTracks().forEach((track) => {
          track.stop()
          log.debug(`Stopped track: ${track.kind}`)
        })
      }

      throw error
    } finally {
      // Always reset operation guard
      isOperationInProgress.value = false
    }
  }

  /**
   * Answer an incoming call
   *
   * @param options - Answer options
   * @returns Promise that resolves when call is answered
   * @throws {Error} If another call operation is already in progress
   * @throws {Error} If no active session to answer
   * @throws {Error} If media acquisition fails
   * @throws {Error} If call answer fails
   */
  const answer = async (options: AnswerOptions = {}): Promise<void> => {
    // Guard against concurrent operations
    if (isOperationInProgress.value) {
      const error = 'Call operation already in progress'
      log.warn(error)
      throw new Error(error)
    }

    if (!session.value) {
      const error = 'No active session to answer'
      log.error(error)
      throw new Error(error)
    }

    isOperationInProgress.value = true
    let mediaAcquired = false
    let localStreamBeforeAnswer: MediaStream | null = null
    const timer = createOperationTimer()

    try {
      log.info(`Answering call: ${session.value.id}`)

      // Acquire local media if mediaManager is provided
      if (mediaManager?.value) {
        const { audio = true, video = false } = options
        log.debug(`Acquiring local media (audio: ${audio}, video: ${video})`)
        await mediaManager.value.getUserMedia({ audio, video })
        mediaAcquired = true
        // Store reference to local stream for cleanup if answer fails
        localStreamBeforeAnswer = mediaManager.value.getLocalStream() || null
      }

      // Answer via session
      await session.value.answer(options)

      // Reset duration
      resetDuration()

      log.info('Call answered')
    } catch (error) {
      // Critical fix: Cleanup media if acquired but answer failed
      if (mediaAcquired && localStreamBeforeAnswer) {
        log.debug('Cleaning up acquired media after answer failure')
        localStreamBeforeAnswer.getTracks().forEach((track) => {
          track.stop()
          log.debug(`Stopped track: ${track.kind}`)
        })
      }

      logErrorWithContext(
        log,
        'Failed to answer call',
        error,
        'answer',
        'useCallSession',
        ErrorSeverity.HIGH,
        {
          context: {
            sessionId: session.value?.id,
            audio: options.audio ?? true,
            video: options.video ?? false,
            hasMediaManager: !!mediaManager?.value,
          },
          state: {
            mediaAcquired,
            sessionState: session.value?.state,
            isOperationInProgress: isOperationInProgress.value,
          },
          duration: timer.elapsed(),
        }
      )
      throw error
    } finally {
      // Always reset operation guard
      isOperationInProgress.value = false
    }
  }

  /**
   * Reject an incoming call
   *
   * @param statusCode - SIP status code (default: 486 Busy Here)
   * @throws Error if no session or reject fails
   */
  const reject = async (statusCode = 486): Promise<void> => {
    // Guard against concurrent operations
    if (isOperationInProgress.value) {
      const error = 'Call operation already in progress'
      log.warn(error)
      throw new Error(error)
    }

    if (!session.value) {
      const error = 'No active session to reject'
      log.error(error)
      throw new Error(error)
    }

    isOperationInProgress.value = true
    const timer = createOperationTimer()

    try {
      log.info(`Rejecting call: ${session.value.id} with code ${statusCode}`)

      // Reject via session
      await session.value.reject(statusCode)

      log.info('Call rejected')
    } catch (error) {
      logErrorWithContext(
        log,
        'Failed to reject call',
        error,
        'reject',
        'useCallSession',
        ErrorSeverity.MEDIUM,
        {
          context: {
            sessionId: session.value?.id,
            statusCode,
          },
          state: {
            sessionState: session.value?.state,
            isOperationInProgress: isOperationInProgress.value,
          },
          duration: timer.elapsed(),
        }
      )
      throw error
    } finally {
      // Always reset operation guard
      isOperationInProgress.value = false
    }
  }

  /**
   * Hangup the call
   *
   * @returns Promise that resolves when call is hung up
   * @throws {Error} If another call operation is already in progress
   * @throws {Error} If hangup operation fails
   */
  const hangup = async (): Promise<void> => {
    // Guard against concurrent operations
    if (isOperationInProgress.value) {
      const error = 'Call operation already in progress'
      log.warn(error)
      throw new Error(error)
    }

    if (!session.value) {
      log.debug('No active session to hang up')
      return
    }

    isOperationInProgress.value = true
    const timer = createOperationTimer()

    try {
      log.info(`Hanging up call: ${session.value.id}`)

      // Hangup via session
      await session.value.hangup()

      log.info('Call hung up')
    } catch (error) {
      logErrorWithContext(
        log,
        'Failed to hang up call',
        error,
        'hangup',
        'useCallSession',
        ErrorSeverity.MEDIUM,
        {
          context: {
            sessionId: session.value?.id,
          },
          state: {
            sessionState: session.value?.state,
            isOnHold: session.value?.isOnHold,
            isMuted: session.value?.isMuted,
          },
          duration: timer.elapsed(),
        }
      )
      throw error
    } finally {
      // Always reset operation guard and stop duration tracking
      isOperationInProgress.value = false
      stopDurationTracking()
    }
  }

  /**
   * Put call on hold
   *
   * @throws Error if no session or hold fails
   */
  const hold = async (): Promise<void> => {
    // Guard against concurrent operations
    if (isOperationInProgress.value) {
      const error = 'Call operation already in progress'
      log.warn(error)
      throw new Error(error)
    }

    if (!session.value) {
      const error = 'No active session to hold'
      log.error(error)
      throw new Error(error)
    }

    isOperationInProgress.value = true
    const timer = createOperationTimer()

    try {
      log.info(`Putting call on hold: ${session.value.id}`)

      // Hold via session
      await session.value.hold()

      log.info('Call on hold')
    } catch (error) {
      logErrorWithContext(
        log,
        'Failed to hold call',
        error,
        'hold',
        'useCallSession',
        ErrorSeverity.MEDIUM,
        {
          context: {
            sessionId: session.value?.id,
          },
          state: {
            sessionState: session.value?.state,
            isOnHold: session.value?.isOnHold,
            isOperationInProgress: isOperationInProgress.value,
          },
          duration: timer.elapsed(),
        }
      )
      throw error
    } finally {
      // Always reset operation guard
      isOperationInProgress.value = false
    }
  }

  /**
   * Resume call from hold
   *
   * @throws Error if no session or unhold fails
   */
  const unhold = async (): Promise<void> => {
    // Guard against concurrent operations
    if (isOperationInProgress.value) {
      const error = 'Call operation already in progress'
      log.warn(error)
      throw new Error(error)
    }

    if (!session.value) {
      const error = 'No active session to unhold'
      log.error(error)
      throw new Error(error)
    }

    isOperationInProgress.value = true
    const timer = createOperationTimer()

    try {
      log.info(`Resuming call from hold: ${session.value.id}`)

      // Unhold via session
      await session.value.unhold()

      log.info('Call resumed')
    } catch (error) {
      logErrorWithContext(
        log,
        'Failed to unhold call',
        error,
        'unhold',
        'useCallSession',
        ErrorSeverity.MEDIUM,
        {
          context: {
            sessionId: session.value?.id,
          },
          state: {
            sessionState: session.value?.state,
            isOnHold: session.value?.isOnHold,
            isOperationInProgress: isOperationInProgress.value,
          },
          duration: timer.elapsed(),
        }
      )
      throw error
    } finally {
      // Always reset operation guard
      isOperationInProgress.value = false
    }
  }

  /**
   * Toggle hold state
   */
  const toggleHold = async (): Promise<void> => {
    if (isOnHold.value) {
      await unhold()
    } else {
      await hold()
    }
  }

  /**
   * Mute audio
   */
  const mute = (): void => {
    if (!session.value) {
      log.debug('No active session to mute')
      return
    }

    log.debug(`Muting call: ${session.value.id}`)
    session.value.mute()
  }

  /**
   * Unmute audio
   */
  const unmute = (): void => {
    if (!session.value) {
      log.debug('No active session to unmute')
      return
    }

    log.debug(`Unmuting call: ${session.value.id}`)
    session.value.unmute()
  }

  /**
   * Toggle mute state
   */
  const toggleMute = (): void => {
    if (isMuted.value) {
      unmute()
    } else {
      mute()
    }
  }

  /**
   * Disable video
   */
  const disableVideo = (): void => {
    if (!session.value) {
      log.debug('No active session to disable video')
      return
    }

    log.debug(`Disabling video for call: ${session.value.id}`)
    session.value.disableVideo()
  }

  /**
   * Enable video
   */
  const enableVideo = (): void => {
    if (!session.value) {
      log.debug('No active session to enable video')
      return
    }

    log.debug(`Enabling video for call: ${session.value.id}`)
    session.value.enableVideo()
  }

  /**
   * Toggle video state
   */
  const toggleVideo = (): void => {
    if (!hasLocalVideo.value) {
      enableVideo()
    } else {
      disableVideo()
    }
  }

  /**
   * Send DTMF tone
   *
   * @param tone - DTMF tone (0-9, *, #, A-D)
   * @param options - DTMF options
   * @throws Error if no session or DTMF send fails
   */
  const sendDTMF = async (tone: string, options?: DTMFOptions): Promise<void> => {
    if (!session.value) {
      const error = 'No active session to send DTMF'
      log.error(error)
      throw new Error(error)
    }

    const timer = createOperationTimer()

    try {
      log.debug(`Sending DTMF tone: ${tone}`)

      // Send via session
      await session.value.sendDTMF(tone, options)

      log.debug('DTMF sent')
    } catch (error) {
      logErrorWithContext(
        log,
        'Failed to send DTMF',
        error,
        'sendDTMF',
        'useCallSession',
        ErrorSeverity.LOW,
        {
          context: {
            sessionId: session.value?.id,
            tone,
            options,
          },
          state: {
            sessionState: session.value?.state,
            isOnHold: session.value?.isOnHold,
          },
          duration: timer.elapsed(),
        }
      )
      throw error
    }
  }

  /**
   * Get call statistics
   *
   * @returns Call statistics or null if no session
   */
  const getStats = async (): Promise<CallStatistics | null> => {
    if (!session.value) {
      log.debug('No active session to get stats')
      return null
    }

    try {
      log.debug('Getting call statistics')
      const stats = await session.value.getStats()
      return stats
    } catch (error) {
      log.error('Failed to get call statistics:', error)
      return null
    }
  }

  /**
   * Transfer call (blind or attended)
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
    if (!session.value) {
      const error = 'No active session to transfer'
      log.error(error)
      return {
        success: false,
        error,
        state: TransferState.Failed,
      }
    }

    const timer = createOperationTimer()

    try {
      log.info(`Transferring call to ${target} (type: ${options.type})`)

      // Validate target URI
      if (!target || target.trim() === '') {
        throw new Error('Target URI cannot be empty')
      }

      const validation = validateSipUri(target)
      if (!validation.isValid) {
        throw new Error(
          `Invalid target URI: ${validation.errors?.join(', ') || validation.error || 'Unknown error'}`
        )
      }

      // Execute transfer based on type
      if (options.type === 'blind') {
        await session.value.transfer(target, options.extraHeaders)
      } else if (options.type === 'attended') {
        if (!options.consultationCallId) {
          throw new Error('Consultation call ID required for attended transfer')
        }
        await session.value.attendedTransfer(target, options.consultationCallId)
      } else {
        throw new Error(`Unsupported transfer type: ${options.type}`)
      }

      log.info(`Call transfer initiated successfully (${timer.elapsed()}ms)`)

      return {
        success: true,
        transferId: `transfer-${Date.now()}`,
        state: TransferState.Initiated,
      }
    } catch (error) {
      logErrorWithContext(
        log,
        'Failed to transfer call',
        error,
        'transferCall',
        'useCallSession',
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
          },
          duration: timer.elapsed(),
        }
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        state: TransferState.Failed,
      }
    }
  }

  /**
   * Clear current session
   */
  const clearSession = (): void => {
    if (session.value) {
      log.debug(`Clearing session: ${session.value.id}`)

      // Remove from call store
      callStore.removeActiveCall(session.value.id)

      // Stop duration tracking
      stopDurationTracking()
      resetDuration()

      // Clean up session event listeners
      if (sessionEventCleanup) {
        sessionEventCleanup()
        sessionEventCleanup = null
      }

      // Clear session reference
      session.value = null
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Cleanup on component unmount
  onUnmounted(() => {
    log.debug('Composable unmounting, cleaning up')
    stopDurationTracking()

    // Clean up session event listeners
    if (sessionEventCleanup) {
      sessionEventCleanup()
      sessionEventCleanup = null
    }

    // Clean up incoming call listener
    if (incomingCallListenerCleanup) {
      incomingCallListenerCleanup()
      incomingCallListenerCleanup = null
    }

    // Abort any pending async operations
    if (!internalAbortController.value.signal.aborted) {
      log.info('Aborting pending operations on unmount')
      internalAbortController.value.abort()
    }
  })

  // ============================================================================
  // Incoming Call Auto-Detection
  // ============================================================================

  // Cleanup function for incoming call listener
  let incomingCallListenerCleanup: (() => void) | null = null

  /**
   * Set up listener for incoming calls from SipClient
   * This automatically detects incoming calls and sets up the session
   */
  const setupIncomingCallListener = (client: SipClient): void => {
    // Clean up previous listener if any
    if (incomingCallListenerCleanup) {
      incomingCallListenerCleanup()
      incomingCallListenerCleanup = null
    }

    const eventBus = client.getEventBus()
    if (!eventBus) {
      log.warn('SipClient has no eventBus, incoming calls will not be detected')
      return
    }

    // Listen for new sessions (incoming calls)
    const listenerId = eventBus.on('sip:new_session', (event) => {
      log.debug('Received sip:new_session event:', event)

      // Only handle incoming calls - outgoing calls are handled by makeCall()
      if (event?.originator !== 'remote') {
        log.debug('Ignoring outgoing call session event')
        return
      }

      // Don't overwrite existing active session
      if (session.value && session.value.state !== 'terminated' && session.value.state !== 'idle') {
        log.warn('Already have an active session, ignoring new incoming call')
        return
      }

      // Get the CallSession from the event
      // The SipClient emits this after creating the CallSession
      const callId = event.callId
      if (!callId) {
        log.warn('Incoming call event missing callId')
        return
      }

      // Get the CallSession from SipClient's activeCalls
      const incomingSession = client.getActiveCall(callId)
      if (!incomingSession) {
        log.warn(`Could not find CallSession for incoming call ${callId}`)
        return
      }

      log.info(`Detected incoming call: ${callId}`)

      // Store the session - cast to CallSession class type since getActiveCall returns the interface type
      // but the underlying object is always a CallSession class instance
      session.value = incomingSession as CallSession

      // Set up event listeners to track state changes
      setupSessionEventListeners(incomingSession as CallSession)

      // Force reactivity update
      sessionStateVersion.value++
    })

    // Store cleanup function
    incomingCallListenerCleanup = () => {
      eventBus.off('sip:new_session', listenerId as number)
    }

    log.debug('Incoming call listener set up')
  }

  // Watch for SipClient changes and set up incoming call listener
  watch(
    sipClient,
    (newClient) => {
      if (newClient) {
        setupIncomingCallListener(newClient)
      } else if (incomingCallListenerCleanup) {
        incomingCallListenerCleanup()
        incomingCallListenerCleanup = null
      }
    },
    { immediate: true }
  )

  // ============================================================================
  // Return Public API
  // ============================================================================

  return {
    // State
    session: session as Ref<CallSession | null>,
    state,
    callId,
    direction,
    localUri,
    remoteUri,
    remoteDisplayName,
    isActive,
    isOnHold,
    isMuted,
    hasRemoteVideo,
    hasLocalVideo,
    localStream,
    remoteStream,
    timing,
    duration,
    terminationCause,

    // Methods
    makeCall,
    answer,
    reject,
    hangup,
    hold,
    unhold,
    toggleHold,
    mute,
    unmute,
    toggleMute,
    disableVideo,
    enableVideo,
    toggleVideo,
    sendDTMF,
    getStats,
    clearSession,
    transferCall,

    // Picture-in-Picture
    isPiPSupported: pip.isPiPSupported,
    isPiPActive: pip.isPiPActive,
    pipWindow: pip.pipWindow,
    pipError: pip.error,
    setVideoRef,
    enterPiP,
    exitPiP: pip.exitPiP,
    togglePiP,
  }
}
