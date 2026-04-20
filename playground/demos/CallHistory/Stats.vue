<template>
  <div class="stats-demo">
    <div class="stats-demo__head">
      <div>
        <span class="stats-demo__eyebrow">Past {{ rangeLabel }}</span>
        <h3 class="stats-demo__title">Call statistics</h3>
      </div>
      <div class="stats-demo__range" role="radiogroup" aria-label="Range">
        <button
          v-for="r in ranges"
          :key="r.id"
          type="button"
          class="stats-demo__range-btn"
          :class="{ 'stats-demo__range-btn--on': range === r.id }"
          role="radio"
          :aria-checked="range === r.id"
          @click="range = r.id"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <!-- Top row: aggregate numbers -->
    <ul class="stats-demo__kpis" role="list">
      <li class="stats-demo__kpi">
        <span class="stats-demo__kpi-label">Total calls</span>
        <span class="stats-demo__kpi-value">{{ totals.total }}</span>
        <span class="stats-demo__kpi-sub"
          >{{ totals.answered }} answered · {{ totals.missed }} missed</span
        >
      </li>
      <li class="stats-demo__kpi">
        <span class="stats-demo__kpi-label">Talk time</span>
        <span class="stats-demo__kpi-value">{{ formatHMS(totals.totalDuration) }}</span>
        <span class="stats-demo__kpi-sub">avg {{ formatMS(totals.avgDuration) }} per call</span>
      </li>
      <li class="stats-demo__kpi">
        <span class="stats-demo__kpi-label">Answer rate</span>
        <span class="stats-demo__kpi-value">
          {{ totals.total === 0 ? '—' : `${Math.round((totals.answered / totals.total) * 100)}%` }}
        </span>
        <span class="stats-demo__kpi-sub">
          {{ totals.incoming }} in · {{ totals.outgoing }} out
        </span>
      </li>
    </ul>

    <!-- Hour-of-day histogram -->
    <section class="stats-demo__block">
      <header class="stats-demo__block-head">
        <span class="stats-demo__block-eyebrow">By hour of day</span>
        <span class="stats-demo__block-caption">peak: {{ peakHour }}:00</span>
      </header>
      <div
        class="stats-demo__histogram"
        role="img"
        :aria-label="`Call volume by hour, peak at ${peakHour}:00`"
      >
        <div
          v-for="(count, h) in hourCounts"
          :key="h"
          class="stats-demo__bar-cell"
          :class="{ 'stats-demo__bar-cell--peak': h === peakHour }"
        >
          <div
            class="stats-demo__bar"
            :style="{ height: `${maxHour === 0 ? 0 : (count / maxHour) * 100}%` }"
            :title="`${h}:00 — ${count} calls`"
            :aria-hidden="true"
          ></div>
        </div>
      </div>
      <div class="stats-demo__hour-axis" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </section>

    <!-- Top callers -->
    <section class="stats-demo__block">
      <header class="stats-demo__block-head">
        <span class="stats-demo__block-eyebrow">Top callers</span>
        <span class="stats-demo__block-caption"
          >top {{ topCallers.length }} of {{ uniqueCallers }}</span
        >
      </header>
      <ul class="stats-demo__ranking" role="list">
        <li v-for="(row, i) in topCallers" :key="row.uri" class="stats-demo__ranking-row">
          <span class="stats-demo__ranking-rank">{{ i + 1 }}</span>
          <div class="stats-demo__ranking-body">
            <div class="stats-demo__ranking-head">
              <span class="stats-demo__ranking-name">{{ row.name }}</span>
              <span class="stats-demo__ranking-count"
                >{{ row.count }} {{ row.count === 1 ? 'call' : 'calls' }}</span
              >
            </div>
            <div class="stats-demo__ranking-bar">
              <span
                class="stats-demo__ranking-fill"
                :style="{ width: `${(row.count / topCallers[0].count) * 100}%` }"
              ></span>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Direction split -->
    <section class="stats-demo__block">
      <header class="stats-demo__block-head">
        <span class="stats-demo__block-eyebrow">Direction split</span>
      </header>
      <div
        class="stats-demo__split"
        role="img"
        :aria-label="`${totals.incoming} incoming, ${totals.outgoing} outgoing`"
      >
        <span class="stats-demo__split-in" :style="{ flex: totals.incoming || 0.01 }">
          <span class="stats-demo__split-label">In</span>
          <span class="stats-demo__split-value">{{ totals.incoming }}</span>
        </span>
        <span class="stats-demo__split-out" :style="{ flex: totals.outgoing || 0.01 }">
          <span class="stats-demo__split-label">Out</span>
          <span class="stats-demo__split-value">{{ totals.outgoing }}</span>
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type Direction = 'incoming' | 'outgoing'
type Kind = 'answered' | 'missed'

