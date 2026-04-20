<template>
  <div class="qwait">
    <header class="qwait__head">
      <div>
        <span class="qwait__eyebrow">Waiting list · {{ queueName }}</span>
        <h3 class="qwait__title">{{ callers.length }} callers in queue</h3>
      </div>
      <select v-model="queueName" class="qwait__picker" aria-label="Queue">
        <option v-for="q in queueOptions" :key="q" :value="q">{{ q }}</option>
      </select>
    </header>

    <ul class="qwait__list" role="list">
      <li
        v-for="c in sortedCallers"
        :key="c.id"
        class="qwait__row"
        :class="{
          'qwait__row--warn': c.waitSeconds > 60 && c.waitSeconds <= 120,
          'qwait__row--crit': c.waitSeconds > 120,
        }"
      >
        <span class="qwait__pos">{{ c.position }}</span>
        <div class="qwait__main">
          <div class="qwait__who">
            <span class="qwait__name">{{ c.name || 'Unknown caller' }}</span>
            <code class="qwait__num">{{ c.number }}</code>
          </div>
          <div class="qwait__meta">
            <span>joined {{ formatClock(c.joinedAt) }}</span>
            <span class="qwait__sep" aria-hidden="true">·</span>
            <span>via {{ c.entry }}</span>
            <span v-if="c.priority" class="qwait__pri">
              <span class="qwait__sep" aria-hidden="true">·</span>
              priority {{ c.priority }}
            </span>
          </div>
        </div>
        <div class="qwait__side">
          <span class="qwait__wait" :class="{ 'qwait__wait--crit': c.waitSeconds > 120 }">
            {{ formatDuration(c.waitSeconds) }}
          </span>
          <div class="qwait__actions">
            <button
              type="button"
              class="qwait__btn"
              :aria-label="`Pick up ${c.number}`"
              @click="pickup(c.id)"
            >
              Pick up
            </button>
            <button
              type="button"
              class="qwait__btn qwait__btn--ghost"
              :aria-label="`Remove ${c.number} from queue`"
              @click="drop(c.id)"
            >
              Drop
            </button>
          </div>
        </div>
      </li>
      <li v-if="!callers.length" class="qwait__empty">
        Queue is drained. All calls are with an agent or hung up.
      </li>
    </ul>

    <footer class="qwait__foot">
      <span class="qwait__foot-item">
        Oldest wait
        <strong>{{ oldestLabel }}</strong>
      </span>
      <span class="qwait__foot-item">
        Avg wait (last 15m)
        <strong>{{ formatDuration(avgWait) }}</strong>
      </span>
      <span class="qwait__foot-item">
        Target
        <strong>&lt; 20s</strong>
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface Caller {
  id: number
  name?: string
  number: string
  joinedAt: number
  waitSeconds: number
  position: number
  entry: string
  priority?: number
}

const queueOptions = ['sales', 'support', 'billing', 'escalations']
const queueName = ref('sales')

const initial: Caller[] = [
  { id: 1, name: 'Priya Shah', number: '+14155550100', joinedAt: Date.now() - 183000, waitSeconds: 183, position: 1, entry: 'IVR · 1', priority: 1 },
  { id: 2, number: '+442079460000', joinedAt: Date.now() - 94000, waitSeconds: 94, position: 2, entry: 'IVR · 2' },
  { id: 3, name: 'Jordan Park', number: '+14085551920', joinedAt: Date.now() - 62000, waitSeconds: 62, position: 3, entry: 'callback' },
  { id: 4, name: 'Rae Okafor', number: '+13015550173', joinedAt: Date.now() - 41000, waitSeconds: 41, position: 4, entry: 'IVR · 1' },
  { id: 5, number: 'sip:anon@unknown.invalid', joinedAt: Date.now() - 12000, waitSeconds: 12, position: 5, entry: 'direct' },
]

const callers = ref<Caller[]>(initial.map((c) => ({ ...c })))

