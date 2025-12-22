<template>
  <div class="speed-dial-demo">
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

    <div class="info-section">
      <p>
        Speed Dial allows you to save frequently called contacts for quick access. Click any contact
        to instantly initiate a call. Contacts are saved in localStorage and persist across
        sessions.
      </p>
    </div>

    <!-- Connection Status -->
    <Message v-if="!isConnected" severity="info" class="mb-3">
      Connect to a SIP server to use speed dial (use the Basic Call demo to connect)
    </Message>

    <!-- Speed Dial Interface -->
    <div v-else class="speed-dial-interface">
      <!-- Speed Dial Grid -->
      <div class="speed-dial-grid">
        <div
          v-for="(contact, index) in speedDialSlots"
          :key="index"
          class="speed-dial-slot"
          :class="{ empty: !contact, calling: callingIndex === index }"
        >
          <!-- Empty Slot -->
          <div v-if="!contact" class="empty-slot" @click="showAddDialog(index)">
            <div class="slot-icon">+</div>
            <div class="slot-label">Add Contact</div>
          </div>

          <!-- Filled Slot -->
          <div v-else class="filled-slot">
            <button
              class="call-button"
              :disabled="callState !== 'idle' || !isRegistered"
              @click="handleSpeedDial(contact, index)"
            >
              <div class="contact-avatar">{{ getInitials(contact.name) }}</div>
              <div class="contact-info">
                <div class="contact-name">{{ contact.name }}</div>
                <div class="contact-number">{{ contact.number }}</div>
              </div>
            </button>
            <button class="delete-button" @click="handleDelete(index)" title="Remove contact">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Add/Edit Dialog -->
      <Dialog
        v-model:visible="showDialog"
        :header="(editingContact ? 'Edit' : 'Add') + ' Speed Dial Contact'"
        :modal="true"
        :closable="true"
        :style="{ width: '400px' }"
        @hide="handleDialogClose"
      >
        <div class="form-group">
          <label for="contact-name">Name</label>
          <InputText
            id="contact-name"
            v-model="dialogContact.name"
            type="text"
            placeholder="John Doe"
            class="w-full"
            @keyup.enter="handleSave"
          />
        </div>

        <div class="form-group">
          <label for="contact-number">SIP URI or Number</label>
          <InputText
            id="contact-number"
            v-model="dialogContact.number"
            type="text"
            placeholder="sip:user@example.com or 1234"
            class="w-full"
            @keyup.enter="handleSave"
          />
        </div>

        <template #footer>
          <div class="dialog-actions">
            <Button
              label="Save"
              :disabled="!dialogContact.name.trim() || !dialogContact.number.trim()"
              @click="handleSave"
            />
            <Button label="Cancel" severity="secondary" @click="handleDialogClose" />
          </div>
        </template>
      </Dialog>

      <!-- Current Call Status -->
      <div v-if="callState !== 'idle'" class="call-status">
        <div class="status-badge">
          {{ callState === 'active' ? 'In Call' : 'Calling...' }}
        </div>
        <div v-if="remoteUri" class="status-info">Connected to: {{ remoteUri }}</div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { ref, onMounted } from 'vue'
import { useSipClient, useCallSession } from 'vuesip'

interface SpeedDialContact {
  name: string
  number: string
}

const STORAGE_KEY = 'vuesip-speed-dial'
const MAX_SLOTS = 9

// Load speed dial contacts from localStorage
const speedDialSlots = ref&lt;(SpeedDialContact | null)[]&gt;(
  Array(MAX_SLOTS).fill(null)
)

const loadSpeedDial = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    speedDialSlots.value = JSON.parse(saved)
  }
}

const saveSpeedDial = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(speedDialSlots.value)
  )
}

// Add contact to speed dial
const addContact = (index: number, contact: SpeedDialContact) => {
  speedDialSlots.value[index] = contact
  saveSpeedDial()
}

// Call speed dial contact
const { makeCall } = useCallSession(sipClient)

const dialContact = async (contact: SpeedDialContact) => {
  await makeCall(contact.number)
}

// Load on mount
onMounted(() => {
  loadSpeedDial()
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSipClient, useCallSession } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, Message, Dialog } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

interface SpeedDialContact {
  name: string
  number: string
}

const STORAGE_KEY = 'vuesip-speed-dial'
const MAX_SLOTS = 9

// SIP Client and Call Session
const { isConnected: realIsConnected, isRegistered: realIsRegistered, getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const { state: callState, remoteUri, makeCall } = useCallSession(sipClientRef)

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)
const isRegistered = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsRegistered.value
)
const _effectiveCallState = computed(() =>
  isSimulationMode.value ? simulation.state.value : callState.value
)

// State
const speedDialSlots = ref<(SpeedDialContact | null)[]>(Array(MAX_SLOTS).fill(null))
const showDialog = ref(false)
const editingIndex = ref<number | null>(null)
const editingContact = ref<SpeedDialContact | null>(null)
const callingIndex = ref<number | null>(null)
const dialogContact = ref<SpeedDialContact>({
  name: '',
  number: '',
})

// Methods
const loadSpeedDial = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        speedDialSlots.value = parsed
      }
    } catch (error) {
      console.error('Failed to load speed dial:', error)
    }
  }
}

