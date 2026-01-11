# Screen Sharing

Share your screen during calls.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#screen-sharing) or run `pnpm dev` → Navigate to **ScreenSharingDemo** in the playground
:::

## Overview

Screen sharing features:

- Screen/window/tab selection
- Start/stop sharing
- Replace video track with screen
- Sharing indicator

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useCallSession, useMediaDevices } from 'vuesip'

const { currentCall } = useCallSession()
const { startScreenShare, stopScreenShare, isScreenSharing } = useMediaDevices()

async function toggleScreenShare() {
  if (isScreenSharing.value) {
    await stopScreenShare()
  } else {
    await startScreenShare({
      video: { cursor: 'always' },
      audio: true, // Share system audio
    })
  }
}
</script>

<template>
  <div class="screen-share-demo">
    <button @click="toggleScreenShare" :class="{ active: isScreenSharing }">
      {{ isScreenSharing ? 'Stop Sharing' : 'Share Screen' }}
    </button>

    <div v-if="isScreenSharing" class="sharing-indicator">Screen sharing active</div>
  </div>
</template>
```

## Key Composables

| Composable        | Purpose                    |
| ----------------- | -------------------------- |
| `useMediaDevices` | Screen capture and sharing |

## Related

- [Video Calling](/examples/video-call)
- [Picture-in-Picture](/examples/picture-in-picture)
