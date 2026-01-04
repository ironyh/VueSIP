/**
 * SIP Adapter Types
 *
 * This module defines the adapter interfaces that allow VueSip to work
 * with different SIP libraries (JsSIP, SIP.js, etc.) through a unified API.
 *
 * The adapter pattern provides:
 * - Library-agnostic SIP operations
 * - Runtime library selection
 * - Consistent event model
 * - Type safety across adapters
 *
 * @packageDocumentation
 * @module adapters
 */

import type { EventEmitter } from '../utils/EventEmitter'

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when an adapter operation is not supported by the underlying library.
 *
 * Some SIP libraries don't implement all features (e.g., JsSIP doesn't have
 * native SUBSCRIBE/PUBLISH support for presence). This error provides clear
 * feedback about what's not supported and potential workarounds.
 *
 * @example
 * ```typescript
 * try {
 *   await adapter.subscribe('sip:user@domain.com', 'presence')
 * } catch (error) {
 *   if (error instanceof AdapterNotSupportedError) {
 *     console.log(`${error.operation} not supported by ${error.adapterName}`)
 *     console.log(`Suggestion: ${error.suggestion}`)
 *   }
 * }
 * ```
 */
export class AdapterNotSupportedError extends Error {
  /** The operation that was attempted */
  readonly operation: string

  /** The adapter that doesn't support this operation */
  readonly adapterName: string

  /** Suggestion for alternative approach or workaround */
  readonly suggestion?: string

  constructor(operation: string, adapterName: string, suggestion?: string) {
    const message = suggestion
      ? `${operation} is not supported by ${adapterName}. ${suggestion}`
      : `${operation} is not supported by ${adapterName}`
    super(message)
    this.name = 'AdapterNotSupportedError'
    this.operation = operation
    this.adapterName = adapterName
    this.suggestion = suggestion
  }
}
import type {
  SipClientConfig,
  ConnectionState,
  RegistrationState,
  CallDirection,
  CallState,
} from '../types'

/**
 * Configuration for SIP adapter selection
 */
export interface AdapterConfig {
  /**
   * SIP library to use
   * - 'jssip': JsSIP library (default)
   * - 'sipjs': SIP.js library
   * - 'custom': Custom adapter implementation
   */
  library: 'jssip' | 'sipjs' | 'custom'

  /**
   * Custom adapter instance (when library is 'custom')
   */
  customAdapter?: ISipAdapter

  /**
   * Library-specific configuration options
   */
  libraryOptions?: Record<string, any>
}

/**
 * SIP Adapter Interface
 *
 * This interface defines the contract that all SIP library adapters must implement.
 * It provides a unified API for SIP operations regardless of the underlying library.
 *
 * The adapter pattern allows VueSIP to work with multiple SIP libraries:
 * - **JsSIP**: Full-featured adapter with call management
 * - **SIP.js**: Alternative library with different API semantics
 * - **Custom**: User-provided adapters for other libraries
 *
 * @example Creating an adapter via factory
 * ```typescript
 * import { AdapterFactory } from '@/adapters/AdapterFactory'
 *
 * const adapter = await AdapterFactory.createAdapter(sipConfig, {
 *   library: 'jssip'
 * })
 *
 * await adapter.connect()
 * await adapter.register()
 * ```
 *
 * @example Listening to adapter events
 * ```typescript
 * adapter.on('connection:connected', () => {
 *   console.log('Connected to SIP server')
 * })
 *
 * adapter.on('call:incoming', ({ session }) => {
 *   console.log('Incoming call from:', session.remoteUri)
 * })
 * ```
 *
 * @see {@link AdapterFactory} for creating adapter instances
 * @see {@link AdapterEvents} for available events
 * @see {@link ICallSession} for call session interface
 */
export interface ISipAdapter extends EventEmitter {
  // ========== Adapter Metadata ==========

  /**
   * Human-readable adapter name
   * @example 'JsSIP Adapter'
   */
  readonly adapterName: string

  /**
   * Adapter implementation version (semver)
   * @example '1.0.0'
   */
  readonly adapterVersion: string

  /**
   * Name of the underlying SIP library
   * @example 'JsSIP'
   */
  readonly libraryName: string

  /**
   * Version of the underlying SIP library
   * @example '3.10.0'
   */
  readonly libraryVersion: string

  // ========== Connection State ==========

  /**
   * Whether the adapter is currently connected to the SIP server
   * @readonly
   */
  readonly isConnected: boolean

  /**
   * Current connection state
   * @see {@link ConnectionState}
   */
  readonly connectionState: ConnectionState

  // ========== Registration State ==========

  /**
   * Whether the adapter is currently registered with the SIP server
   * @readonly
   */
  readonly isRegistered: boolean

  /**
   * Current registration state
   * @see {@link RegistrationState}
   */
  readonly registrationState: RegistrationState

