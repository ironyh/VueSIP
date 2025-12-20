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
    <Panel v-if="!effectiveIsConnected" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-cog"></i>
          <span class="font-semibold">SIP Server Configuration</span>
        </div>
      </template>

      <Message severity="info" :closable="false" class="mb-4">
        <p class="m-0 line-height-3">
          Configure your SIP server details to get started. You'll need access to a SIP server (like
          Asterisk, FreeSWITCH, or a hosted SIP service).
        </p>
        <p class="mt-2 mb-0 font-semibold">Or enable Simulation Mode above to test without a connection!</p>
      </Message>

      <div class="flex flex-column gap-4">
        <div class="flex flex-column gap-2">
          <label for="server-uri" class="font-medium">Server URI (WebSocket)</label>
          <InputText
            id="server-uri"
            v-model="config.uri"
            placeholder="wss://sip.example.com:7443"
            :disabled="connecting"
            class="w-full"
          />
          <small class="text-500">Example: wss://sip.yourdomain.com:7443</small>
        </div>

        <div class="flex flex-column gap-2">
          <label for="sip-uri" class="font-medium">SIP URI</label>
          <InputText
            id="sip-uri"
            v-model="config.sipUri"
            placeholder="sip:username@example.com"
            :disabled="connecting"
            class="w-full"
          />
          <small class="text-500">Example: sip:1000@yourdomain.com</small>
        </div>

        <div class="flex flex-column gap-2">
          <label for="password" class="font-medium">Password</label>
          <Password
            id="password"
            v-model="config.password"
            placeholder="Enter your SIP password"
            :disabled="connecting"
            :feedback="false"
            toggleMask
            class="w-full"
            inputClass="w-full"
          />
        </div>

        <div class="flex flex-column gap-2">
          <label for="display-name" class="font-medium">Display Name (Optional)</label>
          <InputText
            id="display-name"
            v-model="config.displayName"
            placeholder="Your Name"
            :disabled="connecting"
            class="w-full"
          />
        </div>

        <!-- Remember Me Section -->
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="rememberMe" inputId="remember-me" :binary="true" />
          <label for="remember-me" class="cursor-pointer">Remember me (persist credentials across sessions)</label>
        </div>

        <!-- Save Password Section (conditional) -->
        <div v-if="rememberMe" class="surface-100 border-round p-3">
          <div class="flex align-items-center gap-2 mb-3">
            <Checkbox v-model="savePassword" inputId="save-password" :binary="true" />
            <label for="save-password" class="cursor-pointer">Save password</label>
          </div>
          <Message severity="warn" :closable="false" class="m-0">
            <p class="m-0 text-sm">
              <strong>Security Warning:</strong> Saving your password in browser localStorage is not
              secure. Only use this on trusted devices.
            </p>
          </Message>
        </div>

        <!-- Clear Credentials Button (conditional) -->
        <div v-if="rememberMe" class="flex justify-content-center">
          <Button
            label="Clear Saved Credentials"
            icon="pi pi-trash"
            severity="secondary"
            size="small"
            @click="clearCredentials"
          />
        </div>

        <Button
          :label="connecting ? 'Connecting...' : 'Connect to Server'"
          icon="pi pi-link"
          :disabled="!isConfigValid || connecting"
          :loading="connecting"
          class="w-full"
          @click="handleConnect"
        />

        <Message v-if="connectionError" severity="error" :closable="false">
          {{ connectionError }}
        </Message>

        <Message severity="info" :closable="false" class="border-left-3 border-primary">
          <p class="m-0 text-sm line-height-3">
            <strong>Tip:</strong> Don't have a SIP server? You can use a free SIP service like
            <a href="https://www.antisip.com/" target="_blank" class="text-primary">Antisip</a> or set up a local Asterisk
            server for testing.
          </p>
        </Message>
      </div>
    </Panel>

    <!-- Connected Interface (show when connected OR in simulation mode) -->
    <div v-else>
      <!-- Simulation indicator -->
      <Tag v-if="isSimulationMode" severity="help" class="mb-4 w-full text-center p-2">
        <i class="pi pi-play mr-2"></i>Simulation Mode Active
      </Tag>

      <!-- Device Selection -->
      <div v-if="!isSimulationMode" class="mb-4">
        <DeviceSelection />
      </div>

      <!-- Call Interface (Idle state) -->
      <Panel v-if="effectiveCallState === 'idle'" class="mb-4">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-phone"></i>
            <span class="font-semibold">Make a Call</span>
          </div>
        </template>

        <div class="flex gap-2 mb-4">
          <InputText
            v-model="dialNumber"
            placeholder="Enter SIP URI or number (e.g., sip:2000@example.com)"
            class="flex-1"
            @keyup.enter="handleMakeCall"
          />
          <Button
            label="Call"
            icon="pi pi-phone"
            severity="success"
            :disabled="!dialNumber.trim() && !isSimulationMode"
            @click="handleMakeCall"
          />
        </div>

        <!-- Quick dial buttons for simulation -->
        <div v-if="isSimulationMode" class="border-top-1 surface-border pt-4">
          <div class="text-500 text-sm mb-3">Quick Dial (Simulation):</div>
          <div class="flex flex-wrap gap-2">
            <Button
              label="Sales"
              icon="pi pi-briefcase"
              severity="secondary"
              size="small"
              @click="quickDial('sip:sales@company.com', 'Sales Department')"
            />
            <Button
              label="Support"
              icon="pi pi-wrench"
              severity="secondary"
              size="small"
              @click="quickDial('sip:support@company.com', 'Tech Support')"
            />
            <Button
              label="Reception"
              icon="pi pi-building"
              severity="secondary"
              size="small"
              @click="quickDial('sip:reception@company.com', 'Reception')"
            />
          </div>
        </div>
      </Panel>

      <!-- Incoming Call -->
      <Panel
        v-else-if="effectiveCallState === 'ringing' || effectiveCallState === 'incoming'"
        class="mb-4 incoming-call-panel"
      >
        <div class="text-center py-4">
          <div class="incoming-animation">
            <div class="ring-circle"></div>
            <div class="ring-circle delay-1"></div>
            <div class="ring-circle delay-2"></div>
            <i class="pi pi-phone phone-icon"></i>
          </div>
          <div class="mt-4">
            <Tag severity="success" class="mb-2">Incoming Call</Tag>
            <div class="text-2xl font-semibold text-900 mt-2">{{ effectiveRemoteDisplayName || 'Unknown Caller' }}</div>
            <div class="text-500 mt-1">{{ effectiveRemoteUri }}</div>
          </div>
          <div class="flex justify-content-center gap-3 mt-4">
            <Button label="Answer" icon="pi pi-phone" severity="success" size="large" @click="handleAnswer" />
            <Button label="Reject" icon="pi pi-times" severity="danger" size="large" @click="handleReject" />
          </div>
        </div>
      </Panel>

      <!-- Connecting -->
      <Panel v-else-if="effectiveCallState === 'connecting'" class="mb-4">
        <div class="text-center py-4">
          <i class="pi pi-spin pi-spinner text-5xl text-primary mb-4"></i>
          <div class="text-xl font-semibold text-900 mb-2">Connecting...</div>
          <div class="text-500 mb-4">{{ effectiveRemoteUri }}</div>
          <Button label="Cancel" icon="pi pi-times" severity="danger" @click="handleHangup" />
        </div>
      </Panel>

      <!-- Active Call -->
      <Panel
        v-else-if="effectiveCallState === 'active' || effectiveCallState === 'on-hold'"
        class="mb-4"
      >
        <div class="text-center">
          <Tag :severity="effectiveIsOnHold ? 'warn' : 'success'" class="mb-3 text-lg px-3 py-2">
            <i :class="effectiveIsOnHold ? 'pi pi-pause' : 'pi pi-phone'" class="mr-2"></i>
            {{ effectiveIsOnHold ? 'On Hold' : 'In Call' }}
          </Tag>
          <div class="mb-2">
            <div class="text-xl font-semibold text-900">{{ effectiveRemoteDisplayName || 'Unknown' }}</div>
            <div class="text-500">{{ effectiveRemoteUri }}</div>
          </div>
          <div class="call-duration text-4xl font-light text-900 my-4">
            {{ formatDuration(effectiveDuration) }}
          </div>

          <!-- Call Controls -->
          <div class="flex flex-wrap justify-content-center gap-3">
            <Button
              :label="effectiveIsMuted ? 'Unmute' : 'Mute'"
              :icon="effectiveIsMuted ? 'pi pi-volume-up' : 'pi pi-volume-off'"
              :severity="effectiveIsMuted ? 'warn' : 'secondary'"
              @click="handleToggleMute"
            />
            <Button
              :label="effectiveIsOnHold ? 'Resume' : 'Hold'"
              :icon="effectiveIsOnHold ? 'pi pi-play' : 'pi pi-pause'"
              :severity="effectiveIsOnHold ? 'warn' : 'secondary'"
              @click="handleToggleHold"
            />
            <Button
              label="Hang Up"
              icon="pi pi-phone"
              severity="danger"
              @click="handleHangup"
            />
          </div>
        </div>
      </Panel>

      <!-- Call Ended -->
      <Panel v-else-if="effectiveCallState === 'ended'" class="mb-4">
        <div class="text-center py-4">
          <i class="pi pi-phone-slash text-5xl text-500 mb-3 opacity-50"></i>
          <div class="text-2xl font-medium text-500 mb-2">Call Ended</div>
          <div v-if="effectiveDuration" class="text-sm text-400">
            Duration: {{ formatDuration(effectiveDuration) }}
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCallSession } from '../../src'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import DeviceSelection from '../components/DeviceSelection.vue'

// PrimeVue components
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

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

/* Incoming call animation */
.incoming-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.ring-circle {
  position: absolute;
  inset: 0;
  border: 2px solid var(--green-500);
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
  color: var(--green-500);
  animation: phone-shake 0.5s ease-in-out infinite;
}

@keyframes phone-shake {
  0%, 100% {
    transform: translate(-50%, -50%) rotate(-10deg);
  }
  50% {
    transform: translate(-50%, -50%) rotate(10deg);
  }
}

/* Call duration monospace */
.call-duration {
  font-variant-numeric: tabular-nums;
  font-family: var(--font-family-monospace, monospace);
}

/* Border left for tip message */
:deep(.border-left-3) {
  border-left-width: 3px !important;
  border-left-style: solid !important;
}

/* Password input full width fix */
:deep(.p-password) {
  width: 100%;
}

:deep(.p-password-input) {
  width: 100%;
}
</style>
