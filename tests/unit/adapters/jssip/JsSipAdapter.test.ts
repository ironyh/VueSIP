/**
 * JsSipAdapter Connection Lifecycle Unit Tests
 *
 * Tests for initialization, connect(), and disconnect() methods
 * of the JsSIP adapter implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { JsSipAdapter } from '@/adapters/jssip/JsSipAdapter'
import { ConnectionState, RegistrationState } from '@/types/sip.types'
import type { SipClientConfig } from '@/types/config.types'
import { AdapterNotSupportedError } from '@/adapters/types'
import { createMockSipConfig } from '../../../utils/test-helpers'

// Store references to mock classes for inspection
let mockUAInstance: MockUAType | null = null
let mockWebSocketInterfaceInstance: MockWebSocketInterfaceType | null = null

interface MockUAType {
  configuration: any
  start: Mock
  stop: Mock
  register: Mock
  unregister: Mock
  call: Mock
  sendMessage: Mock
  isRegistered: Mock
  isConnected: Mock
  on: Mock
  off: Mock
  once: Mock
  __triggerEvent: (event: string, data?: any) => void
  __getEventHandlers: () => Map<string, Function[]>
}

interface MockWebSocketInterfaceType {
  url: string
  connect: Mock
  disconnect: Mock
  isConnected: Mock
}

// Mock JsSIP module
vi.mock('jssip', () => {
  class MockWebSocketInterface {
    url: string
    constructor(url: string) {
      this.url = url
      mockWebSocketInterfaceInstance = this as any
    }
    connect = vi.fn()
    disconnect = vi.fn()
    isConnected = vi.fn().mockReturnValue(false)
  }

  class MockUA {
    configuration: any
    private eventHandlers: Map<string, Function[]> = new Map()
    start = vi.fn()
    stop = vi.fn()
    register = vi.fn()
    unregister = vi.fn()
    call = vi.fn()
    sendMessage = vi.fn()
    isRegistered = vi.fn().mockReturnValue(false)
    isConnected = vi.fn().mockReturnValue(false)

    constructor(config: any) {
      this.configuration = config
      mockUAInstance = this as any
    }

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

    // Test helpers to trigger events
    __triggerEvent(event: string, data?: any) {
      const handlers = this.eventHandlers.get(event) || []
      handlers.forEach((handler) => handler(data))
    }

    __getEventHandlers() {
      return this.eventHandlers
    }
  }

  const mod = {
    WebSocketInterface: MockWebSocketInterface,
    UA: MockUA,
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

describe('JsSipAdapter - Connection Lifecycle', () => {
  let adapter: JsSipAdapter
  let sipConfig: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()
    mockUAInstance = null
    mockWebSocketInterfaceInstance = null

    sipConfig = createMockSipConfig({
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
    })

    adapter = new JsSipAdapter()
  })

  afterEach(async () => {
    if (adapter) {
      try {
        // Need to trigger events for destroy() to complete in mock environment
        // destroy() calls unregister() (waits for 'unregistered') and disconnect()
        const destroyPromise = adapter.destroy()

        // Trigger events that destroy() is waiting for
        if (mockUAInstance) {
          // Trigger unregistered for unregister() - use setTimeout to ensure handlers are set up
          setTimeout(() => {
            mockUAInstance?.__triggerEvent('unregistered')
            mockUAInstance?.__triggerEvent('disconnected')
          }, 0)
        }

        await destroyPromise
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('Initialization', () => {
    it('should start in disconnected state', () => {
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
      expect(adapter.isConnected).toBe(false)
    })

    it('should start in unregistered state', () => {
      expect(adapter.registrationState).toBe(RegistrationState.Unregistered)
      expect(adapter.isRegistered).toBe(false)
    })

    it('should have correct adapter type metadata', () => {
      expect(adapter.adapterName).toBe('JsSIP Adapter')
      expect(adapter.adapterVersion).toBe('1.0.0')
      expect(adapter.libraryName).toBe('JsSIP')
    })

    it('should report JsSIP library version', () => {
      expect(adapter.libraryVersion).toMatch(/^3\./)
    })

    it('should have no active calls initially', () => {
      expect(adapter.getActiveCalls()).toEqual([])
    })

    it('should accept library options in constructor', () => {
      const customAdapter = new JsSipAdapter({ customOption: 'value' })
      expect(customAdapter.adapterName).toBe('JsSIP Adapter')
    })
  })

  describe('connect()', () => {
    it('should throw error if not initialized', async () => {
      await expect(adapter.connect()).rejects.toThrow('Adapter not initialized')
    })

    it('should create UA instance on connect', async () => {
      await adapter.initialize(sipConfig)

      // Start connection but don't await (will timeout without simulated response)
      const connectPromise = adapter.connect()

      // Verify UA was created
      expect(mockUAInstance).not.toBeNull()
      expect(mockUAInstance!.start).toHaveBeenCalled()

      // Simulate connection to resolve
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    })

    it('should emit connection:connecting event when connect starts', async () => {
      await adapter.initialize(sipConfig)

      const connectingHandler = vi.fn()
      adapter.on('connection:connecting', connectingHandler)

      const connectPromise = adapter.connect()

      // Event should fire immediately
      expect(connectingHandler).toHaveBeenCalled()

      // Simulate connection to resolve
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    })

    it('should transition to Connecting state', async () => {
      await adapter.initialize(sipConfig)

      const connectPromise = adapter.connect()

      expect(adapter.connectionState).toBe(ConnectionState.Connecting)

      // Resolve by simulating connection
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    })

    it('should transition to Connected state on success', async () => {
      await adapter.initialize(sipConfig)

      const connectedHandler = vi.fn()
      adapter.on('connection:connected', connectedHandler)

      const connectPromise = adapter.connect()

      // Simulate successful connection
      mockUAInstance!.__triggerEvent('connected')

      await connectPromise

      expect(adapter.connectionState).toBe(ConnectionState.Connected)
      expect(adapter.isConnected).toBe(true)
      expect(connectedHandler).toHaveBeenCalled()
    })

    it('should handle connection errors', async () => {
      await adapter.initialize(sipConfig)

      const failedHandler = vi.fn()
      adapter.on('connection:failed', failedHandler)

      const connectPromise = adapter.connect()

      // Simulate connection failure
      mockUAInstance!.__triggerEvent('disconnected')

      await expect(connectPromise).rejects.toThrow('Connection failed')

      expect(failedHandler).toHaveBeenCalled()
      expect(failedHandler.mock.calls[0][0]).toHaveProperty('error')
    })

    it('should not create new UA if already connected', async () => {
      await adapter.initialize(sipConfig)

      // First connection
      const firstConnect = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await firstConnect

      const firstUAInstance = mockUAInstance

      // Second connection should be no-op
      await adapter.connect()

      // Same instance, no new UA created
      expect(mockUAInstance).toBe(firstUAInstance)
    })

    it('should setup event handlers on UA', async () => {
      await adapter.initialize(sipConfig)

      const connectPromise = adapter.connect()

      // Verify event handlers are registered
      const handlers = mockUAInstance!.__getEventHandlers()
      expect(handlers.has('connected')).toBe(true)
      expect(handlers.has('disconnected')).toBe(true)
      expect(handlers.has('registered')).toBe(true)
      expect(handlers.has('unregistered')).toBe(true)
      expect(handlers.has('registrationFailed')).toBe(true)
      expect(handlers.has('newRTCSession')).toBe(true)

      // Resolve
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    })

    it('should call UA.start() on connect', async () => {
      await adapter.initialize(sipConfig)

      const connectPromise = adapter.connect()

      expect(mockUAInstance!.start).toHaveBeenCalledTimes(1)

      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    })

    it('should configure UA with correct socket URL', async () => {
      await adapter.initialize(sipConfig)

      const connectPromise = adapter.connect()

      // WebSocketInterface should be created with correct URL
      expect(mockWebSocketInterfaceInstance).not.toBeNull()
      expect(mockWebSocketInterfaceInstance!.url).toBe(sipConfig.uri)

      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    })
  })

  describe('disconnect()', () => {
    it('should be no-op if not connected', async () => {
      await adapter.initialize(sipConfig)
      await adapter.disconnect()

      // Should not throw and state should remain disconnected
      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
    })

    it('should stop UA on disconnect', async () => {
      await adapter.initialize(sipConfig)

      // Connect first
      const connectPromise = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise

      // Now disconnect
      await adapter.disconnect()

      expect(mockUAInstance!.stop).toHaveBeenCalled()
    })

    it('should emit connection:disconnected event', async () => {
      await adapter.initialize(sipConfig)

      // Connect first
      const connectPromise = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise

      const disconnectedHandler = vi.fn()
      adapter.on('connection:disconnected', disconnectedHandler)

      await adapter.disconnect()

      expect(disconnectedHandler).toHaveBeenCalled()
      expect(disconnectedHandler.mock.calls[0][0]).toEqual({
        reason: 'User initiated disconnect',
      })
    })

    it('should transition to Disconnected state', async () => {
      await adapter.initialize(sipConfig)

      // Connect first
      const connectPromise = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise

      expect(adapter.isConnected).toBe(true)

      await adapter.disconnect()

      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
      expect(adapter.isConnected).toBe(false)
    })

    it('should clear active sessions on disconnect', async () => {
      await adapter.initialize(sipConfig)

      // Connect first
      const connectPromise = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise

      await adapter.disconnect()

      expect(adapter.getActiveCalls()).toEqual([])
    })

    it('should set UA to null after disconnect', async () => {
      await adapter.initialize(sipConfig)

      // Connect first
      const connectPromise = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise

      await adapter.disconnect()

      // Trying to call operations should indicate no UA
      await expect(adapter.call('sip:test@example.com')).rejects.toThrow('Not connected')
    })
  })

  describe('Connection State Management', () => {
    it('should handle connecting event from UA', async () => {
      await adapter.initialize(sipConfig)

      const connectingHandler = vi.fn()
      adapter.on('connection:connecting', connectingHandler)

      const connectPromise = adapter.connect()

      // Trigger connecting event from UA (in addition to initial connecting)
      mockUAInstance!.__triggerEvent('connecting')

      expect(connectingHandler).toHaveBeenCalled()

      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    })

    it('should handle disconnected event from UA', async () => {
      await adapter.initialize(sipConfig)

      // Connect first
      const connectPromise = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise

      const disconnectedHandler = vi.fn()
      adapter.on('connection:disconnected', disconnectedHandler)

      // Simulate server-initiated disconnect
      mockUAInstance!.__triggerEvent('disconnected')

      expect(adapter.connectionState).toBe(ConnectionState.Disconnected)
      expect(disconnectedHandler).toHaveBeenCalled()
    })
  })

  describe('Debug Configuration', () => {
    it('should enable JsSIP debug when config.debug is true', async () => {
      const JsSIP = await import('jssip')

      const debugConfig = createMockSipConfig({
        debug: true,
      })

      await adapter.initialize(debugConfig)

      expect(JsSIP.debug.enable).toHaveBeenCalledWith('JsSIP:*')
    })

    it('should disable JsSIP debug when config.debug is false', async () => {
      const JsSIP = await import('jssip')

      const noDebugConfig = createMockSipConfig({
        debug: false,
      })

      await adapter.initialize(noDebugConfig)

      expect(JsSIP.debug.disable).toHaveBeenCalled()
    })
  })

  describe('Registration', () => {
    // Helper to connect the adapter before registration tests
    async function connectAdapter() {
      await adapter.initialize(sipConfig)
      const connectPromise = adapter.connect()
      mockUAInstance!.__triggerEvent('connected')
      await connectPromise
    }

    describe('register()', () => {
      it('should throw error if not connected', async () => {
        await adapter.initialize(sipConfig)
        await expect(adapter.register()).rejects.toThrow('Not connected')
      })

      it('should call UA register method', async () => {
        await connectAdapter()

        const registerPromise = adapter.register()

        expect(mockUAInstance!.register).toHaveBeenCalled()

        // Simulate successful registration
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise
      })

      it('should emit registration:registering event', async () => {
        await connectAdapter()

        const registeringHandler = vi.fn()
        adapter.on('registration:registering', registeringHandler)

        const registerPromise = adapter.register()

        expect(registeringHandler).toHaveBeenCalled()

        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise
      })

      it('should transition to Registering state', async () => {
        await connectAdapter()

        const registerPromise = adapter.register()

        expect(adapter.registrationState).toBe(RegistrationState.Registering)

        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise
      })

      it('should transition to Registered state on success', async () => {
        await connectAdapter()

        const registeredHandler = vi.fn()
        adapter.on('registration:registered', registeredHandler)

        const registerPromise = adapter.register()

        // Simulate successful registration
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })

        await registerPromise

        expect(adapter.registrationState).toBe(RegistrationState.Registered)
        expect(adapter.isRegistered).toBe(true)
        expect(registeredHandler).toHaveBeenCalled()
        expect(registeredHandler.mock.calls[0][0]).toHaveProperty('expires')
      })

      it('should handle registration failure', async () => {
        await connectAdapter()

        const failedHandler = vi.fn()
        adapter.on('registration:failed', failedHandler)

        const registerPromise = adapter.register()

        // Simulate registration failure
        mockUAInstance!.__triggerEvent('registrationFailed', {
          cause: 'Authentication failed',
          response: { status_code: 401 },
        })

        await expect(registerPromise).rejects.toThrow('Registration failed')

        expect(adapter.registrationState).toBe(RegistrationState.RegistrationFailed)
        expect(failedHandler).toHaveBeenCalled()
        expect(failedHandler.mock.calls[0][0]).toHaveProperty('error')
        expect(failedHandler.mock.calls[0][0]).toHaveProperty('statusCode', 401)
      })

      it('should be no-op if already registered', async () => {
        await connectAdapter()

        // First registration
        const firstRegister = adapter.register()
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await firstRegister

        // Clear the mock call count
        mockUAInstance!.register.mockClear()

        // Second registration should be no-op
        await adapter.register()

        // Should not call register again
        expect(mockUAInstance!.register).not.toHaveBeenCalled()
      })

      it('should parse expires header from response', async () => {
        await connectAdapter()

        const registeredHandler = vi.fn()
        adapter.on('registration:registered', registeredHandler)

        const registerPromise = adapter.register()

        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: (name: string) => (name === 'Expires' ? '7200' : undefined) },
        })

        await registerPromise

        expect(registeredHandler.mock.calls[0][0].expires).toBe(7200)
      })
    })

    describe('unregister()', () => {
      it('should be no-op if not registered', async () => {
        await connectAdapter()

        // Should not throw
        await adapter.unregister()

        expect(mockUAInstance!.unregister).not.toHaveBeenCalled()
      })

      it('should call UA unregister method', async () => {
        await connectAdapter()

        // Register first
        const registerPromise = adapter.register()
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise

        // Now unregister
        const unregisterPromise = adapter.unregister()

        expect(mockUAInstance!.unregister).toHaveBeenCalled()

        // Simulate successful unregistration
        mockUAInstance!.__triggerEvent('unregistered')
        await unregisterPromise
      })

      it('should emit registration:unregistered event', async () => {
        await connectAdapter()

        // Register first
        const registerPromise = adapter.register()
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise

        const unregisteredHandler = vi.fn()
        adapter.on('registration:unregistered', unregisteredHandler)

        // Now unregister
        const unregisterPromise = adapter.unregister()
        mockUAInstance!.__triggerEvent('unregistered')
        await unregisterPromise

        expect(unregisteredHandler).toHaveBeenCalled()
      })

      it('should transition to Unregistered state', async () => {
        await connectAdapter()

        // Register first
        const registerPromise = adapter.register()
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise

        expect(adapter.isRegistered).toBe(true)

        // Now unregister
        const unregisterPromise = adapter.unregister()
        mockUAInstance!.__triggerEvent('unregistered')
        await unregisterPromise

        expect(adapter.registrationState).toBe(RegistrationState.Unregistered)
        expect(adapter.isRegistered).toBe(false)
      })
    })

    describe('Registration State Tracking', () => {
      it('should track isRegistered correctly through lifecycle', async () => {
        await connectAdapter()

        // Initially not registered
        expect(adapter.isRegistered).toBe(false)

        // Register
        const registerPromise = adapter.register()
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise

        expect(adapter.isRegistered).toBe(true)

        // Unregister
        const unregisterPromise = adapter.unregister()
        mockUAInstance!.__triggerEvent('unregistered')
        await unregisterPromise

        expect(adapter.isRegistered).toBe(false)
      })

      it('should handle server-initiated unregistration', async () => {
        await connectAdapter()

        // Register
        const registerPromise = adapter.register()
        mockUAInstance!.__triggerEvent('registered', {
          response: { getHeader: () => '3600' },
        })
        await registerPromise

        const unregisteredHandler = vi.fn()
        adapter.on('registration:unregistered', unregisteredHandler)

        // Simulate server-initiated unregistration
        mockUAInstance!.__triggerEvent('unregistered')

        expect(adapter.registrationState).toBe(RegistrationState.Unregistered)
        expect(adapter.isRegistered).toBe(false)
        expect(unregisteredHandler).toHaveBeenCalled()
      })
    })
  })
})

describe('JsSipAdapter - Call Operations', () => {
  let adapter: JsSipAdapter
  let sipConfig: SipClientConfig

  // Mock RTCSession for call operations
  interface MockRTCSessionType {
    id: string
    direction: 'incoming' | 'outgoing'
    remote_identity: { uri: { toString: () => string }; display_name: string | null }
    connection: null
    isOnHold: Mock
    isMuted: Mock
    answer: Mock
    terminate: Mock
    hold: Mock
    unhold: Mock
    mute: Mock
    unmute: Mock
    sendDTMF: Mock
    renegotiate: Mock
    refer: Mock
    on: Mock
    off: Mock
    once: Mock
    __eventHandlers: Map<string, Function[]>
    __triggerEvent: (event: string, data?: any) => void
  }

  function createMockRTCSession(
    direction: 'incoming' | 'outgoing' = 'outgoing',
    remoteUri = 'sip:remote@example.com'
  ): MockRTCSessionType {
    const eventHandlers = new Map<string, Function[]>()

    return {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      direction,
      remote_identity: {
        uri: { toString: () => remoteUri },
        display_name: 'Remote User',
      },
      connection: null,
      isOnHold: vi.fn().mockReturnValue({ local: false, remote: false }),
      isMuted: vi.fn().mockReturnValue({ audio: false, video: false }),
      answer: vi.fn(),
      terminate: vi.fn(),
      hold: vi.fn().mockImplementation((_opts, callback) => {
        if (callback) callback()
        return true
      }),
      unhold: vi.fn().mockImplementation((_opts, callback) => {
        if (callback) callback()
        return true
      }),
      mute: vi.fn(),
      unmute: vi.fn(),
      sendDTMF: vi.fn(),
      renegotiate: vi.fn().mockImplementation((_opts, callback) => {
        if (callback) callback()
        return true
      }),
      refer: vi.fn(),
      on: vi.fn().mockImplementation((event: string, handler: Function) => {
        const handlers = eventHandlers.get(event) || []
        handlers.push(handler)
        eventHandlers.set(event, handlers)
      }),
      off: vi.fn(),
      once: vi.fn(),
      __eventHandlers: eventHandlers,
      __triggerEvent: (event: string, data?: any) => {
        const handlers = eventHandlers.get(event) || []
        handlers.forEach((handler) => handler(data))
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUAInstance = null
    mockWebSocketInterfaceInstance = null

    sipConfig = createMockSipConfig({
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
    })

    adapter = new JsSipAdapter()
  })

  afterEach(async () => {
    if (adapter) {
      try {
        const destroyPromise = adapter.destroy()

        if (mockUAInstance) {
          setTimeout(() => {
            mockUAInstance?.__triggerEvent('unregistered')
            mockUAInstance?.__triggerEvent('disconnected')
          }, 0)
        }

        await destroyPromise
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  // Helper to connect the adapter before call tests
  async function connectAdapter() {
    await adapter.initialize(sipConfig)
    const connectPromise = adapter.connect()
    mockUAInstance!.__triggerEvent('connected')
    await connectPromise
  }

  describe('call() / makeCall()', () => {
    it('should throw error if not connected', async () => {
      await adapter.initialize(sipConfig)
      await expect(adapter.call('sip:target@example.com')).rejects.toThrow('Not connected')
    })

    it('should create outgoing call session', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing', 'sip:target@example.com')
      mockUAInstance!.call.mockReturnValue(mockSession)

      const session = await adapter.call('sip:target@example.com')

      expect(mockUAInstance!.call).toHaveBeenCalledWith(
        'sip:target@example.com',
        expect.objectContaining({
          mediaConstraints: { audio: true, video: false },
        })
      )
      expect(session).toBeDefined()
      expect(session.id).toBe(mockSession.id)
    })

    it('should emit call:outgoing event', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing', 'sip:target@example.com')
      mockUAInstance!.call.mockReturnValue(mockSession)

      const outgoingHandler = vi.fn()
      adapter.on('call:outgoing', outgoingHandler)

      await adapter.call('sip:target@example.com')

      expect(outgoingHandler).toHaveBeenCalled()
      expect(outgoingHandler.mock.calls[0][0]).toHaveProperty('session')
    })

    it('should pass custom media constraints', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      await adapter.call('sip:target@example.com', {
        mediaConstraints: { audio: true, video: true },
      })

      expect(mockUAInstance!.call).toHaveBeenCalledWith(
        'sip:target@example.com',
        expect.objectContaining({
          mediaConstraints: { audio: true, video: true },
        })
      )
    })

    it('should pass extra headers to JsSIP', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      const extraHeaders = ['X-Custom-Header: value']
      await adapter.call('sip:target@example.com', { extraHeaders })

      expect(mockUAInstance!.call).toHaveBeenCalledWith(
        'sip:target@example.com',
        expect.objectContaining({
          extraHeaders,
        })
      )
    })

    it('should pass anonymous option to JsSIP', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      await adapter.call('sip:target@example.com', { anonymous: true })

      expect(mockUAInstance!.call).toHaveBeenCalledWith(
        'sip:target@example.com',
        expect.objectContaining({
          anonymous: true,
        })
      )
    })

    it('should pass pcConfig to JsSIP', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      const pcConfig = { iceServers: [{ urls: 'stun:stun.example.com' }] }
      await adapter.call('sip:target@example.com', { pcConfig })

      expect(mockUAInstance!.call).toHaveBeenCalledWith(
        'sip:target@example.com',
        expect.objectContaining({
          pcConfig,
        })
      )
    })

    it('should add session to active calls', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      expect(adapter.getActiveCalls()).toHaveLength(0)

      await adapter.call('sip:target@example.com')

      expect(adapter.getActiveCalls()).toHaveLength(1)
    })

    it('should remove session from active calls when ended', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      await adapter.call('sip:target@example.com')

      expect(adapter.getActiveCalls()).toHaveLength(1)

      // Trigger ended event on the session
      mockSession.__triggerEvent('ended', { originator: 'remote', cause: 'Bye' })

      expect(adapter.getActiveCalls()).toHaveLength(0)
    })

    it('should remove session from active calls when failed', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      await adapter.call('sip:target@example.com')

      expect(adapter.getActiveCalls()).toHaveLength(1)

      // Trigger failed event on the session
      mockSession.__triggerEvent('failed', { originator: 'remote', cause: 'Canceled' })

      expect(adapter.getActiveCalls()).toHaveLength(0)
    })
  })

  describe('Incoming Calls', () => {
    it('should emit call:incoming event for incoming calls', async () => {
      await connectAdapter()

      const incomingHandler = vi.fn()
      adapter.on('call:incoming', incomingHandler)

      // Simulate incoming call via newRTCSession event
      const mockSession = createMockRTCSession('incoming', 'sip:caller@example.com')
      mockUAInstance!.__triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })

      expect(incomingHandler).toHaveBeenCalled()
      expect(incomingHandler.mock.calls[0][0]).toHaveProperty('session')
    })

    it('should add incoming call to active sessions', async () => {
      await connectAdapter()

      expect(adapter.getActiveCalls()).toHaveLength(0)

      const mockSession = createMockRTCSession('incoming', 'sip:caller@example.com')
      mockUAInstance!.__triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })

      expect(adapter.getActiveCalls()).toHaveLength(1)
    })

    it('should not emit call:incoming for outgoing calls from newRTCSession', async () => {
      await connectAdapter()

      const incomingHandler = vi.fn()
      adapter.on('call:incoming', incomingHandler)

      // newRTCSession with originator 'local' should not emit call:incoming
      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.__triggerEvent('newRTCSession', {
        originator: 'local',
        session: mockSession,
      })

      expect(incomingHandler).not.toHaveBeenCalled()
    })

    it('should clean up incoming session when ended', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('incoming', 'sip:caller@example.com')
      mockUAInstance!.__triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })

      expect(adapter.getActiveCalls()).toHaveLength(1)

      // Trigger ended event
      mockSession.__triggerEvent('ended', { originator: 'local', cause: 'Bye' })

      expect(adapter.getActiveCalls()).toHaveLength(0)
    })
  })

  describe('getActiveCalls()', () => {
    it('should return empty array when no calls', async () => {
      await connectAdapter()

      expect(adapter.getActiveCalls()).toEqual([])
    })

    it('should return all active sessions', async () => {
      await connectAdapter()

      // Create first call
      const mockSession1 = createMockRTCSession('outgoing', 'sip:user1@example.com')
      mockUAInstance!.call.mockReturnValue(mockSession1)
      await adapter.call('sip:user1@example.com')

      // Create second call
      const mockSession2 = createMockRTCSession('outgoing', 'sip:user2@example.com')
      mockUAInstance!.call.mockReturnValue(mockSession2)
      await adapter.call('sip:user2@example.com')

      const activeCalls = adapter.getActiveCalls()
      expect(activeCalls).toHaveLength(2)
    })

    it('should include both outgoing and incoming calls', async () => {
      await connectAdapter()

      // Create outgoing call
      const mockOutgoing = createMockRTCSession('outgoing', 'sip:outbound@example.com')
      mockUAInstance!.call.mockReturnValue(mockOutgoing)
      await adapter.call('sip:outbound@example.com')

      // Simulate incoming call
      const mockIncoming = createMockRTCSession('incoming', 'sip:inbound@example.com')
      mockUAInstance!.__triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockIncoming,
      })

      const activeCalls = adapter.getActiveCalls()
      expect(activeCalls).toHaveLength(2)
    })
  })

  describe('getCallSession()', () => {
    it('should return null for non-existent session', async () => {
      await connectAdapter()

      const session = adapter.getCallSession('non-existent-id')
      expect(session).toBeNull()
    })

    it('should return session by call ID', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing', 'sip:target@example.com')
      mockUAInstance!.call.mockReturnValue(mockSession)

      const createdSession = await adapter.call('sip:target@example.com')

      const retrievedSession = adapter.getCallSession(createdSession.id)
      expect(retrievedSession).toBe(createdSession)
    })
  })

  describe('sendDTMF()', () => {
    it('should throw error if session not found', async () => {
      await connectAdapter()

      await expect(adapter.sendDTMF('non-existent-id', '1')).rejects.toThrow(
        'Call session not found'
      )
    })

    it('should send DTMF to the correct session', async () => {
      await connectAdapter()

      const mockSession = createMockRTCSession('outgoing')
      mockUAInstance!.call.mockReturnValue(mockSession)

      const session = await adapter.call('sip:target@example.com')

      await adapter.sendDTMF(session.id, '1')

      expect(mockSession.sendDTMF).toHaveBeenCalledWith('1', expect.any(Object))
    })
  })
})

describe('JsSipAdapter - Unsupported Operations', () => {
  let adapter: JsSipAdapter
  let sipConfig: SipClientConfig

  beforeEach(() => {
    vi.clearAllMocks()
    mockUAInstance = null
    mockWebSocketInterfaceInstance = null

    sipConfig = createMockSipConfig({
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
    })

    adapter = new JsSipAdapter()
  })

  afterEach(async () => {
    if (adapter) {
      try {
        const destroyPromise = adapter.destroy()

        if (mockUAInstance) {
          setTimeout(() => {
            mockUAInstance?.__triggerEvent('unregistered')
            mockUAInstance?.__triggerEvent('disconnected')
          }, 0)
        }

        await destroyPromise
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe.each([
    {
      name: 'subscribe',
      operation: (adapter: JsSipAdapter) => adapter.subscribe('sip:target@example.com', 'presence'),
      expectedOp: 'subscribe',
      expectedSuggestion: 'SUBSCRIBE',
    },
    {
      name: 'unsubscribe',
      operation: (adapter: JsSipAdapter) =>
        adapter.unsubscribe('sip:target@example.com', 'presence'),
      expectedOp: 'unsubscribe',
      expectedSuggestion: 'SUBSCRIBE',
    },
    {
      name: 'publish',
      operation: (adapter: JsSipAdapter) => adapter.publish('presence', { status: 'online' }),
      expectedOp: 'publish',
      expectedSuggestion: 'PUBLISH',
    },
  ])('$name() - unsupported operation', ({ operation, expectedOp, expectedSuggestion }) => {
    beforeEach(async () => {
      await adapter.initialize(sipConfig)
    })

    it('should throw AdapterNotSupportedError', async () => {
      await expect(operation(adapter)).rejects.toThrow(AdapterNotSupportedError)
    })

    it('should include operation name in error', async () => {
      await expect(operation(adapter)).rejects.toMatchObject({
        operation: expectedOp,
      })
    })

    it('should include adapter name in error', async () => {
      await expect(operation(adapter)).rejects.toMatchObject({
        adapterName: 'JsSIP Adapter',
      })
    })

    it('should include helpful suggestion in error', async () => {
      await expect(operation(adapter)).rejects.toMatchObject({
        suggestion: expect.stringContaining(expectedSuggestion),
      })
    })
  })
})
