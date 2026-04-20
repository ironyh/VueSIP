<template>
  <div class="e9e">
    <header class="e9e__head">
      <div>
        <span class="e9e__eyebrow">Location enrolment · {{ status.label }}</span>
        <h3 class="e9e__title">Dispatchable Location (DL)</h3>
      </div>
      <span class="e9e__state" :class="`e9e__state--${status.kind}`">{{ status.code }}</span>
    </header>

    <form class="e9e__form" @submit.prevent>
      <fieldset class="e9e__group">
        <legend class="e9e__legend">Civic address</legend>
        <div class="e9e__grid e9e__grid--2">
          <label class="e9e__field e9e__field--wide">
            <span>Street</span>
            <input v-model="loc.street" type="text" />
          </label>
          <label class="e9e__field">
            <span>Unit / suite / floor</span>
            <input v-model="loc.unit" type="text" />
          </label>
          <label class="e9e__field">
            <span>City</span>
            <input v-model="loc.city" type="text" />
          </label>
          <label class="e9e__field">
            <span>State</span>
            <input v-model="loc.state" type="text" maxlength="2" />
          </label>
          <label class="e9e__field">
            <span>ZIP</span>
            <input v-model="loc.zip" type="text" maxlength="10" />
          </label>
        </div>
      </fieldset>

      <fieldset class="e9e__group">
        <legend class="e9e__legend">Callback &amp; device</legend>
        <div class="e9e__grid e9e__grid--2">
          <label class="e9e__field">
            <span>Callback number (PSAP dials back on disconnect)</span>
            <input v-model="loc.callback" type="tel" />
          </label>
          <label class="e9e__field">
            <span>Location identifier (NENA LocID)</span>
            <input v-model="loc.locId" type="text" />
          </label>
        </div>
      </fieldset>

      <fieldset class="e9e__group">
        <legend class="e9e__legend">Compliance flags</legend>
        <div class="e9e__flags">
          <label class="e9e__flag">
            <input v-model="flags.kariKasten" type="checkbox" />
            <div>
              <strong>Kari's Law</strong>
              <small>Direct 911 without a prefix digit (no "9 to get out")</small>
            </div>
          </label>
          <label class="e9e__flag">
            <input v-model="flags.ray" type="checkbox" />
            <div>
              <strong>RAY BAUM'S Act §506</strong>
              <small>Dispatchable location sent with every 911 call</small>
            </div>
          </label>
          <label class="e9e__flag">
            <input v-model="flags.notify" type="checkbox" />
            <div>
              <strong>Front-desk notify</strong>
              <small>Email + SIP NOTIFY to reception on any 911 dial</small>
            </div>
          </label>
        </div>
      </fieldset>

      <div class="e9e__actions">
        <button type="button" class="e9e__btn e9e__btn--ghost" @click="verify" :disabled="verifying">
          {{ verifying ? 'Verifying…' : 'Verify with MSAG' }}
        </button>
        <button type="button" class="e9e__btn e9e__btn--primary" @click="save">Save location</button>
        <span class="e9e__hint" v-if="verifyMsg">{{ verifyMsg }}</span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

const loc = reactive({
  street: '447 Larkin Street',
  unit: 'Floor 3, Desk 3-17-W',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  callback: '+1 415 555 0182',
  locId: 'DL-SFO-HQ-F3-W17',
})

const flags = reactive({
  kariKasten: true,
  ray: true,
  notify: true,
})

const verifying = ref(false)
const verifyMsg = ref('Verified 2026-04-18 via Intrado MSAG · 99.4% confidence')
const saved = ref(true)

const verify = async () => {
  verifying.value = true
  verifyMsg.value = 'Contacting MSAG…'
  await new Promise(r => setTimeout(r, 900))
  verifying.value = false
  verifyMsg.value = `Verified ${new Date().toISOString().slice(0, 10)} via Intrado MSAG · match`
}

const save = () => { saved.value = true; verifyMsg.value = 'Saved. Will propagate to all registered endpoints.' }

const status = computed(() => {
  if (!saved.value) return { kind: 'draft', label: 'unsaved', code: 'DRAFT' }
  if (!flags.ray) return { kind: 'warn', label: 'non-compliant', code: 'NON-COMPLIANT' }
  return { kind: 'ok', label: 'compliant', code: 'COMPLIANT' }
})
</script>

<style scoped>
.e9e {
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

.e9e__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.e9e__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.e9e__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }
.e9e__state {
  font-family: var(--mono); font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.12em;
  padding: 0.25rem 0.55rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.e9e__state--ok { color: #15803d; border-color: #15803d; }
.e9e__state--warn { color: #b91c1c; border-color: #b91c1c; }
.e9e__state--draft { color: var(--accent); border-color: var(--accent); }

.e9e__form { display: flex; flex-direction: column; gap: 0.7rem; }
.e9e__group {
  border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem 0.8rem 0.75rem;
  background: var(--paper);
}
.e9e__legend {
  padding: 0 0.4rem;
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.e9e__grid { display: grid; gap: 0.5rem; }
.e9e__grid--2 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.e9e__field { display: flex; flex-direction: column; gap: 0.2rem; }
.e9e__field--wide { grid-column: 1 / -1; }
.e9e__field > span {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
}
.e9e__field input {
  font-family: var(--mono); font-size: 0.82rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem 0.55rem; color: var(--ink);
}
.e9e__field input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

.e9e__flags { display: grid; gap: 0.4rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.e9e__flag {
  display: grid; grid-template-columns: auto 1fr; gap: 0.45rem; align-items: start;
  padding: 0.5rem 0.6rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  cursor: pointer;
}
.e9e__flag input { margin-top: 0.2rem; accent-color: var(--accent); }
.e9e__flag strong { display: block; font-size: 0.82rem; }
.e9e__flag small { display: block; font-family: var(--mono); font-size: 0.65rem; color: var(--muted); margin-top: 0.15rem; }
.e9e__flag:has(input:checked) { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, var(--paper-deep)); }

.e9e__actions { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.e9e__btn {
  border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  cursor: pointer;
}
.e9e__btn--ghost { background: var(--paper); border: 1px solid var(--rule); color: var(--ink); }
.e9e__btn--ghost:hover { border-color: var(--accent); color: var(--accent); }
.e9e__btn--primary { background: var(--accent); border: 1px solid var(--accent); color: var(--paper); }
.e9e__btn--primary:hover { filter: brightness(0.95); }
.e9e__btn:disabled { opacity: 0.6; cursor: not-allowed; }

.e9e__hint { margin-left: auto; font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }
</style>
