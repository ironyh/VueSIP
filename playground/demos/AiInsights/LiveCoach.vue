<template>
  <div class="aic">
    <header class="aic__head">
      <div>
        <span class="aic__eyebrow">Live coach · {{ tick }}s</span>
        <h3 class="aic__title">Maya Chen · ACME Corp · retention risk</h3>
      </div>
      <span class="aic__sent" :class="`aic__sent--${sentTone}`">
        sentiment {{ sentiment.toFixed(2) }} · trend {{ trendLabel }}
      </span>
    </header>

    <section class="aic__stage">
      <div class="aic__meter" role="img" :aria-label="`Sentiment ${sentiment.toFixed(2)}`">
        <div class="aic__meter-track">
          <span class="aic__meter-zero" aria-hidden="true" />
          <span
            class="aic__meter-needle"
            :style="{ left: needleLeft }"
            :class="`aic__meter-needle--${sentTone}`"
          />
        </div>
        <div class="aic__meter-scale" aria-hidden="true">
          <span>−1</span><span>−0.5</span><span>0</span><span>+0.5</span><span>+1</span>
        </div>
      </div>

      <div class="aic__emotion">
        <div v-for="e in emotions" :key="e.label" class="aic__emotion-row">
          <span class="aic__emotion-label">{{ e.label }}</span>
          <span class="aic__emotion-bar">
            <span
              class="aic__emotion-fill"
              :class="e.label === dominant ? 'aic__emotion-fill--on' : ''"
              :style="{ width: `${e.value * 100}%` }"
            />
          </span>
          <span class="aic__emotion-pct">{{ Math.round(e.value * 100) }}%</span>
        </div>
      </div>
    </section>

    <section class="aic__nudges" aria-label="Agent nudges">
      <h4 class="aic__h4">Nudges (last 60s)</h4>
      <ul class="aic__nudge-list" role="list">
        <li v-for="n in nudges" :key="n.id" class="aic__nudge" :class="`aic__nudge--${n.kind}`">
          <span class="aic__nudge-kind">{{ n.kind.toUpperCase() }}</span>
          <div class="aic__nudge-body">
            <strong>{{ n.title }}</strong>
            <small>{{ n.hint }}</small>
          </div>
          <span class="aic__nudge-time">{{ n.t }}s</span>
        </li>
      </ul>
    </section>

    <section class="aic__talk">
      <div class="aic__talk-bar" role="img" aria-label="Talk-listen ratio">
        <span class="aic__talk-agent" :style="{ width: `${talk.agent}%` }">AGENT {{ talk.agent }}%</span>
        <span class="aic__talk-caller" :style="{ width: `${talk.caller}%` }">CALLER {{ talk.caller }}%</span>
      </div>
      <span class="aic__talk-hint">Target: caller ≥ 55%. Currently {{ talk.caller >= 55 ? 'healthy' : 'agent-dominated' }}.</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const tick = ref(47)
const sentiment = ref(-0.32)
const trend = ref(-0.04)

const emotions = ref([
  { label: 'frustrated', value: 0.62 },
  { label: 'concerned',  value: 0.21 },
  { label: 'calm',       value: 0.12 },
  { label: 'positive',   value: 0.05 },
])

const nudges = ref([
  { id: 1, kind: 'warn', t: 18, title: 'Acknowledge the frustration',
    hint: 'Caller said "silent failure" twice. Name it: "That sounds really frustrating — silent failures are the worst kind."' },
  { id: 2, kind: 'tip',  t: 34, title: 'Slow down',
    hint: 'Your speech rate is 172 wpm. Target 135–150 during escalated calls.' },
  { id: 3, kind: 'info', t: 41, title: 'Offer SLA credit early',
    hint: 'Webhook outage meets the >4h criterion. Pre-authorised credit per policy #SLA-7.' },
])

const talk = ref({ agent: 61, caller: 39 })

let t: number | undefined
t = window.setInterval(() => {
  tick.value++
  sentiment.value = Math.max(-1, Math.min(1, sentiment.value + (Math.random() - 0.45) * 0.04))
  trend.value = trend.value * 0.7 + (Math.random() - 0.5) * 0.02
  talk.value.agent = Math.max(30, Math.min(75, talk.value.agent + (Math.random() - 0.5) * 2))
  talk.value.caller = 100 - talk.value.agent
}, 1000)
onBeforeUnmount(() => { if (t) window.clearInterval(t) })

