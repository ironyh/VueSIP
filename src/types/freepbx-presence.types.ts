/**
 * FreePBX-specific presence type definitions
 * Extends standard presence types with FreePBX-specific features
 * including expected return time from nurse/staff presence
 * @packageDocumentation
 */

import { PresenceState, type PresenceStatus } from './presence.types'

/**
 * FreePBX presence status codes
 * These map to FreePBX presence/BLF states
 */
export enum FreePBXPresenceCode {
  /** Available - Green */
  Available = 'available',
  /** On the phone - Red */
  OnPhone = 'on_phone',
  /** Busy - Do not disturb */
  Busy = 'busy',
  /** Away - Yellow */
  Away = 'away',
  /** Extended Away - Custom time */
  ExtendedAway = 'extended_away',
  /** Out to lunch */
  Lunch = 'lunch',
  /** In a meeting */
  InMeeting = 'in_meeting',
  /** Offline/Unavailable */
  Offline = 'offline',
  /** Custom status */
  Custom = 'custom',
}

/**
 * Extended away reasons for FreePBX
 */
export enum ExtendedAwayReason {
  /** Generic away */
  Away = 'away',
  /** On break */
  Break = 'break',
  /** At lunch */
  Lunch = 'lunch',
  /** In a meeting */
  Meeting = 'meeting',
  /** On rounds (healthcare) */
  Rounds = 'rounds',
  /** With patient (healthcare) */
  WithPatient = 'with_patient',
  /** In procedure (healthcare) */
  InProcedure = 'in_procedure',
  /** Out of office */
  OutOfOffice = 'out_of_office',
  /** Vacation */
  Vacation = 'vacation',
  /** Custom reason */
  Custom = 'custom',
}

/**
 * Return time specification
 */
export interface ReturnTimeSpec {
  /** Expected return timestamp (ISO 8601) */
  returnTime: Date
  /** Duration in minutes (from when set) */
  durationMinutes?: number
  /** Time remaining in milliseconds */
  remainingMs?: number
  /** Whether the return time is overdue */
  isOverdue?: boolean
  /** Formatted return time string */
  formattedTime?: string
  /** Formatted remaining time string */
  formattedRemaining?: string
}

/**
 * FreePBX presence status with return time
 */
export interface FreePBXPresenceStatus extends PresenceStatus {
  /** FreePBX-specific presence code */
  presenceCode: FreePBXPresenceCode
  /** Extended away reason if applicable */
  awayReason?: ExtendedAwayReason
  /** Expected return time (for away/extended away status) */
  returnTime?: ReturnTimeSpec
  /** Custom away message */
  awayMessage?: string
  /** FreePBX extension number */
  extension?: string
  /** Display name from FreePBX */
  displayName?: string
  /** Department/group if available */
  department?: string
  /** Location/room if available */
  location?: string
  /** FreePBX-specific hint state */
  hintState?: string
  /** Raw PIDF-LO document if available */
  pidfDocument?: string
}

/**
 * FreePBX presence update event
 */
export interface FreePBXPresenceEvent {
  /** Event type */
  type: 'presence_updated' | 'return_time_updated' | 'return_time_expired' | 'status_changed' | 'error'
  /** Extension being monitored */
  extension: string
  /** Full SIP URI */
  uri: string
  /** Previous status */
  previousStatus?: FreePBXPresenceStatus
  /** Current status */
  currentStatus: FreePBXPresenceStatus
  /** Timestamp */
  timestamp: Date
  /** Error message if applicable */
  error?: string
}

/**
 * FreePBX presence subscription options
 */
export interface FreePBXPresenceSubscriptionOptions {
  /** Extensions to subscribe to (or 'all') */
  extensions: string[] | 'all'
  /** FreePBX server URL (AMI or REST API) */
  serverUrl?: string
  /** Authentication token */
  authToken?: string
  /** Polling interval in ms (for REST API fallback) */
  pollingInterval?: number
  /** Enable return time tracking */
  trackReturnTime?: boolean
  /** Callback for presence updates */
  onPresenceUpdate?: (event: FreePBXPresenceEvent) => void
  /** Callback for return time updates */
  onReturnTimeUpdate?: (extension: string, returnTime: ReturnTimeSpec | null) => void
}

/**
 * FreePBX presence bridge configuration
 */
