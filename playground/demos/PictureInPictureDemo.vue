<template>
  <div class="pip-demo">
    <h2>Picture-in-Picture</h2>
    <p class="description">
      Two PiP features: (1) <strong>Video Inset</strong> - overlay local camera on remote video
      within your app, and (2) <strong>Browser PiP</strong> - pop video to a floating OS window
      while multitasking.
    </p>

    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button :class="['tab-btn', { active: activeTab === 'inset' }]" @click="activeTab = 'inset'">
        <span class="tab-icon">🎥</span>
        Video Inset Layout
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'browser' }]"
        @click="activeTab = 'browser'"
      >
        <span class="tab-icon">📺</span>
        Browser PiP
      </button>
    </div>

    <!-- Video Inset Tab -->
    <div v-show="activeTab === 'inset'" class="tab-content">
      <div class="inset-section">
        <h3>Video Call Layout with Inset</h3>
        <p class="info-text">
          This demonstrates a typical video call layout where your local camera appears as an
          overlay on the remote video. You can reposition, resize, swap, or hide the inset.
        </p>

        <!-- Main Video Container with Inset -->
        <div class="call-container">
          <video
            ref="remoteVideoElement"
            class="main-video"
            :src="isSwapped ? localVideoSrc : remoteVideoSrc"
            autoplay
            muted
            loop
            playsinline
          ></video>

          <!-- Inset Video (Local Camera) -->
          <div v-if="insetVisible" :style="insetStyles" class="inset-wrapper">
            <video
              ref="localVideoElement"
              class="inset-video"
              :src="isSwapped ? remoteVideoSrc : localVideoSrc"
              autoplay
              muted
              loop
              playsinline
            ></video>
            <div class="inset-controls">
              <button class="inset-btn" @click="cyclePosition" title="Move position">↗️</button>
              <button class="inset-btn" @click="swapVideos" title="Swap videos">🔄</button>
              <button class="inset-btn" @click="hideInset" title="Hide">✕</button>
            </div>
          </div>

          <!-- Call Status Overlay -->
          <div class="call-status">
            <span class="status-dot"></span>
            <span>Video Call Demo</span>
          </div>
        </div>

        <!-- Inset Controls Panel -->
        <div class="controls-panel">
          <div class="control-group">
            <label>Visibility</label>
            <div class="btn-group">
              <Button
                @click="showInset"
                label="Show"
                :severity="insetVisible ? 'primary' : 'secondary'"
                :outlined="!insetVisible"
              />
              <Button
                @click="hideInset"
                label="Hide"
                :severity="!insetVisible ? 'primary' : 'secondary'"
                :outlined="insetVisible"
              />
            </div>
          </div>

          <div class="control-group">
            <label>Position</label>
            <div class="btn-group">
              <Button
                v-for="pos in positions"
                :key="pos.value"
                @click="setPosition(pos.value)"
                :label="pos.label"
                :severity="position === pos.value ? 'primary' : 'secondary'"
                :outlined="position !== pos.value"
                size="small"
              />
            </div>
          </div>

          <div class="control-group">
            <label>Size</label>
            <div class="btn-group">
              <Button
                v-for="s in sizes"
                :key="s.value"
                @click="setSize(s.value)"
                :label="s.label"
                :severity="size === s.value ? 'primary' : 'secondary'"
                :outlined="size !== s.value"
                size="small"
              />
            </div>
          </div>

          <div class="control-group">
            <label>Actions</label>
            <div class="btn-group">
              <Button
                @click="swapVideos"
                label="Swap Videos"
                severity="secondary"
                icon="pi pi-refresh"
              />
              <Button
                @click="resetInset"
                label="Reset"
                severity="secondary"
                outlined
                icon="pi pi-replay"
              />
            </div>
          </div>
        </div>

        <!-- Inset Status -->
        <div class="status-section compact">
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">Visible</span>
              <span :class="['status-value', insetVisible ? 'success' : 'inactive']">
                {{ insetVisible ? '✅ Yes' : '❌ No' }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">Position</span>
              <span class="status-value">{{ position }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Size</span>
              <span class="status-value"
                >{{ size }} ({{ dimensions.width }}×{{ dimensions.height }})</span
              >
            </div>
            <div class="status-item">
              <span class="status-label">Swapped</span>
              <span :class="['status-value', isSwapped ? 'active' : 'inactive']">
                {{ isSwapped ? '🔄 Yes' : '➡️ No' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Inset Features -->
      <div class="features-section">
        <h3>useVideoInset Features</h3>
        <div class="feature-grid">
          <div class="feature-card">
            <span class="feature-icon">📍</span>
            <h4>Position Control</h4>
            <p>Place the inset in any corner: top-left, top-right, bottom-left, or bottom-right.</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">📐</span>
            <h4>Size Presets</h4>
            <p>Choose from small, medium, large presets or set custom dimensions.</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">🔄</span>
            <h4>Video Swap</h4>
            <p>Instantly swap which video is main vs inset with a single click.</p>
          </div>
          <div class="feature-card">
            <span class="feature-icon">💾</span>
            <h4>Persistence</h4>
            <p>Optionally save user preferences to localStorage for consistent experience.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Browser PiP Tab -->
    <div v-show="activeTab === 'browser'" class="tab-content">
      <!-- Browser Support Check -->
      <div v-if="!isPiPSupported" class="warning-banner">
        <span class="warning-icon">⚠️</span>
        <div>
          <strong>Picture-in-Picture Not Supported</strong>
          <p>
            Your browser doesn't support the Picture-in-Picture API. Please use Chrome, Edge, or
            Safari.
          </p>
        </div>
      </div>

      <!-- Stream Selection -->
      <div class="stream-section">
        <h3>Select a Video Stream</h3>
        <p class="info-text">
          Choose from free test streams to see Picture-in-Picture in action. These streams are
          provided by
          <a href="https://test-streams.mux.dev/" target="_blank" rel="noopener">Mux</a> and
          <a href="https://developer.apple.com" target="_blank" rel="noopener">Apple</a> for testing
          purposes.
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
              <span class="pip-icon-lg">📺</span>
              <span>Video is playing in Picture-in-Picture mode</span>
              <Button @click="exitPiP" label="Bring Back" severity="secondary" size="small" />
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
            <Button @click="retryStream" label="Retry" severity="secondary" size="small" />
          </div>
        </div>

        <!-- Video Controls -->
        <div class="video-controls">
          <Button
            :disabled="!isPiPSupported || !isVideoReady || isPiPActive"
            @click="enterPiP"
            label="Enter Picture-in-Picture"
            severity="primary"
            icon="pi pi-desktop"
          />
          <Button
            :disabled="!isPiPActive"
            @click="exitPiP"
            label="Exit Picture-in-Picture"
            severity="secondary"
            icon="pi pi-times"
          />
          <Button
            :disabled="!isPiPSupported || !isVideoReady"
            @click="togglePiP"
            label="Toggle PiP"
            :severity="isPiPActive ? 'warning' : 'secondary'"
            :outlined="!isPiPActive"
            icon="pi pi-refresh"
          />
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

      <!-- Browser PiP Features -->
      <div class="features-section">
        <h3>usePictureInPicture Features</h3>
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
    </div>

    <!-- Usage Tips -->
    <div class="tips-section">
      <h3>Usage Tips</h3>
      <ul class="tips-list">
        <li>
          <strong>Video Inset:</strong> Best for keeping both local and remote video visible during
          video calls without leaving your application.
        </li>
        <li>
          <strong>Browser PiP:</strong> Use when you need to monitor a video call while working in
          completely different applications.
        </li>
        <li>
          <strong>Combine Both:</strong> Use video inset within your app, then pop to browser PiP
          when switching to other applications.
        </li>
        <li>
          <strong>User Interaction:</strong> Browser PiP requires a user gesture (click) for
          security reasons.
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Picture-in-Picture Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for all interactive buttons with appropriate severity levels
 * - Tab buttons remain custom styled to maintain the visual design pattern
 * - Inset control buttons remain custom styled for compact overlay controls
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, watch, onMounted } from 'vue'
import { usePictureInPicture, useVideoInset, type InsetPosition, type InsetSize } from '../../src'
import { Button } from './shared-components'

// Active tab
const activeTab = ref<'inset' | 'browser'>('inset')

// ============================================
// Video Inset Setup
// ============================================

const remoteVideoElement = ref<HTMLVideoElement | null>(null)
const localVideoElement = ref<HTMLVideoElement | null>(null)

// Test video sources (simulating local/remote)
const remoteVideoSrc =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
const localVideoSrc =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'

// Use the video inset composable
const {
  isVisible: insetVisible,
  position,
  size,
  dimensions,
  isSwapped,
  insetStyles,
  show: showInset,
  hide: hideInset,
  toggle: _toggleInset,
  setPosition,
  setSize,
  swapVideos,
  cyclePosition,
  reset: resetInset,
} = useVideoInset({
  initialPosition: 'bottom-right',
  initialSize: 'medium',
  persistPreference: true,
  preferenceKey: 'vuesip-pip-demo-inset',
})

// Position and size options for UI
const positions: { value: InsetPosition; label: string }[] = [
  { value: 'top-left', label: '↖' },
  { value: 'top-right', label: '↗' },
  { value: 'bottom-left', label: '↙' },
  { value: 'bottom-right', label: '↘' },
]

const sizes: { value: InsetSize; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
]

// ============================================
// Browser PiP Setup
// ============================================

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
    id: 'mp4-bunny',
    name: 'Big Buck Bunny',
    icon: '🐰',
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
  {
    id: 'mp4-sintel',
    name: 'Sintel',
    icon: '🐉',
    quality: '720p',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    type: 'video/mp4',
  },
  {
    id: 'mp4-tears',
    name: 'Tears of Steel',
    icon: '🤖',
    quality: '720p',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
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

// Initialize with first MP4 stream
onMounted(() => {
  const mp4Stream = availableStreams[0]
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
  color: var(--text-secondary, #666);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color, #e5e7eb);
  padding-bottom: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary, #111827);
  background: var(--bg-hover, #f3f4f6);
}

.tab-btn.active {
  color: var(--primary, #3b82f6);
  border-bottom-color: var(--primary, #3b82f6);
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Inset Section */
.inset-section {
  background: var(--bg-card, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Call Container (main video with inset) */
.call-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
  aspect-ratio: 16 / 9;
}

.main-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.inset-wrapper {
  display: flex;
  flex-direction: column;
}

.inset-wrapper:hover .inset-controls {
  opacity: 1;
}

.inset-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.inset-controls {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.inset-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background 0.2s;
}

.inset-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.call-status {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20px;
  color: white;
  font-size: 0.8rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
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

/* Controls Panel */
.controls-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary, white);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
  margin-bottom: 1.5rem;
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
  background: var(--bg-card, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.status-section.compact {
  padding: 1rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
  color: var(--text-primary, #111827);
}

h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.info-text {
  margin-bottom: 1rem;
  color: var(--text-secondary, #6b7280);
  font-size: 0.875rem;
}

.info-text a {
  color: var(--primary, #3b82f6);
  text-decoration: none;
}

.info-text a:hover {
  text-decoration: underline;
}

/* Stream Grid */
.stream-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.stream-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg-secondary, white);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.stream-card:hover {
  border-color: var(--primary, #3b82f6);
  background: var(--bg-hover, #eff6ff);
}

.stream-card.active {
  border-color: var(--primary, #3b82f6);
  background: var(--bg-active, #dbeafe);
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
  color: var(--text-secondary, #6b7280);
  background: var(--bg-tertiary, #f3f4f6);
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

.pip-icon-lg {
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
  font-size: 1rem;
}

/* Status Section */
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

/* Features Section */
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
  color: var(--text-secondary, #6b7280);
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
  color: var(--text-primary, #374151);
}

.tips-list li:last-child {
  margin-bottom: 0;
}

.tips-list strong {
  color: var(--text-primary, #111827);
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
</style>
