# Video Calling

Bidirectional video calling with camera selection, preview, and advanced controls.

::: tip Try It Live
Run `pnpm dev` → Navigate to **VideoCallDemo** in the playground
:::

## Overview

The video call demo showcases:

- Bidirectional video and audio calls
- Local video preview before connecting
- Camera enumeration and selection
- Switch cameras during active calls
- Enable/disable video mid-call

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useSipClient, useCallSession, useMediaDevices } from 'vuesip'

const { isRegistered } = useSipClient()
const { currentCall, makeCall, hangup, answer } = useCallSession()
const { videoInputDevices, selectedVideoInput, selectVideoInput, requestPermissions, localStream } =
  useMediaDevices()

// Video elements
const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()

// Request camera access on mount
onMounted(async () => {
  await requestPermissions(true, true) // audio, video
})

// Attach streams to video elements
watch(localStream, (stream) => {
  if (localVideo.value && stream) {
    localVideo.value.srcObject = stream
  }
})

watch(
  () => currentCall.value?.remoteStream,
  (stream) => {
    if (remoteVideo.value && stream) {
      remoteVideo.value.srcObject = stream
    }
  }
)

// Make video call
async function startVideoCall(target: string) {
  await makeCall(target, {
    video: true,
    audio: true,
  })
}
</script>

<template>
  <div class="video-call-demo">
    <!-- Camera Selection -->
    <div class="camera-select">
      <label>Camera:</label>
      <select :value="selectedVideoInput?.deviceId" @change="selectVideoInput($event.target.value)">
        <option v-for="device in videoInputDevices" :key="device.deviceId" :value="device.deviceId">
          {{ device.label }}
        </option>
      </select>
    </div>

    <!-- Video Preview -->
    <div class="video-container">
      <video ref="remoteVideo" class="remote-video" autoplay playsinline />
      <video ref="localVideo" class="local-video" autoplay playsinline muted />
    </div>

    <!-- Call Controls -->
    <div class="controls">
      <button @click="startVideoCall('1001')">Start Video Call</button>
      <button v-if="currentCall" @click="hangup">End Call</button>
    </div>
  </div>
</template>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #000;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.local-video {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 25%;
  aspect-ratio: 16/9;
  border: 2px solid white;
  border-radius: 8px;
}
</style>
```

## Features

- **Bidirectional Video**: Both parties can send and receive video
- **Camera Preview**: See yourself before the call starts
- **Device Selection**: Choose from available cameras
- **Hot Swap**: Switch cameras without ending the call
- **Video Toggle**: Turn video on/off during calls
- **Responsive Layout**: Adaptive video sizing

## Key Composables

| Composable        | Purpose                          |
| ----------------- | -------------------------------- |
| `useSipClient`    | SIP connection management        |
| `useCallSession`  | Call state and video streams     |
| `useMediaDevices` | Camera enumeration and selection |

## Video Controls During Call

```typescript
const { toggleVideo, isVideoEnabled, replaceVideoTrack } = useCallSession()

// Toggle video on/off
await toggleVideo()

// Switch camera mid-call
await replaceVideoTrack(newCameraDeviceId)
```

## Related

- [Basic Audio Call](/examples/basic-call)
- [Picture-in-Picture](/examples/picture-in-picture)
- [Screen Sharing](/examples/screen-sharing)
- [Video Calling Guide](/guide/video-calling)
