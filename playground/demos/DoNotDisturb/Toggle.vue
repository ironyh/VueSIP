<template>
  <div class="dnd">
    <div class="dnd__card" :class="{ 'dnd__card--on': on }">
      <div class="dnd__side" aria-hidden="true">
        <span class="dnd__side-badge">{{ on ? 'DND' : 'RING' }}</span>
        <span class="dnd__side-dot"></span>
      </div>
      <div class="dnd__body">
        <span class="dnd__eyebrow">Do not disturb</span>
        <span class="dnd__title">{{
          on ? 'All calls will be rejected' : 'Calls will ring normally'
        }}</span>
        <span class="dnd__hint">
          {{ on ? `Enabled ${sinceLabel}` : 'Tap the switch to silence the phone' }}
        </span>
      </div>
      <label
        class="dnd__switch"
        :aria-label="on ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'"
      >
        <input type="checkbox" v-model="on" @change="onToggle" />
        <span class="dnd__track" aria-hidden="true">
          <span class="dnd__thumb"></span>
        </span>
      </label>
    </div>

    <div class="dnd__stats">
      <div class="dnd__stat">
        <span class="dnd__stat-label">Rejected</span>
        <span class="dnd__stat-value">{{ rejected }}</span>
      </div>
      <div class="dnd__stat">
        <span class="dnd__stat-label">Session</span>
        <span class="dnd__stat-value">{{ sessionLabel }}</span>
      </div>
      <div class="dnd__stat">
        <span class="dnd__stat-label">Mode</span>
        <span class="dnd__stat-value">{{ busyResponse ? '486 Busy' : '603 Decline' }}</span>
      </div>
    </div>

    <div class="dnd__options">
      <label class="dnd__opt">
        <input type="checkbox" v-model="busyResponse" />
        <span>
          <strong>Send 486 Busy Here</strong>
          <em>Routes to voicemail on most PBXes; 603 hangs up the caller</em>
        </span>
      </label>
      <label class="dnd__opt">
        <input type="checkbox" v-model="logCalls" />
        <span>
          <strong>Log rejected calls</strong>
          <em>Keep a local trail so you can see what you missed</em>
        </span>
      </label>
    </div>

    <section v-if="logCalls && calls.length" class="dnd__log" aria-live="polite">
      <header class="dnd__log-head">
        <span class="dnd__log-eyebrow">Recently rejected</span>
        <button type="button" class="dnd__log-clear" @click="clearLog">Clear</button>
      </header>
      <ul class="dnd__log-list">
        <li v-for="(c, i) in calls.slice(0, 5)" :key="i">
          <span class="dnd__log-uri">{{ c.uri }}</span>
          <span class="dnd__log-time">{{ c.time }}</span>
        </li>
      </ul>
    </section>

    <button type="button" class="dnd__sim" @click="simulateIncoming" :disabled="!on">
      Simulate an incoming call
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const on = ref(false)
const busyResponse = ref(true)
const logCalls = ref(true)

const rejected = ref(0)
const enabledAt = ref<number | null>(null)
const nowTick = ref(Date.now())
const calls = ref<{ uri: string; time: string }[]>([])

let interval: number | null = null

const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const sinceLabel = computed(() => {
  if (!enabledAt.value) return 'just now'
  const secs = Math.floor((nowTick.value - enabledAt.value) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
})
const sessionLabel = computed(() => (enabledAt.value ? sinceLabel.value : '—'))

const onToggle = () => {
  if (on.value) {
    enabledAt.value = Date.now()
    if (!interval)
      interval = window.setInterval(() => {
        nowTick.value = Date.now()
      }, 1000)
  } else {
    enabledAt.value = null
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }
}

const sampleCallers = [
  'sip:sales@example.com',
  'sip:unknown@numbers.net',
  'sip:joe.marketing@corp.io',
  'sip:survey-bot@robo.tel',
  'sip:mum@home.net',
  'sip:1-800-warranty@spam.tel',
]
const simulateIncoming = () => {
  if (!on.value) return
  rejected.value += 1
  if (logCalls.value) {
    calls.value.unshift({
      uri: sampleCallers[Math.floor(Math.random() * sampleCallers.length)],
      time: fmtTime(new Date()),
    })
    calls.value = calls.value.slice(0, 20)
  }
}

const clearLog = () => {
  calls.value = []
}

onBeforeUnmount(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
.dnd {
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

.dnd__card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.1rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-left: 4px solid var(--muted);
  border-radius: 2px;
  transition: border-color 0.15s;
}
.dnd__card--on {
  border-left-color: var(--accent);
}

.dnd__side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}
.dnd__side-badge {
  font-family: var(--mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--muted);
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.dnd__card--on .dnd__side-badge {
  color: var(--paper);
  background: var(--accent);
  border-color: var(--accent);
}
.dnd__side-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--muted);
}
.dnd__card--on .dnd__side-dot {
  background: var(--accent);
  animation: dnd-pulse 1.4s ease-in-out infinite;
}
@keyframes dnd-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent);
  }
  70% {
    box-shadow: 0 0 0 10px transparent;
  }
}

.dnd__body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.dnd__eyebrow {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.dnd__title {
  font-family: var(--sans);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
}
.dnd__hint {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.dnd__switch {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.dnd__switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.dnd__track {
  width: 3.2rem;
  height: 1.7rem;
  padding: 2px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 999px;
  transition:
    background 0.15s,
    border-color 0.15s;
  box-shadow: inset 1px 1px 0 color-mix(in srgb, var(--ink) 10%, transparent);
}
.dnd__thumb {
  display: block;
  width: 1.3rem;
  height: 1.3rem;
  background: var(--ink);
  border-radius: 50%;
  transition: transform 0.18s cubic-bezier(0.3, 0.9, 0.3, 1.3);
}
.dnd__switch input:checked + .dnd__track {
  background: var(--accent);
  border-color: var(--accent);
}
.dnd__switch input:checked + .dnd__track .dnd__thumb {
  transform: translateX(1.5rem);
  background: var(--paper);
}
.dnd__switch input:focus-visible + .dnd__track {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.dnd__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
@media (max-width: 540px) {
  .dnd__stats {
    grid-template-columns: 1fr;
  }
}
.dnd__stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.55rem 0.7rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.dnd__stat-label {
  font-family: var(--mono);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.dnd__stat-value {
  font-family: var(--mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.dnd__options {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.dnd__opt {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.55rem 0.75rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  cursor: pointer;
}
.dnd__opt input {
  margin-top: 0.15rem;
  accent-color: var(--accent);
}
.dnd__opt strong {
  display: block;
  font-size: 0.88rem;
  color: var(--ink);
}
.dnd__opt em {
  display: block;
  margin-top: 0.1rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  font-style: normal;
  color: var(--muted);
}

.dnd__log {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.7rem 0.85rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.dnd__log-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.dnd__log-eyebrow {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.dnd__log-clear {
  margin-left: auto;
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--rule);
  padding: 0.25rem 0.6rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
}
.dnd__log-clear:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.dnd__log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.dnd__log-list li {
  display: flex;
  gap: 0.65rem;
  padding: 0.35rem 0.55rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.75rem;
}
.dnd__log-uri {
  flex: 1;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dnd__log-time {
  color: var(--muted);
  letter-spacing: 0.05em;
}

.dnd__sim {
  align-self: flex-start;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  padding: 0.5rem 1rem;
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  cursor: pointer;
}
.dnd__sim:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
}
.dnd__sim:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
