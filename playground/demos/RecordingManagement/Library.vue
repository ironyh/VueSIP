<template>
  <div class="lib">
    <header class="lib__head">
      <div>
        <span class="lib__eyebrow">Recording library</span>
        <h3 class="lib__title">
          {{ filtered.length }} of {{ recordings.length }} recordings
          <span class="lib__total">· {{ formatSize(totalSize) }}</span>
        </h3>
      </div>
      <div class="lib__actions">
        <button type="button" class="lib__action" @click="refresh">↻ Refresh</button>
        <button type="button" class="lib__action lib__action--primary" @click="exportAll">
          Export selected
        </button>
      </div>
    </header>

    <section class="lib__filters" aria-label="Filters">
      <div class="lib__filter">
        <span class="lib__filter-label">Period</span>
        <div class="lib__chips" role="radiogroup">
          <button
            v-for="p in periods"
            :key="p.id"
            type="button"
            class="lib__chip"
            :class="{ 'lib__chip--on': period === p.id }"
            role="radio"
            :aria-checked="period === p.id"
            @click="period = p.id"
          >
            {{ p.label }}
          </button>
        </div>
      </div>
      <div class="lib__filter">
        <span class="lib__filter-label">Min. duration</span>
        <div class="lib__chips" role="radiogroup">
          <button
            v-for="d in durations"
            :key="d.value"
            type="button"
            class="lib__chip"
            :class="{ 'lib__chip--on': minDuration === d.value }"
            role="radio"
            :aria-checked="minDuration === d.value"
            @click="minDuration = d.value"
          >
            {{ d.label }}
          </button>
        </div>
      </div>
      <label class="lib__search">
        <span class="lib__filter-label">Caller</span>
        <input
          v-model="query"
          type="search"
          class="lib__search-input"
          placeholder="Name, E.164, or SIP URI…"
          aria-label="Filter by caller"
        />
      </label>
    </section>

    <ul v-if="filtered.length" class="lib__list" role="list">
      <li
        v-for="r in filtered"
        :key="r.id"
        class="lib__row"
        :class="{ 'lib__row--playing': playing?.id === r.id }"
      >
        <label class="lib__select">
          <input
            type="checkbox"
            :checked="selected.has(r.id)"
            @change="toggleSelect(r.id)"
            :aria-label="`Select ${r.party}`"
          />
        </label>
        <button
          type="button"
          class="lib__play"
          :aria-label="playing?.id === r.id ? 'Pause' : `Play ${r.party}`"
          @click="togglePlay(r)"
        >
          {{ playing?.id === r.id ? '‖' : '▶' }}
        </button>
        <div class="lib__meta">
          <div class="lib__meta-head">
            <span class="lib__party">{{ r.name }}</span>
            <code class="lib__uri">{{ r.party }}</code>
          </div>
          <div class="lib__meta-sub">
            <span class="lib__date">{{ formatDate(r.at) }}</span>
            <span class="lib__sep" aria-hidden="true">·</span>
            <span class="lib__dur">{{ formatDuration(r.duration) }}</span>
            <span class="lib__sep" aria-hidden="true">·</span>
            <span class="lib__size">{{ formatSize(r.size) }}</span>
            <span v-if="r.tags.length" class="lib__sep" aria-hidden="true">·</span>
            <span v-for="t in r.tags" :key="t" class="lib__tag" :class="`lib__tag--${t}`">{{
              t
            }}</span>
          </div>
        </div>
        <div v-if="playing?.id === r.id" class="lib__scrubber">
          <input
            type="range"
            min="0"
            :max="r.duration"
            v-model.number="playbackPos"
            class="lib__scrub"
            :aria-label="`Seek ${r.party}`"
          />
          <span class="lib__scrub-time"
            >{{ formatDuration(playbackPos) }} / {{ formatDuration(r.duration) }}</span
          >
        </div>
        <div class="lib__tools">
          <button
            type="button"
            class="lib__tool"
            :aria-label="`Download ${r.party}`"
            @click="download(r)"
          >
            ↓
          </button>
          <button
            type="button"
            class="lib__tool"
            :aria-label="`Share ${r.party}`"
            @click="share(r)"
          >
            ⤴
          </button>
          <button
            type="button"
            class="lib__tool lib__tool--danger"
            :aria-label="`Delete ${r.party}`"
            @click="remove(r.id)"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="lib__empty">No recordings match your filters.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Period = 'today' | '7d' | '30d' | 'all'
