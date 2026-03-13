/**
 * Unit tests for elks46ApiService
 *
 * Tests the 46 elks API service for fetching phone numbers,
 * WebRTC credentials, and call history.
 */

import {
  fetchNumbers,
  fetchNumberDetails,
  fetchCalls,
  fetchCallsWithPagination,
  fetchAllCalls,
  originateCall,
  filterActiveNumbers,
  formatPhoneForSip,
  type Elks46ApiCredentials,
  type Elks46Number,
  type Elks46Call,
  type FetchCallsOptions,
} from '../elks46ApiService'

import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('elks46ApiService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('filterActiveNumbers', () => {
    it('filters numbers that are active', () => {
      const numbers: Elks46Number[] = [
        { id: '1', number: '+46700000001', active: 'yes' },
        { id: '2', number: '+46700000002', active: 'no' },
        { id: '3', number: '+46700000003', active: 'yes' },
      ]
      const active = filterActiveNumbers(numbers)
      expect(active).toHaveLength(2)
      expect(active.map((n) => n.id)).toEqual(['1', '3'])
    })

    it('returns empty array when no active numbers', () => {
      const numbers: Elks46Number[] = [
        { id: '1', number: '+46700000001', active: 'no' },
        { id: '2', number: '+46700000002', active: 'no' },
      ]
      const active = filterActiveNumbers(numbers)
      expect(active).toHaveLength(0)
    })

    it('returns empty array for empty input', () => {
      const active = filterActiveNumbers([])
      expect(active).toHaveLength(0)
    })
  })

  describe('formatPhoneForSip', () => {
    it('removes + prefix from E.164 number', () => {
      expect(formatPhoneForSip('+46700000000')).toBe('46700000000')
    })

    it('leaves number unchanged if no + prefix', () => {
      expect(formatPhoneForSip('46700000000')).toBe('46700000000')
    })

    it('handles international format with +', () => {
      expect(formatPhoneForSip('+14155551234')).toBe('14155551234')
    })
  })

  describe('fetchNumbers', () => {
    const credentials: Elks46ApiCredentials = {
      username: 'utest',
      password: 'testpass',
    }

    it('fetches numbers successfully', async () => {
      const mockNumbers: Elks46Number[] = [
        { id: 'nb1', number: '+46700000001', active: 'yes' },
        { id: 'nb2', number: '+46700000002', active: 'no' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNumbers }),
      })

      const result = await fetchNumbers(credentials)

      expect(result).toEqual(mockNumbers)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/numbers'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.any(String),
            Accept: 'application/json',
          }),
        })
      )
    })

    it('throws error on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      await expect(fetchNumbers(credentials)).rejects.toThrow('Invalid API credentials')
    })

    it('throws error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(fetchNumbers(credentials)).rejects.toThrow('Failed to fetch numbers')
    })

    it('returns empty array when no data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const result = await fetchNumbers(credentials)
      expect(result).toEqual([])
    })
  })

  describe('fetchNumberDetails', () => {
    const credentials: Elks46ApiCredentials = {
      username: 'utest',
      password: 'testpass',
    }

    it('fetches number details with secret', async () => {
      const mockNumber: Elks46Number = {
        id: 'nb1',
        number: '+46700000001',
        active: 'yes',
        secret: 'webrtc_secret_123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNumber,
      })

      const result = await fetchNumberDetails(credentials, 'nb1')

      expect(result).toEqual(mockNumber)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/numbers/nb1'),
        expect.any(Object)
      )
    })

    it('throws error on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(fetchNumberDetails(credentials, 'nb1')).rejects.toThrow('Phone number not found')
    })
  })

  describe('fetchCalls', () => {
    const credentials: Elks46ApiCredentials = {
      username: 'utest',
      password: 'testpass',
    }

    it('fetches calls without options', async () => {
      const mockCalls: Elks46Call[] = [
        {
          id: 'call1',
          direction: 'incoming',
          from: '+46700000001',
          to: '+46700000002',
          created: '2024-01-15T10:00:00Z',
          state: 'success',
          duration: 120,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCalls }),
      })

      const result = await fetchCalls(credentials)

      expect(result).toEqual(mockCalls)
    })

    it('passes query parameters correctly', async () => {
      const options: FetchCallsOptions = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
        limit: 50,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await fetchCalls(credentials, options)

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('start='), expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('end='), expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      )
    })

    it('respects maximum limit of 100', async () => {
      const options: FetchCallsOptions = { limit: 200 }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await fetchCalls(credentials, options)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=100'),
        expect.any(Object)
      )
    })
  })

  describe('fetchCallsWithPagination', () => {
    const credentials: Elks46ApiCredentials = {
      username: 'utest',
      password: 'testpass',
    }

    it('returns pagination info when available', async () => {
      const mockCalls: Elks46Call[] = [{ id: 'call1' } as Elks46Call]
      const nextToken = 'page2'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCalls, next: nextToken }),
      })

      const result = await fetchCallsWithPagination(credentials)

      expect(result.calls).toEqual(mockCalls)
      expect(result.next).toBe(nextToken)
    })

    it('returns undefined for next when no pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      const result = await fetchCallsWithPagination(credentials)

      expect(result.next).toBeUndefined()
    })
  })

  describe('fetchAllCalls', () => {
    const credentials: Elks46ApiCredentials = {
      username: 'utest',
      password: 'testpass',
    }

    it('fetches all pages automatically', async () => {
      const page1: Elks46Call[] = [{ id: 'call1' } as Elks46Call]
      const page2: Elks46Call[] = [{ id: 'call2' } as Elks46Call]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: page1, next: 'token2' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: page2 }),
        })

      const result = await fetchAllCalls(credentials)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('call1')
      expect(result[1].id).toBe('call2')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('handles single page without pagination', async () => {
      const calls: Elks46Call[] = [{ id: 'call1' } as Elks46Call]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: calls }),
      })

      const result = await fetchAllCalls(credentials)

      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('originateCall', () => {
    it('originate call successfully', async () => {
      const mockResponse: Elks46Call = {
        id: 'new_call_id',
        direction: 'outgoing',
        from: '+46700000001',
        to: '+46700000002',
        created: new Date().toISOString(),
        state: 'initiated',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await originateCall({
        credentials: { username: 'utest', password: 'pass' },
        callerId: '+46700000001',
        webrtcNumber: '+46700000001',
        destination: '+46700000002',
      })

      expect(result.id).toBe('new_call_id')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calls'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(
        originateCall({
          credentials: { username: 'utest', password: 'pass' },
          callerId: '+46700000001',
          webrtcNumber: '+46700000001',
          destination: '+46700000002',
        })
      ).rejects.toThrow()
    })
  })
})
