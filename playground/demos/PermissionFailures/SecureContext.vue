<template>
  <div class="pfs">
    <header class="pfs__head">
      <div>
        <span class="pfs__eyebrow">Security preflight</span>
        <h3 class="pfs__title">{{ scenario.title }}</h3>
      </div>

      <div class="pfs__controls" role="tablist" aria-label="Context scenarios">
        <button
          v-for="option in scenarios"
          :key="option.id"
          type="button"
          class="pfs__tab"
          :class="{ 'pfs__tab--active': current === option.id }"
          :aria-selected="current === option.id"
          @click="current = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <section class="pfs__callout" :class="`pfs__callout--${scenario.severity}`" role="status">
      <span class="pfs__callout-title">{{ scenario.title }}</span>
      <span class="pfs__callout-detail">{{ scenario.detail }}</span>
      <code class="pfs__origin">{{ scenario.origin }}</code>
    </section>

    <div class="pfs__facts">
      <div class="pfs__fact">
        <span class="pfs__fact-label">Current environment</span>
        <span class="pfs__fact-value">{{ isSecureContext ? 'Secure context' : 'Not secure' }}</span>
      </div>
      <div class="pfs__fact">
        <span class="pfs__fact-label">What to do</span>
        <span class="pfs__fact-value">{{ scenario.fix }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type ContextScenario = 'http' | 'localhost' | 'https'

const scenarios = [
  {
    id: 'http' as ContextScenario,
    label: 'HTTP',
    severity: 'bad',
    title: 'Media APIs are blocked on insecure origins',
    detail:
      'The UI must stop before the user hits “Call” and explain that `getUserMedia` is unavailable on plain HTTP.',
    origin: 'http://demo.example.test',
    fix: 'Serve the app over HTTPS or use localhost during development.',
  },
  {
    id: 'localhost' as ContextScenario,
    label: 'Localhost',
    severity: 'ok',
    title: 'Local development is allowed',
    detail: 'Browsers treat localhost as secure enough for camera and microphone development.',
    origin: 'http://localhost:5173',
    fix: 'Use localhost or 127.0.0.1 while iterating locally.',
  },
  {
    id: 'https' as ContextScenario,
    label: 'HTTPS',
    severity: 'ok',
    title: 'Production context is valid',
    detail:
      'Once HTTPS is in place, the remaining failures should come from browser permission state or missing devices.',
    origin: 'https://phone.example.com',
    fix: 'Keep TLS valid and avoid mixed-content resources that downgrade trust.',
  },
]

const current = ref<ContextScenario>('http')
const scenario = computed(
  () => scenarios.find((option) => option.id === current.value) ?? scenarios[0]
)
const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : false
</script>

<style scoped>
.pfs {
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

.pfs__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pfs__eyebrow,
.pfs__fact-label {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfs__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.pfs__controls {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pfs__tab {
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

.pfs__tab--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.pfs__callout {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
}

.pfs__callout--bad {
  border-left: 4px solid #b91c1c;
  background: color-mix(in srgb, #b91c1c 10%, var(--paper));
}

.pfs__callout--ok {
  border-left: 4px solid #15803d;
}

.pfs__callout-title {
  font-weight: 700;
}

.pfs__callout-detail {
  color: var(--muted);
  font-size: 0.82rem;
}

.pfs__origin {
  width: fit-content;
  padding: 0.14rem 0.35rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
  color: var(--accent);
}

.pfs__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.45rem;
}

.pfs__fact {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pfs__fact-value {
  font-size: 0.88rem;
}
</style>
