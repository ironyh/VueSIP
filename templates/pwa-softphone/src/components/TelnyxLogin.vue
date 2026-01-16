<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'vuesip_telnyx_credentials'

defineProps<{
<<<<<<< HEAD
  isConnecting: boolean
=======
  isConnecting?: boolean
>>>>>>> origin/main
  errorMessage?: string
}>()

const emit = defineEmits<{
  connect: [config: { uri: string; sipUri: string; password: string; displayName?: string }]
  back: []
}>()

// Form state
const sipUsername = ref('')
const sipPassword = ref('')
const displayName = ref('')
const rememberCredentials = ref(false)

// Form validation
const isFormValid = computed(
  () => sipUsername.value.trim().length > 0 && sipPassword.value.trim().length > 0
)

// Load saved credentials on mount
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
<<<<<<< HEAD
      const { username, name } = JSON.parse(saved)
      sipUsername.value = username || ''
      displayName.value = name || ''
=======
      const parsed = JSON.parse(saved)
      sipUsername.value = parsed.sipUsername || ''
      displayName.value = parsed.displayName || ''
>>>>>>> origin/main
      rememberCredentials.value = true
    }
  } catch {
    // Ignore parse errors
  }
})

<<<<<<< HEAD
// Save credentials to localStorage (except password)
function saveCredentials() {
=======
// Handle form submission
function handleSubmit() {
  if (!isFormValid.value) return

  // Save credentials (except password)
>>>>>>> origin/main
  if (rememberCredentials.value) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
<<<<<<< HEAD
        username: sipUsername.value,
        name: displayName.value,
=======
        sipUsername: sipUsername.value,
        displayName: displayName.value,
>>>>>>> origin/main
      })
    )
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
<<<<<<< HEAD
}

// Handle form submission
function handleSubmit() {
  if (!isFormValid.value) return

  saveCredentials()
=======
>>>>>>> origin/main

  emit('connect', {
    uri: 'wss://rtc.telnyx.com',
    sipUri: `sip:${sipUsername.value}@sip.telnyx.com`,
    password: sipPassword.value,
    displayName: displayName.value || undefined,
  })
}
</script>

<template>
  <div class="telnyx-login">
    <div class="login-header">
      <button class="back-btn" @click="emit('back')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div class="header-content">
        <h2>Telnyx Login</h2>
        <p>
          Enter your SIP credentials from the
<<<<<<< HEAD
          <a href="https://portal.telnyx.com" target="_blank" rel="noopener">Telnyx portal</a>
=======
          <a href="https://portal.telnyx.com" target="_blank" rel="noopener">Telnyx Portal</a>
>>>>>>> origin/main
        </p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="login-form">
      <div class="form-group">
        <label for="sip-username">SIP Username</label>
        <input
          id="sip-username"
          v-model="sipUsername"
          type="text"
          placeholder="your-sip-username"
          autocomplete="username"
          :disabled="isConnecting"
          required
        />
<<<<<<< HEAD
        <span class="hint">From Telnyx Mission Control → SIP Connections</span>
=======
        <span class="hint">From your Telnyx Credential Connection</span>
>>>>>>> origin/main
      </div>

      <div class="form-group">
        <label for="sip-password">SIP Password</label>
        <input
          id="sip-password"
          v-model="sipPassword"
          type="password"
          placeholder="Your SIP password"
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

      <div class="remember-row">
        <input
          id="remember"
          v-model="rememberCredentials"
          type="checkbox"
          :disabled="isConnecting"
        />
        <label for="remember">Remember credentials</label>
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <button type="submit" class="submit-btn" :disabled="!isFormValid || isConnecting">
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
  </div>
</template>

<style scoped>
.telnyx-login {
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

.login-form {
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
</style>
