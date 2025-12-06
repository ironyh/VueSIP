/**
 * JsSIP library type definitions
 *
 * Type definitions for JsSIP events and objects since the library
 * doesn't export proper TypeScript types.
 *
 * @packageDocumentation
 */

// ============================================================================
// RTCSession Types (replacing 'any' in CallSession.ts)
// ============================================================================

/**
 * JsSIP RTCSession interface
 * Represents an active SIP session with WebRTC capabilities
 */
export interface JsSIPRTCSession {
  /** Session unique identifier */
  id: string
  /** RTCPeerConnection instance */
  connection?: RTCPeerConnection
  /** Remote identity information */
  remote_identity?: JsSIPRemoteIdentity
  /** Answer the session */
  answer: (options?: JsSIPAnswerOptions) => void
  /** Terminate the session */
  terminate: (options?: JsSIPTerminateOptions) => void
  /** Put session on hold */
  hold: (options?: JsSIPHoldOptions) => void
  /** Resume from hold */
  unhold: (options?: JsSIPHoldOptions) => void
  /** Mute audio/video */
  mute: (options?: JsSIPMuteOptions) => void
  /** Unmute audio/video */
  unmute: (options?: JsSIPMuteOptions) => void
  /** Send DTMF tone */
  sendDTMF: (tone: string, options?: JsSIPDTMFOptions) => void
  /** Refer (transfer) the session */
  refer: (target: string, options?: JsSIPReferOptions) => void
  /** Add event listener */
  on: (event: string, handler: (data: unknown) => void) => void
  /** Remove event listener */
  off: (event: string, handler: (data: unknown) => void) => void
  /** Remove all event listeners */
  removeAllListeners: () => void
}

/**
 * Remote identity from JsSIP
 */
export interface JsSIPRemoteIdentity {
  uri?: JsSIPUri
  display_name?: string
}

/**
 * JsSIP URI interface
 */
export interface JsSIPUri {
  scheme?: string
  user?: string
  host?: string
  port?: number
  toString: () => string
}

/**
 * Options for answering a call
 */
export interface JsSIPAnswerOptions {
  mediaConstraints?: MediaStreamConstraints
  rtcConfiguration?: RTCConfiguration
  extraHeaders?: string[]
  [key: string]: unknown
}

/**
 * Options for terminating a call
 */
export interface JsSIPTerminateOptions {
  status_code?: number
  reason_phrase?: string
  extraHeaders?: string[]
  [key: string]: unknown
}

/**
 * Options for hold/unhold operations
 */
export interface JsSIPHoldOptions {
  useUpdate?: boolean
  extraHeaders?: string[]
  [key: string]: unknown
}

/**
 * Options for mute/unmute operations
 */
export interface JsSIPMuteOptions {
  audio?: boolean
  video?: boolean
}

/**
 * Options for DTMF sending
 */
export interface JsSIPDTMFOptions {
  duration?: number
  interToneGap?: number
  transportType?: 'RFC2833' | 'INFO'
  [key: string]: unknown
}

/**
 * Options for REFER (transfer) operations
 */
export interface JsSIPReferOptions {
  extraHeaders?: string[]
  replaces?: string
  [key: string]: unknown
}

/**
 * JsSIP progress event data
 */
export interface JsSIPProgressEvent {
  response?: JsSIPResponse
  originator?: 'local' | 'remote'
}

/**
 * JsSIP response object
 */
export interface JsSIPResponse {
  status_code?: number
  reason_phrase?: string
  getHeader?: (name: string) => string | undefined
}

/**
 * JsSIP ended/failed event data
 */
export interface JsSIPEndEvent {
  cause?: string
  originator?: 'local' | 'remote'
  response?: JsSIPResponse
  message?: string
}

/**
 * JsSIP hold/unhold event data
 */
export interface JsSIPHoldEvent {
  originator: 'local' | 'remote'
}

/**
 * JsSIP PeerConnection event data
 */
export interface JsSIPPeerConnectionEvent {
  peerconnection: RTCPeerConnection
}

/**
 * JsSIP SDP event data
 */
export interface JsSIPSDPEvent {
  type: 'offer' | 'answer'
  sdp: string
}

// ============================================================================
// Connection Events
// ============================================================================

/**
 * JsSIP WebSocket connection event
 */
export interface JsSIPConnectedEvent {
  socket?: {
    url?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * JsSIP disconnection event
 */
export interface JsSIPDisconnectedEvent {
  error?: boolean
  code?: number
  reason?: string
  [key: string]: unknown
}

/**
 * JsSIP registration success event
 */
export interface JsSIPRegisteredEvent {
  response?: {
    status_code?: number
    reason_phrase?: string
    getHeader?: (name: string) => string | undefined
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * JsSIP unregistration event
 */
export interface JsSIPUnregisteredEvent {
  cause?: string
  response?: {
    status_code?: number
    reason_phrase?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * JsSIP registration failure event
 */
export interface JsSIPRegistrationFailedEvent {
  response?: {
    status_code?: number
    reason_phrase?: string
    [key: string]: unknown
  }
  cause?: string
  [key: string]: unknown
}

/**
 * JsSIP new RTC session event
 */
export interface JsSIPNewRTCSessionEvent {
  originator?: 'local' | 'remote'
  session?: unknown // RTCSession from JsSIP
  request?: {
    from?: {
      uri?: {
        user?: string
        host?: string
        [key: string]: unknown
      }
      display_name?: string
      [key: string]: unknown
    }
    to?: {
      uri?: {
        user?: string
        host?: string
        [key: string]: unknown
      }
      display_name?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * Generic JsSIP event
 */
export interface JsSIPEvent {
  [key: string]: unknown
}

/**
 * Union type for all JsSIP events
 */
export type AnyJsSIPEvent =
  | JsSIPConnectedEvent
  | JsSIPDisconnectedEvent
  | JsSIPRegisteredEvent
  | JsSIPUnregisteredEvent
  | JsSIPRegistrationFailedEvent
  | JsSIPNewRTCSessionEvent
  | JsSIPEvent
