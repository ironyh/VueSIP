<template>
  <div class="alog">
    <header class="alog__head">
      <div>
        <span class="alog__eyebrow">Station login</span>
        <h3 class="alog__title">{{ readyLabel }}</h3>
      </div>
      <span class="alog__timer" :class="{ 'alog__timer--paused': paused }">
        {{ formatDuration(sessionSeconds) }}
      </span>
    </header>

    <section class="alog__identity">
      <label class="alog__field">
        <span class="alog__label">Agent ID</span>
        <input
          type="text"
          v-model="agentId"
          class="alog__input"
          :disabled="loggedIn"
          placeholder="agent-042"
        />
      </label>
      <label class="alog__field">
        <span class="alog__label">Station URI</span>
        <input
          type="text"
          v-model="stationUri"
          class="alog__input"
          :disabled="loggedIn"
          placeholder="sip:alex@switchboard.example"
        />
      </label>
    </section>

    <section class="alog__queues">
      <span class="alog__section-title">Queues</span>
      <ul class="alog__queue-list" role="list">
        <li
          v-for="q in queues"
          :key="q.name"
          class="alog__queue"
          :class="{ 'alog__queue--on': q.joined }"
        >
          <div class="alog__queue-body">
            <span class="alog__queue-name">{{ q.name }}</span>
            <span class="alog__queue-meta"> penalty {{ q.penalty }} · {{ q.members }} agents </span>
          </div>
          <button
            type="button"
            class="alog__queue-toggle"
            :aria-pressed="q.joined"
            :disabled="!loggedIn"
            @click="q.joined = !q.joined"
          >
            {{ q.joined ? 'Joined' : 'Join' }}
          </button>
        </li>
      </ul>
    </section>

    <section class="alog__state">
      <span class="alog__section-title">State</span>
      <div class="alog__seg" role="radiogroup" aria-label="Agent state">
        <button
          v-for="s in states"
          :key="s.id"
          type="button"
          class="alog__seg-btn"
          :class="{ 'alog__seg-btn--on': current === s.id }"
          role="radio"
          :aria-checked="current === s.id"
          :disabled="!loggedIn"
          @click="current = s.id"
        >
          <span class="alog__seg-label">{{ s.label }}</span>
          <span class="alog__seg-code">{{ s.code }}</span>
        </button>
      </div>
    </section>

    <footer class="alog__footer">
      <button
        v-if="!loggedIn"
        type="button"
        class="alog__primary"
        :disabled="!canLogin"
        @click="login"
      >
        Log in
      </button>
      <button v-else type="button" class="alog__secondary" @click="logout">Log out</button>
      <span class="alog__hint">
        <span class="alog__dot" :class="{ 'alog__dot--on': loggedIn && !paused }"></span>
        {{ statusLine }}
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type StateId = 'ready' | 'paused' | 'wrap'
interface StateOpt {
  id: StateId
  label: string
  code: string
}

const states: StateOpt[] = [
  { id: 'ready', label: 'Ready', code: 'QUEUE · available' },
  { id: 'paused', label: 'Paused', code: 'PAUSE · reason' },
  { id: 'wrap', label: 'Wrap-up', code: 'ACW · after-call' },
]

const agentId = ref('agent-042')
const stationUri = ref('sip:alex@switchboard.example')
const loggedIn = ref(false)
const current = ref<StateId>('ready')

const queues = ref([
  { name: 'support', penalty: 0, members: 12, joined: true },
  { name: 'sales', penalty: 5, members: 8, joined: true },
  { name: 'billing', penalty: 10, members: 4, joined: false },
  { name: 'escalations', penalty: 1, members: 3, joined: false },
])

const sessionSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const canLogin = computed(
  () => agentId.value.trim().length > 0 && stationUri.value.trim().length > 0
)
const paused = computed(() => current.value !== 'ready')

const login = () => {
  if (!canLogin.value) return
  loggedIn.value = true
  sessionSeconds.value = 0
  current.value = 'ready'
  timer = setInterval(() => (sessionSeconds.value += 1), 1000)
}

const logout = () => {
  loggedIn.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const readyLabel = computed(() => {
  if (!loggedIn.value) return 'Logged out'
  const s = states.find((x) => x.id === current.value)!
  return s.label
})

const statusLine = computed(() => {
  if (!loggedIn.value) return 'Not on any queues.'
  const joined = queues.value.filter((q) => q.joined).length
  return `${joined} queue${joined === 1 ? '' : 's'} · ${current.value}`
})

const formatDuration = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}
</script>

<style scoped>
.alog {
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
  gap: 0.9rem;
  color: var(--ink);
  font-family: var(--sans);
}

.alog__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}
.alog__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.alog__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.alog__timer {
  font-family: var(--mono);
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  font-weight: 600;
}
.alog__timer--paused {
  color: var(--muted);
}

.alog__identity {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 0.6rem;
}
@media (max-width: 600px) {
  .alog__identity {
    grid-template-columns: 1fr;
  }
}
.alog__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.alog__label {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.alog__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.alog__input:focus {
  outline: none;
  border-color: var(--accent);
}
.alog__input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.alog__section-title {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.alog__queue-list {
  list-style: none;
  padding: 0;
  margin: 0.35rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.alog__queue {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  transition: border-color 0.12s;
}
.alog__queue--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.alog__queue-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.alog__queue-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.alog__queue-meta {
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.alog__queue-toggle {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.alog__queue-toggle:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--ink);
}
.alog__queue-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.alog__queue--on .alog__queue-toggle {
  color: var(--accent);
  border-color: var(--accent);
}

.alog__seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  margin-top: 0.35rem;
}
@media (max-width: 600px) {
  .alog__seg {
    grid-template-columns: 1fr;
  }
}
.alog__seg-btn {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  align-items: flex-start;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.55rem 0.7rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.12s;
  font-family: var(--sans);
  color: var(--ink);
}
.alog__seg-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.alog__seg-btn--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.alog__seg-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.alog__seg-label {
  font-weight: 600;
  font-size: 0.88rem;
}
.alog__seg-code {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}

.alog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding-top: 0.3rem;
  border-top: 1px solid var(--rule);
  flex-wrap: wrap;
}
.alog__primary,
.alog__secondary {
  border-radius: 2px;
  padding: 0.55rem 1rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  border: 0;
}
.alog__primary {
  background: var(--accent);
  color: var(--paper);
}
.alog__primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.alog__secondary {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--ink);
}
.alog__secondary:hover {
  background: var(--ink);
  color: var(--paper);
}

.alog__hint {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}
.alog__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}
.alog__dot--on {
  background: #48bb78;
}
</style>
