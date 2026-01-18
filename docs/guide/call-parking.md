# Call Parking Guide

This guide covers call parking in VueSIP using the `useAmiParking` composable, enabling you to build applications with call park/retrieve functionality, parking lot monitoring, and timeout handling.

## Overview

Call parking allows you to put a call into a "parking lot" where it can be retrieved from any phone. This is essential for:

- **Reception**: Park calls for employees to pick up
- **Call Centers**: Queue management without traditional hold
- **Multi-location**: Allow call retrieval from different phones
- **Busy Environments**: Manage multiple calls efficiently

**Why Call Parking Matters:**

- **Flexibility**: Calls can be retrieved from any phone in the system
- **Customer Experience**: Better than traditional hold for transfers
- **Efficiency**: Visual parking lot status helps manage calls
- **Team Collaboration**: Share incoming calls among team members

## Table of Contents

- [Prerequisites](#prerequisites)
- [Basic Setup](#basic-setup)
- [Parking Calls](#parking-calls)
- [Retrieving Calls](#retrieving-calls)
- [Monitoring Parking Lots](#monitoring-parking-lots)
- [Event Handling](#event-handling)
- [Advanced Usage](#advanced-usage)
- [Asterisk Configuration](#asterisk-configuration)

---

## Prerequisites

Before using `useAmiParking`, ensure you have:

1. **AMI WebSocket Proxy**: An amiws proxy running alongside Asterisk
2. **AMI Permissions**: User with call and originate permissions
3. **Asterisk Parking**: Configured res_parking module
4. **VueSIP AMI Connection**: Established AmiClient connection

## Basic Setup

### Creating the Parking Composable

```typescript
import { computed } from 'vue'
import { useAmi, useAmiParking } from 'vuesip'

// Get the AMI client
const ami = useAmi()

// Create the parking composable
const {
  parkingLots, // Map of parking lot configurations
  parkedCalls, // Array of all parked calls
  isLoading, // Loading state
  error, // Error message if any
  totalParkedCalls, // Total count of parked calls

  // Methods
  getParkingLots, // Get all parking lot configurations
  getParkedCalls, // Get currently parked calls
  parkCall, // Park a call
  retrieveCall, // Retrieve a parked call
  refreshParkingLot, // Refresh parking lot status
  getParkedCallBySpace, // Find call by parking space
  onParkingEvent, // Listen for parking events
} = useAmiParking(computed(() => ami.getClient()))
```

### With Options

```typescript
const parking = useAmiParking(
  computed(() => ami.getClient()),
  {
    // Default parking lot name (default: 'default')
    defaultParkingLot: 'default',

    // Auto-refresh when client connects (default: true)
    autoRefresh: true,

    // Polling interval in ms (0 = disabled, default: 0)
    pollInterval: 30000, // Refresh every 30 seconds

    // Callbacks
    onCallParked: (call) => {
      console.log(`Call parked at ${call.parkingSpace}`)
    },
    onCallRetrieved: (call, retriever) => {
      console.log(`Call retrieved from ${call.parkingSpace}`)
    },
    onCallTimeout: (call) => {
      console.log(`Parked call timed out at ${call.parkingSpace}`)
    },
    onCallGiveUp: (call) => {
      console.log(`Caller hung up while parked at ${call.parkingSpace}`)
    },

    // Filter parked calls
    parkedCallFilter: (call) => call.parkingLot === 'sales',

    // Transform parked call data
    transformParkedCall: (call) => ({
      ...call,
      displayName: formatCallerName(call),
    }),
  }
)
```

## Parking Calls

### Basic Park Operation

```typescript
// Park the current call
// Returns the parking space number
const space = await parkCall('PJSIP/1001-00000001')
console.log(`Call parked at space ${space}`)
```

### Park with Options

```typescript
// Park to a specific lot
const space = await parkCall('PJSIP/1001-00000001', 'vip')

// Park with a custom timeout (in seconds)
const space = await parkCall('PJSIP/1001-00000001', 'default', 120)
```

### Using with Current Call

```typescript
import { useSipClient, useAmi, useAmiParking } from 'vuesip'

const { currentCall } = useSipClient()
const ami = useAmi()
const { parkCall } = useAmiParking(computed(() => ami.getClient()))

async function parkCurrentCall() {
  const call = currentCall.value
  if (!call?.session) {
    console.error('No active call to park')
    return
  }

  try {
    // Get the channel ID from the call session
    const channelId = call.session.remote_identity?.uri?.user
    const space = await parkCall(`PJSIP/${channelId}`)
    console.log(`Call parked at space ${space}`)
  } catch (error) {
    console.error('Failed to park call:', error)
  }
}
```

## Retrieving Calls

### Basic Retrieve Operation

```typescript
// Retrieve a call from a specific space
await retrieveCall(701, 'PJSIP/1002-00000001')
```

### Retrieve to Current Extension

```typescript
async function retrieveParkedCall(space: number) {
  try {
    // Retrieve to the current user's channel
    await retrieveCall(space, `PJSIP/${currentExtension}`)
    console.log(`Retrieved call from space ${space}`)
  } catch (error) {
    console.error('Failed to retrieve call:', error)
  }
}
```

### Retrieve from Specific Lot

```typescript
// Retrieve from a specific parking lot
await retrieveCall(801, 'PJSIP/1002-00000001', 'vip')
```

## Monitoring Parking Lots

### Getting Parking Lot Information

```typescript
// Get all parking lots
const lots = await getParkingLots()

lots.forEach((lot) => {
  console.log(`Lot: ${lot.name}`)
  console.log(`  Spaces: ${lot.startSpace}-${lot.endSpace}`)
  console.log(`  Total: ${lot.totalSpaces}`)
  console.log(`  Timeout: ${lot.timeout} seconds`)
})
```

### ParkingLot Structure

```typescript
interface ParkingLot {
  name: string // Parking lot name
  startSpace: number // First parking space number
  endSpace: number // Last parking space number
  timeout: number // Default timeout in seconds
  totalSpaces: number // Total available spaces
  occupied: number // Currently occupied spaces
  serverId?: number // AMI server ID
}
```

### Getting Parked Calls

```typescript
// Get all parked calls
const calls = await getParkedCalls()

calls.forEach((call) => {
  console.log(`Space ${call.parkingSpace}: ${call.callerIdNum}`)
  console.log(`  Parked for: ${call.duration} seconds`)
  console.log(`  Timeout in: ${call.timeoutRemaining} seconds`)
})

// Get calls from a specific lot
const vipCalls = await getParkedCalls('vip')
```

### ParkedCall Structure

```typescript
interface ParkedCall {
  parkingSpace: number // The parking space number
  parkingLot: string // Parking lot name
  channel: string // Channel identifier
  uniqueId: string // Unique call ID
  linkedId: string // Linked call ID
  callerIdNum: string // Caller's number
  callerIdName: string // Caller's name
  timeout: number // Total timeout value
  duration: number // Time parked (seconds)
  parkedAt: Date // When the call was parked
  serverId?: number // AMI server ID
}
```

### Finding a Specific Parked Call

```typescript
// Find by space number
const call = getParkedCallBySpace(701, 'default')

if (call) {
  console.log(`Found: ${call.callerIdName} (${call.callerIdNum})`)
} else {
  console.log('Space 701 is empty')
}
```

## Event Handling

### Listening for Parking Events

```typescript
// Register a listener
const unsubscribe = onParkingEvent((event) => {
  switch (event.type) {
    case 'parked':
      console.log(`Call parked at ${event.call.parkingSpace}`)
      break
    case 'retrieved':
      console.log(`Call retrieved from ${event.call.parkingSpace}`)
      break
    case 'timeout':
      console.log(`Call timed out at ${event.call.parkingSpace}`)
      break
    case 'giveup':
      console.log(`Caller hung up at ${event.call.parkingSpace}`)
      break
  }
})

// Later: unsubscribe
unsubscribe()
```

### Using Callback Options

```typescript
const parking = useAmiParking(clientRef, {
  onCallParked: (call) => {
    // Show notification
    showNotification(`Call from ${call.callerIdNum} parked at ${call.parkingSpace}`)
  },
  onCallTimeout: (call) => {
    // Alert about timeout
    playAlertSound()
    showWarning(`Call at ${call.parkingSpace} timed out!`)
  },
})
```

## Advanced Usage

### Visual Parking Lot Component

```vue
<template>
  <div class="parking-lot">
    <h3>{{ lot.name }} Parking</h3>

    <div class="parking-spaces">
      <div
        v-for="space in spaces"
        :key="space.number"
        class="parking-space"
        :class="{
          occupied: space.call,
          warning: space.call?.timeoutRemaining < 30,
        }"
        @click="handleSpaceClick(space)"
      >
        <span class="space-number">{{ space.number }}</span>

        <template v-if="space.call">
          <span class="caller-name">{{ space.call.callerIdName }}</span>
          <span class="caller-number">{{ space.call.callerIdNum }}</span>
          <span class="timer">{{ formatDuration(space.call.duration) }}</span>
        </template>

        <template v-else>
          <span class="empty">Empty</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAmiParking } from 'vuesip'

const props = defineProps<{
  lotName: string
}>()

const { parkingLots, parkedCalls, getParkingLots, retrieveCall } = useAmiParking(clientRef)

const lot = computed(() => parkingLots.value.get(props.lotName))

const spaces = computed(() => {
  if (!lot.value) return []

  const result = []
  for (let i = lot.value.startSpace; i <= lot.value.endSpace; i++) {
    result.push({
      number: i,
      call: parkedCalls.value.find((c) => c.parkingSpace === i && c.parkingLot === props.lotName),
    })
  }
  return result
})

async function handleSpaceClick(space: { number: number; call?: any }) {
  if (space.call) {
    // Retrieve the call
    await retrieveCall(space.number, `PJSIP/${myExtension}`, props.lotName)
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onMounted(() => {
  getParkingLots()
})
</script>

<style scoped>
.parking-spaces {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.parking-space {
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
}

.parking-space.occupied {
  background: var(--primary-light);
  border-color: var(--primary);
}

.parking-space.warning {
  animation: pulse 1s infinite;
  border-color: var(--warning);
}
</style>
```

### Multi-Lot Dashboard

```vue
<template>
  <div class="parking-dashboard">
    <div class="summary">
      <span class="total">{{ totalParkedCalls }} calls parked</span>
    </div>

    <div class="lots">
      <div v-for="[name, lot] in parkingLots" :key="name" class="lot-card">
        <h4>{{ name }}</h4>
        <div class="lot-stats">
          <span>{{ lot.occupied }} / {{ lot.totalSpaces }}</span>
        </div>
        <div class="lot-calls">
          <div v-for="call in getCallsForLot(name)" :key="call.uniqueId" class="parked-call">
            <span>{{ call.parkingSpace }}: {{ call.callerIdNum }}</span>
            <button @click="retrieve(call)">Retrieve</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAmiParking } from 'vuesip'

const { parkingLots, parkedCalls, totalParkedCalls, retrieveCall } = useAmiParking(clientRef)

function getCallsForLot(lotName: string) {
  return parkedCalls.value.filter((c) => c.parkingLot === lotName)
}

async function retrieve(call: ParkedCall) {
  await retrieveCall(call.parkingSpace, myChannel, call.parkingLot)
}
</script>
```

### Integration with Call Controls

```typescript
import { useSipClient, useAmiParking } from 'vuesip'

const { currentCall, hangup } = useSipClient()
const { parkCall, retrieveCall, parkedCalls } = useAmiParking(clientRef)

// Park current call
async function park() {
  if (!currentCall.value) return

  const channel = currentCall.value.session.connection?.channelId
  if (channel) {
    await parkCall(channel)
  }
}

// Quick retrieve - get the first parked call
async function quickRetrieve() {
  const firstCall = parkedCalls.value[0]
  if (firstCall) {
    await retrieveCall(firstCall.parkingSpace, myChannel, firstCall.parkingLot)
  }
}
```

## Asterisk Configuration

### res_parking.conf Setup

```ini
[general]
; General parking options

[default]
; Default parking lot
parkext => 700              ; Extension to park calls (dial 700)
parkpos => 701-720          ; Parking spaces 701-720
context => parkedcalls      ; Context for retrieve
parkinghints => yes         ; Enable BLF for parking spaces
parkingtime => 45           ; Timeout in seconds
comebacktoorigin => yes     ; Return to parker on timeout
comebackdialtime => 30      ; Ring time for callback
findslot => next            ; Allocation method

[vip]
; VIP parking lot with longer timeout
parkext => 800
parkpos => 801-810
context => parkedcalls
parkingtime => 120
comebacktoorigin => no
comebackcontext => reception
```

### Dialplan for Parking

```
[parkedcalls]
; Retrieve parked calls
exten => _70X,1,ParkedCall(default,${EXTEN})
exten => _80X,1,ParkedCall(vip,${EXTEN})

[internal]
; Park via feature code
exten => 700,1,Park(default)
exten => 800,1,Park(vip)
```

### AMI User Permissions

```ini
; manager.conf
[amiuser]
secret = your_secret
read = call,agent
write = call,originate
```

### Required Permissions

For parking features, your AMI user needs:

- `read`: `call` (for parking events)
- `write`: `call` (for Park action)
- `write`: `originate` (for retrieving calls)

## Best Practices

### 1. Monitor Parking Lots Proactively

```typescript
// Set up auto-refresh for busy environments
const parking = useAmiParking(clientRef, {
  autoRefresh: true,
  pollInterval: 10000, // Check every 10 seconds
})
```

### 2. Handle Timeouts Gracefully

```typescript
const parking = useAmiParking(clientRef, {
  onCallTimeout: (call) => {
    // Log the timeout
    console.warn(`Call from ${call.callerIdNum} timed out`)

    // Notify relevant staff
    notifyReception(call)
  },
})
```

### 3. Show Timeout Warnings

```vue
<template>
  <div class="parked-call" :class="{ warning: isNearTimeout }">
    <span>{{ call.callerIdNum }}</span>
    <span class="countdown" v-if="isNearTimeout"> {{ timeoutRemaining }}s remaining! </span>
  </div>
</template>

<script setup lang="ts">
const isNearTimeout = computed(() => props.call.timeout - props.call.duration < 30)

const timeoutRemaining = computed(() => props.call.timeout - props.call.duration)
</script>
```

### 4. Provide Visual Feedback

```typescript
// Play sound when call is parked
onCallParked: (call) => {
  playSound('parked')
  flashParkingIndicator(call.parkingSpace)
}

// Alert when timeout is imminent
setInterval(() => {
  parkedCalls.value.forEach((call) => {
    const remaining = call.timeout - call.duration
    if (remaining === 30) {
      playSound('warning')
    }
  })
}, 1000)
```

## Related Guides

- [Call Controls](/guide/call-controls)
- [AMI Integration Overview](/guide/ami-cdr)
- [Error Handling](/guide/error-handling)