let tickTimer: ReturnType<typeof setInterval> | null = null
let joinTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickTimer = setInterval(() => {
    callers.value = callers.value.map((c) => ({
      ...c,
      waitSeconds: Math.floor((Date.now() - c.joinedAt) / 1000),
    }))
  }, 1000)
  joinTimer = setInterval(() => {
    if (callers.value.length >= 8) return
    if (Math.random() < 0.35) {
      const id = Math.max(0, ...callers.value.map((c) => c.id)) + 1
      const pick = samples[Math.floor(Math.random() * samples.length)]
      callers.value.push({
        id,
        ...pick,
        joinedAt: Date.now(),
        waitSeconds: 0,
        position: callers.value.length + 1,
      })
    } else if (callers.value.length > 0 && Math.random() < 0.3) {
      const front = callers.value.shift()
      if (front) recomputePositions()
    }
  }, 4000)
})
onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (joinTimer) clearInterval(joinTimer)
})

const samples = [
  { name: 'Devon Ibarra', number: '+14155550122', entry: 'IVR · 2' },
  { name: 'Maya Chen', number: '+12125550171', entry: 'callback' },
  { number: '+441215550000', entry: 'direct' },
  { name: 'Theo Lindqvist', number: '+46851550180', entry: 'IVR · 3' },
]

const pickup = (id: number) => {
  callers.value = callers.value.filter((c) => c.id !== id)
  recomputePositions()
}
const drop = (id: number) => {
  callers.value = callers.value.filter((c) => c.id !== id)
  recomputePositions()
}

const recomputePositions = () => {
  callers.value = callers.value.map((c, i) => ({ ...c, position: i + 1 }))
}

const sortedCallers = computed(() =>
  [...callers.value].sort((a, b) => a.position - b.position),
)

const oldestLabel = computed(() => {
  if (!callers.value.length) return '—'
  const oldest = Math.max(...callers.value.map((c) => c.waitSeconds))
  return formatDuration(oldest)
})
const avgWait = computed(() => {
  if (!callers.value.length) return 0
  return Math.round(
    callers.value.reduce((s, c) => s + c.waitSeconds, 0) / callers.value.length,
  )
})

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}
const formatClock = (t: number) => {
  const d = new Date(t)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.qwait {
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
  gap: 0.75rem;
  color: var(--ink);
  font-family: var(--sans);
}

.qwait__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.qwait__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.qwait__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.qwait__picker {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--ink);
}
.qwait__picker:focus { outline: none; border-color: var(--accent); }

.qwait__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.qwait__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.7rem;
  align-items: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  transition: border-color 0.15s;
}
.qwait__row--warn { border-left-color: var(--warn); }
.qwait__row--crit { border-left-color: var(--crit); background: color-mix(in srgb, var(--crit) 4%, var(--paper)); }

.qwait__pos {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--accent);
  width: 22px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.qwait__main { min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.qwait__who { display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
.qwait__name { font-weight: 600; font-size: 0.9rem; }
.qwait__num {
  font-family: var(--mono);
  font-size: 0.74rem;
  color: var(--muted);
  background: transparent;
}
.qwait__meta {
  display: inline-flex;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  flex-wrap: wrap;
}
.qwait__sep { opacity: 0.5; }
.qwait__pri { color: var(--accent); font-weight: 700; }

.qwait__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
}
.qwait__wait {
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.qwait__wait--crit { color: var(--crit); }
.qwait__actions { display: inline-flex; gap: 0.2rem; }
.qwait__btn {
  background: var(--accent);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.qwait__btn--ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--rule);
}
.qwait__btn--ghost:hover { color: var(--ink); border-color: var(--ink); }

.qwait__empty {
  padding: 1.3rem;
  text-align: center;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.74rem;
  color: var(--muted);
}

.qwait__foot {
  display: flex;
  gap: 1.2rem;
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  flex-wrap: wrap;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.qwait__foot-item { display: inline-flex; gap: 0.35rem; align-items: baseline; }
.qwait__foot-item strong {
  color: var(--ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
