<template>
  <div class="c2cp">
    <header class="c2cp__head">
      <div>
        <span class="c2cp__eyebrow">Paste · extract · dial</span>
        <h3 class="c2cp__title">
          {{ parsed.length }} found ·
          {{ selectedCount }} selected ·
          {{ ambiguousCount }} need review
        </h3>
      </div>
      <select v-model="defaultRegion" class="c2cp__region" aria-label="Default region for parsing">
        <option value="US">Default · US (+1)</option>
        <option value="GB">Default · GB (+44)</option>
        <option value="DE">Default · DE (+49)</option>
        <option value="FR">Default · FR (+33)</option>
        <option value="AU">Default · AU (+61)</option>
        <option value="JP">Default · JP (+81)</option>
      </select>
    </header>

    <textarea
      v-model="blob"
      class="c2cp__blob"
      rows="5"
      placeholder="Paste a blob: email, CRM notes, meeting minutes…"
      aria-label="Paste any text"
    />

    <section class="c2cp__section">
      <div class="c2cp__section-head">
        <span class="c2cp__section-title">Extracted numbers</span>
        <div class="c2cp__bulk">
          <button type="button" class="c2cp__bulk-btn" @click="selectAll(true)">Select all</button>
          <button type="button" class="c2cp__bulk-btn" @click="selectAll(false)">Clear</button>
        </div>
      </div>

      <ul v-if="parsed.length" class="c2cp__list" role="list">
        <li v-for="(p, i) in parsed" :key="i" class="c2cp__row" :class="{ 'c2cp__row--amb': p.ambiguous }">
          <input
            type="checkbox"
            :checked="p.selected"
            :aria-label="`Include ${p.e164} in batch`"
            class="c2cp__check"
            @change="toggle(i)"
          />
          <code class="c2cp__num">{{ p.e164 }}</code>
          <span class="c2cp__raw">{{ p.raw }}</span>
          <span class="c2cp__country">
            <span class="c2cp__country-tag">{{ p.country }}</span>
            <span class="c2cp__country-hint">{{ p.ambiguous ? 'ambiguous' : p.kind }}</span>
          </span>
        </li>
      </ul>
      <p v-else class="c2cp__empty">Paste text above. Parser recognises E.164, NANP, EU national, and common extensions.</p>
    </section>

    <footer class="c2cp__dial">
      <button
        type="button"
        class="c2cp__dial-btn"
        :disabled="selectedCount === 0"
        @click="dial"
      >
        Dial selected · {{ selectedCount }}
      </button>
      <label class="c2cp__delay">
        <span>Inter-dial delay</span>
        <select v-model.number="delaySec">
          <option :value="0">Parallel</option>
          <option :value="2">2s</option>
          <option :value="5">5s</option>
          <option :value="15">15s</option>
          <option :value="60">60s</option>
        </select>
      </label>
      <p v-if="status" class="c2cp__status" role="status" aria-live="polite">
        {{ status }}
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

type Country = 'US' | 'GB' | 'DE' | 'FR' | 'AU' | 'JP' | '??'
type Kind = 'mobile' | 'landline' | 'tollfree' | 'ext' | 'unknown'

interface Parsed {
  raw: string
  e164: string
  country: Country
  kind: Kind
  ambiguous: boolean
  selected: boolean
}

const defaultRegion = ref<'US' | 'GB' | 'DE' | 'FR' | 'AU' | 'JP'>('US')

const blob = ref(
  `Hi Alex — loop Priya (+1-415-555-0100) and Tomás on the EMEA call.
Noor is on +44 20 7946 0000, Greta's line is +45 60 11 12 22.
Backup: 0161 496 0000, office IVR is 800-555-0173, ext 4010.
Please don't call 2025 — that's the extension.
Fax: +33 1 42 68 80 00`,
)
const delaySec = ref(5)

const countryPrefixes: Record<string, Country> = {
  '1': 'US',
  '44': 'GB',
  '49': 'DE',
  '33': 'FR',
  '61': 'AU',
  '81': 'JP',
  '45': '??',
}

const regionDial: Record<string, string> = {
  US: '1',
  GB: '44',
  DE: '49',
  FR: '33',
  AU: '61',
  JP: '81',
}

const parsed = reactive<Parsed[]>([])

const matcher = /(?:\+?\d[\d\s()\-.\u00A0]{6,}\d)|(?:\bext\.?\s*\d{2,5}\b)/gi

