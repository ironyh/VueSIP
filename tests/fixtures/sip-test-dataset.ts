/**
 * Comprehensive SIP Test Dataset
 *
 * 50+ SIP scenarios covering:
 * - Registration (success, failure, timeout, auth)
 * - Call setup (normal, error, edge cases)
 * - Session management (hold, transfer, park)
 * - Media negotiation (codec, ICE, re-INVITE)
 * - Network failures (disconnect, reconnect, timeout)
 * - SIP protocol violations & malformed messages
 * - Authentication variations
 * - DTMF signaling
 * - Voicemail
 * - Presence
 *
 * @packageDocumentation
 */

// ============================================================================
// Type Definitions for Test Scenarios
// ============================================================================

export interface SipTestScenario {
  id: string
  category: SipScenarioCategory
  name: string
  description: string
  /** SIP messages or events to simulate */
  steps: SipStep[]
  /** Expected outcome */
  expected: SipExpectedOutcome
  /** Tags for filtering */
  tags?: string[]
}

export type SipScenarioCategory =
  | 'registration'
  | 'call-setup'
  | 'session-management'
  | 'media-negotiation'
  | 'network-failure'
  | 'malformed'
  | 'authentication'
  | 'dtmf'
  | 'voicemail'
  | 'presence'
  | 'conference'

export interface SipStep {
  action: 'send' | 'receive' | 'wait' | 'expect' | 'timeout' | 'error'
  /** SIP method or event type */
  type?: string
  /** Raw SIP message or payload */
  payload?: Record<string, unknown>
  /** Delay in ms before next step */
  delayMs?: number
}

export interface SipExpectedOutcome {
  /** Final registration state */
  registrationState?: 'registered' | 'unregistered' | 'error'
  /** Final call state */
  callState?: 'ringing' | 'active' | 'held' | 'ended' | null
  /** Expected SIP response code */
  sipResponseCode?: number
  /** Whether an error is expected */
  errorExpected?: boolean
  /** Error message pattern */
  errorMessage?: string
  /** Events that should have been emitted */
  events?: string[]
  /** Session count assertions */
  activeSessionCount?: number
}

// ============================================================================
// Registration Scenarios (1-12)
// ============================================================================

