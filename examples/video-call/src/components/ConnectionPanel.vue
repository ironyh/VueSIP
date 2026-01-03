<template>
  <div class="connection-panel" role="region" aria-label="SIP Connection Configuration">
    <div class="panel-header">
      <h2>Connect to SIP Server</h2>
      <p id="form-description">Enter your SIP credentials to start making video calls</p>
    </div>

    <form
      @submit.prevent="handleSubmit"
      class="connection-form"
      aria-describedby="form-description"
    >
      <!-- SIP URI -->
      <div class="form-group">
        <label for="sipUri">
          SIP URI
          <span class="required-indicator" aria-label="required">*</span>
        </label>
        <input
          id="sipUri"
          v-model="formData.sipUri"
          type="text"
          placeholder="sip:user@domain.com"
          required
          aria-required="true"
          aria-describedby="sipUri-hint"
          :disabled="isConnecting"
        />
        <span id="sipUri-hint" class="hint">Your SIP address (e.g., sip:1001@pbx.example.com)</span>
      </div>

      <!-- SIP Password -->
      <div class="form-group">
        <label for="sipPassword">
          Password
          <span class="required-indicator" aria-label="required">*</span>
        </label>
        <input
          id="sipPassword"
          v-model="formData.sipPassword"
          type="password"
          placeholder="Enter password"
          required
          aria-required="true"
          :disabled="isConnecting"
        />
      </div>

      <!-- WebSocket Server -->
      <div class="form-group">
        <label for="wsServer">
          WebSocket Server
          <span class="required-indicator" aria-label="required">*</span>
        </label>
        <input
          id="wsServer"
          v-model="formData.wsServer"
          type="text"
          placeholder="wss://pbx.example.com:8089/ws"
          required
          aria-required="true"
          aria-describedby="wsServer-hint"
          :disabled="isConnecting"
        />
        <span id="wsServer-hint" class="hint">WebSocket URL (must start with ws:// or wss://)</span>
      </div>

      <!-- Display Name (Optional) -->
      <div class="form-group">
        <label for="displayName">Display Name (Optional)</label>
        <input
          id="displayName"
          v-model="formData.displayName"
          type="text"
          placeholder="Your Name"
          aria-describedby="displayName-hint"
          :disabled="isConnecting"
        />
        <span id="displayName-hint" class="hint sr-only"
        >Optional field for your display name during calls</span
        >
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message" role="alert" aria-live="assertive">
        <span class="error-icon" aria-hidden="true">⚠️</span>
        {{ error }}
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="submit-button"
        :disabled="isConnecting"
        :aria-label="isConnecting ? 'Connecting to SIP server' : 'Connect to SIP server'"
      >
        <span v-if="!isConnecting">Connect</span>
        <span v-else class="loading" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          Connecting...
        </span>
      </button>
    </form>

    <!-- Info Box -->
    <div class="info-box" role="complementary" aria-labelledby="requirements-heading">
      <h3 id="requirements-heading"><span aria-hidden="true">📋</span> Requirements</h3>
      <ul>
        <li>A SIP account with video calling support</li>
        <li>WebRTC-compatible SIP server (e.g., Asterisk with WebRTC)</li>
        <li>Camera and microphone permissions</li>
        <li>Modern browser (Chrome, Firefox, Safari, or Edge)</li>
      </ul>
    </div>

    <!-- Example Credentials -->
    <div class="example-box" role="complementary" aria-labelledby="example-heading">
      <h3 id="example-heading"><span aria-hidden="true">💡</span> Example Configuration</h3>
      <div class="example-code" role="group" aria-label="Example SIP credentials">
        <div class="code-line">
          <span class="code-label">SIP URI:</span>
          <code>sip:1001@pbx.example.com</code>
        </div>
        <div class="code-line">
          <span class="code-label">Password:</span>
          <code>your_password</code>
        </div>
        <div class="code-line">
          <span class="code-label">WebSocket:</span>
          <code>wss://pbx.example.com:8089/ws</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

// ============================================================================
// Props
// ============================================================================

interface Props {
  isConnecting?: boolean
  error?: string | null
}

withDefaults(defineProps<Props>(), {
  isConnecting: false,
  error: null,
})

// ============================================================================
// Events
// ============================================================================

interface Emits {
  (
    e: 'connect',
    config: {
      sipUri: string
      sipPassword: string
      wsServer: string
      displayName?: string
    }
  ): void
}

const emit = defineEmits<Emits>()

// ============================================================================
// Form Data
// ============================================================================

const formData = reactive({
  sipUri: '',
  sipPassword: '',
  wsServer: '',
  displayName: '',
})

// ============================================================================
// Methods
// ============================================================================

/**
 * Handle form submission
 */
function handleSubmit() {
  emit('connect', {
    sipUri: formData.sipUri,
    sipPassword: formData.sipPassword,
    wsServer: formData.wsServer,
    displayName: formData.displayName || undefined,
  })
}
</script>

<style scoped>
/* ============================================================================
   Connection Panel
   ============================================================================ */

.connection-panel {
  max-width: 600px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.panel-header {
  text-align: center;
  margin-bottom: 30px;
}

.panel-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 10px;
}

.panel-header p {
  color: #666;
  font-size: 16px;
}

/* ============================================================================
   Form
   ============================================================================ */

.connection-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
  background: white;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background: #f9fafb;
  cursor: not-allowed;
}

.hint {
  font-size: 13px;
  color: #6b7280;
}

.required-indicator {
  color: #dc2626;
  margin-left: 4px;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ============================================================================
   Error Message
   ============================================================================ */

.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

.error-icon {
  font-size: 18px;
}

/* ============================================================================
   Submit Button
   ============================================================================ */

.submit-button {
  padding: 14px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============================================================================
   Info Box
   ============================================================================ */

.info-box {
  margin-top: 30px;
  padding: 20px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
}

.info-box h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0c4a6e;
  margin-bottom: 12px;
}

.info-box ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.info-box li {
  padding: 6px 0;
  color: #0c4a6e;
  font-size: 14px;
  padding-left: 20px;
  position: relative;
}

.info-box li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #0ea5e9;
  font-weight: bold;
}

/* ============================================================================
   Example Box
   ============================================================================ */

.example-box {
  margin-top: 20px;
  padding: 20px;
  background: #fefce8;
  border: 1px solid #fde047;
  border-radius: 8px;
}

.example-box h3 {
  font-size: 16px;
  font-weight: 600;
  color: #713f12;
  margin-bottom: 12px;
}

.example-code {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-line {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 13px;
}

.code-label {
  font-weight: 600;
  color: #713f12;
  min-width: 90px;
}

.code-line code {
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #854d0e;
}

/* ============================================================================
   Responsive
   ============================================================================ */

@media (max-width: 640px) {
  .connection-panel {
    padding: 24px;
  }

  .panel-header h2 {
    font-size: 24px;
  }

  .code-line {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .code-label {
    min-width: auto;
  }
}
</style>
