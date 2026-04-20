<template>
  <div class="call-center">
    <div class="skip-links">
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#call-queue" class="skip-link">Skip to call queue</a>
      <a href="#active-call" class="skip-link">Skip to active call</a>
      <a href="#call-history" class="skip-link">Skip to call history</a>
    </div>

    <div v-if="!isConnected" class="login-container">
      <div class="login-card card">
        <h1>Call Center Login</h1>
        <ConnectionPanel
          :is-connected="isConnected"
          :is-registered="isRegistered"
          :is-connecting="isConnecting"
          :error="connectionErrorMessage"
          @connect="handleConnect"
          @disconnect="handleDisconnect"
        />
        <div class="login-hints">
          <p><strong>Preset:</strong> {{ selectedPreset }}</p>
          <ul class="readiness-list">
            <li>
              {{
                readiness.hasSecureContext
                  ? 'Secure context available'
                  : 'HTTPS required for media permissions'
              }}
            </li>
            <li>
              {{
                readiness.hasMicPermission
                  ? 'Microphone permission granted'
                  : 'Microphone permission will be requested on first call'
              }}
            </li>
            <li>
              {{
                readiness.hasOutputDevice
                  ? 'Audio output device available'
                  : 'Audio output device not detected yet'
              }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ statusAnnouncement }}
    </div>
    <div role="alert" aria-live="assertive" aria-atomic="true" class="sr-only">
      {{ errorAnnouncement }}
    </div>

    <div
      v-if="notification"
      class="notification-toast"
      :class="notification.type"
      role="status"
      aria-live="polite"
    >
      <span>{{ notification.message }}</span>
      <button class="close-btn" @click="notification = null" aria-label="Close notification">
        ×
      </button>
    </div>

    <div v-if="isConnected" class="dashboard">
      <header class="dashboard-header" role="banner">
        <div class="header-content">
          <h1>Call Center Dashboard</h1>
          <div class="header-center">
            <SystemStatus />
          </div>
          <div class="header-actions">
            <AgentStatusToggle :agent-status="agentStatus" @update:status="updateAgentStatus" />
            <button class="btn btn-danger btn-sm" @click="handleDisconnect">Disconnect</button>
          </div>
        </div>
      </header>

      <div class="dashboard-content">
        <aside class="sidebar" aria-label="Agent status and call queue">
          <AgentDashboard
            :agent-status="agentStatus"
            :current-call-id="callId"
            :total-calls-today="todayStats.totalCalls"
            :missed-calls="todayStats.missedCalls"
            :average-duration="todayStats.averageDuration"
          />
          <CallQueue
            id="call-queue"
            :queue="callQueue"
            :agent-status="agentStatus"
            @answer="handleQueuedCallAnswer"
            @queue-update="handleQueueUpdate"
          />
        </aside>

        <main id="main-content" class="main-content" aria-label="Active call or statistics">
          <ActiveCall
            v-if="isActive"
            id="active-call"
            :session="session"
            :state="state"
            :remote-uri="remoteUri"
            :remote-display-name="remoteDisplayName"
            :duration="duration"
            :is-muted="isMuted"
            :is-on-hold="isOnHold"
            :call-notes="currentCallNotes"
            @hangup="handleHangup"
            @mute="handleMuteToggle"
            @hold="handleHoldToggle"
            @send-dtmf="handleSendDTMF"
            @update:notes="currentCallNotes = $event"
            @call-state-change="handleCallStateChange"
          />

          <WrapUpPanel
            v-else-if="workspaceState === 'wrap-up'"
            :disposition="disposition"
            :notes="wrapUpNotes"
            :callback-requested="callbackRequested"
            :can-complete="canCompleteWrapUp"
            @update:disposition="disposition = $event"
            @update:notes="wrapUpNotes = $event"
            @update:callback-requested="callbackRequested = $event"
            @complete="handleWrapUpComplete"
            @cancel="handleWrapUpCancel"
          />

          <CallStats v-else :statistics="statistics" />
        </main>

        <aside id="call-history" class="history-panel" aria-label="Call history and statistics">
          <CustomerContextRail
            :context="customerContext"
            :workspace-state="workspaceState"
            :pending-callback-count="pendingCallbackCount"
          />
          <CallbackWorklist
            :callbacks="worklist"
            :selected-callback-id="selectedCallbackId"
            :can-start-outbound="canStartCallbackOutbound"
            @select="selectCallback"
            @start="handleStartCallback"
          />
          <CallHistoryPanel
            :history="annotatedHistory"
            :total-count="totalCalls"
            @filter="handleHistoryFilter"
            @export="handleHistoryExport"
            @select-callback="handleHistoryCallbackSelection"
          />
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  HistoryExportFormat,
  useSipClient,
  useCallSession,
  useCallHistory,
  type HistoryFilter,
} from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import AgentStatusToggle from './components/AgentStatusToggle.vue'
import AgentDashboard from './components/AgentDashboard.vue'
import CallQueue from './components/CallQueue.vue'
import ActiveCall from './components/ActiveCall.vue'
import CallStats from './components/CallStats.vue'
import CallHistoryPanel from './components/CallHistoryPanel.vue'
import SystemStatus from './components/SystemStatus.vue'
import CallbackWorklist from './features/agent/CallbackWorklist.vue'
import CustomerContextRail from './features/agent/CustomerContextRail.vue'
import WrapUpPanel from './features/agent/WrapUpPanel.vue'
import { useAgentWorkspace } from './features/agent/useAgentWorkspace'
import { useCallbackWorklist } from './features/agent/useCallbackWorklist'
import { useEnvironmentSetup } from './features/setup/useEnvironmentSetup'
import { useWrapUpDraft } from './features/agent/useWrapUpDraft'

