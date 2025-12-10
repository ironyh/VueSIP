<template>
  <div class="basic-call-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
      :duration="effectiveDuration"
      :remote-uri="effectiveRemoteUri"
      :remote-display-name="effectiveRemoteDisplayName"
      :is-on-hold="effectiveIsOnHold"
      :is-muted="effectiveIsMuted"
      :scenarios="simulation.scenarios"
      @toggle="simulation.toggleSimulation"
      @run-scenario="simulation.runScenario"
      @reset="simulation.resetCall"
      @answer="simulation.answer"
      @hangup="simulation.hangup"
      @toggle-hold="simulation.toggleHold"
      @toggle-mute="simulation.toggleMute"
    />

    <!-- Configuration Panel (only show when not connected and not in simulation) -->
    <div v-if="!effectiveIsConnected" class="config-panel">
      <h3>SIP Server Configuration</h3>
      <p class="info-text">
        Configure your SIP server details to get started. You'll need access to a SIP server
        (like Asterisk, FreeSWITCH, or a hosted SIP service).
        <br><br>
        <strong>Or enable Simulation Mode above to test without a connection!</strong>
      </p>

      <div class="form-group">
        <label for="server-uri">Server URI (WebSocket)</label>
        <input
          id="server-uri"
          v-model="config.uri"
          type="text"
          placeholder="wss://sip.example.com:7443"
          :disabled="connecting"
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
          :disabled="connecting"
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
          :disabled="connecting"
        />
      </div>

      <div class="form-group">
        <label for="display-name">Display Name (Optional)</label>
        <input
          id="display-name"
          v-model="config.displayName"
          type="text"
          placeholder="Your Name"
          :disabled="connecting"
        />
      </div>

      <!-- Remember Me Section -->
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="rememberMe" />
          <span>Remember me (persist credentials across sessions)</span>
        </label>
      </div>

      <!-- Save Password Section (conditional) -->
      <div v-if="rememberMe" class="form-group nested">
        <label class="checkbox-label">
          <input type="checkbox" v-model="savePassword" />
          <span>Save password</span>
        </label>
        <div class="security-warning">
          <p>
            ⚠️ <strong>Security Warning:</strong> Saving your password in browser
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

      <button
        class="btn btn-primary"
        :disabled="!isConfigValid || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect to Server' }}
      </button>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> Don't have a SIP server? You can use a free SIP service like
        <a href="https://www.antisip.com/" target="_blank">Antisip</a> or set up a local
        Asterisk server for testing.
      </div>
    </div>

    <!-- Connected Interface (show when connected OR in simulation mode) -->
    <div v-else class="connected-interface">
      <!-- Simulation indicator -->
      <div v-if="isSimulationMode" class="simulation-badge">
        🎭 Simulation Mode Active
      </div>

      <!-- Call Interface (Idle state) -->
      <div v-if="effectiveCallState === 'idle'" class="call-panel">
        <h3>Make a Call</h3>
        <div class="dial-section">
          <input
            v-model="dialNumber"
            type="text"
            placeholder="Enter SIP URI or number (e.g., sip:2000@example.com)"
            class="dial-input"
            @keyup.enter="handleMakeCall"
          />
          <button
            class="btn btn-success"
            :disabled="!dialNumber.trim() && !isSimulationMode"
            @click="handleMakeCall"
          >
            Call
          </button>
        </div>

        <!-- Quick dial buttons for simulation -->
        <div v-if="isSimulationMode" class="quick-dial">
          <p class="quick-dial-label">Quick Dial (Simulation):</p>
          <div class="quick-dial-buttons">
            <button class="quick-btn" @click="quickDial('sip:sales@company.com', 'Sales Department')">
              📞 Sales
            </button>
            <button class="quick-btn" @click="quickDial('sip:support@company.com', 'Tech Support')">
              🛠️ Support
            </button>
            <button class="quick-btn" @click="quickDial('sip:reception@company.com', 'Reception')">
              🏢 Reception
            </button>
          </div>
        </div>
      </div>

      <!-- Incoming Call -->
      <div v-else-if="effectiveCallState === 'ringing' || effectiveCallState === 'incoming'" class="incoming-call">
        <div class="incoming-animation">
          <div class="ring-circle"></div>
          <div class="ring-circle delay-1"></div>
          <div class="ring-circle delay-2"></div>
          <span class="phone-icon">📞</span>
        </div>
        <div class="incoming-info">
          <div class="incoming-label">Incoming Call</div>
          <div class="caller-name">{{ effectiveRemoteDisplayName || 'Unknown Caller' }}</div>
          <div class="caller-uri">{{ effectiveRemoteUri }}</div>
        </div>
        <div class="incoming-actions">
          <button class="btn btn-success btn-lg" @click="handleAnswer">
            ✓ Answer
          </button>
          <button class="btn btn-danger btn-lg" @click="handleReject">
            ✕ Reject
          </button>
        </div>
      </div>

      <!-- Connecting -->
      <div v-else-if="effectiveCallState === 'connecting'" class="connecting-call">
        <div class="connecting-spinner"></div>
        <div class="connecting-text">Connecting...</div>
        <div class="remote-uri">{{ effectiveRemoteUri }}</div>
        <button class="btn btn-danger" @click="handleHangup">
          Cancel
        </button>
      </div>

      <!-- Active Call -->
      <div v-else-if="effectiveCallState === 'active' || effectiveCallState === 'on-hold'" class="active-call">
        <div class="call-status">
          <div class="call-state" :class="{ 'on-hold': effectiveIsOnHold }">
            {{ effectiveIsOnHold ? '⏸️ On Hold' : '📞 In Call' }}
          </div>
          <div class="remote-info">
            <div class="remote-name">
              {{ effectiveRemoteDisplayName || 'Unknown' }}
            </div>
            <div class="remote-uri">{{ effectiveRemoteUri }}</div>
          </div>
          <div class="call-duration">
            {{ formatDuration(effectiveDuration) }}
          </div>
        </div>

        <!-- Call Controls -->
        <div class="call-controls">
          <button
            class="btn btn-secondary"
            :class="{ active: effectiveIsMuted }"
            @click="handleToggleMute"
          >
            {{ effectiveIsMuted ? '🔇 Unmute' : '🎤 Mute' }}
          </button>

          <button
            class="btn btn-secondary"
            :class="{ active: effectiveIsOnHold }"
            @click="handleToggleHold"
          >
            {{ effectiveIsOnHold ? '▶️ Resume' : '⏸️ Hold' }}
          </button>

          <button
            class="btn btn-danger"
            @click="handleHangup"
          >
            📵 Hang Up
          </button>
        </div>
      </div>

      <!-- Call Ended -->
      <div v-else-if="effectiveCallState === 'ended'" class="call-ended">
        <div class="ended-icon">📵</div>
        <div class="ended-text">Call Ended</div>
        <div v-if="effectiveDuration" class="ended-duration">
          Duration: {{ formatDuration(effectiveDuration) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCallSession } from '../../src'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// localStorage keys
const CREDENTIALS_STORAGE_KEY = 'vuesip-credentials'
const CREDENTIALS_OPTIONS_KEY = 'vuesip-credentials-options'

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

// Configuration
const config = ref({
  uri: 'wss://sip.example.com:7443',
  sipUri: 'sip:testuser@example.com',
  password: '',
  displayName: '',
})

// State
const connecting = ref(false)
const connectionError = ref('')
const dialNumber = ref('')
const rememberMe = ref(false)
const savePassword = ref(false)

// Use shared SIP Client instance
const { connect, disconnect, isConnected, isRegistered, error: sipError, updateConfig, getClient } = playgroundSipClient

// Call Session
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  remoteUri: realRemoteUri,
  remoteDisplayName: realRemoteDisplayName,
  isOnHold: realIsOnHold,
  isMuted: realIsMuted,
  duration: realDuration,
  makeCall,
  answer,
  reject,
  hangup,
  hold,
  unhold,
  mute,
  unmute,
} = useCallSession(sipClientRef)

