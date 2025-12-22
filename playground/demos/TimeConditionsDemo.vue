<template>
  <div class="time-conditions-demo">
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
          <span class="demo-icon">🕐</span>
          <span>Time Conditions</span>
        </div>
      </template>
      <template #subtitle>Route calls based on time of day and business hours</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle text-xl"></i></template>
            Connect to AMI to manage time conditions
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
            <Tag severity="info" :value="`${conditions.length} conditions`" />
            <Tag
              :severity="isCurrentlyOpen ? 'success' : 'warning'"
              :value="isCurrentlyOpen ? 'Business Open' : 'Business Closed'"
            />
          </div>

          <!-- Current Time Info -->
          <Panel header="Current Status" class="section-panel">
            <div class="current-status">
              <div class="time-display">
                <span class="current-time">{{ currentTimeDisplay }}</span>
                <span class="current-day">{{ currentDayDisplay }}</span>
              </div>
              <div class="status-indicator" :class="{ open: isCurrentlyOpen }">
                <i :class="isCurrentlyOpen ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
                <span>{{
                  isCurrentlyOpen ? 'Within Business Hours' : 'Outside Business Hours'
                }}</span>
              </div>
            </div>
          </Panel>

          <!-- Create New Condition -->
          <Panel
            header="Create Time Condition"
            :toggleable="true"
            :collapsed="conditions.length > 0"
            class="section-panel"
          >
            <div class="form-grid">
              <div class="form-field">
                <label>Name *</label>
                <InputText v-model="newCondition.name" placeholder="Business Hours" />
              </div>
              <div class="form-field">
                <label>Description</label>
                <InputText v-model="newCondition.description" placeholder="Main office hours" />
              </div>
              <div class="form-field">
                <label>Open Destination</label>
                <InputText v-model="newCondition.openDestination" placeholder="queue-sales" />
              </div>
              <div class="form-field">
                <label>Closed Destination</label>
                <InputText v-model="newCondition.closedDestination" placeholder="voicemail-main" />
              </div>
            </div>

            <Divider />

            <h5>Weekly Schedule</h5>
            <div class="schedule-grid">
              <div v-for="day in weekDays" :key="day.value" class="schedule-day">
                <div class="day-header">
                  <Checkbox v-model="scheduleEnabled[day.value]" :binary="true" />
                  <span>{{ day.label }}</span>
                </div>
                <div v-if="scheduleEnabled[day.value]" class="time-inputs">
                  <InputText
                    v-model="scheduleTimes[day.value].start"
                    placeholder="09:00"
                    class="time-input"
                  />
                  <span>to</span>
                  <InputText
                    v-model="scheduleTimes[day.value].end"
                    placeholder="17:00"
                    class="time-input"
                  />
                </div>
                <div v-else class="closed-label">Closed</div>
              </div>
            </div>

            <div class="form-actions">
              <Button
                label="Create Condition"
                icon="pi pi-plus"
                @click="createCondition"
                :loading="isLoading"
                :disabled="!newCondition.name"
              />
            </div>
          </Panel>

          <!-- Active Conditions -->
          <Panel header="Time Conditions" :toggleable="true" class="section-panel">
            <DataTable
              :value="conditions"
              size="small"
              :rows="5"
              :paginator="conditions.length > 5"
            >
              <Column field="name" header="Name" sortable />
              <Column header="Status">
                <template #body="{ data }">
                  <Tag
                    :severity="data.enabled ? 'success' : 'secondary'"
                    :value="data.enabled ? 'Active' : 'Disabled'"
                  />
                </template>
              </Column>
              <Column header="Override">
                <template #body="{ data }">
                  <Tag
                    v-if="data.overrideMode !== 'none'"
                    :severity="data.overrideMode === 'force_open' ? 'success' : 'danger'"
                    :value="data.overrideMode === 'force_open' ? 'Force Open' : 'Force Closed'"
                  />
                  <span v-else class="text-muted">None</span>
                </template>
              </Column>
              <Column field="openDestination" header="Open Dest" />
              <Column field="closedDestination" header="Closed Dest" />
              <Column header="Actions" style="width: 180px">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      icon="pi pi-lock-open"
                      size="small"
                      severity="success"
                      @click="setOverride(data.id, 'force_open')"
                      v-tooltip="'Force Open'"
                    />
                    <Button
                      icon="pi pi-lock"
                      size="small"
                      severity="danger"
                      @click="setOverride(data.id, 'force_closed')"
                      v-tooltip="'Force Closed'"
                    />
                    <Button
                      icon="pi pi-replay"
                      size="small"
                      severity="secondary"
                      @click="clearOverride(data.id)"
                      v-tooltip="'Clear Override'"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      severity="danger"
                      @click="deleteCondition(data.id)"
                      v-tooltip="'Delete'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <div v-if="conditions.length === 0" class="empty-state">
              <i class="pi pi-clock text-4xl"></i>
              <span>No time conditions configured</span>
            </div>
          </Panel>

          <!-- Holidays -->
          <Panel header="Holidays" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="holiday-form">
              <InputText v-model="newHoliday.name" placeholder="Holiday name" />
              <Calendar v-model="newHoliday.date" dateFormat="yy-mm-dd" showIcon />
              <Checkbox v-model="newHoliday.recurring" :binary="true" />
              <label>Recurring</label>
              <Button
                label="Add Holiday"
                icon="pi pi-plus"
                size="small"
                @click="addHoliday"
                :disabled="!newHoliday.name || !newHoliday.date"
              />
            </div>
            <DataTable :value="holidays" size="small" class="mt-2">
              <Column field="name" header="Name" />
              <Column field="date" header="Date" />
              <Column field="recurring" header="Recurring">
                <template #body="{ data }">
                  <i
                    :class="data.recurring ? 'pi pi-check text-success' : 'pi pi-times text-muted'"
                  ></i>
                </template>
              </Column>
              <Column header="Actions" style="width: 80px">
                <template #body="{ data }">
                  <Button
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    @click="removeHoliday(data.id)"
                  />
                </template>
              </Column>
            </DataTable>
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
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useAmiTimeConditions } from '@/composables'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import {
  Card,
  Panel,
  Button,
  InputText,
  Calendar,
  Checkbox,
  DataTable,
  Column,
  Tag,
  Message,
  Divider,
} from './shared-components'

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

