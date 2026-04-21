<template>
  <div class="call-center">
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#call-queue" class="skip-link">Skip to call queue</a>
      <a href="#active-call" class="skip-link">Skip to active call</a>
      <a href="#call-history" class="skip-link">Skip to call history</a>
    </div>

    <div v-if="!isConnected" class="login-container" data-testid="call-center-login">
      <div class="login-shell">
        <section class="login-hero">
          <span class="hero-badge">VueSIP Demo</span>
          <h1>Call center workspace for inbound support and callback follow-up.</h1>
          <p class="hero-copy">
            Start in a clean demo shell, connect the softphone runtime on demand, and show the full
            agent-to-supervisor workflow without waiting on timers.
          </p>
          <div class="hero-highlights" aria-label="Demo capabilities">
            <article class="hero-highlight">
              <strong>Inbound queues</strong>
              <span>Agent availability, live queue work, and wrap-up in one workspace.</span>
            </article>
            <article class="hero-highlight">
              <strong>Callback follow-up</strong>
              <span>Seed callbacks, complete outcomes, and reassign work from the board.</span>
            </article>
            <article class="hero-highlight">
              <strong>Supervisor visibility</strong>
              <span>Queue load, open callbacks, and alerting without joining live calls.</span>
            </article>
          </div>
        </section>

        <div class="login-card card">
          <div class="login-card-header">
            <div>
              <p class="eyebrow">Agent sign-in</p>
              <h2>Connect the runtime</h2>
            </div>
            <span class="preset-chip">Preset {{ selectedPreset }}</span>
          </div>

          <ConnectionPanel
            :is-connected="isConnected"
            :is-registered="false"
            :is-connecting="isConnecting"
            :error="connectionErrorMessage"
            @connect="handleConnect"
          />

          <div class="login-hints">
            <div class="readiness-header">
              <div>
                <p class="eyebrow">Environment readiness</p>
                <h3>Presenter checklist</h3>
              </div>
              <span class="status-chip" :class="{ ready: readiness.hasSecureContext }">
                {{ readiness.hasSecureContext ? 'Ready' : 'Action needed' }}
              </span>
            </div>

            <ul class="readiness-list">
              <li :class="{ ready: readiness.hasSecureContext }">
                <strong>{{
                  readiness.hasSecureContext ? 'Secure context' : 'HTTPS required'
                }}</strong>
                <span>
                  {{
                    readiness.hasSecureContext
                      ? 'Browser APIs for media and device selection are available.'
                      : 'Open the demo over HTTPS or localhost before presenting audio features.'
                  }}
                </span>
              </li>
              <li :class="{ ready: readiness.hasMicPermission }">
                <strong>
                  {{
                    readiness.hasMicPermission
                      ? 'Microphone permission granted'
                      : 'Microphone access pending'
                  }}
                </strong>
                <span>
                  {{
                    readiness.hasMicPermission
                      ? 'The agent can start connected calls without an extra browser prompt.'
                      : 'The first live call will prompt for microphone access.'
                  }}
                </span>
              </li>
              <li :class="{ ready: readiness.hasOutputDevice }">
                <strong>
                  {{
                    readiness.hasOutputDevice
                      ? 'Audio output detected'
                      : 'Audio output not detected yet'
                  }}
                </strong>
                <span>
                  {{
                    readiness.hasOutputDevice
                      ? 'Speaker routing is available for the call runtime.'
                      : 'Connect headphones or speakers before a full demo run.'
                  }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <CallCenterRuntime
      v-if="runtimeRequest"
      v-show="isConnected"
      :selected-preset="runtimeRequest.selectedPreset"
      :sip-config="runtimeRequest.sipConfig"
      @connected="handleRuntimeConnected"
      @connection-error="handleRuntimeConnectionError"
      @disconnected="handleRuntimeDisconnected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'
import type { SipClientConfig } from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import { useEnvironmentSetup } from './features/setup/useEnvironmentSetup'
const CallCenterRuntime = defineAsyncComponent(() => import('./CallCenterRuntime.vue'))

const { selectedPreset, readiness, syncFromForm, validateCurrentConfig, toSipConfig } =
  useEnvironmentSetup()

const isConnected = ref(false)
const isConnecting = ref(false)
const connectionErrorMessage = ref<string | null>(null)
const runtimeRequest = ref<{ selectedPreset: string; sipConfig: SipClientConfig } | null>(null)

const handleConnect = (form: {
  server: string
  username: string
  password: string
  displayName: string
}) => {
  syncFromForm(form)

  const validation = validateCurrentConfig()
  if (!validation.valid) {
    connectionErrorMessage.value = `Missing required fields: ${validation.errors.join(', ')}`
    return
  }

  connectionErrorMessage.value = null
  isConnecting.value = true
  isConnected.value = false
  runtimeRequest.value = {
    selectedPreset: selectedPreset.value,
    sipConfig: toSipConfig(),
  }
}

const handleRuntimeConnected = () => {
  isConnecting.value = false
  isConnected.value = true
  connectionErrorMessage.value = null
}

const handleRuntimeConnectionError = (message: string) => {
  isConnecting.value = false
  isConnected.value = false
  connectionErrorMessage.value = message
  runtimeRequest.value = null
}

const handleRuntimeDisconnected = () => {
  isConnecting.value = false
  isConnected.value = false
  connectionErrorMessage.value = null
  runtimeRequest.value = null
}
</script>

<style scoped>
.call-center {
  width: 100%;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 34%),
    linear-gradient(180deg, #fff7ed 0%, #eff6ff 35%, #f8fafc 100%);
}

.skip-links {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 9999;
}

.skip-link {
  position: absolute;
  left: -9999px;
  padding: 0.75rem 1.5rem;
  background: #1e40af;
  color: white;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 8px 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.skip-link:focus {
  left: 0;
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
}

/* Login Container */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.login-shell {
  width: min(1180px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(420px, 0.85fr);
  gap: 2rem;
  align-items: stretch;
}

.login-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem 1rem;
}

.hero-badge,
.preset-chip,
.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero-badge {
  color: #9a3412;
  background: rgba(255, 237, 213, 0.9);
  border: 1px solid rgba(251, 146, 60, 0.5);
}

.login-hero h1 {
  margin: 0;
  max-width: 12ch;
  font-size: clamp(2.8rem, 5vw, 4.8rem);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: #0f172a;
}

.hero-copy {
  max-width: 58ch;
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.7;
  color: #334155;
}

.hero-highlights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.hero-highlight {
  padding: 1.1rem 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.26);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.hero-highlight strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #0f172a;
}

.hero-highlight span {
  display: block;
  color: #475569;
  line-height: 1.55;
  font-size: 0.94rem;
}

.login-card {
  max-width: none;
  width: 100%;
  padding: 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px);
}

