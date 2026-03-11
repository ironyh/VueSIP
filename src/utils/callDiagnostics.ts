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
} as const

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
    suggestions: mapping?.suggestions ?? UNKNOWN_CAUSE.suggestions,
  }
}

/**
 * Get human-readable explanation for a termination cause
 */
export function getCauseExplanation(cause: string): string {
  const mapping = CAUSE_MAPPINGS[cause]
  return mapping?.explanation ?? UNKNOWN_CAUSE.explanation
}

/**
 * Get troubleshooting suggestions for a termination cause
 */
export function getCauseSuggestions(cause: string): string[] {
  const mapping = CAUSE_MAPPINGS[cause]
  return mapping?.suggestions ?? UNKNOWN_CAUSE.suggestions
}

/**
 * Get all available cause types
 */
export function getAvailableCauses(): string[] {
  return Object.keys(CAUSE_MAPPINGS)
}
