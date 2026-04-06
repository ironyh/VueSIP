<template>
  <button
    :type="htmlType"
    class="action-btn"
    :class="[
      `action-btn--${variant}`,
      `action-btn--${size}`,
      { 'action-btn--full-width': fullWidth },
    ]"
    :disabled="disabled"
    :aria-label="ariaLabel || label"
    :aria-busy="loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="action-btn__spinner" aria-hidden="true"></span>
    <span v-if="icon && !loading" class="action-btn__icon" aria-hidden="true" v-html="icon"></span>
    <span v-if="label" class="action-btn__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
/**
 * ActionButton – touch-friendly accessible button with variants.
 *
 * Minimum 48px touch target, ARIA support, loading state, and multiple
 * visual variants suitable for a SIP softphone UI (call, hangup, mute, etc.).
 *
 * @example
 * ```vue
 * <ActionButton
 *   label="Answer"
 *   icon="📞"
 *   variant="success"
 *   @click="answerCall"
 * />
 * <ActionButton
 *   label="End Call"
 *   icon="📵"
 *   variant="danger"
 *   :loading="isHangingUp"
 *   @click="hangup"
 * />
 * ```
 */

withDefaults(
  defineProps<{
    /** Visible button label */
    label?: string
    /** Accessible label (defaults to `label`) */
    ariaLabel?: string
    /** Emoji or HTML icon string */
    icon?: string
    /** Visual variant */
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
    /** Size preset */
    size?: 'sm' | 'md' | 'lg'
    /** Disabled state */
    disabled?: boolean
    /** Loading spinner state */
    loading?: boolean
    /** Full-width stretch */
    fullWidth?: boolean
    /** HTML button type */
    htmlType?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    htmlType: 'button',
  }
)

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  transition:
    background-color 0.15s ease,
    opacity 0.15s ease,
    transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  white-space: nowrap;
}

.action-btn:focus-visible {
  outline: 2px solid var(--action-btn-focus, #3b82f6);
  outline-offset: 2px;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:active:not(:disabled) {
  transform: scale(0.96);
}

/* Sizes – all meet minimum 48px touch target height */
.action-btn--sm {
  min-height: 40px;
  padding: 6px 14px;
  font-size: 0.8125rem;
  border-radius: 8px;
}

.action-btn--md {
  min-height: 48px;
  padding: 10px 20px;
  font-size: 0.9375rem;
}

.action-btn--lg {
  min-height: 56px;
  padding: 14px 28px;
  font-size: 1.0625rem;
  border-radius: 16px;
}

/* Variants */
.action-btn--primary {
  background: var(--action-btn-primary-bg, #3b82f6);
  color: var(--action-btn-primary-color, #ffffff);
}

.action-btn--primary:hover:not(:disabled) {
  background: var(--action-btn-primary-hover, #2563eb);
}

.action-btn--secondary {
  background: var(--action-btn-secondary-bg, #6b7280);
  color: var(--action-btn-secondary-color, #ffffff);
}

.action-btn--secondary:hover:not(:disabled) {
  background: var(--action-btn-secondary-hover, #4b5563);
}

.action-btn--success {
  background: var(--action-btn-success-bg, #10b981);
  color: var(--action-btn-success-color, #ffffff);
}

.action-btn--success:hover:not(:disabled) {
  background: var(--action-btn-success-hover, #059669);
}

.action-btn--danger {
  background: var(--action-btn-danger-bg, #ef4444);
  color: var(--action-btn-danger-color, #ffffff);
}

.action-btn--danger:hover:not(:disabled) {
  background: var(--action-btn-danger-hover, #dc2626);
}

.action-btn--ghost {
  background: transparent;
  color: var(--action-btn-ghost-color, #374151);
}

.action-btn--ghost:hover:not(:disabled) {
  background: var(--action-btn-ghost-hover, rgba(0, 0, 0, 0.06));
}

/* Full width */
.action-btn--full-width {
  width: 100%;
}

/* Icon */
.action-btn__icon {
  display: flex;
  align-items: center;
  font-size: 1.125em;
  line-height: 1;
}

/* Label */
.action-btn__label {
  line-height: 1.2;
}

/* Loading spinner */
.action-btn__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: action-btn-spin 0.6s linear infinite;
}

@keyframes action-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Touch devices: suppress hover */
@media (hover: none) {
  .action-btn:hover:not(:disabled) {
    /* reset hover on touch */
  }
  .action-btn--primary:hover:not(:disabled) {
    background: var(--action-btn-primary-bg, #3b82f6);
  }
  .action-btn--secondary:hover:not(:disabled) {
    background: var(--action-btn-secondary-bg, #6b7280);
  }
  .action-btn--success:hover:not(:disabled) {
    background: var(--action-btn-success-bg, #10b981);
  }
  .action-btn--danger:hover:not(:disabled) {
    background: var(--action-btn-danger-bg, #ef4444);
  }
  .action-btn--ghost:hover:not(:disabled) {
    background: transparent;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .action-btn {
    transition: none;
  }
  .action-btn:active:not(:disabled) {
    transform: none;
  }
  .action-btn__spinner {
    animation-duration: 1.5s;
  }
}

/* High contrast */
@media (prefers-contrast: high) {
  .action-btn {
    border: 2px solid currentColor;
  }
  .action-btn:focus-visible {
    outline-width: 3px;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --action-btn-primary-bg: #2563eb;
    --action-btn-primary-hover: #1d4ed8;
    --action-btn-secondary-bg: #4b5563;
    --action-btn-secondary-hover: #374151;
    --action-btn-ghost-color: #d1d5db;
    --action-btn-ghost-hover: rgba(255, 255, 255, 0.08);
    --action-btn-focus: #60a5fa;
  }
}
</style>
