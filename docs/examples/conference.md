# Conference Calls

Multi-party audio and video conference calling with participant management.

::: tip Try It Live
Run `pnpm dev` → Navigate to **ConferenceCallDemo** in the playground
:::

## Overview

The conference call demo showcases:

- Multi-party audio/video conferences
- Participant list and management
- Mute individual participants
- Join/leave notifications
- Active speaker detection
- Conference moderation controls

## Quick Start

```vue
<script setup lang="ts">
import { useSipClient, useConference, useActiveSpeaker } from 'vuesip'

const { isRegistered } = useSipClient()

const {
  conferenceState,
  participants,
  isInConference,
  joinConference,
  leaveConference,
  muteParticipant,
  kickParticipant,
} = useConference()

const { activeSpeaker, activeSpeakers } = useActiveSpeaker(participants)

const conferenceId = ref('')

async function handleJoin() {
  if (conferenceId.value) {
    await joinConference(conferenceId.value, {
      audio: true,
      video: true,
    })
  }
}
</script>

<template>
  <div class="conference-demo">
    <!-- Join Conference -->
    <div v-if="!isInConference" class="join-form">
      <input v-model="conferenceId" placeholder="Conference ID" />
      <button @click="handleJoin" :disabled="!conferenceId">Join Conference</button>
    </div>

    <!-- Active Conference -->
    <div v-else class="conference-active">
      <div class="conference-header">
        <h3>Conference: {{ conferenceId }}</h3>
        <span class="participant-count"> {{ participants.length }} participants </span>
      </div>

      <!-- Active Speaker Indicator -->
      <div v-if="activeSpeaker" class="active-speaker">
        Speaking: {{ activeSpeaker.displayName }}
      </div>

      <!-- Participant Grid -->
      <div class="participant-grid">
        <div
          v-for="participant in participants"
          :key="participant.id"
          :class="['participant-tile', { speaking: activeSpeakers.includes(participant) }]"
        >
          <video
            v-if="participant.videoStream"
            :srcObject="participant.videoStream"
            autoplay
            playsinline
            :muted="participant.isLocal"
          />
          <div class="participant-info">
            <span class="name">{{ participant.displayName }}</span>
            <span v-if="participant.isMuted" class="muted-badge">Muted</span>
          </div>

          <!-- Moderator Controls -->
          <div class="controls" v-if="!participant.isLocal">
            <button @click="muteParticipant(participant.id)">
              {{ participant.isMuted ? 'Unmute' : 'Mute' }}
            </button>
            <button @click="kickParticipant(participant.id)">Remove</button>
          </div>
        </div>
      </div>

      <button @click="leaveConference" class="leave-btn">Leave Conference</button>
    </div>
  </div>
</template>
```

## Features

- **Multi-Party Support**: Up to 50+ participants
- **Audio/Video**: Full bidirectional media
- **Active Speaker**: Automatic detection and highlighting
- **Participant Management**: Mute, kick, promote
- **Join/Leave Events**: Real-time notifications
- **Moderation**: Host controls for managing participants

## Key Composables

| Composable               | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `useConference`          | Conference lifecycle and participant management |
| `useActiveSpeaker`       | Detect who is currently speaking                |
| `useGalleryLayout`       | Grid layout calculations for video tiles        |
| `useParticipantControls` | Individual participant controls                 |

## Conference States

| State     | Description                   |
| --------- | ----------------------------- |
| `idle`    | Not in a conference           |
| `joining` | Connecting to conference      |
| `active`  | In an active conference       |
| `leaving` | Disconnecting from conference |

## Advanced Features

### Active Speaker Detection

```typescript
const { activeSpeaker, speakerHistory } = useActiveSpeaker(participants, {
  threshold: 0.15, // Audio level threshold
  debounceMs: 300, // Prevent rapid switching
  historySize: 10, // Track recent speakers
})
```

### Gallery Layout

```typescript
const { gridCols, gridRows, tileDimensions, gridStyle } = useGalleryLayout(participants, {
  containerSize: containerRef,
  gap: 8,
  maxCols: 4,
  maxRows: 4,
  aspectRatio: 16 / 9,
})
```

## Related

- [Conference Gallery](/examples/conference-gallery)
- [API: useActiveSpeaker](/api/composables#useactivespeaker)
- [Video Calling](/examples/video-call)
- [API: useConference](/api/composables#useconference)
