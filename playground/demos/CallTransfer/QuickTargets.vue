<template>
  <section class="quick-transfer" aria-live="polite">
    <div v-if="!isActive" class="quick-transfer__gate">
      <span class="quick-transfer__gate-label">Presets</span>
      <span class="quick-transfer__gate-value">Awaiting active call</span>
      <span class="quick-transfer__gate-hint">
        {{ isSimulationMode ? 'Run the "Active Call" scenario in the first variant' : 'Connect a call to enable quick-transfer buttons' }}
      </span>
    </div>

    <div v-else class="quick-transfer__stage">
      <div class="quick-transfer__head">
        <span class="quick-transfer__head-label">Quick transfer</span>
        <span class="quick-transfer__head-name">{{ effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown' }}</span>
      </div>

      <ul class="quick-transfer__list">
        <li v-for="destination in destinations" :key="destination.id">
          <button
            type="button"
            class="quick-transfer__item"
            :disabled="sendingId !== null"
            @click="send(destination)"
          >
            <span class="quick-transfer__item-body">
              <span class="quick-transfer__item-title">{{ destination.label }}</span>
              <span class="quick-transfer__item-uri">{{ destination.uri }}</span>
            </span>
            <span class="quick-transfer__item-cta">
              {{ sendingId === destination.id ? 'Sending…' : 'Transfer' }}
            </span>
          </button>
        </li>
      </ul>

      <p v-if="status" class="quick-transfer__status" :class="{ 'quick-transfer__status--error': isError }">
        {{ status }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCallTransferDemoContext } from './sharedContext'

interface Destination {
  id: string
  label: string
  uri: string
}

const { callSession, controls, simulation } = useCallTransferDemoContext()

const destinations: Destination[] = [
  { id: 'frontdesk', label: 'Front desk', uri: 'sip:frontdesk@example.com' },
  { id: 'sales', label: 'Sales queue', uri: 'sip:sales@example.com' },
  { id: 'support', label: 'Support queue', uri: 'sip:support@example.com' },
  { id: 'vm', label: 'Voicemail', uri: 'sip:*97@example.com' },
]

const sendingId = ref<string | null>(null)
const status = ref('')
const isError = ref(false)

const isSimulationMode = computed(() => simulation.isSimulationMode.value)
const effectiveState = computed(() =>
  isSimulationMode.value ? simulation.state.value : callSession.state.value
)
const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : callSession.remoteUri.value
)
const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : callSession.remoteDisplayName.value
)
const isActive = computed(() => effectiveState.value === 'active')

const send = async (destination: Destination) => {
  if (sendingId.value) return

  sendingId.value = destination.id
  isError.value = false
  status.value = ''

  if (isSimulationMode.value) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    status.value = `Simulated blind transfer to ${destination.label}`
    simulation.hangup()
    sendingId.value = null
    return
  }

  try {
    if (!callSession.session.value) {
      throw new Error('No active call session')
    }
    await controls.blindTransfer(callSession.session.value.id, destination.uri)
    status.value = `Transferred to ${destination.label}`
  } catch (error) {
    isError.value = true
    status.value = error instanceof Error ? error.message : 'Quick transfer failed'
  } finally {
    sendingId.value = null
  }
}
</script>

<style scoped>
.quick-transfer {
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

.quick-transfer__gate {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--muted);
  border-radius: 2px;
  background: var(--paper-deep);
  font-family: var(--mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.quick-transfer__gate-label { color: var(--muted); }
.quick-transfer__gate-value { font-weight: 700; }
.quick-transfer__gate-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
}

.quick-transfer__stage {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.quick-transfer__head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.quick-transfer__head-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}

.quick-transfer__head-name {
  font-family: var(--mono);
  font-size: 0.95rem;
}

.quick-transfer__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.quick-transfer__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  text-align: left;
  padding: 0.7rem 0.8rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.12s, transform 0.08s;
}

.quick-transfer__item:hover:not(:disabled) {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.quick-transfer__item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.quick-transfer__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.quick-transfer__item-title {
  font-weight: 600;
}

.quick-transfer__item-uri,
.quick-transfer__item-cta {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
}

.quick-transfer__status {
  margin: 0;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--accent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.quick-transfer__status--error {
  border-left-color: #b91c1c;
  background: color-mix(in srgb, #b91c1c 7%, transparent);
}
</style>
