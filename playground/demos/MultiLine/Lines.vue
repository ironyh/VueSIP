<template>
  <div class="mll">
    <header class="mll__head">
      <div>
        <span class="mll__eyebrow">Line appearances</span>
        <h3 class="mll__title">4-line classic</h3>
      </div>
      <label class="mll__dnd">
        <input type="checkbox" v-model="globalDnd" />
        <span>DND (all lines)</span>
      </label>
    </header>

    <div class="mll__grid" role="list">
      <article
        v-for="line in lines"
        :key="line.id"
        class="mll__line"
        :class="[`mll__line--${line.state}`, { 'mll__line--selected': selected === line.id, 'mll__line--dnd': line.dnd || globalDnd }]"
        role="listitem"
        @click="select(line.id)"
      >
        <header class="mll__line-head">
          <span class="mll__line-n">L{{ line.id }}</span>
          <span class="mll__line-state">{{ stateLabel(line.state) }}</span>
          <button
            type="button"
            class="mll__line-dnd"
            :class="{ 'mll__line-dnd--on': line.dnd }"
            :aria-pressed="line.dnd"
            :aria-label="`Toggle DND for line ${line.id}`"
            @click.stop="line.dnd = !line.dnd"
            title="DND"
          >⊘</button>
        </header>
        <div v-if="line.state !== 'idle'" class="mll__line-body">
          <div class="mll__line-name">{{ line.name }}</div>
          <code class="mll__line-uri">{{ line.uri }}</code>
          <div class="mll__line-meta">
            <span v-if="line.duration !== undefined">{{ formatDur(line.duration) }}</span>
            <span v-if="line.codec" class="mll__sep" aria-hidden="true">·</span>
            <span v-if="line.codec">{{ line.codec }}</span>
          </div>
        </div>
        <div v-else class="mll__line-empty">— idle —</div>
        <footer class="mll__line-foot">
          <button
            v-if="line.state === 'ringing'"
            type="button"
            class="mll__btn mll__btn--answer"
            @click.stop="answer(line.id)"
          >Answer</button>
          <button
            v-if="line.state === 'connected'"
            type="button"
            class="mll__btn"
            @click.stop="hold(line.id)"
          >Hold</button>
          <button
            v-if="line.state === 'held'"
            type="button"
            class="mll__btn mll__btn--resume"
            @click.stop="resume(line.id)"
          >Resume</button>
          <button
            v-if="line.state !== 'idle'"
            type="button"
            class="mll__btn mll__btn--end"
            @click.stop="end(line.id)"
          >End</button>
          <button
            v-else
            type="button"
            class="mll__btn mll__btn--dial"
            @click.stop="dial(line.id)"
          >Dial</button>
        </footer>
      </article>
    </div>

    <p class="mll__hint">
      SCA (Shared Call Appearance) shows the same 4 lines on every phone on the same
      <code>appearance-uri</code> via <code>dialog</code> event subscriptions (RFC 4235).
      Here they're local — see the SCA variant for the wire format.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type State = 'idle' | 'dialing' | 'ringing' | 'connected' | 'held'

interface Line {
  id: number
  state: State
  name?: string
  uri?: string
  duration?: number
  codec?: string
  dnd: boolean
}

const lines = ref<Line[]>([
  { id: 1, state: 'connected', name: 'Olivia Chen', uri: 'sip:+14155550123@sip.example', duration: 242, codec: 'opus', dnd: false },
  { id: 2, state: 'held', name: 'Accounts Team', uri: 'sip:accounts@pbx.example', duration: 812, codec: 'PCMU', dnd: false },
  { id: 3, state: 'ringing', name: 'Unknown', uri: 'sip:+442079461001@sip.example.co.uk', dnd: false },
  { id: 4, state: 'idle', dnd: false },
])
const selected = ref(1)
const globalDnd = ref(false)

const select = (id: number) => { selected.value = id }

const stateLabel = (s: State) =>
  ({ idle: 'IDLE', dialing: 'DIAL', ringing: 'RING', connected: 'TALK', held: 'HOLD' }[s])

let tick: number | undefined
onMounted(() => {
  tick = window.setInterval(() => {
    for (const l of lines.value) {
      if ((l.state === 'connected' || l.state === 'held') && l.duration !== undefined) {
        l.duration++
      }
    }
  }, 1000)
})
onBeforeUnmount(() => { if (tick) clearInterval(tick) })

const answer = (id: number) => {
  const l = lines.value.find((x) => x.id === id)
  if (!l || l.state !== 'ringing') return
  for (const other of lines.value) {
    if (other.id !== id && other.state === 'connected') other.state = 'held'
  }
  l.state = 'connected'
  l.duration = 0
  l.codec = 'opus'
  selected.value = id
}

