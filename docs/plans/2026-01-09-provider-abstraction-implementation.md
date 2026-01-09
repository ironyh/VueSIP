# Provider Abstraction System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a multi-provider login system for VueSIP demos that's easy to get started with and easy to extend with new providers.

**Architecture:** Layered approach with config-only providers for simple WebSocket SIP (46 elks, Telnyx, VoIP.ms) and full adapters for SDK-based providers (Twilio). Headless composable (`useProviderSelector`) in core library, styled UI components in demo templates.

**Tech Stack:** Vue 3, TypeScript, Vitest, PrimeVue (templates only), existing VueSIP storage adapters

**Reference:** See design document at `docs/plans/2026-01-09-provider-abstraction-design.md`

---

## Task 1: Create Provider Types

**Files:**

- Create: `src/providers/types.ts`
- Test: `tests/unit/providers/providerSelector.types.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/providerSelector.types.test.ts`:

```typescript
/**
 * Provider Selector Types Tests
 */
import { describe, it, expect } from 'vitest'
import type {
  ProviderField,
  ProviderConfig,
  ProviderAdapter,
  SipCredentials,
  StorageType,
  ProviderSelectorOptions,
} from '../../../src/providers/types'

describe('Provider Selector Types', () => {
  describe('ProviderField', () => {
    it('should allow valid field definitions', () => {
      const field: ProviderField = {
        name: 'username',
        label: 'SIP Username',
        type: 'text',
        placeholder: 'Enter username',
        required: true,
        helpText: 'Your SIP username',
        helpUrl: 'https://example.com/help',
      }
      expect(field.name).toBe('username')
      expect(field.type).toBe('text')
    })

    it('should allow password field type', () => {
      const field: ProviderField = {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
      }
      expect(field.type).toBe('password')
    })

    it('should allow select field type', () => {
      const field: ProviderField = {
        name: 'region',
        label: 'Region',
        type: 'select',
        options: [
          { label: 'US', value: 'us' },
          { label: 'EU', value: 'eu' },
        ],
      }
      expect(field.type).toBe('select')
      expect(field.options).toHaveLength(2)
    })
  })

  describe('ProviderConfig', () => {
    it('should allow valid provider config', () => {
      const config: ProviderConfig = {
        id: '46elks',
        name: '46 elks',
        websocketUrl: 'wss://voip.46elks.com/w1/websocket',
        fields: [
          { name: 'phoneNumber', label: 'Phone Number', type: 'text', required: true },
          { name: 'secret', label: 'Secret', type: 'password', required: true },
        ],
        mapCredentials: (input) => ({
          uri: 'wss://voip.46elks.com/w1/websocket',
          sipUri: `sip:${input.phoneNumber}@voip.46elks.com`,
          password: input.secret,
        }),
      }
      expect(config.id).toBe('46elks')
      expect(config.fields).toHaveLength(2)
    })
  })

  describe('ProviderAdapter', () => {
    it('should extend ProviderConfig with connect method', () => {
      const adapter: ProviderAdapter = {
        id: 'twilio',
        name: 'Twilio',
        websocketUrl: '',
        fields: [],
        mapCredentials: () => ({ uri: '', sipUri: '', password: '' }),
        connect: async () => {
          // Custom Twilio SDK connection
        },
      }
      expect(adapter.connect).toBeDefined()
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
          clientId: 'client-id',
          scopes: ['sip', 'phone'],
        },
      }
      expect(adapter.oauth?.scopes).toContain('sip')
    })
  })

  describe('SipCredentials', () => {
    it('should have required fields', () => {
      const creds: SipCredentials = {
        uri: 'wss://sip.example.com/ws',
        sipUri: 'sip:1000@example.com',
        password: 'secret123',
      }
      expect(creds.uri).toBeDefined()
      expect(creds.sipUri).toBeDefined()
      expect(creds.password).toBeDefined()
    })

    it('should allow optional displayName', () => {
      const creds: SipCredentials = {
        uri: 'wss://sip.example.com/ws',
        sipUri: 'sip:1000@example.com',
        password: 'secret123',
        displayName: 'John Doe',
      }
      expect(creds.displayName).toBe('John Doe')
    })
  })

  describe('StorageType', () => {
    it('should only allow valid storage types', () => {
      const local: StorageType = 'local'
      const session: StorageType = 'session'
      const none: StorageType = 'none'
      expect([local, session, none]).toEqual(['local', 'session', 'none'])
    })
  })

  describe('ProviderSelectorOptions', () => {
    it('should allow all options', () => {
      const options: ProviderSelectorOptions = {
        storage: 'local',
        defaultProvider: 'own-pbx',
        providers: [],
      }
      expect(options.storage).toBe('local')
    })

    it('should allow partial options', () => {
      const options: ProviderSelectorOptions = {}
      expect(options.storage).toBeUndefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/providerSelector.types.test.ts`
Expected: FAIL with "Cannot find module '../../../src/providers/types'"

**Step 3: Write minimal implementation**

Create `src/providers/types.ts`:

```typescript
/**
 * Provider Abstraction Types
 *
 * Type definitions for multi-provider SIP login system.
 *
 * @module providers/types
 */

/** Option for select field type */
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
  /** Options for select type */
  options?: SelectOption[]
}

/** What gets passed to useSipClient */
export interface SipCredentials {
  /** WebSocket URL */
  uri: string
  /** SIP URI (sip:user@domain) */
  sipUri: string
  /** SIP password */
  password: string
  /** Optional display name */
  displayName?: string
}

/** Config-only provider definition (simple providers) */
export interface ProviderConfig {
  /** Unique provider identifier (e.g., '46elks') */
  id: string
  /** Display name (e.g., '46 elks') */
  name: string
  /** Provider logo URL or data URI */
  logo?: string
  /** Default WebSocket URL (empty if user provides) */
  websocketUrl: string
  /** Form fields for this provider */
  fields: ProviderField[]
  /** Transform user input to SIP credentials */
  mapCredentials: (input: Record<string, string>) => SipCredentials
}

/** OAuth configuration for providers that support it */
export interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  clientId: string
  scopes: string[]
}

/** Full adapter interface (complex providers like Twilio) */
export interface ProviderAdapter extends ProviderConfig {
  /** Custom connect function for SDK-based providers */
  connect?: (credentials: SipCredentials) => Promise<void>
  /** OAuth flow support */
  oauth?: OAuthConfig
}

/** Storage options for credentials */
export type StorageType = 'local' | 'session' | 'none'

/** Composable options */
export interface ProviderSelectorOptions {
  /** Storage type (default: 'local') */
  storage?: StorageType
  /** Default provider ID (default: 'own-pbx') */
  defaultProvider?: string
  /** Override built-in providers */
  providers?: ProviderConfig[]
}

/** Stored credential data */
export interface StoredCredentials {
  providerId: string
  credentials: Record<string, string>
  timestamp: number
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/providerSelector.types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/types.ts tests/unit/providers/providerSelector.types.test.ts
git commit -m "feat(providers): add provider abstraction type definitions"
```

---

## Task 2: Create Provider Registry

**Files:**

- Create: `src/providers/providerRegistry.ts`
- Test: `tests/unit/providers/providerRegistry.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/providerRegistry.test.ts`:

```typescript
/**
 * Provider Registry Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerProvider,
  getProvider,
  getAllProviders,
  removeProvider,
  resetRegistry,
} from '../../../src/providers/providerRegistry'
import type { ProviderConfig } from '../../../src/providers/types'

describe('providerRegistry', () => {
  beforeEach(() => {
    resetRegistry()
  })

  const mockProvider: ProviderConfig = {
    id: 'test-provider',
    name: 'Test Provider',
    websocketUrl: 'wss://test.example.com/ws',
    fields: [
      { name: 'username', label: 'Username', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
    ],
    mapCredentials: (input) => ({
      uri: 'wss://test.example.com/ws',
      sipUri: `sip:${input.username}@test.example.com`,
      password: input.password,
    }),
  }

  describe('registerProvider', () => {
    it('should register a new provider', () => {
      registerProvider(mockProvider)
      const provider = getProvider('test-provider')
      expect(provider).toBeDefined()
      expect(provider?.name).toBe('Test Provider')
    })

    it('should throw if provider id already exists', () => {
      registerProvider(mockProvider)
      expect(() => registerProvider(mockProvider)).toThrow(
        'Provider "test-provider" already registered'
      )
    })

    it('should validate required fields', () => {
      const invalidProvider = { id: 'invalid' } as ProviderConfig
      expect(() => registerProvider(invalidProvider)).toThrow()
    })
  })

  describe('getProvider', () => {
    it('should return undefined for unknown provider', () => {
      const provider = getProvider('unknown')
      expect(provider).toBeUndefined()
    })

    it('should return registered provider', () => {
      registerProvider(mockProvider)
      const provider = getProvider('test-provider')
      expect(provider?.id).toBe('test-provider')
    })
  })

  describe('getAllProviders', () => {
    it('should return empty array when no providers registered', () => {
      const providers = getAllProviders()
      expect(providers).toEqual([])
    })

    it('should return all registered providers', () => {
      registerProvider(mockProvider)
      registerProvider({
        ...mockProvider,
        id: 'another-provider',
        name: 'Another Provider',
      })
      const providers = getAllProviders()
      expect(providers).toHaveLength(2)
    })
  })

  describe('removeProvider', () => {
    it('should remove a provider', () => {
      registerProvider(mockProvider)
      expect(getProvider('test-provider')).toBeDefined()

      removeProvider('test-provider')
      expect(getProvider('test-provider')).toBeUndefined()
    })

    it('should not throw for unknown provider', () => {
      expect(() => removeProvider('unknown')).not.toThrow()
    })
  })

  describe('resetRegistry', () => {
    it('should clear all providers', () => {
      registerProvider(mockProvider)
      expect(getAllProviders()).toHaveLength(1)

      resetRegistry()
      expect(getAllProviders()).toHaveLength(0)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/providerRegistry.test.ts`
