<template>
  <div class="click-to-call-demo">
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
    <!-- Design Decision: Card component structures the configuration panel. Message component
         for info box and errors. InputText and Button components for form controls. -->
    <Card v-if="!isAmiConnected" class="config-panel">
      <template #title>AMI Click-to-Call (Agent-First)</template>
      <template #content>
        <Message severity="info" :closable="false" class="infobox mb-4">
          <p>
            <strong>What this is:</strong> Agent-first click-to-call via Asterisk AMI. Your desk
            phone/softphone rings first; when you answer, the PBX dials the destination.
          </p>
          <p>
            <strong>When to use:</strong> CRM integrations, call-center flows, server-originated
            dialing. <em>No browser media required.</em>
          </p>
          <p>
            <strong>Looking for a browser SIP widget?</strong> Try the
            <em>Click-to-Call Widget</em> example in the SIP section.
          </p>
          <Button
            label="Open SIP Click-to-Call Widget"
            @click="goSipWidget"
            severity="secondary"
            text
            size="small"
            class="mt-2"
          />
        </Message>

        <div class="form-group">
          <label for="ami-url">AMI WebSocket URL</label>
          <InputText
            id="ami-url"
            v-model="amiConfig.url"
            placeholder="ws://pbx.example.com:8080"
            :disabled="connecting"
            class="w-full"
            aria-required="true"
            aria-describedby="ami-url-hint"
          />
          <small id="ami-url-hint">amiws WebSocket proxy URL</small>
        </div>

        <Button
          :label="connecting ? 'Connecting...' : 'Connect to AMI'"
          :disabled="!amiConfig.url || connecting"
          @click="handleConnect"
          icon="pi pi-plug"
          class="w-full"
        />

        <Message v-if="connectionError" severity="error" :closable="false" class="mt-3">
          {{ connectionError }}
        </Message>
      </template>
    </Card>

    <!-- Connected Interface -->
    <div v-else class="connected-interface">
      <!-- Status Bar -->
      <!-- Design Decision: Card component structures status bar. Badge component for connection status.
           Button components with secondary severity for actions. -->
      <Card class="status-bar">
        <template #content>
          <div class="flex align-items-center gap-3 flex-wrap">
            <div class="status-item">
              <Badge value="AMI Connected" severity="success" />
            </div>
            <div class="status-item">
              <span>Active Calls: {{ callCount }}</span>
            </div>
            <div class="status-item">
              <span>Dialing: {{ dialingCount }}</span>
            </div>
            <div class="status-item">
              <span>Total Duration: {{ formatTotalDuration }}</span>
            </div>
            <div v-if="lastRefresh" class="status-item">
              <span class="last-refresh">Last: {{ formatLastRefresh }}</span>
            </div>
            <Button
              label="Refresh"
              @click="handleRefresh"
              :disabled="loading"
              icon="pi pi-refresh"
              severity="secondary"
              size="small"
            />
            <Button
              label="Disconnect"
              @click="handleDisconnect"
              icon="pi pi-sign-out"
              severity="secondary"
              size="small"
            />
          </div>
        </template>
      </Card>

      <!-- Click-to-Call Form -->
      <!-- Design Decision: Card component structures call form. InputText and InputNumber components
           for form inputs. Message component for errors and results. -->
      <Card class="call-form">
        <template #title>Make a Call</template>
        <template #content>
          <p class="info-text mb-4">
            Enter your extension and the destination number. Your phone will ring first, then when
            you answer, the destination will be dialed.
          </p>

          <div class="form-row">
            <div class="form-group">
              <label for="agent-channel">Your Extension/Channel</label>
              <InputText
                id="agent-channel"
                v-model="agentChannel"
                placeholder="SIP/1000 or PJSIP/1000"
                class="w-full"
                aria-required="true"
                aria-describedby="agent-channel-hint"
              />
              <small id="agent-channel-hint">Your SIP channel (e.g., SIP/1000, PJSIP/100)</small>
            </div>

            <div class="form-group">
              <label for="destination">Destination Number</label>
              <InputText
                id="destination"
                v-model="destination"
                placeholder="18005551234"
                class="w-full"
                aria-required="true"
                aria-describedby="destination-hint"
              />
              <small id="destination-hint">Number to dial after you answer</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="caller-id">Caller ID (Optional)</label>
              <InputText
                id="caller-id"
                v-model="callerId"
                placeholder="Sales <1000>"
                class="w-full"
                aria-describedby="caller-id-hint"
              />
              <small id="caller-id-hint">Caller ID to present to the destination</small>
            </div>

            <div class="form-group">
              <label for="timeout">Ring Timeout (seconds)</label>
              <InputNumber
                id="timeout"
                v-model="timeout"
                :min="10"
                :max="120"
                class="w-full"
                aria-describedby="timeout-hint"
              />
              <small id="timeout-hint">How long to ring before giving up</small>
            </div>
          </div>

          <div class="call-actions">
            <Button
              :label="calling ? 'Calling...' : 'Call Now'"
              :disabled="!canCall || calling"
              @click="handleCall"
              icon="pi pi-phone"
              size="large"
              class="w-full"
            />
          </div>

          <Message v-if="callError" severity="error" :closable="false" class="mt-3">
            {{ callError }}
          </Message>

          <Message
            v-if="lastCallResult"
            :severity="lastCallResult.success ? 'success' : 'error'"
            :closable="false"
            class="call-result mt-3"
          >
            <strong>{{ lastCallResult.success ? 'Call Initiated' : 'Call Failed' }}</strong>
            <p v-if="lastCallResult.message" class="mb-0">{{ lastCallResult.message }}</p>
            <p v-if="lastCallResult.channel" class="mb-0">Channel: {{ lastCallResult.channel }}</p>
          </Message>
        </template>
      </Card>

      <!-- Quick Dial -->
      <!-- Design Decision: Card component structures quick dial section. Button components with
           secondary severity for quick dial buttons. -->
      <Card class="quick-dial">
        <template #title>Quick Dial</template>
        <template #content>
          <p class="info-text mb-3">Click a number to dial it quickly.</p>
          <div class="quick-dial-buttons">
            <Button
              v-for="number in quickDialNumbers"
              :key="number.label"
              :label="number.label"
              @click="quickDial(number.number)"
              severity="secondary"
              class="btn-quick"
            >
              <template #default>
                <div class="flex flex-column align-items-center gap-1">
                  <span>{{ number.label }}</span>
                  <span class="quick-number">{{ number.number }}</span>
                </div>
              </template>
            </Button>
          </div>
        </template>
      </Card>

      <!-- Active Calls -->
      <!-- Design Decision: Card component structures active calls section. Tag components for
           call state badges with dynamic severity. Button components for call actions. -->
      <Card class="active-calls">
        <template #title>Active Calls ({{ callCount }})</template>
        <template #content>
          <div v-if="callList.length === 0" class="empty-state">
            <p>No active calls</p>
          </div>

          <div v-else class="calls-list">
            <div
              v-for="call in callList"
              :key="call.uniqueId"
              class="call-card"
              :class="getCallStateClass(call.state)"
            >
              <div class="call-info">
                <div class="call-parties">
                  <span class="caller">{{ call.callerIdName || call.callerIdNum }}</span>
                  <span class="arrow">→</span>
                  <span class="callee">{{
                    call.connectedLineName || call.connectedLineNum || 'Dialing...'
                  }}</span>
                </div>
                <div class="call-details">
                  <span class="channel">{{ call.channel }}</span>
                  <span class="duration">{{ formatDuration(call.duration) }}</span>
                </div>
              </div>
              <div class="call-state">
                <Tag
                  :value="call.stateDesc"
                  :severity="
                    call.state === ChannelState.Up
                      ? 'success'
                      : call.state === ChannelState.Ringing || call.state === ChannelState.Ring
                        ? 'info'
                        : 'secondary'
                  "
                />
              </div>
              <div class="call-actions">
                <Button
                  label="Hangup"
                  @click="handleHangup(call.uniqueId)"
                  icon="pi pi-times"
                  severity="danger"
                  size="small"
                />
                <Button
                  label="Transfer"
                  @click="showTransfer(call)"
                  icon="pi pi-arrow-right"
                  severity="secondary"
                  size="small"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Transfer Dialog -->
      <!-- Design Decision: Dialog component provides modal functionality for transfer dialog.
           InputText and Button components for form controls. -->
      <Dialog
        v-model:visible="transferDialogVisible"
        modal
        header="Transfer Call"
        :style="{ width: '400px' }"
        @hide="cancelTransfer"
      >
        <p>Transfer {{ transferTarget?.callerIdNum }} to:</p>
        <div class="form-group">
          <InputText
            v-model="transferDestination"
            placeholder="Extension or number"
            @keyup.enter="handleTransfer"
            class="w-full"
            autofocus
          />
        </div>
        <template #footer>
          <Button label="Cancel" @click="cancelTransfer" severity="secondary" icon="pi pi-times" />
          <Button
            label="Transfer"
            @click="handleTransfer"
            :disabled="!transferDestination"
            icon="pi pi-arrow-right"
          />
        </template>
      </Dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Click-to-Call Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Card components to structure sections for better visual hierarchy
 * - Button components with appropriate severity (primary, secondary, danger) provide semantic meaning
 * - InputText and InputNumber components for form inputs with proper validation states
 * - Badge components for status indicators provide consistent styling
 * - Message component for error messages ensures consistent error styling
 * - Dialog component for transfer dialog provides modal functionality
 * - Tag components for call state badges provide clear visual feedback
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useAmi, useAmiCalls } from '../../src'
import type { ActiveCall } from '../../src/composables/useAmiCalls'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import { ChannelState, type OriginateResult } from '../../src/types/ami.types'
import {
  Button,
  InputText,
  InputNumber,
  Card,
  Dialog,
  Badge,
  Tag,
  Message,
} from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Configuration
const amiConfig = ref({ url: '' })
const connecting = ref(false)
const connectionError = ref('')

