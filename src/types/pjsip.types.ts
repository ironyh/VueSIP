/**
 * PJSIP Management Types
 *
 * Type definitions for Asterisk PJSIP endpoint and transport management via AMI.
 *
 * @module types/pjsip.types
 */

import type { BaseAmiOptions } from './common'

// ============================================================================
// Core Types
// ============================================================================

/**
 * PJSIP endpoint status
 */
export type PjsipEndpointStatus = 'Available' | 'Unavailable' | 'Not in use' | 'Busy' | 'Ringing'

/**
 * PJSIP transport type
 */
export type PjsipTransportType = 'udp' | 'tcp' | 'tls' | 'ws' | 'wss'

/**
 * PJSIP registration status
 */
export type PjsipRegistrationStatus = 'Registered' | 'Unregistered' | 'Rejected' | 'Unknown'

/**
 * PJSIP endpoint (represents a SIP peer/extension)
 */
export interface PjsipEndpoint {
  /** Endpoint name/ID */
  endpoint: string
  /** Display name */
  displayName?: string
  /** Current status */
  status: PjsipEndpointStatus
  /** Device state (UNKNOWN, NOT_INUSE, INUSE, BUSY, etc.) */
  deviceState: string
  /** Associated AOR (Address of Record) */
  aor?: string
  /** Active channel count */
  activeChannels: number
  /** Maximum contacts allowed */
  maxContacts: number
  /** Current contact count */
  contactCount: number
  /** Context for outbound calls */
  context?: string
  /** Last updated timestamp */
  updatedAt: Date
}

/**
 * PJSIP contact (registered device for an endpoint)
 */
export interface PjsipContact {
  /** Parent endpoint */
  endpoint: string
  /** AOR name */
  aor: string
  /** Contact URI (e.g., sip:1001@192.168.1.100:5060) */
  uri: string
  /** User agent string */
  userAgent?: string
  /** Registration expiration time */
  expiresAt?: Date
  /** Round-trip time in ms */
  rtt?: number
  /** Contact status */
  status: 'Reachable' | 'Unreachable' | 'Unknown'
  /** Via address (NAT address if applicable) */
  viaAddress?: string
  /** Call ID from registration */
  callId?: string
  /** Authentication username */
  authUser?: string
  /** Outbound proxy */
  outboundProxy?: string
  /** Path headers */
  path?: string
  /** Quality of service qualify frequency */
  qualifyFrequency?: number
  /** Last qualified timestamp */
  lastQualifyAt?: Date
}

/**
 * PJSIP AOR (Address of Record)
 */
export interface PjsipAor {
  /** AOR name */
  aor: string
  /** Parent endpoint */
  endpoint: string
  /** Maximum contacts allowed */
  maxContacts: number
  /** Current contact count */
  contactCount: number
  /** Remove existing on new contact */
  removeExisting: boolean
  /** Default expiration time */
  defaultExpiration: number
  /** Minimum expiration time */
  minExpiration: number
  /** Maximum expiration time */
  maxExpiration: number
  /** Qualify frequency */
  qualifyFrequency?: number
  /** Qualify timeout */
  qualifyTimeout?: number
  /** Authenticate qualify */
  authenticateQualify: boolean
  /** Mailboxes for MWI */
  mailboxes?: string[]
  /** Voicemail extension */
  voicemailExtension?: string
  /** Support path */
  supportPath: boolean
}

/**
 * PJSIP transport
 */
export interface PjsipTransport {
  /** Transport name */
  transport: string
  /** Transport type */
  type: PjsipTransportType
  /** Bind address */
  bindAddress: string
  /** Bind port */
  bindPort: number
  /** External media address */
  externalMediaAddress?: string
  /** External signaling address */
  externalSignalingAddress?: string
  /** Local network CIDR */
  localNet?: string[]
  /** TLS certificate file */
  certFile?: string
  /** TLS private key file */
  privKeyFile?: string
  /** TLS CA file */
  caFile?: string
  /** Cipher list */
  cipher?: string
  /** TLS method */
  method?: 'tlsv1' | 'tlsv1_1' | 'tlsv1_2' | 'tlsv1_3' | 'sslv23'
  /** Verify server certificate */
  verifyServer: boolean
  /** Verify client certificate */
  verifyClient: boolean
  /** WebSocket enabled */
  websocketEnabled: boolean
}

/**
 * PJSIP registration (outbound registration)
 */