Expected: FAIL with "Cannot find module '../../../src/providers/providerRegistry'"

**Step 3: Write minimal implementation**

Create `src/providers/providerRegistry.ts`:

````typescript
/**
 * Provider Registry
 *
 * Central registry for SIP providers. Manages registration,
 * lookup, and validation of provider configurations.
 *
 * @module providers/providerRegistry
 */

import type { ProviderConfig, ProviderAdapter } from './types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('providerRegistry')

/** Internal provider storage */
const providers = new Map<string, ProviderConfig | ProviderAdapter>()

/**
 * Validate provider configuration
 */
function validateProvider(provider: ProviderConfig): void {
  if (!provider.id || typeof provider.id !== 'string') {
    throw new Error('Provider must have a valid id')
  }
  if (!provider.name || typeof provider.name !== 'string') {
    throw new Error('Provider must have a valid name')
  }
  if (!Array.isArray(provider.fields)) {
    throw new Error('Provider must have a fields array')
  }
  if (typeof provider.mapCredentials !== 'function') {
    throw new Error('Provider must have a mapCredentials function')
  }
}

/**
 * Register a new provider
 *
 * @param provider - Provider configuration
 * @throws {Error} If provider already exists or is invalid
 *
 * @example
 * ```typescript
 * registerProvider({
 *   id: 'my-provider',
 *   name: 'My Provider',
 *   websocketUrl: 'wss://sip.example.com/ws',
 *   fields: [...],
 *   mapCredentials: (input) => ({ ... })
 * })
 * ```
 */
export function registerProvider(provider: ProviderConfig | ProviderAdapter): void {
  validateProvider(provider)

  if (providers.has(provider.id)) {
    throw new Error(`Provider "${provider.id}" already registered`)
  }

  providers.set(provider.id, provider)
  logger.debug(`Registered provider: ${provider.id}`)
}

/**
 * Get a provider by ID
 *
 * @param id - Provider identifier
 * @returns Provider configuration or undefined
 */
export function getProvider(id: string): ProviderConfig | ProviderAdapter | undefined {
  return providers.get(id)
}

/**
 * Get all registered providers
 *
 * @returns Array of all provider configurations
 */
export function getAllProviders(): (ProviderConfig | ProviderAdapter)[] {
  return Array.from(providers.values())
}

/**
 * Remove a provider from the registry
 *
 * @param id - Provider identifier
 */
export function removeProvider(id: string): void {
  providers.delete(id)
  logger.debug(`Removed provider: ${id}`)
}

/**
 * Reset the registry (for testing)
 */
export function resetRegistry(): void {
  providers.clear()
}

/**
 * Check if a provider is registered
 *
 * @param id - Provider identifier
 * @returns True if provider exists
 */
export function hasProvider(id: string): boolean {
  return providers.has(id)
}
````

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/providerRegistry.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/providerRegistry.ts tests/unit/providers/providerRegistry.test.ts
git commit -m "feat(providers): add provider registry for managing providers"
```

---

## Task 3: Create Credential Storage

**Files:**

- Create: `src/providers/credentialStorage.ts`
- Test: `tests/unit/providers/credentialStorage.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/credentialStorage.test.ts`:

```typescript
/**
 * Credential Storage Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createCredentialStorage,
  type CredentialStorage,
} from '../../../src/providers/credentialStorage'
import type { StorageType, StoredCredentials } from '../../../src/providers/types'

describe('credentialStorage', () => {
  let localStorageMock: Storage
  let sessionStorageMock: Storage

  beforeEach(() => {
    const createStorageMock = (): Storage => {
      let store: Record<string, string> = {}
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key]
        }),
        clear: vi.fn(() => {
          store = {}
        }),
        get length() {
          return Object.keys(store).length
        },
        key: vi.fn((index: number) => Object.keys(store)[index] || null),
      }
    }

    localStorageMock = createStorageMock()
    sessionStorageMock = createStorageMock()

    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('sessionStorage', sessionStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('createCredentialStorage', () => {
    it('should create storage with localStorage by default', () => {
      const storage = createCredentialStorage()
      expect(storage).toBeDefined()
      expect(storage.type).toBe('local')
    })

    it('should create storage with sessionStorage', () => {
      const storage = createCredentialStorage('session')
      expect(storage.type).toBe('session')
    })

    it('should create noop storage for none type', () => {
      const storage = createCredentialStorage('none')
      expect(storage.type).toBe('none')
    })
  })

  describe('save and load credentials', () => {
    it('should save and load credentials', () => {
      const storage = createCredentialStorage('local')
      const credentials: StoredCredentials = {
        providerId: '46elks',
        credentials: { phoneNumber: '46700000000', secret: 'test-secret' },
        timestamp: Date.now(),
      }

      storage.save(credentials)
      const loaded = storage.load()

      expect(loaded).toBeDefined()
      expect(loaded?.providerId).toBe('46elks')
      expect(loaded?.credentials.phoneNumber).toBe('46700000000')
    })

    it('should return null when no credentials saved', () => {
      const storage = createCredentialStorage('local')
      const loaded = storage.load()
      expect(loaded).toBeNull()
    })

    it('should not persist credentials with none storage', () => {
      const storage = createCredentialStorage('none')
      const credentials: StoredCredentials = {
        providerId: '46elks',
        credentials: { phoneNumber: '46700000000', secret: 'test-secret' },
        timestamp: Date.now(),
      }

      storage.save(credentials)
      const loaded = storage.load()

      expect(loaded).toBeNull()
    })
  })

  describe('clear credentials', () => {
    it('should clear saved credentials', () => {
      const storage = createCredentialStorage('local')
      const credentials: StoredCredentials = {
        providerId: '46elks',
        credentials: { phoneNumber: '46700000000', secret: 'test-secret' },
        timestamp: Date.now(),
      }

      storage.save(credentials)
      expect(storage.load()).not.toBeNull()

      storage.clear()
      expect(storage.load()).toBeNull()
    })
  })

  describe('session storage', () => {
    it('should use sessionStorage when specified', () => {
      const storage = createCredentialStorage('session')
      const credentials: StoredCredentials = {
        providerId: 'telnyx',
        credentials: { username: 'user', password: 'pass' },
        timestamp: Date.now(),
      }

      storage.save(credentials)

      expect(sessionStorageMock.setItem).toHaveBeenCalled()
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/credentialStorage.test.ts`
Expected: FAIL with "Cannot find module '../../../src/providers/credentialStorage'"

**Step 3: Write minimal implementation**

Create `src/providers/credentialStorage.ts`:

````typescript
/**
 * Credential Storage
 *
 * Handles persistence of provider credentials with configurable
 * storage backends (localStorage, sessionStorage, or none).
 *
 * @module providers/credentialStorage
 */

import type { StorageType, StoredCredentials } from './types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('credentialStorage')

const STORAGE_KEY = 'vuesip:provider:credentials'

export interface CredentialStorage {
  /** Storage type being used */
  type: StorageType
  /** Save credentials */
  save(credentials: StoredCredentials): void
  /** Load credentials */
  load(): StoredCredentials | null
  /** Clear credentials */
  clear(): void
}

/**
 * Create a credential storage instance
 *
 * @param type - Storage type (local, session, none)
 * @returns Credential storage instance
 *
 * @example
 * ```typescript
 * const storage = createCredentialStorage('local')
 * storage.save({ providerId: '46elks', credentials: {...}, timestamp: Date.now() })
 * const loaded = storage.load()
 * ```
 */
