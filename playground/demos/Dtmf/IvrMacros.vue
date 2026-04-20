<template>
  <div class="macros">
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
      :duration="effectiveDuration"
      :remote-uri="effectiveRemoteUri"
      :remote-display-name="effectiveRemoteDisplayName"
      :is-on-hold="effectiveIsOnHold"
      :is-muted="effectiveIsMuted"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <div v-if="!canSend" class="macros__status">
      <span class="macros__status-label">Macros</span>
      <span class="macros__status-value">Awaiting active call</span>
      <span class="macros__status-hint">
        {{ isSimulationMode ? 'Run the "Active Call" scenario to enable buttons' : 'Dial into your PBX, then return' }}
      </span>
    </div>

    <div v-else class="macros__stage">
      <div class="macros__head">
        <span class="macros__pulse" aria-hidden="true" />
        <span class="macros__head-label">Ready</span>
        <span class="macros__head-name">{{ effectiveRemoteDisplayName || effectiveRemoteUri || 'IVR' }}</span>
      </div>

      <ul class="macros__list">
        <li v-for="m in macros" :key="m.id">
          <button
            type="button"
            class="macros__item"
            :disabled="playingId !== null"
            @click="play(m)"
          >
            <span class="macros__item-icon" aria-hidden="true">{{ m.icon }}</span>
            <span class="macros__item-body">
              <span class="macros__item-title">{{ m.label }}</span>
              <span class="macros__item-sequence">{{ m.digits }}</span>
            </span>
            <span class="macros__item-cta" aria-hidden="true">
              {{ playingId === m.id ? '▸' : '→' }}
            </span>
          </button>
        </li>
      </ul>

      <div class="macros__log" aria-live="polite" aria-atomic="false">
        <span class="macros__log-label">Last</span>
        <span class="macros__log-value">{{ lastDigit || '—' }}</span>
        <span class="macros__log-hint" v-if="playingId">
          Sending {{ macros.find((m) => m.id === playingId)?.label }}…
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDTMF } from '../../../src'
import { useSimulation } from '../../composables/useSimulation'
import SimulationControls from '../../components/SimulationControls.vue'
import { useDtmfSession } from './sharedSession'

const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

const {
  state: realCallState,
  remoteUri: realRemoteUri,
  remoteDisplayName: realRemoteDisplayName,
  duration: realDuration,
  session,
} = useDtmfSession()

const { sendTone, canSendDTMF } = useDTMF(session)

const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : realCallState.value
)
const effectiveDuration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : realDuration.value || 0
)
const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : realRemoteUri.value
)
const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : realRemoteDisplayName.value
)
const effectiveIsOnHold = computed(() =>
  isSimulationMode.value ? simulation.isOnHold.value : false
)
const effectiveIsMuted = computed(() =>
  isSimulationMode.value ? simulation.isMuted.value : false
)
const canSend = computed(() =>
  isSimulationMode.value ? simulation.state.value === 'active' : canSendDTMF.value
)

interface Macro {
  id: string
  label: string
  icon: string
  digits: string
  gapMs?: number
}

const macros: Macro[] = [
  { id: 'voicemail', label: 'Voicemail PIN',    icon: '📬', digits: '1234#' },
  { id: 'conf',      label: 'Join conference',  icon: '👥', digits: '*67*4210#' },
  { id: 'park',      label: 'Park call',        icon: '🅿️', digits: '*68' },
  { id: 'pickup',    label: 'Pickup from park', icon: '📞', digits: '*69' },
  { id: 'xfer',      label: 'Blind transfer',   icon: '↪️', digits: '##101', gapMs: 200 },
]

const lastDigit = ref('')
const playingId = ref<string | null>(null)

const play = async (m: Macro) => {
  if (!canSend.value || playingId.value) return
  playingId.value = m.id
  const gap = m.gapMs ?? 150
  try {
    for (const d of m.digits) {
      if (isSimulationMode.value) {
        lastDigit.value = d
      } else {
        await sendTone(d)
        lastDigit.value = d
      }
      await new Promise((r) => setTimeout(r, gap))
    }
  } catch (err) {
    console.error('macro error', err)
  } finally {
    playingId.value = null
  }
}
</script>

<style scoped>
.macros {
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

.macros__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--muted);
  border-radius: 2px;
  background: var(--paper-deep);
  font-family: var(--mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.macros__status-label { color: var(--muted); }
.macros__status-value { color: var(--ink); font-weight: 700; }
.macros__status-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
}

.macros__stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.macros__head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.macros__pulse {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--accent);
  animation: macros-pulse 1.1s ease-in-out infinite;
}
@keyframes macros-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
}
.macros__head-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.macros__head-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}

.macros__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.macros__item {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--sans);
  text-align: left;
  transition: border-color 0.12s, transform 0.08s, box-shadow 0.08s;
  box-shadow: 2px 2px 0 var(--ink);
}
.macros__item:hover:not(:disabled) {
  border-color: var(--accent);
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}
.macros__item:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}
.macros__item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.macros__item-icon { font-size: 1.2rem; }
.macros__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.macros__item-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.macros__item-sequence {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
  letter-spacing: 0.1em;
}
.macros__item-cta {
  font-family: var(--mono);
  font-size: 1rem;
  color: var(--accent);
}

.macros__log {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.45rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.macros__log-label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.macros__log-value {
  font-family: var(--mono);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--accent);
}
.macros__log-hint {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
