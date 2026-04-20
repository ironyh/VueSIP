<template>
  <div class="shl">
    <header class="shl__head">
      <div>
        <span class="shl__eyebrow">Incidents · last 24 h</span>
        <h3 class="shl__title">{{ open.length }} open · {{ events.length - open.length }} resolved</h3>
      </div>
      <div class="shl__filter" role="radiogroup" aria-label="Filter">
        <button
          v-for="f in filters"
          :key="f"
          type="button"
          class="shl__f"
          :class="{ 'shl__f--on': filter === f }"
          role="radio"
          :aria-checked="filter === f"
          @click="filter = f"
        >{{ f }}</button>
      </div>
    </header>

    <ol class="shl__events" role="list">
      <li
        v-for="e in filtered"
        :key="e.id"
        class="shl__event"
        :class="`shl__event--${e.severity}`"
      >
        <div class="shl__time">
          <span class="shl__stamp">{{ e.time }}</span>
          <span class="shl__dur">{{ e.duration }}</span>
        </div>
        <div class="shl__body">
          <div class="shl__head-row">
            <span class="shl__svc">{{ e.service }}</span>
            <span class="shl__sev">{{ e.severity.toUpperCase() }}</span>
            <span class="shl__status" :class="`shl__status--${e.status}`">{{ e.status }}</span>
          </div>
          <p class="shl__msg">{{ e.message }}</p>
          <p v-if="e.action" class="shl__action">
            <span class="shl__action-k">Auto-recovery:</span> {{ e.action }}
          </p>
        </div>
      </li>
    </ol>

    <footer class="shl__foot">
      <span>Fed by Asterisk <code>UserEvent</code> + carrier OPTIONS timeouts. Auto-recovery actions are logged as diary entries; manual interventions carry the operator's username.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Incident {
  id: string
  time: string
  duration: string
  service: string
  severity: 'info' | 'warn' | 'crit'
  status: 'open' | 'resolved'
  message: string
  action?: string
}

const events: Incident[] = [
  { id: 'e-204', time: '14:32', duration: '—',       service: 'Bandwidth.com trunk', severity: 'crit', status: 'open',     message: 'OPTIONS timeout — 3 consecutive 408s. Route failing over.', action: 'Trunk priority lowered; traffic shifted to Twilio.' },
  { id: 'e-203', time: '13:58', duration: '2 m 11 s', service: 'FreeSWITCH media',   severity: 'warn', status: 'resolved', message: 'CPU over 80% for 2 min · 14 concurrent video sessions.', action: 'Codec negotiation preferring VP8 over AV1 on new sessions.' },
  { id: 'e-202', time: '11:07', duration: '43 s',    service: 'Redis (presence)',    severity: 'warn', status: 'resolved', message: 'Latency to replica > 250 ms · failover considered.' },
  { id: 'e-201', time: '09:12', duration: '1 m 4 s', service: 'Kamailio edge',       severity: 'info', status: 'resolved', message: 'Reloaded dialplan — 412 endpoints re-registered cleanly.' },
  { id: 'e-199', time: '04:41', duration: '6 s',     service: 'PJSIP registrar',     severity: 'info', status: 'resolved', message: 'Qualify sweep finished · 396 / 412 reachable.' },
  { id: 'e-198', time: '02:15', duration: '11 m',    service: 'TURN (coturn)',       severity: 'warn', status: 'resolved', message: 'Relay allocations exceeded 90% of quota.', action: 'Quota raised to 150; paged on-call to review.' },
]

const filters = ['All', 'Open', 'Critical'] as const
type Filter = typeof filters[number]
const filter = ref<Filter>('All')

const filtered = computed(() =>
  events.filter((e) => {
    if (filter.value === 'Open') return e.status === 'open'
    if (filter.value === 'Critical') return e.severity === 'crit'
    return true
  })
)
const open = computed(() => events.filter((e) => e.status === 'open'))
</script>

<style scoped>
.shl {
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

.shl__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.shl__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.shl__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.shl__filter { display: inline-flex; gap: 0.2rem; }
.shl__f {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted); cursor: pointer;
  letter-spacing: 0.05em;
}
.shl__f--on { color: var(--paper); background: var(--accent); border-color: var(--accent); }

.shl__events { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.shl__event {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 0.7rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  border-left: 3px solid var(--rule);
  padding: 0.6rem 0.8rem;
}
.shl__event--warn { border-left-color: #d97706; }
.shl__event--crit { border-left-color: #b91c1c; }

.shl__time { display: flex; flex-direction: column; gap: 0.1rem; }
.shl__stamp {
  font-family: var(--mono); font-size: 0.82rem; font-weight: 700; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.shl__dur {
  font-family: var(--mono); font-size: 0.64rem; color: var(--muted);
}

.shl__body { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; }
.shl__head-row { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.shl__svc { font-weight: 600; font-size: 0.9rem; }
.shl__sev {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.12em;
  padding: 0.1rem 0.4rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule);
  color: var(--muted);
}
.shl__event--warn .shl__sev { color: #d97706; border-color: #d97706; }
.shl__event--crit .shl__sev { color: #b91c1c; border-color: #b91c1c; }

.shl__status {
  font-family: var(--mono); font-size: 0.6rem;
  letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.1rem 0.35rem; border-radius: 2px;
}
.shl__status--open { background: color-mix(in srgb, #b91c1c 15%, transparent); color: #b91c1c; }
.shl__status--resolved { background: color-mix(in srgb, var(--muted) 12%, transparent); color: var(--muted); }

.shl__msg { margin: 0; font-size: 0.85rem; line-height: 1.4; color: var(--ink); }
.shl__action {
  margin: 0;
  font-family: var(--mono); font-size: 0.74rem; color: var(--muted);
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.3rem 0.5rem; margin-top: 0.2rem;
}
.shl__action-k { color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }

.shl__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.shl__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
