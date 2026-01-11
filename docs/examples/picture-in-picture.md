# Picture-in-Picture

Browser Picture-in-Picture (PiP) integration for video calls.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#picture-in-picture) or run `pnpm dev` → Navigate to **PictureInPictureDemo** in the playground
:::

## Overview

Picture-in-Picture allows users to:

- Keep video visible while using other tabs/apps
- Automatic PiP when switching tabs
- Custom controls in PiP window
- Seamless video element management

## Quick Start

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCallSession, usePictureInPicture } from 'vuesip'

const { currentCall } = useCallSession()
const remoteVideo = ref<HTMLVideoElement>()

const { isSupported, isActive, enterPiP, exitPiP, togglePiP } = usePictureInPicture(remoteVideo, {
  autoEnterOnTabSwitch: true,
  width: 400,
  height: 225,
})

// Attach remote stream to video element
watch(
  () => currentCall.value?.remoteStream,
  (stream) => {
    if (remoteVideo.value && stream) {
      remoteVideo.value.srcObject = stream
    }
  }
)
</script>

<template>
  <div class="pip-demo">
    <div v-if="!isSupported" class="warning">
      Picture-in-Picture is not supported in this browser.
    </div>

    <!-- Video Container -->
    <div class="video-container">
      <video ref="remoteVideo" autoplay playsinline />

      <!-- PiP Controls -->
      <div class="pip-controls">
        <button @click="togglePiP" :disabled="!isSupported || !currentCall">
          {{ isActive ? 'Exit PiP' : 'Enter PiP' }}
        </button>
      </div>
    </div>

    <p class="hint">
      {{
        isActive
          ? 'Video is in Picture-in-Picture mode'
          : 'Click button or switch tabs to activate PiP'
      }}
    </p>
  </div>
</template>
```

## Features

- **Browser PiP API**: Uses native Picture-in-Picture
- **Auto-Enter**: Automatically enters PiP when tab loses focus
- **Custom Size**: Configure PiP window dimensions
- **Toggle Control**: Easy on/off switching
- **Event Handling**: Callbacks for enter/exit events

## Key Composables

| Composable            | Purpose                            |
| --------------------- | ---------------------------------- |
| `usePictureInPicture` | PiP lifecycle management           |
| `useVideoInset`       | Alternative: CSS-based video inset |

## Configuration Options

```typescript
const pip = usePictureInPicture(videoRef, {
  // Auto-enter PiP when tab loses focus
  autoEnterOnTabSwitch: true,

  // PiP window dimensions
  width: 400,
  height: 225,

  // Event callbacks
  onEnter: () => console.log('Entered PiP'),
  onExit: () => console.log('Exited PiP'),
  onResize: (width, height) => console.log(`Resized: ${width}x${height}`),
})
```

## Return Values

```typescript
const {
  isSupported, // Ref<boolean> - Is PiP supported
  isActive, // Ref<boolean> - Is PiP currently active
  pipWindow, // Ref<PictureInPictureWindow | null>

  enterPiP, // () => Promise<void>
  exitPiP, // () => Promise<void>
  togglePiP, // () => Promise<void>
} = usePictureInPicture(videoRef, options)
```

## Browser Support

| Browser | Support                  |
| ------- | ------------------------ |
| Chrome  | ✅ Full support          |
| Edge    | ✅ Full support          |
| Firefox | ⚠️ Limited (no auto-PiP) |
| Safari  | ✅ Full support          |

## CSS Video Inset Alternative

For more control, use `useVideoInset` for a CSS-based solution:

```typescript
import { useVideoInset } from 'vuesip'

const { position, size, isDragging, setPosition, setSize } = useVideoInset({
  position: 'bottom-right',
  size: 'medium',
  draggable: true,
})
```

## Related

- [Video Calling](/examples/video-call)
- [Conference Gallery](/examples/conference-gallery)
- [Video Guide](/guide/video-calling)
- [API: usePictureInPicture](/api/composables#usepictureinpicture)
