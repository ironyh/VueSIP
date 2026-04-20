<template>
  <div class="directory">
    <div v-if="!isConnected" class="directory__status">
      <span class="directory__status-led" aria-hidden="true" />
      <span class="directory__status-label">Line</span>
      <span class="directory__status-value">Offline</span>
      <span class="directory__status-hint">Configure SIP · or try Diagnostic w/ simulation</span>
    </div>

    <section v-if="state === 'idle'" class="directory__layout">
      <div class="directory__dial">
        <label class="directory__label" for="contacts-dial">Dial target</label>
        <div class="directory__display">
          <span class="directory__caret" aria-hidden="true">›</span>
          <input
            id="contacts-dial"
            v-model="target"
            class="directory__input"
            :placeholder="placeholder"
            :disabled="!isConnected"
            @keyup.enter="dial(target)"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <button
          type="button"
          class="directory__cta"
          :disabled="!isConnected || !target.trim()"
          @click="dial(target)"
        >
          <span>Place call</span>
          <span class="directory__cta-hint">Enter ↵</span>
        </button>
      </div>

      <div class="directory__book">
        <div class="directory__book-head">
          <span class="directory__book-title">Speed dial</span>
          <span class="directory__book-count">{{ contacts.length }}</span>
        </div>
        <ul class="directory__list">
          <li v-for="(c, i) in contacts" :key="c.number">
            <button
              type="button"
              class="directory__contact"
              :disabled="!isConnected"
              @click="dial(c.number)"
            >
              <span class="directory__contact-index" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
              <span
                :class="['directory__avatar', { 'is-icon': !!c.icon }]"
                aria-hidden="true"
              >{{ c.icon || initials(c.name) }}</span>
              <span class="directory__contact-body">
                <span class="directory__contact-name">{{ c.name }}</span>
                <span class="directory__contact-ext">Ext {{ c.number }}</span>
              </span>
              <span class="directory__contact-cta" aria-hidden="true">→</span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <section
      v-else-if="isIncoming"
      class="directory__panel"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="directory__live-head">
        <span class="directory__pulse" aria-hidden="true" />
        <span class="directory__live-label">Incoming</span>
        <span class="directory__live-name">{{ remoteDisplayName || remoteUri }}</span>
      </div>
      <div class="directory__actions">
        <button type="button" class="directory__cta directory__cta--go" @click="answer({ audio: true, video: false })">Answer</button>
        <button type="button" class="directory__cta directory__cta--stop" @click="reject(486)">Reject</button>
      </div>
      <p class="directory__shortcut">Space to answer · Esc to reject</p>
    </section>

    <section v-else class="directory__panel" aria-live="polite" aria-atomic="true">
      <div class="directory__live-head">
        <span class="directory__live-label">{{ stateLabel }}</span>
        <span class="directory__live-name">{{ remoteDisplayName || remoteUri }}</span>
      </div>
      <button
        v-if="canHangup"
        type="button"
        class="directory__cta directory__cta--stop"
        @click="hangup"
      >
        Hang up
      </button>
      <p v-if="canHangup" class="directory__shortcut">Esc to hang up</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { playgroundSipClient } from '../../sipClient'
import { resolveDialTarget, domainOfRegistered } from './resolveDialTarget'
import { useBasicCallSession } from './sharedSession'
import { canHangupFromState, formatBasicCallState, isIncomingCallState } from './uiState'

const { isConnected, registeredUri } = playgroundSipClient
const { state, remoteUri, remoteDisplayName, makeCall, answer, reject, hangup } =
  useBasicCallSession()

const target = ref('')

const placeholder = computed(() => {
  const domain = domainOfRegistered(registeredUri.value)
  return domain ? `2000 or sip:bob@${domain}` : '2000 or sip:bob@example.com'
})

const contacts: Array<{ name: string; number: string; icon?: string }> = [
  { name: 'Arash Molavi', number: '1001', icon: '🧔🏻‍♂️' },
  { name: 'Sales', number: '2001', icon: '💼' },
  { name: 'Support', number: '2002', icon: '🛠️' },
  { name: 'Reception', number: '2000', icon: '🛎️' },
  { name: 'Conference', number: '8000', icon: '👥' },
]

