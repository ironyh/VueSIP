<template>
  <div class="recording-management-demo">
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

    <h2>AMI Recording Management</h2>
    <p class="description">
      Server-side call recording using Asterisk MixMonitor via AMI. Start, stop, pause, and resume
      recordings on active channels.
    </p>

    <!-- AMI Connection Status -->
    <div class="status-section">
      <div :class="['status-badge', amiConnected ? 'connected' : 'disconnected']">
        AMI: {{ amiConnected ? 'CONNECTED' : 'DISCONNECTED' }}
      </div>
      <div v-if="activeCount > 0" class="active-badge">
        {{ activeCount }} Active Recording{{ activeCount > 1 ? 's' : '' }}
      </div>
    </div>

    <!-- AMI Configuration -->
    <div class="config-section">
      <h3>AMI Configuration</h3>
      <div class="form-row">
        <div class="form-group">
          <label>WebSocket URL</label>
          <input v-model="amiUrl" type="text" placeholder="ws://localhost:8088/ami" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="amiUsername" type="text" placeholder="admin" />
        </div>
        <div class="form-group">
          <label>Secret</label>
          <input v-model="amiSecret" type="password" placeholder="secret" />
        </div>
      </div>
      <button @click="toggleAmiConnection" :disabled="isConnecting">
        {{ amiConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect' }}
      </button>
    </div>

    <!-- Recording Options -->
    <div v-if="amiConnected" class="options-section">
      <h3>Recording Options</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Format</label>
          <select v-model="recordingOptions.format">
            <option value="wav">WAV (Uncompressed)</option>
            <option value="gsm">GSM (Compressed)</option>
            <option value="ulaw">uLaw (G.711)</option>
            <option value="alaw">aLaw (G.711)</option>
            <option value="g722">G.722 (Wideband)</option>
            <option value="wav49">WAV49 (GSM in WAV)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Mix Mode</label>
          <select v-model="recordingOptions.mixMode">
            <option value="both">Both Directions</option>
            <option value="read">Incoming Only</option>
            <option value="write">Outgoing Only</option>
          </select>
        </div>
        <div class="form-group">
          <label>Directory</label>
          <input
            v-model="recordingOptions.directory"
            type="text"
            placeholder="/var/spool/asterisk/monitor"
          />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Read Volume (-4 to 4)</label>
          <input v-model.number="recordingOptions.readVolume" type="number" min="-4" max="4" />
        </div>
        <div class="form-group">
          <label>Write Volume (-4 to 4)</label>
          <input v-model.number="recordingOptions.writeVolume" type="number" min="-4" max="4" />
        </div>
        <div class="form-group">
          <label>Pause DTMF</label>
          <input v-model="recordingOptions.pauseDtmf" type="text" placeholder="*" maxlength="1" />
        </div>
      </div>
      <div class="checkbox-group">
        <label>
          <input type="checkbox" v-model="trackDuration" />
          Track Duration in Real-time
        </label>
        <label>
          <input type="checkbox" v-model="autoFilename" />
          Auto-generate Filename
        </label>
      </div>
    </div>

    <!-- Start New Recording -->
    <div v-if="amiConnected" class="new-recording-section">
      <h3>Start Recording</h3>
      <div class="form-row">
        <div class="form-group flex-grow">
          <label>Channel</label>
          <input
            v-model="targetChannel"
            type="text"
            placeholder="PJSIP/1001-00000001"
            @keyup.enter="startNewRecording"
          />
        </div>
        <div v-if="!autoFilename" class="form-group">
          <label>Filename</label>
          <input v-model="customFilename" type="text" placeholder="my-recording" />
        </div>
      </div>
      <button @click="startNewRecording" :disabled="!targetChannel || isLoading" class="record-btn">
        {{ isLoading ? 'Starting...' : 'Start Recording' }}
      </button>
    </div>

    <!-- Active Recordings -->
    <div v-if="recordingsList.length > 0" class="active-recordings-section">
      <h3>Active Recordings ({{ recordingsList.length }})</h3>

      <div class="recordings-list">
        <div
          v-for="recording in recordingsList"
          :key="recording.id"
          :class="['recording-card', recording.state]"
        >
          <div class="recording-header">
            <span class="recording-state">
              <span
                :class="[
                  'state-indicator',
                  recording.state,
                  { pulse: recording.state === 'recording' },
                ]"
              ></span>
              {{ recording.state.toUpperCase() }}
            </span>
            <span class="recording-duration">
              {{ formatDuration(recording.duration) }}
            </span>
          </div>

          <div class="recording-details">
            <div class="detail-item">
              <span class="label">Channel:</span>
              <span class="value">{{ recording.channel }}</span>
            </div>
            <div class="detail-item">
              <span class="label">File:</span>
              <span class="value">{{ recording.filename }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Format:</span>
              <span class="value">{{ recording.format.toUpperCase() }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Mix Mode:</span>
              <span class="value">{{ recording.mixMode }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Started:</span>
              <span class="value">{{ formatTime(recording.startedAt) }}</span>
            </div>
            <div v-if="recording.pausedAt" class="detail-item">
              <span class="label">Paused At:</span>
              <span class="value">{{ formatTime(recording.pausedAt) }}</span>
            </div>
          </div>

          <div class="recording-actions">
            <button
              v-if="recording.state === 'recording'"
              @click="handlePause(recording.channel)"
              class="pause-btn"
            >
              Pause
            </button>
            <button
              v-if="recording.state === 'paused'"
              @click="handleResume(recording.channel)"
              class="resume-btn"
            >
              Resume
            </button>
            <button
              v-if="recording.state === 'recording' || recording.state === 'paused'"
              @click="handleStop(recording.channel)"
              class="stop-btn"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recording Statistics -->
    <div v-if="amiConnected" class="stats-section">
      <h3>Recording Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalRecordings }}</div>
          <div class="stat-label">Total Recordings</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatDuration(stats.totalDuration) }}</div>
          <div class="stat-label">Total Duration</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatBytes(stats.totalSize) }}</div>
          <div class="stat-label">Total Size</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatDuration(stats.averageDuration) }}</div>
          <div class="stat-label">Average Duration</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.recordingsToday }}</div>
          <div class="stat-label">Recordings Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatDuration(stats.durationToday) }}</div>
          <div class="stat-label">Duration Today</div>
        </div>
      </div>
    </div>

    <!-- Event Log -->
    <div v-if="eventLog.length > 0" class="event-log-section">
      <h3>Event Log</h3>
      <div class="event-log">
        <div v-for="(event, index) in eventLog" :key="index" :class="['event-item', event.type]">
          <span class="event-time">{{ formatTime(event.timestamp) }}</span>
          <span class="event-type">{{ event.type.toUpperCase() }}</span>
          <span class="event-channel">{{ event.recording.channel }}</span>
          <span v-if="event.error" class="event-error">{{ event.error }}</span>
        </div>
      </div>
      <button @click="clearEventLog" class="clear-log-btn">Clear Log</button>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-section">
      <p class="error-message">{{ error }}</p>
      <button @click="error = null">Dismiss</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted, watch as _watch } from 'vue'
