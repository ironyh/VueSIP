<template>
  <div class="cnt">
    <header class="cnt__head">
      <div>
        <span class="cnt__eyebrow">Directory · {{ visible.length }} / {{ contacts.length }}</span>
        <h3 class="cnt__title">
          {{ favoriteCount }} favorites · {{ onlineCount }} online
        </h3>
      </div>
      <div class="cnt__filters" role="radiogroup" aria-label="Filter">
        <button
          v-for="f in filters"
          :key="f.id"
          type="button"
          class="cnt__filter"
          :class="{ 'cnt__filter--on': filter === f.id }"
          role="radio"
          :aria-checked="filter === f.id"
          @click="filter = f.id"
        >
          {{ f.label }}
        </button>
      </div>
    </header>

    <div class="cnt__search">
      <input
        v-model="query"
        type="search"
        class="cnt__search-input"
        placeholder="Search name, company, number…"
        aria-label="Search contacts"
      />
      <span class="cnt__count">{{ visible.length }} match{{ visible.length === 1 ? '' : 'es' }}</span>
    </div>

    <ul v-if="visible.length" class="cnt__grid" role="list">
      <li v-for="c in visible" :key="c.id" class="cnt__card">
        <div class="cnt__avatar" :style="{ background: avatarColor(c.name) }">
          {{ initials(c.name) }}
          <span class="cnt__presence" :class="`cnt__presence--${c.presence}`" :title="c.presence" aria-hidden="true" />
        </div>
        <div class="cnt__body">
          <div class="cnt__head-row">
            <span class="cnt__name">{{ c.name }}</span>
            <button
              type="button"
              class="cnt__star"
              :class="{ 'cnt__star--on': c.favorite }"
              :aria-pressed="c.favorite"
              :aria-label="`Favorite ${c.name}`"
              @click="c.favorite = !c.favorite"
            >
              ★
            </button>
          </div>
          <span class="cnt__meta">{{ c.title }} · {{ c.company }}</span>
          <code class="cnt__uri">{{ c.primary }}</code>
          <div class="cnt__tags">
            <span v-for="t in c.tags" :key="t" class="cnt__tag">{{ t }}</span>
          </div>
          <div class="cnt__actions">
            <button type="button" class="cnt__action cnt__action--call" :aria-label="`Call ${c.name}`">
              Call
            </button>
            <button type="button" class="cnt__action" :aria-label="`Message ${c.name}`">
              Message
            </button>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="cnt__empty">No contacts match.</p>

    <footer class="cnt__foot">
      <span class="cnt__source">Sources · <code>ldap</code> · <code>carddav</code> · <code>crm</code></span>
      <span class="cnt__synced">Synced 4m ago</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Presence = 'available' | 'busy' | 'dnd' | 'away' | 'offline'
type FilterId = 'all' | 'favorites' | 'online' | 'recent'

interface Contact {
  id: number
  name: string
  title: string
  company: string
  primary: string
  presence: Presence
  favorite: boolean
  tags: string[]
  lastSeen: number
}

const contacts = ref<Contact[]>([
  { id: 1, name: 'Alex Rivera', title: 'Senior Account Exec', company: 'Acme Industrial', primary: 'sip:alex@example.com', presence: 'available', favorite: true, tags: ['sales', 'vip'], lastSeen: Date.now() - 60_000 },
  { id: 2, name: 'Priya Shah', title: 'Head of Partnerships', company: 'Northwind Logistics', primary: '+14155550100', presence: 'busy', favorite: true, tags: ['sales'], lastSeen: Date.now() - 2_000 },
  { id: 3, name: 'Tomás León', title: 'Regional Director · EMEA', company: 'Initech BV', primary: '+442079460000', presence: 'away', favorite: false, tags: ['emea', 'director'], lastSeen: Date.now() - 1_800_000 },
  { id: 4, name: 'Jun Okafor', title: 'Customer Success', company: 'Acme Industrial', primary: 'sip:jun@example.com', presence: 'available', favorite: false, tags: ['support'], lastSeen: Date.now() - 30_000 },
  { id: 5, name: 'Sara Kovač', title: 'Legal Counsel', company: 'Initech BV', primary: '+3861555222', presence: 'dnd', favorite: false, tags: ['legal'], lastSeen: Date.now() - 3_000 },
  { id: 6, name: 'Lee Park', title: 'SRE Lead', company: 'Umbrella Tech', primary: 'sip:lee@umbrella.test', presence: 'available', favorite: false, tags: ['ops', 'oncall'], lastSeen: Date.now() - 900 },
  { id: 7, name: 'Mika Weiss', title: 'VP Finance', company: 'Acme Industrial', primary: '+33142688000', presence: 'offline', favorite: false, tags: ['vip', 'finance'], lastSeen: Date.now() - 14_400_000 },
  { id: 8, name: 'Noor Hassan', title: 'Field Engineer', company: 'Northwind Logistics', primary: 'sip:noor@example.com', presence: 'away', favorite: true, tags: ['field'], lastSeen: Date.now() - 600_000 },
])