  // ========== Lifecycle Methods ==========

  /**
   * Initialize the adapter with SIP configuration.
   *
   * This must be called before any other operations. It configures the
   * underlying SIP library but does not establish a connection.
   *
   * @param config - SIP client configuration
   * @throws Error if configuration is invalid
   *
   * @example
   * ```typescript
   * await adapter.initialize({
   *   uri: 'wss://sip.example.com:7443',
   *   sipUri: 'sip:user@example.com',
   *   password: 'secret'
   * })
   * ```
   */
  initialize(config: SipClientConfig): Promise<void>

  /**
   * Connect to the SIP server via WebSocket.
   *
   * Establishes the WebSocket connection to the configured SIP server.
   * Emits 'connection:connecting', then 'connection:connected' or 'connection:failed'.
   *
   * @throws Error if adapter not initialized
   * @throws Error if connection fails
   * @emits connection:connecting
   * @emits connection:connected
   * @emits connection:failed
   *
   * @example
   * ```typescript
   * try {
   *   await adapter.connect()
   *   console.log('Connected!')
   * } catch (error) {
   *   console.error('Connection failed:', error)
   * }
   * ```
   */
  connect(): Promise<void>

  /**
   * Disconnect from the SIP server.
   *
   * Gracefully closes the WebSocket connection. Any active calls should
   * be terminated before disconnecting.
   *
   * @emits connection:disconnected
   */
  disconnect(): Promise<void>

  /**
   * Register with the SIP server.
   *
   * Sends a SIP REGISTER request to the server. Must be connected first.
   * Registration is required for receiving incoming calls.
   *
   * @throws Error if not connected
   * @throws Error if registration fails
   * @emits registration:registering
   * @emits registration:registered
   * @emits registration:failed
   */
  register(): Promise<void>

  /**
   * Unregister from the SIP server.
   *
   * Sends a SIP REGISTER request with expires=0 to unregister.
   * After unregistering, you will no longer receive incoming calls.
   *
   * @emits registration:unregistered
   */
  unregister(): Promise<void>

  // ========== Call Methods ==========

  /**
   * Make an outgoing call.
   *
   * Initiates a SIP INVITE to the specified target. The returned
   * call session can be used to manage the call lifecycle.
   *
   * @param target - SIP URI or phone number to call
   * @param options - Optional call configuration
   * @returns Call session instance for managing the call
   * @throws Error if not connected/registered
   *
   * @example Audio-only call
   * ```typescript
   * const session = await adapter.call('sip:bob@example.com', {
   *   mediaConstraints: { audio: true, video: false }
   * })
   * ```
   *
   * @example Video call
   * ```typescript
   * const session = await adapter.call('sip:bob@example.com', {
   *   mediaConstraints: { audio: true, video: true }
   * })
   * ```
   */
  call(target: string, options?: CallOptions): Promise<ICallSession>

  /**
   * Send a SIP MESSAGE (instant message).
   *
   * Sends an out-of-dialog SIP MESSAGE request. This is used for
   * simple instant messaging between SIP endpoints.
   *
   * @param target - Destination SIP URI
   * @param content - Message content
   * @param contentType - MIME type (default: 'text/plain')
   * @throws Error if not connected
   *
   * @example
   * ```typescript
   * await adapter.sendMessage(
   *   'sip:bob@example.com',
   *   'Hello, Bob!',
   *   'text/plain'
   * )
   * ```
   */
  sendMessage(target: string, content: string, contentType?: string): Promise<void>

  /**
   * Send DTMF tones on an active call.
   *
   * Sends one or more DTMF digits using the configured transport method.
   *
   * @param callId - Call session ID
   * @param tone - DTMF digit(s) to send (0-9, *, #, A-D)
   * @throws Error if call session not found
   *
   * @example
   * ```typescript
   * // Send single digit
   * await adapter.sendDTMF(session.id, '5')
   *
   * // Send PIN code
   * await adapter.sendDTMF(session.id, '1234#')
   * ```
   */
  sendDTMF(callId: string, tone: string): Promise<void>

  // ========== Presence Methods ==========

  /**
   * Subscribe to SIP event notifications (presence, dialog-info, etc.).
   *
   * Sends a SIP SUBSCRIBE request as defined in RFC 3265.
   * Used primarily for presence (RFC 3856) and dialog state monitoring.
   *
   * **Note**: Not all adapters support this feature. JsSIP doesn't have
   * native SUBSCRIBE support. Check adapter documentation for availability.
   *
   * @param target - SIP URI to subscribe to
   * @param event - Event package name (e.g., 'presence', 'dialog')
   * @param expires - Subscription duration in seconds (default: 3600)
   * @throws {@link AdapterNotSupportedError} if not supported by adapter
   *
   * @example
   * ```typescript
   * try {
   *   await adapter.subscribe('sip:bob@example.com', 'presence', 3600)
   * } catch (error) {
   *   if (error instanceof AdapterNotSupportedError) {
   *     console.log('Presence not supported by this adapter')
   *   }
   * }
   * ```
   *
   * @see RFC 3265 - SIP-Specific Event Notification
   * @see RFC 3856 - SIP Presence
   */
  subscribe(target: string, event: string, expires?: number): Promise<void>

