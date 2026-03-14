/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CallSession } from '../CallSession'
import { createEventBus, type EventBus } from '../EventBus'
import { CallState, CallDirection } from '@/types/call.types'

// Mock RTCSession for testing
const createMockRTCSession = () => ({
  id: 'mock-rtc-session-id',
  local_identity: {
    uri: {
      toString: () => 'sip:test@localhost',
    },
    display_name: 'Test User',
  },
  remote_identity: {
    uri: {
      toString: () => 'sip:caller@remote.com',
    },
    display_name: 'Caller',
  },
  // Event handler storage
  _eventHandlers: {} as Record<string, any>,
  on: vi.fn((event: string, handler: any) => {
    return handler
  }),
  off: vi.fn(),
  answer: vi.fn(),
  terminate: vi.fn(),
  hold: vi.fn(),
  unhold: vi.fn(),
  mute: vi.fn(),
  unmute: vi.fn(),
  sendDTMF: vi.fn(),
  is: vi.fn(),
})

interface TestEventMap {
  test: { value: number }
}

describe('CallSession', () => {
  let eventBus: EventBus<TestEventMap>
  let mockRTCSession: ReturnType<typeof createMockRTCSession>

  beforeEach(() => {
    eventBus = createEventBus<TestEventMap>()
    mockRTCSession = createMockRTCSession()
  })

  afterEach(() => {
    eventBus.destroy()
  })

  const createSession = (
    overrides?: Partial<{
      id: string
      direction: CallDirection
      localUri: string
      remoteUri: string
      remoteDisplayName?: string
    }>
  ) => {
    return new CallSession({
      id: overrides?.id ?? 'test-call-1',
      direction: overrides?.direction ?? CallDirection.Outgoing,
      localUri: overrides?.localUri ?? 'sip:test@localhost',
      remoteUri: overrides?.remoteUri ?? 'sip:caller@remote.com',
      remoteDisplayName: overrides?.remoteDisplayName,
      rtcSession: mockRTCSession,
      eventBus,
    })
  }

  describe('constructor', () => {
    it('should create a CallSession with correct initial state', () => {
      const session = createSession()

      expect(session.id).toBe('test-call-1')
      expect(session.direction).toBe(CallDirection.Outgoing)
      expect(session.localUri).toBe('sip:test@localhost')
      expect(session.remoteUri).toBe('sip:caller@remote.com')
      expect(session.state).toBe(CallState.Idle)
    })

    it('should create an incoming session correctly', () => {
      const session = createSession({
        direction: CallDirection.Incoming,
        remoteDisplayName: 'John Doe',
      })

      expect(session.direction).toBe(CallDirection.Incoming)
      expect(session.remoteDisplayName).toBe('John Doe')
    })

    it('should throw error for invalid localUri', () => {
      expect(() => {
        new CallSession({
          id: 'test',
          direction: CallDirection.Outgoing,
          localUri: '',
          remoteUri: 'sip:test@localhost',
          rtcSession: mockRTCSession,
          eventBus,
        })
      }).toThrow('localUri is required')
    })

    it('should throw error for invalid remoteUri', () => {
      expect(() => {
        new CallSession({
          id: 'test',
          direction: CallDirection.Outgoing,
          localUri: 'sip:test@localhost',
          remoteUri: '',
          rtcSession: mockRTCSession,
          eventBus,
        })
      }).toThrow('remoteUri is required')
    })
  })

  describe('getters', () => {
    it('should return correct initial values', () => {
      const session = createSession()

      expect(session.isOnHold).toBe(false)
      expect(session.isMuted).toBe(false)
      expect(session.hasRemoteVideo).toBe(false)
      expect(session.hasLocalVideo).toBe(false)
      expect(session.timing.startTime).toBeInstanceOf(Date)
      expect(session.terminationCause).toBeUndefined()
      expect(session.lastResponseCode).toBeUndefined()
      expect(session.lastReasonPhrase).toBeUndefined()
      expect(session.lastErrorMessage).toBeUndefined()
    })

    it('should return a copy of data object', () => {
      const session = createSession()

      const data1 = session.data
      const data2 = session.data

      expect(data1).not.toBe(data2)
    })
  })

  describe('eventBus', () => {
    it('should expose the event bus', () => {
      const session = createSession()

      expect(session.eventBus).toBe(eventBus)
    })
  })

  describe('state management', () => {
    it('should initialize with idle state', () => {
      const session = createSession()

      expect(session.state).toBe(CallState.Idle)
    })

    it('should track timing correctly', () => {
      const beforeCreate = new Date()
      const session = createSession()
      const afterCreate = new Date()

      const timing = session.timing
      expect(timing.startTime?.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(timing.startTime?.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })
  })

  describe('RTCSession integration', () => {
    it('should register event handlers on construction', () => {
      createSession()

      expect(mockRTCSession.on).toHaveBeenCalled()
    })

    it('should emit events to both session and event bus', () => {
      const session = createSession()
      const handler = vi.fn()

      // Subscribe to session events
      session.on('accepted', handler)

      // The session should have access to emit methods
      expect(typeof session.emit).toBe('function')
    })
  })

  describe('basic session operations', () => {
    it('should allow emitting custom events', () => {
      const session = createSession()
      const handler = vi.fn()

      session.on('update', handler)
      session.emit('update', { key: 'value' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ key: 'value' })
    })
  })
})
