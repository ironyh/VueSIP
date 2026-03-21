/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { resolveCalledIdentityConfig, extractCalledIdentity } from '../calledIdentity'
import type { SipRequest } from '../types/events.types'
import type { CalledIdentityConfig } from '../types/config.types'

describe('calledIdentity', () => {
  describe('resolveCalledIdentityConfig', () => {
    it('should return default config when no input', () => {
      const result = resolveCalledIdentityConfig()
      expect(result).toBeDefined()
      expect(result.normalization).toBeDefined()
    })

    it('should merge custom config with defaults', () => {
      const custom: CalledIdentityConfig = {
        customHeaderMap: { 'X-Custom': 'dialed' },
      }
      const result = resolveCalledIdentityConfig(custom)
      expect(result.customHeaderMap).toEqual({ 'X-Custom': 'dialed' })
      expect(result.normalization).toBeDefined()
    })

    it('should override preset with custom values', () => {
      const config: CalledIdentityConfig = {
        preset: 'us-e164',
        normalization: {
          stripSeparators: false,
        },
      }
      const result = resolveCalledIdentityConfig(config)
      expect(result.normalization?.stripSeparators).toBe(false)
    })
  })

  describe('extractCalledIdentity', () => {
    it('should return empty extraction when no request', () => {
      const result = extractCalledIdentity(undefined)
      expect(result.candidates).toEqual([])
      expect(result.dialed).toBeUndefined()
      expect(result.target).toBeUndefined()
    })

    it('should extract from request-uri', () => {
      const request = {
        ruri: 'sip:123456@example.com',
      } as SipRequest
      const result = extractCalledIdentity(request)
      expect(result.candidates).toContainEqual(
        expect.objectContaining({
          source: 'request-uri',
          raw: '123456',
        })
      )
    })

    it('should extract from To header via getHeader', () => {
      const request = {
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'to') return 'sip:alice@example.com'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request)
      expect(result.candidates).toContainEqual(
        expect.objectContaining({
          source: 'to',
          raw: 'alice',
        })
      )
    })

    it('should extract from P-Called-Party-ID header', () => {
      const request = {
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'p-called-party-id') return 'sip:called@example.com'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request)
      expect(result.candidates).toContainEqual(
        expect.objectContaining({
          source: 'p-called-party-id',
          raw: 'called',
        })
      )
    })

    it('should extract from History-Info header', () => {
      const request = {
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'history-info') return '<sip:history@example.com>;index=1'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request)
      expect(result.candidates).toContainEqual(
        expect.objectContaining({
          source: 'history-info',
          raw: 'history',
        })
      )
    })

    it('should extract from Diversion header', () => {
      const request = {
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'diversion') return 'sip:diversion@example.com'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request)
      expect(result.candidates).toContainEqual(
        expect.objectContaining({
          source: 'diversion',
          raw: 'diversion',
        })
      )
    })

    it('should extract from custom x-headers', () => {
      const config: CalledIdentityConfig = {
        customHeaderMap: { 'X-My-Header': 'dialed' },
      }
      const request = {
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'x-my-header') return 'sip:custom@example.com'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request, config)
      expect(result.candidates).toContainEqual(
        expect.objectContaining({
          source: 'x-header',
          headerName: 'X-My-Header',
          raw: 'custom',
        })
      )
    })

    it('should normalize phone numbers', () => {
      const request = {
        ruri: 'sip:+46-70-123-4567@example.com',
      } as SipRequest
      const result = extractCalledIdentity(request)
      const ruriCandidate = result.candidates.find((c) => c.source === 'request-uri')
      expect(ruriCandidate?.normalized).toBe('+46701234567')
    })

    it('should strip separators when normalization enabled', () => {
      const request = {
        ruri: 'sip:123-456-7890@example.com',
      } as SipRequest
      const result = extractCalledIdentity(request)
      const ruriCandidate = result.candidates.find((c) => c.source === 'request-uri')
      expect(ruriCandidate?.normalized).toBe('1234567890')
    })

    it('should handle URL-encoded user parts', () => {
      const request = {
        ruri: 'sip:john%40example.com@example.com',
      } as SipRequest
      const result = extractCalledIdentity(request)
      const ruriCandidate = result.candidates.find((c) => c.source === 'request-uri')
      expect(ruriCandidate?.raw).toBe('john@example.com')
    })

    it('should handle tel: URIs', () => {
      const request = {
        ruri: 'tel:+1234567890',
      } as SipRequest
      const result = extractCalledIdentity(request)
      const ruriCandidate = result.candidates.find((c) => c.source === 'request-uri')
      expect(ruriCandidate?.raw).toBe('+1234567890')
    })

    it('should handle bracketed URIs with display name', () => {
      const request = {
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'to') return '"John Doe" <sip:john@example.com>'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request)
      const toCandidate = result.candidates.find((c) => c.source === 'to')
      expect(toCandidate?.raw).toBe('john')
    })

    it('should deduplicate based on source+header+raw', () => {
      // Same raw value but different sources - both should be kept
      const request = {
        ruri: 'sip:same@example.com',
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'to') return 'sip:same@example.com'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request)
      // Both ruri and to sources should have 'same' - different sources means not duplicates
      const sameSources = result.candidates.filter((c) => c.raw === 'same').map((c) => c.source)
      expect(sameSources).toContain('request-uri')
      expect(sameSources).toContain('to')
    })

    it('should return dialed based on precedence', () => {
      const request = {
        ruri: 'sip:request@example.com',
        getHeader: (name: string) => {
          if (name.toLowerCase() === 'to') return 'sip:to@example.com'
          if (name.toLowerCase() === 'p-called-party-id') return 'sip:pcalled@example.com'
          return undefined
        },
      } as unknown as SipRequest
      const result = extractCalledIdentity(request)
      // Default precedence should prefer p-called-party-id over to
      expect(result.dialed?.source).toBe('p-called-party-id')
    })
  })
})
