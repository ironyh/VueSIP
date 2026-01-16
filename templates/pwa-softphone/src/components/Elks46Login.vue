<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { use46ElksApi, type Elks46Number } from 'vuesip'

const STORAGE_KEY = 'vuesip_46elks_credentials'

const emit = defineEmits<{
  connect: [config: { uri: string; sipUri: string; password: string; displayName?: string }]
  back: []
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
const savedPhoneNumber = ref<string | null>(null)

// Form validation
const isLoginFormValid = computed(
  () => apiUsername.value.trim().length > 0 && apiPassword.value.trim().length > 0
)

// Load saved credentials on mount
onMounted(() => {
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

// Save credentials to localStorage
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
async function handleNumberSelect(event: Event) {
  const target = event.target as HTMLSelectElement
  const num = numbers.value.find((n) => n.id === target.value)
  if (num) {
    await selectNumber(num)
  }
}

// Use selected credentials to connect
function handleConnect() {
  const creds = getCredentials()
  if (creds) {
    emit('connect', {
      uri: 'wss://voip.46elks.com/w1/websocket',
      sipUri: `sip:${creds.phoneNumber}@voip.46elks.com`,
      password: creds.secret,
    })
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
  <div class="elks-login">
    <!-- Step 1: API Credentials -->
    <template v-if="!isAuthenticated">
      <div class="login-header">
        <button class="back-btn" @click="emit('back')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div class="header-content">
          <h2>46 elks Login</h2>
          <p>
            Enter your API credentials from the
            <a href="https://46elks.com/account" target="_blank" rel="noopener"
              >46 elks dashboard</a
            >
          </p>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="api-username">API Username</label>
          <input
            id="api-username"
            v-model="apiUsername"
            type="text"
            placeholder="u1234567890abcdef"
            autocomplete="username"
            :disabled="isLoading"
            required
          />
        </div>

        <div class="form-group">
          <label for="api-password">API Password</label>
          <input
            id="api-password"
            v-model="apiPassword"
            type="password"
            placeholder="Your API password"
            autocomplete="current-password"
            :disabled="isLoading"
            required
          />
        </div>

        <div class="remember-row">
          <input
            id="remember"
            v-model="rememberCredentials"
            type="checkbox"
            :disabled="isLoading"
          />
          <label for="remember">Remember credentials</label>
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <button type="submit" class="submit-btn" :disabled="!isLoginFormValid || isLoading">
          <svg
            v-if="isLoading"
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
          <span>{{ isLoading ? 'Fetching Numbers...' : 'Fetch Phone Numbers' }}</span>
        </button>
      </form>
    </template>

    <!-- Step 2: Select Phone Number -->
    <template v-else>
      <div class="login-header">
        <button class="back-btn" @click="handleReset">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div class="header-content">
          <h2>Select Phone Number</h2>
          <p>Choose a number to use for WebRTC calls</p>
        </div>
      </div>

      <div class="number-form">
        <div class="form-group">
          <label for="phone-number">Phone Number</label>
          <select
            id="phone-number"
            :value="selectedNumber?.id || ''"
            :disabled="isLoading"
            @change="handleNumberSelect"
          >
            <option value="" disabled>Select a phone number</option>
            <option v-for="num in numbers" :key="num.id" :value="num.id">
              {{ num.number }}{{ num.name ? ` (${num.name})` : '' }}
            </option>
          </select>
        </div>

        <p v-if="error" class="error-message warning">{{ error }}</p>

        <p v-else-if="selectedNumber && secret" class="success-message">
          WebRTC credentials found! Ready to connect.
        </p>

        <div class="button-group">
          <button
            type="button"
            class="submit-btn"
            :disabled="!selectedNumber || !secret || isLoading"
            @click="handleConnect"
          >
            <span>Connect</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.elks-login {
  flex: 1;
  display: flex;
  flex-direction: column;
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

.header-content a {
  color: var(--color-primary);
  text-decoration: none;
}

.header-content a:hover {
  text-decoration: underline;
}

.login-form,
.number-form {
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

.form-group input,
.form-group select {
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

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remember-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.remember-row input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.remember-row label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  cursor: pointer;
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

.error-message.warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
  color: #f59e0b;
}

.success-message {
  padding: 0.75rem 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--radius-md);
  color: #22c55e;
  font-size: 0.875rem;
  margin: 0;
}

.submit-btn {
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

.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.submit-btn:disabled {
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

.button-group {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}
</style>
