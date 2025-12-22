<template>
  <div class="video-call-demo">
    <div class="info-section">
      <p>
        VueSip supports video calling with full camera and screen sharing capabilities. Enable video
        during calls to have face-to-face conversations.
      </p>
      <p class="note">
        <strong>Note:</strong> Your browser will request camera and microphone permissions. Grant
        access to enable video calling features.
      </p>
    </div>

    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="callState"
      :duration="duration"
      :remote-uri="remoteUri"
      :remote-display-name="remoteDisplayName"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="isMuted"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Camera Preview Section -->
    <div class="camera-preview-section">
      <div class="preview-header">
        <h3>Camera Preview</h3>
        <div class="preview-controls">
          <button
            v-if="!isPreviewActive"
            class="btn btn-primary btn-sm"
            @click="startPreview"
            :disabled="videoInputDevices.length === 0"
          >
            <svg
              class="icon-inline"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Start Preview
          </button>
          <button v-else class="btn btn-secondary btn-sm" @click="stopPreview">
            <svg class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Stop Preview
          </button>
          <button
            v-if="videoInputDevices.length > 1"
            class="btn btn-outline btn-sm"
            :class="{ active: showMultiCameraGrid }"
            @click="toggleMultiCameraView"
            :disabled="!isPreviewActive"
          >
            {{ showMultiCameraGrid ? 'Single View' : 'Multi-Camera' }}
          </button>
        </div>
      </div>

      <!-- Single Camera Preview -->
      <div v-if="isPreviewActive && !showMultiCameraGrid" class="single-preview">
        <div class="preview-container">
          <video ref="previewVideoEl" class="preview-video" autoplay playsinline muted></video>
          <div class="preview-label">
            {{ currentCameraLabel }}
          </div>
        </div>
        <div v-if="videoInputDevices.length > 1" class="camera-switcher">
          <label>Switch Camera:</label>
          <select v-model="previewCameraId" @change="switchPreviewCamera">
            <option
              v-for="device in videoInputDevices"
              :key="device.deviceId"
              :value="device.deviceId"
            >
              {{ device.label || `Camera ${device.deviceId.slice(0, 8)}` }}
            </option>
          </select>
        </div>
      </div>

      <!-- Multi-Camera Grid -->
      <div v-if="isPreviewActive && showMultiCameraGrid" class="multi-camera-grid">
        <div
          v-for="(stream, deviceId) in cameraStreams"
          :key="deviceId"
          class="camera-tile"
          :class="{ 'is-selected': deviceId === selectedVideoInputId }"
          @click="selectCameraFromGrid(deviceId)"
        >
          <video :ref="(el) => setCameraVideoRef(deviceId, el)" autoplay playsinline muted></video>
          <div class="tile-label">
            {{ getCameraLabel(deviceId) }}
          </div>
          <div v-if="deviceId === selectedVideoInputId" class="selected-badge">
            <svg
              class="icon-inline"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Selected
          </div>
        </div>
      </div>

      <!-- No Cameras Message -->
      <div v-if="videoInputDevices.length === 0" class="no-cameras-message">
        <svg
          class="icon-large"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
        <p>No cameras detected. Please connect a camera or grant camera permissions.</p>
        <button class="btn btn-primary btn-sm" @click="requestCameraPermission">
          Request Permission
        </button>
      </div>

      <!-- Camera Count Info -->
      <div v-if="videoInputDevices.length > 0" class="camera-info">
        <span class="camera-count"
        >{{ videoInputDevices.length }} camera{{
          videoInputDevices.length > 1 ? 's' : ''
        }}
          available</span
        >
      </div>
    </div>

    <!-- Connection Status -->
    <div v-if="!isConnected" class="status-message info">
      {{
        isSimulationMode
          ? 'Enable simulation and run a scenario to test video call features'
          : 'Connect to a SIP server to use video features (use the Basic Call demo to connect)'
      }}
    </div>

    <!-- Video Call Interface -->
    <div v-else class="video-interface">
      <!-- Video Display -->
      <div class="video-display">
        <!-- Remote Video (Main Display) -->
        <div class="remote-video-container">
          <video ref="remoteVideoEl" class="remote-video" autoplay playsinline></video>
          <div v-if="!remoteStream" class="video-placeholder remote">
            <div class="placeholder-content">
              <svg
                class="icon-large"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <span class="text">
                {{
                  callState === 'active' ? 'Waiting for remote video...' : 'No active video call'
                }}
              </span>
            </div>
          </div>
          <div v-if="remoteUri && callState === 'active'" class="video-overlay">
            <span class="remote-name">{{ remoteDisplayName || remoteUri }}</span>
          </div>
        </div>

        <!-- Local Video (Picture-in-Picture) -->
        <div class="local-video-container" v-if="localStream">
          <video ref="localVideoEl" class="local-video" autoplay playsinline muted></video>
          <div class="local-video-label">You</div>
        </div>
      </div>

      <!-- Call Controls -->
      <div class="call-controls">
        <!-- When idle -->
        <div v-if="callState === 'idle'" class="dial-section">
          <input
            v-model="dialNumber"
            type="text"
            placeholder="Enter SIP URI (e.g., sip:user@example.com)"
            @keyup.enter="handleMakeCall"
          />
          <button
            class="btn btn-success"
            :disabled="!dialNumber.trim() || !isRegistered"
            @click="handleMakeCall"
          >
            <svg
              class="icon-inline"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Start Video Call
          </button>
        </div>

        <!-- When in call -->
        <div v-else class="active-call-controls">
          <div class="call-status">
            <span class="status-dot"></span>
            <span class="status-text">{{ callStateDisplay }}</span>
            <span v-if="duration && callState === 'active'" class="duration">
              {{ formatDuration(duration) }}
            </span>
          </div>

          <div class="control-buttons">
            <button v-if="callState === 'ringing'" class="btn btn-success" @click="handleAnswer">
              <svg
                class="icon-inline"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Answer
            </button>

            <button
              class="btn btn-control"
              :class="{ active: !isMuted }"
              :title="isMuted ? 'Unmute' : 'Mute'"
              @click="handleToggleMute"
            >
              <svg
                v-if="isMuted"
                class="icon-inline"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <svg
                v-else
                class="icon-inline"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {{ isMuted ? 'Unmute' : 'Mute' }}
            </button>

            <button
              class="btn btn-control"
              :class="{ active: hasLocalVideoFromSession }"
              :title="hasLocalVideoFromSession ? 'Stop Video' : 'Start Video'"
              @click="handleToggleVideo"
            >
              <svg
                v-if="hasLocalVideoFromSession"
                class="icon-inline"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              <svg
                v-else
                class="icon-inline"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path
                  d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"
                />
              </svg>
              {{ hasLocalVideoFromSession ? 'Video On' : 'Video Off' }}
            </button>

            <button class="btn btn-danger" @click="handleHangup">
              <svg class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
                />
              </svg>
              End Call
            </button>
          </div>
        </div>
      </div>

      <!-- Camera Selection -->
      <div v-if="videoInputDevices.length > 0" class="device-selection">
        <h4>Camera Settings</h4>
        <div class="device-selector">
          <label for="camera-select">Select Camera:</label>
          <select id="camera-select" v-model="selectedVideoInputId" @change="handleCameraChange">
            <option
              v-for="device in videoInputDevices"
              :key="device.deviceId"
              :value="device.deviceId"
            >
              {{ device.label || `Camera ${device.deviceId.slice(0, 8)}` }}
            </option>
          </select>
        </div>
      </div>

      <!-- Video Statistics (Debug Info) -->
      <div v-if="callState === 'active' && session" class="video-stats">
        <h4>Video Information</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Local Video:</span>
            <span class="stat-value">{{ hasLocalVideoFromSession ? 'Enabled' : 'Disabled' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Remote Video:</span>
            <span class="stat-value">{{ remoteStream ? 'Receiving' : 'Not receiving' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Audio:</span>
            <span class="stat-value">{{ isMuted ? 'Muted' : 'Active' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useSipClient, useCallSession, useMediaDevices } from 'vuesip'

const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const {
  makeCall,
  answer,
  hangup,
  toggleVideo,
  localStream,
  remoteStream,
  hasLocalVideo: hasLocalVideoFromSession
} = useCallSession(sipClientRef)

const {
  videoInputDevices,
  selectedVideoInputId,
  selectVideoInput,
  enumerateDevices
} = useMediaDevices()

// Make a video call
await makeCall('sip:friend@example.com', {
  audio: true,
  video: true // Enable video
})

// Answer with video
await answer({
  audio: true,
  video: true
})

// Toggle video during call
toggleVideo() // Enable/disable video track

// Change camera
selectVideoInput(deviceId)

// Display video streams
const remoteVideoEl = ref&lt;HTMLVideoElement&gt;()
const localVideoEl = ref&lt;HTMLVideoElement&gt;()

watch(remoteStream, (stream) => {
  if (remoteVideoEl.value && stream) {
    remoteVideoEl.value.srcObject = stream
  }
})

watch(localStream, (stream) => {
  if (localVideoEl.value && stream) {
    localVideoEl.value.srcObject = stream
  }
})
</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSipClient, useCallSession, useMediaDevices } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Client
const { isConnected: realIsConnected, isRegistered: realIsRegistered, getClient } = useSipClient()

// Call Session
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  remoteUri: realRemoteUri,
  remoteDisplayName: realRemoteDisplayName,
  isMuted: realIsMuted,
  duration: realDuration,
  localStream,
  remoteStream,
  session,
  makeCall,
  answer: realAnswer,
  hangup: realHangup,
  // Note: hangup and answer are aliased to avoid conflicts with simulation methods
  mute,
  unmute,
  toggleVideo,
  hasLocalVideo: hasLocalVideoFromSession,
} = useCallSession(sipClientRef)

// Effective values - use simulation or real data based on mode
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)

const isRegistered = computed(() =>
  isSimulationMode.value ? simulation.isRegistered.value : realIsRegistered.value
)

const callState = computed(() =>
  isSimulationMode.value ? simulation.state.value : realCallState.value
)

const remoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : realRemoteUri.value
)

const remoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : realRemoteDisplayName.value
)

