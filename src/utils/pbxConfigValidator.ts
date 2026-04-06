/**
 * PBX Configuration Validation Utility
 *
 * Validates VueSIP configurations against known working PBX configurations.
 * Supports schema validation, configuration error detection, and auto-correction
 * suggestions for 7 PBX platforms: Asterisk, FreePBX, Grandstream, Yeastar,
 * 3CX, Kamailio, and FusionPBX.
 *
 * @module utils/pbxConfigValidator
 */

import type { SipClientConfig, ValidationResult } from '../types/config.types'
import { validateSipConfig, validateWebSocketUrl } from './validators'

// ---------------------------------------------------------------------------
// PBX Platform Types
// ---------------------------------------------------------------------------

/** Supported PBX platform identifiers */
export type PbxPlatform =
  | 'asterisk'
  | 'freepbx'
  | 'grandstream'
  | 'yeastar'
  | '3cx'
  | 'kamailio'
  | 'fusionpbx'

/** PBX platform capability levels */
export type CapabilityLevel = 'excellent' | 'good' | 'limited' | 'restricted' | 'missing'

/** WebSocket transport type */
export type TransportType = 'udp' | 'tcp' | 'ws' | 'wss'

/** Codec identifier */
export type CodecId = 'opus' | 'pcmu' | 'pcma' | 'g722' | 'g729' | 'gsm' | 'vp8' | 'vp9' | 'h264'

// ---------------------------------------------------------------------------
// Schema Definitions
// ---------------------------------------------------------------------------

/** Known working configuration profile for a PBX platform */
export interface PbxPlatformProfile {
  /** Platform identifier */
  platform: PbxPlatform
  /** Human-readable platform name */
  displayName: string
  /** Supported platform versions */
  versions: string[]
  /** WebSocket URI patterns known to work */
  wsUriPatterns: RegExp[]
  /** Default WebSocket port */
  defaultPort: number
  /** Supported transport types */
  supportedTransports: TransportType[]
  /** SIP capability */
  sipCapability: CapabilityLevel
  /** WebSocket capability */
  webSocketCapability: CapabilityLevel
  /** WebRTC capability */
  webRtcCapability: CapabilityLevel
  /** Authentication methods supported */
  authMethods: string[]
  /** Supported audio codecs */
  audioCodecs: CodecId[]
  /** Supported video codecs */
  videoCodecs: CodecId[]
  /** Requires WSS for WebRTC */
  requiresWssForWebRtc: boolean
  /** Minimum registration expires in seconds */
  minRegistrationExpires: number
  /** Maximum registration expires in seconds */
  maxRegistrationExpires: number
  /** Supports session timers */
  supportsSessionTimers: boolean
  /** Known configuration quirks */
  quirks: PbxConfigurationQuirk[]
  /** Overall VueSIP compatibility score (0-100) */
  compatibilityScore: number
}

/** A known configuration quirk or limitation */
export interface PbxConfigurationQuirk {
  /** Unique quirk identifier */
  id: string
  /** Short description */
  description: string
  /** Severity: error blocks functionality, warning degrades it, info is advisory */
  severity: 'error' | 'warning' | 'info'
  /** Configuration field this relates to */
  field?: string
  /** Auto-correction suggestion */
  suggestion?: string
}

// ---------------------------------------------------------------------------
// Validation Result Types
// ---------------------------------------------------------------------------

/** Extended validation result with PBX-specific details */
export interface PbxValidationResult extends ValidationResult {
  /** Platform that was validated against */
  platform?: PbxPlatform
  /** Compatibility score for the given configuration (0-100) */
  compatibilityScore?: number
  /** Detected platform from configuration (auto-detected) */
  detectedPlatform?: PbxPlatform
  /** Auto-correction suggestions */
  suggestions?: PbxConfigSuggestion[]
  /** Validated configuration details */
  details?: {
    wsUri: { valid: boolean; message: string }
    sipUri: { valid: boolean; message: string }
    transport: { valid: boolean; message: string }
    codecs: { valid: boolean; message: string }
    registration: { valid: boolean; message: string }
    session: { valid: boolean; message: string }
    webRtc: { valid: boolean; message: string }
  }
}

