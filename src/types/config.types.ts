/**
 * Configuration type definitions for VueSip
 * @packageDocumentation
 */

/**
 * TURN server configuration for NAT traversal
 */
export interface TurnServerConfig {
  /** TURN server URLs (e.g., 'turn:turn.example.com:3478') */
  urls: string | readonly string[]
  /** Username for TURN server authentication */
  username?: string
  /** Credential for TURN server authentication */
  credential?: string
  /** Credential type (default: 'password') */
  credentialType?: 'password' | 'oauth'
}

/**
 * Media configuration for audio and video streams
 */
/**
 * Media configuration (readonly-compatible for Vue reactivity)
 */
export interface MediaConfiguration {
  /** Audio constraints */
  audio?: boolean | MediaTrackConstraints | { readonly [key: string]: unknown }
  /** Video constraints */
  video?: boolean | MediaTrackConstraints | { readonly [key: string]: unknown }
  /** Enable echo cancellation (default: true) */
  echoCancellation?: boolean
  /** Enable noise suppression (default: true) */
  noiseSuppression?: boolean
  /** Enable auto gain control (default: true) */
  autoGainControl?: boolean
  /** Preferred audio codec */
  audioCodec?: 'opus' | 'pcmu' | 'pcma' | 'g722'
  /** Preferred video codec */
  videoCodec?: 'vp8' | 'vp9' | 'h264'
  /** Enable data channel */
  dataChannel?: boolean
}

/**
 * User preferences for the SIP client
 */
export interface UserPreferences {
  /** Default audio input device ID */
  audioInputDeviceId?: string
  /** Default audio output device ID */
  audioOutputDeviceId?: string
  /** Default video input device ID */
  videoInputDeviceId?: string
  /** Enable local audio by default */
  enableAudio?: boolean
  /** Enable local video by default */
  enableVideo?: boolean
  /** Auto-answer incoming calls */
  autoAnswer?: boolean
  /** Auto-answer delay in milliseconds */
  autoAnswerDelay?: number
  /** Ring tone URL */
  ringToneUrl?: string
  /** Ring back tone URL */
  ringBackToneUrl?: string
  /** Enable DTMF tones */
  enableDtmfTones?: boolean
}

/**
 * Extended RTCConfiguration with VueSip-specific options
 */
export interface ExtendedRTCConfiguration extends RTCConfiguration {
  /** STUN server URLs */
  stunServers?: readonly string[]
  /** TURN server configurations */
  turnServers?: readonly TurnServerConfig[]
  /** ICE transport policy */
  iceTransportPolicy?: RTCIceTransportPolicy
  /** Bundle policy */
  bundlePolicy?: RTCBundlePolicy
  /** RTC configuration */
  rtcpMuxPolicy?: RTCRtcpMuxPolicy
  /** ICE candidate pool size */
  iceCandidatePoolSize?: number
}

/**
 * Main SIP client configuration
 */
export interface SipClientConfig {
  /** WebSocket SIP server URI (e.g., 'wss://sip.example.com:7443') */
  uri: string
  /** SIP user URI (e.g., 'sip:user@domain.com') */
  sipUri: string
  /** SIP password for authentication */
  password: string
  /** Display name for the user */
  displayName?: string
  /** Authorization username (if different from SIP username) */
  authorizationUsername?: string
  /** SIP realm for authentication */
  realm?: string
  /** HA1 hash for enhanced security (alternative to password) */
  ha1?: string

  /** WebSocket connection options */
  wsOptions?: {
    /** WebSocket protocols */
    protocols?: readonly string[]
    /** Connection timeout in milliseconds (default: 10000) */
    connectionTimeout?: number
    /** Maximum reconnection attempts (default: 5) */
    maxReconnectionAttempts?: number
    /** Reconnection delay in milliseconds (default: 2000) */
    reconnectionDelay?: number
  }

  /** Registration options */
  registrationOptions?: {
    /** Registration expiry time in seconds (default: 600) */
    expires?: number
    /** Enable automatic registration on connection (default: true) */
    autoRegister?: boolean
    /** Registration retry interval in milliseconds (default: 30000) */
    registrationRetryInterval?: number
  }

  /** Session options */
  sessionOptions?: {
    /** Session timers (default: true) */
    sessionTimers?: boolean
    /** Session timers refresh method */
    sessionTimersRefreshMethod?: 'UPDATE' | 'INVITE'
    /** Maximum concurrent calls (default: 1) */
    maxConcurrentCalls?: number
    /** Call timeout in milliseconds (default: 60000) */
    callTimeout?: number
  }

  /** Media configuration */
  mediaConfiguration?: MediaConfiguration

  /** RTC configuration */
  rtcConfiguration?: ExtendedRTCConfiguration

  /** User preferences */
  userPreferences?: UserPreferences

