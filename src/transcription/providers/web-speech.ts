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
 * SpeechRecognition API interface
 * Represents the Web Speech API's SpeechRecognition interface
 */
interface SpeechRecognitionAPI {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

/**
 * SpeechRecognition constructor type
 */
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionAPI
}

/**
 * Web Speech API result event type
 */
interface SpeechRecognitionResultEvent {
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
      'en-US',
      'en-GB',
      'en-AU',
      'en-IN',
      'es-ES',
      'es-MX',
      'es-AR',
      'fr-FR',
      'fr-CA',
      'de-DE',
      'de-AT',
      'it-IT',
      'pt-BR',
      'pt-PT',
      'nl-NL',
      'ru-RU',
      'ja-JP',
      'ko-KR',
      'zh-CN',
      'zh-TW',
      'ar-SA',
      'hi-IN',
    ],
  }

  private recognition: SpeechRecognitionAPI | null = null
  private language = 'en-US'
  private currentSourceId = ''
  private isRunning = false
  private restartAttempts = 0
  private restartTimeout: ReturnType<typeof setTimeout> | null = null

  private interimCallbacks: Array<(text: string, sourceId: string) => void> = []
  private finalCallbacks: Array<(result: TranscriptResult, sourceId: string) => void> = []
  private errorCallbacks: Array<(error: Error) => void> = []

  /**
   * Initialize the Web Speech API
   */
  async initialize(options: ProviderOptions): Promise<void> {
    // Check for browser support
    const SpeechRecognitionClass =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition

    if (!SpeechRecognitionClass) {
      throw new Error('Web Speech API is not supported in this browser')
    }

    this.language = (options.language as string) || 'en-US'
    this.recognition = new SpeechRecognitionClass()
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

    this.recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      // Reset backoff on successful recognition
      this.restartAttempts = 0

      const result = event.results[event.resultIndex]
      if (!result) return

      const transcript = result[0]
      if (!transcript) return

      if (result.isFinal) {
        const finalResult: TranscriptResult = {
          text: transcript.transcript,
          isFinal: true,
          confidence: transcript.confidence,
          language: this.language,
        }
        this.finalCallbacks.forEach((cb) => cb(finalResult, this.currentSourceId))
        logger.debug('Final result', { text: transcript.transcript })
      } else {
        this.interimCallbacks.forEach((cb) => cb(transcript.transcript, this.currentSourceId))
      }
    }

    this.recognition.onerror = (event: { error: string }) => {
      const error = new Error(`Speech recognition error: ${event.error}`)
      this.errorCallbacks.forEach((cb) => cb(error))
      logger.error('Speech recognition error', { error: event.error })
    }

    this.recognition.onend = () => {
      // Restart if still supposed to be running (handles Chrome's auto-stop)
      if (this.isRunning && this.recognition) {
        const maxAttempts = 10
        if (this.restartAttempts >= maxAttempts) {
          const error = new Error('Speech recognition restart limit reached')
          this.errorCallbacks.forEach((cb) => cb(error))
          logger.error('Max restart attempts reached', { attempts: this.restartAttempts })
          return
        }

        const delay = Math.min(300 * Math.pow(2, this.restartAttempts), 30000)
        this.restartAttempts++

        logger.debug('Restarting speech recognition', { attempt: this.restartAttempts, delay })

        this.restartTimeout = setTimeout(() => {
          if (!this.isRunning || !this.recognition) return
          try {
            this.recognition.start()
          } catch {
            // Ignore if already started
          }
        }, delay)
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
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }
    this.restartAttempts = 0
    if (this.recognition) {
      this.recognition.stop()
      logger.info('Stopped transcription')
    }
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
   * Clean up resources
   */
  dispose(): void {
    this.isRunning = false
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
      this.restartTimeout = null
    }
    this.restartAttempts = 0
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
