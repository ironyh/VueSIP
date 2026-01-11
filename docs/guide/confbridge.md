# ConfBridge Conferencing Guide

This guide covers managing Asterisk ConfBridge conferences via the Asterisk Manager Interface (AMI) in VueSIP.

## Overview

VueSIP provides a reactive `useAmiConfBridge` composable for managing ConfBridge audio conferences. This enables:

| Feature                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| **Room Management**     | List, lock/unlock, mute conferences           |
| **Recording**           | Start/stop conference recording               |
| **Participant Control** | Mute, unmute, kick users                      |
| **Video Source**        | Set single video source for video conferences |
| **Real-time Events**    | Join, leave, talking status updates           |

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  VueSIP App     │◄────►│  amiws Proxy     │◄────►│  Asterisk PBX   │
│  (Browser)      │  WS  │  (WebSocket)     │  AMI │  (ConfBridge)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                          │
                                                          ▼
                                                   ┌─────────────────┐
                                                   │  Conference     │
                                                   │  Rooms          │
                                                   └─────────────────┘
```

### Components

1. **Asterisk PBX** - Hosts ConfBridge conferences
2. **amiws Proxy** - Converts AMI protocol to WebSocket (JSON)
3. **VueSIP** - `useAmiConfBridge` composable for reactive conference management

## Prerequisites

### Asterisk Configuration

#### 1. Configure ConfBridge

Create or edit `/etc/asterisk/confbridge.conf`:

```ini
; /etc/asterisk/confbridge.conf

[general]

; Default user profile
[default_user]
type=user
admin=no
marked=no
startmuted=no
music_on_hold_when_empty=yes
music_on_hold_class=default
quiet=no
announce_user_count=yes
announce_join_leave=yes
dtmf_passthrough=no
announce_user_count_all=yes

; Admin user profile
[admin_user]
type=user
admin=yes
marked=yes
startmuted=no
dtmf_passthrough=no

; Default bridge profile
[default_bridge]
type=bridge
max_members=50
record_conference=no
internal_sample_rate=auto
mixing_interval=20
video_mode=follow_talker
```

#### 2. Create Conference Dialplan

Edit `/etc/asterisk/extensions.conf` or use FreePBX Custom Extensions:

```
; /etc/asterisk/extensions.conf

[confbridge-rooms]
; Room 1000 - Regular conference
exten => 1000,1,Answer()
 same => n,ConfBridge(1000,default_bridge,default_user)
 same => n,Hangup()

; Room 1001 - Admin conference
exten => 1001,1,Answer()
 same => n,ConfBridge(1001,default_bridge,admin_user)
 same => n,Hangup()

; Dynamic room - dial any 4-digit number starting with 1
exten => _1XXX,1,Answer()
 same => n,ConfBridge(${EXTEN},default_bridge,default_user)
 same => n,Hangup()
```

#### 3. Configure AMI User

Edit `/etc/asterisk/manager.conf`:

```ini
; /etc/asterisk/manager.conf
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1

[vuesip]
secret = your-secure-password
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = call,user,reporting
write = call,originate
eventfilter = !Event: RTCP*
eventfilter = !Event: VarSet
```

**Required Permissions:**

- `read = call` - Receive ConfBridge events
- `write = call` - Send ConfBridge commands

#### 4. Reload Configuration

```bash
asterisk -rx "module reload app_confbridge.so"
asterisk -rx "manager reload"
```

### FreePBX Configuration

In FreePBX, conferences are managed via the GUI:

1. Navigate to **Applications > Conferences**
2. Click **+ Add Conference**
3. Configure:
   - **Conference Number**: e.g., `1000`
   - **Conference Name**: e.g., `Main Conference`
   - **User PIN**: Optional access PIN
   - **Admin PIN**: Optional admin PIN
   - **Options**: Join/Leave announcements, recording, etc.
4. Submit and Apply Config

For AMI access, configure via **Settings > Asterisk Manager Users** as described in the [AMI CDR Guide](./ami-cdr.md).

## VueSIP Integration

### Basic Setup

```typescript
import { computed } from 'vue'
import { useAmi, useAmiConfBridge } from 'vuesip'

// Create AMI connection
const ami = useAmi()

// Connect to amiws proxy
await ami.connect('ws://pbx.example.com:8080')

