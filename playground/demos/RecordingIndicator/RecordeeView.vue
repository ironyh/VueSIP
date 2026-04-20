<template>
  <div class="rec2">
    <header class="rec2__head">
      <div>
        <span class="rec2__eyebrow">Recordee view — agent side</span>
        <h3 class="rec2__title">Persistent badge + annotations</h3>
      </div>
      <button
        type="button"
        class="rec2__toggle"
        :class="{ 'rec2__toggle--on': recording }"
        :aria-pressed="recording"
        @click="toggleRecording"
      >
        <span class="rec2__toggle-dot" aria-hidden="true"></span>
        {{ recording ? 'Recording' : 'Stopped' }}
      </button>
    </header>

    <div class="rec2__badge" :class="{ 'rec2__badge--off': !recording }">
      <div class="rec2__badge-main">
        <span
          class="rec2__badge-indicator"
          :class="{ 'rec2__badge-indicator--on': recording }"
          aria-hidden="true"
        ></span>
        <div class="rec2__badge-body">
          <span class="rec2__badge-label">{{
            recording ? 'Recording this call' : 'Not recording'
          }}</span>
          <code class="rec2__badge-id">rec-{{ callId }}</code>
        </div>
      </div>
      <div class="rec2__badge-right">
        <span class="rec2__badge-duration">{{ formatDuration(duration) }}</span>
        <button type="button" class="rec2__mute" :aria-pressed="muted" @click="muted = !muted">
          {{ muted ? 'Paused' : 'Pause' }}
        </button>
      </div>
    </div>

    <section class="rec2__annotate">
      <span class="rec2__annotate-title">Add annotation</span>
      <form class="rec2__annotate-form" @submit.prevent="submitAnnotation">
        <div class="rec2__tags" role="radiogroup" aria-label="Annotation type">
          <button
            v-for="t in tagOptions"
            :key="t.id"
            type="button"
            class="rec2__tag"
            :class="[`rec2__tag--${t.id}`, { 'rec2__tag--on': draftTag === t.id }]"
            role="radio"
            :aria-checked="draftTag === t.id"
            @click="draftTag = t.id"
          >
            {{ t.label }}
          </button>
        </div>
        <div class="rec2__input-row">
          <input
            v-model="draftText"
            type="text"
            class="rec2__input"
            placeholder="What happened at this moment? (caller shared card, escalation, etc.)"
            maxlength="140"
            aria-label="Annotation text"
          />
          <button type="submit" class="rec2__add" :disabled="!draftText.trim()">Bookmark</button>
        </div>
      </form>
    </section>

    <section class="rec2__log">
      <span class="rec2__log-title">
        Annotations
        <span class="rec2__log-count">{{ annotations.length }}</span>
      </span>
      <ul v-if="annotations.length" class="rec2__log-list" role="list">
        <li
          v-for="a in annotations"
          :key="a.id"
          class="rec2__log-row"
          :class="`rec2__log-row--${a.tag}`"
        >
          <code class="rec2__log-ts">{{ formatDuration(a.at) }}</code>
          <span class="rec2__log-tag">{{ tagLabel(a.tag) }}</span>
          <span class="rec2__log-text">{{ a.text }}</span>
          <button
            type="button"
            class="rec2__log-del"
            @click="removeAnnotation(a.id)"
            :aria-label="`Delete annotation at ${formatDuration(a.at)}`"
          >
            ×
          </button>
        </li>
      </ul>
      <p v-else class="rec2__empty">
        No annotations. Bookmarks are worth their weight in gold at review time — mark important
        moments now.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type Tag = 'consent' | 'pii' | 'escalation' | 'note'

const tagOptions: { id: Tag; label: string }[] = [
  { id: 'consent', label: 'Consent' },
  { id: 'pii', label: 'PII / redact' },
  { id: 'escalation', label: 'Escalation' },
  { id: 'note', label: 'Note' },
]

const callId = 'a8f3c1e9-4b2d'
const recording = ref(true)
const muted = ref(false)
const duration = ref(132)

const draftTag = ref<Tag>('note')
const draftText = ref('')

interface Annotation {
  id: number
  at: number
  tag: Tag
  text: string
}
const annotations = ref<Annotation[]>([
  { id: 1, at: 4, tag: 'consent', text: 'Caller acknowledged recording: "yes, that\'s fine"' },
  { id: 2, at: 58, tag: 'pii', text: 'Customer reading credit-card number — PAUSE until 01:18' },
  { id: 3, at: 121, tag: 'escalation', text: 'Transfer to tier-2 (billing discrepancy > $500)' },
])

