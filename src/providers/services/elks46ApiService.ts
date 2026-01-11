/**
 * 46 elks API Service
 *
 * Service for interacting with the 46 elks API to fetch phone numbers
 * and WebRTC credentials for SIP configuration.
 *
 * @see https://46elks.com/docs/webrtc-client-connect
 * @see https://46elks.com/docs/get-numbers
 */

const API_BASE = 'https://api.46elks.com/a1'

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
  phoneNumber: string
): Promise<Elks46Number> {
  // Remove + prefix if present for API call
  const number = phoneNumber.replace(/^\+/, '')

  const response = await fetch(`${API_BASE}/numbers/${number}`, {
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
