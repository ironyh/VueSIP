<template>
  <div class="blr">
    <header class="blr__head">
      <div>
        <span class="blr__eyebrow">Rules engine</span>
        <h3 class="blr__title">{{ enabledCount }} / {{ rules.length }} enabled</h3>
      </div>
    </header>

    <section class="blr__section">
      <span class="blr__section-title">Default action for blocked calls</span>
      <div class="blr__actions" role="radiogroup" aria-label="Block action">
        <button
          v-for="a in actions"
          :key="a.id"
          type="button"
          class="blr__action"
          :class="{ 'blr__action--on': defaultAction === a.id }"
          role="radio"
          :aria-checked="defaultAction === a.id"
          @click="defaultAction = a.id"
        >
          <span class="blr__action-label">{{ a.label }}</span>
          <span class="blr__action-desc">{{ a.desc }}</span>
          <span class="blr__action-code">{{ a.code }}</span>
        </button>
      </div>
    </section>

    <section class="blr__section">
      <span class="blr__section-title">Pattern rules</span>
      <ul class="blr__rules" role="list">
        <li v-for="r in rules" :key="r.id" class="blr__rule" :class="{ 'blr__rule--off': !r.enabled }">
          <div class="blr__rule-body">
            <div class="blr__rule-head">
              <span class="blr__rule-name">{{ r.name }}</span>
              <code class="blr__pattern">{{ r.pattern }}</code>
            </div>
            <p class="blr__rule-desc">{{ r.desc }}</p>
          </div>
          <label class="blr__switch">
            <input type="checkbox" v-model="r.enabled" />
            <span class="blr__switch-track" aria-hidden="true">
              <span class="blr__switch-thumb" />
            </span>
            <span class="blr__switch-label">{{ r.enabled ? 'On' : 'Off' }}</span>
          </label>
        </li>
      </ul>
    </section>

    <section class="blr__section">
      <span class="blr__section-title">Global filters</span>
      <ul class="blr__globals" role="list">
        <li class="blr__global">
          <label class="blr__global-label">
            <input type="checkbox" v-model="filters.anonymous" />
            <span>Block anonymous / withheld callers</span>
          </label>
          <span class="blr__global-hint">
            Rejects <code>anonymous@</code> or CLI-withheld calls with your default action.
          </span>
        </li>
        <li class="blr__global">
          <label class="blr__global-label">
            <input type="checkbox" v-model="filters.international" />
            <span>Block unknown international numbers</span>
          </label>
          <span class="blr__global-hint">
            Blocks numbers outside your dial plan unless on the allowlist.
          </span>
        </li>
        <li class="blr__global">
          <label class="blr__global-label">
            <input type="checkbox" v-model="filters.reputation" />
            <span>Use community reputation feed</span>
          </label>
          <span class="blr__global-hint">
            Checks incoming calls against shared spam database (STIR/SHAKEN + reputation).
          </span>
        </li>
        <li class="blr__global">
          <label class="blr__global-label">
            <input type="checkbox" v-model="filters.allowlistFirst" />
            <span>Allowlist wins over blocklist</span>
          </label>
          <span class="blr__global-hint">
            Contacts in your address book always ring through, even if a pattern matches.
          </span>
        </li>
      </ul>
    </section>

    <footer class="blr__footer">
      <span class="blr__status">
        <span class="blr__status-dot" :class="{ 'blr__status-dot--on': enabledCount > 0 }" />
        <span class="blr__status-label">{{ summary }}</span>
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type ActionId = 'reject' | 'voicemail' | 'busy' | 'silent'
interface Action { id: ActionId; label: string; desc: string; code: string }

const actions: Action[] = [
  { id: 'reject', label: 'Reject', desc: 'Decline with a 603 response', code: 'SIP 603 Decline' },
  { id: 'voicemail', label: 'To voicemail', desc: 'Route straight to voicemail', code: 'Forward · VM' },
  { id: 'busy', label: 'Return busy', desc: 'Reply with 486 Busy Here', code: 'SIP 486 Busy' },
  { id: 'silent', label: 'Silent drop', desc: 'Accept and hang up immediately', code: 'SIP 200 → BYE' },
]

