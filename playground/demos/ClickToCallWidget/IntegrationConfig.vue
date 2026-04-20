<template>
  <div class="wcfg">
    <header class="wcfg__head">
      <div>
        <span class="wcfg__eyebrow">Integration · copy the snippet</span>
        <h3 class="wcfg__title">Embed on any host page</h3>
      </div>
      <button
        type="button"
        class="wcfg__copy"
        :class="{ 'wcfg__copy--ok': copied }"
        @click="copy"
        aria-label="Copy snippet"
      >
        {{ copied ? 'Copied ✓' : 'Copy snippet' }}
      </button>
    </header>

    <section class="wcfg__grid">
      <article class="wcfg__section">
        <span class="wcfg__section-title">Destination</span>
        <label class="wcfg__field">
          <span>Label</span>
          <input v-model="config.label" class="wcfg__input" aria-label="Button label" />
        </label>
        <label class="wcfg__field">
          <span>SIP URI</span>
          <input v-model="config.uri" class="wcfg__input" aria-label="SIP URI" />
        </label>
        <label class="wcfg__field">
          <span>Default caller name</span>
          <input
            v-model="config.callerName"
            class="wcfg__input"
            aria-label="Caller name"
            placeholder="Anonymous web visitor"
          />
        </label>
      </article>

      <article class="wcfg__section">
        <span class="wcfg__section-title">Look &amp; feel</span>
        <label class="wcfg__field">
          <span>Theme</span>
          <div class="wcfg__themes" role="radiogroup" aria-label="Theme">
            <button
              v-for="t in themes"
              :key="t.id"
              type="button"
              class="wcfg__theme"
              :class="{ 'wcfg__theme--on': config.theme === t.id }"
              role="radio"
              :aria-checked="config.theme === t.id"
              @click="config.theme = t.id"
            >
              <span class="wcfg__theme-swatch" :style="{ background: t.swatch }"></span>
              {{ t.label }}
            </button>
          </div>
        </label>
        <label class="wcfg__field">
          <span>Corner</span>
          <select v-model="config.corner" class="wcfg__input" aria-label="Widget corner">
            <option value="inline">Inline · in-page</option>
            <option value="bottom-right">Floating · bottom right</option>
            <option value="bottom-left">Floating · bottom left</option>
          </select>
        </label>
        <label class="wcfg__field">
          <span>Density</span>
          <div class="wcfg__pills" role="radiogroup" aria-label="Density">
            <button
              v-for="d in densities"
              :key="d"
              type="button"
              class="wcfg__pill"
              :class="{ 'wcfg__pill--on': config.density === d }"
              role="radio"
              :aria-checked="config.density === d"
              @click="config.density = d"
            >
              {{ d }}
            </button>
          </div>
        </label>
      </article>

      <article class="wcfg__section">
        <span class="wcfg__section-title">Security</span>
        <label class="wcfg__field">
          <span>Domain allowlist (one per line)</span>
          <textarea
            v-model="config.allowlist"
            class="wcfg__input wcfg__input--area"
            rows="3"
            aria-label="Allowed origins"
          ></textarea>
        </label>
        <label class="wcfg__check">
          <input type="checkbox" v-model="config.requireTls" />
          <span>
            Refuse to load over plain HTTP
            <span class="wcfg__hint"
              >WebRTC requires HTTPS; let the widget fail loudly if the host is misconfigured.</span
            >
          </span>
        </label>
        <label class="wcfg__check">
          <input type="checkbox" v-model="config.rateLimit" />
          <span>
            Rate-limit: 3 calls per visitor per hour
            <span class="wcfg__hint">Prevents abuse from public kiosks and bored visitors.</span>
          </span>
        </label>
      </article>
    </section>

    <section class="wcfg__snippet">
      <div class="wcfg__snippet-head">
        <span class="wcfg__section-title">Snippet</span>
        <span class="wcfg__snippet-meta">Paste before <code>&lt;/body&gt;</code></span>
      </div>
      <pre class="wcfg__code" aria-label="Embed snippet"><code>{{ snippet }}</code></pre>
    </section>

    <footer class="wcfg__foot">
      <span class="wcfg__foot-item">
        Origin checked against <code>allowlist</code> at load time
      </span>
      <span class="wcfg__foot-item">
        All assets served over HTTPS from <code>widget.vuesip.dev</code>
      </span>
      <span class="wcfg__foot-item">
        WebRTC media via <code>{{ config.uri.split('@')[1] || 'pbx.example' }}</code>
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type ThemeId = 'warm' | 'mono' | 'neon'
type Corner = 'inline' | 'bottom-right' | 'bottom-left'
type Density = 'compact' | 'regular' | 'comfy'

