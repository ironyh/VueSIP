<template>
  <div class="audio-device-settings">
    <!-- Permission Status -->
    <div v-if="permissionStatus !== 'granted'" class="settings-section">
      <div class="permission-alert">
        <p class="alert-title">🎤 Microphone Access Required</p>
        <p class="alert-text">Grant microphone and speaker permissions to select audio devices.</p>
        <button class="btn btn-primary" @click="requestPermissions">Grant Permissions</button>
      </div>
    </div>

    <template v-else>
      <!-- Microphone Selection -->
      <div class="settings-section">
        <h3 class="section-title">Microphone</h3>

        <div class="form-group">
          <label for="microphone" class="form-label">Audio Input Device</label>
          <select
            id="microphone"
            v-model="selectedMicrophoneId"
            class="form-select"
            :disabled="microphones.length === 0"
            @change="handleMicrophoneChange"
          >
            <option value="" disabled>Select microphone...</option>
            <option v-for="device in microphones" :key="device.deviceId" :value="device.deviceId">
              {{ device.label || `Microphone ${device.deviceId.slice(0, 8)}` }}
            </option>
          </select>
          <p class="help-text">Choose which microphone to use for calls</p>
        </div>

        <!-- Volume Control -->
        <div class="form-group">
          <label class="form-label">
            Microphone Volume
            <span class="volume-value">{{ microphoneVolume }}%</span>
          </label>
          <input
            v-model.number="microphoneVolume"
            type="range"
            class="volume-slider"
            min="0"
            max="100"
            step="1"
          />

          <!-- Volume Meter -->
          <div class="volume-meter">
            <div class="meter-bar" :style="{ width: `${microphoneLevel}%` }"></div>
          </div>
          <p class="help-text">Adjust microphone sensitivity and monitor input level</p>
        </div>

        <!-- Test Microphone -->
        <button class="btn btn-secondary btn-sm" @click="testMicrophone">
          {{ testingMic ? 'Testing...' : '🎤 Test Microphone' }}
        </button>
      </div>

      <!-- Speaker Selection -->
      <div class="settings-section">
        <h3 class="section-title">Speaker</h3>

        <div class="form-group">
          <label for="speaker" class="form-label">Audio Output Device</label>
          <select
            id="speaker"
            v-model="selectedSpeakerId"
            class="form-select"
            :disabled="speakers.length === 0"
            @change="handleSpeakerChange"
          >
            <option value="" disabled>Select speaker...</option>
            <option v-for="device in speakers" :key="device.deviceId" :value="device.deviceId">
              {{ device.label || `Speaker ${device.deviceId.slice(0, 8)}` }}
            </option>
          </select>
          <p class="help-text">Choose which speaker to use for audio output</p>
        </div>

        <!-- Volume Control -->
        <div class="form-group">
          <label class="form-label">
            Speaker Volume
            <span class="volume-value">{{ speakerVolume }}%</span>
          </label>
          <input
            v-model.number="speakerVolume"
            type="range"
            class="volume-slider"
            min="0"
            max="100"
            step="1"
          />
          <p class="help-text">Adjust speaker output volume</p>
        </div>

        <!-- Test Speaker -->
        <button class="btn btn-secondary btn-sm" @click="testSpeaker">
          {{ testingSpeaker ? 'Playing...' : '🔊 Test Speaker' }}
        </button>
      </div>

      <!-- Ringtone Selection -->
      <div class="settings-section">
        <h3 class="section-title">Ringtone</h3>

        <div class="form-group">
          <label for="ringtone" class="form-label">Ringtone Device</label>
          <select
            id="ringtone"
            v-model="selectedRingtoneId"
            class="form-select"
            :disabled="speakers.length === 0"
            @change="handleRingtoneChange"
          >
            <option value="">Use same as speaker</option>
            <option v-for="device in speakers" :key="device.deviceId" :value="device.deviceId">
              {{ device.label || `Speaker ${device.deviceId.slice(0, 8)}` }}
            </option>
          </select>
          <p class="help-text">Choose device for incoming call ringtone (optional)</p>
        </div>

        <!-- Ringtone Volume -->
        <div class="form-group">
          <label class="form-label">
            Ringtone Volume
            <span class="volume-value">{{ ringtoneVolume }}%</span>
          </label>
          <input
            v-model.number="ringtoneVolume"
            type="range"
            class="volume-slider"
            min="0"
            max="100"
            step="1"
          />
          <p class="help-text">Adjust ringtone volume level</p>
        </div>

        <!-- Test Ringtone -->
        <button class="btn btn-secondary btn-sm" @click="testRingtone">
          {{ testingRingtone ? 'Playing...' : '🔔 Test Ringtone' }}
        </button>
      </div>

      <!-- Device Status & Options -->
      <div class="settings-section">
        <h3 class="section-title">Device Options</h3>

        <!-- Auto-Select Default -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input v-model="autoSelectDefault" type="checkbox" class="checkbox-input" />
            <span class="checkbox-text">Auto-select default devices</span>
          </label>
          <p class="help-text">Automatically use system default audio devices</p>
        </div>

        <!-- Device Count -->
        <div class="device-status">
          <div class="status-item">
            <span class="status-label">Microphones:</span>
            <span class="status-value">{{ microphones.length }} detected</span>
          </div>
          <div class="status-item">
            <span class="status-label">Speakers:</span>
            <span class="status-value">{{ speakers.length }} detected</span>
          </div>
        </div>

        <!-- Refresh Devices -->
        <button class="btn btn-secondary" @click="refreshDevices">🔄 Refresh Devices</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAudioDevices } from '../../../src/composables/useAudioDevices'

