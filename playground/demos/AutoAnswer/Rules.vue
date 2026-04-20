<template>
  <div class="aar">
    <header class="aar__head">
      <div>
        <span class="aar__eyebrow">Auto-answer rules</span>
        <h3 class="aar__title">{{ enabledRules }} / {{ rules.length }} active</h3>
      </div>
      <label class="aar__master">
        <input type="checkbox" v-model="masterEnabled" />
        <span class="aar__master-track" aria-hidden="true">
          <span class="aar__master-thumb" />
        </span>
        <span class="aar__master-label">{{ masterEnabled ? 'On' : 'Off' }}</span>
      </label>
    </header>

    <p class="aar__hint">
      Rules evaluate top-to-bottom on <code>INVITE</code>. First match wins. Asterisk sends intercom calls
      with <code>Call-Info: &lt;sip:…&gt;;answer-after=0</code> — the classic trigger.
    </p>

    <ul class="aar__list" role="list">
      <li v-for="r in rules" :key="r.id" class="aar__row" :class="{ 'aar__row--off': !r.enabled || !masterEnabled }">
        <div class="aar__row-body">
          <div class="aar__row-head">
            <span class="aar__name">{{ r.name }}</span>
            <code class="aar__match">{{ r.match }}</code>
          </div>
          <p class="aar__desc">{{ r.desc }}</p>
          <div class="aar__meta">
            <span class="aar__meta-item">
              <span class="aar__meta-key">Delay</span>
              <span class="aar__meta-val">{{ r.delay }}ms</span>
            </span>
            <span class="aar__meta-item">
              <span class="aar__meta-key">Audio</span>
              <span class="aar__meta-val">{{ r.audio }}</span>
            </span>
            <span class="aar__meta-item">
              <span class="aar__meta-key">Notify</span>
              <span class="aar__meta-val">{{ r.beep ? 'beep' : 'silent' }}</span>
            </span>
          </div>
        </div>
        <label class="aar__switch">
          <input type="checkbox" v-model="r.enabled" :disabled="!masterEnabled" />
          <span class="aar__switch-track" aria-hidden="true">
            <span class="aar__switch-thumb" />
          </span>
          <span class="aar__switch-label">{{ r.enabled ? 'On' : 'Off' }}</span>
        </label>
      </li>
    </ul>

    <section class="aar__sim">
      <span class="aar__section-title">Simulate incoming INVITE</span>
      <div class="aar__sim-row">
        <label class="aar__field">
          <span class="aar__label">From URI</span>
          <input
            type="text"
            v-model="sim.from"
            class="aar__input"
            placeholder="sip:1001@pbx.example"
          />
        </label>
        <label class="aar__field">
          <span class="aar__label">Call-Info header</span>
          <input
            type="text"
            v-model="sim.callInfo"
            class="aar__input"
            placeholder="<sip:pbx>;answer-after=0"
          />
        </label>
      </div>
      <button type="button" class="aar__sim-btn" @click="runMatch">Evaluate rules</button>
      <div v-if="simResult" class="aar__sim-out" :class="{ 'aar__sim-out--hit': simResult.matched }">
        <span class="aar__sim-tag">{{ simResult.matched ? 'AUTO-ANSWER' : 'NORMAL RING' }}</span>
        <span class="aar__sim-body">{{ simResult.message }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

interface Rule {
  id: number
  name: string
  match: string
  desc: string
  delay: number
  audio: 'speaker' | 'headset' | 'muted'
  beep: boolean
  enabled: boolean
  predicate: (from: string, callInfo: string) => boolean
}

const masterEnabled = ref(true)

const rules = ref<Rule[]>([
  {
    id: 1,
    name: 'Intercom (Call-Info)',
    match: 'Call-Info: *answer-after=0',
    desc: 'The PBX intercom convention. Asterisk and 3CX both use answer-after=0 on paging calls.',
    delay: 0,
    audio: 'speaker',
    beep: true,
    enabled: true,
    predicate: (_, ci) => /answer-after\s*=\s*0/i.test(ci),
  },
  {
    id: 2,
    name: 'Trusted extensions',
    match: 'From: 1001–1099',
    desc: 'Whitelist internal extensions — warehouse, loading dock, the front desk.',
    delay: 500,
    audio: 'headset',
    beep: true,
    enabled: true,
    predicate: (from) => /^sip:10\d{2}@/i.test(from),
  },
  {
    id: 3,
    name: 'Queue callbacks',
    match: 'X-Queue-Callback: true',
    desc: 'Let queued callbacks land silently on an agent headset without a ring.',
    delay: 200,
    audio: 'headset',
    beep: false,
    enabled: false,
    predicate: () => false,
  },
  {
    id: 4,
    name: 'After-hours blocker',
    match: 'Time: outside 09–18',
    desc: 'Inverse rule — auto-answer nothing after hours, regardless of other matches.',
    delay: 0,
    audio: 'muted',
    beep: false,
    enabled: false,
    predicate: () => false,
  },
])

const sim = reactive({
  from: 'sip:1042@pbx.example.com',
  callInfo: '<sip:pbx.example.com>;answer-after=0',
})

const simResult = ref<{ matched: boolean; message: string } | null>(null)

const runMatch = () => {
  if (!masterEnabled.value) {
    simResult.value = { matched: false, message: 'Master toggle is off — call would ring normally.' }
    return
  }
  for (const r of rules.value) {
    if (!r.enabled) continue
    if (r.predicate(sim.from, sim.callInfo)) {
      simResult.value = {
        matched: true,
        message: `Matched "${r.name}" → answer after ${r.delay}ms, route to ${r.audio}${r.beep ? ' + beep' : ''}.`,
      }
      return
    }
  }
  simResult.value = { matched: false, message: 'No rule matched — call would ring normally.' }
}

const enabledRules = computed(() => rules.value.filter((r) => r.enabled).length)
</script>

<style scoped>
.aar {
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
.aar__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.aar__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.aar__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.aar__master { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.aar__master input { position: absolute; opacity: 0; pointer-events: none; }
.aar__master-track {
  width: 40px; height: 20px; background: var(--rule); border-radius: 999px; position: relative;
  transition: background 0.15s;
}
.aar__master-thumb {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  background: var(--paper); border-radius: 50%; transition: transform 0.15s;
}
.aar__master input:checked + .aar__master-track { background: var(--accent); }
.aar__master input:checked + .aar__master-track .aar__master-thumb { transform: translateX(20px); }
.aar__master-label {
  font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--muted); min-width: 2ch;
}

.aar__hint {
  margin: 0; padding: 0.55rem 0.7rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-size: 0.82rem; line-height: 1.5; color: var(--muted);
}
.aar__hint code {
  font-family: var(--mono); font-size: 0.88em;
  padding: 0 0.3rem; background: var(--paper); border: 1px solid var(--rule);
  border-radius: 2px; color: var(--accent);
}

.aar__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.aar__row {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.7rem 0.85rem; display: flex; gap: 0.7rem; align-items: flex-start;
  transition: opacity 0.12s;
}
.aar__row--off { opacity: 0.55; }
.aar__row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.aar__row-head { display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
.aar__name { font-weight: 600; font-size: 0.92rem; }
.aar__match {
  font-family: var(--mono); font-size: 0.7rem;
  padding: 0.08rem 0.35rem; background: var(--paper-deep);
  border: 1px solid var(--rule); border-radius: 2px; color: var(--accent);
}
.aar__desc { margin: 0; font-size: 0.82rem; line-height: 1.45; color: var(--muted); }
.aar__meta {
  display: inline-flex; flex-wrap: wrap; gap: 0.8rem;
  font-family: var(--mono); font-size: 0.68rem;
  color: var(--muted);
}
.aar__meta-item { display: inline-flex; gap: 0.3rem; align-items: baseline; }
.aar__meta-key { letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.75; }
.aar__meta-val { color: var(--ink); font-variant-numeric: tabular-nums; }

.aar__switch { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; flex-shrink: 0; }
.aar__switch input { position: absolute; opacity: 0; pointer-events: none; }
.aar__switch-track {
  width: 34px; height: 18px; background: var(--rule); border-radius: 999px;
  position: relative; transition: background 0.15s;
}
.aar__switch-thumb {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  background: var(--paper); border-radius: 50%; transition: transform 0.15s;
}
.aar__switch input:checked + .aar__switch-track { background: var(--accent); }
.aar__switch input:checked + .aar__switch-track .aar__switch-thumb { transform: translateX(16px); }
.aar__switch-label {
  font-family: var(--mono); font-size: 0.64rem; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--muted); min-width: 2ch;
}

.aar__sim {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.8rem 0.9rem; display: flex; flex-direction: column; gap: 0.55rem;
}
.aar__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.aar__sim-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
@media (max-width: 620px) { .aar__sim-row { grid-template-columns: 1fr; } }
.aar__field { display: flex; flex-direction: column; gap: 0.25rem; }
.aar__label {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.aar__input {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.42rem 0.55rem; font-family: var(--mono); font-size: 0.8rem; color: var(--ink);
}
.aar__input:focus { outline: none; border-color: var(--accent); }
.aar__sim-btn {
  align-self: flex-start; background: var(--ink); color: var(--paper);
  border: 0; border-radius: 2px; padding: 0.45rem 0.9rem;
  font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.1em;
  text-transform: uppercase; cursor: pointer;
}
.aar__sim-btn:hover { background: var(--accent); }
.aar__sim-out {
  display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap;
  padding: 0.5rem 0.65rem; background: var(--paper);
  border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.78rem; color: var(--muted);
}
.aar__sim-out--hit {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--ink);
}
.aar__sim-tag {
  font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase;
  font-weight: 700; color: var(--accent);
}
</style>
