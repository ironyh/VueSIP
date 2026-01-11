/**
 * Call Center Provider Types
 *
 * Provider-agnostic type definitions for call center functionality.
 * These types abstract platform-specific implementations (Asterisk, FreeSWITCH, Cloud)
 * into a unified interface.
 *
 * @module providers/call-center/types
 */

/**
 * Agent status representing current availability
 */
export type AgentStatus = 'offline' | 'available' | 'busy' | 'wrap-up' | 'break' | 'meeting'

/**
 * Break types for agent unavailability reasons
 */
export type BreakType = 'lunch' | 'short-break' | 'training' | 'meeting' | 'personal' | 'other'

/**
 * Queue membership information
 */
export interface QueueInfo {
  /** Internal queue identifier */
  name: string
  /** Human-readable queue name */
  displayName: string
  /** Whether agent is currently a member */
  isMember: boolean
  /** Whether agent is paused in this queue */
  isPaused: boolean
  /** Agent's penalty/priority in this queue (lower = higher priority) */
  penalty: number
  /** Calls handled in this queue during session */
  callsHandled: number
  /** Timestamp of last call from this queue */
  lastCallTime: Date | null
}

/**
 * Current call information when agent is busy
 */
export interface CurrentCallInfo {
  /** Call identifier */
  callId: string
  /** Queue the call came from */
  fromQueue: string | null
  /** Caller ID or name */
  callerInfo: string
  /** Call start time */
  startTime: Date
  /** Call duration in seconds (updated in real-time) */
  duration: number
  /** Whether call is on hold */
  isOnHold: boolean
}

/**
 * Provider-agnostic agent state
 */
export interface AgentState {
  /** Unique agent identifier */
  agentId: string
  /** Agent display name */
  displayName: string
  /** Current status */
  status: AgentStatus
  /** Agent's phone extension */
  extension: string
  /** Queue memberships */
  queues: QueueInfo[]
  /** Current call info (null if not on call) */
  currentCall: CurrentCallInfo | null
  /** Session login time (null if not logged in) */
  loginTime: Date | null
  /** Whether agent is globally paused */
  isPaused: boolean
  /** Pause reason if paused */
  pauseReason: string | undefined
  /** Break type if on break */
  breakType: BreakType | undefined
}

/**
 * Agent performance metrics for current session
 */
export interface AgentMetrics {
  /** Total calls handled */
  callsHandled: number
  /** Total talk time in seconds */
  totalTalkTime: number
  /** Average handle time (talk + wrap-up) in seconds */
  averageHandleTime: number
  /** Average wrap-up time in seconds */
  averageWrapUpTime: number
  /** Longest call duration in seconds */
  longestCall: number
  /** Shortest call duration in seconds */
  shortestCall: number
  /** Calls that were not answered */
  missedCalls: number
  /** Calls transferred to others */
  transferredCalls: number
  /** Total session duration in seconds */
  sessionDuration: number
}

/**
 * Capabilities supported by the provider
 */
export interface CallCenterCapabilities {
  /** Basic queue support */
  supportsQueues: boolean
  /** Agent can be in multiple queues */
  supportsMultiQueue: boolean
  /** Agent can pause availability */
  supportsPause: boolean
  /** Pause can have reasons */
  supportsPauseReasons: boolean
  /** Different break types available */
  supportsBreakTypes: boolean
  /** Wrap-up time after calls */
  supportsWrapUp: boolean
  /** Real-time metrics available */
  supportsMetrics: boolean
  /** Real-time event streaming */
  supportsRealTimeEvents: boolean
  /** Queue penalty/priority */
  supportsPenalty: boolean
  /** Skill-based routing */
  supportsSkillBasedRouting: boolean
}

/**
 * Provider configuration for initialization
 */
export interface ProviderConfig {
  /** Provider type identifier */
  type: 'asterisk' | 'freeswitch' | 'cloud' | 'custom'
  /** Connection configuration (provider-specific) */
  connection: Record<string, unknown>
  /** Agent configuration */
  agent: {
    /** Agent identifier */
    id: string
    /** Agent extension/interface */
    extension: string
    /** Display name */
    name?: string
  }
  /** Available queues for this agent */
  availableQueues?: string[]
  /** Default queues to join on login */
  defaultQueues?: string[]
  /** Available pause reasons */
  pauseReasons?: string[]
  /** Available break types */
  breakTypes?: BreakType[]
}

/**
 * Login options for agent session
 */
export interface AgentLoginOptions {
  /** Queues to join (uses defaultQueues if not specified) */
  queues?: string[]
  /** Default penalty for all queues */
  defaultPenalty?: number
  /** Queue-specific penalties */
  penalties?: Record<string, number>
}

/**
 * Logout options
 */
export interface AgentLogoutOptions {
  /** Specific queues to leave (all if not specified) */
  queues?: string[]
  /** Logout reason */
  reason?: string
}

/**
 * Pause options
 */
export interface AgentPauseOptions {
  /** Queues to pause in (all if not specified) */
  queues?: string[]
  /** Pause reason */
  reason: string
  /** Break type */
  breakType?: BreakType
  /** Auto-unpause duration in seconds (0 = manual) */
  duration?: number
}

/**
 * State change callback
 */
export type StateChangeCallback = (state: AgentState, previousState: AgentState) => void

/**
 * Queue event types
 */
export type QueueEventType =
  | 'joined'
  | 'left'
  | 'paused'
  | 'unpaused'
  | 'call-received'
  | 'call-completed'

/**
 * Queue event callback
 */
export type QueueEventCallback = (event: {
  type: QueueEventType
  queue: string
  timestamp: Date
  data?: Record<string, unknown>
}) => void

/**
 * Unsubscribe function returned by event subscriptions
 */
export type Unsubscribe = () => void

/**
 * Call Center Provider Interface
 *
 * Provider-agnostic interface that all call center adapters must implement.
 * Abstracts platform-specific details (AMI, ESL, REST APIs) behind a unified API.
 */
export interface CallCenterProvider {
  /** Provider identifier */
  readonly id: string
  /** Human-readable provider name */
  readonly name: string
  /** Provider capabilities */
  readonly capabilities: CallCenterCapabilities

  // Connection lifecycle
  /** Connect to the provider backend */
  connect(config: ProviderConfig): Promise<void>
  /** Disconnect from the provider */
  disconnect(): Promise<void>

  // Agent session
  /** Login agent and join queues */
  login(options?: AgentLoginOptions): Promise<AgentState>
  /** Logout agent from all or specific queues */
  logout(options?: AgentLogoutOptions): Promise<void>

  // Status management
  /** Set agent status */
  setStatus(status: AgentStatus, reason?: string): Promise<void>

  // Queue management
  /** Join a queue */
  joinQueue(queue: string, penalty?: number): Promise<void>
  /** Leave a queue */
  leaveQueue(queue: string): Promise<void>
  /** Pause in queues */
  pause(options: AgentPauseOptions): Promise<void>
  /** Unpause in queues */
  unpause(queues?: string[]): Promise<void>

  // Metrics
  /** Get current session metrics */
  getMetrics(): Promise<AgentMetrics>

  // Events
  /** Subscribe to state changes */
  onStateChange(callback: StateChangeCallback): Unsubscribe
  /** Subscribe to queue events */
  onQueueEvent(callback: QueueEventCallback): Unsubscribe
}
