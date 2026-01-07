import { ref, computed, onUnmounted, type Ref, type ComputedRef, type CSSProperties } from 'vue'
import type {
  RecordingIndicatorState,
  RecordingIndicatorColors,
  RecordingIndicatorOptions,
  UseRecordingIndicatorReturn,
} from '../types/recording-indicator.types'

/**
 * Default color configuration
 */
const DEFAULT_COLORS: RecordingIndicatorColors = {
  recording: '#ef4444', // Tailwind red-500
  paused: '#eab308', // Tailwind yellow-500
  inactive: '#6b7280', // Tailwind gray-500
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<RecordingIndicatorOptions, 'colors'>> = {
  blinkInterval: 500,
  showDuration: true,
  initialState: 'inactive',
}

/**
 * Format milliseconds to MM:SS or HH:MM:SS
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

/**
 * Vue composable for recording status indicators
 *
 * Provides visual UI indicators for recording status including:
 * - Blinking animation when recording
 * - Duration tracking and formatting
 * - Color-coded status (red = recording, yellow = paused, gray = inactive)
 * - Customizable blink interval and colors
 *
 * @param options - Configuration options
 * @returns Recording indicator controls and reactive state
 *
 * @example
 * ```vue
 * <script setup>
 * import { useRecordingIndicator } from '@vuesip/composables'
 *
 * const {
 *   state,
 *   isRecording,
 *   duration,
 *   formattedDuration,
 *   indicatorStyle,
 *   setRecordingState
 * } = useRecordingIndicator()
 *
 * // Start recording
 * setRecordingState('recording')
 * </script>
 *
 * <template>
 *   <div :style="indicatorStyle" class="w-4 h-4 rounded-full" />
 *   <span>{{ formattedDuration }}</span>
 * </template>
 * ```
 */
export function useRecordingIndicator(
  options: RecordingIndicatorOptions = {}
): UseRecordingIndicatorReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const colors = { ...DEFAULT_COLORS, ...options.colors }

  // Reactive state
  const state: Ref<RecordingIndicatorState> = ref(opts.initialState)
  const duration: Ref<number> = ref(0)
  const blinkState: Ref<boolean> = ref(true)

  // Internal state
  let durationInterval: ReturnType<typeof setInterval> | null = null
  let blinkInterval: ReturnType<typeof setInterval> | null = null
  let durationStartTime = 0
  let pausedAt = 0

  // Computed properties
  const isRecording: ComputedRef<boolean> = computed(() => state.value === 'recording')
  const isPaused: ComputedRef<boolean> = computed(() => state.value === 'paused')

  const formattedDuration: ComputedRef<string> = computed(() => formatDuration(duration.value))

  const indicatorStyle: ComputedRef<CSSProperties> = computed(() => {
    let backgroundColor: string

    switch (state.value) {
      case 'recording':
        backgroundColor = colors.recording
        break
      case 'paused':
        backgroundColor = colors.paused
        break
      case 'inactive':
      case 'stopped':
      default:
        backgroundColor = colors.inactive
        break
    }

    return {
      backgroundColor,
      opacity: state.value === 'recording' && !blinkState.value ? 0 : 1,
      transition: 'opacity 0.2s ease-in-out',
    }
  })

  /**
   * Start duration tracking
   */
  function startDurationTracking(): void {
    if (durationInterval) return

    durationStartTime = Date.now() - duration.value
    durationInterval = setInterval(() => {
      duration.value = Date.now() - durationStartTime
    }, 100)
  }

  /**
   * Stop duration tracking
   */
  function stopDurationTracking(): void {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
  }

  /**
   * Start blink animation
   */
  function startBlinking(): void {
    if (blinkInterval) return

    blinkState.value = true
    blinkInterval = setInterval(() => {
      blinkState.value = !blinkState.value
    }, opts.blinkInterval)
  }

  /**
   * Stop blink animation
   */
  function stopBlinking(): void {
    if (blinkInterval) {
      clearInterval(blinkInterval)
      blinkInterval = null
    }
    blinkState.value = true // Reset to visible
  }

  /**
   * Set the recording state
   */
  function setRecordingState(newState: RecordingIndicatorState): void {
    const previousState = state.value
    state.value = newState

    // Handle state transitions
    if (newState === 'recording') {
      if (previousState === 'paused' && pausedAt > 0) {
        // Resuming from pause - adjust start time to exclude pause duration
        const pauseDuration = Date.now() - pausedAt
        durationStartTime += pauseDuration
        pausedAt = 0
      }
      startDurationTracking()
      startBlinking()
    } else if (newState === 'paused') {
      stopDurationTracking()
      stopBlinking()
      pausedAt = Date.now()
    } else if (newState === 'inactive' || newState === 'stopped') {
      stopDurationTracking()
      stopBlinking()
      pausedAt = 0
    }
  }

  /**
   * Reset to inactive state and clear duration
   */
  function reset(): void {
    stopDurationTracking()
    stopBlinking()
    state.value = 'inactive'
    duration.value = 0
    pausedAt = 0
    durationStartTime = 0
  }

  /**
   * Cleanup intervals
   */
  function cleanup(): void {
    stopDurationTracking()
    stopBlinking()
  }

  // Cleanup on component unmount
  onUnmounted(cleanup)

  return {
    state,
    isRecording,
    isPaused,
    duration,
    formattedDuration,
    blinkState,
    indicatorStyle,
    setRecordingState,
    reset,
    unmount: cleanup,
  }
}
