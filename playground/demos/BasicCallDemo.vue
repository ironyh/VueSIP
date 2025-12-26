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
      <Card>
        <template #title>SIP Server Configuration</template>
        <template #content>
          <p class="info-text mb-4">
            Configure your SIP server details to get started. You'll need access to a SIP server
            (like Asterisk, FreeSWITCH, or a hosted SIP service).
            <br /><br />
            <strong>Or enable Simulation Mode above to test without a connection!</strong>
          </p>

          <div class="flex flex-column gap-3">
            <div class="form-group">
              <label for="server-uri">Server URI (WebSocket)</label>
              <InputText
                id="server-uri"
                v-model="config.uri"
                placeholder="wss://sip.example.com:7443"
                :disabled="connecting"
                class="w-full"
                aria-required="true"
                aria-describedby="server-uri-hint"
              />
              <small id="server-uri-hint">Example: wss://sip.yourdomain.com:7443</small>
            </div>

            <div class="form-group">
              <label for="sip-uri">SIP URI</label>
              <InputText
                id="sip-uri"
                v-model="config.sipUri"
                placeholder="sip:username@example.com"
                :disabled="connecting"
                class="w-full"
                aria-required="true"
                aria-describedby="sip-uri-hint"
              />
              <small id="sip-uri-hint">Example: sip:1000@yourdomain.com</small>
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <Password
                id="password"
                v-model="config.password"
                placeholder="Enter your SIP password"
                :disabled="connecting"
                :feedback="false"
                toggleMask
                class="w-full"
                aria-required="true"
              />
            </div>

            <div class="form-group">
              <label for="display-name">Display Name (Optional)</label>
              <InputText
                id="display-name"
                v-model="config.displayName"
                placeholder="Your Name"
                :disabled="connecting"
                class="w-full"
              />
            </div>

            <!-- Remember Me Section -->
            <div class="form-group checkbox-section">
              <div class="flex align-items-center">
                <Checkbox v-model="rememberMe" :binary="true" inputId="remember-me" />
                <label for="remember-me" class="ml-2 mb-0"
                  >Remember me (persist credentials across sessions)</label
                >
              </div>
            </div>

            <!-- Save Password Section (conditional) -->
            <div v-if="rememberMe" class="form-group nested">
              <div class="flex align-items-center">
                <Checkbox v-model="savePassword" :binary="true" inputId="save-password" />
                <label for="save-password" class="ml-2 mb-0">Save password</label>
              </div>
              <div class="security-warning mt-2">
                <Message severity="warn" :closable="false">
                  <strong>Security Warning:</strong> Saving your password in browser localStorage is
                  not secure. Only use this on trusted devices.
                </Message>
              </div>
            </div>

            <!-- Clear Credentials Button (conditional) -->
            <div v-if="rememberMe" class="form-actions mb-3">
              <Button
                label="Clear Saved Credentials"
                severity="secondary"
                size="small"
                outlined
                @click="clearCredentials"
              />
            </div>

            <Button
              :label="connecting ? 'Connecting...' : 'Connect to Server'"
              :loading="connecting"
              :disabled="!isConfigValid || connecting"
              :aria-disabled="!isConfigValid || connecting"
              @click="handleConnect"
              class="w-full"
              aria-label="Connect to SIP server"
            />

            <div v-if="connectionError" class="mt-3" role="alert">
              <Message severity="error" :closable="false">{{ connectionError }}</Message>
            </div>

            <div class="demo-tip mt-4">
              <Message severity="info" :closable="false">
                <strong>Tip:</strong> Don't have a SIP server? You can use a free SIP service like
                <a href="https://www.antisip.com/" target="_blank">Antisip</a> or set up a local
                Asterisk server for testing.
              </Message>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Connected Interface (show when connected OR in simulation mode) -->
    <div v-else class="connected-interface">
      <!-- Simulation indicator -->
      <div v-if="isSimulationMode" class="simulation-badge">Simulation Mode Active</div>

      <!-- Call Interface (Idle state) -->
      <div v-if="effectiveCallState === 'idle'" class="call-panel">
        <Card>
          <template #title>Make a Call</template>
          <template #content>
            <div class="flex flex-column md:flex-row gap-2">
              <InputText
                v-model="dialNumber"
                placeholder="Enter SIP URI or number (e.g., sip:2000@example.com)"
                class="flex-1 w-full"
                @keyup.enter="handleMakeCall"
              />
              <Button
                label="Call"
                icon="pi pi-phone"
                severity="success"
                :disabled="!dialNumber.trim() && !isSimulationMode"
                @click="handleMakeCall"
                aria-label="Make call"
                class="w-full md:w-auto"
              />
            </div>

            <!-- Quick dial buttons for simulation -->
            <div v-if="isSimulationMode" class="quick-dial mt-4">
              <p class="font-medium mb-2 text-secondary">Quick Dial (Simulation):</p>
              <div class="flex flex-column sm:flex-row gap-2">
                <Button
                  label="Sales"
                  severity="secondary"
                  size="small"
                  outlined
                  @click="quickDial('sip:sales@company.com', 'Sales Department')"
                  class="w-full sm:w-auto"
                />
                <Button
                  label="Support"
                  severity="secondary"
                  size="small"
                  outlined
                  @click="quickDial('sip:support@company.com', 'Tech Support')"
                  class="w-full sm:w-auto"
                />
                <Button
                  label="Reception"
                  severity="secondary"
                  size="small"
                  outlined
                  @click="quickDial('sip:reception@company.com', 'Reception')"
                  class="w-full sm:w-auto"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Incoming Call -->
      <div
        v-else-if="
          effectiveCallState === 'ringing' || (effectiveCallState as string) === 'incoming'
        "
        class="incoming-call"
      >
        <Card class="border-primary border-2 shadow-4">
          <template #content>
            <div class="flex flex-column align-items-center text-center p-3">
              <div class="incoming-animation mb-3">
                <div class="ring-circle"></div>
                <div class="ring-circle delay-1"></div>
                <div class="ring-circle delay-2"></div>
                <i class="pi pi-phone text-6xl text-primary" aria-hidden="true"></i>
              </div>
              <div class="incoming-info mb-4">
                <div class="text-xl font-bold mb-1">Incoming Call</div>
                <div class="text-2xl text-primary font-bold mb-1">
                  {{ effectiveRemoteDisplayName || 'Unknown Caller' }}
                </div>
                <div class="text-secondary">{{ effectiveRemoteUri }}</div>
              </div>
              <div class="flex flex-column sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Button
                  label="Answer"
                  icon="pi pi-phone"
                  severity="success"
                  size="large"
                  @click="handleAnswer"
                  rounded
                  raised
                  aria-label="Answer call"
                  class="w-full sm:w-auto"
                />
                <Button
                  label="Reject"
                  icon="pi pi-phone"
                  severity="danger"
                  size="large"
                  @click="handleReject"
                  rounded
                  raised
                  aria-label="Reject call"
                  class="w-full sm:w-auto"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Connecting -->
      <div v-else-if="effectiveCallState === 'connecting'" class="connecting-call">
        <Card>
          <template #content>
            <div class="flex flex-column align-items-center text-center p-4">
              <i
                class="pi pi-spin pi-spinner text-4xl text-primary mb-3"
                role="img"
                aria-label="Connecting"
              ></i>
              <div class="text-xl font-medium mb-1">Connecting...</div>
              <div class="text-secondary mb-4">{{ effectiveRemoteUri }}</div>
              <Button
                label="Cancel"
                severity="danger"
                icon="pi pi-times"
                @click="handleHangup"
                aria-label="Cancel call"
              />
            </div>
          </template>
        </Card>
      </div>

      <!-- Active Call -->
      <div
        v-else-if="effectiveCallState === 'active' || effectiveCallState === 'on-hold'"
        class="active-call"
      >
        <Card :class="{ 'surface-ground': effectiveIsOnHold }">
          <template #content>
            <div class="flex flex-column align-items-center text-center">
              <div class="call-status mb-4">
                <div
                  class="text-lg font-bold mb-2"
                  :class="{ 'text-warning': effectiveIsOnHold, 'text-success': !effectiveIsOnHold }"
                >
                  {{ effectiveIsOnHold ? 'On Hold' : 'In Call' }}
                </div>
                <div class="text-3xl font-bold mb-1">
                  {{ effectiveRemoteDisplayName || 'Unknown' }}
                </div>
                <div class="text-secondary mb-2">{{ effectiveRemoteUri }}</div>
                <div class="text-xl font-mono surface-100 p-2 border-round inline-block">
                  {{ formatDuration(effectiveDuration) }}
                </div>
              </div>

              <!-- Call Controls -->
              <div
                class="flex flex-column sm:flex-row gap-2 sm:gap-3 justify-content-center w-full sm:w-auto"
              >
                <Button
                  :icon="effectiveIsMuted ? 'pi pi-microphone-slash' : 'pi pi-microphone'"
                  :severity="effectiveIsMuted ? 'warning' : 'secondary'"
                  @click="handleToggleMute"
                  rounded
                  :aria-label="effectiveIsMuted ? 'Unmute microphone' : 'Mute microphone'"
                  class="w-full sm:w-auto"
                >
                  <span class="hidden sm:inline">{{ effectiveIsMuted ? 'Unmute' : 'Mute' }}</span>
                </Button>

                <Button
                  :icon="effectiveIsOnHold ? 'pi pi-play' : 'pi pi-pause'"
                  :severity="effectiveIsOnHold ? 'warning' : 'secondary'"
                  @click="handleToggleHold"
                  rounded
                  :aria-label="effectiveIsOnHold ? 'Resume call' : 'Hold call'"
                  class="w-full sm:w-auto"
                >
                  <span class="hidden sm:inline">{{ effectiveIsOnHold ? 'Resume' : 'Hold' }}</span>
                </Button>

                <Button
                  icon="pi pi-phone"
                  severity="danger"
                  @click="handleHangup"
                  rounded
                  aria-label="Hang up call"
                  class="w-full sm:w-auto"
                >
                  <span class="hidden sm:inline">Hang Up</span>
                </Button>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Call Ended -->
      <div v-else-if="effectiveCallState === 'ended'" class="call-ended">
        <Card>
          <template #content>
            <div class="flex flex-column align-items-center text-center p-4">
              <div class="stat-icon bg-red-100 text-red-500 border-circle p-3 mb-3">
                <i
                  class="pi pi-phone text-4xl"
                  style="transform: rotate(135deg)"
                  aria-hidden="true"
                ></i>
              </div>
              <div class="text-2xl font-bold mb-2">Call Ended</div>
              <div v-if="effectiveDuration" class="text-secondary">
                Duration: {{ formatDuration(effectiveDuration) }}
              </div>
            </div>
          </template>
        </Card>
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
import { Card, InputText, Password, Button, Checkbox, Message } from './shared-components'

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
const {
  connect,
  disconnect: _disconnect,
  isConnected,
  isRegistered: _isRegistered,
  error: _sipError,
  updateConfig,
  getClient,
} = playgroundSipClient

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
const effectiveIsConnected = computed(() => (isSimulationMode.value ? true : isConnected.value))

