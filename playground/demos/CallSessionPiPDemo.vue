<template>
  <div class="call-session-pip-demo">
    <div class="info-section">
      <p>
        The <code>useCallSession</code> composable includes built-in Picture-in-Picture support,
        providing call-aware PiP functionality that automatically exits when calls end.
      </p>
      <p class="note">
        <strong>Note:</strong> This demo shows the integrated PiP feature accessed through
        <code>useCallSession</code>, which wraps <code>usePictureInPicture</code> with call state
        awareness.
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

    <!-- PiP Browser Support Check -->
    <Message v-if="!isPiPSupported" severity="warn" :closable="false" class="mb-4">
      <template #default>
        <strong>Picture-in-Picture Not Supported</strong>
        <p class="mt-2 mb-0">
          Your browser doesn't support the Picture-in-Picture API. Please use Chrome, Edge, or
          Safari.
        </p>
      </template>
    </Message>

    <!-- Video Section -->
    <div class="video-section">
      <h3>Video Call with PiP</h3>

      <div class="video-container" :class="{ 'pip-active': isPiPActive }">
        <video
          ref="videoElement"
          class="video-player"
          autoplay
          playsinline
          muted
          loop
          @loadedmetadata="onVideoLoaded"
        >
          <source :src="videoSource" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <!-- PiP Active Overlay -->
        <div v-if="isPiPActive" class="pip-overlay">
          <div class="pip-message">
            <span class="pip-icon-lg">TV</span>
            <span>Video is playing in Picture-in-Picture mode</span>
            <Button @click="handleExitPiP" label="Bring Back" severity="secondary" size="small" />
          </div>
        </div>

        <!-- Call Status Overlay -->
        <div v-if="callState !== 'idle'" class="call-status-overlay">
          <span class="status-dot" :class="callState"></span>
          <span>{{ callStateDisplay }}</span>
          <span v-if="duration && callState === 'active'" class="duration">
            {{ formatDuration(duration) }}
          </span>
        </div>
      </div>

      <!-- PiP Controls -->
      <div class="pip-controls">
        <Button
          :disabled="!isPiPSupported || !isVideoReady || isPiPActive"
          @click="handleEnterPiP"
          label="Enter Picture-in-Picture"
          severity="primary"
          icon="pi pi-desktop"
        />
        <Button
          :disabled="!isPiPActive"
          @click="handleExitPiP"
          label="Exit Picture-in-Picture"
          severity="secondary"
          icon="pi pi-times"
        />
        <Button
          :disabled="!isPiPSupported || !isVideoReady"
          @click="handleTogglePiP"
          :label="isPiPActive ? 'Toggle PiP' : 'Toggle PiP'"
          :severity="isPiPActive ? 'warning' : 'secondary'"
          outlined
          icon="pi pi-refresh"
        />
      </div>
    </div>

    <!-- Status Panel -->
    <div class="status-section">
      <h3>CallSession PiP Status</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Browser Support</span>
          <span :class="['status-value', isPiPSupported ? 'success' : 'error']">
            {{ isPiPSupported ? 'Supported' : 'Not Supported' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">PiP Status</span>
          <span :class="['status-value', isPiPActive ? 'active' : 'inactive']">
            {{ isPiPActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Call State</span>
          <span class="status-value">{{ callStateDisplay }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Auto-Exit on End</span>
          <span class="status-value success">Enabled</span>
        </div>
      </div>

      <!-- PiP Window Info -->
      <div v-if="pipWindow" class="pip-window-info">
        <h4>PiP Window Details</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Width:</span>
            <span class="info-value">{{ pipWindow.width }}px</span>
          </div>
          <div class="info-item">
            <span class="info-label">Height:</span>
            <span class="info-value">{{ pipWindow.height }}px</span>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="pipError" class="error-banner">
        <span class="error-icon">Warning</span>
        <span>{{ pipError.message }}</span>
      </div>
    </div>

    <!-- Call-Aware Features -->
    <div class="features-section">
      <h3>Call-Aware PiP Features</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <span class="feature-icon">Auto</span>
          <h4>Auto-Exit on Call End</h4>
          <p>PiP automatically exits when the call state becomes 'terminated' or 'failed'.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">State</span>
          <h4>Integrated State</h4>
          <p>PiP state is exposed directly from useCallSession - no separate composable needed.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">Video</span>
          <h4>Video Ref Management</h4>
          <p>Use setVideoRef() to bind your video element for PiP operations.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">Save</span>
          <h4>Preference Persistence</h4>
          <p>PiP preferences are saved to localStorage for consistent user experience.</p>
        </div>
      </div>
    </div>

    <!-- Test Scenarios -->
    <div class="test-section">
      <h3>Test Scenarios</h3>
      <p class="info-text">Use the simulation controls above to test call-aware PiP behavior:</p>
      <ol class="test-steps">
        <li>Enable simulation mode and run a call scenario</li>
        <li>Enter PiP mode while the call is active</li>
        <li>End the call using the simulation controls</li>
        <li>Observe that PiP automatically exits when the call ends</li>
      </ol>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { computed, ref, watch } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())

// useCallSession now includes PiP support
const {
  state,
  makeCall,
  hangup,
  // PiP properties from useCallSession
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
const videoElement = ref&lt;HTMLVideoElement&gt;()
watch(videoElement, (el) => {
  if (el) setVideoRef(el)
})

// PiP auto-exits when call ends (handled internally)
// Just use the PiP methods directly:
await enterPiP()  // Enter PiP mode
await exitPiP()   // Exit PiP mode
await togglePiP() // Toggle PiP mode
</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Call Session PiP Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for all interactive buttons with appropriate severity levels
 * - Using PrimeVue Message for warning banner with appropriate severity
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Client
const { getClient } = useSipClient()

// Call Session with integrated PiP
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  remoteUri: realRemoteUri,
  remoteDisplayName: realRemoteDisplayName,
  isMuted: realIsMuted,
  duration: realDuration,
  // PiP properties from useCallSession
  isPiPSupported,
  isPiPActive,
  pipWindow,
  pipError,
  setVideoRef,
  enterPiP,
  exitPiP,
  togglePiP,
} = useCallSession(sipClientRef)

// Effective values - use simulation or real data based on mode
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

// Video element and state
const videoElement = ref<HTMLVideoElement | null>(null)
const isVideoReady = ref(false)

// Test video source
const videoSource =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

// Computed
const callStateDisplay = computed(() => {
  const states: Record<string, string> = {
    idle: 'Idle',
    calling: 'Calling...',
    incoming: 'Incoming Call',
    ringing: 'Ringing...',
    active: 'In Call',
    ended: 'Call Ended',
    terminated: 'Terminated',
    failed: 'Failed',
  }
  return states[callState.value] || callState.value
})

// Methods
const onVideoLoaded = () => {
  isVideoReady.value = true
}

const handleEnterPiP = async () => {
  try {
    await enterPiP()
  } catch (error) {
    console.error('Failed to enter PiP:', error)
  }
}

const handleExitPiP = async () => {
  try {
    await exitPiP()
  } catch (error) {
    console.error('Failed to exit PiP:', error)
  }
}

const handleTogglePiP = async () => {
  try {
    await togglePiP()
  } catch (error) {
    console.error('Failed to toggle PiP:', error)
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Bind video element to PiP when available
watch(videoElement, (el) => {
  if (el) {
    setVideoRef(el)
  }
})

// Simulate auto-exit behavior when call ends in simulation mode
watch(callState, async (newState, oldState) => {
  if (isSimulationMode.value && isPiPActive.value) {
    if (newState === 'terminated' || newState === 'failed' || newState === 'ended') {
      if (oldState !== newState) {
        console.log('[CallSessionPiP] Auto-exiting PiP due to call end (simulation)')
        await handleExitPiP()
      }
    }
  }
})

// Initialize
onMounted(() => {
  // Video element will be set via template ref
})
</script>

<style scoped>
.call-session-pip-demo {
  max-width: 900px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: var(--bg-card, #f9fafb);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0 0 1rem 0;
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.info-section code {
  background: var(--bg-code, #e5e7eb);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.875rem;
}

.note {
  padding: 1rem;
  background: var(--bg-info, #eff6ff);
  border-left: 3px solid var(--primary, #667eea);
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Design Decision: PrimeVue Message component handles warning banner styling.
   Removed custom .warning-banner classes as they're no longer needed. */

/* Video Section */
.video-section {
  background: var(--bg-card, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.video-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  color: var(--text-primary, #111827);
}

.video-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
  aspect-ratio: 16 / 9;
}

.video-container.pip-active {
  background: #1f2937;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Overlays */
.pip-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
}

.pip-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.pip-icon-lg {
  font-size: 1.5rem;
  font-weight: bold;
}

.call-status-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  color: white;
  font-size: 0.8rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
}

.status-dot.active {
  background: #22c55e;
  animation: pulse 2s infinite;
}

.status-dot.calling,
.status-dot.ringing {
  background: #f59e0b;
  animation: pulse 1s infinite;
}

.status-dot.terminated,
.status-dot.failed,
.status-dot.ended {
  background: #ef4444;
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

.duration {
  font-family: monospace;
  font-weight: 600;
}

/* PiP Controls */
.pip-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #3b82f6);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark, #2563eb);
}

.btn-secondary {
  background: var(--secondary, #6b7280);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--secondary-dark, #4b5563);
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.btn-outline {
  background: var(--bg-secondary, white);
  border: 1px solid var(--border-color, #d1d5db);
  color: var(--text-primary, #374151);
}

.btn-outline:hover:not(:disabled) {
  background: var(--bg-hover, #f9fafb);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}

.btn-icon {
  font-size: 0.875rem;
  font-weight: 600;
}

/* Status Section */
.status-section {
  background: var(--bg-card, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.status-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  color: var(--text-primary, #111827);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--bg-secondary, white);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.status-label {
  font-size: 0.7rem;
  color: var(--text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-value {
  font-weight: 600;
  font-size: 0.85rem;
}

.status-value.success {
  color: #059669;
}

.status-value.error {
  color: #dc2626;
}

.status-value.active {
  color: #059669;
}

.status-value.inactive {
  color: var(--text-secondary, #6b7280);
}

/* PiP Window Info */
.pip-window-info {
  padding: 1rem;
  background: #ecfdf5;
  border: 1px solid #10b981;
  border-radius: 6px;
  margin-top: 1rem;
}

.pip-window-info h4 {
  margin: 0 0 0.5rem 0;
  color: #065f46;
  font-size: 0.875rem;
}

.info-grid {
  display: flex;
  gap: 2rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-label {
  color: var(--text-secondary, #6b7280);
}

.info-value {
  font-weight: 600;
  color: #065f46;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  margin-top: 1rem;
}

.error-icon {
  font-weight: 600;
}

/* Features Section */
.features-section {
  background: var(--bg-card, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.features-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  color: var(--text-primary, #111827);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.feature-card {
  padding: 1rem;
  background: var(--bg-secondary, white);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
}

.feature-icon {
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--bg-tertiary, #e5e7eb);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.feature-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.feature-card p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
}

/* Test Section */
.test-section {
  background: var(--bg-card, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.test-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  color: var(--text-primary, #111827);
}

.info-text {
  margin-bottom: 1rem;
  color: var(--text-secondary, #6b7280);
  font-size: 0.875rem;
}

.test-steps {
  margin: 0;
  padding-left: 1.5rem;
}

.test-steps li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
  color: var(--text-primary, #374151);
}

.test-steps li:last-child {
  margin-bottom: 0;
}

/* Code Example */
.code-example {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: var(--bg-card, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #333);
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

/* Dark mode adjustments */
:root.dark .warning-banner {
  background: #422006;
  border-color: #f59e0b;
}

:root.dark .warning-banner p {
  color: #fcd34d;
}

:root.dark .pip-window-info {
  background: #064e3b;
  border-color: #10b981;
}

:root.dark .pip-window-info h4,
:root.dark .info-value {
  color: #6ee7b7;
}

:root.dark .error-banner {
  background: #450a0a;
  border-color: #f87171;
  color: #fca5a5;
}

/* Responsive */
@media (max-width: 768px) {
  .pip-controls {
    flex-direction: column;
  }

  .pip-controls .btn {
    width: 100%;
    justify-content: center;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
