<template>
  <div class="pgi">
    <header class="pgi__head">
      <div>
        <span class="pgi__eyebrow">Intercom · 1:1 auto-answer</span>
        <h3 class="pgi__title">{{ target.label }} · ext {{ target.ext }}</h3>
      </div>
      <span class="pgi__state" :class="`pgi__state--${state}`">{{ stateLabel }}</span>
    </header>

    <section class="pgi__section">
      <span class="pgi__section-title">Recent extensions</span>
      <ul class="pgi__targets" role="radiogroup" aria-label="Intercom target">
        <li v-for="t in targets" :key="t.ext">
          <button
            type="button"
            class="pgi__target"
            :class="{ 'pgi__target--on': t.ext === targetExt, 'pgi__target--busy': t.busy }"
            role="radio"
            :aria-checked="t.ext === targetExt"
            :disabled="t.busy"
            @click="targetExt = t.ext"
          >
            <span class="pgi__target-ext">{{ t.ext }}</span>
            <span class="pgi__target-name">{{ t.label }}</span>
            <span class="pgi__target-status" :class="`pgi__target-status--${t.busy ? 'busy' : 'idle'}`">
              {{ t.busy ? 'on a call' : 'idle' }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section class="pgi__controls">
      <button
        type="button"
        class="pgi__action pgi__action--primary"
        :disabled="state !== 'idle' || target.busy"
        @click="connect"
      >Intercom {{ target.ext }}</button>
      <button
        type="button"
        class="pgi__action"
        :disabled="state === 'idle'"
        @click="hangup"
      >Hang up</button>
      <label class="pgi__toggle">
        <input type="checkbox" v-model="twoWay" />
        <span>{{ twoWay ? 'Two-way' : 'Announce-only' }}</span>
      </label>
    </section>

    <section class="pgi__timeline" aria-label="Connection timeline">
      <ol class="pgi__steps" role="list">
        <li v-for="step in steps" :key="step.key" class="pgi__step" :class="{ 'pgi__step--on': reached(step.key) }">
          <span class="pgi__step-dot" aria-hidden="true" />
          <span class="pgi__step-label">{{ step.label }}</span>
          <span class="pgi__step-code">{{ step.code }}</span>
        </li>
      </ol>
    </section>

    <footer class="pgi__foot">
      <span>Sends <code>Call-Info: answer-after=0</code>. Polycom and Yealink honour it; Cisco needs <code>Alert-Info: Intercom</code>. Sets <code>SIPAddHeader</code> in the dialplan before <code>Dial()</code>.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type State = 'idle' | 'inviting' | 'alerting' | 'connected'

const targets = ref([
  { ext: '2101', label: 'Alex Rivera',    busy: false },
  { ext: '2102', label: 'Priya Patel',    busy: true  },
  { ext: '2103', label: 'Jordan Okafor',  busy: false },
  { ext: '2201', label: 'Reception desk', busy: false },
  { ext: '2400', label: 'Warehouse (loud)', busy: false },
])
const targetExt = ref('2101')
const target = computed(() => targets.value.find(t => t.ext === targetExt.value)!)

const twoWay = ref(true)
const state = ref<State>('idle')
const stateLabel = computed(() => {
  if (state.value === 'idle') return 'READY'
  if (state.value === 'inviting') return 'INVITE…'
  if (state.value === 'alerting') return '180 RINGING'
  return 'CONNECTED'
})

const steps = [
  { key: 'inviting',  label: 'INVITE with Call-Info: answer-after=0', code: '→' },
  { key: 'alerting',  label: '180 Ringing (suppressed on handset)',   code: '←' },
  { key: 'connected', label: '200 OK · speaker engaged',              code: '←' },
]
const order: State[] = ['idle', 'inviting', 'alerting', 'connected']
const reached = (k: string) => order.indexOf(state.value) >= order.indexOf(k as State)

let timers: number[] = []
const connect = () => {
  state.value = 'inviting'
  timers.push(window.setTimeout(() => (state.value = 'alerting'), 400))
  timers.push(window.setTimeout(() => (state.value = 'connected'), 900))
}
const hangup = () => {
  timers.forEach(clearTimeout); timers = []
  state.value = 'idle'
}
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<style scoped>
.pgi {
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

.pgi__head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.pgi__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.pgi__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.pgi__state {
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em;
  padding: 0.3rem 0.6rem; border-radius: 2px;
  background: var(--paper-deep); border: 1px solid var(--rule); color: var(--muted);
}
.pgi__state--connected { background: color-mix(in srgb, #15803d 15%, transparent); color: #15803d; border-color: #15803d; }
.pgi__state--inviting, .pgi__state--alerting { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); border-color: var(--accent); }

.pgi__section { display: flex; flex-direction: column; gap: 0.35rem; }
.pgi__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.pgi__targets {
  list-style: none; padding: 0; margin: 0;
  display: grid; gap: 0.35rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.pgi__target {
  width: 100%; text-align: left;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: grid; grid-template-columns: 3rem 1fr auto; align-items: center; gap: 0.5rem;
  font-family: var(--sans); color: var(--ink); cursor: pointer;
  transition: all 0.12s;
}
.pgi__target:hover:not(:disabled) { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.pgi__target--on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, transparent); }
.pgi__target--busy { opacity: 0.6; cursor: not-allowed; }
.pgi__target-ext { font-family: var(--mono); font-weight: 700; color: var(--accent); }
.pgi__target-name { font-size: 0.86rem; }
.pgi__target-status {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  padding: 0.12rem 0.4rem; border-radius: 2px;
  border: 1px solid var(--rule); background: var(--paper-deep); color: var(--muted);
}
.pgi__target-status--busy { color: #b91c1c; border-color: #b91c1c; }

.pgi__controls { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.pgi__action {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.5rem 0.9rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.pgi__action:disabled { opacity: 0.4; cursor: not-allowed; }
.pgi__action--primary { background: var(--accent); border-color: var(--accent); color: var(--paper); }
.pgi__toggle {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
  margin-left: auto;
}

.pgi__timeline {
  padding: 0.5rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
}
.pgi__steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.pgi__step {
  display: grid; grid-template-columns: 14px 1fr auto; align-items: center; gap: 0.5rem;
  font-family: var(--mono); font-size: 0.72rem; color: var(--muted);
  opacity: 0.5;
}
.pgi__step--on { opacity: 1; color: var(--ink); }
.pgi__step-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--rule);
  border: 1px solid var(--muted);
}
.pgi__step--on .pgi__step-dot { background: var(--accent); border-color: var(--accent); }
.pgi__step-code { color: var(--accent); }

.pgi__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.pgi__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
