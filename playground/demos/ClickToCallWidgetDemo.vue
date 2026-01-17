<template>
  <div class="ctc-demo">
    <div class="panel">
      <h3>Click-to-Call Widget (Browser SIP)</h3>
      <div class="infobox">
        <p>
          <strong>What this is:</strong> A browser-based SIP/WebRTC widget using your
          microphone/speakers. Connects directly to your SIP server.
        </p>
        <p>
          <strong>When to use:</strong> Self-contained web dialer, embedded support widget, direct
          SIP from the browser.
        </p>
        <p>
          <strong>Need agent-first dialing?</strong> See the <em>AMI Click-to-Call</em> example in
          the AMI section.
        </p>
        <button class="link-btn" @click="goAmi">Open AMI Click-to-Call</button>
      </div>

      <div class="form-grid">
        <label class="row">
          <span>Mock Mode</span>
          <input type="checkbox" v-model="mockMode" />
        </label>
        <label class="row">
          <span>Default Number</span>
          <input v-model="defaultNumber" type="text" placeholder="+15551234567" />
        </label>
      </div>

      <details class="advanced">
        <summary>Real SIP (optional)</summary>
        <div class="form-grid">
          <label class="row">
            <span>WS URI</span><input v-model="wsUri" placeholder="wss://sip.example.com" />
          </label>
          <label class="row">
            <span>SIP URI</span><input v-model="sipUri" placeholder="sip:user@example.com" />
          </label>
          <label class="row">
            <span>Password</span><input v-model="password" type="password" placeholder="secret" />
          </label>
          <label class="row">
            <span>Display Name</span><input v-model="displayName" placeholder="Agent" />
          </label>
        </div>
      </details>
    </div>

    <div class="widget" :style="cssVars">
      <div class="header">
        <strong>Click to Call</strong>
        <span class="status" :class="{ on: isConnected }">●</span>
      </div>

      <div class="body">
        <div class="state">State: {{ callState }}</div>
        <div class="remote" v-if="remoteNumber">Remote: {{ remoteNumber }}</div>
        <div class="duration" v-if="callState === 'active'">Duration: {{ callDuration }}s</div>
      </div>

      <div class="actions">
        <button v-if="callState === 'idle'" @click="doCall">Call</button>
        <button v-else-if="callState === 'ringing'" @click="answer">Answer</button>
        <button v-else @click="hangup">Hang up</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClickToCall } from '../../src/composables/useClickToCall'

const mockMode = ref(true)
const defaultNumber = ref('+15551234567')

// Real SIP fields (optional)
const wsUri = ref('')
const sipUri = ref('')
const password = ref('')
const displayName = ref('')

const sipConfig = computed(() =>
  wsUri.value && sipUri.value && password.value
    ? {
        wsUri: wsUri.value,
        sipUri: sipUri.value,
        password: password.value,
        displayName: displayName.value || undefined,
      }
    : undefined
)

const ctc = useClickToCall({
  mockMode: mockMode.value,
  sipConfig: sipConfig.value,
  defaultNumber: defaultNumber.value,
  onCallStart: (n) => console.log('[ctc] start', n),
  onCallEnd: (d) => console.log('[ctc] end', d),
  onError: (e) => console.warn('[ctc] error', e?.message ?? e),
})

// Reconfigure when toggles/inputs change
watch([mockMode, defaultNumber, sipConfig], ([mm, dn, sc]) => {
  ctc.configure({ mockMode: mm, defaultNumber: dn, sipConfig: sc })
})

const { cssVars, isConnected, callState, callDuration, remoteNumber, call, hangup, answer } = ctc

async function doCall() {
  await call()
}

function goAmi() {
  window.location.hash = '#click-to-call'
}
</script>

<style scoped>
.ctc-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
.panel {
  background: var(--vp-c-bg-soft);
  padding: 16px;
  border-radius: 12px;
}
.infobox {
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  border: 1px dashed var(--vp-c-divider);
  padding: 8px;
  border-radius: 8px;
}
.form-grid {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: center;
  gap: 8px;
}
.row input[type='text'],
.row input[type='password'] {
  width: 100%;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.advanced {
  margin-top: 8px;
}
.widget {
  padding: 16px;
  border-radius: 12px;
  box-shadow: var(--ctc-shadow);
  background: var(--ctc-bg);
  color: var(--ctc-text);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.status {
  color: var(--vp-c-text-3);
}
.status.on {
  color: #28a745;
}
.body {
  margin-bottom: 8px;
}
.actions button {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ctc-primary);
  color: #fff;
  border: none;
  cursor: pointer;
}
.actions button:hover {
  background: var(--ctc-primary-hover);
}
.link-btn {
  margin-top: 8px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
}
.link-btn:hover {
  background: var(--vp-c-bg-soft);
}
@media (max-width: 900px) {
  .ctc-demo {
    grid-template-columns: 1fr;
  }
}
</style>
