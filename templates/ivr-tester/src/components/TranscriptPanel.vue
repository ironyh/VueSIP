<script setup lang="ts">
/**
 * TranscriptPanel - Real-time transcription display
 *
 * Shows IVR voice prompts with timestamps,
 * associated DTMF inputs, and copy functionality.
 */
import { ref, computed, watch, nextTick } from 'vue'
import type { TranscriptEntry, DtmfEntry } from '@/composables/useIvrTester'
import Button from 'primevue/button'

interface Props {
  /** Transcript entries */
  entries: TranscriptEntry[]
  /** DTMF history for correlation */
  dtmfHistory?: DtmfEntry[]
  /** Current interim transcript */
  currentTranscript?: string
  /** Whether recording is active */
  isRecording?: boolean
  /** Auto-scroll to bottom */
  autoScroll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dtmfHistory: () => [],
  currentTranscript: '',
  isRecording: false,
  autoScroll: true,
})

const emit = defineEmits<{
  /** Emitted when an entry is clicked */
  (e: 'entry-click', entry: TranscriptEntry): void
  /** Emitted when copy is requested */
  (e: 'copy'): void
  /** Emitted when clear is requested */
  (e: 'clear'): void
}>()

// Local state
const transcriptContainer = ref<HTMLElement | null>(null)
const copiedMessage = ref(false)

// Combined and sorted entries (transcript + DTMF markers)
interface TimelineEntry {
  type: 'transcript' | 'dtmf'
  timestamp: number
  data: TranscriptEntry | DtmfEntry
}

const timelineEntries = computed((): TimelineEntry[] => {
  const entries: TimelineEntry[] = []

  // Add transcript entries
  for (const entry of props.entries) {
    entries.push({
      type: 'transcript',
      timestamp: entry.timestamp,
      data: entry,
    })
  }

  // Add DTMF entries as markers
  for (const entry of props.dtmfHistory) {
    entries.push({
      type: 'dtmf',
      timestamp: entry.timestamp,
      data: entry,
    })
  }

  // Sort by timestamp
  return entries.sort((a, b) => a.timestamp - b.timestamp)
})

// Auto-scroll to bottom when new entries arrive
watch(
  () => props.entries.length,
  () => {
    if (props.autoScroll) {
      nextTick(() => {
        if (transcriptContainer.value) {
          transcriptContainer.value.scrollTop = transcriptContainer.value.scrollHeight
        }
      })
    }
  }
)

/**
 * Format timestamp for display
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Get relative time from start
 */
