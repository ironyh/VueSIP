/**
 * Shared Mock Factories for Unit Tests
 *
 * Reusable mock factory functions for AMI client, WebRTC sessions,
 * and related test utilities.
 *
 * @module tests/unit/utils/mockFactories
 */

import { vi } from 'vitest'
import type { AmiClient } from '@/core/AmiClient'
import type { CallSession } from '@/core/CallSession'

// ============================================================================
// Types
// ============================================================================

export interface MockAmiClient extends AmiClient {
  /** Trigger an event on the mock client */
  _triggerEvent: (event: string, ...args: unknown[]) => void
  /** Access to registered event handlers */
  _eventHandlers: Record<string, Function[]>
}

export interface MockCallSession extends CallSession {
  /** Access to the mock peer connection */
  _mockPc: {
    getStats: ReturnType<typeof vi.fn>
  }
}

export interface MockStatsOverrides {
  packetsReceived?: number
  packetsLost?: number
  bytesReceived?: number
  bytesSent?: number
  jitter?: number
  currentRoundTripTime?: number
}

// ============================================================================
// AMI Client Mock Factory
// ============================================================================

/**
 * Creates a mock AMI client for testing AMI composables.
 *
 * Features:
 * - Tracks event handlers and allows triggering events
 * - Mock sendAction that can be configured per test
 * - Proper TypeScript typing
 *
 * @example
 * ```typescript
 * const mockClient = createMockAmiClient()
 * clientRef.value = mockClient as unknown as AmiClient
 *
 * // Configure response
 * mockClient.sendAction = vi.fn().mockResolvedValue({
 *   server_id: 1,
 *   data: { Response: 'Success' }
 * })
 *
 * // Trigger events
 * mockClient._triggerEvent('event', { data: { Event: 'ParkedCall' } })
 * ```
 */
export function createMockAmiClient(): MockAmiClient {
  const eventHandlers: Record<string, Function[]> = {}

  return {
    isConnected: true,
    sendAction: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler)
      }
    }),
    _triggerEvent: (event: string, ...args: unknown[]) => {
      eventHandlers[event]?.forEach((handler) => handler(...args))
    },
    _eventHandlers: eventHandlers,
  } as unknown as MockAmiClient
}

// ============================================================================
// WebRTC Stats Mock Factory
// ============================================================================

/**
 * Creates mock RTCStatsReport for testing WebRTC stats composables.
 *
 * Includes realistic values for:
 * - Inbound/outbound RTP stats (audio)
 * - ICE candidate pair stats
 * - Local/remote candidate info
 * - Codec information
 *
 * @param overrides - Optional overrides for specific stat values
 *
 * @example
 * ```typescript
 * // Default stats
 * const stats = createMockRTCStats()
 *
 * // Custom packet loss
 * const badStats = createMockRTCStats({
 *   packetsReceived: 100,
 *   packetsLost: 10, // 10% loss
 * })
 * ```
 */
