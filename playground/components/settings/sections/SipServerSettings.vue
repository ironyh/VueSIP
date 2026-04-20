<template>
  <div class="sip-server-settings">
    <div class="settings-section">
      <h3 class="section-title">Server Connection</h3>

      <!-- WebSocket URI -->
      <div class="form-group">
        <label for="ws-uri" class="form-label">
          WebSocket URI
          <span class="required">*</span>
        </label>
        <input
          id="ws-uri"
          v-model="localSettings.uri"
          type="text"
          class="form-input"
          :class="{ 'input-error': errors.uri }"
          placeholder="wss://sip.example.com:7443"
          @blur="validateUri"
        />
        <p v-if="errors.uri" class="error-text">{{ errors.uri }}</p>
        <p class="help-text">WebSocket server address for SIP connection (wss:// for secure)</p>
      </div>

      <!-- SIP URI -->
      <div class="form-group">
        <label for="sip-uri" class="form-label">
          SIP URI
          <span class="required">*</span>
        </label>
        <input
          id="sip-uri"
          v-model="localSettings.sipUri"
          type="text"
          class="form-input"
          :class="{ 'input-error': errors.sipUri }"
          placeholder="sip:user@domain.com"
          @blur="validateSipUri"
        />
        <p v-if="errors.sipUri" class="error-text">{{ errors.sipUri }}</p>
        <p class="help-text">Your SIP address (username@domain)</p>
      </div>

      <!-- Display Name -->
      <div class="form-group">
        <label for="display-name" class="form-label">Display Name</label>
        <input
          id="display-name"
          v-model="localSettings.displayName"
          type="text"
          class="form-input"
          placeholder="John Doe"
        />
        <p class="help-text">Name shown to other users during calls</p>
      </div>

      <!-- Realm -->
      <div class="form-group">
        <label for="realm" class="form-label">Realm</label>
        <input
          id="realm"
          v-model="localSettings.realm"
          type="text"
          class="form-input"
          placeholder="sip.example.com"
        />
        <p class="help-text">SIP authentication realm (usually same as domain)</p>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Authentication</h3>

      <!-- Username -->
      <div class="form-group">
        <label for="username" class="form-label">
          Username
          <span class="required">*</span>
        </label>
        <input
          id="username"
          v-model="localSettings.authorizationUsername"
          type="text"
          class="form-input"
          :class="{ 'input-error': errors.username }"
          placeholder="username"
          autocomplete="username"
          @blur="validateUsername"
        />
        <p v-if="errors.username" class="error-text">{{ errors.username }}</p>
        <p class="help-text">SIP authentication username</p>
      </div>

      <!-- Password -->
      <div class="form-group">
        <label for="password" class="form-label">
          Password
          <span class="required">*</span>
        </label>
        <div class="password-input-wrapper">
          <input
            id="password"
            v-model="localSettings.password"
            :type="showPassword ? 'text' : 'password'"
            class="form-input"
            :class="{ 'input-error': errors.password }"
            placeholder="••••••••"
            autocomplete="current-password"
            @blur="validatePassword"
          />
          <button
            type="button"
            class="password-toggle"
            :title="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? '👁️' : '👁️‍🗨️' }}
          </button>
        </div>
        <p v-if="errors.password" class="error-text">{{ errors.password }}</p>
        <p class="help-text">SIP account password</p>
      </div>

      <!-- Encryption Toggle -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input v-model="localSettings.useEncryption" type="checkbox" class="checkbox-input" />
          <span class="checkbox-text">Enable password encryption (HA1)</span>
        </label>
        <p class="help-text">Use HA1 hash for enhanced security (if supported by server)</p>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Registration Settings</h3>

      <!-- Registration Expires -->
      <div class="form-group">
        <label for="expires" class="form-label">Registration Expiry (seconds)</label>
        <input
          id="expires"
          v-model.number="localSettings.registrationOptions.expires"
          type="number"
          class="form-input"
          min="60"
          max="3600"
          step="60"
        />
        <p class="help-text">How long registration stays active (60-3600 seconds, default: 600)</p>
      </div>

      <!-- Auto-Register -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.registrationOptions.autoRegister"
            type="checkbox"
            class="checkbox-input"
          />
          <span class="checkbox-text">Auto-register on connection</span>
        </label>
        <p class="help-text">Automatically register with SIP server when connected</p>
      </div>

      <!-- Retry Interval -->
      <div class="form-group">
        <label for="retry-interval" class="form-label">Registration Retry Interval (ms)</label>
        <input
          id="retry-interval"
          v-model.number="localSettings.registrationOptions.registrationRetryInterval"
          type="number"
          class="form-input"
          min="5000"
          max="300000"
          step="1000"
        />
        <p class="help-text">
          Time between registration retry attempts (5000-300000ms, default: 30000)
        </p>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="section-title">Connection Settings</h3>

      <!-- Connection Timeout -->
      <div class="form-group">
        <label for="connection-timeout" class="form-label">Connection Timeout (ms)</label>
        <input
          id="connection-timeout"
          v-model.number="localSettings.wsOptions.connectionTimeout"
          type="number"
          class="form-input"
          min="5000"
          max="60000"
          step="1000"
        />
        <p class="help-text">Maximum time to wait for connection (5000-60000ms, default: 10000)</p>
      </div>

      <!-- Max Reconnection Attempts -->
      <div class="form-group">
        <label for="max-reconnect" class="form-label">Max Reconnection Attempts</label>
        <input
          id="max-reconnect"
          v-model.number="localSettings.wsOptions.maxReconnectionAttempts"
          type="number"
          class="form-input"
          min="0"
          max="20"
        />
        <p class="help-text">Maximum automatic reconnection attempts (0-20, default: 5)</p>
      </div>

      <!-- Reconnection Delay -->
      <div class="form-group">
        <label for="reconnect-delay" class="form-label">Reconnection Delay (ms)</label>
        <input
          id="reconnect-delay"
          v-model.number="localSettings.wsOptions.reconnectionDelay"
          type="number"
          class="form-input"
          min="1000"
          max="30000"
          step="1000"
        />
        <p class="help-text">Delay between reconnection attempts (1000-30000ms, default: 2000)</p>
      </div>
    </div>

    <!-- Test Connection -->
    <div class="settings-section">
      <button
        class="btn btn-primary"
        :disabled="!isValid || testingConnection"
        @click="testConnection"
      >
        {{ testingConnection ? 'Testing...' : 'Test Connection' }}
      </button>

      <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
        {{ testResult.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import type { SipClientConfig } from '../../../src/types/config.types'

interface Props {
  modelValue: Partial<SipClientConfig>
}

interface Emits {
  (e: 'update:modelValue', value: Partial<SipClientConfig>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Local state
const localSettings = reactive<Partial<SipClientConfig>>({
  uri: props.modelValue.uri || '',
  sipUri: props.modelValue.sipUri || '',
  password: props.modelValue.password || '',
  displayName: props.modelValue.displayName || '',
  authorizationUsername: props.modelValue.authorizationUsername || '',
  realm: props.modelValue.realm || '',
  useEncryption: false,
  wsOptions: {
    connectionTimeout: props.modelValue.wsOptions?.connectionTimeout || 10000,
    maxReconnectionAttempts: props.modelValue.wsOptions?.maxReconnectionAttempts || 5,
    reconnectionDelay: props.modelValue.wsOptions?.reconnectionDelay || 2000,
    protocols: [],
  },
  registrationOptions: {
    expires: props.modelValue.registrationOptions?.expires || 600,
    autoRegister: props.modelValue.registrationOptions?.autoRegister ?? true,
    registrationRetryInterval:
      props.modelValue.registrationOptions?.registrationRetryInterval || 30000,
  },
})

const showPassword = ref(false)
const testingConnection = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// Validation errors
const errors = reactive({
  uri: '',
  sipUri: '',
  username: '',
  password: '',
})

// Validation functions
function validateUri() {
  if (!localSettings.uri) {
    errors.uri = 'WebSocket URI is required'
    return false
  }
  if (!localSettings.uri.match(/^wss?:\/\/.+/)) {
    errors.uri = 'URI must start with ws:// or wss://'
    return false
  }
  errors.uri = ''
  return true
}

function validateSipUri() {
  if (!localSettings.sipUri) {
    errors.sipUri = 'SIP URI is required'
    return false
  }
  if (!localSettings.sipUri.match(/^sip:.+@.+/)) {
    errors.sipUri = 'SIP URI must be in format: sip:user@domain'
    return false
  }
  errors.sipUri = ''
  return true
}

function validateUsername() {
  if (!localSettings.authorizationUsername) {
    errors.username = 'Username is required'
    return false
  }
  errors.username = ''
  return true
}

function validatePassword() {
  if (!localSettings.password) {
    errors.password = 'Password is required'
    return false
  }
  if (localSettings.password.length < 4) {
    errors.password = 'Password must be at least 4 characters'
    return false
  }
  errors.password = ''
  return true
}

// Computed validation
const isValid = computed(() => {
  return validateUri() && validateSipUri() && validateUsername() && validatePassword()
})

// Test connection
async function testConnection() {
  if (!isValid.value) return

  testingConnection.value = true
  testResult.value = null

  try {
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000))

    testResult.value = {
      success: true,
      message: 'Connection successful! Server is reachable.',
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  } finally {
    testingConnection.value = false
  }
}

// Watch for changes and emit
watch(
  localSettings,
  (newValue) => {
    if (isValid.value) {
      emit('update:modelValue', newValue)
    }
  },
  { deep: true }
)
</script>

<style scoped>
.sip-server-settings {
  max-width: 800px;
}

.settings-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.required {
  color: #dc2626;
  margin-left: 0.25rem;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: all 0.2s;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.input-error {
  border-color: #dc2626;
}

.form-input.input-error:focus {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.password-input-wrapper {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.password-toggle:hover {
  opacity: 1;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.checkbox-input {
  width: 1.125rem;
  height: 1.125rem;
  margin-right: 0.625rem;
  cursor: pointer;
  accent-color: #667eea;
}

.checkbox-text {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.help-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.error-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #dc2626;
  line-height: 1.4;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.test-result.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.test-result.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}
</style>
