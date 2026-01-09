<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Button from 'primevue/button'
import ToggleButton from 'primevue/togglebutton'
import Dropdown from 'primevue/dropdown'
import Badge from 'primevue/badge'
import { useTranscription } from 'vuesip'
import type { TranscriptEntry, KeywordMatch } from 'vuesip'

const props = defineProps<{
  isCallActive: boolean
  remoteDisplayName?: string
}>()

const emit = defineEmits<{
  keywordDetected: [match: KeywordMatch]
  transcriptExported: [format: string, content: string]
}>()

// Transcription composable with agent-assist keywords
const {
  isTranscribing,
  transcript,
  currentUtterance,
  start,
  stop,
  clear,
  localEnabled,
  remoteEnabled,
  exportTranscript,
  setParticipantName,
} = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
  localName: 'Agent',
  remoteName: props.remoteDisplayName || 'Customer',
  // Agent-assist keywords for common scenarios
  keywords: [
    { phrase: 'help', action: 'assist' },
    { phrase: 'cancel', action: 'retention' },
    { phrase: /refund|money back/i, action: 'escalate' },
    { phrase: /supervisor|manager/i, action: 'escalate' },
    { phrase: /complaint|unhappy|frustrated/i, action: 'empathy' },
  ],
  // PII redaction for compliance
  redaction: {
    enabled: true,
    patterns: ['credit-card', 'ssn', 'phone-number', 'email'],
    replacement: '[REDACTED]',
  },
  onKeywordDetected: (match) => {
    agentAssistTriggers.value.push({
      action: match.rule.action,
      text: match.matchedText,
      timestamp: Date.now(),
    })
    emit('keywordDetected', match)
  },
})

// Agent assist triggers
interface AssistTrigger {
  action: string
  text: string
  timestamp: number
}
const agentAssistTriggers = ref<AssistTrigger[]>([])

// UI state
const transcriptRef = ref<HTMLElement | null>(null)
const showExportOptions = ref(false)
const exportFormats = [
  { label: 'JSON', value: 'json' },
  { label: 'Text', value: 'txt' },
  { label: 'SRT Subtitles', value: 'srt' },
  { label: 'WebVTT', value: 'vtt' },
  { label: 'CSV', value: 'csv' },
]

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

