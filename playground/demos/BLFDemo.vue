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
          aria-required="true"
          :aria-disabled="connecting"
          aria-describedby="server-uri-hint"
        />
        <small id="server-uri-hint">Example: wss://pbx.yourdomain.com:8089/ws</small>
      </div>

      <div class="form-group">
        <label for="sip-uri">SIP URI</label>
        <input
          id="sip-uri"
          v-model="config.sipUri"
          type="text"
          placeholder="sip:1000@pbx.example.com"
          :disabled="connecting"
          aria-required="true"
          :aria-disabled="connecting"
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
          aria-required="true"
          :aria-disabled="connecting"
        />
      </div>

      <Button
        :label="connecting ? 'Connecting...' : 'Connect to PBX'"
        :disabled="!isConfigValid || connecting"
        @click="handleConnect"
        :aria-disabled="!isConfigValid || connecting"
        aria-label="Connect to PBX server"
      />

      <div v-if="connectionError" class="error-message" role="alert">
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
        <Button label="Disconnect" severity="secondary" size="small" @click="handleDisconnect" />
      </div>

      <!-- BLF Panel -->
      <div class="blf-panel">
        <!-- Add Extensions Section -->
        <div class="add-section">
          <h3>Monitor Extensions (BLF)</h3>
          <p class="info-text">Enter extension URIs to monitor their call state in real-time.</p>

          <div class="add-form">
            <label for="new-extension-input" class="sr-only">Extension URI to monitor</label>
            <input
              id="new-extension-input"
              v-model="newExtension"
              type="text"
              placeholder="sip:6001@pbx.example.com"
              class="extension-input"
              :disabled="!isRegistered"
              @keyup.enter="handleAddExtension"
              :aria-disabled="!isRegistered"
              aria-required="true"
            />
            <Button
              :label="isSubscribing ? 'Adding...' : '+ Add Extension'"
              :disabled="!newExtension.trim() || !isRegistered || isSubscribing"
              @click="handleAddExtension"
              :aria-disabled="!newExtension.trim() || !isRegistered || isSubscribing"
              aria-label="Add extension to monitoring list"
            />
          </div>

          <!-- Quick Add Multiple -->
          <div class="quick-add">
            <label for="range-start-input">Quick add range:</label>
            <input
              id="range-start-input"
              v-model="rangeStart"
              type="number"
              placeholder="6001"
              class="range-input"
              :disabled="!isRegistered"
              :aria-disabled="!isRegistered"
              aria-label="Range start extension number"
            />
            <span>to</span>
            <label for="range-end-input" class="sr-only">Range end extension number</label>
            <input
              id="range-end-input"
              v-model="rangeEnd"
              type="number"
              placeholder="6010"
              class="range-input"
              :disabled="!isRegistered"
              :aria-disabled="!isRegistered"
              aria-label="Range end extension number"
            />
            <Button
              label="Add Range"
              severity="secondary"
              size="small"
              :disabled="!rangeStart || !rangeEnd || !isRegistered"
              @click="handleAddRange"
              :aria-disabled="!rangeStart || !rangeEnd || !isRegistered"
              aria-label="Add extension number range to monitoring"
            />
          </div>

          <div v-if="subscribeError" class="error-message">
            {{ subscribeError }}
          </div>
        </div>

        <!-- BLF Grid -->
        <div v-if="watchedExtensions.size > 0" class="blf-grid-section">
          <h3>
            Extension Status ({{ watchedExtensions.size }})
            <Button
              :label="showIcons ? 'Hide Icons' : 'Show Icons'"
              severity="secondary"
              size="small"
              @click="toggleDisplayMode"
            />
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
              <Button
                label="X"
                class="btn-remove"
                size="small"
                @click.stop="handleRemoveExtension(uri)"
                title="Stop monitoring"
              />
            </div>
          </div>

          <div class="grid-actions">
            <Button label="Remove All" severity="secondary" @click="handleRemoveAll" />
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
            <Button label="Clear" severity="secondary" size="small" @click="dialogEvents = []" />
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
import { Button } from './shared-components'

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
  color: var(--vuesip-text-primary);
}

.info-text {
  margin-bottom: 1.5rem;
  color: var(--vuesip-text-secondary);
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
  color: var(--vuesip-text-primary);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius);
  font-size: 0.875rem;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--vuesip-text-tertiary);
  font-size: 0.75rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--red-50);
  border: 1px solid var(--red-500);
  border-radius: 6px;
  color: var(--red-900);
  font-size: 0.875rem;
}

