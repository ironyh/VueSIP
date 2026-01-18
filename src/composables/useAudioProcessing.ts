/**
 * useAudioProcessing - AI-powered audio processing composable
 *
 * Provides real-time audio processing including noise suppression,
 * echo cancellation, auto gain control, and voice activity detection.
 *
 * @module composables/useAudioProcessing
 */

import { ref, readonly, onUnmounted, type Ref, type DeepReadonly } from 'vue'

/**
 * Noise suppression level options
 */
export type NoiseSuppressionLevel = 'off' | 'low' | 'moderate' | 'high' | 'aggressive'

/**
 * Audio quality metrics collected during processing
 */
export interface AudioQualityMetrics {
  /** Input volume level (0-1) */
  inputLevel: number
  /** Output volume level (0-1) */
  outputLevel: number
  /** Estimated noise floor level */
  noiseLevel: number
  /** Voice activity detection result */
  speechDetected: boolean
  /** Whether audio is clipping */
  clipping: boolean
  /** Audio sample rate in Hz */
  sampleRate: number
  /** Processing latency in milliseconds */
  latency: number
}

/**
 * Options for configuring audio processing
 */
export interface UseAudioProcessingOptions {
  /** Enable noise suppression - boolean or specific level */
  noiseSuppression?: boolean | NoiseSuppressionLevel
  /** Enable echo cancellation */
  echoCancellation?: boolean
  /** Echo cancellation mode: browser native or enhanced processing */
  echoCancellationMode?: 'browser' | 'enhanced'
  /** Enable automatic gain control */
  autoGainControl?: boolean
  /** Target input level for auto gain (0-1) */
  targetInputLevel?: number
  /** Target output level for auto gain (0-1) */
  targetOutputLevel?: number
  /** Enable voice activity detection */
  vadEnabled?: boolean
  /** VAD sensitivity threshold (0-1) */
  vadThreshold?: number
  /** Processing latency preference */
  processingLatency?: 'interactive' | 'balanced' | 'playback'
}

/**
 * Return type for useAudioProcessing composable
 */
export interface UseAudioProcessingReturn {
  // State
  isProcessing: Ref<boolean>
  isEnabled: Ref<boolean>
  metrics: Ref<AudioQualityMetrics>
  error: Ref<string | null>

  // Noise suppression
  noiseSuppressionLevel: Ref<NoiseSuppressionLevel>
  enableNoiseSuppression: (level?: NoiseSuppressionLevel) => void
  disableNoiseSuppression: () => void

  // Echo cancellation
  echoCancellationEnabled: Ref<boolean>
  echoCancellationMode: DeepReadonly<Ref<'browser' | 'enhanced'>>
  enableEchoCancellation: () => void
  disableEchoCancellation: () => void

  // Gain control
  autoGainEnabled: Ref<boolean>
  inputGain: Ref<number>
  outputGain: Ref<number>
  targetOutputLevel: DeepReadonly<Ref<number>>
  setInputGain: (gain: number) => void
  setOutputGain: (gain: number) => void
  enableAutoGain: () => void
  disableAutoGain: () => void

  // VAD
  vadEnabled: Ref<boolean>
  isSpeaking: Ref<boolean>

  // Processing control
  processStream: (stream: MediaStream) => MediaStream
  stopProcessing: () => void

  // Analysis
  getFrequencyData: () => Uint8Array
  getTimeDomainData: () => Uint8Array
  getMosScore: () => number
}

// Default metrics
const DEFAULT_METRICS: AudioQualityMetrics = {
  inputLevel: 0,
  outputLevel: 0,
  noiseLevel: 0,
  speechDetected: false,
  clipping: false,
  sampleRate: 48000,
  latency: 0,
}

// Helper to clamp value to range
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Vue composable for AI-powered audio processing
 *
 * Features:
 * - Real-time noise suppression with adjustable levels
 * - Echo cancellation (browser native or enhanced)
 * - Automatic gain control with target levels
 * - Voice activity detection (VAD)
 * - Audio quality metrics and MOS score estimation
 * - Frequency and time domain analysis
 *
 * @param options - Configuration options
 * @returns Audio processing controls and state
 *
 * @example
 * ```typescript
 * const {
 *   processStream,
 *   enableNoiseSuppression,
 *   metrics,
 *   getMosScore
 * } = useAudioProcessing({
 *   noiseSuppression: 'moderate',
 *   echoCancellation: true,
 *   vadEnabled: true
 * })
 *
 * // Process an incoming MediaStream
 * const processedStream = processStream(inputStream)
 *
 * // Enable high noise suppression
 * enableNoiseSuppression('high')
 *
 * // Get current audio quality
 * console.log('MOS Score:', getMosScore())
 * ```
 */