export const registrationScenarios: SipTestScenario[] = [
  {
    id: 'REG-001',
    category: 'registration',
    name: 'Successful SIP registration',
    description: 'Normal registration flow with valid credentials',
    steps: [
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local', expires: 3600 },
      },
      {
        action: 'receive',
        type: '401 Unauthorized',
        payload: { realm: 'asterisk', nonce: 'abc123' },
      },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local', authorization: 'Digest username="1001"' },
      },
      { action: 'receive', type: '200 OK', payload: { expires: 3600 } },
    ],
    expected: { registrationState: 'registered', events: ['registered'] },
    tags: ['happy-path'],
  },
  {
    id: 'REG-002',
    category: 'registration',
    name: 'Registration with wrong password',
    description: 'Registration fails due to incorrect credentials',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@asterisk.local' } },
      { action: 'receive', type: '401 Unauthorized', payload: {} },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { authorization: 'Digest username="1001", wrong-password' },
      },
      { action: 'receive', type: '403 Forbidden', payload: { reason: 'Wrong password' } },
    ],
    expected: {
      registrationState: 'error',
      sipResponseCode: 403,
      errorExpected: true,
      events: ['registrationFailed'],
    },
  },
  {
    id: 'REG-003',
    category: 'registration',
    name: 'Registration timeout - no server response',
    description: 'Server does not respond to REGISTER within timeout period',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@asterisk.local' } },
      { action: 'timeout', delayMs: 32000 },
    ],
    expected: {
      registrationState: 'error',
      errorMessage: 'timeout',
      events: ['registrationFailed'],
    },
    tags: ['timeout'],
  },
  {
    id: 'REG-004',
    category: 'registration',
    name: 'Registration with expired nonce',
    description: 'Server rejects stale nonce with stale=true indicator',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@asterisk.local' } },
      {
        action: 'receive',
        type: '401 Unauthorized',
        payload: { realm: 'asterisk', nonce: 'expired-nonce' },
      },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { authorization: 'Digest username="1001", nonce="expired-nonce"' },
      },
      {
        action: 'receive',
        type: '401 Unauthorized',
        payload: { realm: 'asterisk', nonce: 'fresh-nonce', stale: true },
      },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { authorization: 'Digest username="1001", nonce="fresh-nonce"' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { registrationState: 'registered', events: ['registered'] },
  },
  {
    id: 'REG-005',
    category: 'registration',
    name: 'Rapid re-registration',
    description: 'Multiple rapid REGISTER requests in quick succession',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@asterisk.local' } },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local' },
        delayMs: 100,
      },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local' },
        delayMs: 50,
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: {
      registrationState: 'registered',
      events: ['registered', 'registered', 'registered'],
    },
  },
  {
    id: 'REG-006',
    category: 'registration',
    name: 'De-registration (REGISTER with Expires: 0)',
    description: 'Client explicitly unregisters by sending REGISTER with Expires: 0',
    steps: [
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local', expires: 3600 },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local', expires: 0 },
      },
      { action: 'receive', type: '200 OK', payload: { expires: 0 } },
    ],
    expected: { registrationState: 'unregistered', events: ['registered', 'unregistered'] },
  },
  {
    id: 'REG-007',
    category: 'registration',
    name: 'Registration rejected - IP banned',
    description: 'Server returns 403 with reason indicating IP is blocked',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@asterisk.local' } },
      { action: 'receive', type: '403 Forbidden', payload: { reason: 'IP address blocked' } },
    ],
    expected: {
      registrationState: 'error',
      sipResponseCode: 403,
      errorExpected: true,
      events: ['registrationFailed'],
    },
  },
  {
    id: 'REG-008',
    category: 'registration',
    name: 'Registration with missing domain',
    description: 'REGISTER with malformed SIP URI missing domain part',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001' } },
      { action: 'receive', type: '400 Bad Request', payload: { reason: 'Invalid URI' } },
    ],
    expected: { registrationState: 'error', sipResponseCode: 400, errorExpected: true },
    tags: ['malformed'],
  },
  {
    id: 'REG-009',
    category: 'registration',
    name: 'Registration expiry with refresh',
    description: 'Registration nears expiry and client sends refresh REGISTER',
    steps: [
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local', expires: 600 },
      },
      { action: 'receive', type: '200 OK', payload: { expires: 600 } },
      { action: 'wait', delayMs: 480000 }, // Wait 8 minutes (80% of 600s)
      {
        action: 'send',
        type: 'REGISTER',
        payload: { from: 'sip:1001@asterisk.local', expires: 600 },
      },
      { action: 'receive', type: '200 OK', payload: { expires: 600 } },
    ],
    expected: {
      registrationState: 'registered',
      events: ['registered', 'registrationExpiring', 'registered'],
    },
  },
  {
    id: 'REG-010',
    category: 'registration',
    name: 'Registration to non-existent domain',
    description: 'DNS resolution fails for the SIP domain',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@nonexistent.local' } },
      { action: 'error', payload: { code: 'DNS_ERROR', message: 'DNS resolution failed' } },
    ],
    expected: { registrationState: 'error', errorMessage: 'DNS', errorExpected: true },
  },
  {
    id: 'REG-011',
    category: 'registration',
    name: 'Server sends 503 Service Unavailable during registration',
    description: 'Server overloaded, returns 503 with Retry-After header',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@asterisk.local' } },
      { action: 'receive', type: '503 Service Unavailable', payload: { 'Retry-After': 30 } },
    ],
    expected: { registrationState: 'error', sipResponseCode: 503, events: ['registrationFailed'] },
  },
  {
    id: 'REG-012',
    category: 'registration',
    name: 'Registration with WebSocket transport failure mid-auth',
    description: 'WebSocket disconnects during SIP auth handshake',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { from: 'sip:1001@asterisk.local' } },
      { action: 'receive', type: '401 Unauthorized', payload: {} },
      { action: 'error', payload: { code: 'WS_CLOSE', message: 'WebSocket closed unexpectedly' } },
    ],
    expected: {
      registrationState: 'error',
      errorMessage: 'WebSocket',
      errorExpected: true,
      events: ['disconnected'],
    },
  },
]

// ============================================================================
// Call Setup Scenarios (13-24)
// ============================================================================

