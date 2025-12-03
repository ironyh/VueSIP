/**
 * useSipSecondLine - Multi-Line Support Composable
 *
 * Manages multiple concurrent SIP call lines with support for:
 * - Multiple simultaneous calls across different lines
 * - Line selection and switching
 * - Auto-hold when switching lines
 * - Call transfer between lines
 * - Line-specific call controls
 *
 * @module composables/useSipSecondLine
 */

import { ref, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { SipClient } from '@/core/SipClient'
import type { CallSession } from '@/core/CallSession'
import type { MediaManager } from '@/core/MediaManager'
import { callStore } from '@/stores/callStore'
import type {
  LineNumber,
  LineStatus,
  LineState,
  LineConfig,
  LineCallOptions,
  LineAnswerOptions,
  LineTransferOptions,
  LineConferenceOptions,
  LineStateChangeEvent,
  LineIncomingCallEvent,
  LineCallEndedEvent,
  LineSelectionChangeEvent,
  UseSipSecondLineOptions,
  UseSipSecondLineReturn,
} from '@/types/multiline.types'
import type { CallStatistics, TerminationCause } from '@/types/call.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useSipSecondLine')

/** Default number of lines */
const DEFAULT_LINE_COUNT = 2

/** Maximum supported lines */
const MAX_LINE_COUNT = 8

/** Minimum line number (1-indexed) */
const MIN_LINE_NUMBER = 1

/** Pattern for valid transfer targets (SIP URI or simple extension) */
const VALID_TARGET_PATTERN = /^[a-zA-Z0-9@._+:-]+$/

/**
 * Validate line number
 */
function isValidLineNumber(lineNumber: number, maxLines: number): boolean {
  return (
    typeof lineNumber === 'number' &&
    !isNaN(lineNumber) &&
    lineNumber >= MIN_LINE_NUMBER &&
    lineNumber <= maxLines &&
    Number.isInteger(lineNumber)
  )
}

/**
 * Validate transfer target
 */
function isValidTarget(target: string): boolean {
  return (
    typeof target === 'string' &&
    target.length > 0 &&
    target.length <= 256 &&
    VALID_TARGET_PATTERN.test(target)
  )
}

/**
 * Create default line configuration
 */
function createDefaultLineConfig(lineNumber: LineNumber): LineConfig {
  return {
    lineNumber,
    enabled: true,
    defaultAudio: true,
    defaultVideo: false,
    autoAnswer: false,
    autoAnswerDelay: 0,
  }
}

/**
 * Create initial line state
 */
function createInitialLineState(lineNumber: LineNumber, config: LineConfig): LineState {
  return {
    lineNumber,
    status: 'idle',
    callId: null,
    callState: null,
    direction: null,
    remoteUri: null,
    remoteDisplayName: null,
    isOnHold: false,
    isMuted: false,
    hasVideo: false,
    timing: null,
    duration: 0,
    error: null,
    config,
  }
}

/**
 * useSipSecondLine Composable
 *
 * Manages multiple SIP call lines with support for concurrent calls,
 * line switching, and advanced call control features.
 *
 * @param sipClient - SIP client instance ref
 * @param mediaManager - Media manager instance ref (optional)
 * @param options - Configuration options
 * @returns Multi-line state and methods
 *
 * @example
 * ```typescript
 * const {
 *   lines,
 *   selectedLine,
 *   makeCall,
 *   answerCall,
 *   hangupCall,
 *   holdLine,
 *   swapLines,
 * } = useSipSecondLine(sipClient, mediaManager, {
 *   lineCount: 4,
 *   autoHoldOnNewCall: true,
 * })
 *
 * // Make call on auto-selected line
 * const lineNum = await makeCall('sip:bob@domain.com')
 *
 * // Answer incoming on line 2
 * await answerCall(2)
 *
 * // Hold line 2, then swap to line 1
 * await holdLine(2)
 * await swapLines(1, 2)
 * ```
 */
