<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { useLocalRecording, useRecordingIndicator } from 'vuesip'

const props = defineProps<{
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isCallActive: boolean
}>()

// Recording composable
const {
  state: recordingState,
  isRecording,
  isPaused,
  recordingData,
  error: recordingError,
  start: startRecording,
  pause: pauseRecording,
  resume: resumeRecording,
  stop: stopRecording,
  download: downloadRecording,
  clear: clearRecording,
  isSupported,
} = useLocalRecording({
  mimeType: 'audio/webm',
  filenamePrefix: 'vuesip-call',
})

// Recording indicator composable
const {
  formattedDuration,
  indicatorStyle,
  setRecordingState,
  reset: resetIndicator,
} = useRecordingIndicator()

// Check if recording is supported
const canRecord = computed(() => isSupported())

// Combine local and remote streams for recording
function getCombinedStream(): MediaStream | null {
  const tracks: MediaStreamTrack[] = []

  // Add local audio tracks
  if (props.localStream) {
    props.localStream.getAudioTracks().forEach((track) => {
      tracks.push(track)
    })
  }

  // Add remote audio tracks
  if (props.remoteStream) {
    props.remoteStream.getAudioTracks().forEach((track) => {
      tracks.push(track)
    })
  }

  if (tracks.length === 0) return null

  return new MediaStream(tracks)
}

// Start recording the call
function handleStartRecording() {
  const stream = getCombinedStream()
  if (!stream) {
    console.error('No audio streams available for recording')
    return
  }

  startRecording(stream, {
    startedAt: new Date().toISOString(),
  })
  setRecordingState('recording')
}

// Pause recording
function handlePauseRecording() {
  pauseRecording()
  setRecordingState('paused')
}

// Resume recording
function handleResumeRecording() {
  resumeRecording()
  setRecordingState('recording')
}

// Stop recording
async function handleStopRecording() {
  await stopRecording()
  setRecordingState('stopped')
}

// Download the recording
function handleDownload() {
  downloadRecording()
}

// Clear recording data
function handleClear() {
  clearRecording()
  resetIndicator()
}

// Auto-stop recording when call ends
watch(
  () => props.isCallActive,
  (active) => {
    if (!active && isRecording.value) {
      handleStopRecording()
    }
  }
)

// Cleanup on unmount
onUnmounted(() => {
  if (isRecording.value || isPaused.value) {
    stopRecording()
  }
})
</script>

<template>
  <div class="recording-controls">
    <!-- Recording indicator -->
    <div v-if="isRecording || isPaused" class="recording-status">
      <div class="recording-indicator" :style="indicatorStyle" />
      <span class="recording-duration">{{ formattedDuration }}</span>
      <span v-if="isPaused" class="paused-label">PAUSED</span>
    </div>

    <!-- Recording actions -->
    <div class="recording-actions">
      <!-- Start/Stop recording -->
      <template v-if="!isRecording && !isPaused && !recordingData">
        <Button
          v-if="canRecord"
          icon="pi pi-circle-fill"
          class="p-button-rounded p-button-danger p-button-sm"
          label="Record"
          :disabled="!isCallActive"
          @click="handleStartRecording"
        />
        <span v-else class="not-supported">Recording not supported</span>
      </template>

      <!-- Active recording controls -->
      <template v-else-if="isRecording || isPaused">
        <Button
          v-if="isRecording"
          icon="pi pi-pause"
          class="p-button-rounded p-button-warning p-button-sm"
          label="Pause"
          @click="handlePauseRecording"
        />
        <Button
          v-if="isPaused"
          icon="pi pi-play"
          class="p-button-rounded p-button-info p-button-sm"
          label="Resume"
          @click="handleResumeRecording"
        />
        <Button
          icon="pi pi-stop"
          class="p-button-rounded p-button-secondary p-button-sm"
          label="Stop"
          @click="handleStopRecording"
        />
      </template>

      <!-- Post-recording actions -->
      <template v-else-if="recordingData">
        <Button
          icon="pi pi-download"
          class="p-button-rounded p-button-success p-button-sm"
          label="Download"
          @click="handleDownload"
        />
        <Button
          icon="pi pi-times"
          class="p-button-rounded p-button-secondary p-button-sm"
          label="Clear"
          @click="handleClear"
        />
      </template>
    </div>

    <!-- Error display -->
    <div v-if="recordingError" class="recording-error">
      {{ recordingError.message }}
    </div>
  </div>
</template>

<style scoped>
.recording-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--surface-200);
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recording-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.recording-duration {
  font-family: monospace;
  font-size: 1rem;
  color: var(--text-color);
}

.paused-label {
  font-size: 0.75rem;
  color: var(--yellow-500);
  font-weight: 600;
  text-transform: uppercase;
}

.recording-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.not-supported {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.recording-error {
  font-size: 0.75rem;
  color: var(--red-500);
  text-align: center;
}
</style>
