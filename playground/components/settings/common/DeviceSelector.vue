<template>
  <div class="device-selector">
    <div class="selector-header">
      <label :for="selectId" class="input-label">
        {{ label }}
        <span v-if="required" class="required-mark">*</span>
      </label>
      <button
        v-if="showRefresh"
        type="button"
        class="refresh-btn"
        :disabled="refreshing"
        @click="handleRefresh"
        title="Refresh device list"
      >
        <span :class="{ spinning: refreshing }">🔄</span>
      </button>
    </div>

    <!-- Permission request if needed -->
    <div v-if="!hasPermission && deviceType === 'audioinput'" class="permission-notice">
      <p>Microphone access required to enumerate devices</p>
      <button type="button" class="btn btn-sm btn-primary" @click="handleRequestPermission">
        Grant Permission
      </button>
    </div>

    <!-- Device selection -->
    <div v-else class="select-wrapper">
      <select
        :id="selectId"
        v-model="internalValue"
        :disabled="disabled || devices.length === 0"
        :aria-label="ariaLabel || label"
        :aria-describedby="helpText ? `${selectId}-help` : undefined"
        class="select-field"
        @change="handleChange"
      >
        <option v-if="devices.length === 0" value="" disabled>
          {{ deviceType === 'audioinput' ? 'No microphones found' : 'No speakers found' }}
        </option>
        <option v-for="device in devices" :key="device.deviceId" :value="device.deviceId">
          {{
            device.label ||
              `${deviceType === 'audioinput' ? 'Microphone' : 'Speaker'} ${device.deviceId.slice(0, 8)}`
          }}
        </option>
      </select>
      <span class="select-icon" aria-hidden="true">▼</span>
    </div>

    <!-- Test button for audio preview -->
    <div v-if="showTest && deviceType === 'audiooutput' && internalValue" class="test-section">
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        :disabled="testing"
        @click="handleTest"
      >
        {{ testing ? '🔊 Playing...' : '🔊 Test Speaker' }}
      </button>
    </div>

    <p v-if="helpText" :id="`${selectId}-help`" class="help-text">
      {{ helpText }}
    </p>

    <p v-if="error" class="error-message" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Types
interface MediaDeviceInfo {
  deviceId: string
  kind: MediaDeviceKind
  label: string
  groupId: string
}

// Props
const props = defineProps<{
  modelValue: string
  label: string
  deviceType: 'audioinput' | 'audiooutput' | 'videoinput'
  devices: MediaDeviceInfo[]
  hasPermission?: boolean
  disabled?: boolean
  required?: boolean
  showRefresh?: boolean
  showTest?: boolean
  helpText?: string
  error?: string
  ariaLabel?: string
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'refresh'): void
  (e: 'requestPermission'): void
  (e: 'test', deviceId: string): void
}>()

// State
const refreshing = ref(false)
const testing = ref(false)

// Generate unique ID
const selectId = computed(() => `device-selector-${Math.random().toString(36).substr(2, 9)}`)

// Internal value for v-model
const internalValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

// Methods
const handleChange = () => {
  // Emit change event (already handled by v-model)
}

const handleRefresh = async () => {
  refreshing.value = true
  emit('refresh')

  // Simulate refresh delay
  setTimeout(() => {
    refreshing.value = false
  }, 500)
}

const handleRequestPermission = () => {
  emit('requestPermission')
}

const handleTest = async () => {
  if (!internalValue.value) return

  testing.value = true
  emit('test', internalValue.value)

  // Auto-reset after 2 seconds (test tone duration)
  setTimeout(() => {
    testing.value = false
  }, 2000)
}
</script>

<style scoped>
.device-selector {
  margin-bottom: 1rem;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.input-label {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-primary, #0f172a);
}

.required-mark {
  color: #ef4444;
  margin-left: 0.25rem;
}

.refresh-btn {
  padding: 0.25rem 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--bg-secondary, #f8fafc);
  border-color: var(--primary, #667eea);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn .spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Permission notice */
.permission-notice {
  padding: 1rem;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 8px;
  text-align: center;
}

.permission-notice p {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #92400e;
}

/* Select styling */
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

.select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  pointer-events: none;
}

/* Test section */
.test-section {
  margin-top: 0.75rem;
}

/* Common elements */
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

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-primary {
  background: var(--primary, #667eea);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: var(--bg-secondary, #f8fafc);
  color: var(--text-primary, #0f172a);
  border: 1px solid var(--border-color, #e2e8f0);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-primary, white);
  border-color: var(--primary, #667eea);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .select-field,
  .refresh-btn .spinning {
    transition: none;
    animation: none;
  }
}
</style>
