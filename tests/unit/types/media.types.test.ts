/**
 * Media Types Unit Tests
 *
 * Tests for media-related type definitions and type guards.
 *
 * @module types/media.types.test
 */

import { describe, it, expect } from 'vitest'
import {
  MediaDeviceKind,
  PermissionStatus,
  RecordingState,
  type MediaDevice,
  type MediaPermissions,
  type AudioStatistics,
  type VideoStatistics,
  type NetworkStatistics,
  type MediaStatistics,
  type RecordingOptions,
  type RecordingData,
  type MediaStreamEvent,
  type MediaTrackEvent,
  type MediaDeviceChangeEvent,
  type MediaError,
  type ExtendedMediaStreamConstraints,
} from '@/types/media.types'

describe('MediaDeviceKind', () => {
  it('should have correct enum values', () => {
    expect(MediaDeviceKind.AudioInput).toBe('audioinput')
    expect(MediaDeviceKind.AudioOutput).toBe('audiooutput')
    expect(MediaDeviceKind.VideoInput).toBe('videoinput')
  })
})

describe('PermissionStatus', () => {
  it('should have correct enum values', () => {
    expect(PermissionStatus.Granted).toBe('granted')
    expect(PermissionStatus.Denied).toBe('denied')
    expect(PermissionStatus.Prompt).toBe('prompt')
    expect(PermissionStatus.NotRequested).toBe('not_requested')
  })
})

describe('RecordingState', () => {
  it('should have correct enum values', () => {
    expect(RecordingState.Inactive).toBe('inactive')
    expect(RecordingState.Recording).toBe('recording')
    expect(RecordingState.Paused).toBe('paused')
    expect(RecordingState.Stopped).toBe('stopped')
    expect(RecordingState.Error).toBe('error')
  })
})

describe('MediaDevice', () => {
  it('should create a valid media device object', () => {
    const device: MediaDevice = {
      deviceId: 'device-123',
      kind: MediaDeviceKind.AudioInput,
      label: 'Microphone',
      groupId: 'group-1',
      isDefault: true,
    }

    expect(device.deviceId).toBe('device-123')
    expect(device.kind).toBe(MediaDeviceKind.AudioInput)
    expect(device.label).toBe('Microphone')
    expect(device.groupId).toBe('group-1')
    expect(device.isDefault).toBe(true)
  })

  it('should allow optional isDefault field', () => {
    const device: MediaDevice = {
      deviceId: 'device-456',
      kind: MediaDeviceKind.AudioOutput,
      label: 'Speaker',
      groupId: 'group-2',
    }

    expect(device.isDefault).toBeUndefined()
  })
})

describe('MediaPermissions', () => {
  it('should create valid media permissions', () => {
    const permissions: MediaPermissions = {
      audio: PermissionStatus.Granted,
      video: PermissionStatus.Prompt,
    }

    expect(permissions.audio).toBe(PermissionStatus.Granted)
    expect(permissions.video).toBe(PermissionStatus.Prompt)
  })

  it('should handle denied permissions', () => {
    const permissions: MediaPermissions = {
      audio: PermissionStatus.Denied,
      video: PermissionStatus.Denied,
    }

    expect(permissions.audio).toBe(PermissionStatus.Denied)
    expect(permissions.video).toBe(PermissionStatus.Denied)
  })
})

describe('AudioStatistics', () => {
  it('should create audio statistics with all fields', () => {
    const stats: AudioStatistics = {
      inputLevel: 0.5,
      outputLevel: 0.3,
      bytesSent: 1000,
      bytesReceived: 2000,
      packetsSent: 100,
      packetsReceived: 200,
      packetsLost: 5,
      packetLossPercentage: 2.5,
      jitter: 0.02,
      roundTripTime: 0.1,
      codec: 'opus',
      bitrate: 128000,
      sampleRate: 48000,
      channels: 2,
    }

    expect(stats.inputLevel).toBe(0.5)
    expect(stats.codec).toBe('opus')
    expect(stats.bitrate).toBe(128000)
  })

  it('should allow partial audio statistics', () => {
    const stats: AudioStatistics = {
      bytesSent: 500,
      packetsSent: 50,
    }

    expect(stats.inputLevel).toBeUndefined()
    expect(stats.codec).toBeUndefined()
  })
})

