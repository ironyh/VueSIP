<template>
  <div class="call-controls" role="region" aria-label="Call controls">
    <div
      v-if="incomingCall"
      class="incoming-call"
      data-testid="incoming-call-notification"
      role="alert"
    >
      <h3>Incoming Call</h3>
      <p class="remote-party">{{ incomingCall.remoteDisplayName || incomingCall.remoteUri }}</p>
      <div class="call-actions">
        <button
          class="btn btn-success"
          data-testid="answer-button"
          aria-label="Answer call"
          @click="$emit('answer')"
        >
          <i class="pi pi-phone" aria-hidden="true"></i> Answer
        </button>
        <button
          class="btn btn-danger"
          data-testid="reject-button"
          aria-label="Reject call"
          @click="$emit('reject')"
        >
          <i class="pi pi-times" aria-hidden="true"></i> Reject
        </button>
      </div>
    </div>

    <div v-else-if="currentCall" class="active-call" data-testid="active-call">
      <h3>Active Call</h3>
      <p class="remote-party">{{ currentCall.remoteDisplayName || currentCall.remoteUri }}</p>
      <p
        class="call-duration"
        data-testid="call-status"
        role="timer"
        :aria-label="`Call duration ${duration}`"
      >
        {{ duration }}
      </p>
      <div class="call-actions">
        <button
          class="btn btn-secondary"
          data-testid="mute-audio-button"
          aria-label="Mute audio"
          @click="$emit('mute')"
        >
          <i class="pi pi-microphone" aria-hidden="true"></i> Mute
        </button>
        <button
          class="btn btn-danger"
          data-testid="hangup-button"
          aria-label="End call"
          @click="$emit('end')"
        >
          <i class="pi pi-phone" aria-hidden="true"></i> End Call
        </button>
      </div>
    </div>

    <div v-else-if="isCalling" class="calling" role="status" aria-label="Calling">
      <h3>Calling...</h3>
      <div class="spinner" aria-hidden="true"></div>
      <p class="calling-hint">Waiting for response</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import type { CallSession } from '../types'

const props = defineProps<{
  currentCall: CallSession | null
  incomingCall: CallSession | null
  isCalling: boolean
}>()

defineEmits<{
  answer: []
  reject: []
  end: []
  mute: []
}>()

const duration = ref('00:00')
let timer: ReturnType<typeof setInterval> | null = null

const updateDuration = () => {
  if (props.currentCall?.timing?.answerTime) {
    const now = new Date()
    const diff = Math.floor((now.getTime() - props.currentCall.timing.answerTime.getTime()) / 1000)
    const minutes = Math.floor(diff / 60)
    const seconds = diff % 60
    duration.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } else {
    duration.value = '00:00'
  }
}

watch(
  () => props.currentCall,
  (newCall) => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }

    if (newCall) {
      updateDuration()
      timer = setInterval(updateDuration, 1000)
    } else {
      duration.value = '00:00'
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.call-controls {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.incoming-call,
.active-call,
.calling {
  text-align: center;
  width: 100%;
}

h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

p {
  margin: 0.25rem 0;
  color: #6b7280;
}

.remote-party {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  word-break: break-all;
}

.call-duration {
  font-size: 2rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  margin: 1rem 0;
  color: #111827;
}

.call-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  min-height: 48px;
  min-width: 120px;
}

.btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 1rem auto;
}

.calling-hint {
  color: #9ca3af;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive: stack buttons vertically on very small screens */
@media (max-width: 280px) {
  .call-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .btn {
    min-width: unset;
  }
}
</style>
