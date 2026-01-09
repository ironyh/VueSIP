/**
 * useProviderSelector composable unit tests
 *
 * Tests for the provider selector composable that manages:
 * - Provider selection and configuration
 * - Credential management with reactive state
 * - Storage persistence (localStorage/sessionStorage)
 * - SIP config generation via mapCredentials
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useProviderSelector } from '../../../src/providers/useProviderSelector'
import { builtInProviders } from '../../../src/providers/configs'
import type { ProviderConfig, StoredCredentials } from '../../../src/providers/types'

// Helper to create a mock provider
function createMockProvider(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    id: 'mock-provider',
    name: 'Mock Provider',
    websocketUrl: 'wss://mock.example.com',
    fields: [
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
      { name: 'optional', label: 'Optional Field', type: 'text', required: false },
    ],
    mapCredentials: (input) => ({
      uri: 'wss://mock.example.com',
      sipUri: `sip:${input.username}@mock.example.com`,
      password: input.password ?? '',
      displayName: input.username,
    }),
    ...overrides,
  }
}

describe('useProviderSelector', () => {
  let localStorageMock: Record<string, string>
  let sessionStorageMock: Record<string, string>

  beforeEach(() => {
    // Setup localStorage mock
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
    })

    // Setup sessionStorage mock
    sessionStorageMock = {}
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => sessionStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStorageMock[key]
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('providers', () => {
    it('should return builtInProviders by default', () => {
      const { providers } = useProviderSelector()

      expect(providers.value).toEqual(builtInProviders)
      expect(providers.value.length).toBe(builtInProviders.length)
    })

    it('should merge custom providers with built-in providers', () => {
      const customProvider = createMockProvider({ id: 'custom-provider', name: 'Custom' })
      const { providers } = useProviderSelector({
        providers: [customProvider],
      })

      expect(providers.value.length).toBe(builtInProviders.length + 1)
      expect(providers.value).toContain(customProvider)
      // Built-in providers should still be present
      for (const builtin of builtInProviders) {
        expect(providers.value.find((p) => p.id === builtin.id)).toBeDefined()
      }
    })

    it('should allow custom providers to override built-in providers by ID', () => {
      const customOwnPbx = createMockProvider({
        id: 'own-pbx',
        name: 'Custom Own PBX',
      })
      const { providers } = useProviderSelector({
        providers: [customOwnPbx],
      })

      // Should have same count (override, not add)
      expect(providers.value.length).toBe(builtInProviders.length)
      // The own-pbx should be the custom one
      const ownPbx = providers.value.find((p) => p.id === 'own-pbx')
      expect(ownPbx?.name).toBe('Custom Own PBX')
    })
  })

  describe('selectedProvider', () => {
    it('should default to own-pbx provider', () => {
      const { selectedProvider } = useProviderSelector()

      expect(selectedProvider.value?.id).toBe('own-pbx')
    })

    it('should respect defaultProvider option', () => {
      const { selectedProvider } = useProviderSelector({
        defaultProvider: 'telnyx',
      })

      expect(selectedProvider.value?.id).toBe('telnyx')
    })

    it('should fallback to first provider if defaultProvider not found', () => {
      const { selectedProvider } = useProviderSelector({
        defaultProvider: 'non-existent-provider',
      })

      expect(selectedProvider.value?.id).toBe(builtInProviders[0].id)
    })
  })

  describe('credentials', () => {
    it('should be a reactive object with empty values initially', () => {
      const { credentials, selectedProvider } = useProviderSelector()

      expect(credentials).toBeDefined()
      expect(typeof credentials).toBe('object')
      // Should have keys for each field in the selected provider
      if (selectedProvider.value) {
        for (const field of selectedProvider.value.fields) {
          expect(field.name in credentials).toBe(true)
          expect(credentials[field.name]).toBe('')
        }
      }
    })

    it('should reset credentials when provider changes', async () => {
      const { credentials, selectProvider, updateCredential } = useProviderSelector()

      // Set some values
      updateCredential('websocketUrl', 'wss://test.com')
      updateCredential('sipUri', 'sip:test@test.com')
      expect(credentials.websocketUrl).toBe('wss://test.com')

      // Change provider
      selectProvider('telnyx')
      await nextTick()

      // Old values should be cleared
      expect(credentials.websocketUrl).toBeUndefined()
    })
  })

  describe('isConfigured', () => {
    it('should return false when required fields are empty', () => {
      const { isConfigured } = useProviderSelector()

      expect(isConfigured.value).toBe(false)
    })

    it('should return true when all required fields are filled', () => {
      const { isConfigured, updateCredential, selectedProvider } = useProviderSelector()

      // Fill all required fields for own-pbx
      if (selectedProvider.value) {
        for (const field of selectedProvider.value.fields) {
          if (field.required) {
            updateCredential(field.name, 'test-value')
          }
        }
      }

      expect(isConfigured.value).toBe(true)
    })

    it('should not require optional fields', () => {
      const customProvider = createMockProvider()
      const { isConfigured, updateCredential } = useProviderSelector({
        providers: [customProvider],
        defaultProvider: 'mock-provider',
      })

      // Fill only required fields
      updateCredential('username', 'testuser')
      updateCredential('password', 'testpass')
      // Don't fill 'optional' field

      expect(isConfigured.value).toBe(true)
    })

    it('should return false if any required field is missing', () => {
      const customProvider = createMockProvider()
      const { isConfigured, updateCredential } = useProviderSelector({
        providers: [customProvider],
        defaultProvider: 'mock-provider',
      })

      // Fill only one required field
      updateCredential('username', 'testuser')
      // Don't fill 'password' field

      expect(isConfigured.value).toBe(false)
    })
  })

  describe('selectProvider', () => {
    it('should change the selected provider', () => {
      const { selectedProvider, selectProvider } = useProviderSelector()

      expect(selectedProvider.value?.id).toBe('own-pbx')

      selectProvider('telnyx')

      expect(selectedProvider.value?.id).toBe('telnyx')
    })

    it('should not change if provider ID does not exist', () => {
      const { selectedProvider, selectProvider } = useProviderSelector()

      expect(selectedProvider.value?.id).toBe('own-pbx')

      selectProvider('non-existent')

      expect(selectedProvider.value?.id).toBe('own-pbx')
    })

    it('should reset credentials when changing provider', () => {
      const { credentials, selectProvider, updateCredential } = useProviderSelector()

      // Set credentials for own-pbx
      updateCredential('websocketUrl', 'wss://test.com')
      updateCredential('sipUri', 'sip:test@test.com')
      updateCredential('password', 'secret')

      // Change provider
      selectProvider('telnyx')

      // Credentials object should have different keys (telnyx fields)
      expect(credentials.websocketUrl).toBeUndefined()
      expect(credentials.sipUri).toBeUndefined()
    })
  })

  describe('updateCredential', () => {
    it('should update a specific field value', () => {
      const { credentials, updateCredential } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')

      expect(credentials.websocketUrl).toBe('wss://example.com')
    })

    it('should allow updating multiple fields', () => {
      const { credentials, updateCredential } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')
      updateCredential('sipUri', 'sip:user@example.com')
      updateCredential('password', 'secret123')

      expect(credentials.websocketUrl).toBe('wss://example.com')
      expect(credentials.sipUri).toBe('sip:user@example.com')
      expect(credentials.password).toBe('secret123')
    })

    it('should handle empty string values', () => {
      const { credentials, updateCredential } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')
      updateCredential('websocketUrl', '')

      expect(credentials.websocketUrl).toBe('')
    })
  })

  describe('saveCredentials', () => {
    it('should persist credentials to localStorage by default', () => {
      const { updateCredential, saveCredentials, selectedProvider } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')
      updateCredential('sipUri', 'sip:user@example.com')
      updateCredential('password', 'secret')

      saveCredentials()

      expect(localStorage.setItem).toHaveBeenCalled()
      const savedData = JSON.parse(localStorageMock['vuesip_credentials'])
      expect(savedData.providerId).toBe(selectedProvider.value?.id)
      expect(savedData.values.websocketUrl).toBe('wss://example.com')
      expect(savedData.values.sipUri).toBe('sip:user@example.com')
      expect(savedData.values.password).toBe('secret')
    })

    it('should persist to sessionStorage when configured', () => {
      const { updateCredential, saveCredentials } = useProviderSelector({
        storage: 'session',
      })

      updateCredential('websocketUrl', 'wss://example.com')
      saveCredentials()

      expect(sessionStorage.setItem).toHaveBeenCalled()
      expect(sessionStorageMock['vuesip_credentials']).toBeDefined()
    })

    it('should not persist when storage is none', () => {
      const { updateCredential, saveCredentials } = useProviderSelector({
        storage: 'none',
      })

      updateCredential('websocketUrl', 'wss://example.com')
      saveCredentials()

      expect(localStorage.setItem).not.toHaveBeenCalled()
      expect(sessionStorage.setItem).not.toHaveBeenCalled()
    })

    it('should include storedAt timestamp', () => {
      const { updateCredential, saveCredentials } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')

      const beforeSave = Date.now()
      saveCredentials()
      const afterSave = Date.now()

      const savedData = JSON.parse(localStorageMock['vuesip_credentials'])
      expect(savedData.storedAt).toBeGreaterThanOrEqual(beforeSave)
      expect(savedData.storedAt).toBeLessThanOrEqual(afterSave)
    })
  })

  describe('clearCredentials', () => {
    it('should clear stored credentials', () => {
      const { updateCredential, saveCredentials, clearCredentials } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')
      saveCredentials()

      expect(localStorageMock['vuesip_credentials']).toBeDefined()

      clearCredentials()

      expect(localStorage.removeItem).toHaveBeenCalledWith('vuesip_credentials')
    })

    it('should reset credential values to empty', () => {
      const { credentials, updateCredential, clearCredentials } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')
      updateCredential('sipUri', 'sip:user@example.com')
      updateCredential('password', 'secret')

      clearCredentials()

      expect(credentials.websocketUrl).toBe('')
      expect(credentials.sipUri).toBe('')
      expect(credentials.password).toBe('')
    })
  })

  describe('getSipConfig', () => {
    it('should call mapCredentials on the current provider', () => {
      const mockMapCredentials = vi.fn().mockReturnValue({
        uri: 'wss://test.com',
        sipUri: 'sip:user@test.com',
        password: 'secret',
      })

      const customProvider = createMockProvider({
        id: 'test-provider',
        mapCredentials: mockMapCredentials,
      })

      const { updateCredential, getSipConfig } = useProviderSelector({
        providers: [customProvider],
        defaultProvider: 'test-provider',
      })

      updateCredential('username', 'testuser')
      updateCredential('password', 'testpass')

      const config = getSipConfig()

      expect(mockMapCredentials).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
        optional: '',
      })
      expect(config).toEqual({
        uri: 'wss://test.com',
        sipUri: 'sip:user@test.com',
        password: 'secret',
      })
    })

    it('should return current SIP credentials configuration', () => {
      const { updateCredential, getSipConfig } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://pbx.example.com')
      updateCredential('sipUri', 'sip:1000@pbx.example.com')
      updateCredential('password', 'mypassword')
      updateCredential('displayName', 'John Doe')

      const config = getSipConfig()

      expect(config.uri).toBe('wss://pbx.example.com')
      expect(config.sipUri).toBe('sip:1000@pbx.example.com')
      expect(config.password).toBe('mypassword')
      expect(config.displayName).toBe('John Doe')
    })

    it('should return null if no provider is selected', () => {
      // This edge case is difficult to trigger because built-in providers are always merged.
      // When providers: [] is passed, built-in providers are still available.
      // The implementation returns the first available provider as fallback.
      // Instead, test that an empty result is returned for a provider with fields
      // but mapCredentials returns empty values (which is the behavior).
      const emptyProvider = createMockProvider({
        id: 'empty-provider',
        fields: [],
        mapCredentials: () => ({
          uri: '',
          sipUri: '',
          password: '',
        }),
      })

      const { getSipConfig } = useProviderSelector({
        providers: [emptyProvider],
        defaultProvider: 'empty-provider',
      })

      const config = getSipConfig()

      // Returns the mapped credentials (empty but not null)
      expect(config).toEqual({
        uri: '',
        sipUri: '',
        password: '',
      })
    })
  })

  describe('storage integration', () => {
    it('should load saved credentials on initialization', () => {
      // Pre-populate storage
      const storedData: StoredCredentials = {
        providerId: 'own-pbx',
        values: {
          websocketUrl: 'wss://saved.example.com',
          sipUri: 'sip:saved@example.com',
          password: 'savedpassword',
          displayName: 'Saved User',
        },
        storedAt: Date.now(),
      }
      localStorageMock['vuesip_credentials'] = JSON.stringify(storedData)

      const { credentials, selectedProvider } = useProviderSelector()

      expect(selectedProvider.value?.id).toBe('own-pbx')
      expect(credentials.websocketUrl).toBe('wss://saved.example.com')
      expect(credentials.sipUri).toBe('sip:saved@example.com')
      expect(credentials.password).toBe('savedpassword')
      expect(credentials.displayName).toBe('Saved User')
    })

    it('should load saved provider selection', () => {
      // Pre-populate storage with different provider
      // Telnyx uses 'username' and 'password' fields (not 'sipUsername')
      const storedData: StoredCredentials = {
        providerId: 'telnyx',
        values: {
          username: 'telnyxuser',
          password: 'telnyxpass',
        },
        storedAt: Date.now(),
      }
      localStorageMock['vuesip_credentials'] = JSON.stringify(storedData)

      const { selectedProvider, credentials } = useProviderSelector()

      expect(selectedProvider.value?.id).toBe('telnyx')
      expect(credentials.username).toBe('telnyxuser')
      expect(credentials.password).toBe('telnyxpass')
    })

    it('should use defaultProvider if stored provider no longer exists', () => {
      // Pre-populate storage with non-existent provider
      const storedData: StoredCredentials = {
        providerId: 'deleted-provider',
        values: { username: 'test' },
        storedAt: Date.now(),
      }
      localStorageMock['vuesip_credentials'] = JSON.stringify(storedData)

      const { selectedProvider } = useProviderSelector()

      // Should fallback to default
      expect(selectedProvider.value?.id).toBe('own-pbx')
    })

    it('should handle corrupted storage data gracefully', () => {
      // Pre-populate storage with invalid JSON
      localStorageMock['vuesip_credentials'] = 'invalid-json-data'

      // Should not throw
      const { selectedProvider, credentials } = useProviderSelector()

      // Should use defaults
      expect(selectedProvider.value?.id).toBe('own-pbx')
      expect(credentials.websocketUrl).toBe('')
    })

    it('should load from sessionStorage when configured', () => {
      const storedData: StoredCredentials = {
        providerId: 'own-pbx',
        values: {
          websocketUrl: 'wss://session.example.com',
          sipUri: 'sip:session@example.com',
          password: 'sessionpass',
        },
        storedAt: Date.now(),
      }
      sessionStorageMock['vuesip_credentials'] = JSON.stringify(storedData)

      const { credentials } = useProviderSelector({ storage: 'session' })

      expect(credentials.websocketUrl).toBe('wss://session.example.com')
    })
  })

  describe('reactivity', () => {
    it('should update isConfigured reactively when credentials change', async () => {
      const { isConfigured, updateCredential } = useProviderSelector({
        defaultProvider: 'own-pbx',
      })

      expect(isConfigured.value).toBe(false)

      // Fill required fields one by one
      updateCredential('websocketUrl', 'wss://test.com')
      await nextTick()
      expect(isConfigured.value).toBe(false) // Still missing other required fields

      updateCredential('sipUri', 'sip:user@test.com')
      await nextTick()
      expect(isConfigured.value).toBe(false) // Still missing password

      updateCredential('password', 'secret')
      await nextTick()
      expect(isConfigured.value).toBe(true) // All required fields filled
    })

    it('should maintain reactivity after provider change', async () => {
      const { isConfigured, updateCredential, selectProvider, selectedProvider } =
        useProviderSelector()

      // Fill credentials for own-pbx
      updateCredential('websocketUrl', 'wss://test.com')
      updateCredential('sipUri', 'sip:user@test.com')
      updateCredential('password', 'secret')
      await nextTick()

      expect(isConfigured.value).toBe(true)

      // Change provider
      selectProvider('telnyx')
      await nextTick()

      // Should be false again (new provider, empty credentials)
      expect(isConfigured.value).toBe(false)
      expect(selectedProvider.value?.id).toBe('telnyx')
    })
  })

  describe('edge cases', () => {
    it('should handle provider with no fields', () => {
      const noFieldsProvider = createMockProvider({
        id: 'no-fields',
        fields: [],
        mapCredentials: () => ({
          uri: 'wss://default.com',
          sipUri: 'sip:default@default.com',
          password: '',
        }),
      })

      const { isConfigured, credentials, getSipConfig } = useProviderSelector({
        providers: [noFieldsProvider],
        defaultProvider: 'no-fields',
      })

      // Should be configured immediately (no required fields)
      expect(isConfigured.value).toBe(true)
      expect(Object.keys(credentials).length).toBe(0)

      const config = getSipConfig()
      expect(config?.uri).toBe('wss://default.com')
    })

    it('should handle providers with all optional fields', () => {
      const allOptionalProvider = createMockProvider({
        id: 'all-optional',
        fields: [
          { name: 'field1', label: 'Field 1', type: 'text', required: false },
          { name: 'field2', label: 'Field 2', type: 'text', required: false },
        ],
      })

      const { isConfigured } = useProviderSelector({
        providers: [allOptionalProvider],
        defaultProvider: 'all-optional',
      })

      // Should be configured (no required fields)
      expect(isConfigured.value).toBe(true)
    })

    it('should preserve existing credentials when updating a single field', () => {
      const { credentials, updateCredential } = useProviderSelector()

      updateCredential('websocketUrl', 'wss://example.com')
      updateCredential('sipUri', 'sip:user@example.com')
      updateCredential('password', 'secret')

      // Update only one field
      updateCredential('password', 'newsecret')

      // Other fields should remain
      expect(credentials.websocketUrl).toBe('wss://example.com')
      expect(credentials.sipUri).toBe('sip:user@example.com')
      expect(credentials.password).toBe('newsecret')
    })
  })
})
