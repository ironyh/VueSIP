/**
 * DTMF Manager
 *
 * Core implementation for DTMF (Dual-Tone Multi-Frequency) signaling
 * supporting RFC 2833 (RTP telephone-event) and SIP INFO methods.
 */

import type { RTCSession } from 'jssip/lib/RTCSession'
import type {
  DTMFMethod,
  DTMFTone,
  DTMFOptions,
  DTMFSendResult,
  DTMFEvent,
  DTMFCapabilities,
  DTMFQueueItem,
  DTMFState,
} from '@/types/dtmf.types'
import { DTMF_CONSTANTS, parseDTMFTones, validateDTMFTones } from '@/types/dtmf.types'

/**
 * Event emitter type for DTMF events
 */
type DTMFEventListener = (event: DTMFEvent) => void

/**
 * DTMFManager class
 * Handles DTMF tone transmission using RFC 2833 and SIP INFO methods
 */
export class DTMFManager {
  private session: RTCSession | null = null
  private queue: DTMFQueueItem[] = []
  private isSending = false
  private eventListeners: DTMFEventListener[] = []
  private capabilities: DTMFCapabilities | null = null

  /**
   * Set the active RTC session
   * @param session - JsSIP RTCSession instance
   */
  setSession(session: RTCSession | null): void {
    this.session = session

    if (session) {
      this.detectCapabilities()
    } else {
      this.capabilities = null
      this.clearQueue()
    }
  }

  /**
   * Detect DTMF capabilities from session
   */
  private detectCapabilities(): void {
    if (!this.session) {
      this.capabilities = null
      return
    }

    // Check SDP for RFC 2833 support (telephone-event)
    const connection = this.session.connection
    let rfc2833Enabled = false

    if (connection) {
      const localDescription = connection.localDescription
      const remoteDescription = connection.remoteDescription

      if (localDescription && remoteDescription) {
        const localSdp = localDescription.sdp
        const remoteSdp = remoteDescription.sdp

        // Check if both sides support telephone-event
        rfc2833Enabled =
          localSdp.includes('telephone-event') && remoteSdp.includes('telephone-event')
      }
    }

    // SIP INFO is always available for SIP sessions
    const sipInfoEnabled = true

    // Inband audio generation (if needed as fallback)
    const inbandEnabled = true

    const supportedMethods: DTMFMethod[] = []
    if (rfc2833Enabled) supportedMethods.push('rfc2833')
    if (sipInfoEnabled) supportedMethods.push('sipinfo')
    if (inbandEnabled) supportedMethods.push('inband')

    // Prefer RFC 2833 if available, otherwise SIP INFO
    const preferredMethod: DTMFMethod = rfc2833Enabled ? 'rfc2833' : 'sipinfo'

    this.capabilities = {
      supportedMethods,
      rfc2833Enabled,
      sipInfoEnabled,
      inbandEnabled,
      preferredMethod,
    }
  }

  /**
   * Get current DTMF capabilities
   */
  getCapabilities(): DTMFCapabilities | null {
    return this.capabilities
  }

  /**
   * Get current DTMF state
   */
  getState(): DTMFState {
    const firstItem = this.queue[0]
    return {
      isSending: this.isSending,
      currentTone: firstItem?.tone ?? null,
      queueLength: this.queue.length,
      lastResult: null, // Could be tracked if needed
      capabilities: this.capabilities,
    }
  }

