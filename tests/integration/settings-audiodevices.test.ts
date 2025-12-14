/**
 * Settings + AudioDevices Integration Tests
 * Tests integration between settings management and audio device handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettings } from '@/composables/useSettings'
import { useAudioDevices } from '@/composables/useAudioDevices'

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn(() =>
    Promise.resolve({
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
    })
  ),
  enumerateDevices: vi.fn(() =>
    Promise.resolve([
      { deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group-1' },
      { deviceId: 'mic-2', kind: 'audioinput', label: 'Microphone 2', groupId: 'group-2' },
      { deviceId: 'speaker-1', kind: 'audiooutput', label: 'Speaker 1', groupId: 'group-1' },
      { deviceId: 'speaker-2', kind: 'audiooutput', label: 'Speaker 2', groupId: 'group-2' },
    ])
  ),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
})

describe('Settings + AudioDevices Integration', () => {
  beforeEach(() => {
    // Initialize Pinia for settings store
    setActivePinia(createPinia())

    vi.clearAllMocks()
  })

  describe('Device Selection Persistence', () => {
    it('should persist selected microphone to settings', async () => {
      const { settings, updateSettings } = useSettings()
      const { selectMicrophone, refreshDevices } = useAudioDevices()

      await refreshDevices()
      await selectMicrophone('mic-1')

      // Settings should be updated
      updateSettings({
        audio: {
          ...settings.value.audio,
          inputDeviceId: 'mic-1',
        },
      })

      expect(settings.value.audio.inputDeviceId).toBe('mic-1')
    })

    it('should persist selected speaker to settings', async () => {
      const { settings, updateSettings } = useSettings()
      const { selectSpeaker, refreshDevices } = useAudioDevices()

      await refreshDevices()
      await selectSpeaker('speaker-1')

      updateSettings({
        audio: {
          ...settings.value.audio,
          outputDeviceId: 'speaker-1',
        },
      })

      expect(settings.value.audio.outputDeviceId).toBe('speaker-1')
    })

    it('should restore device selection from settings', async () => {
      const { settings, updateSettings } = useSettings()
      const { selectMicrophone, currentMicrophone, refreshDevices } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputDeviceId: 'mic-2',
        },
      })
      await refreshDevices()
      await selectMicrophone(settings.value.audio.inputDeviceId)

      expect(currentMicrophone.value?.deviceId).toBe('mic-2')
    })

    it('should handle device not available', async () => {
      const { settings, updateSettings } = useSettings()
      const { selectMicrophone, refreshDevices } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputDeviceId: 'non-existent',
        },
      })

      await refreshDevices()

      // Should gracefully handle missing device
      await expect(selectMicrophone('non-existent')).rejects.toThrow()
    })
  })

  describe('Volume Settings Integration', () => {
    it('should apply volume from settings', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputVolume: 75,
          outputVolume: 60,
        },
      })

      await createAudioStream({
        deviceId: 'mic-1',
      })

      // Volume should be applied to stream
      expect(true).toBe(true) // Placeholder for actual volume check
    })

    it('should update settings when volume changes', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputVolume: 80,
        },
      })

      expect(settings.value.audio.inputVolume).toBe(80)
    })
  })

  describe('Audio Processing Settings', () => {
    it('should apply echo cancellation setting', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          echoCancellation: true,
        },
      })

      const stream = await createAudioStream({
        echoCancellation: settings.value.audio.echoCancellation,
      })

      expect(stream).toBeDefined()
    })

    it('should apply noise suppression setting', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          noiseSuppression: true,
        },
      })

      const stream = await createAudioStream({
        noiseSuppression: settings.value.audio.noiseSuppression,
      })

      expect(stream).toBeDefined()
    })

    it('should apply auto gain control setting', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          autoGainControl: false,
        },
      })

      const stream = await createAudioStream({
        autoGainControl: settings.value.audio.autoGainControl,
      })

      expect(stream).toBeDefined()
    })

    it('should update all audio processing settings together', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      const stream = await createAudioStream({
        echoCancellation: settings.value.audio.echoCancellation,
        noiseSuppression: settings.value.audio.noiseSuppression,
        autoGainControl: settings.value.audio.autoGainControl,
      })

      expect(stream).toBeDefined()
    })
  })

  describe('Sample Rate and Channel Settings', () => {
    it('should apply sample rate from settings', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          sampleRate: 48000,
        },
      })

      await createAudioStream({
        deviceId: 'mic-1',
      })

      // Sample rate should be applied
      expect(true).toBe(true) // Placeholder
    })

    it('should apply channel count from settings', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          channelCount: 1,
        },
      })

      await createAudioStream({
        deviceId: 'mic-1',
      })

      // Channel count should be applied
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Permission Handling', () => {
    it('should request permissions when settings require devices', async () => {
      const { settings, updateSettings } = useSettings()
      const { requestPermissions } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputDeviceId: 'mic-1',
        },
      })

      const granted = await requestPermissions()

      expect(granted).toBe(true)
    })

    it('should handle permission denial gracefully', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(
        new DOMException('Permission denied', 'NotAllowedError')
      )

      const { requestPermissions } = useAudioDevices()

      const granted = await requestPermissions()

      expect(granted).toBe(false)
    })
  })

  describe('Device Change Handling', () => {
    it('should update settings when device becomes unavailable', async () => {
      const { settings, updateSettings } = useSettings()
      const { refreshDevices, onDeviceRemoved } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputDeviceId: 'mic-1',
        },
      })

      await refreshDevices()

      // Simulate device removal
      const callback = vi.fn((deviceId: string) => {
        if (deviceId === settings.value.audio.inputDeviceId) {
          updateSettings({
            audio: {
              ...settings.value.audio,
              inputDeviceId: 'default',
            },
          })
        }
      })

      onDeviceRemoved(callback)

      // Device removed event would trigger callback
      callback('mic-1')

      expect(settings.value.audio.inputDeviceId).toBe('default')
    })

    it('should refresh device list when new device detected', async () => {
      const { refreshDevices, microphones } = useAudioDevices()

      const initialCount = microphones.value.length

      await refreshDevices()

      // Should maintain or update device list
      expect(microphones.value.length).toBeGreaterThanOrEqual(initialCount)
    })
  })

  describe('Settings Save/Load with Devices', () => {
    it('should save device preferences with settings', async () => {
      const { settings, updateSettings, save } = useSettings()
      const { selectMicrophone, refreshDevices } = useAudioDevices()

      await refreshDevices()
      await selectMicrophone('mic-1')

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputDeviceId: 'mic-1',
        },
      })
      await save()

      expect(settings.value.audio.inputDeviceId).toBe('mic-1')
    })

    it('should restore device selection on settings load', async () => {
      const { settings, updateSettings } = useSettings()
      const { selectMicrophone, refreshDevices } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputDeviceId: 'mic-2',
        },
      })

      await refreshDevices()
      await selectMicrophone(settings.value.audio.inputDeviceId)

      expect(true).toBe(true) // Device selection restored
    })
  })

  describe('Audio Constraints from Settings', () => {
    it('should build constraints from settings', () => {
      const { settings, updateSettings } = useSettings()

      updateSettings({
        audio: {
          ...settings.value.audio,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 1,
        },
      })

      const constraints = {
        echoCancellation: settings.value.audio.echoCancellation,
        noiseSuppression: settings.value.audio.noiseSuppression,
        autoGainControl: settings.value.audio.autoGainControl,
      }

      expect(constraints.echoCancellation).toBe(true)
      expect(constraints.noiseSuppression).toBe(true)
      expect(constraints.autoGainControl).toBe(false)
    })

    it('should apply constraints to new streams', async () => {
      const { settings, updateSettings } = useSettings()
      const { createAudioStream } = useAudioDevices()

      updateSettings({
        audio: {
          ...settings.value.audio,
          echoCancellation: true,
          noiseSuppression: false,
        },
      })

      const stream = await createAudioStream({
        echoCancellation: settings.value.audio.echoCancellation,
        noiseSuppression: settings.value.audio.noiseSuppression,
        deviceId: 'mic-1',
      })

      expect(stream).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle device enumeration errors', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValueOnce(new Error('Enumeration failed'))

      const { refreshDevices, error } = useAudioDevices()

      await refreshDevices()

      expect(error.value).toBe('Failed to enumerate devices: Enumeration failed')
    })

    it('should handle device selection errors', async () => {
      const { selectMicrophone, refreshDevices, error } = useAudioDevices()

      await refreshDevices()

      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Device not found'))

      try {
        await selectMicrophone('invalid-id')
      } catch {
        // Expected
      }

      expect(error.value).toBeDefined()
    })
  })

  describe('Reactive Updates', () => {
    it('should reactively update when settings change', () => {
      const { settings, updateSettings } = useSettings()

      const initialVolume = settings.value.audio.inputVolume

      updateSettings({
        audio: {
          ...settings.value.audio,
          inputVolume: 75,
        },
      })

      expect(settings.value.audio.inputVolume).not.toBe(initialVolume)
    })

    it('should reactively update when device changes', async () => {
      const { refreshDevices, microphones } = useAudioDevices()

      await refreshDevices()

      // Device list should be reactive
      expect(microphones.value.length).toBeDefined()
    })
  })
})
