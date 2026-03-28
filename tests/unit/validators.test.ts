/**
 * Unit tests for validators
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
} from '../../src/utils/validators'

describe('validators', () => {
  describe('validateSipUri', () => {
    it('should validate correct SIP URI', () => {
      const result = validateSipUri('sip:alice@example.com')
      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
      expect(result.normalized).toBe('sip:alice@example.com')
    })

    it('should validate correct SIPS URI', () => {
      const result = validateSipUri('sips:bob@example.com')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sips:bob@example.com')
    })

    it('should validate SIP URI with port', () => {
      const result = validateSipUri('sip:alice@example.com:5060')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sip:alice@example.com:5060')
    })

    it('should normalize domain to lowercase', () => {
      const result = validateSipUri('sip:alice@EXAMPLE.COM')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sip:alice@example.com')
    })

    it('should reject empty string', () => {
      const result = validateSipUri('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('non-empty string')
    })

    it('should reject non-string input', () => {
      // @ts-expect-error - Testing invalid input
      const result = validateSipUri(null)
      expect(result.valid).toBe(false)
    })

    it('should reject invalid format', () => {
      const result = validateSipUri('alice@example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid SIP URI format')
    })

    it('should reject URI without user', () => {
      const result = validateSipUri('sip:@example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid SIP URI format')
    })

    it('should reject URI without domain', () => {
      const result = validateSipUri('sip:alice@')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('domain')
    })

    it('should reject invalid port', () => {
      const result = validateSipUri('sip:alice@example.com:99999')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('port')
    })

    it('should handle whitespace', () => {
      const result = validateSipUri('  sip:alice@example.com  ')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('sip:alice@example.com')
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate E.164 format', () => {
      const result = validatePhoneNumber('+14155551234')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('+14155551234')
    })

    it('should validate UK number', () => {
      const result = validatePhoneNumber('+442071234567')
      expect(result.valid).toBe(true)
    })

    it('should reject number without +', () => {
      const result = validatePhoneNumber('14155551234')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('E.164')
    })

    it('should reject number too long', () => {
      const result = validatePhoneNumber('+1234567890123456')
      expect(result.valid).toBe(false)
    })

    it('should reject number with letters', () => {
      const result = validatePhoneNumber('+1415555CALL')
      expect(result.valid).toBe(false)
    })

    it('should reject empty string', () => {
      const result = validatePhoneNumber('')
      expect(result.valid).toBe(false)
    })

    it('should handle whitespace', () => {
      const result = validatePhoneNumber('  +14155551234  ')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('+14155551234')
    })
  })

  describe('validateSipConfig', () => {
    it('should validate complete config', () => {
      const config = {
        uri: 'wss://sip.example.com:7443',
        sipUri: 'sip:alice@example.com',
        password: 'secret123',
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject missing WebSocket URI', () => {
      const config = {
        sipUri: 'sip:alice@example.com',
        password: 'secret123',
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('WebSocket server URI')
    })

    it('should reject missing SIP URI', () => {
      const config = {
        uri: 'wss://sip.example.com:7443',
        password: 'secret123',
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('SIP user URI')
    })

    it('should reject missing password and ha1', () => {
      const config = {
        uri: 'wss://sip.example.com:7443',
        sipUri: 'sip:alice@example.com',
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('password or ha1')
    })

    it('should reject invalid SIP URI', () => {
      const config = {
        uri: 'wss://sip.example.com:7443',
        sipUri: 'invalid-uri',
        password: 'secret123',
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('Invalid SIP URI')
    })

    it('should reject invalid WebSocket URL', () => {
      const config = {
        uri: 'http://example.com',
        sipUri: 'sip:alice@example.com',
        password: 'secret123',
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('WebSocket URL')
    })

    it('should reject invalid registrationOptions.expires', () => {
      const config = {
        uri: 'wss://sip.example.com:7443',
        sipUri: 'sip:alice@example.com',
        password: 'secret123',
        registrationOptions: {
          expires: 30,
        },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('registrationOptions.expires')
    })

    it('should accept valid registrationOptions.expires', () => {
      const config = {
        uri: 'wss://sip.example.com:7443',
        sipUri: 'sip:alice@example.com',
        password: 'secret123',
        registrationOptions: {
          expires: 600,
        },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid rtcConfiguration.iceTransportPolicy', () => {
      const config = {
        uri: 'wss://sip.example.com:7443',
        sipUri: 'sip:alice@example.com',
        password: 'secret123',
        rtcConfiguration: {
          // @ts-expect-error - Testing invalid value
          iceTransportPolicy: 'invalid',
        },
      }
      const result = validateSipConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('iceTransportPolicy')
    })
  })

  describe('validateMediaConfig', () => {
    it('should validate audio as boolean', () => {
      const config = {
        audio: true,
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should validate audio as MediaTrackConstraints', () => {
      const config = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          deviceId: 'default',
        },
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should validate video as boolean', () => {
      const config = {
        video: false,
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should validate video as MediaTrackConstraints', () => {
      const config = {
        video: {
          width: 640,
          height: 480,
          frameRate: 30,
          facingMode: 'user' as const,
          deviceId: 'default',
        },
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should validate top-level echoCancellation', () => {
      const config = {
        audio: true,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should validate audioCodec', () => {
      const config = {
        audio: true,
        audioCodec: 'opus' as const,
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid audioCodec', () => {
      const config = {
        audio: true,
        // @ts-expect-error - Testing invalid value
        audioCodec: 'invalid',
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('audioCodec')
    })

    it('should validate videoCodec', () => {
      const config = {
        video: true,
        videoCodec: 'vp8' as const,
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid videoCodec', () => {
      const config = {
        video: true,
        // @ts-expect-error - Testing invalid value
        videoCodec: 'invalid',
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('videoCodec')
    })

    it('should reject invalid audio type', () => {
      const config = {
        // @ts-expect-error - Testing invalid type
        audio: 'yes',
      }
      const result = validateMediaConfig(config)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.join(' ')).toContain('audio must be')
    })

    it('should accept empty config', () => {
      const result = validateMediaConfig({})
      expect(result.valid).toBe(true)
    })

    it('should reject non-object config', () => {
      // @ts-expect-error - Testing invalid type
      const result = validateMediaConfig('invalid')
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('validateWebSocketUrl', () => {
    it('should validate wss:// URL', () => {
      const result = validateWebSocketUrl('wss://sip.example.com:7443')
      expect(result.valid).toBe(true)
    })

    it('should validate ws:// URL', () => {
      const result = validateWebSocketUrl('ws://localhost:5060')
      expect(result.valid).toBe(true)
    })

    it('should reject http:// URL', () => {
      const result = validateWebSocketUrl('http://example.com')
      expect(result.valid).toBe(false)
    })

    it('should reject URL without protocol', () => {
      const result = validateWebSocketUrl('example.com')
      expect(result.valid).toBe(false)
    })

    it('should reject empty string', () => {
      const result = validateWebSocketUrl('')
      expect(result.valid).toBe(false)
    })

    it('should handle whitespace', () => {
      const result = validateWebSocketUrl('  wss://sip.example.com  ')
      expect(result.valid).toBe(true)
    })

    it('should reject URL without hostname', () => {
      const result = validateWebSocketUrl('wss://')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateDtmfTone', () => {
    it('should validate digits 0-9', () => {
      for (let i = 0; i <= 9; i++) {
        const result = validateDtmfTone(i.toString())
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe(i.toString())
      }
    })

    it('should validate * and #', () => {
      expect(validateDtmfTone('*').valid).toBe(true)
      expect(validateDtmfTone('#').valid).toBe(true)
    })

    it('should validate A-D (case insensitive)', () => {
      const tones = ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd']
      for (const tone of tones) {
        const result = validateDtmfTone(tone)
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe(tone.toUpperCase())
      }
    })

    it('should reject invalid tone', () => {
      const result = validateDtmfTone('E')
      expect(result.valid).toBe(false)
    })

    it('should reject multi-character string', () => {
      const result = validateDtmfTone('12')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('single character')
    })

    it('should reject empty string', () => {
      const result = validateDtmfTone('')
      expect(result.valid).toBe(false)
    })
  })

  describe('validateDtmfSequence', () => {
    it('should validate numeric sequence', () => {
      const result = validateDtmfSequence('1234567890')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('1234567890')
    })

    it('should validate sequence with * and #', () => {
      const result = validateDtmfSequence('123*456#')
      expect(result.valid).toBe(true)
    })

    it('should validate sequence with A-D', () => {
      const result = validateDtmfSequence('1234ABCD')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('1234ABCD')
    })

    it('should normalize lowercase letters', () => {
      const result = validateDtmfSequence('1234abcd')
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe('1234ABCD')
    })

    it('should reject sequence with invalid tone', () => {
      const result = validateDtmfSequence('123E456')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('position 4')
    })

    it('should reject empty sequence', () => {
      const result = validateDtmfSequence('')
      expect(result.valid).toBe(false)
    })
  })
})
