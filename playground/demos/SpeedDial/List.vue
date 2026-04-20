<template>
  <div class="list-demo">
    <div class="list-demo__head">
      <div>
        <span class="list-demo__eyebrow">Speed-dial directory</span>
        <h3 class="list-demo__title">Frequently called</h3>
      </div>
      <div class="list-demo__sort" role="radiogroup" aria-label="Sort order">
        <button
          v-for="s in sortOptions"
          :key="s.id"
          type="button"
          class="list-demo__sort-btn"
          :class="{ 'list-demo__sort-btn--on': sortMode === s.id }"
          role="radio"
          :aria-checked="sortMode === s.id"
          @click="sortMode = s.id"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <ul class="list-demo__rows" role="list">
      <li v-for="c in sortedContacts" :key="c.id" class="list-demo__row">
        <span class="list-demo__avatar" :aria-hidden="true">{{ initials(c.name) }}</span>

        <div class="list-demo__meta">
          <div class="list-demo__row-head">
            <span class="list-demo__name">{{ c.name }}</span>
            <span v-if="c.vip" class="list-demo__tag">VIP</span>
          </div>
          <div class="list-demo__row-sub">
            <code class="list-demo__number">{{ c.number }}</code>
            <span class="list-demo__dot" aria-hidden="true">·</span>
            <span class="list-demo__last">{{ lastCallLabel(c.lastCall) }}</span>
          </div>
        </div>

        <div class="list-demo__stats">
          <div class="list-demo__stat">
            <span class="list-demo__stat-num">{{ c.calls }}</span>
            <span class="list-demo__stat-label">Calls</span>
          </div>
          <div class="list-demo__stat">
            <span class="list-demo__stat-num">{{ formatDuration(c.avgDuration) }}</span>
            <span class="list-demo__stat-label">Avg</span>
          </div>
        </div>

        <div class="list-demo__actions">
          <button
            type="button"
            class="list-demo__call"
            :class="{ 'list-demo__call--on': dialingId === c.id }"
            :disabled="dialingId !== null"
            @click="dial(c)"
            :aria-label="`Call ${c.name}`"
          >
            <span class="list-demo__call-icon" aria-hidden="true">↗</span>
            <span>{{ dialingId === c.id ? 'Dialing…' : 'Call' }}</span>
          </button>
          <button
            type="button"
            class="list-demo__star"
            :class="{ 'list-demo__star--on': c.vip }"
            @click="toggleVip(c.id)"
            :aria-label="c.vip ? `Remove VIP from ${c.name}` : `Mark ${c.name} VIP`"
            :aria-pressed="c.vip"
          >
            ★
          </button>
        </div>
      </li>
    </ul>

    <p v-if="statusMessage" class="list-demo__status" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface DirectoryContact {
  id: number
  name: string
  number: string
  calls: number
  avgDuration: number // seconds
  lastCall: number // ms epoch
  vip: boolean
}

const now = Date.now()
const min = 60_000
const hour = 60 * min
const day = 24 * hour

const contacts = ref<DirectoryContact[]>([
  {
    id: 1,
    name: 'Front desk',
    number: 'sip:100@pbx.example.com',
    calls: 42,
    avgDuration: 72,
    lastCall: now - 35 * min,
    vip: false,
  },
  {
    id: 2,
    name: 'Alex Rivera',
    number: 'sip:alex@example.com',
    calls: 28,
    avgDuration: 320,
    lastCall: now - 3 * hour,
    vip: true,
  },
  {
    id: 3,
    name: 'Sales team',
    number: 'sip:200@pbx.example.com',
    calls: 19,
    avgDuration: 210,
    lastCall: now - 1 * day,
    vip: false,
  },
  {
    id: 4,
    name: 'Support on-call',
    number: 'sip:911@pbx.example.com',
    calls: 11,
    avgDuration: 480,
    lastCall: now - 2 * day,
    vip: true,
  },
  {
    id: 5,
    name: 'Priya Shah',
    number: 'sip:priya@example.com',
    calls: 8,
    avgDuration: 165,
    lastCall: now - 6 * day,
    vip: false,
  },
  {
    id: 6,
    name: 'Voicemail',
    number: 'sip:*97@pbx.example.com',
    calls: 5,
    avgDuration: 45,
    lastCall: now - 12 * day,
    vip: false,
  },
])

