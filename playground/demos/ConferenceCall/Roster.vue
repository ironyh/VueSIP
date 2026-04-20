<template>
  <div class="conf">
    <header class="conf__head">
      <div class="conf__titles">
        <span class="conf__eyebrow">In conference</span>
        <h3 class="conf__title">{{ participants.length }} on the bridge · {{ liveCount }} live</h3>
      </div>
      <div class="conf__timer">
        <span class="conf__timer-dot"></span>
        <span class="conf__timer-value">{{ elapsed }}</span>
      </div>
    </header>

    <section class="conf__add">
      <form class="conf__add-form" @submit.prevent="invite">
        <input
          type="text"
          v-model="draft"
          class="conf__add-input"
          placeholder="sip:alice@example.com or +1 415 555 0100"
          aria-label="Invite URI or number"
        />
        <button type="submit" class="conf__add-btn" :disabled="!draft.trim()">+ Invite</button>
      </form>
      <span class="conf__add-hint">
        Dials out via <code>REFER</code> and auto-joins the bridge on answer.
      </span>
    </section>

    <ul class="conf__list" role="list">
      <li
        v-for="p in participants"
        :key="p.id"
        class="conf__row"
        :class="[
          `conf__row--${p.state}`,
          { 'conf__row--speaking': p.speaking, 'conf__row--self': p.self },
        ]"
      >
        <span class="conf__avatar" :style="{ background: p.color }">
          {{ initials(p.name) }}
          <span v-if="p.speaking" class="conf__avatar-ring" aria-hidden="true"></span>
        </span>
        <div class="conf__body">
          <div class="conf__row-head">
            <span class="conf__name">
              {{ p.name }}
              <span v-if="p.self" class="conf__you">you</span>
              <span v-if="p.moderator" class="conf__badge" title="Moderator">★</span>
            </span>
            <span class="conf__state">{{ stateLabel(p.state) }}</span>
          </div>
          <div class="conf__row-sub">
            <code class="conf__uri">{{ p.uri }}</code>
            <span class="conf__sep" aria-hidden="true">·</span>
            <span class="conf__dur">{{ formatDuration(p.joinedAt) }}</span>
            <template v-if="p.muted">
              <span class="conf__sep" aria-hidden="true">·</span>
              <span class="conf__tag">muted</span>
            </template>
            <template v-if="p.onHold">
              <span class="conf__sep" aria-hidden="true">·</span>
              <span class="conf__tag">on hold</span>
            </template>
          </div>
        </div>
        <div class="conf__tools" v-if="!p.self">
          <button
            type="button"
            class="conf__tool"
            :class="{ 'conf__tool--active': p.muted }"
            :aria-pressed="p.muted"
            :title="p.muted ? 'Unmute' : 'Mute'"
            @click="toggleMute(p.id)"
          >
            {{ p.muted ? 'Unmute' : 'Mute' }}
          </button>
          <button
            type="button"
            class="conf__tool"
            :class="{ 'conf__tool--active': p.onHold }"
            :aria-pressed="p.onHold"
            :title="p.onHold ? 'Resume' : 'Hold'"
            @click="toggleHold(p.id)"
          >
            {{ p.onHold ? 'Resume' : 'Hold' }}
          </button>
          <button
            type="button"
            class="conf__tool conf__tool--danger"
            title="Remove"
            :aria-label="`Remove ${p.name}`"
            @click="remove(p.id)"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type State = 'live' | 'ringing' | 'held'

interface Participant {
  id: number
  name: string
  uri: string
  color: string
  state: State
  self?: boolean
  moderator?: boolean
  muted: boolean
  onHold: boolean
  speaking: boolean
  joinedAt: number
}

const COLORS = ['#1a1410', '#6b5d4a', '#c2410c', '#a41d08', '#355c4d', '#2d3e50']

const participants = ref<Participant[]>([
  {
    id: 0,
    name: 'You',
    uri: 'sip:you@example.com',
    color: COLORS[2],
    state: 'live',
    self: true,
    moderator: true,
    muted: false,
    onHold: false,
    speaking: false,
    joinedAt: Date.now() - 240_000,
  },
  {
    id: 1,
    name: 'Priya Shah',
    uri: 'sip:priya@example.com',
    color: COLORS[0],
    state: 'live',
    muted: false,
    onHold: false,
    speaking: true,
    joinedAt: Date.now() - 220_000,
  },
  {
    id: 2,
    name: 'Alex Rivera',
    uri: 'sip:alex@example.com',
    color: COLORS[1],
    state: 'live',
    muted: true,
    onHold: false,
    speaking: false,
    joinedAt: Date.now() - 190_000,
  },
  {
    id: 3,
    name: 'Mei Chen',
    uri: 'sip:mei@example.com',
    color: COLORS[4],
    state: 'live',
    muted: false,
    onHold: false,
    speaking: false,
    joinedAt: Date.now() - 120_000,
  },
  {
    id: 4,
    name: 'Jordan Lee',
    uri: 'sip:jordan@example.com',
    color: COLORS[5],
    state: 'held',
    muted: false,
    onHold: true,
    speaking: false,
    joinedAt: Date.now() - 80_000,
  },
  {
    id: 5,
    name: '+14155550100',
    uri: 'sip:+14155550100@example.com',
    color: COLORS[3],
    state: 'ringing',
    muted: false,
    onHold: false,
    speaking: false,
    joinedAt: Date.now() - 12_000,
  },
])

