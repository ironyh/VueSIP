<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import Checkbox from 'primevue/checkbox'
import { use46ElksApi, type Elks46Number } from 'vuesip'

const STORAGE_KEY = 'vuesip_46elks_credentials'

const emit = defineEmits<{
  'credentials-ready': [credentials: { phoneNumber: string; secret: string }]
  'use-manual': []
}>()

const {
  isLoading,
  error,
  isAuthenticated,
  numbers,
  selectedNumber,
  secret,
  authenticate,
  selectNumber,
  getCredentials,
  clear,
} = use46ElksApi()

// Form state
const apiUsername = ref('')
const apiPassword = ref('')
const rememberCredentials = ref(false)
const appOrigin = ref('')
const appBase = ref('/')
const copyStatus = ref<string | null>(null)

// Form validation
const isLoginFormValid = computed(
  () => apiUsername.value.trim().length > 0 && apiPassword.value.trim().length > 0
)

// Track saved phone number for auto-selection after login
const savedPhoneNumber = ref<string | null>(null)
// Load saved credentials on mount
onMounted(() => {
  try {
    appOrigin.value = window.location.origin
  } catch {
    appOrigin.value = ''
  }

  try {
    const base = String(import.meta.env.BASE_URL || '/').trim()
    const normalized = base.startsWith('/') ? base : `/${base}`
    appBase.value = normalized.endsWith('/') ? normalized : `${normalized}/`
  } catch {
    appBase.value = '/'
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const { username, password, phoneNumber } = JSON.parse(saved)
      apiUsername.value = username || ''
      apiPassword.value = password || ''
      savedPhoneNumber.value = phoneNumber || null
      rememberCredentials.value = true
    }
  } catch {
    // Ignore parse errors
  }
})

// Save credentials and selected number to localStorage
function saveCredentials(phoneNumber?: string) {
  if (rememberCredentials.value) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        username: apiUsername.value,
        password: apiPassword.value,
        phoneNumber: phoneNumber || savedPhoneNumber.value,
      })
    )
  }
}

function normalizeConnectTarget(target: string): string {
  const raw = String(target ?? '').trim()
  if (!raw) return ''
  return raw.startsWith('+') ? raw : `+${raw}`
}

function voiceStartUrlFor(target: string): string {
  const connect = normalizeConnectTarget(target)
  if (!connect || !appOrigin.value) return ''
  return `${appOrigin.value}${appBase.value}elks/calls?connect=${encodeURIComponent(connect)}`
}

async function copyText(label: string, value: string) {
  const text = String(value ?? '').trim()
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    copyStatus.value = `${label} copied`
  } catch {
    // Fallback: use prompt which still allows copy
    window.prompt(`Copy ${label}:`, text)
    copyStatus.value = `${label} ready to copy`
  }

  window.setTimeout(() => {
    if (copyStatus.value?.startsWith(label)) copyStatus.value = null
  }, 2500)
}

// Watch for number selection and save it
watch(selectedNumber, (num) => {
  if (num && rememberCredentials.value) {
    savedPhoneNumber.value = num.number
    saveCredentials(num.number)
  }
})

// Auto-select saved number after authentication
watch(numbers, async (nums) => {
  if (savedPhoneNumber.value && nums.length > 0 && !selectedNumber.value) {
    const savedNum = nums.find((n) => n.number === savedPhoneNumber.value)
    if (savedNum) {
      await selectNumber(savedNum)
    }
  }
})

// Clear saved credentials
function clearSavedCredentials() {
  localStorage.removeItem(STORAGE_KEY)
}

// Handle API login
async function handleLogin() {
  const success = await authenticate(apiUsername.value, apiPassword.value)
  if (success) {
    saveCredentials()
  }
}

// Handle number selection
async function handleNumberSelect(num: Elks46Number) {
  await selectNumber(num)
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
  apiUsername.value = ''
  apiPassword.value = ''
  rememberCredentials.value = false
  savedPhoneNumber.value = null
  clearSavedCredentials()
}
</script>

