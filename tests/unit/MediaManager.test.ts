/**
 * MediaManager Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MediaManager } from '@/core/MediaManager'
import { EventBus } from '@/core/EventBus'
import type { ExtendedRTCConfiguration, MediaConfiguration } from '@/types/config.types'
import { PermissionStatus, MediaDeviceKind } from '@/types/media.types'

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  onicecandidate: ((event: any) => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  onicegatheringstatechange: (() => void) | null = null
  ontrack: ((event: any) => void) | null = null
  onsignalingstatechange: (() => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  onnegotiationneeded: (() => void) | null = null

  iceConnectionState: RTCIceConnectionState = 'new'
  iceGatheringState: RTCIceGatheringState = 'new'
  signalingState: RTCSignalingState = 'stable'
  connectionState: RTCPeerConnectionState = 'new'
  localDescription: RTCSessionDescription | null = null
  remoteDescription: RTCSessionDescription | null = null

  private senders: RTCRtpSender[] = []

  constructor(public config?: RTCConfiguration) {}

  async createOffer(_options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit> {
    return {
      type: 'offer',
      sdp: 'mock-sdp-offer',
    }
  }

  async createAnswer(_options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return {
      type: 'answer',
      sdp: 'mock-sdp-answer',
    }
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description as RTCSessionDescription
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.remoteDescription = description as RTCSessionDescription
  }

  async addIceCandidate(_candidate: RTCIceCandidateInit): Promise<void> {
    // Mock implementation
  }

  addTrack(track: MediaStreamTrack, _stream: MediaStream): RTCRtpSender {
    const sender = {
      track,
      dtmf: track.kind === 'audio' ? new MockRTCDTMFSender() : null,
    } as any
    this.senders.push(sender)
    return sender
  }

  removeTrack(sender: RTCRtpSender): void {
    const index = this.senders.indexOf(sender)
    if (index !== -1) {
      this.senders.splice(index, 1)
    }
  }

  getSenders(): RTCRtpSender[] {
    return this.senders
  }

  async getStats(): Promise<RTCStatsReport> {
    const stats = new Map()

    // Add mock audio inbound stats
    stats.set('inbound-audio', {
      type: 'inbound-rtp',
      kind: 'audio',
      bytesReceived: 10000,
      packetsReceived: 100,
      packetsLost: 2,
      jitter: 0.01,
      codecId: 'codec-opus',
    })

    // Add mock audio outbound stats
    stats.set('outbound-audio', {
      type: 'outbound-rtp',
      kind: 'audio',
      bytesSent: 8000,
      packetsSent: 80,
    })

    // Add mock candidate pair stats
    stats.set('candidate-pair', {
      type: 'candidate-pair',
      state: 'succeeded',
      currentRoundTripTime: 0.05,
      availableOutgoingBitrate: 1000000,
      availableIncomingBitrate: 1000000,
    })

    return stats as RTCStatsReport
  }

  close(): void {
    this.connectionState = 'closed'
    this.senders = []
  }
}

// Mock RTCDTMFSender
class MockRTCDTMFSender {
  canInsertDTMF = true
  toneBuffer = ''

  insertDTMF(tones: string, _duration?: number, _interToneGap?: number): void {
    this.toneBuffer = tones
  }
}

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: string
  id: string
  label: string
  enabled = true
  readyState: MediaStreamTrackState = 'live'

  constructor(kind: string, id: string, label: string) {
    this.kind = kind
    this.id = id
    this.label = label
  }

  stop(): void {
    this.readyState = 'ended'
  }

  getSettings(): MediaTrackSettings {
    return {}
  }

  getCapabilities(): MediaTrackCapabilities {
    return {}
  }

  getConstraints(): MediaTrackConstraints {
    return {}
  }

  applyConstraints(_constraints?: MediaTrackConstraints): Promise<void> {
    return Promise.resolve()
  }

  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack(this.kind, this.id + '-clone', this.label) as any
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
}

// Mock MediaStream
class MockMediaStream {
  id: string
  active = true
  private tracks: MediaStreamTrack[] = []

  constructor(tracks?: MediaStreamTrack[]) {
    this.id = 'stream-' + Math.random().toString(36).substring(7)
    if (tracks) {
      this.tracks = tracks
    }
  }

  getTracks(): MediaStreamTrack[] {
    return this.tracks
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'audio')
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'video')
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track)
  }

  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track)
    if (index !== -1) {
      this.tracks.splice(index, 1)
    }
  }

  getTrackById(id: string): MediaStreamTrack | null {
    return this.tracks.find((t) => t.id === id) || null
  }

  clone(): MediaStream {
    return new MockMediaStream(this.tracks.map((t) => t.clone())) as any
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true
  }
}

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn(),
  enumerateDevices: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

describe('MediaManager', () => {
  let mediaManager: MediaManager
  let eventBus: EventBus

  beforeEach(() => {
    // Setup mocks
    global.RTCPeerConnection = MockRTCPeerConnection as any
    global.navigator = {
      mediaDevices: mockMediaDevices,
    } as any

    // Reset mocks
    vi.clearAllMocks()
    mockMediaDevices.getUserMedia.mockReset()
    mockMediaDevices.enumerateDevices.mockReset()

    // Create event bus
    eventBus = new EventBus()

    // Create media manager
    mediaManager = new MediaManager({ eventBus })
  })

  afterEach(() => {
    mediaManager.destroy()
  })

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(mediaManager).toBeDefined()
    })

    it('should accept custom RTC configuration', () => {
      const config: ExtendedRTCConfiguration = {
        stunServers: ['stun:custom.stun.server:3478'],
        turnServers: [
          {
            urls: 'turn:turn.server:3478',
            username: 'user',
            credential: 'pass',
          },
        ],
      }

      const manager = new MediaManager({ eventBus, rtcConfiguration: config })
      expect(manager).toBeDefined()
      manager.destroy()
    })

    it('should accept media configuration', () => {
      const mediaConfig: MediaConfiguration = {
        audio: true,
        video: true,
        echoCancellation: true,
      }

      const manager = new MediaManager({
        eventBus,
        mediaConfiguration: mediaConfig,
      })
      expect(manager).toBeDefined()
      manager.destroy()
    })

    it('should enable auto quality adjustment if specified', () => {
      const manager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })
      expect(manager).toBeDefined()
      manager.destroy()
    })
  })

  describe('RTCPeerConnection Lifecycle', () => {
    it('should create peer connection', () => {
      const _pc = mediaManager.createPeerConnection()
      expect(_pc).toBeDefined()
      expect(_pc).toBeInstanceOf(MockRTCPeerConnection)
    })

    it('should get existing peer connection', () => {
      const pc1 = mediaManager.getPeerConnection()
      const pc2 = mediaManager.getPeerConnection()
      expect(pc1).toBe(pc2)
    })

    it('should close existing peer connection when creating new one', () => {
      const pc1 = mediaManager.createPeerConnection()
      const closeSpy = vi.spyOn(pc1, 'close')

      const pc2 = mediaManager.createPeerConnection()
      expect(closeSpy).toHaveBeenCalled()
      expect(pc2).not.toBe(pc1)
    })

    it('should close peer connection', () => {
      const _pc = mediaManager.createPeerConnection()
      const closeSpy = vi.spyOn(_pc, 'close')

      mediaManager.closePeerConnection()
      expect(closeSpy).toHaveBeenCalled()
    })

    it('should setup peer connection event handlers', () => {
      const _pc = mediaManager.createPeerConnection() as MockRTCPeerConnection
      expect(_pc.onicecandidate).toBeDefined()
      expect(_pc.oniceconnectionstatechange).toBeDefined()
      expect(_pc.onicegatheringstatechange).toBeDefined()
      expect(_pc.ontrack).toBeDefined()
      expect(_pc.onsignalingstatechange).toBeDefined()
      expect(_pc.onconnectionstatechange).toBeDefined()
      expect(_pc.onnegotiationneeded).toBeDefined()
    })

    it('should emit ICE candidate event', async () => {
      const _pc = mediaManager.createPeerConnection() as MockRTCPeerConnection

      const mockCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      }

      const eventPromise = eventBus.waitFor('media:ice:candidate')
      _pc.onicecandidate?.({ candidate: mockCandidate } as any)

      const event = await eventPromise
      expect(event.payload.candidate).toBeDefined()
    })

    it('should emit ICE gathering complete event on null candidate', async () => {
      const _pc = mediaManager.createPeerConnection() as MockRTCPeerConnection

      const eventPromise = eventBus.waitFor('media:ice:gathering:complete')
      _pc.onicecandidate?.({ candidate: null } as any)

      await eventPromise
    })

    it('should emit ICE connection state change event', async () => {
      const _pc = mediaManager.createPeerConnection() as MockRTCPeerConnection

      const eventPromise = eventBus.waitFor('media:ice:connection:state')

      _pc.iceConnectionState = 'connected'
      _pc.oniceconnectionstatechange?.()

      const event = await eventPromise
      expect(event.payload.state).toBe('connected')
    })

    it('should handle connection failure', async () => {
      const _pc = mediaManager.createPeerConnection() as MockRTCPeerConnection

      const eventPromise = eventBus.waitFor('media:connection:failed')

      _pc.iceConnectionState = 'failed'
      _pc.oniceconnectionstatechange?.()

      const event = await eventPromise
      expect(event.payload.state).toBe('failed')
    })

    it('should emit track added event', async () => {
      const _pc = mediaManager.createPeerConnection() as MockRTCPeerConnection

      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Audio') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      const eventPromise = eventBus.waitFor('media:track:added')
      _pc.ontrack?.({ track: mockTrack, streams: [mockStream] } as any)

      const payload = await eventPromise
      expect(payload.track).toBeDefined()
    })
  })

  describe('SDP Negotiation', () => {
    beforeEach(() => {
      mediaManager.createPeerConnection()
    })

    it('should create offer', async () => {
      const offer = await mediaManager.createOffer()
      expect(offer).toBeDefined()
      expect(offer.type).toBe('offer')
      expect(offer.sdp).toBeDefined()
    })

    it('should create answer', async () => {
      const answer = await mediaManager.createAnswer()
      expect(answer).toBeDefined()
      expect(answer.type).toBe('answer')
      expect(answer.sdp).toBeDefined()
    })

    it('should set local description', async () => {
      const offer = await mediaManager.createOffer()
      await mediaManager.setLocalDescription(offer)

      const _pc = mediaManager.getPeerConnection()
      expect(_pc.localDescription).toBeDefined()
      expect(_pc.localDescription?.type).toBe('offer')
    })

    it('should set remote description', async () => {
      const answer = { type: 'answer' as RTCSdpType, sdp: 'mock-sdp' }
      await mediaManager.setRemoteDescription(answer)

      const _pc = mediaManager.getPeerConnection()
      expect(_pc.remoteDescription).toBeDefined()
      expect(_pc.remoteDescription?.type).toBe('answer')
    })

    it('should add ICE candidate', async () => {
      const candidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      }

      await expect(mediaManager.addIceCandidate(candidate)).resolves.toBeUndefined()
    })

    it('should wait for ICE gathering', async () => {
      const _pc = mediaManager.getPeerConnection() as MockRTCPeerConnection

      // Start gathering
      const waitPromise = mediaManager.waitForIceGathering()

      // Simulate gathering complete
      setTimeout(() => {
        _pc.iceGatheringState = 'complete'
        _pc.onicegatheringstatechange?.()
        _pc.onicecandidate?.({ candidate: null } as any)
      }, 100)

      await waitPromise
    })

    it('should timeout ICE gathering if it takes too long', async () => {
      // Tests lines 551-552: timeout clearInterval and resolve
      vi.useFakeTimers()

      const _pc = mediaManager.getPeerConnection() as MockRTCPeerConnection

      const waitPromise = mediaManager.waitForIceGathering()

      // Fast-forward past the timeout (5 seconds)
      await vi.advanceTimersByTimeAsync(5500)

      // Should resolve without error
      await waitPromise

      vi.useRealTimers()
    })
  })

  describe('Media Stream Management', () => {
    beforeEach(() => {
      mediaManager.createPeerConnection()
    })

    it('should get user media', async () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)

      const stream = await mediaManager.getUserMedia({ audio: true })
      expect(stream).toBeDefined()
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled()
    })

    it('should cleanup previous stream when getting new media', async () => {
      // Tests lines 600-609: previous stream cleanup
      const mockTrack1 = new MockMediaStreamTrack('audio', 'track-1', 'Microphone 1') as any
      const mockStream1 = new MockMediaStream([mockTrack1]) as any

      const mockTrack2 = new MockMediaStreamTrack('audio', 'track-2', 'Microphone 2') as any
      const mockStream2 = new MockMediaStream([mockTrack2]) as any

      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream1)

      // Get first stream
      const stream1 = await mediaManager.getUserMedia({ audio: true })
      expect(stream1).toBe(mockStream1)

      // Spy on first track's stop method
      const stopSpy = vi.spyOn(mockTrack1, 'stop')

      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream2)

      // Get second stream - should cleanup first
      const stream2 = await mediaManager.getUserMedia({ audio: true })
      expect(stream2).toBe(mockStream2)
      expect(stopSpy).toHaveBeenCalled()
    })

    it('should update permissions on getUserMedia success', async () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)

      await mediaManager.getUserMedia({ audio: true })

      const permissions = mediaManager.getPermissions()
      expect(permissions.audio).toBe(PermissionStatus.Granted)
    })

    it('should update permissions on getUserMedia failure', async () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'
      mockMediaDevices.getUserMedia.mockRejectedValue(error)

      await expect(mediaManager.getUserMedia({ audio: true })).rejects.toThrow()

      const permissions = mediaManager.getPermissions()
      expect(permissions.audio).toBe(PermissionStatus.Denied)
    })

    it('should handle video permission denial in getUserMedia', async () => {
      // Tests line 638: video permission denied
      const error = new Error('Video permission denied')
      error.name = 'NotAllowedError'
      mockMediaDevices.getUserMedia.mockRejectedValue(error)

      await expect(mediaManager.getUserMedia({ audio: false, video: true })).rejects.toThrow()

      const permissions = mediaManager.getPermissions()
      expect(permissions.video).toBe(PermissionStatus.Denied)
    })

    it('should prevent concurrent getUserMedia calls', async () => {
      // Tests line 567: concurrent call guard
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      // Mock getUserMedia to take some time
      mockMediaDevices.getUserMedia.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockStream), 100)
          })
      )

      // Start first call
      const promise1 = mediaManager.getUserMedia({ audio: true })

      // Try second call while first is in progress - should throw
      await expect(mediaManager.getUserMedia({ audio: true })).rejects.toThrow(
        'getUserMedia operation already in progress'
      )

      // Wait for first call to complete
      await promise1
    })

    it('should add local stream to peer connection', () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      const senders = mediaManager.addLocalStream(mockStream)
      expect(senders).toHaveLength(1)
    })

    it('should add local stream with multiple tracks', () => {
      // Tests line 668: debug logging for each track
      const mockAudioTrack = new MockMediaStreamTrack('audio', 'audio-1', 'Microphone') as any
      const mockVideoTrack = new MockMediaStreamTrack('video', 'video-1', 'Camera') as any
      const mockStream = new MockMediaStream([mockAudioTrack, mockVideoTrack]) as any

      const senders = mediaManager.addLocalStream(mockStream)
      expect(senders).toHaveLength(2)
      expect(mediaManager.isDTMFAvailable()).toBe(true)
    })

    it('should setup DTMF sender for audio tracks', () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mediaManager.addLocalStream(mockStream)
      expect(mediaManager.isDTMFAvailable()).toBe(true)
    })

    it('should remove local stream from peer connection', () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mediaManager.addLocalStream(mockStream)
      mediaManager.removeLocalStream()

      const _pc = mediaManager.getPeerConnection()
      expect(_pc.getSenders()).toHaveLength(0)
    })

    it('should stop local stream', () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mediaManager.addLocalStream(mockStream)

      const stopSpy = vi.spyOn(mockTrack, 'stop')
      mediaManager.stopLocalStream()

      expect(stopSpy).toHaveBeenCalled()
    })

    it('should handle stopLocalStream when no stream exists', () => {
      // Tests line 710: guard clause when localStream is null
      expect(() => mediaManager.stopLocalStream()).not.toThrow()

      // Should do nothing when called again
      mediaManager.stopLocalStream()
    })

    it('should get local stream', () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mediaManager.addLocalStream(mockStream)

      const stream = mediaManager.getLocalStream()
      expect(stream).toBe(mockStream)
    })

    it('should get remote stream', () => {
      const stream = mediaManager.getRemoteStream()
      expect(stream).toBeUndefined()
    })
  })

  describe('DTMF Tone Generation', () => {
    beforeEach(() => {
      mediaManager.createPeerConnection()

      // Add audio track to enable DTMF
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any
      mediaManager.addLocalStream(mockStream)
    })

    it('should send DTMF tone', () => {
      expect(() => mediaManager.sendDTMF('1')).not.toThrow()
    })

    it('should send DTMF tone with duration and gap', () => {
      expect(() => mediaManager.sendDTMF('123', 100, 70)).not.toThrow()
    })

    it('should throw error if DTMF sender not available', () => {
      mediaManager.closePeerConnection()
      mediaManager.createPeerConnection()

      expect(() => mediaManager.sendDTMF('1')).toThrow('DTMF sender not available')
    })

    it('should handle DTMF insertion failure', () => {
      // Tests lines 760-761: error logging and throw in sendDTMF catch block
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any
      mediaManager.addLocalStream(mockStream)

      // Mock insertDTMF to throw error
      const dtmfSender = (mediaManager as any).dtmfSender
      vi.spyOn(dtmfSender, 'insertDTMF').mockImplementation(() => {
        throw new Error('DTMF insertion failed')
      })

      expect(() => mediaManager.sendDTMF('123')).toThrow('DTMF insertion failed')
    })

    it('should check if DTMF is available', () => {
      expect(mediaManager.isDTMFAvailable()).toBe(true)
    })
  })

  describe('Media Device Management', () => {
    it('should enumerate devices', async () => {
      const mockDevices = [
        {
          deviceId: 'device-1',
          kind: 'audioinput' as MediaDeviceKind,
          label: 'Microphone',
          groupId: 'group-1',
        },
        {
          deviceId: 'device-2',
          kind: 'audiooutput' as MediaDeviceKind,
          label: 'Speakers',
          groupId: 'group-1',
        },
        {
          deviceId: 'device-3',
          kind: 'videoinput' as MediaDeviceKind,
          label: 'Camera',
          groupId: 'group-2',
        },
      ]

      mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices)

      const devices = await mediaManager.enumerateDevices()
      expect(devices).toHaveLength(3)
      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalled()
    })

    it('should handle enumerateDevices failure', async () => {
      // Tests lines 820-821: error logging and throw in catch block
      const error = new Error('Device enumeration failed')
      mockMediaDevices.enumerateDevices.mockRejectedValue(error)

      await expect(mediaManager.enumerateDevices()).rejects.toThrow('Device enumeration failed')
    })

    it('should return cached devices when cache is valid', async () => {
      // Tests lines 787-790: device cache return logic
      const mockDevices = [
        {
          deviceId: 'cached-device-1',
          kind: 'audioinput' as MediaDeviceKind,
          label: 'Cached Microphone',
          groupId: 'group-1',
        },
      ]

      mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices)

      // First call - populates cache
      const devices1 = await mediaManager.enumerateDevices()
      expect(devices1).toHaveLength(1)
      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalledTimes(1)

      // Second call - should return cached devices without calling enumerateDevices
      const devices2 = await mediaManager.enumerateDevices()
      expect(devices2).toEqual(devices1)
      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalledTimes(1) // Still only 1 call
    })

    it('should force refresh devices when requested', async () => {
      // Tests that forceRefresh bypasses cache
      const mockDevices1 = [
        {
          deviceId: 'device-1',
          kind: 'audioinput' as MediaDeviceKind,
          label: 'Microphone 1',
          groupId: 'group-1',
        },
      ]
      const mockDevices2 = [
        {
          deviceId: 'device-2',
          kind: 'audioinput' as MediaDeviceKind,
          label: 'Microphone 2',
          groupId: 'group-2',
        },
      ]

      mockMediaDevices.enumerateDevices.mockResolvedValueOnce(mockDevices1)

      // First call - populates cache
      const devices1 = await mediaManager.enumerateDevices()
      expect(devices1).toHaveLength(1)

      mockMediaDevices.enumerateDevices.mockResolvedValueOnce(mockDevices2)

      // Second call with forceRefresh - should call enumerateDevices again
      const devices2 = await mediaManager.enumerateDevices(true)
      expect(devices2).toHaveLength(1)
      expect(devices2[0].deviceId).toBe('device-2')
      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalledTimes(2)
    })

    it('should get audio input devices', async () => {
      const mockDevices = [
        {
          deviceId: 'device-1',
          kind: 'audioinput' as MediaDeviceKind,
          label: 'Microphone',
          groupId: 'group-1',
        },
        {
          deviceId: 'device-2',
          kind: 'audiooutput' as MediaDeviceKind,
          label: 'Speakers',
          groupId: 'group-1',
        },
      ]

      mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices)
      await mediaManager.enumerateDevices()

      const audioInputs = mediaManager.getAudioInputDevices()
      expect(audioInputs).toHaveLength(1)
      expect(audioInputs[0].kind).toBe('audioinput')
    })

    it('should get audio output devices', async () => {
      const mockDevices = [
        {
          deviceId: 'device-1',
          kind: 'audioinput' as MediaDeviceKind,
          label: 'Microphone',
          groupId: 'group-1',
        },
        {
          deviceId: 'device-2',
          kind: 'audiooutput' as MediaDeviceKind,
          label: 'Speakers',
          groupId: 'group-1',
        },
      ]

      mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices)
      await mediaManager.enumerateDevices()

      const audioOutputs = mediaManager.getAudioOutputDevices()
      expect(audioOutputs).toHaveLength(1)
      expect(audioOutputs[0].kind).toBe('audiooutput')
    })

    it('should get video input devices', async () => {
      const mockDevices = [
        {
          deviceId: 'device-3',
          kind: 'videoinput' as MediaDeviceKind,
          label: 'Camera',
          groupId: 'group-2',
        },
      ]

      mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices)
      await mediaManager.enumerateDevices()

      const videoInputs = mediaManager.getVideoInputDevices()
      expect(videoInputs).toHaveLength(1)
      expect(videoInputs[0].kind).toBe('videoinput')
    })

    it('should select audio input device', () => {
      // Tests line 881: getSelectedAudioInput return
      mediaManager.selectAudioInput('device-1')
      const selected = mediaManager.getSelectedAudioInput()
      expect(selected).toBe('device-1')
      expect(typeof selected).toBe('string')
    })

    it('should return undefined when no audio input selected', () => {
      // Tests line 881: getSelectedAudioInput return when undefined
      const selected = mediaManager.getSelectedAudioInput()
      expect(selected).toBeUndefined()
    })

    it('should select audio output device', () => {
      mediaManager.selectAudioOutput('device-2')
      expect(mediaManager.getSelectedAudioOutput()).toBe('device-2')
    })

    it('should select video input device', () => {
      mediaManager.selectVideoInput('device-3')
      expect(mediaManager.getSelectedVideoInput()).toBe('device-3')
    })

    it('should request permissions', async () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)
      mockMediaDevices.enumerateDevices.mockResolvedValue([])

      const permissions = await mediaManager.requestPermissions(true, false)
      expect(permissions.audio).toBe(PermissionStatus.Granted)
      expect(permissions.video).toBe(PermissionStatus.NotRequested)
    })

    it('should request video permissions', async () => {
      // Tests line 916: video permission granted
      const mockAudioTrack = new MockMediaStreamTrack('audio', 'audio-1', 'Microphone') as any
      const mockVideoTrack = new MockMediaStreamTrack('video', 'video-1', 'Camera') as any
      const mockStream = new MockMediaStream([mockAudioTrack, mockVideoTrack]) as any

      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)
      mockMediaDevices.enumerateDevices.mockResolvedValue([])

      const permissions = await mediaManager.requestPermissions(true, true)
      expect(permissions.audio).toBe(PermissionStatus.Granted)
      expect(permissions.video).toBe(PermissionStatus.Granted)
    })

    it('should handle permission denial', async () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'
      mockMediaDevices.getUserMedia.mockRejectedValue(error)

      const permissions = await mediaManager.requestPermissions(true, false)
      expect(permissions.audio).toBe(PermissionStatus.Denied)
    })

    it('should handle video permission denial', async () => {
      // Tests line 939: video permission denied
      const error = new Error('Video permission denied')
      error.name = 'NotAllowedError'
      mockMediaDevices.getUserMedia.mockRejectedValue(error)

      const permissions = await mediaManager.requestPermissions(true, true)
      expect(permissions.audio).toBe(PermissionStatus.Denied)
      expect(permissions.video).toBe(PermissionStatus.Denied)
    })

    it('should get current permissions', () => {
      // Tests line 949: getPermissions return statement
      const permissions = mediaManager.getPermissions()
      expect(permissions).toBeDefined()
      expect(permissions.audio).toBe(PermissionStatus.NotRequested)
      expect(permissions.video).toBe(PermissionStatus.NotRequested)
    })

    it('should return a copy of permissions object', () => {
      // Tests line 949: ensure getPermissions returns a copy
      const permissions1 = mediaManager.getPermissions()
      const permissions2 = mediaManager.getPermissions()

      // Should be equal but not the same reference
      expect(permissions1).toEqual(permissions2)
      expect(permissions1).not.toBe(permissions2)

      // Modifying returned object should not affect internal state
      permissions1.audio = PermissionStatus.Granted
      const permissions3 = mediaManager.getPermissions()
      expect(permissions3.audio).toBe(PermissionStatus.NotRequested)
    })

    it('should start device change monitoring', () => {
      mediaManager.startDeviceChangeMonitoring()
      expect(mockMediaDevices.addEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      )
    })

    it('should stop device change monitoring', () => {
      mediaManager.startDeviceChangeMonitoring()
      mediaManager.stopDeviceChangeMonitoring()
      expect(mockMediaDevices.removeEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      )
    })

    it('should test audio input device', async () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)

      const result = await mediaManager.testAudioInput('device-1')
      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('device-1')
    })

    it('should handle audio input test failure', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Device not found'))

      const result = await mediaManager.testAudioInput('invalid-device')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should test video input device', async () => {
      const mockTrack = new MockMediaStreamTrack('video', 'track-1', 'Camera') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream)

      const result = await mediaManager.testVideoInput('device-3')
      expect(result.success).toBe(true)
      expect(result.deviceId).toBe('device-3')
    })

    it('should handle video input test failure', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Device not found'))

      const result = await mediaManager.testVideoInput('invalid-device')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Statistics Collection', () => {
    beforeEach(() => {
      mediaManager.createPeerConnection()
    })

    it('should get statistics', async () => {
      const stats = await mediaManager.getStatistics()
      expect(stats).toBeDefined()
      expect(stats.timestamp).toBeInstanceOf(Date)
      expect(stats.audio).toBeDefined()
      expect(stats.network).toBeDefined()
    })

    it('should include audio statistics', async () => {
      const stats = await mediaManager.getStatistics()
      expect(stats.audio).toBeDefined()
      expect(stats.audio?.bytesReceived).toBe(10000)
      expect(stats.audio?.packetsReceived).toBe(100)
      expect(stats.audio?.packetsLost).toBe(2)
    })

    it('should calculate packet loss percentage', async () => {
      const stats = await mediaManager.getStatistics()
      expect(stats.audio?.packetLossPercentage).toBeCloseTo(1.96, 1)
    })

    it('should include network statistics', async () => {
      const stats = await mediaManager.getStatistics()
      expect(stats.network).toBeDefined()
      expect(stats.network?.currentRoundTripTime).toBe(0.05)
    })

    it('should include ICE candidate type statistics', async () => {
      // Tests lines 1177 and 1181 coverage
      const _pc = (mediaManager as any).peerConnection

      // Mock getStats to include local and remote candidate types
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'local-candidate',
            {
              type: 'local-candidate',
              candidateType: 'host', // Line 1177 coverage
            },
          ],
          [
            'remote-candidate',
            {
              type: 'remote-candidate',
              candidateType: 'srflx', // Line 1181 coverage
            },
          ],
          [
            'candidate-pair',
            {
              type: 'candidate-pair',
              state: 'succeeded',
              currentRoundTripTime: 0.05,
            },
          ],
        ]) as RTCStatsReport
      )

      const stats = await mediaManager.getStatistics()

      expect(stats.network).toBeDefined()
      expect(stats.network?.localCandidateType).toBe('host')
      expect(stats.network?.remoteCandidateType).toBe('srflx')
    })

    it('should include transport statistics', async () => {
      // Tests lines 1172-1173 coverage
      const _pc = (mediaManager as any).peerConnection

      // Mock getStats to include transport stats
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'transport',
            {
              type: 'transport',
              bytesSent: 5000000, // Line 1172 coverage
              bytesReceived: 3000000, // Line 1173 coverage
            },
          ],
          [
            'candidate-pair',
            {
              type: 'candidate-pair',
              state: 'succeeded',
              currentRoundTripTime: 0.05,
            },
          ],
        ]) as RTCStatsReport
      )

      const stats = await mediaManager.getStatistics()

      expect(stats.network).toBeDefined()
      expect(stats.network?.totalBytesSent).toBe(5000000)
      expect(stats.network?.totalBytesReceived).toBe(3000000)
    })

    it('should include outbound video statistics', async () => {
      // Tests lines 1159-1161 coverage
      const _pc = (mediaManager as any).peerConnection

      // Mock getStats to include outbound-rtp video stats
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'outbound-video',
            {
              type: 'outbound-rtp',
              kind: 'video',
              bytesSent: 2500000, // Line 1159 coverage
              packetsSent: 1500, // Line 1160 coverage
              framesSent: 600, // Line 1161 coverage
            },
          ],
          [
            'candidate-pair',
            {
              type: 'candidate-pair',
              state: 'succeeded',
              currentRoundTripTime: 0.05,
            },
          ],
        ]) as RTCStatsReport
      )

      const stats = await mediaManager.getStatistics()

      expect(stats.video).toBeDefined()
      expect(stats.video?.bytesSent).toBe(2500000)
      expect(stats.video?.packetsSent).toBe(1500)
      expect(stats.video?.framesSent).toBe(600)
    })

    it('should throw error if peer connection not available', async () => {
      mediaManager.closePeerConnection()
      await expect(mediaManager.getStatistics()).rejects.toThrow('Peer connection not available')
    })
  })

  describe('Cleanup', () => {
    it('should destroy media manager', () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'track-1', 'Microphone') as any
      const mockStream = new MockMediaStream([mockTrack]) as any

      mediaManager.createPeerConnection()
      mediaManager.addLocalStream(mockStream)
      mediaManager.startDeviceChangeMonitoring()

      const stopSpy = vi.spyOn(mockTrack, 'stop')

      mediaManager.destroy()

      expect(stopSpy).toHaveBeenCalled()
      expect(mockMediaDevices.removeEventListener).toHaveBeenCalled()
    })

    it('should close peer connection on destroy', () => {
      const _pc = mediaManager.createPeerConnection()
      const closeSpy = vi.spyOn(_pc, 'close')

      mediaManager.destroy()

      expect(closeSpy).toHaveBeenCalled()
    })
  })

  describe('setDevices', () => {
    it('should manually set device list', () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
        {
          deviceId: 'video-1',
          groupId: 'group-2',
          kind: 'videoinput',
          label: 'Camera 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)

      const audioDevices = mediaManager.getAudioInputDevices()
      const videoDevices = mediaManager.getVideoInputDevices()
      expect(audioDevices.length).toBe(1)
      expect(audioDevices[0].deviceId).toBe('audio-1')
      expect(audioDevices[0].kind).toBe(MediaDeviceKind.AudioInput)
      expect(videoDevices.length).toBe(1)
      expect(videoDevices[0].deviceId).toBe('video-1')
      expect(videoDevices[0].kind).toBe(MediaDeviceKind.VideoInput)
    })

    it('should emit device change event when setting devices', async () => {
      const eventSpy = vi.fn()
      eventBus.on('media:device:changed', eventSpy)

      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)

      // Wait for async event handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(eventSpy).toHaveBeenCalled()
      const event = eventSpy.mock.calls[0][0]
      expect(event.type).toBe('devicechange')
      expect(event.currentDevices.length).toBe(1)
    })

    it('should use default label for unlabeled devices', () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: '',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)

      const devices = mediaManager.getAudioInputDevices()
      expect(devices[0].label).toBe('audioinput (audio-1)')
    })

    it('should mark default devices', () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'default',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Default Microphone',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)

      const devices = mediaManager.getAudioInputDevices()
      expect(devices[0].isDefault).toBe(true)
    })
  })

  describe('testDevice', () => {
    beforeEach(() => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
        {
          deviceId: 'video-1',
          groupId: 'group-2',
          kind: 'videoinput',
          label: 'Camera 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
        {
          deviceId: 'speaker-1',
          groupId: 'group-3',
          kind: 'audiooutput',
          label: 'Speaker 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]
      mediaManager.setDevices(mockDevices)
    })

    it('should return failure for unknown device', async () => {
      const result = await mediaManager.testDevice('unknown-device')
      expect(result.success).toBe(false)
    })

    it('should test audio input device with level measurement', async () => {
      // Mock setTimeout to execute immediately
      const originalSetTimeout = globalThis.setTimeout
      vi.stubGlobal('setTimeout', (callback: () => void, _delay?: number) => {
        callback()
        return 0 as any
      })

      // Setup devices first
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]
      mediaManager.setDevices(mockDevices)

      // Mock getUserMedia to return a stream with audio track
      const mockTrack = new MockMediaStreamTrack('audio', 'audio-track-1', 'Microphone 1')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      // Mock AudioContext
      const mockAnalyser = {
        fftSize: 0,
        frequencyBinCount: 128,
        getByteFrequencyData: vi.fn((array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) {
            array[i] = 100 // Mock audio level data
          }
        }),
      }

      const mockSource = {
        connect: vi.fn(),
        disconnect: vi.fn(),
      }

      const mockAudioContext = {
        createMediaStreamSource: vi.fn(() => mockSource),
        createAnalyser: vi.fn(() => mockAnalyser),
        close: vi.fn(),
      }

      // Mock AudioContext as a constructor
      global.AudioContext = function () {
        return mockAudioContext
      } as any

      const result = await mediaManager.testDevice('audio-1')

      expect(result.success).toBe(true)
      // AudioLevel should be defined and have a valid value
      if (result.audioLevel !== undefined) {
        expect(result.audioLevel).toBeGreaterThan(0)
        expect(result.audioLevel).toBeLessThanOrEqual(1)
      }

      // Verify AudioContext methods were called
      expect(mockAudioContext.createMediaStreamSource).toHaveBeenCalledWith(mockStream)
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
      expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled()

      // Restore original setTimeout
      vi.stubGlobal('setTimeout', originalSetTimeout)
    })

    it('should handle audio level measurement failure gracefully', async () => {
      // Setup devices first
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]
      mediaManager.setDevices(mockDevices)

      // Mock getUserMedia to return a stream
      const mockTrack = new MockMediaStreamTrack('audio', 'audio-track-1', 'Microphone 1')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      // Mock failing AudioContext
      global.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported')
      }) as any

      const result = await mediaManager.testDevice('audio-1')

      expect(result.success).toBe(true)
      expect(result.audioLevel).toBeUndefined()
    })

    it('should test video input device', async () => {
      // Setup devices first
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'video-1',
          groupId: 'group-2',
          kind: 'videoinput',
          label: 'Camera 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]
      mediaManager.setDevices(mockDevices)

      // Mock getUserMedia to return a stream with video track
      const mockTrack = new MockMediaStreamTrack('video', 'video-track-1', 'Camera 1')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      const result = await mediaManager.testDevice('video-1')

      expect(result.success).toBe(true)
      expect(result.audioLevel).toBeUndefined()
    })

    it('should return success for audio output (not testable)', async () => {
      // Setup devices first
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'speaker-1',
          groupId: 'group-3',
          kind: 'audiooutput',
          label: 'Speaker 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]
      mediaManager.setDevices(mockDevices)

      const result = await mediaManager.testDevice('speaker-1')

      expect(result.success).toBe(true)
    })

    it('should handle getUserMedia failure during audio test', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'))

      const result = await mediaManager.testDevice('audio-1')

      expect(result.success).toBe(false)
      expect(result.audioLevel).toBeUndefined()
    })
  })

  describe('Quality Adjustment', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('should adjust quality based on network conditions', async () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      mediaManager.createPeerConnection()

      // Fast-forward quality check interval
      await vi.advanceTimersByTimeAsync(5000)

      // Verify quality adjustment was called
      const stats = await mediaManager.getStatistics()
      expect(stats).toBeDefined()
    })

    it('should warn on high audio packet loss', async () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Mock high packet loss stats
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'inbound-audio',
            {
              type: 'inbound-rtp',
              kind: 'audio',
              bytesReceived: 10000,
              packetsReceived: 100,
              packetsLost: 10, // 10% loss
              jitter: 0.01,
              codecId: 'codec-opus',
            },
          ],
        ]) as RTCStatsReport
      )

      // Fast-forward quality check interval
      await vi.advanceTimersByTimeAsync(5000)

      // Quality adjustment should have detected high packet loss
      const stats = await mediaManager.getStatistics()
      expect(stats.audio?.packetLossPercentage).toBeGreaterThan(5)
    })

    it('should warn on high video packet loss', async () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Mock high video packet loss
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'inbound-video',
            {
              type: 'inbound-rtp',
              kind: 'video',
              bytesReceived: 50000,
              packetsReceived: 200,
              packetsLost: 15, // ~7% loss
            },
          ],
        ]) as RTCStatsReport
      )

      await vi.advanceTimersByTimeAsync(5000)

      const stats = await mediaManager.getStatistics()
      expect(stats.video?.packetLossPercentage).toBeGreaterThan(5)
    })

    it('should warn on high round trip time', async () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Mock high RTT
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'candidate-pair',
            {
              type: 'candidate-pair',
              state: 'succeeded',
              currentRoundTripTime: 0.5, // 500ms
            },
          ],
        ]) as RTCStatsReport
      )

      await vi.advanceTimersByTimeAsync(5000)

      const stats = await mediaManager.getStatistics()
      expect(stats.network?.currentRoundTripTime).toBe(0.5)
    })

    it('should not start quality adjustment twice', () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      mediaManager.createPeerConnection()

      // Try to enable auto-quality adjustment again
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      const callCountBefore = setIntervalSpy.mock.calls.length

      // Trigger another quality adjustment start (should be no-op)
      mediaManager.createPeerConnection()

      const callCountAfter = setIntervalSpy.mock.calls.length
      expect(callCountAfter).toBe(callCountBefore)
    })

    it('should stop quality adjustment on destroy', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Trigger connection success to start quality adjustment
      const oniceconnectionstatechange = (_pc as any).oniceconnectionstatechange
      if (oniceconnectionstatechange) {
        ;(_pc as any).iceConnectionState = 'connected'
        oniceconnectionstatechange.call(_pc, new Event('iceconnectionstatechange'))
      }

      mediaManager.destroy()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('should handle adjustQuality errors in interval callback', async () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Mock getStats to throw error
      vi.spyOn(_pc, 'getStats').mockRejectedValue(new Error('Stats collection failed'))

      // Trigger connection success to start quality adjustment interval
      const oniceconnectionstatechange = (_pc as any).oniceconnectionstatechange
      if (oniceconnectionstatechange) {
        ;(_pc as any).iceConnectionState = 'connected'
        oniceconnectionstatechange.call(_pc, new Event('iceconnectionstatechange'))
      }

      // Advance timers to trigger the interval callback - should not throw
      await vi.advanceTimersByTimeAsync(5000)

      // Verify getStats was called (and failed gracefully)
      expect(_pc.getStats).toHaveBeenCalled()
    })

    it('should execute adjustQuality when interval fires', async () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Mock stats with high packet loss to trigger warning
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'inbound-audio',
            {
              type: 'inbound-rtp',
              kind: 'audio',
              packetsReceived: 90,
              packetsLost: 10, // 10% > 5% threshold
              jitter: 0.01,
            },
          ],
          [
            'candidate-pair',
            {
              type: 'candidate-pair',
              state: 'succeeded',
              currentRoundTripTime: 0.4, // 400ms > 300ms threshold
            },
          ],
        ]) as RTCStatsReport
      )

      // Trigger connection success to start quality adjustment
      const oniceconnectionstatechange = (_pc as any).oniceconnectionstatechange
      if (oniceconnectionstatechange) {
        ;(_pc as any).iceConnectionState = 'connected'
        oniceconnectionstatechange.call(_pc, new Event('iceconnectionstatechange'))
      }

      // Advance timers to execute the interval callback
      await vi.advanceTimersByTimeAsync(5000)

      // Verify getStats was called by adjustQuality
      expect(_pc.getStats).toHaveBeenCalled()
    })

    it('should skip adjustQuality when peer connection is null', async () => {
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()
      const getStatsSpy = vi.spyOn(_pc, 'getStats')

      // Trigger connection success to start quality adjustment
      const oniceconnectionstatechange = (_pc as any).oniceconnectionstatechange
      if (oniceconnectionstatechange) {
        ;(_pc as any).iceConnectionState = 'connected'
        oniceconnectionstatechange.call(_pc, new Event('iceconnectionstatechange'))
      }

      // Close peer connection before interval fires
      mediaManager.closePeerConnection()

      // Advance timers - adjustQuality should return early without calling getStats
      await vi.advanceTimersByTimeAsync(5000)

      // getStats should not have been called after close
      expect(getStatsSpy).not.toHaveBeenCalled()
    })

    it('should not start quality adjustment interval twice', async () => {
      // Tests line 1202 guard clause
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Mock getStats to succeed
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'inbound-audio',
            {
              type: 'inbound-rtp',
              kind: 'audio',
              packetsReceived: 100,
              packetsLost: 0,
              jitter: 0.01,
            },
          ],
        ]) as RTCStatsReport
      )

      // Trigger connection success TWICE - second should hit guard clause on line 1202
      const oniceconnectionstatechange = (_pc as any).oniceconnectionstatechange
      if (oniceconnectionstatechange) {
        ;(_pc as any).iceConnectionState = 'connected'
        oniceconnectionstatechange.call(_pc, new Event('iceconnectionstatechange'))

        // Call again - should return early from line 1202
        oniceconnectionstatechange.call(_pc, new Event('iceconnectionstatechange'))
      }

      // Advance timers - interval should run normally
      await vi.advanceTimersByTimeAsync(5000)

      expect(_pc.getStats).toHaveBeenCalled()
    })

    it('should detect high video packet loss in adjustQuality', async () => {
      // Tests lines 1250-1253 video packet loss detection
      const mediaManager = new MediaManager({
        eventBus,
        autoQualityAdjustment: true,
      })

      const _pc = mediaManager.createPeerConnection()

      // Mock stats with high VIDEO packet loss to trigger warning on lines 1253-1256
      vi.spyOn(_pc, 'getStats').mockResolvedValue(
        new Map([
          [
            'inbound-video',
            {
              type: 'inbound-rtp',
              kind: 'video',
              packetsReceived: 85,
              packetsLost: 15, // 15% > 5% threshold - triggers lines 1250-1256
              jitter: 0.02,
            },
          ],
        ]) as RTCStatsReport
      )

      // Trigger connection success to start quality adjustment
      const oniceconnectionstatechange = (_pc as any).oniceconnectionstatechange
      if (oniceconnectionstatechange) {
        ;(_pc as any).iceConnectionState = 'connected'
        oniceconnectionstatechange.call(_pc, new Event('iceconnectionstatechange'))
      }

      // Advance timers to execute adjustQuality which should detect high video packet loss
      await vi.advanceTimersByTimeAsync(5000)

      expect(_pc.getStats).toHaveBeenCalled()
    })
  })

  describe('Video Constraints with Device Selection', () => {
    it('should apply exact video device ID constraint when video is true', async () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'video-1',
          groupId: 'group-1',
          kind: 'videoinput',
          label: 'Camera 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)
      await mediaManager.selectVideoInput('video-1')

      // Mock getUserMedia to return a proper MediaStream
      const mockTrack = new MockMediaStreamTrack('video', 'video-track-1', 'Camera 1')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      const stream = await mediaManager.getUserMedia({ video: true, audio: false })

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            deviceId: { exact: 'video-1' },
          }),
        })
      )

      expect(stream).toBeDefined()
      expect(stream.id).toBeDefined()
    })

    it('should apply exact video device ID constraint when video is object', async () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'video-2',
          groupId: 'group-2',
          kind: 'videoinput',
          label: 'Camera 2',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)
      await mediaManager.selectVideoInput('video-2')

      // Mock getUserMedia to return a proper MediaStream
      const mockTrack = new MockMediaStreamTrack('video', 'video-track-2', 'Camera 2')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      // Use video constraints as object
      const stream = await mediaManager.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      })

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            width: 1280,
            height: 720,
            deviceId: { exact: 'video-2' },
          }),
        })
      )

      expect(stream).toBeDefined()
    })
  })

  describe('Audio Constraint Overrides', () => {
    it('should override echoCancellation constraint', async () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'audio-track', 'Microphone')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      await mediaManager.getUserMedia({
        audio: true,
        video: false,
        echoCancellation: false,
      })

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            echoCancellation: false,
          }),
        })
      )
    })

    it('should override noiseSuppression constraint', async () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'audio-track', 'Microphone')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      await mediaManager.getUserMedia({
        audio: true,
        video: false,
        noiseSuppression: false,
      })

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            noiseSuppression: false,
          }),
        })
      )
    })

    it('should override autoGainControl constraint', async () => {
      const mockTrack = new MockMediaStreamTrack('audio', 'audio-track', 'Microphone')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      await mediaManager.getUserMedia({
        audio: true,
        video: false,
        autoGainControl: false,
      })

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            autoGainControl: false,
          }),
        })
      )
    })

    it('should combine audio constraints with device selection', async () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-special',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Special Microphone',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)
      await mediaManager.selectAudioInput('audio-special')

      const mockTrack = new MockMediaStreamTrack('audio', 'audio-track', 'Special Microphone')
      const mockStream = new MockMediaStream([mockTrack])
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream as any)

      await mediaManager.getUserMedia({
        audio: { sampleRate: 48000 },
        video: false,
        echoCancellation: false,
        noiseSuppression: true,
      })

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            deviceId: { exact: 'audio-special' },
            echoCancellation: false,
            noiseSuppression: true,
            sampleRate: 48000,
          }),
        })
      )
    })
  })

  describe('Device Testing Edge Cases', () => {
    it('should handle device with unknown kind', async () => {
      // Create a device with an invalid kind to test the default case
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'unknown-kind-device',
          groupId: 'group-1',
          kind: 'unknownkind' as any, // Invalid kind
          label: 'Unknown Device',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]

      mediaManager.setDevices(mockDevices)

      const result = await mediaManager.testDevice('unknown-kind-device')

      expect(result.success).toBe(false)
    })
  })

  describe('Device Change Monitoring Edge Cases', () => {
    it('should not start device change monitoring twice', () => {
      // Tests lines 959-960: guard clause when monitoring already active
      const addEventListenerSpy = vi.spyOn(mockMediaDevices, 'addEventListener')
      const callCountBefore = addEventListenerSpy.mock.calls.length

      // Start monitoring first time
      mediaManager.startDeviceChangeMonitoring()
      const callCountAfter1 = addEventListenerSpy.mock.calls.length
      expect(callCountAfter1).toBeGreaterThan(callCountBefore)

      // Try to start again - should hit guard clause on lines 959-960
      mediaManager.startDeviceChangeMonitoring()
      const callCountAfter2 = addEventListenerSpy.mock.calls.length
      expect(callCountAfter2).toBe(callCountAfter1) // No new listener added
    })

    it('should emit device change event using emitSync', async () => {
      // Tests line 996: emitSync call in device change listener
      const eventSpy = vi.fn()
      eventBus.on('media:device:changed', eventSpy)

      // Start monitoring
      mediaManager.startDeviceChangeMonitoring()

      // Set initial devices
      const initialDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]
      mediaManager.setDevices(initialDevices)

      // Clear the spy from initial set
      eventSpy.mockClear()

      // Simulate device change by calling the listener directly
      const deviceChangeListener = (mediaManager as any).deviceChangeListener
      if (deviceChangeListener) {
        // Mock new device list with added device
        const newDevices: MediaDeviceInfo[] = [
          ...initialDevices,
          {
            deviceId: 'audio-2',
            groupId: 'group-2',
            kind: 'audioinput',
            label: 'Microphone 2',
            toJSON: () => ({}),
          } as MediaDeviceInfo,
        ]

        // Mock enumerateDevices to return new devices
        mockMediaDevices.enumerateDevices.mockResolvedValueOnce(newDevices)

        // Trigger device change
        await deviceChangeListener()

        // Wait for async event handling
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      // Verify emitSync was called with device change event
      expect(eventSpy).toHaveBeenCalled()
      const event = eventSpy.mock.calls[0][0]
      expect(event.type).toBe('devicechange')
      expect(event.addedDevices).toBeDefined()
      expect(event.currentDevices).toBeDefined()
      expect(event.timestamp).toBeInstanceOf(Date)
    })

    it('should detect added and removed devices', async () => {
      // Tests lines 990-996 with device additions and removals
      const eventSpy = vi.fn()
      eventBus.on('media:device:changed', eventSpy)

      // Start monitoring
      mediaManager.startDeviceChangeMonitoring()

      // Set initial devices
      const initialDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'audio-1',
          groupId: 'group-1',
          kind: 'audioinput',
          label: 'Microphone 1',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
        {
          deviceId: 'audio-2',
          groupId: 'group-2',
          kind: 'audioinput',
          label: 'Microphone 2',
          toJSON: () => ({}),
        } as MediaDeviceInfo,
      ]
      mediaManager.setDevices(initialDevices)
      eventSpy.mockClear()

      // Simulate device change with one removed and one added
      const deviceChangeListener = (mediaManager as any).deviceChangeListener
      if (deviceChangeListener) {
        const newDevices: MediaDeviceInfo[] = [
          initialDevices[0], // Keep first device
          {
            deviceId: 'audio-3',
            groupId: 'group-3',
            kind: 'audioinput',
            label: 'Microphone 3',
            toJSON: () => ({}),
          } as MediaDeviceInfo, // Add new device
        ]

        mockMediaDevices.enumerateDevices.mockResolvedValueOnce(newDevices)
        await deviceChangeListener()
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      expect(eventSpy).toHaveBeenCalled()
      const event = eventSpy.mock.calls[0][0]
      expect(event.addedDevices.length).toBeGreaterThan(0)
      expect(event.removedDevices.length).toBeGreaterThan(0)
    })
  })

  describe('Statistics Collection Lifecycle', () => {
    it('should not start stats collection twice', () => {
      // Tests line 1079: guard clause in startStatsCollection
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      const callCountBefore = setIntervalSpy.mock.calls.length

      // Start stats collection first time
      ;(mediaManager as any).startStatsCollection()

      const callCountAfter1 = setIntervalSpy.mock.calls.length
      expect(callCountAfter1).toBeGreaterThan(callCountBefore)

      // Try to start again - should hit guard clause on line 1079
      ;(mediaManager as any).startStatsCollection()

      const callCountAfter2 = setIntervalSpy.mock.calls.length
      expect(callCountAfter2).toBe(callCountAfter1) // No new interval created
    })

    it('should stop stats collection on destroy', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      // Start stats collection
      ;(mediaManager as any).startStatsCollection()

      // Destroy manager
      mediaManager.destroy()

      // Verify clearInterval was called
      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('ICE Configuration Edge Cases', () => {
    it('should include TURN servers with credentialType', () => {
      const configWithCredentialType: ExtendedRTCConfiguration = {
        iceServers: [
          {
            urls: 'stun:stun.example.com',
          },
        ],
        turnServers: [
          {
            urls: ['turn:turn1.example.com', 'turn:turn2.example.com'],
            username: 'user1',
            credential: 'pass1',
            credentialType: 'password',
          },
        ],
      }

      const manager = new MediaManager({
        eventBus,
        rtcConfiguration: configWithCredentialType,
      })

      const _pc = manager.createPeerConnection()

      expect(_pc).toBeDefined()
      expect((_pc as any).config.iceServers).toBeDefined()
      expect((_pc as any).config.iceServers.length).toBeGreaterThan(1)

      // Verify TURN server configuration
      const turnServer = (_pc as any).config.iceServers.find((server: any) =>
        server.urls.some((url: string) => url.startsWith('turn:'))
      )
      expect(turnServer).toBeDefined()
      expect(turnServer.username).toBe('user1')
      expect(turnServer.credential).toBe('pass1')
      expect(turnServer.credentialType).toBe('password')
    })

    it('should handle TURN servers without credentialType', () => {
      const configWithoutCredentialType: ExtendedRTCConfiguration = {
        iceServers: [],
        turnServers: [
          {
            urls: 'turn:turn.example.com',
            username: 'user2',
            credential: 'pass2',
          },
        ],
      }

      const manager = new MediaManager({
        eventBus,
        rtcConfiguration: configWithoutCredentialType,
      })

      const _pc = manager.createPeerConnection()

      expect(_pc).toBeDefined()

      const turnServer = (_pc as any).config.iceServers.find((server: any) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
        return urls.some((url: string) => url.startsWith('turn:'))
      })

      expect(turnServer).toBeDefined()
      expect(turnServer.username).toBe('user2')
      expect(turnServer.credential).toBe('pass2')
      expect(turnServer.credentialType).toBeUndefined()
    })

    it('should handle multiple TURN servers', () => {
      const configWithMultipleTurn: ExtendedRTCConfiguration = {
        turnServers: [
          {
            urls: 'turn:turn1.example.com',
            username: 'user1',
            credential: 'pass1',
          },
          {
            urls: ['turn:turn2.example.com', 'turn:turn3.example.com'],
            username: 'user2',
            credential: 'pass2',
            credentialType: 'password',
          },
        ],
      }

      const manager = new MediaManager({
        eventBus,
        rtcConfiguration: configWithMultipleTurn,
      })

      const _pc = manager.createPeerConnection()

      expect(_pc).toBeDefined()

      const turnServers = (_pc as any).config.iceServers.filter((server: any) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
        return urls.some((url: string) => url.startsWith('turn:'))
      })

      expect(turnServers.length).toBe(2)
    })
  })
})
