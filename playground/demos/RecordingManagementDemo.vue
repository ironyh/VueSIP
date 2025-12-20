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

    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">🎙️</span>
          <span>AMI Recording Management</span>
        </div>
      </template>
      <template #subtitle>
        Server-side call recording using Asterisk MixMonitor via AMI. Start, stop, pause, and resume
        recordings on active channels.
      </template>
      <template #content>
        <!-- Connection Status Banner -->
        <div class="status-banner">
          <Tag
            :value="amiConnected ? 'AMI: CONNECTED' : 'AMI: DISCONNECTED'"
            :severity="amiConnected ? 'success' : 'danger'"
            class="status-tag"
          />
          <Tag v-if="activeCount > 0" :value="`${activeCount} Active Recording${activeCount > 1 ? 's' : ''}`" severity="danger" class="active-tag" />
        </div>

        <!-- AMI Connection Panel -->
        <Panel header="AMI Configuration" :toggleable="true" class="connection-panel">
          <div class="connection-form">
            <div class="form-row">
              <div class="form-field">
                <label>WebSocket URL</label>
                <InputText v-model="amiUrl" placeholder="ws://localhost:8088/ami" />
                <small class="field-help">Asterisk Manager Interface WebSocket URL</small>
              </div>
              <div class="form-field">
                <label>Username</label>
                <InputText v-model="amiUsername" placeholder="admin" />
              </div>
              <div class="form-field">
                <label>Secret</label>
                <InputText v-model="amiSecret" type="password" placeholder="secret" />
              </div>
            </div>
            <Button
              :label="amiConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect to AMI'"
              :severity="amiConnected ? 'danger' : 'success'"
              :disabled="isConnecting"
              @click="toggleAmiConnection"
            />
          </div>
        </Panel>

        <!-- Main Content (only shown when connected) -->
        <div v-if="amiConnected">
          <TabView class="demo-tabs">
            <!-- Recordings Tab -->
            <TabPanel header="🔴 Active Recordings">
              <!-- Start New Recording Section -->
              <Panel header="Start New Recording" class="start-panel">
                <div class="start-form">
                  <div class="form-row">
                    <div class="form-field flex-grow">
                      <label>Channel</label>
                      <InputText
                        v-model="targetChannel"
                        placeholder="PJSIP/1001-00000001"
                        @keyup.enter="startNewRecording"
                      />
                      <small class="field-help">The active channel to record</small>
                    </div>
                    <div v-if="!autoFilename" class="form-field">
                      <label>Custom Filename</label>
                      <InputText v-model="customFilename" placeholder="my-recording" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-field">
                      <label>Format</label>
                      <Dropdown v-model="recordingOptions.format" :options="formatOptions" />
                    </div>
                    <div class="form-field">
                      <label>Mix Mode</label>
                      <Dropdown v-model="recordingOptions.mixMode" :options="mixModeOptions" />
                    </div>
                  </div>
                  <div class="checkbox-row">
                    <Checkbox v-model="autoFilename" :binary="true" inputId="autoFilename" />
                    <label for="autoFilename">Auto-generate filename</label>
                  </div>
                  <Button
                    label="Start Recording"
                    icon="pi pi-circle"
                    severity="danger"
                    :disabled="!targetChannel || isLoading"
                    @click="startNewRecording"
                  />
                </div>
              </Panel>

              <!-- Active Recordings List -->
              <div v-if="recordingsList.length > 0" class="recordings-section">
                <h3>Active Recordings ({{ recordingsList.length }})</h3>
                <div class="recordings-grid">
                  <div
                    v-for="recording in recordingsList"
                    :key="recording.id"
                    class="recording-card"
                    :class="recording.state"
                  >
                    <div class="recording-header">
                      <div class="recording-state">
                        <span
                          :class="[
                            'state-indicator',
                            recording.state,
                            { pulse: recording.state === 'recording' },
                          ]"
                        ></span>
                        <Tag
                          :value="recording.state.toUpperCase()"
                          :severity="
                            recording.state === 'recording'
                              ? 'danger'
                              : recording.state === 'paused'
                                ? 'warning'
                                : 'secondary'
                          "
                        />
                      </div>
                      <span class="recording-duration">{{ formatDuration(recording.duration) }}</span>
                    </div>

                    <Divider />

                    <div class="recording-details">
                      <div class="detail-item">
                        <span class="detail-label">Channel:</span>
                        <span class="detail-value">{{ recording.channel }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">File:</span>
                        <span class="detail-value">{{ recording.filename }}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Format:</span>
                        <Tag :value="recording.format.toUpperCase()" severity="info" />
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Mix Mode:</span>
                        <Tag :value="recording.mixMode" severity="secondary" />
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Started:</span>
                        <span class="detail-value">{{ formatTime(recording.startedAt) }}</span>
                      </div>
                      <div v-if="recording.pausedAt" class="detail-item">
                        <span class="detail-label">Paused:</span>
                        <span class="detail-value">{{ formatTime(recording.pausedAt) }}</span>
                      </div>
                    </div>

                    <div class="recording-actions">
                      <Button
                        v-if="recording.state === 'recording'"
                        label="Pause"
                        severity="warning"
                        size="small"
                        @click="handlePause(recording.channel)"
                      />
                      <Button
                        v-if="recording.state === 'paused'"
                        label="Resume"
                        severity="success"
                        size="small"
                        @click="handleResume(recording.channel)"
                      />
                      <Button
                        v-if="recording.state === 'recording' || recording.state === 'paused'"
                        label="Stop"
                        severity="secondary"
                        size="small"
                        @click="handleStop(recording.channel)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <span class="empty-icon">🎙️</span>
                <strong>No Active Recordings</strong>
                <p>Start a recording by entering a channel name above</p>
              </div>
            </TabPanel>

            <!-- Settings Tab -->
            <TabPanel header="⚙️ Settings">
              <Panel header="Recording Options" class="settings-panel">
                <div class="settings-form">
                  <div class="form-row">
                    <div class="form-field">
                      <label>Audio Format</label>
                      <Dropdown v-model="recordingOptions.format" :options="formatOptions" />
                      <small class="field-help">Recording file format</small>
                    </div>
                    <div class="form-field">
                      <label>Mix Mode</label>
                      <Dropdown v-model="recordingOptions.mixMode" :options="mixModeOptions" />
                      <small class="field-help">Audio direction to record</small>
                    </div>
                  </div>

                  <Divider />

                  <h4 class="settings-subtitle">Volume Adjustment</h4>
                  <div class="form-row">
                    <div class="form-field">
                      <label>Read Volume (-4 to 4)</label>
                      <InputNumber
                        v-model="recordingOptions.readVolume"
                        :min="-4"
                        :max="4"
                        showButtons
                      />
                      <small class="field-help">Incoming audio volume adjustment</small>
                    </div>
                    <div class="form-field">
                      <label>Write Volume (-4 to 4)</label>
                      <InputNumber
                        v-model="recordingOptions.writeVolume"
                        :min="-4"
                        :max="4"
                        showButtons
                      />
                      <small class="field-help">Outgoing audio volume adjustment</small>
                    </div>
                  </div>

                  <Divider />

                  <h4 class="settings-subtitle">Advanced Options</h4>
                  <div class="form-field">
                    <label>Recording Directory</label>
                    <InputText
                      v-model="recordingOptions.directory"
                      placeholder="/var/spool/asterisk/monitor"
                    />
                    <small class="field-help">Server path for storing recordings</small>
                  </div>

                  <div class="form-field">
                    <label>Pause DTMF Digit</label>
                    <InputText
                      v-model="recordingOptions.pauseDtmf"
                      placeholder="*"
                      maxlength="1"
                    />
                    <small class="field-help">DTMF digit to pause/resume recording</small>
                  </div>

                  <Divider />

                  <div class="checkbox-group">
                    <div class="checkbox-item">
                      <Checkbox v-model="trackDuration" :binary="true" inputId="trackDuration" />
                      <label for="trackDuration">
                        <strong>Track Duration in Real-time</strong>
                        <span class="checkbox-hint">Update recording duration continuously</span>
                      </label>
                    </div>
                  </div>
                </div>
              </Panel>
            </TabPanel>

            <!-- Statistics Tab -->
            <TabPanel header="📊 Statistics">
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-icon">📼</div>
                  <div class="stat-value">{{ stats.totalRecordings }}</div>
                  <div class="stat-label">Total Recordings</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">⏱️</div>
                  <div class="stat-value">{{ formatDuration(stats.totalDuration) }}</div>
                  <div class="stat-label">Total Duration</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">💾</div>
                  <div class="stat-value">{{ formatBytes(stats.totalSize) }}</div>
                  <div class="stat-label">Total Size</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">⌛</div>
                  <div class="stat-value">{{ formatDuration(stats.averageDuration) }}</div>
                  <div class="stat-label">Average Duration</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">📅</div>
                  <div class="stat-value">{{ stats.recordingsToday }}</div>
                  <div class="stat-label">Recordings Today</div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">🕐</div>
                  <div class="stat-value">{{ formatDuration(stats.durationToday) }}</div>
                  <div class="stat-label">Duration Today</div>
                </div>
              </div>
            </TabPanel>

            <!-- Event Log Tab -->
            <TabPanel header="📋 Event Log">
              <div class="log-header">
                <h3>Recording Events</h3>
                <Button
                  v-if="eventLog.length > 0"
                  label="Clear Log"
                  severity="secondary"
                  size="small"
                  @click="clearEventLog"
                />
              </div>

              <div v-if="eventLog.length > 0" class="event-log">
                <div
                  v-for="(event, index) in eventLog"
                  :key="index"
                  :class="['event-item', event.type]"
                >
                  <span class="event-time">{{ formatTime(event.timestamp) }}</span>
                  <Tag
                    :value="event.type.toUpperCase()"
                    :severity="
                      event.type === 'started'
                        ? 'success'
                        : event.type === 'stopped'
                          ? 'secondary'
                          : event.type === 'failed'
                            ? 'danger'
                            : 'info'
                    "
                  />
                  <span class="event-channel">{{ event.recording.channel }}</span>
                  <span v-if="event.error" class="event-error">{{ event.error }}</span>
                </div>
              </div>

              <div v-else class="empty-state">
                <span class="empty-icon">📋</span>
                <strong>No Events Yet</strong>
                <p>Recording events will appear here as they occur</p>
              </div>
            </TabPanel>
          </TabView>
        </div>

        <!-- Not Connected State -->
        <div v-else class="not-connected-state">
          <span class="not-connected-icon">🔌</span>
          <strong>Not Connected to AMI</strong>
          <p>Connect to Asterisk Manager Interface to start managing recordings</p>
        </div>

        <!-- Error Display -->
        <Message v-if="error" severity="error" :closable="true" @close="error = null">
          {{ error }}
        </Message>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useAmiRecording } from '../../src/composables/useAmiRecording'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Dropdown from 'primevue/dropdown'
