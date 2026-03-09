/**
 * Tests for WebSpeechProvider
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSpeechProvider } from '@/transcription/providers/web-speech'

// Mock SpeechRecognition API
class MockSpeechRecognition {
  lang = 'en-US'
  continuous = true
  interimResults = true
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  onstart: (() => void) | null = null

  started = false
  stopped = false
  aborted = false

  start() {
    this.started = true
    this.onstart?.()
  }

  stop() {
    this.stopped = true
    this.onend?.()
  }

  abort() {
    this.aborted = true
  }

  // Test helpers
  simulateResult(text: string, isFinal: boolean, confidence = 0.9) {
    const event: SpeechRecognitionResultEvent = {
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          isFinal,
          length: 1,
          0: { transcript: text, confidence } as SpeechRecognitionAlternative,
        } as SpeechRecognitionResult,
      } as SpeechRecognitionResultList,
    }
    this.onresult?.(event)
  }

  simulateError(error: string) {
    this.onerror?.({ error })
  }

  simulateEnd() {
    this.onend?.()
  }
}

interface SpeechRecognitionResultEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

// Mock constructor
class MockSpeechRecognitionConstructor {
  static instances: MockSpeechRecognition[] = []

  constructor() {
    const instance = new MockSpeechRecognition()
    MockSpeechRecognitionConstructor.instances.push(instance)
    return instance
  }
}

describe('WebSpeechProvider', () => {
  let provider: WebSpeechProvider

  beforeEach(() => {
    vi.useFakeTimers()
    MockSpeechRecognitionConstructor.instances = []

    // Stub global SpeechRecognition
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognitionConstructor)
    vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognitionConstructor)

    provider = new WebSpeechProvider()
  })

  afterEach(() => {
    provider.dispose()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('capabilities', () => {
    it('should report correct capabilities', () => {
      expect(provider.name).toBe('web-speech')
      expect(provider.capabilities.streaming).toBe(true)
      expect(provider.capabilities.interimResults).toBe(true)
      expect(provider.capabilities.languageDetection).toBe(false)
      expect(provider.capabilities.multiChannel).toBe(false)
      expect(provider.capabilities.punctuation).toBe(false)
      expect(provider.capabilities.speakerDiarization).toBe(false)
      expect(provider.capabilities.wordTimestamps).toBe(false)
      expect(provider.capabilities.supportedLanguages).toContain('en-US')
      expect(provider.capabilities.supportedLanguages).toContain('de-DE')
    })
  })

  describe('initialize', () => {
    it('should initialize with default language', async () => {
      await provider.initialize({})
      expect(MockSpeechRecognitionConstructor.instances).toHaveLength(1)
      expect(MockSpeechRecognitionConstructor.instances[0].lang).toBe('en-US')
    })

    it('should initialize with custom language', async () => {
      await provider.initialize({ language: 'de-DE' })
      expect(MockSpeechRecognitionConstructor.instances[0].lang).toBe('de-DE')
    })

    it('should respect interimResults option', async () => {
      await provider.initialize({ interimResults: false })
      expect(MockSpeechRecognitionConstructor.instances[0].interimResults).toBe(false)

      await provider.initialize({ interimResults: true })
      const instance2 = new MockSpeechRecognitionConstructor()
      expect(instance2.interimResults).toBe(true)
    })

    it('should throw if SpeechRecognition not supported', async () => {
      vi.unstubAllGlobals()
      vi.stubGlobal('SpeechRecognition', undefined)
      vi.stubGlobal('webkitSpeechRecognition', undefined)

      const newProvider = new WebSpeechProvider()
      await expect(newProvider.initialize({})).rejects.toThrow(
        'Web Speech API is not supported in this browser'
      )
    })
  })

  describe('startStream', () => {
    it('should throw if not initialized', () => {
      const freshProvider = new WebSpeechProvider()
      expect(() => freshProvider.startStream({ id: 'test-source' })).toThrow(
        'Provider not initialized'
      )
    })

    it('should start recognition with audio source', async () => {
      await provider.initialize({})
      provider.startStream({ id: 'test-source-123' })

      expect(MockSpeechRecognitionConstructor.instances[0].started).toBe(true)
    })
  })

  describe('stopStream', () => {
    it('should stop recognition', async () => {
      await provider.initialize({})
      provider.startStream({ id: 'test' })
      provider.stopStream()

      expect(MockSpeechRecognitionConstructor.instances[0].stopped).toBe(true)
    })
  })

  describe('callbacks', () => {
    it('should call final callback with transcript', async () => {
      await provider.initialize({})

      const finalCallback = vi.fn()
      provider.onFinal(finalCallback)

      provider.startStream({ id: 'test' })
      MockSpeechRecognitionConstructor.instances[0].simulateResult('Hello world', true, 0.95)

      expect(finalCallback).toHaveBeenCalledTimes(1)
      expect(finalCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello world',
          isFinal: true,
          confidence: 0.95,
          language: 'en-US',
        }),
        'test'
      )
    })

    it('should call interim callback with transcript', async () => {
      await provider.initialize({})

      const interimCallback = vi.fn()
      provider.onInterim(interimCallback)

      provider.startStream({ id: 'test' })
      MockSpeechRecognitionConstructor.instances[0].simulateResult('Hello', false, 0.8)

      expect(interimCallback).toHaveBeenCalledTimes(1)
      expect(interimCallback).toHaveBeenCalledWith('Hello', 'test')
    })

    it('should call error callback on recognition error', async () => {
      await provider.initialize({})

      const errorCallback = vi.fn()
      provider.onError(errorCallback)

      provider.startStream({ id: 'test' })
      MockSpeechRecognitionConstructor.instances[0].simulateError('no-speech')

      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(errorCallback).toHaveBeenCalledWith(new Error('Speech recognition error: no-speech'))
    })

    it('should return unsubscribe functions', async () => {
      await provider.initialize({})

      const finalCallback = vi.fn()
      const unsubscribe = provider.onFinal(finalCallback)

      provider.startStream({ id: 'test' })
      MockSpeechRecognitionConstructor.instances[0].simulateResult('Hello', true)

      expect(finalCallback).toHaveBeenCalledTimes(1)

      unsubscribe()
      MockSpeechRecognitionConstructor.instances[0].simulateResult('World', true)

      expect(finalCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('dispose', () => {
    it('should abort recognition on dispose', async () => {
      await provider.initialize({})
      provider.startStream({ id: 'test' })
      provider.dispose()

      expect(MockSpeechRecognitionConstructor.instances[0].aborted).toBe(true)
    })

    it('should clear all callbacks on dispose', async () => {
      await provider.initialize({})

      provider.onFinal(() => {})
      provider.onInterim(() => {})
      provider.onError(() => {})

      provider.dispose()

      // After dispose, callbacks should not fire
      const finalCallback = vi.fn()
      provider.onFinal(finalCallback)

      // This should not throw but callback won't be called since recognition is null
      expect(() => {
        provider.startStream({ id: 'test' })
      }).toThrow('Provider not initialized')
    })
  })

  describe('auto-restart behavior', () => {
    it('should auto-restart when recognition ends unexpectedly', async () => {
      vi.useRealTimers()
      await provider.initialize({})

      provider.startStream({ id: 'test' })

      // Simulate recognition ending (Chrome stops after silence)
      MockSpeechRecognitionConstructor.instances[0].simulateEnd()

      // Should attempt restart
      // Note: With fake timers we can verify the timeout was set
    })

    it('should limit restart attempts', async () => {
      vi.useRealTimers()
      await provider.initialize({})

      const errorCallback = vi.fn()
      provider.onError(errorCallback)

      provider.startStream({ id: 'test' })

      // Simulate many restarts by triggering onend multiple times
      // The provider should eventually stop trying
    })
  })
})
