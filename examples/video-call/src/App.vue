<template>
  <div class="app">
    <!-- Skip Navigation Links -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#video-controls" class="skip-link">Skip to video controls</a>

    <!-- Header -->
    <header class="header" role="banner">
      <div class="container">
        <h1>
          <span class="logo" aria-hidden="true">📹</span>
          VueSip Video Call Example
        </h1>
        <div
          class="status-indicator"
          :class="{ connected: isConnected, registered: isRegistered }"
          role="status"
          aria-live="polite"
        >
          <span class="dot" aria-hidden="true"></span>
          <span class="sr-only">Connection status: </span>
          {{ connectionStatus }}
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main id="main-content" class="main" role="main">
      <div class="container">
        <!-- Connection Panel - Show when not connected -->
        <ConnectionPanel
          v-if="!isRegistered"
          :is-connecting="isConnecting"
          :error="connectionError"
          @connect="handleConnect"
        />

        <!-- Video Call Interface - Show when connected -->
        <div v-else class="video-interface">
          <!-- Video Display Area -->
          <div class="video-display" role="region" aria-label="Video call display area">
            <!-- Remote Video (main view) -->
            <RemoteVideo
              :stream="remoteStream"
              :is-active="isCallActive"
              :remote-display-name="remoteDisplayName"
            />

            <!-- Local Video Preview (picture-in-picture) -->
            <VideoPreview
              :stream="localStream"
              :video-devices="videoInputDevices"
              :selected-device-id="selectedVideoInputId"
              :has-local-video="hasLocalVideo"
              @select-camera="handleCameraSelect"
            />
          </div>

          <!-- Call Information -->
          <div class="call-info" v-if="isCallActive" role="status" aria-live="polite">
            <div class="call-info-item">
              <span class="label">Status:</span>
              <span class="value">{{ callState }}</span>
            </div>
            <div class="call-info-item" v-if="duration > 0">
              <span class="label">Duration:</span>
              <span class="value">{{ formatDuration(duration) }}</span>
            </div>
            <div class="call-info-item" v-if="remoteUri">
              <span class="label">Connected to:</span>
              <span class="value">{{ remoteUri }}</span>
            </div>
          </div>

          <!-- Call Controls -->
          <div id="video-controls">
            <VideoCallControls
              :is-call-active="isCallActive"
              :call-state="callState"
              :is-muted="isMuted"
              :has-local-video="hasLocalVideo"
              :is-on-hold="isOnHold"
              @make-call="handleMakeCall"
              @answer="handleAnswer"
              @reject="handleReject"
              @hangup="handleHangup"
              @toggle-mute="handleToggleMute"
              @toggle-video="handleToggleVideo"
              @toggle-hold="handleToggleHold"
            />
          </div>
        </div>

        <!-- ARIA Live Regions for Screen Reader Announcements -->
        <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
          {{ statusAnnouncement }}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true" class="sr-only">
          {{ errorAnnouncement }}
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
      <div class="container">
        <p>Built with VueSip - A headless Vue.js SIP/VoIP library</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSipClient, useCallSession, useMediaDevices } from 'vuesip'
import { EventBus } from 'vuesip'
import { MediaManager } from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import VideoPreview from './components/VideoPreview.vue'
import RemoteVideo from './components/RemoteVideo.vue'
import VideoCallControls from './components/VideoCallControls.vue'

// ============================================================================
// Event Bus and Media Manager Setup
// ============================================================================

const eventBus = new EventBus()
const mediaManager = ref(new MediaManager({ eventBus }))

// ============================================================================
// SIP Client Setup
// ============================================================================

const {
  isConnected,
  isRegistered,
  isConnecting,
  error: sipError,
  connect,
  updateConfig,
  getClient,
  getEventBus,
} = useSipClient(undefined, {
  eventBus,
  autoConnect: false,
  autoCleanup: true,
})

// ============================================================================
// Call Session Setup
// ============================================================================

// Get SIP client ref for useCallSession
const sipClientRef = computed(() => getClient())

const {
  session,
  state: callState,
  remoteUri,
  remoteDisplayName,
  isActive: isCallActive,
  isMuted,
  isOnHold,
  hasLocalVideo,
  hasRemoteVideo,
  localStream,
  remoteStream,
  duration,
  makeCall,
  answer,
  reject,
  hangup,
  toggleMute,
  toggleHold,
} = useCallSession(sipClientRef, mediaManager)

// ============================================================================
// Media Devices Setup
// ============================================================================

