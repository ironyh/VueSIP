<template>
  <div class="console">
    <div v-if="!isConnected" class="console__status">
      <span class="console__status-led" aria-hidden="true" />
      <span class="console__status-label">Line</span>
      <span class="console__status-value">Offline</span>
      <span class="console__status-hint">Configure SIP · or try Diagnostic w/ simulation</span>
    </div>

    <div v-if="state === 'idle'" class="console__panel">
      <label class="console__label" for="minimal-dial">Dial target</label>
      <div class="console__display">
        <span class="console__caret" aria-hidden="true">›</span>
        <input
          id="minimal-dial"
          v-model="target"
          class="console__input"
          :placeholder="placeholder"
          :disabled="!isConnected"
          @keyup.enter="dial"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <button
        type="button"
        class="console__cta"
        :disabled="!isConnected || !target.trim()"
        @click="dial"
      >
        <span class="console__cta-label">Place call</span>
        <span class="console__cta-hint">Enter ↵</span>
      </button>
    </div>

    <div
      v-else-if="isIncoming"
      class="console__panel console__panel--live"
      aria-live="polite"
      aria-atomic="true"
    >
      <div class="console__live-head">
        <span class="console__pulse" aria-hidden="true" />
        <span class="console__live-label">Incoming</span>
        <span class="console__live-name">{{ remoteDisplayName || remoteUri }}</span>
      </div>
      <div class="console__actions">
        <button type="button" class="console__cta console__cta--go" @click="answer({ audio: true, video: false })">Answer</button>
        <button type="button" class="console__cta console__cta--stop" @click="reject(486)">Reject</button>
      </div>
      <p class="console__shortcut">Space to answer · Esc to reject</p>
    </div>

    <div v-else class="console__panel console__panel--live" aria-live="polite" aria-atomic="true">
      <div class="console__live-head">
        <span class="console__live-label">{{ stateLabel }}</span>
        <span class="console__live-name">{{ remoteDisplayName || remoteUri }}</span>
      </div>
      <button
        v-if="canHangup"
        type="button"
        class="console__cta console__cta--stop"
        @click="hangup"
      >
        Hang up
      </button>
      <p v-if="canHangup" class="console__shortcut">Esc to hang up</p>
    </div>
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
  return domain ? `2000 or sip:2000@${domain}` : '2000 or sip:2000@example.com'
})

const dial = async () => {
  const uri = resolveDialTarget(target.value, registeredUri.value)
  if (!uri) return
  await makeCall(uri, { audio: true, video: false })
}

const isIncoming = computed(() => isIncomingCallState(state.value))
const canHangup = computed(() => canHangupFromState(state.value))
const stateLabel = computed(() => formatBasicCallState(state.value))
</script>

<style scoped>
.console {
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
  gap: 0.75rem;
  color: var(--ink);
}

.console__status {
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
.console__status-led {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--muted);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--muted) 20%, transparent);
}
.console__status-label { color: var(--muted); }
.console__status-value { color: var(--ink); font-weight: 700; }
.console__status-hint {
  margin-left: auto;
  color: var(--muted);
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 0.7rem;
}

.console__panel {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem 1rem;
  align-items: end;
}

.console__label {
  grid-column: 1 / -1;
  font-family: var(--mono);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  margin-bottom: 0.15rem;
}

.console__display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--ink);
  border: 1px solid var(--ink);
  border-radius: 2px;
  min-height: 2.5rem;
}

.console__caret {
  color: var(--accent);
  font-family: var(--mono);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  animation: caret-blink 1s steps(2) infinite;
}

@keyframes caret-blink {
  50% { opacity: 0; }
}

.console__input {
  flex: 1;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--paper);
  font-family: var(--mono);
  font-size: 1.05rem;
  letter-spacing: 0.02em;
}

.console__input::placeholder {
  color: color-mix(in srgb, var(--paper) 40%, transparent);
}

.console__input:disabled {
  cursor: not-allowed;
}

.console__cta {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  min-width: 7rem;
  padding: 0.55rem 1rem;
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
  transition: transform 0.08s, box-shadow 0.08s;
  box-shadow: 2px 2px 0 var(--ink);
}

.console__cta:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--ink);
}

.console__cta:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--ink);
}

.console__cta:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: 2px 2px 0 var(--rule);
}

.console__cta-label { line-height: 1; }
.console__cta-hint {
  font-size: 0.6rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  opacity: 0.75;
  margin-top: 0.15rem;
}

.console__cta--go {
  background: #15803d;
  border-color: #15803d;
}
.console__cta--stop {
  background: #b91c1c;
  border-color: #b91c1c;
}

.console__panel--live {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: var(--paper-deep);
}

.console__shortcut {
  margin: 0;
  font-family: var(--mono);
  font-size: 0.65rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.console__live-head {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.console__pulse {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 50%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
}

.console__live-label {
  font-family: var(--mono);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.console__live-name {
  font-family: var(--mono);
  font-size: 0.95rem;
  color: var(--ink);
}

.console__actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 540px) {
  .console__panel { grid-template-columns: 1fr; }
}
</style>
