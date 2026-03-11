/**
 * Unit tests for VueSIP constants
 */
import { describe, it, expect } from 'vitest'
import {
  VERSION,
  USER_AGENT,
  DEFAULT_REGISTER_EXPIRES,
  DEFAULT_SESSION_TIMERS,
  DEFAULT_NO_ANSWER_TIMEOUT,
  DEFAULT_PING_INTERVAL,
  DEFAULT_MAX_FORWARDS,
  DEFAULT_AUDIO_CONSTRAINTS,
  DEFAULT_VIDEO_CONSTRAINTS,
  DEFAULT_MEDIA_CONSTRAINTS,
  RECONNECTION_DELAYS,
  MAX_RETRY_ATTEMPTS,
  ICE_GATHERING_TIMEOUT,
  DEFAULT_DTMF_DURATION,
  DEFAULT_DTMF_INTER_TONE_GAP,
  STATS_COLLECTION_INTERVAL,
  AUDIO_LEVEL_INTERVAL,
  AUDIO_CODECS,
  VIDEO_CODECS,
  SIP_STATUS_CODES,
  EVENTS,
  STORAGE_PREFIX,
  STORAGE_VERSION,
  STORAGE_KEYS,
  PERFORMANCE,
  VALIDATION,
  CALL_SESSION,
  SIP_URI_REGEX,
  E164_PHONE_REGEX,
  WEBSOCKET_URL_REGEX,
} from '../constants'