describe('VideoStatistics', () => {
  it('should create video statistics with all fields', () => {
    const stats: VideoStatistics = {
      bytesSent: 500000,
      bytesReceived: 1000000,
      packetsSent: 500,
      packetsReceived: 1000,
      packetsLost: 10,
      packetLossPercentage: 1.0,
      frameRate: 30,
      frameWidth: 1920,
      frameHeight: 1080,
      framesSent: 300,
      framesReceived: 600,
      framesDropped: 5,
      codec: 'VP9',
      bitrate: 2500000,
    }

    expect(stats.frameRate).toBe(30)
    expect(stats.frameWidth).toBe(1920)
    expect(stats.codec).toBe('VP9')
  })

  it('should allow partial video statistics', () => {
    const stats: VideoStatistics = {
      frameRate: 24,
    }

    expect(stats.bytesSent).toBeUndefined()
  })
})

describe('NetworkStatistics', () => {
  it('should create network statistics with all fields', () => {
    const stats: NetworkStatistics = {
      currentRoundTripTime: 0.05,
      availableOutgoingBitrate: 1000000,
      availableIncomingBitrate: 5000000,
      totalBytesSent: 10000,
      totalBytesReceived: 50000,
      transportType: 'udp',
      localCandidateType: 'host',
      remoteCandidateType: 'srflx',
    }

    expect(stats.currentRoundTripTime).toBe(0.05)
    expect(stats.transportType).toBe('udp')
  })
})

describe('MediaStatistics', () => {
  it('should combine audio, video, and network statistics', () => {
    const timestamp = new Date()
    const stats: MediaStatistics = {
      audio: {
        bytesSent: 1000,
        packetsSent: 100,
      },
      video: {
        bytesSent: 500000,
        frameRate: 30,
      },
      network: {
        currentRoundTripTime: 0.05,
      },
      timestamp,
    }

    expect(stats.audio?.bytesSent).toBe(1000)
    expect(stats.video?.frameRate).toBe(30)
    expect(stats.network?.currentRoundTripTime).toBe(0.05)
    expect(stats.timestamp).toBe(timestamp)
  })

  it('should require timestamp', () => {
    const stats: MediaStatistics = {
      timestamp: new Date(),
    }

    expect(stats.audio).toBeUndefined()
    expect(stats.video).toBeUndefined()
    expect(stats.network).toBeUndefined()
  })
})

describe('RecordingOptions', () => {
  it('should create recording options with all fields', () => {
    const options: RecordingOptions = {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 128000,
      videoBitsPerSecond: 2500000,
      timeslice: 1000,
      audio: true,
      video: false,
    }

    expect(options.mimeType).toBe('audio/webm')
    expect(options.audioBitsPerSecond).toBe(128000)
    expect(options.audio).toBe(true)
  })

  it('should allow minimal recording options', () => {
    const options: RecordingOptions = {}

    expect(options.mimeType).toBeUndefined()
    expect(options.audio).toBeUndefined()
  })
})

describe('RecordingData', () => {
  it('should create recording data with required fields', () => {
    const startTime = new Date('2024-01-01T10:00:00Z')
    const recording: RecordingData = {
      id: 'rec-123',
      mimeType: 'audio/webm',
      startTime,
    }

    expect(recording.id).toBe('rec-123')
    expect(recording.startTime).toBe(startTime)
    expect(recording.mimeType).toBe('audio/webm')
  })

  it('should create complete recording data', () => {
    const startTime = new Date('2024-01-01T10:00:00Z')
    const endTime = new Date('2024-01-01T10:05:00Z')
    const blob = new Blob(['audio data'], { type: 'audio/webm' })

    const recording: RecordingData = {
      id: 'rec-456',
      callId: 'call-789',
      state: RecordingState.Recording,
      blob,
      mimeType: 'audio/webm',
      duration: 300000,
      size: 500000,
      startTime,
      endTime,
    }

    expect(recording.state).toBe(RecordingState.Recording)
    expect(recording.duration).toBe(300000)
    expect(recording.endTime).toBe(endTime)
  })
})

