<template>
  <div class="bl">
    <header class="bl__head">
      <div>
        <span class="bl__eyebrow">Blocked numbers</span>
        <h3 class="bl__title">{{ entries.length }} entries · {{ activeCount }} active</h3>
      </div>
      <button type="button" class="bl__add" @click="openAdd">+ Add number</button>
    </header>

    <form v-if="adding" class="bl__form" @submit.prevent="submit">
      <div class="bl__form-row">
        <label class="bl__field">
          <span class="bl__label">Number or URI</span>
          <input
            type="text"
            v-model="draft.number"
            class="bl__input"
            placeholder="+1234567890 or sip:spam@evil.com"
            required
            autofocus
          />
        </label>
        <label class="bl__field">
          <span class="bl__label">Reason (optional)</span>
          <input
            type="text"
            v-model="draft.reason"
            class="bl__input"
            placeholder="Robocaller, ex-vendor, etc."
            maxlength="60"
          />
        </label>
      </div>
      <div class="bl__form-actions">
        <button type="button" class="bl__cancel" @click="cancel">Cancel</button>
        <button type="submit" class="bl__save">Block</button>
      </div>
    </form>

    <div class="bl__search">
      <input
        type="search"
        v-model="query"
        placeholder="Search blocked numbers…"
        class="bl__search-input"
        aria-label="Search blacklist"
      />
      <span class="bl__search-count">
        {{ filtered.length }} / {{ entries.length }}
      </span>
    </div>

    <ul v-if="filtered.length" class="bl__list" role="list">
      <li
        v-for="e in filtered"
        :key="e.id"
        class="bl__row"
        :class="{ 'bl__row--paused': !e.active }"
      >
        <div class="bl__row-main">
          <code class="bl__number">{{ e.number }}</code>
          <div class="bl__row-meta">
            <span v-if="e.reason" class="bl__reason">{{ e.reason }}</span>
            <span v-else class="bl__reason bl__reason--empty">No reason</span>
            <span class="bl__sep" aria-hidden="true">·</span>
            <span class="bl__since">Added {{ formatSince(e.addedAt) }}</span>
            <template v-if="e.hits">
              <span class="bl__sep" aria-hidden="true">·</span>
              <span class="bl__hits">{{ e.hits }} blocked</span>
            </template>
          </div>
        </div>
        <div class="bl__tools">
          <button
            type="button"
            class="bl__tool"
            :class="{ 'bl__tool--on': e.active }"
            :aria-pressed="e.active"
            :title="e.active ? 'Active — click to pause' : 'Paused — click to activate'"
            @click="togglePaused(e.id)"
          >
            {{ e.active ? 'Active' : 'Paused' }}
          </button>
          <button
            type="button"
            class="bl__tool bl__tool--danger"
            @click="remove(e.id)"
            :aria-label="`Remove ${e.number}`"
            title="Remove"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="bl__empty">
      {{ query ? 'No matches.' : 'Nothing blocked yet. Robocallers welcome.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

interface Entry {
  id: number
  number: string
  reason?: string
  active: boolean
  addedAt: number
  hits: number
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

const entries = ref<Entry[]>([
  { id: 1, number: '+18005551212', reason: 'Robocaller — warranty scam', active: true, addedAt: Date.now() - 4 * DAY, hits: 17 },
  { id: 2, number: '+442079460000', reason: 'Phishing — tax refund', active: true, addedAt: Date.now() - 11 * DAY, hits: 4 },
  { id: 3, number: 'sip:anonymous@unknown.invalid', reason: 'Anonymous', active: true, addedAt: Date.now() - 2 * HOUR, hits: 1 },
  { id: 4, number: '+14155550199', active: false, addedAt: Date.now() - 30 * DAY, hits: 23 },
  { id: 5, number: 'sip:spam@evil.example', reason: 'Known spam', active: true, addedAt: Date.now() - 60 * DAY, hits: 312 },
])

const adding = ref(false)
const draft = reactive({ number: '', reason: '' })

const openAdd = () => {
  draft.number = ''
  draft.reason = ''
  adding.value = true
}
const cancel = () => { adding.value = false }
const submit = () => {
  const number = draft.number.trim()
  if (!number) return
  entries.value.unshift({
    id: Math.max(0, ...entries.value.map((e) => e.id)) + 1,
    number,
    reason: draft.reason.trim() || undefined,
    active: true,
    addedAt: Date.now(),
    hits: 0,
  })
  adding.value = false
}

const togglePaused = (id: number) => {
  const e = entries.value.find((x) => x.id === id)
  if (e) e.active = !e.active
}
const remove = (id: number) => {
  entries.value = entries.value.filter((e) => e.id !== id)
}

const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return entries.value
  return entries.value.filter(
    (e) => e.number.toLowerCase().includes(q) || e.reason?.toLowerCase().includes(q)
  )
})

const activeCount = computed(() => entries.value.filter((e) => e.active).length)

const formatSince = (t: number) => {
  const d = Date.now() - t
  if (d < HOUR) return `${Math.max(1, Math.floor(d / 60_000))}m ago`
  if (d < DAY) return `${Math.floor(d / HOUR)}h ago`
  if (d < 30 * DAY) return `${Math.floor(d / DAY)}d ago`
  return `${Math.floor(d / (30 * DAY))}mo ago`
}
</script>

<style scoped>
.bl {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #a41d08;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  color: var(--ink);
  font-family: var(--sans);
}

.bl__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.bl__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.bl__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.bl__add {
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.5rem 0.85rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.bl__add:hover { background: var(--accent); }

.bl__form {
  background: var(--paper);
  border: 1px solid var(--accent);
  border-radius: 2px;
  padding: 0.8rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.bl__form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
@media (max-width: 620px) { .bl__form-row { grid-template-columns: 1fr; } }
.bl__field { display: flex; flex-direction: column; gap: 0.25rem; }
.bl__label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.bl__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.85rem;
  color: var(--ink);
}
.bl__input:focus { outline: none; border-color: var(--accent); }
.bl__form-actions { display: flex; justify-content: flex-end; gap: 0.4rem; }
.bl__cancel,
.bl__save {
  border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.bl__cancel { background: transparent; color: var(--muted); border: 1px solid var(--rule); }
.bl__cancel:hover { color: var(--ink); border-color: var(--ink); }
.bl__save { background: var(--accent); color: var(--paper); border: 0; }

.bl__search {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.bl__search-input {
  flex: 1;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.bl__search-input:focus { outline: none; border-color: var(--accent); }
.bl__search-count {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.bl__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.bl__row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition: border-color 0.12s, opacity 0.12s;
}
.bl__row:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.bl__row--paused { opacity: 0.55; }

.bl__row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.bl__number {
  font-family: var(--mono);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink);
  background: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bl__row-meta {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.bl__reason--empty { font-style: italic; opacity: 0.6; }
.bl__sep { opacity: 0.5; }
.bl__hits {
  color: var(--accent);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.bl__tools { display: inline-flex; gap: 0.25rem; }
.bl__tool {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.bl__tool:hover { color: var(--ink); border-color: var(--ink); }
.bl__tool--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.bl__tool--danger {
  font-size: 1rem;
  line-height: 1;
  padding: 0.2rem 0.55rem;
}
.bl__tool--danger:hover { color: var(--danger); border-color: var(--danger); }

.bl__empty {
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
