<template>
  <div class="conference-call-demo">
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

    <h2>Conference Call Management</h2>
    <p class="description">Manage multiple simultaneous calls and create conference sessions.</p>

    <!-- Connection Status -->
    <div class="status-section">
      <div :class="['status-badge', connectionState]">
        {{ connectionState.toUpperCase() }}
      </div>
      <div class="stats">
        <span>Active Calls: {{ activeCalls.length }}</span>
        <span>Conference: {{ isConferenceActive ? 'Active' : 'Inactive' }}</span>
      </div>
      <div v-if="!isConnected" class="connection-hint">
        Configure SIP credentials in <strong>Settings</strong> or <strong>Basic Call</strong> demo
      </div>
    </div>

    <!-- Add Participant -->
    <div v-if="isConnected" class="add-participant-section">
      <h3>Add Participant</h3>
      <div class="form-group">
        <label>Participant SIP URI</label>
        <input
          v-model="newParticipantUri"
          type="text"
          placeholder="sip:participant@example.com"
          @keyup.enter="addParticipant"
        />
      </div>
      <button @click="addParticipant" :disabled="activeCalls.length >= 5">Add to Conference</button>
      <div v-if="activeCalls.length >= 5" class="warning">Maximum 5 participants reached</div>
    </div>

    <!-- Active Calls List -->
    <div v-if="activeCalls.length > 0" class="active-calls-section">
      <h3>Conference Participants ({{ activeCalls.length }})</h3>

      <div class="calls-list">
        <div
          v-for="call in activeCalls"
          :key="call.id"
          :class="['call-card', { held: call.isHeld, selected: selectedCalls.includes(call.id) }]"
        >
          <div class="call-header">
            <input
              type="checkbox"
              :checked="selectedCalls.includes(call.id)"
              @change="toggleCallSelection(call.id)"
            />
            <div class="call-info">
              <div class="participant-name">{{ call.displayName }}</div>
              <div class="call-meta">
                <span :class="['state-badge', call.state]">{{ call.state }}</span>
                <span class="duration">{{ call.duration }}</span>
              </div>
            </div>
          </div>

          <div class="call-controls">
            <button
              @click="toggleHold(call)"
              :disabled="call.state !== 'active' && !call.isHeld"
              class="btn-small"
            >
              {{ call.isHeld ? 'Resume' : 'Hold' }}
            </button>
            <button @click="toggleMute(call)" :disabled="call.state !== 'active'" class="btn-small">
              {{ call.isMuted ? 'Unmute' : 'Mute' }}
            </button>
            <button @click="hangupCall(call.id)" class="btn-small danger">End</button>
          </div>

          <!-- Audio Level Indicator -->
          <div class="audio-level">
            <div class="level-bar" :style="{ width: call.audioLevel + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Conference Controls -->
      <div class="conference-controls">
        <h4>Conference Actions</h4>
        <div class="button-group">
          <button @click="startConference" :disabled="activeCalls.length < 2 || isConferenceActive">
            Start Conference
          </button>
          <button @click="stopConference" :disabled="!isConferenceActive">Stop Conference</button>
          <button @click="holdAll" :disabled="activeCalls.length === 0">Hold All</button>
          <button @click="resumeAll" :disabled="activeCalls.length === 0">Resume All</button>
          <button @click="muteAll" :disabled="activeCalls.length === 0">Mute All</button>
          <button @click="hangupAll" :disabled="activeCalls.length === 0" class="danger">
            End All
          </button>
        </div>
      </div>

      <!-- Selected Calls Actions -->
      <div v-if="selectedCalls.length > 0" class="selected-actions">
        <h4>Selected Calls ({{ selectedCalls.length }})</h4>
        <div class="button-group">
          <button @click="mergeSelected" :disabled="selectedCalls.length < 2">
            Merge Selected
          </button>
          <button @click="transferSelected" :disabled="selectedCalls.length !== 2">
            Transfer Selected
          </button>
          <button @click="clearSelection">Clear Selection</button>
        </div>
      </div>

      <!-- Conference Info -->
      <div v-if="isConferenceActive" class="conference-info">
        <h4>Conference Active</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Participants:</span>
            <span class="value">{{ activeCalls.filter((c) => !c.isHeld).length }}</span>
          </div>
          <div class="info-item">
            <span class="label">Duration:</span>
            <span class="value">{{ conferenceDuration }}</span>
          </div>
          <div class="info-item">
            <span class="label">On Hold:</span>
            <span class="value">{{ activeCalls.filter((c) => c.isHeld).length }}</span>
          </div>
          <div class="info-item">
            <span class="label">Muted:</span>
            <span class="value">{{ activeCalls.filter((c) => c.isMuted).length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div v-if="isConnected" class="quick-actions">
      <h3>Quick Scenarios</h3>
      <div class="button-group">
        <button @click="simulateIncoming">Simulate Incoming Call</button>
        <button @click="addMultipleParticipants">Add 3 Participants</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// SIP Configuration
const sipServerUri = ref('sip:example.com')
const username = ref('')
const password = ref('')
const newParticipantUri = ref('sip:1000@example.com')

// SIP Client - use shared playground instance
const {
  connectionState: realConnectionState,
  isConnected: realIsConnected,
  isConnecting: _isConnecting,
  connect,
  disconnect,
  getClient: _getClient,
} = playgroundSipClient

// Effective values for simulation
const connectionState = computed(() =>
  isSimulationMode.value
    ? simulation.isConnected.value
      ? 'connected'
      : 'disconnected'
    : realConnectionState.value
)
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
)

// Conference State
interface ConferenceCall {
  id: string
  remoteUri: string
  displayName: string
  state: 'connecting' | 'ringing' | 'active' | 'held'
  isHeld: boolean
  isMuted: boolean
  duration: string
  audioLevel: number
  startTime: Date
}

const activeCalls = ref<ConferenceCall[]>([])
const selectedCalls = ref<string[]>([])
const isConferenceActive = ref(false)
const conferenceStartTime = ref<Date | null>(null)
const conferenceDuration = ref('00:00')

// Timers
const callTimers = new Map<string, number>()
const conferenceTimer = ref<number | null>(null)

// Format time helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Connection Toggle
const _toggleConnection = async () => {
  if (isConnected.value) {
    await disconnect()
    hangupAll()
  } else {
    await connect({
      uri: sipServerUri.value,
      username: username.value,
      password: password.value,
    })
  }
}

// Add Participant
const addParticipant = async () => {
  if (!newParticipantUri.value || activeCalls.value.length >= 5) return

  const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const displayName = newParticipantUri.value.split('@')[0].replace('sip:', '')

  const newCall: ConferenceCall = {
    id: callId,
    remoteUri: newParticipantUri.value,
    displayName,
    state: 'connecting',
    isHeld: false,
    isMuted: false,
    duration: '00:00',
    audioLevel: 0,
    startTime: new Date(),
  }

  activeCalls.value.push(newCall)

  // Simulate call progression
  setTimeout(() => {
    const call = activeCalls.value.find((c) => c.id === callId)
    if (call) {
      call.state = 'ringing'
    }
  }, 500)

  setTimeout(() => {
    const call = activeCalls.value.find((c) => c.id === callId)
    if (call) {
      call.state = 'active'
      startCallTimer(callId)
      startAudioLevelSimulation(callId)
    }
  }, 2000)

  // Clear input
  newParticipantUri.value = ''

  console.log('Added participant:', displayName)
}

// Start Call Timer
const startCallTimer = (callId: string) => {
  const timer = window.setInterval(() => {
    const call = activeCalls.value.find((c) => c.id === callId)
    if (call) {
      const elapsed = Math.floor((Date.now() - call.startTime.getTime()) / 1000)
      call.duration = formatTime(elapsed)
    }
  }, 1000)
  callTimers.set(callId, timer)
}

// Stop Call Timer
const stopCallTimer = (callId: string) => {
  const timer = callTimers.get(callId)
  if (timer) {
    clearInterval(timer)
    callTimers.delete(callId)
  }
}

// Simulate Audio Level
const startAudioLevelSimulation = (callId: string) => {
  const interval = setInterval(() => {
    const call = activeCalls.value.find((c) => c.id === callId)
    if (!call || call.state !== 'active' || call.isMuted) {
      call && (call.audioLevel = 0)
      return
    }
    // Random audio level between 20-80%
    call.audioLevel = Math.floor(Math.random() * 60 + 20)
  }, 200)

  // Store interval for cleanup
  setTimeout(() => clearInterval(interval), 60000) // Clean up after 1 minute
}

// Toggle Hold
const toggleHold = (call: ConferenceCall) => {
  call.isHeld = !call.isHeld
  call.state = call.isHeld ? 'held' : 'active'
  console.log(`${call.displayName} ${call.isHeld ? 'held' : 'resumed'}`)
}

// Toggle Mute
const toggleMute = (call: ConferenceCall) => {
  call.isMuted = !call.isMuted
  console.log(`${call.displayName} ${call.isMuted ? 'muted' : 'unmuted'}`)
}

// Hangup Call
const hangupCall = (callId: string) => {
  const index = activeCalls.value.findIndex((c) => c.id === callId)
  if (index !== -1) {
    stopCallTimer(callId)
    activeCalls.value.splice(index, 1)

    // Remove from selection
    const selIndex = selectedCalls.value.indexOf(callId)
    if (selIndex !== -1) {
      selectedCalls.value.splice(selIndex, 1)
    }
  }

  // Stop conference if only 1 or 0 calls left
  if (activeCalls.value.length < 2 && isConferenceActive.value) {
    stopConference()
  }
}

// Conference Controls
const startConference = () => {
  if (activeCalls.value.length < 2) return

  isConferenceActive.value = true
  conferenceStartTime.value = new Date()

  // Resume all calls
  activeCalls.value.forEach((call) => {
    if (call.isHeld) {
      call.isHeld = false
      call.state = 'active'
    }
  })

  // Start conference timer
  conferenceTimer.value = window.setInterval(() => {
    if (conferenceStartTime.value) {
      const elapsed = Math.floor((Date.now() - conferenceStartTime.value.getTime()) / 1000)
      conferenceDuration.value = formatTime(elapsed)
    }
  }, 1000)

  console.log('Conference started with', activeCalls.value.length, 'participants')
}

const stopConference = () => {
  isConferenceActive.value = false
  conferenceStartTime.value = null
  conferenceDuration.value = '00:00'

  if (conferenceTimer.value) {
    clearInterval(conferenceTimer.value)
    conferenceTimer.value = null
  }

  console.log('Conference stopped')
}

const holdAll = () => {
  activeCalls.value.forEach((call) => {
    if (!call.isHeld) {
      call.isHeld = true
      call.state = 'held'
    }
  })
  console.log('All calls held')
}

const resumeAll = () => {
  activeCalls.value.forEach((call) => {
    if (call.isHeld) {
      call.isHeld = false
      call.state = 'active'
    }
  })
  console.log('All calls resumed')
}

const muteAll = () => {
  activeCalls.value.forEach((call) => {
    call.isMuted = true
  })
  console.log('All calls muted')
}

const hangupAll = () => {
  activeCalls.value.forEach((call) => {
    stopCallTimer(call.id)
  })
  activeCalls.value = []
  selectedCalls.value = []

  if (isConferenceActive.value) {
    stopConference()
  }

  console.log('All calls ended')
}

// Selection
const toggleCallSelection = (callId: string) => {
  const index = selectedCalls.value.indexOf(callId)
  if (index !== -1) {
    selectedCalls.value.splice(index, 1)
  } else {
    selectedCalls.value.push(callId)
  }
}

const clearSelection = () => {
  selectedCalls.value = []
}

// Advanced Actions
const mergeSelected = () => {
  if (selectedCalls.value.length < 2) return
  console.log('Merging selected calls:', selectedCalls.value)
  // In a real implementation, this would merge the selected calls
  alert(`Merging ${selectedCalls.value.length} calls into conference`)
  clearSelection()
}

const transferSelected = () => {
  if (selectedCalls.value.length !== 2) return
  const [call1, call2] = selectedCalls.value
  console.log('Transferring call', call1, 'to', call2)
  // In a real implementation, this would perform an attended transfer
  alert('Transferring calls (attended transfer)')
  clearSelection()
}

// Quick Actions
const simulateIncoming = () => {
  const incomingUri = `sip:incoming-${Math.floor(Math.random() * 9000 + 1000)}@example.com`
  newParticipantUri.value = incomingUri
  addParticipant()
}

const addMultipleParticipants = async () => {
  const uris = ['sip:alice@example.com', 'sip:bob@example.com', 'sip:charlie@example.com']

  for (const uri of uris) {
    if (activeCalls.value.length >= 5) break
    newParticipantUri.value = uri
    await addParticipant()
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

// Cleanup
onUnmounted(() => {
  hangupAll()
  callTimers.forEach((timer) => clearInterval(timer))
  callTimers.clear()
  if (conferenceTimer.value) {
    clearInterval(conferenceTimer.value)
  }
})
</script>

<style scoped>
.conference-call-demo {
  max-width: 900px;
  margin: 0 auto;
}

.description {
  color: var(--text-secondary, #666);
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: var(--success, #10b981);
  color: var(--bg-primary, white);
}

.status-badge.disconnected {
  background-color: var(--text-muted, #6b7280);
  color: var(--bg-primary, white);
}

.status-badge.connecting {
  background-color: var(--warning, #f59e0b);
  color: var(--bg-primary, white);
}

.stats {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-muted, #6b7280);
}

.config-section,
.add-participant-section,
.active-calls-section,
.quick-actions {
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 4px;
  font-size: 0.875rem;
}

button {
  padding: 0.625rem 1.25rem;
  background-color: var(--primary, #667eea);
  color: var(--bg-primary, white);
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: var(--primary-hover, #5568d3);
}

button:disabled {
  background-color: var(--text-muted, #6b7280);
  cursor: not-allowed;
}

button.danger {
  background-color: var(--danger, #ef4444);
}

button.danger:hover:not(:disabled) {
  background-color: var(--danger, #ef4444);
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.warning {
  margin-top: 0.5rem;
  color: var(--warning, #f59e0b);
  font-size: 0.875rem;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.call-card {
  background: var(--bg-primary, white);
  border: 2px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.call-card.held {
  opacity: 0.6;
  background: var(--bg-secondary, #f9fafb);
}

.call-card.selected {
  border-color: var(--primary, #667eea);
  background: var(--bg-secondary, #f9fafb);
}

.call-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.call-header input[type='checkbox'] {
  margin-top: 0.25rem;
}

.call-info {
  flex: 1;
}

.participant-name {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.call-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
}

.state-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.state-badge.connecting {
  background: var(--bg-secondary, #f9fafb);
  color: var(--warning, #f59e0b);
}

.state-badge.ringing {
  background: var(--bg-secondary, #f9fafb);
  color: var(--primary, #667eea);
}

.state-badge.active {
  background: var(--bg-secondary, #f9fafb);
  color: var(--success, #10b981);
}

.state-badge.held {
  background: var(--bg-secondary, #f9fafb);
  color: var(--text-muted, #6b7280);
}

.duration {
  color: var(--text-muted, #6b7280);
}

.call-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.audio-level {
  margin-top: 0.75rem;
  height: 4px;
  background: var(--border-color, #e5e7eb);
  border-radius: 2px;
  overflow: hidden;
}

.level-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--success, #10b981), var(--primary, #667eea));
  transition: width 0.2s;
}

.conference-controls,
.selected-actions {
  background: var(--bg-primary, white);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.conference-info {
  background: var(--bg-secondary, #f9fafb);
  border: 1px solid var(--success, #10b981);
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-item .label {
  font-weight: 500;
  color: var(--success, #10b981);
}

.info-item .value {
  color: var(--text-primary, #333);
  font-weight: 600;
}
</style>