import Divider from 'primevue/divider'
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

// Dropdown options
const formatOptions = ref([
  { label: 'WAV (Uncompressed)', value: 'wav' },
  { label: 'GSM (Compressed)', value: 'gsm' },
  { label: 'uLaw (G.711)', value: 'ulaw' },
  { label: 'aLaw (G.711)', value: 'alaw' },
  { label: 'G.722 (Wideband)', value: 'g722' },
  { label: 'WAV49 (GSM in WAV)', value: 'wav49' },
])

const mixModeOptions = ref([
  { label: 'Both Directions', value: 'both' },
  { label: 'Incoming Only', value: 'read' },
  { label: 'Outgoing Only', value: 'write' },
])

// AMI Connection State
const amiUrl = ref('ws://localhost:8088/ami')
const amiUsername = ref('admin')
const amiSecret = ref('')
const realAmiConnected = ref(false)
const isConnecting = ref(false)

// Effective values for simulation
const amiConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realAmiConnected.value
)

// Mock AMI Client
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
    realAmiConnected.value = false
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

      realAmiConnected.value = true
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
  max-width: 1200px;
  margin: 0 auto;
}

.demo-card {
  margin: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.demo-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

/* Status Banner */
.status-banner {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.status-tag {
  font-size: 1rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
}

.active-tag {
  font-size: 1rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

/* Connection Panel */
.connection-panel {
  margin-bottom: 1.5rem;
}

.connection-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Forms */
.form-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.form-field {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field.flex-grow {
  flex: 2;
}

.form-field label {
  font-weight: 600;
  color: var(--text-color);
}

.field-help {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  font-style: italic;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.checkbox-row label {
  cursor: pointer;
}

/* Tabs */
.demo-tabs {
  margin-top: 1.5rem;
}

/* Start Panel */
.start-panel {
  margin-bottom: 1.5rem;
}

.start-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Recordings Grid */
.recordings-section {
  margin-top: 1.5rem;
}

.recordings-section h3 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.recordings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.25rem;
}

.recording-card {
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 12px;
  border: 2px solid var(--surface-border);
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.recording-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.recording-card.recording {
  border-color: var(--red-400);
  background: linear-gradient(135deg, var(--red-50) 0%, rgba(239, 68, 68, 0.05) 100%);
}

.recording-card.paused {
  border-color: var(--orange-400);
  background: linear-gradient(135deg, var(--orange-50) 0%, rgba(255, 167, 38, 0.05) 100%);
}

.recording-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.recording-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.state-indicator {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.state-indicator.recording {
  background: var(--red-500);
}

.state-indicator.paused {
  background: var(--orange-500);
}

.state-indicator.pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

.recording-duration {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: monospace;
  color: var(--text-color);
}

.recording-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.detail-label {
  font-weight: 600;
  color: var(--text-color-secondary);
  min-width: 80px;
}

.detail-value {
  color: var(--text-color);
  word-break: break-all;
}

.recording-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

/* Settings Panel */
.settings-panel {
  margin-top: 1rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-subtitle {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
}

.checkbox-item label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.checkbox-hint {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  font-weight: 400;
}

/* Statistics Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.25rem;
}

.stat-card {
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 12px;
  border: 2px solid var(--surface-border);
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 0.25rem;
  font-family: monospace;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

/* Event Log */
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.log-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.event-log {
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: 8px;
  border-left: 4px solid var(--surface-border);
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.event-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.event-item.started {
  border-left-color: var(--green-500);
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.05) 0%, var(--surface-card) 100%);
}

.event-item.stopped {
  border-left-color: var(--gray-500);
}

.event-item.paused {
  border-left-color: var(--orange-500);
  background: linear-gradient(90deg, rgba(255, 167, 38, 0.05) 0%, var(--surface-card) 100%);
}

.event-item.resumed {
  border-left-color: var(--blue-500);
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, var(--surface-card) 100%);
}

.event-item.failed {
  border-left-color: var(--red-500);
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, var(--surface-card) 100%);
}

.event-time {
  color: var(--text-color-secondary);
  font-size: 0.85rem;
  min-width: 90px;
  font-weight: 500;
  font-family: monospace;
}

.event-channel {
  flex: 1;
  font-weight: 500;
  font-family: monospace;
}

.event-error {
  color: var(--red-500);
  font-weight: 600;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  background: var(--surface-ground);
  border-radius: 12px;
  border: 2px dashed var(--surface-border);
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.5;
  filter: grayscale(0.3);
}

.empty-state strong {
  font-size: 1.25rem;
  color: var(--text-color);
}

.empty-state p {
  text-align: center;
  color: var(--text-color-secondary);
  max-width: 400px;
  margin: 0;
}

/* Not Connected State */
.not-connected-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 2rem;
  background: var(--surface-ground);
  border-radius: 12px;
  border: 2px dashed var(--surface-border);
  margin-top: 1.5rem;
}

.not-connected-icon {
  font-size: 5rem;
  opacity: 0.4;
}

.not-connected-state strong {
  font-size: 1.5rem;
  color: var(--text-color);
}

.not-connected-state p {
  text-align: center;
  color: var(--text-color-secondary);
  max-width: 500px;
  margin: 0;
  font-size: 1.05rem;
}

/* Dark mode enhancements */
@media (prefers-color-scheme: dark) {
  .demo-card {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  .recording-card:hover,
  .stat-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  .event-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}
</style>