const isMuted = computed(() =>
  isSimulationMode.value ? simulation.isMuted.value : realIsMuted.value
)

const duration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : realDuration.value
)

// Media Devices
const { videoInputDevices, selectedVideoInputId, selectVideoInput, enumerateDevices } =
  useMediaDevices()

// State
const dialNumber = ref('')
const remoteVideoEl = ref<HTMLVideoElement>()
const localVideoEl = ref<HTMLVideoElement>()

// Camera Preview State
const isPreviewActive = ref(false)
const showMultiCameraGrid = ref(false)
const previewVideoEl = ref<HTMLVideoElement>()
const previewStream = ref<MediaStream | null>(null)
const previewCameraId = ref('')
const cameraStreams = ref<Record<string, MediaStream>>({})
const cameraVideoRefs = ref<Record<string, HTMLVideoElement | null>>({})

// Computed
const callStateDisplay = computed(() => {
  const states: Record<string, string> = {
    idle: 'Idle',
    calling: 'Calling...',
    incoming: 'Incoming Call',
    ringing: 'Ringing...',
    active: 'In Call',
    ended: 'Call Ended',
  }
  return states[callState.value] || callState.value
})

const _hasLocalVideoDisplay = computed(() => {
  if (!localStream.value) return false
  const videoTracks = localStream.value.getVideoTracks()
  return videoTracks.length > 0 && videoTracks[0].enabled
})

