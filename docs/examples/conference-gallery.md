# Conference Gallery

Gallery layout for conference video participants.

::: tip Try It Live
Run `pnpm dev` → Navigate to **ConferenceGalleryDemo** in the playground
:::

## Overview

Gallery layout features:

- Grid layout for participants
- Active speaker highlighting
- Responsive grid sizing
- Pin/spotlight participants
- Layout mode switching

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useConference, useGalleryLayout, useActiveSpeaker } from 'vuesip'

const containerRef = ref<HTMLElement>()
const { participants } = useConference()
const { activeSpeaker } = useActiveSpeaker(participants)

const {
  layout,
  gridCols,
  gridRows,
  gridStyle,
  tileDimensions,
  setLayout,
  pinParticipant,
  unpinParticipant,
  pinnedParticipantId,
} = useGalleryLayout(participants, {
  containerSize: containerRef,
  gap: 8,
  maxCols: 4,
  maxRows: 4,
  activeSpeakerId: computed(() => activeSpeaker.value?.id),
})
</script>

<template>
  <div ref="containerRef" class="gallery" :style="gridStyle">
    <div
      v-for="participant in participants"
      :key="participant.id"
      :class="[
        'tile',
        { speaking: participant.id === activeSpeaker?.id },
        { pinned: participant.id === pinnedParticipantId },
      ]"
      :style="{
        width: `${tileDimensions.width}px`,
        height: `${tileDimensions.height}px`,
      }"
      @dblclick="pinParticipant(participant.id)"
    >
      <video :srcObject="participant.videoStream" autoplay playsinline />
      <span class="name">{{ participant.displayName }}</span>
    </div>
  </div>
</template>
```

## Layout Modes

| Mode        | Description             |
| ----------- | ----------------------- |
| `grid`      | Equal-sized tiles       |
| `speaker`   | Focus on active speaker |
| `sidebar`   | Main + sidebar tiles    |
| `spotlight` | Single participant      |

## Key Composables

| Composable         | Purpose           |
| ------------------ | ----------------- |
| `useGalleryLayout` | Grid calculations |
| `useActiveSpeaker` | Speaker detection |

## Related

- [Conference Calls](/examples/conference)
- [Video Calling](/examples/video-call)