const submitAnnotation = () => {
  const text = draftText.value.trim()
  if (!text) return
  annotations.value.unshift({
    id: Date.now(),
    at: duration.value,
    tag: draftTag.value,
    text,
  })
  draftText.value = ''
}
const removeAnnotation = (id: number) => {
  annotations.value = annotations.value.filter((a) => a.id !== id)
}
const tagLabel = (t: Tag) => tagOptions.find((x) => x.id === t)?.label ?? t

const toggleRecording = () => {
  recording.value = !recording.value
  if (muted.value) muted.value = false
}

const formatDuration = (sec: number): string => {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

let tick: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  tick = setInterval(() => {
    if (recording.value && !muted.value) duration.value += 1
  }, 1000)
})
onBeforeUnmount(() => {
  if (tick) clearInterval(tick)
})
</script>

<style scoped>
.rec2 {
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

.rec2__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--rule);
}
.rec2__eyebrow {
  font-family: var(--mono);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.rec2__title {
  margin: 0.1rem 0 0;
  font-size: 1rem;
  font-weight: 600;
}

.rec2__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.4rem 0.7rem;
  font-family: var(--mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.rec2__toggle:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.rec2__toggle--on {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.rec2__toggle-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--muted);
}
.rec2__toggle--on .rec2__toggle-dot {
  background: var(--accent);
}

.rec2__badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--accent);
  border-left-width: 3px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--accent) 6%, var(--paper));
}
.rec2__badge--off {
  border-color: var(--rule);
  background: var(--paper-deep);
  opacity: 0.75;
}
.rec2__badge-main {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}
.rec2__badge-indicator {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: var(--muted);
  flex-shrink: 0;
}
.rec2__badge-indicator--on {
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent);
  animation: rec2-pulse 1.4s ease-in-out infinite;
}
@keyframes rec2-pulse {
  50% {
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent) 10%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rec2__badge-indicator--on {
    animation: none;
  }
}
.rec2__badge-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.rec2__badge-label {
  font-size: 0.88rem;
  font-weight: 600;
}
.rec2__badge-id {
  font-family: var(--mono);
  font-size: 0.66rem;
  color: var(--muted);
}
.rec2__badge-right {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}
.rec2__badge-duration {
  font-family: var(--mono);
  font-size: 1rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.rec2__mute {
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.3rem 0.55rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.12s;
}
.rec2__mute:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.rec2__mute[aria-pressed='true'] {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--paper);
}

.rec2__annotate {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.7rem 0.8rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
}
.rec2__annotate-title {
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.rec2__annotate-form {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.rec2__tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.rec2__tag {
  background: var(--paper-deep);
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
.rec2__tag:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.rec2__tag--on {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.rec2__input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
}
.rec2__input {
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.45rem 0.6rem;
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--ink);
}
.rec2__input:focus {
  outline: none;
  border-color: var(--accent);
}
.rec2__add {
  background: var(--accent);
  color: var(--paper);
  border: 0;
  border-radius: 2px;
  padding: 0.45rem 0.8rem;
  font-family: var(--mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.rec2__add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.rec2__add:hover:not(:disabled) {
  background: var(--ink);
}

.rec2__log {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.rec2__log-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.rec2__log-count {
  font-size: 0.58rem;
  padding: 0.1rem 0.35rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 999px;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.rec2__log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.rec2__log-row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.4rem 0.6rem;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-left-width: 3px;
  border-radius: 2px;
}
.rec2__log-row--consent {
  border-left-color: #047857;
}
.rec2__log-row--pii {
  border-left-color: #b91c1c;
}
.rec2__log-row--escalation {
  border-left-color: var(--accent);
}
.rec2__log-row--note {
  border-left-color: var(--muted);
}
.rec2__log-ts {
  font-family: var(--mono);
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.rec2__log-tag {
  font-family: var(--mono);
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.rec2__log-text {
  font-size: 0.82rem;
  line-height: 1.45;
}
.rec2__log-del {
  background: transparent;
  border: 0;
  padding: 0 0.3rem;
  color: var(--muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
.rec2__log-del:hover {
  color: #b91c1c;
}

.rec2__empty {
  margin: 0;
  padding: 0.9rem;
  text-align: center;
  font-size: 0.78rem;
  color: var(--muted);
  background: var(--paper-deep);
  border: 1px dashed var(--rule);
  border-radius: 2px;
  font-style: italic;
}
</style>
