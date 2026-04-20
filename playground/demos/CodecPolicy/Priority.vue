<template>
  <div class="cpp">
    <header class="cpp__head">
      <div>
        <span class="cpp__eyebrow">Codec preference · tenant policy</span>
        <h3 class="cpp__title">{{ enabled.length }} allowed · {{ disabled.length }} blocked</h3>
      </div>
      <span class="cpp__hint">Drag or use ↑/↓ to reorder. Top row is negotiated first.</span>
    </header>

    <section class="cpp__group">
      <span class="cpp__group-title">Allowed (in order)</span>
      <ul class="cpp__list" role="list">
        <li v-for="(c, i) in enabled" :key="c.id" class="cpp__row">
          <span class="cpp__rank">{{ i + 1 }}</span>
          <div class="cpp__body">
            <span class="cpp__name">{{ c.name }}</span>
            <span class="cpp__meta">{{ c.rate }} Hz · {{ c.kbps }} kbps · {{ c.family }}</span>
          </div>
          <div class="cpp__actions">
            <button type="button" class="cpp__icon" :disabled="i === 0" @click="move(c.id, -1)" aria-label="Move up">↑</button>
            <button type="button" class="cpp__icon" :disabled="i === enabled.length - 1" @click="move(c.id, +1)" aria-label="Move down">↓</button>
            <button type="button" class="cpp__icon cpp__icon--danger" @click="toggle(c.id)" aria-label="Disable">✕</button>
          </div>
        </li>
      </ul>
    </section>

    <section class="cpp__group cpp__group--muted">
      <span class="cpp__group-title">Blocked</span>
      <ul class="cpp__list" role="list">
        <li v-for="c in disabled" :key="c.id" class="cpp__row cpp__row--off">
          <span class="cpp__rank">—</span>
          <div class="cpp__body">
            <span class="cpp__name">{{ c.name }}</span>
            <span class="cpp__meta">{{ c.rate }} Hz · {{ c.kbps }} kbps · {{ c.family }}</span>
          </div>
          <div class="cpp__actions">
            <button type="button" class="cpp__icon" @click="toggle(c.id)" aria-label="Enable">+</button>
          </div>
        </li>
      </ul>
    </section>

    <section class="cpp__preview">
      <span class="cpp__preview-title">pjsip.conf · endpoint preview</span>
      <pre class="cpp__code">disallow = all
allow = {{ enabled.map(c => c.id).join(',') || '(empty)' }}</pre>
    </section>

    <footer class="cpp__foot">
      <span>Opus first is the right default for browser-to-PBX; legacy PSTN trunks fall back to ulaw/alaw regardless.</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

interface Codec { id: string; name: string; rate: number; kbps: number; family: string; on: boolean }

const codecs = reactive<Codec[]>([
  { id: 'opus',  name: 'Opus',       rate: 48000, kbps: 32, family: 'browser',  on: true },
  { id: 'g722',  name: 'G.722',      rate: 16000, kbps: 64, family: 'HD',       on: true },
  { id: 'ulaw',  name: 'G.711 μ-law',rate: 8000,  kbps: 64, family: 'narrowband',on: true },
  { id: 'alaw',  name: 'G.711 A-law',rate: 8000,  kbps: 64, family: 'narrowband',on: false },
  { id: 'g729',  name: 'G.729',      rate: 8000,  kbps: 8,  family: 'licensed', on: false },
  { id: 'speex', name: 'Speex',      rate: 16000, kbps: 24, family: 'legacy',   on: false },
])

const enabled = computed(() => codecs.filter(c => c.on))
const disabled = computed(() => codecs.filter(c => !c.on))

const move = (id: string, dir: -1 | 1) => {
  const i = codecs.findIndex(c => c.id === id)
  let j = i + dir
  while (j >= 0 && j < codecs.length && !codecs[j].on) j += dir
  if (j < 0 || j >= codecs.length) return
  ;[codecs[i], codecs[j]] = [codecs[j], codecs[i]]
}
const toggle = (id: string) => {
  const c = codecs.find(x => x.id === id)
  if (c) c.on = !c.on
}
</script>

<style scoped>
.cpp {
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

.cpp__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.cpp__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.cpp__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.cpp__hint { font-family: var(--mono); font-size: 0.68rem; color: var(--muted); }

.cpp__group {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem 0.75rem;
  display: flex; flex-direction: column; gap: 0.35rem;
}
.cpp__group--muted { background: var(--paper-deep); opacity: 0.88; }
.cpp__group-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.cpp__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }
.cpp__row {
  display: grid;
  grid-template-columns: 2rem 1fr auto;
  gap: 0.55rem; align-items: center;
  padding: 0.4rem 0.55rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
}
.cpp__row--off { opacity: 0.7; }

.cpp__rank {
  font-family: var(--mono); font-weight: 700; font-size: 0.82rem; color: var(--accent);
  text-align: center;
}
.cpp__row--off .cpp__rank { color: var(--muted); }

.cpp__body { display: flex; flex-direction: column; gap: 0.1rem; }
.cpp__name { font-weight: 600; font-size: 0.9rem; }
.cpp__meta { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); letter-spacing: 0.04em; }

.cpp__actions { display: flex; gap: 0.2rem; }
.cpp__icon {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  width: 1.75rem; height: 1.6rem;
  font-family: var(--mono); font-size: 0.8rem; color: var(--muted); cursor: pointer;
}
.cpp__icon:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.cpp__icon:disabled { opacity: 0.3; cursor: not-allowed; }
.cpp__icon--danger:hover { color: #b91c1c; border-color: #b91c1c; }

.cpp__preview { display: flex; flex-direction: column; gap: 0.35rem; }
.cpp__preview-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}
.cpp__code {
  margin: 0;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.55rem 0.75rem;
  font-family: var(--mono); font-size: 0.75rem; line-height: 1.5; color: var(--ink);
  overflow-x: auto; white-space: pre;
}

.cpp__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
</style>