// Camera Preview Computed
const currentCameraLabel = computed(() => {
  const device = videoInputDevices.value.find((d) => d.deviceId === previewCameraId.value)
  return device?.label || `Camera ${previewCameraId.value.slice(0, 8)}`
})

// Camera Preview Methods
const getCameraLabel = (deviceId: string): string => {
  const device = videoInputDevices.value.find((d) => d.deviceId === deviceId)
  return device?.label || `Camera ${deviceId.slice(0, 8)}`
}

const setCameraVideoRef = (deviceId: string, el: HTMLVideoElement | null) => {
  if (el) {
    cameraVideoRefs.value[deviceId] = el
    // Attach stream if available
    const stream = cameraStreams.value[deviceId]
    if (stream) {
      el.srcObject = stream
    }
  }
}

const startPreview = async () => {
  try {
    // Use selected camera or first available
    const cameraId = previewCameraId.value || videoInputDevices.value[0]?.deviceId
    if (!cameraId) return

    previewCameraId.value = cameraId
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: cameraId } },
      audio: false,
    })

    previewStream.value = stream
    isPreviewActive.value = true

    // Attach to video element after next tick
    setTimeout(() => {
      if (previewVideoEl.value && previewStream.value) {
        previewVideoEl.value.srcObject = previewStream.value
      }
    }, 0)
  } catch (error) {
    console.error('Failed to start preview:', error)
    alert('Failed to access camera. Please check permissions.')
  }
}

