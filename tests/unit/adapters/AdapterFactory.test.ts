/**
 * AdapterFactory unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdapterFactory, createSipAdapter } from '@/adapters/AdapterFactory'
import type { ISipAdapter, AdapterConfig } from '@/adapters/types'
import type { SipClientConfig } from '@/types/config.types'

// Mock custom adapter for testing
class MockCustomAdapter {
  public adapterName = 'MockAdapter'
  public adapterVersion = '1.0.0'
  public libraryName = 'MockLib'
  public libraryVersion = '2.0.0'
  public isConnected = false
  public connectionState = 'disconnected'
  public isRegistered = false
  public registrationState = 'unregistered'

  public initialize = vi.fn().mockResolvedValue(undefined)
  public connect = vi.fn().mockResolvedValue(undefined)
  public disconnect = vi.fn().mockResolvedValue(undefined)
  public register = vi.fn().mockResolvedValue(undefined)
  public unregister = vi.fn().mockResolvedValue(undefined)
  public call = vi.fn()
  public sendMessage = vi.fn()
  public sendDTMF = vi.fn()
  public subscribe = vi.fn()
  public unsubscribe = vi.fn()
  public publish = vi.fn()
  public getActiveCalls = vi.fn().mockReturnValue([])
  public getCallSession = vi.fn().mockReturnValue(null)
  public destroy = vi.fn().mockResolvedValue(undefined)
  public on = vi.fn()
  public off = vi.fn()
  public once = vi.fn()
  public emit = vi.fn()
}

describe('AdapterFactory', () => {
  let sipConfig: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()
    sipConfig = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
    }
  })

  describe('createAdapter()', () => {
    it('should throw error for jssip adapter (not implemented)', async () => {
      const adapterConfig: AdapterConfig = {
        library: 'jssip',
      }

      await expect(AdapterFactory.createAdapter(sipConfig, adapterConfig)).rejects.toThrow(
        'JsSIP adapter is not yet implemented'
      )
    })

    it('should throw error for sipjs adapter (not implemented)', async () => {
      const adapterConfig: AdapterConfig = {
        library: 'sipjs',
      }

      await expect(AdapterFactory.createAdapter(sipConfig, adapterConfig)).rejects.toThrow(
        'SIP.js adapter is not yet implemented'
      )
    })

    it('should create custom adapter successfully', async () => {
      const mockAdapter = new MockCustomAdapter() as unknown as ISipAdapter
      const adapterConfig: AdapterConfig = {
        library: 'custom',
        customAdapter: mockAdapter,
      }

      const adapter = await AdapterFactory.createAdapter(sipConfig, adapterConfig)

      expect(adapter).toBe(mockAdapter)
      expect(mockAdapter.initialize).toHaveBeenCalledWith(sipConfig)
    })

    it('should throw error when custom adapter not provided', async () => {
      const adapterConfig: AdapterConfig = {
        library: 'custom',
        // Missing customAdapter
      }

      await expect(AdapterFactory.createAdapter(sipConfig, adapterConfig)).rejects.toThrow(
        'Custom adapter must be provided when library is set to "custom"'
      )
    })

    it('should pass library options to custom adapter', async () => {
      const mockAdapter = new MockCustomAdapter() as unknown as ISipAdapter
      const libraryOptions = { debug: true, timeout: 30000 }
      const adapterConfig: AdapterConfig = {
        library: 'custom',
        customAdapter: mockAdapter,
        libraryOptions,
      }

      await AdapterFactory.createAdapter(sipConfig, adapterConfig)

      expect(mockAdapter.initialize).toHaveBeenCalledWith(sipConfig)
    })
  })

  describe('isLibraryAvailable()', () => {
    it('should return false for jssip (not implemented)', async () => {
      const available = await AdapterFactory.isLibraryAvailable('jssip')
      expect(available).toBe(false)
    })

    it('should return false for sipjs (not implemented)', async () => {
      const available = await AdapterFactory.isLibraryAvailable('sipjs')
      expect(available).toBe(false)
    })
  })

  describe('getAvailableLibraries()', () => {
    it('should return empty array (no adapters implemented)', async () => {
      const libraries = await AdapterFactory.getAvailableLibraries()
      expect(libraries).toEqual([])
    })
  })

  describe('getAdapterInfo()', () => {
    it('should return null for jssip (not implemented)', async () => {
      const info = await AdapterFactory.getAdapterInfo('jssip')
      expect(info).toBeNull()
    })

    it('should return null for sipjs (not implemented)', async () => {
      const info = await AdapterFactory.getAdapterInfo('sipjs')
      expect(info).toBeNull()
    })
  })

  describe('createSipAdapter()', () => {
    it('should throw error with default jssip library', async () => {
      await expect(createSipAdapter(sipConfig)).rejects.toThrow(
        'JsSIP adapter is not yet implemented'
      )
    })

    it('should throw error with explicit jssip library', async () => {
      await expect(createSipAdapter(sipConfig, 'jssip')).rejects.toThrow(
        'JsSIP adapter is not yet implemented'
      )
    })

    it('should throw error with sipjs library', async () => {
      await expect(createSipAdapter(sipConfig, 'sipjs')).rejects.toThrow(
        'SIP.js adapter is not yet implemented'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle adapter initialization errors', async () => {
      const mockAdapter = new MockCustomAdapter() as unknown as ISipAdapter
      mockAdapter.initialize = vi.fn().mockRejectedValue(new Error('Init failed'))

      const adapterConfig: AdapterConfig = {
        library: 'custom',
        customAdapter: mockAdapter,
      }

      await expect(AdapterFactory.createAdapter(sipConfig, adapterConfig)).rejects.toThrow(
        'Init failed'
      )
    })
  })

  describe('Type Safety', () => {
    it('should handle exhaustive library type checking', async () => {
      // This tests the exhaustive check in the default case
      const adapterConfig = {
        library: 'invalid' as any,
      }

      await expect(AdapterFactory.createAdapter(sipConfig, adapterConfig)).rejects.toThrow(
        'Unsupported adapter library'
      )
    })
  })

  describe('Custom Adapter Integration', () => {
    it('should verify custom adapter implements ISipAdapter interface', async () => {
      const mockAdapter = new MockCustomAdapter() as unknown as ISipAdapter
      const adapterConfig: AdapterConfig = {
        library: 'custom',
        customAdapter: mockAdapter,
      }

      const adapter = await AdapterFactory.createAdapter(sipConfig, adapterConfig)

      // Verify adapter has required properties
      expect(adapter).toHaveProperty('adapterName')
      expect(adapter).toHaveProperty('adapterVersion')
      expect(adapter).toHaveProperty('libraryName')
      expect(adapter).toHaveProperty('libraryVersion')
      expect(adapter).toHaveProperty('isConnected')
      expect(adapter).toHaveProperty('connectionState')
      expect(adapter).toHaveProperty('isRegistered')
      expect(adapter).toHaveProperty('registrationState')

      // Verify adapter has required methods
      expect(adapter).toHaveProperty('initialize')
      expect(adapter).toHaveProperty('connect')
      expect(adapter).toHaveProperty('disconnect')
      expect(adapter).toHaveProperty('register')
      expect(adapter).toHaveProperty('unregister')
      expect(adapter).toHaveProperty('destroy')
    })

    it('should get adapter metadata from custom adapter', async () => {
      const mockAdapter = new MockCustomAdapter() as unknown as ISipAdapter
      const adapterConfig: AdapterConfig = {
        library: 'custom',
        customAdapter: mockAdapter,
      }

      const adapter = await AdapterFactory.createAdapter(sipConfig, adapterConfig)

      expect(adapter.adapterName).toBe('MockAdapter')
      expect(adapter.adapterVersion).toBe('1.0.0')
      expect(adapter.libraryName).toBe('MockLib')
      expect(adapter.libraryVersion).toBe('2.0.0')
    })
  })
})
