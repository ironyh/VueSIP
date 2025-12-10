import type { ExampleDefinition } from './types'
import AudioDevicesDemo from '../demos/AudioDevicesDemo.vue'

export const audioDevicesExample: ExampleDefinition = {
  id: 'audio-devices',
  icon: '🎤',
  title: 'Audio Devices',
  description: 'Manage microphones and speakers',
  category: 'sip',
  tags: ['Audio', 'Devices', 'Settings'],
  component: AudioDevicesDemo,
  setupGuide: '<p>Manage audio input and output devices for your SIP calls. Users can select their preferred microphone and speaker.</p>',
  codeSnippets: [
    {
      title: 'Audio Device Management',
      description: 'List and select audio devices',
      code: `import { useMediaDevices } from 'vuesip'

const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectAudioInput,
  selectAudioOutput,
  enumerateDevices
} = useMediaDevices()

// Enumerate available devices
await enumerateDevices()

// Select a specific microphone
selectAudioInput(deviceId)

// Select a specific speaker
selectAudioOutput(deviceId)`,
    },
    {
      title: 'Permission Handling',
      description: 'Request and check microphone permissions',
      code: `import { ref, onMounted } from 'vue'

const permissionState = ref<'prompt' | 'granted' | 'denied'>('prompt')
const permissionError = ref<string | null>(null)

// Check permission status
const checkPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    permissionState.value = result.state

    result.addEventListener('change', () => {
      permissionState.value = result.state
    })
  } catch (e) {
    // Fallback: try to access media
    await requestPermission()
  }
}

// Request microphone permission
const requestPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    permissionState.value = 'granted'
    await enumerateDevices()
  } catch (error) {
    permissionState.value = 'denied'
    permissionError.value = error instanceof Error ? error.message : 'Permission denied'
  }
}

onMounted(checkPermission)`,
    },
    {
      title: 'Device Change Detection',
      description: 'Monitor when devices are connected or disconnected',
      code: `import { onMounted, onUnmounted, ref } from 'vue'

const deviceChangeCount = ref(0)

const handleDeviceChange = async () => {
  deviceChangeCount.value++
  console.log('Device change detected!')

  // Re-enumerate devices
  await enumerateDevices()

  // Check if selected device is still available
  const inputStillExists = audioInputDevices.value.some(
    d => d.deviceId === selectedAudioInputId.value
  )

  if (!inputStillExists && audioInputDevices.value.length > 0) {
    // Select default device as fallback
    selectAudioInput(audioInputDevices.value[0].deviceId)
    showNotification('Microphone disconnected, switched to default')
  }

  const outputStillExists = audioOutputDevices.value.some(
    d => d.deviceId === selectedAudioOutputId.value
  )

  if (!outputStillExists && audioOutputDevices.value.length > 0) {
    selectAudioOutput(audioOutputDevices.value[0].deviceId)
    showNotification('Speaker disconnected, switched to default')
  }
}

onMounted(() => {
  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
})

onUnmounted(() => {
  navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
})`,
    },
    {
      title: 'Audio Level Monitoring',
      description: 'Visualize microphone input levels',
      code: `import { ref, onUnmounted } from 'vue'

const audioLevel = ref(0)
const isMonitoring = ref(false)
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let animationFrame: number | null = null

const startMonitoring = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: selectedAudioInputId.value }
    })

    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256

    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    isMonitoring.value = true

    const updateLevel = () => {
      if (!analyser || !isMonitoring.value) return

      analyser.getByteFrequencyData(dataArray)
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length
      audioLevel.value = Math.round((average / 255) * 100)

      animationFrame = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  } catch (error) {
    console.error('Failed to start audio monitoring:', error)
  }
}

const stopMonitoring = () => {
  isMonitoring.value = false
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (audioContext) audioContext.close()
  audioLevel.value = 0
}

onUnmounted(stopMonitoring)`,
    },
    {
      title: 'Device Persistence',
      description: 'Save and restore device preferences',
      code: `import { watch, onMounted } from 'vue'

const STORAGE_KEY = 'vuesip-audio-preferences'

interface AudioPreferences {
  inputDeviceId: string | null
  outputDeviceId: string | null
  inputVolume: number
  outputVolume: number
}

// Load saved preferences
const loadPreferences = async (): Promise<AudioPreferences | null> => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return null
  return JSON.parse(saved)
}

// Save preferences
const savePreferences = (prefs: AudioPreferences) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

// Restore devices on mount
onMounted(async () => {
  await enumerateDevices()

  const prefs = await loadPreferences()
  if (!prefs) return

  // Restore input device if still available
  if (prefs.inputDeviceId) {
    const inputExists = audioInputDevices.value.some(
      d => d.deviceId === prefs.inputDeviceId
    )
    if (inputExists) {
      selectAudioInput(prefs.inputDeviceId)
    }
  }

  // Restore output device if still available
  if (prefs.outputDeviceId) {
    const outputExists = audioOutputDevices.value.some(
      d => d.deviceId === prefs.outputDeviceId
    )
    if (outputExists) {
      selectAudioOutput(prefs.outputDeviceId)
    }
  }
})

// Auto-save on changes
watch([selectedAudioInputId, selectedAudioOutputId], ([input, output]) => {
  savePreferences({
    inputDeviceId: input,
    outputDeviceId: output,
    inputVolume: 100,
    outputVolume: 100,
  })
})`,
    },
    {
      title: 'Audio Device Selector Component',
      description: 'Complete device selection UI',
      code: `<template>
  <div class="audio-settings">
    <div class="device-group">
      <label>Microphone</label>
      <select
        :value="selectedAudioInputId"
        @change="selectAudioInput(($event.target as HTMLSelectElement).value)"
        :disabled="audioInputDevices.length === 0"
      >
        <option v-if="audioInputDevices.length === 0" value="">
          No microphones found
        </option>
        <option
          v-for="device in audioInputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label || 'Microphone ' + device.deviceId.slice(0, 8) }}
        </option>
      </select>

      <!-- Audio level indicator -->
      <div class="level-meter">
        <div class="level-bar" :style="{ width: audioLevel + '%' }"></div>
      </div>
      <button @click="isMonitoring ? stopMonitoring() : startMonitoring()">
        {{ isMonitoring ? 'Stop Test' : 'Test Mic' }}
      </button>
    </div>

    <div class="device-group">
      <label>Speaker</label>
      <select
        :value="selectedAudioOutputId"
        @change="selectAudioOutput(($event.target as HTMLSelectElement).value)"
        :disabled="audioOutputDevices.length === 0"
      >
        <option v-if="audioOutputDevices.length === 0" value="">
          No speakers found
        </option>
        <option
          v-for="device in audioOutputDevices"
          :key="device.deviceId"
          :value="device.deviceId"
        >
          {{ device.label || 'Speaker ' + device.deviceId.slice(0, 8) }}
        </option>
      </select>
      <button @click="testSpeaker">Test Speaker</button>
    </div>
  </div>
</template>`,
    },
    {
      title: 'Speaker Test',
      description: 'Play test audio through selected speaker',
      code: `const testAudio = ref<HTMLAudioElement | null>(null)
const isTestingOutput = ref(false)

const testSpeaker = async () => {
  if (isTestingOutput.value) {
    testAudio.value?.pause()
    isTestingOutput.value = false
    return
  }

  try {
    // Create or reuse test audio element
    if (!testAudio.value) {
      testAudio.value = new Audio('/audio/test-tone.mp3')
      testAudio.value.onended = () => {
        isTestingOutput.value = false
      }
    }

    // Set output device if supported
    if (selectedAudioOutputId.value && 'setSinkId' in testAudio.value) {
      await (testAudio.value as any).setSinkId(selectedAudioOutputId.value)
    }

    isTestingOutput.value = true
    await testAudio.value.play()
  } catch (error) {
    console.error('Speaker test failed:', error)
    isTestingOutput.value = false
  }
}

// Generate test tone programmatically
const generateTestTone = async () => {
  const audioContext = new AudioContext()

  // Set output device
  if (selectedAudioOutputId.value && 'setSinkId' in audioContext) {
    await (audioContext as any).setSinkId(selectedAudioOutputId.value)
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = 440 // A4 note
  gainNode.gain.value = 0.3

  oscillator.start()

  // Play for 1 second
  setTimeout(() => {
    oscillator.stop()
    audioContext.close()
  }, 1000)
}`,
    },
    {
      title: 'Error Handling and Fallbacks',
      description: 'Handle device access errors gracefully',
      code: `type AudioError =
  | 'NotFoundError'       // No device found
  | 'NotAllowedError'     // Permission denied
  | 'NotReadableError'    // Device in use by another app
  | 'OverconstrainedError' // Constraints can't be satisfied
  | 'AbortError'          // Operation aborted
  | 'SecurityError'       // Security restriction
  | 'TypeError'           // Invalid constraints

const errorMessages: Record<AudioError, string> = {
  NotFoundError: 'No microphone or speaker found. Please connect a device.',
  NotAllowedError: 'Microphone access was denied. Please allow access in your browser settings.',
  NotReadableError: 'Your microphone is being used by another application.',
  OverconstrainedError: 'The selected device does not meet the requirements.',
  AbortError: 'The operation was cancelled.',
  SecurityError: 'Audio access is not allowed in this context.',
  TypeError: 'Invalid audio configuration.',
}

const handleAudioError = (error: Error) => {
  const errorType = error.name as AudioError
  const message = errorMessages[errorType] || \`Audio error: \${error.message}\`

  showNotification(message, 'error')

  // Log for debugging
  console.error('Audio error:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  })

  // Attempt recovery
  if (errorType === 'NotReadableError') {
    // Try again after a delay
    setTimeout(async () => {
      try {
        await enumerateDevices()
        showNotification('Attempting to reconnect...', 'info')
      } catch (e) {
        // Still failing
      }
    }, 2000)
  }
}`,
    },
  ],
}
