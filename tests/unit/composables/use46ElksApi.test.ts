/**
 * Unit tests for use46ElksApi composable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { use46ElksApi } from '@/composables/use46ElksApi'
import {
  fetchNumbers,
  fetchNumberDetails,
  formatPhoneForSip,
  fetchCalls,
  fetchAllCalls,
  type Elks46ApiCredentials,
  type Elks46Number,
  type Elks46Call,
} from '@/providers/services/elks46ApiService'

// Mock the elks46ApiService
vi.mock('@/providers/services/elks46ApiService', () => ({
  fetchNumbers: vi.fn(),
  fetchNumberDetails: vi.fn(),
  filterActiveNumbers: vi.fn((numbers: Elks46Number[]) => numbers as any),
  formatPhoneForSip: vi.fn((num: string) => num as any),
  fetchCalls: vi.fn(),
  fetchAllCalls: vi.fn(),
}))

// Get the mock functions
const mockFetchNumbers = fetchNumbers as ReturnType<typeof vi.fn>
const mockFetchNumberDetails = fetchNumberDetails as ReturnType<typeof vi.fn>
const mockFetchCalls = fetchCalls as ReturnType<typeof vi.fn>
const mockFetchAllCalls = fetchAllCalls as ReturnType<typeof vi.fn>

describe('use46ElksApi', () => {
  const mockNumber: Elks46Number = {
    id: 'nb67e8f2a',
    number: '+46700000000',
    status: 'active',
    created: '2024-01-01',
  }

  const mockCredentials: Elks46ApiCredentials = {
    username: 'testuser',
    password: 'testpass',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module state by re-importing would be ideal but complex in vitest
    // Instead, we test scenarios that set up the state properly
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const {
        isLoading,
        error,
        isAuthenticated,
        numbers,
        selectedNumber,
        secret,
        callHistory,
        isLoadingCallHistory,
      } = use46ElksApi()

      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(isAuthenticated.value).toBe(false)
      expect(numbers.value).toEqual([])
      expect(selectedNumber.value).toBe(null)
      expect(secret.value).toBe(null)
      expect(callHistory.value).toEqual([])
      expect(isLoadingCallHistory.value).toBe(false)
    })
  })

  describe('authenticate', () => {
    it('should authenticate and fetch numbers', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      // Mock fetchNumberDetails for auto-select (when only 1 number exists)
      mockFetchNumberDetails.mockResolvedValue({
        ...mockNumber,
        secret: 'autosecret',
      })

      const { authenticate, isLoading, error, isAuthenticated, numbers } = use46ElksApi()

      const result = await authenticate('testuser', 'testpass')

      expect(result).toBe(true)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(isAuthenticated.value).toBe(true)
      expect(numbers.value).toEqual([mockNumber])
      expect(mockFetchNumbers).toHaveBeenCalledWith(mockCredentials)
    })

    it('should handle authentication failure', async () => {
      mockFetchNumbers.mockRejectedValue(new Error('Invalid credentials'))

      const { authenticate, isLoading, error, isAuthenticated } = use46ElksApi()

      const result = await authenticate('baduser', 'badpass')

      expect(result).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBe('Invalid credentials')
      expect(isAuthenticated.value).toBe(false)
    })

    it('should return false and show error when no active numbers', async () => {
      mockFetchNumbers.mockResolvedValue([])
      // filterActiveNumbers returns empty array when given empty array

      const { authenticate, error, isAuthenticated } = use46ElksApi()

      const result = await authenticate('testuser', 'testpass')

      expect(result).toBe(false)
      expect(error.value).toBe(
        'No active phone numbers found. Add a number in your 46 elks dashboard.'
      )
      expect(isAuthenticated.value).toBe(false)
    })

    it('should auto-select number when only one exists', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchNumberDetails.mockResolvedValue({
        ...mockNumber,
        secret: 'testsecret123',
      })

      const { authenticate, selectedNumber, secret } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      expect(selectedNumber.value).toEqual({ ...mockNumber, secret: 'testsecret123' })
      expect(secret.value).toBe('testsecret123')
    })
  })

  describe('selectNumber', () => {
    it('should fetch number details and set secret', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchNumberDetails.mockResolvedValue({
        ...mockNumber,
        secret: 'mysecret456',
      })

      const { authenticate, selectNumber, selectedNumber, secret, error } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      await selectNumber(mockNumber)

      expect(mockFetchNumberDetails).toHaveBeenCalledWith(mockCredentials, mockNumber.id)
      expect(selectedNumber.value).toEqual({ ...mockNumber, secret: 'mysecret456' })
      expect(secret.value).toBe('mysecret456')
      expect(error.value).toBe(null)
    })

    it('should handle missing secret', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchNumberDetails.mockResolvedValue({
        ...mockNumber,
        secret: null,
      })

      const { authenticate, selectNumber, secret, error } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      await selectNumber(mockNumber)

      expect(error.value).toBe(
        'This number does not have WebRTC enabled. Enable it in your 46 elks dashboard.'
      )
      expect(secret.value).toBe(null)
    })
  })

  describe('getCredentials', () => {
    it('should return credentials when number and secret exist', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchNumberDetails.mockResolvedValue({
        ...mockNumber,
        secret: 'testsecret789',
      })
      vi.mocked(formatPhoneForSip).mockReturnValue('+46700000000')

      const { authenticate, getCredentials } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      const creds = getCredentials()

      expect(creds).toEqual({
        phoneNumber: '+46700000000',
        secret: 'testsecret789',
      })
    })

    it('should return null when no selected number', () => {
      const { getCredentials } = use46ElksApi()

      const creds = getCredentials()

      expect(creds).toBe(null)
    })

    it('should return null when no secret', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchNumberDetails.mockResolvedValue({
        ...mockNumber,
        secret: null,
      })

      const { authenticate, getCredentials } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      const creds = getCredentials()

      expect(creds).toBe(null)
    })
  })

  describe('loadCallHistory', () => {
    const mockCall: Elks46Call = {
      id: 'call123',
      from: '+46700000001',
      to: '+46700000002',
      direction: 'outbound',
      status: 'ok',
      created: '2024-01-01T12:00:00Z',
      duration: 60,
    }

    it('should load call history', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchCalls.mockResolvedValue([mockCall])

      const { authenticate, loadCallHistory, callHistory, error } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      const calls = await loadCallHistory()

      expect(calls).toEqual([mockCall])
      expect(callHistory.value).toEqual([mockCall])
      expect(error.value).toBe(null)
    })

    it('should handle fetch error', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchCalls.mockRejectedValue(new Error('API error'))

      const { authenticate, loadCallHistory, error } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      const calls = await loadCallHistory()

      expect(calls).toEqual([])
      expect(error.value).toBe('API error')
    })
  })

  describe('loadAllCallHistory', () => {
    const mockCall: Elks46Call = {
      id: 'call456',
      from: '+46700000001',
      to: '+46700000002',
      direction: 'inbound',
      status: 'ok',
      created: '2024-01-02T12:00:00Z',
      duration: 120,
    }

    it('should load all call history with pagination', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchAllCalls.mockResolvedValue([mockCall])

      const { authenticate, loadAllCallHistory, callHistory, error } = use46ElksApi()

      await authenticate('testuser', 'testpass')

      const calls = await loadAllCallHistory()

      expect(calls).toEqual([mockCall])
      expect(callHistory.value).toEqual([mockCall])
      expect(error.value).toBe(null)
    })
  })

  describe('clear', () => {
    it('should reset all state', async () => {
      mockFetchNumbers.mockResolvedValue([mockNumber])
      mockFetchNumberDetails.mockResolvedValue({
        ...mockNumber,
        secret: 'testsecret',
      })

      const {
        authenticate,
        clear,
        isLoading,
        error,
        isAuthenticated,
        numbers,
        selectedNumber,
        secret,
        callHistory,
        isLoadingCallHistory,
      } = use46ElksApi()

      await authenticate('testuser', 'testpass')
      clear()

      expect(isLoading.value).toBe(false)
      expect(error.value).toBe(null)
      expect(isAuthenticated.value).toBe(false)
      expect(numbers.value).toEqual([])
      expect(selectedNumber.value).toBe(null)
      expect(secret.value).toBe(null)
      expect(callHistory.value).toEqual([])
      expect(isLoadingCallHistory.value).toBe(false)
    })
  })
})