type Tag = 'sales' | 'support' | 'vip' | 'hold'

interface Recording {
  id: string
  name: string
  party: string
  at: number
  duration: number
  size: number
  tags: Tag[]
}

const HOUR = 3600
const DAY_MS = 86_400_000

const recordings = ref<Recording[]>([
  {
    id: 'rec-a81',
    name: 'Priya Shah',
    party: 'sip:priya.shah@example.com',
    at: Date.now() - 2 * 3600_000,
    duration: 612,
    size: 4_120_000,
    tags: ['vip', 'sales'],
  },
  {
    id: 'rec-a80',
    name: 'Alex Okafor',
    party: '+14155550100',
    at: Date.now() - 7 * 3600_000,
    duration: 238,
    size: 1_560_000,
    tags: ['support'],
  },
  {
    id: 'rec-a77',
    name: '+442079460000',
    party: '+442079460000',
    at: Date.now() - 1 * DAY_MS,
    duration: 44,
    size: 290_000,
    tags: ['support'],
  },
  {
    id: 'rec-a73',
    name: 'M. Dubois',
    party: 'sip:mdubois@partner.fr',
    at: Date.now() - 2 * DAY_MS,
    duration: 1847,
    size: 12_400_000,
    tags: ['sales', 'hold'],
  },
  {
    id: 'rec-a6f',
    name: 'Anonymous',
    party: 'sip:anonymous@unknown.invalid',
    at: Date.now() - 3 * DAY_MS,
    duration: 91,
    size: 610_000,
    tags: ['support'],
  },
  {
    id: 'rec-a5b',
    name: 'Priya Shah',
    party: 'sip:priya.shah@example.com',
    at: Date.now() - 12 * DAY_MS,
    duration: 423,
    size: 2_830_000,
    tags: ['vip'],
  },
  {
    id: 'rec-a4a',
    name: '+81352211234',
    party: '+81352211234',
    at: Date.now() - 18 * DAY_MS,
    duration: 2210,
    size: 14_800_000,
    tags: ['sales'],
  },
])

const periods = [
  { id: 'today' as const, label: 'Today' },
  { id: '7d' as const, label: 'Last 7 d' },
  { id: '30d' as const, label: 'Last 30 d' },
  { id: 'all' as const, label: 'All' },
]
const durations = [
  { value: 0, label: 'Any' },
  { value: 60, label: '≥ 1 min' },
  { value: 300, label: '≥ 5 min' },
  { value: 900, label: '≥ 15 min' },
]

const period = ref<Period>('7d')
const minDuration = ref<number>(0)
const query = ref('')

const filtered = computed(() => {
  const now = Date.now()
  const cutoff =
    period.value === 'today'
      ? now - 24 * 3600_000
      : period.value === '7d'
        ? now - 7 * DAY_MS
        : period.value === '30d'
          ? now - 30 * DAY_MS
          : 0
  const q = query.value.trim().toLowerCase()
  return recordings.value.filter((r) => {
    if (r.at < cutoff) return false
    if (r.duration < minDuration.value) return false
    if (q && !r.name.toLowerCase().includes(q) && !r.party.toLowerCase().includes(q)) return false
    return true
  })
})

const totalSize = computed(() => filtered.value.reduce((s, r) => s + r.size, 0))

const selected = ref<Set<string>>(new Set())
const toggleSelect = (id: string) => {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
  selected.value = new Set(selected.value)
}

