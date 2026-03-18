/**
 * Tests for extended SIP URI parsing and building utilities
 */

import {
  parseDetailedSipUri,
  buildDetailedSipUri,
  parseSipUriParams,
  normalizeSipUri,
  isSecureSipUri,
  extractUserHost,
  isPhoneSipUri,
} from '../sipUri'

describe('parseDetailedSipUri', () => {
  it('should parse a basic SIP URI', () => {
    const result = parseDetailedSipUri('sip:alice@example.com')
    expect(result).not.toBeNull()
    expect(result!.scheme).toBe('sip')
    expect(result!.user).toBe('alice')
    expect(result!.host).toBe('example.com')
    expect(result!.uri).toBe('sip:alice@example.com')
  })

  it('should parse a SIPS URI', () => {
    const result = parseDetailedSipUri('sips://secure@example.com')
    expect(result).not.toBeNull()
    expect(result!.scheme).toBe('sips')
    expect(result!.user).toBe('secure')
    expect(result!.host).toBe('example.com')
  })

  it('should parse URI with port', () => {
    const result = parseDetailedSipUri('sip:alice@example.com:5060')
    expect(result).not.toBeNull()
    expect(result!.port).toBe(5060)
    expect(result!.uri).toBe('sip:alice@example.com:5060')
  })

  it('should parse URI with parameters', () => {
    const result = parseDetailedSipUri('sip:alice@example.com;transport=tls;user=phone')
    expect(result).not.toBeNull()
    expect(result!.parameters).toEqual({ transport: 'tls', user: 'phone' })
  })

  it('should parse URI with headers', () => {
    const result = parseDetailedSipUri('sip:alice@example.com?lr&did=1234')
    expect(result).not.toBeNull()
    expect(result!.headers).toEqual({ lr: '', did: '1234' })
  })

  it('should parse URI with display name', () => {
    const result = parseDetailedSipUri('"Alice Bob" <sip:alice@example.com>')
    expect(result).not.toBeNull()
    expect(result!.displayName).toBe('Alice Bob')
    expect(result!.user).toBe('alice')
    expect(result!.host).toBe('example.com')
  })

  it('should handle uppercase scheme', () => {
    const result = parseDetailedSipUri('SIP:alice@example.com')
    expect(result).not.toBeNull()
    expect(result!.scheme).toBe('sip')
    expect(result!.host).toBe('example.com')
  })

  it('should handle uppercase host', () => {
    const result = parseDetailedSipUri('sip:alice@EXAMPLE.COM')
    expect(result).not.toBeNull()
    expect(result!.host).toBe('example.com')
  })

  it('should return null for invalid URI', () => {
    expect(parseDetailedSipUri('not-a-sip-uri')).toBeNull()
    expect(parseDetailedSipUri('')).toBeNull()
    expect(parseDetailedSipUri('sip:')).toBeNull()
    expect(parseDetailedSipUri('sip:@example.com')).toBeNull()
    expect(parseDetailedSipUri(null as any)).toBeNull()
    expect(parseDetailedSipUri(undefined as any)).toBeNull()
  })

  it('should implement SipUri interface with toString and clone', () => {
    const result = parseDetailedSipUri('sip:alice@example.com')
    expect(result!.toString()).toBe('sip:alice@example.com')

    const cloned = result!.clone()
    expect(cloned.user).toBe(result!.user)
    expect(cloned.host).toBe(result!.host)
    expect(cloned).not.toBe(result)
  })

  it('should parse complex URI with all features', () => {
    const result = parseDetailedSipUri(
      '"Alice" <sip:+14155551234@secure.example.com:5061;transport=tls;user=phone?lr>'
    )
    expect(result).not.toBeNull()
    expect(result!.scheme).toBe('sip')
    expect(result!.displayName).toBe('Alice')
    expect(result!.user).toBe('+14155551234')
    expect(result!.host).toBe('secure.example.com')
    expect(result!.port).toBe(5061)
    expect(result!.parameters).toEqual({ transport: 'tls', user: 'phone' })
    expect(result!.headers).toEqual({ lr: '' })
  })

  it('should parse URI with mixed params and headers', () => {
    const result = parseDetailedSipUri('sip:alice@example.com;transport=tls?lr&did=1234')
    expect(result).not.toBeNull()
    expect(result!.parameters).toEqual({ transport: 'tls' })
    expect(result!.headers).toEqual({ lr: '', did: '1234' })
  })
})

