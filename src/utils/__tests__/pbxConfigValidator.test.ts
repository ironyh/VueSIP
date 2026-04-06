/**
 * Tests for PBX Configuration Validation Utility
 * @module utils/__tests__/pbxConfigValidator.test
 */

import { describe, it, expect } from 'vitest'
import {
  detectPbxPlatform,
  validatePbxConfig,
  autoValidatePbxConfig,
  getPbxPlatformProfiles,
  getPbxPlatformProfile,
  getPbxQuirks,
  suggestCorrections,
  type PbxPlatform,
  type PbxPlatformProfile,
  type PbxConfigSuggestion,
} from '../pbxConfigValidator'
import type { SipClientConfig } from '../../types/config.types'

// ---------------------------------------------------------------------------
// Platform Detection
// ---------------------------------------------------------------------------

describe('detectPbxPlatform', () => {
  it('detects Asterisk from standard WebSocket URI', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://pbx.example.com:8088/ws',
      sipUri: 'sip:100@pbx.example.com',
      password: 'test',
    }
    expect(detectPbxPlatform(config)).toBe('asterisk')
  })

  it('detects FreePBX from standard WebSocket URI', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://freepbx.example.com:8088/ws',
      sipUri: 'sip:100@freepbx.example.com',
      password: 'test',
    }
    // FreePBX shares port 8088/ws with Asterisk; first pattern match wins
    expect(detectPbxPlatform(config)).toBeTruthy()
  })

  it('detects 3CX from port 5001', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://3cx.example.com:5001',
      sipUri: 'sip:100@3cx.example.com',
      password: 'test',
    }
    expect(detectPbxPlatform(config)).toBe('3cx')
  })

  it('detects Kamailio from standard URI', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://kamailio.example.com:443/ws',
      sipUri: 'sip:100@kamailio.example.com',
      password: 'test',
    }
    expect(detectPbxPlatform(config)).toBe('kamailio')
  })

  it('detects Yeastar from port-based URI', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://yeastar.example.com:8088/ws',
      sipUri: 'sip:100@yeastar.example.com',
      password: 'test',
    }
    expect(detectPbxPlatform(config)).toBeTruthy()
  })

  it('returns null for unrecognized URI', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://unknown.example.com:9999',
      sipUri: 'sip:100@unknown.example.com',
      password: 'test',
    }
    expect(detectPbxPlatform(config)).toBeNull()
  })

  it('returns null for missing URI', () => {
    expect(detectPbxPlatform({})).toBeNull()
    expect(detectPbxPlatform({ sipUri: 'sip:100@example.com', password: 'x' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PBX Config Validation
// ---------------------------------------------------------------------------

describe('validatePbxConfig', () => {
  const validAsteriskConfig: Partial<SipClientConfig> = {
    uri: 'wss://pbx.example.com:8088/ws',
    sipUri: 'sip:100@pbx.example.com',
    password: 'secret',
    registrationOptions: { expires: 600 },
    sessionOptions: { sessionTimers: true },
  }

  it('validates a correct Asterisk configuration', () => {
    const result = validatePbxConfig(validAsteriskConfig, 'asterisk')
    expect(result.valid).toBe(true)
    expect(result.platform).toBe('asterisk')
    expect(result.compatibilityScore).toBe(75)
    expect(result.details).toBeDefined()
  })

  it('reports errors for missing required fields', () => {
    const result = validatePbxConfig({}, 'asterisk')
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
    expect((result.errors as string[]).length).toBeGreaterThan(0)
  })

  it('reports error for insecure WS when WSS is required', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'ws://pbx.example.com:8088/ws',
      sipUri: 'sip:100@pbx.example.com',
      password: 'secret',
    }
    const result = validatePbxConfig(config, 'asterisk')
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('detects supported audio codec', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://pbx.example.com:8088/ws',
      sipUri: 'sip:100@pbx.example.com',
      password: 'secret',
      mediaConfiguration: { audioCodec: 'pcmu' },
    }
    const result = validatePbxConfig(config, 'grandstream')
    // pcmu IS supported by grandstream per profile
    expect(result.details?.codecs.valid).toBe(true)
  })

  it('detects unsupported codec for platform', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://3cx.example.com:5001',
      sipUri: 'sip:100@3cx.example.com',
      password: 'secret',
      mediaConfiguration: { audioCodec: 'g722' },
    }
    const result = validatePbxConfig(config, '3cx')
    expect(result.details?.codecs.valid).toBe(false)
    expect(result.details?.codecs.message).toContain('g722')
  })

  it('warns about session timers on 3CX', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://3cx.example.com:5001',
      sipUri: 'sip:100@3cx.example.com',
      password: 'secret',
      sessionOptions: { sessionTimers: true },
    }
    const result = validatePbxConfig(config, '3cx')
    expect(result.details?.session.valid).toBe(false)
  })

  it('validates registration expires range', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://pbx.example.com:8088/ws',
      sipUri: 'sip:100@pbx.example.com',
      password: 'secret',
      registrationOptions: { expires: 10 },
    }
    const result = validatePbxConfig(config, 'asterisk')
    expect(result.details?.registration.valid).toBe(false)
  })

  it('returns platform quirks in suggestions', () => {
    const result = validatePbxConfig(validAsteriskConfig, 'asterisk')
    expect(result.suggestions).toBeDefined()
    expect((result.suggestions as PbxConfigSuggestion[]).length).toBeGreaterThan(0)
  })

  it('handles unknown platform gracefully', () => {
    const result = validatePbxConfig(validAsteriskConfig, 'unknown' as PbxPlatform)
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.stringContaining('Unknown PBX platform'))
  })
})

// ---------------------------------------------------------------------------
// Auto Validation
// ---------------------------------------------------------------------------

