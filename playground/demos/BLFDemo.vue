<template>
  <div class="blf-demo">
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

    <!-- Configuration Panel -->
    <div v-if="!isConnected" class="config-panel">
      <h3>BLF (Busy Lamp Field) Demo</h3>
      <p class="info-text">
        Monitor extension states from Asterisk/FreePBX using SIP dialog subscriptions. This demo
        shows real-time BLF status for multiple extensions.
      </p>

      <div class="form-group">
        <label for="server-uri">Server URI (WebSocket)</label>
        <input
          id="server-uri"
          v-model="config.uri"
          type="text"
          placeholder="wss://pbx.example.com:8089/ws"
          :disabled="connecting"
        />
        <small>Example: wss://pbx.yourdomain.com:8089/ws</small>
      </div>

      <div class="form-group">
        <label for="sip-uri">SIP URI</label>
        <input
          id="sip-uri"
          v-model="config.sipUri"
          type="text"
          placeholder="sip:1000@pbx.example.com"
          :disabled="connecting"
        />
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

      <button
        class="btn btn-primary"
        :disabled="!isConfigValid || connecting"
        @click="handleConnect"
      >
        {{ connecting ? 'Connecting...' : 'Connect to PBX' }}
      </button>

      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>

      <div class="demo-tip">
        <strong>Tip:</strong> This demo uses SIP SUBSCRIBE with Event: dialog to monitor extension
        states. Requires Asterisk/FreePBX with hints configured.
      </div>
    </div>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-item">
          <span class="status-dot connected"></span>
          <span>Connected</span>
        </div>
        <div class="status-item">
          <span class="status-dot" :class="{ connected: isRegistered }"></span>
          <span>{{ isRegistered ? 'Registered' : 'Not Registered' }}</span>
        </div>
        <button class="btn btn-sm btn-secondary" @click="handleDisconnect">Disconnect</button>
      </div>

      <!-- BLF Panel -->
      <div class="blf-panel">
        <!-- Add Extensions Section -->
        <div class="add-section">
          <h3>Monitor Extensions (BLF)</h3>
          <p class="info-text">Enter extension URIs to monitor their call state in real-time.</p>

          <div class="add-form">
            <input
              v-model="newExtension"
              type="text"
              placeholder="sip:6001@pbx.example.com"
              class="extension-input"
              :disabled="!isRegistered"
              @keyup.enter="handleAddExtension"
            />
            <button
              class="btn btn-primary"
              :disabled="!newExtension.trim() || !isRegistered || isSubscribing"
              @click="handleAddExtension"
            >
              {{ isSubscribing ? 'Adding...' : '+ Add Extension' }}
            </button>
          </div>

          <!-- Quick Add Multiple -->
          <div class="quick-add">
            <label>Quick add range:</label>
            <input
              v-model="rangeStart"
              type="number"
              placeholder="6001"
              class="range-input"
              :disabled="!isRegistered"
            />
            <span>to</span>
            <input
              v-model="rangeEnd"
              type="number"
              placeholder="6010"
              class="range-input"
              :disabled="!isRegistered"
            />
            <button
              class="btn btn-secondary btn-sm"
              :disabled="!rangeStart || !rangeEnd || !isRegistered"
              @click="handleAddRange"
            >
              Add Range
            </button>
          </div>

          <div v-if="subscribeError" class="error-message">
            {{ subscribeError }}
          </div>
        </div>

        <!-- BLF Grid -->
        <div v-if="watchedExtensions.size > 0" class="blf-grid-section">
          <h3>
            Extension Status ({{ watchedExtensions.size }})
            <button class="btn btn-sm btn-secondary" @click="toggleDisplayMode">
              {{ showIcons ? 'Hide Icons' : 'Show Icons' }}
            </button>
          </h3>

          <div class="blf-grid">
            <div
              v-for="[uri, status] in Array.from(watchedExtensions.entries())"
              :key="uri"
              class="blf-button"
              :class="[`state-${status.state}`, { 'has-animation': hasAnimation(status.state) }]"
              @click="handleBlfClick(uri, status)"
            >
              <div class="blf-icon" v-if="showIcons">
                {{ getDisplayOptions(status.state).icon }}
              </div>
              <div
                class="blf-indicator"
                :style="{ backgroundColor: getDisplayOptions(status.state).color }"
              ></div>
              <div class="blf-info">
                <div class="blf-extension">{{ extractExtension(uri) }}</div>
                <div class="blf-state">{{ getDisplayOptions(status.state).label }}</div>
                <div v-if="status.remoteIdentity" class="blf-remote">
                  {{ status.direction === 'initiator' ? '→' : '←' }}
                  {{ extractExtension(status.remoteIdentity) }}
                </div>
              </div>
              <button
                class="btn-remove"
                @click.stop="handleRemoveExtension(uri)"
                title="Stop monitoring"
              >
                X
              </button>
            </div>
          </div>

          <div class="grid-actions">
            <button class="btn btn-secondary" @click="handleRemoveAll">Remove All</button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <p>No extensions being monitored</p>
          <p class="info-text">Add extension URIs above to start monitoring their BLF status.</p>
        </div>

        <!-- Events Log -->
        <div v-if="dialogEvents.length > 0" class="events-log">
          <h3>
            Recent Events ({{ dialogEvents.length }})
            <button class="btn btn-sm btn-secondary" @click="dialogEvents = []">Clear</button>
          </h3>
          <div class="events-list">
            <div
              v-for="(event, index) in dialogEvents.slice(-15).reverse()"
              :key="index"
              class="event-item"
              :class="`event-${event.type}`"
            >
              <span class="event-time">{{ formatTime(event.timestamp) }}</span>
              <span class="event-type">{{ event.type }}</span>
              <span class="event-details">{{ formatDialogEvent(event) }}</span>
            </div>
          </div>
        </div>

        <!-- State Legend -->
        <div class="state-legend">
          <h4>State Legend</h4>
          <div class="legend-grid">
            <div class="legend-item" v-for="state in dialogStates" :key="state">
              <span class="legend-icon">{{ getDisplayOptions(state).icon }}</span>
              <span
                class="legend-indicator"
                :style="{ backgroundColor: getDisplayOptions(state).color }"
              ></span>
              <span class="legend-label">{{ getDisplayOptions(state).label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSipClient } from '../../src'
import { useDialog } from '../../src/composables/useDialog'
import { DialogState, type DialogEvent, type DialogStatus } from '../../src/types/presence.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// localStorage keys
const BLF_EXTENSIONS_KEY = 'vuesip-blf-extensions'

// Configuration
const config = ref({
  uri: '',
  sipUri: '',
  password: '',
})

// State
const connecting = ref(false)
const connectionError = ref('')
const newExtension = ref('')
const rangeStart = ref<number | null>(null)
const rangeEnd = ref<number | null>(null)
const isSubscribing = ref(false)
const subscribeError = ref('')
const dialogEvents = ref<DialogEvent[]>([])
const showIcons = ref(true)
const savedExtensions = ref<string[]>([])

// All dialog states for legend
const dialogStates = Object.values(DialogState)

// SIP Client
const {
  connect,
  disconnect,
  isConnected: realIsConnected,
  isRegistered: realIsRegistered,
  updateConfig,
  getClient,
} = useSipClient()

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)
const isRegistered = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsRegistered.value
)

