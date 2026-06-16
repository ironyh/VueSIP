<template>
  <div class="csw">
    <header class="csw__head">
      <div>
        <span class="csw__eyebrow">Session mini-widget · audio only</span>
        <h3 class="csw__title">{{ peer.name }} · {{ formatMMSS(secs) }}</h3>
      </div>
      <span class="csw__state" :class="`csw__state--${state}`">{{ state.toUpperCase() }}</span>
    </header>

    <section class="csw__dock">
      <div
        class="csw__widget"
        :class="{ 'csw__widget--muted': muted }"
        role="region"
        aria-label="Mini call widget"
      >
        <div class="csw__avatar">{{ initials(peer.name) }}</div>
        <div class="csw__peer">
          <span class="csw__peer-name">{{ peer.name }}</span>
          <span class="csw__peer-uri">{{ peer.uri }}</span>
        </div>
        <span class="csw__timer">{{ formatMMSS(secs) }}</span>
        <div class="csw__vu" aria-hidden="true">
          <span
            v-for="(b, i) in bars"
            :key="i"
            class="csw__vu-bar"
            :style="{ height: b + '%' }"
          ></span>
        </div>
        <div class="csw__actions">
          <button
            type="button"
            class="csw__act"
            :class="{ 'csw__act--on': muted }"
            :aria-pressed="muted"
            aria-label="Mute"
            @click="muted = !muted"
          >
            {{ muted ? 'UNMUTE' : 'MUTE' }}
          </button>
          <button
            type="button"
            class="csw__act csw__act--danger"
            aria-label="Hang up"
            @click="state = 'ended'"
          >
            HANG UP
          </button>
        </div>
      </div>
    </section>

    <section class="csw__context">
      <span class="csw__context-title">Host page state</span>
      <p class="csw__context-text">
        You are on the <code>/tickets/T-10342</code> page while the call continues above. The widget
        is pinned and persists across route changes via Vue Router's
        <code>&lt;keep-alive&gt;</code>; media tracks never detach from the
        <code>RTCPeerConnection</code>.
      </p>
    </section>

    <footer class="csw__foot">
      <span>
        The session widget is a floating DOM component — no Picture-in-Picture API, no browser
        quirks. Works in every modern browser, survives route changes, and keeps call controls one
        click away.
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const peer = { name: 'Priya Patel', uri: 'sip:priya@example.com' }

const state = ref<'connected' | 'ended'>('connected')
const muted = ref(false)
const secs = ref(134)

const bars = ref<number[]>([20, 40, 28, 68, 50, 32, 46, 24])

const t = window.setInterval(() => {
  if (state.value === 'ended') return
  secs.value += 1
  bars.value = bars.value.map(() => (muted.value ? 6 : 10 + Math.floor(Math.random() * 80)))
}, 700)
onBeforeUnmount(() => clearInterval(t))

const formatMMSS = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const initials = (n: string) =>
  n
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
</script>

<style scoped>
.csw {
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

.csw__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.csw__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.csw__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.csw__state {
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.55rem;
  border-radius: 2px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  color: var(--muted);
}
.csw__state--connected {
  color: #15803d;
  border-color: #15803d;
}
.csw__state--ended {
  color: #b91c1c;
  border-color: #b91c1c;
}

.csw__dock {
  padding: 0.7rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.csw__widget {
  display: grid;
  grid-template-columns: 2.6rem 1fr auto auto auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition: background 0.15s;
}
.csw__widget--muted {
  background: color-mix(in srgb, var(--muted) 5%, var(--paper));
}

@media (max-width: 640px) {
  .csw__widget {
    grid-template-columns: 2.6rem 1fr;
  }
  .csw__timer,
  .csw__vu {
    display: none;
  }
  .csw__actions {
    grid-column: 1 / -1;
  }
}

.csw__avatar {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  background: var(--accent);
  color: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 0.86rem;
}
.csw__peer {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.csw__peer-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.csw__peer-uri {
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.csw__timer {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.csw__vu {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 3.5rem;
  height: 1.5rem;
}
.csw__vu-bar {
  flex: 1;
  background: var(--accent);
  border-radius: 1px;
  transition: height 0.25s ease;
}

.csw__actions {
  display: flex;
  gap: 0.25rem;
}
.csw__act {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.65rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--ink);
  cursor: pointer;
}
.csw__act--on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}
.csw__act--danger {
  color: #b91c1c;
  border-color: #b91c1c;
}
.csw__act--danger:hover {
  background: #b91c1c;
  color: var(--paper);
}

.csw__context {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.csw__context-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.csw__context-text {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.5;
}
.csw__context-text code {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
  font-family: var(--mono);
}

.csw__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
</style>