const {
  videoInputDevices,
  selectedVideoInputId,
  hasVideoPermission,
  requestPermissions,
  enumerateDevices,
  selectVideoInput,
} = useMediaDevices(mediaManager, {
  autoEnumerate: true,
  autoMonitor: true,
})

// ============================================================================
// Local State
// ============================================================================

const connectionError = ref<string | null>(null)
const statusAnnouncement = ref<string>('')
const errorAnnouncement = ref<string>('')

// ============================================================================
// Computed Properties
// ============================================================================

const connectionStatus = computed(() => {
  if (isRegistered.value) return 'Registered'
  if (isConnected.value) return 'Connected'
  if (isConnecting.value) return 'Connecting...'
  return 'Disconnected'
})

// ============================================================================
// Connection Handlers
// ============================================================================

/**
 * Handle SIP connection
 */
async function handleConnect(config: {
  sipUri: string
  sipPassword: string
  wsServer: string
  displayName?: string
}) {
  try {
    connectionError.value = null

    // Update SIP client configuration
    updateConfig({
      sipUri: config.sipUri,
      sipPassword: config.sipPassword,
      wsServer: config.wsServer,
      displayName: config.displayName || config.sipUri.split('@')[0],
      register: true,
      // Enable video support
      mediaConstraints: {
        audio: true,
        video: true,
      },
    })

    // Request media permissions before connecting
    await requestPermissions(true, true)
    await enumerateDevices()

    // Connect to SIP server
    await connect()
  } catch (error) {
    console.error('Connection failed:', error)
    connectionError.value = error instanceof Error ? error.message : 'Connection failed'
  }
}

// ============================================================================
// Call Handlers
// ============================================================================

/**
 * Make a video call
 */
async function handleMakeCall(targetUri: string) {
  try {
    connectionError.value = null

    // Ensure we have video permissions
    if (!hasVideoPermission.value) {
      await requestPermissions(true, true)
    }

    // Make call with video enabled
    await makeCall(targetUri, {
      audio: true,
      video: true,
    })
  } catch (error) {
    console.error('Failed to make call:', error)
    connectionError.value = error instanceof Error ? error.message : 'Failed to make call'
  }
}

/**
 * Answer incoming call
 */
async function handleAnswer() {
  try {
    connectionError.value = null

    // Ensure we have video permissions
    if (!hasVideoPermission.value) {
      await requestPermissions(true, true)
    }

    // Answer with video enabled
    await answer({
      audio: true,
      video: true,
    })
  } catch (error) {
    console.error('Failed to answer call:', error)
    connectionError.value = error instanceof Error ? error.message : 'Failed to answer call'
  }
}

/**
 * Reject incoming call
 */
async function handleReject() {
  try {
    await reject()
  } catch (error) {
    console.error('Failed to reject call:', error)
    connectionError.value = error instanceof Error ? error.message : 'Failed to reject call'
  }
}

/**
 * Hangup call
 */
async function handleHangup() {
  try {
    await hangup()
  } catch (error) {
    console.error('Failed to hangup:', error)
    connectionError.value = error instanceof Error ? error.message : 'Failed to hangup'
  }
}

/**
 * Toggle audio mute
 */
function handleToggleMute() {
  toggleMute()
  // Announce state change
  statusAnnouncement.value = isMuted.value ? 'Microphone unmuted' : 'Microphone muted'
}

/**
 * Toggle video on/off
 */
async function handleToggleVideo() {
  if (!localStream.value) return

  try {
    const videoTracks = localStream.value.getVideoTracks()
    if (videoTracks.length === 0) {
      console.warn('No video tracks available to toggle')
      return
    }

    // Toggle video tracks
    const newState = !videoTracks[0].enabled
    videoTracks.forEach((track) => {
      track.enabled = newState
    })

    // Announce state change
    statusAnnouncement.value = newState ? 'Camera turned on' : 'Camera turned off'
  } catch (error) {
    console.error('Failed to toggle video:', error)
    connectionError.value = error instanceof Error ? error.message : 'Failed to toggle video'
    errorAnnouncement.value = 'Failed to toggle camera'
  }
}

/**
 * Toggle hold state
 */
async function handleToggleHold() {
  try {
    await toggleHold()
  } catch (error) {
    console.error('Failed to toggle hold:', error)
  }
}

/**
 * Handle camera selection
 */