export function createCredentialStorage(type: StorageType = 'local'): CredentialStorage {
  // No-op storage for 'none' type
  if (type === 'none') {
    return {
      type: 'none',
      save: () => {
        logger.debug('Credentials not saved (storage type: none)')
      },
      load: () => null,
      clear: () => {},
    }
  }

  const storage = type === 'session' ? sessionStorage : localStorage

  return {
    type,
    save(credentials: StoredCredentials): void {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(credentials))
        logger.debug(`Credentials saved for provider: ${credentials.providerId}`)
      } catch (error) {
        logger.warn('Failed to save credentials:', error)
      }
    },
    load(): StoredCredentials | null {
      try {
        const data = storage.getItem(STORAGE_KEY)
        if (!data) return null

        const parsed = JSON.parse(data) as StoredCredentials
        logger.debug(`Credentials loaded for provider: ${parsed.providerId}`)
        return parsed
      } catch (error) {
        logger.warn('Failed to load credentials:', error)
        return null
      }
    },
    clear(): void {
      try {
        storage.removeItem(STORAGE_KEY)
        logger.debug('Credentials cleared')
      } catch (error) {
        logger.warn('Failed to clear credentials:', error)
      }
    },
  }
}
````

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/credentialStorage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/credentialStorage.ts tests/unit/providers/credentialStorage.test.ts
git commit -m "feat(providers): add credential storage with localStorage/sessionStorage support"
```

---

## Task 4: Create Own PBX Provider Config

**Files:**

- Create: `src/providers/configs/own-pbx.ts`
- Test: `tests/unit/providers/configs/own-pbx.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/configs/own-pbx.test.ts`:

```typescript
/**
 * Own PBX Provider Config Tests
 */
import { describe, it, expect } from 'vitest'
import { ownPbxProvider } from '../../../../src/providers/configs/own-pbx'