<template>
  <div class="api-login">
    <!-- Step 1: API Credentials -->
    <template v-if="!isAuthenticated">
      <div class="api-login-header">
        <h3>Login with 46 elks API</h3>
        <p class="api-login-description">
          Enter your API credentials from the
          <a href="https://46elks.com/account" target="_blank" rel="noopener">46 elks dashboard</a>
        </p>
      </div>

      <div class="form-field">
        <label for="api-username">API Username</label>
        <InputText
          id="api-username"
          v-model="apiUsername"
          placeholder="u1234567890abcdef"
          class="w-full"
          :disabled="isLoading"
        />
      </div>

      <div class="form-field">
        <label for="api-password">API Password</label>
        <InputText
          id="api-password"
          v-model="apiPassword"
          type="password"
          placeholder="Your API password"
          class="w-full"
          :disabled="isLoading"
        />
      </div>

      <div class="remember-me">
        <Checkbox v-model="rememberCredentials" :binary="true" input-id="remember" />
        <label for="remember">Remember credentials</label>
      </div>

      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
      </Message>

      <Button
        label="Fetch Phone Numbers"
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

    <!-- Step 2: Select Phone Number -->
    <template v-else>
      <div class="api-login-header">
        <h3>Select Phone Number</h3>
        <p class="api-login-description">Choose a number to use for WebRTC calls</p>
      </div>

      <div class="form-field">
        <label for="phone-number">Phone Number</label>
        <Dropdown
          id="phone-number"
          :model-value="selectedNumber"
          :options="numbers"
          option-label="number"
          placeholder="Select a phone number"
          class="w-full"
          :disabled="isLoading"
          @update:model-value="handleNumberSelect"
        >
          <template #value="slotProps">
            <span v-if="slotProps.value">
              {{ slotProps.value.number }}
              <span v-if="slotProps.value.name" class="number-name">
                ({{ slotProps.value.name }})
              </span>
            </span>
            <span v-else>{{ slotProps.placeholder }}</span>
          </template>
          <template #option="slotProps">
            <div class="number-option">
              <span>{{ slotProps.option.number }}</span>
              <span v-if="slotProps.option.name" class="number-name">
                {{ slotProps.option.name }}
              </span>
            </div>
          </template>
        </Dropdown>
      </div>

      <div class="voice-start" v-if="numbers.length">
        <h4>Incoming calls (voice_start)</h4>
        <p class="api-login-description">
          46elks uses <code>voice_start</code> for incoming calls (not <code>sms_url</code>). Set
          <code>voice_start</code> for each number to the callback URL below.
        </p>

        <div class="voice-start-list">
          <div v-for="num in numbers" :key="num.id" class="voice-start-row">
            <div class="voice-start-number">
              <strong>{{ num.number }}</strong>
              <span v-if="num.name" class="number-name">({{ num.name }})</span>
            </div>

            <div class="voice-start-field" v-if="voiceStartUrlFor(num.number)">
              <InputText
                :model-value="voiceStartUrlFor(num.number)"
                readonly
                class="w-full monospace"
              />
              <Button
                label="Copy ELK Callback URL"
                icon="pi pi-copy"
                class="p-button-sm"
                @click="copyText('ELK Callback URL', voiceStartUrlFor(num.number))"
              />
            </div>
          </div>
        </div>

        <small v-if="copyStatus" class="copy-status">{{ copyStatus }}</small>
      </div>

      <Message v-if="error" severity="warn" :closable="false">
        {{ error }}
      </Message>

      <Message v-else-if="selectedNumber && secret" severity="success" :closable="false">
        WebRTC credentials found! Ready to connect.
      </Message>

      <div class="button-group">
        <Button
          label="Use These Credentials"
          icon="pi pi-check"
          :disabled="!selectedNumber || !secret"
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

.number-option {
  display: flex;
  flex-direction: column;
}

.number-name {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-left: 4px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.voice-start {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  background: var(--surface-50);
}

.voice-start h4 {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.voice-start-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.voice-start-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--surface-200);
  border-radius: 8px;
  background: var(--surface-0);
}

.voice-start-number {
  font-size: 0.875rem;
}

.voice-start-field {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.monospace :deep(input) {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 0.8rem;
}

.copy-status {
  display: block;
  margin-top: 8px;
  color: var(--text-color-secondary);
}

.flex-1 {
  flex: 1;
}
</style>
