/**
 * DTMF utilities: low-level tone sending via RTCPeerConnection.
 * @packageDocumentation
 */

import type { RTCRtpSenderWithDTMF } from '@/types/media.types'

/** Default tone duration in ms (RFC 2833 typical) */
const DEFAULT_DURATION = 160
/** Default gap between tones in ms */
const DEFAULT_GAP = 70

/**
 * Send a single DTMF tone on a peer connection using the audio sender's insertDTMF.
 *
 * @param pc - RTCPeerConnection with an audio sender
 * @param digit - One of 0-9, *, #, A-D
 * @param duration - Tone duration in ms (default 160)
 * @param gap - Inter-tone gap in ms (default 70), used by insertDTMF
 * @throws Error if no audio sender or DTMF sender, or invalid digit
 */
export function sendDtmfTone(
  pc: RTCPeerConnection,
  digit: string,
  duration: number = DEFAULT_DURATION,
  gap: number = DEFAULT_GAP
): void {
  if (!/^[0-9*#A-D]$/.test(digit)) {
    throw new Error(`Invalid DTMF digit: ${digit}`)
  }
  const senders = pc.getSenders()
  const audioSender = senders.find((s: RTCRtpSender) => s.track?.kind === 'audio')
  if (!audioSender || !('dtmf' in audioSender)) {
    throw new Error('No DTMF-capable audio sender on peer connection')
  }
  const dtmfSender = (audioSender as RTCRtpSenderWithDTMF).dtmf
  if (!dtmfSender) {
    throw new Error('DTMF sender not available')
  }
  dtmfSender.insertDTMF(digit, duration, gap)
}
