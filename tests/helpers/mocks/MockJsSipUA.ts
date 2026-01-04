/**
 * MockJsSipUA - Unified JsSIP UA mock factory for unit tests
 *
 * Consolidates duplicate mock code from SipClient test files into a single,
 * reusable factory with comprehensive event management and simulation helpers.
 *
 * @example
 * ```ts
 * const { mockUA, mockJsSip, triggerEvent, simulateConnect } = createMockJsSipUA()
 *
 * vi.mock('jssip', () => mockJsSip)
 *
 * // Trigger events manually
 * triggerEvent('connected', { socket: mockSocket })
 *
 * // Or use convenience methods
 * simulateConnect() // Auto-triggers connected event
 * simulateRegister() // Auto-triggers registered event
 * ```
 */
import { vi, type Mock } from 'vitest'

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (...args: T[]) => void

/**
 * Mock UA interface matching JsSIP UA
 */
export interface MockUA {
  start: Mock<() => void>
  stop: Mock<() => void>
  register: Mock<() => void>
  unregister: Mock<() => void>
  sendMessage: Mock<(target: string, body: string, options?: unknown) => void>
  call: Mock<(target: string, options?: unknown) => MockRTCSession>
  isConnected: Mock<() => boolean>
  isRegistered: Mock<() => boolean>
  on: Mock<(event: string, handler: EventHandler) => void>
  once: Mock<(event: string, handler: EventHandler) => void>
  off: Mock<(event: string, handler: EventHandler) => void>
}

/**
 * Mock RTC session interface
 */
export interface MockRTCSession {
  id: string
  connection: {
    getRemoteStreams: Mock<() => unknown[]>
    getLocalStreams: Mock<() => unknown[]>
  }
  remote_identity: {
    uri: string
    display_name: string
  }
  local_identity: {
    uri: string
  }
  start_time: Date | null
  end_time: Date | null
  isEnded: Mock<() => boolean>
  isEstablished: Mock<() => boolean>
  isInProgress: Mock<() => boolean>
  isMuted: Mock<() => boolean>
  isOnHold: Mock<() => boolean>
  answer: Mock<(options?: unknown) => void>
  terminate: Mock<(options?: unknown) => void>
  hold: Mock<() => void>
  unhold: Mock<() => void>
  mute: Mock<(options?: { audio?: boolean; video?: boolean }) => void>
  unmute: Mock<(options?: { audio?: boolean; video?: boolean }) => void>
  sendDTMF: Mock<(tone: string, options?: unknown) => void>
  renegotiate: Mock<(options?: unknown) => void>
  refer: Mock<(target: string, options?: unknown) => void>
  on: Mock<(event: string, handler: EventHandler) => void>
  off: Mock<(event: string, handler: EventHandler) => void>
  removeAllListeners: Mock<() => void>
}

/**
 * Result from createMockJsSipUA factory
 */
export interface MockJsSipUAResult {
  /** Mock UA instance */
  mockUA: MockUA
  /** Mock WebSocketInterface constructor */
  mockWebSocketInterface: Mock
  /** Mock session (for call tests) */
  mockSession: MockRTCSession
  /** UA event handlers storage */
  eventHandlers: Record<string, EventHandler[]>
  /** UA once handlers storage */
  onceHandlers: Record<string, EventHandler[]>
  /** Session event handlers storage */
  sessionHandlers: Record<string, EventHandler[]>
  /** Trigger an event on the UA */
  triggerEvent: (event: string, data?: unknown) => void
  /** Trigger an event asynchronously via microtask */
  triggerEventAsync: (event: string, data?: unknown) => void
  /** Trigger a session event */
  triggerSessionEvent: (event: string, data?: unknown) => void
  /** Clear all event handlers */
  clearHandlers: () => void
  /** Reset all mocks and handlers */
  reset: () => void
  /** Setup auto-connect behavior (triggers connected event when once('connected') called) */
  setupAutoConnect: (data?: unknown) => void
  /** Setup auto-register behavior (triggers connected and registered events) */
  setupAutoRegister: (data?: { response?: { getHeader: () => string } }) => void
  /** Simulate a successful connection */
  simulateConnect: (data?: unknown) => void
  /** Simulate a successful registration */
  simulateRegister: (data?: { response?: { getHeader: () => string } }) => void
  /** Simulate a disconnection */
  simulateDisconnect: (data?: { error?: boolean; code?: number; reason?: string }) => void
  /** Simulate an unregistration */
  simulateUnregister: (data?: unknown) => void
  /** Simulate an incoming call */
  simulateIncomingCall: (session?: Partial<MockRTCSession>) => MockRTCSession
  /** The mock JsSIP module for vi.mock() */
  mockJsSip: {
    default: {
      UA: Mock
      WebSocketInterface: Mock
      debug: {
        enable: Mock
        disable: Mock
      }
    }
  }
}

