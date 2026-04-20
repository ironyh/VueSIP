<template>
  <div class="attended">
    <div v-if="!isActive" class="attended__gate">
      <span class="attended__gate-label">Transfer</span>
      <span class="attended__gate-value">Awaiting active call</span>
      <span class="attended__gate-hint">
        {{ isSimulationMode ? 'Run the "Active Call" scenario to begin' : 'Connect a call first' }}
      </span>
    </div>

    <section v-else class="attended__stage" aria-live="polite">
      <ol class="attended__rail">
        <li class="attended__rail-step" :class="stepClass(1)">
          <span class="attended__rail-badge">1</span>
          <span class="attended__rail-text">
            <span class="attended__rail-title">Hold primary</span>
            <span class="attended__rail-hint">Park the caller while you consult</span>
          </span>
        </li>
        <li class="attended__rail-step" :class="stepClass(2)">
          <span class="attended__rail-badge">2</span>
          <span class="attended__rail-text">
            <span class="attended__rail-title">Call target</span>
            <span class="attended__rail-hint">Ask if they can take it</span>
          </span>
        </li>
        <li class="attended__rail-step" :class="stepClass(3)">
          <span class="attended__rail-badge">3</span>
          <span class="attended__rail-text">
            <span class="attended__rail-title">Complete transfer</span>
            <span class="attended__rail-hint">Bridge the two, drop out</span>
          </span>
        </li>
      </ol>

      <div class="attended__panels">
        <div class="attended__panel">
          <span class="attended__panel-eyebrow">Primary call</span>
          <span class="attended__panel-name">
            {{ effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown' }}
          </span>
          <span class="attended__panel-state" :class="{ 'attended__panel-state--hold': step >= 1 }">
            {{ step >= 1 ? 'On hold' : 'Active' }}
          </span>
        </div>
        <div
          class="attended__panel"
          :class="{ 'attended__panel--dim': step < 2, 'attended__panel--live': step === 2 }"
        >
          <span class="attended__panel-eyebrow">Consult call</span>
          <span class="attended__panel-name">{{ consultName }}</span>
          <span class="attended__panel-state">
            {{ step >= 3 ? 'Bridged' : step === 2 ? 'Connected' : step === 1 ? 'Dialing' : 'Not dialed' }}
          </span>
        </div>
      </div>

      <div v-if="step === 0" class="attended__form">
        <label class="attended__label" for="attended-target">Consult with</label>
        <input
          id="attended-target"
          v-model="target"
          type="text"
          class="attended__input"
          placeholder="sip:supervisor@example.com"
          @keyup.enter="beginConsult"
        />
        <button
          type="button"
          class="attended__btn attended__btn--primary"
          :disabled="!target.trim()"
          @click="beginConsult"
        >
          Begin consult
        </button>
      </div>

      <div v-else class="attended__actions">
        <button
          v-if="step === 2"
          type="button"
          class="attended__btn attended__btn--primary"
          @click="completeTransfer"
        >
          Complete transfer
        </button>
        <button
          v-if="step === 1"
          type="button"
          class="attended__btn attended__btn--primary"
          @click="connectConsult"
        >
          Connect consult
        </button>
        <button
          v-if="step < 3"
          type="button"
          class="attended__btn"
          @click="cancel"
        >
          Cancel · return to primary
        </button>
      </div>

      <p v-if="error" class="attended__error" role="alert">{{ error }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TransferState } from '../../../src/types/transfer.types'
import { useCallTransferDemoContext } from './sharedContext'

const { callSession, controls, simulation } = useCallTransferDemoContext()
const { isSimulationMode } = simulation

const effectiveState = computed(() =>
  isSimulationMode.value ? simulation.state.value : callSession.state.value
)
const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : callSession.remoteUri.value
)
const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : callSession.remoteDisplayName.value
)
const isActive = computed(
  () =>
    effectiveState.value === 'active' ||
    effectiveState.value === 'held' ||
    step.value > 0 ||
    controls.transferState.value !== TransferState.Idle
)

const target = ref('')
const step = ref(0)
const error = ref('')

const targetDisplay = computed(() => target.value.trim() || 'target')
const consultName = computed(() => {
  if (step.value === 0) return '—'
  return controls.consultationCall.value?.remoteDisplayName ||
    controls.consultationCall.value?.remoteUri ||
    targetDisplay.value
})

const stepClass = (n: number) => ({
  'attended__rail-step--done': step.value > n,
  'attended__rail-step--active': step.value === n,
})

const beginConsult = async () => {
  if (!target.value.trim()) return
  error.value = ''
  if (isSimulationMode.value) {
    step.value = 1
    setTimeout(() => {
      if (step.value === 1) step.value = 2
    }, 500)
    return
  }
  try {
    if (!callSession.session.value) {
      throw new Error('No active call session')
    }
    step.value = 1
    await controls.initiateAttendedTransfer(
      callSession.session.value.id,
      target.value.trim()
    )
    step.value = 2
  } catch (err) {
    step.value = 0
    error.value = err instanceof Error ? err.message : 'Could not start consult call'
  }
}

const completeTransfer = async () => {
  if (isSimulationMode.value) {
    step.value = 3
    setTimeout(() => {
      simulation.hangup()
      reset()
    }, 1200)
    return
  }
  try {
    await controls.completeAttendedTransfer()
    step.value = 3
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Attended transfer failed'
  }
}

const cancel = async () => {
  if (isSimulationMode.value) {
    reset()
    return
  }
  try {
    await controls.cancelTransfer()
  } finally {
    reset()
  }
}

const reset = () => {
  step.value = 0
  target.value = ''
  error.value = ''
}
</script>

<style scoped>
.attended {
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

.attended__gate {
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
.attended__gate-label { color: var(--muted); }
.attended__gate-value { color: var(--ink); font-weight: 700; }
.attended__gate-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
}

.attended__stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.attended__rail {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.4rem;
}
@media (max-width: 640px) {
  .attended__rail { grid-template-columns: 1fr; }
}
.attended__rail-step {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.55rem 0.65rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.attended__rail-step--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.attended__rail-step--done .attended__rail-badge {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}
.attended__rail-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1px solid var(--rule);
  border-radius: 50%;
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  flex-shrink: 0;
}
.attended__rail-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.attended__rail-title {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.85rem;
}
.attended__rail-hint {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.attended__panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
@media (max-width: 540px) {
  .attended__panels { grid-template-columns: 1fr; }
}
.attended__panel {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.6rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.attended__panel--dim { opacity: 0.5; }
.attended__panel--live {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}
.attended__panel-eyebrow {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.attended__panel-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attended__panel-state {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.attended__panel-state--hold { color: var(--accent); }

.attended__form {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.55rem;
  align-items: center;
}
@media (max-width: 540px) {
  .attended__form { grid-template-columns: 1fr; }
}
.attended__label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.attended__input {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.85rem;
}
.attended__input:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.attended__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.attended__btn {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--rule);
  padding: 0.45rem 0.95rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: border-color 0.1s, color 0.1s;
}
.attended__btn:hover { border-color: var(--accent); color: var(--accent); }
.attended__btn:disabled { opacity: 0.45; cursor: not-allowed; }
.attended__btn--primary {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.attended__btn--primary:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}

.attended__error {
  margin: 0;
  padding: 0.5rem 0.7rem;
  background: #7f1d1d;
  color: #fef2f2;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.78rem;
}
</style>
