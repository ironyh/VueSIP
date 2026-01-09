/**
 * Real-time transcription module
 * @packageDocumentation
 */

// Re-export providers
export { ProviderRegistry, providerRegistry, WebSpeechProvider } from './providers'

// Re-export features
export { KeywordDetector, PIIRedactor, TranscriptExporter } from './features'

// Re-export types
export type {
  TranscriptionProvider,
  ProviderCapabilities,
  ProviderOptions,
  TranscriptEntry,
  TranscriptResult,
  KeywordRule,
  KeywordMatch,
  RedactionConfig,
  ExportFormat,
  ExportOptions,
  TranscriptionOptions,
  UseTranscriptionReturn,
} from '@/types/transcription.types'
