<template>
  <div class="cwb">
    <header class="cwb__head">
      <div>
        <span class="cwb__eyebrow">Call-waiting behaviour</span>
        <h3 class="cwb__title">Policy for second-line INVITEs</h3>
      </div>
      <label class="cwb__master">
        <input type="checkbox" v-model="enabled" />
        <span class="cwb__master-track" aria-hidden="true">
          <span class="cwb__master-thumb" />
        </span>
        <span class="cwb__master-label">{{ enabled ? 'Enabled' : 'Disabled' }}</span>
      </label>
    </header>

    <section class="cwb__section">
      <span class="cwb__section-title">Max concurrent calls</span>
      <div class="cwb__counter">
        <button type="button" class="cwb__counter-btn" @click="decr" :disabled="max <= 1" aria-label="Decrease">−</button>
        <span class="cwb__counter-v">{{ max }}</span>
        <button type="button" class="cwb__counter-btn" @click="incr" :disabled="max >= 8" aria-label="Increase">+</button>
        <span class="cwb__counter-hint">Including the active one. Set to 1 to behave like a pre-2005 desk phone.</span>
      </div>
    </section>

    <section class="cwb__section">
      <span class="cwb__section-title">When a second call arrives</span>
      <div class="cwb__actions" role="radiogroup" aria-label="Second call behaviour">
        <button
          v-for="a in secondBehaviour"
          :key="a.id"
          type="button"
          class="cwb__action"
          :class="{ 'cwb__action--on': second === a.id }"
          role="radio"
          :aria-checked="second === a.id"
          @click="second = a.id"
        >
          <span class="cwb__action-label">{{ a.label }}</span>
          <span class="cwb__action-desc">{{ a.desc }}</span>
          <span class="cwb__action-code">{{ a.code }}</span>
        </button>
      </div>
    </section>

    <section class="cwb__section">
      <span class="cwb__section-title">When line cap reached</span>
      <div class="cwb__actions" role="radiogroup" aria-label="Overflow behaviour">
        <button
          v-for="a in overflowBehaviour"
          :key="a.id"
          type="button"
          class="cwb__action"
          :class="{ 'cwb__action--on': overflow === a.id }"
          role="radio"
          :aria-checked="overflow === a.id"
          @click="overflow = a.id"
        >
          <span class="cwb__action-label">{{ a.label }}</span>
          <span class="cwb__action-desc">{{ a.desc }}</span>
          <span class="cwb__action-code">{{ a.code }}</span>
        </button>
      </div>
    </section>

    <section class="cwb__section">
      <span class="cwb__section-title">Tone & hold-music</span>
      <ul class="cwb__opts" role="list">
        <li class="cwb__opt">
          <label class="cwb__opt-label">
            <input type="checkbox" v-model="opts.beepLocal" />
            <span>Play call-waiting tone locally (not via RTP)</span>
          </label>
          <span class="cwb__opt-hint">440 Hz, 200 ms, twice — classic CW pattern.</span>
        </li>
        <li class="cwb__opt">
          <label class="cwb__opt-label">
            <input type="checkbox" v-model="opts.mohOnHold" />
            <span>Stream MOH to the held party</span>
          </label>
          <span class="cwb__opt-hint">
            Most PBXs own this — toggle off if Asterisk <code>musiconhold</code> is already active.
          </span>
        </li>
        <li class="cwb__opt">
          <label class="cwb__opt-label">
            <input type="checkbox" v-model="opts.stopTone" />
            <span>Stop tone on user gesture</span>
          </label>
          <span class="cwb__opt-hint">Any keypress or click kills the tone even without answering.</span>
        </li>
        <li class="cwb__opt">
          <label class="cwb__opt-label">
            <input type="checkbox" v-model="opts.vipBypass" />
            <span>VIP callers bypass DND / max-calls cap</span>
          </label>
          <span class="cwb__opt-hint">Reads P-Asserted-Identity or a local allowlist.</span>
        </li>
      </ul>
    </section>

    <footer class="cwb__summary">
      <span class="cwb__summary-title">Effective policy</span>
      <p class="cwb__summary-text">
        <strong>{{ enabled ? `Up to ${max} concurrent calls.` : 'Single-call mode.' }}</strong>
        Second call → <em>{{ secondLabel }}</em>.
        Overflow → <em>{{ overflowLabel }}</em>.
        {{ opts.vipBypass ? 'VIP bypass active.' : '' }}
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type SecondId = 'tone-only' | 'tone-auto-hold' | 'auto-answer' | 'reject'
type OverflowId = 'busy' | 'voicemail' | 'forward' | 'silent'

const enabled = ref(true)
const max = ref(3)
const incr = () => max.value++
const decr = () => max.value--

