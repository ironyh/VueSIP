<template>
  <div class="csd">
    <header class="csd__head">
      <div>
        <span class="csd__eyebrow">Dock position · per-user preference</span>
        <h3 class="csd__title">{{ positions.find(p => p.id === selected)!.label }}</h3>
      </div>
      <span class="csd__meta">persists via <code>localStorage</code></span>
    </header>

    <div class="csd__stage" aria-label="Dock preview">
      <div class="csd__app">
        <div class="csd__app-head">
          <span class="csd__app-dot" /><span class="csd__app-dot" /><span class="csd__app-dot" />
          <span class="csd__app-url">switchboard.example.com / tickets</span>
        </div>
        <div class="csd__app-body">
          <div class="csd__line" v-for="n in 5" :key="n" :style="{ width: (40 + n * 10) + '%' }" />
        </div>
        <div class="csd__dock" :class="`csd__dock--${selected}`">
          <span class="csd__dock-initials">PP</span>
          <span class="csd__dock-name">Priya</span>
          <span class="csd__dock-timer">02:14</span>
        </div>
      </div>
    </div>

    <section class="csd__section">
      <span class="csd__section-title">Position</span>
      <ul class="csd__positions" role="radiogroup" aria-label="Dock position">
        <li v-for="p in positions" :key="p.id">
          <button
            type="button"
            role="radio"
            class="csd__pos"
            :class="{ 'csd__pos--on': p.id === selected }"
            :aria-checked="p.id === selected"
            @click="selected = p.id"
          >
            <span class="csd__pos-frame" :class="`csd__pos-frame--${p.id}`"><span /></span>
            <span class="csd__pos-label">{{ p.label }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section class="csd__section">
      <span class="csd__section-title">Behaviour</span>
      <div class="csd__opts">
        <label class="csd__opt">
          <input type="checkbox" v-model="collapsedOnRoute" />
          <span>Collapse to tab title on route change</span>
        </label>
        <label class="csd__opt">
          <input type="checkbox" v-model="draggable" />
          <span>Draggable (persist final position per user)</span>
        </label>
        <label class="csd__opt">
          <input type="checkbox" v-model="alwaysOnTop" />
          <span>Always on top of modals</span>
        </label>
      </div>
    </section>

    <footer class="csd__foot">
      <span>
        The floating widget is one Vue component mounted at app root with <code>position: fixed</code>. Users drag it,
        we persist the coordinates; route changes do not unmount it, so the call survives navigation.
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const positions = [
  { id: 'tl', label: 'Top left' },
  { id: 'tr', label: 'Top right' },
  { id: 'bl', label: 'Bottom left' },
  { id: 'br', label: 'Bottom right' },
  { id: 'bar',label: 'Full-width bottom bar' },
]

const selected = ref<'tl' | 'tr' | 'bl' | 'br' | 'bar'>('br')
const collapsedOnRoute = ref(false)
const draggable = ref(true)
const alwaysOnTop = ref(true)
</script>

<style scoped>
.csd {
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

.csd__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.csd__eyebrow {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
}
.csd__title { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.04em; }
.csd__meta { font-family: var(--mono); font-size: 0.66rem; color: var(--muted); }
.csd__meta code {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}

.csd__stage {
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.6rem;
}
.csd__app {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--paper);
  border: 1px solid var(--rule); border-radius: 2px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.csd__app-head {
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  background: var(--paper-deep);
  border-bottom: 1px solid var(--rule);
}
.csd__app-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.csd__app-url {
  margin-left: 0.5rem;
  font-family: var(--mono); font-size: 0.64rem; color: var(--muted);
}
.csd__app-body {
  flex: 1; padding: 0.75rem;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.csd__line {
  height: 0.55rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}

.csd__dock {
  position: absolute;
  display: flex; align-items: center; gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  background: var(--ink); color: var(--paper);
  border: 1px solid color-mix(in srgb, var(--ink) 70%, black);
  border-radius: 2px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
  font-family: var(--mono); font-size: 0.7rem;
  transition: all 0.3s ease;
}
.csd__dock--tl { top: 0.5rem; left: 0.5rem; }
.csd__dock--tr { top: 0.5rem; right: 0.5rem; }
.csd__dock--bl { bottom: 0.5rem; left: 0.5rem; }
.csd__dock--br { bottom: 0.5rem; right: 0.5rem; }
.csd__dock--bar {
  bottom: 0; left: 0; right: 0;
  justify-content: flex-start;
  border-radius: 0;
  padding: 0.5rem 1rem;
}

.csd__dock-initials {
  width: 1.3rem; height: 1.3rem; border-radius: 50%;
  background: var(--accent); color: var(--paper);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.58rem; font-weight: 700;
}
.csd__dock-name { font-weight: 600; }
.csd__dock-timer { color: #fb923c; font-weight: 700; margin-left: auto; }

.csd__section { display: flex; flex-direction: column; gap: 0.35rem; }
.csd__section-title {
  font-family: var(--mono); font-size: 0.64rem; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted);
}

.csd__positions {
  list-style: none; padding: 0; margin: 0;
  display: grid; gap: 0.35rem;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}
.csd__pos {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0.45rem;
  display: flex; flex-direction: column; gap: 0.35rem; align-items: center;
  font-family: var(--mono); font-size: 0.68rem; color: var(--muted);
  cursor: pointer;
}
.csd__pos--on { background: color-mix(in srgb, var(--accent) 8%, transparent); border-color: var(--accent); color: var(--accent); }

.csd__pos-frame {
  position: relative;
  width: 4rem; height: 2.3rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
}
.csd__pos-frame span {
  position: absolute; width: 1rem; height: 0.5rem;
  background: var(--accent); border-radius: 1px;
}
.csd__pos-frame--tl span { top: 4px; left: 4px; }
.csd__pos-frame--tr span { top: 4px; right: 4px; }
.csd__pos-frame--bl span { bottom: 4px; left: 4px; }
.csd__pos-frame--br span { bottom: 4px; right: 4px; }
.csd__pos-frame--bar span { bottom: 4px; left: 4px; right: 4px; width: auto; }

.csd__opts { display: flex; flex-direction: column; gap: 0.2rem; }
.csd__opt {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0; font-size: 0.86rem;
  border-bottom: 1px dashed var(--rule);
}
.csd__opt:last-child { border-bottom: 0; }

.csd__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep); border: 1px solid var(--rule); border-radius: 2px;
  font-family: var(--mono); font-size: 0.7rem; color: var(--muted);
}
.csd__foot code {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 0 0.3rem; color: var(--accent);
}
</style>
