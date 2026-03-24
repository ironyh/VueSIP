/**
 * useMediaDevices error handling tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MediaDevicesError, MediaDevicesErrorCode } from '../useMediaDevices'

// Mock global navigator.mediaDevices
const mockGetUserMedia = vi.fn()
const mockEnumerateDevices = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Mock navigator.mediaDevices
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices.mockResolvedValue([]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
  })
})

afterEach(() => {
  vi.resetModules()
})

describe('MediaDevicesError', () => {
  it('should have correct name', () => {
    const error = new MediaDevicesError(
      MediaDevicesErrorCode.E_NO_AUDIO_INPUT_SELECTED,
      'No audio input device selected'
    )
    expect(error.name).toBe('MediaDevicesError')
  })

  it('should store code', () => {
    const error = new MediaDevicesError(
      MediaDevicesErrorCode.E_PERMISSION_DENIED,
      'Permission denied'
    )
    expect(error.code).toBe(MediaDevicesErrorCode.E_PERMISSION_DENIED)
  })

  it('should store message', () => {
    const error = new MediaDevicesError(
      MediaDevicesErrorCode.E_NO_AUDIO_OUTPUT_SELECTED,
      'No audio output device selected'
    )
    expect(error.message).toBe('No audio output device selected')
  })

  it('should store optional guidance', () => {
    const guidance = 'Select a device first'
    const error = new MediaDevicesError(
      MediaDevicesErrorCode.E_NO_VIDEO_INPUT_SELECTED,
      'No video input device selected',
      guidance
    )
    expect(error.guidance).toBe(guidance)
  })

  it('should be instance of Error', () => {
    const error = new MediaDevicesError(MediaDevicesErrorCode.E_TEST_FAILED, 'Test failed')
    expect(error instanceof Error).toBe(true)
  })

  it('should have correct error codes for all cases', () => {
    expect(MediaDevicesErrorCode.E_NO_AUDIO_INPUT_SELECTED).toBe('E_NO_AUDIO_INPUT_SELECTED')
    expect(MediaDevicesErrorCode.E_NO_AUDIO_OUTPUT_SELECTED).toBe('E_NO_AUDIO_OUTPUT_SELECTED')
    expect(MediaDevicesErrorCode.E_NO_VIDEO_INPUT_SELECTED).toBe('E_NO_VIDEO_INPUT_SELECTED')
    expect(MediaDevicesErrorCode.E_PERMISSION_DENIED).toBe('E_PERMISSION_DENIED')
    expect(MediaDevicesErrorCode.E_DEVICES_NOT_ENUMERATED).toBe('E_DEVICES_NOT_ENUMERATED')
    expect(MediaDevicesErrorCode.E_TEST_FAILED).toBe('E_TEST_FAILED')
  })
})

describe('useMediaDevices error messages', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requestAudioPermission returns false when permission denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))

    const { useMediaDevices } = await import('../useMediaDevices')
    const { requestAudioPermission } = useMediaDevices()

    const result = await requestAudioPermission()
    expect(result).toBe(false)
  })

  it('requestVideoPermission returns false when permission denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))

    const { useMediaDevices } = await import('../useMediaDevices')
    const { requestVideoPermission } = useMediaDevices()

    const result = await requestVideoPermission()
    expect(result).toBe(false)
  })

  it('requestPermissions throws MediaDevicesError with code when denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))

    const { useMediaDevices } = await import('../useMediaDevices')
    const { requestPermissions } = useMediaDevices()

    try {
      await requestPermissions(true, false)
      // Should throw
      expect.unreachable('requestPermissions should have thrown')
    } catch (error: unknown) {
      // Check by code property rather than instanceof due to module re-import
      const err = error as { code: string; message: string; guidance?: string }
      expect(err.code).toBe(MediaDevicesErrorCode.E_PERMISSION_DENIED)
      expect(err.message).toContain('Permission request failed')
      expect(err.guidance).toContain('allow access')
      expect(err.guidance).toContain('E_PERMISSION_DENIED')
    }
  })

  it('testAudioInput returns false when no audio input device selected', async () => {
    const { useMediaDevices } = await import('../useMediaDevices')
    const { testAudioInput } = useMediaDevices()

    // testAudioInput catches errors internally and returns false
    const result = await testAudioInput()
    expect(result).toBe(false)
  })

  it('testAudioOutput returns false when no audio output device selected', async () => {
    const { useMediaDevices } = await import('../useMediaDevices')
    const { testAudioOutput } = useMediaDevices()

    // testAudioOutput catches errors internally and returns false
    const result = await testAudioOutput()
    expect(result).toBe(false)
  })

  it('testAudioInput returns false when getUserMedia fails', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'))

    const { useMediaDevices } = await import('../useMediaDevices')
    const { testAudioInput } = useMediaDevices()

    const result = await testAudioInput('mock-device-id')
    expect(result).toBe(false)
  })
})
