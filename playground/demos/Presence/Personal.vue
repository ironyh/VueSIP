<template>
  <div class="pers">
    <header class="pers__card">
      <span class="pers__avatar" :class="`pers__avatar--${current.id}`">
        {{ initials(name) }}
      </span>
      <div class="pers__card-body">
        <span class="pers__name">{{ name }}</span>
        <span class="pers__uri">{{ uri }}</span>
        <span class="pers__state" :class="`pers__state--${current.id}`">
          <span class="pers__state-dot" aria-hidden="true"></span>
          <span class="pers__state-label">{{ current.label }}</span>
          <span v-if="note" class="pers__state-note">· {{ note }}</span>
        </span>
      </div>
      <span class="pers__since">
        <span class="pers__since-eyebrow">Since</span>
        <span class="pers__since-value">{{ sinceLabel }}</span>
      </span>
    </header>

    <section class="pers__section">
      <span class="pers__eyebrow">Change status</span>
      <ul class="pers__states" role="radiogroup" aria-label="Presence state">
        <li v-for="s in states" :key="s.id">
          <button
            type="button"
            class="pers__state-btn"
            :class="{ 'pers__state-btn--on': current.id === s.id }"
            role="radio"
            :aria-checked="current.id === s.id"
            @click="selectState(s.id)"
          >
            <span
              class="pers__state-btn-dot"
              :class="`pers__state-btn-dot--${s.id}`"
              aria-hidden="true"
            ></span>
            <span class="pers__state-btn-label">{{ s.label }}</span>
            <span class="pers__state-btn-desc">{{ s.desc }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section class="pers__section">
      <label class="pers__field">
        <span class="pers__eyebrow">Status note (optional)</span>
        <input
          type="text"
          v-model="note"
          class="pers__input"
          placeholder="In a meeting until 3 PM"
          maxlength="60"
        />
        <span class="pers__hint"> {{ note.length }} / 60 · Published via PIDF </span>
      </label>
    </section>

    <section class="pers__section">
      <span class="pers__eyebrow">Auto-publish triggers</span>
      <ul class="pers__triggers" role="list">
        <li class="pers__trigger">
          <label class="pers__trigger-label">
            <input type="checkbox" v-model="onCallBusy" />
            <span>Set <em>Busy</em> while on a call</span>
          </label>
          <span class="pers__trigger-hint">Reflects active SIP sessions as busy to watchers.</span>
        </li>
        <li class="pers__trigger">
          <label class="pers__trigger-label">
            <input type="checkbox" v-model="dndPropagates" />
            <span>Mirror Do-Not-Disturb into presence</span>
          </label>
          <span class="pers__trigger-hint">When DND is on, publish <em>Unavailable</em>.</span>
        </li>
        <li class="pers__trigger">
          <label class="pers__trigger-label">
            <input type="checkbox" v-model="idleAway" />
            <span>Go <em>Away</em> after 5 min of inactivity</span>
          </label>
          <span class="pers__trigger-hint">Uses window focus + input events. Opt-in only.</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

type StateId = 'available' | 'busy' | 'away' | 'dnd' | 'offline'
interface PresenceState {
  id: StateId
  label: string
  desc: string
}

const states: PresenceState[] = [
  { id: 'available', label: 'Available', desc: 'Calls ring, messages notify' },
  { id: 'busy', label: 'Busy', desc: 'Visible to watchers, but decline hints' },
  { id: 'away', label: 'Away', desc: 'Not at keyboard — routed to voicemail' },
  { id: 'dnd', label: 'Do Not Disturb', desc: 'Silent — reject with 603' },
  { id: 'offline', label: 'Offline', desc: 'Invisible, no subscriptions' },
]

const name = 'You'
const uri = 'sip:you@example.com'

const current = ref<PresenceState>(states[0])
const note = ref('')
const since = ref(Date.now())

const onCallBusy = ref(true)
const dndPropagates = ref(true)
const idleAway = ref(false)

const selectState = (id: StateId) => {
  if (current.value.id === id) return
  current.value = states.find((s) => s.id === id)!
  since.value = Date.now()
}

const nowTick = ref(Date.now())
const tick = window.setInterval(() => {
  nowTick.value = Date.now()
}, 10_000)
onBeforeUnmount(() => clearInterval(tick))

const sinceLabel = computed(() => {
  const secs = Math.floor((nowTick.value - since.value) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m ago`
})

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
</script>

<style scoped>
.pers {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  --c-available: #48bb78;
  --c-busy: #c2410c;
  --c-away: #eab308;
  --c-dnd: #a41d08;
  --c-offline: #6b5d4a;

  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  color: var(--ink);
  font-family: var(--sans);
}

.pers__card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.95rem 1.1rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.pers__avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 1rem;
  font-weight: 700;
  position: relative;
}
.pers__avatar::after {
  content: '';
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--paper);
  background: var(--c-available);
}
.pers__avatar--busy::after {
  background: var(--c-busy);
}
.pers__avatar--away::after {
  background: var(--c-away);
}
.pers__avatar--dnd::after {
  background: var(--c-dnd);
}
.pers__avatar--offline::after {
  background: var(--c-offline);
}

.pers__card-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}
.pers__name {
  font-size: 1.02rem;
  font-weight: 600;
}
.pers__uri {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--muted);
}
.pers__state {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.2rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  flex-wrap: wrap;
}
.pers__state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-available);
}
.pers__state--busy {
  color: var(--c-busy);
}
.pers__state--busy .pers__state-dot {
  background: var(--c-busy);
}
.pers__state--away {
  color: var(--c-away);
}
.pers__state--away .pers__state-dot {
  background: var(--c-away);
}
.pers__state--dnd {
  color: var(--c-dnd);
}
.pers__state--dnd .pers__state-dot {
  background: var(--c-dnd);
}
.pers__state--offline {
  color: var(--c-offline);
}
.pers__state--offline .pers__state-dot {
  background: var(--c-offline);
}
.pers__state--available {
  color: var(--c-available);
}
.pers__state-note {
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.72rem;
  color: var(--muted);
}
.pers__since {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  min-width: 5rem;
}
.pers__since-eyebrow {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.pers__since-value {
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.pers__section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.pers__eyebrow {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.pers__states {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.4rem;
}
.pers__state-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.65rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  font-family: var(--sans);
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  transition: all 0.12s;
}
.pers__state-btn:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--rule));
}
.pers__state-btn--on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.pers__state-btn-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.pers__state-btn-dot--available {
  background: var(--c-available);
}
.pers__state-btn-dot--busy {
  background: var(--c-busy);
}
.pers__state-btn-dot--away {
  background: var(--c-away);
}
.pers__state-btn-dot--dnd {
  background: var(--c-dnd);
}
.pers__state-btn-dot--offline {
  background: var(--c-offline);
}
.pers__state-btn-label {
  font-weight: 600;
  font-size: 0.88rem;
}
.pers__state-btn-desc {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}

.pers__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.pers__input {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 0.7rem;
  font-family: var(--sans);
  font-size: 0.9rem;
  color: var(--ink);
}
.pers__input:focus {
  outline: none;
  border-color: var(--accent);
}
.pers__hint {
  font-family: var(--mono);
  font-size: 0.62rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}

.pers__triggers {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.pers__trigger {
  padding: 0.6rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.pers__trigger-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  cursor: pointer;
}
.pers__trigger-label input {
  accent-color: var(--accent);
}
.pers__trigger-label em {
  font-style: normal;
  font-weight: 600;
  color: var(--accent);
}
.pers__trigger-hint {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  padding-left: 1.5rem;
}
</style>