export function useSipSecondLine(
  sipClient: Ref<SipClient | null>,
  mediaManager?: Ref<MediaManager | null>,
  options: UseSipSecondLineOptions = {}
): UseSipSecondLineReturn {
  // ============================================================================
  // Configuration
  // ============================================================================

  const lineCount = Math.min(
    Math.max(options.lineCount ?? DEFAULT_LINE_COUNT, MIN_LINE_NUMBER),
    MAX_LINE_COUNT
  )
  const maxConcurrentCalls = options.maxConcurrentCalls ?? lineCount
  const autoHoldOnNewCall = options.autoHoldOnNewCall ?? true
  const autoSelectLine = options.autoSelectLine ?? true

  // ============================================================================
  // State
  // ============================================================================

  // Create line configurations
  const lineConfigs: LineConfig[] = []
  for (let i = 1; i <= lineCount; i++) {
    const userConfig = options.lineConfigs?.[i - 1]
    lineConfigs.push({
      ...createDefaultLineConfig(i),
      ...userConfig,
      lineNumber: i, // Ensure line number is correct
    })
  }

  // Initialize line states
  const initialLines: LineState[] = lineConfigs.map((config) =>
    createInitialLineState(config.lineNumber, config)
  )

  const lines = ref<LineState[]>(initialLines)
  const selectedLine = ref<LineNumber>(1)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Duration tracking timers per line
  const durationTimers: Map<LineNumber, ReturnType<typeof setInterval>> = new Map()

  // Call session to line mapping
  const callToLineMap: Map<string, LineNumber> = new Map()

  // Event listener cleanup functions
  const eventCleanups: Array<() => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  const selectedLineState: ComputedRef<LineState | null> = computed(() => {
    return lines.value.find((l) => l.lineNumber === selectedLine.value) ?? null
  })

  const activeCallCount = computed(() => {
    return lines.value.filter((l) => l.status === 'active' || l.status === 'held').length
  })

  const incomingCallCount = computed(() => {
    return lines.value.filter((l) => l.status === 'ringing').length
  })

  const allLinesBusy = computed(() => {
    return lines.value.every((l) => l.status !== 'idle')
  })

  const availableLines = computed(() => {
    return lines.value.filter((l) => l.status === 'idle' && l.config.enabled)
  })

  const activeLines = computed(() => {
    return lines.value.filter((l) => l.status === 'active')
  })

  const ringingLines = computed(() => {
    return lines.value.filter((l) => l.status === 'ringing')
  })

  const heldLines = computed(() => {
    return lines.value.filter((l) => l.status === 'held')
  })

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Get line index from line number (0-indexed)
   */
  function getLineIndex(lineNumber: LineNumber): number {
    return lineNumber - 1
  }

  /**
   * Update line state
   */
  function updateLineState(lineNumber: LineNumber, updates: Partial<Omit<LineState, 'lineNumber'>>): void {
    const idx = getLineIndex(lineNumber)
    const currentLine = lines.value[idx]
    if (idx >= 0 && idx < lines.value.length && currentLine) {
      const previousState: LineState = { ...currentLine }
      // Preserve lineNumber and config which are required and should not change
      const newState: LineState = {
        lineNumber: currentLine.lineNumber,
        status: updates.status ?? currentLine.status,
        callId: updates.callId !== undefined ? updates.callId : currentLine.callId,
        callState: updates.callState !== undefined ? updates.callState : currentLine.callState,
        direction: updates.direction !== undefined ? updates.direction : currentLine.direction,
        remoteUri: updates.remoteUri !== undefined ? updates.remoteUri : currentLine.remoteUri,
        remoteDisplayName: updates.remoteDisplayName !== undefined ? updates.remoteDisplayName : currentLine.remoteDisplayName,
        isOnHold: updates.isOnHold ?? currentLine.isOnHold,
        isMuted: updates.isMuted ?? currentLine.isMuted,
        hasVideo: updates.hasVideo ?? currentLine.hasVideo,
        timing: updates.timing !== undefined ? updates.timing : currentLine.timing,
        duration: updates.duration ?? currentLine.duration,
        error: updates.error !== undefined ? updates.error : currentLine.error,
        config: currentLine.config,
      }
      lines.value[idx] = newState

      // Emit state change event
      emitStateChange(lineNumber, previousState, newState)
    }
  }

  /**
   * Map call state to line status
   */
  function callStateToLineStatus(callState: string | null): LineStatus {
    if (!callState) return 'idle'

    switch (callState) {
      case 'ringing':
        return 'ringing'
      case 'calling':
      case 'answering':
      case 'early_media':
        return 'busy'
      case 'active':
        return 'active'
      case 'held':
      case 'remote_held':
        return 'held'
      case 'terminated':
      case 'failed':
        return 'idle'
      default:
        return 'idle'
    }
  }

  /**
   * Start duration tracking for a line
   */
  function startDurationTracking(lineNumber: LineNumber): void {
    stopDurationTracking(lineNumber)

    const timer = setInterval(() => {
      const line = lines.value[getLineIndex(lineNumber)]
      if (line && line.timing?.answerTime) {
        const now = Date.now()
        const answerTime = new Date(line.timing.answerTime).getTime()
        updateLineState(lineNumber, {
          duration: Math.floor((now - answerTime) / 1000),
        })
      }
    }, 1000)

    durationTimers.set(lineNumber, timer)
  }

  /**
   * Stop duration tracking for a line
   */
  function stopDurationTracking(lineNumber: LineNumber): void {
    const timer = durationTimers.get(lineNumber)
    if (timer) {
      clearInterval(timer)
      durationTimers.delete(lineNumber)
    }
  }

  /**
   * Find available line for new call
   */
  function findAvailableLine(): LineNumber | null {
    for (let i = 1; i <= lineCount; i++) {
      const line = lines.value[getLineIndex(i)]
      if (line && line.status === 'idle' && line.config.enabled) {
        return i
      }
    }
    return null
  }

  /**
   * Hold other active lines when making/answering a new call
   */
  async function holdOtherLines(exceptLine: LineNumber): Promise<void> {
    if (!autoHoldOnNewCall) return

    const linesToHold = lines.value.filter(
      (l) => l.lineNumber !== exceptLine && l.status === 'active' && !l.isOnHold
    )

    for (const line of linesToHold) {
      try {
        await holdLine(line.lineNumber)
      } catch (err) {
        logger.warn(`Failed to auto-hold line ${line.lineNumber}`, err)
      }
    }
  }

  // ============================================================================
  // Event Emission
  // ============================================================================

  function emitStateChange(
    lineNumber: LineNumber,
    previousState: LineState,
    currentState: LineState
  ): void {
    const event: LineStateChangeEvent = {
      type: 'stateChange',
      lineNumber,
      timestamp: new Date(),
      previousState,
      currentState,
    }
    options.onLineStateChange?.(event)
  }

  function emitIncomingCall(lineNumber: LineNumber, remoteUri: string, remoteDisplayName?: string): void {
    const currentState = lines.value[getLineIndex(lineNumber)]
    if (!currentState) return

    const event: LineIncomingCallEvent = {
      type: 'incomingCall',
      lineNumber,
      timestamp: new Date(),
      currentState,
      remoteUri,
      remoteDisplayName,
    }
    options.onLineIncomingCall?.(event)
  }

  function emitCallEnded(lineNumber: LineNumber, cause: TerminationCause, duration: number): void {
    const currentState = lines.value[getLineIndex(lineNumber)]
    if (!currentState) return

    const event: LineCallEndedEvent = {
      type: 'callEnded',
      lineNumber,
      timestamp: new Date(),
      currentState,
      cause,
      duration,
    }
    options.onLineCallEnded?.(event)
  }

  function emitSelectionChange(previousLine: LineNumber | null, newLine: LineNumber): void {
    const currentState = lines.value[getLineIndex(newLine)]
    if (!currentState) return

    const event: LineSelectionChangeEvent = {
      type: 'selectionChange',
      lineNumber: newLine,
      timestamp: new Date(),
      currentState,
      previousLine,
      newLine,
    }
    options.onSelectionChange?.(event)
  }

  // ============================================================================
  // SIP Event Handlers
  // ============================================================================

  function setupCallSessionListeners(session: CallSession, lineNumber: LineNumber): void {
    // Track state changes
    const handleStateChange = (): void => {
      const state = session.state
      const status = callStateToLineStatus(state)

      updateLineState(lineNumber, {
        callState: state,
        status,
        isOnHold: session.isOnHold,
        isMuted: session.isMuted,
        hasVideo: session.hasLocalVideo || session.hasRemoteVideo,
      })

      // Start/stop duration tracking based on state
      if (state === 'active') {
        startDurationTracking(lineNumber)
      } else if (state === 'terminated' || state === 'failed') {
        stopDurationTracking(lineNumber)
        handleCallEnded(lineNumber, session)
      }
    }

    // Subscribe to session events if session has event emitter
    if (typeof session.on === 'function') {
      session.on('progress', handleStateChange)
      session.on('accepted', handleStateChange)
      session.on('confirmed', handleStateChange)
      session.on('hold', handleStateChange)
      session.on('unhold', handleStateChange)
      session.on('muted', handleStateChange)
      session.on('unmuted', handleStateChange)
      session.on('ended', handleStateChange)
      session.on('failed', handleStateChange)
    }
  }

  function handleCallEnded(lineNumber: LineNumber, session: CallSession): void {
    const line = lines.value[getLineIndex(lineNumber)]
    if (!line) return

    const duration = line.duration
    const cause = session.terminationCause || ('other' as TerminationCause)

    // Remove from mapping
    if (line.callId) {
      callToLineMap.delete(line.callId)
    }

    // Reset line state
    updateLineState(lineNumber, {
      status: 'idle',
      callId: null,
      callState: null,
      direction: null,
      remoteUri: null,
      remoteDisplayName: null,
      isOnHold: false,
      isMuted: false,
      hasVideo: false,
      timing: null,
      duration: 0,
      error: null,
    })

    // Emit call ended event
    emitCallEnded(lineNumber, cause, duration)
  }

  function handleIncomingCall(session: CallSession): void {
    if (!autoSelectLine) return

    // Find available line for incoming call
    const availableLine = findAvailableLine()
    if (!availableLine) {
      logger.warn('No available line for incoming call, rejecting')
      session.reject?.(486) // Busy
      return
    }

    // Assign to line
    assignCallToLine(session, availableLine)

    // Update line state
    updateLineState(availableLine, {
      status: 'ringing',
      callId: session.id,
      callState: session.state,
      direction: session.direction,
      remoteUri: session.remoteUri?.toString() ?? null,
      remoteDisplayName: session.remoteDisplayName ?? null,
    })

    // Emit incoming call event
    emitIncomingCall(
      availableLine,
      session.remoteUri?.toString() ?? '',
      session.remoteDisplayName
    )

    // Setup listeners
    setupCallSessionListeners(session, availableLine)
  }

  function assignCallToLine(session: CallSession, lineNumber: LineNumber): void {
    callToLineMap.set(session.id, lineNumber)
  }

  // ============================================================================
  // Line Selection Methods
  // ============================================================================

  const selectLine = (lineNumber: LineNumber): void => {
    if (!isValidLineNumber(lineNumber, lineCount)) {
      logger.warn('Invalid line number', { lineNumber, maxLines: lineCount })
      return
    }

    const previousLine = selectedLine.value
    if (previousLine === lineNumber) return

    selectedLine.value = lineNumber
    emitSelectionChange(previousLine, lineNumber)
    logger.debug('Selected line', { lineNumber })
  }

  const selectNextAvailable = (): LineNumber | null => {
    const available = findAvailableLine()
    if (available) {
      selectLine(available)
    }
    return available
  }

  const selectRingingLine = (): LineNumber | null => {
    const ringing = lines.value.find((l) => l.status === 'ringing')
    if (ringing) {
      selectLine(ringing.lineNumber)
      return ringing.lineNumber
    }
    return null
  }

  // ============================================================================
  // Call Methods
  // ============================================================================

  const makeCall = async (target: string, options: LineCallOptions = {}): Promise<LineNumber> => {
    if (!sipClient.value) {
      error.value = 'SIP client not connected'
      throw new Error(error.value)
    }

    if (!isValidTarget(target)) {
      error.value = 'Invalid target URI'
      throw new Error(error.value)
    }

    isLoading.value = true
    error.value = null

    try {
      // Determine which line to use
      let lineNumber: LineNumber
      if (options.lineNumber) {
        lineNumber = options.lineNumber
      } else {
        const available = findAvailableLine()
        if (!available) {
          throw new Error('No available lines for call')
        }
        lineNumber = available
      }

      if (!isValidLineNumber(lineNumber, lineCount)) {
        throw new Error(`Invalid line number: ${lineNumber}`)
      }

      const line = lines.value[getLineIndex(lineNumber)]
      if (!line || line.status !== 'idle') {
        throw new Error(`Line ${lineNumber} is not available`)
      }

      // Check concurrent call limit
      if (activeCallCount.value >= maxConcurrentCalls) {
        throw new Error(`Maximum concurrent calls (${maxConcurrentCalls}) reached`)
      }

      // Hold other lines if configured
      await holdOtherLines(lineNumber)

      // Update line state to busy while initiating
      updateLineState(lineNumber, { status: 'busy', error: null })

      // Get media settings from line config or options
      const lineConfig = line.config
      const audio = options.audio ?? lineConfig.defaultAudio ?? true
      const video = options.video ?? lineConfig.defaultVideo ?? false

      // Acquire media if needed
      if (mediaManager?.value) {
        await mediaManager.value.getUserMedia({ audio, video })
      }

      // Make the call
      const session = await sipClient.value.call(target, {
        mediaConstraints: { audio, video },
        extraHeaders: options.extraHeaders,
        ...options.data,
      })

      // Assign call to line
      assignCallToLine(session, lineNumber)

      // Update line state
      updateLineState(lineNumber, {
        callId: session.id,
        callState: session.state,
        direction: session.direction,
        remoteUri: session.remoteUri?.toString() ?? target,
        remoteDisplayName: session.remoteDisplayName ?? null,
        hasVideo: video,
        timing: { startTime: new Date() },
      })

      // Add to call store
      callStore.addActiveCall(session)

      // Setup listeners
      setupCallSessionListeners(session, lineNumber)

      // Select this line
      selectLine(lineNumber)

      logger.info('Call initiated', { lineNumber, target, callId: session.id })
      return lineNumber
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to make call'
      error.value = message
      logger.error('Failed to make call', { error: message, target })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const answerCall = async (lineNumber: LineNumber, options: LineAnswerOptions = {}): Promise<void> => {
    if (!sipClient.value) {
      error.value = 'SIP client not connected'
      throw new Error(error.value)
    }

    if (!isValidLineNumber(lineNumber, lineCount)) {
      error.value = `Invalid line number: ${lineNumber}`
      throw new Error(error.value)
    }

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || line.status !== 'ringing') {
      error.value = `Line ${lineNumber} has no incoming call`
      throw new Error(error.value)
    }

    if (!line.callId) {
      error.value = 'No call ID for line'
      throw new Error(error.value)
    }

    const callId = line.callId
    const lineConfig = line.config
    const lineTiming = line.timing

    isLoading.value = true
    error.value = null

    try {
      // Hold other lines if configured
      await holdOtherLines(lineNumber)

      // Get the session from call store
      const session = callStore.getCall(callId)
      if (!session) {
        throw new Error('Call session not found')
      }

      // Get media settings
      const audio = options.audio ?? lineConfig.defaultAudio ?? true
      const video = options.video ?? lineConfig.defaultVideo ?? false

      // Acquire media if needed
      if (mediaManager?.value) {
        await mediaManager.value.getUserMedia({ audio, video })
      }

      // Answer the call - cast to any for method call
      const sessionWithAnswer = session as unknown as { answer?: (opts?: unknown) => Promise<void> }
      if (typeof sessionWithAnswer.answer === 'function') {
        await sessionWithAnswer.answer({
          mediaConstraints: { audio, video },
          extraHeaders: options.extraHeaders,
        })
      }

      // Update line state
      updateLineState(lineNumber, {
        status: 'active',
        hasVideo: video,
        timing: {
          ...lineTiming,
          answerTime: new Date(),
        },
      })

      // Start duration tracking
      startDurationTracking(lineNumber)

      // Select this line
      selectLine(lineNumber)

      logger.info('Call answered', { lineNumber, callId })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to answer call'
      error.value = message
      logger.error('Failed to answer call', { error: message, lineNumber })
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const rejectCall = async (lineNumber: LineNumber, statusCode = 486): Promise<void> => {
    if (!isValidLineNumber(lineNumber, lineCount)) {
      error.value = `Invalid line number: ${lineNumber}`
      throw new Error(error.value)
    }

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || line.status !== 'ringing') {
      error.value = `Line ${lineNumber} has no incoming call`
      throw new Error(error.value)
    }

    if (!line.callId) {
      error.value = 'No call ID for line'
      throw new Error(error.value)
    }

    const callId = line.callId

    try {
      const session = callStore.getCall(callId)
      if (session) {
        const sessionWithReject = session as unknown as { reject?: (code?: number) => Promise<void> }
        if (typeof sessionWithReject.reject === 'function') {
          await sessionWithReject.reject(statusCode)
        }
      }

      // Reset line state
      updateLineState(lineNumber, {
        status: 'idle',
        callId: null,
        callState: null,
        direction: null,
        remoteUri: null,
        remoteDisplayName: null,
        timing: null,
      })

      callToLineMap.delete(callId)

      logger.info('Call rejected', { lineNumber, statusCode })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject call'
      error.value = message
      logger.error('Failed to reject call', { error: message, lineNumber })
      throw err
    }
  }

  const hangupCall = async (lineNumber: LineNumber): Promise<void> => {
    if (!isValidLineNumber(lineNumber, lineCount)) {
      error.value = `Invalid line number: ${lineNumber}`
      throw new Error(error.value)
    }

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || line.status === 'idle') {
      logger.debug('Line already idle or not found', { lineNumber })
      return
    }

    if (!line.callId) {
      // Just reset line state
      updateLineState(lineNumber, {
        status: 'idle',
        callId: null,
        callState: null,
        direction: null,
        remoteUri: null,
        remoteDisplayName: null,
        isOnHold: false,
        isMuted: false,
        hasVideo: false,
        timing: null,
        duration: 0,
      })
      return
    }

    const callId = line.callId

    try {
      const session = callStore.getCall(callId)
      if (session) {
        const sessionWithHangup = session as unknown as { hangup?: () => Promise<void> }
        if (typeof sessionWithHangup.hangup === 'function') {
          await sessionWithHangup.hangup()
        }
        callStore.removeActiveCall(callId)
      }

      stopDurationTracking(lineNumber)
      callToLineMap.delete(callId)

      // Reset line state
      updateLineState(lineNumber, {
        status: 'idle',
        callId: null,
        callState: null,
        direction: null,
        remoteUri: null,
        remoteDisplayName: null,
        isOnHold: false,
        isMuted: false,
        hasVideo: false,
        timing: null,
        duration: 0,
      })

      logger.info('Call hung up', { lineNumber })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to hangup call'
      error.value = message
      logger.error('Failed to hangup call', { error: message, lineNumber })
      throw err
    }
  }

  const hangupAll = async (): Promise<void> => {
    const errors: Error[] = []

    for (const line of lines.value) {
      if (line.status !== 'idle') {
        try {
          await hangupCall(line.lineNumber)
        } catch (err) {
          errors.push(err instanceof Error ? err : new Error('Unknown error'))
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to hangup ${errors.length} call(s)`)
    }
  }

  // ============================================================================
  // Call Control Methods
  // ============================================================================

  const holdLine = async (lineNumber: LineNumber): Promise<void> => {
    if (!isValidLineNumber(lineNumber, lineCount)) {
      throw new Error(`Invalid line number: ${lineNumber}`)
    }

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || line.status !== 'active' || line.isOnHold) {
      logger.debug('Line not active or already on hold', { lineNumber })
      return
    }

    if (!line.callId) {
      throw new Error('No active call on line')
    }

    const callId = line.callId
    try {
      const session = callStore.getCall(callId)
      if (session) {
        const sessionWithHold = session as unknown as { hold?: () => Promise<void> }
        if (typeof sessionWithHold.hold === 'function') {
          await sessionWithHold.hold()
        }
      }

      updateLineState(lineNumber, {
        status: 'held',
        isOnHold: true,
      })

      logger.info('Line put on hold', { lineNumber })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to hold line'
      logger.error('Failed to hold line', { error: message, lineNumber })
      throw err
    }
  }

  const unholdLine = async (lineNumber: LineNumber): Promise<void> => {
    if (!isValidLineNumber(lineNumber, lineCount)) {
      throw new Error(`Invalid line number: ${lineNumber}`)
    }

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || line.status !== 'held' || !line.isOnHold) {
      logger.debug('Line not on hold', { lineNumber })
      return
    }

    if (!line.callId) {
      throw new Error('No call on line')
    }

    const callId = line.callId
    try {
      // Hold other active lines first
      await holdOtherLines(lineNumber)

      const session = callStore.getCall(callId)
      if (session) {
        const sessionWithUnhold = session as unknown as { unhold?: () => Promise<void> }
        if (typeof sessionWithUnhold.unhold === 'function') {
          await sessionWithUnhold.unhold()
        }
      }

      updateLineState(lineNumber, {
        status: 'active',
        isOnHold: false,
      })

      logger.info('Line resumed from hold', { lineNumber })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unhold line'
      logger.error('Failed to unhold line', { error: message, lineNumber })
      throw err
    }
  }

  const toggleHoldLine = async (lineNumber: LineNumber): Promise<void> => {
    const line = lines.value[getLineIndex(lineNumber)]
    if (line?.isOnHold) {
      await unholdLine(lineNumber)
    } else {
      await holdLine(lineNumber)
    }
  }

  const muteLine = (lineNumber: LineNumber): void => {
    if (!isValidLineNumber(lineNumber, lineCount)) return

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || !line.callId) return

    const session = callStore.getCall(line.callId)
    if (session) {
      const sessionWithMute = session as unknown as { mute?: () => void }
      if (typeof sessionWithMute.mute === 'function') {
        sessionWithMute.mute()
      }
    }

    updateLineState(lineNumber, { isMuted: true })
    logger.debug('Line muted', { lineNumber })
  }

  const unmuteLine = (lineNumber: LineNumber): void => {
    if (!isValidLineNumber(lineNumber, lineCount)) return

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || !line.callId) return

    const session = callStore.getCall(line.callId)
    if (session) {
      const sessionWithUnmute = session as unknown as { unmute?: () => void }
      if (typeof sessionWithUnmute.unmute === 'function') {
        sessionWithUnmute.unmute()
      }
    }

    updateLineState(lineNumber, { isMuted: false })
    logger.debug('Line unmuted', { lineNumber })
  }

  const toggleMuteLine = (lineNumber: LineNumber): void => {
    const line = lines.value[getLineIndex(lineNumber)]
    if (line?.isMuted) {
      unmuteLine(lineNumber)
    } else {
      muteLine(lineNumber)
    }
  }

  const sendDTMF = async (lineNumber: LineNumber, tone: string): Promise<void> => {
    if (!isValidLineNumber(lineNumber, lineCount)) {
      throw new Error(`Invalid line number: ${lineNumber}`)
    }

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || !line.callId || line.status !== 'active') {
      throw new Error('No active call on line')
    }

    const session = callStore.getCall(line.callId)
    if (session) {
      const sessionWithDTMF = session as unknown as { sendDTMF?: (t: string) => Promise<void> }
      if (typeof sessionWithDTMF.sendDTMF === 'function') {
        await sessionWithDTMF.sendDTMF(tone)
      }
    }

    logger.debug('DTMF sent', { lineNumber, tone })
  }

  // ============================================================================
  // Advanced Features
  // ============================================================================

  const transferCall = async (options: LineTransferOptions): Promise<void> => {
    const { fromLine, target, attended = false } = options

    if (!isValidLineNumber(fromLine, lineCount)) {
      throw new Error(`Invalid source line: ${fromLine}`)
    }

    const sourceLine = lines.value[getLineIndex(fromLine)]
    if (!sourceLine || !sourceLine.callId || sourceLine.status === 'idle') {
      throw new Error(`No active call on line ${fromLine}`)
    }

    isLoading.value = true

    try {
      // Determine target type
      if (typeof target === 'number') {
        // Transfer to another line
        if (!isValidLineNumber(target, lineCount)) {
          throw new Error(`Invalid target line: ${target}`)
        }

        const targetLine = lines.value[getLineIndex(target)]
        if (!targetLine || !targetLine.callId || targetLine.status === 'idle') {
          throw new Error(`No active call on target line ${target}`)
        }

        // Perform attended transfer between lines
        logger.info('Line-to-line transfer', { fromLine, toLine: target, attended })
        // Note: Actual transfer implementation depends on PBX capabilities
        // This would typically use REFER for attended transfer
      } else {
        // Transfer to external target
        if (!isValidTarget(target)) {
          throw new Error('Invalid transfer target')
        }

        logger.info('External transfer', { fromLine, target, attended })
        // Note: Actual transfer implementation depends on PBX capabilities
      }

      // For now, just hangup the source line after transfer
      await hangupCall(fromLine)
    } finally {
      isLoading.value = false
    }
  }

  const swapLines = async (line1: LineNumber, line2: LineNumber): Promise<void> => {
    if (!isValidLineNumber(line1, lineCount) || !isValidLineNumber(line2, lineCount)) {
      throw new Error('Invalid line numbers')
    }

    const lineState1 = lines.value[getLineIndex(line1)]
    const lineState2 = lines.value[getLineIndex(line2)]

    if (!lineState1 || !lineState2) {
      logger.warn('Cannot swap lines - invalid line states')
      return
    }

    // Determine which line needs to be held and which needs to be activated
    if (lineState1.status === 'active' && lineState2.status === 'held') {
      await holdLine(line1)
      await unholdLine(line2)
      selectLine(line2)
    } else if (lineState1.status === 'held' && lineState2.status === 'active') {
      await holdLine(line2)
      await unholdLine(line1)
      selectLine(line1)
    } else {
      logger.warn('Cannot swap lines - one must be active, one must be held', {
        line1: lineState1.status,
        line2: lineState2.status,
      })
    }
  }

  const mergeLines = async (_options: LineConferenceOptions): Promise<void> => {
    // Note: Conference/merge requires PBX support
    // This would typically use a conference bridge feature
    throw new Error('Line merge/conference not implemented - requires PBX conference bridge support')
  }

  const parkCall = async (lineNumber: LineNumber, _parkingLot?: string): Promise<string> => {
    if (!isValidLineNumber(lineNumber, lineCount)) {
      throw new Error(`Invalid line number: ${lineNumber}`)
    }

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || !line.callId || line.status === 'idle') {
      throw new Error(`No active call on line ${lineNumber}`)
    }

    // Note: Call parking requires PBX/AMI support
    // This would typically use AMI ParkedCall or FeatureCodes
    throw new Error('Call parking not implemented - use useAmiParking composable')
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  const getLineState = (lineNumber: LineNumber): LineState | null => {
    if (!isValidLineNumber(lineNumber, lineCount)) return null
    return lines.value[getLineIndex(lineNumber)] ?? null
  }

  const getLineByCallId = (callId: string): LineState | null => {
    const lineNumber = callToLineMap.get(callId)
    if (lineNumber) {
      return getLineState(lineNumber)
    }
    return null
  }

  const isLineAvailable = (lineNumber: LineNumber): boolean => {
    if (!isValidLineNumber(lineNumber, lineCount)) return false
    const line = lines.value[getLineIndex(lineNumber)]
    return line?.status === 'idle' && line.config.enabled
  }

  const getLineStats = async (lineNumber: LineNumber): Promise<CallStatistics | null> => {
    if (!isValidLineNumber(lineNumber, lineCount)) return null

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line || !line.callId) return null

    const session = callStore.getCall(line.callId)
    if (session) {
      const sessionWithStats = session as unknown as { getStats?: () => Promise<CallStatistics> }
      if (typeof sessionWithStats.getStats === 'function') {
        return sessionWithStats.getStats()
      }
    }

    return null
  }

  const configureLine = (lineNumber: LineNumber, config: Partial<LineConfig>): void => {
    if (!isValidLineNumber(lineNumber, lineCount)) return

    const line = lines.value[getLineIndex(lineNumber)]
    if (line) {
      line.config = { ...line.config, ...config, lineNumber } // Preserve line number
      logger.debug('Line configured', { lineNumber, config })
    }
  }

  const resetLine = (lineNumber: LineNumber): void => {
    if (!isValidLineNumber(lineNumber, lineCount)) return

    const line = lines.value[getLineIndex(lineNumber)]
    if (!line) return

    // Cleanup
    if (line.callId) {
      callToLineMap.delete(line.callId)
    }
    stopDurationTracking(lineNumber)

    // Reset state
    const config = line.config
    lines.value[getLineIndex(lineNumber)] = createInitialLineState(lineNumber, config)

    logger.debug('Line reset', { lineNumber })
  }

  const resetAllLines = (): void => {
    for (let i = 1; i <= lineCount; i++) {
      resetLine(i)
    }
    callToLineMap.clear()
    logger.info('All lines reset')
  }

  // ============================================================================
  // SIP Client Event Listeners
  // ============================================================================

  function setupSipClientListeners(): void {
    if (!sipClient.value) return

    // Listen for incoming calls
    const handleNewCall = (session: CallSession): void => {
      if (session.direction === 'incoming') {
        handleIncomingCall(session)
      }
    }

    // Note: The actual event names depend on SipClient implementation
    // These would typically be 'newRTCSession' or 'incomingCall' events
    // Use type assertion for event listener methods
    const client = sipClient.value as unknown as {
      on?: (event: string, handler: (session: CallSession) => void) => void
      off?: (event: string, handler: (session: CallSession) => void) => void
    }
    if (typeof client.on === 'function') {
      client.on('incomingCall', handleNewCall)
      eventCleanups.push(() => {
        const currentClient = sipClient.value as unknown as {
          off?: (event: string, handler: (session: CallSession) => void) => void
        }
        currentClient.off?.('incomingCall', handleNewCall)
      })
    }
  }

  // Initialize SIP client listeners
  setupSipClientListeners()

  // ============================================================================
  // Cleanup
  // ============================================================================

  onUnmounted(() => {
    // Stop all duration timers
    for (const [lineNumber] of durationTimers) {
      stopDurationTracking(lineNumber)
    }
    durationTimers.clear()

    // Clean up event listeners
    eventCleanups.forEach((cleanup) => cleanup())

    // Clear mappings
    callToLineMap.clear()

    logger.debug('useSipSecondLine unmounted')
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    lines,
    selectedLine,
    selectedLineState,
    activeCallCount,
    incomingCallCount,
    allLinesBusy,
    availableLines,
    activeLines,
    ringingLines,
    heldLines,
    isLoading,
    error,

    // Line Selection
    selectLine,
    selectNextAvailable,
    selectRingingLine,

    // Call Methods
    makeCall,
    answerCall,
    rejectCall,
    hangupCall,
    hangupAll,

    // Call Controls
    holdLine,
    unholdLine,
    toggleHoldLine,
    muteLine,
    unmuteLine,
    toggleMuteLine,
    sendDTMF,

    // Advanced Features
    transferCall,
    swapLines,
    mergeLines,
    parkCall,

    // Utilities
    getLineState,
    getLineByCallId,
    isLineAvailable,
    getLineStats,
    configureLine,
    resetLine,
    resetAllLines,
  }
}