const saveSpeedDial = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(speedDialSlots.value))
}

const showAddDialog = (index: number) => {
  editingIndex.value = index
  editingContact.value = speedDialSlots.value[index]
  dialogContact.value = editingContact.value
    ? { ...editingContact.value }
    : { name: '', number: '' }
  showDialog.value = true
}

const handleSave = () => {
  if (!dialogContact.value.name.trim() || !dialogContact.value.number.trim()) {
    return
  }

  if (editingIndex.value !== null) {
    speedDialSlots.value[editingIndex.value] = {
      name: dialogContact.value.name.trim(),
      number: dialogContact.value.number.trim(),
    }
    saveSpeedDial()
  }

  handleDialogClose()
}

const handleDelete = (index: number) => {
  if (confirm('Remove this contact from speed dial?')) {
    speedDialSlots.value[index] = null
    saveSpeedDial()
  }
}

const handleDialogClose = () => {
  showDialog.value = false
  editingIndex.value = null
  editingContact.value = null
  dialogContact.value = { name: '', number: '' }
}

const handleSpeedDial = async (contact: SpeedDialContact, index: number) => {
  if (callState.value !== 'idle' || !isRegistered.value) return

  callingIndex.value = index
  try {
    await makeCall(contact.number)
  } catch (error) {
    console.error('Speed dial call failed:', error)
    alert(
      `Failed to call ${contact.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  } finally {
    // Reset calling index after a short delay
    setTimeout(() => {
      callingIndex.value = null
    }, 1000)
  }
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Load speed dial on mount
onMounted(() => {
  loadSpeedDial()
})
</script>

<style scoped>
.speed-dial-demo {
  max-width: 700px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius-lg);
  margin-bottom: 1.5rem;
}

.info-section p {
  margin: 0;
  color: var(--vuesip-text-secondary);
  line-height: 1.6;
}

.speed-dial-interface {
  padding: 1.5rem;
}

.speed-dial-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.speed-dial-slot {
  aspect-ratio: 1;
  border-radius: var(--vuesip-border-radius-lg);
  overflow: hidden;
  transition: all var(--vuesip-transition);
}

.speed-dial-slot.empty {
  border: 2px dashed var(--vuesip-border);
  background: var(--vuesip-bg-primary);
}

.speed-dial-slot.calling {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.empty-slot {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--vuesip-transition);
}

.empty-slot:hover {
  background: var(--vuesip-bg-secondary);
  border-color: var(--vuesip-primary);
}

.slot-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.slot-label {
  font-size: 0.75rem;
  color: var(--vuesip-text-secondary);
  font-weight: 500;
}

.filled-slot {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--vuesip-bg-primary);
  border: 2px solid var(--vuesip-border);
  border-radius: var(--vuesip-border-radius-lg);
}

.call-button {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 1rem;
  transition: all var(--vuesip-transition);
}

.call-button:not(:disabled):hover {
  background: var(--vuesip-bg-secondary);
}

.call-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vuesip-primary) 0%, #764ba2 100%);
  color: var(--surface-0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
}

.contact-info {
  text-align: center;
  width: 100%;
}

.contact-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vuesip-text-primary);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-number {
  font-size: 0.75rem;
  color: var(--vuesip-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--vuesip-danger);
  color: var(--surface-0);
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.filled-slot:hover .delete-button {
  opacity: 1;
}

.delete-button:hover {
  background: var(--vuesip-danger-dark);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--vuesip-text-primary);
  font-size: 0.875rem;
}

.dialog-actions {
  display: flex;
  gap: 0.75rem;
}

.call-status {
  background: var(--vuesip-success-light);
  padding: 1rem;
  border-radius: var(--vuesip-border-radius-lg);
  text-align: center;
}

.status-badge {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vuesip-success-dark);
  margin-bottom: 0.5rem;
}

.status-info {
  font-size: 0.875rem;
  color: var(--success-active);
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--vuesip-bg-secondary);
  border-radius: var(--vuesip-border-radius-lg);
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: var(--vuesip-text-primary);
}

.code-example pre {
  background: var(--surface-section);
  color: var(--text-secondary);
  padding: 1.5rem;
  border-radius: var(--vuesip-border-radius);
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Utility Classes */
.w-full {
  width: 100%;
}

.mb-3 {
  margin-bottom: 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .speed-dial-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .contact-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .contact-name {
    font-size: 0.8125rem;
  }

  .contact-number {
    font-size: 0.6875rem;
  }
}

@media (max-width: 480px) {
  .speed-dial-demo {
    padding: 0 0.5rem;
  }

  .speed-dial-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .speed-dial-slot {
    min-height: 120px;
  }

  .slot-icon {
    font-size: 1.5rem;
  }

  .slot-label {
    font-size: 0.6875rem;
  }

  .code-example pre {
    font-size: 0.75rem;
    padding: 1rem;
  }
}

@media (max-width: 375px) {
  .speed-dial-interface {
    padding: 1rem;
  }

  .info-section {
    padding: 1rem;
    font-size: 0.8125rem;
  }

  .contact-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.875rem;
  }

  .delete-button {
    width: 20px;
    height: 20px;
    font-size: 0.625rem;
  }
}
</style>