describe('ownPbxProvider', () => {
  it('should have correct id and name', () => {
    expect(ownPbxProvider.id).toBe('own-pbx')
    expect(ownPbxProvider.name).toBe('Own PBX (Asterisk/FreePBX)')
  })

  it('should have empty websocketUrl (user provides)', () => {
    expect(ownPbxProvider.websocketUrl).toBe('')
  })

  it('should have required fields', () => {
    const fieldNames = ownPbxProvider.fields.map((f) => f.name)
    expect(fieldNames).toContain('websocketUrl')
    expect(fieldNames).toContain('sipUri')
    expect(fieldNames).toContain('password')
    expect(fieldNames).toContain('displayName')
  })

  it('should mark websocketUrl, sipUri, password as required', () => {
    const websocketField = ownPbxProvider.fields.find((f) => f.name === 'websocketUrl')
    const sipUriField = ownPbxProvider.fields.find((f) => f.name === 'sipUri')
    const passwordField = ownPbxProvider.fields.find((f) => f.name === 'password')
    const displayNameField = ownPbxProvider.fields.find((f) => f.name === 'displayName')

    expect(websocketField?.required).toBe(true)
    expect(sipUriField?.required).toBe(true)
    expect(passwordField?.required).toBe(true)
    expect(displayNameField?.required).toBeFalsy()
  })

  it('should map credentials correctly', () => {
    const input = {
      websocketUrl: 'wss://pbx.example.com:8089/ws',
      sipUri: 'sip:1000@pbx.example.com',
      password: 'secret123',
      displayName: 'John Doe',
    }

    const credentials = ownPbxProvider.mapCredentials(input)

    expect(credentials.uri).toBe('wss://pbx.example.com:8089/ws')
    expect(credentials.sipUri).toBe('sip:1000@pbx.example.com')
    expect(credentials.password).toBe('secret123')
    expect(credentials.displayName).toBe('John Doe')
  })

  it('should handle missing displayName', () => {
    const input = {
      websocketUrl: 'wss://pbx.example.com:8089/ws',
      sipUri: 'sip:1000@pbx.example.com',
      password: 'secret123',
    }

    const credentials = ownPbxProvider.mapCredentials(input)

    expect(credentials.displayName).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/configs/own-pbx.test.ts`
Expected: FAIL with "Cannot find module '../../../../src/providers/configs/own-pbx'"

**Step 3: Write minimal implementation**

Create `src/providers/configs/own-pbx.ts`:

```typescript
/**
 * Own PBX Provider Configuration
 *
 * Generic SIP provider for self-hosted PBX systems like
 * Asterisk, FreePBX, or any WebSocket-enabled SIP server.
 *
 * @module providers/configs/own-pbx
 */

import type { ProviderConfig } from '../types'

export const ownPbxProvider: ProviderConfig = {
  id: 'own-pbx',
  name: 'Own PBX (Asterisk/FreePBX)',
  websocketUrl: '', // User provides their own
  fields: [
    {
      name: 'websocketUrl',
      label: 'WebSocket URL',
      type: 'text',
      placeholder: 'wss://pbx.example.com:8089/ws',
      required: true,
      helpText: 'Your PBX WebSocket endpoint (usually port 8089 for Asterisk)',
    },
    {
      name: 'sipUri',
      label: 'SIP URI',
      type: 'text',
      placeholder: 'sip:1000@pbx.example.com',
      required: true,
      helpText: 'Your SIP address in format sip:extension@domain',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
      helpText: 'Your SIP account password',
    },
    {
      name: 'displayName',
      label: 'Display Name',
      type: 'text',
      placeholder: 'John Doe',
      helpText: 'Name shown to call recipients (optional)',
    },
  ],
  mapCredentials: (input) => ({
    uri: input.websocketUrl,
    sipUri: input.sipUri,
    password: input.password,
    displayName: input.displayName || undefined,
  }),
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/configs/own-pbx.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/configs/own-pbx.ts tests/unit/providers/configs/own-pbx.test.ts
git commit -m "feat(providers): add Own PBX provider config for generic SIP"
```

---

## Task 5: Create 46 elks Provider Config

**Files:**

- Create: `src/providers/configs/46elks.ts`
- Test: `tests/unit/providers/configs/46elks.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/configs/46elks.test.ts`:

```typescript
/**
 * 46 elks Provider Config Tests
 */
import { describe, it, expect } from 'vitest'
import { elks46Provider } from '../../../../src/providers/configs/46elks'

describe('elks46Provider', () => {
  it('should have correct id and name', () => {
    expect(elks46Provider.id).toBe('46elks')
    expect(elks46Provider.name).toBe('46 elks')
  })

  it('should have correct websocketUrl', () => {
    expect(elks46Provider.websocketUrl).toBe('wss://voip.46elks.com/w1/websocket')
  })

  it('should have required fields', () => {
    const fieldNames = elks46Provider.fields.map((f) => f.name)
    expect(fieldNames).toContain('phoneNumber')
    expect(fieldNames).toContain('secret')
  })

  it('should have helpUrl for secret field', () => {
    const secretField = elks46Provider.fields.find((f) => f.name === 'secret')
    expect(secretField?.helpUrl).toBe('https://46elks.com/docs/webrtc-client-connect')
  })

  it('should map credentials correctly', () => {
    const input = {
      phoneNumber: '46700000000',
      secret: 'abc123secret',
    }

    const credentials = elks46Provider.mapCredentials(input)

    expect(credentials.uri).toBe('wss://voip.46elks.com/w1/websocket')
    expect(credentials.sipUri).toBe('sip:46700000000@voip.46elks.com')
    expect(credentials.password).toBe('abc123secret')
  })

  it('should handle phone number with plus sign', () => {
    const input = {
      phoneNumber: '+46700000000',
      secret: 'abc123secret',
    }

    const credentials = elks46Provider.mapCredentials(input)

    // Should strip the + sign
    expect(credentials.sipUri).toBe('sip:46700000000@voip.46elks.com')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/configs/46elks.test.ts`
Expected: FAIL with "Cannot find module '../../../../src/providers/configs/46elks'"

**Step 3: Write minimal implementation**

Create `src/providers/configs/46elks.ts`:

```typescript
/**
 * 46 elks Provider Configuration
 *
 * Swedish VoIP provider with WebRTC support.
 * @see https://46elks.com/docs/webrtc-client-connect
 *
 * @module providers/configs/46elks
 */

import type { ProviderConfig } from '../types'

export const elks46Provider: ProviderConfig = {
  id: '46elks',
  name: '46 elks',
  websocketUrl: 'wss://voip.46elks.com/w1/websocket',
  fields: [
    {
      name: 'phoneNumber',
      label: 'Phone Number',
      type: 'text',
      placeholder: '46700000000',
      required: true,
      helpText: 'Your 46elks number without + (e.g., 46700000000)',
    },
    {
      name: 'secret',
      label: 'Secret',
      type: 'password',
      required: true,
      helpText: 'Get from API: GET /a1/numbers/{number}',
      helpUrl: 'https://46elks.com/docs/webrtc-client-connect',
    },
  ],
  mapCredentials: (input) => {
    // Strip + if present
    const phoneNumber = input.phoneNumber.replace(/^\+/, '')
    return {
      uri: 'wss://voip.46elks.com/w1/websocket',
      sipUri: `sip:${phoneNumber}@voip.46elks.com`,
      password: input.secret,
    }
  },
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/configs/46elks.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/configs/46elks.ts tests/unit/providers/configs/46elks.test.ts
git commit -m "feat(providers): add 46 elks provider config"
```

---

## Task 6: Create Telnyx Provider Config

**Files:**

- Create: `src/providers/configs/telnyx.ts`
- Test: `tests/unit/providers/configs/telnyx.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/configs/telnyx.test.ts`:

```typescript
/**
 * Telnyx Provider Config Tests
 */
import { describe, it, expect } from 'vitest'
import { telnyxProvider } from '../../../../src/providers/configs/telnyx'

describe('telnyxProvider', () => {
  it('should have correct id and name', () => {
    expect(telnyxProvider.id).toBe('telnyx')
    expect(telnyxProvider.name).toBe('Telnyx')
  })

  it('should have correct websocketUrl', () => {
    expect(telnyxProvider.websocketUrl).toBe('wss://rtc.telnyx.com')
  })

  it('should have required fields', () => {
    const fieldNames = telnyxProvider.fields.map((f) => f.name)
    expect(fieldNames).toContain('username')
    expect(fieldNames).toContain('password')
  })

  it('should have helpUrl for password field', () => {
    const passwordField = telnyxProvider.fields.find((f) => f.name === 'password')
    expect(passwordField?.helpUrl).toBe('https://portal.telnyx.com/#/app/sip-trunks')
  })

  it('should map credentials correctly', () => {
    const input = {
      username: 'myusername',
      password: 'mypassword',
    }

    const credentials = telnyxProvider.mapCredentials(input)

    expect(credentials.uri).toBe('wss://rtc.telnyx.com')
    expect(credentials.sipUri).toBe('sip:myusername@sip.telnyx.com')
    expect(credentials.password).toBe('mypassword')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/configs/telnyx.test.ts`
Expected: FAIL with "Cannot find module '../../../../src/providers/configs/telnyx'"

**Step 3: Write minimal implementation**

Create `src/providers/configs/telnyx.ts`:

```typescript
/**
 * Telnyx Provider Configuration
 *
 * Cloud-based communications platform with WebRTC support.
 * @see https://developers.telnyx.com/docs/v2/webrtc
 *
 * @module providers/configs/telnyx
 */

import type { ProviderConfig } from '../types'

export const telnyxProvider: ProviderConfig = {
  id: 'telnyx',
  name: 'Telnyx',
  websocketUrl: 'wss://rtc.telnyx.com',
  fields: [
    {
      name: 'username',
      label: 'SIP Username',
      type: 'text',
      required: true,
      helpText: 'From your SIP Connection credentials',
    },
    {
      name: 'password',
      label: 'SIP Password',
      type: 'password',
      required: true,
      helpUrl: 'https://portal.telnyx.com/#/app/sip-trunks',
    },
  ],
  mapCredentials: (input) => ({
    uri: 'wss://rtc.telnyx.com',
    sipUri: `sip:${input.username}@sip.telnyx.com`,
    password: input.password,
  }),
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/configs/telnyx.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/configs/telnyx.ts tests/unit/providers/configs/telnyx.test.ts
git commit -m "feat(providers): add Telnyx provider config"
```

---

## Task 7: Create VoIP.ms Provider Config

**Files:**

- Create: `src/providers/configs/voipms.ts`
- Test: `tests/unit/providers/configs/voipms.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/configs/voipms.test.ts`:

```typescript
/**
 * VoIP.ms Provider Config Tests
 */
import { describe, it, expect } from 'vitest'
import { voipmsProvider } from '../../../../src/providers/configs/voipms'

describe('voipmsProvider', () => {
  it('should have correct id and name', () => {
    expect(voipmsProvider.id).toBe('voipms')
    expect(voipmsProvider.name).toBe('VoIP.ms')
  })

  it('should have empty websocketUrl (requires gateway)', () => {
    expect(voipmsProvider.websocketUrl).toBe('')
  })

  it('should have required fields including websocketUrl', () => {
    const fieldNames = voipmsProvider.fields.map((f) => f.name)
    expect(fieldNames).toContain('websocketUrl')
    expect(fieldNames).toContain('username')
    expect(fieldNames).toContain('password')
  })

  it('should have helpText explaining gateway requirement', () => {
    const wsField = voipmsProvider.fields.find((f) => f.name === 'websocketUrl')
    expect(wsField?.helpText).toContain('gateway')
  })

  it('should map credentials correctly', () => {
    const input = {
      websocketUrl: 'wss://gateway.example.com/ws',
      username: 'myaccount',
      password: 'sippassword',
    }

    const credentials = voipmsProvider.mapCredentials(input)

    expect(credentials.uri).toBe('wss://gateway.example.com/ws')
    expect(credentials.sipUri).toBe('sip:myaccount@atlanta.voip.ms')
    expect(credentials.password).toBe('sippassword')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/configs/voipms.test.ts`
Expected: FAIL with "Cannot find module '../../../../src/providers/configs/voipms'"

**Step 3: Write minimal implementation**

Create `src/providers/configs/voipms.ts`:

```typescript
/**
 * VoIP.ms Provider Configuration
 *
 * North American VoIP provider. Note: VoIP.ms doesn't support
 * WebRTC natively, requires a WebRTC gateway.
 * @see https://voip.ms
 *
 * @module providers/configs/voipms
 */

import type { ProviderConfig } from '../types'

export const voipmsProvider: ProviderConfig = {
  id: 'voipms',
  name: 'VoIP.ms',
  websocketUrl: '', // Requires user-provided gateway
  fields: [
    {
      name: 'websocketUrl',
      label: 'WebSocket Gateway URL',
      type: 'text',
      required: true,
      helpText: 'VoIP.ms requires a WebRTC gateway (e.g., Ooma, custom proxy)',
    },
    {
      name: 'username',
      label: 'Main Account',
      type: 'text',
      required: true,
      helpText: 'Your VoIP.ms main account username',
    },
    {
      name: 'password',
      label: 'SIP Password',
      type: 'password',
      required: true,
      helpUrl: 'https://voip.ms/m/settings.php',
    },
  ],
  mapCredentials: (input) => ({
    uri: input.websocketUrl,
    sipUri: `sip:${input.username}@atlanta.voip.ms`,
    password: input.password,
  }),
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/configs/voipms.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/configs/voipms.ts tests/unit/providers/configs/voipms.test.ts
git commit -m "feat(providers): add VoIP.ms provider config"
```

---

## Task 8: Create Twilio Adapter (Placeholder)

**Files:**

- Create: `src/providers/adapters/twilio.ts`
- Test: `tests/unit/providers/adapters/twilio.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/adapters/twilio.test.ts`:

```typescript
/**
 * Twilio Adapter Tests
 */
import { describe, it, expect } from 'vitest'
import { twilioAdapter } from '../../../../src/providers/adapters/twilio'

describe('twilioAdapter', () => {
  it('should have correct id and name', () => {
    expect(twilioAdapter.id).toBe('twilio')
    expect(twilioAdapter.name).toBe('Twilio')
  })

  it('should have empty websocketUrl (SDK handles connection)', () => {
    expect(twilioAdapter.websocketUrl).toBe('')
  })

  it('should have required fields', () => {
    const fieldNames = twilioAdapter.fields.map((f) => f.name)
    expect(fieldNames).toContain('accountSid')
    expect(fieldNames).toContain('authToken')
    expect(fieldNames).toContain('twimlAppSid')
  })

  it('should have connect function defined', () => {
    expect(twilioAdapter.connect).toBeDefined()
    expect(typeof twilioAdapter.connect).toBe('function')
  })

  it('should throw not implemented error on connect', async () => {
    const creds = {
      uri: '',
      sipUri: '',
      password: '',
    }

    await expect(twilioAdapter.connect!(creds)).rejects.toThrow(
      'Twilio adapter not yet implemented'
    )
  })

  it('should map credentials (placeholder)', () => {
    const input = {
      accountSid: 'AC123',
      authToken: 'token123',
      twimlAppSid: 'AP456',
    }

    const credentials = twilioAdapter.mapCredentials(input)

    // Twilio uses SDK, not standard SIP
    expect(credentials.uri).toBe('')
    expect(credentials.sipUri).toBe('')
    expect(credentials.password).toBe('')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/adapters/twilio.test.ts`
Expected: FAIL with "Cannot find module '../../../../src/providers/adapters/twilio'"

**Step 3: Write minimal implementation**

Create `src/providers/adapters/twilio.ts`:

```typescript
/**
 * Twilio Adapter
 *
 * Twilio uses its own JavaScript SDK rather than standard SIP.
 * This adapter provides the structure for future Twilio integration.
 *
 * NOTE: Full implementation requires the @twilio/voice-sdk package
 * and backend token generation endpoint.
 *
 * @see https://www.twilio.com/docs/voice/sdks/javascript
 *
 * @module providers/adapters/twilio
 */

import type { ProviderAdapter } from '../types'

export const twilioAdapter: ProviderAdapter = {
  id: 'twilio',
  name: 'Twilio',
  websocketUrl: '', // SDK handles connection
  fields: [
    {
      name: 'accountSid',
      label: 'Account SID',
      type: 'text',
      required: true,
      helpText: 'Found in your Twilio Console dashboard',
    },
    {
      name: 'authToken',
      label: 'Auth Token',
      type: 'password',
      required: true,
      helpText: 'Found in your Twilio Console dashboard',
    },
    {
      name: 'twimlAppSid',
      label: 'TwiML App SID',
      type: 'text',
      required: true,
      helpUrl: 'https://console.twilio.com/us1/develop/voice/twiml-apps',
    },
  ],
  // Twilio doesn't use standard SIP credentials
  mapCredentials: () => ({
    uri: '',
    sipUri: '',
    password: '',
  }),
  // Custom connect function for Twilio SDK
  connect: async () => {
    // TODO: Implement Twilio SDK integration
    // This requires:
    // 1. Backend endpoint to generate access tokens
    // 2. @twilio/voice-sdk package
    // 3. TwiML app configuration
    throw new Error('Twilio adapter not yet implemented. See docs for integration guide.')
  },
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/adapters/twilio.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/adapters/twilio.ts tests/unit/providers/adapters/twilio.test.ts
git commit -m "feat(providers): add Twilio adapter placeholder"
```

---

## Task 9: Create Provider Configs Index

**Files:**

- Create: `src/providers/configs/index.ts`
- Test: `tests/unit/providers/configs/index.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/configs/index.test.ts`:

```typescript
/**
 * Provider Configs Index Tests
 */
import { describe, it, expect } from 'vitest'
import {
  builtInProviders,
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
} from '../../../../src/providers/configs'

describe('Provider Configs Index', () => {
  it('should export all individual providers', () => {
    expect(ownPbxProvider).toBeDefined()
    expect(elks46Provider).toBeDefined()
    expect(telnyxProvider).toBeDefined()
    expect(voipmsProvider).toBeDefined()
  })

  it('should export builtInProviders array', () => {
    expect(Array.isArray(builtInProviders)).toBe(true)
    expect(builtInProviders.length).toBe(4)
  })

  it('should have own-pbx first in builtInProviders', () => {
    expect(builtInProviders[0].id).toBe('own-pbx')
  })

  it('should contain all providers in builtInProviders', () => {
    const ids = builtInProviders.map((p) => p.id)
    expect(ids).toContain('own-pbx')
    expect(ids).toContain('46elks')
    expect(ids).toContain('telnyx')
    expect(ids).toContain('voipms')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/configs/index.test.ts`
Expected: FAIL with "Cannot find module '../../../../src/providers/configs'"

**Step 3: Write minimal implementation**

Create `src/providers/configs/index.ts`:

```typescript
/**
 * Built-in Provider Configurations
 *
 * Re-exports all provider configs and provides a combined array.
 *
 * @module providers/configs
 */

export { ownPbxProvider } from './own-pbx'
export { elks46Provider } from './46elks'
export { telnyxProvider } from './telnyx'
export { voipmsProvider } from './voipms'

import { ownPbxProvider } from './own-pbx'
import { elks46Provider } from './46elks'
import { telnyxProvider } from './telnyx'
import { voipmsProvider } from './voipms'
import type { ProviderConfig } from '../types'

/**
 * All built-in provider configurations
 * Own PBX is first as it's the default
 */
export const builtInProviders: ProviderConfig[] = [
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
]
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/configs/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/configs/index.ts tests/unit/providers/configs/index.test.ts
git commit -m "feat(providers): add configs index exporting all built-in providers"
```

---

## Task 10: Create Provider Adapters Index

**Files:**

- Create: `src/providers/adapters/index.ts`
- Test: `tests/unit/providers/adapters/index.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/adapters/index.test.ts`:

```typescript
/**
 * Provider Adapters Index Tests
 */
import { describe, it, expect } from 'vitest'
import { builtInAdapters, twilioAdapter } from '../../../../src/providers/adapters'

describe('Provider Adapters Index', () => {
  it('should export twilioAdapter', () => {
    expect(twilioAdapter).toBeDefined()
    expect(twilioAdapter.id).toBe('twilio')
  })

  it('should export builtInAdapters array', () => {
    expect(Array.isArray(builtInAdapters)).toBe(true)
  })

  it('should contain twilio in builtInAdapters', () => {
    const ids = builtInAdapters.map((a) => a.id)
    expect(ids).toContain('twilio')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/adapters/index.test.ts`
Expected: FAIL with "Cannot find module '../../../../src/providers/adapters'"

**Step 3: Write minimal implementation**

Create `src/providers/adapters/index.ts`:

```typescript
/**
 * Provider Adapters
 *
 * Re-exports all provider adapters (for SDK-based providers).
 *
 * @module providers/adapters
 */

export { twilioAdapter } from './twilio'

import { twilioAdapter } from './twilio'
import type { ProviderAdapter } from '../types'

/**
 * All built-in provider adapters
 */
export const builtInAdapters: ProviderAdapter[] = [twilioAdapter]
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/adapters/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/adapters/index.ts tests/unit/providers/adapters/index.test.ts
git commit -m "feat(providers): add adapters index"
```

---

## Task 11: Create useProviderSelector Composable

**Files:**

- Create: `src/providers/useProviderSelector.ts`
- Test: `tests/unit/providers/useProviderSelector.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/useProviderSelector.test.ts`:

```typescript
/**
 * useProviderSelector Composable Tests
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useProviderSelector, _resetForTesting } from '../../../src/providers/useProviderSelector'
import { resetRegistry } from '../../../src/providers/providerRegistry'

describe('useProviderSelector', () => {
  let localStorageMock: Storage

  beforeEach(() => {
    // Reset singleton and registry
    _resetForTesting()
    resetRegistry()

    // Mock localStorage
    const store: Record<string, string> = {}
    localStorageMock = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key])
      }),
      get length() {
        return Object.keys(store).length
      },
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
    }
    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('sessionStorage', localStorageMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const createTestComponent = (options = {}) => {
    let composableResult: ReturnType<typeof useProviderSelector> | null = null

    const TestComponent = defineComponent({
      setup() {
        composableResult = useProviderSelector(options)
        return composableResult
      },
      template: '<div>Test</div>',
    })

    const wrapper = mount(TestComponent)
    return { wrapper, getResult: () => composableResult! }
  }

  describe('initialization', () => {
    it('should initialize with built-in providers', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      expect(result.providers.value.length).toBeGreaterThan(0)
      expect(result.providers.value[0].id).toBe('own-pbx')
    })

    it('should select own-pbx as default provider', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      expect(result.selectedProvider.value?.id).toBe('own-pbx')
    })

    it('should use custom default provider', () => {
      const { getResult } = createTestComponent({ defaultProvider: '46elks' })
      const result = getResult()

      expect(result.selectedProvider.value?.id).toBe('46elks')
    })

    it('should initialize credentials as empty object', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      expect(result.credentials.value).toEqual({})
    })

    it('should start as not configured', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      expect(result.isConfigured.value).toBe(false)
    })
  })

  describe('selectProvider', () => {
    it('should change selected provider', async () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.selectProvider('46elks')
      await nextTick()

      expect(result.selectedProvider.value?.id).toBe('46elks')
    })

    it('should clear credentials when changing provider', async () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://test.com')
      expect(result.credentials.value.websocketUrl).toBe('wss://test.com')

      result.selectProvider('46elks')
      await nextTick()

      expect(result.credentials.value).toEqual({})
    })
  })

  describe('updateCredential', () => {
    it('should update a credential field', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://pbx.example.com/ws')

      expect(result.credentials.value.websocketUrl).toBe('wss://pbx.example.com/ws')
    })

    it('should allow updating multiple fields', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://pbx.example.com/ws')
      result.updateCredential('sipUri', 'sip:1000@example.com')
      result.updateCredential('password', 'secret')

      expect(result.credentials.value.websocketUrl).toBe('wss://pbx.example.com/ws')
      expect(result.credentials.value.sipUri).toBe('sip:1000@example.com')
      expect(result.credentials.value.password).toBe('secret')
    })
  })

  describe('isConfigured', () => {
    it('should be false when required fields are missing', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://pbx.example.com/ws')
      // sipUri and password still missing

      expect(result.isConfigured.value).toBe(false)
    })

    it('should be true when all required fields are filled', async () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://pbx.example.com/ws')
      result.updateCredential('sipUri', 'sip:1000@example.com')
      result.updateCredential('password', 'secret')
      await nextTick()

      expect(result.isConfigured.value).toBe(true)
    })
  })

  describe('saveCredentials', () => {
    it('should save credentials to storage', async () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://pbx.example.com/ws')
      result.updateCredential('sipUri', 'sip:1000@example.com')
      result.updateCredential('password', 'secret')

      result.saveCredentials()

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('clearCredentials', () => {
    it('should clear credentials and storage', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://test.com')
      result.saveCredentials()
      result.clearCredentials()

      expect(result.credentials.value).toEqual({})
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('getSipConfig', () => {
    it('should return null when not configured', () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      expect(result.getSipConfig()).toBeNull()
    })

    it('should return SIP config when configured', async () => {
      const { getResult } = createTestComponent()
      const result = getResult()

      result.updateCredential('websocketUrl', 'wss://pbx.example.com/ws')
      result.updateCredential('sipUri', 'sip:1000@example.com')
      result.updateCredential('password', 'secret')
      result.updateCredential('displayName', 'Test User')
      await nextTick()

      const config = result.getSipConfig()

      expect(config).not.toBeNull()
      expect(config?.uri).toBe('wss://pbx.example.com/ws')
      expect(config?.sipUri).toBe('sip:1000@example.com')
      expect(config?.password).toBe('secret')
      expect(config?.displayName).toBe('Test User')
    })
  })

  describe('loadSavedCredentials', () => {
    it('should load previously saved credentials on init', async () => {
      // Save credentials
      const savedData = {
        providerId: 'own-pbx',
        credentials: {
          websocketUrl: 'wss://saved.example.com/ws',
          sipUri: 'sip:saved@example.com',
          password: 'savedpass',
        },
        timestamp: Date.now(),
      }
      localStorageMock.setItem('vuesip:provider:credentials', JSON.stringify(savedData))

      // Reset and create new instance
      _resetForTesting()
      const { getResult } = createTestComponent()
      const result = getResult()

      // Should have loaded saved credentials
      expect(result.credentials.value.websocketUrl).toBe('wss://saved.example.com/ws')
      expect(result.selectedProvider.value?.id).toBe('own-pbx')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/useProviderSelector.test.ts`
Expected: FAIL with "Cannot find module '../../../src/providers/useProviderSelector'"

**Step 3: Write minimal implementation**

Create `src/providers/useProviderSelector.ts`:

````typescript
/**
 * useProviderSelector Composable
 *
 * Headless composable for multi-provider SIP login system.
 * Provides state management and credential handling without UI.
 *
 * @module providers/useProviderSelector
 */

import { ref, computed, readonly, watch, type Ref, type ComputedRef } from 'vue'
import type {
  ProviderConfig,
  ProviderAdapter,
  ProviderSelectorOptions,
  SipCredentials,
  StoredCredentials,
} from './types'
import { registerProvider, getProvider, getAllProviders, resetRegistry } from './providerRegistry'
import { createCredentialStorage, type CredentialStorage } from './credentialStorage'
import { builtInProviders } from './configs'
import { builtInAdapters } from './adapters'
import { createLogger } from '@/utils/logger'

const logger = createLogger('useProviderSelector')

// Singleton state
let initialized = false
let storage: CredentialStorage | null = null

export interface UseProviderSelectorReturn {
  /** Available providers */
  providers: ComputedRef<(ProviderConfig | ProviderAdapter)[]>
  /** Currently selected provider */
  selectedProvider: ComputedRef<ProviderConfig | ProviderAdapter | undefined>
  /** Current credential values */
  credentials: Ref<Record<string, string>>
  /** Whether all required fields are filled */
  isConfigured: ComputedRef<boolean>

  /** Change selected provider */
  selectProvider: (providerId: string) => void
  /** Update a credential field */
  updateCredential: (name: string, value: string) => void
  /** Save credentials to storage */
  saveCredentials: () => void
  /** Clear saved credentials */
  clearCredentials: () => void
  /** Get SIP config for useSipClient */
  getSipConfig: () => SipCredentials | null
}

// Shared reactive state
const selectedProviderId = ref<string>('own-pbx')
const credentials = ref<Record<string, string>>({})

/**
 * useProviderSelector - Multi-provider SIP login composable
 *
 * @param options - Configuration options
 * @returns Provider selector state and methods
 *
 * @example
 * ```typescript
 * const {
 *   providers,
 *   selectedProvider,
 *   credentials,
 *   isConfigured,
 *   selectProvider,
 *   updateCredential,
 *   getSipConfig,
 * } = useProviderSelector({ storage: 'local' })
 *
 * // Select a provider
 * selectProvider('46elks')
 *
 * // Update credentials
 * updateCredential('phoneNumber', '46700000000')
 * updateCredential('secret', 'mysecret')
 *
 * // Get config for SIP client
 * if (isConfigured.value) {
 *   const config = getSipConfig()
 *   await sipClient.connect(config)
 * }
 * ```
 */
export function useProviderSelector(
  options: ProviderSelectorOptions = {}
): UseProviderSelectorReturn {
  const {
    storage: storageType = 'local',
    defaultProvider = 'own-pbx',
    providers: customProviders,
  } = options

  // Initialize on first use
  if (!initialized) {
    // Create storage
    storage = createCredentialStorage(storageType)

    // Register built-in providers
    for (const provider of builtInProviders) {
      try {
        registerProvider(provider)
      } catch {
        // Already registered
      }
    }

    // Register built-in adapters
    for (const adapter of builtInAdapters) {
      try {
        registerProvider(adapter)
      } catch {
        // Already registered
      }
    }

    // Register custom providers if provided
    if (customProviders) {
      for (const provider of customProviders) {
        try {
          registerProvider(provider)
        } catch {
          // Already registered
        }
      }
    }

    // Load saved credentials
    const saved = storage.load()
    if (saved) {
      selectedProviderId.value = saved.providerId
      credentials.value = saved.credentials
      logger.debug('Loaded saved credentials for provider:', saved.providerId)
    } else {
      selectedProviderId.value = defaultProvider
    }

    initialized = true
  }

  // Computed values
  const providers = computed(() => getAllProviders())

  const selectedProvider = computed(() => getProvider(selectedProviderId.value))

  const isConfigured = computed(() => {
    const provider = selectedProvider.value
    if (!provider) return false

    const requiredFields = provider.fields.filter((f) => f.required)
    return requiredFields.every((field) => {
      const value = credentials.value[field.name]
      return value && value.trim().length > 0
    })
  })

  // Methods
  function selectProvider(providerId: string): void {
    if (getProvider(providerId)) {
      selectedProviderId.value = providerId
      credentials.value = {}
      logger.debug('Selected provider:', providerId)
    } else {
      logger.warn('Unknown provider:', providerId)
    }
  }

  function updateCredential(name: string, value: string): void {
    credentials.value = { ...credentials.value, [name]: value }
  }

  function saveCredentials(): void {
    if (!storage) return

    const data: StoredCredentials = {
      providerId: selectedProviderId.value,
      credentials: credentials.value,
      timestamp: Date.now(),
    }
    storage.save(data)
    logger.debug('Saved credentials for provider:', selectedProviderId.value)
  }

  function clearCredentials(): void {
    credentials.value = {}
    storage?.clear()
    logger.debug('Cleared credentials')
  }

  function getSipConfig(): SipCredentials | null {
    if (!isConfigured.value) return null

    const provider = selectedProvider.value
    if (!provider) return null

    return provider.mapCredentials(credentials.value)
  }

  return {
    providers,
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

/**
 * Reset singleton state for testing
 */
export function _resetForTesting(): void {
  initialized = false
  storage = null
  selectedProviderId.value = 'own-pbx'
  credentials.value = {}
  resetRegistry()
}
````

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/useProviderSelector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/useProviderSelector.ts tests/unit/providers/useProviderSelector.test.ts
git commit -m "feat(providers): add useProviderSelector headless composable"
```

---

## Task 12: Create Providers Module Index

**Files:**

- Modify: `src/providers/index.ts`
- Test: `tests/unit/providers/providerModule.index.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/providers/providerModule.index.test.ts`:

```typescript
/**
 * Providers Module Index Tests
 */
import { describe, it, expect } from 'vitest'
import {
  // Composable
  useProviderSelector,
  // Types
  type ProviderField,
  type ProviderConfig,
  type ProviderAdapter,
  type SipCredentials,
  type StorageType,
  type ProviderSelectorOptions,
  // Registry
  registerProvider,
  getProvider,
  getAllProviders,
  // Built-in providers
  builtInProviders,
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
  // Adapters
  builtInAdapters,
  twilioAdapter,
} from '../../../src/providers'

describe('Providers Module Index', () => {
  describe('exports', () => {
    it('should export useProviderSelector composable', () => {
      expect(useProviderSelector).toBeDefined()
      expect(typeof useProviderSelector).toBe('function')
    })

    it('should export registry functions', () => {
      expect(registerProvider).toBeDefined()
      expect(getProvider).toBeDefined()
      expect(getAllProviders).toBeDefined()
    })

    it('should export built-in providers', () => {
      expect(builtInProviders).toBeDefined()
      expect(ownPbxProvider).toBeDefined()
      expect(elks46Provider).toBeDefined()
      expect(telnyxProvider).toBeDefined()
      expect(voipmsProvider).toBeDefined()
    })

    it('should export adapters', () => {
      expect(builtInAdapters).toBeDefined()
      expect(twilioAdapter).toBeDefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/providers/providerModule.index.test.ts`
Expected: FAIL because current index.ts has different exports (Vue provide/inject providers)

**Step 3: Write implementation**

The existing `src/providers/index.ts` contains Vue provide/inject providers. We need to add the new provider selector exports alongside the existing ones.

Modify `src/providers/index.ts` to add new exports at the end:

```typescript
/**
 * Providers Module
 *
 * Vue provide/inject providers and multi-provider SIP login system.
 *
 * @module providers
 */

// ============================================================================
// Vue Provide/Inject Providers (existing exports - DO NOT REMOVE)
// ============================================================================
export { SipClientProvider, useSipClientContext } from './SipClientProvider'
export { ConfigProvider, useConfigContext } from './ConfigProvider'
export { MediaProvider, useMediaContext } from './MediaProvider'
export { OAuth2Provider, useOAuth2Context, type OAuth2ProviderProps } from './OAuth2Provider'

// ============================================================================
// Provider Selector System (new exports)
// ============================================================================

// Main composable
export { useProviderSelector, _resetForTesting } from './useProviderSelector'

// Types
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

// Registry
export {
  registerProvider,
  getProvider,
  getAllProviders,
  removeProvider,
  hasProvider,
  resetRegistry,
} from './providerRegistry'

// Storage
export { createCredentialStorage, type CredentialStorage } from './credentialStorage'

// Built-in provider configs
export {
  builtInProviders,
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
} from './configs'

// Provider adapters
export { builtInAdapters, twilioAdapter } from './adapters'
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/providers/providerModule.index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/providers/index.ts tests/unit/providers/providerModule.index.test.ts
git commit -m "feat(providers): export provider selector system from providers module"
```

---

## Task 13: Export from Main Library Index

**Files:**

- Modify: `src/index.ts`
- Test: `tests/unit/index.providerSelector.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/index.providerSelector.test.ts`:

```typescript
/**
 * Main Index Provider Selector Exports Tests
 */
import { describe, it, expect } from 'vitest'
import { useProviderSelector, registerProvider, builtInProviders } from '../../src/index'

describe('Main Index Provider Selector Exports', () => {
  it('should export useProviderSelector from main index', () => {
    expect(useProviderSelector).toBeDefined()
    expect(typeof useProviderSelector).toBe('function')
  })

  it('should export registerProvider from main index', () => {
    expect(registerProvider).toBeDefined()
    expect(typeof registerProvider).toBe('function')
  })

  it('should export builtInProviders from main index', () => {
    expect(builtInProviders).toBeDefined()
    expect(Array.isArray(builtInProviders)).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/index.providerSelector.test.ts`
Expected: FAIL because main index doesn't export provider selector

**Step 3: Modify src/index.ts**

Add these exports to `src/index.ts` in the Providers section:

```typescript
// Provider Selector System
export {
  useProviderSelector,
  registerProvider,
  getProvider,
  getAllProviders,
  builtInProviders,
  ownPbxProvider,
  elks46Provider,
  telnyxProvider,
  voipmsProvider,
  builtInAdapters,
  twilioAdapter,
  createCredentialStorage,
} from './providers'

export type {
  ProviderField,
  ProviderConfig,
  ProviderAdapter,
  SipCredentials as ProviderSipCredentials,
  StorageType as ProviderStorageType,
  ProviderSelectorOptions,
  CredentialStorage,
} from './providers'
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/index.providerSelector.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/index.ts tests/unit/index.providerSelector.test.ts
git commit -m "feat(providers): export provider selector from main library index"
```

---

## Task 14: Update Basic Softphone Template - Add ProviderSelector Component

**Files:**

- Create: `templates/basic-softphone/src/components/ProviderSelector.vue`

**Step 1: Create the component**

Create `templates/basic-softphone/src/components/ProviderSelector.vue`:

```vue
<script setup lang="ts">
/**
 * Provider Selector Component
 *
 * PrimeVue-styled provider picker for VueSIP demo templates.
 * Uses the headless useProviderSelector composable from core.
 */
import { computed } from 'vue'
import { useProviderSelector } from 'vuesip'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

const emit = defineEmits<{
  (e: 'select-hosted'): void
}>()

const props = defineProps<{
  showHostedLink?: boolean
}>()

const { providers, selectedProvider, selectProvider } = useProviderSelector()

// Format providers for PrimeVue dropdown
const providerOptions = computed(() =>
  providers.value.map((p) => ({
    label: p.name,
    value: p.id,
  }))
)

const selectedId = computed({
  get: () => selectedProvider.value?.id,
  set: (id) => {
    if (id) selectProvider(id)
  },
})

function handleHostedClick() {
  emit('select-hosted')
}
</script>

<template>
  <div class="provider-selector">
    <div class="provider-dropdown">
      <label for="provider-select" class="block text-sm font-medium mb-2"> SIP Provider </label>
      <Dropdown
        id="provider-select"
        v-model="selectedId"
        :options="providerOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select a provider"
        class="w-full"
      />
    </div>

    <div v-if="showHostedLink && selectedProvider?.id === 'own-pbx'" class="hosted-link mt-3">
      <Button link size="small" @click="handleHostedClick" class="p-0 text-sm">
        Or use a hosted provider →
      </Button>
    </div>
  </div>
</template>

<style scoped>
.provider-selector {
  margin-bottom: 1rem;
}

.hosted-link {
  text-align: center;
}
</style>
```

**Step 2: Commit**

```bash
git add templates/basic-softphone/src/components/ProviderSelector.vue
git commit -m "feat(templates): add ProviderSelector component for basic-softphone"
```

---

## Task 15: Update Basic Softphone Template - Add ProviderLoginForm Component

**Files:**

- Create: `templates/basic-softphone/src/components/ProviderLoginForm.vue`

**Step 1: Create the component**

Create `templates/basic-softphone/src/components/ProviderLoginForm.vue`:

```vue
<script setup lang="ts">
/**
 * Provider Login Form Component
 *
 * Dynamic form that renders fields based on selected provider.
 * Uses the headless useProviderSelector composable from core.
 */
import { computed } from 'vue'
import { useProviderSelector } from 'vuesip'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'

const emit = defineEmits<{
  (e: 'connect'): void
}>()

const {
  selectedProvider,
  credentials,
  isConfigured,
  updateCredential,
  saveCredentials,
  getSipConfig,
} = useProviderSelector()

// Get fields from selected provider
const fields = computed(() => selectedProvider.value?.fields || [])

function handleFieldInput(name: string, event: Event) {
  const target = event.target as HTMLInputElement
  updateCredential(name, target.value)
}

function handleConnect() {
  if (isConfigured.value) {
    saveCredentials()
    emit('connect')
  }
}

// Expose getSipConfig for parent components
defineExpose({ getSipConfig })
</script>

<template>
  <form @submit.prevent="handleConnect" class="provider-login-form">
    <div v-for="field in fields" :key="field.name" class="field mb-4">
      <label :for="field.name" class="block text-sm font-medium mb-2">
        {{ field.label }}
        <span v-if="field.required" class="text-red-500">*</span>
      </label>

      <!-- Password field -->
      <Password
        v-if="field.type === 'password'"
        :id="field.name"
        :modelValue="credentials[field.name] || ''"
        @update:modelValue="updateCredential(field.name, $event)"
        :placeholder="field.placeholder"
        :feedback="false"
        toggleMask
        class="w-full"
        inputClass="w-full"
      />

      <!-- Text field -->
      <InputText
        v-else
        :id="field.name"
        :value="credentials[field.name] || ''"
        @input="handleFieldInput(field.name, $event)"
        :placeholder="field.placeholder"
        class="w-full"
      />

      <!-- Help text -->
      <small v-if="field.helpText" class="block mt-1 text-gray-500">
        {{ field.helpText }}
        <a
          v-if="field.helpUrl"
          :href="field.helpUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:underline ml-1"
        >
          Learn more
        </a>
      </small>
    </div>

    <Button
      type="submit"
      :disabled="!isConfigured"
      class="w-full mt-4"
      label="Connect"
      icon="pi pi-sign-in"
    />
  </form>
</template>

<style scoped>
.provider-login-form {
  padding: 1rem 0;
}

.field {
  margin-bottom: 1.25rem;
}
</style>
```

**Step 2: Commit**

```bash
git add templates/basic-softphone/src/components/ProviderLoginForm.vue
git commit -m "feat(templates): add ProviderLoginForm component for basic-softphone"
```

---

## Task 16: Update Basic Softphone App.vue to Use Provider System

**Files:**

- Modify: `templates/basic-softphone/src/App.vue`

**Step 1: Update App.vue**

This task requires updating the existing App.vue to integrate the new provider components. The specific changes depend on the current structure, but the pattern is:

1. Import ProviderSelector and ProviderLoginForm
2. Replace hardcoded config form with provider components
3. Use getSipConfig() to get credentials for connection

```vue
<!-- Add to script setup -->
import ProviderSelector from './components/ProviderSelector.vue' import ProviderLoginForm from
'./components/ProviderLoginForm.vue' import { useProviderSelector } from 'vuesip' const {
getSipConfig, isConfigured } = useProviderSelector() // Modify connect function to use provider
config async function handleConnect() { const config = getSipConfig() if (config) { await
phone.configure({ uri: config.uri, sipUri: config.sipUri, password: config.password, displayName:
config.displayName, }) await phone.connectPhone() } }

<!-- Replace config form in template -->
<template>
  <div v-if="!isConnected" class="config-panel">
    <h2>Connect to SIP Server</h2>
    <ProviderSelector :show-hosted-link="true" />
    <ProviderLoginForm @connect="handleConnect" />
  </div>
</template>
```

**Step 2: Test manually**

Run: `cd templates/basic-softphone && pnpm dev`
Open http://localhost:3001 and verify:

- Provider dropdown shows all providers
- Selecting provider changes form fields
- Filling fields enables Connect button
- Credentials persist on page refresh

**Step 3: Commit**

```bash
git add templates/basic-softphone/src/App.vue
git commit -m "feat(templates): integrate provider selector into basic-softphone"
```

---

## Task 17: Add Provider Selector Documentation

**Files:**

- Create: `docs/guide/provider-selector.md`
- Modify: `docs/.vitepress/config.ts`

**Step 1: Create documentation**

Create `docs/guide/provider-selector.md`:

````markdown
# Provider Selector

The Provider Selector system provides a flexible way to connect VueSIP applications to different SIP providers. It includes built-in configurations for popular providers and makes it easy to add custom providers.

## Quick Start

```vue
<script setup>
import { useProviderSelector } from 'vuesip'

const {
  providers, // Available providers
  selectedProvider, // Currently selected
  credentials, // Form values
  isConfigured, // All required fields filled
  selectProvider, // Change provider
  updateCredential, // Update a field
  getSipConfig, // Get SIP config for connection
} = useProviderSelector()

async function connect() {
  const config = getSipConfig()
  if (config) {
    // Use with useSipClient
    await sipClient.connect(config)
  }
}
</script>
```
````

## Built-in Providers

### Own PBX (Default)

For self-hosted Asterisk, FreePBX, or any WebSocket-enabled SIP server.

### 46 elks

Swedish VoIP provider with direct WebRTC support.

- WebSocket: `wss://voip.46elks.com/w1/websocket`
- [Documentation](https://46elks.com/docs/webrtc-client-connect)

### Telnyx

Cloud communications platform.

- WebSocket: `wss://rtc.telnyx.com`
- [Documentation](https://developers.telnyx.com/docs/v2/webrtc)

### VoIP.ms

North American VoIP provider (requires WebRTC gateway).

### Twilio (Adapter)

SDK-based provider - requires additional setup.

## Adding Custom Providers

```typescript
import { registerProvider } from 'vuesip'

registerProvider({
  id: 'my-provider',
  name: 'My Provider',
  websocketUrl: 'wss://sip.myprovider.com/ws',
  fields: [
    { name: 'username', label: 'Username', type: 'text', required: true },
    { name: 'password', label: 'Password', type: 'password', required: true },
  ],
  mapCredentials: (input) => ({
    uri: 'wss://sip.myprovider.com/ws',
    sipUri: `sip:${input.username}@myprovider.com`,
    password: input.password,
  }),
})
```

## Storage Options

```typescript
// localStorage (default) - persists across sessions
useProviderSelector({ storage: 'local' })

// sessionStorage - cleared on browser close
useProviderSelector({ storage: 'session' })

// No storage - credentials never saved
useProviderSelector({ storage: 'none' })
```

## Bring Your Own UI

The `useProviderSelector` composable is headless - it provides state and logic without any UI. Build your own forms using the reactive state:

```vue
<template>
  <select v-model="selectedId" @change="selectProvider(selectedId)">
    <option v-for="p in providers" :key="p.id" :value="p.id">
      {{ p.name }}
    </option>
  </select>

  <div v-for="field in selectedProvider?.fields" :key="field.name">
    <label>{{ field.label }}</label>
    <input
      :type="field.type"
      :value="credentials[field.name]"
      @input="updateCredential(field.name, $event.target.value)"
    />
  </div>

  <button :disabled="!isConfigured" @click="connect">Connect</button>
</template>
```

## API Reference

See [useProviderSelector API](/api/composables#useproviderselector) for full documentation.

````

**Step 2: Update VitePress config**

Add to `docs/.vitepress/config.ts` in the Authentication section:

```typescript
{
  text: 'Authentication',
  collapsed: false,
  items: [
    { text: 'Provider Selector', link: '/guide/provider-selector' },
    { text: 'OAuth2 Authentication', link: '/guide/oauth2-authentication' },
  ],
},
````

**Step 3: Commit**

```bash
git add docs/guide/provider-selector.md docs/.vitepress/config.ts
git commit -m "docs: add Provider Selector guide"
```

---

## Task 18: Run Full Test Suite and Lint

**Step 1: Run tests**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit any fixes**

If any fixes were needed:

```bash
git add -A
git commit -m "fix: resolve lint and type errors"
```

---

## Task 19: Final Integration Test

**Step 1: Build the library**

Run: `pnpm build`
Expected: Build succeeds

**Step 2: Test basic-softphone template**

Run: `cd templates/basic-softphone && pnpm dev`
Manual test:

1. Select "46 elks" provider
2. Verify form shows phoneNumber and secret fields
3. Select "Own PBX" provider
4. Verify form shows websocketUrl, sipUri, password, displayName fields
5. Fill in credentials
6. Verify "Connect" button becomes enabled
7. Refresh page - verify credentials are restored

**Step 3: Commit completion**

```bash
git add -A
git commit -m "feat(providers): complete provider abstraction system implementation"
```

---

## Summary

This implementation plan creates:

1. **Core Types** (`src/providers/types.ts`) - Type definitions for the provider system
2. **Provider Registry** (`src/providers/providerRegistry.ts`) - Central provider management
3. **Credential Storage** (`src/providers/credentialStorage.ts`) - Configurable persistence
4. **Built-in Providers** (`src/providers/configs/`) - 4 config-only providers
5. **Twilio Adapter** (`src/providers/adapters/`) - Placeholder for SDK integration
6. **Headless Composable** (`src/providers/useProviderSelector.ts`) - Main API
7. **Template Components** - PrimeVue UI for demo templates
8. **Documentation** - Guide for users

Total: **19 tasks**, each following TDD with bite-sized steps.
