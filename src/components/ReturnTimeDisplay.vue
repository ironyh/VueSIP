<script setup lang="ts">
/**
 * Return Time Display Component
 *
 * Displays the expected return time and countdown for a nurse/staff member.
 * Shows visual indicators for overdue status.
 *
 * @module components/ReturnTimeDisplay
 */

import { computed, type PropType } from 'vue'
import type { ReturnTimeSpec } from '@/types/freepbx-presence.types'

const props = defineProps({
  /**
   * Return time specification
   */
  returnTime: {
    type: Object as PropType<ReturnTimeSpec | null>,
    default: null,
  },
  /**
   * Display name of the person (optional)
   */
  displayName: {
    type: String,
    default: '',
  },
  /**
   * Extension number (optional)
   */
  extension: {
    type: String,
    default: '',
  },
  /**
   * Away reason/message (optional)
   */
  awayReason: {
    type: String,
    default: '',
  },
  /**
   * Show compact view (time only)
   */
  compact: {
    type: Boolean,
    default: false,
  },
  /**
   * Show countdown
   */
  showCountdown: {
    type: Boolean,
    default: true,
  },
  /**
   * Show progress bar
   */
  showProgress: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits<{
  /**
   * Emitted when return time is clicked
   */
  (e: 'click'): void
  /**
   * Emitted when clear button is clicked
   */
  (e: 'clear'): void
}>()

/**
 * Whether return time exists and is valid
 */
const hasReturnTime = computed(() => {
  return props.returnTime !== null && props.returnTime !== undefined
})

/**
 * Whether the return time is overdue
 */
const isOverdue = computed(() => {
  return props.returnTime?.isOverdue ?? false
})

/**
 * Formatted return time (e.g., "2:30 PM")
 */
const formattedTime = computed(() => {
  return props.returnTime?.formattedTime ?? ''
})

/**
 * Formatted remaining time (e.g., "15m" or "overdue")
 */
const formattedRemaining = computed(() => {
  return props.returnTime?.formattedRemaining ?? ''
})

/**
 * Progress percentage (0-100) based on duration
 */
const progressPercentage = computed(() => {
  if (!props.returnTime?.durationMinutes || !props.returnTime?.remainingMs) {
    return 0
  }

  const totalMs = props.returnTime.durationMinutes * 60000
  const elapsed = totalMs - props.returnTime.remainingMs
  const percentage = (elapsed / totalMs) * 100

  return Math.min(100, Math.max(0, percentage))
})

/**
 * CSS class for status indicator
 */
const statusClass = computed(() => {
  if (!hasReturnTime.value) return 'status-none'
  if (isOverdue.value) return 'status-overdue'
  if (props.returnTime && props.returnTime.remainingMs && props.returnTime.remainingMs < 300000) {
    // Less than 5 minutes
    return 'status-soon'
  }
  return 'status-away'
})

/**
 * Icon based on away reason
 */
const awayIcon = computed(() => {
  const reason = props.awayReason?.toLowerCase() ?? ''

  if (reason.includes('lunch')) return 'lunch'
  if (reason.includes('break')) return 'coffee'
  if (reason.includes('meeting')) return 'meeting'
  if (reason.includes('round')) return 'walk'
  if (reason.includes('patient')) return 'patient'
  if (reason.includes('procedure')) return 'procedure'
  if (reason.includes('vacation')) return 'vacation'

  return 'away'
})

/**
 * Handle click event
 */
const handleClick = () => {
  emit('click')
}

/**
 * Handle clear button click
 */
const handleClear = (event: Event) => {
  event.stopPropagation()
  emit('clear')
}
</script>

<template>
  <div
    v-if="hasReturnTime"
    class="return-time-display"
    :class="[statusClass, { compact }]"
    @click="handleClick"
  >
    <!-- Compact View -->
    <template v-if="compact">
      <span class="return-time-compact">
        <span class="icon" :data-icon="awayIcon" aria-hidden="true"></span>
        <span v-if="showCountdown" class="countdown" :class="{ overdue: isOverdue }">
          {{ formattedRemaining }}
        </span>
        <span v-else class="time">{{ formattedTime }}</span>
      </span>
    </template>

    <!-- Full View -->
    <template v-else>
      <div class="return-time-header">
        <span class="icon-wrapper" :data-icon="awayIcon">
          <span class="icon" aria-hidden="true"></span>
        </span>
        <div class="info">
          <span v-if="displayName" class="name">{{ displayName }}</span>
          <span v-else-if="extension" class="extension">Ext. {{ extension }}</span>
          <span v-if="awayReason" class="reason">{{ awayReason }}</span>
        </div>
        <button
          class="clear-btn"
          type="button"
          aria-label="Clear return time"
          @click="handleClear"
        >
          &times;
        </button>
      </div>

      <div class="return-time-body">
        <div class="time-info">
          <span class="label">Expected back:</span>
          <span class="time" :class="{ overdue: isOverdue }">
            {{ formattedTime }}
          </span>
        </div>

        <div v-if="showCountdown" class="countdown-info">
          <span v-if="isOverdue" class="countdown overdue">
            Overdue by {{ formattedRemaining }}
          </span>
          <span v-else class="countdown">
            {{ formattedRemaining }} remaining
          </span>
        </div>

        <div v-if="showProgress && !isOverdue" class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
      </div>
    </template>
  </div>

  <!-- No Return Time Set -->
  <div v-else class="return-time-empty" :class="{ compact }">
    <span v-if="!compact">No return time set</span>
  </div>
</template>

<style scoped>
.return-time-display {
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.return-time-display:hover {
  transform: translateY(-1px);
}

/* Status Colors */
.status-away {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  color: #92400e;
}

.status-soon {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  border: 1px solid #ea580c;
  color: #9a3412;
}

.status-overdue {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  border: 1px solid #ef4444;
  color: #991b1b;
  animation: pulse 2s ease-in-out infinite;
}

.status-none {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #6b7280;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Compact View */
.compact {
  padding: 4px 8px;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
}

.return-time-compact {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Full View Header */
.return-time-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.icon-wrapper {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

.icon {
  width: 20px;
  height: 20px;
  /* Icons would be provided via CSS or an icon system */
}

/* Icon placeholders using data attribute for demonstration */
[data-icon="lunch"]::before { content: "🍽"; }
[data-icon="coffee"]::before { content: "☕"; }
[data-icon="meeting"]::before { content: "👥"; }
[data-icon="walk"]::before { content: "🚶"; }
[data-icon="patient"]::before { content: "🏥"; }
[data-icon="procedure"]::before { content: "⚕"; }
[data-icon="vacation"]::before { content: "🏖"; }
[data-icon="away"]::before { content: "🕐"; }

.info {
  flex: 1;
  min-width: 0;
}

.name {
  display: block;
  font-weight: 600;
  font-size: 0.9375rem;
  line-height: 1.2;
}

.extension {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
}

.reason {
  display: block;
  font-size: 0.8125rem;
  opacity: 0.8;
  margin-top: 2px;
}

.clear-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* Full View Body */
.return-time-body {
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.time-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.label {
  font-size: 0.8125rem;
  opacity: 0.8;
}

.time {
  font-weight: 600;
  font-size: 1rem;
}

.time.overdue {
  text-decoration: line-through;
}

.countdown-info {
  margin-bottom: 8px;
}

.countdown {
  font-size: 0.9375rem;
  font-weight: 500;
}

.countdown.overdue {
  color: #dc2626;
  font-weight: 600;
}

/* Progress Bar */
.progress-bar {
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: currentColor;
  opacity: 0.5;
  transition: width 1s ease-out;
  border-radius: 2px;
}

/* Empty State */
.return-time-empty {
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #9ca3af;
  text-align: center;
}

.return-time-empty.compact {
  padding: 4px 8px;
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  .status-away {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
    border-color: #b45309;
    color: #fef3c7;
  }

  .status-soon {
    background: linear-gradient(135deg, #9a3412 0%, #c2410c 100%);
    border-color: #ea580c;
    color: #ffedd5;
  }

  .status-overdue {
    background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%);
    border-color: #ef4444;
    color: #fee2e2;
  }

  .status-none {
    background: #374151;
    border-color: #4b5563;
    color: #9ca3af;
  }

  .icon-wrapper {
    background: rgba(0, 0, 0, 0.2);
  }

  .clear-btn {
    background: rgba(255, 255, 255, 0.1);
  }

  .clear-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .return-time-body {
    border-top-color: rgba(255, 255, 255, 0.1);
  }

  .progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }
}
</style>
