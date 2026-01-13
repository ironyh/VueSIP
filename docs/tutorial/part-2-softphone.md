---
title: 'Part 2: Building a Softphone UI'
description: 'Build a complete softphone interface with dial pad, call controls, and incoming call handling'
---

# Part 2: Building a Softphone UI

**Time: 15 minutes** | **Difficulty: Intermediate**

In this part, you'll build a complete softphone interface. We'll create a dial pad, call controls, call status display, and handle incoming calls - all using mock mode.

## What You'll Build

A fully functional softphone with:

- Numeric dial pad with DTMF feedback
- Caller ID input for outbound calls
- Call controls (answer, hangup, hold, mute)
- Call duration timer
- Incoming call notifications
- Professional styling

## Step 1: Create the Softphone Component

Create a new file `Softphone.vue`:

```vue
<template>
  <div class="softphone">
    <!-- Header -->
    <div class="softphone-header">
      <h2>VueSIP Softphone</h2>
      <div class="connection-status">
        <span :class="['status-dot', { active: isConnected && isRegistered }]"></span>
        {{ connectionStatusText }}
      </div>
    </div>

    <!-- Display -->
    <div class="display">
      <!-- Incoming Call Alert -->
      <div v-if="isIncomingCall" class="incoming-call">
        <div class="caller-info">
          <span class="caller-icon">📞</span>
          <div>
            <div class="caller-name">{{ activeCall?.remoteDisplayName }}</div>
            <div class="caller-number">{{ activeCall?.remoteNumber }}</div>
          </div>
        </div>
        <div class="incoming-actions">
          <button class="answer-btn" @click="handleAnswer">Answer</button>
          <button class="reject-btn" @click="handleHangup">Decline</button>
        </div>
      </div>

      <!-- Active Call Display -->
      <div v-else-if="activeCall && callState !== 'idle'" class="active-call-display">
        <div class="call-status">
          <span :class="['status-badge', callState]">
            {{ callStateLabel }}
          </span>
        </div>
        <div class="remote-party">
          <div class="remote-name">{{ activeCall.remoteDisplayName }}</div>
          <div class="remote-number">{{ activeCall.remoteNumber }}</div>
        </div>
        <div v-if="callState === 'active' || callState === 'held'" class="call-timer">
          {{ formattedDuration }}
        </div>
      </div>

      <!-- Dial Input -->
      <div v-else class="dial-input">
        <input
          v-model="dialNumber"
          type="tel"
          placeholder="Enter number"
          class="number-input"
          @keyup.enter="handleCall"
        />
      </div>
    </div>

    <!-- Call Controls (when in call) -->
    <div v-if="activeCall && !isIncomingCall" class="call-controls">
      <button
        :class="['control-btn', { active: isMuted }]"
        @click="toggleMute"
        :disabled="callState !== 'active' && callState !== 'held'"
      >
        <span class="icon">{{ isMuted ? '🔇' : '🎤' }}</span>
        <span class="label">{{ isMuted ? 'Unmute' : 'Mute' }}</span>
      </button>

      <button
        :class="['control-btn', { active: isOnHold }]"
        @click="toggleHold"
        :disabled="callState !== 'active' && callState !== 'held'"
      >
        <span class="icon">{{ isOnHold ? '▶️' : '⏸️' }}</span>
        <span class="label">{{ isOnHold ? 'Resume' : 'Hold' }}</span>
      </button>

      <button class="control-btn hangup-btn" @click="handleHangup">
        <span class="icon">📵</span>
        <span class="label">End</span>
      </button>
    </div>

    <!-- Dial Pad -->
    <div v-if="!activeCall || isIncomingCall" class="dialpad">
      <button
        v-for="key in dialpadKeys"
        :key="key.digit"
        class="dialpad-btn"
        @click="handleDialpadPress(key.digit)"
      >
        <span class="digit">{{ key.digit }}</span>
        <span v-if="key.letters" class="letters">{{ key.letters }}</span>
      </button>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <template v-if="!isConnected">
        <button class="action-btn connect" @click="handleConnect">Connect</button>
      </template>

      <template v-else-if="!activeCall">
        <button class="action-btn call" @click="handleCall" :disabled="!dialNumber">Call</button>
        <button class="action-btn secondary" @click="handleSimulateIncoming">
          Simulate Incoming
        </button>
      </template>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSipMock } from 'vuesip'

// Initialize mock SIP client
const {
  isConnected,
  isRegistered,
  callState,
  activeCall,
  error,
  connect,
  disconnect,
  call,
  hangup,
  answer,
  hold,
  unhold,
  sendDTMF,
  simulateIncomingCall,
} = useSipMock()

// Local state
const dialNumber = ref('')
const isMuted = ref(false)

// Dialpad key configuration
const dialpadKeys = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
]

// Computed properties
const connectionStatusText = computed(() => {
  if (!isConnected.value) return 'Disconnected'
  if (!isRegistered.value) return 'Connecting...'
  return 'Ready'
})

const isIncomingCall = computed(() => {
  return activeCall.value?.direction === 'inbound' && activeCall.value?.state === 'ringing'
})

const isOnHold = computed(() => {
  return callState.value === 'held'
})

const callStateLabel = computed(() => {
  const labels: Record<string, string> = {
    idle: 'Idle',
    calling: 'Calling...',
    ringing: 'Ringing...',
    active: 'Connected',
    held: 'On Hold',
    ended: 'Call Ended',
  }
  return labels[callState.value] || callState.value
})

const formattedDuration = computed(() => {
  const duration = activeCall.value?.duration || 0
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Event handlers
async function handleConnect() {
  try {
    await connect()
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

function handleDialpadPress(digit: string) {
  // If in call, send DTMF
  if (activeCall.value && callState.value === 'active') {
    sendDTMF(digit)
    // Play DTMF tone (optional visual feedback)
    console.log(`DTMF sent: ${digit}`)
  } else {
    // Otherwise, add to dial string
    dialNumber.value += digit
  }
}

async function handleCall() {
  if (!dialNumber.value) return

  try {
    await call(dialNumber.value, 'Outbound Call')
    // Clear dial number after initiating call
    dialNumber.value = ''
  } catch (err) {
    console.error('Call failed:', err)
  }
}

async function handleAnswer() {
  try {
    await answer()
  } catch (err) {
    console.error('Answer failed:', err)
  }
}

async function handleHangup() {
  try {
    await hangup()
  } catch (err) {
    console.error('Hangup failed:', err)
  }
}

async function toggleHold() {
  try {
    if (isOnHold.value) {
      await unhold()
    } else {
      await hold()
    }
  } catch (err) {
    console.error('Hold toggle failed:', err)
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  // In real implementation, this would mute the audio track
  console.log('Mute:', isMuted.value)
}

function handleSimulateIncoming() {
  // Simulate an incoming call for testing
  const testNumbers = ['555-0100', '555-0200', '555-0300']
  const testNames = ['Alice Smith', 'Bob Johnson', 'Carol Williams']
  const index = Math.floor(Math.random() * testNumbers.length)

  simulateIncomingCall(testNumbers[index], testNames[index])
}

// Reset mute state when call ends
watch(callState, (newState) => {
  if (newState === 'idle') {
    isMuted.value = false
  }
})
</script>

<style scoped>
.softphone {
  width: 320px;
  margin: 2rem auto;
  background: linear-gradient(to bottom, #1e293b, #0f172a);
  border-radius: 24px;
  padding: 1.5rem;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  color: white;
}

/* Header */
.softphone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.softphone-header h2 {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
  color: #94a3b8;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #64748b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #64748b;
}

.status-dot.active {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

/* Display */
.display {
  background: #0f172a;
  border-radius: 16px;
  padding: 1rem;
  margin-bottom: 1rem;
  min-height: 100px;
}

/* Incoming Call */
.incoming-call {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.caller-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.caller-icon {
  font-size: 2rem;
  animation: ring 0.5s ease-in-out infinite alternate;
}

@keyframes ring {
  from {
    transform: rotate(-15deg);
  }
  to {
    transform: rotate(15deg);
  }
}

.caller-name {
  font-size: 1.125rem;
  font-weight: 600;
}

.caller-number {
  font-size: 0.875rem;
  color: #94a3b8;
}

.incoming-actions {
  display: flex;
  gap: 0.5rem;
}

.answer-btn,
.reject-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.1s,
    opacity 0.2s;
}

.answer-btn {
  background: #22c55e;
  color: white;
}

.answer-btn:hover {
  background: #16a34a;
}

.reject-btn {
  background: #ef4444;
  color: white;
}

.reject-btn:hover {
  background: #dc2626;
}

/* Active Call Display */
.active-call-display {
  text-align: center;
}

.call-status {
  margin-bottom: 0.5rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.calling,
.status-badge.ringing {
  background: #3b82f6;
  animation: pulse 1.5s infinite;
}

.status-badge.active {
  background: #22c55e;
}

.status-badge.held {
  background: #f59e0b;
}

.remote-party {
  margin: 1rem 0;
}

.remote-name {
  font-size: 1.25rem;
  font-weight: 600;
}

.remote-number {
  font-size: 0.875rem;
  color: #94a3b8;
}

.call-timer {
  font-size: 2rem;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}

/* Dial Input */
.dial-input {
  text-align: center;
}

.number-input {
  width: 100%;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: white;
  text-align: center;
  outline: none;
  letter-spacing: 0.1em;
}

.number-input::placeholder {
  color: #475569;
}

/* Call Controls */
.call-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover:not(:disabled) {
  background: #334155;
  color: white;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.control-btn .icon {
  font-size: 1.25rem;
}

.control-btn .label {
  font-size: 0.75rem;
}

.hangup-btn {
  background: #ef4444;
  border-color: #ef4444;
  color: white;
}

.hangup-btn:hover {
  background: #dc2626 !important;
}

/* Dialpad */
.dialpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dialpad-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.1s;
}

.dialpad-btn:hover {
  background: #334155;
}

.dialpad-btn:active {
  transform: scale(0.95);
  background: #3b82f6;
}

.dialpad-btn .digit {
  font-size: 1.5rem;
  font-weight: 500;
}

.dialpad-btn .letters {
  font-size: 0.625rem;
  color: #64748b;
  letter-spacing: 0.1em;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.connect {
  background: #3b82f6;
  color: white;
}

.action-btn.connect:hover {
  background: #2563eb;
}

.action-btn.call {
  background: #22c55e;
  color: white;
}

.action-btn.call:hover:not(:disabled) {
  background: #16a34a;
}

.action-btn.call:disabled {
  background: #1e293b;
  color: #475569;
  cursor: not-allowed;
}

.action-btn.secondary {
  background: #334155;
  color: #94a3b8;
  font-size: 0.875rem;
}

.action-btn.secondary:hover {
  background: #475569;
  color: white;
}

/* Error Message */
.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: #fca5a5;
  font-size: 0.875rem;
  text-align: center;
}
</style>
```