import { useAmiRecording } from '../../src/composables/useAmiRecording'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import type {
  AmiRecordingOptions,
  AmiRecordingFormat,
  AmiRecordingMixMode,
  AmiRecordingEvent,
  AmiRecordingStats,
} from '../../src/types/recording.types'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Connection State (simulated for demo)
const amiUrl = ref('ws://localhost:8088/ami')
const amiUsername = ref('admin')
const amiSecret = ref('')
const realAmiConnected = ref(false)
const isConnecting = ref(false)

// Effective values for simulation
const amiConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realAmiConnected.value
)

// Mock AMI Client for demo
const mockAmiClient = ref<{
  sendAction: (action: string, params: Record<string, string>) => Promise<{ Response: string }>
  on: (event: string, callback: (data: Record<string, string>) => void) => void
  off: (event: string, callback: (data: Record<string, string>) => void) => void
} | null>(null)

// Recording Options
const recordingOptions = reactive<{
  format: AmiRecordingFormat
  mixMode: AmiRecordingMixMode
  directory: string
  readVolume: number
  writeVolume: number
  pauseDtmf: string
}>({
  format: 'wav',
  mixMode: 'both',
  directory: '/var/spool/asterisk/monitor',
  readVolume: 0,
  writeVolume: 0,
  pauseDtmf: '*',
})

