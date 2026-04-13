<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallQualityStats, useCallRecording } from 'vuesip'
import type { CallSession } from '@/types/call.types'
import CallFailureOverlay from './CallFailureOverlay.vue'

const props = defineProps<{
  callState: string
  isOnHold: boolean
  isMuted: boolean
  isSpeakerOn: boolean
  remoteDisplayName?: string | null
  remoteUri?: string | null
  duration: number
  statusLine1?: string
  statusLine2?: string
  calledLine?: string
  session?: CallSession | null
}>()

const emit = defineEmits<{
  endCall: []
  toggleHold: []
  toggleMute: []
  toggleSpeaker: []
  sendDtmf: [digit: string]
  retry: []
}>()

const showDtmf = ref(false)
const showStats = ref(false)
const showRecording = ref(false)

// Call quality stats - only when session is available
const sessionRef = computed(() => props.session) as import('vue').Ref<
  CallSession | null | undefined
>
const { stats, qualityLevel } = useCallQualityStats(sessionRef)

// Call recording - wire to remote stream
const remoteStreamRef = computed(
  () => props.session?.remoteStream ?? null
) as import('vue').Ref<MediaStream | null>
const {
  isRecording,
  isPaused,
  hasRecording,
  formattedDuration: recordingDuration,
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  downloadRecording,
  clearRecording,
  isSupported: isRecordingSupported,
} = useCallRecording(remoteStreamRef)

