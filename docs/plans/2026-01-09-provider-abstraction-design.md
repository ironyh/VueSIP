# Provider Abstraction System - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design.

**Goal:** Create a multi-provider login system for VueSIP demos that's easy to get started with and easy to extend with new providers.

**Date:** 2026-01-09

---

## Design Decisions

| Decision           | Choice                        | Rationale                                          |
| ------------------ | ----------------------------- | -------------------------------------------------- |
| Primary Goal       | Easy to start, easy to extend | Hybrid approach - works out of box, extensible     |
| Entry Point        | Smart defaults                | Own PBX shown first, "Use hosted provider" link    |
| Extensibility      | Layered (Config + Adapters)   | Config-only for simple, adapters for complex       |
| Providers Included | 5 providers                   | Own PBX, 46 elks, Telnyx, VoIP.ms, Twilio          |
| Location           | Core library                  | `src/providers/` - easy to extract later           |
| Storage            | Configurable                  | localStorage default, session/none options         |
| UI Approach        | Headless + PrimeVue demos     | Composable in core, styled components in templates |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     VueSIP Core Library                      │
├─────────────────────────────────────────────────────────────┤
│  src/providers/                                              │
│  ├── index.ts              # Public exports                  │
│  ├── types.ts              # Interfaces & types              │
│  ├── useProviderSelector.ts # Headless composable           │
│  ├── providerRegistry.ts   # Provider registration          │
│  ├── storage.ts            # Credential persistence         │
│  │                                                          │
│  ├── configs/              # Config-only providers          │
│  │   ├── own-pbx.ts        # Generic SIP (default)          │
│  │   ├── 46elks.ts                                          │
│  │   ├── telnyx.ts                                          │
│  │   └── voipms.ts                                          │
│  │                                                          │
│  └── adapters/             # Full adapter overrides         │
│      └── twilio.ts         # SDK-based provider             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Demo Templates                            │
├─────────────────────────────────────────────────────────────┤
│  templates/basic-softphone/src/components/                   │
│  ├── ProviderSelector.vue   # PrimeVue dropdown + link      │
│  └── ProviderLoginForm.vue  # Dynamic form based on provider│
│                                                              │
│  (Same pattern in call-center template)                      │
└─────────────────────────────────────────────────────────────┘
```

**Key Principle**: Core provides the brain (composable + providers), templates provide the face (PrimeVue UI).

---

## Core Types & Interfaces

```typescript
// src/providers/types.ts

/** Field definition for provider login forms */
export interface ProviderField {
  name: string // e.g., 'username', 'password', 'domain'
  label: string // e.g., 'SIP Username'
  type: 'text' | 'password' | 'select'
  placeholder?: string
  required?: boolean
  helpText?: string // e.g., 'Found in your 46elks dashboard'
  helpUrl?: string // Link to provider docs
}

/** Config-only provider definition (simple providers) */
export interface ProviderConfig {
  id: string // e.g., '46elks'
  name: string // e.g., '46 elks'
  logo?: string // URL or data URI
  websocketUrl: string // e.g., 'wss://voip.46elks.com/w1/websocket'
  fields: ProviderField[]
  // Transform user input to SIP config
  mapCredentials: (input: Record<string, string>) => SipCredentials
}

/** Full adapter interface (complex providers like Twilio) */
export interface ProviderAdapter extends ProviderConfig {
  // Override connection behavior if needed
  connect?: (credentials: SipCredentials, sipClient: SipClient) => Promise<void>
  // OAuth flow support
  oauth?: {
    authUrl: string
    tokenUrl: string
    clientId: string
    scopes: string[]
  }
}

/** What gets passed to useSipClient */
export interface SipCredentials {
  uri: string // WebSocket URL
  sipUri: string // sip:user@domain
  password: string
  displayName?: string
}

/** Storage options for credentials */
export type StorageType = 'local' | 'session' | 'none'

