<template>
  <div class="umd">
    <header class="umd__head">
      <div>
        <span class="umd__eyebrow">Directory · {{ users.length }} users · {{ onlineCount }} online</span>
        <h3 class="umd__title">User management</h3>
      </div>
      <div class="umd__controls">
        <input
          v-model="query"
          type="search"
          class="umd__search"
          placeholder="name · ext · sip uri"
          aria-label="Filter users"
        />
        <select v-model="role" class="umd__select" aria-label="Filter by role">
          <option value="all">All roles</option>
          <option value="admin">Admins</option>
          <option value="agent">Agents</option>
          <option value="ext">Extensions</option>
        </select>
      </div>
    </header>

    <ul class="umd__list" role="list">
      <li v-for="u in filtered" :key="u.id" class="umd__row">
        <span class="umd__avatar" :aria-hidden="true">{{ initials(u.name) }}</span>
        <div class="umd__body">
          <span class="umd__name">{{ u.name }}</span>
          <span class="umd__uri">{{ u.uri }}</span>
        </div>
        <span class="umd__ext">ext {{ u.ext }}</span>
        <span class="umd__role" :class="`umd__role--${u.role}`">{{ u.role }}</span>
        <span class="umd__status" :class="`umd__status--${u.status}`">
          <span class="umd__dot" />
          {{ statusLabel(u.status) }}
        </span>
      </li>
    </ul>

    <footer class="umd__foot">
      <span>Auth source: <code>pjsip_auths</code> realtime table · endpoints: <code>pjsip_endpoints</code>. Mix of SSO (SAML/OIDC) and local PJSIP secrets; plain passwords are for service extensions only.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Role = 'admin' | 'agent' | 'ext'
type Status = 'online' | 'busy' | 'away' | 'offline'

interface U { id: string; name: string; uri: string; ext: string; role: Role; status: Status; last: string }

const users: U[] = [
  { id: 'alex',    name: 'Alex Rivera',    uri: 'sip:alex@example.com',     ext: '2101', role: 'admin', status: 'online',  last: 'now' },
  { id: 'priya',   name: 'Priya Patel',    uri: 'sip:priya@example.com',    ext: '2102', role: 'agent', status: 'busy',    last: 'in call 6m' },
  { id: 'jordan',  name: 'Jordan Okafor',  uri: 'sip:jordan@example.com',   ext: '2103', role: 'agent', status: 'online',  last: 'now' },
  { id: 'morgan',  name: 'Morgan Lee',     uri: 'sip:morgan@example.com',   ext: '2104', role: 'agent', status: 'away',    last: '12m' },
  { id: 'sam',     name: 'Sam Henriksen',  uri: 'sip:sam@example.com',      ext: '2105', role: 'agent', status: 'offline', last: '3h' },
  { id: 'recept',  name: 'Reception desk', uri: 'sip:reception@example.com',ext: '2201', role: 'ext',   status: 'online',  last: 'now' },
  { id: 'warehouse',name: 'Warehouse phone', uri: 'sip:warehouse@example.com', ext: '2400', role: 'ext', status: 'offline', last: '2d' },
  { id: 'fax',     name: 'Fax gateway',    uri: 'sip:fax@example.com',      ext: '2900', role: 'ext',   status: 'online',  last: 'now' },
]

const query = ref('')
const role = ref<'all' | Role>('all')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return users.filter(u =>
    (role.value === 'all' || u.role === role.value) &&
    (!q || `${u.name} ${u.uri} ${u.ext}`.toLowerCase().includes(q)),
  )
})

const onlineCount = computed(() => users.filter(u => u.status === 'online' || u.status === 'busy').length)

const initials = (n: string) => n.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
const statusLabel = (s: Status) => s === 'online' ? 'online' : s === 'busy' ? 'on call' : s === 'away' ? 'away' : 'offline'
</script>

<style scoped>
.umd {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.85rem;
  color: var(--ink); font-family: var(--sans);
}

.umd__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.umd__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.umd__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.umd__controls { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.umd__search, .umd__select {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-family: var(--mono); font-size: 0.76rem; color: var(--ink);
}
.umd__search { min-width: 12rem; }

.umd__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.umd__row {
  display: grid;
  grid-template-columns: 2.2rem 1fr 4.5rem 4rem 6rem;
  gap: 0.6rem; align-items: center;
  padding: 0.4rem 0.6rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
}
@media (max-width: 640px) {
  .umd__row { grid-template-columns: 2.2rem 1fr; }
  .umd__ext, .umd__role, .umd__status { display: none; }
}

.umd__avatar {
  width: 2.2rem; height: 2.2rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-weight: 700; font-size: 0.72rem; color: var(--accent);
  letter-spacing: 0.02em;
}
.umd__body { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.umd__name { font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.umd__uri { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.umd__ext {
  font-family: var(--mono); font-size: 0.76rem; font-weight: 700; color: var(--accent);
  font-variant-numeric: tabular-nums; text-align: center;
}
.umd__role {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.15rem 0.35rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
  text-align: center;
}
.umd__role--admin { color: var(--accent); border-color: var(--accent); }
.umd__role--agent { color: #15803d; border-color: #15803d; }

.umd__status {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.umd__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.umd__status--online .umd__dot { background: #15803d; }
.umd__status--busy .umd__dot { background: var(--accent); }
.umd__status--away .umd__dot { background: #ca8a04; }
.umd__status--offline .umd__dot { background: #6b5d4a; opacity: 0.4; }

.umd__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.umd__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
