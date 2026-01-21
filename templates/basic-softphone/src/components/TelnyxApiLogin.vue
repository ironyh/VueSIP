<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import Checkbox from 'primevue/checkbox'
import { useTelnyxApi } from 'vuesip'

const STORAGE_KEY = 'vuesip_telnyx_credentials'

const emit = defineEmits<{
  'credentials-ready': [credentials: { username: string; password: string }]
  'use-manual': []
}>()

const {
  isLoading,
  error,
  isAuthenticated,
  credentials,
  selectedCredential,
  authenticate,
  selectCredential,
  getCredentials,
  clear,
} = useTelnyxApi()

// Form state
const apiKey = ref('')
const rememberCredentials = ref(false)

// Form validation
const isLoginFormValid = computed(() => apiKey.value.trim().length > 0)

// Track saved credential ID for auto-selection after login
const savedCredentialId = ref<string | null>(null)
// Convert readonly credentials array to mutable for PrimeVue Dropdown
const credentialOptions = computed(() => [...credentials.value])

// Load saved credentials on mount
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const { key, credentialId } = JSON.parse(saved)
      apiKey.value = key || ''
      savedCredentialId.value = credentialId || null
      rememberCredentials.value = true
    }
  } catch {
    // Ignore parse errors
  }
})

// Save credentials and selected credential ID to localStorage
function saveCredentials(credentialId?: string) {
  if (rememberCredentials.value) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        key: apiKey.value,
        credentialId: credentialId || savedCredentialId.value,
      })
    )
  }
}

// Watch for credential selection and save it
watch(selectedCredential, (cred) => {
  if (cred && rememberCredentials.value) {
    savedCredentialId.value = cred.id
    saveCredentials(cred.id)
  }
})

// Auto-select saved credential after authentication
watch(credentials, (creds) => {
  if (savedCredentialId.value && creds.length > 0 && !selectedCredential.value) {
    const savedCred = creds.find((c) => c.id === savedCredentialId.value)
    if (savedCred) {
      selectCredential(savedCred)
    }
  }
})

// Clear saved credentials
function clearSavedCredentials() {
  localStorage.removeItem(STORAGE_KEY)
}

// Handle API login
async function handleLogin() {
  const success = await authenticate(apiKey.value)
  if (success) {
    saveCredentials()
  }
}

// Handle credential selection
function handleCredentialSelect(cred: { id: string; sip_username: string; sip_password: string }) {
  selectCredential(cred as Parameters<typeof selectCredential>[0])
}

// Use selected credentials
function handleUseCredentials() {
  const creds = getCredentials()
  if (creds) {
    emit('credentials-ready', creds)
  }
}

// Reset and try again
function handleReset() {
  clear()
  apiKey.value = ''
  rememberCredentials.value = false
  savedCredentialId.value = null
  clearSavedCredentials()
}
</script>

<template>
  <div class="api-login">
    <!-- Step 1: API Key -->
    <template v-if="!isAuthenticated">
      <div class="api-login-header">
        <h3>Login with Telnyx API</h3>
        <p class="api-login-description">
          Enter your API key from the
          <a href="https://portal.telnyx.com/#/app/api-keys" target="_blank" rel="noopener"
            >Telnyx Mission Control</a
          >
        </p>
      </div>

      <div class="form-field">
        <label for="api-key">API Key</label>
        <InputText
          id="api-key"
          v-model="apiKey"
          type="password"
          placeholder="KEY_abc123..."
          class="w-full"
          :disabled="isLoading"
        />
        <small class="help-text">
          Your API key starts with KEY_ and can be found in API Keys section
        </small>
      </div>

      <div class="remember-me">
        <Checkbox v-model="rememberCredentials" :binary="true" input-id="remember-telnyx" />
        <label for="remember-telnyx">Remember API key</label>
      </div>

      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
      </Message>

      <Button
        label="Fetch Credentials"
        icon="pi pi-download"
        :loading="isLoading"
        :disabled="!isLoginFormValid"
        class="w-full"
        @click="handleLogin"
      />

      <div class="manual-entry-link">
        <Button
          label="Enter credentials manually instead"
          link
          class="p-button-sm"
          @click="emit('use-manual')"
        />
      </div>
    </template>

    <!-- Step 2: Select Credential -->
    <template v-else>
      <div class="api-login-header">
        <h3>Select SIP Credential</h3>
        <p class="api-login-description">Choose a telephony credential to use for WebRTC calls</p>
      </div>

      <div class="form-field">
        <label for="credential">Telephony Credential</label>
        <Dropdown
          id="credential"
          :model-value="selectedCredential"
          :options="credentialOptions"
          option-label="name"
          placeholder="Select a credential"
          class="w-full"
          :disabled="isLoading"
          @update:model-value="handleCredentialSelect"
        >
          <template #value="slotProps">
            <span v-if="slotProps.value">
              {{ slotProps.value.name || slotProps.value.sip_username }}
            </span>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
          <template #option="slotProps">
            <div class="credential-option">
              <span class="credential-name">{{ slotProps.option.name || 'Unnamed' }}</span>
              <span class="credential-username">{{ slotProps.option.sip_username }}</span>
            </div>
          </template>
        </Dropdown>
      </div>

      <Message v-if="error" severity="warn" :closable="false">
        {{ error }}
      </Message>

      <Message v-else-if="selectedCredential" severity="success" :closable="false">
        SIP credentials ready! Username: {{ selectedCredential.sip_username }}
      </Message>

      <div class="button-group">
        <Button
          label="Use These Credentials"
          icon="pi pi-check"
          :disabled="!selectedCredential"
          class="flex-1"
          @click="handleUseCredentials"
        />
        <Button
          label="Reset"
          icon="pi pi-refresh"
          class="p-button-secondary"
          @click="handleReset"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.api-login {
  padding: 8px 0;
}

.api-login-header {
  text-align: center;
  margin-bottom: 16px;
}

.api-login-header h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  color: var(--text-color);
}

.api-login-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.api-login-description a {
  color: var(--primary-500);
  text-decoration: none;
}

.api-login-description a:hover {
  text-decoration: underline;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.w-full {
  width: 100%;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.remember-me label {
  font-size: 0.875rem;
  cursor: pointer;
}

.manual-entry-link {
  text-align: center;
  margin-top: 12px;
}

.credential-option {
  display: flex;
  flex-direction: column;
}

.credential-name {
  font-weight: 500;
}

.credential-username {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.flex-1 {
  flex: 1;
}
</style>
