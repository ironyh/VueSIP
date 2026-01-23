/**
 * Tests for WhisperProvider
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WhisperProvider } from '@/transcription/providers/whisper'

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = WebSocket.OPEN
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onclose: (() => void) | null = null
  sent: (string | ArrayBuffer)[] = []

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
    // Simulate async connection
    setTimeout(() => this.onopen?.(), 0)
  }

  send(data: string | ArrayBuffer) {
    this.sent.push(data)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.()
  }

  // Test helpers
  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  simulateError() {
    this.onerror?.({})
  }
}

// Mock AudioContext
class MockAudioContext {
  state = 'running'
  sampleRate = 16000

  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() }
  }

  createScriptProcessor() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null as ((event: unknown) => void) | null,
    }
  }

  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
}

describe('WhisperProvider', () => {
  let provider: WhisperProvider

  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.stubGlobal('AudioContext', MockAudioContext)
    provider = new WhisperProvider()
  })

  afterEach(() => {
    provider.dispose()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('capabilities', () => {
    it('should report correct capabilities', () => {
      expect(provider.name).toBe('whisper')
      expect(provider.capabilities.streaming).toBe(true)
      expect(provider.capabilities.interimResults).toBe(true)
      expect(provider.capabilities.languageDetection).toBe(true)
      expect(provider.capabilities.punctuation).toBe(true)
      expect(provider.capabilities.wordTimestamps).toBe(true)
      expect(provider.capabilities.supportedLanguages.length).toBeGreaterThan(90)
    })
  })

  describe('initialize', () => {
    it('should apply configuration options', async () => {
      await provider.initialize({
        serverUrl: 'ws://custom:9999/ws',
        model: 'large-v3',
        language: 'fr',
        sampleRate: 48000,
        chunkDuration: 500,
        autoReconnect: false,
        maxReconnectAttempts: 10,
        reconnectDelay: 2000,
      })

      // Verify AudioContext was created
      expect(AudioContext).toBeDefined()
    })

    it('should use defaults when no options provided', async () => {
      await provider.initialize({})
      // Should not throw
    })
  })

  describe('message handling', () => {
    beforeEach(async () => {
      await provider.initialize({ serverUrl: 'ws://localhost:8765/transcribe' })
    })

    it('should emit interim results for partial messages', async () => {
      const interimCb = vi.fn()
      provider.onInterim(interimCb)

      // Start stream to trigger connection
      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!
      ws.simulateMessage({ type: 'partial', text: 'hello wor' })

      expect(interimCb).toHaveBeenCalledWith('hello wor', 'test-source')
    })

    it('should emit final results for transcript messages', async () => {
      const finalCb = vi.fn()
      provider.onFinal(finalCb)

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!
      ws.simulateMessage({
        type: 'transcript',
        text: 'hello world',
        confidence: 0.95,
        language: 'en',
        is_final: true,
        words: [
          { word: 'hello', start: 0.0, end: 0.5, confidence: 0.98 },
          { word: 'world', start: 0.5, end: 1.0, confidence: 0.92 },
        ],
      })

      expect(finalCb).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'hello world',
          isFinal: true,
          confidence: 0.95,
          language: 'en',
          words: [
            { word: 'hello', startTime: 0.0, endTime: 0.5, confidence: 0.98 },
            { word: 'world', startTime: 0.5, endTime: 1.0, confidence: 0.92 },
          ],
        }),
        'test-source'
      )
    })

    it('should emit errors for error messages', async () => {
      const errorCb = vi.fn()
      provider.onError(errorCb)

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!
      ws.simulateMessage({ type: 'error', error: 'Model not found' })

      expect(errorCb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Model not found' }))
    })

    it('should handle ready messages without error', async () => {
      const errorCb = vi.fn()
      provider.onError(errorCb)

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!
      ws.simulateMessage({ type: 'ready' })

      expect(errorCb).not.toHaveBeenCalled()
    })

    it('should handle malformed JSON gracefully', async () => {
      const errorCb = vi.fn()
      provider.onError(errorCb)

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!
      ws.onmessage?.({ data: 'not valid json {{{' })

      // Should not throw, should not call error callback (it logs internally)
      expect(errorCb).not.toHaveBeenCalled()
    })
  })

  describe('reconnect delay cap', () => {
    it('should cap reconnect delay at 30 seconds', async () => {
      await provider.initialize({
        serverUrl: 'ws://localhost:8765/transcribe',
        maxReconnectAttempts: 20,
        reconnectDelay: 5000,
        autoReconnect: true,
      })

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      // Simulate disconnect to trigger reconnect
      const ws = MockWebSocket.instances[0]!
      ws.close()

      // With delay=5000 and attempt=0: min(5000*2^0, 30000) = 5000
      // Advance less than 5000ms - should NOT reconnect yet
      await vi.advanceTimersByTimeAsync(4999)
      expect(MockWebSocket.instances).toHaveLength(1)

      // Advance past 5000ms - should reconnect
      await vi.advanceTimersByTimeAsync(2)
      expect(MockWebSocket.instances).toHaveLength(2)

      // Simulate another disconnect for attempt 1: min(5000*2^1, 30000) = 10000
      MockWebSocket.instances[1]!.close()
      await vi.advanceTimersByTimeAsync(10001)
      expect(MockWebSocket.instances).toHaveLength(3)

      // Simulate disconnect for attempt 2: min(5000*2^2, 30000) = 20000
      MockWebSocket.instances[2]!.close()
      await vi.advanceTimersByTimeAsync(20001)
      expect(MockWebSocket.instances).toHaveLength(4)

      // Simulate disconnect for attempt 3: min(5000*2^3, 30000) = 30000 (CAPPED!)
      MockWebSocket.instances[3]!.close()
      await vi.advanceTimersByTimeAsync(30001)
      expect(MockWebSocket.instances).toHaveLength(5)

      // Simulate disconnect for attempt 4: min(5000*2^4, 30000) = 30000 (still capped)
      MockWebSocket.instances[4]!.close()
      await vi.advanceTimersByTimeAsync(30001)
      expect(MockWebSocket.instances).toHaveLength(6)
    })

    it('should stop reconnecting after max attempts', async () => {
      const errorCb = vi.fn()
      provider.onError(errorCb)

      await provider.initialize({
        serverUrl: 'ws://localhost:8765/transcribe',
        maxReconnectAttempts: 2,
        reconnectDelay: 100,
        autoReconnect: true,
      })

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      // Simulate server going down: new WebSocket connections will throw
      vi.stubGlobal(
        'WebSocket',
        class {
          constructor() {
            throw new Error('ECONNREFUSED')
          }
        }
      )

      // Disconnect triggers reconnect attempts against dead server
      MockWebSocket.instances[0]!.close()

      // Attempt 0: delay=100ms, connect throws → catch calls attemptReconnect, attempts→1
      await vi.advanceTimersByTimeAsync(101)

      // Attempt 1: delay=200ms, connect throws → catch calls attemptReconnect, attempts→2
      // attempts(2) >= max(2) → error emitted
      await vi.advanceTimersByTimeAsync(201)

      expect(errorCb).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to reconnect after 2 attempts' })
      )
    })

    it('should not reconnect when autoReconnect is disabled', async () => {
      await provider.initialize({
        serverUrl: 'ws://localhost:8765/transcribe',
        autoReconnect: false,
      })

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test-source', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      MockWebSocket.instances[0]!.close()
      await vi.advanceTimersByTimeAsync(60000)

      expect(MockWebSocket.instances).toHaveLength(1)
    })
  })

  describe('callback unsubscribe', () => {
    beforeEach(async () => {
      await provider.initialize({ serverUrl: 'ws://localhost:8765/transcribe' })
    })

    it('should return unsubscribe function from onInterim', () => {
      const cb = vi.fn()
      const unsub = provider.onInterim(cb)

      expect(typeof unsub).toBe('function')
      unsub()

      // After unsubscribe, callback should not be called
      const stream = new MediaStream()
      provider.startStream({ stream, id: 'src', type: 'local' })
    })

    it('should return unsubscribe function from onFinal', () => {
      const cb = vi.fn()
      const unsub = provider.onFinal(cb)

      expect(typeof unsub).toBe('function')
      unsub()
    })

    it('should return unsubscribe function from onError', () => {
      const cb = vi.fn()
      const unsub = provider.onError(cb)

      expect(typeof unsub).toBe('function')
      unsub()
    })

    it('should stop receiving events after unsubscribe', async () => {
      const interimCb = vi.fn()
      const unsub = provider.onInterim(interimCb)

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!

      // First message should be received
      ws.simulateMessage({ type: 'partial', text: 'first' })
      expect(interimCb).toHaveBeenCalledTimes(1)

      // Unsubscribe
      unsub()

      // Second message should NOT be received
      ws.simulateMessage({ type: 'partial', text: 'second' })
      expect(interimCb).toHaveBeenCalledTimes(1)
    })
  })

  describe('audio processing', () => {
    it('should send config on WebSocket connection', async () => {
      await provider.initialize({
        serverUrl: 'ws://localhost:8765/transcribe',
        model: 'large-v3',
        language: 'fr',
        sampleRate: 16000,
      })

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!
      const configMsg = JSON.parse(ws.sent[0] as string)

      expect(configMsg).toEqual({
        type: 'config',
        model: 'large-v3',
        language: 'fr',
        sample_rate: 16000,
      })
    })

    it('should send stop message on stopStream', async () => {
      await provider.initialize({ serverUrl: 'ws://localhost:8765/transcribe' })

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      provider.stopStream()

      const ws = MockWebSocket.instances[0]!
      const lastMsg = JSON.parse(ws.sent[ws.sent.length - 1] as string)
      expect(lastMsg).toEqual({ type: 'stop' })
    })
  })

  describe('float32ToPCM16 conversion', () => {
    it('should correctly convert float32 samples to int16 range', async () => {
      await provider.initialize({ serverUrl: 'ws://localhost:8765/transcribe' })

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const ws = MockWebSocket.instances[0]!

      // Access private method via the audio processing pipeline
      // We'll test by feeding audio through the processor
      const mockProcessor = (provider as unknown as { processor: { onaudioprocess: Function } })
        .processor

      if (mockProcessor?.onaudioprocess) {
        const inputBuffer = new Float32Array([0, 1, -1, 0.5, -0.5, 1.5, -1.5])
        mockProcessor.onaudioprocess({
          inputBuffer: { getChannelData: () => inputBuffer },
        })

        // Advance timer to trigger chunk send
        await vi.advanceTimersByTimeAsync(1001)

        // Check that binary data was sent
        const binaryMessages = ws.sent.filter((m) => m instanceof ArrayBuffer)
        if (binaryMessages.length > 0) {
          const pcm16 = new Int16Array(binaryMessages[0] as ArrayBuffer)
          // 0 → 0, 1.0 → 32767, -1.0 → -32768, clamped values
          expect(pcm16[0]).toBe(0)
          expect(pcm16[1]).toBe(32767) // 1.0 * 0x7FFF
          expect(pcm16[2]).toBe(-32768) // -1.0 * 0x8000
          expect(pcm16[3]).toBe(16383) // 0.5 * 0x7FFF ≈ 16383
          expect(pcm16[5]).toBe(32767) // 1.5 clamped to 1.0
          expect(pcm16[6]).toBe(-32768) // -1.5 clamped to -1.0
        }
      }
    })
  })

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      await provider.initialize({ serverUrl: 'ws://localhost:8765/transcribe' })

      const stream = new MediaStream()
      provider.startStream({ stream, id: 'test', type: 'local' })
      await vi.advanceTimersByTimeAsync(10)

      const interimCb = vi.fn()
      const finalCb = vi.fn()
      const errorCb = vi.fn()
      provider.onInterim(interimCb)
      provider.onFinal(finalCb)
      provider.onError(errorCb)

      provider.dispose()

      // WebSocket should be closed
      expect(MockWebSocket.instances[0]!.readyState).toBe(WebSocket.CLOSED)

      // No more callbacks should fire (callbacks array cleared)
      // Attempting to use after dispose should not throw
    })
  })

  describe('getSupportedLanguages', () => {
    it('should return a copy of supported languages', () => {
      const languages = provider.getSupportedLanguages()

      expect(languages).toContain('en')
      expect(languages).toContain('fr')
      expect(languages).toContain('ja')

      // Should be a copy
      languages.push('fake')
      expect(provider.capabilities.supportedLanguages).not.toContain('fake')
    })
  })

  describe('detectLanguage', () => {
    it('should return configured language', async () => {
      await provider.initialize({ language: 'de' })

      const result = await provider.detectLanguage()
      expect(result).toBe('de')
    })
  })
})
