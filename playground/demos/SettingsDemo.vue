<template>
  <div class="settings-demo">
    <!-- SIP Configuration Panel -->
    <Panel header="SIP Server Configuration" class="config-panel">
      <p class="info-text">
        Configure your SIP server details here. These settings will be used across all playground demos.
      </p>

      <div class="connection-status" :class="{ connected: isConnected }">
        <span class="status-indicator"></span>
        <span class="status-text">{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
        <Badge v-if="isRegistered" value="Registered" severity="success" />
      </div>

      <div class="form-group">
        <FloatLabel>
          <InputText
            id="server-uri"
            v-model="config.uri"
            :disabled="connecting || isConnected"
            class="w-full"
          />
          <label for="server-uri">Server URI (WebSocket)</label>
        </FloatLabel>
        <small>Example: wss://sip.yourdomain.com:7443</small>
      </div>

      <div class="form-group">
        <FloatLabel>
          <InputText
            id="sip-uri"
            v-model="config.sipUri"
            :disabled="connecting || isConnected"
            class="w-full"
          />
          <label for="sip-uri">SIP URI</label>
        </FloatLabel>
        <small>Example: sip:1000@yourdomain.com</small>
      </div>

      <div class="form-group">
        <FloatLabel>
          <InputText
            id="password"
            v-model="config.password"
            type="password"
            :disabled="connecting || isConnected"
            class="w-full"
          />
          <label for="password">Password</label>
        </FloatLabel>
      </div>

      <div class="form-group">
        <FloatLabel>
          <InputText
            id="display-name"
            v-model="config.displayName"
            :disabled="connecting || isConnected"
            class="w-full"
          />
          <label for="display-name">Display Name (Optional)</label>
        </FloatLabel>
      </div>

      <!-- Remember Me Section -->
      <div class="form-group checkbox-group">
        <Checkbox v-model="rememberMe" :binary="true" inputId="remember-me" :disabled="connecting" />
        <label for="remember-me" class="checkbox-label">Remember me (persist credentials across sessions)</label>
      </div>

      <!-- Save Password Section (conditional) -->
      <div v-if="rememberMe" class="form-group nested">
        <div class="checkbox-group">
          <Checkbox v-model="savePassword" :binary="true" inputId="save-password" :disabled="connecting" />
          <label for="save-password" class="checkbox-label">Save password</label>
        </div>
        <Message severity="warn" :closable="false" class="security-warning">
          <strong>Security Warning:</strong> Saving your password in browser
          localStorage is not secure. Only use this on trusted devices.
        </Message>
      </div>

      <!-- Clear Credentials Button (conditional) -->
      <div v-if="rememberMe" class="form-actions">
        <Button
          label="Clear Saved Credentials"
          severity="secondary"
          size="small"
          outlined
          @click="clearCredentials"
        />
      </div>

      <!-- Connect/Disconnect Buttons -->
      <div class="connection-buttons">
        <Button
          v-if="!isConnected"
          :label="connecting ? 'Connecting...' : 'Connect to Server'"
          :disabled="!isConfigValid || connecting"
          :loading="connecting"
          icon="pi pi-link"
          class="w-full"
          @click="handleConnect"
        />
        <Button
          v-else
          label="Disconnect"
          severity="danger"
          icon="pi pi-times"
          class="w-full"
          @click="handleDisconnect"
        />
      </div>

      <Message v-if="connectionError" severity="error" :closable="false" class="error-message">
        {{ connectionError }}
      </Message>

      <Message severity="info" :closable="false" class="demo-tip">
        <strong>Tip:</strong> Don't have a SIP server? You can use a free SIP service like
        <a href="https://www.antisip.com/" target="_blank">Antisip</a> or set up a local
        Asterisk server for testing.
      </Message>

      <!-- Connection Info when connected -->
      <Card v-if="isConnected" class="connection-info">
        <template #title>Connection Details</template>
        <template #content>
          <dl>
            <dt>Server</dt>
            <dd>{{ config.uri }}</dd>
            <dt>SIP URI</dt>
            <dd>{{ config.sipUri }}</dd>
            <dt>Display Name</dt>
            <dd>{{ config.displayName || 'Not set' }}</dd>
            <dt>Status</dt>
            <dd>{{ isRegistered ? 'Registered' : 'Connected (not registered)' }}</dd>
          </dl>
        </template>
      </Card>
    </Panel>

    <!-- AMI Configuration Panel -->
    <Panel header="Asterisk Manager Interface (AMI)" class="config-panel ami-panel">
      <p class="info-text">
        Configure your Asterisk Manager Interface connection for advanced features like
        presence monitoring, queue management, and call supervision.
      </p>

      <div class="connection-status" :class="{ connected: isAmiConnected }">
        <span class="status-indicator"></span>
        <span class="status-text">{{ isAmiConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>

      <div class="form-group">
        <FloatLabel>
          <InputText
            id="ami-url"
            v-model="amiConfig.url"
            :disabled="amiConnecting || isAmiConnected"
            class="w-full"
          />
          <label for="ami-url">AMI WebSocket URL</label>
        </FloatLabel>
        <small>Example: ws://your-asterisk-server:8088/ami</small>
      </div>

      <!-- Remember AMI URL -->
      <div class="form-group checkbox-group">
        <Checkbox v-model="rememberAmi" :binary="true" inputId="remember-ami" :disabled="amiConnecting" />
        <label for="remember-ami" class="checkbox-label">Remember AMI URL</label>
      </div>

      <!-- Connect/Disconnect Buttons -->
      <div class="connection-buttons">
        <Button
          v-if="!isAmiConnected"
          :label="amiConnecting ? 'Connecting...' : 'Connect to AMI'"
          :disabled="!amiConfig.url || amiConnecting"
          :loading="amiConnecting"
          icon="pi pi-link"
          severity="help"
          class="w-full"
          @click="handleAmiConnect"
        />
        <Button
          v-else
          label="Disconnect AMI"
          severity="danger"
          icon="pi pi-times"
          class="w-full"
          @click="handleAmiDisconnect"
        />
      </div>

      <Message v-if="amiError" severity="error" :closable="false" class="error-message">
        {{ amiError }}
      </Message>

      <Message severity="info" :closable="false" class="demo-tip">
        <strong>Note:</strong> AMI connection requires a WebSocket proxy to your Asterisk server.
        This is typically set up using <code>asterisk-ami-ws-proxy</code> or similar tools.
      </Message>

      <!-- AMI Connection Info when connected -->
      <Card v-if="isAmiConnected" class="connection-info">
        <template #title>AMI Connection Details</template>
        <template #content>
          <dl>
            <dt>URL</dt>
            <dd>{{ amiConfig.url }}</dd>
            <dt>Status</dt>
            <dd>Connected</dd>
          </dl>
        </template>
      </Card>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { playgroundSipClient, playgroundAmiClient } from '../sipClient'

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

    console.log('✅ AMI connected successfully')
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

// Load all settings on mount
onMounted(() => {
  loadCredentials()
  loadAmiConfig()
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
  margin-bottom: 1.5rem;
}

.ami-panel :deep(.p-panel-title) {
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
  background: var(--surface-100);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--surface-200);
}

.connection-status.connected {
  background: var(--status-connected-bg);
  border-color: var(--status-connected-border);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--danger);
}

.connection-status.connected .status-indicator {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.status-text {
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group small {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.w-full {
  width: 100%;
}

/* Checkbox group styling */
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-label {
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
}

.form-group.nested {
  margin-left: 1.5rem;
  background: var(--surface-50);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid var(--surface-200);
}

.security-warning {
  margin-top: 0.75rem;
}

.form-actions {
  margin-bottom: 1rem;
  text-align: center;
}

.connection-buttons {
  margin-bottom: 1rem;
}

.error-message {
  margin-top: 1rem;
}

.demo-tip {
  margin-top: 1.5rem;
}

.demo-tip a {
  color: var(--primary-color);
  text-decoration: underline;
}

.demo-tip code {
  background: var(--surface-100);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.8125rem;
}

/* Connection Info */
.connection-info {
  margin-top: 1.5rem;
}

.connection-info dl {
  margin: 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
}

.connection-info dt {
  color: var(--status-connected-text);
  font-weight: 500;
  font-size: 0.875rem;
}

.connection-info dd {
  margin: 0;
  color: var(--success);
  font-size: 0.875rem;
  word-break: break-all;
}
</style>
