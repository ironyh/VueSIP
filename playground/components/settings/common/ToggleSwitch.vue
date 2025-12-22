<template>
  <div class="toggle-switch">
    <label :for="toggleId" class="toggle-container">
      <div class="toggle-info">
        <span class="toggle-label">{{ label }}</span>
        <span v-if="description" class="toggle-description">{{ description }}</span>
      </div>

      <button
        :id="toggleId"
        type="button"
        role="switch"
        :aria-checked="modelValue"
        :aria-label="ariaLabel || label"
        :aria-describedby="description ? `${toggleId}-desc` : undefined"
        :disabled="disabled"
        class="toggle-button"
        :class="{ active: modelValue, disabled }"
        @click="handleToggle"
      >
        <span class="toggle-slider" aria-hidden="true"></span>
      </button>
    </label>

    <span v-if="description" :id="`${toggleId}-desc`" class="sr-only">
      {{ description }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
const props = defineProps<{
  modelValue: boolean
  label: string
  description?: string
  disabled?: boolean
  ariaLabel?: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// Generate unique ID
const toggleId = computed(() => `toggle-switch-${Math.random().toString(36).substr(2, 9)}`)

// Methods
const handleToggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<style scoped>
.toggle-switch {
  margin-bottom: 1rem;
}

.toggle-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  cursor: pointer;
  padding: 0.75rem 0;
}

.toggle-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toggle-label {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-primary, #0f172a);
}

.toggle-description {
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

.toggle-button {
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--border-color, #e2e8f0);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  flex-shrink: 0;
}

.toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.toggle-button.active {
  background: var(--primary, #667eea);
}

.toggle-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-button.active .toggle-slider {
  transform: translateX(24px);
}

/* Screen reader only text */
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

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .toggle-button,
  .toggle-slider {
    transition: none;
  }
}

/* Responsive */
@media (max-width: 480px) {
  .toggle-container {
    padding: 0.5rem 0;
  }

  .toggle-info {
    gap: 0.125rem;
  }
}
</style>
