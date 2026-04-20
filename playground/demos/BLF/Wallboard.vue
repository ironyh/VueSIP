<template>
  <div class="blf">
    <header class="blf__head">
      <div>
        <span class="blf__eyebrow">Wallboard · sales floor</span>
        <h3 class="blf__title">
          {{ extensions.length }} watched ·
          <span class="blf__pill blf__pill--idle">{{ count('idle') }} idle</span>
          <span class="blf__pill blf__pill--busy">{{ count('busy') }} on call</span>
          <span class="blf__pill blf__pill--ringing">{{ count('ringing') }} ringing</span>
        </h3>
      </div>
      <div class="blf__legend" role="list" aria-label="Lamp legend">
        <span class="blf__legend-item" role="listitem">
          <span class="blf__lamp blf__lamp--idle" aria-hidden="true"></span>Idle
        </span>
        <span class="blf__legend-item" role="listitem">
          <span class="blf__lamp blf__lamp--ringing" aria-hidden="true"></span>Ringing
        </span>
        <span class="blf__legend-item" role="listitem">
          <span class="blf__lamp blf__lamp--busy" aria-hidden="true"></span>Busy
        </span>
        <span class="blf__legend-item" role="listitem">
          <span class="blf__lamp blf__lamp--dnd" aria-hidden="true"></span>DND
        </span>
        <span class="blf__legend-item" role="listitem">
          <span class="blf__lamp blf__lamp--offline" aria-hidden="true"></span>Offline
        </span>
      </div>
    </header>

    <ul class="blf__grid" role="list">
      <li v-for="e in extensions" :key="e.ext" class="blf__cell">
        <button
          type="button"
          class="blf__tile"
          :class="[`blf__tile--${e.state}`]"
          :aria-label="`${e.name} extension ${e.ext}, ${e.state}${e.peer ? ' with ' + e.peer : ''}`"
          @click="bump(e.ext)"
        >
          <span class="blf__lamp-row">
            <span class="blf__lamp" :class="`blf__lamp--${e.state}`" aria-hidden="true"></span>
            <span class="blf__state">{{ stateLabel(e.state) }}</span>
            <span v-if="e.state === 'busy'" class="blf__dur">{{ formatDur(e.dur) }}</span>
          </span>
          <span class="blf__ext">{{ e.ext }}</span>
          <span class="blf__name">{{ e.name }}</span>
          <span class="blf__peer">
            <template v-if="e.state === 'busy' && e.peer"> ← {{ e.peer }} </template>
            <template v-else-if="e.state === 'ringing' && e.peer"> ⇽ {{ e.peer }} </template>
            <template v-else-if="e.state === 'dnd'"> Do not disturb </template>
            <template v-else-if="e.state === 'offline'"> Unregistered </template>
            <template v-else> &nbsp; </template>
          </span>
        </button>
      </li>
    </ul>

    <footer class="blf__foot">
      <span class="blf__source">
        <code>SUBSCRIBE</code> · event <code>dialog</code> · accept
        <code>application/dialog-info+xml</code>
      </span>
      <span class="blf__tick">last NOTIFY {{ lastTick }}s ago</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type State = 'idle' | 'ringing' | 'busy' | 'dnd' | 'offline'

interface Ext {
  ext: string
  name: string
  state: State
  peer?: string
  dur: number
  since: number
}

const extensions = ref<Ext[]>([
  {
    ext: '2001',
    name: 'Alex Rivera',
    state: 'busy',
    peer: '+14155550100',
    dur: 147,
    since: Date.now(),
  },
  { ext: '2002', name: 'Priya Shah', state: 'idle', dur: 0, since: Date.now() },
  {
    ext: '2003',
    name: 'Tomás León',
    state: 'ringing',
    peer: '+442079460000',
    dur: 0,
    since: Date.now(),
  },
  {
    ext: '2004',
    name: 'Jun Okafor',
    state: 'busy',
    peer: 'sip:bridge@conf.local',
    dur: 1842,
    since: Date.now(),
  },
  { ext: '2005', name: 'Sara Kovač', state: 'dnd', dur: 0, since: Date.now() },
  { ext: '2006', name: 'Lee Park', state: 'idle', dur: 0, since: Date.now() },
  {
    ext: '2007',
    name: 'Mika Weiss',
    state: 'busy',
    peer: '+33142688000',
    dur: 23,
    since: Date.now(),
  },
  { ext: '2008', name: 'Noor Hassan', state: 'offline', dur: 0, since: Date.now() },
  { ext: '2009', name: 'Ravi Menon', state: 'idle', dur: 0, since: Date.now() },
  {
    ext: '2010',
    name: 'Greta Møller',
    state: 'ringing',
    peer: '+4560111222',
    dur: 0,
    since: Date.now(),
  },
  { ext: '2011', name: 'Chen Wei', state: 'idle', dur: 0, since: Date.now() },
  { ext: '2012', name: 'Orion Blake', state: 'busy', peer: '2001', dur: 412, since: Date.now() },
])

