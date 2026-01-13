---
title: 'Part 1: Hello VueSIP'
description: 'Make your first simulated SIP call in 5 minutes using mock mode'
---

# Part 1: Hello VueSIP

**Time: 5 minutes** | **Difficulty: Beginner**

In this part, you'll go from zero to making your first simulated call. By the end, you'll understand the core VueSIP concepts and have a working component.

## What You'll Learn

- Installing VueSIP
- Using `useSipMock` for simulated calls
- Reactive call state management
- Basic call operations (connect, call, hangup)

## Step 1: Install VueSIP

First, add VueSIP to your Vue 3 project:

::: code-group

```bash [npm]
npm install vuesip
```

```bash [pnpm]
pnpm add vuesip
```

```bash [yarn]
yarn add vuesip
```

:::

## Step 2: Create Your First Component

Create a new file `HelloVueSIP.vue`:

```vue
<template>
  <div class="hello-vuesip">
    <h2>Hello VueSIP!</h2>

    <!-- Connection Status -->
    <div class="status">
      <span :class="{ connected: isConnected }">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </span>
      <span v-if="isRegistered" class="registered">Registered</span>
    </div>

    <!-- Call State -->
    <div v-if="activeCall" class="call-info">
      <p><strong>Call State:</strong> {{ callState }}</p>
      <p><strong>To:</strong> {{ activeCall.remoteNumber }}</p>
      <p v-if="activeCall.duration > 0"><strong>Duration:</strong> {{ activeCall.duration }}s</p>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button v-if="!isConnected" @click="handleConnect">Connect</button>

      <template v-else>
        <button v-if="callState === 'idle'" @click="handleCall">Call 555-1234</button>

        <button v-if="callState !== 'idle'" @click="handleHangup" class="hangup">Hang Up</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSipMock } from 'vuesip'

// Initialize mock SIP client
const { isConnected, isRegistered, callState, activeCall, connect, call, hangup } = useSipMock()

// Connect to simulated server
async function handleConnect() {
  try {
    await connect()
    console.log('Connected to mock SIP server!')
  } catch (error) {
    console.error('Connection failed:', error)
  }
}

// Make a call
async function handleCall() {
  try {
    const callId = await call('555-1234', 'Test Contact')
    console.log('Call started:', callId)
  } catch (error) {
    console.error('Call failed:', error)
  }
}

// End the call
async function handleHangup() {
  await hangup()
  console.log('Call ended')
}
</script>

<style scoped>
.hello-vuesip {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: system-ui, sans-serif;
}

.status {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-radius: 4px;
}

.status span {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.status .connected {
  background: #dcfce7;
  color: #166534;
}

.status .registered {
  background: #dbeafe;
  color: #1e40af;
}

.call-info {
  padding: 1rem;
  background: #f0fdf4;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.call-info p {
  margin: 0.25rem 0;
}

.controls {
  display: flex;
  gap: 0.5rem;
}

button {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  background: #3b82f6;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #2563eb;
}

button.hangup {
  background: #ef4444;
}

button.hangup:hover {
  background: #dc2626;
}
</style>
```

## Step 3: Add to Your App

Import and use the component in your App.vue or any parent component:

```vue
<template>
  <HelloVueSIP />
</template>

<script setup lang="ts">
import HelloVueSIP from './components/HelloVueSIP.vue'
</script>
```

## Step 4: Run and Test

Start your development server and try it out:

```bash
npm run dev
```

1. Click **Connect** - Watch the status change to "Connected" then "Registered"
2. Click **Call 555-1234** - Watch the call state progress: `calling` -> `ringing` -> `active`
3. Click **Hang Up** - The call ends and state returns to `idle`

::: tip Watch the Console
Open your browser's developer console to see the log messages and understand the call lifecycle.
:::

## Understanding the Code

Let's break down the key concepts:

### The useSipMock Composable

```typescript
const {
  isConnected, // Ref<boolean> - WebSocket connection state
  isRegistered, // Ref<boolean> - SIP registration state
  callState, // ComputedRef<MockCallState> - Current call state
  activeCall, // Ref<MockCall | null> - Active call details
  connect, // () => Promise<void> - Connect to server
  call, // (number, displayName?) => Promise<string> - Make call
  hangup, // () => Promise<void> - End call
} = useSipMock()
```

### Reactive State

All state is reactive - your template automatically updates when:

- Connection status changes
- Call state transitions (idle -> calling -> ringing -> active)
- Call duration increments

### Call States

The `callState` computed property returns one of:

| State     | Description                               |
| --------- | ----------------------------------------- |
| `idle`    | No active call                            |
| `calling` | Outbound call initiated, waiting for ring |
| `ringing` | Remote party's phone is ringing           |
| `active`  | Call is connected                         |
| `held`    | Call is on hold                           |
| `ended`   | Call has terminated                       |

## What You Learned

- **Installation**: Adding VueSIP to a Vue 3 project
- **useSipMock**: The mock mode composable for learning and testing
- **Reactive State**: How VueSIP exposes reactive refs and computed properties
- **Call Operations**: Basic connect, call, and hangup operations

## Common Mistakes

::: warning Forgetting `await`
Always `await` the async operations. Without it, you might check state before the operation completes:

```typescript
// Wrong - state checked before connect completes
connect()
console.log(isConnected.value) // false!

// Correct
await connect()
console.log(isConnected.value) // true!
```

:::

::: warning Calling Before Connected
Attempting to make a call before connecting throws an error:

```typescript
// Wrong - not connected yet
await call('555-1234') // Error: Not connected to SIP server

// Correct
await connect()
await call('555-1234') // Works!
```

:::

::: warning Checking isConnected Before Registration
The mock server has two states - connected and registered. You need both for calls:

```typescript
// isConnected = true means WebSocket is open
// isRegistered = true means you can make/receive calls
if (isConnected.value && isRegistered.value) {
  // Safe to make calls
}
```

:::

## Try It: Exercises

Before moving to Part 2, try these exercises to reinforce your learning:

### Exercise 1: Display Call Progress

Add a visual indicator that shows the call state transitions with different colors:

- `calling` - Yellow
- `ringing` - Blue
- `active` - Green

::: details Solution

```vue
<div :class="['call-state', callState]">
  {{ callState }}
</div>

<style scoped>
.call-state.calling {
  background: #fef3c7;
  color: #92400e;
}
.call-state.ringing {
  background: #dbeafe;
  color: #1e40af;
}
.call-state.active {
  background: #dcfce7;
  color: #166534;
}
</style>
```

:::

### Exercise 2: Add a Disconnect Button

Add a button that disconnects from the mock server:

::: details Solution

```vue
<button @click="disconnect">Disconnect</button>

<script setup lang="ts">
const { disconnect /* ... */ } = useSipMock()
</script>
```

:::

### Exercise 3: Custom Ring Delay

Configure the mock to have a longer ring delay (5 seconds instead of default 3):

::: details Solution

```typescript
const {
  /* ... */
} = useSipMock({
  ringDelay: 5000, // 5 seconds
})
```

:::

## Next Steps

Congratulations! You've made your first VueSIP call. In Part 2, we'll build a complete softphone with a dial pad, call controls, and proper UI.

<div style="display: flex; justify-content: space-between; margin-top: 2rem;">
  <a href="/tutorial/">Back to Overview</a>
  <a href="/tutorial/part-2-softphone">Part 2: Building a Softphone</a>
</div>
