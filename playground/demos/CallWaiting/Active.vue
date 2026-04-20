<template>
  <div class="cwa">
    <header class="cwa__head">
      <div>
        <span class="cwa__eyebrow">Active session</span>
        <h3 class="cwa__title">Live call with waiting second line</h3>
      </div>
      <span class="cwa__time">{{ formatDur(activeDuration) }}</span>
    </header>

    <article class="cwa__panel cwa__panel--active">
      <div class="cwa__slot">
        <span class="cwa__slot-label">Line 1 · {{ activeHeld ? 'HELD' : 'TALKING' }}</span>
        <div class="cwa__slot-body">
          <div class="cwa__slot-name">{{ active.name }}</div>
          <code class="cwa__slot-uri">{{ active.uri }}</code>
        </div>
        <div class="cwa__slot-meta">
          <span>Codec <strong>{{ active.codec }}</strong></span>
          <span class="cwa__sep" aria-hidden="true">·</span>
          <span>{{ active.direction }}</span>
        </div>
      </div>
      <div v-if="waiting" class="cwa__slot cwa__slot--waiting" role="alert">
        <span class="cwa__slot-label">Line 2 · INCOMING</span>
        <div class="cwa__slot-body">
          <div class="cwa__slot-name">{{ waiting.name }}</div>
          <code class="cwa__slot-uri">{{ waiting.uri }}</code>
        </div>
        <div class="cwa__slot-meta">
          <span class="cwa__beep">♪ Call-waiting tone · local (no RTP)</span>
        </div>
      </div>
    </article>

    <div class="cwa__ops" role="group" aria-label="Call operations">
      <button type="button" class="cwa__op" @click="toggleHold" :disabled="!waiting && !active">
        <span class="cwa__op-glyph">{{ activeHeld ? '▶' : '⏸' }}</span>
        <span class="cwa__op-label">{{ activeHeld ? 'Resume' : 'Hold' }}</span>
        <span class="cwa__op-hint">re-INVITE a=sendonly</span>
      </button>
      <button type="button" class="cwa__op" @click="swap" :disabled="!waiting">
        <span class="cwa__op-glyph">⇄</span>
        <span class="cwa__op-label">Swap</span>
        <span class="cwa__op-hint">Hold L1, answer L2</span>
      </button>
      <button type="button" class="cwa__op" @click="merge" :disabled="!waiting">
        <span class="cwa__op-glyph">⚭</span>
        <span class="cwa__op-label">Merge</span>
        <span class="cwa__op-hint">Three-way bridge</span>
      </button>
      <button type="button" class="cwa__op cwa__op--primary" @click="answerSecond" :disabled="!waiting">
        <span class="cwa__op-glyph">✓</span>
        <span class="cwa__op-label">Answer L2</span>
        <span class="cwa__op-hint">Auto-hold L1</span>
      </button>
      <button type="button" class="cwa__op cwa__op--danger" @click="rejectSecond" :disabled="!waiting">
        <span class="cwa__op-glyph">✕</span>
        <span class="cwa__op-label">Reject L2</span>
        <span class="cwa__op-hint">486 Busy Here</span>
      </button>
      <button type="button" class="cwa__op cwa__op--danger" @click="hangup">
        <span class="cwa__op-glyph">⌽</span>
        <span class="cwa__op-label">Hang up L1</span>
        <span class="cwa__op-hint">BYE</span>
      </button>
    </div>

    <section class="cwa__log">
      <span class="cwa__log-title">Signalling</span>
      <ol>
        <li v-for="entry in log" :key="entry.id" class="cwa__log-row">
          <span class="cwa__log-dir" :class="`cwa__log-dir--${entry.dir}`">{{ entry.dir.toUpperCase() }}</span>
          <span class="cwa__log-msg">{{ entry.msg }}</span>
          <span class="cwa__log-t">{{ entry.t }}</span>
        </li>
      </ol>
    </section>

    <p v-if="!waiting" class="cwa__hint">
      Second line idle. Click <strong>Ring L2</strong> to simulate an incoming INVITE arriving during the active call.
      <button type="button" class="cwa__ring" @click="simulateIncoming">Ring L2</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Party { name: string; uri: string; codec: string; direction: 'Outbound' | 'Inbound' }
interface LogLine { id: number; t: string; dir: 'tx' | 'rx' | 'local'; msg: string }

const active = ref<Party>({
  name: 'Marta Nilsson',
  uri: 'sip:+46703330014@sip.example.se',
  codec: 'opus/48000',
  direction: 'Outbound',
})
const waiting = ref<Party | null>(null)
const activeHeld = ref(false)

const activeDuration = ref(184)
let tick: number | undefined
onMounted(() => { tick = window.setInterval(() => activeDuration.value++, 1000) })
onUnmounted(() => { if (tick) clearInterval(tick) })

const log = ref<LogLine[]>([
  { id: 1, t: '−03:04', dir: 'tx', msg: 'INVITE sip:+46703330014 · Line 1' },
  { id: 2, t: '−03:03', dir: 'rx', msg: '100 Trying · 180 Ringing' },
  { id: 3, t: '−03:01', dir: 'rx', msg: '200 OK · ACK' },
])
let logId = 10

