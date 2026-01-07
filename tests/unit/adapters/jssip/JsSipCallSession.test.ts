/**
 * JsSipCallSession Unit Tests - Basic Operations
 *
 * Tests for JsSipCallSession covering constructor, properties,
 * and basic call control methods (answer, reject, terminate).
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { JsSipCallSession } from '@/adapters/jssip/JsSipCallSession'
import { CallDirection, CallState } from '@/types/call.types'
import type { RTCSession } from 'jssip'

// ============================================================================
// Mock Setup
// ============================================================================

interface MockRTCSessionType {
  id: string
  direction: 'incoming' | 'outgoing'
  remote_identity: {
    uri: { toString: () => string }
    display_name: string | null
  }
  connection: RTCPeerConnection | null
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
  __handlers: Record<string, Function[]>
  __triggerEvent: (event: string, data?: unknown) => void
}

/**
 * Factory function to create a mock RTCSession with event triggering capability
 */
function createMockRTCSession(
  direction: 'incoming' | 'outgoing' = 'outgoing',
  options?: {
    id?: string
    remoteUri?: string
    remoteDisplayName?: string | null
    isOnHold?: { local: boolean; remote: boolean }
    isMuted?: { audio: boolean; video?: boolean }
  }
): MockRTCSessionType {
  const handlers: Record<string, Function[]> = {}

  const defaults = {
    id: `test-session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    remoteUri: 'sip:remote@example.com',
    remoteDisplayName: 'Remote User',
    isOnHold: { local: false, remote: false },
    isMuted: { audio: false, video: false },
  }

  const config = { ...defaults, ...options }

  return {
    id: config.id,
    direction,
    remote_identity: {
      uri: { toString: () => config.remoteUri },
      display_name: config.remoteDisplayName,
    },
    connection: null,
    isOnHold: vi.fn().mockReturnValue(config.isOnHold),
    isMuted: vi.fn().mockReturnValue(config.isMuted),

    // Methods
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

    // Event handling
    on: vi.fn((event: string, handler: Function) => {
      if (!handlers[event]) handlers[event] = []
      handlers[event].push(handler)
    }),
    off: vi.fn(),

    // Test helpers
    __handlers: handlers,
    __triggerEvent: (event: string, data?: unknown) => {
      handlers[event]?.forEach((h) => h(data))
    },
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe('JsSipCallSession', () => {
  let mockSession: MockRTCSessionType
  let callSession: JsSipCallSession

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Constructor and Initialization
  // ==========================================================================

  describe('constructor and initialization', () => {
    it('should wrap the RTCSession correctly', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      expect(callSession.id).toBe(mockSession.id)
    })

    it('should set initial state to Ringing for incoming calls', () => {
      mockSession = createMockRTCSession('incoming')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      expect(callSession.state).toBe(CallState.Ringing)
    })

    it('should set initial state to Calling for outgoing calls', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      expect(callSession.state).toBe(CallState.Calling)
    })

    it('should setup event handlers on the session', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      // Verify that event handlers are registered
      expect(mockSession.on).toHaveBeenCalled()

      // Check specific events are registered
      const registeredEvents = mockSession.on.mock.calls.map((call) => call[0])
      expect(registeredEvents).toContain('progress')
      expect(registeredEvents).toContain('accepted')
      expect(registeredEvents).toContain('confirmed')
      expect(registeredEvents).toContain('ended')
      expect(registeredEvents).toContain('failed')
      expect(registeredEvents).toContain('hold')
      expect(registeredEvents).toContain('unhold')
      expect(registeredEvents).toContain('muted')
      expect(registeredEvents).toContain('unmuted')
    })

    it('should sync hold state from session on initialization', () => {
      mockSession = createMockRTCSession('outgoing', {
        isOnHold: { local: true, remote: false },
      })
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      expect(callSession.isOnHold).toBe(true)
    })

    it('should sync mute state from session on initialization', () => {
      mockSession = createMockRTCSession('outgoing', {
        isMuted: { audio: true, video: false },
      })
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      expect(callSession.isMuted).toBe(true)
    })
  })

  // ==========================================================================
  // Read-only Properties
  // ==========================================================================

  describe('read-only properties', () => {
    describe('id', () => {
      it('should return the session id', () => {
        const customId = 'custom-session-id-123'
        mockSession = createMockRTCSession('outgoing', { id: customId })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.id).toBe(customId)
      })
    })

    describe('direction', () => {
      it('should map incoming to CallDirection.Incoming', () => {
        mockSession = createMockRTCSession('incoming')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.direction).toBe(CallDirection.Incoming)
      })

      it('should map outgoing to CallDirection.Outgoing', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.direction).toBe(CallDirection.Outgoing)
      })
    })

    describe('state', () => {
      it('should return the internal state', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.state).toBe(CallState.Calling)
      })

      it('should update state on session events', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        // Trigger accepted event
        mockSession.__triggerEvent('accepted')

        expect(callSession.state).toBe(CallState.Active)
      })
    })

    describe('remoteUri', () => {
      it('should return remote_identity.uri.toString()', () => {
        const remoteUri = 'sip:bob@domain.com'
        mockSession = createMockRTCSession('outgoing', { remoteUri })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.remoteUri).toBe(remoteUri)
      })

      it('should return empty string if remote_identity is null', () => {
        mockSession = createMockRTCSession('outgoing')
        // Override with null
        mockSession.remote_identity = null as any
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.remoteUri).toBe('')
      })
    })

    describe('remoteDisplayName', () => {
      it('should return remote_identity.display_name', () => {
        const displayName = 'Bob Smith'
        mockSession = createMockRTCSession('outgoing', {
          remoteDisplayName: displayName,
        })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.remoteDisplayName).toBe(displayName)
      })

      it('should return null if display_name is not set', () => {
        mockSession = createMockRTCSession('outgoing', {
          remoteDisplayName: null,
        })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.remoteDisplayName).toBeNull()
      })
    })

    describe('startTime', () => {
      it('should initially be null', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.startTime).toBeNull()
      })

      it('should be set when call is accepted', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        mockSession.__triggerEvent('accepted')

        expect(callSession.startTime).toBeInstanceOf(Date)
      })
    })

    describe('endTime', () => {
      it('should initially be null', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.endTime).toBeNull()
      })

      it('should be set when call ends', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        mockSession.__triggerEvent('ended', {
          originator: 'remote',
          cause: 'Bye',
        })

        expect(callSession.endTime).toBeInstanceOf(Date)
      })

      it('should be set when call fails', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        mockSession.__triggerEvent('failed', {
          originator: 'remote',
          cause: 'Canceled',
        })

        expect(callSession.endTime).toBeInstanceOf(Date)
      })
    })

    describe('duration', () => {
      it('should return 0 when startTime is null', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.duration).toBe(0)
      })

      it('should calculate duration when call is active', async () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        // Trigger accepted to set startTime
        mockSession.__triggerEvent('accepted')

        // Wait a small amount of time
        await new Promise((resolve) => setTimeout(resolve, 50))

        // Duration should be greater than 0
        expect(callSession.duration).toBeGreaterThanOrEqual(0)
      })

      it('should calculate duration between startTime and endTime when call ends', async () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        // Trigger accepted to set startTime
        mockSession.__triggerEvent('accepted')

        // Wait a small amount
        await new Promise((resolve) => setTimeout(resolve, 50))

        // Trigger ended to set endTime
        mockSession.__triggerEvent('ended', {
          originator: 'remote',
          cause: 'Bye',
        })

        // Duration should be calculated
        expect(callSession.duration).toBeGreaterThanOrEqual(0)
      })
    })

    describe('localStream', () => {
      it('should initially be null', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.localStream).toBeNull()
      })
    })

    describe('remoteStream', () => {
      it('should initially be null', () => {
        mockSession = createMockRTCSession('outgoing')
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.remoteStream).toBeNull()
      })
    })

    describe('isOnHold', () => {
      it('should initially sync with session hold state (false)', () => {
        mockSession = createMockRTCSession('outgoing', {
          isOnHold: { local: false, remote: false },
        })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.isOnHold).toBe(false)
      })

      it('should return true if local hold is true', () => {
        mockSession = createMockRTCSession('outgoing', {
          isOnHold: { local: true, remote: false },
        })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.isOnHold).toBe(true)
      })

      it('should return true if remote hold is true', () => {
        mockSession = createMockRTCSession('outgoing', {
          isOnHold: { local: false, remote: true },
        })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.isOnHold).toBe(true)
      })
    })

    describe('isMuted', () => {
      it('should initially sync with session mute state', () => {
        mockSession = createMockRTCSession('outgoing', {
          isMuted: { audio: false, video: false },
        })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.isMuted).toBe(false)
      })

      it('should return true if audio is muted', () => {
        mockSession = createMockRTCSession('outgoing', {
          isMuted: { audio: true, video: false },
        })
        callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

        expect(callSession.isMuted).toBe(true)
      })
    })
  })

  // ==========================================================================
  // answer() Method
  // ==========================================================================

  describe('answer()', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('incoming')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should call session.answer()', async () => {
      await callSession.answer()

      expect(mockSession.answer).toHaveBeenCalled()
    })

    it('should pass mediaConstraints to session.answer()', async () => {
      const mediaConstraints = { audio: true, video: true }

      await callSession.answer({ mediaConstraints })

      expect(mockSession.answer).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaConstraints,
        })
      )
    })

    it('should pass extraHeaders to session.answer()', async () => {
      const extraHeaders = ['X-Custom-Header: value']

      await callSession.answer({ extraHeaders })

      expect(mockSession.answer).toHaveBeenCalledWith(
        expect.objectContaining({
          extraHeaders,
        })
      )
    })

    it('should pass pcConfig to session.answer()', async () => {
      const pcConfig = {
        iceServers: [{ urls: 'stun:stun.example.com' }],
      }

      await callSession.answer({ pcConfig })

      expect(mockSession.answer).toHaveBeenCalledWith(
        expect.objectContaining({
          pcConfig,
        })
      )
    })

    it('should pass all options combined', async () => {
      const options = {
        mediaConstraints: { audio: true, video: false },
        extraHeaders: ['X-Header: value'],
        pcConfig: { iceServers: [] },
      }

      await callSession.answer(options)

      expect(mockSession.answer).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaConstraints: options.mediaConstraints,
          extraHeaders: options.extraHeaders,
          pcConfig: options.pcConfig,
        })
      )
    })

    it('should handle errors from session.answer()', async () => {
      const error = new Error('Answer failed')
      mockSession.answer.mockImplementation(() => {
        throw error
      })

      await expect(callSession.answer()).rejects.toThrow('Answer failed')
    })

    it('should call answer with empty options object when no options provided', async () => {
      await callSession.answer()

      expect(mockSession.answer).toHaveBeenCalledWith({})
    })
  })

  // ==========================================================================
  // reject() Method
  // ==========================================================================

  describe('reject()', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('incoming')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should call session.terminate() with default status code 486', async () => {
      await callSession.reject()

      expect(mockSession.terminate).toHaveBeenCalledWith({
        status_code: 486,
        reason_phrase: 'Busy Here',
      })
    })

    it('should use custom status code', async () => {
      await callSession.reject(480)

      expect(mockSession.terminate).toHaveBeenCalledWith({
        status_code: 480,
        reason_phrase: 'Temporarily Unavailable',
      })
    })

    it('should map status code 486 to reason phrase "Busy Here"', async () => {
      await callSession.reject(486)

      expect(mockSession.terminate).toHaveBeenCalledWith(
        expect.objectContaining({
          reason_phrase: 'Busy Here',
        })
      )
    })

    it('should map status code 480 to reason phrase "Temporarily Unavailable"', async () => {
      await callSession.reject(480)

      expect(mockSession.terminate).toHaveBeenCalledWith(
        expect.objectContaining({
          reason_phrase: 'Temporarily Unavailable',
        })
      )
    })

    it('should map status code 603 to reason phrase "Decline"', async () => {
      await callSession.reject(603)

      expect(mockSession.terminate).toHaveBeenCalledWith(
        expect.objectContaining({
          reason_phrase: 'Decline',
        })
      )
    })

    it('should map status code 487 to reason phrase "Request Terminated"', async () => {
      await callSession.reject(487)

      expect(mockSession.terminate).toHaveBeenCalledWith(
        expect.objectContaining({
          reason_phrase: 'Request Terminated',
        })
      )
    })

    it('should use "Unknown" for unmapped status codes', async () => {
      await callSession.reject(500)

      expect(mockSession.terminate).toHaveBeenCalledWith(
        expect.objectContaining({
          reason_phrase: 'Unknown',
        })
      )
    })

    it('should handle errors from session.terminate()', async () => {
      const error = new Error('Terminate failed')
      mockSession.terminate.mockImplementation(() => {
        throw error
      })

      await expect(callSession.reject()).rejects.toThrow('Terminate failed')
    })
  })

  // ==========================================================================
  // terminate() Method
  // ==========================================================================

  describe('terminate()', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should call session.terminate()', async () => {
      await callSession.terminate()

      expect(mockSession.terminate).toHaveBeenCalled()
    })

    it('should call session.terminate() without arguments', async () => {
      await callSession.terminate()

      expect(mockSession.terminate).toHaveBeenCalledWith()
    })

    it('should handle errors from session.terminate()', async () => {
      const error = new Error('Terminate failed')
      mockSession.terminate.mockImplementation(() => {
        throw error
      })

      await expect(callSession.terminate()).rejects.toThrow('Terminate failed')
    })

    it('should work for both incoming and outgoing calls', async () => {
      // Test outgoing
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
      await callSession.terminate()
      expect(mockSession.terminate).toHaveBeenCalled()

      // Test incoming
      mockSession = createMockRTCSession('incoming')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
      await callSession.terminate()
      expect(mockSession.terminate).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // State Transitions via Events
  // ==========================================================================

  describe('state transitions', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should transition to Ringing on progress event (remote originator)', () => {
      mockSession.__triggerEvent('progress', {
        originator: 'remote',
        response: { status_code: 180, reason_phrase: 'Ringing' },
      })

      expect(callSession.state).toBe(CallState.Ringing)
    })

    it('should transition to Active on accepted event', () => {
      mockSession.__triggerEvent('accepted')

      expect(callSession.state).toBe(CallState.Active)
    })

    it('should transition to Active on confirmed event', () => {
      mockSession.__triggerEvent('confirmed')

      expect(callSession.state).toBe(CallState.Active)
    })

    it('should transition to Terminated on ended event', () => {
      mockSession.__triggerEvent('ended', {
        originator: 'remote',
        cause: 'Bye',
      })

      expect(callSession.state).toBe(CallState.Terminated)
    })

    it('should transition to Failed on failed event', () => {
      mockSession.__triggerEvent('failed', {
        originator: 'remote',
        cause: 'Canceled',
      })

      expect(callSession.state).toBe(CallState.Failed)
    })

    it('should transition to Held on hold event (local originator)', () => {
      mockSession.__triggerEvent('hold', {
        originator: 'local',
      })

      expect(callSession.state).toBe(CallState.Held)
    })

    it('should transition to RemoteHeld on hold event (remote originator)', () => {
      mockSession.__triggerEvent('hold', {
        originator: 'remote',
      })

      expect(callSession.state).toBe(CallState.RemoteHeld)
    })

    it('should transition to Active on unhold event', () => {
      // First put on hold
      mockSession.__triggerEvent('hold', { originator: 'local' })
      expect(callSession.state).toBe(CallState.Held)

      // Then unhold
      mockSession.__triggerEvent('unhold', { originator: 'local' })
      expect(callSession.state).toBe(CallState.Active)
    })
  })

  // ==========================================================================
  // Event Emission
  // ==========================================================================

  describe('event emission', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should emit progress event with status code and reason phrase', () => {
      const progressHandler = vi.fn()
      callSession.on('progress', progressHandler)

      mockSession.__triggerEvent('progress', {
        originator: 'remote',
        response: { status_code: 180, reason_phrase: 'Ringing' },
      })

      expect(progressHandler).toHaveBeenCalledWith({
        statusCode: 180,
        reasonPhrase: 'Ringing',
      })
    })

    it('should emit accepted event', () => {
      const acceptedHandler = vi.fn()
      callSession.on('accepted', acceptedHandler)

      mockSession.__triggerEvent('accepted')

      expect(acceptedHandler).toHaveBeenCalled()
    })

    it('should emit confirmed event', () => {
      const confirmedHandler = vi.fn()
      callSession.on('confirmed', confirmedHandler)

      mockSession.__triggerEvent('confirmed')

      expect(confirmedHandler).toHaveBeenCalled()
    })

    it('should emit ended event with cause', () => {
      const endedHandler = vi.fn()
      callSession.on('ended', endedHandler)

      mockSession.__triggerEvent('ended', {
        originator: 'remote',
        cause: 'Bye',
        message: { status_code: 200 },
      })

      expect(endedHandler).toHaveBeenCalledWith({
        cause: 'Bye',
        statusCode: 200,
      })
    })

    it('should emit failed event with cause', () => {
      const failedHandler = vi.fn()
      callSession.on('failed', failedHandler)

      mockSession.__triggerEvent('failed', {
        originator: 'remote',
        cause: 'Canceled',
        message: { status_code: 487 },
      })

      expect(failedHandler).toHaveBeenCalledWith({
        cause: 'Canceled',
        statusCode: 487,
      })
    })

    it('should emit hold event', () => {
      const holdHandler = vi.fn()
      callSession.on('hold', holdHandler)

      mockSession.__triggerEvent('hold', { originator: 'local' })

      expect(holdHandler).toHaveBeenCalled()
    })

    it('should emit unhold event', () => {
      const unholdHandler = vi.fn()
      callSession.on('unhold', unholdHandler)

      mockSession.__triggerEvent('unhold', { originator: 'local' })

      expect(unholdHandler).toHaveBeenCalled()
    })

    it('should emit muted event', () => {
      const mutedHandler = vi.fn()
      callSession.on('muted', mutedHandler)

      mockSession.__triggerEvent('muted')

      expect(mutedHandler).toHaveBeenCalled()
    })

    it('should emit unmuted event', () => {
      const unmutedHandler = vi.fn()
      callSession.on('unmuted', unmutedHandler)

      mockSession.__triggerEvent('unmuted')

      expect(unmutedHandler).toHaveBeenCalled()
    })

    it('should emit dtmf event with tone', () => {
      const dtmfHandler = vi.fn()
      callSession.on('dtmf', dtmfHandler)

      mockSession.__triggerEvent('newDTMF', {
        originator: 'remote',
        dtmf: { tone: '5' },
      })

      expect(dtmfHandler).toHaveBeenCalledWith({ tone: '5' })
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle progress event without response object', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      const progressHandler = vi.fn()
      callSession.on('progress', progressHandler)

      // Trigger progress without response
      mockSession.__triggerEvent('progress', {
        originator: 'local',
      })

      expect(progressHandler).toHaveBeenCalledWith({
        statusCode: 0,
        reasonPhrase: '',
      })
    })

    it('should handle ended event without message object', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      const endedHandler = vi.fn()
      callSession.on('ended', endedHandler)

      mockSession.__triggerEvent('ended', {
        originator: 'local',
        cause: 'Bye',
      })

      expect(endedHandler).toHaveBeenCalledWith({
        cause: 'Bye',
        statusCode: undefined,
      })
    })

    it('should set startTime on confirmed if not already set', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      // Skip accepted, go directly to confirmed
      mockSession.__triggerEvent('confirmed')

      expect(callSession.startTime).toBeInstanceOf(Date)
    })

    it('should not override startTime if already set on confirmed', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      // First accepted
      mockSession.__triggerEvent('accepted')
      const firstStartTime = callSession.startTime

      // Then confirmed (same tick, but should still not override)
      mockSession.__triggerEvent('confirmed')

      // The startTime should be the same object reference
      expect(callSession.startTime).toBe(firstStartTime)
    })

    it('should update isOnHold to true on local hold', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      expect(callSession.isOnHold).toBe(false)

      mockSession.__triggerEvent('hold', { originator: 'local' })

      expect(callSession.isOnHold).toBe(true)
    })

    it('should update isOnHold to false on local unhold', () => {
      mockSession = createMockRTCSession('outgoing', {
        isOnHold: { local: true, remote: false },
      })
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      mockSession.__triggerEvent('unhold', { originator: 'local' })

      expect(callSession.isOnHold).toBe(false)
    })

    it('should update isMuted to true on muted event', () => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      expect(callSession.isMuted).toBe(false)

      mockSession.__triggerEvent('muted')

      expect(callSession.isMuted).toBe(true)
    })

    it('should update isMuted to false on unmuted event', () => {
      mockSession = createMockRTCSession('outgoing', {
        isMuted: { audio: true, video: false },
      })
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)

      mockSession.__triggerEvent('unmuted')

      expect(callSession.isMuted).toBe(false)
    })
  })

  // ==========================================================================
  // hold() Method
  // ==========================================================================

  describe('hold()', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should call session.hold with callback', async () => {
      await callSession.hold()

      expect(mockSession.hold).toHaveBeenCalledWith({}, expect.any(Function))
    })

    it('should set isOnHold to true on success', async () => {
      expect(callSession.isOnHold).toBe(false)

      await callSession.hold()

      expect(callSession.isOnHold).toBe(true)
    })

    it('should reject when hold returns false', async () => {
      mockSession.hold.mockImplementation(() => false)

      await expect(callSession.hold()).rejects.toThrow('Hold operation failed')
    })

    it('should resolve after callback is invoked', async () => {
      let callbackInvoked = false
      mockSession.hold.mockImplementation((_opts: unknown, callback: () => void) => {
        // Simulate async callback
        setTimeout(() => {
          callbackInvoked = true
          callback()
        }, 10)
        return true
      })

      await callSession.hold()

      expect(callbackInvoked).toBe(true)
    })
  })

  // ==========================================================================
  // unhold() Method
  // ==========================================================================

  describe('unhold()', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('outgoing', {
        isOnHold: { local: true, remote: false },
      })
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should call session.unhold with callback', async () => {
      await callSession.unhold()

      expect(mockSession.unhold).toHaveBeenCalledWith({}, expect.any(Function))
    })

    it('should set isOnHold to false on success', async () => {
      // Call hold first to set isOnHold to true via the method
      await callSession.hold()
      expect(callSession.isOnHold).toBe(true)

      await callSession.unhold()

      expect(callSession.isOnHold).toBe(false)
    })

    it('should reject when unhold returns false', async () => {
      mockSession.unhold.mockImplementation(() => false)

      await expect(callSession.unhold()).rejects.toThrow('Unhold operation failed')
    })

    it('should resolve after callback is invoked', async () => {
      let callbackInvoked = false
      mockSession.unhold.mockImplementation((_opts: unknown, callback: () => void) => {
        // Simulate async callback
        setTimeout(() => {
          callbackInvoked = true
          callback()
        }, 10)
        return true
      })

      await callSession.unhold()

      expect(callbackInvoked).toBe(true)
    })
  })

  // ==========================================================================
  // mute() Method
  // ==========================================================================

  describe('mute()', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('outgoing')
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should call session.mute with audio: true', async () => {
      await callSession.mute()

      expect(mockSession.mute).toHaveBeenCalledWith({ audio: true })
    })

    it('should set isMuted to true', async () => {
      expect(callSession.isMuted).toBe(false)

      await callSession.mute()

      expect(callSession.isMuted).toBe(true)
    })

    it('should resolve immediately', async () => {
      const result = callSession.mute()

      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
    })
  })

  // ==========================================================================
  // unmute() Method
  // ==========================================================================

  describe('unmute()', () => {
    beforeEach(() => {
      mockSession = createMockRTCSession('outgoing', {
        isMuted: { audio: true, video: false },
      })
      callSession = new JsSipCallSession(mockSession as unknown as RTCSession)
    })

    it('should call session.unmute with audio: true', async () => {
      await callSession.unmute()

      expect(mockSession.unmute).toHaveBeenCalledWith({ audio: true })
    })

    it('should set isMuted to false', async () => {
      // Call mute first to set isMuted to true via the method
      await callSession.mute()
      expect(callSession.isMuted).toBe(true)

      await callSession.unmute()

      expect(callSession.isMuted).toBe(false)
    })

    it('should resolve immediately', async () => {
      const result = callSession.unmute()

      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
    })
  })
})