export const callSetupScenarios: SipTestScenario[] = [
  {
    id: 'CALL-001',
    category: 'call-setup',
    name: 'Basic call setup - dial, ring, answer, hangup',
    description: 'Standard two-party call lifecycle',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '100 Trying', payload: {} },
      { action: 'receive', type: '180 Ringing', payload: {} },
      { action: 'receive', type: '200 OK', payload: { sdp: 'v=0\r\n...' } },
      { action: 'send', type: 'ACK', payload: {} },
      { action: 'wait', delayMs: 5000 },
      { action: 'send', type: 'BYE', payload: {} },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { callState: 'ended', events: ['callStart', 'callAnswer', 'callEnd'] },
    tags: ['happy-path'],
  },
  {
    id: 'CALL-002',
    category: 'call-setup',
    name: 'Call to busy extension (486 Busy Here)',
    description: 'Target extension is already on a call',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '100 Trying', payload: {} },
      { action: 'receive', type: '486 Busy Here', payload: {} },
      { action: 'send', type: 'ACK', payload: {} },
    ],
    expected: { callState: 'ended', sipResponseCode: 486, events: ['callStart', 'callEnd'] },
  },
  {
    id: 'CALL-003',
    category: 'call-setup',
    name: 'Call to unregistered extension (404 Not Found)',
    description: 'Target extension is not registered on the PBX',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:9999@asterisk.local' },
      },
      { action: 'receive', type: '404 Not Found', payload: {} },
    ],
    expected: { callState: 'ended', sipResponseCode: 404, errorExpected: true },
  },
  {
    id: 'CALL-004',
    category: 'call-setup',
    name: 'Call with no answer (timeout)',
    description: 'Target does not pick up within ring timeout',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '100 Trying', payload: {} },
      { action: 'receive', type: '180 Ringing', payload: {} },
      { action: 'timeout', delayMs: 30000 },
      { action: 'receive', type: '408 Request Timeout', payload: {} },
    ],
    expected: { callState: 'ended', sipResponseCode: 408, events: ['callStart', 'callEnd'] },
    tags: ['timeout'],
  },
  {
    id: 'CALL-005',
    category: 'call-setup',
    name: 'Caller cancels before answer',
    description: 'Caller hangs up while target is ringing',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '180 Ringing', payload: {} },
      { action: 'send', type: 'CANCEL', payload: {} },
      { action: 'receive', type: '200 OK', payload: { method: 'CANCEL' } },
      { action: 'receive', type: '487 Request Terminated', payload: {} },
    ],
    expected: { callState: 'ended', sipResponseCode: 487, events: ['callStart', 'callEnd'] },
  },
  {
    id: 'CALL-006',
    category: 'call-setup',
    name: 'Call with SDP rejection - codec mismatch',
    description: 'No compatible codecs between caller and callee',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: {
          from: 'sip:1001@asterisk.local',
          to: 'sip:1002@asterisk.local',
          sdp: 'codec: G729',
        },
      },
      {
        action: 'receive',
        type: '488 Not Acceptable Here',
        payload: { reason: 'No common codec' },
      },
    ],
    expected: {
      callState: 'ended',
      sipResponseCode: 488,
      errorExpected: true,
      events: ['callStart', 'callEnd'],
    },
    tags: ['media'],
  },
  {
    id: 'CALL-007',
    category: 'call-setup',
    name: 'Call with early media (183 Session Progress)',
    description: 'Server sends early media with 183 before answer',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '183 Session Progress', payload: { sdp: 'v=0\r\n...' } },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'ACK', payload: {} },
    ],
    expected: { callState: 'active', events: ['callStart', 'callAnswer'] },
  },
  {
    id: 'CALL-008',
    category: 'call-setup',
    name: 'Call forwarded (302 Moved Temporarily)',
    description: 'Target has call forwarding configured',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      {
        action: 'receive',
        type: '302 Moved Temporarily',
        payload: { contact: 'sip:1003@asterisk.local' },
      },
    ],
    expected: { callState: null, sipResponseCode: 302 },
  },
  {
    id: 'CALL-009',
    category: 'call-setup',
    name: 'Call requires auth (INVITE with 401/407)',
    description: 'Server requires authentication for outbound calls',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      {
        action: 'receive',
        type: '407 Proxy Authentication Required',
        payload: { realm: 'asterisk', nonce: 'xyz789' },
      },
      {
        action: 'send',
        type: 'INVITE',
        payload: { authorization: 'Digest username="1001", nonce="xyz789"' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { callState: 'active', events: ['callStart', 'callAnswer'] },
    tags: ['authentication'],
  },
  {
    id: 'CALL-010',
    category: 'call-setup',
    name: 'Server returns 500 Server Internal Error on INVITE',
    description: 'PBX encounters an internal error processing the INVITE',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      {
        action: 'receive',
        type: '500 Server Internal Error',
        payload: { reason: 'Unhandled exception' },
      },
    ],
    expected: {
      callState: 'ended',
      sipResponseCode: 500,
      errorExpected: true,
      events: ['callStart', 'callEnd'],
    },
  },
  {
    id: 'CALL-011',
    category: 'call-setup',
    name: 'Multiple concurrent calls',
    description: 'Client initiates multiple simultaneous calls',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {}, delayMs: 100 },
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1003@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {}, delayMs: 100 },
    ],
    expected: {
      activeSessionCount: 2,
      events: ['callStart', 'callAnswer', 'callStart', 'callAnswer'],
    },
  },
  {
    id: 'CALL-012',
    category: 'call-setup',
    name: 'Call with invalid SIP URI format',
    description: 'INVITE with malformed target URI',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'not-a-valid-uri' },
      },
      { action: 'receive', type: '400 Bad Request', payload: { reason: 'Invalid URI' } },
    ],
    expected: { callState: 'ended', sipResponseCode: 400, errorExpected: true },
    tags: ['malformed'],
  },
]

// ============================================================================
// Session Management Scenarios (25-32)
// ============================================================================

