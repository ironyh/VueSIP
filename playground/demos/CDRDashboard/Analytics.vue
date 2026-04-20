<template>
  <div class="cdra">
    <header class="cdra__head">
      <div>
        <span class="cdra__eyebrow">Analytics · last 7 days</span>
        <h3 class="cdra__title">
          {{ totalCalls }} calls · {{ totalMin }} min · ${{ totalCost.toFixed(2) }}
        </h3>
      </div>
    </header>

    <section class="cdra__section">
      <span class="cdra__section-title">Call volume by day</span>
      <div class="cdra__bars" role="img" aria-label="Daily call volume">
        <div v-for="d in volume" :key="d.day" class="cdra__day">
          <div class="cdra__stack">
            <div
              class="cdra__inb"
              :style="{ height: (d.inb / max) * 100 + '%' }"
              :title="`${d.inb} inbound`"
            ></div>
            <div
              class="cdra__out"
              :style="{ height: (d.out / max) * 100 + '%' }"
              :title="`${d.out} outbound`"
            ></div>
          </div>
          <span class="cdra__day-label">{{ d.day }}</span>
          <span class="cdra__day-sum">{{ d.inb + d.out }}</span>
        </div>
      </div>
      <div class="cdra__legend">
        <span><i class="cdra__sw cdra__sw--inb"></i> Inbound</span>
        <span><i class="cdra__sw cdra__sw--out"></i> Outbound</span>
      </div>
    </section>

    <section class="cdra__section">
      <span class="cdra__section-title">Top destinations</span>
      <ul class="cdra__dests" role="list">
        <li v-for="d in destinations" :key="d.prefix" class="cdra__dest">
          <span class="cdra__flag">{{ d.flag }}</span>
          <span class="cdra__name">{{ d.name }}</span>
          <code class="cdra__prefix">{{ d.prefix }}</code>
          <span class="cdra__meter">
            <span
              class="cdra__meter-fill"
              :style="{ width: (d.calls / destinations[0].calls) * 100 + '%' }"
            ></span>
          </span>
          <span class="cdra__calls">{{ d.calls }}</span>
        </li>
      </ul>
    </section>

    <section class="cdra__section">
      <span class="cdra__section-title">Headline metrics</span>
      <div class="cdra__stats">
        <div class="cdra__stat">
          <span class="cdra__k">Avg duration</span>
          <span class="cdra__v">4m 12s</span>
        </div>
        <div class="cdra__stat">
          <span class="cdra__k">Answer rate</span>
          <span class="cdra__v">87.3 %</span>
        </div>
        <div class="cdra__stat">
          <span class="cdra__k">Peak hour</span>
          <span class="cdra__v">14:00 · 48 calls</span>
        </div>
        <div class="cdra__stat">
          <span class="cdra__k">Avg cost/call</span>
          <span class="cdra__v">$0.034</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Day {
  day: string
  inb: number
  out: number
}

const volume: Day[] = [
  { day: 'Mon', inb: 42, out: 61 },
  { day: 'Tue', inb: 55, out: 78 },
  { day: 'Wed', inb: 48, out: 70 },
  { day: 'Thu', inb: 61, out: 88 },
  { day: 'Fri', inb: 57, out: 74 },
  { day: 'Sat', inb: 12, out: 18 },
  { day: 'Sun', inb: 8, out: 10 },
]

const destinations = [
  { name: 'United States', prefix: '+1', flag: 'US', calls: 412 },
  { name: 'United Kingdom', prefix: '+44', flag: 'GB', calls: 184 },
  { name: 'Germany', prefix: '+49', flag: 'DE', calls: 97 },
  { name: 'Australia', prefix: '+61', flag: 'AU', calls: 63 },
  { name: 'France', prefix: '+33', flag: 'FR', calls: 41 },
  { name: 'India', prefix: '+91', flag: 'IN', calls: 28 },
]

const max = computed(() => Math.max(...volume.map((d) => d.inb + d.out)))
const totalCalls = computed(() => volume.reduce((s, d) => s + d.inb + d.out, 0))
const totalMin = computed(() => Math.round(totalCalls.value * 4.2))
const totalCost = computed(() => totalCalls.value * 0.034)
</script>

<style scoped>
.cdra {
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

.cdra__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.cdra__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cdra__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cdra__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.cdra__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.cdra__bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.8rem;
  height: 160px;
}
.cdra__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}
.cdra__stack {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  background: var(--paper-deep);
  border-radius: 2px;
  overflow: hidden;
  align-items: stretch;
  justify-content: flex-end;
}
.cdra__inb,
.cdra__out {
  display: block;
}
.cdra__inb {
  background: var(--accent);
}
.cdra__out {
  background: var(--ink);
}

.cdra__day-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.08em;
}
.cdra__day-sum {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.cdra__legend {
  display: flex;
  gap: 0.8rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.cdra__legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.cdra__sw {
  width: 10px;
  height: 10px;
  display: inline-block;
  border-radius: 2px;
}
.cdra__sw--inb {
  background: var(--accent);
}
.cdra__sw--out {
  background: var(--ink);
}

.cdra__dests {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cdra__dest {
  display: grid;
  grid-template-columns: 2.5rem 1fr 3rem 1fr 3rem;
  gap: 0.5rem;
  align-items: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.8rem;
}
.cdra__flag {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.08em;
}
.cdra__name {
  font-size: 0.88rem;
  font-weight: 500;
}
.cdra__prefix {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.1rem 0.35rem;
  width: fit-content;
}
.cdra__meter {
  background: var(--paper-deep);
  border-radius: 2px;
  height: 8px;
  overflow: hidden;
}
.cdra__meter-fill {
  display: block;
  height: 100%;
  background: var(--accent);
}
.cdra__calls {
  font-family: var(--mono);
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cdra__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.35rem;
}
.cdra__stat {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.cdra__k {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.cdra__v {
  font-family: var(--mono);
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