// UI State
const trackDuration = ref(true)
const autoFilename = ref(true)
const targetChannel = ref('')
const customFilename = ref('')
const eventLog = ref<AmiRecordingEvent[]>([])

// Initialize useAmiRecording composable
const {
  recordings,
  activeCount,
  isLoading,
  error,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  getStats,
  onRecordingEvent,
  clearRecordings,
} = useAmiRecording(mockAmiClient, {
  defaultFormat: recordingOptions.format,
  defaultMixMode: recordingOptions.mixMode,
  defaultDirectory: recordingOptions.directory,
  trackDuration: trackDuration.value,
  durationInterval: 1000,
  onRecordingStart: (recording) => {
    console.log('Recording started:', recording.filename)
  },
  onRecordingStop: (recording) => {
    console.log('Recording stopped:', recording.filename, 'Duration:', recording.duration)
  },
  onRecordingPause: (recording) => {
    console.log('Recording paused:', recording.filename)
  },
  onRecordingResume: (recording) => {
    console.log('Recording resumed:', recording.filename)
  },
  onRecordingError: (recording, err) => {
    console.error('Recording error:', err)
  },
})

// Subscribe to recording events
const unsubscribe = onRecordingEvent((event: AmiRecordingEvent) => {
  eventLog.value.unshift(event)
  // Keep only last 50 events
  if (eventLog.value.length > 50) {
    eventLog.value = eventLog.value.slice(0, 50)
  }
})

// Computed
const recordingsList = computed(() => {
  return Array.from(recordings.value.values())
})

const stats = computed<AmiRecordingStats>(() => {
  return getStats()
})

// Methods
const toggleAmiConnection = async () => {
  if (amiConnected.value) {
    // Disconnect
    mockAmiClient.value = null
    amiConnected.value = false
    clearRecordings()
  } else {
    // Connect (simulated)
    isConnecting.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Create mock AMI client
      const eventListeners: Map<string, Set<(data: Record<string, string>) => void>> = new Map()

      mockAmiClient.value = {
        sendAction: async (action: string, params: Record<string, string>) => {
          console.log('AMI Action:', action, params)
          // Simulate successful response
          await new Promise((resolve) => setTimeout(resolve, 100))
          return { Response: 'Success' }
        },
        on: (event: string, callback: (data: Record<string, string>) => void) => {
          if (!eventListeners.has(event)) {
            eventListeners.set(event, new Set())
          }
          eventListeners.get(event)!.add(callback)
        },
        off: (event: string, callback: (data: Record<string, string>) => void) => {
          eventListeners.get(event)?.delete(callback)
        },
      }

      amiConnected.value = true
    } catch (err) {
      console.error('Connection failed:', err)
    } finally {
      isConnecting.value = false
    }
  }
}

const startNewRecording = async () => {
  if (!targetChannel.value) return

  const options: AmiRecordingOptions = {
    format: recordingOptions.format,
    mixMode: recordingOptions.mixMode,
    directory: recordingOptions.directory,
    readVolume: recordingOptions.readVolume,
    writeVolume: recordingOptions.writeVolume,
    pauseDtmf: recordingOptions.pauseDtmf || undefined,
  }

  if (!autoFilename.value && customFilename.value) {
    options.filename = customFilename.value
  }

  try {
    await startRecording(targetChannel.value, options)
    targetChannel.value = ''
    customFilename.value = ''
  } catch (err) {
    console.error('Failed to start recording:', err)
  }
}