type AgentStatus = 'available' | 'busy' | 'away'

interface QueuedCall {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
  queue: string
}

const loadAgentStatus = (): AgentStatus => {
  try {
    const saved = localStorage.getItem('callcenter:agentStatus')
    if (saved && ['available', 'busy', 'away'].includes(saved)) {
      return saved as AgentStatus
    }
  } catch (error) {
    console.error('Failed to load agent status:', error)
  }
  return 'away'
}

const saveAgentStatus = (status: AgentStatus) => {
  try {
    localStorage.setItem('callcenter:agentStatus', status)
  } catch (error) {
    console.error('Failed to save agent status:', error)
  }
}

const agentStatus = ref<AgentStatus>(loadAgentStatus())
const currentCallNotes = ref('')
const callQueue = ref<QueuedCall[]>([])
const notification = ref<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
const statusAnnouncement = ref('')
const errorAnnouncement = ref('')

const announceStatus = (message: string) => {
  statusAnnouncement.value = message
  window.setTimeout(() => {
    statusAnnouncement.value = ''
  }, 1000)
}

const showNotification = (type: 'success' | 'error' | 'info', message: string, duration = 5000) => {
  notification.value = { type, message }
  window.setTimeout(() => {
    notification.value = null
  }, duration)
}

const {
  isConnected,
  isRegistered,
  isConnecting,
  error,
  connect,
  disconnect,
  updateConfig,
  getClient,
} = useSipClient()

const sipClient = computed(() => getClient())

const {
  session,
  callId,
  state,
  remoteUri,
  remoteDisplayName,
  isActive,
  duration,
  isMuted,
  isOnHold,
  makeCall,
  hangup,
  toggleMute,
  toggleHold,
  sendDTMF,
} = useCallSession(sipClient)

const { filteredHistory, totalCalls, getStatistics, setFilter, exportHistory } = useCallHistory()

const statistics = computed(() => getStatistics())
const todayStats = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return getStatistics({
    dateFrom: today,
  })
})

const {
  workspaceState,
  customerContext,
  pendingCallbacks,
  setConnected,
  selectQueuedCall,
  beginWrapUp,
  enterWrapUp,
  clearWrapUp,
  handleNoAnswer,
} = useAgentWorkspace()

const { selectedPreset, readiness, syncFromForm, validateCurrentConfig, toSipConfig } =
  useEnvironmentSetup()

const {
  disposition,
  notes: wrapUpNotes,
  callbackRequested,
  canComplete: canCompleteWrapUp,
  hydrate: hydrateWrapUpDraft,
  reset: resetWrapUpDraft,
} = useWrapUpDraft()

const connectionErrorMessage = computed(() => error.value?.message ?? null)
const pendingCallbackCount = computed(() => pendingCallbacks.value.length)
const activeCallbackId = ref<string | null>(null)
const lastWrappedCallId = ref<string | null>(null)
const historyAnnotations = ref<
  Record<string, { tags: string[]; metadata: Record<string, unknown> }>
>({})

