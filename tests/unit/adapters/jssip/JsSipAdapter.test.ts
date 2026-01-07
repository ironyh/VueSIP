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
import { createMockSipConfig, createMockUA } from '../../../utils/test-helpers'

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
        await adapter.destroy()
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
})
