<template>
  <div class="screen-sharing-demo">
    <h2>Screen Sharing</h2>
    <p class="description">
      Share your screen, application windows, or browser tabs during video calls.
    </p>

    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
      :duration="simulation.duration.value"
      :remote-uri="simulation.remoteUri.value"
      :remote-display-name="simulation.remoteDisplayName.value"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="simulation.isMuted.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Connection Status -->
    <!-- Design Decision: Using Badge component for connection status provides semantic meaning
         and consistent styling. Tag component for sharing status indicator. -->
    <div class="status-section">
      <Badge
        :value="connectionState.toUpperCase()"
        :severity="
          connectionState === 'connected'
            ? 'success'
            : connectionState === 'connecting'
              ? 'warning'
              : 'secondary'
        "
      />
      <Tag v-if="isSharingScreen" severity="danger" value="Screen Sharing Active" />
      <Message v-if="!isConnected" severity="info" :closable="false" class="connection-hint">
        Configure SIP credentials in <strong>Settings</strong> or <strong>Basic Call</strong> demo
      </Message>
    </div>

    <!-- Call Control -->
    <!-- Design Decision: Card component structures the call control section for better visual hierarchy.
         InputText provides built-in validation states and theme support. -->
    <Card v-if="isConnected" class="call-section">
      <template #title>Video Call</template>
      <template #content>
        <div class="form-group">
          <label for="target-uri">Target SIP URI</label>
          <InputText
            id="target-uri"
            v-model="targetUri"
            placeholder="sip:target@example.com"
            @keyup.enter="makeVideoCall"
            class="w-full"
            aria-required="true"
          />
        </div>
        <Button
          label="Make Video Call"
          @click="makeVideoCall"
          :disabled="hasActiveCall"
          icon="pi pi-video"
        />
      </template>
    </Card>

    <!-- Active Call with Screen Sharing -->
    <!-- Design Decision: Panel component provides collapsible sections for better organization.
         Card component for call info provides clear visual separation. -->
    <Panel v-if="effectiveHasActiveCall" class="active-call-section" toggleable>
      <template #header>
        <span class="font-bold">Active Video Call</span>
      </template>

      <Card class="call-info">
        <template #content>
          <div class="info-item">
            <span class="label">Remote URI:</span>
            <span class="value">{{ currentCall?.remoteUri || 'Unknown' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Call Duration:</span>
            <span class="value">{{ callDuration }}</span>
          </div>
          <div class="info-item">
            <span class="label">Video Status:</span>
            <span class="value">{{ hasLocalVideo ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </template>
      </Card>

      <!-- Video Display -->
      <div class="video-container">
        <div class="video-wrapper">
          <video
            ref="remoteVideo"
            autoplay
            playsinline
            class="remote-video"
            :class="{ 'screen-share': isSharingScreen }"
          ></video>
          <div class="video-label remote">Remote</div>
        </div>

        <div class="video-wrapper local">
          <video ref="localVideo" autoplay playsinline muted class="local-video"></video>
          <div class="video-label local">You</div>
        </div>
      </div>

      <!-- Screen Sharing Controls -->
      <!-- Design Decision: Card component structures sharing controls. Button components with icons
           provide clear visual hierarchy. Checkbox components for boolean options with proper labels. -->
      <Card class="screen-share-controls">
        <template #title>Screen Sharing</template>
        <template #content>
          <div v-if="!isSharingScreen" class="share-options">
            <p class="info-text mb-3">Choose what to share with the other participant:</p>

            <div class="share-buttons">
              <Button
                label="Share Entire Screen"
                icon="pi pi-desktop"
                @click="shareScreen('screen')"
                class="share-btn"
                severity="secondary"
              />
              <Button
                label="Share Window"
                icon="pi pi-window-maximize"
                @click="shareScreen('window')"
                class="share-btn"
                severity="secondary"
              />
              <Button
                label="Share Browser Tab"
                icon="pi pi-browser"
                @click="shareScreen('tab')"
                class="share-btn"
                severity="secondary"
              />
            </div>

            <div class="share-settings mt-4">
              <h5>Options</h5>
              <div class="flex align-items-center gap-2 mb-2">
                <Checkbox v-model="shareAudio" inputId="share-audio" :binary="true" />
                <label for="share-audio" class="mb-0">Share system audio</label>
              </div>
              <div class="flex align-items-center gap-2">
                <Checkbox v-model="highQuality" inputId="high-quality" :binary="true" />
                <label for="high-quality" class="mb-0">High quality (higher bandwidth)</label>
              </div>
            </div>
          </div>

          <div v-else class="sharing-active">
            <!-- Design Decision: Message component with danger severity provides clear visual
                 feedback for active sharing state. Badge components for stats provide semantic meaning. -->
            <Message severity="danger" :closable="false" class="sharing-info">
              <div class="sharing-text">
                <div class="primary">You are sharing your {{ sharingType }}</div>
                <div class="secondary">{{ sharingDuration }}</div>
              </div>
            </Message>

            <div class="sharing-stats">
              <div class="stat">
                <span class="stat-label">Resolution:</span>
                <Badge :value="shareResolution" severity="info" />
              </div>
              <div class="stat">
                <span class="stat-label">Frame Rate:</span>
                <Badge :value="`${shareFrameRate} fps`" severity="info" />
              </div>
              <div class="stat">
                <span class="stat-label">Bandwidth:</span>
                <Badge :value="`${shareBandwidth} kbps`" severity="info" />
              </div>
            </div>

            <Button
              label="Stop Sharing"
              @click="stopScreenShare"
              severity="danger"
              icon="pi pi-stop"
              class="w-full mt-3"
            />
          </div>
        </template>
      </Card>

      <!-- Quick Actions -->
      <!-- Design Decision: Card component structures quick actions. Button components with
           dynamic severity based on state provide clear visual feedback (active = primary, inactive = secondary). -->
      <Card class="quick-actions">
        <template #title>Quick Actions</template>
        <template #content>
          <div class="button-grid">
            <Button
              :label="hasLocalVideo ? 'Camera On' : 'Camera Off'"
              :icon="hasLocalVideo ? 'pi pi-video' : 'pi pi-video-slash'"
              @click="toggleCamera"
              :severity="hasLocalVideo ? 'success' : 'secondary'"
              class="action-btn"
            />
            <Button
              :label="isMuted ? 'Muted' : 'Mic'"
              :icon="isMuted ? 'pi pi-microphone-slash' : 'pi pi-microphone'"
              @click="toggleMicrophone"
              :severity="isMuted ? 'secondary' : 'success'"
              class="action-btn"
            />
            <Button
              label="Switch Camera"
              icon="pi pi-refresh"
              @click="switchCamera"
              :disabled="!hasLocalVideo"
              severity="secondary"
              class="action-btn"
            />
            <Button
              label="Screenshot"
              icon="pi pi-camera"
              @click="takeScreenshot"
              :disabled="!isSharingScreen"
              severity="secondary"
              class="action-btn"
            />
          </div>
        </template>
      </Card>

      <!-- Sharing History -->
      <div v-if="sharingHistory.length > 0" class="sharing-history">
        <h4>Sharing History</h4>
        <div class="history-list">
          <div v-for="(entry, index) in sharingHistory" :key="index" class="history-item">
            <div :class="['history-icon', getShareTypeClass(entry.type)]"></div>
            <div class="history-info">
              <div class="history-type">{{ entry.type }}</div>
              <div class="history-duration">Duration: {{ entry.duration }}</div>
            </div>
            <div class="history-timestamp">{{ entry.timestamp }}</div>
          </div>
        </div>
      </div>

      <!-- Call Controls -->
      <!-- Design Decision: Button components with appropriate severity (success for answer,
           danger for hangup) provide clear visual hierarchy and semantic meaning. -->
      <div class="button-group">
        <Button
          v-if="callState === 'incoming'"
          label="Answer"
          @click="answer"
          icon="pi pi-phone"
          severity="success"
        />
        <Button label="Hang Up" @click="hangup" icon="pi pi-times" severity="danger" />
      </div>
    </Panel>

    <!-- Browser Compatibility -->
    <!-- Design Decision: Card component structures compatibility info. Badge components for
         feature support status provide semantic meaning. Message component for warnings. -->
    <Card class="compatibility-section">
      <template #title>Browser Compatibility</template>
      <template #content>
        <div class="compat-grid">
          <div class="compat-item">
            <Badge
              :value="supportsScreenShare ? 'Supported' : 'Not Supported'"
              :severity="supportsScreenShare ? 'success' : 'danger'"
            />
            <span class="compat-label">Screen Sharing</span>
          </div>
          <div class="compat-item">
            <Badge
              :value="supportsAudioShare ? 'Supported' : 'Not Supported'"
              :severity="supportsAudioShare ? 'success' : 'danger'"
            />
            <span class="compat-label">Audio Sharing</span>
          </div>
        </div>
        <Message
          v-if="!supportsScreenShare"
          severity="warn"
          :closable="false"
          class="compat-warning"
        >
          Screen sharing is not supported in your browser. Please use a modern browser like Chrome,
          Firefox, or Edge.
        </Message>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
/**
 * Screen Sharing Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button components for all actions to ensure consistent styling and accessibility
 * - InputText for text inputs provides built-in validation states and theme support
 * - Checkbox component for boolean options with proper ARIA labels
 * - Card/Panel components structure content sections for better visual hierarchy
 * - Badge/Tag components for status indicators provide semantic meaning
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 * - Message component for warnings/errors provides consistent feedback styling
 */
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useCallSession } from '../../src/composables/useCallSession'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, Checkbox, Card, Panel, Badge, Tag, Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Configuration
const sipServerUri = ref('sip:example.com')
const username = ref('')
const password = ref('')
const targetUri = ref('sip:1000@example.com')

// SIP Client - use shared playground instance
const {
  connectionState: realConnectionState,
  isConnected: realIsConnected,
  isConnecting: _isConnecting,
  connect,
  disconnect,
  getClient,
} = playgroundSipClient

// Effective values - use simulation or real data based on mode
const connectionState = computed(() =>
  isSimulationMode.value
    ? simulation.isConnected.value
      ? 'connected'
      : 'disconnected'
    : realConnectionState.value
)
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)
const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : callState.value
)
const effectiveHasActiveCall = computed(() =>
  isSimulationMode.value ? simulation.state.value === 'active' : hasActiveCall.value
)

// Call Management - useCallSession requires a Ref
const sipClientRef = computed(() => getClient())
const {
  makeCall: makeCallFn,
  answer,
  hangup,
  mute,
  unmute,
  session: currentCall,
  state: callState,
  isActive: hasActiveCall,
  isMuted,
} = useCallSession(sipClientRef)

// Video Elements
const localVideo = ref<HTMLVideoElement | null>(null)
const remoteVideo = ref<HTMLVideoElement | null>(null)

// Screen Sharing State
const isSharingScreen = ref(false)
const sharingType = ref<'screen' | 'window' | 'tab'>('screen')
const shareAudio = ref(false)
const highQuality = ref(false)
const screenStream = ref<MediaStream | null>(null)
const originalStream = ref<MediaStream | null>(null)
const hasLocalVideo = ref(true)

// Sharing Statistics
const shareResolution = ref('1920x1080')
const shareFrameRate = ref(30)
const shareBandwidth = ref(2500)

// Sharing Duration
const sharingStartTime = ref<number>(0)
const sharingDuration = ref('00:00')
const sharingTimer = ref<number | null>(null)

// Sharing History
interface SharingHistoryEntry {
  type: string
  duration: string
  timestamp: string
}

const sharingHistory = ref<SharingHistoryEntry[]>([])

// Call Timer
const callStartTime = ref<number>(0)
const callDuration = ref('00:00')
const callTimer = ref<number | null>(null)

// Browser Compatibility
const supportsScreenShare = ref(false)
const supportsAudioShare = ref(false)

// Format time helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Connection Toggle
const _toggleConnection = async () => {
  if (isConnected.value) {
    await disconnect()
  } else {
    await connect({
      uri: sipServerUri.value,
      username: username.value,
      password: password.value,
    })
  }
}

// Make Video Call
const makeVideoCall = async () => {
  if (!targetUri.value) return

  try {
    await makeCallFn(targetUri.value, {
      video: true,
      audio: true,
    })
  } catch (error) {
    console.error('Failed to make video call:', error)
  }
}

// Screen Sharing
const shareScreen = async (type: 'screen' | 'window' | 'tab') => {
  if (!currentCall.value) return

  try {
    // Build constraints based on type and settings
    const constraints: any = {
      video: {
        cursor: 'always',
      },
      audio: shareAudio.value,
    }

    // Add quality settings
    if (highQuality.value) {
      constraints.video.width = { ideal: 1920 }
      constraints.video.height = { ideal: 1080 }
      constraints.video.frameRate = { ideal: 30 }
    } else {
      constraints.video.width = { ideal: 1280 }
      constraints.video.height = { ideal: 720 }
      constraints.video.frameRate = { ideal: 15 }
    }

    // Get display media
    screenStream.value = await navigator.mediaDevices.getDisplayMedia(constraints)

    // Store original stream before replacing
    if (currentCall.value.localStream) {
      originalStream.value = currentCall.value.localStream
    }

    // Replace video track in the call
    // Note: This is a simplified version. Real implementation would use replaceTrack on RTCRtpSender
    const videoTrack = screenStream.value.getVideoTracks()[0]

    // Update local video display
    if (localVideo.value) {
      localVideo.value.srcObject = screenStream.value
    }

    isSharingScreen.value = true
    sharingType.value = type
    sharingStartTime.value = Date.now()

    // Start sharing timer
    startSharingTimer()

    // Listen for screen share stop (when user clicks browser's stop button)
    videoTrack.onended = () => {
      stopScreenShare()
    }

    console.log('Screen sharing started:', type)
  } catch (error) {
    console.error('Failed to start screen sharing:', error)
    // Note: In production, use PrimeVue Toast for user feedback
    // For now, keeping console.error for debugging
    console.error('Failed to start screen sharing. Please grant permission and try again.')
  }
}

const stopScreenShare = async () => {
  if (!isSharingScreen.value) return

  try {
    // Stop all tracks in screen stream
    if (screenStream.value) {
      screenStream.value.getTracks().forEach((track) => track.stop())
    }

    // Restore original camera stream
    if (originalStream.value && currentCall.value) {
      // In real implementation, use replaceTrack to restore original video
      if (localVideo.value) {
        localVideo.value.srcObject = originalStream.value
      }
    }

    // Calculate duration
    const duration = Math.floor((Date.now() - sharingStartTime.value) / 1000)
    const durationStr = formatTime(duration)

    // Add to history
    sharingHistory.value.unshift({
      type: sharingType.value,
      duration: durationStr,
      timestamp: new Date().toLocaleTimeString(),
    })

    // Keep only last 5 entries
    if (sharingHistory.value.length > 5) {
      sharingHistory.value = sharingHistory.value.slice(0, 5)
    }

    stopSharingTimer()

    isSharingScreen.value = false
    screenStream.value = null

    console.log('Screen sharing stopped')
  } catch (error) {
    console.error('Failed to stop screen sharing:', error)
  }
}

// Video Controls
const toggleCamera = async () => {
  hasLocalVideo.value = !hasLocalVideo.value

  if (currentCall.value?.localStream) {
    const videoTracks = currentCall.value.localStream.getVideoTracks()
    videoTracks.forEach((track) => {
      track.enabled = hasLocalVideo.value
    })
  }
}

const toggleMicrophone = async () => {
  if (isMuted.value) {
    await unmute()
  } else {
    await mute()
  }
}

const switchCamera = async () => {
  console.log('Switching camera...')
  // In real implementation, this would cycle through available cameras
  // Note: In production, use PrimeVue Toast for user feedback
  // For now, keeping console.log for debugging
  console.log('Camera switching is not implemented in this demo')
}

const takeScreenshot = () => {
  if (!localVideo.value || !isSharingScreen.value) return

  try {
    const canvas = document.createElement('canvas')
    canvas.width = localVideo.value.videoWidth
    canvas.height = localVideo.value.videoHeight

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(localVideo.value, 0, 0)

      // Download screenshot
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `screenshot-${Date.now()}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      })
    }
  } catch (error) {
    console.error('Failed to take screenshot:', error)
  }
}

// Timers
const startCallTimer = () => {
  callStartTime.value = Date.now()
  callTimer.value = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - callStartTime.value) / 1000)
    callDuration.value = formatTime(elapsed)
  }, 1000)
}

const stopCallTimer = () => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
  callDuration.value = '00:00'
}

const startSharingTimer = () => {
  sharingTimer.value = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - sharingStartTime.value) / 1000)
    sharingDuration.value = formatTime(elapsed)

    // Simulate changing stats
    shareFrameRate.value = Math.floor(Math.random() * 10 + 25)
    shareBandwidth.value = Math.floor(Math.random() * 500 + 2000)
  }, 1000)
}

const stopSharingTimer = () => {
  if (sharingTimer.value) {
    clearInterval(sharingTimer.value)
    sharingTimer.value = null
  }
  sharingDuration.value = '00:00'
}

// Helpers
const getShareTypeClass = (type: string): string => {
  switch (type) {
    case 'screen':
      return 'share-type-screen'
    case 'window':
      return 'share-type-window'
    case 'tab':
      return 'share-type-tab'
    default:
      return 'share-type-default'
  }
}

// Check browser compatibility
const checkCompatibility = () => {
  supportsScreenShare.value = 'getDisplayMedia' in navigator.mediaDevices
  // Audio sharing support varies by browser
  supportsAudioShare.value = supportsScreenShare.value
}

// Watch call state
watch(callState, (newState, oldState) => {
  if (newState === 'active' && oldState !== 'active') {
    // Call became active
    startCallTimer()

    // Set up video streams
    if (currentCall.value) {
      if (remoteVideo.value && currentCall.value.remoteStream) {
        remoteVideo.value.srcObject = currentCall.value.remoteStream
      }
      if (localVideo.value && currentCall.value.localStream) {
        localVideo.value.srcObject = currentCall.value.localStream
      }
    }
  } else if (newState === 'terminated' || newState === 'disconnected') {
    // Call ended
    stopCallTimer()

    // Stop screen sharing if active
    if (isSharingScreen.value) {
      stopScreenShare()
    }

    // Clear video streams
    if (remoteVideo.value) {
      remoteVideo.value.srcObject = null
    }
    if (localVideo.value) {
      localVideo.value.srcObject = null
    }
  }
})

// Lifecycle
onMounted(() => {
  checkCompatibility()
})

onUnmounted(() => {
  stopCallTimer()
  stopSharingTimer()

  if (isSharingScreen.value) {
    stopScreenShare()
  }
})
</script>

<style scoped>
.screen-sharing-demo {
  max-width: 1200px;
  margin: 0 auto;
}

.description {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

/* Status badges now use PrimeVue Badge component - styles removed */
/* Sharing status now uses PrimeVue Tag component - styles removed */

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Card and Panel components now handle section styling - custom styles removed */
.call-section,
.active-call-section,
.compatibility-section {
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
}

h5 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Form styling - PrimeVue components handle their own styling */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-color);
}

/* PrimeVue InputText styling */
:deep(.p-inputtext) {
  width: 100%;
}

/* Button styles now handled by PrimeVue Button component */

/* Card component handles call-info styling */
.call-info {
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  font-weight: 500;
  color: var(--text-secondary);
}

.info-item .value {
  color: var(--text-color);
}

.video-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  aspect-ratio: 16 / 9;
}

.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-wrapper.local {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 200px;
  height: auto;
  aspect-ratio: 4 / 3;
  border: 2px solid white;
  border-radius: 8px;
  overflow: hidden;
  z-index: 10;
}

.remote-video,
.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remote-video.screen-share {
  object-fit: contain;
}

.video-label {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.screen-share-controls {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.share-options .info-text {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.share-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.share-btn {
  padding: 1rem;
  font-size: 1rem;
}

/* Checkbox styling now handled by PrimeVue Checkbox component */
.share-settings label {
  font-size: 0.875rem;
  color: var(--text-color);
}

.sharing-active {
  text-align: center;
}

/* Message component handles sharing-info styling */
.sharing-info {
  margin-bottom: 1rem;
}

.sharing-text .primary {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 0.25rem;
}

.sharing-text .secondary {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.sharing-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
}

.stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

/* Badge component handles stat-value styling */

.quick-actions {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

/* Button component handles action-btn styling with dynamic severity */

.sharing-history {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--surface-50);
  border-radius: 6px;
}

.history-icon {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 4px;
}

.history-icon.share-type-screen {
  background: var(--primary);
}

.history-icon.share-type-window {
  background: var(--info);
}

.history-icon.share-type-tab {
  background: var(--success);
}

.history-icon.share-type-default {
  background: var(--text-secondary);
}

.history-info {
  flex: 1;
}

.history-type {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.history-duration {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.history-timestamp {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.button-group {
  display: flex;
  gap: 0.75rem;
}

.compat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

/* Badge component handles compat-item styling */
.compat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-0);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.compat-label {
  font-weight: 500;
}

/* Message component handles compat-warning styling */
</style>
