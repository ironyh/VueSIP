<template>
  <div class="spi">
    <header class="spi__head">
      <div>
        <span class="spi__eyebrow">Storage inspector · {{ store }}</span>
        <h3 class="spi__title">{{ entries.length }} keys · {{ totalBytes }} bytes</h3>
      </div>
      <div class="spi__tabs" role="tablist">
        <button
          v-for="s in stores"
          :key="s.id"
          type="button"
          role="tab"
          class="spi__tab"
          :class="{ 'spi__tab--on': store === s.id }"
          :aria-selected="store === s.id"
          @click="store = s.id"
        >{{ s.label }}</button>
      </div>
    </header>

    <ul class="spi__list" role="list">
      <li v-for="e in entries" :key="e.key" class="spi__row">
        <div class="spi__row-head" @click="open = open === e.key ? null : e.key">
          <span class="spi__key">{{ e.key }}</span>
          <span class="spi__size">{{ e.bytes }} B</span>
          <span class="spi__toggle" :aria-expanded="open === e.key">{{ open === e.key ? '−' : '+' }}</span>
        </div>
        <pre v-if="open === e.key" class="spi__value">{{ e.value }}</pre>
      </li>
    </ul>

    <footer class="spi__foot">
      <span>
        Session state goes in <code>sessionStorage</code> (wiped on tab close); preferences in <code>localStorage</code>;
        credentials only in <code>IndexedDB</code> with per-origin encryption. Never put secrets in any of the first two —
        they survive the browser's devtools without password prompts.
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const stores = [
  { id: 'session', label: 'sessionStorage' },
  { id: 'local',   label: 'localStorage' },
  { id: 'indexed', label: 'IndexedDB' },
]

const store = ref<'session' | 'local' | 'indexed'>('session')

const data: Record<typeof store.value, Array<{ key: string; value: string; bytes: number }>> = {
  session: [
    {
      key: 'vuesip:dialog:b8a7c9',
      value: JSON.stringify({
        callId: 'b8a7c9-e45f-4c8a',
        localTag: '9f3b1e',
        remoteTag: 'a720c4',
        cseq: 1012,
        contact: '<sip:alex@10.0.2.14:50102;transport=wss>',
        remote: 'sip:priya@example.com',
        state: 'confirmed',
        startedAt: '2026-04-20T14:02:11Z',
      }, null, 2),
      bytes: 228,
    },
    {
      key: 'vuesip:widget:position',
      value: JSON.stringify({ corner: 'br', x: null, y: null }),
      bytes: 38,
    },
  ],
  local: [
    {
      key: 'vuesip:user:prefs',
      value: JSON.stringify({
        codec: 'opus',
        ringSeconds: 30,
        missedEmail: true,
        vmTranscript: true,
        dockCorner: 'br',
        autoEnterPiP: true,
      }, null, 2),
      bytes: 146,
    },
    {
      key: 'vuesip:recent-peers',
      value: JSON.stringify([
        '+14155550100', '+14155550182', 'sip:priya@example.com',
      ]),
      bytes: 72,
    },
    {
      key: 'vuesip:theme',
      value: '"switchboard"',
      bytes: 13,
    },
  ],
  indexed: [
    {
      key: 'vuesip.credentials/alex',
      value: '[encrypted with CryptoKey derived from Web Authentication] — ciphertext omitted',
      bytes: 2048,
    },
    {
      key: 'vuesip.recordings/c-501',
      value: '[binary webm blob] — 4.2 MB — retention 30 days',
      bytes: 4_421_120,
    },
  ],
}

const entries = computed(() => data[store.value])
const totalBytes = computed(() => entries.value.reduce((s, e) => s + e.bytes, 0).toLocaleString())
const open = ref<string | null>('vuesip:dialog:b8a7c9')
</script>

<style scoped>
.spi {
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

.spi__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.spi__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.spi__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; font-variant-numeric: tabular-nums; }

.spi__tabs { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.spi__tab {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.35rem 0.7rem;
  font-family: var(--mono); font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--muted); cursor: pointer;
}
.spi__tab--on { background: var(--accent); border-color: var(--accent); color: var(--paper); }

.spi__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.spi__row {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  overflow: hidden;
}
.spi__row-head {
  display: grid; grid-template-columns: 1fr auto 1.5rem;
  gap: 0.55rem; align-items: center;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}
.spi__row-head:hover { background: color-mix(in srgb, var(--accent) 4%, transparent); }
.spi__key { font-family: var(--mono); font-size: 0.78rem; font-weight: 700; color: var(--accent); }
.spi__size {
  font-family: var(--mono); font-size: 0.66rem; color: var(--muted);
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.1rem 0.35rem; font-variant-numeric: tabular-nums;
}
.spi__toggle { font-family: var(--mono); font-size: 1rem; color: var(--muted); text-align: center; }

.spi__value {
  margin: 0;
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border-top: 1px solid var(--rule);
  font-family: var(--mono); font-size: 0.72rem; line-height: 1.5; color: var(--ink);
  overflow-x: auto; white-space: pre;
}

.spi__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.spi__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
