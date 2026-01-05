import { ref, computed, watch, onUnmounted, type Ref, type CSSProperties } from 'vue'

/**
 * Position options for the inset video
 */
export type InsetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Size presets for the inset video
 */
export type InsetSize = 'small' | 'medium' | 'large' | 'custom'

/**
 * Options for the useVideoInset composable
 */
export interface VideoInsetOptions {
  /**
   * Initial position of the inset video
   * @default 'bottom-right'
   */
  initialPosition?: InsetPosition

  /**
   * Initial size preset
   * @default 'medium'
   */
  initialSize?: InsetSize

  /**
   * Custom width in pixels (used when size is 'custom')
   * @default 160
   */
  customWidth?: number

  /**
   * Custom height in pixels (used when size is 'custom')
   * @default 120
   */
  customHeight?: number

  /**
   * Margin from container edges in pixels
   * @default 16
   */
  margin?: number

  /**
   * Border radius in pixels
   * @default 8
   */
  borderRadius?: number

  /**
   * Whether the inset can be dragged
   * @default true
   */
  draggable?: boolean

  /**
   * Whether to show the inset initially
   * @default true
   */
  showInitially?: boolean

  /**
   * Persist position/size to localStorage
   * @default false
   */
  persistPreference?: boolean

  /**
   * Key for localStorage persistence
   * @default 'vuesip-video-inset'
   */
  preferenceKey?: string
}

/**
 * Inset dimensions
 */
export interface InsetDimensions {
  width: number
  height: number
}

/**
 * Return type for the useVideoInset composable
 */
export interface UseVideoInsetReturn {
  /** Whether inset is currently visible */
  isVisible: Ref<boolean>
  /** Current position of the inset */
  position: Ref<InsetPosition>
  /** Current size preset */
  size: Ref<InsetSize>
  /** Current dimensions in pixels */
  dimensions: Ref<InsetDimensions>
  /** Whether videos are swapped (local is main, remote is inset) */
  isSwapped: Ref<boolean>
  /** Whether dragging is enabled */
  isDraggable: Ref<boolean>
  /** Whether currently being dragged */
  isDragging: Ref<boolean>
  /** Computed CSS styles for the inset container */
  insetStyles: Ref<CSSProperties>
  /** Show the inset */
  show: () => void
  /** Hide the inset */
  hide: () => void
  /** Toggle inset visibility */
  toggle: () => void
  /** Set position */
  setPosition: (pos: InsetPosition) => void
  /** Set size preset */
  setSize: (size: InsetSize) => void
  /** Set custom dimensions */
  setCustomDimensions: (width: number, height: number) => void
  /** Swap main and inset videos */
  swapVideos: () => void
  /** Cycle through positions */
  cyclePosition: () => void
  /** Reset to initial settings */
  reset: () => void
}

/**
 * Size presets in pixels
 */
const SIZE_PRESETS: Record<Exclude<InsetSize, 'custom'>, InsetDimensions> = {
  small: { width: 120, height: 90 },
  medium: { width: 160, height: 120 },
  large: { width: 240, height: 180 },
}

/**
 * Position cycle order
 */
