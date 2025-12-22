<template>
  <div class="text-input">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>

    <input
      :id="inputId"
      ref="inputRef"
      v-model="internalValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel || label"
      :aria-invalid="!!error"
      :aria-describedby="error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined"
      class="input-field"
      :class="{ error: !!error }"
      @blur="handleBlur"
    />

    <p v-if="helpText && !error" :id="`${inputId}-help`" class="help-text">
      {{ helpText }}
    </p>

    <p v-if="error" :id="`${inputId}-error`" class="error-message" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Props
const props = defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  helpText?: string
  error?: string
  type?: 'text' | 'password' | 'email' | 'url' | 'tel'
  disabled?: boolean
  required?: boolean
  autofocus?: boolean
  ariaLabel?: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur'): void
}>()

// Generate unique ID
const inputId = computed(() => `text-input-${Math.random().toString(36).substr(2, 9)}`)

// Refs
const inputRef = ref<HTMLInputElement | null>(null)

// Internal value for v-model
const internalValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

// Methods
const handleBlur = () => {
  emit('blur')
}

const focus = () => {
  inputRef.value?.focus()
}

// Auto-focus if requested
onMounted(() => {
  if (props.autofocus) {
    focus()
  }
})

// Expose methods
defineExpose({ focus })
</script>

<style scoped>
.text-input {
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

.input-field {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--bg-primary, white);
  color: var(--text-primary, #0f172a);
  transition: all 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--bg-secondary, #f8fafc);
}

.input-field.error {
  border-color: #ef4444;
}

.input-field.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
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
  .input-field {
    transition: none;
  }
}
</style>
