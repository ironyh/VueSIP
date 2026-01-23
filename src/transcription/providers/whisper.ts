/**
 * Whisper transcription provider
 *
 * Connects to a Whisper WebSocket server (faster-whisper, whisper.cpp, etc.)
 * for high-accuracy transcription.
 *
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

const logger = createLogger('WhisperProvider')

/**
 * Whisper provider configuration options
 */
export interface WhisperProviderOptions extends ProviderOptions {
  /** WebSocket server URL (e.g., 'ws://localhost:8765/transcribe') */
  serverUrl?: string
  /** Whisper model to use (tiny, base, small, medium, large) */
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3'
  /** Audio sample rate in Hz (default: 16000) */
  sampleRate?: number
  /** Chunk duration in milliseconds (default: 1000) */
  chunkDuration?: number
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean
  /** Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number
}

/**
 * Whisper server message types
 */
interface WhisperMessage {
  type: 'transcript' | 'partial' | 'error' | 'ready' | 'config'
  text?: string
  confidence?: number
  language?: string
  is_final?: boolean
  words?: Array<{ word: string; start: number; end: number; confidence?: number }>
  error?: string
}

/**
 * Connection state
 */
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * Transcription provider for Whisper-based servers
 *
 * Supports:
 * - faster-whisper-server
 * - whisper.cpp server
 * - Custom WebSocket Whisper endpoints
 *
 * @example
 * ```ts
 * import { providerRegistry, WhisperProvider } from 'vuesip'
 *
 * providerRegistry.register('whisper', () => new WhisperProvider())
 *
 * const { start } = useTranscription({
 *   provider: 'whisper',
 *   providerOptions: {
 *     serverUrl: 'ws://localhost:8765/transcribe',
 *     model: 'base',
 *     language: 'en',
 *   },
 * })
 * ```
 */
export class WhisperProvider implements TranscriptionProvider {
  readonly name = 'whisper'

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    interimResults: true,
    languageDetection: true,
    multiChannel: false,
    punctuation: true,
    speakerDiarization: false,
    wordTimestamps: true,
    supportedLanguages: [
      'en',
      'zh',
      'de',
      'es',
      'ru',
      'ko',
      'fr',
      'ja',
      'pt',
      'tr',
      'pl',
      'ca',
      'nl',
      'ar',
      'sv',
      'it',
      'id',
      'hi',
      'fi',
      'vi',
      'he',
      'uk',
      'el',
      'ms',
      'cs',
      'ro',
      'da',
      'hu',
      'ta',
      'no',
      'th',
      'ur',
      'hr',
      'bg',
      'lt',
      'la',
      'mi',
      'ml',
      'cy',
      'sk',
      'te',
      'fa',
      'lv',
      'bn',
      'sr',
      'az',
      'sl',
      'kn',
      'et',
      'mk',
      'br',
      'eu',
      'is',
      'hy',
      'ne',
      'mn',
      'bs',
      'kk',
      'sq',
      'sw',
      'gl',
      'mr',
      'pa',
      'si',
      'km',
      'sn',
      'yo',
      'so',
      'af',
      'oc',
      'ka',
      'be',
      'tg',
      'sd',
      'gu',
      'am',
      'yi',
      'lo',
      'uz',
      'fo',
      'ht',
      'ps',
      'tk',
      'nn',
      'mt',
      'sa',
      'lb',
      'my',
      'bo',
      'tl',
      'mg',
      'as',
      'tt',
      'haw',
      'ln',
      'ha',
      'ba',
      'jw',
      'su',
    ],
  }

  // Configuration
  private serverUrl = 'ws://localhost:8765/transcribe'
  private model = 'base'
  private language = 'en'
  private sampleRate = 16000
  private chunkDuration = 1000
  private autoReconnect = true
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // State
  private ws: WebSocket | null = null
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private currentSourceId = ''
  private isRunning = false

  // Audio processing
  private audioContext: AudioContext | null = null
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private audioBuffer: Float32Array[] = []
  private bufferInterval: ReturnType<typeof setInterval> | null = null