  /**
   * Unsubscribe from SIP event notifications.
   *
   * Terminates an existing subscription by sending SUBSCRIBE with expires=0.
   *
   * **Note**: Not all adapters support this feature.
   *
   * @param target - SIP URI to unsubscribe from
   * @param event - Event package name
   * @throws {@link AdapterNotSupportedError} if not supported by adapter
   */
  unsubscribe(target: string, event: string): Promise<void>

  /**
   * Publish presence or event state.
   *
   * Sends a SIP PUBLISH request as defined in RFC 3903.
   * Used to publish your presence state to other subscribers.
   *
   * **Note**: Not all adapters support this feature. JsSIP doesn't have
   * native PUBLISH support. Check adapter documentation for availability.
   *
   * @param event - Event type (e.g., 'presence')
   * @param state - State data to publish (format depends on event type)
   * @throws {@link AdapterNotSupportedError} if not supported by adapter
   *
   * @example
   * ```typescript
   * try {
   *   await adapter.publish('presence', {
   *     status: 'online',
   *     note: 'Available for calls'
   *   })
   * } catch (error) {
   *   if (error instanceof AdapterNotSupportedError) {
   *     console.log('Presence publishing not supported')
   *   }
   * }
   * ```
   *
   * @see RFC 3903 - SIP Extension for Event State Publication
   */
  publish(event: string, state: unknown): Promise<void>

  // ========== Session Management ==========

  /**
   * Get all active call sessions.
   *
   * Returns an array of all currently active call sessions managed
   * by this adapter, including incoming and outgoing calls.
   *
   * @returns Array of active call sessions
   */
  getActiveCalls(): ICallSession[]

  /**
   * Get a specific call session by ID.
   *
   * @param callId - Call session ID
   * @returns Call session if found, null otherwise
   */
  getCallSession(callId: string): ICallSession | null

  /**
   * Cleanup and destroy the adapter.
   *
   * Performs graceful cleanup:
   * 1. Terminates all active calls
   * 2. Unregisters from the server
   * 3. Disconnects WebSocket
   * 4. Releases all resources
   *
   * After calling destroy(), the adapter instance should not be reused.
   */
  destroy(): Promise<void>
}

/**
 * Call Session Interface
 *
 * Represents an individual SIP call session with standardized operations
 * across different SIP libraries.
 */
export interface ICallSession extends EventEmitter {
  /**
   * Unique session identifier
   */
  readonly id: string

  /**
   * Call direction
   */
  readonly direction: CallDirection

  /**
   * Call state
   */
  readonly state: CallState

  /**
   * Remote party URI
   */
  readonly remoteUri: string

  /**
   * Remote party display name
   */
  readonly remoteDisplayName: string | null

  /**
   * Call start time (when call was established)
   */
  readonly startTime: Date | null

  /**
   * Call end time
   */
  readonly endTime: Date | null

  /**
   * Call duration in seconds
   */
  readonly duration: number

  /**
   * Local media stream
   */
  readonly localStream: MediaStream | null

  /**
   * Remote media stream
   */
  readonly remoteStream: MediaStream | null

  /**
   * Whether call is on hold
   */
  readonly isOnHold: boolean

  /**
   * Whether call is muted
   */
  readonly isMuted: boolean

  /**
   * Answer incoming call
   *
   * @param options - Answer options (audio, video, etc.)
   */
  answer(options?: AnswerOptions): Promise<void>

  /**
   * Reject/decline incoming call
   *
   * @param statusCode - SIP status code (default: 486 Busy Here)
   */
  reject(statusCode?: number): Promise<void>

  /**
   * Terminate/hang up the call
   */
  terminate(): Promise<void>

  /**
   * Put call on hold
   */
  hold(): Promise<void>

  /**
   * Resume call from hold
   */
  unhold(): Promise<void>

  /**
   * Mute local audio
   */
  mute(): Promise<void>

  /**
   * Unmute local audio
   */
  unmute(): Promise<void>

  /**
   * Send DTMF tone(s)
   *
   * @param tone - DTMF tone(s) to send (0-9, *, #, A-D)
   * @param options - DTMF options (duration, gap)
   */
  sendDTMF(tone: string, options?: DTMFOptions): Promise<void>

  /**
   * Transfer call (blind transfer)
   *
   * @param target - SIP URI to transfer to
   */
  transfer(target: string): Promise<void>

