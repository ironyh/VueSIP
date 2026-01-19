<template>
  <div class="call-waiting-demo">
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
    <h2>Call Waiting & Switching</h2>
    <p class="description">
      Handle multiple calls, switch between active calls, and manage call waiting scenarios.
    </p>

    <!-- Connection Status -->
    <!-- Design Decision: Badge component for connection status provides semantic meaning.
         Tag component for active calls count. Message component for connection hints. -->
    <div class="status-section">
      <Badge
        :value="connectionState.toUpperCase()"
        :severity="
          connectionState === 'connected'
            ? 'success'
            : connectionState === 'connecting'
              ? 'warning'
              : 'secondary'
        "
      />
      <div class="calls-indicator">
        <span class="label">Active Calls:</span>
        <Tag :value="calls.length.toString()" severity="info" />
      </div>
      <Message v-if="!isConnected" severity="warn" :closable="false" class="connection-hint">
        Configure SIP credentials in <strong>Settings</strong> or <strong>Basic Call</strong> demo
      </Message>
    </div>

    <!-- Call Control -->
    <!-- Design Decision: Card component structures call section. InputText and Button components
         for form controls. -->
    <Card v-if="isConnected" class="call-section">
      <template #title>Make a Call</template>
      <template #content>
        <div class="form-group">
          <label for="target-uri">Target SIP URI</label>
          <InputText
            id="target-uri"
            v-model="targetUri"
            placeholder="sip:target@example.com"
            @keyup.enter="makeCall"
            class="w-full"
            aria-required="true"
          />
        </div>
        <Button label="Make Call" @click="makeCall" icon="pi pi-phone" class="w-full" />
      </template>
    </Card>

    <!-- Active Calls List -->
    <!-- Design Decision: Card component structures calls list section. -->
    <Card v-if="calls.length > 0" class="calls-list-section">
      <template #title>Active Calls ({{ calls.length }})</template>
      <template #content>
        <div class="calls-container">
          <div
            v-for="call in calls"
            :key="call.id"
            :class="[
              'call-card',
              {
                active: call.id === activeCallId,
                held: call.isHeld,
                incoming: call.state === 'incoming',
                ringing: call.state === 'ringing',
              },
            ]"
          >
            <!-- Call Header -->
            <div class="call-header">
              <div class="call-info">
                <div class="call-uri">{{ call.remoteUri }}</div>
                <div class="call-meta">
                  <Badge
                    :value="formatState(call.state)"
                    :severity="
                      call.state === 'active'
                        ? 'success'
                        : call.state === 'incoming'
                          ? 'info'
                          : call.state === 'ringing'
                            ? 'warning'
                            : 'secondary'
                    "
                  />
                  <span class="duration">{{ call.duration }}</span>
                </div>
              </div>
            </div>

            <!-- Call State Indicator -->
            <!-- Design Decision: Tag components for call state indicators provide semantic meaning. -->
            <Tag
              v-if="call.id === activeCallId"
              value="ACTIVE CALL"
              severity="success"
              class="state-indicator"
            />
            <Tag
              v-else-if="call.isHeld"
              value="ON HOLD"
              severity="warning"
              class="state-indicator"
            />
            <Tag
              v-else-if="call.state === 'incoming'"
              value="INCOMING..."
              severity="info"
              class="state-indicator"
            />

            <!-- Call Controls -->
            <!-- Design Decision: Button components with appropriate severity (success for answer,
               danger for reject/hangup, warning for hold, info for switch) provide clear visual hierarchy. -->
            <div class="call-controls">
              <!-- Incoming Call Controls -->
              <template v-if="call.state === 'incoming'">
                <Button
                  label="Answer"
                  @click="answerCall(call.id)"
                  icon="pi pi-phone"
                  severity="success"
                  size="small"
                />
                <Button
                  label="Answer & Hold Current"
                  @click="answerAndHoldActive(call.id)"
                  icon="pi pi-pause"
                  severity="info"
                  size="small"
                />
                <Button
                  label="Reject"
                  @click="rejectCall(call.id)"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                />
              </template>

              <!-- Active/Held Call Controls -->
              <template v-else-if="call.state === 'active'">
                <Button
                  v-if="call.id !== activeCallId"
                  label="Switch"
                  @click="switchToCall(call.id)"
                  icon="pi pi-refresh"
                  severity="info"
                  size="small"
                />
                <Button
                  v-if="!call.isHeld"
                  label="Hold"
                  @click="holdCall(call.id)"
                  icon="pi pi-pause"
                  severity="warning"
                  size="small"
                />
                <Button
                  v-if="call.isHeld"
                  label="Resume"
                  @click="resumeCall(call.id)"
                  icon="pi pi-play"
                  severity="success"
                  size="small"
                />
                <Button
                  :label="call.isMuted ? 'Unmute' : 'Mute'"
                  @click="muteCall(call.id)"
                  :icon="call.isMuted ? 'pi pi-volume-up' : 'pi pi-volume-down'"
                  severity="secondary"
                  size="small"
                />
                <Button
                  label="Hangup"
                  @click="hangupCall(call.id)"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                />
              </template>

              <!-- Ringing Call Controls -->
              <template v-else-if="call.state === 'ringing'">
                <Button
                  label="Cancel"
                  @click="hangupCall(call.id)"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                />
              </template>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Multi-Call Actions -->
    <!-- Design Decision: Card component structures multi-call actions. Button components for actions. -->
    <Card v-if="calls.length >= 2" class="multi-call-actions">
      <template #title>Multi-Call Actions</template>
      <template #content>
        <div class="button-group">
          <Button
            label="Swap Active/Held"
            @click="swapCalls"
            :disabled="calls.length < 2 || !hasActiveAndHeldCall"
            icon="pi pi-refresh"
            severity="info"
          />
          <Button
            label="Merge All (Conference)"
            @click="mergeAllCalls"
            :disabled="calls.length < 2"
            icon="pi pi-users"
            severity="info"
          />
          <Button label="Hangup All" @click="hangupAllCalls" icon="pi pi-times" severity="danger" />
        </div>
      </template>
    </Card>

    <!-- Call Scenarios -->
    <!-- Design Decision: Card component structures scenarios section. Button components for actions. -->
    <Card class="scenarios-section">
      <template #title>Test Scenarios</template>
      <template #content>
        <div class="button-group">
          <Button
            label="Simulate Incoming Call"
            @click="simulateIncomingCall"
            icon="pi pi-phone"
            severity="secondary"
          />
          <Button
            label="Simulate Call Waiting"
            @click="simulateCallWaiting"
            :disabled="calls.length === 0"
            icon="pi pi-bell"
            severity="secondary"
          />
          <Button
            label="Simulate 3-Way Call"
            @click="simulateThreeWay"
            :disabled="calls.length < 2"
            icon="pi pi-users"
            severity="secondary"
          />
        </div>
      </template>
    </Card>

    <!-- Call Waiting Settings -->
    <!-- Design Decision: Card component structures settings section. Checkbox components for
         boolean settings. Slider component for range input. -->
    <Card v-if="isConnected" class="settings-section">
      <template #title>Call Waiting Settings</template>
      <template #content>
        <div class="settings-grid">
          <div class="checkbox-item">
            <Checkbox v-model="callWaitingEnabled" binary inputId="call-waiting-enabled" />
            <label for="call-waiting-enabled">Enable Call Waiting</label>
          </div>
          <div class="checkbox-item">
            <Checkbox v-model="autoAnswerWaiting" binary inputId="auto-answer-waiting" />
            <label for="auto-answer-waiting">Auto-answer waiting calls</label>
          </div>
          <div class="checkbox-item">
            <Checkbox v-model="playWaitingTone" binary inputId="play-waiting-tone" />
            <label for="play-waiting-tone">Play call waiting tone</label>
          </div>
          <div class="checkbox-item">
            <Checkbox v-model="vibrationOnWaiting" binary inputId="vibration-on-waiting" />
            <label for="vibration-on-waiting">Vibrate on waiting call</label>
          </div>
        </div>

        <div class="setting-item">
          <label for="max-simultaneous-calls">Maximum Simultaneous Calls</label>
          <Slider
            id="max-simultaneous-calls"
            v-model="maxSimultaneousCalls"
            :min="1"
            :max="5"
            :step="1"
            class="w-full"
          />
          <span class="value">{{ maxSimultaneousCalls }}</span>
        </div>
      </template>
    </Card>

    <!-- Call History -->
    <!-- Design Decision: Card component structures history section. -->
    <Card v-if="callHistory.length > 0" class="history-section">
      <template #title>Recent Activity</template>
      <template #content>
        <div class="history-list">
          <div v-for="(entry, index) in callHistory.slice(0, 5)" :key="index" class="history-item">
            <div class="history-icon">{{ entry.icon }}</div>
            <div class="history-details">
              <div class="history-message">{{ entry.message }}</div>
              <div class="history-time">{{ entry.timestamp }}</div>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