// Time Conditions composable
const {
  conditions,
  holidays,
  isLoading,
  isCurrentlyOpen,
  createCondition: create,
  deleteCondition: remove,
  setOverride: override,
  clearOverride: clear,
  addHoliday: addHol,
  removeHoliday: removeHol,
} = useAmiTimeConditions(playgroundAmiClient.getClient(), {
  onConditionMatch: (condition, destination) => {
    console.log('Matched condition:', condition.name, '->', destination)
  },
})

// Current time display
const currentTimeDisplay = ref('')
const currentDayDisplay = ref('')

const updateTime = () => {
  const now = new Date()
  currentTimeDisplay.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  currentDayDisplay.value = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

let timeInterval: ReturnType<typeof setInterval>

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timeInterval)
})

// Form state
const newCondition = reactive({
  name: '',
  description: '',
  openDestination: '',
  closedDestination: '',
})

const weekDays = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
]

const scheduleEnabled = reactive<Record<string, boolean>>({
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
})

const scheduleTimes = reactive<Record<string, { start: string; end: string }>>({
  monday: { start: '09:00', end: '17:00' },
  tuesday: { start: '09:00', end: '17:00' },
  wednesday: { start: '09:00', end: '17:00' },
  thursday: { start: '09:00', end: '17:00' },
  friday: { start: '09:00', end: '17:00' },
  saturday: { start: '09:00', end: '13:00' },
  sunday: { start: '10:00', end: '14:00' },
})

const newHoliday = reactive({
  name: '',
  date: null as Date | null,
  recurring: true,
})

// Actions
const createCondition = async () => {
  try {
    const schedule = weekDays.map((day) => ({
      day: day.value as
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
        | 'sunday',
      enabled: scheduleEnabled[day.value] ?? false,
      ranges: scheduleEnabled[day.value]
        ? [scheduleTimes[day.value] ?? { start: '09:00', end: '17:00' }]
        : [],
    }))

    await create({
      name: newCondition.name,
      description: newCondition.description || undefined,
      schedule,
      openDestination: newCondition.openDestination || undefined,
      closedDestination: newCondition.closedDestination || undefined,
    })

    // Reset form
    newCondition.name = ''
    newCondition.description = ''
    newCondition.openDestination = ''
    newCondition.closedDestination = ''
  } catch (e) {
    console.error('Failed to create condition:', e)
  }
}

const setOverride = async (id: string, mode: 'force_open' | 'force_closed') => {
  try {
    await override(id, mode)
  } catch (e) {
    console.error('Failed to set override:', e)
  }
}

