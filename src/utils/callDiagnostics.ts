/**
 * Call Diagnostics Utility
 *
 * Provides diagnostic information for call failures to help operators
 * troubleshoot issues quickly.
 *
 * @module utils/callDiagnostics
 */

import type { CallSession } from '@/types/call.types'

/** Default fallback for unknown causes */
const UNKNOWN_CAUSE = {
  explanation: 'Unknown failure reason',
  suggestions: [
    'Check server logs for more details',
    'Try the call again',
    'Contact support if persistent',
  ],
}

/**
 * Diagnostic information for a failed call
 */
export interface CallDiagnostics {
  callId: string
  timestamp: Date
  cause: string
  responseCode?: number
  reasonPhrase?: string
  message?: string
  suggestions: string[]
}

/**
 * Validates that a value is a non-empty string
 */
function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validates that an array contains only valid non-empty strings
 */
function isValidStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isValidString)
}

/**
 * Runtime validation for suggestions array - ensures type safety at runtime
 */
function normalizeSuggestions(input: unknown): string[] {
  if (isValidStringArray(input)) {
    return input
  }
  // Fallback to default suggestions if validation fails
  return [...UNKNOWN_CAUSE.suggestions]
}

/**
 * Map of SIP causes to human-readable explanations and troubleshooting suggestions
 */
const CAUSE_MAPPINGS: Record<string, { explanation: string; suggestions: string[] }> = {
  // SIP specific causes
  'No ACK': {
    explanation: 'Call was not acknowledged within timeout period',
    suggestions: [
      'Check network connectivity between endpoints',
      'Verify SIP ALG is not interfering',
      'Check for firewall blocking RTP media',
    ],
  },
  'No BYE': {
    explanation: 'Call termination was not confirmed',
    suggestions: [
      'Network timeout - likely due to connection drop',
      'Check client crash or force close',
    ],
  },
  'No PRACK': {
    explanation: 'Provisional Acknowledgment was not received',
    suggestions: [
      'Enable PRACK (RFC 3262) support on both endpoints',
      'Check for proxy issues with 1xx responses',
    ],
  },
  'No response': {
    explanation: 'No response received to INVITE or other requests',
    suggestions: [
      'Verify the callee is reachable',
      'Check DNS/SIP resolution',
      'Verify no firewall is blocking the request',
    ],
  },
  'No match': {
    explanation: 'No matching SIP registration found',
    suggestions: ['Verify the extension is registered', 'Check SIP realm/authentication settings'],
  },
  Busy: {
    explanation: 'Callee is busy on another call',
    suggestions: [
      'Call later',
      'Enable call waiting if available',
      'Check hunt group / ring group settings',
    ],
  },
  'Request Terminated': {
    explanation: 'Call was actively terminated by user or system',
    suggestions: ['Normal hangup - no action needed', 'Check if user intentionally ended the call'],
  },
  'User Not Registered': {
    explanation: 'The callee is not registered with the SIP server',
    suggestions: [
      'Callee needs to register first',
      'Check registration expiry settings',
      'Verify SIP credentials are correct',
    ],
  },
  Forbidden: {
    explanation: 'Authentication failed or forbidden',
    suggestions: [
      'Check SIP username and password',
      'Verify IP address is not blacklisted',
      'Check ACL (Access Control List) settings',
    ],
  },
  'Not Found': {
    explanation: 'The requested callee does not exist',
    suggestions: ['Verify the extension number is correct', 'Check dialplan configuration'],
  },
  'Service Unavailable': {
    explanation: 'Server cannot process the request',
    suggestions: ['Check server load and resources', 'Verify server is running properly'],
  },
  'Server Error': {
    explanation: 'Internal server error occurred',
    suggestions: ['Check server logs for details', 'Restart SIP service if persistent'],
  },
  Decline: {
    explanation: 'Callee declined the call',
    suggestions: ['Call was explicitly rejected', 'Check DND (Do Not Disturb) status'],
  },
  'Transport Error': {
    explanation: 'Network transport failed',
    suggestions: [
      'Check network connectivity',
      'Verify SIP port (5060/5061) is open',
      'Check firewall rules',
    ],
  },
  // Media related
  getusermediafailed: {
    explanation: 'Failed to access microphone/camera',
    suggestions: [
      'Check browser permissions for microphone/camera',
      'Verify no other app is using the device',
      'Try refreshing the browser',
    ],
  },
  // Default fallback (also available as UNKNOWN_CAUSE constant)
  unknown: UNKNOWN_CAUSE,

  // Additional TerminationCause enum values
  canceled: {
    explanation: 'Call was canceled before being answered',
    suggestions: [
      'Check if caller hung up prematurely',
      'Verify no network issues caused early termination',
    ],
  },
  rejected: {
    explanation: 'Call was explicitly rejected by the callee',
    suggestions: [
      'Callee explicitly declined the call',
      'Check if DND (Do Not Disturb) is enabled',
      'Verify callee is available',
    ],
  },
  no_answer: {
    explanation: 'Call was not answered within the timeout period',
    suggestions: [
      'Caller did not answer in time',
      'Increase no_answer_timeout setting',
      'Check if callee is available',
    ],
  },
  unavailable: {
    explanation: 'Callee is unavailable',
    suggestions: [
      'Callee cannot be reached',
      'Check network connectivity to callee',
      'Verify callee registration status',
    ],
  },
  request_timeout: {
    explanation: 'Request timed out waiting for response',
    suggestions: [
      'Check network latency',
      'Verify SIP server is reachable',
      'Check firewall timeout settings',
    ],
  },
  webrtc_error: {
    explanation: 'WebRTC error occurred',
    suggestions: [
      'Check browser WebRTC support',
      'Verify microphone/camera permissions',
      'Check for browser extensions interfering',
      'Try a different browser',
    ],
  },
  internal_error: {
    explanation: 'Internal client error occurred',
    suggestions: [
      'Refresh the application',
      'Check browser console for errors',
      'Try clearing cache and cookies',
    ],
  },
  network_error: {
    explanation: 'Network connection error',
    suggestions: [
      'Check internet connectivity',
      'Verify WebSocket connection',
      'Check firewall/network configuration',
    ],
  },
}

