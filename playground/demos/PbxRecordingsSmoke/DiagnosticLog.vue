<template>
  <div class="dlog">
    <header class="dlog__head">
      <div>
        <span class="dlog__eyebrow">Smoke-test history</span>
        <h3 class="dlog__title">
          {{ runs.length }} runs · pass rate {{ passRate }}% · p95 {{ p95 }}ms
        </h3>
      </div>
      <div class="dlog__filters" role="radiogroup" aria-label="Filter by result">
        <button
          v-for="f in filterOptions"
          :key="f.id"
          type="button"
          class="dlog__filter"
          :class="{ 'dlog__filter--on': filter === f.id }"
          role="radio"
          :aria-checked="filter === f.id"
          @click="filter = f.id"
        >
          {{ f.label }} <span class="dlog__filter-count">{{ f.count }}</span>
        </button>
      </div>
    </header>

    <section class="dlog__chart" aria-label="Recent pass/fail timeline">
      <span class="dlog__chart-title">Last {{ runs.length }} runs (left = oldest)</span>
      <div class="dlog__bars">
        <span
          v-for="r in runs.slice().reverse()"
          :key="r.id"
          class="dlog__bar"
          :class="`dlog__bar--${r.result}`"
          :style="{ height: (r.totalMs / maxMs) * 100 + '%' }"
          :title="`${r.stamp} · ${r.result} · ${r.totalMs}ms`"
        ></span>
      </div>
      <div class="dlog__bars-axis">
        <span>{{ runs.length }} runs ago</span>
        <span>now</span>
      </div>
    </section>

    <ul class="dlog__list" role="list">
      <li v-for="r in filtered" :key="r.id" class="dlog__run" :class="`dlog__run--${r.result}`">
        <button
          type="button"
          class="dlog__run-head"
          :aria-expanded="expanded === r.id"
          @click="expanded = expanded === r.id ? null : r.id"
        >
          <span class="dlog__run-badge" :class="`dlog__run-badge--${r.result}`">{{
            r.result === 'pass' ? 'PASS' : 'FAIL'
          }}</span>
          <code class="dlog__run-id">run-{{ r.id }}</code>
          <span class="dlog__run-stamp">{{ r.stamp }}</span>
          <span class="dlog__run-duration">{{ r.totalMs }} ms</span>
          <span class="dlog__run-chevron" aria-hidden="true">{{
            expanded === r.id ? '▾' : '▸'
          }}</span>
        </button>
        <div v-if="expanded === r.id" class="dlog__run-body">
          <p v-if="r.summary" class="dlog__run-summary">{{ r.summary }}</p>
          <ol class="dlog__step-list">
            <li v-for="(s, i) in r.steps" :key="i" class="dlog__step">
              <span class="dlog__step-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="dlog__step-icon" :class="`dlog__step-icon--${s.state}`">{{
                s.state === 'pass' ? '✓' : s.state === 'fail' ? '✗' : '·'
              }}</span>
              <span class="dlog__step-name">{{ s.name }}</span>
              <code class="dlog__step-time">{{ s.ms }} ms</code>
            </li>
          </ol>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface StepLog {
  name: string
  state: 'pass' | 'fail' | 'skipped'
  ms: number
}
interface RunLog {
  id: string
  stamp: string
  result: 'pass' | 'fail'
  totalMs: number
  summary?: string
  steps: StepLog[]
}

const baseSteps: Omit<StepLog, 'ms' | 'state'>[] = [
  { name: 'AMI connection' },
  { name: 'Test call origination' },
  { name: 'Answered state' },
  { name: 'MixMonitor started' },
  { name: 'Clean hangup' },
  { name: 'Recording file on disk' },
  { name: 'File format check' },
  { name: 'Cleanup' },
]

const genRun = (i: number, failAt: number | null): RunLog => {
  const steps: StepLog[] = baseSteps.map((s, idx) => {
    if (failAt !== null && idx > failAt) return { ...s, state: 'skipped', ms: 0 }
    if (failAt !== null && idx === failAt)
      return { ...s, state: 'fail', ms: 250 + Math.floor(Math.random() * 400) }
    return { ...s, state: 'pass', ms: 150 + Math.floor(Math.random() * 500) }
  })
  const totalMs = steps.reduce((a, s) => a + s.ms, 0)
  return {
    id: Math.random().toString(36).slice(2, 8),
    stamp: new Date(Date.now() - i * 3600_000 * (0.7 + Math.random() * 0.6))
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19),
    result: failAt === null ? 'pass' : 'fail',
    totalMs,
    summary: failAt !== null ? failSummary(failAt) : undefined,
    steps,
  }
}

