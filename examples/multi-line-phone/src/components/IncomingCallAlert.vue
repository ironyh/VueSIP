<template>
  <div
    ref="alertRef"
    class="incoming-call-alert"
    role="alertdialog"
    aria-labelledby="alert-title"
    aria-describedby="alert-caller"
    aria-modal="true"
    aria-live="assertive"
    @keydown="handleKeyboard"
  >
    <div class="alert-content">
      <div class="alert-icon">
        <div class="phone-ring" aria-label="Incoming call">
          <span aria-hidden="true">📞</span>
        </div>
      </div>

      <div class="alert-info">
        <h3 id="alert-title" class="alert-title">Incoming Call</h3>
        <div class="alert-line">Line {{ lineNumber }}</div>
        <div id="alert-caller" class="caller-info">
          <div class="caller-name">{{ displayName }}</div>
          <div class="caller-uri">{{ remoteUri }}</div>
        </div>
      </div>

      <div class="alert-actions">
        <button
          ref="answerBtn"
          @click="handleAnswer"
          class="btn-answer"
          :aria-label="`Answer call from ${displayName} on line ${lineNumber}. Press Enter to answer.`"
        >
          <span class="btn-icon" aria-hidden="true">✓</span>
          <span>Answer</span>
        </button>
        <button
          @click="handleReject"
          class="btn-reject"
          :aria-label="`Reject call from ${displayName}. Press Escape to reject.`"
        >
          <span class="btn-icon" aria-hidden="true">✕</span>
          <span>Reject</span>
        </button>
      </div>
    </div>

    <!-- Audio for ringtone -->
    <audio ref="ringtoneRef" loop autoplay aria-label="Ringtone">
      <!-- Using a simple tone generated via Web Audio API would be better -->
      <!-- For now, we'll just rely on the visual alert -->
    </audio>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

// Props
interface Props {
  remoteUri: string
  remoteDisplayName?: string | null
  lineNumber: number
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  answer: []
  reject: []
}>()

// Refs
const ringtoneRef = ref<HTMLAudioElement | null>(null)
const alertRef = ref<HTMLElement | null>(null)
const answerBtn = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null
let focusTrap: HTMLElement[] = []

// Computed
const displayName = computed(() => {
  return props.remoteDisplayName || props.remoteUri || 'Unknown Caller'
})

// Methods
function handleAnswer() {
  stopRingtone()
  emit('answer')
}

function handleReject() {
  stopRingtone()
  emit('reject')
}

function stopRingtone() {
  if (ringtoneRef.value) {
    ringtoneRef.value.pause()
    ringtoneRef.value.currentTime = 0
  }
}

function handleKeyboard(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleAnswer()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    handleReject()
  }
}

function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab') return

  const firstElement = focusTrap[0]
  const lastElement = focusTrap[focusTrap.length - 1]

  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault()
    lastElement?.focus()
  } else if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault()
    firstElement?.focus()
  }
}

// Lifecycle
onMounted(() => {
  // Store previous focus
  previousFocus = document.activeElement as HTMLElement

  // Set up focus trap
  const focusableElements = alertRef.value?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  focusTrap = Array.from(focusableElements || []) as HTMLElement[]

  // Move focus to first button
  setTimeout(() => {
    answerBtn.value?.focus()
  }, 100)

  // Trap focus within dialog
  document.addEventListener('keydown', trapFocus)

  // Play system notification sound if available
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Incoming Call', {
        body: `Call from ${displayName.value} on line ${props.lineNumber}`,
        icon: '/phone-icon.png',
        tag: `incoming-call-${props.lineNumber}`,
        requireInteraction: true,
      })
    } catch (error) {
      console.warn('Notification failed:', error)
    }
  } else if ('Notification' in window && Notification.permission === 'default') {
    // Request permission for future notifications
    Notification.requestPermission().catch((error) => {
      console.warn('Notification permission request failed:', error)
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', trapFocus)
  stopRingtone()

  // Restore focus
  if (previousFocus && typeof previousFocus.focus === 'function') {
    setTimeout(() => {
      previousFocus?.focus()
    }, 0)
  }
})
</script>

<style scoped>
.incoming-call-alert {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.alert-content {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  min-width: 350px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 3px solid #28a745;
}

.alert-icon {
  text-align: center;
}

.phone-ring {
  font-size: 3em;
  animation: ring 1s ease-in-out infinite;
}

@keyframes ring {
  0%, 100% {
    transform: rotate(-15deg);
  }
  50% {
    transform: rotate(15deg);
  }
}

.alert-info {
  text-align: center;
}

.alert-title {
  color: #333;
  font-size: 1.4em;
  margin-bottom: 8px;
}

.alert-line {
  display: inline-block;
  padding: 4px 12px;
  background: #28a745;
  color: white;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
  margin-bottom: 12px;
}

.caller-info {
  margin-top: 12px;
}

.caller-name {
  font-size: 1.2em;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.caller-uri {
  font-size: 0.95em;
  color: #6c757d;
}

.alert-actions {
  display: flex;
  gap: 12px;
}

.btn-answer,
.btn-reject {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-icon {
  font-size: 1.3em;
}

.btn-answer {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.btn-answer:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4);
}

.btn-answer:focus {
  outline: 3px solid #28a745;
  outline-offset: 2px;
}

.btn-answer:active {
  transform: translateY(0);
}

.btn-reject {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.btn-reject:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(220, 53, 69, 0.4);
}

.btn-reject:focus {
  outline: 3px solid #dc3545;
  outline-offset: 2px;
}

.btn-reject:active {
  transform: translateY(0);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .incoming-call-alert {
    animation: none;
  }

  .phone-ring {
    animation: none;
  }

  .btn-answer,
  .btn-reject {
    transition-duration: 0.01ms !important;
  }
}

/* Responsive */
@media (max-width: 480px) {
  .incoming-call-alert {
    left: 10px;
    right: 10px;
    top: 10px;
  }

  .alert-content {
    min-width: auto;
  }
}
</style>