.demo-tip {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--blue-50);
  border-left: 4px solid var(--blue-500);
  border-radius: 6px;
  font-size: 0.875rem;
}

/* Connected Interface */
.connected-interface {
  padding: 2rem;
}

.status-bar {
  display: flex;
  align-items: center;
  background: var(--surface-section);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .status-bar {
    margin-bottom: 2rem;
  }
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
  background: var(--red-500);
}

.status-dot.connected {
  background: var(--green-500);
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
  padding: 1rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
}

@media (min-width: 640px) {
  .add-section,
  .blf-grid-section,
  .events-log,
  .state-legend {
    padding: 1.5rem;
  }
}

.add-section h3,
.blf-grid-section h3,
.events-log h3 {
  margin-bottom: 1rem;
  color: var(--text-color);
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
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.quick-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--surface-section);
  border-radius: 6px;
  font-size: 0.875rem;
}

.quick-add label {
  font-weight: 500;
}

.range-input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  text-align: center;
}

/* BLF Grid */
.blf-grid {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .blf-grid {
    gap: 1rem;
  }
}

.blf-button {
  position: relative;
  padding: 0.875rem 0.5rem;
  background: var(--surface-section);
  border: 2px solid var(--surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  min-height: 44px;
}

@media (min-width: 640px) {
  .blf-button {
    padding: 1rem;
  }
}

.blf-button:hover {
  border-color: var(--primary-500);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.blf-icon {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}

@media (min-width: 640px) {
  .blf-icon {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
}

.blf-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--surface-0);
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
  color: var(--text-color);
}

.blf-state {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.blf-remote {
  font-size: 0.7rem;
  color: var(--text-color-secondary);
}

.btn-remove {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 20px;
  height: 20px;
  background: var(--red-500);
  color: var(--surface-0);
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
  background: var(--green-50);
  border-color: var(--green-300);
}

.blf-button.state-ringing {
  background: var(--yellow-50);
  border-color: var(--yellow-400);
}

.blf-button.state-ringing.has-animation {
  animation: pulse 1s ease-in-out infinite;
}

.blf-button.state-in-call {
  background: var(--red-50);
  border-color: var(--red-500);
}

.blf-button.state-on-hold {
  background: var(--purple-50);
  border-color: var(--purple-300);
}

.blf-button.state-trying {
  background: var(--orange-50);
  border-color: var(--orange-300);
}

.blf-button.state-unavailable {
  background: var(--surface-section);
  border-color: var(--surface-border);
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
  padding: 2rem 1rem;
  text-align: center;
  background: var(--surface-section);
  border: 2px dashed var(--surface-border);
  border-radius: 8px;
  color: var(--text-color-secondary);
}

@media (min-width: 640px) {
  .empty-state {
    padding: 3rem;
  }
}

.empty-state p:first-child {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

@media (min-width: 640px) {
  .empty-state p:first-child {
    font-size: 2rem;
  }
}

/* Events Log */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .events-list {
    max-height: 250px;
  }
}

.event-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--surface-section);
  border-radius: 6px;
  font-size: 0.75rem;
}

@media (min-width: 640px) {
  .event-item {
    flex-direction: row;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
}

.event-item.event-updated {
  background: var(--green-50);
}

.event-item.event-error {
  background: var(--red-50);
}

.event-time {
  color: var(--text-color-secondary);
  font-size: 0.7rem;
  white-space: nowrap;
}

.event-type {
  color: var(--primary-500);
  font-weight: 500;
  min-width: 80px;
}

.event-details {
  color: var(--text-color);
  flex: 1;
}

/* State Legend */
.state-legend {
  background: var(--vuesip-bg-secondary);
}

.state-legend h4 {
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--vuesip-text-tertiary);
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
  color: var(--vuesip-text-primary);
}

/* Mobile-First Responsive - Base styles for mobile (320px+) */

/* Add Form - Mobile: column, Tablet+: row */
.add-form {
  flex-direction: column;
}

@media (min-width: 640px) {
  .add-form {
    flex-direction: row;
  }
}

/* Quick Add - Mobile: wrap, Tablet+: nowrap */
.quick-add {
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .quick-add {
    flex-wrap: nowrap;
  }
}

/* BLF Grid - Mobile: 2 columns, Tablet: 3, Desktop: 4+ */
.blf-grid {
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 640px) {
  .blf-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .blf-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}

/* Status Bar - Mobile: column, Tablet+: row */
.status-bar {
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0.75rem;
}

@media (min-width: 640px) {
  .status-bar {
    flex-direction: row;
    justify-content: space-between;
    padding: 1rem;
  }
}
</style>
