/**
 * SIP.js Call Session Adapter (Stub)
 *
 * This is a placeholder implementation for the SIP.js call session.
 * Full implementation requires installing the sip.js package.
 *
 * To use SIP.js adapter:
 * 1. Install: npm install sip.js
 * 2. Implement this class following the SIP.js Session API
 */

import { EventEmitter } from '../../utils/EventEmitter'
import type {
  ICallSession,
  AnswerOptions,
  DTMFOptions,
  RenegotiateOptions,
  CallStatistics,
  CallSessionEvents,
} from '../types'
import { CallDirection, CallState } from '../../types/call.types'

/**
 * SIP.js Call Session Implementation (Stub)
 *
 * This stub throws errors indicating SIP.js is not yet fully implemented.
 * See JsSipCallSession for a reference implementation.
 */
export class SipJsCallSession extends EventEmitter<CallSessionEvents> implements ICallSession {
  private readonly _id: string
  private readonly _direction: CallDirection
  private readonly _remoteUri: string

  constructor(id: string, direction: CallDirection, remoteUri: string) {
    super()
    this._id = id
    this._direction = direction
    this._remoteUri = remoteUri
  }

  // ========== Read-only Properties ==========

  get id(): string {
    return this._id
  }

  get direction(): CallDirection {
    return this._direction
  }

  get state(): CallState {
    return CallState.Idle
  }

  get remoteUri(): string {
    return this._remoteUri
  }

  get remoteDisplayName(): string | null {
    return null
  }

  get startTime(): Date | null {
    return null
  }

  get endTime(): Date | null {
    return null
  }

  get duration(): number {
    return 0
  }

  get localStream(): MediaStream | null {
    return null
  }

  get remoteStream(): MediaStream | null {
    return null
  }

  get isOnHold(): boolean {
    return false
  }

  get isMuted(): boolean {
    return false
  }

  // ========== Call Control Methods ==========

  async answer(_options?: AnswerOptions): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async reject(_statusCode?: number): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async terminate(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async hold(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async unhold(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async mute(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async unmute(): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async sendDTMF(_tone: string, _options?: DTMFOptions): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async transfer(_target: string): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async attendedTransfer(_target: ICallSession): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async renegotiate(_options?: RenegotiateOptions): Promise<void> {
    throw new Error('SIP.js adapter not fully implemented. Install sip.js and implement SipJsCallSession.')
  }

  async getStats(): Promise<CallStatistics> {
    return {}
  }
}
