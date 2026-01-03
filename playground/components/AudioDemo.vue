<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

const audioState = reactive({
  inputDevice: 'default',
  outputDevice: 'default',
  inputVolume: 75,
  outputVolume: 80,
  inputLevel: 0,
  outputLevel: 0,
  isMuted: false,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
})

const availableDevices = reactive({
  inputs: [
    { id: 'default', label: 'Default - Built-in Microphone' },
    { id: 'mic-1', label: 'External USB Microphone' },
    { id: 'mic-2', label: 'Bluetooth Headset Microphone' },
  ],
  outputs: [
    { id: 'default', label: 'Default - Built-in Speakers' },
    { id: 'speaker-1', label: 'External USB Speakers' },
    { id: 'speaker-2', label: 'Bluetooth Headphones' },
    { id: 'speaker-3', label: 'HDMI Audio Output' },
  ],
})

const events = ref<Array<{ time: string; type: string; data: string }>>([])

const addEvent = (type: string, data: string) => {
  const now = new Date()
  events.value.unshift({
    time: now.toLocaleTimeString(),
    type,
    data,
  })
  if (events.value.length > 20) events.value.pop()
}

// Simulate audio levels
let _levelInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  _levelInterval = setInterval(() => {
    if (!audioState.isMuted) {
      audioState.inputLevel = Math.floor(Math.random() * 40) + 20 + audioState.inputVolume / 4
      audioState.outputLevel = Math.floor(Math.random() * 30) + 30 + audioState.outputVolume / 4
    } else {
      audioState.inputLevel = 0
    }
  }, 100)
})

const changeInputDevice = (deviceId: string) => {
  audioState.inputDevice = deviceId
  const device = availableDevices.inputs.find((d) => d.id === deviceId)
  addEvent('AUDIO', `Input device changed to: ${device?.label}`)
  addEvent('MEDIA', 'Reacquiring media stream with new device...')
  setTimeout(() => {
    addEvent('MEDIA', 'New input stream acquired successfully')
  }, 300)
}

const changeOutputDevice = (deviceId: string) => {
  audioState.outputDevice = deviceId
  const device = availableDevices.outputs.find((d) => d.id === deviceId)
  addEvent('AUDIO', `Output device changed to: ${device?.label}`)
  addEvent('MEDIA', 'setSinkId() called on audio element')
}

const toggleMute = () => {
  audioState.isMuted = !audioState.isMuted
  addEvent('AUDIO', audioState.isMuted ? 'Microphone muted' : 'Microphone unmuted')
  addEvent('MEDIA', `track.enabled = ${!audioState.isMuted}`)
}

const updateInputVolume = (e: Event) => {
  const value = (e.target as HTMLInputElement).valueAsNumber
  audioState.inputVolume = value
  addEvent('AUDIO', `Input volume: ${value}%`)
}

const updateOutputVolume = (e: Event) => {
  const value = (e.target as HTMLInputElement).valueAsNumber
  audioState.outputVolume = value
  addEvent('AUDIO', `Output volume: ${value}%`)
}

const toggleConstraint = (
  constraint: 'noiseSuppression' | 'echoCancellation' | 'autoGainControl'
) => {
  audioState[constraint] = !audioState[constraint]
  addEvent('MEDIA', `${constraint}: ${audioState[constraint]}`)
  addEvent('MEDIA', 'Applying updated constraints to media track...')
}

const testSpeakers = () => {
  addEvent('AUDIO', 'Playing test tone on output device...')
  // Would play actual test tone
  setTimeout(() => {
    addEvent('AUDIO', 'Test tone complete')
  }, 2000)
}

const enumerateDevices = () => {
  addEvent('MEDIA', 'Enumerating media devices...')
  addEvent('MEDIA', `Found ${availableDevices.inputs.length} input devices`)
  addEvent('MEDIA', `Found ${availableDevices.outputs.length} output devices`)
}

addEvent('DEMO', 'Audio Devices demo initialized')
enumerateDevices()
</script>

