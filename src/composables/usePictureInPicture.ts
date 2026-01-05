import { ref, shallowRef, watch, onUnmounted, type Ref } from 'vue'

/**
 * Options for the usePictureInPicture composable
 */
export interface PictureInPictureOptions {
  /**
   * Whether to persist the user's PiP preference to localStorage
   * @default false
   */
  persistPreference?: boolean

  /**
   * Key to use for localStorage when persisting preference
   * @default 'vuesip-pip-preference'
   */
  preferenceKey?: string
}

/**
 * Picture-in-Picture window dimensions
 */
export interface PiPWindowDimensions {
  width: number
  height: number
}

/**
 * Return type for the usePictureInPicture composable
 */
export interface UsePictureInPictureReturn {
  /** Whether PiP is supported by the browser */
  isPiPSupported: Ref<boolean>
  /** Whether PiP mode is currently active */
  isPiPActive: Ref<boolean>
  /** Current PiP window dimensions (null when not in PiP) */
  pipWindow: Ref<PictureInPictureWindow | null>
  /** Enter PiP mode */
  enterPiP: () => Promise<void>
  /** Exit PiP mode */
  exitPiP: () => Promise<void>
  /** Toggle PiP mode */
  togglePiP: () => Promise<void>
  /** Current error state */
  error: Ref<Error | null>
}

/**
 * Composable for managing Picture-in-Picture mode for video elements
 *
 * @description
 * The Picture-in-Picture (PiP) composable allows you to display video content
 * in a floating window that stays on top of other applications. This is
 * particularly useful for video calls, allowing users to monitor the call
 * while working in other apps.
 *
 * @example
 * ```typescript
 * import { ref } from 'vue'
 * import { usePictureInPicture } from 'vuesip'
 *
 * const videoRef = ref<HTMLVideoElement | null>(null)
 *
 * const {
 *   isPiPSupported,
 *   isPiPActive,
 *   pipWindow,
 *   enterPiP,
 *   exitPiP,
 *   togglePiP,
 *   error
 * } = usePictureInPicture(videoRef)
 *
 * // Check support before showing PiP controls
 * if (isPiPSupported.value) {
 *   await enterPiP()
 * }
 * ```
 *
 * @param videoRef - Ref to the HTMLVideoElement to use for PiP
 * @param options - Configuration options
 * @returns PiP controls and state
 */
export function usePictureInPicture(
  videoRef: Ref<HTMLVideoElement | null>,
  options: PictureInPictureOptions = {}
): UsePictureInPictureReturn {
  const { persistPreference = false, preferenceKey = 'vuesip-pip-preference' } = options

  // State
  const isPiPSupported = ref(checkPiPSupport())
  const isPiPActive = ref(false)
  const pipWindow = shallowRef<PictureInPictureWindow | null>(null)
  const error = ref<Error | null>(null)

  /**
   * Check if Picture-in-Picture is supported
   */
  function checkPiPSupport(): boolean {
    return (
      typeof document !== 'undefined' &&
      'pictureInPictureEnabled' in document &&
      document.pictureInPictureEnabled === true
    )
  }

  /**
   * Load persisted preference from localStorage
   */
  function loadPreference(): boolean | null {
    if (!persistPreference || typeof localStorage === 'undefined') return null
    try {
      const stored = localStorage.getItem(preferenceKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  /**
   * Save preference to localStorage
   */
  function savePreference(value: boolean): void {
    if (!persistPreference || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(value))
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Enter Picture-in-Picture mode
   */
  async function enterPiP(): Promise<void> {
    error.value = null

    if (!isPiPSupported.value) {
      error.value = new Error('Picture-in-Picture is not supported in this browser')
      return
    }

    const video = videoRef.value
    if (!video) {
      error.value = new Error('Video element not found')
      return
    }

    // Check if video element supports PiP
    if ('disablePictureInPicture' in video && video.disablePictureInPicture) {
      error.value = new Error('Picture-in-Picture is disabled for this video')
      return
    }

    try {
      // Request Picture-in-Picture
      const pipWin = await video.requestPictureInPicture()
      pipWindow.value = pipWin
      isPiPActive.value = true
      savePreference(true)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to enter Picture-in-Picture mode')
    }
  }

  /**
   * Exit Picture-in-Picture mode
   */
  async function exitPiP(): Promise<void> {
    error.value = null

    if (!document.pictureInPictureElement) {
      isPiPActive.value = false
      pipWindow.value = null
      return
    }

    try {
      await document.exitPictureInPicture()
      isPiPActive.value = false
      pipWindow.value = null
      savePreference(false)
    } catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to exit Picture-in-Picture mode')
    }
  }

  /**
   * Toggle Picture-in-Picture mode
   */
  async function togglePiP(): Promise<void> {
    if (isPiPActive.value) {
      await exitPiP()
    } else {
      await enterPiP()
    }
  }

  /**
   * Handle PiP events on the video element
   */
  function setupEventListeners(video: HTMLVideoElement): () => void {
    const handleEnterPiP = (event: Event) => {
      const pipEvent = event as PictureInPictureEvent
      pipWindow.value = pipEvent.pictureInPictureWindow
      isPiPActive.value = true
    }

    const handleLeavePiP = () => {
      pipWindow.value = null
      isPiPActive.value = false
    }

    video.addEventListener('enterpictureinpicture', handleEnterPiP)
    video.addEventListener('leavepictureinpicture', handleLeavePiP)

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP)
      video.removeEventListener('leavepictureinpicture', handleLeavePiP)
    }
  }

  // Track cleanup functions
  let cleanup: (() => void) | null = null

  // Watch for video element changes
  watch(
    videoRef,
    (video, _, onCleanup) => {
      if (cleanup) {
        cleanup()
        cleanup = null
      }

      if (video) {
        cleanup = setupEventListeners(video)
        onCleanup(() => {
          if (cleanup) {
            cleanup()
            cleanup = null
          }
        })

        // Check if video is already in PiP (e.g., page refresh)
        if (document.pictureInPictureElement === video) {
          isPiPActive.value = true
        }

        // Auto-enter PiP if preference was saved
        const savedPreference = loadPreference()
        if (savedPreference === true && video.readyState >= 1) {
          // Small delay to ensure video is ready
          setTimeout(() => enterPiP(), 100)
        }
      }
    },
    { immediate: true }
  )

  // Cleanup on unmount
  onUnmounted(() => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
  })

  return {
    isPiPSupported,
    isPiPActive,
    pipWindow,
    enterPiP,
    exitPiP,
    togglePiP,
    error,
  }
}

// Type augmentation for PictureInPictureEvent
interface PictureInPictureEvent extends Event {
  pictureInPictureWindow: PictureInPictureWindow
}
