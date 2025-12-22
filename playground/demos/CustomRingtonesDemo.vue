<template>
  <div class="ringtones-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
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

    <div class="info-section">
      <p>
        Customize your incoming call experience with different ringtones. Select from built-in tones
        or upload your own audio files. Volume and vibration can be adjusted independently.
      </p>
    </div>

    <!-- Ringtone Selection -->
    <div class="ringtone-interface">
      <h3>Select Ringtone</h3>

      <div class="ringtone-list">
        <div
          v-for="tone in ringtones"
          :key="tone.id"
          class="ringtone-item"
          :class="{ active: selectedRingtone === tone.id }"
          @click="selectRingtone(tone.id)"
        >
          <div class="ringtone-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
              />
            </svg>
          </div>
          <div class="ringtone-info">
            <div class="ringtone-name">{{ tone.name }}</div>
            <div class="ringtone-desc">{{ tone.description }}</div>
          </div>
          <button
            class="play-button"
            @click.stop="playPreview(tone.id)"
            :disabled="isPlaying && playingTone === tone.id"
          >
            <svg
              v-if="isPlaying && playingTone === tone.id"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </button>
        </div>
      </div>

      <!-- Volume Control -->
      <div class="volume-control">
        <h4>Volume</h4>
        <div class="slider-control">
          <svg class="slider-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            v-model="volume"
            @input="handleVolumeChange"
            class="volume-slider"
          />
          <svg class="slider-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
            />
          </svg>
          <span class="slider-value">{{ volume }}%</span>
        </div>
      </div>

      <!-- Additional Options -->
      <div class="ringtone-options">
        <h4>Options</h4>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="loopRingtone" @change="saveSettings" />
            Loop ringtone until answered
          </label>
        </div>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="vibrateEnabled" @change="saveSettings" />
            Enable vibration (on supported devices)
          </label>
        </div>

        <div class="option-item">
          <label>
            <input type="checkbox" v-model="showNotification" @change="saveSettings" />
            Show desktop notification
          </label>
        </div>
      </div>

      <!-- Test Ringtone -->
      <div class="test-section">
        <h4>Test Your Settings</h4>
        <p class="test-desc">
          Click the button below to simulate an incoming call and hear how your ringtone sounds.
        </p>
        <button class="btn btn-primary" @click="testRingtone" :disabled="isPlaying">
          <svg v-if="isPlaying" class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M13 7.83c1.33 1.33 1.33 3.51 0 4.83l1.42 1.42c2.12-2.12 2.12-5.57 0-7.7L13 7.83zM7.76 16.59C6.67 15.5 6 14.04 6 12.5s.67-3 1.76-4.09L6.34 7c-1.51 1.51-2.34 3.52-2.34 5.5s.83 3.99 2.34 5.5l1.42-1.41zM18 12.5c0 1.71-.71 3.26-1.86 4.36l1.42 1.42C18.95 16.89 20 14.81 20 12.5c0-2.31-1.05-4.39-2.64-5.78l-1.42 1.42c1.15 1.1 1.86 2.65 1.86 4.36z"
            />
          </svg>
          {{ isPlaying ? 'Stop Test' : 'Test Ringtone' }}
        </button>
      </div>

      <!-- Call Status (when active) -->
      <div v-if="callState === 'incoming'" class="incoming-call-demo">
        <div class="demo-badge">Live Incoming Call</div>
        <p>
          A real incoming call is using your selected ringtone:
          <strong>{{ activeRingtoneName }}</strong>
        </p>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { ref, watch } from 'vue'
import { useCallSession } from 'vuesip'

// Ringtone audio element
const ringtoneAudio = ref&lt;HTMLAudioElement | null&gt;(null)
const selectedRingtone = ref('classic')
const volume = ref(80)

// Initialize audio element
const initRingtone = () => {
  ringtoneAudio.value = new Audio('/ringtones/classic.mp3')
  ringtoneAudio.value.loop = true
  ringtoneAudio.value.volume = volume.value / 100
}

// Play ringtone for incoming calls
const { state: callState } = useCallSession(sipClient)

watch(callState, (newState, oldState) => {
  if (newState === 'incoming' && oldState !== 'incoming') {
    // Incoming call - play ringtone
    ringtoneAudio.value?.play()

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([500, 250, 500])
    }
  } else if (oldState === 'incoming' && newState !== 'incoming') {
    // Call answered/rejected - stop ringtone
    ringtoneAudio.value?.pause()
    if (ringtoneAudio.value) {
      ringtoneAudio.value.currentTime = 0
    }
  }
})

