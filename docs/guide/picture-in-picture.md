# Picture-in-Picture Guide

This guide covers VueSip's Picture-in-Picture (PiP) features, including browser-level floating windows and in-app video inset layouts for professional video call experiences.

## Table of Contents

- [Introduction](#introduction)
- [Understanding PiP Features](#understanding-pip-features)
- [Browser Picture-in-Picture](#browser-picture-in-picture)
- [Video Inset Layout](#video-inset-layout)
- [Combining Both Features](#combining-both-features)
- [Use Cases](#use-cases)
- [Best Practices](#best-practices)
- [Mobile Considerations](#mobile-considerations)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)
- [Complete Examples](#complete-examples)

---

## Introduction

### What is Picture-in-Picture?

Picture-in-Picture (PiP) refers to displaying video content in a way that allows users to continue viewing while doing other tasks. VueSip provides two complementary PiP features:

1. **Browser PiP**: A floating video window at the OS level that stays visible across all applications
2. **Video Inset**: An in-app local camera overlay on the remote video stream

**Why Use Picture-in-Picture?**
- **Multitasking**: Users can take notes, browse documents, or work in other apps while on a call
- **Professional UI**: Show both participants in a video call with the industry-standard inset layout
- **User Control**: Let users customize their viewing experience
- **Screen Real Estate**: Maximize usable space while maintaining video visibility

### When to Use Each Feature

| Feature | Best For | Example |
|---------|----------|---------|
| **Browser PiP** | Multitasking across applications | Taking notes while on a call |
| **Video Inset** | In-app video call layouts | Showing local camera in corner |
| **Both Together** | Full-featured video calling | Complete video conferencing app |

---

## Understanding PiP Features

### Browser PiP vs Video Inset

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Browser Picture-in-Picture                                     │
│  ═══════════════════════════                                    │
│                                                                 │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │   Your App      │      │  Other App      │                   │
│  │                 │      │                 │   ┌─────────┐     │
│  │                 │      │                 │   │ Floating│     │
│  │                 │      │                 │   │  Video  │     │
│  │                 │      │                 │   │ Window  │     │
│  └─────────────────┘      └─────────────────┘   └─────────┘     │
│                                                                 │
│  Video floats above ALL windows (OS-level)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Video Inset Layout                                             │
│  ══════════════════                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │              Remote Video (Full Screen)                 │    │
│  │                                                         │    │
│  │                                             ┌─────────┐ │    │
│  │                                             │  Local  │ │    │
│  │                                             │ Camera  │ │    │
│  │                                             │ (Inset) │ │    │
│  │                                             └─────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Local camera overlay within your app                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Browser Picture-in-Picture

### Overview

Browser PiP uses the native Picture-in-Picture API to create a floating video window that stays on top of all other windows, even when switching to different applications.

### Quick Start

```typescript
import { ref } from 'vue'
import { usePictureInPicture } from 'vuesip'

const videoElement = ref<HTMLVideoElement | null>(null)

const {
  isPiPSupported,
  isPiPActive,
  togglePiP,
  error
} = usePictureInPicture(videoElement)

// Check support before showing controls
if (isPiPSupported.value) {
  await togglePiP()
}
```

### Basic Implementation

```vue
<template>
  <div class="pip-demo">
    <video
      ref="videoRef"
      autoplay
      playsinline
      @loadedmetadata="onVideoReady"
    />

    <div class="controls">
      <!-- Only show PiP button if supported -->
      <button
        v-if="isPiPSupported"
        @click="togglePiP"
        class="pip-button"
      >
        <span v-if="isPiPActive">Exit Picture-in-Picture</span>
        <span v-else>Enter Picture-in-Picture</span>
      </button>

      <!-- Show message if not supported -->
      <p v-else class="not-supported">
        Picture-in-Picture is not supported in your browser.
        Try Chrome, Edge, or Safari.
      </p>
    </div>

    <!-- Error display -->
    <p v-if="error" class="error">{{ error.message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePictureInPicture } from 'vuesip'

const videoRef = ref<HTMLVideoElement | null>(null)

const {
  isPiPSupported,
  isPiPActive,
  togglePiP,
  enterPiP,
  exitPiP,
  error
} = usePictureInPicture(videoRef, {
  persistPreference: true // Remember user's preference
})

// Attach a media stream when ready
const onVideoReady = () => {
  console.log('Video ready for PiP')
}

// Log state changes
watch(isPiPActive, (active) => {
  console.log(active ? 'Entered PiP mode' : 'Exited PiP mode')
})
</script>
```

### Persistence

Enable preference persistence to remember if the user prefers PiP mode:

```typescript
const pip = usePictureInPicture(videoRef, {
  persistPreference: true,
  preferenceKey: 'my-app-pip-pref' // Custom storage key
})

// If user previously had PiP active and video is ready,
// it will automatically re-enter PiP mode
```

### Browser Support

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | 70+ | Full Support |
| Edge | 79+ | Full Support |
| Safari | 13.1+ | Full Support |
| Opera | 57+ | Full Support |
| Firefox | - | Different API (not supported) |
| Mobile Chrome | Android 8+ | Limited |
| Mobile Safari | iOS 14+ | Limited |

Always check `isPiPSupported` before showing PiP controls to avoid confusing users.

---

## Video Inset Layout

### Overview

The Video Inset feature creates a local camera overlay positioned over the remote video stream. This is the standard layout used by video conferencing apps like Zoom, Teams, and FaceTime.

### Quick Start

```typescript
import { useVideoInset } from 'vuesip'

const {
  isVisible,
  isSwapped,
  insetStyles,
  swapVideos,
  cyclePosition
} = useVideoInset({
  initialPosition: 'bottom-right',
  initialSize: 'medium'
})
```

### Basic Implementation

```vue
<template>
  <div class="video-call-container">
    <!-- Main video: Remote participant (or local if swapped) -->
    <video
      ref="mainVideoRef"
      :srcObject="isSwapped ? localStream : remoteStream"
      autoplay
      playsinline
      class="main-video"
    />

    <!-- Inset video: Local camera (or remote if swapped) -->
    <div
      v-if="isVisible"
      :style="insetStyles"
      class="inset-container"
    >
      <video
        ref="insetVideoRef"
        :srcObject="isSwapped ? remoteStream : localStream"
        autoplay
        muted
        playsinline
        class="inset-video"
      />
    </div>

    <!-- Control bar -->
    <div class="controls">
      <button @click="swapVideos">Swap Videos</button>
      <button @click="cyclePosition">Move Inset</button>
      <button @click="toggle">
        {{ isVisible ? 'Hide' : 'Show' }} Self-View
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVideoInset, useCallSession } from 'vuesip'

// Get streams from your call session
const { localStream, remoteStream } = useCallSession(sipClient)

const {
  isVisible,
  isSwapped,
  insetStyles,
  swapVideos,
  cyclePosition,
  toggle
} = useVideoInset()
</script>

<style scoped>
.video-call-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.main-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.inset-container {
  background: #000;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.inset-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
```

### Position Control

The inset can be positioned in any of four corners:

```typescript
const { position, setPosition, cyclePosition } = useVideoInset()

// Set specific position
setPosition('top-left')
setPosition('top-right')
setPosition('bottom-left')
setPosition('bottom-right')

// Cycle through positions (clockwise)
cyclePosition() // bottom-right → bottom-left → top-left → top-right
```

### Size Presets

Three built-in size presets plus custom sizing:

```typescript
const { size, setSize, setCustomDimensions } = useVideoInset()

// Use presets
setSize('small')   // 120×90 px
setSize('medium')  // 160×120 px
setSize('large')   // 240×180 px

// Or use custom dimensions
setCustomDimensions(200, 150) // 200×150 px
```

### Video Swapping

Allow users to swap which video is the main view:

```typescript
const { isSwapped, swapVideos } = useVideoInset()

// Swap main and inset videos
swapVideos()

// Check current state
if (isSwapped.value) {
  // Local video is now the main view
  // Remote video is in the inset
}
```

This is useful when:
- User wants to check their appearance
- Local video has important content (screen share)
- Remote video is less important temporarily

### Visibility Control

```typescript
const { isVisible, show, hide, toggle } = useVideoInset()

// Control visibility
show()   // Show inset
hide()   // Hide inset
toggle() // Toggle visibility

// Hide self-view for privacy or focus
if (!isVisible.value) {
  console.log('Self-view is hidden')
}
```

### Persistence

Save user preferences to localStorage:

```typescript
const inset = useVideoInset({
  persistPreference: true,
  preferenceKey: 'my-app-inset-prefs'
})

// Settings automatically saved:
// - Position (top-left, bottom-right, etc.)
// - Size preset (small, medium, large, custom)
// - Custom dimensions (if using custom size)
// - Visibility state
```

---

## Combining Both Features

### Complete Video Call with Both PiP Features

```vue
<template>
  <div class="video-call">
    <!-- Tab navigation -->
    <div class="tabs">
      <button
        :class="{ active: activeTab === 'inset' }"
        @click="activeTab = 'inset'"
      >
        Video Inset
      </button>
      <button
        :class="{ active: activeTab === 'pip' }"
        @click="activeTab = 'pip'"
      >
        Browser PiP
      </button>
    </div>

    <!-- Video Inset Layout Tab -->
    <div v-if="activeTab === 'inset'" class="inset-view">
      <div class="video-container">
        <video
          ref="mainVideo"
          :srcObject="isSwapped ? localStream : remoteStream"
          autoplay
          playsinline
          class="main-video"
        />

        <div
          v-if="isInsetVisible"
          :style="insetStyles"
          class="inset"
        >
          <video
            :srcObject="isSwapped ? remoteStream : localStream"
            autoplay
            muted
            playsinline
          />
        </div>
      </div>

      <div class="controls">
        <button @click="swapVideos">Swap</button>
        <button @click="cyclePosition">Move</button>
        <button @click="toggleInset">
          {{ isInsetVisible ? 'Hide' : 'Show' }}
        </button>
        <select v-model="selectedSize" @change="setSize(selectedSize)">
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>

    <!-- Browser PiP Tab -->
    <div v-if="activeTab === 'pip'" class="pip-view">
      <video
        ref="pipVideo"
        :srcObject="remoteStream"
        autoplay
        playsinline
        class="pip-video"
      />

      <div class="controls">
        <button
          v-if="isPiPSupported"
          @click="togglePiP"
          :class="{ active: isPiPActive }"
        >
          {{ isPiPActive ? 'Exit PiP' : 'Enter PiP' }}
        </button>
        <p v-else>Browser PiP not supported</p>
      </div>

      <p v-if="isPiPActive" class="pip-hint">
        Video is now in a floating window. You can switch to other apps!
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  usePictureInPicture,
  useVideoInset,
  useCallSession
} from 'vuesip'

const activeTab = ref<'inset' | 'pip'>('inset')
const selectedSize = ref('medium')

// Call session for streams
const { localStream, remoteStream } = useCallSession(sipClient)

// Video refs
const mainVideo = ref<HTMLVideoElement | null>(null)
const pipVideo = ref<HTMLVideoElement | null>(null)

// Video Inset
const {
  isVisible: isInsetVisible,
  isSwapped,
  insetStyles,
  swapVideos,
  cyclePosition,
  toggle: toggleInset,
  setSize
} = useVideoInset({
  persistPreference: true
})

// Browser PiP
const {
  isPiPSupported,
  isPiPActive,
  togglePiP
} = usePictureInPicture(pipVideo)
</script>
```

---

## Use Cases

### 1. Customer Support Video Call

```typescript
// Support agent sees customer in main view
// Agent's camera in small inset for self-monitoring
const support = useVideoInset({
  initialPosition: 'bottom-right',
  initialSize: 'small', // Minimal distraction
  showInitially: true
})
```

### 2. Telehealth Consultation

```typescript
// Patient sees doctor prominently
// With option to use PiP for taking notes
const telehealth = {
  inset: useVideoInset({
    initialSize: 'medium',
    persistPreference: true
  }),
  pip: usePictureInPicture(videoRef)
}

// Doctor can enable PiP to check patient records
// while keeping video visible
```

### 3. Remote Interview

```typescript
// Candidate sees interviewer
// With professional inset layout
const interview = useVideoInset({
  initialPosition: 'top-right', // Less distracting position
  initialSize: 'small',
  draggable: false // Prevent accidental moves
})
```

### 4. Webinar/Presentation

```typescript
// Presenter shares screen as main
// Camera in inset overlay
const presentation = useVideoInset({
  initialPosition: 'bottom-left',
  initialSize: 'large', // More visible for engagement
  showInitially: true
})

// Swap so screen share is main, camera is inset
if (isScreenSharing) {
  swapVideos()
}
```

---

## Best Practices

### 1. Always Check Support

```typescript
// Browser PiP
if (isPiPSupported.value) {
  showPiPButton.value = true
}

// Video inset always works (CSS-based)
// But check for video streams
if (remoteStream.value) {
  showInsetLayout.value = true
}
```

### 2. Provide User Controls

Let users customize their experience:

```vue
<template>
  <div class="video-settings">
    <label>
      <input type="checkbox" v-model="selfViewEnabled" />
      Show self-view
    </label>

    <label>
      Inset position:
      <select v-model="insetPosition">
        <option value="bottom-right">Bottom Right</option>
        <option value="bottom-left">Bottom Left</option>
        <option value="top-right">Top Right</option>
        <option value="top-left">Top Left</option>
      </select>
    </label>

    <label>
      Inset size:
      <select v-model="insetSize">
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
    </label>
  </div>
</template>
```

### 3. Handle Errors Gracefully

```typescript
import { watch } from 'vue'

const { error } = usePictureInPicture(videoRef)

watch(error, (e) => {
  if (e) {
    // Common errors:
    // - "Picture-in-Picture is not supported"
    // - "Video element not found"
    // - "Picture-in-Picture is disabled for this video"

    showNotification({
      type: 'warning',
      message: 'PiP unavailable: ' + e.message
    })
  }
})
```

### 4. Persist Preferences

```typescript
// Users appreciate remembering their choices
useVideoInset({
  persistPreference: true,
  preferenceKey: 'video-call-inset-prefs'
})

usePictureInPicture(videoRef, {
  persistPreference: true,
  preferenceKey: 'video-call-pip-pref'
})
```

### 5. Responsive Design

```typescript
import { onMounted, onUnmounted } from 'vue'

const { setSize } = useVideoInset()

const handleResize = () => {
  if (window.innerWidth < 480) {
    setSize('small')
  } else if (window.innerWidth < 768) {
    setSize('medium')
  } else {
    setSize('large')
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
```

---

## Mobile Considerations

### Touch-Friendly Controls

```vue
<template>
  <div
    :style="insetStyles"
    class="inset-container"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <video ... />

    <!-- Larger touch targets for mobile -->
    <div class="mobile-controls">
      <button @click="swapVideos" class="touch-button">
        Swap
      </button>
    </div>
  </div>
</template>

<style scoped>
.touch-button {
  min-width: 44px;
  min-height: 44px; /* Apple's recommended touch target */
  font-size: 16px;
}
</style>
```

### Mobile PiP Limitations

- iOS: PiP only works in Safari with specific video requirements
- Android: PiP support varies by manufacturer and Android version
- Always provide video inset as a fallback

```typescript
const useMobileOptimizedPiP = (videoRef: Ref<HTMLVideoElement | null>) => {
  const pip = usePictureInPicture(videoRef)

  // On mobile, prefer inset layout
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  return {
    ...pip,
    // Override to warn about mobile limitations
    enterPiP: async () => {
      if (isMobile && !pip.isPiPSupported.value) {
        console.warn('PiP not supported on this mobile device')
        return
      }
      await pip.enterPiP()
    }
  }
}
```

---

## Accessibility

### Keyboard Navigation

```vue
<template>
  <div
    :style="insetStyles"
    class="inset"
    tabindex="0"
    role="region"
    aria-label="Self-view camera"
    @keydown="handleKeydown"
  >
    <video ... />
  </div>
</template>

<script setup lang="ts">
const { cyclePosition, swapVideos, toggle } = useVideoInset()

const handleKeydown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'p':
    case 'P':
      cyclePosition()
      break
    case 's':
    case 'S':
      swapVideos()
      break
    case 'h':
    case 'H':
      toggle()
      break
  }
}
</script>
```

### Screen Reader Announcements

```vue
<template>
  <div>
    <!-- Visually hidden announcements -->
    <div
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{ announcement }}
    </div>

    <button @click="handleSwap">Swap Videos</button>
  </div>
</template>

<script setup lang="ts">
const announcement = ref('')

const handleSwap = () => {
  swapVideos()
  announcement.value = isSwapped.value
    ? 'Your camera is now the main view'
    : 'Remote participant is now the main view'
}
</script>
```

---

## Troubleshooting

### Browser PiP Not Working

| Issue | Cause | Solution |
|-------|-------|----------|
| Button doesn't appear | PiP not supported | Check `isPiPSupported` |
| "Not allowed" error | User gesture required | Call from click handler |
| Video not showing | No srcObject | Ensure stream is attached |
| PiP exits immediately | Video element unmounted | Keep video in DOM |

### Video Inset Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Inset not visible | `isVisible` is false | Call `show()` |
| Wrong position | Settings not persisted | Enable `persistPreference` |
| Styling issues | CSS conflicts | Check z-index and position |
| Streams swapped wrong | `isSwapped` state | Check conditional bindings |

### Common Code Fixes

```typescript
// Issue: PiP won't enter
// Fix: Ensure video has content and is in DOM
watch(remoteStream, (stream) => {
  if (stream && videoRef.value) {
    videoRef.value.srcObject = stream
    // Wait for video to be ready
    videoRef.value.onloadedmetadata = () => {
      console.log('Video ready for PiP')
    }
  }
})

// Issue: Inset styles not applying
// Fix: Ensure parent has position: relative
// <style>
// .parent { position: relative; }
// </style>

// Issue: Videos appear black
// Fix: Ensure streams are active
if (!localStream.value?.active) {
  console.warn('Local stream is not active')
}
```

---

## Complete Examples

### Full-Featured Video Call Component

See the complete implementation in the playground:
- [PictureInPictureDemo.vue](https://github.com/example/vuesip/playground/demos/PictureInPictureDemo.vue)

Key features demonstrated:
- Tabbed interface for both PiP modes
- Interactive position and size controls
- Video swapping with visual feedback
- Error handling and browser support detection
- Responsive design for mobile

### Minimal Example

```vue
<template>
  <div class="simple-call">
    <video ref="mainVid" :srcObject="remoteStream" autoplay playsinline />
    <div v-if="isVisible" :style="insetStyles">
      <video :srcObject="localStream" autoplay muted playsinline />
    </div>
    <button @click="swapVideos">Swap</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useVideoInset, useCallSession } from 'vuesip'

const { localStream, remoteStream } = useCallSession(sipClient)
const { isVisible, insetStyles, swapVideos } = useVideoInset()
</script>

<style>
.simple-call { position: relative; height: 100vh; }
.simple-call video { width: 100%; height: 100%; object-fit: cover; }
</style>
```

---

## Related Documentation

- [Video Calling Guide](./video-calling.md) - Complete video calling implementation
- [Device Management](./device-management.md) - Camera and microphone selection
- [Call Controls](./call-controls.md) - Hold, mute, and transfer
- [API Reference: usePictureInPicture](../api/composables.md#usepictureinpicture)
- [API Reference: useVideoInset](../api/composables.md#usevideoinset)
