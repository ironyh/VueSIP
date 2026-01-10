# Presence & BLF

User presence status and Busy Lamp Field (BLF) monitoring for extension status.

::: tip Try It Live
Run `pnpm dev` → Navigate to **PresenceDemo** or **BLFDemo** in the playground
:::

## Overview

Presence features enable:

- Online/offline/away status tracking
- Custom status messages
- BLF (Busy Lamp Field) extension monitoring
- Quick dial from presence indicators
- Real-time status subscriptions

## Quick Start

```vue
<script setup lang="ts">
import { useSipClient, usePresence, useFreePBXPresence } from 'vuesip'

const { isRegistered } = useSipClient()

// User presence
const { status, statusMessage, setStatus, setStatusMessage, subscribeToUser, watchedUsers } =
  usePresence()

// BLF monitoring
const { blfStatus, subscribeToBLF, unsubscribeFromBLF } = useFreePBXPresence()

// Extensions to monitor
const monitoredExtensions = ref(['1001', '1002', '1003', '1004'])

onMounted(() => {
  // Subscribe to BLF for each extension
  monitoredExtensions.value.forEach((ext) => {
    subscribeToBLF(ext)
  })
})
</script>

<template>
  <div class="presence-demo">
    <!-- My Status -->
    <div class="my-status">
      <h3>My Status</h3>
      <select :value="status" @change="setStatus($event.target.value)">
        <option value="available">Available</option>
        <option value="busy">Busy</option>
        <option value="away">Away</option>
        <option value="dnd">Do Not Disturb</option>
        <option value="offline">Offline</option>
      </select>
      <input
        :value="statusMessage"
        @input="setStatusMessage($event.target.value)"
        placeholder="Status message..."
      />
    </div>

    <!-- BLF Panel -->
    <div class="blf-panel">
      <h3>Extension Status</h3>
      <div class="blf-grid">
        <div
          v-for="ext in monitoredExtensions"
          :key="ext"
          class="blf-item"
          :class="blfStatus[ext]?.state || 'unknown'"
        >
          <span class="indicator"></span>
          <span class="extension">{{ ext }}</span>
          <span class="name">{{ blfStatus[ext]?.displayName || 'Unknown' }}</span>
          <button @click="makeCall(ext)" :disabled="blfStatus[ext]?.state === 'busy'">Call</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blf-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
}

.blf-item .indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.blf-item.available .indicator {
  background: #22c55e;
}
.blf-item.busy .indicator {
  background: #ef4444;
}
.blf-item.ringing .indicator {
  background: #f59e0b;
  animation: pulse 1s infinite;
}
.blf-item.away .indicator {
  background: #eab308;
}
.blf-item.offline .indicator {
  background: #6b7280;
}
</style>
```

## Features

- **Presence Status**: Track user availability in real-time
- **Custom Messages**: Set status messages (e.g., "In a meeting")
- **BLF Monitoring**: Watch extension busy/idle state
- **Quick Dial**: One-click calling from BLF panel
- **Subscriptions**: Subscribe to specific users or extensions
- **Visual Indicators**: Color-coded status display

## Key Composables

| Composable           | Purpose                          |
| -------------------- | -------------------------------- |
| `usePresence`        | User presence status management  |
| `useFreePBXPresence` | FreePBX-specific BLF integration |

## Presence States

| State       | Color  | Description            |
| ----------- | ------ | ---------------------- |
| `available` | Green  | User is available      |
| `busy`      | Red    | User is on a call      |
| `ringing`   | Amber  | User has incoming call |
| `away`      | Yellow | User is away           |
| `dnd`       | Red    | Do Not Disturb         |
| `offline`   | Gray   | User is offline        |

## BLF Status

```typescript
interface BLFStatus {
  extension: string
  state: 'available' | 'busy' | 'ringing' | 'offline'
  displayName?: string
  callerId?: string // When on a call
  direction?: 'inbound' | 'outbound'
}
```

## Subscribe to Users

```typescript
const { subscribeToUser, watchedUsers } = usePresence()

// Subscribe to specific users
await subscribeToUser('sip:alice@example.com')
await subscribeToUser('sip:bob@example.com')

// Watch their status
watchEffect(() => {
  for (const [uri, status] of watchedUsers.value) {
    console.log(`${uri}: ${status.state}`)
  }
})
```

## Related

- [SIP Messaging](/examples/sip-messaging)
- [Basic Call](/examples/basic-call)
- [Presence Guide](/guide/presence-messaging)
- [API: usePresence](/api/composables#usepresence)