/**
 * Create a mock JsSIP UA with comprehensive event management
 *
 * This factory creates a fully-featured mock that can be used with vi.hoisted()
 * for proper module mocking in Vitest.
 *
 * @returns Mock UA and helpers for testing
 */
export function createMockJsSipUA(): MockJsSipUAResult {
  // Event handler storage
  const eventHandlers: Record<string, EventHandler[]> = {}
  const onceHandlers: Record<string, EventHandler[]> = {}
  const sessionHandlers: Record<string, EventHandler[]> = {}

  // Session ID counter
  let sessionIdCounter = 0

  /**
   * Trigger an event synchronously on the UA
   */
  const triggerEvent = (event: string, data?: unknown): void => {
    // Trigger 'on' handlers
    const handlers = eventHandlers[event] || []
    handlers.forEach((handler) => handler(data))

    // Trigger and remove 'once' handlers
    const once = onceHandlers[event] || []
    once.forEach((handler) => handler(data))
    onceHandlers[event] = []
  }

  /**
   * Trigger an event asynchronously via microtask (deterministic, no setTimeout)
   */
  const triggerEventAsync = (event: string, data?: unknown): void => {
    queueMicrotask(() => triggerEvent(event, data))
  }

  /**
   * Trigger a session event
   */
  const triggerSessionEvent = (event: string, data?: unknown): void => {
    const handlers = sessionHandlers[event] || []
    handlers.forEach((handler) => handler(data))
  }

  /**
   * Clear all handlers
   */
  const clearHandlers = (): void => {
    Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
    Object.keys(onceHandlers).forEach((key) => delete onceHandlers[key])
    Object.keys(sessionHandlers).forEach((key) => delete sessionHandlers[key])
  }

  // Create mock session
  const mockSession: MockRTCSession = {
    get id() {
      return `session-${++sessionIdCounter}`
    },
    connection: {
      getRemoteStreams: vi.fn().mockReturnValue([]),
      getLocalStreams: vi.fn().mockReturnValue([]),
    },
    remote_identity: {
      uri: 'sip:2000@example.com',
      display_name: 'Remote User',
    },
    local_identity: {
      uri: 'sip:1000@example.com',
    },
    start_time: null,
    end_time: null,
    isEnded: vi.fn().mockReturnValue(false),
    isEstablished: vi.fn().mockReturnValue(false),
    isInProgress: vi.fn().mockReturnValue(false),
    isMuted: vi.fn().mockReturnValue(false),
    isOnHold: vi.fn().mockReturnValue(false),
    answer: vi.fn(),
    terminate: vi.fn(),
    hold: vi.fn(),
    unhold: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    sendDTMF: vi.fn(),
    renegotiate: vi.fn(),
    refer: vi.fn(),
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!sessionHandlers[event]) sessionHandlers[event] = []
      sessionHandlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: EventHandler) => {
      if (sessionHandlers[event]) {
        sessionHandlers[event] = sessionHandlers[event].filter((h) => h !== handler)
      }
    }),
    removeAllListeners: vi.fn(() => {
      Object.keys(sessionHandlers).forEach((key) => delete sessionHandlers[key])
    }),
  } as MockRTCSession

  // Create mock UA
  const mockUA: MockUA = {
    start: vi.fn(),
    stop: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    sendMessage: vi.fn(),
    call: vi.fn().mockReturnValue(mockSession),
    isConnected: vi.fn().mockReturnValue(false),
    isRegistered: vi.fn().mockReturnValue(false),
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    once: vi.fn((event: string, handler: EventHandler) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: EventHandler) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler)
      }
      if (onceHandlers[event]) {
        onceHandlers[event] = onceHandlers[event].filter((h) => h !== handler)
      }
    }),
  }

  const mockWebSocketInterface = vi.fn()

  /**
   * Setup auto-connect behavior: triggers connected event when once('connected') is called
   */
  const setupAutoConnect = (data: unknown = {}): void => {
    mockUA.once.mockImplementation((event: string, handler: EventHandler) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
      if (event === 'connected') {
        mockUA.isConnected.mockReturnValue(true)
        queueMicrotask(() => {
          handler(data)
          // Also trigger 'on' handlers for the same event
          const onHandlers = eventHandlers[event] || []
          onHandlers.forEach((h) => h(data))
        })
      }
    })
  }

  /**
   * Setup auto-register behavior: triggers connected and registered events
   */
  const setupAutoRegister = (
    data: { response?: { getHeader: () => string } } = {
      response: { getHeader: () => '600' },
    }
  ): void => {
    mockUA.once.mockImplementation((event: string, handler: EventHandler) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
      if (event === 'connected') {
        mockUA.isConnected.mockReturnValue(true)
        queueMicrotask(() => handler({}))
      } else if (event === 'registered') {
        mockUA.isRegistered.mockReturnValue(true)
        queueMicrotask(() => handler(data))
      }
    })
  }

  /**
   * Simulate a successful connection
   */
  const simulateConnect = (data: unknown = {}): void => {
    mockUA.isConnected.mockReturnValue(true)
    triggerEvent('connected', data)
  }

  /**
   * Simulate a successful registration
   */
  const simulateRegister = (
    data: { response?: { getHeader: () => string } } = {
      response: { getHeader: () => '600' },
    }
  ): void => {
    mockUA.isRegistered.mockReturnValue(true)
    triggerEvent('registered', data)
  }

  /**
   * Simulate a disconnection
   */
  const simulateDisconnect = (
    data: { error?: boolean; code?: number; reason?: string } = {}
  ): void => {
    mockUA.isConnected.mockReturnValue(false)
    mockUA.isRegistered.mockReturnValue(false)
    triggerEvent('disconnected', data)
  }

  /**
   * Simulate an unregistration
   */
  const simulateUnregister = (data: unknown = {}): void => {
    mockUA.isRegistered.mockReturnValue(false)
    triggerEvent('unregistered', data)
  }

  /**
   * Simulate an incoming call
   */
  const simulateIncomingCall = (sessionOverrides: Partial<MockRTCSession> = {}): MockRTCSession => {
    const incomingSession = { ...mockSession, ...sessionOverrides }
    triggerEvent('newRTCSession', {
      session: incomingSession,
      originator: 'remote',
      request: {
        from: { uri: 'sip:caller@example.com', display_name: 'Caller' },
        to: { uri: 'sip:callee@example.com' },
      },
    })
    return incomingSession as MockRTCSession
  }

  /**
   * Reset all mocks and handlers to initial state
   */
  const reset = (): void => {
    vi.clearAllMocks()
    clearHandlers()

    // Restore default implementations
    mockUA.on.mockImplementation((event: string, handler: EventHandler) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    })
    mockUA.once.mockImplementation((event: string, handler: EventHandler) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    })
    mockSession.on.mockImplementation((event: string, handler: EventHandler) => {
      if (!sessionHandlers[event]) sessionHandlers[event] = []
      sessionHandlers[event].push(handler)
    })

    // Reset return values
    mockUA.isConnected.mockReturnValue(false)
    mockUA.isRegistered.mockReturnValue(false)
    mockUA.call.mockReturnValue(mockSession)
    mockSession.isEnded.mockReturnValue(false)
    mockSession.isEstablished.mockReturnValue(false)
    mockSession.isInProgress.mockReturnValue(false)
    mockSession.isMuted.mockReturnValue(false)
    mockSession.isOnHold.mockReturnValue(false)

    // Reset session ID counter
    sessionIdCounter = 0
  }

  // The mock JsSIP module for vi.mock()
  const mockJsSip = {
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

  return {
    mockUA,
    mockWebSocketInterface,
    mockSession,
    eventHandlers,
    onceHandlers,
    sessionHandlers,
    triggerEvent,
    triggerEventAsync,
    triggerSessionEvent,
    clearHandlers,
    reset,
    setupAutoConnect,
    setupAutoRegister,
    simulateConnect,
    simulateRegister,
    simulateDisconnect,
    simulateUnregister,
    simulateIncomingCall,
    mockJsSip,
  }
}

/**
 * Create mock for use with vi.hoisted()
 *
 * This is a convenience wrapper that returns the values in a format
 * suitable for vi.hoisted() destructuring.
 *
 * @example
 * ```ts
 * const { mockUA, mockJsSip, triggerEvent, ... } = vi.hoisted(() => createHoistedMockJsSipUA())
 *
 * vi.mock('jssip', () => mockJsSip)
 * ```
 */
export function createHoistedMockJsSipUA(): MockJsSipUAResult {
  return createMockJsSipUA()
}

export default createMockJsSipUA
