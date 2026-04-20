<template>
  <div class="rgs">
    <header class="rgs__head">
      <div>
        <span class="rgs__eyebrow">Strategy · support-west</span>
        <h3 class="rgs__title">{{ state.strategy }} · {{ state.ringTimeout }}s timeout</h3>
      </div>
    </header>

    <section class="rgs__section">
      <span class="rgs__section-title">Ring timing</span>
      <div class="rgs__row">
        <label class="rgs__field">
          <span class="rgs__k">Ring timeout</span>
          <input type="number" v-model.number="state.ringTimeout" min="5" max="120" class="rgs__input" />
          <span class="rgs__u">seconds</span>
        </label>
        <label class="rgs__field">
          <span class="rgs__k">Retry delay</span>
          <input type="number" v-model.number="state.retryDelay" min="0" max="30" class="rgs__input" />
          <span class="rgs__u">seconds</span>
        </label>
      </div>
      <p class="rgs__hint">Asterisk Queue: <code>timeout={{ state.ringTimeout }}</code>, <code>retry={{ state.retryDelay }}</code>. Keep short — users abandon after ~20 s.</p>
    </section>

    <section class="rgs__section">
      <span class="rgs__section-title">Failover</span>
      <ul class="rgs__failover" role="list">
        <li v-for="(step, i) in state.failover" :key="i" class="rgs__step">
          <span class="rgs__step-n">{{ i + 1 }}</span>
          <div class="rgs__step-body">
            <span class="rgs__step-label">{{ step.label }}</span>
            <code class="rgs__step-val">{{ step.target }}</code>
          </div>
          <span class="rgs__step-after">after {{ step.after }}s</span>
        </li>
      </ul>
    </section>

    <section class="rgs__section">
      <span class="rgs__section-title">Music on hold</span>
      <div class="rgs__moh">
        <select v-model="state.moh" class="rgs__select">
          <option v-for="m in mohOptions" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
        <label class="rgs__toggle">
          <input type="checkbox" v-model="state.announcePosition" />
          <span>Announce queue position every 45 s</span>
        </label>
        <label class="rgs__toggle">
          <input type="checkbox" v-model="state.wrapUp" />
          <span>Wrap-up (30 s) after every answered call</span>
        </label>
      </div>
    </section>

    <footer class="rgs__foot">
      <span>Set per-queue in Asterisk <code>queues.conf</code>. Changes pick up on <code>queue reload</code>; no need to touch the dialplan.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const mohOptions = [
  { id: 'default',   label: 'default — Asterisk stock loops' },
  { id: 'jazz-bed',  label: 'jazz-bed — light piano, safe for calls' },
  { id: 'brand-bed', label: 'brand-bed — custom spoken branding' },
  { id: 'silence',   label: 'silence — no MOH (recommended for internal)' },
]

const state = reactive({
  strategy: 'hunt',
  ringTimeout: 22,
  retryDelay: 5,
  moh: 'default',
  announcePosition: true,
  wrapUp: true,
  failover: [
    { label: 'Escalate to backup group', target: 'ring-group:602', after: 45 },
    { label: 'Send to voicemail',        target: 'voicemail:601',  after: 90 },
    { label: 'Page on-call (SMS)',       target: '+14155550199',   after: 120 },
  ],
})
</script>

<style scoped>
.rgs {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex; flex-direction: column; gap: 0.9rem;
  color: var(--ink); font-family: var(--sans);
}

.rgs__head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 0.5rem; }
.rgs__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.rgs__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.rgs__section { display: flex; flex-direction: column; gap: 0.4rem; }
.rgs__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.rgs__row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
@media (max-width: 540px) { .rgs__row { grid-template-columns: 1fr; } }
.rgs__field {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.75rem;
  display: grid; grid-template-columns: 1fr 6rem auto; gap: 0.3rem 0.5rem; align-items: center;
}
.rgs__k { font-weight: 600; font-size: 0.88rem; }
.rgs__u {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
  letter-spacing: 0.05em;
}
.rgs__input {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.5rem;
  font-family: var(--mono); font-size: 0.82rem; color: var(--ink);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.rgs__input:focus { outline: none; border-color: var(--accent); }

.rgs__hint {
  margin: 0;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.rgs__hint code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}

.rgs__failover { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.rgs__step {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.8rem;
  display: grid; grid-template-columns: 2rem 1fr auto; gap: 0.6rem; align-items: center;
}
.rgs__step-n {
  font-family: var(--mono); font-weight: 700; color: var(--accent);
  font-size: 1rem;
  text-align: center;
}
.rgs__step-body { display: flex; flex-direction: column; gap: 0.1rem; }
.rgs__step-label { font-weight: 500; font-size: 0.88rem; }
.rgs__step-val {
  font-family: var(--mono); font-size: 0.72rem; color: var(--muted);
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.1rem 0.35rem;
  width: fit-content;
}
.rgs__step-after {
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.rgs__moh { display: flex; flex-direction: column; gap: 0.45rem; }
.rgs__select {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem 0.6rem;
  font-family: var(--mono); font-size: 0.78rem; color: var(--ink);
}
.rgs__toggle {
  display: inline-flex; align-items: center; gap: 0.45rem;
  font-size: 0.86rem; cursor: pointer;
}
.rgs__toggle input { accent-color: var(--accent); }

.rgs__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.rgs__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
