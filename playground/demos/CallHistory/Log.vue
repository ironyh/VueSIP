<template>
  <div class="log-demo">
    <div class="log-demo__head">
      <div>
        <span class="log-demo__eyebrow">Recent activity</span>
        <h3 class="log-demo__title">Call log</h3>
      </div>
      <div class="log-demo__filters" role="radiogroup" aria-label="Filter calls">
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          class="log-demo__filter"
          :class="{ 'log-demo__filter--on': filter === f.id }"
          role="radio"
          :aria-checked="filter === f.id"
          @click="filter = f.id"
        >
          {{ f.label }}
          <span class="log-demo__filter-count">{{ f.count }}</span>
        </button>
      </div>
    </div>

    <div class="log-demo__search">
      <input
        type="search"
        v-model="query"
        placeholder="Search by name or URI…"
        class="log-demo__search-input"
        aria-label="Search call log"
      />
      <button
        type="button"
        class="log-demo__clear"
        v-if="query"
        @click="query = ''"
        aria-label="Clear search"
      >
        ×
      </button>
    </div>

    <ul v-if="grouped.length" class="log-demo__groups" role="list">
      <li v-for="group in grouped" :key="group.label" class="log-demo__group">
        <header class="log-demo__group-head">
          <span class="log-demo__group-label">{{ group.label }}</span>
          <span class="log-demo__group-count">{{ group.entries.length }}</span>
        </header>
        <ul class="log-demo__entries" role="list">
          <li
            v-for="entry in group.entries"
            :key="entry.id"
            class="log-demo__entry"
            :class="[`log-demo__entry--${entry.kind}`]"
          >
            <span class="log-demo__entry-icon" aria-hidden="true">
              <template v-if="entry.kind === 'missed'">✗</template>
              <template v-else-if="entry.direction === 'incoming'">↙</template>
              <template v-else>↗</template>
            </span>

            <div class="log-demo__entry-body">
              <div class="log-demo__entry-head">
                <span class="log-demo__entry-name">{{ entry.name }}</span>
                <span class="log-demo__entry-time">{{ timeLabel(entry.at) }}</span>
              </div>
              <div class="log-demo__entry-sub">
                <code class="log-demo__entry-uri">{{ entry.uri }}</code>
                <span class="log-demo__entry-dot" aria-hidden="true">·</span>
                <span class="log-demo__entry-dir">
                  {{ directionLabel(entry) }}
                </span>
                <template v-if="entry.kind !== 'missed'">
                  <span class="log-demo__entry-dot" aria-hidden="true">·</span>
                  <span class="log-demo__entry-duration">{{ formatDuration(entry.duration) }}</span>
                </template>
              </div>
            </div>

            <div class="log-demo__entry-tools">
              <button
                type="button"
                class="log-demo__tool"
                @click="redial(entry)"
                :aria-label="`Redial ${entry.name}`"
                title="Redial"
              >
                ↗
              </button>
              <button
                type="button"
                class="log-demo__tool"
                @click="deleteEntry(entry.id)"
                :aria-label="`Delete call with ${entry.name}`"
                title="Delete"
              >
                ×
              </button>
            </div>
          </li>
        </ul>
      </li>
    </ul>

    <div v-else class="log-demo__empty">
      <span class="log-demo__empty-icon" aria-hidden="true">∅</span>
      <p class="log-demo__empty-text">
        {{ query ? `No calls match "${query}"` : 'No calls in this view' }}
      </p>
    </div>

    <p v-if="statusMessage" class="log-demo__status" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Direction = 'incoming' | 'outgoing'
type Kind = 'answered' | 'missed'

interface LogEntry {
  id: number
  name: string
  uri: string
  direction: Direction
  kind: Kind
  at: number // ms epoch
  duration: number // seconds
}

const now = Date.now()
const min = 60_000
const hour = 60 * min
const day = 24 * hour

