<template>
  <div class="rec">
    <header class="rec__head">
      <div class="rec__head-main">
        <span class="rec__eyebrow">In-call recording</span>
        <h3 class="rec__title">
          <code class="rec__party">{{ session.remote }}</code>
          <span class="rec__state" :class="`rec__state--${state}`">{{ stateLabel }}</span>
        </h3>
        <span class="rec__callid"
          >Call-ID {{ session.callId }} · {{ formatDuration(callElapsed) }}</span
        >
      </div>
      <div
        class="rec__indicator"
        :class="{ 'rec__indicator--on': state === 'recording' }"
        aria-hidden="true"
      >
        <span class="rec__dot"></span>
        <span class="rec__indicator-label">{{
          state === 'recording' ? 'REC' : state === 'paused' ? 'PSE' : 'OFF'
        }}</span>
      </div>
    </header>

    <div class="rec__stage">
      <div class="rec__meter" :class="`rec__meter--${state}`" aria-hidden="true">
        <span v-for="(b, i) in bars" :key="i" class="rec__bar" :style="{ height: b + '%' }"></span>
      </div>
      <div class="rec__timer" aria-live="polite">
        <span class="rec__timer-label">Session</span>
        <code class="rec__timer-value">{{ formatDuration(recDuration) }}</code>
      </div>
    </div>

    <div class="rec__controls" role="group" aria-label="Recording controls">
      <button
        v-if="state === 'idle' || state === 'stopped'"
        type="button"
        class="rec__btn rec__btn--record"
        :disabled="!consented"
        @click="start"
      >
        <span class="rec__btn-icon" aria-hidden="true">●</span>
        <span>Start recording</span>
      </button>
      <template v-else>
        <button
          v-if="state === 'recording'"
          type="button"
          class="rec__btn"
          @click="pause"
          :aria-pressed="false"
        >
          <span class="rec__btn-icon" aria-hidden="true">‖</span>
          <span>Pause</span>
        </button>
        <button
          v-else-if="state === 'paused'"
          type="button"
          class="rec__btn rec__btn--record"
          @click="resume"
        >
          <span class="rec__btn-icon" aria-hidden="true">▶</span>
          <span>Resume</span>
        </button>
        <button type="button" class="rec__btn rec__btn--stop" @click="stop">
          <span class="rec__btn-icon" aria-hidden="true">■</span>
          <span>Stop &amp; save</span>
        </button>
      </template>
    </div>

    <section class="rec__legal">
      <label class="rec__legal-row">
        <input type="checkbox" v-model="announcementOn" />
        <div>
          <span class="rec__legal-title">Legal announcement</span>
          <span class="rec__legal-hint"
            >Plays "{{ announcement }}" when recording starts. Required in two-party consent
            jurisdictions.</span
          >
        </div>
      </label>
      <label class="rec__legal-row">
        <input type="checkbox" v-model="beepOn" />
        <div>
          <span class="rec__legal-title">Periodic beep (every 15s)</span>
          <span class="rec__legal-hint"
            >1400 Hz, 200 ms tone injected into local mix. Cheapest defensible notice.</span
          >
        </div>
      </label>
      <label class="rec__legal-row">
        <input type="checkbox" v-model="consented" />
        <div>
          <span class="rec__legal-title">Caller consented</span>
          <span class="rec__legal-hint"
            >Set after verbal acknowledgment. Disables the record button until true.</span
          >
        </div>
      </label>
    </section>

    <section class="rec__log" aria-label="Recording event log">
      <span class="rec__log-title">Event trace</span>
      <ul class="rec__log-list">
        <li v-for="(ev, i) in log" :key="i" class="rec__log-row">
          <code class="rec__log-ts">{{ ev.ts }}</code>
          <span class="rec__log-kind" :class="`rec__log-kind--${ev.kind}`">{{ ev.kind }}</span>
          <span class="rec__log-msg">{{ ev.msg }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type RecState = 'idle' | 'recording' | 'paused' | 'stopped'

const session = { remote: 'sip:priya.shah@example.com', callId: 'a8f3c1e9-4b2d' }
const announcement = 'This call is being recorded for quality and training purposes.'

const state = ref<RecState>('idle')
const announcementOn = ref(true)
const beepOn = ref(false)
const consented = ref(true)

const callStart = Date.now() - 47_000
const callElapsed = ref(47)
const recStart = ref<number | null>(null)
const recAccumulated = ref(0)
const recDuration = ref(0)

const bars = ref<number[]>(Array.from({ length: 24 }, () => 8 + Math.random() * 12))
const log = ref<{ ts: string; kind: 'info' | 'send' | 'warn'; msg: string }[]>([
  { ts: '00:00', kind: 'info', msg: 'Call answered · remote stream attached' },
])

const stateLabel = computed(() =>
  state.value === 'recording'
    ? 'Recording'
    : state.value === 'paused'
      ? 'Paused'
      : state.value === 'stopped'
        ? 'Stopped'
        : 'Idle'
)

const now = () => {
  const sec = Math.floor((Date.now() - callStart) / 1000)
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}
const pushLog = (kind: 'info' | 'send' | 'warn', msg: string) => {
  log.value.unshift({ ts: now(), kind, msg })
  if (log.value.length > 8) log.value.pop()
}

const formatDuration = (sec: number): string => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const start = () => {
  if (announcementOn.value) pushLog('send', `→ INVITE re-negotiate · play "${announcement}"`)
  pushLog('send', '→ INFO Record: on (RFC 6086 application/media_control)')
  if (beepOn.value) pushLog('info', 'Beep injected at 1400 Hz / 200 ms')
  state.value = 'recording'
  recStart.value = Date.now()
}
const pause = () => {
  if (recStart.value) recAccumulated.value += Date.now() - recStart.value
  recStart.value = null
  pushLog('send', '→ INFO Record: pause')
  state.value = 'paused'
}
const resume = () => {
  recStart.value = Date.now()
  pushLog('send', '→ INFO Record: resume')
  state.value = 'recording'
}
const stop = () => {
  if (recStart.value) recAccumulated.value += Date.now() - recStart.value
  recStart.value = null
  pushLog('send', `→ INFO Record: off · saved rec-${session.callId}-${Date.now()}.webm`)
  state.value = 'stopped'
}

let tick: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  tick = setInterval(() => {
    callElapsed.value = Math.floor((Date.now() - callStart) / 1000)
    const base = recAccumulated.value + (recStart.value ? Date.now() - recStart.value : 0)
    recDuration.value = Math.floor(base / 1000)
    if (state.value === 'recording') {
      bars.value = bars.value.map(() => 8 + Math.random() * 88)
    } else if (state.value === 'paused') {
      bars.value = bars.value.map((b) => Math.max(4, b * 0.92))
    } else {
      bars.value = bars.value.map(() => 4 + Math.random() * 6)
    }
  }, 250)
})
onBeforeUnmount(() => {
  if (tick) clearInterval(tick)
})
</script>

