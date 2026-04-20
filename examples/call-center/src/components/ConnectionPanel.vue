<template>
  <div class="connection-panel">
    <form v-if="!isConnected" @submit.prevent="handleConnect" aria-label="Call center login form">
      <div class="form-group">
        <label for="server">
          SIP Server
          <span aria-label="required" class="required-indicator">*</span>
        </label>
        <input
          id="server"
          v-model="form.server"
          type="text"
          placeholder="sip.example.com"
          required
          aria-required="true"
          :aria-invalid="error && !form.server ? 'true' : 'false'"
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
          v-model="form.username"
          type="text"
          placeholder="1001"
          required
          aria-required="true"
          :aria-invalid="error && !form.username ? 'true' : 'false'"
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
          v-model="form.password"
          type="password"
          placeholder="Enter password"
          required
          aria-required="true"
          :aria-invalid="error && !form.password ? 'true' : 'false'"
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
          v-model="form.displayName"
          type="text"
          placeholder="Agent Smith"
          required
          aria-required="true"
          :aria-invalid="error && !form.displayName ? 'true' : 'false'"
          aria-describedby="displayName-hint"
        />
        <span id="displayName-hint" class="sr-only">Enter your agent display name</span>
      </div>

      <div
        v-if="error"
        class="error-message"
        role="alert"
        aria-live="assertive"
        id="connection-error"
      >
        {{ error }}
      </div>

      <button
        type="submit"
        class="btn btn-primary"
        :disabled="isConnecting"
        :aria-busy="isConnecting"
      >
        {{ isConnecting ? 'Connecting...' : 'Connect to Call Center' }}
      </button>
    </form>

    <div v-else class="connection-status" role="status" aria-live="polite">
      <div style="margin-bottom: 1rem">
        <span class="badge success">Connected</span>
        <span v-if="isRegistered" class="badge success" style="margin-left: 0.5rem"
          >Registered</span
        >
        <span v-else class="badge warning" style="margin-left: 0.5rem">Registering...</span>
      </div>

      <div style="margin-bottom: 1rem">
        <p><strong>Server:</strong> {{ form.server }}</p>
        <p><strong>Agent:</strong> {{ form.displayName || form.username }}</p>
      </div>

      <button type="button" class="btn btn-danger" @click="$emit('disconnect')">Disconnect</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

defineProps<{
  isConnected: boolean
  isRegistered: boolean
  isConnecting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  connect: [
    config: {
      server: string
      username: string
      password: string
      displayName: string
    },
  ]
  disconnect: []
}>()

const form = reactive({
  server: 'sip.example.com',
  username: '',
  password: '',
  displayName: '',
})

const handleConnect = () => {
  emit('connect', {
    server: form.server,
    username: form.username,
    password: form.password,
    displayName: form.displayName,
  })
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

.connection-status {
  padding-top: 0.5rem;
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
