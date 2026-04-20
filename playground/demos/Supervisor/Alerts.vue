<template>
  <div class="salr">
    <header class="salr__head">
      <div>
        <span class="salr__eyebrow">Queue alerts</span>
        <h3 class="salr__title">
          {{ openAlerts.length }} open · {{ criticalCount }} critical
        </h3>
      </div>
      <label class="salr__mute">
        <input type="checkbox" v-model="muted" />
        <span>Mute</span>
      </label>
    </header>

    <section class="salr__thresholds">
      <span class="salr__section-title">Thresholds</span>
      <div class="salr__thr-grid">
        <label class="salr__thr">
          <span class="salr__thr-label">Wait alert</span>
          <input type="number" v-model.number="thresholds.wait" class="salr__thr-input" min="10" max="600" />
          <span class="salr__thr-unit">sec</span>
        </label>
        <label class="salr__thr">
          <span class="salr__thr-label">SLA floor</span>
          <input type="number" v-model.number="thresholds.sla" class="salr__thr-input" min="40" max="100" />
          <span class="salr__thr-unit">%</span>
        </label>
        <label class="salr__thr">
          <span class="salr__thr-label">Abandon rate</span>
          <input type="number" v-model.number="thresholds.abandon" class="salr__thr-input" min="1" max="50" />
          <span class="salr__thr-unit">%</span>
        </label>
        <label class="salr__thr">
          <span class="salr__thr-label">Long call</span>
          <input type="number" v-model.number="thresholds.callLength" class="salr__thr-input" min="60" max="1800" />
          <span class="salr__thr-unit">sec</span>
        </label>
      </div>
    </section>

    <ul class="salr__list" role="list">
      <li
        v-for="a in sortedAlerts"
        :key="a.id"
        class="salr__row"
        :class="[`salr__row--${a.severity}`, { 'salr__row--ack': a.acked }]"
      >
        <div class="salr__row-kind">
          <span class="salr__severity">{{ a.severity }}</span>
          <span class="salr__kind">{{ a.kind }}</span>
        </div>
        <div class="salr__row-body">
          <p class="salr__msg">{{ a.message }}</p>
          <p class="salr__detail">
            <span>queue · <strong>{{ a.queue }}</strong></span>
            <span class="salr__sep" aria-hidden="true">·</span>
            <span>fired {{ ago(a.firedAt) }}</span>
            <span v-if="a.count > 1">
              <span class="salr__sep" aria-hidden="true">·</span>
              <span>×{{ a.count }}</span>
            </span>
          </p>
        </div>
        <div class="salr__row-tools">
          <button
            v-if="!a.acked"
            type="button"
            class="salr__ack"
            @click="ack(a.id)"
          >
            Ack
          </button>
          <span v-else class="salr__acked">Acked</span>
          <button
            type="button"
            class="salr__clear"
            :aria-label="`Dismiss ${a.kind} alert`"
            @click="clear(a.id)"
          >
            ×
          </button>
        </div>
      </li>
      <li v-if="!alerts.length" class="salr__empty">
        Quiet. Everything within thresholds.
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

type Severity = 'critical' | 'warning' | 'info'
interface Alert {
  id: number
  severity: Severity
  kind: string
  queue: string
  message: string
  firedAt: number
  count: number
  acked: boolean
}

const thresholds = reactive({
  wait: 120,
  sla: 80,
  abandon: 8,
  callLength: 600,
})

const muted = ref(false)

