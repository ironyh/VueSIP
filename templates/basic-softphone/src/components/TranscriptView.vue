<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import ToggleButton from 'primevue/togglebutton'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import { useTranscription, providerRegistry, WhisperProvider } from 'vuesip'

const props = defineProps<{
  isCallActive: boolean
  remoteDisplayName?: string
}>()

// Provider configuration
const showSettings = ref(false)
const selectedProvider = ref<'web-speech' | 'whisper'>('web-speech')
const whisperUrl = ref('ws://localhost:8765/transcribe')
const providerError = ref<string | null>(null)

const providerOptions = [
  { label: 'Browser (Web Speech)', value: 'web-speech' },
  { label: 'Whisper Server', value: 'whisper' },
]

// Register Whisper provider
onMounted(() => {
  if (!providerRegistry.has('whisper')) {
    providerRegistry.register('whisper', () => new WhisperProvider())
  }
})

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
  switchProvider,
  provider: currentProvider,
} = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
  localName: 'Me',
  remoteName: props.remoteDisplayName || 'Caller',
})

// Apply provider settings
async function applySettings() {
  providerError.value = null
  try {
    if (selectedProvider.value === 'whisper') {
      await switchProvider('whisper', {
        serverUrl: whisperUrl.value,
        model: 'base',
        language: 'en',
      })
    } else {
      await switchProvider('web-speech', { language: 'en-US' })
    }
    showSettings.value = false
  } catch (err) {
    providerError.value = err instanceof Error ? err.message : 'Connection failed'
  }
}

const isWhisper = computed(() => currentProvider.value === 'whisper')

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
        <span v-if="isWhisper" class="whisper-badge">Whisper</span>
      </div>
      <div class="header-right">
        <Button
          icon="pi pi-cog"
          class="p-button-text p-button-sm"
          :disabled="isTranscribing"
          @click="showSettings = !showSettings"
          v-tooltip.left="'Provider Settings'"
        />
        <Button
          :icon="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-up'"
          class="p-button-text p-button-sm"
          @click="isExpanded = !isExpanded"
        />
      </div>
    </div>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="settings-panel">
      <div class="settings-row">
        <label>Provider</label>
        <Dropdown
          v-model="selectedProvider"
          :options="providerOptions"
          option-label="label"
          option-value="value"
          class="provider-select"
        />
      </div>
      <div v-if="selectedProvider === 'whisper'" class="settings-row">
        <label>Server URL</label>
        <InputText
          v-model="whisperUrl"
          placeholder="ws://localhost:8765/transcribe"
          class="url-input"
        />
      </div>
      <div v-if="providerError" class="error-msg">
        <i class="pi pi-exclamation-triangle" /> {{ providerError }}
      </div>
      <div class="settings-actions">
        <Button label="Cancel" class="p-button-text p-button-sm" @click="showSettings = false" />
        <Button label="Apply" class="p-button-sm" @click="applySettings" />
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

.whisper-badge {
  padding: 2px 6px;
  background: var(--blue-500);
  color: white;
  border-radius: 4px;
  font-size: 0.625rem;
}

.settings-panel {
  padding: 12px;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-300);
}

.settings-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.settings-row label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.provider-select,
.url-input {
  width: 100%;
  font-size: 0.875rem;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--red-50);
  color: var(--red-700);
  border-radius: 4px;
  font-size: 0.75rem;
  margin-bottom: 8px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
