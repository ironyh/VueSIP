<template>
  <div class="cmh">
    <header class="cmh__head">
      <div>
        <span class="cmh__eyebrow">Push-to-talk vs push-to-mute</span>
        <h3 class="cmh__title">Hold-to-speak, release-to-mute</h3>
      </div>
      <span class="cmh__state" :class="{ 'cmh__state--live': micLive }">
        <span class="cmh__state-dot"></span>
        {{ micLive ? 'MIC OPEN' : 'MUTED' }}
      </span>
    </header>

    <section class="cmh__section">
      <span class="cmh__section-title">Mode</span>
      <div class="cmh__modes" role="radiogroup" aria-label="Hotkey mode">
        <button
          v-for="m in modes"
          :key="m.id"
          type="button"
          class="cmh__mode"
          :class="{ 'cmh__mode--on': mode === m.id }"
          role="radio"
          :aria-checked="mode === m.id"
          @click="setMode(m.id)"
        >
          <span class="cmh__mode-label">{{ m.label }}</span>
          <span class="cmh__mode-desc">{{ m.desc }}</span>
        </button>
      </div>
    </section>

    <section class="cmh__section">
      <span class="cmh__section-title">Binding</span>
      <div class="cmh__binding">
        <div class="cmh__keycap" :class="{ 'cmh__keycap--down': keyDown }">
          <kbd>{{ binding }}</kbd>
        </div>
        <div class="cmh__binding-body">
          <p class="cmh__binding-line">
            <strong>{{ mode === 'ptt' ? 'Hold' : mode === 'ptm' ? 'Hold' : 'Press' }}</strong>
            {{ binding }} to
            <strong>{{ mode === 'ptt' ? 'speak' : mode === 'ptm' ? 'mute' : 'toggle' }}</strong
            >.
          </p>
          <p class="cmh__binding-hint">
            Pressed:
            <code>mute-timeline = {{ activeSince ? 'open ' + activeSince + 'ms' : 'idle' }}</code>
          </p>
          <div class="cmh__rebind">
            <button
              type="button"
              class="cmh__rebind-btn"
              @click="startRebind"
              :disabled="rebinding"
            >
              {{ rebinding ? 'Press any key…' : 'Rebind key' }}
            </button>
            <span v-if="rebinding" class="cmh__rebind-hint">Escape to cancel</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cmh__section">
      <span class="cmh__section-title">Try it</span>
      <div
        ref="stage"
        class="cmh__stage"
        tabindex="0"
        @focus="focused = true"
        @blur="focused = false"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
      >
        <div class="cmh__mic" :class="{ 'cmh__mic--live': micLive, 'cmh__mic--focused': focused }">
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            <rect
              x="15"
              y="8"
              width="10"
              height="18"
              rx="5"
              fill="currentColor"
              opacity="0.2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M10 22c0 6 4 10 10 10s10-4 10-10M20 32v4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              v-if="!micLive"
              x1="8"
              y1="8"
              x2="32"
              y2="32"
              stroke="var(--danger)"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </svg>
          <span class="cmh__mic-label">{{ micLive ? 'OPEN' : 'MUTED' }}</span>
        </div>
        <div class="cmh__level" aria-hidden="true">
          <div class="cmh__level-fill" :style="{ width: levelPct + '%' }"></div>
        </div>
        <p class="cmh__stage-hint">
          <template v-if="focused">
            {{ mode === 'toggle' ? `Press ${binding} to toggle.` : `Hold ${binding}.` }}
          </template>
          <template v-else>Click here, then use the key.</template>
        </p>
      </div>
    </section>

    <section class="cmh__log">
      <span class="cmh__log-title">Events</span>
      <ol>
        <li v-for="e in events" :key="e.id" class="cmh__log-row">
          <span class="cmh__log-t">{{ e.t }}</span>
          <span class="cmh__log-ev">{{ e.msg }}</span>
        </li>
        <li v-if="!events.length" class="cmh__log-empty">No events yet.</li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type Mode = 'ptt' | 'ptm' | 'toggle'

const modes: { id: Mode; label: string; desc: string }[] = [
  { id: 'ptt', label: 'Push-to-talk', desc: 'Start muted. Hold the key to open the mic.' },
  { id: 'ptm', label: 'Push-to-mute', desc: 'Start live. Hold the key to mute briefly.' },
  { id: 'toggle', label: 'Toggle', desc: 'Tap the key to flip the mute state.' },
]

const mode = ref<Mode>('ptt')
const binding = ref('Space')
const micLive = ref(false)
const keyDown = ref(false)
const rebinding = ref(false)
const focused = ref(false)
const activeSince = ref<number | null>(null)
let openAt = 0
let levelTimer: number | undefined
const levelPct = ref(0)

const setMode = (m: Mode) => {
  mode.value = m
  keyDown.value = false
  if (m === 'ptt') micLive.value = false
  else if (m === 'ptm') micLive.value = true
  else micLive.value = false
  push(`mode → ${m}`)
}

