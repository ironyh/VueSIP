<template>
  <div class="parking-demo">
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

    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">P</span>
          <span>Call Parking</span>
        </div>
      </template>
      <template #subtitle>Park and retrieve calls from parking lots</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to manage call parking
          </Message>
          <div class="connection-form">
            <InputText v-model="amiUrl" placeholder="ws://pbx:8089/ws" class="url-input" />
            <Button label="Connect" icon="pi pi-link" @click="connectAmi" :loading="connecting" />
          </div>
        </div>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <Tag
              :severity="isConnected ? 'success' : 'danger'"
              :value="isConnected ? 'Connected' : 'Disconnected'"
            />
            <Tag severity="info" :value="`${totalParkedCalls} parked`" />
            <Tag severity="secondary" :value="`${parkingLotsList.length} lots`" />
          </div>

          <!-- Parking Lots Overview -->
          <Panel header="Parking Lots" :toggleable="true" class="section-panel">
            <div class="parking-lots-actions">
              <Button
                label="Refresh All"
                icon="pi pi-refresh"
                size="small"
                @click="refreshAll"
                :loading="isLoading"
              />
              <Button
                label="Load Lots"
                icon="pi pi-download"
                size="small"
                severity="secondary"
                @click="loadParkingLots"
              />
            </div>
            <div v-if="parkingLotsList.length > 0" class="parking-lots-grid">
              <div v-for="lot in parkingLotsList" :key="lot.name" class="parking-lot-card">
                <div class="lot-header">
                  <span class="lot-name">{{ lot.name }}</span>
                  <Tag
                    :severity="lot.calls.length > 0 ? 'warning' : 'success'"
                    :value="`${lot.calls.length} calls`"
                  />
                </div>
                <div class="lot-info">
                  <span>Spaces: {{ lot.startSpace }} - {{ lot.endSpace }}</span>
                </div>
                <div v-if="lot.calls.length > 0" class="lot-calls">
                  <div v-for="call in lot.calls" :key="call.parkingSpace" class="parked-call-mini">
                    <span class="space-number">{{ call.parkingSpace }}</span>
                    <span class="caller-info">{{ call.callerIdNum || 'Unknown' }}</span>
                    <Button
                      icon="pi pi-phone"
                      size="small"
                      severity="success"
                      @click="retrieveCallAction(call.parkingSpace, lot.name)"
                      v-tooltip="'Retrieve'"
                    />
                  </div>
                </div>
                <div v-else class="lot-empty">
                  <i class="pi pi-inbox"></i>
                  <span>No parked calls</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <i class="pi pi-car"></i>
              <span>No parking lots found</span>
              <small>Click "Load Lots" to refresh</small>
            </div>
          </Panel>

          <!-- All Parked Calls -->
          <Panel header="Parked Calls" :toggleable="true" class="section-panel">
            <DataTable
              :value="parkedCalls"
              size="small"
              :rows="10"
              :paginator="parkedCalls.length > 10"
            >
              <Column field="parkingSpace" header="Space" sortable style="width: 80px">
                <template #body="{ data }">
                  <Tag severity="info" :value="data.parkingSpace" class="space-tag" />
                </template>
              </Column>
              <Column field="callerIdNum" header="Caller" sortable />
              <Column field="callerIdName" header="Name" />
              <Column field="parkingLot" header="Lot" sortable />
              <Column header="Duration">
                <template #body="{ data }">
                  {{ formatDuration(data.parkingDuration) }}
                </template>
              </Column>
              <Column header="Timeout">
                <template #body="{ data }">
                  <ProgressBar
                    :value="getTimeoutProgress(data)"
                    :showValue="false"
                    style="height: 6px; width: 60px"
                  />
                  <small>{{ data.parkingTimeout }}s</small>
                </template>
              </Column>
              <Column header="Actions" style="width: 100px">
                <template #body="{ data }">
                  <Button
                    icon="pi pi-phone"
                    size="small"
                    severity="success"
                    @click="retrieveCallAction(data.parkingSpace, data.parkingLot)"
                    v-tooltip="'Retrieve'"
                  />
                </template>
              </Column>
            </DataTable>
            <div v-if="parkedCalls.length === 0" class="empty-state">
              <i class="pi pi-check-circle"></i>
              <span>No parked calls</span>
            </div>
          </Panel>

          <!-- Park Call Form -->
          <Panel header="Park Call" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="park-form">
              <div class="form-field">
                <label>Channel</label>
                <InputText v-model="parkForm.channel" placeholder="PJSIP/1001-00000001" />
              </div>
              <div class="form-field">
                <label>Parking Lot</label>
                <Dropdown
                  v-model="parkForm.parkingLot"
                  :options="parkingLotOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="default"
                />
              </div>
              <div class="form-field">
                <label>Timeout (sec)</label>
                <InputNumber v-model="parkForm.timeout" :min="30" :max="3600" />
              </div>
              <Button
                label="Park Call"
                icon="pi pi-download"
                @click="parkCallAction"
                :loading="isLoading"
                :disabled="!parkForm.channel"
              />
            </div>
          </Panel>

          <!-- Event Log -->
          <Panel header="Parking Events" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="event-log">
              <div
                v-for="(event, index) in eventLog"
                :key="index"
                class="event-item"
                :class="event.type"
              >
                <i :class="getEventIcon(event.type)"></i>
                <span class="event-message">{{ event.message }}</span>
                <span class="event-time">{{ formatTime(event.timestamp) }}</span>
              </div>
              <div v-if="eventLog.length === 0" class="empty-state small">
                <span>No events yet</span>
              </div>
            </div>
          </Panel>
        </template>

        <Divider />

        <h4>Code Example</h4>
        <pre class="code-block">{{ codeExample }}</pre>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAmiParking } from '@/composables'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import ProgressBar from 'primevue/progressbar'
