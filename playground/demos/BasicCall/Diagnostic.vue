<template>
  <div class="basic-diag">
    <SimulationControls
      :is-simulation-mode="sim.isSimulationMode.value"
      :active-scenario="sim.activeScenario.value"
      :state="effState"
      :duration="effDuration"
      :remote-uri="effRemoteUri"
      :remote-display-name="effRemoteDisplayName"
      :is-on-hold="effIsOnHold"
      :is-muted="effIsMuted"
      :scenarios="sim.scenarios"
      @toggle="sim.toggleSimulation"
      @run-scenario="sim.runScenario"
      @reset="sim.resetCall"
      @answer="sim.answer"
      @hangup="sim.hangup"
      @toggle-hold="sim.toggleHold"
      @toggle-mute="sim.toggleMute"
    />

    <Message v-if="!effIsConnected" severity="info" :closable="false">
      No live SIP connection. Toggle <strong>Simulation Mode</strong> above to drive the full call
      state machine without a real server.
    </Message>

    <section v-else class="basic-diag__live">
      <div v-if="effState === 'idle'" class="basic-diag__dial">
        <InputText v-model="target" :placeholder="placeholder" @keyup.enter="dial" />
        <Button label="Call" severity="success" icon="pi pi-phone" @click="dial" />
      </div>
      <div v-else class="basic-diag__callrow">
        <span>{{ effState }} · {{ effRemoteDisplayName || effRemoteUri || '—' }}</span>
        <div class="basic-diag__controls">
          <Button
            v-if="isIncoming"
            label="Answer"
            severity="success"
            size="small"
            @click="answerCall"
          />
          <Button
            v-if="isActive"
            :label="effIsOnHold ? 'Resume' : 'Hold'"
            size="small"
            @click="toggleHold"
          />
          <Button
            v-if="isActive"
            :label="effIsMuted ? 'Unmute' : 'Mute'"
            size="small"
            @click="toggleMute"
          />
          <Button
            v-if="canHangup"
            label="Hang up"
            severity="danger"
            size="small"
            @click="hangupCall"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { playgroundSipClient } from '../../sipClient'
import { useSimulation } from '../../composables/useSimulation'
import SimulationControls from '../../components/SimulationControls.vue'
import { Button, InputText, Message } from '../shared-components'
import { resolveDialTarget, domainOfRegistered } from './resolveDialTarget'
import { useBasicCallSession } from './sharedSession'
import { canHangupFromState, isActiveCallState, isIncomingCallState } from './uiState'

const sim = useSimulation()
const { isConnected, registeredUri } = playgroundSipClient
const real = useBasicCallSession()

const target = ref('')

const placeholder = computed(() => {
  const domain = domainOfRegistered(registeredUri.value)
  return domain ? `2000 or sip:2000@${domain}` : '2000 or sip:2000@example.com'
})

const effIsConnected = computed(() => (sim.isSimulationMode.value ? true : isConnected.value))
const effState = computed(() => (sim.isSimulationMode.value ? sim.state.value : real.state.value))
const effDuration = computed(() =>
  sim.isSimulationMode.value ? sim.duration.value : real.duration.value || 0
)
const effRemoteUri = computed(
  () => (sim.isSimulationMode.value ? sim.remoteUri.value : real.remoteUri.value) || ''
)
const effRemoteDisplayName = computed(
  () =>
    (sim.isSimulationMode.value ? sim.remoteDisplayName.value : real.remoteDisplayName.value) || ''
)
const effIsOnHold = computed(() =>
  sim.isSimulationMode.value ? sim.isOnHold.value : real.isOnHold.value
)
const effIsMuted = computed(() =>
  sim.isSimulationMode.value ? sim.isMuted.value : real.isMuted.value
)
const isIncoming = computed(() => isIncomingCallState(effState.value))
const isActive = computed(() => isActiveCallState(effState.value))
const canHangup = computed(() => canHangupFromState(effState.value))

defineExpose({
  get diagState() {
    return {
      connected: effIsConnected.value,
      callState: effState.value,
      duration: effDuration.value,
      remoteUri: effRemoteUri.value,
      onHold: effIsOnHold.value,
      muted: effIsMuted.value,
      simulated: sim.isSimulationMode.value,
    }
  },
})

const dial = async () => {
  const uri = resolveDialTarget(target.value, registeredUri.value)
  if (!uri) return
  if (sim.isSimulationMode.value) {
    sim.simulatedCall.value.remoteUri = uri
    sim.runScenario('outgoing')
  } else {
    await real.makeCall(uri, { audio: true, video: false })
  }
}

const answerCall = async () => {
  if (sim.isSimulationMode.value) sim.answer()
  else await real.answer({ audio: true, video: false })
}
const hangupCall = async () => {
  if (sim.isSimulationMode.value) sim.hangup()
  else await real.hangup()
}
const toggleHold = async () => {
  if (sim.isSimulationMode.value) sim.toggleHold()
  else if (effIsOnHold.value) await real.unhold()
  else await real.hold()
}
const toggleMute = async () => {
  if (sim.isSimulationMode.value) sim.toggleMute()
  else if (effIsMuted.value) await real.unmute()
  else await real.mute()
}
</script>

<style scoped>
.basic-diag {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.basic-diag__live {
  padding: 0.75rem 1rem;
  border: 1px solid var(--surface-border, #e5e7eb);
  border-radius: 0.5rem;
  background: var(--surface-0, #ffffff);
}
.basic-diag__dial {
  display: flex;
  gap: 0.5rem;
}
.basic-diag__dial :deep(.p-inputtext) {
  flex: 1;
}
.basic-diag__callrow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.basic-diag__controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
