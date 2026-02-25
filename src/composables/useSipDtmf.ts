/**
 * Low-level DTMF composable (session-agnostic).
 *
 * Use this when you have a session-like object that exposes an RTCPeerConnection
 * (e.g. JsSIP RTCSession, or any DtmfSessionSource) and need to send DTMF without
 * queue management or CallSession-specific state. For CallSession-based apps with
 * queue, callbacks, and statistics, use {@link useDTMF} instead.
 *
 * @module composables/useSipDtmf
 */
import { ref, type Ref } from 'vue'
import type { RTCRtpSenderWithDTMF } from '@/types/media.types'
import { abortableSleep, throwIfAborted } from '@/utils/abortController'
import { createLogger } from '@/utils/logger'
import { ErrorSeverity, logErrorWithContext, createOperationTimer } from '@/utils/errorContext'

const log = createLogger('useSipDtmf')

/** Session-like type that exposes RTCPeerConnection for DTMF (CallSession or JsSIP RTCSession shape) */
export interface DtmfSessionSource {
  connection?: RTCPeerConnection
  sessionDescriptionHandler?: { peerConnection?: RTCPeerConnection }
  state?: string
}

export interface UseSipDtmfReturn {
  sendDtmf: (digit: string) => Promise<void>
  sendDtmfSequence: (digits: string, interval?: number, signal?: AbortSignal) => Promise<void>
}

/**
 * Send DTMF tones using any session source that exposes an RTCPeerConnection.
 * Lightweight API: no queue, no CallSession dependency. Prefer useDTMF when using
 * CallSession and you need queue management, callbacks, or send statistics.
 *
 * @param currentSession - Ref to a session-like object (connection or sessionDescriptionHandler.peerConnection)
 * @returns sendDtmf and sendDtmfSequence
 */
export function useSipDtmf(currentSession: Ref<DtmfSessionSource | null>): UseSipDtmfReturn {
  // Concurrent operation guard to prevent overlapping DTMF sequences
  const isOperationInProgress = ref(false)

  const sendDtmf = async (digit: string) => {
    if (!currentSession.value) {
      throw new Error('No active session')
    }

    // Validate DTMF digit
    if (!/^[0-9*#A-D]$/.test(digit)) {
      throw new Error('Invalid DTMF digit')
    }

    const timer = createOperationTimer()

    try {
      // Prefer CallSession.connection; fallback to legacy sessionDescriptionHandler.peerConnection
      const pc =
        currentSession.value.connection ??
        currentSession.value.sessionDescriptionHandler?.peerConnection
      if (pc) {
        const senders = pc.getSenders()
        const audioSender = senders.find((sender: RTCRtpSender) => sender.track?.kind === 'audio')

        if (audioSender && 'dtmf' in audioSender) {
          const dtmfSender = (audioSender as RTCRtpSenderWithDTMF).dtmf
          if (dtmfSender) {
            dtmfSender.insertDTMF(digit, 160, 70)
          }
        }
      }
    } catch (err) {
      logErrorWithContext(
        log,
        'Failed to send DTMF tone',
        err,
        'sendDtmf',
        'useSipDtmf',
        ErrorSeverity.LOW,
        {
          context: {
            digit,
          },
          state: {
            hasSession: !!currentSession.value,
            sessionState: currentSession.value?.state,
          },
          duration: timer.elapsed(),
        }
      )
      throw new Error(`Failed to send DTMF: ${err}`)
    }
  }

  /**
   * Send a sequence of DTMF tones with configurable interval
   * @param digits - String of digits to send (0-9, A-D, *, #)
   * @param interval - Milliseconds between tones (default: 160)
   * @param signal - Optional AbortSignal to cancel the sequence
   * @throws DOMException with name 'AbortError' if aborted
   *
   * @example
   * ```typescript
   * // Basic usage (backward compatible)
   * await sendDtmfSequence('123')
   *
   * // With custom interval
   * await sendDtmfSequence('*789#', 200)
   *
   * // With abort support
   * const controller = new AbortController()
   * const promise = sendDtmfSequence('1234567890', 160, controller.signal)
   * // Later: controller.abort()
   * ```
   */
  const sendDtmfSequence = async (
    digits: string,
    interval = 160,
    signal?: AbortSignal
  ): Promise<void> => {
    // Check if already aborted before starting
    throwIfAborted(signal)

    // Check for concurrent operations
    if (isOperationInProgress.value) {
      throw new Error('DTMF sequence already in progress - concurrent operations not allowed')
    }

    // Upfront validation: validate entire sequence before processing
    if (!/^[0-9*#A-D]+$/.test(digits)) {
      throw new Error(`Invalid DTMF sequence: "${digits}" - only 0-9, A-D, *, and # are allowed`)
    }

    const timer = createOperationTimer()

    try {
      // Set operation in progress flag
      isOperationInProgress.value = true

      for (let i = 0; i < digits.length; i++) {
        const digit = digits[i]
        if (!digit) continue // Skip undefined/empty

        // Send the tone
        await sendDtmf(digit)

        // Wait between tones (except after the last one)
        if (i < digits.length - 1) {
          await abortableSleep(interval, signal)
        }
      }
    } catch (err) {
      logErrorWithContext(
        log,
        'Failed to send DTMF sequence',
        err,
        'sendDtmfSequence',
        'useSipDtmf',
        ErrorSeverity.LOW,
        {
          context: {
            digits,
            interval,
            digitsLength: digits.length,
          },
          state: {
            hasSession: !!currentSession.value,
            sessionState: currentSession.value?.state,
            isOperationInProgress: isOperationInProgress.value,
          },
          duration: timer.elapsed(),
        }
      )
      throw err
    } finally {
      // Always clear the operation flag
      isOperationInProgress.value = false
    }
  }

  return {
    sendDtmf,
    sendDtmfSequence,
  }
}
