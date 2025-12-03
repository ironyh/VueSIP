/**
 * Ring Group Types
 *
 * Type definitions for ring group management via AMI.
 * Supports ring group monitoring, member management, and strategy configuration.
 *
 * @module types/ringgroup
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * Ring strategy for determining how members are called
 */
export type RingStrategy =
  | 'ringall' // Ring all members simultaneously
  | 'hunt' // Ring members in order
  | 'memoryhunt' // Start with first, add next on each ring
  | 'firstunavailable' // Ring first unavailable member
  | 'firstnotonphone' // Ring first member not on phone
  | 'random' // Ring random member
  | 'linear' // Ring in linear order
  | 'rrmemory' // Round-robin with memory
  | 'rrordered' // Round-robin in order

/**
 * Member status in a ring group
 */
export type RingGroupMemberStatus =
  | 'available' // Member is available to receive calls
  | 'busy' // Member is on a call
  | 'unavailable' // Member is unavailable (DND, logged out)
  | 'ringing' // Member is currently being rung
  | 'unknown' // Status unknown

/**
 * Ring group state
 */
export type RingGroupState =
  | 'idle' // No active calls in ring group
  | 'ringing' // Ring group is actively ringing members
  | 'connected' // Call connected to a member
  | 'disabled' // Ring group is disabled

/**
 * Ring group member definition
 */
export interface RingGroupMember {
  /** Member extension or interface (e.g., "1001" or "PJSIP/1001") */
  extension: string

  /** Full interface string (e.g., "PJSIP/1001") */
  interface: string

  /** Display name for the member */
  name: string

  /** Current status */
  status: RingGroupMemberStatus

  /** Priority/order in the ring group (lower = higher priority) */
  priority: number

  /** Whether member is currently enabled in the group */
  enabled: boolean

  /** Time member was added to the ring group */
  addedAt?: Date

  /** Last time member's status changed */
  lastStatusChange?: Date

  /** Number of calls answered in this ring group */
  callsAnswered: number

  /** Number of calls missed/not answered */
  callsMissed: number
}

/**
 * Ring group call statistics
 */
export interface RingGroupStats {
  /** Total calls to this ring group */
  totalCalls: number

  /** Calls answered by any member */
  answeredCalls: number

  /** Calls that went unanswered/abandoned */
  unansweredCalls: number

  /** Calls that timed out */
  timedOutCalls: number

  /** Average ring time before answer (seconds) */
  avgRingTime: number

  /** Average talk time (seconds) */
  avgTalkTime: number

  /** Current calls in queue/ringing */
  currentCalls: number

  /** Service level percentage */
  serviceLevel: number

  /** Last call timestamp */
  lastCallTime?: Date
}

/**
 * Ring group definition
 */
export interface RingGroup {
  /** Unique ring group identifier/number */
  id: string

  /** Ring group name/description */
  name: string

  /** Ring group extension to dial */
  extension: string

  /** Ring strategy */
  strategy: RingStrategy

  /** Ring timeout per member (seconds) */
  ringTimeout: number

  /** Total ring timeout before failover (seconds) */
  totalTimeout: number

  /** Current state */
  state: RingGroupState

  /** Whether ring group is enabled */
  enabled: boolean

  /** Members in this ring group */
  members: RingGroupMember[]

  /** Ring group statistics */
  stats: RingGroupStats

  /** Failover destination if no answer */
  failoverDestination?: string

  /** CID name prefix for calls to this group */
  cidNamePrefix?: string

  /** Whether to skip busy members */
  skipBusy: boolean

  /** Whether to confirm answer (requires digit press) */
  confirmAnswer: boolean

  /** Announcement to play to caller */
  announcement?: string

  /** Music on hold class */
  musicOnHold?: string

  /** Last updated timestamp */
  lastUpdated: Date
}

/**
 * Ring group event types
 */
export type RingGroupEventType =
  | 'ring_start' // Call started ringing the group
  | 'member_ring' // Individual member started ringing
  | 'member_answer' // Member answered the call
  | 'member_busy' // Member was busy
  | 'member_noanswer' // Member didn't answer
  | 'call_complete' // Call completed
  | 'call_abandoned' // Caller hung up
  | 'failover' // Call went to failover destination
  | 'member_added' // Member added to group
  | 'member_removed' // Member removed from group
  | 'group_enabled' // Ring group enabled
  | 'group_disabled' // Ring group disabled

/**
 * Ring group event
 */
export interface RingGroupEvent {
  /** Event type */
  type: RingGroupEventType

  /** Ring group ID */
  groupId: string

  /** Member extension (if applicable) */
  member?: string

  /** Caller ID */
  callerId?: string

  /** Channel identifier */
  channel?: string

