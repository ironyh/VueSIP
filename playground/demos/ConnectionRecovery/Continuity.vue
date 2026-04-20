<template>
  <div class="crc">
    <header class="crc__head">
      <div>
        <span class="crc__eyebrow">In-call recovery UX</span>
        <h3 class="crc__title">{{ activeScenario.label }} · {{ phaseTitle }}</h3>
      </div>

      <div class="crc__controls" role="tablist" aria-label="Recovery scenarios">
        <button
          v-for="option in scenarios"
          :key="option.id"
          type="button"
          class="crc__tab"
          :class="{ 'crc__tab--active': scenario === option.id }"
          :aria-selected="scenario === option.id"
          @click="selectScenario(option.id)"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <section class="crc__banner" :class="`crc__banner--${phase.severity}`" role="status">
      <div class="crc__banner-copy">
        <span class="crc__banner-title">{{ phase.title }}</span>
        <span class="crc__banner-detail">{{ phase.detail }}</span>
      </div>
      <div class="crc__banner-actions">
        <button
          v-if="phase.id === 'stable'"
          type="button"
          class="crc__btn crc__btn--primary"
          @click="startRecovery"
        >
          Simulate drop
        </button>
        <button
          v-else-if="phase.id === 'failed'"
          type="button"
          class="crc__btn crc__btn--primary"
          @click="startRecovery"
        >
          Retry now
        </button>
        <button
          v-else
          type="button"
          class="crc__btn"
          @click="advance"
        >
          Next step
        </button>
      </div>
    </section>

    <ol class="crc__rail">
      <li
        v-for="step in steps"
        :key="step.id"
        class="crc__step"
        :class="{
          'crc__step--active': step.id === phase.id,
          'crc__step--done': completedSteps.includes(step.id),
        }"
      >
        <span class="crc__step-badge">{{ step.index }}</span>
        <span class="crc__step-body">
          <span class="crc__step-title">{{ step.title }}</span>
          <span class="crc__step-detail">{{ step.detail }}</span>
        </span>
      </li>
    </ol>

    <div class="crc__cards">
      <div class="crc__card">
        <span class="crc__card-label">User-facing rule</span>
        <p>{{ activeScenario.rule }}</p>
      </div>
      <div class="crc__card">
        <span class="crc__card-label">What the UI should do</span>
        <ul class="crc__list">
          <li v-for="item in phase.actions" :key="item">{{ item }}</li>
        </ul>
      </div>
    </div>

    <ul class="crc__log" role="list">
      <li v-for="entry in log" :key="entry.id" class="crc__log-row">
        <span class="crc__log-time">{{ entry.time }}</span>
        <span class="crc__log-msg">{{ entry.msg }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type ScenarioId = 'wifi-hop' | 'sleep-wake' | 'proxy-reset'
type PhaseId = 'stable' | 'reconnecting' | 'reregistering' | 'restored' | 'failed'

interface Scenario {
  id: ScenarioId
  label: string
  rule: string
  happyPath: Exclude<PhaseId, 'stable'>[]
}

interface Phase {
  id: PhaseId
  title: string
  detail: string
  severity: 'ok' | 'warn' | 'bad'
  actions: string[]
}

const scenarios: Scenario[] = [
  {
    id: 'wifi-hop',
    label: 'Wi-Fi hop',
    rule: 'Warn immediately, but assume recovery is likely within a few seconds.',
    happyPath: ['reconnecting', 'reregistering', 'restored'],
  },
  {
    id: 'sleep-wake',
    label: 'Sleep/wake',
    rule: 'Expect a short reconnect, then re-REGISTER before you promise audio is back.',
    happyPath: ['reconnecting', 'reregistering', 'restored'],
  },
  {
    id: 'proxy-reset',
    label: 'Proxy reset',
    rule: 'Escalate faster: users should see a persistent retry state and a manual retry once transport flaps.',
    happyPath: ['reconnecting', 'failed'],
  },
]

const phases: Record<PhaseId, Phase> = {
  stable: {
    id: 'stable',
    title: 'Call is healthy',
    detail: 'Keep recovery UI compact until the transport actually drops.',
    severity: 'ok',
    actions: [
      'No banner needed beyond a tiny status chip.',
      'Keep retry affordances hidden until there is a real problem.',
    ],
  },
  reconnecting: {
    id: 'reconnecting',
    title: 'Reconnecting media…',
    detail: 'Transport dropped. Freeze transient UI, keep hangup visible, and reassure the user that recovery is in progress.',
    severity: 'warn',
    actions: [
      'Pin a reconnect banner under the toolbar.',
      'Do not reset the call timer or wipe caller identity.',
      'Suppress duplicate error toasts while the banner is present.',
    ],
  },
  reregistering: {
    id: 'reregistering',
    title: 'Restoring signaling…',
    detail: 'Media path is back, but the client still needs a fresh REGISTER before the app can trust new mid-call controls.',
    severity: 'warn',
    actions: [
      'Keep transfer/hold disabled until REGISTER succeeds.',
      'Show progress in plain language instead of SIP jargon.',
      'Append the event to the call log for post-incident debugging.',
    ],
  },
  restored: {
    id: 'restored',
    title: 'Connection restored',
    detail: 'Recovery succeeded. Collapse the warning to a short-lived success state and return to the normal toolbar.',
    severity: 'ok',
    actions: [
      'Auto-collapse to a small success chip after a short delay.',
      'Retain one timeline entry so the user can explain what happened later.',
    ],
  },
  failed: {
    id: 'failed',
    title: 'Could not restore the call',
    detail: 'The automatic retries are exhausted. Surface a persistent failure state and ask the user to retry or redial.',
    severity: 'bad',
    actions: [
      'Escalate to a danger banner and keep it visible.',
      'Offer Retry now and Return to dialer side by side.',
      'Explain that the original call may already be gone so the user does not assume it is still parked.',
    ],
  },
}

const scenario = ref<ScenarioId>('wifi-hop')
const phase = ref<Phase>(phases.stable)
const completedSteps = ref<PhaseId[]>([])
const log = ref<Array<{ id: string; time: string; msg: string }>>([
  { id: 'seed', time: '08:24:11', msg: 'Call established · RTP stable · RTT 74 ms' },
])

const activeScenario = computed(
  () => scenarios.find((option) => option.id === scenario.value) ?? scenarios[0]
)
const phaseTitle = computed(() => phase.value.title)
const steps = computed(() =>
  activeScenario.value.happyPath.map((id, index) => ({
    id,
    index: index + 1,
    title: phases[id].title,
    detail: phases[id].detail,
  }))
)

const makeStamp = () => new Date().toLocaleTimeString('sv-SE', { hour12: false })

const pushLog = (msg: string) => {
  log.value = [
    ...log.value,
    { id: `${Date.now()}-${log.value.length}`, time: makeStamp(), msg },
  ].slice(-6)
}

const selectScenario = (next: ScenarioId) => {
  scenario.value = next
  phase.value = phases.stable
  completedSteps.value = []
  pushLog(`Scenario switched · ${scenarios.find((option) => option.id === next)?.label}`)
}

const startRecovery = () => {
  completedSteps.value = []
  phase.value = phases.reconnecting
  pushLog('Transport dropped · entering reconnect state')
}

const advance = () => {
  if (phase.value.id === 'stable') {
    startRecovery()
    return
  }

  const path = activeScenario.value.happyPath
  const currentIndex = path.indexOf(phase.value.id as Exclude<PhaseId, 'stable'>)
  if (currentIndex >= 0) {
    completedSteps.value = path.slice(0, currentIndex + 1)
  }

  const nextId = path[currentIndex + 1]
  phase.value = phases[nextId ?? 'restored']

  if (phase.value.id === 'reregistering') {
    pushLog('WebSocket open · sending fresh REGISTER on new CSeq')
  } else if (phase.value.id === 'restored') {
    pushLog('REGISTER 200 OK · audio restored without losing caller context')
  } else if (phase.value.id === 'failed') {
    pushLog('Max retry budget exhausted · promoting failure banner')
  }
}
</script>

<style scoped>
.crc {
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

.crc__head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.crc__eyebrow,
.crc__card-label {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.crc__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.crc__controls {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.crc__tab,
.crc__btn {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  padding: 0.42rem 0.7rem;
  cursor: pointer;
}

.crc__tab--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.crc__banner {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
}

.crc__banner--warn {
  border-left: 4px solid #d97706;
  background: color-mix(in srgb, #d97706 10%, var(--paper));
}

.crc__banner--bad {
  border-left: 4px solid #b91c1c;
  background: color-mix(in srgb, #b91c1c 12%, var(--paper));
}

.crc__banner--ok {
  border-left: 4px solid #15803d;
}

.crc__banner-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: min(28rem, 100%);
}

.crc__banner-title {
  font-weight: 700;
}

.crc__banner-detail {
  color: var(--muted);
  font-size: 0.82rem;
}

.crc__banner-actions,
.crc__controls {
  display: inline-flex;
  gap: 0.35rem;
}

.crc__btn--primary {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.crc__rail {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.4rem;
}

.crc__step {
  display: flex;
  gap: 0.55rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  opacity: 0.65;
}

.crc__step--done,
.crc__step--active {
  opacity: 1;
}

.crc__step--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.crc__step-badge {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--rule);
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.crc__step--done .crc__step-badge {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}

.crc__step-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.crc__step-title {
  font-weight: 600;
  font-size: 0.85rem;
}

.crc__step-detail {
  font-size: 0.76rem;
  color: var(--muted);
}

.crc__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.45rem;
}

.crc__card,
.crc__log {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
}

.crc__card {
  padding: 0.7rem 0.8rem;
}

.crc__card p {
  margin: 0.35rem 0 0;
  font-size: 0.84rem;
}

.crc__list,
.crc__log {
  list-style: none;
  margin: 0;
  padding: 0;
}

.crc__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.35rem;
}

.crc__list li {
  font-size: 0.82rem;
}

.crc__log {
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.crc__log-row {
  display: grid;
  grid-template-columns: 8ch 1fr;
  gap: 0.5rem;
}

.crc__log-time,
.crc__log-msg {
  font-family: var(--mono);
  font-size: 0.72rem;
}

.crc__log-time {
  color: var(--muted);
}
</style>
