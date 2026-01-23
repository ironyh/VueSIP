/**
 * useTranscription composable unit tests
 * Tests demonstrate how to use dependency injection for easy mocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTranscription } from '@/composables/useTranscription'
import type {
  IKeywordDetector,
  IPIIRedactor,
  ITranscriptExporter,
  IProviderRegistry,
  TranscriptionProvider,
  KeywordRule,
  KeywordMatch,
  TranscriptEntry,
  RedactionConfig,
  RedactionResult,
  ExportFormat,
  ExportOptions,
  ProviderCapabilities,
} from '@/types/transcription.types'
import { withSetup } from '../../utils/test-helpers'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

/**
 * Create a mock keyword detector for testing
 */
function createMockKeywordDetector(): IKeywordDetector {
  const rules: KeywordRule[] = []
  const matchCallbacks: Array<(match: KeywordMatch) => void> = []

  return {
    addRule: vi.fn((rule: Omit<KeywordRule, 'id'>) => {
      const id = `rule-${Date.now()}`
      rules.push({ ...rule, id })
      return id
    }),
    removeRule: vi.fn((id: string) => {
      const index = rules.findIndex((r) => r.id === id)
      if (index !== -1) rules.splice(index, 1)
    }),
    getRules: vi.fn(() => [...rules]),
    detect: vi.fn((entry: TranscriptEntry) => {
      const matches: KeywordMatch[] = []
      for (const rule of rules) {
        const phrase = typeof rule.phrase === 'string' ? rule.phrase : rule.phrase.source
        if (entry.text.toLowerCase().includes(phrase.toLowerCase())) {
          const match: KeywordMatch = {
            rule,
            matchedText: phrase,
            entry,
            position: { start: 0, end: phrase.length },
          }
          matches.push(match)
          matchCallbacks.forEach((cb) => cb(match))
        }
      }
      return matches
    }),
    onMatch: vi.fn((callback: (match: KeywordMatch) => void) => {
      matchCallbacks.push(callback)
      return () => {
        const index = matchCallbacks.indexOf(callback)
        if (index !== -1) matchCallbacks.splice(index, 1)
      }
    }),
    dispose: vi.fn(),
  }
}

/**
 * Create a mock PII redactor for testing
 */
function createMockPIIRedactor(config: Partial<RedactionConfig> = {}): IPIIRedactor {
  let currentConfig: RedactionConfig = {
    enabled: config.enabled ?? false,
    patterns: config.patterns ?? [],
    replacement: config.replacement ?? '[REDACTED]',
    customPatterns: config.customPatterns ?? [],
    onRedacted: config.onRedacted,
  }

  return {
    isEnabled: vi.fn(() => currentConfig.enabled),
    configure: vi.fn((newConfig: Partial<RedactionConfig>) => {
      currentConfig = { ...currentConfig, ...newConfig }
    }),
    redact: vi.fn((text: string): RedactionResult => {
      if (!currentConfig.enabled) {
        return { original: text, redacted: text, detections: [] }
      }
      // Simple mock redaction - replace any 4-digit number
      const redacted = text.replace(/\d{4}/g, currentConfig.replacement ?? '[REDACTED]')
      return { original: text, redacted, detections: [] }
    }),
    redactEntry: vi.fn((entry: TranscriptEntry): TranscriptEntry => {
      if (!currentConfig.enabled) {
        return entry
      }
      const redacted = entry.text.replace(/\d{4}/g, currentConfig.replacement ?? '[REDACTED]')
      return { ...entry, text: redacted }
    }),
    dispose: vi.fn(),
  }
}

/**
 * Create a mock transcript exporter for testing
 */
function createMockExporter(): ITranscriptExporter {
  return {
    export: vi.fn(
      (entries: TranscriptEntry[], format: ExportFormat, _options?: ExportOptions): string => {
        if (format === 'json') {
          return JSON.stringify(entries)
        }
        if (format === 'txt') {
          return entries.map((e) => `${e.speaker}: ${e.text}`).join('\n')
        }
        return `Exported ${entries.length} entries as ${format}`
      }
    ),
  }
}