## Step 2: Understanding the Components

Let's break down the key parts of this softphone:

### Display Area

The display area shows different content based on state:

```typescript
// Incoming call: Show caller info and answer/decline buttons
// Active call: Show remote party, call state badge, and timer
// Idle: Show dial input for entering numbers
```

### Dial Pad

The dial pad handles two scenarios:

```typescript
function handleDialpadPress(digit: string) {
  if (activeCall.value && callState.value === 'active') {
    // During call: Send DTMF tone
    sendDTMF(digit)
  } else {
    // No call: Add to dial string
    dialNumber.value += digit
  }
}
```

### Call Controls

Three main controls during a call:

| Control | Action              | Use Case                   |
| ------- | ------------------- | -------------------------- |
| Mute    | Stops sending audio | Quick silence without hold |
| Hold    | Pauses the call     | Put caller on hold         |
| End     | Terminates call     | Hang up                    |

### Simulating Incoming Calls

The "Simulate Incoming" button uses `simulateIncomingCall()`:

```typescript
simulateIncomingCall('555-0100', 'Alice Smith')
```

This is perfect for testing your incoming call UI!

## Step 3: Testing the Softphone

Try these scenarios:

### Outbound Call Flow

1. Connect to the server
2. Enter a number using the dial pad
3. Click Call
4. Watch: calling -> ringing -> active
5. Use hold/mute during the call
6. Click End to hang up