describe('MediaStreamEvent', () => {
  it('should create a valid media stream event', () => {
    // In Node.js test env, we can't create actual MediaStream
    // so we type check via the event structure
    const event: MediaStreamEvent = {
      type: 'addtrack',
      // @ts-expect-error - MediaStream not available in Node test env
      stream: {} as MediaStream,
      direction: 'local',
      timestamp: new Date(),
    }

    expect(event.type).toBe('addtrack')
    // @ts-expect-error - MediaStream not available in Node test env
    expect(event.stream).toBeDefined()
    expect(event.direction).toBe('local')
  })

  it('should handle different event types', () => {
    // Type checking - we verify the type structure without instantiating browser APIs
    const addEvent: MediaStreamEvent = {
      type: 'addtrack',
      // @ts-expect-error - MediaStream not available in Node test env
      stream: {} as MediaStream,
      // @ts-expect-error - MediaStreamTrack not available in Node test env
      track: {} as MediaStreamTrack,
      timestamp: new Date(),
    }

    expect(addEvent.type).toBe('addtrack')
  })
})

describe('MediaTrackEvent', () => {
  it('should create a valid media track event', () => {
    // Type checking without browser APIs
    const event: MediaTrackEvent = {
      type: 'mute',
      // @ts-expect-error - MediaStreamTrack not available in Node test env
      track: {} as MediaStreamTrack,
      direction: 'local',
    }

    expect(event.type).toBe('mute')
    // @ts-expect-error - MediaStreamTrack not available in Node test env
    expect(event.track).toBeDefined()
    expect(event.direction).toBe('local')
  })

  it('should include streams when provided', () => {
    // Type checking without browser APIs
    const event: MediaTrackEvent = {
      type: 'ended',
      // @ts-expect-error - MediaStreamTrack not available in Node test env
      track: {} as MediaStreamTrack,
      direction: 'remote',
      // @ts-expect-error - MediaStream not available in Node test env
      streams: [{}] as readonly MediaStream[],
    }

    expect(event.type).toBe('ended')
    // @ts-expect-error - MediaStream not available in Node test env
    expect(event.streams).toHaveLength(1)
  })
})

describe('MediaDeviceChangeEvent', () => {
  it('should create a valid device change event', () => {
    const addedDevices: MediaDevice[] = [
      { deviceId: 'new-mic', kind: MediaDeviceKind.AudioInput, label: 'New Mic', groupId: 'g1' },
    ]
    const removedDevices: MediaDevice[] = []
    const currentDevices: MediaDevice[] = [
      { deviceId: 'new-mic', kind: MediaDeviceKind.AudioInput, label: 'New Mic', groupId: 'g1' },
    ]

    const event: MediaDeviceChangeEvent = {
      type: 'devicechange',
      addedDevices,
      removedDevices,
      currentDevices,
      timestamp: new Date(),
    }

    expect(event.type).toBe('devicechange')
    expect(event.addedDevices).toHaveLength(1)
    expect(event.removedDevices).toHaveLength(0)
    expect(event.currentDevices).toHaveLength(1)
  })
})

describe('MediaError', () => {
  it('should create a valid media error', () => {
    const error: MediaError = {
      name: 'NotAllowedError',
      message: 'Permission denied',
      constraint: 'audio',
    }

    expect(error.name).toBe('NotAllowedError')
    expect(error.message).toBe('Permission denied')
    expect(error.constraint).toBe('audio')
  })

  it('should allow optional constraint', () => {
    const error: MediaError = {
      name: 'UnknownError',
      message: 'Unknown error occurred',
    }

    expect(error.constraint).toBeUndefined()
  })
})

describe('ExtendedMediaStreamConstraints', () => {
  it('should extend standard MediaStreamConstraints', () => {
    const constraints: ExtendedMediaStreamConstraints = {
      audio: {
        deviceId: 'mic-123',
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
      video: {
        deviceId: 'cam-456',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audioDeviceId: 'mic-123',
      videoDeviceId: 'cam-456',
    }

    expect(constraints.audio).toBeDefined()
    expect(constraints.video).toBeDefined()
    expect(constraints.audioDeviceId).toBe('mic-123')
    expect(constraints.videoDeviceId).toBe('cam-456')
  })

  it('should allow simple boolean audio/video', () => {
    const constraints: ExtendedMediaStreamConstraints = {
      audio: true,
      video: false,
    }

    expect(constraints.audio).toBe(true)
    expect(constraints.video).toBe(false)
  })
})