function handleExport(format: string) {
  const content = exportTranscript(format as 'json' | 'txt' | 'srt' | 'vtt' | 'csv')
  emit('transcriptExported', format, content)

  // Download file
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcript-${Date.now()}.${format}`
  a.click()
  URL.revokeObjectURL(url)

  showExportOptions.value = false
}

function dismissAssist(index: number) {
  agentAssistTriggers.value.splice(index, 1)
}

function getAssistIcon(action: string): string {
  switch (action) {
    case 'assist':
      return 'pi pi-question-circle'
    case 'retention':
      return 'pi pi-exclamation-triangle'
    case 'escalate':
      return 'pi pi-arrow-up'
    case 'empathy':
      return 'pi pi-heart'
    default:
      return 'pi pi-info-circle'
  }
}

function getAssistSeverity(action: string): string {
  switch (action) {
    case 'escalate':
      return 'danger'
    case 'retention':
      return 'warning'
    case 'empathy':
      return 'info'
    default:
      return 'secondary'
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>

<template>
  <div class="transcription-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-title">
        <i class="pi pi-comments" />
        <span>Live Transcription</span>
        <Badge v-if="isTranscribing" value="LIVE" severity="success" />
      </div>
      <div class="header-controls">
        <ToggleButton
          v-model="localEnabled"
          on-label="Agent"
          off-label="Agent"
          on-icon="pi pi-microphone"
          off-icon="pi pi-microphone-slash"
          class="toggle-small"
        />
        <ToggleButton
          v-model="remoteEnabled"
          on-label="Customer"
          off-label="Customer"
          on-icon="pi pi-volume-up"
          off-icon="pi pi-volume-off"
          class="toggle-small"
        />
      </div>
    </div>

    <!-- Agent Assist Alerts -->
    <div v-if="agentAssistTriggers.length > 0" class="assist-alerts">
      <div
        v-for="(trigger, index) in agentAssistTriggers"
        :key="trigger.timestamp"
        :class="['assist-alert', `assist-${getAssistSeverity(trigger.action)}`]"
      >
        <i :class="getAssistIcon(trigger.action)" />
        <div class="assist-content">
          <span class="assist-action">{{ trigger.action.toUpperCase() }}</span>
          <span class="assist-text">"{{ trigger.text }}"</span>
        </div>
        <Button
          icon="pi pi-times"
          class="p-button-text p-button-sm"
          @click="dismissAssist(index)"
        />
      </div>
    </div>

    <!-- Transcript Display -->
    <div ref="transcriptRef" class="transcript-container">
      <div v-if="transcript.length === 0 && !currentUtterance" class="transcript-empty">
        <i class="pi pi-microphone" />
        <p>Transcript will appear here during the call</p>
      </div>

      <div
        v-for="entry in transcript"
        :key="entry.id"
        :class="['transcript-entry', `speaker-${entry.speaker}`]"
      >
        <div class="entry-header">
          <span class="speaker-name">{{ entry.participantName || entry.speaker }}</span>
          <span class="entry-time">{{ formatTime(entry.timestamp) }}</span>
        </div>
        <p class="entry-text">{{ entry.text }}</p>
      </div>

      <!-- Current utterance (interim) -->
      <div v-if="currentUtterance" class="transcript-entry interim">
        <div class="entry-header">
          <span class="speaker-name">...</span>
        </div>
        <p class="entry-text">{{ currentUtterance }}</p>
      </div>
    </div>

    <!-- Footer Controls -->
    <div class="panel-footer">
      <Button
        v-if="!isTranscribing && isCallActive"
        icon="pi pi-play"
        label="Start"
        class="p-button-sm p-button-success"
        @click="start()"
      />
      <Button
        v-if="isTranscribing"
        icon="pi pi-stop"
        label="Stop"
        class="p-button-sm p-button-secondary"
        @click="stop()"
      />
      <Button
        icon="pi pi-trash"
        label="Clear"
        class="p-button-sm p-button-text"
        :disabled="transcript.length === 0"
        @click="clear()"
      />
      <div class="export-section">
        <Dropdown
          v-model="showExportOptions"
          :options="exportFormats"
          option-label="label"
          option-value="value"
          placeholder="Export"
          class="export-dropdown"
          :disabled="transcript.length === 0"
          @change="(e: { value: string }) => handleExport(e.value)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.transcription-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-card);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-border);
  background: var(--surface-section);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.header-title i {
  color: var(--primary-500);
}

.header-controls {
  display: flex;
  gap: 8px;
}

.toggle-small {
  font-size: 0.75rem;
}

.assist-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--surface-section);
  border-bottom: 1px solid var(--surface-border);
}

.assist-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.assist-secondary {
  background: var(--surface-100);
  border-left: 3px solid var(--text-color-secondary);
}

.assist-info {
  background: var(--blue-50);
  border-left: 3px solid var(--blue-500);
}

.assist-warning {
  background: var(--orange-50);
  border-left: 3px solid var(--orange-500);
}

.assist-danger {
  background: var(--red-50);
  border-left: 3px solid var(--red-500);
}

.assist-alert i {
  font-size: 1.25rem;
}

.assist-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.assist-action {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.assist-text {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.transcript-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transcript-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-secondary);
  text-align: center;
}

.transcript-empty i {
  font-size: 2rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.transcript-entry {
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 85%;
}

.speaker-local {
  align-self: flex-end;
  background: var(--primary-100);
  border-bottom-right-radius: 4px;
}

.speaker-remote {
  align-self: flex-start;
  background: var(--surface-100);
  border-bottom-left-radius: 4px;
}

.interim {
  opacity: 0.6;
  font-style: italic;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.speaker-name {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--primary-700);
}

.speaker-remote .speaker-name {
  color: var(--text-color-secondary);
}

.entry-time {
  font-size: 0.625rem;
  color: var(--text-color-secondary);
}

.entry-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.panel-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-section);
}

.export-section {
  margin-left: auto;
}

.export-dropdown {
  font-size: 0.875rem;
}
</style>
