/**
 * useTelnyxApi Composable
 *
 * Vue composable for interacting with the Telnyx API to fetch telephony credentials
 * for automatic SIP configuration.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useTelnyxApi } from 'vuesip'
 *
 * const {
 *   isLoading,
 *   error,
 *   credentials,
 *   selectedCredential,
 *   authenticate,
 *   selectCredential,
 *   getCredentials
 * } = useTelnyxApi()
 *
 * // Authenticate with API key
 * await authenticate('KEY_abc123...')
 *
 * // Select a credential from the fetched list
 * selectCredential(credentials.value[0])
 *
 * // Get credentials for the selected item
 * const creds = getCredentials()
 * // { username: 'sip_user', password: 'sip_pass' }
 * </script>
 * ```
 */

import { ref, type Ref, type DeepReadonly } from 'vue'
import {
  fetchCredentials,
  fetchConnections,
  filterActiveCredentials,
  type TelnyxCredential,
  type TelnyxConnection,
  type TelnyxApiCredentials,
} from '../providers/services/telnyxApiService'

export interface UseTelnyxApiReturn {
  /** Loading state */
  isLoading: DeepReadonly<Ref<boolean>>
  /** Error message if any */
  error: DeepReadonly<Ref<string | null>>
  /** Whether authenticated with API */
  isAuthenticated: DeepReadonly<Ref<boolean>>
  /** List of telephony credentials from API */
  credentials: DeepReadonly<Ref<TelnyxCredential[]>>
  /** List of SIP connections from API */
  connections: DeepReadonly<Ref<TelnyxConnection[]>>
  /** Currently selected credential */
  selectedCredential: DeepReadonly<Ref<TelnyxCredential | null>>
  /** Authenticate with Telnyx API key and fetch credentials */
  authenticate: (apiKey: string) => Promise<boolean>
  /** Select a credential from the list */
  selectCredential: (credential: TelnyxCredential) => void
  /** Get SIP credentials for the selected credential (for use with provider form) */
  getCredentials: () => { username: string; password: string } | null
  /** Clear all state (logout) */
  clear: () => void
}

export function useTelnyxApi(): UseTelnyxApiReturn {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isAuthenticated = ref(false)
  const credentials = ref<TelnyxCredential[]>([])
  const connections = ref<TelnyxConnection[]>([])
  const selectedCredential = ref<TelnyxCredential | null>(null)

  /**
   * Authenticate with Telnyx API key and fetch available credentials
   */
  async function authenticate(apiKey: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      const apiCredentials: TelnyxApiCredentials = { apiKey }

      // Fetch both credentials and connections in parallel
      const [fetchedCredentials, fetchedConnections] = await Promise.all([
        fetchCredentials(apiCredentials),
        fetchConnections(apiCredentials).catch(() => [] as TelnyxConnection[]),
      ])

      // Filter to only active (non-expired) credentials
      credentials.value = filterActiveCredentials(fetchedCredentials)
      connections.value = fetchedConnections

      if (credentials.value.length === 0) {
        error.value =
          'No active telephony credentials found. Create one in your Telnyx Mission Control portal.'
        isAuthenticated.value = false
        return false
      }

      isAuthenticated.value = true

      // Auto-select if only one credential
      if (credentials.value.length === 1 && credentials.value[0]) {
        selectCredential(credentials.value[0])
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
   * Select a credential from the list
   */
  function selectCredential(credential: TelnyxCredential): void {
    selectedCredential.value = credential
    error.value = null
  }

  /**
   * Get SIP credentials for the selected credential in the format expected by the provider form
   */
  function getCredentials(): { username: string; password: string } | null {
    if (!selectedCredential.value) {
      return null
    }

    return {
      username: selectedCredential.value.sip_username,
      password: selectedCredential.value.sip_password,
    }
  }

  /**
   * Clear all state (logout)
   */
  function clear(): void {
    isLoading.value = false
    error.value = null
    isAuthenticated.value = false
    credentials.value = []
    connections.value = []
    selectedCredential.value = null
  }

  return {
    isLoading: isLoading as DeepReadonly<Ref<boolean>>,
    error: error as DeepReadonly<Ref<string | null>>,
    isAuthenticated: isAuthenticated as DeepReadonly<Ref<boolean>>,
    credentials: credentials as DeepReadonly<Ref<TelnyxCredential[]>>,
    connections: connections as DeepReadonly<Ref<TelnyxConnection[]>>,
    selectedCredential: selectedCredential as DeepReadonly<Ref<TelnyxCredential | null>>,
    authenticate,
    selectCredential,
    getCredentials,
    clear,
  }
}
