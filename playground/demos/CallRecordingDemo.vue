<template>
  <div class="call-recording-demo">
    <h2>
      <svg
        class="icon-inline"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
      Call Recording
    </h2>
    <p class="description">
      Record and playback call audio with duration tracking and file management.
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
    <div class="status-section">
      <div :class="['status-badge', connectionState]">
        {{ connectionState.toUpperCase() }}
      </div>
      <div v-if="!isConnected" class="connection-hint">
        Configure SIP credentials in <strong>Settings</strong> or <strong>Basic Call</strong> demo
      </div>
    </div>

    <!-- Call Control -->
    <div v-if="isConnected" class="call-section">
      <h3>Make a Call</h3>
      <div class="form-group">
        <label for="rec-target-uri">Target SIP URI</label>
        <input
          id="rec-target-uri"
          v-model="targetUri"
          type="text"
          placeholder="sip:target@example.com"
          @keyup.enter="makeCall"
          aria-required="true"
        />
      </div>
      <button @click="makeCall" :disabled="hasActiveCall" class="w-full sm:w-auto">
        <svg aria-hidden="true" class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
          />
        </svg>
        Make Call
      </button>
    </div>

    <!-- Active Call with Recording -->
    <div v-if="effectiveHasActiveCall" class="active-call-section">
      <h3>Active Call: {{ effectiveCallState }}</h3>

      <div class="call-info">
        <div class="info-item">
          <span class="label">Remote URI:</span>
          <span class="value">{{ currentCall?.remoteUri || 'Unknown' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Call Duration:</span>
          <span class="value">{{ callDuration }}</span>
        </div>
      </div>

      <!-- Recording Controls -->
      <div class="recording-controls">
        <h4>Recording</h4>

        <div v-if="!isRecording && !recordedBlob" class="recording-status" role="status">
          <svg aria-hidden="true" class="indicator idle" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>Ready to record</span>
        </div>

        <div v-if="isRecording" class="recording-status recording" role="status" aria-live="polite">
          <svg aria-hidden="true" class="indicator pulse" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span>Recording: {{ recordingDuration }}</span>
        </div>

        <div v-if="recordedBlob && !isRecording" class="recording-status" role="status">
          <svg
            class="indicator"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Recording saved ({{ recordingSize }})</span>
        </div>

        <div class="button-group flex flex-column sm:flex-row gap-2">
          <button
            v-if="!isRecording"
            @click="startRecording"
            :disabled="!canRecord"
            class="record-btn w-full sm:flex-1"
          >
            <svg aria-hidden="true" class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"
              />
            </svg>
            <span class="sm:inline hidden">Start </span>Record<span class="sm:inline hidden"
              >ing</span
            >
          </button>
          <button v-if="isRecording" @click="stopRecording" class="stop-btn w-full sm:flex-1">
            <svg aria-hidden="true" class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
            Stop<span class="sm:inline hidden"> Recording</span>
          </button>
        </div>

        <!-- Recording Options -->
        <div class="recording-options">
          <label>
            <Checkbox v-model="autoRecord" binary />
            Auto-record calls
          </label>
          <label>
            <Checkbox v-model="recordRemoteOnly" binary />
            Record remote audio only
          </label>
        </div>
      </div>

      <!-- Call Controls -->
      <div class="button-group flex flex-column sm:flex-row gap-2">
        <button @click="answer" v-if="callState === 'incoming'" class="w-full sm:flex-1">
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
        <button @click="hangup" class="danger w-full sm:flex-1">
          <svg aria-hidden="true" class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
            />
          </svg>
          Hang Up
        </button>
      </div>
    </div>

    <!-- Recordings List -->
    <div v-if="recordings.length > 0" class="recordings-section">
      <h3>Saved Recordings ({{ recordings.length }})</h3>

      <div class="recordings-list">
        <div v-for="recording in recordings" :key="recording.id" class="recording-item">
          <div class="recording-info">
            <div class="recording-name">{{ recording.name }}</div>
            <div class="recording-meta">
              <span>{{ recording.duration }}</span>
              <span>{{ recording.size }}</span>
              <span>{{ recording.timestamp }}</span>
            </div>
          </div>

          <div class="recording-controls">
            <button
              @click="playRecording(recording)"
              :disabled="currentlyPlaying === recording.id"
              class="play-btn"
            >
              <svg
                v-if="currentlyPlaying === recording.id"
                class="icon-inline"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <svg v-else class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {{ currentlyPlaying === recording.id ? 'Playing' : 'Play' }}
            </button>
            <button
              @click="downloadRecording(recording)"
              class="download-btn"
              aria-label="Download recording"
            >
              <svg aria-hidden="true" class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"
                />
              </svg>
              Download
            </button>
            <button
              @click="deleteRecording(recording.id)"
              class="delete-btn"
              aria-label="Delete recording"
            >
              <svg aria-hidden="true" class="icon-inline" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div class="recordings-actions">
        <button @click="clearAllRecordings" class="danger">Clear All Recordings</button>
      </div>
    </div>

    <!-- Audio Player (hidden) -->
    <audio ref="audioPlayer" @ended="onPlaybackEnded"></audio>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useCallSession } from '../../src/composables/useCallSession'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Checkbox } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Configuration
