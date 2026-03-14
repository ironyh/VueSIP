import { describe, it, expect } from 'vitest'
import {
  CallState,
  CallDirection,
  TerminationCause,
  HoldState,
  HoldDirection,
  type CallOptions,
  type AnswerOptions,
  type DTMFOptions,
  type CallTimingInfo,
  type CallStatistics,
  type CallSession,
  type CallEvent,
  type CallProgressEvent,
  type CallFailedEvent,
  type CallEndedEvent,
  type CallAcceptedEvent,
  type CallConfirmedEvent,
  type CallHoldEvent,
  type CallMuteEvent,
  type HoldOptions,
  type HoldEvent,
  type HoldResult,
} from '../../../src/types/call.types'

describe('call.types', () => {
  describe('CallState', () => {
    it('should have all expected call states', () => {
      expect(CallState.Idle).toBe('idle')
      expect(CallState.Calling).toBe('calling')
      expect(CallState.Ringing).toBe('ringing')
      expect(CallState.Answering).toBe('answering')
      expect(CallState.EarlyMedia).toBe('early_media')
      expect(CallState.Active).toBe('active')
      expect(CallState.Held).toBe('held')
      expect(CallState.RemoteHeld).toBe('remote_held')
      expect(CallState.Terminating).toBe('terminating')
      expect(CallState.Terminated).toBe('terminated')
      expect(CallState.Failed).toBe('failed')
    })

    it('should have correct number of states', () => {
      const states = Object.values(CallState)
      expect(states).toHaveLength(11)
    })
  })

  describe('CallDirection', () => {
    it('should have outgoing and incoming directions', () => {
      expect(CallDirection.Outgoing).toBe('outgoing')
      expect(CallDirection.Incoming).toBe('incoming')
    })

    it('should have exactly 2 directions', () => {
      const directions = Object.values(CallDirection)
      expect(directions).toHaveLength(2)
    })
  })

  describe('TerminationCause', () => {
    it('should have all expected termination causes', () => {
      expect(TerminationCause.Canceled).toBe('canceled')
      expect(TerminationCause.Rejected).toBe('rejected')
      expect(TerminationCause.NoAnswer).toBe('no_answer')
      expect(TerminationCause.Unavailable).toBe('unavailable')
      expect(TerminationCause.Busy).toBe('busy')
      expect(TerminationCause.Bye).toBe('bye')
      expect(TerminationCause.RequestTimeout).toBe('request_timeout')
      expect(TerminationCause.WebRtcError).toBe('webrtc_error')
      expect(TerminationCause.InternalError).toBe('internal_error')
      expect(TerminationCause.NetworkError).toBe('network_error')
      expect(TerminationCause.Other).toBe('other')
    })

    it('should have exactly 11 termination causes', () => {
      const causes = Object.values(TerminationCause)
      expect(causes).toHaveLength(11)
    })
  })

  describe('HoldState', () => {
    it('should have all expected hold states', () => {
      expect(HoldState.Active).toBe('active')
      expect(HoldState.Holding).toBe('holding')
      expect(HoldState.Held).toBe('held')
      expect(HoldState.Resuming).toBe('resuming')
      expect(HoldState.RemoteHeld).toBe('remote_held')
    })

    it('should have exactly 5 hold states', () => {
      const states = Object.values(HoldState)
      expect(states).toHaveLength(5)
    })
  })

  describe('HoldDirection', () => {
    it('should have all expected SDP directions', () => {
      const directions: HoldDirection[] = ['sendrecv', 'sendonly', 'recvonly', 'inactive']
      expect(directions).toContain('sendrecv')
      expect(directions).toContain('sendonly')
      expect(directions).toContain('recvonly')
      expect(directions).toContain('inactive')
    })
  })

  describe('CallOptions', () => {
    it('should accept minimal options', () => {
      const options: CallOptions = {}
      expect(options).toBeDefined()
    })

    it('should accept full audio/video options', () => {
      const options: CallOptions = {
        audio: true,
        video: { width: 1280, height: 720 },
        mediaConstraints: {
          audio: true,
          video: true,
        },
        rtcConfiguration: {
          iceServers: [{ urls: 'stun:stun.example.com' }],
        },
        extraHeaders: ['X-Custom-Header: value'],
        anonymous: false,
        sessionTimers: true,
        sessionTimersExpires: 1800,
        pcmaCodecOnly: false,
      }
      expect(options.audio).toBe(true)
      expect(options.video).toBeDefined()
      expect(options.mediaConstraints?.audio).toBe(true)
      expect(options.rtcConfiguration?.iceServers).toHaveLength(1)
      expect(options.extraHeaders).toHaveLength(1)
      expect(options.sessionTimers).toBe(true)
      expect(options.sessionTimersExpires).toBe(1800)
    })

    it('should accept boolean for audio/video', () => {
      const options: CallOptions = {
        audio: false,
        video: false,
      }
      expect(options.audio).toBe(false)
      expect(options.video).toBe(false)
    })
  })

  describe('AnswerOptions', () => {
    it('should accept minimal options', () => {
      const options: AnswerOptions = {}
      expect(options).toBeDefined()
    })

    it('should accept full options', () => {
      const options: AnswerOptions = {
        audio: true,
        video: false,
        mediaConstraints: {
          audio: true,
          video: false,
        },
        rtcConfiguration: {
          iceServers: [],
        },
        extraHeaders: ['X-Answer: true'],
      }
      expect(options.audio).toBe(true)
      expect(options.video).toBe(false)
    })
  })

  describe('DTMFOptions', () => {
    it('should have default values', () => {
      const options: DTMFOptions = {}
      expect(options.duration).toBeUndefined()
      expect(options.interToneGap).toBeUndefined()
      expect(options.transportType).toBeUndefined()
    })

    it('should accept RFC2833 transport', () => {
      const options: DTMFOptions = {
        duration: 100,
        interToneGap: 70,
        transportType: 'RFC2833',
      }
      expect(options.transportType).toBe('RFC2833')
    })

    it('should accept INFO transport', () => {
      const options: DTMFOptions = {
        transport: 'INFO',
      }
      expect(options.transport).toBe('INFO')
    })

    it('should accept both transport and transportType', () => {
      const options: DTMFOptions = {
        transportType: 'RFC2833',
        transport: 'INFO',
      }
      expect(options.transportType).toBe('RFC2833')
      expect(options.transport).toBe('INFO')
    })
  })

  describe('CallTimingInfo', () => {
    it('should have optional timing fields', () => {
      const timing: CallTimingInfo = {}
      expect(timing.startTime).toBeUndefined()
      expect(timing.answerTime).toBeUndefined()
      expect(timing.endTime).toBeUndefined()
      expect(timing.duration).toBeUndefined()
      expect(timing.ringDuration).toBeUndefined()
    })

    it('should accept full timing info', () => {
      const startTime = new Date('2024-01-01T10:00:00Z')
      const answerTime = new Date('2024-01-01T10:00:05Z')
      const endTime = new Date('2024-01-01T10:10:00Z')

      const timing: CallTimingInfo = {
        startTime,
        answerTime,
        endTime,
        duration: 600,
        ringDuration: 5,
      }

      expect(timing.startTime).toEqual(startTime)
      expect(timing.answerTime).toEqual(answerTime)
      expect(timing.endTime).toEqual(endTime)
      expect(timing.duration).toBe(600)
      expect(timing.ringDuration).toBe(5)
    })
  })

  describe('CallStatistics', () => {
    it('should have optional statistics fields', () => {
      const stats: CallStatistics = {}
      expect(stats.audio).toBeUndefined()
      expect(stats.video).toBeUndefined()
      expect(stats.network).toBeUndefined()
    })

    it('should accept full audio statistics', () => {
      const stats: CallStatistics = {
        audio: {
          bytesSent: 1000000,
          bytesReceived: 1000000,
          packetsSent: 10000,
          packetsReceived: 10000,
          packetsLost: 0,
          jitter: 0.001,
          roundTripTime: 0.05,
          audioLevel: 0.5,
          codecName: 'opus',
        },
      }

      expect(stats.audio?.bytesSent).toBe(1000000)
      expect(stats.audio?.codecName).toBe('opus')
      expect(stats.audio?.audioLevel).toBe(0.5)
    })

    it('should accept full video statistics', () => {
      const stats: CallStatistics = {
        video: {
          bytesSent: 10000000,
          bytesReceived: 10000000,
          packetsSent: 100000,
          packetsReceived: 100000,
          packetsLost: 10,
          frameRate: 30,
          frameWidth: 1280,
          frameHeight: 720,
          codecName: 'VP8',
        },
      }

      expect(stats.video?.frameRate).toBe(30)
      expect(stats.video?.frameWidth).toBe(1280)
    })

    it('should accept network statistics', () => {
      const stats: CallStatistics = {
        network: {
          currentRoundTripTime: 0.1,
          availableOutgoingBitrate: 1000000,
          availableIncomingBitrate: 5000000,
        },
      }

      expect(stats.network?.currentRoundTripTime).toBe(0.1)
      expect(stats.network?.availableOutgoingBitrate).toBe(1000000)
    })
  })

  describe('CallSession', () => {
    it('should require mandatory fields', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Active,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      expect(session.id).toBe('call-123')
      expect(session.state).toBe(CallState.Active)
      expect(session.direction).toBe(CallDirection.Outgoing)
      expect(session.isOnHold).toBe(false)
    })

    it('should accept optional fields', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Active,
        direction: CallDirection.Incoming,
        localUri: 'sip:alice@example.com',
        remoteUri: { uri: 'sip:bob@example.com', displayName: 'Bob' },
        remoteDisplayName: 'Bob Smith',
        isOnHold: true,
        isMuted: true,
        hasRemoteVideo: true,
        hasLocalVideo: true,
        timing: {
          startTime: new Date(),
          duration: 300,
        },
        terminationCause: TerminationCause.Bye,
        lastResponseCode: 200,
        lastReasonPhrase: 'OK',
        lastErrorMessage: undefined,
        data: { customKey: 'customValue' },
      }

      expect(session.remoteDisplayName).toBe('Bob Smith')
      expect(session.terminationCause).toBe(TerminationCause.Bye)
      expect(session.lastResponseCode).toBe(200)
      expect(session.data?.customKey).toBe('customValue')
    })

    it('should support function properties', () => {
      const mockHold = () => {}
      const mockUnhold = () => {}

      const session: CallSession = {
        id: 'call-123',
        state: CallState.Held,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: true,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
        hold: mockHold,
        unhold: mockUnhold,
      }

      expect(typeof session.hold).toBe('function')
      expect(typeof session.unhold).toBe('function')
    })
  })

  describe('CallEvent', () => {
    it('should require mandatory fields', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Active,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const event: CallEvent = {
        type: 'test',
        session,
        timestamp: new Date(),
      }

      expect(event.type).toBe('test')
      expect(event.session).toEqual(session)
      expect(event.timestamp).toBeInstanceOf(Date)
    })

    it('should accept optional originator field', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Active,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const event: CallEvent = {
        type: 'hold',
        session,
        timestamp: new Date(),
        originator: 'remote',
      }

      expect(event.originator).toBe('remote')
    })
  })

  describe('CallProgressEvent', () => {
    it('should require progress-specific fields', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Ringing,
        direction: CallDirection.Incoming,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const event: CallProgressEvent = {
        type: 'progress',
        session,
        timestamp: new Date(),
        responseCode: 180,
        reasonPhrase: 'Ringing',
      }

      expect(event.type).toBe('progress')
      expect(event.responseCode).toBe(180)
      expect(event.reasonPhrase).toBe('Ringing')
    })
  })

  describe('CallFailedEvent', () => {
    it('should include termination cause and error details', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Failed,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const event: CallFailedEvent = {
        type: 'failed',
        session,
        timestamp: new Date(),
        cause: TerminationCause.Busy,
        responseCode: 486,
        reasonPhrase: 'Busy Here',
        message: 'User is busy',
      }

      expect(event.cause).toBe(TerminationCause.Busy)
      expect(event.responseCode).toBe(486)
      expect(event.message).toBe('User is busy')
    })
  })

  describe('CallEndedEvent', () => {
    it('should include termination cause and originator', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Terminated,
        direction: CallDirection.Incoming,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const event: CallEndedEvent = {
        type: 'ended',
        session,
        timestamp: new Date(),
        cause: TerminationCause.Bye,
        originator: 'remote',
      }

      expect(event.cause).toBe(TerminationCause.Bye)
      expect(event.originator).toBe('remote')
    })
  })

  describe('CallHoldEvent', () => {
    it('should have hold/unhold types with originator', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Held,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: true,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const holdEvent: CallHoldEvent = {
        type: 'hold',
        session,
        timestamp: new Date(),
        originator: 'local',
      }

      const unholdEvent: CallHoldEvent = {
        type: 'unhold',
        session,
        timestamp: new Date(),
        originator: 'remote',
      }

      expect(holdEvent.type).toBe('hold')
      expect(holdEvent.originator).toBe('local')
      expect(unholdEvent.type).toBe('unhold')
      expect(unholdEvent.originator).toBe('remote')
    })
  })

  describe('CallAcceptedEvent', () => {
    it('should include response code', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Active,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const event: CallAcceptedEvent = {
        type: 'accepted',
        session,
        timestamp: new Date(),
        responseCode: 200,
      }

      expect(event.type).toBe('accepted')
      expect(event.responseCode).toBe(200)
    })
  })

  describe('CallConfirmedEvent', () => {
    it('should have confirmed type', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Active,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: false,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const event: CallConfirmedEvent = {
        type: 'confirmed',
        session,
        timestamp: new Date(),
      }

      expect(event.type).toBe('confirmed')
    })
  })

  describe('CallMuteEvent', () => {
    it('should have muted/unmuted types', () => {
      const session: CallSession = {
        id: 'call-123',
        state: CallState.Active,
        direction: CallDirection.Outgoing,
        localUri: 'sip:alice@example.com',
        remoteUri: 'sip:bob@example.com',
        isOnHold: false,
        isMuted: true,
        hasRemoteVideo: false,
        hasLocalVideo: false,
        timing: {},
      }

      const muteEvent: CallMuteEvent = {
        type: 'muted',
        session,
        timestamp: new Date(),
      }

      const unmuteEvent: CallMuteEvent = {
        type: 'unmuted',
        session,
        timestamp: new Date(),
      }

      expect(muteEvent.type).toBe('muted')
      expect(unmuteEvent.type).toBe('unmuted')
    })
  })

  describe('HoldOptions', () => {
    it('should have default direction', () => {
      const options: HoldOptions = {}
      expect(options.direction).toBeUndefined()
      expect(options.extraHeaders).toBeUndefined()
    })

    it('should accept custom direction and headers', () => {
      const options: HoldOptions = {
        direction: 'sendonly',
        extraHeaders: ['X-Hold: true'],
      }

      expect(options.direction).toBe('sendonly')
      expect(options.extraHeaders).toHaveLength(1)
    })
  })

  describe('HoldEvent', () => {
    it('should require all mandatory fields for successful hold', () => {
      const event: HoldEvent = {
        type: 'hold',
        state: HoldState.Held,
        originator: 'local',
        timestamp: new Date(),
        callId: 'call-123',
      }

      expect(event.type).toBe('hold')
      expect(event.state).toBe(HoldState.Held)
      expect(event.originator).toBe('local')
      expect(event.callId).toBe('call-123')
      expect(event.error).toBeUndefined()
    })

    it('should include error for failed hold', () => {
      const event: HoldEvent = {
        type: 'hold_failed',
        state: HoldState.Active,
        originator: 'local',
        timestamp: new Date(),
        callId: 'call-123',
        error: 'Failed to send hold request',
      }

      expect(event.type).toBe('hold_failed')
      expect(event.error).toBe('Failed to send hold request')
    })
  })

  describe('HoldResult', () => {
    it('should require success and state fields', () => {
      const result: HoldResult = {
        success: true,
        state: HoldState.Held,
      }

      expect(result.success).toBe(true)
      expect(result.state).toBe(HoldState.Held)
    })

    it('should include error for failed operation', () => {
      const result: HoldResult = {
        success: false,
        state: HoldState.Active,
        error: 'Network error',
      }

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })
})
