<template>
  <div class="ctw">
    <header class="ctw__head">
      <div>
        <span class="ctw__eyebrow">Widget · how it looks on a host site</span>
        <h3 class="ctw__title">Drop-in embeddable button</h3>
      </div>
      <div class="ctw__state" role="status" aria-live="polite">
        <span class="ctw__state-dot" :class="`ctw__state-dot--${state}`" aria-hidden="true" />
        <span class="ctw__state-label">{{ stateLabel }}</span>
        <span v-if="state === 'on-call'" class="ctw__timer">{{ formatDur(duration) }}</span>
      </div>
    </header>

    <div class="ctw__host">
      <div class="ctw__browser">
        <div class="ctw__browser-bar">
          <span class="ctw__browser-dot" />
          <span class="ctw__browser-dot" />
          <span class="ctw__browser-dot" />
          <code class="ctw__browser-url">https://acme-industrial.example/contact</code>
        </div>
        <article class="ctw__page">
          <h4 class="ctw__page-title">Talk to sales</h4>
          <p class="ctw__page-copy">
            Our team covers NA, EMEA, and APAC between 06:00 and 22:00 UTC.
            Pick up the phone — or let us call you back.
          </p>

          <!-- The embedded widget begins here -->
          <div class="widget" :class="`widget--${theme}`">
            <button
              v-if="state === 'idle'"
              type="button"
              class="widget__cta"
              :aria-label="`Call ${prefillName}`"
              @click="place"
            >
              <span class="widget__cta-icon" aria-hidden="true">☎</span>
              <span class="widget__cta-text">
                <span class="widget__cta-line">Call {{ prefillName }}</span>
                <span class="widget__cta-sub">Free over browser · no download</span>
              </span>
            </button>

            <div v-else class="widget__panel">
              <header class="widget__panel-head">
                <span class="widget__panel-name">{{ prefillName }}</span>
                <span class="widget__panel-state">{{ stateLabel }}</span>
              </header>
              <div v-if="state === 'ringing'" class="widget__pulse" aria-hidden="true" />
              <div v-if="state === 'on-call'" class="widget__dur">
                {{ formatDur(duration) }}
              </div>
              <button
                type="button"
                class="widget__hang"
                :aria-label="state === 'on-call' ? 'Hang up' : 'Cancel call'"
                @click="end"
              >
                {{ state === 'on-call' ? 'Hang up' : 'Cancel' }}
              </button>
            </div>
          </div>
          <!-- End widget -->

          <p class="ctw__page-copy ctw__page-copy--muted">
            Tap the button. Your browser will ask for microphone access the first time.
          </p>
        </article>
      </div>

      <aside class="ctw__side">
        <span class="ctw__side-title">Theme</span>
        <div class="ctw__themes" role="radiogroup" aria-label="Widget theme">
          <button
            v-for="t in themes"
            :key="t"
            type="button"
            class="ctw__theme"
            :class="{ 'ctw__theme--on': theme === t }"
            role="radio"
            :aria-checked="theme === t"
            @click="theme = t"
          >
            {{ t }}
          </button>
        </div>

        <span class="ctw__side-title">Prefill</span>
        <label class="ctw__side-field">
          <span>Destination label</span>
          <input v-model="prefillName" class="ctw__input" aria-label="Destination label" />
        </label>
        <label class="ctw__side-field">
          <span>Destination URI</span>
          <input v-model="prefillUri" class="ctw__input" aria-label="Destination URI" />
        </label>

        <p class="ctw__side-note">
          The button above is the widget exactly as it renders on the host page.
          Host CSS never leaks in — the widget ships its own styles in a Shadow DOM root.
        </p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type State = 'idle' | 'ringing' | 'on-call' | 'ended'
type Theme = 'warm' | 'mono' | 'neon'

const themes: Theme[] = ['warm', 'mono', 'neon']
const theme = ref<Theme>('warm')
const state = ref<State>('idle')
const duration = ref(0)
const prefillName = ref('Alex Rivera · sales')
const prefillUri = ref('sip:alex@example.com')

let ringTimer: number | undefined
let callTimer: number | undefined

const stateLabel = computed(() =>
  state.value === 'idle'
    ? 'Ready'
    : state.value === 'ringing'
      ? 'Ringing…'
      : state.value === 'on-call'
        ? 'Connected'
        : 'Ended',
)

const place = () => {
  state.value = 'ringing'
  duration.value = 0
  ringTimer = window.setTimeout(() => {
    state.value = 'on-call'
    callTimer = window.setInterval(() => (duration.value += 1), 1000)
  }, 1600)
}
const end = () => {
  if (ringTimer) clearTimeout(ringTimer)
  if (callTimer) clearInterval(callTimer)
  state.value = 'ended'
  window.setTimeout(() => {
    state.value = 'idle'
    duration.value = 0
  }, 1200)
}

