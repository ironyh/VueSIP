import type { ExampleDefinition } from './types'
import VideoCallDemo from '../demos/VideoCallDemo.vue'

export const videoCallExample: ExampleDefinition = {
  id: 'video-call',
  icon: '📹',
  title: 'Video Calling',
  description: 'Make video calls with camera preview',
  category: 'sip',
  tags: ['Video', 'WebRTC', 'Camera Preview', 'Advanced'],
  component: VideoCallDemo,
  setupGuide: '<p>Enable video calling with camera support. Use the camera preview to test your camera before starting a call. View all available cameras in multi-camera mode. Grant camera and microphone permissions to use video features.</p>',
  codeSnippets: [
    {
      title: 'Camera Preview',
      description: 'Preview camera before starting a call',
      code: `import { ref, onUnmounted } from 'vue'
import { useMediaDevices } from 'vuesip'

const { videoInputDevices, enumerateDevices } = useMediaDevices()

// State for camera preview
const isPreviewActive = ref(false)
const previewStream = ref<MediaStream | null>(null)
const previewVideoEl = ref<HTMLVideoElement>()
const selectedCameraId = ref('')

// Start camera preview
const startPreview = async () => {
  const cameraId = selectedCameraId.value || videoInputDevices.value[0]?.deviceId
  if (!cameraId) return

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: cameraId } },
    audio: false
  })

  previewStream.value = stream
  isPreviewActive.value = true

  if (previewVideoEl.value) {
    previewVideoEl.value.srcObject = stream
  }
}

// Stop camera preview
const stopPreview = () => {
  previewStream.value?.getTracks().forEach(track => track.stop())
  previewStream.value = null
  isPreviewActive.value = false
}

// Switch preview camera
const switchCamera = async (deviceId: string) => {
  stopPreview()
  selectedCameraId.value = deviceId
  await startPreview()
}

// Cleanup on unmount
onUnmounted(() => stopPreview())`,
    },
    {
      title: 'Multi-Camera Preview',
      description: 'Display all available cameras in a grid',
      code: `const cameraStreams = ref<Record<string, MediaStream>>({})
const showMultiCameraGrid = ref(false)

// Start all camera previews
const startMultiCameraPreview = async () => {
  showMultiCameraGrid.value = true

  for (const device of videoInputDevices.value) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: device.deviceId } },
        audio: false
      })
      cameraStreams.value[device.deviceId] = stream
    } catch (error) {
      console.error(\`Failed to access camera \${device.deviceId}:\`, error)
    }
  }
}

// Stop all camera previews
const stopMultiCameraPreview = () => {
  Object.values(cameraStreams.value).forEach(stream => {
    stream.getTracks().forEach(track => track.stop())
  })
  cameraStreams.value = {}
  showMultiCameraGrid.value = false
}

// Select camera from grid for video calls
const selectCameraFromGrid = (deviceId: string) => {
  selectedCameraId.value = deviceId
  // This camera will be used when starting a video call
}`,
    },
    {
      title: 'Making Video Calls',
      description: 'Start a call with video enabled',
      code: `import { useCallSession } from 'vuesip'

const {
  makeCall,
  answer,
  localStream,
  remoteStream
} = useCallSession(sipClient)

// Make video call
await makeCall('sip:friend@example.com', {
  audio: true,
  video: true
})

// Answer with video
await answer({
  audio: true,
  video: true
})`,
    },
    {
      title: 'Video Controls',
      description: 'Toggle video during calls',
      code: `const {
  enableVideo,
  disableVideo,
  hasLocalVideo
} = useCallSession(sipClient)

// Toggle video
if (hasLocalVideo.value) {
  await disableVideo()
} else {
  await enableVideo()
}

// Display video streams
watch(remoteStream, (stream) => {
  videoElement.srcObject = stream
})`,
    },
    {
      title: 'Video Constraints',
      description: 'Configure video quality and camera settings',
      code: `// Video quality presets
const VIDEO_PRESETS = {
  low: { width: 320, height: 240, frameRate: 15 },
  medium: { width: 640, height: 480, frameRate: 24 },
  high: { width: 1280, height: 720, frameRate: 30 },
  hd: { width: 1920, height: 1080, frameRate: 30 },
}

const selectedPreset = ref<keyof typeof VIDEO_PRESETS>('medium')

// Get video constraints
const getVideoConstraints = (): MediaTrackConstraints => {
  const preset = VIDEO_PRESETS[selectedPreset.value]

  return {
    width: { ideal: preset.width },
    height: { ideal: preset.height },
    frameRate: { ideal: preset.frameRate },
    facingMode: facingMode.value, // 'user' or 'environment'
    deviceId: selectedCameraId.value ? { exact: selectedCameraId.value } : undefined,
  }
}

// Make call with custom constraints
const makeVideoCall = async (target: string) => {
  await makeCall(target, {
    audio: true,
    video: getVideoConstraints(),
  })
}

// Update video quality during call
const updateVideoQuality = async (preset: keyof typeof VIDEO_PRESETS) => {
  selectedPreset.value = preset
  const constraints = getVideoConstraints()

  // Apply new constraints to active track
  const videoTrack = localStream.value?.getVideoTracks()[0]
  if (videoTrack) {
    await videoTrack.applyConstraints(constraints)
  }
}`,
    },
    {
      title: 'Camera Selection',
      description: 'Switch between available cameras',
      code: `import { useMediaDevices } from 'vuesip'

const { videoInputDevices, enumerateDevices } = useMediaDevices()
const selectedCameraId = ref<string | null>(null)
const facingMode = ref<'user' | 'environment'>('user')

// Get available cameras
await enumerateDevices()
console.log('Available cameras:', videoInputDevices.value)

// Switch camera during call
const switchCamera = async (deviceId: string) => {
  selectedCameraId.value = deviceId

  // Get new stream with selected camera
  const newStream = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: { exact: deviceId },
      ...getVideoConstraints(),
    },
    audio: false,
  })

  // Replace video track
  const newVideoTrack = newStream.getVideoTracks()[0]
  const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video')

  if (sender) {
    await sender.replaceTrack(newVideoTrack)
  }

  // Update local preview
  localStream.value?.getVideoTracks().forEach(track => track.stop())
  localStream.value?.addTrack(newVideoTrack)
}

// Toggle front/back camera (mobile)
const flipCamera = async () => {
  facingMode.value = facingMode.value === 'user' ? 'environment' : 'user'

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: facingMode.value,
      ...getVideoConstraints(),
    },
    audio: false,
  })

  // Replace track in call
  const newVideoTrack = newStream.getVideoTracks()[0]
  await replaceVideoTrack(newVideoTrack)
}`,
    },
    {
      title: 'Video Layout Modes',
      description: 'Different video display arrangements',
      code: `type LayoutMode = 'grid' | 'spotlight' | 'pip' | 'side-by-side'

const layoutMode = ref<LayoutMode>('grid')
const spotlightParticipant = ref<string | null>(null)
const pipPosition = ref<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right')

// Layout styles based on mode
const layoutStyles = computed(() => {
  switch (layoutMode.value) {
    case 'grid':
      return {
        display: 'grid',
        gridTemplateColumns: participants.value.length <= 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '8px',
      }
    case 'spotlight':
      return {
        display: 'flex',
        flexDirection: 'column',
      }
    case 'pip':
      return {
        position: 'relative',
      }
    case 'side-by-side':
      return {
        display: 'flex',
        flexDirection: 'row',
      }
  }
})

// PIP local video styles
const pipStyles = computed(() => {
  const positions = {
    'top-left': { top: '16px', left: '16px' },
    'top-right': { top: '16px', right: '16px' },
    'bottom-left': { bottom: '16px', left: '16px' },
    'bottom-right': { bottom: '16px', right: '16px' },
  }

  return {
    position: 'absolute',
    width: '200px',
    height: '150px',
    borderRadius: '8px',
    ...positions[pipPosition.value],
  }
})

// Set spotlight
const setSpotlight = (participantId: string) => {
  spotlightParticipant.value = participantId
  layoutMode.value = 'spotlight'
}`,
    },
    {
      title: 'Picture-in-Picture',
      description: 'Use browser Picture-in-Picture API',
      code: `const remoteVideoRef = ref<HTMLVideoElement | null>(null)
const isPiPActive = ref(false)

// Check PiP support
const isPiPSupported = computed(() =>
  'pictureInPictureEnabled' in document && document.pictureInPictureEnabled
)

// Enter Picture-in-Picture mode
const enterPiP = async () => {
  if (!remoteVideoRef.value || !isPiPSupported.value) return

  try {
    await remoteVideoRef.value.requestPictureInPicture()
    isPiPActive.value = true
  } catch (error) {
    console.error('Failed to enter PiP:', error)
  }
}

// Exit Picture-in-Picture mode
const exitPiP = async () => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture()
    isPiPActive.value = false
  }
}

// Toggle PiP
const togglePiP = () => {
  if (isPiPActive.value) {
    exitPiP()
  } else {
    enterPiP()
  }
}

// Handle PiP events
onMounted(() => {
  if (remoteVideoRef.value) {
    remoteVideoRef.value.addEventListener('enterpictureinpicture', () => {
      isPiPActive.value = true
    })

    remoteVideoRef.value.addEventListener('leavepictureinpicture', () => {
      isPiPActive.value = false
    })
  }
})`,
    },
    {
      title: 'Video Call UI Component',
      description: 'Complete video call interface',
      code: `<template>
  <div class="video-call" :class="layoutMode">
    <!-- Remote video(s) -->
    <div class="video-container" :style="layoutStyles">
      <div
        v-if="layoutMode === 'spotlight' && spotlightParticipant"
        class="spotlight-video"
      >
        <video
          ref="remoteVideoRef"
          :srcObject="remoteStream"
          autoplay
          playsinline
        ></video>
      </div>

      <div v-else class="remote-videos">
        <video
          v-for="stream in remoteStreams"
          :key="stream.id"
          :srcObject="stream"
          autoplay
          playsinline
          @click="setSpotlight(stream.id)"
        ></video>
      </div>

      <!-- Local video preview -->
      <div class="local-video" :style="layoutMode === 'pip' ? pipStyles : {}">
        <video
          :srcObject="localStream"
          autoplay
          playsinline
          muted
        ></video>
        <span class="label">You</span>
      </div>
    </div>

    <!-- Video controls -->
    <div class="video-controls">
      <button @click="toggleVideo" :class="{ off: !hasLocalVideo }">
        {{ hasLocalVideo ? '📹' : '📷' }}
      </button>

      <button @click="toggleAudio" :class="{ off: isMuted }">
        {{ isMuted ? '🔇' : '🔊' }}
      </button>

      <button @click="flipCamera" v-if="isMobile">
        🔄
      </button>

      <button @click="togglePiP" v-if="isPiPSupported">
        {{ isPiPActive ? '⬜' : '📺' }}
      </button>

      <select v-model="layoutMode">
        <option value="grid">Grid</option>
        <option value="spotlight">Spotlight</option>
        <option value="pip">PiP</option>
        <option value="side-by-side">Side by Side</option>
      </select>

      <button @click="hangup" class="hangup">
        📵
      </button>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Video Bandwidth Management',
      description: 'Adapt video quality based on network',
      code: `// Monitor connection quality
const monitorBandwidth = async () => {
  const stats = await peerConnection.getStats()

  let totalBytesReceived = 0
  let packetsLost = 0
  let packetsReceived = 0

  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      totalBytesReceived = report.bytesReceived
      packetsLost = report.packetsLost
      packetsReceived = report.packetsReceived
    }
  })

  const packetLossRate = packetsReceived > 0
    ? (packetsLost / (packetsLost + packetsReceived)) * 100
    : 0

  return { totalBytesReceived, packetLossRate }
}

// Adapt quality based on network conditions
const adaptVideoQuality = async () => {
  const { packetLossRate } = await monitorBandwidth()

  if (packetLossRate > 10) {
    // High packet loss - reduce quality
    await updateVideoQuality('low')
    showNotification('Video quality reduced due to network conditions')
  } else if (packetLossRate > 5) {
    // Medium packet loss
    await updateVideoQuality('medium')
  } else if (packetLossRate < 2) {
    // Good connection - increase quality
    await updateVideoQuality('high')
  }
}

// Start adaptive quality monitoring
let qualityInterval: ReturnType<typeof setInterval> | null = null

const startAdaptiveQuality = () => {
  qualityInterval = setInterval(adaptVideoQuality, 5000)
}

const stopAdaptiveQuality = () => {
  if (qualityInterval) {
    clearInterval(qualityInterval)
    qualityInterval = null
  }
}`,
    },
  ],
}
