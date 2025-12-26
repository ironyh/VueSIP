/**
 * Presence type definitions
 * @packageDocumentation
 */

/**
 * Dialog state enumeration for BLF (Busy Lamp Field)
 */
export enum DialogState {
  /** Extension is idle/available */
  Idle = 'idle',
  /** Extension is ringing */
  Ringing = 'ringing',
  /** Extension is trying to connect */
  Trying = 'trying',
  /** Extension is in a call */
  InCall = 'in-call',
  /** Extension is on hold */
  OnHold = 'on-hold',
  /** Extension is confirmed in a dialog */
  Confirmed = 'confirmed',
  /** Extension is unavailable */
  Unavailable = 'unavailable',
  /** Unknown state */
  Unknown = 'unknown',
}

/**
 * Display options for a dialog state
 */
export interface StateDisplayOptions {
  /** CSS color class or value */
  color: string
  /** Icon name or class */
  icon: string
  /** Human-readable label */
  label: string
  /** Whether the state indicates active call */
  isActive: boolean
}

/**
 * Default display options for each dialog state
 */
export const DEFAULT_DIALOG_DISPLAY: Record<DialogState, StateDisplayOptions> = {
  [DialogState.Idle]: {
    color: 'green',
    icon: 'phone-idle',
    label: 'Available',
    isActive: false,
  },
  [DialogState.Ringing]: {
    color: 'orange',
    icon: 'phone-ringing',
    label: 'Ringing',
    isActive: true,
  },
  [DialogState.Trying]: {
    color: 'yellow',
    icon: 'phone-outgoing',
    label: 'Calling',
    isActive: true,
  },
  [DialogState.InCall]: {
    color: 'red',
    icon: 'phone-in-talk',
    label: 'In Call',
    isActive: true,
  },
  [DialogState.OnHold]: {
    color: 'blue',
    icon: 'phone-paused',
    label: 'On Hold',
    isActive: true,
  },
  [DialogState.Confirmed]: {
    color: 'red',
    icon: 'phone-in-talk',
    label: 'Connected',
    isActive: true,
  },
  [DialogState.Unavailable]: {
    color: 'gray',
    icon: 'phone-disabled',
    label: 'Unavailable',
    isActive: false,
  },
  [DialogState.Unknown]: {
    color: 'gray',
    icon: 'phone-unknown',
    label: 'Unknown',
    isActive: false,
  },
}

/**
 * Dialog status for a specific extension
 */
export interface DialogStatus {
  /** Extension URI */
  uri?: string
  /** Current dialog state */
  state: DialogState
  /** Call direction (initiator or recipient) */
  direction?: 'initiator' | 'recipient'
  /** Remote party tag */
  remoteTag?: string
  /** Remote party identity (SIP URI) */
  remoteIdentity?: string
  /** Remote party display name */
  remoteDisplayName?: string
  /** Call ID if in a call */
  callId?: string
  /** Dialog ID from dialog-info */
  dialogId?: string
  /** Raw state string from XML */
  rawState?: string
  /** Last updated timestamp */
  lastUpdated?: Date
}

/**
 * Dialog subscription info
 */
export interface DialogSubscription {
  /** Subscription ID */
  id: string
  /** Target extension URI */
  targetUri: string
  /** Subscription state */
  state: 'pending' | 'active' | 'terminated'
  /** Expiry time in seconds */
  expires?: number
  /** Expiry timestamp */
  expiresAt?: Date
  /** Last event received */
  lastEvent?: DialogEvent
  /** Last received status */
  lastStatus?: DialogStatus
}

/**
 * Dialog event from subscription
 */
export interface DialogEvent {
  /** Event type */
  type: 'state-changed' | 'subscribed' | 'unsubscribed' | 'updated' | 'refreshed' | 'error'
  /** Extension URI */
  uri: string
  /** Dialog status */
  status?: DialogStatus
  /** Subscription info */
  subscription?: DialogSubscription
  /** Timestamp */
  timestamp: Date
  /** Error message if applicable */
  error?: string
}

/**
 * Options for dialog subscription
 */
export interface DialogSubscriptionOptions {
  /** Subscription expiry in seconds */
  expires?: number
  /** Extra SIP headers */
  extraHeaders?: string[]
  /** Callback for state changes */
  onStateChange?: (status: DialogStatus) => void
}

/**
 * Presence display configuration
 */
export interface PresenceDisplayConfig {
  /** Display mode: 'emoji' | 'icon' | 'text' */
  mode?: 'emoji' | 'icon' | 'text'
  /** Enable animations */
  animations?: boolean
  /** Show icon */
  showIcon?: boolean
  /** Show label */
  showLabel?: boolean
  /** Custom state display overrides (legacy) */
  stateOverrides?: Partial<Record<DialogState, Partial<StateDisplayOptions>>>
  /** Custom state display mapping */
  stateDisplay?: Partial<Record<DialogState, Partial<StateDisplayOptions>>>
}

/**
 * Presence state enumeration
 */
export enum PresenceState {
  /** User is online and available */
  Available = 'available',
  /** User is away */
  Away = 'away',
  /** User is busy / do not disturb */
  Busy = 'busy',
  /** User is offline */
  Offline = 'offline',
  /** Custom status */
  Custom = 'custom',
}

/**
 * Presence status
 */
export interface PresenceStatus {
  /** User URI */
  uri: string
  /** Presence state */
  state: PresenceState
  /** Custom status message */
  statusMessage?: string
  /** Last updated timestamp */
  lastUpdated: Date
  /** Additional metadata */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- User-defined metadata can contain any structure
  metadata?: Record<string, any>
}

/**
 * Presence subscription
 */
export interface PresenceSubscription {
  /** Subscription ID */
  id: string
  /** Target URI being watched */
  targetUri: string
  /** Subscription state */
  state: 'pending' | 'active' | 'terminated'
  /** Expiry time */
  expires?: number
  /** Last presence status received */
  lastStatus?: PresenceStatus
}

/**
 * Presence event
 */
export interface PresenceEvent {
  /** Event type */
  type: 'updated' | 'subscribed' | 'unsubscribed' | 'error'
  /** User URI */
  uri: string
  /** Presence status */
  status?: PresenceStatus
  /** Subscription information */
  subscription?: PresenceSubscription
  /** Timestamp */
  timestamp: Date
  /** Error message (if applicable) */
  error?: string
}

/**
 * Presence options for publishing status
 */
export interface PresencePublishOptions {
  /** Presence state - accepts enum values or raw PIDF basic status ('open' | 'closed') */
  state: PresenceState | 'open' | 'closed'
  /** Status message */
  statusMessage?: string
  /** Expiry time in seconds */
  expires?: number
  /** Custom headers */
  extraHeaders?: string[]
}

/**
 * Presence subscription options
 */
export interface PresenceSubscriptionOptions {
  /** Expiry time in seconds */
  expires?: number
  /** Custom headers */
  extraHeaders?: string[]
  /** Callback for presence notifications */
  onNotify?: (status: PresenceStatus) => void
}
