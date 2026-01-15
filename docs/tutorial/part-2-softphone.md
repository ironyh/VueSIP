# Part 2: Building a Softphone UI

**Time: 15 minutes** | [&larr; Previous](/tutorial/part-1-hello) | [Next: Real Server &rarr;](/tutorial/part-3-real-server)

Now that you can make basic calls, let's build a complete softphone with dial pad, call controls, and incoming call handling.

## What You'll Build

A fully-featured softphone with:

- Dial pad for entering numbers
- Call/Hangup button
- Hold and Mute controls
- Call duration timer
- Incoming call notifications
- DTMF tone sending

## Step 1: Create the Dial Pad

Create `src/components/DialPad.vue`:

```vue
<script setup lang="ts">
defineEmits<{
  digit: [digit: string]
}>()

const keys = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
]
</script>

<template>
  <div class="dial-pad">
    <div v-for="(row, i) in keys" :key="i" class="row">
      <button v-for="digit in row" :key="digit" class="key" @click="$emit('digit', digit)">
        {{ digit }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.dial-pad {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 200px;
  margin: 0 auto;
}

.row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.key {
  width: 60px;
  height: 60px;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  background: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: background 0.15s;
}

.key:hover {
  background: #f3f4f6;
}

.key:active {
  background: #e5e7eb;
}
</style>
```

## Step 2: Create the Softphone Component

Create `src/components/Softphone.vue`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSipMock } from 'vuesip'
import DialPad from './DialPad.vue'

// Initialize mock SIP with incoming call simulation
const {
  isConnected,
  isRegistered,
  activeCall,
  callState,
  connect,
  call,
  hangup,
  answer,
  hold,
  unhold,
  sendDTMF,
  simulateIncomingCall,
} = useSipMock({
  connectDelay: 500,
  ringDelay: 2000,
  connectCallDelay: 500,
})

// Local state
const phoneNumber = ref('')
const isMuted = ref(false)
const duration = ref(0)
let durationInterval: ReturnType<typeof setInterval> | null = null

// Computed properties
const canDial = computed(() => isRegistered.value && !activeCall.value)
const isOnHold = computed(() => callState.value === 'held')
const isRinging = computed(
  () => callState.value === 'ringing' && activeCall.value?.direction === 'inbound'
)

// Duration timer
watch(callState, (state) => {
  if (state === 'active') {
    duration.value = 0
    durationInterval = setInterval(() => {
      duration.value++
    }, 1000)
  } else if (state === 'idle' || state === 'ended') {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
  }
})

// Format duration as MM:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Handle dial pad input
function handleDigit(digit: string) {
  if (activeCall.value && callState.value === 'active') {
    // Send DTMF during active call
    sendDTMF(digit)
  } else {
    // Add to phone number
    phoneNumber.value += digit
  }
}

// Make outbound call
async function makeCall() {
  if (!phoneNumber.value) return
  try {
    await call(phoneNumber.value)
    phoneNumber.value = ''
  } catch (error) {
    console.error('Call failed:', error)
  }
}

// Toggle mute
function toggleMute() {
  isMuted.value = !isMuted.value
  // In real implementation, this would mute the audio track
  console.log('Mute:', isMuted.value)
}

// Toggle hold
async function toggleHold() {
  if (isOnHold.value) {
    await unhold()
  } else {
    await hold()
  }
}

// Simulate incoming call (for demo)
function simulateCall() {
  simulateIncomingCall('+1-800-555-0199', 'John Smith')
}

// Connect on mount
onMounted(() => {
  connect()
})

// Cleanup
onUnmounted(() => {
  if (durationInterval) {
    clearInterval(durationInterval)
  }
})
</script>

<template>
  <div class="softphone">
    <div class="header">
      <h2>VueSIP Softphone</h2>
      <div class="connection-status">
        <span class="indicator" :class="{ connected: isRegistered }" />
        {{ isRegistered ? 'Ready' : 'Connecting...' }}
      </div>
    </div>

    <!-- Incoming Call Banner -->
    <div v-if="isRinging" class="incoming-call">
      <div class="caller-info">
        <span class="caller-name">
          {{ activeCall?.remoteDisplayName || 'Unknown' }}
        </span>
        <span class="caller-number">
          {{ activeCall?.remoteNumber }}
        </span>
      </div>
      <div class="incoming-actions">
        <button class="answer-btn" @click="answer">Answer</button>
        <button class="reject-btn" @click="hangup">Reject</button>
      </div>
    </div>

    <!-- Active Call Display -->
    <div v-else-if="activeCall" class="active-call">
      <div class="call-info">
        <span class="remote-party">
          {{ activeCall.remoteDisplayName || activeCall.remoteNumber }}
        </span>
        <span class="call-status" :class="callState">
          {{ callState }}
        </span>
        <span v-if="callState === 'active'" class="duration">
          {{ formatDuration(duration) }}
        </span>
      </div>

      <!-- Call Controls -->
      <div class="call-controls">
        <button
          class="control-btn"
          :class="{ active: isMuted }"
          @click="toggleMute"
          :disabled="callState !== 'active'"
        >
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>
        <button
          class="control-btn"
          :class="{ active: isOnHold }"
          @click="toggleHold"
          :disabled="callState !== 'active' && !isOnHold"
        >
          {{ isOnHold ? 'Resume' : 'Hold' }}
        </button>
        <button class="hangup-btn" @click="hangup">End Call</button>
      </div>

      <!-- DTMF Pad (during call) -->
      <div v-if="callState === 'active'" class="dtmf-section">
        <p class="dtmf-hint">Tap keys to send DTMF</p>
        <DialPad @digit="handleDigit" />
      </div>
    </div>

    <!-- Dial Screen (when idle) -->
    <div v-else class="dial-screen">
      <input
        v-model="phoneNumber"
        class="phone-input"
        placeholder="Enter number..."
        type="tel"
        @keyup.enter="makeCall"
      />

      <DialPad @digit="handleDigit" />

      <div class="dial-actions">
        <button class="call-btn" :disabled="!canDial || !phoneNumber" @click="makeCall">
          Call
        </button>
        <button class="clear-btn" @click="phoneNumber = ''" :disabled="!phoneNumber">Clear</button>
      </div>

      <!-- Demo: Simulate incoming call -->
      <button class="demo-btn" @click="simulateCall" :disabled="!isRegistered">
        Simulate Incoming Call
      </button>
    </div>
  </div>
