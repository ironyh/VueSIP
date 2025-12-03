# Multi-Line Call Management Guide

This guide covers multi-line call management in VueSip, enabling you to build professional phone applications that handle multiple simultaneous calls across separate phone lines.

## Overview

Multi-line support is essential for business phone applications where users need to handle multiple calls concurrently. Common scenarios include:

- **Executive Phones**: Multiple lines for different contacts or purposes
- **Call Centers**: Handling multiple customer calls
- **Reception Desks**: Managing incoming calls while on another call
- **Conference Coordination**: Setting up multi-party calls

**Why Multi-Line Matters:**
- **Productivity**: Handle multiple calls without disconnecting
- **Professionalism**: Put callers on hold instead of dropping them
- **Flexibility**: Transfer between lines or merge into conferences
- **Visibility**: See all line states at a glance

VueSip provides comprehensive multi-line support through the `useSipSecondLine` composable.

## Table of Contents

- [Quick Start](#quick-start)
- [Line Configuration](#line-configuration)
- [Making and Receiving Calls](#making-and-receiving-calls)
- [Call Control Per Line](#call-control-per-line)
- [Line Switching](#line-switching)
- [Call Transfer](#call-transfer)
- [Line State Management](#line-state-management)
- [Events and Callbacks](#events-and-callbacks)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Cleanup and Lifecycle](#cleanup-and-lifecycle)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Setup

```typescript
import { useSipClient, useSipSecondLine } from 'vuesip'

// Get SIP client instance
const { client, mediaManager } = useSipClient()

// Initialize multi-line support with 4 lines
const {
  lines,
  selectedLine,
  makeCall,
  answerCall,
  hangupCall,
  holdLine,
  unholdLine,
  swapLines,
} = useSipSecondLine(client, mediaManager, {
  lineCount: 4,
  autoHoldOnNewCall: true,
})
```

### Making a Call

```typescript
// Make call on auto-selected available line
const lineNumber = await makeCall('sip:bob@domain.com')
console.log(`Call started on line ${lineNumber}`)

// Make call on specific line
await makeCall('sip:alice@domain.com', { lineNumber: 2 })
```

### Answering an Incoming Call

```typescript
// Answer on specific line
await answerCall(2)

// Or find the ringing line and answer
const ringingLine = ringingLines.value[0]
if (ringingLine) {
  await answerCall(ringingLine.lineNumber)
}
```

---

## Line Configuration

### Configuration Options

The `useSipSecondLine` composable accepts these configuration options:

```typescript
const multiLine = useSipSecondLine(client, mediaManager, {
  // Number of lines (default: 2, max: 8)
  lineCount: 4,

  // Maximum concurrent calls (default: lineCount)
  maxConcurrentCalls: 3,

  // Auto-hold other lines when making/answering (default: true)
  autoHoldOnNewCall: true,

  // Auto-select next available line for incoming (default: true)
  autoSelectLine: true,

  // Custom line configurations
  lineConfigs: [
    { lineNumber: 1, label: 'Main', enabled: true },
    { lineNumber: 2, label: 'Support', enabled: true },
    { lineNumber: 3, label: 'Sales', enabled: true, autoAnswer: true },
    { lineNumber: 4, label: 'Emergency', enabled: true },
  ],

  // Event callbacks
  onLineStateChange: (event) => console.log('State changed:', event),
  onLineIncomingCall: (event) => console.log('Incoming call:', event),
  onLineCallEnded: (event) => console.log('Call ended:', event),
  onSelectionChange: (event) => console.log('Selection changed:', event),
})
```

### Line Configuration Properties

Each line can be individually configured:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `lineNumber` | `number` | required | Line number (1-indexed) |
| `label` | `string` | `undefined` | Custom label for display |
| `enabled` | `boolean` | `true` | Whether line is available |
| `defaultAudio` | `boolean` | `true` | Enable audio by default |
| `defaultVideo` | `boolean` | `false` | Enable video by default |
| `ringtone` | `string` | `undefined` | Custom ringtone URL |
| `autoAnswer` | `boolean` | `false` | Auto-answer incoming calls |
| `autoAnswerDelay` | `number` | `0` | Delay before auto-answer (ms) |

### Updating Line Configuration

```typescript
// Configure a specific line
multiLine.configureLine(2, {
  label: 'VIP Line',
  autoAnswer: true,
  autoAnswerDelay: 1000,
})
```

---

## Making and Receiving Calls

### Making Outbound Calls

```typescript
// Auto-select first available line
try {
  const lineNum = await makeCall('sip:bob@domain.com')
  console.log(`Call started on line ${lineNum}`)
} catch (error) {
  console.error('Call failed:', error.message)
}

// Specify line number
await makeCall('sip:bob@domain.com', { lineNumber: 2 })

// With media options
await makeCall('sip:bob@domain.com', {
  lineNumber: 1,
  audio: true,
  video: true,
  extraHeaders: ['X-Custom-Header: value'],
})
```

### Handling Incoming Calls

```typescript
// Watch for incoming calls
watch(ringingLines, (lines) => {
  if (lines.length > 0) {
    const incoming = lines[0]
    console.log(`Incoming call on line ${incoming.lineNumber}`)
    console.log(`From: ${incoming.remoteDisplayName || incoming.remoteUri}`)
  }
})

// Answer an incoming call
await answerCall(lineNumber)

// Answer with options
await answerCall(lineNumber, {
  audio: true,
  video: false,
})

// Reject a call
await rejectCall(lineNumber, 486) // 486 = Busy Here
```

### Ending Calls

```typescript
// Hangup specific line
await hangupCall(2)

// Hangup all calls
await hangupAll()
```

---

## Call Control Per Line

### Hold and Unhold

```typescript
// Put line 1 on hold
await holdLine(1)

// Resume line 1
await unholdLine(1)

// Toggle hold state
await toggleHoldLine(1)
```

**Technical Context**: When you put a line on hold, VueSip sends a SIP re-INVITE with `a=sendonly` in the SDP. The call remains established but audio stops flowing. The remote party typically hears hold music if configured on the server.

### Mute and Unmute

```typescript
// Mute line 1 (local audio only)
muteLine(1)

// Unmute line 1
unmuteLine(1)

// Toggle mute
toggleMuteLine(1)
```

**Note**: Muting is local-only - it stops sending your audio but doesn't affect what you hear.

### DTMF Tones

```typescript
// Send single DTMF tone
await sendDTMF(1, '5')

// Send DTMF sequence
for (const digit of '1234#') {
  await sendDTMF(1, digit)
}
```

---

## Line Switching

### Selecting Lines

```typescript
// Select a specific line
selectLine(2)

// Get currently selected line
console.log('Selected:', selectedLine.value) // 2

// Get selected line state
const state = selectedLineState.value
console.log('Status:', state?.status) // 'active', 'held', etc.
```

### Auto-Selection Helpers

```typescript
// Select next available (idle) line
const nextLine = selectNextAvailable()

// Select line with incoming call
const ringingLine = selectRingingLine()
```

### Swapping Lines

The `swapLines` function switches between two lines, automatically managing hold states:

```typescript
// Swap between line 1 and line 2
// - If line 1 is active, it goes on hold
// - Line 2 becomes active
await swapLines(1, 2)
```

---

## Call Transfer

### Blind Transfer

Transfer a call to an external target:

```typescript
await transferCall({
  fromLine: 1,
  target: 'sip:alice@domain.com',
  attended: false,
})
```

### Attended Transfer

Set up a consultation call before completing transfer:

```typescript
// Step 1: Put current call on hold
await holdLine(1)

// Step 2: Make consultation call on another line
await makeCall('sip:alice@domain.com', { lineNumber: 2 })

// Step 3: After consultation, complete transfer
await transferCall({
  fromLine: 1,
  target: 2, // Transfer to line 2's call
  attended: true,
})
```

### Transfer Between Lines

```typescript
// Transfer line 1's call to line 2's party
await transferCall({
  fromLine: 1,
  target: 2,
})
```

---

## Line State Management

### Line States

Each line has a status that reflects its current state:

| Status | Description |
|--------|-------------|
| `idle` | No call on this line |
| `ringing` | Incoming call waiting |
| `active` | Call in progress |
| `held` | Call on hold |
| `busy` | Line is busy (dialing, etc.) |
| `error` | Error state |

### Reading Line State

```typescript
// Get all lines
const allLines = lines.value

// Get specific line state
const line1 = getLineState(1)
console.log('Line 1 status:', line1?.status)
console.log('Line 1 remote:', line1?.remoteDisplayName || line1?.remoteUri)
console.log('Line 1 duration:', line1?.duration) // seconds

// Find line by call ID
const line = getLineByCallId('call-123')
```

### Computed Helpers

```typescript
// Count of active calls
const active = activeCallCount.value

// Count of incoming calls
const incoming = incomingCallCount.value

// Check if all lines are busy
const busy = allLinesBusy.value

// Get available lines
const available = availableLines.value

// Get lines with active calls
const activeCalls = activeLines.value

// Get ringing lines
const ringing = ringingLines.value

// Get held lines
const onHold = heldLines.value
```

### Line Availability

```typescript
// Check if specific line is available
if (isLineAvailable(2)) {
  await makeCall('sip:bob@domain.com', { lineNumber: 2 })
}
```

### Getting Call Statistics

```typescript
// Get WebRTC stats for a line
const stats = await getLineStats(1)
if (stats) {
  console.log('Audio codec:', stats.audio?.codec)
  console.log('Packet loss:', stats.audio?.packetsLost)
  console.log('Jitter:', stats.audio?.jitter)
}
```

### Resetting Lines

```typescript
// Reset specific line to idle
resetLine(2)

// Reset all lines
resetAllLines()
```

---

## Events and Callbacks

### Event Types

The composable emits events for line state changes:

```typescript
// Line state change
onLineStateChange: (event: LineStateChangeEvent) => {
  console.log(`Line ${event.lineNumber} changed`)
  console.log('Previous:', event.previousState?.status)
  console.log('Current:', event.currentState.status)
}

// Incoming call
onLineIncomingCall: (event: LineIncomingCallEvent) => {
  console.log(`Incoming call on line ${event.lineNumber}`)
  console.log('From:', event.remoteUri)
  console.log('Display:', event.remoteDisplayName)
}

// Call ended
onLineCallEnded: (event: LineCallEndedEvent) => {
  console.log(`Call ended on line ${event.lineNumber}`)
  console.log('Duration:', event.duration, 'seconds')
  console.log('Cause:', event.cause)
}

// Selection changed
onSelectionChange: (event: LineSelectionChangeEvent) => {
  console.log('Selection changed')
  console.log('From line:', event.previousLine)
  console.log('To line:', event.newLine)
}
```

---

## Best Practices

### 1. Always Check Line Availability

```typescript
// Before making a call
if (allLinesBusy.value) {
  alert('All lines are busy')
  return
}

// Or check specific line
if (!isLineAvailable(2)) {
  const line = getLineState(2)
  alert(`Line 2 is ${line?.status}`)
  return
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  await makeCall('sip:bob@domain.com')
} catch (err) {
  if (err.message.includes('No available lines')) {
    // All lines busy
    showNotification('All lines are in use')
  } else if (err.message.includes('Invalid target')) {
    // Bad phone number/URI
    showNotification('Invalid phone number')
  } else {
    // Other error
    showNotification('Call failed: ' + err.message)
  }
}
```

### 3. Use Auto-Hold for Seamless Switching

```typescript
// With autoHoldOnNewCall: true (default)
// Answering a new call automatically holds the current one
await answerCall(2) // Line 1 auto-held if active
```

### 4. Show Visual Indicators

```vue
<template>
  <div class="line-buttons">
    <button
      v-for="line in lines"
      :key="line.lineNumber"
      :class="['line-btn', line.status, { selected: line.lineNumber === selectedLine }]"
      @click="selectLine(line.lineNumber)"
    >
      <span class="line-number">{{ line.lineNumber }}</span>
      <span class="line-status">{{ line.status }}</span>
      <span v-if="line.remoteDisplayName" class="line-caller">
        {{ line.remoteDisplayName }}
      </span>
      <span v-if="line.status === 'active'" class="line-duration">
        {{ formatDuration(line.duration) }}
      </span>
    </button>
  </div>
</template>
```

### 5. Implement Call Waiting Indication

```typescript
// Watch for new calls while on a call
watch(incomingCallCount, (count, prevCount) => {
  if (count > prevCount && activeCallCount.value > 0) {
    // Play call waiting tone
    playCallWaitingTone()
    showNotification('Another call is coming in')
  }
})
```

---

## Common Patterns

### Executive Phone Pattern

```typescript
// 4 lines: Main, Direct, VIP, Conference
const multiLine = useSipSecondLine(client, mediaManager, {
  lineCount: 4,
  autoHoldOnNewCall: true,
  lineConfigs: [
    { lineNumber: 1, label: 'Main', enabled: true },
    { lineNumber: 2, label: 'Direct', enabled: true },
    { lineNumber: 3, label: 'VIP', enabled: true, autoAnswer: false },
    { lineNumber: 4, label: 'Conference', enabled: true },
  ],
})
```

### Receptionist Pattern

```typescript
// Handle multiple incoming calls
const multiLine = useSipSecondLine(client, mediaManager, {
  lineCount: 6,
  autoSelectLine: true,
  onLineIncomingCall: (event) => {
    // Show incoming call notification
    showIncomingCallPopup(event)

    // Auto-select the ringing line
    selectLine(event.lineNumber)
  },
})

// Quick transfer function
async function quickTransfer(extension: string) {
  const current = selectedLine.value
  await transferCall({
    fromLine: current,
    target: `sip:${extension}@domain.com`,
    attended: false,
  })
}
```

### Call Center Agent Pattern

```typescript
const multiLine = useSipSecondLine(client, mediaManager, {
  lineCount: 2,
  maxConcurrentCalls: 2,
  autoHoldOnNewCall: true,
  onLineCallEnded: (event) => {
    // Log call for metrics
    logCallMetrics({
      lineNumber: event.lineNumber,
      duration: event.duration,
      cause: event.cause,
    })

    // Make agent available if ACW complete
    if (isACWComplete()) {
      setAgentStatus('available')
    }
  },
})
```

---

## Cleanup and Lifecycle

The `useSipSecondLine` composable automatically handles cleanup when the component unmounts:

```typescript
// Cleanup is automatic on component unmount
// - Duration timers are stopped
// - Event listeners are removed
// - Active calls can optionally be terminated

// Manual cleanup if needed
resetAllLines() // Reset all lines to idle state
hangupAll()     // Terminate all active calls
```

### Component Lifecycle

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useSipClient, useSipSecondLine } from 'vuesip'

const { client, mediaManager } = useSipClient()
const multiLine = useSipSecondLine(client, mediaManager)

// Component will auto-cleanup on unmount
// But you can manually cleanup if switching views:
function cleanupBeforeLeave() {
  multiLine.hangupAll()
  multiLine.resetAllLines()
}
</script>
```

### Handling Page Unload

```typescript
// Warn user about active calls before leaving
window.addEventListener('beforeunload', (event) => {
  if (activeCallCount.value > 0) {
    event.preventDefault()
    event.returnValue = 'You have active calls. Are you sure you want to leave?'
  }
})
```

---

## Troubleshooting

### Common Issues

**"No available lines for call"**
- All lines are busy with active calls
- Check `allLinesBusy.value` before making calls
- Increase `lineCount` if more concurrent calls needed

**"Invalid line number"**
- Line numbers are 1-indexed (1, 2, 3, not 0, 1, 2)
- Max line number equals `lineCount` setting

**"Line not active"**
- Attempting to hold/mute a line with no active call
- Check `line.status === 'active'` before call controls

**"SIP client not connected"**
- Ensure SIP client is connected before making calls
- Check `isConnected.value` from `useSipClient`

**Hold/unhold not working**
- Some PBX systems don't support re-INVITE for hold
- Check server logs for SIP negotiation errors

---

## API Reference

For complete API documentation, see the [useSipSecondLine API Reference](/api/composables.md#usesipsecondline).

## Related Guides

- [Call Controls Guide](./call-controls.md) - Basic call control features
- [Call Transfer Guide](./call-controls.md#call-transfer) - Transfer options
- [Call Parking Guide](./call-parking.md) - Park and retrieve calls
- [Presence & Messaging](./presence-messaging.md) - User presence states
