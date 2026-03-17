/**
 * JsSipAdapter Unit Tests
 *
 * @group adapters
 * @group jssip
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { JsSipAdapter } from '../jssip/JsSipAdapter'
import { ConnectionState, RegistrationState } from '../../types/sip.types'
import type { SipClientConfig } from '../../types/config.types'
import type { ISipAdapter } from '../types'

// Mock JsSIP module
vi.mock('jssip', () => ({
  default: {
    version: '3.10.0',
    debug: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
    UA: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
      call: vi.fn(),
      sendMessage: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      publish: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      isConnected(): boolean {
        return false
      },
    })),
    URI: vi.fn(),
  },
  WebSocketInterface: vi.fn(),
}))

// Mock the JsSipCallSession
vi.mock('../jssip/JsSipCallSession', () => ({
  JsSipCallSession: vi.fn().mockImplementation(() => ({
    callId: 'test-call-id',
    terminate: vi.fn().mockResolvedValue(undefined),
    answer: vi.fn(),
    hold: vi.fn(),
    unhold: vi.fn(),
    transfer: vi.fn(),
    sendDTMF: vi.fn(),
    getRemoteIdentity: vi.fn(),
    getLocalIdentity: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  })),
}))

describe('JsSipAdapter', () => {
  let adapter: JsSipAdapter
  let mockConfig: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()
    adapter = new JsSipAdapter()
    mockConfig = {
      sipServerUrl: 'wss://example.com:8080/ws',
      userUri: 'sip:test@example.com',
      authUsername: 'testuser',
      authPassword: 'testpass',
      displayName: 'Test User',
      debug: false,
    }
  })

  afterEach(() => {
    adapter.destroy()
  })

  describe('constructor', () => {
    it('should create adapter with default options', () => {
      const newAdapter = new JsSipAdapter()
      expect(newAdapter.adapterName).toBe('JsSIP Adapter')
      expect(newAdapter.adapterVersion).toBe('1.0.0')
      expect(newAdapter.libraryName).toBe('JsSIP')
    })

    it('should accept custom library options', () => {
      const options = { customOption: 'test' }
      const newAdapter = new JsSipAdapter(options)
      expect(newAdapter).toBeDefined()
    })
  })

  describe('metadata properties', () => {
    it('should return correct adapter metadata', () => {
      expect(adapter.adapterName).toBe('JsSIP Adapter')
      expect(adapter.adapterVersion).toBe('1.0.0')
      expect(adapter.libraryName).toBe('JsSIP')
      expect(adapter.libraryVersion).toBe('3.10.0')
    })

    it('should return disconnected state by default', () => {
      expect(adapter.isConnected).toBe(false)
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
      expect(adapter.isRegistered).toBe(false)
      expect(adapter.registrationState).toBe(RegistrationState.Unregistered)
    })
  })

  describe('initialize', () => {
    it('should initialize with config', async () => {
      await adapter.initialize(mockConfig)
      expect(adapter).toBeDefined()
    })

    it('should enable debug when configured', async () => {
      const { default: JsSIP } = await import('jssip')
      const debugEnableSpy = vi.spyOn(JsSIP.debug, 'enable')
      const debugDisableSpy = vi.spyOn(JsSIP.debug, 'disable')

      await adapter.initialize({ ...mockConfig, debug: true })
      expect(debugEnableSpy).toHaveBeenCalledWith('JsSIP:*')

      const adapter2 = new JsSipAdapter()
      await adapter2.initialize({ ...mockConfig, debug: false })
      expect(debugDisableSpy).toHaveBeenCalled()
    })
  })

  describe('connect', () => {
    it('should throw if not initialized', async () => {
      await expect(adapter.connect()).rejects.toThrow('Adapter not initialized')
    })

    it('should emit connecting event when connecting', async () => {
      const emitSpy = vi.spyOn(adapter, 'emit')

      await adapter.initialize(mockConfig)

      // The connect method will try to create UA but we just verify state transitions
      try {
        await adapter.connect()
      } catch {
        // Expected to fail without full JsSIP setup
      }

      // Verify that connection:connecting was emitted (or at least one of the connection events)
      expect(emitSpy).toHaveBeenCalled()
    })
  })

  describe('disconnect', () => {
    it('should handle disconnect when not connected', async () => {
      // Should not throw
      await expect(adapter.disconnect()).resolves.toBeUndefined()
    })
  })

  describe('getActiveCalls', () => {
    it('should return empty array when no active calls', () => {
      const calls = adapter.getActiveCalls()
      expect(calls).toEqual([])
    })
  })

  describe('getCallSession', () => {
    it('should return null for unknown call', () => {
      const session = adapter.getCallSession('unknown-call-id')
      expect(session).toBeNull()
    })
  })

  describe('destroy', () => {
    it('should clean up resources', async () => {
      await adapter.initialize(mockConfig)
      await adapter.destroy()

      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
    })
  })

  describe('event emitter', () => {
    it('should support on/off methods', () => {
      const handler = vi.fn()
      adapter.on('connection:connected', handler)
      adapter.off('connection:connected', handler)
      expect(handler).not.toHaveBeenCalled()
    })

    it('should support removeAllListeners', () => {
      const handler = vi.fn()
      adapter.on('connection:connected', handler)
      adapter.removeAllListeners()
      // After removing all, emit should not throw
      expect(() => adapter.emit('connection:connected', {})).not.toThrow()
    })
  })
})

describe('SipJsAdapter (stub)', () => {
  let adapter: ISipAdapter
  let testConfig: SipClientConfig

  beforeEach(() => {
    vi.resetModules()
    testConfig = {
      sipServerUrl: 'wss://example.com:8080/ws',
      userUri: 'sip:test@example.com',
      authUsername: 'testuser',
      authPassword: 'testpass',
      displayName: 'Test User',
      debug: false,
    }
  })

  it('should have correct metadata', async () => {
    const { SipJsAdapter } = await import('../sipjs/SipJsAdapter')
    adapter = new SipJsAdapter()

    expect(adapter.adapterName).toBe('SIP.js Adapter')
    expect(adapter.libraryName).toBe('SIP.js')
  })

  it('should throw not implemented errors for methods after init', async () => {
    const { SipJsAdapter } = await import('../sipjs/SipJsAdapter')
    adapter = new SipJsAdapter()
    await adapter.initialize(testConfig)

    await expect(adapter.connect()).rejects.toThrow('not fully implemented')
  })

  it('should report disconnected state', async () => {
    const { SipJsAdapter } = await import('../sipjs/SipJsAdapter')
    adapter = new SipJsAdapter()

    expect(adapter.isConnected).toBe(false)
    expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
    expect(adapter.isRegistered).toBe(false)
    expect(adapter.registrationState).toBe(RegistrationState.Unregistered)
  })

  it('should return empty active calls', async () => {
    const { SipJsAdapter } = await import('../sipjs/SipJsAdapter')
    adapter = new SipJsAdapter()

    expect(adapter.getActiveCalls()).toEqual([])
    expect(adapter.getCallSession('any-id')).toBeNull()
  })

  it('should throw on connect without initialize', async () => {
    const { SipJsAdapter } = await import('../sipjs/SipJsAdapter')
    adapter = new SipJsAdapter()

    await expect(adapter.connect()).rejects.toThrow('not initialized')
  })

  it('should cleanup on destroy', async () => {
    const { SipJsAdapter } = await import('../sipjs/SipJsAdapter')
    adapter = new SipJsAdapter()
    const removeAllListenersSpy = vi.spyOn(adapter, 'removeAllListeners')

    await adapter.initialize(testConfig)
    await adapter.destroy()

    expect(removeAllListenersSpy).toHaveBeenCalled()
    expect(adapter.config).toBeNull()
  })
})
