<template>
  <div class="device-selection p-4 bg-gray-50 rounded-lg">
    <h3 class="text-lg font-medium mb-4">Device Settings</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Audio Input -->
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-1">Microphone</label>
        <select
          v-model="selectedAudioInput"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          @change="updateAudioInput"
        >
          <option v-for="device in audioInputs" :key="device.deviceId" :value="device.deviceId">
            {{ device.label }}
          </option>
        </select>
      </div>

      <!-- Video Input -->
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-1">Camera</label>
        <select
          v-model="selectedVideoInput"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          @change="updateVideoInput"
        >
          <option v-for="device in videoInputs" :key="device.deviceId" :value="device.deviceId">
            {{ device.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="mt-4 flex justify-end">
      <button
        @click="refreshDevices"
        class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Refresh Devices
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { playgroundSipClient } from '../sipClient'

const audioInputs = ref<MediaDeviceInfo[]>([])
const videoInputs = ref<MediaDeviceInfo[]>([])
const selectedAudioInput = ref<string>('')
const selectedVideoInput = ref<string>('')

const refreshDevices = async () => {
  try {
    // Request permission first to get labels
    await playgroundSipClient.media.getUserMedia({ audio: true })

    // Enumerate devices
    await playgroundSipClient.media.enumerateDevices()

    // Filter devices
    const devices = await navigator.mediaDevices.enumerateDevices()
    audioInputs.value = devices.filter((d) => d.kind === 'audioinput')
    videoInputs.value = devices.filter((d) => d.kind === 'videoinput')

    // Set defaults if not set
    if (!selectedAudioInput.value && audioInputs.value.length > 0) {
      selectedAudioInput.value = audioInputs.value[0].deviceId
      updateAudioInput()
    }
    if (!selectedVideoInput.value && videoInputs.value.length > 0) {
      selectedVideoInput.value = videoInputs.value[0].deviceId
      updateVideoInput()
    }
  } catch (err) {
    console.error('Failed to refresh devices:', err)
  }
}

const updateAudioInput = () => {
  if (selectedAudioInput.value) {
    playgroundSipClient.media.selectAudioInput(selectedAudioInput.value)
  }
}

const updateVideoInput = () => {
  if (selectedVideoInput.value) {
    playgroundSipClient.media.selectVideoInput(selectedVideoInput.value)
  }
}

onMounted(() => {
  refreshDevices()
})
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}
</style>