const stopPreview = () => {
  // Stop single preview stream
  if (previewStream.value) {
    previewStream.value.getTracks().forEach((track) => track.stop())
    previewStream.value = null
  }

  // Stop all multi-camera streams
  Object.values(cameraStreams.value).forEach((stream) => {
    stream.getTracks().forEach((track) => track.stop())
  })
  cameraStreams.value = {}
  cameraVideoRefs.value = {}

  isPreviewActive.value = false
  showMultiCameraGrid.value = false
}

const switchPreviewCamera = async () => {
  if (!previewCameraId.value) return

  // Stop current stream
  if (previewStream.value) {
    previewStream.value.getTracks().forEach((track) => track.stop())
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: previewCameraId.value } },
      audio: false,
    })

    previewStream.value = stream

    if (previewVideoEl.value) {
      previewVideoEl.value.srcObject = stream
    }
  } catch (error) {
    console.error('Failed to switch camera:', error)
  }
}

const toggleMultiCameraView = async () => {
  if (showMultiCameraGrid.value) {
    // Switch to single view
    showMultiCameraGrid.value = false

    // Stop multi-camera streams
    Object.values(cameraStreams.value).forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop())
    })
    cameraStreams.value = {}
    cameraVideoRefs.value = {}

    // Restart single preview
    await startPreview()
  } else {
    // Switch to multi-camera view
    showMultiCameraGrid.value = true

    // Stop single preview
    if (previewStream.value) {
      previewStream.value.getTracks().forEach((track) => track.stop())
      previewStream.value = null
    }

    // Start all cameras
    for (const device of videoInputDevices.value) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: device.deviceId } },
          audio: false,
        })
        cameraStreams.value[device.deviceId] = stream

        // Attach to video element if already rendered
        const videoEl = cameraVideoRefs.value[device.deviceId]
        if (videoEl) {
          videoEl.srcObject = stream
        }
      } catch (error) {
        console.error(`Failed to access camera ${device.deviceId}:`, error)
      }
    }
  }
}

const selectCameraFromGrid = (deviceId: string) => {
  selectVideoInput(deviceId)
  previewCameraId.value = deviceId
}

const requestCameraPermission = async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    await enumerateDevices()
  } catch (error) {
    console.error('Permission denied:', error)
    alert('Camera permission denied. Please enable camera access in your browser settings.')
  }
}

