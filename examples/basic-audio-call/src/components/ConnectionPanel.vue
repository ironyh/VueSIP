<template>
  <div class="card">
    <h2>SIP Connection</h2>

    <!-- Connection Form -->
    <form v-if="!isConnected" @submit.prevent="handleConnect">
      <div class="form-group">
        <label for="websocket-uri">WebSocket URI</label>
        <input
          id="websocket-uri"
          v-model="form.uri"
          type="text"
          placeholder="wss://sip.example.com:7443"
          required
        />
        <p class="info-message">
          Your SIP server WebSocket URI (e.g., wss://sip.example.com:7443)
        </p>
      </div>

      <div class="form-group">
        <label for="sip-uri">SIP URI</label>
        <input
          id="sip-uri"
          v-model="form.sipUri"
          type="text"
          placeholder="sip:1000@example.com"
          required
        />
        <p class="info-message">
          Your SIP address (e.g., sip:1000@example.com)
        </p>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          placeholder="Your SIP password"
          required
        />
      </div>

      <div class="form-group">
        <label for="display-name">Display Name (Optional)</label>
        <input
          id="display-name"
          v-model="form.displayName"
          type="text"
          placeholder="John Doe"
        />
      </div>

      <button type="submit" class="primary" :disabled="connecting">
        {{ connecting ? 'Connecting...' : 'Connect' }}
      </button>

      <p v-if="error" class="error-message">{{ error }}</p>
    </form>

    <!-- Connection Status -->
    <div v-else class="connection-status">
      <div style="margin-bottom: 1rem">
        <span class="badge success">Connected</span>
        <span v-if="isRegistered" class="badge success" style="margin-left: 0.5rem">
          Registered
        </span>
        <span v-else class="badge warning" style="margin-left: 0.5rem">
          Registering...
        </span>
      </div>

      <div style="margin-bottom: 1rem">
        <p><strong>SIP URI:</strong> {{ form.sipUri }}</p>
        <p v-if="form.displayName"><strong>Display Name:</strong> {{ form.displayName }}</p>
      </div>

      <button @click="handleDisconnect" class="danger">
        Disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

/**
 * Props for the ConnectionPanel component
 */
interface Props {
  isConnected: boolean
  isRegistered: boolean
  connecting: boolean
  error: string
}

defineProps<Props>()

/**
 * Events emitted by the ConnectionPanel component
 */
const emit = defineEmits<{
  connect: [config: {
    uri: string
    sipUri: string
    password: string
    displayName?: string
  }]
  disconnect: []
}>()

/**
 * Form data for SIP connection
 */
const form = reactive({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:1000@example.com',
  password: '',
  displayName: '',
})

/**
 * Handle connection form submission
 */
const handleConnect = () => {
  emit('connect', {
    uri: form.uri,
    sipUri: form.sipUri,
    password: form.password,
    displayName: form.displayName || undefined,
  })
}

/**
 * Handle disconnection
 */
const handleDisconnect = () => {
  emit('disconnect')
}
</script>

<style scoped>
.connection-status {
  padding: 1rem 0;
}

.connection-status p {
  margin-bottom: 0.5rem;
  color: var(--gray-700);
}
</style>
