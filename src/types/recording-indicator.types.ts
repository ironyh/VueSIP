import type { Ref, ComputedRef, CSSProperties } from 'vue'

/**
 * Recording indicator state enumeration
 */
export type RecordingIndicatorState = 'inactive' | 'recording' | 'paused' | 'stopped'

/**
 * Recording indicator color configuration
 */
export interface RecordingIndicatorColors {
  /** Color when recording (default: red) */
  recording: string
  /** Color when paused (default: yellow) */
  paused: string
  /** Color when inactive (default: gray) */
  inactive: string
}

/**
 * Options for useRecordingIndicator composable
 */
export interface RecordingIndicatorOptions {
  /** Blink interval in milliseconds (default: 500ms) */
  blinkInterval?: number
  /** Custom colors for different states */
  colors?: Partial<RecordingIndicatorColors>
  /** Whether to show duration (default: true) */
  showDuration?: boolean
  /** Initial state (default: 'inactive') */
  initialState?: RecordingIndicatorState
}

/**
 * Return type for useRecordingIndicator composable
 */
export interface UseRecordingIndicatorReturn {
  /** Current recording indicator state */
  state: Ref<RecordingIndicatorState>
  /** Whether currently recording */
  isRecording: ComputedRef<boolean>
  /** Whether currently paused */
  isPaused: ComputedRef<boolean>
  /** Recording duration in milliseconds */
  duration: Ref<number>
  /** Formatted duration string (MM:SS or HH:MM:SS) */
  formattedDuration: ComputedRef<string>
  /** Blink animation state */
  blinkState: Ref<boolean>
  /** CSS styles for the indicator */
  indicatorStyle: ComputedRef<CSSProperties>
  /** Set the recording state */
  setRecordingState: (state: RecordingIndicatorState) => void
  /** Reset to inactive state and clear duration */
  reset: () => void
  /** Cleanup function for manual unmounting */
  unmount?: () => void
}
