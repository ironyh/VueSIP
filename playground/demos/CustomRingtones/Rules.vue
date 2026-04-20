<template>
  <div class="crr">
    <header class="crr__head">
      <div>
        <span class="crr__eyebrow">Ringtone rules</span>
        <h3 class="crr__title">{{ rules.length }} rules · first match wins</h3>
      </div>
      <button type="button" class="crr__add" @click="addRule">+ Add rule</button>
    </header>

    <ol class="crr__list" role="list">
      <li v-for="(r, i) in rules" :key="r.id" class="crr__rule" :class="{ 'crr__rule--off': !r.enabled }">
        <div class="crr__rule-head">
          <span class="crr__rule-n">{{ String(i + 1).padStart(2, '0') }}</span>
          <input type="text" v-model="r.name" class="crr__rule-name" aria-label="Rule name" />
          <label class="crr__toggle">
            <input type="checkbox" v-model="r.enabled" />
            <span>{{ r.enabled ? 'ON' : 'OFF' }}</span>
          </label>
          <div class="crr__rule-ctrl">
            <button type="button" class="crr__mv" :disabled="i === 0" @click="move(i, -1)" aria-label="Move up">↑</button>
            <button type="button" class="crr__mv" :disabled="i === rules.length - 1" @click="move(i, 1)" aria-label="Move down">↓</button>
            <button type="button" class="crr__rm" @click="rules.splice(i, 1)" aria-label="Remove rule">×</button>
          </div>
        </div>

        <div class="crr__grid">
          <label class="crr__field">
            <span class="crr__label">Match</span>
            <select v-model="r.matchType" class="crr__sel">
              <option value="group">Caller group</option>
              <option value="prefix">Number prefix</option>
              <option value="pai">P-Asserted-Identity</option>
              <option value="header">Custom SIP header</option>
            </select>
          </label>
          <label class="crr__field">
            <span class="crr__label">Value</span>
            <input type="text" v-model="r.value" class="crr__in" :placeholder="placeholderFor(r.matchType)" />
          </label>
          <label class="crr__field">
            <span class="crr__label">Tone</span>
            <select v-model="r.tone" class="crr__sel">
              <option v-for="t in tones" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
        </div>

        <div class="crr__window">
          <span class="crr__label">Active window</span>
          <div class="crr__window-row">
            <label class="crr__seg">
              <input type="checkbox" v-model="r.allDay" />
              <span>All day</span>
            </label>
            <div class="crr__time" v-if="!r.allDay">
              <input type="time" v-model="r.from" class="crr__in crr__in--time" />
              <span class="crr__sep" aria-hidden="true">→</span>
              <input type="time" v-model="r.to" class="crr__in crr__in--time" />
            </div>
            <div class="crr__days" role="group" aria-label="Days of week">
              <button
                v-for="(d, idx) in days"
                :key="idx"
                type="button"
                class="crr__day"
                :class="{ 'crr__day--on': r.days.includes(idx) }"
                :aria-pressed="r.days.includes(idx)"
                @click="toggleDay(r, idx)"
              >{{ d }}</button>
            </div>
          </div>
        </div>
      </li>
    </ol>

    <div class="crr__fallback">
      <span class="crr__fallback-label">Fallback when no rule matches</span>
      <select v-model="fallback" class="crr__sel crr__sel--fallback">
        <option v-for="t in tones" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type MatchType = 'group' | 'prefix' | 'pai' | 'header'

interface Rule {
  id: string
  name: string
  enabled: boolean
  matchType: MatchType
  value: string
  tone: string
  allDay: boolean
  from: string
  to: string
  days: number[]
}

const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const tones = [
  'Bell Model 500 · ring',
  'Trimline · electronic warble',
  'Office PBX double-ring',
  'Marimba',
  'Soft ping',
  'Three-tone chime',
  'US cadence (RFC 3261)',
  'UK cadence',
  'Silent',
]

const rules = ref<Rule[]>([
  {
    id: 'r-vip',
    name: 'VIP customers',
    enabled: true,
    matchType: 'group',
    value: 'vip',
    tone: 'Three-tone chime',
    allDay: true,
    from: '09:00',
    to: '18:00',
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: 'r-oncall',
    name: 'On-call escalation',
    enabled: true,
    matchType: 'header',
    value: 'X-Priority: urgent',
    tone: 'Office PBX double-ring',
    allDay: true,
    from: '00:00',
    to: '23:59',
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: 'r-night',
    name: 'Quiet hours',
    enabled: true,
    matchType: 'prefix',
    value: '*',
    tone: 'Silent',
    allDay: false,
    from: '22:00',
    to: '07:00',
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: 'r-intl',
    name: 'International',
    enabled: false,
    matchType: 'prefix',
    value: '+',
    tone: 'Soft ping',
    allDay: false,
    from: '09:00',
    to: '17:00',
    days: [0, 1, 2, 3, 4],
  },
])

