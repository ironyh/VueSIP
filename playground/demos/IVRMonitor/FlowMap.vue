<template>
  <div class="ivf">
    <header class="ivf__head">
      <div>
        <span class="ivf__eyebrow">Flow map · last 24h</span>
        <h3 class="ivf__title">
          {{ totalEntries.toLocaleString() }} entries · {{ completionRate }}% completed
        </h3>
      </div>
      <span class="ivf__legend-wrap">
        <span class="ivf__legend">
          <span class="ivf__legend-dot ivf__legend-dot--hot"></span> high traffic
        </span>
        <span class="ivf__legend">
          <span class="ivf__legend-dot ivf__legend-dot--drop"></span> drop-off &gt; 15%
        </span>
      </span>
    </header>

    <ol class="ivf__flow" role="list">
      <li v-for="node in nodes" :key="node.id" class="ivf__level">
        <article
          class="ivf__node"
          :class="{
            'ivf__node--drop': node.dropRate > 15,
            'ivf__node--hot': node.visits > 500,
            'ivf__node--selected': selected === node.id,
          }"
          @click="selected = node.id"
          :aria-pressed="selected === node.id"
          role="button"
          tabindex="0"
          @keydown.enter="selected = node.id"
          @keydown.space.prevent="selected = node.id"
        >
          <div class="ivf__node-head">
            <span class="ivf__node-id">{{ node.id }}</span>
            <span class="ivf__node-name">{{ node.name }}</span>
          </div>
          <p class="ivf__node-prompt">"{{ node.prompt }}"</p>
          <dl class="ivf__node-stats">
            <div>
              <dt>Visits</dt>
              <dd>{{ node.visits.toLocaleString() }}</dd>
            </div>
            <div>
              <dt>Avg time</dt>
              <dd>{{ node.avgTime }}s</dd>
            </div>
            <div>
              <dt>Drop-off</dt>
              <dd :class="{ 'ivf__stat--bad': node.dropRate > 15 }">{{ node.dropRate }}%</dd>
            </div>
          </dl>
          <div v-if="node.options" class="ivf__opts">
            <div
              v-for="opt in node.options"
              :key="opt.digit"
              class="ivf__opt"
              :title="`${opt.pct}% of callers pressed ${opt.digit}`"
            >
              <span class="ivf__opt-digit">{{ opt.digit }}</span>
              <span class="ivf__opt-label">{{ opt.label }}</span>
              <span class="ivf__opt-bar" aria-hidden="true">
                <span class="ivf__opt-fill" :style="{ width: opt.pct + '%' }"></span>
              </span>
              <span class="ivf__opt-pct">{{ opt.pct }}%</span>
            </div>
          </div>
        </article>
      </li>
    </ol>

    <section v-if="selectedNode" class="ivf__detail">
      <span class="ivf__section-title">Node · {{ selectedNode.id }}</span>
      <p class="ivf__detail-text">
        Callers spend an average of
        <strong>{{ selectedNode.avgTime }}s</strong> here.
        <span v-if="selectedNode.dropRate > 15">
          The drop-off rate of
          <strong>{{ selectedNode.dropRate }}%</strong>
          is above the 15% action threshold — consider shortening the prompt or reordering options.
        </span>
        <span v-else> Drop-off is within tolerance. </span>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Option {
  digit: string
  label: string
  pct: number
}
interface Node {
  id: string
  name: string
  prompt: string
  visits: number
  avgTime: number
  dropRate: number
  options?: Option[]
}

