<template>
  <div
    class="card connection-panel"
    role="region"
    aria-labelledby="connection-heading"
  >
    <h2 id="connection-heading">SIP Connection</h2>

    <div
      class="status-section"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>Status:</span>
      <span
        v-if="isRegistered"
        class="status-badge status-connected"
        aria-label="Connection status: registered"
      >
        <span aria-hidden="true">✓</span> Registered
      </span>
      <span
        v-else-if="isConnected"
        class="status-badge status-connecting"
        aria-label="Connection status: connecting"
      >
        <span aria-hidden="true">⋯</span> Connecting...
      </span>
      <span
        v-else
        class="status-badge status-disconnected"
        aria-label="Connection status: disconnected"
      >
        <span aria-hidden="true">✗</span> Disconnected
      </span>
    </div>

    <form
      v-if="!isConnected"
      @submit.prevent="$emit('connect')"
      class="connection-form"
      aria-label="SIP connection form"
    >
      <div class="form-group">
        <label for="server">
          SIP Server (WebSocket URL)
          <abbr title="required" aria-label="required">*</abbr>
        </label>
        <input
          id="server"
          :value="server"
          @input="$emit('update:server', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="wss://sip.example.com:7443"
          required
          aria-required="true"
          autocomplete="url"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="username">
            Username
            <abbr title="required" aria-label="required">*</abbr>
          </label>
          <input
            id="username"
            :value="username"
            @input="$emit('update:username', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="1000"
            required
            aria-required="true"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">
            Password
            <abbr title="required" aria-label="required">*</abbr>
          </label>
          <input
            id="password"
            :value="password"
            @input="$emit('update:password', ($event.target as HTMLInputElement).value)"
            type="password"
            placeholder="Enter password"
            required
            aria-required="true"
            autocomplete="current-password"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="displayName">Display Name (Optional)</label>
        <input
          id="displayName"
          :value="displayName"
          @input="$emit('update:displayName', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Your Name"
          autocomplete="name"
        />
      </div>

      <button
        type="submit"
        class="primary connect-btn"
        aria-label="Connect to SIP server"
      >
        Connect to SIP Server
      </button>
    </form>

    <div v-else class="connected-info">
      <dl class="connection-details">
        <dt>Server:</dt>
        <dd>{{ server }}</dd>
        <dt>Username:</dt>
        <dd>{{ username }}</dd>
        <dt>Display Name:</dt>
        <dd>{{ displayName || '(Not set)' }}</dd>
      </dl>

      <button
        @click="$emit('disconnect')"
        class="danger disconnect-btn"
        aria-label="Disconnect from SIP server"
      >
        Disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Connection Panel Component
 *
 * Handles SIP server connection configuration and status display.
 * Users must connect before they can create or join conferences.
 */

interface Props {
  server: string
  username: string
  password: string
  displayName: string
  isConnected: boolean
  isRegistered: boolean
}

interface Emits {
  (e: 'update:server', value: string): void
  (e: 'update:username', value: string): void
  (e: 'update:password', value: string): void
  (e: 'update:displayName', value: string): void
  (e: 'connect'): void
  (e: 'disconnect'): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.connection-panel {
  margin-bottom: 2rem;
}

.status-section {
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.connect-btn,
.disconnect-btn {
  margin-top: 1rem;
  width: 100%;
}

.connected-info {
  margin-top: 1rem;
}

.connection-details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
  margin-bottom: 1rem;
}

.connection-details dt {
  font-weight: 600;
  text-align: right;
}

.connection-details dd {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
}

@media (prefers-color-scheme: light) {
  .connection-details dd {
    color: rgba(0, 0, 0, 0.8);
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .connection-details {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }

  .connection-details dt {
    text-align: left;
    font-size: 0.9rem;
    opacity: 0.8;
  }
}
</style>
