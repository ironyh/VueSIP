# Quick Start

Get up and running with VueSip in under 3 minutes.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#basic-call) or run `pnpm dev` → Navigate to **BasicCallDemo** in the playground
:::

## Installation

```bash
# Using pnpm (recommended)
pnpm add vuesip

# Using npm
npm install vuesip

# Using yarn
yarn add vuesip
```

## Basic Setup

### 1. Create a SIP Connection

```vue
<script setup lang="ts">
import { useSipClient } from 'vuesip'

const { connect, disconnect, isConnected, isRegistered, error } = useSipClient()

// Connect to your SIP server
async function handleConnect() {
  await connect({
    uri: 'sip:1000@your-pbx.com',
    password: 'your-password',
    server: 'wss://your-pbx.com:8089/ws',
  })
}
</script>

<template>
  <div>
    <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
    <p>Registered: {{ isRegistered ? 'Yes' : 'No' }}</p>
    <button @click="handleConnect">Connect</button>
    <button @click="disconnect">Disconnect</button>
  </div>
</template>
```

### 2. Make Your First Call

```vue
<script setup lang="ts">
import { useSipClient, useCallSession } from 'vuesip'

const { isRegistered } = useSipClient()
const { currentCall, makeCall, hangup, answer } = useCallSession()

const targetNumber = ref('')

async function dial() {
  if (targetNumber.value) {
    await makeCall(targetNumber.value)
  }
}
</script>

<template>
  <div v-if="isRegistered">
    <input v-model="targetNumber" placeholder="Enter number" />
    <button @click="dial" :disabled="!targetNumber">Call</button>

    <div v-if="currentCall">
      <p>Call Status: {{ currentCall.state }}</p>
      <button @click="hangup">Hang Up</button>
    </div>
  </div>
</template>
```

## What's Next?

Now that you have a basic call working, explore these features:

| Feature       | Guide                                       | Example                                       |
| ------------- | ------------------------------------------- | --------------------------------------------- |
| Video Calling | [Video Guide](/guide/video-calling)         | [Video Demo](/examples/video-call)            |
| Call Quality  | [Quality Guide](/guide/call-quality)        | [Quality Demo](/examples/call-quality)        |
| Transcription | [Transcription Guide](/guide/transcription) | [Transcription Demo](/examples/transcription) |
| Multi-Line    | [Multi-Line Guide](/guide/multi-line)       | [Multi-Line Demo](/examples/multi-line)       |

## Key Composables

| Composable        | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `useSipClient`    | SIP connection and registration management |
| `useCallSession`  | Call state, making/answering calls         |
| `useMediaDevices` | Audio/video device selection               |

## Related

- [Getting Started Guide](/guide/getting-started)
- [API: useSipClient](/api/composables#usesipclient)
- [Learning Paths](/examples/learning-paths)
