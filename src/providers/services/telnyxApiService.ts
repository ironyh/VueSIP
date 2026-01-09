/**
 * Telnyx API Service
 *
 * Service for interacting with the Telnyx API to fetch telephony credentials
 * and SIP connection details for automatic credential configuration.
 *
 * @see https://developers.telnyx.com/api/telephony-credentials/find-telephony-credentials
 * @see https://developers.telnyx.com/docs/voice/webrtc/auth/telephony-credentials
 */

/** Telnyx telephony credential */
export interface TelnyxCredential {
  /** Unique credential ID */
  id: string
  /** SIP username for authentication */
  sip_username: string
  /** SIP password for authentication */
  sip_password: string
  /** Associated connection ID */
  connection_id: string
  /** Credential name (optional) */
  name?: string
  /** Tag for organization */
  tag?: string
  /** Credential status */
  resource_id?: string
  /** Record type */
  record_type: 'telephony_credential'
  /** Creation timestamp */
  created_at: string
  /** Last update timestamp */
  updated_at: string
  /** Expiration timestamp (if set) */
  expires_at?: string | null
}

/** Telnyx SIP Connection */
export interface TelnyxConnection {
  /** Connection ID */
  id: string
  /** Connection name */
  connection_name: string
  /** Record type */
  record_type: 'credential_connection' | 'ip_connection' | 'fqdn_connection'
  /** Active status */
  active: boolean
  /** WebRTC enabled */
  webrtc_enabled?: boolean
  /** Associated user name */
  user_name?: string
  /** SIP URI username */
  sip_uri_calling_preference?: string
  /** Creation timestamp */
  created_at: string
  /** Last update timestamp */
  updated_at: string
}

/** Response from GET /v2/telephony_credentials */
export interface TelnyxCredentialsResponse {
  data: TelnyxCredential[]
  meta: {
    total_pages: number
    total_results: number
    page_number: number
    page_size: number
  }
}

/** Response from GET /v2/credential_connections */
export interface TelnyxConnectionsResponse {
  data: TelnyxConnection[]
  meta: {
    total_pages: number
    total_results: number
    page_number: number
    page_size: number
  }
}

/** API key for Telnyx */
export interface TelnyxApiCredentials {
  /** V2 API Key from Telnyx Mission Control portal */
  apiKey: string
}

/** Error response from Telnyx API */
export interface TelnyxApiError {
  errors: Array<{
    code: string
    title: string
    detail: string
    source?: {
      pointer?: string
    }
  }>
}

// Use proxy in development to avoid CORS, direct API in production/server-side
const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? '/api/telnyx/v2' // Vite proxy path
    : 'https://api.telnyx.com/v2'

/**
 * Create Bearer Auth header from API key
 */
function createAuthHeader(credentials: TelnyxApiCredentials): string {
  return `Bearer ${credentials.apiKey}`
}

/**
 * Fetch all telephony credentials from Telnyx account
 *
 * @param credentials - API key
 * @param options - Optional filters
 * @returns List of telephony credentials
 * @throws Error if API request fails
 */
export async function fetchCredentials(
  credentials: TelnyxApiCredentials,
  options?: {
    pageSize?: number
    pageNumber?: number
    connectionId?: string
    status?: 'active' | 'expired'
  }
): Promise<TelnyxCredential[]> {
  const params = new URLSearchParams()
  if (options?.pageSize) params.set('page[size]', options.pageSize.toString())
  if (options?.pageNumber) params.set('page[number]', options.pageNumber.toString())
  if (options?.connectionId) params.set('filter[connection_id]', options.connectionId)
  if (options?.status) params.set('filter[status]', options.status)

  const url = `${API_BASE}/telephony_credentials${params.toString() ? `?${params}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(credentials),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key')
    }
    if (response.status === 403) {
      throw new Error('API key does not have permission to access credentials')
    }
    const errorText = await response.text()
    throw new Error(`Failed to fetch credentials: ${response.status} ${errorText}`)
  }

  const data: TelnyxCredentialsResponse = await response.json()
  return data.data || []
}

/**
 * Fetch all credential connections from Telnyx account
 *
 * @param credentials - API key
 * @returns List of SIP connections
 * @throws Error if API request fails
 */
export async function fetchConnections(
  credentials: TelnyxApiCredentials
): Promise<TelnyxConnection[]> {
  const response = await fetch(`${API_BASE}/credential_connections`, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(credentials),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key')
    }
    if (response.status === 403) {
      throw new Error('API key does not have permission to access connections')
    }
    const errorText = await response.text()
    throw new Error(`Failed to fetch connections: ${response.status} ${errorText}`)
  }

  const data: TelnyxConnectionsResponse = await response.json()
  return data.data || []
}

/**
 * Fetch a single credential by ID
 *
 * @param credentials - API key
 * @param credentialId - Credential ID to fetch
 * @returns Credential details
 * @throws Error if API request fails or credential not found
 */
export async function fetchCredentialById(
  credentials: TelnyxApiCredentials,
  credentialId: string
): Promise<TelnyxCredential> {
  const response = await fetch(`${API_BASE}/telephony_credentials/${credentialId}`, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(credentials),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key')
    }
    if (response.status === 404) {
      throw new Error(`Credential not found: ${credentialId}`)
    }
    const errorText = await response.text()
    throw new Error(`Failed to fetch credential: ${response.status} ${errorText}`)
  }

  const data: { data: TelnyxCredential } = await response.json()
  return data.data
}

/**
 * Validate API key by attempting to list credentials
 *
 * @param credentials - API key
 * @returns true if API key is valid
 */
export async function validateApiKey(credentials: TelnyxApiCredentials): Promise<boolean> {
  try {
    await fetchCredentials(credentials, { pageSize: 1 })
    return true
  } catch {
    return false
  }
}

/**
 * Format credential for display
 */
export function formatCredentialDisplay(credential: TelnyxCredential): string {
  if (credential.name) {
    return `${credential.name} (${credential.sip_username})`
  }
  return credential.sip_username
}

/**
 * Check if credential is expired
 */
export function isCredentialExpired(credential: TelnyxCredential): boolean {
  if (!credential.expires_at) return false
  return new Date(credential.expires_at) < new Date()
}

/**
 * Get active (non-expired) credentials only
 */
export function filterActiveCredentials(credentials: TelnyxCredential[]): TelnyxCredential[] {
  return credentials.filter((cred) => !isCredentialExpired(cred))
}
