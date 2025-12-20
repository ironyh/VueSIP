<template>
  <div class="presence-demo">
    <!-- Simulation Controls -->
    <SimulationControls
      :is-simulation-mode="isSimulationMode"
      :active-scenario="activeScenario"
      :state="effectiveCallState"
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

    <!-- Configuration Panel -->
    <Panel v-if="!effectiveIsConnected" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-cog"></i>
          <span class="font-semibold">SIP Server Configuration</span>
        </div>
      </template>

      <Message severity="info" :closable="false" class="mb-4">
        <p class="m-0 line-height-3">
          Configure your SIP server details to test SIP Presence (SUBSCRIBE/NOTIFY) functionality.
          You'll be able to set your status and watch other users' presence.
        </p>
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
            <strong>Tip:</strong> Presence (SUBSCRIBE/NOTIFY) functionality requires server support.
            Make sure your SIP server has presence features enabled.
          </p>
        </Message>
      </div>
    </Panel>

    <!-- Connected Interface -->
    <div v-else>
      <!-- Status Bar -->
      <div class="flex flex-wrap align-items-center justify-content-between gap-3 surface-100 border-round p-3 mb-4">
        <div class="flex align-items-center gap-4">
          <div class="flex align-items-center gap-2">
            <span class="status-dot connected"></span>
            <span class="text-sm">Connected{{ isSimulationMode ? ' (Simulated)' : '' }}</span>
          </div>
          <div class="flex align-items-center gap-2">
            <span class="status-dot" :class="{ connected: effectiveIsRegistered }"></span>
            <span class="text-sm">{{ effectiveIsRegistered ? 'Registered' : 'Not Registered' }}</span>
          </div>
        </div>
        <Button label="Disconnect" icon="pi pi-power-off" severity="secondary" size="small" @click="handleDisconnect" />
      </div>

      <!-- Own Status Section -->
      <Panel class="mb-4">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-user"></i>
            <span class="font-semibold">Your Presence Status</span>
          </div>
        </template>

        <div class="flex align-items-center gap-3 surface-100 border-round p-3 mb-4">
          <span class="status-indicator" :class="`status-${currentState}`"></span>
          <span class="font-medium">{{ formatStatus(currentState) }}</span>
          <span v-if="currentStatus?.statusMessage" class="text-500 font-italic">
            - {{ currentStatus.statusMessage }}
          </span>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <Button
            label="Available"
            :severity="currentState === 'available' ? 'success' : 'secondary'"
            :outlined="currentState !== 'available'"
            :disabled="!isRegistered"
            @click="handleSetStatus('available')"
          >
            <template #icon>
              <span class="status-dot available mr-2"></span>
            </template>
          </Button>
          <Button
            label="Away"
            :severity="currentState === 'away' ? 'warn' : 'secondary'"
            :outlined="currentState !== 'away'"
            :disabled="!isRegistered"
            @click="handleSetStatus('away')"
          >
            <template #icon>
              <span class="status-dot away mr-2"></span>
            </template>
          </Button>
          <Button
            label="Busy"
            :severity="currentState === 'busy' ? 'danger' : 'secondary'"
            :outlined="currentState !== 'busy'"
            :disabled="!isRegistered"
            @click="handleSetStatus('busy')"
          >
            <template #icon>
              <span class="status-dot busy mr-2"></span>
            </template>
          </Button>
          <Button
            label="Offline"
            :severity="currentState === 'offline' ? 'secondary' : 'secondary'"
            :outlined="currentState !== 'offline'"
            :disabled="!isRegistered"
            @click="handleSetStatus('offline')"
          >
            <template #icon>
              <span class="status-dot offline mr-2"></span>
            </template>
          </Button>
        </div>

        <div class="flex flex-column gap-2">
          <label for="status-message" class="font-medium">Status Message (Optional)</label>
          <InputText
            id="status-message"
            v-model="statusMessage"
            placeholder="e.g., In a meeting"
            :disabled="!isRegistered"
            class="w-full"
          />
        </div>
      </Panel>

      <!-- Watch Users Section -->
      <Panel class="mb-4">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-eye"></i>
            <span class="font-semibold">Watch User Presence</span>
          </div>
        </template>

        <p class="text-500 text-sm mb-3">
          Subscribe to another user's presence to see when their status changes.
        </p>

        <div class="flex gap-2 mb-3">
          <InputText
            v-model="targetUser"
            placeholder="sip:user@example.com"
            :disabled="!isRegistered"
            class="flex-1"
            @keyup.enter="handleWatchUser"
          />
          <Button
            :label="isWatching ? 'Subscribing...' : 'Watch User'"
            icon="pi pi-eye"
            :disabled="!targetUser.trim() || !isRegistered || isWatching"
            :loading="isWatching"
            @click="handleWatchUser"
          />
        </div>

        <Message v-if="watchError" severity="error" :closable="false">
          {{ watchError }}
        </Message>
      </Panel>

      <!-- Watched Users List -->
      <Panel v-if="watchedUsers.size > 0" class="mb-4">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-users"></i>
            <span class="font-semibold">Watched Users</span>
            <Tag severity="secondary" class="ml-2">{{ watchedUsers.size }}</Tag>
          </div>
        </template>

        <div class="flex flex-column gap-3">
          <div
            v-for="[uri, status] in Array.from(watchedUsers.entries())"
            :key="uri"
            class="flex align-items-start justify-content-between gap-3 surface-100 border-round p-3"
          >
            <div class="flex gap-3">
              <span class="status-indicator mt-1" :class="`status-${status.state}`"></span>
              <div>
                <div class="font-medium text-900">{{ uri }}</div>
                <div class="text-500 text-sm">
                  {{ formatStatus(status.state) }}
                  <span v-if="status.statusMessage" class="font-italic">
                    - {{ status.statusMessage }}
                  </span>
                </div>
                <div v-if="status.lastUpdate" class="text-400 text-xs mt-1">
                  Updated: {{ formatTime(status.lastUpdate) }}
                </div>
              </div>
            </div>
            <Button
              label="Unwatch"
              icon="pi pi-times"
              severity="danger"
              size="small"
              outlined
              @click="handleUnwatch(uri)"
            />
          </div>
        </div>

        <div v-if="watchedUsers.size > 1" class="mt-3">
          <Button label="Unwatch All" icon="pi pi-times-circle" severity="secondary" @click="handleUnwatchAll" />
        </div>
      </Panel>

      <!-- Empty State -->
      <div v-else class="flex flex-column align-items-center justify-content-center py-6 surface-100 border-round border-dashed border-1 surface-border mb-4">
        <i class="pi pi-users text-4xl text-300 mb-3"></i>
        <div class="text-500 mb-2">No users being watched</div>
        <div class="text-400 text-sm">Enter a SIP URI above to start watching a user's presence.</div>
      </div>

      <!-- Presence Events Log -->
      <Panel v-if="presenceEvents.length > 0">
        <template #header>
          <div class="flex align-items-center gap-2">
            <i class="pi pi-history"></i>
            <span class="font-semibold">Recent Events</span>
            <Tag severity="secondary" class="ml-2">{{ presenceEvents.length }}</Tag>
          </div>
        </template>

        <div class="flex flex-column gap-2 max-h-20rem overflow-auto">
          <div
            v-for="(event, index) in presenceEvents.slice(-10).reverse()"
            :key="index"
            class="flex align-items-center gap-3 surface-100 border-round p-2 text-sm"
          >
            <span class="text-400 text-xs white-space-nowrap">{{ formatTime(event.timestamp) }}</span>
            <Tag :severity="getEventSeverity(event.type)" class="text-xs">{{ event.type }}</Tag>
            <span class="text-700 flex-1">{{ formatEvent(event) }}</span>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSipClient, usePresence } from '../../src'
