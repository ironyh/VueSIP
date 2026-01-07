/**
 * JsSIP Mock Module
 *
 * Automatic mock for JsSIP library. This module is automatically used when
 * tests call `vi.mock('jssip')` without a factory function.
 *
 * Access the mock state via the exported objects/functions.
 */
import { vi } from 'vitest'

// Event handler storage - exported for test access
export const eventHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}
export const onceHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}
export const sessionHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}

// Session ID counter
let sessionIdCounter = 0

/**
 * Trigger an event synchronously on the UA
 */
export const triggerEvent = (event: string, data?: unknown): void => {
  const handlers = eventHandlers[event] || []
  handlers.forEach((handler) => handler(data))

  const once = onceHandlers[event] || []
  once.forEach((handler) => handler(data))
  onceHandlers[event] = []
}

/**
 * Trigger an event asynchronously via microtask
 */
export const triggerEventAsync = (event: string, data?: unknown): void => {
  queueMicrotask(() => triggerEvent(event, data))
}

/**
 * Trigger a session event
 */
export const triggerSessionEvent = (event: string, data?: unknown): void => {
  const handlers = sessionHandlers[event] || []
  handlers.forEach((handler) => handler(data))
}

/**
 * Clear all handlers
 */
export const clearHandlers = (): void => {
  Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
  Object.keys(onceHandlers).forEach((key) => delete onceHandlers[key])
  Object.keys(sessionHandlers).forEach((key) => delete sessionHandlers[key])
}

/**
 * Mock RTC Session
 */
export const mockSession = {
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
  start_time: null as Date | null,
  end_time: null as Date | null,
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
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!sessionHandlers[event]) sessionHandlers[event] = []
    sessionHandlers[event].push(handler)
  }),
  off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (sessionHandlers[event]) {
      sessionHandlers[event] = sessionHandlers[event].filter((h) => h !== handler)
    }
  }),
  removeAllListeners: vi.fn(() => {
    Object.keys(sessionHandlers).forEach((key) => delete sessionHandlers[key])
  }),
}

/**
 * Mock UA
 */
export const mockUA = {
  start: vi.fn(),
  stop: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  sendMessage: vi.fn(),
  sendRequest: vi.fn(),
  terminateSessions: vi.fn(),
  call: vi.fn().mockReturnValue(mockSession),
  isConnected: vi.fn().mockReturnValue(false),
  isRegistered: vi.fn().mockReturnValue(false),
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!eventHandlers[event]) eventHandlers[event] = []
    eventHandlers[event].push(handler)
  }),
  once: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (!onceHandlers[event]) onceHandlers[event] = []
    onceHandlers[event].push(handler)
  }),
  off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (eventHandlers[event]) {
      eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler)
    }
    if (onceHandlers[event]) {
      onceHandlers[event] = onceHandlers[event].filter((h) => h !== handler)
    }
  }),
}

export const mockWebSocketInterface = vi.fn()

/**
 * Setup auto-connect: triggers connected event when once('connected') is called
 */
export const setupAutoConnect = (data: unknown = {}): void => {
  mockUA.once.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    if (!onceHandlers[event]) onceHandlers[event] = []
    onceHandlers[event].push(handler)
    if (event === 'connected') {
      mockUA.isConnected.mockReturnValue(true)
      queueMicrotask(() => {
        handler(data)
        const onHandlers = eventHandlers[event] || []
        onHandlers.forEach((h) => h(data))
      })
    }
  })
}

/**
 * Setup auto-register: triggers connected and registered events
 */
export const setupAutoRegister = (
  data: { response?: { getHeader: () => string } } = { response: { getHeader: () => '600' } }
): void => {
  mockUA.once.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
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
export const simulateConnect = (data: unknown = {}): void => {
  mockUA.isConnected.mockReturnValue(true)
  triggerEvent('connected', data)
}

/**
 * Simulate a successful registration
 */
export const simulateRegister = (
  data: { response?: { getHeader: () => string } } = { response: { getHeader: () => '600' } }
): void => {
  mockUA.isRegistered.mockReturnValue(true)
  triggerEvent('registered', data)
}

/**
 * Reset all mocks and handlers
 */
export const resetMockJsSip = (): void => {
  vi.clearAllMocks()
  clearHandlers()

  // Restore default implementations
  mockUA.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    if (!eventHandlers[event]) eventHandlers[event] = []
    eventHandlers[event].push(handler)
  })
  mockUA.once.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    if (!onceHandlers[event]) onceHandlers[event] = []
    onceHandlers[event].push(handler)
  })
  mockSession.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
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

  sessionIdCounter = 0
}

// Default export for vi.mock('jssip')
export default {
  UA: vi.fn(function () {
    return mockUA
  }),
  WebSocketInterface: mockWebSocketInterface,
  debug: {
    enable: vi.fn(),
    disable: vi.fn(),
  },
}
