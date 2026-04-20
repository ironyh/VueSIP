<template>
  <div class="demo-shell">
    <section v-if="overview || (prerequisites?.length ?? 0) > 0" class="demo-shell__overview">
      <div v-if="overview" class="demo-shell__overview-prose">
        <p v-for="(para, i) in overviewParagraphs" :key="i">{{ para }}</p>
      </div>

      <ul v-if="prerequisites?.length" class="demo-shell__prereqs" aria-label="Prerequisites">
        <li
          v-for="(p, i) in prerequisites"
          :key="i"
          :class="['demo-shell__prereq', p.met ? 'met' : 'unmet']"
          :title="p.hint"
        >
          <span class="demo-shell__prereq-dot" aria-hidden="true" />
          <span>{{ p.label }}</span>
        </li>
      </ul>
    </section>

    <nav v-if="variants.length > 1" class="demo-shell__jump" aria-label="Jump to variant">
      <span class="demo-shell__jump-label">Examples on this page</span>
      <ol class="demo-shell__jump-list">
        <li v-for="(v, i) in variants" :key="v.id">
          <a
            :href="`#variant-${v.id}`"
            :class="['demo-shell__jump-link', { active: v.id === activeVariantId }]"
            :aria-current="v.id === activeVariantId ? 'true' : undefined"
            @click.prevent="jumpTo(v.id)"
          >
            <span class="demo-shell__jump-num">{{ i + 1 }}</span>
            <span>{{ v.label }}</span>
          </a>
        </li>
      </ol>
    </nav>

    <section
      v-for="(v, i) in variants"
      :key="v.id"
      :id="`variant-${v.id}`"
      class="demo-shell__variant"
    >
      <header class="demo-shell__variant-head">
        <span class="demo-shell__variant-badge" aria-hidden="true">{{ i + 1 }}</span>
        <div class="demo-shell__variant-meta">
          <h3 class="demo-shell__variant-title">{{ v.label }}</h3>
          <p v-if="v.description" class="demo-shell__variant-desc">{{ v.description }}</p>
        </div>
        <code v-if="v.sourceName || v.source" class="demo-shell__variant-file">{{ v.sourceName || v.id + '.vue' }}</code>
      </header>

      <div v-if="v.intro" class="demo-shell__variant-intro">
        <p v-for="(para, j) in paragraphsOf(v.intro)" :key="j">{{ para }}</p>
      </div>

      <ul v-if="v.keyPoints?.length" class="demo-shell__variant-keypoints">
        <li v-for="(kp, k) in v.keyPoints" :key="k">{{ kp }}</li>
      </ul>

      <aside
        v-for="(n, k) in v.notes"
        :key="`note-${k}`"
        :class="['demo-shell__callout', `demo-shell__callout--${n.kind}`]"
        role="note"
      >
        <span class="demo-shell__callout-icon" aria-hidden="true">{{ iconFor(n.kind) }}</span>
        <div>
          <strong class="demo-shell__callout-label">{{ labelFor(n.kind) }}</strong>
          <span>{{ n.text }}</span>
        </div>
      </aside>

      <div class="demo-shell__stage-head" aria-hidden="true">
        <span class="demo-shell__stage-rule" />
        <span class="demo-shell__stage-label">Live demo</span>
        <span class="demo-shell__stage-rule" />
      </div>

      <div class="demo-shell__live" data-testid="demo-shell-live">
        <VariantErrorBoundary :key="v.id">
          <component :is="v.component" />
        </VariantErrorBoundary>
      </div>

      <div class="demo-shell__stage-foot" aria-hidden="true" />

      <p v-if="v.takeaway" class="demo-shell__variant-takeaway">
        <span class="demo-shell__variant-takeaway-label">Takeaway</span>
        <span>{{ v.takeaway }}</span>
      </p>

      <details v-if="v.accessibility?.length" class="demo-shell__panel demo-shell__panel--a11y">
        <summary>
          <span>Accessibility</span>
          <span class="demo-shell__panel-count">{{ v.accessibility.length }}</span>
        </summary>
        <ul class="demo-shell__a11y">
          <li v-for="(a, k) in v.accessibility" :key="k">{{ a }}</li>
        </ul>
      </details>

      <details v-if="v.source" class="demo-shell__panel">
        <summary>
          <span>View source</span>
          <button
            type="button"
            class="demo-shell__copy"
            @click.prevent.stop="copySource(v)"
            :aria-label="copiedId === v.id ? 'Copied' : 'Copy source'"
          >{{ copiedId === v.id ? 'Copied' : 'Copy' }}</button>
        </summary>
        <pre class="demo-shell__source"><code>{{ v.source }}</code></pre>
      </details>
    </section>

    <details v-if="stateEntries.length" class="demo-shell__panel demo-shell__panel--state">
      <summary>State inspector</summary>
      <dl class="demo-shell__state">
        <template v-for="[key, value] in stateEntries" :key="key">
          <dt>{{ key }}</dt>
          <dd><code>{{ formatValue(value) }}</code></dd>
        </template>
      </dl>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import VariantErrorBoundary from './VariantErrorBoundary.vue'