const defaultAction = ref<ActionId>('reject')

interface Rule { id: number; name: string; pattern: string; desc: string; enabled: boolean }

const rules = ref<Rule[]>([
  {
    id: 1,
    name: 'Premium-rate prefixes',
    pattern: '^\\+(900|976)\\d{7,}$',
    desc: 'Block calls to premium-rate and adult-entertainment number ranges.',
    enabled: true,
  },
  {
    id: 2,
    name: 'Robocaller pattern',
    pattern: '^\\+1800\\d{7}$',
    desc: 'Heuristic: US 800 numbers with specific digit patterns common to robocallers.',
    enabled: true,
  },
  {
    id: 3,
    name: 'Short codes',
    pattern: '^\\d{3,5}$',
    desc: 'Reject short-code incoming (most PBXs don\'t need them, and it\'s a common spoofing vector).',
    enabled: false,
  },
  {
    id: 4,
    name: 'Neighbor-spoofing',
    pattern: '^\\+1{{areacode}}\\d{4}$',
    desc: 'Flag calls that share your own area code + prefix — classic neighbour-spoofing tactic.',
    enabled: true,
  },
])

const filters = reactive({
  anonymous: true,
  international: false,
  reputation: true,
  allowlistFirst: true,
})

const enabledCount = computed(
  () => rules.value.filter((r) => r.enabled).length +
    (filters.anonymous ? 1 : 0) +
    (filters.international ? 1 : 0) +
    (filters.reputation ? 1 : 0)
)

const summary = computed(() => {
  const action = actions.find((a) => a.id === defaultAction.value)!.label
  const parts: string[] = [`Default action: ${action}`]
  if (filters.allowlistFirst) parts.push('contacts always ring through')
  if (filters.reputation) parts.push('reputation feed active')
  return parts.join(' · ')
})
</script>

<style scoped>
.blr {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --ok: #48bb78;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  color: var(--ink);
  font-family: var(--sans);
}

.blr__head { display: flex; justify-content: space-between; align-items: flex-end; }
.blr__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.blr__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.blr__section { display: flex; flex-direction: column; gap: 0.45rem; }
.blr__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.blr__actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.4rem;
}
.blr__action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-family: var(--sans);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.blr__action:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.blr__action--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.blr__action-label { font-weight: 600; font-size: 0.88rem; }
.blr__action-desc {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.blr__action-code {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  margin-top: 0.15rem;
}

.blr__rules, .blr__globals {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.blr__rule {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.7rem 0.8rem;
  display: flex;
  gap: 0.7rem;
  align-items: center;
  transition: opacity 0.12s;
}
.blr__rule--off { opacity: 0.55; }
.blr__rule-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.blr__rule-head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.blr__rule-name { font-weight: 600; font-size: 0.9rem; }
.blr__pattern {
  font-family: var(--mono);
  font-size: 0.72rem;
  padding: 0.08rem 0.35rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--accent);
}
.blr__rule-desc {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--muted);
}

.blr__switch { display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; flex-shrink: 0; }
.blr__switch input { position: absolute; opacity: 0; pointer-events: none; }
.blr__switch-track {
  width: 34px;
  height: 18px;
  background: var(--rule);
  border-radius: 999px;
  position: relative;
  transition: background 0.15s;
}
.blr__switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: var(--paper);
  border-radius: 50%;
  transition: transform 0.15s;
}
.blr__switch input:checked + .blr__switch-track {
  background: var(--accent);
}
.blr__switch input:checked + .blr__switch-track .blr__switch-thumb {
  transform: translateX(16px);
}
.blr__switch-label {
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  min-width: 2ch;
}

.blr__global {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.blr__global-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  cursor: pointer;
}
.blr__global-label input { accent-color: var(--accent); }
.blr__global-hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  padding-left: 1.5rem;
}
.blr__global-hint code {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}

.blr__footer {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.blr__status { display: inline-flex; align-items: center; gap: 0.45rem; }
.blr__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}
.blr__status-dot--on { background: var(--ok); }
.blr__status-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: var(--muted);
}
</style>
