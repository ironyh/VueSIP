<script setup lang="ts">
/**
 * CallTimeline - Visual timeline of DTMF inputs and events
 *
 * Shows a horizontal timeline with DTMF inputs marked,
 * prompt durations, and navigation to any point.
 */
import { ref, computed } from 'vue'
import type { DtmfEntry, TranscriptEntry } from '@/composables/useIvrTester'

interface Props {
  /** DTMF history entries */
  dtmfHistory: DtmfEntry[]
  /** Transcript entries */
  transcriptEntries?: TranscriptEntry[]
  /** Call start time */
  startTime?: Date | null
  /** Call end time (null if ongoing) */
  endTime?: Date | null
  /** Current call duration in seconds */
  duration?: number
  /** Whether the call is active */
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  transcriptEntries: () => [],
  startTime: null,
  endTime: null,
  duration: 0,
  isActive: false,
})

const emit = defineEmits<{
  /** Emitted when a timeline point is clicked */
  (e: 'seek', timestamp: number): void
  /** Emitted when a DTMF entry is clicked */
  (e: 'dtmf-click', entry: DtmfEntry): void
}>()

// Local state
const hoveredEntry = ref<string | null>(null)

// Timeline data
interface TimelinePoint {
  id: string
  type: 'dtmf' | 'transcript'
  timestamp: number
  position: number // 0-100 percentage
  data: DtmfEntry | TranscriptEntry
}

const timelinePoints = computed((): TimelinePoint[] => {
  if (!props.startTime) return []

  const startMs = props.startTime.getTime()
  const endMs = props.endTime?.getTime() ?? Date.now()
  const totalMs = endMs - startMs

  if (totalMs <= 0) return []

  const points: TimelinePoint[] = []

  // Add DTMF points
  for (const entry of props.dtmfHistory) {
    const position = ((entry.timestamp - startMs) / totalMs) * 100
    points.push({
      id: entry.id,
      type: 'dtmf',
      timestamp: entry.timestamp,
      position: Math.min(100, Math.max(0, position)),
      data: entry,
    })
  }

  return points.sort((a, b) => a.timestamp - b.timestamp)
})

// Current position marker
const currentPosition = computed(() => {
  if (!props.startTime || !props.isActive) return 100

  const startMs = props.startTime.getTime()
  const now = Date.now()
  const endMs = props.endTime?.getTime() ?? now
  const totalMs = endMs - startMs

  if (totalMs <= 0) return 0

  return Math.min(100, ((now - startMs) / totalMs) * 100)
})

/**
 * Format time for display
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
 * Format duration
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get relative time from start
 */
function getRelativeTime(timestamp: number): string {
  if (!props.startTime) return '0:00'

  const diff = Math.floor((timestamp - props.startTime.getTime()) / 1000)
  return formatDuration(diff)
}

/**
 * Handle point click
 */
function handlePointClick(point: TimelinePoint): void {
  emit('seek', point.timestamp)
  if (point.type === 'dtmf') {
    emit('dtmf-click', point.data as DtmfEntry)
  }
}

/**
 * Handle timeline click (seek to position)
 */
function handleTimelineClick(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = (x / rect.width) * 100

  if (props.startTime) {
    const startMs = props.startTime.getTime()
    const endMs = props.endTime?.getTime() ?? Date.now()
    const totalMs = endMs - startMs
    const targetTimestamp = startMs + (percentage / 100) * totalMs
    emit('seek', targetTimestamp)
  }
}
</script>

