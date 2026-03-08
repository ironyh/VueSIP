<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Dialpad from './components/Dialpad.vue'
import CallControls from './components/CallControls.vue'
import { config } from '../freepbx-config'
import { useSipClient, useCallSession, useCallControls, useSipRegistration } from 'vuesip'

// UI state
const selectedExtension = ref(config.defaultExtension)
const statusMessage = ref('')
const callTarget = ref('')
const showIncomingDialog = ref(false)

// Get extension config
const extensionConfig = computed(() => {
  return config.extensions.find(e => e.number === selectedExtension.value) || config.extensions[0]
})

// Create SIP URI
const sipUri = computed(() => `sip:${extensionConfig.value.number}@${config.domain}`)

// SIP Client
const {
  isConnected,
  isRegistered,
  isConnecting,
  connect,
  disconnect,
  error,
} = useSipClient({
  websocketUrl: config.websocketUrl,
  uri: sipUri.value,
  password: extensionConfig.value.password,
}, { autoConnect: false })

// Call session
const {
  session,
  isInCall,
  isOutgoing,
  isIncoming,
  remoteIdentity,
  connect: acceptCall,
  hangup,
} = useCallSession()

// Call controls
const {
  call,
} = useCallControls()

// Registration
const registration = useSipRegistration()

async function handleConnect() {
  statusMessage.value = 'Connecting...'
  try {
    await connect()
    await registration.register()
    statusMessage.value = isRegistered.value ? 'Registered!' : 'Connected (not registered)'
  } catch (err) {
    statusMessage.value = `Error: ${err}`
  }
}

function handleDisconnect() {
  disconnect()
  statusMessage.value = 'Disconnected'
}

async function handleCall() {
  if (!callTarget.value) return
  const targetUri = `sip:${callTarget.value}@${config.domain}`
  statusMessage.value = `Calling ${callTarget.value}...`
  try {
    await call(targetUri)
  } catch (err) {
    statusMessage.value = `Call failed: ${err}`
  }
}

function handleHangup() {
  hangup()
  statusMessage.value = 'Call ended'
}

const statusColor = computed(() => {
  if (isInCall.value) return 'red'
  if (isRegistered.value) return 'green'
  if (isConnected.value) return 'blue'
  return 'gray'
})
</script>

<template>
  <div class="freepbx-softphone">
    <Card class="main-card">
      <template #title>
        <div class="header">
          <h1>☎️ Telenurse Softphone</h1>
          <div class="status-badge" :style="{ backgroundColor: statusColor }">
            {{ isInCall ? 'In Call' : isRegistered ? 'Registered' : isConnected ? 'Connected' : 'Offline' }}
          </div>
        </div>
      </template>

      <div class="config-section">
        <label>Extension:</label>
        <Dropdown 
          v-model="selectedExtension" 
          :options="config.extensions" 
          optionLabel="name" 
          optionValue="number"
          placeholder="Select extension"
          class="w-full"
        />
        <div class="extension-info" v-if="extensionConfig">
          <small>Number: {{ extensionConfig.number }} | User: {{ extensionConfig.username }}</small>
        </div>
      </div>

      <div class="connection-section">
        <Button 
          @click="handleConnect" 
          :disabled="isConnecting || isRegistered"
          label="Connect"
          icon="pi pi-power-off"
          class="p-button-success"
        />
        <Button 
          @click="handleDisconnect" 
          :disabled="!isConnected && !isConnecting"
          label="Disconnect"
          icon="pi pi-times"
          class="p-button-secondary ml-2"
        />
      </div>

      <div v-if="statusMessage" class="status-message">
        {{ statusMessage }}
      </div>

      <div v-if="error" class="error-message">
        Error: {{ error.message }}
      </div>

      <hr />

      <div class="call-section">
        <div class="call-input">
          <InputText 
            v-model="callTarget" 
            placeholder="Enter number to call"
            class="w-full"
            :disabled="isInCall"
          />
        </div>
        
        <Dialpad v-if="!isInCall" @digit="callTarget += $event" />
        
        <CallControls 
          v-if="isInCall"
          :session="session"
          @hangup="handleHangup"
        />
        
        <div class="call-actions">
          <Button 
            v-if="!isInCall"
            @click="handleCall"
            :disabled="!isRegistered || !callTarget"
            label="Call"
            icon="pi pi-phone"
            class="p-button-success w-full"
          />
          
          <Button 
            v-if="isInCall"
            @click="handleHangup"
            label="Hangup"
            icon="pi pi-phone-slash"
            class="p-button-danger w-full"
          />
        </div>
      </div>

      <hr />

      <div class="info-section">
        <small>
          <strong>WebSocket:</strong> {{ config.websocketUrl }}<br/>
          <strong>Domain:</strong> {{ config.domain }}
        </small>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.freepbx-softphone {
  max-width: 500px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.main-card {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.config-section {
  margin-bottom: 1rem;
}

.config-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.extension-info {
  margin-top: 0.5rem;
  color: #666;
}

.connection-section {
  margin-bottom: 1rem;
}

.status-message {
  padding: 0.75rem;
  background: #e0f2fe;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.error-message {
  padding: 0.75rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.call-section {
  margin-top: 1rem;
}

.call-input {
  margin-bottom: 1rem;
}

.call-actions {
  margin-top: 1rem;
}

.info-section {
  margin-top: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 6px;
}

:deep(.w-full) {
  width: 100%;
}

:deep(.ml-2) {
  margin-left: 0.5rem;
}

:deep(.p-button) {
  justify-content: center;
}
</style>