const clearOverride = async (id: string) => {
  try {
    await clear(id)
  } catch (e) {
    console.error('Failed to clear override:', e)
  }
}

const deleteCondition = async (id: string) => {
  try {
    await remove(id)
  } catch (e) {
    console.error('Failed to delete condition:', e)
  }
}

const addHoliday = async () => {
  if (!newHoliday.name || !newHoliday.date) return

  const conditionId = conditions.value[0]?.id
  if (!conditionId) {
    console.error('No condition to add holiday to')
    return
  }

  try {
    await addHol(conditionId, {
      name: newHoliday.name,
      date: newHoliday.date.toISOString().split('T')[0] ?? '',
      recurring: newHoliday.recurring,
    })
    newHoliday.name = ''
    newHoliday.date = null
    newHoliday.recurring = true
  } catch (e) {
    console.error('Failed to add holiday:', e)
  }
}

const removeHoliday = async (holidayId: string) => {
  const conditionId = conditions.value[0]?.id
  if (!conditionId) return

  try {
    await removeHol(conditionId, holidayId)
  } catch (e) {
    console.error('Failed to remove holiday:', e)
  }
}

const codeExample = `import { useAmiTimeConditions } from 'vuesip'

const {
  conditions,
  holidays,
  isCurrentlyOpen,
  createCondition,
  setOverride,
  clearOverride,
  addHoliday,
} = useAmiTimeConditions(amiClient, {
  onConditionMatch: (condition, destination) => {
    console.log('Matched:', condition.name, '->', destination)
  },
})

// Create a business hours condition
await createCondition({
  name: 'Business Hours',
  schedule: [
    { day: 'monday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
    { day: 'tuesday', enabled: true, ranges: [{ start: '09:00', end: '17:00' }] },
    // ... other days
  ],
  openDestination: 'queue-sales',
  closedDestination: 'voicemail-main',
})

// Force open (emergency/special hours)
await setOverride(conditionId, 'force_open')

// Add a holiday
await addHoliday(conditionId, {
  name: 'Christmas',
  date: '2024-12-25',
  recurring: true,
})

// Check current status
console.log('Business open:', isCurrentlyOpen.value)`
</script>

<style scoped>
.time-conditions-demo {
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

.current-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.time-display {
  display: flex;
  flex-direction: column;
}

.current-time {
  font-size: 2rem;
  font-weight: 600;
  color: var(--primary-color);
}

.current-day {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--red-100);
  border-radius: 6px;
  color: var(--red-700);
}

.status-indicator.open {
  background: var(--green-100);
  color: var(--green-700);
}

.status-indicator i {
  font-size: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
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

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.schedule-day {
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: 6px;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.time-input {
  width: 70px;
  text-align: center;
}

.closed-label {
  color: var(--text-color-secondary);
  font-style: italic;
}

.form-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.empty-state i {
  font-size: 2rem;
}

.holiday-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.text-muted {
  color: var(--text-color-secondary);
}

.text-success {
  color: var(--green-500);
}

.mt-2 {
  margin-top: 0.5rem;
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

/* Responsive Design */
@media (max-width: 768px) {
  .time-conditions-demo {
    margin: 0 0.5rem;
  }

  .demo-card {
    margin: 0.5rem;
  }

  .status-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .current-status {
    flex-direction: column;
    align-items: flex-start;
  }

  .current-time {
    font-size: 1.5rem;
  }

  .status-indicator {
    width: 100%;
    justify-content: center;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .schedule-grid {
    grid-template-columns: 1fr;
  }

  .time-inputs {
    flex-wrap: wrap;
  }

  .time-input {
    width: 60px;
  }

  .holiday-form {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-buttons {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .demo-header {
    padding: 0.75rem;
  }

  .current-time {
    font-size: 1.25rem;
  }

  .connection-form {
    flex-direction: column;
  }

  .url-input {
    width: 100%;
  }

  .schedule-day {
    padding: 0.75rem 0.5rem;
  }

  .day-header {
    font-size: 0.875rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .code-block {
    font-size: 0.75rem;
    padding: 0.75rem;
  }
}

@media (max-width: 375px) {
  .demo-card {
    margin: 0.25rem;
  }

  .current-time {
    font-size: 1.125rem;
  }

  .status-indicator {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .section-panel {
    font-size: 0.9rem;
  }

  .form-field label {
    font-size: 0.8125rem;
  }
}
</style>
