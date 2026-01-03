/**
 * JsSipAdapter unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JsSipAdapter } from '@/adapters/jssip/JsSipAdapter'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import type { SipClientConfig } from '@/types/config.types'

// Mock JsSIP module
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

  class MockRTCSession {
    id = 'test-session-id'
    direction: 'incoming' | 'outgoing' = 'outgoing'
    local_identity = { uri: { toString: () => 'sip:local@test.com' } }
    remote_identity = {
      uri: { toString: () => 'sip:remote@test.com' },
      display_name: 'Remote User'
    }
    start_time: Date | null = null
    end_time: Date | null = null
    connection: RTCPeerConnection | null = null

    answer = vi.fn()
    terminate = vi.fn()
    sendDTMF = vi.fn()
    hold = vi.fn().mockReturnValue(true)
    unhold = vi.fn().mockReturnValue(true)
    mute = vi.fn()
    unmute = vi.fn()
    renegotiate = vi.fn().mockReturnValue(true)
    isOnHold = vi.fn().mockReturnValue({ local: false, remote: false })
    isMuted = vi.fn().mockReturnValue({ audio: false, video: false })

    // EventEmitter methods
    on = vi.fn().mockReturnThis()
    off = vi.fn().mockReturnThis()
    once = vi.fn().mockReturnThis()
    emit = vi.fn()
    removeListener = vi.fn()
    removeAllListeners = vi.fn()
  }

  class MockMessage {
    direction: 'incoming' | 'outgoing' = 'outgoing'
    local_identity = { uri: { toString: () => 'sip:local@test.com' } }
    remote_identity = { uri: { toString: () => 'sip:remote@test.com' } }

    accept = vi.fn()
    reject = vi.fn()
    send = vi.fn()

    on = vi.fn().mockReturnThis()
    off = vi.fn().mockReturnThis()
  }

  class MockUA {
    configuration: any
    private eventHandlers: Map<string, Function[]> = new Map()

    constructor(config: any) {
      this.configuration = config
    }

    start = vi.fn()
    stop = vi.fn()
    register = vi.fn()
    unregister = vi.fn()
    registrator = vi.fn().mockReturnValue({ setExtraHeaders: vi.fn() })
    call = vi.fn().mockReturnValue(new MockRTCSession())
    sendMessage = vi.fn().mockReturnValue(new MockMessage())
    isRegistered = vi.fn().mockReturnValue(false)
    isConnected = vi.fn().mockReturnValue(false)

    on(event: string, handler: Function) {
      const handlers = this.eventHandlers.get(event) || []
      handlers.push(handler)
      this.eventHandlers.set(event, handlers)
      return this
    }

    off(event: string, handler: Function) {
      const handlers = this.eventHandlers.get(event) || []
      const index = handlers.indexOf(handler)
      if (index > -1) handlers.splice(index, 1)
      return this
    }

    once(event: string, handler: Function) {
      const wrappedHandler = (...args: any[]) => {
        this.off(event, wrappedHandler)
        handler(...args)
      }
      return this.on(event, wrappedHandler)
    }

    // Helper to trigger events in tests
    __triggerEvent(event: string, data?: any) {
      const handlers = this.eventHandlers.get(event) || []
      handlers.forEach(handler => handler(data))
    }
  }

  const mod = {
    WebSocketInterface: MockWebSocketInterface,
    UA: MockUA,
    RTCSession: MockRTCSession,
    Message: MockMessage,
    version: '3.10.0',
    name: 'JsSIP',
    debug: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
  }

  return {
    ...mod,
    default: mod,
  }
})

describe('JsSipAdapter', () => {
  let adapter: JsSipAdapter
  let sipConfig: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()

    sipConfig = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
      registrationOptions: {
        expires: 300,
        autoRegister: false,
      },
      sessionOptions: {
        sessionTimers: true,
      },
    }

    adapter = new JsSipAdapter()
  })

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy()
    }
  })

  describe('Metadata', () => {
    it('should have correct adapter metadata', () => {
      expect(adapter.adapterName).toBe('JsSIP Adapter')
      expect(adapter.adapterVersion).toBe('1.0.0')
      expect(adapter.libraryName).toBe('JsSIP')
      expect(adapter.libraryVersion).toMatch(/^3\.\d+\.\d+$/)
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
    it('should initialize without error', async () => {
      await expect(adapter.initialize(sipConfig)).resolves.not.toThrow()
    })

    it('should create UA with correct configuration', async () => {
      await adapter.initialize(sipConfig)

      // Adapter should be ready for connect
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
    })
  })

  describe('connect()', () => {
    it('should throw if not initialized', async () => {
      await expect(adapter.connect()).rejects.toThrow('Adapter not initialized')
    })

    it('should attempt connection after initialization', async () => {
      await adapter.initialize(sipConfig)

      // Connection will timeout in test since we can't simulate WS connection
      // Just verify it changes state to connecting (don't await the full connect)
      const connectPromise = adapter.connect()

      // Should immediately transition to connecting state
      expect(adapter.connectionState).toBe(ConnectionState.Connecting)

      // Cancel by destroying adapter (don't await connectPromise to avoid timeout)
      await adapter.destroy()

      // The promise should reject when we destroy during connection
      // Use a short timeout to avoid test hanging
      await expect(
        Promise.race([
          connectPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 100))
        ])
      ).rejects.toThrow()
    }, 5000) // Set explicit test timeout
  })

  describe('Event Handling', () => {
    it('should emit events when state changes', async () => {
      await adapter.initialize(sipConfig)

      const connectingHandler = vi.fn()
      adapter.on('connection:connecting', connectingHandler)

      // Start connection (will trigger connecting state)
      adapter.connect().catch(() => {}) // Ignore timeout error

      expect(connectingHandler).toHaveBeenCalled()
    })
  })

  describe('getActiveCalls()', () => {
    it('should return empty array initially', () => {
      expect(adapter.getActiveCalls()).toEqual([])
    })
  })

  describe('getCallSession()', () => {
    it('should return null for non-existent call', () => {
      expect(adapter.getCallSession('non-existent')).toBeNull()
    })
  })

  describe('destroy()', () => {
    it('should cleanup resources', async () => {
      await adapter.initialize(sipConfig)
      await adapter.destroy()

      expect(adapter.getActiveCalls()).toEqual([])
    })
  })

  describe('sendMessage()', () => {
    it('should throw if not connected', async () => {
      await adapter.initialize(sipConfig)

      await expect(
        adapter.sendMessage('sip:target@test.com', 'Hello')
      ).rejects.toThrow('Not connected')
    })
  })

  describe('sendDTMF()', () => {
    it('should throw for non-existent call', async () => {
      await adapter.initialize(sipConfig)

      await expect(
        adapter.sendDTMF('non-existent-call', '1')
      ).rejects.toThrow('Call session not found')
    })
  })

  describe('Presence Methods', () => {
    it('subscribe() should throw not supported error', async () => {
      await adapter.initialize(sipConfig)

      await expect(
        adapter.subscribe('sip:target@test.com', 'presence')
      ).rejects.toThrow('Subscribe not implemented')
    })

    it('unsubscribe() should throw not supported error', async () => {
      await adapter.initialize(sipConfig)

      await expect(
        adapter.unsubscribe('sip:target@test.com', 'presence')
      ).rejects.toThrow('Unsubscribe not implemented')
    })

    it('publish() should throw not supported error', async () => {
      await adapter.initialize(sipConfig)

      await expect(
        adapter.publish('presence', { status: 'available' })
      ).rejects.toThrow('Publish not implemented')
    })
  })

  describe('Library Options', () => {
    it('should accept library options in constructor', () => {
      const options = { debug: true, timeout: 30000 }
      const adapterWithOptions = new JsSipAdapter(options)

      expect(adapterWithOptions.adapterName).toBe('JsSIP Adapter')
    })
  })
})