export type DemoNoteKind = 'tip' | 'note' | 'warning'

export interface DemoNote {
  kind: DemoNoteKind
  text: string
}

/**
 * DemoVariant contract.
 *
 * Required (minimum viable variant):
 *   - id, label, component
 *
 * Optional (progressive enhancement — author only what adds signal):
 *   - description     short italic subtitle under the title
 *   - intro           multi-paragraph prose (split by blank line)
 *   - keyPoints       up to 3 bullets of what the variant demonstrates
 *   - notes           tip / note / warning callouts
 *   - takeaway        one-sentence aha shown under the live demo
 *   - accessibility   bullets shown in the collapsed a11y panel
 *   - source          raw source string for the "View source" panel
 *   - sourceName      filename chip shown in the header
 *
 * A minimal variant — only `id + label + component` — renders as a clean
 * framed demo with heading + "Live demo" stage + nothing else. That is a
 * valid, intentional baseline; do not add empty-string placeholders.
 */
export interface DemoVariant {
  id: string
  label: string
  component: Component
  description?: string
  intro?: string
  keyPoints?: string[]
  notes?: DemoNote[]
  takeaway?: string
  accessibility?: string[]
  source?: string
  sourceName?: string
}

export interface DemoPrerequisite {
  label: string
  met: boolean
  hint?: string
}

const props = withDefaults(
  defineProps<{
    variants: DemoVariant[]
    prerequisites?: DemoPrerequisite[]
    state?: Record<string, unknown>
    defaultVariant?: string
    /** Multi-paragraph intro shown at the top of the whole demo. Split paragraphs with a blank line. */
    overview?: string
  }>(),
  { prerequisites: () => [], state: () => ({}), overview: '' }
)

const paragraphsOf = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)

const overviewParagraphs = computed(() => paragraphsOf(props.overview))

