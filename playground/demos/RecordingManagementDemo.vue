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
          <InputText v-model="amiUrl" placeholder="ws://localhost:8088/ami" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <InputText v-model="amiUsername" placeholder="admin" />
        </div>
        <div class="form-group">
          <label>Secret</label>
          <Password v-model="amiSecret" placeholder="secret" :feedback="false" toggleMask />
        </div>
      </div>
      <Button
        :label="amiConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'"
        :disabled="isConnecting"
        @click="toggleAmiConnection"
      />
    </div>

    <!-- Recording Options -->
    <div v-if="amiConnected" class="options-section">
      <h3>Recording Options</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Format</label>
          <Dropdown
            v-model="recordingOptions.format"
            :options="[
              { label: 'WAV (Uncompressed)', value: 'wav' },
              { label: 'GSM (Compressed)', value: 'gsm' },
              { label: 'uLaw (G.711)', value: 'ulaw' },
              { label: 'aLaw (G.711)', value: 'alaw' },
              { label: 'G.722 (Wideband)', value: 'g722' },
              { label: 'WAV49 (GSM in WAV)', value: 'wav49' },
            ]"
            optionLabel="label"
            optionValue="value"
          />
        </div>
        <div class="form-group">
          <label>Mix Mode</label>
          <Dropdown
            v-model="recordingOptions.mixMode"
            :options="[
              { label: 'Both Directions', value: 'both' },
              { label: 'Incoming Only', value: 'read' },
              { label: 'Outgoing Only', value: 'write' },
            ]"
            optionLabel="label"
            optionValue="value"
          />
        </div>
        <div class="form-group">
          <label>Directory</label>
          <InputText
            v-model="recordingOptions.directory"
            placeholder="/var/spool/asterisk/monitor"
          />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Read Volume (-4 to 4)</label>
          <InputNumber v-model="recordingOptions.readVolume" :min="-4" :max="4" showButtons />
        </div>
        <div class="form-group">
          <label>Write Volume (-4 to 4)</label>
          <InputNumber v-model="recordingOptions.writeVolume" :min="-4" :max="4" showButtons />
        </div>
        <div class="form-group">
          <label>Pause DTMF</label>
          <InputText v-model="recordingOptions.pauseDtmf" placeholder="*" maxlength="1" />
        </div>
      </div>
      <div class="checkbox-group">
        <label>
          <Checkbox v-model="trackDuration" :binary="true" />
          Track Duration in Real-time
        </label>
        <label>
          <Checkbox v-model="autoFilename" :binary="true" />
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
          <InputText
            v-model="targetChannel"
            placeholder="PJSIP/1001-00000001"
            @keyup.enter="startNewRecording"
          />
        </div>
        <div v-if="!autoFilename" class="form-group">
          <label>Filename</label>
          <InputText v-model="customFilename" placeholder="my-recording" />
        </div>
      </div>
      <Button
        :label="isLoading ? 'Starting...' : 'Start Recording'"
        :disabled="!targetChannel || isLoading"
        @click="startNewRecording"
        class="record-btn"
      />
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
            <Button
              v-if="recording.state === 'recording'"
              label="Pause"
              class="pause-btn"
              @click="handlePause(recording.channel)"
            />
            <Button
              v-if="recording.state === 'paused'"
              label="Resume"
              class="resume-btn"
              @click="handleResume(recording.channel)"
            />
            <Button
              v-if="recording.state === 'recording' || recording.state === 'paused'"
              label="Stop"
              severity="danger"
              class="stop-btn"
              @click="handleStop(recording.channel)"
            />
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
      <Button label="Clear Log" severity="secondary" @click="clearEventLog" />
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-section">
      <p class="error-message">{{ error }}</p>
      <Button label="Dismiss" severity="secondary" @click="error = null" />
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
import { Button, InputText, Password, Dropdown, Checkbox, InputNumber } from './shared-components'

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
  background-color: var(--success);
  color: var(--surface-0);
}

.status-badge.disconnected {
  background-color: var(--text-secondary);
  color: var(--surface-0);
}

.active-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
  background-color: var(--danger-hover);
  color: var(--surface-0);
}

.config-section,
.options-section,
.new-recording-section,
.active-recordings-section,
.stats-section,
.event-log-section,
.error-section {
  background: var(--surface-50);
  border: 1px solid var(--border-color);
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

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }

  .form-group {
    width: 100% !important;
    min-width: 100%;
  }
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

.record-btn {
  background-color: var(--danger-hover);
}

.record-btn:hover:not(:disabled) {
  background-color: var(--danger-active);
}

.recordings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recording-card {
  background: var(--surface-0);
  border-radius: 8px;
  padding: 1rem;
  border: 2px solid var(--border-color);
}

.recording-card.recording {
  border-color: var(--danger-hover);
  background: var(--red-50);
}

.recording-card.paused {
  border-color: var(--warning);
  background: var(--yellow-50);
}

.recording-card.stopped {
  border-color: var(--text-secondary);
}

.recording-card.failed {
  border-color: var(--danger);
  background: var(--red-50);
}

.recording-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
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
  background: var(--color-error, var(--danger));
}

.state-indicator.paused {
  background: var(--color-warning, var(--warning));
}

.state-indicator.stopped {
  background: var(--color-gray, var(--text-secondary));
}

.state-indicator.failed {
  background: var(--color-error, var(--danger-hover));
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

@media (max-width: 768px) {
  .recording-details {
    grid-template-columns: 1fr;
  }
}

.detail-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-item .label {
  color: var(--text-secondary);
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
  background-color: var(--warning);
}

.pause-btn:hover:not(:disabled) {
  background-color: var(--warning-hover);
}

.resume-btn {
  background-color: var(--success);
}

.resume-btn:hover:not(:disabled) {
  background-color: var(--success-hover);
}

.stop-btn {
  background-color: var(--text-secondary);
}

.stop-btn:hover:not(:disabled) {
  background-color: var(--gray-600);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--surface-0);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid var(--border-color);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.event-log {
  max-height: 200px;
  overflow-y: auto;
  background: var(--surface-0);
  border-radius: 4px;
  border: 1px solid var(--border-color);
  margin-bottom: 1rem;
}

.event-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--surface-100);
  font-size: 0.75rem;
  font-family: monospace;
}

.event-item:last-child {
  border-bottom: none;
}

.event-item.started {
  background: var(--green-50);
}

.event-item.stopped {
  background: var(--surface-100);
}

.event-item.paused {
  background: var(--yellow-50);
}

.event-item.resumed {
  background: var(--surface-ground);
}

.event-item.failed {
  background: var(--red-50);
}

.event-time {
  color: var(--text-secondary);
}

.event-type {
  font-weight: 600;
  min-width: 80px;
}

.event-channel {
  flex: 1;
  color: var(--gray-900);
}

.event-error {
  color: var(--danger-hover);
}

.clear-log-btn {
  background-color: var(--text-secondary);
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
}

.error-section {
  background: var(--red-50);
  border-color: var(--red-200);
}

.error-message {
  color: var(--danger-hover);
  margin: 0 0 1rem;
}
</style>