const dial = async (input: string) => {
  const uri = resolveDialTarget(input, registeredUri.value)
  if (!uri) return
  await makeCall(uri, { audio: true, video: false })
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const isIncoming = computed(() => isIncomingCallState(state.value))
const canHangup = computed(() => canHangupFromState(state.value))
const stateLabel = computed(() => formatBasicCallState(state.value))
</script>

<style scoped>
.directory {
  --ink: var(--demo-ink, #1a1410);
  --paper: var(--demo-paper, #faf6ef);
  --paper-deep: var(--demo-paper-deep, #f2eadb);
  --rule: var(--demo-rule, #d9cfbb);
  --accent: var(--demo-accent, #c2410c);
  --muted: var(--demo-muted, #6b5d4a);
  --mono: var(--demo-mono, 'JetBrains Mono', ui-monospace, monospace);
  --sans: var(--demo-sans, 'IBM Plex Sans', system-ui, sans-serif);
  --serif: var(--demo-serif, 'Instrument Serif', Georgia, serif);

  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--ink);
}

.directory__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--rule);
  border-left: 4px solid var(--muted);
  border-radius: 2px;
  background: var(--paper-deep);
  font-family: var(--mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.directory__status-led {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--muted);
}
.directory__status-label { color: var(--muted); }
.directory__status-value { color: var(--ink); font-weight: 700; }
.directory__status-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 0.7rem;
}

.directory__layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 720px) {
  .directory__layout {
    grid-template-columns: minmax(0, 1fr) minmax(260px, 22rem);
  }
}

.directory__dial {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  align-content: start;
}

.directory__label {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}

.directory__display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--ink);
  border-radius: 2px;
  min-height: 2.5rem;
}
.directory__caret {
  color: var(--accent);
  font-family: var(--mono);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  animation: dir-caret 1s steps(2) infinite;
}
@keyframes dir-caret { 50% { opacity: 0; } }

.directory__input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--paper);
  font-family: var(--mono);
  font-size: 1rem;
  letter-spacing: 0.02em;
}
.directory__input::placeholder {
  color: color-mix(in srgb, var(--paper) 40%, transparent);
}
.directory__input:disabled { cursor: not-allowed; }

.directory__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.55rem 1.1rem;
  background: var(--accent);
  color: var(--paper);
  border: 1px solid var(--accent);
  border-radius: 2px;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  box-shadow: 2px 2px 0 var(--ink);
  transition: transform 0.08s, box-shadow 0.08s;
}
.directory__cta:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}
.directory__cta:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}
.directory__cta:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: 2px 2px 0 var(--rule);
}
.directory__cta-hint {
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  opacity: 0.75;
  font-weight: 500;
}
.directory__cta--go { background: #15803d; border-color: #15803d; }
.directory__cta--stop { background: #b91c1c; border-color: #b91c1c; }

.directory__book {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.directory__book-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0 0.25rem 0.25rem;
  border-bottom: 1px dashed var(--rule);
}
.directory__book-title {
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.directory__book-count {
  margin-left: auto;
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--muted);
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
}

.directory__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.directory__contact {
  width: 100%;
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.25rem;
  border: 0;
  border-bottom: 1px dashed var(--rule);
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: background 0.1s, padding 0.1s;
  font-family: var(--sans);
}
.directory__contact:last-child { border-bottom: 0; }
.directory__contact:hover:not(:disabled) {
  background: var(--paper);
  padding-left: 0.5rem;
}
.directory__contact:hover:not(:disabled) .directory__contact-cta {
  color: var(--accent);
  transform: translateX(2px);
}
.directory__contact:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.directory__contact-index {
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.directory__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper);
  font-family: var(--mono);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
}
.directory__avatar.is-icon {
  font-size: 1.05rem;
  background: var(--paper);
}

.directory__contact-body {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}
.directory__contact-name {
  font-weight: 600;
  font-size: 0.925rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.directory__contact-ext {
  font-family: var(--mono);
  font-size: 0.7rem;
  color: var(--muted);
  letter-spacing: 0.04em;
  margin-top: 0.1rem;
}

.directory__contact-cta {
  font-family: var(--mono);
  font-size: 1rem;
  color: var(--muted);
  transition: transform 0.1s, color 0.1s;
}

.directory__panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}
.directory__live-head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.directory__pulse {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: var(--accent);
  animation: dir-pulse 1.1s ease-in-out infinite;
}
@keyframes dir-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
}
.directory__live-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.directory__live-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}
.directory__actions {
  display: flex;
  gap: 0.5rem;
}

.directory__shortcut {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
