<template>
  <div class="roster">
    <header class="roster__head">
      <div>
        <span class="roster__eyebrow">Team roster</span>
        <h3 class="roster__title">{{ members.length }} watched · {{ availableCount }} available</h3>
      </div>
      <div class="roster__sort" role="radiogroup" aria-label="Group by">
        <button
          v-for="g in groupings"
          :key="g.id"
          type="button"
          class="roster__sort-btn"
          :class="{ 'roster__sort-btn--on': grouping === g.id }"
          role="radio"
          :aria-checked="grouping === g.id"
          @click="grouping = g.id"
        >
          {{ g.label }}
        </button>
      </div>
    </header>

    <div class="roster__search">
      <input
        type="search"
        v-model="query"
        placeholder="Search team…"
        class="roster__search-input"
        aria-label="Search roster"
      />
      <label class="roster__toggle">
        <input type="checkbox" v-model="hideOffline" />
        <span>Hide offline</span>
      </label>
    </div>

    <ul class="roster__groups" role="list">
      <li v-for="group in groups" :key="group.label" class="roster__group">
        <header class="roster__group-head">
          <span class="roster__group-label">{{ group.label }}</span>
          <span class="roster__group-count">{{ group.members.length }}</span>
        </header>
        <ul class="roster__list" role="list">
          <li
            v-for="m in group.members"
            :key="m.id"
            class="roster__row"
            :class="`roster__row--${m.state}`"
          >
            <span class="roster__avatar" aria-hidden="true">
              {{ initials(m.name) }}
              <span class="roster__dot"></span>
            </span>
            <div class="roster__body">
              <div class="roster__row-head">
                <span class="roster__name">{{ m.name }}</span>
                <span class="roster__state-chip">
                  {{ stateLabel(m.state) }}
                </span>
              </div>
              <div class="roster__row-sub">
                <code class="roster__uri">{{ m.uri }}</code>
                <template v-if="m.note">
                  <span class="roster__dot-sep" aria-hidden="true">·</span>
                  <span class="roster__note">{{ m.note }}</span>
                </template>
              </div>
            </div>
            <div class="roster__tools">
              <button
                type="button"
                class="roster__tool"
                :disabled="m.state === 'offline' || m.state === 'dnd'"
                :title="
                  m.state === 'dnd' ? 'Do-Not-Disturb' : m.state === 'offline' ? 'Offline' : 'Call'
                "
                :aria-label="`Call ${m.name}`"
              >
                ↗
              </button>
              <button
                type="button"
                class="roster__tool"
                :disabled="m.state === 'offline'"
                :title="m.state === 'offline' ? 'Offline' : 'Message'"
                :aria-label="`Message ${m.name}`"
              >
                ✉
              </button>
            </div>
          </li>
        </ul>
      </li>
    </ul>

    <p v-if="!groups.length" class="roster__empty">No matches</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type State = 'available' | 'busy' | 'away' | 'dnd' | 'offline'

interface Member {
  id: number
  name: string
  uri: string
  state: State
  note?: string
  team: string
}

const members = ref<Member[]>([
  {
    id: 1,
    name: 'Alex Rivera',
    uri: 'sip:alex@example.com',
    state: 'available',
    team: 'Engineering',
  },
  {
    id: 2,
    name: 'Priya Shah',
    uri: 'sip:priya@example.com',
    state: 'busy',
    note: 'In a call',
    team: 'Engineering',
  },
  {
    id: 3,
    name: 'Mei Chen',
    uri: 'sip:mei@example.com',
    state: 'away',
    note: 'Back in 20 min',
    team: 'Engineering',
  },
  {
    id: 4,
    name: 'Jordan Lee',
    uri: 'sip:jordan@example.com',
    state: 'dnd',
    note: 'Deep work until 3 PM',
    team: 'Design',
  },
  { id: 5, name: 'Sam Park', uri: 'sip:sam@example.com', state: 'available', team: 'Design' },
  { id: 6, name: 'Casey Morgan', uri: 'sip:casey@example.com', state: 'offline', team: 'Support' },
  {
    id: 7,
    name: 'Riley Kim',
    uri: 'sip:riley@example.com',
    state: 'busy',
    note: 'On customer call',
    team: 'Support',
  },
  { id: 8, name: 'Quinn Tan', uri: 'sip:quinn@example.com', state: 'available', team: 'Support' },
  { id: 9, name: 'Devon Hart', uri: 'sip:devon@example.com', state: 'offline', team: 'Sales' },
])

type GroupingId = 'team' | 'state' | 'none'
const groupings: { id: GroupingId; label: string }[] = [
  { id: 'team', label: 'By team' },
  { id: 'state', label: 'By state' },
  { id: 'none', label: 'Flat' },
]
const grouping = ref<GroupingId>('team')

