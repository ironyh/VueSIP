<template>
  <div class="sup">
    <header class="sup__head">
      <div>
        <span class="sup__eyebrow">Agent roster</span>
        <h3 class="sup__title">
          {{ agents.length }} agents · {{ onCallCount }} on call · {{ readyCount }} ready
        </h3>
      </div>
      <div class="sup__filters" role="radiogroup" aria-label="Filter by state">
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          class="sup__filter"
          :class="{ 'sup__filter--on': activeFilter === f.id }"
          role="radio"
          :aria-checked="activeFilter === f.id"
          @click="activeFilter = f.id"
        >
          {{ f.label }}
          <span class="sup__filter-count">{{ f.count() }}</span>
        </button>
      </div>
    </header>

    <ul class="sup__list" role="list">
      <li
        v-for="a in visible"
        :key="a.id"
        class="sup__row"
        :class="[`sup__row--${a.state}`, { 'sup__row--active': selected === a.id }]"
      >
        <div class="sup__avatar" :aria-hidden="true">{{ initials(a.name) }}</div>
        <div class="sup__body">
          <div class="sup__line">
            <span class="sup__name">{{ a.name }}</span>
            <span class="sup__ext">x{{ a.extension }}</span>
            <span class="sup__state" :class="`sup__state--${a.state}`">{{
              stateLabel(a.state)
            }}</span>
          </div>
          <div class="sup__meta">
            <span v-if="a.state === 'on_call' && a.call">
              with <code>{{ a.call.number }}</code>
              <span class="sup__sep" aria-hidden="true">·</span>
              {{ formatDuration(a.call.duration) }}
              <span class="sup__sep" aria-hidden="true">·</span>
              {{ a.call.queue }}
            </span>
            <span v-else-if="a.state === 'paused'">
              {{ a.pauseReason }} · {{ formatDuration(a.stateSeconds) }}
            </span>
            <span v-else-if="a.state === 'wrap'">
              after-call work · {{ formatDuration(a.stateSeconds) }}
            </span>
            <span v-else-if="a.state === 'ready'">
              idle · {{ formatDuration(a.stateSeconds) }} · last {{ a.lastCallMinutes }}m ago
            </span>
            <span v-else>offline since {{ formatClock(a.offlineSince) }}</span>
          </div>
        </div>
        <div class="sup__tools">
          <button
            type="button"
            class="sup__tool"
            :disabled="a.state !== 'on_call'"
            :aria-label="`Spy on ${a.name}`"
            @click="act(a.id, 'spy')"
            title="Silent monitor"
          >
            Spy
          </button>
          <button
            type="button"
            class="sup__tool"
            :disabled="a.state !== 'on_call'"
            :aria-label="`Whisper to ${a.name}`"
            @click="act(a.id, 'whisper')"
            title="Whisper (agent hears, caller doesn't)"
          >
            Whisper
          </button>
          <button
            type="button"
            class="sup__tool sup__tool--danger"
            :disabled="a.state !== 'on_call'"
            :aria-label="`Barge into ${a.name}'s call`"
            @click="act(a.id, 'barge')"
            title="Barge (join the call)"
          >
            Barge
          </button>
        </div>
      </li>
    </ul>

    <p v-if="lastAction" class="sup__log">
      <code>{{ lastAction }}</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type State = 'ready' | 'on_call' | 'paused' | 'wrap' | 'offline'
interface Call {
  number: string
  duration: number
  queue: string
}
interface Agent {
  id: number
  name: string
  extension: string
  state: State
  stateSeconds: number
  call?: Call
  pauseReason?: string
  lastCallMinutes: number
  offlineSince?: number
}

const agents = ref<Agent[]>([
  {
    id: 1,
    name: 'Alex Rivera',
    extension: '1042',
    state: 'on_call',
    stateSeconds: 0,
    call: { number: '+14155550100', duration: 318, queue: 'support' },
    lastCallMinutes: 4,
  },
  {
    id: 2,
    name: 'Priya Shah',
    extension: '1043',
    state: 'ready',
    stateSeconds: 42,
    lastCallMinutes: 2,
  },
  {
    id: 3,
    name: 'Jordan Park',
    extension: '1044',
    state: 'paused',
    stateSeconds: 612,
    pauseReason: 'Lunch',
    lastCallMinutes: 38,
  },
  {
    id: 4,
    name: 'Rae Okafor',
    extension: '1045',
    state: 'on_call',
    stateSeconds: 0,
    call: { number: '+442079460000', duration: 92, queue: 'sales' },
    lastCallMinutes: 1,
  },
  {
    id: 5,
    name: 'Maya Chen',
    extension: '1046',
    state: 'wrap',
    stateSeconds: 34,
    lastCallMinutes: 1,
  },
  {
    id: 6,
    name: 'Theo Lindqvist',
    extension: '1047',
    state: 'ready',
    stateSeconds: 8,
    lastCallMinutes: 6,
  },
  {
    id: 7,
    name: 'Devon Ibarra',
    extension: '1048',
    state: 'on_call',
    stateSeconds: 0,
    call: { number: '+12125550171', duration: 734, queue: 'escalations' },
    lastCallMinutes: 12,
  },
  {
    id: 8,
    name: 'Kim Aydin',
    extension: '1049',
    state: 'offline',
    stateSeconds: 0,
    offlineSince: Date.now() - 45 * 60 * 1000,
    lastCallMinutes: 180,
  },
])

