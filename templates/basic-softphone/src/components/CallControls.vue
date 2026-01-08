<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'

const props = defineProps<{
  callState: string
  isOnHold: boolean
  isMuted: boolean
  remoteDisplayName?: string | null
  remoteUri?: string | null
  duration: number
}>()

const emit = defineEmits<{
  answer: []
  reject: []
  hangup: []
  toggleHold: []
  toggleMute: []
  transfer: []
}>()

const formattedDuration = computed(() => {
  const mins = Math.floor(props.duration / 60)
  const secs = props.duration % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const callerDisplay = computed(() =>
  props.remoteDisplayName || props.remoteUri || 'Unknown Caller'
)

const isIncoming = computed(() => props.callState === 'ringing')
const isActive = computed(() => props.callState === 'active' || props.callState === 'held')
</script>

<template>
  <div class="call-controls">
    <!-- Caller Info -->
    <div class="caller-info">
      <div class="caller-avatar">
        <i class="pi pi-user" />
      </div>
      <div class="caller-details">
        <div class="caller-name">{{ callerDisplay }}</div>
        <div v-if="isActive" class="call-duration">{{ formattedDuration }}</div>
        <div v-else class="call-state">{{ callState }}</div>
      </div>
    </div>

    <!-- Incoming Call Actions -->
    <div v-if="isIncoming" class="incoming-actions">
      <Button
        icon="pi pi-phone"
        class="p-button-success p-button-lg p-button-rounded"
        label="Answer"
        @click="emit('answer')"
      />
      <Button
        icon="pi pi-times"
        class="p-button-danger p-button-lg p-button-rounded"
        label="Decline"
        @click="emit('reject')"
      />
    </div>

    <!-- Active Call Actions -->
    <div v-if="isActive" class="active-actions">
      <div class="control-row">
        <Button
          :icon="isMuted ? 'pi pi-volume-off' : 'pi pi-volume-up'"
          :class="['p-button-rounded', isMuted ? 'p-button-warning' : 'p-button-secondary']"
          :label="isMuted ? 'Unmute' : 'Mute'"
          @click="emit('toggleMute')"
        />
        <Button
          :icon="isOnHold ? 'pi pi-play' : 'pi pi-pause'"
          :class="['p-button-rounded', isOnHold ? 'p-button-info' : 'p-button-secondary']"
          :label="isOnHold ? 'Resume' : 'Hold'"
          @click="emit('toggleHold')"
        />
        <Button
          icon="pi pi-share-alt"
          class="p-button-rounded p-button-secondary"
          label="Transfer"
          @click="emit('transfer')"
        />
      </div>
      <Button
        icon="pi pi-phone"
        class="p-button-danger p-button-lg hangup-button"
        label="End Call"
        @click="emit('hangup')"
      />
    </div>
  </div>
</template>

<style scoped>
.call-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px;
}

.caller-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.caller-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
}

.caller-avatar i {
  font-size: 2.5rem;
  color: var(--primary-500);
}

.caller-details {
  text-align: center;
}

.caller-name {
  font-size: 1.5rem;
  font-weight: 600;
}

.call-duration {
  font-size: 2rem;
  font-family: monospace;
  color: var(--text-color-secondary);
}

.call-state {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
}

.incoming-actions {
  display: flex;
  gap: 24px;
}

.active-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.control-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hangup-button {
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
}
</style>
