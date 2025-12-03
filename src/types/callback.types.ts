/**
 * Callback Queue Type Definitions
 *
 * Type definitions for scheduled callback queue functionality via AMI.
 * Supports scheduling callbacks, callback execution, and AstDB persistence.
 *
 * @module types/callback
 */

import type { Ref, ComputedRef } from 'vue'

/**
 * Callback status
 */
export type CallbackStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

/**
 * Callback priority levels
 */
export type CallbackPriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * Callback request from a caller
 */
export interface CallbackRequest {
  /** Unique callback ID */
  id: string

  /** Caller's phone number to call back */
  callerNumber: string

  /** Optional caller name */
  callerName?: string

  /** Queue or extension that should handle the callback */
  targetQueue?: string

  /** Specific agent to handle the callback */
  targetAgent?: string

  /** Original call context (why they called) */
  reason?: string

  /** Notes added by agent or system */
  notes?: string

  /** Priority level */
  priority: CallbackPriority

  /** Current status */
  status: CallbackStatus

  /** When the callback was requested */
  requestedAt: Date

  /** Scheduled callback time (if specified) */
  scheduledAt?: Date

  /** When the callback was actually executed */
  executedAt?: Date

  /** When the callback was completed */
  completedAt?: Date

  /** Number of callback attempts */
  attempts: number

  /** Maximum attempts before marking as failed */
  maxAttempts: number

  /** Agent who handled the callback */
  handledBy?: string

  /** Channel ID when callback is in progress */
  channel?: string

  /** Duration of the callback call in seconds */
  duration?: number

  /** Result/disposition of the callback */
  disposition?: 'answered' | 'no_answer' | 'busy' | 'failed' | 'voicemail'

  /** Custom metadata */
  metadata?: Record<string, string>
}

/**
 * Options for scheduling a callback
 */
export interface ScheduleCallbackOptions {
  /** Caller's phone number */
  callerNumber: string

  /** Optional caller name */
  callerName?: string

  /** Queue to route callback through */
  targetQueue?: string

  /** Specific agent to handle callback */
  targetAgent?: string

  /** Reason for callback */
  reason?: string

  /** Priority (default: normal) */
  priority?: CallbackPriority

  /** Scheduled time (default: immediate/ASAP) */
  scheduledAt?: Date

  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number

  /** Caller ID to show when calling back */
  callerId?: string

  /** Timeout for each attempt in seconds */
  timeout?: number

  /** Custom metadata */
  metadata?: Record<string, string>
}

/**
 * Options for executing a callback
 */
export interface ExecuteCallbackOptions {
  /** Override caller ID for this execution */
  callerId?: string

  /** Override timeout */
  timeout?: number

  /** Context for the call */
  context?: string

  /** Channel variables */
  variables?: Record<string, string>

  /** Extension to dial after connecting (e.g., IVR menu) */
  extension?: string
}

/**
 * Callback queue statistics
 */
export interface CallbackQueueStats {
  /** Total callbacks pending */
  pending: number

  /** Callbacks scheduled for later */
  scheduled: number

  /** Currently in progress */
  inProgress: number

  /** Completed today */
  completedToday: number

  /** Failed today */
  failedToday: number

  /** Average callback time in seconds */
  avgCallbackTime: number

  /** Success rate (0-100) */
  successRate: number

  /** Callbacks by priority */
  byPriority: Record<CallbackPriority, number>
}

/**
 * AstDB storage configuration
 */
export interface CallbackStorageConfig {
  /** AstDB family name for callbacks */
  dbFamily: string

  /** Maximum callbacks to keep in memory */
  maxInMemory: number

  /** Auto-cleanup completed callbacks older than (ms) */
  cleanupAge: number

  /** Persist to AstDB on changes */
  persistEnabled: boolean
}

/**
 * Options for useAmiCallback composable
 */
export interface UseAmiCallbackOptions {
  /** Default queue for callbacks */
  defaultQueue?: string

  /** Default caller ID for outgoing callbacks */
  defaultCallerId?: string

  /** Default maximum attempts */
  defaultMaxAttempts?: number

  /** Default timeout per attempt (seconds) */
  defaultTimeout?: number

