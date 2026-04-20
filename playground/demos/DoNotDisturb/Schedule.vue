<template>
  <div class="sched">
    <div class="sched__now" aria-live="polite">
      <span class="sched__now-label">Now</span>
      <span class="sched__now-time">{{ nowLabel }}</span>
      <span class="sched__now-state" :class="{ 'sched__now-state--on': activeWindow }">
        {{ activeWindow ? `DND: ${activeWindow.label}` : 'Calls ringing' }}
      </span>
    </div>

    <ul class="sched__list">
      <li v-for="(w, idx) in windows" :key="w.id" class="sched__item">
        <span
          class="sched__item-dot"
          :class="{ 'sched__item-dot--on': w.enabled }"
          aria-hidden="true"
        ></span>
        <div class="sched__item-body">
          <div class="sched__item-head">
            <input
              class="sched__item-title"
              type="text"
              v-model="w.label"
              :aria-label="`Label for window ${idx + 1}`"
            />
            <label class="sched__item-toggle">
              <input type="checkbox" v-model="w.enabled" />
              <span>{{ w.enabled ? 'On' : 'Off' }}</span>
            </label>
          </div>
          <div class="sched__item-times">
            <label>
              <span class="sched__item-caption">From</span>
              <input type="time" v-model="w.from" />
            </label>
            <label>
              <span class="sched__item-caption">To</span>
              <input type="time" v-model="w.to" />
            </label>
          </div>
          <div class="sched__item-days" role="group" :aria-label="`Days for ${w.label}`">
            <button
              v-for="(d, di) in dayLabels"
              :key="di"
              type="button"
              class="sched__day"
              :class="{ 'sched__day--on': w.days.includes(di) }"
              @click="toggleDay(w, di)"
              :aria-pressed="w.days.includes(di)"
            >
              {{ d }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="sched__remove"
          @click="remove(w.id)"
          aria-label="Remove window"
        >
          ×
        </button>
      </li>
    </ul>

    <button type="button" class="sched__add" @click="addWindow">+ Add schedule window</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'

interface Window {
  id: number
  label: string
  from: string
  to: string
  days: number[]
  enabled: boolean
}

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

let nextId = 3
const windows = reactive<Window[]>([
  {
    id: 1,
    label: 'Deep work block',
    from: '09:00',
    to: '12:00',
    days: [0, 1, 2, 3, 4],
    enabled: true,
  },
  {
    id: 2,
    label: 'After hours',
    from: '18:00',
    to: '08:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    enabled: true,
  },
])

const now = ref(new Date())
const tick = window.setInterval(() => {
  now.value = new Date()
}, 30_000)
onBeforeUnmount(() => clearInterval(tick))

const nowLabel = computed(() =>
  now.value.toLocaleTimeString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
)

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10))
  return (h || 0) * 60 + (m || 0)
}
const minutesNow = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const dayNow = computed(() => (now.value.getDay() + 6) % 7) // mon=0

const activeWindow = computed<Window | undefined>(() => {
  const m = minutesNow.value
  const d = dayNow.value
  return windows.find((w) => {
    if (!w.enabled || !w.days.includes(d)) return false
    const from = toMinutes(w.from)
    const to = toMinutes(w.to)
    if (from <= to) return m >= from && m < to
    return m >= from || m < to
  })
})

const toggleDay = (w: Window, d: number) => {
  const i = w.days.indexOf(d)
  if (i >= 0) w.days.splice(i, 1)
  else w.days.push(d)
}

const addWindow = () => {
  windows.push({
    id: nextId++,
    label: 'New window',
    from: '12:00',
    to: '13:00',
    days: [0, 1, 2, 3, 4],
    enabled: true,
  })
}
const remove = (id: number) => {
  const i = windows.findIndex((w) => w.id === id)
  if (i >= 0) windows.splice(i, 1)
}
</script>

<style scoped>
.sched {
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
  gap: 0.75rem;
  color: var(--ink);
  font-family: var(--sans);
}

.sched__now {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  padding: 0.65rem 0.9rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
}
.sched__now-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--paper) 60%, transparent);
}
.sched__now-time {
  font-family: var(--mono);
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--paper);
}
.sched__now-state {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: color-mix(in srgb, var(--paper) 70%, transparent);
}
.sched__now-state--on {
  color: var(--accent);
}

.sched__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.sched__item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  padding: 0.8rem 0.95rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.sched__item-dot {
  width: 0.6rem;
  height: 0.6rem;
  margin-top: 0.45rem;
  border-radius: 50%;
  background: var(--muted);
}
.sched__item-dot--on {
  background: var(--accent);
}

.sched__item-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
}
.sched__item-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.sched__item-title {
  flex: 1;
  background: transparent;
  border: 0;
  border-bottom: 1px dashed var(--rule);
  padding: 0.15rem 0;
  color: var(--ink);
  font-family: var(--sans);
  font-size: 0.95rem;
  font-weight: 600;
}
.sched__item-title:focus {
  outline: none;
  border-bottom-color: var(--accent);
}
.sched__item-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  cursor: pointer;
}
.sched__item-toggle input {
  accent-color: var(--accent);
}

.sched__item-times {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.sched__item-times label {
  display: inline-flex;
  flex-direction: column;
  gap: 0.15rem;
}
.sched__item-times input[type='time'] {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.45rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.sched__item-caption {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.sched__item-days {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.sched__day {
  background: var(--paper-deep);
  color: var(--muted);
  border: 1px solid var(--rule);
  padding: 0.25rem 0.55rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.12s;
}
.sched__day:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.sched__day--on {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}

.sched__remove {
  align-self: flex-start;
  background: transparent;
  color: var(--muted);
  border: 1px solid transparent;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  cursor: pointer;
}
.sched__remove:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.sched__add {
  align-self: flex-start;
  background: transparent;
  color: var(--ink);
  border: 1px dashed var(--rule);
  padding: 0.5rem 0.9rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  cursor: pointer;
}
.sched__add:hover {
  border-color: var(--accent);
  color: var(--accent);
  border-style: solid;
}
</style>