.login-card-header,
.readiness-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #c2410c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 800;
}

.login-card-header h2,
.readiness-header h3 {
  margin: 0;
  color: #0f172a;
}

.preset-chip {
  color: #0f766e;
  background: rgba(204, 251, 241, 0.9);
  border: 1px solid rgba(45, 212, 191, 0.45);
}

.login-hints {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 247, 237, 0.82), rgba(255, 255, 255, 0.94));
  border: 1px solid rgba(251, 146, 60, 0.2);
}

.status-chip {
  color: #9a3412;
  background: rgba(255, 237, 213, 0.92);
  border: 1px solid rgba(251, 146, 60, 0.35);
}

.status-chip.ready {
  color: #166534;
  background: rgba(220, 252, 231, 0.92);
  border-color: rgba(74, 222, 128, 0.4);
}

.readiness-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.readiness-list li {
  display: grid;
  gap: 0.25rem;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.readiness-list li.ready {
  border-color: rgba(74, 222, 128, 0.35);
}

.readiness-list strong {
  color: #0f172a;
}

.readiness-list span {
  color: #475569;
  line-height: 1.5;
  font-size: 0.94rem;
}

/* Responsive Design */
@media (max-width: 1080px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-hero {
    padding: 0;
  }

  .hero-highlights {
    grid-template-columns: 1fr;
  }

  .login-hero h1 {
    max-width: none;
  }
}

@media (max-width: 640px) {
  .login-container {
    padding: 1rem;
  }

  .login-card {
    padding: 1.15rem;
  }

  .login-card-header,
  .readiness-header {
    flex-direction: column;
  }
}
</style>
