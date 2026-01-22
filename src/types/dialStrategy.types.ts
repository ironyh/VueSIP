/**
 * Dial Strategy Types
 *
 * Types for provider-aware outbound calling strategies.
 * Supports standards-based SIP INVITE and provider-specific REST originate (e.g., 46elks).
 */

/**
 * Dial strategy type
 *
 * Different providers may require different strategies for outbound calling:
 * - 'sip-invite': Standard SIP INVITE (default, works with most providers)
 * - 'rest-originate': REST API originate (required by some providers like 46elks)
 */
export type DialStrategyType = 'sip-invite' | 'rest-originate'

/**
 * Result of dial attempt
 */
export interface DialResult {
  /** Whether dial was successful */
  success: boolean
  /** Call ID (for REST originate) or undefined (for SIP INVITE) */
  callId?: string
  /** Error message if dial failed */
  error?: string
}

/**
 * Options for dialing via SIP INVITE
 */
export interface SipInviteOptions {
  /** SIP URI to call */
  target: string
  /** Optional extra SIP headers */
  extraHeaders?: string[]
}

/**
 * Options for dialing via REST originate
 */
export interface RestOriginateOptions {
  /** Provider ID (e.g., '46elks') */
  providerId: string
  /** API username */
  apiUsername: string
  /** API password */
  apiPassword: string
  /** Caller ID number */
  callerId: string
  /** WebRTC/destination number */
  webrtcNumber: string
  /** Destination phone number */
  destination: string
}

/**
 * Dial strategy interface
 *
 * Each strategy must implement the dial method with appropriate options.
 */
export interface DialStrategy {
  /** Strategy type */
  type: DialStrategyType
  /** Whether this strategy requires REST API credentials */
  requiresRestApi: boolean
  /** Check if this strategy is applicable for given provider */
  canHandle: (providerId: string) => boolean
  /** Execute the dial */
  dial: (options: unknown) => Promise<DialResult>
}

/**
 * Dial strategy config
 *
 * Configuration for selecting and using dial strategies.
 */
export interface DialStrategyConfig {
  /** Current strategy type */
  strategy: DialStrategyType
  /** Provider ID */
  providerId: string
  /** Whether to auto-detect strategy from provider ID */
  autoDetect?: boolean
}