/**
 * Create a mock transcription provider for testing
 */
function createMockProvider(): TranscriptionProvider {
  let interimCallback: ((text: string, sourceId: string) => void) | null = null
  let finalCallback: ((result: any, sourceId: string) => void) | null = null
  let errorCallback: ((error: Error) => void) | null = null

  const provider: TranscriptionProvider = {
    name: 'mock-provider',
    capabilities: {
      streaming: true,
      interimResults: true,
      languageDetection: false,
      multiChannel: false,
      punctuation: true,
      speakerDiarization: false,
      wordTimestamps: false,
      supportedLanguages: ['en-US'],
    } as ProviderCapabilities,
    initialize: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    startStream: vi.fn(),
    stopStream: vi.fn(),
    onInterim: vi.fn((cb) => {
      interimCallback = cb
      return () => {
        interimCallback = undefined
      }
    }),
    onFinal: vi.fn((cb) => {
      finalCallback = cb
      return () => {
        finalCallback = undefined
      }
    }),
    onError: vi.fn((cb) => {
      errorCallback = cb
      return () => {
        errorCallback = undefined
      }
    }),
    // Test helpers to trigger callbacks
    _emitInterim: (text: string, sourceId: string) => interimCallback?.(text, sourceId),
    _emitFinal: (result: any, sourceId: string) => finalCallback?.(result, sourceId),
    _emitError: (error: Error) => errorCallback?.(error),
  } as TranscriptionProvider & {
    _emitInterim: (text: string, sourceId: string) => void
    _emitFinal: (result: any, sourceId: string) => void
    _emitError: (error: Error) => void
  }

  return provider
}

/**
 * Create a mock provider registry for testing
 */
function createMockProviderRegistry(provider: TranscriptionProvider): IProviderRegistry {
  return {
    has: vi.fn((name: string) => name === 'mock-provider'),
    get: vi.fn().mockResolvedValue(provider),
    getAvailable: vi.fn(() => ['mock-provider']),
  }
}

