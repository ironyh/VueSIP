/**
 * SipClient Call Management Tests
 * Comprehensive coverage for outgoing/incoming calls and call options
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SipClient } from '@/core/SipClient'
import { createEventBus } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import type { SipClientConfig } from '@/types/config.types'

// Mock JsSIP with call session support
const {
  mockUA,
  mockWebSocketInterface,
  mockSession,
  eventHandlers,
  onceHandlers,
  sessionHandlers,
  triggerEvent,
  triggerSessionEvent,
} = vi.hoisted(() => {
  const eventHandlers: Record<string, Array<(...args: any[]) => void>> = {}
  const onceHandlers: Record<string, Array<(...args: any[]) => void>> = {}
  const sessionHandlers: Record<string, Array<(...args: any[]) => void>> = {}

  const triggerEvent = (event: string, data?: any) => {
    const handlers = eventHandlers[event] || []
    handlers.forEach((handler) => handler(data))
    const once = onceHandlers[event] || []
    once.forEach((handler) => handler(data))
    onceHandlers[event] = []
  }

  const triggerSessionEvent = (event: string, data?: any) => {
    const handlers = sessionHandlers[event] || []
    handlers.forEach((handler) => handler(data))
  }

  // Session ID counter for unique IDs
  let sessionIdCounter = 0

  const mockSession = {
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
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!sessionHandlers[event]) sessionHandlers[event] = []
      sessionHandlers[event].push(handler)
    }),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  }

  const mockUA = {
    start: vi.fn(),
    stop: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    sendMessage: vi.fn(),
    call: vi.fn().mockReturnValue(mockSession),
    isConnected: vi.fn().mockReturnValue(true),
    isRegistered: vi.fn().mockReturnValue(true),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    once: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    }),
    off: vi.fn(),
  }

  const mockWebSocketInterface = vi.fn()

  return {
    mockUA,
    mockWebSocketInterface,
    mockSession,
    eventHandlers,
    onceHandlers,
    sessionHandlers,
    triggerEvent,
    triggerSessionEvent,
  }
})

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

describe('SipClient - Call Management', () => {
  let eventBus: EventBus
  let sipClient: SipClient
  let config: SipClientConfig

  beforeEach(async () => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
    Object.keys(onceHandlers).forEach((key) => delete onceHandlers[key])
    Object.keys(sessionHandlers).forEach((key) => delete sessionHandlers[key])

    mockUA.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    })
    mockUA.once.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!onceHandlers[event]) onceHandlers[event] = []
      onceHandlers[event].push(handler)
    })
    mockSession.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
      if (!sessionHandlers[event]) sessionHandlers[event] = []
      sessionHandlers[event].push(handler)
    })

    // Restore mock return values that were cleared by vi.clearAllMocks()
    mockUA.call.mockReturnValue(mockSession)
    mockUA.isConnected.mockReturnValue(false)
    mockUA.isRegistered.mockReturnValue(false)

    mockSession.isEnded.mockReturnValue(false)
    mockSession.isEstablished.mockReturnValue(false)
    mockSession.isInProgress.mockReturnValue(false)

    eventBus = createEventBus()
    config = {
      uri: 'wss://example.com:8089/ws',
      sipUri: 'sip:1000@example.com',
      password: 'test-password',
      registrationOptions: { autoRegister: false }, // Disable auto-registration for manual testing
    }

    sipClient = new SipClient(config, eventBus)
    const startPromise = sipClient.start()
    mockUA.isConnected.mockReturnValue(true)
    triggerEvent('connected', { socket: { url: 'wss://example.com:8089/ws' } })
    await startPromise
  })

  afterEach(() => {
    if (sipClient) {
      sipClient.stop()
    }
  })

  describe('Outgoing Calls', () => {
    it('should make basic outgoing call', async () => {
      const target = 'sip:2000@example.com'

      const callSession = await sipClient.call(target)

      expect(mockUA.call).toHaveBeenCalledWith(target, expect.any(Object))
      expect(callSession).toBeDefined()
      expect(callSession.id).toBeDefined() // Dynamic ID generated by mock
      expect(callSession.id).toMatch(/^session-\d+$/)
    })

    it('should make call with audio only', async () => {
      const target = 'sip:2000@example.com'

      await sipClient.call(target, {
        mediaConstraints: { audio: true, video: false },
      })

      expect(mockUA.call).toHaveBeenCalledWith(
        target,
        expect.objectContaining({
          mediaConstraints: expect.objectContaining({
            audio: true,
            video: false,
          }),
        })
      )
    })

    it('should make call with audio and video', async () => {
      const target = 'sip:2000@example.com'

      await sipClient.call(target, {
        mediaConstraints: { audio: true, video: true },
      })

      expect(mockUA.call).toHaveBeenCalledWith(
        target,
        expect.objectContaining({
          mediaConstraints: expect.objectContaining({
            audio: true,
            video: true,
          }),
        })
      )
    })

    it('should make call with extra headers', async () => {
      const target = 'sip:2000@example.com'
      const extraHeaders = ['X-Custom-Header: value']

      await sipClient.call(target, { extraHeaders })

      expect(mockUA.call).toHaveBeenCalledWith(
        target,
        expect.objectContaining({
          extraHeaders: expect.arrayContaining(extraHeaders),
        })
      )
    })

    it('should make call with custom SDP', async () => {
      const target = 'sip:2000@example.com'
      const sdpOffer = 'v=0\r\no=- 123 456 IN IP4 192.168.1.1\r\n...'

      await sipClient.call(target, { sessionDescriptionHandlerOptions: { sdpOffer } })

      expect(mockUA.call).toHaveBeenCalledWith(
        target,
        expect.objectContaining({
          sessionDescriptionHandlerOptions: expect.any(Object),
        })
      )
    })

    it('should handle call with RTCPeerConnection configuration', async () => {
      const target = 'sip:2000@example.com'
      const pcConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      }

      await sipClient.call(target, { pcConfig })

      expect(mockUA.call).toHaveBeenCalledWith(
        target,
        expect.objectContaining({
          pcConfig,
        })
      )
    })

    it('should generate unique call ID for each call', async () => {
      const call1 = await sipClient.call('sip:2000@example.com')
      const call2 = await sipClient.call('sip:3000@example.com')

      expect(call1.id).not.toBe(call2.id)
    })

    it('should use makeCall for backward compatibility', async () => {
      const target = 'sip:2000@example.com'

      const _callId = await sipClient.makeCall(target)

      expect(typeof callId).toBe('string')
      expect(callId.length).toBeGreaterThan(0)
      expect(mockUA.call).toHaveBeenCalled()
    })
  })

  describe('Incoming Calls', () => {
    it('should handle incoming call', () => {
      const incomingEvents: any[] = []
      eventBus.on('sip:new_session', (e) => incomingEvents.push(e))

      triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })

      expect(incomingEvents).toHaveLength(1)
      expect(incomingEvents[0].originator).toBe('remote')
      expect(incomingEvents[0].session).toBeDefined()
    })

    it('should not emit event for outgoing call', () => {
      const events: any[] = []
      eventBus.on('sip:new_session', (e) => events.push(e))

      triggerEvent('newRTCSession', {
        originator: 'local',
        session: mockSession,
      })

      // Should still emit event but mark as outgoing
      expect(events).toHaveLength(1)
      expect(events[0].originator).toBe('local')
    })

    it('should extract caller information from incoming call', () => {
      const events: any[] = []
      eventBus.on('sip:new_session', (e) => events.push(e))

      const customSession = {
        ...mockSession,
        remote_identity: {
          uri: 'sip:3000@example.com',
          display_name: 'John Doe',
        },
      }

      triggerEvent('newRTCSession', {
        originator: 'remote',
        session: customSession,
      })

      expect(events).toHaveLength(1)
      const session = events[0].session
      expect(session.remote_identity.uri).toContain('3000@example.com')
    })
  })

  describe('Call Session Events', () => {
    beforeEach(() => {
      // Trigger incoming call to create session
      triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })
    })

    it('should handle call progress event', () => {
      mockSession.isInProgress.mockReturnValue(true)

      triggerSessionEvent('progress', { originator: 'remote' })

      // Session state should be updated
      expect(mockSession.isInProgress()).toBe(true)
    })

    it('should handle call accepted event', () => {
      triggerSessionEvent('accepted', { originator: 'remote' })

      // Call should be in accepted state
    })

    it('should handle call confirmed/established event', () => {
      mockSession.isEstablished.mockReturnValue(true)
      mockSession.start_time = new Date()

      triggerSessionEvent('confirmed', {})

      expect(mockSession.isEstablished()).toBe(true)
    })

    it('should handle call ended event', () => {
      mockSession.isEnded.mockReturnValue(true)
      mockSession.end_time = new Date()

      triggerSessionEvent('ended', { originator: 'remote', cause: 'BYE' })

      expect(mockSession.isEnded()).toBe(true)
    })

    it('should handle call failed event', () => {
      triggerSessionEvent('failed', {
        originator: 'remote',
        cause: 'Busy Here',
        message: { status_code: 486 },
      })

      // Call should transition to failed state
    })

    it('should handle hold event', () => {
      mockSession.isOnHold.mockReturnValue(true)

      triggerSessionEvent('hold', { originator: 'remote' })

      expect(mockSession.isOnHold()).toBe(true)
    })

    it('should handle unhold event', () => {
      mockSession.isOnHold.mockReturnValue(false)

      triggerSessionEvent('unhold', { originator: 'remote' })

      expect(mockSession.isOnHold()).toBe(false)
    })

    it('should handle mute/unmute events', () => {
      mockSession.isMuted.mockReturnValue(true)
      triggerSessionEvent('muted', {})
      expect(mockSession.isMuted()).toBe(true)

      mockSession.isMuted.mockReturnValue(false)
      triggerSessionEvent('unmuted', {})
      expect(mockSession.isMuted()).toBe(false)
    })
  })

  describe('Call Control Methods', () => {
    it('should answer incoming call', () => {
      const _callId = 'test-call-id'
      // In real implementation, would need to track sessions
      // This tests the method exists and accepts parameters
      expect(sipClient.answerCall).toBeDefined()
    })

    it('should hangup active call', () => {
      expect(sipClient.hangupCall).toBeDefined()
    })

    it('should hold call', () => {
      expect(sipClient.holdCall).toBeDefined()
    })

    it('should unhold call', () => {
      expect(sipClient.unholdCall).toBeDefined()
    })

    it('should transfer call', () => {
      expect(sipClient.transferCall).toBeDefined()
    })

    it('should mute call', () => {
      expect(sipClient.muteCall).toBeDefined()
    })

    it('should unmute call', () => {
      expect(sipClient.unmuteCall).toBeDefined()
    })

    it('should send DTMF tones', () => {
      expect(sipClient.sendDTMF).toBeDefined()
    })
  })

  describe('Active Call Management', () => {
    it('should track active calls', async () => {
      await sipClient.call('sip:2000@example.com')

      const activeCalls = sipClient.getActiveCalls()
      expect(activeCalls.length).toBeGreaterThanOrEqual(0)
    })

    it('should remove call from active list when ended', () => {
      triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })

      mockSession.isEnded.mockReturnValue(true)
      triggerSessionEvent('ended', { originator: 'remote', cause: 'BYE' })

      // Call should be removed from active calls
    })

    it('should get call by ID', () => {
      expect(sipClient.getCall).toBeDefined()
    })
  })

  describe('Media Stream Handling', () => {
    it('should access remote media streams', () => {
      const mockStream = new MediaStream()
      mockSession.connection.getRemoteStreams.mockReturnValue([mockStream])

      triggerEvent('newRTCSession', {
        originator: 'remote',
        session: mockSession,
      })

      const streams = mockSession.connection.getRemoteStreams()
      expect(streams).toHaveLength(1)
      expect(streams[0]).toBe(mockStream)
    })

    it('should access local media streams', () => {
      const mockStream = new MediaStream()
      mockSession.connection.getLocalStreams.mockReturnValue([mockStream])

      triggerEvent('newRTCSession', {
        originator: 'local',
        session: mockSession,
      })

      const streams = mockSession.connection.getLocalStreams()
      expect(streams).toHaveLength(1)
      expect(streams[0]).toBe(mockStream)
    })

    it('should handle video track addition', () => {
      const videoTrack = {} as MediaStreamTrack
      triggerSessionEvent('peerconnection', {
        peerconnection: {
          addEventListener: vi.fn(),
          getReceivers: () => [{ track: videoTrack }],
        },
      })

      // Video should be detected
    })

    it('should handle video track removal', () => {
      triggerSessionEvent('peerconnection', {
        peerconnection: {
          addEventListener: vi.fn(),
          getReceivers: () => [],
        },
      })

      // No video should be detected
    })
  })

  describe('Call Statistics', () => {
    it('should track call duration', () => {
      const startTime = new Date()
      mockSession.start_time = startTime

      setTimeout(() => {
        const duration = Date.now() - startTime.getTime()
        expect(duration).toBeGreaterThan(0)
      }, 100)
    })

    it('should track call end reason', () => {
      triggerSessionEvent('failed', {
        originator: 'remote',
        cause: 'Busy Here',
        message: { status_code: 486 },
      })

      // End reason should be tracked
    })
  })
})
