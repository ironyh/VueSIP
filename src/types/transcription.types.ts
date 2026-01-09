/**
 * Real-time transcription type definitions
 * @packageDocumentation
 */

import type { ComputedRef, Ref } from 'vue'

// =============================================================================
// Core Types
// =============================================================================

/**
 * Identifies the source of transcribed speech
 */
export type SpeakerType = 'local' | 'remote'

/**
 * Current state of the transcription system
 */
export type TranscriptionState = 'idle' | 'starting' | 'active' | 'stopping' | 'error'

/**
 * A single transcript entry representing finalized speech
 */
export interface TranscriptEntry {
  /** Unique identifier for this entry */
  id: string
  /** Unique participant identifier */
  participantId: string
  /** Display name of the speaker (if available) */
  participantName?: string
  /** Whether this is local or remote audio */
  speaker: SpeakerType
  /** The transcribed text */
  text: string
  /** Unix timestamp when speech started */
  timestamp: number
  /** Confidence score from provider (0-1) */
  confidence?: number
  /** Whether this is a final or interim result */
  isFinal: boolean
  /** Detected or configured language code */
  language?: string
  /** Word-level timestamps if supported by provider */
  words?: WordTimestamp[]
}

/**
 * Word-level timing information
 */
export interface WordTimestamp {
  word: string
  startTime: number
  endTime: number
  confidence?: number
}

// =============================================================================
// Participant Types
// =============================================================================

/**
 * Configuration for a participant's transcription
 */
export interface ParticipantConfig {
  /** Unique participant identifier */
  id: string
  /** Display name */
  name?: string
  /** Whether transcription is enabled for this participant */
  enabled: boolean
  /** Language code for this participant (overrides default) */
  language?: string
  /** Audio source for this participant */
  audioSource?: MediaStream | AudioNode
}

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Capabilities supported by a transcription provider
 */
export interface ProviderCapabilities {
  /** Supports real-time streaming transcription */
  streaming: boolean
  /** Provides interim results while speaking */
  interimResults: boolean
  /** Can auto-detect language */
  languageDetection: boolean
  /** Supports multiple audio channels */
  multiChannel: boolean
  /** Adds punctuation automatically */
  punctuation: boolean
  /** Can identify different speakers */
  speakerDiarization: boolean
  /** Provides word-level timestamps */
  wordTimestamps: boolean
  /** List of supported language codes */
  supportedLanguages: string[]
}

/**
 * Result from a transcription provider
 */
export interface TranscriptResult {
  text: string
  isFinal: boolean
  confidence?: number
  language?: string
  words?: WordTimestamp[]
}

/**
 * Audio source abstraction for providers
 */
export interface AudioSource {
  /** The media stream to transcribe */
  stream: MediaStream
  /** Identifier for this audio source */
  id: string
  /** Type of speaker */
  type: SpeakerType
}

/**
 * Provider-specific configuration options
 */
export interface ProviderOptions {
  /** API key (for cloud providers) */
  apiKey?: string
  /** Language code */
  language?: string
  /** Enable interim results */
  interimResults?: boolean
  /** Custom endpoint URL */
  endpoint?: string
  /** Additional provider-specific options */
  [key: string]: unknown
}

/**
 * Interface that all transcription providers must implement
 */
export interface TranscriptionProvider {
  /** Provider identifier */
  readonly name: string
  /** Provider capabilities */
  readonly capabilities: ProviderCapabilities

  /** Initialize the provider with options */
  initialize(options: ProviderOptions): Promise<void>
  /** Clean up provider resources */
  dispose(): void

  /** Start transcribing an audio source */
  startStream(audioSource: AudioSource): void
  /** Stop transcribing */
  stopStream(): void

  /** Register callback for interim results */
  onInterim(callback: (text: string, sourceId: string) => void): void
  /** Register callback for final results */
  onFinal(callback: (result: TranscriptResult, sourceId: string) => void): void
  /** Register callback for errors */
  onError(callback: (error: Error) => void): void

  /** Detect language from audio sample (optional) */
  detectLanguage?(audio: AudioBuffer): Promise<string>
  /** Get list of supported languages (optional) */
  getSupportedLanguages?(): string[]
}

// =============================================================================
// Keyword Detection Types
// =============================================================================

/**
 * Keyword or phrase to detect in transcripts
 */
export interface KeywordRule {
  /** Unique identifier for this rule */
  id: string
  /** Exact phrase or regex pattern to match */
  phrase: string | RegExp
  /** Action identifier to trigger on match */
  action: string
  /** Only match specific speakers */
  speakerFilter?: SpeakerType
  /** Case-sensitive matching (default: false) */
  caseSensitive?: boolean
}

/**
 * Result of a keyword match
 */
export interface KeywordMatch {
  /** The rule that matched */
  rule: KeywordRule
  /** The matched text */
  matchedText: string
  /** The full transcript entry containing the match */
  entry: TranscriptEntry
  /** Position of match in the text */
  position: { start: number; end: number }
}

// =============================================================================
// PII Redaction Types
// =============================================================================

/**
 * Types of PII that can be detected and redacted
 */
