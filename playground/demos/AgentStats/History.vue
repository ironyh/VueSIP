<template>
  <div class="ahist">
    <header class="ahist__head">
      <div>
        <span class="ahist__eyebrow">Last 30 days · Alex Rivera</span>
        <h3 class="ahist__title">{{ metric.label }}</h3>
      </div>
      <div class="ahist__picker" role="radiogroup" aria-label="Metric">
        <button
          v-for="m in metrics"
          :key="m.id"
          type="button"
          class="ahist__picker-btn"
          :class="{ 'ahist__picker-btn--on': metricId === m.id }"
          role="radio"
          :aria-checked="metricId === m.id"
          @click="metricId = m.id"
        >
          {{ m.short }}
        </button>
      </div>
    </header>

    <section class="ahist__chart-wrap">
      <svg
        class="ahist__chart"
        :viewBox="`0 0 ${chartW} ${chartH}`"
        preserveAspectRatio="none"
        role="img"
        :aria-label="`${metric.label} trend over 30 days, current ${current}${metric.unit}`"
      >
        <line
          v-for="y in gridLines"
          :key="`g-${y}`"
          :x1="0"
          :x2="chartW"
          :y1="y.y"
          :y2="y.y"
          class="ahist__grid"
        />
        <polyline :points="polyPoints" class="ahist__line" />
        <polyline :points="fillPoints" class="ahist__fill" />
        <circle
          v-for="(p, i) in points"
          :key="`p-${i}`"
          :cx="p.x"
          :cy="p.y"
          r="2.5"
          class="ahist__pt"
          :class="{ 'ahist__pt--last': i === points.length - 1 }"
        />
      </svg>
      <div class="ahist__axis">
        <span>{{ daysAgo(29) }}</span>
        <span>{{ daysAgo(15) }}</span>
        <span>Today</span>
      </div>
    </section>

    <section class="ahist__summary">
      <article class="ahist__stat">
        <span class="ahist__stat-label">Current</span>
        <span class="ahist__stat-value">{{ current }}{{ metric.unit }}</span>
      </article>
      <article class="ahist__stat">
        <span class="ahist__stat-label">30-day avg</span>
        <span class="ahist__stat-value">{{ average.toFixed(1) }}{{ metric.unit }}</span>
      </article>
      <article class="ahist__stat">
        <span class="ahist__stat-label">Best</span>
        <span class="ahist__stat-value">{{ best }}{{ metric.unit }}</span>
      </article>
      <article class="ahist__stat">
        <span class="ahist__stat-label">Worst</span>
        <span class="ahist__stat-value">{{ worst }}{{ metric.unit }}</span>
      </article>
    </section>

    <section class="ahist__rank">
      <span class="ahist__rank-label">Team rank</span>
      <div class="ahist__rank-bar">
        <span class="ahist__rank-fill" :style="{ width: (100 - (rank - 1) * (100 / teamSize)) + '%' }" />
      </div>
      <span class="ahist__rank-value">{{ rank }} / {{ teamSize }}</span>
      <span class="ahist__rank-trend">{{ trendLabel }}</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Metric { id: string; label: string; short: string; unit: string; data: number[] }

const seed = (base: number, spread: number, len = 30, drift = 0) => {
  const out: number[] = []
  let v = base
  for (let i = 0; i < len; i++) {
    v += (Math.sin(i * 1.3) + Math.cos(i * 0.7)) * spread * 0.3
    v += (Math.random() - 0.5) * spread
    v += drift
    out.push(Math.max(0, Math.round(v * 10) / 10))
  }
  return out
}

const metrics: Metric[] = [
  { id: 'calls', label: 'Calls per day', short: 'Calls', unit: '', data: seed(45, 6, 30, 0.2) },
  { id: 'aht', label: 'Avg handle time', short: 'AHT', unit: 's', data: seed(278, 25, 30, -0.5) },
  { id: 'csat', label: 'CSAT', short: 'CSAT', unit: '', data: seed(4.4, 0.3, 30, 0.005) },
  { id: 'fcr', label: 'First-call resolution', short: 'FCR', unit: '%', data: seed(74, 8, 30, 0.1) },
]

const metricId = ref<string>('calls')
const metric = computed(() => metrics.find((m) => m.id === metricId.value)!)

const chartW = 560
const chartH = 120

const points = computed(() => {
  const d = metric.value.data
  const min = Math.min(...d)
  const max = Math.max(...d)
  const range = max - min || 1
  return d.map((v, i) => ({
    x: (i / (d.length - 1)) * chartW,
    y: chartH - 8 - ((v - min) / range) * (chartH - 16),
  }))
})

const polyPoints = computed(() => points.value.map((p) => `${p.x},${p.y}`).join(' '))
const fillPoints = computed(() => {
  const pts = points.value.map((p) => `${p.x},${p.y}`).join(' ')
  return `0,${chartH} ${pts} ${chartW},${chartH}`
})

const gridLines = computed(() =>
  [0.25, 0.5, 0.75].map((f) => ({ y: chartH * f })),
)

const current = computed(() => metric.value.data[metric.value.data.length - 1])
const average = computed(
  () => metric.value.data.reduce((a, b) => a + b, 0) / metric.value.data.length,
)
const best = computed(() => {
  if (metric.value.id === 'aht') return Math.min(...metric.value.data)
  return Math.max(...metric.value.data)
})
const worst = computed(() => {
  if (metric.value.id === 'aht') return Math.max(...metric.value.data)
  return Math.min(...metric.value.data)
})

const teamSize = 18
const rank = computed(() => {
  const v = current.value
  if (metric.value.id === 'aht') return v < 260 ? 3 : v < 280 ? 6 : 11
  return v > 50 ? 2 : v > 45 ? 5 : 9
})

const trendLabel = computed(() => {
  const d = metric.value.data
  const recent = d.slice(-7).reduce((a, b) => a + b, 0) / 7
  const prior = d.slice(-14, -7).reduce((a, b) => a + b, 0) / 7
  const diff = ((recent - prior) / prior) * 100
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}% 7d`
})

const daysAgo = (n: number) => {
  const d = new Date(Date.now() - n * 86400000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.ahist {
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

.ahist__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ahist__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.ahist__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.ahist__picker { display: inline-flex; gap: 0.2rem; }
.ahist__picker-btn {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.65rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.ahist__picker-btn:hover { color: var(--ink); border-color: var(--ink); }
.ahist__picker-btn--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.ahist__chart-wrap {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.7rem 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ahist__chart { width: 100%; height: 120px; display: block; }
.ahist__grid { stroke: var(--rule); stroke-dasharray: 2 3; stroke-width: 1; }
.ahist__line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.ahist__fill {
  fill: color-mix(in srgb, var(--accent) 10%, transparent);
  stroke: none;
}
.ahist__pt { fill: var(--paper); stroke: var(--accent); stroke-width: 1; }
.ahist__pt--last { fill: var(--accent); r: 3.5; }

.ahist__axis {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.ahist__summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}
@media (max-width: 520px) { .ahist__summary { grid-template-columns: repeat(2, 1fr); } }
.ahist__stat {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.ahist__stat-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.ahist__stat-value {
  font-family: var(--mono);
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.ahist__rank {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 0.7rem;
  align-items: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.8rem;
}
.ahist__rank-label {
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.ahist__rank-bar {
  height: 8px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
}
.ahist__rank-fill { display: block; height: 100%; background: var(--accent); transition: width 0.2s; }
.ahist__rank-value {
  font-family: var(--mono);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ahist__rank-trend {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--accent);
  letter-spacing: 0.05em;
}
</style>
