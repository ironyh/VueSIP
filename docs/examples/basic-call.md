# Basic Audio Call

A complete example of one-to-one audio calling with connection management.

::: tip Try It Live
Run `pnpm dev` → Navigate to **BasicCallDemo** in the playground
:::

## Overview

The basic call demo shows how to:

- Connect to a SIP server
- Register your extension
- Make outbound calls
- Receive incoming calls
- Track call state and duration

## Quick Start

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

// SIP connection
const { connect, disconnect, isConnected, isRegistered, error } = useSipClient()

// Call management
const { currentCall, makeCall, answer, hangup, callDuration } = useCallSession()

// Form state
const credentials = ref({
  uri: 'sip:1000@example.com',
  password: '',
  server: 'wss://sip.example.com:8089/ws',
})
const targetNumber = ref('')

// Computed
const callState = computed(() => currentCall.value?.state ?? 'idle')
const isInCall = computed(() => ['ringing', 'answered', 'connecting'].includes(callState.value))

// Actions
async function handleConnect() {
  await connect(credentials.value)
}

async function handleCall() {
  if (targetNumber.value && isRegistered.value) {
    await makeCall(targetNumber.value)
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="call-demo">
    <!-- Connection Form -->
    <section v-if="!isConnected" class="connection-form">
      <h3>Connect to SIP Server</h3>
      <input v-model="credentials.uri" placeholder="SIP URI (sip:1000@example.com)" />
      <input v-model="credentials.password" type="password" placeholder="Password" />
      <input v-model="credentials.server" placeholder="WebSocket Server" />
      <button @click="handleConnect">Connect</button>
      <p v-if="error" class="error">{{ error.message }}</p>
    </section>

    <!-- Connected State -->
    <section v-else class="call-interface">
      <div class="status">
        <span class="indicator" :class="{ active: isRegistered }"></span>
        {{ isRegistered ? 'Registered' : 'Connecting...' }}
      </div>

      <!-- Dialpad -->
      <div v-if="!isInCall" class="dialpad">
        <input
          v-model="targetNumber"
          placeholder="Enter number to call"
          @keyup.enter="handleCall"
        />
        <button @click="handleCall" :disabled="!targetNumber || !isRegistered">Call</button>
      </div>

      <!-- Active Call -->
      <div v-else class="active-call">
        <p class="call-status">{{ callState }}</p>
        <p class="duration">{{ formatDuration(callDuration) }}</p>

        <div class="call-actions">
          <button v-if="callState === 'ringing'" @click="answer" class="answer">Answer</button>
          <button @click="hangup" class="hangup">Hang Up</button>
        </div>
      </div>

      <button @click="disconnect" class="disconnect">Disconnect</button>
    </section>
  </div>
</template>
```

## Features

- **SIP Client Connection**: WebSocket-based SIP connection with TLS
- **Registration**: Automatic SIP REGISTER with configurable expiry
- **Outbound Calls**: Make calls to any SIP URI or phone number
- **Inbound Calls**: Receive and answer incoming calls
- **Call State Tracking**: Real-time call state updates
- **Duration Display**: Live call timer with formatted output
- **Error Handling**: Comprehensive error feedback

## Key Composables

| Composable       | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| `useSipClient`   | Connection, registration, and session management |
| `useCallSession` | Call lifecycle, state, and actions               |

## Call States

| State        | Description                          |
| ------------ | ------------------------------------ |
| `idle`       | No active call                       |
| `connecting` | Outbound call being established      |
| `ringing`    | Incoming call waiting to be answered |
| `answered`   | Call is active                       |
| `ended`      | Call has terminated                  |

## Error Handling

```typescript
const { error } = useSipClient()

watch(error, (newError) => {
  if (newError) {
    console.error('SIP Error:', newError.code, newError.message)
    // Show user-friendly error message
  }
})
```

## Related

- [Quick Start](/examples/quick-start)
- [Video Calling](/examples/video-call)
- [Call Controls Guide](/guide/call-controls)
- [API: useSipClient](/api/composables#usesipclient)
- [API: useCallSession](/api/composables#usecallsession)
