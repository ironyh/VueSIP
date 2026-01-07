# SIP Adapter System

The VueSIP adapter system provides a unified interface for different SIP libraries (JsSIP, SIP.js, custom implementations), enabling library-agnostic SIP operations with runtime library selection.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Reference](#api-reference)
  - [AdapterFactory](#adapterfactory)
  - [createSipAdapter](#createsipAdapter)
  - [ISipAdapter Interface](#isipAdapter-interface)
  - [ICallSession Interface](#icallsession-interface)
- [Events](#events)
  - [Adapter Events](#adapter-events)
  - [Call Session Events](#call-session-events)
- [Configuration Types](#configuration-types)
- [Error Handling](#error-handling)
- [Custom Adapters](#custom-adapters)
- [Migration Guide](#migration-guide)

---

## Quick Start

```typescript
import { createSipAdapter } from 'vuesip/adapters'

// Create adapter with default library (JsSIP)
const adapter = await createSipAdapter({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:user@example.com',
  password: 'secret',
  displayName: 'John Doe'
})

// Connect to SIP server
await adapter.connect()

// Register to receive calls
await adapter.register()

// Make a call
const session = await adapter.call('sip:bob@example.com', {
  mediaConstraints: { audio: true, video: false }
})

// Handle incoming calls
adapter.on('call:incoming', ({ session }) => {
  console.log('Incoming call from:', session.remoteUri)
  session.answer({ mediaConstraints: { audio: true } })
})

// Clean up
await adapter.destroy()
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Code                          │
│                    (Vue Components, Composables)                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AdapterFactory                            │
│              createAdapter() / createSipAdapter()                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  JsSipAdapter   │  │  SipJsAdapter   │  │  CustomAdapter  │
│   (ISipAdapter) │  │   (ISipAdapter) │  │   (ISipAdapter) │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ JsSipCallSession│  │ SipJsCallSession│  │ CustomCallSession│
│  (ICallSession) │  │  (ICallSession) │  │  (ICallSession) │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

The adapter pattern provides:

- **Library-agnostic API**: Switch between JsSIP and SIP.js without changing application code
- **Runtime library selection**: Choose the SIP library at runtime
- **Dynamic loading**: Code splitting support via dynamic imports
- **Consistent events**: Standardized event model across all adapters
- **Type safety**: Full TypeScript support with comprehensive type definitions

---

## API Reference

### AdapterFactory

Factory class for creating SIP adapter instances with explicit configuration.

#### `AdapterFactory.createAdapter(sipConfig, adapterConfig)`

Creates a SIP adapter with full configuration control.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sipConfig` | `SipClientConfig` | SIP client configuration (server, credentials) |
| `adapterConfig` | `AdapterConfig` | Adapter selection and options |

**Returns:** `Promise<ISipAdapter>`

**Example:**

```typescript
import { AdapterFactory } from 'vuesip/adapters'

// Using JsSIP with library-specific options
const adapter = await AdapterFactory.createAdapter(
  {
    uri: 'wss://sip.example.com:7443',
    sipUri: 'sip:user@example.com',
    password: 'secret'
  },
  {
    library: 'jssip',
    libraryOptions: {
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30
    }
  }
)
```

---

#### `AdapterFactory.isLibraryAvailable(library)`

Checks if a SIP library is available in the runtime environment.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `library` | `'jssip' \| 'sipjs'` | Library name to check |

**Returns:** `Promise<boolean>`

**Example:**

```typescript
if (await AdapterFactory.isLibraryAvailable('jssip')) {
  const adapter = await AdapterFactory.createAdapter(config, { library: 'jssip' })
} else {
  console.error('JsSIP is not installed')
}
```

---

#### `AdapterFactory.getAvailableLibraries()`

Returns all available SIP libraries in the current environment.

**Returns:** `Promise<Array<'jssip' | 'sipjs'>>`

**Example:**

```typescript
const libraries = await AdapterFactory.getAvailableLibraries()
console.log('Available libraries:', libraries) // ['jssip']

// Use first available library
if (libraries.length > 0) {
  const adapter = await AdapterFactory.createAdapter(config, {
    library: libraries[0]
  })
}
```

---

#### `AdapterFactory.getAdapterInfo(library)`

Gets adapter metadata without fully initializing the adapter.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `library` | `'jssip' \| 'sipjs'` | Library to get info for |

**Returns:** `Promise<AdapterInfo | null>`

```typescript
interface AdapterInfo {
  adapterName: string      // e.g., 'JsSIP Adapter'
  adapterVersion: string   // e.g., '1.0.0'
  libraryName: string      // e.g., 'JsSIP'
  libraryVersion: string   // e.g., '3.10.0'
}
```

**Example:**

```typescript
const info = await AdapterFactory.getAdapterInfo('jssip')
if (info) {
  console.log(`Using ${info.libraryName} v${info.libraryVersion}`)
  console.log(`Adapter: ${info.adapterName} v${info.adapterVersion}`)
}
// Output:
// Using JsSIP v3.10.0
// Adapter: JsSIP Adapter v1.0.0
```

---

### createSipAdapter

Convenience function for creating adapters with minimal configuration.

```typescript
function createSipAdapter(
  sipConfig: SipClientConfig,
  library?: 'jssip' | 'sipjs'
): Promise<ISipAdapter>
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sipConfig` | `SipClientConfig` | - | SIP configuration |
| `library` | `'jssip' \| 'sipjs'` | `'jssip'` | SIP library to use |

**Example:**

```typescript
import { createSipAdapter } from 'vuesip/adapters'

// Default (JsSIP)
const adapter = await createSipAdapter({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:user@example.com',
  password: 'secret'
})

// Explicit SIP.js selection
const sipjsAdapter = await createSipAdapter(config, 'sipjs')
```

---

### ISipAdapter Interface

The main adapter interface that all SIP library adapters implement.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `adapterName` | `string` | Human-readable adapter name (e.g., `'JsSIP Adapter'`) |
| `adapterVersion` | `string` | Adapter implementation version (semver) |
| `libraryName` | `string` | Name of underlying SIP library (e.g., `'JsSIP'`) |
| `libraryVersion` | `string` | Version of underlying SIP library |
| `isConnected` | `boolean` | Whether connected to SIP server |
| `connectionState` | `ConnectionState` | Detailed connection state |
| `isRegistered` | `boolean` | Whether registered with SIP server |
| `registrationState` | `RegistrationState` | Detailed registration state |

#### Lifecycle Methods

##### `initialize(config: SipClientConfig): Promise<void>`

Initializes the adapter with SIP configuration. Must be called before any other operations.

```typescript
await adapter.initialize({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:user@example.com',
  password: 'secret',
  displayName: 'John Doe',
  debug: false
})
```

**Note:** When using `AdapterFactory.createAdapter()` or `createSipAdapter()`, initialization is called automatically.

---

##### `connect(): Promise<void>`

Establishes WebSocket connection to the SIP server.

**Emits:** `connection:connecting`, `connection:connected`, `connection:failed`

**Throws:** Error if adapter not initialized or connection fails

```typescript
try {
  await adapter.connect()
  console.log('Connected!')
} catch (error) {
  console.error('Connection failed:', error)
}
```

---

##### `disconnect(): Promise<void>`

Gracefully closes the WebSocket connection. Terminates any active calls before disconnecting.

**Emits:** `connection:disconnected`

```typescript
await adapter.disconnect()
```

---

##### `register(options?: RegisterOptions): Promise<void>`

Sends SIP REGISTER request to the server. Required for receiving incoming calls.

**Emits:** `registration:registering`, `registration:registered`, `registration:failed`

**Throws:** Error if not connected or registration fails

```typescript
await adapter.register()

// With options
await adapter.register({
  expires: 3600,
  extraHeaders: ['X-Custom: value']
})
```

---

##### `unregister(): Promise<void>`

Sends SIP REGISTER with expires=0 to unregister from the server.

**Emits:** `registration:unregistered`

```typescript
await adapter.unregister()
```

---

##### `destroy(): Promise<void>`

Performs graceful cleanup:
1. Terminates all active calls
2. Unregisters from server
3. Disconnects WebSocket
4. Releases all resources

After calling `destroy()`, the adapter instance should not be reused.

```typescript
await adapter.destroy()
```

---

#### Call Methods

##### `call(target: string, options?: CallOptions): Promise<ICallSession>`

Initiates an outgoing SIP call.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | `string` | SIP URI or phone number to call |
| `options` | `CallOptions` | Optional call configuration |

**Returns:** `ICallSession` - Call session for managing the call

**Emits:** `call:outgoing`

```typescript
// Audio-only call
const session = await adapter.call('sip:bob@example.com', {
  mediaConstraints: { audio: true, video: false }
})

// Video call
const session = await adapter.call('sip:bob@example.com', {
  mediaConstraints: { audio: true, video: true }
})

// Anonymous call (hide caller ID)
const session = await adapter.call('sip:bob@example.com', {
  mediaConstraints: { audio: true },
  anonymous: true
})

// With custom SIP headers
const session = await adapter.call('sip:bob@example.com', {
  mediaConstraints: { audio: true },
  extraHeaders: ['X-Custom-Header: value']
})
```

---

##### `sendMessage(target: string, content: string, contentType?: string): Promise<void>`

Sends an out-of-dialog SIP MESSAGE (instant message).

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target` | `string` | - | Destination SIP URI |
| `content` | `string` | - | Message content |
| `contentType` | `string` | `'text/plain'` | MIME type |

```typescript
await adapter.sendMessage(
  'sip:bob@example.com',
  'Hello, Bob!',
  'text/plain'
)
```

---

##### `sendDTMF(callId: string, tone: string): Promise<void>`

Sends DTMF tone(s) on an active call.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `callId` | `string` | Call session ID |
| `tone` | `string` | DTMF digits (0-9, *, #, A-D) |

```typescript
// Send single digit
await adapter.sendDTMF(session.id, '5')

// Send PIN code
await adapter.sendDTMF(session.id, '1234#')
```

---

#### Presence Methods

> **Note:** JsSIP does not support native SUBSCRIBE/PUBLISH. These methods throw `AdapterNotSupportedError` with helpful suggestions.

##### `subscribe(target: string, event: string, expires?: number): Promise<void>`

Subscribes to SIP event notifications (presence, dialog-info, etc.).

```typescript
try {
  await adapter.subscribe('sip:bob@example.com', 'presence', 3600)
} catch (error) {
  if (error instanceof AdapterNotSupportedError) {
    console.log('Presence not supported:', error.suggestion)
  }
}
```

---

##### `unsubscribe(target: string, event: string): Promise<void>`

Terminates an existing subscription.

---

##### `publish(event: string, state: unknown): Promise<void>`

Publishes presence or event state.

```typescript
try {
  await adapter.publish('presence', {
    status: 'online',
    note: 'Available for calls'
  })
} catch (error) {
  if (error instanceof AdapterNotSupportedError) {
    console.log('Presence publishing not supported')
  }
}
```

---

#### Session Management

##### `getActiveCalls(): ICallSession[]`

Returns all currently active call sessions.

```typescript
const activeCalls = adapter.getActiveCalls()
console.log(`${activeCalls.length} active call(s)`)
```

---

##### `getCallSession(callId: string): ICallSession | null`

Gets a specific call session by ID.

```typescript
const session = adapter.getCallSession('call-123')
if (session) {
  console.log('Call state:', session.state)
}
```

---

### ICallSession Interface

Represents an individual SIP call session with standardized operations.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique session identifier |
| `direction` | `CallDirection` | `'incoming'` or `'outgoing'` |
| `state` | `CallState` | Current call state |
| `remoteUri` | `string` | Remote party SIP URI |
| `remoteDisplayName` | `string \| null` | Remote party display name |
| `startTime` | `Date \| null` | When call was established |
| `endTime` | `Date \| null` | When call ended |
| `duration` | `number` | Call duration in seconds |
| `localStream` | `MediaStream \| null` | Local audio/video stream |
| `remoteStream` | `MediaStream \| null` | Remote audio/video stream |
| `isOnHold` | `boolean` | Whether call is on hold |
| `isMuted` | `boolean` | Whether local audio is muted |

#### Call State Values

```typescript
enum CallState {
  Idle = 'idle',
  Calling = 'calling',
  Ringing = 'ringing',
  Active = 'active',
  Held = 'held',
  RemoteHeld = 'remote_held',
  Terminated = 'terminated',
  Failed = 'failed'
}
```

#### Methods

##### `answer(options?: AnswerOptions): Promise<void>`

Answers an incoming call.

```typescript
// Audio-only answer
await session.answer({
  mediaConstraints: { audio: true, video: false }
})

// Video answer
await session.answer({
  mediaConstraints: { audio: true, video: true }
})
```

---

##### `reject(statusCode?: number): Promise<void>`

Rejects an incoming call with a SIP status code.

| Status Code | Description |
|-------------|-------------|
| `486` | Busy Here (default) |
| `480` | Temporarily Unavailable |
| `603` | Decline |

```typescript
await session.reject(486)  // Busy
await session.reject(603)  // Decline
```

---

##### `terminate(): Promise<void>`

Terminates/hangs up the call.

```typescript
await session.terminate()
```

---

##### `hold(): Promise<void>`

Puts the call on hold.

```typescript
await session.hold()
console.log('Call on hold:', session.isOnHold) // true
```

---

##### `unhold(): Promise<void>`

Resumes the call from hold.

```typescript
await session.unhold()
```

---

##### `mute(): Promise<void>`

Mutes local audio.

```typescript
await session.mute()
console.log('Muted:', session.isMuted) // true
```

---

##### `unmute(): Promise<void>`

Unmutes local audio.

```typescript
await session.unmute()
```

---

##### `sendDTMF(tone: string, options?: DTMFOptions): Promise<void>`

Sends DTMF tone(s) on the call.

**DTMFOptions:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `duration` | `number` | `100` | Tone duration (ms) |
| `interToneGap` | `number` | `70` | Gap between tones (ms) |
| `transport` | `'RFC2833' \| 'INFO'` | `'RFC2833'` | DTMF transport method |

```typescript
// Send with default options
await session.sendDTMF('1234#')

// Custom duration and gap
await session.sendDTMF('5', {
  duration: 200,
  interToneGap: 100,
  transport: 'RFC2833'
})
```

---

##### `transfer(target: string): Promise<void>`

Performs a blind (unattended) transfer.

```typescript
await session.transfer('sip:charlie@example.com')
```

---

##### `attendedTransfer(target: ICallSession): Promise<void>`

Performs an attended (supervised) transfer.

```typescript
// First, establish call to transfer target
const consultSession = await adapter.call('sip:charlie@example.com')

// Wait for consultation call to be answered
// Then perform attended transfer
await originalSession.attendedTransfer(consultSession)
```

---

##### `renegotiate(options?: RenegotiateOptions): Promise<void>`

Renegotiates media (e.g., add video to audio-only call).

```typescript
// Add video to existing call
await session.renegotiate({
  mediaConstraints: { audio: true, video: true }
})
```

---

##### `getStats(): Promise<CallStatistics>`

Gets real-time call statistics from WebRTC.

```typescript
const stats = await session.getStats()

if (stats.audio) {
  console.log('Audio packets lost:', stats.audio.packetsLost)
  console.log('Jitter:', stats.audio.jitter, 'ms')
}

if (stats.video) {
  console.log('Frame rate:', stats.video.frameRate)
  console.log('Resolution:', stats.video.resolution.width, 'x', stats.video.resolution.height)
}
```

**CallStatistics Type:**

```typescript
interface CallStatistics {
  audio?: {
    bytesSent: number
    bytesReceived: number
    packetsSent: number
    packetsReceived: number
    packetsLost: number
    jitter: number          // milliseconds
    roundTripTime: number   // milliseconds
    bitrate: number
  }
  video?: {
    bytesSent: number
    bytesReceived: number
    packetsSent: number
    packetsReceived: number
    packetsLost: number
    frameRate: number
    resolution: { width: number; height: number }
    bitrate: number
  }
  connection?: {
    localCandidateType: string
    remoteCandidateType: string
    availableOutgoingBitrate: number
    availableIncomingBitrate: number
  }
}
```

---

## Events

### Adapter Events

All adapters emit standardized events through the EventEmitter pattern.

#### Connection Events

```typescript
// Connection starting
adapter.on('connection:connecting', () => {
  console.log('Connecting to SIP server...')
})

// Successfully connected
adapter.on('connection:connected', () => {
  console.log('Connected!')
})

// Disconnected
adapter.on('connection:disconnected', ({ reason }) => {
  console.log('Disconnected:', reason)
})

// Connection failed
adapter.on('connection:failed', ({ error }) => {
  console.error('Connection failed:', error.message)
})
```

#### Registration Events

```typescript
// Registration starting
adapter.on('registration:registering', () => {
  console.log('Registering...')
})

// Successfully registered
adapter.on('registration:registered', ({ expires }) => {
  console.log(`Registered for ${expires} seconds`)
})

// Unregistered
adapter.on('registration:unregistered', () => {
  console.log('Unregistered')
})

// Registration failed
adapter.on('registration:failed', ({ error, statusCode }) => {
  console.error(`Registration failed (${statusCode}):`, error.message)
})
```

#### Call Events

```typescript
// Incoming call
adapter.on('call:incoming', ({ session }) => {
  console.log('Incoming call from:', session.remoteUri)
  console.log('Display name:', session.remoteDisplayName)

  // Answer or reject
  if (shouldAnswer) {
    await session.answer({ mediaConstraints: { audio: true } })
  } else {
    await session.reject(486) // Busy
  }
})

// Outgoing call started
adapter.on('call:outgoing', ({ session }) => {
  console.log('Outgoing call to:', session.remoteUri)
})
```

#### Message Events

```typescript
adapter.on('message:received', ({ from, content, contentType }) => {
  console.log(`Message from ${from}: ${content}`)
})
```

#### Presence Events

```typescript
adapter.on('presence:notification', ({ from, state, note }) => {
  console.log(`${from} is ${state}${note ? ': ' + note : ''}`)
})
```

#### Error Events

```typescript
adapter.on('error', ({ error, context }) => {
  console.error(`Error in ${context}:`, error.message)
})
```

### Call Session Events

```typescript
// Call progress (ringing)
session.on('progress', ({ statusCode, reasonPhrase }) => {
  console.log(`Progress: ${statusCode} ${reasonPhrase}`)
  // 180 Ringing, 183 Session Progress
})

// Call accepted (answered)
session.on('accepted', () => {
  console.log('Call accepted')
})

// Call confirmed (ACK sent/received)
session.on('confirmed', () => {
  console.log('Call confirmed - media flowing')
})

// Call ended
session.on('ended', ({ cause, statusCode }) => {
  console.log(`Call ended: ${cause}`)
})

// Call failed
session.on('failed', ({ cause, statusCode }) => {
  console.error(`Call failed: ${cause} (${statusCode})`)
})

// Hold state changed
session.on('hold', () => {
  console.log('Call placed on hold')
})

session.on('unhold', () => {
  console.log('Call resumed from hold')
})

// Mute state changed
session.on('muted', () => {
  console.log('Audio muted')
})

session.on('unmuted', () => {
  console.log('Audio unmuted')
})

// DTMF received
session.on('dtmf', ({ tone }) => {
  console.log('DTMF received:', tone)
})

// Transfer notification
session.on('referred', ({ target }) => {
  console.log('Call transferred to:', target)
})

// Media streams
session.on('localStream', ({ stream }) => {
  localAudioElement.srcObject = stream
})

session.on('remoteStream', ({ stream }) => {
  remoteAudioElement.srcObject = stream
})

// ICE connection state
session.on('iceConnectionStateChange', ({ state }) => {
  console.log('ICE state:', state)
  // 'new', 'checking', 'connected', 'completed', 'failed', 'disconnected', 'closed'
})

session.on('iceGatheringStateChange', ({ state }) => {
  console.log('ICE gathering:', state)
})

session.on('signalingStateChange', ({ state }) => {
  console.log('Signaling state:', state)
})
```

---

## Configuration Types

### SipClientConfig

Main configuration for the SIP client.

```typescript
interface SipClientConfig {
  // Required
  uri: string              // WebSocket server URI (wss://sip.example.com:7443)
  sipUri: string           // SIP URI (sip:user@example.com)
  password: string         // SIP password

  // Optional
  displayName?: string              // Display name for caller ID
  authorizationUsername?: string    // Auth username (if different from sipUri)
  debug?: boolean                   // Enable debug logging

  // Registration options
  registrationOptions?: {
    expires?: number                // Registration expiry (seconds)
    autoRegister?: boolean          // Auto-register on connect
    extraHeaders?: string[]         // Custom SIP headers
  }

  // Session options
  sessionOptions?: {
    sessionTimers?: boolean         // Enable session timers
    sessionTimersExpires?: number   // Session timer expiry
  }

  // WebSocket options
  wsOptions?: {
    reconnectionDelay?: number      // Delay between reconnect attempts
    maxReconnectionAttempts?: number
  }
}
```

### AdapterConfig

Configuration for adapter selection.

```typescript
interface AdapterConfig {
  // SIP library to use
  library: 'jssip' | 'sipjs' | 'custom'

  // Custom adapter instance (when library is 'custom')
  customAdapter?: ISipAdapter

  // Library-specific configuration options
  libraryOptions?: Record<string, any>
}
```

### CallOptions

Options for making calls.

```typescript
interface CallOptions {
  // Media constraints
  mediaConstraints?: MediaStreamConstraints

  // Extra SIP headers
  extraHeaders?: string[]

  // Anonymous call (hide caller ID)
  anonymous?: boolean

  // Custom SDP
  customSDP?: string

  // RTCPeerConnection configuration
  pcConfig?: RTCConfiguration
}
```

### AnswerOptions

Options for answering calls.

```typescript
interface AnswerOptions {
  // Media constraints
  mediaConstraints?: MediaStreamConstraints

  // Extra SIP headers
  extraHeaders?: string[]

  // RTCPeerConnection configuration
  pcConfig?: RTCConfiguration
}
```

---

## Error Handling

### AdapterNotSupportedError

Thrown when an operation is not supported by the adapter.

```typescript
import { AdapterNotSupportedError } from 'vuesip/adapters'

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

| Error | Cause | Solution |
|-------|-------|----------|
| `"Adapter not initialized"` | Methods called before `initialize()` | Call `initialize()` first |
| `"Not connected"` | Methods requiring connection | Call `connect()` first |
| `"Not registered"` | Methods requiring registration | Call `register()` first |
| `"Call session not found"` | Invalid call ID | Verify call ID exists |
| `"Connection timeout"` | Server unreachable | Check network/server status |
| `"Registration timeout"` | Server not responding | Check credentials/server |

---

## Custom Adapters

You can create custom adapters for other SIP libraries or custom implementations.

### Implementation Template

```typescript
import { EventEmitter } from 'vuesip/utils'
import type {
  ISipAdapter,
  ICallSession,
  AdapterEvents,
  CallOptions,
  SipClientConfig,
  ConnectionState,
  RegistrationState
} from 'vuesip/adapters'
import { AdapterNotSupportedError } from 'vuesip/adapters'

class MyCustomAdapter extends EventEmitter<AdapterEvents> implements ISipAdapter {
  // Metadata
  readonly adapterName = 'My Custom Adapter'
  readonly adapterVersion = '1.0.0'
  readonly libraryName = 'MyLibrary'
  readonly libraryVersion = '2.0.0'

  // State
  private _connectionState: ConnectionState = ConnectionState.Disconnected
  private _registrationState: RegistrationState = RegistrationState.Unregistered
  private activeSessions = new Map<string, ICallSession>()

  // Connection state
  get isConnected(): boolean {
    return this._connectionState === ConnectionState.Connected
  }

  get connectionState(): ConnectionState {
    return this._connectionState
  }

  // Registration state
  get isRegistered(): boolean {
    return this._registrationState === RegistrationState.Registered
  }

  get registrationState(): RegistrationState {
    return this._registrationState
  }

  // Lifecycle
  async initialize(config: SipClientConfig): Promise<void> {
    // Configure your library
  }

  async connect(): Promise<void> {
    this.emit('connection:connecting', undefined)
    // Implement connection logic
    this._connectionState = ConnectionState.Connected
    this.emit('connection:connected', undefined)
  }

  async disconnect(): Promise<void> {
    // Implement disconnection
    this._connectionState = ConnectionState.Disconnected
    this.emit('connection:disconnected', { reason: 'User initiated' })
  }

  async register(): Promise<void> {
    this.emit('registration:registering', undefined)
    // Implement registration
    this._registrationState = RegistrationState.Registered
    this.emit('registration:registered', { expires: 600 })
  }

  async unregister(): Promise<void> {
    // Implement unregistration
    this._registrationState = RegistrationState.Unregistered
    this.emit('registration:unregistered', undefined)
  }

  // Call methods
  async call(target: string, options?: CallOptions): Promise<ICallSession> {
    // Implement call initiation
    // Return ICallSession implementation
  }

  async sendMessage(target: string, content: string, contentType?: string): Promise<void> {
    // Implement SIP MESSAGE
  }

  async sendDTMF(callId: string, tone: string): Promise<void> {
    const session = this.activeSessions.get(callId)
    if (!session) throw new Error('Session not found')
    await session.sendDTMF(tone)
  }

  // Presence (throw if not supported)
  async subscribe(target: string, event: string, expires?: number): Promise<void> {
    throw new AdapterNotSupportedError('subscribe', this.adapterName, 'Use REST API instead')
  }

  async unsubscribe(target: string, event: string): Promise<void> {
    throw new AdapterNotSupportedError('unsubscribe', this.adapterName)
  }

  async publish(event: string, state: unknown): Promise<void> {
    throw new AdapterNotSupportedError('publish', this.adapterName)
  }

  // Session management
  getActiveCalls(): ICallSession[] {
    return Array.from(this.activeSessions.values())
  }

  getCallSession(callId: string): ICallSession | null {
    return this.activeSessions.get(callId) ?? null
  }

  async destroy(): Promise<void> {
    for (const session of this.activeSessions.values()) {
      await session.terminate()
    }
    await this.unregister()
    await this.disconnect()
    this.removeAllListeners()
  }
}
```

### Using Custom Adapters

```typescript
const customAdapter = new MyCustomAdapter()

const adapter = await AdapterFactory.createAdapter(sipConfig, {
  library: 'custom',
  customAdapter
})
```

---

## Migration Guide

### From Direct JsSIP Usage

If you're migrating from direct JsSIP usage to the adapter pattern:

**Before (Direct JsSIP):**

```typescript
import JsSIP from 'jssip'

const socket = new JsSIP.WebSocketInterface('wss://sip.example.com:7443')
const ua = new JsSIP.UA({
  sockets: [socket],
  uri: 'sip:user@example.com',
  password: 'secret'
})

ua.on('connected', () => { /* ... */ })
ua.on('newRTCSession', (data) => {
  if (data.originator === 'remote') {
    data.session.answer()
  }
})

ua.start()
ua.register()
```

**After (Adapter Pattern):**

```typescript
import { createSipAdapter } from 'vuesip/adapters'

const adapter = await createSipAdapter({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:user@example.com',
  password: 'secret'
})

adapter.on('connection:connected', () => { /* ... */ })
adapter.on('call:incoming', ({ session }) => {
  session.answer()
})

await adapter.connect()
await adapter.register()
```

### Key Differences

| Aspect | Direct JsSIP | Adapter Pattern |
|--------|--------------|-----------------|
| Configuration | JsSIP-specific config object | Unified `SipClientConfig` |
| Event names | `'connected'`, `'newRTCSession'` | `'connection:connected'`, `'call:incoming'` |
| Session handling | Raw JsSIP `RTCSession` | Unified `ICallSession` |
| Library switching | Requires rewriting code | Change `library` parameter |
| Type safety | Partial | Full TypeScript support |

### Event Name Mapping

| JsSIP Event | Adapter Event |
|-------------|---------------|
| `connecting` | `connection:connecting` |
| `connected` | `connection:connected` |
| `disconnected` | `connection:disconnected` |
| `registered` | `registration:registered` |
| `unregistered` | `registration:unregistered` |
| `registrationFailed` | `registration:failed` |
| `newRTCSession` (remote) | `call:incoming` |
| `newRTCSession` (local) | `call:outgoing` |
| `newMessage` | `message:received` |