import Message from 'primevue/message'
import Divider from 'primevue/divider'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Connection - use standardized storage key
const amiUrl = ref(localStorage.getItem('vuesip-ami-url') || 'ws://localhost:8089/ws')
const connecting = ref(false)
const realIsConnected = computed(() => playgroundAmiClient.isConnected.value)

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)

const connectAmi = async () => {
  connecting.value = true
  try {
    localStorage.setItem('vuesip-ami-url', amiUrl.value)
    await playgroundAmiClient.connect({ url: amiUrl.value })
  } catch (e) {
    console.error('Failed to connect:', e)
  } finally {
    connecting.value = false
  }
}

// Create a computed ref for the AMI client
const amiClientRef = computed(() => playgroundAmiClient.getClient())

// Parking composable
const {
  parkingLots,
  parkedCalls,
  isLoading,
  totalParkedCalls,
  getParkingLots,
  parkCall,
  retrieveCall,
  refreshParkingLot,
  onParkingEvent,
} = useAmiParking(amiClientRef, {
  onCallParked: (call) => {
    addEvent('parked', `Call parked in space ${call.parkingSpace} from ${call.callerIdNum}`)
  },
  onCallRetrieved: (call) => {
    addEvent('retrieved', `Call retrieved from space ${call.parkingSpace}`)
  },
  onCallTimeout: (call) => {
    addEvent('timeout', `Call in space ${call.parkingSpace} timed out`)
  },
  onCallGiveUp: (call) => {
    addEvent('giveup', `Call in space ${call.parkingSpace} hung up`)
  },
})

// Convert Map to array for display
const parkingLotsList = computed(() => Array.from(parkingLots.value.values()))

const parkingLotOptions = computed(() =>
  parkingLotsList.value.map((lot) => ({ label: lot.name, value: lot.name }))
)

// Event log
interface EventLogEntry {
  type: string
  message: string
  timestamp: Date
}

const eventLog = ref<EventLogEntry[]>([])

const addEvent = (type: string, message: string) => {
  eventLog.value.unshift({
    type,
    message,
    timestamp: new Date(),
  })
  // Keep last 20 events
  if (eventLog.value.length > 20) {
    eventLog.value.pop()
  }
}

// Park form
const parkForm = reactive({
  channel: '',
  parkingLot: 'default',
  timeout: 120,
})

// Actions
const loadParkingLots = async () => {
  try {
    await getParkingLots()
  } catch (e) {
    console.error('Failed to load parking lots:', e)
  }
}

const refreshAll = async () => {
  try {
    await refreshParkingLot()
  } catch (e) {
    console.error('Failed to refresh:', e)
  }
}

