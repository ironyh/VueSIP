<template>
  <div class="dtmf">
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

    <div v-if="!effectiveIsConnected" class="dtmf__status">
      <span class="dtmf__status-led" aria-hidden="true" />
      <span class="dtmf__status-label">Line</span>
      <span class="dtmf__status-value">Offline</span>
      <span class="dtmf__status-hint">
        {{ isSimulationMode ? 'Run a simulation scenario to test' : 'Connect via the header, or enable Simulation Mode' }}
      </span>
    </div>

    <div
      v-else-if="effectiveCallState !== 'active'"
      class="dtmf__status dtmf__status--warn"
    >
      <span class="dtmf__status-led" aria-hidden="true" />
      <span class="dtmf__status-label">Call</span>
      <span class="dtmf__status-value">Not in a call</span>
      <span class="dtmf__status-hint">
        {{ isSimulationMode ? 'Run the "Active Call" scenario first' : 'Dial or answer a call, then tones can flow' }}
      </span>
    </div>

    <div v-else class="dtmf__stage" aria-live="polite" aria-atomic="true">
      <div class="dtmf__call-head">
        <span class="dtmf__call-badge">In call</span>
        <span class="dtmf__call-name">{{ effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown' }}</span>
      </div>

      <div class="dtmf__keypad" role="group" aria-label="DTMF keypad">
        <button
          v-for="k in dialpadKeys"
          :key="k"
          type="button"
          class="dtmf__key"
          :class="{ 'is-active': lastTone === k }"
          :aria-label="`Send tone ${k}`"
          @click="sendTone(k)"
        >
          <span class="dtmf__key-digit">{{ k }}</span>
          <span class="dtmf__key-letters" aria-hidden="true">{{ lettersFor(k) }}</span>
        </button>
      </div>

      <div class="dtmf__feedback" aria-live="polite">
        <span class="dtmf__feedback-label">Last tone</span>
        <span class="dtmf__feedback-value">{{ lastTone || '—' }}</span>
      </div>

      <div class="dtmf__sequence">
        <label class="dtmf__sequence-label" for="dtmf-sequence-input">Tone sequence</label>
        <div class="dtmf__sequence-row">
          <div class="dtmf__sequence-display">
            <span class="dtmf__caret" aria-hidden="true">›</span>
            <input
              id="dtmf-sequence-input"
              v-model="toneSequence"
              class="dtmf__sequence-input"
              placeholder="e.g. 1234#"
              :disabled="sending"
              autocomplete="off"
              spellcheck="false"
              @keyup.enter="sendSequence"
            />
          </div>
          <button
            type="button"
            class="dtmf__cta"
            :disabled="!toneSequence.trim() || sending"
            @click="sendSequence"
          >
            <span>{{ sending ? 'Sending…' : 'Send sequence' }}</span>
            <span class="dtmf__cta-hint">Enter ↵</span>
          </button>
        </div>
        <p class="dtmf__sequence-hint">Digits 0-9, plus <code>*</code> and <code>#</code>. 150&nbsp;ms between tones.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDTMF } from '../../../src'
import { useSimulation } from '../../composables/useSimulation'
import SimulationControls from '../../components/SimulationControls.vue'
import { playgroundSipClient } from '../../sipClient'
import { useDtmfSession } from './sharedSession'

const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

const {
  state: realCallState,
  remoteUri: realRemoteUri,
  session,
  duration: realDuration,
  remoteDisplayName: realRemoteDisplayName,
} = useDtmfSession()
const { isConnected } = playgroundSipClient

const { sendTone: sendDtmfTone, canSendDTMF } = useDTMF(session)

const effectiveIsConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : isConnected.value
)
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
const effectiveCanSendDTMF = computed(() =>
  isSimulationMode.value ? simulation.state.value === 'active' : canSendDTMF.value
)

const lastTone = ref('')
const toneSequence = ref('')
const sending = ref(false)

const dialpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

const lettersFor = (k: string): string => {
  switch (k) {
    case '2': return 'ABC'
    case '3': return 'DEF'
    case '4': return 'GHI'
    case '5': return 'JKL'
    case '6': return 'MNO'
    case '7': return 'PQRS'
    case '8': return 'TUV'
    case '9': return 'WXYZ'
    default: return ''
  }
}

const sendTone = async (tone: string) => {
  if (!effectiveCanSendDTMF.value) return
  try {
    if (isSimulationMode.value) {
      lastTone.value = tone
      console.log(`[Simulation] DTMF tone sent: ${tone}`)
    } else {
      await sendDtmfTone(tone)
      lastTone.value = tone
    }
    setTimeout(() => {
      if (lastTone.value === tone) lastTone.value = ''
    }, 2000)
  } catch (error) {
    console.error('DTMF error:', error)
  }
}

const sendSequence = async () => {
  if (!toneSequence.value.trim() || !effectiveCanSendDTMF.value || sending.value) return
  sending.value = true
  try {
    const sequence = toneSequence.value.replace(/[^0-9*#]/g, '')
    for (const digit of sequence) {
      if (isSimulationMode.value) {
        lastTone.value = digit
      } else {
        await sendDtmfTone(digit)
        lastTone.value = digit
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    toneSequence.value = ''
  } catch (error) {
    console.error('DTMF sequence error:', error)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.dtmf {
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

.dtmf__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--muted);
  border-radius: 2px;
  background: var(--paper-deep);
  font-family: var(--mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.dtmf__status--warn { border-left-color: var(--accent); }
.dtmf__status-led {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--muted);
}
.dtmf__status--warn .dtmf__status-led { background: var(--accent); }
.dtmf__status-label { color: var(--muted); }
.dtmf__status-value { color: var(--ink); font-weight: 700; }
.dtmf__status-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 0.72rem;
}

.dtmf__stage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.dtmf__call-head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
}
.dtmf__call-badge {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.dtmf__call-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}

.dtmf__keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  max-width: 22rem;
  margin: 0 auto;
}

.dtmf__key {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  aspect-ratio: 1.4;
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  border-radius: 2px;
  transition: transform 0.08s, box-shadow 0.08s, background 0.08s, color 0.08s;
  box-shadow: 2px 2px 0 var(--ink);
}
.dtmf__key:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
  border-color: var(--accent);
  color: var(--accent);
}
.dtmf__key:active,
.dtmf__key.is-active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.dtmf__key-digit {
  font-family: var(--mono);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
}
.dtmf__key-letters {
  font-family: var(--mono);
  font-size: 0.55rem;
  letter-spacing: 0.18em;
  color: var(--muted);
}
.dtmf__key.is-active .dtmf__key-letters,
.dtmf__key:hover .dtmf__key-letters { color: inherit; opacity: 0.75; }

.dtmf__feedback {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.5rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.dtmf__feedback-label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.dtmf__feedback-value {
  font-family: var(--mono);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--accent);
  margin-left: auto;
}

.dtmf__sequence {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--rule);
}
.dtmf__sequence-label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.dtmf__sequence-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
}
.dtmf__sequence-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--ink);
  border-radius: 2px;
  min-height: 2.5rem;
}
.dtmf__caret {
  color: var(--accent);
  font-family: var(--mono);
  font-size: 1.1rem;
  font-weight: 700;
  animation: dtmf-caret 1s steps(2) infinite;
}
@keyframes dtmf-caret { 50% { opacity: 0; } }

.dtmf__sequence-input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--paper);
  font-family: var(--mono);
  font-size: 1rem;
  letter-spacing: 0.08em;
}
.dtmf__sequence-input::placeholder {
  color: color-mix(in srgb, var(--paper) 40%, transparent);
}

.dtmf__cta {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  min-width: 7.5rem;
  padding: 0.55rem 1rem;
  background: var(--accent);
  color: var(--paper);
  border: 1px solid var(--accent);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  box-shadow: 2px 2px 0 var(--ink);
  transition: transform 0.08s, box-shadow 0.08s;
}
.dtmf__cta:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}
.dtmf__cta:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}
.dtmf__cta:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: 2px 2px 0 var(--rule);
}
.dtmf__cta-hint {
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  opacity: 0.75;
  font-weight: 500;
  margin-top: 0.15rem;
}

.dtmf__sequence-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--muted);
}
.dtmf__sequence-hint code {
  font-family: var(--mono);
  font-size: 0.85em;
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  color: var(--accent);
}
</style>
