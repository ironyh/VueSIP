<template>
  <span
    :class="['call-badge', `badge-${type}`, `badge-${size}`]"
    :aria-label="`${label}${count ? ': ' + count + ' active' : ''}`"
    role="status"
  >
    <span class="badge-label">{{ label }}</span>
    <span v-if="count !== undefined" class="badge-count">{{ count }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * Accessible call badge/chip component for status indicators
 *
 * Features:
 * - role="status" for screen reader announcements
 * - Auto-generated aria-label with count
 * - Multiple size variants
 * - Type-based color themes
 *
 * @example
 * <CallBadge type="success" label="Active" :count="2" />
 * <CallBadge type="warning" label="On Hold" size="small" />
 */

interface CallBadgeProps {
  /** Badge type for color theming */
  type: 'success' | 'warning' | 'danger' | 'info'
  /** Display label */
  label: string
  /** Optional count indicator */
  count?: number
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
}

withDefaults(defineProps<CallBadgeProps>(), {
  size: 'medium',
})
</script>

<style scoped>
.call-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-weight: 500;
  white-space: nowrap;
}

/* Size variants */
.badge-small {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
}

.badge-medium {
  font-size: 0.875rem;
  padding: 0.25rem 0.625rem;
}

.badge-large {
  font-size: 1rem;
  padding: 0.375rem 0.75rem;
}

/* Type colors */
.badge-success {
  background: var(--green-100, #dcfce7);
  color: var(--green-800, #166534);
  border: 1px solid var(--green-300, #86efac);
}

.badge-warning {
  background: var(--yellow-100, #fef9c3);
  color: var(--yellow-800, #854d0e);
  border: 1px solid var(--yellow-300, #fde047);
}

.badge-danger {
  background: var(--red-100, #fee2e2);
  color: var(--red-800, #991b1b);
  border: 1px solid var(--red-300, #fca5a5);
}

.badge-info {
  background: var(--blue-100, #dbeafe);
  color: var(--blue-800, #1e40af);
  border: 1px solid var(--blue-300, #93c5fd);
}

.badge-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  background: currentColor;
  color: white;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
</style>
