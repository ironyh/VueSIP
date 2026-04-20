<template>
  <div class="ivs">
    <header class="ivs__head">
      <div>
        <span class="ivs__eyebrow">Session log · live</span>
        <h3 class="ivs__title">{{ active.length }} active · {{ sessions.length }} total</h3>
      </div>
      <div class="ivs__controls">
        <button type="button" class="ivs__ctrl" :aria-pressed="running" @click="running = !running">
          {{ running ? 'Pause' : 'Resume' }}
        </button>
        <button type="button" class="ivs__ctrl ivs__ctrl--ghost" @click="sessions = []">
          Clear
        </button>
      </div>
    </header>

    <ul class="ivs__list" role="list">
      <li
        v-for="s in visibleSessions"
        :key="s.id"
        class="ivs__row"
        :class="[`ivs__row--${s.status}`, { 'ivs__row--ab': s.status === 'abandoned' }]"
      >
        <div class="ivs__head-row">
          <span class="ivs__caller">
            <code>{{ s.number }}</code>
            <span class="ivs__call-id">{{ s.callId }}</span>
          </span>
          <span class="ivs__status" :class="`ivs__status--${s.status}`">
            {{ s.status }}
          </span>
        </div>

        <div class="ivs__path">
          <template v-for="(step, i) in s.path" :key="i">
            <span class="ivs__step">
              <span class="ivs__step-node">{{ step.node }}</span>
              <span v-if="step.dtmf" class="ivs__step-dtmf">
                <kbd>{{ step.dtmf }}</kbd>
              </span>
            </span>
            <span v-if="i < s.path.length - 1" class="ivs__step-arrow" aria-hidden="true">→</span>
          </template>
          <span v-if="s.status === 'navigating'" class="ivs__cursor" aria-hidden="true">▌</span>
        </div>

        <div class="ivs__meta">
          <span>elapsed {{ formatDuration(s.elapsed) }}</span>
          <span class="ivs__sep" aria-hidden="true">·</span>
          <span>entered {{ formatClock(s.enteredAt) }}</span>
          <span v-if="s.outcome" class="ivs__sep" aria-hidden="true">·</span>
          <span v-if="s.outcome" class="ivs__outcome">{{ s.outcome }}</span>
        </div>
      </li>
      <li v-if="!sessions.length" class="ivs__empty">
        Log cleared. New sessions will appear here as they arrive.
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Status = 'navigating' | 'transferred' | 'abandoned' | 'completed'
interface Step {
  node: string
  dtmf?: string
}
interface Session {
  id: string
  callId: string
  number: string
  enteredAt: number
  elapsed: number
  status: Status
  path: Step[]
  outcome?: string
}

const numbers = [
  '+14155550100',
  '+442079460000',
  '+13015550173',
  '+12125550171',
  '+46851550180',
  '+14085551920',
  'sip:anon@unknown.invalid',
]

const sampleFlows: Array<{ path: Step[]; status: Status; outcome?: string }> = [
  {
    path: [
      { node: 'root', dtmf: '1' },
      { node: 'main', dtmf: '2' },
      { node: 'support', dtmf: '2' },
      { node: 'queue' },
    ],
    status: 'transferred',
    outcome: '→ support queue',
  },
  {
    path: [
      { node: 'root', dtmf: '1' },
      { node: 'main', dtmf: '3' },
      { node: 'billing', dtmf: '1' },
    ],
    status: 'completed',
    outcome: 'self-serve balance',
  },
  {
    path: [{ node: 'root', dtmf: '1' }, { node: 'main', dtmf: '2' }, { node: 'support' }],
    status: 'abandoned',
    outcome: 'timeout at support menu',
  },
  {
    path: [{ node: 'root', dtmf: '1' }, { node: 'main', dtmf: '0' }, { node: 'queue' }],
    status: 'transferred',
    outcome: '→ operator',
  },
  { path: [{ node: 'root' }, { node: 'root' }], status: 'abandoned', outcome: 'no input' },
  { path: [{ node: 'root', dtmf: '2' }], status: 'completed', outcome: 'Spanish branch' },
]

const sessions = ref<Session[]>(
  Array.from({ length: 4 }, (_, i) => {
    const flow = sampleFlows[i % sampleFlows.length]
    return {
      id: `S${1000 + i}`,
      callId: `1701-${(2000 + i).toString(16)}`,
      number: numbers[i % numbers.length],
      enteredAt: Date.now() - (i + 1) * 18_000,
      elapsed: (i + 1) * 18,
      status: flow.status,
      path: flow.path,
      outcome: flow.outcome,
    }
  })
)

