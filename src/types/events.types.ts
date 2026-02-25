/**
 * Event system type definitions
 * @packageDocumentation
 */

import type { CallEvent } from './call.types'
import type { RegistrationEvent, ConnectionEvent } from './sip.types'
import type { MediaStreamEvent, MediaTrackEvent, MediaDeviceChangeEvent } from './media.types'
import type { ConferenceStateInterface, Participant } from './conference.types'
import type {
  PresencePublishOptions,
  PresenceSubscriptionOptions,
  DialogStatus,
} from './presence.types'
import type { SipEventName } from './event-names'

/**
 * SIP Response helper interface
 */
export interface SipResponse {
  status_code?: number
  reason_phrase?: string
  headers?: Record<string, unknown>
  body?: string
  [key: string]: unknown
}

/**
 * SIP Request helper interface
 */
export interface SipRequest {
  method?: string
  ruri?: string
  headers?: Record<string, unknown>
  body?: string
  [key: string]: unknown
}

/**
 * SIP Session helper interface (for event types)
 */
export interface SipSession {
  id?: string
  direction?: 'incoming' | 'outgoing'
  status?: string
  connection?: RTCPeerConnection
  /** Remote party identity (JsSIP session) */
  remoteIdentity?: { uri?: { user?: string }; display_name?: string }
  [key: string]: unknown
}

/**
 * SIP Message helper interface
 */
export interface SipMessage {
  direction: 'incoming' | 'outgoing'
  body?: string
  contentType?: string
  [key: string]: unknown
}

/**
 * SIP Event Object helper interface
 */
export interface SipEventObject {
  event: string
  [key: string]: unknown
}

/**
 * Base event interface
 */
export interface BaseEvent<T = unknown> {
  /** Event type */
  type: string
  /** Event payload */
  payload?: T
  /** Timestamp when the event occurred */
  timestamp: Date
  /** Event metadata */
  metadata?: Record<string, unknown>
}

/**
 * Event payload generic type
 */
export type EventPayload<T extends BaseEvent> = T extends BaseEvent<infer P> ? P : never

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>

/**
 * Event handler with error boundary
 */
export type SafeEventHandler<T = unknown> = (event: T) => void

/**
 * Event listener options
 */
export interface EventListenerOptions {
  /** Execute only once */
  once?: boolean
  /** Priority (higher priority handlers execute first) */
  priority?: number
  /** Handler ID (for removal) */
  id?: string
}

/**
 * Event names constants
 */
export const EventNames = {
  // Connection events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTION_FAILED: 'connection_failed',
  RECONNECTING: 'reconnecting',

  // Registration events
  REGISTERED: 'registered',
  UNREGISTERED: 'unregistered',
  REGISTERING: 'registering',
  REGISTRATION_FAILED: 'registration_failed',

  // Call events
  CALL_INCOMING: 'call:incoming',
  CALL_OUTGOING: 'call:outgoing',
  CALL_PROGRESS: 'call:progress',
  CALL_RINGING: 'call:ringing',
  CALL_ACCEPTED: 'call:accepted',
  CALL_CONFIRMED: 'call:confirmed',
  CALL_FAILED: 'call:failed',
  CALL_ENDED: 'call:ended',
  CALL_HOLD: 'call:hold',
  CALL_UNHOLD: 'call:unhold',
  CALL_MUTED: 'call:muted',
  CALL_UNMUTED: 'call:unmuted',

  // Media events
  MEDIA_STREAM_ADDED: 'media:stream:added',
  MEDIA_STREAM_REMOVED: 'media:stream:removed',
  MEDIA_TRACK_ADDED: 'media:track:added',
  MEDIA_TRACK_REMOVED: 'media:track:removed',
  MEDIA_TRACK_MUTED: 'media:track:muted',
  MEDIA_TRACK_UNMUTED: 'media:track:unmuted',
  MEDIA_DEVICE_CHANGED: 'media:device:changed',

  // Transfer events
  TRANSFER_INITIATED: 'transfer:initiated',
  TRANSFER_ACCEPTED: 'transfer:accepted',
  TRANSFER_FAILED: 'transfer:failed',
  TRANSFER_COMPLETED: 'transfer:completed',

  // Presence events
  PRESENCE_UPDATED: 'presence:updated',
  PRESENCE_SUBSCRIBED: 'presence:subscribed',
  PRESENCE_UNSUBSCRIBED: 'presence:unsubscribed',

  // Messaging events
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_FAILED: 'message:failed',

  // Conference events
  CONFERENCE_CREATED: 'conference:created',
  CONFERENCE_JOINED: 'conference:joined',
  CONFERENCE_LEFT: 'conference:left',
  CONFERENCE_PARTICIPANT_JOINED: 'conference:participant:joined',
  CONFERENCE_PARTICIPANT_LEFT: 'conference:participant:left',
  CONFERENCE_ENDED: 'conference:ended',

  // DTMF events
  DTMF_SENT: 'dtmf:sent',
  DTMF_RECEIVED: 'dtmf:received',

  // Error events
  ERROR: 'error',
} as const