const {
  selectedCallbackId,
  selectedCallback,
  worklist,
  canStartCallbackOutbound,
  selectCallback,
  markCallbackInProgress,
  completeCallback,
  reopenCallback,
} = useCallbackWorklist(pendingCallbacks)

const annotatedHistory = computed(() =>
  filteredHistory.value.map((entry) => {
    const annotation = historyAnnotations.value[entry.id]
    if (!annotation) {
      return entry
    }

    return {
      ...entry,
      tags: [...new Set([...(entry.tags ?? []), ...annotation.tags])],
      metadata: {
        ...(entry.metadata ?? {}),
        ...annotation.metadata,
      },
    }
  })
)

let queueSimulationInterval: number | null = null

const startQueueSimulation = () => {
  if (queueSimulationInterval) {
    return
  }

  queueSimulationInterval = window.setInterval(() => {
    if (agentStatus.value === 'available' && Math.random() > 0.7) {
      addCallToQueue()
    }

    // Update wait times for queued calls
    callQueue.value.forEach((call) => {
      call.waitTime++
    })
  }, 5000) // Check every 5 seconds
}

const stopQueueSimulation = () => {
  if (queueSimulationInterval) {
    clearInterval(queueSimulationInterval)
    queueSimulationInterval = null
  }
}

const addCallToQueue = () => {
  const mockCallers = [
    { number: 'sip:customer1@domain.com', name: 'John Smith', queue: 'support' },
    { number: 'sip:customer2@domain.com', name: 'Jane Doe', queue: 'support' },
    { number: 'sip:customer3@domain.com', name: 'Bob Johnson', queue: 'billing' },
    { number: 'sip:support@domain.com', name: 'Support Request', queue: 'support' },
    { number: 'sip:sales@domain.com', name: 'Sales Inquiry', queue: 'sales' },
  ]

  const caller = mockCallers[Math.floor(Math.random() * mockCallers.length)]

  callQueue.value.push({
    id: `queue-${Date.now()}`,
    from: caller.number,
    displayName: caller.name,
    waitTime: 0,
    priority: Math.floor(Math.random() * 3) + 1,
    queue: caller.queue,
  })
}

const syncWorkspaceFromAgentStatus = (status: AgentStatus) => {
  if (!isConnected.value) {
    workspaceState.value = 'offline'
    return
  }

  if (workspaceState.value === 'wrap-up') {
    return
  }

  if (status === 'available') {
    workspaceState.value = 'available'
  } else if (status === 'busy') {
    workspaceState.value = isActive.value ? 'busy' : 'paused'
  } else {
    workspaceState.value = 'paused'
  }
}

const handleConnect = async (form: {
  server: string
  username: string
  password: string
  displayName: string
}) => {
  try {
    syncFromForm(form)

    const validation = validateCurrentConfig()
    if (!validation.valid) {
      const message = `Missing required fields: ${validation.errors.join(', ')}`
      errorAnnouncement.value = message
      showNotification('error', message)
      return
    }

    workspaceState.value = 'connecting'

    const result = updateConfig(toSipConfig())
    if (!result.valid) {
      const message = result.errors?.join(', ') || 'Invalid SIP configuration'
      errorAnnouncement.value = message
      showNotification('error', message)
      return
    }

    await connect()
    setConnected(true)
    syncWorkspaceFromAgentStatus(agentStatus.value)

    if (agentStatus.value === 'available') {
      startQueueSimulation()
    }

    showNotification('success', 'Connected to call center')
  } catch (connectError) {
    workspaceState.value = 'offline'
    const message =
      connectError instanceof Error ? connectError.message : 'Failed to connect to call center'
    errorAnnouncement.value = message
    showNotification('error', message)
  }
}

const handleDisconnect = async () => {
  try {
    stopQueueSimulation()
    await disconnect()
    setConnected(false)
    clearWrapUp('offline')
    resetWrapUpDraft()
    currentCallNotes.value = ''
    callQueue.value = []
    agentStatus.value = 'away'
    saveAgentStatus('away')
    showNotification('success', 'Disconnected from call center')
  } catch (error) {
    console.error('Disconnect failed:', error)
    showNotification(
      'error',
      'Failed to disconnect: ' + (error instanceof Error ? error.message : 'Unknown error')
    )
  }
}

