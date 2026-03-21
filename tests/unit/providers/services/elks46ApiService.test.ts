/**
 * Unit tests for elks46ApiService
 *
 * @module providers/services/elks46ApiService.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchNumbers,
  fetchNumberDetails,
  filterActiveNumbers,
  formatPhoneForSip,
  fetchCalls,
  fetchCallsWithPagination,
  fetchAllCalls,
  originateCall,
  type Elks46ApiCredentials,
  type Elks46Number,
  type Elks46Call,
} from '@/providers/services/elks46ApiService'

// Mock fetch globally
global.fetch = vi.fn()

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

describe('elks46ApiService', () => {
  const mockCredentials: Elks46ApiCredentials = {
    username: 'u1234567890abcdef',
    password: 'testpassword',
  }

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('fetchNumbers', () => {
    it('should fetch numbers successfully', async () => {
      const mockNumbers: Elks46Number[] = [
        { id: 'nb67e00a13c4b7078a4f5c597821db132', number: '+46700000000', active: 'yes' },
        { id: 'nb67e00a13c4b7078a4f5c597821db133', number: '+46700000001', active: 'no' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNumbers }),
      })

      const result = await fetchNumbers(mockCredentials)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/numbers'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      )
      expect(result).toEqual(mockNumbers)
    })

    it('should throw error on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      await expect(fetchNumbers(mockCredentials)).rejects.toThrow('Invalid API credentials')
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(fetchNumbers(mockCredentials)).rejects.toThrow('Failed to fetch numbers')
    })
  })

  describe('fetchNumberDetails', () => {
    it('should fetch number details successfully', async () => {
      const mockNumber: Elks46Number = {
        id: 'nb67e00a13c4b7078a4f5c597821db132',
        number: '+46700000000',
        active: 'yes',
        secret: 'webrtc-secret-123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNumber,
      })

      const result = await fetchNumberDetails(mockCredentials, mockNumber.id)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/numbers/${mockNumber.id}`),
        expect.any(Object)
      )
      expect(result).toEqual(mockNumber)
    })

    it('should throw error on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(fetchNumberDetails(mockCredentials, 'invalid-id')).rejects.toThrow(
        'Phone number not found'
      )
    })
  })

  describe('filterActiveNumbers', () => {
    it('should filter to only active numbers', () => {
      const numbers: Elks46Number[] = [
        { id: '1', number: '+46700000000', active: 'yes' },
        { id: '2', number: '+46700000001', active: 'no' },
        { id: '3', number: '+46700000002', active: 'yes' },
      ]

      const result = filterActiveNumbers(numbers)

      expect(result).toHaveLength(2)
      expect(result.map((n) => n.id)).toEqual(['1', '3'])
    })

    it('should return empty array when all inactive', () => {
      const numbers: Elks46Number[] = [
        { id: '1', number: '+46700000000', active: 'no' },
        { id: '2', number: '+46700000001', active: 'no' },
      ]

      const result = filterActiveNumbers(numbers)

      expect(result).toHaveLength(0)
    })
  })

  describe('formatPhoneForSip', () => {
    it('should remove + prefix', () => {
      expect(formatPhoneForSip('+46700000000')).toBe('46700000000')
    })

    it('should leave already formatted numbers unchanged', () => {
      expect(formatPhoneForSip('46700000000')).toBe('46700000000')
    })

    it('should handle international format', () => {
      expect(formatPhoneForSip('+442071838750')).toBe('442071838750')
    })
  })

  describe('fetchCalls', () => {
    it('should fetch calls successfully', async () => {
      const mockCalls: Elks46Call[] = [
        {
          id: 'call-1',
          direction: 'outgoing',
          from: '+46700000000',
          to: '+46700123456',
          created: '2024-01-15T10:00:00Z',
          state: 'success',
          duration: 120,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCalls }),
      })

      const result = await fetchCalls(mockCredentials)

      expect(result).toEqual(mockCalls)
    })
  })

  describe('fetchCallsWithPagination', () => {
    it('should return pagination info when available', async () => {
      const mockCalls: Elks46Call[] = [{ id: 'call-1' } as Elks46Call]
      const nextToken = 'next-page-token'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCalls, next: nextToken }),
      })

      const result = await fetchCallsWithPagination(mockCredentials)

      expect(result.calls).toEqual(mockCalls)
      expect(result.next).toBe(nextToken)
    })

    it('should build query parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await fetchCallsWithPagination(mockCredentials, {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
        limit: 50,
      })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('start='), expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('end='), expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      )
    })

    it('should cap limit at 100', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await fetchCallsWithPagination(mockCredentials, { limit: 500 })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=100'),
        expect.any(Object)
      )
    })
  })

  describe('fetchAllCalls', () => {
    it('should handle pagination automatically', async () => {
      const page1: Elks46Call[] = [{ id: 'call-1' } as Elks46Call]
      const page2: Elks46Call[] = [{ id: 'call-2' } as Elks46Call]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: page1, next: 'token-1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: page2 }),
        })

      const result = await fetchAllCalls(mockCredentials)

      expect(result).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      const result = await fetchAllCalls(mockCredentials)

      expect(result).toHaveLength(0)
    })
  })

  describe('originateCall', () => {
    it('should originate call successfully', async () => {
      const mockResponse = {
        id: 'cx12345',
        direction: 'outgoing',
        from: '+46700000000',
        to: '+46700123456',
        state: 'starting',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await originateCall({
        credentials: mockCredentials,
        callerId: '+46700000000',
        webrtcNumber: '+46700000000',
        destination: '+46700123456',
      })

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calls'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should throw error on failed originate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => '',
      })

      await expect(
        originateCall({
          credentials: mockCredentials,
          callerId: '+46700000000',
          webrtcNumber: '+46700000000',
          destination: '+46700123456',
        })
      ).rejects.toThrow('46elks originate failed')
    })
  })
})