/** An auto-correction suggestion */
export interface PbxConfigSuggestion {
  /** Field path in the configuration */
  field: string
  /** Current value */
  currentValue: unknown
  /** Suggested value */
  suggestedValue: unknown
  /** Reason for the suggestion */
  reason: string
  /** Severity */
  severity: 'error' | 'warning' | 'info'
}

// ---------------------------------------------------------------------------
// Known Working PBX Profiles
// ---------------------------------------------------------------------------

const PBX_PROFILES: Record<PbxPlatform, PbxPlatformProfile> = {
  asterisk: {
    platform: 'asterisk',
    displayName: 'Asterisk',
    versions: ['20', '21', '22'],
    wsUriPatterns: [/^wss?:\/\/[^/]+:8088\/ws$/, /^wss?:\/\/[^/]+:8089\/ws$/],
    defaultPort: 8088,
    supportedTransports: ['udp', 'tcp', 'ws', 'wss'],
    sipCapability: 'excellent',
    webSocketCapability: 'good',
    webRtcCapability: 'good',
    authMethods: ['digest-md5', 'digest-sha256', 'ip-based', 'token'],
    audioCodecs: ['opus', 'pcmu', 'pcma', 'g722', 'g729', 'gsm'],
    videoCodecs: ['vp8', 'vp9', 'h264'],
    requiresWssForWebRtc: true,
    minRegistrationExpires: 60,
    maxRegistrationExpires: 3600,
    supportsSessionTimers: true,
    compatibilityScore: 75,
    quirks: [
      {
        id: 'asterisk-wss-dtls',
        description: 'WebRTC requires WSS with valid TLS certificate and DTLS-SRTP enabled',
        severity: 'error',
        field: 'uri',
        suggestion:
          'Use wss:// instead of ws:// and ensure DTLS certificates are configured in res_pjsip',
      },
      {
        id: 'asterisk-transport-websocket',
        description: 'WebSocket transport module (res_pjsip_transport_websocket.so) must be loaded',
        severity: 'warning',
        suggestion: 'Verify the module is loaded: "module show like res_pjsip_transport_websocket"',
      },
      {
        id: 'asterisk-no-xccs',
        description: 'Asterisk does not support XCCS natively; use AMI for call control instead',
        severity: 'info',
      },
    ],
  },

  freepbx: {
    platform: 'freepbx',
    displayName: 'FreePBX',
    versions: ['16', '17'],
    wsUriPatterns: [/^wss?:\/\/[^/]+:8088\/ws$/, /^wss?:\/\/[^/]+\/admin\/api\/websocket$/],
    defaultPort: 8088,
    supportedTransports: ['udp', 'tcp', 'ws', 'wss'],
    sipCapability: 'excellent',
    webSocketCapability: 'limited',
    webRtcCapability: 'limited',
    authMethods: ['digest-md5', 'ip-based'],
    audioCodecs: ['opus', 'pcmu', 'pcma', 'g722', 'g729', 'gsm'],
    videoCodecs: ['vp8', 'h264'],
    requiresWssForWebRtc: true,
    minRegistrationExpires: 60,
    maxRegistrationExpires: 3600,
    supportsSessionTimers: true,
    compatibilityScore: 70,
    quirks: [
      {
        id: 'freepbx-webrtc-wss',
        description:
          'WebRTC requires WSS. FreePBX WebSocket support is limited; manual configuration needed',
        severity: 'error',
        field: 'uri',
        suggestion:
          'Enable WebRTC endpoint in FreePBX: Settings > Asterisk SIP Settings > WebSocket Transport',
      },
      {
        id: 'freepbx-pjsip-driver',
        description: 'FreePBX should use PJSIP driver (not chan_sip) for WebSocket support',
        severity: 'warning',
        suggestion: 'Set SIP channel driver to "chan_pjsip" in Advanced Settings',
      },
      {
        id: 'freepbx-cdr-graphql',
        description: 'CDR access requires GraphQL API at /admin/api/api/gql',
        severity: 'info',
        field: 'uri',
      },
    ],
  },

  grandstream: {
    platform: 'grandstream',
    displayName: 'Grandstream (UCM6xxx)',
    versions: ['UCM6300', 'UCM6200', 'UCM6510'],
    wsUriPatterns: [/^wss?:\/\/[^/]+:8088$/, /^wss?:\/\/[^/]+:8443$/],
    defaultPort: 8088,
    supportedTransports: ['udp', 'tcp', 'ws', 'wss'],
    sipCapability: 'good',
    webSocketCapability: 'limited',
    webRtcCapability: 'limited',
    authMethods: ['digest-md5', 'ip-based'],
    audioCodecs: ['pcmu', 'pcma', 'g722', 'g729'],
    videoCodecs: ['vp8', 'h264'],
    requiresWssForWebRtc: true,
    minRegistrationExpires: 120,
    maxRegistrationExpires: 3600,
    supportsSessionTimers: true,
    compatibilityScore: 60,
    quirks: [
      {
        id: 'grandstream-limited-codec',
        description: 'Limited codec support; Opus may not be available on older firmware',
        severity: 'warning',
        field: 'mediaConfiguration.audioCodec',
        suggestion: 'Use PCMU/PCMA as fallback codecs; check firmware version for Opus support',
      },
      {
        id: 'grandstream-websocket-config',
        description: 'WebSocket must be explicitly enabled in Extension > WebRTC settings',
        severity: 'warning',
        suggestion: 'Enable WebRTC for each extension in the Grandstream UCM GUI',
      },
    ],
  },

  yeastar: {
    platform: 'yeastar',
    displayName: 'Yeastar (P-Series)',
    versions: ['P-Series'],
    wsUriPatterns: [/^wss?:\/\/[^/]+:8088\/ws$/, /^wss?:\/\/[^/]+:5060\/ws$/],
    defaultPort: 8088,
    supportedTransports: ['udp', 'tcp', 'ws', 'wss'],
    sipCapability: 'good',
    webSocketCapability: 'good',
    webRtcCapability: 'good',
    authMethods: ['digest-md5', 'ip-based', 'token'],
    audioCodecs: ['opus', 'pcmu', 'pcma', 'g722', 'g729'],
    videoCodecs: ['vp8', 'h264'],
    requiresWssForWebRtc: true,
    minRegistrationExpires: 60,
    maxRegistrationExpires: 3600,
    supportsSessionTimers: true,
    compatibilityScore: 65,
    quirks: [
      {
        id: 'yeastar-linkus-webrtc',
        description: 'WebRTC support uses Linkus WebSDK; ensure Linkus Web client is enabled',
        severity: 'warning',
        suggestion: 'Enable Linkus Web Client in System Settings > Feature Settings',
      },
    ],
  },

  '3cx': {
    platform: '3cx',
    displayName: '3CX',
    versions: ['18', '19'],
    wsUriPatterns: [/^wss?:\/\/[^/]+:5001$/, /^wss?:\/\/[^/]+:5061$/],
    defaultPort: 5001,
    supportedTransports: ['udp', 'tcp'],
    sipCapability: 'limited',
    webSocketCapability: 'restricted',
    webRtcCapability: 'restricted',
    authMethods: ['digest-md5'],
    audioCodecs: ['pcmu', 'pcma', 'g729', 'opus'],
    videoCodecs: ['vp8', 'h264'],
    requiresWssForWebRtc: true,
    minRegistrationExpires: 300,
    maxRegistrationExpires: 3600,
    supportsSessionTimers: false,
    compatibilityScore: 40,
    quirks: [
      {
        id: '3cx-restricted-websocket',
        description:
          '3CX restricts WebSocket access; only the 3CX Web Client can use WebRTC natively',
        severity: 'error',
        field: 'uri',
        suggestion:
          'Consider SIP over TCP/UDP instead of WebSocket; or use 3CX REST API for integration',
      },
      {
        id: '3cx-no-session-timers',
        description: '3CX does not reliably support SIP session timers',
        severity: 'warning',
        field: 'sessionOptions.sessionTimers',
        suggestion: 'Disable sessionTimers in sessionOptions for 3CX compatibility',
      },
      {
        id: '3cx-limited-codec',
        description: '3CX has limited codec negotiation; prefer PCMU/PCMA',
        severity: 'warning',
        field: 'mediaConfiguration.audioCodec',
        suggestion: 'Set audioCodec to "pcmu" or "pcma" for best compatibility',
      },
    ],
  },

  kamailio: {
    platform: 'kamailio',
    displayName: 'Kamailio',
    versions: ['5.7', '5.8'],
    wsUriPatterns: [
      /^wss?:\/\/[^/]+:443\/ws$/,
      /^wss?:\/\/[^/]+:8080\/ws$/,
      /^wss?:\/\/[^/]+\/ws$/,
    ],
    defaultPort: 443,
    supportedTransports: ['udp', 'tcp', 'ws', 'wss'],
    sipCapability: 'excellent',
    webSocketCapability: 'excellent',
    webRtcCapability: 'excellent',
    authMethods: ['digest-md5', 'digest-sha256', 'ip-based', 'token'],
    audioCodecs: ['opus', 'pcmu', 'pcma', 'g722', 'g729', 'gsm'],
    videoCodecs: ['vp8', 'vp9', 'h264'],
    requiresWssForWebRtc: true,
    minRegistrationExpires: 60,
    maxRegistrationExpires: 7200,
    supportsSessionTimers: true,
    compatibilityScore: 80,
    quirks: [
      {
        id: 'kamailio-websocket-module',
        description: 'WebSocket module (ws.so) must be loaded and configured',
        severity: 'warning',
        suggestion: 'Load ws module and configure WebSocket listener: "listen=ws:0.0.0.0:8080"',
      },
      {
        id: 'kamailio-rtpengine',
        description: 'WebRTC media relay requires rtpengine or rtpproxy',
        severity: 'warning',
        suggestion: 'Configure rtpengine module for WebRTC media handling',
      },
    ],
  },

  fusionpbx: {
    platform: 'fusionpbx',
    displayName: 'FusionPBX',
    versions: ['4.5', '5.0'],
    wsUriPatterns: [/^wss?:\/\/[^/]+:7443$/, /^wss?:\/\/[^/]+:5066\/ws$/],
    defaultPort: 7443,
    supportedTransports: ['udp', 'tcp', 'ws', 'wss'],
    sipCapability: 'good',
    webSocketCapability: 'limited',
    webRtcCapability: 'limited',
    authMethods: ['digest-md5', 'ip-based'],
    audioCodecs: ['opus', 'pcmu', 'pcma', 'g722', 'g729'],
    videoCodecs: ['vp8', 'h264'],
    requiresWssForWebRtc: true,
    minRegistrationExpires: 60,
    maxRegistrationExpires: 3600,
    supportsSessionTimers: true,
    compatibilityScore: 55,
    quirks: [
      {
        id: 'fusionpbx-freeswitch-verto',
        description:
          'FusionPBX (FreeSWITCH) supports WebRTC via Verto protocol, not standard SIP WebSocket',
        severity: 'warning',
        suggestion:
          'Ensure Sofia SIP profile has WebSocket transport enabled for standard SIP over WS',
      },
      {
        id: 'fusionpbx-ssl-required',
        description: 'WSS requires valid SSL certificate on the SIP profile',
        severity: 'warning',
        field: 'uri',
        suggestion: 'Configure SSL certificate on the Sofia SIP profile for WSS transport',
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Platform Detection
// ---------------------------------------------------------------------------

/**
 * Attempt to detect the PBX platform from the WebSocket URI and configuration.
 *
 * @param config - The SIP client configuration
 * @returns Detected platform or null
 */
export function detectPbxPlatform(config: Partial<SipClientConfig>): PbxPlatform | null {
  if (!config.uri) return null

  for (const [platform, profile] of Object.entries(PBX_PROFILES) as [
    PbxPlatform,
    PbxPlatformProfile,
  ][]) {
    for (const pattern of profile.wsUriPatterns) {
      if (pattern.test(config.uri)) {
        return platform
      }
    }
  }

  // Heuristic: check port number
  try {
    const url = new URL(config.uri)
    const port = parseInt(url.port, 10)
    if (port) {
      for (const [platform, profile] of Object.entries(PBX_PROFILES) as [
        PbxPlatform,
        PbxPlatformProfile,
      ][]) {
        if (profile.defaultPort === port) {
          return platform
        }
      }
    }
  } catch {
    // URL parsing failed, ignore
  }

  return null
}

// ---------------------------------------------------------------------------
// Core Validation
// ---------------------------------------------------------------------------

/**
 * Validate a VueSIP configuration against a specific PBX platform profile.
 *
 * @param config - The SIP client configuration to validate
 * @param platform - Target PBX platform
 * @returns Detailed validation result with suggestions
 *
 * @example
 * ```typescript
 * const result = validatePbxConfig(config, 'asterisk')
 * if (!result.valid) {
 *   console.log('Errors:', result.errors)
 *   console.log('Suggestions:', result.suggestions)
 * }
 * ```
 */
export function validatePbxConfig(
  config: Partial<SipClientConfig>,
  platform: PbxPlatform
): PbxValidationResult {
  const profile = PBX_PROFILES[platform]
  if (!profile) {
    return {
      valid: false,
      platform,
      errors: [`Unknown PBX platform: ${platform}`],
      suggestions: [],
      details: undefined,
    }
  }

  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: PbxConfigSuggestion[] = []

  // 1. Base SIP config validation
  const baseResult = validateSipConfig(config)
  if (baseResult.errors) errors.push(...baseResult.errors)
  if (baseResult.warnings) warnings.push(...baseResult.warnings)

  // 2. WebSocket URI validation against platform patterns
  const wsUriResult = validateWsUriForPlatform(config.uri, profile)
  if (!wsUriResult.valid) {
    errors.push(wsUriResult.message)
    if (wsUriResult.suggestion) {
      suggestions.push(wsUriResult.suggestion)
    }
  }

  // 3. Transport validation
  const transportResult = validateTransport(config, profile)
  if (!transportResult.valid) {
    warnings.push(transportResult.message)
    if (transportResult.suggestion) {
      suggestions.push(transportResult.suggestion)
    }
  }

  // 4. Codec validation
  const codecResult = validateCodecs(config, profile)

  // 5. Registration validation
  const registrationResult = validateRegistration(config, profile)

  // 6. Session options validation
  const sessionResult = validateSessionOptions(config, profile)

  // 7. WebRTC validation
  const webRtcResult = validateWebRtc(config, profile)

  // 8. Apply platform quirks
  for (const quirk of profile.quirks) {
    if (quirk.severity === 'error') {
      // Only add error-level quirks if they are relevant
      if (quirk.field) {
        const fieldValue = getNestedValue(config, quirk.field)
        if (fieldValue !== undefined || quirk.id.includes('wss')) {
          errors.push(`[${profile.displayName}] ${quirk.description}`)
        }
      }
    } else if (quirk.severity === 'warning') {
      warnings.push(`[${profile.displayName}] ${quirk.description}`)
    }
    if (quirk.suggestion) {
      // Map quirks to suggestions
      suggestions.push({
        field: quirk.field ?? 'general',
        currentValue: null,
        suggestedValue: null,
        reason: quirk.description,
        severity: quirk.severity,
      })
    }
  }

  return {
    valid: errors.length === 0,
    platform,
    compatibilityScore: profile.compatibilityScore,
    detectedPlatform: detectPbxPlatform(config) ?? undefined,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    details: {
      wsUri: wsUriResult,
      sipUri: {
        valid: !baseResult.errors?.some((e) => e.includes('SIP URI')),
        message: baseResult.errors?.find((e) => e.includes('SIP URI')) ?? 'SIP URI is valid',
      },
      transport: transportResult,
      codecs: codecResult,
      registration: registrationResult,
      session: sessionResult,
      webRtc: webRtcResult,
    },
  }
}

/**
 * Auto-validate: detect the PBX platform from configuration and validate against it.
 *
 * @param config - The SIP client configuration to validate
 * @returns Validation result with auto-detected platform
 *
 * @example
 * ```typescript
 * const result = autoValidatePbxConfig(config)
 * console.log(`Detected: ${result.detectedPlatform}`)
 * console.log(`Compatible: ${result.valid}`)
 * ```
 */
export function autoValidatePbxConfig(config: Partial<SipClientConfig>): PbxValidationResult {
  const detected = detectPbxPlatform(config)

  if (detected) {
    return validatePbxConfig(config, detected)
  }

  // No platform detected; run base validation only
  const baseResult = validateSipConfig(config)
  return {
    valid: baseResult.valid,
    errors: baseResult.errors,
    warnings: [
      ...(baseResult.warnings ?? []),
      'Could not auto-detect PBX platform. Specify a platform explicitly for detailed validation.',
    ],
    suggestions: [],
    details: undefined,
  }
}

/**
 * Get all known PBX platform profiles.
 *
 * @returns Array of platform profiles
 */
export function getPbxPlatformProfiles(): PbxPlatformProfile[] {
  return Object.values(PBX_PROFILES)
}

/**
 * Get a specific PBX platform profile.
 *
 * @param platform - Platform identifier
 * @returns Platform profile or undefined
 */
export function getPbxPlatformProfile(platform: PbxPlatform): PbxPlatformProfile | undefined {
  return PBX_PROFILES[platform]
}

/**
 * Get known configuration quirks for a platform.
 *
 * @param platform - Platform identifier
 * @param severity - Optional severity filter
 * @returns Array of quirks
 */
export function getPbxQuirks(
  platform: PbxPlatform,
  severity?: 'error' | 'warning' | 'info'
): PbxConfigurationQuirk[] {
  const profile = PBX_PROFILES[platform]
  if (!profile) return []
  if (severity) return profile.quirks.filter((q) => q.severity === severity)
  return profile.quirks
}

/**
 * Generate auto-correction suggestions for a configuration against a platform.
 *
 * @param config - Current configuration
 * @param platform - Target platform
 * @returns Array of concrete correction suggestions
 *
 * @example
 * ```typescript
 * const suggestions = suggestCorrections(config, 'freepbx')
 * for (const s of suggestions) {
 *   console.log(`${s.field}: ${s.currentValue} → ${s.suggestedValue}`)
 *   console.log(`  Reason: ${s.reason}`)
 * }
 * ```
 */
export function suggestCorrections(
  config: Partial<SipClientConfig>,
  platform: PbxPlatform
): PbxConfigSuggestion[] {
  const profile = PBX_PROFILES[platform]
  if (!profile) return []

  const suggestions: PbxConfigSuggestion[] = []

  // Suggest WSS if using WS and platform requires it
  if (config.uri && config.uri.startsWith('ws://') && profile.requiresWssForWebRtc) {
    const wssUri = config.uri.replace('ws://', 'wss://')
    suggestions.push({
      field: 'uri',
      currentValue: config.uri,
      suggestedValue: wssUri,
      reason: `${profile.displayName} requires secure WebSocket (WSS) for WebRTC`,
      severity: 'error',
    })
  }

  // Suggest port correction
  if (config.uri) {
    try {
      const url = new URL(config.uri)
      const port = parseInt(url.port, 10)
      if (port && port !== profile.defaultPort) {
        const matchesPattern = profile.wsUriPatterns.some((p) => p.test(config.uri as string))
        if (!matchesPattern) {
          const corrected = `${url.protocol}//${url.hostname}:${profile.defaultPort}${url.pathname}`
          suggestions.push({
            field: 'uri',
            currentValue: config.uri,
            suggestedValue: corrected,
            reason: `${profile.displayName} typically uses port ${profile.defaultPort} for WebSocket`,
            severity: 'warning',
          })
        }
      }
    } catch {
      // Not a parseable URL, skip port check
    }
  }

  // Suggest session timer changes
  if (config.sessionOptions?.sessionTimers && !profile.supportsSessionTimers) {
    suggestions.push({
      field: 'sessionOptions.sessionTimers',
      currentValue: true,
      suggestedValue: false,
      reason: `${profile.displayName} does not reliably support SIP session timers`,
      severity: 'warning',
    })
  }

  // Suggest registration expires within range
  const regExpires = config.registrationOptions?.expires
  if (regExpires !== undefined) {
    if (regExpires < profile.minRegistrationExpires) {
      suggestions.push({
        field: 'registrationOptions.expires',
        currentValue: regExpires,
        suggestedValue: profile.minRegistrationExpires,
        reason: `${profile.displayName} minimum registration expires is ${profile.minRegistrationExpires}s`,
        severity: 'warning',
      })
    }
    if (regExpires > profile.maxRegistrationExpires) {
      suggestions.push({
        field: 'registrationOptions.expires',
        currentValue: regExpires,
        suggestedValue: profile.maxRegistrationExpires,
        reason: `${profile.displayName} maximum registration expires is ${profile.maxRegistrationExpires}s`,
        severity: 'warning',
      })
    }
  }

  // Suggest codec changes if specified codec not supported
  const mediaConfig = config.mediaConfiguration
  if (mediaConfig?.audioCodec) {
    if (!profile.audioCodecs.includes(mediaConfig.audioCodec as CodecId)) {
      suggestions.push({
        field: 'mediaConfiguration.audioCodec',
        currentValue: mediaConfig.audioCodec,
        suggestedValue: profile.audioCodecs[0],
        reason: `${profile.displayName} does not support ${mediaConfig.audioCodec}; suggested: ${profile.audioCodecs[0]}`,
        severity: 'error',
      })
    }
  }
  if (mediaConfig?.videoCodec) {
    if (!profile.videoCodecs.includes(mediaConfig.videoCodec as CodecId)) {
      suggestions.push({
        field: 'mediaConfiguration.videoCodec',
        currentValue: mediaConfig.videoCodec,
        suggestedValue: profile.videoCodecs[0] ?? 'none',
        reason: `${profile.displayName} does not support ${mediaConfig.videoCodec}`,
        severity: 'error',
      })
    }
  }

  return suggestions
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

interface FieldValidationResult {
  valid: boolean
  message: string
  suggestion?: PbxConfigSuggestion
}

function validateWsUriForPlatform(
  uri: string | undefined,
  profile: PbxPlatformProfile
): FieldValidationResult {
  if (!uri) {
    return { valid: false, message: 'WebSocket URI is required' }
  }

  const wsResult = validateWebSocketUrl(uri)
  if (!wsResult.valid) {
    return { valid: false, message: `Invalid WebSocket URI: ${wsResult.error}` }
  }

  // Check if URI matches known patterns
  const matchesPattern = profile.wsUriPatterns.some((p) => p.test(uri))
  if (!matchesPattern) {
    return {
      valid: true,
      message: `WebSocket URI does not match typical ${profile.displayName} patterns (port ${profile.defaultPort}). Verify the URI is correct.`,
      suggestion: {
        field: 'uri',
        currentValue: uri,
        suggestedValue: null,
        reason: `Typical ${profile.displayName} WebSocket URIs use port ${profile.defaultPort}`,
        severity: 'info',
      },
    }
  }

  return { valid: true, message: `WebSocket URI matches ${profile.displayName} pattern` }
}

function validateTransport(
  config: Partial<SipClientConfig>,
  profile: PbxPlatformProfile
): FieldValidationResult {
  if (!config.uri) {
    return { valid: false, message: 'Cannot validate transport without URI' }
  }

  const isWss = config.uri.startsWith('wss://')
  const isWs = config.uri.startsWith('ws://')

  if (!isWss && !isWs) {
    return {
      valid: false,
      message: 'VueSIP requires a WebSocket (ws:// or wss://) URI',
      suggestion: {
        field: 'uri',
        currentValue: config.uri,
        suggestedValue: `wss://${config.uri.replace(/^[a-z]+:\/\//, '')}`,
        reason: 'VueSIP uses WebSocket transport for SIP signaling',
        severity: 'error',
      },
    }
  }

  if (isWs && profile.requiresWssForWebRtc) {
    return {
      valid: false,
      message: `${profile.displayName} requires WSS (secure WebSocket) for WebRTC`,
      suggestion: {
        field: 'uri',
        currentValue: config.uri,
        suggestedValue: config.uri.replace('ws://', 'wss://'),
        reason: `${profile.displayName} requires TLS for WebSocket connections with WebRTC`,
        severity: 'error',
      },
    }
  }

  return {
    valid: true,
    message: `Transport (${isWss ? 'WSS' : 'WS'}) is compatible with ${profile.displayName}`,
  }
}

function validateCodecs(
  config: Partial<SipClientConfig>,
  profile: PbxPlatformProfile
): FieldValidationResult {
  const mediaConfig = config.mediaConfiguration
  if (!mediaConfig) {
    return { valid: true, message: 'No media configuration specified; using platform defaults' }
  }

  const issues: string[] = []

  if (mediaConfig.audioCodec && !profile.audioCodecs.includes(mediaConfig.audioCodec as CodecId)) {
    issues.push(
      `Audio codec "${mediaConfig.audioCodec}" not supported by ${profile.displayName}. Supported: ${profile.audioCodecs.join(', ')}`
    )
  }

  if (mediaConfig.videoCodec && !profile.videoCodecs.includes(mediaConfig.videoCodec as CodecId)) {
    issues.push(
      `Video codec "${mediaConfig.videoCodec}" not supported by ${profile.displayName}. Supported: ${profile.videoCodecs.join(', ')}`
    )
  }

  if (issues.length > 0) {
    return { valid: false, message: issues.join('; ') }
  }

  return { valid: true, message: 'Configured codecs are supported by ' + profile.displayName }
}

function validateRegistration(
  config: Partial<SipClientConfig>,
  profile: PbxPlatformProfile
): FieldValidationResult {
  const regOptions = config.registrationOptions
  if (!regOptions) {
    return { valid: true, message: 'No registration options specified; using defaults' }
  }

  const issues: string[] = []

  if (regOptions.expires !== undefined) {
    if (regOptions.expires < profile.minRegistrationExpires) {
      issues.push(
        `Registration expires (${regOptions.expires}s) is below ${profile.displayName} minimum (${profile.minRegistrationExpires}s)`
      )
    }
    if (regOptions.expires > profile.maxRegistrationExpires) {
      issues.push(
        `Registration expires (${regOptions.expires}s) exceeds ${profile.displayName} maximum (${profile.maxRegistrationExpires}s)`
      )
    }
  }

  if (issues.length > 0) {
    return { valid: false, message: issues.join('; ') }
  }

  return { valid: true, message: `Registration settings compatible with ${profile.displayName}` }
}

function validateSessionOptions(
  config: Partial<SipClientConfig>,
  profile: PbxPlatformProfile
): FieldValidationResult {
  const sessionOptions = config.sessionOptions
  if (!sessionOptions) {
    return { valid: true, message: 'No session options specified; using defaults' }
  }

  if (sessionOptions.sessionTimers && !profile.supportsSessionTimers) {
    return {
      valid: false,
      message: `${profile.displayName} does not reliably support SIP session timers`,
    }
  }

  return { valid: true, message: `Session options compatible with ${profile.displayName}` }
}

function validateWebRtc(
  _config: Partial<SipClientConfig>,
  profile: PbxPlatformProfile
): FieldValidationResult {
  if (profile.webRtcCapability === 'restricted') {
    return {
      valid: false,
      message: `${profile.displayName} has restricted WebRTC support. Native WebRTC may not work.`,
    }
  }

  if (profile.webRtcCapability === 'missing') {
    return {
      valid: false,
      message: `${profile.displayName} does not support WebRTC`,
    }
  }

  if (profile.webRtcCapability === 'limited') {
    return {
      valid: true,
      message: `${profile.displayName} has limited WebRTC support. Some features may not work.`,
    }
  }

  return { valid: true, message: `WebRTC is supported by ${profile.displayName}` }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }
  return current
}