const jumpTo = (id: string) => {
  const el = document.getElementById(`variant-${id}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const activeVariantId = ref<string>(props.defaultVariant || props.variants[0]?.id || '')
let observer: IntersectionObserver | null = null

const parseVariantFromHash = (): string | null => {
  const hash = typeof window === 'undefined' ? '' : window.location.hash
  const m = /\/([a-z0-9-]+)$/i.exec(hash)
  return m ? m[1] : null
}

onMounted(() => {
  const fromHash = parseVariantFromHash()
  if (fromHash && props.variants.find((v) => v.id === fromHash)) {
    activeVariantId.value = fromHash
    requestAnimationFrame(() => {
      document.getElementById(`variant-${fromHash}`)?.scrollIntoView({ block: 'start' })
    })
  }
  if (typeof IntersectionObserver === 'undefined') return
  const visible = new Map<string, number>()
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = e.target.id.replace(/^variant-/, '')
        if (e.isIntersecting) visible.set(id, e.intersectionRatio)
        else visible.delete(id)
      }
      if (visible.size) {
        const [topId] = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]
        if (topId !== activeVariantId.value) {
          activeVariantId.value = topId
          const base = window.location.hash.split('/')[0] || '#'
          history.replaceState(null, '', `${base}/${topId}`)
        }
      }
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
  )
  for (const v of props.variants) {
    const el = document.getElementById(`variant-${v.id}`)
    if (el) observer.observe(el)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const iconFor = (k: DemoNoteKind): string =>
  k === 'tip' ? '💡' : k === 'warning' ? '⚠️' : 'ℹ️'

const labelFor = (k: DemoNoteKind): string =>
  k === 'tip' ? 'Tip' : k === 'warning' ? 'Warning' : 'Note'

const stateEntries = computed(() => Object.entries(props.state ?? {}))

const formatValue = (value: unknown): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const copiedId = ref<string | null>(null)
const copySource = async (v: DemoVariant) => {
  if (!v.source) return
  try {
    await navigator.clipboard.writeText(v.source)
    copiedId.value = v.id
    setTimeout(() => {
      if (copiedId.value === v.id) copiedId.value = null
    }, 1500)
  } catch {
    // clipboard blocked; ignore
  }
}
</script>

<style scoped>
.demo-shell {
  --demo-ink: #1a1410;
  --demo-paper: #faf6ef;
  --demo-paper-deep: #f2eadb;
  --demo-rule: #d9cfbb;
  --demo-accent: #c2410c;
  --demo-accent-warm: #ea580c;
  --demo-accent-soft: #fde9c8;
  --demo-muted: #6b5d4a;
  --demo-serif: 'Instrument Serif', 'Iowan Old Style', Georgia, serif;
  --demo-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --demo-sans: 'IBM Plex Sans', system-ui, sans-serif;

  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  font-family: var(--demo-sans);
  color: var(--demo-ink);
}


.demo-shell__overview {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.demo-shell__overview-prose p {
  margin: 0 0 0.7rem 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--demo-ink);
  font-family: var(--demo-sans);
}

.demo-shell__overview-prose p:first-child::first-letter {
  font-family: var(--demo-serif);
  font-style: italic;
  font-size: 2.4em;
  line-height: 0.9;
  float: left;
  padding: 0.08em 0.12em 0 0;
  color: var(--demo-accent);
}

.demo-shell__overview-prose p:last-child {
  margin-bottom: 0;
}

.demo-shell__jump {
  position: sticky;
  top: 0.5rem;
  z-index: 5;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--demo-rule);
  border-left: 4px solid var(--demo-accent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--demo-paper) 94%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.demo-shell__jump-label {
  color: var(--demo-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.65rem;
  font-family: var(--demo-mono);
}

.demo-shell__jump-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  counter-reset: none;
}

.demo-shell__jump-link {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--demo-ink);
  text-decoration: none;
  padding: 0.3rem 0.8rem 0.3rem 0.4rem;
  border-radius: 2px;
  background: transparent;
  border: 1px solid var(--demo-rule);
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: var(--demo-sans);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.demo-shell__jump-link:hover {
  background: var(--demo-accent-soft);
  color: var(--demo-accent);
  border-color: var(--demo-accent);
}

.demo-shell__jump-link.active {
  background: var(--demo-ink);
  color: var(--demo-paper);
  border-color: var(--demo-ink);
}

.demo-shell__jump-link.active .demo-shell__jump-num {
  background: var(--demo-accent);
  color: var(--demo-paper);
}

.demo-shell__jump-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 2px;
  background: var(--demo-ink);
  color: var(--demo-paper);
  font-size: 0.7rem;
  font-weight: 700;
  font-family: var(--demo-mono);
}

.demo-shell__variant {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--demo-rule);
  border-radius: 3px;
  background-color: var(--demo-paper);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-size: 180px 180px;
  overflow: hidden;
  scroll-margin-top: 4rem;
  box-shadow: 4px 4px 0 var(--demo-ink);
  opacity: 0;
  transform: translateY(8px);
  animation: demo-reveal 0.5s ease-out forwards;
}

.demo-shell__variant:nth-of-type(1) { animation-delay: 0.05s; }
.demo-shell__variant:nth-of-type(2) { animation-delay: 0.15s; }
.demo-shell__variant:nth-of-type(3) { animation-delay: 0.25s; }
.demo-shell__variant:nth-of-type(4) { animation-delay: 0.35s; }

@keyframes demo-reveal {
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .demo-shell__variant {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.demo-shell__variant-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: 1rem;
  padding: 1.1rem 1.15rem 0.75rem;
  border-bottom: 1px solid var(--demo-rule);
  background: var(--demo-paper);
}

.demo-shell__variant-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: start;
  font-family: var(--demo-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--demo-accent);
  background: transparent;
  border: 1.5px solid var(--demo-accent);
  border-radius: 2px;
  padding: 0.25rem 0.5rem;
  flex-shrink: 0;
}

.demo-shell__variant-badge::before {
  content: 'Nº ';
  opacity: 0.6;
}

.demo-shell__variant-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.demo-shell__variant-title {
  margin: 0;
  font-family: var(--demo-serif);
  font-weight: 400;
  font-size: 1.65rem;
  line-height: 1.05;
  color: var(--demo-ink);
  letter-spacing: -0.01em;
}

.demo-shell__variant-desc {
  margin: 0.2rem 0 0 0;
  font-size: 0.875rem;
  color: var(--demo-muted);
  font-style: italic;
  font-family: var(--demo-serif);
}

.demo-shell__variant-file {
  font-family: var(--demo-mono);
  font-size: 0.68rem;
  padding: 0.25rem 0.5rem;
  border-radius: 2px;
  background: var(--demo-paper-deep);
  border: 1px solid var(--demo-rule);
  color: var(--demo-muted);
  white-space: nowrap;
  align-self: start;
  letter-spacing: 0.02em;
}

.demo-shell__variant-intro {
  padding: 0.9rem 1.15rem 0;
}

.demo-shell__variant-intro p {
  margin: 0 0 0.6rem 0;
  font-size: 0.925rem;
  line-height: 1.6;
  color: var(--demo-ink);
}

.demo-shell__variant-intro p:last-child {
  margin-bottom: 0;
}

.demo-shell__variant-intro code {
  font-family: var(--demo-mono);
  font-size: 0.85em;
  padding: 0.1rem 0.35rem;
  background: var(--demo-paper-deep);
  border: 1px solid var(--demo-rule);
  border-radius: 2px;
  color: var(--demo-accent);
}

.demo-shell__variant-keypoints {
  list-style: none;
  margin: 0.9rem 1.15rem 0;
  padding: 0;
  font-size: 0.875rem;
  color: var(--demo-ink);
  line-height: 1.5;
}

.demo-shell__variant-keypoints li {
  position: relative;
  padding: 0.2rem 0 0.2rem 1.5rem;
}

.demo-shell__variant-keypoints li::before {
  content: '→';
  position: absolute;
  left: 0.3rem;
  top: 0.2rem;
  color: var(--demo-accent);
  font-weight: 700;
  font-family: var(--demo-mono);
}

.demo-shell__stage-head {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  margin: 1.5rem 1.15rem 0;
  padding-top: 0.25rem;
}

.demo-shell__stage-rule {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    var(--demo-rule) 20%,
    var(--demo-rule) 80%,
    transparent
  );
}

.demo-shell__stage-label {
  font-family: var(--demo-mono);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--demo-muted);
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--demo-rule);
  border-radius: 2px;
  background: var(--demo-paper);
  box-shadow: 2px 2px 0 var(--demo-rule);
}

.demo-shell__stage-label::before {
  content: '◆ ';
  color: var(--demo-accent);
  margin-right: 0.2em;
}

.demo-shell__variant > .demo-shell__live {
  padding: 2rem 1.75rem 2.25rem;
  margin: 0.75rem 0.85rem 0;
  background: var(--demo-paper);
  border: 1px dashed var(--demo-rule);
  border-radius: 3px;
  position: relative;
}

.demo-shell__variant > .demo-shell__live::before,
.demo-shell__variant > .demo-shell__live::after {
  content: '';
  position: absolute;
  width: 0.5rem;
  height: 0.5rem;
  border: 1.5px solid var(--demo-accent);
}

.demo-shell__variant > .demo-shell__live::before {
  top: -0.3rem;
  left: -0.3rem;
  border-right: 0;
  border-bottom: 0;
}

.demo-shell__variant > .demo-shell__live::after {
  bottom: -0.3rem;
  right: -0.3rem;
  border-left: 0;
  border-top: 0;
}

.demo-shell__stage-foot {
  height: 1.5rem;
}

.demo-shell__callout {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin: 0.9rem 1.15rem 0;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--demo-rule);
  border-radius: 2px;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--demo-ink);
  background: var(--demo-paper-deep);
}

.demo-shell__callout-icon {
  font-size: 1rem;
  line-height: 1.25;
}

.demo-shell__callout-label {
  display: inline-block;
  margin-right: 0.4rem;
  font-family: var(--demo-mono);
  font-weight: 700;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.demo-shell__callout--tip {
  border-left: 3px solid var(--demo-accent);
}
.demo-shell__callout--tip .demo-shell__callout-label { color: var(--demo-accent); }

.demo-shell__callout--note {
  border-left: 3px solid var(--demo-muted);
}
.demo-shell__callout--note .demo-shell__callout-label { color: var(--demo-muted); }

.demo-shell__callout--warning {
  border-left: 3px solid #b91c1c;
  background: color-mix(in srgb, #b91c1c 6%, var(--demo-paper-deep));
}
.demo-shell__callout--warning .demo-shell__callout-label { color: #b91c1c; }

.demo-shell__panel--a11y {
  background: var(--demo-paper-deep);
}

.demo-shell__panel-count {
  margin-left: auto;
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  background: var(--demo-paper);
  color: var(--demo-muted);
  border: 1px solid var(--demo-rule);
  border-radius: 999px;
  font-weight: 600;
  font-family: var(--demo-mono);
}

.demo-shell__a11y {
  margin: 0;
  padding: 0.5rem 1.15rem 0.8rem 2.25rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--demo-ink);
}

.demo-shell__a11y li + li {
  margin-top: 0.25rem;
}

.demo-shell__variant-takeaway {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin: 0 1.15rem 1rem;
  padding: 0.75rem 0.9rem;
  background: var(--demo-ink);
  color: var(--demo-paper);
  border-radius: 2px;
  font-size: 0.925rem;
  line-height: 1.5;
  font-family: var(--demo-serif);
  font-style: italic;
}

.demo-shell__variant-takeaway-label {
  flex-shrink: 0;
  font-family: var(--demo-mono);
  font-style: normal;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  padding: 0.2rem 0.5rem;
  background: var(--demo-accent);
  color: var(--demo-paper);
  border-radius: 2px;
  margin-top: 0.2rem;
}

.demo-shell__variant > .demo-shell__panel {
  border: 0;
  border-top: 1px solid var(--demo-rule);
  border-radius: 0;
  background: var(--demo-paper-deep);
}

.demo-shell__variant > .demo-shell__panel > summary {
  font-family: var(--demo-mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--demo-muted);
}

.demo-shell__panel--a11y {
  background: var(--demo-paper-deep) !important;
}

.demo-shell__prereqs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.demo-shell__prereq {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: var(--demo-paper-deep);
  color: var(--demo-muted);
}

.demo-shell__prereq {
  font-family: var(--demo-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border: 1px solid var(--demo-rule);
  background: transparent;
  color: var(--demo-muted);
  border-radius: 2px;
}

.demo-shell__prereq.met {
  color: #047857;
  border-color: #047857;
  background: color-mix(in srgb, #047857 8%, transparent);
}

.demo-shell__prereq.unmet {
  color: var(--demo-accent);
  border-color: var(--demo-accent);
  background: var(--demo-accent-soft);
}

.demo-shell__prereq-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
}

.demo-shell__live {
  min-height: 6rem;
}

.demo-shell__panel--state {
  margin-top: 0.25rem;
}

.demo-shell__panel {
  border: 1px solid var(--demo-rule);
  border-radius: 2px;
  background: var(--demo-paper-deep);
}

.demo-shell__panel > summary {
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--demo-muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  list-style: none;
}

.demo-shell__panel > summary::-webkit-details-marker {
  display: none;
}

.demo-shell__panel > summary::before {
  content: '▸';
  font-size: 0.7rem;
  margin-right: 0.25rem;
  transition: transform 0.15s;
  display: inline-block;
}

.demo-shell__panel[open] > summary::before {
  transform: rotate(90deg);
}

.demo-shell__copy {
  border: 1px solid var(--demo-rule);
  background: var(--demo-paper);
  color: var(--demo-ink);
  padding: 0.15rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  cursor: pointer;
  font-family: var(--demo-mono);
}

.demo-shell__source {
  margin: 0;
  padding: 0.75rem 1rem;
  background: var(--demo-ink);
  color: var(--demo-paper);
  border-top: 1px solid var(--demo-rule);
  font-family: var(--demo-mono);
  font-size: 0.75rem;
  max-height: 28rem;
  overflow: auto;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.demo-shell__state {
  margin: 0;
  padding: 0.5rem 1rem 0.75rem;
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: 1rem;
  row-gap: 0.15rem;
  border-top: 1px solid var(--demo-rule);
  font-size: 0.75rem;
  color: var(--demo-ink);
}

.demo-shell__state dt {
  font-weight: 600;
  color: var(--demo-muted);
  font-family: var(--demo-mono);
}

.demo-shell__state dd {
  margin: 0;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>

<style>
html.dark-mode .demo-shell,
html.dark .demo-shell,
[data-p-theme='dark'] .demo-shell,
body.dark .demo-shell {
  --demo-ink: #f2eadb;
  --demo-paper: #1c160f;
  --demo-paper-deep: #12100b;
  --demo-rule: #3a2f22;
  --demo-accent: #fb923c;
  --demo-accent-warm: #f97316;
  --demo-accent-soft: #3a2514;
  --demo-muted: #a19077;
}
</style>
