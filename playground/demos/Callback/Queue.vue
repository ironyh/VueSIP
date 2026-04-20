<template>
  <div class="cbq">
    <header class="cbq__head">
      <div>
        <span class="cbq__eyebrow">Callback queue</span>
        <h3 class="cbq__title">
          {{ pending.length }} pending
          <span v-if="overdueCount" class="cbq__overdue">· {{ overdueCount }} overdue</span>
        </h3>
      </div>
      <button type="button" class="cbq__new" @click="addSample">+ Test request</button>
    </header>

    <div class="cbq__stats">
      <div class="cbq__stat">
        <span class="cbq__stat-v">{{ pending.length }}</span>
        <span class="cbq__stat-k">Queued</span>
      </div>
      <div class="cbq__stat">
        <span class="cbq__stat-v">{{ completedToday }}</span>
        <span class="cbq__stat-k">Completed today</span>
      </div>
      <div class="cbq__stat">
        <span class="cbq__stat-v">{{ successRate }}%</span>
        <span class="cbq__stat-k">Success rate</span>
      </div>
      <div class="cbq__stat">
        <span class="cbq__stat-v">{{ avgAttempts.toFixed(1) }}</span>
        <span class="cbq__stat-k">Avg attempts</span>
      </div>
    </div>

    <ul v-if="pending.length" class="cbq__list" role="list">
      <li
        v-for="cb in pending"
        :key="cb.id"
        class="cbq__row"
        :class="[
          `cbq__row--${cb.priority}`,
          { 'cbq__row--overdue': isOverdue(cb), 'cbq__row--calling': cb.status === 'calling' },
        ]"
      >
        <div class="cbq__row-rank">
          <span class="cbq__pri" :class="`cbq__pri--${cb.priority}`">{{
            priorityLabel(cb.priority)
          }}</span>
        </div>
        <div class="cbq__row-main">
          <div class="cbq__row-head">
            <code class="cbq__num">{{ cb.number }}</code>
            <span v-if="cb.name" class="cbq__name">{{ cb.name }}</span>
          </div>
          <div class="cbq__row-meta">
            <span
              >Queue <strong>{{ cb.queue }}</strong></span
            >
            <span class="cbq__sep" aria-hidden="true">·</span>
            <span
              >ETA <strong>{{ formatEta(cb.scheduledAt) }}</strong></span
            >
            <span class="cbq__sep" aria-hidden="true">·</span>
            <span>Attempt {{ cb.attempts }}/{{ cb.maxAttempts }}</span>
            <template v-if="cb.lastResult">
              <span class="cbq__sep" aria-hidden="true">·</span>
              <span class="cbq__last">{{ cb.lastResult }}</span>
            </template>
          </div>
        </div>
        <div class="cbq__row-tools">
          <button
            type="button"
            class="cbq__tool cbq__tool--primary"
            :disabled="cb.status === 'calling'"
            @click="execute(cb.id)"
          >
            {{ cb.status === 'calling' ? 'Calling…' : 'Call now' }}
          </button>
          <button type="button" class="cbq__tool" @click="reschedule(cb.id)">+15m</button>
          <button
            type="button"
            class="cbq__tool cbq__tool--danger"
            @click="cancel(cb.id)"
            :aria-label="`Cancel callback for ${cb.number}`"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="cbq__empty">Queue is empty. Agents are caught up.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Priority = 'vip' | 'high' | 'normal'
type Status = 'pending' | 'calling' | 'completed' | 'failed'

interface Callback {
  id: number
  number: string
  name?: string
  queue: string
  priority: Priority
  scheduledAt: number
  attempts: number
  maxAttempts: number
  status: Status
  lastResult?: 'no-answer' | 'busy' | 'failed'
}

const MIN = 60_000

const requests = ref<Callback[]>([
  {
    id: 1,
    number: '+14155550142',
    name: 'Rachel Kim',
    queue: 'sales',
    priority: 'vip',
    scheduledAt: Date.now() - 4 * MIN,
    attempts: 1,
    maxAttempts: 5,
    status: 'pending',
    lastResult: 'no-answer',
  },
  {
    id: 2,
    number: '+442079460031',
    name: 'David Owens',
    queue: 'support',
    priority: 'high',
    scheduledAt: Date.now() + 3 * MIN,
    attempts: 0,
    maxAttempts: 3,
    status: 'pending',
  },
  {
    id: 3,
    number: '+13105550998',
    queue: 'support',
    priority: 'normal',
    scheduledAt: Date.now() + 12 * MIN,
    attempts: 0,
    maxAttempts: 3,
    status: 'pending',
  },
  {
    id: 4,
    number: '+442079461122',
    name: 'Anita Patel',
    queue: 'billing',
    priority: 'high',
    scheduledAt: Date.now() + 22 * MIN,
    attempts: 2,
    maxAttempts: 3,
    status: 'pending',
    lastResult: 'busy',
  },
  {
    id: 5,
    number: '+4915205557001',
    queue: 'sales',
    priority: 'normal',
    scheduledAt: Date.now() + 45 * MIN,
    attempts: 0,
    maxAttempts: 3,
    status: 'pending',
  },
])