const applyFromKey = (down: boolean) => {
  if (mode.value === 'ptt') {
    micLive.value = down
  } else if (mode.value === 'ptm') {
    micLive.value = !down
  }
}

const openLog = () => {
  openAt = performance.now()
  activeSince.value = 0
  if (!levelTimer) {
    levelTimer = window.setInterval(() => {
      activeSince.value = Math.round(performance.now() - openAt)
      levelPct.value = micLive.value ? 30 + Math.random() * 60 : 0
    }, 100)
  }
}
const closeLog = () => {
  activeSince.value = null
  levelPct.value = 0
  if (levelTimer) {
    clearInterval(levelTimer)
    levelTimer = undefined
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  if (rebinding.value) {
    if (e.key === 'Escape') {
      rebinding.value = false
      return
    }
    binding.value = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
    rebinding.value = false
    push(`rebind → ${binding.value}`)
    e.preventDefault()
    return
  }
  const key = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  if (key !== binding.value) return
  e.preventDefault()
  if (keyDown.value) return
  keyDown.value = true
  if (mode.value === 'toggle') {
    micLive.value = !micLive.value
    push(`toggle → ${micLive.value ? 'OPEN' : 'MUTED'}`)
    if (micLive.value) openLog()
    else closeLog()
    return
  }
  applyFromKey(true)
  push(`${binding.value} DOWN · ${micLive.value ? 'OPEN' : 'MUTED'}`)
  openLog()
}

const onKeyUp = (e: KeyboardEvent) => {
  const key = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  if (key !== binding.value) return
  if (!keyDown.value) return
  keyDown.value = false
  if (mode.value === 'toggle') return
  applyFromKey(false)
  push(`${binding.value} UP · ${micLive.value ? 'OPEN' : 'MUTED'}`)
  closeLog()
}

const startRebind = () => {
  rebinding.value = true
}

interface Event {
  id: number
  t: string
  msg: string
}
const events = ref<Event[]>([])
let evId = 0
const push = (msg: string) => {
  const d = new Date()
  events.value.unshift({
    id: ++evId,
    t: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`,
    msg,
  })
  if (events.value.length > 8) events.value.pop()
}

onMounted(() => {
  setMode('ptt')
})
onBeforeUnmount(() => {
  if (levelTimer) clearInterval(levelTimer)
})
</script>

<style scoped>
.cmh {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #a41d08;
  --ok: #047857;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}
.cmh__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.cmh__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.cmh__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.cmh__state {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.cmh__state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.cmh__state--live {
  color: var(--ok);
  border-color: var(--ok);
  background: color-mix(in srgb, var(--ok) 8%, transparent);
}

.cmh__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.cmh__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.cmh__modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.4rem;
}
.cmh__mode {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  color: var(--ink);
  transition: all 0.12s;
}
.cmh__mode:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.cmh__mode--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.cmh__mode-label {
  font-weight: 600;
  font-size: 0.88rem;
}
.cmh__mode-desc {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.cmh__binding {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.75rem 0.9rem;
}
.cmh__keycap {
  min-width: 4.5rem;
  padding: 0.6rem 0.9rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 4px;
  box-shadow: 0 2px 0 var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.08s,
    box-shadow 0.08s;
}
.cmh__keycap--down {
  transform: translateY(2px);
  box-shadow: 0 0 0 var(--rule);
}
.cmh__keycap kbd {
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  background: transparent;
  border: 0;
  letter-spacing: 0.05em;
}
.cmh__binding-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cmh__binding-line {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink);
}
.cmh__binding-line strong {
  color: var(--accent);
}
.cmh__binding-hint {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.cmh__binding-hint code {
  padding: 0 0.25rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--accent);
}
.cmh__rebind {
  display: inline-flex;
  gap: 0.6rem;
  align-items: center;
}
.cmh__rebind-btn {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.cmh__rebind-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--ink);
}
.cmh__rebind-btn:disabled {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}
.cmh__rebind-hint {
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  color: var(--accent);
}

.cmh__stage {
  padding: 1.2rem;
  background: var(--paper);
  border: 2px dashed var(--rule);
  border-radius: 2px;
  cursor: pointer;
  outline: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  transition: border-color 0.12s;
}
.cmh__stage:focus {
  border-color: var(--accent);
}
.cmh__mic {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: var(--muted);
  transition: color 0.12s;
}
.cmh__mic--live {
  color: var(--ok);
}
.cmh__mic-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  letter-spacing: 0.14em;
}
.cmh__level {
  width: 60%;
  max-width: 18rem;
  height: 0.55rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
}
.cmh__level-fill {
  height: 100%;
  background: var(--ok);
  transition: width 0.1s ease;
}
.cmh__stage-hint {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}

.cmh__log {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cmh__log-title {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.cmh__log ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.cmh__log-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.6rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
.cmh__log-t {
  color: var(--muted);
}
.cmh__log-ev {
  color: var(--ink);
}
.cmh__log-empty {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
</style>