const now = () => {
  const s = activeDuration.value
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

const push = (dir: LogLine['dir'], msg: string) => {
  log.value.unshift({ id: ++logId, t: now(), dir, msg })
  if (log.value.length > 8) log.value.pop()
}

const simulateIncoming = () => {
  waiting.value = {
    name: 'Henrik Bergström',
    uri: 'sip:+46812120099@sip.example.se',
    codec: 'opus/48000',
    direction: 'Inbound',
  }
  push('rx', 'INVITE · Line 2 (call-waiting)')
  push('local', 'play call-waiting tone (local audio only)')
}

const toggleHold = () => {
  activeHeld.value = !activeHeld.value
  push('tx', activeHeld.value ? 're-INVITE · a=sendonly · Line 1' : 're-INVITE · a=sendrecv · Line 1')
}

const swap = () => {
  if (!waiting.value) return
  push('tx', 're-INVITE · a=sendonly · Line 1')
  const w = waiting.value
  waiting.value = active.value
  active.value = w
  activeHeld.value = false
  push('tx', '200 OK (Answer) · Line 2')
}

const answerSecond = () => {
  if (!waiting.value) return
  push('tx', 're-INVITE · a=sendonly · Line 1 (auto-hold)')
  push('tx', '200 OK (Answer) · Line 2')
  const w = waiting.value
  waiting.value = active.value
  active.value = w
  activeHeld.value = false
}

const rejectSecond = () => {
  if (!waiting.value) return
  push('tx', '486 Busy Here · Line 2')
  waiting.value = null
}

const merge = () => {
  if (!waiting.value) return
  push('tx', 'REFER · Line 2 (server-side three-way bridge)')
  push('local', 'audio mixed locally · 3-party')
  waiting.value = null
}

const hangup = () => {
  push('tx', 'BYE · Line 1')
}

const formatDur = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.cwa {
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
.cwa__head {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap;
}
.cwa__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.cwa__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.cwa__time {
  font-family: var(--mono); font-size: 1.1rem; font-variant-numeric: tabular-nums;
  color: var(--accent); letter-spacing: 0.05em;
}

.cwa__panel {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
}
@media (max-width: 620px) { .cwa__panel { grid-template-columns: 1fr; } }
.cwa__slot {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.7rem 0.85rem; display: flex; flex-direction: column; gap: 0.35rem;
}
.cwa__slot--waiting {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 7%, var(--paper));
  animation: cwa-pulse 1.4s ease-in-out infinite;
}
@keyframes cwa-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 40%, transparent); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 0%, transparent); }
}
.cwa__slot-label {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cwa__slot--waiting .cwa__slot-label { color: var(--accent); }
.cwa__slot-body { display: flex; flex-direction: column; gap: 0.2rem; }
.cwa__slot-name { font-size: 1.05rem; font-weight: 600; color: var(--ink); }
.cwa__slot-uri {
  font-family: var(--mono); font-size: 0.75rem; color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cwa__slot-meta {
  display: inline-flex; flex-wrap: wrap; gap: 0.35rem; align-items: center;
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
}
.cwa__slot-meta strong { color: var(--ink); font-weight: 600; }
.cwa__sep { opacity: 0.5; }
.cwa__beep { color: var(--accent); letter-spacing: 0.05em; }

.cwa__ops {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.4rem;
}
.cwa__op {
  display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem 0.5rem; color: var(--ink); cursor: pointer;
  transition: all 0.12s; font-family: var(--sans);
}
.cwa__op:hover:not(:disabled) { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.cwa__op:disabled { opacity: 0.4; cursor: not-allowed; }
.cwa__op-glyph { font-size: 1.2rem; line-height: 1; color: var(--accent); }
.cwa__op-label {
  font-family: var(--mono); font-size: 0.66rem;
  letter-spacing: 0.1em; text-transform: uppercase;
}
.cwa__op-hint {
  font-family: var(--mono); font-size: 0.58rem;
  color: var(--muted); letter-spacing: 0.02em;
}
.cwa__op--primary { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
.cwa__op--primary .cwa__op-glyph { color: var(--accent); }
.cwa__op--danger:hover:not(:disabled) { border-color: var(--danger); }
.cwa__op--danger .cwa__op-glyph { color: var(--danger); }

.cwa__log {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem; display: flex; flex-direction: column; gap: 0.3rem;
}
.cwa__log-title {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cwa__log ol { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.cwa__log-row {
  display: grid; grid-template-columns: 3rem 1fr auto; gap: 0.5rem;
  font-family: var(--mono); font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
.cwa__log-dir {
  font-weight: 700; letter-spacing: 0.1em; font-size: 0.6rem;
  padding: 0 0.25rem; border-radius: 2px; text-align: center;
}
.cwa__log-dir--tx { background: color-mix(in srgb, var(--accent) 20%, transparent); color: var(--accent); }
.cwa__log-dir--rx { background: color-mix(in srgb, var(--ok) 20%, transparent); color: var(--ok); }
.cwa__log-dir--local { background: var(--paper); color: var(--muted); border: 1px solid var(--rule); }
.cwa__log-msg { color: var(--ink); }
.cwa__log-t { color: var(--muted); }

.cwa__hint {
  margin: 0; padding: 0.65rem 0.75rem;
  background: var(--paper); border: 1px dashed var(--rule); border-radius: 2px;
  font-size: 0.82rem; color: var(--muted); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
}
.cwa__hint strong { color: var(--ink); font-weight: 700; }
.cwa__ring {
  background: var(--ink); color: var(--paper); border: 0; border-radius: 2px;
  padding: 0.35rem 0.7rem; font-family: var(--mono); font-size: 0.62rem;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
}
.cwa__ring:hover { background: var(--accent); }
</style>