function getRelativeTime(timestamp: number): string {
  if (props.entries.length === 0) return '0:00'

  const firstEntry = props.entries[0]
  if (!firstEntry) return '0:00'

  const diff = Math.floor((timestamp - firstEntry.timestamp) / 1000)
  const minutes = Math.floor(diff / 60)
  const seconds = diff % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Copy transcript to clipboard
 */
async function copyTranscript(): Promise<void> {
  const text = props.entries.map((e) => `[${formatTime(e.timestamp)}] ${e.text}`).join('\n')

  try {
    await navigator.clipboard.writeText(text)
    copiedMessage.value = true
    setTimeout(() => {
      copiedMessage.value = false
    }, 2000)
    emit('copy')
  } catch (error) {
    console.error('Failed to copy transcript:', error)
  }
}

/**
 * Handle entry click
 */
function handleEntryClick(entry: TranscriptEntry): void {
  emit('entry-click', entry)
}

/**
 * Handle clear
 */
function handleClear(): void {
  emit('clear')
}
</script>

<template>
  <div class="transcript-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-title">
        <i class="pi pi-microphone" />
        <span>Transcript</span>
        <span v-if="isRecording" class="recording-indicator">
          <span class="recording-dot" />
          Recording
        </span>
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-copy"
          class="p-button-text p-button-sm"
          :disabled="entries.length === 0"
          :label="copiedMessage ? 'Copied!' : undefined"
          @click="copyTranscript"
        />
        <Button
          icon="pi pi-trash"
          class="p-button-text p-button-sm p-button-danger"
          :disabled="entries.length === 0"
          @click="handleClear"
        />
      </div>
    </div>

    <!-- Transcript content -->
    <div ref="transcriptContainer" class="transcript-content">
      <div v-if="timelineEntries.length === 0 && !currentTranscript" class="empty-state">
        <i class="pi pi-volume-up" />
        <p>Waiting for voice prompts...</p>
      </div>

      <template v-else>
        <div
          v-for="item in timelineEntries"
          :key="`${item.type}-${item.data.id}`"
          class="timeline-entry"
          :class="item.type"
        >
          <!-- DTMF marker -->
          <template v-if="item.type === 'dtmf'">
            <div class="dtmf-marker">
              <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
              <span class="dtmf-badge">{{ (item.data as DtmfEntry).digit }}</span>
              <span class="dtmf-label">DTMF sent</span>
            </div>
          </template>

          <!-- Transcript entry -->
          <template v-else>
            <div
              class="transcript-entry"
              :class="{ interim: !(item.data as TranscriptEntry).isFinal }"
              @click="handleEntryClick(item.data as TranscriptEntry)"
            >
              <div class="entry-header">
                <span class="timestamp">{{ formatTime(item.timestamp) }}</span>
                <span class="relative-time">+{{ getRelativeTime(item.timestamp) }}</span>
                <span
                  v-if="(item.data as TranscriptEntry).confidence"
                  class="confidence"
                  :class="{
                    high: ((item.data as TranscriptEntry).confidence ?? 0) >= 0.9,
                    medium:
                      ((item.data as TranscriptEntry).confidence ?? 0) >= 0.7 &&
                      ((item.data as TranscriptEntry).confidence ?? 0) < 0.9,
                    low: ((item.data as TranscriptEntry).confidence ?? 0) < 0.7,
                  }"
                >
                  {{ Math.round(((item.data as TranscriptEntry).confidence ?? 0) * 100) }}%
                </span>
              </div>
              <div class="entry-text">
                {{ (item.data as TranscriptEntry).text }}
              </div>
            </div>
          </template>
        </div>

        <!-- Current/interim transcript -->
        <div v-if="currentTranscript" class="transcript-entry interim current">
          <div class="entry-header">
            <span class="timestamp">{{ formatTime(Date.now()) }}</span>
            <span class="interim-label">Listening...</span>
          </div>
          <div class="entry-text">
            {{ currentTranscript }}
            <span class="cursor-blink">|</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Stats footer -->
    <div v-if="entries.length > 0" class="panel-footer">
      <span>{{ entries.length }} entries</span>
      <span v-if="entries.length > 0"> Duration: {{ getRelativeTime(Date.now()) }} </span>
    </div>
  </div>
</template>

<style scoped>
.transcript-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface-ground);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--surface-100);
  border-bottom: 1px solid var(--surface-200);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-color);
}

.header-title i {
  color: var(--primary-500);
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--red-500);
  font-weight: 500;
}

.recording-dot {
  width: 8px;
  height: 8px;
  background: var(--red-500);
  border-radius: 50%;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.header-actions {
  display: flex;
  gap: 4px;
}

.transcript-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-secondary);
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

.timeline-entry {
  margin-bottom: 12px;
}

.dtmf-marker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--surface-100);
  border-radius: 4px;
  border-left: 3px solid var(--primary-500);
}

.dtmf-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  background: var(--primary-500);
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  border-radius: 4px;
}

.dtmf-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.transcript-entry {
  padding: 12px;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-200);
  cursor: pointer;
  transition: all 0.15s ease;
}

.transcript-entry:hover {
  background: var(--surface-100);
  border-color: var(--surface-300);
}

.transcript-entry.interim {
  background: var(--surface-50);
  border-style: dashed;
  opacity: 0.8;
}

.transcript-entry.current {
  border-color: var(--primary-200);
  background: var(--primary-50);
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.timestamp {
  font-family: 'SF Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.relative-time {
  font-size: 0.7rem;
  color: var(--text-color-secondary);
  background: var(--surface-200);
  padding: 2px 6px;
  border-radius: 4px;
}

.interim-label {
  font-size: 0.7rem;
  color: var(--primary-500);
  font-style: italic;
}

.confidence {
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.confidence.high {
  background: var(--green-100);
  color: var(--green-700);
}

.confidence.medium {
  background: var(--yellow-100);
  color: var(--yellow-700);
}

.confidence.low {
  background: var(--red-100);
  color: var(--red-700);
}

.entry-text {
  color: var(--text-color);
  line-height: 1.5;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: var(--primary-500);
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.panel-footer {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  background: var(--surface-100);
  border-top: 1px solid var(--surface-200);
}
</style>
