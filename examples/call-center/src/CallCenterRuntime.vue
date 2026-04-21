<template>
  <div>
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

    <div v-if="isConnected" class="dashboard" data-testid="call-center-dashboard">
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
          <SupervisorBoard
            :queue-rows="queueRows"
            :agent-rows="agentRows"
            :alert-rows="alertRows"
            :callback-rows="callbackRows"
            @reassign="handleSupervisorReassign"
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
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import {
  HistoryExportFormat,
  useSipClient,
  useCallSession,
  useCallHistory,
  type HistoryFilter,
  type SipClientConfig,
} from 'vuesip'
import AgentStatusToggle from './components/AgentStatusToggle.vue'
import AgentDashboard from './components/AgentDashboard.vue'
import CallQueue from './components/CallQueue.vue'
import ActiveCall from './components/ActiveCall.vue'
import CallStats from './components/CallStats.vue'
import CustomerContextRail from './features/agent/CustomerContextRail.vue'
import WrapUpPanel from './features/agent/WrapUpPanel.vue'
import { useAgentWorkspace } from './features/agent/useAgentWorkspace'
import { useCallbackWorklist } from './features/agent/useCallbackWorklist'
import { createDemoMvpGateway } from './features/shared/demo-mvp-gateway'
import { useWrapUpDraft } from './features/agent/useWrapUpDraft'
import { useSupervisorBoard } from './features/supervisor/useSupervisorBoard'

const props = defineProps<{
  selectedPreset: string
  sipConfig: SipClientConfig
}>()

const emit = defineEmits<{
  connected: []
  connectionError: [message: string]
  disconnected: []
}>()

const SystemStatus = defineAsyncComponent(() => import('./components/SystemStatus.vue'))
const CallHistoryPanel = defineAsyncComponent(() => import('./components/CallHistoryPanel.vue'))
const CallbackWorklist = defineAsyncComponent(() => import('./features/agent/CallbackWorklist.vue'))
const SupervisorBoard = defineAsyncComponent(
  () => import('./features/supervisor/SupervisorBoard.vue')
)

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

const { isConnected, error, connect, disconnect, updateConfig, getClient } = useSipClient()

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

const {
  disposition,
  notes: wrapUpNotes,
  callbackRequested,
  canComplete: canCompleteWrapUp,
  hydrate: hydrateWrapUpDraft,
  reset: resetWrapUpDraft,
} = useWrapUpDraft()

const pendingCallbackCount = computed(() => pendingCallbacks.value.length)
const activeCallbackId = ref<string | null>(null)
const lastWrappedCallId = ref<string | null>(null)
const demoCallbacksSeeded = ref(false)
const historyAnnotations = ref<
  Record<string, { tags: string[]; metadata: Record<string, unknown> }>
>({})
const demoGateway = createDemoMvpGateway()
const isTestMode = typeof window !== 'undefined' && window.location.search.includes('test=true')

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

const { queueRows, agentRows, alertRows, callbackRows, reassignCallback } = useSupervisorBoard({
  queueCalls: callQueue,
  callbacks: pendingCallbacks,
  agentStatus,
  workspaceState,
  activeCallId: callId,
})

const startQueueSimulation = () => {
  if (props.selectedPreset === 'demo' && !demoCallbacksSeeded.value) {
    pendingCallbacks.value.push(...demoGateway.createSeedCallbacks())
    demoCallbacksSeeded.value = true
  }

  if (isTestMode && callQueue.value.length === 0) {
    callQueue.value.push(demoGateway.createInboundCall())
  }

  demoGateway.start(
    {
      isQueueOpen: () => agentStatus.value === 'available',
      onInboundCall: (call) => {
        callQueue.value.push(call)
      },
      onTick: () => {
        callQueue.value.forEach((call) => {
          call.waitTime++
        })
      },
    },
    isTestMode ? 60000 : 5000
  )
}

const stopQueueSimulation = () => {
  demoGateway.stop()
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

const initializeConnection = async () => {
  try {
    workspaceState.value = 'connecting'

    const result = updateConfig(props.sipConfig)
    if (!result.valid) {
      const message = result.errors?.join(', ') || 'Invalid SIP configuration'
      errorAnnouncement.value = message
      emit('connectionError', message)
      return
    }

    await connect()
    setConnected(true)
    syncWorkspaceFromAgentStatus(agentStatus.value)

    if (agentStatus.value === 'available') {
      startQueueSimulation()
    }

    emit('connected')
    showNotification('success', 'Connected to call center')
  } catch (connectError) {
    workspaceState.value = 'offline'
    const message =
      connectError instanceof Error ? connectError.message : 'Failed to connect to call center'
    errorAnnouncement.value = message
    setConnected(false)
    stopQueueSimulation()
    emit('connectionError', message)
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
    demoCallbacksSeeded.value = false
    agentStatus.value = 'away'
    saveAgentStatus('away')
    emit('disconnected')
  } catch (disconnectError) {
    console.error('Disconnect failed:', disconnectError)
    showNotification(
      'error',
      'Failed to disconnect: ' +
        (disconnectError instanceof Error ? disconnectError.message : 'Unknown error')
    )
  }
}

const updateAgentStatus = (status: AgentStatus) => {
  const oldStatus = agentStatus.value
  agentStatus.value = status
  saveAgentStatus(status)

  if (oldStatus !== status) {
    const statusText = status === 'available' ? 'Available' : status === 'busy' ? 'Busy' : 'Away'
    announceStatus(`Agent status changed to ${statusText}`)
  }

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
  } catch (answerError) {
    console.error('Failed to answer queued call:', answerError)
    showNotification(
      'error',
      'Failed to answer call: ' +
        (answerError instanceof Error ? answerError.message : 'Unknown error')
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
  } catch (hangupError) {
    console.error('Failed to hangup:', hangupError)
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
  } catch (historyError) {
    console.error('Failed to export history:', historyError)
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
  } catch (callbackError) {
    console.error('Failed to start callback:', callbackError)
    showNotification(
      'error',
      'Failed to make call: ' +
        (callbackError instanceof Error ? callbackError.message : 'Unknown error')
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

const handleSupervisorReassign = (callbackId: string) => {
  reassignCallback(callbackId, 'supervisor-queue')
  showNotification('info', 'Callback reassigned to supervisor-queue')
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
    demoCallbacksSeeded.value = false
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

onMounted(() => {
  void initializeConnection()
})

onUnmounted(() => {
  stopQueueSimulation()
})
</script>

<style scoped>
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