const parkCallAction = async () => {
  try {
    const space = await parkCall(
      parkForm.channel,
      parkForm.parkingLot || undefined,
      parkForm.timeout
    )
    addEvent('parked', `Call parked in space ${space}`)
    parkForm.channel = ''
  } catch (e) {
    console.error('Failed to park call:', e)
    addEvent('error', `Failed to park call: ${e}`)
  }
}

const retrieveCallAction = async (space: number, lot?: string) => {
  try {
    // For retrieval we need the channel of the user retrieving
    // In a real app, this would be the current user's channel
    const retrieveChannel = 'PJSIP/1001' // Placeholder
    await retrieveCall(space, retrieveChannel, lot)
  } catch (e) {
    console.error('Failed to retrieve call:', e)
    addEvent('error', `Failed to retrieve call: ${e}`)
  }
}

// Register parking event listener
onParkingEvent((event) => {
  console.log('Parking event:', event.type, event.call)
})

// Helpers
const formatDuration = (seconds?: number) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getTimeoutProgress = (call: { parkingDuration?: number; parkingTimeout?: number }) => {
  if (!call.parkingTimeout || !call.parkingDuration) return 0
  return Math.min(100, (call.parkingDuration / call.parkingTimeout) * 100)
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'parked':
      return 'pi pi-download'
    case 'retrieved':
      return 'pi pi-upload'
    case 'timeout':
      return 'pi pi-clock'
    case 'giveup':
      return 'pi pi-phone-slash'
    case 'error':
      return 'pi pi-exclamation-triangle'
    default:
      return 'pi pi-info-circle'
  }
}

const codeExample = `import { useAmiParking } from 'vuesip'

const {
  parkingLots,
  parkedCalls,
  totalParkedCalls,
  getParkingLots,
  parkCall,
  retrieveCall,
  refreshParkingLot,
  onParkingEvent,
} = useAmiParking(amiClientRef, {
  onCallParked: (call) => {
    console.log('Call parked in slot:', call.parkingSpace)
  },
  onCallRetrieved: (call) => {
    console.log('Call retrieved from slot:', call.parkingSpace)
  },
  onCallTimeout: (call) => {
    console.log('Park timeout in slot:', call.parkingSpace)
  },
})

// Park a call
const space = await parkCall('PJSIP/1001-00000001')
console.log('Parked in space:', space)

// Retrieve a parked call
await retrieveCall(701, 'PJSIP/1002-00000002')

// List parked calls
parkedCalls.value.forEach(call => {
  console.log('Space:', call.parkingSpace, 'From:', call.callerIdNum)
})

// Listen for parking events
onParkingEvent((event) => {
  console.log('Parking event:', event.type, event.call)
})`
</script>

<style scoped>
.parking-demo {
  max-width: 900px;
  margin: 0 auto;
}

.demo-card {
  margin: 1rem;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-icon {
  font-size: 1.5rem;
}

.connection-panel {
  margin-bottom: 1rem;
}

.connection-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.url-input {
  flex: 1;
}

.status-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.section-panel {
  margin-bottom: 1rem;
}

.parking-lots-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.parking-lots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.parking-lot-card {
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}

.lot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.lot-name {
  font-weight: 600;
  font-size: 1.125rem;
}

.lot-info {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-bottom: 0.75rem;
}

.lot-calls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.parked-call-mini {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface-card);
  border-radius: 6px;
}

.space-number {
  font-weight: 600;
  color: var(--primary-color);
  min-width: 3rem;
}

.caller-info {
  flex: 1;
  font-size: 0.875rem;
}

.lot-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.space-tag {
  font-weight: 600;
}

.park-form {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.event-log {
  max-height: 300px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.event-item.parked i {
  color: var(--green-500);
}
.event-item.retrieved i {
  color: var(--blue-500);
}
.event-item.timeout i {
  color: var(--orange-500);
}
.event-item.giveup i {
  color: var(--red-500);
}
.event-item.error i {
  color: var(--red-500);
}

.event-message {
  flex: 1;
  font-size: 0.875rem;
}

.event-time {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.empty-state.small {
  padding: 1rem;
}

.empty-state i {
  font-size: 2rem;
}

.empty-state small {
  font-size: 0.75rem;
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
