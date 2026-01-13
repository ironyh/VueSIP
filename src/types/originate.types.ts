/**
 * AMI Originate Types
 *
 * Type definitions for click-to-call and outbound call origination via AMI.
 *
 * @module types/originate.types
 */

import type { Ref } from 'vue'
import type { BaseAmiOptions } from './common'

// ============================================================================
// Core Types
// ============================================================================

/**
 * Options for originating a call via AMI
 */
export interface AmiOriginateOptions {
  // Required
  /** Channel to call first (e.g., 'PJSIP/1001') */
  channel: string
  /** Extension to dial after answer */
  exten: string
  /** Dialplan context */
  context: string

  // Optional
  /** Dialplan priority (default: 1) */
  priority?: number
  /** Dial timeout in seconds */
  timeout?: number
  /** Full caller ID string (e.g., '"John Doe" <1001>') */
  callerId?: string
  /** Caller ID number */
  callerIdNum?: string
  /** Caller ID name */
  callerIdName?: string
  /** Account code for billing */
  account?: string
  /** Application to run instead of context/exten/priority */
  application?: string
  /** Application data/arguments */
  data?: string
  /** Channel variables to set */
  variables?: Record<string, string>
  /** Async originate - returns immediately (default: true) */
  async?: boolean
  /** Allowed codecs */
  codecs?: string[]
  /** Allow early media */
  earlyMedia?: boolean
}

/**
 * Result of an originate operation
 */
export interface AmiOriginateResult {
  /** Whether the originate was successful */
  success: boolean
  /** Action ID for tracking */
  actionId: string
  /** Channel created (if available) */
  channel?: string
  /** Unique call ID (if available) */
  uniqueId?: string
  /** Error message if failed */
  error?: string
  /** AMI response message */
  response?: string
}

/**
 * State of originate call progress
 */
export type OriginateState =
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'answered'
  | 'busy'
  | 'failed'
  | 'completed'
  | 'cancelled'

/**
 * Progress information during call origination
 */
export interface OriginateProgress {
  /** Current state of the origination */
  state: OriginateState
  /** Channel being used */
  channel?: string
  /** AMI response message */
  response?: string
  /** Unique call ID */
  uniqueId?: string
  /** Timestamp of state change */
  timestamp: Date
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * AMI OriginateResponse event
 */
export interface AmiOriginateResponseEvent {
  Event: 'OriginateResponse'
  /** Response status */
  Response: 'Success' | 'Failure'
  /** Channel name */
  Channel?: string
  /** Context */
  Context?: string
  /** Extension */
  Exten?: string
  /** Unique ID */
  Uniqueid?: string
  /** Reason for failure */
  Reason?: string
  /** Caller ID number */
  CallerIDNum?: string
  /** Caller ID name */
  CallerIDName?: string
  /** Action ID */
  ActionID?: string
}

/**
 * AMI DialBegin event
 */
export interface AmiDialBeginEvent {
  Event: 'DialBegin'
  /** Source channel */
  Channel?: string
  /** Destination channel */
  DestChannel?: string
  /** Caller ID number */
  CallerIDNum?: string
  /** Caller ID name */
  CallerIDName?: string
  /** Connected line number */
  ConnectedLineNum?: string
  /** Connected line name */
  ConnectedLineName?: string
  /** Unique ID */
  Uniqueid?: string
  /** Destination unique ID */
  DestUniqueid?: string
  /** Dial string */
  DialString?: string
}

/**
 * AMI DialEnd event
 */
export interface AmiDialEndEvent {
  Event: 'DialEnd'
  /** Source channel */
  Channel?: string
  /** Destination channel */
  DestChannel?: string
  /** Caller ID number */
  CallerIDNum?: string
  /** Caller ID name */
  CallerIDName?: string
  /** Unique ID */
  Uniqueid?: string
  /** Destination unique ID */
  DestUniqueid?: string
  /** Dial status (ANSWER, BUSY, NOANSWER, CANCEL, CONGESTION, CHANUNAVAIL) */
  DialStatus?: string
}

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for useAmiOriginate composable
 */
export interface UseAmiOriginateOptions extends BaseAmiOptions {
  /** Default dialplan context */
  defaultContext?: string
  /** Default dial timeout in seconds */
  defaultTimeout?: number
  /** Callback when originate starts */
  onOriginateStart?: (options: AmiOriginateOptions) => void
  /** Callback when originate completes */
  onOriginateComplete?: (result: AmiOriginateResult) => void
  /** Callback when progress changes */
  onProgressChange?: (progress: OriginateProgress) => void
  /** Custom caller ID formatter */
  formatCallerId?: (name?: string, num?: string) => string
}

// ============================================================================
// Return Types
// ============================================================================

/**
 * Return type for useAmiOriginate composable
 */
export interface UseAmiOriginateReturn {
  // State
  /** Whether currently originating a call */
  isOriginating: Ref<boolean>
  /** Result of the last originate operation */
  lastResult: Ref<AmiOriginateResult | null>
  /** Current progress of origination */
  progress: Ref<OriginateProgress | null>
  /** Error message if any */
  error: Ref<string | null>

  // Actions
  /** Originate a call with full options */
  originate: (options: AmiOriginateOptions) => Promise<AmiOriginateResult>
  /** Originate to an extension (simplified) */
  originateToExtension: (
    channel: string,
    exten: string,
    context?: string
  ) => Promise<AmiOriginateResult>
  /** Originate to an application */
  originateToApplication: (
    channel: string,
    app: string,
    data?: string
  ) => Promise<AmiOriginateResult>
  /** Click-to-call: Agent channel calls target number */
  clickToCall: (
    agentChannel: string,
    targetNumber: string,
    callerId?: string
  ) => Promise<AmiOriginateResult>

  // Utilities
  /** Cancel current origination attempt */
  cancel: () => void
  /** Format a channel string */
  formatChannel: (tech: string, endpoint: string) => string
  /** Build caller ID string from name and number */
  buildCallerId: (name?: string, num?: string) => string
  /** Reset state to idle */
  reset: () => void
}