const formattedDuration = computed(() => {
  const mins = Math.floor(props.duration / 60)
  const secs = props.duration % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const callerDisplay = computed(() => props.remoteDisplayName || props.remoteUri || 'Unknown')

const callerInitial = computed(() => {
  const name = props.remoteDisplayName || props.remoteUri || '?'
  return name.charAt(0).toUpperCase()
})

const statusText = computed(() => {
  if (props.callState === 'calling') return 'Calling...'
  if (props.callState === 'held') return 'On Hold'
  return ''
})

// Quality indicator color
const qualityColor = computed(() => {
  switch ((qualityLevel as any).value ?? qualityLevel) {
    case 'excellent':
      return '#22c55e'
    case 'good':
      return '#84cc16'
    case 'fair':
      return '#eab308'
    case 'poor':
      return '#ef4444'
    default:
      return '#6b7280'
  }
})

// Format stats for display
function formatStat(value: number | null, decimals = 0): string {
  if (value === null || value === undefined) return '--'
  return value.toFixed(decimals)
}

const dtmfKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

function handleDtmf(digit: string) {
  emit('sendDtmf', digit)
  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate(10)
  }
}
</script>

<template>
  <div class="call-screen">
    <!-- Background gradient -->
    <div class="background"></div>

    <!-- Call Info -->
    <div class="call-info">
      <div class="caller-avatar">
        <span>{{ callerInitial }}</span>
      </div>
      <h2 class="caller-name">{{ callerDisplay }}</h2>
      <p class="caller-number" v-if="remoteUri && remoteUri !== remoteDisplayName">
        {{ remoteUri }}
      </p>
      <p class="call-status">
        {{ props.statusLine1 || statusText || formattedDuration }}
      </p>
      <p v-if="props.statusLine2" class="call-status secondary">
        {{ props.statusLine2 }}
      </p>
      <p v-if="props.calledLine" class="call-status secondary">Line: {{ props.calledLine }}</p>
    </div>

    <!-- DTMF Keypad -->
    <Transition name="slide">
      <div v-if="showDtmf" class="dtmf-pad">
        <div class="dtmf-keys">
          <button v-for="key in dtmfKeys" :key="key" class="dtmf-key" @click="handleDtmf(key)">
            {{ key }}
          </button>
        </div>
        <button class="dtmf-close" @click="showDtmf = false">Hide Keypad</button>
      </div>
    </Transition>

    <!-- Recording Controls Panel -->
    <Transition name="slide">
      <div
        v-if="showRecording && callState === 'active' && isRecordingSupported"
        class="recording-panel"
      >
        <div class="recording-header">
          <span class="recording-title">Call Recording</span>
          <span v-if="isRecording" class="recording-indicator">
            <span class="recording-dot"></span>
            REC {{ recordingDuration }}
          </span>
          <span v-else-if="isPaused" class="recording-paused">PAUSED {{ recordingDuration }}</span>
        </div>
        <div class="recording-controls">
          <button
            v-if="!isRecording && !isPaused && !hasRecording"
            class="rec-btn record"
            @click="startRecording()"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8" />
            </svg>
            Start
          </button>
          <button v-if="isRecording" class="rec-btn pause" @click="stopRecording()">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Stop
          </button>
          <button v-if="isRecording" class="rec-btn pause" @click="pauseRecording()">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            Pause
          </button>
          <button v-if="isPaused" class="rec-btn resume" @click="resumeRecording()">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Resume
          </button>
          <button v-if="hasRecording" class="rec-btn download" @click="downloadRecording()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download
          </button>
          <button v-if="hasRecording" class="rec-btn clear" @click="clearRecording()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
              />
            </svg>
            Clear
          </button>
        </div>
        <div v-if="!isRecordingSupported" class="recording-unsupported">
          Recording not supported in this browser
        </div>
        <button class="recording-close" @click="showRecording = false">Close</button>
      </div>
    </Transition>

    <!-- Call Quality Stats -->
    <Transition name="slide">
      <div v-if="showStats && callState === 'active'" class="quality-stats">
        <div class="stats-header">
          <span class="stats-title">Technical Details</span>
          <span
            class="quality-indicator"
            :style="{ backgroundColor: qualityColor }"
            :title="`Quality: ${(qualityLevel as any).value ?? qualityLevel}`"
          >
            {{ ((qualityLevel as any).value ?? qualityLevel) === 'unknown' ? '?' : '' }}
          </span>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">RTT</span>
            <span class="stat-value"
              >{{ formatStat((stats as any).value?.rtt ?? (stats as any).rtt, 0) }} ms</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Jitter</span>
            <span class="stat-value"
              >{{ formatStat((stats as any).value?.jitter ?? (stats as any).jitter, 1) }} ms</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Loss</span>
            <span class="stat-value"
              >{{
                formatStat(
                  (stats as any).value?.packetLossPercent ?? (stats as any).packetLossPercent,
                  1
                )
              }}%</span
            >
          </div>
          <div class="stat-item">
            <span class="stat-label">Bitrate</span>
            <span class="stat-value"
              >{{
                formatStat((stats as any).value?.bitrateKbps ?? (stats as any).bitrateKbps, 0)
              }}
              kbps</span
            >
          </div>
        </div>
        <div v-if="(stats as any).value?.codec ?? (stats as any).codec" class="codec-info">
          Codec: {{ (stats as any).value?.codec ?? (stats as any).codec }}
        </div>
        <button class="stats-close" @click="showStats = false">Hide Details</button>
      </div>
    </Transition>

    <!-- Call Controls -->
    <div class="call-controls">
      <div class="control-row">
        <button class="control-btn" :class="{ active: isMuted }" @click="emit('toggleMute')">
          <svg v-if="isMuted" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
            <path d="M3 3l18 18" stroke="currentColor" stroke-width="2" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <span>{{ isMuted ? 'Unmute' : 'Mute' }}</span>
        </button>

        <button class="control-btn" @click="showDtmf = !showDtmf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="6" height="6" rx="1" />
            <rect x="9" y="3" width="6" height="6" rx="1" />
            <rect x="15" y="3" width="6" height="6" rx="1" />
            <rect x="3" y="9" width="6" height="6" rx="1" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
            <rect x="15" y="9" width="6" height="6" rx="1" />
            <rect x="3" y="15" width="6" height="6" rx="1" />
            <rect x="9" y="15" width="6" height="6" rx="1" />
            <rect x="15" y="15" width="6" height="6" rx="1" />
          </svg>
          <span>Keypad</span>
        </button>

        <button class="control-btn" :class="{ active: isSpeakerOn }" @click="emit('toggleSpeaker')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          <span>Speaker</span>
        </button>
      </div>

      <div class="control-row">
        <button class="control-btn" :class="{ active: isOnHold }" @click="emit('toggleHold')">
          <svg v-if="isOnHold" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ isOnHold ? 'Resume' : 'Hold' }}</span>
        </button>

        <button class="control-btn" :class="{ active: showStats }" @click="showStats = !showStats">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <span>Stats</span>
        </button>

        <button
          class="control-btn"
          :class="{ active: isRecording || isPaused }"
          @click="showRecording = !showRecording"
        >
          <svg v-if="isRecording" viewBox="0 0 24 24" fill="currentColor" class="recording-pulse">
            <circle cx="12" cy="12" r="8" fill="currentColor" />
          </svg>
          <svg v-else-if="isPaused" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
          <span>{{ isRecording ? 'Recording' : isPaused ? 'Paused' : 'Record' }}</span>
        </button>

        <button class="control-btn end-call" @click="emit('endCall')">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3.5 5.5C3.5 14.6 10.4 21.5 19.5 21.5c.8 0 1.5-.7 1.5-1.5v-3c0-.8-.7-1.5-1.5-1.5-1.1 0-2.2-.2-3.2-.5-.7-.3-1.5-.1-2 .4l-1.4 1.4c-2.5-1.3-4.5-3.3-5.8-5.8l1.4-1.4c.5-.5.7-1.3.4-2-.3-1-.5-2.1-.5-3.2 0-.8-.7-1.5-1.5-1.5H5C4.2 3 3.5 3.7 3.5 4.5v1z"
              transform="rotate(135 12 12)"
            />
          </svg>
          <span>End</span>
        </button>
      </div>
    </div>
    <!-- Call Failure Overlay -->
    <CallFailureOverlay
      :visible="callState === 'failed'"
      :session="session"
      @dismiss="emit('endCall')"
      @retry="emit('retry')"
    />
  </div>
