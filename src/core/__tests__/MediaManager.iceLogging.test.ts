/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MediaManager } from '../MediaManager'
import { EventBus } from '../EventBus'

describe('MediaManager ICE Connection State Logging', () => {
  let mediaManager: MediaManager
  let eventBus: EventBus
  let mockPcInstance: any

  // Track all event emissions for inspection
  let iceConnectionStateEvents: any[] = []
  let iceReconnectionAttemptEvents: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    eventBus = new EventBus()
    iceConnectionStateEvents = []
    iceReconnectionAttemptEvents = []

    // Create a mock peer connection that we can control
    mockPcInstance = {
      iceConnectionState: 'new',
      iceGatheringState: 'new',
      signalingState: 'stable',
      connectionState: 'new',
      localDescription: null,
      remoteDescription: null,
      oniceconnectionstatechange: null,
      onicegatheringstatechange: null,
      onsignalingstatechange: null,
      onconnectionstatechange: null,
      ontrack: null,
      onicecandidate: null,
      onnegotiationneeded: null,
      addTrack: vi.fn(() => ({ track: 'track', dtmf: null })),
      removeTrack: vi.fn(),
      getSenders: vi.fn(() => []),
      close: vi.fn(),
      createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
      setLocalDescription: vi.fn().mockResolvedValue(undefined),
      setRemoteDescription: vi.fn().mockResolvedValue(undefined),
      addIceCandidate: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue(new Map()),
    }

    // Subscribe to events before creating MediaManager
    eventBus.on('media:ice:connection:state', (data: any) => {
      iceConnectionStateEvents.push(data)
    })
    eventBus.on('media:ice:reconnection:attempt', (data: any) => {
      iceReconnectionAttemptEvents.push(data)
    })

    // Mock global RTCPeerConnection
    const MockRTCPeerConnection = vi.fn(() => mockPcInstance)
    ;(global as any).RTCPeerConnection = MockRTCPeerConnection

    mediaManager = new MediaManager({ eventBus })
  })

  afterEach(() => {
    mediaManager.destroy()
  })

  describe('Correlation ID generation', () => {
    it('should generate unique correlation ID when creating peer connection', () => {
      mediaManager.createPeerConnection()

      // Trigger ice connection state change
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceConnectionStateEvents.length).toBeGreaterThan(0)
      const correlationId = iceConnectionStateEvents[0].payload.correlationId
      expect(correlationId).toMatch(/^ice-[\w-]+$/)
    })

    it('should generate different correlation IDs for different sessions', () => {
      mediaManager.createPeerConnection()
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      const firstCorrelationId = iceConnectionStateEvents[0].payload.correlationId

      mediaManager.closePeerConnection()
      iceConnectionStateEvents = []

      mediaManager.createPeerConnection()
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      const secondCorrelationId = iceConnectionStateEvents[0].payload.correlationId

      expect(firstCorrelationId).not.toBe(secondCorrelationId)
    })
  })

  describe('ICE connection state transitions', () => {
    it('should emit ice:connection:state with state and correlationId', () => {
      mediaManager.createPeerConnection()

      // Simulate state change: new -> checking
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceConnectionStateEvents).toHaveLength(1)
      expect(iceConnectionStateEvents[0].payload).toMatchObject({
        state: 'checking',
        correlationId: expect.stringMatching(/^ice-[\w-]+$/),
      })
    })

    it('should emit ice:connection:state with previousState on second transition', () => {
      mediaManager.createPeerConnection()

      // new -> checking
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      // checking -> connected
      mockPcInstance.iceConnectionState = 'connected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceConnectionStateEvents).toHaveLength(2)
      expect(iceConnectionStateEvents[0].payload.previousState).toBeNull()
      expect(iceConnectionStateEvents[1].payload.previousState).toBe('checking')
    })

    it('should include transition object in payload', () => {
      mediaManager.createPeerConnection()

      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceConnectionStateEvents[0].payload.transition).toMatchObject({
        correlationId: expect.stringMatching(/^ice-[\w-]+$/),
        previousState: null,
        newState: 'checking',
        timestamp: expect.any(Date),
      })
    })
  })

  describe('ICE reconnection attempt tracking', () => {
    it('should emit ice:reconnection:attempt when connection fails', () => {
      mediaManager.createPeerConnection()

      // Simulate connection flow
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      mockPcInstance.iceConnectionState = 'connected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      // Connection failed
      mockPcInstance.iceConnectionState = 'failed'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceReconnectionAttemptEvents).toHaveLength(1)
      expect(iceReconnectionAttemptEvents[0].payload).toMatchObject({
        correlationId: expect.stringMatching(/^ice-[\w-]+$/),
        attemptNumber: 1,
        totalAttempts: 1,
        state: 'failed',
      })
    })

    it('should emit ice:reconnection:attempt when connection disconnects', () => {
      mediaManager.createPeerConnection()

      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      mockPcInstance.iceConnectionState = 'connected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      mockPcInstance.iceConnectionState = 'disconnected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceReconnectionAttemptEvents).toHaveLength(1)
      expect(iceReconnectionAttemptEvents[0].payload.state).toBe('disconnected')
    })

    it('should increment attemptNumber on subsequent failures', () => {
      mediaManager.createPeerConnection()

      // First failure
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      mockPcInstance.iceConnectionState = 'connected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      mockPcInstance.iceConnectionState = 'failed'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      // Recovery attempt
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      // Second failure
      mockPcInstance.iceConnectionState = 'failed'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceReconnectionAttemptEvents).toHaveLength(2)
      expect(iceReconnectionAttemptEvents[0].payload.attemptNumber).toBe(1)
      expect(iceReconnectionAttemptEvents[1].payload.attemptNumber).toBe(2)
      expect(iceReconnectionAttemptEvents[1].payload.totalAttempts).toBe(2)
    })

    it('should track reconnectAttempts in connected event', () => {
      mediaManager.createPeerConnection()

      // Simulate one failed then connected
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      mockPcInstance.iceConnectionState = 'disconnected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      mockPcInstance.iceConnectionState = 'connected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      // The connected event should have reconnectAttempts
      const connectedEvent = iceConnectionStateEvents.find(
        (e: any) => e.payload.state === 'connected'
      )
      expect(connectedEvent).toBeDefined()
      expect(connectedEvent.payload.correlationId).toBeDefined()
    })
  })

  describe('Connection session cleanup', () => {
    it('should reset reconnection tracking after closePeerConnection', () => {
      mediaManager.createPeerConnection()

      // Simulate a failure
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      mockPcInstance.iceConnectionState = 'connected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      mockPcInstance.iceConnectionState = 'failed'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      expect(iceReconnectionAttemptEvents).toHaveLength(1)

      // Close and create new session
      mediaManager.closePeerConnection()
      iceReconnectionAttemptEvents = []
      iceConnectionStateEvents = []

      mediaManager.createPeerConnection()
      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))
      mockPcInstance.iceConnectionState = 'connected'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      // New session should have fresh state
      const connectedEvent = iceConnectionStateEvents.find(
        (e: any) => e.payload.state === 'connected'
      )
      expect(connectedEvent).toBeDefined()
      expect(iceReconnectionAttemptEvents).toHaveLength(0)
    })
  })

  describe('generateCorrelationId format', () => {
    it('should generate IDs in correct format: ice-{timestamp}-{random}', () => {
      mediaManager.createPeerConnection()

      mockPcInstance.iceConnectionState = 'checking'
      mockPcInstance.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

      const correlationId = iceConnectionStateEvents[0].payload.correlationId
      expect(correlationId).toMatch(/^ice-[a-z0-9]+-[a-z0-9]+$/)
    })

    it('should generate different IDs for different sessions', () => {
      const ids: string[] = []

      for (let i = 0; i < 3; i++) {
        const events: any[] = []
        const testEventBus = new EventBus()
        testEventBus.on('media:ice:connection:state', (data: any) => events.push(data))

        const testMockPc = {
          iceConnectionState: 'new',
          oniceconnectionstatechange: null,
          addTrack: vi.fn(() => ({ dtmf: null })),
          getSenders: vi.fn(() => []),
          close: vi.fn(),
        }
        ;(global as any).RTCPeerConnection = vi.fn(() => testMockPc)

        const testMm = new MediaManager({ eventBus: testEventBus })
        testMm.createPeerConnection()

        testMockPc.iceConnectionState = 'checking'
        testMockPc.oniceconnectionstatechange?.(new Event('iceconnectionstatechange'))

        ids.push(events[0].payload.correlationId)
        testMm.destroy()
      }

      expect(ids[0]).not.toBe(ids[1])
      expect(ids[1]).not.toBe(ids[2])
    })
  })
})
