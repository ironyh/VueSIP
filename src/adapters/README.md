# SIP Adapter Architecture

VueSip uses an **Adapter Pattern** to support multiple SIP libraries (JsSIP, SIP.js, etc.) through a unified interface. This architecture provides:

- **Library Agnostic**: Switch between SIP libraries without changing application code
- **Runtime Selection**: Choose SIP library at runtime based on requirements
- **Type Safety**: Consistent TypeScript interfaces across all adapters
- **Future Proof**: Easy to add support for new SIP libraries

## Architecture Overview

```
┌────────────────────────────────────────────────────┐
│           Application Layer                        │
│  (Components, Composables, Providers)              │
└─────────────────┬──────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────┐
│         VueSip Core Layer                          │
│  ┌──────────────────────────────────────────────┐ │
│  │  SipClient (uses ISipAdapter interface)     │ │
│  └────────────────┬─────────────────────────────┘ │
│                   │                                │
│  ┌────────────────▼─────────────────────────────┐ │
│  │       Adapter Factory                        │ │
│  │  (selects adapter based on config)           │ │
│  └────────────────┬─────────────────────────────┘ │
└───────────────────┼────────────────────────────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
┌─────────────────┐      ┌─────────────────┐
│  JsSIP Adapter  │      │ SIP.js Adapter  │
│  (Current)      │      │  (Planned)      │
└────────┬────────┘      └────────┬────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│  JsSIP Library  │      │ SIP.js Library  │
└─────────────────┘      └─────────────────┘
```

## Core Interfaces

### ISipAdapter

The main adapter interface that all SIP library adapters must implement:

```typescript
interface ISipAdapter extends EventEmitter {
  // Metadata
  readonly adapterName: string
  readonly libraryName: string

  // State
  readonly isConnected: boolean
  readonly isRegistered: boolean

  // Core Operations
  initialize(config: SipClientConfig): Promise<void>
  connect(): Promise<void>
  disconnect(): Promise<void>
  register(): Promise<void>
  unregister(): Promise<void>

  // Call Operations
  call(target: string, options?: CallOptions): Promise<ICallSession>
  sendDTMF(callId: string, tone: string): Promise<void>

  // Messaging & Presence
  sendMessage(target: string, content: string): Promise<void>
  subscribe(target: string, event: string): Promise<void>
  publish(event: string, state: any): Promise<void>

  // Management
  getActiveCalls(): ICallSession[]
  destroy(): Promise<void>
}
```

### ICallSession

Represents an individual call session with standardized operations:

```typescript
interface ICallSession extends EventEmitter {
  // Metadata
  readonly id: string
  readonly direction: CallDirection
  readonly state: CallState
  readonly remoteUri: string

  // Media
  readonly localStream: MediaStream | null
  readonly remoteStream: MediaStream | null

  // Call Control
  answer(options?: AnswerOptions): Promise<void>
  reject(statusCode?: number): Promise<void>
  terminate(): Promise<void>
  hold(): Promise<void>
  unhold(): Promise<void>
  mute(): Promise<void>
  unmute(): Promise<void>

  // Advanced Operations
  sendDTMF(tone: string, options?: DTMFOptions): Promise<void>
  transfer(target: string): Promise<void>
  attendedTransfer(target: ICallSession): Promise<void>
  renegotiate(options?: RenegotiateOptions): Promise<void>
  getStats(): Promise<CallStatistics>
}
```

## Usage

### Basic Usage

```typescript
import { AdapterFactory } from '@/adapters/AdapterFactory'

// Create adapter with JsSIP
const adapter = await AdapterFactory.createAdapter(sipConfig, {
  library: 'jssip',
})

// Connect and register
await adapter.connect()
await adapter.register()

// Make a call
const session = await adapter.call('sip:bob@example.com', {
  mediaConstraints: { audio: true, video: false },
})

// Handle call events
session.on('accepted', () => {
  console.log('Call accepted!')
})
```

### Runtime Library Selection

```typescript
// Check available libraries
const libraries = await AdapterFactory.getAvailableLibraries()
console.log('Available SIP libraries:', libraries)

// Select library at runtime
const preferredLibrary = libraries.includes('sipjs') ? 'sipjs' : 'jssip'

const adapter = await AdapterFactory.createAdapter(sipConfig, {
  library: preferredLibrary,
})
```

### Custom Adapter

```typescript
class MyCustomAdapter implements ISipAdapter {
  // Implement all interface methods
  // ...
}

const adapter = await AdapterFactory.createAdapter(sipConfig, {
  library: 'custom',
  customAdapter: new MyCustomAdapter(),
})
```

## Adapter Implementation Status

Current state: **JsSIP adapter implemented** (JsSipAdapter, JsSipCallSession); **SIP.js planned**. SipClient refactor to use adapter is pending (Phase 3).

| Adapter    | Status         | Version | Features                       |
| ---------- | -------------- | ------- | ------------------------------ |
| **JsSIP**  | ✅ Implemented | -       | JsSipAdapter, JsSipCallSession |
| **SIP.js** | 📋 Planned     | -       | Future implementation          |
| **Custom** | ✅ Supported   | -       | Via ISipAdapter interface      |

## Implementation Roadmap

### Phase 1: Foundation (Complete)

- ✅ Define `ISipAdapter` and `ICallSession` interfaces
- ✅ Create `AdapterFactory` for library selection
- ✅ Document adapter architecture
- ✅ Implement `JsSipAdapter` wrapping JsSIP

### Phase 2: JsSIP Adapter (Complete)