</template>

<style scoped>
.call-screen {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  z-index: 200;
}

.background {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--color-primary) 0%, var(--bg-primary) 60%);
  opacity: 0.15;
  pointer-events: none;
}

.call-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
}

.caller-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.caller-avatar span {
  font-size: 2.5rem;
  font-weight: 600;
  color: white;
}

.caller-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.caller-number {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0.5rem 0 0;
}

.call-status {
  font-size: 2rem;
  font-family: 'SF Mono', Monaco, monospace;
  color: var(--text-secondary);
  margin: 1rem 0 0;
}

.call-status.secondary {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    sans-serif;
  color: var(--text-tertiary);
}

/* DTMF Pad */
.dtmf-pad {
  position: absolute;
  bottom: 200px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  max-width: 320px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1rem;
  z-index: 10;
}

/* Recording Panel */
.recording-panel {
  position: absolute;
  bottom: 200px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  max-width: 320px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1rem;
  z-index: 10;
}

.recording-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.recording-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ef4444;
}

.recording-dot {
  width: 10px;
  height: 10px;
  background: #ef4444;
  border-radius: 50%;
  animation: pulse 1s ease-in-out infinite;
}

.recording-paused {
  font-size: 0.875rem;
  font-weight: 600;
  color: #eab308;
}

.recording-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.rec-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.rec-btn svg {
  width: 16px;
  height: 16px;
}

.rec-btn.record {
  background: #ef4444;
  color: white;
}

.rec-btn.record:hover {
  background: #dc2626;
}

.rec-btn.pause {
  background: #eab308;
  color: white;
}

.rec-btn.pause:hover {
  background: #ca8a04;
}

.rec-btn.resume {
  background: #22c55e;
  color: white;
}

.rec-btn.resume:hover {
  background: #16a34a;
}

.rec-btn.download {
  background: #3b82f6;
  color: white;
}

.rec-btn.download:hover {
  background: #2563eb;
}

.rec-btn.clear {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.rec-btn.clear:hover {
  background: #374151;
  color: white;
}

.recording-unsupported {
  text-align: center;
  color: #ef4444;
  font-size: 0.75rem;
  margin: 0.75rem 0;
}

.recording-close {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.recording-pulse {
  animation: pulse 1s ease-in-out infinite;
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

/* Quality Stats Panel */
.quality-stats {
  position: absolute;
  bottom: 200px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 2rem);
  max-width: 320px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1rem;
  z-index: 10;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.stats-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.quality-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.stat-label {
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'SF Mono', Monaco, monospace;
}

.codec-info {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 0.75rem;
  font-style: italic;
}

.stats-close {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.dtmf-keys {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.dtmf-key {
  aspect-ratio: 1.5;
  background: var(--bg-tertiary);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s;
}

.dtmf-key:active {
  background: var(--color-primary);
  color: white;
  transform: scale(0.95);
}

.dtmf-close {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

/* Call Controls */
.call-controls {
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0));
  position: relative;
}

.control-row {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.control-row:last-child {
  margin-bottom: 0;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: none;
  border-radius: var(--radius-lg);
  min-width: 80px;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.control-btn svg {
  width: 28px;
  height: 28px;
  color: var(--text-primary);
}

.control-btn span {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.control-btn:hover {
  background: var(--bg-tertiary);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn.active {
  background: var(--color-primary);
}

.control-btn.active svg,
.control-btn.active span {
  color: white;
}

.control-btn.end-call {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--color-error);
  padding: 0;
  min-width: auto;
}

.control-btn.end-call svg {
  width: 32px;
  height: 32px;
  color: white;
}

.control-btn.end-call span {
  display: none;
}

.control-btn.end-call:hover {
  background: #dc2626;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
