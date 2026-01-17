/**
 * Internal CallSession-specific event map for typed EventBus usage within composables.
 */
import type { CallSession, CallState } from './call.types'

export interface CallSessionEventMap {
  /** Emitted when a call session's state changes */
  'call:state_changed': {
    session: CallSession
    previousState: CallState
    currentState: CallState
    timestamp: Date
  }

  /** Emitted when a media stream becomes available on a call session */
  'call:stream_added': {
    session: CallSession
    /** The media stream that was added */
    stream: MediaStream
    /** Whether the stream is local or remote */
    type: 'local' | 'remote'
    timestamp: Date
  }
}