const updateAgentStatus = (status: AgentStatus) => {
  const oldStatus = agentStatus.value
  agentStatus.value = status
  saveAgentStatus(status)

  // Announce status change
  if (oldStatus !== status) {
    const statusText = status === 'available' ? 'Available' : status === 'busy' ? 'Busy' : 'Away'
    announceStatus(`Agent status changed to ${statusText}`)
  }

  // Start/stop queue simulation based on status
  if (status === 'available') {
    startQueueSimulation()
  } else {
    stopQueueSimulation()
  }

  syncWorkspaceFromAgentStatus(status)
}

const handleQueueUpdate = (announcement: string) => {
  announceStatus(announcement)
}

const handleCallStateChange = (announcement: string) => {
  announceStatus(announcement)
}

const handleQueuedCallAnswer = async (queuedCall: QueuedCall) => {
  try {
    callQueue.value = callQueue.value.filter((c) => c.id !== queuedCall.id)
    selectQueuedCall(queuedCall)
    agentStatus.value = 'busy'
    saveAgentStatus('busy')
    stopQueueSimulation()

    await makeCall(queuedCall.from)
    showNotification('success', `Connected to ${queuedCall.displayName || queuedCall.from}`)
  } catch (error) {
    console.error('Failed to answer queued call:', error)
    showNotification(
      'error',
      'Failed to answer call: ' + (error instanceof Error ? error.message : 'Unknown error')
    )
    handleNoAnswer()
    callQueue.value.push(queuedCall)
    agentStatus.value = 'available'
    saveAgentStatus('available')
    syncWorkspaceFromAgentStatus('available')
  }
}

const handleHangup = async () => {
  try {
    await hangup()
  } catch (error) {
    console.error('Failed to hangup:', error)
  }
}

const handleMuteToggle = async () => {
  await toggleMute()
}

const handleHoldToggle = async () => {
  await toggleHold()
}

const handleSendDTMF = async (digit: string) => {
  await sendDTMF(digit)
}

const handleHistoryFilter = (filter: HistoryFilter | null) => {
  setFilter(filter)
}

const handleHistoryExport = async (options: {
  format: HistoryExportFormat
  filename?: string
  includeMetadata?: boolean
}) => {
  try {
    await exportHistory(options)
  } catch (error) {
    console.error('Failed to export history:', error)
  }
}

const handleHistoryCallbackSelection = (callbackId: string) => {
  selectCallback(callbackId)
  showNotification('info', 'Callback task opened in the worklist')
}

const handleStartCallback = async () => {
  if (!selectedCallback.value) {
    return
  }

  try {
    stopQueueSimulation()
    activeCallbackId.value = selectedCallback.value.id
    markCallbackInProgress(selectedCallback.value.id)
    customerContext.value = {
      ...customerContext.value,
      displayName: selectedCallback.value.contactName || selectedCallback.value.targetUri,
      address: selectedCallback.value.targetUri,
      queue: selectedCallback.value.queue,
    }
    agentStatus.value = 'busy'
    saveAgentStatus('busy')
    await makeCall(selectedCallback.value.targetUri)
    showNotification(
      'info',
      `Calling ${selectedCallback.value.contactName || selectedCallback.value.targetUri}...`
    )
  } catch (error) {
    console.error('Failed to start callback:', error)
    showNotification(
      'error',
      'Failed to make call: ' + (error instanceof Error ? error.message : 'Unknown error')
    )
    if (activeCallbackId.value) {
      reopenCallback(activeCallbackId.value)
    }
    activeCallbackId.value = null
    agentStatus.value = 'available'
    saveAgentStatus('available')
    syncWorkspaceFromAgentStatus('available')
  }
}

const handleWrapUpComplete = () => {
  const finalizedDisposition = disposition.value
  const finalizedNotes = wrapUpNotes.value.trim()
  const createdCallback = enterWrapUp({
    disposition: disposition.value,
    notes: finalizedNotes,
    callbackRequested: callbackRequested.value,
  })

  if (lastWrappedCallId.value) {
    historyAnnotations.value[lastWrappedCallId.value] = {
      tags: [finalizedDisposition, callbackRequested.value ? 'callback' : null].filter(
        (value): value is string => Boolean(value)
      ),
      metadata: {
        disposition: finalizedDisposition,
        notes: finalizedNotes || undefined,
        callbackTaskId: createdCallback?.id ?? activeCallbackId.value ?? undefined,
      },
    }
  }

  if (activeCallbackId.value) {
    completeCallback(activeCallbackId.value)
    activeCallbackId.value = null
  }

  const nextAgentStatus: AgentStatus = agentStatus.value === 'away' ? 'away' : 'available'
  clearWrapUp(nextAgentStatus === 'available' ? 'available' : 'paused')
  resetWrapUpDraft()
  currentCallNotes.value = ''
  agentStatus.value = nextAgentStatus
  saveAgentStatus(nextAgentStatus)

  if (nextAgentStatus === 'available') {
    startQueueSimulation()
  } else {
    stopQueueSimulation()
  }
}