// Call form
const agentChannel = ref('')
const destination = ref('')
const callerId = ref('')
const timeout = ref(30)
const calling = ref(false)
const callError = ref('')
const lastCallResult = ref<OriginateResult | null>(null)

// Transfer
const transferTarget = ref<ActiveCall | null>(null)
const transferDestination = ref('')
const transferDialogVisible = computed({
  get: () => transferTarget.value !== null,
  set: (value) => {
    if (!value) {
      cancelTransfer()
    }
  },
})

// Quick dial
const quickDialNumbers = ref([
  { label: 'Sales', number: '1001' },
  { label: 'Support', number: '1002' },
  { label: 'Reception', number: '1000' },
  { label: 'Mobile', number: '5551234567' },
])

// AMI Client
const {
  connect: amiConnect,
  disconnect: amiDisconnect,
  isConnected: isAmiConnected,
  getClient,
} = useAmi()

// Calls composable
const callsComposable = ref<ReturnType<typeof useAmiCalls> | null>(null)

// Computed
const loading = computed(() => callsComposable.value?.loading ?? false)
const callList = computed(() => callsComposable.value?.callList ?? [])
const callCount = computed(() => callsComposable.value?.callCount ?? 0)
const dialingCount = computed(() => callsComposable.value?.dialingCalls.length ?? 0)
const totalDuration = computed(() => callsComposable.value?.totalDuration ?? 0)
const lastRefresh = computed(() => callsComposable.value?.lastRefresh ?? null)

