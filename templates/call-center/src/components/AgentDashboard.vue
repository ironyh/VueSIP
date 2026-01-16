<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import type { AgentState } from '../composables/useAgent'

const props = defineProps<{
  agentId: string
  agentState: AgentState
  isConnected: boolean
  callsHandled: number
  avgTalkTime: number
  pauseReason: string
}>()

const emit = defineEmits<{
  login: []
  logout: []
  pause: [reason: string]
  unpause: []
}>()

const pauseReasons = [
  { label: 'Break', value: 'Break' },
  { label: 'Lunch', value: 'Lunch' },
  { label: 'Meeting', value: 'Meeting' },
  { label: 'Training', value: 'Training' },
  { label: 'Personal', value: 'Personal' },
]

const stateColor = computed(() => {
  switch (props.agentState) {
    case 'available':
      return 'success'
    case 'on-call':
      return 'info'
    case 'paused':
      return 'warning'
    case 'wrap-up':
      return 'warning'
    case 'logged-out':
    default:
      return 'danger'
  }
})

const stateLabel = computed(() => {
  switch (props.agentState) {
    case 'available':
      return 'Available'
    case 'on-call':
      return 'On Call'
    case 'paused':
      return `Paused - ${props.pauseReason}`
    case 'wrap-up':
      return 'Wrap-up'
    case 'logged-out':
    default:
      return 'Logged Out'
  }
})

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handlePauseSelect(event: { value: string }) {
  emit('pause', event.value)
}
</script>

<template>
  <div class="agent-dashboard">
    <div class="agent-header">
      <div class="agent-info">
        <h2>Agent {{ agentId }}</h2>
        <Tag :value="stateLabel" :severity="stateColor" />
      </div>
      <div class="connection-status" :class="{ connected: isConnected }">
        <i class="pi pi-circle-fill" />
        <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>
    </div>

    <div class="agent-stats">
      <div class="stat">
        <span class="stat-label">Calls Handled</span>
        <span class="stat-value">{{ callsHandled }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Avg Talk Time</span>
        <span class="stat-value">{{ formatDuration(avgTalkTime) }}</span>
      </div>
    </div>

    <div class="agent-controls">
      <!-- Logged out state -->
      <template v-if="agentState === 'logged-out'">
        <Button
          label="Login"
          icon="pi pi-sign-in"
          class="p-button-success w-full"
          :disabled="!isConnected"
          @click="emit('login')"
        />
      </template>

      <!-- Available state -->
      <template v-else-if="agentState === 'available'">
        <div class="control-row">
          <Dropdown
            :options="pauseReasons"
            option-label="label"
            option-value="value"
            placeholder="Take Break"
            class="flex-1"
            @change="handlePauseSelect"
          />
          <Button
            label="Logout"
            icon="pi pi-sign-out"
            class="p-button-secondary"
            @click="emit('logout')"
          />
        </div>
      </template>

      <!-- Paused state -->
      <template v-else-if="agentState === 'paused'">
        <Button
          label="Resume"
          icon="pi pi-play"
          class="p-button-success w-full"
          @click="emit('unpause')"
        />
      </template>

      <!-- On-call or wrap-up state -->
      <template v-else>
        <div class="state-indicator">
          <i class="pi pi-phone" />
          <span>{{ stateLabel }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.agent-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--surface-card);
  border-radius: 8px;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.agent-info h2 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--red-500);
}

.connection-status.connected {
  color: var(--green-500);
}

.connection-status i {
  font-size: 0.5rem;
}

.agent-stats {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.agent-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-row {
  display: flex;
  gap: 8px;
}

.flex-1 {
  flex: 1;
}

.w-full {
  width: 100%;
}

.state-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--surface-100);
  border-radius: 8px;
  font-weight: 500;
}

.state-indicator i {
  font-size: 1.25rem;
  color: var(--primary-500);
}
</style>
