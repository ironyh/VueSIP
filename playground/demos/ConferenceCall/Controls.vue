<template>
  <div class="mod">
    <header class="mod__head">
      <div>
        <span class="mod__eyebrow">Moderator controls</span>
        <h3 class="mod__title">Bridge #4102 · {{ participantCount }} participants</h3>
      </div>
      <button
        type="button"
        class="mod__lock"
        :class="{ 'mod__lock--on': locked }"
        :aria-pressed="locked"
        @click="locked = !locked"
      >
        <span class="mod__lock-icon">{{ locked ? '🔒' : '🔓' }}</span>
        {{ locked ? 'Bridge locked' : 'Bridge open' }}
      </button>
    </header>

    <section class="mod__grid">
      <article class="mod__card">
        <div class="mod__card-head">
          <span class="mod__card-title">Audio policy</span>
          <span class="mod__card-sub">How new joiners arrive</span>
        </div>
        <div class="mod__radio" role="radiogroup" aria-label="Audio policy">
          <button
            v-for="p in audioPolicies"
            :key="p.id"
            type="button"
            class="mod__radio-btn"
            :class="{ 'mod__radio-btn--on': audioPolicy === p.id }"
            role="radio"
            :aria-checked="audioPolicy === p.id"
            @click="audioPolicy = p.id"
          >
            <span class="mod__radio-label">{{ p.label }}</span>
            <span class="mod__radio-desc">{{ p.desc }}</span>
          </button>
        </div>
      </article>

      <article class="mod__card">
        <div class="mod__card-head">
          <span class="mod__card-title">Recording</span>
          <span class="mod__card-sub">{{
            recording ? `Recording · ${recElapsed}` : 'Not recording'
          }}</span>
        </div>
        <div class="mod__rec">
          <button
            type="button"
            class="mod__rec-btn"
            :class="{ 'mod__rec-btn--on': recording }"
            @click="toggleRec"
            :aria-pressed="recording"
          >
            <span class="mod__rec-dot" :class="{ 'mod__rec-dot--on': recording }"></span>
            {{ recording ? 'Stop recording' : 'Start recording' }}
          </button>
          <label class="mod__check">
            <input type="checkbox" v-model="announceRec" />
            <span>Play announcement when recording starts</span>
          </label>
        </div>
      </article>

      <article class="mod__card">
        <div class="mod__card-head">
          <span class="mod__card-title">Waiting room</span>
          <span class="mod__card-sub">{{ waiting.length }} waiting for admission</span>
        </div>
        <ul v-if="waiting.length" class="mod__waiting" role="list">
          <li v-for="w in waiting" :key="w.id" class="mod__wait-row">
            <span class="mod__wait-name">{{ w.name }}</span>
            <span class="mod__wait-uri">{{ w.uri }}</span>
            <div class="mod__wait-tools">
              <button type="button" class="mod__wait-btn mod__wait-btn--admit" @click="admit(w.id)">
                Admit
              </button>
              <button type="button" class="mod__wait-btn" @click="deny(w.id)">Deny</button>
            </div>
          </li>
        </ul>
        <p v-else class="mod__empty">No one waiting.</p>
      </article>

      <article class="mod__card">
        <div class="mod__card-head">
          <span class="mod__card-title">Bulk actions</span>
          <span class="mod__card-sub">Apply to every non-moderator participant</span>
        </div>
        <div class="mod__bulk">
          <button type="button" class="mod__bulk-btn" @click="bulk('mute')">Mute everyone</button>
          <button type="button" class="mod__bulk-btn" @click="bulk('unmute')">
            Unmute everyone
          </button>
          <button type="button" class="mod__bulk-btn" @click="bulk('hold')">Hold everyone</button>
          <button type="button" class="mod__bulk-btn mod__bulk-btn--danger" @click="bulk('kick')">
            End call for all
          </button>
        </div>
        <p class="mod__log" v-if="lastAction">{{ lastAction }}</p>
      </article>
    </section>

    <footer class="mod__footer">
      <span class="mod__footer-label">Bridge mixer</span>
      <div class="mod__mixer">
        <div class="mod__mixer-bars" aria-hidden="true">
          <span
            v-for="(h, i) in levels"
            :key="i"
            class="mod__mixer-bar"
            :style="{ height: `${h}%` }"
          ></span>
        </div>
        <div class="mod__mixer-specs">
          <span><strong>Codec</strong> Opus 48k</span>
          <span><strong>Mode</strong> Mixed (server-side)</span>
          <span><strong>Jitter</strong> 12 ms</span>
          <span><strong>Loss</strong> 0.1%</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type PolicyId = 'unmuted' | 'muted' | 'moderated'
interface Policy {
  id: PolicyId
  label: string
  desc: string
}

const audioPolicies: Policy[] = [
  { id: 'unmuted', label: 'Open mic', desc: 'Joiners arrive unmuted — small meetings' },
  { id: 'muted', label: 'Muted join', desc: 'Joiners arrive muted — medium calls' },
  { id: 'moderated', label: 'Moderated', desc: 'Moderator must unmute — webinars' },
]
const audioPolicy = ref<PolicyId>('muted')

