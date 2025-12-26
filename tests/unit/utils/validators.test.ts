/**
 * Validators utility tests
 */

import { describe, it, expect } from 'vitest'
import {
  validateSipUri,
  validatePhoneNumber,
  validateSipConfig,
  validateMediaConfig,
  validateWebSocketUrl,
  validateDtmfTone,
  validateDtmfSequence,
} from '@/utils/validators'
import type { SipClientConfig, MediaConfiguration } from '@/types/config.types'

describe('validators', () => {
  describe('validateSipUri', () => {
    it('should validate correct SIP URIs', () => {
      const valid = [
        'sip:alice@example.com',
        'sip:bob@192.168.1.1',
        'sips:secure@example.com',
        'sip:user@example.com:5060',
        'sips:user@example.com:5061',
      ]

      valid.forEach((uri) => {
        const result = validateSipUri(uri)
        expect(result.valid).toBe(true)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeNull()
        expect(result.normalized).toBeDefined()
      })
    })

    it('should normalize SIP URIs (lowercase domain)', () => {
      const result = validateSipUri('sip:Alice@EXAMPLE.COM')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sip:Alice@example.com')
    })

    it('should normalize SIPS URIs', () => {
      const result = validateSipUri('sips:user@EXAMPLE.COM')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sips:user@example.com')
    })

    it('should handle URIs with ports', () => {
      const result = validateSipUri('sip:user@example.com:5060')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sip:user@example.com:5060')
    })

    it('should trim whitespace', () => {
      const result = validateSipUri('  sip:user@example.com  ')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sip:user@example.com')
    })

    it('should reject non-string inputs', () => {
      const result = validateSipUri(null as any)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject empty strings', () => {
      const result = validateSipUri('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject whitespace-only strings', () => {
      const result = validateSipUri('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('SIP URI cannot be empty')
    })

    it('should reject invalid formats', () => {
      const invalid = [
        'http://example.com',
        'user@example.com',
        'sip:@example.com',
        'sip:user@',
        'sip:user',
        '@example.com',
      ]

      invalid.forEach((uri) => {
        const result = validateSipUri(uri)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    it('should reject URIs without user part', () => {
      const result = validateSipUri('sip:@example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid SIP URI format')
    })

    it('should reject URIs without domain', () => {
      const result = validateSipUri('sip:user@')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid SIP URI format')
    })

    it('should reject invalid port numbers', () => {
      // Port > 65535 should fail
      const result1 = validateSipUri('sip:user@example.com:70000')
      expect(result1.valid).toBe(false)
      expect(result1.error).toContain('Invalid port number')
    })

    it('should accept URIs with ignored invalid port syntax', () => {
      // Non-numeric port is ignored by regex, URI treated as sip:user@example.com
      const result = validateSipUri('sip:user@example.com:abc')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sip:user@example.com')
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate E.164 phone numbers', () => {
      const valid = ['+14155551234', '+442071234567', '+33123456789', '+861234567890']

      valid.forEach((number) => {
        const result = validatePhoneNumber(number)
        expect(result.valid).toBe(true)
        expect(result.error).toBeNull()
        expect(result.normalized).toBe(number)
      })
    })

    it('should trim whitespace', () => {
      const result = validatePhoneNumber('  +14155551234  ')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('+14155551234')
    })

    it('should reject non-string inputs', () => {
      const result = validatePhoneNumber(null as any)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject empty strings', () => {
      const result = validatePhoneNumber('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject whitespace-only strings', () => {
      const result = validatePhoneNumber('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Phone number cannot be empty')
    })

    it('should reject non-E.164 formats', () => {
      const invalid = [
        '14155551234', // Missing +
        '+0155551234', // Starts with 0 (invalid country code)
        '+1234567890123456', // Too long (16 digits, max is 15)
        '+(415)555-1234', // Invalid characters (parentheses)
        '+1-415-555-1234', // Invalid characters (hyphens)
      ]

      invalid.forEach((number) => {
        const result = validatePhoneNumber(number)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid phone number format')
      })
    })
  })

  describe('validateSipConfig', () => {
    const validConfig: SipClientConfig = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:alice@example.com',
      password: 'secret123',
    }

    it('should validate correct configuration', () => {
      const result = validateSipConfig(validConfig)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should accept configuration with ha1 instead of password', () => {
      const config: Partial<SipClientConfig> = {
        ...validConfig,
        password: undefined,
        ha1: 'hash123',
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject non-object input', () => {
      const result = validateSipConfig(null as any)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Configuration must be an object')
    })

    it('should require uri field', () => {
      const config = { ...validConfig, uri: undefined }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('WebSocket server URI (uri) is required')
    })

    it('should require sipUri field', () => {
      const config = { ...validConfig, sipUri: undefined }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('SIP user URI (sipUri) is required')
    })

    it('should require password or ha1', () => {
      const config: Partial<SipClientConfig> = {
        uri: validConfig.uri,
        sipUri: validConfig.sipUri,
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Either password or ha1 is required for authentication')
    })

    it('should reject invalid WebSocket URL', () => {
      const config = { ...validConfig, uri: 'http://example.com' }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('Invalid WebSocket URL')
    })

    it('should reject invalid SIP URI', () => {
      const config = { ...validConfig, sipUri: 'invalid' }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('Invalid SIP URI')
    })

    it('should warn about insecure WebSocket in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const config = { ...validConfig, uri: 'ws://sip.example.com' }
      const result = validateSipConfig(config)

      expect(result.warnings).toBeDefined()
      expect(result.warnings?.[0]).toContain('insecure WebSocket')

      process.env.NODE_ENV = originalEnv
    })

    it('should validate registrationOptions.expires', () => {
      const config: Partial<SipClientConfig> = {
        ...validConfig,
        registrationOptions: { expires: -1 },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('registrationOptions.expires')
    })

    it('should validate registrationOptions.autoRegister', () => {
      const config: Partial<SipClientConfig> = {
        ...validConfig,
        registrationOptions: { autoRegister: 'yes' as any },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('registrationOptions.autoRegister must be a boolean')
    })

    it('should validate sessionOptions.sessionTimers', () => {
      const config: Partial<SipClientConfig> = {
        ...validConfig,
        sessionOptions: { sessionTimers: 'true' as any },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('sessionOptions.sessionTimers must be a boolean')
    })

    it('should validate sessionOptions.callTimeout', () => {
      const config: Partial<SipClientConfig> = {
        ...validConfig,
        sessionOptions: { callTimeout: -1 },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('sessionOptions.callTimeout')
    })

    it('should validate sessionOptions.maxConcurrentCalls', () => {
      const config: Partial<SipClientConfig> = {
        ...validConfig,
        sessionOptions: { maxConcurrentCalls: 0 },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('sessionOptions.maxConcurrentCalls')
    })

    it('should validate rtcConfiguration.iceTransportPolicy', () => {
      const config: Partial<SipClientConfig> = {
        ...validConfig,
        rtcConfiguration: { iceTransportPolicy: 'invalid' as any },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('iceTransportPolicy must be "all" or "relay"')
    })

    it('should allow valid rtcConfiguration.iceTransportPolicy values', () => {
      const configAll: Partial<SipClientConfig> = {
        ...validConfig,
        rtcConfiguration: { iceTransportPolicy: 'all' },
      }
      const configRelay: Partial<SipClientConfig> = {
        ...validConfig,
        rtcConfiguration: { iceTransportPolicy: 'relay' },
      }

      expect(validateSipConfig(configAll).valid).toBe(true)
      expect(validateSipConfig(configRelay).valid).toBe(true)
    })
  })

  describe('validateMediaConfig', () => {
    const validConfig: MediaConfiguration = {
      audio: true,
      video: false,
      echoCancellation: true,
      noiseSuppression: true,
    }

    it('should validate correct media configuration', () => {
      const result = validateMediaConfig(validConfig)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should reject non-object input', () => {
      const result = validateMediaConfig(null as any)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Media configuration must be an object')
    })

    it('should validate audio as boolean', () => {
      const config = { ...validConfig, audio: true }
      expect(validateMediaConfig(config).valid).toBe(true)
    })

    it('should validate audio as MediaTrackConstraints', () => {
      const config = { ...validConfig, audio: { echoCancellation: true } }
      expect(validateMediaConfig(config).valid).toBe(true)
    })

    it('should reject invalid audio type', () => {
      const config = { ...validConfig, audio: 'yes' as any }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('audio must be a boolean or MediaTrackConstraints')
    })

    it('should validate video as boolean', () => {
      const config = { ...validConfig, video: false }
      expect(validateMediaConfig(config).valid).toBe(true)
    })

    it('should validate video as MediaTrackConstraints', () => {
      const config = { ...validConfig, video: { width: 1280, height: 720 } }
      expect(validateMediaConfig(config).valid).toBe(true)
    })

    it('should reject invalid video type', () => {
      const config = { ...validConfig, video: 'no' as any }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('video must be a boolean or MediaTrackConstraints')
    })

    it('should validate boolean properties', () => {
      const boolProps = ['echoCancellation', 'noiseSuppression', 'autoGainControl', 'dataChannel']

      boolProps.forEach((prop) => {
        const config = { ...validConfig, [prop]: 'invalid' as any }
        const result = validateMediaConfig(config)
        expect(result.valid).toBe(false)
        expect(result.errors?.[0]).toContain(`${prop} must be a boolean`)
      })
    })

    it('should validate audioCodec', () => {
      const validCodecs = ['opus', 'pcmu', 'pcma', 'g722']

      validCodecs.forEach((codec) => {
        const config = { ...validConfig, audioCodec: codec as any }
        expect(validateMediaConfig(config).valid).toBe(true)
      })

      const invalidConfig = { ...validConfig, audioCodec: 'invalid' as any }
      const result = validateMediaConfig(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('audioCodec must be one of')
    })

    it('should validate videoCodec', () => {
      const validCodecs = ['vp8', 'vp9', 'h264']

      validCodecs.forEach((codec) => {
        const config = { ...validConfig, videoCodec: codec as any }
        expect(validateMediaConfig(config).valid).toBe(true)
      })

      const invalidConfig = { ...validConfig, videoCodec: 'invalid' as any }
      const result = validateMediaConfig(invalidConfig)
      expect(result.valid).toBe(false)
      expect(result.errors?.[0]).toContain('videoCodec must be one of')
    })
  })

  describe('validateWebSocketUrl', () => {
    it('should validate correct WebSocket URLs', () => {
      const valid = [
        'ws://example.com',
        'wss://example.com',
        'ws://192.168.1.1:5060',
        'wss://sip.example.com:7443',
        'ws://example.com/path',
      ]

      valid.forEach((url) => {
        const result = validateWebSocketUrl(url)
        expect(result.valid).toBe(true)
        expect(result.error).toBeNull()
        expect(result.normalized).toBe(url)
      })
    })

    it('should trim whitespace', () => {
      const result = validateWebSocketUrl('  wss://example.com  ')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('wss://example.com')
    })

    it('should reject non-string inputs', () => {
      const result = validateWebSocketUrl(null as any)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject empty strings', () => {
      const result = validateWebSocketUrl('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject whitespace-only strings', () => {
      const result = validateWebSocketUrl('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('WebSocket URL cannot be empty')
    })

    it('should reject non-WebSocket protocols', () => {
      const invalid = ['http://example.com', 'https://example.com', 'ftp://example.com']

      invalid.forEach((url) => {
        const result = validateWebSocketUrl(url)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid WebSocket URL format')
      })
    })

    it('should reject URLs without hostname', () => {
      const result = validateWebSocketUrl('wss://')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid WebSocket URL format')
    })

    it('should handle URL parsing errors', () => {
      const result = validateWebSocketUrl('wss://[invalid')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid URL structure')
    })
  })

  describe('validateDtmfTone', () => {
    it('should validate single digit tones', () => {
      const valid = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

      valid.forEach((tone) => {
        const result = validateDtmfTone(tone)
        expect(result.valid).toBe(true)
        expect(result.error).toBeNull()
        expect(result.normalized).toBe(tone)
      })
    })

    it('should validate special tones', () => {
      const special = ['*', '#']

      special.forEach((tone) => {
        const result = validateDtmfTone(tone)
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe(tone)
      })
    })

    it('should validate letter tones (A-D)', () => {
      const letters = ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd']

      letters.forEach((tone) => {
        const result = validateDtmfTone(tone)
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe(tone.toUpperCase())
      })
    })

    it('should normalize lowercase to uppercase', () => {
      const result = validateDtmfTone('a')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('A')
    })

    it('should reject non-string inputs', () => {
      const result = validateDtmfTone(null as any)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject multi-character strings', () => {
      const result = validateDtmfTone('12')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a single character')
    })

    it('should reject invalid characters', () => {
      const invalid = ['E', 'F', 'x', '@', ' ']

      invalid.forEach((tone) => {
        const result = validateDtmfTone(tone)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('Invalid DTMF tone')
      })
    })
  })

  describe('validateDtmfSequence', () => {
    it('should validate correct sequences', () => {
      const valid = ['123', '456789', '*#', '1234*#', 'ABCD', '123ABC*#']

      valid.forEach((sequence) => {
        const result = validateDtmfSequence(sequence)
        expect(result.valid).toBe(true)
        expect(result.error).toBeNull()
        expect(result.normalized).toBeDefined()
      })
    })

    it('should normalize lowercase letters to uppercase', () => {
      const result = validateDtmfSequence('abc123')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('ABC123')
    })

    it('should reject non-string inputs', () => {
      const result = validateDtmfSequence(null as any)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject empty strings', () => {
      const result = validateDtmfSequence('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('must be a non-empty string')
    })

    it('should reject sequences with invalid characters', () => {
      const result = validateDtmfSequence('123X456')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid tone at position 4')
    })

    it('should identify position of invalid character', () => {
      const result = validateDtmfSequence('12@34')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('position 3')
    })
  })

  describe('edge cases and validation combinations', () => {
    it('should handle multiple validation errors in SIP config', () => {
      const config: Partial<SipClientConfig> = {
        uri: 'invalid',
        sipUri: 'invalid',
      }
      const result = validateSipConfig(config)

      expect(result.valid).toBe(false)
      expect(result.errors?.length).toBeGreaterThan(1)
    })

    it('should provide warnings without invalidating config', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const config: SipClientConfig = {
        uri: 'ws://sip.example.com',
        sipUri: 'sip:user@example.com',
        password: 'secret',
      }
      const result = validateSipConfig(config)

      expect(result.valid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings?.length).toBeGreaterThan(0)

      process.env.NODE_ENV = originalEnv
    })
  })
})
