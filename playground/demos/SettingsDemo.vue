<template>
  <div class="settings-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="simulation.state.value"
      :duration="simulation.duration.value"
      :remote-uri="simulation.remoteUri.value"
      :remote-display-name="simulation.remoteDisplayName.value"
      :is-on-hold="simulation.isOnHold.value"
      :is-muted="simulation.isMuted.value"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- SIP Configuration Panel -->
    <div class="config-panel">
      <h3>SIP Server Configuration</h3>
      <p class="info-text">
        Configure your SIP server details here. These settings will be used across all playground demos.
      </p>

      <div class="connection-status" :class="{ connected: isConnected }">
        <span class="status-indicator"></span>
        <span class="status-text">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        <span v-if="isRegistered" class="badge badge-success">Registered</span>
      </div>

      <!-- Connection Info when connected (shown prominently) -->
      <div v-if="isConnected && activeConnectionInfo" class="connection-info">
        <h4>Connection Details</h4>
        <dl>
          <dt>Server</dt>
          <dd>{{ activeConnectionInfo.uri }}</dd>
          <dt>SIP URI</dt>
          <dd>{{ activeConnectionInfo.sipUri }}</dd>
          <dt>Display Name</dt>
          <dd>{{ activeConnectionInfo.displayName }}</dd>
          <dt>Status</dt>
          <dd>{{ isRegistered ? 'Registered' : 'Connected (not registered)' }}</dd>
        </dl>
      </div>

      <div class="form-group">
        <label for="server-uri">Server URI (WebSocket)</label>
        <input
          id="server-uri"
          v-model="config.uri"
          type="text"
          placeholder="wss://sip.example.com:7443"
          :disabled="connecting || isConnected"
        />
        <small>Example: wss://sip.yourdomain.com:7443</small>
      </div>

      <div class="form-group">
        <label for="sip-uri">SIP URI</label>
        <input
          id="sip-uri"
          v-model="config.sipUri"
          type="text"
          placeholder="sip:username@example.com"
          :disabled="connecting || isConnected"
        />
        <small>Example: sip:1000@yourdomain.com</small>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="config.password"
          type="password"
          placeholder="Enter your SIP password"
          :disabled="connecting || isConnected"
        />
      </div>

      <div class="form-group">
        <label for="display-name">Display Name (Optional)</label>
        <input
          id="display-name"
          v-model="config.displayName"
          type="text"
          placeholder="Your Name"
          :disabled="connecting || isConnected"
        />
      </div>

      <!-- Remember Me Section -->
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="rememberMe" :disabled="connecting" />
          <span>Remember me (persist credentials across sessions)</span>
        </label>
      </div>

      <!-- Save Password Section (conditional) -->
      <div v-if="rememberMe" class="form-group nested">
        <label class="checkbox-label">
          <input type="checkbox" v-model="savePassword" :disabled="connecting" />
          <span>Save password</span>
        </label>
        <div class="security-warning">
          <p>
            <strong>Security Warning:</strong> Saving your password in browser
            localStorage is not secure. Only use this on trusted devices.
          </p>
        </div>
      </div>

      <!-- Clear Credentials Button (conditional) -->
      <div v-if="rememberMe" class="form-actions">
        <button type="button" class="btn btn-secondary btn-sm" @click="clearCredentials">
          Clear Saved Credentials
        </button>
      </div>

      <!-- Connect/Disconnect Buttons -->
      <div class="connection-buttons">
        <button
          v-if="!isConnected"
          class="btn btn-primary w-full"
          :disabled="!isConfigValid || connecting"
          @click="handleConnect"
        >
          {{ connecting ? 'Connecting...' : 'Connect to Server' }}
        </button>
        <button
          v-else
          class="btn btn-danger w-full"
          @click="handleDisconnect"
        >
          Disconnect
        </button>
      </div>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> Don't have a SIP server? You can use a free SIP service like
        <a href="https://www.antisip.com/" target="_blank">Antisip</a> or set up a local
        Asterisk server for testing.
      </div>
    </div>

    <!-- AMI Configuration Panel -->
    <div class="config-panel ami-panel">
      <h3>Asterisk Manager Interface (AMI)</h3>
      <p class="info-text">
        Configure your Asterisk Manager Interface connection for advanced features like
        presence monitoring, queue management, and call supervision.
      </p>

      <div class="connection-status" :class="{ connected: isAmiConnected }">
        <span class="status-indicator"></span>
        <span class="status-text">{{ isAmiConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>

      <!-- AMI Connection Info when connected -->
      <div v-if="isAmiConnected" class="connection-info">
        <h4>AMI Connection Details</h4>
        <dl>
          <dt>URL</dt>
          <dd>{{ amiConfig.url }}</dd>
          <dt>Status</dt>
          <dd>Connected</dd>
        </dl>
      </div>

      <div class="form-group">
        <label for="ami-url">AMI WebSocket URL</label>
        <input
          id="ami-url"
          v-model="amiConfig.url"
          type="text"
          placeholder="ws://your-asterisk-server:8088/ami"
          :disabled="amiConnecting || isAmiConnected"
        />
        <small>Example: ws://your-asterisk-server:8088/ami</small>
      </div>

      <!-- Remember AMI URL -->
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="rememberAmi" :disabled="amiConnecting" />
          <span>Remember AMI URL</span>
        </label>
      </div>

      <!-- Connect/Disconnect Buttons -->
      <div class="connection-buttons">
        <button
          v-if="!isAmiConnected"
          class="btn btn-secondary w-full"
          :disabled="!amiConfig.url || amiConnecting"
          @click="handleAmiConnect"
        >
          {{ amiConnecting ? 'Connecting...' : 'Connect to AMI' }}
        </button>
        <button
          v-else
          class="btn btn-danger w-full"
          @click="handleAmiDisconnect"
        >
          Disconnect AMI
        </button>
      </div>

      <div v-if="amiError" class="error-message">
        {{ amiError }}
      </div>

      <div class="demo-tip">
        <strong>Note:</strong> AMI connection requires a WebSocket proxy to your Asterisk server.
        This is typically set up using <code>asterisk-ami-ws-proxy</code> or similar tools.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { playgroundSipClient, playgroundAmiClient } from '../sipClient'
import { configStore } from '../../src/stores/configStore'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// localStorage keys
const CREDENTIALS_STORAGE_KEY = 'vuesip-credentials'
const CREDENTIALS_OPTIONS_KEY = 'vuesip-credentials-options'
const AMI_URL_STORAGE_KEY = 'vuesip-ami-url'
const AMI_OPTIONS_KEY = 'vuesip-ami-options'

interface StoredCredentials {
  uri: string
  sipUri: string
  password?: string
  displayName: string
  timestamp: string
}

interface CredentialsOptions {
  rememberMe: boolean
  savePassword: boolean
}

// SIP Configuration
const config = ref({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:testuser@example.com',
  password: '',
  displayName: '',
})

// SIP State
const connecting = ref(false)
const connectionError = ref('')
const rememberMe = ref(false)
const savePassword = ref(false)

// AMI Configuration
const amiConfig = ref({
  url: '',
})

// AMI State
const amiConnecting = ref(false)
const amiError = ref('')
const rememberAmi = ref(false)

// Use shared SIP Client instance
const { connect, disconnect, isConnected, isRegistered, updateConfig } = playgroundSipClient

// Use shared AMI Client instance
const {
  connect: amiConnect,
  disconnect: amiDisconnect,
  isConnected: isAmiConnected,
} = playgroundAmiClient

// Computed
const isConfigValid = computed(() => {
  return config.value.uri && config.value.sipUri && config.value.password
})

// Get active connection info from the store (for display when connected)
// Access sipConfig directly for reactivity (method calls aren't tracked by Vue)
const activeConnectionInfo = computed(() => {
  if (!isConnected.value) return null
  const storeConfig = configStore.sipConfig
  return {
    uri: storeConfig?.uri || config.value.uri,
    sipUri: storeConfig?.sipUri || config.value.sipUri,
    displayName: storeConfig?.displayName || config.value.displayName || 'Not set',
  }
})

// SIP Credential Persistence
const loadCredentials = (): boolean => {
  const saved = localStorage.getItem(CREDENTIALS_STORAGE_KEY)
  const options = localStorage.getItem(CREDENTIALS_OPTIONS_KEY)

  if (saved && options) {
    try {
      const credentials: StoredCredentials = JSON.parse(saved)
      const opts: CredentialsOptions = JSON.parse(options)

      if (opts.rememberMe) {
        config.value.uri = credentials.uri || ''
        config.value.sipUri = credentials.sipUri || ''
        config.value.displayName = credentials.displayName || ''

        if (opts.savePassword && credentials.password) {
          config.value.password = credentials.password
        }

        rememberMe.value = opts.rememberMe
        savePassword.value = opts.savePassword

        return true
      }
    } catch (error) {
      console.error('Failed to load credentials:', error)
    }
  }

  return false
}

const saveCredentials = () => {
  if (rememberMe.value) {
    const credentials: StoredCredentials = {
      uri: config.value.uri,
      sipUri: config.value.sipUri,
      displayName: config.value.displayName,
      timestamp: new Date().toISOString(),
    }

    if (savePassword.value) {
      credentials.password = config.value.password
    }

    const options: CredentialsOptions = {
      rememberMe: rememberMe.value,
      savePassword: savePassword.value,
    }

    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials))
    localStorage.setItem(CREDENTIALS_OPTIONS_KEY, JSON.stringify(options))
  } else {
    clearCredentials()
  }
}

