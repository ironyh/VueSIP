<template>
  <div class="card">
    <h2>Call Controls</h2>

    <!-- Incoming Call Alert -->
    <div v-if="callState === 'incoming'" class="incoming-call">
      <div class="incoming-call-info">
        <h3>Incoming Call</h3>
        <p class="caller-id">{{ remoteDisplayName || remoteUri }}</p>
      </div>
      <div class="button-group">
        <button @click="emit('answer')" class="success">
          Answer
        </button>
        <button @click="emit('reject')" class="danger">
          Reject
        </button>
      </div>
    </div>

    <!-- Outgoing Call Form -->
    <div v-else-if="callState === 'idle'" class="call-form">
      <div class="form-group">
        <label for="target-uri">Target SIP URI</label>
        <input
          id="target-uri"
          v-model="targetUri"
          type="text"
          placeholder="sip:2000@example.com"
          @keyup.enter="handleMakeCall"
        />
        <p class="info-message">
          Enter the SIP URI of the person you want to call
        </p>
      </div>
      <button @click="handleMakeCall" class="primary" :disabled="!targetUri.trim()">
        Call
      </button>
    </div>

    <!-- Active Call Controls -->
    <div v-else class="active-call">
      <div class="call-status">
        <h3>{{ callStateLabel }}</h3>
        <p class="caller-id">{{ remoteDisplayName || remoteUri }}</p>
        <p v-if="duration > 0" class="duration">{{ formattedDuration }}</p>
      </div>

      <div class="button-group">
        <!-- Mute/Unmute -->
        <button
          v-if="callState === 'active'"
          @click="emit('toggleMute')"
          :class="isMuted ? 'warning' : 'secondary'"
        >
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>

        <!-- Hold/Unhold -->
        <button
          v-if="callState === 'active'"
          @click="emit('toggleHold')"
          :class="isOnHold ? 'warning' : 'secondary'"
        >
          {{ isOnHold ? 'Unhold' : 'Hold' }}
        </button>

        <!-- Hangup -->
        <button
          v-if="callState !== 'idle'"
          @click="emit('hangup')"
          class="danger"
        >
          Hangup
        </button>
      </div>

      <!-- Audio Element for Remote Stream -->
      <audio
        v-if="remoteStream"
        ref="remoteAudioRef"
        autoplay
        style="display: none"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

/**
 * Props for the CallControls component
 */
interface Props {
  callState: 'idle' | 'calling' | 'incoming' | 'ringing' | 'active' | 'held' | 'ended'
  remoteUri: string | null
  remoteDisplayName: string | null
  isMuted: boolean
  isOnHold: boolean
  duration: number
  remoteStream: MediaStream | null
}

const props = defineProps<Props>()

/**
 * Events emitted by the CallControls component
 */
const emit = defineEmits<{
  makeCall: [target: string]
  answer: []
  reject: []
  hangup: []
  toggleMute: []
  toggleHold: []
}>()

/**
 * Target URI for outgoing calls
 */
const targetUri = ref('sip:2000@example.com')

/**
 * Reference to the remote audio element
 */
const remoteAudioRef = ref<HTMLAudioElement | null>(null)

/**
 * Computed call state label for display
 */
const callStateLabel = computed(() => {
  switch (props.callState) {
    case 'calling':
      return 'Calling...'
    case 'ringing':
      return 'Ringing...'
    case 'active':
      return props.isOnHold ? 'On Hold' : 'Active Call'
    case 'held':
      return 'Call Held'
    case 'ended':
      return 'Call Ended'
    default:
      return ''
  }
})

/**
 * Format duration as MM:SS
 */
const formattedDuration = computed(() => {
  const minutes = Math.floor(props.duration / 60)
  const seconds = props.duration % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

/**
 * Handle making an outgoing call
 */
const handleMakeCall = () => {
  if (targetUri.value.trim()) {
    emit('makeCall', targetUri.value.trim())
  }
}

/**
 * Watch for changes to remote stream and attach it to audio element
 */
watch(
  () => props.remoteStream,
  (newStream) => {
    if (remoteAudioRef.value && newStream) {
      remoteAudioRef.value.srcObject = newStream
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.incoming-call,
.call-form,
.active-call {
  padding: 1rem 0;
}

.incoming-call-info {
  margin-bottom: 1.5rem;
  text-align: center;
}

.incoming-call-info h3 {
  margin-bottom: 0.5rem;
  color: var(--gray-900);
}

.caller-id {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 0.25rem;
}

.call-status {
  margin-bottom: 1.5rem;
  text-align: center;
}

.call-status h3 {
  margin-bottom: 0.5rem;
  color: var(--gray-900);
}

.duration {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 0.5rem;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.button-group button {
  flex: 1;
  min-width: 100px;
}
</style>
