# Migration Guide

This guide helps you migrate to VueSip from other SIP libraries or between VueSip versions.

## Migrating to VueSip 1.0

### From JsSIP Direct Usage

If you're migrating from using JsSIP directly, VueSip provides a much cleaner Vue-native API.

**Before (JsSIP directly):**

```javascript
import JsSIP from 'jssip'

const socket = new JsSIP.WebSocketInterface('wss://sip.example.com')
const ua = new JsSIP.UA({
  sockets: [socket],
  uri: 'sip:alice@example.com',
  password: 'secret'
})

ua.start()

ua.on('registered', () => {
  console.log('Registered!')
})

ua.on('newRTCSession', (data) => {
  const session = data.session
  if (data.originator === 'remote') {
    // Handle incoming call
    session.answer()
  }
})

// Make a call
const session = ua.call('sip:bob@example.com', {
  mediaConstraints: { audio: true, video: false }
})
```

**After (VueSip):**

```vue
<script setup>
import { useSipClient, useCallSession } from 'vuesip'

const { connect, isConnected, isRegistered } = useSipClient({
  uri: 'sip:alice@example.com',
  password: 'secret',
  wsServers: ['wss://sip.example.com']
}, { autoConnect: true })

const { makeCall, answer, currentCall } = useCallSession()

// Reactive state - no event listeners needed
watch(isRegistered, (registered) => {
  if (registered) console.log('Registered!')
})

// Handle incoming calls reactively
watch(currentCall, (call) => {
  if (call?.direction === 'incoming') {
    await answer()
  }
})

// Make a call
await makeCall('sip:bob@example.com')
</script>
```

**Key differences:**
- Reactive state instead of event callbacks
- Vue Composition API patterns
- Automatic cleanup on component unmount
- TypeScript support out of the box

### From SIP.js

If you're migrating from SIP.js, the concepts are similar but VueSip uses JsSIP under the hood.

**Before (SIP.js):**

```javascript
import { UserAgent, Registerer } from 'sip.js'

const userAgent = new UserAgent({
  uri: UserAgent.makeURI('sip:alice@example.com'),
  authorizationPassword: 'secret',
  transportOptions: {
    server: 'wss://sip.example.com'
  }
})

await userAgent.start()

const registerer = new Registerer(userAgent)
await registerer.register()

// Make call
const target = UserAgent.makeURI('sip:bob@example.com')
const inviter = new Inviter(userAgent, target)
await inviter.invite()
```

**After (VueSip):**

```typescript
import { useSipClient, useCallSession } from 'vuesip'

const { connect, register, isRegistered } = useSipClient({
  uri: 'sip:alice@example.com',
  password: 'secret',
  wsServers: ['wss://sip.example.com']
})

const { makeCall } = useCallSession()

await connect()
await register()
await makeCall('sip:bob@example.com')
```

### From Custom WebRTC Implementation

If you built a custom WebRTC implementation, VueSip handles all the complexity:

**What VueSip handles for you:**
- SIP signaling (REGISTER, INVITE, BYE, etc.)
- WebRTC peer connection management
- ICE candidate gathering and exchange
- Media negotiation (SDP offer/answer)
- SRTP encryption
- Codec negotiation
- DTMF sending
- Hold/resume/transfer

**Migration steps:**
1. Remove your custom SIP/WebRTC code
2. Install VueSip: `npm install vuesip`
3. Use VueSip composables for all SIP operations
4. Keep your UI components, just wire them to VueSip

## Version Migration Notes

### 1.0.0 (Initial Release)

This is the first stable release. If upgrading from pre-release versions:

- **Breaking:** Config structure changed - see [Configuration](/guide/getting-started#configuration)
- **Breaking:** `useSipConnection` renamed to `useSipClient`
- **New:** AMI composables added (`useAmi`, `useAmiQueues`, etc.)
- **New:** `useAudioDevices` composable for simplified audio device selection
- **New:** `useSipDtmf` low-level composable for custom DTMF handling
- **Improved:** Better TypeScript types and exports

### Upgrading Dependencies

VueSip 1.0 requires:
- Vue 3.4.0+
- Node.js 20.0.0+
- Modern browser with WebRTC support

```bash
# Update Vue if needed
npm install vue@^3.4.0

# Install VueSip
npm install vuesip@^1.0.0
```

## Configuration Migration

### Old Config Format (Pre-1.0)

```typescript
// Pre-1.0 (deprecated)
useSipConnection({
  server: 'sip.example.com',
  user: 'alice',
  pass: 'secret'
})
```

### New Config Format (1.0+)

```typescript
// 1.0+ format
useSipClient({
  uri: 'sip:alice@example.com',
  password: 'secret',
  wsServers: ['wss://sip.example.com:7443']
})
```

## API Changes Reference

| Old API (Pre-1.0) | New API (1.0+) | Notes |
|-------------------|----------------|-------|
| `useSipConnection` | `useSipClient` | Renamed |
| `config.server` | `config.wsServers` | Now accepts array |
| `config.user` | `config.uri` | Full SIP URI required |
| `config.pass` | `config.password` | Renamed |
| `session.dtmf()` | `useDTMF()` composable | Separate composable |
| N/A | `useAudioDevices()` | New composable |
| N/A | `useAmi*()` composables | New AMI integration |

## Getting Help

If you encounter issues during migration:

1. Check the [FAQ](/faq) for common issues
2. Read the [Troubleshooting](/faq#troubleshooting) section
3. Ask on [GitHub Discussions](https://github.com/ironyh/VueSip/discussions)
4. [Report bugs](https://github.com/ironyh/VueSip/issues)

## Next Steps

After migration:

- [Getting Started Guide](/guide/getting-started) - Full setup walkthrough
- [API Reference](/api/) - Complete API documentation
- [Examples](/examples/) - Working code examples