async function handleCameraSelect(deviceId: string) {
  try {
    // Update selected device
    selectVideoInput(deviceId)

    // If in a call, we need to restart the video with the new camera
    if (session.value && localStream.value) {
      try {
        // Get new video stream with selected camera
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: deviceId } },
        })

        const newVideoTrack = newStream.getVideoTracks()[0]
        if (!newVideoTrack) {
          throw new Error('No video track in new stream')
        }

        // Get the old video track
        const oldVideoTrack = localStream.value.getVideoTracks()[0]

        // Replace the track in the peer connection via the session
        // Note: This requires CallSession to expose a method to replace tracks
        // For now, we'll just update the stream reference
        if (oldVideoTrack) {
          oldVideoTrack.stop()
          localStream.value.removeTrack(oldVideoTrack)
        }
        localStream.value.addTrack(newVideoTrack)

        console.log('Camera switched to:', deviceId)
        // Announce camera change
        const device = videoInputDevices.value.find(d => d.deviceId === deviceId)
        statusAnnouncement.value = `Camera switched to ${device?.label || 'selected camera'}`
      } catch (error) {
        console.error('Failed to switch camera during call:', error)
        connectionError.value = error instanceof Error ? error.message : 'Failed to switch camera'
        errorAnnouncement.value = 'Failed to switch camera'
      }
    }
  } catch (error) {
    console.error('Failed to select camera:', error)
    connectionError.value = error instanceof Error ? error.message : 'Failed to select camera'
    errorAnnouncement.value = 'Failed to select camera'
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format call duration
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// ============================================================================
// Event Listeners
// ============================================================================

// Listen for incoming calls
eventBus.on('call:incoming', (data: { remoteUri: string; remoteDisplayName?: string }) => {
  console.log('Incoming call from:', data.remoteUri)
  // Announce incoming call to screen readers
  statusAnnouncement.value = `Incoming video call from ${data.remoteDisplayName || data.remoteUri}`
  // The UI will show the answer button automatically when callState changes
})

// Watch for SIP errors
watch(sipError, (error) => {
  if (error) {
    connectionError.value = error.message
    errorAnnouncement.value = `Connection error: ${error.message}`
  }
})

// Watch for call state changes
watch(callState, (newState, oldState) => {
  if (newState !== oldState) {
    const stateMessages: Record<string, string> = {
      'ringing': 'Call is ringing',
      'active': 'Call connected',
      'ended': 'Call ended',
      'failed': 'Call failed',
    }
    if (stateMessages[newState]) {
      statusAnnouncement.value = stateMessages[newState]
    }
  }
})

// ============================================================================
// Lifecycle Hooks
// ============================================================================

// Clean up media streams on unmount
onUnmounted(() => {
  if (localStream.value) {
    localStream.value.getTracks().forEach((track) => {
      track.stop()
    })
  }
})
</script>

<style scoped>
/* ============================================================================
   Layout
   ============================================================================ */

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  width: 100%;
}

/* ============================================================================
   Header
   ============================================================================ */

.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px 0;
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo {
  font-size: 32px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: #f5f5f5;
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.status-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
}

.status-indicator.connected .dot {
  background: #fbbf24;
}

.status-indicator.registered .dot {
  background: #10b981;
  animation: pulse 2s ease-in-out infinite;
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

/* ============================================================================
   Main Content
   ============================================================================ */

.main {
  flex: 1;
  padding: 40px 0;
}

/* ============================================================================
   Video Interface
   ============================================================================ */

.video-interface {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.video-display {
  position: relative;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  aspect-ratio: 16 / 9;
  min-height: 480px;
}

/* ============================================================================
   Call Information
   ============================================================================ */

.call-info {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.call-info-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.call-info-item .label {
  font-weight: 600;
  color: #666;
}

.call-info-item .value {
  color: #333;
  font-weight: 500;
}

/* ============================================================================
   Footer
   ============================================================================ */

.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 20px 0;
  margin-top: auto;
}

.footer p {
  text-align: center;
  color: #666;
  font-size: 14px;
}

/* ============================================================================
   Responsive Design
   ============================================================================ */

@media (max-width: 768px) {
  .header h1 {
    font-size: 18px;
  }

  .logo {
    font-size: 24px;
  }

  .status-indicator {
    font-size: 12px;
    padding: 6px 12px;
  }

  .video-display {
    min-height: 300px;
  }

  .call-info {
    flex-direction: column;
    gap: 15px;
  }
}

/* ============================================================================
   Accessibility
   ============================================================================ */

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Skip navigation links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #667eea;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  font-weight: 600;
  z-index: 100;
  border-radius: 0 0 4px 0;
}

.skip-link:focus {
  top: 0;
}

/* Focus visible styles for keyboard navigation */
:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}
</style>