// Dialog/BLF
const sipClientRef = computed(() => getClient())
const {
  watchedExtensions,
  subscriptionCount: _subscriptionCount,
  subscribe,
  unsubscribe,
  subscribeMany,
  unsubscribeAll,
  getDisplayOptions,
  onDialogEvent,
} = useDialog(sipClientRef)

// Listen to dialog events
onDialogEvent((event) => {
  dialogEvents.value.push(event)
  // Keep only last 100 events
  if (dialogEvents.value.length > 100) {
    dialogEvents.value = dialogEvents.value.slice(-100)
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

// Load credentials from localStorage (shared with other demos)
const loadCredentials = () => {
  const saved = localStorage.getItem('vuesip-credentials')
  if (saved) {
    try {
      const credentials = JSON.parse(saved)
      config.value.uri = credentials.uri || ''
      config.value.sipUri = credentials.sipUri || ''
      if (credentials.password) {
        config.value.password = credentials.password
      }
    } catch (error) {
      console.error('Failed to load credentials:', error)
    }
  }
}

// Load saved BLF extensions from localStorage
const loadSavedExtensions = () => {
  const saved = localStorage.getItem(BLF_EXTENSIONS_KEY)
  if (saved) {
    try {
      savedExtensions.value = JSON.parse(saved)
      console.log('📞 Loaded saved BLF extensions:', savedExtensions.value)
    } catch (error) {
      console.error('Failed to load BLF extensions:', error)
      savedExtensions.value = []
    }
  }
}

// Save BLF extensions to localStorage
const saveExtensions = () => {
  const extensions = Array.from(watchedExtensions.value.keys())
  localStorage.setItem(BLF_EXTENSIONS_KEY, JSON.stringify(extensions))
  console.log('💾 Saved BLF extensions:', extensions)
}

// Auto-subscribe to saved extensions when registered
const autoSubscribeSavedExtensions = async () => {
  if (!isRegistered.value || savedExtensions.value.length === 0) return

  console.log('🔄 Auto-subscribing to saved extensions:', savedExtensions.value)
  isSubscribing.value = true

  try {
    await subscribeMany(savedExtensions.value)
  } catch (error) {
    console.error('Failed to auto-subscribe to saved extensions:', error)
  } finally {
    isSubscribing.value = false
  }
}

// Watch for changes to save automatically
watch(
  () => watchedExtensions.value.size,
  () => {
    saveExtensions()
  }
)

// Watch for registration to auto-subscribe
watch(isRegistered, (registered) => {
  if (registered && savedExtensions.value.length > 0) {
    // Small delay to ensure everything is ready
    setTimeout(autoSubscribeSavedExtensions, 500)
  }
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
    await unsubscribeAll()
    await disconnect()
    dialogEvents.value = []
  } catch (error) {
    console.error('Disconnect error:', error)
  }
}

// BLF Handlers
async function handleAddExtension() {
  if (!newExtension.value.trim() || !isRegistered.value) return

  isSubscribing.value = true
  subscribeError.value = ''

  try {
    await subscribe(newExtension.value.trim())
    newExtension.value = ''
  } catch (error) {
    subscribeError.value = error instanceof Error ? error.message : 'Failed to subscribe'
  } finally {
    isSubscribing.value = false
  }
}

async function handleAddRange() {
  if (!rangeStart.value || !rangeEnd.value || !isRegistered.value) return

  isSubscribing.value = true
  subscribeError.value = ''

  try {
    // Extract domain from config sipUri
    const domain = config.value.sipUri.split('@')[1]
    if (!domain) {
      throw new Error('Invalid SIP URI - cannot extract domain')
    }

    const uris: string[] = []
    for (let i = rangeStart.value; i <= rangeEnd.value; i++) {
      uris.push(`sip:${i}@${domain}`)
    }

    await subscribeMany(uris)
    rangeStart.value = null
    rangeEnd.value = null
  } catch (error) {
    subscribeError.value = error instanceof Error ? error.message : 'Failed to subscribe range'
  } finally {
    isSubscribing.value = false
  }
}

async function handleRemoveExtension(uri: string) {
  try {
    await unsubscribe(uri)
  } catch (error) {
    console.error('Unsubscribe error:', error)
  }
}

async function handleRemoveAll() {
  try {
    await unsubscribeAll()
  } catch (error) {
    console.error('Unsubscribe all error:', error)
  }
}

function handleBlfClick(uri: string, status: DialogStatus) {
  // Could initiate a call to this extension
  console.log('BLF clicked:', uri, status)
  // Future: could trigger call or speed dial
}

function toggleDisplayMode() {
  showIcons.value = !showIcons.value
}

// Utility Functions
function extractExtension(uri: string): string {
  // Extract extension number from SIP URI
  const match = uri.match(/sip:(\d+)@/) || uri.match(/:(\d+)@/)
  return match ? match[1] : uri.replace('sip:', '').split('@')[0]
}

function hasAnimation(state: DialogState): boolean {
  return state === DialogState.Ringing
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString()
}

function formatDialogEvent(event: DialogEvent): string {
  switch (event.type) {
    case 'updated':
      const display = getDisplayOptions(event.status!.state)
      return `${extractExtension(event.uri)} → ${display.label}${event.status?.remoteIdentity ? ` (${extractExtension(event.status.remoteIdentity)})` : ''}`
    case 'subscribed':
      return `Started monitoring ${extractExtension(event.uri)}`
    case 'unsubscribed':
      return `Stopped monitoring ${extractExtension(event.uri)}`
    case 'refreshed':
      return `Refreshed subscription for ${extractExtension(event.uri)}`
    case 'error':
      return `Error: ${event.error}`
    default:
      return JSON.stringify(event)
  }
}

// Initialize
onMounted(() => {
  loadCredentials()
  loadSavedExtensions()
})
</script>

<style scoped>
.blf-demo {
  max-width: 900px;
  margin: 0 auto;
}

/* Config Panel */
.config-panel {
  padding: 2rem;
}

.config-panel h3 {
  margin-bottom: 1rem;
  color: #333;
}

.info-text {
  margin-bottom: 1.5rem;
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 0.875rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f0f9ff;
  border-left: 4px solid #3b82f6;
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Connected Interface */
.connected-interface {
  padding: 2rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.connected {
  background: #10b981;
}

/* BLF Panel */
.blf-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.add-section,
.blf-grid-section,
.events-log,
.state-legend {
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.add-section h3,
.blf-grid-section h3,
.events-log h3 {
  margin-bottom: 1rem;
  color: #111827;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Add Form */
.add-form {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.extension-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.quick-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.875rem;
}

.quick-add label {
  font-weight: 500;
}

.range-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  text-align: center;
}

/* BLF Grid */
.blf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.blf-button {
  position: relative;
  padding: 1rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.blf-button:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.blf-icon {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.blf-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.blf-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.blf-extension {
  font-weight: 600;
  font-size: 1.25rem;
  color: #111827;
}

.blf-state {
  font-size: 0.75rem;
  color: #6b7280;
}

.blf-remote {
  font-size: 0.7rem;
  color: #9ca3af;
}

.btn-remove {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.blf-button:hover .btn-remove {
  opacity: 1;
}

/* State-specific styles */
.blf-button.state-idle {
  background: #f0fdf4;
  border-color: #86efac;
}

.blf-button.state-ringing {
  background: #fef3c7;
  border-color: #fbbf24;
}

.blf-button.state-ringing.has-animation {
  animation: pulse 1s ease-in-out infinite;
}

.blf-button.state-in-call {
  background: #fef2f2;
  border-color: #fca5a5;
}

.blf-button.state-on-hold {
  background: #f5f3ff;
  border-color: #c4b5fd;
}

.blf-button.state-trying {
  background: #fff7ed;
  border-color: #fdba74;
}

.blf-button.state-unavailable {
  background: #f3f4f6;
  border-color: #d1d5db;
  opacity: 0.7;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
  }
}

/* Grid Actions */
.grid-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Empty State */
.empty-state {
  padding: 3rem;
  text-align: center;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  color: #6b7280;
}

.empty-state p:first-child {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

/* Events Log */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 250px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
  font-size: 0.8rem;
}

.event-item.event-updated {
  background: #ecfdf5;
}

.event-item.event-error {
  background: #fef2f2;
}

.event-time {
  color: #9ca3af;
  font-size: 0.7rem;
  white-space: nowrap;
}

.event-type {
  color: #667eea;
  font-weight: 500;
  min-width: 80px;
}

.event-details {
  color: #374151;
  flex: 1;
}

/* State Legend */
.state-legend {
  background: #f9fafb;
}

.state-legend h4 {
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.legend-icon {
  font-size: 1rem;
}

.legend-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-label {
  color: #374151;
}

/* Responsive */
@media (max-width: 768px) {
  .add-form {
    flex-direction: column;
  }

  .quick-add {
    flex-wrap: wrap;
  }

  .blf-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .status-bar {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
