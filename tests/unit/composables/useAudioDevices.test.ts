import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAudioDevices } from '@/composables/useAudioDevices'
import { nextTick, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

// Mock navigator.mediaDevices
const mockEnumerateDevices = vi.fn()
const mockGetUserMedia = vi.fn()
const mockAddEventListener = vi.fn()

const createMockDevice = (
  kind: 'audioinput' | 'audiooutput' | 'videoinput',
  deviceId: string,
  label: string = ''
): MediaDeviceInfo => ({
  deviceId,
  kind,
  label,
  groupId: 'group1',
  toJSON: () => ({}),
})

// Helper to mount composable in Vue component context
function mountUseAudioDevices() {
  let composableResult: ReturnType<typeof useAudioDevices>

  const wrapper = mount(
    defineComponent({
      setup() {
        composableResult = useAudioDevices()
        return composableResult
      },
      template: '<div></div>',
    })
  )

  return {
    result: composableResult!,
    wrapper,
  }
}

beforeEach(() => {
  // Setup navigator.mediaDevices mock
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    writable: true,
    value: {
      enumerateDevices: mockEnumerateDevices,
      getUserMedia: mockGetUserMedia,
      addEventListener: mockAddEventListener,
    },
  })

  // Default mock implementations
  mockGetUserMedia.mockResolvedValue({
    getTracks: () => [],
  })
  mockEnumerateDevices.mockResolvedValue([])
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useAudioDevices', () => {
  describe('Initialization', () => {
    it('should initialize with empty device lists', () => {
      const { result, wrapper } = mountUseAudioDevices()

      expect(result.audioInputDevices.value).toEqual([])
      expect(result.audioOutputDevices.value).toEqual([])

      wrapper.unmount()
    })

    it('should initialize selected devices as null', () => {
      const { result, wrapper } = mountUseAudioDevices()

      expect(result.selectedInputDevice.value).toBeNull()
      expect(result.selectedOutputDevice.value).toBeNull()

      wrapper.unmount()
    })

    it('should call refreshDevices on mount', async () => {
      const { wrapper } = mountUseAudioDevices()

      // onMounted triggers refreshDevices automatically
      // Wait for async operations to complete
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })

      wrapper.unmount()
    })

    it('should register device change listener on mount', async () => {
      const { wrapper } = mountUseAudioDevices()

      // onMounted registers the device change listener
      // Wait for async operations to complete
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockAddEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function))

      wrapper.unmount()
    })
  })

  describe('refreshDevices()', () => {
    it('should request audio permission', async () => {
      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })

      wrapper.unmount()
    })

    it('should enumerate devices after permission granted', async () => {
      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()

      expect(mockEnumerateDevices).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should populate audio input devices', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
        createMockDevice('audioinput', 'input2', 'Microphone 2'),
        createMockDevice('audiooutput', 'output1', 'Speaker 1'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toHaveLength(2)
      expect(result.audioInputDevices.value[0]).toMatchObject({
        deviceId: 'input1',
        label: 'Microphone 1',
        kind: 'audioinput',
      })

      wrapper.unmount()
    })

    it('should populate audio output devices', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audiooutput', 'output1', 'Speaker 1'),
        createMockDevice('audiooutput', 'output2', 'Speaker 2'),
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioOutputDevices.value).toHaveLength(2)
      expect(result.audioOutputDevices.value[0]).toMatchObject({
        deviceId: 'output1',
        label: 'Speaker 1',
        kind: 'audiooutput',
      })

      wrapper.unmount()
    })

    it('should use fallback labels when device label is empty', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'abc123', ''),
        createMockDevice('audiooutput', 'def456', ''),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value[0]?.label).toContain('Microphone')
      expect(result.audioOutputDevices.value[0]?.label).toContain('Speaker')

      wrapper.unmount()
    })

    it('should set default input device if not already set', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
        createMockDevice('audioinput', 'input2', 'Microphone 2'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.selectedInputDevice.value).toBe('input1')

      wrapper.unmount()
    })

    it('should set default output device if not already set', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audiooutput', 'output1', 'Speaker 1'),
        createMockDevice('audiooutput', 'output2', 'Speaker 2'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.selectedOutputDevice.value).toBe('output1')

      wrapper.unmount()
    })

    it('should not change selected device if already set', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
        createMockDevice('audioinput', 'input2', 'Microphone 2'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      // Manually set device before refresh
      result.setInputDevice('input2')

      await result.refreshDevices()
      await nextTick()

      expect(result.selectedInputDevice.value).toBe('input2')

      wrapper.unmount()
    })

    it('should handle permission denied error', async () => {
      const { result, wrapper } = mountUseAudioDevices()

      // Wait for onMounted to complete with successful initial call
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Now mock error for explicit refreshDevices call
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

      // Call refreshDevices explicitly and expect error
      await expect(result.refreshDevices()).rejects.toThrow('Permission denied')

      wrapper.unmount()
    })

    it('should handle enumeration errors', async () => {
      const { result, wrapper } = mountUseAudioDevices()

      // Wait for onMounted to complete with successful initial call
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Now mock error for explicit refreshDevices call
      mockEnumerateDevices.mockRejectedValue(new Error('Enumeration failed'))

      // Call refreshDevices again to test error handling
      await expect(result.refreshDevices()).rejects.toThrow('Enumeration failed')

      wrapper.unmount()
    })

    it('should handle empty device list', async () => {
      mockEnumerateDevices.mockResolvedValue([])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toEqual([])
      expect(result.audioOutputDevices.value).toEqual([])

      wrapper.unmount()
    })

    it('should filter out video devices', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone'),
        createMockDevice('videoinput', 'video1', 'Camera'),
        createMockDevice('audiooutput', 'output1', 'Speaker'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toHaveLength(1)
      expect(result.audioOutputDevices.value).toHaveLength(1)
      expect(result.audioInputDevices.value.some((d) => d.kind === 'videoinput')).toBe(false)

      wrapper.unmount()
    })
  })

  describe('setInputDevice()', () => {
    it('should set selected input device', () => {
      const { result, wrapper } = mountUseAudioDevices()

      result.setInputDevice('input1')

      expect(result.selectedInputDevice.value).toBe('input1')

      wrapper.unmount()
    })

    it('should allow changing input device', () => {
      const { result, wrapper } = mountUseAudioDevices()

      result.setInputDevice('input1')
      expect(result.selectedInputDevice.value).toBe('input1')

      result.setInputDevice('input2')
      expect(result.selectedInputDevice.value).toBe('input2')

      wrapper.unmount()
    })

    it('should set device even if it does not exist in list', () => {
      const { result, wrapper } = mountUseAudioDevices()

      result.setInputDevice('non-existent')

      expect(result.selectedInputDevice.value).toBe('non-existent')

      wrapper.unmount()
    })
  })

  describe('setOutputDevice()', () => {
    it('should set selected output device', () => {
      const { result, wrapper } = mountUseAudioDevices()

      result.setOutputDevice('output1')

      expect(result.selectedOutputDevice.value).toBe('output1')

      wrapper.unmount()
    })

    it('should allow changing output device', () => {
      const { result, wrapper } = mountUseAudioDevices()

      result.setOutputDevice('output1')
      expect(result.selectedOutputDevice.value).toBe('output1')

      result.setOutputDevice('output2')
      expect(result.selectedOutputDevice.value).toBe('output2')

      wrapper.unmount()
    })

    it('should set device even if it does not exist in list', () => {
      const { result, wrapper } = mountUseAudioDevices()

      result.setOutputDevice('non-existent')

      expect(result.selectedOutputDevice.value).toBe('non-existent')

      wrapper.unmount()
    })
  })

  describe('Reactive Properties', () => {
    it('should have reactive audio input devices', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      expect(result.audioInputDevices.value).toHaveLength(0)

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toHaveLength(1)

      wrapper.unmount()
    })

    it('should have reactive audio output devices', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audiooutput', 'output1', 'Speaker 1'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      expect(result.audioOutputDevices.value).toHaveLength(0)

      await result.refreshDevices()
      await nextTick()

      expect(result.audioOutputDevices.value).toHaveLength(1)

      wrapper.unmount()
    })

    it('should have reactive selected input device', () => {
      const { result, wrapper } = mountUseAudioDevices()

      expect(result.selectedInputDevice.value).toBeNull()

      result.setInputDevice('input1')

      expect(result.selectedInputDevice.value).toBe('input1')

      wrapper.unmount()
    })

    it('should have reactive selected output device', () => {
      const { result, wrapper } = mountUseAudioDevices()

      expect(result.selectedOutputDevice.value).toBeNull()

      result.setOutputDevice('output1')

      expect(result.selectedOutputDevice.value).toBe('output1')

      wrapper.unmount()
    })
  })

  describe('Multiple Devices', () => {
    it('should handle multiple input devices', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
        createMockDevice('audioinput', 'input2', 'Microphone 2'),
        createMockDevice('audioinput', 'input3', 'Microphone 3'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toHaveLength(3)

      wrapper.unmount()
    })

    it('should handle multiple output devices', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audiooutput', 'output1', 'Speaker 1'),
        createMockDevice('audiooutput', 'output2', 'Speaker 2'),
        createMockDevice('audiooutput', 'output3', 'Speaker 3'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioOutputDevices.value).toHaveLength(3)

      wrapper.unmount()
    })

    it('should handle mixed device types', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone'),
        createMockDevice('audiooutput', 'output1', 'Speaker'),
        createMockDevice('videoinput', 'video1', 'Camera'),
        createMockDevice('audioinput', 'input2', 'Microphone 2'),
        createMockDevice('audiooutput', 'output2', 'Speaker 2'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toHaveLength(2)
      expect(result.audioOutputDevices.value).toHaveLength(2)

      wrapper.unmount()
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent refreshDevices calls', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      const promise1 = result.refreshDevices()
      const promise2 = result.refreshDevices()

      await Promise.all([promise1, promise2])

      // getUserMedia should be called multiple times
      expect(mockGetUserMedia).toHaveBeenCalled()

      wrapper.unmount()
    })

    it('should handle devices with same deviceId but different kinds', async () => {
      mockEnumerateDevices.mockResolvedValue([
        createMockDevice('audioinput', 'same-id', 'Input'),
        createMockDevice('audiooutput', 'same-id', 'Output'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toHaveLength(1)
      expect(result.audioOutputDevices.value).toHaveLength(1)

      wrapper.unmount()
    })

    it('should preserve device groupId', async () => {
      const customDevice = {
        ...createMockDevice('audioinput', 'input1', 'Microphone'),
        groupId: 'custom-group',
      }

      mockEnumerateDevices.mockResolvedValue([customDevice])

      const { result, wrapper } = mountUseAudioDevices()

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value[0]?.groupId).toBe('custom-group')

      wrapper.unmount()
    })

    it('should handle device changes during refresh', async () => {
      // onMounted will call refreshDevices once, so we need two mockResolvedValueOnce
      // First call (from onMounted) returns one device
      mockEnumerateDevices.mockResolvedValueOnce([
        createMockDevice('audioinput', 'input1', 'Microphone 1'),
      ])

      const { result, wrapper } = mountUseAudioDevices()

      // Wait for onMounted's refreshDevices to complete
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(result.audioInputDevices.value).toHaveLength(1)

      // Second call returns different devices
      mockEnumerateDevices.mockResolvedValueOnce([
        createMockDevice('audioinput', 'input2', 'Microphone 2'),
        createMockDevice('audioinput', 'input3', 'Microphone 3'),
      ])

      await result.refreshDevices()
      await nextTick()

      expect(result.audioInputDevices.value).toHaveLength(2)

      wrapper.unmount()
    })
  })
})
