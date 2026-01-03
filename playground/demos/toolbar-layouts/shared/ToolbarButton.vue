<template>
  <button
    :class="['toolbar-btn', buttonClass]"
    :title="title || label"
    :aria-label="ariaLabel || `${label}${title ? ' - ' + title : ''}`"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <component :is="icon" v-if="icon" class="btn-icon" aria-hidden="true" />
    <span class="btn-text">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Accessible toolbar button component with built-in ARIA support
 *
 * Features:
 * - Automatic aria-label generation from label + title
 * - Icons are hidden from screen readers (aria-hidden="true")
 * - Keyboard accessible (native button element)
 * - Disabled state support
 *
 * @example
 * <ToolbarButton
 *   label="Connect"
 *   :icon="PhoneIcon"
 *   button-class="btn-primary"
 *   aria-label="Connect to SIP server"
 *   @click="handleConnect"
 * />
 */

interface ToolbarButtonProps {
  /** Button text label */
  label: string
  /** Vue component for icon (optional) */
  icon?: Component
  /** CSS class for styling (btn-primary, btn-danger, etc.) */
  buttonClass?: string
  /** Tooltip text (defaults to label) */
  title?: string
  /** Accessibility label (auto-generated if not provided) */
  ariaLabel?: string
  /** Disabled state */
  disabled?: boolean
}

defineProps<ToolbarButtonProps>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
/* Inherits styles from parent demo */
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.btn-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.btn-text {
  white-space: nowrap;
}
</style>