const pending = computed(() =>
  [...requests.value]
    .filter((c) => c.status === 'pending' || c.status === 'calling')
    .sort((a, b) => {
      const pri = { vip: 0, high: 1, normal: 2 }
      if (pri[a.priority] !== pri[b.priority]) return pri[a.priority] - pri[b.priority]
      return a.scheduledAt - b.scheduledAt
    })
)

const overdueCount = computed(() => pending.value.filter(isOverdue).length)
const completedToday = ref(18)
const successRate = ref(74)
const avgAttempts = ref(1.6)

const isOverdue = (cb: Callback) => cb.scheduledAt < Date.now() && cb.status === 'pending'

const priorityLabel = (p: Priority) => (p === 'vip' ? 'VIP' : p === 'high' ? 'HIGH' : 'STD')

const formatEta = (ts: number) => {
  const diff = ts - Date.now()
  const min = Math.round(diff / MIN)
  if (min < -60) return `${Math.floor(-min / 60)}h overdue`
  if (min < 0) return `${-min}m overdue`
  if (min === 0) return 'now'
  if (min < 60) return `in ${min}m`
  return `in ${Math.floor(min / 60)}h`
}

const execute = (id: number) => {
  const cb = requests.value.find((c) => c.id === id)
  if (!cb) return
  cb.status = 'calling'
  setTimeout(() => {
    const answered = Math.random() > 0.3
    if (answered) {
      cb.status = 'completed'
      requests.value = requests.value.filter((r) => r.id !== id)
      completedToday.value++
    } else {
      cb.attempts++
      cb.lastResult = 'no-answer'
      cb.status = cb.attempts >= cb.maxAttempts ? 'failed' : 'pending'
      cb.scheduledAt = Date.now() + 15 * MIN
      if (cb.status === 'failed') {
        requests.value = requests.value.filter((r) => r.id !== id)
      }
    }
  }, 1400)
}

const reschedule = (id: number) => {
  const cb = requests.value.find((c) => c.id === id)
  if (cb) cb.scheduledAt = Math.max(Date.now(), cb.scheduledAt) + 15 * MIN
}

const cancel = (id: number) => {
  requests.value = requests.value.filter((c) => c.id !== id)
}

let sampleId = 100
const addSample = () => {
  const samples = [
    {
      number: '+16175551234',
      name: 'Jordan Alvarez',
      queue: 'sales',
      priority: 'normal' as Priority,
    },
    {
      number: '+33145550066',
      name: 'Céline Dufour',
      queue: 'billing',
      priority: 'high' as Priority,
    },
    { number: '+61299550088', queue: 'support', priority: 'normal' as Priority },
  ]
  const s = samples[Math.floor(Math.random() * samples.length)]
  requests.value.push({
    id: ++sampleId,
    ...s,
    scheduledAt: Date.now() + (5 + Math.floor(Math.random() * 30)) * MIN,
    attempts: 0,
    maxAttempts: 3,
    status: 'pending',
  })
}
</script>

<style scoped>
.cbq {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #a41d08;
  --vip: #7c2d12;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}
.cbq__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.cbq__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cbq__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.cbq__overdue {
  color: var(--danger);
  font-weight: 700;
}
.cbq__new {
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.5rem 0.85rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.cbq__new:hover {
  background: var(--accent);
}

.cbq__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}
.cbq__stat {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.cbq__stat-v {
  font-family: var(--mono);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.cbq__stat-k {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.cbq__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cbq__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.8rem;
  transition: border-color 0.15s;
}
.cbq__row--vip {
  border-left-color: var(--vip);
  background: color-mix(in srgb, var(--vip) 3%, var(--paper));
}
.cbq__row--high {
  border-left-color: var(--accent);
}
.cbq__row--overdue {
  border-color: var(--danger);
}
.cbq__row--calling {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.cbq__row-rank {
  display: flex;
}
.cbq__pri {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 0.18rem 0.4rem;
  border-radius: 2px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  color: var(--muted);
}
.cbq__pri--vip {
  background: var(--vip);
  color: var(--paper);
  border-color: var(--vip);
}
.cbq__pri--high {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.cbq__row-main {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.cbq__row-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.cbq__num {
  font-family: var(--mono);
  font-size: 0.88rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.cbq__name {
  font-size: 0.85rem;
  color: var(--ink);
}
.cbq__row-meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.cbq__row-meta strong {
  color: var(--ink);
  font-weight: 600;
}
.cbq__sep {
  opacity: 0.5;
}
.cbq__last {
  color: var(--danger);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.cbq__row-tools {
  display: inline-flex;
  gap: 0.3rem;
  flex-shrink: 0;
}
.cbq__tool {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.cbq__tool:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.cbq__tool--primary {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.cbq__tool--primary:hover {
  background: var(--accent);
  color: var(--paper);
}
.cbq__tool--primary:disabled {
  opacity: 0.55;
  cursor: wait;
}
.cbq__tool--danger {
  font-size: 1rem;
  line-height: 1;
  padding: 0.2rem 0.55rem;
}
.cbq__tool--danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.cbq__empty {
  margin: 0;
  padding: 1.5rem;
  text-align: center;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--muted);
}
</style>
