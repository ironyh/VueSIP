/**
 * Unit tests for VueSIP constants
 * @module utils/constants.test
 */

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
  NETWORK_QUALITY_LEVELS,
  NETWORK_QUALITY_THRESHOLDS,
  PERFORMANCE,
  VALIDATION,
  CALL_SESSION,
  SIP_URI_REGEX,
  E164_PHONE_REGEX,
  WEBSOCKET_URL_REGEX,
  DTMF_TONES,
  LOG_LEVELS,
  CALL_STATES,
  CONNECTION_STATES,
  REGISTRATION_STATES,
} from '@/utils/constants'

describe('constants', () => {
  describe('VERSION', () => {
    it('should have a valid version string', () => {
      expect(VERSION).toBe('1.1.0')
    })
  })

  describe('USER_AGENT', () => {
    it('should format user agent with version', () => {
      expect(USER_AGENT).toBe(`VueSip/${VERSION}`)
    })
  })

  describe('SIP Configuration Defaults', () => {
    it('should have reasonable register expires', () => {
      expect(DEFAULT_REGISTER_EXPIRES).toBeGreaterThanOrEqual(60)
      expect(DEFAULT_REGISTER_EXPIRES).toBeLessThanOrEqual(3600)
    })

    it('should have valid session timers', () => {
      expect(DEFAULT_SESSION_TIMERS).toBeGreaterThan(0)
    })

    it('should have valid no answer timeout', () => {
      expect(DEFAULT_NO_ANSWER_TIMEOUT).toBeGreaterThan(0)
    })

    it('should have valid ping interval', () => {
      expect(DEFAULT_PING_INTERVAL).toBeGreaterThan(0)
      expect(DEFAULT_PING_INTERVAL).toBe(30000)
    })

    it('should have valid max forwards', () => {
      expect(DEFAULT_MAX_FORWARDS).toBeGreaterThan(0)
      expect(DEFAULT_MAX_FORWARDS).toBeLessThan(100)
    })
  })

  describe('Media Constraints', () => {
    it('should have default audio constraints', () => {
      expect(DEFAULT_AUDIO_CONSTRAINTS).toHaveProperty('echoCancellation')
      expect(DEFAULT_AUDIO_CONSTRAINTS).toHaveProperty('noiseSuppression')
      expect(DEFAULT_AUDIO_CONSTRAINTS).toHaveProperty('autoGainControl')
      expect(DEFAULT_AUDIO_CONSTRAINTS.sampleRate).toBe(48000)
      expect(DEFAULT_AUDIO_CONSTRAINTS.channelCount).toBe(1)
    })

    it('should have default video constraints', () => {
      expect(DEFAULT_VIDEO_CONSTRAINTS).toHaveProperty('width')
      expect(DEFAULT_VIDEO_CONSTRAINTS).toHaveProperty('height')
      expect(DEFAULT_VIDEO_CONSTRAINTS).toHaveProperty('frameRate')
    })

    it('should have combined media constraints', () => {
      expect(DEFAULT_MEDIA_CONSTRAINTS.audio).toBe(DEFAULT_AUDIO_CONSTRAINTS)
      expect(DEFAULT_MEDIA_CONSTRAINTS.video).toBe(false)
    })
  })

  describe('Reconnection', () => {
    it('should have exponential backoff delays', () => {
      expect(RECONNECTION_DELAYS.length).toBe(5)
      expect(RECONNECTION_DELAYS[0]).toBeLessThan(RECONNECTION_DELAYS[1])
      expect(RECONNECTION_DELAYS[1]).toBeLessThan(RECONNECTION_DELAYS[2])
    })

    it('should have reasonable retry attempts', () => {
      expect(MAX_RETRY_ATTEMPTS).toBeGreaterThan(0)
      expect(MAX_RETRY_ATTEMPTS).toBe(5)
    })
  })

  describe('Timeouts', () => {
    it('should have ICE gathering timeout', () => {
      expect(ICE_GATHERING_TIMEOUT).toBe(5000)
    })

    it('should have DTMF duration', () => {
      expect(DEFAULT_DTMF_DURATION).toBe(100)
    })

    it('should have inter-tone gap', () => {
      expect(DEFAULT_DTMF_INTER_TONE_GAP).toBe(70)
    })

    it('should have stats collection interval', () => {
      expect(STATS_COLLECTION_INTERVAL).toBe(1000)
    })

    it('should have audio level interval', () => {
      expect(AUDIO_LEVEL_INTERVAL).toBe(100)
    })
  })

  describe('Codecs', () => {
    it('should have audio codecs in preference order', () => {
      expect(AUDIO_CODECS).toContain('opus')
      expect(AUDIO_CODECS).toContain('PCMU')
    })

    it('should have video codecs', () => {
      expect(VIDEO_CODECS).toContain('VP8')
      expect(VIDEO_CODECS).toContain('H264')
    })
  })

  describe('SIP Status Codes', () => {
    it('should have provisional 1xx codes', () => {
      expect(SIP_STATUS_CODES.TRYING).toBe(100)
      expect(SIP_STATUS_CODES.RINGING).toBe(180)
      expect(SIP_STATUS_CODES.SESSION_PROGRESS).toBe(183)
    })

    it('should have success 2xx codes', () => {
      expect(SIP_STATUS_CODES.OK).toBe(200)
      expect(SIP_STATUS_CODES.ACCEPTED).toBe(202)
    })

    it('should have client error 4xx codes', () => {
      expect(SIP_STATUS_CODES.UNAUTHORIZED).toBe(401)
      expect(SIP_STATUS_CODES.FORBIDDEN).toBe(403)
      expect(SIP_STATUS_CODES.NOT_FOUND).toBe(404)
      expect(SIP_STATUS_CODES.BUSY_HERE).toBe(486)
    })

    it('should have server error 5xx codes', () => {
      expect(SIP_STATUS_CODES.SERVER_INTERNAL_ERROR).toBe(500)
      expect(SIP_STATUS_CODES.NOT_IMPLEMENTED).toBe(501)
      expect(SIP_STATUS_CODES.SERVICE_UNAVAILABLE).toBe(503)
    })

    it('should have global failure 6xx codes', () => {
      expect(SIP_STATUS_CODES.BUSY_EVERYWHERE).toBe(600)
      expect(SIP_STATUS_CODES.DECLINE).toBe(603)
    })
  })

  describe('Events', () => {
    it('should have connection events', () => {
      expect(EVENTS.CONNECTION_CONNECTING).toBe('connection:connecting')
      expect(EVENTS.CONNECTION_CONNECTED).toBe('connection:connected')
      expect(EVENTS.CONNECTION_DISCONNECTED).toBe('connection:disconnected')
    })

    it('should have registration events', () => {
      expect(EVENTS.REGISTRATION_REGISTERED).toBe('registration:registered')
      expect(EVENTS.REGISTRATION_FAILED).toBe('registration:failed')
    })

    it('should have call events', () => {
      expect(EVENTS.CALL_INCOMING).toBe('call:incoming')
      expect(EVENTS.CALL_OUTGOING).toBe('call:outgoing')
      expect(EVENTS.CALL_TERMINATED).toBe('call:terminated')
    })

    it('should have media events', () => {
      expect(EVENTS.MEDIA_DEVICE_CHANGED).toBe('media:deviceChanged')
      expect(EVENTS.MEDIA_STREAM_ADDED).toBe('media:streamAdded')
    })
  })

  describe('Storage', () => {
    it('should have storage prefix', () => {
      expect(STORAGE_PREFIX).toBe('vuesip:')
    })

    it('should have storage version', () => {
      expect(STORAGE_VERSION).toBe('v1')
    })

    it('should have storage keys with prefix', () => {
      expect(STORAGE_KEYS.CONFIG).toContain(STORAGE_PREFIX)
      expect(STORAGE_KEYS.CREDENTIALS).toContain(STORAGE_PREFIX)
      expect(STORAGE_KEYS.DEVICE_PREFERENCES).toContain(STORAGE_PREFIX)
      expect(STORAGE_KEYS.USER_PREFERENCES).toContain(STORAGE_PREFIX)
      expect(STORAGE_KEYS.CALL_HISTORY).toContain(STORAGE_PREFIX)
    })
  })

  describe('Performance', () => {
    it('should have reasonable bundle size limits', () => {
      expect(PERFORMANCE.MAX_BUNDLE_SIZE).toBeGreaterThan(0)
      expect(PERFORMANCE.MAX_BUNDLE_SIZE_GZIPPED).toBeGreaterThan(0)
      expect(PERFORMANCE.MAX_BUNDLE_SIZE).toBeGreaterThan(PERFORMANCE.MAX_BUNDLE_SIZE_GZIPPED)
    })

    it('should have call setup target', () => {
      expect(PERFORMANCE.TARGET_CALL_SETUP_TIME).toBe(2000)
    })

    it('should have reasonable max concurrent calls', () => {
      expect(PERFORMANCE.DEFAULT_MAX_CONCURRENT_CALLS).toBeGreaterThan(0)
    })
  })

  describe('Validation', () => {
    it('should have valid port range', () => {
      expect(VALIDATION.MIN_PORT_NUMBER).toBe(1)
      expect(VALIDATION.MAX_PORT_NUMBER).toBe(65535)
      expect(VALIDATION.MIN_PORT_NUMBER).toBeLessThan(VALIDATION.MAX_PORT_NUMBER)
    })

    it('should have reasonable registration expires', () => {
      expect(VALIDATION.MIN_REGISTRATION_EXPIRES).toBe(60)
    })
  })

  describe('Call Session', () => {
    it('should have hold timeout', () => {
      expect(CALL_SESSION.HOLD_TIMEOUT_MS).toBe(5000)
    })

    it('should have encryption iterations', () => {
      expect(CALL_SESSION.ENCRYPTION_ITERATIONS_PRODUCTION).toBeGreaterThan(
        CALL_SESSION.ENCRYPTION_ITERATIONS_TEST
      )
    })
  })

  describe('Regular Expressions', () => {
    it('should validate SIP URIs', () => {
      expect('sip:user@example.com').toMatch(SIP_URI_REGEX)
      expect('sips:user@example.com:5060').toMatch(SIP_URI_REGEX)
      expect('tel:+1234567890').not.toMatch(SIP_URI_REGEX)
    })

    it('should validate E.164 phone numbers', () => {
      expect('+1234567890').toMatch(E164_PHONE_REGEX)
      expect('+441234567890').toMatch(E164_PHONE_REGEX)
      expect('1234567890').not.toMatch(E164_PHONE_REGEX)
    })

    it('should validate WebSocket URLs', () => {
      expect('wss://example.com/ws').toMatch(WEBSOCKET_URL_REGEX)
      expect('ws://localhost:8080').toMatch(WEBSOCKET_URL_REGEX)
      expect('http://example.com').not.toMatch(WEBSOCKET_URL_REGEX)
    })
  })

  describe('DTMF Tones', () => {
    it('should have all standard DTMF tones', () => {
      expect(DTMF_TONES).toContain('0')
      expect(DTMF_TONES).toContain('9')
      expect(DTMF_TONES).toContain('*')
      expect(DTMF_TONES).toContain('#')
      expect(DTMF_TONES).toContain('A')
      expect(DTMF_TONES).toContain('D')
    })
  })

  describe('Log Levels', () => {
    it('should have valid log levels', () => {
      expect(LOG_LEVELS).toContain('debug')
      expect(LOG_LEVELS).toContain('info')
      expect(LOG_LEVELS).toContain('warn')
      expect(LOG_LEVELS).toContain('error')
    })
  })

  describe('Call States', () => {
    it('should have all call states', () => {
      expect(CALL_STATES).toContain('idle')
      expect(CALL_STATES).toContain('calling')
      expect(CALL_STATES).toContain('active')
      expect(CALL_STATES).toContain('held')
      expect(CALL_STATES).toContain('terminated')
    })
  })

  describe('Connection States', () => {
    it('should have all connection states', () => {
      expect(CONNECTION_STATES).toContain('disconnected')
      expect(CONNECTION_STATES).toContain('connecting')
      expect(CONNECTION_STATES).toContain('connected')
      expect(CONNECTION_STATES).toContain('error')
    })
  })

  describe('Registration States', () => {
    it('should have all registration states', () => {
      expect(REGISTRATION_STATES).toContain('unregistered')
      expect(REGISTRATION_STATES).toContain('registering')
      expect(REGISTRATION_STATES).toContain('registered')
      expect(REGISTRATION_STATES).toContain('failed')
    })
  })

  describe('Network Quality Levels', () => {
    it('should have all network quality levels in order', () => {
      expect(NETWORK_QUALITY_LEVELS).toEqual(['excellent', 'good', 'fair', 'poor', 'critical'])
    })

    it('should have 5 quality levels', () => {
      expect(NETWORK_QUALITY_LEVELS.length).toBe(5)
    })
  })

  describe('Network Quality Thresholds', () => {
    it('should have RTT thresholds in ascending order', () => {
      expect(NETWORK_QUALITY_THRESHOLDS.excellentRtt).toBeLessThan(
        NETWORK_QUALITY_THRESHOLDS.goodRtt
      )
      expect(NETWORK_QUALITY_THRESHOLDS.goodRtt).toBeLessThan(NETWORK_QUALITY_THRESHOLDS.fairRtt)
      expect(NETWORK_QUALITY_THRESHOLDS.fairRtt).toBeLessThan(NETWORK_QUALITY_THRESHOLDS.poorRtt)
      expect(NETWORK_QUALITY_THRESHOLDS.poorRtt).toBeLessThan(
        NETWORK_QUALITY_THRESHOLDS.criticalRtt
      )
    })

    it('should have packet loss thresholds in ascending order', () => {
      expect(NETWORK_QUALITY_THRESHOLDS.excellentPacketLoss).toBeLessThan(
        NETWORK_QUALITY_THRESHOLDS.goodPacketLoss
      )
      expect(NETWORK_QUALITY_THRESHOLDS.goodPacketLoss).toBeLessThan(
        NETWORK_QUALITY_THRESHOLDS.fairPacketLoss
      )
      expect(NETWORK_QUALITY_THRESHOLDS.fairPacketLoss).toBeLessThan(
        NETWORK_QUALITY_THRESHOLDS.poorPacketLoss
      )
      expect(NETWORK_QUALITY_THRESHOLDS.poorPacketLoss).toBeLessThan(
        NETWORK_QUALITY_THRESHOLDS.criticalPacketLoss
      )
    })

    it('should have reasonable threshold values', () => {
      // RTT thresholds should be positive and reasonable (in ms)
      expect(NETWORK_QUALITY_THRESHOLDS.excellentRtt).toBeGreaterThan(0)
      expect(NETWORK_QUALITY_THRESHOLDS.excellentRtt).toBeLessThan(100)
      expect(NETWORK_QUALITY_THRESHOLDS.goodRtt).toBeLessThan(200)
      expect(NETWORK_QUALITY_THRESHOLDS.fairRtt).toBeLessThan(400)
      expect(NETWORK_QUALITY_THRESHOLDS.poorRtt).toBeLessThan(600)
      expect(NETWORK_QUALITY_THRESHOLDS.criticalRtt).toBeLessThan(2000)

      // Packet loss thresholds should be small percentages
      expect(NETWORK_QUALITY_THRESHOLDS.excellentPacketLoss).toBeLessThan(2)
      expect(NETWORK_QUALITY_THRESHOLDS.goodPacketLoss).toBeLessThan(5)
      expect(NETWORK_QUALITY_THRESHOLDS.fairPacketLoss).toBeLessThan(10)
      expect(NETWORK_QUALITY_THRESHOLDS.poorPacketLoss).toBeLessThan(15)
      expect(NETWORK_QUALITY_THRESHOLDS.criticalPacketLoss).toBeLessThan(30)
    })
  })
})
