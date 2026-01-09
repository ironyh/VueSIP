<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import Button from 'primevue/button'
import ToggleButton from 'primevue/togglebutton'
import { useTranscription } from 'vuesip'

const props = defineProps<{
  isCallActive: boolean
  remoteDisplayName?: string
}>()

// Transcription composable - simple setup for personal use
const {
  isTranscribing,
  transcript,
  currentUtterance,
  start,
  stop,
  clear,
  exportTranscript,
  setParticipantName,
} = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
  localName: 'Me',
  remoteName: props.remoteDisplayName || 'Caller',
})

// UI state
const transcriptRef = ref<HTMLElement | null>(null)
const isExpanded = ref(false)

// Display entries - show last 5 in compact mode, all in expanded
const displayEntries = computed(() => {
  if (isExpanded.value) {
    return transcript.value
  }
  return transcript.value.slice(-5)
})

// Update remote participant name when it changes
watch(
  () => props.remoteDisplayName,
  (newName) => {
    if (newName) {
      setParticipantName('remote', newName)
    }
  }
)

// Auto-start/stop with call
watch(
  () => props.isCallActive,
  async (active) => {
    if (active && !isTranscribing.value) {
      try {
        await start()
      } catch (err) {
        console.error('Failed to start transcription:', err)
      }
    } else if (!active && isTranscribing.value) {
      stop()
    }
  }
)

// Auto-scroll transcript
watch(
  transcript,
  async () => {
    await nextTick()
    if (transcriptRef.value) {
      transcriptRef.value.scrollTop = transcriptRef.value.scrollHeight
    }
  },
  { deep: true }
)

function handleExport() {
  const content = exportTranscript('txt')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `call-transcript-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="transcript-view" :class="{ expanded: isExpanded }">
    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <i class="pi pi-comments" />
        <span>Transcript</span>
        <span v-if="isTranscribing" class="live-badge">LIVE</span>
      </div>
      <div class="header-right">
        <Button
          :icon="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
          class="p-button-text p-button-sm"
          @click="isExpanded = !isExpanded"
        />
      </div>
    </div>

    <!-- Transcript Content -->
    <div ref="transcriptRef" class="transcript-content">
      <div v-if="displayEntries.length === 0 && !currentUtterance" class="empty-state">
        <p>Transcript will appear here</p>
      </div>

      <div
        v-for="entry in displayEntries"
        :key="entry.id"
        :class="['entry', `speaker-${entry.speaker}`]"
      >
        <span class="entry-speaker">{{ entry.participantName || entry.speaker }}</span>
        <span class="entry-time">{{ formatTime(entry.timestamp) }}</span>
        <p class="entry-text">{{ entry.text }}</p>
      </div>

      <!-- Current utterance -->
      <div v-if="currentUtterance" class="entry interim">
        <span class="entry-speaker">...</span>
        <p class="entry-text">{{ currentUtterance }}</p>
      </div>
    </div>

    <!-- Footer Controls -->
    <div class="view-footer">
      <ToggleButton
        v-model="isTranscribing"
        on-icon="pi pi-stop"
        off-icon="pi pi-play"
        on-label=""
        off-label=""
        class="toggle-btn"
        @change="isTranscribing ? stop() : start()"
      />
      <Button
        icon="pi pi-trash"
        class="p-button-text p-button-sm"
        :disabled="transcript.length === 0"
        @click="clear()"
      />
      <Button
        icon="pi pi-download"
        class="p-button-text p-button-sm"
        :disabled="transcript.length === 0"
        @click="handleExport"
      />
    </div>
  </div>
</template>

<style scoped>
.transcript-view {
  display: flex;
  flex-direction: column;
  background: var(--surface-100);
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
  transition: max-height 0.3s ease;
}

.transcript-view.expanded {
  max-height: 400px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--surface-200);
  font-size: 0.75rem;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-left i {
  font-size: 0.875rem;
  color: var(--primary-500);
}

.live-badge {
  padding: 2px 6px;
  background: var(--green-500);
  color: white;
  border-radius: 4px;
  font-size: 0.625rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.transcript-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-secondary);
  font-size: 0.75rem;
}

.empty-state p {
  margin: 0;
}

.entry {
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
}

.speaker-local {
  background: var(--primary-100);
  margin-left: 20px;
}

.speaker-remote {
  background: var(--surface-card);
  margin-right: 20px;
}

.interim {
  opacity: 0.6;
  font-style: italic;
}

.entry-speaker {
  font-weight: 600;
  color: var(--primary-700);
  text-transform: uppercase;
  font-size: 0.625rem;
}

.speaker-remote .entry-speaker {
  color: var(--text-color-secondary);
}

.entry-time {
  float: right;
  font-size: 0.625rem;
  color: var(--text-color-secondary);
}

.entry-text {
  margin: 4px 0 0;
  line-height: 1.3;
}

.view-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: var(--surface-200);
  border-top: 1px solid var(--surface-300);
}

.toggle-btn {
  width: 32px;
  height: 32px;
}
</style>