const selected = ref<number | null>(null)
const lastAction = ref('')

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    agents.value = agents.value.map((a) => ({
      ...a,
      stateSeconds: a.state === 'on_call' ? a.stateSeconds : a.stateSeconds + 1,
      call: a.call ? { ...a.call, duration: a.call.duration + 1 } : a.call,
    }))
  }, 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

type Action = 'spy' | 'whisper' | 'barge'
const act = (id: number, action: Action) => {
  const a = agents.value.find((x) => x.id === id)
  if (!a) return
  selected.value = id
  const map: Record<Action, string> = {
    spy: 'ChanSpy · w=none',
    whisper: 'ChanSpy · w=whisper',
    barge: 'ChanSpy · B=barge',
  }
  lastAction.value = `AMI → ${map[action]} → ${a.extension}`
}

const filters = [
  { id: 'all', label: 'All', count: () => agents.value.length },
  {
    id: 'on_call',
    label: 'On call',
    count: () => agents.value.filter((a) => a.state === 'on_call').length,
  },
  {
    id: 'ready',
    label: 'Ready',
    count: () => agents.value.filter((a) => a.state === 'ready').length,
  },
  {
    id: 'paused',
    label: 'Paused',
    count: () => agents.value.filter((a) => a.state === 'paused').length,
  },
]
const activeFilter = ref('all')

const visible = computed(() => {
  if (activeFilter.value === 'all') return agents.value
  return agents.value.filter((a) => a.state === activeFilter.value)
})

const onCallCount = computed(() => agents.value.filter((a) => a.state === 'on_call').length)
const readyCount = computed(() => agents.value.filter((a) => a.state === 'ready').length)

const stateLabel = (s: State) =>
  ({ ready: 'Ready', on_call: 'On call', paused: 'Paused', wrap: 'Wrap', offline: 'Offline' })[s]

const initials = (n: string) =>
  n
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}
const formatClock = (t?: number) => {
  if (!t) return '—'
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.sup {
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
  gap: 0.75rem;
  color: var(--ink);
  font-family: var(--sans);
}

.sup__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.sup__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.sup__title {
  margin: 0.1rem 0 0;
  font-size: 0.98rem;
  font-weight: 600;
}

.sup__filters {
  display: inline-flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.sup__filter {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.65rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  transition: all 0.12s;
}
.sup__filter:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.sup__filter--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.sup__filter-count {
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

.sup__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.sup__row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 0.7rem;
  align-items: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 0.75rem;
  transition: border-color 0.12s;
}
.sup__row--on_call {
  border-left-color: var(--accent);
}
.sup__row--ready {
  border-left-color: var(--ok);
}
.sup__row--paused {
  border-left-color: var(--warn);
}
.sup__row--wrap {
  border-left-color: color-mix(in srgb, var(--accent) 50%, var(--rule));
}
.sup__row--offline {
  opacity: 0.55;
}
.sup__row--active {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.sup__avatar {
  width: 36px;
  height: 36px;
  border-radius: 2px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.sup__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.sup__line {
  display: inline-flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.sup__name {
  font-weight: 600;
  font-size: 0.9rem;
}
.sup__ext {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}
.sup__state {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
}
.sup__state--ready {
  color: var(--ok);
  background: color-mix(in srgb, var(--ok) 10%, transparent);
}
.sup__state--on_call {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.sup__state--paused {
  color: var(--warn);
  background: color-mix(in srgb, var(--warn) 10%, transparent);
}
.sup__state--wrap {
  color: color-mix(in srgb, var(--accent) 70%, var(--ink));
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.sup__state--offline {
  color: var(--muted);
  background: var(--paper-deep);
}

.sup__meta {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
.sup__meta code {
  background: transparent;
  color: var(--ink);
  font-weight: 600;
}
.sup__sep {
  opacity: 0.5;
  margin: 0 0.2rem;
}

.sup__tools {
  display: inline-flex;
  gap: 0.2rem;
}
.sup__tool {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.sup__tool:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--ink);
}
.sup__tool:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.sup__tool--danger:hover:not(:disabled) {
  color: var(--crit);
  border-color: var(--crit);
}

.sup__log {
  margin: 0;
  padding: 0.4rem 0.7rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-left: 2px solid var(--accent);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--ink);
}
.sup__log code {
  background: transparent;
  color: var(--accent);
}
</style>