/**
 * Event name type
 */
export type EventName = (typeof EventNames)[keyof typeof EventNames]

/**
 * Wildcard event pattern
 */
export type WildcardPattern = `${string}:*` | '*'

/**
 * Event map for type-safe event handling
 */
export interface EventMap {
  // Connection events
  [EventNames.CONNECTED]: ConnectionEvent
  [EventNames.DISCONNECTED]: ConnectionEvent
  [EventNames.CONNECTING]: ConnectionEvent
  [EventNames.CONNECTION_FAILED]: ConnectionEvent
  [EventNames.RECONNECTING]: ConnectionEvent

  // Registration events
  [EventNames.REGISTERED]: RegistrationEvent
  [EventNames.UNREGISTERED]: RegistrationEvent
  [EventNames.REGISTERING]: RegistrationEvent
  [EventNames.REGISTRATION_FAILED]: RegistrationEvent

  // Call events
  [EventNames.CALL_INCOMING]: CallEvent
  [EventNames.CALL_OUTGOING]: CallEvent
  [EventNames.CALL_PROGRESS]: CallEvent
  [EventNames.CALL_RINGING]: CallEvent
  [EventNames.CALL_ACCEPTED]: CallEvent
  [EventNames.CALL_CONFIRMED]: CallEvent
  [EventNames.CALL_FAILED]: CallEvent
  [EventNames.CALL_ENDED]: CallEvent
  [EventNames.CALL_HOLD]: CallEvent
  [EventNames.CALL_UNHOLD]: CallEvent
  [EventNames.CALL_MUTED]: CallEvent
  [EventNames.CALL_UNMUTED]: CallEvent

  // Media events
  [EventNames.MEDIA_STREAM_ADDED]: MediaStreamEvent
  [EventNames.MEDIA_STREAM_REMOVED]: MediaStreamEvent
  [EventNames.MEDIA_TRACK_ADDED]: MediaTrackEvent
  [EventNames.MEDIA_TRACK_REMOVED]: MediaTrackEvent
  [EventNames.MEDIA_TRACK_MUTED]: MediaTrackEvent
  [EventNames.MEDIA_TRACK_UNMUTED]: MediaTrackEvent
  [EventNames.MEDIA_DEVICE_CHANGED]: MediaDeviceChangeEvent

  // Transfer events
  'call:transfer_initiated': CallTransferInitiatedEvent
  'call:transfer_accepted': CallTransferAcceptedEvent
  'call:transfer_failed': CallTransferFailedEvent
  'call:transfer_completed': CallTransferCompletedEvent

  // SIP events (with sip: prefix)
  'sip:connected': SipConnectedEvent
  'sip:disconnected': SipDisconnectedEvent
  'sip:registered': SipRegisteredEvent
  'sip:unregistered': SipUnregisteredEvent
  'sip:registration_failed': SipRegistrationFailedEvent
  'sip:registration_expiring': SipRegistrationExpiringEvent
  'sip:new_session': SipNewSessionEvent
  'sip:new_message': SipNewMessageEvent
  'sip:event': SipGenericEvent
  'sip:call:ended': SipCallEndedEvent
  'sip:call:failed': SipCallFailedEvent

  // Dialog/BLF events
  'sip:dialog:notify': DialogNotifyEvent
  'sip:dialog:subscribe': DialogSubscribeEvent
  'sip:dialog:unsubscribe': DialogUnsubscribeEvent
  'sip:dialog:refreshed': DialogRefreshedEvent