export interface PjsipRegistration {
  /** Registration name */
  registration: string
  /** Server URI */
  serverUri: string
  /** Client URI */
  clientUri: string
  /** Current status */
  status: PjsipRegistrationStatus
  /** Authentication username */
  authUser?: string
  /** Outbound proxy */
  outboundProxy?: string
  /** Transport */
  transport?: string
  /** Expiration time */
  expiration: number
  /** Retry interval on failure */
  retryInterval: number
  /** Maximum retry attempts */
  maxRetries: number
  /** Current retry count */
  retryCount: number
  /** Next registration attempt */
  nextAttemptAt?: Date
  /** Last registered timestamp */
  registeredAt?: Date
}

/**
 * PJSIP identify (IP-based identification)
 */
export interface PjsipIdentify {
  /** Identify name */
  identify: string
  /** Associated endpoint */
  endpoint: string
  /** Match IP addresses/ranges */
  match: string[]
  /** SRV lookups */
  srvLookups: boolean
}

/**
 * PJSIP auth (authentication credentials)
 */
export interface PjsipAuth {
  /** Auth name */
  auth: string
  /** Auth type */
  authType: 'userpass' | 'md5' | 'google_oauth'
  /** Username */
  username: string
  /** Realm */
  realm?: string
  /** Nonce lifetime */
  nonceLifetime?: number
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * PJSIP endpoint statistics
 */
export interface PjsipEndpointStats {
  /** Total endpoints */
  total: number
  /** Available endpoints */
  available: number
  /** Unavailable endpoints */
  unavailable: number
  /** Busy endpoints */
  busy: number
  /** Ringing endpoints */
  ringing: number
  /** Registration rate (available/total) */
  registrationRate: number
}

/**
 * PJSIP transport statistics
 */
export interface PjsipTransportStats {
  /** Transport name */
  transport: string
  /** Active connections */
  activeConnections: number
  /** Total connections since start */
  totalConnections: number
  /** Bytes sent */
  bytesSent: number
  /** Bytes received */
  bytesReceived: number
  /** Messages sent */
  messagesSent: number
  /** Messages received */
  messagesReceived: number
}

// ============================================================================
// Event Types
// ============================================================================

export interface AmiPjsipContactStatusEvent {
  Event: 'ContactStatus'
  URI: string
  ContactStatus: 'Reachable' | 'Unreachable' | 'Removed' | 'Created'
  AOR: string
  EndpointName: string
  RoundtripUsec?: string
  UserAgent?: string
  RegExpire?: string
  ViaAddress?: string
  CallID?: string
  ID?: string
  AuthenticateQualify?: string
  OutboundProxy?: string
  Path?: string
  QualifyFrequency?: string
  QualifyTimeout?: string
}

export interface AmiPjsipEndpointListEvent {
  Event: 'EndpointList'
  ObjectType: 'endpoint'
  ObjectName: string
  Transport?: string
  Aor?: string
  Auths?: string
  OutboundAuths?: string
  Contacts?: string
  DeviceState: string
  ActiveChannels?: string
}

export interface AmiPjsipEndpointDetailEvent {
  Event: 'EndpointDetail'
  ObjectType: 'endpoint'
  ObjectName: string
  Context?: string
  Disallow?: string
  Allow?: string
  DtmfMode?: string
  RtpIpv6?: string
  RtpSymmetric?: string
  IceSupport?: string
  UsePtime?: string
  ForceRport?: string
  RewriteContact?: string
  Transport?: string
  Aors?: string
  Auths?: string
  DirectMedia?: string
  // ... many more fields
}

export interface AmiPjsipAorListEvent {
  Event: 'AorList'
  ObjectType: 'aor'
  ObjectName: string
  MinimumExpiration?: string
  MaximumExpiration?: string
  DefaultExpiration?: string
  QualifyFrequency?: string
  QualifyTimeout?: string
  AuthenticateQualify?: string
  MaxContacts?: string
  RemoveExisting?: string
  Mailboxes?: string
  SupportPath?: string
  VoicemailExtension?: string
  TotalContacts?: string
  ContactsRegistered?: string
  EndpointName?: string
}

export interface AmiPjsipContactListEvent {
  Event: 'ContactList'
  ObjectType: 'contact'
  ObjectName: string
  ViaAddress?: string
  QualifyFrequency?: string
  QualifyTimeout?: string
  AuthenticateQualify?: string
  OutboundProxy?: string
  Path?: string
  Uri: string
  UserAgent?: string
  RegExpire?: string
  ExpirationTime?: string
  Status: string
  RoundtripUsec?: string
  EndpointName?: string
  ID?: string
}

export interface AmiPjsipTransportListEvent {
  Event: 'TransportDetail'
  ObjectType: 'transport'
  ObjectName: string
  Protocol: string
  Bind?: string
  AsymmetricRtpCodec?: string
  SymmetricTransport?: string
  AllowReload?: string
  Cipher?: string
  LocalNet?: string
  CaFile?: string
  CaPath?: string
  CertFile?: string
  PrivKeyFile?: string
  ExternalMediaAddress?: string
  ExternalSignalingAddress?: string
  Method?: string
  VerifyClient?: string
  VerifyServer?: string
  Websocket?: string
}

export interface AmiPjsipDeviceStateEvent {
  Event: 'DeviceStateChange'
  Device: string
  State: string
}

// ============================================================================
// Options Types
// ============================================================================

export interface UseAmiPjsipOptions extends BaseAmiOptions {
  /** Filter endpoints by pattern */
  endpointFilter?: (endpoint: PjsipEndpoint) => boolean
  /** Transform endpoint data after parsing */
  transformEndpoint?: (endpoint: PjsipEndpoint) => PjsipEndpoint
  /** Callback when endpoint status changes */
  onEndpointChange?: (endpoint: PjsipEndpoint, previousStatus: PjsipEndpointStatus) => void
  /** Callback when contact status changes */
  onContactChange?: (contact: PjsipContact) => void
  /** Include transport details */
  includeTransports?: boolean
  /** Include registration details */
  includeRegistrations?: boolean
}

// ============================================================================
// Return Types
// ============================================================================

export interface UseAmiPjsipReturn {
  /** Reactive map of endpoints by name */
  endpoints: import('vue').Ref<Map<string, PjsipEndpoint>>
  /** Reactive map of contacts by URI */
  contacts: import('vue').Ref<Map<string, PjsipContact>>
  /** Reactive map of AORs by name */
  aors: import('vue').Ref<Map<string, PjsipAor>>
  /** Reactive map of transports by name */
  transports: import('vue').Ref<Map<string, PjsipTransport>>
  /** Reactive map of registrations by name */
  registrations: import('vue').Ref<Map<string, PjsipRegistration>>
  /** Loading state */
  isLoading: import('vue').Ref<boolean>
  /** Error state */
  error: import('vue').Ref<string | null>
  /** Computed endpoint array */
  endpointList: import('vue').ComputedRef<PjsipEndpoint[]>
  /** Computed contact array */
  contactList: import('vue').ComputedRef<PjsipContact[]>
  /** Computed AOR array */
  aorList: import('vue').ComputedRef<PjsipAor[]>
  /** Computed transport array */
  transportList: import('vue').ComputedRef<PjsipTransport[]>
  /** Computed registration array */
  registrationList: import('vue').ComputedRef<PjsipRegistration[]>
  /** Endpoint statistics */
  stats: import('vue').ComputedRef<PjsipEndpointStats>
  /** Total online endpoints */
  totalOnline: import('vue').ComputedRef<number>
  /** Total offline endpoints */
  totalOffline: import('vue').ComputedRef<number>
  /** List all endpoints */
  listEndpoints: () => Promise<void>
  /** List contacts for endpoint */
  listContacts: (endpoint?: string) => Promise<void>
  /** List all AORs */
  listAors: () => Promise<void>
  /** List all transports */
  listTransports: () => Promise<void>
  /** List all registrations */
  listRegistrations: () => Promise<void>
  /** Get endpoint details */
  getEndpointDetail: (endpoint: string) => Promise<PjsipEndpoint | null>
  /** Qualify endpoint (check reachability) */
  qualifyEndpoint: (endpoint: string) => Promise<boolean>
  /** Qualify all endpoints */
  qualifyAll: () => Promise<void>
  /** Refresh all data */
  refresh: () => Promise<void>
  /** Get contacts for specific endpoint */
  getEndpointContacts: (endpoint: string) => PjsipContact[]
  /** Check if endpoint is registered */
  isEndpointRegistered: (endpoint: string) => boolean
  /** Check if endpoint is available */
  isEndpointAvailable: (endpoint: string) => boolean
}