</template>

<style scoped>
.softphone {
  max-width: 320px;
  margin: 2rem auto;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  font-family: system-ui, sans-serif;
  background: white;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.header {
  background: #1f2937;
  color: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 1rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fbbf24;
}

.indicator.connected {
  background: #22c55e;
}

/* Incoming Call */
.incoming-call {
  padding: 1.5rem;
  background: #22c55e;
  color: white;
  text-align: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.caller-info {
  margin-bottom: 1rem;
}

.caller-name {
  display: block;
  font-size: 1.25rem;
  font-weight: bold;
}

.caller-number {
  display: block;
  opacity: 0.9;
}

.incoming-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.answer-btn,
.reject-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  cursor: pointer;
}

.answer-btn {
  background: white;
  color: #22c55e;
}

.reject-btn {
  background: #ef4444;
  color: white;
}

/* Active Call */
.active-call {
  padding: 1.5rem;
}

.call-info {
  text-align: center;
  margin-bottom: 1.5rem;
}

.remote-party {
  display: block;
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.call-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border-radius: 20px;
  font-size: 0.875rem;
  text-transform: capitalize;
}

.call-status.active {
  background: #dcfce7;
  color: #166534;
}

.call-status.held {
  background: #fef3c7;
  color: #92400e;
}

.duration {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  margin-top: 0.5rem;
  font-variant-numeric: tabular-nums;
}

.call-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.control-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.control-btn:hover {
  background: #f3f4f6;
}

.control-btn.active {
  background: #fef3c7;
  border-color: #fbbf24;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hangup-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: #ef4444;
  color: white;
  cursor: pointer;
}

.dtmf-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.dtmf-hint {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

/* Dial Screen */
.dial-screen {
  padding: 1.5rem;
}

.phone-input {
  width: 100%;
  padding: 1rem;
  font-size: 1.5rem;
  text-align: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.dial-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.call-btn {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  background: #22c55e;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

.call-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.clear-btn {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.clear-btn:disabled {
  opacity: 0.5;
}

.demo-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  border: 1px dashed #9ca3af;
  border-radius: 8px;
  background: #f9fafb;
  color: #6b7280;
  cursor: pointer;
}

.demo-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.demo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

## Step 3: Use the Softphone

Update your `App.vue`:

```vue
<script setup lang="ts">
import Softphone from './components/Softphone.vue'
</script>

<template>
  <Softphone />
</template>

<style>
body {
  margin: 0;
  background: #f3f4f6;
  min-height: 100vh;
}
</style>
```

## Step 4: Test the Features

Run your dev server and try:

1. **Dialing**: Enter a number using the dial pad or keyboard
2. **Calling**: Click "Call" to initiate an outbound call
3. **Call Controls**: Once connected, try Hold and Mute
4. **DTMF**: During a call, tap digits to send tones
5. **Incoming Calls**: Click "Simulate Incoming Call" and Answer/Reject
6. **Duration**: Watch the timer count up during active calls

## Key Concepts Explained

### 1. Call State Management

The `callState` computed property tracks where we are in the call lifecycle:

```typescript
const isRinging = computed(
  () => callState.value === 'ringing' && activeCall.value?.direction === 'inbound'
)
```

Different UI states show based on current call state.

### 2. DTMF (Touch Tones)

During an active call, dial pad digits send DTMF tones:

```typescript
function handleDigit(digit: string) {
  if (activeCall.value && callState.value === 'active') {
    sendDTMF(digit) // Sends tone to remote party
  } else {
    phoneNumber.value += digit // Builds phone number
  }
}
```

DTMF is used for IVR menus ("Press 1 for sales...").

### 3. Hold and Mute

```typescript
// Hold: Pauses media in both directions, plays hold music
async function toggleHold() {
  if (isOnHold.value) {
    await unhold()
  } else {
    await hold()
  }
}

// Mute: Stops sending your audio (remote can't hear you)
function toggleMute() {
  isMuted.value = !isMuted.value
}
```

### 4. Incoming Call Handling

```typescript
// Answer puts you in active call state
await answer()

// Reject/Hangup ends the call immediately
hangup()
```

## Common Mistakes

::: warning Clean Up Timers
Always clear intervals in `onUnmounted` to prevent memory leaks:

```typescript
onUnmounted(() => {
  if (durationInterval) clearInterval(durationInterval)
})
```

:::

::: warning DTMF Context
Only send DTMF during active calls - sending during ringing or idle does nothing.
:::

## What You Learned

- Building a complete softphone UI with Vue
- Handling different call states in the UI
- Implementing dial pad with DTMF support
- Managing hold and mute states
- Handling incoming calls with answer/reject
- Call duration tracking with reactive state

## Next Steps

Your softphone works great with mock mode, but real applications need real SIP servers. Continue to [Part 3: Real Server Connection](/tutorial/part-3-real-server) to connect to a real SIP provider.
