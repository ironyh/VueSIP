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
        <Button @click="goAmi" label="Open AMI Click-to-Call" severity="secondary" outlined text />
      </div>

      <div class="form-grid">
        <div class="row">
          <label for="mock-mode">Mock Mode</label>
          <Checkbox id="mock-mode" v-model="mockMode" :binary="true" />
        </div>
        <div class="row">
          <label for="default-number">Default Number</label>
          <InputText
            id="default-number"
            v-model="defaultNumber"
            placeholder="+15551234567"
            class="w-full"
          />
        </div>
      </div>

      <details class="advanced">
        <summary>Real SIP (optional)</summary>
        <div class="form-grid">
          <div class="row">
            <label for="ws-uri">WS URI</label>
            <InputText
              id="ws-uri"
              v-model="wsUri"
              placeholder="wss://sip.example.com"
              class="w-full"
            />
          </div>
          <div class="row">
            <label for="sip-uri">SIP URI</label>
            <InputText
              id="sip-uri"
              v-model="sipUri"
              placeholder="sip:user@example.com"
              class="w-full"
            />
          </div>
          <div class="row">
            <label for="password">Password</label>
            <Password
              id="password"
              v-model="password"
              placeholder="secret"
              :feedback="false"
              toggleMask
              class="w-full"
            />
          </div>
          <div class="row">
            <label for="display-name">Display Name</label>
            <InputText id="display-name" v-model="displayName" placeholder="Agent" class="w-full" />
          </div>
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
        <Button v-if="callState === 'idle'" @click="doCall" label="Call" severity="primary" />
        <Button
          v-else-if="callState === 'ringing'"
          @click="answer"
          label="Answer"
          severity="success"
        />
        <Button v-else @click="hangup" label="Hang up" severity="danger" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Click-to-Call Widget Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for all interactive buttons with appropriate severity levels
 * - Using PrimeVue InputText for text inputs with proper v-model binding
 * - Using PrimeVue Password for password input with proper v-model binding
 * - Using PrimeVue Checkbox for mock mode toggle with proper binary binding
 * - Widget buttons remain custom styled to maintain the embedded widget appearance
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { computed, ref, watch } from 'vue'
import { useClickToCall } from '../../src/composables/useClickToCall'
import { Button, InputText, Password, Checkbox } from './shared-components'

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
/* Design Decision: PrimeVue InputText and Password components handle input styling.
   Removed custom input styles as they're no longer needed. */
.row :deep(.p-inputtext),
.row :deep(.p-password input) {
  width: 100%;
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
  color: var(--success);
}
.body {
  margin-bottom: 8px;
}
/* Design Decision: PrimeVue Button components handle all button styling.
   Widget buttons use PrimeVue Button with appropriate severity levels.
   Removed custom button styles as they're no longer needed. */
@media (max-width: 900px) {
  .ctc-demo {
    grid-template-columns: 1fr;
  }
}
</style>
