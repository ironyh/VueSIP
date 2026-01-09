/**
 * VueSIP Provider System
 *
 * This module exports all components for the provider abstraction system:
 *
 * 1. Vue Providers - Components using provide/inject for shared functionality
 * 2. Types - Type definitions for multi-provider login system
 * 3. Provider Configs - Built-in SIP provider configurations
 * 4. Adapters - Complex provider adapters (e.g., Twilio)
 * 5. Registry - Provider registration and lookup
 * 6. Storage - Credential persistence
 *
 * @module providers
 */

// =============================================================================
// Vue Provider Components (provide/inject pattern)
// =============================================================================
export {
  SipClientProvider,
  useSipClientProvider,
  SipClientProviderKey,
  type SipClientProviderContext,
} from './SipClientProvider'

export { ConfigProvider, useConfigProvider, CONFIG_PROVIDER_KEY } from './ConfigProvider'

export { MediaProvider, useMediaProvider, MEDIA_PROVIDER_KEY } from './MediaProvider'

export {
  OAuth2Provider,
  useOAuth2Provider,
  useOAuth2Credentials,
  OAuth2ProviderKey,
  OAuth2AuthStateKey,
  OAuth2CredentialsKey,
  type OAuth2ProviderContext,
  type OAuth2ProviderProps,
} from './OAuth2Provider'

export type {
  ConfigProviderContext,
  ConfigProviderProps,
  MediaProviderContext,
  MediaProviderProps,
} from '../types/provider.types'

// =============================================================================
// Provider Selector Composable
// =============================================================================
export { useProviderSelector } from './useProviderSelector'

export type { UseProviderSelectorReturn } from './useProviderSelector'

// =============================================================================
// Types - Provider Abstraction System
// =============================================================================
export type {
  ProviderField,
  ProviderConfig,
  ProviderAdapter,
  SipCredentials,
  StorageType,
  ProviderSelectorOptions,
  SelectOption,
  OAuthConfig,
  StoredCredentials,
} from './types'

// =============================================================================
// Provider Configs - Built-in SIP Providers
// =============================================================================
export {
  builtInProviders,
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
} from './configs'

// =============================================================================
// Adapters - Complex Provider Integrations
// =============================================================================
export { adapters, twilioAdapter } from './adapters'

// =============================================================================
// Registry - Provider Registration and Lookup
// =============================================================================
export {
  registerProvider,
  getProvider,
  getAllProviders,
  removeProvider,
  resetRegistry,
} from './providerRegistry'

export type { RegisterOptions as ProviderRegisterOptions } from './providerRegistry'

// =============================================================================
// Storage - Credential Persistence
// =============================================================================
export { createCredentialStorage } from './credentialStorage'

export type { StorageOptions, CredentialStorage } from './credentialStorage'
