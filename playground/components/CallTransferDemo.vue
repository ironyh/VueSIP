<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// Simulated state for demo
const callState = reactive({
  isConnected: true,
  activeCall: {
    id: 'call-123',
    remoteNumber: '+1 (555) 123-4567',
    remoteName: 'Alice Johnson',
    duration: 125,
    status: 'connected'
  }
})

const transferType = ref<'blind' | 'attended'>('blind')
const transferTarget = ref('')
const transferTargetName = ref('')
const transferStatus = ref<'idle' | 'transferring' | 'consulting' | 'completed' | 'failed'>('idle')
const consultCall = ref<{ number: string; name: string; status: string } | null>(null)
const currentStep = ref(0)
const events = ref<Array<{ time: string; type: string; data: string }>>([])

const addEvent = (type: string, data: string) => {
  const now = new Date()
  events.value.unshift({
    time: now.toLocaleTimeString(),
    type,
    data
  })
  if (events.value.length > 20) events.value.pop()
}

// Quick transfer presets
const quickNumbers = [
  { number: '+1-555-100', name: 'Reception Desk', icon: '🏢' },
  { number: '+1-555-200', name: 'Tech Support', icon: '🛠️' },
  { number: '+1-555-300', name: 'Sales Team', icon: '💼' },
  { number: 'sip:queue@pbx.local', name: 'Call Queue', icon: '📞' },
]

const selectQuickNumber = (number: string, name: string) => {
  transferTarget.value = number
  transferTargetName.value = name
}

const initiateTransfer = () => {
  if (!transferTarget.value) return

  if (transferType.value === 'blind') {
    // Step 1: Initiating blind transfer
    currentStep.value = 1
    transferStatus.value = 'transferring'
    addEvent('TRANSFER', `Blind transfer initiated to ${transferTargetName.value || transferTarget.value}`)
    addEvent('SIP', 'Sending REFER request...')

    setTimeout(() => {
      // Step 2: Transfer accepted
      currentStep.value = 2
      addEvent('SIP', '202 Accepted received')
      addEvent('NOTIFY', 'Transfer in progress (100 Trying)')
    }, 500)

    setTimeout(() => {
      // Step 3: Ringing
      currentStep.value = 3
      addEvent('NOTIFY', 'Transfer ringing (180 Ringing)')
    }, 1000)

    setTimeout(() => {
      // Step 4: Completed
      currentStep.value = 4
      transferStatus.value = 'completed'
      addEvent('NOTIFY', 'Transfer completed (200 OK)')
      addEvent('TRANSFER', `${callState.activeCall.remoteName} now connected to ${transferTargetName.value || transferTarget.value}`)
    }, 2000)
  } else {
    // Attended transfer - Step 1: Start consultation
    currentStep.value = 1
    transferStatus.value = 'consulting'
    consultCall.value = {
      number: transferTarget.value,
      name: transferTargetName.value || transferTarget.value,
      status: 'dialing'
    }
    addEvent('TRANSFER', `Attended transfer - consulting ${transferTargetName.value || transferTarget.value}`)
    addEvent('SIP', 'Creating consultation call...')
    addEvent('INFO', `${callState.activeCall.remoteName} is automatically on hold`)

    setTimeout(() => {
      // Step 2: Consultation ringing
      currentStep.value = 2
      if (consultCall.value) consultCall.value.status = 'ringing'
      addEvent('SIP', '180 Ringing')
    }, 800)

    setTimeout(() => {
      // Step 3: Consultation connected
      currentStep.value = 3
      if (consultCall.value) consultCall.value.status = 'connected'
      addEvent('SIP', '200 OK - Consultation call established')
      addEvent('INFO', `You can now speak with ${transferTargetName.value || transferTarget.value}`)
    }, 1500)
  }
}

const completeAttendedTransfer = () => {
  currentStep.value = 4
  addEvent('TRANSFER', 'Completing attended transfer')
  addEvent('SIP', 'Sending REFER with Replaces header')
  addEvent('INFO', `Connecting ${callState.activeCall.remoteName} to ${consultCall.value?.name}`)
  transferStatus.value = 'transferring'

  setTimeout(() => {
    currentStep.value = 5
    transferStatus.value = 'completed'
    addEvent('TRANSFER', `${callState.activeCall.remoteName} now connected to ${consultCall.value?.name}`)
    addEvent('INFO', 'You have been disconnected from both calls')
    consultCall.value = null
  }, 1000)
}

