import { describe, expect, it } from 'vitest'

import { extractCalledIdentity } from '../../../src/utils/calledIdentity'

describe('calledIdentity extraction', () => {
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
})
