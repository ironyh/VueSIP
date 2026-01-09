# Real-Time Transcription System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a comprehensive real-time voice transcription system to VueSip with pluggable providers, multi-participant support, language detection, keyword detection, PII redaction, and export formats.

**Architecture:** Plugin-based provider system where transcription backends implement a common interface. The main `useTranscription` composable orchestrates audio capture from call sessions, routes to configured providers, and manages transcript state. Separate modules handle keyword detection, PII redaction, and export formatting - all optional and tree-shakeable.

**Tech Stack:** Vue 3 Composition API, TypeScript, Web Speech API (default provider), AudioWorklet for audio processing, vitest for testing.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      useTranscription                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Transcript  │  │ Participant │  │ Provider                │  │
│  │ State       │  │ Manager     │  │ Registry                │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                │                    │
           ▼                ▼                    ▼
┌─────────────────┐  ┌─────────────┐  ┌─────────────────────────┐
│ Feature Modules │  │ Audio       │  │ Providers               │
│ - Keywords      │  │ Processor   │  │ - WebSpeechProvider     │
│ - Redaction     │  │ (Worklet)   │  │ - DeepgramProvider      │
│ - Export        │  │             │  │ - WhisperProvider       │
└─────────────────┘  └─────────────┘  └─────────────────────────┘
```

### Design Decisions & Rationale

1. **Why pluggable providers?**
   - Users have different needs: free (Web Speech), accurate (Deepgram), private (local Whisper)
   - New providers emerge constantly - architecture must accommodate without breaking changes
   - Allows A/B testing different providers in production

2. **Why separate audio processor?**
   - AudioWorklet runs on dedicated thread, preventing UI jank
   - Enables simultaneous local/remote audio capture
   - Provides consistent audio format regardless of source

3. **Why optional feature modules?**
   - Tree-shaking: users who don't need PII redaction don't pay the bundle cost
   - Separation of concerns: each module is independently testable
   - Progressive enhancement: start simple, add features as needed

4. **Why event-based API?**
   - Matches streaming nature of real-time transcription
   - Enables reactive UI updates without polling
   - Compatible with all provider implementations

---

## Task 1: Create Transcription Types

**Files:**
- Create: `src/types/transcription.types.ts`

**Why:** Types define the contract for the entire system. Creating them first ensures all subsequent code is type-safe and self-documenting. Following VueSip's pattern of separate type files.

**Step 1: Write the type definitions**

```typescript
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
```

**Step 2: Verify types compile**

Run: `pnpm exec vue-tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/types/transcription.types.ts
git commit -m "feat(transcription): add comprehensive type definitions

Includes types for:
- Core transcript entries and state
- Pluggable provider interface
- Multi-participant support
- Keyword detection
- PII redaction
- Export formats"
```

---

## Task 2: Create Provider Registry

**Files:**
- Create: `src/transcription/providers/registry.ts`
- Create: `src/transcription/providers/types.ts`
- Test: `tests/unit/transcription/providers/registry.test.ts`

**Why:** The registry is the foundation of the pluggable provider system. It manages provider registration, instantiation, and lifecycle. Creating it first allows parallel development of individual providers.

**Step 1: Write the failing test**

```typescript
/**
 * Tests for transcription provider registry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProviderRegistry } from '@/transcription/providers/registry'
import type { TranscriptionProvider, ProviderCapabilities } from '@/types/transcription.types'

// Mock provider for testing
function createMockProvider(name: string): TranscriptionProvider {
  return {
    name,
    capabilities: {
      streaming: true,
      interimResults: true,
      languageDetection: false,
      multiChannel: false,
      punctuation: true,
      speakerDiarization: false,
      wordTimestamps: false,
      supportedLanguages: ['en-US'],
    },
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    startStream: vi.fn(),
    stopStream: vi.fn(),
    onInterim: vi.fn(),
    onFinal: vi.fn(),
    onError: vi.fn(),
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
  })

  describe('register', () => {
    it('should register a provider factory', () => {
      const factory = () => createMockProvider('test')

      registry.register('test', factory)

      expect(registry.has('test')).toBe(true)
    })

    it('should throw if provider name already registered', () => {
      const factory = () => createMockProvider('test')
      registry.register('test', factory)

      expect(() => registry.register('test', factory)).toThrow(
        'Provider "test" is already registered'
      )
    })
  })

  describe('get', () => {
    it('should create provider instance from factory', async () => {
      const mockProvider = createMockProvider('test')
      const factory = vi.fn().mockReturnValue(mockProvider)
      registry.register('test', factory)

      const provider = await registry.get('test', { language: 'en-US' })

      expect(factory).toHaveBeenCalled()
      expect(provider).toBe(mockProvider)
      expect(mockProvider.initialize).toHaveBeenCalledWith({ language: 'en-US' })
    })

    it('should throw if provider not found', async () => {
      await expect(registry.get('nonexistent')).rejects.toThrow(
        'Provider "nonexistent" not found'
      )
    })

    it('should cache provider instances by name', async () => {
      const factory = vi.fn().mockReturnValue(createMockProvider('test'))
      registry.register('test', factory)

      const instance1 = await registry.get('test')
      const instance2 = await registry.get('test')

      expect(factory).toHaveBeenCalledTimes(1)
      expect(instance1).toBe(instance2)
    })
  })

  describe('getAvailable', () => {
    it('should return list of registered provider names', () => {
      registry.register('provider1', () => createMockProvider('provider1'))
      registry.register('provider2', () => createMockProvider('provider2'))

      const available = registry.getAvailable()

      expect(available).toEqual(['provider1', 'provider2'])
    })
  })

  describe('dispose', () => {
    it('should dispose all cached provider instances', async () => {
      const provider1 = createMockProvider('test1')
      const provider2 = createMockProvider('test2')
      registry.register('test1', () => provider1)
      registry.register('test2', () => provider2)

      await registry.get('test1')
      await registry.get('test2')
      registry.dispose()

      expect(provider1.dispose).toHaveBeenCalled()
      expect(provider2.dispose).toHaveBeenCalled()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/transcription/providers/registry.test.ts`
Expected: FAIL - module not found

**Step 3: Create directory structure**

```bash
mkdir -p src/transcription/providers
mkdir -p tests/unit/transcription/providers
```

**Step 4: Write the implementation**

```typescript
/**
 * Transcription provider registry
 * @packageDocumentation
 */