- ✅ Extract JsSIP code into `JsSipAdapter` class
- ✅ Implement `JsSipCallSession` class
- ✅ Feature parity with current JsSIP usage
- ✅ Add comprehensive unit tests for adapter
- ✅ Update documentation

### Phase 3: Core Refactoring

- 🔲 Refactor `SipClient.ts` to use `ISipAdapter` interface
- 🔲 Refactor `CallSession.ts` to use `ICallSession` interface
- 🔲 Update all composables to use adapter interfaces
- 🔲 Update all providers to use adapter factory
- 🔲 Maintain backward compatibility

### Phase 4: SIP.js Adapter

- 🔲 Implement `SipJsAdapter` class
- 🔲 Implement `SipJsCallSession` class
- 🔲 Map SIP.js APIs to adapter interface
- 🔲 Add SIP.js-specific configuration options
- 🔲 Comprehensive testing with SIP.js
- 🔲 Update documentation and examples

### Phase 5: Optimization

- 🔲 Dynamic imports for tree-shaking
- 🔲 Make SIP libraries optional peer dependencies
- 🔲 Performance optimization
- 🔲 Bundle size optimization
- 🔲 Add adapter benchmarks

## Directory Structure

```
src/adapters/
├── README.md                    # This file
├── types.ts                     # Adapter interfaces and types
├── AdapterFactory.ts            # Factory for creating adapters
│
├── jssip/                       # JsSIP adapter implementation
│   ├── JsSipAdapter.ts          # JsSIP adapter (implements ISipAdapter)
│   ├── JsSipCallSession.ts      # JsSIP call session wrapper
│   ├── JsSipEventMapper.ts      # Maps JsSIP events to standard events
│   └── types.ts                 # JsSIP-specific types
│
├── sipjs/                       # SIP.js adapter implementation (planned)
│   ├── SipJsAdapter.ts          # SIP.js adapter
│   ├── SipJsCallSession.ts      # SIP.js call session wrapper
│   ├── SipJsEventMapper.ts      # Maps SIP.js events to standard events
│   └── types.ts                 # SIP.js-specific types
│
└── base/                        # Base adapter classes (optional)
    └── BaseAdapter.ts           # Common adapter functionality
```

## Key Design Decisions

### 1. **Event-Driven Architecture**

Both `ISipAdapter` and `ICallSession` extend `EventEmitter` to maintain VueSip's event-driven design while providing standardized event names across libraries.

### 2. **Async Operations**

All adapter methods return Promises to handle async SIP operations consistently, regardless of the underlying library's async patterns.

### 3. **Factory Pattern**

The `AdapterFactory` enables runtime library selection and provides a clean creation API. Dynamic imports allow tree-shaking of unused adapters.

### 4. **Interface Segregation**

Separate interfaces for adapters and call sessions follow SOLID principles and make the code more maintainable.

### 5. **Type Safety**

Comprehensive TypeScript types ensure compile-time safety when working with any adapter implementation.

## Event Mapping

Different SIP libraries use different event names. Adapters map library-specific events to standardized names:

### Connection Events

| Standard Event            | JsSIP Event    | SIP.js Event             |
| ------------------------- | -------------- | ------------------------ |
| `connection:connecting`   | `connecting`   | `transport.connecting`   |
| `connection:connected`    | `connected`    | `transport.connected`    |
| `connection:disconnected` | `disconnected` | `transport.disconnected` |
| `connection:failed`       | N/A            | `transport.error`        |

### Call Events

| Standard Event  | JsSIP Event                | SIP.js Event      |
| --------------- | -------------------------- | ----------------- |
| `call:incoming` | `newRTCSession` (incoming) | `invite`          |
| `call:outgoing` | `newRTCSession` (outgoing) | N/A (synchronous) |

### Session Events

| Standard Event | JsSIP RTCSession | SIP.js Session |
| -------------- | ---------------- | -------------- |
| `progress`     | `progress`       | `progress`     |
| `accepted`     | `accepted`       | `accepted`     |
| `ended`        | `ended`          | `terminated`   |
| `failed`       | `failed`         | `failed`       |

## Testing Strategy

### Unit Tests

- Test each adapter implementation in isolation
- Mock SIP library dependencies
- Verify event mapping
- Test error handling

### Integration Tests

- Test adapter factory creation
- Test library switching
- Test feature parity across adapters
- Test backward compatibility

### E2E Tests

- Test real SIP server connections with each adapter
- Verify call flows with different libraries
- Test library-specific features

## Contributing

When implementing a new adapter:

1. **Implement all interface methods** - Every method in `ISipAdapter` and `ICallSession` must be implemented
2. **Map events correctly** - Use standardized event names from `AdapterEvents` and `CallSessionEvents`
3. **Handle errors consistently** - Throw errors with clear messages
4. **Add comprehensive tests** - Unit, integration, and E2E tests required
5. **Document library-specific features** - Note any unique capabilities or limitations
6. **Update this README** - Add your adapter to the status table and roadmap

## Resources

- [JsSIP Documentation](https://jssip.net/documentation/)
- [SIP.js Documentation](https://sipjs.com/guides/)
- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)
- [VueSip Architecture Documentation](../../docs/developer/architecture.md)
- [VueSip Contributing Guide](../../CONTRIBUTING.md)

---

**Status:** JsSIP adapter implemented and fully audited against ISipAdapter/ICallSession contracts (JsSipAdapter, JsSipCallSession). Core refactoring (SipClient uses adapter) and SIP.js adapter planned.

**Last Updated:** 2026-03-06
