/**
 * Provider Abstraction Types
 *
 * Type definitions for the multi-provider login system.
 * Supports config-only providers for simple SIP and adapters for complex providers.
 */

import type { SipClient } from '../core/SipClient'

/** Option for select fields */
export interface SelectOption {
  label: string
  value: string
}

/** Field definition for provider login forms */
export interface ProviderField {
  /** Field identifier (e.g., 'username', 'password', 'domain') */
  name: string
  /** Display label (e.g., 'SIP Username') */
  label: string
  /** Input type */
  type: 'text' | 'password' | 'select'
  /** Placeholder text */
  placeholder?: string
  /** Whether field is required */
  required?: boolean
  /** Help text shown below field */
  helpText?: string
  /** Link to provider documentation */
  helpUrl?: string
  /** Options for select fields */
  options?: SelectOption[]
}

/** Credentials passed to useSipClient */
export interface SipCredentials {
  /** WebSocket URL */
  uri: string
  /** SIP URI (sip:user@domain) */
  sipUri: string
  /** SIP password */
  password: string
  /** Display name for caller ID */
  displayName?: string
  /** Preferred audio codec */
  audioCodec?: 'opus' | 'pcmu' | 'pcma' | 'g722'
}

/** Config-only provider definition (simple providers) */
export interface ProviderConfig {
  /** Unique identifier (e.g., '46elks') */
  id: string
  /** Display name (e.g., '46 elks') */
  name: string
  /** Provider logo URL or data URI */
  logo?: string
  /** Default WebSocket URL (can be empty if user provides) */
  websocketUrl: string
  /** Form fields for this provider */
  fields: ProviderField[]
  /** Transform user input to SIP credentials */
  mapCredentials: (input: Record<string, string>) => SipCredentials
}

/** OAuth configuration for providers that support it */
export interface OAuthConfig {
  /** OAuth authorization URL */
  authUrl: string
  /** OAuth token URL */
  tokenUrl: string
  /** OAuth client ID */
  clientId: string
  /** Required OAuth scopes */
  scopes: string[]
}

/** Full adapter interface (complex providers like Twilio) */
export interface ProviderAdapter extends ProviderConfig {
  /** Override connection behavior if needed */
  connect?: (credentials: SipCredentials, sipClient: SipClient) => Promise<void>
  /** OAuth flow support */
  oauth?: OAuthConfig
}

/** Storage options for credentials */
export type StorageType = 'local' | 'session' | 'none'

/** Composable options */
export interface ProviderSelectorOptions {
  /** Storage type for credentials (default: 'local') */
  storage?: StorageType
  /** Default provider ID (default: 'own-pbx') */
  defaultProvider?: string
  /** Override or extend built-in providers */
  providers?: ProviderConfig[]
}

/** Stored credential data */
export interface StoredCredentials {
  /** Provider ID */
  providerId: string
  /** Credential values keyed by field name */
  values: Record<string, string>
  /** Timestamp when stored */
  storedAt: number
}
