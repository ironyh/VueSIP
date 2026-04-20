<template>
  <div class="cqs">
    <header class="cqs__head">
      <div>
        <span class="cqs__eyebrow">Call summary · {{ call.id }}</span>
        <h3 class="cqs__title">{{ call.peer }} · {{ mmss(call.duration) }}</h3>
      </div>
      <span class="cqs__verdict" :class="`cqs__verdict--${call.tier}`">{{ call.verdict }}</span>
    </header>

    <div class="cqs__grid">
      <div class="cqs__stat" v-for="s in stats" :key="s.label">
        <span class="cqs__k">{{ s.label }}</span>
        <span class="cqs__v">{{ s.value }}</span>
        <span class="cqs__u">{{ s.unit }}</span>
      </div>
    </div>

    <section class="cqs__section">
      <span class="cqs__section-title">Timeline events</span>
      <ul class="cqs__events" role="list">
        <li v-for="e in call.events" :key="e.t" class="cqs__event">
          <span class="cqs__time">{{ mmss(e.t) }}</span>
          <span class="cqs__badge" :class="`cqs__badge--${e.tier}`">{{ e.kind }}</span>
          <span class="cqs__msg">{{ e.msg }}</span>
        </li>
      </ul>
    </section>

    <footer class="cqs__foot">
      <span
        >Recap pulled post-hangup from stored `getStats()` samples — written alongside the CDR row
        so ops can correlate with Asterisk's log.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
interface Event {
  t: number
  kind: string
  tier: 'ok' | 'warn' | 'bad'
  msg: string
}

const call = {
  id: 'call-b2c9f4',
  peer: 'Alex Rivera · sip:alex@example.com',
  duration: 327,
  tier: 'warn' as 'ok' | 'warn' | 'bad',
  verdict: 'Acceptable (MOS 3.6)',
  events: [
    { t: 0, kind: 'INVITE', tier: 'ok', msg: '200 OK · codec Opus 48k · ICE relay over TURN' },
    { t: 28, kind: 'STATS', tier: 'ok', msg: 'Stable — jitter 14 ms, loss 0.2 %, RTT 72 ms' },
    {
      t: 104,
      kind: 'QUAL',
      tier: 'warn',
      msg: 'RTT spike to 280 ms · jitter buffer grew to 120 ms',
    },
    { t: 138, kind: 'ICE', tier: 'warn', msg: 'srflx candidate dropped · fell back to relay' },
    { t: 201, kind: 'STATS', tier: 'ok', msg: 'Recovered — RTT back to 90 ms' },
    { t: 312, kind: 'DTMF', tier: 'ok', msg: 'User sent 1 (IVR transfer)' },
    { t: 327, kind: 'BYE', tier: 'ok', msg: 'Peer hangup · 200 OK' },
  ] as Event[],
}

const stats = [
  { label: 'MOS avg', value: '3.60', unit: 'score' },
  { label: 'Jitter avg', value: '18.4', unit: 'ms' },
  { label: 'Jitter p95', value: '42', unit: 'ms' },
  { label: 'Loss avg', value: '0.38', unit: '%' },
  { label: 'RTT avg', value: '98', unit: 'ms' },
  { label: 'RTT p95', value: '240', unit: 'ms' },
  { label: 'Bytes recv', value: '1.8', unit: 'MB' },
  { label: 'Codec', value: 'Opus', unit: '48 kHz' },
]

const mmss = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
</script>

<style scoped>
.cqs {
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

.cqs__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.cqs__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cqs__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.cqs__verdict {
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  border-radius: 2px;
}
.cqs__verdict--ok {
  background: color-mix(in srgb, #15803d 15%, transparent);
  color: #15803d;
}
.cqs__verdict--warn {
  background: color-mix(in srgb, #d97706 15%, transparent);
  color: #d97706;
}
.cqs__verdict--bad {
  background: color-mix(in srgb, #b91c1c 15%, transparent);
  color: #b91c1c;
}

.cqs__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.4rem;
}
.cqs__stat {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.cqs__k {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.cqs__v {
  font-family: var(--mono);
  font-size: 1.2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.cqs__u {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
}

.cqs__section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.cqs__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.cqs__events {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.cqs__event {
  display: grid;
  grid-template-columns: 4ch auto 1fr;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.4rem 0.65rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.cqs__time {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.cqs__badge {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
}
.cqs__badge--warn {
  color: #d97706;
  border-color: #d97706;
}
.cqs__badge--bad {
  color: #b91c1c;
  border-color: #b91c1c;
}
.cqs__msg {
  font-size: 0.82rem;
  color: var(--ink);
}

.cqs__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.cqs__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