const running = ref(true)
let tickTimer: ReturnType<typeof setInterval> | null = null
let spawnTimer: ReturnType<typeof setInterval> | null = null
let seq = 1100

onMounted(() => {
  tickTimer = setInterval(() => {
    sessions.value = sessions.value.map((s) =>
      s.status === 'navigating'
        ? { ...s, elapsed: Math.floor((Date.now() - s.enteredAt) / 1000) }
        : s
    )
  }, 1000)
  spawnTimer = setInterval(() => {
    if (!running.value) return
    const active = sessions.value.filter((s) => s.status === 'navigating')
    if (active.length < 3 && Math.random() < 0.6) {
      sessions.value.unshift({
        id: `S${seq++}`,
        callId: `1701-${seq.toString(16)}`,
        number: numbers[Math.floor(Math.random() * numbers.length)],
        enteredAt: Date.now(),
        elapsed: 0,
        status: 'navigating',
        path: [{ node: 'root' }],
      })
    }
    sessions.value = sessions.value.map((s) => {
      if (s.status !== 'navigating') return s
      if (s.path.length >= 4 || Math.random() < 0.25) {
        const flow = sampleFlows[Math.floor(Math.random() * sampleFlows.length)]
        return { ...s, status: flow.status, outcome: flow.outcome }
      }
      if (Math.random() < 0.4) {
        const nextNode = ['main', 'support', 'billing', 'queue'][Math.floor(Math.random() * 4)]
        const dtmf = Math.floor(Math.random() * 9 + 1).toString()
        const last = s.path[s.path.length - 1]
        const withDtmf = { ...last, dtmf }
        return { ...s, path: [...s.path.slice(0, -1), withDtmf, { node: nextNode }] }
      }
      return s
    })
    if (sessions.value.length > 12) {
      sessions.value = sessions.value.slice(0, 12)
    }
  }, 2200)
})
onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (spawnTimer) clearInterval(spawnTimer)
})

const active = computed(() => sessions.value.filter((s) => s.status === 'navigating'))
const visibleSessions = computed(() => sessions.value)

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}
const formatClock = (t: number) => {
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.ivs {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --ok: #2f855a;
  --warn: #b45309;
  --crit: #a41d08;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.ivs__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ivs__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.ivs__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.ivs__controls {
  display: inline-flex;
  gap: 0.3rem;
}
.ivs__ctrl {
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.4rem 0.75rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.ivs__ctrl:hover {
  background: var(--accent);
}
.ivs__ctrl--ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
}
.ivs__ctrl--ghost:hover {
  color: var(--ink);
  border-color: var(--ink);
  background: transparent;
}

.ivs__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ivs__row {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ivs__row--navigating {
  border-left-color: var(--accent);
}
.ivs__row--transferred {
  border-left-color: var(--ok);
}
.ivs__row--completed {
  border-left-color: color-mix(in srgb, var(--ok) 60%, var(--rule));
}
.ivs__row--abandoned {
  border-left-color: var(--crit);
  opacity: 0.85;
}

.ivs__head-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ivs__caller {
  display: inline-flex;
  gap: 0.5rem;
  align-items: baseline;
  min-width: 0;
  flex-wrap: wrap;
}
.ivs__caller code {
  background: transparent;
  font-family: var(--mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
}
.ivs__call-id {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.ivs__status {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
}
.ivs__status--navigating {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.ivs__status--transferred {
  color: var(--ok);
  background: color-mix(in srgb, var(--ok) 10%, transparent);
}
.ivs__status--completed {
  color: color-mix(in srgb, var(--ok) 70%, var(--ink));
  background: color-mix(in srgb, var(--ok) 8%, transparent);
}
.ivs__status--abandoned {
  color: var(--crit);
  background: color-mix(in srgb, var(--crit) 10%, transparent);
}

.ivs__path {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
  font-family: var(--mono);
  font-size: 0.74rem;
}
.ivs__step {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.ivs__step-node {
  color: var(--ink);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.08rem 0.4rem;
  font-weight: 600;
}
.ivs__step-dtmf kbd {
  font-family: var(--mono);
  background: var(--accent);
  color: var(--paper);
  padding: 0.08rem 0.35rem;
  border-radius: 2px;
  font-size: 0.7rem;
  font-weight: 700;
}
.ivs__step-arrow {
  color: var(--muted);
}
.ivs__cursor {
  color: var(--accent);
  animation: ivs-blink 1s step-start infinite;
}
@keyframes ivs-blink {
  50% {
    opacity: 0;
  }
}

.ivs__meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
.ivs__sep {
  opacity: 0.5;
}
.ivs__outcome {
  color: var(--ink);
  font-weight: 600;
}

.ivs__empty {
  padding: 1.2rem;
  text-align: center;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
}
</style>