export type PIIType =
  | 'credit-card'
  | 'ssn'
  | 'phone-number'
  | 'email'
  | 'address'
  | 'name'
  | 'date-of-birth'
  | 'custom'

/**
 * Configuration for PII redaction
 */
export interface RedactionConfig {
  /** Enable PII redaction */
  enabled: boolean
  /** Types of PII to detect */
  patterns: PIIType[]
  /** Replacement text for redacted content */
  replacement?: string
  /** Custom regex patterns for 'custom' type */
  customPatterns?: RegExp[]
  /** Callback when PII is redacted */
  onRedacted?: (type: PIIType, original: string, entry: TranscriptEntry) => void
}

/**
 * Result of PII redaction
 */
export interface RedactionResult {
  /** Original text */
  original: string
  /** Redacted text */
  redacted: string
  /** Detected PII instances */
  detections: Array<{
    type: PIIType
    original: string
    position: { start: number; end: number }
  }>
}

// =============================================================================
// Export Types
// =============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'txt' | 'srt' | 'vtt' | 'csv'

/**
 * Options for transcript export
 */
export interface ExportOptions {
  /** Include timestamps */
  includeTimestamps?: boolean
  /** Include speaker names */
  includeSpeakers?: boolean
  /** Include confidence scores */
  includeConfidence?: boolean
  /** Filter by speaker type */
  speakerFilter?: SpeakerType
  /** Filter by time range */
  timeRange?: { start: number; end: number }
}

// =============================================================================
// Composable Options & Return Types
// =============================================================================

/**
 * Options for useTranscription composable
 */
export interface TranscriptionOptions {
  /** Provider to use (default: 'web-speech') */
  provider?: string
  /** Provider-specific options */
  providerOptions?: ProviderOptions
  /** Default language code */
  language?: string
  /** Enable auto language detection */
  autoDetectLanguage?: boolean
  /** Limit auto-detection to these languages */
  supportedLanguages?: string[]
  /** Enable local audio transcription */
  localEnabled?: boolean
  /** Enable remote audio transcription */
  remoteEnabled?: boolean
  /** Display name for local participant */
  localName?: string
  /** Display name for remote participant */
  remoteName?: string
  /** Keyword detection rules */
  keywords?: KeywordRule[]
  /** PII redaction configuration */
  redaction?: RedactionConfig
  /** Callback when transcript entry is added */
  onTranscript?: (entry: TranscriptEntry) => void
  /** Callback when keyword is detected */
  onKeywordDetected?: (match: KeywordMatch) => void
  /** Callback when language is detected */
  onLanguageDetected?: (language: string, participantId: string) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
}

/**
 * Return type for useTranscription composable
 */
export interface UseTranscriptionReturn {
  // State
  /** Current transcription state */
  state: ComputedRef<TranscriptionState>
  /** Whether transcription is active */
  isTranscribing: ComputedRef<boolean>
  /** Full transcript history */
  transcript: Ref<TranscriptEntry[]>
  /** Current interim text (not yet finalized) */
  currentUtterance: Ref<string>
  /** Last error that occurred */
  error: Ref<Error | null>

  // Participant management
  /** Map of participant configurations */
  participants: Ref<Map<string, ParticipantConfig>>
  /** Enable transcription for a participant */
  enableParticipant: (id: string) => void
  /** Disable transcription for a participant */
  disableParticipant: (id: string) => void
  /** Set language for a participant */
  setParticipantLanguage: (id: string, language: string) => void
  /** Set display name for a participant */
  setParticipantName: (id: string, name: string) => void

  // Controls
  /** Start transcription */
  start: () => Promise<void>
  /** Stop transcription */
  stop: () => void
  /** Clear transcript history */
  clear: () => void

  // Per-source toggles
  /** Enable/disable local audio transcription */
  localEnabled: Ref<boolean>
  /** Enable/disable remote audio transcription */
  remoteEnabled: Ref<boolean>

  // Language
  /** Detected language (if auto-detect enabled) */
  detectedLanguage: Ref<string | null>
  /** Lock language (stop auto-detection) */
  lockLanguage: (language: string) => void

  // Provider
  /** Current provider name */
  provider: ComputedRef<string>
  /** Switch to a different provider */
  switchProvider: (name: string, options?: ProviderOptions) => Promise<void>
  /** Get provider capabilities */
  getCapabilities: () => ProviderCapabilities | null

  // Keywords
  /** Add a keyword rule */
  addKeyword: (rule: Omit<KeywordRule, 'id'>) => string
  /** Remove a keyword rule */
  removeKeyword: (id: string) => void
  /** Get all keyword rules */
  getKeywords: () => KeywordRule[]

  // Export
  /** Export transcript in specified format */
  exportTranscript: (format: ExportFormat, options?: ExportOptions) => string
  /** Search transcript for text */
  searchTranscript: (query: string, options?: { speaker?: SpeakerType }) => TranscriptEntry[]

  // Events
  /** Register callback for new transcript entries */
  onTranscript: (callback: (entry: TranscriptEntry) => void) => () => void
  /** Register callback for keyword matches */
  onKeywordDetected: (callback: (match: KeywordMatch) => void) => () => void
}
