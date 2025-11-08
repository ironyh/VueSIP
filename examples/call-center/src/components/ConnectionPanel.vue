<template>
  <div class="connection-panel">
    <form @submit.prevent="handleConnect" aria-label="Call center login form">
      <div class="form-group">
        <label for="server">
          SIP Server
          <span aria-label="required" class="required-indicator">*</span>
        </label>
        <input
          id="server"
          v-model="config.server"
          type="text"
          placeholder="sip.example.com"
          required
          aria-required="true"
          :aria-invalid="error && !config.server ? 'true' : 'false'"
          aria-describedby="server-hint"
        />
        <span id="server-hint" class="sr-only">Enter the SIP server domain name</span>
      </div>

      <div class="form-group">
        <label for="username">
          Username (Extension)
          <span aria-label="required" class="required-indicator">*</span>
        </label>
        <input
          id="username"
          v-model="config.username"
          type="text"
          placeholder="1001"
          required
          aria-required="true"
          :aria-invalid="error && !config.username ? 'true' : 'false'"
          aria-describedby="username-hint"
        />
        <span id="username-hint" class="sr-only">Enter your extension number or username</span>
      </div>

      <div class="form-group">
        <label for="password">
          Password
          <span aria-label="required" class="required-indicator">*</span>
        </label>
        <input
          id="password"
          v-model="config.password"
          type="password"
          placeholder="Enter password"
          required
          aria-required="true"
          :aria-invalid="error && !config.password ? 'true' : 'false'"
          aria-describedby="password-hint"
        />
        <span id="password-hint" class="sr-only">Enter your password</span>
      </div>

      <div class="form-group">
        <label for="displayName">
          Agent Name
          <span aria-label="required" class="required-indicator">*</span>
        </label>
        <input
          id="displayName"
          v-model="config.displayName"
          type="text"
          placeholder="Agent Smith"
          required
          aria-required="true"
          :aria-invalid="error && !config.displayName ? 'true' : 'false'"
          aria-describedby="displayName-hint"
        />
        <span id="displayName-hint" class="sr-only">Enter your agent display name</span>
      </div>

      <div v-if="error" class="error-message" role="alert" aria-live="assertive" id="connection-error">
        {{ error }}
      </div>

      <button type="submit" class="btn btn-primary" :disabled="isConnecting" :aria-busy="isConnecting">
        {{ isConnecting ? 'Connecting...' : 'Connect to Call Center' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSipClient } from 'vuesip'

// ============================================================================
// State
// ============================================================================

const config = ref({
  server: 'sip.example.com',
  username: '',
  password: '',
  displayName: '',
})

const error = ref<string | null>(null)

// ============================================================================
// SIP Client
// ============================================================================

const { connect, isConnecting } = useSipClient()

// ============================================================================
// Methods
// ============================================================================

const handleConnect = async () => {
  try {
    error.value = null

    // Validate config
    if (!config.value.server || !config.value.username || !config.value.password) {
      error.value = 'Please fill in all required fields'
      return
    }

    // Validate SIP server format
    const serverPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!serverPattern.test(config.value.server)) {
      error.value = 'Invalid server address format'
      return
    }

    // Connect with config
    await connect({
      server: `wss://${config.value.server}`,
      username: config.value.username,
      password: config.value.password,
      displayName: config.value.displayName || config.value.username,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Connection failed'
    console.error('Connection failed:', err)
  }
}
</script>

<style scoped>
/* Screen Reader Only */
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

.connection-panel {
  width: 100%;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-of-type {
  margin-bottom: 2rem;
}

.required-indicator {
  color: #ef4444;
  margin-left: 0.25rem;
  font-weight: 600;
}

.error-message {
  padding: 0.75rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.btn {
  width: 100%;
}
</style>
