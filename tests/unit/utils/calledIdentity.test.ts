import { describe, expect, it } from 'vitest'

import { extractCalledIdentity } from '../../../src/utils/calledIdentity'

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
})
