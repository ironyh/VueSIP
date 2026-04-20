<template>
  <div class="inbox">
    <header class="inbox__head">
      <div>
        <span class="inbox__eyebrow">Inbox</span>
        <h3 class="inbox__title">{{ unreadCount }} unread · {{ threads.length }} threads</h3>
      </div>
      <div class="inbox__tabs" role="radiogroup" aria-label="Filter threads">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="inbox__tab"
          :class="{ 'inbox__tab--on': tab === t.id }"
          role="radio"
          :aria-checked="tab === t.id"
          @click="tab = t.id"
        >
          {{ t.label }}
          <span v-if="t.count" class="inbox__tab-count">{{ t.count }}</span>
        </button>
      </div>
    </header>

    <div class="inbox__search">
      <input
        type="search"
        v-model="query"
        placeholder="Search threads…"
        class="inbox__search-input"
        aria-label="Search threads"
      />
    </div>

    <ul class="inbox__list" role="list">
      <li
        v-for="t in filteredThreads"
        :key="t.id"
        class="inbox__row"
        :class="{
          'inbox__row--unread': t.unread > 0,
          'inbox__row--selected': selectedId === t.id,
        }"
      >
        <button
          type="button"
          class="inbox__row-btn"
          @click="open(t.id)"
          :aria-label="`Open thread with ${t.name}${t.unread ? `, ${t.unread} unread` : ''}`"
        >
          <span class="inbox__row-avatar" :aria-hidden="true">{{ initials(t.name) }}</span>

          <span class="inbox__row-body">
            <span class="inbox__row-head">
              <span class="inbox__row-name">
                {{ t.name }}
                <span v-if="t.pinned" class="inbox__row-pin" aria-label="Pinned">●</span>
              </span>
              <time class="inbox__row-time" :datetime="new Date(t.lastAt).toISOString()">{{
                shortTime(t.lastAt)
              }}</time>
            </span>
            <span class="inbox__row-preview">
              <span v-if="t.lastFromMe" class="inbox__row-from">You:</span>
              {{ t.preview }}
            </span>
          </span>

          <span class="inbox__row-side">
            <span v-if="t.unread" class="inbox__row-badge" aria-hidden="true">{{ t.unread }}</span>
            <span v-else-if="t.draft" class="inbox__row-draft">Draft</span>
          </span>
        </button>
      </li>
    </ul>

    <footer class="inbox__foot">
      <span class="inbox__foot-meta">
        Storage: in-memory · In production, persist to IndexedDB
      </span>
      <button
        type="button"
        class="inbox__foot-action"
        @click="markAllRead"
        :disabled="unreadCount === 0"
      >
        Mark all read
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Thread {
  id: number
  name: string
  uri: string
  preview: string
  lastAt: number
  lastFromMe: boolean
  unread: number
  pinned: boolean
  draft?: string | null
  group?: boolean
}

const now = Date.now()
const min = 60_000
const hour = 60 * min
const day = 24 * hour

const threads = ref<Thread[]>([
  {
    id: 1,
    name: 'Alex Rivera',
    uri: 'sip:alex@example.com',
    preview: 'Running 5 late.',
    lastAt: now - 8 * min,
    lastFromMe: false,
    unread: 2,
    pinned: true,
  },
  {
    id: 2,
    name: 'Design review',
    uri: 'sip:design@pbx.example.com',
    preview: 'You: Pushed the final frames.',
    lastAt: now - 42 * min,
    lastFromMe: true,
    unread: 0,
    pinned: false,
    group: true,
  },
  {
    id: 3,
    name: 'Priya Shah',
    uri: 'sip:priya@example.com',
    preview: 'Thanks, talk tomorrow.',
    lastAt: now - 2 * hour,
    lastFromMe: false,
    unread: 0,
    pinned: false,
  },
  {
    id: 4,
    name: 'On-call rota',
    uri: 'sip:oncall@pbx.example.com',
    preview: 'Page: DB latency spike',
    lastAt: now - 4 * hour,
    lastFromMe: false,
    unread: 1,
    pinned: false,
    group: true,
  },
  {
    id: 5,
    name: 'Mei Chen',
    uri: 'sip:mei@example.com',
    preview: "Let me know when you're free.",
    lastAt: now - 1 * day,
    lastFromMe: false,
    unread: 0,
    pinned: false,
    draft: 'Sounds good — how about',
  },
  {
    id: 6,
    name: 'Sales team',
    uri: 'sip:sales@pbx.example.com',
    preview: 'You: Quote sent to client',
    lastAt: now - 2 * day,
    lastFromMe: true,
    unread: 0,
    pinned: false,
    group: true,
  },
  {
    id: 7,
    name: 'Support on-call',
    uri: 'sip:911@pbx.example.com',
    preview: 'Escalation resolved.',
    lastAt: now - 3 * day,
    lastFromMe: false,
    unread: 0,
    pinned: false,
  },
])

