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
  IKeywordDetector,
  IPIIRedactor,
  ITranscriptExporter,
  IProviderRegistry,
  RedactionConfig,
} from '@/types/transcription.types'
// Import providers module to ensure auto-registration runs
import {
  providerRegistry as defaultProviderRegistry,
  WebSpeechProvider,
} from '@/transcription/providers'
import { KeywordDetector } from '@/transcription/features/keyword-detector'
import { PIIRedactor } from '@/transcription/features/pii-redactor'
import { TranscriptExporter } from '@/transcription/features/transcript-exporter'
import { createLogger } from '@/utils/logger'

/**
 * Ensure web-speech provider is registered (fallback if auto-registration didn't run)
 */
if (!defaultProviderRegistry.has('web-speech')) {
  defaultProviderRegistry.register('web-speech', () => new WebSpeechProvider())
}

/**
 * Default factory functions for creating feature module instances
 * These are used when no dependencies are injected via options
 */
const defaultDependencies = {
  createKeywordDetector: (): IKeywordDetector => new KeywordDetector(),
  createPIIRedactor: (config: Partial<RedactionConfig>): IPIIRedactor => new PIIRedactor(config),
  createExporter: (): ITranscriptExporter => new TranscriptExporter(),
  providerRegistry: defaultProviderRegistry as IProviderRegistry,
}

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
export function useTranscription(options: TranscriptionOptions = {}): UseTranscriptionReturn {
  // Configuration
  const config = {
    provider: options.provider ?? 'web-speech',
    language: options.language ?? 'en-US',
    autoDetectLanguage: options.autoDetectLanguage ?? false,
    localEnabled: options.localEnabled ?? true,
    remoteEnabled: options.remoteEnabled ?? true,
    localName: options.localName,
    remoteName: options.remoteName,
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

  // Initialize participant names from config
  if (config.localName) {
    participants.value.set('local', { id: 'local', enabled: true, name: config.localName })
  }
  if (config.remoteName) {
    participants.value.set('remote', { id: 'remote', enabled: true, name: config.remoteName })
  }

  // Computed
  const isTranscribing = computed(() => state.value === 'active')
  const providerName = computed(() => config.provider)

  // Resolve dependencies (use injected or defaults)
  const deps = {
    createKeywordDetector:
      options.dependencies?.createKeywordDetector ?? defaultDependencies.createKeywordDetector,
    createPIIRedactor:
      options.dependencies?.createPIIRedactor ?? defaultDependencies.createPIIRedactor,
    createExporter: options.dependencies?.createExporter ?? defaultDependencies.createExporter,
    providerRegistry:
      options.dependencies?.providerRegistry ?? defaultDependencies.providerRegistry,
  }

  // Feature modules (created via dependency injection)
  const keywordDetector = deps.createKeywordDetector()
  const piiRedactor = deps.createPIIRedactor(options.redaction ?? { enabled: false, patterns: [] })
  const exporter = deps.createExporter()

  // Provider instance
  let provider: TranscriptionProvider | null = null
  // Unsubscribe functions for provider callbacks
  let unsubscribeInterim: (() => void) | null = null
  let unsubscribeFinal: (() => void) | null = null
  let unsubscribeError: (() => void) | null = null

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
    keywordCallbacks.forEach((cb) => cb(match))
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
      // Get provider instance (via injected registry)
      provider = await deps.providerRegistry.get(config.provider, {
        language: config.language,
        interimResults: true,
        ...options.providerOptions,
      })

      // Unsubscribe from previous provider callbacks if any
      if (unsubscribeInterim) {
        unsubscribeInterim()
        unsubscribeInterim = null
      }
      if (unsubscribeFinal) {
        unsubscribeFinal()
        unsubscribeFinal = null
      }
      if (unsubscribeError) {
        unsubscribeError()
        unsubscribeError = null
      }

      // Setup event handlers and store unsubscribe functions
      unsubscribeInterim = provider.onInterim((text, sourceId) => {
        const speakerType = getSpeakerType(sourceId)
        if (isSourceEnabled(speakerType)) {
          currentUtterance.value = text
        }
      })

      unsubscribeFinal = provider.onFinal((result, sourceId) => {
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
        transcriptCallbacks.forEach((cb) => cb(entry))
        options.onTranscript?.(entry)

        logger.debug('Transcript entry added', { id: entry.id, speaker: entry.speaker })
      })

      unsubscribeError = provider.onError((err) => {
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
    // Unsubscribe from provider callbacks to prevent accumulation
    if (unsubscribeInterim) {
      unsubscribeInterim()
      unsubscribeInterim = null
    }
    if (unsubscribeFinal) {
      unsubscribeFinal()
      unsubscribeFinal = null
    }
    if (unsubscribeError) {
      unsubscribeError()
      unsubscribeError = null
    }

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
    const existing = participants.value.get(id)
    if (existing) {
      existing.enabled = true
    } else {
      participants.value.set(id, { id, enabled: true })
    }
  }

  /**
   * Disable transcription for a participant
   */
  function disableParticipant(id: string): void {
    const existing = participants.value.get(id)
    if (existing) {
      existing.enabled = false
    }
  }

  /**
   * Set language for a participant
   */
  function setParticipantLanguage(id: string, language: string): void {
    const existing = participants.value.get(id)
    if (existing) {
      existing.language = language
    } else {
      participants.value.set(id, { id, enabled: true, language })
    }
  }

  /**
   * Set display name for a participant
   */
  function setParticipantName(id: string, name: string): void {
    const existing = participants.value.get(id)
    if (existing) {
      existing.name = name
    } else {
      participants.value.set(id, { id, enabled: true, name })
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
    return transcript.value.filter((entry) => {
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
    setParticipantName,

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
