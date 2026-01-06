/**
 * Tests for usePictureInPicture composable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { usePictureInPicture } from '@/composables/usePictureInPicture'

describe('usePictureInPicture', () => {
  let mockLocalStorage: Record<string, string>
  let mockVideo: HTMLVideoElement
  let mockPiPWindow: PictureInPictureWindow

  beforeEach(() => {
    vi.useFakeTimers()

    // Mock localStorage
    mockLocalStorage = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key]
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {}
      }),
    })

    // Mock PiP window
    mockPiPWindow = {
      width: 400,
      height: 300,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onresize: null,
    } as unknown as PictureInPictureWindow

    // Mock video element
    mockVideo = {
      requestPictureInPicture: vi.fn().mockResolvedValue(mockPiPWindow),
      disablePictureInPicture: false,
      readyState: 4, // HAVE_ENOUGH_DATA
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLVideoElement

    // Mock document PiP support
    vi.stubGlobal('document', {
      ...document,
      pictureInPictureEnabled: true,
      pictureInPictureElement: null,
      exitPictureInPicture: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // ==========================================================================
  // Initialization and Support Detection
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const videoRef = ref<HTMLVideoElement | null>(null)
      const { isPiPSupported, isPiPActive, pipWindow, error } =
        usePictureInPicture(videoRef)

      expect(isPiPSupported.value).toBe(true)
      expect(isPiPActive.value).toBe(false)
      expect(pipWindow.value).toBeNull()
      expect(error.value).toBeNull()
    })

    it('should detect PiP support', () => {
      const videoRef = ref<HTMLVideoElement | null>(null)
      const { isPiPSupported } = usePictureInPicture(videoRef)

      expect(isPiPSupported.value).toBe(true)
    })

    it('should detect lack of PiP support', () => {
      vi.stubGlobal('document', {
        ...document,
        pictureInPictureEnabled: false,
      })

      const videoRef = ref<HTMLVideoElement | null>(null)
      const { isPiPSupported } = usePictureInPicture(videoRef)

      expect(isPiPSupported.value).toBe(false)
    })

    it('should handle missing pictureInPictureEnabled property', () => {
      const docWithoutPiP = { ...document }
      delete (docWithoutPiP as any).pictureInPictureEnabled
      vi.stubGlobal('document', docWithoutPiP)

      const videoRef = ref<HTMLVideoElement | null>(null)
      const { isPiPSupported } = usePictureInPicture(videoRef)

      expect(isPiPSupported.value).toBe(false)
    })
  })

  // ==========================================================================
  // Enter PiP
  // ==========================================================================

  describe('enterPiP', () => {
    it('should enter PiP mode successfully', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP, isPiPActive, pipWindow, error } =
        usePictureInPicture(videoRef)

      await enterPiP()

      expect(mockVideo.requestPictureInPicture).toHaveBeenCalled()
      expect(isPiPActive.value).toBe(true)
      expect(pipWindow.value).toBe(mockPiPWindow)
      expect(error.value).toBeNull()
    })

    it('should set error when PiP is not supported', async () => {
      vi.stubGlobal('document', {
        ...document,
        pictureInPictureEnabled: false,
      })

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP, error } = usePictureInPicture(videoRef)

      await enterPiP()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toContain('not supported')
    })

    it('should set error when video element is null', async () => {
      const videoRef = ref<HTMLVideoElement | null>(null)
      const { enterPiP, error } = usePictureInPicture(videoRef)

      await enterPiP()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toContain('Video element not found')
    })

    it('should set error when PiP is disabled on video', async () => {
      const disabledVideo = {
        ...mockVideo,
        disablePictureInPicture: true,
      } as unknown as HTMLVideoElement

      const videoRef = ref<HTMLVideoElement | null>(disabledVideo)
      const { enterPiP, error } = usePictureInPicture(videoRef)

      await enterPiP()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toContain('disabled')
    })

    it('should handle requestPictureInPicture errors', async () => {
      const failingVideo = {
        ...mockVideo,
        requestPictureInPicture: vi.fn().mockRejectedValue(new Error('PiP failed')),
      } as unknown as HTMLVideoElement

      const videoRef = ref<HTMLVideoElement | null>(failingVideo)
      const { enterPiP, error, isPiPActive } = usePictureInPicture(videoRef)

      await enterPiP()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('PiP failed')
      expect(isPiPActive.value).toBe(false)
    })

    it('should handle non-Error exceptions', async () => {
      const failingVideo = {
        ...mockVideo,
        requestPictureInPicture: vi.fn().mockRejectedValue('string error'),
      } as unknown as HTMLVideoElement

      const videoRef = ref<HTMLVideoElement | null>(failingVideo)
      const { enterPiP, error } = usePictureInPicture(videoRef)

      await enterPiP()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toContain('Failed to enter')
    })

    it('should clear previous error on new attempt', async () => {
      const videoRef = ref<HTMLVideoElement | null>(null)
      const { enterPiP, error } = usePictureInPicture(videoRef)

      await enterPiP()
      expect(error.value).not.toBeNull()

      videoRef.value = mockVideo
      await enterPiP()
      expect(error.value).toBeNull()
    })
  })

  // ==========================================================================
  // Exit PiP
  // ==========================================================================

  describe('exitPiP', () => {
    it('should exit PiP mode successfully', async () => {
      vi.stubGlobal('document', {
        ...document,
        pictureInPictureEnabled: true,
        pictureInPictureElement: mockVideo,
        exitPictureInPicture: vi.fn().mockResolvedValue(undefined),
      })

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP, exitPiP, isPiPActive, pipWindow } =
        usePictureInPicture(videoRef)

      await enterPiP()
      expect(isPiPActive.value).toBe(true)

      await exitPiP()

      expect(document.exitPictureInPicture).toHaveBeenCalled()
      expect(isPiPActive.value).toBe(false)
      expect(pipWindow.value).toBeNull()
    })

    it('should handle when already not in PiP mode', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { exitPiP, isPiPActive, error } = usePictureInPicture(videoRef)

      await exitPiP()

      expect(isPiPActive.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should handle exitPictureInPicture errors', async () => {
      vi.stubGlobal('document', {
        ...document,
        pictureInPictureEnabled: true,
        pictureInPictureElement: mockVideo,
        exitPictureInPicture: vi.fn().mockRejectedValue(new Error('Exit failed')),
      })

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP, exitPiP, error } = usePictureInPicture(videoRef)

      await enterPiP()
      await exitPiP()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('Exit failed')
    })

    it('should handle non-Error exceptions on exit', async () => {
      vi.stubGlobal('document', {
        ...document,
        pictureInPictureEnabled: true,
        pictureInPictureElement: mockVideo,
        exitPictureInPicture: vi.fn().mockRejectedValue('string error'),
      })

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP, exitPiP, error } = usePictureInPicture(videoRef)

      await enterPiP()
      await exitPiP()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toContain('Failed to exit')
    })
  })

  // ==========================================================================
  // Toggle PiP
  // ==========================================================================

  describe('togglePiP', () => {
    it('should toggle from inactive to active', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { togglePiP, isPiPActive } = usePictureInPicture(videoRef)

      expect(isPiPActive.value).toBe(false)

      await togglePiP()

      expect(isPiPActive.value).toBe(true)
    })

    it('should toggle from active to inactive', async () => {
      vi.stubGlobal('document', {
        ...document,
        pictureInPictureEnabled: true,
        pictureInPictureElement: mockVideo,
        exitPictureInPicture: vi.fn().mockResolvedValue(undefined),
      })

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { togglePiP, isPiPActive, enterPiP } = usePictureInPicture(videoRef)

      await enterPiP()
      expect(isPiPActive.value).toBe(true)

      await togglePiP()

      expect(isPiPActive.value).toBe(false)
    })
  })

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  describe('Event Listeners', () => {
    it('should set up event listeners when video element is provided', async () => {
      const videoRef = ref<HTMLVideoElement | null>(null)
      usePictureInPicture(videoRef)

      videoRef.value = mockVideo
      await nextTick()

      expect(mockVideo.addEventListener).toHaveBeenCalledWith(
        'enterpictureinpicture',
        expect.any(Function)
      )
      expect(mockVideo.addEventListener).toHaveBeenCalledWith(
        'leavepictureinpicture',
        expect.any(Function)
      )
    })

    it('should handle enterpictureinpicture event', async () => {
      const videoRef = ref<HTMLVideoElement | null>(null)
      const { isPiPActive, pipWindow } = usePictureInPicture(videoRef)

      videoRef.value = mockVideo
      await nextTick()

      // Get the event handler
      const enterHandler = (mockVideo.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'enterpictureinpicture'
      )?.[1]

      // Simulate the event
      const mockEvent = {
        pictureInPictureWindow: mockPiPWindow,
      }
      enterHandler(mockEvent)

      expect(isPiPActive.value).toBe(true)
      expect(pipWindow.value).toBe(mockPiPWindow)
    })

    it('should handle leavepictureinpicture event', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { isPiPActive, pipWindow, enterPiP } = usePictureInPicture(videoRef)

      await nextTick()
      await enterPiP()

      // Get the event handler
      const leaveHandler = (mockVideo.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'leavepictureinpicture'
      )?.[1]

      // Simulate the event
      leaveHandler()

      expect(isPiPActive.value).toBe(false)
      expect(pipWindow.value).toBeNull()
    })

    it('should remove event listeners when video element changes', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      usePictureInPicture(videoRef)

      await nextTick()

      const newVideo = {
        ...mockVideo,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as HTMLVideoElement

      videoRef.value = newVideo
      await nextTick()

      expect(mockVideo.removeEventListener).toHaveBeenCalledWith(
        'enterpictureinpicture',
        expect.any(Function)
      )
      expect(mockVideo.removeEventListener).toHaveBeenCalledWith(
        'leavepictureinpicture',
        expect.any(Function)
      )
    })
  })

  // ==========================================================================
  // Persistence
  // ==========================================================================

  describe('Persistence', () => {
    it('should not persist when persistPreference is false', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP } = usePictureInPicture(videoRef, {
        persistPreference: false,
      })

      await enterPiP()

      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should persist preference when enabled', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP } = usePictureInPicture(videoRef, {
        persistPreference: true,
        preferenceKey: 'test-pip-pref',
      })

      await enterPiP()

      expect(localStorage.setItem).toHaveBeenCalledWith('test-pip-pref', 'true')
    })

    it('should save false when exiting PiP', async () => {
      vi.stubGlobal('document', {
        ...document,
        pictureInPictureEnabled: true,
        pictureInPictureElement: mockVideo,
        exitPictureInPicture: vi.fn().mockResolvedValue(undefined),
      })

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP, exitPiP } = usePictureInPicture(videoRef, {
        persistPreference: true,
      })

      await enterPiP()
      await exitPiP()

      expect(localStorage.setItem).toHaveBeenLastCalledWith(
        'vuesip-pip-preference',
        'false'
      )
    })

    it('should auto-enter PiP when preference is true and video is ready', async () => {
      mockLocalStorage['vuesip-pip-preference'] = 'true'

      const videoRef = ref<HTMLVideoElement | null>(null)
      const { isPiPActive: _isPiPActive } = usePictureInPicture(videoRef, {
        persistPreference: true,
      })

      videoRef.value = mockVideo
      await nextTick()

      // Wait for the setTimeout
      await vi.advanceTimersByTimeAsync(100)

      expect(mockVideo.requestPictureInPicture).toHaveBeenCalled()
    })

    it('should handle corrupted localStorage data', async () => {
      mockLocalStorage['vuesip-pip-preference'] = 'invalid-json{'

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      // Should not throw
      const { isPiPActive } = usePictureInPicture(videoRef, {
        persistPreference: true,
      })

      await nextTick()
      await vi.advanceTimersByTimeAsync(100)

      // Should not auto-enter due to parse error
      expect(isPiPActive.value).toBe(false)
    })

    it('should handle localStorage errors gracefully', async () => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => {
          throw new Error('localStorage error')
        }),
        setItem: vi.fn(() => {
          throw new Error('localStorage error')
        }),
      })

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      // Should not throw
      const { enterPiP, isPiPActive } = usePictureInPicture(videoRef, {
        persistPreference: true,
      })

      await enterPiP()
      expect(isPiPActive.value).toBe(true)
    })

    it('should handle undefined localStorage', async () => {
      vi.stubGlobal('localStorage', undefined)

      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP, isPiPActive } = usePictureInPicture(videoRef, {
        persistPreference: true,
      })

      await enterPiP()
      expect(isPiPActive.value).toBe(true)
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle video element becoming null', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP: _enterPiP } = usePictureInPicture(videoRef)

      await nextTick()

      videoRef.value = null
      await nextTick()

      // Should remove listeners
      expect(mockVideo.removeEventListener).toHaveBeenCalled()
    })

    it('should use custom preference key', async () => {
      const videoRef = ref<HTMLVideoElement | null>(mockVideo)
      const { enterPiP } = usePictureInPicture(videoRef, {
        persistPreference: true,
        preferenceKey: 'my-custom-pip-key',
      })

      await enterPiP()

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'my-custom-pip-key',
        'true'
      )
    })

    it('should not auto-enter when video readyState is low', async () => {
      mockLocalStorage['vuesip-pip-preference'] = 'true'

      const unreadyVideo = {
        ...mockVideo,
        readyState: 0, // HAVE_NOTHING
      } as unknown as HTMLVideoElement

      const videoRef = ref<HTMLVideoElement | null>(null)
      usePictureInPicture(videoRef, {
        persistPreference: true,
      })

      videoRef.value = unreadyVideo
      await nextTick()
      await vi.advanceTimersByTimeAsync(100)

      // Should not auto-enter because video isn't ready
      expect(unreadyVideo.requestPictureInPicture).not.toHaveBeenCalled()
    })
  })
})