<template>
  <div class="call-timeline">
    <!-- Header -->
    <div class="timeline-header">
      <div class="header-left">
        <i class="pi pi-clock" />
        <span>Call Timeline</span>
      </div>
      <div class="header-right">
        <span v-if="isActive" class="duration active">
          <span class="live-dot" />
          {{ formatDuration(duration) }}
        </span>
        <span v-else class="duration">
          {{ formatDuration(duration) }}
        </span>
      </div>
    </div>

    <!-- Timeline visualization -->
    <div class="timeline-container">
      <!-- Time labels -->
      <div class="time-labels">
        <span class="time-label start">
          {{ startTime ? formatTime(startTime.getTime()) : '00:00:00' }}
        </span>
        <span class="time-label end">
          {{ endTime ? formatTime(endTime.getTime()) : 'Now' }}
        </span>
      </div>

      <!-- Timeline track -->
      <div class="timeline-track" @click="handleTimelineClick">
        <!-- Progress fill -->
        <div class="timeline-progress" :style="{ width: `${currentPosition}%` }" />

        <!-- DTMF markers -->
        <div
          v-for="point in timelinePoints"
          :key="point.id"
          class="timeline-point"
          :class="[point.type, { hovered: hoveredEntry === point.id }]"
          :style="{ left: `${point.position}%` }"
          @click.stop="handlePointClick(point)"
          @mouseenter="hoveredEntry = point.id"
          @mouseleave="hoveredEntry = null"
        >
          <div class="point-marker">
            <template v-if="point.type === 'dtmf'">
              {{ (point.data as DtmfEntry).digit }}
            </template>
            <template v-else>
              <i class="pi pi-microphone" />
            </template>
          </div>

          <!-- Tooltip -->
          <div class="point-tooltip">
            <div class="tooltip-time">{{ getRelativeTime(point.timestamp) }}</div>
            <div v-if="point.type === 'dtmf'" class="tooltip-content">
              DTMF: {{ (point.data as DtmfEntry).digit }}
            </div>
          </div>
        </div>

        <!-- Current position marker (if active) -->
        <div v-if="isActive" class="current-marker" :style="{ left: `${currentPosition}%` }">
          <div class="marker-line" />
          <div class="marker-head" />
        </div>
      </div>
    </div>

    <!-- DTMF sequence display -->
    <div v-if="dtmfHistory.length > 0" class="dtmf-sequence">
      <span class="sequence-label">DTMF Sequence:</span>
      <div class="sequence-digits">
        <span
          v-for="entry in dtmfHistory"
          :key="entry.id"
          class="sequence-digit"
          :class="{ hovered: hoveredEntry === entry.id }"
          @mouseenter="hoveredEntry = entry.id"
          @mouseleave="hoveredEntry = null"
          @click="$emit('dtmf-click', entry)"
        >
          {{ entry.digit }}
        </span>
      </div>
    </div>

    <!-- Stats -->
    <div class="timeline-stats">
      <div class="stat">
        <span class="stat-value">{{ dtmfHistory.length }}</span>
        <span class="stat-label">DTMF Inputs</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ transcriptEntries.length }}</span>
        <span class="stat-label">Prompts</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ formatDuration(duration) }}</span>
        <span class="stat-label">Duration</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.call-timeline {
  background: var(--surface-card);
  border-radius: 8px;
  padding: 16px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--text-color);
}

.header-left i {
  color: var(--primary-500);
}

.duration {
  font-family: 'SF Mono', monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color);
}

.duration.active {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--green-600);
}

.live-dot {
  width: 8px;
  height: 8px;
  background: var(--green-500);
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

.timeline-container {
  margin-bottom: 16px;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.time-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  font-family: 'SF Mono', monospace;
}

.timeline-track {
  position: relative;
  height: 40px;
  background: var(--surface-200);
  border-radius: 4px;
  cursor: pointer;
  overflow: visible;
}

.timeline-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--primary-100) 0%, var(--primary-200) 100%);
  border-radius: 4px 0 0 4px;
  transition: width 0.3s ease;
}

.timeline-point {
  position: absolute;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  z-index: 2;
}

.timeline-point.hovered {
  z-index: 10;
}

.point-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--primary-500);
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: all 0.15s ease;
}

.timeline-point:hover .point-marker {
  transform: scale(1.2);
}

.point-marker i {
  font-size: 0.65rem;
}

.point-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  background: var(--surface-900);
  color: white;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s ease;
  margin-bottom: 8px;
}

.timeline-point:hover .point-tooltip {
  opacity: 1;
  visibility: visible;
}

.tooltip-time {
  font-family: 'SF Mono', monospace;
  font-weight: 600;
}

.tooltip-content {
  color: var(--gray-300);
  margin-top: 2px;
}

.current-marker {
  position: absolute;
  top: 0;
  height: 100%;
  transform: translateX(-50%);
  z-index: 5;
}

.marker-line {
  width: 2px;
  height: 100%;
  background: var(--green-500);
}

.marker-head {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 12px;
  background: var(--green-500);
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.dtmf-sequence {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface-100);
  border-radius: 6px;
  margin-bottom: 16px;
}

.sequence-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.sequence-digits {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.sequence-digit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  background: var(--primary-500);
  color: white;
  font-weight: 600;
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sequence-digit:hover,
.sequence-digit.hovered {
  transform: scale(1.1);
  background: var(--primary-600);
}

.timeline-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid var(--surface-200);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