const handlePause = async (channel: string) => {
  try {
    await pauseRecording(channel)
  } catch (err) {
    console.error('Failed to pause recording:', err)
  }
}

const handleResume = async (channel: string) => {
  try {
    await resumeRecording(channel)
  } catch (err) {
    console.error('Failed to resume recording:', err)
  }
}

const handleStop = async (channel: string) => {
  try {
    await stopRecording(channel)
  } catch (err) {
    console.error('Failed to stop recording:', err)
  }
}

const clearEventLog = () => {
  eventLog.value = []
}

// Formatters
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins < 60) return `${mins}:${secs.toString().padStart(2, '0')}`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString()
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Cleanup
onUnmounted(() => {
  unsubscribe()
})
</script>

<style scoped>
.recording-management-demo {
  max-width: 900px;
  margin: 0 auto;
}

.description {
  color: #666;
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: #10b981;
  color: white;
}

.status-badge.disconnected {
  background-color: #6b7280;
  color: white;
}

.active-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
  background-color: #dc2626;
  color: white;
}

.config-section,
.options-section,
.new-recording-section,
.active-recordings-section,
.stats-section,
.event-log-section,
.error-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.form-group {
  flex: 1;
  min-width: 200px;
}

.form-group.flex-grow {
  flex: 2;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.checkbox-group {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.checkbox-group input[type='checkbox'] {
  width: auto;
}

button {
  padding: 0.625rem 1.25rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #2563eb;
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.record-btn {
  background-color: #dc2626;
}

.record-btn:hover:not(:disabled) {
  background-color: #b91c1c;
}

.recordings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recording-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  border: 2px solid #e5e7eb;
}

.recording-card.recording {
  border-color: #dc2626;
  background: #fef2f2;
}

.recording-card.paused {
  border-color: #f59e0b;
  background: #fffbeb;
}

.recording-card.stopped {
  border-color: #6b7280;
}

.recording-card.failed {
  border-color: #ef4444;
  background: #fef2f2;
}

.recording-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.recording-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.state-indicator {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.state-indicator.recording {
  background: var(--color-error, #ef4444);
}

.state-indicator.paused {
  background: var(--color-warning, #f59e0b);
}

.state-indicator.stopped {
  background: var(--color-gray, #6b7280);
}

.state-indicator.failed {
  background: var(--color-error, #dc2626);
}

.state-indicator.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.recording-duration {
  font-size: 1.25rem;
  font-weight: 700;
  font-family: monospace;
}

.recording-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-item .label {
  color: #6b7280;
}

.detail-item .value {
  font-weight: 500;
  word-break: break-all;
}

.recording-actions {
  display: flex;
  gap: 0.5rem;
}

.recording-actions button {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.pause-btn {
  background-color: #f59e0b;
}

.pause-btn:hover:not(:disabled) {
  background-color: #d97706;
}

.resume-btn {
  background-color: #10b981;
}

.resume-btn:hover:not(:disabled) {
  background-color: #059669;
}

.stop-btn {
  background-color: #6b7280;
}

.stop-btn:hover:not(:disabled) {
  background-color: #4b5563;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.event-log {
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  margin-bottom: 1rem;
}

.event-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.75rem;
  font-family: monospace;
}

.event-item:last-child {
  border-bottom: none;
}

.event-item.started {
  background: #f0fdf4;
}

.event-item.stopped {
  background: #f3f4f6;
}

.event-item.paused {
  background: #fffbeb;
}

.event-item.resumed {
  background: #eff6ff;
}

.event-item.failed {
  background: #fef2f2;
}

.event-time {
  color: #6b7280;
}

.event-type {
  font-weight: 600;
  min-width: 80px;
}

.event-channel {
  flex: 1;
  color: #111827;
}

.event-error {
  color: #dc2626;
}

.clear-log-btn {
  background-color: #6b7280;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.error-section {
  background: #fef2f2;
  border-color: #fecaca;
}

.error-message {
  color: #dc2626;
  margin: 0 0 1rem;
}
</style>
