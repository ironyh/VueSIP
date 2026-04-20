<template>
  <div class="picker">
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

    <div v-if="!granted" class="picker__gate">
      <span class="picker__gate-label">Permissions</span>
      <span class="picker__gate-value">Awaiting microphone access</span>
      <button type="button" class="picker__gate-btn" @click="grant">
        {{ isSimulationMode ? 'Grant (simulated)' : 'Allow microphone' }}
      </button>
    </div>

    <section v-else class="picker__stage" aria-live="polite">
      <div class="picker__head">
        <span class="picker__head-label">Devices</span>
        <span class="picker__head-count"> {{ inputs.length }} in · {{ outputs.length }} out </span>
        <button type="button" class="picker__head-refresh" @click="refresh">Refresh</button>
      </div>

      <div class="picker__group">
        <span class="picker__group-label">Microphone</span>
        <div v-if="inputs.length === 0" class="picker__empty">No microphones detected</div>
        <ul v-else class="picker__list" role="radiogroup" aria-label="Microphone">
          <li v-for="d in inputs" :key="d.deviceId">
            <button
              type="button"
              role="radio"
              :aria-checked="d.deviceId === selectedInput"
              class="picker__item"
              :class="{ 'picker__item--active': d.deviceId === selectedInput }"
              @click="pickInput(d.deviceId)"
            >
              <span class="picker__item-dot" aria-hidden="true"></span>
              <span class="picker__item-name">{{
                d.label || `Microphone ${d.deviceId.slice(0, 6)}`
              }}</span>
              <span class="picker__item-id">{{ d.deviceId.slice(0, 10) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="picker__group">
        <span class="picker__group-label">Speaker</span>
        <div v-if="outputs.length === 0" class="picker__empty">No speakers detected</div>
        <ul v-else class="picker__list" role="radiogroup" aria-label="Speaker">
          <li v-for="d in outputs" :key="d.deviceId">
            <button
              type="button"
              role="radio"
              :aria-checked="d.deviceId === selectedOutput"
              class="picker__item"
              :class="{ 'picker__item--active': d.deviceId === selectedOutput }"
              @click="pickOutput(d.deviceId)"
            >
              <span class="picker__item-dot" aria-hidden="true"></span>
              <span class="picker__item-name">{{
                d.label || `Speaker ${d.deviceId.slice(0, 6)}`
              }}</span>
              <span class="picker__item-id">{{ d.deviceId.slice(0, 10) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div v-if="toast" class="picker__toast" role="status">{{ toast }}</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMediaDevices } from '../../../src'
import { useSimulation } from '../../composables/useSimulation'
import SimulationControls from '../../components/SimulationControls.vue'

const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

const {
  audioInputDevices,
  audioOutputDevices,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectAudioInput,
  selectAudioOutput,
  enumerateDevices,
} = useMediaDevices()

const mockIn = ref([
  { deviceId: 'mock-mic-1', label: 'Built-in Microphone' },
  { deviceId: 'mock-mic-2', label: 'USB Headset Microphone' },
  { deviceId: 'mock-mic-3', label: 'Bluetooth Earbuds' },
])
const mockOut = ref([
  { deviceId: 'mock-spk-1', label: 'Built-in Speakers' },
  { deviceId: 'mock-spk-2', label: 'USB Headset' },
  { deviceId: 'mock-spk-3', label: 'HDMI Audio Output' },
])
const mockSelIn = ref('mock-mic-1')
const mockSelOut = ref('mock-spk-1')

const granted = ref(false)
const toast = ref('')

const inputs = computed(() => (isSimulationMode.value ? mockIn.value : audioInputDevices.value))
const outputs = computed(() => (isSimulationMode.value ? mockOut.value : audioOutputDevices.value))
const selectedInput = computed(() =>
  isSimulationMode.value ? mockSelIn.value : selectedAudioInputId.value
)
const selectedOutput = computed(() =>
  isSimulationMode.value ? mockSelOut.value : selectedAudioOutputId.value
)

const flash = (msg: string) => {
  toast.value = msg
  setTimeout(() => {
    if (toast.value === msg) toast.value = ''
  }, 2200)
}

const grant = async () => {
  if (isSimulationMode.value) {
    granted.value = true
    flash('Simulated permissions granted')
    return
  }
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
    granted.value = true
    await enumerateDevices()
  } catch {
    flash('Microphone access denied — check browser settings')
  }
}

const pickInput = (id: string) => {
  if (isSimulationMode.value) {
    mockSelIn.value = id
    flash('Microphone switched')
    return
  }
  selectAudioInput(id)
  flash('Microphone switched')
}
const pickOutput = (id: string) => {
  if (isSimulationMode.value) {
    mockSelOut.value = id
    flash('Speaker switched')
    return
  }
  selectAudioOutput(id)
  flash('Speaker switched')
}

const refresh = async () => {
  if (isSimulationMode.value) {
    flash('Device list refreshed')
    return
  }
  try {
    await enumerateDevices()
    flash('Device list refreshed')
  } catch {
    flash('Refresh failed')
  }
}

onMounted(async () => {
  if (isSimulationMode.value) {
    granted.value = true
    return
  }
  try {
    await enumerateDevices()
    granted.value = audioInputDevices.value.length > 0
  } catch {
    /* waiting for grant */
  }
})
</script>

<style scoped>
.picker {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.picker__gate {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--accent);
  border-radius: 2px;
  background: var(--paper-deep);
  font-family: var(--mono);
  font-size: 0.75rem;
}
.picker__gate-label {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.65rem;
  font-weight: 700;
}
.picker__gate-value {
  color: var(--ink);
  font-weight: 600;
}
.picker__gate-btn {
  margin-left: auto;
  padding: 0.4rem 0.75rem;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.1s;
}
.picker__gate-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.picker__stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}
.picker__head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}
.picker__head-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.picker__head-count {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--ink);
}
.picker__head-refresh {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink);
  padding: 0.3rem 0.7rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.picker__head-refresh:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.picker__group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.picker__group-label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.picker__empty {
  padding: 0.65rem 0.8rem;
  border: 1px dashed var(--rule);
  border-radius: 2px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 0.78rem;
}

.picker__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.picker__item {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--sans);
  text-align: left;
  transition:
    border-color 0.12s,
    box-shadow 0.08s,
    transform 0.08s;
  box-shadow: 2px 2px 0 var(--ink);
}
.picker__item:hover {
  border-color: var(--accent);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}
.picker__item--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}
.picker__item-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--paper-deep);
  border: 1px solid var(--muted);
}
.picker__item--active .picker__item-dot {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}
.picker__item-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.picker__item-id {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.picker__toast {
  padding: 0.45rem 0.7rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
}
</style>
