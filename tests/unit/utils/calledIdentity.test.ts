import { describe, expect, it } from 'vitest'

import {
  extractCalledIdentity,
  resolveCalledIdentityConfig,
} from '../../../src/utils/calledIdentity'

describe('calledIdentity extraction', () => {
  it('extracts dialed/target for a typical 46elks direct INVITE (Request-URI + To)', () => {
    const request = {
      ruri: 'sip:46700000000@voip.46elks.com',
      headers: {
        To: '<sip:46700000000@voip.46elks.com>',
      },
    } as any

    const res = extractCalledIdentity(request)

    expect(res.target?.raw).toBe('46700000000')
    expect(res.dialed?.raw).toBe('46700000000')
  })

  it('prefers P-Called-Party-ID for dialed when present (Telnyx-like)', () => {
    const request = {
      ruri: 'sip:+15551234@sip.telnyx.com',
      headers: {
        To: '<sip:1001@sip.telnyx.com>',
        'P-Called-Party-ID': '<sip:+15551234@sip.telnyx.com>',
      },
    } as any

    const res = extractCalledIdentity(request)

    expect(res.target?.raw).toBe('+15551234')
    expect(res.dialed?.raw).toBe('+15551234')
  })

  it('keeps target as extension when PBX rewrites INVITE but preserves dialed DID (FreePBX-like)', () => {
    const request = {
      ruri: 'sip:1001@pbx.example.com',
      headers: {
        To: '<sip:1001@pbx.example.com>',
        'P-Called-Party-ID': '<sip:+15550000@pbx.example.com>',
      },
    } as any

    const res = extractCalledIdentity(request)

    expect(res.target?.raw).toBe('1001')
    expect(res.dialed?.raw).toBe('+15550000')
  })

  it('prefers lowest History-Info index for dialed', () => {
    const request = {
      headers: {
        'History-Info':
          '<sip:2002@example.com>;index=1.1;reason=forwarded, <sip:+15550001@example.com>;index=1',
      },
    } as any

    const res = extractCalledIdentity(request)

    expect(res.dialed?.raw).toBe('+15550001')
    expect(res.candidates.some((c) => c.source === 'history-info')).toBe(true)
  })

  it('prefers oldest Diversion entry for dialed when multiple are present', () => {
    const request = {
      headers: {
        Diversion:
          '<sip:1001@example.com>;reason=unconditional, <sip:+15550123@example.com>;reason=user-busy',
      },
    } as any

    const res = extractCalledIdentity(request)

    // Oldest entry is last in header list
    expect(res.dialed?.raw).toBe('+15550123')
  })

  it('supports request.ruri as object with user', () => {
    const request = {
      ruri: {
        user: '+15559999',
        host: 'example.com',
      },
    } as any

    const res = extractCalledIdentity(request)
    expect(res.target?.raw).toBe('+15559999')
  })

  it('decodes percent-encoded user part in P-Called-Party-ID', () => {
    const request = {
      headers: {
        'P-Called-Party-ID': '<sip:%2B15551212@example.com>',
      },
    } as any

    const res = extractCalledIdentity(request)
    expect(res.dialed?.raw).toBe('+15551212')
  })

  it('extracts custom x-header and maps to dialed', () => {
    const request = {
      ruri: 'sip:1001@pbx.example.com',
      headers: {
        To: '<sip:1001@pbx.example.com>',
        'X-Original-To': '<sip:+46123456789@pbx.example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      customHeaderMap: { 'X-Original-To': 'dialed' },
    })

    expect(res.dialed?.raw).toBe('+46123456789')
    expect(res.dialed?.source).toBe('x-header')
    expect(res.dialed?.headerName).toBe('X-Original-To')
  })

  it('extracts custom x-header and maps to target', () => {
    const request = {
      ruri: 'sip:1001@pbx.example.com',
      headers: {
        To: '<sip:1001@pbx.example.com>',
        'X-Target-Line': '<sip:2001@pbx.example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      customHeaderMap: { 'X-Target-Line': 'target' },
    })

    expect(res.target?.raw).toBe('2001')
    expect(res.target?.source).toBe('x-header')
    expect(res.target?.headerName).toBe('X-Target-Line')
  })

  it('respects customHeaderPrecedence for x-headers', () => {
    const request = {
      headers: {
        'X-Second': '<sip:+15550002@example.com>',
        'X-First': '<sip:+15550001@example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      customHeaderMap: {
        'X-First': 'dialed',
        'X-Second': 'dialed',
      },
      customHeaderPrecedence: ['X-First', 'X-Second'],
    })

    expect(res.dialed?.raw).toBe('+15550001')
  })

  it('normalizes phone numbers when normalization is enabled', () => {
    const request = {
      headers: {
        To: '<sip:+46 (12) 345-6789@pbx.example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      normalization: { enabled: true, stripSeparators: true, keepPlus: true },
    })

    expect(res.dialed?.normalized).toBe('+46123456789')
  })

  it('strips plus when normalization disables keepPlus', () => {
    const request = {
      headers: {
        To: '<sip:+46123456789@pbx.example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      normalization: { enabled: true, keepPlus: false },
    })

    expect(res.dialed?.normalized).toBe('46123456789')
  })

  it('returns empty extraction for undefined request', () => {
    const res = extractCalledIdentity(undefined)
    expect(res.candidates).toEqual([])
    expect(res.dialed).toBeUndefined()
    expect(res.target).toBeUndefined()
  })

  it('handles missing To header gracefully', () => {
    const request = {
      ruri: 'sip:46700000000@voip.46elks.com',
      headers: {},
    } as any

    const res = extractCalledIdentity(request)
    expect(res.target?.raw).toBe('46700000000')
  })

  it('handles empty headers object', () => {
    const request = {
      ruri: 'sip:46700000000@voip.46elks.com',
      headers: undefined,
    } as any

    const res = extractCalledIdentity(request)
    expect(res.target?.raw).toBe('46700000000')
  })

  it('handles request with getHeader that throws', () => {
    const request = {
      getHeader: () => {
        throw new Error('Header access error')
      },
      headers: {},
    } as any

    const res = extractCalledIdentity(request)
    // Should not throw, should return empty candidates
    expect(res.candidates).toEqual([])
  })

  it('handles headers as non-object', () => {
    const request = {
      headers: 'not an object',
    } as any

    const res = extractCalledIdentity(request)
    expect(res.candidates).toEqual([])
  })

  it('handles percent-encoded user that fails decodeURIComponent', () => {
    // Test with invalid percent encoding that throws
    const request = {
      headers: {
        'P-Called-Party-ID': '<sip:%ZZ@example.com>',
      },
    } as any

    const res = extractCalledIdentity(request)
    // Should still extract the raw value (fallback)
    expect(res.dialed?.raw).toBe('%ZZ')
  })

  it('handles tel scheme URI', () => {
    const request = {
      headers: {
        To: '<tel:+46123456789>',
      },
    } as any

    const res = extractCalledIdentity(request)
    expect(res.dialed?.raw).toBe('+46123456789')
  })

  it('handles request-uri with toString that throws', () => {
    const request = {
      ruri: {
        toString: () => {
          throw new Error('toString error')
        },
      },
    } as any

    const res = extractCalledIdentity(request)
    expect(res.target).toBeUndefined()
  })

  it('handles History-Info with invalid index', () => {
    const request = {
      headers: {
        'History-Info': '<sip:123@example.com>;index=invalid',
      },
    } as any

    const res = extractCalledIdentity(request)
    // Should still extract the user
    expect(res.dialed?.raw).toBe('123')
  })

  it('normalizes with stripSeparators disabled', () => {
    const request = {
      headers: {
        To: '<sip:+46-12-345-6789@pbx.example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      normalization: { enabled: true, stripSeparators: false },
    })

    // With stripSeparators=false, separators should remain
    expect(res.dialed?.normalized).toBe('+46-12-345-6789')
  })

  it('normalizes with normalization disabled returns undefined', () => {
    const request = {
      headers: {
        To: '<sip:+46123456789@pbx.example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      normalization: { enabled: false },
    })

    expect(res.dialed?.normalized).toBeUndefined()
  })

  it('handles duplicate candidates are deduplicated', () => {
    const request = {
      ruri: 'sip:46700000000@voip.46elks.com',
      headers: {
        To: '<sip:46700000000@voip.46elks.com>',
        'P-Called-Party-ID': '<sip:46700000000@voip.46elks.com>',
      },
    } as any

    const res = extractCalledIdentity(request)
    // Should have deduplicated candidates
    const requestUriCandidates = res.candidates.filter((c) => c.source === 'request-uri')
    expect(requestUriCandidates.length).toBe(1)
  })

  it('resolves config with preset', () => {
    const config = resolveCalledIdentityConfig({
      preset: 'standard',
    })
    expect(config).toBeDefined()
    expect(config.dialedPrecedence).toBeDefined()
  })

  it('resolves config without preset uses defaults', () => {
    const config = resolveCalledIdentityConfig({})
    expect(config).toBeDefined()
    expect(config.dialedPrecedence).toBeDefined()
  })

  it('handles headers array with raw property', () => {
    const request = {
      headers: {
        'X-Custom': [{ raw: '<sip:12345@example.com>' }],
      },
    } as any

    const res = extractCalledIdentity(request, {
      customHeaderMap: { 'X-Custom': 'dialed' },
    })

    expect(res.dialed?.raw).toBe('12345')
  })

  it('handles headers array with value property', () => {
    const request = {
      headers: {
        'X-Custom': [{ value: '<sip:67890@example.com>' }],
      },
    } as any

    const res = extractCalledIdentity(request, {
      customHeaderMap: { 'X-Custom': 'dialed' },
    })

    expect(res.dialed?.raw).toBe('67890')
  })

  it('handles headers array with parsed property', () => {
    const request = {
      headers: {
        'X-Custom': [{ parsed: '<sip:11111@example.com>' }],
      },
    } as any

    const res = extractCalledIdentity(request, {
      customHeaderMap: { 'X-Custom': 'dialed' },
    })

    expect(res.dialed?.raw).toBe('11111')
  })

  it('handles embedded sip URI in string', () => {
    const request = {
      headers: {
        To: 'sip:user@example.com',
      },
    } as any

    const res = extractCalledIdentity(request)
    expect(res.dialed?.raw).toBe('user')
  })

  it('handles History-Info index with multiple parts', () => {
    const request = {
      headers: {
        'History-Info': '<sip:123@example.com>;index=1.2.3',
      },
    } as any

    const res = extractCalledIdentity(request)
    expect(res.dialed?.raw).toBe('123')
  })

  it('handles empty string input for normalization', () => {
    const request = {
      headers: {
        To: '<sip:@example.com>',
      },
    } as any

    const res = extractCalledIdentity(request)
    // Empty user should result in no dialed identity
    expect(res.dialed).toBeUndefined()
  })

  it('handles multiple x-headers with same role', () => {
    const request = {
      headers: {
        'X-First': '<sip:111@example.com>',
        'X-Second': '<sip:222@example.com>',
      },
    } as any

    const res = extractCalledIdentity(request, {
      customHeaderMap: {
        'X-First': 'dialed',
        'X-Second': 'dialed',
      },
      // No precedence means first one wins
    })

    expect(res.dialed?.raw).toBe('111')
    expect(res.dialed?.headerName).toBe('X-First')
  })
})
