<template>
  <div class="tcs">
    <header class="tcs__head">
      <div>
        <span class="tcs__eyebrow">Schedule · America/Los_Angeles</span>
        <h3 class="tcs__title">{{ openHours }} open hours / week</h3>
      </div>
      <span class="tcs__now" :class="`tcs__now--${currentState}`"
        >Now: {{ currentState.toUpperCase() }}</span
      >
    </header>

    <div class="tcs__grid" role="grid" aria-label="Weekly business hours">
      <div class="tcs__hcorner"></div>
      <div v-for="h in hours" :key="h" class="tcs__hhead">{{ h }}</div>
      <template v-for="d in days" :key="d.name">
        <div class="tcs__dhead">{{ d.name }}</div>
        <button
          v-for="h in hours"
          :key="`${d.name}-${h}`"
          type="button"
          class="tcs__cell"
          :class="{ 'tcs__cell--on': d.hours.includes(h) }"
          :aria-label="`${d.name} ${h}:00 — ${d.hours.includes(h) ? 'open' : 'closed'}`"
          @click="toggle(d, h)"
        ></button>
      </template>
    </div>

    <section class="tcs__section">
      <span class="tcs__section-title">Holidays</span>
      <ul class="tcs__holidays" role="list">
        <li v-for="h in holidays" :key="h.date" class="tcs__holiday">
          <span class="tcs__hdate">{{ h.date }}</span>
          <span class="tcs__hname">{{ h.name }}</span>
          <span class="tcs__hrule">{{ h.rule }}</span>
        </li>
      </ul>
    </section>

    <footer class="tcs__foot">
      <span
        >Asterisk: <code>GotoIfTime(09:00-18:00|mon-fri|*|*?open,s,1)</code>. Drop timezone with
        <code>TIMEZONE(office)</code> if your server is UTC.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

interface Day {
  name: string
  hours: number[]
}

const hours = Array.from({ length: 12 }, (_, i) => i + 8)
const defaultBiz = Array.from({ length: 9 }, (_, i) => i + 9)
const days = reactive<Day[]>([
  { name: 'Mon', hours: [...defaultBiz] },
  { name: 'Tue', hours: [...defaultBiz] },
  { name: 'Wed', hours: [...defaultBiz] },
  { name: 'Thu', hours: [...defaultBiz] },
  { name: 'Fri', hours: [...defaultBiz] },
  { name: 'Sat', hours: [10, 11, 12, 13] },
  { name: 'Sun', hours: [] },
])

const holidays = [
  { date: 'Jul 04', name: 'Independence Day', rule: 'closed all day' },
  { date: 'Nov 28', name: 'Thanksgiving', rule: 'closed all day' },
  { date: 'Dec 24', name: 'Christmas Eve', rule: 'close at 12:00' },
  { date: 'Dec 25', name: 'Christmas Day', rule: 'closed all day' },
  { date: 'Jan 01', name: "New Year's Day", rule: 'closed all day' },
]

const openHours = computed(() => days.reduce((s, d) => s + d.hours.length, 0))

const toggle = (d: Day, h: number) => {
  const i = d.hours.indexOf(h)
  if (i >= 0) d.hours.splice(i, 1)
  else d.hours.push(h)
}

const currentState = computed<'open' | 'closed'>(() => {
  const now = new Date()
  const d = days[(now.getDay() + 6) % 7]
  return d?.hours.includes(now.getHours()) ? 'open' : 'closed'
})
</script>

<style scoped>
.tcs {
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
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.tcs__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.tcs__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.tcs__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.tcs__now {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
}
.tcs__now--open {
  background: color-mix(in srgb, #15803d 15%, transparent);
  color: #15803d;
}
.tcs__now--closed {
  background: color-mix(in srgb, #b91c1c 15%, transparent);
  color: #b91c1c;
}

.tcs__grid {
  display: grid;
  grid-template-columns: 3rem repeat(12, 1fr);
  gap: 2px;
  padding: 0.5rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.tcs__hcorner {
}
.tcs__hhead,
.tcs__dhead {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--muted);
  text-align: center;
  padding: 0.2rem 0;
}
.tcs__dhead {
  text-align: left;
  padding-left: 0.25rem;
  display: flex;
  align-items: center;
}
.tcs__cell {
  aspect-ratio: 1 / 1;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
  transition:
    background 0.1s,
    border-color 0.1s;
}
.tcs__cell:hover {
  border-color: var(--accent);
}
.tcs__cell--on {
  background: var(--accent);
  border-color: var(--accent);
}

.tcs__section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.tcs__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.tcs__holidays {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.tcs__holiday {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.8rem;
  display: grid;
  grid-template-columns: 4.5rem 1fr auto;
  gap: 0.6rem;
  align-items: center;
}
.tcs__hdate {
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.tcs__hname {
  font-size: 0.88rem;
}
.tcs__hrule {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.tcs__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.tcs__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