  /** Event timestamp */
  timestamp: Date

  /** Additional event data */
  data?: Record<string, unknown>
}

/**
 * Options for creating/updating a ring group
 */
export interface RingGroupOptions {
  /** Ring group name */
  name: string

  /** Ring group extension */
  extension: string

  /** Ring strategy */
  strategy?: RingStrategy

  /** Ring timeout per member */
  ringTimeout?: number

  /** Total timeout */
  totalTimeout?: number

  /** Initial members */
  members?: Array<{
    extension: string
    name?: string
    priority?: number
  }>

  /** Failover destination */
  failoverDestination?: string

  /** CID name prefix */
  cidNamePrefix?: string

  /** Skip busy members */
  skipBusy?: boolean

  /** Confirm answer */
  confirmAnswer?: boolean

  /** Announcement */
  announcement?: string

  /** Music on hold class */
  musicOnHold?: string
}

/**
 * Options for the useAmiRingGroups composable
 */
export interface UseAmiRingGroupsOptions {
  /** Auto-start monitoring on creation */
  autoStart?: boolean

  /** Refresh interval in milliseconds */
  refreshInterval?: number

  /** Ring group IDs to monitor (empty = all) */
  groupIds?: string[]

  /** Callback when ring group event occurs */
  onEvent?: (event: RingGroupEvent) => void

  /** Callback when ring group stats update */
  onStatsUpdate?: (groupId: string, stats: RingGroupStats) => void

  /** Callback when member status changes */
  onMemberStatusChange?: (
    groupId: string,
    member: string,
    status: RingGroupMemberStatus
  ) => void

  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * Result of adding a member to a ring group
 */
export interface AddMemberResult {
  success: boolean
  groupId: string
  member: string
  error?: string
}

/**
 * Result of removing a member from a ring group
 */
export interface RemoveMemberResult {
  success: boolean
  groupId: string
  member: string
  error?: string
}

/**
 * Result of updating ring group strategy
 */
export interface UpdateStrategyResult {
  success: boolean
  groupId: string
  strategy: RingStrategy
  error?: string
}

/**
 * Return type for useAmiRingGroups composable
 */
export interface UseAmiRingGroupsReturn {
  // State
  /** All monitored ring groups */
  ringGroups: Ref<Map<string, RingGroup>>

  /** Currently selected ring group */
  selectedGroup: Ref<RingGroup | null>

  /** Whether monitoring is active */
  isMonitoring: Ref<boolean>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message if any */
  error: Ref<string | null>

  // Computed
  /** List of all ring groups */
  groupList: ComputedRef<RingGroup[]>

  /** Total members across all groups */
  totalMembers: ComputedRef<number>

  /** Available members count */
  availableMembers: ComputedRef<number>

  /** Groups with active calls */
  activeGroups: ComputedRef<RingGroup[]>

  /** Groups with disabled status */
  disabledGroups: ComputedRef<RingGroup[]>

  // Methods
  /** Start monitoring ring groups */
  startMonitoring: () => void

  /** Stop monitoring ring groups */
  stopMonitoring: () => void

  /** Refresh ring group data */
  refresh: () => Promise<void>

  /** Get a specific ring group by ID */
  getRingGroup: (groupId: string) => RingGroup | null

  /** Select a ring group for detailed view */
  selectGroup: (groupId: string | null) => void

  /** Add a member to a ring group */
  addMember: (
    groupId: string,
    extension: string,
    options?: { name?: string; priority?: number }
  ) => Promise<AddMemberResult>

  /** Remove a member from a ring group */
  removeMember: (groupId: string, extension: string) => Promise<RemoveMemberResult>

  /** Enable a member in a ring group */
  enableMember: (groupId: string, extension: string) => Promise<boolean>

  /** Disable a member in a ring group */
  disableMember: (groupId: string, extension: string) => Promise<boolean>

  /** Update member priority */
  setMemberPriority: (
    groupId: string,
    extension: string,
    priority: number
  ) => Promise<boolean>

  /** Update ring group strategy */
  setStrategy: (
    groupId: string,
    strategy: RingStrategy
  ) => Promise<UpdateStrategyResult>

  /** Update ring timeout */
  setRingTimeout: (groupId: string, timeout: number) => Promise<boolean>

  /** Enable a ring group */
  enableGroup: (groupId: string) => Promise<boolean>

  /** Disable a ring group */
  disableGroup: (groupId: string) => Promise<boolean>

  /** Get member status */
  getMemberStatus: (
    groupId: string,
    extension: string
  ) => RingGroupMemberStatus | null

  /** Get ring group statistics */
  getStats: (groupId: string) => RingGroupStats | null

  /** Clear statistics for a ring group */
  clearStats: (groupId: string) => void
}
