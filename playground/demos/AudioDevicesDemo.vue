<template>
  <div class="audio-devices-demo">
    <div class="info-section">
      <p>
        VueSip provides easy management of audio input (microphones) and output (speakers) devices.
        This is essential for providing users with the ability to choose their preferred audio
        devices for calls.
      </p>
      <p class="note">
        <strong>Note:</strong> Your browser will request microphone permissions. Grant access to
        enumerate and select audio devices.
      </p>
    </div>

    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
      :duration="simulation.duration.value"
      :remote-uri="simulation.remoteUri.value"
      :remote-display-name="simulation.remoteDisplayName.value"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="simulation.isMuted.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Permissions Status -->
    <div v-if="!effectivePermissionsGranted" class="permissions-section">
      <div class="status-message warning">
        Microphone permissions needed to access audio devices
      </div>
      <button class="btn btn-primary" @click="requestPermissions">
        Grant Microphone Access
      </button>
    </div>

    <!-- Device Selection -->
    <div v-else class="devices-section">
      <!-- Audio Input Devices -->
      <div class="device-group">
        <h3>Audio Input (Microphone)</h3>
        <div v-if="audioInputDevices.length === 0" class="no-devices">
          No microphones detected
        </div>
        <div v-else class="device-list">
          <div
            v-for="device in audioInputDevices"
            :key="device.deviceId"
            class="device-item"
            :class="{ selected: device.deviceId === selectedAudioInputId }"
            @click="selectInput(device.deviceId)"
          >
            <div class="device-info">
              <div class="device-name">
                {{ device.label || `Microphone ${device.deviceId.slice(0, 8)}` }}
              </div>
              <div class="device-id">ID: {{ device.deviceId.slice(0, 16) }}...</div>
            </div>
            <div v-if="device.deviceId === selectedAudioInputId" class="selected-badge">
              ✓ Selected
            </div>
          </div>
        </div>
      </div>

      <!-- Audio Output Devices -->
      <div class="device-group">
        <h3>Audio Output (Speaker)</h3>
        <div v-if="audioOutputDevices.length === 0" class="no-devices">
          No speakers detected
        </div>
        <div v-else class="device-list">
          <div
            v-for="device in audioOutputDevices"
            :key="device.deviceId"
            class="device-item"
            :class="{ selected: device.deviceId === selectedAudioOutputId }"
            @click="selectOutput(device.deviceId)"
          >
            <div class="device-info">
              <div class="device-name">
                {{ device.label || `Speaker ${device.deviceId.slice(0, 8)}` }}
              </div>
              <div class="device-id">ID: {{ device.deviceId.slice(0, 16) }}...</div>
            </div>
            <div v-if="device.deviceId === selectedAudioOutputId" class="selected-badge">
              ✓ Selected
            </div>
          </div>
        </div>
      </div>

      <!-- Refresh Button -->
      <div class="refresh-section">
        <button class="btn btn-secondary" @click="refresh">
          Refresh Devices
        </button>
        <small>Click to detect newly connected audio devices</small>
      </div>

      <!-- Device Change Feedback -->
      <div v-if="changeMessage" class="success-message">
        {{ changeMessage }}
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useMediaDevices } from 'vuesip'

const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectAudioInput,
  selectAudioOutput,
  enumerateDevices
} = useMediaDevices()

// Enumerate devices (request permissions if needed)
await enumerateDevices()

// Select a microphone
selectAudioInput(deviceId)

// Select a speaker
selectAudioOutput(deviceId)

