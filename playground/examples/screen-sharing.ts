import type { ExampleDefinition } from './types'
import ScreenSharingDemo from '../demos/ScreenSharingDemo.vue'

export const screenSharingExample: ExampleDefinition = {
  id: 'screen-sharing',
  icon: '🖥️',
  title: 'Screen Sharing',
  description: 'Share screen during video calls',
  category: 'sip',
  tags: ['Video', 'Advanced', 'Screen'],
  component: ScreenSharingDemo,
  setupGuide: '<p>Share your screen, application windows, or browser tabs during video calls. Requires WebRTC screen capture API support.</p>',
  codeSnippets: [
    {
      title: 'Start Screen Sharing',
      description: 'Request screen capture permission',
      code: `import { ref } from 'vue'
import { useCallSession } from 'vuesip'

const screenStream = ref<MediaStream | null>(null)
const { session } = useCallSession(sipClient)

const startScreenShare = async () => {
  try {
    // Request screen capture
    screenStream.value = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always'
      },
      audio: false
    })

    // Replace video track in call
    const videoTrack = screenStream.value.getVideoTracks()[0]

    const sender = session.value.connection
      .getSenders()
      .find(s => s.track?.kind === 'video')

    if (sender) {
      await sender.replaceTrack(videoTrack)
    }

    // Listen for stop sharing
    videoTrack.onended = () => {
      stopScreenShare()
    }
  } catch (error) {
    console.error('Screen sharing failed:', error)
  }
}

const stopScreenShare = async () => {
  if (screenStream.value) {
    screenStream.value.getTracks().forEach(track => track.stop())
    screenStream.value = null
  }

  // Restore camera stream
  // ... restore original video track
}`,
    },
    {
      title: 'Screen Share Options',
      description: 'Configure capture settings',
      code: `const shareScreen = async (options: {
  type: 'screen' | 'window' | 'tab'
  audio: boolean
  highQuality: boolean
}) => {
  const constraints: any = {
    video: {
      cursor: 'always',
      displaySurface: options.type
    },
    audio: options.audio
  }

  if (options.highQuality) {
    constraints.video.width = { ideal: 1920 }
    constraints.video.height = { ideal: 1080 }
    constraints.video.frameRate = { ideal: 30 }
  } else {
    constraints.video.width = { ideal: 1280 }
    constraints.video.height = { ideal: 720 }
    constraints.video.frameRate = { ideal: 15 }
  }

  const stream = await navigator.mediaDevices
    .getDisplayMedia(constraints)

  return stream
}`,
    },
    {
      title: 'Screen Share State Management',
      description: 'Track sharing state and source info',
      code: `import { ref, computed, readonly } from 'vue'

interface ScreenShareState {
  isSharing: boolean
  sourceType: 'screen' | 'window' | 'tab' | null
  sourceName: string | null
  hasAudio: boolean
  resolution: { width: number; height: number } | null
}

const state = ref<ScreenShareState>({
  isSharing: false,
  sourceType: null,
  sourceName: null,
  hasAudio: false,
  resolution: null
})

const updateStateFromStream = (stream: MediaStream) => {
  const videoTrack = stream.getVideoTracks()[0]
  const audioTrack = stream.getAudioTracks()[0]
  const settings = videoTrack.getSettings()

  state.value = {
    isSharing: true,
    sourceType: settings.displaySurface as any || 'screen',
    sourceName: videoTrack.label,
    hasAudio: !!audioTrack,
    resolution: {
      width: settings.width || 0,
      height: settings.height || 0
    }
  }
}

const resetState = () => {
  state.value = {
    isSharing: false,
    sourceType: null,
    sourceName: null,
    hasAudio: false,
    resolution: null
  }
}

// Computed helpers
const shareInfo = computed(() => {
  if (!state.value.isSharing) return 'Not sharing'
  const res = state.value.resolution
  return \`Sharing \${state.value.sourceType} (\${res?.width}x\${res?.height})\`
})`,
    },
    {
      title: 'Screen Share with System Audio',
      description: 'Capture screen with audio from the shared content',
      code: `const shareScreenWithAudio = async () => {
  try {
    // Request screen with system audio
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'browser' // 'browser' tab supports audio
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })

    // Get microphone for voice
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    })

    // Mix system audio with microphone
    const audioContext = new AudioContext()
    const destination = audioContext.createMediaStreamDestination()

    // Add screen audio if available
    const screenAudio = screenStream.getAudioTracks()[0]
    if (screenAudio) {
      const screenSource = audioContext.createMediaStreamSource(
        new MediaStream([screenAudio])
      )
      screenSource.connect(destination)
    }

    // Add microphone
    const micSource = audioContext.createMediaStreamSource(micStream)
    micSource.connect(destination)

    // Create combined stream
    const combinedStream = new MediaStream([
      ...screenStream.getVideoTracks(),
      ...destination.stream.getAudioTracks()
    ])

    return combinedStream
  } catch (error) {
    console.error('Screen share with audio failed:', error)
    throw error
  }
}`,
    },
    {
      title: 'Picture-in-Picture Preview',
      description: 'Show local preview while sharing screen',
      code: `import { ref, onUnmounted } from 'vue'

const pipWindow = ref<PictureInPictureWindow | null>(null)
const previewVideo = ref<HTMLVideoElement | null>(null)

const showSelfPreview = async (cameraStream: MediaStream) => {
  if (!document.pictureInPictureEnabled) {
    console.warn('PiP not supported')
    return
  }

  // Create hidden video element for camera
  const video = document.createElement('video')
  video.srcObject = cameraStream
  video.muted = true
  video.autoplay = true
  video.playsInline = true

  // Need to append to DOM briefly
  video.style.position = 'fixed'
  video.style.opacity = '0'
  video.style.pointerEvents = 'none'
  document.body.appendChild(video)

  await video.play()

  try {
    // Enter PiP
    pipWindow.value = await video.requestPictureInPicture()
    previewVideo.value = video

    // Handle PiP close
    pipWindow.value.addEventListener('resize', () => {
      console.log('PiP resized:', pipWindow.value?.width, pipWindow.value?.height)
    })

    video.addEventListener('leavepictureinpicture', () => {
      pipWindow.value = null
      video.remove()
    })
  } catch (error) {
    video.remove()
    throw error
  }
}

const closeSelfPreview = async () => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture()
  }
  previewVideo.value?.remove()
  previewVideo.value = null
  pipWindow.value = null
}

onUnmounted(() => {
  closeSelfPreview()
})`,
    },
    {
      title: 'Screen Share UI Component',
      description: 'Complete screen sharing controls',
      code: `<template>
  <div class="screen-share-controls">
    <!-- Share Button -->
    <button
      v-if="!isSharing"
      @click="showShareOptions = true"
      class="share-btn"
    >
      <span class="icon">🖥️</span>
      Share Screen
    </button>

    <!-- Active Share Indicator -->
    <div v-else class="sharing-active">
      <div class="share-info">
        <span class="pulse-dot"></span>
        <span>{{ shareInfo }}</span>
      </div>
      <button @click="stopSharing" class="stop-btn">
        Stop Sharing
      </button>
    </div>

    <!-- Share Options Modal -->
    <div v-if="showShareOptions" class="share-modal">
      <h3>Share your screen</h3>

      <div class="share-options">
        <button @click="startShare('screen')">
          <span>🖥️</span>
          <span>Entire Screen</span>
        </button>
        <button @click="startShare('window')">
          <span>🪟</span>
          <span>Window</span>
        </button>
        <button @click="startShare('tab')">
          <span>🌐</span>
          <span>Browser Tab</span>
        </button>
      </div>

      <label class="audio-option">
        <input type="checkbox" v-model="includeAudio" />
        Share audio (tab only)
      </label>

      <label class="quality-option">
        <input type="checkbox" v-model="highQuality" />
        High quality (1080p)
      </label>

      <button @click="showShareOptions = false" class="cancel-btn">
        Cancel
      </button>
    </div>
  </div>
</template>

<style scoped>
.pulse-dot {
  width: 8px;
  height: 8px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>`,
    },
    {
      title: 'Screen Share Error Handling',
      description: 'Handle common screen sharing errors',
      code: `type ScreenShareError =
  | 'NotAllowedError'      // User denied permission
  | 'NotFoundError'        // No screen to share
  | 'NotReadableError'     // Hardware/OS error
  | 'OverconstrainedError' // Constraints can't be satisfied
  | 'AbortError'           // Operation aborted
  | 'SecurityError'        // Security policy blocked

const handleScreenShareError = (error: Error): string => {
  const errorMap: Record<string, string> = {
    NotAllowedError: 'Screen sharing was denied. Please allow access and try again.',
    NotFoundError: 'No screen found to share.',
    NotReadableError: 'Unable to capture screen. Try closing other screen sharing apps.',
    OverconstrainedError: 'Screen resolution not supported. Try lower quality settings.',
    AbortError: 'Screen sharing was cancelled.',
    SecurityError: 'Screen sharing blocked by security policy.'
  }

  return errorMap[error.name] || \`Screen sharing failed: \${error.message}\`
}

const startShareWithErrorHandling = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    })
    return { success: true, stream }
  } catch (error) {
    const message = handleScreenShareError(error as Error)

    // Show user-friendly error
    showNotification({
      type: 'error',
      title: 'Screen Share Failed',
      message
    })

    return { success: false, error: message }
  }
}

// Check browser support
const isScreenShareSupported = computed(() => {
  return 'getDisplayMedia' in navigator.mediaDevices
})`,
    },
    {
      title: 'Annotation Layer',
      description: 'Draw annotations over shared screen',
      code: `import { ref, onMounted } from 'vue'

interface Annotation {
  type: 'pen' | 'highlight' | 'arrow' | 'text'
  points: { x: number; y: number }[]
  color: string
  width: number
}

const annotations = ref<Annotation[]>([])
const currentTool = ref<'pen' | 'highlight' | 'arrow' | 'text'>('pen')
const currentColor = ref('#ff0000')
const isDrawing = ref(false)

const setupAnnotationCanvas = (
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement
) => {
  const ctx = canvasElement.getContext('2d')!

  // Match canvas size to video
  const resizeCanvas = () => {
    canvasElement.width = videoElement.videoWidth
    canvasElement.height = videoElement.videoHeight
    redrawAnnotations()
  }

  videoElement.addEventListener('resize', resizeCanvas)
  resizeCanvas()

  // Drawing handlers
  canvasElement.addEventListener('mousedown', (e) => {
    isDrawing.value = true
    const rect = canvasElement.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvasElement.width / rect.width)
    const y = (e.clientY - rect.top) * (canvasElement.height / rect.height)

    annotations.value.push({
      type: currentTool.value,
      points: [{ x, y }],
      color: currentColor.value,
      width: currentTool.value === 'highlight' ? 20 : 3
    })
  })

  canvasElement.addEventListener('mousemove', (e) => {
    if (!isDrawing.value) return
    const current = annotations.value[annotations.value.length - 1]
    const rect = canvasElement.getBoundingClientRect()
    current.points.push({
      x: (e.clientX - rect.left) * (canvasElement.width / rect.width),
      y: (e.clientY - rect.top) * (canvasElement.height / rect.height)
    })
    redrawAnnotations()
  })

  canvasElement.addEventListener('mouseup', () => {
    isDrawing.value = false
  })
}

const redrawAnnotations = () => {
  // Redraw all annotations on canvas
  annotations.value.forEach(drawAnnotation)
}

const clearAnnotations = () => {
  annotations.value = []
  redrawAnnotations()
}`,
    },
  ],
}
