/**
 * SIP URI Utilities Unit Tests
 *
 * @group utils
 * @group sip
 */

import { describe, expect, test } from 'vitest'
import {
  parseDetailedSipUri,
  buildDetailedSipUri,
  isSecureSipUri,
  extractUserHost,
  isPhoneSipUri,
} from '@/utils/sipUri'

describe('parseDetailedSipUri', () => {
  test('parses basic SIP URI', () => {
    const result = parseDetailedSipUri('sip:alice@example.com')

    expect(result).not.toBeNull()
    expect(result?.scheme).toBe('sip')
    expect(result?.user).toBe('alice')
    expect(result?.host).toBe('example.com')
  })

  test('parses SIPS URI', () => {
    const result = parseDetailedSipUri('sips:bob@secure.example.com')

    expect(result).not.toBeNull()
    expect(result?.scheme).toBe('sips')
    expect(result?.user).toBe('bob')
    expect(result?.host).toBe('secure.example.com')
  })

  test('parses URI with port', () => {
    const result = parseDetailedSipUri('sip:alice@example.com:5060')

    expect(result).not.toBeNull()
    expect(result?.host).toBe('example.com')
    expect(result?.port).toBe(5060)
  })

  test('parses URI with display name', () => {
    const result = parseDetailedSipUri('"Alice Smith" <sip:alice@example.com>')

    expect(result).not.toBeNull()
    expect(result?.displayName).toBe('Alice Smith')
    expect(result?.user).toBe('alice')
  })

  test('parses URI with transport parameter', () => {
    const result = parseDetailedSipUri('sip:alice@example.com;transport=tls')

    expect(result).not.toBeNull()
    expect(result?.parameters?.transport).toBe('tls')
  })

  test('returns null for empty string', () => {
    expect(parseDetailedSipUri('')).toBeNull()
  })

  test('returns null for invalid URI', () => {
    expect(parseDetailedSipUri('not-a-uri')).toBeNull()
  })

  test('returns null for non-SIP URI', () => {
    expect(parseDetailedSipUri('http://example.com')).toBeNull()
  })
})

describe('buildDetailedSipUri', () => {
  test('builds basic SIP URI', () => {
    const result = buildDetailedSipUri({ user: 'alice', host: 'example.com' })
    expect(result).toBe('sip:alice@example.com')
  })

  test('builds SIPS URI', () => {
    const result = buildDetailedSipUri({ scheme: 'sips', user: 'bob', host: 'example.com' })
    expect(result).toBe('sips:bob@example.com')
  })

  test('builds URI with port', () => {
    const result = buildDetailedSipUri({ user: 'alice', host: 'example.com', port: 5060 })
    expect(result).toBe('sip:alice@example.com:5060')
  })

  test('builds URI with display name', () => {
    const result = buildDetailedSipUri({
      user: 'alice',
      host: 'example.com',
      displayName: 'Alice Smith',
    })
    expect(result).toBe('"Alice Smith" <sip:alice@example.com>')
  })

  test('builds URI with parameters', () => {
    const result = buildDetailedSipUri({
      user: 'alice',
      host: 'example.com',
      parameters: { transport: 'tls' },
    })
    expect(result).toBe('sip:alice@example.com;transport=tls')
  })
})

describe('isSecureSipUri', () => {
  test('returns true for SIPS URI', () => {
    expect(isSecureSipUri('sips:alice@example.com')).toBe(true)
  })

  test('returns false for SIP URI', () => {
    expect(isSecureSipUri('sip:alice@example.com')).toBe(false)
  })

  test('returns false for invalid URI', () => {
    expect(isSecureSipUri('invalid')).toBe(false)
  })
})

describe('extractUserHost', () => {
  test('extracts user@host from SIP URI', () => {
    expect(extractUserHost('sip:alice@example.com')).toBe('alice@example.com')
  })

  test('extracts from SIPS URI', () => {
    expect(extractUserHost('sips:bob@example.com')).toBe('bob@example.com')
  })

  test('returns null for invalid URI', () => {
    expect(extractUserHost('invalid')).toBeNull()
  })
})

describe('isPhoneSipUri', () => {
  test('returns true for phone number URI', () => {
    expect(isPhoneSipUri('sip:+46700000000@example.com')).toBe(true)
  })

  test('returns false for non-phone URI', () => {
    expect(isPhoneSipUri('sip:alice@example.com')).toBe(false)
  })

  test('returns false for invalid URI', () => {
    expect(isPhoneSipUri('invalid')).toBe(false)
  })
})