import { PresenceState, type PresenceEvent } from '../../src/types/presence.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// PrimeVue components
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Effective values - use simulation or real data based on mode
const effectiveIsConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : isConnected.value
)
const effectiveIsRegistered = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : isRegistered.value
)
const effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : 'idle'
)

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
const statusMessage = ref('')
const targetUser = ref('')
const isWatching = ref(false)
const watchError = ref('')
const presenceEvents = ref<PresenceEvent[]>([])

// SIP Client
const {
  connect,
  disconnect,
  isConnected,
  isRegistered,
  error: _sipError,
  updateConfig,
  getClient,
} = useSipClient()

// Presence
const sipClientRef = computed(() => getClient())
const {
  currentStatus,
  currentState,
  watchedUsers,
  subscriptionCount: _subscriptionCount,
  setStatus,
  subscribe,
  unsubscribe,
  unsubscribeAll,
  onPresenceEvent,
} = usePresence(sipClientRef)

// Listen to presence events
onPresenceEvent((event) => {
  presenceEvents.value.push(event)
  // Keep only last 50 events
  if (presenceEvents.value.length > 50) {
    presenceEvents.value = presenceEvents.value.slice(-50)
  }
})

// Validation
const isConfigValid = computed(() => {
  return !!(
    config.value.uri &&
    config.value.sipUri &&
    config.value.password &&
    config.value.uri.startsWith('ws')
  )
})

