/**
 * Paging/Intercom Type Definitions
 *
 * Type definitions for Asterisk paging and intercom functionality via AMI.
 * Supports single extension paging, group paging, and duplex intercom.
 *
 * @module types/paging
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * Paging mode
 */
export type PagingMode = 'simplex' | 'duplex'

/**
 * Paging status
 */
export type PagingStatus = 'idle' | 'paging' | 'connected' | 'error'

/**
 * Page group configuration
 */
export interface PageGroup {
  /** Unique group identifier */
  id: string

  /** Group name for display */
  name: string

  /** Extensions included in this group */
  extensions: string[]

  /** Default paging mode for this group */
  mode: PagingMode

  /** Whether group is enabled */
  enabled: boolean

  /** Optional description */
  description?: string

  /** Caller ID to display when paging this group */
  callerId?: string

  /** Custom timeout in seconds */
  timeout?: number
}

/**
 * Active paging session
 */
export interface PagingSession {
  /** Unique session ID */
  sessionId: string

  /** Target extension or group ID */
  target: string

  /** Whether target is a group */
  isGroup: boolean

  /** Paging mode */
  mode: PagingMode

  /** Current status */
  status: PagingStatus

  /** Channel identifier from AMI */
  channel?: string

  /** Start timestamp */
  startTime: Date

  /** End timestamp if completed */
  endTime?: Date

  /** Duration in seconds */
  duration: number

  /** Error message if status is error */
  error?: string

  /** Extensions that answered (for group paging) */
  answeredExtensions?: string[]
}

/**
 * Paging event
 */
export interface PagingEvent {
  /** Event type */
  type: 'started' | 'connected' | 'ended' | 'error'

  /** Session information */
  session: PagingSession

  /** Timestamp */
  timestamp: Date
}

/**
 * Options for initiating a page
 */
export interface PageOptions {
  /** Paging mode (default: simplex) */
  mode?: PagingMode

  /** Caller ID to display */
  callerId?: string

  /** Timeout in seconds (default: 30) */
  timeout?: number

  /** Context for paging (default: from config) */
  context?: string

  /** Channel variables */
  variables?: Record<string, string>

  /** Whether to auto-answer (for supported endpoints) */
  autoAnswer?: boolean
}

/**
 * Options for group paging
 */
export interface GroupPageOptions extends PageOptions {
  /** Only page specific extensions from the group */
  filterExtensions?: string[]

  /** Maximum concurrent calls in group page */
  maxChannels?: number

  /** Skip busy extensions */
  skipBusy?: boolean
}

/**
 * Options for useAmiPaging composable
 */
export interface UseAmiPagingOptions {
  /** Default paging mode */
  defaultMode?: PagingMode

  /** Default timeout in seconds */
  defaultTimeout?: number

  /** Default context for paging */
  defaultContext?: string

  /** Default caller ID */
  defaultCallerId?: string

  /** Initial page groups */
  pageGroups?: PageGroup[]

  /** Auto-answer header for SIP (e.g., 'Call-Info: answer-after=0') */
  autoAnswerHeader?: string

  /** Callback when paging starts */
  onPageStart?: (session: PagingSession) => void

  /** Callback when paging connects (duplex mode) */
  onPageConnect?: (session: PagingSession) => void

  /** Callback when paging ends */
  onPageEnd?: (session: PagingSession) => void

  /** Callback on error */
  onError?: (error: string, session?: PagingSession) => void
}

/**
 * Return type for useAmiPaging composable
 */
export interface UseAmiPagingReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** Current paging status */
  status: Ref<PagingStatus>

  /** Active paging session */
  activeSession: Ref<PagingSession | null>

  /** Page groups */
  pageGroups: Ref<PageGroup[]>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message */
  error: Ref<string | null>

  /** Paging history */
  history: Ref<PagingSession[]>

  // ============================================================================
  // Computed
  // ============================================================================

  /** Whether currently paging */
  isPaging: ComputedRef<boolean>

  /** Whether connected (duplex mode) */
  isConnected: ComputedRef<boolean>

  /** Current session duration in seconds */
  currentDuration: ComputedRef<number>

  /** Enabled page groups */
  enabledGroups: ComputedRef<PageGroup[]>

  /** Group count */
  groupCount: ComputedRef<number>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Page a single extension */
  pageExtension: (extension: string, options?: PageOptions) => Promise<PagingSession>

  /** Page a group */
  pageGroup: (groupId: string, options?: GroupPageOptions) => Promise<PagingSession>

  /** Page multiple extensions directly */
  pageExtensions: (extensions: string[], options?: GroupPageOptions) => Promise<PagingSession>

  /** End active paging session */
  endPage: () => Promise<void>

  /** Toggle page (start/stop) */
  togglePage: (target: string, isGroup?: boolean, options?: PageOptions) => Promise<void>

  // ============================================================================
  // Group Management
  // ============================================================================

  /** Add a page group */
  addGroup: (group: PageGroup) => void

  /** Update a page group */
  updateGroup: (groupId: string, updates: Partial<PageGroup>) => void

  /** Remove a page group */
  removeGroup: (groupId: string) => void

  /** Get a page group by ID */
  getGroup: (groupId: string) => PageGroup | undefined

  /** Enable/disable a group */
  toggleGroupEnabled: (groupId: string) => void

  // ============================================================================
  // Utility
  // ============================================================================

  /** Clear paging history */
  clearHistory: () => void

  /** Get history for specific target */
  getHistoryForTarget: (target: string) => PagingSession[]
}
