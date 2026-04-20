<template>
  <div class="aah">
    <header class="aah__head">
      <div>
        <span class="aah__eyebrow">Headset integration</span>
        <h3 class="aah__title">{{ headset.name }}</h3>
      </div>
      <span class="aah__state" :class="{ 'aah__state--on': connected }">
        <span class="aah__dot"></span>
        {{ connected ? 'Connected' : 'Disconnected' }}
      </span>
    </header>

    <div class="aah__device">
      <div class="aah__icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="56" height="56">
          <path
            d="M16 30c0-10 7-18 16-18s16 8 16 18v8h-4v-8c0-8-5-14-12-14s-12 6-12 14v8h-4v-8z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          />
          <rect
            x="10"
            y="30"
            width="10"
            height="14"
            rx="2"
            fill="currentColor"
            opacity="0.15"
            stroke="currentColor"
            stroke-width="2"
          />
          <rect
            x="44"
            y="30"
            width="10"
            height="14"
            rx="2"
            fill="currentColor"
            opacity="0.15"
            stroke="currentColor"
            stroke-width="2"
          />
          <circle v-if="buttonHeld" cx="49" cy="37" r="3" fill="var(--accent)" />
        </svg>
      </div>
      <div class="aah__device-meta">
        <dl class="aah__specs">
          <div>
            <dt>Transport</dt>
            <dd>USB HID · Call Control Usage Page (0x0B)</dd>
          </div>
          <div>
            <dt>Vendor ID</dt>
            <dd>0x047F · Plantronics</dd>
          </div>
          <div>
            <dt>Firmware</dt>
            <dd>2.4.1</dd>
          </div>
        </dl>
      </div>
    </div>

    <section class="aah__section">
      <span class="aah__section-title">Hardware mappings</span>
      <ul class="aah__map" role="list">
        <li v-for="m in mappings" :key="m.id" class="aah__map-row">
          <span class="aah__key">{{ m.button }}</span>
          <span class="aah__sep" aria-hidden="true">→</span>
          <span class="aah__action">{{ m.action }}</span>
          <span class="aah__usage">{{ m.usage }}</span>
        </li>
      </ul>
    </section>

    <section class="aah__section">
      <span class="aah__section-title">Simulator</span>
      <p class="aah__hint">
        Press-and-hold the hook switch to trigger auto-answer. In production this comes from
        <code>navigator.hid</code> or the OEM SDK (Jabra, Poly). Browsers relay the HID byte; the
        app maps it to <code>session.accept()</code>.
      </p>
      <div class="aah__sim-grid">
        <button
          type="button"
          class="aah__btn"
          :class="{ 'aah__btn--active': buttonHeld }"
          @mousedown="press('hook')"
          @mouseup="release"
          @mouseleave="release"
          @touchstart.prevent="press('hook')"
          @touchend="release"
          aria-label="Simulate hook switch"
        >
          <span class="aah__btn-glyph">☎</span>
          <span class="aah__btn-label">Hook switch</span>
          <span class="aah__btn-hint">Hold to answer</span>
        </button>
        <button type="button" class="aah__btn" @click="tap('volume-up')">
          <span class="aah__btn-glyph">＋</span>
          <span class="aah__btn-label">Volume +</span>
        </button>
        <button type="button" class="aah__btn" @click="tap('volume-down')">
          <span class="aah__btn-glyph">−</span>
          <span class="aah__btn-label">Volume −</span>
        </button>
        <button
          type="button"
          class="aah__btn"
          @click="tap('mute')"
          :class="{ 'aah__btn--active': muted }"
        >
          <span class="aah__btn-glyph">🎤</span>
          <span class="aah__btn-label">Mute</span>
          <span class="aah__btn-hint">{{ muted ? 'On' : 'Off' }}</span>
        </button>
      </div>
    </section>

    <section class="aah__section">
      <span class="aah__section-title">HID event log</span>
      <ol v-if="log.length" class="aah__log" role="log" aria-live="polite">
        <li v-for="entry in log" :key="entry.id" class="aah__log-row">
          <span class="aah__log-t">{{ entry.time }}</span>
          <span class="aah__log-event">{{ entry.event }}</span>
          <span class="aah__log-bytes">{{ entry.bytes }}</span>
        </li>
      </ol>
      <p v-else class="aah__log-empty">No events yet. Press a button above.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const headset = { name: 'Poly Voyager Focus 2' }

const connected = ref(true)
const buttonHeld = ref(false)
const muted = ref(false)
let holdTimer: number | null = null

