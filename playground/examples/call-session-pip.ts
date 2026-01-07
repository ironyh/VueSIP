import type { ExampleDefinition } from './types'
import CallSessionPiPDemo from '../demos/CallSessionPiPDemo.vue'

export const callSessionPiPExample: ExampleDefinition = {
  id: 'call-session-pip',
  icon: '📱',
  title: 'CallSession PiP Integration',
  description: 'Use Picture-in-Picture through useCallSession with automatic call-aware behavior',
  category: 'sip',
  tags: ['Video', 'PiP', 'CallSession', 'Composable', 'Auto-Exit'],
  component: CallSessionPiPDemo,
  setupGuide:
    '<p>The <code>useCallSession</code> composable now includes built-in Picture-in-Picture support. This integration provides call-aware PiP functionality that automatically exits when calls end. Instead of using <code>usePictureInPicture</code> directly, you can access all PiP features through <code>useCallSession</code> for seamless call management.</p>',
  codeSnippets: [
    {
      title: 'Basic Integration',
      description: 'Access PiP features directly from useCallSession',
      code: `import { computed, ref, watch } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())

// useCallSession now includes PiP support
const {
  state,
  makeCall,
  hangup,
  // PiP properties
  isPiPSupported,
  isPiPActive,
  pipWindow,
  pipError,
  setVideoRef,
  enterPiP,
  exitPiP,
  togglePiP,
} = useCallSession(sipClientRef)

// Bind video element for PiP
const videoElement = ref<HTMLVideoElement>()
watch(videoElement, (el) => {
  if (el) setVideoRef(el)
})`,
    },
    {
      title: 'Auto-Exit on Call End',
      description: 'PiP automatically exits when the call terminates',
      code: `import { computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())

const {
  state,
  isPiPActive,
  enterPiP,
  // No need to manually exit on call end!
} = useCallSession(sipClientRef)

// When you make a call and enter PiP...
await makeCall('sip:user@example.com', { video: true })
await enterPiP()

// ...PiP will automatically exit when:
// - state becomes 'terminated'
// - state becomes 'failed'
// No manual cleanup needed!`,
    },
    {
      title: 'Video Element Binding',
      description: 'Use setVideoRef to bind your video element',
      code: `<template>
  <video
    ref="videoElement"
    :srcObject="remoteStream"
    autoplay
    playsinline
  />
  <button @click="enterPiP" :disabled="!isPiPSupported">
    Enter PiP
  </button>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())

const {
  remoteStream,
  isPiPSupported,
  setVideoRef,
  enterPiP,
} = useCallSession(sipClientRef)

// Bind the video element for PiP
const videoElement = ref(null)
watch(videoElement, (el) => {
  if (el) setVideoRef(el)
})
</script>`,
    },
    {
      title: 'PiP State Reactivity',
      description: 'React to PiP state changes in your UI',
      code: `import { computed, watch } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())

const {
  isPiPActive,
  pipWindow,
  pipError,
} = useCallSession(sipClientRef)

// React to PiP status changes
watch(isPiPActive, (active) => {
  if (active) {
    console.log('Video is now in Picture-in-Picture mode')
    // Collapse main UI, show minimized controls
  } else {
    console.log('Exited Picture-in-Picture mode')
    // Restore full UI
  }
})

// Track PiP window dimensions
watch(pipWindow, (window) => {
  if (window) {
    console.log(\`PiP size: \${window.width}x\${window.height}\`)
  }
})

// Handle errors
watch(pipError, (error) => {
  if (error) {
    console.error('PiP error:', error.message)
  }
})`,
    },
    {
      title: 'Complete Component Example',
      description: 'Full Vue component using CallSession PiP integration',
      code: `<template>
  <div class="video-call">
    <video
      ref="videoElement"
      :srcObject="remoteStream"
      autoplay
      playsinline
    />

    <!-- PiP Controls -->
    <div class="pip-controls">
      <button
        v-if="isPiPSupported && !isPiPActive"
        @click="enterPiP"
        :disabled="state !== 'active'"
      >
        Enter PiP
      </button>

      <button v-if="isPiPActive" @click="exitPiP">
        Exit PiP
      </button>

      <span v-if="!isPiPSupported">
        PiP not supported
      </span>
    </div>

    <!-- PiP Active Notice -->
    <div v-if="isPiPActive" class="pip-notice">
      Video playing in Picture-in-Picture
      <small v-if="pipWindow">
        (\${pipWindow.width}x\${pipWindow.height})
      </small>
    </div>

    <!-- Call Status -->
    <div class="call-status">
      State: {{ state }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())

const {
  state,
  remoteStream,
  isPiPSupported,
  isPiPActive,
  pipWindow,
  setVideoRef,
  enterPiP,
  exitPiP,
} = useCallSession(sipClientRef)

const videoElement = ref(null)
watch(videoElement, (el) => {
  if (el) setVideoRef(el)
})
</script>`,
    },
    {
      title: 'Comparison: Direct vs CallSession PiP',
      description: 'When to use each approach',
      code: `// OPTION 1: Direct usePictureInPicture
// Use when you need PiP outside of call context
import { usePictureInPicture } from 'vuesip'

const videoRef = ref<HTMLVideoElement>()
const { enterPiP, exitPiP, isPiPActive } = usePictureInPicture(videoRef)

// Manual cleanup needed when call ends

// OPTION 2: useCallSession PiP Integration (Recommended for calls)
// Use when PiP is tied to a call session
import { useCallSession } from 'vuesip'

const {
  // Call features
  state, makeCall, hangup,
  // PiP features (auto-managed)
  isPiPActive, enterPiP, exitPiP, setVideoRef,
} = useCallSession(sipClientRef)

// Automatic PiP exit when call ends
// No manual cleanup needed!
// Preference persistence built-in`,
    },
  ],
}
