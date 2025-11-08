<template>
  <div class="app">
    <!-- Skip Navigation Links -->
    <nav class="skip-links" aria-label="Skip navigation">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#connection-panel" class="skip-link">Skip to connection</a>
      <a href="#participant-list" class="skip-link" v-if="isRegistered">Skip to participants</a>
      <a href="#conference-controls" class="skip-link" v-if="isRegistered">Skip to conference controls</a>
    </nav>

    <h1>VueSip Conference Call Example</h1>
    <p class="subtitle">
      Multi-party conference calling with participant management
    </p>

    <!-- Global Error Announcements -->
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      class="sr-only"
      v-if="errorMessage"
    >
      {{ errorMessage }}
    </div>

    <!-- Connection Panel -->
    <ConnectionPanel
      id="connection-panel"
      v-model:server="config.server"
      v-model:username="config.username"
      v-model:password="config.password"
      v-model:display-name="config.displayName"
      :is-connected="isConnected"
      :is-registered="isRegistered"
      @connect="handleConnect"
      @disconnect="handleDisconnect"
    />

    <!-- Conference Room (only shown when connected) -->
    <ConferenceRoom
      id="main-content"
      v-if="isRegistered"
      :sip-client="sipClient"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { SipClient } from 'vuesip'
import type { SipClientConfig } from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import ConferenceRoom from './components/ConferenceRoom.vue'

// SIP Configuration
const config = ref<SipClientConfig>({
  server: 'wss://sip.example.com:7443',
  username: '',
  password: '',
  displayName: 'Conference Moderator',
})

// SIP Client
const sipClient = ref<SipClient | null>(null)
const isConnected = ref(false)
const isRegistered = ref(false)

// Error handling for accessibility
const errorMessage = ref('')

// Store event listener cleanup functions
const eventCleanupFunctions: Array<() => void> = []

/**
 * Handle errors and announce them to screen readers
 */
const handleError = (error: string) => {
  errorMessage.value = error
  // Clear error message after 5 seconds
  setTimeout(() => {
    errorMessage.value = ''
  }, 5000)
}

/**
 * Connect to SIP server
 */
const handleConnect = async () => {
  try {
    console.log('Connecting to SIP server...')

    // Clean up any existing listeners
    cleanupEventListeners()

    // Create SIP client
    sipClient.value = new SipClient(config.value)

    // Listen to connection events and store cleanup functions
    const onConnected = () => {
      console.log('Connected to SIP server')
      isConnected.value = true
    }
    sipClient.value.on('connected', onConnected)
    eventCleanupFunctions.push(() => sipClient.value?.off('connected', onConnected))

    const onRegistered = () => {
      console.log('Registered with SIP server')
      isRegistered.value = true
    }
    sipClient.value.on('registered', onRegistered)
    eventCleanupFunctions.push(() => sipClient.value?.off('registered', onRegistered))

    const onDisconnected = () => {
      console.log('Disconnected from SIP server')
      isConnected.value = false
      isRegistered.value = false
    }
    sipClient.value.on('disconnected', onDisconnected)
    eventCleanupFunctions.push(() => sipClient.value?.off('disconnected', onDisconnected))

    const onRegistrationFailed = (error: Error) => {
      console.error('Registration failed:', error)
      alert(`Registration failed: ${error.message}`)
    }
    sipClient.value.on('registrationFailed', onRegistrationFailed)
    eventCleanupFunctions.push(() => sipClient.value?.off('registrationFailed', onRegistrationFailed))

    // Start the client
    await sipClient.value.start()
  } catch (error) {
    console.error('Failed to connect:', error)
    alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Clean up event listeners
 */
const cleanupEventListeners = () => {
  eventCleanupFunctions.forEach(cleanup => cleanup())
  eventCleanupFunctions.length = 0
}

/**
 * Disconnect from SIP server
 */
const handleDisconnect = async () => {
  try {
    // Clean up event listeners first
    cleanupEventListeners()

    if (sipClient.value) {
      await sipClient.value.stop()
      sipClient.value = null
    }
    isConnected.value = false
    isRegistered.value = false
  } catch (error) {
    console.error('Failed to disconnect:', error)
  }
}

/**
 * Clean up on component unmount
 */
onUnmounted(async () => {
  await handleDisconnect()
})
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

/* Skip Navigation Links */
.skip-links {
  position: relative;
}

.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #646cff;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  z-index: 1000;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 10px;
}

.skip-link:not(:focus) {
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

@media (prefers-color-scheme: light) {
  .subtitle {
    color: rgba(0, 0, 0, 0.6);
  }
}
</style>

<style>
/* Global accessibility utilities (not scoped) */
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
</style>
