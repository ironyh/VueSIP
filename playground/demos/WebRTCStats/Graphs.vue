<template>
  <div class="wsg">
    <header class="wsg__head">
      <div>
        <span class="wsg__eyebrow">Time-series · 60 s window</span>
        <h3 class="wsg__title">Live sparklines</h3>
      </div>
      <span class="wsg__sample">{{ samples }} samples</span>
    </header>

    <div class="wsg__grid">
      <article v-for="s in series" :key="s.id" class="wsg__card">
        <header class="wsg__card-head">
          <span class="wsg__k">{{ s.label }}</span>
          <span class="wsg__v" :class="`wsg__v--${tier(s)}`">
            {{ s.values[s.values.length - 1].toFixed(s.decimals) }}
            <span class="wsg__u">{{ s.unit }}</span>
          </span>
        </header>
        <svg class="wsg__chart" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            :points="pathFor(s.values, s.min, s.max)"
            fill="none"
            :stroke="
              tier(s) === 'ok' ? 'var(--accent)' : tier(s) === 'warn' ? '#d97706' : '#b91c1c'
            "
            stroke-width="1.4"
            vector-effect="non-scaling-stroke"
          />
        </svg>
        <footer class="wsg__card-foot">
          <span>min {{ Math.min(...s.values).toFixed(s.decimals) }}</span>
          <span>p95 {{ p95(s.values).toFixed(s.decimals) }}</span>
          <span>max {{ Math.max(...s.values).toFixed(s.decimals) }}</span>
        </footer>
      </article>
    </div>

    <footer class="wsg__foot">
      <span
        >All metrics extracted from <code>remote-inbound-rtp</code> and <code>candidate-pair</code>.
        Store raw samples for at least 5 min if you want p95 to stabilise.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

interface Series {
  id: string
  label: string
  unit: string
  decimals: number
  min: number
  max: number
  warn: number
  bad: number
  values: number[]
}

const samples = ref(60)

const initSeries = (): Series[] => [
  {
    id: 'rtt',
    label: 'RTT',
    unit: 'ms',
    decimals: 0,
    min: 0,
    max: 400,
    warn: 150,
    bad: 300,
    values: noisy(80, 25, 60),
  },
  {
    id: 'jitter',
    label: 'Jitter (peer)',
    unit: 'ms',
    decimals: 1,
    min: 0,
    max: 100,
    warn: 30,
    bad: 60,
    values: noisy(14, 8, 60),
  },
  {
    id: 'loss',
    label: 'Packet loss',
    unit: '%',
    decimals: 2,
    min: 0,
    max: 10,
    warn: 1,
    bad: 3,
    values: noisy(0.3, 0.4, 60).map((v) => Math.max(0, v)),
  },
  {
    id: 'bitrate',
    label: 'Bitrate (out)',
    unit: 'kbps',
    decimals: 0,
    min: 0,
    max: 80,
    warn: 1e9,
    bad: 1e9,
    values: noisy(48, 6, 60),
  },
  {
    id: 'fps',
    label: 'Frames / s',
    unit: 'fps',
    decimals: 0,
    min: 0,
    max: 40,
    warn: 20,
    bad: 10,
    values: noisy(28, 3, 60),
  },
  {
    id: 'nack',
    label: 'NACK count',
    unit: '/s',
    decimals: 0,
    min: 0,
    max: 20,
    warn: 5,
    bad: 10,
    values: noisy(1, 2, 60).map((v) => Math.max(0, v)),
  },
]

const series = ref<Series[]>(initSeries())

function noisy(base: number, swing: number, n: number): number[] {
  return Array.from({ length: n }, () => Math.max(0, base + (Math.random() - 0.5) * swing))
}

const tick = window.setInterval(() => {
  series.value = series.value.map((s) => {
    const last = s.values[s.values.length - 1]
    const nextRaw = last + (Math.random() - 0.5) * (s.max / 20)
    const next = Math.max(0, Math.min(s.max, nextRaw))
    return { ...s, values: [...s.values.slice(1), next] }
  })
}, 1000)
onBeforeUnmount(() => window.clearInterval(tick))

const pathFor = (vals: number[], min: number, max: number) => {
  const w = 120 / (vals.length - 1)
  const range = max - min || 1
  return vals
    .map((v, i) => {
      const x = i * w
      const y = 36 - ((v - min) / range) * 34 - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const tier = (s: Series): 'ok' | 'warn' | 'bad' => {
  const v = s.values[s.values.length - 1]
  if (s.id === 'fps') return v < s.bad ? 'bad' : v < s.warn ? 'warn' : 'ok'
  return v >= s.bad ? 'bad' : v >= s.warn ? 'warn' : 'ok'
}

const p95 = (vals: number[]) => {
  const sorted = [...vals].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.95)]
}
</script>

<style scoped>
.wsg {
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
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.wsg__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.wsg__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.wsg__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.wsg__sample {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.wsg__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.45rem;
}
.wsg__card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.wsg__card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.wsg__k {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.wsg__v {
  font-family: var(--mono);
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.wsg__v--warn {
  color: #d97706;
}
.wsg__v--bad {
  color: #b91c1c;
}
.wsg__u {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--muted);
  font-weight: 400;
  margin-left: 0.15rem;
}

.wsg__chart {
  width: 100%;
  height: 40px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}

.wsg__card-foot {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.wsg__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.wsg__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
