<template>
  <div class="stp">
    <header class="stp__head">
      <div>
        <span class="stp__eyebrow">Preferences · per-user</span>
        <h3 class="stp__title">Behaviour &amp; notifications</h3>
      </div>
      <span class="stp__dirty" :class="{ 'stp__dirty--on': dirty }">{{ dirty ? 'UNSAVED' : 'SAVED' }}</span>
    </header>

    <section class="stp__group">
      <span class="stp__group-title">Call handling</span>
      <ul class="stp__list" role="list">
        <li class="stp__row">
          <div class="stp__label">
            <strong>Auto-answer on paging</strong>
            <p>Speaker engages without ring on intercom / page.</p>
          </div>
          <label class="stp__switch">
            <input type="checkbox" v-model="prefs.autoAnswer" @change="dirty = true" />
            <span>{{ prefs.autoAnswer ? 'On' : 'Off' }}</span>
          </label>
        </li>
        <li class="stp__row">
          <div class="stp__label">
            <strong>Do not disturb default</strong>
            <p>Applied every morning until you dial <code>*79</code>.</p>
          </div>
          <label class="stp__switch">
            <input type="checkbox" v-model="prefs.dndDefault" @change="dirty = true" />
            <span>{{ prefs.dndDefault ? 'On' : 'Off' }}</span>
          </label>
        </li>
        <li class="stp__row">
          <div class="stp__label">
            <strong>Ring duration (seconds)</strong>
            <p>Before falling through to voicemail or fail-over.</p>
          </div>
          <input
            v-model.number="prefs.ringSeconds"
            type="number" min="5" max="120"
            class="stp__input"
            inputmode="numeric"
            @input="dirty = true"
          />
        </li>
      </ul>
    </section>

    <section class="stp__group">
      <span class="stp__group-title">Audio &amp; devices</span>
      <ul class="stp__list" role="list">
        <li class="stp__row">
          <div class="stp__label">
            <strong>Preferred codec</strong>
            <p>Negotiated first; peers can still downgrade.</p>
          </div>
          <select v-model="prefs.codec" class="stp__input" @change="dirty = true">
            <option value="opus">opus/48000</option>
            <option value="g722">g722/8000 (HD wideband)</option>
            <option value="pcmu">pcmu/8000 (μ-law)</option>
            <option value="pcma">pcma/8000 (a-law)</option>
          </select>
        </li>
        <li class="stp__row">
          <div class="stp__label">
            <strong>Echo cancellation</strong>
            <p>Browser-side AEC; disable only for pro audio setups.</p>
          </div>
          <label class="stp__switch">
            <input type="checkbox" v-model="prefs.aec" @change="dirty = true" />
            <span>{{ prefs.aec ? 'On' : 'Off' }}</span>
          </label>
        </li>
        <li class="stp__row">
          <div class="stp__label">
            <strong>Noise suppression</strong>
            <p>Native <code>getUserMedia</code> constraint; Opus DTX is preferred when peered.</p>
          </div>
          <label class="stp__switch">
            <input type="checkbox" v-model="prefs.ns" @change="dirty = true" />
            <span>{{ prefs.ns ? 'On' : 'Off' }}</span>
          </label>
        </li>
      </ul>
    </section>

    <section class="stp__group">
      <span class="stp__group-title">Notifications</span>
      <ul class="stp__list" role="list">
        <li class="stp__row">
          <div class="stp__label">
            <strong>Missed-call email</strong>
            <p>Sent to {{ email }} after the ring window elapses.</p>
          </div>
          <label class="stp__switch">
            <input type="checkbox" v-model="prefs.missedEmail" @change="dirty = true" />
            <span>{{ prefs.missedEmail ? 'On' : 'Off' }}</span>
          </label>
        </li>
        <li class="stp__row">
          <div class="stp__label">
            <strong>Voicemail transcript</strong>
            <p>Whisper-level transcript attached to the notification.</p>
          </div>
          <label class="stp__switch">
            <input type="checkbox" v-model="prefs.vmTranscript" @change="dirty = true" />
            <span>{{ prefs.vmTranscript ? 'On' : 'Off' }}</span>
          </label>
        </li>
      </ul>
    </section>

    <footer class="stp__actions">
      <button type="button" class="stp__btn" @click="dirty = false">Discard</button>
      <button type="button" class="stp__btn stp__btn--primary" :disabled="!dirty" @click="dirty = false">Save preferences</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const email = 'alex.rivera@example.com'

const prefs = reactive({
  autoAnswer: false,
  dndDefault: false,
  ringSeconds: 30,
  codec: 'opus',
  aec: true,
  ns: true,
  missedEmail: true,
  vmTranscript: true,
})

const dirty = ref(false)
</script>

<style scoped>
.stp {
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

.stp__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.stp__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.stp__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.stp__dirty {
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.3rem 0.5rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.stp__dirty--on { color: var(--accent); border-color: var(--accent); }

.stp__group {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.65rem 0.8rem;
  display: flex; flex-direction: column; gap: 0.4rem;
}
.stp__group-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.stp__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.stp__row {
  display: grid; grid-template-columns: 1fr auto;
  gap: 0.75rem; align-items: center;
  padding: 0.45rem 0;
  border-bottom: 1px dashed var(--rule);
}
.stp__row:last-child { border-bottom: 0; }
.stp__label strong { display: block; font-size: 0.88rem; font-weight: 600; }
.stp__label p { margin: 0.2rem 0 0; font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
.stp__label code {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}

.stp__switch {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.3rem 0.55rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  cursor: pointer;
}
.stp__switch:has(input:checked) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--accent); color: var(--accent);
}

.stp__input {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.3rem 0.5rem;
  font-family: var(--mono); font-size: 0.8rem; color: var(--ink);
  font-variant-numeric: tabular-nums;
  max-width: 12rem;
}

.stp__actions {
  display: flex; gap: 0.4rem; justify-content: flex-end;
  padding-top: 0.3rem; border-top: 1px dashed var(--rule);
}
.stp__btn {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.stp__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.stp__btn--primary { background: var(--accent); border-color: var(--accent); color: var(--paper); }
</style>
