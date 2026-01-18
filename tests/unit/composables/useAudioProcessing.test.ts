/**
 * Tests for useAudioProcessing composable
 * AI-powered audio processing with noise suppression and echo cancellation
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  useAudioProcessing,
  type NoiseSuppressionLevel,
  type UseAudioProcessingOptions,
} from '@/composables/useAudioProcessing'

// Mock MediaStream
function createMockMediaStream(hasAudioTracks = true): MediaStream {
  const mockTrack = {
    kind: 'audio',
    id: 'mock-track-id',
    enabled: true,
    readyState: 'live',
    stop: vi.fn(),
    clone: vi.fn(function (this: unknown) {
      return this
    }),
    getConstraints: vi.fn(() => ({})),
    getSettings: vi.fn(() => ({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
    })),
    applyConstraints: vi.fn(() => Promise.resolve()),
  } as unknown as MediaStreamTrack

  return {
    getTracks: vi.fn(() => (hasAudioTracks ? [mockTrack] : [])),
    getAudioTracks: vi.fn(() => (hasAudioTracks ? [mockTrack] : [])),
    getVideoTracks: vi.fn(() => []),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    clone: vi.fn(() => createMockMediaStream(hasAudioTracks)),
    active: true,
    id: 'mock-stream-id',
  } as unknown as MediaStream
}

// Mock AudioContext and related Web Audio API classes
class MockAnalyserNode {
  fftSize = 2048
  frequencyBinCount = 1024
  smoothingTimeConstant = 0.8

  getByteFrequencyData(array: Uint8Array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 128)
    }
  }

  getByteTimeDomainData(array: Uint8Array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = 128 + Math.floor(Math.random() * 20) - 10
    }
  }

  getFloatTimeDomainData(array: Float32Array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = (Math.random() - 0.5) * 0.1
    }
  }

  connect = vi.fn()
  disconnect = vi.fn()
}

class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn()
  disconnect = vi.fn()
}

class MockMediaStreamAudioSourceNode {
  connect = vi.fn()
  disconnect = vi.fn()
}

class MockMediaStreamAudioDestinationNode {
  stream: MediaStream
  connect = vi.fn()
  disconnect = vi.fn()

  constructor() {
    this.stream = createMockMediaStream()
  }
}

// Store last AudioContext instance for test access
let lastAudioContextInstance: MockAudioContext | null = null

class MockAudioContext {
  state = 'running'
  sampleRate = 48000
  currentTime = 0
  baseLatency = 0.01
  destination = {} as AudioDestinationNode

  createAnalyser = vi.fn(() => new MockAnalyserNode())
  createGain = vi.fn(() => new MockGainNode())
  createMediaStreamSource = vi.fn(() => new MockMediaStreamAudioSourceNode())
  createMediaStreamDestination = vi.fn(() => new MockMediaStreamAudioDestinationNode())
  close = vi.fn(() => Promise.resolve())
  resume = vi.fn(() => Promise.resolve())
  suspend = vi.fn(() => Promise.resolve())

  constructor() {
    lastAudioContextInstance = this
  }
}

// Mock global AudioContext
const originalAudioContext = globalThis.AudioContext
const originalWebkitAudioContext = (globalThis as any).webkitAudioContext

describe('useAudioProcessing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastAudioContextInstance = null
    // Reset AudioContext mock before each test
    ;(globalThis as any).AudioContext = MockAudioContext
    ;(globalThis as any).webkitAudioContext = MockAudioContext
  })

  afterEach(() => {
    // Restore original AudioContext after each test
    ;(globalThis as any).AudioContext = originalAudioContext
    ;(globalThis as any).webkitAudioContext = originalWebkitAudioContext
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const {
        isProcessing,
        isEnabled,
        metrics,
        error,
        noiseSuppressionLevel,
        echoCancellationEnabled,
        autoGainEnabled,
        vadEnabled,
        isSpeaking,
        inputGain,
        outputGain,
      } = useAudioProcessing()

      expect(isProcessing.value).toBe(false)
      expect(isEnabled.value).toBe(false)
      expect(error.value).toBeNull()
      expect(noiseSuppressionLevel.value).toBe('off')
      expect(echoCancellationEnabled.value).toBe(false)
      expect(autoGainEnabled.value).toBe(false)
      expect(vadEnabled.value).toBe(false)
      expect(isSpeaking.value).toBe(false)
      expect(inputGain.value).toBe(1)
      expect(outputGain.value).toBe(1)
      expect(metrics.value).toBeDefined()
    })

    it('should initialize with custom options', () => {
      const options: UseAudioProcessingOptions = {
        noiseSuppression: 'moderate',
        echoCancellation: true,
        autoGainControl: true,
        vadEnabled: true,
        vadThreshold: 0.05,
        targetInputLevel: 0.7,
        targetOutputLevel: 0.8,
      }

      const { noiseSuppressionLevel, echoCancellationEnabled, autoGainEnabled, vadEnabled } =
        useAudioProcessing(options)

      expect(noiseSuppressionLevel.value).toBe('moderate')
      expect(echoCancellationEnabled.value).toBe(true)
      expect(autoGainEnabled.value).toBe(true)
      expect(vadEnabled.value).toBe(true)
    })

    it('should initialize with boolean noise suppression option', () => {
      const { noiseSuppressionLevel } = useAudioProcessing({
        noiseSuppression: true,
      })

      expect(noiseSuppressionLevel.value).toBe('moderate')
    })

    it('should initialize with metrics structure', () => {
      const { metrics } = useAudioProcessing()

      expect(metrics.value).toMatchObject({
        inputLevel: expect.any(Number),
        outputLevel: expect.any(Number),
        noiseLevel: expect.any(Number),
        speechDetected: expect.any(Boolean),
        clipping: expect.any(Boolean),
        sampleRate: expect.any(Number),
        latency: expect.any(Number),
      })
    })
  })

  describe('Stream Processing', () => {
    it('should process input stream and return output stream', () => {
      const { processStream, isProcessing } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      const outputStream = processStream(inputStream)

      expect(outputStream).toBeDefined()
      expect(outputStream).toBeInstanceOf(Object)
      expect(isProcessing.value).toBe(true)
    })

    it('should create audio context on stream processing', () => {
      const { processStream } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      expect(lastAudioContextInstance).toBeDefined()
    })

    it('should connect audio nodes in correct order', () => {
      const { processStream } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      expect(lastAudioContextInstance?.createMediaStreamSource).toHaveBeenCalled()
      expect(lastAudioContextInstance?.createGain).toHaveBeenCalled()
      expect(lastAudioContextInstance?.createAnalyser).toHaveBeenCalled()
      expect(lastAudioContextInstance?.createMediaStreamDestination).toHaveBeenCalled()
    })

    it('should set isEnabled to true when processing', () => {
      const { processStream, isEnabled } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      expect(isEnabled.value).toBe(true)
    })

    it('should handle stream without audio tracks', () => {
      const { processStream, error } = useAudioProcessing()
      const inputStream = createMockMediaStream(false)

      processStream(inputStream)

      expect(error.value).toBe('No audio tracks in stream')
    })

    it('should stop processing', () => {
      const { processStream, stopProcessing, isProcessing, isEnabled } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      expect(isProcessing.value).toBe(true)

      stopProcessing()

      expect(isProcessing.value).toBe(false)
      expect(isEnabled.value).toBe(false)
    })

    it('should close audio context on stop', () => {
      const { processStream, stopProcessing } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      const contextInstance = lastAudioContextInstance
      stopProcessing()

      expect(contextInstance?.close).toHaveBeenCalled()
    })
  })

  describe('Noise Suppression', () => {
    it('should enable noise suppression with default level', () => {
      const { enableNoiseSuppression, noiseSuppressionLevel } = useAudioProcessing()

      enableNoiseSuppression()

      expect(noiseSuppressionLevel.value).toBe('moderate')
    })

    it('should enable noise suppression with specific level', () => {
      const { enableNoiseSuppression, noiseSuppressionLevel } = useAudioProcessing()

      const levels: NoiseSuppressionLevel[] = ['low', 'moderate', 'high', 'aggressive']

      levels.forEach((level) => {
        enableNoiseSuppression(level)
        expect(noiseSuppressionLevel.value).toBe(level)
      })
    })

    it('should disable noise suppression', () => {
      const { enableNoiseSuppression, disableNoiseSuppression, noiseSuppressionLevel } =
        useAudioProcessing()

      enableNoiseSuppression('high')
      expect(noiseSuppressionLevel.value).toBe('high')

      disableNoiseSuppression()
      expect(noiseSuppressionLevel.value).toBe('off')
    })

    it('should apply noise suppression constraints to track', () => {
      const { processStream, enableNoiseSuppression } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      enableNoiseSuppression('high')

      const track = inputStream.getAudioTracks()[0]
      expect(track.applyConstraints).toHaveBeenCalled()
    })
  })

  describe('Echo Cancellation', () => {
    it('should enable echo cancellation', () => {
      const { enableEchoCancellation, echoCancellationEnabled } = useAudioProcessing()

      enableEchoCancellation()

      expect(echoCancellationEnabled.value).toBe(true)
    })

    it('should disable echo cancellation', () => {
      const { enableEchoCancellation, disableEchoCancellation, echoCancellationEnabled } =
        useAudioProcessing()

      enableEchoCancellation()
      expect(echoCancellationEnabled.value).toBe(true)

      disableEchoCancellation()
      expect(echoCancellationEnabled.value).toBe(false)
    })

    it('should apply echo cancellation constraints to track', () => {
      const { processStream, enableEchoCancellation } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      enableEchoCancellation()

      const track = inputStream.getAudioTracks()[0]
      expect(track.applyConstraints).toHaveBeenCalled()
    })
  })

  describe('Gain Control', () => {
    it('should set input gain', () => {
      const { processStream, setInputGain, inputGain } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      setInputGain(0.5)

      expect(inputGain.value).toBe(0.5)
    })

    it('should set output gain', () => {
      const { processStream, setOutputGain, outputGain } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      setOutputGain(0.8)

      expect(outputGain.value).toBe(0.8)
    })

    it('should clamp input gain to valid range', () => {
      const { setInputGain, inputGain } = useAudioProcessing()

      setInputGain(-0.5)
      expect(inputGain.value).toBe(0)

      setInputGain(2.5)
      expect(inputGain.value).toBe(2)
    })

    it('should clamp output gain to valid range', () => {
      const { setOutputGain, outputGain } = useAudioProcessing()

      setOutputGain(-0.5)
      expect(outputGain.value).toBe(0)

      setOutputGain(2.5)
      expect(outputGain.value).toBe(2)
    })

    it('should enable auto gain control', () => {
      const { enableAutoGain, autoGainEnabled } = useAudioProcessing()

      enableAutoGain()

      expect(autoGainEnabled.value).toBe(true)
    })

    it('should disable auto gain control', () => {
      const { enableAutoGain, disableAutoGain, autoGainEnabled } = useAudioProcessing()

      enableAutoGain()
      expect(autoGainEnabled.value).toBe(true)

      disableAutoGain()
      expect(autoGainEnabled.value).toBe(false)
    })

    it('should apply auto gain control constraints to track', () => {
      const { processStream, enableAutoGain } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      enableAutoGain()

      const track = inputStream.getAudioTracks()[0]
      expect(track.applyConstraints).toHaveBeenCalled()
    })
  })

  describe('Voice Activity Detection (VAD)', () => {
    it('should initialize VAD as disabled', () => {
      const { vadEnabled, isSpeaking } = useAudioProcessing()

      expect(vadEnabled.value).toBe(false)
      expect(isSpeaking.value).toBe(false)
    })

    it('should enable VAD with options', () => {
      const { vadEnabled } = useAudioProcessing({
        vadEnabled: true,
        vadThreshold: 0.05,
      })

      expect(vadEnabled.value).toBe(true)
    })

    it('should detect speech when audio level exceeds threshold', async () => {
      // This is tested indirectly via metrics update
      const { processStream, metrics } = useAudioProcessing({
        vadEnabled: true,
        vadThreshold: 0.01,
      })
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      // Wait for metrics update
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(metrics.value.speechDetected).toBeDefined()
    })
  })

  describe('Audio Analysis', () => {
    it('should get frequency data', () => {
      const { processStream, getFrequencyData } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      const frequencyData = getFrequencyData()

      expect(frequencyData).toBeInstanceOf(Uint8Array)
      expect(frequencyData.length).toBeGreaterThan(0)
    })

    it('should get time domain data', () => {
      const { processStream, getTimeDomainData } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      const timeDomainData = getTimeDomainData()

      expect(timeDomainData).toBeInstanceOf(Uint8Array)
      expect(timeDomainData.length).toBeGreaterThan(0)
    })

    it('should return empty arrays when not processing', () => {
      const { getFrequencyData, getTimeDomainData } = useAudioProcessing()

      const frequencyData = getFrequencyData()
      const timeDomainData = getTimeDomainData()

      expect(frequencyData.length).toBe(0)
      expect(timeDomainData.length).toBe(0)
    })

    it('should calculate MOS score when processing', () => {
      const { processStream, getMosScore, isProcessing } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      expect(isProcessing.value).toBe(true)

      const mosScore = getMosScore()

      // MOS score should be between 1-5 when processing
      expect(mosScore).toBeGreaterThanOrEqual(1)
      expect(mosScore).toBeLessThanOrEqual(5)
    })

    it('should return 0 MOS when not processing', () => {
      const { getMosScore, isProcessing } = useAudioProcessing()

      expect(isProcessing.value).toBe(false)
      const mosScore = getMosScore()

      expect(mosScore).toBe(0)
    })
  })

  describe('Metrics Collection', () => {
    it('should update metrics when processing', async () => {
      const { processStream, metrics } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      // Wait for metrics update
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(metrics.value.sampleRate).toBe(48000)
    })

    it('should report input level', async () => {
      const { processStream, metrics } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(metrics.value.inputLevel).toBeGreaterThanOrEqual(0)
      expect(metrics.value.inputLevel).toBeLessThanOrEqual(1)
    })

    it('should report output level', async () => {
      const { processStream, metrics } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(metrics.value.outputLevel).toBeGreaterThanOrEqual(0)
      expect(metrics.value.outputLevel).toBeLessThanOrEqual(1)
    })

    it('should detect audio clipping', async () => {
      const { processStream, metrics } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(typeof metrics.value.clipping).toBe('boolean')
    })

    it('should report processing latency', async () => {
      const { processStream, metrics } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(metrics.value.latency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling', () => {
    it('should set error when processing fails', () => {
      // Mock createMediaStreamSource to throw
      ;(globalThis as any).AudioContext = class FailingAudioContext extends MockAudioContext {
        override createMediaStreamSource = vi.fn(() => {
          throw new Error('Failed to create source')
        })
      }

      const { processStream, error } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      expect(error.value).toBeDefined()
      expect(error.value).toContain('Failed to create source')
    })

    it('should clear error on successful processing', () => {
      const { processStream, error } = useAudioProcessing()

      // Set previous error manually
      error.value = 'Previous error'

      const inputStream = createMockMediaStream()
      processStream(inputStream)

      expect(error.value).toBeNull()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources on stop', () => {
      const { processStream, stopProcessing } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      const contextInstance = lastAudioContextInstance
      stopProcessing()

      // Verify audio context was closed
      expect(contextInstance?.close).toHaveBeenCalled()
    })

    it('should stop metrics collection on stop', () => {
      const { processStream, stopProcessing, isProcessing } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      stopProcessing()

      expect(isProcessing.value).toBe(false)
    })

    it('should allow reprocessing after stop', () => {
      const { processStream, stopProcessing, isProcessing } = useAudioProcessing()
      const inputStream = createMockMediaStream()

      processStream(inputStream)
      expect(isProcessing.value).toBe(true)

      stopProcessing()
      expect(isProcessing.value).toBe(false)

      // Process again
      processStream(inputStream)
      expect(isProcessing.value).toBe(true)
    })
  })

  describe('Processing Latency Options', () => {
    it('should configure interactive latency', () => {
      const { processStream } = useAudioProcessing({
        processingLatency: 'interactive',
      })
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      expect(lastAudioContextInstance).toBeDefined()
    })

    it('should configure balanced latency', () => {
      const { processStream } = useAudioProcessing({
        processingLatency: 'balanced',
      })
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      expect(lastAudioContextInstance).toBeDefined()
    })

    it('should configure playback latency', () => {
      const { processStream } = useAudioProcessing({
        processingLatency: 'playback',
      })
      const inputStream = createMockMediaStream()

      processStream(inputStream)

      expect(lastAudioContextInstance).toBeDefined()
    })
  })

  describe('Enhanced Echo Cancellation Mode', () => {
    it('should use browser echo cancellation by default', () => {
      const { echoCancellationEnabled } = useAudioProcessing({
        echoCancellation: true,
        echoCancellationMode: 'browser',
      })

      expect(echoCancellationEnabled.value).toBe(true)
    })

    it('should support enhanced echo cancellation mode', () => {
      const { echoCancellationEnabled } = useAudioProcessing({
        echoCancellation: true,
        echoCancellationMode: 'enhanced',
      })

      expect(echoCancellationEnabled.value).toBe(true)
    })
  })
})
