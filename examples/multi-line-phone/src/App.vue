<template>
  <div class="multi-line-phone">
    <!-- Screen reader announcements -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      {{ srAnnouncement }}
    </div>

    <div role="alert" aria-live="assertive" class="sr-only">
      {{ srAlert }}
    </div>

    <!-- Skip link target -->
    <span id="main-content" class="skip-target"></span>

    <header class="header">
      <h1>Multi-Line Phone</h1>
      <p class="subtitle">VueSip Advanced Example - Manage up to 5 concurrent calls</p>
    </header>

    <div class="main-container">
      <!-- Left Panel: Connection and Call History -->
      <aside class="left-panel" aria-label="Connection settings and call history">
        <nav aria-label="SIP connection settings">
          <ConnectionPanel
            v-model:connected="isConnected"
            v-model:registered="isRegistered"
            :is-connecting="isConnecting"
            @connect="handleConnect"
            @disconnect="handleDisconnect"
          />
        </nav>

        <!-- Call History -->
        <section
          v-if="callHistory.length > 0"
          class="call-history"
          aria-labelledby="call-history-heading"
        >
          <h2 id="call-history-heading">Recent Calls</h2>
          <ul class="history-list" role="list">
            <li
              v-for="entry in callHistory.slice(0, 10)"
              :key="entry.id"
              class="history-item"
              role="listitem"
            >
              <div class="history-info">
                <span class="history-uri">{{ entry.remoteUri || 'Unknown' }}</span>
                <span class="history-direction" :class="entry.direction">
                  <span aria-hidden="true">{{ entry.direction === 'incoming' ? '📞' : '📲' }}</span>
                  {{ entry.direction === 'incoming' ? 'Incoming' : 'Outgoing' }}
                </span>
              </div>
              <span class="history-duration">{{ formatDuration(entry.duration || 0) }}</span>
            </li>
          </ul>
        </section>
      </aside>

      <!-- Center Panel: Active Call Lines -->
      <main class="center-panel">
        <section aria-labelledby="active-lines-heading">
          <div class="call-lines-header">
            <h2 id="active-lines-heading">
              Active Lines ({{ activeCallCount }}/{{ MAX_LINES }})
              <span class="sr-only">
                {{ activeCallCount }} of {{ MAX_LINES }} lines currently in use
              </span>
            </h2>
            <button
              v-if="activeCallCount < MAX_LINES"
              @click="showDialpad = !showDialpad"
              class="btn-new-call"
              :disabled="!isRegistered"
              :aria-label="showDialpad ? 'Hide dialpad' : 'Show dialpad to make new call'"
              :aria-expanded="showDialpad"
            >
              {{ showDialpad ? 'Hide Dialpad' : '+ New Call' }}
            </button>
          </div>

          <!-- Call Lines -->
          <div class="call-lines" role="group" aria-label="Active call lines">
            <CallLine
              v-for="(line, index) in callLines"
              :key="line.id"
              :line-number="index + 1"
              :session="line.session"
              :state="line.state"
              :remote-uri="line.remoteUri"
              :remote-display-name="line.remoteDisplayName"
              :duration="line.duration"
              :is-on-hold="line.isOnHold"
              :is-muted="line.isMuted"
              :is-active-line="line.id === activeLineId"
              :local-stream="line.localStream"
              :remote-stream="line.remoteStream"
              @answer="handleAnswer(line)"
              @reject="handleReject(line)"
              @hangup="handleHangup(line)"
              @hold="handleHold(line)"
              @unhold="handleUnhold(line)"
              @mute="handleMute(line)"
              @unmute="handleUnmute(line)"
              @make-active="makeLineActive(line.id)"
              @send-dtmf="handleSendDTMF(line, $event)"
            />
          </div>

          <!-- Empty State -->
          <div v-if="activeCallCount === 0" class="empty-state">
            <div class="empty-icon" aria-hidden="true">📞</div>
            <h3>No Active Calls</h3>
            <p>Use the dialpad to make a new call or wait for incoming calls</p>
          </div>
        </section>
      </main>

      <!-- Right Panel: Dialpad and Info -->
      <aside class="right-panel" aria-label="Dialpad and application features">
        <section v-if="showDialpad && isRegistered" aria-label="Dialpad">
          <Dialpad
            v-model:number="dialNumber"
            @call="handleMakeCall"
            :disabled="activeCallCount >= MAX_LINES"
          />
        </section>

        <section v-if="!isRegistered" class="info-panel" aria-labelledby="getting-started-heading">
          <div class="info-icon" aria-hidden="true">ℹ️</div>
          <h2 id="getting-started-heading">Getting Started</h2>
          <ol class="info-list">
            <li>Configure your SIP credentials in the Connection Panel</li>
            <li>Click "Connect" to establish connection</li>
            <li>Once registered, use the dialpad to make calls</li>
            <li>Manage up to 5 concurrent calls</li>
            <li>Switch between calls by clicking on them</li>
          </ol>
        </section>

        <section v-else class="info-panel" aria-labelledby="features-heading">
          <h2 id="features-heading">Multi-Line Features</h2>
          <ul class="feature-list">
            <li><strong>Hold/Resume:</strong> Put calls on hold while talking to others</li>
            <li><strong>Call Switching:</strong> Click on a line to make it active</li>
            <li><strong>Mute:</strong> Mute audio per call</li>
            <li><strong>DTMF:</strong> Send touch tones during calls</li>
            <li><strong>Multiple Lines:</strong> Handle up to 5 simultaneous calls</li>
          </ul>
        </section>
      </aside>
    </div>

    <!-- Incoming Call Alert -->
    <IncomingCallAlert
      v-for="line in incomingLines"
      :key="line.id"
      :remote-uri="line.remoteUri || 'Unknown'"
      :remote-display-name="line.remoteDisplayName"
      :line-number="getLineNumber(line.id)"
      @answer="handleAnswer(line)"
      @reject="handleReject(line)"
    />

    <!-- Max Lines Warning -->
    <div v-if="maxLinesWarning" role="alert" aria-live="assertive" class="max-lines-warning">
      <div class="warning-content">
        <span class="warning-icon" aria-hidden="true">⚠️</span>
        <div class="warning-text">
          <strong>Maximum Lines Reached</strong>
          <p>You've reached the maximum of {{ MAX_LINES }} concurrent calls. Please end a call before starting a new one.</p>
        </div>
        <button
          @click="maxLinesWarning = false"
          class="warning-close"
          aria-label="Close maximum lines warning"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSipClient, useCallSession, useCallHistory, type CallSession } from 'vuesip'
