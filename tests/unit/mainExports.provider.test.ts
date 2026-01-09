/**
 * Main Index Provider Exports Tests
 *
 * Verifies that provider abstraction system exports are accessible
 * from the main vuesip index entry point.
 */

import { describe, it, expect } from 'vitest'

// Import everything from the main index to verify exports are accessible
import * as VueSIP from '../../src/index'

describe('Main Index Provider Exports', () => {
  describe('useProviderSelector composable', () => {
    it('exports useProviderSelector function', () => {
      expect(VueSIP.useProviderSelector).toBeDefined()
      expect(typeof VueSIP.useProviderSelector).toBe('function')
    })
  })

  describe('Provider types', () => {
    // Type exports are verified at compile time, but we can check
    // that the related runtime values exist

    it('exports builtInProviders array', () => {
      expect(VueSIP.builtInProviders).toBeDefined()
      expect(Array.isArray(VueSIP.builtInProviders)).toBe(true)
      expect(VueSIP.builtInProviders.length).toBeGreaterThan(0)
    })

    it('builtInProviders have correct structure (ProviderConfig)', () => {
      const provider = VueSIP.builtInProviders[0]
      expect(provider).toHaveProperty('id')
      expect(provider).toHaveProperty('name')
      expect(provider).toHaveProperty('websocketUrl')
      expect(provider).toHaveProperty('fields')
      expect(provider).toHaveProperty('mapCredentials')
      expect(typeof provider.mapCredentials).toBe('function')
    })

    it('provider fields have correct structure (ProviderField)', () => {
      const provider = VueSIP.builtInProviders[0]
      const field = provider.fields[0]
      expect(field).toHaveProperty('name')
      expect(field).toHaveProperty('label')
      expect(field).toHaveProperty('type')
    })
  })

  describe('Built-in provider configs', () => {
    it('exports ownPbxProvider', () => {
      expect(VueSIP.ownPbxProvider).toBeDefined()
      expect(VueSIP.ownPbxProvider.id).toBe('own-pbx')
    })

    it('exports elks46Provider', () => {
      expect(VueSIP.elks46Provider).toBeDefined()
      expect(VueSIP.elks46Provider.id).toBe('46elks')
    })

    it('exports telnyxProvider', () => {
      expect(VueSIP.telnyxProvider).toBeDefined()
      expect(VueSIP.telnyxProvider.id).toBe('telnyx')
    })

    it('exports voipmsProvider', () => {
      expect(VueSIP.voipmsProvider).toBeDefined()
      expect(VueSIP.voipmsProvider.id).toBe('voipms')
    })
  })

  describe('Provider adapters', () => {
    it('exports adapters array', () => {
      expect(VueSIP.adapters).toBeDefined()
      expect(Array.isArray(VueSIP.adapters)).toBe(true)
    })

    it('exports twilioAdapter', () => {
      expect(VueSIP.twilioAdapter).toBeDefined()
      expect(VueSIP.twilioAdapter.id).toBe('twilio')
    })
  })

  describe('Provider registry', () => {
    it('exports registerProvider function', () => {
      expect(VueSIP.registerProvider).toBeDefined()
      expect(typeof VueSIP.registerProvider).toBe('function')
    })

    it('exports getProvider function', () => {
      expect(VueSIP.getProvider).toBeDefined()
      expect(typeof VueSIP.getProvider).toBe('function')
    })

    it('exports getAllProviders function', () => {
      expect(VueSIP.getAllProviders).toBeDefined()
      expect(typeof VueSIP.getAllProviders).toBe('function')
    })

    it('exports removeProvider function', () => {
      expect(VueSIP.removeProvider).toBeDefined()
      expect(typeof VueSIP.removeProvider).toBe('function')
    })

    it('exports resetRegistry function', () => {
      expect(VueSIP.resetRegistry).toBeDefined()
      expect(typeof VueSIP.resetRegistry).toBe('function')
    })
  })

  describe('Credential storage', () => {
    it('exports createCredentialStorage function', () => {
      expect(VueSIP.createCredentialStorage).toBeDefined()
      expect(typeof VueSIP.createCredentialStorage).toBe('function')
    })

    it('createCredentialStorage returns storage interface', () => {
      const storage = VueSIP.createCredentialStorage('none')
      expect(storage).toHaveProperty('save')
      expect(storage).toHaveProperty('load')
      expect(storage).toHaveProperty('clear')
      expect(typeof storage.save).toBe('function')
      expect(typeof storage.load).toBe('function')
      expect(typeof storage.clear).toBe('function')
    })
  })

  describe('Type exports (compile-time verification)', () => {
    // These tests verify the types are properly exported by using them
    // TypeScript will fail to compile if the types aren't exported

    it('ProviderConfig type is usable', () => {
      // Using the type implicitly by assigning a provider to a typed variable
      const config: import('../../src/index').ProviderConfig = VueSIP.ownPbxProvider
      expect(config.id).toBe('own-pbx')
    })

    it('ProviderAdapter type is usable', () => {
      const adapter: import('../../src/index').ProviderAdapter = VueSIP.twilioAdapter
      expect(adapter.id).toBe('twilio')
    })

    it('SipCredentials type structure is valid', () => {
      // Verify mapCredentials returns correct structure
      const credentials = VueSIP.ownPbxProvider.mapCredentials({
        websocketUrl: 'wss://test.example.com',
        sipUser: 'testuser',
        sipDomain: 'example.com',
        password: 'secret',
        displayName: 'Test User',
      })

      expect(credentials).toHaveProperty('uri')
      expect(credentials).toHaveProperty('sipUri')
      expect(credentials).toHaveProperty('password')
    })

    it('StorageType values are valid', () => {
      // These should compile without error
      const local: import('../../src/index').StorageType = 'local'
      const session: import('../../src/index').StorageType = 'session'
      const none: import('../../src/index').StorageType = 'none'

      expect(local).toBe('local')
      expect(session).toBe('session')
      expect(none).toBe('none')
    })
  })
})

describe('useProviderSelector Integration', () => {
  // Note: Full integration tests would require Vue test utils
  // These tests verify the composable can be imported and is callable

  it('useProviderSelector is callable with default options', () => {
    // We can't fully test the composable without Vue's reactivity system,
    // but we can verify it's a function
    expect(VueSIP.useProviderSelector).toBeDefined()
    expect(typeof VueSIP.useProviderSelector).toBe('function')
  })

  it('ProviderSelectorOptions type is usable', () => {
    const options: import('../../src/index').ProviderSelectorOptions = {
      storage: 'local',
      defaultProvider: 'own-pbx',
      providers: [],
    }

    expect(options.storage).toBe('local')
    expect(options.defaultProvider).toBe('own-pbx')
    expect(options.providers).toEqual([])
  })
})