### Incoming Call Flow

1. Connect to the server
2. Click "Simulate Incoming"
3. See the incoming call alert
4. Click Answer or Decline
5. If answered, use call controls
6. End the call

### DTMF During Call

1. Make or answer a call
2. Once active, press dial pad buttons
3. Watch the console for DTMF logs
4. (In real calls, these navigate IVR menus)

## Key Concepts

### Reactive State Management

All call state is reactive:

```typescript
// These update automatically as call progresses
const isIncomingCall = computed(() => {
  return activeCall.value?.direction === 'inbound' && activeCall.value?.state === 'ringing'
})

const formattedDuration = computed(() => {
  const duration = activeCall.value?.duration || 0
  // Returns "00:00" format
})
```

### Call Direction

Calls have a direction property:

```typescript
// Outbound calls you initiate
activeCall.value.direction === 'outbound'

// Incoming calls from others
activeCall.value.direction === 'inbound'
```

### Hold vs Mute

::: info Hold vs Mute
**Hold**: Pauses the call with SIP signaling. The other party knows they're on hold (often hears music).

**Mute**: Local only - stops sending your audio. The call continues, other party hears silence.
:::

## Exercises

### Exercise 1: Add Backspace

Add a backspace button to the dial pad:

::: details Solution

```vue
<button class="dialpad-btn backspace" @click="handleBackspace">
  <span class="digit">⌫</span>
</button>

<script>
function handleBackspace() {
  dialNumber.value = dialNumber.value.slice(0, -1)
}
</script>
```

:::

### Exercise 2: Call History

Track completed calls and display them:

::: details Solution

```typescript
const { callHistory } = useSipMock()

// In template
<div v-for="call in callHistory" :key="call.id">
  {{ call.remoteNumber }} - {{ call.duration }}s
</div>
```

:::

### Exercise 3: Auto-Answer

Enable auto-answer for incoming calls:

::: details Solution

```typescript
const {
  /* ... */
} = useSipMock({
  autoAnswer: true,
  // Optionally add a delay
  // The call will auto-answer after simulateIncomingCall
})
```

:::

## What You Learned

- **Complete UI**: Building a production-ready softphone interface
- **State Display**: Showing different UI based on call state
- **Call Controls**: Implementing hold, mute, and hangup
- **DTMF**: Sending tones during active calls
- **Incoming Calls**: Handling and simulating incoming calls
- **Styling**: Professional dark theme softphone design

## Next Steps

Your softphone works perfectly in mock mode. In Part 3, we'll learn how to connect it to a real SIP server.

<div style="display: flex; justify-content: space-between; margin-top: 2rem;">
  <a href="/tutorial/part-1-hello">Back to Part 1</a>
  <a href="/tutorial/part-3-real-server">Part 3: Real Server Connection</a>
</div>