const failSummary = (idx: number): string => {
  const map: Record<number, string> = {
    0: 'AMI login rejected — credentials rotated last Tuesday. Update bot-credential secret in the vault.',
    1: 'Originate returned Response: Error (Extension does not exist in context smoke).',
    3: 'No MixMonitorStart event within 3 s — dialplan missing recording line after last Asterisk upgrade.',
    5: 'Expected file in /var/spool/asterisk/monitor/smoke/ — none found after 2 s. Disk 96% full, writes failing.',
    6: 'File exists but duration is 0 ms (header-only WAV). Likely codec negotiation issue on test trunk.',
  }
  return map[idx] ?? 'Step failed — check PBX logs'
}

const runs = ref<RunLog[]>([
  genRun(0, null),
  genRun(1, null),
  genRun(2, null),
  genRun(3, 5),
  genRun(4, null),
  genRun(5, null),
  genRun(6, null),
  genRun(7, 6),
  genRun(8, null),
  genRun(9, null),
  genRun(10, null),
  genRun(11, null),
  genRun(13, 3),
  genRun(14, null),
  genRun(15, null),
])

const passCount = computed(() => runs.value.filter((r) => r.result === 'pass').length)
const failCount = computed(() => runs.value.filter((r) => r.result === 'fail').length)
const passRate = computed(() => Math.round((passCount.value / runs.value.length) * 100))
const p95 = computed(() => {
  const sorted = runs.value.map((r) => r.totalMs).sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.95)] ?? 0
})
const maxMs = computed(() => Math.max(...runs.value.map((r) => r.totalMs), 1))

const filterOptions = computed(() => [
  { id: 'all' as const, label: 'All', count: runs.value.length },
  { id: 'pass' as const, label: 'Pass', count: passCount.value },
  { id: 'fail' as const, label: 'Fail', count: failCount.value },
])
const filter = ref<'all' | 'pass' | 'fail'>('all')
const filtered = computed(() =>
  filter.value === 'all' ? runs.value : runs.value.filter((r) => r.result === filter.value)
)

const expanded = ref<string | null>(runs.value.find((r) => r.result === 'fail')?.id ?? null)
</script>

<style scoped>
.dlog {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --pass: #047857;
  --fail: #b91c1c;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.dlog__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.dlog__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.dlog__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.dlog__filters {
  display: inline-flex;
  gap: 0.25rem;
}
.dlog__filter {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
}
.dlog__filter:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.dlog__filter--on {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.dlog__filter-count {
  font-size: 0.6rem;
  padding: 0.05rem 0.3rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 20%, transparent);
  font-variant-numeric: tabular-nums;
}
.dlog__filter--on .dlog__filter-count {
  background: var(--accent);
  color: var(--paper);
}

.dlog__chart {
  padding: 0.7rem 0.85rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.dlog__chart-title {
  display: block;
  margin-bottom: 0.4rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.dlog__bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 3.5rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid var(--rule);
}
.dlog__bar {
  flex: 1;
  min-height: 10%;
  background: var(--pass);
  border-radius: 1px;
  transition: opacity 0.15s;
}
.dlog__bar:hover {
  opacity: 0.7;
}
.dlog__bar--fail {
  background: var(--fail);
}
.dlog__bars-axis {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 0.58rem;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-top: 0.3rem;
}

.dlog__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.dlog__run {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
}
.dlog__run--fail {
  border-left: 3px solid var(--fail);
}
.dlog__run--pass {
  border-left: 3px solid var(--pass);
}

.dlog__run-head {
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  gap: 0.6rem;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.7rem;
  background: transparent;
  border: 0;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.dlog__run-head:hover {
  background: var(--paper-deep);
}
.dlog__run-badge {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  border: 1px solid currentColor;
}
.dlog__run-badge--pass {
  color: var(--pass);
  background: color-mix(in srgb, var(--pass) 10%, transparent);
}
.dlog__run-badge--fail {
  color: var(--fail);
  background: color-mix(in srgb, var(--fail) 10%, transparent);
}
.dlog__run-id {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--accent);
}
.dlog__run-stamp {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.dlog__run-duration {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.dlog__run-chevron {
  color: var(--muted);
  font-size: 0.75rem;
}

.dlog__run-body {
  padding: 0.5rem 0.9rem 0.8rem;
  border-top: 1px solid var(--rule);
  background: var(--paper-deep);
}
.dlog__run-summary {
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  line-height: 1.5;
  padding: 0.5rem 0.7rem;
  background: color-mix(in srgb, var(--fail) 6%, var(--paper));
  border-left: 2px solid var(--fail);
  border-radius: 0 2px 2px 0;
}

.dlog__step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.dlog__step {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  font-family: var(--mono);
  font-size: 0.72rem;
  padding: 0.2rem 0.35rem;
}
.dlog__step-num {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.dlog__step-icon {
  display: inline-grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  font-weight: 700;
}
.dlog__step-icon--pass {
  color: var(--pass);
}
.dlog__step-icon--fail {
  color: var(--fail);
}
.dlog__step-icon--skipped {
  color: var(--muted);
  opacity: 0.5;
}
.dlog__step-name {
  color: var(--ink);
}
.dlog__step-time {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
</style>
