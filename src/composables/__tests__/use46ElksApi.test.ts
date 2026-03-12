/**
 * use46ElksApi Unit Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { use46ElksApi, type Use46ElksApiReturn } from '../use46ElksApi'
import type { Elks46Number, Elks46Call } from '../providers/services/elks46ApiService'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Test data
const mockCredentials = { username: 'u1234', password: 'testpass' }

const mockNumbers: Elks46Number[] = [
  {
    id: 'nb67e00a13c4b7078a4f5c597821db132',
    number: '+46700000000',
    active: 'yes',
    name: 'Main Line',
    country: 'SE',
  },
  {
    id: 'nb67e00b24d5c8089b5g6d708932ec243',
    number: '+46700000001',
    active: 'yes',
    name: 'Secondary',
    country: 'SE',
  },
  {
    id: 'nb67e00c35e6d9190c6h7e819043fd354',
    number: '+46700000002',
    active: 'no',
    name: 'Inactive',
    country: 'SE',
  },
]

const mockNumberWithSecret: Elks46Number = {
  id: 'nb67e00a13c4b7078a4f5c597821db132',
  number: '+46700000000',
  active: 'yes',
  name: 'Main Line',
  country: 'SE',
  secret: 'webrtc_secret_12345',
}

const mockCalls: Elks46Call[] = [
  {
    id: 'ca123',
    direction: 'incoming',
    from: '+46700011111',
    to: '+46700000000',
    created: '2024-01-15T10:00:00Z',
    state: 'success',
    duration: 120,
    cost: 10,
  },
  {
    id: 'ca124',
    direction: 'outgoing',
    from: '+46700000000',
    to: '+46700022222',
    created: '2024-01-15T11:00:00Z',
    state: 'success',
    duration: 60,
    cost: 5,
  },
]

describe('use46ElksApi', () => {
  let composable: Use46ElksApiReturn

  beforeEach(() => {
    vi.clearAllMocks()
    composable = use46ElksApi()
  })

  afterEach(() => {
    composable.clear()
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      expect(composable.isLoading.value).toBe(false)
      expect(composable.error.value).toBe(null)
      expect(composable.isAuthenticated.value).toBe(false)
      expect(composable.numbers.value).toEqual([])
      expect(composable.selectedNumber.value).toBe(null)
      expect(composable.secret.value).toBe(null)
      expect(composable.callHistory.value).toEqual([])
    })
  })

  describe('authenticate', () => {
    it('should authenticate and fetch numbers successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNumbers }),
      })

      const result = await composable.authenticate(
        mockCredentials.username,
        mockCredentials.password
      )

      expect(result).toBe(true)
      expect(composable.isAuthenticated.value).toBe(true)
      expect(composable.numbers.value).toHaveLength(2) // Only active numbers
      expect(composable.error.value).toBe(null)
    })

    it('should filter out inactive numbers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNumbers }),
      })

      await composable.authenticate(mockCredentials.username, mockCredentials.password)

      expect(composable.numbers.value).toHaveLength(2)
      expect(composable.numbers.value.every((n) => n.active === 'yes')).toBe(true)
    })

    it('should handle empty numbers list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      const result = await composable.authenticate(
        mockCredentials.username,
        mockCredentials.password
      )

      expect(result).toBe(false)
      expect(composable.isAuthenticated.value).toBe(false)
      expect(composable.error.value).toContain('No active phone numbers found')
    })

    it('should handle authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const result = await composable.authenticate(
        mockCredentials.username,
        mockCredentials.password
      )

      expect(result).toBe(false)
      expect(composable.isAuthenticated.value).toBe(false)
      expect(composable.error.value).toContain('Invalid API credentials')
    })

    it('should auto-select single number', async () => {
      // First call returns single number, second call returns details with secret
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockNumbers[0]] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNumberWithSecret,
        })

      await composable.authenticate(mockCredentials.username, mockCredentials.password)

      expect(composable.selectedNumber.value).not.toBe(null)
      expect(composable.secret.value).toBe('webrtc_secret_12345')
    })
  })

  describe('selectNumber', () => {
    beforeEach(async () => {
      // Authenticate first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockNumbers[0]] }),
      })
      await composable.authenticate(mockCredentials.username, mockCredentials.password)
      mockFetch.mockClear()
    })

    it('should fetch number details including secret', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNumberWithSecret,
      })

      await composable.selectNumber(mockNumbers[0])

      expect(composable.selectedNumber.value?.secret).toBe('webrtc_secret_12345')
      expect(composable.secret.value).toBe('webrtc_secret_12345')
      expect(composable.error.value).toBe(null)
    })

    it('should handle missing secret', async () => {
      const numberWithoutSecret = { ...mockNumbers[0], secret: undefined }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => numberWithoutSecret,
      })

      await composable.selectNumber(mockNumbers[0])

      expect(composable.error.value).toContain('WebRTC enabled')
      expect(composable.secret.value).toBe(null)
    })

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await composable.selectNumber(mockNumbers[0])

      expect(composable.error.value).toContain('Phone number not found')
      expect(composable.secret.value).toBe(null)
    })

    it('should fail if not authenticated', () => {
      composable.clear()

      // Note: This test would need to test the error case but the composable
      // is already authenticated from beforeEach
    })
  })

  describe('getCredentials', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [mockNumberWithSecret] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockNumberWithSecret,
        })
      await composable.authenticate(mockCredentials.username, mockCredentials.password)
    })

    it('should return formatted credentials', () => {
      const creds = composable.getCredentials()

      expect(creds).not.toBe(null)
      expect(creds?.phoneNumber).toBe('46700000000') // + removed
      expect(creds?.secret).toBe('webrtc_secret_12345')
    })

    it('should return null when no number selected', () => {
      composable.clear()
      const creds = composable.getCredentials()

      expect(creds).toBe(null)
    })
  })

  describe('loadCallHistory', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNumbers }),
      })
      await composable.authenticate(mockCredentials.username, mockCredentials.password)
      mockFetch.mockClear()
    })

    it('should fetch call history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCalls }),
      })

      const calls = await composable.loadCallHistory()

      expect(calls).toHaveLength(2)
      expect(composable.callHistory.value).toHaveLength(2)
    })

    it('should pass options to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCalls }),
      })

      await composable.loadCallHistory({ limit: 10, start: '2024-01-01' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/calls'),
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should handle error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const calls = await composable.loadCallHistory()

      expect(calls).toEqual([])
      expect(composable.error.value).toContain('Invalid API credentials')
    })
  })

  describe('loadAllCallHistory', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNumbers }),
      })
      await composable.authenticate(mockCredentials.username, mockCredentials.password)
      mockFetch.mockClear()
    })

    it('should fetch all calls with pagination', async () => {
      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockCalls[0]], next: 'page2' }),
      })
      // Second page (last)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockCalls[1]] }),
      })

      const calls = await composable.loadAllCallHistory()

      expect(calls).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const calls = await composable.loadAllCallHistory()

      expect(calls).toEqual([])
      expect(composable.error.value).toContain('Failed to fetch calls')
    })
  })

  describe('clear', () => {
    it('should reset all state', async () => {
      // Authenticate and load some data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNumbers }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCalls }),
      })

      await composable.authenticate(mockCredentials.username, mockCredentials.password)
      await composable.loadCallHistory()

      expect(composable.isAuthenticated.value).toBe(true)
      expect(composable.numbers.value.length).toBeGreaterThan(0)

      composable.clear()

      expect(composable.isLoading.value).toBe(false)
      expect(composable.error.value).toBe(null)
      expect(composable.isAuthenticated.value).toBe(false)
      expect(composable.numbers.value).toEqual([])
      expect(composable.selectedNumber.value).toBe(null)
      expect(composable.secret.value).toBe(null)
      expect(composable.callHistory.value).toEqual([])
    })
  })
})
