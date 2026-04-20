<template>
  <div class="astat">
    <header class="astat__head">
      <div>
        <span class="astat__eyebrow">Today · {{ agent.name }}</span>
        <h3 class="astat__title">{{ agent.extension }} · {{ agent.uri }}</h3>
      </div>
      <span class="astat__session">
        <span class="astat__session-label">Shift</span>
        <span class="astat__session-val">{{ formatDuration(shiftSeconds) }}</span>
      </span>
    </header>

    <section class="astat__kpis">
      <article v-for="k in kpis" :key="k.id" class="astat__kpi">
        <span class="astat__kpi-label">{{ k.label }}</span>
        <span class="astat__kpi-value">{{ k.value }}</span>
        <span class="astat__kpi-unit">{{ k.unit }}</span>
        <span
          v-if="k.trend !== undefined"
          class="astat__kpi-trend"
          :class="k.trend >= 0 ? 'astat__kpi-trend--up' : 'astat__kpi-trend--down'"
        >
          {{ k.trend >= 0 ? '+' : '' }}{{ k.trend }}% vs yday
        </span>
      </article>
    </section>

    <section class="astat__split">
      <span class="astat__section-title">Time split · logged-in {{ formatDuration(shiftSeconds) }}</span>
      <div class="astat__bar" role="img" :aria-label="`Talk ${pct(talk)}%, hold ${pct(hold)}%, wrap ${pct(wrap)}%, idle ${pct(idle)}%`">
        <span class="astat__seg astat__seg--talk" :style="{ width: pct(talk) + '%' }" />
        <span class="astat__seg astat__seg--hold" :style="{ width: pct(hold) + '%' }" />
        <span class="astat__seg astat__seg--wrap" :style="{ width: pct(wrap) + '%' }" />
        <span class="astat__seg astat__seg--idle" :style="{ width: pct(idle) + '%' }" />
      </div>
      <ul class="astat__legend" role="list">
        <li><span class="astat__dot astat__dot--talk" />Talk · {{ formatDuration(talk) }}</li>
        <li><span class="astat__dot astat__dot--hold" />Hold · {{ formatDuration(hold) }}</li>
        <li><span class="astat__dot astat__dot--wrap" />Wrap · {{ formatDuration(wrap) }}</li>
        <li><span class="astat__dot astat__dot--idle" />Idle · {{ formatDuration(idle) }}</li>
      </ul>
    </section>

    <section class="astat__adherence">
      <span class="astat__section-title">Adherence · today</span>
      <div class="astat__bar astat__bar--thin">
        <span class="astat__seg astat__seg--adh" :style="{ width: adherence + '%' }" />
      </div>
      <div class="astat__adh-row">
        <span class="astat__adh-value">{{ adherence }}%</span>
        <span class="astat__adh-hint" :class="adherence >= 90 ? 'astat__adh-hint--good' : adherence >= 80 ? 'astat__adh-hint--warn' : 'astat__adh-hint--bad'">
          {{ adherenceLabel }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const agent = {
  name: 'Alex Rivera',
  extension: '1042',
  uri: 'sip:alex@switchboard.example',
}

const shiftSeconds = ref(5 * 3600 + 42 * 60)
const talk = ref(2 * 3600 + 18 * 60)
const hold = ref(14 * 60 + 20)
const wrap = ref(42 * 60)
const idle = ref(shiftSeconds.value - talk.value - hold.value - wrap.value)
const adherence = ref(92)

const kpis = computed(() => [
  { id: 'calls', label: 'Calls handled', value: '47', unit: 'today', trend: 12 },
  { id: 'aht', label: 'Avg handle', value: '4:38', unit: 'mm:ss', trend: -3 },
  { id: 'fcr', label: 'First-call res', value: '78', unit: '%', trend: 5 },
  { id: 'csat', label: 'CSAT', value: '4.6', unit: '/5', trend: 2 },
  { id: 'occ', label: 'Occupancy', value: '81', unit: '%', trend: 1 },
  { id: 'abn', label: 'Abandoned', value: '3', unit: 'today', trend: -18 },
])

const pct = (s: number) => Math.round((s / shiftSeconds.value) * 100)

const adherenceLabel = computed(() => {
  if (adherence.value >= 95) return 'on schedule'
  if (adherence.value >= 90) return 'within target'
  if (adherence.value >= 80) return 'trailing'
  return 'off schedule'
})

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}
</script>

<style scoped>
.astat {
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
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}

.astat__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.astat__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.astat__title {
  margin: 0.1rem 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: var(--mono);
}
.astat__session { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; }
.astat__session-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.astat__session-val {
  font-family: var(--mono);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--accent);
}

.astat__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.4rem;
}
.astat__kpi {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.astat__kpi-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.astat__kpi-value {
  font-family: var(--mono);
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ink);
  line-height: 1;
}
.astat__kpi-unit {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.astat__kpi-trend {
  margin-top: 0.2rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}
.astat__kpi-trend--up { color: #2f855a; }
.astat__kpi-trend--down { color: var(--accent); }

.astat__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.astat__split { display: flex; flex-direction: column; gap: 0.35rem; }
.astat__bar {
  width: 100%;
  height: 18px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  display: flex;
  overflow: hidden;
}
.astat__bar--thin { height: 10px; }
.astat__seg { display: block; height: 100%; transition: width 0.2s; }
.astat__seg--talk { background: var(--accent); }
.astat__seg--hold { background: color-mix(in srgb, var(--accent) 55%, var(--paper-deep)); }
.astat__seg--wrap { background: color-mix(in srgb, var(--accent) 30%, var(--paper-deep)); }
.astat__seg--idle { background: var(--rule); }
.astat__seg--adh { background: var(--accent); }

.astat__legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.astat__legend li { display: inline-flex; align-items: center; gap: 0.35rem; }
.astat__dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.astat__dot--talk { background: var(--accent); }
.astat__dot--hold { background: color-mix(in srgb, var(--accent) 55%, var(--paper-deep)); }
.astat__dot--wrap { background: color-mix(in srgb, var(--accent) 30%, var(--paper-deep)); }
.astat__dot--idle { background: var(--rule); }

.astat__adherence { display: flex; flex-direction: column; gap: 0.35rem; }
.astat__adh-row { display: flex; align-items: baseline; justify-content: space-between; }
.astat__adh-value {
  font-family: var(--mono);
  font-size: 1.3rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.astat__adh-hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.astat__adh-hint--good { color: #2f855a; }
.astat__adh-hint--warn { color: var(--accent); }
.astat__adh-hint--bad { color: #a41d08; }
</style>
