<template>
  <div
    class="call-line"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    :aria-current="isActiveLine ? 'true' : 'false'"
    :aria-pressed="isActiveLine"
    :class="{
      'call-line--active': isActiveLine,
      'call-line--held': isOnHold,
      'call-line--ringing': state === 'ringing',
      'call-line--calling': state === 'calling',
      'call-line--connected': state === 'active',
      'call-line--terminated': state === 'terminated' || state === 'failed',
    }"
    @click="handleLineClick"
    @keyup.enter="handleLineClick"
    @keyup.space.prevent="handleLineClick"
  >
    <!-- Line Header -->
    <div class="call-line__header">
      <div class="call-line__number">
        <span class="line-badge" :class="{ active: isActiveLine }">
          <span v-if="isActiveLine" aria-hidden="true">▶ </span>
          Line {{ lineNumber }}
        </span>
        <span class="state-badge" :class="stateClass">
          <span class="state-icon" aria-hidden="true">{{ stateIcon }}</span>
          {{ stateText }}
        </span>
      </div>
      <div class="call-line__duration" v-if="state === 'active' || state === 'held'" aria-live="off">
        <span class="sr-only">Call duration </span>{{ formattedDuration }}
      </div>
    </div>

    <!-- Caller Info -->
    <div class="call-line__info">
      <div class="caller-name">{{ displayName }}</div>
      <div class="caller-uri">{{ remoteUri || 'Unknown' }}</div>
    </div>

    <!-- Audio Elements (hidden, for WebRTC streams) -->
    <audio ref="localAudioRef" autoplay muted aria-label="Local audio stream"></audio>
    <audio ref="remoteAudioRef" autoplay :muted="!isActiveLine" :aria-label="`Remote audio from ${displayName}`"></audio>

    <!-- Call Controls -->
    <div class="call-line__controls">
      <!-- Incoming Call Controls -->
      <template v-if="state === 'ringing'">
        <button
          @click.stop="$emit('answer')"
          class="btn btn--success"
          :aria-label="`Answer incoming call from ${displayName}`"
        >
          <span class="btn-icon" aria-hidden="true">📞</span>
          Answer
        </button>
        <button
          @click.stop="$emit('reject')"
          class="btn btn--danger"
          :aria-label="`Reject call from ${displayName}`"
        >
          <span class="btn-icon" aria-hidden="true">❌</span>
          Reject
        </button>
      </template>

      <!-- Active Call Controls -->
      <template v-else-if="state === 'active' || state === 'held' || isOnHold">
        <button
          @click.stop="handleToggleHold"
          class="btn btn--secondary"
          :class="{ active: isOnHold }"
          :aria-label="isOnHold ? `Resume call with ${displayName}` : `Put call with ${displayName} on hold`"
          :aria-pressed="isOnHold"
        >
          <span class="btn-icon" aria-hidden="true">{{ isOnHold ? '▶️' : '⏸️' }}</span>
          {{ isOnHold ? 'Resume' : 'Hold' }}
        </button>

        <button
          @click.stop="handleToggleMute"
          class="btn btn--secondary"
          :class="{ active: isMuted }"
          :aria-label="isMuted ? `Unmute call with ${displayName}` : `Mute call with ${displayName}`"
          :aria-pressed="isMuted"
        >
          <span class="btn-icon" aria-hidden="true">{{ isMuted ? '🔇' : '🔊' }}</span>
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>

        <button
          @click.stop="showDtmfPad = !showDtmfPad"
          class="btn btn--secondary"
          :class="{ active: showDtmfPad }"
          :disabled="isOnHold"
          :aria-label="showDtmfPad ? 'Hide DTMF keypad' : 'Show DTMF keypad'"
          :aria-expanded="showDtmfPad"
        >
          <span class="btn-icon" aria-hidden="true">🔢</span>
          DTMF
        </button>

        <button
          @click.stop="$emit('hangup')"
          class="btn btn--danger"
          :aria-label="`Hangup call with ${displayName}`"
        >
          <span class="btn-icon" aria-hidden="true">📵</span>
          Hangup
        </button>
      </template>

      <!-- Calling State -->
      <template v-else-if="state === 'calling'">
        <div class="calling-indicator">
          <span class="spinner" role="status" aria-label="Calling"></span>
          Calling...
        </div>
        <button
          @click.stop="$emit('hangup')"
          class="btn btn--danger"
          :aria-label="`Cancel call to ${displayName}`"
        >
          <span class="btn-icon" aria-hidden="true">❌</span>
          Cancel
        </button>
      </template>

      <!-- Terminated State -->
      <template v-else-if="state === 'terminated' || state === 'failed'">
        <div class="terminated-info">
          <span class="status-icon" aria-hidden="true">{{ state === 'failed' ? '❌' : '📴' }}</span>
          {{ state === 'failed' ? 'Call Failed' : 'Call Ended' }}
        </div>
      </template>
    </div>

    <!-- DTMF Pad (shown when active and not on hold) -->
    <div
      v-if="showDtmfPad && state === 'active' && !isOnHold"
      class="dtmf-pad"
      role="region"
      aria-label="DTMF keypad"
    >
      <div class="dtmf-grid" role="grid" aria-label="DTMF tones">
        <button
          v-for="tone in dtmfTones"
          :key="tone"
          @click.stop="handleDtmf(tone)"
          class="dtmf-btn"
          role="gridcell"
          :aria-label="`Send DTMF tone ${tone}`"
        >
          {{ tone }}
        </button>
      </div>
      <div role="status" aria-live="polite" class="sr-only">
        {{ dtmfAnnouncement }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { CallState, CallSession } from 'vuesip'

// Props
interface Props {
  lineNumber: number
  session: CallSession | null
  state: CallState
  remoteUri: string | null
  remoteDisplayName: string | null
  duration: number
  isOnHold: boolean
  isMuted: boolean
  isActiveLine: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  answer: []
  reject: []
  hangup: []
  hold: []
  unhold: []
  mute: []
  unmute: []
  makeActive: []
  sendDtmf: [tone: string]
}>()

// Local state
const showDtmfPad = ref(false)
const localAudioRef = ref<HTMLAudioElement | null>(null)
const remoteAudioRef = ref<HTMLAudioElement | null>(null)
const dtmfAnnouncement = ref('')

// DTMF tones
const dtmfTones = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Computed
const displayName = computed(() => {
  return props.remoteDisplayName || props.remoteUri || 'Unknown'
})

const formattedDuration = computed(() => {
  const mins = Math.floor(props.duration / 60)
  const secs = props.duration % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const stateClass = computed(() => {
  const stateMap: Record<string, string> = {
    idle: 'state-idle',
    ringing: 'state-ringing',
    calling: 'state-calling',
    active: 'state-active',
    held: 'state-held',
    terminated: 'state-terminated',
    failed: 'state-failed',
  }
  return stateMap[props.state] || 'state-idle'
})

const stateText = computed(() => {
  if (props.isOnHold) return 'On Hold'

  const textMap: Record<string, string> = {
    idle: 'Idle',
    ringing: 'Incoming',
    calling: 'Calling',
    active: 'Active',
    held: 'On Hold',
    terminated: 'Ended',
    failed: 'Failed',
  }
  return textMap[props.state] || props.state
})

const stateIcon = computed(() => {
  const icons: Record<string, string> = {
    idle: '○',
    ringing: '🔔',
    calling: '📞',
    active: '●',
    held: '⏸',
    terminated: '✕',
    failed: '⚠',
  }
  return icons[props.state] || '○'
})

const ariaLabel = computed(() => {
  const parts = [
    `Line ${props.lineNumber}`,
    props.state === 'ringing' ? 'Incoming call' : stateText.value,
    `from ${displayName.value}`,
  ]

  if (props.isActiveLine) parts.push('Active line')
  if (props.isOnHold) parts.push('On hold')
  if (props.isMuted) parts.push('Muted')
  if (props.state === 'active' && !props.isOnHold) {
    parts.push(`Duration ${formattedDuration.value}`)
  }

  return parts.join(', ')
})

// Methods
function handleLineClick() {
  if (props.state === 'active' || props.state === 'held' || props.isOnHold) {
    emit('makeActive')
  }
}

function handleToggleHold() {
  if (props.isOnHold) {
    emit('unhold')
  } else {
    emit('hold')
  }
}

function handleToggleMute() {
  if (props.isMuted) {
    emit('unmute')
  } else {
    emit('mute')
  }
}

function handleDtmf(tone: string) {
  emit('sendDtmf', tone)
  dtmfAnnouncement.value = `Sent DTMF tone ${tone}`

  // Clear announcement after screen reader has read it
  setTimeout(() => {
    dtmfAnnouncement.value = ''
  }, 1000)
}

// Keyboard event handler for DTMF
function handleKeyboardDtmf(e: KeyboardEvent) {
  if (!showDtmfPad.value || props.isOnHold || props.state !== 'active') return

  const key = e.key
  if (/^[0-9*#]$/.test(key)) {
    e.preventDefault()
    handleDtmf(key)
  }
}

// Watch for stream changes and attach to audio elements
watch(
  () => props.localStream,
  (stream) => {
    if (localAudioRef.value && stream) {
      localAudioRef.value.srcObject = stream
    }
  }
)

watch(
  () => props.remoteStream,
  (stream) => {
    if (remoteAudioRef.value && stream) {
      remoteAudioRef.value.srcObject = stream
    }
  }
)

// Watch active line status to control audio playback
watch(
  () => props.isActiveLine,
  (isActive) => {
    if (remoteAudioRef.value) {
      // Only the active line should have unmuted audio
      remoteAudioRef.value.muted = !isActive
    }
  }
)

// Initialize audio on mount
onMounted(() => {
  if (localAudioRef.value && props.localStream) {
    localAudioRef.value.srcObject = props.localStream
  }
  if (remoteAudioRef.value && props.remoteStream) {
    remoteAudioRef.value.srcObject = props.remoteStream
    remoteAudioRef.value.muted = !props.isActiveLine
  }

  // Add keyboard event listener for DTMF
  window.addEventListener('keydown', handleKeyboardDtmf)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardDtmf)
})
</script>

<style scoped>
.call-line {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.call-line:hover {
  border-color: #dee2e6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.call-line:focus {
  outline: 3px solid #667eea;
  outline-offset: 2px;
  border-color: #667eea;
}

.call-line--active {
  background: linear-gradient(135deg, #e0e7ff 0%, #f0e7ff 100%);
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.call-line--held {
  background: #fff3cd;
  border-color: #ffc107;
}

.call-line--ringing {
  background: #d1ecf1;
  border-color: #17a2b8;
  animation: pulse 1.5s ease-in-out infinite;
}

.call-line--calling {
  background: #e7f3ff;
  border-color: #007bff;
}

.call-line--connected {
  background: #d4edda;
  border-color: #28a745;
}

.call-line--terminated {
  opacity: 0.7;
  cursor: default;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.call-line__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.call-line__number {
  display: flex;
  gap: 8px;
  align-items: center;
}

.line-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #6c757d;
  color: white;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
}

.line-badge.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.state-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 500;
}

.state-icon {
  margin-right: 4px;
}

.state-idle {
  background: #e9ecef;
  color: #6c757d;
}

.state-ringing {
  background: #17a2b8;
  color: white;
}

.state-calling {
  background: #007bff;
  color: white;
}

.state-active {
  background: #28a745;
  color: white;
}

.state-held {
  background: #ffc107;
  color: #333;
}

.state-terminated, .state-failed {
  background: #dc3545;
  color: white;
}

.call-line__duration {
  font-size: 1.2em;
  font-weight: 600;
  color: #495057;
  font-family: 'Courier New', monospace;
}

.call-line__info {
  margin-bottom: 12px;
}

.caller-name {
  font-size: 1.1em;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.caller-uri {
  font-size: 0.9em;
  color: #6c757d;
}

.call-line__controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  font-size: 1.1em;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.btn:focus {
  outline: 3px solid #667eea;
  outline-offset: 2px;
}

.btn:active {
  transform: translateY(0);
}

.btn--success {
  background: #28a745;
  color: white;
}

.btn--success:hover {
  background: #218838;
}

.btn--danger {
  background: #dc3545;
  color: white;
}

.btn--danger:hover {
  background: #c82333;
}

.btn--secondary {
  background: #6c757d;
  color: white;
}

.btn--secondary:hover {
  background: #5a6268;
}

.btn--secondary.active {
  background: #ffc107;
  color: #333;
}

.calling-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #007bff;
  font-weight: 600;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 3px solid #e9ecef;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.terminated-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6c757d;
  font-weight: 600;
}

.status-icon {
  font-size: 1.2em;
}

/* DTMF Pad */
.dtmf-pad {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #dee2e6;
}

.dtmf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 200px;
}

.dtmf-btn {
  padding: 12px;
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dtmf-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.dtmf-btn:focus {
  outline: 3px solid #667eea;
  outline-offset: 2px;
}

.dtmf-btn:active {
  transform: scale(0.95);
}

/* Screen reader only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .call-line,
  .btn,
  .dtmf-btn {
    transition-duration: 0.01ms !important;
  }

  .call-line--ringing {
    animation: none;
  }

  .spinner {
    animation: none;
  }
}
</style>
