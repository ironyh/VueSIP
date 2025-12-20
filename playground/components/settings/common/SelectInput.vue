<template>
  <div class="select-input">
    <label v-if="label" :for="selectId" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>

    <div class="select-wrapper">
      <select
        :id="selectId"
        v-model="internalValue"
        :disabled="disabled"
        :aria-label="ariaLabel || label"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined"
        class="select-field"
        :class="{ error: !!error }"
        @blur="handleBlur"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in normalizedOptions"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <span class="select-icon" aria-hidden="true">▼</span>
    </div>

    <p v-if="helpText && !error" :id="`${selectId}-help`" class="help-text">
      {{ helpText }}
    </p>

    <p v-if="error" :id="`${selectId}-error`" class="error-message" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Types
interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

// Props
const props = defineProps<{
  modelValue: string | number
  label?: string
  placeholder?: string
  helpText?: string
  error?: string
  options: SelectOption[] | string[] | Record<string, string>
  disabled?: boolean
  required?: boolean
  ariaLabel?: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'blur'): void
}>()

// Generate unique ID
const selectId = computed(() => `select-input-${Math.random().toString(36).substr(2, 9)}`)

// Normalize options to standard format
const normalizedOptions = computed<SelectOption[]>(() => {
  if (Array.isArray(props.options)) {
    // Array of strings or SelectOption objects
    return props.options.map(option => {
      if (typeof option === 'string') {
        return { label: option, value: option }
      }
      return option
    })
  } else {
    // Object/Record format { value: label }
    return Object.entries(props.options).map(([value, label]) => ({
      label,
      value
    }))
  }
})

// Internal value for v-model
const internalValue = computed({
  get: () => props.modelValue,
  set: (value: string | number) => emit('update:modelValue', value)
})

// Methods
const handleBlur = () => {
  emit('blur')
}
</script>

<style scoped>
.select-input {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-primary, #0f172a);
}

.required-mark {
  color: #ef4444;
  margin-left: 0.25rem;
}

.select-wrapper {
  position: relative;
}

.select-field {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--bg-primary, white);
  color: var(--text-primary, #0f172a);
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

.select-field:focus {
  outline: none;
  border-color: var(--primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.select-field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--bg-secondary, #f8fafc);
}

.select-field.error {
  border-color: #ef4444;
}

.select-field.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  pointer-events: none;
  transition: transform 0.2s;
}

.select-field:focus + .select-icon {
  transform: translateY(-50%) rotate(180deg);
}

.help-text {
  margin: 0.5rem 0 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

.error-message {
  margin: 0.5rem 0 0 0;
  font-size: 0.75rem;
  color: #ef4444;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.error-message::before {
  content: '⚠';
  font-size: 0.875rem;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .select-field,
  .select-icon {
    transition: none;
  }
}
</style>
