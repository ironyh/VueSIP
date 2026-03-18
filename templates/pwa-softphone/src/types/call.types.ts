/**
 * Call type definitions for PWA Softphone template
 * Minimal types needed by CallScreen component
 */

export interface CallSession {
  /** Unique call identifier */
  id: string
  /** Call state */
  state: string
  /** Remote party URI */
  remoteUri?: string
  /** Remote party display name */
  remoteDisplayName?: string
  /** Direction: 'incoming' or 'outgoing' */
  direction?: 'incoming' | 'outgoing'
  /** Start timestamp */
  startTime?: number
  /** Call duration in seconds */
  duration?: number
  /** Remote media stream (for recording) */
  remoteStream?: MediaStream
  /** Termination cause (for diagnostics) */
  terminationCause?: string
  /** Last SIP response code (for diagnostics) */
  lastResponseCode?: number
  /** Last SIP reason phrase (for diagnostics) */
  lastReasonPhrase?: string
}