onBeforeUnmount(() => {
  if (ringTimer) clearTimeout(ringTimer)
  if (callTimer) clearInterval(callTimer)
})

const formatDur = (s: number) => {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
</script>

<style scoped>
.ctw {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --ok: #4a8f4a;

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.ctw__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ctw__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.ctw__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.ctw__state {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.ctw__state-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.ctw__state-dot--idle { background: var(--muted); }
.ctw__state-dot--ringing { background: #d4811f; animation: ctwPulse 1s infinite; }
.ctw__state-dot--on-call { background: var(--ok); }
.ctw__state-dot--ended { background: #a41d08; }
.ctw__timer { font-variant-numeric: tabular-nums; color: var(--accent); }
@keyframes ctwPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.ctw__host {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 0.8rem;
}
@media (max-width: 800px) { .ctw__host { grid-template-columns: 1fr; } }

.ctw__browser {
  background: #ffffff;
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
  box-shadow: 0 2px 0 color-mix(in srgb, var(--ink) 8%, transparent);
}
.ctw__browser-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.7rem;
  background: var(--paper-deep);
  border-bottom: 1px solid var(--rule);
}
.ctw__browser-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--rule);
}
.ctw__browser-url {
  margin-left: 0.6rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctw__page {
  padding: 1.1rem 1.1rem 1.3rem;
  color: #222;
}
.ctw__page-title {
  margin: 0 0 0.35rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1410;
}
.ctw__page-copy {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #3a3530;
  max-width: 46ch;
}
.ctw__page-copy--muted {
  font-size: 0.78rem;
  color: #7a7169;
  margin-top: 0.8rem;
  margin-bottom: 0;
}

/* ---- widget self-scoped styles ---- */
.widget {
  display: inline-block;
  font-family: var(--sans);
}
.widget--warm {
  --w-bg: var(--accent);
  --w-fg: #fff;
  --w-border: var(--accent);
}
.widget--mono {
  --w-bg: #111;
  --w-fg: #fff;
  --w-border: #111;
}
.widget--neon {
  --w-bg: #0ea5e9;
  --w-fg: #001;
  --w-border: #0ea5e9;
}

.widget__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  background: var(--w-bg);
  color: var(--w-fg);
  border: 1px solid var(--w-border);
  border-radius: 2px;
  font-family: var(--sans);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 0 color-mix(in srgb, #000 25%, transparent);
  transition: transform 0.08s;
}
.widget__cta:hover { transform: translateY(-1px); }
.widget__cta:active { transform: translateY(0); box-shadow: 0 1px 0 color-mix(in srgb, #000 25%, transparent); }
.widget__cta-icon { font-size: 1.1rem; }
.widget__cta-text { display: inline-flex; flex-direction: column; align-items: flex-start; line-height: 1.15; }
.widget__cta-line { font-size: 0.95rem; }
.widget__cta-sub { font-size: 0.68rem; opacity: 0.8; font-weight: 400; }

.widget__panel {
  display: inline-flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 0.9rem;
  background: var(--w-bg);
  color: var(--w-fg);
  border: 1px solid var(--w-border);
  border-radius: 2px;
  min-width: 240px;
}
.widget__panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  font-weight: 600;
}
.widget__panel-state {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.8;
}
.widget__pulse {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, #fff 50%, transparent) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: widgetPulse 1.2s infinite;
}
@keyframes widgetPulse {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
.widget__dur {
  font-family: var(--mono);
  font-size: 1.4rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  letter-spacing: 0.08em;
}
.widget__hang {
  background: color-mix(in srgb, #000 30%, var(--w-bg));
  color: var(--w-fg);
  border: 0;
  border-radius: 2px;
  padding: 0.5rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.widget__hang:hover { background: color-mix(in srgb, #000 50%, var(--w-bg)); }

/* ---- side panel ---- */
.ctw__side {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.85rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.ctw__side-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 0.2rem;
}
.ctw__themes { display: inline-flex; gap: 0.25rem; }
.ctw__theme {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.ctw__theme:hover { color: var(--ink); border-color: var(--ink); }
.ctw__theme--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.ctw__side-field { display: flex; flex-direction: column; gap: 0.2rem; }
.ctw__side-field span {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.ctw__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--ink);
}
.ctw__input:focus { outline: none; border-color: var(--accent); }
.ctw__side-note {
  margin: 0.3rem 0 0;
  font-family: var(--mono);
  font-size: 0.64rem;
  line-height: 1.5;
  color: var(--muted);
}
</style>