watch(
  [blob, defaultRegion],
  () => {
    parsed.splice(0, parsed.length)
    const seen = new Set<string>()
    const text = blob.value
    for (const m of text.matchAll(matcher)) {
      const raw = m[0].trim()
      if (/^ext/i.test(raw)) {
        const digits = raw.replace(/[^\d]/g, '')
        if (!digits) continue
        const key = `ext:${digits}`
        if (seen.has(key)) continue
        seen.add(key)
        parsed.push({
          raw,
          e164: `ext+${digits}`,
          country: '??',
          kind: 'ext',
          ambiguous: false,
          selected: false,
        })
        continue
      }
      const digits = raw.replace(/[^\d+]/g, '')
      const onlyDigits = digits.replace(/[^\d]/g, '')
      if (onlyDigits.length < 7) continue

      let e164 = ''
      let country: Country = '??'
      let ambiguous = false

      if (digits.startsWith('+')) {
        e164 = digits
        country = detectCountry(digits.slice(1))
      } else if (digits.startsWith('00')) {
        e164 = '+' + digits.slice(2)
        country = detectCountry(digits.slice(2))
      } else if (onlyDigits.length === 10 && defaultRegion.value === 'US') {
        e164 = '+1' + onlyDigits
        country = 'US'
      } else if (onlyDigits.length === 11 && onlyDigits.startsWith('1')) {
        e164 = '+' + onlyDigits
        country = 'US'
      } else {
        e164 = '+' + regionDial[defaultRegion.value] + onlyDigits.replace(/^0/, '')
        country = defaultRegion.value as Country
        ambiguous = true
      }

      if (seen.has(e164)) continue
      seen.add(e164)

      const kind: Kind = inferKind(e164, country)
      parsed.push({ raw, e164, country, kind, ambiguous, selected: !ambiguous && kind !== 'ext' })
    }
  },
  { immediate: true },
)

function detectCountry(d: string): Country {
  for (const [p, c] of Object.entries(countryPrefixes)) {
    if (d.startsWith(p)) return c
  }
  return '??'
}

function inferKind(e164: string, country: Country): Kind {
  if (country === 'US' && /^\+1(800|888|877|866|855|844|833)/.test(e164)) return 'tollfree'
  if (country === 'US' && /^\+1\d{10}$/.test(e164)) return 'landline'
  return 'unknown'
}

const selectedCount = computed(() => parsed.filter((p) => p.selected).length)
const ambiguousCount = computed(() => parsed.filter((p) => p.ambiguous).length)

const toggle = (i: number) => {
  parsed[i].selected = !parsed[i].selected
}
const selectAll = (v: boolean) => {
  parsed.forEach((p) => (p.selected = v))
}

const status = ref('')
const dial = () => {
  const picks = parsed.filter((p) => p.selected)
  if (!picks.length) return
  status.value =
    delaySec.value === 0
      ? `Parallel-dialing ${picks.length}: ${picks.map((p) => p.e164).join(', ')}`
      : `Queued ${picks.length} · first INVITE now, next in ${delaySec.value}s`
}
</script>

<style scoped>
.c2cp {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --amb: #d4811f;

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.c2cp__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.c2cp__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.c2cp__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.c2cp__region {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink);
}

.c2cp__blob {
  width: 100%;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.6rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.85rem;
  color: var(--ink);
  line-height: 1.45;
  resize: vertical;
  box-sizing: border-box;
}
.c2cp__blob:focus { outline: none; border-color: var(--accent); }

.c2cp__section { display: flex; flex-direction: column; gap: 0.35rem; }
.c2cp__section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.c2cp__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.c2cp__bulk { display: inline-flex; gap: 0.25rem; }
.c2cp__bulk-btn {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.c2cp__bulk-btn:hover { color: var(--ink); border-color: var(--ink); }

.c2cp__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.c2cp__row {
  display: grid;
  grid-template-columns: auto minmax(140px, 1fr) minmax(0, 1.1fr) auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.c2cp__row--amb {
  border-color: var(--amb);
  background: color-mix(in srgb, var(--amb) 6%, var(--paper));
}
.c2cp__check { accent-color: var(--accent); }
.c2cp__num {
  font-family: var(--mono);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.c2cp__raw {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c2cp__country {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}
.c2cp__country-tag {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.05rem 0.3rem;
}
.c2cp__country-hint {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.c2cp__empty {
  margin: 0;
  padding: 1rem;
  text-align: center;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
}

.c2cp__dial {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.c2cp__dial-btn {
  background: var(--accent);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.55rem 1rem;
  font-family: var(--mono);
  font-size: 0.74rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}
.c2cp__dial-btn:hover { background: color-mix(in srgb, var(--accent) 80%, var(--ink)); }
.c2cp__dial-btn:disabled { background: var(--rule); color: var(--muted); cursor: not-allowed; }

.c2cp__delay {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.c2cp__delay select {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.5rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--ink);
  text-transform: none;
  letter-spacing: 0;
}
.c2cp__status {
  margin: 0;
  width: 100%;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--accent);
  padding-top: 0.2rem;
  border-top: 1px dashed var(--rule);
}
</style>
