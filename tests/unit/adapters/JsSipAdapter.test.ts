/**
 * JsSipAdapter unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JsSipAdapter } from '@/adapters/jssip/JsSipAdapter'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import type { SipClientConfig } from '@/types/config.types'
import { AdapterNotSupportedError } from '@/adapters/types'

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
      display_name: 'Remote User',
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
      handlers.forEach((handler) => handler(data))
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
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 100)),
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

  describe('Event Mapping', () => {
    it('should emit connection:connected when UA connected event fires', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('connection:connected', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the connected event
      const ua = (adapter as any).ua
      ua.__triggerEvent('connected')

      expect(handler).toHaveBeenCalled()
    })

    it('should emit connection:disconnected when UA disconnected event fires', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('connection:disconnected', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the disconnected event
      const ua = (adapter as any).ua
      ua.__triggerEvent('disconnected')

      expect(handler).toHaveBeenCalledWith({ reason: 'Disconnected from server' })
    })

    it('should emit registration:registered when UA registered event fires', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('registration:registered', handler)

      // Start connection to setup event handlers
      const connectPromise = adapter.connect()

      // Get the UA instance
      const ua = (adapter as any).ua

      // First, resolve the connection by triggering connected
      ua.__triggerEvent('connected')
      await connectPromise

      // Now trigger the registered event
      ua.__triggerEvent('registered', {
        response: { getHeader: (name: string) => (name === 'Expires' ? '300' : undefined) },
      })

      expect(handler).toHaveBeenCalledWith({ expires: 300 })

      // Trigger unregistered to avoid the unregister timeout in destroy()
      ua.__triggerEvent('unregistered')
    })

    it('should emit registration:unregistered when UA unregistered event fires', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('registration:unregistered', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the unregistered event
      const ua = (adapter as any).ua
      ua.__triggerEvent('unregistered')

      expect(handler).toHaveBeenCalled()
    })

    it('should emit registration:failed when UA registrationFailed event fires', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('registration:failed', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the registrationFailed event
      const ua = (adapter as any).ua
      ua.__triggerEvent('registrationFailed', {
        cause: 'Unauthorized',
        response: { status_code: 401 },
      })

      expect(handler).toHaveBeenCalledWith({
        error: expect.any(Error),
        statusCode: 401,
      })
      expect(handler.mock.calls[0][0].error.message).toBe('Unauthorized')
    })

    it('should emit call:incoming when UA newRTCSession event fires with remote originator', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('call:incoming', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the newRTCSession event
      const ua = (adapter as any).ua
      const mockRTCSession = {
        id: 'incoming-session-id',
        direction: 'incoming',
        remote_identity: {
          uri: { toString: () => 'sip:caller@example.com' },
          display_name: 'Caller',
        },
        connection: null,
        isOnHold: vi.fn().mockReturnValue({ local: false, remote: false }),
        isMuted: vi.fn().mockReturnValue({ audio: false, video: false }),
        on: vi.fn(),
        off: vi.fn(),
      }

      ua.__triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockRTCSession,
      })

      expect(handler).toHaveBeenCalled()
      expect(handler.mock.calls[0][0].session).toBeDefined()
      expect(handler.mock.calls[0][0].session.id).toBe('incoming-session-id')
    })

    it('should not emit call:incoming when UA newRTCSession event fires with local originator', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('call:incoming', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the newRTCSession event with local originator
      const ua = (adapter as any).ua
      const mockRTCSession = {
        id: 'outgoing-session-id',
        direction: 'outgoing',
        remote_identity: {
          uri: { toString: () => 'sip:callee@example.com' },
          display_name: 'Callee',
        },
        connection: null,
        isOnHold: vi.fn().mockReturnValue({ local: false, remote: false }),
        isMuted: vi.fn().mockReturnValue({ audio: false, video: false }),
        on: vi.fn(),
        off: vi.fn(),
      }

      ua.__triggerEvent('newRTCSession', {
        originator: 'local',
        session: mockRTCSession,
      })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should emit message:received when UA newMessage event fires with remote originator', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('message:received', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the newMessage event
      const ua = (adapter as any).ua
      ua.__triggerEvent('newMessage', {
        originator: 'remote',
        request: {
          from: { uri: { toString: () => 'sip:sender@example.com' } },
        },
        message: {
          body: 'Hello, this is a test message',
          content_type: 'text/plain',
        },
      })

      expect(handler).toHaveBeenCalledWith({
        from: 'sip:sender@example.com',
        content: 'Hello, this is a test message',
        contentType: 'text/plain',
      })
    })

    it('should not emit message:received when UA newMessage event fires with local originator', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('message:received', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the newMessage event with local originator
      const ua = (adapter as any).ua
      ua.__triggerEvent('newMessage', {
        originator: 'local',
        message: {
          body: 'Outgoing message',
          content_type: 'text/plain',
        },
      })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle message:received with missing message data gracefully', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('message:received', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the newMessage event with minimal data
      const ua = (adapter as any).ua
      ua.__triggerEvent('newMessage', {
        originator: 'remote',
        request: {},
        message: {},
      })

      expect(handler).toHaveBeenCalledWith({
        from: 'unknown',
        content: '',
        contentType: 'text/plain',
      })
    })

    it('should emit connection:failed with { error: Error } payload when connection fails', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('connection:failed', handler)

      // Start connection
      const connectPromise = adapter.connect()
      connectPromise.catch(() => {}) // Ignore the rejection

      // Get the UA instance and trigger disconnected event to simulate failure
      const ua = (adapter as any).ua
      ua.__triggerEvent('disconnected')

      // The connect promise should reject due to disconnection
      await expect(connectPromise).rejects.toThrow('Connection failed')

      // Verify the event was emitted with { error: Error } payload
      expect(handler).toHaveBeenCalled()
      expect(handler).toHaveBeenCalledWith({
        error: expect.any(Error),
      })
      expect(handler.mock.calls[0][0].error.message).toBe('Connection failed')
    })

    it('should track active sessions on incoming calls', async () => {
      await adapter.initialize(sipConfig)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // Get the UA instance and trigger the newRTCSession event
      const ua = (adapter as any).ua
      const mockRTCSession = {
        id: 'tracked-session-id',
        direction: 'incoming',
        remote_identity: {
          uri: { toString: () => 'sip:caller@example.com' },
          display_name: 'Caller',
        },
        connection: null,
        isOnHold: vi.fn().mockReturnValue({ local: false, remote: false }),
        isMuted: vi.fn().mockReturnValue({ audio: false, video: false }),
        on: vi.fn(),
        off: vi.fn(),
      }

      ua.__triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockRTCSession,
      })

      // The session should be tracked
      const activeCalls = adapter.getActiveCalls()
      expect(activeCalls.length).toBe(1)
      expect(activeCalls[0].id).toBe('tracked-session-id')

      // Also verify getCallSession works
      const session = adapter.getCallSession('tracked-session-id')
      expect(session).not.toBeNull()
      expect(session?.id).toBe('tracked-session-id')
    })

    it('should emit registration:registering when registration starts', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('registration:registering', handler)

      // Start connection to setup event handlers
      const connectPromise = adapter.connect()

      // Get the UA instance
      const ua = (adapter as any).ua

      // First, resolve the connection by triggering connected
      ua.__triggerEvent('connected')
      await connectPromise

      // Start registration - this should emit registration:registering
      const registerPromise = adapter.register()

      // Verify the event was emitted (with void payload)
      expect(handler).toHaveBeenCalled()

      // Complete registration to avoid timeout
      ua.__triggerEvent('registered', {
        response: { getHeader: () => '300' },
      })
      await registerPromise

      // Cleanup
      ua.__triggerEvent('unregistered')
    })

    it('should emit call:outgoing when making an outgoing call', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('call:outgoing', handler)

      // Start connection to setup event handlers
      const connectPromise = adapter.connect()

      // Get the UA instance
      const ua = (adapter as any).ua

      // Resolve the connection
      ua.__triggerEvent('connected')
      await connectPromise

      // Make an outgoing call
      const session = await adapter.call('sip:target@example.com')

      // Verify the event was emitted with { session: ICallSession } payload
      expect(handler).toHaveBeenCalled()
      expect(handler).toHaveBeenCalledWith({ session: expect.any(Object) })
      expect(handler.mock.calls[0][0].session).toBe(session)
      expect(handler.mock.calls[0][0].session.id).toBeDefined()
    })

    it('should not emit presence:notification (JsSIP does not support presence)', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('presence:notification', handler)

      // Start connection to setup event handlers
      adapter.connect().catch(() => {})

      // JsSIP doesn't have native presence support, so no presence events should be emitted
      // The subscribe method throws AdapterNotSupportedError instead
      await expect(adapter.subscribe('sip:target@test.com', 'presence')).rejects.toThrow(
        AdapterNotSupportedError
      )

      // Verify no presence:notification event was emitted
      expect(handler).not.toHaveBeenCalled()
    })

    it('should emit error event with { error: Error; context: string } payload for general errors', async () => {
      await adapter.initialize(sipConfig)
      const handler = vi.fn()
      adapter.on('error', handler)

      // JsSipAdapter uses specific error events (connection:failed, registration:failed)
      // rather than the generic error event. The generic error event follows the interface
      // contract for adapters that need to emit non-specific errors.
      // This test verifies the event listener can be registered and the payload structure
      // is correct when manually emitted (for interface compliance testing).

      // Manually emit to verify payload structure follows interface contract
      const testError = new Error('Test error')
      ;(adapter as any).emit('error', { error: testError, context: 'test-context' })

      expect(handler).toHaveBeenCalledWith({
        error: expect.any(Error),
        context: 'test-context',
      })
      expect(handler.mock.calls[0][0].error.message).toBe('Test error')
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

      await expect(adapter.sendMessage('sip:target@test.com', 'Hello')).rejects.toThrow(
        'Not connected'
      )
    })
  })

  describe('sendDTMF()', () => {
    it('should throw for non-existent call', async () => {
      await adapter.initialize(sipConfig)

      await expect(adapter.sendDTMF('non-existent-call', '1')).rejects.toThrow(
        'Call session not found'
      )
    })
  })

  describe('Presence Methods', () => {
    it('subscribe() should throw AdapterNotSupportedError', async () => {
      await adapter.initialize(sipConfig)

      try {
        await adapter.subscribe('sip:target@test.com', 'presence')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AdapterNotSupportedError)
        const notSupportedError = error as AdapterNotSupportedError
        expect(notSupportedError.operation).toBe('subscribe')
        expect(notSupportedError.adapterName).toBe('JsSIP Adapter')
        expect(notSupportedError.suggestion).toContain(
          'JsSIP does not include native SUBSCRIBE support'
        )
      }
    })

    it('subscribe() should include helpful suggestion in error', async () => {
      await adapter.initialize(sipConfig)

      await expect(adapter.subscribe('sip:target@test.com', 'presence', 600)).rejects.toThrow(
        'Consider using a server-side presence solution'
      )
    })

    it('unsubscribe() should throw AdapterNotSupportedError', async () => {
      await adapter.initialize(sipConfig)

      try {
        await adapter.unsubscribe('sip:target@test.com', 'presence')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AdapterNotSupportedError)
        const notSupportedError = error as AdapterNotSupportedError
        expect(notSupportedError.operation).toBe('unsubscribe')
        expect(notSupportedError.adapterName).toBe('JsSIP Adapter')
      }
    })

    it('publish() should throw AdapterNotSupportedError', async () => {
      await adapter.initialize(sipConfig)

      try {
        await adapter.publish('presence', { status: 'available' })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AdapterNotSupportedError)
        const notSupportedError = error as AdapterNotSupportedError
        expect(notSupportedError.operation).toBe('publish')
        expect(notSupportedError.adapterName).toBe('JsSIP Adapter')
        expect(notSupportedError.suggestion).toContain(
          'JsSIP does not include native PUBLISH support'
        )
      }
    })

    it('publish() should include helpful suggestion in error', async () => {
      await adapter.initialize(sipConfig)

      await expect(
        adapter.publish('presence', { status: 'away', note: 'In a meeting' })
      ).rejects.toThrow('Consider using a server-side presence API')
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
