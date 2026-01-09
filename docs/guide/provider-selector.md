# Provider Selector

The Provider Selector system allows users to easily connect to different SIP providers with a unified interface. It abstracts away provider-specific configuration details while supporting custom providers and credential persistence.

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Built-in Providers](#built-in-providers)
- [Using useProviderSelector](#using-useproviderselector)
- [Creating Custom Providers](#creating-custom-providers)
- [Credential Storage](#credential-storage)
- [Template Component Usage](#template-component-usage)
- [Provider Adapters](#provider-adapters)
- [Provider Registry](#provider-registry)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

### What is the Provider Selector?

VueSip includes a multi-provider login system that simplifies connecting to various SIP services. Instead of manually configuring WebSocket URLs, SIP URIs, and authentication details for each provider, the Provider Selector:

- **Provides pre-configured settings** for popular SIP providers
- **Supports custom provider configurations** for self-hosted PBX systems
- **Persists credentials** across sessions using localStorage or sessionStorage
- **Offers headless composables** for building custom UI implementations
- **Validates required fields** before allowing connection

### Architecture

The Provider Selector system consists of several components:

```
Provider System
├── Provider Configs      # Pre-defined provider settings (46elks, Telnyx, etc.)
├── Provider Adapters     # Complex providers requiring custom logic (Twilio)
├── Provider Registry     # Central registration and lookup
├── Credential Storage    # Persistence layer (localStorage/sessionStorage)
└── useProviderSelector   # Vue composable for reactive state management
```

### Key Benefits

- **Simplified Configuration**: Users select a provider and enter minimal credentials
- **Provider Flexibility**: Supports both simple config-based and complex adapter-based providers
- **Credential Persistence**: Automatically saves and restores user credentials
- **Type Safety**: Full TypeScript support with strongly-typed configurations
- **Extensibility**: Register custom providers without modifying library code

---

## Getting Started

### Basic Usage

The fastest way to implement provider selection is with the `useProviderSelector` composable:

```vue
<script setup lang="ts">
import { useProviderSelector } from 'vuesip'

const {
  providers, // All available providers
  selectedProvider, // Currently selected provider
  credentials, // Credential values keyed by field name
  isConfigured, // Whether all required fields are filled
  selectProvider, // Select a provider by ID
  updateCredential, // Update a credential field
  saveCredentials, // Save to storage
  clearCredentials, // Clear stored credentials
  getSipConfig, // Get SIP config for useSipClient
} = useProviderSelector({
  storage: 'local', // 'local' | 'session' | 'none'
  defaultProvider: 'own-pbx',
})
</script>
```

### Integration with useSipClient

Connect the provider selector to VueSip's SIP client:

```vue
<script setup lang="ts">
import { useProviderSelector, useSipClient } from 'vuesip'

const { isConfigured, getSipConfig, saveCredentials } = useProviderSelector()

async function handleConnect() {
  if (!isConfigured.value) {
    console.error('Please fill in all required fields')
    return
  }

  // Save credentials before connecting
  saveCredentials()

  // Get SIP config from provider
  const sipConfig = getSipConfig()
  if (!sipConfig) return

  // Use with useSipClient
  const { connect } = useSipClient({
    uri: sipConfig.uri,
    sipUri: sipConfig.sipUri,
    password: sipConfig.password,
    displayName: sipConfig.displayName,
  })

  await connect()
}
</script>
```

---

## Built-in Providers

VueSip includes pre-configured settings for several popular SIP providers. Each provider defines the required credential fields and handles the transformation to SIP configuration.

### Own PBX (Default)

Generic SIP configuration for self-hosted PBX systems like Asterisk, FreePBX, or any SIP-compliant server.

**Provider ID**: `own-pbx`

**Required Fields**:

- WebSocket URL (e.g., `wss://pbx.example.com:8089/ws`)
- SIP URI (e.g., `sip:1000@pbx.example.com`)
- Password

**Optional Fields**:

- Display Name

**When to use**: You have your own PBX server with WebSocket support enabled.

```typescript
// Example credentials
{
  websocketUrl: 'wss://pbx.example.com:8089/ws',
  sipUri: 'sip:1000@pbx.example.com',
  password: 'secret123',
  displayName: 'John Doe'
}
```

### 46 elks

Swedish VoIP provider with native WebRTC support.

**Provider ID**: `46elks`

**Required Fields**:

- Phone Number (Swedish format without + prefix, e.g., `46700000000`)
- Secret (from API: `GET /a1/numbers/{number}`)

**WebSocket URL**: `wss://voip.46elks.com/w1/websocket` (pre-configured)

**Documentation**: [46elks WebRTC Client Connect](https://46elks.com/docs/webrtc-client-connect)

```typescript
// Example credentials
{
  phoneNumber: '46700000000',
  secret: 'your-secret-from-api'
}
```

### Telnyx

Cloud communications platform with WebRTC gateway.

**Provider ID**: `telnyx`

**Required Fields**:

- SIP Username (from SIP Connection credentials)
- SIP Password

**WebSocket URL**: `wss://rtc.telnyx.com` (pre-configured)

**Documentation**: [Telnyx WebRTC](https://developers.telnyx.com/docs/voice/webrtc)

```typescript
// Example credentials
{
  username: 'your-sip-username',
  password: 'your-sip-password'
}
```

### VoIP.ms

Wholesale VoIP provider that requires a WebRTC gateway.

**Provider ID**: `voipms`

**Required Fields**:

- WebSocket Gateway URL (user-provided)
- Main Account (VoIP.ms username)
- SIP Password

**Documentation**: [VoIP.ms Settings](https://voip.ms/m/settings.php)

**Note**: VoIP.ms does not provide a native WebRTC gateway. Users must set up their own gateway (Asterisk, FreeSWITCH, or commercial WebRTC-to-SIP service).

```typescript
// Example credentials
{
  websocketUrl: 'wss://your-gateway.example.com/ws',
  username: 'your-voipms-account',
  password: 'your-sip-password'
}
```

---

## Using useProviderSelector

The `useProviderSelector` composable provides reactive state management for provider selection and credential handling.

### Options

```typescript
interface ProviderSelectorOptions {
  /** Storage type for credentials (default: 'local') */
  storage?: 'local' | 'session' | 'none'

  /** Default provider ID (default: 'own-pbx') */
  defaultProvider?: string

  /** Override or extend built-in providers */
  providers?: ProviderConfig[]
}
```

### Return Values

#### Reactive State

- **`providers`**: `ComputedRef<ProviderConfig[]>` - All available providers (built-in + custom)
- **`selectedProvider`**: `Ref<ProviderConfig | null>` - Currently selected provider
- **`credentials`**: `Record<string, string>` - Reactive object with credential values
- **`isConfigured`**: `ComputedRef<boolean>` - True when all required fields are filled

#### Methods

- **`selectProvider(providerId: string)`**: Select a provider by ID, resets credentials
- **`updateCredential(field: string, value: string)`**: Update a specific credential field
- **`saveCredentials()`**: Save current credentials to storage
- **`clearCredentials()`**: Clear stored credentials and reset values
- **`getSipConfig()`**: Get SIP configuration using provider's `mapCredentials` function

### Complete Example

```vue
<template>
  <div class="provider-login">
    <!-- Provider Dropdown -->
    <div class="field">
      <label>Provider</label>
      <select v-model="selectedProviderId" @change="handleProviderChange">
        <option v-for="provider in providers" :key="provider.id" :value="provider.id">
          {{ provider.name }}
        </option>
      </select>
    </div>

    <!-- Dynamic Credential Fields -->
    <template v-if="selectedProvider">
      <div v-for="field in selectedProvider.fields" :key="field.name" class="field">
        <label :for="field.name">
          {{ field.label }}
          <span v-if="field.required" class="required">*</span>
        </label>

        <input
          :id="field.name"
          :type="field.type === 'password' ? 'password' : 'text'"
          :value="credentials[field.name]"
          :placeholder="field.placeholder"
          @input="(e) => updateCredential(field.name, (e.target as HTMLInputElement).value)"
        />

        <small v-if="field.helpText" class="help">
          {{ field.helpText }}
          <a v-if="field.helpUrl" :href="field.helpUrl" target="_blank"> Learn more </a>
        </small>
      </div>
    </template>

    <!-- Connect Button -->
    <button @click="handleConnect" :disabled="!isConfigured || isConnecting">
      {{ isConnecting ? 'Connecting...' : 'Connect' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProviderSelector, useSipClient } from 'vuesip'

const {
  providers,
  selectedProvider,
  credentials,
  isConfigured,
  selectProvider,
  updateCredential,
  saveCredentials,
  getSipConfig,
} = useProviderSelector({
  storage: 'local',
  defaultProvider: 'own-pbx',
})

// Track selected provider ID for v-model
const selectedProviderId = computed({
  get: () => selectedProvider.value?.id ?? '',
  set: (id: string) => selectProvider(id),
})

// Connection state
const isConnecting = ref(false)

function handleProviderChange() {
  // Credentials are automatically reset when provider changes
}

async function handleConnect() {
  if (!isConfigured.value) return

  isConnecting.value = true

  try {
    // Save credentials for next session
    saveCredentials()

    // Get SIP configuration
    const sipConfig = getSipConfig()
    if (!sipConfig) {
      throw new Error('Failed to generate SIP configuration')
    }

    // Connect using useSipClient
    const { connect } = useSipClient({
      uri: sipConfig.uri,
      sipUri: sipConfig.sipUri,
      password: sipConfig.password,
      displayName: sipConfig.displayName,
    })

    await connect()
  } catch (error) {
    console.error('Connection failed:', error)
  } finally {
    isConnecting.value = false
  }
}
</script>
```

---

## Creating Custom Providers

You can create custom providers for any SIP service by defining a `ProviderConfig` object.

### Provider Configuration Structure

```typescript
interface ProviderConfig {
  /** Unique identifier (e.g., 'my-provider') */
  id: string

  /** Display name (e.g., 'My Custom Provider') */
  name: string

  /** Provider logo URL or data URI (optional) */
  logo?: string

  /** Default WebSocket URL (can be empty if user provides) */
  websocketUrl: string

  /** Form fields for this provider */
  fields: ProviderField[]

  /** Transform user input to SIP credentials */
  mapCredentials: (input: Record<string, string>) => SipCredentials
}

interface ProviderField {
  /** Field identifier (e.g., 'username', 'password') */
  name: string

  /** Display label */
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
  options?: Array<{ label: string; value: string }>
}
```

### Creating a Custom Provider

```typescript
import type { ProviderConfig } from 'vuesip'

const myProvider: ProviderConfig = {
  id: 'my-provider',
  name: 'My Custom Provider',
  websocketUrl: 'wss://sip.my-provider.com/ws',
  fields: [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      placeholder: 'Enter your username',
      required: true,
      helpText: 'Your account username',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      required: true,
    },
    {
      name: 'region',
      label: 'Region',
      type: 'select',
      required: true,
      options: [
        { label: 'US East', value: 'us-east' },
        { label: 'US West', value: 'us-west' },
        { label: 'Europe', value: 'eu' },
      ],
    },
  ],
  mapCredentials: (input) => ({
    uri: `wss://${input.region}.my-provider.com/ws`,
    sipUri: `sip:${input.username}@my-provider.com`,
    password: input.password ?? '',
    displayName: input.username,
  }),
}
```

### Using Custom Providers

Pass custom providers to `useProviderSelector`:

```typescript
import { useProviderSelector } from 'vuesip'

const { providers, selectProvider } = useProviderSelector({
  providers: [myProvider], // Adds to built-in providers
  defaultProvider: 'my-provider',
})

// Custom providers override built-in ones with the same ID
```

### Provider Registration

For global provider registration (accessible across your entire application):

```typescript
import { registerProvider, getAllProviders } from 'vuesip'

// Register a provider globally
registerProvider(myProvider)

// Force overwrite existing provider
registerProvider(myProvider, { force: true })

// Get all registered providers
const allProviders = getAllProviders()

// Remove a provider
import { removeProvider } from 'vuesip'
removeProvider('my-provider')
```

---

## Credential Storage

The Provider Selector supports three storage options for credential persistence.

### Storage Types

| Type        | Description            | Use Case                           |
| ----------- | ---------------------- | ---------------------------------- |
| `'local'`   | localStorage (default) | Persistent across browser sessions |
| `'session'` | sessionStorage         | Cleared when tab closes            |
| `'none'`    | No persistence         | Security-sensitive environments    |

### Configuration

```typescript
const { saveCredentials, clearCredentials } = useProviderSelector({
  storage: 'local', // 'local' | 'session' | 'none'
})
```

### Storage Key

Credentials are stored under the key `vuesip_credentials` by default. The stored data structure:

```typescript
interface StoredCredentials {
  providerId: string
  values: Record<string, string>
  storedAt: number // Timestamp
}
```

### Custom Storage Key

For advanced use cases, create a custom credential storage:

```typescript
import { createCredentialStorage } from 'vuesip'

const storage = createCredentialStorage('local', {
  key: 'my_app_sip_credentials', // Custom storage key
})

// Manual storage operations
storage.save({
  providerId: 'own-pbx',
  values: { websocketUrl: '...', sipUri: '...', password: '...' },
  storedAt: Date.now(),
})

const credentials = storage.load()
storage.clear()
```

### Security Considerations

- **Never store sensitive credentials in `'local'` storage** for production applications handling sensitive data
- Use `'session'` storage for single-session applications
- Use `'none'` for high-security environments where credentials should never be persisted
- Consider encrypting credentials before storage in security-critical applications

---

## Template Component Usage

VueSip's starter templates include a complete provider selector implementation. The [Basic Softphone template](/guide/templates.html#basic-softphone-template) demonstrates full provider integration.

### Example from Basic Softphone

```vue
<template>
  <div class="config-panel">
    <!-- Provider Selector Dropdown -->
    <div class="form-field">
      <label for="provider">Provider</label>
      <Dropdown
        id="provider"
        :model-value="selectedProvider"
        :options="providers"
        option-label="name"
        placeholder="Select a provider"
        @update:model-value="handleProviderChange"
      />
    </div>

    <!-- Dynamic Provider Login Form -->
    <template v-if="selectedProvider">
      <div v-for="field in selectedProvider.fields" :key="field.name" class="form-field">
        <label :for="field.name">{{ field.label }}</label>

        <!-- Select Fields -->
        <Dropdown
          v-if="field.type === 'select' && field.options"
          :id="field.name"
          :model-value="credentials[field.name]"
          :options="field.options"
          option-label="label"
          option-value="value"
          :placeholder="field.placeholder"
          @update:model-value="(val) => updateCredential(field.name, val ?? '')"
        />

        <!-- Text/Password Fields -->
        <InputText
          v-else
          :id="field.name"
          :model-value="credentials[field.name]"
          :type="field.type === 'password' ? 'password' : 'text'"
          :placeholder="field.placeholder"
          @update:model-value="(val) => updateCredential(field.name, val ?? '')"
        />

        <!-- Help Text -->
        <small v-if="field.helpText" class="help-text">
          {{ field.helpText }}
          <a v-if="field.helpUrl" :href="field.helpUrl" target="_blank"> Learn more </a>
        </small>
      </div>
    </template>

    <Button type="submit" label="Connect" :disabled="!isConfigured" @click="handleConnect" />
  </div>
</template>

<script setup lang="ts">
import { useProviderSelector } from 'vuesip'
import type { ProviderConfig } from 'vuesip'

const {
  providers,
  selectedProvider,
  credentials,
  isConfigured,
  selectProvider,
  updateCredential,
  saveCredentials,
  getSipConfig,
} = useProviderSelector({
  storage: 'local',
  defaultProvider: 'own-pbx',
})

function handleProviderChange(provider: ProviderConfig) {
  selectProvider(provider.id)
}

async function handleConnect() {
  saveCredentials()
  const sipConfig = getSipConfig()
  // Use sipConfig with your phone implementation
}
</script>
```

---

## Provider Adapters

For complex providers that require custom connection logic (like Twilio), VueSip supports provider adapters.

### Adapter vs Config

| Feature           | ProviderConfig         | ProviderAdapter             |
| ----------------- | ---------------------- | --------------------------- |
| Connection method | Standard SIP WebSocket | Custom logic                |
| SDK requirement   | None                   | May require provider SDK    |
| Use case          | Most SIP providers     | Twilio, proprietary systems |

### Adapter Interface

```typescript
interface ProviderAdapter extends ProviderConfig {
  /** Override connection behavior */
  connect?: (credentials: SipCredentials, sipClient: SipClient) => Promise<void>

  /** OAuth flow support */
  oauth?: OAuthConfig
}
```

### Twilio Adapter (Placeholder)

VueSip includes a placeholder Twilio adapter. Full Twilio integration requires their proprietary SDK:

```typescript
import { twilioAdapter } from 'vuesip'

// The adapter is available but throws an error on connection
// Full implementation requires @twilio/voice-sdk
```

**Implementing Twilio**:

1. Install Twilio Voice SDK: `npm install @twilio/voice-sdk`
2. Create a server endpoint for token generation
3. Configure a TwiML application
4. Override the adapter's `connect` method

---

## Provider Registry

The provider registry allows global registration of providers.

### Registry Functions

```typescript
import {
  registerProvider,
  getProvider,
  getAllProviders,
  removeProvider,
  resetRegistry,
} from 'vuesip'

// Register a new provider
registerProvider(myProvider)

// Register with force overwrite
registerProvider(myProvider, { force: true })

// Get a specific provider
const provider = getProvider('my-provider')

// Get all registered providers
const all = getAllProviders()

// Remove a provider
const removed = removeProvider('my-provider') // returns boolean

// Reset registry (useful for testing)
resetRegistry()
```

### Built-in Provider Access

```typescript
import {
  builtInProviders, // Array of all built-in providers
  ownPbxProvider, // Own PBX configuration
  elks46Provider, // 46 elks configuration
  telnyxProvider, // Telnyx configuration
  voipmsProvider, // VoIP.ms configuration
} from 'vuesip'
```

---

## API Reference

### useProviderSelector

```typescript
function useProviderSelector(options?: ProviderSelectorOptions): UseProviderSelectorReturn
```

#### Options

| Property          | Type                             | Default     | Description             |
| ----------------- | -------------------------------- | ----------- | ----------------------- |
| `storage`         | `'local' \| 'session' \| 'none'` | `'local'`   | Credential storage type |
| `defaultProvider` | `string`                         | `'own-pbx'` | Default provider ID     |
| `providers`       | `ProviderConfig[]`               | `[]`        | Custom providers to add |

#### Return Value

| Property           | Type                                     | Description                |
| ------------------ | ---------------------------------------- | -------------------------- |
| `providers`        | `ComputedRef<ProviderConfig[]>`          | All available providers    |
| `selectedProvider` | `Ref<ProviderConfig \| null>`            | Current provider           |
| `credentials`      | `Record<string, string>`                 | Credential values          |
| `isConfigured`     | `ComputedRef<boolean>`                   | All required fields filled |
| `selectProvider`   | `(id: string) => void`                   | Select provider by ID      |
| `updateCredential` | `(field: string, value: string) => void` | Update credential          |
| `saveCredentials`  | `() => void`                             | Save to storage            |
| `clearCredentials` | `() => void`                             | Clear and reset            |
| `getSipConfig`     | `() => SipCredentials \| null`           | Get SIP configuration      |

### Types

```typescript
// Credential output from getSipConfig()
interface SipCredentials {
  uri: string // WebSocket URL
  sipUri: string // SIP URI (sip:user@domain)
  password: string // SIP password
  displayName?: string // Caller ID display name
}

// Provider configuration
interface ProviderConfig {
  id: string
  name: string
  logo?: string
  websocketUrl: string
  fields: ProviderField[]
  mapCredentials: (input: Record<string, string>) => SipCredentials
}

// Form field definition
interface ProviderField {
  name: string
  label: string
  type: 'text' | 'password' | 'select'
  placeholder?: string
  required?: boolean
  helpText?: string
  helpUrl?: string
  options?: SelectOption[]
}

// Select field option
interface SelectOption {
  label: string
  value: string
}

// Stored credential data
interface StoredCredentials {
  providerId: string
  values: Record<string, string>
  storedAt: number
}
```

---

## Best Practices

### 1. Always Validate Before Connecting

```typescript
async function handleConnect() {
  if (!isConfigured.value) {
    showError('Please fill in all required fields')
    return
  }

  const sipConfig = getSipConfig()
  if (!sipConfig) {
    showError('Invalid configuration')
    return
  }

  await connect(sipConfig)
}
```

### 2. Save Credentials on Successful Connection

```typescript
async function handleConnect() {
  try {
    await connect(getSipConfig())
    // Only save after successful connection
    saveCredentials()
  } catch (error) {
    // Don't save invalid credentials
    console.error('Connection failed:', error)
  }
}
```

### 3. Clear Credentials on Logout

```typescript
async function handleLogout() {
  await disconnect()
  clearCredentials()
}
```

### 4. Handle Provider Changes Gracefully

```typescript
function handleProviderChange(provider: ProviderConfig) {
  // Credentials are automatically cleared
  selectProvider(provider.id)

  // Optional: Show provider-specific help
  if (provider.id === '46elks') {
    showHelp('You can find your secret in the 46elks API')
  }
}
```

### 5. Use Appropriate Storage Type

```typescript
// Production with remember-me feature
useProviderSelector({ storage: 'local' })

// Security-sensitive application
useProviderSelector({ storage: 'none' })

// Single-session application
useProviderSelector({ storage: 'session' })
```

---

## Troubleshooting

### Provider Not Found

**Problem**: `selectProvider()` does nothing when called

**Solution**: Verify the provider ID exists:

```typescript
const { providers } = useProviderSelector()
console.log(
  'Available providers:',
  providers.value.map((p) => p.id)
)
// Check if your provider ID is in the list
```

### Credentials Not Persisting

**Problem**: Credentials are lost on page refresh

**Solutions**:

1. Ensure storage is not set to `'none'`:

   ```typescript
   useProviderSelector({ storage: 'local' })
   ```

2. Call `saveCredentials()` before the page unloads:

   ```typescript
   saveCredentials()
   ```

3. Check if localStorage is available:
   ```typescript
   try {
     localStorage.setItem('test', 'test')
     localStorage.removeItem('test')
   } catch (e) {
     console.error('localStorage not available')
   }
   ```

### getSipConfig Returns Null

**Problem**: `getSipConfig()` returns null despite filled credentials

**Solutions**:

1. Verify a provider is selected:

   ```typescript
   if (!selectedProvider.value) {
     console.error('No provider selected')
   }
   ```

2. Check that all required fields are filled:
   ```typescript
   console.log('isConfigured:', isConfigured.value)
   console.log('credentials:', credentials)
   ```

### Custom Provider Not Working

**Problem**: Custom provider's credentials aren't being transformed correctly

**Solution**: Debug your `mapCredentials` function:

```typescript
const myProvider: ProviderConfig = {
  // ...
  mapCredentials: (input) => {
    console.log('Input:', input)
    const result = {
      uri: input.websocketUrl,
      sipUri: `sip:${input.username}@example.com`,
      password: input.password,
    }
    console.log('Output:', result)
    return result
  },
}
```

---

## Related Documentation

- [Getting Started](/guide/getting-started) - VueSip basics
- [Making Calls](/guide/making-calls) - Using SIP configuration for calls
- [Templates](/guide/templates) - Starter templates with provider selector
- [Security](/guide/security) - Security best practices for credential handling