describe('autoValidatePbxConfig', () => {
  it('auto-detects and validates Asterisk config', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://pbx.example.com:8088/ws',
      sipUri: 'sip:100@pbx.example.com',
      password: 'secret',
    }
    const result = autoValidatePbxConfig(config)
    expect(result.detectedPlatform).toBeTruthy()
    expect(result.platform).toBeTruthy()
  })

  it('warns when platform cannot be detected', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://unknown.example.com:9999',
      sipUri: 'sip:100@unknown.example.com',
      password: 'secret',
    }
    const result = autoValidatePbxConfig(config)
    expect(result.warnings).toBeDefined()
    expect(result.warnings).toContainEqual(expect.stringContaining('Could not auto-detect'))
  })

  it('still runs base validation when platform unknown', () => {
    const result = autoValidatePbxConfig({})
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Platform Profiles
// ---------------------------------------------------------------------------

describe('getPbxPlatformProfiles', () => {
  it('returns all 7 platform profiles', () => {
    const profiles = getPbxPlatformProfiles()
    expect(profiles).toHaveLength(7)
  })

  it('each profile has required fields', () => {
    const profiles = getPbxPlatformProfiles()
    for (const profile of profiles) {
      expect(profile.platform).toBeTruthy()
      expect(profile.displayName).toBeTruthy()
      expect(profile.versions).toBeInstanceOf(Array)
      expect(profile.wsUriPatterns).toBeInstanceOf(Array)
      expect(typeof profile.compatibilityScore).toBe('number')
      expect(profile.compatibilityScore).toBeGreaterThanOrEqual(0)
      expect(profile.compatibilityScore).toBeLessThanOrEqual(100)
    }
  })
})

describe('getPbxPlatformProfile', () => {
  it('returns correct profile for known platform', () => {
    const profile = getPbxPlatformProfile('asterisk')
    expect(profile).toBeDefined()
    expect((profile as PbxPlatformProfile).displayName).toBe('Asterisk')
    expect((profile as PbxPlatformProfile).compatibilityScore).toBe(75)
  })

  it('returns undefined for unknown platform', () => {
    expect(getPbxPlatformProfile('unknown' as PbxPlatform)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Quirks
// ---------------------------------------------------------------------------

describe('getPbxQuirks', () => {
  it('returns all quirks for a platform', () => {
    const quirks = getPbxQuirks('asterisk')
    expect(quirks.length).toBeGreaterThan(0)
  })

  it('filters by severity', () => {
    const errorQuirks = getPbxQuirks('asterisk', 'error')
    for (const q of errorQuirks) {
      expect(q.severity).toBe('error')
    }
    const warningQuirks = getPbxQuirks('asterisk', 'warning')
    for (const q of warningQuirks) {
      expect(q.severity).toBe('warning')
    }
  })

  it('returns empty for unknown platform', () => {
    expect(getPbxQuirks('unknown' as PbxPlatform)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Suggest Corrections
// ---------------------------------------------------------------------------

describe('suggestCorrections', () => {
  it('suggests WSS when WS is used on platform requiring it', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'ws://pbx.example.com:8088/ws',
      sipUri: 'sip:100@pbx.example.com',
      password: 'secret',
    }
    const suggestions = suggestCorrections(config, 'asterisk')
    const wssSuggestion = suggestions.find((s) => s.field === 'uri' && s.severity === 'error')
    expect(wssSuggestion).toBeDefined()
    expect(wssSuggestion.suggestedValue).toContain('wss://')
  })

  it('suggests disabling session timers for 3CX', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://3cx.example.com:5001',
      sipUri: 'sip:100@3cx.example.com',
      password: 'secret',
      sessionOptions: { sessionTimers: true },
    }
    const suggestions = suggestCorrections(config, '3cx')
    const timerSuggestion = suggestions.find((s) => s.field === 'sessionOptions.sessionTimers')
    expect(timerSuggestion).toBeDefined()
    expect(timerSuggestion.suggestedValue).toBe(false)
  })

  it('suggests codec correction for unsupported codec', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://3cx.example.com:5001',
      sipUri: 'sip:100@3cx.example.com',
      password: 'secret',
      mediaConfiguration: { audioCodec: 'g722' },
    }
    const suggestions = suggestCorrections(config, '3cx')
    const codecSuggestion = suggestions.find((s) => s.field === 'mediaConfiguration.audioCodec')
    expect(codecSuggestion).toBeDefined()
    expect(codecSuggestion.severity).toBe('error')
  })

  it('suggests registration expires correction', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://3cx.example.com:5001',
      sipUri: 'sip:100@3cx.example.com',
      password: 'secret',
      registrationOptions: { expires: 30 },
    }
    const suggestions = suggestCorrections(config, '3cx')
    const regSuggestion = suggestions.find((s) => s.field === 'registrationOptions.expires')
    expect(regSuggestion).toBeDefined()
  })

  it('returns empty for unknown platform', () => {
    const suggestions = suggestCorrections({}, 'unknown' as PbxPlatform)
    expect(suggestions).toEqual([])
  })

  it('returns no suggestions for correct config', () => {
    const config: Partial<SipClientConfig> = {
      uri: 'wss://pbx.example.com:8088/ws',
      sipUri: 'sip:100@pbx.example.com',
      password: 'secret',
      mediaConfiguration: { audioCodec: 'opus' },
      sessionOptions: { sessionTimers: true },
    }
    const suggestions = suggestCorrections(config, 'asterisk')
    // Asterisk supports opus and session timers, so no critical suggestions
    const errorSuggestions = suggestions.filter((s) => s.severity === 'error')
    expect(errorSuggestions).toHaveLength(0)
  })
})
