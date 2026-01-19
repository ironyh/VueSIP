<template>
  <div class="session-persistence-demo">
    <div class="info-section">
      <p>
        Persist call session state to IndexedDB for recovery after page refresh or network
        reconnection. This composable enables seamless call continuity by saving and restoring
        session data.
      </p>
      <p class="note">
        <strong>Note:</strong> Sessions expire after 5 minutes by default. The saved session info is
        displayed below when a session is stored.
      </p>
    </div>

    <!-- Session Form -->
    <div class="form-card">
      <h3>Session Data</h3>
      <div class="form-grid">
        <div class="form-group">
          <label for="sessionId">Session ID *</label>
          <InputText
            id="sessionId"
            v-model="formData.sessionId"
            placeholder="e.g., session-abc-123"
            class="w-full"
          />
        </div>
        <div class="form-group">
          <label for="remoteUri">Remote URI</label>
          <InputText
            id="remoteUri"
            v-model="formData.remoteUri"
            placeholder="e.g., sip:bob@example.com"
            class="w-full"
          />
        </div>
        <div class="form-group">
          <label for="callDirection">Call Direction</label>
          <Dropdown
            id="callDirection"
            v-model="formData.callDirection"
            :options="directionOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="form-group">
          <Checkbox v-model="formData.holdState" :binary="true" inputId="hold-state" />
          <label for="hold-state" class="ml-2">On Hold</label>
        </div>
        <div class="form-group">
          <label>Mute State</label>
          <div class="checkbox-group">
            <Checkbox v-model="formData.muteAudio" :binary="true" inputId="mute-audio" />
            <label for="mute-audio" class="ml-2">Mute Audio</label>
            <Checkbox v-model="formData.muteVideo" :binary="true" inputId="mute-video" />
            <label for="mute-video" class="ml-2">Mute Video</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="actions-card">
      <Button
        :disabled="!formData.sessionId || isLoading"
        @click="handleSave"
        :label="isLoading ? 'Saving...' : 'Save Session'"
        severity="primary"
      />
      <Button
        :disabled="isLoading"
        @click="handleLoad"
        :label="isLoading ? 'Loading...' : 'Load Session'"
        severity="secondary"
      />
      <Button
        :disabled="!hasSavedSession || isLoading"
        @click="handleClear"
        :label="isLoading ? 'Clearing...' : 'Clear Session'"
        severity="danger"
      />
    </div>

    <!-- Status Display -->
    <div class="status-card">
      <h3>Session Status</h3>
      <div class="status-grid">
        <div class="status-item">
          <div class="status-icon" :class="{ active: hasSavedSession }">
            {{ hasSavedSession ? '✅' : '❌' }}
          </div>
          <div class="status-info">
            <div class="status-label">Has Saved Session</div>
            <div class="status-value">{{ hasSavedSession ? 'Yes' : 'No' }}</div>
          </div>
        </div>
        <div class="status-item">
          <div class="status-icon" :class="{ active: isLoading }">
            {{ isLoading ? '⏳' : '⚡' }}
          </div>
          <div class="status-info">
            <div class="status-label">Loading State</div>
            <div class="status-value">{{ isLoading ? 'Loading...' : 'Ready' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Saved Session Info -->
    <div v-if="savedSessionInfo && savedSessionInfo.exists" class="info-card">
      <h3>Saved Session Info</h3>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">Session ID:</span>
          <span class="info-value">{{ savedSessionInfo.sessionId }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Saved At:</span>
          <span class="info-value">{{ formatTimestamp(savedSessionInfo.timestamp) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Age:</span>
          <span class="info-value" :class="{ expiring: expiresIn < 60000 }">
            {{ formatDuration(savedSessionInfo.age || 0) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Last Loaded Session -->
    <div v-if="lastLoadedSession" class="loaded-card">
      <h3>Last Loaded Session</h3>
      <div class="session-details">
        <div class="detail-row">
          <span class="detail-label">Session ID:</span>
          <span class="detail-value">{{ lastLoadedSession.sessionId }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Remote URI:</span>
          <span class="detail-value">{{ lastLoadedSession.remoteUri }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Direction:</span>
          <span class="detail-value direction-badge" :class="lastLoadedSession.callDirection">
            {{ lastLoadedSession.callDirection }}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Hold State:</span>
          <span class="detail-value">{{ lastLoadedSession.holdState ? 'On Hold' : 'Active' }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Mute State:</span>
          <span class="detail-value">
            <span v-if="lastLoadedSession.muteState.audio" class="media-badge">Audio Muted</span>
            <span v-if="lastLoadedSession.muteState.video" class="media-badge">Video Muted</span>
            <span
              v-if="!lastLoadedSession.muteState.audio && !lastLoadedSession.muteState.video"
              class="media-badge"
              >Not Muted</span
            >
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Timestamp:</span>
          <span class="detail-value">{{ formatTimestamp(lastLoadedSession.timestamp) }}</span>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <Message v-if="error" severity="error" :closable="false" class="mt-3">
      {{ error.message }}
    </Message>

    <!-- Event Log -->
    <div class="log-card">
      <h3>Event Log</h3>
      <div class="log-list">
        <div v-for="(entry, index) in eventLog" :key="index" class="log-entry" :class="entry.type">
          <span class="log-time">{{ entry.time }}</span>
          <span class="log-message">{{ entry.message }}</span>
        </div>
        <div v-if="eventLog.length === 0" class="log-empty">No events yet</div>
      </div>
      <Button
        v-if="eventLog.length > 0"
        @click="clearLog"
        label="Clear Log"
        severity="secondary"
        text
      />
    </div>

    <!-- Code Example -->
    <div class="code-example">
      <h4>Code Example</h4>
      <pre><code>import { useSessionPersistence } from 'vuesip'
import { onMounted } from 'vue'

const {
  saveSession,      // Save session state
  loadSession,      // Load saved session
  clearSession,     // Clear saved session
  hasSavedSession,  // Reactive: has saved session
  isLoading,        // Reactive: operation in progress
  error,            // Reactive: last error
  savedSessionInfo  // Reactive: summary info
} = useSessionPersistence({
  maxAge: 300000 // 5 minutes (default)
})

// Save session during active call
const saveCallSession = async (session) => {
  await saveSession({
    sessionId: session.id,
    remoteUri: session.remoteParty.uri,
    callDirection: session.direction,
    holdState: session.isOnHold,
    muteState: {
      audio: session.isAudioMuted,
      video: session.isVideoMuted
    },
    timestamp: Date.now()
  })
}

// Check for saved session on page load
onMounted(async () => {
  const savedSession = await loadSession()
  if (savedSession) {
    console.log('Found saved session:', savedSession.sessionId)
    // Attempt to reconnect or show reconnect UI
  }
})</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Session Persistence Demo - PrimeVue Migration
 *
 * Design Decisions:
 * - Using PrimeVue Button for all interactive buttons with appropriate severity levels
 * - Using PrimeVue InputText for text inputs with proper v-model binding
 * - Using PrimeVue Dropdown for select inputs with proper v-model binding
 * - Using PrimeVue Checkbox for checkbox inputs with proper binary binding
 * - Using PrimeVue Message for error displays with appropriate severity
 * - All colors use CSS custom properties for theme compatibility (light/dark mode)
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useSessionPersistence } from '../../src'
import type { PersistedSessionState } from '../../src/types/session-persistence.types'
import { Button, InputText, Dropdown, Checkbox, Message } from './shared-components'

// Session persistence composable
const {
  saveSession,
  loadSession,
  clearSession,
  hasSavedSession,
  isLoading,
  error,
  savedSessionInfo,
} = useSessionPersistence({
  maxAge: 300000, // 5 minutes
})

// Form data
const formData = ref({
  sessionId: '',
  remoteUri: '',
  callDirection: 'outbound' as 'inbound' | 'outbound',
  holdState: false,
  muteAudio: false,
  muteVideo: false,
})

// Dropdown options
const directionOptions = [
  { label: 'Outbound', value: 'outbound' },
  { label: 'Inbound', value: 'inbound' },
]

// Last loaded session
const lastLoadedSession = ref<PersistedSessionState | null>(null)

// Event log
interface LogEntry {
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  time: string
}
const eventLog = ref<LogEntry[]>([])

// Expiry countdown
const expiresIn = ref(0)
let expiryInterval: ReturnType<typeof setInterval> | null = null

// Computed expiry time
const updateExpiry = () => {
  if (savedSessionInfo.value && savedSessionInfo.value.exists) {
    const maxAge = 300000 // 5 minutes
    const age = savedSessionInfo.value.age || 0
    expiresIn.value = Math.max(0, maxAge - age)
  } else {
    expiresIn.value = 0
  }
}

// Log an event
const logEvent = (type: LogEntry['type'], message: string) => {
  const now = new Date()
  const time = now.toLocaleTimeString()
  eventLog.value.unshift({ type, message, time })
  // Keep only last 10 events
  if (eventLog.value.length > 10) {
    eventLog.value.pop()
  }
}

// Clear log
const clearLog = () => {
  eventLog.value = []
}

// Format timestamp
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

// Format duration
const formatDuration = (ms: number): string => {
  if (ms <= 0) return 'Expired'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}

// Handle save
const handleSave = async () => {
  if (!formData.value.sessionId) {
    logEvent('error', 'Session ID is required')
    return
  }

  try {
    await saveSession({
      sessionId: formData.value.sessionId,
      remoteUri: formData.value.remoteUri || 'sip:unknown@example.com',
      callDirection: formData.value.callDirection,
      holdState: formData.value.holdState,
      muteState: {
        audio: formData.value.muteAudio,
        video: formData.value.muteVideo,
      },
      timestamp: Date.now(),
    })
    logEvent('success', `Session saved: ${formData.value.sessionId}`)
    updateExpiry()
  } catch (err) {
    logEvent('error', `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

// Handle load
const handleLoad = async () => {
  try {
    const session = await loadSession()
    if (session) {
      lastLoadedSession.value = session
      logEvent('success', `Session loaded: ${session.sessionId}`)
      // Populate form with loaded data
      formData.value.sessionId = session.sessionId
      formData.value.remoteUri = session.remoteUri
      formData.value.callDirection = session.callDirection
      formData.value.holdState = session.holdState
      formData.value.muteAudio = session.muteState.audio
      formData.value.muteVideo = session.muteState.video
    } else {
      lastLoadedSession.value = null
      logEvent('info', 'No saved session found or session expired')
    }
    updateExpiry()
  } catch (err) {
    logEvent('error', `Failed to load: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

// Handle clear
const handleClear = async () => {
  try {
    await clearSession()
    lastLoadedSession.value = null
    logEvent('success', 'Session cleared')
    updateExpiry()
  } catch (err) {
    logEvent('error', `Failed to clear: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

// Initialize
onMounted(() => {
  // Start expiry countdown update
  expiryInterval = setInterval(updateExpiry, 1000)
  updateExpiry()

  // Log initial state
  logEvent('info', 'Session persistence demo initialized')
})

onUnmounted(() => {
  if (expiryInterval) {
    clearInterval(expiryInterval)
  }
})
</script>

<style scoped>
.session-persistence-demo {
  max-width: 800px;
  margin: 0 auto;
}

.info-section {
  padding: var(--spacing-lg);
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  transition: background-color 0.3s ease;
}

.info-section p {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-secondary);
  line-height: 1.6;
  transition: color 0.3s ease;
}

.info-section p:last-child {
  margin-bottom: 0;
}

.note {
  padding: var(--spacing-md);
  background: rgba(59, 130, 246, 0.1);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

/* Form Card */
.form-card {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 2px solid var(--surface-border);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--card-shadow);
}

.form-card h3 {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--text-primary);
  font-size: 1.125rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Design Decision: PrimeVue InputText and Dropdown components handle input/select styling.
   Removed custom form-input and form-select styles as they're no longer needed. */
.form-group :deep(.p-inputtext),
.form-group :deep(.p-dropdown) {
  width: 100%;
}

.checkbox-group {
  display: flex;
  gap: var(--spacing-md);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
  color: var(--text-primary);
  cursor: pointer;
}

/* Actions Card */
.actions-card {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

/* Design Decision: PrimeVue Button components handle all button styling.
   Removed custom .btn classes as they're no longer needed. */

/* Status Card */
.status-card {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 2px solid var(--surface-border);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.status-card h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.status-grid {
  display: flex;
  gap: var(--spacing-lg);
}

.status-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
  padding: var(--spacing-md);
  background: var(--surface-ground);
  border-radius: var(--radius-md);
}

.status-icon {
  font-size: 1.5rem;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.status-icon.active {
  opacity: 1;
}

.status-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.status-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Info Card */
.info-card,
.loaded-card {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 2px solid var(--surface-border);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.info-card h3,
.loaded-card h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.info-grid,
.session-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.info-row,
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--surface-ground);
  border-radius: var(--radius-md);
}

.info-label,
.detail-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.info-value,
.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.info-value.expiring {
  color: var(--warning);
}

.direction-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.direction-badge.inbound {
  background: rgba(59, 130, 246, 0.1);
  color: var(--info);
}

.direction-badge.outbound {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.media-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  color: var(--info);
  margin-left: var(--spacing-xs);
}

.media-badge:first-child {
  margin-left: 0;
}

/* Error Display */
/* Design Decision: PrimeVue Message component handles error display styling.
   Removed custom .error-display classes as they're no longer needed. */

/* Log Card */
.log-card {
  background: var(--surface-card);
  border-radius: var(--radius-lg);
  border: 2px solid var(--surface-border);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.log-card h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.log-list {
  max-height: 200px;
  overflow-y: auto;
  background: var(--surface-ground);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
}

.log-entry {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.75rem;
  border-bottom: 1px solid var(--surface-border);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.success {
  color: var(--success);
}

.log-entry.error {
  color: var(--danger);
}

.log-entry.warning {
  color: var(--warning);
}

.log-entry.info {
  color: var(--text-secondary);
}

.log-time {
  opacity: 0.7;
  min-width: 70px;
}

.log-message {
  flex: 1;
}

.log-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.75rem;
  padding: var(--spacing-md);
}

/* Code Example */
.code-example {
  margin-top: var(--spacing-2xl);
  padding: var(--spacing-lg);
  background: var(--surface-ground);
  border-radius: var(--radius-lg);
  transition: all 0.3s ease;
}

.code-example h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.code-example pre {
  background: var(--gray-900);
  color: var(--gray-100);
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: 0;
  transition: all 0.3s ease;
}

.code-example code {
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .actions-card {
    flex-direction: column;
  }

  .status-grid {
    flex-direction: column;
  }
}
</style>
