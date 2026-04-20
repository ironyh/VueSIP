<template>
  <div class="pks">
    <header class="pks__head">
      <div>
        <span class="pks__eyebrow">Parking lot · default</span>
        <h3 class="pks__title">{{ occupied }}/{{ slots.length }} slots occupied</h3>
      </div>
      <span class="pks__range">Range 701–{{ 700 + slots.length }}</span>
    </header>

    <ul class="pks__grid" role="list">
      <li
        v-for="s in slots"
        :key="s.slot"
        class="pks__slot"
        :class="{ 'pks__slot--on': s.call, 'pks__slot--warn': s.call && s.seconds > 120 }"
      >
        <div class="pks__slot-top">
          <span class="pks__slot-num">{{ s.slot }}</span>
          <span v-if="s.call" class="pks__slot-timer">{{ formatMMSS(s.seconds) }}</span>
        </div>
        <div v-if="s.call" class="pks__slot-body">
          <span class="pks__slot-from">{{ s.call.from }}</span>
          <span class="pks__slot-by">parked by {{ s.call.parkedBy }}</span>
        </div>
        <div v-else class="pks__slot-empty">— empty —</div>
        <button v-if="s.call" type="button" class="pks__slot-retrieve" @click="retrieve(s.slot)">
          Retrieve
        </button>
      </li>
    </ul>

    <footer class="pks__foot">
      <span>
        Transfer a call to <code>700</code> to park it. Announced slot (<code>701–720</code>) is
        where to dial back. Timeouts return the call to the parker; default <code>45s</code> per
        <code>features.conf</code>.
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive } from 'vue'

interface ParkedCall {
  from: string
  parkedBy: string
}
interface Slot {
  slot: number
  call: ParkedCall | null
  seconds: number
}

const slots = reactive<Slot[]>([
  {
    slot: 701,
    call: { from: '+1 415 555 0182 · Morgan Lee', parkedBy: 'alex@support' },
    seconds: 32,
  },
  { slot: 702, call: null, seconds: 0 },
  { slot: 703, call: { from: 'sip:reception@example.com', parkedBy: 'reception' }, seconds: 8 },
  { slot: 704, call: { from: '+1 646 555 0139 · unknown', parkedBy: 'priya@ops' }, seconds: 145 },
  { slot: 705, call: null, seconds: 0 },
  { slot: 706, call: null, seconds: 0 },
  {
    slot: 707,
    call: { from: '+44 20 7946 0344 · Europe Sales', parkedBy: 'jordan@support' },
    seconds: 62,
  },
  { slot: 708, call: null, seconds: 0 },
  { slot: 709, call: null, seconds: 0 },
  { slot: 710, call: null, seconds: 0 },
  { slot: 711, call: null, seconds: 0 },
  { slot: 712, call: null, seconds: 0 },
])

const occupied = computed(() => slots.filter((s) => s.call).length)

const retrieve = (slot: number) => {
  const s = slots.find((x) => x.slot === slot)
  if (s) {
    s.call = null
    s.seconds = 0
  }
}

const timer = window.setInterval(() => {
  slots.forEach((s) => {
    if (s.call) s.seconds += 1
  })
}, 1000)
onBeforeUnmount(() => clearInterval(timer))

const formatMMSS = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
</script>

<style scoped>
.pks {
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

.pks__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.pks__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.pks__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.pks__range {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.08em;
}

.pks__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.pks__slot {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  min-height: 6rem;
}
.pks__slot--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}
.pks__slot--warn {
  border-color: #b91c1c;
  background: color-mix(in srgb, #b91c1c 7%, transparent);
}

.pks__slot-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pks__slot-num {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 1rem;
  color: var(--accent);
}
.pks__slot-timer {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  padding: 0.12rem 0.4rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.pks__slot--warn .pks__slot-timer {
  color: #b91c1c;
  border-color: #b91c1c;
}

.pks__slot-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.pks__slot-from {
  font-size: 0.82rem;
  font-weight: 600;
}
.pks__slot-by {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.pks__slot-empty {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  margin: auto 0;
}

.pks__slot-retrieve {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.5rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  cursor: pointer;
  margin-top: auto;
}
.pks__slot-retrieve:hover {
  background: var(--accent);
  color: var(--paper);
}

.pks__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.pks__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
