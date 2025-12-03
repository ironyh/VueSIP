/**
 * AMI Recording Types
 *
 * Type definitions for call recording management via AMI MixMonitor.
 * Note: These types are prefixed with "Ami" to avoid conflicts with
 * MediaRecorder-based recording types in media.types.ts
 *
 * @module types/recording
 */

/**
 * AMI Recording state enumeration
 */
export enum AmiRecordingState {
  /** Not recording */
  Idle = 'idle',
  /** Recording in progress */
  Recording = 'recording',
  /** Recording paused */
  Paused = 'paused',
  /** Recording stopped */
  Stopped = 'stopped',
  /** Recording failed */
  Failed = 'failed',
}

/**
 * AMI Recording format options
 */
export type AmiRecordingFormat = 'wav' | 'wav49' | 'gsm' | 'ulaw' | 'alaw' | 'sln' | 'g722' | 'siren7' | 'siren14'

/**
 * AMI Recording mix mode - which audio streams to record
 */
export type AmiRecordingMixMode =
  | 'both' // Both directions (default)
  | 'read' // Incoming audio only (what the caller hears)
  | 'write' // Outgoing audio only (what the caller says)

/**
 * AMI Recording options for MixMonitor
 */
export interface AmiRecordingOptions {
  /** Recording file format (default: 'wav') */
  format?: AmiRecordingFormat

  /** File path/name (without extension). If not provided, auto-generated */
  filename?: string

  /** Directory to store recordings (default: Asterisk's monitor directory) */
  directory?: string

  /** Mix mode - which audio to record (default: 'both') */
  mixMode?: AmiRecordingMixMode

  /** Whether to append to existing file (default: false) */
  append?: boolean

  /** Post-recording command to execute */
  postCommand?: string

  /** Volume adjustment for read direction (-4 to 4) */
  readVolume?: number

  /** Volume adjustment for write direction (-4 to 4) */
  writeVolume?: number

  /** DTMF to toggle recording on/off (e.g., '#') */
  toggleDtmf?: string

  /** DTMF to pause/resume recording (e.g., '*') */
  pauseDtmf?: string

  /** Custom MixMonitor options string */
  customOptions?: string
}

/**
 * Active AMI recording session information
 */
export interface AmiRecordingSession {
  /** Unique recording ID */
  id: string

  /** Channel being recorded */
  channel: string

  /** Recording file path (full path with extension) */
  filePath: string

  /** Recording filename (without path) */
  filename: string

  /** Current recording state */
  state: AmiRecordingState

  /** Recording start time */
  startedAt: Date

  /** Recording pause time (if paused) */
  pausedAt?: Date

  /** Total pause duration in milliseconds */
  totalPauseDuration: number

  /** Recording duration in seconds (excluding pauses) */
  duration: number

  /** Recording format */
  format: AmiRecordingFormat

  /** Mix mode */
  mixMode: AmiRecordingMixMode

  /** File size in bytes (if available) */
  fileSize?: number

  /** AMI server ID (for multi-server setups) */
  serverId?: number

  /** Associated call unique ID */
  callUniqueId?: string

  /** Recording options used */
  options?: AmiRecordingOptions
}

/**
 * Completed AMI recording metadata
 */
export interface AmiRecordingMetadata {
  /** Unique recording ID */
  id: string

  /** Recording filename */
  filename: string

  /** Full file path */
  filePath: string

  /** Recording format */
  format: AmiRecordingFormat

  /** Recording duration in seconds */
  duration: number

  /** File size in bytes */
  fileSize: number

  /** Recording start time */
  startedAt: Date

  /** Recording end time */
  endedAt: Date

  /** Channel that was recorded */
  channel: string

  /** Call unique ID */
  callUniqueId?: string

  /** Caller ID number */
  callerIdNum?: string

  /** Caller ID name */
  callerIdName?: string

  /** Called number */
  calledNum?: string

  /** Recording quality indicator (if available) */
  quality?: 'good' | 'fair' | 'poor'

  /** Custom tags for organization */
  tags?: string[]

  /** AMI server ID */
  serverId?: number
}

/**
 * AMI Recording list filter options
 */
export interface AmiRecordingFilter {
  /** Filter by channel pattern */
  channel?: string

  /** Filter by caller ID number */
  callerIdNum?: string

  /** Filter by date range - start */
  startDate?: Date

  /** Filter by date range - end */
  endDate?: Date

  /** Minimum duration in seconds */
  minDuration?: number

  /** Maximum duration in seconds */
  maxDuration?: number

  /** Filter by tags */
  tags?: string[]

  /** Filter by format */
  format?: AmiRecordingFormat

  /** Limit number of results */
  limit?: number

  /** Offset for pagination */
  offset?: number