export function createMockRTCStats(overrides: MockStatsOverrides = {}): RTCStatsReport {
  const stats = new Map<string, RTCStats>()

  // Inbound RTP stats (audio)
  stats.set('inbound-rtp-audio', {
    id: 'inbound-rtp-audio',
    type: 'inbound-rtp',
    timestamp: Date.now(),
    kind: 'audio',
    ssrc: 12345,
    codecId: 'codec-opus',
    packetsReceived: overrides.packetsReceived ?? 1000,
    packetsLost: overrides.packetsLost ?? 10,
    bytesReceived: overrides.bytesReceived ?? 100000,
    jitter: overrides.jitter ?? 0.02, // 20ms jitter
    framesDecoded: undefined,
    framesDropped: undefined,
  } as unknown as RTCInboundRtpStreamStats)

  // Outbound RTP stats (audio)
  stats.set('outbound-rtp-audio', {
    id: 'outbound-rtp-audio',
    type: 'outbound-rtp',
    timestamp: Date.now(),
    kind: 'audio',
    ssrc: 54321,
    codecId: 'codec-opus',
    packetsSent: 1000,
    bytesSent: overrides.bytesSent ?? 100000,
    retransmittedPacketsSent: 5,
  } as unknown as RTCOutboundRtpStreamStats)

  // ICE candidate pair stats
  stats.set('candidate-pair', {
    id: 'candidate-pair',
    type: 'candidate-pair',
    timestamp: Date.now(),
    state: 'succeeded',
    nominated: true,
    localCandidateId: 'local-candidate',
    remoteCandidateId: 'remote-candidate',
    currentRoundTripTime: overrides.currentRoundTripTime ?? 0.05, // 50ms RTT
    availableOutgoingBitrate: 500000,
    availableIncomingBitrate: 500000,
    bytesSent: 50000,
    bytesReceived: 50000,
    requestsSent: 10,
    responsesReceived: 10,
  } as unknown as RTCIceCandidatePairStats)

  // Local candidate
  stats.set('local-candidate', {
    id: 'local-candidate',
    type: 'local-candidate',
    timestamp: Date.now(),
    candidateType: 'host',
    address: '192.168.1.100',
    port: 10000,
    protocol: 'udp',
  } as unknown as RTCStats)

  // Remote candidate
  stats.set('remote-candidate', {
    id: 'remote-candidate',
    type: 'remote-candidate',
    timestamp: Date.now(),
    candidateType: 'srflx',
    address: '1.2.3.4',
    port: 20000,
    protocol: 'udp',
  } as unknown as RTCStats)

  // Codec stats
  stats.set('codec-opus', {
    id: 'codec-opus',
    type: 'codec',
    timestamp: Date.now(),
    payloadType: 111,
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  } as unknown as RTCStats)

  return stats as unknown as RTCStatsReport
}

// ============================================================================
// Call Session Mock Factory
// ============================================================================

/**
 * Creates a mock CallSession for testing WebRTC composables.
 *
 * @param connected - Whether the peer connection should be available
 * @param statsOverrides - Optional overrides for the mock stats
 *
 * @example
 * ```typescript
 * // Connected session with default stats
 * const session = createMockCallSession()
 *
 * // Disconnected session
 * const noConnection = createMockCallSession(false)
 *
 * // Configure specific stats
 * session._mockPc.getStats.mockResolvedValue(createMockRTCStats({
 *   packetsLost: 50
 * }))
 * ```
 */
export function createMockCallSession(
  connected = true,
  statsOverrides: MockStatsOverrides = {}
): MockCallSession {
  const mockPeerConnection = {
    getStats: vi.fn().mockResolvedValue(createMockRTCStats(statsOverrides)),
  }

  return {
    connection: connected ? mockPeerConnection : null,
    _mockPc: mockPeerConnection,
  } as unknown as MockCallSession
}

// ============================================================================
// AMI Response Helpers
// ============================================================================

/**
 * Creates a successful AMI response
 */
export function createAmiSuccessResponse(data: Record<string, unknown> = {}) {
  return {
    server_id: 1,
    data: {
      Response: 'Success',
      ...data,
    },
  }
}

/**
 * Creates a failed AMI response
 */
export function createAmiErrorResponse(message: string) {
  return {
    server_id: 1,
    data: {
      Response: 'Error',
      Message: message,
    },
  }
}

// ============================================================================
// AMI Event Helpers
// ============================================================================

import { AmiMessageType } from '@/types/ami.types'
import type { AmiMessage, AmiEventData } from '@/types/ami.types'

/**
 * Creates an AMI event message for testing
 *
 * @param eventName - The AMI event name (e.g., 'ParkedCall', 'MessageWaiting')
 * @param eventData - Additional event data
 *
 * @example
 * ```typescript
 * const event = createAmiEvent('ParkedCall', {
 *   ParkingSpace: '701',
 *   ParkingLot: 'default',
 * })
 * mockClient._triggerEvent('event', event)
 * ```
 */
export function createAmiEvent(
  eventName: string,
  eventData: Record<string, unknown> = {}
): AmiMessage<AmiEventData> {
  return {
    type: AmiMessageType.Event,
    server_id: 1,
    server_name: 'test',
    ssl: false,
    data: {
      Event: eventName,
      ...eventData,
    },
  }
}
