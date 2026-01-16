/**
 * TelnyxApiService Tests
 *
 * Tests for the Telnyx API service that fetches telephony credentials
 * and connection details.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchCredentials,
  fetchConnections,
  fetchCredentialById,
  validateApiKey,
  formatCredentialDisplay,
  isCredentialExpired,
  filterActiveCredentials,
  type TelnyxCredential,
  type TelnyxApiCredentials,
} from '@/providers/services/telnyxApiService'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('telnyxApiService', () => {
  const mockCredentials: TelnyxApiCredentials = {
    apiKey: 'KEY_valid_api_key_1234567890',
  }

  const mockCredential: TelnyxCredential = {
    id: 'cred-123',
    sip_username: 'sip_user',
    sip_password: 'sip_pass',
    connection_id: 'conn-123',
    name: 'Test Credential',
    record_type: 'telephony_credential',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    expires_at: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchCredentials', () => {
    it('should fetch credentials successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [mockCredential],
            meta: { total_pages: 1, total_results: 1, page_number: 1, page_size: 20 },
          }),
      })

      const result = await fetchCredentials(mockCredentials)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cred-123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('telephony_credentials'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer KEY_valid_api_key_1234567890',
          }),
        })
      )
    })

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { total_pages: 0, total_results: 0, page_number: 1, page_size: 20 },
          }),
      })

      const result = await fetchCredentials(mockCredentials)

      expect(result).toEqual([])
    })

    it('should apply pagination options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [],
            meta: { total_pages: 1, total_results: 0, page_number: 2, page_size: 10 },
          }),
      })

      await fetchCredentials(mockCredentials, { pageSize: 10, pageNumber: 2 })

      // URL encodes brackets: [ becomes %5B, ] becomes %5D
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page%5Bsize%5D=10'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page%5Bnumber%5D=2'),
        expect.any(Object)
      )
    })

    it('should apply connection filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })

      await fetchCredentials(mockCredentials, { connectionId: 'conn-456' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter%5Bconnection_id%5D=conn-456'),
        expect.any(Object)
      )
    })

    it('should apply status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })

      await fetchCredentials(mockCredentials, { status: 'active' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter%5Bstatus%5D=active'),
        expect.any(Object)
      )
    })

    it('should throw error on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      await expect(fetchCredentials(mockCredentials)).rejects.toThrow('Invalid API key')
    })

    it('should throw error on 403 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      })

      await expect(fetchCredentials(mockCredentials)).rejects.toThrow(
        'API key does not have permission'
      )
    })

    it('should throw error on other failed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(fetchCredentials(mockCredentials)).rejects.toThrow(
        'Failed to fetch credentials: 500'
      )
    })

    it('should handle missing data field in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ meta: {} }),
      })

      const result = await fetchCredentials(mockCredentials)

      expect(result).toEqual([])
    })
  })

  describe('fetchConnections', () => {
    it('should fetch connections successfully', async () => {
      const mockConnection = {
        id: 'conn-123',
        connection_name: 'Test Connection',
        record_type: 'credential_connection',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockConnection] }),
      })

      const result = await fetchConnections(mockCredentials)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('conn-123')
    })

    it('should throw error on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      await expect(fetchConnections(mockCredentials)).rejects.toThrow('Invalid API key')
    })

    it('should throw error on 403 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      })

      await expect(fetchConnections(mockCredentials)).rejects.toThrow(
        'API key does not have permission to access connections'
      )
    })

    it('should throw error on other failed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(fetchConnections(mockCredentials)).rejects.toThrow(
        'Failed to fetch connections: 500'
      )
    })

    it('should handle missing data field in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ meta: {} }),
      })

      const result = await fetchConnections(mockCredentials)

      expect(result).toEqual([])
    })
  })

  describe('fetchCredentialById', () => {
    it('should fetch credential by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCredential }),
      })

      const result = await fetchCredentialById(mockCredentials, 'cred-123')

      expect(result.id).toBe('cred-123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('telephony_credentials/cred-123'),
        expect.any(Object)
      )
    })

    it('should throw error on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      await expect(fetchCredentialById(mockCredentials, 'cred-123')).rejects.toThrow(
        'Invalid API key'
      )
    })

    it('should throw error on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      })

      await expect(fetchCredentialById(mockCredentials, 'cred-notfound')).rejects.toThrow(
        'Credential not found: cred-notfound'
      )
    })

    it('should throw error on other failed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(fetchCredentialById(mockCredentials, 'cred-123')).rejects.toThrow(
        'Failed to fetch credential: 500'
      )
    })
  })

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })

      const result = await validateApiKey(mockCredentials)

      expect(result).toBe(true)
    })

    it('should return false for invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      const result = await validateApiKey(mockCredentials)

      expect(result).toBe(false)
    })

    it('should return false on any error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateApiKey(mockCredentials)

      expect(result).toBe(false)
    })
  })

  describe('formatCredentialDisplay', () => {
    it('should format credential with name', () => {
      const result = formatCredentialDisplay(mockCredential)

      expect(result).toBe('Test Credential (sip_user)')
    })

    it('should format credential without name', () => {
      const credentialWithoutName: TelnyxCredential = {
        ...mockCredential,
        name: undefined,
      }

      const result = formatCredentialDisplay(credentialWithoutName)

      expect(result).toBe('sip_user')
    })
  })

  describe('isCredentialExpired', () => {
    it('should return false for credential without expiration', () => {
      const result = isCredentialExpired(mockCredential)

      expect(result).toBe(false)
    })

    it('should return false for credential with null expiration', () => {
      const credential: TelnyxCredential = {
        ...mockCredential,
        expires_at: null,
      }

      const result = isCredentialExpired(credential)

      expect(result).toBe(false)
    })

    it('should return true for expired credential', () => {
      const credential: TelnyxCredential = {
        ...mockCredential,
        expires_at: '2020-01-01T00:00:00Z',
      }

      const result = isCredentialExpired(credential)

      expect(result).toBe(true)
    })

    it('should return false for future expiration', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const credential: TelnyxCredential = {
        ...mockCredential,
        expires_at: futureDate.toISOString(),
      }

      const result = isCredentialExpired(credential)

      expect(result).toBe(false)
    })
  })

  describe('filterActiveCredentials', () => {
    it('should filter out expired credentials', () => {
      const credentials: TelnyxCredential[] = [
        mockCredential,
        {
          ...mockCredential,
          id: 'cred-expired',
          expires_at: '2020-01-01T00:00:00Z',
        },
      ]

      const result = filterActiveCredentials(credentials)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cred-123')
    })

    it('should keep all non-expired credentials', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const credentials: TelnyxCredential[] = [
        mockCredential,
        {
          ...mockCredential,
          id: 'cred-future',
          expires_at: futureDate.toISOString(),
        },
      ]

      const result = filterActiveCredentials(credentials)

      expect(result).toHaveLength(2)
    })

    it('should handle empty array', () => {
      const result = filterActiveCredentials([])

      expect(result).toEqual([])
    })
  })
})