describe('useTranscription', () => {
  let mockKeywordDetector: IKeywordDetector
  let mockPIIRedactor: IPIIRedactor
  let mockExporter: ITranscriptExporter
  let mockProvider: ReturnType<typeof createMockProvider>
  let mockRegistry: IProviderRegistry

  beforeEach(() => {
    vi.clearAllMocks()
    mockKeywordDetector = createMockKeywordDetector()
    mockPIIRedactor = createMockPIIRedactor()
    mockExporter = createMockExporter()
    mockProvider = createMockProvider()
    mockRegistry = createMockProviderRegistry(mockProvider)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Helper to create useTranscription with all mocks injected
   */
  function createTranscriptionWithMocks(options: Parameters<typeof useTranscription>[0] = {}) {
    return useTranscription({
      ...options,
      dependencies: {
        createKeywordDetector: () => mockKeywordDetector,
        createPIIRedactor: () => mockPIIRedactor,
        createExporter: () => mockExporter,
        providerRegistry: mockRegistry,
        ...options.dependencies,
      },
    })
  }

  describe('initial state', () => {
    it('should have idle state initially', () => {
      const { state, isTranscribing, transcript } = createTranscriptionWithMocks()

      expect(state.value).toBe('idle')
      expect(isTranscribing.value).toBe(false)
      expect(transcript.value).toEqual([])
    })

    it('should have no error initially', () => {
      const { error } = createTranscriptionWithMocks()

      expect(error.value).toBeNull()
    })

    it('should initialize participant names from options', () => {
      const { participants } = createTranscriptionWithMocks({
        localName: 'Agent',
        remoteName: 'Customer',
      })

      expect(participants.value.get('local')?.name).toBe('Agent')
      expect(participants.value.get('remote')?.name).toBe('Customer')
    })
  })

  describe('start/stop', () => {
    it('should start transcription', async () => {
      const { start, state, isTranscribing } = createTranscriptionWithMocks()

      await start()

      expect(mockRegistry.get).toHaveBeenCalledWith('web-speech', expect.any(Object))
      expect(state.value).toBe('active')
      expect(isTranscribing.value).toBe(true)
    })

    it('should stop transcription', async () => {
      const { start, stop, state, isTranscribing } = createTranscriptionWithMocks()

      await start()
      stop()

      expect(mockProvider.stopStream).toHaveBeenCalled()
      expect(state.value).toBe('idle')
      expect(isTranscribing.value).toBe(false)
    })

    it('should not start if already active', async () => {
      const { start, state } = createTranscriptionWithMocks()

      await start()
      await start() // Second call should be ignored

      expect(mockRegistry.get).toHaveBeenCalledTimes(1)
      expect(state.value).toBe('active')
    })

    it('should handle provider initialization error', async () => {
      const errorRegistry = {
        ...mockRegistry,
        get: vi.fn().mockRejectedValue(new Error('Provider not available')),
      }

      const { start, state, error } = useTranscription({
        dependencies: {
          createKeywordDetector: () => mockKeywordDetector,
          createPIIRedactor: () => mockPIIRedactor,
          createExporter: () => mockExporter,
          providerRegistry: errorRegistry,
        },
      })

      await expect(start()).rejects.toThrow('Provider not available')
      expect(state.value).toBe('error')
      expect(error.value?.message).toBe('Provider not available')
    })
  })

  describe('transcript handling', () => {
    it('should add final results to transcript', async () => {
      const { start, transcript } = createTranscriptionWithMocks()

      await start()

      // Simulate a final result
      mockProvider._emitFinal({ text: 'Hello world', confidence: 0.95 }, 'local')

      expect(transcript.value).toHaveLength(1)
      expect(transcript.value[0].text).toBe('Hello world')
      expect(transcript.value[0].speaker).toBe('local')
      expect(transcript.value[0].confidence).toBe(0.95)
    })

    it('should update currentUtterance on interim results', async () => {
      const { start, currentUtterance } = createTranscriptionWithMocks()

      await start()

      mockProvider._emitInterim('Hello wor', 'local')

      expect(currentUtterance.value).toBe('Hello wor')
    })

    it('should clear currentUtterance on final result', async () => {
      const { start, currentUtterance } = createTranscriptionWithMocks()

      await start()

      mockProvider._emitInterim('Hello wor', 'local')
      expect(currentUtterance.value).toBe('Hello wor')

      mockProvider._emitFinal({ text: 'Hello world' }, 'local')
      expect(currentUtterance.value).toBe('')
    })

    it('should clear transcript', async () => {
      const { start, clear, transcript } = createTranscriptionWithMocks()

      await start()
      mockProvider._emitFinal({ text: 'Test' }, 'local')
      expect(transcript.value).toHaveLength(1)

      clear()
      expect(transcript.value).toEqual([])
    })
  })

  describe('keyword detection', () => {
    it('should add keyword rules', () => {
      const { addKeyword, getKeywords } = createTranscriptionWithMocks({
        keywords: [{ phrase: 'help', action: 'assist' }],
      })

      addKeyword({ phrase: 'urgent', action: 'escalate' })

      expect(mockKeywordDetector.addRule).toHaveBeenCalledTimes(2)
      expect(getKeywords()).toHaveLength(2)
    })

    it('should remove keyword rules', () => {
      const { addKeyword, removeKeyword } = createTranscriptionWithMocks()

      const id = addKeyword({ phrase: 'test', action: 'test' })
      removeKeyword(id)

      expect(mockKeywordDetector.removeRule).toHaveBeenCalledWith(id)
    })

    it('should detect keywords in transcript entries', async () => {
      const onKeywordDetected = vi.fn()
      const { start } = createTranscriptionWithMocks({
        keywords: [{ phrase: 'help', action: 'assist' }],
        onKeywordDetected,
      })

      await start()
      mockProvider._emitFinal({ text: 'I need help please' }, 'remote')

      expect(mockKeywordDetector.detect).toHaveBeenCalled()
    })
  })

  describe('PII redaction', () => {
    it('should redact PII when enabled', async () => {
      const piiRedactor = createMockPIIRedactor({ enabled: true, patterns: ['credit-card'] })

      const { start, transcript } = useTranscription({
        redaction: { enabled: true, patterns: ['credit-card'] },
        dependencies: {
          createKeywordDetector: () => mockKeywordDetector,
          createPIIRedactor: () => piiRedactor,
          createExporter: () => mockExporter,
          providerRegistry: mockRegistry,
        },
      })

      await start()
      mockProvider._emitFinal({ text: 'My card is 1234-5678-9012-3456' }, 'remote')

      expect(piiRedactor.redactEntry).toHaveBeenCalled()
      expect(transcript.value[0].text).toContain('[REDACTED]')
    })

    it('should not redact when disabled', async () => {
      const { start, transcript } = createTranscriptionWithMocks({
        redaction: { enabled: false, patterns: [] },
      })

      await start()
      mockProvider._emitFinal({ text: 'My card is 1234' }, 'remote')

      expect(transcript.value[0].text).toBe('My card is 1234')
    })
  })

  describe('export functionality', () => {
    it('should export transcript as JSON', async () => {
      const { start, exportTranscript } = createTranscriptionWithMocks()

      await start()
      mockProvider._emitFinal({ text: 'Hello' }, 'local')

      const exported = exportTranscript('json')

      expect(mockExporter.export).toHaveBeenCalledWith(expect.any(Array), 'json', undefined)
      expect(exported).toContain('Hello')
    })

    it('should export transcript as TXT', async () => {
      const { start, exportTranscript } = createTranscriptionWithMocks()

      await start()
      mockProvider._emitFinal({ text: 'Hello' }, 'local')

      const exported = exportTranscript('txt', { includeSpeakers: true })

      expect(mockExporter.export).toHaveBeenCalledWith(expect.any(Array), 'txt', {
        includeSpeakers: true,
      })
      expect(exported).toContain('local: Hello')
    })
  })

  describe('participant management', () => {
    it('should enable/disable participants', () => {
      const { enableParticipant, disableParticipant, participants } = createTranscriptionWithMocks()

      enableParticipant('remote')
      expect(participants.value.get('remote')?.enabled).toBe(true)

      disableParticipant('remote')
      expect(participants.value.get('remote')?.enabled).toBe(false)
    })

    it('should set participant name', () => {
      const { setParticipantName, participants } = createTranscriptionWithMocks()

      setParticipantName('local', 'John Agent')

      expect(participants.value.get('local')?.name).toBe('John Agent')
    })

    it('should set participant language', () => {
      const { setParticipantLanguage, participants } = createTranscriptionWithMocks()

      setParticipantLanguage('remote', 'es-ES')

      expect(participants.value.get('remote')?.language).toBe('es-ES')
    })

    it('should not transcribe disabled participants', async () => {
      const { start, transcript, localEnabled } = createTranscriptionWithMocks()

      await start()
      localEnabled.value = false

      mockProvider._emitFinal({ text: 'Ignored' }, 'local')

      expect(transcript.value).toHaveLength(0)
    })
  })

  describe('search functionality', () => {
    it('should search transcript by query', async () => {
      const { start, searchTranscript } = createTranscriptionWithMocks()

      await start()
      mockProvider._emitFinal({ text: 'Hello world' }, 'local')
      mockProvider._emitFinal({ text: 'Goodbye world' }, 'remote')

      const results = searchTranscript('Hello')

      expect(results).toHaveLength(1)
      expect(results[0].text).toBe('Hello world')
    })

    it('should search transcript by speaker', async () => {
      const { start, searchTranscript } = createTranscriptionWithMocks()

      await start()
      mockProvider._emitFinal({ text: 'Hello world' }, 'local')
      mockProvider._emitFinal({ text: 'Hello there' }, 'remote')

      const results = searchTranscript('Hello', { speaker: 'remote' })

      expect(results).toHaveLength(1)
      expect(results[0].speaker).toBe('remote')
    })
  })

  describe('provider switching', () => {
    it('should switch provider', async () => {
      const { start, switchProvider, provider } = createTranscriptionWithMocks()

      await start()
      await switchProvider('new-provider')

      expect(provider.value).toBe('new-provider')
      expect(mockRegistry.get).toHaveBeenCalledTimes(2)
    })

    it('should get provider capabilities', async () => {
      const { start, getCapabilities } = createTranscriptionWithMocks()

      expect(getCapabilities()).toBeNull() // Before start

      await start()

      const caps = getCapabilities()
      expect(caps?.streaming).toBe(true)
      expect(caps?.interimResults).toBe(true)
    })
  })

  describe('language handling', () => {
    it('should lock language', () => {
      const { lockLanguage, detectedLanguage } = createTranscriptionWithMocks()

      lockLanguage('fr-FR')

      expect(detectedLanguage.value).toBe('fr-FR')
    })
  })

  describe('event callbacks', () => {
    it('should call onTranscript callback', async () => {
      const onTranscript = vi.fn()
      const { start } = createTranscriptionWithMocks({ onTranscript })

      await start()
      mockProvider._emitFinal({ text: 'Test' }, 'local')

      expect(onTranscript).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test',
          speaker: 'local',
        })
      )
    })

    it('should call onError callback', async () => {
      const onError = vi.fn()
      const { start } = createTranscriptionWithMocks({ onError })

      await start()
      mockProvider._emitError(new Error('Test error'))

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should register and unregister transcript callbacks', async () => {
      const { start, onTranscript } = createTranscriptionWithMocks()
      const callback = vi.fn()

      await start()

      const unsubscribe = onTranscript(callback)
      mockProvider._emitFinal({ text: 'First' }, 'local')
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      mockProvider._emitFinal({ text: 'Second' }, 'local')
      expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should register and unregister keyword callbacks', async () => {
      const { start, onKeywordDetected, addKeyword } = createTranscriptionWithMocks()
      const callback = vi.fn()

      addKeyword({ phrase: 'test', action: 'test' })

      const unsubscribe = onKeywordDetected(callback)

      await start()
      mockProvider._emitFinal({ text: 'This is a test' }, 'local')

      // Callback should have been registered
      expect(mockKeywordDetector.onMatch).toHaveBeenCalled()

      unsubscribe()
    })
  })

  describe('cleanup on unmount', () => {
    it('should dispose resources when component unmounts', async () => {
      const { result, unmount } = withSetup(() =>
        useTranscription({
          dependencies: {
            createKeywordDetector: () => mockKeywordDetector,
            createPIIRedactor: () => mockPIIRedactor,
            createExporter: () => mockExporter,
            providerRegistry: mockRegistry,
          },
        })
      )

      await result.start()
      unmount()

      expect(mockKeywordDetector.dispose).toHaveBeenCalled()
      expect(mockPIIRedactor.dispose).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle provider errors', async () => {
      const { start, error } = createTranscriptionWithMocks()

      await start()
      mockProvider._emitError(new Error('Recognition error'))

      expect(error.value?.message).toBe('Recognition error')
    })

    it('should handle non-Error exceptions during start', async () => {
      const errorRegistry = {
        ...mockRegistry,
        get: vi.fn().mockRejectedValue('String error'),
      }

      const { start, state, error } = useTranscription({
        dependencies: {
          createKeywordDetector: () => mockKeywordDetector,
          createPIIRedactor: () => mockPIIRedactor,
          createExporter: () => mockExporter,
          providerRegistry: errorRegistry,
        },
      })

      await expect(start()).rejects.toBe('String error')
      expect(state.value).toBe('error')
      expect(error.value?.message).toBe('String error')
    })
  })
})
