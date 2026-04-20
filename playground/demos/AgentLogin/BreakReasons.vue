<template>
  <div class="abrk">
    <header class="abrk__head">
      <div>
        <span class="abrk__eyebrow">Break reasons</span>
        <h3 class="abrk__title">
          {{ active ? `On ${active.label}` : 'Available' }}
        </h3>
      </div>
      <span class="abrk__timer" :class="{ 'abrk__timer--on': active }">
        {{ formatDuration(elapsed) }}
      </span>
    </header>

    <p v-if="active" class="abrk__notice">
      Paused since {{ formatClock(startedAt) }} ·
      <code>{{ active.code }}</code>
      <span v-if="active.billable"> · billable</span>
    </p>

    <ul class="abrk__grid" role="list">
      <li v-for="r in reasons" :key="r.id">
        <button
          type="button"
          class="abrk__reason"
          :class="{ 'abrk__reason--on': active?.id === r.id }"
          :aria-pressed="active?.id === r.id"
          @click="pick(r.id)"
        >
          <span class="abrk__reason-head">
            <span class="abrk__reason-label">{{ r.label }}</span>
            <span class="abrk__reason-code">{{ r.code }}</span>
          </span>
          <span class="abrk__reason-desc">{{ r.desc }}</span>
          <span v-if="r.cap" class="abrk__reason-cap"> cap · {{ formatDuration(r.cap) }} </span>
        </button>
      </li>
    </ul>

    <footer class="abrk__footer">
      <button type="button" class="abrk__resume" :disabled="!active" @click="resume">Resume</button>
      <span class="abrk__totals">
        <span class="abrk__totals-item">
          <span class="abrk__totals-label">Today</span>
          <span class="abrk__totals-value">{{ formatDuration(dailyTotal) }}</span>
        </span>
        <span class="abrk__totals-item">
          <span class="abrk__totals-label">Breaks</span>
          <span class="abrk__totals-value">{{ history.length }}</span>
        </span>
      </span>
    </footer>

    <section v-if="history.length" class="abrk__history">
      <span class="abrk__section-title">Recent</span>
      <ul class="abrk__history-list" role="list">
        <li v-for="h in history.slice(0, 4)" :key="h.id" class="abrk__history-row">
          <span class="abrk__history-code">{{ h.code }}</span>
          <span class="abrk__history-label">{{ h.label }}</span>
          <span class="abrk__history-dur">{{ formatDuration(h.duration) }}</span>
          <span class="abrk__history-clock">{{ formatClock(h.endedAt) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

interface Reason {
  id: string
  label: string
  code: string
  desc: string
  cap?: number
  billable?: boolean
}

const reasons: Reason[] = [
  { id: 'lunch', label: 'Lunch', code: 'PAUSE · 01', desc: 'Scheduled midday meal.', cap: 1800 },
  {
    id: 'break',
    label: 'Short break',
    code: 'PAUSE · 02',
    desc: 'Ten-minute micro-break.',
    cap: 600,
  },
  {
    id: 'training',
    label: 'Training',
    code: 'PAUSE · 03',
    desc: 'Coaching or e-learning.',
    billable: true,
  },
  {
    id: 'meeting',
    label: 'Meeting',
    code: 'PAUSE · 04',
    desc: 'Team huddle or 1:1.',
    billable: true,
  },
  { id: 'bathroom', label: 'Bio', code: 'PAUSE · 05', desc: 'Not logged in detail.' },
  {
    id: 'acw',
    label: 'After-call work',
    code: 'PAUSE · 06',
    desc: 'Notes, CRM updates, dispositions.',
    billable: true,
  },
]

interface HistoryEntry {
  id: number
  label: string
  code: string
  duration: number
  endedAt: number
}

const active = ref<Reason | null>(null)
const startedAt = ref<number>(0)
const elapsed = ref(0)
const history = ref<HistoryEntry[]>([
  {
    id: 1,
    label: 'Short break',
    code: 'PAUSE · 02',
    duration: 420,
    endedAt: Date.now() - 2.4 * 3600_000,
  },
  { id: 2, label: 'Lunch', code: 'PAUSE · 01', duration: 1740, endedAt: Date.now() - 4 * 3600_000 },
  {
    id: 3,
    label: 'Training',
    code: 'PAUSE · 03',
    duration: 1800,
    endedAt: Date.now() - 6 * 3600_000,
  },
])
let nextId = 4
let timer: ReturnType<typeof setInterval> | null = null

const pick = (id: string) => {
  if (active.value?.id === id) {
    resume()
    return
  }
  commit()
  const r = reasons.find((x) => x.id === id)
  if (!r) return
  active.value = r
  startedAt.value = Date.now()
  elapsed.value = 0
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt.value) / 1000)
  }, 1000)
}

const commit = () => {
  if (!active.value) return
  history.value.unshift({
    id: nextId++,
    label: active.value.label,
    code: active.value.code,
    duration: elapsed.value,
    endedAt: Date.now(),
  })
}

const resume = () => {
  commit()
  active.value = null
  elapsed.value = 0
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const dailyTotal = computed(() => {
  const historical = history.value.reduce((sum, h) => sum + h.duration, 0)
  return historical + (active.value ? elapsed.value : 0)
})

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
const formatClock = (t: number) => {
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.abrk {
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

.abrk__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}
.abrk__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.abrk__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.abrk__timer {
  font-family: var(--mono);
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  font-weight: 600;
}
.abrk__timer--on {
  color: var(--accent);
}

.abrk__notice {
  margin: 0;
  padding: 0.55rem 0.75rem;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid var(--accent);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink);
}
.abrk__notice code {
  background: var(--paper);
  padding: 0 0.3rem;
  border-radius: 2px;
  color: var(--accent);
}

.abrk__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.4rem;
}

.abrk__reason {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: left;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: all 0.12s;
  font-family: var(--sans);
  color: var(--ink);
}
.abrk__reason:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.abrk__reason--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

.abrk__reason-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.4rem;
}
.abrk__reason-label {
  font-weight: 600;
  font-size: 0.88rem;
}
.abrk__reason-code {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}
.abrk__reason-desc {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  line-height: 1.35;
}
.abrk__reason-cap {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.abrk__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--rule);
  flex-wrap: wrap;
}
.abrk__resume {
  background: var(--accent);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.55rem 1rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.abrk__resume:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: var(--rule);
}

.abrk__totals {
  display: inline-flex;
  gap: 1.2rem;
}
.abrk__totals-item {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  align-items: flex-end;
}
.abrk__totals-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.abrk__totals-value {
  font-family: var(--mono);
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--ink);
}

.abrk__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.abrk__history-list {
  list-style: none;
  padding: 0;
  margin: 0.35rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.abrk__history-row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 0.6rem;
  align-items: center;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-variant-numeric: tabular-nums;
}
.abrk__history-code {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}
.abrk__history-label {
  font-size: 0.82rem;
}
.abrk__history-dur {
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 600;
}
.abrk__history-clock {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
}
</style>
