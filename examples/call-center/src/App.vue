<template>
  <div class="call-center">
    <!-- Not Connected State -->
    <div v-if="!isConnected" class="login-container">
      <div class="login-card card">
        <h1>Call Center Login</h1>
        <ConnectionPanel />
      </div>
    </div>

    <!-- Connected State - Main Dashboard -->
    <div v-else class="dashboard">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1>Call Center Dashboard</h1>
          <div class="header-actions">
            <AgentStatusToggle :agent-status="agentStatus" @update:status="updateAgentStatus" />
            <button class="btn btn-danger btn-sm" @click="handleDisconnect">
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <div class="dashboard-content">
        <!-- Left Sidebar - Call Queue & Agent Info -->
        <aside class="sidebar">
          <AgentDashboard
            :agent-status="agentStatus"
            :current-call-id="callId"
            :total-calls-today="todayStats.totalCalls"
            :missed-calls="todayStats.missedCalls"
            :average-duration="todayStats.averageDuration"
          />
          <CallQueue
            :queue="callQueue"
            :agent-status="agentStatus"
            @answer="handleQueuedCallAnswer"
          />
        </aside>

        <!-- Main Area - Active Call & Stats -->
        <main class="main-content">
          <!-- Active Call -->
          <ActiveCall
            v-if="isActive"
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
          />

          <!-- Statistics Dashboard (when no active call) -->
          <CallStats v-else :statistics="statistics" />
        </main>

        <!-- Right Panel - Call History -->
        <aside class="history-panel">
          <CallHistoryPanel
            :history="filteredHistory"
            :total-count="totalCalls"
            @filter="handleHistoryFilter"
            @export="handleHistoryExport"
            @call-back="handleCallBack"
          />
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSipClient } from 'vuesip'
import { useCallSession } from 'vuesip'
import { useCallHistory } from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import AgentStatusToggle from './components/AgentStatusToggle.vue'
import AgentDashboard from './components/AgentDashboard.vue'
import CallQueue from './components/CallQueue.vue'
import ActiveCall from './components/ActiveCall.vue'
import CallStats from './components/CallStats.vue'
import CallHistoryPanel from './components/CallHistoryPanel.vue'

// ============================================================================
// Types
// ============================================================================

type AgentStatus = 'available' | 'busy' | 'away'

interface QueuedCall {
  id: string
  from: string
  displayName?: string
  waitTime: number
  priority?: number
}

// ============================================================================
// State Management
// ============================================================================

// Agent status
const agentStatus = ref<AgentStatus>('away')
const currentCallNotes = ref('')

// Call queue (simulated - in production this would come from the SIP server)
const callQueue = ref<QueuedCall[]>([])

// ============================================================================
// SIP Client Setup
// ============================================================================

const {
  isConnected,
  disconnect,
  getClient,
  getEventBus,
} = useSipClient()

// ============================================================================
// Call Session Management
// ============================================================================

const sipClient = computed(() => getClient())

const {
  session,
  state,
  callId,
  remoteUri,
  remoteDisplayName,
  isActive,
  duration,
  isMuted,
  isOnHold,
  makeCall,
  answer,
  hangup,
  toggleMute,
  toggleHold,
  sendDTMF,
} = useCallSession(sipClient)

// ============================================================================
// Call History
// ============================================================================

const {
  history,
  filteredHistory,
  totalCalls,
  getStatistics,
  setFilter,
  exportHistory,
} = useCallHistory()

// Statistics
const statistics = computed(() => getStatistics())

// Today's statistics (for agent dashboard)
const todayStats = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return getStatistics({
    dateFrom: today,
  })
})

// ============================================================================
// Queue Management (Simulated)
// ============================================================================

/**
 * Simulate incoming calls to the queue
 * In a real application, this would be integrated with your SIP server's
 * queue management system (e.g., Asterisk Queue, FreeSWITCH mod_callcenter)
 */
let queueSimulationInterval: number | null = null

const startQueueSimulation = () => {
  // Simulate random incoming calls when agent is available
  queueSimulationInterval = window.setInterval(() => {
    if (agentStatus.value === 'available' && Math.random() > 0.7) {
      addCallToQueue()
    }

    // Update wait times for queued calls
    callQueue.value.forEach(call => {
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
    { number: 'sip:customer1@domain.com', name: 'John Smith' },
    { number: 'sip:customer2@domain.com', name: 'Jane Doe' },
    { number: 'sip:customer3@domain.com', name: 'Bob Johnson' },
    { number: 'sip:support@domain.com', name: 'Support Request' },
    { number: 'sip:sales@domain.com', name: 'Sales Inquiry' },
  ]

  const caller = mockCallers[Math.floor(Math.random() * mockCallers.length)]

  callQueue.value.push({
    id: `queue-${Date.now()}`,
    from: caller.number,
    displayName: caller.name,
    waitTime: 0,
    priority: Math.floor(Math.random() * 3) + 1,
  })
}

// ============================================================================
// Event Handlers
// ============================================================================

const handleDisconnect = async () => {
  try {
    stopQueueSimulation()
    await disconnect()
  } catch (error) {
    console.error('Disconnect failed:', error)
  }
}

const updateAgentStatus = (status: AgentStatus) => {
  agentStatus.value = status

  // Start/stop queue simulation based on status
  if (status === 'available') {
    startQueueSimulation()
  } else {
    stopQueueSimulation()
  }
}

const handleQueuedCallAnswer = async (queuedCall: QueuedCall) => {
  try {
    // Remove from queue
    callQueue.value = callQueue.value.filter(c => c.id !== queuedCall.id)

    // Set agent to busy
    agentStatus.value = 'busy'

    // Make the call (in real app, this would answer the queued call)
    await makeCall(queuedCall.from)
  } catch (error) {
    console.error('Failed to answer queued call:', error)
  }
}

const handleHangup = async () => {
  try {
    await hangup()

    // Reset call notes
    currentCallNotes.value = ''

    // Return to available if was busy
    if (agentStatus.value === 'busy') {
      agentStatus.value = 'available'
    }
  } catch (error) {
    console.error('Failed to hangup:', error)
  }
}

const handleMuteToggle = () => {
  toggleMute()
}

const handleHoldToggle = () => {
  toggleHold()
}

const handleSendDTMF = (digit: string) => {
  sendDTMF(digit)
}

const handleHistoryFilter = (filter: any) => {
  setFilter(filter)
}

const handleHistoryExport = async (options: any) => {
  try {
    await exportHistory(options)
  } catch (error) {
    console.error('Failed to export history:', error)
  }
}

const handleCallBack = async (uri: string) => {
  try {
    await makeCall(uri)
  } catch (error) {
    console.error('Failed to make callback:', error)
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

// Watch for connection status to start/stop queue simulation
watch(isConnected, (connected) => {
  if (!connected) {
    stopQueueSimulation()
    agentStatus.value = 'away'
  }
})

// Auto-set agent to busy when in call
watch(isActive, (active) => {
  if (active && agentStatus.value === 'available') {
    agentStatus.value = 'busy'
  } else if (!active && agentStatus.value === 'busy') {
    agentStatus.value = 'available'
  }
})
</script>

<style scoped>
.call-center {
  width: 100%;
  min-height: 100vh;
  background: #f3f4f6;
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
}
</style>