const liveCount = computed(() => participants.value.filter((p) => p.state === 'live').length)

const draft = ref('')
const invite = () => {
  const v = draft.value.trim()
  if (!v) return
  const uri = v.startsWith('sip:') ? v : `sip:${v}@example.com`
  const name = v.startsWith('sip:') ? v.split(':')[1].split('@')[0] : v
  participants.value.push({
    id: Math.max(0, ...participants.value.map((p) => p.id)) + 1,
    name,
    uri,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    state: 'ringing',
    muted: false,
    onHold: false,
    speaking: false,
    joinedAt: Date.now(),
  })
  draft.value = ''
}

const toggleMute = (id: number) => {
  const p = participants.value.find((x) => x.id === id)
  if (p) {
    p.muted = !p.muted
    if (p.muted) p.speaking = false
  }
}
const toggleHold = (id: number) => {
  const p = participants.value.find((x) => x.id === id)
  if (!p) return
  p.onHold = !p.onHold
  p.state = p.onHold ? 'held' : 'live'
  if (p.onHold) p.speaking = false
}
const remove = (id: number) => {
  participants.value = participants.value.filter((p) => p.id !== id)
}

const nowTick = ref(Date.now())
const baseJoin = ref(Date.now() - 240_000)
const tick = window.setInterval(() => {
  nowTick.value = Date.now()
  const live = participants.value.filter((p) => p.state === 'live' && !p.muted)
  if (live.length) {
    participants.value.forEach((p) => (p.speaking = false))
    const pick = live[Math.floor(Math.random() * live.length)]
    pick.speaking = true
  }
  const ringing = participants.value.find((p) => p.state === 'ringing')
  if (ringing && nowTick.value - ringing.joinedAt > 15_000) {
    ringing.state = 'live'
  }
}, 1500)
onBeforeUnmount(() => clearInterval(tick))

const elapsed = computed(() => {
  const s = Math.floor((nowTick.value - baseJoin.value) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})

const formatDuration = (t: number) => {
  const s = Math.floor((nowTick.value - t) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

const stateLabel = (s: State): string => {
  switch (s) {
    case 'live':
      return 'Live'
    case 'ringing':
      return 'Ringing'
    case 'held':
      return 'On hold'
  }
}

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
</script>

<style scoped>
.conf {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --danger: #a41d08;
  --ok: #48bb78;
  --warn: #eab308;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.conf__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
}
.conf__titles {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.conf__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.conf__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.conf__timer {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.65rem;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}
.conf__timer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--danger);
  animation: conf-pulse 1.6s ease-in-out infinite;
}
@keyframes conf-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.conf__add {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.7rem 0.85rem;
}
.conf__add-form {
  display: flex;
  gap: 0.4rem;
}
.conf__add-input {
  flex: 1;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--ink);
}
.conf__add-input:focus {
  outline: none;
  border-color: var(--accent);
}
.conf__add-btn {
  background: var(--accent);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.5rem 1rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.conf__add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.conf__add-hint {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.conf__add-hint code {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  color: var(--accent);
}

.conf__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.conf__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  align-items: center;
  padding: 0.65rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  transition:
    border-color 0.12s,
    box-shadow 0.2s;
}
.conf__row--self {
  background: var(--paper-deep);
}
.conf__row--held {
  opacity: 0.6;
}
.conf__row--ringing {
  border-style: dashed;
}
.conf__row--speaking {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.conf__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--paper);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 700;
  position: relative;
}
.conf__avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  animation: conf-ring 1.2s ease-out infinite;
  pointer-events: none;
}
@keyframes conf-ring {
  0% {
    opacity: 0.8;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

.conf__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.conf__row-head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  justify-content: space-between;
}
.conf__name {
  font-weight: 600;
  font-size: 0.92rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.conf__you {
  font-family: var(--mono);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 400;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.08rem 0.35rem;
}
.conf__badge {
  color: var(--accent);
  font-size: 0.78rem;
}
.conf__state {
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.conf__row--live .conf__state {
  color: var(--ok);
}
.conf__row--ringing .conf__state {
  color: var(--warn);
}
.conf__row--held .conf__state {
  color: var(--accent);
}

.conf__row-sub {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.conf__uri {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 22ch;
}
.conf__sep {
  opacity: 0.5;
}
.conf__dur {
  font-variant-numeric: tabular-nums;
}
.conf__tag {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0 0.3rem;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}

.conf__tools {
  display: inline-flex;
  gap: 0.25rem;
}
.conf__tool {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.conf__tool:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.conf__tool--active {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.conf__tool--danger {
  padding: 0.15rem 0.5rem;
  font-size: 1rem;
  line-height: 1;
}
.conf__tool--danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}
</style>
