/**
 * Provider Selector Composable
 *
 * Vue composable for managing SIP provider selection and credential handling.
 * Supports multiple built-in providers, credential storage, and custom provider configurations.
 *
 * @module providers/useProviderSelector
 */

import { ref, reactive, computed, type Ref, type ComputedRef } from 'vue'
import type {
  ProviderConfig,
  ProviderSelectorOptions,
  SipCredentials,
  StoredCredentials,
} from './types'
import { builtInProviders } from './configs'
import { createCredentialStorage, type CredentialStorage } from './credentialStorage'

/** Return type for useProviderSelector composable */
export interface UseProviderSelectorReturn {
  /** List of all available providers (computed ref) */
  providers: ComputedRef<ProviderConfig[]>
  /** Currently selected provider (ref) */
  selectedProvider: Ref<ProviderConfig | null>
  /** Current credential values (reactive object) */
  credentials: Record<string, string>
  /** Whether all required fields are filled (computed ref) */
  isConfigured: ComputedRef<boolean>
  /** Select a provider by ID */
  selectProvider: (providerId: string) => void
  /** Update a credential field value */
  updateCredential: (field: string, value: string) => void
  /** Save credentials to storage */
  saveCredentials: () => void
  /** Clear stored credentials and reset values */
  clearCredentials: () => void
  /** Get SIP config for useSipClient */
  getSipConfig: () => SipCredentials | null
}

/**
 * Provider selector composable
 *
 * Provides reactive state and methods for managing SIP provider selection,
 * credential handling, validation, and storage persistence.
 *
 * @param options - Configuration options
 * @returns Provider selector state and methods
 *
 * @example
 * ```vue
 * <script setup>
 * import { useProviderSelector } from 'vuesip'
 *
 * const {
 *   providers,
 *   selectedProvider,
 *   credentials,
 *   isConfigured,
 *   selectProvider,
 *   updateCredential,
 *   saveCredentials,
 *   clearCredentials,
 *   getSipConfig,
 * } = useProviderSelector({
 *   storage: 'local',
 *   defaultProvider: 'own-pbx'
 * })
 *
 * // Select a provider
 * selectProvider('46elks')
 *
 * // Update credentials
 * updateCredential('username', 'myuser')
 * updateCredential('password', 'secret')
 *
 * // Get SIP config when configured
 * if (isConfigured.value) {
 *   const sipConfig = getSipConfig()
 *   // Use sipConfig with useSipClient
 * }
 * </script>
 * ```
 */
export function useProviderSelector(
  options: ProviderSelectorOptions = {}
): UseProviderSelectorReturn {
  const {
    storage: storageType = 'local',
    defaultProvider = 'own-pbx',
    providers: customProviders = [],
  } = options

  // Create credential storage
  const storage: CredentialStorage = createCredentialStorage(storageType)

  // Merge built-in providers with custom providers
  // Custom providers override built-in ones with the same ID
  const mergedProviders = computed<ProviderConfig[]>(() => {
    const providerMap = new Map<string, ProviderConfig>()

    // Add built-in providers first
    for (const provider of builtInProviders) {
      providerMap.set(provider.id, provider)
    }

    // Override/add custom providers
    for (const provider of customProviders) {
      providerMap.set(provider.id, provider)
    }

    return Array.from(providerMap.values())
  })

  // Helper to find provider by ID
  const findProvider = (id: string): ProviderConfig | null => {
    return mergedProviders.value.find((p) => p.id === id) || null
  }

  // Load stored credentials (done synchronously on initialization)
  const storedData = storage.load()

  // Determine initial provider
  const getInitialProvider = (): ProviderConfig | null => {
    // Try stored provider first
    if (storedData?.providerId) {
      const stored = findProvider(storedData.providerId)
      if (stored) return stored
    }

    // Try default provider
    const defaultProv = findProvider(defaultProvider)
    if (defaultProv) return defaultProv

    // Fallback to first provider
    return mergedProviders.value[0] || null
  }

  // Selected provider ref
  const selectedProvider = ref<ProviderConfig | null>(getInitialProvider())

  // Create credentials reactive object
  const credentials: Record<string, string> = reactive({})

  /**
   * Initialize credentials for selected provider
   */
  const initializeCredentials = (
    provider: ProviderConfig | null,
    values?: Record<string, string>
  ): void => {
    // Clear existing credentials
    for (const key of Object.keys(credentials)) {
      delete credentials[key]
    }

    if (!provider) return

    // Set up fields for new provider
    for (const field of provider.fields) {
      credentials[field.name] = values?.[field.name] ?? ''
    }
  }

  // Initialize with stored values or empty
  if (selectedProvider.value) {
    const initialValues =
      storedData?.providerId === selectedProvider.value.id ? storedData.values : undefined
    initializeCredentials(selectedProvider.value, initialValues)
  }

  // Computed: check if all required fields are filled
  const isConfigured = computed<boolean>(() => {
    if (!selectedProvider.value) return false

    const requiredFields = selectedProvider.value.fields.filter((f) => f.required)

    // If no required fields, consider it configured
    if (requiredFields.length === 0) return true

    // Check all required fields have non-empty values
    return requiredFields.every((field) => {
      const value = credentials[field.name]
      return value !== undefined && value !== ''
    })
  })

  /**
   * Select a provider by ID
   * Resets credentials to empty values for the new provider
   */
  const selectProvider = (providerId: string): void => {
    const provider = findProvider(providerId)
    if (!provider) return // Provider not found, do nothing

    selectedProvider.value = provider
    initializeCredentials(provider)
  }

  /**
   * Update a specific credential field
   */
  const updateCredential = (field: string, value: string): void => {
    credentials[field] = value
  }

  /**
   * Save credentials to storage
   */
  const saveCredentials = (): void => {
    if (!selectedProvider.value) return

    const storedCredentials: StoredCredentials = {
      providerId: selectedProvider.value.id,
      values: { ...credentials },
      storedAt: Date.now(),
    }

    storage.save(storedCredentials)
  }

  /**
   * Clear stored credentials and reset values
   */
  const clearCredentials = (): void => {
    storage.clear()
    initializeCredentials(selectedProvider.value)
  }

  /**
   * Get SIP configuration using provider's mapCredentials function
   */
  const getSipConfig = (): SipCredentials | null => {
    if (!selectedProvider.value) return null

    return selectedProvider.value.mapCredentials({ ...credentials })
  }

  return {
    providers: mergedProviders,
    selectedProvider,
    credentials,
    isConfigured,
    selectProvider,
    updateCredential,
    saveCredentials,
    clearCredentials,
    getSipConfig,
  }
}
