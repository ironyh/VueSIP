/**
 * Tests for useAudioDeviceSwitch composable
 * @module tests/composables/useAudioDeviceSwitch.test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useAudioDeviceSwitch } from '@/composables/useAudioDeviceSwitch'
import type { AudioDevice } from '@/types/audio.types'

// Helper to create a mock audio device
function createAudioDevice(overrides: Partial<AudioDevice> = {}): AudioDevice {
  return {
    deviceId: 'device-1',
    label: 'Microphone 1',
    kind: 'audioinput',
    groupId: 'group-1',
    ...overrides,
  }
}

// Mock CallSession
const createMockSession = () => ({
  connection: {
    getSenders: vi.fn(() => [
      {
        track: {
          kind: 'audio',
          stop: vi.fn(),
        },
        replaceTrack: vi.fn(() => Promise.resolve()),
      },
    ]),
  } as unknown as RTCPeerConnection,
})

describe('useAudioDeviceSwitch', () => {
  let callSession: ReturnType<typeof ref>
  let mockSession: ReturnType<typeof createMockSession>

  const createAudioDevices = () => {
    const mic = createAudioDevice({ deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1' })
    const speaker = createAudioDevice({
      deviceId: 'spk-1',
      kind: 'audiooutput',
      label: 'Speaker 1',
    })

    return {
      currentMicrophone: ref(mic),
      currentSpeaker: ref(speaker),
      getMicrophoneById: (id: string) =>
        id === 'mic-1'
          ? mic
          : id === 'mic-2'
            ? createAudioDevice({ deviceId: 'mic-2', label: 'Mic 2' })
            : undefined,
      getSpeakerById: (id: string) => (id === 'spk-1' ? speaker : undefined),
      isDeviceAvailable: (id: string) => id === 'mic-1' || id === 'mic-2' || id === 'spk-1',
      refreshDevices: vi.fn(() => Promise.resolve()),
      microphones: ref([mic]),
      speakers: ref([speaker]),
      onDeviceRemoved: vi.fn(() => () => {}),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockSession = createMockSession()
    callSession = ref(mockSession as any)
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices)

      expect(result.isSwitching.value).toBe(false)
      expect(result.lastSwitchError.value).toBeNull()
    })

    it('should compute current input device from audioDevices.currentMicrophone', () => {
      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices)

      // currentInputDevice returns currentMicrophone when activeInputDeviceId is null
      expect(result.currentInputDevice.value?.deviceId).toBe('mic-1')
    })

    it('should compute current output device from audioDevices.currentSpeaker', () => {
      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices)

      // currentOutputDevice returns currentSpeaker when activeOutputDeviceId is null
      expect(result.currentOutputDevice.value?.deviceId).toBe('spk-1')
    })

    it('should use activeInputDeviceId when set after switch', async () => {
      const audioDevices = createAudioDevices()
      const newStream = { getAudioTracks: () => [{ stop: vi.fn() }] } as any
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(newStream)

      const result = useAudioDeviceSwitch(callSession, audioDevices)

      // Switch to a new microphone
      await result.switchMicrophone('mic-2')

      // Now it should use activeInputDeviceId lookup
      expect(result.currentInputDevice.value?.deviceId).toBe('mic-2')
    })
  })

  describe('switchMicrophone', () => {
    it('should throw if no call session', async () => {
      callSession.value = null
      const audioDevices = createAudioDevices()

      const result = useAudioDeviceSwitch(callSession, audioDevices)

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow('No active call session')
    })

    it('should throw if device not available', async () => {
      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices)

      await expect(result.switchMicrophone('nonexistent')).rejects.toThrow(
        'Microphone device not found: nonexistent'
      )
    })

    it('should throw if switch already in progress', async () => {
      // Mock getUserMedia to hang
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )
      const audioDevices = createAudioDevices()

      const result = useAudioDeviceSwitch(callSession, audioDevices)

      // Start first switch
      const firstSwitch = result.switchMicrophone('mic-2')

      // Second should fail
      await expect(result.switchMicrophone('mic-1')).rejects.toThrow(
        'A device switch operation is already in progress'
      )

      firstSwitch.catch(() => {}) // Clean up
      vi.restoreAllMocks()
    })

    it('should successfully switch microphone', async () => {
      const audioDevices = createAudioDevices()
      const newStream = { getAudioTracks: () => [{ stop: vi.fn() }] } as any

      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(newStream)

      const result = useAudioDeviceSwitch(callSession, audioDevices)

      await result.switchMicrophone('mic-2')

      expect(result.currentInputDevice.value?.deviceId).toBe('mic-2')
      expect(result.isSwitching.value).toBe(false)
    })

    it('should handle switch timeout', async () => {
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )
      const audioDevices = createAudioDevices()

      const result = useAudioDeviceSwitch(callSession, audioDevices, {
        switchTimeout: 100,
      })

      await expect(result.switchMicrophone('mic-2')).rejects.toThrow(
        'getUserMedia timed out after 100ms'
      )
    })
  })

  describe('switchSpeaker', () => {
    it('should throw if device not available', async () => {
      // Mock setSinkId as existing function
      const mockElement = {
        setSinkId: vi.fn().mockResolvedValue(undefined),
      } as unknown as HTMLAudioElement

      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices, {
        audioElement: ref(mockElement),
      })

      await expect(result.switchSpeaker('nonexistent')).rejects.toThrow(
        'Speaker device not found: nonexistent'
      )
    })

    it('should throw if no audio element', async () => {
      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices)

      await expect(result.switchSpeaker('spk-1')).rejects.toThrow(
        'No audio element available for speaker switching'
      )
    })

    it('should successfully switch speaker', async () => {
      const mockElement = {
        setSinkId: vi.fn().mockResolvedValue(undefined),
      } as unknown as HTMLAudioElement

      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices, {
        audioElement: ref(mockElement),
      })

      await result.switchSpeaker('spk-1')

      expect(mockElement.setSinkId).toHaveBeenCalledWith('spk-1')
    })
  })

  describe('handleDeviceDisconnected', () => {
    it('should handle microphone disconnection with autoFallback disabled', async () => {
      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices, {
        autoFallback: false,
      })

      const disconnectedMic = createAudioDevice({ deviceId: 'mic-1', kind: 'audioinput' })

      await result.handleDeviceDisconnected(disconnectedMic)

      expect(audioDevices.refreshDevices).not.toHaveBeenCalled()
    })

    it('should handle speaker disconnection', async () => {
      const mockElement = {
        setSinkId: vi.fn().mockResolvedValue(undefined),
      } as unknown as HTMLAudioElement

      const audioDevices = createAudioDevices()
      const result = useAudioDeviceSwitch(callSession, audioDevices, {
        audioElement: ref(mockElement),
        autoFallback: true,
      })

      // First switch to the speaker so it's tracked in activeOutputDeviceId
      await result.switchSpeaker('spk-1')

      const disconnectedSpeaker = createAudioDevice({ deviceId: 'spk-1', kind: 'audiooutput' })

      await result.handleDeviceDisconnected(disconnectedSpeaker)

      expect(audioDevices.refreshDevices).toHaveBeenCalled()
    })
  })

  describe('partial implementation support', () => {
    it('should work without currentMicrophone ref', () => {
      const partialDevices = {
        getMicrophoneById: (id: string) =>
          id === 'mic-1' ? createAudioDevice({ deviceId: 'mic-1' }) : undefined,
      }

      const result = useAudioDeviceSwitch(callSession, partialDevices as any)

      expect(result.currentInputDevice.value).toBeNull()
    })

    it('should work without isDeviceAvailable function', async () => {
      const devicesWithoutValidation = {
        currentMicrophone: ref(createAudioDevice({ deviceId: 'mic-1' })),
        getMicrophoneById: (id: string) =>
          id === 'mic-1' ? createAudioDevice({ deviceId: 'mic-1' }) : undefined,
      }

      const newStream = { getAudioTracks: () => [{ stop: vi.fn() }] } as any
      vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(newStream)

      const result = useAudioDeviceSwitch(callSession, devicesWithoutValidation as any)

      // Should not throw about device not available
      await result.switchMicrophone('mic-2')
    })
  })
})