// Initialize ConfBridge management
const {
  rooms, // Map<string, ConfBridgeRoom>
  users, // Map<string, ConfBridgeUser>
  roomList, // Computed array of rooms
  userList, // Computed array of users
  totalParticipants, // Total participant count
  isLoading, // Loading state
  error, // Error state
  listRooms, // Fetch all conferences
  listUsers, // Fetch users in a conference
  lockRoom, // Lock a conference
  unlockRoom, // Unlock a conference
  startRecording, // Start recording
  stopRecording, // Stop recording
  muteUser, // Mute a participant
  unmuteUser, // Unmute a participant
  kickUser, // Remove a participant
  setVideoSource, // Set video source
  refresh, // Refresh all data
} = useAmiConfBridge(computed(() => ami.getClient()))
```

### Conference Dashboard

```vue
<template>
  <div class="confbridge-dashboard">
    <!-- Conference List -->
    <div class="conferences">
      <h2>Active Conferences</h2>
      <div v-for="room in roomList" :key="room.conference" class="conference-card">
        <div class="conference-header">
          <h3>Room {{ room.conference }}</h3>
          <span class="participant-count">{{ room.parties }} participants</span>
        </div>

        <div class="conference-status">
          <span v-if="room.locked" class="badge locked">Locked</span>
          <span v-if="room.recording" class="badge recording">Recording</span>
          <span v-if="room.muted" class="badge muted">Muted</span>
        </div>

        <div class="conference-actions">
          <button @click="toggleLock(room)">
            {{ room.locked ? 'Unlock' : 'Lock' }}
          </button>
          <button @click="toggleRecording(room)">
            {{ room.recording ? 'Stop Recording' : 'Start Recording' }}
          </button>
          <button @click="viewParticipants(room)">View Participants</button>
        </div>
      </div>
    </div>

    <!-- Participant List -->
    <div v-if="selectedRoom" class="participants">
      <h2>Participants in {{ selectedRoom.conference }}</h2>
      <div v-for="user in roomParticipants" :key="user.channel" class="participant-card">
        <div class="participant-info">
          <span class="name">{{ user.callerIdName || user.callerIdNum }}</span>
          <span v-if="user.admin" class="badge admin">Admin</span>
          <span v-if="user.talking" class="badge talking">Speaking</span>
        </div>

        <div class="participant-actions">
          <button @click="toggleMute(user)">
            {{ user.muted ? 'Unmute' : 'Mute' }}
          </button>
          <button @click="kick(user)" class="danger">Kick</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAmi, useAmiConfBridge } from 'vuesip'
import type { ConfBridgeRoom, ConfBridgeUser } from 'vuesip'

const ami = useAmi()
const {
  roomList,
  userList,
  lockRoom,
  unlockRoom,
  startRecording,
  stopRecording,
  muteUser,
  unmuteUser,
  kickUser,
  listUsers,
} = useAmiConfBridge(computed(() => ami.getClient()))

const selectedRoom = ref<ConfBridgeRoom | null>(null)

const roomParticipants = computed(() =>
  userList.value.filter((u) => u.conference === selectedRoom.value?.conference)
)

async function viewParticipants(room: ConfBridgeRoom) {
  selectedRoom.value = room
  await listUsers(room.conference)
}

async function toggleLock(room: ConfBridgeRoom) {
  if (room.locked) {
    await unlockRoom(room.conference)
  } else {
    await lockRoom(room.conference)
  }
}

async function toggleRecording(room: ConfBridgeRoom) {
  if (room.recording) {
    await stopRecording(room.conference)
  } else {
    await startRecording(room.conference)
  }
}

async function toggleMute(user: ConfBridgeUser) {
  if (user.muted) {
    await unmuteUser(user.conference, user.channel)
  } else {
    await muteUser(user.conference, user.channel)
  }
}

async function kick(user: ConfBridgeUser) {
  await kickUser(user.conference, user.channel)
}
</script>
```

### Real-time Events

Subscribe to conference events for live updates:

```typescript
const { rooms, users } = useAmiConfBridge(
  computed(() => ami.getClient()),
  {
    // Auto-refresh room list on connect
    autoRefresh: true,

    // Handle user join events
    onUserJoin: (user) => {
      console.log(`${user.callerIdName} joined ${user.conference}`)
      showNotification(`${user.callerIdName} joined the conference`)
    },

    // Handle user leave events
    onUserLeave: (user) => {
      console.log(`${user.callerIdName} left ${user.conference}`)
    },

    // Handle talking status changes
    onTalkingChange: (user, isTalking) => {
      if (isTalking) {
        console.log(`${user.callerIdName} is speaking`)
        // Update active speaker indicator
      }
    },

    // Optional: Filter conferences
    conferenceFilter: (room) => {
      // Only show conferences starting with '100'
      return room.conference.startsWith('100')
    },

    // Optional: Transform user data
    transformUser: (user) => ({
      ...user,
      displayName: user.callerIdName || `Ext ${user.callerIdNum}`,
    }),
  }
)
```

### Recording Management

```typescript
// Start recording with custom filename
const result = await startRecording(
  '1000',
  '/var/spool/asterisk/monitor/conf-1000-${TIMESTAMP}.wav'
)

if (result.success) {
  console.log('Recording started')
} else {
  console.error('Recording failed:', result.error)
}

// Stop recording
await stopRecording('1000')
```

### Video Conferencing

For video conferences, set the single video source:

```typescript
// Set a specific participant as the video source
await setVideoSource('1000', 'PJSIP/1001-00000001')

