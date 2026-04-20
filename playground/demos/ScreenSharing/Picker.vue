<template>
  <div class="shp">
    <header class="shp__head">
      <div>
        <span class="shp__eyebrow">Choose what to share</span>
        <h3 class="shp__title">{{ sources.length }} sources · {{ mode }} preferred</h3>
      </div>
    </header>

    <div class="shp__tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        class="shp__tab"
        :class="{ 'shp__tab--on': tab === t.id }"
        :aria-selected="tab === t.id"
        @click="tab = t.id"
      >{{ t.label }} <span class="shp__tab-count">({{ countsFor(t.id) }})</span></button>
    </div>

    <ul class="shp__grid" role="list">
      <li v-for="s in filtered" :key="s.id">
        <button
          type="button"
          class="shp__card"
          :class="{ 'shp__card--on': s.id === selected }"
          @click="selected = s.id"
          :aria-pressed="s.id === selected"
        >
          <div class="shp__thumb" :style="{ background: s.thumb }">
            <span class="shp__thumb-kind">{{ s.kind.toUpperCase() }}</span>
          </div>
          <span class="shp__card-label">{{ s.label }}</span>
          <span class="shp__card-meta">{{ s.meta }}</span>
        </button>
      </li>
    </ul>

    <section class="shp__opts">
      <div class="shp__opt">
        <span class="shp__opt-label">Frame rate</span>
        <div class="shp__chips" role="radiogroup" aria-label="Frame rate">
          <button
            v-for="f in [15, 24, 30]"
            :key="f"
            type="button"
            role="radio"
            class="shp__chip"
            :class="{ 'shp__chip--on': fps === f }"
            :aria-checked="fps === f"
            @click="fps = f"
          >{{ f }} fps</button>
        </div>
      </div>
      <div class="shp__opt">
        <span class="shp__opt-label">Content hint</span>
        <div class="shp__chips" role="radiogroup" aria-label="Content hint">
          <button
            v-for="h in hints"
            :key="h.id"
            type="button"
            role="radio"
            class="shp__chip"
            :class="{ 'shp__chip--on': hint === h.id }"
            :aria-checked="hint === h.id"
            @click="hint = h.id"
          >{{ h.label }}</button>
        </div>
      </div>
      <label class="shp__cb">
        <input type="checkbox" v-model="audio" />
        <span>{{ audio ? 'Include tab audio' : 'Video only' }}</span>
      </label>
    </section>

    <footer class="shp__actions">
      <button type="button" class="shp__btn">Cancel</button>
      <button
        type="button"
        class="shp__btn shp__btn--primary"
        :disabled="!selected"
      >Share {{ selected ? selectedLabel : '…' }}</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const tabs = [
  { id: 'screen', label: 'Entire screen' },
  { id: 'window', label: 'Window' },
  { id: 'tab',    label: 'Chrome tab' },
]

const sources = [
  { id: 's1', kind: 'screen', label: 'Display 1 (2560×1440)',      meta: 'Primary',       thumb: 'linear-gradient(135deg, #2a4466, #1a2a3a)' },
  { id: 's2', kind: 'screen', label: 'Display 2 (1920×1080)',      meta: 'Secondary',     thumb: 'linear-gradient(135deg, #4a3a2a, #2a1a0a)' },
  { id: 'w1', kind: 'window', label: 'Figma · Switchboard design', meta: 'Figma',         thumb: 'linear-gradient(135deg, #3a2a4a, #1a0a2a)' },
  { id: 'w2', kind: 'window', label: 'Terminal · pbx-prod',        meta: 'iTerm2',        thumb: 'linear-gradient(135deg, #0a1a0a, #0a0a0a)' },
  { id: 'w3', kind: 'window', label: 'Postman — AMI actions',      meta: 'Postman',       thumb: 'linear-gradient(135deg, #4a2a2a, #2a1a1a)' },
  { id: 't1', kind: 'tab',    label: 'Switchboard · Incident 742', meta: 'Chrome',        thumb: 'linear-gradient(135deg, #c2410c, #7c2d12)' },
  { id: 't2', kind: 'tab',    label: 'Notion · Runbooks',          meta: 'Chrome',        thumb: 'linear-gradient(135deg, #3a3a3a, #1a1a1a)' },
  { id: 't3', kind: 'tab',    label: 'Jira · PBX-204',             meta: 'Chrome',        thumb: 'linear-gradient(135deg, #0c4a6e, #0a1a2a)' },
]