  /** User agent string */
  userAgent?: string

  /** Enable debug mode */
  debug?: boolean

  /**
   * Called identity extraction (multi-DID / multi-line inbound)
   *
   * Controls how VueSip derives the "called number" / "line identity" from inbound INVITEs.
   * Designed to work across direct-to-provider and PBX scenarios by extracting multiple
   * candidates and then selecting `dialed` (originally called) vs `target` (current target).
   */
  calledIdentity?: CalledIdentityConfig

  /**
   * Codec policy configuration (preview)
   * Controls preferred codecs and negotiation strategy.
   */
  codecPolicy?: import('../codecs/types').CodecPolicy

  /** Logger instance (if custom logging is needed) */
  logger?: {
    debug: (...args: unknown[]) => void
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
  }
}

// ==========================================================================
// Called Identity (Multi-DID / Multi-Line)
// ==========================================================================

/**
 * Candidate sources VueSip can extract called identity from.
 *
 * Notes:
 * - `request-uri` is the SIP Request-URI user part.
 * - `to` is the To header URI user part.
 * - `p-called-party-id`, `history-info`, and `diversion` are common PBX/provider headers
 *   that preserve original called DID through forwarding/retargeting.
 */
export type CalledIdentitySource =
  | 'request-uri'
  | 'to'
  | 'p-called-party-id'
  | 'history-info'
  | 'diversion'
  | 'x-header'

/** Built-in preset names for common environments. */
export type CalledIdentityPreset = 'default' | 'freepbx_pjsip'

/** How a custom header should be treated by selection logic. */
export type CalledIdentityHeaderRole = 'dialed' | 'target' | 'candidate'

/**
 * Normalization options.
 *
 * This intentionally stays lightweight: keep `raw` always, and optionally compute
 * a normalized value for matching/routing.
 */
export interface CalledIdentityNormalizationConfig {
  /** Enable normalization (default: true). */
  enabled?: boolean
  /** Preserve a leading '+' if present in input (default: true). */
  keepPlus?: boolean
  /** Strip visual separators (spaces, dashes, parentheses) (default: true). */
  stripSeparators?: boolean
  /** Optional default country for future E.164 normalization. */
  defaultCountry?: string
}

/**
 * Configuration for extracting a "called number" / line identity from inbound calls.
 *
 * The extraction engine should:
 * 1) collect candidates from multiple sources
 * 2) compute `dialed` and `target` by precedence rules
 * 3) store both raw + normalized forms for transparency and easy debugging
 */
export interface CalledIdentityConfig {
  /** Optional preset that seeds defaults. Explicit fields override preset values. */
  preset?: CalledIdentityPreset | (string & {})

  /** Selection order for the current routing target (default: request-uri -> to -> p-called-party-id). */
  targetPrecedence?: readonly CalledIdentitySource[]

  /** Selection order for the originally dialed DID/line (default: p-called-party-id -> history-info -> diversion -> to -> request-uri). */
  dialedPrecedence?: readonly CalledIdentitySource[]

  /**
   * Map of custom headers to treat as dialed/target/candidate.
   * Header names should be provided in canonical SIP form (case-insensitive in parsing).
   */
  customHeaderMap?: Readonly<Record<string, CalledIdentityHeaderRole>>

  /** Optional precedence for custom headers when multiple are present. */
  customHeaderPrecedence?: readonly string[]

  /** Normalization behavior for derived values. */
  normalization?: CalledIdentityNormalizationConfig
}

/** Preset configurations (all overrideable). */
export const CALLED_IDENTITY_PRESETS = {
  default: {
    preset: 'default',
    targetPrecedence: ['request-uri', 'to', 'p-called-party-id'],
    dialedPrecedence: ['p-called-party-id', 'history-info', 'diversion', 'to', 'request-uri'],
    normalization: {
      enabled: true,
      keepPlus: true,
      stripSeparators: true,
    },
  },
  // PBX leg often rewrites Request-URI/To to an extension; favor "originally called" headers.
  freepbx_pjsip: {
    preset: 'freepbx_pjsip',
    targetPrecedence: ['request-uri', 'to', 'p-called-party-id'],
    dialedPrecedence: ['p-called-party-id', 'history-info', 'diversion', 'to', 'request-uri'],
    normalization: {
      enabled: true,
      keepPlus: true,
      stripSeparators: true,
    },
  },
} as const satisfies Record<string, CalledIdentityConfig>

/** Default called identity config used when nothing is specified. */
export const DEFAULT_CALLED_IDENTITY_CONFIG: CalledIdentityConfig = CALLED_IDENTITY_PRESETS.default

/**
 * Validation result for configuration
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean
  /** Error messages if validation failed */
  errors?: string[]
  /** Warning messages */
  warnings?: string[]
}