const cancelTransfer = () => {
  addEvent('TRANSFER', 'Transfer cancelled')
  addEvent('INFO', `Returning to call with ${callState.activeCall.remoteName}`)
  transferStatus.value = 'idle'
  consultCall.value = null
  currentStep.value = 0
}

const resetDemo = () => {
  transferStatus.value = 'idle'
  consultCall.value = null
  transferTarget.value = ''
  transferTargetName.value = ''
  currentStep.value = 0
  events.value = []
  addEvent('DEMO', 'Demo reset - ready for new transfer')
}

// Steps configuration
const blindSteps = computed(() => [
  { num: 1, label: 'Initiate Transfer', desc: 'Send transfer request' },
  { num: 2, label: 'Request Accepted', desc: 'Server processes transfer' },
  { num: 3, label: 'Target Ringing', desc: `Calling ${transferTargetName.value || 'target'}` },
  { num: 4, label: 'Transfer Complete', desc: 'Parties connected' }
])

const attendedSteps = computed(() => [
  { num: 1, label: 'Start Consultation', desc: `Call ${transferTargetName.value || 'target'}` },
  { num: 2, label: 'Target Ringing', desc: 'Waiting for answer' },
  { num: 3, label: 'Speak with Target', desc: 'Explain the transfer' },
  { num: 4, label: 'Complete Transfer', desc: 'Connect the parties' },
  { num: 5, label: 'Transfer Done', desc: 'You are disconnected' }
])

// Initialize
addEvent('DEMO', 'Call Transfer demo initialized')
addEvent('INFO', `Active call with ${callState.activeCall.remoteName} (${callState.activeCall.remoteNumber})`)
</script>

