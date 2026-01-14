/**
 * Tests for SIP URI building and parsing utilities
 */

import { describe, it, expect } from 'vitest'
import { buildSipUri, extractSipDomain, parseSipUri } from '@/utils/formatters'

describe('buildSipUri', () => {
  describe('with phone numbers', () => {
    it('should build SIP URI from E.164 phone number and domain', () => {
      expect(buildSipUri('+46700123456', 'sip.46elks.com')).toBe('sip:+46700123456@sip.46elks.com')
    })

    it('should build SIP URI from phone number without + prefix', () => {
      expect(buildSipUri('46700123456', 'sip.provider.com')).toBe(
        'sip:46700123456@sip.provider.com'
      )
    })

    it('should build SIP URI for US phone numbers', () => {
      expect(buildSipUri('+14155551234', 'sip.twilio.com')).toBe('sip:+14155551234@sip.twilio.com')
    })
  })

  describe('with usernames', () => {
    it('should build SIP URI from username and domain', () => {
      expect(buildSipUri('alice', 'example.com')).toBe('sip:alice@example.com')
    })

    it('should build SIP URI from extension number', () => {
      expect(buildSipUri('1001', 'pbx.company.com')).toBe('sip:1001@pbx.company.com')
    })
  })

  describe('with existing SIP URIs', () => {
    it('should pass through existing sip: URI unchanged', () => {
      expect(buildSipUri('sip:bob@other.com', 'example.com')).toBe('sip:bob@other.com')
    })

    it('should pass through existing sips: URI unchanged', () => {
      expect(buildSipUri('sips:secure@other.com', 'example.com')).toBe('sips:secure@other.com')
    })

    it('should pass through sip: URI even without domain parameter', () => {
      expect(buildSipUri('sip:bob@other.com')).toBe('sip:bob@other.com')
    })

    it('should pass through sips: URI even without domain parameter', () => {
      expect(buildSipUri('sips:bob@other.com')).toBe('sips:bob@other.com')
    })
  })

  describe('with sips scheme', () => {
    it('should build SIPS URI when specified', () => {
      expect(buildSipUri('+46700123456', 'secure.provider.com', 'sips')).toBe(
        'sips:+46700123456@secure.provider.com'
      )
    })
  })

  describe('error handling', () => {
    it('should throw error when target is empty', () => {
      expect(() => buildSipUri('', 'example.com')).toThrow('Target cannot be empty')
    })

    it('should throw error when target is whitespace only', () => {
      expect(() => buildSipUri('   ', 'example.com')).toThrow('Target cannot be empty')
    })

    it('should throw error when domain is missing for non-SIP target', () => {
      expect(() => buildSipUri('+46700123456')).toThrow(
        'Domain is required when target is not a SIP URI'
      )
    })

    it('should throw error when domain is undefined for phone number', () => {
      expect(() => buildSipUri('alice', undefined)).toThrow(
        'Domain is required when target is not a SIP URI'
      )
    })
  })

  describe('edge cases', () => {
    it('should trim whitespace from target', () => {
      expect(buildSipUri('  alice  ', 'example.com')).toBe('sip:alice@example.com')
    })

    it('should handle targets with special characters', () => {
      expect(buildSipUri('alice+work', 'example.com')).toBe('sip:alice+work@example.com')
    })
  })
})

describe('extractSipDomain', () => {
  describe('valid SIP URIs', () => {
    it('should extract domain from sip: URI', () => {
      expect(extractSipDomain('sip:alice@example.com')).toBe('example.com')
    })

    it('should extract domain from sips: URI', () => {
      expect(extractSipDomain('sips:bob@secure.example.com')).toBe('secure.example.com')
    })

    it('should extract domain from URI with port', () => {
      expect(extractSipDomain('sip:alice@example.com:5060')).toBe('example.com')
    })

    it('should extract domain from 46elks URI', () => {
      expect(extractSipDomain('sip:+46700123456@sip.46elks.com')).toBe('sip.46elks.com')
    })

    it('should extract domain from Telnyx URI', () => {
      expect(extractSipDomain('sip:user@sip.telnyx.com')).toBe('sip.telnyx.com')
    })

    it('should extract domain from own-pbx URI', () => {
      expect(extractSipDomain('sip:1001@pbx.mycompany.com')).toBe('pbx.mycompany.com')
    })
  })

  describe('invalid inputs', () => {
    it('should return null for empty string', () => {
      expect(extractSipDomain('')).toBeNull()
    })

    it('should return null for null input', () => {
      expect(extractSipDomain(null as unknown as string)).toBeNull()
    })

    it('should return null for undefined input', () => {
      expect(extractSipDomain(undefined as unknown as string)).toBeNull()
    })

    it('should return null for non-SIP URI', () => {
      expect(extractSipDomain('alice@example.com')).toBeNull()
    })

    it('should return null for plain phone number', () => {
      expect(extractSipDomain('+46700123456')).toBeNull()
    })
  })
})

describe('parseSipUri', () => {
  it('should parse basic sip: URI', () => {
    const result = parseSipUri('sip:alice@example.com')
    expect(result).toEqual({
      scheme: 'sip',
      user: 'alice',
      host: 'example.com',
      port: undefined,
    })
  })

  it('should parse sips: URI', () => {
    const result = parseSipUri('sips:bob@secure.example.com')
    expect(result).toEqual({
      scheme: 'sips',
      user: 'bob',
      host: 'secure.example.com',
      port: undefined,
    })
  })

  it('should parse URI with port', () => {
    const result = parseSipUri('sip:alice@example.com:5060')
    expect(result).toEqual({
      scheme: 'sip',
      user: 'alice',
      host: 'example.com',
      port: 5060,
    })
  })

  it('should parse URI with phone number as user', () => {
    const result = parseSipUri('sip:+46700123456@sip.46elks.com')
    expect(result).toEqual({
      scheme: 'sip',
      user: '+46700123456',
      host: 'sip.46elks.com',
      port: undefined,
    })
  })

  it('should return null for invalid URI', () => {
    expect(parseSipUri('invalid')).toBeNull()
    expect(parseSipUri('')).toBeNull()
    expect(parseSipUri('http://example.com')).toBeNull()
  })
})
