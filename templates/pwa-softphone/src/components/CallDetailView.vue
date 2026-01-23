<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCallHistory } from 'vuesip'
import type { TranscriptEntry } from 'vuesip'
import { useTranscriptPersistence } from '../composables/useTranscriptPersistence'
import { useCallRecording } from '../composables/useCallRecording'

const props = defineProps<{
  callId: string
}>()

const emit = defineEmits<{
  back: []
}>()

const callHistory = useCallHistory()
const transcriptPersistence = useTranscriptPersistence()
const callRecording = useCallRecording()

// State
const transcript = ref<TranscriptEntry[] | null>(null)
const recordingUrl = ref<string | null>(null)
const loading = ref(true)

// Get call details from history
const callEntry = computed(() => {
  return callHistory.history.value.find((entry) => entry.id === props.callId)
})

// Load transcript and recording
onMounted(async () => {
  loading.value = true
  try {
    // Load transcript
    const transcriptData = await transcriptPersistence.getTranscript(props.callId)
    transcript.value = transcriptData

    // Load recording
    const url = await callRecording.getRecordingUrl(props.callId)
    recordingUrl.value = url
  } catch (error) {
    console.error('Failed to load call data:', error)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (recordingUrl.value) {
    URL.revokeObjectURL(recordingUrl.value)
  }
})

// Export transcript
function exportTranscript(format: 'txt' | 'json' | 'srt') {
  if (!transcript.value || transcript.value.length === 0) return

  const content = transcriptPersistence.exportTranscript(transcript.value, format)
  const blob = new Blob([content], {
    type: format === 'json' ? 'application/json' : 'text/plain',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcript-${props.callId}-${format}.${format === 'json' ? 'json' : format === 'srt' ? 'srt' : 'txt'}`
  a.click()
  URL.revokeObjectURL(url)
}

// Format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Format timestamp
function formatTime(ms: number): string {
  const date = new Date(ms)
  const mins = date.getMinutes().toString().padStart(2, '0')
  const secs = date.getSeconds().toString().padStart(2, '0')
  return `${mins}:${secs}`
}
</script>

<template>
  <div class="call-detail-view">
    <!-- Header -->
    <div class="detail-header">
      <button class="back-btn" @click="emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2>Call Details</h2>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else-if="callEntry" class="detail-content">
      <!-- Call Info -->
      <div class="detail-section">
        <h3>Call Information</h3>
        <div class="info-item">
          <span class="info-label">Contact</span>
          <span class="info-value">{{ callEntry.remoteDisplayName || callEntry.remoteUri }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Direction</span>
          <span class="info-value">{{
            callEntry.direction === 'incoming' ? 'Incoming' : 'Outgoing'
          }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Date & Time</span>
          <span class="info-value">{{ new Date(callEntry.startTime).toLocaleString() }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Duration</span>
          <span class="info-value">{{ formatDuration(callEntry.duration) }}</span>
        </div>
      </div>

      <!-- Transcript -->
      <div v-if="transcript && transcript.length > 0" class="detail-section">
        <div class="section-header">
          <h3>Transcript</h3>
          <div class="export-buttons">
            <button class="export-btn" @click="exportTranscript('txt')">TXT</button>
            <button class="export-btn" @click="exportTranscript('json')">JSON</button>
            <button class="export-btn" @click="exportTranscript('srt')">SRT</button>
          </div>
        </div>
        <div class="transcript-content">
          <div
            v-for="entry in transcript"
            :key="entry.id"
            class="transcript-entry"
            :class="entry.speaker"
          >
            <div class="entry-header">
              <span class="speaker-label">{{ entry.participantName || entry.speaker }}</span>
              <span class="entry-time">{{ formatTime(entry.timestamp) }}</span>
            </div>
            <div class="entry-text">{{ entry.text }}</div>
          </div>
        </div>
      </div>

      <div v-else class="detail-section">
        <p class="empty-message">No transcript available for this call.</p>
      </div>

      <!-- Recording -->
      <div v-if="recordingUrl" class="detail-section">
        <h3>Recording</h3>
        <audio :src="recordingUrl" controls class="recording-player"></audio>
      </div>
    </div>

    <div v-else class="error-message">Call not found</div>
  </div>
</template>

<style scoped>
.call-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.back-btn svg {
  width: 20px;
  height: 20px;
}

.detail-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.loading,
.error-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.detail-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-bottom: 1rem;
}

.detail-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.export-buttons {
  display: flex;
  gap: 0.5rem;
}

.export-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-primary);
}

.transcript-content {
  max-height: 400px;
  overflow-y: auto;
}

.transcript-entry {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.transcript-entry:last-child {
  border-bottom: none;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.speaker-label {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.entry-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.entry-text {
  color: var(--text-primary);
  line-height: 1.5;
}

.empty-message {
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 2rem;
}

.recording-player {
  width: 100%;
  margin-top: 0.5rem;
}
</style>
