import { describe, it, expect } from 'vitest'
import type {
  ProviderField,
  ProviderConfig,
  ProviderAdapter,
  SipCredentials,
  StorageType,
  ProviderSelectorOptions,
} from '../../../src/providers/types'

describe('Provider Types', () => {
  describe('ProviderField', () => {
    it('should define text field with required properties', () => {
      const field: ProviderField = {
        name: 'username',
        label: 'Username',
        type: 'text',
      }
      expect(field.name).toBe('username')
      expect(field.label).toBe('Username')
      expect(field.type).toBe('text')
    })

    it('should support optional properties', () => {
      const field: ProviderField = {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'Enter password',
        required: true,
        helpText: 'Your SIP password',
        helpUrl: 'https://example.com/help',
      }
      expect(field.placeholder).toBe('Enter password')
      expect(field.required).toBe(true)
      expect(field.helpText).toBe('Your SIP password')
      expect(field.helpUrl).toBe('https://example.com/help')
    })

    it('should support select field with options', () => {
      const field: ProviderField = {
        name: 'region',
        label: 'Region',
        type: 'select',
        options: [
          { label: 'US East', value: 'us-east' },
          { label: 'EU West', value: 'eu-west' },
        ],
      }
      expect(field.type).toBe('select')
      expect(field.options).toHaveLength(2)
    })
  })

  describe('SipCredentials', () => {
    it('should define required SIP credentials', () => {
      const creds: SipCredentials = {
        uri: 'wss://sip.example.com/ws',
        sipUri: 'sip:1000@example.com',
        password: 'secret',
      }
      expect(creds.uri).toBe('wss://sip.example.com/ws')
      expect(creds.sipUri).toBe('sip:1000@example.com')
      expect(creds.password).toBe('secret')
    })

    it('should support optional displayName', () => {
      const creds: SipCredentials = {
        uri: 'wss://sip.example.com/ws',
        sipUri: 'sip:1000@example.com',
        password: 'secret',
        displayName: 'John Doe',
      }
      expect(creds.displayName).toBe('John Doe')
    })
  })

  describe('ProviderConfig', () => {
    it('should define provider with required fields', () => {
      const config: ProviderConfig = {
        id: 'test-provider',
        name: 'Test Provider',
        websocketUrl: 'wss://test.example.com/ws',
        fields: [{ name: 'username', label: 'Username', type: 'text' }],
        mapCredentials: (input) => ({
          uri: 'wss://test.example.com/ws',
          sipUri: `sip:${input.username}@test.example.com`,
          password: input.password,
        }),
      }
      expect(config.id).toBe('test-provider')
      expect(config.name).toBe('Test Provider')
      expect(config.websocketUrl).toBe('wss://test.example.com/ws')
    })

    it('should transform credentials via mapCredentials', () => {
      const config: ProviderConfig = {
        id: 'test',
        name: 'Test',
        websocketUrl: 'wss://test.com/ws',
        fields: [],
        mapCredentials: (input) => ({
          uri: 'wss://test.com/ws',
          sipUri: `sip:${input.user}@test.com`,
          password: input.pass,
        }),
      }
      const result = config.mapCredentials({ user: 'john', pass: 'secret' })
      expect(result.sipUri).toBe('sip:john@test.com')
      expect(result.password).toBe('secret')
    })
  })

  describe('ProviderAdapter', () => {
    it('should extend ProviderConfig with optional connect', () => {
      const adapter: ProviderAdapter = {
        id: 'twilio',
        name: 'Twilio',
        websocketUrl: '',
        fields: [],
        mapCredentials: () => ({ uri: '', sipUri: '', password: '' }),
        connect: async () => {
          // Custom connection logic
        },
      }
      expect(adapter.connect).toBeDefined()
      expect(typeof adapter.connect).toBe('function')
    })

    it('should support OAuth configuration', () => {
      const adapter: ProviderAdapter = {
        id: 'oauth-provider',
        name: 'OAuth Provider',
        websocketUrl: '',
        fields: [],
        mapCredentials: () => ({ uri: '', sipUri: '', password: '' }),
        oauth: {
          authUrl: 'https://auth.example.com/authorize',
          tokenUrl: 'https://auth.example.com/token',
          clientId: 'client-123',
          scopes: ['voice', 'sip'],
        },
      }
      expect(adapter.oauth?.authUrl).toBe('https://auth.example.com/authorize')
      expect(adapter.oauth?.scopes).toContain('voice')
    })
  })

  describe('StorageType', () => {
    it('should accept valid storage types', () => {
      const local: StorageType = 'local'
      const session: StorageType = 'session'
      const none: StorageType = 'none'
      expect(local).toBe('local')
      expect(session).toBe('session')
      expect(none).toBe('none')
    })
  })

  describe('ProviderSelectorOptions', () => {
    it('should define selector options with defaults', () => {
      const options: ProviderSelectorOptions = {}
      expect(options.storage).toBeUndefined()
      expect(options.defaultProvider).toBeUndefined()
    })

    it('should allow custom configuration', () => {
      const customConfig: ProviderConfig = {
        id: 'custom',
        name: 'Custom',
        websocketUrl: 'wss://custom.com/ws',
        fields: [],
        mapCredentials: () => ({ uri: '', sipUri: '', password: '' }),
      }
      const options: ProviderSelectorOptions = {
        storage: 'session',
        defaultProvider: 'custom',
        providers: [customConfig],
      }
      expect(options.storage).toBe('session')
      expect(options.defaultProvider).toBe('custom')
      expect(options.providers).toHaveLength(1)
    })
  })
})