export interface FreePBXPresenceBridgeConfig {
  /** FreePBX server hostname or IP */
  host: string
  /** AMI port (default: 5038) */
  amiPort?: number
  /** REST API port (default: 443) */
  restPort?: number
  /** Use REST API instead of AMI */
  useRestApi?: boolean
  /** AMI username */
  amiUsername?: string
  /** AMI secret */
  amiSecret?: string
  /** REST API token */
  apiToken?: string
  /** Enable automatic reconnection */
  autoReconnect?: boolean
  /** Reconnect interval in ms */
  reconnectInterval?: number
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number
  /** Enable return time parsing */
  parseReturnTime?: boolean
  /** Custom return time parser */
  returnTimeParser?: (status: string) => ReturnTimeSpec | null
  /** Status message patterns for return time extraction */
  returnTimePatterns?: RegExp[]
}

/**
 * FreePBX hint device state
 */
export interface FreePBXHintState {
  /** Extension */
  extension: string
  /** Device state string */
  state: string
  /** State numeric value */
  stateValue: number
  /** Presence state derived from hint */
  presenceState: PresenceState
  /** Last updated */
  lastUpdated: Date
}

/**
 * FreePBX user presence profile
 */
export interface FreePBXUserProfile {
  /** User ID */
  userId: string
  /** Extension number */
  extension: string
  /** Display name */
  displayName: string
  /** Email if available */
  email?: string
  /** Department */
  department?: string
  /** Cell/mobile number */
  cellPhone?: string
  /** Avatar URL */
  avatarUrl?: string
  /** Current presence status */
  presence: FreePBXPresenceStatus
  /** Follow-me enabled */
  followMeEnabled?: boolean
  /** Call forwarding target */
  callForwardTarget?: string
  /** DND (Do Not Disturb) enabled */
  dndEnabled?: boolean
}

/**
 * Default return time patterns for parsing status messages
 */
export const DEFAULT_RETURN_TIME_PATTERNS: RegExp[] = [
  // "Back at 2:30 PM"
  /back\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
  // "Return at 14:30" or "Returning at 14:30"
  /return(?:ing)?\s+(?:at\s+)?(\d{1,2}:\d{2})/i,
  // "Back in 30 minutes"
  /back\s+in\s+(\d+)\s*(min(?:ute)?s?|hrs?|hours?)/i,
  // "Return in 1 hour"
  /return\s+in\s+(\d+)\s*(min(?:ute)?s?|hrs?|hours?)/i,
  // "Away for 1 hour"
  /away\s+for\s+(\d+)\s*(min(?:ute)?s?|hrs?|hours?)/i,
  // "ETA: 3:00 PM"
  /eta[:\s]+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
  // "~15m" or "~2h"
  /~(\d+)\s*(m|h)/i,
  // "2:30p" shorthand
  /(\d{1,2}:\d{2})\s*([ap])/i,
]

/**
 * Map FreePBX presence code to standard PresenceState
 */
export function mapFreePBXToPresenceState(code: FreePBXPresenceCode): PresenceState {
  switch (code) {
    case FreePBXPresenceCode.Available:
      return PresenceState.Available
    case FreePBXPresenceCode.OnPhone:
    case FreePBXPresenceCode.Busy:
    case FreePBXPresenceCode.InMeeting:
      return PresenceState.Busy
    case FreePBXPresenceCode.Away:
    case FreePBXPresenceCode.ExtendedAway:
    case FreePBXPresenceCode.Lunch:
      return PresenceState.Away
    case FreePBXPresenceCode.Offline:
      return PresenceState.Offline
    case FreePBXPresenceCode.Custom:
      return PresenceState.Custom
    default:
      return PresenceState.Offline
  }
}

/**
 * Map standard PresenceState to FreePBX presence code
 */
export function mapPresenceStateToFreePBX(state: PresenceState): FreePBXPresenceCode {
  switch (state) {
    case PresenceState.Available:
      return FreePBXPresenceCode.Available
    case PresenceState.Busy:
      return FreePBXPresenceCode.Busy
    case PresenceState.Away:
      return FreePBXPresenceCode.Away
    case PresenceState.Offline:
      return FreePBXPresenceCode.Offline
    case PresenceState.Custom:
      return FreePBXPresenceCode.Custom
    default:
      return FreePBXPresenceCode.Offline
  }
}

/**
 * Format remaining time in human-readable format
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return 'overdue'

  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`
  }

  if (minutes > 0) {
    return `${minutes}m`
  }

  const seconds = Math.floor(ms / 1000)
  return `${seconds}s`
}

/**
 * Format time for display
 */
export function formatReturnTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