const targetUri = ref('sip:1000@example.com')

// SIP Client - use shared playground instance (credentials managed globally)
const {
  connectionState: realConnectionState,
  isConnected: realIsConnected,
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
  session: currentCall,
  state: callState,
  isActive: hasActiveCall,
} = useCallSession(sipClientRef)

// Recording State
const isRecording = ref(false)
const recordedBlob = ref<Blob | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordingStartTime = ref<number>(0)
const recordingDuration = ref('00:00')
const recordingTimer = ref<number | null>(null)
const audioChunks = ref<Blob[]>([])

// Recording Options
const autoRecord = ref(false)
const recordRemoteOnly = ref(false)

// Recordings Storage
interface SavedRecording {
  id: string
  name: string
  blob: Blob
  duration: string
  size: string
  timestamp: string
  date: Date
}

const recordings = ref<SavedRecording[]>([])
const currentlyPlaying = ref<string | null>(null)
const audioPlayer = ref<HTMLAudioElement | null>(null)

// Call Duration Timer
const callStartTime = ref<number>(0)
const callDuration = ref('00:00')
const callTimer = ref<number | null>(null)

// Computed
const canRecord = computed(() => {
  return hasActiveCall.value && callState.value === 'active' && !isRecording.value
})

const recordingSize = computed(() => {
  if (!recordedBlob.value) return '0 KB'
  const kb = Math.round(recordedBlob.value.size / 1024)
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(2)} MB`
})

// Format time helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Make Call
const makeCall = async () => {
  if (!targetUri.value) return
  await makeCallFn(targetUri.value)
}

// Start Call Duration Timer
const startCallTimer = () => {
  callStartTime.value = Date.now()
  callTimer.value = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - callStartTime.value) / 1000)
    callDuration.value = formatTime(elapsed)
  }, 1000)
}

// Stop Call Duration Timer
const stopCallTimer = () => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
  callDuration.value = '00:00'
}

// Start Recording Duration Timer
const startRecordingTimer = () => {
  recordingStartTime.value = Date.now()
  recordingTimer.value = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000)
    recordingDuration.value = formatTime(elapsed)
  }, 1000)
}

// Stop Recording Duration Timer
const stopRecordingTimer = () => {
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value)
    recordingTimer.value = null
  }
}

// Start Recording
const startRecording = async () => {
  if (!currentCall.value) return

  try {
    // Get the remote stream from the call
    const remoteStream = currentCall.value.remoteStream
    if (!remoteStream) {
      console.error('No remote stream available')
      return
    }

    // Create a MediaStream to record
    let streamToRecord: MediaStream

    if (recordRemoteOnly.value) {
      // Record only remote audio
      streamToRecord = remoteStream
    } else {
      // Record both local and remote audio (mixed)
      const localStream = currentCall.value.localStream
      if (!localStream) {
        streamToRecord = remoteStream
      } else {
        // Mix both streams
        const audioContext = new AudioContext()
        const destination = audioContext.createMediaStreamDestination()

        const remoteSource = audioContext.createMediaStreamSource(remoteStream)
        remoteSource.connect(destination)

        const localSource = audioContext.createMediaStreamSource(localStream)
        localSource.connect(destination)

        streamToRecord = destination.stream
      }
    }

    // Create MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
    mediaRecorder.value = new MediaRecorder(streamToRecord, {
      mimeType,
    })

    audioChunks.value = []

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      const blob = new Blob(audioChunks.value, { type: mimeType })
      recordedBlob.value = blob
      saveRecording(blob)
    }

    mediaRecorder.value.start()
    isRecording.value = true
    startRecordingTimer()

    console.log('Recording started')
  } catch (error) {
    console.error('Failed to start recording:', error)
  }
}

// Stop Recording
const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
    stopRecordingTimer()
    console.log('Recording stopped')
  }
}

// Save Recording
const saveRecording = (blob: Blob) => {
  const recording: SavedRecording = {
    id: `recording-${Date.now()}`,
    name: `Call Recording ${new Date().toLocaleString()}`,
    blob,
    duration: recordingDuration.value,
    size: recordingSize.value,
    timestamp: new Date().toLocaleTimeString(),
    date: new Date(),
  }

  recordings.value.unshift(recording)

  // Limit to 10 recordings
  if (recordings.value.length > 10) {
    recordings.value = recordings.value.slice(0, 10)
  }

  console.log('Recording saved:', recording.name)
}

// Play Recording
const playRecording = (recording: SavedRecording) => {
  if (!audioPlayer.value) return

  if (currentlyPlaying.value === recording.id) {
    // Stop playback
    audioPlayer.value.pause()
    audioPlayer.value.currentTime = 0
    currentlyPlaying.value = null
  } else {
    // Start playback
    const url = URL.createObjectURL(recording.blob)
    audioPlayer.value.src = url
    audioPlayer.value.play()
    currentlyPlaying.value = recording.id
  }
}

// Playback Ended
const onPlaybackEnded = () => {
  currentlyPlaying.value = null
}

// Download Recording
const downloadRecording = (recording: SavedRecording) => {
  const url = URL.createObjectURL(recording.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${recording.name}.webm`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Delete Recording
const deleteRecording = (id: string) => {
  const index = recordings.value.findIndex((r) => r.id === id)
  if (index !== -1) {
    recordings.value.splice(index, 1)
  }
}

// Clear All Recordings
const clearAllRecordings = () => {
  if (confirm('Are you sure you want to delete all recordings?')) {
    recordings.value = []
  }
}

// Watch call state
watch(callState, (newState, oldState) => {
  if (newState === 'active' && oldState !== 'active') {
    // Call became active
    startCallTimer()

    // Auto-record if enabled
    if (autoRecord.value) {
      setTimeout(() => {
        startRecording()
      }, 500) // Small delay to ensure streams are ready
    }
  } else if (newState === 'terminated' || newState === 'disconnected') {
    // Call ended
    stopCallTimer()

    // Stop recording if active
    if (isRecording.value) {
      stopRecording()
    }
  }
})

// Cleanup
onUnmounted(() => {
  stopCallTimer()
  stopRecordingTimer()
  if (isRecording.value) {
    stopRecording()
  }
})
</script>

<style scoped>
.call-recording-demo {
  max-width: 800px;
  margin: 0 auto;
}

.description {
  color: var(--text-color-secondary);
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.connection-hint {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  padding: 0.5rem 0.75rem;
  background: var(--yellow-50);
  border-radius: 6px;
  border: 1px solid var(--yellow-200);
}

.connection-hint strong {
  color: var(--yellow-900);
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: var(--green-500);
  color: var(--surface-0);
}

.status-badge.disconnected {
  background-color: var(--surface-400);
  color: var(--surface-0);
}

.status-badge.connecting {
  background-color: var(--yellow-500);
  color: var(--surface-0);
}

.config-section,
.call-section,
.active-call-section,
.recordings-section {
  background: var(--surface-section);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  font-size: 0.875rem;
}

button {
  padding: 0.625rem 1.25rem;
  background-color: var(--blue-500);
  color: var(--surface-0);
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: var(--blue-600);
}

button:disabled {
  background-color: var(--surface-400);
  cursor: not-allowed;
}

button.danger {
  background-color: var(--red-500);
}

button.danger:hover:not(:disabled) {
  background-color: var(--red-600);
}

.call-info {
  background: var(--surface-card);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.info-item .value {
  color: var(--text-color);
}

.recording-controls {
  background: var(--surface-card);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--surface-100);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.recording-status.recording {
  background: var(--red-50);
  color: var(--red-900);
}

.indicator {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.indicator.idle {
  color: var(--surface-400);
}

.icon-inline {
  width: 16px;
  height: 16px;
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
}

.indicator.pulse {
  animation: pulse 1.5s ease-in-out infinite;
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

.recording-options {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recording-options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.recording-options input[type='checkbox'] {
  width: auto;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.record-btn {
  background-color: var(--red-600);
}

.record-btn:hover:not(:disabled) {
  background-color: var(--red-700);
}

.stop-btn {
  background-color: var(--surface-600);
}

.stop-btn:hover:not(:disabled) {
  background-color: var(--surface-700);
}

.recordings-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.recording-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--surface-card);
  border-radius: 6px;
  padding: 1rem;
  border: 1px solid var(--surface-border);
}

@media (min-width: 640px) {
  .recording-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.recording-info {
  flex: 1;
}

.recording-name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.recording-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.recording-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.recording-controls button {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  flex: 1;
  min-width: 80px;
}

@media (min-width: 640px) {
  .recording-controls button {
    flex: 0 0 auto;
  }
}

.play-btn {
  background-color: var(--green-500);
}

.play-btn:hover:not(:disabled) {
  background-color: var(--green-600);
}

.download-btn {
  background-color: var(--blue-500);
}

.download-btn:hover:not(:disabled) {
  background-color: var(--blue-600);
}

.delete-btn {
  background-color: var(--red-500);
}

.delete-btn:hover:not(:disabled) {
  background-color: var(--red-600);
}

.recordings-actions {
  margin-top: 1rem;
}

/* Responsive Design - Mobile-First Patterns */
@media (max-width: 768px) {
  /* Status section: stack on mobile */
  .status-section {
    flex-direction: column;
    align-items: stretch;
  }

  /* Form inputs: larger touch targets */
  .form-group input {
    min-height: 44px;
    font-size: 1rem;
    padding: 0.75rem;
  }

  /* Buttons: full width on mobile */
  button {
    min-height: 44px;
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
  }

  /* Call info: better mobile spacing */
  .call-info {
    padding: 0.75rem;
  }

  .info-item {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 0;
  }

  .info-item .label {
    font-size: 0.875rem;
  }

  .info-item .value {
    font-weight: 600;
    font-size: 1rem;
  }

  /* Recording controls: stack on mobile */
  .recording-controls {
    padding: 0.75rem;
  }

  .recording-status {
    padding: 0.75rem;
    font-size: 0.875rem;
  }

  .indicator {
    width: 24px;
    height: 24px;
  }

  /* Recording options: better spacing */
  .recording-options label {
    padding: 0.5rem 0;
    font-size: 1rem;
  }

  .recording-options input[type='checkbox'] {
    width: 20px;
    height: 20px;
  }

  /* Recordings list: better mobile layout */
  .recordings-list {
    gap: 1rem;
  }

  .recording-item {
    padding: 1rem;
  }

  .recording-name {
    font-size: 1rem;
  }

  .recording-meta {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  /* Sections: tighter spacing */
  .config-section,
  .call-section,
  .active-call-section,
  .recordings-section {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  /* Connection hint: better mobile display */
  .connection-hint {
    font-size: 0.875rem;
    padding: 0.75rem;
  }

  /* Status badge: larger */
  .status-badge {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
  }

  /* Headings: better sizing */
  h3 {
    font-size: 1.25rem;
  }

  h4 {
    font-size: 1.125rem;
  }

  /* Recording controls: stack buttons */
  .recording-controls button {
    min-width: 100%;
  }

  /* Recordings actions: full width */
  .recordings-actions button {
    width: 100%;
  }
}

@media (max-width: 375px) {
  /* Description: smaller text */
  .description {
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  /* Very tight spacing on smallest screens */
  .config-section,
  .call-section,
  .active-call-section,
  .recordings-section {
    padding: 0.75rem;
  }

  /* Recording meta: stack on very small screens */
  .recording-meta {
    flex-direction: column;
    gap: 0.25rem;
  }

  /* Button text: show abbreviated on smallest */
  button .sm\:inline {
    display: none;
  }
}
</style>
