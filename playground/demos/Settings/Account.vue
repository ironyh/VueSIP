<template>
  <div class="sta">
    <header class="sta__head">
      <div>
        <span class="sta__eyebrow">Account · {{ account.email }}</span>
        <h3 class="sta__title">{{ account.name }} · ext {{ account.ext }}</h3>
      </div>
      <span class="sta__badge" :class="`sta__badge--${account.status}`">{{ account.status.toUpperCase() }}</span>
    </header>

    <section class="sta__card">
      <span class="sta__card-title">SIP credentials</span>
      <dl class="sta__kv">
        <div class="sta__kv-row"><dt>SIP URI</dt><dd>{{ account.uri }}</dd></div>
        <div class="sta__kv-row"><dt>Outbound proxy</dt><dd>{{ account.proxy }}</dd></div>
        <div class="sta__kv-row"><dt>Transport</dt><dd>{{ account.transport }}</dd></div>
        <div class="sta__kv-row"><dt>Auth username</dt><dd>{{ account.authUser }}</dd></div>
        <div class="sta__kv-row"><dt>Secret</dt><dd>
          <span class="sta__secret">••••••••••••</span>
          <button type="button" class="sta__btn sta__btn--ghost" @click="resetRequested = true">Reset</button>
        </dd></div>
      </dl>
    </section>

    <section class="sta__card">
      <span class="sta__card-title">Devices · {{ devices.length }} registered</span>
      <ul class="sta__devices" role="list">
        <li v-for="d in devices" :key="d.ua" class="sta__dev">
          <span class="sta__dev-ua">{{ d.ua }}</span>
          <span class="sta__dev-addr">{{ d.addr }}</span>
          <span class="sta__dev-last">last seen {{ d.last }}</span>
          <button type="button" class="sta__btn sta__btn--ghost" @click="revoke(d.ua)">Revoke</button>
        </li>
      </ul>
    </section>

    <section class="sta__card sta__card--danger">
      <span class="sta__card-title">Danger zone</span>
      <div class="sta__danger">
        <div>
          <strong>Sign out everywhere</strong>
          <p>Revokes all registrations and SSO sessions. Users on active calls are not dropped mid-call.</p>
        </div>
        <button type="button" class="sta__btn sta__btn--danger" @click="signoutRequested = true">Sign out all</button>
      </div>
      <div class="sta__danger">
        <div>
          <strong>Delete account</strong>
          <p>Permanent. Voicemail, call history, recordings are tombstoned for 30 days and then purged.</p>
        </div>
        <button type="button" class="sta__btn sta__btn--danger" @click="deleteRequested = true">Delete…</button>
      </div>
    </section>

    <div v-if="resetRequested" class="sta__toast">Secret reset will be emailed to {{ account.email }}.</div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const account = reactive({
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  ext: '2101',
  uri: 'sip:alex@example.com',
  proxy: 'wss://pbx.example.com:8089/ws',
  transport: 'wss (TLS 1.3)',
  authUser: 'alex',
  status: 'active' as 'active' | 'suspended',
})

const devices = ref([
  { ua: 'VueSIP Web · Chrome 129 / macOS',   addr: '10.0.2.14',     last: 'just now' },
  { ua: 'Polycom VVX 450 · firmware 6.4.5',  addr: '10.0.3.112',    last: '2 min ago' },
  { ua: 'VueSIP iOS · 2.8.1',                addr: '198.51.100.22', last: '34 min ago' },
])

const resetRequested = ref(false)
const signoutRequested = ref(false)
const deleteRequested = ref(false)

const revoke = (ua: string) => {
  devices.value = devices.value.filter(d => d.ua !== ua)
}
</script>

<style scoped>
.sta {
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

.sta__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.sta__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.sta__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.sta__badge {
  font-family: var(--mono); font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.5rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.sta__badge--active { color: #15803d; border-color: #15803d; }

.sta__card {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.65rem 0.8rem;
  display: flex; flex-direction: column; gap: 0.4rem;
}
.sta__card-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.sta__card--danger { border-color: color-mix(in srgb, #b91c1c 35%, var(--rule)); }

.sta__kv { margin: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.sta__kv-row {
  display: grid; grid-template-columns: 9rem 1fr;
  gap: 0.5rem; align-items: center;
  padding: 0.3rem 0;
  border-bottom: 1px dashed var(--rule);
}
.sta__kv-row:last-child { border-bottom: 0; }
.sta__kv-row dt { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); letter-spacing: 0.04em; }
.sta__kv-row dd { margin: 0; font-family: var(--mono); font-size: 0.8rem; color: var(--ink); display: flex; align-items: center; gap: 0.5rem; }
.sta__secret { letter-spacing: 0.15em; }

.sta__devices { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.sta__dev {
  display: grid;
  grid-template-columns: 1fr 9rem 8rem auto;
  gap: 0.5rem; align-items: center;
  padding: 0.4rem 0.55rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
}
@media (max-width: 640px) { .sta__dev { grid-template-columns: 1fr auto; } .sta__dev-addr, .sta__dev-last { display: none; } }
.sta__dev-ua { font-size: 0.84rem; }
.sta__dev-addr { font-family: var(--mono); font-size: 0.68rem; color: var(--accent); }
.sta__dev-last { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }

.sta__btn {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.3rem 0.65rem;
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.sta__btn--ghost { background: transparent; color: var(--muted); }
.sta__btn--ghost:hover { color: var(--accent); border-color: var(--accent); }
.sta__btn--danger { color: #b91c1c; border-color: #b91c1c; }
.sta__btn--danger:hover { background: #b91c1c; color: var(--paper); }

.sta__danger {
  display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px dashed var(--rule);
}
.sta__danger:last-child { border-bottom: 0; }
.sta__danger strong { display: block; font-size: 0.88rem; }
.sta__danger p { margin: 0.2rem 0 0; font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }

.sta__toast {
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid var(--accent); border-radius: 2px;
  font-family: var(--mono); font-size: 0.72rem; color: var(--accent);
}
</style>
