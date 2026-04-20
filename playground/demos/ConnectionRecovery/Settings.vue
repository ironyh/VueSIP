<template>
  <div class="crs">
    <header class="crs__head">
      <div>
        <span class="crs__eyebrow">Recovery policy</span>
        <h3 class="crs__title">{{ summary }}</h3>
      </div>
    </header>

    <section class="crs__section">
      <span class="crs__section-title">Keepalive</span>
      <ul class="crs__rows" role="list">
        <li class="crs__row">
          <label>
            <span class="crs__k">WebSocket ping</span>
            <input
              type="number"
              min="5"
              max="300"
              v-model.number="state.wsPing"
              class="crs__input"
            />
            <span class="crs__u">seconds</span>
            <span class="crs__hint"
              >CRLF frame on the SIP WebSocket; stock RFC 7118 behaviour.</span
            >
          </label>
        </li>
        <li class="crs__row">
          <label>
            <span class="crs__k">SIP OPTIONS</span>
            <input
              type="number"
              min="30"
              max="900"
              v-model.number="state.sipOptions"
              class="crs__input"
            />
            <span class="crs__u">seconds</span>
            <span class="crs__hint"
              >Per-dialog heartbeat to the registrar. Also doubles as NAT binding refresh.</span
            >
          </label>
        </li>
      </ul>
    </section>

    <section class="crs__section">
      <span class="crs__section-title">Retry policy</span>
      <ul class="crs__rows" role="list">
        <li class="crs__row">
          <label>
            <span class="crs__k">Backoff base</span>
            <input
              type="number"
              min="100"
              max="5000"
              v-model.number="state.backoffBase"
              class="crs__input"
            />
            <span class="crs__u">ms</span>
          </label>
        </li>
        <li class="crs__row">
          <label>
            <span class="crs__k">Max attempts</span>
            <input
              type="number"
              min="1"
              max="20"
              v-model.number="state.maxAttempts"
              class="crs__input"
            />
            <span class="crs__u">count</span>
          </label>
        </li>
        <li class="crs__row">
          <label>
            <span class="crs__k">Jitter</span>
            <input type="checkbox" v-model="state.jitter" class="crs__cb" />
            <span class="crs__u">enabled</span>
            <span class="crs__hint"
              >±50% on each attempt — prevents thundering herd after server restart.</span
            >
          </label>
        </li>
      </ul>
    </section>

    <section class="crs__section">
      <span class="crs__section-title">Fallback transport</span>
      <div class="crs__radios" role="radiogroup" aria-label="Fallback">
        <button
          v-for="t in transports"
          :key="t.id"
          type="button"
          class="crs__radio"
          :class="{ 'crs__radio--on': state.fallback === t.id }"
          role="radio"
          :aria-checked="state.fallback === t.id"
          @click="state.fallback = t.id"
        >
          <span class="crs__radio-label">{{ t.label }}</span>
          <span class="crs__radio-desc">{{ t.desc }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

type Fallback = 'none' | 'ws' | 'tcp' | 'udp'

const transports: Array<{ id: Fallback; label: string; desc: string }> = [
  { id: 'none', label: 'None', desc: 'Surface the failure — fail fast, retry later.' },
  {
    id: 'ws',
    label: 'wss → ws',
    desc: 'Drop TLS on retry. Last-resort only; auth might need rework.',
  },
  {
    id: 'tcp',
    label: 'WSS → SIP/TCP',
    desc: 'Rare — requires a SIP-TCP edge your client can speak to directly.',
  },
  { id: 'udp', label: 'WSS → SIP/UDP', desc: 'Mobile native only; browsers cannot originate UDP.' },
]

const state = reactive({
  wsPing: 30,
  sipOptions: 120,
  backoffBase: 200,
  maxAttempts: 7,
  jitter: true,
  fallback: 'none' as Fallback,
})

const summary = computed(() => {
  const parts = [
    `ping ${state.wsPing}s`,
    `OPTIONS ${state.sipOptions}s`,
    `retry ×${state.maxAttempts}`,
  ]
  if (state.fallback !== 'none') parts.push(`fallback ${state.fallback}`)
  return parts.join(' · ')
})
</script>

<style scoped>
.crs {
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
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}

.crs__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.crs__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.crs__title {
  margin: 0.1rem 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  letter-spacing: 0.04em;
}

.crs__section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.crs__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.crs__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.crs__row {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.8rem;
}
.crs__row label {
  display: grid;
  grid-template-columns: 11rem 7rem auto;
  gap: 0.25rem 0.8rem;
  align-items: baseline;
}
.crs__k {
  font-weight: 600;
  font-size: 0.88rem;
}
.crs__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.5rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.crs__input:focus {
  outline: none;
  border-color: var(--accent);
}
.crs__cb {
  accent-color: var(--accent);
  justify-self: start;
}
.crs__u {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.crs__hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  grid-column: 1 / -1;
}

.crs__radios {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.4rem;
}
.crs__radio {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-family: var(--sans);
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}
.crs__radio:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.crs__radio--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.crs__radio-label {
  font-weight: 600;
  font-size: 0.88rem;
}
.crs__radio-desc {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
}
</style>
