<script setup lang="ts">
import { computed } from 'vue'
import Dropdown from 'primevue/dropdown'

interface MediaDevice {
  deviceId: string
  label: string
  kind: string
}

const props = defineProps<{
  audioInputDevices: readonly MediaDevice[]
  audioOutputDevices: readonly MediaDevice[]
  selectedAudioInputId: string | null
  selectedAudioOutputId: string | null
}>()

const emit = defineEmits<{
  selectInput: [deviceId: string]
  selectOutput: [deviceId: string]
}>()

// Convert readonly arrays to mutable for PrimeVue Dropdown
const inputOptions = computed(() => [...props.audioInputDevices])
const outputOptions = computed(() => [...props.audioOutputDevices])

function handleInputChange(event: { value: string }) {
  emit('selectInput', event.value)
}

function handleOutputChange(event: { value: string }) {
  emit('selectOutput', event.value)
}
</script>

<template>
  <div class="device-settings">
    <h3>Audio Devices</h3>

    <div class="device-group">
      <label for="audio-input">Microphone</label>
      <Dropdown
        id="audio-input"
        :model-value="selectedAudioInputId"
        :options="inputOptions"
        option-label="label"
        option-value="deviceId"
        placeholder="Select microphone"
        class="w-full"
        @change="handleInputChange"
      />
    </div>

    <div class="device-group">
      <label for="audio-output">Speaker</label>
      <Dropdown
        id="audio-output"
        :model-value="selectedAudioOutputId"
        :options="outputOptions"
        option-label="label"
        option-value="deviceId"
        placeholder="Select speaker"
        class="w-full"
        @change="handleOutputChange"
      />
    </div>
  </div>
</template>

<style scoped>
.device-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.device-settings h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.device-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.w-full {
  width: 100%;
}
</style>