const entries = ref<LogEntry[]>([
  {
    id: 1,
    name: 'Alex Rivera',
    uri: 'sip:alex@example.com',
    direction: 'outgoing',
    kind: 'answered',
    at: now - 12 * min,
    duration: 248,
  },
  {
    id: 2,
    name: 'Unknown',
    uri: 'sip:+4670005551234@pstn.example.com',
    direction: 'incoming',
    kind: 'missed',
    at: now - 41 * min,
    duration: 0,
  },
  {
    id: 3,
    name: 'Front desk',
    uri: 'sip:100@pbx.example.com',
    direction: 'outgoing',
    kind: 'answered',
    at: now - 2 * hour,
    duration: 58,
  },
  {
    id: 4,
    name: 'Priya Shah',
    uri: 'sip:priya@example.com',
    direction: 'incoming',
    kind: 'answered',
    at: now - 3 * hour,
    duration: 612,
  },
  {
    id: 5,
    name: 'Sales team',
    uri: 'sip:200@pbx.example.com',
    direction: 'outgoing',
    kind: 'answered',
    at: now - 5 * hour,
    duration: 192,
  },
  {
    id: 6,
    name: 'Support on-call',
    uri: 'sip:911@pbx.example.com',
    direction: 'incoming',
    kind: 'missed',
    at: now - 1 * day,
    duration: 0,
  },
  {
    id: 7,
    name: 'Mei Chen',
    uri: 'sip:mei@example.com',
    direction: 'outgoing',
    kind: 'answered',
    at: now - 1 * day - 3 * hour,
    duration: 420,
  },
  {
    id: 8,
    name: 'Voicemail',
    uri: 'sip:*97@pbx.example.com',
    direction: 'outgoing',
    kind: 'answered',
    at: now - 2 * day,
    duration: 22,
  },
  {
    id: 9,
    name: 'Alex Rivera',
    uri: 'sip:alex@example.com',
    direction: 'incoming',
    kind: 'answered',
    at: now - 3 * day,
    duration: 95,
  },
  {
    id: 10,
    name: 'Unknown',
    uri: 'sip:+4670009998888@pstn.example.com',
    direction: 'incoming',
    kind: 'missed',
    at: now - 5 * day,
    duration: 0,
  },
])

type FilterId = 'all' | 'missed' | 'incoming' | 'outgoing'
const filter = ref<FilterId>('all')
const query = ref('')

const filters = computed<{ id: FilterId; label: string; count: number }[]>(() => [
  { id: 'all', label: 'All', count: entries.value.length },
  { id: 'missed', label: 'Missed', count: entries.value.filter((e) => e.kind === 'missed').length },
  {
    id: 'incoming',
    label: 'Incoming',
    count: entries.value.filter((e) => e.direction === 'incoming' && e.kind !== 'missed').length,
  },
  {
    id: 'outgoing',
    label: 'Outgoing',
    count: entries.value.filter((e) => e.direction === 'outgoing').length,
  },
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value
    .filter((e) => {
      if (filter.value === 'missed' && e.kind !== 'missed') return false
      if (filter.value === 'incoming' && !(e.direction === 'incoming' && e.kind !== 'missed'))
        return false
      if (filter.value === 'outgoing' && e.direction !== 'outgoing') return false
      if (q && !e.name.toLowerCase().includes(q) && !e.uri.toLowerCase().includes(q)) return false
      return true
    })
    .sort((a, b) => b.at - a.at)
})

const grouped = computed(() => {
  const groups: Record<string, LogEntry[]> = {}
  for (const e of filtered.value) {
    const diff = now - e.at
    let label = 'Older'
    if (diff < day) label = 'Today'
    else if (diff < 2 * day) label = 'Yesterday'
    else if (diff < 7 * day) label = 'This week'
    groups[label] = groups[label] || []
    groups[label].push(e)
  }
  const order = ['Today', 'Yesterday', 'This week', 'Older']
  return order.filter((l) => groups[l]?.length).map((label) => ({ label, entries: groups[label] }))
})

const statusMessage = ref('')
let statusTimer: ReturnType<typeof setTimeout> | null = null
const flash = (msg: string) => {
  statusMessage.value = msg
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    statusMessage.value = ''
  }, 2200)
}