interface Call {
  name: string
  uri: string
  at: number
  direction: Direction
  kind: Kind
  duration: number
}

const now = Date.now()
// Deterministic pseudo-random generator — avoids flicker between renders
const mulberry32 = (seed: number) => {
  let t = seed
  return () => {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const contactsPool: { name: string; uri: string; weight: number }[] = [
  { name: 'Alex Rivera', uri: 'sip:alex@example.com', weight: 5 },
  { name: 'Front desk', uri: 'sip:100@pbx.example.com', weight: 4 },
  { name: 'Priya Shah', uri: 'sip:priya@example.com', weight: 3 },
  { name: 'Sales team', uri: 'sip:200@pbx.example.com', weight: 3 },
  { name: 'Support on-call', uri: 'sip:911@pbx.example.com', weight: 2 },
  { name: 'Mei Chen', uri: 'sip:mei@example.com', weight: 2 },
  { name: 'Unknown', uri: 'sip:+4670005551234@pstn.example.com', weight: 2 },
  { name: 'Voicemail', uri: 'sip:*97@pbx.example.com', weight: 1 },
]
const weightTotal = contactsPool.reduce((a, c) => a + c.weight, 0)

const generateCalls = (days: number): Call[] => {
  const rand = mulberry32(days * 97 + 11)
  const out: Call[] = []
  const count = Math.floor(days * 6 + rand() * days * 4)
  for (let i = 0; i < count; i++) {
    let target = rand() * weightTotal
    let contact = contactsPool[0]
    for (const c of contactsPool) {
      target -= c.weight
      if (target <= 0) {
        contact = c
        break
      }
    }
    const hoursAgo = rand() * days * 24
    // Skew hours toward 9–17
    const biasedHour = Math.floor((8 + rand() * 10 + rand() * 4) % 24)
    const ts = now - hoursAgo * 60 * 60 * 1000
    const d = new Date(ts)
    d.setHours(biasedHour, Math.floor(rand() * 60), 0, 0)
    const direction: Direction = rand() < 0.55 ? 'outgoing' : 'incoming'
    const missed = direction === 'incoming' && rand() < 0.18
    const duration = missed ? 0 : Math.floor(30 + rand() * 900)
    out.push({
      name: contact.name,
      uri: contact.uri,
      at: d.getTime(),
      direction,
      kind: missed ? 'missed' : 'answered',
      duration,
    })
  }
  return out
}

type RangeId = '7' | '30' | '90'
const ranges: { id: RangeId; label: string }[] = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
]
const range = ref<RangeId>('30')

const filteredCalls = computed<Call[]>(() => generateCalls(parseInt(range.value, 10)))

const rangeLabel = computed(() => ranges.find((r) => r.id === range.value)!.label)

const totals = computed(() => {
  const calls = filteredCalls.value
  const answered = calls.filter((c) => c.kind === 'answered').length
  const missed = calls.filter((c) => c.kind === 'missed').length
  const incoming = calls.filter((c) => c.direction === 'incoming').length
  const outgoing = calls.filter((c) => c.direction === 'outgoing').length
  const totalDuration = calls.reduce((a, c) => a + c.duration, 0)
  const avgDuration = answered === 0 ? 0 : Math.round(totalDuration / answered)
  return { total: calls.length, answered, missed, incoming, outgoing, totalDuration, avgDuration }
})

const hourCounts = computed(() => {
  const buckets = Array(24).fill(0)
  for (const c of filteredCalls.value) {
    const h = new Date(c.at).getHours()
    buckets[h] += 1
  }
  return buckets
})
const maxHour = computed(() => Math.max(...hourCounts.value, 0))
const peakHour = computed(() => hourCounts.value.indexOf(maxHour.value))

const topCallers = computed(() => {
  const bucket = new Map<string, { name: string; uri: string; count: number }>()
  for (const c of filteredCalls.value) {
    const existing = bucket.get(c.uri)
    if (existing) existing.count += 1
    else bucket.set(c.uri, { name: c.name, uri: c.uri, count: 1 })
  }
  return [...bucket.values()].sort((a, b) => b.count - a.count).slice(0, 5)
})
const uniqueCallers = computed(() => new Set(filteredCalls.value.map((c) => c.uri)).size)

const formatHMS = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
const formatMS = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r}s`
  return `${m}:${r.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.stats-demo {
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

.stats-demo__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.stats-demo__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.stats-demo__title {
  margin: 0.1rem 0 0 0;
  font-size: 1.05rem;
  font-weight: 600;
}
.stats-demo__range {
  display: inline-flex;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 2px;
  gap: 2px;
}
.stats-demo__range-btn {
  background: transparent;
  color: var(--muted);
  border: 0;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.12s;
}
.stats-demo__range-btn:hover {
  color: var(--ink);
}
.stats-demo__range-btn--on {
  background: var(--ink);
  color: var(--paper);
}

.stats-demo__kpis {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
.stats-demo__kpi {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.85rem 1rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.stats-demo__kpi-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.stats-demo__kpi-value {
  font-family: var(--mono);
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--ink);
}
.stats-demo__kpi-sub {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.stats-demo__block {
  padding: 0.85rem 1rem 1rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.stats-demo__block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}
.stats-demo__block-eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.stats-demo__block-caption {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.stats-demo__histogram {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
  height: 88px;
  align-items: end;
}
.stats-demo__bar-cell {
  height: 100%;
  display: flex;
  align-items: flex-end;
}
.stats-demo__bar {
  width: 100%;
  background: color-mix(in srgb, var(--ink) 55%, transparent);
  border-radius: 1px 1px 0 0;
  transition: height 0.2s;
  min-height: 2px;
}
.stats-demo__bar-cell--peak .stats-demo__bar {
  background: var(--accent);
}
.stats-demo__hour-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 0.2rem;
  font-family: var(--mono);
  font-size: 0.58rem;
  color: var(--muted);
  letter-spacing: 0.08em;
}

.stats-demo__ranking {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.stats-demo__ranking-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: center;
}
.stats-demo__ranking-rank {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--muted);
  width: 1.2rem;
  text-align: right;
}
.stats-demo__ranking-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}
.stats-demo__ranking-name {
  font-size: 0.82rem;
  font-weight: 600;
}
.stats-demo__ranking-count {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.stats-demo__ranking-bar {
  position: relative;
  height: 6px;
  background: var(--paper-deep);
  border-radius: 1px;
  overflow: hidden;
}
.stats-demo__ranking-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--accent);
  transition: width 0.25s;
}

.stats-demo__split {
  display: flex;
  gap: 2px;
  height: 44px;
  border-radius: 2px;
  overflow: hidden;
}
.stats-demo__split-in,
.stats-demo__split-out {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.75rem;
  min-width: 0;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.stats-demo__split-in {
  background: var(--ink);
  color: var(--paper);
}
.stats-demo__split-out {
  background: var(--accent);
  color: var(--paper);
}
.stats-demo__split-label {
  opacity: 0.75;
}
.stats-demo__split-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 560px) {
  .stats-demo__kpis {
    grid-template-columns: 1fr;
  }
}
</style>
