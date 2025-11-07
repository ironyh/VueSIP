<template>
  <div class="agent-dashboard card">
    <h2>Agent Dashboard</h2>

    <!-- Agent Status Indicator -->
    <div class="status-section">
      <div class="status-indicator">
        <span class="status-dot" :class="agentStatus"></span>
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="quick-stats">
      <div class="stat-item">
        <div class="stat-label">Calls Today</div>
        <div class="stat-value">{{ totalCallsToday }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Missed</div>
        <div class="stat-value text-danger">{{ missedCalls }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Avg Duration</div>
        <div class="stat-value">{{ formatDuration(averageDuration) }}</div>
      </div>
    </div>

    <!-- Current Call Info -->
    <div v-if="currentCallId" class="current-call-info">
      <div class="info-badge">
        <span class="pulse-dot"></span>
        On Call
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  agentStatus: 'available' | 'busy' | 'away'
  currentCallId: string | null
  totalCallsToday: number
  missedCalls: number
  averageDuration: number
}>()

// ============================================================================
// Computed
// ============================================================================

const statusText = computed(() => {
  switch (props.agentStatus) {
    case 'available':
      return 'Available'
    case 'busy':
      return 'Busy'
    case 'away':
      return 'Away'
    default:
      return 'Unknown'
  }
})

// ============================================================================
// Methods
// ============================================================================

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0s'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}
</script>

<style scoped>
.agent-dashboard {
  background: white;
}

.agent-dashboard h2 {
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
  color: #111827;
}

.status-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.available {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.status-dot.busy {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.status-dot.away {
  background: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.status-text {
  font-size: 1rem;
  color: #111827;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.stat-value.text-danger {
  color: #ef4444;
}

.current-call-info {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.info-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #1e40af;
  justify-content: center;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