export const sessionManagementScenarios: SipTestScenario[] = [
  {
    id: 'SESS-001',
    category: 'session-management',
    name: 'Blind transfer (REFER without consultation)',
    description: 'Transfer call to another extension without prior consultation',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'REFER', payload: { referTo: 'sip:1003@asterisk.local' } },
      { action: 'receive', type: '202 Accepted', payload: {} },
      { action: 'receive', type: 'NOTIFY', payload: { sipfrag: 'SIP/2.0 200 OK' } },
    ],
    expected: { events: ['callStart', 'callAnswer', 'transfer'] },
  },
  {
    id: 'SESS-002',
    category: 'session-management',
    name: 'Attended transfer (REFER with Replaces)',
    description: 'Transfer with consultation hold and Replaces header',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1003@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'send',
        type: 'REFER',
        payload: { referTo: 'sip:1003@asterisk.local?Replaces=call-id-2' },
      },
      { action: 'receive', type: '202 Accepted', payload: {} },
    ],
    expected: { events: ['callStart', 'callAnswer', 'transfer'] },
  },
  {
    id: 'SESS-003',
    category: 'session-management',
    name: 'Hold and resume via re-INVITE',
    description: 'Place call on hold with sendonly, resume with sendrecv',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'INVITE', payload: { sdp: 'a=sendonly' } }, // Hold
      { action: 'receive', type: '200 OK', payload: { sdp: 'a=recvonly' } },
      { action: 'send', type: 'INVITE', payload: { sdp: 'a=sendrecv' } }, // Resume
      { action: 'receive', type: '200 OK', payload: { sdp: 'a=sendrecv' } },
    ],
    expected: {
      callState: 'active',
      events: ['callStart', 'callAnswer', 'callHold', 'callResume'],
    },
  },
  {
    id: 'SESS-004',
    category: 'session-management',
    name: 'Call park and retrieve',
    description: 'Park active call to slot 701 and retrieve from another extension',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'REFER', payload: { referTo: 'sip:701@asterisk.local' } },
      { action: 'receive', type: '202 Accepted', payload: {} },
      { action: 'receive', type: 'NOTIFY', payload: { sipfrag: 'SIP/2.0 200 OK' } },
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1003@asterisk.local', to: 'sip:701@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { events: ['callStart', 'callAnswer', 'callPark', 'callAnswer'] },
  },
  {
    id: 'SESS-005',
    category: 'session-management',
    name: 'Session expiration via SIP UPDATE',
    description: 'Session timer refresh with UPDATE method',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: {
          from: 'sip:1001@asterisk.local',
          to: 'sip:1002@asterisk.local',
          'Session-Expires': 1800,
        },
      },
      { action: 'receive', type: '200 OK', payload: { 'Session-Expires': 1800 } },
      { action: 'wait', delayMs: 900000 },
      { action: 'send', type: 'UPDATE', payload: { 'Session-Expires': 1800 } },
      { action: 'receive', type: '200 OK', payload: { 'Session-Expires': 1800 } },
    ],
    expected: { callState: 'active' },
  },
  {
    id: 'SESS-006',
    category: 'session-management',
    name: 'Transfer rejected by target',
    description: 'REFER accepted but target returns 486',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'REFER', payload: { referTo: 'sip:1003@asterisk.local' } },
      { action: 'receive', type: '202 Accepted', payload: {} },
      { action: 'receive', type: 'NOTIFY', payload: { sipfrag: 'SIP/2.0 486 Busy Here' } },
    ],
    expected: { events: ['callStart', 'callAnswer', 'transferFailed'] },
  },
  {
    id: 'SESS-007',
    category: 'session-management',
    name: 'Remote end sends BYE unexpectedly',
    description: 'Callee hangs up without prior indication',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'receive', type: 'BYE', payload: {} },
      { action: 'send', type: '200 OK', payload: {} },
    ],
    expected: { callState: 'ended', events: ['callStart', 'callAnswer', 'callEnd'] },
  },
  {
    id: 'SESS-008',
    category: 'session-management',
    name: 'Re-INVITE fails with 488 - media renegotiation failure',
    description: 'Attempting to change media parameters fails',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'INVITE', payload: { sdp: 'video codec change' } },
      { action: 'receive', type: '488 Not Acceptable Here', payload: {} },
    ],
    expected: { callState: 'active', errorExpected: true, events: ['callStart', 'callAnswer'] },
    tags: ['media'],
  },
]

// ============================================================================
// Media Negotiation Scenarios (33-38)
// ============================================================================

