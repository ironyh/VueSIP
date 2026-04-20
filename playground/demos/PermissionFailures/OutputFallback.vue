<template>
  <div class="pfo">
    <header class="pfo__head">
      <div>
        <span class="pfo__eyebrow">Speaker routing</span>
        <h3 class="pfo__title">{{ state.title }}</h3>
      </div>

      <div class="pfo__controls" role="tablist" aria-label="Output scenarios">
        <button
          v-for="option in scenarios"
          :key="option.id"
          type="button"
          class="pfo__tab"
          :class="{ 'pfo__tab--active': current === option.id }"
          :aria-selected="current === option.id"
          @click="current = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <section class="pfo__shell" :class="`pfo__shell--${state.severity}`">
      <div class="pfo__summary">
        <span class="pfo__summary-title">{{ state.title }}</span>
        <span class="pfo__summary-detail">{{ state.detail }}</span>
      </div>

      <ul class="pfo__devices">
        <li
          v-for="device in state.devices"
          :key="device.id"
          class="pfo__device"
          :class="{ 'pfo__device--offline': !device.available, 'pfo__device--selected': device.selected }"
        >
          <span class="pfo__device-name">{{ device.name }}</span>
          <span class="pfo__device-meta">{{ device.meta }}</span>
        </li>
      </ul>
    </section>

    <p class="pfo__hint">{{ state.hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type OutputScenario = 'default-only' | 'missing-output' | 'bluetooth-lost'

const scenarios = [
  {
    id: 'default-only' as OutputScenario,
    label: 'Default only',
    severity: 'warn',
    title: 'Only the system default speaker is available',
    detail: 'The browser cannot expose a separate output list yet. Fall back gracefully and explain the limit.',
    hint: 'If `setSinkId` is unavailable, collapse speaker selection and explain that output follows the system default device.',
    devices: [
      { id: 'default', name: 'System default output', meta: 'Fallback route', available: true, selected: true },
    ],
  },
  {
    id: 'missing-output' as OutputScenario,
    label: 'No outputs',
    severity: 'bad',
    title: 'No audio output devices detected',
    detail: 'The app cannot promise playback. It should surface the problem before the user places a call.',
    hint: 'Swap the picker for a troubleshooting card: check headset battery, OS output, and whether the browser can see speakers at all.',
    devices: [],
  },
  {
    id: 'bluetooth-lost' as OutputScenario,
    label: 'Bluetooth lost',
    severity: 'warn',
    title: 'Previously selected headset disappeared',
    detail: 'Rebind audio to the default device and explain what changed.',
    hint: 'Keep the old label visible long enough for the user to understand why audio moved back to laptop speakers.',
    devices: [
      { id: 'default', name: 'MacBook Speakers', meta: 'Fallback route', available: true, selected: true },
      { id: 'bt', name: 'Jabra Evolve2 65', meta: 'Disconnected', available: false, selected: false },
    ],
  },
]

const current = ref<OutputScenario>('bluetooth-lost')
const state = computed(() => scenarios.find((option) => option.id === current.value) ?? scenarios[0])
</script>

<style scoped>
.pfo {
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

.pfo__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pfo__eyebrow,
.pfo__device-meta,
.pfo__hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.pfo__eyebrow {
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.pfo__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.pfo__controls {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pfo__tab {
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

.pfo__tab--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.pfo__shell {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
}

.pfo__shell--warn {
  border-left: 4px solid #d97706;
}

.pfo__shell--bad {
  border-left: 4px solid #b91c1c;
  background: color-mix(in srgb, #b91c1c 8%, var(--paper));
}

.pfo__summary {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.pfo__summary-title {
  font-weight: 700;
}

.pfo__summary-detail {
  color: var(--muted);
  font-size: 0.82rem;
}

.pfo__devices {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.pfo__device {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
  padding: 0.55rem 0.7rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: baseline;
}

.pfo__device--selected {
  border-color: var(--accent);
}

.pfo__device--offline {
  opacity: 0.55;
}
</style>