// Methods
const handleMakeCall = async () => {
  if (!dialNumber.value.trim()) return

  if (isSimulationMode.value) {
    simulation.makeCall(dialNumber.value)
    console.log('[Simulation] Video call started to:', dialNumber.value)
    return
  }

  try {
    await makeCall(dialNumber.value, {
      audio: true,
      video: true,
    })
  } catch (error) {
    console.error('Make call error:', error)
    alert(`Failed to make call: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const handleAnswer = async () => {
  if (isSimulationMode.value) {
    simulation.answer()
    console.log('[Simulation] Answered video call')
    return
  }

  try {
    await realAnswer({
      audio: true,
      video: true,
    })
  } catch (error) {
    console.error('Answer error:', error)
    alert(`Failed to answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const handleHangup = async () => {
  if (isSimulationMode.value) {
    simulation.hangup()
    console.log('[Simulation] Video call ended')
    return
  }

  try {
    await realHangup()
  } catch (error) {
    console.error('Hangup error:', error)
  }
}

const handleToggleMute = async () => {
  if (isSimulationMode.value) {
    simulation.toggleMute()
    console.log('[Simulation] Toggled mute')
    return
  }

  try {
    if (isMuted.value) {
      await unmute()
    } else {
      await mute()
    }
  } catch (error) {
    console.error('Toggle mute error:', error)
  }
}

const handleToggleVideo = () => {
  if (isSimulationMode.value) {
    console.log('[Simulation] Toggled video')
    return
  }

  try {
    toggleVideo()
  } catch (error) {
    console.error('Toggle video error:', error)
    alert(`Failed to toggle video: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const handleCameraChange = () => {
  if (selectedVideoInputId.value) {
    selectVideoInput(selectedVideoInputId.value)
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Watch for stream changes and update video elements
watch(remoteStream, (stream) => {
  if (remoteVideoEl.value) {
    remoteVideoEl.value.srcObject = stream
  }
})

watch(localStream, (stream) => {
  if (localVideoEl.value) {
    localVideoEl.value.srcObject = stream
  }
})

// Request permissions and enumerate devices on mount
onMounted(async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    await enumerateDevices()
  } catch (error) {
    console.warn('Could not get media permissions:', error)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  stopPreview()
})
</script>

<style scoped>
.video-call-demo {
  max-width: 900px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0 0 1rem 0;
  color: #666;
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: 1rem;
  background: #eff6ff;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Camera Preview Section */
.camera-preview-section {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.125rem;
}

.preview-controls {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-outline {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-outline:hover:not(:disabled) {
  background: #eff6ff;
}

.btn-outline.active {
  background: #667eea;
  color: white;
}

.single-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  max-width: 640px;
  margin: 0 auto;
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror effect */
}

.preview-label {
  position: absolute;
  bottom: 0.75rem;
  left: 0.75rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.camera-switcher {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.camera-switcher label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.camera-switcher select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 200px;
}

.camera-switcher select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.multi-camera-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  max-width: 100%;
}

.camera-tile {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.camera-tile:hover {
  border-color: #667eea;
}

.camera-tile.is-selected {
  border-color: #10b981;
}

.camera-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror effect */
}

.tile-label {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.selected-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: #10b981;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.no-cameras-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: #6b7280;
}

.icon-large {
  width: 48px;
  height: 48px;
  opacity: 0.5;
  color: var(--text-secondary, currentColor);
}

.icon-inline {
  width: 16px;
  height: 16px;
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
}

.no-cameras-message p {
  margin: 0;
  max-width: 300px;
}

.camera-info {
  margin-top: 1rem;
  text-align: center;
}

.camera-count {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
}

.status-message.info {
  background: #eff6ff;
  color: #1e40af;
}

.video-interface {
  padding: 1.5rem;
}

.video-display {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  aspect-ratio: 16 / 9;
}

.remote-video-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #9ca3af;
}

.placeholder-content .icon-large {
  width: 64px;
  height: 64px;
  opacity: 0.5;
}

.placeholder-content .text {
  font-size: 1rem;
}

.video-overlay {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.local-video-container {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 200px;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror effect */
}

.local-video-label {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.call-controls {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.dial-section {
  display: flex;
  gap: 0.75rem;
}

.dial-section input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.dial-section input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.active-call-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.call-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.duration {
  font-family: monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: #667eea;
}

.control-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-control {
  background: #6b7280;
  color: white;
  min-width: 60px;
}

.btn-control:hover:not(:disabled) {
  background: #4b5563;
}

.btn-control.active {
  background: #667eea;
}

.btn-control.active:hover:not(:disabled) {
  background: #5568d3;
}

.device-selection {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.device-selection h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.device-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.device-selector label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

.device-selector select {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.device-selector select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.video-stats {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.video-stats h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 0.875rem;
  color: #333;
  font-weight: 600;
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.code-example pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .local-video-container {
    width: 120px;
  }

  .control-buttons {
    flex-wrap: wrap;
  }

  .device-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .preview-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .preview-controls {
    flex-wrap: wrap;
    width: 100%;
  }

  .preview-controls .btn {
    flex: 1;
    min-width: 120px;
  }

  .preview-container {
    max-width: 100%;
  }

  .camera-switcher {
    flex-direction: column;
    gap: 0.5rem;
  }

  .camera-switcher select {
    width: 100%;
    min-width: auto;
  }

  .multi-camera-grid {
    grid-template-columns: 1fr;
  }
}
</style>
