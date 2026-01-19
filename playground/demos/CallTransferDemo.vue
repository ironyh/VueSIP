<template>
  <div class="call-transfer-demo">
    <div class="info-section">
      <p>
        Call Transfer allows you to redirect an active call to another destination. VueSip supports
        both blind transfer (immediate) and attended transfer (with consultation).
      </p>
      <div class="transfer-types">
        <div class="type-card">
          <h4>
            <svg
              class="icon-inline"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Blind Transfer
          </h4>
          <p>
            Instantly transfer the call to another number without talking to them first. The call is
            immediately connected to the transfer target.
          </p>
        </div>
        <div class="type-card">
          <h4>
            <svg
              class="icon-inline"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Attended Transfer
          </h4>
          <p>
            Consult with the transfer target before completing the transfer. You can talk to both
            parties before connecting them.
          </p>
        </div>
      </div>
    </div>

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

    <!-- Connection Status -->
    <Message v-if="!effectiveIsConnected" severity="info" :closable="false">
      {{
        isSimulationMode
          ? 'Enable simulation and run a scenario to test transfers'
          : 'Connect to a SIP server to use transfer features (use the Basic Call demo to connect)'
      }}
    </Message>

    <Message v-else-if="effectiveCallState !== 'active'" severity="warn" :closable="false">
      {{
        isSimulationMode
          ? 'Run the "Active Call" or "Transfer" scenario to test transfers'
          : 'You need an active call to perform transfers'
      }}
    </Message>

    <!-- Transfer Interface -->
    <div v-else class="transfer-interface">
      <!-- Current Call Info -->
      <div class="current-call-info">
        <h3>Current Call</h3>
        <div class="call-details">
          <div class="detail-row">
            <span class="label">Connected to:</span>
            <span class="value">{{
              effectiveRemoteDisplayName || effectiveRemoteUri || 'Unknown'
            }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">{{ effectiveIsOnHold ? 'On Hold' : 'Active' }}</span>
          </div>
        </div>
      </div>

      <!-- Transfer Type Selection -->
      <div v-if="!isTransferring && !activeTransfer" class="transfer-type-selection">
        <h3>Choose Transfer Type</h3>
        <div class="transfer-buttons">
          <button class="transfer-type-btn blind" @click="startBlindTransfer">
            <svg
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span class="title">Blind Transfer</span>
            <span class="desc">Direct transfer</span>
          </button>
          <button class="transfer-type-btn attended" @click="startAttendedTransfer">
            <svg
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span class="title">Attended Transfer</span>
            <span class="desc">With consultation</span>
          </button>
        </div>
      </div>

      <!-- Blind Transfer Form -->
      <div v-if="showBlindTransferForm" class="transfer-form">
        <h3>Blind Transfer</h3>
        <p class="form-description">
          Enter the SIP URI or number to transfer this call to. The call will be immediately
          redirected.
        </p>
        <div class="form-group">
          <label for="blind-target">Transfer To:</label>
          <InputText
            id="blind-target"
            v-model="blindTransferTarget"
            placeholder="sip:target@example.com or 1234"
            @keyup.enter="executeBlindTransfer"
            class="w-full"
          />
        </div>
        <div class="form-actions">
          <Button
            :disabled="!blindTransferTarget.trim() || executing"
            @click="executeBlindTransfer"
            :label="executing ? 'Transferring...' : 'Transfer Call'"
            severity="primary"
            icon="pi pi-arrow-right"
          />
          <Button @click="cancelTransferForm" label="Cancel" severity="secondary" />
        </div>
      </div>

      <!-- Attended Transfer Form -->
      <div v-if="showAttendedTransferForm" class="transfer-form">
        <h3>Attended Transfer</h3>

        <!-- Step 1: Initiate Consultation -->
        <div v-if="!consultationCall" class="consultation-step">
          <p class="form-description">
            First, create a consultation call to the transfer target. You can talk to them before
            completing the transfer.
          </p>
          <div class="form-group">
            <label for="attended-target">Consultation Target:</label>
            <InputText
              id="attended-target"
              v-model="attendedTransferTarget"
              placeholder="sip:target@example.com or 1234"
              @keyup.enter="initiateConsultation"
              class="w-full"
            />
          </div>
          <div class="form-actions">
            <Button
              :disabled="!attendedTransferTarget.trim() || executing"
              @click="initiateConsultation"
              :label="executing ? 'Calling...' : 'Start Consultation'"
              severity="primary"
              icon="pi pi-phone"
            />
            <Button @click="cancelTransferForm" label="Cancel" severity="secondary" />
          </div>
        </div>

        <!-- Step 2: Complete Transfer -->
        <div v-else class="consultation-active">
          <div class="consultation-status">
            <div class="status-badge">Consultation in Progress</div>
            <p>
              You're now consulting with the transfer target. You can complete the transfer to
              connect both parties, or cancel to return to the original call.
            </p>
          </div>

          <div class="consultation-info">
            <div class="info-item"><strong>Original Call:</strong> {{ remoteUri }} (On Hold)</div>
            <div class="info-item"><strong>Consultation:</strong> {{ attendedTransferTarget }}</div>
          </div>

          <div class="form-actions">
            <Button
              :disabled="executing"
              @click="completeTransfer"
              :label="executing ? 'Completing...' : 'Complete Transfer'"
              severity="success"
              icon="pi pi-check"
            />
            <Button
              :disabled="executing"
              @click="cancelAttendedTransfer"
              label="Cancel Transfer"
              severity="danger"
              icon="pi pi-times"
            />
          </div>
        </div>
      </div>

      <!-- Transfer Status -->
      <div v-if="activeTransfer" class="transfer-status">
        <div class="status-card" :class="transferState">
          <div class="status-header">
            <svg
              v-if="transferState === 'initiated' || transferState === 'in_progress'"
              class="status-icon spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <svg
              v-else-if="transferState === 'completed' || transferState === 'accepted'"
              class="status-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg
              v-else-if="transferState === 'failed'"
              class="status-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <svg
              v-else
              class="status-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span class="status-text">{{ getStatusText(transferState) }}</span>
          </div>
          <div v-if="activeTransfer.error" class="status-error">
            {{ activeTransfer.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useSipClient, useCallSession, useCallControls } from 'vuesip'

const sipClient = useSipClient()
const { callState, session } = useCallSession(sipClient)
const {
  blindTransfer,
  initiateAttendedTransfer,
  completeAttendedTransfer,
  cancelTransfer,
  isTransferring,
  consultationCall
} = useCallControls(sipClient)

// Blind Transfer
await blindTransfer('call-id-123', 'sip:target@example.com')

// Attended Transfer (2 steps)
// 1. Initiate consultation
const consultCallId = await initiateAttendedTransfer(
  'call-id-123',
  'sip:consult@example.com'
)

// ... talk to consultation target ...

// 2. Complete the transfer
await completeAttendedTransfer()

// Or cancel the transfer
await cancelTransfer()</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Call Transfer Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for all interactive buttons with appropriate severity levels (primary, secondary, success, danger)
 * - Using PrimeVue InputText for transfer target inputs with proper v-model binding
 * - Using PrimeVue Message for status messages with appropriate severity (info/warning)
 * - Transfer type selection buttons remain custom styled to maintain the visual design pattern
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed } from 'vue'
import { useSipClient, useCallSession, useCallControls } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { Button, InputText, Message } from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Get SIP client and call session
const { isConnected, getClient } = useSipClient()
const sipClientRef = computed(() => getClient())
const {
  state: realCallState,
  remoteUri: realRemoteUri,
  isOnHold: realIsOnHold,
  session,
  duration: realDuration,
  remoteDisplayName: realRemoteDisplayName,
} = useCallSession(sipClientRef)

// Effective values - use simulation or real data based on mode
const effectiveIsConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : isConnected.value
)

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

