<template>
  <div class="incoming-call-alert">
    <div class="alert-content">
      <div class="alert-icon">
        <div class="phone-ring">📞</div>
      </div>

      <div class="alert-info">
        <h3 class="alert-title">Incoming Call</h3>
        <div class="alert-line">Line {{ lineNumber }}</div>
        <div class="caller-info">
          <div class="caller-name">{{ displayName }}</div>
          <div class="caller-uri">{{ remoteUri }}</div>
        </div>
      </div>

      <div class="alert-actions">
        <button @click="handleAnswer" class="btn-answer" title="Answer">
          <span class="btn-icon">✓</span>
          <span>Answer</span>
        </button>
        <button @click="handleReject" class="btn-reject" title="Reject">
          <span class="btn-icon">✕</span>
          <span>Reject</span>
        </button>
      </div>
    </div>

    <!-- Audio for ringtone -->
    <audio ref="ringtoneRef" loop autoplay>
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

// Lifecycle
onMounted(() => {
  // Play system notification sound if available
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Incoming Call', {
      body: `Call from ${displayName.value}`,
      icon: '/phone-icon.png',
      tag: 'incoming-call',
    })
  }
})

onUnmounted(() => {
  stopRingtone()
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

.btn-reject:active {
  transform: translateY(0);
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