const filters: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'online', label: 'Online' },
  { id: 'recent', label: 'Recent' },
]
const filter = ref<FilterId>('all')
const query = ref('')

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return contacts.value.filter((c) => {
    if (filter.value === 'favorites' && !c.favorite) return false
    if (filter.value === 'online' && c.presence === 'offline') return false
    if (filter.value === 'recent' && c.lastSeen < Date.now() - 3_600_000) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.primary.toLowerCase().includes(q) ||
      c.tags.some((t) => t.includes(q))
    )
  })
})

const favoriteCount = computed(() => contacts.value.filter((c) => c.favorite).length)
const onlineCount = computed(() => contacts.value.filter((c) => c.presence !== 'offline').length)

const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

const avatarColor = (n: string) => {
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return `hsl(${h % 360}, 35%, 72%)`
}
</script>

<style scoped>
.cnt {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --available: #4a8f4a;
  --busy: #a41d08;
  --dnd: #7a4b9c;
  --away: #d4811f;
  --offline: #8a7d6b;

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.cnt__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.cnt__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cnt__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.cnt__filters { display: inline-flex; gap: 0.25rem; }
.cnt__filter {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.cnt__filter:hover { color: var(--ink); border-color: var(--ink); }
.cnt__filter--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.cnt__search {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.cnt__search-input {
  flex: 1;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.84rem;
  color: var(--ink);
}
.cnt__search-input:focus { outline: none; border-color: var(--accent); }
.cnt__count {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.cnt__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.5rem;
}
.cnt__card {
  display: flex;
  gap: 0.7rem;
  padding: 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition: border-color 0.12s;
}
.cnt__card:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }

.cnt__avatar {
  width: 44px;
  height: 44px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--ink);
  position: relative;
  flex-shrink: 0;
}
.cnt__presence {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--offline);
  border: 2px solid var(--paper);
}
.cnt__presence--available { background: var(--available); }
.cnt__presence--busy { background: var(--busy); }
.cnt__presence--dnd { background: var(--dnd); }
.cnt__presence--away { background: var(--away); }

.cnt__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.cnt__head-row { display: flex; justify-content: space-between; align-items: center; gap: 0.4rem; }
.cnt__name { font-weight: 600; font-size: 0.94rem; color: var(--ink); }

.cnt__star {
  background: transparent;
  border: 0;
  color: var(--rule);
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  transition: color 0.12s;
}
.cnt__star:hover { color: var(--accent); }
.cnt__star--on { color: var(--accent); }

.cnt__meta {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.cnt__uri {
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--ink);
  background: transparent;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cnt__tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.2rem;
}
.cnt__tag {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.08rem 0.35rem;
}

.cnt__actions {
  display: inline-flex;
  gap: 0.3rem;
  margin-top: 0.4rem;
}
.cnt__action {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.cnt__action:hover { color: var(--ink); border-color: var(--ink); }
.cnt__action--call {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.cnt__action--call:hover {
  color: var(--paper);
  background: var(--accent);
}

.cnt__empty {
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

.cnt__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.7rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.cnt__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