// Watch for device changes
watch(selectedAudioInputId, (deviceId) => {
  console.log('Microphone changed to:', deviceId)
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMediaDevices } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Media Devices
const {
  audioInputDevices: realAudioInputDevices,
  audioOutputDevices: realAudioOutputDevices,
  selectedAudioInputId: realSelectedAudioInputId,
  selectedAudioOutputId: realSelectedAudioOutputId,
  selectAudioInput,
  selectAudioOutput,
  enumerateDevices,
} = useMediaDevices()

// Mock devices for simulation
const mockAudioInputDevices = ref([
  { deviceId: 'mock-mic-1', label: 'Built-in Microphone', kind: 'audioinput' as const, groupId: 'group1', toJSON: () => ({}) },
  { deviceId: 'mock-mic-2', label: 'USB Headset Microphone', kind: 'audioinput' as const, groupId: 'group2', toJSON: () => ({}) },
  { deviceId: 'mock-mic-3', label: 'Bluetooth Earbuds', kind: 'audioinput' as const, groupId: 'group3', toJSON: () => ({}) },
])

const mockAudioOutputDevices = ref([
  { deviceId: 'mock-speaker-1', label: 'Built-in Speakers', kind: 'audiooutput' as const, groupId: 'group1', toJSON: () => ({}) },
  { deviceId: 'mock-speaker-2', label: 'USB Headset', kind: 'audiooutput' as const, groupId: 'group2', toJSON: () => ({}) },
  { deviceId: 'mock-speaker-3', label: 'HDMI Audio Output', kind: 'audiooutput' as const, groupId: 'group4', toJSON: () => ({}) },
])

const mockSelectedInputId = ref('mock-mic-1')
const mockSelectedOutputId = ref('mock-speaker-1')

// Effective values - use simulation or real data based on mode
const audioInputDevices = computed(() =>
  isSimulationMode.value ? mockAudioInputDevices.value : realAudioInputDevices.value
)

const audioOutputDevices = computed(() =>
  isSimulationMode.value ? mockAudioOutputDevices.value : realAudioOutputDevices.value
)

const selectedAudioInputId = computed(() =>
  isSimulationMode.value ? mockSelectedInputId.value : realSelectedAudioInputId.value
)

const selectedAudioOutputId = computed(() =>
  isSimulationMode.value ? mockSelectedOutputId.value : realSelectedAudioOutputId.value
)

// State
const permissionsGranted = ref(false)
const changeMessage = ref('')

// Effective permissions - always granted in simulation mode
const effectivePermissionsGranted = computed(() =>
  isSimulationMode.value ? true : permissionsGranted.value
)

// Methods
const requestPermissions = async () => {
  if (isSimulationMode.value) {
    permissionsGranted.value = true
    showChangeMessage('Simulated permissions granted')
    return
  }

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
    permissionsGranted.value = true
    await enumerateDevices()
  } catch (error) {
    console.error('Permission error:', error)
    alert('Microphone access was denied. Please grant permissions in your browser settings.')
  }
}

const selectInput = (deviceId: string) => {
  if (isSimulationMode.value) {
    mockSelectedInputId.value = deviceId
    showChangeMessage('Microphone changed successfully (simulated)')
    console.log('[Simulation] Selected input device:', deviceId)
    return
  }

  try {
    selectAudioInput(deviceId)
    showChangeMessage('Microphone changed successfully')
  } catch (error) {
    console.error('Select input error:', error)
    alert(`Failed to select microphone: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const selectOutput = (deviceId: string) => {
  if (isSimulationMode.value) {
    mockSelectedOutputId.value = deviceId
    showChangeMessage('Speaker changed successfully (simulated)')
    console.log('[Simulation] Selected output device:', deviceId)
    return
  }

  try {
    selectAudioOutput(deviceId)
    showChangeMessage('Speaker changed successfully')
  } catch (error) {
    console.error('Select output error:', error)
    alert(`Failed to select speaker: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const refresh = async () => {
  if (isSimulationMode.value) {
    showChangeMessage('Device list refreshed (simulated)')
    console.log('[Simulation] Refreshed device list')
    return
  }

  try {
    await enumerateDevices()
    showChangeMessage('Device list refreshed')
  } catch (error) {
    console.error('Refresh error:', error)
    alert(`Failed to refresh devices: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const showChangeMessage = (message: string) => {
  changeMessage.value = message
  setTimeout(() => {
    changeMessage.value = ''
  }, 3000)
}

// Check permissions on mount
onMounted(async () => {
  try {
    // Try to enumerate devices - if permissions are already granted, this will work
    await enumerateDevices()
    permissionsGranted.value = audioInputDevices.value.length > 0
  } catch (error) {
    console.log('Permissions not yet granted')
  }
})
</script>

<style scoped>
.audio-devices-demo {
  max-width: 700px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0 0 1rem 0;
  color: #666;
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: 1rem;
  background: #eff6ff;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.875rem;
}

.permissions-section {
  text-align: center;
  padding: 2rem;
}

.status-message {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.status-message.warning {
  background: #fef3c7;
  color: #92400e;
}

.devices-section {
  padding: 1.5rem;
}

.device-group {
  margin-bottom: 2rem;
}

.device-group h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.no-devices {
  padding: 1rem;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  text-align: center;
  color: #666;
  font-size: 0.875rem;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.device-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.device-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.device-item.selected {
  border-color: #667eea;
  background: #eff6ff;
}

.device-info {
  flex: 1;
}

.device-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.device-id {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: monospace;
}

.selected-badge {
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.refresh-section {
  margin-top: 1.5rem;
  text-align: center;
}

.refresh-section small {
  display: block;
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.success-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.code-example pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}
</style>