<template>
  <div class="demo-panel transfer-demo">
    <!-- Header with visual explanation -->
    <div class="demo-header">
      <h2><span class="icon">📞</span> Call Transfer Demo</h2>
      <p class="demo-subtitle">Learn how to transfer calls - both blind and attended transfers</p>
    </div>

    <!-- Active Call Status -->
    <div class="active-call-status">
      <div class="call-info">
        <div>
          <div class="call-label">Active Call</div>
          <strong>{{ callState.activeCall.remoteName }}</strong>
          <div class="call-number">{{ callState.activeCall.remoteNumber }}</div>
        </div>
        <div class="call-duration">
          {{ Math.floor(callState.activeCall.duration / 60) }}:{{ String(callState.activeCall.duration % 60).padStart(2, '0') }}
        </div>
      </div>
    </div>

    <!-- Transfer Type Selection -->
    <div class="demo-section">
      <h3>Choose Transfer Type</h3>

      <div class="transfer-type-cards">
        <!-- Blind Transfer -->
        <label
          :class="['transfer-type-card', { active: transferType === 'blind', disabled: transferStatus !== 'idle' }]"
        >
          <input
            type="radio"
            name="transferType"
            value="blind"
            v-model="transferType"
            :disabled="transferStatus !== 'idle'"
          />
          <div class="card-content">
            <h4>Blind Transfer</h4>
            <p>Transfer immediately without talking to the target</p>
            <div class="flow-diagram">
              <span>You → Alice</span>
              <span>→</span>
              <span>Alice → Target</span>
            </div>
            <small>Use when the target can help without explanation</small>
          </div>
        </label>

        <!-- Attended Transfer -->
        <label
          :class="['transfer-type-card', { active: transferType === 'attended', disabled: transferStatus !== 'idle' }]"
        >
          <input
            type="radio"
            name="transferType"
            value="attended"
            v-model="transferType"
            :disabled="transferStatus !== 'idle'"
          />
          <div class="card-content">
            <h4>Attended Transfer</h4>
            <p>Speak with target first, then connect</p>
            <div class="flow-diagram">
              <span>You → Alice</span>
              <span>→</span>
              <span>You → Target (Alice on hold)</span>
              <span>→</span>
              <span>Alice → Target</span>
            </div>
            <small>Use when you need to brief the target first</small>
          </div>
        </label>
      </div>
    </div>

    <!-- Transfer Target Input -->
    <div class="demo-section" v-if="transferStatus === 'idle'">
      <h3>Select Transfer Destination</h3>

      <!-- Quick Numbers -->
      <div class="quick-numbers">
        <button
          v-for="preset in quickNumbers"
          :key="preset.number"
          :class="['quick-number-btn', { selected: transferTarget === preset.number }]"
          @click="selectQuickNumber(preset.number, preset.name)"
        >
          {{ preset.name }}
        </button>
      </div>

      <!-- Manual Input -->
      <div class="manual-input">
        <label>Or enter manually:</label>
        <input
          v-model="transferTarget"
          class="input"
          placeholder="Enter phone number or SIP URI"
        />
      </div>

      <!-- Start Transfer Button -->
      <button
        class="btn btn-primary btn-large"
        @click="initiateTransfer"
        :disabled="!transferTarget"
      >
        <span v-if="transferType === 'blind'">🔀 Transfer Call Now</span>
        <span v-else>📞 Start Consultation Call</span>
      </button>
    </div>

    <!-- Progress Steps -->
    <div class="demo-section" v-if="transferStatus !== 'idle' && transferStatus !== 'consulting'">
      <h3>Transfer Progress</h3>

      <div class="steps-list">
        <div
          v-for="step in (transferType === 'blind' ? blindSteps : attendedSteps)"
          :key="step.num"
          :class="['step-item', {
            completed: currentStep > step.num,
            active: currentStep === step.num
          }]"
        >
          <div class="step-marker">
            <span v-if="currentStep > step.num">✓</span>
            <span v-else>{{ step.num }}</span>
          </div>
          <div class="step-info">
            <strong>{{ step.label }}</strong>
            <span>{{ step.desc }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Consultation Call Panel (Attended Transfer) -->
    <div class="demo-section" v-if="transferStatus === 'consulting' && consultCall">
      <div class="consultation-panel">
        <h3>Consultation Call</h3>

        <div class="consultation-state">
          <div class="call-party">
            <strong>{{ callState.activeCall.remoteName }}</strong>
            <span class="status-label on-hold">On Hold</span>
          </div>
          <div class="you-label">You</div>
          <div class="call-party">
            <strong>{{ consultCall.name }}</strong>
            <span :class="['status-label', consultCall.status]">
              {{ consultCall.status === 'connected' ? 'Connected' : consultCall.status }}
            </span>
          </div>
        </div>

        <p v-if="consultCall.status !== 'connected'" class="status-text">
          Calling {{ consultCall.name }}...
        </p>
        <p v-else class="status-text success">
          Speaking with {{ consultCall.name }}. {{ callState.activeCall.remoteName }} is on hold.
        </p>

        <div class="btn-group">
          <button
            class="btn btn-success"
            @click="completeAttendedTransfer"
            :disabled="consultCall.status !== 'connected'"
          >
            Complete Transfer
          </button>
          <button class="btn btn-secondary" @click="cancelTransfer">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Transferring Status -->
    <div class="demo-section" v-if="transferStatus === 'transferring'">
      <div class="transferring-panel">
        <div class="spinner">🔄</div>
        <h3>Connecting the parties...</h3>
        <p>Transfer in progress</p>
      </div>
    </div>

    <!-- Completed Status -->
    <div class="demo-section" v-if="transferStatus === 'completed'">
      <div class="completed-panel">
        <div class="success-icon">✅</div>
        <h3>Transfer Completed Successfully!</h3>
        <div class="completion-summary">
          <p>
            <strong>{{ callState.activeCall.remoteName }}</strong> is now connected to
            <strong>{{ transferTargetName || transferTarget }}</strong>
          </p>
          <p class="note">You have been disconnected from the call</p>
        </div>
        <button class="btn btn-primary" @click="resetDemo">
          🔄 Try Another Transfer
        </button>
      </div>
    </div>
  </div>

  <!-- Event Log Panel -->
  <div class="demo-panel">
    <h2><span class="icon">📋</span> Technical Event Log</h2>
    <div class="event-log">
      <div v-for="(event, i) in events" :key="i" class="event-log-entry">
        <span class="event-time">{{ event.time }}</span>
        <span :class="['event-type', event.type.toLowerCase()]">[{{ event.type }}]</span>
        <span class="event-data">{{ event.data }}</span>
      </div>
    </div>

    <div class="demo-section" style="margin-top: 1.5rem;">
      <h3>API Usage Example</h3>
      <div class="code-preview">
        <code>
          <span class="comment">// Import the composable</span>
          <span class="keyword">import</span> { useCallTransfer } <span class="keyword">from</span> <span class="string">'vuesip'</span>

          <span class="comment">// In your component</span>
          <span class="keyword">const</span> {
          <span class="function">blindTransfer</span>,
          <span class="function">attendedTransfer</span>,
          <span class="function">completeTransfer</span>,
          transferState
          } = <span class="function">useCallTransfer</span>()

          <span class="comment">// Blind transfer (immediate)</span>
          <span class="keyword">await</span> <span class="function">blindTransfer</span>(callSession, <span class="string">'sip:target@domain'</span>)

          <span class="comment">// Attended transfer (with consultation)</span>
          <span class="keyword">const</span> consultSession = <span class="keyword">await</span> <span class="function">attendedTransfer</span>(
          callSession,
          <span class="string">'sip:expert@domain'</span>
          )
          <span class="comment">// Speak with target, then...</span>
          <span class="keyword">await</span> <span class="function">completeTransfer</span>()
        </code>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Import global theme */
@import '../styles/themes.css';

.transfer-demo {
  max-width: 900px;
}

.demo-header {
  margin-bottom: var(--spacing-lg);
}

.demo-subtitle {
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

/* Active Call Status */
.active-call-status {
  background: var(--bg-success-light);
  border-left: 4px solid var(--color-success);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.call-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
}

.call-label {
  font-size: var(--text-xs);
  color: var(--color-success);
  font-weight: var(--font-semibold);
  margin-bottom: 4px;
}

.call-info strong {
  display: block;
  margin-bottom: 2px;
}

.call-number {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.call-duration {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-success);
  font-variant-numeric: tabular-nums;
}

/* Transfer Type Cards */
.transfer-type-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}

.transfer-type-card {
  position: relative;
  display: block;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  cursor: pointer;
  background: var(--bg-card);
  transition: border-color 0.2s;
}

.transfer-type-card input[type="radio"] {
  position: absolute;
  opacity: 0;
}

.transfer-type-card:hover:not(.disabled) {
  border-color: var(--color-info);
}

.transfer-type-card.active {
  border-color: var(--color-info);
  background: var(--bg-info-light);
}

.transfer-type-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-content h4 {
  margin: 0 0 var(--spacing-xs);
  font-size: var(--text-base);
}

.card-content p {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: 0 0 var(--spacing-sm);
}

.flow-diagram {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--spacing-sm);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  margin-bottom: var(--spacing-sm);
}

