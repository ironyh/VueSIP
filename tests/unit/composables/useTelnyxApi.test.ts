/**
 * useTelnyxApi Tests
 *
 * Tests for the Telnyx API composable that provides
 * authentication and credential management for Telnyx integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTelnyxApi } from '@/composables/useTelnyxApi'
import type { TelnyxCredential, TelnyxConnection } from '@/providers/services/telnyxApiService'

// Mock the telnyxApiService
vi.mock('@/providers/services/telnyxApiService', () => ({
  fetchCredentials: vi.fn(),
  fetchConnections: vi.fn(),
  filterActiveCredentials: vi.fn((creds) => creds),
}))

import {
  fetchCredentials,
  fetchConnections,
  filterActiveCredentials,
} from '@/providers/services/telnyxApiService'

const mockFetchCredentials = vi.mocked(fetchCredentials)
const mockFetchConnections = vi.mocked(fetchConnections)
const mockFilterActiveCredentials = vi.mocked(filterActiveCredentials)

describe('useTelnyxApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { isLoading, error, isAuthenticated, credentials, connections, selectedCredential } =
        useTelnyxApi()

      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(isAuthenticated.value).toBe(false)
      expect(credentials.value).toEqual([])
      expect(connections.value).toEqual([])
      expect(selectedCredential.value).toBeNull()
    })
  })

  describe('authenticate', () => {
    const mockCredential: TelnyxCredential = {
      id: 'cred-123',
      user_name: 'Test User',
      sip_username: 'sip_user',
      sip_password: 'sip_pass',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      expired: false,
      connection_id: 'conn-123',
    }

    const mockConnection: TelnyxConnection = {
      id: 'conn-123',
      connection_name: 'Test Connection',
      active: true,
      record_type: 'connection',
    }

    it('should authenticate successfully with valid API key', async () => {
      mockFetchCredentials.mockResolvedValue([mockCredential])
      mockFetchConnections.mockResolvedValue([mockConnection])
      mockFilterActiveCredentials.mockReturnValue([mockCredential])

      const { authenticate, isAuthenticated, credentials, connections, error } = useTelnyxApi()

      const result = await authenticate('KEY_valid_api_key')

      expect(result).toBe(true)
      expect(isAuthenticated.value).toBe(true)
      expect(credentials.value).toHaveLength(1)
      expect(connections.value).toHaveLength(1)
      expect(error.value).toBeNull()
    })

    it('should auto-select credential when only one is available', async () => {
      mockFetchCredentials.mockResolvedValue([mockCredential])
      mockFetchConnections.mockResolvedValue([])
      mockFilterActiveCredentials.mockReturnValue([mockCredential])

      const { authenticate, selectedCredential } = useTelnyxApi()

      await authenticate('KEY_valid_api_key')

      expect(selectedCredential.value).toEqual(mockCredential)
    })

    it('should not auto-select when multiple credentials available', async () => {
      const secondCredential: TelnyxCredential = {
        ...mockCredential,
        id: 'cred-456',
        sip_username: 'sip_user_2',
      }
      mockFetchCredentials.mockResolvedValue([mockCredential, secondCredential])
      mockFetchConnections.mockResolvedValue([])
      mockFilterActiveCredentials.mockReturnValue([mockCredential, secondCredential])

      const { authenticate, selectedCredential } = useTelnyxApi()

      await authenticate('KEY_valid_api_key')

      expect(selectedCredential.value).toBeNull()
    })

    it('should set error when no active credentials found', async () => {
      mockFetchCredentials.mockResolvedValue([])
      mockFetchConnections.mockResolvedValue([])
      mockFilterActiveCredentials.mockReturnValue([])

      const { authenticate, isAuthenticated, error } = useTelnyxApi()

      const result = await authenticate('KEY_valid_api_key')

      expect(result).toBe(false)
      expect(isAuthenticated.value).toBe(false)
      expect(error.value).toContain('No active telephony credentials found')
    })

    it('should handle authentication errors', async () => {
      mockFetchCredentials.mockRejectedValue(new Error('Invalid API key'))
      mockFetchConnections.mockResolvedValue([])

      const { authenticate, isAuthenticated, error } = useTelnyxApi()

      const result = await authenticate('KEY_invalid')

      expect(result).toBe(false)
      expect(isAuthenticated.value).toBe(false)
      expect(error.value).toBe('Invalid API key')
    })

    it('should handle non-Error exceptions', async () => {
      mockFetchCredentials.mockRejectedValue('Unknown error')
      mockFetchConnections.mockResolvedValue([])

      const { authenticate, error } = useTelnyxApi()

      await authenticate('KEY_invalid')

      expect(error.value).toBe('Authentication failed')
    })

    it('should set isLoading during authentication', async () => {
      let resolvePromise: (value: TelnyxCredential[]) => void
      const pendingPromise = new Promise<TelnyxCredential[]>((resolve) => {
        resolvePromise = resolve
      })
      mockFetchCredentials.mockReturnValue(pendingPromise)
      mockFetchConnections.mockResolvedValue([])

      const { authenticate, isLoading } = useTelnyxApi()

      expect(isLoading.value).toBe(false)

      const authPromise = authenticate('KEY_test')

      expect(isLoading.value).toBe(true)

      resolvePromise!([])
      mockFilterActiveCredentials.mockReturnValue([])
      await authPromise

      expect(isLoading.value).toBe(false)
    })

    it('should handle connection fetch failure gracefully', async () => {
      mockFetchCredentials.mockResolvedValue([mockCredential])
      mockFetchConnections.mockRejectedValue(new Error('Connection fetch failed'))
      mockFilterActiveCredentials.mockReturnValue([mockCredential])

      const { authenticate, isAuthenticated, connections } = useTelnyxApi()

      const result = await authenticate('KEY_valid')

      expect(result).toBe(true)
      expect(isAuthenticated.value).toBe(true)
      expect(connections.value).toEqual([])
    })
  })

  describe('selectCredential', () => {
    it('should select a credential', () => {
      const mockCredential: TelnyxCredential = {
        id: 'cred-123',
        user_name: 'Test User',
        sip_username: 'sip_user',
        sip_password: 'sip_pass',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        expired: false,
        connection_id: 'conn-123',
      }

      const { selectCredential, selectedCredential } = useTelnyxApi()

      selectCredential(mockCredential)

      expect(selectedCredential.value).toEqual(mockCredential)
    })

    it('should clear error when selecting credential', () => {
      const mockCredential: TelnyxCredential = {
        id: 'cred-123',
        user_name: 'Test User',
        sip_username: 'sip_user',
        sip_password: 'sip_pass',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        expired: false,
        connection_id: 'conn-123',
      }

      // Set up an error state first by simulating a failed auth
      mockFetchCredentials.mockResolvedValue([])
      mockFetchConnections.mockResolvedValue([])
      mockFilterActiveCredentials.mockReturnValue([])

      const { authenticate, selectCredential, error } = useTelnyxApi()

      // Trigger error
      authenticate('KEY_test')

      // Now select a credential - should clear error
      selectCredential(mockCredential)

      expect(error.value).toBeNull()
    })
  })

  describe('getCredentials', () => {
    it('should return null when no credential selected', () => {
      const { getCredentials } = useTelnyxApi()

      expect(getCredentials()).toBeNull()
    })

    it('should return username and password for selected credential', () => {
      const mockCredential: TelnyxCredential = {
        id: 'cred-123',
        user_name: 'Test User',
        sip_username: 'my_sip_user',
        sip_password: 'my_sip_pass',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        expired: false,
        connection_id: 'conn-123',
      }

      const { selectCredential, getCredentials } = useTelnyxApi()

      selectCredential(mockCredential)

      const creds = getCredentials()

      expect(creds).toEqual({
        username: 'my_sip_user',
        password: 'my_sip_pass',
      })
    })
  })

  describe('clear', () => {
    it('should reset all state', async () => {
      const mockCredential: TelnyxCredential = {
        id: 'cred-123',
        user_name: 'Test User',
        sip_username: 'sip_user',
        sip_password: 'sip_pass',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        expired: false,
        connection_id: 'conn-123',
      }

      mockFetchCredentials.mockResolvedValue([mockCredential])
      mockFetchConnections.mockResolvedValue([])
      mockFilterActiveCredentials.mockReturnValue([mockCredential])

      const {
        authenticate,
        clear,
        isLoading,
        error,
        isAuthenticated,
        credentials,
        connections,
        selectedCredential,
      } = useTelnyxApi()

      await authenticate('KEY_valid')

      // Verify state is set
      expect(isAuthenticated.value).toBe(true)
      expect(credentials.value).toHaveLength(1)

      // Clear state
      clear()

      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(isAuthenticated.value).toBe(false)
      expect(credentials.value).toEqual([])
      expect(connections.value).toEqual([])
      expect(selectedCredential.value).toBeNull()
    })
  })
})