/** Composable options */
export interface ProviderSelectorOptions {
  storage?: StorageType // Default: 'local'
  defaultProvider?: string // Default: 'own-pbx'
  providers?: ProviderConfig[] // Override built-in providers
}
```

---

## Composable API

```typescript
// Usage in templates
const {
  // State
  providers, // Available providers
  selectedProvider, // Currently selected provider
  credentials, // Current credential values
  isConfigured, // Has valid saved credentials

  // Actions
  selectProvider, // Change provider
  updateCredential, // Update a field value
  saveCredentials, // Persist to storage
  clearCredentials, // Clear saved credentials

  // Integration
  getSipConfig, // Get config for useSipClient
} = useProviderSelector({
  storage: 'local',
  defaultProvider: 'own-pbx',
})
```

---

## Provider Configurations

### 1. Own PBX (Generic SIP) - Default

```typescript
{
  id: 'own-pbx',
  name: 'Own PBX (Asterisk/FreePBX)',
  websocketUrl: '', // User provides
  fields: [
    { name: 'websocketUrl', label: 'WebSocket URL', type: 'text',
      placeholder: 'wss://pbx.example.com:8089/ws', required: true },
    { name: 'sipUri', label: 'SIP URI', type: 'text',
      placeholder: 'sip:1000@pbx.example.com', required: true },
    { name: 'password', label: 'Password', type: 'password', required: true },
    { name: 'displayName', label: 'Display Name', type: 'text' }
  ]
}
```

### 2. 46 elks

```typescript
{
  id: '46elks',
  name: '46 elks',
  websocketUrl: 'wss://voip.46elks.com/w1/websocket',
  fields: [
    { name: 'phoneNumber', label: 'Phone Number', type: 'text',
      placeholder: '46700000000', required: true,
      helpText: 'Your 46elks number without +' },
    { name: 'secret', label: 'Secret', type: 'password', required: true,
      helpText: 'From API: GET /a1/numbers/{number}',
      helpUrl: 'https://46elks.com/docs/webrtc-client-connect' }
  ],
  mapCredentials: (input) => ({
    uri: 'wss://voip.46elks.com/w1/websocket',
    sipUri: `sip:${input.phoneNumber}@voip.46elks.com`,
    password: input.secret
  })
}
```

### 3. Telnyx

```typescript
{
  id: 'telnyx',
  name: 'Telnyx',
  websocketUrl: 'wss://rtc.telnyx.com',
  fields: [
    { name: 'username', label: 'SIP Username', type: 'text', required: true,
      helpText: 'From your SIP Connection credentials' },
    { name: 'password', label: 'SIP Password', type: 'password', required: true,
      helpUrl: 'https://portal.telnyx.com/#/app/sip-trunks' }
  ],
  mapCredentials: (input) => ({
    uri: 'wss://rtc.telnyx.com',
    sipUri: `sip:${input.username}@sip.telnyx.com`,
    password: input.password
  })
}
```

### 4. VoIP.ms

```typescript
{
  id: 'voipms',
  name: 'VoIP.ms',
  websocketUrl: '', // Requires gateway - user provides
  fields: [
    { name: 'websocketUrl', label: 'WebSocket Gateway URL', type: 'text',
      required: true, helpText: 'VoIP.ms requires a WebRTC gateway' },
    { name: 'username', label: 'Main Account', type: 'text', required: true },
    { name: 'password', label: 'SIP Password', type: 'password', required: true,
      helpUrl: 'https://voip.ms/m/settings.php' }
  ]
}
```

### 5. Twilio (Adapter)

```typescript
// Requires full adapter due to SDK-based approach
{
  id: 'twilio',
  name: 'Twilio',
  websocketUrl: '', // Not used - SDK handles connection
  fields: [
    { name: 'accountSid', label: 'Account SID', type: 'text', required: true },
    { name: 'authToken', label: 'Auth Token', type: 'password', required: true },
    { name: 'twimlAppSid', label: 'TwiML App SID', type: 'text', required: true,
      helpUrl: 'https://console.twilio.com/us1/develop/voice/twiml-apps' }
  ],
  // Custom connect function using Twilio SDK
  connect: async (credentials, sipClient) => {
    // Twilio-specific connection logic
  }
}
```

---

## UI Flow (Demo Templates)

### Default View (Own PBX)

```
┌─────────────────────────────────────┐
│     Connect to SIP Server           │
├─────────────────────────────────────┤
│                                     │
│  WebSocket URL:  [_____________]    │
│  SIP URI:        [_____________]    │
│  Password:       [_____________]    │
│  Display Name:   [_____________]    │
│                                     │
│  [        Connect         ]         │
│                                     │
│  Or use a hosted provider →         │
│                                     │
└─────────────────────────────────────┘
```

### Provider Selection (Expanded)

```
┌─────────────────────────────────────┐
│     Select Provider                 │
├─────────────────────────────────────┤
│  ○ Own PBX (Asterisk/FreePBX)       │
│  ○ 46 elks                          │
│  ○ Telnyx                           │
│  ○ VoIP.ms                          │
│  ○ Twilio                           │
├─────────────────────────────────────┤
│  [Dynamic form based on selection]  │
└─────────────────────────────────────┘
```

---

## File Structure

```
src/providers/
├── index.ts                 # Public exports
├── types.ts                 # All type definitions
├── useProviderSelector.ts   # Main composable
├── providerRegistry.ts      # Register/get providers
├── storage.ts               # localStorage/sessionStorage handling
├── configs/
│   ├── index.ts             # Export all configs
│   ├── own-pbx.ts
│   ├── 46elks.ts
│   ├── telnyx.ts
│   └── voipms.ts
└── adapters/
    ├── index.ts             # Export all adapters
    └── twilio.ts

templates/basic-softphone/src/
├── components/
│   ├── ProviderSelector.vue    # NEW: Provider picker UI
│   ├── ProviderLoginForm.vue   # NEW: Dynamic login form
│   └── ... existing components
└── App.vue                     # Updated to use provider system

templates/call-center/src/
└── ... same pattern
```

---

## Success Criteria

1. **Easy to start**: Open demo, select provider, enter credentials, make calls
2. **Easy to extend**: Add new provider with single config file
3. **Well documented**: "Bring your own UI" guide with examples
4. **Backwards compatible**: Existing useSipClient API unchanged
5. **Type-safe**: Full TypeScript support with intellisense