  /**
   * Transfer call (attended/supervised transfer)
   *
   * @param target - Call session to transfer to
   */
  attendedTransfer(target: ICallSession): Promise<void>

  /**
   * Renegotiate media (e.g., add video to audio-only call)
   *
   * @param options - Renegotiation options
   */
  renegotiate(options?: RenegotiateOptions): Promise<void>

  /**
   * Get call statistics
   */
  getStats(): Promise<CallStatistics>
}

/**
 * Call Options
 */
export interface CallOptions {
  /**
   * Media constraints
   */
  mediaConstraints?: MediaStreamConstraints

  /**
   * Extra SIP headers to include
   */
  extraHeaders?: string[]

  /**
   * Anonymous call (hide caller ID)
   */
  anonymous?: boolean

  /**
   * Custom SDP
   */
  customSDP?: string

  /**
   * RTCPeerConnection configuration
   */
  pcConfig?: RTCConfiguration
}

/**
 * Answer Options
 */
export interface AnswerOptions {
  /**
   * Media constraints for answering
   */
  mediaConstraints?: MediaStreamConstraints

  /**
   * Extra SIP headers to include in answer
   */
  extraHeaders?: string[]

  /**
   * RTCPeerConnection configuration
   */
  pcConfig?: RTCConfiguration
}

/**
 * DTMF Options
 */
export interface DTMFOptions {
  /**
   * Duration of each tone in milliseconds
   */
  duration?: number

  /**
   * Gap between tones in milliseconds
   */
  interToneGap?: number

  /**
   * Transport method: 'RFC2833' (RTP) or 'INFO' (SIP INFO)
   */
  transport?: 'RFC2833' | 'INFO'
}

/**
 * Renegotiate Options
 */
export interface RenegotiateOptions {
  /**
   * Updated media constraints
   */
  mediaConstraints?: MediaStreamConstraints

  /**
   * Use UPDATE instead of re-INVITE
   */
  useUpdate?: boolean
}

/**
 * Call Statistics
 */
export interface CallStatistics {
  /**
   * Audio statistics
   */
  audio?: {
    /** Bytes sent */
    bytesSent: number
    /** Bytes received */
    bytesReceived: number
    /** Packets sent */
    packetsSent: number
    /** Packets received */
    packetsReceived: number
    /** Packets lost */
    packetsLost: number
    /** Jitter in milliseconds */
    jitter: number
    /** Round-trip time in milliseconds */
    roundTripTime: number
    /** Current bitrate */
    bitrate: number
  }

  /**
   * Video statistics
   */
  video?: {
    /** Bytes sent */
    bytesSent: number
    /** Bytes received */
    bytesReceived: number
    /** Packets sent */
    packetsSent: number
    /** Packets received */
    packetsReceived: number
    /** Packets lost */
    packetsLost: number
    /** Frame rate */
    frameRate: number
    /** Resolution */
    resolution: { width: number; height: number }
    /** Current bitrate */
    bitrate: number
  }

  /**
   * Connection statistics
   */
  connection?: {
    /** Local ICE candidate type */
    localCandidateType: string
    /** Remote ICE candidate type */
    remoteCandidateType: string
    /** Available outgoing bitrate */
    availableOutgoingBitrate: number
    /** Available incoming bitrate */
    availableIncomingBitrate: number
  }
}

/**
 * Adapter Events
 *
 * Standardized events emitted by all SIP adapters
 */
export interface AdapterEvents {
  // Connection events
  'connection:connecting': void
  'connection:connected': void
  'connection:disconnected': { reason?: string }
  'connection:failed': { error: Error }

  // Registration events
  'registration:registering': void
  'registration:registered': { expires: number }
  'registration:unregistered': void
  'registration:failed': { error: Error; statusCode?: number }

  // Call events
  'call:incoming': { session: ICallSession }
  'call:outgoing': { session: ICallSession }

  // Message events
  'message:received': { from: string; content: string; contentType: string }

  // Presence events
  'presence:notification': { from: string; state: string; note?: string }

  // Error events
  error: { error: Error; context: string }
}

/**
 * Call Session Events
 *
 * Standardized events emitted by call sessions
 */
export interface CallSessionEvents {
  progress: { statusCode: number; reasonPhrase: string }
  accepted: void
  confirmed: void
  ended: { cause: string; statusCode?: number }
  failed: { cause: string; statusCode?: number }
  hold: void
  unhold: void
  muted: void
  unmuted: void
  dtmf: { tone: string }
  referred: { target: string }
  localStream: { stream: MediaStream }
  remoteStream: { stream: MediaStream }
  iceConnectionStateChange: { state: RTCIceConnectionState }
  iceGatheringStateChange: { state: RTCIceGatheringState }
  signalingStateChange: { state: RTCSignalingState }
}
