<template>
  <div class="pgm">
    <header class="pgm__head">
      <div>
        <span class="pgm__eyebrow">Multicast page · one-to-many</span>
        <h3 class="pgm__title">{{ selectedGroup.label }}</h3>
      </div>
      <span class="pgm__state" :class="`pgm__state--${state}`">{{ state.toUpperCase() }}</span>
    </header>

    <section class="pgm__section">
      <span class="pgm__section-title">Target group</span>
      <ul class="pgm__groups" role="radiogroup" aria-label="Paging group">
        <li v-for="g in groups" :key="g.id">
          <button
            type="button"
            class="pgm__group"
            :class="{ 'pgm__group--on': g.id === groupId }"
            role="radio"
            :aria-checked="g.id === groupId"
            @click="groupId = g.id"
          >
            <span class="pgm__group-label">{{ g.label }}</span>
            <span class="pgm__group-meta">{{ g.members }} phones · {{ g.addr }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section class="pgm__ptt">
      <button
        type="button"
        class="pgm__ptt-btn"
        :class="{ 'pgm__ptt-btn--on': state === 'live' }"
        :aria-pressed="state === 'live'"
        @mousedown="start"
        @mouseup="stop"
        @mouseleave="stop"
        @touchstart.prevent="start"
        @touchend.prevent="stop"
      >
        <span class="pgm__ptt-dot"></span>
        <span class="pgm__ptt-label">{{
          state === 'live' ? 'Broadcasting…' : 'Hold to page'
        }}</span>
        <span class="pgm__ptt-hint">Space · push-to-talk</span>
      </button>
    </section>

    <section class="pgm__section">
      <span class="pgm__section-title">Recent pages</span>
      <ol class="pgm__log" role="list">
        <li v-for="e in log" :key="e.at" class="pgm__log-row">
          <span class="pgm__log-at">{{ e.at }}</span>
          <span class="pgm__log-group">{{ e.group }}</span>
          <span class="pgm__log-dur">{{ e.duration }}</span>
          <span class="pgm__log-by">{{ e.by }}</span>
        </li>
      </ol>
    </section>

    <footer class="pgm__foot">
      <span
        >Asterisk <code>app_page()</code> with <code>MulticastRTP://239.1.2.3:5000</code>. Phones
        subscribe via <code>paging-group={{ selectedGroup.id }}</code> in their provisioning
        profile.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const groups = [
  { id: 'sales', label: 'Sales floor', members: 18, addr: '239.1.2.10:5000' },
  { id: 'support', label: 'Support pod', members: 12, addr: '239.1.2.11:5000' },
  { id: 'warehouse', label: 'Warehouse overhead', members: 6, addr: '239.1.2.12:5000' },
  { id: 'all', label: 'All phones', members: 94, addr: '239.1.2.1:5000' },
]

const groupId = ref('sales')
const selectedGroup = computed(() => groups.find((g) => g.id === groupId.value)!)

const state = ref<'idle' | 'live'>('idle')
let startedAt = 0

const start = () => {
  state.value = 'live'
  startedAt = Date.now()
}
const stop = () => {
  if (state.value !== 'live') return
  const duration = ((Date.now() - startedAt) / 1000).toFixed(1) + 's'
  log.value.unshift({
    at: new Date().toLocaleTimeString('en-US', { hour12: false }),
    group: selectedGroup.value.label,
    duration,
    by: 'alex@switchboard',
  })
  state.value = 'idle'
}

onBeforeUnmount(stop)

const log = ref<Array<{ at: string; group: string; duration: string; by: string }>>([
  { at: '14:02:11', group: 'Sales floor', duration: '6.2s', by: 'priya@ops' },
  { at: '13:18:44', group: 'All phones', duration: '2.8s', by: 'alex@switchboard' },
  { at: '11:54:03', group: 'Warehouse overhead', duration: '4.1s', by: 'jordan@support' },
  { at: '09:31:27', group: 'Support pod', duration: '3.4s', by: 'priya@ops' },
])
</script>

<style scoped>
.pgm {
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

.pgm__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.pgm__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.pgm__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.pgm__state {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  color: var(--muted);
}
.pgm__state--live {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  border-color: var(--accent);
}

.pgm__section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.pgm__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.pgm__groups {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.35rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.pgm__group {
  width: 100%;
  text-align: left;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-family: var(--sans);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.pgm__group:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.pgm__group--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.pgm__group-label {
  font-weight: 600;
  font-size: 0.9rem;
}
.pgm__group-meta {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.pgm__ptt {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0;
}
.pgm__ptt-btn {
  user-select: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem 2.5rem;
  background: var(--paper);
  border: 2px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--sans);
  color: var(--ink);
  transition: all 0.1s;
}
.pgm__ptt-btn:hover {
  border-color: var(--accent);
}
.pgm__ptt-btn--on {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: var(--accent);
}
.pgm__ptt-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--muted);
}
.pgm__ptt-btn--on .pgm__ptt-dot {
  background: var(--accent);
  animation: pgmPulse 1s ease-in-out infinite;
}
@keyframes pgmPulse {
  50% {
    opacity: 0.35;
  }
}
.pgm__ptt-label {
  font-size: 1rem;
  font-weight: 600;
}
.pgm__ptt-hint {
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pgm__log {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pgm__log-row {
  display: grid;
  grid-template-columns: 7rem 1fr 4rem 9rem;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
@media (max-width: 600px) {
  .pgm__log-row {
    grid-template-columns: 1fr;
  }
}
.pgm__log-at {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.pgm__log-group {
  font-size: 0.86rem;
}
.pgm__log-dur {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.pgm__log-by {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}

.pgm__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.pgm__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