.flow-diagram span:nth-child(even) {
  text-align: center;
  color: var(--text-muted);
}

.card-content small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

/* Quick Numbers */
.quick-numbers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.quick-number-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: border-color 0.2s;
}

.quick-number-btn:hover {
  border-color: var(--color-info);
}

.quick-number-btn.selected {
  border-color: var(--color-info);
  background: var(--bg-info-light);
}

/* Manual Input */
.manual-input {
  margin-bottom: var(--spacing-lg);
}

.manual-input label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

/* Progress Steps */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.step-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-left: 3px solid var(--border-color);
  opacity: 0.5;
}

.step-item.active {
  border-left-color: var(--color-info);
  opacity: 1;
}

.step-item.completed {
  border-left-color: var(--color-success);
  opacity: 0.8;
}

.step-marker {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  flex-shrink: 0;
}

.step-item.completed .step-marker {
  background: var(--color-success);
  color: white;
}

.step-item.active .step-marker {
  background: var(--color-info);
  color: white;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-info strong {
  font-size: var(--text-sm);
}

.step-info span {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

/* Consultation Panel */
.consultation-panel {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
}

.consultation-panel h3 {
  margin: 0 0 var(--spacing-md);
}

.consultation-state {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-md);
}

.call-party {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.call-party strong {
  font-size: var(--text-sm);
}

.status-label {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  background: var(--bg-secondary);
}

.status-label.on-hold {
  background: var(--bg-warning-light);
  color: var(--color-warning);
}

.status-label.connected {
  background: var(--bg-success-light);
  color: var(--color-success);
}

.you-label {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-info);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.status-text {
  padding: var(--spacing-sm);
  margin: 0 0 var(--spacing-md);
  border-left: 3px solid var(--color-info);
  font-size: var(--text-sm);
}

.status-text.success {
  border-left-color: var(--color-success);
  color: var(--color-success);
}

/* Transferring & Completed Panels */
.transferring-panel,
.completed-panel {
  text-align: center;
  padding: var(--spacing-xl);
}

.spinner {
  font-size: 3rem;
  margin-bottom: var(--spacing-sm);
}

.success-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-sm);
}

.completion-summary {
  background: var(--bg-success-light);
  border-radius: var(--radius-sm);
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
}

.completion-summary .note {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin-top: var(--spacing-xs);
}

/* Event Log */
.event-type.transfer {
  color: var(--color-info);
}

.event-type.sip {
  color: var(--color-success);
}

.event-type.notify {
  color: var(--color-warning);
}

.event-type.info {
  color: var(--text-secondary);
}

.event-type.demo {
  color: var(--text-muted);
}
</style>