const handleWrapUpCancel = () => {
  if (activeCallbackId.value) {
    reopenCallback(activeCallbackId.value)
    activeCallbackId.value = null
  }

  const nextState = agentStatus.value === 'away' ? 'paused' : 'available'
  clearWrapUp(nextState)
  resetWrapUpDraft()
  currentCallNotes.value = ''

  if (nextState === 'available') {
    startQueueSimulation()
  } else {
    stopQueueSimulation()
  }
}

watch(isConnected, (connected) => {
  setConnected(connected)

  if (!connected) {
    stopQueueSimulation()
    const disconnectedStatus: AgentStatus = 'away'
    agentStatus.value = disconnectedStatus
    saveAgentStatus(disconnectedStatus)
    callQueue.value = []
    clearWrapUp('offline')
  } else {
    syncWorkspaceFromAgentStatus(agentStatus.value)

    if (agentStatus.value === 'available') {
      startQueueSimulation()
    }
  }
})

watch(isActive, (active, wasActive) => {
  if (active) {
    agentStatus.value = 'busy'
    saveAgentStatus('busy')
    workspaceState.value = 'busy'
    stopQueueSimulation()
  } else if (
    wasActive &&
    isConnected.value &&
    agentStatus.value === 'busy' &&
    workspaceState.value !== 'wrap-up'
  ) {
    lastWrappedCallId.value = callId.value
    beginWrapUp({
      notes: currentCallNotes.value,
      callbackRequested: false,
    })
    hydrateWrapUpDraft({
      disposition: null,
      notes: currentCallNotes.value,
      callbackRequested: false,
    })
    showNotification('info', 'Call ended. Complete wrap-up before returning to queue work.')
  } else if (!active && agentStatus.value === 'available') {
    syncWorkspaceFromAgentStatus('available')
  }
})

watch(error, (currentError) => {
  if (currentError) {
    errorAnnouncement.value = currentError.message
  }
})

watch(state, (currentState) => {
  if (currentState === 'terminated') {
    announceStatus('Call ended')
  } else if (currentState === 'active') {
    announceStatus('Call active')
  } else if (currentState === 'held') {
    announceStatus('Call on hold')
  } else if (agentStatus.value === 'busy') {
    announceStatus(`Call state changed to ${currentState}`)
  }
})
</script>

<style scoped>
.call-center {
  width: 100%;
  min-height: 100vh;
  background: #f3f4f6;
}

/* Screen Reader Only Content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Skip Navigation Links */
.skip-links {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 9999;
}

.skip-link {
  position: absolute;
  left: -9999px;
  padding: 0.75rem 1.5rem;
  background: #1e40af;
  color: white;
  text-decoration: none;
  font-weight: 600;
  border-radius: 0 0 8px 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.skip-link:focus {
  left: 0;
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
}

/* Login Container */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.login-card {
  max-width: 500px;
  width: 100%;
}

.login-card h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #111827;
}

/* Dashboard Layout */
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.dashboard-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  font-size: 1.5rem;
  color: #111827;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  gap: 1.5rem;
  padding: 1.5rem;
  flex: 1;
  overflow: hidden;
}

.sidebar,
.main-content,
.history-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

/* Responsive Design */
@media (max-width: 1400px) {
  .dashboard-content {
    grid-template-columns: 280px 1fr 350px;
  }
}

@media (max-width: 1200px) {
  .dashboard-content {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .sidebar,
  .history-panel {
    overflow-y: visible;
  }

  .header-center {
    display: none;
  }
}

/* Notification Toast */
.notification-toast {
  position: fixed;
  top: 80px;
  right: 2rem;
  padding: 1rem 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
  max-width: 400px;
  border-left: 4px solid #3b82f6;
}

.notification-toast.success {
  border-left-color: #10b981;
}

.notification-toast.error {
  border-left-color: #ef4444;
}

.notification-toast.info {
  border-left-color: #3b82f6;
}

.notification-toast .close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.notification-toast .close-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