/**
 * Call Waiting Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Card components to structure sections for better visual hierarchy
 * - InputText and InputNumber components for form inputs with proper validation states
 * - Slider component for range inputs provides better UX with visual feedback
 * - Checkbox components for settings provide consistent styling
 * - Badge and Tag components for status indicators provide semantic meaning
 * - Button components with appropriate severity provide clear visual hierarchy
 * - Message component for connection hints ensures consistent styling
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, watch as _watch, onUnmounted } from 'vue'
import { playgroundSipClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, Checkbox, Slider, Card, Badge, Tag, Message } from './shared-components'

// Simulation
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Call target
const targetUri = ref('sip:1000@example.com')

// SIP Client - use shared playground instance (credentials managed globally)
const { connectionState, isConnected } = playgroundSipClient

// Call State
interface Call {
  id: string
  remoteUri: string
  state: 'incoming' | 'ringing' | 'active' | 'held'
  isHeld: boolean
  isMuted: boolean
  duration: string
  startTime: Date
  direction: 'inbound' | 'outbound'
}

const calls = ref<Call[]>([])
const activeCallId = ref<string | null>(null)

// Settings
const callWaitingEnabled = ref(true)
const autoAnswerWaiting = ref(false)
const playWaitingTone = ref(true)
const vibrationOnWaiting = ref(true)
const maxSimultaneousCalls = ref(3)

// Call History
interface HistoryEntry {
  icon: string
  message: string
  timestamp: string
}

const callHistory = ref<HistoryEntry[]>([])

// Timers
const callTimers = new Map<string, number>()

// Computed
const hasActiveAndHeldCall = computed(() => {
  const activeCall = calls.value.find((c) => c.id === activeCallId.value && !c.isHeld)
  const heldCall = calls.value.find((c) => c.isHeld)
  return activeCall && heldCall
})

// Format time helper
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Make Call
const makeCall = async () => {
  if (!targetUri.value || calls.value.length >= maxSimultaneousCalls.value) {
    if (calls.value.length >= maxSimultaneousCalls.value) {
      alert(`Maximum ${maxSimultaneousCalls.value} simultaneous calls reached`)
    }
    return
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const newCall: Call = {
    id: callId,
    remoteUri: targetUri.value,
    state: 'ringing',
    isHeld: false,
    isMuted: false,
    duration: '00:00',
    startTime: new Date(),
    direction: 'outbound',
  }

  calls.value.push(newCall)
  logHistory('📞', `Calling ${targetUri.value}`)

  // Simulate call connection
  setTimeout(() => {
    const call = calls.value.find((c) => c.id === callId)
    if (call) {
      call.state = 'active'

      // Hold current active call if exists
      if (activeCallId.value && activeCallId.value !== callId) {
        const currentActive = calls.value.find((c) => c.id === activeCallId.value)
        if (currentActive) {
          currentActive.isHeld = true
        }
      }

      activeCallId.value = callId
      startCallTimer(callId)
      logHistory('✅', `Call connected: ${call.remoteUri}`)
    }
  }, 2000)
}

// Answer Call
const answerCall = async (callId: string) => {
  const call = calls.value.find((c) => c.id === callId)
  if (!call) return

  call.state = 'active'

  // Set as active call
  activeCallId.value = callId

  startCallTimer(callId)
  logHistory('✅', `Answered call from ${call.remoteUri}`)
}

// Answer and Hold Current
const answerAndHoldActive = async (callId: string) => {
  // Hold current active call
  if (activeCallId.value) {
    const currentActive = calls.value.find((c) => c.id === activeCallId.value)
    if (currentActive) {
      currentActive.isHeld = true
      logHistory('⏸️', `Held call with ${currentActive.remoteUri}`)
    }
  }

  // Answer new call
  await answerCall(callId)
}

// Reject Call
const rejectCall = async (callId: string) => {
  const call = calls.value.find((c) => c.id === callId)
  if (!call) return

  logHistory('❌', `Rejected call from ${call.remoteUri}`)
  removeCall(callId)
}

// Hold Call
const holdCall = async (callId: string) => {
  const call = calls.value.find((c) => c.id === callId)
  if (!call) return

  call.isHeld = true

  if (activeCallId.value === callId) {
    activeCallId.value = null
  }

  logHistory('⏸️', `Held call with ${call.remoteUri}`)
}

// Resume Call
const resumeCall = async (callId: string) => {
  const call = calls.value.find((c) => c.id === callId)
  if (!call) return

  // Hold current active call
  if (activeCallId.value && activeCallId.value !== callId) {
    const currentActive = calls.value.find((c) => c.id === activeCallId.value)
    if (currentActive) {
      currentActive.isHeld = true
    }
  }

  call.isHeld = false
  activeCallId.value = callId

  logHistory('▶️', `Resumed call with ${call.remoteUri}`)
}

// Switch to Call
const switchToCall = async (callId: string) => {
  // Hold current active call
  if (activeCallId.value) {
    const currentActive = calls.value.find((c) => c.id === activeCallId.value)
    if (currentActive) {
      currentActive.isHeld = true
    }
  }

  // Resume target call
  const call = calls.value.find((c) => c.id === callId)
  if (call) {
    call.isHeld = false
    activeCallId.value = callId
    logHistory('🔄', `Switched to call with ${call.remoteUri}`)
  }
}

// Mute Call
const muteCall = async (callId: string) => {
  const call = calls.value.find((c) => c.id === callId)
  if (!call) return

  call.isMuted = !call.isMuted
  logHistory(call.isMuted ? '🔇' : '🔊', `${call.isMuted ? 'Muted' : 'Unmuted'} call`)
}

// Hangup Call
const hangupCall = async (callId: string) => {
  const call = calls.value.find((c) => c.id === callId)
  if (!call) return

  logHistory('📞', `Call ended: ${call.remoteUri}`)
  removeCall(callId)

  // If this was the active call, find another to make active
  if (activeCallId.value === callId) {
    activeCallId.value = null

    // Find first non-held call or any call
    const nextActive = calls.value.find((c) => !c.isHeld) || calls.value[0]
    if (nextActive) {
      activeCallId.value = nextActive.id
      nextActive.isHeld = false
    }
  }
}

// Hangup All Calls
const hangupAllCalls = () => {
  calls.value.forEach((call) => {
    stopCallTimer(call.id)
  })
  calls.value = []
  activeCallId.value = null
  logHistory('📞', 'All calls ended')
}

// Swap Calls
const swapCalls = () => {
  if (!hasActiveAndHeldCall.value) return

  const activeCall = calls.value.find((c) => c.id === activeCallId.value)
  const heldCall = calls.value.find((c) => c.isHeld)

  if (activeCall && heldCall) {
    activeCall.isHeld = true
    heldCall.isHeld = false
    activeCallId.value = heldCall.id

    logHistory('🔄', `Swapped calls: ${heldCall.remoteUri} now active`)
  }
}

// Merge All Calls
const mergeAllCalls = () => {
  calls.value.forEach((call) => {
    call.isHeld = false
  })

  logHistory('🔗', `Merged ${calls.value.length} calls into conference`)
}

// Remove Call
const removeCall = (callId: string) => {
  stopCallTimer(callId)
  const index = calls.value.findIndex((c) => c.id === callId)
  if (index !== -1) {
    calls.value.splice(index, 1)
  }
}

// Call Timer
const startCallTimer = (callId: string) => {
  const timer = window.setInterval(() => {
    const call = calls.value.find((c) => c.id === callId)
    if (call) {
      const elapsed = Math.floor((Date.now() - call.startTime.getTime()) / 1000)
      call.duration = formatTime(elapsed)
    }
  }, 1000)
  callTimers.set(callId, timer)
}

const stopCallTimer = (callId: string) => {
  const timer = callTimers.get(callId)
  if (timer) {
    clearInterval(timer)
    callTimers.delete(callId)
  }
}

// Simulate Incoming Call
const simulateIncomingCall = () => {
  if (calls.value.length >= maxSimultaneousCalls.value) {
    alert(`Maximum ${maxSimultaneousCalls.value} simultaneous calls reached`)
    return
  }

  if (!callWaitingEnabled.value && calls.value.length > 0) {
    alert('Call waiting is disabled')
    return
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const incomingUri = `sip:incoming-${Math.floor(Math.random() * 9000 + 1000)}@example.com`

  const newCall: Call = {
    id: callId,
    remoteUri: incomingUri,
    state: 'incoming',
    isHeld: false,
    isMuted: false,
    duration: '00:00',
    startTime: new Date(),
    direction: 'inbound',
  }

  calls.value.push(newCall)
  logHistory('📞', `Incoming call from ${incomingUri}`)

  // Play waiting tone
  if (playWaitingTone.value && calls.value.length > 1) {
    console.log('Playing call waiting tone...')
  }

  // Vibrate
  if (vibrationOnWaiting.value && navigator.vibrate) {
    navigator.vibrate([200, 100, 200])
  }

  // Auto-answer if enabled
  if (autoAnswerWaiting.value) {
    setTimeout(() => {
      answerAndHoldActive(callId)
    }, 1000)
  }
}

// Simulate Call Waiting
const simulateCallWaiting = () => {
  simulateIncomingCall()
}

// Simulate Three-Way
const simulateThreeWay = () => {
  mergeAllCalls()
}

// Helpers - removed icons

const formatState = (state: string): string => {
  return state.charAt(0).toUpperCase() + state.slice(1)
}

// Log History
const logHistory = (icon: string, message: string) => {
  callHistory.value.unshift({
    icon,
    message,
    timestamp: new Date().toLocaleTimeString(),
  })

  // Keep only last 20 entries
  if (callHistory.value.length > 20) {
    callHistory.value = callHistory.value.slice(0, 20)
  }
}

// Cleanup
onUnmounted(() => {
  callTimers.forEach((timer) => clearInterval(timer))
  callTimers.clear()
})
</script>

<style scoped>
.call-waiting-demo {
  max-width: 1000px;
  margin: 0 auto;
}

.description {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

/* Status badge styling now handled by PrimeVue Badge component */

