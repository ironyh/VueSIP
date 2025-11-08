# Video Calling Guide

This comprehensive guide covers everything you need to implement professional video calling in VueSip, from basic setup to advanced features like screen sharing, quality optimization, and mobile camera handling.

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Camera Management](#camera-management)
- [Video UI Patterns](#video-ui-patterns)
- [Making Video Calls](#making-video-calls)
- [Receiving Video Calls](#receiving-video-calls)
- [Video Quality Management](#video-quality-management)
- [Screen Sharing](#screen-sharing)
- [Advanced Features](#advanced-features)
- [Mobile Considerations](#mobile-considerations)
- [Performance](#performance)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Complete Examples](#complete-examples)

---

## Introduction

### What is Video Calling in VueSip?

Video calling extends VueSip's audio capabilities with real-time video communication. Built on WebRTC technology, VueSip makes it easy to add face-to-face video calls to your Vue application with minimal code.

**Why Use Video Calling?**
- **Personal Connection**: Face-to-face interaction builds stronger relationships
- **Visual Communication**: Show documents, products, or demonstrations
- **Remote Collaboration**: Work together as if in the same room
- **Customer Support**: Provide visual assistance for complex issues
- **Telehealth**: Enable remote medical consultations
- **Remote Interviews**: Conduct job interviews from anywhere

### When to Use Video vs Audio-Only

**Use Video When:**
- Visual communication adds value (product demos, support)
- Face-to-face interaction is important (interviews, consultations)
- Screen sharing is needed (collaboration, troubleshooting)
- Users have sufficient bandwidth (>500 kbps recommended)

**Use Audio-Only When:**
- Bandwidth is limited (mobile networks, poor connectivity)
- Privacy is a concern (users may not want to be seen)
- Battery life matters (audio uses less power than video)
- Call quality is more important than visual presence

💡 **Tip**: Always provide an option to switch between audio and video during calls to accommodate changing needs and network conditions.

### Browser Requirements

Video calling requires modern browsers with WebRTC support:

✅ **Fully Supported:**
- Chrome/Chromium 56+
- Firefox 52+
- Safari 11+
- Edge 79+
- Opera 43+

⚠️ **Limited Support:**
- Safari on iOS 11+ (with restrictions)
- Chrome on Android 5+

📝 **Note**: Camera and microphone permissions must be granted by the user. HTTPS is required in production (localhost works for development).

---

## Quick Start

### Making Your First Video Call

Here's the simplest way to make a video call in VueSip:

```typescript
import { useSipClient, useCallSession } from 'vuesip'

// Initialize the SIP client
const { sipClient } = useSipClient()

// Initialize call session
const {
  makeCall,
  localStream,
  remoteStream,
  hangup
} = useCallSession(sipClient)

// Make a video call (both audio and video enabled)
await makeCall('sip:bob@example.com', {
  audio: true,  // Enable microphone
  video: true   // Enable camera
})

// localStream and remoteStream are now available
// Attach them to <video> elements (see next section)
```

💡 **What's Happening Behind the Scenes:**
1. VueSip requests camera and microphone permissions
2. Captures your video/audio stream
3. Initiates a SIP call with video enabled
4. Negotiates video codecs and quality with the remote party
5. Establishes the WebRTC connection
6. Streams start flowing bidirectionally

### Attaching Streams to Video Elements

Once streams are available, display them in your UI:

```vue
<template>
  <div class="video-call">
    <!-- Remote video (the person you're calling) -->
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      class="remote-video"
    />

    <!-- Local video (your camera - self-view) -->
    <video
      ref="localVideo"
      autoplay
      muted
      playsinline
      class="local-video"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCallSession } from 'vuesip'

const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()

const { localStream, remoteStream } = useCallSession(sipClient)

// Attach local stream when available
watch(localStream, (stream) => {
  if (stream && localVideo.value) {
    localVideo.value.srcObject = stream
  }
})

// Attach remote stream when available
watch(remoteStream, (stream) => {
  if (stream && remoteVideo.value) {
    remoteVideo.value.srcObject = stream
  }
})
</script>

<style scoped>
.video-call {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #000;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.local-video {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  border: 2px solid white;
  border-radius: 8px;
  object-fit: cover;
}
</style>
```

⚠️ **Critical**: Always set `muted` on the local video element to prevent audio feedback loops. The `autoplay` and `playsinline` attributes ensure smooth playback across all browsers.

📝 **Note**: The `object-fit` CSS property controls how video fits in its container:
- `contain`: Shows entire video (may have black bars)
- `cover`: Fills container (may crop video)
- `fill`: Stretches video to fit (may distort)

---

## Camera Management

### Understanding Camera Enumeration

Before making video calls, you need to discover what cameras are available on the user's device. This is essential for:
- Letting users choose their preferred camera
- Supporting multiple cameras (built-in + external)
- Handling mobile front/back camera switching
- Providing a camera preview before calls

### Enumerating Available Cameras

```typescript
import { useMediaDevices } from 'vuesip'

const {
  videoInputDevices,      // Array of available cameras
  hasVideoInputDevices,   // Boolean: true if any cameras found
  hasVideoPermission,     // Boolean: true if permission granted
  requestPermissions,     // Request camera permission
  enumerateDevices        // Refresh device list
} = useMediaDevices()

// Request camera permission first (required to see camera labels)
await requestPermissions(false, true)  // audio: false, video: true

// Enumerate devices to populate the list
await enumerateDevices()

// Display available cameras
console.log('Available cameras:', videoInputDevices.value)
// Example output: [
//   { deviceId: 'abc123', label: 'FaceTime HD Camera', kind: 'videoinput' },
//   { deviceId: 'def456', label: 'USB Camera', kind: 'videoinput' }
// ]
```

⚠️ **Important**: Camera labels are only available after permission is granted. Without permission, you'll see generic labels like "Camera (1234)".

💡 **Best Practice**: Request permissions before enumerating devices to ensure you get friendly camera names.

### Selecting a Specific Camera

Let users choose which camera to use for video calls:

```typescript
import { useMediaDevices } from 'vuesip'

const {
  videoInputDevices,
  selectedVideoInputId,
  selectVideoInput
} = useMediaDevices()

// Let user select a camera
function selectCamera(deviceId: string) {
  selectVideoInput(deviceId)
  console.log('Selected camera:', deviceId)

  // This camera will be used for all future video calls
  // Until the user selects a different one
}

// Build a camera selector UI
```

```vue
<template>
  <div class="camera-selector">
    <label for="camera">Select Camera:</label>
    <select
      id="camera"
      v-model="selectedVideoInputId"
      @change="handleCameraChange"
    >
      <option
        v-for="camera in videoInputDevices"
        :key="camera.deviceId"
        :value="camera.deviceId"
      >
        {{ camera.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useMediaDevices } from 'vuesip'

const { videoInputDevices, selectedVideoInputId } = useMediaDevices()

function handleCameraChange() {
  console.log('User selected camera:', selectedVideoInputId.value)
  // Camera is automatically selected via v-model binding
}
</script>
```

### Camera Permissions

Handle camera permission requests gracefully:

```typescript
import { useMediaDevices } from 'vuesip'

const {
  requestVideoPermission,
  hasVideoPermission,
  videoPermission
} = useMediaDevices()

// Request camera permission
async function requestCamera() {
  try {
    const granted = await requestVideoPermission()

    if (granted) {
      console.log('Camera permission granted')
      // Re-enumerate to get camera labels
      await enumerateDevices()
    } else {
      console.log('Camera permission denied')
      // Show instructions to enable in browser settings
    }
  } catch (error) {
    console.error('Failed to request camera:', error)
  }
}

// Check permission state
if (hasVideoPermission.value) {
  console.log('Already have camera permission')
} else {
  console.log('Need to request camera permission')
  await requestCamera()
}
```

### Camera Preview Before Calls

Show a camera preview so users can check their appearance before joining:

```vue
<template>
  <div class="camera-preview">
    <h3>Camera Preview</h3>

    <!-- Preview video element -->
    <video
      ref="previewVideo"
      autoplay
      muted
      playsinline
      class="preview"
    />

    <!-- Camera selector -->
    <select v-model="selectedVideoInputId">
      <option
        v-for="camera in videoInputDevices"
        :key="camera.deviceId"
        :value="camera.deviceId"
      >
        {{ camera.label }}
      </option>
    </select>

    <!-- Join call button -->
    <button @click="joinWithVideo">Join Call</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMediaDevices, useCallSession } from 'vuesip'

const previewVideo = ref<HTMLVideoElement>()
let previewStream: MediaStream | null = null

const {
  videoInputDevices,
  selectedVideoInputId,
  requestPermissions
} = useMediaDevices()

const { makeCall } = useCallSession(sipClient)

// Request permission and start preview on mount
onMounted(async () => {
  await requestPermissions(false, true)
  await startPreview()
})

// Restart preview when camera changes
watch(selectedVideoInputId, async () => {
  await startPreview()
})

// Start camera preview
async function startPreview() {
  // Stop existing preview
  if (previewStream) {
    previewStream.getTracks().forEach(track => track.stop())
  }

  try {
    // Get camera stream
    previewStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: selectedVideoInputId.value
          ? { exact: selectedVideoInputId.value }
          : undefined
      }
    })

    // Attach to video element
    if (previewVideo.value) {
      previewVideo.value.srcObject = previewStream
    }
  } catch (error) {
    console.error('Failed to start camera preview:', error)
  }
}

// Join call with video
async function joinWithVideo() {
  // Stop preview stream (call will create its own)
  if (previewStream) {
    previewStream.getTracks().forEach(track => track.stop())
    previewStream = null
  }

  // Make video call
  await makeCall('sip:meeting@example.com', {
    audio: true,
    video: true
  })
}

// Cleanup on unmount
onUnmounted(() => {
  if (previewStream) {
    previewStream.getTracks().forEach(track => track.stop())
  }
})
</script>
```

💡 **UX Tip**: Camera previews help users ensure their camera is working and positioned correctly before joining important calls.

### Switching Cameras During Calls

Allow users to switch cameras while in an active call:

```typescript
import { useMediaDevices, useCallSession } from 'vuesip'

const { selectVideoInput } = useMediaDevices()
const { session } = useCallSession(sipClient)

async function switchCamera(newDeviceId: string) {
  if (!session.value) return

  try {
    // Select the new camera
    selectVideoInput(newDeviceId)

    // Get new media stream with the selected camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: newDeviceId }
      }
    })

    // Get the video track from the new stream
    const newVideoTrack = newStream.getVideoTracks()[0]

    // Find the existing video sender
    const sender = session.value.rtcSession
      .getSenders()
      .find(s => s.track?.kind === 'video')

    if (sender) {
      // Replace the video track
      await sender.replaceTrack(newVideoTrack)
      console.log('Camera switched successfully')
    }

    // Stop old video tracks
    session.value.localStream?.getVideoTracks().forEach(track => {
      if (track !== newVideoTrack) {
        track.stop()
      }
    })
  } catch (error) {
    console.error('Failed to switch camera:', error)
  }
}
```

⚠️ **Note**: Track replacement is more efficient than restarting the entire call. The remote party will see a brief transition but the call continues uninterrupted.

---

## Video UI Patterns

### Basic Video Layout

Create a professional video call interface:

```vue
<template>
  <div class="video-container">
    <!-- Full-screen remote video -->
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      :class="{ 'video-hidden': !hasRemoteVideo }"
      class="remote-video"
    />

    <!-- Show placeholder if no remote video -->
    <div v-if="!hasRemoteVideo" class="no-video-placeholder">
      <div class="avatar">
        {{ remoteDisplayName?.charAt(0) || '?' }}
      </div>
      <p>{{ remoteDisplayName || 'Waiting for video...' }}</p>
    </div>

    <!-- Picture-in-picture local video -->
    <video
      ref="localVideo"
      autoplay
      muted
      playsinline
      :class="{ 'video-hidden': !hasLocalVideo }"
      class="local-video"
    />

    <!-- Show placeholder if no local video -->
    <div v-if="!hasLocalVideo" class="local-placeholder">
      Camera Off
    </div>

    <!-- Call controls overlay -->
    <div class="controls-overlay">
      <button @click="toggleMute">
        {{ isMuted ? '🔇 Unmute' : '🔊 Mute' }}
      </button>
      <button @click="toggleVideo">
        {{ hasLocalVideo ? '📹 Stop Video' : '📹 Start Video' }}
      </button>
      <button @click="hangup" class="danger">
        📞 Hang Up
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCallSession } from 'vuesip'

const remoteVideo = ref<HTMLVideoElement>()
const localVideo = ref<HTMLVideoElement>()

const {
  localStream,
  remoteStream,
  hasLocalVideo,
  hasRemoteVideo,
  remoteDisplayName,
  isMuted,
  toggleMute,
  hangup
} = useCallSession(sipClient)

// Attach streams to video elements
watch(localStream, (stream) => {
  if (stream && localVideo.value) {
    localVideo.value.srcObject = stream
  }
})

watch(remoteStream, (stream) => {
  if (stream && remoteVideo.value) {
    remoteVideo.value.srcObject = stream
  }
})

// Toggle video on/off during call
async function toggleVideo() {
  if (!localStream.value) return

  const videoTrack = localStream.value.getVideoTracks()[0]
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled
  }
}
</script>

<style scoped>
.video-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-hidden {
  display: none;
}

.no-video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 20px;
}

.local-video {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 240px;
  height: 180px;
  border: 2px solid white;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.local-placeholder {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 240px;
  height: 180px;
  border: 2px solid white;
  border-radius: 12px;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.controls-overlay {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  padding: 15px;
  background: rgba(0,0,0,0.6);
  border-radius: 50px;
  backdrop-filter: blur(10px);
}

.controls-overlay button {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  background: white;
  color: black;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.controls-overlay button:hover {
  transform: scale(1.05);
}

.controls-overlay button.danger {
  background: #ef4444;
  color: white;
}
</style>
```

### Picture-in-Picture Mode

Enable browser's native picture-in-picture for video:

```typescript
const remoteVideo = ref<HTMLVideoElement>()

async function enablePictureInPicture() {
  if (!remoteVideo.value) return

  try {
    // Check if PiP is supported
    if (!document.pictureInPictureEnabled) {
      console.warn('Picture-in-Picture not supported')
      return
    }

    // Request PiP mode
    await remoteVideo.value.requestPictureInPicture()
    console.log('Entered Picture-in-Picture mode')
  } catch (error) {
    console.error('Failed to enter PiP:', error)
  }
}

async function disablePictureInPicture() {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      console.log('Exited Picture-in-Picture mode')
    }
  } catch (error) {
    console.error('Failed to exit PiP:', error)
  }
}

// Listen for PiP events
onMounted(() => {
  if (remoteVideo.value) {
    remoteVideo.value.addEventListener('enterpictureinpicture', () => {
      console.log('Entered PiP')
    })

    remoteVideo.value.addEventListener('leavepictureinpicture', () => {
      console.log('Left PiP')
    })
  }
})
```

💡 **Use Case**: Picture-in-picture lets users continue their video call while working in other tabs or applications.

### Fullscreen Video

Allow users to expand video to fullscreen:

```typescript
const videoContainer = ref<HTMLDivElement>()

async function enterFullscreen() {
  if (!videoContainer.value) return

  try {
    // Request fullscreen
    if (videoContainer.value.requestFullscreen) {
      await videoContainer.value.requestFullscreen()
    } else if ((videoContainer.value as any).webkitRequestFullscreen) {
      // Safari
      await (videoContainer.value as any).webkitRequestFullscreen()
    }

    console.log('Entered fullscreen')
  } catch (error) {
    console.error('Failed to enter fullscreen:', error)
  }
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      console.log('Exited fullscreen')
    }
  } catch (error) {
    console.error('Failed to exit fullscreen:', error)
  }
}

// Toggle fullscreen
async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await exitFullscreen()
  } else {
    await enterFullscreen()
  }
}
```

### Responsive Video Sizing

Adapt video layout for different screen sizes:

```vue
<style scoped>
/* Desktop layout */
@media (min-width: 768px) {
  .local-video {
    width: 240px;
    height: 180px;
    bottom: 20px;
    right: 20px;
  }
}

/* Tablet layout */
@media (max-width: 767px) and (min-width: 481px) {
  .local-video {
    width: 180px;
    height: 135px;
    bottom: 15px;
    right: 15px;
  }
}

/* Mobile layout */
@media (max-width: 480px) {
  .local-video {
    width: 120px;
    height: 90px;
    bottom: 10px;
    right: 10px;
  }

  .controls-overlay {
    bottom: 10px;
    padding: 10px;
  }

  .controls-overlay button {
    padding: 8px 16px;
    font-size: 12px;
  }
}

/* Portrait orientation on mobile */
@media (max-width: 480px) and (orientation: portrait) {
  .remote-video {
    object-fit: cover;  /* Fill screen in portrait */
  }
}

/* Landscape orientation on mobile */
@media (max-width: 768px) and (orientation: landscape) {
  .local-video {
    width: 160px;
    height: 120px;
  }
}
</style>
```

---

## Making Video Calls

### Outgoing Video Calls

Initiate video calls with various configurations:

```typescript
import { useCallSession } from 'vuesip'

const { makeCall } = useCallSession(sipClient)

// Basic video call (720p default)
await makeCall('sip:bob@example.com', {
  audio: true,
  video: true
})

// High-quality video call (1080p)
await makeCall('sip:bob@example.com', {
  audio: true,
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  }
})

// Mobile-optimized video call (lower quality for bandwidth)
await makeCall('sip:bob@example.com', {
  audio: true,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15 }
  }
})

// Video call with specific camera
await makeCall('sip:bob@example.com', {
  audio: true,
  video: {
    deviceId: { exact: 'camera-device-id-here' },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
})
```

### Video Media Constraints

Fine-tune video quality and behavior:

```typescript
// All video constraint options
const videoConstraints = {
  // Resolution preferences
  width: {
    min: 640,      // Minimum acceptable width
    ideal: 1280,   // Preferred width (browser tries to match)
    max: 1920      // Maximum width
  },
  height: {
    min: 480,
    ideal: 720,
    max: 1080
  },

  // Frame rate
  frameRate: {
    min: 10,       // Minimum FPS
    ideal: 30,     // Target FPS
    max: 60        // Maximum FPS
  },

  // Aspect ratio
  aspectRatio: { ideal: 16/9 },  // 16:9 widescreen

  // Camera selection
  facingMode: 'user',  // 'user' = front, 'environment' = back

  // Or specific device
  deviceId: { exact: 'abc123' },

  // Video quality hints
  resizeMode: 'crop-and-scale',  // How to adjust resolution
}

await makeCall('sip:bob@example.com', {
  audio: true,
  video: videoConstraints
})
```

📝 **Constraint Types**:
- `exact`: Must match exactly (fails if not available)
- `ideal`: Preferred value (browser tries to match)
- `min`/`max`: Acceptable range

💡 **Best Practice**: Use `ideal` instead of `exact` to avoid failures when exact values aren't available. The browser will get as close as possible.

### Resolution and Frame Rate Control

Optimize video for different scenarios:

```typescript
// Scenario 1: High-quality professional call
const professionalQuality = {
  audio: true,
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  }
}

// Scenario 2: Balanced quality (default recommended)
const balancedQuality = {
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
}

// Scenario 3: Low bandwidth / mobile
const economyQuality = {
  audio: true,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15 }
  }
}

// Scenario 4: Screen sharing companion video
const companionQuality = {
  audio: true,
  video: {
    width: { ideal: 320 },
    height: { ideal: 240 },
    frameRate: { ideal: 15 }
  }
}

// Use based on connection quality
const connectionSpeed = measureBandwidth()  // Your bandwidth detection
let quality

if (connectionSpeed > 5000) {  // > 5 Mbps
  quality = professionalQuality
} else if (connectionSpeed > 2000) {  // > 2 Mbps
  quality = balancedQuality
} else {
  quality = economyQuality
}

await makeCall(targetUri, quality)
```

💡 **Bandwidth Guidelines**:
- **1080p @ 30fps**: ~3-4 Mbps
- **720p @ 30fps**: ~1.5-2 Mbps
- **480p @ 15fps**: ~500-800 Kbps
- **Audio only**: ~50-100 Kbps

---

## Receiving Video Calls

### Answering with Video

Answer incoming calls with your camera enabled:

```typescript
import { useCallSession } from 'vuesip'

const { answer, state, direction } = useCallSession(sipClient)

// Detect incoming call
watch([state, direction], ([newState, newDirection]) => {
  if (newState === 'ringing' && newDirection === 'incoming') {
    console.log('Incoming call detected')
    // Show answer UI to user
  }
})

// Answer with video
async function answerWithVideo() {
  try {
    await answer({
      audio: true,
      video: true  // Enable camera when answering
    })
    console.log('Answered with video')
  } catch (error) {
    console.error('Failed to answer with video:', error)

    // Fallback to audio-only if video fails
    if (error.name === 'NotAllowedError') {
      console.log('Camera denied, answering audio-only')
      await answer({ audio: true, video: false })
    }
  }
}

// Answer audio-only
async function answerAudioOnly() {
  await answer({
    audio: true,
    video: false
  })
  console.log('Answered audio-only')
}
```

### Auto-Answer for Video Calls

Automatically answer incoming video calls:

```typescript
import { watch } from 'vue'
import { useCallSession } from 'vuesip'

const { answer, state, direction, hasRemoteVideo } = useCallSession(sipClient)

// Auto-answer configuration
const autoAnswerEnabled = ref(true)
const autoAnswerWithVideo = ref(true)  // Answer with camera on

watch([state, direction], async ([newState, newDirection]) => {
  if (newState === 'ringing' && newDirection === 'incoming' && autoAnswerEnabled.value) {
    // Delay slightly to allow UI to render
    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      // Answer with video if configured
      await answer({
        audio: true,
        video: autoAnswerWithVideo.value
      })

      console.log('Auto-answered', autoAnswerWithVideo.value ? 'with video' : 'audio-only')
    } catch (error) {
      console.error('Auto-answer failed:', error)
    }
  }
})
```

### Video Call Notifications

Show rich notifications for incoming video calls:

```vue
<template>
  <div v-if="showIncomingCall" class="incoming-video-call">
    <div class="call-notification">
      <!-- Caller avatar -->
      <div class="caller-avatar">
        {{ callerInitial }}
      </div>

      <!-- Call info -->
      <div class="call-info">
        <h3>{{ callerName }}</h3>
        <p>{{ hasRemoteVideoOffer ? '📹 Video Call' : '📞 Audio Call' }}</p>
        <p class="uri">{{ callerUri }}</p>
      </div>

      <!-- Answer options -->
      <div class="call-actions">
        <!-- Answer with video -->
        <button
          v-if="hasRemoteVideoOffer"
          @click="answerWithVideo"
          class="answer-video"
        >
          📹 Answer with Video
        </button>

        <!-- Answer audio-only -->
        <button @click="answerAudioOnly" class="answer-audio">
          📞 Answer Audio Only
        </button>

        <!-- Decline -->
        <button @click="decline" class="decline">
          ❌ Decline
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCallSession } from 'vuesip'

const {
  answer,
  reject,
  state,
  direction,
  remoteUri,
  remoteDisplayName,
  hasRemoteVideo
} = useCallSession(sipClient)

const showIncomingCall = computed(() =>
  state.value === 'ringing' && direction.value === 'incoming'
)

const callerName = computed(() =>
  remoteDisplayName.value || 'Unknown Caller'
)

const callerInitial = computed(() =>
  callerName.value.charAt(0).toUpperCase()
)

const callerUri = computed(() => remoteUri.value || '')

const hasRemoteVideoOffer = computed(() => hasRemoteVideo.value)

async function answerWithVideo() {
  await answer({ audio: true, video: true })
}

async function answerAudioOnly() {
  await answer({ audio: true, video: false })
}

async function decline() {
  await reject(603)  // 603 Decline
}
</script>

<style scoped>
.incoming-video-call {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.call-notification {
  background: white;
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.caller-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 32px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.call-info h3 {
  margin: 0 0 10px;
  font-size: 24px;
}

.call-info p {
  margin: 5px 0;
  color: #666;
}

.call-info .uri {
  font-size: 12px;
  color: #999;
}

.call-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 30px;
}

.call-actions button {
  padding: 15px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.call-actions button:hover {
  transform: scale(1.02);
}

.answer-video {
  background: #10b981;
  color: white;
}

.answer-audio {
  background: #3b82f6;
  color: white;
}

.decline {
  background: #ef4444;
  color: white;
}
</style>
```

---

## Video Quality Management

### Understanding Video Quality

Video quality in WebRTC is affected by:
- **Resolution**: Higher resolution = better clarity but more bandwidth
- **Frame rate**: Higher FPS = smoother motion
- **Bitrate**: Higher bitrate = better quality but more data
- **Network conditions**: Packet loss and latency affect quality

### Bandwidth Considerations

Monitor and adapt to available bandwidth:

```typescript
import { useCallSession } from 'vuesip'

const { getStats } = useCallSession(sipClient)

// Check current video stats
async function checkVideoQuality() {
  const stats = await getStats()

  if (stats?.video) {
    console.log('Video Statistics:')
    console.log('- Resolution:', `${stats.video.frameWidth}x${stats.video.frameHeight}`)
    console.log('- Frame Rate:', stats.video.frameRate, 'fps')
    console.log('- Packets Lost:', stats.video.packetsLost)
    console.log('- Packet Loss:', `${stats.video.packetLossPercentage?.toFixed(2)}%`)

    // Warn if quality is degrading
    if (stats.video.packetLossPercentage && stats.video.packetLossPercentage > 5) {
      console.warn('High packet loss detected - consider reducing quality')
    }
  }
}

// Monitor quality during call
const qualityInterval = setInterval(async () => {
  if (state.value === 'active') {
    await checkVideoQuality()
  }
}, 5000)  // Check every 5 seconds

// Cleanup
onUnmounted(() => {
  clearInterval(qualityInterval)
})
```

### Resolution Adaptation

Dynamically adjust video quality based on network conditions:

```typescript
async function adaptVideoQuality(stats: CallStatistics) {
  if (!stats?.video || !session.value) return

  const packetLoss = stats.video.packetLossPercentage || 0
  const currentWidth = stats.video.frameWidth || 0

  // Determine appropriate quality level
  let newConstraints

  if (packetLoss > 10) {
    // High packet loss - reduce to minimum
    console.log('Reducing to low quality due to packet loss')
    newConstraints = {
      width: { ideal: 320 },
      height: { ideal: 240 },
      frameRate: { ideal: 10 }
    }
  } else if (packetLoss > 5) {
    // Moderate packet loss - reduce to medium
    console.log('Reducing to medium quality')
    newConstraints = {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15 }
    }
  } else if (packetLoss < 2 && currentWidth < 1280) {
    // Low packet loss and currently low quality - increase
    console.log('Increasing to high quality')
    newConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    }
  } else {
    // No change needed
    return
  }

  // Apply new constraints
  const videoTrack = localStream.value?.getVideoTracks()[0]
  if (videoTrack) {
    try {
      await videoTrack.applyConstraints(newConstraints)
      console.log('Video quality adjusted')
    } catch (error) {
      console.error('Failed to adjust quality:', error)
    }
  }
}

// Monitor and adapt
setInterval(async () => {
  if (state.value === 'active') {
    const stats = await getStats()
    if (stats) {
      await adaptVideoQuality(stats)
    }
  }
}, 10000)  // Check every 10 seconds
```

### Video Statistics Monitoring

Create a real-time stats display:

```vue
<template>
  <div v-if="showStats" class="video-stats">
    <h4>Video Quality</h4>
    <div class="stat-row">
      <span>Resolution:</span>
      <span>{{ resolution }}</span>
    </div>
    <div class="stat-row">
      <span>Frame Rate:</span>
      <span>{{ frameRate }} fps</span>
    </div>
    <div class="stat-row">
      <span>Bitrate:</span>
      <span>{{ bitrate }} Kbps</span>
    </div>
    <div class="stat-row">
      <span>Packet Loss:</span>
      <span :class="packetLossClass">{{ packetLoss }}%</span>
    </div>
    <div class="stat-row">
      <span>Quality:</span>
      <span :class="qualityClass">{{ quality }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCallSession } from 'vuesip'

const { getStats, state } = useCallSession(sipClient)

const showStats = ref(true)
const resolution = ref('--')
const frameRate = ref(0)
const bitrate = ref(0)
const packetLoss = ref(0)

const quality = computed(() => {
  if (packetLoss.value > 5) return 'Poor'
  if (packetLoss.value > 2) return 'Fair'
  if (frameRate.value >= 25) return 'Excellent'
  return 'Good'
})

const qualityClass = computed(() => ({
  'quality-excellent': quality.value === 'Excellent',
  'quality-good': quality.value === 'Good',
  'quality-fair': quality.value === 'Fair',
  'quality-poor': quality.value === 'Poor'
}))

const packetLossClass = computed(() => ({
  'loss-low': packetLoss.value < 2,
  'loss-medium': packetLoss.value >= 2 && packetLoss.value < 5,
  'loss-high': packetLoss.value >= 5
}))

let statsInterval: number

onMounted(() => {
  statsInterval = setInterval(async () => {
    if (state.value === 'active') {
      const stats = await getStats()

      if (stats?.video) {
        resolution.value = `${stats.video.frameWidth}x${stats.video.frameHeight}`
        frameRate.value = Math.round(stats.video.frameRate || 0)
        bitrate.value = Math.round((stats.video.bitrate || 0) / 1000)
        packetLoss.value = Number((stats.video.packetLossPercentage || 0).toFixed(2))
      }
    }
  }, 1000)
})

onUnmounted(() => {
  clearInterval(statsInterval)
})
</script>

<style scoped>
.video-stats {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 15px;
  border-radius: 8px;
  font-size: 12px;
  backdrop-filter: blur(10px);
}

.video-stats h4 {
  margin: 0 0 10px;
  font-size: 14px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 5px;
}

.quality-excellent { color: #10b981; font-weight: bold; }
.quality-good { color: #3b82f6; }
.quality-fair { color: #f59e0b; }
.quality-poor { color: #ef4444; font-weight: bold; }

.loss-low { color: #10b981; }
.loss-medium { color: #f59e0b; }
.loss-high { color: #ef4444; font-weight: bold; }
</style>
```

### Handling Poor Network Conditions

Provide graceful degradation when network is poor:

```typescript
async function handlePoorConnection(stats: CallStatistics) {
  const packetLoss = stats?.video?.packetLossPercentage || 0

  if (packetLoss > 15) {
    // Severe packet loss - suggest switching to audio-only
    showNotification({
      type: 'warning',
      message: 'Poor connection detected. Switch to audio-only?',
      actions: [
        {
          label: 'Switch to Audio',
          handler: async () => {
            // Disable video track
            const videoTrack = localStream.value?.getVideoTracks()[0]
            if (videoTrack) {
              videoTrack.enabled = false
            }
            console.log('Switched to audio-only')
          }
        },
        { label: 'Keep Video', handler: () => {} }
      ]
    })
  } else if (packetLoss > 8) {
    // Moderate packet loss - automatically reduce quality
    console.log('Automatically reducing quality')
    await adaptVideoQuality(stats)
  }
}
```

---

## Screen Sharing

### Starting Screen Share

Share your screen during a video call:

```typescript
async function startScreenShare() {
  try {
    // Request screen sharing permission
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',  // Include cursor in share
        displaySurface: 'monitor'  // Prefer full screen
      },
      audio: false  // No system audio (can enable if needed)
    })

    console.log('Screen share started')

    // Get the screen video track
    const screenTrack = screenStream.getVideoTracks()[0]

    // Replace camera track with screen track
    const sender = session.value?.rtcSession
      .getSenders()
      .find(s => s.track?.kind === 'video')

    if (sender) {
      // Store original camera track for later
      const cameraTrack = sender.track

      // Replace with screen track
      await sender.replaceTrack(screenTrack)

      // Listen for when user stops sharing
      screenTrack.addEventListener('ended', async () => {
        console.log('Screen share stopped by user')
        // Switch back to camera
        if (cameraTrack) {
          await sender.replaceTrack(cameraTrack)
        }
      })
    }

    return screenStream
  } catch (error) {
    console.error('Failed to start screen share:', error)
    throw error
  }
}
```

### Screen Share with Audio

Include system audio in screen share:

```typescript
async function startScreenShareWithAudio() {
  try {
    // Request screen + system audio
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })

    console.log('Screen share with audio started')

    // Check if audio track was included (not all browsers support this)
    const hasAudio = screenStream.getAudioTracks().length > 0
    if (!hasAudio) {
      console.warn('System audio not available in this browser')
    }

    return screenStream
  } catch (error) {
    console.error('Failed to start screen share with audio:', error)
    throw error
  }
}
```

📝 **Note**: System audio capture is not supported in all browsers. Firefox and Edge support it, but Chrome has limited support.

### Switching Between Camera and Screen

Create a toggle for camera/screen sharing:

```typescript
import { ref } from 'vue'

const isSharingScreen = ref(false)
let originalCameraTrack: MediaStreamTrack | null = null
let screenStream: MediaStream | null = null

async function toggleScreenShare() {
  if (isSharingScreen.value) {
    // Stop screen share, resume camera
    await stopScreenShare()
  } else {
    // Start screen share
    await startScreenShare()
  }
}

async function startScreenShare() {
  if (!session.value) return

  try {
    // Get screen stream
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    })

    const screenTrack = screenStream.getVideoTracks()[0]

    // Find video sender
    const sender = session.value.rtcSession
      .getSenders()
      .find(s => s.track?.kind === 'video')

    if (sender && sender.track) {
      // Store camera track
      originalCameraTrack = sender.track

      // Replace with screen track
      await sender.replaceTrack(screenTrack)
      isSharingScreen.value = true

      // Handle user stopping share via browser UI
      screenTrack.addEventListener('ended', () => {
        stopScreenShare()
      })
    }
  } catch (error) {
    console.error('Failed to start screen share:', error)
  }
}

async function stopScreenShare() {
  if (!session.value || !screenStream) return

  try {
    // Stop screen stream
    screenStream.getTracks().forEach(track => track.stop())

    // Find video sender
    const sender = session.value.rtcSession
      .getSenders()
      .find(s => s.track?.kind === 'video')

    if (sender && originalCameraTrack) {
      // Restore camera track
      await sender.replaceTrack(originalCameraTrack)
    }

    isSharingScreen.value = false
    screenStream = null
    originalCameraTrack = null

    console.log('Screen share stopped')
  } catch (error) {
    console.error('Failed to stop screen share:', error)
  }
}

// Cleanup on unmount
onUnmounted(() => {
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop())
  }
})
```

### Screen Share UI Patterns

Build a professional screen sharing interface:

```vue
<template>
  <div class="screen-share-controls">
    <!-- Screen share toggle button -->
    <button
      @click="toggleScreenShare"
      :class="{ active: isSharingScreen }"
      class="screen-share-btn"
    >
      <span v-if="!isSharingScreen">🖥️ Share Screen</span>
      <span v-else>🛑 Stop Sharing</span>
    </button>

    <!-- Screen share indicator -->
    <div v-if="isSharingScreen" class="sharing-indicator">
      <div class="pulse"></div>
      <span>Sharing your screen</span>
    </div>

    <!-- Remote screen share indicator -->
    <div v-if="remoteIsSharingScreen" class="remote-sharing">
      {{ remoteDisplayName }} is sharing their screen
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCallSession } from 'vuesip'

const {
  session,
  remoteStream,
  remoteDisplayName
} = useCallSession(sipClient)

const isSharingScreen = ref(false)

// Detect if remote is sharing screen
const remoteIsSharingScreen = computed(() => {
  if (!remoteStream.value) return false

  const videoTrack = remoteStream.value.getVideoTracks()[0]
  if (!videoTrack) return false

  // Screen shares typically have higher resolution
  const settings = videoTrack.getSettings()
  return settings.width && settings.width > 1280
})

async function toggleScreenShare() {
  // Your screen share toggle logic from above
}
</script>

<style scoped>
.screen-share-controls {
  position: relative;
}

.screen-share-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.screen-share-btn:hover {
  background: #2563eb;
  transform: scale(1.05);
}

.screen-share-btn.active {
  background: #ef4444;
}

.sharing-indicator {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #ef4444;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  animation: slideIn 0.3s;
}

.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes slideIn {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.remote-sharing {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 100;
}
</style>
```

---

## Advanced Features

### Front/Back Camera (Mobile)

Switch between front and back cameras on mobile devices:

```typescript
import { ref } from 'vue'

const currentFacingMode = ref<'user' | 'environment'>('user')

async function switchMobileCamera() {
  if (!session.value) return

  try {
    // Toggle facing mode
    const newFacingMode = currentFacingMode.value === 'user'
      ? 'environment'
      : 'user'

    // Get new stream with switched camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: newFacingMode }
      }
    })

    const newVideoTrack = newStream.getVideoTracks()[0]

    // Replace track
    const sender = session.value.rtcSession
      .getSenders()
      .find(s => s.track?.kind === 'video')

    if (sender) {
      const oldTrack = sender.track
      await sender.replaceTrack(newVideoTrack)

      // Stop old track
      oldTrack?.stop()

      currentFacingMode.value = newFacingMode
      console.log(`Switched to ${newFacingMode} camera`)
    }
  } catch (error) {
    console.error('Failed to switch camera:', error)
    // Fallback to deviceId-based switching if exact facingMode fails
  }
}
```

```vue
<!-- Mobile camera flip button -->
<template>
  <button
    v-if="isMobile"
    @click="switchMobileCamera"
    class="flip-camera-btn"
  >
    🔄 Flip Camera
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const isMobile = computed(() => {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
})
</script>
```

### facingMode Constraints

Use facingMode for mobile camera selection:

```typescript
// Front camera (selfie mode)
await makeCall('sip:bob@example.com', {
  audio: true,
  video: {
    facingMode: 'user',  // or { ideal: 'user' }
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
})

// Back camera (environment mode)
await makeCall('sip:bob@example.com', {
  audio: true,
  video: {
    facingMode: 'environment',  // or { ideal: 'environment' }
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  }
})

// Let browser choose best camera
await makeCall('sip:bob@example.com', {
  audio: true,
  video: {
    facingMode: { ideal: 'user' }  // Prefer front, but accept back if needed
  }
})
```

📝 **facingMode Values**:
- `'user'`: Front-facing camera (selfie)
- `'environment'`: Back-facing camera
- `'left'`: Left-facing camera (rare)
- `'right'`: Right-facing camera (rare)

### Mirror/Flip Video

Mirror the local video display (for natural self-view):

```vue
<template>
  <video
    ref="localVideo"
    autoplay
    muted
    playsinline
    :style="{ transform: shouldMirror ? 'scaleX(-1)' : 'none' }"
    class="local-video"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const currentFacingMode = ref<'user' | 'environment'>('user')

// Mirror front camera, don't mirror back camera
const shouldMirror = computed(() => currentFacingMode.value === 'user')
</script>
```

💡 **Why Mirror?** Users expect to see themselves as they would in a mirror when using the front camera. The back camera should not be mirrored.

---

## Mobile Considerations

### Portrait/Landscape Orientation

Handle orientation changes gracefully:

```typescript
// Detect orientation
const isPortrait = computed(() => {
  return window.matchMedia('(orientation: portrait)').matches
})

// Listen for orientation changes
onMounted(() => {
  const orientationHandler = () => {
    console.log('Orientation changed:', isPortrait.value ? 'portrait' : 'landscape')
    adjustVideoLayout()
  }

  window.addEventListener('orientationchange', orientationHandler)
  window.addEventListener('resize', orientationHandler)

  onUnmounted(() => {
    window.removeEventListener('orientationchange', orientationHandler)
    window.removeEventListener('resize', orientationHandler)
  })
})

function adjustVideoLayout() {
  // Adjust video constraints based on orientation
  if (isPortrait.value) {
    // Portrait: Use 9:16 aspect ratio
    applyVideoConstraints({
      width: { ideal: 720 },
      height: { ideal: 1280 }
    })
  } else {
    // Landscape: Use 16:9 aspect ratio
    applyVideoConstraints({
      width: { ideal: 1280 },
      height: { ideal: 720 }
    })
  }
}

async function applyVideoConstraints(constraints: MediaTrackConstraints) {
  const videoTrack = localStream.value?.getVideoTracks()[0]
  if (videoTrack) {
    try {
      await videoTrack.applyConstraints(constraints)
    } catch (error) {
      console.error('Failed to apply constraints:', error)
    }
  }
}
```

### Mobile Bandwidth Optimization

Use lower quality on mobile to conserve data:

```typescript
import { ref, computed } from 'vue'

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const isOnWifi = ref(true)  // Detect via Network Information API if available

// Detect connection type (if supported)
if ('connection' in navigator) {
  const connection = (navigator as any).connection
  isOnWifi.value = connection.effectiveType === 'wifi' || connection.effectiveType === '4g'

  connection.addEventListener('change', () => {
    isOnWifi.value = connection.effectiveType === 'wifi' || connection.effectiveType === '4g'
  })
}

// Determine appropriate quality for mobile
const mobileVideoConstraints = computed(() => {
  if (!isMobile) {
    // Desktop: Use high quality
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    }
  }

  if (isOnWifi.value) {
    // Mobile on WiFi: Use medium quality
    return {
      width: { ideal: 960 },
      height: { ideal: 540 },
      frameRate: { ideal: 24 }
    }
  } else {
    // Mobile on cellular: Use low quality
    return {
      width: { ideal: 640 },
      height: { ideal: 360 },
      frameRate: { ideal: 15 }
    }
  }
})

// Use in call
await makeCall('sip:bob@example.com', {
  audio: true,
  video: mobileVideoConstraints.value
})
```

💡 **Data Usage Estimates**:
- **High (1280x720 @ 30fps)**: ~2-3 MB/minute
- **Medium (960x540 @ 24fps)**: ~1-1.5 MB/minute
- **Low (640x360 @ 15fps)**: ~500-800 KB/minute

---

## Performance

### Video-Specific Memory Management

Video streams use significant memory. Clean up properly:

```typescript
import { onUnmounted } from 'vue'

const localVideoStream = ref<MediaStream | null>(null)
const remoteVideoStream = ref<MediaStream | null>(null)

// Cleanup function
function cleanupVideoStreams() {
  // Stop local stream tracks
  if (localVideoStream.value) {
    localVideoStream.value.getTracks().forEach(track => {
      track.stop()
      console.log(`Stopped ${track.kind} track`)
    })
    localVideoStream.value = null
  }

  // Remote stream is managed by WebRTC, just clear reference
  if (remoteVideoStream.value) {
    remoteVideoStream.value = null
  }

  // Clear video element sources
  if (localVideo.value) {
    localVideo.value.srcObject = null
  }
  if (remoteVideo.value) {
    remoteVideo.value.srcObject = null
  }
}

// Cleanup on component unmount
onUnmounted(() => {
  cleanupVideoStreams()
})

// Cleanup on call end
watch(state, (newState) => {
  if (newState === 'terminated' || newState === 'failed') {
    cleanupVideoStreams()
  }
})
```

⚠️ **Memory Leak Warning**: Always stop tracks and clear video element `srcObject` to prevent memory leaks.

### Reducing Video Quality for Performance

Lower video quality if performance suffers:

```typescript
async function reduceQualityForPerformance() {
  const videoTrack = localStream.value?.getVideoTracks()[0]
  if (!videoTrack) return

  try {
    // Reduce to minimal quality
    await videoTrack.applyConstraints({
      width: { ideal: 320 },
      height: { ideal: 240 },
      frameRate: { ideal: 10 }
    })

    console.log('Reduced video quality for better performance')
  } catch (error) {
    console.error('Failed to reduce quality:', error)
  }
}

// Monitor performance
let frameDropCount = 0
setInterval(async () => {
  if (state.value === 'active') {
    const stats = await getStats()

    if (stats?.video?.framesDropped) {
      frameDropCount = stats.video.framesDropped

      // If dropping many frames, reduce quality
      if (frameDropCount > 100) {
        await reduceQualityForPerformance()
      }
    }
  }
}, 10000)
```

### Multiple Video Streams Handling

Optimize when handling multiple simultaneous video streams (e.g., gallery view):

```typescript
// Limit simultaneous high-quality streams
const MAX_HD_STREAMS = 2

function optimizeMultipleStreams(streams: MediaStream[]) {
  streams.forEach((stream, index) => {
    const videoTrack = stream.getVideoTracks()[0]
    if (!videoTrack) return

    // First 2 streams get HD, rest get SD
    const constraints = index < MAX_HD_STREAMS
      ? { width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 320 }, height: { ideal: 240 } }

    videoTrack.applyConstraints(constraints).catch(err => {
      console.error('Failed to apply constraints:', err)
    })
  })
}
```

---

## Best Practices

### 1. Request Permissions Early

⚠️ **Why**: Requesting permissions during a call causes delays. Request them upfront:

```typescript
import { useMediaDevices } from 'vuesip'

const { requestPermissions } = useMediaDevices()

// Request on app initialization or settings page
onMounted(async () => {
  try {
    await requestPermissions(true, true)  // audio and video
    console.log('Permissions granted')
  } catch (error) {
    console.error('Permission denied:', error)
  }
})
```

### 2. Show Camera Preview

💡 **Best Practice**: Let users see themselves before joining calls:

```typescript
// Show preview before making call
async function showCameraPreview() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true
  })

  if (previewVideo.value) {
    previewVideo.value.srcObject = stream
  }

  // Return stream so it can be stopped later
  return stream
}
```

### 3. Provide Quality Settings

✅ **User Control**: Let users choose their preferred video quality:

```vue
<template>
  <div class="quality-settings">
    <label>Video Quality:</label>
    <select v-model="selectedQuality" @change="applyQuality">
      <option value="low">Low (Data Saver)</option>
      <option value="medium">Medium (Balanced)</option>
      <option value="high">High (Best Quality)</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const selectedQuality = ref('medium')

const qualityPresets = {
  low: { width: 320, height: 240, frameRate: 10 },
  medium: { width: 640, height: 480, frameRate: 15 },
  high: { width: 1280, height: 720, frameRate: 30 }
}

async function applyQuality() {
  const preset = qualityPresets[selectedQuality.value]
  const videoTrack = localStream.value?.getVideoTracks()[0]

  if (videoTrack) {
    await videoTrack.applyConstraints({
      width: { ideal: preset.width },
      height: { ideal: preset.height },
      frameRate: { ideal: preset.frameRate }
    })
  }
}
</script>
```

### 4. Handle Bandwidth Changes

📝 **Adaptive Quality**: Monitor network and adapt automatically:

```typescript
// Monitor bandwidth and adjust
setInterval(async () => {
  const stats = await getStats()
  if (!stats?.network) return

  const bandwidth = stats.network.availableOutgoingBitrate

  if (bandwidth < 500000) {  // < 500 Kbps
    console.log('Low bandwidth detected, reducing quality')
    await applyQualityPreset('low')
  } else if (bandwidth > 2000000) {  // > 2 Mbps
    console.log('Good bandwidth, using high quality')
    await applyQualityPreset('high')
  }
}, 10000)
```

### 5. Accessibility for Video

♿ **Accessibility**: Make video calls accessible to all users:

```vue
<template>
  <div class="video-call" role="region" aria-label="Video call">
    <!-- Remote video with label -->
    <video
      ref="remoteVideo"
      autoplay
      playsinline
      aria-label="Remote participant video"
    />

    <!-- Local video with label -->
    <video
      ref="localVideo"
      autoplay
      muted
      playsinline
      aria-label="Your camera preview"
    />

    <!-- Controls with labels -->
    <div class="controls" role="toolbar" aria-label="Call controls">
      <button
        @click="toggleVideo"
        aria-label="Toggle video"
        :aria-pressed="hasLocalVideo"
      >
        {{ hasLocalVideo ? '📹 Stop Video' : '📹 Start Video' }}
      </button>

      <button
        @click="toggleMute"
        aria-label="Toggle microphone"
        :aria-pressed="isMuted"
      >
        {{ isMuted ? '🔇 Unmute' : '🔊 Mute' }}
      </button>

      <!-- Screen reader announcements -->
      <div role="status" aria-live="polite" class="sr-only">
        {{ screenReaderStatus }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const screenReaderStatus = computed(() => {
  if (state.value === 'calling') return 'Calling...'
  if (state.value === 'active') return 'Call connected'
  if (hasLocalVideo.value) return 'Video enabled'
  return 'Video disabled'
})
</script>

<style>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
</style>
```

---

## Troubleshooting

### Camera Not Found

**Problem**: `NotFoundError` - No camera detected

**Solutions**:
```typescript
try {
  await makeCall(target, { audio: true, video: true })
} catch (error) {
  if (error.name === 'NotFoundError') {
    console.error('No camera found')

    // Fallback to audio-only
    await makeCall(target, { audio: true, video: false })

    // Show message to user
    showNotification('No camera detected. Call will be audio-only.')
  }
}
```

💡 **Common Causes**:
- No camera physically connected
- Camera disabled in system settings
- Camera in use by another application

### Permission Denied

**Problem**: `NotAllowedError` - User denied camera/mic access

**Solutions**:
```typescript
try {
  await requestPermissions(true, true)
} catch (error) {
  if (error.name === 'NotAllowedError') {
    showPermissionInstructions()
  }
}

function showPermissionInstructions() {
  alert(`
Camera/microphone access is required.

To enable:
1. Click the lock icon in your address bar
2. Find "Camera" and "Microphone"
3. Change to "Allow"
4. Refresh the page
  `)
}
```

### Black Video Screen

**Problem**: Video element shows black screen

**Common Causes & Solutions**:

**1. Stream not attached:**
```typescript
// Ensure stream is attached
watch(remoteStream, (stream) => {
  if (stream && remoteVideo.value) {
    remoteVideo.value.srcObject = stream
    console.log('Stream attached')
  }
})
```

**2. Missing autoplay attribute:**
```vue
<!-- Always include autoplay and playsinline -->
<video ref="remoteVideo" autoplay playsinline />
```

**3. Track is disabled:**
```typescript
// Check if video track is enabled
const videoTrack = remoteStream.value?.getVideoTracks()[0]
if (videoTrack && !videoTrack.enabled) {
  console.log('Video track is disabled')
  videoTrack.enabled = true
}
```

**4. No video in remote stream:**
```typescript
// Verify remote stream has video
const hasVideo = remoteStream.value?.getVideoTracks().length > 0
if (!hasVideo) {
  console.log('Remote party has no video')
  // Show placeholder image
}
```

### Poor Video Quality

**Problem**: Blurry, pixelated, or choppy video

**Solutions**:

**1. Check network stats:**
```typescript
const stats = await getStats()
console.log('Packet loss:', stats?.video?.packetLossPercentage)
console.log('Bitrate:', stats?.video?.bitrate)

if (stats?.video?.packetLossPercentage > 5) {
  console.warn('High packet loss affecting quality')
}
```

**2. Reduce quality:**
```typescript
await videoTrack.applyConstraints({
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 15 }
})
```

**3. Check bandwidth:**
```typescript
const stats = await getStats()
const bandwidth = stats?.network?.availableOutgoingBitrate

if (bandwidth < 1000000) {  // < 1 Mbps
  console.warn('Insufficient bandwidth for HD video')
  // Reduce to SD
}
```

### Video Freezing

**Problem**: Video freezes intermittently

**Solutions**:

**1. Monitor packet loss:**
```typescript
const stats = await getStats()
if (stats?.video?.packetsLost > 100) {
  console.error('High packet loss causing freezing')
  // Reduce quality or switch to audio
}
```

**2. Check frame drops:**
```typescript
const stats = await getStats()
console.log('Frames dropped:', stats?.video?.framesDropped)

if (stats?.video?.framesDropped > 50) {
  console.warn('Frames being dropped')
  // Reduce frame rate
  await videoTrack.applyConstraints({
    frameRate: { ideal: 10 }
  })
}
```

**3. Network issues:**
```typescript
// Monitor round-trip time
const stats = await getStats()
const rtt = stats?.audio?.roundTripTime

if (rtt > 0.3) {  // > 300ms
  console.warn('High latency detected')
  // Show warning to user
}
```

---

## Complete Examples

### Full Video Calling Component

A production-ready video calling component with all features:

```vue
<template>
  <div class="video-call-app">
    <!-- Pre-call screen -->
    <div v-if="state === 'idle'" class="pre-call">
      <h2>Start Video Call</h2>

      <!-- Camera preview -->
      <div class="preview-section">
        <video
          ref="previewVideo"
          autoplay
          muted
          playsinline
          class="preview"
        />

        <!-- Camera selector -->
        <select v-model="selectedVideoInputId">
          <option
            v-for="camera in videoInputDevices"
            :key="camera.deviceId"
            :value="camera.deviceId"
          >
            {{ camera.label }}
          </option>
        </select>
      </div>

      <!-- Call form -->
      <div class="call-form">
        <input
          v-model="targetUri"
          placeholder="Enter SIP URI (e.g., sip:bob@example.com)"
        />
        <button @click="startVideoCall" :disabled="!targetUri">
          📹 Start Video Call
        </button>
      </div>
    </div>

    <!-- Active call screen -->
    <div v-else-if="state === 'active'" class="active-call">
      <!-- Remote video (full screen) -->
      <video
        ref="remoteVideo"
        autoplay
        playsinline
        :class="{ 'video-hidden': !hasRemoteVideo }"
        class="remote-video"
      />

      <!-- Remote video placeholder -->
      <div v-if="!hasRemoteVideo" class="no-video">
        <div class="avatar">{{ remoteInitial }}</div>
        <p>{{ remoteDisplayName || 'Unknown' }}</p>
        <p class="subtitle">Camera is off</p>
      </div>

      <!-- Local video (PiP) -->
      <video
        ref="localVideo"
        autoplay
        muted
        playsinline
        :class="{ 'video-hidden': !hasLocalVideo }"
        :style="{ transform: shouldMirror ? 'scaleX(-1)' : 'none' }"
        class="local-video"
      />

      <!-- Call duration -->
      <div class="call-duration">
        {{ formatDuration(duration) }}
      </div>

      <!-- Video stats (optional) -->
      <div v-if="showStats" class="stats-overlay">
        <div class="stat">📊 {{ resolution }}</div>
        <div class="stat">🎬 {{ frameRate }} fps</div>
        <div class="stat" :class="qualityClass">
          {{ qualityIndicator }}
        </div>
      </div>

      <!-- Controls -->
      <div class="controls">
        <button
          @click="toggleMute"
          :class="{ active: isMuted }"
        >
          {{ isMuted ? '🔇' : '🔊' }}
        </button>

        <button
          @click="toggleVideo"
          :class="{ active: !hasLocalVideo }"
        >
          {{ hasLocalVideo ? '📹' : '📹' }}
        </button>

        <button
          v-if="isMobile"
          @click="flipCamera"
        >
          🔄
        </button>

        <button
          @click="toggleScreenShare"
          :class="{ active: isSharingScreen }"
        >
          🖥️
        </button>

        <button
          @click="toggleStats"
          :class="{ active: showStats }"
        >
          📊
        </button>

        <button
          @click="hangup"
          class="hangup"
        >
          📞
        </button>
      </div>
    </div>

    <!-- Calling state -->
    <div v-else-if="state === 'calling'" class="calling">
      <div class="spinner"></div>
      <p>Calling {{ targetUri }}...</p>
      <button @click="hangup">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSipClient, useCallSession, useMediaDevices } from 'vuesip'

// Initialize composables
const { sipClient, isConnected } = useSipClient()

const {
  makeCall,
  answer,
  hangup,
  toggleMute,
  state,
  localStream,
  remoteStream,
  hasLocalVideo,
  hasRemoteVideo,
  remoteDisplayName,
  isMuted,
  duration,
  getStats
} = useCallSession(sipClient)

const {
  videoInputDevices,
  selectedVideoInputId,
  requestPermissions,
  selectVideoInput
} = useMediaDevices()

// Component state
const targetUri = ref('')
const previewVideo = ref<HTMLVideoElement>()
const localVideo = ref<HTMLVideoElement>()
const remoteVideo = ref<HTMLVideoElement>()
const previewStream = ref<MediaStream | null>(null)
const isSharingScreen = ref(false)
const showStats = ref(false)
const currentFacingMode = ref<'user' | 'environment'>('user')

// Stats
const resolution = ref('--')
const frameRate = ref(0)
const packetLoss = ref(0)

// Computed
const isMobile = computed(() =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
)

const shouldMirror = computed(() =>
  currentFacingMode.value === 'user' && hasLocalVideo.value
)

const remoteInitial = computed(() =>
  (remoteDisplayName.value || '?').charAt(0).toUpperCase()
)

const qualityIndicator = computed(() => {
  if (packetLoss.value > 5) return '❌ Poor'
  if (packetLoss.value > 2) return '⚠️ Fair'
  if (frameRate.value >= 25) return '✅ Excellent'
  return '✅ Good'
})

const qualityClass = computed(() => ({
  'quality-poor': packetLoss.value > 5,
  'quality-fair': packetLoss.value > 2 && packetLoss.value <= 5,
  'quality-good': packetLoss.value <= 2
}))

// Initialize
onMounted(async () => {
  // Request permissions
  await requestPermissions(true, true)

  // Start camera preview
  await startPreview()

  // Start stats monitoring
  startStatsMonitoring()
})

// Cleanup
onUnmounted(() => {
  stopPreview()
  stopStatsMonitoring()
})

// Start camera preview
async function startPreview() {
  try {
    previewStream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: selectedVideoInputId.value
          ? { exact: selectedVideoInputId.value }
          : undefined
      }
    })

    if (previewVideo.value) {
      previewVideo.value.srcObject = previewStream.value
    }
  } catch (error) {
    console.error('Failed to start preview:', error)
  }
}

// Stop camera preview
function stopPreview() {
  if (previewStream.value) {
    previewStream.value.getTracks().forEach(track => track.stop())
    previewStream.value = null
  }
}

// Restart preview when camera changes
watch(selectedVideoInputId, async () => {
  await startPreview()
})

// Start video call
async function startVideoCall() {
  if (!targetUri.value || !isConnected.value) return

  // Stop preview
  stopPreview()

  try {
    await makeCall(targetUri.value, {
      audio: true,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      }
    })
  } catch (error) {
    console.error('Failed to start call:', error)
    // Restart preview on error
    await startPreview()
  }
}

// Attach streams to video elements
watch(localStream, (stream) => {
  if (stream && localVideo.value) {
    localVideo.value.srcObject = stream
  }
})

watch(remoteStream, (stream) => {
  if (stream && remoteVideo.value) {
    remoteVideo.value.srcObject = stream
  }
})

// Toggle video
async function toggleVideo() {
  const videoTrack = localStream.value?.getVideoTracks()[0]
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled
  }
}

// Flip camera (mobile)
async function flipCamera() {
  const newFacingMode = currentFacingMode.value === 'user'
    ? 'environment'
    : 'user'

  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: newFacingMode } }
    })

    const newTrack = newStream.getVideoTracks()[0]
    const sender = (session.value as any)?.rtcSession
      ?.getSenders()
      ?.find((s: RTCRtpSender) => s.track?.kind === 'video')

    if (sender) {
      await sender.replaceTrack(newTrack)
      currentFacingMode.value = newFacingMode
    }
  } catch (error) {
    console.error('Failed to flip camera:', error)
  }
}

// Screen share
let originalCameraTrack: MediaStreamTrack | null = null

async function toggleScreenShare() {
  if (isSharingScreen.value) {
    await stopScreenShare()
  } else {
    await startScreenShare()
  }
}

async function startScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    })

    const screenTrack = screenStream.getVideoTracks()[0]
    const sender = (session.value as any)?.rtcSession
      ?.getSenders()
      ?.find((s: RTCRtpSender) => s.track?.kind === 'video')

    if (sender && sender.track) {
      originalCameraTrack = sender.track
      await sender.replaceTrack(screenTrack)
      isSharingScreen.value = true

      screenTrack.addEventListener('ended', () => {
        stopScreenShare()
      })
    }
  } catch (error) {
    console.error('Failed to start screen share:', error)
  }
}

async function stopScreenShare() {
  if (!originalCameraTrack) return

  const sender = (session.value as any)?.rtcSession
    ?.getSenders()
    ?.find((s: RTCRtpSender) => s.track?.kind === 'video')

  if (sender) {
    await sender.replaceTrack(originalCameraTrack)
    isSharingScreen.value = false
    originalCameraTrack = null
  }
}

// Stats monitoring
let statsInterval: number | null = null

function startStatsMonitoring() {
  statsInterval = setInterval(async () => {
    if (state.value === 'active') {
      const stats = await getStats()

      if (stats?.video) {
        resolution.value = `${stats.video.frameWidth}x${stats.video.frameHeight}`
        frameRate.value = Math.round(stats.video.frameRate || 0)
        packetLoss.value = Number((stats.video.packetLossPercentage || 0).toFixed(1))
      }
    }
  }, 1000)
}

function stopStatsMonitoring() {
  if (statsInterval) {
    clearInterval(statsInterval)
    statsInterval = null
  }
}

function toggleStats() {
  showStats.value = !showStats.value
}

// Format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Cleanup on call end
watch(state, (newState) => {
  if (newState === 'terminated' || newState === 'failed') {
    // Restart preview
    startPreview()

    // Reset state
    isSharingScreen.value = false
    targetUri.value = ''
  }
})
</script>

<style scoped>
.video-call-app {
  width: 100%;
  height: 100vh;
  background: #000;
  color: white;
  font-family: system-ui, -apple-system, sans-serif;
}

/* Pre-call screen */
.pre-call {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
}

.pre-call h2 {
  text-align: center;
  margin-bottom: 30px;
}

.preview-section {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.preview {
  width: 100%;
  aspect-ratio: 4/3;
  background: #000;
  border-radius: 8px;
  object-fit: cover;
  transform: scaleX(-1);  /* Mirror preview */
}

.preview-section select {
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #333;
  background: #2a2a2a;
  color: white;
  font-size: 14px;
}

.call-form {
  display: flex;
  gap: 10px;
}

.call-form input {
  flex: 1;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #333;
  background: #1a1a1a;
  color: white;
  font-size: 16px;
}

.call-form button {
  padding: 15px 30px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.call-form button:hover:not(:disabled) {
  transform: scale(1.02);
}

.call-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Active call */
.active-call {
  position: relative;
  width: 100%;
  height: 100vh;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-hidden {
  display: none;
}

.no-video {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 20px;
}

.subtitle {
  color: #999;
  font-size: 14px;
}

.local-video {
  position: absolute;
  bottom: 100px;
  right: 20px;
  width: 240px;
  height: 180px;
  border: 2px solid white;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  z-index: 10;
}

.call-duration {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0,0,0,0.6);
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 18px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.stats-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0,0,0,0.7);
  padding: 15px;
  border-radius: 8px;
  font-size: 12px;
  backdrop-filter: blur(10px);
}

.stat {
  margin-bottom: 5px;
}

.quality-poor { color: #ef4444; }
.quality-fair { color: #f59e0b; }
.quality-good { color: #10b981; }

.controls {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  padding: 15px 20px;
  background: rgba(0,0,0,0.6);
  border-radius: 50px;
  backdrop-filter: blur(10px);
  z-index: 20;
}

.controls button {
  width: 50px;
  height: 50px;
  border: none;
  border-radius: 50%;
  background: white;
  color: black;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.controls button:hover {
  transform: scale(1.1);
}

.controls button.active {
  background: #ef4444;
  color: white;
}

.controls button.hangup {
  background: #ef4444;
  color: white;
}

/* Calling state */
.calling {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .local-video {
    width: 120px;
    height: 90px;
    bottom: 90px;
    right: 10px;
  }

  .controls {
    bottom: 10px;
    padding: 10px 15px;
    gap: 10px;
  }

  .controls button {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}
</style>
```

---

## Summary

This guide covered everything you need to implement professional video calling in VueSip:

✅ **Camera Management**: Enumerating, selecting, and testing cameras
✅ **Video UI Patterns**: Building responsive, accessible video interfaces
✅ **Making Video Calls**: Quality control and media constraints
✅ **Receiving Video Calls**: Auto-answer and notification patterns
✅ **Quality Management**: Adaptive quality and statistics monitoring
✅ **Screen Sharing**: Switching between camera and screen
✅ **Advanced Features**: Mobile camera handling and optimization
✅ **Best Practices**: Performance, accessibility, and user experience
✅ **Troubleshooting**: Common issues and solutions

### Key Takeaways

1. **Always request permissions early** to avoid delays during calls
2. **Provide camera preview** to let users check their setup
3. **Handle errors gracefully** with clear user feedback
4. **Monitor and adapt quality** based on network conditions
5. **Optimize for mobile** with appropriate resolutions and frame rates
6. **Clean up resources** to prevent memory leaks
7. **Make it accessible** with proper ARIA labels and keyboard support

### Next Steps

- Explore [Call Controls Guide](./call-controls.md) for hold, mute, and transfer features
- Learn about [Performance Optimization](./performance.md) for handling multiple streams
- Check the [API Reference](../api/index.md) for detailed method documentation
- Review [Security Best Practices](./security.md) for securing video calls

💡 **Pro Tip**: Start with basic video calling and gradually add advanced features like screen sharing and quality adaptation as your users need them.
