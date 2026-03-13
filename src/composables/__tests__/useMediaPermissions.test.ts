/**
 * Tests for useMediaPermissions composable
 * @module composables/__tests__/useMediaPermissions.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMediaPermissions } from '../useMediaPermissions'
import { PermissionStatus } from '../../types/media.types'

// Mock logger
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useMediaPermissions', () => {
  let mockPermissionsQuery: ReturnType<typeof vi.fn>
  let mockGetUserMedia: ReturnType<typeof vi.fn>
  let mockEnumerateDevices: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockPermissionsQuery = vi.fn()
    mockGetUserMedia = vi.fn()
    mockEnumerateDevices = vi.fn()

    // Reset navigator mocks
    Object.defineProperty(global, 'navigator', {
      value: {
        permissions: {
          query: mockPermissionsQuery,
        },
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
          enumerateDevices: mockEnumerateDevices,
        },
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should start with NotRequested status', () => {
      const { audioStatus, videoStatus } = useMediaPermissions()

      expect(audioStatus).toBe(PermissionStatus.NotRequested)
      expect(videoStatus).toBe(PermissionStatus.NotRequested)
    })

    it('should have correct initial computed values', () => {
      const { hasAudioPermission, hasVideoPermission, isReadyForCalls } = useMediaPermissions()

      expect(hasAudioPermission.value).toBe(false)
      expect(hasVideoPermission.value).toBe(false)
      expect(isReadyForCalls.value).toBe(false)
    })

    it('should show appropriate readiness message initially', () => {
      const { readinessMessage } = useMediaPermissions()

      expect(readinessMessage.value).toBe('Mikrofontillgång krävs för samtal')
    })
  })

  describe('checkAudioPermission', () => {
    it('should return granted when permission is granted', async () => {
      mockPermissionsQuery.mockResolvedValue({
        state: 'granted',
        onchange: null,
      })

      const { checkAudioPermission, hasAudioPermission } = useMediaPermissions()
      const result = await checkAudioPermission()

      expect(result.granted).toBe(true)
      expect(result.status).toBe(PermissionStatus.Granted)
      expect(hasAudioPermission.value).toBe(true)
      expect(result.message).toBe('Mikrofontillgång beviljad')
      expect(result.blocking).toBe(false)
    })

    it('should return denied when permission is denied', async () => {
      mockPermissionsQuery.mockResolvedValue({
        state: 'denied',
        onchange: null,
      })

      const { checkAudioPermission, hasAudioPermission } = useMediaPermissions()
      const result = await checkAudioPermission()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Denied)
      expect(hasAudioPermission.value).toBe(false)
      expect(result.blocking).toBe(true)
      expect(result.message).toContain('nekad')
    })

    it('should return prompt when permission is prompt', async () => {
      mockPermissionsQuery.mockResolvedValue({
        state: 'prompt',
        onchange: null,
      })

      const { checkAudioPermission } = useMediaPermissions()
      const result = await checkAudioPermission()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Prompt)
      expect(result.message).toContain('Klicka')
    })

    it('should fallback to enumerateDevices when Permissions API is unavailable', async () => {
      // Remove permissions API
      Object.defineProperty(global.navigator, 'permissions', { value: undefined })

      mockEnumerateDevices.mockResolvedValue([
        { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone 1' },
      ])

      const { checkAudioPermission, hasAudioPermission } = useMediaPermissions()
      await checkAudioPermission()

      expect(hasAudioPermission.value).toBe(true)
      expect(mockEnumerateDevices).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockPermissionsQuery.mockRejectedValue(new Error('Permission check failed'))

      const { checkAudioPermission, lastError } = useMediaPermissions()
      const result = await checkAudioPermission()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.NotRequested)
      expect(lastError.value).not.toBeNull()
    })
  })

  describe('requestAudioPermission', () => {
    it('should return granted when getUserMedia succeeds', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      }
      mockGetUserMedia.mockResolvedValue(mockStream)

      const { requestAudioPermission, hasAudioPermission, isReadyForCalls } = useMediaPermissions()
      const result = await requestAudioPermission()

      expect(result.granted).toBe(true)
      expect(result.status).toBe(PermissionStatus.Granted)
      expect(hasAudioPermission.value).toBe(true)
      expect(isReadyForCalls.value).toBe(true)
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    it('should stop tracks after getting permission', async () => {
      const mockTrack = { stop: vi.fn() }
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack]),
      }
      mockGetUserMedia.mockResolvedValue(mockStream)

      const { requestAudioPermission } = useMediaPermissions()
      await requestAudioPermission()

      expect(mockTrack.stop).toHaveBeenCalled()
    })

    it('should return denied when user denies permission', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')
      mockGetUserMedia.mockRejectedValue(error)

      const { requestAudioPermission, hasAudioPermission } = useMediaPermissions()
      const result = await requestAudioPermission()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Denied)
      expect(hasAudioPermission.value).toBe(false)
      expect(result.blocking).toBe(true)
    })

    it('should handle NotFoundError for missing microphone', async () => {
      const error = new DOMException('Device not found', 'NotFoundError')
      mockGetUserMedia.mockRejectedValue(error)

      const { requestAudioPermission, lastError } = useMediaPermissions()
      const result = await requestAudioPermission()

      expect(result.granted).toBe(false)
      expect(lastError.value?.message).toBe('Ingen mikrofon hittades')
    })
  })

  describe('checkAllPermissions', () => {
    it('should check both audio and video permissions', async () => {
      mockPermissionsQuery
        .mockResolvedValueOnce({ state: 'granted', onchange: null }) // audio
        .mockResolvedValueOnce({ state: 'prompt', onchange: null }) // video

      const { checkAllPermissions } = useMediaPermissions()
      const result = await checkAllPermissions()

      expect(result.audio.granted).toBe(true)
      expect(result.video.granted).toBe(false)
      expect(result.video.status).toBe(PermissionStatus.Prompt)
    })
  })

  describe('requestCallPermissions', () => {
    it('should request only audio when video=false', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
      }
      mockGetUserMedia.mockResolvedValue(mockStream)

      const { requestCallPermissions } = useMediaPermissions()
      const result = await requestCallPermissions(false)

      expect(result.granted).toBe(true)
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1)
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    it('should fail if audio permission is denied', async () => {
      const error = new DOMException('Permission denied', 'NotAllowedError')
      mockGetUserMedia.mockRejectedValue(error)

      const { requestCallPermissions } = useMediaPermissions()
      const result = await requestCallPermissions()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Denied)
    })
  })

  describe('readinessMessage', () => {
    it('should show checking message during checks', async () => {
      // Create a pending promise to keep isChecking true
      mockPermissionsQuery.mockReturnValue(new Promise(() => {}))

      const { checkAudioPermission, readinessMessage } = useMediaPermissions()
      checkAudioPermission()

      // Message should show checking immediately
      expect(readinessMessage.value).toBe('Kontrollerar mikrofontillgång...')
    })

    it('should show ready message when permission is granted', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted', onchange: null })

      const { checkAudioPermission, readinessMessage } = useMediaPermissions()
      await checkAudioPermission()

      expect(readinessMessage.value).toBe('Redo för samtal')
    })

    it('should show denied message when permission is denied', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'denied', onchange: null })

      const { checkAudioPermission, readinessMessage } = useMediaPermissions()
      await checkAudioPermission()

      expect(readinessMessage.value).toContain('nekad')
      expect(readinessMessage.value).toContain('Aktivera')
    })
  })
})
