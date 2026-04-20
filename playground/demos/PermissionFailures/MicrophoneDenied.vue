<template>
  <div class="pfd">
    <header class="pfd__head">
      <div>
        <span class="pfd__eyebrow">Microphone access</span>
        <h3 class="pfd__title">{{ state.title }}</h3>
      </div>

      <div class="pfd__controls" role="tablist" aria-label="Permission state">
        <button
          v-for="option in states"
          :key="option.id"
          type="button"
          class="pfd__tab"
          :class="{ 'pfd__tab--active': current === option.id }"
          :aria-selected="current === option.id"
          @click="current = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <section class="pfd__banner" :class="`pfd__banner--${state.severity}`" role="status">
      <span class="pfd__banner-title">{{ state.title }}</span>
      <span class="pfd__banner-detail">{{ state.detail }}</span>
      <div class="pfd__actions">
        <button type="button" class="pfd__btn pfd__btn--primary">
          {{ current === 'denied' ? 'Open browser settings' : 'Request microphone' }}
        </button>
        <button v-if="current === 'denied'" type="button" class="pfd__btn">Use chat instead</button>
      </div>
    </section>

    <ul class="pfd__list">
      <li v-for="item in state.checklist" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

type PermissionState = 'prompt' | 'denied' | 'granted'

const states = [
  {
    id: 'prompt' as PermissionState,
    label: 'Prompt',
    severity: 'warn',
    title: 'Microphone permission needed',
    detail: 'Ask once, explain why, and keep the request attached to a user gesture.',
    checklist: [
      'Explain why audio access is needed before the browser prompt appears.',
      'Keep the request button enabled only after a user gesture.',
      'Show a non-blocking fallback if the user wants to continue without calling.',
    ],
  },
  {
    id: 'denied' as PermissionState,
    label: 'Denied',
    severity: 'bad',
    title: 'Microphone is blocked',
    detail:
      'The browser will not prompt again automatically. The UI has to explain how to recover.',
    checklist: [
      'Replace retry loops with a clear “Open browser settings” action.',
      'Preserve the chosen dial target or message draft so the user does not lose work.',
      'Offer alternate channels such as chat, callback, or PSTN handoff.',
    ],
  },
  {
    id: 'granted' as PermissionState,
    label: 'Granted',
    severity: 'ok',
    title: 'Microphone is available',
    detail: 'Permission is healthy. Collapse the failure UI back to a compact confirmation state.',
    checklist: [
      'Show the selected input device and live level meter.',
      'Collapse failure guidance to avoid scaring users who already fixed the issue.',
    ],
  },
]

const current = ref<PermissionState>('denied')
const state = computed(() => states.find((option) => option.id === current.value) ?? states[0])
</script>

<style scoped>
.pfd {
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

.pfd__head {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.pfd__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.pfd__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.pfd__controls,
.pfd__actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pfd__tab,
.pfd__btn {
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

.pfd__tab--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--paper));
}

.pfd__btn--primary {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.pfd__banner {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
}

.pfd__banner--warn {
  border-left: 4px solid #d97706;
}

.pfd__banner--bad {
  border-left: 4px solid #b91c1c;
  background: color-mix(in srgb, #b91c1c 10%, var(--paper));
}

.pfd__banner--ok {
  border-left: 4px solid #15803d;
}

.pfd__banner-title {
  font-weight: 700;
}

.pfd__banner-detail {
  color: var(--muted);
  font-size: 0.82rem;
}

.pfd__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pfd__list li {
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  font-size: 0.84rem;
}
</style>