// Change volume
const setVolume = (newVolume: number) => {
  volume.value = newVolume
  if (ringtoneAudio.value) {
    ringtoneAudio.value.volume = newVolume / 100
  }
}

// Change ringtone
const changeRingtone = (ringtoneId: string) => {
  selectedRingtone.value = ringtoneId
  ringtoneAudio.value?.pause()
  initRingtone()
}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

interface Ringtone {
  id: string
  name: string
  description: string
  file: string
}

const STORAGE_KEY = 'vuesip-ringtone-settings'

// SIP Client and Call Session
const { getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const { state: realCallState } = useCallSession(sipClientRef)

// Effective values for simulation
const callState = computed(() =>
  isSimulationMode.value ? simulation.state.value : realCallState.value
)

// Available ringtones (using real MP3 files)
const ringtones: Ringtone[] = [
  {
    id: 'classic-ring',
    name: 'Classic Ring',
    description: 'Traditional phone ring',
    file: '/ringtones/classic-ring.mp3',
  },
  {
    id: 'phone-ring',
    name: 'Phone Ring',
    description: 'Modern phone sound',
    file: '/ringtones/phone-ring.mp3',
  },
  {
    id: 'landline',
    name: 'Landline',
    description: 'Old-school landline ring',
    file: '/ringtones/landline.mp3',
  },
  {
    id: 'marimba',
    name: 'Marimba',
    description: 'Pleasant marimba melody',
    file: '/ringtones/marimba.mp3',
  },
  { id: 'sonar', name: 'Sonar', description: 'Sonar-like tone', file: '/ringtones/sonar.mp3' },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Intercom buzzer',
    file: '/ringtones/intercom.mp3',
  },
  {
    id: 'message',
    name: 'Message',
    description: 'Message alert tone',
    file: '/ringtones/message.mp3',
  },
  {
    id: 'ouverture',
    name: 'Ouverture',
    description: 'Classical opening theme',
    file: '/ringtones/ouverture.mp3',
  },
]

// State
const selectedRingtone = ref('classic-ring')
const volume = ref(80)
const loopRingtone = ref(true)
const vibrateEnabled = ref(true)
const showNotification = ref(false)
const isPlaying = ref(false)
const playingTone = ref<string | null>(null)

// Audio element for playing ringtones
let audioElement: HTMLAudioElement | null = null

// Computed
const activeRingtoneName = computed(() => {
  return ringtones.find((t) => t.id === selectedRingtone.value)?.name || 'Unknown'
})

// Methods
const initAudio = (filePath: string) => {
  if (audioElement) {
    audioElement.pause()
    audioElement.currentTime = 0
  }
  audioElement = new Audio(filePath)
  audioElement.loop = loopRingtone.value
  audioElement.volume = volume.value / 100
}

const playTone = (filePath: string) => {
  initAudio(filePath)
  if (audioElement) {
    audioElement.play().catch((error) => {
      console.error('Failed to play ringtone:', error)
    })
  }
}

const stopTone = () => {
  if (audioElement) {
    audioElement.pause()
    audioElement.currentTime = 0
  }
}

const selectRingtone = (id: string) => {
  selectedRingtone.value = id
  saveSettings()
}

const playPreview = (id: string) => {
  if (isPlaying.value && playingTone.value === id) {
    stopTone()
    isPlaying.value = false
    playingTone.value = null
    return
  }

  stopTone()

  const tone = ringtones.find((t) => t.id === id)
  if (tone) {
    playTone(tone.file)
    isPlaying.value = true
    playingTone.value = id

    // Auto-stop after 3 seconds
    setTimeout(() => {
      if (playingTone.value === id) {
        stopTone()
        isPlaying.value = false
        playingTone.value = null
      }
    }, 3000)
  }
}

const testRingtone = () => {
  if (isPlaying.value) {
    stopTone()
    isPlaying.value = false
    playingTone.value = null
    return
  }

  const tone = ringtones.find((t) => t.id === selectedRingtone.value)

  if (tone) {
    playTone(tone.file)
    isPlaying.value = true
    playingTone.value = selectedRingtone.value

    // Vibrate if enabled
    if (vibrateEnabled.value && navigator.vibrate) {
      navigator.vibrate([500, 250, 500, 250, 500])
    }

    // Auto-stop after 5 seconds
    setTimeout(() => {
      stopTone()
      isPlaying.value = false
      playingTone.value = null
    }, 5000)
  }
}

const handleVolumeChange = () => {
  saveSettings()

  // Update playing audio volume
  if (audioElement) {
    audioElement.volume = volume.value / 100
  }
}

