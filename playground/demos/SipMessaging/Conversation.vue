<template>
  <div class="convo">
    <header class="convo__head">
      <span class="convo__avatar" aria-hidden="true">{{ initials(peer.name) }}</span>
      <div class="convo__head-meta">
        <span class="convo__peer">{{ peer.name }}</span>
        <span class="convo__uri">{{ peer.uri }}</span>
      </div>
      <span class="convo__presence" :class="`convo__presence--${peer.status}`">
        <span class="convo__presence-dot" aria-hidden="true" ></span>
        {{ peer.status === 'online' ? 'Online' : peer.status === 'busy' ? 'Busy' : 'Offline' }}
      </span>
    </header>

    <ol class="convo__stream" ref="streamEl" role="log" aria-live="polite">
      <li v-for="(m, i) in messages" :key="m.id" class="convo__item" :class="{ 'convo__item--out': m.from === 'me' }">
        <time
          v-if="showTimestamp(i)"
          class="convo__sep"
          :datetime="new Date(m.at).toISOString()"
        >
          {{ dayLabel(m.at) }}
        </time>

        <div class="convo__bubble">
          <p class="convo__text">{{ m.text }}</p>
          <span class="convo__meta">
            {{ timeLabel(m.at) }}
            <template v-if="m.from === 'me'">
              <span class="convo__sep-dot" aria-hidden="true">·</span>
              <span class="convo__receipt" :class="`convo__receipt--${m.status}`">
                {{ m.status === 'sent' ? 'Sent' : m.status === 'delivered' ? 'Delivered' : m.status === 'read' ? 'Read' : 'Sending…' }}
              </span>
            </template>
          </span>
        </div>
      </li>

      <li v-if="peerTyping" class="convo__item">
        <div class="convo__bubble convo__bubble--typing">
          <span class="convo__typing">
            <span ></span><span ></span><span ></span>
          </span>
        </div>
      </li>
    </ol>

    <form class="convo__composer" @submit.prevent="send">
      <label class="convo__composer-label" for="convo-input">Message</label>
      <textarea
        id="convo-input"
        ref="inputEl"
        v-model="draft"
        class="convo__input"
        placeholder="Write a message…"
        rows="1"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button type="submit" class="convo__send" :disabled="!draft.trim()">
        Send
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

interface Message {
  id: number
  from: 'me' | 'peer'
  text: string
  at: number
  status?: 'sending' | 'sent' | 'delivered' | 'read'
}

const peer = { name: 'Alex Rivera', uri: 'sip:alex@example.com', status: 'online' as const }

const now = Date.now()
const min = 60_000
const hour = 60 * min

const messages = ref<Message[]>([
  { id: 1, from: 'peer', text: 'Hey — are you in for the 3 PM review?', at: now - 3 * hour },
  { id: 2, from: 'me', text: 'Yes, should be on a call then. Dial me at this URI.', at: now - 3 * hour + 2 * min, status: 'read' },
  { id: 3, from: 'peer', text: 'Perfect. Bringing the mock-ups over.', at: now - 3 * hour + 5 * min },
  { id: 4, from: 'me', text: 'Great. I\'ll share my screen from the start.', at: now - 1 * hour, status: 'read' },
  { id: 5, from: 'peer', text: 'Got pulled into something. Running 5 late.', at: now - 8 * min },
])

const draft = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const streamEl = ref<HTMLOListElement | null>(null)

const peerTyping = ref(false)
let typingTimer: ReturnType<typeof setTimeout> | null = null

let nextId = 6

const send = () => {
  const text = draft.value.trim()
  if (!text) return
  messages.value.push({ id: nextId++, from: 'me', text, at: Date.now(), status: 'sending' })
  draft.value = ''
  nextTick(() => scrollToEnd())

  // Simulate SIP MESSAGE delivery lifecycle
  const msgId = nextId - 1
  setTimeout(() => updateStatus(msgId, 'sent'), 250)
  setTimeout(() => updateStatus(msgId, 'delivered'), 850)
  setTimeout(() => updateStatus(msgId, 'read'), 2200)

  // Fake peer reply for demo flavour
  if (Math.random() < 0.7) {
    setTimeout(() => { peerTyping.value = true }, 1600)
    setTimeout(() => {
      peerTyping.value = false
      const replies = [
        'Got it, thanks.',
        'Copy. On my way.',
        'Sounds good — see you in a sec.',
        'Perfect. 👍',
      ]
      messages.value.push({
        id: nextId++,
        from: 'peer',
        text: replies[Math.floor(Math.random() * replies.length)],
        at: Date.now(),
      })
      nextTick(() => scrollToEnd())
    }, 3400)
  }
}

