<template>
  <div class="e9a">
    <header class="e9a__head">
      <div>
        <span class="e9a__eyebrow">Active emergency call · {{ phase }}</span>
        <h3 class="e9a__title">911 · PSAP San Francisco · {{ formatDuration(elapsed) }}</h3>
      </div>
      <span class="e9a__banner">ON THE LINE — DO NOT HANG UP</span>
    </header>

    <section class="e9a__stage">
      <div class="e9a__dispatch">
        <div class="e9a__pulse" aria-hidden="true">
          <span class="e9a__pulse-core"></span>
          <span class="e9a__pulse-wave"></span>
          <span class="e9a__pulse-wave e9a__pulse-wave--2"></span>
        </div>
        <div class="e9a__dispatch-body">
          <strong>Connected to SFFD Dispatcher</strong>
          <span>Call handed off at 0:02 · trunk SIP/emergency-1 · codec G.711 μ-law</span>
        </div>
      </div>

      <dl class="e9a__location">
        <div>
          <dt>Dispatchable location</dt>
          <dd>447 Larkin St, Floor 3, Desk 3-17-W, San Francisco, CA 94102</dd>
        </div>
        <div>
          <dt>Sent via</dt>
          <dd>PIDF-LO SIP INVITE · Geolocation: &lt;cid:loc&gt;;routing-allowed=yes</dd>
        </div>
        <div>
          <dt>Callback</dt>
          <dd>+1 415 555 0182 (Alex Rivera)</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>99.4% MSAG match · verified 2 days ago</dd>
        </div>
      </dl>
    </section>

    <section class="e9a__notify" aria-label="Front desk notifications">
      <h4 class="e9a__h4">Notifications dispatched</h4>
      <ul class="e9a__log" role="list">
        <li
          v-for="n in notifications"
          :key="n.id"
          class="e9a__log-item"
          :class="`e9a__log-item--${n.kind}`"
        >
          <span class="e9a__log-time">{{ n.time }}</span>
          <span class="e9a__log-kind">{{ n.kind.toUpperCase() }}</span>
          <span class="e9a__log-msg">{{ n.msg }}</span>
        </li>
      </ul>
    </section>

    <section class="e9a__controls" aria-label="Call controls">
      <button
        type="button"
        class="e9a__btn e9a__btn--mute"
        :aria-pressed="muted"
        @click="muted = !muted"
      >
        {{ muted ? 'Muted' : 'Mute' }}
      </button>
      <button
        type="button"
        class="e9a__btn e9a__btn--hold"
        disabled
        title="Hold is disabled on emergency calls"
      >
        Hold (disabled)
      </button>
      <span class="e9a__hint"
        >Hold and transfer are blocked by policy — a PSAP expects continuous audio.</span
      >
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

const elapsed = ref(47)
const phase = ref('live with dispatcher')
const muted = ref(false)

const formatDuration = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

const notifications = ref([
  {
    id: 1,
    time: '0:00',
    kind: 'sip',
    msg: 'INVITE 911@emergency-trunk — Geolocation header attached',
  },
  {
    id: 2,
    time: '0:00',
    kind: 'alert',
    msg: 'Front-desk alert sent to reception@corp.com + SIP NOTIFY to 2001',
  },
  { id: 3, time: '0:01', kind: 'log', msg: 'CDR flagged emergency=true · retention 5 years (FCC)' },
  {
    id: 4,
    time: '0:02',
    kind: 'sip',
    msg: '200 OK from PSAP · media established · callback number confirmed',
  },
  { id: 5, time: '0:05', kind: 'alert', msg: 'Security lead paged via PagerDuty (priority P1)' },
])

let t: number | undefined
t = window.setInterval(() => {
  elapsed.value++
}, 1000)
onBeforeUnmount(() => {
  if (t) window.clearInterval(t)
})
</script>

<style scoped>
.e9a {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #b91c1c;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.e9a__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.e9a__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.e9a__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.e9a__banner {
  font-family: var(--mono);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  background: var(--danger);
  color: #fff;
  padding: 0.25rem 0.55rem;
  border-radius: 2px;
  animation: e9a-blink 1.5s ease-in-out infinite;
}
@keyframes e9a-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.e9a__stage {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.e9a__dispatch {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 0.8rem;
  align-items: center;
  padding: 0.5rem 0.6rem;
  background: color-mix(in srgb, var(--danger) 6%, var(--paper-deep));
  border: 1px solid color-mix(in srgb, var(--danger) 40%, var(--rule));
  border-radius: 2px;
}
.e9a__pulse {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.e9a__pulse-core {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--danger);
  z-index: 2;
}
.e9a__pulse-wave {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--danger);
  opacity: 0;
  animation: e9a-wave 1.6s ease-out infinite;
}
.e9a__pulse-wave--2 {
  animation-delay: 0.8s;
}
@keyframes e9a-wave {
  0% {
    transform: scale(0.3);
    opacity: 0.9;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
.e9a__dispatch-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.e9a__dispatch-body strong {
  font-size: 0.88rem;
  color: var(--danger);
}
.e9a__dispatch-body span {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
}

.e9a__location {
  display: grid;
  gap: 0.4rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin: 0;
}
.e9a__location > div {
  padding: 0.45rem 0.6rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.e9a__location dt {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.e9a__location dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
}

.e9a__notify {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.8rem;
}
.e9a__h4 {
  margin: 0 0 0.45rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.e9a__log {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.e9a__log-item {
  display: grid;
  grid-template-columns: 3rem 3.5rem 1fr;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.3rem 0.5rem;
  background: var(--paper-deep);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
}
.e9a__log-item--alert {
  border-left-color: var(--danger);
}
.e9a__log-item--sip {
  border-left-color: var(--accent);
}
.e9a__log-item--log {
  border-left-color: var(--muted);
}
.e9a__log-time {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.e9a__log-kind {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.e9a__log-item--alert .e9a__log-kind {
  color: var(--danger);
}
.e9a__log-item--sip .e9a__log-kind {
  color: var(--accent);
}
.e9a__log-msg {
  color: var(--ink);
}

.e9a__controls {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
}
.e9a__btn {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  cursor: pointer;
}
.e9a__btn--mute[aria-pressed='true'] {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}
.e9a__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.e9a__hint {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
}
</style>