import ConnectionPanel from './components/ConnectionPanel.vue'
import CallLine from './components/CallLine.vue'
import Dialpad from './components/Dialpad.vue'
import IncomingCallAlert from './components/IncomingCallAlert.vue'
import type { CallState } from 'vuesip'

// Constants
const MAX_LINES = 5

// SIP Configuration (can be stored in localStorage or provided via env)
const sipConfig = ref({
  uri: localStorage.getItem('sip_uri') || '',
  sipUri: localStorage.getItem('sip_sipUri') || '',
  password: localStorage.getItem('sip_password') || '',
  displayName: localStorage.getItem('sip_displayName') || '',
})

// Connection state
const isConnected = ref(false)
const isRegistered = ref(false)

// UI state
const showDialpad = ref(false)
const dialNumber = ref('')
const isConnecting = ref(false)
const maxLinesWarning = ref(false)

// Screen reader announcements
const srAnnouncement = ref('')
const srAlert = ref('')
const previousCallLineStates = new Map<string, CallState>()

/**
 * Call Line Interface
 * Represents a single call line with all its state
 */
interface CallLine {
  id: string
  session: CallSession | null
  state: CallState
  remoteUri: string | null
  remoteDisplayName: string | null
  duration: number
  isOnHold: boolean
  isMuted: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

// Call lines (up to MAX_LINES concurrent calls)
const callLines = ref<CallLine[]>([])
const activeLineId = ref<string | null>(null)

// Initialize SIP client
const {
  connect,
  disconnect,
  isConnected: clientConnected,
  isRegistered: clientRegistered,
  getClient,
  getEventBus,
} = useSipClient(sipConfig.value)

// Track connection state
watch(clientConnected, (connected) => {
  isConnected.value = connected
})

watch(clientRegistered, (registered) => {
  isRegistered.value = registered
})

// Initialize call history
const { history: callHistory } = useCallHistory()

// Create useCallSession instances for each line
// We'll create them on-demand when a call is made or received
const callSessionManagers = ref<Map<string, ReturnType<typeof useCallSession>>>(new Map())

// Track watcher cleanup functions for proper memory management
const watcherCleanupFns = ref<Map<string, Array<() => void>>>(new Map())

// Track ongoing operations to prevent race conditions
const operationLocks = ref<Map<string, boolean>>(new Map())

/**
 * Get or create a call session manager for a line
 */
function getCallSessionManager(lineId: string): ReturnType<typeof useCallSession> {
  if (!callSessionManagers.value.has(lineId)) {
    const client = ref(getClient())
    const manager = useCallSession(client)
    callSessionManagers.value.set(lineId, manager)
  }
  return callSessionManagers.value.get(lineId)!
}

/**
 * Find an available line (idle or terminated)
 */
function findAvailableLine(): CallLine | null {
  // Try to find an existing idle/terminated line
  const availableLine = callLines.value.find(
    (line) => line.state === 'idle' || line.state === 'terminated'
  )
  if (availableLine) return availableLine

  // Create a new line if under MAX_LINES
  if (callLines.value.length < MAX_LINES) {
    const newLine: CallLine = {
      id: `line-${Date.now()}-${Math.random()}`,
      session: null,
      state: 'idle' as CallState,
      remoteUri: null,
      remoteDisplayName: null,
      duration: 0,
      isOnHold: false,
      isMuted: false,
      localStream: null,
      remoteStream: null,
    }
    callLines.value.push(newLine)
    return newLine
  }

  return null
}

/**
 * Update line state from call session
 */
function updateLineFromSession(line: CallLine, manager: ReturnType<typeof useCallSession>) {
  line.session = manager.session.value
  line.state = manager.state.value
  line.remoteUri = manager.remoteUri.value
  line.remoteDisplayName = manager.remoteDisplayName.value
  line.duration = manager.duration.value
  line.isOnHold = manager.isOnHold.value
  line.isMuted = manager.isMuted.value
  line.localStream = manager.localStream.value
  line.remoteStream = manager.remoteStream.value
}

/**
 * Setup watchers for a call session manager
 */
function setupLineWatchers(line: CallLine, manager: ReturnType<typeof useCallSession>) {
  const cleanupFns: Array<() => void> = []

  // Watch all reactive properties
  cleanupFns.push(watch(manager.state, () => updateLineFromSession(line, manager)))
  cleanupFns.push(watch(manager.duration, () => updateLineFromSession(line, manager)))
  cleanupFns.push(watch(manager.isOnHold, () => updateLineFromSession(line, manager)))
  cleanupFns.push(watch(manager.isMuted, () => updateLineFromSession(line, manager)))
  cleanupFns.push(watch(manager.localStream, () => updateLineFromSession(line, manager)))
  cleanupFns.push(watch(manager.remoteStream, () => updateLineFromSession(line, manager)))

  // When call ends, check if we should clear the line
  cleanupFns.push(watch(manager.state, (newState) => {
    if (newState === 'terminated' || newState === 'failed') {
      setTimeout(() => {
        // If still terminated after 5 seconds, clear the line
        if (line.state === 'terminated' || line.state === 'failed') {
          const index = callLines.value.findIndex((l) => l.id === line.id)
          if (index !== -1 && callLines.value.length > 1) {
            cleanupLineWatchers(line.id)
            callLines.value.splice(index, 1)
            callSessionManagers.value.delete(line.id)
          }
        }
      }, 5000)
    }
  }))

  // Store cleanup functions
  watcherCleanupFns.value.set(line.id, cleanupFns)
}

/**
 * Cleanup watchers for a line
 */
function cleanupLineWatchers(lineId: string) {
  const cleanupFns = watcherCleanupFns.value.get(lineId)
  if (cleanupFns) {
    cleanupFns.forEach(fn => fn())
    watcherCleanupFns.value.delete(lineId)
  }
}

/**
 * Make an outgoing call
 */
async function handleMakeCall() {
  if (!dialNumber.value.trim()) return
  if (activeCallCount.value >= MAX_LINES) {
    maxLinesWarning.value = true
    setTimeout(() => {
      maxLinesWarning.value = false
    }, 3000)
    return
  }

  const line = findAvailableLine()
  if (!line) {
    maxLinesWarning.value = true
    setTimeout(() => {
      maxLinesWarning.value = false
    }, 3000)
    return
  }

  try {
    const manager = getCallSessionManager(line.id)
    await manager.makeCall(dialNumber.value, { audio: true, video: false })
    setupLineWatchers(line, manager)
    updateLineFromSession(line, manager)
    makeLineActive(line.id)
    dialNumber.value = ''
    showDialpad.value = false
  } catch (error) {
    console.error('Failed to make call:', error)

    // Provide user-friendly error messages
    let errorMessage = 'Failed to make call'
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.'
      } else if (error.message.includes('NotFoundError')) {
        errorMessage = 'No microphone found. Please connect a microphone and try again.'
      } else {
        errorMessage = `Failed to make call: ${error.message}`
      }
    }
    alert(errorMessage)

