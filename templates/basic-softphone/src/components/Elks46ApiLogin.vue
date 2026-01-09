<script setup lang="ts">
import { ref, computed } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import { use46ElksApi } from 'vuesip'

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

// Form validation
const isLoginFormValid = computed(
  () => apiUsername.value.trim().length > 0 && apiPassword.value.trim().length > 0
)

// Handle API login
async function handleLogin() {
  const success = await authenticate(apiUsername.value, apiPassword.value)
  if (!success) {
    // Error is set by the composable
  }
}

// Handle number selection
async function handleNumberSelect(num: { number: string; active: string; secret?: string }) {
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

.flex-1 {
  flex: 1;
}
</style>
