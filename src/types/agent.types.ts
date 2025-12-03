/**
 * Agent Types for AMI Queue Login/Logout
 *
 * Type definitions for agent queue membership management.
 * Supports multi-queue login, session tracking, and shift management.
 *
 * @module types/agent
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * Agent login status
 */
export type AgentLoginStatus = 'logged_out' | 'logged_in' | 'paused' | 'on_call'

/**
 * Queue membership state for an agent
 */
export interface AgentQueueMembership {
  /** Queue name */
  queue: string

  /** Agent interface (e.g., PJSIP/1001) */
  interface: string

  /** Whether agent is currently a member of this queue */
  isMember: boolean

  /** Whether agent is paused in this queue */
  isPaused: boolean

  /** Pause reason if paused */
  pauseReason?: string

  /** Agent penalty in this queue */
  penalty: number

  /** Number of calls taken in this queue */
  callsTaken: number

  /** Timestamp of last call in this queue (Unix time) */
  lastCall: number

  /** Login timestamp for this queue (Unix time) */
  loginTime: number

  /** Whether agent is currently on a call from this queue */
  inCall: boolean
}

/**
 * Agent session information
 */
export interface AgentSession {
  /** Agent identifier */
  agentId: string

  /** Agent interface (e.g., PJSIP/1001) */
  interface: string

  /** Display name */
  name: string

  /** Current login status */
  status: AgentLoginStatus

  /** Queues the agent is logged into */
  queues: AgentQueueMembership[]

  /** Overall login time (first queue login) */
  loginTime: Date | null

  /** Session duration in seconds */
  sessionDuration: number

  /** Total calls handled this session */
  totalCallsHandled: number

  /** Total talk time this session (seconds) */
  totalTalkTime: number

  /** Whether agent is globally paused */
  isPaused: boolean

  /** Global pause reason */
  pauseReason?: string

  /** Shift start time (if configured) */
  shiftStart?: Date

  /** Shift end time (if configured) */
  shiftEnd?: Date

  /** Whether agent is within shift hours */
  isOnShift: boolean

  /** Server ID for multi-server setups */
  serverId?: number
}

/**
 * Queue selection for login
 */
export interface QueueLoginSelection {
  /** Queue name */
  queue: string

  /** Whether to include this queue in login */
  selected: boolean

  /** Optional penalty for this queue */
  penalty?: number
}

/**
 * Shift configuration
 */
export interface ShiftConfig {
  /** Shift start hour (0-23) */
  startHour: number

  /** Shift start minute (0-59) */
  startMinute: number

  /** Shift end hour (0-23) */
  endHour: number

  /** Shift end minute (0-59) */
  endMinute: number

  /** Days of week (0=Sunday, 6=Saturday) */
  daysOfWeek: number[]

  /** Timezone (IANA format, e.g., 'America/New_York') */
  timezone?: string
}

/**
 * Agent login options
 */
export interface AgentLoginOptions {
  /** Queues to log into */
  queues: string[]

  /** Default penalty for all queues */
  defaultPenalty?: number

  /** Queue-specific penalties */
  penalties?: Record<string, number>

  /** Agent display name */
  memberName?: string

  /** Whether to persist login state in storage */
  persist?: boolean
}

/**
 * Agent logout options
 */
export interface AgentLogoutOptions {
  /** Queues to log out from (empty = all queues) */
  queues?: string[]

  /** Reason for logout */
  reason?: string

  /** Whether to clear persisted state */
  clearPersistence?: boolean
}

/**
 * Agent pause options
 */
export interface AgentPauseOptions {
  /** Queues to pause in (empty = all queues) */
  queues?: string[]

  /** Pause reason */
  reason: string

  /** Duration in seconds (0 = indefinite) */
  duration?: number
}

/**
 * Options for useAmiAgentLogin composable
 */
export interface UseAmiAgentLoginOptions {
  /** Agent identifier */
  agentId: string

  /** Agent interface (e.g., PJSIP/1001) */
  interface: string

  /** Agent display name */
  name?: string

  /** Available queues for this agent */
  availableQueues?: string[]

  /** Default queues to auto-login */
  defaultQueues?: string[]