    // Clean up the line if call setup failed
    const index = callLines.value.findIndex((l) => l.id === line.id)
    if (index !== -1) {
      cleanupLineWatchers(line.id)
      callLines.value.splice(index, 1)
      callSessionManagers.value.delete(line.id)
    }
  }
}

/**
 * Answer an incoming call
 */
async function handleAnswer(line: CallLine) {
  try {
    const manager = getCallSessionManager(line.id)
    await manager.answer({ audio: true, video: false })
    makeLineActive(line.id)
  } catch (error) {
    console.error('Failed to answer call:', error)

    // Provide user-friendly error messages
    let errorMessage = 'Failed to answer call'
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        errorMessage = 'Microphone permission denied. Please allow microphone access and try again.'
      } else if (error.message.includes('NotFoundError')) {
        errorMessage = 'No microphone found. Please connect a microphone and try again.'
      } else {
        errorMessage = `Failed to answer call: ${error.message}`
      }
    }
    alert(errorMessage)
  }
}

/**
 * Reject an incoming call
 */
async function handleReject(line: CallLine) {
  try {
    const manager = getCallSessionManager(line.id)
    await manager.reject(486) // Busy Here
  } catch (error) {
    console.error('Failed to reject call:', error)
  }
}

/**
 * Hangup a call
 */