  // Conference events
  'sip:conference:created': ConferenceCreatedEvent
  'sip:conference:joined': ConferenceJoinedEvent
  'sip:conference:ended': ConferenceEndedEvent
  'sip:conference:participant:joined': ConferenceParticipantJoinedEvent
  'sip:conference:participant:left': ConferenceParticipantLeftEvent
  'sip:conference:participant:invited': ConferenceParticipantInvitedEvent
  'sip:conference:participant:removed': ConferenceParticipantRemovedEvent
  'sip:conference:participant:muted': ConferenceParticipantMutedEvent
  'sip:conference:participant:unmuted': ConferenceParticipantUnmutedEvent
  'sip:conference:recording:started': ConferenceRecordingStartedEvent
  'sip:conference:recording:stopped': ConferenceRecordingStoppedEvent

  // Audio events
  'sip:audio:muted': AudioMutedEvent
  'sip:audio:unmuted': AudioUnmutedEvent

  // Video events
  'sip:video:disabled': VideoDisabledEvent
  'sip:video:enabled': VideoEnabledEvent

  // Presence events
  'sip:presence:publish': PresencePublishEvent
  'sip:presence:subscribe': PresenceSubscribeEvent
  'sip:presence:unsubscribe': PresenceUnsubscribeEvent

  // Plugin events
  'plugin:installed': PluginInstalledEvent
  'plugin:error': PluginErrorEvent
  'plugin:unregistered': PluginUnregisteredEvent
  'plugin:configUpdated': PluginConfigUpdatedEvent

  // Generic event fallback
  [key: string]: BaseEvent
}

/**
 * Typed payload map for SIP events (subset of EventMap for sip:* and dialog events).
 * Use this type when you need to ensure event names and payloads are aligned.
 * New SIP events should add an entry to EventMap (and to SipEventNames in event-names.ts)
 * so EventBus stays typed.
 */
export type SipEventPayloadMap = Pick<EventMap, SipEventName>

/**
 * Error event
 */
