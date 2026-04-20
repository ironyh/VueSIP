<template>
  <div class="sha">
    <header class="sha__head">
      <div>
        <span class="sha__eyebrow">Active share · {{ presenter.name }}</span>
        <h3 class="sha__title">{{ source.label }} · {{ source.w }}×{{ source.h }} @ {{ fps }}fps</h3>
      </div>
      <span class="sha__state" :class="`sha__state--${state}`">{{ state.toUpperCase() }}</span>
    </header>

    <div class="sha__stage" :class="{ 'sha__stage--live': state === 'sharing' }">
      <div class="sha__viewport" :aria-label="`Screen share of ${source.label}`">
        <div class="sha__chrome">
          <span class="sha__chrome-dot sha__chrome-dot--r" />
          <span class="sha__chrome-dot sha__chrome-dot--y" />
          <span class="sha__chrome-dot sha__chrome-dot--g" />
          <span class="sha__chrome-url">{{ source.url }}</span>
        </div>
        <div class="sha__content">
          <div class="sha__block sha__block--wide" />
          <div class="sha__block" />
          <div class="sha__block sha__block--mid" />
          <div class="sha__block sha__block--narrow" />
          <div class="sha__block sha__block--wide" />
          <div class="sha__cursor" :style="{ left: cursorX + '%', top: cursorY + '%' }" />
        </div>
        <span v-if="state !== 'sharing'" class="sha__overlay">Paused</span>
      </div>
    </div>

    <section class="sha__controls">
      <button type="button" class="sha__btn" @click="toggle">
        {{ state === 'sharing' ? 'Pause sharing' : 'Resume' }}
      </button>
      <button type="button" class="sha__btn sha__btn--danger" @click="stop">Stop</button>
      <label class="sha__toggle">
        <input type="checkbox" v-model="audio" />
        <span>{{ audio ? 'Tab audio on' : 'Tab audio off' }}</span>
      </label>
      <span class="sha__watchers">{{ watchers }} watching · bitrate {{ bitrate }} kbps</span>
    </section>

    <footer class="sha__foot">
      <span>
        Powered by <code>getDisplayMedia({ video: true })</code>; the track is added to the existing <code>RTCPeerConnection</code>
        via <code>addTransceiver</code> and negotiated with a fresh offer. Chrome keeps the "sharing" bar on even when you tab away.
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const presenter = { name: 'Alex Rivera' }

const source = {
  label: 'Chrome · Support dashboard',
  url: 'https://switchboard.example.com/tickets/T-10342',
  w: 1920,
  h: 1080,
}

const state = ref<'sharing' | 'paused' | 'stopped'>('sharing')
const audio = ref(false)
const watchers = ref(3)
const fps = ref(24)
const bitrate = ref(1480)
const cursorX = ref(50)
const cursorY = ref(40)

let t = window.setInterval(() => {
  if (state.value !== 'sharing') return
  cursorX.value = 10 + Math.floor(Math.random() * 80)
  cursorY.value = 15 + Math.floor(Math.random() * 70)
  bitrate.value = 1200 + Math.floor(Math.random() * 600)
  fps.value = 22 + Math.floor(Math.random() * 6)
}, 900)
onBeforeUnmount(() => clearInterval(t))

const toggle = () => { state.value = state.value === 'sharing' ? 'paused' : 'sharing' }
const stop = () => { state.value = 'stopped'; clearInterval(t) }
</script>

<style scoped>
.sha {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.85rem;
  color: var(--ink); font-family: var(--sans);
}

.sha__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.sha__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.sha__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.sha__state {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.55rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.sha__state--sharing { color: #15803d; border-color: #15803d; }
.sha__state--paused { color: #ca8a04; border-color: #ca8a04; }
.sha__state--stopped { color: #b91c1c; border-color: #b91c1c; }

.sha__stage {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem;
  position: relative;
}
.sha__stage--live { border-color: color-mix(in srgb, #15803d 35%, var(--rule)); }

.sha__viewport {
  background: #0d0b09;
  border: 1px solid var(--rule); border-radius: 2px;
  aspect-ratio: 16 / 9;
  position: relative;
  overflow: hidden;
  display: flex; flex-direction: column;
}

.sha__chrome {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  background: #1f1a15;
  border-bottom: 1px solid #332820;
}
.sha__chrome-dot { width: 9px; height: 9px; border-radius: 50%; }
.sha__chrome-dot--r { background: #ef4444; }
.sha__chrome-dot--y { background: #facc15; }
.sha__chrome-dot--g { background: #22c55e; }
.sha__chrome-url {
  margin-left: 0.5rem;
  font-family: var(--mono); font-size: 0.66rem; color: #c2a37a;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.sha__content {
  flex: 1;
  padding: 0.75rem;
  display: flex; flex-direction: column; gap: 0.45rem;
  background: linear-gradient(180deg, #151210 0%, #0d0b09 100%);
  position: relative;
}
.sha__block {
  background: #2a221b;
  border: 1px solid #3a2e24;
  border-radius: 2px;
  height: 0.7rem;
  width: 40%;
}
.sha__block--wide { width: 80%; height: 1rem; }
.sha__block--mid { width: 55%; }
.sha__block--narrow { width: 25%; }

.sha__cursor {
  position: absolute;
  width: 12px; height: 12px;
  background: var(--accent);
  border: 2px solid var(--paper);
  border-radius: 50%;
  transition: left 0.6s ease, top 0.6s ease;
  pointer-events: none;
}

.sha__overlay {
  position: absolute; inset: 0;
  background: rgba(13, 11, 9, 0.72);
  display: flex; align-items: center; justify-content: center;
  color: var(--paper); font-family: var(--mono); font-size: 1.2rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase;
}

.sha__controls { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }
.sha__btn {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.85rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.sha__btn--danger { color: #b91c1c; border-color: #b91c1c; }
.sha__btn--danger:hover { background: #b91c1c; color: var(--paper); }
.sha__toggle {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.sha__watchers {
  margin-left: auto;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.sha__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.sha__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