const secondBehaviour: { id: SecondId; label: string; desc: string; code: string }[] = [
  { id: 'tone-only', label: 'Tone, wait for user', desc: 'Play local call-waiting tone. User picks up or rejects manually.', code: 'SIP 180 Ringing' },
  { id: 'tone-auto-hold', label: 'Tone, auto-hold on answer', desc: 'When user answers, hold the active call automatically.', code: 're-INVITE a=sendonly' },
  { id: 'auto-answer', label: 'Auto-hold, auto-answer', desc: 'Aggressive — useful for dispatcher intercom.', code: 'session.accept()' },
  { id: 'reject', label: 'Silently reject', desc: 'Never ring a second call.', code: 'SIP 486 Busy Here' },
]
const second = ref<SecondId>('tone-auto-hold')
const secondLabel = computed(() => secondBehaviour.find((a) => a.id === second.value)!.label)

const overflowBehaviour: { id: OverflowId; label: string; desc: string; code: string }[] = [
  { id: 'busy', label: 'Busy Here', desc: 'Return 486; caller hears busy or goes to their own voicemail.', code: 'SIP 486' },
  { id: 'voicemail', label: 'Forward to voicemail', desc: 'Server-side redirect to vm@domain.', code: 'SIP 302 Moved · Contact: sip:vm@…' },
  { id: 'forward', label: 'Forward to coverage number', desc: 'Redirect to a colleague or mobile.', code: 'SIP 302 · Contact: sip:+…' },
  { id: 'silent', label: 'Silent drop', desc: 'Accept then immediately BYE — hides your presence.', code: '200 OK → BYE' },
]
const overflow = ref<OverflowId>('voicemail')
const overflowLabel = computed(() => overflowBehaviour.find((a) => a.id === overflow.value)!.label)

const opts = reactive({
  beepLocal: true,
  mohOnHold: false,
  stopTone: true,
  vipBypass: true,
})
</script>

<style scoped>
.cwb {
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
  gap: 0.95rem;
  color: var(--ink);
  font-family: var(--sans);
}
.cwb__head {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap;
}
.cwb__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.cwb__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.cwb__master { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.cwb__master input { position: absolute; opacity: 0; pointer-events: none; }
.cwb__master-track {
  width: 40px; height: 20px; background: var(--rule); border-radius: 999px;
  position: relative; transition: background 0.15s;
}
.cwb__master-thumb {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  background: var(--paper); border-radius: 50%; transition: transform 0.15s;
}
.cwb__master input:checked + .cwb__master-track { background: var(--accent); }
.cwb__master input:checked + .cwb__master-track .cwb__master-thumb { transform: translateX(20px); }
.cwb__master-label {
  font-family: var(--mono); font-size: 0.64rem;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}

.cwb__section { display: flex; flex-direction: column; gap: 0.45rem; }
.cwb__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.cwb__counter {
  display: inline-flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
}
.cwb__counter-btn {
  width: 2.2rem; height: 2.2rem; background: var(--paper); border: 1px solid var(--rule);
  border-radius: 2px; font-family: var(--mono); font-size: 1rem; cursor: pointer;
  color: var(--ink); transition: all 0.12s;
}
.cwb__counter-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
.cwb__counter-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cwb__counter-v {
  min-width: 2.5rem; text-align: center;
  font-family: var(--mono); font-size: 1.4rem; font-weight: 700;
  color: var(--accent); font-variant-numeric: tabular-nums;
}
.cwb__counter-hint {
  flex: 1; min-width: 14rem;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}

.cwb__actions {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.4rem;
}
.cwb__action {
  display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem 0.75rem; text-align: left; color: var(--ink);
  font-family: var(--sans); cursor: pointer; transition: all 0.12s;
}
.cwb__action:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.cwb__action--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.cwb__action-label { font-weight: 600; font-size: 0.88rem; }
.cwb__action-desc { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }
.cwb__action-code {
  font-family: var(--mono); font-size: 0.6rem;
  letter-spacing: 0.08em; color: var(--accent); margin-top: 0.15rem;
}

.cwb__opts { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.cwb__opt {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.75rem; display: flex; flex-direction: column; gap: 0.15rem;
}
.cwb__opt-label {
  display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; cursor: pointer;
}
.cwb__opt-label input { accent-color: var(--accent); }
.cwb__opt-hint {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted); padding-left: 1.5rem;
}
.cwb__opt-hint code {
  padding: 0 0.3rem; background: var(--paper-deep);
  border: 1px solid var(--rule); border-radius: 2px; color: var(--accent);
}

.cwb__summary {
  padding: 0.7rem 0.85rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  display: flex; flex-direction: column; gap: 0.3rem;
}
.cwb__summary-title {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cwb__summary-text {
  margin: 0; font-family: var(--mono); font-size: 0.76rem;
  color: var(--muted); line-height: 1.5;
}
.cwb__summary-text strong { color: var(--ink); font-weight: 700; }
.cwb__summary-text em { color: var(--accent); font-style: normal; font-weight: 600; }
</style>
