/**
 * MWI (Message Waiting Indicator) Types
 *
 * Type definitions for voicemail lamp/indicator control via AMI.
 *
 * @module types/mwi.types
 */

import type { BaseAmiOptions } from './common'

// ============================================================================
// Core Types
// ============================================================================

/**
 * MWI status for a mailbox
 */
export interface MWIStatus {
  /** Mailbox identifier (extension@context) */
  mailbox: string
  /** Number of new (unread) messages */
  newMessages: number
  /** Number of old (read) messages */
  oldMessages: number
  /** Number of urgent new messages */
  urgentNew: number
  /** Number of urgent old messages */
  urgentOld: number
  /** Whether the indicator lamp should be on */
  indicatorOn: boolean
  /** Last update timestamp */
  lastUpdate?: Date
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * AMI MessageWaiting event
 */
export interface AmiMWIEvent {
  Event: 'MessageWaiting'
  /** Mailbox identifier (extension@context) */
  Mailbox: string
  /** Whether there are waiting messages */
  Waiting: 'Yes' | 'No' | '1' | '0'
  /** Number of new messages */
  New?: string
  /** Number of old messages */
  Old?: string
}

/**
 * AMI MailboxCount response
 */
export interface AmiMailboxCountResponse {
  Response: 'Success' | 'Error'
  ActionID?: string
  Mailbox: string
  NewMessages?: string
  OldMessages?: string
  UrgentNew?: string
  UrgentOld?: string
}

// ============================================================================
// Options Types
// ============================================================================

export interface UseAmiMWIOptions extends BaseAmiOptions {
  /** Default voicemail context (default: 'default') */
  defaultContext?: string
  /** Callback when MWI status changes */
  onMWIChange?: (mailbox: string, status: MWIStatus) => void
}

// ============================================================================
// Return Types
// ============================================================================

export interface UseAmiMWIReturn {
  // State
  /** Mailbox statuses map by mailbox identifier */
  mailboxes: import('vue').Ref<Map<string, MWIStatus>>
  /** Loading state */
  isLoading: import('vue').Ref<boolean>
  /** Error message */
  error: import('vue').Ref<string | null>

  // Computed
  /** Mailboxes as array */
  mailboxList: import('vue').ComputedRef<MWIStatus[]>
  /** Mailboxes that have messages */
  mailboxesWithMessages: import('vue').ComputedRef<MWIStatus[]>
  /** Total count of new messages across all mailboxes */
  totalNewMessages: import('vue').ComputedRef<number>
  /** Total count of mailboxes with indicator on */
  indicatorOnCount: import('vue').ComputedRef<number>

  // Actions
  /** Get mailbox message counts */
  getMailboxStatus: (mailbox: string) => Promise<MWIStatus>
  /** Update MWI indicator for a mailbox */
  updateMWI: (mailbox: string, newMessages: number, oldMessages?: number) => Promise<boolean>
  /** Delete MWI state for a mailbox */
  deleteMWI: (mailbox: string) => Promise<boolean>
  /** Refresh all tracked mailbox statuses */
  refresh: () => Promise<void>

  // Utilities
  /** Get status for a specific mailbox from cache */
  getMailbox: (mailbox: string) => MWIStatus | undefined
  /** Check if a specific mailbox has waiting messages */
  hasMessages: (mailbox: string) => boolean
  /** Track a mailbox for MWI events */
  trackMailbox: (mailbox: string) => Promise<void>
  /** Stop tracking a mailbox */
  untrackMailbox: (mailbox: string) => void
}