async function handleHangup(line: CallLine) {
  try {
    const manager = getCallSessionManager(line.id)
    await manager.hangup()

    // If this was the active line, find another active line
    if (line.id === activeLineId.value) {
      const nextActiveLine = callLines.value.find(
        (l) => l.id !== line.id && l.state === 'active'
      )
      if (nextActiveLine) {
        makeLineActive(nextActiveLine.id)
      } else {
        activeLineId.value = null
      }
    }
  } catch (error) {
    console.error('Failed to hangup call:', error)
  }
}

/**
 * Put a call on hold
 */
async function handleHold(line: CallLine) {
  try {
    const manager = getCallSessionManager(line.id)
    await manager.hold()
  } catch (error) {
    console.error('Failed to hold call:', error)
  }
}

/**
 * Resume a call from hold
 */
async function handleUnhold(line: CallLine) {
  try {
    const manager = getCallSessionManager(line.id)
    await manager.unhold()
    makeLineActive(line.id)
  } catch (error) {
    console.error('Failed to unhold call:', error)
  }
}

/**
 * Mute a call
 */
function handleMute(line: CallLine) {
  const manager = getCallSessionManager(line.id)
  manager.mute()
}

/**
 * Unmute a call
 */
function handleUnmute(line: CallLine) {
  const manager = getCallSessionManager(line.id)
  manager.unmute()
}

/**
 * Send DTMF tone
 */
async function handleSendDTMF(line: CallLine, tone: string) {
  try {
    const manager = getCallSessionManager(line.id)
    await manager.sendDTMF(tone)
  } catch (error) {
    console.error('Failed to send DTMF:', error)
  }
}

/**
 * Make a line active (and put others on hold if needed)
 */
async function makeLineActive(lineId: string) {
  const line = callLines.value.find((l) => l.id === lineId)
  if (!line) return

  // If the line is already active, do nothing
  if (activeLineId.value === lineId) return

  // Check if there's an ongoing operation for this line
  if (operationLocks.value.get(lineId)) {
    console.warn('Operation already in progress for line', lineId)
    return
  }

  try {
    // Lock this operation
    operationLocks.value.set(lineId, true)

    // Put current active line on hold
    if (activeLineId.value) {
      const currentActiveLine = callLines.value.find((l) => l.id === activeLineId.value)
      if (currentActiveLine && currentActiveLine.state === 'active' && !currentActiveLine.isOnHold) {
        await handleHold(currentActiveLine)
      }
    }

    // Unhold the new active line if it's on hold
    if (line.isOnHold) {
      await handleUnhold(line)
    }

    activeLineId.value = lineId
  } catch (error) {
    console.error('Error making line active:', error)
    throw error
  } finally {
    // Release the lock
    operationLocks.value.delete(lineId)
  }
}

