/**
 * useTranscription composable unit tests
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useTranscription, type TranscriptionOptions } from '../useTranscription'
import type {
  TranscriptionProvider,
  TranscriptEntry,
  KeywordRule,
  KeywordMatch,
  ProviderCapabilities,
  IKeywordDetector,
  IPIIRedactor,
  ITranscriptExporter,
  IProviderRegistry,
} from '@/types/transcription.types'

describe('useTranscription', () => {
  let mockProvider: TranscriptionProvider
  let mockKeywordDetector: IKeywordDetector
  let mockPIIRedactor: IPIIRedactor
  let mockExporter: ITranscriptExporter
  let mockProviderRegistry: IProviderRegistry

  // Mock provider instance
  const createMockProvider = () => {
    const callbacks = {
      onInterim: [] as Array<(text: string, sourceId: string) => void>,
      onFinal: [] as Array<
        (
          result: { text: string; confidence: number; language?: string; words?: string[] },
          sourceId: string
        ) => void
      >,
      onError: [] as Array<(error: Error) => void>,
    }

    mockProvider = {
      capabilities: {
        supportedLanguages: ['en-US', 'sv-SE'],
        maxParticipants: 2,
        supportsStreaming: true,
        supportsPunctuation: true,
        supportsInterimResults: true,
      } as ProviderCapabilities,
      onInterim: vi.fn((cb: (text: string, sourceId: string) => void) => {
        callbacks.onInterim.push(cb)
        return () => {
          const idx = callbacks.onInterim.indexOf(cb)
          if (idx !== -1) callbacks.onInterim.splice(idx, 1)
        }
      }),
      onFinal: vi.fn(
        (
          cb: (
            result: { text: string; confidence: number; language?: string; words?: string[] },
            sourceId: string
          ) => void
        ) => {
          callbacks.onFinal.push(cb)
          return () => {
            const idx = callbacks.onFinal.indexOf(cb)
            if (idx !== -1) callbacks.onFinal.splice(idx, 1)
          }
        }
      ),
      onError: vi.fn((cb: (error: Error) => void) => {
        callbacks.onError.push(cb)
        return () => {
          const idx = callbacks.onError.indexOf(cb)
          if (idx !== -1) callbacks.onError.splice(idx, 1)
        }
      }),
      startStream: vi.fn(),
      stopStream: vi.fn(),
    }

    // Expose trigger functions for testing
    ;(mockProvider as any)._triggerInterim = (text: string, sourceId: string) => {
      callbacks.onInterim.forEach((cb) => cb(text, sourceId))
    }
    ;(mockProvider as any)._triggerFinal = (
      result: { text: string; confidence: number; language?: string; words?: string[] },
      sourceId: string
    ) => {
      callbacks.onFinal.forEach((cb) => cb(result, sourceId))
    }
    ;(mockProvider as any)._triggerError = (error: Error) => {
      callbacks.onError.forEach((cb) => cb(error))
    }

    return mockProvider
  }

  // Mock keyword detector
  const createMockKeywordDetector = () => {
    const rules: KeywordRule[] = []
    mockKeywordDetector = {
      addRule: vi.fn((rule: Omit<KeywordRule, 'id'>) => {
        const id = `rule-${Date.now()}`
        rules.push({ ...rule, id })
        return id
      }),
      removeRule: vi.fn((id: string) => {
        const idx = rules.findIndex((r) => r.id === id)
        if (idx !== -1) rules.splice(idx, 1)
      }),
      getRules: vi.fn(() => [...rules]),
      detect: vi.fn(),
      onMatch: vi.fn((_cb: (match: KeywordMatch) => void) => {
        return () => {}
      }),
      dispose: vi.fn(),
    }
    return mockKeywordDetector
  }

  // Mock PII Redactor
  const createMockPIIRedactor = () => {
    let enabled = false
    mockPIIRedactor = {
      isEnabled: vi.fn(() => enabled),
      enable: vi.fn(() => {
        enabled = true
      }),
      disable: vi.fn(() => {
        enabled = false
      }),
      redactEntry: vi.fn((entry: TranscriptEntry) => entry),
      redactText: vi.fn((text: string) => text),
      dispose: vi.fn(),
    }
    return mockPIIRedactor
  }

  // Mock exporter
  const createMockExporter = () => {
    mockExporter = {
      export: vi.fn((transcript: TranscriptEntry[], format: string, _options?: unknown) => {
        if (format === 'json') return JSON.stringify(transcript)
        if (format === 'text') return transcript.map((t) => t.text).join('\n')
        return ''
      }),
      dispose: vi.fn(),
    }
    return mockExporter
  }

  // Mock provider registry
  const createMockProviderRegistry = () => {
    mockProviderRegistry = {
      has: vi.fn((name: string) => name === 'test-provider'),
      register: vi.fn(),
      get: vi.fn().mockResolvedValue(createMockProvider()),
      list: vi.fn(() => ['test-provider']),
      unregister: vi.fn(),
    }
    return mockProviderRegistry
  }

  let defaultOptions: TranscriptionOptions

  beforeEach(() => {
    vi.clearAllMocks()
    defaultOptions = {
      provider: 'test-provider',
      language: 'en-US',
      localEnabled: true,
      remoteEnabled: true,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const result = useTranscription({})

      expect(result.state.value).toBe('idle')
      expect(result.isTranscribing.value).toBe(false)
      expect(result.transcript.value).toHaveLength(0)
      expect(result.currentUtterance.value).toBe('')
      expect(result.error.value).toBeNull()
    })

    it('should initialize with custom options', () => {
      const options: TranscriptionOptions = {
        provider: 'custom-provider',
        language: 'sv-SE',
        localName: 'Local User',
        remoteName: 'Remote User',
      }

      const result = useTranscription(options)

      expect(result.provider.value).toBe('custom-provider')
      expect(result.localEnabled.value).toBe(true)
      expect(result.remoteEnabled.value).toBe(true)
    })

    it('should accept custom dependencies', () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const result = useTranscription({ dependencies: deps })

      expect(result).toBeDefined()
      expect(mockProviderRegistry.register).toBeDefined()
    })
  })

  describe('start/stop', () => {
    it('should start transcription and transition to active state', async () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()

      expect(result.state.value).toBe('active')
      expect(result.isTranscribing.value).toBe(true)
    })

    it('should stop transcription and transition to idle', async () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()
      result.stop()

      expect(result.state.value).toBe('idle')
      expect(result.isTranscribing.value).toBe(false)
    })

    it('should not start if already active', async () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()
      const initialState = result.state.value

      await result.start()

      expect(result.state.value).toBe(initialState)
    })
  })

  describe('transcript handling', () => {
    it('should add transcript entries when final results received', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const onTranscriptFn = vi.fn()
      const result = useTranscription({
        dependencies: deps,
        ...defaultOptions,
        onTranscript: onTranscriptFn,
      })

      await result.start()

      // Simulate receiving a final transcript
      ;(provider as any)._triggerFinal(
        {
          text: 'Hello world',
          confidence: 0.95,
          language: 'en-US',
        },
        'local'
      )

      await nextTick()

      expect(result.transcript.value).toHaveLength(1)
      expect(result.transcript.value[0].text).toBe('Hello world')
      expect(result.transcript.value[0].speaker).toBe('local')
      expect(onTranscriptFn).toHaveBeenCalled()
    })

    it('should update current utterance on interim results', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()

      // Simulate interim result
      ;(provider as any)._triggerInterim('Hello w', 'local')

      expect(result.currentUtterance.value).toBe('Hello w')
    })

    it('should clear transcript on clear()', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()
      ;(provider as any)._triggerFinal({ text: 'Test', confidence: 0.9 }, 'local')

      await nextTick()
      expect(result.transcript.value).toHaveLength(1)

      result.clear()

      expect(result.transcript.value).toHaveLength(0)
      expect(result.currentUtterance.value).toBe('')
    })
  })

  describe('participant management', () => {
    it('should enable and disable participants', () => {
      const result = useTranscription({})

      result.enableParticipant('local')
      expect(result.participants.value.get('local')?.enabled).toBe(true)

      result.disableParticipant('local')
      expect(result.participants.value.get('local')?.enabled).toBe(false)
    })

    it('should set participant name', () => {
      const result = useTranscription({})

      result.setParticipantName('local', 'John Doe')
      expect(result.participants.value.get('local')?.name).toBe('John Doe')
    })

    it('should initialize with config names', () => {
      const result = useTranscription({
        localName: 'Local User',
        remoteName: 'Remote User',
      })

      expect(result.participants.value.get('local')?.name).toBe('Local User')
      expect(result.participants.value.get('remote')?.name).toBe('Remote User')
    })
  })

  describe('local/remote toggles', () => {
    it('should respect localEnabled toggle', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({
        dependencies: deps,
        ...defaultOptions,
        localEnabled: false,
      })

      await result.start()

      // Local should be disabled
      expect(result.localEnabled.value).toBe(false)

      // Trigger final - local should not be processed
      ;(provider as any)._triggerFinal({ text: 'Hello', confidence: 0.9 }, 'local')

      await nextTick()
      expect(result.transcript.value).toHaveLength(0)
    })
  })

  describe('keywords', () => {
    it('should add keyword rules', () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      const ruleId = result.addKeyword({ phrase: 'help', action: 'assist' })
      expect(ruleId).toBeDefined()
      expect(mockKeywordDetector.addRule).toHaveBeenCalled()
    })

    it('should remove keyword rules', () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      const ruleId = result.addKeyword({ phrase: 'help', action: 'assist' })
      result.removeKeyword(ruleId)

      expect(mockKeywordDetector.removeRule).toHaveBeenCalledWith(ruleId)
    })

    it('should get all keyword rules', () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      result.addKeyword({ phrase: 'help', action: 'assist' })
      result.addKeyword({ phrase: 'urgent', action: 'escalate' })

      const rules = result.getKeywords()
      expect(rules).toHaveLength(2)
    })
  })

  describe('export', () => {
    it('should export transcript in JSON format', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()
      ;(provider as any)._triggerFinal({ text: 'Test message', confidence: 0.9 }, 'local')
      await nextTick()

      const jsonOutput = result.exportTranscript('json')
      expect(jsonOutput).toContain('Test message')
      expect(mockExporter.export).toHaveBeenCalled()
    })

    it('should export transcript in text format', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()
      ;(provider as any)._triggerFinal({ text: 'Hello world', confidence: 0.9 }, 'local')
      await nextTick()

      const textOutput = result.exportTranscript('text')
      expect(textOutput).toBe('Hello world')
    })
  })

  describe('search', () => {
    it('should search transcript entries', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()
      ;(provider as any)._triggerFinal({ text: 'Hello world', confidence: 0.9 }, 'local')
      ;(provider as any)._triggerFinal({ text: 'Goodbye world', confidence: 0.9 }, 'remote')
      await nextTick()

      const searchResults = result.searchTranscript('Hello')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].text).toBe('Hello world')
    })

    it('should filter search by speaker', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()
      ;(provider as any)._triggerFinal({ text: 'Hello world', confidence: 0.9 }, 'local')
      ;(provider as any)._triggerFinal({ text: 'Hello there', confidence: 0.9 }, 'remote')
      await nextTick()

      const searchResults = result.searchTranscript('Hello', { speaker: 'local' })
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].speaker).toBe('local')
    })
  })

  describe('callbacks', () => {
    it('should register and call onTranscript callback', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const callback = vi.fn()
      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      const unsubscribe = result.onTranscript(callback)

      await result.start()
      ;(provider as any)._triggerFinal({ text: 'Test', confidence: 0.9 }, 'local')
      await nextTick()

      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()
      ;(provider as any)._triggerFinal({ text: 'Test 2', confidence: 0.9 }, 'local')
      await nextTick()

      expect(callback).toHaveBeenCalledTimes(1) // Should not increase
    })

    it('should register and call onKeywordDetected callback', async () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: createMockProviderRegistry(),
      }

      const callback = vi.fn()
      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      const unsubscribe = result.onKeywordDetected(callback)

      // Manually trigger the onMatch callback from keyword detector
      const onMatchCb = (mockKeywordDetector.onMatch as any).mock.calls[0][0]
      onMatchCb({ phrase: 'help', action: 'assist' } as KeywordMatch)

      expect(callback).toHaveBeenCalled()

      unsubscribe()
    })
  })

  describe('error handling', () => {
    it('should handle provider errors', async () => {
      const provider = createMockProvider()
      const errorHandler = vi.fn()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({
        dependencies: deps,
        ...defaultOptions,
        onError: errorHandler,
      })

      await result.start()

      // Simulate error
      ;(provider as any)._triggerError(new Error('Provider error'))

      expect(result.error.value).toBeInstanceOf(Error)
      expect(result.error.value?.message).toBe('Provider error')
      expect(errorHandler).toHaveBeenCalled()
    })

    it('should transition to error state on start failure', async () => {
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockRejectedValue(new Error('Init failed')),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await expect(result.start()).rejects.toThrow('Init failed')
      expect(result.state.value).toBe('error')
    })
  })

  describe('capabilities', () => {
    it('should return provider capabilities when active', async () => {
      const provider = createMockProvider()
      const deps = {
        createKeywordDetector: createMockKeywordDetector,
        createPIIRedactor: createMockPIIRedactor,
        createExporter: createMockExporter,
        providerRegistry: {
          has: vi.fn(() => true),
          register: vi.fn(),
          get: vi.fn().mockResolvedValue(provider),
          list: vi.fn(() => ['test-provider']),
          unregister: vi.fn(),
        },
      }

      const result = useTranscription({ dependencies: deps, ...defaultOptions })

      await result.start()

      const caps = result.getCapabilities()
      expect(caps).not.toBeNull()
      expect(caps?.supportsStreaming).toBe(true)
    })

    it('should return null for capabilities when not active', () => {
      const result = useTranscription({})

      const caps = result.getCapabilities()
      expect(caps).toBeNull()
    })
  })

  describe('language', () => {
    it('should lock detected language', () => {
      const result = useTranscription({})

      result.lockLanguage('sv-SE')

      expect(result.detectedLanguage.value).toBe('sv-SE')
    })
  })
})