const lastTick = ref(0)
let tickTimer: number | undefined

const count = (s: State) => extensions.value.filter((e) => e.state === s).length

const stateLabel = (s: State) =>
  s === 'idle'
    ? 'Idle'
    : s === 'busy'
      ? 'On call'
      : s === 'ringing'
        ? 'Ringing'
        : s === 'dnd'
          ? 'DND'
          : 'Offline'

const formatDur = (s: number) => {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// Click bumps state like a simulated NOTIFY arriving for that peer.
const bump = (ext: string) => {
  const e = extensions.value.find((x) => x.ext === ext)
  if (!e) return
  const order: State[] = ['idle', 'ringing', 'busy', 'dnd', 'offline']
  const i = order.indexOf(e.state)
  e.state = order[(i + 1) % order.length]
  e.since = Date.now()
  e.dur = e.state === 'busy' ? 0 : 0
  lastTick.value = 0
}

onMounted(() => {
  tickTimer = window.setInterval(() => {
    lastTick.value += 1
    extensions.value.forEach((e) => {
      if (e.state === 'busy') e.dur += 1
    })
  }, 1000)
})
onBeforeUnmount(() => {
  if (tickTimer) clearInterval(tickTimer)
})

// Dummy use of computed so import isn't stripped — keeps hot-reload stable.
const _anyBusy = computed(() => count('busy') > 0)
void _anyBusy
</script>

<style scoped>
.blf {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --idle: #4a8f4a;
  --busy: #a41d08;
  --ringing: #d4811f;
  --dnd: #7a4b9c;
  --offline: #8a7d6b;

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.blf__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.blf__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.blf__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.blf__pill {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.blf__pill--idle {
  color: var(--idle);
  border-color: color-mix(in srgb, var(--idle) 40%, var(--rule));
}
.blf__pill--busy {
  color: var(--busy);
  border-color: color-mix(in srgb, var(--busy) 40%, var(--rule));
}
.blf__pill--ringing {
  color: var(--ringing);
  border-color: color-mix(in srgb, var(--ringing) 40%, var(--rule));
}

.blf__legend {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.blf__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.blf__grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.4rem;
}
.blf__tile {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.65rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--offline);
  border-radius: 2px;
  text-align: left;
  cursor: pointer;
  font-family: var(--sans);
  color: var(--ink);
  transition:
    border-color 0.12s,
    background 0.12s;
}
.blf__tile:hover {
  border-color: var(--ink);
}
.blf__tile--idle {
  border-left-color: var(--idle);
}
.blf__tile--busy {
  border-left-color: var(--busy);
  background: color-mix(in srgb, var(--busy) 5%, var(--paper));
}
.blf__tile--ringing {
  border-left-color: var(--ringing);
  background: color-mix(in srgb, var(--ringing) 8%, var(--paper));
  animation: blfPulse 1s ease-in-out infinite;
}
.blf__tile--dnd {
  border-left-color: var(--dnd);
}
.blf__tile--offline {
  border-left-color: var(--offline);
  opacity: 0.75;
}

@keyframes blfPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--ringing) 40%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--ringing) 10%, transparent);
  }
}

.blf__lamp-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
}
.blf__lamp {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--offline);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink) 20%, transparent) inset;
}
.blf__lamp--idle {
  background: var(--idle);
  box-shadow: 0 0 6px color-mix(in srgb, var(--idle) 70%, transparent);
}
.blf__lamp--busy {
  background: var(--busy);
  box-shadow: 0 0 6px color-mix(in srgb, var(--busy) 70%, transparent);
}
.blf__lamp--ringing {
  background: var(--ringing);
  box-shadow: 0 0 8px color-mix(in srgb, var(--ringing) 90%, transparent);
}
.blf__lamp--dnd {
  background: var(--dnd);
}
.blf__lamp--offline {
  background: var(--offline);
}

.blf__state {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.blf__dur {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
  color: var(--busy);
  font-weight: 600;
}
.blf__ext {
  font-family: var(--mono);
  font-size: 1.1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.blf__name {
  font-size: 0.86rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.blf__peer {
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  min-height: 1em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.blf__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.7rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.blf__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
.blf__tick {
  font-variant-numeric: tabular-nums;
}
</style>