  // Callbacks
  private interimCallbacks: Array<(text: string, sourceId: string) => void> = []
  private finalCallbacks: Array<(result: TranscriptResult, sourceId: string) => void> = []
  private errorCallbacks: Array<(error: Error) => void> = []

  /**
   * Initialize the Whisper provider
   */
  async initialize(options: WhisperProviderOptions): Promise<void> {
    // Apply configuration
    this.serverUrl = options.serverUrl || this.serverUrl
    this.model = options.model || this.model
    this.language = (options.language as string) || this.language
    this.sampleRate = options.sampleRate || this.sampleRate
    this.chunkDuration = options.chunkDuration || this.chunkDuration
    this.autoReconnect = options.autoReconnect ?? this.autoReconnect
    this.maxReconnectAttempts = options.maxReconnectAttempts || this.maxReconnectAttempts
    this.reconnectDelay = options.reconnectDelay || this.reconnectDelay

    // Create audio context for processing
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate })

    logger.info('Whisper provider initialized', {
      serverUrl: this.serverUrl,
      model: this.model,
      language: this.language,
    })
  }

  /**
   * Connect to the Whisper WebSocket server
   */
  private async connect(): Promise<void> {
    if (this.connectionState === 'connected') return

    this.connectionState = 'connecting'

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl)

        this.ws.onopen = () => {
          this.connectionState = 'connected'
          this.reconnectAttempts = 0

          // Send configuration
          this.sendConfig()

          logger.info('Connected to Whisper server', { url: this.serverUrl })
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (event) => {
          logger.error('WebSocket error', { event })
          const error = new Error('WebSocket connection error')
          this.errorCallbacks.forEach((cb) => cb(error))
        }

        this.ws.onclose = () => {
          this.connectionState = 'disconnected'
          logger.info('Disconnected from Whisper server')

          if (this.isRunning && this.autoReconnect) {
            this.attemptReconnect()
          }
        }

        // Timeout for initial connection
        setTimeout(() => {
          if (this.connectionState === 'connecting') {
            this.ws?.close()
            reject(new Error(`Connection timeout to ${this.serverUrl}`))
          }
        }, 10000)
      } catch (error) {
        this.connectionState = 'error'
        reject(error)
      }
    })
  }

  /**
   * Send configuration to the server
   */
  private sendConfig(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const config = {
      type: 'config',
      model: this.model,
      language: this.language,
      sample_rate: this.sampleRate,
    }

    this.ws.send(JSON.stringify(config))
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const error = new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`)
      this.errorCallbacks.forEach((cb) => cb(error))
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    logger.info('Attempting reconnect', {
      attempt: this.reconnectAttempts,
      delay,
    })

    setTimeout(async () => {
      try {
        await this.connect()
        if (this.isRunning) {
          this.startAudioProcessing()
        }
      } catch {
        this.attemptReconnect()
      }
    }, delay)
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: WhisperMessage = JSON.parse(data)

      switch (message.type) {
        case 'partial':
          if (message.text) {
            const text = message.text
            this.interimCallbacks.forEach((cb) => cb(text, this.currentSourceId))
          }
          break

        case 'transcript':
          if (message.text) {
            const result: TranscriptResult = {
              text: message.text,
              isFinal: message.is_final ?? true,
              confidence: message.confidence,
              language: message.language || this.language,
              words: message.words?.map((w) => ({
                word: w.word,
                startTime: w.start,
                endTime: w.end,
                confidence: w.confidence,
              })),
            }
            this.finalCallbacks.forEach((cb) => cb(result, this.currentSourceId))
            logger.debug('Transcript received', { text: message.text })
          }
          break

        case 'error':
          const error = new Error(message.error || 'Unknown server error')
          this.errorCallbacks.forEach((cb) => cb(error))
          logger.error('Server error', { error: message.error })
          break

        case 'ready':
          logger.debug('Server ready')
          break
      }
    } catch (error) {
      logger.error('Failed to parse server message', { error, data })
    }
  }

  /**
   * Start transcribing an audio source
   */
  startStream(audioSource: AudioSource): void {
    this.currentSourceId = audioSource.id
    this.isRunning = true

    // Connect and start processing
    this.connect()
      .then(() => {
        this.setupAudioProcessing(audioSource.stream)
        this.startAudioProcessing()
        logger.info('Started transcription', { sourceId: audioSource.id })
      })
      .catch((error) => {
        this.errorCallbacks.forEach((cb) => cb(error))
      })
  }

  /**
   * Set up audio processing pipeline
   */
  private setupAudioProcessing(stream: MediaStream): void {
    if (!this.audioContext) return

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    // Create source from media stream
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream)

    // Create script processor for capturing audio data
    // Note: ScriptProcessorNode is deprecated but still widely supported
    // For production, consider using AudioWorkletNode
    const bufferSize = 4096
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)

    this.processor.onaudioprocess = (event) => {
      if (!this.isRunning) return

      const inputData = event.inputBuffer.getChannelData(0)
      // Clone the data as it will be reused
      this.audioBuffer.push(new Float32Array(inputData))
    }

    // Connect the pipeline
    this.mediaStreamSource.connect(this.processor)
    this.processor.connect(this.audioContext.destination)
  }

  /**
   * Start sending audio chunks to the server
   */
  private startAudioProcessing(): void {
    // Send buffered audio at regular intervals
    this.bufferInterval = setInterval(() => {
      this.sendAudioChunk()
    }, this.chunkDuration)
  }

  /**
   * Send accumulated audio data to the server
   */
  private sendAudioChunk(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    if (this.audioBuffer.length === 0) return

    // Concatenate buffered audio
    const totalLength = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0)
    const concatenated = new Float32Array(totalLength)
    let offset = 0
    for (const buffer of this.audioBuffer) {
      concatenated.set(buffer, offset)
      offset += buffer.length
    }
    this.audioBuffer = []

    // Convert Float32 to Int16 PCM (what Whisper expects)
    const pcm16 = this.float32ToPCM16(concatenated)

    // Send as binary
    this.ws.send(pcm16.buffer)
  }

  /**
   * Convert Float32Array audio to Int16 PCM
   */
  private float32ToPCM16(float32: Float32Array): Int16Array {
    const int16 = new Int16Array(float32.length)
    for (let i = 0; i < float32.length; i++) {
      // Clamp and convert to int16 range
      const sample = float32[i] ?? 0
      const s = Math.max(-1, Math.min(1, sample))
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return int16
  }

  /**
   * Stop transcribing
   */
  stopStream(): void {
    this.isRunning = false

    // Stop buffer interval
    if (this.bufferInterval) {
      clearInterval(this.bufferInterval)
      this.bufferInterval = null
    }

    // Send any remaining audio
    this.sendAudioChunk()

    // Send stop message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop' }))
    }

    // Disconnect audio processing
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect()
      this.mediaStreamSource = null
    }

    logger.info('Stopped transcription')
  }

  /**
   * Register interim result callback
   * @returns Unsubscribe function
   */
  onInterim(callback: (text: string, sourceId: string) => void): () => void {
    this.interimCallbacks.push(callback)
    return () => {
      this.interimCallbacks = this.interimCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Register final result callback
   * @returns Unsubscribe function
   */
  onFinal(callback: (result: TranscriptResult, sourceId: string) => void): () => void {
    this.finalCallbacks.push(callback)
    return () => {
      this.finalCallbacks = this.finalCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Register error callback
   * @returns Unsubscribe function
   */
  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.push(callback)
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Detect language from audio sample
   */
  async detectLanguage(): Promise<string> {
    // Whisper handles this server-side
    return this.language
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.capabilities.supportedLanguages]
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.isRunning = false

    if (this.bufferInterval) {
      clearInterval(this.bufferInterval)
      this.bufferInterval = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect()
      this.mediaStreamSource = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.audioBuffer = []
    this.interimCallbacks = []
    this.finalCallbacks = []
    this.errorCallbacks = []

    logger.debug('Provider disposed')
  }
}