interface Theme {
  id: ThemeId
  label: string
  swatch: string
}

const themes: Theme[] = [
  { id: 'warm', label: 'Warm', swatch: '#c2410c' },
  { id: 'mono', label: 'Mono', swatch: '#111111' },
  { id: 'neon', label: 'Neon', swatch: '#0ea5e9' },
]
const densities: Density[] = ['compact', 'regular', 'comfy']

const config = reactive({
  label: 'Call Alex · sales',
  uri: 'sip:alex@example.com',
  callerName: 'Anonymous web visitor',
  theme: 'warm' as ThemeId,
  corner: 'bottom-right' as Corner,
  density: 'regular' as Density,
  allowlist: 'acme-industrial.example\ndocs.acme-industrial.example',
  requireTls: true,
  rateLimit: true,
})

const snippet = computed(
  () =>
    `<script src="https://widget.vuesip.dev/v1/widget.js" async><\/script>
<script>
  window.VueSIPWidget = {
    uri:        ${JSON.stringify(config.uri)},
    label:      ${JSON.stringify(config.label)},
    callerName: ${JSON.stringify(config.callerName)},
    theme:      ${JSON.stringify(config.theme)},
    corner:     ${JSON.stringify(config.corner)},
    density:    ${JSON.stringify(config.density)},
    requireTls: ${String(config.requireTls)},
    rateLimit:  ${config.rateLimit ? "'3/hour'" : 'false'},
    allowlist:  ${JSON.stringify(
      config.allowlist
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    )},
  };
<\/script>`
)

const copied = ref(false)
const copy = () => {
  const text = snippet.value
  try {
    navigator.clipboard?.writeText(text)
  } catch {
    // ignored — fallback is copy-by-hand from the pre block
  }
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1600)
}
</script>

<style scoped>
.wcfg {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --ok: #4a8f4a;

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.wcfg__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.wcfg__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.wcfg__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.wcfg__copy {
  background: var(--ink);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.5rem 0.85rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.12s;
}
.wcfg__copy:hover {
  background: var(--accent);
}
.wcfg__copy--ok {
  background: var(--ok);
}

.wcfg__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.6rem;
}
.wcfg__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.wcfg__section-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.wcfg__field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.wcfg__field > span {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.wcfg__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--ink);
}
.wcfg__input:focus {
  outline: none;
  border-color: var(--accent);
}
.wcfg__input--area {
  min-height: 3.5rem;
  line-height: 1.4;
  resize: vertical;
}

.wcfg__themes {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.wcfg__theme {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.wcfg__theme:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.wcfg__theme--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.wcfg__theme-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
}

.wcfg__pills {
  display: inline-flex;
  gap: 0.2rem;
}
.wcfg__pill {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.65rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.wcfg__pill:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.wcfg__pill--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.wcfg__check {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.86rem;
  cursor: pointer;
}
.wcfg__check input {
  accent-color: var(--accent);
  margin-top: 0.25rem;
}
.wcfg__hint {
  display: block;
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  margin-top: 0.1rem;
}

.wcfg__snippet {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.wcfg__snippet-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}
.wcfg__snippet-meta {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.wcfg__snippet-meta code {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.25rem;
  color: var(--accent);
}
.wcfg__code {
  margin: 0;
  padding: 0.75rem 0.9rem;
  background: #1a1410;
  color: #f0e8d8;
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.76rem;
  line-height: 1.55;
  overflow-x: auto;
}

.wcfg__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.55rem 0.7rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.wcfg__foot-item {
  display: inline-flex;
  align-items: center;
}
.wcfg__foot-item code {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  margin: 0 0.25rem;
  color: var(--accent);
}
</style>