describe('buildDetailedSipUri', () => {
  it('should build a basic SIP URI', () => {
    const result = buildDetailedSipUri({ user: 'alice', host: 'example.com' })
    expect(result).toBe('sip:alice@example.com')
  })

  it('should build a SIPS URI', () => {
    const result = buildDetailedSipUri({ scheme: 'sips', user: 'bob', host: 'secure.com' })
    expect(result).toBe('sips:bob@secure.com')
  })

  it('should build URI with port', () => {
    const result = buildDetailedSipUri({ user: 'alice', host: 'example.com', port: 5060 })
    expect(result).toBe('sip:alice@example.com:5060')
  })

  it('should build URI with parameters', () => {
    const result = buildDetailedSipUri({
      user: 'alice',
      host: 'example.com',
      parameters: { transport: 'tls', user: 'phone' },
    })
    expect(result).toBe('sip:alice@example.com;transport=tls;user=phone')
  })

  it('should build URI with headers', () => {
    const result = buildDetailedSipUri({
      user: 'alice',
      host: 'example.com',
      headers: { lr: '', did: '1234' },
    })
    expect(result).toBe('sip:alice@example.com?lr&did=1234')
  })

  it('should build URI with display name', () => {
    const result = buildDetailedSipUri({
      user: 'alice',
      host: 'example.com',
      displayName: 'Alice Bob',
    })
    expect(result).toBe('"Alice Bob" <sip:alice@example.com>')
  })

  it('should throw for missing user', () => {
    expect(() => buildDetailedSipUri({ host: 'example.com' } as any)).toThrow(
      'requires at least user and host'
    )
  })

  it('should throw for missing host', () => {
    expect(() => buildDetailedSipUri({ user: 'alice' } as any)).toThrow(
      'requires at least user and host'
    )
  })

  it('should handle empty parameters', () => {
    const result = buildDetailedSipUri({ user: 'alice', host: 'example.com', parameters: {} })
    expect(result).toBe('sip:alice@example.com')
  })

  it('should round-trip parse then build', () => {
    const original = 'sip:+14155551234@example.com;transport=tls;user=phone?lr'
    const parsed = parseDetailedSipUri(original)!
    const rebuilt = buildDetailedSipUri(parsed)
    expect(rebuilt).toBe(original)
  })
})

describe('parseSipUriParams', () => {
  it('should parse parameters', () => {
    const params = parseSipUriParams('sip:alice@example.com;transport=tls;user=phone')
    expect(params).toEqual({ transport: 'tls', user: 'phone' })
  })

  it('should parse headers', () => {
    const params = parseSipUriParams('sip:alice@example.com?lr&did=1234')
    expect(params).toEqual({ lr: '', did: '1234' })
  })

  it('should parse mixed params and headers', () => {
    const params = parseSipUriParams('sip:alice@example.com;transport=tls?lr')
    expect(params).toEqual({ transport: 'tls', lr: '' })
  })

  it('should return empty object for URI without params', () => {
    expect(parseSipUriParams('sip:alice@example.com')).toEqual({})
  })

  it('should handle URI with display name', () => {
    const params = parseSipUriParams('"Alice" <sip:alice@example.com;transport=tls>')
    expect(params).toEqual({ transport: 'tls' })
  })
})

describe('normalizeSipUri', () => {
  it('should lowercase scheme and host', () => {
    const result = normalizeSipUri('SIP:alice@example.com')
    expect(result).toBe('sip:alice@example.com')
  })

  it('should remove default port 5060', () => {
    const result = normalizeSipUri('sip:alice@example.com:5060')
    expect(result).toBe('sip:alice@example.com')
  })

  it('should remove default SIPS port 5061', () => {
    const result = normalizeSipUri('sips:bob@secure.com:5061')
    expect(result).toBe('sips:bob@secure.com')
  })

  it('should preserve non-default ports', () => {
    const result = normalizeSipUri('sip:alice@example.com:7443')
    expect(result).toBe('sip:alice@example.com:7443')
  })

  it('should return null for invalid URI', () => {
    expect(normalizeSipUri('not-a-uri')).toBeNull()
  })
})

describe('isSecureSipUri', () => {
  it('should return true for sips://', () => {
    expect(isSecureSipUri('sips:bob@example.com')).toBe(true)
    expect(isSecureSipUri('SIPS:bob@example.com')).toBe(true)
  })

  it('should return false for sip://', () => {
    expect(isSecureSipUri('sip:alice@example.com')).toBe(false)
  })

  it('should return false for non-SIP URIs', () => {
    expect(isSecureSipUri('https://example.com')).toBe(false)
    expect(isSecureSipUri('')).toBe(false)
    expect(isSecureSipUri(null as any)).toBe(false)
  })
})

describe('extractUserHost', () => {
  it('should extract user@host', () => {
    expect(extractUserHost('sip:alice@example.com')).toBe('alice@example.com')
  })

  it('should strip scheme and port', () => {
    expect(extractUserHost('sip:alice@example.com:5060')).toBe('alice@example.com')
  })

  it('should return null for invalid URI', () => {
    expect(extractUserHost('invalid')).toBeNull()
  })
})

describe('isPhoneSipUri', () => {
  it('should return true for E.164 user', () => {
    expect(isPhoneSipUri('sip:+14155551234@example.com')).toBe(true)
  })

  it('should return true for user=phone parameter', () => {
    expect(isPhoneSipUri('sip:alice@example.com;user=phone')).toBe(true)
  })

  it('should return false for regular SIP URI', () => {
    expect(isPhoneSipUri('sip:alice@example.com')).toBe(false)
  })

  it('should return false for invalid URI', () => {
    expect(isPhoneSipUri('invalid')).toBe(false)
  })
})
