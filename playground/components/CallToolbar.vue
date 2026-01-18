<template>
  <div class="call-toolbar">
    <div class="container">
      <div class="toolbar-content">
        <!-- Left: Combined Connection Status -->
        <div class="status-section">
          <!-- Combined SIP Status Indicator -->
          <div class="combined-status" :class="combinedStatusClass" :title="combinedStatusTooltip">
            <StatusIcon :status="statusIconType" />
            <span class="status-label">{{ combinedStatusLabel }}</span>
          </div>
        </div>

        <!-- Center: Call Information -->
        <div v-if="hasActiveCall" class="call-info" role="status" aria-live="polite">
          <span class="call-state">{{ callStateDisplay }}</span>
          <span class="caller-id">{{ callerDisplay }}</span>
          <span class="call-duration">{{ formattedDuration }}</span>
        </div>
        <div v-else class="call-info">
          <span class="no-call-text">No active call</span>
        </div>

        <!-- Right: Call Controls -->
        <div class="call-controls">
          <button
            v-if="showAnswerButton"
            class="btn btn-success btn-sm"
            @click="handleAnswer"
            aria-label="Answer call"
          >
            Answer
          </button>

          <button
            v-if="isActive"
            class="btn btn-secondary btn-sm"
            :class="{ active: isMuted }"
            @click="handleMuteToggle"
            :aria-label="isMuted ? 'Unmute audio' : 'Mute audio'"
            :aria-pressed="isMuted"
          >
            {{ isMuted ? 'Unmute' : 'Mute' }}
          </button>

          <button
            v-if="isActive"
            class="btn btn-secondary btn-sm"
            :class="{ active: isOnHold }"
            @click="handleHoldToggle"
            :aria-label="isOnHold ? 'Resume call' : 'Hold call'"
            :aria-pressed="isOnHold"
          >
            {{ isOnHold ? 'Resume' : 'Hold' }}
          </button>

          <button
            v-if="isActive"
            class="btn btn-danger btn-sm"
            @click="handleHangup"
            aria-label="Hangup call"
          >
            Hangup
          </button>

          <!-- Disconnect button when connected but no active call -->
          <button
            v-if="isConnected && !isActive"
            class="btn btn-warning btn-sm"
            @click="handleDisconnect"
            aria-label="Disconnect from SIP server"
          >
            Disconnect
          </button>

          <!-- Settings button - always visible on the right -->
          <button
            class="btn btn-settings btn-sm"
            @click="$emit('openSettings')"
            aria-label="Open settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
            Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatusIcon from './StatusIcon.vue'

// Define emits
defineEmits<{
  openSettings: []
}>()
import { useCallSession } from '../../src'
import { playgroundSipClient } from '../sipClient'

// Use shared SIP client instance (lazy-loaded via Proxy)
const { isConnected, isRegistered, getClient, disconnect } = playgroundSipClient

// Get client reference for composables
const sipClientRef = computed(() => getClient())

// Get call session state and methods
const {
  session,
  state,
  direction,
  remoteUri,
  remoteDisplayName,
  duration,
  isActive,
  isMuted,
  isOnHold,
  answer,
  hangup,
  mute,
  unmute,
  hold,
  unhold,
} = useCallSession(sipClientRef)

// Computed properties
const hasActiveCall = computed(() => session.value !== null)

const showAnswerButton = computed(() => state.value === 'ringing' && direction.value === 'incoming')

// Combined SIP Status (red/orange/green)
const combinedStatusClass = computed(() => {
  if (!isConnected.value) return 'status-red'
  if (!isRegistered.value) return 'status-orange'
  return 'status-green'
})

const statusIconType = computed(() => {
  if (!isConnected.value) return 'offline'
  if (!isRegistered.value) return 'connecting'
  return 'ready'
})

const combinedStatusLabel = computed(() => {
  if (!isConnected.value) return 'Offline'
  if (!isRegistered.value) return 'Connecting'
  return 'Ready'
})

const combinedStatusTooltip = computed(() => {
  if (!isConnected.value) return 'Disconnected - Not connected to SIP server'
  if (!isRegistered.value) return 'Connected but not registered - Cannot receive calls yet'
  return 'Connected and registered - Ready for calls'
})

const callerDisplay = computed(() => remoteDisplayName.value || remoteUri.value || 'Unknown')

const callStateDisplay = computed(() => {
  const stateStr = state.value || 'idle'
  return stateStr.charAt(0).toUpperCase() + stateStr.slice(1)
})

const formattedDuration = computed(() => {
  const mins = Math.floor(duration.value / 60)
  const secs = duration.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

// Methods
const handleAnswer = async () => {
  try {
    await answer()
  } catch (error) {
    console.error('Failed to answer call:', error)
  }
}

const handleHangup = async () => {
  try {
    await hangup()
  } catch (error) {
    console.error('Failed to hangup call:', error)
  }
}

const handleMuteToggle = async () => {
  try {
    if (isMuted.value) {
      await unmute()
    } else {
      await mute()
    }
  } catch (error) {
    console.error('Failed to toggle mute:', error)
  }
}

const handleHoldToggle = async () => {
  try {
    if (isOnHold.value) {
      await unhold()
    } else {
      await hold()
    }
  } catch (error) {
    console.error('Failed to toggle hold:', error)
  }
}

const handleDisconnect = async () => {
  try {
    // Hangup any active call first
    if (isActive.value) {
      await hangup()
    }
    await disconnect()
  } catch (error) {
    console.error('Failed to disconnect:', error)
  }
}
</script>

<style scoped>
.call-toolbar {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 50%, #4f46e5 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  border-radius: 0;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 2rem;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* Status Section */
.status-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* Combined Status Indicator */
.combined-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: all 0.2s ease;
  cursor: default;
}

.combined-status .status-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.combined-status .status-label {
  white-space: nowrap;
}

.combined-status.status-red {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.combined-status.status-orange {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.combined-status.status-orange .status-icon {
  animation: pulse-orange 2s ease-in-out infinite;
}

@keyframes pulse-orange {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.combined-status.status-green {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  transition: background 0.3s;
  flex-shrink: 0;
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
}

.status-dot.connected {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-label {
  white-space: nowrap;
}

/* Call Info Section */
.call-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0 1rem;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  justify-content: center;
}

.call-state {
  font-weight: 600;
  text-transform: capitalize;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8125rem;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.caller-id {
  font-size: 1rem;
  font-weight: 500;
}

.call-duration {
  font-family: monospace;
  font-size: 1rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
}

.no-call-text {
  font-size: 0.9375rem;
  opacity: 0.85;
  font-style: italic;
  font-weight: 500;
}

/* Call Controls */
.call-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  white-space: nowrap;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover {
  background: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-secondary.active {
  background: rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.5);
}

.btn-settings {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.25);
  margin-left: 1rem;
}

.btn-settings:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.btn-settings svg {
  opacity: 0.9;
}

.btn:active {
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 1024px) {
  .toolbar-content {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .status-section {
    flex: 1 1 100%;
    justify-content: center;
  }

  .call-info {
    flex: 1 1 auto;
    border-left: none;
    border-right: none;
    padding: 0;
  }

  .call-controls {
    flex: 1 1 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .toolbar-content {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .status-section {
    justify-content: space-around;
  }

  .call-info {
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .call-controls {
    flex-wrap: wrap;
  }

  .btn-sm {
    flex: 1;
    min-width: 100px;
    justify-content: center;
  }
}
</style>