interface Props {
  modelValue: {
    audioInputDeviceId?: string
    audioOutputDeviceId?: string
    ringtoneDeviceId?: string
    autoSelectDefault?: boolean
  }
}

interface Emits {
  (e: 'update:modelValue', value: Props['modelValue']): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Audio devices composable
const {
  microphones,
  speakers,
  currentMicrophone,
  currentSpeaker,
  permissionStatus,
  refreshDevices,
  requestPermissions,
  selectMicrophone,
  selectSpeaker,
} = useAudioDevices()

// Local state
const selectedMicrophoneId = ref(props.modelValue.audioInputDeviceId || '')
const selectedSpeakerId = ref(props.modelValue.audioOutputDeviceId || '')
const selectedRingtoneId = ref(props.modelValue.ringtoneDeviceId || '')
const autoSelectDefault = ref(props.modelValue.autoSelectDefault ?? true)

const microphoneVolume = ref(80)
const speakerVolume = ref(80)
const ringtoneVolume = ref(80)
const microphoneLevel = ref(0)

const testingMic = ref(false)
const testingSpeaker = ref(false)
const testingRingtone = ref(false)

let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let micStream: MediaStream | null = null
let animationFrame: number | null = null

// Device change handlers
async function handleMicrophoneChange() {
  if (selectedMicrophoneId.value) {
    try {
      await selectMicrophone(selectedMicrophoneId.value)
      emitUpdate()
    } catch (error) {
      console.error('Failed to select microphone:', error)
    }
  }
}

async function handleSpeakerChange() {
  if (selectedSpeakerId.value) {
    try {
      await selectSpeaker(selectedSpeakerId.value)
      emitUpdate()
    } catch (error) {
      console.error('Failed to select speaker:', error)
    }
  }
}

function handleRingtoneChange() {
  emitUpdate()
}

// Test functions
async function testMicrophone() {
  if (testingMic.value) return

  testingMic.value = true

  try {
    // Get microphone stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: selectedMicrophoneId.value ? { exact: selectedMicrophoneId.value } : undefined,
      },
    })

    micStream = stream

    // Setup audio analysis
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    analyser.fftSize = 256
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    // Animate volume meter
    const updateLevel = () => {
      if (!analyser) return

      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      microphoneLevel.value = Math.min(100, (average / 255) * 100)

      if (testingMic.value) {
        animationFrame = requestAnimationFrame(updateLevel)
      }
    }

    updateLevel()

    // Stop after 5 seconds
    setTimeout(() => {
      stopMicrophoneTest()
    }, 5000)
  } catch (error) {
    console.error('Microphone test failed:', error)
    testingMic.value = false
  }
}

