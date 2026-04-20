<template>
  <div class="vm">
    <header class="vm__head">
      <div>
        <span class="vm__eyebrow">Voicemail inbox</span>
        <h3 class="vm__title">
          <span class="vm__count">{{ newCount }}</span> new
          <span class="vm__sep" aria-hidden="true">·</span>
          {{ savedCount }} saved
          <span v-if="urgentCount" class="vm__urgent">{{ urgentCount }} urgent</span>
        </h3>
      </div>
      <div class="vm__actions">
        <button
          type="button"
          class="vm__filter-btn"
          :class="{ 'vm__filter-btn--on': filter === 'unread' }"
          :aria-pressed="filter === 'unread'"
          @click="filter = filter === 'unread' ? 'all' : 'unread'"
        >
          Unread only
        </button>
        <button type="button" class="vm__refresh" @click="refresh" aria-label="Refresh">↻</button>
      </div>
    </header>

    <ul v-if="filtered.length" class="vm__list" role="list">
      <li
        v-for="m in filtered"
        :key="m.id"
        class="vm__row"
        :class="{
          'vm__row--new': m.unread,
          'vm__row--playing': playing === m.id,
          'vm__row--urgent': m.urgent,
        }"
      >
        <div class="vm__lamp" :class="{ 'vm__lamp--on': m.unread }" aria-hidden="true"></div>
        <button
          type="button"
          class="vm__play"
          :aria-label="playing === m.id ? 'Pause' : `Play voicemail from ${m.fromName}`"
          @click="togglePlay(m)"
        >
          {{ playing === m.id ? '‖' : '▶' }}
        </button>
        <div class="vm__body">
          <div class="vm__head-row">
            <span class="vm__from-name">{{ m.fromName }}</span>
            <code class="vm__from-uri">{{ m.from }}</code>
            <span v-if="m.urgent" class="vm__pill vm__pill--urgent">Urgent</span>
          </div>
          <p class="vm__preview" :class="{ 'vm__preview--dim': !m.transcription }">
            <span v-if="m.transcription">"{{ m.transcription }}"</span>
            <span v-else
              >No transcription — PBX transcription service offline or disabled for this
              mailbox.</span
            >
          </p>
          <div class="vm__meta">
            <span class="vm__when">{{ formatWhen(m.at) }}</span>
            <span class="vm__sep" aria-hidden="true">·</span>
            <span class="vm__dur">{{ formatDuration(m.duration) }}</span>
            <span v-if="m.transcription" class="vm__sep" aria-hidden="true">·</span>
            <span v-if="m.transcription" class="vm__confidence"
              >Confidence {{ m.confidence }}%</span
            >
          </div>
        </div>
        <div class="vm__tools">
          <button
            type="button"
            class="vm__tool"
            :class="{ 'vm__tool--on': !m.unread }"
            :aria-pressed="!m.unread"
            @click="m.unread = !m.unread"
            :aria-label="m.unread ? `Mark as read` : `Mark as unread`"
          >
            {{ m.unread ? 'Mark read' : 'Mark new' }}
          </button>
          <button
            type="button"
            class="vm__tool"
            @click="callBack(m)"
            :aria-label="`Call back ${m.fromName}`"
          >
            Call back
          </button>
          <button
            type="button"
            class="vm__tool vm__tool--danger"
            @click="remove(m.id)"
            :aria-label="`Delete voicemail from ${m.fromName}`"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="vm__empty">
      {{ filter === 'unread' ? 'No unread messages. Inbox zero.' : 'No messages. Quiet day.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Message {
  id: number
  fromName: string
  from: string
  at: number
  duration: number
  unread: boolean
  urgent: boolean
  transcription?: string
  confidence?: number
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

const messages = ref<Message[]>([
  {
    id: 1,
    fromName: 'Priya Shah',
    from: 'sip:priya.shah@example.com',
    at: Date.now() - 20 * 60_000,
    duration: 87,
    unread: true,
    urgent: true,
    transcription:
      "Hi, it's Priya. I need to reschedule tomorrow's review — something came up with the Tokyo integration. Can you call me back before five? Thanks.",
    confidence: 94,
  },
  {
    id: 2,
    fromName: '+14155550100',
    from: '+14155550100',
    at: Date.now() - 2 * HOUR,
    duration: 31,
    unread: true,
    urgent: false,
    transcription:
      'Hello, this is Jordan from the sales team. Just checking in on the quote we sent last week.',
    confidence: 88,
  },
  {
    id: 3,
    fromName: 'Alex Okafor',
    from: 'sip:alex@example.com',
    at: Date.now() - 6 * HOUR,
    duration: 154,
    unread: false,
    urgent: false,
    transcription:
      "Got your note about the recording pipeline. The SIPREC config needs a second pass — I'll send a diff later today.",
    confidence: 91,
  },
  {
    id: 4,
    fromName: 'Anonymous',
    from: 'sip:anonymous@unknown.invalid',
    at: Date.now() - 1 * DAY,
    duration: 8,
    unread: false,
    urgent: false,
  },
  {
    id: 5,
    fromName: '+442079460000',
    from: '+442079460000',
    at: Date.now() - 3 * DAY,
    duration: 62,
    unread: false,
    urgent: false,
    transcription:
      'This is the compliance officer from the partner firm. Please call us regarding the quarterly review.',
    confidence: 83,
  },
])

const filter = ref<'all' | 'unread'>('all')
const filtered = computed(() =>
  filter.value === 'unread' ? messages.value.filter((m) => m.unread) : messages.value
)
const newCount = computed(() => messages.value.filter((m) => m.unread).length)
const savedCount = computed(() => messages.value.filter((m) => !m.unread).length)
const urgentCount = computed(() => messages.value.filter((m) => m.urgent && m.unread).length)

const playing = ref<number | null>(null)
const togglePlay = (m: Message) => {
  if (playing.value === m.id) {
    playing.value = null
  } else {
    playing.value = m.id
    if (m.unread) m.unread = false
  }
}
const callBack = (m: Message) => {
  console.log('call back', m.from)
}
const remove = (id: number) => {
  messages.value = messages.value.filter((m) => m.id !== id)
  if (playing.value === id) playing.value = null
}
const refresh = () => {
  console.log('refresh inbox')
}

const formatWhen = (t: number): string => {
  const d = Date.now() - t
  if (d < HOUR) return `${Math.max(1, Math.floor(d / 60_000))} min ago`
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} d ago`
  return new Date(t).toISOString().slice(0, 10)
}
const formatDuration = (sec: number): string => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>

<style scoped>
.vm {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --urgent: #b91c1c;
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);

  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  color: var(--ink);
  font-family: var(--sans);
}

.vm__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.vm__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.vm__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  display: inline-flex;
  gap: 0.4rem;
  align-items: baseline;
  flex-wrap: wrap;
  font-variant-numeric: tabular-nums;
}
.vm__count {
  color: var(--accent);
  font-weight: 700;
  font-size: 1.15rem;
}
.vm__sep {
  opacity: 0.5;
  color: var(--muted);
}
.vm__urgent {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  color: var(--urgent);
  border: 1px solid var(--urgent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--urgent) 8%, transparent);
}

.vm__actions {
  display: inline-flex;
  gap: 0.3rem;
}
.vm__filter-btn {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.6rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.vm__filter-btn:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.vm__filter-btn--on {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.vm__refresh {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.35rem 0.55rem;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
}
.vm__refresh:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.vm__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.vm__row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 0.6rem;
  padding: 0.65rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  align-items: start;
}
.vm__row--new {
  border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 4%, var(--paper));
}
.vm__row--urgent.vm__row--new {
  border-left-color: var(--urgent);
  background: color-mix(in srgb, var(--urgent) 5%, var(--paper));
}
.vm__row--playing {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.vm__lamp {
  margin-top: 0.5rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--rule);
}
.vm__lamp--on {
  background: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
}
.vm__row--urgent .vm__lamp--on {
  background: var(--urgent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--urgent) 20%, transparent);
}

.vm__play {
  width: 2.1rem;
  height: 2.1rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  color: var(--ink);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-size: 0.9rem;
}
.vm__play:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.vm__body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}
.vm__head-row {
  display: inline-flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.vm__from-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.vm__from-uri {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 14rem;
}
.vm__pill {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.1rem 0.35rem;
  border-radius: 2px;
}
.vm__pill--urgent {
  color: var(--urgent);
  border: 1px solid var(--urgent);
  background: color-mix(in srgb, var(--urgent) 10%, transparent);
}

.vm__preview {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--ink);
  font-style: italic;
}
.vm__preview--dim {
  color: var(--muted);
  font-style: italic;
  opacity: 0.7;
}

.vm__meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}
.vm__dur,
.vm__confidence {
  font-variant-numeric: tabular-nums;
}

.vm__tools {
  display: inline-flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.vm__tool {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.vm__tool:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.vm__tool--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.vm__tool--danger {
  font-size: 0.95rem;
  padding: 0.15rem 0.5rem;
}
.vm__tool--danger:hover {
  color: var(--urgent);
  border-color: var(--urgent);
}

.vm__empty {
  margin: 0;
  padding: 1.5rem;
  text-align: center;
  background: var(--paper-deep);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-family: var(--mono);
  font-size: 0.76rem;
  color: var(--muted);
}
</style>
