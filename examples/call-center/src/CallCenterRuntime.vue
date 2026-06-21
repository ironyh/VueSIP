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
          <div class="header-copy">
            <p class="header-eyebrow">Agent workspace</p>
            <h1>Call Center Dashboard</h1>
            <p class="header-summary">
              Inbound queue work, callback follow-up, and supervisor visibility in a single demo
              shell.
            </p>
          </div>
          <div class="header-center">
            <SystemStatus :mode="isConnectedMode ? 'connected' : 'demo'" />
          </div>
          <div class="header-actions">
            <div class="view-switcher" role="tablist" aria-label="Workspace view">
              <button
                role="tab"
                :aria-selected="activeView === 'agent'"
                :class="['view-tab', { active: activeView === 'agent' }]"
                @click="activeView = 'agent'"
              >
                Agent
              </button>
              <button
                role="tab"
                :aria-selected="activeView === 'admin'"
                :class="['view-tab', { active: activeView === 'admin' }]"
                @click="activeView = 'admin'"
              >
                Admin
              </button>
            </div>
            <span class="header-pill">{{ selectedPreset }} preset</span>
            <span class="header-pill" :class="{ neutral: !isConnectedMode }">
              {{ isConnectedMode ? 'Connected (AMI)' : 'Demo' }}
            </span>
            <AgentStatusToggle :agent-status="agentStatus" @update:status="updateAgentStatus" />
            <button class="btn btn-danger btn-sm" @click="handleDisconnect">Disconnect</button>
          </div>
        </div>
        <DemoKpiBar
          :active-scenario="activeScenario"
          :queue-load="callQueue.length"
          :open-callbacks="callbackRows.length"
        />
      </header>

      <AdminPanel v-if="activeView === 'admin'" />

      <div v-else class="dashboard-content">
        <aside class="sidebar" aria-label="Agent status and call queue">
          <PresenterControls
            :active-scenario="activeScenario"
            :reset-disabled="isActive || workspaceState === 'wrap-up'"
            @set-scenario="activeScenario = $event"
            @run-scene="handlePresenterScene"
            @force-inbound="handlePresenterForceInbound"
            @seed-callback="handlePresenterSeedCallback"
            @reset-demo="handlePresenterReset"
          />
          <AgentDashboard
            :agent-status="agentStatus"
            :current-call-id="callId"
            :total-calls-today="todayStats.totalCalls"
            :missed-calls="todayStats.missedCalls"
            :average-duration="todayStats.averageDuration"
            :queue-load="callQueue.length"
            :open-callbacks="callbackRows.length"
            :next-action-title="nextAction.title"
            :next-action-detail="nextAction.detail"
            :next-action-tone="nextAction.tone"
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
            :patient-id="currentPatientId"
            :agent-person-id="currentAgentPersonId"
            :agent-role-ids="currentAgentRoleIds"
            :active-role-id="activeRoleId"
            @claim-responsibility="handleClaimResponsibility"
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
import type { AmiConfig } from '../../src/types/ami.types'
import AgentStatusToggle from './components/AgentStatusToggle.vue'
import AgentDashboard from './components/AgentDashboard.vue'
import CallQueue from './components/CallQueue.vue'
import ActiveCall from './components/ActiveCall.vue'
import CallStats from './components/CallStats.vue'
import DemoKpiBar from './components/DemoKpiBar.vue'
import PresenterControls from './components/PresenterControls.vue'
import CustomerContextRail from './features/agent/CustomerContextRail.vue'
import { buildAgentNextAction } from './features/agent/nextAction'
import WrapUpPanel from './features/agent/WrapUpPanel.vue'
import { useAgentWorkspace } from './features/agent/useAgentWorkspace'
import { useCallbackWorklist } from './features/agent/useCallbackWorklist'
import { createDemoMvpGateway } from './features/shared/demo-mvp-gateway'
import { createPresenterControls } from './features/shared/presenterControls'
import { buildCustomerContextView } from './features/shared/workspace-mappers'
import type { DemoContactProfile, DemoStoryScene } from './features/shared/mvp-types'
import { useWrapUpDraft } from './features/agent/useWrapUpDraft'
import { useSupervisorBoard } from './features/supervisor/useSupervisorBoard'
import { useAmi } from 'vuesip'
import { useAmiQueues } from 'vuesip'
import { useAmiAgentLogin } from 'vuesip'
import { useAmiCallback } from 'vuesip'
import { createConnectedGateway } from './features/shared/connected-gateway'
import { mapCallbackRequestToView } from './features/shared/callback-mappers'
import type { MvpGateway, QueuedCallView } from './features/shared/mvp-types'
import AdminPanel from './features/admin/AdminPanel.vue'
import { usePatientAssignments } from './features/admin/usePatientAssignments'

