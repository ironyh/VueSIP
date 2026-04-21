<template>
  <div class="agent-dashboard card">
    <h2>Agent Dashboard</h2>

    <!-- Agent Status Indicator -->
    <section class="status-section" aria-label="Agent status">
      <div class="status-indicator">
        <span class="status-dot" :class="agentStatus" aria-hidden="true"></span>
        <span class="status-text">
          {{ statusText }}
          <span class="sr-only">
            {{ statusDescription }}
          </span>
        </span>
      </div>
    </section>

    <!-- Quick Stats -->
    <section aria-label="Today's statistics">
      <h3 class="sr-only">Quick Statistics</h3>
      <div class="quick-stats">
        <div class="stat-item">
          <div class="stat-label" id="calls-today-label">Calls Today</div>
          <div class="stat-value" aria-labelledby="calls-today-label" role="status">
            {{ totalCallsToday }}
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label" id="missed-calls-label">Missed</div>
          <div class="stat-value text-danger" aria-labelledby="missed-calls-label" role="status">
            {{ missedCalls }}
            <span v-if="missedCalls > 0" class="sr-only">missed calls</span>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-label" id="avg-duration-label">Avg Duration</div>
          <div class="stat-value" aria-labelledby="avg-duration-label">
            {{ formatDuration(averageDuration) }}
          </div>
        </div>
      </div>
    </section>

    <section class="next-action" :class="nextActionTone" aria-label="Next best action">
      <div class="next-action-header">
        <span class="next-action-label">Next best action</span>
        <span class="next-action-counts"
          >{{ queueLoad }} waiting · {{ openCallbacks }} callbacks</span
        >
      </div>
      <strong data-testid="agent-next-action">{{ nextActionTitle }}</strong>
      <p>{{ nextActionDetail }}</p>
    </section>

    <!-- Current Call Info -->
    <div v-if="currentCallId" class="current-call-info" role="status" aria-live="polite">
      <div class="info-badge">
        <span class="pulse-dot" aria-hidden="true"></span>
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
  queueLoad: number
  openCallbacks: number
  nextActionTitle: string
  nextActionDetail: string
  nextActionTone: 'neutral' | 'attention' | 'warning' | 'success'
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

const statusDescription = computed(() => {
  switch (props.agentStatus) {
    case 'available':
      return '(Ready to receive calls)'
    case 'busy':
      return '(Currently on a call)'
    case 'away':
      return '(Not accepting calls)'
    default:
      return ''
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
/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

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

.next-action {
  margin-top: 1.25rem;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
}

.next-action.attention {
  background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);
  border-color: #fdba74;
}

.next-action.warning {
  background: linear-gradient(180deg, #fef3c7 0%, #ffffff 100%);
  border-color: #fbbf24;
}

.next-action.success {
  background: linear-gradient(180deg, #dcfce7 0%, #ffffff 100%);
  border-color: #86efac;
}

.next-action-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.next-action-label,
.next-action-counts {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 700;
}

.next-action strong {
  display: block;
  color: #0f172a;
  margin-bottom: 0.35rem;
}

.next-action p {
  margin: 0;
  color: #334155;
  line-height: 1.55;
  font-size: 0.9rem;
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>