export const mediaNegotiationScenarios: SipTestScenario[] = [
  {
    id: 'MEDIA-001',
    category: 'media-negotiation',
    name: 'Successful codec negotiation - Opus preferred',
    description: 'Both sides agree on Opus codec',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { sdp: 'm=audio 49170 RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2' },
      },
      {
        action: 'receive',
        type: '200 OK',
        payload: { sdp: 'm=audio 49170 RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2' },
      },
    ],
    expected: { callState: 'active' },
  },
  {
    id: 'MEDIA-002',
    category: 'media-negotiation',
    name: 'Fallback from Opus to PCMU',
    description: 'Server does not support Opus, falls back to PCMU (payload 0)',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: {
          sdp: 'm=audio 49170 RTP/SAVPF 111 0\r\na=rtpmap:111 opus/48000/2\r\na=rtpmap:0 PCMU/8000',
        },
      },
      {
        action: 'receive',
        type: '200 OK',
        payload: { sdp: 'm=audio 49170 RTP/SAVPF 0\r\na=rtpmap:0 PCMU/8000' },
      },
    ],
    expected: { callState: 'active' },
  },
  {
    id: 'MEDIA-003',
    category: 'media-negotiation',
    name: 'ICE connection failure',
    description: 'ICE candidates fail to establish connectivity',
    steps: [
      { action: 'send', type: 'INVITE', payload: { sdp: 'a=ice-ufrag:abc\r\na=candidate:...' } },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'timeout', delayMs: 30000 },
      {
        action: 'error',
        payload: { code: 'ICE_FAILED', message: 'ICE connectivity checks failed' },
      },
    ],
    expected: { callState: 'ended', errorMessage: 'ICE', errorExpected: true },
    tags: ['timeout'],
  },
  {
    id: 'MEDIA-004',
    category: 'media-negotiation',
    name: 'DTLS handshake failure',
    description: 'SRTP DTLS negotiation fails',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { sdp: 'a=setup:actpass\r\na=fingerprint:sha-256 ...' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'error', payload: { code: 'DTLS_ERROR', message: 'DTLS handshake failed' } },
    ],
    expected: { callState: 'ended', errorMessage: 'DTLS', errorExpected: true },
  },
  {
    id: 'MEDIA-005',
    category: 'media-negotiation',
    name: 'Re-INVITE for video upgrade',
    description: 'Upgrade audio-only call to include video',
    steps: [
      { action: 'send', type: 'INVITE', payload: { sdp: 'audio only' } },
      { action: 'receive', type: '200 OK', payload: { sdp: 'audio only' } },
      { action: 'send', type: 'INVITE', payload: { sdp: 'audio + video' } },
      { action: 'receive', type: '200 OK', payload: { sdp: 'audio + video' } },
    ],
    expected: { callState: 'active' },
  },
  {
    id: 'MEDIA-006',
    category: 'media-negotiation',
    name: 'Empty SDP body in INVITE',
    description: 'INVITE with Content-Length: 0 for SDP',
    steps: [
      { action: 'send', type: 'INVITE', payload: { sdp: '' } },
      { action: 'receive', type: '400 Bad Request', payload: { reason: 'Missing SDP' } },
    ],
    expected: { callState: 'ended', errorExpected: true },
    tags: ['malformed'],
  },
]

// ============================================================================
// Network Failure Scenarios (39-45)
// ============================================================================

export const networkFailureScenarios: SipTestScenario[] = [
  {
    id: 'NET-001',
    category: 'network-failure',
    name: 'WebSocket disconnect during active call',
    description: 'Network drops while call is active',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'error', payload: { code: 'WS_CLOSE', message: 'WebSocket closed' } },
    ],
    expected: { callState: null, errorMessage: 'WebSocket', events: ['disconnected'] },
  },
  {
    id: 'NET-002',
    category: 'network-failure',
    name: 'Automatic reconnection with call recovery',
    description: 'Network recovers and registration is re-established',
    steps: [
      { action: 'send', type: 'REGISTER', payload: {} },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'error', payload: { code: 'WS_CLOSE' } },
      { action: 'wait', delayMs: 2000 },
      { action: 'send', type: 'REGISTER', payload: {} },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: {
      registrationState: 'registered',
      events: ['registered', 'disconnected', 'registered'],
    },
  },
  {
    id: 'NET-003',
    category: 'network-failure',
    name: 'Reconnection with exponential backoff',
    description: 'Multiple connection attempts with increasing delay',
    steps: [
      { action: 'error', payload: { code: 'WS_CLOSE' } },
      { action: 'send', type: 'REGISTER', payload: {}, delayMs: 1000 },
      { action: 'error', payload: { code: 'WS_CLOSE' } },
      { action: 'send', type: 'REGISTER', payload: {}, delayMs: 2000 },
      { action: 'error', payload: { code: 'WS_CLOSE' } },
      { action: 'send', type: 'REGISTER', payload: {}, delayMs: 4000 },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { registrationState: 'registered' },
  },
  {
    id: 'NET-004',
    category: 'network-failure',
    name: 'TCP connection refused',
    description: 'Server port is unreachable',
    steps: [
      { action: 'send', type: 'REGISTER', payload: {} },
      { action: 'error', payload: { code: 'ECONNREFUSED', message: 'Connection refused' } },
    ],
    expected: { registrationState: 'error', errorMessage: 'refused', errorExpected: true },
  },
  {
    id: 'NET-005',
    category: 'network-failure',
    name: 'SIP 503 with Retry-After during call',
    description: 'Server sends 503 mid-dialog',
    steps: [
      { action: 'send', type: 'INVITE', payload: {} },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'receive', type: '503 Service Unavailable', payload: { 'Retry-After': 60 } },
    ],
    expected: { callState: 'ended', sipResponseCode: 503, events: ['callEnd'] },
  },
  {
    id: 'NET-006',
    category: 'network-failure',
    name: 'DNS resolution failure',
    description: 'Cannot resolve SIP proxy hostname',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { server: 'wss://unreachable.invalid' } },
      { action: 'error', payload: { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' } },
    ],
    expected: { registrationState: 'error', errorMessage: 'ENOTFOUND', errorExpected: true },
  },
  {
    id: 'NET-007',
    category: 'network-failure',
    name: 'TLS certificate validation failure',
    description: 'Server presents invalid/self-signed TLS certificate',
    steps: [
      { action: 'send', type: 'REGISTER', payload: { server: 'wss://self-signed.local' } },
      {
        action: 'error',
        payload: { code: 'CERT_HAS_EXPIRED', message: 'certificate has expired' },
      },
    ],
    expected: { registrationState: 'error', errorMessage: 'certificate', errorExpected: true },
  },
]

