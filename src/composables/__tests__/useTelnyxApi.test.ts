/**
 * Tests for useTelnyxApi composable
 * @module composables/__tests__/useTelnyxApi.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTelnyxApi } from '../useTelnyxApi'
import type { TelnyxCredential, TelnyxConnection } from '../../providers/services/telnyxApiService'

// Mock the telnyxApiService
vi.mock('../../providers/services/telnyxApiService', () => ({
  fetchCredentials: vi.fn(),
  fetchConnections: vi.fn(),
  filterActiveCredentials: vi.fn((credentials: TelnyxCredential[]) => credentials),
}))

import {
  fetchCredentials,
  fetchConnections,
  filterActiveCredentials,
} from '../../providers/services/telnyxApiService'

const mockFetchCredentials = fetchCredentials as ReturnType<typeof vi.fn>
const mockFetchConnections = fetchConnections as ReturnType<typeof vi.fn>
const mockFilterActiveCredentials = filterActiveCredentials as ReturnType<typeof vi.fn>

describe('useTelnyxApi', () => {
  const mockCredential: TelnyxCredential = {
    id: 'cred_123',
    sip_username: 'test_user',
    sip_password: 'test_pass',
    connection_id: 'conn_456',
    name: 'Test Credential',
    tag: 'test',
    resource_id: 'res_789',
    record_type: 'telephony_credential',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    expires_at: null,
  }

  const mockConnection: TelnyxConnection = {
    id: 'conn_456',
    connection_name: 'Test Connection',
    record_type: 'credential_connection',
    active: true,
    webrtc_enabled: true,
    user_name: 'test_user',
    sip_uri_calling_preference: 'primary',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFilterActiveCredentials.mockImplementation((credentials: TelnyxCredential[]) => credentials)
  })

  describe('initialization', () => {
    it('should create useTelnyxApi composable with default state', () => {
      const result = useTelnyxApi()

      expect(result.isLoading).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.isAuthenticated).toBeDefined()
      expect(result.credentials).toBeDefined()
      expect(result.connections).toBeDefined()
      expect(result.selectedCredential).toBeDefined()
      expect(result.authenticate).toBeDefined()
      expect(result.selectCredential).toBeDefined()
      expect(result.getCredentials).toBeDefined()
      expect(result.clear).toBeDefined()

      // Check initial values
      expect(result.isLoading.value).toBe(false)
      expect(result.error.value).toBe(null)
      expect(result.isAuthenticated.value).toBe(false)
      expect(result.credentials.value).toEqual([])
      expect(result.connections.value).toEqual([])
      expect(result.selectedCredential.value).toBe(null)
    })
  })

  describe('authenticate', () => {
    it('should authenticate successfully and fetch credentials', async () => {
      mockFetchCredentials.mockResolvedValueOnce([mockCredential])
      mockFetchConnections.mockResolvedValueOnce([mockConnection])

      const result = useTelnyxApi()
      const success = await result.authenticate('test_api_key')

      expect(success).toBe(true)
      expect(result.isAuthenticated.value).toBe(true)
      expect(result.credentials.value).toEqual([mockCredential])
      expect(result.connections.value).toEqual([mockConnection])
      expect(mockFetchCredentials).toHaveBeenCalledWith({ apiKey: 'test_api_key' })
    })

    it('should handle authentication failure', async () => {
      mockFetchCredentials.mockRejectedValueOnce(new Error('Invalid API key'))
      mockFetchConnections.mockResolvedValueOnce([])

      const result = useTelnyxApi()
      const success = await result.authenticate('invalid_key')

      expect(success).toBe(false)
      expect(result.isAuthenticated.value).toBe(false)
      expect(result.error.value).toBe('Invalid API key')
    })

    it('should set error when no credentials found', async () => {
      mockFetchCredentials.mockResolvedValueOnce([])
      mockFetchConnections.mockResolvedValueOnce([])

      const result = useTelnyxApi()
      const success = await result.authenticate('test_api_key')

      expect(success).toBe(false)
      expect(result.error.value).toContain('No active telephony credentials found')
      expect(result.isAuthenticated.value).toBe(false)
    })

    it('should auto-select credential when only one exists', async () => {
      mockFetchCredentials.mockResolvedValueOnce([mockCredential])
      mockFetchConnections.mockResolvedValueOnce([])

      const result = useTelnyxApi()
      await result.authenticate('test_api_key')

      expect(result.selectedCredential.value).toEqual(mockCredential)
    })

    it('should set loading state during authentication', async () => {
      let loadingDuringCall = false

      mockFetchCredentials.mockImplementation(() => {
        loadingDuringCall = result.isLoading.value
        return Promise.resolve([mockCredential])
      })
      mockFetchConnections.mockResolvedValueOnce([])

      const result = useTelnyxApi()
      await result.authenticate('test_api_key')

      expect(loadingDuringCall).toBe(true)
      expect(result.isLoading.value).toBe(false)
    })

    it('should handle connection fetch failure gracefully', async () => {
      mockFetchCredentials.mockResolvedValueOnce([mockCredential])
      mockFetchConnections.mockRejectedValueOnce(new Error('Connection error'))

      const result = useTelnyxApi()
      const success = await result.authenticate('test_api_key')

      expect(success).toBe(true)
      expect(result.connections.value).toEqual([])
    })
  })

  describe('selectCredential', () => {
    it('should set selected credential', () => {
      const result = useTelnyxApi()
      result.selectCredential(mockCredential)

      expect(result.selectedCredential.value).toEqual(mockCredential)
    })

    it('should clear error when selecting credential', () => {
      const result = useTelnyxApi()
      result.error.value = 'Previous error'
      result.selectCredential(mockCredential)

      expect(result.error.value).toBe(null)
    })
  })

  describe('getCredentials', () => {
    it('should return null when no credential selected', () => {
      const result = useTelnyxApi()
      const creds = result.getCredentials()

      expect(creds).toBe(null)
    })

    it('should return SIP credentials when credential is selected', () => {
      const result = useTelnyxApi()
      result.selectCredential(mockCredential)
      const creds = result.getCredentials()

      expect(creds).toEqual({
        username: mockCredential.sip_username,
        password: mockCredential.sip_password,
      })
    })
  })

  describe('clear', () => {
    it('should reset all state', async () => {
      mockFetchCredentials.mockResolvedValueOnce([mockCredential])
      mockFetchConnections.mockResolvedValueOnce([mockConnection])

      const result = useTelnyxApi()
      await result.authenticate('test_api_key')
      result.clear()

      expect(result.isLoading.value).toBe(false)
      expect(result.error.value).toBe(null)
      expect(result.isAuthenticated.value).toBe(false)
      expect(result.credentials.value).toEqual([])
      expect(result.connections.value).toEqual([])
      expect(result.selectedCredential.value).toBe(null)
    })
  })

  describe('filterActiveCredentials', () => {
    it('should filter credentials using the service function', async () => {
      const expiredCredential = {
        ...mockCredential,
        expires_at: '2020-01-01T00:00:00Z',
      }

      mockFetchCredentials.mockResolvedValueOnce([mockCredential, expiredCredential])
      mockFetchConnections.mockResolvedValueOnce([])

      const result = useTelnyxApi()
      await result.authenticate('test_api_key')

      expect(mockFilterActiveCredentials).toHaveBeenCalled()
    })
  })
})
