import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  useMediaPermissions,
  type UseMediaPermissionsReturn,
} from '@/composables/useMediaPermissions'
import { PermissionStatus } from '@/types/media.types'

// Mock stream
const mockMediaStream = {
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => []),
}

// Mock navigator.mediaDevices
const mockNavigatorMediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
  enumerateDevices: vi.fn(() => Promise.resolve([])),
}

// Mock navigator.permissions
const mockNavigatorPermissions = {
  query: vi.fn(),
}

describe('useMediaPermissions', () => {
  let composable: UseMediaPermissionsReturn
  let mockPermissionsQuery: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup global mocks
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: mockNavigatorMediaDevices,
      writable: true,
    })

    Object.defineProperty(global.navigator, 'permissions', {
      value: mockNavigatorPermissions,
      writable: true,
    })

    mockPermissionsQuery = vi.fn()
    mockNavigatorPermissions.query = mockPermissionsQuery

    // Create composable without autoCheck to control test conditions
    composable = useMediaPermissions({ autoCheck: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have initial PermissionStatus.NotRequested for audio', () => {
      expect(composable.audioStatus.value).toBe(PermissionStatus.NotRequested)
    })

    it('should have initial PermissionStatus.NotRequested for video', () => {
      expect(composable.videoStatus.value).toBe(PermissionStatus.NotRequested)
    })

    it('should not be checking initially', () => {
      expect(composable.isChecking.value).toBe(false)
    })

    it('should not have audio permission initially', () => {
      expect(composable.hasAudioPermission.value).toBe(false)
    })

    it('should not have video permission initially', () => {
      expect(composable.hasVideoPermission.value).toBe(false)
    })

    it('should not be ready for calls initially', () => {
      expect(composable.isReadyForCalls.value).toBe(false)
    })

    it('should have no last error initially', () => {
      expect(composable.lastError.value).toBeNull()
    })
  })

  describe('readinessMessage', () => {
    it('should show correct message when not requested', () => {
      expect(composable.readinessMessage.value).toBe('Mikrofontillgång krävs för samtal')
    })

    it('should show checking message when isChecking is true', async () => {
      // Mock a slow permissions query
      let resolveQuery: (value: unknown) => void
      mockPermissionsQuery.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveQuery = resolve
          })
      )

      const checkPromise = composable.checkAudioPermission()

      // Check is set immediately
      expect(composable.isChecking.value).toBe(true)
      expect(composable.readinessMessage.value).toBe('Kontrollerar mikrofontillgång...')

      resolveQuery!({ state: 'granted' })
      await checkPromise
    })

    it('should show ready message when audio is granted', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' })

      await composable.checkAudioPermission()

      expect(composable.readinessMessage.value).toBe('Redo för samtal')
    })

    it('should show denied message when audio is denied', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'denied' })

      await composable.checkAudioPermission()

      expect(composable.readinessMessage.value).toBe(
        'Mikrofontillgång nekad. Aktivera i webbläsarinställningar.'
      )
    })

    it('should show prompt message when audio is prompt', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' })

      await composable.checkAudioPermission()

      expect(composable.readinessMessage.value).toBe('Klicka för att ge mikrofontillgång')
    })
  })

  describe('checkAudioPermission', () => {
    it('should check audio permission using Permissions API', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' })

      const result = await composable.checkAudioPermission()

      expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'microphone' })
      expect(result.granted).toBe(true)
      expect(result.status).toBe(PermissionStatus.Granted)
      expect(composable.audioStatus.value).toBe(PermissionStatus.Granted)
    })

    it('should return denied status when permission is denied', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'denied' })

      const result = await composable.checkAudioPermission()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Denied)
      expect(result.blocking).toBe(true)
    })

    it('should return prompt status when permission is prompt', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' })

      const result = await composable.checkAudioPermission()

      expect(result.status).toBe(PermissionStatus.Prompt)
      expect(result.blocking).toBe(false)
    })

    it('should fallback to enumerateDevices when permissions API not available', async () => {
      // Remove permissions API
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        writable: true,
      })

      // Mock enumerateDevices to return device with label (meaning permission granted)
      mockNavigatorMediaDevices.enumerateDevices.mockResolvedValue([
        { kind: 'audioinput', label: 'Microphone', deviceId: 'mic-1' },
      ])

      const result = await composable.checkAudioPermission()

      expect(result.granted).toBe(true)
      expect(result.status).toBe(PermissionStatus.Granted)
    })

    it('should fallback to NotRequested when enumerateDevices returns no labels', async () => {
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        writable: true,
      })

      mockNavigatorMediaDevices.enumerateDevices.mockResolvedValue([])

      const result = await composable.checkAudioPermission()

      expect(result.status).toBe(PermissionStatus.NotRequested)
    })

    it('should handle permission query errors gracefully', async () => {
      mockPermissionsQuery.mockRejectedValue(new Error('API error'))

      const result = await composable.checkAudioPermission()

      expect(result.status).toBe(PermissionStatus.NotRequested)
      expect(composable.lastError.value).toBeInstanceOf(Error)
    })

    it('should set isChecking during the check', async () => {
      let _checkCompleted = false
      mockPermissionsQuery.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              _checkCompleted = true
              resolve({ state: 'granted' })
            }, 10)
          })
      )

      const promise = composable.checkAudioPermission()

      expect(composable.isChecking.value).toBe(true)

      await promise

      expect(composable.isChecking.value).toBe(false)
    })
  })

  describe('checkVideoPermission', () => {
    it('should check video permission using Permissions API', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' })

      const result = await composable.checkVideoPermission()

      expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'camera' })
      expect(result.granted).toBe(true)
      expect(result.status).toBe(PermissionStatus.Granted)
    })

    it('should return denied status when permission is denied', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'denied' })

      const result = await composable.checkVideoPermission()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Denied)
    })
  })

  describe('checkAllPermissions', () => {
    it('should check both audio and video permissions', async () => {
      mockPermissionsQuery
        .mockResolvedValueOnce({ state: 'granted' })
        .mockResolvedValueOnce({ state: 'denied' })

      const result = await composable.checkAllPermissions()

      expect(result.audio.granted).toBe(true)
      expect(result.video.granted).toBe(false)
    })
  })

  describe('requestAudioPermission', () => {
    it('should request audio permission via getUserMedia', async () => {
      const result = await composable.requestAudioPermission()

      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(result.granted).toBe(true)
      expect(composable.audioStatus.value).toBe(PermissionStatus.Granted)
    })

    it('should stop tracks after getting permission', async () => {
      const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
      mockMediaStream.getTracks.mockReturnValue(tracks as any)

      await composable.requestAudioPermission()

      expect(tracks[0].stop).toHaveBeenCalled()
      expect(tracks[1].stop).toHaveBeenCalled()
    })

    it('should handle NotAllowedError (denied)', async () => {
      mockNavigatorMediaDevices.getUserMedia.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      )

      const result = await composable.requestAudioPermission()

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Denied)
      expect(result.blocking).toBe(true)
    })

    it('should handle NotFoundError (no microphone)', async () => {
      mockNavigatorMediaDevices.getUserMedia.mockRejectedValue(
        new DOMException('No microphone found', 'NotFoundError')
      )

      const result = await composable.requestAudioPermission()

      expect(result.status).toBe(PermissionStatus.NotRequested)
      expect(composable.lastError.value?.message).toBe('Ingen mikrofon hittades')
    })
  })

  describe('requestVideoPermission', () => {
    it('should request video permission via getUserMedia', async () => {
      const result = await composable.requestVideoPermission()

      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true })
      expect(result.granted).toBe(true)
      expect(composable.videoStatus.value).toBe(PermissionStatus.Granted)
    })

    it('should handle NotAllowedError (denied)', async () => {
      mockNavigatorMediaDevices.getUserMedia.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      )

      const result = await composable.requestVideoPermission()

      expect(result.status).toBe(PermissionStatus.Denied)
    })
  })

  describe('requestCallPermissions', () => {
    it('should request only audio by default', async () => {
      await composable.requestCallPermissions()

      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    it('should request video when video=true', async () => {
      await composable.requestCallPermissions(true)

      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true })
    })

    it('should return early audio result if audio denied', async () => {
      mockNavigatorMediaDevices.getUserMedia
        .mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'))
        .mockResolvedValue(mockMediaStream)

      const result = await composable.requestCallPermissions(true)

      expect(result.granted).toBe(false)
      expect(result.status).toBe(PermissionStatus.Denied)
      // Should not try video since audio failed
      expect(mockNavigatorMediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('should return granted when audio succeeds', async () => {
      const result = await composable.requestCallPermissions()

      expect(result.granted).toBe(true)
      expect(result.status).toBe(PermissionStatus.Granted)
      expect(result.blocking).toBe(false)
    })
  })

  describe('permission status messages', () => {
    it('should return correct audio messages', async () => {
      // Granted
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' })
      expect((await composable.checkAudioPermission()).message).toBe('Mikrofontillgång beviljad')

      // Denied
      mockPermissionsQuery.mockResolvedValue({ state: 'denied' })
      expect((await composable.checkAudioPermission()).message).toBe(
        'Mikrofontillgång nekad. Aktivera i webbläsarinställningar.'
      )

      // Prompt
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' })
      expect((await composable.checkAudioPermission()).message).toBe(
        'Klicka för att ge mikrofontillgång'
      )

      // NotRequested
      Object.defineProperty(global.navigator, 'permissions', { value: undefined, writable: true })
      mockNavigatorMediaDevices.enumerateDevices.mockResolvedValue([])
      expect((await composable.checkAudioPermission()).message).toBe(
        'Mikrofontillgång krävs för samtal'
      )
    })

    it('should return correct video messages', async () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'granted' })
      expect((await composable.checkVideoPermission()).message).toBe('Kameratillgång beviljad')

      mockPermissionsQuery.mockResolvedValue({ state: 'denied' })
      expect((await composable.checkVideoPermission()).message).toBe('Kameratillgång nekad')

      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' })
      expect((await composable.checkVideoPermission()).message).toBe(
        'Klicka för att ge kameratillgång'
      )
    })
  })
})
