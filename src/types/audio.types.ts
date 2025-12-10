/**
 * Audio Types for VueSIP
 * Comprehensive type definitions for audio handling
 */

/**
 * Audio device information
 */
export interface AudioDevice {
  /** Unique device identifier */
  deviceId: string;
  /** Human-readable device label */
  label: string;
  /** Device kind (audioinput, audiooutput, videoinput) */
  kind: MediaDeviceKind;
  /** Group identifier for related devices */
  groupId?: string;
}

/**
 * Audio constraints for media stream configuration
 */
export interface AudioConstraints {
  /** Enable echo cancellation */
  echoCancellation?: boolean;
  /** Enable noise suppression */
  noiseSuppression?: boolean;
  /** Enable automatic gain control */
  autoGainControl?: boolean;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Sample size in bits */
  sampleSize?: number;
  /** Number of audio channels */
  channelCount?: number;
  /** Audio latency hint */
  latency?: number | 'interactive' | 'balanced' | 'playback';
  /** Specific device ID to use */
  deviceId?: string | { exact: string } | { ideal: string };
}

/**
 * Audio quality levels
 */
export enum AudioQualityLevel {
  EXCELLENT = 'excellent', // MOS >= 4.3
  GOOD = 'good',          // MOS >= 4.0
  FAIR = 'fair',          // MOS >= 3.6
  POOR = 'poor'           // MOS < 3.6
}

/**
 * Audio quality metrics
 */
export interface AudioMetrics {
  /** Mean Opinion Score (1-5) */
  mos: number;
  /** Packet loss percentage (0-100) */
  packetLoss: number;
  /** Network jitter in milliseconds */
  jitter: number;
  /** Audio bitrate in kbps */
  bitrate: number;
  /** Current quality level */
  quality: AudioQualityLevel;
  /** Round-trip time in milliseconds */
  rtt?: number;
  /** Audio codec being used */
  codec?: string;
  /** Timestamp of metrics collection */
  timestamp: number;
}

/**
 * Volume control settings
 */
export interface VolumeControl {
  /** Input (microphone) volume level (0-100) */
  input: number;
  /** Output (speaker) volume level (0-100) */
  output: number;
  /** Input gain in decibels */
  inputGain?: number;
  /** Output gain in decibels */
  outputGain?: number;
  /** Enable volume normalization */
  normalization: boolean;
  /** Mute state */
  muted: boolean;
}

/**
 * Audio processing options
 */
export interface AudioProcessingOptions {
  /** Enable noise suppression */
  noiseSuppression: boolean;
  /** Enable echo cancellation */
  echoCancellation: boolean;
  /** Enable automatic gain control */
  autoGainControl: boolean;
  /** Enable voice activity detection */
  voiceActivityDetection?: boolean;
  /** Noise suppression level (0-1) */
  noiseSuppressionLevel?: number;
}

/**
 * Audio stream configuration
 */
export interface AudioStreamConfig {
  /** Audio constraints */
  constraints: AudioConstraints;
  /** Processing options */
  processing: AudioProcessingOptions;
  /** Volume control */
  volume: VolumeControl;
  /** Preferred device ID */
  deviceId?: string;
}

/**
 * Audio device change event
 */
export interface AudioDeviceChangeEvent {
  /** Event type */
  type: 'added' | 'removed' | 'changed';
  /** Affected device */
  device: AudioDevice;
  /** Timestamp of change */
  timestamp: number;
}

/**
 * Audio level information
 */
export interface AudioLevel {
  /** Current audio level (0-100) */
  level: number;
  /** Peak level in recent window (0-100) */
  peak: number;
  /** Average level in recent window (0-100) */
  average: number;
  /** Whether audio is clipping */
  clipping: boolean;
}

/**
 * Permission states for audio/video access
 */
export type AudioPermissionState = 'granted' | 'denied' | 'prompt';

/**
 * Audio device error types
 */
export enum AudioDeviceError {
  PERMISSION_DENIED = 'permission_denied',
  DEVICE_NOT_FOUND = 'device_not_found',
  DEVICE_IN_USE = 'device_in_use',
  CONSTRAINT_NOT_SATISFIED = 'constraint_not_satisfied',
  STREAM_ERROR = 'stream_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Audio manager configuration
 */
export interface AudioManagerConfig {
  /** Default audio constraints */
  defaultConstraints?: Partial<AudioConstraints>;
  /** Default processing options */
  defaultProcessing?: Partial<AudioProcessingOptions>;
  /** Default volume levels */
  defaultVolume?: Partial<VolumeControl>;
  /** Enable automatic device switching */
  autoSwitchDevices?: boolean;
  /** Metrics collection interval in ms */
  metricsInterval?: number;
}
