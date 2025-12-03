/**
 * Multi-Line Support Type Definitions
 *
 * Type definitions for managing multiple concurrent SIP call lines.
 * Supports enterprise scenarios with multiple simultaneous calls,
 * line switching, and call management across lines.
 *
 * @module types/multiline
 */

import type { Ref, ComputedRef } from 'vue'
import type { CallState, CallDirection, TerminationCause, CallTimingInfo, CallStatistics } from './call.types'

/**
 * Line status representing current state
 */
export type LineStatus = 'idle' | 'ringing' | 'active' | 'held' | 'busy' | 'error'

/**
 * Line identifier (1-indexed for user-facing display)
 */
export type LineNumber = number

/**
 * Individual line configuration
 */
export interface LineConfig {
  /** Line number (1-indexed) */
  lineNumber: LineNumber

  /** Custom label for this line */
  label?: string

  /** Whether this line is enabled */
  enabled: boolean

  /** Default audio setting for calls on this line */
  defaultAudio?: boolean

  /** Default video setting for calls on this line */
  defaultVideo?: boolean

  /** Custom ringtone for this line */
  ringtone?: string

  /** Auto-answer settings for this line */
  autoAnswer?: boolean

  /** Auto-answer delay in milliseconds */
  autoAnswerDelay?: number
}

/**
 * Line state representing current call information
 */
export interface LineState {
  /** Line number (1-indexed) */
  lineNumber: LineNumber

  /** Current status of the line */
  status: LineStatus

  /** Call ID if there's an active call */
  callId: string | null

  /** Call state if there's an active call */
  callState: CallState | null

  /** Call direction */
  direction: CallDirection | null

  /** Remote party URI */
  remoteUri: string | null

  /** Remote party display name */
  remoteDisplayName: string | null

  /** Whether this line is currently on hold */
  isOnHold: boolean

  /** Whether this line is currently muted */
  isMuted: boolean

  /** Whether this line has video */
  hasVideo: boolean

  /** Call timing information */
  timing: CallTimingInfo | null

  /** Call duration in seconds */
  duration: number

  /** Error message if status is 'error' */
  error: string | null

  /** Line configuration */
  config: LineConfig
}

/**
 * Options for making a call on a specific line
 */
export interface LineCallOptions {
  /** Target line number (auto-selects if not specified) */
  lineNumber?: LineNumber

  /** Enable audio */
  audio?: boolean

  /** Enable video */
  video?: boolean

  /** Custom SIP headers */
  extraHeaders?: string[]

  /** Custom call data */
  data?: Record<string, unknown>
}

/**
 * Options for answering a call on a specific line
 */
export interface LineAnswerOptions {
  /** Enable audio */
  audio?: boolean

  /** Enable video */
  video?: boolean

  /** Custom SIP headers */
  extraHeaders?: string[]
}

/**
 * Options for transferring a call
 */
export interface LineTransferOptions {
  /** Source line number */
  fromLine: LineNumber

  /** Target for transfer (can be another line or external target) */
  target: LineNumber | string

  /** Whether to perform attended transfer */
  attended?: boolean

  /** Custom SIP headers */
  extraHeaders?: string[]
}

/**
 * Options for conference between lines
 */
export interface LineConferenceOptions {
  /** Lines to include in conference */
  lines: LineNumber[]

  /** Whether to allow adding more participants later */
  allowAdd?: boolean
}

/**
 * Line event types
 */
export interface LineEvent {
  /** Event type */
  type: string

  /** Line number */
  lineNumber: LineNumber

  /** Timestamp */
  timestamp: Date

  /** Previous state */
  previousState?: LineState

  /** Current state */
  currentState: LineState
}

/**
 * Line state change event
 */
export interface LineStateChangeEvent extends LineEvent {
  type: 'stateChange'
}

/**
 * Line incoming call event
 */
export interface LineIncomingCallEvent extends LineEvent {
  type: 'incomingCall'

  /** Remote party URI */
  remoteUri: string

  /** Remote party display name */
  remoteDisplayName?: string
}

/**
 * Line call ended event
 */
export interface LineCallEndedEvent extends LineEvent {
  type: 'callEnded'

  /** Termination cause */
  cause: TerminationCause

  /** Call duration in seconds */
  duration: number
}

/**
 * Line selection change event
 */
export interface LineSelectionChangeEvent extends LineEvent {
  type: 'selectionChange'

  /** Previous selected line */
  previousLine: LineNumber | null

  /** New selected line */
  newLine: LineNumber
}

/**
 * Options for useSipSecondLine composable
 */
export interface UseSipSecondLineOptions {
  /** Number of lines to support (default: 2) */
  lineCount?: number

  /** Maximum concurrent calls allowed (default: lineCount) */
  maxConcurrentCalls?: number

  /** Auto-hold other lines when making/answering call (default: true) */
  autoHoldOnNewCall?: boolean

  /** Auto-select next available line for incoming calls (default: true) */
  autoSelectLine?: boolean

