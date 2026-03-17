/**
 * AdapterFactory Unit Tests
 *
 * @group adapters
 * @group factory
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AdapterFactory, createSipAdapter } from '../AdapterFactory'
import type { ISipAdapter, AdapterConfig } from '../types'

// Mock adapter class that can be constructed
class MockJsSipAdapter implements ISipAdapter {
  readonly adapterName = 'JsSIP Adapter'
  readonly adapterVersion = '1.0.0'
  readonly libraryName = 'JsSIP'
  readonly libraryVersion = '3.10.0'
  readonly isConnected = false
  readonly connectionState = 'disconnected' as const
  readonly isRegistered = false
  readonly registrationState = 'unregistered' as const

  initialize = vi.fn().mockResolvedValue(undefined)
  connect = vi.fn().mockResolvedValue(undefined)
  disconnect = vi.fn().mockResolvedValue(undefined)
  register = vi.fn().mockResolvedValue(undefined)
  unregister = vi.fn().mockResolvedValue(undefined)
  on = vi.fn()
  off = vi.fn()
  emit = vi.fn()
  removeAllListeners = vi.fn()
}

class MockSipJsAdapter implements ISipAdapter {
  readonly adapterName = 'SIP.js Adapter'
  readonly adapterVersion = '1.0.0'
  readonly libraryName = 'SIP.js'
  readonly libraryVersion = '1.0.0'
  readonly isConnected = false
  readonly connectionState = 'disconnected' as const
  readonly isRegistered = false
  readonly registrationState = 'unregistered' as const

  initialize = vi.fn().mockResolvedValue(undefined)
  connect = vi.fn().mockResolvedValue(undefined)
  disconnect = vi.fn().mockResolvedValue(undefined)
  register = vi.fn().mockResolvedValue(undefined)
  unregister = vi.fn().mockResolvedValue(undefined)
  on = vi.fn()
  off = vi.fn()
  emit = vi.fn()
  removeAllListeners = vi.fn()
}

// Create mock functions outside the mock factory
const mockIsSipJsAvailable = vi.fn().mockResolvedValue(true)

// Mock the JSSIP adapter module
vi.mock('../jssip/JsSipAdapter', () => ({
  JsSipAdapter: MockJsSipAdapter,
}))

// Mock the SIP.js adapter module
vi.mock('../sipjs/SipJsAdapter', () => ({
  SipJsAdapter: MockSipJsAdapter,
  isSipJsAvailable: mockIsSipJsAvailable,
}))

// Mock jssip module
vi.mock('jssip', () => ({
  default: {
    Version: '3.10.0',
  },
}))

describe('AdapterFactory', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockIsSipJsAvailable.mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createAdapter', () => {
    const mockSipConfig = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:user@example.com',
      password: 'secret',
    }

    it('should create a JsSIP adapter when library is jssip', async () => {
      const adapter = await AdapterFactory.createAdapter(mockSipConfig, {
        library: 'jssip',
      })

      expect(adapter).toBeDefined()
      expect(adapter.adapterName).toBe('JsSIP Adapter')
      expect(adapter.libraryName).toBe('JsSIP')
    })

    it('should create a SIP.js adapter when library is sipjs', async () => {
      const adapter = await AdapterFactory.createAdapter(mockSipConfig, {
        library: 'sipjs',
      })

      expect(adapter).toBeDefined()
      expect(adapter.adapterName).toBe('SIP.js Adapter')
      expect(adapter.libraryName).toBe('SIP.js')
    })

    it('should use custom adapter when library is custom', async () => {
      const customAdapter = {
        adapterName: 'Custom Adapter',
        adapterVersion: '1.0.0',
        libraryName: 'Custom',
        libraryVersion: '1.0.0',
        isConnected: false,
        connectionState: 'disconnected' as const,
        isRegistered: false,
        registrationState: 'unregistered' as const,
        initialize: vi.fn().mockResolvedValue(undefined),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        register: vi.fn().mockResolvedValue(undefined),
        unregister: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        removeAllListeners: vi.fn(),
      }

      const adapter = await AdapterFactory.createAdapter(mockSipConfig, {
        library: 'custom',
        customAdapter,
      })

      expect(adapter).toBe(customAdapter)
    })

    it('should throw error when custom adapter is not provided', async () => {
      await expect(
        AdapterFactory.createAdapter(mockSipConfig, {
          library: 'custom',
        } as AdapterConfig)
      ).rejects.toThrow('Custom adapter must be provided when library is set to "custom"')
    })

    it('should throw error for unsupported library', async () => {
      await expect(
        AdapterFactory.createAdapter(mockSipConfig, {
          library: 'unsupported' as 'jssip',
        })
      ).rejects.toThrow('Unsupported adapter library')
    })

    it('should initialize adapter with SIP configuration', async () => {
      const adapter = await AdapterFactory.createAdapter(mockSipConfig, {
        library: 'jssip',
      })

      expect(adapter.initialize).toHaveBeenCalledWith(mockSipConfig)
    })
  })

  describe('isLibraryAvailable', () => {
    it('should return true when jssip is available', async () => {
      const result = await AdapterFactory.isLibraryAvailable('jssip')
      expect(result).toBe(true)
    })

    it('should return true when sipjs is available', async () => {
      mockIsSipJsAvailable.mockResolvedValue(true)
      const result = await AdapterFactory.isLibraryAvailable('sipjs')
      expect(result).toBe(true)
    })

    it('should return false for unsupported library', async () => {
      const result = await AdapterFactory.isLibraryAvailable('unsupported' as 'jssip')
      expect(result).toBe(false)
    })
  })

  describe('getAvailableLibraries', () => {
    it('should return array of available libraries', async () => {
      mockIsSipJsAvailable.mockResolvedValue(true)
      const libraries = await AdapterFactory.getAvailableLibraries()

      expect(Array.isArray(libraries)).toBe(true)
      expect(libraries).toContain('jssip')
      expect(libraries).toContain('sipjs')
    })
  })

  describe('getAdapterInfo', () => {
    it('should return adapter info for jssip', async () => {
      const info = await AdapterFactory.getAdapterInfo('jssip')

      expect(info).toBeDefined()
      expect(info?.adapterName).toBe('JsSIP Adapter')
      expect(info?.libraryName).toBe('JsSIP')
      expect(info?.adapterVersion).toBe('1.0.0')
      expect(info?.libraryVersion).toBe('3.10.0')
    })

    it('should return adapter info for sipjs', async () => {
      const info = await AdapterFactory.getAdapterInfo('sipjs')

      expect(info).toBeDefined()
      expect(info?.adapterName).toBe('SIP.js Adapter')
      expect(info?.libraryName).toBe('SIP.js')
    })

    it('should return null for unsupported library', async () => {
      const info = await AdapterFactory.getAdapterInfo('unsupported' as 'jssip')
      expect(info).toBeNull()
    })
  })
})

describe('createSipAdapter', () => {
  const mockSipConfig = {
    uri: 'wss://sip.example.com:7443',
    sipUri: 'sip:user@example.com',
    password: 'secret',
  }

  it('should create adapter with default jssip library', async () => {
    const adapter = await createSipAdapter(mockSipConfig)

    expect(adapter).toBeDefined()
    expect(adapter.adapterName).toBe('JsSIP Adapter')
  })

  it('should create adapter with specified library', async () => {
    const adapter = await createSipAdapter(mockSipConfig, 'sipjs')

    expect(adapter).toBeDefined()
    expect(adapter.adapterName).toBe('SIP.js Adapter')
  })
})