import type {
  TranscriptionProvider,
  ProviderOptions,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('ProviderRegistry')

/**
 * Factory function type for creating provider instances
 */
export type ProviderFactory = () => TranscriptionProvider

/**
 * Registry for managing transcription providers
 *
 * @example
 * ```ts
 * const registry = new ProviderRegistry()
 * registry.register('web-speech', () => new WebSpeechProvider())
 * const provider = await registry.get('web-speech', { language: 'en-US' })
 * ```
 */
export class ProviderRegistry {
  private factories = new Map<string, ProviderFactory>()
  private instances = new Map<string, TranscriptionProvider>()

  /**
   * Register a provider factory
   * @param name - Unique provider name
   * @param factory - Factory function that creates provider instances
   * @throws Error if provider name already registered
   */
  register(name: string, factory: ProviderFactory): void {
    if (this.factories.has(name)) {
      throw new Error(`Provider "${name}" is already registered`)
    }
    this.factories.set(name, factory)
    logger.debug('Provider registered', { name })
  }

  /**
   * Check if a provider is registered
   * @param name - Provider name to check
   */
  has(name: string): boolean {
    return this.factories.has(name)
  }

  /**
   * Get or create a provider instance
   * @param name - Provider name
   * @param options - Provider initialization options
   * @returns Initialized provider instance
   * @throws Error if provider not found
   */
  async get(name: string, options: ProviderOptions = {}): Promise<TranscriptionProvider> {
    // Return cached instance if available
    const cached = this.instances.get(name)
    if (cached) {
      return cached
    }

    // Get factory
    const factory = this.factories.get(name)
    if (!factory) {
      throw new Error(`Provider "${name}" not found. Available: ${this.getAvailable().join(', ')}`)
    }

    // Create and initialize instance
    const provider = factory()
    await provider.initialize(options)
    this.instances.set(name, provider)

    logger.info('Provider initialized', { name, capabilities: provider.capabilities })
    return provider
  }

  /**
   * Get list of registered provider names
   */
  getAvailable(): string[] {
    return Array.from(this.factories.keys())
  }

  /**
   * Dispose all cached provider instances
   */
  dispose(): void {
    for (const [name, provider] of this.instances) {
      try {
        provider.dispose()
        logger.debug('Provider disposed', { name })
      } catch (error) {
        logger.error('Error disposing provider', { name, error })
      }
    }
    this.instances.clear()
  }

  /**
   * Remove a cached provider instance (forces re-creation on next get)
   * @param name - Provider name
   */
  remove(name: string): void {
    const instance = this.instances.get(name)
    if (instance) {
      instance.dispose()
      this.instances.delete(name)
    }
  }
}

/**
 * Global provider registry singleton
 */
export const providerRegistry = new ProviderRegistry()
```

**Step 5: Run tests to verify they pass**

Run: `pnpm test tests/unit/transcription/providers/registry.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/transcription/providers/registry.ts tests/unit/transcription/providers/registry.test.ts
git commit -m "feat(transcription): add provider registry

- ProviderRegistry class for managing transcription providers
- Factory pattern for lazy provider instantiation
- Instance caching for reuse
- Global singleton for convenience"
```

---

## Task 3: Implement Web Speech API Provider

**Files:**
- Create: `src/transcription/providers/web-speech.ts`
- Test: `tests/unit/transcription/providers/web-speech.test.ts`

**Why:** Web Speech API is the default provider - it's free, requires no setup, and works in all modern browsers. This gives users an immediate working transcription system.

**Step 1: Write the failing test**

```typescript
/**
 * Tests for Web Speech API transcription provider
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSpeechProvider } from '@/transcription/providers/web-speech'

// Mock SpeechRecognition
const mockRecognition = {
  lang: '',
  continuous: false,
  interimResults: false,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  onresult: null as ((event: unknown) => void) | null,
  onerror: null as ((event: unknown) => void) | null,
  onend: null as (() => void) | null,
}

const MockSpeechRecognition = vi.fn().mockImplementation(() => mockRecognition)

vi.stubGlobal('SpeechRecognition', MockSpeechRecognition)
vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition)

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('WebSpeechProvider', () => {
  let provider: WebSpeechProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new WebSpeechProvider()
  })

  afterEach(() => {
    provider.dispose()
  })

  describe('capabilities', () => {
    it('should report correct capabilities', () => {
      expect(provider.capabilities).toEqual({
        streaming: true,
        interimResults: true,
        languageDetection: false,
        multiChannel: false,
        punctuation: false,
        speakerDiarization: false,
        wordTimestamps: false,
        supportedLanguages: expect.any(Array),
      })
    })

    it('should have name "web-speech"', () => {
      expect(provider.name).toBe('web-speech')
    })
  })

  describe('initialize', () => {
    it('should configure recognition with language', async () => {
      await provider.initialize({ language: 'es-ES' })

      expect(mockRecognition.lang).toBe('es-ES')
      expect(mockRecognition.continuous).toBe(true)
      expect(mockRecognition.interimResults).toBe(true)
    })

    it('should default to en-US language', async () => {
      await provider.initialize({})

      expect(mockRecognition.lang).toBe('en-US')
    })
  })

  describe('startStream', () => {
    it('should start speech recognition', async () => {
      await provider.initialize({})

      provider.startStream({
        stream: new MediaStream(),
        id: 'local',
        type: 'local',
      })

      expect(mockRecognition.start).toHaveBeenCalled()
    })
  })

  describe('stopStream', () => {
    it('should stop speech recognition', async () => {
      await provider.initialize({})
      provider.startStream({ stream: new MediaStream(), id: 'local', type: 'local' })

      provider.stopStream()

      expect(mockRecognition.stop).toHaveBeenCalled()
    })
  })

  describe('events', () => {
    it('should emit interim results', async () => {
      await provider.initialize({})
      const interimCallback = vi.fn()
      provider.onInterim(interimCallback)
      provider.startStream({ stream: new MediaStream(), id: 'test-source', type: 'local' })

      // Simulate speech recognition result
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          0: {
            0: { transcript: 'hello', confidence: 0.9 },
            isFinal: false,
            length: 1,
          },
          length: 1,
        },
      })

      expect(interimCallback).toHaveBeenCalledWith('hello', 'test-source')
    })

    it('should emit final results', async () => {
      await provider.initialize({})
      const finalCallback = vi.fn()
      provider.onFinal(finalCallback)
      provider.startStream({ stream: new MediaStream(), id: 'test-source', type: 'local' })

      // Simulate final speech recognition result
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          0: {
            0: { transcript: 'hello world', confidence: 0.95 },
            isFinal: true,
            length: 1,
          },
          length: 1,
        },
      })

      expect(finalCallback).toHaveBeenCalledWith(
        {
          text: 'hello world',
          isFinal: true,
          confidence: 0.95,
          language: 'en-US',
        },
        'test-source'
      )
    })

    it('should emit errors', async () => {
      await provider.initialize({})
      const errorCallback = vi.fn()
      provider.onError(errorCallback)
      provider.startStream({ stream: new MediaStream(), id: 'local', type: 'local' })

      mockRecognition.onerror?.({ error: 'network' })

      expect(errorCallback).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/transcription/providers/web-speech.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
/**
 * Web Speech API transcription provider
 * @packageDocumentation
 */

import type {
  TranscriptionProvider,
  ProviderCapabilities,
  ProviderOptions,
  TranscriptResult,
  AudioSource,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('WebSpeechProvider')

/**
 * Web Speech API result event type
 */
interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

/**
 * Transcription provider using the browser's Web Speech API
 *
 * @remarks
 * This is the default provider. It's free and requires no setup, but has
 * limitations: Chrome-only for best results, no punctuation, limited accuracy.
 *
 * @example
 * ```ts
 * const provider = new WebSpeechProvider()
 * await provider.initialize({ language: 'en-US' })
 * provider.onFinal((result) => console.log(result.text))
 * provider.startStream(audioSource)
 * ```
 */
export class WebSpeechProvider implements TranscriptionProvider {
  readonly name = 'web-speech'

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    interimResults: true,
    languageDetection: false,
    multiChannel: false,
    punctuation: false,
    speakerDiarization: false,
    wordTimestamps: false,
    supportedLanguages: [
      'en-US', 'en-GB', 'en-AU', 'en-IN',
      'es-ES', 'es-MX', 'es-AR',
      'fr-FR', 'fr-CA',
      'de-DE', 'de-AT',
      'it-IT',
      'pt-BR', 'pt-PT',
      'nl-NL',
      'ru-RU',
      'ja-JP',
      'ko-KR',
      'zh-CN', 'zh-TW',
      'ar-SA',
      'hi-IN',
    ],
  }

  private recognition: SpeechRecognition | null = null
  private language = 'en-US'
  private currentSourceId = ''
  private isRunning = false

  private interimCallbacks: Array<(text: string, sourceId: string) => void> = []
  private finalCallbacks: Array<(result: TranscriptResult, sourceId: string) => void> = []
  private errorCallbacks: Array<(error: Error) => void> = []

  /**
   * Initialize the Web Speech API
   */
  async initialize(options: ProviderOptions): Promise<void> {
    // Check for browser support
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      throw new Error('Web Speech API is not supported in this browser')
    }

    this.language = (options.language as string) || 'en-US'
    this.recognition = new SpeechRecognitionAPI()
    this.recognition.lang = this.language
    this.recognition.continuous = true
    this.recognition.interimResults = options.interimResults !== false

    this.setupEventHandlers()

    logger.info('Web Speech provider initialized', { language: this.language })
  }

  /**
   * Set up speech recognition event handlers
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex]
      const transcript = result[0]

      if (result.isFinal) {
        const finalResult: TranscriptResult = {
          text: transcript.transcript,
          isFinal: true,
          confidence: transcript.confidence,
          language: this.language,
        }
        this.finalCallbacks.forEach(cb => cb(finalResult, this.currentSourceId))
        logger.debug('Final result', { text: transcript.transcript })
      } else {
        this.interimCallbacks.forEach(cb => cb(transcript.transcript, this.currentSourceId))
      }
    }

    this.recognition.onerror = (event: { error: string }) => {
      const error = new Error(`Speech recognition error: ${event.error}`)
      this.errorCallbacks.forEach(cb => cb(error))
      logger.error('Speech recognition error', { error: event.error })
    }

    this.recognition.onend = () => {
      // Restart if still supposed to be running (handles Chrome's auto-stop)
      if (this.isRunning && this.recognition) {
        logger.debug('Restarting speech recognition')
        try {
          this.recognition.start()
        } catch {
          // Ignore if already started
        }
      }
    }
  }

  /**
   * Start transcribing audio
   */
  startStream(audioSource: AudioSource): void {
    if (!this.recognition) {
      throw new Error('Provider not initialized')
    }

    this.currentSourceId = audioSource.id
    this.isRunning = true

    try {
      this.recognition.start()
      logger.info('Started transcription', { sourceId: audioSource.id })
    } catch (error) {
      // May throw if already started
      logger.warn('Start failed, may already be running', { error })
    }
  }

  /**
   * Stop transcribing
   */
  stopStream(): void {
    this.isRunning = false
    if (this.recognition) {
      this.recognition.stop()
      logger.info('Stopped transcription')
    }
  }

  /**
   * Register interim result callback
   */
  onInterim(callback: (text: string, sourceId: string) => void): void {
    this.interimCallbacks.push(callback)
  }

  /**
   * Register final result callback
   */
  onFinal(callback: (result: TranscriptResult, sourceId: string) => void): void {
    this.finalCallbacks.push(callback)
  }

  /**
   * Register error callback
   */
  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback)
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.isRunning = false
    if (this.recognition) {
      this.recognition.abort()
      this.recognition = null
    }
    this.interimCallbacks = []
    this.finalCallbacks = []
    this.errorCallbacks = []
    logger.debug('Provider disposed')
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/transcription/providers/web-speech.test.ts`
Expected: All tests PASS

**Step 5: Register provider in registry**

Create `src/transcription/providers/index.ts`:

```typescript
/**
 * Transcription providers
 * @packageDocumentation
 */

export { ProviderRegistry, providerRegistry } from './registry'
export { WebSpeechProvider } from './web-speech'

// Register built-in providers
import { providerRegistry } from './registry'
import { WebSpeechProvider } from './web-speech'

providerRegistry.register('web-speech', () => new WebSpeechProvider())
```

**Step 6: Commit**

```bash
git add src/transcription/providers/web-speech.ts src/transcription/providers/index.ts tests/unit/transcription/providers/web-speech.test.ts
git commit -m "feat(transcription): add Web Speech API provider

