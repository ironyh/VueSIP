/**
 * Provider Index Module Exports Tests
 *
 * Verifies that src/providers/index.ts exports all required components
 * for the provider abstraction system.
 */

import { describe, it, expect } from 'vitest'

describe('Provider Index Module Exports', () => {
  describe('Types (from ./types)', () => {
    it('should export all type definitions', async () => {
      // Type-only exports - verify module has them via dynamic import
      const module = await import('@/providers')

      // These are type exports, so we just verify the module loads correctly
      // TypeScript compilation ensures types are available
      expect(module).toBeDefined()
    })
  })

  describe('Provider Configs (from ./configs)', () => {
    it('should export builtInProviders array', async () => {
      const { builtInProviders } = await import('@/providers')
      expect(builtInProviders).toBeDefined()
      expect(Array.isArray(builtInProviders)).toBe(true)
      expect(builtInProviders.length).toBeGreaterThan(0)
    })

    it('should export ownPbxProvider', async () => {
      const { ownPbxProvider } = await import('@/providers')
      expect(ownPbxProvider).toBeDefined()
      expect(ownPbxProvider.id).toBe('own-pbx')
    })

    it('should export elks46Provider', async () => {
      const { elks46Provider } = await import('@/providers')
      expect(elks46Provider).toBeDefined()
      expect(elks46Provider.id).toBe('46elks')
    })

    it('should export telnyxProvider', async () => {
      const { telnyxProvider } = await import('@/providers')
      expect(telnyxProvider).toBeDefined()
      expect(telnyxProvider.id).toBe('telnyx')
    })

    it('should export voipmsProvider', async () => {
      const { voipmsProvider } = await import('@/providers')
      expect(voipmsProvider).toBeDefined()
      expect(voipmsProvider.id).toBe('voipms')
    })
  })

  describe('Adapters (from ./adapters)', () => {
    it('should export adapters array', async () => {
      const { adapters } = await import('@/providers')
      expect(adapters).toBeDefined()
      expect(Array.isArray(adapters)).toBe(true)
    })

    it('should export twilioAdapter', async () => {
      const { twilioAdapter } = await import('@/providers')
      expect(twilioAdapter).toBeDefined()
      expect(twilioAdapter.id).toBe('twilio')
    })
  })

  describe('Registry (from ./providerRegistry)', () => {
    it('should export registerProvider function', async () => {
      const { registerProvider } = await import('@/providers')
      expect(registerProvider).toBeDefined()
      expect(typeof registerProvider).toBe('function')
    })

    it('should export getProvider function', async () => {
      const { getProvider } = await import('@/providers')
      expect(getProvider).toBeDefined()
      expect(typeof getProvider).toBe('function')
    })

    it('should export getAllProviders function', async () => {
      const { getAllProviders } = await import('@/providers')
      expect(getAllProviders).toBeDefined()
      expect(typeof getAllProviders).toBe('function')
    })

    it('should export removeProvider function', async () => {
      const { removeProvider } = await import('@/providers')
      expect(removeProvider).toBeDefined()
      expect(typeof removeProvider).toBe('function')
    })

    it('should export resetRegistry function', async () => {
      const { resetRegistry } = await import('@/providers')
      expect(resetRegistry).toBeDefined()
      expect(typeof resetRegistry).toBe('function')
    })
  })

  describe('Storage (from ./credentialStorage)', () => {
    it('should export createCredentialStorage function', async () => {
      const { createCredentialStorage } = await import('@/providers')
      expect(createCredentialStorage).toBeDefined()
      expect(typeof createCredentialStorage).toBe('function')
    })
  })

  describe('Composable (from ./useProviderSelector)', () => {
    it('should export useProviderSelector function', async () => {
      const { useProviderSelector } = await import('@/providers')
      expect(useProviderSelector).toBeDefined()
      expect(typeof useProviderSelector).toBe('function')
    })
  })

  describe('Existing Providers (Vue components)', () => {
    it('should export SipClientProvider and related', async () => {
      const { SipClientProvider, useSipClientProvider, SipClientProviderKey } = await import(
        '@/providers'
      )
      expect(SipClientProvider).toBeDefined()
      expect(useSipClientProvider).toBeDefined()
      expect(SipClientProviderKey).toBeDefined()
    })

    it('should export ConfigProvider and related', async () => {
      const { ConfigProvider, useConfigProvider, CONFIG_PROVIDER_KEY } = await import('@/providers')
      expect(ConfigProvider).toBeDefined()
      expect(useConfigProvider).toBeDefined()
      expect(CONFIG_PROVIDER_KEY).toBeDefined()
    })

    it('should export MediaProvider and related', async () => {
      const { MediaProvider, useMediaProvider, MEDIA_PROVIDER_KEY } = await import('@/providers')
      expect(MediaProvider).toBeDefined()
      expect(useMediaProvider).toBeDefined()
      expect(MEDIA_PROVIDER_KEY).toBeDefined()
    })

    it('should export OAuth2Provider and related', async () => {
      const {
        OAuth2Provider,
        useOAuth2Provider,
        useOAuth2Credentials,
        OAuth2ProviderKey,
        OAuth2AuthStateKey,
        OAuth2CredentialsKey,
      } = await import('@/providers')
      expect(OAuth2Provider).toBeDefined()
      expect(useOAuth2Provider).toBeDefined()
      expect(useOAuth2Credentials).toBeDefined()
      expect(OAuth2ProviderKey).toBeDefined()
      expect(OAuth2AuthStateKey).toBeDefined()
      expect(OAuth2CredentialsKey).toBeDefined()
    })
  })

  describe('Type exports verification', () => {
    it('should have properly typed provider configs', async () => {
      const { builtInProviders } = await import('@/providers')

      // Each provider should have the ProviderConfig interface properties
      for (const provider of builtInProviders) {
        expect(provider.id).toBeDefined()
        expect(typeof provider.id).toBe('string')
        expect(provider.name).toBeDefined()
        expect(typeof provider.name).toBe('string')
        expect(provider.websocketUrl).toBeDefined()
        expect(typeof provider.websocketUrl).toBe('string')
        expect(provider.fields).toBeDefined()
        expect(Array.isArray(provider.fields)).toBe(true)
        expect(provider.mapCredentials).toBeDefined()
        expect(typeof provider.mapCredentials).toBe('function')
      }
    })

    it('should have properly typed adapter', async () => {
      const { twilioAdapter } = await import('@/providers')

      // Adapter extends ProviderConfig
      expect(twilioAdapter.id).toBeDefined()
      expect(twilioAdapter.name).toBeDefined()
      expect(twilioAdapter.fields).toBeDefined()
      expect(twilioAdapter.mapCredentials).toBeDefined()
    })

    it('should verify createCredentialStorage returns correct interface', async () => {
      const { createCredentialStorage } = await import('@/providers')

      const storage = createCredentialStorage('none')
      expect(storage.save).toBeDefined()
      expect(typeof storage.save).toBe('function')
      expect(storage.load).toBeDefined()
      expect(typeof storage.load).toBe('function')
      expect(storage.clear).toBeDefined()
      expect(typeof storage.clear).toBe('function')
    })
  })
})