<style scoped>
.rec {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --danger: #a41d08;

  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}

.rec__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid var(--rule);
}
.rec__head-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.rec__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.rec__title {
  margin: 0.1rem 0 0;
  display: inline-flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
  font-size: 1rem;
  font-weight: 600;
}
.rec__party {
  font-family: var(--mono);
  font-size: 0.9rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
}
.rec__state {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--muted);
}
.rec__state--recording {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.rec__state--paused {
  color: #8b7500;
  border-color: #8b7500;
  background: color-mix(in srgb, #8b7500 8%, transparent);
}

.rec__callid {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.rec__indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}
.rec__dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--muted);
}
.rec__indicator--on .rec__dot {
  background: var(--accent);
  animation: rec-blink 1s steps(2, start) infinite;
}
@keyframes rec-blink {
  50% {
    opacity: 0.2;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rec__indicator--on .rec__dot {
    animation: none;
  }
}
.rec__indicator-label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.rec__indicator--on .rec__indicator-label {
  color: var(--accent);
}

.rec__stage {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem 1rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.rec__meter {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 3.2rem;
}
.rec__bar {
  flex: 1;
  background: var(--muted);
  border-radius: 1px;
  transition:
    height 0.18s ease-out,
    background 0.15s;
  min-height: 2px;
}
.rec__meter--recording .rec__bar {
  background: var(--accent);
}
.rec__meter--paused .rec__bar {
  background: color-mix(in srgb, var(--accent) 40%, var(--muted));
}

.rec__timer {
  text-align: right;
}
.rec__timer-label {
  display: block;
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.rec__timer-value {
  font-family: var(--mono);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.rec__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.rec__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.85rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.rec__btn:hover:not(:disabled) {
  border-color: var(--ink);
}
.rec__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.rec__btn--record {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}
.rec__btn--record:hover:not(:disabled) {
  background: var(--ink);
  border-color: var(--ink);
}
.rec__btn--stop {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.rec__btn-icon {
  font-size: 0.85rem;
}

.rec__legal {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.7rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--accent);
  border-radius: 2px;
}
.rec__legal-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  align-items: start;
  font-size: 0.82rem;
  cursor: pointer;
}
.rec__legal-row input {
  margin-top: 0.2rem;
  accent-color: var(--accent);
}
.rec__legal-title {
  display: block;
  font-weight: 600;
  color: var(--ink);
}
.rec__legal-hint {
  display: block;
  margin-top: 0.15rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  line-height: 1.45;
}

.rec__log {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.6rem 0.7rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
}
.rec__log-title {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--paper) 50%, transparent);
}
.rec__log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.rec__log-row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.6rem;
  align-items: baseline;
  font-family: var(--mono);
  font-size: 0.7rem;
}
.rec__log-ts {
  color: color-mix(in srgb, var(--paper) 45%, transparent);
  font-variant-numeric: tabular-nums;
}
.rec__log-kind {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  padding: 0 0.35rem;
  border-radius: 2px;
}
.rec__log-kind--info {
  background: color-mix(in srgb, var(--paper) 12%, transparent);
  color: color-mix(in srgb, var(--paper) 80%, transparent);
}
.rec__log-kind--send {
  background: color-mix(in srgb, var(--accent) 80%, transparent);
  color: var(--paper);
}
.rec__log-kind--warn {
  background: #b45309;
  color: var(--paper);
}
.rec__log-msg {
  color: var(--paper);
}
</style>
