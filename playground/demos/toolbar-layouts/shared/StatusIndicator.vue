<template>
  <div
    :class="['combined-status', `status-${status}`]"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel || `${statusText}: ${label}`"
    :title="title || label"
  >
    <component :is="icon" v-if="icon" class="status-icon" aria-hidden="true" />
    <svg
      v-else
      class="status-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <!-- Default icon based on status -->
      <circle v-if="status === 'red'" cx="12" cy="12" r="10" />
      <line v-if="status === 'red'" x1="15" y1="9" x2="9" y2="15" />
      <line v-if="status === 'red'" x1="9" y1="9" x2="15" y2="15" />

      <circle v-if="status === 'yellow'" cx="12" cy="12" r="10" />
      <line v-if="status === 'yellow'" x1="12" y1="8" x2="12" y2="12" />
      <circle v-if="status === 'yellow'" cx="12" cy="16" r="0.5" fill="currentColor" />

      <circle v-if="status === 'green'" cx="12" cy="12" r="10" />
      <path v-if="status === 'green'" d="M9 12l2 2 4-4" />
    </svg>
    <span class="status-label">{{ label }}</span>
    <span
      v-if="pulseAnimation && status === 'green'"
      class="status-pulse"
      aria-hidden="true"
    ></span>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'

/**
 * Accessible status indicator component with ARIA live region support
 *
 * Features:
 * - role="status" for screen reader announcements
 * - aria-live="polite" for non-intrusive updates
 * - Auto-generated descriptive aria-label
 * - Visual pulse animation for active states
 * - Default icons for common status types
 *
 * @example
 * <StatusIndicator
 *   status="green"
 *   label="Connected"
 *   aria-label="Connection status: Connected to SIP server"
 *   :pulse-animation="true"
 * />
 */

interface StatusIndicatorProps {
  /** Status color: red (error/offline), yellow (warning), green (success/online) */
  status: 'red' | 'yellow' | 'green'
  /** Display text label */
  label: string
  /** Screen reader announcement (auto-generated if not provided) */
  ariaLabel?: string
  /** Tooltip text (defaults to label) */
  title?: string
  /** Optional custom icon component */
  icon?: Component
  /** Show pulse animation (typically for 'green' active states) */
  pulseAnimation?: boolean
}

const props = defineProps<StatusIndicatorProps>()

const statusText = computed<string>(() => {
  switch (props.status) {
    case 'red':
      return 'Error'
    case 'yellow':
      return 'Warning'
    case 'green':
      return 'Active'
    default:
      return 'Status'
  }
})
</script>

<style scoped>
.combined-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  position: relative;
}

.status-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.status-label {
  white-space: nowrap;
}

/* Status colors */
.status-red {
  background: var(--red-50, #fef2f2);
  color: var(--red-700, #b91c1c);
  border: 1px solid var(--red-200, #fecaca);
}

.status-yellow {
  background: var(--yellow-50, #fefce8);
  color: var(--yellow-700, #a16207);
  border: 1px solid var(--yellow-200, #fef08a);
}

.status-green {
  background: var(--green-50, #f0fdf4);
  color: var(--green-700, #15803d);
  border: 1px solid var(--green-200, #bbf7d0);
}

/* Pulse animation */
.status-pulse {
  position: absolute;
  top: 0.375rem;
  left: 0.375rem;
  width: 0.5rem;
  height: 0.5rem;
  background: var(--green-500, #22c55e);
  border-radius: 50%;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