const hold = (id: number) => {
  const l = lines.value.find((x) => x.id === id)
  if (l) l.state = 'held'
}
const resume = (id: number) => {
  const l = lines.value.find((x) => x.id === id)
  if (!l) return
  for (const other of lines.value) {
    if (other.id !== id && other.state === 'connected') other.state = 'held'
  }
  l.state = 'connected'
  selected.value = id
}
const end = (id: number) => {
  const l = lines.value.find((x) => x.id === id)
  if (!l) return
  l.state = 'idle'
  l.name = undefined; l.uri = undefined; l.duration = undefined; l.codec = undefined
}
const dial = (id: number) => {
  const l = lines.value.find((x) => x.id === id)
  if (!l) return
  l.state = 'dialing'
  l.name = 'Dialing…'
  l.uri = 'sip:+447712340000@sip.example.co.uk'
  setTimeout(() => {
    if (l.state !== 'dialing') return
    for (const other of lines.value) {
      if (other.id !== id && other.state === 'connected') other.state = 'held'
    }
    l.state = 'connected'
    l.name = 'Jamie Brook'
    l.codec = 'opus'
    l.duration = 0
  }, 1200)
  selected.value = id
}

const formatDur = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
}

const _selState = computed(() => lines.value.find((l) => l.id === selected.value)?.state)
void _selState
</script>

<style scoped>
.mll {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #a41d08;
  --ok: #047857;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}
.mll__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.mll__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.mll__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.mll__dnd {
  display: inline-flex; gap: 0.4rem; align-items: center;
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
  letter-spacing: 0.05em;
  cursor: pointer;
}
.mll__dnd input { accent-color: var(--accent); }

.mll__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.5rem;
}
.mll__line {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0; display: flex; flex-direction: column;
  cursor: pointer; transition: all 0.12s;
  min-height: 11rem;
}
.mll__line:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.mll__line--selected { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }
.mll__line--dnd { opacity: 0.55; background: repeating-linear-gradient(45deg, var(--paper), var(--paper) 8px, var(--paper-deep) 8px, var(--paper-deep) 16px); }
.mll__line--ringing { border-color: var(--accent); animation: mll-ring 1.1s ease-in-out infinite; }
.mll__line--connected { border-left: 3px solid var(--ok); }
.mll__line--held { border-left: 3px solid var(--muted); }
@keyframes mll-ring {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
  50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 0%, transparent); }
}

.mll__line-head {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.45rem 0.6rem; border-bottom: 1px solid var(--rule);
  background: var(--paper-deep);
}
.mll__line-n {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.1em; color: var(--accent);
}
.mll__line-state {
  flex: 1;
  font-family: var(--mono); font-size: 0.58rem; font-weight: 700;
  letter-spacing: 0.14em; color: var(--muted);
}
.mll__line-dnd {
  background: transparent; border: 1px solid var(--rule); border-radius: 2px;
  width: 1.4rem; height: 1.4rem; font-size: 0.85rem; line-height: 1;
  color: var(--muted); cursor: pointer; transition: all 0.12s;
  display: flex; align-items: center; justify-content: center;
}
.mll__line-dnd:hover { color: var(--ink); border-color: var(--ink); }
.mll__line-dnd--on { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }

.mll__line-body {
  flex: 1; padding: 0.55rem 0.7rem; display: flex; flex-direction: column; gap: 0.15rem;
}
.mll__line-name { font-weight: 600; font-size: 0.9rem; color: var(--ink); }
.mll__line-uri {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mll__line-meta {
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
  display: inline-flex; gap: 0.3rem; font-variant-numeric: tabular-nums;
}
.mll__sep { opacity: 0.5; }
.mll__line-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 0.72rem; color: var(--muted);
  font-style: italic; opacity: 0.6;
}

.mll__line-foot {
  display: flex; gap: 0.25rem; padding: 0.45rem 0.5rem; border-top: 1px solid var(--rule);
  flex-wrap: wrap;
}
.mll__btn {
  flex: 1; min-width: 3rem; padding: 0.35rem 0.3rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.6rem;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
  cursor: pointer; transition: all 0.12s;
}
.mll__btn:hover { color: var(--ink); border-color: var(--ink); }
.mll__btn--answer { color: var(--ok); border-color: var(--ok); background: color-mix(in srgb, var(--ok) 8%, transparent); }
.mll__btn--answer:hover { background: var(--ok); color: var(--paper); }
.mll__btn--resume { color: var(--accent); border-color: var(--accent); }
.mll__btn--end { color: var(--danger); border-color: var(--danger); }
.mll__btn--end:hover { background: var(--danger); color: var(--paper); }
.mll__btn--dial { color: var(--accent); border-color: var(--accent); }

.mll__hint {
  margin: 0; padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.72rem; line-height: 1.5; color: var(--muted);
}
.mll__hint code {
  padding: 0 0.3rem; background: var(--paper); border: 1px solid var(--rule);
  border-radius: 2px; color: var(--accent); font-size: 0.88em;
}
</style>