// Effective values - use simulation or real data based on mode
const effectiveIsConnected = computed(() =>
  isSimulationMode.value ? true : isConnected.value
)

const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : realCallState.value
)

const effectiveDuration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : (realDuration.value || 0)
)

const effectiveRemoteUri = computed(() =>
  isSimulationMode.value ? simulation.remoteUri.value : realRemoteUri.value
)

const effectiveRemoteDisplayName = computed(() =>
  isSimulationMode.value ? simulation.remoteDisplayName.value : realRemoteDisplayName.value
)

const effectiveIsOnHold = computed(() =>
  isSimulationMode.value ? simulation.isOnHold.value : realIsOnHold.value
)

const effectiveIsMuted = computed(() =>
  isSimulationMode.value ? simulation.isMuted.value : realIsMuted.value
)

// Computed
const isConfigValid = computed(() => {
  return config.value.uri && config.value.sipUri && config.value.password
})

// Credential Persistence
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

// Methods
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
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : 'Connection failed'
    console.error('Connection error:', error)
  } finally {
    connecting.value = false
  }
}

const handleMakeCall = async () => {
  if (isSimulationMode.value) {
    // Use simulation
    const uri = dialNumber.value.trim() || 'sip:demo@example.com'
    simulation.makeCall(uri)
  } else {
    // Real call
    if (!dialNumber.value.trim()) return
    try {
      await makeCall(dialNumber.value, { audio: true, video: false })
    } catch (error) {
      console.error('Make call error:', error)
      alert(`Failed to make call: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

const quickDial = (uri: string, displayName: string) => {
  if (isSimulationMode.value) {
    simulation.simulatedCall.value.remoteUri = uri
    simulation.simulatedCall.value.remoteDisplayName = displayName
    simulation.runScenario('outgoing')
  }
}

const handleAnswer = async () => {
  if (isSimulationMode.value) {
    simulation.answer()
  } else {
    try {
      await answer({ audio: true, video: false })
    } catch (error) {
      console.error('Answer error:', error)
      alert(`Failed to answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

const handleReject = async () => {
  if (isSimulationMode.value) {
    simulation.hangup()
  } else {
    try {
      await reject(486)
    } catch (error) {
      console.error('Reject error:', error)
    }
  }
}

const handleHangup = async () => {
  if (isSimulationMode.value) {
    simulation.hangup()
  } else {
    try {
      await hangup()
    } catch (error) {
      console.error('Hangup error:', error)
    }
  }
}

const handleToggleMute = async () => {
  if (isSimulationMode.value) {
    simulation.toggleMute()
  } else {
    try {
      if (realIsMuted.value) {
        await unmute()
      } else {
        await mute()
      }
    } catch (error) {
      console.error('Toggle mute error:', error)
    }
  }
}

const handleToggleHold = async () => {
  if (isSimulationMode.value) {
    simulation.toggleHold()
  } else {
    try {
      if (realIsOnHold.value) {
        await unhold()
      } else {
        await hold()
      }
    } catch (error) {
      console.error('Toggle hold error:', error)
    }
  }
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Load credentials on mount
onMounted(async () => {
  const hasCredentials = loadCredentials()

  if (hasCredentials && rememberMe.value && !isConnected.value) {
    try {
      await handleConnect()
    } catch (error) {
      console.error('Auto-connect failed:', error)
    }
  }
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

// Watch config changes
watch(
  config,
  () => {
    if (rememberMe.value) {
      saveCredentials()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.basic-call-demo {
  max-width: 600px;
  margin: 0 auto;
}

.config-panel,
.connected-interface {
  padding: 1.5rem;
}

.config-panel h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #1e293b);
}

.info-text {
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 1rem;
  background: var(--bg-primary, white);
  color: var(--text-primary, #1e293b);
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary, #64748b);
  font-size: 0.75rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #6366f1);
  color: white;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-secondary {
  background: var(--bg-secondary, #f1f5f9);
  color: var(--text-primary, #1e293b);
  border: 1px solid var(--border-color, #e2e8f0);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-primary, white);
  border-color: var(--primary, #6366f1);
}

.btn-secondary.active {
  background: var(--primary, #6366f1);
  color: white;
  border-color: var(--primary, #6366f1);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
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
  font-size: 0.875rem;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.875rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid var(--primary, #6366f1);
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.6;
}

.demo-tip a {
  color: var(--primary, #6366f1);
  text-decoration: underline;
}

/* Simulation Badge */
.simulation-badge {
  text-align: center;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(168, 85, 247, 0.1));
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: #8b5cf6;
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

/* Call Panel */
.call-panel h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary, #1e293b);
}

.dial-section {
  display: flex;
  gap: 0.5rem;
}

.dial-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 1rem;
  background: var(--bg-primary, white);
  color: var(--text-primary, #1e293b);
}

.dial-input:focus {
  outline: none;
  border-color: var(--primary, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Quick Dial */
.quick-dial {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.quick-dial-label {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
  margin-bottom: 0.75rem;
}

.quick-dial-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.quick-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: var(--bg-primary, white);
  border-color: var(--primary, #6366f1);
}

/* Incoming Call */
.incoming-call {
  text-align: center;
  padding: 2rem;
}

.incoming-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
}

.ring-circle {
  position: absolute;
  inset: 0;
  border: 2px solid #10b981;
  border-radius: 50%;
  animation: ring-pulse 1.5s ease-out infinite;
}

.ring-circle.delay-1 {
  animation-delay: 0.5s;
}

.ring-circle.delay-2 {
  animation-delay: 1s;
}

@keyframes ring-pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0;
  }
}

.phone-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  animation: phone-shake 0.5s ease-in-out infinite;
}

@keyframes phone-shake {
  0%, 100% { transform: translate(-50%, -50%) rotate(-10deg); }
  50% { transform: translate(-50%, -50%) rotate(10deg); }
}

.incoming-info {
  margin-bottom: 1.5rem;
}

.incoming-label {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
  margin-bottom: 0.5rem;
}

.caller-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
}

.caller-uri {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
}

.incoming-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Connecting */
.connecting-call {
  text-align: center;
  padding: 2rem;
}

.connecting-spinner {
  width: 60px;
  height: 60px;
  border: 3px solid var(--border-color, #e2e8f0);
  border-top-color: var(--primary, #6366f1);
  border-radius: 50%;
  margin: 0 auto 1.5rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.connecting-text {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  margin-bottom: 0.5rem;
}

/* Active Call */
.active-call {
  text-align: center;
}

.call-status {
  margin-bottom: 2rem;
}

.call-state {
  font-size: 1.5rem;
  font-weight: 600;
  color: #10b981;
  margin-bottom: 1rem;
}

.call-state.on-hold {
  color: #f59e0b;
}

.remote-info {
  margin-bottom: 0.5rem;
}

.remote-name {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
}

.remote-uri {
  font-size: 0.875rem;
  color: var(--text-secondary, #64748b);
}

.call-duration {
  font-size: 2.5rem;
  font-weight: 300;
  color: var(--text-primary, #1e293b);
  margin-top: 1rem;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.call-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.call-controls .btn {
  min-width: 120px;
}

/* Call Ended */
.call-ended {
  text-align: center;
  padding: 2rem;
}

.ended-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.ended-text {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-secondary, #64748b);
  margin-bottom: 0.5rem;
}

.ended-duration {
  font-size: 0.875rem;
  color: var(--text-muted, #94a3b8);
}

/* Credential Persistence Styles */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-primary, #1e293b);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary, #6366f1);
}

.form-group.nested {
  margin-left: 1.5rem;
  background: var(--bg-secondary, #f8fafc);
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.security-warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.security-warning p {
  margin: 0;
  font-size: 0.8125rem;
  color: #b45309;
  line-height: 1.5;
}

.form-actions {
  margin-bottom: 1rem;
  text-align: center;
}
</style>