describe('constants', () => {
  describe('version', () => {
    it('should have correct VERSION', () => {
      expect(VERSION).toBe('1.1.0')
    })

    it('should have USER_AGENT with version', () => {
      expect(USER_AGENT).toBe('VueSip/1.1.0')
    })
  })

  describe('SIP configuration', () => {
    it('should have valid DEFAULT_REGISTER_EXPIRES', () => {
      expect(DEFAULT_REGISTER_EXPIRES).toBe(600)
    })

    it('should have valid DEFAULT_SESSION_TIMERS', () => {
      expect(DEFAULT_SESSION_TIMERS).toBe(90)
    })

    it('should have valid DEFAULT_NO_ANSWER_TIMEOUT', () => {
      expect(DEFAULT_NO_ANSWER_TIMEOUT).toBe(60)
    })

    it('should have valid DEFAULT_PING_INTERVAL', () => {
      expect(DEFAULT_PING_INTERVAL).toBe(30000)
    })

    it('should have valid DEFAULT_MAX_FORWARDS', () => {
      expect(DEFAULT_MAX_FORWARDS).toBe(70)
    })
  })

  describe('media constraints', () => {
    it('should have DEFAULT_AUDIO_CONSTRAINTS', () => {
      expect(DEFAULT_AUDIO_CONSTRAINTS).toBeDefined()
      expect(DEFAULT_AUDIO_CONSTRAINTS.echoCancellation).toBe(true)
      expect(DEFAULT_AUDIO_CONSTRAINTS.noiseSuppression).toBe(true)
    })

    it('should have DEFAULT_VIDEO_CONSTRAINTS', () => {
      expect(DEFAULT_VIDEO_CONSTRAINTS).toBeDefined()
      expect(DEFAULT_VIDEO_CONSTRAINTS.width).toBeDefined()
      expect(DEFAULT_VIDEO_CONSTRAINTS.height).toBeDefined()
    })

    it('should have DEFAULT_MEDIA_CONSTRAINTS with audio', () => {
      expect(DEFAULT_MEDIA_CONSTRAINTS).toBeDefined()
      expect(DEFAULT_MEDIA_CONSTRAINTS.audio).toBeDefined()
    })
  })

  describe('reconnection', () => {
    it('should have RECONNECTION_DELAYS array', () => {
      expect(RECONNECTION_DELAYS).toHaveLength(5)
      expect(RECONNECTION_DELAYS[0]).toBe(2000)
      expect(RECONNECTION_DELAYS[4]).toBe(32000)
    })

    it('should have MAX_RETRY_ATTEMPTS', () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(5)
    })
  })

  describe('timeouts', () => {
    it('should have ICE_GATHERING_TIMEOUT', () => {
      expect(ICE_GATHERING_TIMEOUT).toBe(5000)
    })

    it('should have DEFAULT_DTMF_DURATION', () => {
      expect(DEFAULT_DTMF_DURATION).toBe(100)
    })

    it('should have DEFAULT_DTMF_INTER_TONE_GAP', () => {
      expect(DEFAULT_DTMF_INTER_TONE_GAP).toBe(70)
    })

    it('should have STATS_COLLECTION_INTERVAL', () => {
      expect(STATS_COLLECTION_INTERVAL).toBe(1000)
    })

    it('should have AUDIO_LEVEL_INTERVAL', () => {
      expect(AUDIO_LEVEL_INTERVAL).toBe(100)
    })
  })

  describe('codecs', () => {
    it('should have AUDIO_CODECS array', () => {
      expect(AUDIO_CODECS).toBeInstanceOf(Array)
      expect(AUDIO_CODECS.length).toBeGreaterThan(0)
    })

    it('should have VIDEO_CODECS array', () => {
      expect(VIDEO_CODECS).toBeInstanceOf(Array)
    })
  })

  describe('SIP status codes', () => {
    it('should have SIP_STATUS_CODES object', () => {
      expect(SIP_STATUS_CODES).toBeDefined()
      expect(SIP_STATUS_CODES.TRYING).toBe(100)
      expect(SIP_STATUS_CODES.RINGING).toBe(180)
      expect(SIP_STATUS_CODES.OK).toBe(200)
    })
  })

  describe('events', () => {
    it('should have EVENTS object', () => {
      expect(EVENTS).toBeDefined()
      expect(typeof EVENTS).toBe('object')
      expect(EVENTS.CONNECTION_CONNECTED).toBeDefined()
      expect(EVENTS.REGISTRATION_REGISTERED).toBeDefined()
    })
  })

  describe('storage', () => {
    it('should have STORAGE_PREFIX', () => {
      expect(STORAGE_PREFIX).toBe('vuesip:')
    })

    it('should have STORAGE_VERSION', () => {
      expect(STORAGE_VERSION).toBe('v1')
    })

    it('should have STORAGE_KEYS object', () => {
      expect(STORAGE_KEYS).toBeDefined()
      expect(STORAGE_KEYS.CONFIG).toBeDefined()
    })
  })

  describe('performance', () => {
    it('should have PERFORMANCE object', () => {
      expect(PERFORMANCE).toBeDefined()
      expect(PERFORMANCE.MAX_BUNDLE_SIZE).toBeDefined()
    })
  })

  describe('validation', () => {
    it('should have VALIDATION object', () => {
      expect(VALIDATION).toBeDefined()
      expect(VALIDATION.MAX_PORT_NUMBER).toBeDefined()
    })
  })

  describe('call session', () => {
    it('should have CALL_SESSION object', () => {
      expect(CALL_SESSION).toBeDefined()
      expect(CALL_SESSION.HOLD_TIMEOUT_MS).toBeDefined()
    })
  })

  describe('regex patterns', () => {
    it('should validate SIP_URI_REGEX', () => {
      expect(SIP_URI_REGEX.test('sip:user@domain.com')).toBe(true)
      expect(SIP_URI_REGEX.test('sips:user@domain.com:5060')).toBe(true)
      expect(SIP_URI_REGEX.test('invalid')).toBe(false)
    })

    it('should validate E164_PHONE_REGEX', () => {
      expect(E164_PHONE_REGEX.test('+46123456789')).toBe(true)
      expect(E164_PHONE_REGEX.test('+1 234 567 8901')).toBe(false)
      expect(E164_PHONE_REGEX.test('1234567890')).toBe(false)
    })

    it('should validate WEBSOCKET_URL_REGEX', () => {
      expect(WEBSOCKET_URL_REGEX.test('wss://example.com/ws')).toBe(true)
      expect(WEBSOCKET_URL_REGEX.test('ws://localhost:8080')).toBe(true)
      expect(WEBSOCKET_URL_REGEX.test('http://example.com')).toBe(false)
    })
  })
})