// The video source participant's video will be broadcast to all
```

Note: Video mode must be configured in `confbridge.conf`:

```ini
[video_bridge]
type=bridge
video_mode=single_source  ; or follow_talker
```

## API Reference

### ConfBridgeRoom Interface

| Field         | Type    | Description                    |
| ------------- | ------- | ------------------------------ |
| `conference`  | string  | Conference name/number         |
| `parties`     | number  | Number of participants         |
| `locked`      | boolean | Whether room is locked         |
| `muted`       | boolean | Whether room is globally muted |
| `recording`   | boolean | Recording active               |
| `markedUsers` | number  | Count of admin/marked users    |

### ConfBridgeUser Interface

| Field          | Type    | Description           |
| -------------- | ------- | --------------------- |
| `conference`   | string  | Conference name       |
| `callerIdNum`  | string  | Caller's number       |
| `callerIdName` | string  | Caller's display name |
| `channel`      | string  | Channel identifier    |
| `admin`        | boolean | Is admin/moderator    |
| `marked`       | boolean | Is marked user        |
| `muted`        | boolean | Is muted              |
| `talking`      | boolean | Currently talking     |
| `joinedAt`     | Date    | Join timestamp        |

### Actions

| Method                                | Parameters                          | Description                    |
| ------------------------------------- | ----------------------------------- | ------------------------------ |
| `listRooms()`                         | -                                   | Fetch all active conferences   |
| `listUsers(conference)`               | conference: string                  | Fetch users in a conference    |
| `lockRoom(conference)`                | conference: string                  | Lock conference (no new joins) |
| `unlockRoom(conference)`              | conference: string                  | Unlock conference              |
| `startRecording(conference, file?)`   | conference: string, file?: string   | Start recording                |
| `stopRecording(conference)`           | conference: string                  | Stop recording                 |
| `muteUser(conference, channel)`       | conference: string, channel: string | Mute participant               |
| `unmuteUser(conference, channel)`     | conference: string, channel: string | Unmute participant             |
| `kickUser(conference, channel)`       | conference: string, channel: string | Remove participant             |
| `setVideoSource(conference, channel)` | conference: string, channel: string | Set video source               |
| `refresh()`                           | -                                   | Refresh all room and user data |

## AMI Events Reference

VueSIP automatically handles these AMI events:

| Event               | Description                 |
| ------------------- | --------------------------- |
| `ConfbridgeJoin`    | User joined conference      |
| `ConfbridgeLeave`   | User left conference        |
| `ConfbridgeTalking` | User talking status changed |
| `ConfbridgeMute`    | User was muted              |
| `ConfbridgeUnmute`  | User was unmuted            |
| `ConfbridgeLock`    | Conference was locked       |
| `ConfbridgeUnlock`  | Conference was unlocked     |
| `ConfbridgeRecord`  | Recording started           |

## Troubleshooting

### No Conferences Visible

1. **Verify ConfBridge is loaded:**

   ```bash
   asterisk -rx "module show like app_confbridge"
   # Should show: app_confbridge.so
   ```

2. **Check active conferences:**

   ```bash
   asterisk -rx "confbridge list"
   ```

3. **Verify AMI permissions:**
   ```bash
   asterisk -rx "manager show user vuesip"
   # Check read permissions include 'call'
   ```

### Lock/Recording Actions Fail

1. **Check write permissions:**
   - AMI user needs `write = call` permission

2. **Verify conference exists:**

   ```bash
   asterisk -rx "confbridge show 1000"
   ```

3. **Check for error responses:**
   ```typescript
   const result = await lockRoom('1000')
   if (!result.success) {
     console.error('Lock failed:', result.error)
   }
   ```

### Talking Events Not Working

1. **Enable talk detection in confbridge.conf:**

   ```ini
   [default_bridge]
   type=bridge
   talk_detection_events=yes
   ```

2. **Reload configuration:**
   ```bash
   asterisk -rx "module reload app_confbridge.so"
   ```

### Recording Path Issues

1. **Ensure directory exists and is writable:**

   ```bash
   mkdir -p /var/spool/asterisk/monitor
   chown asterisk:asterisk /var/spool/asterisk/monitor
   ```

2. **Use absolute paths:**
   ```typescript
   await startRecording('1000', '/var/spool/asterisk/monitor/conf-1000.wav')
   ```

## Security Best Practices

1. **Restrict AMI permissions** - Only grant required read/write permissions
2. **Use conference PINs** - Configure user/admin PINs for access control
3. **Enable TLS** - Use WSS for WebSocket connections
4. **Limit conference sizes** - Set `max_members` in bridge profiles
5. **Monitor recordings** - Implement retention policies for recorded conferences

## Related Documentation

- [AMI CDR Guide](./ami-cdr.md) - Call Detail Records via AMI
- [Call Parking](./call-parking.md) - Park and retrieve calls
- [Voicemail](./voicemail.md) - Voicemail management

## External Resources

- [Asterisk ConfBridge Documentation](https://docs.asterisk.org/Configuration/Applications/Conferencing-Applications/ConfBridge/)
- [ConfBridge AMI Actions](https://docs.asterisk.org/Asterisk_22_Documentation/API_Documentation/AMI_Actions/)
- [amiws GitHub Repository](https://github.com/staskobzar/amiws)