const redial = (e: LogEntry) => flash(`Redialing ${e.name}…`)
const deleteEntry = (id: number) => {
  const e = entries.value.find((x) => x.id === id)
  entries.value = entries.value.filter((x) => x.id !== id)
  if (e) flash(`Deleted call with ${e.name}`)
}

const timeLabel = (ts: number) => {
  const diff = now - ts
  if (diff < min) return 'just now'
  if (diff < hour) return `${Math.floor(diff / min)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return m === 0 ? `${r}s` : `${m}:${r.toString().padStart(2, '0')}`
}

const directionLabel = (e: LogEntry) => {
  if (e.kind === 'missed') return 'Missed'
  return e.direction === 'incoming' ? 'Incoming' : 'Outgoing'
}
</script>

<style scoped>
.log-demo {
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
  gap: 0.75rem;
  color: var(--ink);
  font-family: var(--sans);
}

.log-demo__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.log-demo__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.log-demo__title {
  margin: 0.1rem 0 0 0;
  font-size: 1.05rem;
  font-weight: 600;
}
.log-demo__filters {
  display: inline-flex;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 2px;
  gap: 2px;
  flex-wrap: wrap;
}
.log-demo__filter {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: var(--muted);
  border: 0;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.12s;
}
.log-demo__filter:hover {
  color: var(--ink);
}
.log-demo__filter--on {
  background: var(--ink);
  color: var(--paper);
}
.log-demo__filter-count {
  font-size: 0.62rem;
  opacity: 0.6;
  font-variant-numeric: tabular-nums;
}

.log-demo__search {
  position: relative;
  display: flex;
  align-items: center;
}
.log-demo__search-input {
  flex: 1;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.log-demo__search-input:focus {
  outline: none;
  border-color: var(--accent);
}
.log-demo__clear {
  position: absolute;
  right: 0.4rem;
  background: transparent;
  border: 0;
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 2px;
}
.log-demo__clear:hover {
  color: var(--accent);
}

.log-demo__groups {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.log-demo__group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 0.2rem 0.2rem;
  border-bottom: 1px dashed var(--rule);
  margin-bottom: 0.3rem;
}
.log-demo__group-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.log-demo__group-count {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.log-demo__entries {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.log-demo__entry {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition: border-color 0.12s;
}
.log-demo__entry:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}

.log-demo__entry-icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--rule);
  color: var(--muted);
  font-size: 0.78rem;
  font-family: var(--mono);
  font-weight: 700;
}
.log-demo__entry--missed .log-demo__entry-icon {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.log-demo__entry-body {
  min-width: 0;
}
.log-demo__entry-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}
.log-demo__entry-name {
  font-weight: 600;
  font-size: 0.88rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.log-demo__entry--missed .log-demo__entry-name {
  color: var(--accent);
}
.log-demo__entry-time {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.log-demo__entry-sub {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  overflow: hidden;
}
.log-demo__entry-uri {
  background: transparent;
  color: var(--muted);
  font-family: var(--mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 28ch;
}
.log-demo__entry-dot {
  opacity: 0.55;
}
.log-demo__entry-dir {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.6rem;
}
.log-demo__entry-duration {
  font-variant-numeric: tabular-nums;
}

.log-demo__entry-tools {
  display: inline-flex;
  gap: 0.15rem;
  opacity: 0;
  transition: opacity 0.12s;
}
.log-demo__entry:hover .log-demo__entry-tools,
.log-demo__entry:focus-within .log-demo__entry-tools {
  opacity: 1;
}
.log-demo__tool {
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--muted);
  border-radius: 2px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.85rem;
}
.log-demo__tool:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.log-demo__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  color: var(--muted);
}
.log-demo__empty-icon {
  font-family: var(--mono);
  font-size: 1.6rem;
  opacity: 0.4;
}
.log-demo__empty-text {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.75rem;
}

.log-demo__status {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}

@media (max-width: 560px) {
  .log-demo__entry {
    grid-template-columns: auto 1fr;
    row-gap: 0.3rem;
  }
  .log-demo__entry-tools {
    grid-column: 1 / 3;
    justify-content: flex-end;
    opacity: 1;
  }
}
</style>
