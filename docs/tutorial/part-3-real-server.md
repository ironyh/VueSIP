# Part 3: Real Server Connection

**Time: 10 minutes** | [&larr; Previous](/tutorial/part-2-softphone) | [Next: Advanced Features &rarr;](/tutorial/part-4-advanced)

Time to connect to a real SIP provider and make actual phone calls!

## What You'll Learn

- Choosing a SIP provider
- Getting your credentials
- Configuring VueSIP for production
- Troubleshooting common connection issues

## Choosing a Provider

VueSIP works with any WebRTC-enabled SIP provider. Here are some popular options:

| Provider                     | Strengths                      | Pricing         | Best For         |
| ---------------------------- | ------------------------------ | --------------- | ---------------- |
| [Telnyx](https://telnyx.com) | Developer-friendly, great docs | Pay-as-you-go   | US/Canada focus  |
| [46elks](https://46elks.com) | Simple API, EU-based           | Pay-as-you-go   | European numbers |
| [VoIP.ms](https://voip.ms)   | Low cost, feature-rich         | Very affordable | Budget projects  |
| Your own PBX                 | Full control                   | Self-hosted     | Enterprise       |

::: tip First Time?
We recommend **Telnyx** for beginners - their free trial includes credits and their portal is straightforward.
:::

## Step 1: Get Your Credentials

### Option A: Telnyx

1. Sign up at [portal.telnyx.com](https://portal.telnyx.com)
2. Go to **Voice** → **SIP Connections**
3. Click **Create SIP Connection**
4. Choose **Credential Authentication**
5. Note your **Username** and **Password**

### Option B: 46elks

1. Sign up at [46elks.com](https://46elks.com)
2. Purchase or port a phone number
3. Get the WebRTC secret via API:
   ```bash
   curl -u API_USER:API_PASSWORD \
     https://api.46elks.com/a1/numbers/YOUR_NUMBER
   ```
4. The response includes your `webrtc_secret`

### Option C: Your Own PBX (Asterisk/FreeSWITCH)

Ensure your PBX has:

- WebSocket transport enabled (wss://)
- A SIP user with WebRTC enabled
- Proper TLS certificates

## Step 2: Update Your Softphone

Replace `useSipMock` with `useSipClient`:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

// Configuration - in production, load from env or secure storage
const config = {
  server: 'wss://rtc.telnyx.com', // WebSocket URL
  uri: 'sip:your-username@sip.telnyx.com', // Your SIP URI
  password: 'your-password', // SIP password
  displayName: 'My Softphone', // Caller ID name
}

// Initialize real SIP client
const {
  isConnected,
  isRegistered,
  connectionState,
  registrationState,
  error,
  connect,
  disconnect,
  register,
} = useSipClient(config)

// Call session management
const { activeCall, callState, call, answer, hangup, hold, unhold, sendDtmf } = useCallSession()

// Connect on mount
onMounted(async () => {
  try {
    await connect()
    // Registration happens automatically after connection
  } catch (err) {
    console.error('Connection failed:', err)
  }
})
</script>

<template>
  <div class="softphone">
    <!-- Connection Status -->
    <div class="status-bar">
      <span class="status" :class="connectionState">
        {{ connectionState }}
      </span>
      <span v-if="error" class="error">
        {{ error.message }}
      </span>
    </div>

    <!-- Your existing softphone UI from Part 2 -->
    <div v-if="isRegistered">
      <!-- ... dial pad, call controls, etc ... -->
    </div>

    <div v-else-if="isConnected">Registering with server...</div>

    <div v-else>Connecting to {{ config.server }}...</div>
  </div>
</template>
```

## Step 3: Provider-Specific Configurations

### Telnyx Configuration

```typescript
const telnyxConfig = {
  server: 'wss://rtc.telnyx.com',
  uri: `sip:${username}@sip.telnyx.com`,
  password: password,
  displayName: 'My App',
  // Telnyx-specific options
  iceServers: [{ urls: 'stun:stun.telnyx.com:3478' }],
}
```

### 46elks Configuration

```typescript
const elks46Config = {
  server: 'wss://voip.46elks.com/w1/websocket',
  uri: `sip:${phoneNumber}@voip.46elks.com`,
  password: webrtcSecret,
  // 46elks requires PCMA codec
  mediaConfiguration: {
    audioCodec: 'pcma',
  },
}
```

### Self-Hosted PBX

```typescript
const pbxConfig = {
  server: 'wss://pbx.yourcompany.com:8089/ws',
  uri: `sip:${extension}@pbx.yourcompany.com`,
  password: password,
  realm: 'yourcompany.com',
  // Custom STUN/TURN servers
  iceServers: [
    { urls: 'stun:stun.yourcompany.com:3478' },
    {
      urls: 'turn:turn.yourcompany.com:3478',
      username: 'turnuser',
      credential: 'turnpass',
    },
  ],
}
```

## Step 4: Environment Variables

Never hardcode credentials! Use environment variables:

```typescript
// vite.config.ts loads from .env files
const config = {
  server: import.meta.env.VITE_SIP_SERVER,
  uri: import.meta.env.VITE_SIP_URI,
  password: import.meta.env.VITE_SIP_PASSWORD,
}
```

Create `.env.local` (git-ignored):

```bash
VITE_SIP_SERVER=wss://rtc.telnyx.com
VITE_SIP_URI=sip:myuser@sip.telnyx.com
VITE_SIP_PASSWORD=mysecretpassword
```

## Troubleshooting

### "Connection Failed"

**Check:**

1. WebSocket URL is correct (wss://, not ws://)
2. Your network allows WebSocket connections
3. Provider's service is up

```typescript
// Add detailed logging
import { setLogLevel } from 'vuesip'
setLogLevel('debug')
```

### "Registration Failed" / 403 Forbidden

**Common causes:**

- Wrong username/password
- SIP URI format incorrect
- Account not activated

```typescript
// Double-check your URI format
// Telnyx: sip:username@sip.telnyx.com
// 46elks: sip:46XXXXXXXXX@voip.46elks.com
```

### "No Audio" After Connecting

**Check:**

1. Microphone permissions granted
2. ICE servers configured correctly
3. For 46elks: PCMA codec enabled

```typescript
// Request permissions before connecting
await navigator.mediaDevices.getUserMedia({ audio: true })
```

### CORS Errors

WebSocket connections don't have CORS issues, but if you're calling REST APIs:

```typescript
// Use a backend proxy for API calls
// Never expose API keys in frontend code
```

## Using VueSIP Provider System

VueSIP includes built-in provider configurations:

```typescript
import { useProviderSelector } from 'vuesip'

const {
  providers, // Available provider configs
  selectedProvider, // Currently selected
  selectProvider, // Switch providers
  getCredentialFields, // Get required fields
} = useProviderSelector()

// Get Telnyx config
selectProvider('telnyx')
const fields = getCredentialFields()
// Returns: [{ name: 'username', label: 'SIP Username', ... }, ...]
```

## Complete Example

Here's a production-ready connection component:

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSipClient, useCallSession, setLogLevel } from 'vuesip'

// Enable debug logging in development
if (import.meta.env.DEV) {
  setLogLevel('debug')
}

const config = {
  server: import.meta.env.VITE_SIP_SERVER,
  uri: import.meta.env.VITE_SIP_URI,
  password: import.meta.env.VITE_SIP_PASSWORD,
}

const { isConnected, isRegistered, connectionState, error, connect, disconnect, reconnect } =
  useSipClient(config)

const { activeCall, call, hangup, answer } = useCallSession()

// Auto-reconnect on disconnect
const reconnectAttempts = ref(0)
const maxReconnects = 3

async function handleConnection() {
  try {
    await connect()
    reconnectAttempts.value = 0
  } catch (err) {
    console.error('Connection failed:', err)

    if (reconnectAttempts.value < maxReconnects) {
      reconnectAttempts.value++
      setTimeout(handleConnection, 2000 * reconnectAttempts.value)
    }
  }
}

onMounted(() => {
  handleConnection()
})

onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="phone">
    <div class="connection-status">
      <template v-if="error">
        Connection error: {{ error.message }}
        <button @click="reconnect">Retry</button>
      </template>
      <template v-else-if="!isConnected">
        Connecting...
        <span v-if="reconnectAttempts > 0">
          (Attempt {{ reconnectAttempts }}/{{ maxReconnects }})
        </span>
      </template>
      <template v-else-if="!isRegistered"> Registering... </template>
      <template v-else> Ready </template>
    </div>

    <!-- Your softphone UI here -->
  </div>
</template>
```

## What You Learned

- How to get credentials from different SIP providers
- Configuring VueSIP for production use
- Provider-specific settings (codecs, ICE servers)
- Secure credential management with environment variables
- Troubleshooting common connection issues
- Auto-reconnection patterns

## Next Steps

Your softphone now makes real calls! But there's more to explore:

- **Call Transfer** - Send calls to other extensions
- **Conference Calls** - Multi-party conversations
- **Call Recording** - Save calls locally
- **Advanced Audio** - Noise suppression, echo cancellation

Continue to [Part 4: Advanced Features](/tutorial/part-4-advanced) to complete your softphone.
