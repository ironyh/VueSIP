<script setup lang="ts">
/**
 * ProviderSelector Component
 *
 * Dropdown component for selecting SIP providers from a list.
 * Displays provider logos when available and emits events on selection change.
 *
 * @example
 * ```vue
 * <ProviderSelector
 *   v-model="selectedProviderId"
 *   :providers="providers"
 *   @provider-changed="handleProviderChange"
 * />
 * ```
 */
import { computed, ref, watch } from 'vue'
import Dropdown from 'primevue/dropdown'
import type { ProviderConfig } from 'vuesip'

const props = defineProps<{
  /** List of available providers */
  providers: ProviderConfig[]
  /** Currently selected provider ID (v-model) */
  modelValue?: string
}>()

const emit = defineEmits<{
  /** Emitted when modelValue changes */
  'update:modelValue': [value: string]
  /** Emitted when provider selection changes, includes full provider config */
  'provider-changed': [provider: ProviderConfig]
}>()

// Internal state for selected provider ID
const selectedProviderId = ref<string | undefined>(props.modelValue)

// Computed property for the currently selected provider object
const selectedProvider = computed<ProviderConfig | undefined>(() => {
  if (!selectedProviderId.value) return undefined
  return props.providers.find((p) => p.id === selectedProviderId.value)
})

// Watch for external modelValue changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== selectedProviderId.value) {
      selectedProviderId.value = newValue
    }
  }
)

// Handle dropdown selection change
function onProviderChange(event: { value: string }) {
  const newProviderId = event.value
  selectedProviderId.value = newProviderId

  // Emit v-model update
  emit('update:modelValue', newProviderId)

  // Find and emit the full provider config
  const provider = props.providers.find((p) => p.id === newProviderId)
  if (provider) {
    emit('provider-changed', provider)
  }
}
</script>

<template>
  <div class="provider-selector">
    <label for="provider-select">SIP Provider</label>
    <Dropdown
      id="provider-select"
      v-model="selectedProviderId"
      :options="providers"
      optionLabel="name"
      optionValue="id"
      placeholder="Select a provider"
      class="w-full"
      @change="onProviderChange"
    >
      <template #value="slotProps">
        <div v-if="slotProps.value" class="flex align-items-center">
          <img
            v-if="selectedProvider?.logo"
            :src="selectedProvider.logo"
            :alt="`${selectedProvider.name} logo`"
            class="provider-logo mr-2"
          />
          <span>{{ selectedProvider?.name }}</span>
        </div>
        <span v-else>{{ slotProps.placeholder }}</span>
      </template>
      <template #option="slotProps">
        <div class="flex align-items-center">
          <img
            v-if="slotProps.option.logo"
            :src="slotProps.option.logo"
            :alt="`${slotProps.option.name} logo`"
            class="provider-logo mr-2"
          />
          <span>{{ slotProps.option.name }}</span>
        </div>
      </template>
    </Dropdown>
  </div>
</template>

<style scoped>
.provider-selector {
  margin-bottom: 1rem;
}

.provider-selector label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
}

.provider-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 4px;
}

.flex {
  display: flex;
}

.align-items-center {
  align-items: center;
}

.mr-2 {
  margin-right: 0.5rem;
}

.w-full {
  width: 100%;
}
</style>
