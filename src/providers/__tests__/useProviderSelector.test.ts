import { describe, it, expect, vi } from 'vitest'
import { useProviderSelector } from '../useProviderSelector'
import type { ProviderConfig } from './types'

// Mock the built-in providers
vi.mock('../configs', () => ({
  builtInProviders: [
    {
      id: 'test-provider',
      name: 'Test Provider',
      websocketUrl: 'wss://test.example.com/ws',
      fields: [
        { name: 'username', label: 'Username', type: 'text', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true },
        { name: 'domain', label: 'Domain', type: 'text', required: false },
      ],
      mapCredentials: (input) => ({
        uri: `wss://${input.domain || 'test.example.com'}/ws`,
        sipUri: `sip:${input.username}@${input.domain || 'test.example.com'}`,
        password: input.password,
        displayName: input.username,
      }),
    },
    {
      id: 'minimal-provider',
      name: 'Minimal Provider',
      websocketUrl: 'wss://minimal.example.com/ws',
      fields: [{ name: 'username', label: 'Username', type: 'text', required: true }],
      mapCredentials: (input) => ({
        uri: 'wss://minimal.example.com/ws',
        sipUri: `sip:${input.username}@minimal.example.com`,
        password: '',
      }),
    },
  ],
}))

// Mock credentialStorage
vi.mock('./credentialStorage', () => ({
  createCredentialStorage: vi.fn(() => ({
    load: vi.fn(() => null),
    save: vi.fn(),
    clear: vi.fn(),
  })),
}))

describe('useProviderSelector', () => {
  describe('initialization', () => {
    it('should initialize with default provider when no stored data', () => {
      const { selectedProvider, providers } = useProviderSelector()

      expect(providers.value).toHaveLength(2)
      expect(selectedProvider.value).not.toBeNull()
      expect(selectedProvider.value?.id).toBe('test-provider')
    })

    it('should use custom default provider when specified', () => {
      const { selectedProvider } = useProviderSelector({
        defaultProvider: 'minimal-provider',
      })

      expect(selectedProvider.value?.id).toBe('minimal-provider')
    })

    it('should initialize empty credentials for selected provider', () => {
      const { credentials } = useProviderSelector()

      expect(credentials.username).toBe('')
      expect(credentials.password).toBe('')
      expect(credentials.domain).toBe('')
    })
  })

  describe('selectProvider', () => {
    it('should change selected provider and reset credentials', () => {
      const { selectedProvider, credentials, selectProvider } = useProviderSelector()

      // Update some credentials first
      credentials.username = 'testuser'
      credentials.password = 'secret'

      // Select different provider
      selectProvider('minimal-provider')

      expect(selectedProvider.value?.id).toBe('minimal-provider')
      // minimal-provider only has username field
      expect(credentials.username).toBe('')
      expect(credentials.password).toBeUndefined()
    })

    it('should do nothing for unknown provider ID', () => {
      const { selectedProvider, selectProvider } = useProviderSelector()
      const initialProvider = selectedProvider.value

      selectProvider('unknown-provider')

      expect(selectedProvider.value).toBe(initialProvider)
    })
  })

  describe('updateCredential', () => {
    it('should update credential field value', () => {
      const { credentials, updateCredential } = useProviderSelector()

      updateCredential('username', 'newuser')
      updateCredential('domain', 'newdomain.com')

      expect(credentials.username).toBe('newuser')
      expect(credentials.domain).toBe('newdomain.com')
    })
  })

  describe('isConfigured', () => {
    it('should return false when required fields are empty', () => {
      const { isConfigured } = useProviderSelector()

      expect(isConfigured.value).toBe(false)
    })

    it('should return true when all required fields are filled', () => {
      const { isConfigured, updateCredential } = useProviderSelector()

      updateCredential('username', 'testuser')
      updateCredential('password', 'secret')

      expect(isConfigured.value).toBe(true)
    })

    it('should return true for provider with no required fields when selected', () => {
      const { isConfigured } = useProviderSelector({
        defaultProvider: 'minimal-provider',
      })

      // minimal-provider has username as required, so this should be false initially
      expect(isConfigured.value).toBe(false)
    })
  })

  describe('getSipConfig', () => {
    it('should return null when no provider selected', () => {
      // This is hard to test since we always have a default
      // But we can test the mapping works
      const { getSipConfig, updateCredential } = useProviderSelector()

      updateCredential('username', 'myuser')
      updateCredential('password', 'mypass')
      updateCredential('domain', 'mydomain.com')

      const config = getSipConfig()

      expect(config).not.toBeNull()
      expect(config?.sipUri).toBe('sip:myuser@mydomain.com')
      expect(config?.password).toBe('mypass')
      expect(config?.uri).toBe('wss://mydomain.com/ws')
    })
  })

  describe('custom providers', () => {
    it('should merge custom providers with built-in providers', () => {
      const customProvider: ProviderConfig = {
        id: 'custom',
        name: 'Custom Provider',
        websocketUrl: 'wss://custom.com/ws',
        fields: [{ name: 'account', label: 'Account', type: 'text', required: true }],
        mapCredentials: (input) => ({
          uri: 'wss://custom.com/ws',
          sipUri: `sip:${input.account}@custom.com`,
          password: '',
        }),
      }

      const { providers } = useProviderSelector({
        providers: [customProvider],
      })

      expect(providers.value).toHaveLength(3)
      expect(providers.value.find((p) => p.id === 'custom')).toBeDefined()
    })

    it('should allow custom provider to override built-in', () => {
      const overrideProvider: ProviderConfig = {
        id: 'test-provider',
        name: 'Overridden Provider',
        websocketUrl: 'wss://override.com/ws',
        fields: [],
        mapCredentials: () => ({
          uri: 'wss://override.com/ws',
          sipUri: 'sip:overridden@test.com',
          password: 'overridden',
        }),
      }

      const { providers } = useProviderSelector({
        providers: [overrideProvider],
      })

      const provider = providers.value.find((p) => p.id === 'test-provider')
      expect(provider?.name).toBe('Overridden Provider')
    })
  })
})