const formatTotalDuration = computed(() => {
  const secs = totalDuration.value
  const mins = Math.floor(secs / 60)
  const remaining = secs % 60
  return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`
})

const formatLastRefresh = computed(() => {
  if (!lastRefresh.value) return ''
  return lastRefresh.value.toLocaleTimeString()
})

const canCall = computed(() => {
  return agentChannel.value.trim() && destination.value.trim()
})

// Helpers
const getCallStateClass = (state: ChannelState): string => {
  switch (state) {
    case ChannelState.Up:
      return 'connected'
    case ChannelState.Ringing:
    case ChannelState.Ring:
      return 'ringing'
    case ChannelState.Down:
      return 'ended'
    default:
      return 'unknown'
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Handlers
async function handleConnect() {
  if (!amiConfig.value.url) return

  connecting.value = true
  connectionError.value = ''

  try {
    await amiConnect({ url: amiConfig.value.url })

    const client = getClient()
    if (client) {
      callsComposable.value = useAmiCalls(client, {
        useEvents: true,
        agentFirst: true,
        defaultContext: 'from-internal',
        dialTimeout: timeout.value * 1000,
        onCallStart: (call) => {
          console.log('Call started:', call.channel)
        },
        onCallEnd: (call) => {
          console.log('Call ended:', call.channel)
        },
        onCallStateChange: (call, oldState) => {
          console.log('Call state changed:', call.channel, oldState, '->', call.state)
        },
      })

      // Initial refresh
      if (callsComposable.value) {
        await callsComposable.value.refresh()
      }
    }

    // Save URL
    localStorage.setItem('vuesip-ami-url', amiConfig.value.url)
  } catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Connection failed'
  } finally {
    connecting.value = false
  }
}

function handleDisconnect() {
  amiDisconnect()
  callsComposable.value = null
}

async function handleRefresh() {
  if (callsComposable.value) {
    await callsComposable.value.refresh()
  }
}

async function handleCall() {
  if (!callsComposable.value || !canCall.value) return

  calling.value = true
  callError.value = ''
  lastCallResult.value = null

  try {
    const result = await callsComposable.value.clickToCall(
      agentChannel.value.trim(),
      destination.value.trim(),
      {
        callerId: callerId.value || undefined,
        timeout: timeout.value * 1000,
      }
    )

    lastCallResult.value = result

    if (result.success) {
      // Clear destination on success
      destination.value = ''
    }
  } catch (err) {
    callError.value = err instanceof Error ? err.message : 'Call failed'
    lastCallResult.value = {
      success: false,
      message: callError.value,
      response: 'ERROR',
    }
  } finally {
    calling.value = false
  }
}

async function quickDial(number: string) {
  if (!agentChannel.value.trim()) {
    callError.value = 'Please enter your extension first'
    return
  }

  destination.value = number
  await handleCall()
}

async function handleHangup(uniqueId: string) {
  if (!callsComposable.value) return

  try {
    await callsComposable.value.hangup(uniqueId)
  } catch (err) {
    console.error('Hangup failed:', err)
  }
}

function showTransfer(call: ActiveCall) {
  transferTarget.value = call
  transferDestination.value = ''
}

function cancelTransfer() {
  transferTarget.value = null
  transferDestination.value = ''
}

async function handleTransfer() {
  if (!callsComposable.value || !transferTarget.value || !transferDestination.value) return

  try {
    await callsComposable.value.transfer(transferTarget.value.uniqueId, transferDestination.value)
    cancelTransfer()
  } catch (err) {
    console.error('Transfer failed:', err)
  }
}

// Load saved settings
onMounted(() => {
  const savedUrl = localStorage.getItem('vuesip-ami-url')
  if (savedUrl) {
    amiConfig.value.url = savedUrl
  }

  const savedChannel = localStorage.getItem('vuesip-agent-channel')
  if (savedChannel) {
    agentChannel.value = savedChannel
  }
})

// Save agent channel when changed
watch(agentChannel, (value) => {
  if (value.trim()) {
    localStorage.setItem('vuesip-agent-channel', value)
  }
})

// Navigation function
const goSipWidget = () => {
  window.location.hash = '#click-to-call-widget'
}
</script>

<style scoped>
.click-to-call-demo {
  max-width: 900px;
  margin: 0 auto;
}

.config-panel {
  padding: 2rem;
}

/* Card component handles config-panel h3 styling */

.info-text {
  margin-bottom: 1.5rem;
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
}

/* Input styling now handled by PrimeVue InputText/InputNumber components */
:deep(.p-inputtext),
:deep(.p-inputnumber) {
  width: 100%;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* Button styling now handled by PrimeVue Button component */
.infobox {
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  border: 1px dashed var(--vp-c-divider);
  padding: 8px;
  border-radius: 8px;
}
.link-btn {
  margin-top: 8px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
}
.link-btn:hover {
  background: var(--vp-c-bg-soft);
}
.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

/* Error message styling now handled by PrimeVue Message component */

/* Connected Interface */
.connected-interface {
  padding: 2rem;
}

/* Card component handles status-bar styling */
.status-bar {
  margin-bottom: 2rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

/* Status dot now handled by PrimeVue Badge component */
.last-refresh {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

/* Card component handles call-form styling */
.call-form {
  margin-bottom: 2rem;
}

.call-actions {
  text-align: center;
  margin-top: 1.5rem;
}

/* Call result styling now handled by PrimeVue Message component */

/* Card component handles quick-dial styling */
.quick-dial {
  margin-bottom: 2rem;
}

.quick-dial-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

/* Button component handles btn-quick styling with severity="secondary" */
.btn-quick {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.quick-number {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Card component handles active-calls styling */

.empty-state {
  padding: 2rem;
  text-align: center;
  background: var(--surface-50);
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.call-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
  border-left: 4px solid var(--border-color);
}

.call-card.connected {
  border-left-color: var(--success);
}

.call-card.ringing {
  border-left-color: var(--primary);
  animation: pulse 1s infinite;
}

.call-card.ended {
  border-left-color: var(--text-secondary);
  opacity: 0.7;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.call-info {
  flex: 1;
}

.call-parties {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--text-color);
}

.arrow {
  color: var(--text-secondary);
}

.call-details {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.call-state {
  padding: 0 1rem;
}

/* State badge styling now handled by PrimeVue Tag component with dynamic severity */

.call-actions {
  display: flex;
  gap: 0.5rem;
}

/* Dialog styling now handled by PrimeVue Dialog component */

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .status-bar {
    flex-direction: column;
  }

  .call-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .call-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