export interface ErrorEvent extends BaseEvent {
  type: typeof EventNames.ERROR
  /** Error object */
  error: Error
  /** Error context */
  context?: string
  /** Error severity */
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * SIP Connected event
 */
export interface SipConnectedEvent extends BaseEvent {
  type: 'sip:connected'
  /** Transport URL */
  transport?: string
}

/**
 * SIP Disconnected event
 */
export interface SipDisconnectedEvent extends BaseEvent {
  type: 'sip:disconnected'
  /** Error if applicable */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Implementation passes unknown, needs flexibility
  error?: any
}

/**
 * SIP Registered event
 */
export interface SipRegisteredEvent extends BaseEvent {
  type: 'sip:registered'
  /** Registered URI */
  uri: string
  /** Expiry time in seconds */
  expires?: string | number
}

/**
 * SIP Unregistered event
 */
export interface SipUnregisteredEvent extends BaseEvent {
  type: 'sip:unregistered'
  /** Unregistration cause */
  cause?: string
}

/**
 * SIP Registration Failed event
 */
export interface SipRegistrationFailedEvent extends BaseEvent {
  type: 'sip:registration_failed'
  /** Failure cause */
  cause?: string
  /** Response object */
  response?: SipResponse
}

/**
 * SIP Registration Expiring event
 */
export interface SipRegistrationExpiringEvent extends BaseEvent {
  type: 'sip:registration_expiring'
}

/**
 * SIP New Session event
 */
export interface SipNewSessionEvent extends BaseEvent {
  type: 'sip:new_session'
  /** Session object */
  session: SipSession
  /** Session originator */
  originator: 'local' | 'remote'
  /** SIP request object */
  request?: SipRequest
  /** Call ID */
  callId: string
}

/**
 * SIP New Message event
 */
export interface SipNewMessageEvent extends BaseEvent {
  type: 'sip:new_message'
  /** Message object */
  message: SipMessage
  /** Message originator */
  originator: 'local' | 'remote'
  /** SIP request object */
  request?: SipRequest
  /** Sender URI */
  from: string
  /** Message content */
  content: string
  /** Content type */
  contentType?: string
}

/**
 * SIP Generic Event
 */
export interface SipGenericEvent extends BaseEvent {
  type: 'sip:event'
  /** Event object */
  event: SipEventObject
  /** Request object */
  request: SipRequest
}

/**
 * SIP Call Ended event (emitted when a call session ends)
 */
export interface SipCallEndedEvent extends BaseEvent {
  type: 'sip:call:ended'
  /** Call ID */
  callId: string
  /** Underlying session reference */
  session?: unknown
  /** Termination cause */
  cause?: string
  /** Originator of the BYE */
  originator?: string
}

/**
 * SIP Call Failed event (emitted when a call fails)
 */
export interface SipCallFailedEvent extends BaseEvent {
  type: 'sip:call:failed'
  /** Call ID */
  callId: string
  /** Underlying session reference */
  session?: unknown
  /** Failure cause */
  cause?: string
}

/**
 * Dialog NOTIFY payload (BLF dialog state notification)
 */
export interface DialogNotifyPayload {
  /** Extension/dialog URI */
  uri: string
  /** Current dialog status */
  status: DialogStatus
}

/**
 * Dialog SUBSCRIBE response payload
 */
export interface DialogSubscribePayload {
  /** Target URI */
  uri: string
  /** Subscription ID */
  subscriptionId: string
  /** Expiry in seconds */
  expires?: number
}

/**
 * Dialog UNSUBSCRIBE / REFRESH payload
 */
export interface DialogUnsubscribePayload {
  /** Target URI */
  uri: string
}

/**
 * Dialog NOTIFY event (BLF state notification)
 */
export interface DialogNotifyEvent extends BaseEvent {
  type: 'sip:dialog:notify'
  uri: string
  status: DialogStatus
}

/**
 * Dialog SUBSCRIBE response event
 */
export interface DialogSubscribeEvent extends BaseEvent {
  type: 'sip:dialog:subscribe'
  uri: string
  subscriptionId: string
  expires?: number
}

/**
 * Dialog UNSUBSCRIBE event
 */
export interface DialogUnsubscribeEvent extends BaseEvent {
  type: 'sip:dialog:unsubscribe'
  uri: string
}

/**
 * Dialog REFRESH event
 */
export interface DialogRefreshedEvent extends BaseEvent {
  type: 'sip:dialog:refreshed'
  uri: string
}

/**
 * Conference Created event
 */
export interface ConferenceCreatedEvent extends BaseEvent {
  type: 'sip:conference:created'
  /** Conference ID */
  conferenceId: string
  /** Conference state */
  conference: ConferenceStateInterface
}

/**
 * Conference Joined event
 */
export interface ConferenceJoinedEvent extends BaseEvent {
  type: 'sip:conference:joined'
  /** Conference ID */
  conferenceId: string
  /** Conference state */
  conference: ConferenceStateInterface
}

/**
 * Conference Ended event
 */
export interface ConferenceEndedEvent extends BaseEvent {
  type: 'sip:conference:ended'
  /** Conference ID */
  conferenceId: string
  /** Conference state */
  conference: ConferenceStateInterface
}

/**
 * Conference Participant Joined event
 */
export interface ConferenceParticipantJoinedEvent extends BaseEvent {
  type: 'sip:conference:participant:joined'
  /** Conference ID */
  conferenceId: string
  /** Participant */
  participant: Participant
}

/**
 * Conference Participant Left event
 */
export interface ConferenceParticipantLeftEvent extends BaseEvent {
  type: 'sip:conference:participant:left'
  /** Conference ID */
  conferenceId: string
  /** Participant */
  participant: Participant
}

/**
 * Conference Participant Invited event
 */
export interface ConferenceParticipantInvitedEvent extends BaseEvent {
  type: 'sip:conference:participant:invited'
  /** Conference ID */
  conferenceId: string
  /** Participant */
  participant: Participant
}

/**
 * Conference Participant Removed event
 */
export interface ConferenceParticipantRemovedEvent extends BaseEvent {
  type: 'sip:conference:participant:removed'
  /** Conference ID */
  conferenceId: string
  /** Participant */
  participant: Participant
}

/**
 * Conference Participant Muted event
 */
export interface ConferenceParticipantMutedEvent extends BaseEvent {
  type: 'sip:conference:participant:muted'
  /** Conference ID */
  conferenceId: string
  /** Participant */
  participant: Participant
}

/**
 * Conference Participant Unmuted event
 */
export interface ConferenceParticipantUnmutedEvent extends BaseEvent {
  type: 'sip:conference:participant:unmuted'
  /** Conference ID */
  conferenceId: string
  /** Participant */
  participant: Participant
}

/**
 * Conference Recording Started event
 */
export interface ConferenceRecordingStartedEvent extends BaseEvent {
  type: 'sip:conference:recording:started'
  /** Conference ID */
  conferenceId: string
}

/**
 * Conference Recording Stopped event
 */
export interface ConferenceRecordingStoppedEvent extends BaseEvent {
  type: 'sip:conference:recording:stopped'
  /** Conference ID */
  conferenceId: string
}

/**
 * Audio Muted event
 */
export interface AudioMutedEvent extends BaseEvent {
  type: 'sip:audio:muted'
}

/**
 * Audio Unmuted event
 */
export interface AudioUnmutedEvent extends BaseEvent {
  type: 'sip:audio:unmuted'
}

/**
 * Video Disabled event
 */
export interface VideoDisabledEvent extends BaseEvent {
  type: 'sip:video:disabled'
}

/**
 * Video Enabled event
 */
export interface VideoEnabledEvent extends BaseEvent {
  type: 'sip:video:enabled'
}

/**
 * Presence Publish event
 */
export interface PresencePublishEvent extends BaseEvent {
  type: 'sip:presence:publish'
  /** Presence options */
  presence: PresencePublishOptions
  /** PIDF XML body */
  body: string
  /** Extra SIP headers */
  extraHeaders?: string[]
}

/**
 * Presence Subscribe event
 */
export interface PresenceSubscribeEvent extends BaseEvent {
  type: 'sip:presence:subscribe'
  /** Target URI */
  uri: string
  /** Subscription options */
  options?: PresenceSubscriptionOptions
}

/**
 * Presence Unsubscribe event
 */
export interface PresenceUnsubscribeEvent extends BaseEvent {
  type: 'sip:presence:unsubscribe'
  /** Target URI */
  uri: string
}

/**
 * Plugin Installed event
 */
export interface PluginInstalledEvent extends BaseEvent {
  type: 'plugin:installed'
  /** Plugin name */
  pluginName: string
  /** Plugin metadata */
  metadata: {
    name: string
    version: string
    description?: string
    author?: string
    license?: string
    minVersion?: string
    maxVersion?: string
    dependencies?: string[]
  }
}

/**
 * Plugin Error event
 */
export interface PluginErrorEvent extends BaseEvent {
  type: 'plugin:error'
  /** Plugin name */
  pluginName: string
  /** Error that occurred */
  error: unknown
}

/**
 * Plugin Unregistered event
 */
export interface PluginUnregisteredEvent extends BaseEvent {
  type: 'plugin:unregistered'
  /** Plugin name */
  pluginName: string
}

/**
 * Plugin Config Updated event
 */
export interface PluginConfigUpdatedEvent extends BaseEvent {
  type: 'plugin:configUpdated'
  /** Plugin name */
  pluginName: string
  /** Updated configuration */
  config: Record<string, unknown>
}

/**
 * Call Transfer Initiated event
 */
export interface CallTransferInitiatedEvent extends BaseEvent {
  type: 'call:transfer_initiated'
  /** Transfer target URI */
  target: string
  /** Transfer method */
  transferType: 'blind' | 'attended'
  /** Replace call ID (for attended transfers) */
  replaceCallId?: string
}

/**
 * Call Transfer Accepted event
 */
export interface CallTransferAcceptedEvent extends BaseEvent {
  type: 'call:transfer_accepted'
  /** Transfer target URI */
  target: string
}

/**
 * Call Transfer Failed event
 */
export interface CallTransferFailedEvent extends BaseEvent {
  type: 'call:transfer_failed'
  /** Transfer target URI */
  target: string
  /** Error message */
  error?: string
}

/**
 * Call Transfer Completed event
 */
export interface CallTransferCompletedEvent extends BaseEvent {
  type: 'call:transfer_completed'
  /** Transfer target URI */
  target: string
}

/**
 * Event emitter interface
 */
export interface EventEmitter {
  /**
   * Add an event listener
   */
  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
    options?: EventListenerOptions
  ): void

  /**
   * Add a one-time event listener
   */
  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void

  /**
   * Remove an event listener
   */
  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void

  /**
   * Emit an event
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: keyof EventMap): void

  /**
   * Wait for an event to be emitted
   */
  waitFor<K extends keyof EventMap>(event: K, timeout?: number): Promise<EventMap[K]>
}