const locked = ref(false)
const recording = ref(true)
const announceRec = ref(true)
const recStart = ref(Date.now() - 180_000)

const waiting = ref([
  { id: 1, name: 'Unknown caller', uri: 'sip:+14085551822@example.com' },
  { id: 2, name: 'Sam Park', uri: 'sip:sam@example.com' },
])

const admit = (id: number) => {
  waiting.value = waiting.value.filter((w) => w.id !== id)
}
const deny = (id: number) => {
  waiting.value = waiting.value.filter((w) => w.id !== id)
}

const participantCount = ref(6)

const lastAction = ref('')
const bulk = (kind: 'mute' | 'unmute' | 'hold' | 'kick') => {
  const labels: Record<typeof kind, string> = {
    mute: 'Muted all non-moderator participants',
    unmute: 'Unmuted all non-moderator participants',
    hold: 'Placed all non-moderator participants on hold',
    kick: 'Ended conference for all participants',
  }
  lastAction.value = labels[kind]
  setTimeout(() => {
    if (lastAction.value === labels[kind]) lastAction.value = ''
  }, 4000)
}

const toggleRec = () => {
  recording.value = !recording.value
  if (recording.value) recStart.value = Date.now()
}

const nowTick = ref(Date.now())
const tick = window.setInterval(() => {
  nowTick.value = Date.now()
}, 1000)
onBeforeUnmount(() => clearInterval(tick))

const recElapsed = computed(() => {
  const s = Math.floor((nowTick.value - recStart.value) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})

const levels = ref<number[]>(Array.from({ length: 18 }, () => 10 + Math.random() * 30))
const mixerTick = window.setInterval(() => {
  levels.value = levels.value.map(() => 8 + Math.random() * (recording.value ? 70 : 25))
}, 180)
onBeforeUnmount(() => clearInterval(mixerTick))
</script>

<style scoped>
.mod {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #a41d08;
  --ok: #48bb78;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.mod__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.mod__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.mod__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}
.mod__lock {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.mod__lock:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.mod__lock--on {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.mod__lock-icon {
  font-size: 0.82rem;
}

.mod__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0.55rem;
}
.mod__card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.mod__card-head {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.mod__card-title {
  font-weight: 600;
  font-size: 0.88rem;
}
.mod__card-sub {
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.mod__radio {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.mod__radio-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  padding: 0.45rem 0.6rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  text-align: left;
  font-family: var(--sans);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.mod__radio-btn:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--rule));
}
.mod__radio-btn--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.mod__radio-label {
  font-weight: 600;
  font-size: 0.82rem;
}
.mod__radio-desc {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
}

.mod__rec {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.mod__rec-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  cursor: pointer;
  align-self: flex-start;
}
.mod__rec-btn:hover {
  border-color: var(--accent);
}
.mod__rec-btn--on {
  border-color: var(--danger);
  color: var(--danger);
}
.mod__rec-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}
.mod__rec-dot--on {
  background: var(--danger);
  animation: mod-pulse 1.4s ease-in-out infinite;
}
@keyframes mod-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
.mod__check {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
}
.mod__check input {
  accent-color: var(--accent);
}

.mod__waiting {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.mod__wait-row {
  background: var(--paper-deep);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.2rem 0.5rem;
  align-items: center;
}
.mod__wait-name {
  font-weight: 600;
  font-size: 0.84rem;
}
.mod__wait-uri {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
  grid-column: 1;
}
.mod__wait-tools {
  grid-row: 1 / span 2;
  grid-column: 2;
  display: inline-flex;
  gap: 0.25rem;
}
.mod__wait-btn {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.5rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
}
.mod__wait-btn:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.mod__wait-btn--admit {
  background: var(--accent);
  color: var(--paper);
  border-color: var(--accent);
}
.mod__wait-btn--admit:hover {
  color: var(--paper);
  border-color: var(--accent);
  opacity: 0.85;
}
.mod__empty {
  margin: 0;
  padding: 0.6rem;
  text-align: center;
  background: var(--paper-deep);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
}

.mod__bulk {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.mod__bulk-btn {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.12s;
}
.mod__bulk-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.mod__bulk-btn--danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}
.mod__log {
  margin: 0.2rem 0 0;
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--accent);
}

.mod__footer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.7rem 0.85rem;
}
.mod__footer-label {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.mod__mixer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  align-items: center;
}
.mod__mixer-bars {
  display: flex;
  gap: 3px;
  height: 42px;
  align-items: flex-end;
  padding: 2px 4px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.mod__mixer-bar {
  flex: 1;
  background: var(--accent);
  border-radius: 1px;
  transition: height 0.18s;
  min-width: 3px;
}
.mod__mixer-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.mod__mixer-specs strong {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  font-size: 0.58rem;
  margin-right: 0.3rem;
}
</style>
