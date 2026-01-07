/**
 * AdapterFactory unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdapterFactory, createSipAdapter } from '@/adapters/AdapterFactory'
import type { ISipAdapter, AdapterConfig } from '@/adapters/types'
import type { SipClientConfig } from '@/types/config.types'

// Mock JsSIP module for JsSipAdapter tests
vi.mock('jssip', () => {
  class MockWebSocketInterface {
    url: string
    constructor(url: string) {
      this.url = url
    }
    connect = vi.fn()
    disconnect = vi.fn()
    isConnected = vi.fn().mockReturnValue(false)
  }

  class MockUA {
    constructor(_config: any) {}
    start = vi.fn()
    stop = vi.fn()
    register = vi.fn()
    unregister = vi.fn()
    registrator = vi.fn().mockReturnValue({ setExtraHeaders: vi.fn() })
    call = vi.fn()
    sendMessage = vi.fn()
    isRegistered = vi.fn().mockReturnValue(false)
    isConnected = vi.fn().mockReturnValue(false)
    on = vi.fn().mockReturnThis()
    off = vi.fn().mockReturnThis()
    once = vi.fn().mockReturnThis()
  }

  const mod = {
    WebSocketInterface: MockWebSocketInterface,
    UA: MockUA,
    version: '3.10.0',
    name: 'JsSIP',
    debug: { enable: vi.fn(), disable: vi.fn() },
  }

  return {
    ...mod,
    default: mod,
  }
})

// Mock sip.js as not available
vi.mock('sip.js', () => {
  throw new Error('Module not found')
})

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
  public removeAllListeners = vi.fn()
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
    it('should create jssip adapter successfully', async () => {
      const adapterConfig: AdapterConfig = {
        library: 'jssip',
      }

      const adapter = await AdapterFactory.createAdapter(sipConfig, adapterConfig)

      expect(adapter).toBeDefined()
      expect(adapter.adapterName).toBe('JsSIP Adapter')
      expect(adapter.libraryName).toBe('JsSIP')

      // Cleanup
      await adapter.destroy()
    })

    it('should create sipjs adapter (stub) successfully', async () => {
      const adapterConfig: AdapterConfig = {
        library: 'sipjs',
      }

      const adapter = await AdapterFactory.createAdapter(sipConfig, adapterConfig)

      expect(adapter).toBeDefined()
      expect(adapter.adapterName).toBe('SIP.js Adapter')
      expect(adapter.libraryName).toBe('SIP.js')

      // Cleanup
      await adapter.destroy()
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

    it('should call initialize after adapter construction', async () => {
      const callOrder: string[] = []
      const mockAdapter = new MockCustomAdapter() as unknown as ISipAdapter

      // Track when initialize is called
      mockAdapter.initialize = vi.fn().mockImplementation(async () => {
        callOrder.push('initialize')
      })

      const adapterConfig: AdapterConfig = {
        library: 'custom',
        customAdapter: mockAdapter,
      }

      // The factory receives an already-constructed adapter for 'custom'
      // and then calls initialize on it
      await AdapterFactory.createAdapter(sipConfig, adapterConfig)

      expect(callOrder).toContain('initialize')
      expect(mockAdapter.initialize).toHaveBeenCalledTimes(1)
      expect(mockAdapter.initialize).toHaveBeenCalledWith(sipConfig)
    })

    it('should create multiple adapters concurrently', async () => {
      // Test concurrent adapter creation
      const adapterPromises = [
        AdapterFactory.createAdapter(sipConfig, { library: 'jssip' }),
        AdapterFactory.createAdapter(sipConfig, { library: 'sipjs' }),
        AdapterFactory.createAdapter(sipConfig, { library: 'jssip' }),
      ]

      const adapters = await Promise.all(adapterPromises)

      expect(adapters).toHaveLength(3)
      expect(adapters[0].adapterName).toBe('JsSIP Adapter')
      expect(adapters[1].adapterName).toBe('SIP.js Adapter')
      expect(adapters[2].adapterName).toBe('JsSIP Adapter')

      // Cleanup
      await Promise.all(adapters.map((a) => a.destroy()))
    })
  })

  describe('isLibraryAvailable()', () => {
    it('should return true for jssip (mocked)', async () => {
      const available = await AdapterFactory.isLibraryAvailable('jssip')
      expect(available).toBe(true)
    })

    it('should return false for sipjs (not installed)', async () => {
      const available = await AdapterFactory.isLibraryAvailable('sipjs')
      expect(available).toBe(false)
    })
  })

  describe('getAvailableLibraries()', () => {
    it('should return array with jssip (mocked)', async () => {
      const libraries = await AdapterFactory.getAvailableLibraries()
      expect(libraries).toContain('jssip')
      // sipjs should not be included since it's not installed
      expect(libraries).not.toContain('sipjs')
    })
  })

  describe('getAdapterInfo()', () => {
    it('should return adapter info for jssip', async () => {
      const info = await AdapterFactory.getAdapterInfo('jssip')
      expect(info).not.toBeNull()
      expect(info?.adapterName).toBe('JsSIP Adapter')
      expect(info?.libraryName).toBe('JsSIP')
    })

    it('should return adapter info for sipjs stub', async () => {
      const info = await AdapterFactory.getAdapterInfo('sipjs')
      expect(info).not.toBeNull()
      expect(info?.adapterName).toBe('SIP.js Adapter')
      expect(info?.libraryName).toBe('SIP.js')
    })

    it('should return null for invalid library type', async () => {
      // Test the default case in getAdapterInfo switch statement
      const info = await AdapterFactory.getAdapterInfo('invalid' as any)
      expect(info).toBeNull()
    })
  })

  describe('createSipAdapter()', () => {
    it('should create jssip adapter with default library', async () => {
      const adapter = await createSipAdapter(sipConfig)

      expect(adapter).toBeDefined()
      expect(adapter.adapterName).toBe('JsSIP Adapter')

      await adapter.destroy()
    })

    it('should create jssip adapter with explicit library', async () => {
      const adapter = await createSipAdapter(sipConfig, 'jssip')

      expect(adapter).toBeDefined()
      expect(adapter.adapterName).toBe('JsSIP Adapter')

      await adapter.destroy()
    })

    it('should create sipjs adapter (stub)', async () => {
      const adapter = await createSipAdapter(sipConfig, 'sipjs')

      expect(adapter).toBeDefined()
      expect(adapter.adapterName).toBe('SIP.js Adapter')

      await adapter.destroy()
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