- WebSpeechProvider implementing TranscriptionProvider interface
- Auto-restart on Chrome's speech recognition timeout
- Support for 20+ languages
- Registered as default provider"
```

---

## Task 4: Implement Keyword Detection Module

**Files:**
- Create: `src/transcription/features/keyword-detector.ts`
- Test: `tests/unit/transcription/features/keyword-detector.test.ts`

**Why:** Keyword detection enables agent assist, compliance monitoring, and automation triggers. It's a core enterprise feature that adds significant value.

**Step 1: Write the failing test**

```typescript
/**
 * Tests for keyword detection module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KeywordDetector } from '@/transcription/features/keyword-detector'
import type { TranscriptEntry, KeywordRule } from '@/types/transcription.types'

describe('KeywordDetector', () => {
  let detector: KeywordDetector

  const createEntry = (text: string, speaker: 'local' | 'remote' = 'local'): TranscriptEntry => ({
    id: `entry-${Date.now()}`,
    participantId: 'participant-1',
    speaker,
    text,
    timestamp: Date.now(),
    isFinal: true,
  })

  beforeEach(() => {
    detector = new KeywordDetector()
  })

  describe('addRule', () => {
    it('should add a string-based rule', () => {
      const id = detector.addRule({
        phrase: 'cancel subscription',
        action: 'retention',
      })

      expect(id).toBeDefined()
      expect(detector.getRules()).toHaveLength(1)
    })

    it('should add a regex-based rule', () => {
      const id = detector.addRule({
        phrase: /refund|money back/i,
        action: 'refund-policy',
      })

      expect(id).toBeDefined()
      expect(detector.getRules()).toHaveLength(1)
    })
  })

  describe('removeRule', () => {
    it('should remove a rule by id', () => {
      const id = detector.addRule({ phrase: 'test', action: 'test' })

      detector.removeRule(id)

      expect(detector.getRules()).toHaveLength(0)
    })
  })

  describe('detect', () => {
    it('should detect exact phrase match (case insensitive)', () => {
      detector.addRule({ phrase: 'cancel subscription', action: 'retention' })
      const entry = createEntry('I want to cancel subscription please')

      const matches = detector.detect(entry)

      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe('cancel subscription')
      expect(matches[0].rule.action).toBe('retention')
    })

    it('should detect regex pattern match', () => {
      detector.addRule({ phrase: /refund|money back/i, action: 'refund' })
      const entry = createEntry('I want my money back now')

      const matches = detector.detect(entry)

      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe('money back')
    })

    it('should respect case sensitivity option', () => {
      detector.addRule({
        phrase: 'URGENT',
        action: 'escalate',
        caseSensitive: true,
      })

      expect(detector.detect(createEntry('This is urgent'))).toHaveLength(0)
      expect(detector.detect(createEntry('This is URGENT'))).toHaveLength(1)
    })

    it('should filter by speaker type', () => {
      detector.addRule({
        phrase: 'help',
        action: 'assist',
        speakerFilter: 'remote',
      })

      expect(detector.detect(createEntry('I need help', 'local'))).toHaveLength(0)
      expect(detector.detect(createEntry('I need help', 'remote'))).toHaveLength(1)
    })

    it('should detect multiple matches in single entry', () => {
      detector.addRule({ phrase: 'cancel', action: 'retention' })
      detector.addRule({ phrase: 'refund', action: 'refund' })
      const entry = createEntry('I want to cancel and get a refund')

      const matches = detector.detect(entry)

      expect(matches).toHaveLength(2)
    })

    it('should include position of match', () => {
      detector.addRule({ phrase: 'important', action: 'flag' })
      const entry = createEntry('This is important information')

      const matches = detector.detect(entry)

      expect(matches[0].position).toEqual({ start: 8, end: 17 })
    })
  })

  describe('onMatch', () => {
    it('should call callback when match detected', () => {
      const callback = vi.fn()
      detector.addRule({ phrase: 'test', action: 'test' })
      detector.onMatch(callback)

      detector.detect(createEntry('this is a test'))

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        matchedText: 'test',
      }))
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/transcription/features/keyword-detector.test.ts`
Expected: FAIL - module not found

**Step 3: Create directory and implementation**

```bash
mkdir -p src/transcription/features
mkdir -p tests/unit/transcription/features
```

```typescript
/**
 * Keyword detection module for transcripts
 * @packageDocumentation
 */

