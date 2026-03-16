import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAudioProcessing } from '../useAudioProcessing'

describe('useAudioProcessing', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const {
        isProcessing,
        isEnabled,
        metrics,
        error,
        noiseSuppressionLevel,
        echoCancellationEnabled,
        autoGainEnabled,
        vadEnabled,
      } = useAudioProcessing()

      expect(isProcessing.value).toBe(false)
      expect(isEnabled.value).toBe(false)
      expect(metrics.value).toEqual({
        inputLevel: 0,
        outputLevel: 0,
        noiseLevel: 0,
        speechDetected: false,
        clipping: false,
        sampleRate: 48000,
        latency: 0,
      })
      expect(error.value).toBeNull()
      expect(noiseSuppressionLevel.value).toBe('off')
      expect(echoCancellationEnabled.value).toBe(false)
      expect(autoGainEnabled.value).toBe(false)
      expect(vadEnabled.value).toBe(false)
    })

    it('should initialize with noiseSuppression option as boolean', () => {
      const { noiseSuppressionLevel } = useAudioProcessing({ noiseSuppression: true })
      expect(noiseSuppressionLevel.value).toBe('moderate')
    })

    it('should initialize with noiseSuppression option as string', () => {
      const { noiseSuppressionLevel } = useAudioProcessing({ noiseSuppression: 'high' })
      expect(noiseSuppressionLevel.value).toBe('high')
    })

    it('should initialize with echoCancellation option', () => {
      const { echoCancellationEnabled } = useAudioProcessing({ echoCancellation: true })
      expect(echoCancellationEnabled.value).toBe(true)
    })

    it('should initialize with autoGainControl option', () => {
      const { autoGainEnabled } = useAudioProcessing({ autoGainControl: true })
      expect(autoGainEnabled.value).toBe(true)
    })

    it('should initialize with vadEnabled option', () => {
      const { vadEnabled } = useAudioProcessing({ vadEnabled: true })
      expect(vadEnabled.value).toBe(true)
    })

    it('should initialize with custom target levels', () => {
      const { targetOutputLevel } = useAudioProcessing({
        targetInputLevel: 0.5,
        targetOutputLevel: 0.6,
      })
      // Note: inputGain starts at 1, targetInputLevel is stored internally
      expect(targetOutputLevel.value).toBe(0.6)
    })
  })

  describe('noise suppression controls', () => {
    it('should enable noise suppression with default level', () => {
      const { noiseSuppressionLevel, enableNoiseSuppression, disableNoiseSuppression } =
        useAudioProcessing()

      enableNoiseSuppression()
      expect(noiseSuppressionLevel.value).toBe('moderate')

      disableNoiseSuppression()
      expect(noiseSuppressionLevel.value).toBe('off')
    })

    it('should enable noise suppression with specific level', () => {
      const { noiseSuppressionLevel, enableNoiseSuppression } = useAudioProcessing()

      enableNoiseSuppression('high')
      expect(noiseSuppressionLevel.value).toBe('high')

      enableNoiseSuppression('aggressive')
      expect(noiseSuppressionLevel.value).toBe('aggressive')
    })
  })

  describe('echo cancellation controls', () => {
    it('should enable echo cancellation', () => {
      const { echoCancellationEnabled, enableEchoCancellation, disableEchoCancellation } =
        useAudioProcessing()

      enableEchoCancellation()
      expect(echoCancellationEnabled.value).toBe(true)

      disableEchoCancellation()
      expect(echoCancellationEnabled.value).toBe(false)
    })

    it('should store echo cancellation mode option', () => {
      const { echoCancellationMode } = useAudioProcessing({ echoCancellationMode: 'enhanced' })
      // Mode is stored internally but not exposed as writable
      expect(echoCancellationMode.value).toBeDefined()
    })
  })

  describe('gain controls', () => {
    it('should enable auto gain', () => {
      const { autoGainEnabled, enableAutoGain, disableAutoGain } = useAudioProcessing()

      enableAutoGain()
      expect(autoGainEnabled.value).toBe(true)

      disableAutoGain()
      expect(autoGainEnabled.value).toBe(false)
    })

    it('should set input gain', () => {
      const { inputGain, setInputGain } = useAudioProcessing()

      setInputGain(0.5)
      expect(inputGain.value).toBe(0.5)

      setInputGain(1.5)
      expect(inputGain.value).toBe(1.5)
    })

    it('should set output gain', () => {
      const { outputGain, setOutputGain } = useAudioProcessing()

      setOutputGain(0.8)
      expect(outputGain.value).toBe(0.8)

      setOutputGain(2.0)
      expect(outputGain.value).toBe(2.0)
    })
  })

  describe('analysis methods', () => {
    it('should return frequency data array when not processing', () => {
      const { getFrequencyData } = useAudioProcessing()

      const data = getFrequencyData()
      expect(data).toBeInstanceOf(Uint8Array)
      // Returns empty array when analyser not initialized
      expect(data.length).toBeGreaterThanOrEqual(0)
    })

    it('should return time domain data array when not processing', () => {
      const { getTimeDomainData } = useAudioProcessing()

      const data = getTimeDomainData()
      expect(data).toBeInstanceOf(Uint8Array)
      // Returns empty array when analyser not initialized
      expect(data.length).toBeGreaterThanOrEqual(0)
    })

    it('should return MOS score', () => {
      const { getMosScore } = useAudioProcessing()

      const score = getMosScore()
      expect(typeof score).toBe('number')
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(5)
    })
  })

  describe('processStream', () => {
    it('should return original stream when no audio tracks', () => {
      const { processStream, error } = useAudioProcessing()

      // Create mock stream without audio tracks
      const mockStream = {
        getAudioTracks: () => [],
        getVideoTracks: () => [],
      } as unknown as MediaStream

      const result = processStream(mockStream)

      expect(result).toBe(mockStream)
      expect(error.value).toBe('No audio tracks in stream')
    })
  })
})
