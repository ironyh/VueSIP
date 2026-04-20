<template>
  <div class="c2c">
    <header class="c2c__head">
      <div>
        <span class="c2c__eyebrow">URI launcher</span>
        <h3 class="c2c__title">{{ links.length }} callable targets on this page</h3>
      </div>
      <div class="c2c__scheme-pick" role="radiogroup" aria-label="Schemes to detect">
        <button
          v-for="s in schemeList"
          :key="s"
          type="button"
          class="c2c__scheme"
          :class="{ 'c2c__scheme--on': activeSchemes[s] }"
          role="radio"
          :aria-checked="activeSchemes[s]"
          @click="activeSchemes[s] = !activeSchemes[s]"
        >
          {{ s }}:
        </button>
      </div>
    </header>

    <div class="c2c__sample">
      <span class="c2c__sample-title">Sample email signature</span>
      <div class="c2c__sample-body" v-html="highlighted"></div>
    </div>

    <section class="c2c__section">
      <span class="c2c__section-title">Detected</span>
      <ul v-if="links.length" class="c2c__list" role="list">
        <li
          v-for="(link, i) in links"
          :key="i"
          class="c2c__row"
          :class="`c2c__row--${link.scheme}`"
        >
          <span class="c2c__scheme-tag">{{ link.scheme }}:</span>
          <code class="c2c__target">{{ link.target }}</code>
          <span class="c2c__display">{{ link.display }}</span>
          <span class="c2c__confidence" :title="`Parser confidence: ${link.score}%`">
            {{ link.score }}%
          </span>
          <button
            type="button"
            class="c2c__call"
            :aria-label="`Call ${link.display}`"
            @click="launch(link)"
          >
            Call
          </button>
        </li>
      </ul>
      <p v-else class="c2c__empty">Nothing callable in the sample.</p>
    </section>

    <footer v-if="lastLaunched" class="c2c__receipt" role="status" aria-live="polite">
      <span class="c2c__receipt-tag">Launched</span>
      <code>{{ lastLaunched }}</code>
      <span class="c2c__receipt-note"
        >Browser handler chain: <code>navigator.registerProtocolHandler</code> → OS default
        app</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type Scheme = 'tel' | 'sip' | 'callto'

interface Link {
  scheme: Scheme
  target: string
  display: string
  score: number
}

const schemeList: Scheme[] = ['tel', 'sip', 'callto']
const activeSchemes = reactive<Record<Scheme, boolean>>({
  tel: true,
  sip: true,
  callto: false,
})

const sampleText = `Alex Rivera · Senior Account Executive · Acme Industrial
 Mobile: +1-415-555-0100 or tel:+14155552323 (desk)
 Softphone: sip:alex@example.com · chat alex@example.com
 EU office: +44 20 7946 0000 · legacy: callto:alex.rivera
 Ext 2001 · fax +1 (415) 555 0199 (don't call this)
 After hours: page +14155550156`

const telMatcher = /(\+?[\d][\d\s()\-.\u00A0]{7,})/g
const sipMatcher = /\bsip:[^\s<>"]+/g
const calltoMatcher = /\bcallto:[^\s<>"]+/g

const parseLinks = (text: string): Link[] => {
  const out: Link[] = []
  if (activeSchemes.tel) {
    for (const m of text.matchAll(telMatcher)) {
      const raw = m[1]
      const digits = raw.replace(/[^\d+]/g, '')
      if (digits.length < 8) continue
      // score drops if no "+", no break between groups, or if the raw looks like an extension
      let score = 70
      if (raw.trim().startsWith('+')) score += 15
      if (/\s|\(/.test(raw)) score += 10
      if (digits.length >= 11) score += 5
      if (score > 100) score = 100
      out.push({ scheme: 'tel', target: digits, display: raw.trim(), score })
    }
  }
  if (activeSchemes.sip) {
    for (const m of text.matchAll(sipMatcher)) {
      out.push({ scheme: 'sip', target: m[0], display: m[0], score: 100 })
    }
  }
  if (activeSchemes.callto) {
    for (const m of text.matchAll(calltoMatcher)) {
      out.push({ scheme: 'callto', target: m[0], display: m[0], score: 60 })
    }
  }
  return out
}

const links = computed(() => parseLinks(sampleText))

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const highlighted = computed(() => {
  let html = escapeHtml(sampleText)
  for (const link of [...links.value].sort((a, b) => b.display.length - a.display.length)) {
    const esc = escapeHtml(link.display).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    html = html.replace(
      new RegExp(esc, 'g'),
      `<mark class="c2c__mark c2c__mark--${link.scheme}">${escapeHtml(link.display)}</mark>`
    )
  }
  return html.replace(/\n/g, '<br />')
})

const lastLaunched = ref('')

const launch = (link: Link) => {
  lastLaunched.value = `${link.scheme}:${link.target}`
}
</script>

<style scoped>
.c2c {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --tel: #4a8f4a;
  --sip: #c2410c;
  --callto: #7a4b9c;

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.c2c__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.c2c__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.c2c__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.c2c__scheme-pick {
  display: inline-flex;
  gap: 0.25rem;
}
.c2c__scheme {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.c2c__scheme:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.c2c__scheme--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.c2c__sample {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.c2c__sample-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.c2c__sample-body {
  font-family: var(--mono);
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--ink);
  white-space: normal;
}
.c2c__sample-body :deep(.c2c__mark) {
  background: transparent;
  color: inherit;
  padding: 0 0.1rem;
  border-bottom: 1.5px dashed var(--muted);
}
.c2c__sample-body :deep(.c2c__mark--tel) {
  border-bottom-color: var(--tel);
  color: color-mix(in srgb, var(--tel) 80%, var(--ink));
}
.c2c__sample-body :deep(.c2c__mark--sip) {
  border-bottom-color: var(--sip);
  color: var(--sip);
}
.c2c__sample-body :deep(.c2c__mark--callto) {
  border-bottom-color: var(--callto);
  color: color-mix(in srgb, var(--callto) 80%, var(--ink));
}

.c2c__section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.c2c__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.c2c__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.c2c__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1.2fr) minmax(0, 1fr) auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.45rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
}
.c2c__row--tel {
  border-left-color: var(--tel);
}
.c2c__row--sip {
  border-left-color: var(--sip);
}
.c2c__row--callto {
  border-left-color: var(--callto);
}

.c2c__scheme-tag {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.c2c__target {
  font-family: var(--mono);
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c2c__display {
  font-family: var(--mono);
  font-size: 0.74rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.c2c__confidence {
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.c2c__call {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 2px;
  padding: 0.3rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.12s;
}
.c2c__call:hover {
  background: var(--accent);
  color: var(--paper);
}

.c2c__empty {
  margin: 0;
  padding: 1rem;
  text-align: center;
  background: var(--paper);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--muted);
}

.c2c__receipt {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  background: color-mix(in srgb, var(--accent) 8%, var(--paper-deep));
  border: 1px solid var(--accent);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink);
}
.c2c__receipt-tag {
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}
.c2c__receipt code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
.c2c__receipt-note {
  color: var(--muted);
  font-size: 0.64rem;
  letter-spacing: 0.05em;
}
</style>