  /** Default penalty */
  defaultPenalty?: number

  /** Shift configuration */
  shift?: ShiftConfig

  /** Auto-logout after shift end */
  autoLogoutAfterShift?: boolean

  /** Available pause reasons */
  pauseReasons?: string[]

  /** Persist login state to localStorage */
  persistState?: boolean

  /** Storage key prefix for persistence */
  storageKeyPrefix?: string

  /** Callback when login status changes */
  onStatusChange?: (status: AgentLoginStatus, session: AgentSession) => void

  /** Callback when queue membership changes */
  onQueueChange?: (queue: string, isMember: boolean) => void

  /** Callback when shift starts */
  onShiftStart?: () => void

  /** Callback when shift ends */
  onShiftEnd?: () => void

  /** Update session duration interval (ms) */
  sessionUpdateInterval?: number
}

/**
 * Return type for useAmiAgentLogin composable
 */
export interface UseAmiAgentLoginReturn {
  // State
  /** Current agent session */
  session: Ref<AgentSession>

  /** Current login status */
  status: ComputedRef<AgentLoginStatus>

  /** Whether agent is logged in to any queue */
  isLoggedIn: ComputedRef<boolean>

  /** Whether agent is paused */
  isPaused: ComputedRef<boolean>

  /** Whether agent is on a call */
  isOnCall: ComputedRef<boolean>

  /** Whether currently within shift hours */
  isOnShift: ComputedRef<boolean>

  /** List of queues agent is logged into */
  loggedInQueues: ComputedRef<string[]>

  /** Session duration in formatted string */
  sessionDurationFormatted: ComputedRef<string>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message if any */
  error: Ref<string | null>

  // Methods
  /** Log in to queues */
  login: (options: AgentLoginOptions) => Promise<void>

  /** Log out from queues */
  logout: (options?: AgentLogoutOptions) => Promise<void>

  /** Pause in queues */
  pause: (options: AgentPauseOptions) => Promise<void>

  /** Unpause in queues */
  unpause: (queues?: string[]) => Promise<void>

  /** Toggle login state for a queue */
  toggleQueue: (queue: string, penalty?: number) => Promise<void>

  /** Set penalty for a queue */
  setPenalty: (queue: string, penalty: number) => Promise<void>

  /** Refresh session state from AMI */
  refresh: () => Promise<void>

  /** Get available queues */
  getAvailableQueues: () => string[]

  /** Get pause reasons */
  getPauseReasons: () => string[]

  /** Check if logged into specific queue */
  isLoggedIntoQueue: (queue: string) => boolean

  /** Get queue membership details */
  getQueueMembership: (queue: string) => AgentQueueMembership | null

  /** Start session timer (for persistence) */
  startSession: () => void

  /** End session */
  endSession: () => Promise<void>
}

/**
 * AMI AgentCallbackLogin event
 */
export interface AmiAgentCallbackLoginEvent {
  Event: 'AgentCallbackLogin'
  Agent: string
  Loginchan: string
  Uniqueid?: string
}

/**
 * AMI AgentCallbackLogoff event
 */
export interface AmiAgentCallbackLogoffEvent {
  Event: 'AgentCallbackLogoff'
  Agent: string
  Loginchan: string
  Logintime?: string
  Uniqueid?: string
  Reason?: string
}

/**
 * AMI QueueMemberAdded event
 */
export interface AmiQueueMemberAddedEvent {
  Event: 'QueueMemberAdded'
  Queue: string
  MemberName: string
  Interface: string
  StateInterface?: string
  Membership: string
  Penalty: string
  CallsTaken: string
  Status: string
  Paused: string
  Ringinuse?: string
}

/**
 * AMI QueueMemberRemoved event
 */
export interface AmiQueueMemberRemovedEvent {
  Event: 'QueueMemberRemoved'
  Queue: string
  MemberName: string
  Interface: string
}

/**
 * AMI QueueMemberPause event
 */
export interface AmiQueueMemberPauseEvent {
  Event: 'QueueMemberPause'
  Queue: string
  MemberName: string
  Interface: string
  StateInterface?: string
  Paused: string
  PausedReason?: string
  Reason?: string
}
