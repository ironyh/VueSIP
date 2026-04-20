<template>
  <div class="fcr">
    <header class="fcr__head">
      <div>
        <span class="fcr__eyebrow">Feature codes · dialpad reference</span>
        <h3 class="fcr__title">Built-in star codes</h3>
      </div>
      <input
        v-model="query"
        type="search"
        class="fcr__search"
        placeholder="Filter…"
        aria-label="Filter feature codes"
      />
    </header>

    <div class="fcr__tabs" role="tablist">
      <button
        v-for="c in categories"
        :key="c.id"
        type="button"
        role="tab"
        class="fcr__tab"
        :class="{ 'fcr__tab--on': cat === c.id }"
        :aria-selected="cat === c.id"
        @click="cat = c.id"
      >{{ c.label }}</button>
    </div>

    <ul class="fcr__list" role="list">
      <li v-for="code in filtered" :key="code.code" class="fcr__row">
        <span class="fcr__code">{{ code.code }}</span>
        <div class="fcr__body">
          <span class="fcr__label">{{ code.label }}</span>
          <span class="fcr__desc">{{ code.desc }}</span>
        </div>
        <span class="fcr__app">{{ code.app }}</span>
      </li>
    </ul>

    <footer class="fcr__foot">
      <span>Defined in <code>features.conf</code> (built-ins) and <code>extensions.conf</code> (star patterns). Conflict with DTMF transfer? Set <code>featuredigittimeout = 2000</code> so <code>*</code> dialing does not trigger in-call.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Code { code: string; label: string; desc: string; app: string; cat: string }

const categories = [
  { id: 'all',      label: 'All' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'park',     label: 'Park' },
  { id: 'voicemail',label: 'Voicemail' },
  { id: 'forward',  label: 'Forward' },
  { id: 'status',   label: 'Status' },
]

const codes: Code[] = [
  { code: '##',   label: 'Blind transfer',      desc: 'In-call: push the remote party to a new extension, drop yourself.', app: 'Bridge()',    cat: 'transfer' },
  { code: '*2',   label: 'Attended transfer',   desc: 'In-call: place the caller on hold, dial a third party, complete with ##.', app: 'Bridge()', cat: 'transfer' },
  { code: '700',  label: 'Park call',           desc: 'Transfer target: parks the caller, announces slot 701–720 back to you.', app: 'Park()',   cat: 'park' },
  { code: '*5',   label: 'Record call',         desc: 'In-call: toggle one-leg recording; stored to MIXMON.', app: 'MixMonitor()', cat: 'transfer' },
  { code: '*97',  label: 'Voicemail (your box)',desc: 'Directly enter your own mailbox without the extension prompt.', app: 'VoiceMailMain()', cat: 'voicemail' },
  { code: '*98',  label: 'Voicemail (any box)', desc: 'Enter with mailbox + PIN prompts; use for shared mailboxes.', app: 'VoiceMailMain()', cat: 'voicemail' },
  { code: '*72',  label: 'Enable forward-all',  desc: 'Follow with the target extension or E.164 number + #.', app: 'Set(DB...)',      cat: 'forward' },
  { code: '*73',  label: 'Disable forward-all', desc: 'Clears the ASTDB key; calls resume to your extension.', app: 'Set(DB...)',       cat: 'forward' },
  { code: '*90',  label: 'Forward on busy',     desc: 'Forward only when you are already on a call.', app: 'Set(DB...)',              cat: 'forward' },
  { code: '*91',  label: 'Disable forward-busy',desc: 'Stop forwarding when busy.', app: 'Set(DB...)',                                cat: 'forward' },
  { code: '*67',  label: 'Toggle DND',          desc: 'Do-not-disturb; dial again to clear.', app: 'Set(DND)',                        cat: 'status' },
  { code: '*69',  label: 'Last-call return',    desc: 'Call back whoever last called you; uses CDR.', app: 'Dial()',                  cat: 'status' },
  { code: '*78',  label: 'Enable DND',          desc: 'Explicit on; pairs with *79.', app: 'Set(DND)',                                cat: 'status' },
  { code: '*79',  label: 'Disable DND',         desc: 'Explicit off; idempotent.', app: 'Set(DND)',                                   cat: 'status' },
  { code: '*80',  label: 'One-touch record',    desc: 'Trigger call recording via in-dialplan *one* digit after pickup.', app: 'MixMonitor()', cat: 'transfer' },
]

const cat = ref('all')
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return codes.filter(c =>
    (cat.value === 'all' || c.cat === cat.value) &&
    (!q || `${c.code} ${c.label} ${c.desc} ${c.app}`.toLowerCase().includes(q)),
  )
})
</script>

<style scoped>
.fcr {
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

.fcr__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.fcr__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.fcr__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.fcr__search {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-family: var(--mono); font-size: 0.78rem; color: var(--ink);
  min-width: 10rem;
}

.fcr__tabs { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.fcr__tab {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); cursor: pointer;
}
.fcr__tab--on { background: var(--accent); border-color: var(--accent); color: var(--paper); }

.fcr__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.fcr__row {
  display: grid; grid-template-columns: 4rem 1fr 7rem;
  gap: 0.75rem; align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
}
@media (max-width: 600px) { .fcr__row { grid-template-columns: 4rem 1fr; } .fcr__app { display: none; } }
.fcr__code {
  font-family: var(--mono); font-weight: 700; font-size: 1rem;
  color: var(--accent); text-align: center;
  padding: 0.3rem 0.4rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
}
.fcr__body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.fcr__label { font-size: 0.9rem; font-weight: 600; }
.fcr__desc { font-family: var(--mono); font-size: 0.7rem; color: var(--muted); line-height: 1.4; }
.fcr__app {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--muted); text-align: right;
}

.fcr__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.fcr__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
