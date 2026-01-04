# VueSIP Adapter System

The adapter system provides a unified interface for working with different SIP libraries. This allows VueSIP to support multiple SIP implementations while maintaining a consistent API for your application code.

## Table of Contents

- [Overview](#overview)
- [Supported Libraries](#supported-libraries)
- [Quick Start](#quick-start)
- [Adapter Factory](#adapter-factory)
- [JsSIP Adapter](#jssip-adapter)
- [SIP.js Adapter](#sipjs-adapter)
- [Custom Adapters](#custom-adapters)
- [Feature Comparison](#feature-comparison)
- [Error Handling](#error-handling)
- [Events](#events)
- [API Reference](#api-reference)

## Overview

The adapter pattern abstracts the underlying SIP library implementation, providing:

- **Library-agnostic API**: Switch between JsSIP and SIP.js without changing your application code
- **Runtime library selection**: Choose the SIP library at runtime
- **Type safety**: Full TypeScript support with comprehensive type definitions
- **Consistent events**: Standardized event model across all adapters
- **Dynamic loading**: Code splitting support for optimized bundle sizes

## Supported Libraries

| Library | Status    | Call Support | Presence | Notes                              |
| ------- | --------- | ------------ | -------- | ---------------------------------- |
| JsSIP   | Stable    | Full         | No       | Recommended for most use cases     |
| SIP.js  | Stub      | Planned      | Planned  | Requires additional implementation |
| Custom  | Supported | Varies       | Varies   | Implement your own adapter         |

## Quick Start

### Using the Factory (Recommended)

```typescript
import { createSipAdapter } from '@/adapters/AdapterFactory'

// Create adapter with JsSIP (default)
const adapter = await createSipAdapter({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:user@example.com',
  password: 'your-password',
  displayName: 'John Doe',
})

// Connect and register
await adapter.connect()
await adapter.register()

// Make a call
const session = await adapter.call('sip:bob@example.com', {
  mediaConstraints: { audio: true, video: false },
})

// Clean up when done
await adapter.destroy()
```

### Using with Vue Composable

```typescript
import { useSipClient } from '@/composables/useSipClient'

const { connect, register, call, isConnected, isRegistered } = useSipClient({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:user@example.com',
  password: 'your-password',
})

// The composable handles adapter creation internally
await connect()
await register()
```

## Adapter Factory

The `AdapterFactory` class provides methods for creating and managing adapters.

### Creating Adapters

```typescript
import { AdapterFactory } from '@/adapters/AdapterFactory'

// Create with explicit library selection
const adapter = await AdapterFactory.createAdapter(sipConfig, { library: 'jssip' })

// Pass library-specific options
const adapter = await AdapterFactory.createAdapter(sipConfig, {
  library: 'jssip',
  libraryOptions: {
    debug: true,
    connectionRecoveryMinInterval: 2,
  },
})
```

### Checking Library Availability

```typescript
// Check if a specific library is available
const hasJsSip = await AdapterFactory.isLibraryAvailable('jssip')
const hasSipJs = await AdapterFactory.isLibraryAvailable('sipjs')

// Get all available libraries
const libraries = await AdapterFactory.getAvailableLibraries()
console.log('Available:', libraries) // ['jssip']

// Get adapter information
const info = await AdapterFactory.getAdapterInfo('jssip')
console.log(`${info.libraryName} v${info.libraryVersion}`)
// Output: JsSIP v3.10.0
```

## JsSIP Adapter

The JsSIP adapter provides full support for SIP call management.

### Supported Features

| Feature                      | Support                   |
| ---------------------------- | ------------------------- |
| Audio calls                  | Yes                       |
| Video calls                  | Yes                       |
| DTMF                         | Yes (RFC 2833 + SIP INFO) |
| Call hold/resume             | Yes                       |
| Call transfer                | Yes (blind + attended)    |
| Mute/unmute                  | Yes                       |
| SIP MESSAGE                  | Yes                       |
| Presence (SUBSCRIBE/PUBLISH) | No                        |

### Configuration

```typescript
const sipConfig = {
  // Required
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:user@example.com',
  password: 'your-password',

  // Optional
  displayName: 'John Doe',
  debug: false,

  registrationOptions: {
    expires: 300,
    autoRegister: false,
    extraHeaders: ['X-Custom: value'],
  },

  sessionOptions: {
    sessionTimers: true,
    sessionTimersExpires: 1800,
  },
}
```

### Presence Limitations

JsSIP does not include native SUBSCRIBE/PUBLISH support for SIP presence (RFC 3856/3903). If you need presence functionality:

1. **Server-side solution**: Use your SIP server's presence API
2. **Custom WebSocket**: Implement presence via a separate WebSocket connection
3. **REST API**: Use a REST-based presence service

```typescript
try {
  await adapter.subscribe('sip:bob@example.com', 'presence')
} catch (error) {
  if (error instanceof AdapterNotSupportedError) {
    // Handle gracefully - JsSIP doesn't support presence
    console.log('Presence not available:', error.suggestion)
  }
}
```

## SIP.js Adapter

> **Note**: The SIP.js adapter is currently a stub implementation. Full implementation is planned for a future release.

The SIP.js adapter will provide an alternative to JsSIP with potentially better browser compatibility for some use cases.

### Current Status

The stub implementation allows:

- Creating the adapter
- Checking library availability
- Getting adapter metadata

All other operations throw helpful error messages indicating the feature is not yet implemented.

## Custom Adapters

You can create custom adapters to support other SIP libraries or custom implementations.

### Implementing a Custom Adapter

```typescript
import { EventEmitter } from '@/utils/EventEmitter'
import type { ISipAdapter, AdapterEvents, ICallSession } from '@/adapters/types'

class MyCustomAdapter extends EventEmitter<AdapterEvents> implements ISipAdapter {
  readonly adapterName = 'My Custom Adapter'
  readonly adapterVersion = '1.0.0'
  readonly libraryName = 'MyLibrary'
  readonly libraryVersion = '2.0.0'

  // Implement connection state
  get isConnected(): boolean {
    /* ... */
  }
  get connectionState(): ConnectionState {
    /* ... */
  }

  // Implement registration state
  get isRegistered(): boolean {
    /* ... */
  }
  get registrationState(): RegistrationState {
    /* ... */
  }

  // Implement lifecycle methods
  async initialize(config: SipClientConfig): Promise<void> {
    /* ... */
  }
  async connect(): Promise<void> {
    /* ... */
  }
  async disconnect(): Promise<void> {
    /* ... */
  }
  async register(): Promise<void> {
    /* ... */
  }
  async unregister(): Promise<void> {
    /* ... */
  }

  // Implement call methods
  async call(target: string, options?: CallOptions): Promise<ICallSession> {
    /* ... */
  }
  async sendMessage(target: string, content: string): Promise<void> {
    /* ... */
  }
  async sendDTMF(callId: string, tone: string): Promise<void> {
    /* ... */
  }

  // Implement presence (or throw AdapterNotSupportedError)
  async subscribe(target: string, event: string): Promise<void> {
    throw new AdapterNotSupportedError('subscribe', this.adapterName)
  }

  // Implement session management
  getActiveCalls(): ICallSession[] {
    /* ... */
  }
  getCallSession(callId: string): ICallSession | null {
    /* ... */
  }
  async destroy(): Promise<void> {
    /* ... */
  }
}
```

### Using Custom Adapters

```typescript
const customAdapter = new MyCustomAdapter()

const adapter = await AdapterFactory.createAdapter(sipConfig, {
  library: 'custom',
  customAdapter,
})
```

## Feature Comparison

| Feature           | JsSIP | SIP.js (planned) | Custom |
| ----------------- | ----- | ---------------- | ------ |
| Audio calls       | Yes   | Yes              | Varies |
| Video calls       | Yes   | Yes              | Varies |
| DTMF (RFC 2833)   | Yes   | Yes              | Varies |
| DTMF (SIP INFO)   | Yes   | Yes              | Varies |
| Hold/Resume       | Yes   | Yes              | Varies |
| Blind Transfer    | Yes   | Yes              | Varies |
| Attended Transfer | Yes   | Yes              | Varies |
| SIP MESSAGE       | Yes   | Yes              | Varies |
| SUBSCRIBE/PUBLISH | No    | Planned          | Varies |
| ICE/STUN/TURN     | Yes   | Yes              | Varies |
| Session Timers    | Yes   | Yes              | Varies |

## Error Handling

### AdapterNotSupportedError

Thrown when an operation is not supported by the adapter.

```typescript
import { AdapterNotSupportedError } from '@/adapters/types'

try {
  await adapter.subscribe('sip:bob@example.com', 'presence')
} catch (error) {
  if (error instanceof AdapterNotSupportedError) {
    console.log(`Operation: ${error.operation}`)
    console.log(`Adapter: ${error.adapterName}`)
    console.log(`Suggestion: ${error.suggestion}`)
  }
}
```

### Common Errors

| Error                     | Cause                                 | Solution                  |
| ------------------------- | ------------------------------------- | ------------------------- |
| "Adapter not initialized" | Called methods before `initialize()`  | Call `initialize()` first |
| "Not connected"           | Called methods requiring connection   | Call `connect()` first    |
| "Not registered"          | Called methods requiring registration | Call `register()` first   |
| "Call session not found"  | Invalid call ID                       | Verify call ID exists     |

## Events

All adapters emit standardized events through the EventEmitter pattern.

### Connection Events

```typescript
adapter.on('connection:connecting', () => {
  console.log('Connecting to SIP server...')
})

adapter.on('connection:connected', () => {
  console.log('Connected!')
})

adapter.on('connection:disconnected', ({ reason }) => {
  console.log('Disconnected:', reason)
})

adapter.on('connection:failed', ({ error }) => {
  console.error('Connection failed:', error)
})
```

### Registration Events

```typescript
adapter.on('registration:registering', () => {
  console.log('Registering...')
})

adapter.on('registration:registered', ({ expires }) => {
  console.log(`Registered for ${expires} seconds`)
})

adapter.on('registration:unregistered', () => {
  console.log('Unregistered')
})

adapter.on('registration:failed', ({ error, statusCode }) => {
  console.error(`Registration failed (${statusCode}):`, error)
})
```

### Call Events

```typescript
adapter.on('call:incoming', ({ session }) => {
  console.log('Incoming call from:', session.remoteUri)
  // Answer or reject
  await session.answer({ mediaConstraints: { audio: true } })
})

adapter.on('call:outgoing', ({ session }) => {
  console.log('Outgoing call to:', session.remoteUri)
})
```

### Message Events

```typescript
adapter.on('message:received', ({ from, content, contentType }) => {
  console.log(`Message from ${from}: ${content}`)
})
```

### Call Session Events

```typescript
session.on('progress', ({ statusCode, reasonPhrase }) => {
  console.log(`Progress: ${statusCode} ${reasonPhrase}`)
})

session.on('accepted', () => {
  console.log('Call accepted')
})

session.on('ended', ({ cause }) => {
  console.log('Call ended:', cause)
})

session.on('remoteStream', ({ stream }) => {
  // Attach to audio/video element
  audioElement.srcObject = stream
})
```

## API Reference

See the TypeScript type definitions in `src/adapters/types.ts` for complete API documentation.

### Key Interfaces

- `ISipAdapter` - Main adapter interface
- `ICallSession` - Call session interface
- `AdapterConfig` - Factory configuration
- `CallOptions` - Options for making calls
- `AnswerOptions` - Options for answering calls
- `AdapterEvents` - Event type definitions
- `CallSessionEvents` - Call session event types
- `AdapterNotSupportedError` - Error for unsupported operations