type SortMode = 'frequency' | 'recent' | 'name'
const sortOptions: { id: SortMode; label: string }[] = [
  { id: 'frequency', label: 'Most-called' },
  { id: 'recent', label: 'Recent' },
  { id: 'name', label: 'A → Z' },
]
const sortMode = ref<SortMode>('frequency')

const dialingId = ref<number | null>(null)
const statusMessage = ref('')
let statusTimer: ReturnType<typeof setTimeout> | null = null

const sortedContacts = computed(() => {
  const list = [...contacts.value]
  if (sortMode.value === 'frequency') list.sort((a, b) => b.calls - a.calls)
  else if (sortMode.value === 'recent') list.sort((a, b) => b.lastCall - a.lastCall)
  else list.sort((a, b) => a.name.localeCompare(b.name))
  return list
})

const dial = (c: DirectoryContact) => {
  if (dialingId.value !== null) return
  dialingId.value = c.id
  flash(`Dialing ${c.name} at ${c.number}`)
  setTimeout(() => {
    dialingId.value = null
    c.calls += 1
    c.lastCall = Date.now()
  }, 1400)
}

const toggleVip = (id: number) => {
  const c = contacts.value.find((x) => x.id === id)
  if (!c) return
  c.vip = !c.vip
  flash(c.vip ? `${c.name} marked VIP` : `${c.name} unmarked`)
}

const flash = (msg: string) => {
  statusMessage.value = msg
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    statusMessage.value = ''
  }, 2200)
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return m === 0 ? `${r}s` : `${m}m ${r.toString().padStart(2, '0')}s`
}

const lastCallLabel = (ts: number) => {
  const diff = Date.now() - ts
  if (diff < hour) return `${Math.max(1, Math.floor(diff / min))}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`
  return new Date(ts).toLocaleDateString()
}
</script>

<style scoped>
.list-demo {
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
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.list-demo__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.list-demo__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.list-demo__title {
  margin: 0.1rem 0 0 0;
  font-size: 1.05rem;
  font-weight: 600;
}
.list-demo__sort {
  display: inline-flex;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 2px;
  gap: 2px;
}
.list-demo__sort-btn {
  background: transparent;
  color: var(--muted);
  border: 0;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.12s;
}
.list-demo__sort-btn:hover {
  color: var(--ink);
}
.list-demo__sort-btn--on {
  background: var(--ink);
  color: var(--paper);
}

.list-demo__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.list-demo__row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 0.9rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition: border-color 0.12s;
}
.list-demo__row:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}

.list-demo__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.list-demo__meta {
  min-width: 0;
}
.list-demo__row-head {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.list-demo__name {
  font-size: 0.92rem;
  font-weight: 600;
}
.list-demo__tag {
  display: inline-flex;
  align-items: center;
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 1px 5px;
  border-radius: 2px;
}
.list-demo__row-sub {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.1rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
}
.list-demo__number {
  font-family: var(--mono);
  background: transparent;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 26ch;
}
.list-demo__dot {
  opacity: 0.6;
}

.list-demo__stats {
  display: inline-flex;
  gap: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.list-demo__stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 2.5rem;
}
.list-demo__stat-num {
  font-family: var(--mono);
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--ink);
}
.list-demo__stat-label {
  font-family: var(--mono);
  font-size: 0.56rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.list-demo__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.list-demo__call {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  padding: 0.45rem 0.75rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.12s;
}
.list-demo__call:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
}
.list-demo__call:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.list-demo__call--on {
  background: var(--accent);
  border-color: var(--accent);
}
.list-demo__call-icon {
  font-weight: 400;
}

.list-demo__star {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--muted);
  font-size: 0.9rem;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  cursor: pointer;
  line-height: 1;
  transition: all 0.12s;
}
.list-demo__star:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.list-demo__star--on {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border-color: var(--accent);
}

.list-demo__status {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

@media (max-width: 620px) {
  .list-demo__row {
    grid-template-columns: auto 1fr auto;
    row-gap: 0.45rem;
  }
  .list-demo__stats {
    grid-column: 2 / 4;
    justify-content: flex-end;
  }
  .list-demo__actions {
    grid-column: 1 / 4;
    justify-content: flex-end;
  }
}
</style>
