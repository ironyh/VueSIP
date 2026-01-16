/**
 * use46ElksApi Composable
 *
 * Vue composable for interacting with the 46 elks API to fetch phone numbers
 * and WebRTC credentials for automatic SIP configuration.
 *
 * @see https://46elks.com/docs/webrtc-client-connect
 * @see https://46elks.com/docs/get-numbers
 *
 * @example
 * ```vue
 * <script setup>
 * import { use46ElksApi } from 'vuesip'
 *
 * const {
 *   isLoading,
 *   error,
 *   isAuthenticated,
 *   numbers,
 *   selectedNumber,
 *   secret,
 *   authenticate,
 *   selectNumber,
 *   getCredentials,
 *   clear
 * } = use46ElksApi()
 *
 * // Authenticate with API credentials
 * await authenticate('u1234...', 'password')
 *
 * // Select a number (this fetches its WebRTC secret)
 * await selectNumber(numbers.value[0])
 *
 * // Get credentials for the selected number
 * const creds = getCredentials()
 * // { phoneNumber: '+46700000000', secret: 'abc123...' }
 * </script>
 * ```
 */

import { ref, type Ref, type DeepReadonly } from 'vue'
import {
  fetchNumbers,
  fetchNumberDetails,
  filterActiveNumbers,
  formatPhoneForSip,
  fetchCalls,
  fetchAllCalls,
  type Elks46ApiCredentials,
  type Elks46Number,
  type Elks46Call,
  type FetchCallsOptions,
} from '../providers/services/elks46ApiService'

export interface Use46ElksApiReturn {
  /** Loading state */
  isLoading: DeepReadonly<Ref<boolean>>
  /** Error message if any */
  error: DeepReadonly<Ref<string | null>>
  /** Whether authenticated with API */
  isAuthenticated: DeepReadonly<Ref<boolean>>
  /** List of phone numbers from API */
  numbers: DeepReadonly<Ref<Elks46Number[]>>
  /** Currently selected number */
  selectedNumber: DeepReadonly<Ref<Elks46Number | null>>
  /** WebRTC secret for selected number */
  secret: DeepReadonly<Ref<string | null>>
  /** Call history from 46elks */
  callHistory: DeepReadonly<Ref<Elks46Call[]>>
  /** Whether call history is loading */
  isLoadingCallHistory: DeepReadonly<Ref<boolean>>
  /** Authenticate with 46 elks API and fetch numbers */
  authenticate: (username: string, password: string) => Promise<boolean>
  /** Select a number and fetch its WebRTC secret */
  selectNumber: (number: Elks46Number) => Promise<void>
  /** Get credentials for the selected number (for use with provider form) */
  getCredentials: () => { phoneNumber: string; secret: string } | null
  /** Fetch call history from 46elks */
  loadCallHistory: (options?: FetchCallsOptions) => Promise<Elks46Call[]>
  /** Fetch all call history (handles pagination) */
  loadAllCallHistory: (options?: Omit<FetchCallsOptions, 'start'>) => Promise<Elks46Call[]>
  /** Clear all state (logout) */
  clear: () => void
}

// Store credentials for fetching number details
let storedCredentials: Elks46ApiCredentials | null = null

export function use46ElksApi(): Use46ElksApiReturn {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isAuthenticated = ref(false)
  const numbers = ref<Elks46Number[]>([])
  const selectedNumber = ref<Elks46Number | null>(null)
  const secret = ref<string | null>(null)
  const callHistory = ref<Elks46Call[]>([])
  const isLoadingCallHistory = ref(false)

  /**
   * Authenticate with 46 elks API credentials and fetch available numbers
   */
  async function authenticate(username: string, password: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const credentials: Elks46ApiCredentials = { username, password }

      // Fetch phone numbers
      const fetchedNumbers = await fetchNumbers(credentials)

      // Filter to only active numbers
      numbers.value = filterActiveNumbers(fetchedNumbers)

      if (numbers.value.length === 0) {
        error.value = 'No active phone numbers found. Add a number in your 46 elks dashboard.'
        isAuthenticated.value = false
        return false
      }

      // Store credentials for later use when fetching number details
      storedCredentials = credentials
      isAuthenticated.value = true

      // Auto-select if only one number
      if (numbers.value.length === 1 && numbers.value[0]) {
        await selectNumber(numbers.value[0])
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Authentication failed'
      isAuthenticated.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Select a number and fetch its WebRTC secret
   */
  async function selectNumber(number: Elks46Number): Promise<void> {
    if (!storedCredentials) {
      error.value = 'Not authenticated'
      return
    }

    isLoading.value = true
    error.value = null
    selectedNumber.value = number

    try {
      // Fetch full number details including WebRTC secret
      // API expects the number ID (e.g., nb67e...), not the phone number
      const details = await fetchNumberDetails(storedCredentials, number.id)

      if (!details.secret) {
        error.value =
          'This number does not have WebRTC enabled. Enable it in your 46 elks dashboard.'
        secret.value = null
        return
      }

      secret.value = details.secret
      // Update selected number with full details
      selectedNumber.value = details
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch number details'
      secret.value = null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get credentials for the selected number in the format expected by the provider
   */
  function getCredentials(): { phoneNumber: string; secret: string } | null {
    if (!selectedNumber.value || !secret.value) {
      return null
    }

    return {
      phoneNumber: formatPhoneForSip(selectedNumber.value.number),
      secret: secret.value,
    }
  }

  /**
   * Load call history from 46elks API
   */
  async function loadCallHistory(options?: FetchCallsOptions): Promise<Elks46Call[]> {
    if (!storedCredentials) {
      error.value = 'Not authenticated'
      return []
    }

    isLoadingCallHistory.value = true
    error.value = null

    try {
      const calls = await fetchCalls(storedCredentials, options)
      callHistory.value = calls
      return calls
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch call history'
      return []
    } finally {
      isLoadingCallHistory.value = false
    }
  }

  /**
   * Load all call history (handles pagination automatically)
   */
  async function loadAllCallHistory(
    options?: Omit<FetchCallsOptions, 'start'>
  ): Promise<Elks46Call[]> {
    if (!storedCredentials) {
      error.value = 'Not authenticated'
      return []
    }

    isLoadingCallHistory.value = true
    error.value = null

    try {
      const calls = await fetchAllCalls(storedCredentials, options)
      callHistory.value = calls
      return calls
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch call history'
      return []
    } finally {
      isLoadingCallHistory.value = false
    }
  }

  /**
   * Clear all state (logout)
   */
  function clear(): void {
    isLoading.value = false
    error.value = null
    isAuthenticated.value = false
    numbers.value = []
    selectedNumber.value = null
    secret.value = null
    callHistory.value = []
    isLoadingCallHistory.value = false
    callHistory.value = []
    isLoadingCallHistory.value = false
    storedCredentials = null
  }

  return {
    isLoading: isLoading as DeepReadonly<Ref<boolean>>,
    error: error as DeepReadonly<Ref<string | null>>,
    isAuthenticated: isAuthenticated as DeepReadonly<Ref<boolean>>,
    numbers: numbers as DeepReadonly<Ref<Elks46Number[]>>,
    selectedNumber: selectedNumber as DeepReadonly<Ref<Elks46Number | null>>,
    secret: secret as DeepReadonly<Ref<string | null>>,
    callHistory: callHistory as DeepReadonly<Ref<Elks46Call[]>>,
    isLoadingCallHistory: isLoadingCallHistory as DeepReadonly<Ref<boolean>>,
    authenticate,
    selectNumber,
    getCredentials,
    loadCallHistory,
    loadAllCallHistory,

    clear,
  }
}
