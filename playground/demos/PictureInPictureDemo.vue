<template>
  <div class="pip-demo">
    <h2>Picture-in-Picture</h2>
    <p class="description">
      Display video in a floating window that stays on top of other applications. Perfect for
      monitoring video calls while multitasking.
    </p>

    <!-- Browser Support Check -->
    <div v-if="!isPiPSupported" class="warning-banner">
      <span class="warning-icon">⚠️</span>
      <div>
        <strong>Picture-in-Picture Not Supported</strong>
        <p>Your browser doesn't support the Picture-in-Picture API. Please use Chrome, Edge, or Safari.</p>
      </div>
    </div>

    <!-- Stream Selection -->
    <div class="stream-section">
      <h3>Select a Video Stream</h3>
      <p class="info-text">
        Choose from free test streams to see Picture-in-Picture in action. These streams are
        provided by <a href="https://test-streams.mux.dev/" target="_blank" rel="noopener">Mux</a>
        and <a href="https://developer.apple.com" target="_blank" rel="noopener">Apple</a> for testing purposes.
      </p>

      <div class="stream-grid">
        <button
          v-for="stream in availableStreams"
          :key="stream.id"
          :class="['stream-card', { active: selectedStream?.id === stream.id }]"
          @click="selectStream(stream)"
        >
          <span class="stream-icon">{{ stream.icon }}</span>
          <span class="stream-name">{{ stream.name }}</span>
          <span class="stream-quality">{{ stream.quality }}</span>
        </button>
      </div>
    </div>

    <!-- Video Player -->
    <div class="video-section">
      <h3>Video Player</h3>

      <div class="video-container" :class="{ 'pip-active': isPiPActive }">
        <video
          ref="videoElement"
          class="video-player"
          controls
          playsinline
          crossorigin="anonymous"
          @loadedmetadata="onVideoLoaded"
          @error="onVideoError"
        >
          <source v-if="currentSource" :src="currentSource" :type="currentSourceType" />
          Your browser does not support the video tag.
        </video>

        <!-- PiP Active Overlay -->
        <div v-if="isPiPActive" class="pip-overlay">
          <div class="pip-message">
            <span class="pip-icon">📺</span>
            <span>Video is playing in Picture-in-Picture mode</span>
            <button class="btn btn-sm" @click="exitPiP">Bring Back</button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-overlay">
          <div class="spinner"></div>
          <span>Loading stream...</span>
        </div>

        <!-- Error State -->
        <div v-if="videoError" class="error-overlay">
          <span class="error-icon">❌</span>
          <span>{{ videoError }}</span>
          <button class="btn btn-sm" @click="retryStream">Retry</button>
        </div>
      </div>

      <!-- Video Controls -->
      <div class="video-controls">
        <button
          class="btn btn-primary"
          :disabled="!isPiPSupported || !isVideoReady || isPiPActive"
          @click="enterPiP"
        >
          <span class="btn-icon">📺</span>
          Enter Picture-in-Picture
        </button>

        <button
          class="btn btn-secondary"
          :disabled="!isPiPActive"
          @click="exitPiP"
        >
          <span class="btn-icon">⬜</span>
          Exit Picture-in-Picture
        </button>

        <button
          class="btn"
          :class="isPiPActive ? 'btn-warning' : 'btn-outline'"
          :disabled="!isPiPSupported || !isVideoReady"
          @click="togglePiP"
        >
          <span class="btn-icon">🔄</span>
          Toggle PiP
        </button>
      </div>
    </div>

    <!-- Status Panel -->
    <div class="status-section">
      <h3>PiP Status</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Browser Support</span>
          <span :class="['status-value', isPiPSupported ? 'success' : 'error']">
            {{ isPiPSupported ? '✅ Supported' : '❌ Not Supported' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">PiP Status</span>
          <span :class="['status-value', isPiPActive ? 'active' : 'inactive']">
            {{ isPiPActive ? '🟢 Active' : '⚪ Inactive' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Video Ready</span>
          <span :class="['status-value', isVideoReady ? 'success' : 'pending']">
            {{ isVideoReady ? '✅ Ready' : '⏳ Loading' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Current Stream</span>
          <span class="status-value">
            {{ selectedStream?.name || 'None selected' }}
          </span>
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
        <span class="error-icon">⚠️</span>
        <span>{{ pipError.message }}</span>
      </div>
    </div>

    <!-- Features Section -->
    <div class="features-section">
      <h3>Composable Features</h3>
      <div class="feature-grid">
        <div class="feature-card">
          <span class="feature-icon">🔍</span>
          <h4>Browser Detection</h4>
          <p>Automatically detects if Picture-in-Picture is supported in the current browser.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🔄</span>
          <h4>Reactive State</h4>
          <p>Track PiP status, window dimensions, and errors with Vue reactivity.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🧹</span>
          <h4>Auto Cleanup</h4>
          <p>Automatically exits PiP mode when the component unmounts.</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">💾</span>
          <h4>Preference Storage</h4>
          <p>Optionally persist user preferences to localStorage.</p>
        </div>
      </div>
    </div>

    <!-- Usage Tips -->
    <div class="tips-section">
      <h3>Usage Tips</h3>
      <ul class="tips-list">
        <li>
          <strong>Video Calls:</strong> Use PiP during video calls to keep the remote participant
          visible while working in other applications.
        </li>
        <li>
          <strong>User Interaction:</strong> The browser requires a user gesture (click) to enter
          PiP mode for security reasons.
        </li>
        <li>
          <strong>Window Controls:</strong> Users can resize and reposition the PiP window, and
          close it by clicking the X button.
        </li>
        <li>
          <strong>Media Controls:</strong> Some browsers support media controls directly in the
          PiP window (play/pause).
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePictureInPicture } from '../../src'

// Video element ref
const videoElement = ref<HTMLVideoElement | null>(null)

// Use the PiP composable
const {
  isPiPSupported,
  isPiPActive,
  pipWindow,
  enterPiP,
  exitPiP,
  togglePiP,
  error: pipError,
} = usePictureInPicture(videoElement, {
  persistPreference: true,
  preferenceKey: 'vuesip-pip-demo-preference',
})

// Available test streams
interface StreamOption {
  id: string
  name: string
  icon: string
  quality: string
  url: string
  type: string
}

const availableStreams: StreamOption[] = [
  {
    id: 'bunny',
    name: 'Big Buck Bunny',
    icon: '🐰',
    quality: 'Adaptive',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'application/x-mpegURL',
  },
  {
    id: 'sintel',
    name: 'Sintel Trailer',
    icon: '🐉',
    quality: '720p',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    type: 'application/x-mpegURL',
  },
  {
    id: 'tears',
    name: 'Tears of Steel',
    icon: '🤖',
    quality: 'Adaptive',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    type: 'application/x-mpegURL',
  },
  {
    id: 'akamai',
    name: 'Akamai Test',
    icon: '🌐',
    quality: 'Live',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    type: 'application/x-mpegURL',
  },
  {
    id: 'mp4-bunny',
    name: 'Big Buck Bunny (MP4)',
    icon: '🎬',
    quality: '720p',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'video/mp4',
  },
  {
    id: 'mp4-elephant',
    name: 'Elephant Dream',
    icon: '🐘',
    quality: '720p',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    type: 'video/mp4',
  },
]

// State
const selectedStream = ref<StreamOption | null>(null)
const isLoading = ref(false)
const isVideoReady = ref(false)
const videoError = ref<string | null>(null)

// Computed
const currentSource = computed(() => selectedStream.value?.url || null)
const currentSourceType = computed(() => selectedStream.value?.type || 'video/mp4')

// Stream selection
const selectStream = async (stream: StreamOption) => {
  // Exit PiP if active
  if (isPiPActive.value) {
    await exitPiP()
  }

  selectedStream.value = stream
  isLoading.value = true
  isVideoReady.value = false
  videoError.value = null

  // Reset video element
  if (videoElement.value) {
    videoElement.value.load()

    // For HLS streams, we need to check if native HLS is supported
    // Most browsers support HLS natively now, but Safari has the best support
    if (stream.type === 'application/x-mpegURL' && !videoElement.value.canPlayType('application/vnd.apple.mpegurl')) {
      // For browsers that don't support HLS natively, try direct URL
      // Most modern browsers now handle HLS via MSE
      console.log('HLS may not be natively supported, attempting anyway...')
    }
  }
}

// Video event handlers
const onVideoLoaded = () => {
  isLoading.value = false
  isVideoReady.value = true
  videoError.value = null

  // Auto-play on selection
  if (videoElement.value) {
    videoElement.value.play().catch((err) => {
      console.log('Auto-play blocked:', err.message)
    })
  }
}

const onVideoError = (event: Event) => {
  isLoading.value = false
  isVideoReady.value = false

  const video = event.target as HTMLVideoElement
  const error = video.error

  if (error) {
    switch (error.code) {
      case MediaError.MEDIA_ERR_NETWORK:
        videoError.value = 'Network error - please check your connection'
        break
      case MediaError.MEDIA_ERR_DECODE:
        videoError.value = 'Video decode error - format may not be supported'
        break
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        videoError.value = 'Format not supported - try a different stream'
        break
      default:
        videoError.value = 'Unknown error loading video'
    }
  } else {
    videoError.value = 'Failed to load video stream'
  }
}

const retryStream = () => {
  if (selectedStream.value) {
    selectStream(selectedStream.value)
  }
}

// Watch for PiP errors
watch(pipError, (error) => {
  if (error) {
    console.error('PiP Error:', error.message)
  }
})

// Initialize with first MP4 stream (most compatible)
onMounted(() => {
  const mp4Stream = availableStreams.find((s) => s.type === 'video/mp4')
  if (mp4Stream) {
    selectStream(mp4Stream)
  }
})
</script>

<style scoped>
.pip-demo {
  max-width: 1000px;
  margin: 0 auto;
}

.description {
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* Warning Banner */
.warning-banner {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.warning-banner .warning-icon {
  font-size: 1.5rem;
}

.warning-banner strong {
  display: block;
  margin-bottom: 0.25rem;
}

.warning-banner p {
  margin: 0;
  color: #92400e;
  font-size: 0.875rem;
}

/* Stream Section */
.stream-section,
.video-section,
.status-section,
.features-section,
.tips-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  color: #111827;
}

h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.info-text {
  margin-bottom: 1rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.info-text a {
  color: #3b82f6;
  text-decoration: none;
}

.info-text a:hover {
  text-decoration: underline;
}

/* Stream Grid */
.stream-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.stream-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.stream-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.stream-card.active {
  border-color: #3b82f6;
  background: #dbeafe;
}

.stream-icon {
  font-size: 2rem;
}

.stream-name {
  font-weight: 600;
  font-size: 0.875rem;
  text-align: center;
}

.stream-quality {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

/* Video Container */
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
.pip-overlay,
.loading-overlay,
.error-overlay {
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

.pip-icon {
  font-size: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #374151;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  font-size: 2rem;
}

/* Video Controls */
.video-controls {
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
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.btn-outline {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.btn-outline:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}

.btn-icon {
  font-size: 1rem;
}

/* Status Section */
.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.status-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-value {
  font-weight: 600;
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
  color: #6b7280;
}

.status-value.pending {
  color: #d97706;
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
  color: #065f46;
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
  color: #6b7280;
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

/* Features Section */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.feature-card {
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.feature-icon {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.feature-card h4 {
  margin-bottom: 0.5rem;
}

.feature-card p {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

/* Tips Section */
.tips-list {
  margin: 0;
  padding-left: 1.25rem;
}

.tips-list li {
  margin-bottom: 0.75rem;
  line-height: 1.6;
  color: #374151;
}

.tips-list li:last-child {
  margin-bottom: 0;
}

.tips-list strong {
  color: #111827;
}
</style>