const clearCredentials = () => {
  localStorage.removeItem(CREDENTIALS_STORAGE_KEY)
  localStorage.removeItem(CREDENTIALS_OPTIONS_KEY)
  rememberMe.value = false
  savePassword.value = false
}

// AMI Persistence
const loadAmiConfig = () => {
  const savedUrl = localStorage.getItem(AMI_URL_STORAGE_KEY)
  const savedOptions = localStorage.getItem(AMI_OPTIONS_KEY)

  if (savedUrl) {
    amiConfig.value.url = savedUrl
  }

  if (savedOptions) {
    try {
      const opts = JSON.parse(savedOptions)
      rememberAmi.value = opts.rememberAmi || false
    } catch (error) {
      console.error('Failed to load AMI options:', error)
    }
  }
}

const saveAmiConfig = () => {
  if (rememberAmi.value && amiConfig.value.url) {
    localStorage.setItem(AMI_URL_STORAGE_KEY, amiConfig.value.url)
    localStorage.setItem(AMI_OPTIONS_KEY, JSON.stringify({ rememberAmi: true }))
  } else {
    localStorage.removeItem(AMI_URL_STORAGE_KEY)
    localStorage.removeItem(AMI_OPTIONS_KEY)
  }
}

// SIP Methods
const handleConnect = async () => {
  try {
    connecting.value = true
    connectionError.value = ''

    const validationResult = updateConfig({
      uri: config.value.uri,
      sipUri: config.value.sipUri,
      password: config.value.password,
      displayName: config.value.displayName,
      autoRegister: true,
      connectionTimeout: 10000,
      registerExpires: 600,
    })

    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors?.join(', ')}`)
    }

    await connect()

    // Save credentials after successful connection
    if (rememberMe.value) {
      saveCredentials()
    }
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : 'Connection failed'
    console.error('Connection error:', error)
  } finally {
    connecting.value = false
  }
}

const handleDisconnect = async () => {
  try {
    await disconnect()
  } catch (error) {
    console.error('Disconnect error:', error)
  }
}

// AMI Methods
const handleAmiConnect = async () => {
  try {
    amiConnecting.value = true
    amiError.value = ''

    await amiConnect({ url: amiConfig.value.url })

    // Save AMI config after successful connection
    if (rememberAmi.value) {
      saveAmiConfig()
    }

    console.log('AMI connected successfully')
  } catch (error) {
    amiError.value = error instanceof Error ? error.message : 'AMI connection failed'
    console.error('AMI connection error:', error)
  } finally {
    amiConnecting.value = false
  }
}

const handleAmiDisconnect = async () => {
  try {
    await amiDisconnect()
  } catch (error) {
    console.error('AMI disconnect error:', error)
  }
}

// Sync local form config with connected values if already connected
const syncConfigFromStore = () => {
  if (isConnected.value) {
    const storeConfig = configStore.sipConfig
    if (storeConfig) {
      config.value.uri = storeConfig.uri || config.value.uri
      config.value.sipUri = storeConfig.sipUri || config.value.sipUri
      config.value.displayName = storeConfig.displayName || config.value.displayName
    }
  }
}

// Load all settings on mount
onMounted(() => {
  loadCredentials()
  loadAmiConfig()
  // If already connected (e.g., auto-connect happened), sync the form with actual values
  syncConfigFromStore()
})

// Watch rememberMe checkbox
watch(rememberMe, (newValue) => {
  if (newValue) {
    saveCredentials()
  } else {
    clearCredentials()
  }
})

// Watch savePassword checkbox
watch(savePassword, () => {
  if (rememberMe.value) {
    saveCredentials()
  }
})

// Watch config changes (auto-save when rememberMe is true)
watch(
  config,
  () => {
    if (rememberMe.value) {
      saveCredentials()
    }
  },
  { deep: true }
)

// Watch rememberAmi checkbox
watch(rememberAmi, () => {
  saveAmiConfig()
})

// Watch amiConfig changes
watch(
  amiConfig,
  () => {
    if (rememberAmi.value) {
      saveAmiConfig()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.settings-demo {
  max-width: 720px;
  margin: 0 auto;
}

.config-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.config-panel h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.ami-panel h3 {
  color: var(--primary);
}

.info-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.connection-status.connected {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
}

.connection-status.connected .status-indicator {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.status-text {
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background: #10b981;
  color: white;
}

/* Connection Info Card */
.connection-info {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.connection-info h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #10b981;
}

.connection-info dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
}

.connection-info dt {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
}

.connection-info dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.875rem;
  word-break: break-all;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--bg-secondary);
}

.form-group small {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

/* Checkbox styling */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.checkbox-label span {
  font-size: 0.875rem;
}

.form-group.nested {
  margin-left: 1.5rem;
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.security-warning {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
}

.security-warning p {
  margin: 0;
  font-size: 0.8125rem;
  color: #b45309;
}

.form-actions {
  margin-bottom: 1rem;
  text-align: center;
}

.connection-buttons {
  margin-bottom: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), #4f46e5);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-primary);
  border-color: var(--primary);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.w-full {
  width: 100%;
}

.error-message {
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.demo-tip a {
  color: var(--primary);
  text-decoration: underline;
}

.demo-tip code {
  background: var(--bg-secondary);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.8125rem;
}
</style>
