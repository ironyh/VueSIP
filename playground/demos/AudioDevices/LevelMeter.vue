<template>
  <div class="meter">
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

    <section class="meter__stage" aria-live="polite">
      <div class="meter__row">
        <div class="meter__label">
          <span class="meter__label-eyebrow">Microphone level</span>
          <span class="meter__label-name">
            {{ isMonitoring ? 'Listening…' : 'Idle — press Test to measure' }}
          </span>
        </div>
        <button
          type="button"
          class="meter__btn"
          :class="{ 'meter__btn--on': isMonitoring }"
          @click="toggleMic"
        >
          {{ isMonitoring ? 'Stop' : 'Test mic' }}
        </button>
      </div>

      <div class="meter__bar" aria-hidden="true">
        <div
          v-for="n in 24"
          :key="n"
          class="meter__seg"
          :class="{
            'meter__seg--on': level >= n * (100 / 24),
            'meter__seg--hot': n > 20 && level >= n * (100 / 24),
          }"
        />
      </div>
      <div class="meter__scale" aria-hidden="true">
        <span>-∞</span><span>−30</span><span>−12</span><span>0 dB</span>
      </div>

      <p class="meter__readout">
        <span class="meter__readout-label">Peak</span>
        <span class="meter__readout-value">{{ level.toFixed(0) }}%</span>
        <span class="meter__readout-hint">{{ tip }}</span>
      </p>

      <hr class="meter__divider" />

      <div class="meter__row">
        <div class="meter__label">
          <span class="meter__label-eyebrow">Speaker</span>
          <span class="meter__label-name">A4 test tone · 440 Hz</span>
        </div>
        <button type="button" class="meter__btn" @click="playTone">
          {{ playingTone ? 'Playing…' : 'Play tone' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSimulation } from '../../composables/useSimulation'
import SimulationControls from '../../components/SimulationControls.vue'

const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

const level = ref(0)
const isMonitoring = ref(false)
const playingTone = ref(false)

let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let stream: MediaStream | null = null
let raf: number | null = null
let simTimer: number | null = null

const tip = computed(() => {
  if (!isMonitoring.value) return '—'
  if (level.value < 5) return 'Silent — check mute or cable'
  if (level.value > 85) return 'Clipping — back off the input'
  if (level.value > 65) return 'Loud and clear'
  return 'Good'
})

const startSim = () => {
  isMonitoring.value = true
  simTimer = window.setInterval(() => {
    const base = 25 + Math.random() * 35
    const spike = Math.random() > 0.85 ? Math.random() * 30 : 0
    level.value = Math.min(100, base + spike)
  }, 80)
}
const stopSim = () => {
  if (simTimer) { clearInterval(simTimer); simTimer = null }
  isMonitoring.value = false
  level.value = 0
}

const startReal = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioCtx = new AudioContext()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    const src = audioCtx.createMediaStreamSource(stream)
    src.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    isMonitoring.value = true
    const loop = () => {
      if (!analyser || !isMonitoring.value) return
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      level.value = Math.round((avg / 255) * 100)
      raf = requestAnimationFrame(loop)
    }
    loop()
  } catch {
    isMonitoring.value = false
    level.value = 0
  }
}
const stopReal = () => {
  isMonitoring.value = false
  if (raf) cancelAnimationFrame(raf)
  raf = null
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null }
  if (audioCtx) { audioCtx.close(); audioCtx = null }
  analyser = null
  level.value = 0
}

const toggleMic = () => {
  if (isMonitoring.value) {
    isSimulationMode.value ? stopSim() : stopReal()
  } else {
    isSimulationMode.value ? startSim() : startReal()
  }
}

const playTone = async () => {
  if (playingTone.value) return
  playingTone.value = true
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 440
    gain.gain.value = 0.15
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start()
    setTimeout(() => {
      osc.stop()
      ctx.close()
      playingTone.value = false
    }, 800)
  } catch {
    playingTone.value = false
  }
}

onBeforeUnmount(() => {
  stopSim()
  stopReal()
})
</script>

<style scoped>
.meter {
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

.meter__stage {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.meter__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.meter__label {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.meter__label-eyebrow {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.meter__label-name {
  font-family: var(--sans);
  font-size: 0.9rem;
  color: var(--ink);
}

.meter__btn {
  margin-left: auto;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  padding: 0.45rem 0.9rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.1s;
}
.meter__btn:hover { background: var(--accent); border-color: var(--accent); }
.meter__btn--on {
  background: var(--accent);
  border-color: var(--accent);
}

.meter__bar {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
  height: 1.8rem;
  padding: 0.2rem;
  background: var(--ink);
  border-radius: 2px;
}
.meter__seg {
  background: color-mix(in srgb, var(--paper) 10%, transparent);
  border-radius: 1px;
  transition: background 0.05s;
}
.meter__seg--on { background: var(--accent); }
.meter__seg--hot { background: #dc2626; }

.meter__scale {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-transform: uppercase;
}

.meter__readout {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.45rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.78rem;
}
.meter__readout-label {
  color: var(--muted);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.meter__readout-value {
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.meter__readout-hint {
  margin-left: auto;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.meter__divider {
  margin: 0.4rem 0;
  border: 0;
  border-top: 1px dashed var(--rule);
}
</style>