<template>
  <div class="demo-panel">
    <h2><span class="icon">🎧</span> Audio Devices Demo</h2>

    <div class="status-bar">
      <div class="status-item">
        <span :class="['status-dot', audioState.isMuted ? 'error' : 'connected']"></span>
        <span>Mic: {{ audioState.isMuted ? 'Muted' : 'Active' }}</span>
      </div>
      <div class="status-item">
        <span class="status-dot connected"></span>
        <span>Output: Active</span>
      </div>
    </div>

    <div class="demo-section">
      <h3>🎤 Input Device (Microphone)</h3>
      <div class="device-selector">
        <select
          class="select"
          style="width: 100%"
          @change="changeInputDevice(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="device in availableDevices.inputs" :key="device.id" :value="device.id">
            {{ device.label }}
          </option>
        </select>
      </div>

      <div class="volume-control" style="margin-bottom: 1rem">
        <span style="font-size: 1.25rem">🎤</span>
        <input
          type="range"
          min="0"
          max="100"
          :value="audioState.inputVolume"
          class="volume-slider"
          @input="updateInputVolume"
        />
        <span style="min-width: 3rem; text-align: right">{{ audioState.inputVolume }}%</span>
      </div>

      <div
        style="background: var(--bg); border-radius: 0.5rem; padding: 0.5rem; margin-bottom: 1rem"
      >
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem">
          Input Level
        </div>
        <div style="height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden">
          <div
            :style="{
              width: `${Math.min(audioState.inputLevel, 100)}%`,
              height: '100%',
              background:
                audioState.inputLevel > 90
                  ? 'var(--danger)'
                  : audioState.inputLevel > 70
                    ? 'var(--warning)'
                    : 'var(--success)',
              transition: 'width 0.1s',
            }"
          ></div>
        </div>
      </div>

      <button
        :class="['btn', audioState.isMuted ? 'btn-danger' : 'btn-outline']"
        @click="toggleMute"
      >
        {{ audioState.isMuted ? '🔇 Unmute' : '🔊 Mute' }}
      </button>
    </div>

    <div class="demo-section">
      <h3>🔊 Output Device (Speakers)</h3>
      <div class="device-selector">
        <select
          class="select"
          style="width: 100%"
          @change="changeOutputDevice(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="device in availableDevices.outputs" :key="device.id" :value="device.id">
            {{ device.label }}
          </option>
        </select>
      </div>

      <div class="volume-control" style="margin-bottom: 1rem">
        <span style="font-size: 1.25rem">🔊</span>
        <input
          type="range"
          min="0"
          max="100"
          :value="audioState.outputVolume"
          class="volume-slider"
          @input="updateOutputVolume"
        />
        <span style="min-width: 3rem; text-align: right">{{ audioState.outputVolume }}%</span>
      </div>

      <div
        style="background: var(--bg); border-radius: 0.5rem; padding: 0.5rem; margin-bottom: 1rem"
      >
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem">
          Output Level
        </div>
        <div style="height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden">
          <div
            :style="{
              width: `${Math.min(audioState.outputLevel, 100)}%`,
              height: '100%',
              background: 'var(--primary)',
              transition: 'width 0.1s',
            }"
          ></div>
        </div>
      </div>

      <button class="btn btn-outline" @click="testSpeakers">🔔 Test Speakers</button>
    </div>

    <div class="demo-section">
      <h3>⚙️ Audio Processing</h3>
      <div style="display: flex; flex-direction: column; gap: 0.75rem">
        <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer">
          <input
            type="checkbox"
            v-model="audioState.echoCancellation"
            @change="toggleConstraint('echoCancellation')"
          />
          <span>Echo Cancellation (AEC)</span>
          <span style="font-size: 0.75rem; color: var(--text-muted)"
          >Removes echo from speakers</span
          >
        </label>
        <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer">
          <input
            type="checkbox"
            v-model="audioState.noiseSuppression"
            @change="toggleConstraint('noiseSuppression')"
          />
          <span>Noise Suppression</span>
          <span style="font-size: 0.75rem; color: var(--text-muted)">Reduces background noise</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer">
          <input
            type="checkbox"
            v-model="audioState.autoGainControl"
            @change="toggleConstraint('autoGainControl')"
          />
          <span>Auto Gain Control (AGC)</span>
          <span style="font-size: 0.75rem; color: var(--text-muted)">Normalizes volume levels</span>
        </label>
      </div>
    </div>
  </div>

  <div class="demo-panel">
    <h2><span class="icon">📋</span> Event Log & API</h2>

    <div class="demo-section">
      <h3>Event Log</h3>
      <div class="event-log">
        <div v-for="(event, i) in events" :key="i" class="event-log-entry">
          <span class="event-time">{{ event.time }}</span>
          <span class="event-type">[{{ event.type }}]</span>
          <span class="event-data">{{ event.data }}</span>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h3>API Usage</h3>
      <div class="code-preview">
        <code>
          <span class="keyword">import</span> { useAudioDevices } <span class="keyword">from</span>
          <span class="string">'vuesip'</span>

          <span class="keyword">const</span> { audioInputs, audioOutputs, selectedInput,
          selectedOutput, inputVolume, outputVolume, <span class="function">setInputDevice</span>,
          <span class="function">setOutputDevice</span>,
          <span class="function">setInputVolume</span>,
          <span class="function">setOutputVolume</span>, <span class="function">toggleMute</span>,
          isMuted } = <span class="function">useAudioDevices</span>()

          <span class="comment">// Change devices</span>
          <span class="keyword">await</span> <span class="function">setInputDevice</span>(<span
            class="string"
          >'device-id'</span
          >) <span class="keyword">await</span> <span class="function">setOutputDevice</span>(<span
            class="string"
          >'device-id'</span
          >)

          <span class="comment">// Adjust volume</span>
          <span class="function">setInputVolume</span>(<span class="number">0.8</span>)
          <span class="function">setOutputVolume</span>(<span class="number">0.7</span>)

          <span class="comment">// Toggle mute</span>
          <span class="function">toggleMute</span>()
        </code>
      </div>
    </div>

    <div class="demo-section">
      <h3>Current Constraints</h3>
      <div class="code-preview">
        <code>
          { audio: { deviceId: <span class="string">"{{ audioState.inputDevice }}"</span>,
          echoCancellation: <span class="keyword">{{ audioState.echoCancellation }}</span
          >, noiseSuppression: <span class="keyword">{{ audioState.noiseSuppression }}</span
          >, autoGainControl: <span class="keyword">{{ audioState.autoGainControl }}</span>
          } }
        </code>
      </div>
    </div>
  </div>
</template>