const nodes: Node[] = [
  {
    id: 'root',
    name: 'Welcome',
    prompt: 'Thanks for calling Switchboard. For English, press 1. Para español, marque 2.',
    visits: 1842,
    avgTime: 6,
    dropRate: 3,
    options: [
      { digit: '1', label: 'English', pct: 91 },
      { digit: '2', label: 'Español', pct: 9 },
    ],
  },
  {
    id: 'main',
    name: 'Main menu',
    prompt: 'Press 1 for sales, 2 for support, 3 for billing, 0 to speak with an agent.',
    visits: 1676,
    avgTime: 11,
    dropRate: 8,
    options: [
      { digit: '1', label: 'Sales', pct: 24 },
      { digit: '2', label: 'Support', pct: 47 },
      { digit: '3', label: 'Billing', pct: 18 },
      { digit: '0', label: 'Operator', pct: 11 },
    ],
  },
  {
    id: 'support',
    name: 'Support triage',
    prompt:
      'For account issues press 1. For technical support press 2. To hear more options, press 9.',
    visits: 788,
    avgTime: 18,
    dropRate: 22,
    options: [
      { digit: '1', label: 'Account', pct: 38 },
      { digit: '2', label: 'Technical', pct: 44 },
      { digit: '9', label: 'More options', pct: 18 },
    ],
  },
  {
    id: 'billing',
    name: 'Billing menu',
    prompt:
      'For your balance press 1, to make a payment press 2, for all other billing questions press 0.',
    visits: 302,
    avgTime: 9,
    dropRate: 6,
    options: [
      { digit: '1', label: 'Balance (self-serve)', pct: 52 },
      { digit: '2', label: 'Pay bill', pct: 27 },
      { digit: '0', label: 'Billing agent', pct: 21 },
    ],
  },
  {
    id: 'queue',
    name: 'Queue entry',
    prompt: 'Please hold while we connect you to an agent.',
    visits: 1105,
    avgTime: 0,
    dropRate: 0,
  },
]

const selected = ref<string | null>('support')
const selectedNode = computed(() => nodes.find((n) => n.id === selected.value) || null)

const totalEntries = nodes[0].visits
const completionRate = computed(() => {
  const completed = nodes.find((n) => n.id === 'queue')?.visits || 0
  return Math.round((completed / totalEntries) * 100)
})
</script>

<style scoped>
.ivf {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --crit: #a41d08;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.ivf__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.ivf__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.ivf__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.ivf__legend-wrap {
  display: inline-flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.ivf__legend {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.ivf__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
.ivf__legend-dot--hot {
  background: var(--accent);
}
.ivf__legend-dot--drop {
  background: var(--crit);
}

.ivf__flow {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.ivf__level {
  position: relative;
}
.ivf__level:not(:last-child)::after {
  content: '';
  display: block;
  margin: 0.2rem auto 0;
  width: 2px;
  height: 12px;
  background: var(--rule);
}

.ivf__node {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 2px;
  padding: 0.65rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: pointer;
  transition: border-color 0.15s;
  width: 100%;
  text-align: left;
}
.ivf__node:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.ivf__node--hot {
  border-left-color: var(--accent);
}
.ivf__node--drop {
  border-left-color: var(--crit);
  background: color-mix(in srgb, var(--crit) 3%, var(--paper));
}
.ivf__node--selected {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.ivf__node-head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
}
.ivf__node-id {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--accent);
  border-radius: 2px;
}
.ivf__node-name {
  font-weight: 600;
  font-size: 0.92rem;
}

.ivf__node-prompt {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  line-height: 1.4;
  font-style: italic;
}

.ivf__node-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.45rem;
  margin: 0;
}
.ivf__node-stats div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0;
}
.ivf__node-stats dt {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.ivf__node-stats dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.88rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.ivf__stat--bad {
  color: var(--crit);
}

.ivf__opts {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.ivf__opt {
  display: grid;
  grid-template-columns: auto 1fr 80px auto;
  gap: 0.5rem;
  align-items: center;
}
.ivf__opt-digit {
  font-family: var(--mono);
  font-weight: 700;
  font-size: 0.72rem;
  color: var(--accent);
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.1rem 0.35rem;
  min-width: 1.6rem;
  text-align: center;
}
.ivf__opt-label {
  font-size: 0.78rem;
}
.ivf__opt-bar {
  display: inline-block;
  height: 6px;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
}
.ivf__opt-fill {
  display: block;
  height: 100%;
  background: var(--accent);
}
.ivf__opt-pct {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
  min-width: 3ch;
  text-align: right;
}

.ivf__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.ivf__detail {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-left: 2px solid var(--accent);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.ivf__detail-text {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--ink);
}
.ivf__detail-text strong {
  color: var(--accent);
  font-weight: 700;
}
</style>
