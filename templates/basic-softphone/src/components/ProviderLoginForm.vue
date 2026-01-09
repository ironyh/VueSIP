<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import type { ProviderConfig, SipCredentials, ProviderField } from 'vuesip'

const props = defineProps<{
  provider: ProviderConfig
  initialValues?: Record<string, string>
}>()

const emit = defineEmits<{
  submit: [credentials: SipCredentials]
  'update:credentials': [values: Record<string, string>]
}>()

// Reactive credentials object
const credentials = reactive<Record<string, string>>({})

// Initialize credentials from provider fields and initial values
function initializeCredentials() {
  // Clear existing credentials
  Object.keys(credentials).forEach((key) => delete credentials[key])

  // Set defaults from field definitions and initial values
  props.provider.fields.forEach((field: ProviderField) => {
    if (props.initialValues?.[field.name]) {
      credentials[field.name] = props.initialValues[field.name]
    } else if (field.type === 'select' && field.options?.length) {
      // Default to first option for select fields
      credentials[field.name] = field.options[0].value
    } else {
      credentials[field.name] = ''
    }
  })
}

// Re-initialize when provider changes
watch(
  () => props.provider.id,
  () => initializeCredentials(),
  { immediate: true }
)

// Re-initialize when initial values change
watch(
  () => props.initialValues,
  () => {
    if (props.initialValues) {
      Object.entries(props.initialValues).forEach(([key, value]) => {
        if (key in credentials) {
          credentials[key] = value
        }
      })
    }
  },
  { deep: true }
)

// Emit credential updates
watch(
  credentials,
  (newValues) => {
    emit('update:credentials', { ...newValues })
  },
  { deep: true }
)

// Validation: check all required fields have values
const isValid = computed(() => {
  return props.provider.fields
    .filter((field: ProviderField) => field.required)
    .every((field: ProviderField) => {
      const value = credentials[field.name]
      return value !== undefined && value !== null && value.trim() !== ''
    })
})

// Form submission handler
function onSubmit() {
  if (!isValid.value) return

  // Transform credentials using provider's mapCredentials function
  const sipCredentials = props.provider.mapCredentials({ ...credentials })
  emit('submit', sipCredentials)
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="provider-login-form">
    <div v-for="field in provider.fields" :key="field.name" class="field">
      <label :for="field.name" class="field-label">
        {{ field.label }}
        <span v-if="field.required" class="required-marker">*</span>
      </label>

      <!-- Text input -->
      <InputText
        v-if="field.type === 'text'"
        :id="field.name"
        v-model="credentials[field.name]"
        :placeholder="field.placeholder"
        :required="field.required"
        class="w-full"
      />

      <!-- Password input -->
      <Password
        v-else-if="field.type === 'password'"
        :id="field.name"
        v-model="credentials[field.name]"
        :placeholder="field.placeholder"
        :required="field.required"
        :feedback="false"
        toggle-mask
        class="w-full"
        :input-class="'w-full'"
      />

      <!-- Select input -->
      <Dropdown
        v-else-if="field.type === 'select'"
        :id="field.name"
        v-model="credentials[field.name]"
        :options="field.options"
        option-label="label"
        option-value="value"
        :placeholder="field.placeholder"
        :required="field.required"
        class="w-full"
      />

      <!-- Help text -->
      <small v-if="field.helpText" class="help-text">
        {{ field.helpText }}
        <a
          v-if="field.helpUrl"
          :href="field.helpUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="help-link"
        >
          Learn more
        </a>
      </small>
    </div>

    <Button type="submit" label="Connect" :disabled="!isValid" class="w-full submit-button" />
  </form>
</template>

<style scoped>
.provider-login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
}

.required-marker {
  color: var(--red-500);
  margin-left: 2px;
}

.help-text {
  display: block;
  margin-top: 4px;
  color: var(--text-color-secondary);
  font-size: 0.75rem;
  line-height: 1.4;
}

.help-link {
  margin-left: 4px;
  color: var(--primary-color);
  text-decoration: none;
}

.help-link:hover {
  text-decoration: underline;
}

.w-full {
  width: 100%;
}

.submit-button {
  margin-top: 8px;
}

/* Ensure Password component spans full width */
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}
</style>