  /** Sort field */
  sortBy?: 'startedAt' | 'duration' | 'fileSize' | 'filename'

  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}

/**
 * AMI Recording event types
 */
export type AmiRecordingEventType =
  | 'started'
  | 'stopped'
  | 'paused'
  | 'resumed'
  | 'failed'
  | 'completed'

/**
 * AMI Recording event payload
 */
export interface AmiRecordingEvent {
  /** Event type */
  type: AmiRecordingEventType

  /** Recording session */
  recording: AmiRecordingSession

  /** Error message (for 'failed' events) */
  error?: string

  /** Event timestamp */
  timestamp: Date
}

/**
 * AMI Recording statistics
 */
export interface AmiRecordingStats {
  /** Total number of recordings */
  totalRecordings: number

  /** Total duration of all recordings in seconds */
  totalDuration: number

  /** Total file size in bytes */
  totalSize: number

  /** Average recording duration in seconds */
  averageDuration: number

  /** Recordings by format */
  byFormat: Record<AmiRecordingFormat, number>

  /** Recordings today */
  recordingsToday: number

  /** Duration today in seconds */
  durationToday: number
}

/**
 * Options for useAmiRecording composable
 */
export interface UseAmiRecordingOptions {
  /** Default recording format (default: 'wav') */
  defaultFormat?: AmiRecordingFormat

  /** Default mix mode (default: 'both') */
  defaultMixMode?: AmiRecordingMixMode

  /** Default recording directory */
  defaultDirectory?: string

  /** Auto-start recording on call connect */
  autoRecord?: boolean

  /** Auto-stop recording on call disconnect */
  autoStop?: boolean

  /** Enable real-time duration updates */
  trackDuration?: boolean

  /** Duration update interval in ms (default: 1000) */
  durationInterval?: number

  /** Callback when recording starts */
  onRecordingStart?: (recording: AmiRecordingSession) => void

  /** Callback when recording stops */
  onRecordingStop?: (recording: AmiRecordingSession) => void

  /** Callback when recording is paused */
  onRecordingPause?: (recording: AmiRecordingSession) => void

  /** Callback when recording is resumed */
  onRecordingResume?: (recording: AmiRecordingSession) => void

  /** Callback when recording fails */
  onRecordingError?: (recording: AmiRecordingSession, error: string) => void

  /** Transform recording data */
  transformRecording?: (recording: AmiRecordingSession) => AmiRecordingSession
}

/**
 * Return type for useAmiRecording composable
 */
export interface UseAmiRecordingReturn {
  // State
  /** Map of active recording sessions by channel */
  recordings: import('vue').Ref<Map<string, AmiRecordingSession>>

  /** Currently selected/focused recording */
  currentRecording: import('vue').ComputedRef<AmiRecordingSession | null>

  /** Whether any recording is active */
  isRecording: import('vue').ComputedRef<boolean>

  /** Total number of active recordings */
  activeCount: import('vue').ComputedRef<number>

  /** Loading state */
  isLoading: import('vue').Ref<boolean>

  /** Error message */
  error: import('vue').Ref<string | null>

  // Methods
  /** Start recording a channel */
  startRecording: (channel: string, options?: AmiRecordingOptions) => Promise<AmiRecordingSession>

  /** Stop recording a channel */
  stopRecording: (channel: string) => Promise<void>

  /** Pause recording on a channel */
  pauseRecording: (channel: string) => Promise<void>

  /** Resume recording on a channel */
  resumeRecording: (channel: string) => Promise<void>

  /** Toggle recording state (start/stop) */
  toggleRecording: (channel: string, options?: AmiRecordingOptions) => Promise<void>

  /** Toggle pause state */
  togglePause: (channel: string) => Promise<void>

  /** Get recording session for a channel */
  getRecording: (channel: string) => AmiRecordingSession | undefined

  /** Check if channel is being recorded */
  isChannelRecording: (channel: string) => boolean

  /** Listen for recording events */
  onRecordingEvent: (callback: (event: AmiRecordingEvent) => void) => () => void

  /** Get recording statistics */
  getStats: () => AmiRecordingStats

  /** Clear all recordings state */
  clearRecordings: () => void

  /** Generate recording filename */
  generateFilename: (channel: string, options?: { prefix?: string; timestamp?: boolean }) => string
}

/**
 * MixMonitor AMI action options (internal)
 */
export interface MixMonitorActionOptions {
  Channel: string
  File: string
  options?: string
  Command?: string
}

/**
 * StopMixMonitor AMI action options (internal)
 */
export interface StopMixMonitorActionOptions {
  Channel: string
}

/**
 * PauseMixMonitor AMI action options (internal)
 */
export interface PauseMixMonitorActionOptions {
  Channel: string
  State?: 'on' | 'off' // on = pause, off = resume
}