const effectiveIsMuted = computed(() => (isSimulationMode.value ? simulation.isMuted.value : false))

// Call Controls
const {
  blindTransfer,
  initiateAttendedTransfer,
  completeAttendedTransfer,
  cancelTransfer,
  isTransferring,
  activeTransfer,
  transferState,
  consultationCall,
} = useCallControls(sipClientRef)

// State
const showBlindTransferForm = ref(false)
const showAttendedTransferForm = ref(false)
const blindTransferTarget = ref('')
const attendedTransferTarget = ref('')
const executing = ref(false)

// Methods
const startBlindTransfer = () => {
  showBlindTransferForm.value = true
  showAttendedTransferForm.value = false
  blindTransferTarget.value = ''
}

const startAttendedTransfer = () => {
  showAttendedTransferForm.value = true
  showBlindTransferForm.value = false
  attendedTransferTarget.value = ''
}

const executeBlindTransfer = async () => {
  if (!blindTransferTarget.value.trim() || !session.value) return

  executing.value = true
  try {
    await blindTransfer(session.value.id, blindTransferTarget.value)
    showBlindTransferForm.value = false
    blindTransferTarget.value = ''
  } catch (error) {
    console.error('Blind transfer failed:', error)
    alert(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    executing.value = false
  }
}

const initiateConsultation = async () => {
  if (!attendedTransferTarget.value.trim() || !session.value) return

  executing.value = true
  try {
    await initiateAttendedTransfer(session.value.id, attendedTransferTarget.value)
  } catch (error) {
    console.error('Consultation failed:', error)
    alert(`Consultation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    executing.value = false
  }
}

const completeTransfer = async () => {
  executing.value = true
  try {
    await completeAttendedTransfer()
    showAttendedTransferForm.value = false
    attendedTransferTarget.value = ''
  } catch (error) {
    console.error('Complete transfer failed:', error)
    alert(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    executing.value = false
  }
}

const cancelAttendedTransfer = async () => {
  executing.value = true
  try {
    await cancelTransfer()
    showAttendedTransferForm.value = false
    attendedTransferTarget.value = ''
  } catch (error) {
    console.error('Cancel transfer failed:', error)
    alert(`Cancel failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    executing.value = false
  }
}

const cancelTransferForm = () => {
  showBlindTransferForm.value = false
  showAttendedTransferForm.value = false
  blindTransferTarget.value = ''
  attendedTransferTarget.value = ''
}

const getStatusText = (state: string): string => {
  const texts: Record<string, string> = {
    initiated: 'Transfer Initiated',
    in_progress: 'Transfer in Progress',
    accepted: 'Transfer Accepted',
    completed: 'Transfer Completed',
    failed: 'Transfer Failed',
    canceled: 'Transfer Canceled',
  }
  return texts[state] || state
}
</script>

<style scoped>
.call-transfer-demo {
  max-width: 700px;
  margin: 0 auto;
}

.info-section {
  padding: 1.5rem;
  background: var(--surface-50);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.info-section > p {
  margin: 0 0 1.5rem 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.transfer-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.type-card {
  background: var(--surface-0);
  padding: 1.25rem;
  border-radius: 8px;
  border: 2px solid var(--border-color);
}

.type-card h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.type-card p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Design Decision: PrimeVue Message component handles status message styling.
   Removed custom .status-message classes as they're no longer needed. */

.transfer-interface {
  padding: 1.5rem;
}

.current-call-info {
  background: var(--success-light);
  padding: 1.25rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.current-call-info h3 {
  margin: 0 0 1rem 0;
  color: var(--success);
  font-size: 1rem;
}

.call-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.detail-row .label {
  color: var(--success);
  font-weight: 500;
}

.detail-row .value {
  color: var(--success);
  font-weight: 600;
}

.transfer-type-selection h3 {
  margin: 0 0 1.5rem 0;
  color: var(--text-color);
  text-align: center;
}

.transfer-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.transfer-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem;
  background: var(--surface-0);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.transfer-type-btn:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.transfer-type-btn .icon {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  color: var(--primary);
}

.icon-inline {
  width: 16px;
  height: 16px;
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
}

.transfer-type-btn .title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.transfer-type-btn .desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.transfer-form {
  background: var(--surface-0);
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid var(--primary);
}

.transfer-form h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.form-description {
  margin: 0 0 1.5rem 0;
  color: var(--text-secondary);
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
  color: var(--text-color);
  font-size: 0.875rem;
}

/* Design Decision: PrimeVue InputText component handles input styling.
   Removed custom input styles as they're no longer needed. */
.form-group :deep(.p-inputtext) {
  width: 100%;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

/* Design Decision: PrimeVue Button components handle all button styling.
   Removed custom .btn classes as they're no longer needed. */

.consultation-step {
  /* Inherits transfer-form styles */
}

.consultation-active {
  /* Inherits transfer-form styles */
}

.consultation-status {
  margin-bottom: 1.5rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--info-light);
  color: var(--info);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.consultation-status p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
}

.consultation-info {
  background: var(--surface-50);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.info-item {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item strong {
  color: var(--text-color);
}

.transfer-status {
  margin-top: 1.5rem;
}

.status-card {
  padding: 1.25rem;
  border-radius: 8px;
  border: 2px solid;
}

.status-card.completed {
  background: var(--success-light);
  border-color: var(--success);
}

.status-card.failed {
  background: var(--danger-light);
  border-color: var(--danger);
}

.status-card.canceled {
  background: var(--warning-light);
  border-color: var(--warning);
}

.status-card.in_progress {
  background: var(--info-light);
  border-color: var(--info);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.status-icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-text {
  font-weight: 600;
  color: var(--text-color);
}

.status-error {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--danger);
}

.code-example {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--surface-50);
  border-radius: 8px;
}

.code-example h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
}

.code-example pre {
  background: var(--surface-900);
  color: var(--text-color);
  padding: 1.5rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}
</style>
