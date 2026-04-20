<template>
  <div class="sh">
    <header class="sh__head">
      <div>
        <span class="sh__eyebrow">Ops · {{ updated }}</span>
        <h3 class="sh__title">{{ upCount }} / {{ services.length }} services healthy</h3>
      </div>
      <span class="sh__pill" :class="overall === 'ok' ? 'sh__pill--ok' : 'sh__pill--warn'">
        {{ overall === 'ok' ? 'All systems go' : 'Attention needed' }}
      </span>
    </header>

    <ul class="sh__list" role="list">
      <li
        v-for="s in services"
        :key="s.name"
        class="sh__row"
        :class="`sh__row--${s.state}`"
      >
        <div class="sh__row-main">
          <span class="sh__dot" aria-hidden="true" />
          <div class="sh__row-meta">
            <span class="sh__name">{{ s.name }}</span>
            <span class="sh__sub">{{ s.version }} · uptime {{ s.uptime }}</span>
          </div>
        </div>
        <dl class="sh__kv">
          <template v-for="(v, k) in s.stats" :key="k">
            <dt>{{ k }}</dt>
            <dd>{{ v }}</dd>
          </template>
        </dl>
        <span class="sh__state">{{ s.state.toUpperCase() }}</span>
      </li>
    </ul>

    <footer class="sh__foot">
      <span>Sourced from Asterisk AMI (<code>CoreStatus</code>, <code>ModuleShow</code>), Redis <code>INFO</code>, and carrier-OPTIONS heartbeats. Refresh interval: 5 s.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Svc {
  name: string
  version: string
  uptime: string
  state: 'ok' | 'warn' | 'down'
  stats: Record<string, string>
}

const services = ref<Svc[]>([
  { name: 'Asterisk PBX',      version: '20.9.2',  uptime: '14 d 3 h',  state: 'ok',   stats: { 'calls/s': '4.2', 'active': '83', 'cpu': '12%' } },
  { name: 'PJSIP registrar',   version: 'res_pjsip', uptime: '14 d 3 h', state: 'ok',  stats: { 'endpoints': '412', 'reachable': '404', 'qualified': '396' } },
  { name: 'Kamailio edge',     version: '5.8.1',   uptime: '42 d 7 h',  state: 'ok',   stats: { 'tx/s': '118', 'rx/s': '121', 'mem': '210 MB' } },
  { name: 'FreeSWITCH media',  version: '1.10.11', uptime: '6 d 18 h',  state: 'warn', stats: { 'sessions': '64', 'cpu': '74%', 'idle': '26%' } },
  { name: 'Redis (presence)',  version: '7.2.4',   uptime: '31 d 11 h', state: 'ok',   stats: { 'ops/s': '3 412', 'mem': '112 MB', 'keys': '14 804' } },
  { name: 'TURN (coturn)',     version: '4.6.2',   uptime: '28 d 9 h',  state: 'ok',   stats: { 'allocs': '27', 'bw': '12 Mbps', 'relay': '68%' } },
  { name: 'Carrier · Twilio',  version: 'OPTIONS', uptime: '—',         state: 'ok',   stats: { 'rtt': '38 ms', 'last-200': '3 s ago' } },
  { name: 'Carrier · Bandwidth', version: 'OPTIONS', uptime: '—',      state: 'down', stats: { 'rtt': '—', 'last-200': '4 m 12 s ago' } },
])

const upCount = computed(() => services.value.filter((s) => s.state === 'ok').length)
const overall = computed<'ok' | 'warn'>(() => services.value.every((s) => s.state === 'ok') ? 'ok' : 'warn')
const updated = ref(new Date().toLocaleTimeString())
</script>

<style scoped>
.sh {
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

.sh__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.sh__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.sh__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.sh__pill {
  font-family: var(--mono); font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.3rem 0.6rem; border-radius: 2px;
}
.sh__pill--ok { background: color-mix(in srgb, #15803d 14%, transparent); color: #15803d; }
.sh__pill--warn { background: color-mix(in srgb, #d97706 14%, transparent); color: #d97706; }

.sh__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.sh__row {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.85rem;
  display: grid;
  grid-template-columns: minmax(180px, 1.1fr) 2fr auto;
  gap: 0.6rem;
  align-items: center;
}
@media (max-width: 760px) { .sh__row { grid-template-columns: 1fr; } }

.sh__row-main { display: flex; gap: 0.55rem; align-items: center; }
.sh__dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #15803d; flex-shrink: 0;
}
.sh__row--warn .sh__dot { background: #d97706; }
.sh__row--down .sh__dot { background: #b91c1c; box-shadow: 0 0 0 3px color-mix(in srgb, #b91c1c 20%, transparent); }

.sh__row-meta { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.sh__name { font-weight: 600; font-size: 0.92rem; }
.sh__sub { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }

.sh__kv {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.1rem 0.7rem;
  font-family: var(--mono); font-size: 0.7rem;
}
.sh__kv dt { color: var(--muted); }
.sh__kv dd { margin: 0; color: var(--ink); font-variant-numeric: tabular-nums; }

.sh__state {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.12em; color: var(--muted);
  padding: 0.2rem 0.5rem; border: 1px solid var(--rule); border-radius: 2px;
}
.sh__row--warn .sh__state { color: #d97706; border-color: #d97706; }
.sh__row--down .sh__state { color: #b91c1c; border-color: #b91c1c; }

.sh__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.sh__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
