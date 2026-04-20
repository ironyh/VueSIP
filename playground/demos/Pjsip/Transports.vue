<template>
  <div class="pjt">
    <header class="pjt__head">
      <div>
        <span class="pjt__eyebrow">pjsip show transports</span>
        <h3 class="pjt__title">{{ transports.length }} transports · {{ active }} listening</h3>
      </div>
      <span class="pjt__refresh">last refresh · {{ lastRefresh }}</span>
    </header>

    <ul class="pjt__list" role="list">
      <li v-for="t in transports" :key="t.id" class="pjt__row" :class="{ 'pjt__row--down': t.state === 'down' }">
        <div class="pjt__col">
          <span class="pjt__id">{{ t.id }}</span>
          <span class="pjt__proto" :class="`pjt__proto--${t.proto}`">{{ t.proto.toUpperCase() }}</span>
        </div>
        <div class="pjt__col pjt__col--grow">
          <span class="pjt__bind">bind {{ t.bind }}</span>
          <span class="pjt__external">external {{ t.external || '—' }}</span>
        </div>
        <div class="pjt__col">
          <span class="pjt__stat">{{ t.contacts }} contacts</span>
          <span class="pjt__stat">{{ t.rps }} req/s</span>
        </div>
        <span class="pjt__state" :class="`pjt__state--${t.state}`">{{ t.state }}</span>
      </li>
    </ul>

    <section class="pjt__card">
      <span class="pjt__card-title">transport [transport-wss] · detail</span>
      <pre class="pjt__code">[transport-wss]
type = transport
protocol = wss
bind = 0.0.0.0:8089
cert_file = /etc/asterisk/keys/pbx.crt
priv_key_file = /etc/asterisk/keys/pbx.key
method = tlsv1_2
allow_reload = yes
external_media_address = {{ external }}
external_signaling_address = {{ external }}
</pre>
    </section>

    <footer class="pjt__foot">
      <span>WebSocket transports (<code>ws</code>/<code>wss</code>) must come after TCP/UDP in <code>pjsip.conf</code> load order, or the registrar binds to the wrong family. Check with <code>pjsip show transports</code>.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type Proto = 'wss' | 'tls' | 'tcp' | 'udp'

interface T {
  id: string
  proto: Proto
  bind: string
  external: string
  contacts: number
  rps: number
  state: 'up' | 'down' | 'degraded'
}

const transports = ref<T[]>([
  { id: 'transport-wss', proto: 'wss', bind: '0.0.0.0:8089',    external: 'pbx.example.com:8089', contacts: 164, rps: 18, state: 'up' },
  { id: 'transport-tls', proto: 'tls', bind: '0.0.0.0:5061',    external: 'pbx.example.com:5061', contacts: 42,  rps: 4,  state: 'up' },
  { id: 'transport-tcp', proto: 'tcp', bind: '10.0.1.5:5060',   external: '',                     contacts: 11,  rps: 1,  state: 'degraded' },
  { id: 'transport-udp', proto: 'udp', bind: '10.0.1.5:5060',   external: '',                     contacts: 0,   rps: 0,  state: 'down' },
])

const external = 'pbx.example.com:8089'

const active = computed(() => transports.value.filter(t => t.state === 'up').length)

const lastRefresh = ref('just now')

const timer = window.setInterval(() => {
  transports.value.forEach(t => {
    if (t.state !== 'up') return
    t.rps = Math.max(0, t.rps + Math.floor(Math.random() * 5) - 2)
    t.contacts = Math.max(0, t.contacts + Math.floor(Math.random() * 3) - 1)
  })
  lastRefresh.value = 'just now'
}, 2000)
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.pjt {
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

.pjt__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.pjt__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.pjt__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.pjt__refresh { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }

.pjt__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.pjt__row {
  display: grid;
  grid-template-columns: 10rem 1fr 9rem 5rem;
  gap: 0.5rem; align-items: center;
  padding: 0.5rem 0.7rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
}
@media (max-width: 700px) { .pjt__row { grid-template-columns: 1fr auto; } .pjt__col:nth-child(3) { display: none; } }
.pjt__row--down { opacity: 0.6; border-color: #b91c1c; }

.pjt__col { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.pjt__col--grow { min-width: 0; }
.pjt__id { font-family: var(--mono); font-weight: 700; font-size: 0.82rem; color: var(--accent); }
.pjt__proto {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.1rem 0.35rem; border-radius: 2px; width: fit-content;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.pjt__proto--wss, .pjt__proto--tls { color: #15803d; border-color: #15803d; }
.pjt__proto--tcp, .pjt__proto--udp { color: var(--muted); }

.pjt__bind { font-family: var(--mono); font-size: 0.76rem; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pjt__external { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.pjt__stat { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); font-variant-numeric: tabular-nums; }

.pjt__state {
  font-family: var(--mono); font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.2rem 0.5rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule);
  color: var(--muted); text-align: center;
}
.pjt__state--up { color: #15803d; border-color: #15803d; }
.pjt__state--degraded { color: #ca8a04; border-color: #ca8a04; }
.pjt__state--down { color: #b91c1c; border-color: #b91c1c; }

.pjt__card {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem 0.8rem;
  display: flex; flex-direction: column; gap: 0.35rem;
}
.pjt__card-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.pjt__code {
  margin: 0;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.75rem;
  font-family: var(--mono); font-size: 0.72rem; line-height: 1.5; color: var(--ink);
  overflow-x: auto; white-space: pre;
}

.pjt__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.pjt__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
