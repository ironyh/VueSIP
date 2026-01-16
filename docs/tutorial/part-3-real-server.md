---
title: 'Part 3: Real Server Connection'
description: 'Connect your softphone to a real SIP provider and make actual calls'
---

# Part 3: Real Server Connection

**Time: 10 minutes** | **Difficulty: Intermediate**

You've built a complete softphone in mock mode. Now let's connect it to a real SIP server and make actual phone calls.

## What You'll Learn

- Differences between mock and real mode
- Choosing a SIP provider
- Configuring real SIP credentials
- Handling real-world connection issues
- Testing with actual calls

## Mock Mode vs Real Mode

Here's what changes when moving from mock to real:

| Aspect           | Mock Mode        | Real Mode         |
| ---------------- | ---------------- | ----------------- |
| **Composable**   | `useSipMock`     | `useSipClient`    |
| **Connection**   | Simulated delays | Real WebSocket    |
| **Registration** | Simulated        | Real SIP REGISTER |
| **Calls**        | State simulation | Real WebRTC audio |
| **DTMF**         | Logged only      | Actual tones sent |
| **Credentials**  | None needed      | Required          |

The great news: **your UI code stays exactly the same!** Only the composable import changes.

## Step 1: Choose a SIP Provider

You need a SIP provider to make real calls. Here are popular options:

### Recommended Providers

