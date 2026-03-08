<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient } from '../src/composables/useSipClient'
import { freepbxConfig, getExtensionConfig, createSipUri } from './freepbx-config'

const extensionNumber = ref(freepbxConfig.defaultExtension)
const logs = ref<string[]>([])

const extConfig = computed(() => getExtensionConfig(extensionNumber.value))
const sipUri = computed(() => createSipUri(extConfig.value.number))

// Use VueSIP composable
const { 
  isRegistered, 
  isConnected,
  isConnecting, 
  connect, 
  disconnect,
  error: sipError 
} = useSipClient({
  websocketUrl: freepbxConfig.websocketUrl,
  uri: sipUri.value,
  password: extConfig.value.password,
}, {
  autoConnect: false,
})

// Computed status text
const status = computed(() => {
  if (sipError.value) return 'error'
  if (isRegistered.value) return 'registered'
  if (isConnected.value) return 'connected'
  if (isConnecting.value) return 'connecting'
  return 'disconnected'
})

function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString()
  logs.value.unshift(`[${timestamp}] ${message}`)
  if (logs.value.length > 50) logs.value.pop()
}

async function handleConnect() {
  addLog(`Connecting as extension ${extensionNumber.value}...`)
  addLog(`WebSocket: ${freepbxConfig.websocketUrl}`)
  addLog(`SIP URI: ${sipUri.value}`)
  
  try {
    await connect()
    addLog('✅ Successfully connected to FreePBX!')
  } catch (err) {
    addLog(`❌ Connection failed: ${err}`)
  }
}

function handleDisconnect() {
  disconnect()
  addLog('Disconnected from FreePBX')
}

const statusColor = computed(() => {
  switch (status.value) {
    case 'registered': return '#22c55e'
    case 'connected': return '#3b82f6'
    case 'connecting': return '#f59e0b'
    case 'error': return '#ef4444'
    default: return '#6b7280'
  }
})
</script>

<template>
  <div class="freepbx-tester">
    <h2>🧪 FreePBX VueSIP Tester</h2>
    <p class="subtitle">Testing WebRTC connection to FreePBX (192.168.65.129)</p>
    
    <div class="config-panel">
      <h3>Extension Configuration</h3>
      
      <div class="form-group">
        <label>Extension Number:</label>
        <select v-model="extensionNumber" :disabled="isConnecting || isConnected">
          <option v-for="ext in freepbxConfig.extensions" :key="ext.number" :value="ext.number">
            {{ ext.number }} - {{ ext.name }}
          </option>
        </select>
      </div>
      
      <div class="info-grid">
        <div class="info-item">
          <span class="label">SIP URI:</span>
          <code>{{ sipUri }}</code>
        </div>
        <div class="info-item">
          <span class="label">WebSocket:</span>
          <code>{{ freepbxConfig.websocketUrl }}</code>
        </div>
        <div class="info-item">
          <span class="label">Username:</span>
          <code>{{ extConfig.username }}</code>
        </div>
      </div>
    </div>
    
    <div class="status-panel" :class="status">
      <div class="status-indicator" :style="{ backgroundColor: statusColor }"></div>
      <span class="status-text">Status: {{ status }}</span>
      <span v-if="isConnected" class="connected-badge">✓ Connected</span>
      <span v-if="isRegistered" class="registered-badge">✓ Registered</span>
    </div>
    
    <div class="actions">
      <button 
        @click="handleConnect" 
        :disabled="isConnecting || isConnected"
        class="btn btn-primary"
      >
        {{ isConnecting ? 'Connecting...' : 'Connect' }}
      </button>
      
      <button 
        @click="handleDisconnect" 
        :disabled="!isConnected && !isConnecting"
        class="btn btn-secondary"
      >
        Disconnect
      </button>
    </div>
    
    <div v-if="sipError" class="error-panel">
      <strong>Error:</strong> {{ sipError.message }}
    </div>
    
    <div class="logs-panel">
      <h3>Connection Logs</h3>
      <div class="logs">
        <div v-for="(log, i) in logs" :key="i" class="log-line">
          {{ log }}
        </div>
        <div v-if="logs.length === 0" class="empty-logs">
          No logs yet. Click "Connect" to start.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.freepbx-tester {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, sans-serif;
}

h2 {
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1.5rem;
}

.config-panel {
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

select {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 200px;
}

.info-grid {
  display: grid;
  gap: 0.5rem;
  margin-top: 1rem;
}

.info-item {
  display: flex;
  gap: 0.5rem;
}

.info-item .label {
  font-weight: 600;
  min-width: 100px;
}

code {
  background: #e0e0e0;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: monospace;
}

.status-panel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f0f0f0;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-text {
  font-weight: 600;
  text-transform: capitalize;
}

.registered-badge {
  background: #22c55e;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.connected-badge {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-accent {
  background: #8b5cf6;
  color: white;
}

.error-panel {
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.logs-panel {
  background: #1e1e1e;
  color: #4ade80;
  padding: 1rem;
  border-radius: 8px;
}

.logs-panel h3 {
  color: white;
  margin-top: 0;
}

.logs {
  max-height: 300px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.875rem;
}

.log-line {
  padding: 0.25rem 0;
  border-bottom: 1px solid #333;
}

.empty-logs {
  color: #666;
  font-style: italic;
}
</style>