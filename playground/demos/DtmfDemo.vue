<template>
  <div class="dtmf-demo">
    <div class="info-section">
      <p>
        DTMF (Dual-Tone Multi-Frequency) tones are used to send keypad inputs during an active call.
        This is commonly used for navigating IVR menus, entering PIN codes, or interacting with
        automated systems.
      </p>
      <p class="note">
        <strong>Note:</strong> You must be in an active call to send DTMF tones. Connect to your SIP
        server and establish a call first.
      </p>
    </div>

    <!-- Simulation Controls -->
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

    <!-- Connection Status -->
    <Message v-if="!effectiveIsConnected" severity="info" :closable="false">
      {{
        isSimulationMode
          ? 'Enable simulation and run a scenario to test DTMF'
          : 'Connect to a SIP server to use DTMF features (use the Basic Call demo to connect)'
      }}
    </Message>

    <Message v-else-if="effectiveCallState !== 'active'" severity="warn" :closable="false">
      {{
        isSimulationMode
          ? 'Run the "Active Call" scenario to test DTMF tones'
          : 'Make or answer a call to send DTMF tones'
      }}
    </Message>

    <!-- DTMF Keypad -->
    <div v-else class="dtmf-active">
      <div class="call-info">
        <div class="info-badge">
          In Call: {{ effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown' }}
        </div>
      </div>

      <div class="dtmf-keypad">
        <button v-for="key in dialpadKeys" :key="key" class="dtmf-key" @click="sendTone(key)">
          {{ key }}
        </button>
      </div>

      <div v-if="lastTone" class="tone-feedback">
        Last tone sent: <strong>{{ lastTone }}</strong>
      </div>

      <div class="dtmf-sequence">
        <h4>Send Tone Sequence</h4>
        <div class="sequence-input">
          <InputText
            v-model="toneSequence"
            placeholder="Enter digits (e.g., 1234#)"
            @keyup.enter="sendSequence"
            class="flex-1"
          />
          <Button
            :disabled="!toneSequence.trim() || sending"
            @click="sendSequence"
            :label="sending ? 'Sending...' : 'Send Sequence'"
            severity="primary"
          />
        </div>
        <small>Enter a sequence of digits (0-9, *, #) to send with a delay between each tone</small>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useDTMF } from 'vuesip'

const { sendTone, canSendDTMF } = useDTMF(sessionRef)

// Send a single digit
await sendTone('1')

// Send a sequence with delay
const sequence = '1234#'
for (const digit of sequence) {
  if (canSendDTMF.value) {
    await sendTone(digit)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * DTMF Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - DTMF keypad buttons remain as custom styled buttons for the keypad UI pattern
 * - Using PrimeVue Button for the "Send Sequence" action button with appropriate severity
 * - Using PrimeVue InputText for the sequence input with proper v-model binding
 * - Using PrimeVue Message for status messages with appropriate severity (info/warning)
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 * - Keypad buttons use custom styling to maintain the dialpad appearance
 */
import { ref, computed } from 'vue'
import { useSipClient, useCallSession, useDTMF } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Get SIP client
const { isConnected, getClient } = useSipClient()

// Get call session
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  remoteUri: realRemoteUri,
  session,
  duration: realDuration,
  remoteDisplayName: realRemoteDisplayName,
} = useCallSession(sipClientRef)

// DTMF
const { sendTone: sendDtmfTone, canSendDTMF } = useDTMF(session)

// Effective values - use simulation or real data based on mode
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

const effectiveIsMuted = computed(() => (isSimulationMode.value ? simulation.isMuted.value : false))

const effectiveCanSendDTMF = computed(() =>
  isSimulationMode.value ? simulation.state.value === 'active' : canSendDTMF.value
)

// State
const lastTone = ref('')
const toneSequence = ref('')
const sending = ref(false)

// Dialpad keys
const dialpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Methods
const sendTone = async (tone: string) => {
  if (!effectiveCanSendDTMF.value) return

  try {
    // In simulation mode, just show feedback
    if (isSimulationMode.value) {
      lastTone.value = tone
      console.log(`[Simulation] DTMF tone sent: ${tone}`)
    } else {
      await sendDtmfTone(tone)
      lastTone.value = tone
    }

    // Clear feedback after 2 seconds
    setTimeout(() => {
      if (lastTone.value === tone) {
        lastTone.value = ''
      }
    }, 2000)
  } catch (error) {
    console.error('DTMF error:', error)
    alert(`Failed to send tone: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const sendSequence = async () => {
  if (!toneSequence.value.trim() || !effectiveCanSendDTMF.value || sending.value) return

  sending.value = true
  try {
    const sequence = toneSequence.value.replace(/[^0-9*#]/g, '') // Only allow valid DTMF chars

    for (const digit of sequence) {
      if (isSimulationMode.value) {
        lastTone.value = digit
        console.log(`[Simulation] DTMF tone sent: ${digit}`)
      } else {
        await sendDtmfTone(digit)
        lastTone.value = digit
      }

      // Wait 150ms between tones
      await new Promise((resolve) => setTimeout(resolve, 150))
    }

    toneSequence.value = ''
  } catch (error) {
    console.error('DTMF sequence error:', error)
    alert(`Failed to send sequence: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.dtmf-demo {
  max-width: 600px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: var(--surface-50);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: 1rem;
  background: var(--info-light);
  border-left: 3px solid var(--info);
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Design Decision: PrimeVue Message component handles status message styling.
   Removed custom .status-message classes as they're no longer needed. */

.dtmf-active {
  padding: 1.5rem;
}

.call-info {
  text-align: center;
  margin-bottom: 1.5rem;
}

.info-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--success-light);
  color: var(--success);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.dtmf-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  max-width: 300px;
  margin: 0 auto 1.5rem;
}

.dtmf-key {
  aspect-ratio: 1;
  border: 2px solid var(--border-color);
  background: var(--surface-0);
  border-radius: 12px;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-color);
}

.dtmf-key:hover {
  background: var(--surface-100);
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dtmf-key:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: var(--primary);
  color: var(--surface-0);
}

.tone-feedback {
  text-align: center;
  padding: 1rem;
  background: var(--info-light);
  border-radius: 6px;
  margin-bottom: 1.5rem;
  color: var(--info);
}

.tone-feedback strong {
  font-size: 1.25rem;
  color: var(--primary);
}

.dtmf-sequence {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--surface-50);
  border-radius: 8px;
}

.dtmf-sequence h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.sequence-input {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

/* Design Decision: PrimeVue InputText component handles input styling.
   Removed custom input styles as they're no longer needed. */

.sequence-input small {
  display: block;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

/* Design Decision: PrimeVue Button component handles all button styling.
   Removed custom .btn classes as they're no longer needed. */

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--surface-50);
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.code-example pre {
  background: var(--surface-900);
  color: var(--text-color);
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