const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : realCallState.value
)

const effectiveDuration = computed(() =>
  isSimulationMode.value ? simulation.duration.value : realDuration.value || 0
)

const effectiveRemoteUri = computed(
  () => (isSimulationMode.value ? simulation.remoteUri.value : realRemoteUri.value) || ''
)

const effectiveRemoteDisplayName = computed(
  () =>
    (isSimulationMode.value ? simulation.remoteDisplayName.value : realRemoteDisplayName.value) ||
    ''
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

.info-text {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Animations */
.incoming-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 1.5rem;
}

.ring-circle {
  position: absolute;
  inset: 0;
  border: 2px solid var(--primary-color);
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

/* phone-icon replaced by PrimeIcon */

/* Apply shake animation to the prime icon if needed */
.pi-phone {
  animation: phone-shake 0.5s ease-in-out infinite;
  /* Only apply this when it's ringing/incoming? 
     In the template I put the icon inside .incoming-animation.
  */
}

/* But wait, the previous .phone-icon had absolute positioning. 
   The new template Chunk 3: 
   <div class="incoming-animation mb-3">
     ... circles ...
     <i class="pi pi-phone text-6xl text-primary"></i>
   </div>
   I need to position the icon absolutely in the center if I want it to be inside the rings.
*/
.incoming-animation .pi-phone {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@keyframes phone-shake {
  0%,
  100% {
    transform: translate(-50%, -50%) rotate(-10deg);
  }
  50% {
    transform: translate(-50%, -50%) rotate(10deg);
  }
}

/* Connecting Spinner - replaced by pi-spinner */

/* Call Duration Monospace Font */
.font-mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
}
</style>