const saveSettings = () => {
  const settings = {
    ringtone: selectedRingtone.value,
    volume: volume.value,
    loop: loopRingtone.value,
    vibrate: vibrateEnabled.value,
    notification: showNotification.value,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

const loadSettings = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const settings = JSON.parse(saved)
      selectedRingtone.value = settings.ringtone || 'classic-ring'
      volume.value = settings.volume ?? 80
      loopRingtone.value = settings.loop ?? true
      vibrateEnabled.value = settings.vibrate ?? true
      showNotification.value = settings.notification ?? false
    } catch (error) {
      console.error('Failed to load ringtone settings:', error)
    }
  }
}

// Watch for incoming calls and play ringtone
watch(callState, (newState, oldState) => {
  if (newState === 'incoming' && oldState !== 'incoming') {
    // Start ringing
    const tone = ringtones.find((t) => t.id === selectedRingtone.value)
    if (tone) {
      playTone(tone.file)
      isPlaying.value = true

      // Vibrate if enabled
      if (vibrateEnabled.value && navigator.vibrate) {
        const vibrationPattern = [500, 250, 500, 250, 500, 1000]
        const vibrateInterval = setInterval(() => {
          if (callState.value === 'incoming') {
            navigator.vibrate(vibrationPattern)
          } else {
            clearInterval(vibrateInterval)
          }
        }, 3000)
      }
    }
  } else if (oldState === 'incoming' && newState !== 'incoming') {
    // Stop ringing
    stopTone()
    isPlaying.value = false
    playingTone.value = null
  }
})

// Load settings on mount
onMounted(() => {
  loadSettings()
})

// Cleanup on unmount
onUnmounted(() => {
  stopTone()
  audioElement = null
})
</script>

<style scoped>
.ringtones-demo {
  max-width: 700px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0;
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

.ringtone-interface {
  padding: 1.5rem;
}

.ringtone-interface h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-primary, #333);
}

.ringtone-interface h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #333);
  font-size: 1rem;
}

.ringtone-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.ringtone-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-primary, white);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.ringtone-item:hover {
  border-color: var(--primary, #667eea);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.ringtone-item.active {
  border-color: var(--primary, #667eea);
  background: var(--primary-bg, #eff6ff);
}

.ringtone-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  color: var(--primary, #667eea);
}

.ringtone-icon svg {
  width: 100%;
  height: 100%;
}

.ringtone-info {
  flex: 1;
  min-width: 0;
}

.ringtone-name {
  font-weight: 600;
  color: var(--text-primary, #333);
  margin-bottom: 0.25rem;
}

.ringtone-desc {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.play-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--primary, #667eea);
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.play-button svg {
  width: 20px;
  height: 20px;
}

.play-button:hover:not(:disabled) {
  background: var(--primary-hover, #5568d3);
  transform: scale(1.05);
}

.play-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-control {
  background: var(--bg-primary, white);
  border-radius: 8px;
  border: 2px solid var(--border-color, #e5e7eb);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.slider-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slider-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-secondary, #6b7280);
}

.icon-inline {
  width: 16px;
  height: 16px;
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--slider-bg, #e5e7eb);
  outline: none;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary, #667eea);
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary, #667eea);
  cursor: pointer;
  border: none;
}

.slider-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary, #667eea);
  min-width: 45px;
  text-align: right;
}

.ringtone-options {
  background: var(--bg-primary, white);
  border-radius: 8px;
  border: 2px solid var(--border-color, #e5e7eb);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.option-item {
  margin-bottom: 1rem;
}

.option-item:last-child {
  margin-bottom: 0;
}

.option-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary, #333);
  cursor: pointer;
}

.option-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.test-section {
  background: var(--info-bg, #eff6ff);
  border: 2px solid var(--info-border, #3b82f6);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.test-desc {
  margin: 0 0 1rem 0;
  color: var(--info-text, #1e40af);
  font-size: 0.875rem;
  line-height: 1.6;
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

.btn-primary {
  background: var(--primary, #667eea);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #5568d3);
}

.incoming-call-demo {
  background: var(--success-bg, #d1fae5);
  border: 2px solid var(--success, #10b981);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.demo-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--success, #10b981);
  color: white;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.incoming-call-demo p {
  margin: 0;
  color: var(--success-text, #065f46);
  font-size: 0.875rem;
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #333);
}

.code-example pre {
  background: var(--code-bg, #1e1e1e);
  color: var(--code-text, #d4d4d4);
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
</style>
