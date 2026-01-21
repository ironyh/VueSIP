<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ProviderSelector from './ProviderSelector.vue'
import Elks46Login from './Elks46Login.vue'
import TelnyxLogin from './TelnyxLogin.vue'
import MultiAccountSettings from './MultiAccountSettings.vue'

type ProviderId = '46elks' | 'telnyx' | 'custom' | 'advanced'

defineProps<{
  isConnecting: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{ connect: [config: any] }>()

// Current view state
const selectedProvider = ref<ProviderId | null>(null)

// Custom PBX form fields
const wsServer = ref('')
const sipUri = ref('')
const password = ref('')
const displayName = ref('')

// Load saved provider preference and credentials
onMounted(() => {
  const savedProvider = localStorage.getItem('vuesip-provider')
  if (savedProvider) {
    selectedProvider.value = savedProvider as ProviderId
  }

  const saved = localStorage.getItem('vuesip-credentials')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      wsServer.value = parsed.wsServer || ''
      sipUri.value = parsed.sipUri || ''
      displayName.value = parsed.displayName || ''
    } catch {
      // Ignore parse errors
    }
  }
})

// Handle provider selection
function handleProviderSelect(providerId: ProviderId) {
  selectedProvider.value = providerId
  localStorage.setItem('vuesip-provider', providerId)
}

// Handle back navigation
function handleBack() {
  selectedProvider.value = null
}

// Forward connect events from provider components
function handleConnect(config: any) {
  // 46elks login already includes providerId + providerMeta
  if (config && typeof config === 'object' && 'providerId' in config) {
    emit('connect', config)
    return
  }

  emit('connect', {
    providerId: selectedProvider.value as Exclude<ProviderId, null>,
    ...config,
  } as any)
}

// Custom PBX form handling
const isCustomFormValid = computed(() => {
  return wsServer.value.trim() !== '' && sipUri.value.trim() !== '' && password.value.trim() !== ''
})

function handleCustomSubmit() {
  if (!isCustomFormValid.value) return

  // Save credentials (except password)
  localStorage.setItem(
    'vuesip-credentials',
    JSON.stringify({
      wsServer: wsServer.value,
      sipUri: sipUri.value,
      displayName: displayName.value,
    })
  )

  emit('connect', {
    providerId: 'custom',
    uri: wsServer.value,
    sipUri: sipUri.value,
    password: password.value,
    displayName: displayName.value || undefined,
  })
}
</script>

<template>
  <div class="settings">
    <!-- Provider Selection -->
    <template v-if="!selectedProvider">
      <div class="settings-header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <h2>VueSIP Softphone</h2>
        <p>Connect to your VoIP provider</p>
      </div>

      <ProviderSelector @select="handleProviderSelect" />

      <div class="settings-footer">
        <p>Powered by VueSIP</p>
      </div>
    </template>

    <!-- 46elks Login -->
    <Elks46Login
      v-else-if="selectedProvider === '46elks'"
      @connect="handleConnect"
      @back="handleBack"
    />

    <!-- Telnyx Login -->
    <TelnyxLogin
      v-else-if="selectedProvider === 'telnyx'"
      :is-connecting="isConnecting"
      :error-message="errorMessage"
      @connect="handleConnect"
      @back="handleBack"
    />

    <!-- Advanced Multi-Account -->
    <MultiAccountSettings
      v-else-if="selectedProvider === 'advanced'"
      :is-connecting="isConnecting"
      :error-message="errorMessage"
      @connect="handleConnect"
      @back="handleBack"
    />

    <!-- Custom PBX -->
    <template v-else-if="selectedProvider === 'custom'">
      <div class="login-header">
        <button class="back-btn" @click="handleBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div class="header-content">
          <h2>Custom PBX</h2>
          <p>Enter your SIP server credentials</p>
        </div>
      </div>

      <form @submit.prevent="handleCustomSubmit" class="settings-form">
        <div class="form-group">
          <label for="ws-server">WebSocket Server</label>
          <input
            id="ws-server"
            v-model="wsServer"
            type="url"
            placeholder="wss://sip.example.com:8089/ws"
            autocomplete="url"
            :disabled="isConnecting"
            required
          />
          <span class="hint">WebSocket URL for SIP connection</span>
        </div>

        <div class="form-group">
          <label for="sip-uri">SIP URI</label>
          <input
            id="sip-uri"
            v-model="sipUri"
            type="text"
            placeholder="sip:1001@sip.example.com"
            autocomplete="username"
            :disabled="isConnecting"
            required
          />
          <span class="hint">Your SIP address (sip:user@domain)</span>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter your SIP password"
            autocomplete="current-password"
            :disabled="isConnecting"
            required
          />
        </div>

        <div class="form-group">
          <label for="display-name">Display Name (optional)</label>
          <input
            id="display-name"
            v-model="displayName"
            type="text"
            placeholder="Your Name"
            autocomplete="name"
            :disabled="isConnecting"
          />
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" class="connect-btn" :disabled="!isCustomFormValid || isConnecting">
          <svg
            v-if="isConnecting"
            class="spinner"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
            />
          </svg>
          <span>{{ isConnecting ? 'Connecting...' : 'Connect' }}</span>
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.settings {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0 0.5rem;
  text-align: center;
}

.settings-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0.75rem 0 0.25rem;
  color: var(--text-primary);
}

.settings-header p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.logo {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo svg {
  width: 32px;
  height: 32px;
  color: white;
}

.settings-footer {
  padding: 1.5rem 0;
  text-align: center;
}

.settings-footer p {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin: 0;
}

.login-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1rem 0;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.back-btn svg {
  width: 20px;
  height: 20px;
}

.header-content {
  flex: 1;
}

.header-content h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--text-primary);
}

.header-content p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.settings-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input {
  padding: 0.875rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  color: var(--text-primary);
  transition: all 0.2s;
}

.form-group input::placeholder {
  color: var(--text-tertiary);
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.error-message {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  color: var(--color-error);
  font-size: 0.875rem;
  margin: 0;
}

.connect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  margin-top: auto;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