const sentTone = computed(() => sentiment.value > 0.15 ? 'ok' : sentiment.value < -0.15 ? 'warn' : 'neutral')
const trendLabel = computed(() => trend.value > 0.02 ? 'improving' : trend.value < -0.02 ? 'worsening' : 'flat')
const dominant = computed(() => emotions.value.reduce((a, b) => a.value > b.value ? a : b).label)
const needleLeft = computed(() => `${((sentiment.value + 1) / 2) * 100}%`)
</script>

<style scoped>
.aic {
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

.aic__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.aic__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.aic__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.aic__sent {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  padding: 0.25rem 0.55rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.aic__sent--ok { color: #15803d; border-color: #15803d; }
.aic__sent--warn { color: #b91c1c; border-color: #b91c1c; }

.aic__stage {
  display: grid; gap: 0.8rem;
  grid-template-columns: minmax(220px, 1fr) 1fr;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.75rem 0.9rem;
}
@media (max-width: 640px) { .aic__stage { grid-template-columns: 1fr; } }

.aic__meter { display: flex; flex-direction: column; gap: 0.35rem; }
.aic__meter-track {
  position: relative;
  height: 10px; border-radius: 5px;
  background: linear-gradient(to right, #b91c1c, #d9cfbb 50%, #15803d);
}
.aic__meter-zero {
  position: absolute; left: 50%; top: -3px; height: 16px; width: 1px;
  background: var(--ink); opacity: 0.3;
}
.aic__meter-needle {
  position: absolute; top: -4px;
  width: 3px; height: 18px;
  background: var(--ink);
  transform: translateX(-50%);
  transition: left 0.6s ease-out;
}
.aic__meter-needle--warn { background: #b91c1c; }
.aic__meter-needle--ok { background: #15803d; }
.aic__meter-scale {
  display: flex; justify-content: space-between;
  font-family: var(--mono); font-size: 0.6rem; color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.aic__emotion { display: flex; flex-direction: column; gap: 0.3rem; }
.aic__emotion-row { display: grid; grid-template-columns: 5.5rem 1fr 2.5rem; gap: 0.5rem; align-items: center; }
.aic__emotion-label {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.aic__emotion-bar {
  height: 8px; background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  overflow: hidden; position: relative;
}
.aic__emotion-fill {
  display: block; height: 100%;
  background: var(--rule);
  transition: width 0.6s ease-out;
}
.aic__emotion-fill--on { background: var(--accent); }
.aic__emotion-pct {
  font-family: var(--mono); font-size: 0.68rem; text-align: right;
  color: var(--ink); font-variant-numeric: tabular-nums;
}

.aic__h4 {
  margin: 0 0 0.45rem;
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.aic__nudges { background: var(--paper); border: 1px solid var(--rule); border-radius: 2px; padding: 0.65rem 0.85rem; }
.aic__nudge-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.aic__nudge {
  display: grid; grid-template-columns: 3.5rem 1fr auto; gap: 0.55rem; align-items: center;
  padding: 0.45rem 0.6rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-left-width: 3px; border-radius: 2px;
}
.aic__nudge--warn { border-left-color: #b91c1c; }
.aic__nudge--tip { border-left-color: var(--accent); }
.aic__nudge--info { border-left-color: var(--muted); }
.aic__nudge-kind {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.12em; color: var(--muted);
}
.aic__nudge--warn .aic__nudge-kind { color: #b91c1c; }
.aic__nudge--tip .aic__nudge-kind { color: var(--accent); }
.aic__nudge-body strong { display: block; font-size: 0.84rem; margin-bottom: 0.1rem; }
.aic__nudge-body small { display: block; font-family: var(--mono); font-size: 0.68rem; color: var(--muted); line-height: 1.4; }
.aic__nudge-time {
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.aic__talk { display: flex; flex-direction: column; gap: 0.3rem; }
.aic__talk-bar {
  display: flex; height: 22px; border-radius: 2px; overflow: hidden;
  border: 1px solid var(--rule);
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700; letter-spacing: 0.08em;
}
.aic__talk-agent {
  background: var(--accent); color: var(--paper);
  display: flex; align-items: center; justify-content: center;
  transition: width 0.6s ease-out;
}
.aic__talk-caller {
  background: var(--paper-deep); color: var(--ink);
  display: flex; align-items: center; justify-content: center;
  transition: width 0.6s ease-out;
}
.aic__talk-hint { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
</style>
