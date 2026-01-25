/**
 * useAudioDeviceSwitch composable unit tests
 *
 * Tests for mid-call audio device switching functionality:
 * - Microphone switching via replaceTrack()
 * - Speaker switching via setSinkId()
 * - Error handling and graceful degradation
 * - Device disconnection fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useAudioDeviceSwitch } from '@/composables/useAudioDeviceSwitch'
import type { CallSession } from '@/core/CallSession'
import type { AudioDevice } from '@/types/audio.types'
import type { UseAudioDevicesReturn } from '@/composables/useAudioDevices'
import { withSetup } from '../../utils/test-helpers'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock constants
vi.mock('@/composables/constants', () => ({
  DEVICE_SWITCH_CONSTANTS: {
    SWITCH_TIMEOUT: 5000,
    FALLBACK_RETRY_DELAY: 500,
  },
}))

/**
 * Create a mock audio track
 */
function createMockAudioTrack(id: string = 'audio-track-1') {
  return {
    kind: 'audio' as const,
    id,
    enabled: true,
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

/**
 * Create a mock MediaStream with audio track
 */
function createMockMediaStream(trackId: string = 'audio-track-1') {
  const audioTrack = createMockAudioTrack(trackId)
  return {
    id: `stream-${trackId}`,
    active: true,
    getTracks: vi.fn().mockReturnValue([audioTrack]),
    getAudioTracks: vi.fn().mockReturnValue([audioTrack]),
    getVideoTracks: vi.fn().mockReturnValue([]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}

/**
 * Create a mock RTCRtpSender
 */
function createMockRTCRtpSender(track: any = createMockAudioTrack()) {
  return {
    track,
    replaceTrack: vi.fn().mockResolvedValue(undefined),
    getParameters: vi.fn().mockReturnValue({}),
    setParameters: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Create a mock RTCPeerConnection
 */
function createMockRTCPeerConnection(senders: any[] = []) {
  return {
    getSenders: vi.fn().mockReturnValue(senders),
    getReceivers: vi.fn().mockReturnValue([]),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

/**
 * Create a mock CallSession
 */
function createMockCallSession(connection: any = null): CallSession {
  return {
    id: 'test-session-id',
    state: 'active',
    connection,
  } as any
}

/**
 * Create a mock HTMLAudioElement with setSinkId support
 */
function createMockAudioElement(supportsSinkId: boolean = true) {
  const element: any = {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    srcObject: null,
    volume: 1,
    muted: false,
  }

  if (supportsSinkId) {
    element.setSinkId = vi.fn().mockResolvedValue(undefined)
  }

  return element as HTMLAudioElement
}

/**
 * Create mock audio devices return object
 */
function createMockAudioDevices(overrides?: Partial<UseAudioDevicesReturn>): UseAudioDevicesReturn {
  const microphones = ref<AudioDevice[]>([
    { deviceId: 'mic-1', label: 'Default Microphone', kind: 'audioinput' },
    { deviceId: 'mic-2', label: 'USB Microphone', kind: 'audioinput' },
  ])

  const speakers = ref<AudioDevice[]>([
    { deviceId: 'speaker-1', label: 'Default Speaker', kind: 'audiooutput' },
    { deviceId: 'speaker-2', label: 'USB Speaker', kind: 'audiooutput' },
  ])

  const deviceRemovedCallbacks: ((device: AudioDevice) => void)[] = []

  return {
    microphones,
    speakers,
    currentMicrophone: ref<AudioDevice | null>(microphones.value[0]),
    currentSpeaker: ref<AudioDevice | null>(speakers.value[0]),
    isDeviceAvailable: vi.fn((deviceId: string) => {
      return (
        microphones.value.some((m) => m.deviceId === deviceId) ||
        speakers.value.some((s) => s.deviceId === deviceId)
      )
    }),
    getMicrophoneById: vi.fn((deviceId: string) => {
      return microphones.value.find((m) => m.deviceId === deviceId) ?? null
    }),
    getSpeakerById: vi.fn((deviceId: string) => {
      return speakers.value.find((s) => s.deviceId === deviceId) ?? null
    }),
    refreshDevices: vi.fn().mockResolvedValue(undefined),
    onDeviceRemoved: vi.fn((callback: (device: AudioDevice) => void) => {
      deviceRemovedCallbacks.push(callback)
      return () => {
        const index = deviceRemovedCallbacks.indexOf(callback)
        if (index > -1) deviceRemovedCallbacks.splice(index, 1)
      }
    }),
    // Helper to trigger device removal in tests
    _triggerDeviceRemoved: (device: AudioDevice) => {
      deviceRemovedCallbacks.forEach((cb) => cb(device))
    },
    ...overrides,
  } as any
}

describe('useAudioDeviceSwitch', () => {
  let mockCallSession: Ref<CallSession | null>
  let mockAudioDevices: ReturnType<typeof createMockAudioDevices>
  let mockAudioElement: Ref<HTMLAudioElement | null>

  beforeEach(() => {
    vi.useFakeTimers()
    mockCallSession = ref<CallSession | null>(null)
    mockAudioDevices = createMockAudioDevices()
    mockAudioElement = ref<HTMLAudioElement | null>(createMockAudioElement())

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(createMockMediaStream()),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
      writable: true,
      configurable: true,
    })

    // Mock window.setTimeout for withTimeout
    vi.spyOn(global, 'setTimeout')
    vi.spyOn(global, 'clearTimeout')
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      expect(result.isSwitching.value).toBe(false)
      expect(result.lastSwitchError.value).toBeNull()
      expect(result.currentInputDevice.value).toEqual(mockAudioDevices.currentMicrophone.value)
      expect(result.currentOutputDevice.value).toEqual(mockAudioDevices.currentSpeaker.value)
      unmount()
    })

    it('should expose all required methods', () => {
      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      expect(typeof result.switchMicrophone).toBe('function')
      expect(typeof result.switchSpeaker).toBe('function')
      expect(typeof result.handleDeviceDisconnected).toBe('function')
      unmount()
    })
  })

  describe('switchMicrophone', () => {
    it('should successfully switch microphone during active call', async () => {
      const oldTrack = createMockAudioTrack('old-track')
      const sender = createMockRTCRtpSender(oldTrack)
      const connection = createMockRTCPeerConnection([sender])
      const session = createMockCallSession(connection)
      mockCallSession.value = session

      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: { deviceId: { exact: 'mic-2' } },
      })
      expect(sender.replaceTrack).toHaveBeenCalled()
      expect(oldTrack.stop).toHaveBeenCalled()
      expect(result.currentInputDevice.value?.deviceId).toBe('mic-2')
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should throw error if no active call session', async () => {
      mockCallSession.value = null

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow('No active call session')
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should throw error if device not found', async () => {
      const connection = createMockRTCPeerConnection([])
      mockCallSession.value = createMockCallSession(connection)
      vi.mocked(mockAudioDevices.isDeviceAvailable).mockReturnValue(false)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('non-existent-mic')).rejects.toThrow(
        'Microphone device not found: non-existent-mic'
      )
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should throw error if no audio sender found', async () => {
      const connection = createMockRTCPeerConnection([])
      mockCallSession.value = createMockCallSession(connection)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow(
        'No audio sender found on RTCPeerConnection'
      )
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should prevent concurrent switch operations', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      // Make getUserMedia hang
      let resolveGetUserMedia: any
      vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(
        () => new Promise((resolve) => (resolveGetUserMedia = resolve))
      )

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      // Start first switch
      const switch1 = result.switchMicrophone('mic-2')

      // Try second switch while first is in progress
      await expect(result.switchMicrophone('mic-1')).rejects.toThrow(
        'A device switch operation is already in progress'
      )

      // Complete first switch
      resolveGetUserMedia(createMockMediaStream())
      await vi.runAllTimersAsync()
      await switch1

      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should handle getUserMedia failure', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
        new Error('Permission denied')
      )

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow('Permission denied')
      expect(result.lastSwitchError.value?.message).toBe('Permission denied')
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should handle replaceTrack failure', async () => {
      const sender = createMockRTCRtpSender()
      sender.replaceTrack = vi.fn().mockRejectedValue(new Error('replaceTrack failed'))
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow('replaceTrack failed')
      expect(result.lastSwitchError.value?.message).toBe('replaceTrack failed')
      expect(newStream.getTracks()[0].stop).toHaveBeenCalled()
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should cleanup new stream tracks on failure', async () => {
      const sender = createMockRTCRtpSender()
      sender.replaceTrack = vi.fn().mockRejectedValue(new Error('replaceTrack failed'))
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const newTrack = createMockAudioTrack('new-track')
      const newStream = {
        ...createMockMediaStream('new-track'),
        getTracks: vi.fn().mockReturnValue([newTrack]),
        getAudioTracks: vi.fn().mockReturnValue([newTrack]),
      }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow()
      expect(newTrack.stop).toHaveBeenCalled()
      unmount()
    })

    it('should handle timeout for getUserMedia', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(() => new Promise(() => {}))

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          switchTimeout: 100,
        })
      )

      const switchPromise = result.switchMicrophone('mic-2')
      vi.advanceTimersByTime(150)

      await expect(switchPromise).rejects.toThrow('getUserMedia timed out after 100ms')
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })
  })

  describe('switchSpeaker', () => {
    it('should successfully switch speaker using setSinkId', async () => {
      const audioElement = createMockAudioElement(true)
      mockAudioElement.value = audioElement

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      const switchPromise = result.switchSpeaker('speaker-2')
      await vi.runAllTimersAsync()
      await switchPromise

      expect(audioElement.setSinkId).toHaveBeenCalledWith('speaker-2')
      expect(result.currentOutputDevice.value?.deviceId).toBe('speaker-2')
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should throw error if device not found', async () => {
      vi.mocked(mockAudioDevices.isDeviceAvailable).mockReturnValue(false)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchSpeaker('non-existent-speaker')).rejects.toThrow(
        'Speaker device not found: non-existent-speaker'
      )
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should throw error if no audio element available', async () => {
      mockAudioElement.value = null

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchSpeaker('speaker-2')).rejects.toThrow(
        'No audio element available for speaker switching'
      )
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should throw error if setSinkId is not supported', async () => {
      const audioElement = createMockAudioElement(false) // No setSinkId
      mockAudioElement.value = audioElement

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchSpeaker('speaker-2')).rejects.toThrow(
        'setSinkId is not supported in this browser'
      )
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should prevent concurrent switch operations', async () => {
      const audioElement = createMockAudioElement(true)
      mockAudioElement.value = audioElement

      // Make setSinkId hang
      let resolveSinkId: any
      audioElement.setSinkId = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => (resolveSinkId = resolve)))

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      // Start first switch
      const switch1 = result.switchSpeaker('speaker-2')

      // Try second switch while first is in progress
      await expect(result.switchSpeaker('speaker-1')).rejects.toThrow(
        'A device switch operation is already in progress'
      )

      // Complete first switch
      resolveSinkId()
      await vi.runAllTimersAsync()
      await switch1

      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should handle setSinkId failure', async () => {
      const audioElement = createMockAudioElement(true)
      audioElement.setSinkId = vi.fn().mockRejectedValue(new Error('setSinkId failed'))
      mockAudioElement.value = audioElement

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchSpeaker('speaker-2')).rejects.toThrow('setSinkId failed')
      expect(result.lastSwitchError.value?.message).toBe('setSinkId failed')
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })

    it('should handle timeout for setSinkId', async () => {
      const audioElement = createMockAudioElement(true)
      audioElement.setSinkId = vi.fn().mockImplementation(() => new Promise(() => {}))
      mockAudioElement.value = audioElement

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          switchTimeout: 100,
        })
      )

      const switchPromise = result.switchSpeaker('speaker-2')
      vi.advanceTimersByTime(150)

      await expect(switchPromise).rejects.toThrow('setSinkId timed out after 100ms')
      expect(result.isSwitching.value).toBe(false)
      unmount()
    })
  })

  describe('handleDeviceDisconnected', () => {
    it('should reset active input device when microphone disconnected', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: false,
        })
      )

      // First switch to mic-2
      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      expect(result.currentInputDevice.value?.deviceId).toBe('mic-2')

      // Disconnect mic-2
      await result.handleDeviceDisconnected({
        deviceId: 'mic-2',
        label: 'USB Microphone',
        kind: 'audioinput',
      })

      // With autoFallback=false, just resets the active device
      expect(result.currentInputDevice.value).toEqual(mockAudioDevices.currentMicrophone.value)
      unmount()
    })

    it('should fallback to default microphone when autoFallback is enabled', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: true,
        })
      )

      // First switch to mic-2
      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      // Disconnect mic-2
      const disconnectPromise = result.handleDeviceDisconnected({
        deviceId: 'mic-2',
        label: 'USB Microphone',
        kind: 'audioinput',
      })
      await vi.runAllTimersAsync()
      await disconnectPromise

      // Should have attempted to switch to default mic (mic-1)
      expect(mockAudioDevices.refreshDevices).toHaveBeenCalled()
      unmount()
    })

    it('should reset active output device when speaker disconnected', async () => {
      const audioElement = createMockAudioElement(true)
      mockAudioElement.value = audioElement

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: false,
        })
      )

      // First switch to speaker-2
      const switchPromise = result.switchSpeaker('speaker-2')
      await vi.runAllTimersAsync()
      await switchPromise

      expect(result.currentOutputDevice.value?.deviceId).toBe('speaker-2')

      // Disconnect speaker-2
      await result.handleDeviceDisconnected({
        deviceId: 'speaker-2',
        label: 'USB Speaker',
        kind: 'audiooutput',
      })

      // With autoFallback=false, just resets the active device
      expect(result.currentOutputDevice.value).toEqual(mockAudioDevices.currentSpeaker.value)
      unmount()
    })

    it('should not fallback if no call session active', async () => {
      mockCallSession.value = null

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: true,
        })
      )

      await result.handleDeviceDisconnected({
        deviceId: 'mic-2',
        label: 'USB Microphone',
        kind: 'audioinput',
      })

      // Should not attempt to switch
      expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled()
      unmount()
    })

    it('should handle fallback failure gracefully', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: true,
        })
      )

      // First switch to mic-2
      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(newStream as any)

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      // Make fallback fail
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Fallback failed')
      )

      // Disconnect mic-2 - should not throw even if fallback fails
      const disconnectPromise = result.handleDeviceDisconnected({
        deviceId: 'mic-2',
        label: 'USB Microphone',
        kind: 'audioinput',
      })
      await vi.runAllTimersAsync()

      // Should complete without throwing
      await expect(disconnectPromise).resolves.toBeUndefined()
      unmount()
    })
  })

  describe('Device Removal Event Listener', () => {
    it('should register device removal listener when autoFallback is enabled', () => {
      const { unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: true,
        })
      )

      expect(mockAudioDevices.onDeviceRemoved).toHaveBeenCalled()
      unmount()
    })

    it('should not register device removal listener when autoFallback is disabled', () => {
      const { unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: false,
        })
      )

      expect(mockAudioDevices.onDeviceRemoved).not.toHaveBeenCalled()
      unmount()
    })

    it('should trigger handleDeviceDisconnected when active device is removed', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: true,
        })
      )

      // First switch to mic-2
      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      // Trigger device removal via the mock
      ;(mockAudioDevices as any)._triggerDeviceRemoved({
        deviceId: 'mic-2',
        label: 'USB Microphone',
        kind: 'audioinput',
      })

      await vi.runAllTimersAsync()

      // Should have triggered refresh
      expect(mockAudioDevices.refreshDevices).toHaveBeenCalled()
      unmount()
    })
  })

  describe('Call Session Watch', () => {
    it('should reset state when call session ends', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      // Switch microphone
      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      expect(result.currentInputDevice.value?.deviceId).toBe('mic-2')

      // End call session
      mockCallSession.value = null
      await vi.runAllTimersAsync()

      // State should be reset - currentInputDevice falls back to audioDevices.currentMicrophone
      expect(result.currentInputDevice.value).toEqual(mockAudioDevices.currentMicrophone.value)
      expect(result.lastSwitchError.value).toBeNull()
      unmount()
    })
  })

  describe('Cleanup on Unmount', () => {
    it('should cleanup device removal listener on unmount', () => {
      const cleanupFn = vi.fn()
      vi.mocked(mockAudioDevices.onDeviceRemoved).mockReturnValue(cleanupFn)

      const { unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
          autoFallback: true,
        })
      )

      unmount()

      expect(cleanupFn).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should convert non-Error objects to Error', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue('string error')

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow('string error')
      expect(result.lastSwitchError.value).toBeInstanceOf(Error)
      expect(result.lastSwitchError.value?.message).toBe('string error')
      unmount()
    })

    it('should handle missing audio track in new stream', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const emptyStream = {
        ...createMockMediaStream(),
        getAudioTracks: vi.fn().mockReturnValue([]),
        getTracks: vi.fn().mockReturnValue([]),
      }
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(emptyStream as any)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow(
        'Failed to acquire audio track from new device'
      )
      unmount()
    })
  })

  describe('Computed Properties', () => {
    it('should return correct currentInputDevice based on activeInputDeviceId', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      // Initially returns audioDevices.currentMicrophone
      expect(result.currentInputDevice.value).toEqual(mockAudioDevices.currentMicrophone.value)

      // After switching, returns the switched device
      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      expect(result.currentInputDevice.value?.deviceId).toBe('mic-2')
      unmount()
    })

    it('should return correct currentOutputDevice based on activeOutputDeviceId', async () => {
      const audioElement = createMockAudioElement(true)
      mockAudioElement.value = audioElement

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      // Initially returns audioDevices.currentSpeaker
      expect(result.currentOutputDevice.value).toEqual(mockAudioDevices.currentSpeaker.value)

      // After switching, returns the switched device
      const switchPromise = result.switchSpeaker('speaker-2')
      await vi.runAllTimersAsync()
      await switchPromise

      expect(result.currentOutputDevice.value?.deviceId).toBe('speaker-2')
      unmount()
    })

    it('should return null if device not found by getMicrophoneById', async () => {
      const sender = createMockRTCRtpSender()
      const connection = createMockRTCPeerConnection([sender])
      mockCallSession.value = createMockCallSession(connection)

      // Make getMicrophoneById return null for mic-2
      vi.mocked(mockAudioDevices.getMicrophoneById).mockImplementation((id) => {
        if (id === 'mic-2') return null
        return mockAudioDevices.microphones.value.find((m) => m.deviceId === id) ?? null
      })

      const { result, unmount } = withSetup(() =>
        useAudioDeviceSwitch(mockCallSession, mockAudioDevices, {
          audioElement: mockAudioElement,
        })
      )

      // Switch to mic-2
      const newStream = createMockMediaStream('new-track')
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(newStream as any)

      const switchPromise = result.switchMicrophone('mic-2')
      await vi.runAllTimersAsync()
      await switchPromise

      // currentInputDevice should be null since getMicrophoneById returns null
      expect(result.currentInputDevice.value).toBeNull()
      unmount()
    })
  })
})