| Provider                         | Best For        | WebSocket Support | Pricing          |
| -------------------------------- | --------------- | ----------------- | ---------------- |
| [Telnyx](https://telnyx.com)     | Production apps | Yes               | Pay-per-use      |
| [VoIP.ms](https://voip.ms)       | Budget-friendly | Yes               | Low rates        |
| [Twilio](https://twilio.com)     | Enterprise      | Yes (Elastic SIP) | Premium          |
| [Asterisk](https://asterisk.org) | Self-hosted     | Yes (with config) | Free (self-host) |

::: tip Start with Telnyx
For this tutorial, we recommend **Telnyx**. They offer:

- Free trial credits
- Excellent WebSocket support
- Simple setup process
- Good documentation
  :::

## Step 2: Get Your Credentials

### Telnyx Setup

1. **Create Account**: Sign up at [telnyx.com](https://telnyx.com)
2. **Get a Number**: Purchase a phone number ($1/month)
3. **Create SIP Connection**:
   - Go to Voice > SIP Connections
   - Click "Add SIP Connection"
   - Choose "Credentials" authentication
   - Note your username and password

4. **Get WebSocket URL**: Telnyx WebSocket endpoint:
   ```
   wss://sip.telnyx.com:7443
   ```

### VoIP.ms Setup

1. **Create Account**: Sign up at [voip.ms](https://voip.ms)
2. **Create Sub Account**:
   - Go to Main Menu > Sub Accounts
   - Create a new sub account
   - Enable "WebRTC/WebSocket" in allowed protocols

3. **Get Credentials**:
   - Username: Your sub account username
   - Password: Your sub account password
   - Server: `wss://toronto1.voip.ms:5061` (or your closest server)

### Self-Hosted Asterisk

If you have your own Asterisk server:

1. Enable WebSocket in `http.conf`:

   ```ini
   [general]
   enabled=yes
   bindaddr=0.0.0.0
   bindport=8088

   [websocket]
   enabled=yes
   ```

2. Configure PJSIP endpoint with WebSocket transport

3. Use your server's WebSocket URL:
   ```
   wss://your-server.com:8089/ws
   ```

## Step 3: Update Your Component

Replace `useSipMock` with `useSipClient`:

```vue
<script setup lang="ts">
// Before: Mock mode
// import { useSipMock } from 'vuesip'
// const { ... } = useSipMock()

// After: Real mode
import { useSipClient } from 'vuesip'

const { isConnected, isRegistered, error, connect, disconnect, register } = useSipClient({
  // WebSocket URI of your SIP provider
  uri: 'wss://sip.telnyx.com:7443',

  // Your SIP identity
  sipUri: 'sip:your-username@sip.telnyx.com',

  // Authentication
  password: 'your-password',

  // Display name (shown to people you call)
  displayName: 'My Softphone',

  // Optional: Auto-register after connection
  registrationOptions: {
    autoRegister: true,
    expires: 300,
  },
})

// Connect and register
async function handleConnect() {
  try {
    await connect()
    console.log('Connected to SIP server!')
  } catch (err) {
    console.error('Connection failed:', err)
  }
}
</script>
```

## Step 4: Handle Call Sessions

For calls, use `useCallSession` with the real SIP client:

```vue
<script setup lang="ts">
import { useSipClient, useCallSession } from 'vuesip'

// Initialize SIP client
const sipClient = useSipClient({
  uri: 'wss://sip.telnyx.com:7443',
  sipUri: 'sip:your-username@sip.telnyx.com',
  password: 'your-password',
})

// Initialize call session
const {
  session,
  state,
  isActive,
  isMuted,
  isOnHold,
  duration,
  remoteUri,
  makeCall,
  answerCall,
  hangup,
  toggleMute,
  toggleHold,
} = useCallSession()

// Make a call
async function handleCall(number: string) {
  try {
    await makeCall(`sip:${number}@sip.telnyx.com`, {
      audio: true,
      video: false,
    })
  } catch (err) {
    console.error('Call failed:', err)
  }
}
</script>
```

## Step 5: Configure STUN/TURN

For calls to work through NAT/firewalls, configure STUN/TURN servers:

```typescript
const sipClient = useSipClient({
  uri: 'wss://sip.telnyx.com:7443',
  sipUri: 'sip:your-username@sip.telnyx.com',
  password: 'your-password',

  // Critical for real calls!
  rtcConfiguration: {
    // STUN servers (free, for NAT discovery)
    stunServers: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],

    // TURN servers (for difficult NAT scenarios)
    // You may need to use your provider's TURN servers
    turnServers: [
      {
        urls: 'turn:turn.telnyx.com:3478',
        username: 'your-turn-username',
        credential: 'your-turn-credential',
      },
    ],
  },
})
```

::: warning STUN/TURN is Critical
Without STUN/TURN configuration, calls may:

- Connect but have no audio
- Work on some networks but not others
- Fail behind corporate firewalls

Always configure these for production!
:::

## Step 6: Handle Real-World Errors

Real connections can fail. Handle errors gracefully:

```typescript
import { watch } from 'vue'

const { isConnected, error, connectionState } = useSipClient(config)

// Watch for connection state changes
watch(connectionState, (state) => {
  switch (state) {
    case 'connecting':
      showNotification('Connecting to server...')
      break
    case 'connected':
      showNotification('Connected!')
      break
    case 'disconnected':
      showNotification('Disconnected')
      break
    case 'failed':
      showNotification('Connection failed')
      break
  }
})

// Watch for errors
watch(error, (err) => {
  if (err) {
    console.error('SIP Error:', err)

    // Handle specific error types
    if (err.message.includes('Authentication')) {
      showError('Invalid credentials. Please check your username and password.')
    } else if (err.message.includes('Network')) {
      showError('Network error. Check your internet connection.')
    } else if (err.message.includes('Registration')) {
      showError('Registration failed. Your account may not be configured correctly.')
    } else {
      showError('An error occurred. Please try again.')
    }
  }
})
```

## Step 7: Request Microphone Permissions

Real calls need microphone access:

```typescript
import { useMediaDevices } from 'vuesip'

const { hasAudioPermission, requestPermissions, audioInputDevices } = useMediaDevices()

// Request permissions before first call
async function ensurePermissions() {
  if (!hasAudioPermission.value) {
    try {
      await requestPermissions(true, false) // audio: true, video: false
      console.log('Microphone permission granted')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showError('Microphone access denied. Please enable in browser settings.')
      } else if (err.name === 'NotFoundError') {
        showError('No microphone found. Please connect a microphone.')
      }
      return false
    }
  }
  return true
}

// Call this before making calls
async function handleCall(number: string) {
  const hasPermission = await ensurePermissions()
  if (!hasPermission) return

  await makeCall(`sip:${number}@provider.com`)
}
```

## Complete Example: Real Softphone

Here's the softphone from Part 2, updated for real mode:

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSipClient, useCallSession, useMediaDevices } from 'vuesip'

// Configuration - replace with your credentials
const config = {
  uri: import.meta.env.VITE_SIP_URI || 'wss://sip.telnyx.com:7443',
  sipUri: import.meta.env.VITE_SIP_USER || 'sip:user@sip.telnyx.com',
  password: import.meta.env.VITE_SIP_PASSWORD || '',
  displayName: 'My Softphone',
  rtcConfiguration: {
    stunServers: ['stun:stun.l.google.com:19302'],
  },
}

// Initialize composables
const {
  isConnected,
  isRegistered,
  error: connectionError,
  connect,
  disconnect,
} = useSipClient(config)

const {
  state: callState,
  isActive,
  isMuted,
  isOnHold,
  duration,
  session,
  makeCall,
  answerCall,
  hangup,
  toggleMute,
  toggleHold,
} = useCallSession()

const { hasAudioPermission, requestPermissions } = useMediaDevices()

// Local state
const dialNumber = ref('')
const localError = ref<string | null>(null)

// Computed
const error = computed(() => localError.value || connectionError.value?.message)

// Methods
async function handleConnect() {
  localError.value = null
  try {
    await connect()
  } catch (err) {
    localError.value = 'Failed to connect. Check your credentials.'
  }
}

async function handleCall() {
  if (!dialNumber.value) return

  // Ensure microphone permission
  if (!hasAudioPermission.value) {
    try {
      await requestPermissions(true, false)
    } catch (err) {
      localError.value = 'Microphone access required for calls.'
      return
    }
  }

  try {
    // Format number with provider domain
    const target = `sip:${dialNumber.value}@sip.telnyx.com`
    await makeCall(target, { audio: true, video: false })
    dialNumber.value = ''
  } catch (err) {
    localError.value = 'Failed to start call.'
  }
}

async function handleAnswer() {
  try {
    await answerCall({ audio: true, video: false })
  } catch (err) {
    localError.value = 'Failed to answer call.'
  }
}

async function handleHangup() {
  try {
    await hangup()
  } catch (err) {
    localError.value = 'Failed to end call.'
  }
}

// Watch for incoming calls
watch(session, (newSession) => {
  if (newSession?.direction === 'incoming' && callState.value === 'ringing') {
    // Show incoming call notification
    console.log('Incoming call from:', newSession.remoteUri)
  }
})
</script>
```

## Environment Variables

Store credentials securely using environment variables:

```bash
# .env.local (never commit this file!)
VITE_SIP_URI=wss://sip.telnyx.com:7443
VITE_SIP_USER=sip:your-username@sip.telnyx.com
VITE_SIP_PASSWORD=your-secure-password
```

Access in your code:

```typescript
const config = {
  uri: import.meta.env.VITE_SIP_URI,
  sipUri: import.meta.env.VITE_SIP_USER,
  password: import.meta.env.VITE_SIP_PASSWORD,
}
```

::: danger Security Warning
**Never commit credentials to git!**

- Add `.env.local` to `.gitignore`
- Use environment variables for all secrets
- In production, use secure secret management
  :::

## Testing Your Real Connection

### Test 1: Connection

1. Click Connect
2. Watch for "Connected" then "Registered" status
3. Check browser console for any errors

### Test 2: Outbound Call

1. Enter a real phone number (your cell phone)
2. Click Call
3. Answer on your phone
4. Test mute/hold
5. Hang up from either end

### Test 3: Inbound Call

1. Call your SIP number from another phone
2. Answer in your softphone
3. Verify audio works both ways
4. Test call controls

## Troubleshooting

### No Audio

**Symptoms**: Call connects but no sound

**Solutions**:

1. Check STUN/TURN configuration
2. Verify microphone permissions granted
3. Check if firewall blocks WebRTC ports
4. Try different STUN servers

### Registration Failed

**Symptoms**: Connected but not registered

**Solutions**:

1. Verify username and password
2. Check SIP URI format (must be `sip:user@domain`)
3. Ensure account is active with provider
4. Check provider's WebSocket is enabled

### Connection Refused

**Symptoms**: Cannot connect at all

**Solutions**:

1. Verify WebSocket URI (wss:// not ws://)
2. Check port number is correct
3. Ensure HTTPS is being used (required for WebSocket)
4. Test WebSocket connection with browser tools

## What You Learned

- **Provider Selection**: Choosing and configuring a SIP provider
- **Real Credentials**: Securely managing SIP credentials
- **STUN/TURN**: Configuring ICE servers for NAT traversal
- **Error Handling**: Managing real-world connection issues
- **Permissions**: Handling microphone permission requests
- **Environment Variables**: Keeping credentials secure

## Next Steps

Your softphone can now make real calls! In Part 4, we'll add advanced features like call transfers, conference calling, and real-time transcription.

<div style="display: flex; justify-content: space-between; margin-top: 2rem;">
  <a href="/tutorial/part-2-softphone">Back to Part 2</a>
  <a href="/tutorial/part-4-advanced">Part 4: Advanced Features</a>
</div>