function stopMicrophoneTest() {
  testingMic.value = false

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop())
    micStream = null
  }

  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  analyser = null
  microphoneLevel.value = 0
}

async function testSpeaker() {
  if (testingSpeaker.value) return

  testingSpeaker.value = true

  try {
    // Play test tone
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)

    oscillator.frequency.value = 440 // A4 note
    gainNode.gain.value = speakerVolume.value / 100

    oscillator.start()

    setTimeout(() => {
      oscillator.stop()
      context.close()
      testingSpeaker.value = false
    }, 1000)
  } catch (error) {
    console.error('Speaker test failed:', error)
    testingSpeaker.value = false
  }
}

async function testRingtone() {
  if (testingRingtone.value) return

  testingRingtone.value = true

  try {
    // Play ringtone pattern (two beeps)
    const context = new AudioContext()
    const oscillator1 = context.createOscillator()
    const oscillator2 = context.createOscillator()
    const gainNode = context.createGain()

    oscillator1.connect(gainNode)
    oscillator2.connect(gainNode)
    gainNode.connect(context.destination)

    oscillator1.frequency.value = 440
    oscillator2.frequency.value = 554.37 // C#5
    gainNode.gain.value = ringtoneVolume.value / 100

    oscillator1.start()
    oscillator1.stop(context.currentTime + 0.2)

    oscillator2.start(context.currentTime + 0.3)
    oscillator2.stop(context.currentTime + 0.5)

    setTimeout(() => {
      context.close()
      testingRingtone.value = false
    }, 800)
  } catch (error) {
    console.error('Ringtone test failed:', error)
    testingRingtone.value = false
  }
}

// Emit updates
function emitUpdate() {
  emit('update:modelValue', {
    audioInputDeviceId: selectedMicrophoneId.value,
    audioOutputDeviceId: selectedSpeakerId.value,
    ringtoneDeviceId: selectedRingtoneId.value,
    autoSelectDefault: autoSelectDefault.value,
  })
}

// Initialize
onMounted(async () => {
  if (permissionStatus.value === 'granted') {
    await refreshDevices()

    // Set selected devices if available
    if (currentMicrophone.value) {
      selectedMicrophoneId.value = currentMicrophone.value.deviceId
    }
    if (currentSpeaker.value) {
      selectedSpeakerId.value = currentSpeaker.value.deviceId
    }
  }
})

// Cleanup
onUnmounted(() => {
  stopMicrophoneTest()
})
</script>

<style scoped>
.audio-device-settings {
  max-width: 800px;
}

.settings-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.permission-alert {
  text-align: center;
  padding: 1rem;
}

.alert-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.alert-text {
  color: #6b7280;
  margin: 0 0 1.5rem 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.volume-value {
  color: #667eea;
  font-weight: 600;
}

.form-select {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
  margin-bottom: 0.75rem;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.2s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.volume-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.volume-meter {
  height: 24px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.meter-bar {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #fbbf24, #ef4444);
  transition: width 0.1s ease-out;
  border-radius: 4px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.checkbox-input {
  width: 1.125rem;
  height: 1.125rem;
  margin-right: 0.625rem;
  cursor: pointer;
  accent-color: #667eea;
}

.checkbox-text {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.help-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.device-status {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.status-value {
  color: #1f2937;
  font-size: 0.875rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
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
</style>