type WorkspaceView = 'agent' | 'admin'
const activeView = ref<WorkspaceView>('agent')

const props = defineProps<{
  selectedPreset: string
  sipConfig: SipClientConfig
  amiConfig: AmiConfig | null
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
type DemoScenario = 'support' | 'billing' | 'sales'

interface QueuedCall {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
  queue: string
  profile?: DemoContactProfile
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

// --- Patient/OAS responsibility wiring ------------------------------------
// The agent can claim OAS responsibility for the current caller with one click.
const patientAssignments = usePatientAssignments()

/**
 * Derive the patient id for the current interaction from the active call's
 * remote party. Matches the remote display name against known patient names.
 */
const currentPatientId = computed<string | null>(() => {
  if (!remoteDisplayName.value) return null
  const known = patientAssignments.directory.value.assignments.find((a) =>
    a.patientName.toLowerCase().includes(remoteDisplayName.value!.toLowerCase())
  )
  return known?.patientId ?? null
})

/**
 * The professional role the current call concerns — derived from the inbound
 * line/queue of the matching queue entry (if the active call came from a queue)
 * or the remote party. Drives which role the "Jag tar ansvar" button targets
 * and which role is highlighted in the customer context rail.
 */
const activeRoleId = computed<string | null>(() => {
  const matchingQueued = callQueue.value.find(
    (c) => c.from === remoteUri.value || c.displayName === remoteDisplayName.value
  )
  return matchingQueued?.roleId ?? null
})

/**
 * The signed-in agent as a person in the directory. Demo: the first person is
 * treated as the logged-in agent. A real deployment would map the SIP extension
 * to a person id from the directory.
 */
const currentAgentPersonId = computed<string | null>(
  () => patientAssignments.directory.value.nurses[0]?.id ?? null
)

/** Roles the signed-in agent can hold (drives which "Jag tar ansvar" buttons show). */
const currentAgentRoleIds = computed<string[]>(() => {
  const person = currentAgentPersonId.value
    ? patientAssignments.personById.value.get(currentAgentPersonId.value)
    : null
  return person?.roleIds ?? []
})

function handleClaimResponsibility(patientId: string, roleId: string) {
  if (!currentAgentPersonId.value) return
  patientAssignments.assignRole(patientId, roleId, currentAgentPersonId.value)
  showNotification('success', `Du är nu ansvarig (${roleLabel(roleId)}) för patienten`)
}

function roleLabel(roleId: string): string {
  return patientAssignments.roleById.value.get(roleId)?.label ?? roleId
}

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
const activeScenario = ref<DemoScenario>('support')
const demoCallbacksSeeded = ref(false)
const historyAnnotations = ref<
  Record<string, { tags: string[]; metadata: Record<string, unknown> }>
>({})
const demoGateway = createDemoMvpGateway()
const isTestMode = typeof window !== 'undefined' && window.location.search.includes('test=true')

// --- Connected mode (AMI) wiring -----------------------------------------
// Composables are always instantiated in setup scope (Vue requirement); the AMI
// connection itself is only established when an amiConfig prop is present.
const ami = useAmi()
const amiQueues = useAmiQueues(ami.getClient(), { useEvents: true })
const isConnectedMode = computed(() => props.amiConfig !== null)

// In connected mode the queue feed is driven by live AMI events; in demo mode
// it is driven by the simulated demo gateway. Both implement MvpGateway.
const gateway: MvpGateway = isConnectedMode.value
  ? createConnectedGateway({
      connectionState: ami.connectionState,
      queues: amiQueues.queues,
    })
  : demoGateway

// --- AMI agent-login + callback (connected mode) -------------------------
// NOTE: ami.getClient() is a snapshot (AmiClient | null), not a Ref. At setup
// time it is null (AMI connects later in initializeConnection). Both composables
// tolerate null clients and re-check at call time; we (re)load/refresh after
// ami.connect() resolves. Event listeners bind once with the snapshot, so for
// robust event sync we also rely on the connected-gateway's queue ref + a
// manual refresh on connect.
const sipExtension = (() => {
  const m = props.sipConfig.sipUri?.match(/sip:([^@]+)@/)
  return m ? m[1] : ''
})()

const amiAgentLogin = useAmiAgentLogin(ami.getClient(), {
  agentId: props.sipConfig.sipUri || sipExtension || 'agent',
  interface: sipExtension ? `PJSIP/${sipExtension}` : 'PJSIP/agent',
  defaultQueues: ['8001', '8002', '8003'],
  persistState: false,
})

const amiCallback = useAmiCallback(ami.getClient(), {
  storage: { persistEnabled: true },
  defaultContext: 'from-internal',
})

// In connected mode the callback worklist is fed by AMI (AstDB-backed); in demo
// mode it is the local pendingCallbacks ref. useCallbackWorklist takes a
// Ref<CallbackTaskView[]>, so we feed it an adapter ref that mirrors the chosen
// source.
const callbackWorklistSource = computed<CallbackTaskView[]>(() =>
  isConnectedMode.value
    ? amiCallback.callbacks.value.map(mapCallbackRequestToView)
    : pendingCallbacks.value
)
const callbackWorklistRef = ref<CallbackTaskView[]>([])
watch(
  callbackWorklistSource,
  (v) => {
    callbackWorklistRef.value = v
  },
  { immediate: true, deep: true }
)

const {
  selectedCallbackId,
  selectedCallback,
  worklist,
  canStartCallbackOutbound,
  selectCallback,
  markCallbackInProgress,
  completeCallback,
  reopenCallback,
} = useCallbackWorklist(callbackWorklistRef)

const nextAction = computed(() =>
  buildAgentNextAction({
    agentStatus: agentStatus.value,
    workspaceState: workspaceState.value,
    queue: callQueue.value,
    callbacks: worklist.value,
    selectedCallback: selectedCallback.value,
    isActive: isActive.value,
  })
)

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

const presenterControls = createPresenterControls({
  gateway: demoGateway,
  queue: callQueue,
  callbacks: pendingCallbacks,
  selectedCallbackId,
  currentCallNotes,
  historyAnnotations,
  activeCallbackId,
  lastWrappedCallId,
  customerContext,
  workspaceState,
  resetWrapUpDraft,
  clearWrapUp,
})

const startQueueSimulation = () => {
  // Seed demo callbacks only in demo mode (connected mode would source these from AMI/AstDB).
  if (!isConnectedMode.value && !demoCallbacksSeeded.value) {
    pendingCallbacks.value.push(...demoGateway.createSeedCallbacks())
    demoCallbacksSeeded.value = true
  }

  gateway.start(
    {
      isQueueOpen: () => agentStatus.value === 'available',
      onInboundCall: (call) => {
        // Connected mode pushes live AMI callers (replace, not append, to avoid dupes);
        // demo mode appends simulated callers.
        if (isConnectedMode.value) {
          const exists = callQueue.value.some((c) => c.id === call.id)
          if (!exists) {
            callQueue.value.push(call)
          }
        } else {
          callQueue.value.push(call)
        }
      },
      onTick: () => {
        if (isConnectedMode.value) {
          // In connected mode the live queue map is the source of truth: reconcile
          // the visible callQueue with the current AMI entries (adds new, drops gone).
          const live = flattenQueueEntriesFromRef()
          const liveIds = new Set(live.map((c) => c.id))
          callQueue.value = callQueue.value.filter((c) => liveIds.has(c.id))
          // Update wait times from the live feed.
          const byId = new Map(live.map((c) => [c.id, c]))
          callQueue.value.forEach((c) => {
            const fresh = byId.get(c.id)
            if (fresh) c.waitTime = fresh.waitTime
          })
        } else {
          callQueue.value.forEach((call) => {
            call.waitTime++
          })
        }
      },
    },
    isTestMode ? 60000 : 5000
  )
}

const flattenQueueEntriesFromRef = () => {
  const queues = amiQueues.queues.value
  const all: QueuedCallView[] = []
  for (const queue of queues.values()) {
    for (const entry of queue.entries) {
      all.push({
        id: entry.uniqueId || entry.channel,
        from: entry.callerIdNum || entry.channel,
        displayName: entry.callerIdName || undefined,
        waitTime: Math.round(entry.wait),
        priority: entry.priority,
        queue: entry.queue,
      })
    }
  }
  return all
}

const stopQueueSimulation = () => {
  gateway.stop()
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

    // Establish the AMI connection when connected mode is configured. The AMI
    // feed drives queue entries; the SIP connection drives the actual audio.
    if (props.amiConfig) {
      await ami.connect(props.amiConfig)
      // Load shared callbacks from AstDB now that the AMI client is connected.
      // (Composables captured a null client at setup; loadFromStorage re-checks.)
      try {
        await amiCallback.loadFromStorage()
      } catch (loadErr) {
        console.error('Failed to load callbacks from AstDB:', loadErr)
      }
      // If the agent is already 'available', log them into the queues on PBX.
      if (agentStatus.value === 'available') {
        try {
          await amiAgentLogin.login({ queues: ['8001', '8002', '8003'] })
        } catch (loginErr) {
          console.error('Agent login failed:', loginErr)
        }
      }
    }

    setConnected(true)
    syncWorkspaceFromAgentStatus(agentStatus.value)

    if (agentStatus.value === 'available') {
      startQueueSimulation()
    }

    emit('connected')
    showNotification(
      'success',
      isConnectedMode.value ? 'Connected to call center (Asterisk AMI)' : 'Connected to call center'
    )
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
    if (ami.isConnected.value) {
      // Log the agent out of PBX queues before tearing down the AMI connection.
      try {
        await amiAgentLogin.logout({ reason: 'Agent disconnected' })
      } catch (logoutErr) {
        console.error('Agent logout failed:', logoutErr)
      }
      await ami.disconnect()
    }
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

/**
 * Translate agent-status changes to real AMI QueueAdd/QueuePause/QueueRemove in
 * connected mode. This keeps the demo handlers (updateAgentStatus and the 9
 * sites that set agentStatus) untouched and demo mode byte-identical, while the
 * PBX queue membership stays consistent when connected to a live Asterisk.
 */
watch(
  agentStatus,
  async (status, oldStatus) => {
    if (!isConnectedMode.value || !ami.isConnected.value) return
    if (status === oldStatus) return
    try {
      if (status === 'available' && oldStatus === 'busy') {
        // Resume taking calls after a busy spell.
        await amiAgentLogin.unpause()
      } else if (status === 'available' && oldStatus === 'away') {
        // Coming back online → log into queues (also handled explicitly on connect).
        await amiAgentLogin.login({ queues: ['8001', '8002', '8003'] })
      } else if (status === 'busy' && oldStatus === 'available') {
        // Paused while on a call / wrapping up.
        await amiAgentLogin.pause({ reason: 'On call / busy' })
      } else if (status === 'away') {
        // Going offline → leave all queues.
        await amiAgentLogin.logout({ reason: 'Agent went away' })
      }
    } catch (syncErr) {
      const message = syncErr instanceof Error ? syncErr.message : String(syncErr)
      console.error('Agent status → AMI sync failed:', syncErr)
      showNotification('error', `Agent sync failed: ${message}`)
    }
  },
  { flush: 'post' }
)

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
    if (isConnectedMode.value) {
      // Track in-progress on the AMI side too.
      markCallbackInProgress(selectedCallback.value.id)
    } else {
      markCallbackInProgress(selectedCallback.value.id)
    }
    customerContext.value = buildCustomerContextView({
      remoteUri: selectedCallback.value.targetUri,
      remoteDisplayName: selectedCallback.value.contactName || selectedCallback.value.targetUri,
      queue: selectedCallback.value.queue,
      latestDisposition: customerContext.value.latestDisposition,
      noteSummary: customerContext.value.noteSummary,
      hasOpenCallback: true,
      profile: selectedCallback.value.profile ?? null,
    })
    agentStatus.value = 'busy'
    saveAgentStatus('busy')

    if (isConnectedMode.value) {
      // AMI Originate: the PBX dials the customer and bridges to this agent.
      // The agent receives the call as inbound (answers via softphone when it rings).
      await amiCallback.executeCallback(selectedCallback.value.id)
      showNotification(
        'info',
        `PBX ringer upp ${selectedCallback.value.contactName || selectedCallback.value.targetUri}...`
      )
    } else {
      await makeCall(selectedCallback.value.targetUri)
      showNotification(
        'info',
        `Calling ${selectedCallback.value.contactName || selectedCallback.value.targetUri}...`
      )
    }
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

const handlePresenterForceInbound = () => {
  presenterControls.forceInboundCall(activeScenario.value)
  showNotification('info', `Presenter injected a ${activeScenario.value} inbound call.`)
}

const handlePresenterSeedCallback = () => {
  presenterControls.seedCallbackTask(activeScenario.value)
  showNotification('info', `Presenter seeded a ${activeScenario.value} callback task.`)
}

const handlePresenterScene = (sceneId: DemoStoryScene) => {
  const scene = presenterControls.runStoryScene(sceneId)
  activeScenario.value = scene.scenario
  showNotification('info', `Loaded "${scene.label}" scene.`)
}

const handlePresenterReset = () => {
  stopQueueSimulation()
  presenterControls.resetDemoState()
  demoCallbacksSeeded.value = false
  showNotification('success', 'Demo state reset.')
}

const handleWrapUpComplete = async () => {
  const finalizedDisposition = disposition.value
  const finalizedNotes = wrapUpNotes.value.trim()
  const wantsCallback = callbackRequested.value

  // In connected mode, schedule the callback via AMI (AstDB-backed). In demo
  // mode, enterWrapUp pushes into the local pendingCallbacks ref as before.
  let createdCallback: { id: string } | undefined
  if (isConnectedMode.value && wantsCallback) {
    try {
      const callback = await amiCallback.scheduleCallback({
        callerNumber: extractCallbackNumber(customerContext.value.address),
        callerName: customerContext.value.displayName || undefined,
        reason: customerContext.value.callbackReason || finalizedDisposition,
        targetQueue: activeRoleId.value ? `${activeRoleId.value}-linjen` : '8001',
        priority: 'normal',
      })
      createdCallback = { id: callback.id }
    } catch (schedErr) {
      const message = schedErr instanceof Error ? schedErr.message : String(schedErr)
      console.error('scheduleCallback failed:', schedErr)
      showNotification('error', `Failed to schedule callback: ${message}`)
    }
  } else {
    createdCallback = enterWrapUp({
      disposition: disposition.value,
      notes: finalizedNotes,
      callbackRequested: wantsCallback,
    })
  }

  if (lastWrappedCallId.value) {
    historyAnnotations.value[lastWrappedCallId.value] = {
      tags: [finalizedDisposition, wantsCallback ? 'callback' : null].filter(
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
    if (isConnectedMode.value) {
      // Mark the AMI callback completed; persist to AstDB.
      try {
        amiCallback.markCompleted(activeCallbackId.value, 'answered')
      } catch {
        /* non-fatal */
      }
    } else {
      completeCallback(activeCallbackId.value)
    }
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

/** Extract a callable phone number from a SIP URI / address string. */
function extractCallbackNumber(address: string): string {
  const m = address.match(/sip:([^@]+)@/) || address.match(/(\+?\d[\d\s\-()]{2,})/)
  return (m ? m[1] : address).replace(/[^\d+]/g, '').slice(0, 32) || 'unknown'
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

watch(selectedCallback, (callback) => {
  if (!callback || isActive.value || workspaceState.value === 'wrap-up') {
    return
  }

  customerContext.value = buildCustomerContextView({
    remoteUri: callback.targetUri,
    remoteDisplayName: callback.contactName || callback.targetUri,
    queue: callback.queue,
    latestDisposition: customerContext.value.latestDisposition,
    noteSummary: callback.reason,
    hasOpenCallback: true,
    profile: callback.profile ?? null,
  })
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
  color: #0f172a;
}

.dashboard-header {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.92)),
    linear-gradient(135deg, #fff7ed 0%, #eff6ff 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  padding: 1.35rem 2rem 1.15rem;
  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(12px);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.header-copy {
  display: grid;
  gap: 0.3rem;
  max-width: 36rem;
}

.header-eyebrow {
  margin: 0;
  color: #c2410c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 800;
}

.header-content h1 {
  margin: 0;
  font-size: clamp(1.6rem, 2.1vw, 2.3rem);
  letter-spacing: -0.03em;
  color: #0f172a;
}

.header-summary {
  margin: 0;
  color: #475569;
  line-height: 1.55;
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
  flex-wrap: wrap;
  justify-content: flex-end;
}

.header-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.25rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 237, 213, 0.85);
  color: #9a3412;
  border: 1px solid rgba(251, 146, 60, 0.4);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: capitalize;
}

.header-pill.neutral {
  background: rgba(226, 232, 240, 0.78);
  color: #334155;
  border-color: rgba(148, 163, 184, 0.35);
}

.dashboard-content {
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  gap: 1.5rem;
  padding: 1.5rem;
  flex: 1;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(14, 165, 233, 0.06), transparent 28%),
    linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.95));
}

.sidebar,
.main-content,
.history-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.sidebar > *,
.main-content > *,
.history-panel > * {
  animation: fadeUp 0.24s ease-out;
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

  .header-content {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    justify-content: flex-start;
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

@keyframes fadeUp {
  from {
    transform: translateY(6px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.view-switcher {
  display: inline-flex;
  background: var(--surface-hover, rgba(148, 163, 184, 0.15));
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.view-tab {
  border: none;
  background: transparent;
  color: var(--text-secondary, #64748b);
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.view-tab:hover {
  color: var(--text-primary, #0f172a);
}

.view-tab.active {
  background: var(--surface-card, #ffffff);
  color: var(--primary-color, #6366f1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.view-tab:focus-visible {
  outline: 2px solid var(--primary-color, #6366f1);
  outline-offset: 2px;
}
</style>
