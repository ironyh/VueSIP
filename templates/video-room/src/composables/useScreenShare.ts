/**
 * Screen Share Composable
 *
 * Provides screen sharing functionality with support for different
 * capture modes (screen, window, tab) and automatic cleanup.
 */

import { ref, onUnmounted, type Ref } from 'vue'

/**
 * Screen share options
 */
export interface ScreenShareOptions {
  /** Preferred display surface type */
  displaySurface?: 'monitor' | 'window' | 'browser'
  /** Include system audio */
  audio?: boolean
  /** Video constraints */
  video?: MediaTrackConstraints
}

/**
 * Return type for useScreenShare composable
 */
export interface UseScreenShareReturn {
  /** Is currently sharing screen */
  isSharing: Ref<boolean>
  /** Current screen share stream */
  stream: Ref<MediaStream | null>
  /** Error message if sharing failed */
  error: Ref<string | null>

  /** Start screen sharing */
  startSharing: (options?: ScreenShareOptions) => Promise<void>
  /** Stop screen sharing */
  stopSharing: () => void
}

/**
 * Screen Share Composable
 *
 * Manages screen sharing with:
 * - Display media capture
 * - Automatic track ended detection
 * - Resource cleanup
 *
 * @returns Screen share state and control methods
 *
 * @example
 * ```typescript
 * const { isSharing, stream, startSharing, stopSharing } = useScreenShare()
 *
 * // Start sharing
 * await startSharing()
 *
 * // Stop sharing
 * stopSharing()
 * ```
 */
export function useScreenShare(): UseScreenShareReturn {
  // ============================================================================
  // State
  // ============================================================================

  const isSharing = ref(false)
  const stream = ref<MediaStream | null>(null)
  const error = ref<string | null>(null)

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Start screen sharing
   */
  async function startSharing(options: ScreenShareOptions = {}): Promise<void> {
    if (isSharing.value) {
      throw new Error('Already sharing screen')
    }

    error.value = null

    try {
      // Build display media constraints
      const constraints: DisplayMediaStreamOptions = {
        video: {
          displaySurface: options.displaySurface,
          ...options.video,
        },
        audio: options.audio ?? false,
      }

      // Request screen capture
      const mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints)

      // Listen for track ended (user clicks browser "Stop sharing" button)
      const videoTrack = mediaStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          stopSharing()
        })
      }

      stream.value = mediaStream
      isSharing.value = true
    } catch (err) {
      // Handle user cancellation gracefully
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          error.value = 'Screen sharing permission denied'
        } else if (err.name === 'NotFoundError') {
          error.value = 'No screen available for sharing'
        } else {
          error.value = err.message
        }
      }
      throw err
    }
  }

  /**
   * Stop screen sharing
   */
  function stopSharing(): void {
    if (stream.value) {
      stream.value.getTracks().forEach((track) => {
        track.stop()
      })
      stream.value = null
    }
    isSharing.value = false
    error.value = null
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  onUnmounted(() => {
    stopSharing()
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isSharing,
    stream,
    error,
    startSharing,
    stopSharing,
  }
}