const updateStatus = (id: number, status: Message['status']) => {
  const m = messages.value.find((x) => x.id === id)
  if (m) m.status = status
}

const scrollToEnd = () => {
  if (streamEl.value) streamEl.value.scrollTop = streamEl.value.scrollHeight
}

const showTimestamp = (i: number) => {
  if (i === 0) return true
  const prev = messages.value[i - 1]
  const curr = messages.value[i]
  return curr.at - prev.at > 30 * min
}

const dayLabel = (ts: number) => {
  const diff = Date.now() - ts
  if (diff < hour) return `${Math.max(1, Math.floor(diff / min))}m ago`
  if (diff < 24 * hour) return `${Math.floor(diff / hour)}h ago`
  return new Date(ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}
const timeLabel = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')

onMounted(() => {
  nextTick(() => scrollToEnd())
})
onBeforeUnmount(() => {
  if (typingTimer) clearTimeout(typingTimer)
})
</script>

<style scoped>
.convo {
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
  color: var(--ink);
  font-family: var(--sans);
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  overflow: hidden;
  height: 540px;
  max-height: 70vh;
}

.convo__head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid var(--rule);
  background: var(--paper-deep);
}
.convo__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 0.78rem;
  font-weight: 700;
}
.convo__head-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.convo__peer { font-weight: 600; font-size: 0.92rem; }
.convo__uri {
  font-family: var(--mono);
  font-size: 0.68rem;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.convo__presence {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.convo__presence-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
}
.convo__presence--online .convo__presence-dot { background: #48bb78; }
.convo__presence--online { color: #48bb78; }
.convo__presence--busy .convo__presence-dot { background: var(--accent); }
.convo__presence--busy { color: var(--accent); }

.convo__stream {
  flex: 1;
  list-style: none;
  padding: 0.75rem 0.9rem;
  margin: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: var(--paper);
}
.convo__item { display: flex; flex-direction: column; align-items: flex-start; }
.convo__item--out { align-items: flex-end; }

.convo__sep {
  align-self: center;
  font-family: var(--mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0.5rem 0 0.35rem;
}

.convo__bubble {
  max-width: 78%;
  padding: 0.55rem 0.75rem 0.45rem;
  background: var(--paper-deep);
  border: 1px solid var(--rule);
  border-radius: 8px 8px 8px 2px;
  position: relative;
}
.convo__item--out .convo__bubble {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
  border-radius: 8px 8px 2px 8px;
}
.convo__text {
  margin: 0 0 0.25rem;
  font-size: 0.88rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.convo__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--mono);
  font-size: 0.6rem;
  color: var(--muted);
  letter-spacing: 0.06em;
}
.convo__item--out .convo__meta { color: color-mix(in srgb, var(--paper) 60%, transparent); }
.convo__sep-dot { opacity: 0.5; }
.convo__receipt { text-transform: uppercase; }
.convo__receipt--read { color: var(--accent); }
.convo__item--out .convo__receipt--read { color: color-mix(in srgb, var(--accent) 85%, var(--paper)); }

.convo__bubble--typing { padding: 0.5rem 0.7rem; }
.convo__typing {
  display: inline-flex;
  gap: 3px;
  align-items: flex-end;
  height: 12px;
}
.convo__typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
  animation: convo-dot 1.2s ease-in-out infinite;
}
.convo__typing span:nth-child(2) { animation-delay: 0.15s; }
.convo__typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes convo-dot {
  0%, 100% { transform: translateY(0); opacity: 0.45; }
  50% { transform: translateY(-3px); opacity: 1; }
}

.convo__composer {
  display: flex;
  gap: 0.5rem;
  padding: 0.6rem 0.7rem;
  background: var(--paper-deep);
  border-top: 1px solid var(--rule);
}
.convo__composer-label {
  position: absolute;
  width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
}
.convo__input {
  flex: 1;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 0.5rem 0.65rem;
  font-family: var(--sans);
  font-size: 0.88rem;
  color: var(--ink);
  resize: none;
  line-height: 1.35;
  min-height: 2.2rem;
  max-height: 6rem;
}
.convo__input:focus { outline: none; border-color: var(--accent); }
.convo__send {
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  border-radius: 2px;
  padding: 0 1rem;
  font-family: var(--mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.12s;
}
.convo__send:hover:not(:disabled) { background: var(--accent); border-color: var(--accent); }
.convo__send:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
