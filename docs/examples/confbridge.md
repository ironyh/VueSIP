# ConfBridge Manager

Manage Asterisk ConfBridge conferences via AMI.

::: tip Try It Live
Run `pnpm dev` → Navigate to **ConfBridgeDemo** in the playground
:::

## Overview

ConfBridge management features:

- List active conferences
- View conference participants
- Lock/unlock rooms
- Start/stop recording
- Mute/unmute participants
- Kick participants
- Set video source

## Quick Start

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAmi, useAmiConfBridge } from 'vuesip'

const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

const {
  roomList,
  userList,
  isLoading,
  totalParticipants,
  listRooms,
  listUsers,
  muteUser,
  kickUser,
  lockRoom,
} = useAmiConfBridge(computed(() => ami.getClient()))

await listRooms()
</script>

<template>
  <div class="confbridge-demo">
    <div class="status-bar">
      <span>{{ roomList.length }} conferences</span>
      <span>{{ totalParticipants }} participants</span>
    </div>

    <div v-for="room in roomList" :key="room.conference" class="room-card">
      <h4>{{ room.conference }}</h4>
      <div class="badges">
        <span v-if="room.locked" class="badge locked">Locked</span>
        <span v-if="room.recording" class="badge recording">Recording</span>
      </div>
      <div class="actions">
        <button @click="listUsers(room.conference)">View Users</button>
        <button @click="lockRoom(room.conference)">Lock</button>
      </div>
    </div>
  </div>
</template>
```

## Room Management

```typescript
// Lock a conference
await lockRoom('1000')

// Unlock a conference
await unlockRoom('1000')

// Start recording
await startRecording('1000', '/var/spool/asterisk/monitor/conf.wav')

// Stop recording
await stopRecording('1000')
```

## Participant Management

```typescript
// List participants
await listUsers('1000')

// Mute a participant
await muteUser('1000', 'PJSIP/1001-00000001')

// Unmute a participant
await unmuteUser('1000', 'PJSIP/1001-00000001')

// Kick a participant
await kickUser('1000', 'PJSIP/1001-00000001')

// Set video source
await setVideoSource('1000', 'PJSIP/1002-00000002')
```

## Key Composables

| Composable         | Purpose                       |
| ------------------ | ----------------------------- |
| `useAmiConfBridge` | ConfBridge conference control |

## Related

- [Queue Monitor](/examples/queue-monitor)
- [Agent Login](/examples/agent-login)
