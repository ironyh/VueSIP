<template>
  <div class="call-center">
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#call-queue" class="skip-link">Skip to call queue</a>
      <a href="#active-call" class="skip-link">Skip to active call</a>
      <a href="#call-history" class="skip-link">Skip to call history</a>
    </div>

    <div v-if="!isConnected" class="login-container" data-testid="call-center-login">
      <div class="login-card card">
        <h1>Call Center Login</h1>
        <ConnectionPanel
          :is-connected="isConnected"
          :is-registered="false"
          :is-connecting="isConnecting"
          :error="connectionErrorMessage"
          @connect="handleConnect"
        />
        <div class="login-hints">
          <p><strong>Preset:</strong> {{ selectedPreset }}</p>
          <ul class="readiness-list">
            <li>
              {{
                readiness.hasSecureContext
                  ? 'Secure context available'
                  : 'HTTPS required for media permissions'
              }}
            </li>
            <li>
              {{
                readiness.hasMicPermission
                  ? 'Microphone permission granted'
                  : 'Microphone permission will be requested on first call'
              }}
            </li>
            <li>
              {{
                readiness.hasOutputDevice
                  ? 'Audio output device available'
                  : 'Audio output device not detected yet'
              }}
            </li>
          </ul>
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
  background: #f3f4f6;
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

.login-card {
  max-width: 500px;
  width: 100%;
}

.login-card h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #111827;
}

/* Responsive Design */
@media (max-width: 640px) {
  .login-container {
    padding: 1rem;
  }
}
</style>
