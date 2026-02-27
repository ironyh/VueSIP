<template>
  <div id="app" data-testid="sip-client">
    <div class="container">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <h1 style="margin: 0">VueSip - SIP Interface</h1>
        <button
          class="btn btn-secondary"
          data-testid="settings-button"
          @click="showSettings = !showSettings"
        >
          ⚙️ Settings
        </button>
      </div>

      <!-- Settings Panel -->
      <div v-if="showSettings" class="settings-panel" data-testid="settings-panel">
        <h2>SIP Settings</h2>
        <div class="form-group">
          <label>SIP URI (Username):</label>
          <input
            v-model="config.username"
            type="text"
            data-testid="sip-uri-input"
            placeholder="sip:user@example.com"
          />
        </div>
        <div class="form-group">
          <label>Password:</label>
          <input
            v-model="config.password"
            type="password"
            data-testid="password-input"
            placeholder="password"
          />
        </div>
        <div class="form-group">
          <label>Server URI:</label>
          <input
            v-model="config.server"
            type="text"
            data-testid="server-uri-input"
            placeholder="wss://sip.example.com:7443"
          />
        </div>
        <button
          class="btn btn-primary"
          data-testid="save-settings-button"
          @click="showSettings = false"
        >
          Save Settings
        </button>
      </div>

      <!-- Connection Status -->
      <div class="status-bar">
        <div class="status-item">
          <span class="status-label">Connection:</span>
          <span
            :class="['status-indicator', { connected: sipClient?.isConnected }]"
            data-testid="connection-status"
          >
            {{ sipClient?.isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">Registration:</span>
          <span
            :class="['status-indicator', { connected: sipClient?.isRegistered }]"
            data-testid="registration-status"
          >
            {{ sipClient?.isRegistered ? 'Registered' : 'Not Registered' }}
          </span>
        </div>
      </div>

      <!-- Connection Form -->
      <div v-if="!sipClient?.isConnected" class="connection-form">
        <h2>Connect to SIP Server</h2>
        <div class="form-group">
          <label>Server:</label>
          <input
            v-model="config.server"
            type="text"
            placeholder="sip.example.com"
            data-testid="connection-server-input"
          />
        </div>
        <div class="form-group">
          <label>Username:</label>
          <input
            v-model="config.username"
            type="text"
            placeholder="1000"
            data-testid="connection-username-input"
          />
        </div>
        <div class="form-group">
          <label>Password:</label>
          <input
            v-model="config.password"
            type="password"
            placeholder="password"
            data-testid="connection-password-input"
          />
        </div>
        <div class="form-group">
          <label>Display Name:</label>
          <input
            v-model="config.displayName"
            type="text"
            placeholder="John Doe"
            data-testid="connection-displayname-input"
          />
        </div>
        <button
          :disabled="sipClient?.isConnecting"
          class="btn btn-primary"
          data-testid="connect-button"
          @click="handleConnect"
        >
          {{ sipClient?.isConnecting ? 'Connecting...' : 'Connect' }}
        </button>
      </div>

      <!-- Main Interface -->
      <div v-else class="main-interface">
        <div class="row">
          <!-- Call Controls -->
          <div class="col">
            <CallControls
              :current-call="currentCall"
              :incoming-call="incomingCall"
              :is-calling="isCalling"
              @answer="handleAnswer"
              @reject="handleReject"
              @end="handleEnd"
            />
          </div>

          <!-- Dialpad -->
          <div class="col">
            <Dialpad :is-calling="isCalling" @digit="handleDtmf" @call="handleMakeCall" />
          </div>
        </div>

        <!-- Audio Devices -->
        <div class="audio-devices">
          <h3>Audio Settings</h3>
          <div class="form-group">
            <label>Microphone:</label>
            <select v-model="selectedInputDevice" @change="handleInputChange">
              <option
                v-for="device in audioInputDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Speaker:</label>
            <select v-model="selectedOutputDevice" @change="handleOutputChange">
              <option
                v-for="device in audioOutputDevices"
                :key="device.deviceId"
                :value="device.deviceId"
              >
                {{ device.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Disconnect Button -->
        <button class="btn btn-danger" data-testid="disconnect-button" @click="handleDisconnect">
          Disconnect
        </button>
      </div>

      <!-- Error Display -->
      <div v-if="sipClient?.error" class="error-message" data-testid="error-message">
        {{ sipClient.error.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSipClient, useCallSession, useDTMF, useAudioDevices } from '../src'
import type { SipConfig } from '../src'
import Dialpad from '../src/components/Dialpad.vue'
import CallControls from '../src/components/CallControls.vue'

// UI State
const showSettings = ref(false)

// Configuration - check for test config injected via page.addInitScript
const testConfig = typeof window !== 'undefined' ? (window as any).__TEST_SIP_CONFIG__ : null
console.log('[App.vue] Test config check:', {
  hasTestConfig: !!testConfig,
  testConfigValue: testConfig,
})
const config = ref<SipConfig>(
  testConfig || {
    server: 'sip.example.com',
    username: '1000',
    password: '',
    displayName: 'DailVue User',
    autoRegister: true,
  }
)
console.log('[App.vue] Final config value:', config.value)

// SIP Client - store the entire client object to access computed refs
const sipClient = ref<ReturnType<typeof useSipClient> | null>(null)

// Initialize useSipClient in onMounted to ensure EventBridge is available
onMounted(() => {
  // Access EventBridge - CRITICAL: Must pass undefined if not available, not {}
  const sipEventBridge =
    typeof window !== 'undefined' ? (window as any).__sipEventBridge : undefined

  console.log('[App.vue onMounted] EventBridge configuration:', {
    eventBridgeExists: !!sipEventBridge,
    eventBridgeType: sipEventBridge?.constructor?.name,
    willPassToUseSipClient: !!sipEventBridge,
  })

  // Initialize sipClient and store it so we can access its computed refs
  sipClient.value = useSipClient(
    config.value,
    sipEventBridge ? { eventBus: sipEventBridge } : undefined
  )

  console.log('[App.vue] Initial sipClient state:', {
    isConnected: sipClient.value.isConnected.value,
    isRegistered: sipClient.value.isRegistered.value,
    isConnecting: sipClient.value.isConnecting.value,
  })

  // CRITICAL: Assign userAgent to ref so useCallSession can access it
  const client = sipClient.value.getClient()
  if (client) {
    userAgentRef.value = client.userAgent
  }
})

// SIP Call
const userAgentRef = ref(null)
const {
  currentCall,
  incomingCall,
  isCalling,
  isInCall,
  makeCall,
  answerCall,
  endCall,
  rejectCall,
} = useCallSession(userAgentRef)

// DTMF
const currentSessionRef = ref(null)
const { sendTone } = useDTMF(currentSessionRef)

// Audio Devices
const {
  audioInputDevices,
  audioOutputDevices,
  selectedInputDevice,
  selectedOutputDevice,
  setInputDevice,
  setOutputDevice,
} = useAudioDevices()

// Handlers
const handleConnect = async () => {
  try {
    await sipClient.value?.connect()
  } catch (err) {
    console.error('Connection failed:', err)
  }
}

const handleDisconnect = async () => {
  try {
    await sipClient.value?.disconnect()
  } catch (err) {
    console.error('Disconnect failed:', err)
  }
}

const handleMakeCall = async (number: string) => {
  try {
    await makeCall(number)
  } catch (err) {
    console.error('Call failed:', err)
  }
}

const handleAnswer = async () => {
  try {
    await answerCall()
  } catch (err) {
    console.error('Answer failed:', err)
  }
}

const handleReject = async () => {
  try {
    await rejectCall()
  } catch (err) {
    console.error('Reject failed:', err)
  }
}

const handleEnd = async () => {
  try {
    await endCall()
  } catch (err) {
    console.error('End call failed:', err)
  }
}

const handleDtmf = async (digit: string) => {
  if (isInCall.value) {
    try {
      await sendTone(digit)
    } catch (err) {
      console.error('DTMF failed:', err)
    }
  }
}

const handleInputChange = () => {
  if (selectedInputDevice.value) {
    setInputDevice(selectedInputDevice.value)
  }
}

const handleOutputChange = () => {
  if (selectedOutputDevice.value) {
    setOutputDevice(selectedOutputDevice.value)
  }
}
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f3f4f6;
  color: #1f2937;
}

#app {
  padding: 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #111827;
}

h2 {
  margin-bottom: 1rem;
  color: #374151;
}

h3 {
  margin-bottom: 1rem;
  color: #4b5563;
}

.status-bar {
  display: flex;
  gap: 2rem;
  justify-content: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-label {
  font-weight: 500;
}

.status-indicator {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 0.875rem;
}

.status-indicator.connected {
  background: #d1fae5;
  color: #065f46;
}

.connection-form {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-danger {
  background: #ef4444;
  color: white;
  margin-top: 2rem;
}

.btn-danger:hover {
  background: #dc2626;
}

.settings-panel {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
  border: 1px solid #e5e7eb;
}

.main-interface {
  margin-top: 2rem;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

@media (max-width: 768px) {
  .row {
    grid-template-columns: 1fr;
  }
}

.audio-devices {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.error-message {
  padding: 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin-top: 1rem;
  text-align: center;
}
</style>