  /** Line configurations */
  lineConfigs?: Partial<LineConfig>[]

  /** Callback when line state changes */
  onLineStateChange?: (event: LineStateChangeEvent) => void

  /** Callback when incoming call on a line */
  onLineIncomingCall?: (event: LineIncomingCallEvent) => void

  /** Callback when call ends on a line */
  onLineCallEnded?: (event: LineCallEndedEvent) => void

  /** Callback when selected line changes */
  onSelectionChange?: (event: LineSelectionChangeEvent) => void
}

/**
 * Return type for useSipSecondLine composable
 */
export interface UseSipSecondLineReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Array of all line states */
  lines: Ref<LineState[]>

  /** Currently selected/active line number */
  selectedLine: Ref<LineNumber>

  /** Currently selected line state */
  selectedLineState: ComputedRef<LineState | null>

  /** Number of active calls across all lines */
  activeCallCount: ComputedRef<number>

  /** Number of lines with incoming calls */
  incomingCallCount: ComputedRef<number>

  /** Whether all lines are busy */
  allLinesBusy: ComputedRef<boolean>

  /** Available (idle) lines */
  availableLines: ComputedRef<LineState[]>

  /** Lines with active calls */
  activeLines: ComputedRef<LineState[]>

  /** Lines with incoming calls (ringing) */
  ringingLines: ComputedRef<LineState[]>

  /** Lines on hold */
  heldLines: ComputedRef<LineState[]>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message */
  error: Ref<string | null>

  // ============================================================================
  // Line Selection Methods
  // ============================================================================

  /** Select a specific line */
  selectLine: (lineNumber: LineNumber) => void

  /** Select next available line */
  selectNextAvailable: () => LineNumber | null

  /** Select line with incoming call */
  selectRingingLine: () => LineNumber | null

  // ============================================================================
  // Call Methods
  // ============================================================================

  /** Make a call on a specific line (or auto-select) */
  makeCall: (target: string, options?: LineCallOptions) => Promise<LineNumber>

  /** Answer incoming call on a specific line */
  answerCall: (lineNumber: LineNumber, options?: LineAnswerOptions) => Promise<void>

  /** Reject incoming call on a specific line */
  rejectCall: (lineNumber: LineNumber, statusCode?: number) => Promise<void>

  /** Hangup call on a specific line */
  hangupCall: (lineNumber: LineNumber) => Promise<void>

  /** Hangup all calls */
  hangupAll: () => Promise<void>

  // ============================================================================
  // Call Control Methods
  // ============================================================================

  /** Put a line on hold */
  holdLine: (lineNumber: LineNumber) => Promise<void>

  /** Resume a held line */
  unholdLine: (lineNumber: LineNumber) => Promise<void>

  /** Toggle hold state on a line */
  toggleHoldLine: (lineNumber: LineNumber) => Promise<void>

  /** Mute a line */
  muteLine: (lineNumber: LineNumber) => void

  /** Unmute a line */
  unmuteLine: (lineNumber: LineNumber) => void

  /** Toggle mute on a line */
  toggleMuteLine: (lineNumber: LineNumber) => void

  /** Send DTMF on a line */
  sendDTMF: (lineNumber: LineNumber, tone: string) => Promise<void>

  // ============================================================================
  // Advanced Features
  // ============================================================================

  /** Transfer call from one line to another or external target */
  transferCall: (options: LineTransferOptions) => Promise<void>

  /** Swap between two active/held lines */
  swapLines: (line1: LineNumber, line2: LineNumber) => Promise<void>

  /** Merge lines into conference (if supported) */
  mergeLines: (options: LineConferenceOptions) => Promise<void>

  /** Park a call from a specific line */
  parkCall: (lineNumber: LineNumber, parkingLot?: string) => Promise<string>

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /** Get line state by number */
  getLineState: (lineNumber: LineNumber) => LineState | null

  /** Get line by call ID */
  getLineByCallId: (callId: string) => LineState | null

  /** Check if a line is available */
  isLineAvailable: (lineNumber: LineNumber) => boolean

  /** Get call statistics for a line */
  getLineStats: (lineNumber: LineNumber) => Promise<CallStatistics | null>

  /** Configure a specific line */
  configureLine: (lineNumber: LineNumber, config: Partial<LineConfig>) => void

  /** Reset a line to idle state */
  resetLine: (lineNumber: LineNumber) => void

  /** Reset all lines */
  resetAllLines: () => void
}

/**
 * Line action result
 */
export interface LineActionResult {
  /** Whether the action succeeded */
  success: boolean

  /** Line number affected */
  lineNumber: LineNumber

  /** Error message if failed */
  error?: string

  /** Additional data */
  data?: Record<string, unknown>
}

/**
 * Multi-line session state for persistence
 */
export interface MultiLineSessionState {
  /** Selected line number */
  selectedLine: LineNumber

  /** Line configurations */
  lineConfigs: LineConfig[]

  /** Timestamp of state save */
  timestamp: Date
}
