/**
 * Voicemail Types for AMI Integration
 * @packageDocumentation
 */

import type { AmiEventData } from './ami.types'

/**
 * Voicemail message status
 */
export type VoicemailMessageStatus = 'new' | 'old' | 'urgent' | 'deleted'

/**
 * Voicemail message information
 */
export interface VoicemailMessage {
  /** Message ID/filename */
  id: string
  /** Mailbox number */
  mailbox: string
  /** Mailbox context */
  context: string
  /** Caller ID number */
  callerIdNum: string
  /** Caller ID name */
  callerIdName: string
  /** Message duration in seconds */
  duration: number
  /** Message timestamp */
  timestamp: Date
  /** Message status */
  status: VoicemailMessageStatus
  /** Message folder (INBOX, Old, etc.) */
  folder: string
  /** Message priority (0-2, 2=urgent) */
  priority: number
  /** Optional transcription */
  transcription?: string
  /** Server ID for multi-server setups */
  serverId?: number
}

/**
 * Mailbox information
 */
export interface MailboxInfo {
  /** Mailbox number */
  mailbox: string
  /** Voicemail context */
  context: string
  /** Number of new messages */
  newMessages: number
  /** Number of old messages */
  oldMessages: number
  /** Number of urgent messages */
  urgentMessages: number
  /** Mailbox full name */
  fullName?: string
  /** Email address for notifications */
  email?: string
  /** Pager address */
  pager?: string
  /** Last message timestamp */
  lastMessageTime?: Date
  /** Server ID */
  serverId?: number
}

/**
 * MWI (Message Waiting Indicator) state
 */
export interface MwiState {
  /** Mailbox with context (e.g., "1000@default") */
  mailbox: string
  /** Whether there are waiting messages */
  waiting: boolean
  /** Number of new messages */
  newMessages: number
  /** Number of old messages */
  oldMessages: number
  /** Number of urgent messages */
  urgentMessages?: number
  /** Last updated timestamp */
  lastUpdated: Date
  /** Server ID */
  serverId?: number
}

/**
 * AMI MessageWaiting event
 */
export interface AmiMessageWaitingEvent extends AmiEventData {
  Event: 'MessageWaiting'
  /** Mailbox with context */
  Mailbox: string
  /** Waiting indicator (yes/no) */
  Waiting: string
  /** New messages count */
  New: string
  /** Old messages count */
  Old: string
}

/**
 * AMI VoicemailUserEntry event (from VoicemailUsersList)
 */
export interface AmiVoicemailUserEntryEvent extends AmiEventData {
  Event: 'VoicemailUserEntry'
  /** Voicemail context */
  VMContext: string
  /** Voicemail mailbox number */
  VoiceMailbox: string
  /** Full name */
  FullName?: string
  /** Email address */
  Email?: string
  /** Pager address */
  Pager?: string
  /** Server email */
  ServerEmail?: string
  /** Mailbox options */
  MailboxOptions?: string
  /** Language */
  Language?: string
  /** Locale */
  Locale?: string
  /** Timezone */
  TimeZone?: string
  /** Callback */
  Callback?: string
  /** Dial-out context */
  Dialout?: string
  /** Exit context */
  ExitContext?: string
  /** Max message count */
  MaxMessageCount?: string
  /** Max message length */
  MaxMessageLength?: string
  /** New message count */
  NewMessageCount: string
  /** Old message count */
  OldMessageCount?: string
  /** Urgent message count */
  UrgentMessageCount?: string
}

/**
 * AMI VoicemailUserEntryComplete event
 */
export interface AmiVoicemailUserEntryCompleteEvent extends AmiEventData {
  Event: 'VoicemailUserEntryComplete'
  /** Action ID */
  ActionID?: string
  /** Event list status */
  EventList: string
  /** List items count */
  ListItems: string
}

/**
 * Options for useAmiVoicemail composable
 */
export interface UseAmiVoicemailOptions {
  /** Polling interval for MWI in ms (0 = events only) */
  pollInterval?: number
  /** Use real-time MWI events */
  useEvents?: boolean
  /** Auto-refresh mailbox on reconnect */
  autoRefresh?: boolean
  /** Default voicemail context */
  defaultContext?: string
  /** Mailbox filter function */
  mailboxFilter?: (mailbox: MailboxInfo) => boolean
  /** MWI change callback */
  onMwiChange?: (mwi: MwiState) => void
  /** New message callback */
  onNewMessage?: (mailbox: string, count: number) => void
  /** Transform mailbox function */
  transformMailbox?: (mailbox: MailboxInfo) => MailboxInfo
}
