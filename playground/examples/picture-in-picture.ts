import type { ExampleDefinition } from './types'
import PictureInPictureDemo from '../demos/PictureInPictureDemo.vue'

export const pictureInPictureExample: ExampleDefinition = {
  id: 'picture-in-picture',
  icon: '📺',
  title: 'Picture-in-Picture',
  description: 'Display video in a floating window that stays on top of other applications',
  category: 'sip',
  tags: ['Video', 'PiP', 'WebRTC', 'Composable', 'Advanced'],
  component: PictureInPictureDemo,
  setupGuide: '<p>The Picture-in-Picture (PiP) composable allows you to display video content in a floating window that stays on top of other applications. This is particularly useful for video calls, allowing users to monitor the call while working in other apps. The composable handles browser support detection, reactive state management, and automatic cleanup.</p>',
  codeSnippets: [
    {
      title: 'Basic Usage',
      description: 'Initialize the PiP composable with a video element reference',
      code: `import { ref } from 'vue'
import { usePictureInPicture } from 'vuesip'

// Create a ref for the video element
const videoRef = ref<HTMLVideoElement | null>(null)

// Initialize the composable
const {
  isPiPSupported,  // Browser supports PiP
  isPiPActive,     // Currently in PiP mode
  pipWindow,       // PiP window reference (dimensions)
  enterPiP,        // Enter PiP mode
  exitPiP,         // Exit PiP mode
  togglePiP,       // Toggle PiP mode
  error,           // Error state
} = usePictureInPicture(videoRef)

// Check support before showing PiP controls
if (isPiPSupported.value) {
  console.log('PiP is supported!')
}`,
    },
    {
      title: 'With Video Calls',
      description: 'Use PiP with remote video streams during calls',
      code: `import { ref, watch } from 'vue'
import { useCallSession, usePictureInPicture } from 'vuesip'

const remoteVideoRef = ref<HTMLVideoElement | null>(null)
const { remoteStream } = useCallSession(sipClient)

// Initialize PiP for remote video
const { isPiPSupported, isPiPActive, enterPiP, exitPiP } =
  usePictureInPicture(remoteVideoRef)

// Attach remote stream to video element
watch(remoteStream, (stream) => {
  if (remoteVideoRef.value && stream) {
    remoteVideoRef.value.srcObject = stream

    // Optionally auto-enter PiP when stream starts
    if (isPiPSupported.value && userPrefersPiP.value) {
      enterPiP()
    }
  }
})

// Exit PiP when call ends
watch(callState, (state) => {
  if (state === 'terminated' && isPiPActive.value) {
    exitPiP()
  }
})`,
    },
    {
      title: 'With Preference Persistence',
      description: 'Remember user PiP preference across sessions',
      code: `import { ref } from 'vue'
import { usePictureInPicture } from 'vuesip'

const videoRef = ref<HTMLVideoElement | null>(null)

// Enable preference persistence
const pip = usePictureInPicture(videoRef, {
  persistPreference: true,
  preferenceKey: 'my-app-pip-preference'
})

// The composable will automatically save/load preference
// User's last PiP state will be remembered`,
    },
    {
      title: 'Error Handling',
      description: 'Handle PiP errors gracefully',
      code: `import { ref, watch } from 'vue'
import { usePictureInPicture } from 'vuesip'

const videoRef = ref<HTMLVideoElement | null>(null)

const { enterPiP, error } = usePictureInPicture(videoRef)

// Watch for errors
watch(error, (err) => {
  if (err) {
    // Common errors:
    // - User denied permission
    // - Video element not ready
    // - Browser doesn't support PiP
    console.error('PiP error:', err.message)
    showNotification('Picture-in-Picture failed: ' + err.message)
  }
})

// Try to enter PiP with error handling
const handlePiPClick = async () => {
  await enterPiP()

  // Check if there was an error
  if (error.value) {
    // Handle the error (already logged by watcher)
    return
  }

  console.log('Successfully entered PiP mode!')
}`,
    },
    {
      title: 'PiP Window Events',
      description: 'React to PiP window size changes and closure',
      code: `import { ref, watch } from 'vue'
import { usePictureInPicture } from 'vuesip'

const videoRef = ref<HTMLVideoElement | null>(null)

const { isPiPActive, pipWindow } = usePictureInPicture(videoRef)

// React to PiP status changes
watch(isPiPActive, (active) => {
  if (active) {
    console.log('Entered PiP mode')
    // Maybe collapse the main video UI
    showMinimizedControls.value = true
  } else {
    console.log('Exited PiP mode')
    // Restore full UI
    showMinimizedControls.value = false
  }
})

// Track PiP window dimensions
watch(pipWindow, (window) => {
  if (window) {
    console.log(\`PiP window size: \${window.width}x\${window.height}\`)

    // Listen for resize events
    window.addEventListener('resize', () => {
      console.log(\`Resized to: \${window.width}x\${window.height}\`)
    })
  }
})`,
    },
    {
      title: 'Complete Component Example',
      description: 'Full Vue component with PiP controls',
      code: `<template>
  <div class="video-call">
    <video
      ref="videoRef"
      :srcObject="remoteStream"
      autoplay
      playsinline
    />

    <div class="controls">
      <button
        v-if="isPiPSupported && !isPiPActive"
        @click="enterPiP"
        :disabled="!isVideoReady"
      >
        Enter PiP
      </button>

      <button
        v-if="isPiPActive"
        @click="exitPiP"
      >
        Exit PiP
      </button>

      <span v-if="!isPiPSupported" class="warning">
        PiP not supported in this browser
      </span>
    </div>

    <div v-if="isPiPActive" class="pip-notice">
      Video is in Picture-in-Picture mode
      <button @click="exitPiP">Bring back</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePictureInPicture } from 'vuesip'

const videoRef = ref(null)
const remoteStream = ref(null)

const {
  isPiPSupported,
  isPiPActive,
  enterPiP,
  exitPiP,
} = usePictureInPicture(videoRef)

const isVideoReady = computed(() => {
  return videoRef.value?.readyState >= 2
})
</script>`,
    },
  ],
}