  /** Context for callback calls */
  defaultContext?: string

  /** Retry delay between attempts (seconds) */
  retryDelay?: number

  /** Auto-execute pending callbacks */
  autoExecute?: boolean

  /** Auto-execute interval (ms) */
  autoExecuteInterval?: number

  /** Storage configuration */
  storage?: Partial<CallbackStorageConfig>

  /** Callback when a new request is added */
  onCallbackAdded?: (callback: CallbackRequest) => void

  /** Callback when execution starts */
  onCallbackStarted?: (callback: CallbackRequest) => void

  /** Callback when completed successfully */
  onCallbackCompleted?: (callback: CallbackRequest) => void

  /** Callback when failed */
  onCallbackFailed?: (callback: CallbackRequest, error: string) => void

  /** Callback when cancelled */
  onCallbackCancelled?: (callback: CallbackRequest) => void
}

/**
 * Return type for useAmiCallback composable
 */
export interface UseAmiCallbackReturn {
  // ============================================================================
  // Reactive State
  // ============================================================================

  /** All callback requests */
  callbacks: Ref<CallbackRequest[]>

  /** Current callback being executed */
  activeCallback: Ref<CallbackRequest | null>

  /** Queue statistics */
  stats: Ref<CallbackQueueStats>

  /** Loading state */
  isLoading: Ref<boolean>

  /** Error message */
  error: Ref<string | null>

  /** Auto-execute enabled */
  autoExecuteEnabled: Ref<boolean>

  // ============================================================================
  // Computed
  // ============================================================================

  /** Pending callbacks (not yet executed) */
  pendingCallbacks: ComputedRef<CallbackRequest[]>

  /** Scheduled callbacks (with future scheduledAt) */
  scheduledCallbacks: ComputedRef<CallbackRequest[]>

  /** Completed callbacks */
  completedCallbacks: ComputedRef<CallbackRequest[]>

  /** Failed callbacks */
  failedCallbacks: ComputedRef<CallbackRequest[]>

  /** Whether a callback is in progress */
  isExecuting: ComputedRef<boolean>

  /** Next callback to execute (by priority and time) */
  nextCallback: ComputedRef<CallbackRequest | null>

  /** Total pending count */
  pendingCount: ComputedRef<number>

  // ============================================================================
  // Methods
  // ============================================================================

  /** Schedule a new callback */
  scheduleCallback: (options: ScheduleCallbackOptions) => Promise<CallbackRequest>

  /** Execute a specific callback */
  executeCallback: (callbackId: string, options?: ExecuteCallbackOptions) => Promise<void>

  /** Execute next pending callback */
  executeNext: (options?: ExecuteCallbackOptions) => Promise<void>

  /** Cancel a callback */
  cancelCallback: (callbackId: string, reason?: string) => Promise<void>

  /** Reschedule a callback */
  rescheduleCallback: (callbackId: string, newTime: Date) => Promise<void>

  /** Update callback priority */
  updatePriority: (callbackId: string, priority: CallbackPriority) => void

  /** Add notes to callback */
  addNotes: (callbackId: string, notes: string) => void

  /** Mark callback as completed manually */
  markCompleted: (callbackId: string, disposition?: CallbackRequest['disposition']) => void

  /** Get callback by ID */
  getCallback: (callbackId: string) => CallbackRequest | undefined

  /** Get callbacks for specific number */
  getCallbacksForNumber: (phoneNumber: string) => CallbackRequest[]

  // ============================================================================
  // Queue Management
  // ============================================================================

  /** Start auto-execute mode */
  startAutoExecute: () => void

  /** Stop auto-execute mode */
  stopAutoExecute: () => void

  /** Clear completed callbacks */
  clearCompleted: () => void

  /** Clear failed callbacks */
  clearFailed: () => void

  /** Refresh stats */
  refreshStats: () => void

  // ============================================================================
  // Persistence
  // ============================================================================

  /** Load callbacks from AstDB */
  loadFromStorage: () => Promise<void>

  /** Save callbacks to AstDB */
  saveToStorage: () => Promise<void>

  /** Clear all stored callbacks */
  clearStorage: () => Promise<void>
}
