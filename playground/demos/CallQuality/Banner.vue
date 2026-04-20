<template>
  <div class="qbanner">
    <header class="qbanner__head">
      <div>
        <span class="qbanner__eyebrow">Poor network UX</span>
        <h3 class="qbanner__title">Banner states for degraded calls</h3>
      </div>

      <div class="qbanner__scenarios" role="tablist" aria-label="Quality scenarios">
        <button
          v-for="option in scenarios"
          :key="option.id"
          type="button"
          class="qbanner__scenario"
          :class="{ 'qbanner__scenario--active': scenario === option.id }"
          :aria-selected="scenario === option.id"
          @click="scenario = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <section class="qbanner__frame">
      <div class="qbanner__mock-call">
        <span class="qbanner__call-label">In call with</span>
        <span class="qbanner__call-peer">Samira Nilsson · +46 8 555 010</span>
        <span class="qbanner__call-meta">Opus · Wi‑Fi → LTE handover · 08:24</span>
      </div>

      <div class="qbanner__banner" :class="`qbanner__banner--${banner.severity}`" role="status">
        <div class="qbanner__banner-copy">
          <span class="qbanner__banner-title">{{ banner.title }}</span>
          <span class="qbanner__banner-detail">{{ banner.detail }}</span>
        </div>
        <div class="qbanner__banner-actions">
          <button type="button" class="qbanner__btn qbanner__btn--ghost">
            {{ banner.severity === 'bad' ? 'Switch to audio only' : 'Dismiss' }}
          </button>
          <button
            v-if="banner.severity !== 'ok'"
            type="button"
            class="qbanner__btn qbanner__btn--primary"
          >
            {{ banner.severity === 'bad' ? 'Retry media' : 'Learn more' }}
          </button>
        </div>
      </div>

      <dl class="qbanner__metrics">
        <div>
          <dt>Jitter</dt>
          <dd>{{ current.jitter }} ms</dd>
        </div>
        <div>
          <dt>Loss</dt>
          <dd>{{ current.loss.toFixed(1) }}%</dd>
        </div>
        <div>
          <dt>RTT</dt>
          <dd>{{ current.rtt }} ms</dd>
        </div>
        <div>
          <dt>MOS</dt>
          <dd>{{ mos.toFixed(2) }} · {{ verdict.label }}</dd>
        </div>
      </dl>
    </section>

    <section class="qbanner__playbook">
      <span class="qbanner__section-title">UI playbook</span>
      <ul class="qbanner__list">
        <li v-for="item in playbook" :key="item">{{ item }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  calculateMos,
  getNetworkBanner,
  getQualityVerdict,
  type QualitySnapshot,
} from './qualityModel'

type ScenarioId = 'stable' | 'handover' | 'collapse'

const scenarios: Array<{ id: ScenarioId; label: string; snapshot: QualitySnapshot }> = [
  { id: 'stable', label: 'Stable', snapshot: { jitter: 9, loss: 0.1, rtt: 58 } },
  { id: 'handover', label: 'Wi-Fi hop', snapshot: { jitter: 36, loss: 1.3, rtt: 184 } },
  { id: 'collapse', label: 'Tunnel collapse', snapshot: { jitter: 74, loss: 4.5, rtt: 340 } },
]

const scenario = ref<ScenarioId>('handover')

const current = computed(
  () => scenarios.find((option) => option.id === scenario.value)?.snapshot ?? scenarios[0].snapshot
)
const mos = computed(() => calculateMos(current.value))
const verdict = computed(() => getQualityVerdict(mos.value))
const banner = computed(() => getNetworkBanner(current.value))

const playbook = computed(() => {
  if (banner.value.severity === 'bad') {
    return [
      'Pin a danger banner under the toolbar and keep it visible until quality recovers.',
      'Offer a one-click audio fallback instead of hiding it in overflow menus.',
      'Stop auto-dismissing warnings — repeated dropouts should feel persistent, not cosmetic.',
    ]
  }

  if (banner.value.severity === 'warn') {
    return [
      'Use a warning banner before speech becomes robotic so the user can move or switch network.',
      'Keep call controls visible; warnings should add context, not steal the primary action row.',
      'Collapse the detail behind one explanation link instead of dumping raw metrics into the banner.',
    ]
  }

  return [
    'Stay quiet while the link is healthy; a tiny status chip is enough.',
    'Reserve banners for state changes so users learn to trust them.',
  ]
})
</script>

<style scoped>
.qbanner {
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

.qbanner__head {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.qbanner__eyebrow,
.qbanner__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.qbanner__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.qbanner__scenarios {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.qbanner__scenario,
.qbanner__btn {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  padding: 0.42rem 0.7rem;
  cursor: pointer;
}

.qbanner__scenario--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.qbanner__frame {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.95rem 1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.qbanner__mock-call {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
  align-items: baseline;
}

.qbanner__call-label,
.qbanner__call-meta {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
}

.qbanner__call-peer {
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 700;
}

.qbanner__banner {
  display: flex;
  justify-content: space-between;
  gap: 0.9rem;
  align-items: center;
  padding: 0.8rem 0.9rem;
  border-radius: 2px;
  border: 1px solid var(--rule);
  background: var(--paper);
  flex-wrap: wrap;
}

.qbanner__banner--ok {
  border-left: 4px solid #15803d;
}

.qbanner__banner--warn {
  border-left: 4px solid #d97706;
  background: color-mix(in srgb, #d97706 10%, var(--paper));
}

.qbanner__banner--bad {
  border-left: 4px solid #b91c1c;
  background: color-mix(in srgb, #b91c1c 12%, var(--paper));
}

.qbanner__banner-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: min(28rem, 100%);
}

.qbanner__banner-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.qbanner__banner-detail {
  font-size: 0.82rem;
  color: var(--muted);
}

.qbanner__banner-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.qbanner__btn--ghost {
  background: transparent;
}

.qbanner__btn--primary {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.qbanner__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.45rem;
  margin: 0;
}

.qbanner__metrics > div {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  padding: 0.55rem 0.65rem;
}

.qbanner__metrics dt {
  margin: 0 0 0.2rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.qbanner__metrics dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.92rem;
  font-variant-numeric: tabular-nums;
}

.qbanner__playbook {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.qbanner__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.qbanner__list li {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  font-size: 0.84rem;
}
</style>
