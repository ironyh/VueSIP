/**
 * @vitest-environment jsdom
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
  type TelnyxApiCredentials,
} from '../telnyxApiService'

// Mock fetch globally
global.fetch = vi.fn()

describe('telnyxApiService', () => {
  const mockCredentials: TelnyxApiCredentials = {
    apiKey: 'test-api-key',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchCredentials', () => {
    it('should fetch credentials successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'cred-123',
            sip_username: 'test-user',
            sip_password: 'test-pass',
            connection_id: 'conn-123',
            record_type: 'telephony_credential',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
        meta: { total_pages: 1, total_results: 1, page_number: 1, page_size: 25 },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const result = await fetchCredentials(mockCredentials)

      expect(result).toHaveLength(1)
      expect(result[0].sip_username).toBe('test-user')
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should include query parameters when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      } as Response)

      await fetchCredentials(mockCredentials, {
        pageSize: 10,
        pageNumber: 2,
        connectionId: 'conn-123',
        status: 'active',
      })

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page%5Bsize%5D=10'),
        expect.any(Object)
      )
    })

    it('should throw error on 401 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      await expect(fetchCredentials(mockCredentials)).rejects.toThrow('Invalid API key')
    })

    it('should throw error on 403 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response)

      await expect(fetchCredentials(mockCredentials)).rejects.toThrow(
        'API key does not have permission'
      )
    })

    it('should throw error on failed response with details', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response)

      await expect(fetchCredentials(mockCredentials)).rejects.toThrow(
        'Failed to fetch credentials: 500'
      )
    })
  })

  describe('fetchConnections', () => {
    it('should fetch connections successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 'conn-123',
            connection_name: 'Test Connection',
            record_type: 'credential_connection',
            active: true,
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
        meta: { total_pages: 1, total_results: 1, page_number: 1, page_size: 25 },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)

      const result = await fetchConnections(mockCredentials)

      expect(result).toHaveLength(1)
      expect(result[0].connection_name).toBe('Test Connection')
    })

    it('should throw error on 401 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      await expect(fetchConnections(mockCredentials)).rejects.toThrow('Invalid API key')
    })
  })

  describe('fetchCredentialById', () => {
    it('should fetch credential by ID successfully', async () => {
      const mockCredential = {
        id: 'cred-123',
        sip_username: 'test-user',
        sip_password: 'test-pass',
        connection_id: 'conn-123',
        record_type: 'telephony_credential',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockCredential }),
      } as Response)

      const result = await fetchCredentialById(mockCredentials, 'cred-123')

      expect(result.sip_username).toBe('test-user')
    })

    it('should throw error on 404 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      await expect(fetchCredentialById(mockCredentials, 'invalid-id')).rejects.toThrow(
        'Credential not found'
      )
    })
  })

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], meta: {} }),
      } as Response)

      const result = await validateApiKey(mockCredentials)

      expect(result).toBe(true)
    })

    it('should return false for invalid API key', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const result = await validateApiKey(mockCredentials)

      expect(result).toBe(false)
    })
  })

  describe('formatCredentialDisplay', () => {
    it('should format credential with name', () => {
      const credential = {
        id: 'cred-123',
        sip_username: 'test-user',
        sip_password: 'pass',
        connection_id: 'conn-123',
        name: 'My Credential',
        record_type: 'telephony_credential' as const,
        created_at: '',
        updated_at: '',
      }

      expect(formatCredentialDisplay(credential)).toBe('My Credential (test-user)')
    })

    it('should format credential without name', () => {
      const credential = {
        id: 'cred-123',
        sip_username: 'test-user',
        sip_password: 'pass',
        connection_id: 'conn-123',
        record_type: 'telephony_credential' as const,
        created_at: '',
        updated_at: '',
      }

      expect(formatCredentialDisplay(credential)).toBe('test-user')
    })
  })

  describe('isCredentialExpired', () => {
    it('should return false when expires_at is null', () => {
      const credential = {
        id: 'cred-123',
        sip_username: 'test',
        sip_password: 'pass',
        connection_id: 'conn-123',
        expires_at: null,
        record_type: 'telephony_credential' as const,
        created_at: '',
        updated_at: '',
      }

      expect(isCredentialExpired(credential)).toBe(false)
    })

    it('should return false when expires_at is in the future', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const credential = {
        id: 'cred-123',
        sip_username: 'test',
        sip_password: 'pass',
        connection_id: 'conn-123',
        expires_at: futureDate.toISOString(),
        record_type: 'telephony_credential' as const,
        created_at: '',
        updated_at: '',
      }

      expect(isCredentialExpired(credential)).toBe(false)
    })

    it('should return true when expires_at is in the past', () => {
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 1)

      const credential = {
        id: 'cred-123',
        sip_username: 'test',
        sip_password: 'pass',
        connection_id: 'conn-123',
        expires_at: pastDate.toISOString(),
        record_type: 'telephony_credential' as const,
        created_at: '',
        updated_at: '',
      }

      expect(isCredentialExpired(credential)).toBe(true)
    })
  })

  describe('filterActiveCredentials', () => {
    it('should filter out expired credentials', () => {
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 1)

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const credentials = [
        {
          id: 'cred-1',
          sip_username: 'user1',
          sip_password: 'pass',
          connection_id: 'conn-1',
          expires_at: pastDate.toISOString(),
          record_type: 'telephony_credential' as const,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'cred-2',
          sip_username: 'user2',
          sip_password: 'pass',
          connection_id: 'conn-2',
          expires_at: futureDate.toISOString(),
          record_type: 'telephony_credential' as const,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'cred-3',
          sip_username: 'user3',
          sip_password: 'pass',
          connection_id: 'conn-3',
          expires_at: null,
          record_type: 'telephony_credential' as const,
          created_at: '',
          updated_at: '',
        },
      ]

      const result = filterActiveCredentials(credentials)

      expect(result).toHaveLength(2)
      expect(result.map((c) => c.id)).toEqual(['cred-2', 'cred-3'])
    })
  })
})
