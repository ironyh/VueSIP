<template>
  <div class="qmon">
    <header class="qmon__head">
      <div>
        <span class="qmon__eyebrow">Queue board</span>
        <h3 class="qmon__title">
          {{ queues.length }} queues · {{ totalWaiting }} waiting
        </h3>
      </div>
      <label class="qmon__refresh">
        <input type="checkbox" v-model="autoRefresh" />
        <span>Live</span>
        <span class="qmon__dot" :class="{ 'qmon__dot--on': autoRefresh }" />
      </label>
    </header>

    <div class="qmon__grid" role="list">
      <article
        v-for="q in queues"
        :key="q.name"
        class="qmon__row"
        :class="{ 'qmon__row--warn': q.sla < 80, 'qmon__row--crit': q.sla < 60 }"
        role="listitem"
      >
        <header class="qmon__row-head">
          <span class="qmon__name">{{ q.name }}</span>
          <span class="qmon__strategy">{{ q.strategy }}</span>
        </header>

        <dl class="qmon__stats">
          <div class="qmon__stat">
            <dt>Waiting</dt>
            <dd class="qmon__stat-big" :class="{ 'qmon__stat-big--alert': q.waiting > 5 }">
              {{ q.waiting }}
            </dd>
          </div>
          <div class="qmon__stat">
            <dt>Active</dt>
            <dd class="qmon__stat-big">{{ q.active }}</dd>
          </div>
          <div class="qmon__stat">
            <dt>Avg wait</dt>
            <dd>{{ formatDuration(q.avgWait) }}</dd>
          </div>
          <div class="qmon__stat">
            <dt>Longest</dt>
            <dd :class="{ 'qmon__stat--alert': q.longestWait > 120 }">
              {{ formatDuration(q.longestWait) }}
            </dd>
          </div>
        </dl>

        <footer class="qmon__row-footer">
          <span class="qmon__agents">
            <span class="qmon__agents-on">{{ q.agentsReady }}</span>
            /
            <span class="qmon__agents-total">{{ q.agentsTotal }}</span>
            ready
          </span>
          <div class="qmon__sla">
            <span class="qmon__sla-bar" aria-hidden="true">
              <span
                class="qmon__sla-fill"
                :class="{
                  'qmon__sla-fill--warn': q.sla < 80,
                  'qmon__sla-fill--crit': q.sla < 60,
                }"
                :style="{ width: q.sla + '%' }"
              />
            </span>
            <span class="qmon__sla-value">SL {{ q.sla }}%</span>
          </div>
        </footer>
      </article>
    </div>

    <aside class="qmon__foot">
      <span class="qmon__foot-item">
        <span class="qmon__foot-label">Target SL</span>
        <span class="qmon__foot-value">80 / 20</span>
        <span class="qmon__foot-hint">80% answered within 20s</span>
      </span>
      <span class="qmon__foot-item">
        <span class="qmon__foot-label">Updated</span>
        <span class="qmon__foot-value">{{ lastRefresh }}</span>
      </span>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface Queue {
  name: string
  strategy: string
  waiting: number
  active: number
  avgWait: number
  longestWait: number
  agentsReady: number
  agentsTotal: number
  sla: number
}

const queues = ref<Queue[]>([
  { name: 'support', strategy: 'ringall', waiting: 2, active: 4, avgWait: 18, longestWait: 42, agentsReady: 5, agentsTotal: 12, sla: 92 },
  { name: 'sales', strategy: 'leastrecent', waiting: 7, active: 3, avgWait: 94, longestWait: 186, agentsReady: 1, agentsTotal: 8, sla: 58 },
  { name: 'billing', strategy: 'linear', waiting: 0, active: 2, avgWait: 0, longestWait: 0, agentsReady: 2, agentsTotal: 4, sla: 97 },
  { name: 'escalations', strategy: 'wrandom', waiting: 1, active: 1, avgWait: 34, longestWait: 34, agentsReady: 2, agentsTotal: 3, sla: 85 },
  { name: 'tier-2', strategy: 'leastrecent', waiting: 3, active: 2, avgWait: 62, longestWait: 112, agentsReady: 0, agentsTotal: 4, sla: 72 },
  { name: 'overflow', strategy: 'ringall', waiting: 0, active: 0, avgWait: 0, longestWait: 0, agentsReady: 4, agentsTotal: 6, sla: 100 },
])