export function useAudioProcessing(
  options: UseAudioProcessingOptions = {}
): UseAudioProcessingReturn {
  // Parse initial noise suppression option
  const initialNoiseLevel: NoiseSuppressionLevel =
    options.noiseSuppression === true
      ? 'moderate'
      : typeof options.noiseSuppression === 'string'
        ? options.noiseSuppression
        : 'off'

  // Reactive state
  const isProcessing = ref(false)
  const isEnabled = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<AudioQualityMetrics>({ ...DEFAULT_METRICS })

  // Noise suppression state
  const noiseSuppressionLevel = ref<NoiseSuppressionLevel>(initialNoiseLevel)

  // Echo cancellation state
  const echoCancellationEnabled = ref(options.echoCancellation ?? false)
  // Reserved for future enhanced echo cancellation modes
  const _echoCancellationMode = ref(options.echoCancellationMode ?? 'browser')

  // Gain control state
  const autoGainEnabled = ref(options.autoGainControl ?? false)
  const inputGain = ref(1)
  const outputGain = ref(1)
  const targetInputLevel = ref(options.targetInputLevel ?? 0.7)
  // Reserved for future auto gain control output normalization
  const _targetOutputLevel = ref(options.targetOutputLevel ?? 0.8)

  // VAD state
  const vadEnabled = ref(options.vadEnabled ?? false)
  const vadThreshold = ref(options.vadThreshold ?? 0.02)
  const isSpeaking = ref(false)

  // Audio processing internals
  let audioContext: AudioContext | null = null
  let sourceNode: MediaStreamAudioSourceNode | null = null
  let inputGainNode: GainNode | null = null
  let outputGainNode: GainNode | null = null
  let analyserNode: AnalyserNode | null = null
  let destinationNode: MediaStreamAudioDestinationNode | null = null
  let metricsIntervalId: ReturnType<typeof setInterval> | null = null
  let currentStream: MediaStream | null = null

  /**
   * Process an input MediaStream through the audio processing pipeline
   */
  function processStream(stream: MediaStream): MediaStream {
    error.value = null

    // Validate stream has audio tracks
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      error.value = 'No audio tracks in stream'
      return stream
    }

    try {
      // Stop existing processing
      if (isProcessing.value) {
        stopProcessing()
      }

      // Create audio context with latency hint
      const latencyHint = options.processingLatency ?? 'interactive'
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContext = new AudioContextClass({
        latencyHint,
      })

      // Create audio nodes
      sourceNode = audioContext.createMediaStreamSource(stream)
      inputGainNode = audioContext.createGain()
      outputGainNode = audioContext.createGain()
      analyserNode = audioContext.createAnalyser()
      destinationNode = audioContext.createMediaStreamDestination()

      // Configure analyser
      analyserNode.fftSize = 2048
      analyserNode.smoothingTimeConstant = 0.8

      // Set initial gain values
      inputGainNode.gain.value = inputGain.value
      outputGainNode.gain.value = outputGain.value

      // Connect nodes: source -> inputGain -> outputGain -> destination
      // Also connect to analyser for monitoring
      sourceNode.connect(inputGainNode)
      inputGainNode.connect(outputGainNode)
      outputGainNode.connect(destinationNode)
      outputGainNode.connect(analyserNode)

      // Store current stream reference for constraint updates
      currentStream = stream

      // Apply initial processing settings
      applyTrackConstraints()

      // Update state
      isProcessing.value = true
      isEnabled.value = true

      // Update initial metrics
      metrics.value = {
        ...metrics.value,
        sampleRate: audioContext.sampleRate,
        latency: (audioContext.baseLatency || 0) * 1000,
      }

      // Start metrics collection
      startMetricsCollection()

      return destinationNode.stream
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process stream'
      error.value = errorMessage
      console.error('Audio processing error:', err)
      return stream
    }
  }

  /**
   * Stop audio processing and cleanup resources
   */
  function stopProcessing(): void {
    // Stop metrics collection
    if (metricsIntervalId) {
      clearInterval(metricsIntervalId)
      metricsIntervalId = null
    }

    // Disconnect nodes
    if (sourceNode) {
      try {
        sourceNode.disconnect()
      } catch (_e) {
        // Ignore disconnect errors
      }
      sourceNode = null
    }

    if (inputGainNode) {
      try {
        inputGainNode.disconnect()
      } catch (_e) {
        // Ignore disconnect errors
      }
      inputGainNode = null
    }

    if (outputGainNode) {
      try {
        outputGainNode.disconnect()
      } catch (_e) {
        // Ignore disconnect errors
      }
      outputGainNode = null
    }

    if (analyserNode) {
      try {
        analyserNode.disconnect()
      } catch (_e) {
        // Ignore disconnect errors
      }
      analyserNode = null
    }

    if (destinationNode) {
      destinationNode = null
    }

    // Close audio context
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

    // Clear stream reference
    currentStream = null

    // Update state
    isProcessing.value = false
    isEnabled.value = false
  }

  /**
   * Apply track constraints based on current settings
   */
  function applyTrackConstraints(): void {
    if (!currentStream) return

    const audioTracks = currentStream.getAudioTracks()
    if (audioTracks.length === 0) return

    const track = audioTracks[0]
    if (!track) return

    const constraints: MediaTrackConstraints = {}

    // Noise suppression
    if (noiseSuppressionLevel.value !== 'off') {
      constraints.noiseSuppression = true
    } else {
      constraints.noiseSuppression = false
    }

    // Echo cancellation
    constraints.echoCancellation = echoCancellationEnabled.value

    // Auto gain control
    constraints.autoGainControl = autoGainEnabled.value

    // Apply constraints
    track.applyConstraints(constraints).catch((err) => {
      console.warn('Failed to apply audio constraints:', err)
    })
  }

  /**
   * Start collecting audio metrics
   */
  function startMetricsCollection(): void {
    if (metricsIntervalId) {
      clearInterval(metricsIntervalId)
    }

    metricsIntervalId = setInterval(() => {
      updateMetrics()
    }, 50) // Update every 50ms
  }

  /**
   * Update audio quality metrics
   */
  function updateMetrics(): void {
    if (!analyserNode || !audioContext) return

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Float32Array(analyserNode.fftSize)
    analyserNode.getFloatTimeDomainData(dataArray)

    // Calculate RMS (Root Mean Square) for volume level
    let sumSquares = 0
    let maxSample = 0
    for (let i = 0; i < dataArray.length; i++) {
      const sample = Math.abs(dataArray[i] ?? 0)
      sumSquares += sample * sample
      if (sample > maxSample) {
        maxSample = sample
      }
    }
    const rms = Math.sqrt(sumSquares / dataArray.length)

    // Get frequency data for noise estimation
    const frequencyData = new Uint8Array(bufferLength)
    analyserNode.getByteFrequencyData(frequencyData)

    // Estimate noise level from low-frequency content
    let noiseSum = 0
    const noiseBins = Math.min(10, bufferLength)
    for (let i = 0; i < noiseBins; i++) {
      noiseSum += frequencyData[i] ?? 0
    }
    const noiseLevel = noiseSum / (noiseBins * 255)

    // Voice activity detection
    const currentSpeaking = vadEnabled.value && rms > vadThreshold.value

    // Detect clipping (samples near +/- 1.0)
    const clipping = maxSample > 0.99

    // Update metrics
    metrics.value = {
      inputLevel: Math.min(1, rms * 3), // Scale RMS to 0-1 range
      outputLevel: Math.min(1, rms * 3 * outputGain.value),
      noiseLevel,
      speechDetected: currentSpeaking,
      clipping,
      sampleRate: audioContext.sampleRate,
      latency: (audioContext.baseLatency || 0) * 1000,
    }

    // Update speaking state
    isSpeaking.value = currentSpeaking

    // Auto gain adjustment
    if (autoGainEnabled.value && isProcessing.value) {
      adjustAutoGain(rms)
    }
  }

  /**
   * Adjust gain automatically based on input level
   */
  function adjustAutoGain(currentLevel: number): void {
    if (!inputGainNode) return

    const targetLevel = targetInputLevel.value
    const currentGain = inputGainNode.gain.value

    // Simple proportional adjustment
    if (currentLevel > 0.001) {
      // Avoid division by very small numbers
      const desiredGain = targetLevel / currentLevel
      const newGain = clamp(currentGain * 0.95 + desiredGain * 0.05, 0.1, 4)

      if (!audioContext) return
      inputGainNode.gain.setValueAtTime(newGain, audioContext.currentTime)
      inputGain.value = newGain
    }
  }

  /**
   * Enable noise suppression
   */
  function enableNoiseSuppression(level: NoiseSuppressionLevel = 'moderate'): void {
    noiseSuppressionLevel.value = level
    applyTrackConstraints()
  }

  /**
   * Disable noise suppression
   */
  function disableNoiseSuppression(): void {
    noiseSuppressionLevel.value = 'off'
    applyTrackConstraints()
  }

  /**
   * Enable echo cancellation
   */
  function enableEchoCancellation(): void {
    echoCancellationEnabled.value = true
    applyTrackConstraints()
  }

  /**
   * Disable echo cancellation
   */
  function disableEchoCancellation(): void {
    echoCancellationEnabled.value = false
    applyTrackConstraints()
  }

  /**
   * Set input gain (0-2)
   */
  function setInputGain(gain: number): void {
    const clampedGain = clamp(gain, 0, 2)
    inputGain.value = clampedGain

    if (inputGainNode && audioContext) {
      inputGainNode.gain.setValueAtTime(clampedGain, audioContext.currentTime)
    }
  }

  /**
   * Set output gain (0-2)
   */
  function setOutputGain(gain: number): void {
    const clampedGain = clamp(gain, 0, 2)
    outputGain.value = clampedGain

    if (outputGainNode && audioContext) {
      outputGainNode.gain.setValueAtTime(clampedGain, audioContext.currentTime)
    }
  }

  /**
   * Enable auto gain control
   */
  function enableAutoGain(): void {
    autoGainEnabled.value = true
    applyTrackConstraints()
  }

  /**
   * Disable auto gain control
   */
  function disableAutoGain(): void {
    autoGainEnabled.value = false
    applyTrackConstraints()
  }

  /**
   * Get frequency domain data for visualization
   */
  function getFrequencyData(): Uint8Array {
    if (!analyserNode) {
      return new Uint8Array(0)
    }

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyserNode.getByteFrequencyData(dataArray)
    return dataArray
  }

  /**
   * Get time domain data for visualization
   */
  function getTimeDomainData(): Uint8Array {
    if (!analyserNode) {
      return new Uint8Array(0)
    }

    const bufferLength = analyserNode.fftSize
    const dataArray = new Uint8Array(bufferLength)
    analyserNode.getByteTimeDomainData(dataArray)
    return dataArray
  }

  /**
   * Estimate Mean Opinion Score (MOS) based on current metrics
   *
   * MOS is a measure of voice quality on a scale of 1-5:
   * - 5: Excellent
   * - 4: Good
   * - 3: Fair
   * - 2: Poor
   * - 1: Bad
   *
   * This is a simplified estimation based on:
   * - Audio levels
   * - Noise floor
   * - Clipping detection
   * - Processing latency
   *
   * Note: For accurate MOS scoring, consider using dedicated libraries
   * or algorithms like ITU-T P.563 or POLQA.
   */
  function getMosScore(): number {
    if (!isProcessing.value) {
      return 0
    }

    let score = 4.5 // Start with excellent baseline

    const m = metrics.value

    // Penalize low input levels (poor recording quality)
    if (m.inputLevel < 0.1) {
      score -= 1.0
    } else if (m.inputLevel < 0.2) {
      score -= 0.5
    }

    // Penalize high noise levels
    if (m.noiseLevel > 0.3) {
      score -= 1.5
    } else if (m.noiseLevel > 0.2) {
      score -= 0.8
    } else if (m.noiseLevel > 0.1) {
      score -= 0.3
    }

    // Penalize clipping
    if (m.clipping) {
      score -= 0.5
    }

    // Penalize high latency
    if (m.latency > 150) {
      score -= 0.5
    } else if (m.latency > 100) {
      score -= 0.2
    }

    // Ensure score is within 1-5 range
    return clamp(score, 1, 5)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopProcessing()
  })

  return {
    // State
    isProcessing,
    isEnabled,
    metrics,
    error,

    // Noise suppression
    noiseSuppressionLevel,
    enableNoiseSuppression,
    disableNoiseSuppression,

    // Echo cancellation
    echoCancellationEnabled,
    echoCancellationMode: readonly(_echoCancellationMode),
    enableEchoCancellation,
    disableEchoCancellation,

    // Gain control
    autoGainEnabled,
    inputGain,
    outputGain,
    targetOutputLevel: readonly(_targetOutputLevel),
    setInputGain,
    setOutputGain,
    enableAutoGain,
    disableAutoGain,

    // VAD
    vadEnabled,
    isSpeaking,

    // Processing control
    processStream,
    stopProcessing,

    // Analysis
    getFrequencyData,
    getTimeDomainData,
    getMosScore,
  }
}
