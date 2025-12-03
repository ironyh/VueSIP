/**
 * IVR Types
 *
 * Type definitions for IVR (Interactive Voice Response) monitoring and control via AMI.
 * Supports caller tracking, menu navigation, breakout control, and statistics.
 *
 * @module types/ivr
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * IVR caller state
 */
export type IVRCallerState =
  | 'entering' // Caller just entered IVR
  | 'listening' // Caller is listening to prompt
  | 'inputting' // Caller is entering DTMF input
  | 'navigating' // Caller is navigating to next menu
  | 'transferring' // Caller is being transferred out
  | 'exiting' // Caller is exiting IVR
  | 'timeout' // Caller timed out
  | 'error' // Error state

/**
 * IVR menu option type
 */
export type IVROptionType =
  | 'menu' // Navigate to another menu
  | 'extension' // Transfer to extension
  | 'queue' // Transfer to queue
  | 'ringgroup' // Transfer to ring group
  | 'voicemail' // Go to voicemail
  | 'external' // Transfer to external number
  | 'hangup' // Hang up
  | 'repeat' // Repeat current menu
  | 'previous' // Go to previous menu
  | 'custom' // Custom action

/**
 * IVR menu option definition
 */
export interface IVRMenuOption {
  /** DTMF digit for this option (0-9, *, #) */
  digit: string

  /** Option type */
  type: IVROptionType

  /** Destination (extension, queue ID, menu ID, etc.) */
  destination: string

  /** Option label/description */
  label: string

  /** Number of times this option was selected */
  timesSelected: number

  /** Whether this option is enabled */
  enabled: boolean
}

/**
 * IVR menu definition
 */
export interface IVRMenu {
  /** Unique menu identifier */
  id: string

  /** Menu name/title */
  name: string

  /** Menu description */
  description?: string

  /** Prompt/announcement file to play */
  prompt?: string

  /** Timeout in seconds before retry/exit */
  timeout: number

  /** Maximum invalid attempts before exit */
  maxRetries: number

  /** Available menu options */
  options: IVRMenuOption[]

  /** Whether this is the root/main menu */
  isRoot: boolean

  /** Parent menu ID (for nested menus) */
  parentMenuId?: string

  /** Whether this menu is currently enabled */
  enabled: boolean

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * IVR caller information
 */
export interface IVRCaller {
  /** Unique caller identifier (channel) */
  id: string

  /** SIP channel identifier */
  channel: string

  /** Caller ID number */
  callerIdNum: string

  /** Caller ID name */
  callerIdName: string

  /** Current IVR ID */
  ivrId: string

  /** Current menu ID */
  currentMenuId: string

  /** Current state */
  state: IVRCallerState

  /** Time caller entered IVR */
  enteredAt: Date

  /** Time in current menu */
  menuEnteredAt: Date

  /** Navigation history (menu IDs) */
  navigationHistory: string[]

  /** DTMF input collected */
  dtmfInput: string

  /** Number of invalid attempts */
  invalidAttempts: number

  /** Whether caller is in timeout state */
  timedOut: boolean

  /** Last activity timestamp */
  lastActivity: Date
}

/**
 * IVR statistics
 */
export interface IVRStats {
  /** Total callers that entered IVR */
  totalCallers: number

  /** Callers currently in IVR */
  currentCallers: number

  /** Callers that successfully exited to destination */
  successfulExits: number

  /** Callers that hung up in IVR */
  abandonedCalls: number

  /** Callers that timed out */
  timedOutCalls: number

  /** Average time spent in IVR (seconds) */
  avgTimeInIVR: number

  /** Average number of menu selections */
  avgMenuSelections: number

  /** Most popular menu option */
  mostPopularOption?: {
    menuId: string
    digit: string
    count: number
  }

  /** Peak concurrent callers */
  peakCallers: number

  /** Last call timestamp */
  lastCallTime?: Date
}

/**
 * IVR definition
 */
export interface IVR {
  /** Unique IVR identifier */
  id: string

  /** IVR name */
  name: string

  /** IVR extension to dial */
  extension: string

  /** Description */
  description?: string

  /** Root menu ID */
  rootMenuId: string

  /** All menus in this IVR */
  menus: Map<string, IVRMenu>

  /** Callers currently in this IVR */
  callers: Map<string, IVRCaller>

  /** IVR statistics */
  stats: IVRStats

  /** Whether IVR is enabled */
  enabled: boolean

  /** Business hours (if restricted) */
  businessHours?: {
    start: string // HH:mm format
    end: string
    days: number[] // 0-6 (Sunday-Saturday)
  }

