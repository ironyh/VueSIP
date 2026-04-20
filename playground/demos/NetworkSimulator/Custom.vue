<template>
  <div class="nsc">
    <header class="nsc__head">
      <div>
        <span class="nsc__eyebrow">Custom profile</span>
        <h3 class="nsc__title">{{ verdict }} · MOS {{ mos.toFixed(2) }}</h3>
      </div>
      <button type="button" class="nsc__btn" @click="reset">Reset</button>
    </header>

    <ul class="nsc__sliders" role="list">
      <li v-for="s in sliders" :key="s.key" class="nsc__slider">
        <label>
          <span class="nsc__label">
            <span>{{ s.label }}</span>
            <span class="nsc__val">{{ (state[s.key] as number).toFixed(s.decimals) }} {{ s.unit }}</span>
          </span>
          <input
            type="range"
            :min="s.min"
            :max="s.max"
            :step="s.step"
            v-model.number="state[s.key]"
            class="nsc__range"
          />
          <span class="nsc__hint">{{ s.hint }}</span>
        </label>
      </li>
    </ul>

    <section class="nsc__effect">
      <span class="nsc__section-title">Predicted effect</span>
      <ul class="nsc__bullets">
        <li v-for="e in effects" :key="e">{{ e }}</li>
      </ul>
    </section>

    <footer class="nsc__foot">
      <span>Apply via <code>tc qdisc</code> (Linux), Network Link Conditioner (macOS), or Clumsy (Windows). Browser-side impairment is proxy-only.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

interface Slider {
  key: 'latency' | 'jitter' | 'loss' | 'bandwidth'
  label: string
  unit: string
  min: number
  max: number
  step: number
  decimals: number
  hint: string
}

const initial = { latency: 40, jitter: 10, loss: 0.5, bandwidth: 10 }
const state = reactive<typeof initial>({ ...initial })

const sliders: Slider[] = [
  { key: 'latency',   label: 'One-way latency', unit: 'ms',   min: 0,  max: 600, step: 5,    decimals: 0, hint: 'Symmetric delay on the path. 150 ms is the ITU comfort ceiling.' },
  { key: 'jitter',    label: 'Jitter',          unit: 'ms',   min: 0,  max: 150, step: 1,    decimals: 0, hint: 'Random variance on inter-arrival time. Ramps the jitter buffer.' },
  { key: 'loss',      label: 'Packet loss',     unit: '%',    min: 0,  max: 10,  step: 0.1,  decimals: 1, hint: 'Random drops. Opus PLC handles up to ~3%; past that audio degrades fast.' },
  { key: 'bandwidth', label: 'Bandwidth cap',   unit: 'Mbps', min: 0.2, max: 100, step: 0.1, decimals: 1, hint: 'Hard ceiling on throughput. Triggers REMB/TWCC congestion control.' },
]

const mos = computed(() => {
  const raw = 4.5 - state.loss * 0.3 - state.jitter * 0.012 - state.latency * 0.003
  return Math.max(1, Math.min(4.5, raw))
})
const verdict = computed(() =>
  mos.value >= 4 ? 'Excellent' : mos.value >= 3.4 ? 'Acceptable' : mos.value >= 2.6 ? 'Degraded' : 'Unusable'
)

const effects = computed(() => {
  const out: string[] = []
  if (state.latency > 300) out.push('Talk-over collisions — users constantly interrupt each other')
  else if (state.latency > 150) out.push('Noticeable but tolerable delay; natural conversation still works')
  if (state.jitter > 60) out.push('Jitter buffer growth to 120+ ms; perceived as laggy audio')
  if (state.loss > 3) out.push('Robotic / chirpy audio — Opus PLC saturated')
  if (state.loss > 1 && state.loss <= 3) out.push('Occasional glitches; FEC mostly masks it')
  if (state.bandwidth < 0.5) out.push('Video kills audio — consider audio-only fallback')
  else if (state.bandwidth < 2) out.push('Video drops to 360p simulcast layer')
  if (!out.length) out.push('No notable effects — network is well within comfortable bounds')
  return out
})

const reset = () => Object.assign(state, initial)
</script>

<style scoped>
.nsc {
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

.nsc__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.nsc__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.nsc__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.nsc__btn {
  background: transparent; border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem 0.8rem;
  font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--muted); cursor: pointer;
}
.nsc__btn:hover { color: var(--ink); border-color: var(--ink); }

.nsc__sliders { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.55rem; }
.nsc__slider {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.65rem 0.85rem;
}
.nsc__slider label { display: flex; flex-direction: column; gap: 0.35rem; }
.nsc__label { display: flex; justify-content: space-between; align-items: baseline; font-weight: 600; font-size: 0.9rem; }
.nsc__val {
  font-family: var(--mono); font-size: 0.82rem; color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.nsc__range { width: 100%; accent-color: var(--accent); cursor: pointer; }
.nsc__hint {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
}

.nsc__effect { display: flex; flex-direction: column; gap: 0.4rem; }
.nsc__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.nsc__bullets {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 0.3rem;
}
.nsc__bullets li {
  padding: 0.45rem 0.7rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  font-size: 0.84rem;
  border-left: 3px solid var(--accent);
}

.nsc__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.nsc__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