const hints = [
  { id: 'motion', label: 'Motion' },
  { id: 'detail', label: 'Detail (text)' },
  { id: 'text',   label: 'Slides' },
]

const tab = ref<'screen' | 'window' | 'tab'>('window')
const selected = ref('w1')
const fps = ref(24)
const hint = ref<'motion' | 'detail' | 'text'>('detail')
const audio = ref(false)

const filtered = computed(() => sources.filter(s => s.kind === tab.value))
const countsFor = (k: string) => sources.filter(s => s.kind === k).length
const selectedLabel = computed(() => sources.find(s => s.id === selected.value)?.label ?? '')
const mode = computed(() => `${fps.value}fps · ${hint.value}`)
</script>

<style scoped>
.shp {
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

.shp__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.shp__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.shp__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; }

.shp__tabs { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.shp__tab {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem 0.8rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); cursor: pointer;
}
.shp__tab--on { background: var(--accent); border-color: var(--accent); color: var(--paper); }
.shp__tab-count { margin-left: 0.35rem; opacity: 0.85; font-size: 0.66rem; letter-spacing: 0; }

.shp__grid {
  list-style: none; padding: 0; margin: 0;
  display: grid; gap: 0.4rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.shp__card {
  display: flex; flex-direction: column; gap: 0.35rem;
  width: 100%; text-align: left;
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.4rem; cursor: pointer; transition: all 0.12s;
}
.shp__card:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--rule)); }
.shp__card--on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, transparent); }

.shp__thumb {
  aspect-ratio: 16 / 10;
  border: 1px solid var(--rule); border-radius: 2px;
  position: relative;
  display: flex; align-items: flex-end; padding: 0.3rem;
}
.shp__thumb-kind {
  font-family: var(--mono); font-size: 0.58rem; font-weight: 700;
  letter-spacing: 0.12em;
  color: #faf6ef;
  background: rgba(0,0,0,0.45);
  padding: 0.1rem 0.35rem; border-radius: 2px;
}

.shp__card-label { font-size: 0.82rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.shp__card-meta { font-family: var(--mono); font-size: 0.64rem; color: var(--muted); }

.shp__opts {
  display: flex; gap: 0.75rem; flex-wrap: wrap;
  padding: 0.55rem 0.7rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  align-items: center;
}
.shp__opt { display: flex; flex-direction: column; gap: 0.25rem; }
.shp__opt-label {
  font-family: var(--mono); font-size: 0.62rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.shp__chips { display: flex; gap: 0.25rem; }
.shp__chip {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono); font-size: 0.68rem; font-weight: 700;
  color: var(--muted); cursor: pointer;
  letter-spacing: 0.05em;
}
.shp__chip--on { background: var(--accent); border-color: var(--accent); color: var(--paper); }

.shp__cb {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: var(--mono); font-size: 0.72rem; color: var(--ink);
  margin-left: auto;
}

.shp__actions {
  display: flex; gap: 0.4rem; justify-content: flex-end;
  padding-top: 0.35rem; border-top: 1px dashed var(--rule);
}
.shp__btn {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem 0.9rem;
  font-family: var(--mono); font-size: 0.72rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink); cursor: pointer;
}
.shp__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.shp__btn--primary { background: var(--accent); border-color: var(--accent); color: var(--paper); }
</style>
