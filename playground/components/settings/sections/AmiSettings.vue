<template>
  <div class="ami-settings">
    <div class="settings-section">
      <h3 class="section-title">AMI Connection</h3>
      <p class="section-description">
        Configure Asterisk Manager Interface (AMI) connection for advanced call management features.
      </p>

      <!-- Enable AMI -->
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localSettings.enabled"
            type="checkbox"
            class="checkbox-input"
            @change="emit('update:settings', localSettings)"
          />
          <span class="checkbox-text">Enable AMI Connection</span>
        </label>
        <p class="help-text">
          Enable to access queue monitoring, supervisor features, and advanced call control
        </p>
      </div>
    </div>

    <template v-if="localSettings.enabled">
      <div class="settings-section">
        <h3 class="section-title">Server Configuration</h3>

        <!-- WebSocket URL -->
        <div class="form-group">
          <label for="ami-url" class="form-label">
            WebSocket URL
            <span class="required">*</span>
          </label>
          <input
            id="ami-url"
            v-model="localSettings.url"
            type="text"
            class="form-input"
            :class="{ 'input-error': errors.url }"
            placeholder="ws://pbx.example.com:8080 or wss://pbx.example.com:8443"
            @blur="validateUrl"
            @input="emit('update:settings', localSettings)"
          />
          <p v-if="errors.url" class="error-text">{{ errors.url }}</p>
          <p class="help-text">WebSocket URL to AMI proxy (use wss:// for secure connections)</p>
        </div>

        <!-- Username -->
        <div class="form-group">
          <label for="ami-username" class="form-label">
            Username
            <span class="required">*</span>
          </label>
          <input
            id="ami-username"
            v-model="localSettings.username"
            type="text"
            class="form-input"
            :class="{ 'input-error': errors.username }"
            placeholder="admin"
            autocomplete="username"
            @blur="validateUsername"
            @input="emit('update:settings', localSettings)"
          />
          <p v-if="errors.username" class="error-text">{{ errors.username }}</p>
          <p class="help-text">AMI authentication username</p>
        </div>

        <!-- Password -->
        <div class="form-group">
          <label for="ami-password" class="form-label">
            Password
            <span class="required">*</span>
          </label>
          <div class="password-input-wrapper">
            <input
              id="ami-password"
              v-model="localSettings.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'input-error': errors.password }"
              placeholder="••••••••"
              autocomplete="current-password"
              @blur="validatePassword"
              @input="emit('update:settings', localSettings)"
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
          <p class="help-text">AMI secret from manager.conf</p>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="section-title">Connection Settings</h3>

        <!-- Auto-Reconnect -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              v-model="localSettings.autoReconnect"
              type="checkbox"
              class="checkbox-input"
              @change="emit('update:settings', localSettings)"
            />
            <span class="checkbox-text">Auto-reconnect on disconnect</span>
          </label>
          <p class="help-text">Automatically reconnect if connection is lost</p>
        </div>

        <!-- Reconnect Delay -->
        <div class="form-group" :class="{ disabled: !localSettings.autoReconnect }">
          <label for="ami-reconnect-delay" class="form-label"> Reconnect Delay (ms) </label>
          <input
            id="ami-reconnect-delay"
            v-model.number="localSettings.reconnectDelay"
            type="number"
            class="form-input"
            min="1000"
            max="30000"
            step="1000"
            :disabled="!localSettings.autoReconnect"
            @input="emit('update:settings', localSettings)"
          />
          <p class="help-text">Delay between reconnection attempts (1-30 seconds)</p>
        </div>

        <!-- Max Reconnect Attempts -->
        <div class="form-group" :class="{ disabled: !localSettings.autoReconnect }">
          <label for="ami-max-attempts" class="form-label"> Max Reconnect Attempts </label>
          <input
            id="ami-max-attempts"
            v-model.number="localSettings.maxReconnectAttempts"
            type="number"
            class="form-input"
            min="0"
            max="100"
            :disabled="!localSettings.autoReconnect"
            @input="emit('update:settings', localSettings)"
          />
          <p class="help-text">Maximum reconnection attempts (0 = infinite)</p>
        </div>

        <!-- Connection Timeout -->
        <div class="form-group">
          <label for="ami-timeout" class="form-label"> Connection Timeout (ms) </label>
          <input
            id="ami-timeout"
            v-model.number="localSettings.connectionTimeout"
            type="number"
            class="form-input"
            min="1000"
            max="30000"
            step="1000"
            @input="emit('update:settings', localSettings)"
          />
          <p class="help-text">Maximum time to wait for connection (1-30 seconds)</p>
        </div>
      </div>

      <!-- Info Box -->
      <div class="info-box">
        <h4>📘 About AMI</h4>
        <p>The Asterisk Manager Interface (AMI) provides advanced features:</p>
        <ul>
          <li>Real-time queue monitoring and statistics</li>
          <li>Supervisor features (listen, whisper, barge)</li>
          <li>Call parking and retrieval</li>
          <li>IVR monitoring and control</li>
          <li>Agent login/logout management</li>
          <li>Call recording management</li>
        </ul>
        <p class="note">
          <strong>Note:</strong> Requires amiws proxy (
          <a href="https://github.com/staskobzar/amiws" target="_blank" rel="noopener"
            >github.com/staskobzar/amiws</a
          >
          ) to bridge AMI over WebSocket.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AmiSettings } from '@/stores/settingsStore'

