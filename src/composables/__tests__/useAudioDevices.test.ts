/**
 * useAudioDevices composable tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock functions
const mockEnumerateDevices = vi.fn()
const mockGetCurrentInputDevice = vi.fn()
const mockGetCurrentOutputDevice = vi.fn()
const mockSetInputDevice = vi.fn()
const mockSetOutputDevice = vi.fn()
const mockApplyConstraints = vi.fn()
const mockGetCurrentStream = vi.fn()
const mockOnDeviceChange = vi.fn()
const mockDestroy = vi.fn()
const mockPermissionsQuery = vi.fn()

// Use vi.hoisted to ensure mocks are ready before import
const { AudioManagerMock } = vi.hoisted(() => {
  return {
    AudioManagerMock: vi.fn().mockImplementation(() => ({
      enumerateDevices: mockEnumerateDevices,
      getCurrentInputDevice: mockGetCurrentInputDevice,
      getCurrentOutputDevice: mockGetCurrentOutputDevice,
      setInputDevice: mockSetInputDevice,
      setOutputDevice: mockSetOutputDevice,
      applyConstraints: mockApplyConstraints,
      getCurrentStream: mockGetCurrentStream,
      onDeviceChange: mockOnDeviceChange,
      destroy: mockDestroy,
    })),
  }
})

vi.mock('@/core/AudioManager', () => ({
  AudioManager: AudioManagerMock,
}))

beforeEach(() => {
  vi.clearAllMocks()

  // Reset mock implementations
  mockEnumerateDevices.mockResolvedValue([])
  mockGetCurrentInputDevice.mockReturnValue(null)
  mockGetCurrentOutputDevice.mockReturnValue(null)
  mockGetCurrentStream.mockReturnValue(null)

  // Mock navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(new MediaStream()),
      enumerateDevices: mockEnumerateDevices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
  })

  // Mock navigator.permissions
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: mockPermissionsQuery,
    },
    writable: true,
  })
})

afterEach(() => {
  vi.resetModules()
})

describe('useAudioDevices', () => {
  it('should be able to import without crashing', async () => {
    const { useAudioDevices } = await import('../useAudioDevices')
    expect(useAudioDevices).toBeDefined()
    expect(typeof useAudioDevices).toBe('function')
  })

  it('should initialize with empty device lists', async () => {
    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    // Check initial state
    expect(result.microphones.value).toEqual([])
    expect(result.speakers.value).toEqual([])
    expect(result.cameras.value).toEqual([])
    expect(result.allDevices.value).toEqual([])
  })

  it('should initialize with null current devices', async () => {
    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    expect(result.currentMicrophone.value).toBeNull()
    expect(result.currentSpeaker.value).toBeNull()
    expect(result.currentCamera.value).toBeNull()
  })

  it('should initialize with default permission status', async () => {
    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    expect(result.permissionStatus.value).toBe('prompt')
  })

  it('should initialize with isLoading false', async () => {
    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    expect(result.isLoading.value).toBe(false)
  })

  it('should initialize with null error', async () => {
    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    expect(result.error.value).toBeNull()
  })

  it('should return all helper methods', async () => {
    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    // Check all methods exist
    expect(typeof result.refreshDevices).toBe('function')
    expect(typeof result.requestPermissions).toBe('function')
    expect(typeof result.checkAudioPermission).toBe('function')
    expect(typeof result.checkVideoPermission).toBe('function')
    expect(typeof result.selectMicrophone).toBe('function')
    expect(typeof result.selectSpeaker).toBe('function')
    expect(typeof result.selectCamera).toBe('function')
    expect(typeof result.selectDefaultMicrophone).toBe('function')
    expect(typeof result.selectDefaultSpeaker).toBe('function')
    expect(typeof result.selectDefaultCamera).toBe('function')
    expect(typeof result.createAudioStream).toBe('function')
    expect(typeof result.createVideoStream).toBe('function')
    expect(typeof result.getCurrentAudioStream).toBe('function')
    expect(typeof result.getMicrophoneById).toBe('function')
    expect(typeof result.getSpeakerById).toBe('function')
    expect(typeof result.getCameraById).toBe('function')
    expect(typeof result.isDeviceAvailable).toBe('function')
    expect(typeof result.onDeviceAdded).toBe('function')
    expect(typeof result.onDeviceRemoved).toBe('function')
    expect(typeof result.cleanup).toBe('function')
  })

  // Note: Additional tests for device enumeration, selection, and callback handling
  // would require more sophisticated mocking of the AudioManager class. The tests
  // above verify the basic structure and API of the composable.

  it('should request permissions correctly', async () => {
    const mockDevices = [{ deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1' }]
    mockEnumerateDevices.mockResolvedValue(mockDevices)

    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    const success = await result.requestPermissions()

    expect(success).toBe(true)
    expect(result.permissionStatus.value).toBe('granted')
  })

  it('should handle permission denial', async () => {
    const mockGetUserMedia = vi
      .fn()
      .mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: mockEnumerateDevices.mockResolvedValue([]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
    })

    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    const success = await result.requestPermissions()

    expect(success).toBe(false)
    expect(result.permissionStatus.value).toBe('denied')
  })

  it('should check audio permission status', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' })

    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    const status = await result.checkAudioPermission()

    expect(status).toBe('granted')
  })

  it('should check video permission status', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' })

    const { useAudioDevices } = await import('../useAudioDevices')
    const result = useAudioDevices()

    const status = await result.checkVideoPermission()

    expect(status).toBe('granted')
  })
})
