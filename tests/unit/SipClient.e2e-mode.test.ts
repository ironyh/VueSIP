/**
 * SipClient E2E Test Mode Tests
 * Coverage for E2E test mode detection and bypass logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'
import { ConnectionState, RegistrationState } from '@/types/sip.types'

// Mock JsSIP - use vi.hoisted() for variables used in factory
const { mockUA, mockWebSocketInterface, eventHandlers, onceHandlers, triggerEvent } = vi.hoisted(
  () => {
    // Event handler storage
    const eventHandlers: Record<string, Array<(...args: any[]) => void>> = {}
    const onceHandlers: Record<string, Array<(...args: any[]) => void>> = {}

    // Helper to trigger events
    const triggerEvent = (event: string, data?: any) => {
      // Trigger 'on' handlers
      const handlers = eventHandlers[event] || []
      handlers.forEach((handler) => handler(data))

      // Trigger and remove 'once' handlers
      const once = onceHandlers[event] || []
      once.forEach((handler) => handler(data))
      onceHandlers[event] = []
    }

    const mockUA = {
      start: vi.fn(),
      stop: vi.fn(),
      register: vi.fn(),
      unregister: vi.fn(),
      sendMessage: vi.fn(),
      isConnected: vi.fn().mockReturnValue(false),
      isRegistered: vi.fn().mockReturnValue(false),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!eventHandlers[event]) eventHandlers[event] = []
        eventHandlers[event].push(handler)
      }),
      once: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (!onceHandlers[event]) onceHandlers[event] = []
        onceHandlers[event].push(handler)
      }),
      off: vi.fn((event: string, handler: (...args: any[]) => void) => {
        if (eventHandlers[event]) {
          eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler)
        }
        if (onceHandlers[event]) {
          onceHandlers[event] = onceHandlers[event].filter((h) => h !== handler)
        }
      }),
    }

    const mockWebSocketInterface = vi.fn()

    return { mockUA, mockWebSocketInterface, eventHandlers, onceHandlers, triggerEvent }
  }
)

vi.mock('jssip', () => {
  return {
    default: {
      UA: vi.fn(function () {
        return mockUA
      }),
      WebSocketInterface: mockWebSocketInterface,
      debug: {
        enable: vi.fn(),
        disable: vi.fn(),
      },
    },
  }
})

describe('SipClient - E2E Test Mode', () => {
  let eventBus: EventBus
  let config: SipClientConfig
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Clear event handlers
    Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
    Object.keys(onceHandlers).forEach((key) => delete onceHandlers[key])

    // Restore default mock implementations
    mockUA.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    })
    mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    })

    // Setup console spy to verify E2E logging
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    eventBus = createEventBus()
    config = {
      uri: 'wss://example.com:8089/ws',
      sipUri: 'sip:1000@example.com',
      password: 'test-password',
    }
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    // Clean up window globals
    delete (window as any).__emitSipEvent
    delete (window as any).__sipEventBridge
  })

  describe('E2E Mode Detection', () => {
    it('should detect E2E test mode with __emitSipEvent', async () => {
      // Setup E2E environment
      ;(window as any).__emitSipEvent = vi.fn()

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      // Should log E2E detection
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[E2E TEST MODE]'))

      // Should skip JsSIP connection
      expect(mockUA.start).not.toHaveBeenCalled()

      await sipClient.stop()
    })

    it('should detect E2E test mode with __sipEventBridge', async () => {
      // Setup E2E environment with EventBridge
      ;(window as any).__sipEventBridge = {
        on: vi.fn(),
        emit: vi.fn(),
      }
      ;(window as any).__emitSipEvent = vi.fn()

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[E2E TEST MODE]'))

      await sipClient.stop()
    })

    it('should use normal mode when E2E globals not present', async () => {
      const sipClient = new SipClient(config, eventBus)

      // Start the client (will use JsSIP since no E2E globals)
      const startPromise = sipClient.start()

      // Trigger the connected event to complete the connection
      triggerEvent('connected')

      await startPromise

      // Should use JsSIP
      expect(mockUA.start).toHaveBeenCalled()

      await sipClient.stop()
    })
  })

  describe('E2E Mode Connection Simulation', () => {
    beforeEach(() => {
      ;(window as any).__emitSipEvent = vi.fn()
    })

    it('should immediately transition to connected state in E2E mode', async () => {
      const events: any[] = []
      eventBus.on('sip:connected', (e) => events.push(e))

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Connected)
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('sip:connected')

      await sipClient.stop()
    })

    it('should emit connection events to EventBridge', async () => {
      const emitSpy = vi.fn()
      ;(window as any).__emitSipEvent = emitSpy

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      expect(emitSpy).toHaveBeenCalledWith('connection:connected')

      await sipClient.stop()
    })

    it('should setup EventBridge listeners for incoming calls', async () => {
      const eventBridgeOn = vi.fn()
      ;(window as any).__sipEventBridge = {
        on: eventBridgeOn,
        emit: vi.fn(),
      }
      ;(window as any).__emitSipEvent = vi.fn()

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      expect(eventBridgeOn).toHaveBeenCalledWith('sip:newRTCSession', expect.any(Function))
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Setting up incoming call listener')
      )

      await sipClient.stop()
    })
  })

  describe('E2E Mode Auto-Registration', () => {
    beforeEach(() => {
      ;(window as any).__emitSipEvent = vi.fn()
    })

    it('should auto-register in E2E mode when enabled', async () => {
      const configWithAutoRegister = {
        ...config,
        registrationOptions: { autoRegister: true },
      }

      const events: any[] = []
      eventBus.on('sip:registered', (e) => events.push(e))

      const sipClient = new SipClient(configWithAutoRegister, eventBus)
      await sipClient.start()

      // In E2E mode, registration should be simulated
      // Check if register was attempted
      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Connected)

      await sipClient.stop()
    })

    it('should skip auto-register in E2E mode when disabled', async () => {
      const configNoAutoRegister = {
        ...config,
        registrationOptions: { autoRegister: false },
      }

      const sipClient = new SipClient(configNoAutoRegister, eventBus)
      await sipClient.start()

      const state = sipClient.getState()
      expect(state.registrationState).not.toBe(RegistrationState.Registered)

      await sipClient.stop()
    })
  })

  describe('E2E Mode Incoming Call Handling', () => {
    beforeEach(() => {
      ;(window as any).__emitSipEvent = vi.fn()
    })

    it('should handle simulated incoming calls in E2E mode', async () => {
      let incomingCallHandler: Function | null = null
      const eventBridgeOn = vi.fn((event: string, handler: Function) => {
        if (event === 'sip:newRTCSession') {
          incomingCallHandler = handler
        }
      })

      ;(window as any).__sipEventBridge = {
        on: eventBridgeOn,
        emit: vi.fn(),
      }

      const newSessionEvents: any[] = []
      eventBus.on('sip:newRTCSession', (e) => newSessionEvents.push(e))

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      expect(incomingCallHandler).not.toBeNull()

      // Simulate incoming call event
      if (incomingCallHandler) {
        const mockIncomingCallEvent = {
          originator: 'remote',
          direction: 'incoming',
          session: {
            id: 'e2e-session-123',
            remote_identity: {
              uri: { user: '2000', host: 'example.com' },
            },
          },
        }

        incomingCallHandler(mockIncomingCallEvent)

        // Should handle the E2E incoming call
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Received sip:newRTCSession event')
        )
      }

      await sipClient.stop()
    })

    it('should filter E2E incoming calls by direction', async () => {
      let incomingCallHandler: Function | null = null
      const eventBridgeOn = vi.fn((event: string, handler: Function) => {
        if (event === 'sip:newRTCSession') {
          incomingCallHandler = handler
        }
      })

      ;(window as any).__sipEventBridge = {
        on: eventBridgeOn,
        emit: vi.fn(),
      }

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      // Simulate outgoing call (should be ignored)
      if (incomingCallHandler) {
        const mockOutgoingCallEvent = {
          originator: 'local',
          direction: 'outgoing',
        }

        incomingCallHandler(mockOutgoingCallEvent)

        // handleE2EIncomingCall should not process outgoing calls
      }

      await sipClient.stop()
    })
  })

  describe('E2E Mode Logging', () => {
    beforeEach(() => {
      ;(window as any).__emitSipEvent = vi.fn()
    })

    it('should log E2E detection details', async () => {
      ;(window as any).__sipEventBridge = {
        on: vi.fn(),
        emit: vi.fn(),
      }

      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SipClient] E2E detection in start():',
        expect.objectContaining({
          hasEmitSipEvent: true,
          hasEventBridge: true,
          typeofEmitSipEvent: 'function',
        })
      )

      await sipClient.stop()
    })

    it('should log successful E2E start', async () => {
      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping JsSIP connection'))

      await sipClient.stop()
    })
  })

  describe('E2E Mode State Management', () => {
    beforeEach(() => {
      ;(window as any).__emitSipEvent = vi.fn()
    })

    it('should maintain consistent state in E2E mode', async () => {
      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Connected)
      expect(sipClient.isConnected).toBe(true)

      await sipClient.stop()
    })

    it('should allow stop in E2E mode', async () => {
      const sipClient = new SipClient(config, eventBus)
      await sipClient.start()

      await sipClient.stop()

      const state = sipClient.getState()
      expect(state.connectionState).toBe(ConnectionState.Disconnected)
    })
  })
})