.calls-indicator {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
}

.calls-indicator .label {
  color: var(--text-secondary);
}

/* Calls indicator value styling now handled by PrimeVue Tag component */

/* Connection hint styling now handled by PrimeVue Message component */

/* Section styling now handled by PrimeVue Card component */

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Input styling now handled by PrimeVue InputText component */
/* Button styling now handled by PrimeVue Button component */

.calls-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.call-card {
  background: var(--surface-0);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.call-card.active {
  border-color: var(--success);
  background: var(--surface-50);
}

.call-card.held {
  border-color: var(--warning);
  background: var(--surface-50);
  opacity: 0.8;
}

.call-card.incoming {
  border-color: var(--info);
  background: var(--surface-50);
  animation: pulse-border 1.5s ease-in-out infinite;
}

@keyframes pulse-border {
  0%,
  100% {
    border-color: var(--info);
  }
  50% {
    border-color: var(--primary);
  }
}

.call-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.call-info {
  flex: 1;
}

.call-uri {
  font-weight: 600;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.call-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.875rem;
}

/* State badge styling now handled by PrimeVue Badge component */

.duration {
  color: var(--text-secondary);
}

.state-indicator {
  margin-bottom: 1rem;
  display: block;
  text-align: center;
}

/* State indicator styling now handled by PrimeVue Tag component */

@keyframes pulse-bg {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.call-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Call controls button styling now handled by PrimeVue Button component */

/* Multi-call actions and scenarios section styling now handled by PrimeVue Card component */

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--text-color);
}

.setting-item {
  margin-bottom: 1rem;
}

.setting-item label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-color);
}

/* Range input styling now handled by PrimeVue Slider component */
:deep(.p-slider) {
  width: calc(100% - 3rem);
  margin-right: 0.5rem;
}

.setting-item .value {
  font-weight: 600;
  color: var(--primary);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
  font-size: 0.875rem;
}

.history-icon {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.history-details {
  flex: 1;
}

.history-message {
  color: var(--text-color);
  margin-bottom: 0.125rem;
}

.history-time {
  color: var(--text-secondary);
  font-size: 0.75rem;
}
</style>