const POSITION_CYCLE: InsetPosition[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right']

/**
 * Composable for managing picture-in-picture style video inset layouts
 *
 * @description
 * The Video Inset composable provides a local camera overlay on a remote video stream,
 * commonly used in video calls to show both participants. This creates the classic
 * "picture-in-picture" inset layout within your application.
 *
 * Features:
 * - Position control (four corners)
 * - Size presets (small, medium, large) or custom dimensions
 * - Video swap (switch which video is main vs inset)
 * - Optional dragging support
 * - Preference persistence
 *
 * @example
 * ```vue
 * <template>
 *   <div class="video-container">
 *     <video ref="mainVideo" :srcObject="isSwapped ? localStream : remoteStream" />
 *     <div v-if="isVisible" :style="insetStyles" class="inset-video">
 *       <video ref="insetVideo" :srcObject="isSwapped ? remoteStream : localStream" />
 *       <button @click="swapVideos">Swap</button>
 *       <button @click="cyclePosition">Move</button>
 *     </div>
 *   </div>
 * </template>
 *
 * <script setup>
 * import { useVideoInset } from 'vuesip'
 *
 * const {
 *   isVisible,
 *   isSwapped,
 *   insetStyles,
 *   swapVideos,
 *   cyclePosition,
 *   toggle
 * } = useVideoInset()
 * </script>
 * ```
 *
 * @param options - Configuration options
 * @returns Video inset controls and state
 */
export function useVideoInset(options: VideoInsetOptions = {}): UseVideoInsetReturn {
  const {
    initialPosition = 'bottom-right',
    initialSize = 'medium',
    customWidth = 160,
    customHeight = 120,
    margin = 16,
    borderRadius = 8,
    draggable = true,
    showInitially = true,
    persistPreference = false,
    preferenceKey = 'vuesip-video-inset',
  } = options

  // State
  const isVisible = ref(showInitially)
  const position = ref<InsetPosition>(initialPosition)
  const size = ref<InsetSize>(initialSize)
  const customDimensions = ref<InsetDimensions>({ width: customWidth, height: customHeight })
  const isSwapped = ref(false)
  const isDraggable = ref(draggable)
  const isDragging = ref(false)

  // Computed dimensions based on size preset
  const dimensions = computed<InsetDimensions>(() => {
    if (size.value === 'custom') {
      return customDimensions.value
    }
    return SIZE_PRESETS[size.value]
  })

  // Computed CSS styles for the inset
  const insetStyles = computed<CSSProperties>(() => {
    const styles: CSSProperties = {
      position: 'absolute',
      width: `${dimensions.value.width}px`,
      height: `${dimensions.value.height}px`,
      borderRadius: `${borderRadius}px`,
      overflow: 'hidden',
      zIndex: 10,
      transition: isDragging.value ? 'none' : 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      cursor: isDraggable.value ? 'move' : 'default',
    }

    // Position-based styles
    switch (position.value) {
      case 'top-left':
        styles.top = `${margin}px`
        styles.left = `${margin}px`
        break
      case 'top-right':
        styles.top = `${margin}px`
        styles.right = `${margin}px`
        break
      case 'bottom-left':
        styles.bottom = `${margin}px`
        styles.left = `${margin}px`
        break
      case 'bottom-right':
      default:
        styles.bottom = `${margin}px`
        styles.right = `${margin}px`
        break
    }

    return styles
  })

  /**
   * Load persisted preferences
   */
  function loadPreferences(): void {
    if (!persistPreference || typeof localStorage === 'undefined') return
    try {
      const stored = localStorage.getItem(preferenceKey)
      if (stored) {
        const prefs = JSON.parse(stored)
        if (prefs.position) position.value = prefs.position
        if (prefs.size) size.value = prefs.size
        if (prefs.customDimensions) customDimensions.value = prefs.customDimensions
        if (typeof prefs.isVisible === 'boolean') isVisible.value = prefs.isVisible
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences(): void {
    if (!persistPreference || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify({
          position: position.value,
          size: size.value,
          customDimensions: customDimensions.value,
          isVisible: isVisible.value,
        })
      )
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Show the inset
   */
  function show(): void {
    isVisible.value = true
    savePreferences()
  }

  /**
   * Hide the inset
   */
  function hide(): void {
    isVisible.value = false
    savePreferences()
  }

  /**
   * Toggle inset visibility
   */
  function toggle(): void {
    isVisible.value = !isVisible.value
    savePreferences()
  }

  /**
   * Set position
   */
  function setPosition(pos: InsetPosition): void {
    position.value = pos
    savePreferences()
  }

  /**
   * Set size preset
   */
  function setSize(newSize: InsetSize): void {
    size.value = newSize
    savePreferences()
  }

  /**
   * Set custom dimensions
   */
  function setCustomDimensions(width: number, height: number): void {
    customDimensions.value = { width, height }
    size.value = 'custom'
    savePreferences()
  }

  /**
   * Swap main and inset videos
   */
  function swapVideos(): void {
    isSwapped.value = !isSwapped.value
  }

  /**
   * Cycle through positions
   */
  function cyclePosition(): void {
    const currentIndex = POSITION_CYCLE.indexOf(position.value)
    const nextIndex = (currentIndex + 1) % POSITION_CYCLE.length
    position.value = POSITION_CYCLE[nextIndex]
    savePreferences()
  }

  /**
   * Reset to initial settings
   */
  function reset(): void {
    isVisible.value = showInitially
    position.value = initialPosition
    size.value = initialSize
    customDimensions.value = { width: customWidth, height: customHeight }
    isSwapped.value = false
    savePreferences()
  }

  // Load preferences on mount
  loadPreferences()

  // Watch for changes and persist
  if (persistPreference) {
    watch([position, size, customDimensions, isVisible], () => {
      savePreferences()
    })
  }

  return {
    isVisible,
    position,
    size,
    dimensions: computed(() => dimensions.value),
    isSwapped,
    isDraggable,
    isDragging,
    insetStyles: computed(() => insetStyles.value),
    show,
    hide,
    toggle,
    setPosition,
    setSize,
    setCustomDimensions,
    swapVideos,
    cyclePosition,
    reset,
  }
}