  /**
   * Send DTMF tones
   * @param tones - String of DTMF tones to send
   * @param options - DTMF options
   * @returns Promise resolving to send result
   */
  async sendDTMF(tones: string, options: DTMFOptions = {}): Promise<DTMFSendResult> {
    // Validate session
    if (!this.session || !this.session.isEstablished()) {
      throw new Error('No active call session')
    }

    // Validate tones
    if (!validateDTMFTones(tones)) {
      throw new Error(`Invalid DTMF tones: ${tones}`)
    }

    const parsedTones = parseDTMFTones(tones)

    // Merge with defaults
    const fullOptions: Required<DTMFOptions> = {
      method: options.method || this.capabilities?.preferredMethod || 'rfc2833',
      duration: this.validateDuration(options.duration || DTMF_CONSTANTS.DEFAULT_DURATION),
      interToneGap: this.validateInterToneGap(
        options.interToneGap || DTMF_CONSTANTS.DEFAULT_INTER_TONE_GAP
      ),
      audioFeedback: options.audioFeedback || false,
    }

    // Validate method is supported
    if (this.capabilities && !this.capabilities.supportedMethods.includes(fullOptions.method)) {
      // Try fallback
      fullOptions.method = this.capabilities.preferredMethod
    }

    // Emit start event
    this.emitEvent({
      type: 'start',
      method: fullOptions.method,
      timestamp: new Date(),
    })

    try {
      // Queue and send tones
      await this.queueTones(parsedTones, fullOptions)

      const result: DTMFSendResult = {
        success: true,
        method: fullOptions.method,
        tones,
        timestamp: new Date(),
      }

      // Emit end event
      this.emitEvent({
        type: 'end',
        method: fullOptions.method,
        timestamp: new Date(),
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Emit error event
      this.emitEvent({
        type: 'error',
        error: errorMessage,
        timestamp: new Date(),
      })

      return {
        success: false,
        method: fullOptions.method,
        tones,
        error: errorMessage,
        timestamp: new Date(),
      }
    }
  }

  /**
   * Send a single DTMF tone
   * @param tone - DTMF tone to send
   * @param options - DTMF options
   */
  async sendTone(tone: DTMFTone, options: DTMFOptions = {}): Promise<DTMFSendResult> {
    return this.sendDTMF(tone, options)
  }

  /**
   * Queue tones for sequential sending
   */
  private async queueTones(tones: DTMFTone[], options: Required<DTMFOptions>): Promise<void> {
    const promises = tones.map(
      (tone) =>
        new Promise<DTMFSendResult>((resolve, reject) => {
          this.queue.push({ tone, options, resolve, reject })
        })
    )

    // Start processing queue if not already running
    if (!this.isSending) {
      this.processQueue()
    }

    await Promise.all(promises)
  }

  /**
   * Process the tone queue
   */
  private async processQueue(): Promise<void> {
    if (this.isSending || this.queue.length === 0) {
      return
    }

    this.isSending = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (!item) break

      try {
        await this.sendSingleTone(item.tone, item.options)

        item.resolve({
          success: true,
          method: item.options.method,
          tones: item.tone,
          timestamp: new Date(),
        })

        // Wait for inter-tone gap
        if (this.queue.length > 0) {
          await this.delay(item.options.interToneGap)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        item.reject(new Error(errorMessage))
      }
    }

    this.isSending = false
  }

  /**
   * Send a single tone using the specified method
   */
  private async sendSingleTone(tone: DTMFTone, options: Required<DTMFOptions>): Promise<void> {
    if (!this.session) {
      throw new Error('No active session')
    }

    // Emit tone event
    this.emitEvent({
      type: 'tone',
      tone,
      method: options.method,
      timestamp: new Date(),
    })

    let method = options.method

    // Try primary method with fallback
    try {
      if (method === 'rfc2833' && this.capabilities?.rfc2833Enabled) {
        await this.sendRFC2833(tone, options.duration)
      } else if (method === 'sipinfo' && this.capabilities?.sipInfoEnabled) {
        await this.sendSIPInfo(tone, options.duration)
      } else {
        // Fallback to preferred method
        method = this.capabilities?.preferredMethod || 'sipinfo'
        if (method === 'rfc2833') {
          await this.sendRFC2833(tone, options.duration)
        } else {
          await this.sendSIPInfo(tone, options.duration)
        }
      }
    } catch (error) {
      // Try fallback method
      if (method === 'rfc2833' && this.capabilities?.sipInfoEnabled) {
        await this.sendSIPInfo(tone, options.duration)
      } else if (method === 'sipinfo' && this.capabilities?.rfc2833Enabled) {
        await this.sendRFC2833(tone, options.duration)
      } else {
        throw error
      }
    }
  }

  /**
   * Send DTMF using RFC 2833 (RTP telephone-event)
   */
  private async sendRFC2833(tone: DTMFTone, duration: number): Promise<void> {
    if (!this.session) {
      throw new Error('No active session')
    }

    const session = this.session
    return new Promise((resolve, reject) => {
      try {
        // JsSIP's sendDTMF uses RFC 2833 by default
        session.sendDTMF(tone, {
          duration,
          interToneGap: 0, // We handle gaps in the queue
        })

        // Wait for tone duration
        setTimeout(resolve, duration)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Send DTMF using SIP INFO method
   */
  private async sendSIPInfo(tone: DTMFTone, duration: number): Promise<void> {
    if (!this.session) {
      throw new Error('No active session')
    }

    const session = this.session
    return new Promise((resolve, reject) => {
      let resolved = false

      try {
        // Send SIP INFO request
        const body = `Signal=${tone}\r\nDuration=${duration}`

        // JsSIP sendInfo accepts extraHeaders as third parameter
        const options = {
          extraHeaders: [] as string[],
        }

        session.sendInfo(DTMF_CONSTANTS.SIPINFO_CONTENT_TYPE, body, options)

        // Resolve after the tone duration
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            resolve()
          }
        }, duration)
      } catch (error) {
        if (!resolved) {
          resolved = true
          reject(error)
        }
      }
    })
  }

  /**
   * Validate tone duration
   */
  private validateDuration(duration: number): number {
    if (duration < DTMF_CONSTANTS.MIN_DURATION) {
      return DTMF_CONSTANTS.MIN_DURATION
    }
    if (duration > DTMF_CONSTANTS.MAX_DURATION) {
      return DTMF_CONSTANTS.MAX_DURATION
    }
    return duration
  }

  /**
   * Validate inter-tone gap
   */
  private validateInterToneGap(gap: number): number {
    if (gap < DTMF_CONSTANTS.MIN_INTER_TONE_GAP) {
      return DTMF_CONSTANTS.MIN_INTER_TONE_GAP
    }
    if (gap > DTMF_CONSTANTS.MAX_INTER_TONE_GAP) {
      return DTMF_CONSTANTS.MAX_INTER_TONE_GAP
    }
    return gap
  }

  /**
   * Add event listener
   */
  on(listener: DTMFEventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  off(listener: DTMFEventListener): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  /**
   * Emit DTMF event to all listeners
   */
  private emitEvent(event: DTMFEvent): void {
    this.eventListeners.forEach((listener) => listener(event))
  }

  /**
   * Clear the tone queue
   */
  private clearQueue(): void {
    // Reject all pending tones
    this.queue.forEach((item) => {
      item.reject(new Error('Session ended'))
    })
    this.queue = []
    this.isSending = false
  }

  /**
   * Utility: delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearQueue()
    this.session = null
    this.capabilities = null
    this.eventListeners = []
  }
}