interface LogEntry {
  id: number
  time: string
  event: string
  bytes: string
}
const log = ref<LogEntry[]>([])
let logId = 0

const mappings = [
  {
    id: 1,
    button: 'Hook switch',
    action: 'Accept incoming (auto-answer on long press)',
    usage: '0x0B · 0x20',
  },
  { id: 2, button: 'Volume +', action: 'Raise remote audio gain', usage: '0x0C · 0xE9' },
  { id: 3, button: 'Volume −', action: 'Lower remote audio gain', usage: '0x0C · 0xEA' },
  { id: 4, button: 'Mute', action: 'Toggle local mic (RTP ReceiveOnly)', usage: '0x0B · 0x2F' },
]

const now = () => {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

const pushLog = (event: string, bytes: string) => {
  log.value.unshift({ id: ++logId, time: now(), event, bytes })
  if (log.value.length > 10) log.value.pop()
}

const press = (key: string) => {
  buttonHeld.value = true
  pushLog(`${key} · DOWN`, '0B 20 01 00 00 00 00 00')
  holdTimer = window.setTimeout(() => {
    pushLog('hook · LONG-PRESS → auto-answer', 'session.accept()')
  }, 700)
}

const release = () => {
  if (!buttonHeld.value) return
  buttonHeld.value = false
  if (holdTimer) {
    clearTimeout(holdTimer)
    holdTimer = null
  }
  pushLog('hook · UP', '0B 20 00 00 00 00 00 00')
}

const tap = (action: string) => {
  if (action === 'mute') {
    muted.value = !muted.value
    pushLog(`mute · ${muted.value ? 'ON' : 'OFF'}`, '0B 2F 01 00 00 00 00 00')
  } else {
    pushLog(action, action.includes('up') ? '0C E9 01' : '0C EA 01')
  }
}

const count = computed(() => log.value.length)
void count
</script>

<style scoped>
.aah {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --ok: #047857;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}
.aah__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.aah__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.aah__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.aah__state {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.aah__state--on {
  color: var(--ok);
  border-color: var(--ok);
  background: color-mix(in srgb, var(--ok) 8%, transparent);
}
.aah__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.aah__device {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.8rem 0.9rem;
  color: var(--accent);
}
.aah__icon {
  flex-shrink: 0;
}
.aah__device-meta {
  flex: 1;
}
.aah__specs {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.2rem;
}
.aah__specs div {
  display: grid;
  grid-template-columns: 6.5rem 1fr;
  gap: 0.5rem;
}
.aah__specs dt {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.aah__specs dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--ink);
}

.aah__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.aah__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.aah__hint {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--muted);
}
.aah__hint code {
  font-family: var(--mono);
  font-size: 0.88em;
  padding: 0 0.3rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--accent);
}

.aah__map {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.aah__map-row {
  display: grid;
  grid-template-columns: 9rem 1.2rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
}
.aah__key {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--ink);
}
.aah__sep {
  color: var(--muted);
  text-align: center;
  font-family: var(--mono);
}
.aah__action {
  font-size: 0.82rem;
  color: var(--ink);
}
.aah__usage {
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--accent);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.08rem 0.35rem;
  letter-spacing: 0.05em;
}
@media (max-width: 620px) {
  .aah__map-row {
    grid-template-columns: 1fr;
  }
  .aah__sep,
  .aah__usage {
    justify-self: start;
  }
}

.aah__sim-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}
.aah__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.7rem 0.6rem;
  cursor: pointer;
  transition: all 0.12s;
  color: var(--ink);
  font-family: var(--sans);
}
.aah__btn:hover {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--rule));
}
.aah__btn--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}
.aah__btn-glyph {
  font-size: 1.4rem;
  line-height: 1;
}
.aah__btn-label {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.aah__btn-hint {
  font-family: var(--mono);
  font-size: 0.6rem;
  color: var(--muted);
}

.aah__log {
  list-style: none;
  padding: 0;
  margin: 0;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  max-height: 12rem;
  overflow: auto;
}
.aah__log-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem;
  padding: 0.35rem 0.6rem;
  border-bottom: 1px solid var(--rule);
  font-family: var(--mono);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}
.aah__log-row:last-child {
  border-bottom: 0;
}
.aah__log-t {
  color: var(--muted);
}
.aah__log-event {
  color: var(--ink);
}
.aah__log-bytes {
  color: var(--accent);
  letter-spacing: 0.05em;
}
.aah__log-empty {
  margin: 0;
  padding: 1rem;
  text-align: center;
  background: var(--paper-deep);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
