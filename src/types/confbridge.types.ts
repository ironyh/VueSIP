/**
 * ConfBridge Types
 *
 * Type definitions for Asterisk ConfBridge conferencing via AMI.
 *
 * @module types/confbridge.types
 */

import type { BaseAmiOptions } from './common'

// ============================================================================
// Core Types
// ============================================================================

/**
 * ConfBridge room/conference
 */
export interface ConfBridgeRoom {
  /** Conference name/number */
  conference: string
  /** Number of participants */
  parties: number
  /** Whether room is locked */
  locked: boolean
  /** Whether room is muted */
  muted: boolean
  /** Recording status */
  recording: boolean
  /** Marked user count (admins) */
  markedUsers: number
}

/**
 * ConfBridge participant
 */
export interface ConfBridgeUser {
  /** Conference name */
  conference: string
  /** Unique caller ID */
  callerIdNum: string
  /** Caller display name */
  callerIdName: string
  /** Channel name */
  channel: string
  /** Whether user is admin */
  admin: boolean
  /** Whether user is marked */
  marked: boolean
  /** Whether user is muted */
  muted: boolean
  /** Whether user is talking */
  talking: boolean
  /** Join timestamp */
  joinedAt: Date
}

/**
 * Conference action result
 */
export interface ConfBridgeActionResult {
  success: boolean
  conference: string
  error?: string
}

// ============================================================================
// Event Types
// ============================================================================

export interface AmiConfBridgeJoinEvent {
  Event: 'ConfbridgeJoin'
  Conference: string
  CallerIDNum: string
  CallerIDName: string
  Channel: string
  Admin: 'Yes' | 'No'
  Marked: 'Yes' | 'No'
  Muted: 'Yes' | 'No'
}

export interface AmiConfBridgeLeaveEvent {
  Event: 'ConfbridgeLeave'
  Conference: string
  CallerIDNum: string
  CallerIDName: string
  Channel: string
}

export interface AmiConfBridgeTalkingEvent {
  Event: 'ConfbridgeTalking'
  Conference: string
  Channel: string
  TalkingStatus: 'on' | 'off'
}

export interface AmiConfBridgeMuteEvent {
  Event: 'ConfbridgeMute' | 'ConfbridgeUnmute'
  Conference: string
  Channel: string
}

export interface AmiConfBridgeLockEvent {
  Event: 'ConfbridgeLock' | 'ConfbridgeUnlock'
  Conference: string
}

export interface AmiConfBridgeRecordEvent {
  Event: 'ConfbridgeRecord'
  Conference: string
  RecordFile: string
}

export interface AmiConfBridgeListEvent {
  Event: 'ConfbridgeList'
  Conference: string
  CallerIDNum: string
  CallerIDName: string
  Channel: string
  Admin: 'Yes' | 'No'
  Marked: 'Yes' | 'No'
  Muted: 'Yes' | 'No'
}

export interface AmiConfBridgeListRoomsEvent {
  Event: 'ConfbridgeListRooms'
  Conference: string
  Parties: string
  Locked: 'Yes' | 'No'
  Muted: 'Yes' | 'No'
  Marked: string
}

// ============================================================================
// Options Types
// ============================================================================

export interface UseAmiConfBridgeOptions extends BaseAmiOptions {
  /** Filter conferences by name pattern */
  conferenceFilter?: (room: ConfBridgeRoom) => boolean
  /** Transform user data after parsing */
  transformUser?: (user: ConfBridgeUser) => ConfBridgeUser
  /** Callback when user joins */
  onUserJoin?: (user: ConfBridgeUser) => void
  /** Callback when user leaves */
  onUserLeave?: (user: ConfBridgeUser) => void
  /** Callback when talking status changes */
  onTalkingChange?: (user: ConfBridgeUser, talking: boolean) => void
}