type TabId = 'all' | 'unread' | 'groups' | 'pinned'
const tab = ref<TabId>('all')
const query = ref('')
const selectedId = ref<number | null>(1)

const unreadCount = computed(() => threads.value.reduce((a, t) => a + (t.unread || 0), 0))

const tabs = computed<{ id: TabId; label: string; count?: number }[]>(() => [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread', count: unreadCount.value || undefined },
  { id: 'groups', label: 'Groups' },
  { id: 'pinned', label: 'Pinned' },
])

const filteredThreads = computed(() => {
  const q = query.value.trim().toLowerCase()
  return threads.value
    .filter((t) => {
      if (tab.value === 'unread' && t.unread === 0) return false
      if (tab.value === 'groups' && !t.group) return false
      if (tab.value === 'pinned' && !t.pinned) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.preview.toLowerCase().includes(q))
        return false
      return true
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.lastAt - a.lastAt
    })
})

const open = (id: number) => {
  selectedId.value = id
  const t = threads.value.find((x) => x.id === id)
  if (t) t.unread = 0
}

const markAllRead = () => {
  threads.value.forEach((t) => {
    t.unread = 0
  })
}

const shortTime = (ts: number) => {
  const d = now - ts
  if (d < hour) return `${Math.max(1, Math.floor(d / min))}m`
  if (d < day) return `${Math.floor(d / hour)}h`
  if (d < 7 * day) return `${Math.floor(d / day)}d`
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
</script>

<style scoped>
.inbox {
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
  gap: 0.6rem;
  color: var(--ink);
  font-family: var(--sans);
}

.inbox__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.inbox__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.inbox__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.inbox__tabs {
  display: inline-flex;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 2px;
  gap: 2px;
  flex-wrap: wrap;
}
.inbox__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  color: var(--muted);
  border: 0;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border-radius: 2px;
}
.inbox__tab:hover {
  color: var(--ink);
}
.inbox__tab--on {
  background: var(--ink);
  color: var(--paper);
}
.inbox__tab-count {
  font-size: 0.6rem;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.inbox__search-input {
  width: 100%;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.inbox__search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.inbox__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  max-height: 380px;
  overflow-y: auto;
}
.inbox__row {
  margin: 0;
}
.inbox__row + .inbox__row {
  border-top: 1px solid var(--rule);
}
.inbox__row-btn {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  width: 100%;
  padding: 0.7rem 0.85rem;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  color: var(--ink);
  font-family: var(--sans);
  transition: background 0.12s;
}
.inbox__row-btn:hover {
  background: var(--paper-deep);
}
.inbox__row--selected .inbox__row-btn {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.inbox__row-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.74rem;
  font-weight: 700;
}

.inbox__row-body {
  min-width: 0;
}
.inbox__row-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
}
.inbox__row-name {
  font-size: 0.88rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.inbox__row--unread .inbox__row-name {
  font-weight: 700;
}
.inbox__row-pin {
  color: var(--accent);
  font-size: 0.4rem;
  line-height: 1;
}
.inbox__row-time {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.inbox__row-preview {
  display: block;
  font-size: 0.78rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 0.1rem;
}
.inbox__row--unread .inbox__row-preview {
  color: var(--ink);
}
.inbox__row-from {
  font-family: var(--mono);
  color: var(--muted);
  margin-right: 0.3rem;
}

.inbox__row-side {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.inbox__row-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 0.45rem;
  border-radius: 11px;
  background: var(--accent);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.inbox__row-draft {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 1px 5px;
  border-radius: 2px;
}

.inbox__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.45rem 0.55rem 0;
}
.inbox__foot-meta {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.06em;
}
.inbox__foot-action {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
  padding: 0.3rem 0.65rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.12s;
}
.inbox__foot-action:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}
.inbox__foot-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
