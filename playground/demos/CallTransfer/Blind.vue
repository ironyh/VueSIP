<template>
  <div class="blind">
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveState"
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

    <div v-if="!isActive" class="blind__gate">
      <span class="blind__gate-label">Transfer</span>
      <span class="blind__gate-value">Awaiting active call</span>
      <span class="blind__gate-hint">
        {{ isSimulationMode ? 'Run the "Active Call" scenario to unlock' : 'Connect a call first' }}
      </span>
    </div>

    <section v-else class="blind__stage" aria-live="polite">
      <div class="blind__head">
        <span class="blind__pulse" aria-hidden="true" />
        <span class="blind__head-label">On call with</span>
        <span class="blind__head-name">
          {{ effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown' }}
        </span>
      </div>

      <div class="blind__form">
        <label class="blind__label" for="blind-target">Transfer to</label>
        <input
          id="blind-target"
          v-model="target"
          type="text"
          class="blind__input"
          placeholder="sip:support@example.com · or an extension"
          :disabled="phase !== 'idle'"
          @keyup.enter="run"
        />
        <button
          type="button"
          class="blind__btn"
          :disabled="!target.trim() || phase !== 'idle'"
          @click="run"
        >
          {{ phase === 'sending' ? 'Sending REFER…' : phase === 'done' ? 'Transferred' : 'Transfer' }}
        </button>
      </div>

      <div v-if="phase !== 'idle'" class="blind__trail">
        <div class="blind__step" :class="{ 'blind__step--done': phase !== 'sending' }">
          <span class="blind__step-badge">1</span>
          <span class="blind__step-label">REFER sent</span>
        </div>
        <div class="blind__step" :class="{ 'blind__step--done': phase === 'done' }">
          <span class="blind__step-badge">2</span>
          <span class="blind__step-label">Notify · success</span>
        </div>
        <div class="blind__step" :class="{ 'blind__step--done': phase === 'done' }">
          <span class="blind__step-badge">3</span>
          <span class="blind__step-label">Call hung up locally</span>
        </div>
      </div>

      <p v-if="error" class="blind__error" role="alert">{{ error }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SimulationControls from '../../components/SimulationControls.vue'
import { useCallTransferDemoContext } from './sharedContext'

const { callSession, controls, simulation } = useCallTransferDemoContext()
const { isSimulationMode, activeScenario } = simulation

const effectiveState = computed(() =>
  isSimulationMode.value ? simulation.state.value : callSession.state.value
)
const effectiveDuration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : callSession.duration.value || 0
)
const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : callSession.remoteUri.value
)
const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : callSession.remoteDisplayName.value
)
const effectiveIsOnHold = computed(() =>
  isSimulationMode.value ? simulation.isOnHold.value : callSession.isOnHold.value
)
const effectiveIsMuted = computed(() =>
  isSimulationMode.value ? simulation.isMuted.value : callSession.isMuted.value
)
const isActive = computed(() => effectiveState.value === 'active')

const target = ref('')
const phase = ref<'idle' | 'sending' | 'done'>('idle')
const error = ref('')

const run = async () => {
  const t = target.value.trim()
  if (!t || phase.value !== 'idle') return
  error.value = ''
  phase.value = 'sending'

  if (isSimulationMode.value) {
    await new Promise((r) => setTimeout(r, 600))
    phase.value = 'done'
    setTimeout(() => {
      phase.value = 'idle'
      target.value = ''
      simulation.hangup()
    }, 1200)
    return
  }

  try {
    if (!callSession.session.value) {
      throw new Error('No active call session')
    }

    await controls.blindTransfer(callSession.session.value.id, t)
    phase.value = 'done'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Transfer failed'
    phase.value = 'idle'
  }
}
</script>

<style scoped>
.blind {
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

.blind__gate {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--muted);
  border-radius: 2px;
  background: var(--paper-deep);
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.blind__gate-label { color: var(--muted); }
.blind__gate-value { color: var(--ink); font-weight: 700; }
.blind__gate-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
}

.blind__stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.blind__head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.blind__pulse {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--accent);
  animation: blind-pulse 1.1s ease-in-out infinite;
}
@keyframes blind-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
}
.blind__head-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.blind__head-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}

.blind__form {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.55rem;
  align-items: center;
}
@media (max-width: 540px) {
  .blind__form { grid-template-columns: 1fr; }
}
.blind__label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.blind__input {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.85rem;
}
.blind__input:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}
.blind__input:disabled { opacity: 0.6; }

.blind__btn {
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  padding: 0.45rem 1rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.1s;
}
.blind__btn:hover:not(:disabled) { background: var(--accent); border-color: var(--accent); }
.blind__btn:disabled { opacity: 0.45; cursor: not-allowed; }

.blind__trail {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.55rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.blind__step {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--muted);
}
.blind__step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  border: 1px solid var(--rule);
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
}
.blind__step--done { color: var(--ink); }
.blind__step--done .blind__step-badge {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}

.blind__error {
  margin: 0;
  padding: 0.5rem 0.7rem;
  background: #7f1d1d;
  color: #fef2f2;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.78rem;
}
</style>
