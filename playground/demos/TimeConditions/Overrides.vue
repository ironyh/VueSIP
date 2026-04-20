<template>
  <div class="tco">
    <header class="tco__head">
      <div>
        <span class="tco__eyebrow">Manual override</span>
        <h3 class="tco__title">{{ override.mode.toUpperCase() }} · until {{ override.until }}</h3>
      </div>
      <span class="tco__dot" :class="`tco__dot--${override.mode}`" aria-hidden="true"></span>
    </header>

    <div class="tco__modes" role="radiogroup" aria-label="Override">
      <button
        v-for="m in modes"
        :key="m.id"
        type="button"
        class="tco__mode"
        :class="{ 'tco__mode--on': override.mode === m.id }"
        role="radio"
        :aria-checked="override.mode === m.id"
        @click="override.mode = m.id"
      >
        <span class="tco__mode-label">{{ m.label }}</span>
        <span class="tco__mode-desc">{{ m.desc }}</span>
      </button>
    </div>

    <section class="tco__section">
      <span class="tco__section-title">Duration</span>
      <ul class="tco__durations" role="list">
        <li v-for="d in durations" :key="d.label">
          <button
            type="button"
            class="tco__dur"
            :class="{ 'tco__dur--on': override.until === d.label }"
            @click="override.until = d.label"
          >
            {{ d.label }}
          </button>
        </li>
      </ul>
    </section>

    <section class="tco__section">
      <span class="tco__section-title">Recent overrides</span>
      <ol class="tco__log" role="list">
        <li v-for="e in history" :key="e.at" class="tco__log-row">
          <span class="tco__log-at">{{ e.at }}</span>
          <span class="tco__log-by">{{ e.by }}</span>
          <span class="tco__log-mode" :class="`tco__log-mode--${e.mode}`">{{ e.mode }}</span>
          <span class="tco__log-reason">{{ e.reason }}</span>
        </li>
      </ol>
    </section>

    <footer class="tco__foot">
      <span
        >Override flips the <code>ASTDB(timecondition/support)</code> key; dialplan reads it before
        evaluating <code>GotoIfTime()</code>. Survives
        <code>asterisk -rx "core restart"</code>.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

type Mode = 'auto' | 'open' | 'closed'

const modes: Array<{ id: Mode; label: string; desc: string }> = [
  { id: 'auto', label: 'Auto', desc: 'Follow the weekly schedule and holidays.' },
  { id: 'open', label: 'Force open', desc: 'Treat as open regardless of schedule.' },
  { id: 'closed', label: 'Force closed', desc: 'Route to after-hours menu or voicemail.' },
]

const durations = [
  { label: '1 hour' },
  { label: '2 hours' },
  { label: 'Rest of day' },
  { label: 'Until Mon 09:00' },
  { label: 'Indefinite' },
]

const override = reactive({
  mode: 'auto' as Mode,
  until: 'Indefinite',
})

const history = [
  { at: 'Mar 14 14:02', by: 'alex@support', mode: 'closed' as Mode, reason: 'All-hands offsite' },
  {
    at: 'Mar 08 08:47',
    by: 'priya@ops',
    mode: 'open' as Mode,
    reason: 'Early-bird launch support',
  },
  {
    at: 'Feb 29 16:15',
    by: 'jordan@support',
    mode: 'closed' as Mode,
    reason: 'Snow day — east coast',
  },
  { at: 'Feb 22 11:00', by: 'auto', mode: 'open' as Mode, reason: 'Returned to schedule' },
]
</script>

<style scoped>
.tco {
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

.tco__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.tco__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.tco__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.tco__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.tco__dot--auto {
  background: var(--muted);
}
.tco__dot--open {
  background: #15803d;
}
.tco__dot--closed {
  background: #b91c1c;
}

.tco__modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.35rem;
}
.tco__mode {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: left;
  font-family: var(--sans);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.tco__mode:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.tco__mode--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.tco__mode-label {
  font-weight: 600;
  font-size: 0.9rem;
}
.tco__mode-desc {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.tco__section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.tco__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.tco__durations {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}
.tco__dur {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  cursor: pointer;
}
.tco__dur--on {
  color: var(--paper);
  background: var(--accent);
  border-color: var(--accent);
}

.tco__log {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.tco__log-row {
  display: grid;
  grid-template-columns: 9rem 10rem 5rem 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
@media (max-width: 600px) {
  .tco__log-row {
    grid-template-columns: 1fr;
  }
}
.tco__log-at {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.tco__log-by {
  font-family: var(--mono);
  font-size: 0.74rem;
  color: var(--ink);
}
.tco__log-mode {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 2px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  color: var(--muted);
  text-align: center;
}
.tco__log-mode--open {
  color: #15803d;
  border-color: #15803d;
}
.tco__log-mode--closed {
  color: #b91c1c;
  border-color: #b91c1c;
}
.tco__log-reason {
  font-size: 0.82rem;
  color: var(--ink);
}

.tco__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.tco__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