const fallback = ref('Bell Model 500 · ring')

const placeholderFor = (m: MatchType) =>
  ({
    group: 'vip / internal / partners',
    prefix: '+44, 1-800, *, …',
    pai: 'sip:noc@carrier.net',
    header: 'X-Priority: urgent',
  }[m])

const toggleDay = (r: Rule, idx: number) => {
  const i = r.days.indexOf(idx)
  if (i >= 0) r.days.splice(i, 1)
  else r.days.push(idx)
}

const move = (i: number, dir: -1 | 1) => {
  const j = i + dir
  if (j < 0 || j >= rules.value.length) return
  const arr = rules.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}

let seq = 0
const addRule = () => {
  seq++
  rules.value.push({
    id: `r-new-${seq}`,
    name: 'New rule',
    enabled: true,
    matchType: 'group',
    value: '',
    tone: tones[0],
    allDay: true,
    from: '09:00',
    to: '18:00',
    days: [0, 1, 2, 3, 4],
  })
}
</script>

<style scoped>
.crr {
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
.crr__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
.crr__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted);
}
.crr__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.crr__add {
  background: var(--ink); color: var(--paper); border: 0; border-radius: 2px;
  padding: 0.45rem 0.8rem; font-family: var(--mono); font-size: 0.66rem;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
}
.crr__add:hover { background: var(--accent); }

.crr__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.55rem; }
.crr__rule {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.65rem 0.8rem; display: flex; flex-direction: column; gap: 0.55rem;
  transition: opacity 0.12s;
}
.crr__rule--off { opacity: 0.55; }

.crr__rule-head { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }
.crr__rule-n {
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  color: var(--accent); font-variant-numeric: tabular-nums;
  padding: 0.25rem 0.4rem; background: var(--paper-deep);
  border: 1px solid var(--rule); border-radius: 2px;
}
.crr__rule-name {
  flex: 1; min-width: 8rem;
  background: transparent; border: 0; border-bottom: 1px solid transparent;
  font: inherit; font-weight: 600; font-size: 0.92rem; color: var(--ink); padding: 0.2rem 0;
}
.crr__rule-name:focus { outline: none; border-bottom-color: var(--accent); }

.crr__toggle {
  display: inline-flex; align-items: center; gap: 0.4rem;
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
  cursor: pointer;
}
.crr__toggle input { accent-color: var(--accent); }

.crr__rule-ctrl { display: inline-flex; gap: 0.25rem; }
.crr__mv, .crr__rm {
  background: transparent; border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.2rem 0.5rem; font-family: var(--mono); font-size: 0.8rem;
  color: var(--muted); cursor: pointer; transition: all 0.12s;
}
.crr__mv:hover:not(:disabled), .crr__rm:hover { color: var(--accent); border-color: var(--accent); }
.crr__mv:disabled { opacity: 0.3; cursor: not-allowed; }

.crr__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; }
.crr__field { display: flex; flex-direction: column; gap: 0.25rem; }
.crr__label {
  font-family: var(--mono); font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.crr__in, .crr__sel {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem 0.55rem; font-family: var(--mono); font-size: 0.78rem; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.crr__in:focus, .crr__sel:focus { outline: none; border-color: var(--accent); }
.crr__in--time { width: 6rem; }

.crr__window { display: flex; flex-direction: column; gap: 0.3rem; }
.crr__window-row {
  display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap;
  padding: 0.45rem 0.55rem; background: var(--paper-deep);
  border: 1px solid var(--rule); border-radius: 2px;
}
.crr__seg {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: var(--mono); font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
  cursor: pointer;
}
.crr__seg input { accent-color: var(--accent); }

.crr__time { display: inline-flex; align-items: center; gap: 0.4rem; }
.crr__sep { color: var(--muted); font-family: var(--mono); }

.crr__days { display: inline-flex; gap: 0.2rem; margin-left: auto; }
.crr__day {
  width: 1.7rem; height: 1.7rem;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  color: var(--muted); cursor: pointer; transition: all 0.12s;
}
.crr__day:hover { border-color: var(--ink); }
.crr__day--on {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent); border-color: var(--accent);
}

.crr__fallback {
  display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;
  padding: 0.6rem 0.8rem;
  background: var(--paper-deep); border: 1px dashed var(--rule); border-radius: 2px;
}
.crr__fallback-label {
  font-family: var(--mono); font-size: 0.66rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.crr__sel--fallback { min-width: 14rem; }
</style>