  /** After-hours destination */
  afterHoursDestination?: string

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * IVR event types
 */
export type IVREventType =
  | 'caller_entered' // Caller entered IVR
  | 'menu_entered' // Caller entered a menu
  | 'dtmf_received' // DTMF input received
  | 'option_selected' // Menu option selected
  | 'invalid_input' // Invalid input received
  | 'timeout' // Caller timed out
  | 'caller_transferred' // Caller transferred out
  | 'caller_exited' // Caller exited IVR
  | 'caller_abandoned' // Caller hung up
  | 'breakout_initiated' // Admin initiated breakout
  | 'ivr_enabled' // IVR enabled
  | 'ivr_disabled' // IVR disabled

/**
 * IVR event
 */
export interface IVREvent {
  /** Event type */
  type: IVREventType

  /** IVR ID */
  ivrId: string

  /** Caller ID (channel) */
  callerId?: string

  /** Menu ID (if applicable) */
  menuId?: string

  /** DTMF digit (if applicable) */
  digit?: string

  /** Destination (if applicable) */
  destination?: string

  /** Event timestamp */
  timestamp: Date

  /** Additional event data */
  data?: Record<string, unknown>
}

/**
 * Breakout result
 */
export interface BreakoutResult {
  /** Whether breakout was successful */
  success: boolean

  /** Caller channel */
  channel: string

  /** Destination transferred to */
  destination?: string

  /** Error message if failed */
  error?: string
}

/**
 * Options for the useAmiIVR composable
 */
export interface UseAmiIVROptions {
  /** Auto-start monitoring on creation */
  autoStart?: boolean

  /** Refresh interval in milliseconds */
  refreshInterval?: number

  /** IVR IDs to monitor (empty = all) */
  ivrIds?: string[]

  /** Callback when IVR event occurs */
  onEvent?: (event: IVREvent) => void

  /** Callback when caller enters IVR */
  onCallerEntered?: (ivrId: string, caller: IVRCaller) => void

  /** Callback when caller exits IVR */
  onCallerExited?: (ivrId: string, callerId: string, destination?: string) => void

  /** Callback when caller times out */
  onTimeout?: (ivrId: string, caller: IVRCaller) => void

  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * Return type for useAmiIVR composable
 */
export interface UseAmiIVRReturn {
  // State
  /** All monitored IVRs */
  ivrs: Ref<Map<string, IVR>>

  /** Currently selected IVR */
  selectedIVR: Ref<IVR | null>

  /** Whether monitoring is active */
  isMonitoring: Ref<boolean>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message if any */
  error: Ref<string | null>

  // Computed
  /** List of all IVRs */
  ivrList: ComputedRef<IVR[]>

  /** Total callers across all IVRs */
  totalCallers: ComputedRef<number>

  /** All callers across all IVRs */
  allCallers: ComputedRef<IVRCaller[]>

  /** IVRs with active callers */
  activeIVRs: ComputedRef<IVR[]>

  /** Disabled IVRs */
  disabledIVRs: ComputedRef<IVR[]>

  // Methods
  /** Start monitoring IVRs */
  startMonitoring: () => void

  /** Stop monitoring IVRs */
  stopMonitoring: () => void

  /** Refresh IVR data */
  refresh: () => Promise<void>

  /** Get a specific IVR by ID */
  getIVR: (ivrId: string) => IVR | null

  /** Select an IVR for detailed view */
  selectIVR: (ivrId: string | null) => void

  /** Get callers in a specific IVR */
  getCallers: (ivrId: string) => IVRCaller[]

  /** Get a specific caller */
  getCaller: (ivrId: string, callerId: string) => IVRCaller | null

  /** Breakout a caller from IVR to a destination */
  breakoutCaller: (
    ivrId: string,
    callerId: string,
    destination: string
  ) => Promise<BreakoutResult>

  /** Breakout all callers from an IVR */
  breakoutAllCallers: (ivrId: string, destination: string) => Promise<BreakoutResult[]>

  /** Enable an IVR */
  enableIVR: (ivrId: string) => Promise<boolean>

  /** Disable an IVR */
  disableIVR: (ivrId: string) => Promise<boolean>

  /** Get IVR statistics */
  getStats: (ivrId: string) => IVRStats | null

  /** Clear statistics for an IVR */
  clearStats: (ivrId: string) => void

  /** Get menu option statistics */
  getMenuStats: (ivrId: string, menuId: string) => IVRMenuOption[] | null

  /** Track DTMF input for a caller */
  trackDTMF: (channel: string, digit: string) => void
}
