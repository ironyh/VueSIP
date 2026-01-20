<script setup lang="ts">
import { ref, computed } from 'vue'

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
}>()

const emit = defineEmits<{
  endCall: []
  toggleHold: []
  toggleMute: []
  toggleSpeaker: []
  sendDtmf: [digit: string]
}>()

const showDtmf = ref(false)

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