/**
 * Handle incoming calls
 */
function handleIncomingCall(event: any) {
  const line = findAvailableLine()
  if (!line) {
    console.warn('No available lines for incoming call, rejecting')
    // Auto-reject the call when no lines are available
    try {
      if (event.session && typeof event.session.terminate === 'function') {
        event.session.terminate({
          status_code: 486, // Busy Here
          reason_phrase: 'Busy Here - All Lines Occupied'
        })
      }
    } catch (error) {
      console.error('Failed to reject incoming call:', error)
    }
    return
  }

  try {
    const manager = getCallSessionManager(line.id)

    // Get the session from the incoming call event
    const session = event.session
    if (session) {
      // IMPORTANT: Set the session in the manager's ref
      // This is critical for the manager to properly track the session
      if (manager.session && typeof manager.session === 'object' && 'value' in manager.session) {
        manager.session.value = session
      }

      line.session = session
      setupLineWatchers(line, manager)
      updateLineFromSession(line, manager)

      console.log('Incoming call set up on line:', line.id)
    }
  } catch (error) {
    console.error('Error handling incoming call:', error)
  }
}

/**
 * Connect to SIP server
 */
async function handleConnect(config: any) {
  try {
    isConnecting.value = true

    // Update config
    sipConfig.value = config

    // Save to localStorage
    localStorage.setItem('sip_uri', config.uri || '')
    localStorage.setItem('sip_sipUri', config.sipUri || '')
    localStorage.setItem('sip_password', config.password || '')
    localStorage.setItem('sip_displayName', config.displayName || '')

    await connect()
  } catch (error) {
    console.error('Failed to connect:', error)
    alert(`Failed to connect: ${error}`)
  } finally {
    isConnecting.value = false
  }
}

/**
 * Disconnect from SIP server
 */
async function handleDisconnect() {
  try {
    await disconnect()

    // Cleanup all watchers before clearing
    callLines.value.forEach(line => {
      cleanupLineWatchers(line.id)
    })

    // Clear all call lines
    callLines.value = []
    callSessionManagers.value.clear()
    watcherCleanupFns.value.clear()
    operationLocks.value.clear()
    activeLineId.value = null
  } catch (error) {
    console.error('Failed to disconnect:', error)
  }
}

// Computed properties
const activeCallCount = computed(() => {
  return callLines.value.filter((line) =>
    line.state !== 'idle' && line.state !== 'terminated' && line.state !== 'failed'
  ).length
})

const incomingLines = computed(() => {
  return callLines.value.filter((line) => line.state === 'ringing')
})

function getLineNumber(lineId: string): number {
  return callLines.value.findIndex((l) => l.id === lineId) + 1
}

