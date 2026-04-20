<template>
  <div class="pkf">
    <header class="pkf__head">
      <div>
        <span class="pkf__eyebrow">features.conf · [parkinglot_default]</span>
        <h3 class="pkf__title">Parking lot settings</h3>
      </div>
    </header>

    <dl class="pkf__grid">
      <div class="pkf__field">
        <dt>Park extension</dt>
        <dd>
          <input
            v-model="cfg.parkExt"
            type="text"
            inputmode="numeric"
            class="pkf__input pkf__input--short"
          />
          <span class="pkf__hint">Dial or transfer here to park.</span>
        </dd>
      </div>
      <div class="pkf__field">
        <dt>Slot range</dt>
        <dd>
          <div class="pkf__row">
            <input v-model="cfg.slotStart" type="number" class="pkf__input pkf__input--short" />
            <span>to</span>
            <input v-model="cfg.slotEnd" type="number" class="pkf__input pkf__input--short" />
          </div>
          <span class="pkf__hint">Leave ≥8 free slots; small lots fill up during escalations.</span>
        </dd>
      </div>
      <div class="pkf__field">
        <dt>Timeout (seconds)</dt>
        <dd>
          <input
            v-model="cfg.timeout"
            type="number"
            min="10"
            max="600"
            class="pkf__input pkf__input--short"
          />
          <span class="pkf__hint"
            >After this, the call returns to the parker. 45s is the classic default.</span
          >
        </dd>
      </div>
      <div class="pkf__field">
        <dt>Return rule</dt>
        <dd>
          <div class="pkf__options" role="radiogroup" aria-label="Return rule">
            <button
              v-for="r in returnRules"
              :key="r.id"
              type="button"
              class="pkf__option"
              :class="{ 'pkf__option--on': cfg.returnRule === r.id }"
              role="radio"
              :aria-checked="cfg.returnRule === r.id"
              @click="cfg.returnRule = r.id"
            >
              <span class="pkf__option-label">{{ r.label }}</span>
              <span class="pkf__option-desc">{{ r.desc }}</span>
            </button>
          </div>
        </dd>
      </div>
      <div class="pkf__field">
        <dt>Music on hold</dt>
        <dd>
          <select v-model="cfg.moh" class="pkf__input">
            <option value="default">default (mohmgr)</option>
            <option value="jazz">jazz (licensed)</option>
            <option value="brand">brand-loop-2026</option>
            <option value="none">None (silence)</option>
          </select>
          <span class="pkf__hint"
            >Parkees hear this; choose something neutral. Rickrolls are a firing offence.</span
          >
        </dd>
      </div>
      <div class="pkf__field">
        <dt>Announce slot to parker</dt>
        <dd>
          <label class="pkf__toggle">
            <input type="checkbox" v-model="cfg.announce" />
            <span>{{
              cfg.announce ? 'Speak slot number back' : 'Silent park (display only)'
            }}</span>
          </label>
          <span class="pkf__hint"
            >Silent park works only if the handset shows slot info on its screen — half of them
            don't.</span
          >
        </dd>
      </div>
    </dl>

    <section class="pkf__preview">
      <span class="pkf__preview-title">Generated config</span>
      <pre class="pkf__code">
[parkinglot_{{ cfg.name }}]
context = parkedcalls
parkext = {{ cfg.parkExt }}
parkpos = {{ cfg.slotStart }}-{{ cfg.slotEnd }}
parkingtime = {{ cfg.timeout }}
comebacktoorigin = {{ cfg.returnRule === 'origin' ? 'yes' : 'no' }}
comebackcontext = {{ cfg.returnRule === 'context' ? 'parkedcallstimeout' : 'default' }}
parkedmusicclass = {{ cfg.moh }}
parkedplay = {{ cfg.announce ? 'caller,callee' : 'callee' }}
</pre
      >
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const returnRules = [
  { id: 'origin', label: 'Back to parker', desc: 'Rings the phone that parked the call.' },
  { id: 'context', label: 'Timeout context', desc: 'Sends to [parkedcallstimeout] dialplan.' },
  { id: 'drop', label: 'Hang up', desc: 'Not recommended; callers think you ghosted them.' },
]

const cfg = reactive({
  name: 'default',
  parkExt: '700',
  slotStart: 701,
  slotEnd: 720,
  timeout: 45,
  returnRule: 'origin',
  moh: 'default',
  announce: true,
})
</script>

<style scoped>
.pkf {
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

.pkf__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pkf__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.pkf__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.pkf__grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin: 0;
}
.pkf__field {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pkf__field dt {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.pkf__field dd {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pkf__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.5rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.pkf__input--short {
  max-width: 6rem;
}
.pkf__row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--muted);
}
.pkf__hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.pkf__options {
  display: grid;
  gap: 0.3rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}
.pkf__option {
  text-align: left;
  cursor: pointer;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-family: var(--sans);
  color: var(--ink);
  transition: all 0.12s;
}
.pkf__option:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.pkf__option--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.pkf__option-label {
  font-weight: 600;
  font-size: 0.8rem;
}
.pkf__option-desc {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
}

.pkf__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.74rem;
  color: var(--ink);
}

.pkf__preview {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.pkf__preview-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.pkf__code {
  margin: 0;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  font-family: var(--mono);
  font-size: 0.74rem;
  line-height: 1.5;
  color: var(--ink);
  overflow-x: auto;
}
</style>
