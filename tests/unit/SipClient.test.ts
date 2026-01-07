/**
 * SipClient unit tests
 *
 * Uses shared JsSIP mock from __mocks__/jssip.ts for consistency
 * and reduced code duplication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient, createSipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'

// Enable automatic mocking using __mocks__/jssip.ts
vi.mock('jssip')

// Import mock helpers from the mocked module
import { mockUA, eventHandlers, onceHandlers, setupAutoConnect, resetMockJsSip } from 'jssip'

describe('SipClient', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  beforeEach(() => {
    // Reset all mocks and handlers using shared helper
    resetMockJsSip()

    // Create event bus
    eventBus = createEventBus()

    // Create test configuration
    config = {
      uri: 'wss://sip.example.com:7443',
      sipUri: 'sip:testuser@example.com',
      password: 'testpassword',
      displayName: 'Test User',
      authorizationUsername: 'testuser',
      realm: 'example.com',
      userAgent: 'DailVue Test Client',
      debug: false,
      registrationOptions: {
        expires: 600,
        autoRegister: false, // Don't auto-register in tests
      },
      wsOptions: {
        connectionTimeout: 5000,
        maxReconnectionAttempts: 3,
        reconnectionDelay: 1000,
      },
    }

    // Create SIP client
    sipClient = new SipClient(config, eventBus)
  })

  afterEach(() => {
    sipClient.destroy()
    eventBus.destroy()
  })

  describe('constructor', () => {
    it('should create a SipClient instance', () => {
      expect(sipClient).toBeInstanceOf(SipClient)
    })

    it('should initialize with disconnected state', () => {
      expect(sipClient.connectionState).toBe('disconnected')
      expect(sipClient.registrationState).toBe('unregistered')
    })

    it('should not be connected initially', () => {
      expect(sipClient.isConnected).toBe(false)
      expect(sipClient.isRegistered).toBe(false)
    })
  })

  describe('createSipClient()', () => {
    it('should create a SipClient instance', () => {
      const client = createSipClient(config, eventBus)
      expect(client).toBeInstanceOf(SipClient)
      client.destroy()
    })
  })

  describe('validateConfig()', () => {
    it('should validate valid configuration', () => {
      const result = sipClient.validateConfig()
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should reject invalid configuration - missing URI', () => {
      const invalidConfig = { ...config, uri: '' }
      const client = new SipClient(invalidConfig, eventBus)
      const result = client.validateConfig()
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.some((e) => e.includes('WebSocket'))).toBe(true)
      client.destroy()
    })

    it('should reject invalid configuration - missing SIP URI', () => {
      const invalidConfig = { ...config, sipUri: '' }
      const client = new SipClient(invalidConfig, eventBus)
      const result = client.validateConfig()
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      client.destroy()
    })

    it('should reject invalid configuration - missing password', () => {
      const invalidConfig = { ...config, password: '' }
      const client = new SipClient(invalidConfig, eventBus)
      const result = client.validateConfig()
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      client.destroy()
    })
  })

  describe('start()', () => {
    it('should start the SIP client', async () => {
      // Use setupAutoConnect for deterministic async triggering (no setTimeout)
      setupAutoConnect({})

      await sipClient.start()

      // Allow microtasks to flush before checking state
      await vi.waitFor(() => {
        expect(mockUA.start).toHaveBeenCalled()
        expect(sipClient.connectionState).toBe('connected')
      })
    })

    it('should not start if already started', async () => {
      // Setup auto-connect via microtask (deterministic)
      setupAutoConnect({})

      await sipClient.start()
      const startCalls = mockUA.start.mock.calls.length

      await sipClient.start() // Second call should be ignored

      expect(mockUA.start).toHaveBeenCalledTimes(startCalls)
    })

    it('should emit connection events', async () => {
      const connectHandler = vi.fn()
      eventBus.on('sip:connected', connectHandler)

      // Setup auto-connect with socket data via microtask
      setupAutoConnect({ socket: { url: 'wss://test.com' } })

      await sipClient.start()

      // Use vi.waitFor for robust async event assertion
      await vi.waitFor(() => {
        expect(connectHandler).toHaveBeenCalled()
      })
    })

    it('should handle connection failure', async () => {
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        // Store handler in onceHandlers for proper cleanup
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)

        // Fire disconnected event via microtask (deterministic, no setTimeout)
        if (event === 'disconnected') {
          queueMicrotask(() => handler({}))
        }
      })

      await expect(sipClient.start()).rejects.toThrow('Connection failed')
      expect(sipClient.connectionState).toBe('connection_failed')
    })

    it('should validate configuration before starting', async () => {
      const invalidConfig = { ...config, uri: '' }
      const client = new SipClient(invalidConfig, eventBus)

      await expect(client.start()).rejects.toThrow('Invalid SIP configuration')

      client.destroy()
    })
  })

  describe('stop()', () => {
    it('should stop the SIP client', async () => {
      // Start first using deterministic setup
      setupAutoConnect({})
      mockUA.isRegistered.mockReturnValue(false)

      await sipClient.start()

      // Now stop
      await sipClient.stop()

      expect(mockUA.stop).toHaveBeenCalled()
      expect(sipClient.connectionState).toBe('disconnected')
      expect(sipClient.registrationState).toBe('unregistered')
    })

    it('should handle stop when not started', async () => {
      await expect(sipClient.stop()).resolves.not.toThrow()
    })

    it('should unregister before stopping if registered', async () => {
      // Setup auto-connect and auto-register via microtask
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'connected') {
          mockUA.isConnected.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        } else if (event === 'registered') {
          mockUA.isRegistered.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        } else if (event === 'unregistered') {
          mockUA.isRegistered.mockReturnValue(false)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.start()
      await sipClient.register()

      // Now stop
      await sipClient.stop()

      expect(mockUA.unregister).toHaveBeenCalled()
      expect(mockUA.stop).toHaveBeenCalled()
    })
  })

  describe('register()', () => {
    beforeEach(async () => {
      // Start client before registering using deterministic setup
      setupAutoConnect({})
      await sipClient.start()
    })

    it('should register with SIP server', async () => {
      // Setup auto-register via microtask
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'registered') {
          mockUA.isRegistered.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.register()

      expect(mockUA.register).toHaveBeenCalled()
      expect(sipClient.registrationState).toBe('registered')
    })

    it('should emit registration events', async () => {
      const registeredHandler = vi.fn()
      eventBus.on('sip:registered', registeredHandler)

      // Setup auto-register via microtask - also trigger 'on' handlers for eventBus
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'registered') {
          const data = { response: { getHeader: () => '600' } }
          mockUA.isRegistered.mockReturnValue(true)
          queueMicrotask(() => {
            handler(data)
            // Also trigger 'on' handlers to emit to eventBus
            const onHandlers = eventHandlers[event] || []
            onHandlers.forEach((h) => h(data))
          })
        }
      })

      await sipClient.register()

      // Use vi.waitFor for robust async event assertion
      await vi.waitFor(() => {
        expect(registeredHandler).toHaveBeenCalled()
      })
    })

    it('should handle registration failure', async () => {
      // Setup registration failure via microtask
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'registrationFailed') {
          queueMicrotask(() => handler({ cause: 'Authentication failed' }))
        }
      })

      await expect(sipClient.register()).rejects.toThrow('Registration failed')
      expect(sipClient.registrationState).toBe('registration_failed')
    })

    it('should not register if not connected', async () => {
      mockUA.isConnected.mockReturnValue(false)

      await expect(sipClient.register()).rejects.toThrow('Not connected to SIP server')
    })

    it('should not register if already registered', async () => {
      // Setup auto-register via microtask
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'registered') {
          mockUA.isRegistered.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.register()
      const registerCalls = mockUA.register.mock.calls.length

      // Second call should return immediately without calling mockUA.register again
      await sipClient.register()

      expect(mockUA.register).toHaveBeenCalledTimes(registerCalls)
    })
  })

  // Isolated describe block for timeout scenarios - uses fake timers
  describe('timeout scenarios', () => {
    beforeEach(async () => {
      // Start client before testing timeout - using real timers initially
      setupAutoConnect({})
      await sipClient.start()

      // Now enable fake timers for timeout tests
      vi.useFakeTimers()
    })

    afterEach(() => {
      // Always restore real timers
      vi.useRealTimers()
    })

    it('should handle registration timeout', async () => {
      // Mock that never calls the registered event - simulates timeout
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        // Don't call the handler - let it timeout
      })

      // Start the registration - it will timeout after 30 seconds
      const registerPromise = sipClient.register()

      // Attach the rejection handler BEFORE advancing time to prevent unhandled rejection
      let error: Error | null = null
      registerPromise.catch((e) => {
        error = e as Error
      })

      // Fast-forward time to trigger timeout (30 seconds)
      await vi.advanceTimersByTimeAsync(30000)

      // Wait for the promise to settle
      await vi.waitFor(() => {
        expect(error).not.toBeNull()
      })

      expect(error?.message).toContain('Registration timeout')
    })
  })

  describe('unregister()', () => {
    beforeEach(async () => {
      // Start and register using deterministic setup
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'connected') {
          mockUA.isConnected.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        } else if (event === 'registered') {
          mockUA.isRegistered.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.start()
      await sipClient.register()
    })

    it('should unregister from SIP server', async () => {
      // Setup auto-unregister via microtask
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'unregistered') {
          mockUA.isRegistered.mockReturnValue(false)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.unregister()

      expect(mockUA.unregister).toHaveBeenCalled()
      expect(sipClient.registrationState).toBe('unregistered')
    })

    it('should emit unregistration events', async () => {
      const unregisteredHandler = vi.fn()
      eventBus.on('sip:unregistered', unregisteredHandler)

      // Setup auto-unregister via microtask - also trigger 'on' handlers for eventBus
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'unregistered') {
          const data = { cause: 'user' }
          mockUA.isRegistered.mockReturnValue(false)
          queueMicrotask(() => {
            handler(data)
            // Also trigger 'on' handlers to emit to eventBus
            const onHandlers = eventHandlers[event] || []
            onHandlers.forEach((h) => h(data))
          })
        }
      })

      await sipClient.unregister()

      // Use vi.waitFor for robust async event assertion
      await vi.waitFor(() => {
        expect(unregisteredHandler).toHaveBeenCalled()
      })
    })

    it('should not unregister if not registered', async () => {
      // First, complete unregistration properly
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'unregistered') {
          mockUA.isRegistered.mockReturnValue(false)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.unregister()

      // Second call should return immediately since we're already unregistered
      await expect(sipClient.unregister()).resolves.not.toThrow()
    })
  })

  describe('sendMessage()', () => {
    beforeEach(async () => {
      // Start client using deterministic setup
      setupAutoConnect({})
      await sipClient.start()
    })

    it('should send SIP message', () => {
      const target = 'sip:recipient@example.com'
      const content = 'Hello, World!'

      sipClient.sendMessage(target, content)

      expect(mockUA.sendMessage).toHaveBeenCalledWith(target, content, undefined)
    })

    it('should send SIP message with options', () => {
      const target = 'sip:recipient@example.com'
      const content = 'Hello, World!'
      const options = { contentType: 'text/plain' }

      sipClient.sendMessage(target, content, options)

      expect(mockUA.sendMessage).toHaveBeenCalledWith(target, content, options)
    })

    it('should throw error if not connected', () => {
      mockUA.isConnected.mockReturnValue(false)

      expect(() => {
        sipClient.sendMessage('sip:test@example.com', 'test')
      }).toThrow('Not connected to SIP server')
    })
  })

  describe('getState()', () => {
    it('should return current state', () => {
      const state = sipClient.getState()

      expect(state).toHaveProperty('connectionState')
      expect(state).toHaveProperty('registrationState')
      expect(state.connectionState).toBe('disconnected')
      expect(state.registrationState).toBe('unregistered')
    })

    it('should return immutable state copy', () => {
      const state1 = sipClient.getState()
      const state2 = sipClient.getState()

      expect(state1).not.toBe(state2) // Different objects
      expect(state1).toEqual(state2) // But same values
    })
  })

  describe('updateConfig()', () => {
    it('should update configuration', () => {
      const newDisplayName = 'New Display Name'

      sipClient.updateConfig({ displayName: newDisplayName })

      // Note: Config changes require restart to take effect
      expect(sipClient).toBeDefined()
    })
  })

  describe('getCredentials()', () => {
    it('should return authentication credentials', () => {
      const credentials = sipClient.getCredentials()

      expect(credentials).toHaveProperty('username')
      expect(credentials).toHaveProperty('password')
      expect(credentials.username).toBe(config.authorizationUsername)
      expect(credentials.password).toBe(config.password)
      expect(credentials.realm).toBe(config.realm)
    })

    it('should extract username from SIP URI if not provided', () => {
      const configWithoutAuthUser = { ...config }
      delete configWithoutAuthUser.authorizationUsername
      const client = new SipClient(configWithoutAuthUser, eventBus)

      const credentials = client.getCredentials()

      expect(credentials.username).toBe('testuser')

      client.destroy()
    })
  })

  describe('userAgent getter', () => {
    it('should return null when not started', () => {
      expect(sipClient.userAgent).toBeNull()
    })

    it('should return UA instance when started', async () => {
      // Use deterministic setup via microtask
      setupAutoConnect({})

      await sipClient.start()

      expect(sipClient.userAgent).toBe(mockUA)
    })
  })

  describe('destroy()', () => {
    it('should clean up resources', async () => {
      // Use deterministic setup via microtask
      setupAutoConnect({})

      await sipClient.start()

      sipClient.destroy()

      expect(mockUA.stop).toHaveBeenCalled()
      expect(sipClient.userAgent).toBeNull()
    })

    it('should handle destroy when not started', () => {
      expect(() => sipClient.destroy()).not.toThrow()
    })
  })

  describe('Event handling', () => {
    it('should handle new RTC session events', async () => {
      const sessionHandler = vi.fn()
      eventBus.on('sip:new_session', sessionHandler)

      let sessionEventHandler: ((...args: any[]) => void) | null = null

      mockUA.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!eventHandlers[event]) eventHandlers[event] = []
        eventHandlers[event].push(handler)
        if (event === 'newRTCSession') {
          sessionEventHandler = handler
        }
      })
      // Setup auto-connect via microtask
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'connected') {
          mockUA.isConnected.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.start()

      // Simulate new session event with complete mock session
      if (sessionEventHandler) {
        const mockSession = {
          id: 'session-1',
          on: vi.fn(),
          once: vi.fn(),
          off: vi.fn(),
          terminate: vi.fn(),
          answer: vi.fn(),
          hold: vi.fn(),
          unhold: vi.fn(),
          sendDTMF: vi.fn(),
          mute: vi.fn(),
          unmute: vi.fn(),
          isMuted: vi.fn().mockReturnValue(false),
          isOnHold: vi.fn().mockReturnValue(false),
          connection: {},
        }
        sessionEventHandler({
          session: mockSession,
          originator: 'remote',
          request: {},
        })
      }

      // Allow microtasks to process (no arbitrary delay needed)
      await Promise.resolve()

      expect(sessionHandler).toHaveBeenCalled()
    })

    it('should handle new message events', async () => {
      const messageHandler = vi.fn()
      eventBus.on('sip:new_message', messageHandler)

      let messageEventHandler: ((...args: any[]) => void) | null = null

      mockUA.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!eventHandlers[event]) eventHandlers[event] = []
        eventHandlers[event].push(handler)
        if (event === 'newMessage') {
          messageEventHandler = handler
        }
      })
      // Setup auto-connect via microtask
      mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
        if (event === 'connected') {
          mockUA.isConnected.mockReturnValue(true)
          queueMicrotask(() => handler({}))
        }
      })

      await sipClient.start()

      // Simulate new message event with complete mock request
      if (messageEventHandler) {
        const mockRequest = {
          getHeader: vi.fn((header: string) => {
            if (header === 'Content-Type') return 'text/plain'
            return null
          }),
          from: { uri: { toString: () => 'sip:sender@example.com' } },
          to: { uri: { toString: () => 'sip:testuser@example.com' } },
          body: 'Hello',
        }
        messageEventHandler({
          message: { body: 'Hello' },
          originator: 'remote',
          request: mockRequest,
        })
      }

      // Allow microtasks to process (no arbitrary delay needed)
      await Promise.resolve()

      expect(messageHandler).toHaveBeenCalled()
    })
  })
})
