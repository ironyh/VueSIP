import type { RecordingState } from './media.types'

/**
 * Options for useLocalRecording composable
 */
export interface LocalRecordingOptions {
  /** MIME type for recording (default: 'audio/webm') */
  mimeType?: string
  /** Audio bits per second */
  audioBitsPerSecond?: number
  /** Video bits per second (if recording video) */
  videoBitsPerSecond?: number
  /** Time slice in ms for ondataavailable events (default: 1000) */
  timeslice?: number
  /** Enable IndexedDB persistence (default: false) */
  persist?: boolean
  /** IndexedDB database name (default: 'vuesip-recordings') */
  dbName?: string
  /** IndexedDB store name (default: 'recordings') */
  storeName?: string
  /** Auto-download on stop (default: false) */
  autoDownload?: boolean
  /** Filename prefix for downloads (default: 'recording') */
  filenamePrefix?: string
}

/**
 * Recorded data with metadata
 */
export interface LocalRecordingData {
  /** Unique recording ID */
  id: string
  /** Recording blob */
  blob: Blob
  /** MIME type */
  mimeType: string
  /** Recording start timestamp */
  startedAt: number
  /** Recording end timestamp */
  stoppedAt: number
  /** Duration in milliseconds */
  duration: number
  /** Object URL for playback (created on demand) */
  url?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Return type for useLocalRecording composable
 */
export interface UseLocalRecordingReturn {
  /** Current recording state */
  state: import('vue').Ref<RecordingState>
  /** Whether recording is active */
  isRecording: import('vue').ComputedRef<boolean>
  /** Whether recording is paused */
  isPaused: import('vue').ComputedRef<boolean>
  /** Current recording duration in ms */
  duration: import('vue').Ref<number>
  /** Recorded data after stop */
  recordingData: import('vue').Ref<LocalRecordingData | null>
  /** Error if any */
  error: import('vue').Ref<Error | null>
  /** Start recording with given stream */
  start: (stream: MediaStream, metadata?: Record<string, unknown>) => void
  /** Pause recording */
  pause: () => void
  /** Resume recording */
  resume: () => void
  /** Stop recording */
  stop: () => Promise<LocalRecordingData | null>
  /** Download recording */
  download: (filename?: string) => void
  /** Clear current recording data */
  clear: () => void
  /** Check if MIME type is supported */
  isSupported: (mimeType?: string) => boolean
}
