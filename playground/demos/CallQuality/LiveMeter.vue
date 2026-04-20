<template>
  <div class="cql">
    <header class="cql__head">
      <div>
        <span class="cql__eyebrow">Live · 1s interval</span>
        <h3 class="cql__title">MOS {{ mos.toFixed(2) }} · {{ verdict }}</h3>
      </div>
      <span class="cql__dot" :class="`cql__dot--${verdictTier}`" aria-hidden="true" />
    </header>

    <div class="cql__grid">
      <div class="cql__cell" v-for="m in metrics" :key="m.key">
        <span class="cql__k">{{ m.label }}</span>
        <span class="cql__v" :class="`cql__v--${m.tier}`">{{ m.value }}</span>
        <span class="cql__u">{{ m.unit }}</span>
      </div>
    </div>

    <section class="cql__section">
      <span class="cql__section-title">RTT history (60 s)</span>
      <div class="cql__spark" aria-hidden="true">
        <span
          v-for="(v, i) in rttHist"
          :key="i"
          class="cql__bar"
          :style="{ height: barHeight(v) + '%', background: barColor(v) }"
        />
      </div>
    </section>

    <footer class="cql__foot">
      <span>Pulled from <code>peerConnection.getStats()</code> — `outbound-rtp`, `remote-inbound-rtp`, `candidate-pair`. Refreshed every second.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  calculateMos,
  getQualityVerdict,
  metricTier,
} from './qualityModel'

interface M { key: string; label: string; value: string; unit: string; tier: 'ok' | 'warn' | 'bad' }

const jitter = ref(12)
const loss = ref(0.4)
const rtt = ref(68)
const bitrate = ref(48)
const rttHist = ref<number[]>(Array.from({ length: 60 }, () => 60 + Math.random() * 25))

const tick = window.setInterval(() => {
  jitter.value = Math.max(2, Math.min(90, jitter.value + (Math.random() - 0.5) * 6))
  loss.value = Math.max(0, Math.min(8, loss.value + (Math.random() - 0.5) * 0.8))
  rtt.value = Math.max(20, Math.min(400, rtt.value + (Math.random() - 0.5) * 20))
  bitrate.value = Math.max(16, Math.min(64, bitrate.value + (Math.random() - 0.5) * 4))
  rttHist.value = [...rttHist.value.slice(1), rtt.value]
}, 1000)
onBeforeUnmount(() => window.clearInterval(tick))

const mos = computed(() =>
  calculateMos({ jitter: jitter.value, loss: loss.value, rtt: rtt.value })
)
const verdictTier = computed<'ok' | 'warn' | 'bad'>(() => getQualityVerdict(mos.value).tier)
const verdict = computed(() => getQualityVerdict(mos.value).label)

const metrics = computed<M[]>(() => [
  { key: 'jitter', label: 'Jitter',      value: jitter.value.toFixed(1), unit: 'ms',   tier: metricTier(jitter.value, 30, 60) },
  { key: 'loss',   label: 'Packet loss', value: loss.value.toFixed(2),   unit: '%',    tier: metricTier(loss.value, 1, 3) },
  { key: 'rtt',    label: 'Round-trip',  value: rtt.value.toFixed(0),    unit: 'ms',   tier: metricTier(rtt.value, 150, 300) },
  { key: 'br',     label: 'Bitrate',     value: bitrate.value.toFixed(0), unit: 'kbps', tier: 'ok' },
])

const barHeight = (v: number) => Math.max(4, Math.min(100, (v / 400) * 100))
const barColor = (v: number) => (v < 150 ? 'var(--accent)' : v < 300 ? '#d97706' : '#b91c1c')
</script>

<style scoped>
.cql {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.8rem;
  color: var(--ink); font-family: var(--sans);
}

.cql__head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; }
.cql__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.cql__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.cql__dot { width: 12px; height: 12px; border-radius: 50%; }
.cql__dot--ok { background: #15803d; }
.cql__dot--warn { background: #d97706; }
.cql__dot--bad { background: #b91c1c; }

.cql__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.4rem;
}
.cql__cell {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex; flex-direction: column; gap: 0.15rem;
}
.cql__k {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cql__v {
  font-family: var(--mono); font-size: 1.4rem; font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.cql__v--warn { color: #d97706; }
.cql__v--bad { color: #b91c1c; }
.cql__u {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
}

.cql__section { display: flex; flex-direction: column; gap: 0.4rem; }
.cql__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cql__spark {
  display: flex; gap: 1px; align-items: flex-end;
  height: 56px; background: var(--paper); border: 1px solid var(--rule);
  border-radius: 2px; padding: 4px;
}
.cql__bar { flex: 1; min-width: 2px; background: var(--accent); border-radius: 1px; transition: height 0.3s; }

.cql__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.cql__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