const playing = ref<Recording | null>(null)
const playbackPos = ref(0)
const togglePlay = (r: Recording) => {
  if (playing.value?.id === r.id) {
    playing.value = null
    playbackPos.value = 0
  } else {
    playing.value = r
    playbackPos.value = 0
  }
}
const download = (r: Recording) => {
  console.log('download', r.id)
}
const share = (r: Recording) => {
  console.log('share', r.id)
}
const remove = (id: string) => {
  recordings.value = recordings.value.filter((r) => r.id !== id)
  selected.value.delete(id)
  if (playing.value?.id === id) playing.value = null
}
const refresh = () => {
  console.log('refresh')
}
const exportAll = () => {
  console.log('export', Array.from(selected.value))
}

const formatDate = (t: number): string => {
  const d = new Date(t)
  const now = Date.now()
  const diff = now - t
  if (diff < HOUR * 1000) return `${Math.max(1, Math.floor(diff / 60_000))} min ago`
  if (diff < 24 * 3600_000) return `${Math.floor(diff / 3600_000)} h ago`
  if (diff < 30 * DAY_MS) return `${Math.floor(diff / DAY_MS)} d ago`
  return d.toISOString().slice(0, 10)
}
const formatDuration = (sec: number): string => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
const formatSize = (b: number): string => {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.lib {
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

.lib__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.lib__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.lib__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.lib__total {
  color: var(--muted);
  font-weight: 500;
  font-family: var(--mono);
  font-size: 0.8rem;
}
.lib__actions {
  display: inline-flex;
  gap: 0.35rem;
}
.lib__action {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.lib__action:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.lib__action--primary {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.lib__action--primary:hover {
  background: var(--accent);
  border-color: var(--accent);
}

.lib__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  padding: 0.6rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.lib__filter {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.lib__filter-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.lib__chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.lib__chip {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.lib__chip:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.lib__chip--on {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.lib__search {
  flex: 1;
  min-width: 10rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.lib__search-input {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--ink);
}
.lib__search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.lib__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.lib__row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.55rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.lib__row--playing {
  border-color: var(--accent);
  border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, var(--paper));
}
.lib__row:has(.lib__scrubber) {
  grid-template-columns: auto auto 1fr auto;
  grid-template-rows: auto auto;
}
.lib__row:has(.lib__scrubber) .lib__scrubber {
  grid-column: 1 / -1;
}

.lib__select input {
  accent-color: var(--accent);
}
.lib__play {
  width: 2rem;
  height: 2rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--ink);
  font-family: var(--mono);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
}
.lib__play:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.lib__meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.lib__meta-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.lib__party {
  font-weight: 600;
  font-size: 0.88rem;
}
.lib__uri {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lib__meta-sub {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.lib__sep {
  opacity: 0.5;
}
.lib__dur,
.lib__size {
  font-variant-numeric: tabular-nums;
}
.lib__tag {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
}
.lib__tag--sales {
  color: #047857;
  border-color: #047857;
}
.lib__tag--support {
  color: var(--accent);
  border-color: var(--accent);
}
.lib__tag--vip {
  color: #7c3aed;
  border-color: #7c3aed;
}
.lib__tag--hold {
  color: #b91c1c;
  border-color: #b91c1c;
  background: color-mix(in srgb, #b91c1c 8%, transparent);
}

.lib__tools {
  display: inline-flex;
  gap: 0.2rem;
}
.lib__tool {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.lib__tool:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.lib__tool--danger:hover {
  color: #b91c1c;
  border-color: #b91c1c;
}

.lib__scrubber {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.35rem;
}
.lib__scrub {
  flex: 1;
  accent-color: var(--accent);
}
.lib__scrub-time {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.lib__empty {
  margin: 0;
  padding: 1.5rem;
  text-align: center;
  background: var(--paper-deep);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--muted);
}
</style>
