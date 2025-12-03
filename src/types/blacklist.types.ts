/**
 * Blacklist/Call Blocking Types
 *
 * Type definitions for call blocking functionality via AstDB.
 * Supports number blocking, caller ID matching, and spam detection.
 *
 * @packageDocumentation
 */

/**
 * Reason why a number was blocked
 */
export type BlockReason =
  | 'spam'
  | 'harassment'
  | 'telemarketer'
  | 'robocall'
  | 'unwanted'
  | 'scam'
  | 'manual'
  | 'imported'

/**
 * Action to take when blocked call is received
 */
export type BlockAction = 'hangup' | 'busy' | 'congestion' | 'voicemail' | 'announcement'

/**
 * Status of a blocked number entry
 */
export type BlockStatus = 'active' | 'disabled' | 'expired'

/**
 * Block entry representing a blocked number
 */
export interface BlockEntry {
  /** Phone number or pattern (supports wildcards like 1800*) */
  number: string
  /** Reason for blocking */
  reason: BlockReason
  /** Action to take when call from this number is received */
  action: BlockAction
  /** Optional description or notes */
  description?: string
  /** When the number was blocked */
  blockedAt: Date
  /** When the block expires (optional, undefined = permanent) */
  expiresAt?: Date
  /** Who blocked the number (extension or system) */
  blockedBy?: string
  /** Current status */
  status: BlockStatus
  /** Number of blocked call attempts from this number */
  blockedCount: number
  /** Last time a call was blocked from this number */
  lastBlockedAt?: Date
}

/**
 * Result of adding a number to the blacklist
 */
export interface BlockResult {
  success: boolean
  number: string
  message?: string
  entry?: BlockEntry
}

/**
 * Result of removing a number from the blacklist
 */
export interface UnblockResult {
  success: boolean
  number: string
  message?: string
}

/**
 * Caller ID reputation information
 */
export interface CallerReputation {
  /** Phone number */
  number: string
  /** Spam score (0-100, higher = more likely spam) */
  spamScore: number
  /** Is this number in the blacklist */
  isBlocked: boolean
  /** Category based on known databases */
  category?: 'spam' | 'telemarketer' | 'robocall' | 'scam' | 'legitimate' | 'unknown'
  /** Number of reports */
  reportCount: number
  /** Provider information if available */
  provider?: string
  /** Location information if available */
  location?: string
}

/**
 * Blacklist statistics
 */
export interface BlacklistStats {
  /** Total number of blocked entries */
  totalEntries: number
  /** Active blocks */
  activeEntries: number
  /** Disabled blocks */
  disabledEntries: number
  /** Expired blocks */
  expiredEntries: number
  /** Total blocked calls */
  totalBlockedCalls: number
  /** Blocked calls today */
  blockedToday: number
  /** Blocked calls this week */
  blockedThisWeek: number
  /** Breakdown by reason */
  byReason: Record<BlockReason, number>
  /** Breakdown by action */
  byAction: Record<BlockAction, number>
}

/**
 * Options for querying the blacklist
 */
export interface BlacklistQueryOptions {
  /** Filter by status */
  status?: BlockStatus | 'all'
  /** Filter by reason */
  reason?: BlockReason
  /** Filter by action */
  action?: BlockAction
  /** Search pattern (supports wildcards) */
  search?: string
  /** Sort field */
  sortBy?: 'number' | 'blockedAt' | 'blockedCount' | 'lastBlockedAt'
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Pagination offset */
  offset?: number
  /** Pagination limit */
  limit?: number
}

/**
 * Import/export format
 */
export type BlacklistFormat = 'json' | 'csv' | 'txt'

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  failed: number
  errors: Array<{ number: string; error: string }>
}

/**
 * Configuration options for useAmiBlacklist
 */
export interface UseAmiBlacklistOptions {
  /** AstDB family for blacklist storage (default: 'blacklist') */
  dbFamily?: string
  /** Extension to associate with blacklist (optional, for per-extension lists) */
  extension?: string
  /** Default action for new blocks (default: 'hangup') */
  defaultAction?: BlockAction
  /** Default reason for new blocks (default: 'manual') */
  defaultReason?: BlockReason
  /** Auto-clean expired entries (default: true) */
  autoCleanExpired?: boolean
  /** Enable spam detection integration (default: false) */
  enableSpamDetection?: boolean
  /** Spam score threshold for auto-blocking (0-100, default: 80) */
  spamThreshold?: number
  /** Callback when number is blocked */
  onNumberBlocked?: (entry: BlockEntry) => void
  /** Callback when number is unblocked */
  onNumberUnblocked?: (number: string) => void
  /** Callback when call is blocked */
  onCallBlocked?: (number: string, entry: BlockEntry) => void
  /** Callback when spam detected */
  onSpamDetected?: (reputation: CallerReputation) => void
  /** Callback on error */
  onError?: (error: string) => void
}

/**
 * Return type for useAmiBlacklist composable
 */
export interface UseAmiBlacklistReturn {
  // Reactive State
  /** List of blocked entries */
  blocklist: import('vue').Ref<BlockEntry[]>
  /** Blacklist statistics */
  stats: import('vue').Ref<BlacklistStats>
  /** Loading state */
  isLoading: import('vue').Ref<boolean>
  /** Error state */
  error: import('vue').Ref<string | null>

  // Computed
  /** Number of active blocks */
  activeCount: import('vue').ComputedRef<number>
  /** Check if a number is blocked */
  isBlocked: (number: string) => boolean
  /** Get block entry for a number */
  getBlockEntry: (number: string) => BlockEntry | undefined

  // Block Operations
  /** Block a phone number */
  blockNumber: (
    number: string,
    options?: {
      reason?: BlockReason
      action?: BlockAction
      description?: string
      expiresIn?: number // milliseconds
      blockedBy?: string
    }
  ) => Promise<BlockResult>
  /** Unblock a phone number */
  unblockNumber: (number: string) => Promise<UnblockResult>
  /** Update block entry */
  updateBlock: (number: string, updates: Partial<Omit<BlockEntry, 'number'>>) => Promise<BlockResult>
  /** Enable a disabled block */
  enableBlock: (number: string) => Promise<BlockResult>
  /** Disable a block without removing */
  disableBlock: (number: string) => Promise<BlockResult>

  // Bulk Operations
  /** Block multiple numbers */
  blockNumbers: (
    numbers: string[],
    options?: {
      reason?: BlockReason
      action?: BlockAction
      description?: string
    }
  ) => Promise<{ success: number; failed: number; errors: Array<{ number: string; error: string }> }>
  /** Unblock multiple numbers */
  unblockNumbers: (numbers: string[]) => Promise<{ success: number; failed: number }>
  /** Clear all blocks */
  clearAll: () => Promise<boolean>

  // Query Operations
  /** Refresh blacklist from AstDB */
  refresh: () => Promise<void>
  /** Query blacklist with filters */
  query: (options?: BlacklistQueryOptions) => BlockEntry[]
  /** Search blacklist */
  search: (pattern: string) => BlockEntry[]

  // Import/Export
  /** Export blacklist */
  exportList: (format?: BlacklistFormat) => string
  /** Import blacklist */
  importList: (data: string, format?: BlacklistFormat) => Promise<ImportResult>

  // Spam Detection
  /** Check caller reputation */
  checkReputation: (number: string) => Promise<CallerReputation>
  /** Report number as spam */
  reportSpam: (number: string, category?: BlockReason) => Promise<boolean>

  // Utility
  /** Clean expired entries */
  cleanExpired: () => Promise<number>
  /** Get statistics */
  getStats: () => BlacklistStats
}
