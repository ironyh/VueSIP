/**
 * Composable Type Extensions
 *
 * Defines extended interfaces for CallSession with optional methods for advanced features.
 * These represent features that may not be fully implemented yet.
 *
 * @module composables/types
 */

import type { CallSession, CallOptions } from '../types/call.types'

/**
 * PiP integration options for CallSession
 *
 * Configuration options for Picture-in-Picture behavior within a call session.
 * These options control automatic PiP entry/exit and preference persistence.
 */
export interface CallSessionPiPOptions {
  /**
   * Auto-enter PiP when call is answered
   * When true, PiP mode will automatically activate when an incoming call
   * is answered or an outgoing call is connected.
   * @default false
   */
  autoEnterOnAnswer?: boolean

  /**
   * Auto-exit PiP when call ends
   * When true, PiP mode will automatically deactivate when the call
   * terminates or fails.
   * @default true
   */
  autoExitOnEnd?: boolean

  /**
   * Persist PiP preference to localStorage
   * When true, the user's PiP preference will be saved and restored
   * across sessions.
   * @default false
   */
  persistPreference?: boolean
}

/**
 * Extended CallSession interface with transfer capabilities
 *
 * Note: These methods may not be implemented yet in the actual CallSession class.
 * Composables should check for method existence before calling.
 */
export interface ExtendedCallSession extends CallSession {
  /**
   * Perform blind transfer (REFER without consultation)
   * @param targetUri - URI to transfer to
   * @param extraHeaders - Optional SIP headers
   */
  transfer?(targetUri: string, extraHeaders?: string[]): Promise<void>

  /**
   * Perform attended transfer (REFER with Replaces header)
   * @param targetUri - URI to transfer to
   * @param consultationCallId - ID of the consultation call
   */
  attendedTransfer?(targetUri: string, consultationCallId: string): Promise<void>

  /**
   * Put call on hold
   */
  hold?(): Promise<void>

  /**
   * Resume call from hold
   */
  unhold?(): Promise<void>

  /**
   * Hang up the call
   */
  hangup?(): Promise<void>
}

/**
 * Type guard to check if CallSession has a specific method
 * @param session - The call session to check (can be null or undefined)
 * @param method - The method name to check for
 * @returns True if the session has the specified method
 */
export function hasCallSessionMethod<K extends keyof ExtendedCallSession>(
  session: CallSession | null | undefined,
  method: K
): session is ExtendedCallSession & Required<Pick<ExtendedCallSession, K>> {
  return session != null && typeof (session as ExtendedCallSession)[method] === 'function'
}

/**
 * Extended SipClient interface with all methods
 * This extends the base SipClient to include all available methods
 */
export interface ExtendedSipClient {
  /**
   * Start the SIP client and connect to server
   */
  start(): Promise<void>

  /**
   * Stop the SIP client
   */
  stop(): Promise<void>

  /**
   * Register with the SIP server
   */
  register(): Promise<void>

  /**
   * Unregister from the SIP server
   */
  unregister(): Promise<void>

  /**
   * Make an outgoing call and return CallSession instance
   * @param target - Target SIP URI
   * @param options - Optional call configuration
   */
  call(target: string, options?: CallOptions): Promise<CallSession>

  /**
   * Make an outgoing call and return call ID (backward compatible)
   * @param target - Target SIP URI
   * @param options - Optional call configuration
   */
  makeCall(target: string, options?: CallOptions): Promise<string>

  /**
   * Get an active call by ID
   * @param callId - The ID of the call to retrieve
   */
  getActiveCall(callId: string): CallSession | undefined

  /**
   * Check if client is connected
   */
  readonly isConnected: boolean

  /**
   * Check if client is registered
   */
  readonly isRegistered: boolean
}
