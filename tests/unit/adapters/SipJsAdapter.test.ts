/**
 * SipJsAdapter unit tests (stub implementation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipJsAdapter, isSipJsAvailable } from '@/adapters/sipjs/SipJsAdapter'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import type { SipClientConfig } from '@/types/config.types'

describe('SipJsAdapter (Stub)', () => {
  let adapter: SipJsAdapter
  let sipConfig: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()

    sipConfig = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
    }

    adapter = new SipJsAdapter()
  })

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy()
    }
  })

  describe('Metadata', () => {
    it('should have correct adapter metadata', () => {
      expect(adapter.adapterName).toBe('SIP.js Adapter')
      expect(adapter.adapterVersion).toBe('1.0.0')
      expect(adapter.libraryName).toBe('SIP.js')
      expect(adapter.libraryVersion).toBe('0.21.x')
    })
  })

  describe('Initial State', () => {
    it('should start disconnected', () => {
      expect(adapter.isConnected).toBe(false)
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should start unregistered', () => {
      expect(adapter.isRegistered).toBe(false)
      expect(adapter.registrationState).toBe(RegistrationState.Unregistered)
    })
  })

  describe('initialize()', () => {
    it('should store configuration', async () => {
      await adapter.initialize(sipConfig)
      // Should not throw - initialization just stores config
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
    })
  })

  describe('Stub Methods', () => {
    beforeEach(async () => {
      await adapter.initialize(sipConfig)
    })

    it('connect() should throw not implemented error', async () => {
      await expect(adapter.connect()).rejects.toThrow(
        'SIP.js adapter not fully implemented'
      )
    })

    it('disconnect() should throw not implemented error', async () => {
      await expect(adapter.disconnect()).rejects.toThrow(
        'SIP.js adapter not fully implemented'
      )
    })

    it('register() should throw not implemented error', async () => {
      await expect(adapter.register()).rejects.toThrow(
        'SIP.js adapter not fully implemented'
      )
    })

    it('unregister() should throw not implemented error', async () => {
      await expect(adapter.unregister()).rejects.toThrow(
        'SIP.js adapter not fully implemented'
      )
    })

    it('call() should throw not implemented error', async () => {
      await expect(adapter.call('sip:target@test.com')).rejects.toThrow(
        'SIP.js adapter not fully implemented'
      )
    })

    it('sendMessage() should throw not implemented error', async () => {
      await expect(
        adapter.sendMessage('sip:target@test.com', 'Hello')
      ).rejects.toThrow('SIP.js adapter not fully implemented')
    })

    it('sendDTMF() should throw not implemented error', async () => {
      await expect(adapter.sendDTMF('call-id', '1')).rejects.toThrow(
        'SIP.js adapter not fully implemented'
      )
    })

    it('subscribe() should throw not implemented error', async () => {
      await expect(
        adapter.subscribe('sip:target@test.com', 'presence')
      ).rejects.toThrow('SIP.js adapter not fully implemented')
    })

    it('unsubscribe() should throw not implemented error', async () => {
      await expect(
        adapter.unsubscribe('sip:target@test.com', 'presence')
      ).rejects.toThrow('SIP.js adapter not fully implemented')
    })

    it('publish() should throw not implemented error', async () => {
      await expect(
        adapter.publish('presence', { status: 'available' })
      ).rejects.toThrow('SIP.js adapter not fully implemented')
    })
  })

  describe('connect() without initialization', () => {
    it('should throw not initialized error', async () => {
      // Create new adapter without initialize
      const newAdapter = new SipJsAdapter()
      await expect(newAdapter.connect()).rejects.toThrow('Adapter not initialized')
    })
  })

  describe('Session Management', () => {
    it('getActiveCalls() should return empty array', () => {
      expect(adapter.getActiveCalls()).toEqual([])
    })

    it('getCallSession() should return null', () => {
      expect(adapter.getCallSession('any-id')).toBeNull()
    })
  })

  describe('destroy()', () => {
    it('should cleanup without error', async () => {
      await adapter.initialize(sipConfig)
      await expect(adapter.destroy()).resolves.not.toThrow()
    })
  })

  describe('Library Options', () => {
    it('should accept library options in constructor', () => {
      const options = { debug: true }
      const adapterWithOptions = new SipJsAdapter(options)

      expect(adapterWithOptions.adapterName).toBe('SIP.js Adapter')
    })
  })
})

describe('isSipJsAvailable()', () => {
  it('should return false when sip.js is not installed', async () => {
    const available = await isSipJsAvailable()
    expect(available).toBe(false)
  })
})
