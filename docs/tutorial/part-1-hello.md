# Part 1: Hello VueSIP

**Time: 5 minutes** | [Next: Building a Softphone &rarr;](/tutorial/part-2-softphone)

In this first part, you'll make your first call using VueSIP's mock mode - no SIP server required!

## What You'll Build

A minimal "click to call" button that demonstrates the core VueSIP concepts:

- Connecting and registering
- Making an outbound call
- Handling call state changes
- Hanging up

## Step 1: Create the Component

Create a new file `src/components/HelloVueSIP.vue`:

```vue
<script setup lang="ts">
import { useSipMock } from 'vuesip'

// Initialize the mock SIP client
const { isConnected, isRegistered, activeCall, callState, connect, call, hangup } = useSipMock({
  // Simulate realistic delays
  connectDelay: 500, // 500ms to "connect"
  registerDelay: 300, // 300ms to "register"
  ringDelay: 2000, // 2s of ringing
  connectCallDelay: 500, // 500ms to answer
})

// Connect when component mounts
connect()

// Make a call
async function makeCall() {
  try {
    await call('+1-555-123-4567')
  } catch (error) {
    console.error('Call failed:', error)
  }
}
</script>

<template>
  <div class="hello-vuesip">
    <h1>Hello VueSIP!</h1>

    <!-- Connection Status -->
    <div class="status">
      <span v-if="!isConnected">Connecting...</span>
      <span v-else-if="!isRegistered">Registering...</span>
      <span v-else class="ready">Ready to call</span>
    </div>

    <!-- Call Controls -->
    <div v-if="isRegistered" class="controls">
      <button v-if="!activeCall" @click="makeCall" class="call-btn">Call +1-555-123-4567</button>

      <div v-else class="active-call">
        <p>
          Call State: <strong>{{ callState }}</strong>
        </p>
        <p>To: {{ activeCall.remoteNumber }}</p>
        <button @click="hangup" class="hangup-btn">Hang Up</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hello-vuesip {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
  font-family: system-ui, sans-serif;
}

.status {
  margin: 1rem 0;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.ready {
  color: #22c55e;
  font-weight: bold;
}

.controls {
  margin-top: 1rem;
}

.call-btn {
  background: #22c55e;
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 8px;
  cursor: pointer;
}

.call-btn:hover {
  background: #16a34a;
}

.active-call {
  padding: 1rem;
  background: #fef3c7;
  border-radius: 8px;
}

.hangup-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 0.5rem;
}

.hangup-btn:hover {
  background: #dc2626;
}
</style>
```

## Step 2: Use the Component

Update your `App.vue` to use the component:

```vue
<script setup lang="ts">
import HelloVueSIP from './components/HelloVueSIP.vue'
</script>

<template>
  <HelloVueSIP />
</template>
```

## Step 3: Try It Out

Run your dev server and click the call button:

```bash
npm run dev
```

You should see:

1. **"Connecting..."** - Mock connection establishing
2. **"Registering..."** - Mock SIP registration
3. **"Ready to call"** - You can now make calls
4. Click the button and watch the call state change:
   - `calling` - Outbound call initiated
   - `ringing` - Remote party's phone is ringing
   - `active` - Call connected
5. Click "Hang Up" to end the call

## What Just Happened?

Let's break down the key concepts:

### 1. useSipMock

```typescript
const { ... } = useSipMock(options)
```

This composable provides a **mock SIP client** that simulates real SIP behavior. It's perfect for:

- Learning VueSIP without infrastructure
- Unit testing your call handling logic
- Building demos and prototypes

### 2. Connection Flow

```typescript
await connect()
```

Before making calls, you must:

1. **Connect** - Establish WebSocket connection to SIP server
2. **Register** - Authenticate with your credentials

In mock mode, both happen automatically with configurable delays.

### 3. Call Lifecycle

```typescript
await call('+1-555-123-4567')
// ... call is active ...
hangup()
```

A call goes through these states:

```
idle → calling → ringing → active → ended
                    ↓
                 (hangup)
```

### 4. Reactive State

```typescript
isConnected // Ref<boolean> - WebSocket connected?
isRegistered // Ref<boolean> - SIP registered?
activeCall // Ref<MockCall | null> - Current call
callState // ComputedRef<'idle'|'calling'|...>
```

VueSIP uses Vue's reactivity system, so your UI updates automatically when state changes.

## Common Mistakes

::: warning Don't Forget to Connect
Always call `connect()` before attempting to make calls. In real applications, you'd handle this in an `onMounted` hook or a store.
:::

::: warning Error Handling
Always wrap `call()` in try-catch - network issues, busy signals, and rejected calls are common in production.
:::

## What You Learned

- How to install and import VueSIP
- Using mock mode for development without a server
- The connection → registration → call flow
- Basic call state management
- Reactive state updates in Vue

## Next Steps

You've made your first call! But a real softphone needs more:

- A dial pad for entering numbers
- Hold, mute, and transfer buttons
- Duration display
- Incoming call handling

Continue to [Part 2: Building a Softphone](/tutorial/part-2-softphone) to build a complete softphone UI.