const query = ref('')
const hideOffline = ref(false)

const availableCount = computed(() => members.value.filter((m) => m.state === 'available').length)

const filteredMembers = computed(() => {
  const q = query.value.trim().toLowerCase()
  return members.value.filter((m) => {
    if (hideOffline.value && m.state === 'offline') return false
    if (q && !m.name.toLowerCase().includes(q) && !m.uri.toLowerCase().includes(q)) return false
    return true
  })
})

const stateOrder: Record<State, number> = {
  available: 0,
  busy: 1,
  away: 2,
  dnd: 3,
  offline: 4,
}

const groups = computed(() => {
  const list = [...filteredMembers.value]
  if (grouping.value === 'none') {
    if (!list.length) return []
    return [
      {
        label: 'All',
        members: list.sort(
          (a, b) => stateOrder[a.state] - stateOrder[b.state] || a.name.localeCompare(b.name)
        ),
      },
    ]
  }
  const buckets = new Map<string, Member[]>()
  for (const m of list) {
    const key = grouping.value === 'team' ? m.team : stateLabel(m.state)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(m)
  }
  const entries = [...buckets.entries()]
  if (grouping.value === 'state') {
    const order = stateLabel
    entries.sort((a, b) => {
      const aState = members.value.find((m) => order(m.state) === a[0])?.state ?? 'offline'
      const bState = members.value.find((m) => order(m.state) === b[0])?.state ?? 'offline'
      return stateOrder[aState] - stateOrder[bState]
    })
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0]))
  }
  return entries.map(([label, members]) => ({
    label,
    members: members.sort(
      (a, b) => stateOrder[a.state] - stateOrder[b.state] || a.name.localeCompare(b.name)
    ),
  }))
})

function stateLabel(s: State): string {
  switch (s) {
    case 'available':
      return 'Available'
    case 'busy':
      return 'Busy'
    case 'away':
      return 'Away'
    case 'dnd':
      return 'Do-Not-Disturb'
    case 'offline':
      return 'Offline'
  }
}

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
</script>

<style scoped>
.roster {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  --c-available: #48bb78;
  --c-busy: #c2410c;
  --c-away: #eab308;
  --c-dnd: #a41d08;
  --c-offline: #6b5d4a;

  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  color: var(--ink);
  font-family: var(--sans);
}

.roster__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.roster__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.roster__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.roster__sort {
  display: inline-flex;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 2px;
  gap: 2px;
}
.roster__sort-btn {
  background: transparent;
  color: var(--muted);
  border: 0;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.3rem 0.65rem;
  cursor: pointer;
  border-radius: 2px;
}
.roster__sort-btn:hover {
  color: var(--ink);
}
.roster__sort-btn--on {
  background: var(--ink);
  color: var(--paper);
}

.roster__search {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
}
.roster__search-input {
  flex: 1;
  min-width: 200px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.roster__search-input:focus {
  outline: none;
  border-color: var(--accent);
}
.roster__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.roster__toggle input {
  accent-color: var(--accent);
}

.roster__groups {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.roster__group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.15rem 0.3rem;
  border-bottom: 1px dashed var(--rule);
  margin-bottom: 0.35rem;
}
.roster__group-label {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.roster__group-count {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.roster__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.roster__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition:
    border-color 0.12s,
    opacity 0.12s;
}
.roster__row:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.roster__row--offline {
  opacity: 0.6;
}

.roster__avatar {
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
  position: relative;
}
.roster__dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--paper);
  background: var(--c-available);
}
.roster__row--busy .roster__dot {
  background: var(--c-busy);
}
.roster__row--away .roster__dot {
  background: var(--c-away);
}
.roster__row--dnd .roster__dot {
  background: var(--c-dnd);
}
.roster__row--offline .roster__dot {
  background: var(--c-offline);
}

.roster__body {
  min-width: 0;
}
.roster__row-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  justify-content: space-between;
}
.roster__name {
  font-weight: 600;
  font-size: 0.9rem;
}
.roster__state-chip {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.roster__row--available .roster__state-chip {
  color: var(--c-available);
}
.roster__row--busy .roster__state-chip {
  color: var(--c-busy);
}
.roster__row--away .roster__state-chip {
  color: var(--c-away);
}
.roster__row--dnd .roster__state-chip {
  color: var(--c-dnd);
}

.roster__row-sub {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  margin-top: 0.12rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
}
.roster__uri {
  background: transparent;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 24ch;
}
.roster__dot-sep {
  opacity: 0.6;
}
.roster__note {
  font-family: var(--sans);
}

.roster__tools {
  display: inline-flex;
  gap: 0.2rem;
}
.roster__tool {
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.12s;
}
.roster__tool:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}
.roster__tool:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.roster__empty {
  margin: 0;
  padding: 1.5rem;
  text-align: center;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