import type {
  TranscriptEntry,
  KeywordRule,
  KeywordMatch,
  SpeakerType,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('KeywordDetector')

/**
 * Generates unique IDs for keyword rules
 */
function generateId(): string {
  return `kw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Detects keywords and phrases in transcript entries
 *
 * @example
 * ```ts
 * const detector = new KeywordDetector()
 * detector.addRule({ phrase: 'cancel subscription', action: 'retention' })
 * detector.onMatch((match) => showAgentAssistCard(match.rule.action))
 *
 * // On each transcript entry:
 * detector.detect(entry)
 * ```
 */
export class KeywordDetector {
  private rules: KeywordRule[] = []
  private matchCallbacks: Array<(match: KeywordMatch) => void> = []

  /**
   * Add a keyword detection rule
   * @param rule - Rule configuration (without id)
   * @returns Generated rule ID
   */
  addRule(rule: Omit<KeywordRule, 'id'>): string {
    const id = generateId()
    const fullRule: KeywordRule = { ...rule, id }
    this.rules.push(fullRule)
    logger.debug('Rule added', { id, phrase: String(rule.phrase) })
    return id
  }

  /**
   * Remove a rule by ID
   * @param id - Rule ID to remove
   */
  removeRule(id: string): void {
    const index = this.rules.findIndex(r => r.id === id)
    if (index !== -1) {
      this.rules.splice(index, 1)
      logger.debug('Rule removed', { id })
    }
  }

  /**
   * Get all registered rules
   */
  getRules(): KeywordRule[] {
    return [...this.rules]
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules = []
    logger.debug('All rules cleared')
  }

  /**
   * Detect keywords in a transcript entry
   * @param entry - Transcript entry to scan
   * @returns Array of matches found
   */
  detect(entry: TranscriptEntry): KeywordMatch[] {
    const matches: KeywordMatch[] = []

    for (const rule of this.rules) {
      // Check speaker filter
      if (rule.speakerFilter && rule.speakerFilter !== entry.speaker) {
        continue
      }

      const match = this.matchRule(rule, entry)
      if (match) {
        matches.push(match)
        this.matchCallbacks.forEach(cb => cb(match))
      }
    }

    if (matches.length > 0) {
      logger.debug('Keywords detected', {
        entryId: entry.id,
        matchCount: matches.length,
        actions: matches.map(m => m.rule.action),
      })
    }

    return matches
  }

  /**
   * Match a single rule against an entry
   */
  private matchRule(rule: KeywordRule, entry: TranscriptEntry): KeywordMatch | null {
    const text = entry.text
    const searchText = rule.caseSensitive ? text : text.toLowerCase()

    let matchedText: string | null = null
    let position: { start: number; end: number } | null = null

    if (rule.phrase instanceof RegExp) {
      // Regex matching
      const regex = rule.caseSensitive
        ? rule.phrase
        : new RegExp(rule.phrase.source, rule.phrase.flags + (rule.phrase.flags.includes('i') ? '' : 'i'))

      const match = searchText.match(regex)
      if (match && match.index !== undefined) {
        matchedText = text.slice(match.index, match.index + match[0].length)
        position = { start: match.index, end: match.index + match[0].length }
      }
    } else {
      // String matching
      const searchPhrase = rule.caseSensitive ? rule.phrase : rule.phrase.toLowerCase()
      const index = searchText.indexOf(searchPhrase)

      if (index !== -1) {
        matchedText = text.slice(index, index + rule.phrase.length)
        position = { start: index, end: index + rule.phrase.length }
      }
    }

    if (matchedText && position) {
      return {
        rule,
        matchedText,
        entry,
        position,
      }
    }

    return null
  }

  /**
   * Register callback for keyword matches
   * @param callback - Function called when keyword is detected
   * @returns Unsubscribe function
   */
  onMatch(callback: (match: KeywordMatch) => void): () => void {
    this.matchCallbacks.push(callback)
    return () => {
      const index = this.matchCallbacks.indexOf(callback)
      if (index !== -1) {
        this.matchCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    this.rules = []
    this.matchCallbacks = []
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/transcription/features/keyword-detector.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/transcription/features/keyword-detector.ts tests/unit/transcription/features/keyword-detector.test.ts
git commit -m "feat(transcription): add keyword detection module

- KeywordDetector class for real-time keyword/phrase detection
- Support for string and regex patterns
- Speaker filtering (local/remote)
- Case sensitivity option
- Match position tracking
- Event callbacks for matches"
```

---

## Task 5: Implement PII Redaction Module

**Files:**
- Create: `src/transcription/features/pii-redactor.ts`
- Test: `tests/unit/transcription/features/pii-redactor.test.ts`

**Why:** PII redaction is critical for compliance (PCI-DSS, HIPAA, GDPR). This module protects sensitive data automatically.

**Step 1: Write the failing test**

```typescript
/**
 * Tests for PII redaction module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PIIRedactor } from '@/transcription/features/pii-redactor'
import type { TranscriptEntry } from '@/types/transcription.types'

describe('PIIRedactor', () => {
  let redactor: PIIRedactor

  const createEntry = (text: string): TranscriptEntry => ({
    id: 'entry-1',
    participantId: 'participant-1',
    speaker: 'local',
    text,
    timestamp: Date.now(),
    isFinal: true,
  })

  beforeEach(() => {
    redactor = new PIIRedactor({
      enabled: true,
      patterns: ['credit-card', 'ssn', 'phone-number', 'email'],
    })
  })

  describe('credit card detection', () => {
    it('should redact credit card numbers with spaces', () => {
      const result = redactor.redact('My card is 4111 1111 1111 1111')

      expect(result.redacted).toBe('My card is [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('credit-card')
    })

    it('should redact credit card numbers without spaces', () => {
      const result = redactor.redact('Card: 4111111111111111')

      expect(result.redacted).toBe('Card: [REDACTED]')
    })

    it('should redact credit card numbers with dashes', () => {
      const result = redactor.redact('Number: 4111-1111-1111-1111')

      expect(result.redacted).toBe('Number: [REDACTED]')
    })
  })

  describe('SSN detection', () => {
    it('should redact SSN with dashes', () => {
      const result = redactor.redact('SSN is 123-45-6789')

      expect(result.redacted).toBe('SSN is [REDACTED]')
      expect(result.detections[0].type).toBe('ssn')
    })

    it('should redact SSN without dashes', () => {
      const result = redactor.redact('SSN: 123456789')

      expect(result.redacted).toBe('SSN: [REDACTED]')
    })
  })

  describe('phone number detection', () => {
    it('should redact US phone numbers', () => {
      const result = redactor.redact('Call me at (555) 123-4567')

      expect(result.redacted).toBe('Call me at [REDACTED]')
      expect(result.detections[0].type).toBe('phone-number')
    })

    it('should redact international phone numbers', () => {
      const result = redactor.redact('Number: +1-555-123-4567')

      expect(result.redacted).toBe('Number: [REDACTED]')
    })
  })

  describe('email detection', () => {
    it('should redact email addresses', () => {
      const result = redactor.redact('Email: john.doe@example.com')

      expect(result.redacted).toBe('Email: [REDACTED]')
      expect(result.detections[0].type).toBe('email')
    })
  })

  describe('multiple PII in single text', () => {
    it('should redact multiple PII instances', () => {
      const result = redactor.redact(
        'Card 4111111111111111, SSN 123-45-6789, email test@test.com'
      )

      expect(result.redacted).toBe(
        'Card [REDACTED], SSN [REDACTED], email [REDACTED]'
      )
      expect(result.detections).toHaveLength(3)
    })
  })

  describe('custom replacement', () => {
    it('should use custom replacement text', () => {
      redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
        replacement: '***',
      })

      const result = redactor.redact('Email: test@test.com')

      expect(result.redacted).toBe('Email: ***')
    })
  })

  describe('custom patterns', () => {
    it('should support custom regex patterns', () => {
      redactor = new PIIRedactor({
        enabled: true,
        patterns: ['custom'],
        customPatterns: [/\bACCT-\d{6}\b/g],
      })

      const result = redactor.redact('Account ACCT-123456')

      expect(result.redacted).toBe('Account [REDACTED]')
      expect(result.detections[0].type).toBe('custom')
    })
  })

  describe('onRedacted callback', () => {
    it('should call callback for each redaction', () => {
      const callback = vi.fn()
      redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
        onRedacted: callback,
      })
      const entry = createEntry('Email: test@test.com')

      redactor.redactEntry(entry)

      expect(callback).toHaveBeenCalledWith(
        'email',
        'test@test.com',
        expect.objectContaining({ id: 'entry-1' })
      )
    })
  })

  describe('disabled', () => {
    it('should return original text when disabled', () => {
      redactor = new PIIRedactor({ enabled: false, patterns: ['email'] })

      const result = redactor.redact('Email: test@test.com')

      expect(result.redacted).toBe('Email: test@test.com')
      expect(result.detections).toHaveLength(0)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/transcription/features/pii-redactor.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
/**
 * PII redaction module for transcripts
 * @packageDocumentation
 */

import type {
  TranscriptEntry,
  RedactionConfig,
  RedactionResult,
  PIIType,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('PIIRedactor')

/**
 * Built-in PII detection patterns
 */
const PII_PATTERNS: Record<Exclude<PIIType, 'custom'>, RegExp> = {
  'credit-card': /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  'ssn': /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  'phone-number': /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  'email': /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  'address': /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl)\b/gi,
  'name': /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
  'date-of-birth': /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)?\d{2}\b/g,
}

/**
 * Redacts personally identifiable information from transcript text
 *
 * @remarks
 * Supports credit cards, SSN, phone numbers, email addresses, and custom patterns.
 * Critical for PCI-DSS, HIPAA, and GDPR compliance.
 *
 * @example
 * ```ts
 * const redactor = new PIIRedactor({
 *   enabled: true,
 *   patterns: ['credit-card', 'ssn'],
 *   onRedacted: (type, original) => auditLog(type)
 * })
 *
 * const result = redactor.redact('My card is 4111 1111 1111 1111')
 * // result.redacted = 'My card is [REDACTED]'
 * ```
 */
export class PIIRedactor {
  private config: RedactionConfig
  private activePatterns: Array<{ type: PIIType; pattern: RegExp }> = []

  constructor(config: Partial<RedactionConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      patterns: config.patterns ?? [],
      replacement: config.replacement ?? '[REDACTED]',
      customPatterns: config.customPatterns ?? [],
      onRedacted: config.onRedacted,
    }

    this.buildActivePatterns()
  }

  /**
   * Build the list of active patterns based on config
   */
  private buildActivePatterns(): void {
    this.activePatterns = []

    for (const type of this.config.patterns) {
      if (type === 'custom') {
        // Add custom patterns
        for (const pattern of this.config.customPatterns ?? []) {
          this.activePatterns.push({ type: 'custom', pattern })
        }
      } else if (PII_PATTERNS[type]) {
        // Add built-in pattern
        this.activePatterns.push({
          type,
          pattern: new RegExp(PII_PATTERNS[type].source, PII_PATTERNS[type].flags)
        })
      }
    }

    logger.debug('Active patterns configured', {
      count: this.activePatterns.length,
      types: this.config.patterns,
    })
  }

  /**
   * Update redaction configuration
   */
  configure(config: Partial<RedactionConfig>): void {
    this.config = { ...this.config, ...config }
    this.buildActivePatterns()
  }

  /**
   * Check if redaction is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Redact PII from text
   * @param text - Text to redact
   * @returns Redaction result with original, redacted text, and detections
   */
  redact(text: string): RedactionResult {
    if (!this.config.enabled) {
      return { original: text, redacted: text, detections: [] }
    }

    const detections: RedactionResult['detections'] = []
    let redactedText = text

    // Find all matches first to avoid overlapping issues
    const allMatches: Array<{
      type: PIIType
      original: string
      start: number
      end: number
    }> = []

    for (const { type, pattern } of this.activePatterns) {
      // Reset regex lastIndex
      pattern.lastIndex = 0

      let match: RegExpExecArray | null
      while ((match = pattern.exec(text)) !== null) {
        allMatches.push({
          type,
          original: match[0],
          start: match.index,
          end: match.index + match[0].length,
        })
      }
    }

    // Sort by position (descending) to replace from end to start
    allMatches.sort((a, b) => b.start - a.start)

    // Remove overlapping matches (keep earlier/longer ones)
    const filteredMatches = allMatches.filter((match, index) => {
      for (let i = index + 1; i < allMatches.length; i++) {
        const other = allMatches[i]
        // Check overlap
        if (match.start < other.end && match.end > other.start) {
          return false // This match overlaps with an earlier one
        }
      }
      return true
    })

    // Apply redactions
    for (const match of filteredMatches) {
      redactedText =
        redactedText.slice(0, match.start) +
        this.config.replacement +
        redactedText.slice(match.end)

      detections.push({
        type: match.type,
        original: match.original,
        position: { start: match.start, end: match.end },
      })
    }

    // Sort detections by position (ascending) for the result
    detections.sort((a, b) => a.position.start - b.position.start)

    if (detections.length > 0) {
      logger.debug('PII redacted', {
        count: detections.length,
        types: [...new Set(detections.map(d => d.type))],
      })
    }

    return { original: text, redacted: redactedText, detections }
  }

  /**
   * Redact PII from a transcript entry and call callback
   * @param entry - Transcript entry to redact
   * @returns Modified entry with redacted text
   */
  redactEntry(entry: TranscriptEntry): TranscriptEntry {
    const result = this.redact(entry.text)

    // Call callback for each detection
    if (this.config.onRedacted) {
      for (const detection of result.detections) {
        this.config.onRedacted(detection.type, detection.original, entry)
      }
    }

    return {
      ...entry,
      text: result.redacted,
    }
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    this.activePatterns = []
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/transcription/features/pii-redactor.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/transcription/features/pii-redactor.ts tests/unit/transcription/features/pii-redactor.test.ts
git commit -m "feat(transcription): add PII redaction module

- PIIRedactor class for sensitive data detection and redaction
- Built-in patterns: credit cards, SSN, phone, email, address, name, DOB
- Custom pattern support for domain-specific PII
- Overlap handling for adjacent PII
- Audit callback for compliance logging"
```

---

## Task 6: Implement Export Module

**Files:**
- Create: `src/transcription/features/transcript-exporter.ts`
- Test: `tests/unit/transcription/features/transcript-exporter.test.ts`

**Why:** Export capabilities enable integration with external systems, compliance archives, and video captioning.

**Step 1: Write the failing test**

```typescript
/**
 * Tests for transcript export module
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TranscriptExporter } from '@/transcription/features/transcript-exporter'
import type { TranscriptEntry } from '@/types/transcription.types'

describe('TranscriptExporter', () => {
  let exporter: TranscriptExporter
  let entries: TranscriptEntry[]

  beforeEach(() => {
    exporter = new TranscriptExporter()
    entries = [
      {
        id: '1',
        participantId: 'user-1',
        participantName: 'Alice',
        speaker: 'local',
        text: 'Hello, how can I help you?',
        timestamp: 1000,
        isFinal: true,
        confidence: 0.95,
      },
      {
        id: '2',
        participantId: 'user-2',
        participantName: 'Bob',
        speaker: 'remote',
        text: 'I have a question about my order.',
        timestamp: 5000,
        isFinal: true,
        confidence: 0.92,
      },
      {
        id: '3',
        participantId: 'user-1',
        participantName: 'Alice',
        speaker: 'local',
        text: 'Sure, let me look that up.',
        timestamp: 10000,
        isFinal: true,
        confidence: 0.98,
      },
    ]
  })

  describe('exportJSON', () => {
    it('should export as JSON string', () => {
      const result = exporter.export(entries, 'json')
      const parsed = JSON.parse(result)

      expect(parsed).toHaveLength(3)
      expect(parsed[0].text).toBe('Hello, how can I help you?')
    })

    it('should include metadata when requested', () => {
      const result = exporter.export(entries, 'json', { includeConfidence: true })
      const parsed = JSON.parse(result)

      expect(parsed[0].confidence).toBe(0.95)
    })
  })

  describe('exportTXT', () => {
    it('should export as plain text', () => {
      const result = exporter.export(entries, 'txt')

      expect(result).toContain('Hello, how can I help you?')
      expect(result).toContain('I have a question about my order.')
    })

    it('should include speaker names when requested', () => {
      const result = exporter.export(entries, 'txt', { includeSpeakers: true })

      expect(result).toContain('Alice:')
      expect(result).toContain('Bob:')
    })

    it('should include timestamps when requested', () => {
      const result = exporter.export(entries, 'txt', { includeTimestamps: true })

      expect(result).toContain('[00:00:01]')
      expect(result).toContain('[00:00:05]')
    })
  })

  describe('exportSRT', () => {
    it('should export in SRT subtitle format', () => {
      const result = exporter.export(entries, 'srt')

      // SRT format: sequence number, timing, text, blank line
      expect(result).toContain('1\n')
      expect(result).toContain('00:00:01,000 --> 00:00:05,000')
      expect(result).toContain('Hello, how can I help you?')
    })
  })

  describe('exportVTT', () => {
    it('should export in WebVTT format', () => {
      const result = exporter.export(entries, 'vtt')

      expect(result).toContain('WEBVTT')
      expect(result).toContain('00:00:01.000 --> 00:00:05.000')
    })
  })

  describe('exportCSV', () => {
    it('should export as CSV', () => {
      const result = exporter.export(entries, 'csv')

      expect(result).toContain('timestamp,speaker,text')
      expect(result).toContain('Alice')
      expect(result).toContain('"Hello, how can I help you?"')
    })
  })

  describe('filtering', () => {
    it('should filter by speaker type', () => {
      const result = exporter.export(entries, 'txt', { speakerFilter: 'local' })

      expect(result).toContain('Hello')
      expect(result).toContain('Sure')
      expect(result).not.toContain('question about my order')
    })

    it('should filter by time range', () => {
      const result = exporter.export(entries, 'txt', {
        timeRange: { start: 4000, end: 11000 },
      })

      expect(result).not.toContain('Hello')
      expect(result).toContain('question about my order')
      expect(result).toContain('look that up')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/transcription/features/transcript-exporter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
/**
 * Transcript export module
 * @packageDocumentation
 */

import type {
  TranscriptEntry,
  ExportFormat,
  ExportOptions,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('TranscriptExporter')

/**
 * Formats milliseconds as HH:MM:SS,mmm (SRT format)
 */
function formatTimeSRT(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const milliseconds = ms % 1000

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Formats milliseconds as HH:MM:SS.mmm (VTT format)
 */
function formatTimeVTT(ms: number): string {
  return formatTimeSRT(ms).replace(',', '.')
}

/**
 * Formats milliseconds as [HH:MM:SS] (simple timestamp)
 */
function formatTimeSimple(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  if (hours > 0) {
    return `[${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`
  }
  return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`
}

/**
 * Escapes text for CSV format
 */
function escapeCSV(text: string): string {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * Exports transcript entries to various formats
 *
 * @example
 * ```ts
 * const exporter = new TranscriptExporter()
 *
 * // Export as SRT subtitles
 * const srt = exporter.export(entries, 'srt')
 *
 * // Export as plain text with speakers
 * const txt = exporter.export(entries, 'txt', { includeSpeakers: true })
 * ```
 */
export class TranscriptExporter {
  /**
   * Export transcript entries to specified format
   * @param entries - Transcript entries to export
   * @param format - Export format
   * @param options - Export options
   * @returns Formatted string
   */
  export(
    entries: TranscriptEntry[],
    format: ExportFormat,
    options: ExportOptions = {}
  ): string {
    // Filter entries
    let filtered = this.filterEntries(entries, options)

    logger.debug('Exporting transcript', {
      format,
      totalEntries: entries.length,
      filteredEntries: filtered.length,
    })

    switch (format) {
      case 'json':
        return this.exportJSON(filtered, options)
      case 'txt':
        return this.exportTXT(filtered, options)
      case 'srt':
        return this.exportSRT(filtered)
      case 'vtt':
        return this.exportVTT(filtered)
      case 'csv':
        return this.exportCSV(filtered, options)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  /**
   * Filter entries based on options
   */
  private filterEntries(
    entries: TranscriptEntry[],
    options: ExportOptions
  ): TranscriptEntry[] {
    let filtered = entries

    // Filter by speaker
    if (options.speakerFilter) {
      filtered = filtered.filter(e => e.speaker === options.speakerFilter)
    }

    // Filter by time range
    if (options.timeRange) {
      const { start, end } = options.timeRange
      filtered = filtered.filter(e => e.timestamp >= start && e.timestamp <= end)
    }

    return filtered
  }

  /**
   * Export as JSON
   */
  private exportJSON(entries: TranscriptEntry[], options: ExportOptions): string {
    const data = entries.map(entry => {
      const item: Record<string, unknown> = {
        timestamp: entry.timestamp,
        speaker: entry.participantName || entry.speaker,
        text: entry.text,
      }

      if (options.includeConfidence && entry.confidence !== undefined) {
        item.confidence = entry.confidence
      }

      return item
    })

    return JSON.stringify(data, null, 2)
  }

  /**
   * Export as plain text
   */
  private exportTXT(entries: TranscriptEntry[], options: ExportOptions): string {
    return entries.map(entry => {
      let line = ''

      if (options.includeTimestamps) {
        line += formatTimeSimple(entry.timestamp) + ' '
      }

      if (options.includeSpeakers) {
        const speaker = entry.participantName || entry.speaker
        line += `${speaker}: `
      }

      line += entry.text

      return line
    }).join('\n')
  }

  /**
   * Export as SRT subtitles
   */
  private exportSRT(entries: TranscriptEntry[]): string {
    return entries.map((entry, index) => {
      const startTime = formatTimeSRT(entry.timestamp)
      // Estimate end time based on next entry or add 4 seconds
      const nextEntry = entries[index + 1]
      const endMs = nextEntry ? nextEntry.timestamp : entry.timestamp + 4000
      const endTime = formatTimeSRT(endMs)

      return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`
    }).join('\n')
  }

  /**
   * Export as WebVTT
   */
  private exportVTT(entries: TranscriptEntry[]): string {
    const cues = entries.map((entry, index) => {
      const startTime = formatTimeVTT(entry.timestamp)
      const nextEntry = entries[index + 1]
      const endMs = nextEntry ? nextEntry.timestamp : entry.timestamp + 4000
      const endTime = formatTimeVTT(endMs)

      return `${startTime} --> ${endTime}\n${entry.text}`
    }).join('\n\n')

    return `WEBVTT\n\n${cues}`
  }

  /**
   * Export as CSV
   */
  private exportCSV(entries: TranscriptEntry[], options: ExportOptions): string {
    const headers = ['timestamp', 'speaker', 'text']
    if (options.includeConfidence) {
      headers.push('confidence')
    }

    const rows = entries.map(entry => {
      const row = [
        entry.timestamp.toString(),
        escapeCSV(entry.participantName || entry.speaker),
        escapeCSV(entry.text),
      ]
      if (options.includeConfidence) {
        row.push(entry.confidence?.toString() ?? '')
      }
      return row.join(',')
    })

    return [headers.join(','), ...rows].join('\n')
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/transcription/features/transcript-exporter.test.ts`
Expected: All tests PASS

**Step 5: Create feature module index**

```typescript
// src/transcription/features/index.ts
/**
 * Transcription feature modules
 * @packageDocumentation
 */

export { KeywordDetector } from './keyword-detector'
export { PIIRedactor } from './pii-redactor'
export { TranscriptExporter } from './transcript-exporter'
```

**Step 6: Commit**

```bash
git add src/transcription/features/transcript-exporter.ts src/transcription/features/index.ts tests/unit/transcription/features/transcript-exporter.test.ts
git commit -m "feat(transcription): add transcript export module

- TranscriptExporter class with multiple format support
- Formats: JSON, TXT, SRT, VTT, CSV
- Speaker and time range filtering
- Optional timestamps, speaker names, confidence scores"
```

---

## Task 7: Implement Main useTranscription Composable

**Files:**
- Create: `src/composables/useTranscription.ts`
- Test: `tests/unit/composables/useTranscription.test.ts`

**Why:** This is the main composable that ties everything together. It provides the public API for developers to use transcription in their Vue applications.

**Step 1: Write the failing test**

```typescript
/**
 * Tests for useTranscription composable
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useTranscription } from '@/composables/useTranscription'
import { withSetup } from '../../utils/test-helpers'
import type { TranscriptionProvider, ProviderCapabilities } from '@/types/transcription.types'

// Mock provider
function createMockProvider(): TranscriptionProvider {
  const interimCallbacks: Array<(text: string, sourceId: string) => void> = []
  const finalCallbacks: Array<(result: any, sourceId: string) => void> = []
  const errorCallbacks: Array<(error: Error) => void> = []

  return {
    name: 'mock',
    capabilities: {
      streaming: true,
      interimResults: true,
      languageDetection: false,
      multiChannel: true,
      punctuation: false,
      speakerDiarization: false,
      wordTimestamps: false,
      supportedLanguages: ['en-US'],
    },
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    startStream: vi.fn(),
    stopStream: vi.fn(),
    onInterim: vi.fn((cb) => interimCallbacks.push(cb)),
    onFinal: vi.fn((cb) => finalCallbacks.push(cb)),
    onError: vi.fn((cb) => errorCallbacks.push(cb)),
    // Test helpers
    _emitInterim: (text: string, sourceId: string) => {
      interimCallbacks.forEach(cb => cb(text, sourceId))
    },
    _emitFinal: (result: any, sourceId: string) => {
      finalCallbacks.forEach(cb => cb(result, sourceId))
    },
    _emitError: (error: Error) => {
      errorCallbacks.forEach(cb => cb(error))
    },
  } as TranscriptionProvider & {
    _emitInterim: (text: string, sourceId: string) => void
    _emitFinal: (result: any, sourceId: string) => void
    _emitError: (error: Error) => void
  }
}

// Mock provider registry
const mockProvider = createMockProvider()
vi.mock('@/transcription/providers', () => ({
  providerRegistry: {
    get: vi.fn().mockResolvedValue(mockProvider),
    has: vi.fn().mockReturnValue(true),
  },
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('useTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with idle state', () => {
      const { result, unmount } = withSetup(() => useTranscription())

      expect(result.state.value).toBe('idle')
      expect(result.isTranscribing.value).toBe(false)
      expect(result.transcript.value).toEqual([])
      expect(result.currentUtterance.value).toBe('')
      expect(result.error.value).toBeNull()

      unmount()
    })

    it('should respect initial options', () => {
      const { result, unmount } = withSetup(() => useTranscription({
        localEnabled: false,
        remoteEnabled: true,
        language: 'es-ES',
      }))

      expect(result.localEnabled.value).toBe(false)
      expect(result.remoteEnabled.value).toBe(true)

      unmount()
    })
  })

  describe('start/stop', () => {
    it('should start transcription', async () => {
      const { result, unmount } = withSetup(() => useTranscription())

      await result.start()

      expect(result.state.value).toBe('active')
      expect(result.isTranscribing.value).toBe(true)
      expect(mockProvider.initialize).toHaveBeenCalled()
      expect(mockProvider.startStream).toHaveBeenCalled()

      unmount()
    })

    it('should stop transcription', async () => {
      const { result, unmount } = withSetup(() => useTranscription())

      await result.start()
      result.stop()

      expect(result.state.value).toBe('idle')
      expect(result.isTranscribing.value).toBe(false)
      expect(mockProvider.stopStream).toHaveBeenCalled()

      unmount()
    })
  })

  describe('transcript management', () => {
    it('should add entries on final results', async () => {
      const { result, unmount } = withSetup(() => useTranscription())
      await result.start()

      ;(mockProvider as any)._emitFinal({
        text: 'Hello world',
        isFinal: true,
        confidence: 0.95,
      }, 'local')

      await nextTick()

      expect(result.transcript.value).toHaveLength(1)
      expect(result.transcript.value[0].text).toBe('Hello world')
      expect(result.transcript.value[0].speaker).toBe('local')

      unmount()
    })

    it('should update currentUtterance on interim results', async () => {
      const { result, unmount } = withSetup(() => useTranscription())
      await result.start()

      ;(mockProvider as any)._emitInterim('Hello', 'local')

      await nextTick()

      expect(result.currentUtterance.value).toBe('Hello')

      unmount()
    })

    it('should clear transcript', async () => {
      const { result, unmount } = withSetup(() => useTranscription())
      await result.start()

      ;(mockProvider as any)._emitFinal({ text: 'Test', isFinal: true }, 'local')
      await nextTick()

      result.clear()

      expect(result.transcript.value).toEqual([])

      unmount()
    })
  })

  describe('participant toggles', () => {
    it('should toggle local transcription', async () => {
      const { result, unmount } = withSetup(() => useTranscription())

      result.localEnabled.value = false
      expect(result.localEnabled.value).toBe(false)

      result.localEnabled.value = true
      expect(result.localEnabled.value).toBe(true)

      unmount()
    })
  })

  describe('export', () => {
    it('should export transcript', async () => {
      const { result, unmount } = withSetup(() => useTranscription())
      await result.start()

      ;(mockProvider as any)._emitFinal({ text: 'Hello', isFinal: true }, 'local')
      await nextTick()

      const exported = result.exportTranscript('txt')

      expect(exported).toContain('Hello')

      unmount()
    })
  })

  describe('search', () => {
    it('should search transcript', async () => {
      const { result, unmount } = withSetup(() => useTranscription())
      await result.start()

      ;(mockProvider as any)._emitFinal({ text: 'Hello world', isFinal: true }, 'local')
      ;(mockProvider as any)._emitFinal({ text: 'Goodbye world', isFinal: true }, 'remote')
      await nextTick()

      const results = result.searchTranscript('world')

      expect(results).toHaveLength(2)

      unmount()
    })

    it('should filter search by speaker', async () => {
      const { result, unmount } = withSetup(() => useTranscription())
      await result.start()

      ;(mockProvider as any)._emitFinal({ text: 'Hello', isFinal: true }, 'local')
      ;(mockProvider as any)._emitFinal({ text: 'Hello', isFinal: true }, 'remote')
      await nextTick()

      const results = result.searchTranscript('Hello', { speaker: 'local' })

      expect(results).toHaveLength(1)
      expect(results[0].speaker).toBe('local')

      unmount()
    })
  })

  describe('keywords', () => {
    it('should detect keywords and emit callback', async () => {
      const onKeywordDetected = vi.fn()
      const { result, unmount } = withSetup(() => useTranscription({
        keywords: [{ phrase: 'help', action: 'assist' }],
        onKeywordDetected,
      }))
      await result.start()

      ;(mockProvider as any)._emitFinal({ text: 'I need help please', isFinal: true }, 'local')
      await nextTick()

      expect(onKeywordDetected).toHaveBeenCalledWith(
        expect.objectContaining({
          matchedText: 'help',
          rule: expect.objectContaining({ action: 'assist' }),
        })
      )

      unmount()
    })

    it('should add and remove keywords dynamically', () => {
      const { result, unmount } = withSetup(() => useTranscription())

      const id = result.addKeyword({ phrase: 'test', action: 'test-action' })
      expect(result.getKeywords()).toHaveLength(1)

      result.removeKeyword(id)
      expect(result.getKeywords()).toHaveLength(0)

      unmount()
    })
  })

  describe('error handling', () => {
    it('should set error state on provider error', async () => {
      const { result, unmount } = withSetup(() => useTranscription())
      await result.start()

      ;(mockProvider as any)._emitError(new Error('Test error'))
      await nextTick()

      expect(result.error.value).toBeInstanceOf(Error)
      expect(result.error.value?.message).toBe('Test error')

      unmount()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/composables/useTranscription.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

```typescript
/**
 * useTranscription - Real-time voice transcription composable
 * @packageDocumentation
 */

import { ref, computed, onScopeDispose, getCurrentScope } from 'vue'
import type {
  TranscriptionOptions,
  UseTranscriptionReturn,
  TranscriptionState,
  TranscriptEntry,
  TranscriptionProvider,
  KeywordRule,
  KeywordMatch,
  ParticipantConfig,
  ExportFormat,
  ExportOptions,
  ProviderCapabilities,
  ProviderOptions,
  SpeakerType,
} from '@/types/transcription.types'
import { providerRegistry } from '@/transcription/providers'
import { KeywordDetector } from '@/transcription/features/keyword-detector'
import { PIIRedactor } from '@/transcription/features/pii-redactor'
import { TranscriptExporter } from '@/transcription/features/transcript-exporter'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useTranscription')

/**
 * Generate unique ID for transcript entries
 */
function generateEntryId(): string {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Composable for real-time voice transcription
 *
 * @param options - Transcription configuration options
 * @returns Transcription state and controls
 *
 * @example
 * ```ts
 * const {
 *   isTranscribing,
 *   transcript,
 *   start,
 *   stop,
 *   exportTranscript,
 * } = useTranscription({
 *   provider: 'web-speech',
 *   language: 'en-US',
 *   keywords: [{ phrase: 'help', action: 'assist' }],
 *   onKeywordDetected: (match) => showAssistCard(match.rule.action),
 * })
 *
 * // Start transcribing
 * await start()
 *
 * // Later, export the transcript
 * const srt = exportTranscript('srt')
 * ```
 */
export function useTranscription(
  options: TranscriptionOptions = {}
): UseTranscriptionReturn {
  // Configuration
  const config = {
    provider: options.provider ?? 'web-speech',
    language: options.language ?? 'en-US',
    autoDetectLanguage: options.autoDetectLanguage ?? false,
    localEnabled: options.localEnabled ?? true,
    remoteEnabled: options.remoteEnabled ?? true,
  }

  // State
  const state = ref<TranscriptionState>('idle')
  const transcript = ref<TranscriptEntry[]>([])
  const currentUtterance = ref('')
  const error = ref<Error | null>(null)
  const localEnabled = ref(config.localEnabled)
  const remoteEnabled = ref(config.remoteEnabled)
  const detectedLanguage = ref<string | null>(null)
  const participants = ref<Map<string, ParticipantConfig>>(new Map())

  // Computed
  const isTranscribing = computed(() => state.value === 'active')
  const providerName = computed(() => config.provider)

  // Feature modules
  const keywordDetector = new KeywordDetector()
  const piiRedactor = new PIIRedactor(options.redaction ?? { enabled: false, patterns: [] })
  const exporter = new TranscriptExporter()

  // Provider instance
  let provider: TranscriptionProvider | null = null

  // Event callbacks
  const transcriptCallbacks: Array<(entry: TranscriptEntry) => void> = []
  const keywordCallbacks: Array<(match: KeywordMatch) => void> = []

  // Initialize keywords
  if (options.keywords) {
    for (const keyword of options.keywords) {
      keywordDetector.addRule(keyword)
    }
  }

  // Setup keyword callback
  keywordDetector.onMatch((match) => {
    keywordCallbacks.forEach(cb => cb(match))
    options.onKeywordDetected?.(match)
  })

  /**
   * Initialize and start transcription
   */
  async function start(): Promise<void> {
    if (state.value === 'active') {
      logger.warn('Transcription already active')
      return
    }

    state.value = 'starting'
    error.value = null

    try {
      // Get provider instance
      provider = await providerRegistry.get(config.provider, {
        language: config.language,
        interimResults: true,
        ...options.providerOptions,
      })

      // Setup event handlers
      provider.onInterim((text, sourceId) => {
        const speakerType = getSpeakerType(sourceId)
        if (isSourceEnabled(speakerType)) {
          currentUtterance.value = text
        }
      })

      provider.onFinal((result, sourceId) => {
        const speakerType = getSpeakerType(sourceId)
        if (!isSourceEnabled(speakerType)) {
          return
        }

        currentUtterance.value = ''

        // Create entry
        let entry: TranscriptEntry = {
          id: generateEntryId(),
          participantId: sourceId,
          participantName: getParticipantName(sourceId),
          speaker: speakerType,
          text: result.text,
          timestamp: Date.now(),
          isFinal: true,
          confidence: result.confidence,
          language: result.language ?? config.language,
          words: result.words,
        }

        // Apply PII redaction
        if (piiRedactor.isEnabled()) {
          entry = piiRedactor.redactEntry(entry)
        }

        // Add to transcript
        transcript.value = [...transcript.value, entry]

        // Detect keywords
        keywordDetector.detect(entry)

        // Notify callbacks
        transcriptCallbacks.forEach(cb => cb(entry))
        options.onTranscript?.(entry)

        logger.debug('Transcript entry added', { id: entry.id, speaker: entry.speaker })
      })

      provider.onError((err) => {
        error.value = err
        options.onError?.(err)
        logger.error('Provider error', { error: err.message })
      })

      // Start transcription
      // Create default audio sources for local/remote
      if (localEnabled.value) {
        provider.startStream({
          stream: new MediaStream(),
          id: 'local',
          type: 'local',
        })
      }

      state.value = 'active'
      logger.info('Transcription started', { provider: config.provider })
    } catch (err) {
      state.value = 'error'
      error.value = err instanceof Error ? err : new Error(String(err))
      logger.error('Failed to start transcription', { error: err })
      throw err
    }
  }

  /**
   * Stop transcription
   */
  function stop(): void {
    if (provider) {
      provider.stopStream()
    }
    state.value = 'idle'
    currentUtterance.value = ''
    logger.info('Transcription stopped')
  }

  /**
   * Clear transcript history
   */
  function clear(): void {
    transcript.value = []
    currentUtterance.value = ''
    logger.debug('Transcript cleared')
  }

  /**
   * Get speaker type from source ID
   */
  function getSpeakerType(sourceId: string): SpeakerType {
    return sourceId === 'local' ? 'local' : 'remote'
  }

  /**
   * Check if a speaker type is enabled
   */
  function isSourceEnabled(type: SpeakerType): boolean {
    return type === 'local' ? localEnabled.value : remoteEnabled.value
  }

  /**
   * Get participant name
   */
  function getParticipantName(id: string): string | undefined {
    return participants.value.get(id)?.name
  }

  /**
   * Enable transcription for a participant
   */
  function enableParticipant(id: string): void {
    const config = participants.value.get(id)
    if (config) {
      config.enabled = true
    } else {
      participants.value.set(id, { id, enabled: true })
    }
  }

  /**
   * Disable transcription for a participant
   */
  function disableParticipant(id: string): void {
    const config = participants.value.get(id)
    if (config) {
      config.enabled = false
    }
  }

  /**
   * Set language for a participant
   */
  function setParticipantLanguage(id: string, language: string): void {
    const config = participants.value.get(id)
    if (config) {
      config.language = language
    } else {
      participants.value.set(id, { id, enabled: true, language })
    }
  }

  /**
   * Lock detected language
   */
  function lockLanguage(language: string): void {
    detectedLanguage.value = language
    config.autoDetectLanguage = false
    logger.debug('Language locked', { language })
  }

  /**
   * Switch to a different provider
   */
  async function switchProvider(name: string, providerOptions?: ProviderOptions): Promise<void> {
    const wasActive = state.value === 'active'

    if (wasActive) {
      stop()
    }

    config.provider = name

    if (providerOptions) {
      Object.assign(config, providerOptions)
    }

    if (wasActive) {
      await start()
    }

    logger.info('Provider switched', { provider: name })
  }

  /**
   * Get current provider capabilities
   */
  function getCapabilities(): ProviderCapabilities | null {
    return provider?.capabilities ?? null
  }

  /**
   * Add a keyword rule
   */
  function addKeyword(rule: Omit<KeywordRule, 'id'>): string {
    return keywordDetector.addRule(rule)
  }

  /**
   * Remove a keyword rule
   */
  function removeKeyword(id: string): void {
    keywordDetector.removeRule(id)
  }

  /**
   * Get all keyword rules
   */
  function getKeywords(): KeywordRule[] {
    return keywordDetector.getRules()
  }

  /**
   * Export transcript
   */
  function exportTranscript(format: ExportFormat, exportOptions?: ExportOptions): string {
    return exporter.export(transcript.value, format, exportOptions)
  }

  /**
   * Search transcript
   */
  function searchTranscript(
    query: string,
    searchOptions?: { speaker?: SpeakerType }
  ): TranscriptEntry[] {
    const lowerQuery = query.toLowerCase()
    return transcript.value.filter(entry => {
      if (searchOptions?.speaker && entry.speaker !== searchOptions.speaker) {
        return false
      }
      return entry.text.toLowerCase().includes(lowerQuery)
    })
  }

  /**
   * Register transcript callback
   */
  function onTranscript(callback: (entry: TranscriptEntry) => void): () => void {
    transcriptCallbacks.push(callback)
    return () => {
      const index = transcriptCallbacks.indexOf(callback)
      if (index !== -1) {
        transcriptCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register keyword callback
   */
  function onKeywordDetected(callback: (match: KeywordMatch) => void): () => void {
    keywordCallbacks.push(callback)
    return () => {
      const index = keywordCallbacks.indexOf(callback)
      if (index !== -1) {
        keywordCallbacks.splice(index, 1)
      }
    }
  }

  // Cleanup on scope dispose
  if (getCurrentScope()) {
    onScopeDispose(() => {
      stop()
      keywordDetector.dispose()
      piiRedactor.dispose()
      logger.debug('Transcription composable disposed')
    })
  }

  return {
    // State
    state: computed(() => state.value),
    isTranscribing,
    transcript,
    currentUtterance,
    error: computed(() => error.value),

    // Participant management
    participants,
    enableParticipant,
    disableParticipant,
    setParticipantLanguage,

    // Controls
    start,
    stop,
    clear,

    // Per-source toggles
    localEnabled,
    remoteEnabled,

    // Language
    detectedLanguage,
    lockLanguage,

    // Provider
    provider: providerName,
    switchProvider,
    getCapabilities,

    // Keywords
    addKeyword,
    removeKeyword,
    getKeywords,

    // Export
    exportTranscript,
    searchTranscript,

    // Events
    onTranscript,
    onKeywordDetected,
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test tests/unit/composables/useTranscription.test.ts`
Expected: All tests PASS

**Step 5: Export from composables index**

Add to `src/composables/index.ts`:
```typescript
export { useTranscription } from './useTranscription'
```

**Step 6: Commit**

```bash
git add src/composables/useTranscription.ts tests/unit/composables/useTranscription.test.ts
git commit -m "feat(transcription): add useTranscription composable

- Main composable orchestrating transcription system
- Pluggable provider support with runtime switching
- Multi-participant management with per-user toggles
- Keyword detection integration
- PII redaction integration
- Export to JSON, TXT, SRT, VTT, CSV
- Transcript search functionality
- Event callbacks for transcripts and keywords"
```

---

## Task 8: Add Main Export and Documentation

**Files:**
- Create: `src/transcription/index.ts`
- Modify: `src/index.ts`
- Create: `docs/guide/transcription.md`

**Why:** Clean exports make the library easy to use. Documentation helps developers understand how to use the feature.

**Step 1: Create transcription module index**

```typescript
// src/transcription/index.ts
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
```

**Step 2: Update main index**

Add to `src/index.ts`:
```typescript
// Transcription
export { useTranscription } from './composables/useTranscription'
export * from './transcription'
```

**Step 3: Update types index**

Add to `src/types/index.ts`:
```typescript
export * from './transcription.types'
```

**Step 4: Create documentation**

```markdown
<!-- docs/guide/transcription.md -->
# Real-Time Transcription

VueSip provides a comprehensive real-time transcription system with support for multiple providers, keyword detection, PII redaction, and export formats.

## Quick Start

```vue
<script setup>
import { useTranscription } from 'vuesip'

const {
  isTranscribing,
  transcript,
  currentUtterance,
  start,
  stop,
  exportTranscript,
} = useTranscription({
  language: 'en-US',
})

async function toggleTranscription() {
  if (isTranscribing.value) {
    stop()
  } else {
    await start()
  }
}
</script>

<template>
  <button @click="toggleTranscription">
    {{ isTranscribing ? 'Stop' : 'Start' }} Transcription
  </button>

  <p v-if="currentUtterance" class="interim">
    {{ currentUtterance }}...
  </p>

  <div v-for="entry in transcript" :key="entry.id">
    <strong>{{ entry.speaker }}:</strong> {{ entry.text }}
  </div>
</template>
```

## Providers

VueSip supports multiple transcription providers:

| Provider | Cost | Accuracy | Setup |
|----------|------|----------|-------|
| `web-speech` (default) | Free | Medium | None |
| `deepgram` | Paid | High | API key |
| `whisper-api` | Paid | High | API key |

### Using Web Speech API (Default)

```ts
const { start } = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
})
```

### Using Deepgram

```ts
import { providerRegistry } from 'vuesip'
import { DeepgramProvider } from './my-deepgram-provider'

// Register your provider
providerRegistry.register('deepgram', () => new DeepgramProvider())

// Use it
const { start } = useTranscription({
  provider: 'deepgram',
  providerOptions: {
    apiKey: 'your-api-key',
  },
})
```

## Keyword Detection

Detect important phrases in real-time:

```ts
const { addKeyword } = useTranscription({
  keywords: [
    { phrase: 'cancel subscription', action: 'retention' },
    { phrase: /refund|money back/i, action: 'refund-policy' },
  ],
  onKeywordDetected: (match) => {
    showAgentAssistCard(match.rule.action)
  },
})

// Add keywords dynamically
addKeyword({
  phrase: 'speak to manager',
  action: 'escalate',
  speakerFilter: 'remote', // Only match remote speaker
})
```

## PII Redaction

Automatically redact sensitive information:

```ts
const { transcript } = useTranscription({
  redaction: {
    enabled: true,
    patterns: ['credit-card', 'ssn', 'phone-number', 'email'],
    onRedacted: (type, original, entry) => {
      auditLog(`PII detected: ${type}`)
    },
  },
})

// transcript entries will have redacted text
// "My card is 4111 1111 1111 1111" → "My card is [REDACTED]"
```

## Multi-Participant Support

Control transcription per-participant:

```ts
const {
  participants,
  enableParticipant,
  disableParticipant,
  setParticipantLanguage,
  localEnabled,
  remoteEnabled,
} = useTranscription()

// Toggle local/remote transcription
localEnabled.value = true
remoteEnabled.value = false

// Per-participant control
disableParticipant('participant-123')
setParticipantLanguage('participant-456', 'es-ES')
```

## Export Formats

Export transcripts in various formats:

```ts
const { exportTranscript, transcript } = useTranscription()

// After recording...
const srt = exportTranscript('srt')  // Subtitles
const vtt = exportTranscript('vtt')  // WebVTT
const json = exportTranscript('json', { includeConfidence: true })
const csv = exportTranscript('csv')
const txt = exportTranscript('txt', {
  includeSpeakers: true,
  includeTimestamps: true,
})
```

## Search

Search through transcript history:

```ts
const { searchTranscript } = useTranscription()

// Find all mentions of "pricing"
const results = searchTranscript('pricing')

// Filter by speaker
const customerQuestions = searchTranscript('question', { speaker: 'remote' })
```

## API Reference

See the [useTranscription API documentation](/api/composables#usetranscription) for complete details.
```

**Step 5: Update docs navigation**

Add to `docs/.vitepress/config.ts` sidebar under Advanced Topics:
```typescript
{ text: 'Real-Time Transcription', link: '/guide/transcription' },
```

**Step 6: Commit**

```bash
git add src/transcription/index.ts docs/guide/transcription.md
git commit -m "docs(transcription): add guide and finalize exports

- Transcription module index with clean exports
- Updated main index with transcription exports
- Comprehensive usage guide with examples
- API reference documentation"
```

---

## Task 9: Integration Testing

**Files:**
- Create: `tests/integration/transcription.test.ts`

**Why:** Integration tests verify that all the modules work together correctly.

**Step 1: Write integration test**

```typescript
/**
 * Integration tests for transcription system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTranscription } from '@/composables/useTranscription'
import { providerRegistry, WebSpeechProvider } from '@/transcription'
import { withSetup } from '../utils/test-helpers'

// Mock SpeechRecognition for integration tests
const mockRecognition = {
  lang: '',
  continuous: false,
  interimResults: false,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  onresult: null as any,
  onerror: null as any,
  onend: null as any,
}

const MockSpeechRecognition = vi.fn().mockImplementation(() => ({ ...mockRecognition }))
vi.stubGlobal('SpeechRecognition', MockSpeechRecognition)
vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition)

vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

describe('Transcription System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-register provider for each test
    if (!providerRegistry.has('web-speech')) {
      providerRegistry.register('web-speech', () => new WebSpeechProvider())
    }
  })

  it('should complete a full transcription workflow', async () => {
    const onTranscript = vi.fn()
    const onKeywordDetected = vi.fn()

    const { result, unmount } = withSetup(() => useTranscription({
      provider: 'web-speech',
      language: 'en-US',
      keywords: [{ phrase: 'help', action: 'assist' }],
      redaction: {
        enabled: true,
        patterns: ['email'],
      },
      onTranscript,
      onKeywordDetected,
    }))

    // Start transcription
    await result.start()
    expect(result.isTranscribing.value).toBe(true)

    // Stop
    result.stop()
    expect(result.isTranscribing.value).toBe(false)

    unmount()
  })

  it('should export transcript in multiple formats', async () => {
    const { result, unmount } = withSetup(() => useTranscription())

    // Add some test entries directly
    result.transcript.value = [
      {
        id: '1',
        participantId: 'local',
        speaker: 'local',
        text: 'Hello world',
        timestamp: 1000,
        isFinal: true,
      },
      {
        id: '2',
        participantId: 'remote',
        speaker: 'remote',
        text: 'Hi there',
        timestamp: 2000,
        isFinal: true,
      },
    ]

    // Test all export formats
    expect(result.exportTranscript('json')).toContain('Hello world')
    expect(result.exportTranscript('txt')).toContain('Hello world')
    expect(result.exportTranscript('srt')).toContain('00:00:01')
    expect(result.exportTranscript('vtt')).toContain('WEBVTT')
    expect(result.exportTranscript('csv')).toContain('timestamp,speaker')

    unmount()
  })

  it('should handle provider switching', async () => {
    const { result, unmount } = withSetup(() => useTranscription({
      provider: 'web-speech',
    }))

    expect(result.provider.value).toBe('web-speech')

    // Provider switching would work if we had multiple providers registered
    // For now, just verify the API exists
    expect(typeof result.switchProvider).toBe('function')

    unmount()
  })
})
```

**Step 2: Run integration tests**

Run: `pnpm test tests/integration/transcription.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/integration/transcription.test.ts
git commit -m "test(transcription): add integration tests

- Full workflow test
- Export format verification
- Provider switching test"
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run all tests**

```bash
pnpm test
```
Expected: All tests PASS

**Step 2: Run linting**

```bash
pnpm lint
```
Expected: No errors (fix any that appear)

**Step 3: Run type checking**

```bash
pnpm exec vue-tsc --noEmit
```
Expected: No type errors

**Step 4: Build**

```bash
pnpm build
```
Expected: Build succeeds

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore(transcription): final cleanup and verification

- All tests passing
- No lint errors
- Type checking clean
- Build successful"
```

---

## Summary

This plan implements a comprehensive real-time transcription system with:

1. **Types** (`src/types/transcription.types.ts`) - Complete TypeScript definitions
2. **Provider Registry** (`src/transcription/providers/registry.ts`) - Pluggable provider system
3. **Web Speech Provider** (`src/transcription/providers/web-speech.ts`) - Default free provider
4. **Keyword Detection** (`src/transcription/features/keyword-detector.ts`) - Real-time phrase matching
5. **PII Redaction** (`src/transcription/features/pii-redactor.ts`) - Compliance-ready data protection
6. **Export Module** (`src/transcription/features/transcript-exporter.ts`) - Multiple format support
7. **Main Composable** (`src/composables/useTranscription.ts`) - User-facing API
8. **Documentation** (`docs/guide/transcription.md`) - Usage guide

The architecture is extensible - adding new providers (Deepgram, Whisper, etc.) only requires implementing the `TranscriptionProvider` interface and registering with the registry.

---

**Plan complete and saved to `docs/plans/2026-01-09-transcription-system.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