const autoRefresh = ref(true)
const lastRefresh = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const tick = () => {
  if (!autoRefresh.value) return
  queues.value = queues.value.map((q) => {
    const delta = Math.round((Math.random() - 0.45) * 2)
    const waiting = Math.max(0, q.waiting + delta)
    const longestWait = waiting ? Math.max(q.longestWait + 2, q.avgWait + 5) : 0
    const avgWait = waiting ? Math.max(0, q.avgWait + Math.round((Math.random() - 0.4) * 4)) : 0
    const slaDelta = Math.round((Math.random() - 0.5) * 3)
    return {
      ...q,
      waiting,
      active: Math.max(0, q.active + (Math.random() < 0.3 ? 1 : -1 + Math.round(Math.random()))),
      avgWait,
      longestWait,
      sla: Math.max(40, Math.min(100, q.sla + slaDelta)),
    }
  })
  lastRefresh.value = new Date().toLocaleTimeString([], { hour12: false })
}

onMounted(() => {
  lastRefresh.value = new Date().toLocaleTimeString([], { hour12: false })
  timer = setInterval(tick, 3000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const totalWaiting = computed(() => queues.value.reduce((s, q) => s + q.waiting, 0))

const formatDuration = (s: number) => {
  if (s === 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}
</script>

<style scoped>
.qmon {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --warn: #b45309;
  --crit: #a41d08;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.qmon__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.qmon__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.qmon__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.qmon__refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.qmon__refresh input { accent-color: var(--accent); }
.qmon__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.qmon__dot--on { background: var(--accent); animation: qmon-pulse 1.4s ease-in-out infinite; }
@keyframes qmon-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.qmon__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.4rem;
}

.qmon__row {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: border-color 0.12s;
}
.qmon__row--warn { border-color: var(--warn); }
.qmon__row--crit { border-color: var(--crit); background: color-mix(in srgb, var(--crit) 4%, var(--paper)); }

.qmon__row-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.qmon__name { font-weight: 600; font-size: 0.95rem; }
.qmon__strategy {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.qmon__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.45rem;
  margin: 0;
}
.qmon__stat { display: flex; flex-direction: column; gap: 0.1rem; margin: 0; }
.qmon__stat dt {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.qmon__stat dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.88rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.qmon__stat--alert dd, .qmon__stat--alert { color: var(--crit); }
.qmon__stat-big {
  margin: 0;
  font-family: var(--mono);
  font-size: 1.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.qmon__stat-big--alert { color: var(--crit); }

.qmon__row-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  padding-top: 0.35rem;
  border-top: 1px dashed var(--rule);
  flex-wrap: wrap;
}
.qmon__agents {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}
.qmon__agents-on { color: var(--accent); font-weight: 600; }
.qmon__agents-total { color: var(--ink); font-weight: 600; }

.qmon__sla { display: inline-flex; align-items: center; gap: 0.4rem; }
.qmon__sla-bar {
  width: 64px;
  height: 6px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
  display: inline-block;
}
.qmon__sla-fill { display: block; height: 100%; background: var(--accent); transition: width 0.3s; }
.qmon__sla-fill--warn { background: var(--warn); }
.qmon__sla-fill--crit { background: var(--crit); }
.qmon__sla-value {
  font-family: var(--mono);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.qmon__foot {
  display: flex;
  gap: 1.2rem;
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  flex-wrap: wrap;
}
.qmon__foot-item {
  display: inline-flex;
  flex-direction: column;
  gap: 0.1rem;
}
.qmon__foot-label {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.qmon__foot-value {
  font-family: var(--mono);
  font-size: 0.82rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.qmon__foot-hint {
  font-family: var(--mono);
  font-size: 0.6rem;
  color: var(--muted);
}
</style>
