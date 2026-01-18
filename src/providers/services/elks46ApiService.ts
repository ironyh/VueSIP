/**
 * 46 elks API Service
 *
 * Service for interacting with the 46 elks API to fetch phone numbers
 * and WebRTC credentials for SIP configuration.
 *
 * @see https://46elks.com/docs/webrtc-client-connect
 * @see https://46elks.com/docs/get-numbers
 */

// Use proxy to avoid CORS - works in both development (Vite proxy) and production (Cloudflare Function)
const API_BASE = '/api/46elks/a1'

/**
 * 46 elks API credentials for authentication
 */
export interface Elks46ApiCredentials {
  /** API Username (starts with 'u') */
  username: string
  /** API Password */
  password: string
}

/**
 * 46 elks phone number from API
 */
export interface Elks46Number {
  /** Unique number ID (e.g., nb67e00a13c4b7078a4f5c597821db132) */
  id: string
  /** E.164 format number (e.g., +46700000000) */
  number: string
  /** Number status */
  active: 'yes' | 'no'
  /** Display name if set */
  name?: string
  /** Country code */
  country?: string
  /** Number capabilities */
  capabilities?: string[]
  /** WebRTC secret (only present when fetched individually) */
  secret?: string
}

/**
 * Response from listing numbers
 */
interface ListNumbersResponse {
  data: Elks46Number[]
}

/**
 * Create Basic Auth header from credentials
 */
function createAuthHeader(credentials: Elks46ApiCredentials): string {
  const encoded = btoa(`${credentials.username}:${credentials.password}`)
  return `Basic ${encoded}`
}

/**
 * Fetch all phone numbers from 46 elks account
 */
export async function fetchNumbers(credentials: Elks46ApiCredentials): Promise<Elks46Number[]> {
  const response = await fetch(`${API_BASE}/numbers`, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(credentials),
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API credentials')
    }
    throw new Error(`Failed to fetch numbers: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as ListNumbersResponse
  return data.data || []
}

/**
 * Fetch details for a specific phone number (includes WebRTC secret)
 */
export async function fetchNumberDetails(
  credentials: Elks46ApiCredentials,
  numberId: string
): Promise<Elks46Number> {
  const response = await fetch(`${API_BASE}/numbers/${numberId}`, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(credentials),
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API credentials')
    }
    if (response.status === 404) {
      throw new Error('Phone number not found')
    }
    throw new Error(`Failed to fetch number details: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as Elks46Number
}

/**
 * Filter numbers that are active and likely support WebRTC
 */
export function filterActiveNumbers(numbers: Elks46Number[]): Elks46Number[] {
  return numbers.filter((num) => num.active === 'yes')
}

/**
 * Format phone number for SIP URI (remove + prefix)
 */
export function formatPhoneForSip(phoneNumber: string): string {
  return phoneNumber.replace(/^\+/, '')
}

// ============================================================================
// Call History API
// ============================================================================

/**
 * Call direction from 46elks perspective
 */
export type Elks46CallDirection = 'incoming' | 'outgoing'

/**
 * Call state/result
 */
export type Elks46CallState = 'success' | 'failed' | 'busy' | 'noanswer' | 'cancel'

/**
 * Individual call leg (for multi-party calls)
 */
export interface Elks46CallLeg {
  /** Leg state */
  state: Elks46CallState
  /** Duration in seconds */
  duration?: number
  /** Cost in cents */
  cost?: number
  /** Destination number */
  to?: string
}

/**
 * 46elks call record from API
 */
export interface Elks46Call {
  /** Unique call ID */
  id: string
  /** Call direction */
  direction: Elks46CallDirection
  /** Caller number (E.164) */
  from: string
  /** Callee number (E.164) */
  to: string
  /** Call start time (ISO 8601) */
  created: string
  /** Call state/outcome */
  state: Elks46CallState
  /** Duration in seconds */
  duration?: number
  /** Cost in cents */
  cost?: number
  /** Call legs for multi-party calls */
  legs?: Elks46CallLeg[]
}

/**
 * Response from listing calls
 */
interface ListCallsResponse {
  data: Elks46Call[]
  /** Timestamp for pagination - use as 'start' for next page */
  next?: string
}

/**
 * Options for fetching call history
 */
export interface FetchCallsOptions {
  /** Filter calls created before this timestamp (ISO 8601 or Unix timestamp) */
  start?: string | number
  /** Filter calls created after this timestamp (ISO 8601 or Unix timestamp) */
  end?: string | number
  /** Maximum calls per request (max 100) */
  limit?: number
}

/**
 * Fetch call history from 46elks account
 *
 * @param credentials - API credentials
 * @param options - Filter and pagination options
 * @returns Array of call records
 *
 * @example
 * ```ts
 * // Get recent calls
 * const calls = await fetchCalls(credentials)
 *
 * // Get calls from last 24 hours
 * const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
 * const calls = await fetchCalls(credentials, { end: yesterday })
 *
 * // Paginate through all calls
 * let allCalls: Elks46Call[] = []
 * let nextStart: string | undefined
 * do {
 *   const result = await fetchCallsWithPagination(credentials, { start: nextStart })
 *   allCalls.push(...result.calls)
 *   nextStart = result.next
 * } while (nextStart)
 * ```
 */
export async function fetchCalls(
  credentials: Elks46ApiCredentials,
  options?: FetchCallsOptions
): Promise<Elks46Call[]> {
  const result = await fetchCallsWithPagination(credentials, options)
  return result.calls
}

/**
 * Fetch call history with pagination info
 *
 * @param credentials - API credentials
 * @param options - Filter and pagination options
 * @returns Object with calls array and next page token
 */
export async function fetchCallsWithPagination(
  credentials: Elks46ApiCredentials,
  options?: FetchCallsOptions
): Promise<{ calls: Elks46Call[]; next?: string }> {
  const params = new URLSearchParams()

  if (options?.start) {
    params.set('start', String(options.start))
  }
  if (options?.end) {
    params.set('end', String(options.end))
  }
  if (options?.limit) {
    params.set('limit', String(Math.min(options.limit, 100)))
  }

  const url = params.toString() ? `${API_BASE}/calls?${params}` : `${API_BASE}/calls`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(credentials),
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API credentials')
    }
    throw new Error(`Failed to fetch calls: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as ListCallsResponse
  return {
    calls: data.data || [],
    next: data.next,
  }
}

/**
 * Fetch all calls (handles pagination automatically)
 *
 * WARNING: This may make multiple API requests for accounts with many calls.
 * Consider using fetchCallsWithPagination for large datasets.
 *
 * @param credentials - API credentials
 * @param options - Filter options (limit is per-page, not total)
 * @returns All matching call records
 */
export async function fetchAllCalls(
  credentials: Elks46ApiCredentials,
  options?: Omit<FetchCallsOptions, 'start'>
): Promise<Elks46Call[]> {
  const allCalls: Elks46Call[] = []
  let nextStart: string | undefined

  do {
    const result = await fetchCallsWithPagination(credentials, {
      ...options,
      start: nextStart,
    })
    allCalls.push(...result.calls)
    nextStart = result.next
  } while (nextStart)

  return allCalls
}