// ============================================================================
// Malformed Message Scenarios (46-50)
// ============================================================================

export const malformedMessageScenarios: SipTestScenario[] = [
  {
    id: 'MAL-001',
    category: 'malformed',
    name: 'Missing required Via header',
    description: 'SIP message without Via header',
    steps: [
      {
        action: 'receive',
        type: 'INVITE',
        payload: {
          raw: 'INVITE sip:1001@asterisk.local SIP/2.0\r\nFrom: <sip:1002@asterisk.local>\r\n\r\n',
        },
      },
    ],
    expected: { errorExpected: true },
    tags: ['malformed'],
  },
  {
    id: 'MAL-002',
    category: 'malformed',
    name: 'Invalid SIP version in request line',
    description: 'Request with SIP/3.0 version',
    steps: [
      {
        action: 'receive',
        type: 'INVITE',
        payload: { raw: 'INVITE sip:1001@asterisk.local SIP/3.0' },
      },
    ],
    expected: { errorExpected: true },
    tags: ['malformed'],
  },
  {
    id: 'MAL-003',
    category: 'malformed',
    name: 'Missing Call-ID header',
    description: 'SIP request without Call-ID',
    steps: [
      {
        action: 'receive',
        type: 'INVITE',
        payload: {
          raw: 'INVITE sip:1001@asterisk.local SIP/2.0\r\nVia: SIP/2.0/WSS\r\nFrom: <sip:1002@asterisk.local>\r\n\r\n',
        },
      },
    ],
    expected: { errorExpected: true },
    tags: ['malformed'],
  },
  {
    id: 'MAL-004',
    category: 'malformed',
    name: 'Duplicate CSeq with different method',
    description: 'Message with CSeq already used but different method',
    steps: [
      { action: 'receive', type: 'INVITE', payload: { cseq: '1 INVITE' } },
      { action: 'receive', type: 'BYE', payload: { cseq: '1 BYE' } },
    ],
    expected: { errorExpected: true },
    tags: ['malformed'],
  },
  {
    id: 'MAL-005',
    category: 'malformed',
    name: 'Extremely long header value (buffer overflow attempt)',
    description: 'Header value exceeds reasonable length',
    steps: [{ action: 'receive', type: 'INVITE', payload: { from: 'x'.repeat(65536) } }],
    expected: { errorExpected: true },
    tags: ['malformed'],
  },
]

// ============================================================================
// Authentication Variations (51-54)
// ============================================================================

