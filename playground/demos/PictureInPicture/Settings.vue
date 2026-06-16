<template>
  <div class="pis">
    <header class="pis__head">
      <div>
        <span class="pis__eyebrow">Picture-in-picture · preferences</span>
        <h3 class="pis__title">Behaviour &amp; fallback policy</h3>
      </div>
      <span class="pis__caps">{{ capsSummary }}</span>
    </header>

    <dl class="pis__fields">
      <div class="pis__field">
        <dt>Auto-enter on tab hide</dt>
        <dd>
          <label class="pis__switch">
            <input type="checkbox" v-model="prefs.autoEnter" />
            <span>{{ prefs.autoEnter ? 'Enabled' : 'Disabled' }}</span>
          </label>
          <span class="pis__hint"
            >Calls `requestPictureInPicture()` when `visibilitychange` fires hidden.</span
          >
        </dd>
      </div>
      <div class="pis__field">
        <dt>Preferred size</dt>
        <dd>
          <div class="pis__chips" role="radiogroup" aria-label="PiP size">
            <button
              v-for="s in sizes"
              :key="s.id"
              type="button"
              role="radio"
              class="pis__chip"
              :class="{ 'pis__chip--on': prefs.size === s.id }"
              :aria-checked="prefs.size === s.id"
              @click="prefs.size = s.id"
            >
              {{ s.label }}
            </button>
          </div>
        </dd>
      </div>
      <div class="pis__field">
        <dt>Docked corner (document PiP)</dt>
        <dd>
          <div class="pis__corners" role="radiogroup" aria-label="Dock corner">
            <button
              v-for="c in corners"
              :key="c.id"
              type="button"
              role="radio"
              class="pis__corner"
              :class="[`pis__corner--${c.id}`, { 'pis__corner--on': prefs.corner === c.id }]"
              :aria-checked="prefs.corner === c.id"
              :aria-label="c.label"
              @click="prefs.corner = c.id"
            ></button>
          </div>
          <span class="pis__hint"
            >Chromium's `documentPictureInPicture.requestWindow` accepts `width`/`height`; corner is
            restored on next entry.</span
          >
        </dd>
      </div>
      <div class="pis__field">
        <dt>Controls in PiP</dt>
        <dd>
          <ul class="pis__ctrls" role="list">
            <li v-for="c in controls" :key="c.id">
              <label class="pis__row">
                <input type="checkbox" v-model="prefs.controls[c.id]" />
                <span class="pis__ctrl-label">{{ c.label }}</span>
                <span class="pis__ctrl-desc">{{ c.desc }}</span>
              </label>
            </li>
          </ul>
        </dd>
      </div>
      <div class="pis__field">
        <dt>iOS fallback</dt>
        <dd>
          <select v-model="prefs.iosFallback" class="pis__input">
            <option value="native">Native video PiP (iOS 15+)</option>
            <option value="overlay">Floating overlay (custom)</option>
            <option value="none">Inline only</option>
          </select>
          <span class="pis__hint"
            >Safari on iOS only exposes video PiP — document PiP is Chromium desktop.</span
          >
        </dd>
      </div>
    </dl>

    <footer class="pis__foot">
      <span>
        Document PiP (<code>documentPictureInPicture.requestWindow</code>) lets you render a Vue app
        inside the floating window — that is how call controls survive tabbing away. Fall back to
        `video.requestPictureInPicture()` on browsers without it.
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'

const sizes = [
  { id: 'sm', label: 'Small · 240×135' },
  { id: 'md', label: 'Medium · 360×202' },
  { id: 'lg', label: 'Large · 480×270' },
]
const corners = [
  { id: 'tl', label: 'Top left' },
  { id: 'tr', label: 'Top right' },
  { id: 'bl', label: 'Bottom left' },
  { id: 'br', label: 'Bottom right' },
]
const controls = [
  { id: 'mute', label: 'Mute', desc: 'Exposes mic toggle in the floating window.' },
  { id: 'hangup', label: 'Hang up', desc: 'Red X button to end the call from PiP.' },
  { id: 'dtmf', label: 'DTMF keypad', desc: 'Pop-out numeric keypad for IVR navigation.' },
  { id: 'video', label: 'Camera toggle', desc: 'Stop/start local camera without exiting PiP.' },
  { id: 'transfer', label: 'Transfer shortcut', desc: 'Open the inline transfer panel on demand.' },
]

const prefs = reactive({
  autoEnter: true,
  size: 'md',
  corner: 'br',
  controls: { mute: true, hangup: true, dtmf: false, video: true, transfer: false } as Record<
    string,
    boolean
  >,
  iosFallback: 'native',
})

const capsSummary = computed(() => 'video PiP · document PiP · auto-enter')
</script>

<style scoped>
.pis {
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
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.pis__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pis__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.pis__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.pis__caps {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.pis__fields {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  margin: 0;
}
.pis__field {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.pis__field dt {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.pis__field dd {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pis__hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.pis__hint code {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}

.pis__switch {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  cursor: pointer;
  width: fit-content;
}
.pis__switch:has(input:checked) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.pis__chips {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.pis__chip {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
  cursor: pointer;
}
.pis__chip--on {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--paper);
}

.pis__corners {
  display: grid;
  grid-template-columns: repeat(2, 2.2rem);
  gap: 0.25rem;
  padding: 0.4rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  width: fit-content;
}
.pis__corner {
  width: 2.2rem;
  height: 1.4rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
}
.pis__corner--on {
  background: var(--accent);
  border-color: var(--accent);
}

.pis__ctrls {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.pis__row {
  display: grid;
  grid-template-columns: 1.1rem 6rem 1fr;
  gap: 0.35rem;
  padding: 0.3rem 0;
  border-bottom: 1px dashed var(--rule);
  align-items: baseline;
  cursor: pointer;
}
.pis__row:last-child {
  border-bottom: 0;
}
.pis__ctrl-label {
  font-size: 0.84rem;
  font-weight: 600;
}
.pis__ctrl-desc {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.pis__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.5rem;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--ink);
  max-width: 16rem;
}

.pis__foot {
  padding: 0.55rem 0.75rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.pis__foot code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}
</style>