/**
 * Format duration in MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Watch for call line additions/removals
watch(callLines, (newLines, oldLines) => {
  if (newLines.length > oldLines.length) {
    srAlert.value = `New call added. ${newLines.length} active ${newLines.length === 1 ? 'call' : 'calls'}`
  } else if (newLines.length < oldLines.length) {
    srAnnouncement.value = `Call ended. ${newLines.length} active ${newLines.length === 1 ? 'call' : 'calls'}`
  }
}, { deep: true })

// Watch for state changes
watch(callLines, (lines) => {
  lines.forEach((line, index) => {
    const oldState = previousCallLineStates.get(line.id)
    if (oldState && oldState !== line.state) {
      const lineNumber = index + 1
      const displayName = line.remoteDisplayName || line.remoteUri || 'Unknown'

      if (line.state === 'ringing') {
        srAlert.value = `Incoming call on line ${lineNumber} from ${displayName}`
      } else if (line.state === 'active' && oldState === 'ringing') {
        srAnnouncement.value = `Line ${lineNumber} call with ${displayName} active`
      } else if (line.state === 'active' && oldState === 'calling') {
        srAnnouncement.value = `Line ${lineNumber} call to ${displayName} connected`
      } else if (line.isOnHold && oldState !== 'held') {
        srAnnouncement.value = `Line ${lineNumber} on hold`
      } else if (!line.isOnHold && oldState === 'held') {
        srAnnouncement.value = `Line ${lineNumber} resumed`
      } else if (line.state === 'terminated') {
        srAnnouncement.value = `Line ${lineNumber} call ended`
      } else if (line.state === 'failed') {
        srAlert.value = `Line ${lineNumber} call failed`
      }
    }
    previousCallLineStates.set(line.id, line.state)
  })
}, { deep: true })

// Watch for active line changes
watch(activeLineId, (newId, oldId) => {
  if (newId !== oldId && newId) {
    const line = callLines.value.find(l => l.id === newId)
    if (line) {
      const lineNumber = callLines.value.indexOf(line) + 1
      const displayName = line.remoteDisplayName || line.remoteUri || 'Unknown'
      srAnnouncement.value = `Switched to line ${lineNumber} with ${displayName}`
    }
  }
})

// Listen for incoming calls
onMounted(() => {
  const eventBus = getEventBus()
  eventBus.on('call:incoming', handleIncomingCall)
})

onUnmounted(() => {
  const eventBus = getEventBus()
  eventBus.off('call:incoming', handleIncomingCall)

  // Cleanup all watchers
  callLines.value.forEach(line => {
    cleanupLineWatchers(line.id)
  })

  // Clear all state
  callSessionManagers.value.clear()
  watcherCleanupFns.value.clear()
  operationLocks.value.clear()
})
</script>

<style scoped>
.multi-line-phone {
  max-width: 1600px;
  margin: 0 auto;
}

.header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.1em;
  opacity: 0.9;
}

.main-container {
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 20px;
  align-items: start;
}

/* Left Panel */
.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.call-history {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.call-history h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 1.1em;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 0.9em;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-uri {
  font-weight: 500;
  color: #333;
}

.history-direction {
  font-size: 0.85em;
  color: #666;
}

.history-direction.incoming {
  color: #28a745;
}

.history-direction.outgoing {
  color: #007bff;
}

.history-duration {
  color: #666;
  font-weight: 500;
}

/* Center Panel */
.center-panel {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-height: 600px;
}

.call-lines-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e9ecef;
}

.call-lines-header h2 {
  color: #333;
  font-size: 1.5em;
}

.btn-new-call {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s;
}

.btn-new-call:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-new-call:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.call-lines {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  margin-bottom: 10px;
  color: #495057;
}

.empty-state p {
  color: #6c757d;
}

/* Right Panel */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.info-icon {
  font-size: 2.5em;
  text-align: center;
  margin-bottom: 15px;
}

.info-panel h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 1.2em;
}

.info-list, .feature-list {
  margin-left: 20px;
  color: #495057;
  line-height: 1.8;
}

.info-list li, .feature-list li {
  margin-bottom: 10px;
}

.feature-list {
  list-style: none;
  margin-left: 0;
}

.feature-list li {
  padding-left: 20px;
  position: relative;
}

.feature-list li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #28a745;
  font-weight: bold;
}

/* Max Lines Warning */
.max-lines-warning {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateX(-50%) translateY(-100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.warning-content {
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  color: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 8px 24px rgba(255, 152, 0, 0.4);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-width: 400px;
  max-width: 500px;
}

.warning-icon {
  font-size: 2em;
  flex-shrink: 0;
}

.warning-text {
  flex: 1;
}

.warning-text strong {
  display: block;
  font-size: 1.1em;
  margin-bottom: 8px;
}

.warning-text p {
  font-size: 0.95em;
  opacity: 0.95;
  line-height: 1.4;
}

.warning-close {
  background: none;
  border: none;
  color: white;
  font-size: 2em;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
  flex-shrink: 0;
}

.warning-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Screen reader only content */
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

.skip-target {
  position: absolute;
  top: 0;
  left: 0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Responsive Design */
@media (max-width: 1400px) {
  .main-container {
    grid-template-columns: 280px 1fr 300px;
  }
}

@media (max-width: 1200px) {
  .main-container {
    grid-template-columns: 1fr;
  }

  .left-panel, .right-panel {
    order: 2;
  }

  .center-panel {
    order: 1;
  }
}

@media (max-width: 600px) {
  .warning-content {
    min-width: auto;
    max-width: calc(100vw - 40px);
  }

  .max-lines-warning {
    left: 20px;
    right: 20px;
    transform: none;
  }
}
</style>