const alerts = ref<Alert[]>([
  {
    id: 1,
    severity: 'critical',
    kind: 'SLA breach',
    queue: 'sales',
    message: 'Service level dropped to 58% (target 80%).',
    firedAt: Date.now() - 4 * 60 * 1000,
    count: 1,
    acked: false,
  },
  {
    id: 2,
    severity: 'critical',
    kind: 'long wait',
    queue: 'sales',
    message: 'Caller Priya Shah has been waiting 3:03.',
    firedAt: Date.now() - 90 * 1000,
    count: 1,
    acked: false,
  },
  {
    id: 3,
    severity: 'warning',
    kind: 'abandon rate',
    queue: 'tier-2',
    message: '11% abandonment in the last 15 minutes.',
    firedAt: Date.now() - 12 * 60 * 1000,
    count: 3,
    acked: true,
  },
  {
    id: 4,
    severity: 'warning',
    kind: 'long call',
    queue: 'escalations',
    message: 'Devon Ibarra has been on a call for 12:14.',
    firedAt: Date.now() - 2 * 60 * 1000,
    count: 1,
    acked: false,
  },
  {
    id: 5,
    severity: 'info',
    kind: 'no agents',
    queue: 'tier-2',
    message: 'All 4 tier-2 agents are on call or paused.',
    firedAt: Date.now() - 20 * 60 * 1000,
    count: 2,
    acked: true,
  },
])
let nextId = 6

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    alerts.value = [...alerts.value]
  }, 10000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const sevRank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 }

const sortedAlerts = computed(() =>
  [...alerts.value].sort((a, b) => {
    if (a.acked !== b.acked) return a.acked ? 1 : -1
    if (sevRank[a.severity] !== sevRank[b.severity]) return sevRank[a.severity] - sevRank[b.severity]
    return b.firedAt - a.firedAt
  }),
)

const openAlerts = computed(() => alerts.value.filter((a) => !a.acked))
const criticalCount = computed(() => openAlerts.value.filter((a) => a.severity === 'critical').length)

const ack = (id: number) => {
  const a = alerts.value.find((x) => x.id === id)
  if (a) a.acked = true
}
const clear = (id: number) => {
  alerts.value = alerts.value.filter((a) => a.id !== id)
}

// keep nextId in scope to avoid warnings
void nextId

const ago = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`
}
</script>

<style scoped>
.salr {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --warn: #b45309;
  --crit: #a41d08;
  --info: #2563eb;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.salr__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.salr__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.salr__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.salr__mute {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.salr__mute input { accent-color: var(--accent); }

.salr__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.salr__thr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.35rem;
  margin-top: 0.35rem;
}
.salr__thr {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.salr__thr-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  flex: 1;
}
.salr__thr-input {
  width: 4.2rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.25rem 0.35rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  text-align: right;
}
.salr__thr-input:focus { outline: none; border-color: var(--accent); }
.salr__thr-unit {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.salr__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.salr__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  transition: opacity 0.15s;
}
.salr__row--critical { border-left-color: var(--crit); }
.salr__row--warning { border-left-color: var(--warn); }
.salr__row--info { border-left-color: var(--info); }
.salr__row--ack { opacity: 0.55; }

.salr__row-kind {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 90px;
}
.salr__severity {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.salr__row--critical .salr__severity { color: var(--crit); }
.salr__row--warning .salr__severity { color: var(--warn); }
.salr__row--info .salr__severity { color: var(--info); }
.salr__kind {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ink);
}

.salr__row-body { min-width: 0; }
.salr__msg {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.35;
  color: var(--ink);
}
.salr__detail {
  margin: 0.2rem 0 0;
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}
.salr__detail strong { color: var(--accent); font-weight: 700; }
.salr__sep { opacity: 0.5; margin: 0 0.25rem; }

.salr__row-tools {
  display: inline-flex;
  gap: 0.2rem;
  align-items: center;
}
.salr__ack {
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.salr__ack:hover { background: var(--accent); }
.salr__acked {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0.35rem 0.6rem;
}
.salr__clear {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.1rem 0.45rem;
  font-family: var(--mono);
  font-size: 1rem;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
}
.salr__clear:hover { color: var(--crit); border-color: var(--crit); }

.salr__empty {
  padding: 1.3rem;
  text-align: center;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.74rem;
  color: var(--muted);
}
</style>
