<template>
  <div class="fcc">
    <header class="fcc__head">
      <div>
        <span class="fcc__eyebrow">Custom feature codes · tenant scope</span>
        <h3 class="fcc__title">{{ codes.length }} active · {{ conflicts }} conflicts</h3>
      </div>
      <button type="button" class="fcc__add" @click="addRow">+ Add code</button>
    </header>

    <ul class="fcc__list" role="list">
      <li
        v-for="(c, i) in codes"
        :key="i"
        class="fcc__row"
        :class="{ 'fcc__row--conflict': c.conflict }"
      >
        <input
          v-model="c.code"
          type="text"
          class="fcc__input fcc__input--code"
          placeholder="*123"
          aria-label="Dial code"
          @input="validate"
        />
        <input
          v-model="c.label"
          type="text"
          class="fcc__input fcc__input--label"
          placeholder="Reach support supervisor"
          aria-label="Label"
        />
        <select v-model="c.action" class="fcc__input">
          <option value="dial">Dial extension</option>
          <option value="goto">Goto context</option>
          <option value="macro">Execute macro</option>
          <option value="set">Set AstDB key</option>
        </select>
        <input
          v-model="c.target"
          type="text"
          class="fcc__input fcc__input--target"
          :placeholder="placeholderFor(c.action)"
          aria-label="Target"
        />
        <button type="button" class="fcc__remove" @click="codes.splice(i, 1)" aria-label="Remove">
          ×
        </button>
        <div v-if="c.conflict" class="fcc__warn">
          Conflicts with built-in {{ c.conflict }} — calls will never reach this rule.
        </div>
      </li>
    </ul>

    <section class="fcc__preview">
      <span class="fcc__preview-title">Generated dialplan</span>
      <pre class="fcc__code">[globals]
; {{ codes.length }} custom feature codes

[from-internal-custom]<template v-for="c in codes" :key="c.code">
exten =&gt; {{ c.code || '...' }},1,NoOp(custom: {{ c.label || '(unnamed)' }})
 same =&gt; n,{{ renderAction(c) }}
 same =&gt; n,Hangup()</template>
</pre>
    </section>

    <footer class="fcc__foot">
      <span
        >Built-ins win every conflict. Reserve <code>*0*</code> and <code>*9*</code> for your
        tenant; use two-digit codes only for true global verbs.</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

const builtIns = [
  '##',
  '*2',
  '700',
  '*5',
  '*97',
  '*98',
  '*72',
  '*73',
  '*90',
  '*91',
  '*67',
  '*69',
  '*78',
  '*79',
  '*80',
]

interface Custom {
  code: string
  label: string
  action: string
  target: string
  conflict: string | null
}

const codes = reactive<Custom[]>([
  {
    code: '*411',
    label: 'Directory lookup',
    action: 'goto',
    target: 'directory-app,s,1',
    conflict: null,
  },
  {
    code: '*800',
    label: 'Emergency broadcast',
    action: 'macro',
    target: 'macro-emergency-page',
    conflict: null,
  },
  {
    code: '*901',
    label: 'Toggle night mode',
    action: 'set',
    target: 'NIGHTMODE/main=1',
    conflict: null,
  },
  {
    code: '*5',
    label: 'Custom one-touch',
    action: 'dial',
    target: 'PJSIP/supervisor',
    conflict: null,
  },
])

const validate = () => {
  codes.forEach((c) => {
    c.conflict = builtIns.find((b) => b === c.code.trim()) ?? null
  })
}
validate()
watch(codes, validate, { deep: true })

const conflicts = computed(() => codes.filter((c) => c.conflict).length)

const placeholderFor = (a: string) =>
  ({
    dial: 'PJSIP/2101',
    goto: 'context,exten,priority',
    macro: 'macro-name',
    set: 'DB(key)=value',
  })[a] ?? ''

const renderAction = (c: Custom) => {
  switch (c.action) {
    case 'dial':
      return `Dial(${c.target || '...'})`
    case 'goto':
      return `Goto(${c.target || '...'})`
    case 'macro':
      return `Macro(${c.target || '...'})`
    case 'set':
      return `Set(${c.target || '...'})`
    default:
      return ''
  }
}

const addRow = () => {
  codes.push({ code: '', label: '', action: 'dial', target: '', conflict: null })
}
</script>

<style scoped>
.fcc {
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

.fcc__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.fcc__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.fcc__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.fcc__add {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  cursor: pointer;
}
.fcc__add:hover {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}

.fcc__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.fcc__row {
  display: grid;
  grid-template-columns: 5rem 1fr 8rem 1fr 2rem;
  gap: 0.35rem;
  align-items: center;
  padding: 0.4rem 0.55rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
@media (max-width: 700px) {
  .fcc__row {
    grid-template-columns: 1fr;
  }
}
.fcc__row--conflict {
  border-color: #b91c1c;
  background: color-mix(in srgb, #b91c1c 5%, transparent);
}

.fcc__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.45rem;
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--ink);
}
.fcc__input--code {
  font-weight: 700;
  color: var(--accent);
  text-align: center;
}
.fcc__input--label {
  font-family: var(--sans);
}
.fcc__input--target {
  font-size: 0.72rem;
}

.fcc__remove {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  width: 2rem;
  height: 1.6rem;
  font-family: var(--mono);
  color: var(--muted);
  cursor: pointer;
}
.fcc__remove:hover {
  color: #b91c1c;
  border-color: #b91c1c;
}

.fcc__warn {
  grid-column: 1 / -1;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: #b91c1c;
  padding-top: 0.2rem;
}

.fcc__preview {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.fcc__preview-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.fcc__code {
  margin: 0;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--ink);
  overflow-x: auto;
  white-space: pre;
}

.fcc__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.fcc__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