// Connection Handlers
async function handleConnect() {
  connecting.value = true
  connectionError.value = ''

  try {
    updateConfig({
      uri: config.value.uri,
      sipUri: config.value.sipUri,
      password: config.value.password,
      displayName: config.value.displayName || undefined,
    })

    await connect()
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

async function handleDisconnect() {
  try {
    await disconnect()
    presenceEvents.value = []
  } catch (error) {
    console.error('Disconnect error:', error)
  }
}

// Status Handlers
async function handleSetStatus(state: string) {
  if (!isRegistered.value) return

  try {
    await setStatus(state as PresenceState, {
      statusMessage: statusMessage.value || undefined,
    })
  } catch (error) {
    console.error('Set status error:', error)
    connectionError.value = error instanceof Error ? error.message : 'Failed to set status'
  }
}

// Watch Handlers
async function handleWatchUser() {
  if (!targetUser.value.trim() || !isRegistered.value) return

  isWatching.value = true
  watchError.value = ''

  try {
    await subscribe(targetUser.value.trim())
    targetUser.value = '' // Clear input on success
  } catch (error) {
    watchError.value = error instanceof Error ? error.message : 'Failed to watch user'
  } finally {
    isWatching.value = false
  }
}

async function handleUnwatch(uri: string) {
  try {
    await unsubscribe(uri)
  } catch (error) {
    console.error('Unwatch error:', error)
  }
}

async function handleUnwatchAll() {
  try {
    await unsubscribeAll()
  } catch (error) {
    console.error('Unwatch all error:', error)
  }
}

// Utility Functions
function formatStatus(state: string): string {
  const labels: Record<string, string> = {
    available: 'Available',
    away: 'Away',
    busy: 'Busy',
    offline: 'Offline',
    custom: 'Custom',
  }
  return labels[state] || state.charAt(0).toUpperCase() + state.slice(1)
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString()
}

function formatEvent(event: PresenceEvent): string {
  switch (event.type) {
    case 'updated':
      return `${event.uri} is now ${formatStatus(event.status.state)}`
    case 'subscribed':
      return `Subscribed to ${event.uri}`
    case 'unsubscribed':
      return `Unsubscribed from ${event.uri}`
    case 'published':
      return `Published status: ${formatStatus(event.status.state)}`
    default:
      return JSON.stringify(event)
  }
}

function getEventSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  switch (type) {
    case 'subscribed':
      return 'success'
    case 'unsubscribed':
      return 'warn'
    case 'updated':
      return 'info'
    case 'published':
      return 'secondary'
    default:
      return 'secondary'
  }
}
</script>

<style scoped>
.presence-demo {
  max-width: 800px;
  margin: 0 auto;
}

/* Status dots */
.status-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.connected {
  background: var(--green-500);
}

.status-dot:not(.connected) {
  background: var(--red-500);
}

.status-dot.available {
  background: var(--green-500);
}

.status-dot.away {
  background: var(--yellow-500);
}

.status-dot.busy {
  background: var(--red-500);
}

.status-dot.offline {
  background: var(--surface-400);
}

/* Status indicators */
.status-indicator {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.status-indicator.status-available {
  background: var(--green-500);
}

.status-indicator.status-away {
  background: var(--yellow-500);
}

.status-indicator.status-busy {
  background: var(--red-500);
}

.status-indicator.status-offline {
  background: var(--surface-400);
}

.status-indicator.status-custom {
  background: var(--blue-500);
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

/* Max height utility */
.max-h-20rem {
  max-height: 20rem;
}
</style>