/**
 * Get diagnostic information for a failed call
 */
export function getCallDiagnostics(call: CallSession): CallDiagnostics {
  const cause = call.terminationCause || 'unknown'
  const mapping = CAUSE_MAPPINGS[cause] ?? UNKNOWN_CAUSE

  return {
    callId: call.id,
    timestamp: new Date(),
    cause,
    responseCode: call.lastResponseCode,
    reasonPhrase: call.lastReasonPhrase,
    message: call.lastErrorMessage,
    suggestions: normalizeSuggestions(mapping?.suggestions ?? UNKNOWN_CAUSE.suggestions),
  }
}

/**
 * Get human-readable explanation for a termination cause
 */
export function getCauseExplanation(cause: string): string {
  if (!cause || typeof cause !== 'string') {
    return UNKNOWN_CAUSE.explanation
  }
  const mapping = CAUSE_MAPPINGS[cause]
  return mapping?.explanation ?? UNKNOWN_CAUSE.explanation
}

/**
 * Get troubleshooting suggestions for a termination cause
 */
export function getCauseSuggestions(cause: string): string[] {
  if (!cause || typeof cause !== 'string') {
    return normalizeSuggestions(UNKNOWN_CAUSE.suggestions)
  }
  const mapping = CAUSE_MAPPINGS[cause]
  return normalizeSuggestions(mapping?.suggestions ?? UNKNOWN_CAUSE.suggestions)
}

/**
 * Get all available cause types
 */
export function getAvailableCauses(): string[] {
  return Object.keys(CAUSE_MAPPINGS)
}