export const authenticationScenarios: SipTestScenario[] = [
  {
    id: 'AUTH-001',
    category: 'authentication',
    name: 'Digest auth with MD5 (legacy)',
    description: 'Server requires MD5 digest authentication',
    steps: [
      { action: 'send', type: 'REGISTER', payload: {} },
      {
        action: 'receive',
        type: '401 Unauthorized',
        payload: { algorithm: 'MD5', realm: 'asterisk', nonce: 'md5-nonce' },
      },
      { action: 'send', type: 'REGISTER', payload: { algorithm: 'MD5' } },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { registrationState: 'registered' },
  },
  {
    id: 'AUTH-002',
    category: 'authentication',
    name: 'Digest auth with SHA-256',
    description: 'Server requires SHA-256 digest authentication',
    steps: [
      { action: 'send', type: 'REGISTER', payload: {} },
      {
        action: 'receive',
        type: '401 Unauthorized',
        payload: { algorithm: 'SHA-256', realm: 'asterisk', nonce: 'sha-nonce' },
      },
      { action: 'send', type: 'REGISTER', payload: { algorithm: 'SHA-256' } },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { registrationState: 'registered' },
  },
  {
    id: 'AUTH-003',
    category: 'authentication',
    name: 'Authentication with qop=auth',
    description: 'Quality of Protection auth-int challenge',
    steps: [
      { action: 'send', type: 'REGISTER', payload: {} },
      {
        action: 'receive',
        type: '401',
        payload: { qop: 'auth', realm: 'asterisk', nonce: 'qop-nonce' },
      },
      {
        action: 'send',
        type: 'REGISTER',
        payload: { qop: 'auth', cnonce: 'client-nonce', nc: '00000001' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { registrationState: 'registered' },
  },
  {
    id: 'AUTH-004',
    category: 'authentication',
    name: 'Auth with nonce count overflow (nc > 99999999)',
    description: 'Server forces nonce refresh when nc exceeds limit',
    steps: [
      { action: 'send', type: 'REGISTER', payload: {} },
      { action: 'receive', type: '401', payload: { nonce: 'expiring-nonce' } },
      { action: 'send', type: 'REGISTER', payload: { nc: '99999999' } },
      { action: 'receive', type: '401', payload: { nonce: 'new-nonce', stale: true } },
      { action: 'send', type: 'REGISTER', payload: { nc: '00000001' } },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { registrationState: 'registered' },
  },
]

// ============================================================================
// DTMF Scenarios (55-57)
// ============================================================================

export const dtmfScenarios: SipTestScenario[] = [
  {
    id: 'DTMF-001',
    category: 'dtmf',
    name: 'RFC 2833 DTMF relay',
    description: 'Send DTMF digits via RTP events (RFC 2833)',
    steps: [
      { action: 'send', type: 'INVITE', payload: { sdp: 'a=rtpmap:101 telephone-event/8000' } },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'DTMF', payload: { digit: '1', method: 'rfc2833', duration: 160 } },
      { action: 'send', type: 'DTMF', payload: { digit: '#', method: 'rfc2833', duration: 160 } },
    ],
    expected: { callState: 'active', events: ['dtmf'] },
  },
  {
    id: 'DTMF-002',
    category: 'dtmf',
    name: 'SIP INFO DTMF',
    description: 'Send DTMF via SIP INFO messages',
    steps: [
      { action: 'send', type: 'INVITE', payload: {} },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'send',
        type: 'INFO',
        payload: { 'Content-Type': 'application/dtmf-relay', body: 'Signal=5\r\nDuration=160' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { callState: 'active' },
  },
  {
    id: 'DTMF-003',
    category: 'dtmf',
    name: 'In-band DTMF via audio',
    description: 'DTMF tones carried in audio stream',
    steps: [
      { action: 'send', type: 'INVITE', payload: { sdp: 'codec: PCMU' } },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'DTMF', payload: { digit: '*', method: 'inband' } },
    ],
    expected: { callState: 'active' },
  },
]

// ============================================================================
// Voicemail Scenarios (58-60)
// ============================================================================

export const voicemailScenarios: SipTestScenario[] = [
  {
    id: 'VM-001',
    category: 'voicemail',
    name: 'Voicemail deposit after no answer',
    description: 'Call goes to voicemail after ring timeout',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '180 Ringing', payload: {} },
      { action: 'timeout', delayMs: 15000 },
      { action: 'receive', type: '200 OK', payload: { reason: 'voicemail' } },
    ],
    expected: { callState: 'active', events: ['callStart', 'voicemailDeposit'] },
  },
  {
    id: 'VM-002',
    category: 'voicemail',
    name: 'MWI notification - new voicemail',
    description: 'Server sends NOTIFY with message-waiting indicator',
    steps: [
      {
        action: 'receive',
        type: 'NOTIFY',
        payload: {
          Event: 'message-summary',
          'Content-Type': 'application/simple-message-summary',
          body: 'Messages-Waiting: yes\r\nVoice-Message: 3/0 (2/0)',
        },
      },
      { action: 'send', type: '200 OK', payload: {} },
    ],
    expected: { events: ['voicemailMWI'] },
  },
  {
    id: 'VM-003',
    category: 'voicemail',
    name: 'Busy voicemail deposit',
    description: 'Call forwarded to voicemail because extension is busy',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:1002@asterisk.local' },
      },
      { action: 'receive', type: '486 Busy Here', payload: {} },
      {
        action: 'receive',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:*1002@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: { reason: 'voicemail-busy' } },
    ],
    expected: { callState: 'active' },
  },
]

// ============================================================================
// Presence Scenarios (61-63)
// ============================================================================

export const presenceScenarios: SipTestScenario[] = [
  {
    id: 'PRES-001',
    category: 'presence',
    name: 'Presence SUBSCRIBE and NOTIFY',
    description: 'Subscribe to extension presence and receive updates',
    steps: [
      {
        action: 'send',
        type: 'SUBSCRIBE',
        payload: {
          from: 'sip:1001@asterisk.local',
          to: 'sip:1002@asterisk.local',
          event: 'presence',
        },
      },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'receive',
        type: 'NOTIFY',
        payload: {
          body: '<presence><tuple><status><basic>open</basic></status></tuple></presence>',
        },
      },
    ],
    expected: { events: ['presenceUpdate'] },
  },
  {
    id: 'PRES-002',
    category: 'presence',
    name: 'PUBLISH presence state',
    description: 'Client publishes its own presence state',
    steps: [
      {
        action: 'send',
        type: 'PUBLISH',
        payload: {
          from: 'sip:1001@asterisk.local',
          body: '<presence><tuple><status><basic>open</basic></status></tuple></presence>',
        },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { events: ['presencePublished'] },
  },
  {
    id: 'PRES-003',
    category: 'presence',
    name: 'Subscription termination (SUBSCRIBE Expires: 0)',
    description: 'Unsubscribe from presence by sending Expires: 0',
    steps: [
      { action: 'send', type: 'SUBSCRIBE', payload: { event: 'presence', expires: 3600 } },
      { action: 'receive', type: '200 OK', payload: {} },
      { action: 'send', type: 'SUBSCRIBE', payload: { event: 'presence', expires: 0 } },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { events: ['presenceSubscribe', 'presenceUnsubscribe'] },
  },
]

// ============================================================================
// Conference Scenarios (64-66)
// ============================================================================

export const conferenceScenarios: SipTestScenario[] = [
  {
    id: 'CONF-001',
    category: 'conference',
    name: 'Join conference bridge',
    description: 'Client joins a conference room via INVITE',
    steps: [
      {
        action: 'send',
        type: 'INVITE',
        payload: { from: 'sip:1001@asterisk.local', to: 'sip:9001@asterisk.local' },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { callState: 'active', events: ['conferenceJoined'] },
  },
  {
    id: 'CONF-002',
    category: 'conference',
    name: 'Conference participant join/leave events',
    description: 'Receive notifications about other participants',
    steps: [
      { action: 'send', type: 'INVITE', payload: { to: 'sip:9001@asterisk.local' } },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'receive',
        type: 'NOTIFY',
        payload: { event: 'conference', participant: '1002', action: 'join' },
      },
      {
        action: 'receive',
        type: 'NOTIFY',
        payload: { event: 'conference', participant: '1002', action: 'leave' },
      },
    ],
    expected: { events: ['conferenceJoined', 'participantJoined', 'participantLeft'] },
  },
  {
    id: 'CONF-003',
    category: 'conference',
    name: 'Conference mute/unmute participant',
    description: 'Moderator mutes and unmutes a participant',
    steps: [
      { action: 'send', type: 'INVITE', payload: { to: 'sip:9001@asterisk.local' } },
      { action: 'receive', type: '200 OK', payload: {} },
      {
        action: 'send',
        type: 'INFO',
        payload: {
          'Content-Type': 'application/json',
          body: '{"action":"mute","participant":"1002"}',
        },
      },
      { action: 'receive', type: '200 OK', payload: {} },
    ],
    expected: { callState: 'active', events: ['conferenceJoined', 'participantMuted'] },
  },
]

// ============================================================================
// All Scenarios Exported
// ============================================================================

export const allSipScenarios: SipTestScenario[] = [
  ...registrationScenarios,
  ...callSetupScenarios,
  ...sessionManagementScenarios,
  ...mediaNegotiationScenarios,
  ...networkFailureScenarios,
  ...malformedMessageScenarios,
  ...authenticationScenarios,
  ...dtmfScenarios,
  ...voicemailScenarios,
  ...presenceScenarios,
  ...conferenceScenarios,
]

/** Total scenario count */
export const SCENARIO_COUNT = allSipScenarios.length

/** Get scenarios by category */
export function getScenariosByCategory(category: SipScenarioCategory): SipTestScenario[] {
  return allSipScenarios.filter((s) => s.category === category)
}

/** Get scenarios by tag */
export function getScenariosByTag(tag: string): SipTestScenario[] {
  return allSipScenarios.filter((s) => s.tags?.includes(tag))
}

/** Get scenario by ID */
export function getScenarioById(id: string): SipTestScenario | undefined {
  return allSipScenarios.find((s) => s.id === id)
}

/** Get all unique categories */
export function getCategories(): SipScenarioCategory[] {
  return [...new Set(allSipScenarios.map((s) => s.category))]
}
