<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  callerName: string
  callerNumber: string
  calledLine?: string
}>()

const emit = defineEmits<{
  answer: []
  reject: []
}>()

const callerInitial = computed(() => {
  return props.callerName.charAt(0).toUpperCase()
})

// Play ringtone sound (could be enhanced with actual audio)
let vibrationInterval: number | null = null

onMounted(() => {
  // Vibrate pattern for incoming call
  if (navigator.vibrate) {
    vibrationInterval = setInterval(() => {
      navigator.vibrate([200, 100, 200])
    }, 1000) as unknown as number
  }
})

onUnmounted(() => {
  if (vibrationInterval) {
    clearInterval(vibrationInterval)
    navigator.vibrate?.(0) // Stop vibration
  }
})
</script>

<template>
  <div class="incoming-call-overlay">
    <div class="incoming-call">
      <!-- Background pulse animation -->
      <div class="pulse-ring"></div>
      <div class="pulse-ring delay"></div>

      <!-- Caller Info -->
      <div class="caller-info">
        <div class="caller-avatar">
          <span>{{ callerInitial }}</span>
        </div>
        <h2 class="caller-name">{{ callerName }}</h2>
        <p v-if="callerNumber" class="caller-number">{{ callerNumber }}</p>
        <p v-if="calledLine" class="called-line">Line: {{ calledLine }}</p>
        <p class="call-label">Incoming call</p>
      </div>

      <!-- Answer/Reject Buttons -->
      <div class="call-actions">
        <button class="action-btn reject" @click="emit('reject')">
          <div class="btn-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3.5 5.5C3.5 14.6 10.4 21.5 19.5 21.5c.8 0 1.5-.7 1.5-1.5v-3c0-.8-.7-1.5-1.5-1.5-1.1 0-2.2-.2-3.2-.5-.7-.3-1.5-.1-2 .4l-1.4 1.4c-2.5-1.3-4.5-3.3-5.8-5.8l1.4-1.4c.5-.5.7-1.3.4-2-.3-1-.5-2.1-.5-3.2 0-.8-.7-1.5-1.5-1.5H5C4.2 3 3.5 3.7 3.5 4.5v1z"
                transform="rotate(135 12 12)"
              />
            </svg>
          </div>
          <span>Decline</span>
        </button>

        <button class="action-btn answer" @click="emit('answer')">
          <div class="btn-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <span>Answer</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.incoming-call-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  z-index: 300;
}

.incoming-call {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

/* Pulse animation rings */
.pulse-ring {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  opacity: 0;
  animation: pulse-ring 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
}

.pulse-ring.delay {
  animation-delay: 1s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

.caller-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
}

.caller-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  box-shadow: 0 0 40px rgba(79, 70, 229, 0.4);
}

.caller-avatar span {
  font-size: 3rem;
  font-weight: 600;
  color: white;
}

.caller-name {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
  color: white;
}

.caller-number {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0.5rem 0 0;
}

.called-line {
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0.35rem 0 0;
}

.call-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 1rem 0 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  animation: fade-blink 1.5s ease-in-out infinite;
}

@keyframes fade-blink {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.call-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 3rem 2rem;
  padding-bottom: calc(3rem + env(safe-area-inset-bottom, 0));
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.btn-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon svg {
  width: 32px;
  height: 32px;
  color: white;
}

.action-btn span {
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
}

.action-btn.reject .btn-icon {
  background: var(--color-error);
}

.action-btn.reject:hover .btn-icon {
  transform: scale(1.1);
  background: #dc2626;
}

.action-btn.reject:active .btn-icon {
  transform: scale(0.95);
}

.action-btn.answer .btn-icon {
  background: var(--color-success);
  animation: answer-pulse 1.5s ease-in-out infinite;
}

@keyframes answer-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.action-btn.answer:hover .btn-icon {
  animation: none;
  transform: scale(1.1);
}

.action-btn.answer:active .btn-icon {
  animation: none;
  transform: scale(0.95);
}

/* Slide to answer (optional enhancement) */
@media (pointer: coarse) {
  .action-btn .btn-icon {
    transition: transform 0.1s ease;
  }
}
</style>