// Props
const props = defineProps<{
  settings: AmiSettings
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:settings', value: AmiSettings): void
}>()

// Local state
const localSettings = ref<AmiSettings>({ ...props.settings })
const showPassword = ref(false)
const errors = ref<Record<string, string>>({})

// Watch for external changes
watch(
  () => props.settings,
  (newSettings) => {
    localSettings.value = { ...newSettings }
  },
  { deep: true }
)

// Validation functions
function validateUrl(): void {
  if (!localSettings.value.url) {
    errors.value.url = 'URL is required when AMI is enabled'
  } else if (
    !localSettings.value.url.startsWith('ws://') &&
    !localSettings.value.url.startsWith('wss://')
  ) {
    errors.value.url = 'URL must start with ws:// or wss://'
  } else {
    delete errors.value.url
  }
}

function validateUsername(): void {
  if (!localSettings.value.username) {
    errors.value.username = 'Username is required when AMI is enabled'
  } else {
    delete errors.value.username
  }
}

function validatePassword(): void {
  if (!localSettings.value.password) {
    errors.value.password = 'Password is required when AMI is enabled'
  } else {
    delete errors.value.password
  }
}
</script>

<style scoped>
.ami-settings {
  max-width: 800px;
}

.settings-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.section-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #0f172a);
}

.section-description {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
}

.required {
  color: var(--danger, #dc2626);
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
  background: var(--bg-primary, white);
  color: var(--text-primary, #0f172a);
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary, #667eea);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input.input-error {
  border-color: var(--danger, #dc2626);
}

.form-input:disabled {
  background: var(--bg-secondary, #f8fafc);
  cursor: not-allowed;
}

.password-input-wrapper {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.password-toggle:hover {
  opacity: 1;
}

.checkbox-group {
  padding: 1rem;
  background: var(--bg-primary, white);
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.checkbox-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: var(--primary, #667eea);
}

.checkbox-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
}

.help-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

.error-text {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: var(--danger, #dc2626);
  font-weight: 500;
}

.info-box {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
}

.info-box h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e40af;
}

.info-box p {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #1e3a8a;
  line-height: 1.6;
}

.info-box ul {
  margin: 0 0 0.75rem 0;
  padding-left: 1.5rem;
  font-size: 0.875rem;
  color: #1e3a8a;
  line-height: 1.6;
}

.info-box .note {
  margin: 1rem 0 0 0;
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  font-size: 0.8125rem;
}

.info-box a {
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
}

.info-box a:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 640px) {
  .settings-section {
    padding: 1rem;
  }

  .form-input {
    font-size: 16px; /* Prevents zoom on mobile */
  }
}
</style>
