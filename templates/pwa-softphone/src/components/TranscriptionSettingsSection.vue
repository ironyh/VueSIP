<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted, watch } from 'vue'
import { useTranscription, providerRegistry, WhisperProvider } from 'vuesip'
import { useTranscriptPersistence } from '../composables/useTranscriptPersistence'
import { useCallRecording } from '../composables/useCallRecording'

// Load persisted settings from localStorage
const STORAGE_KEY = 'vuesip-transcription-settings'

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.warn('Failed to load transcription settings:', e)
  }
  return {
    provider: 'web-speech',
    language: 'en-US',
    whisperUrl: 'ws://localhost:8765/transcribe',
    whisperModel: 'base',
  }
}

function saveSettings(settings: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    if (error.includes('QuotaExceeded') || error.includes('quota')) {
      providerError.value = 'Storage quota exceeded. Settings not saved.'
    } else {
      console.warn('Failed to save transcription settings:', e)
      providerError.value = 'Failed to save settings. Changes may be lost on page reload.'
    }
  }
}

const savedSettings = loadSettings()
const provider = ref<'web-speech' | 'whisper'>(savedSettings.provider)
const language = ref(savedSettings.language)
const whisperUrl = ref(savedSettings.whisperUrl)
const whisperModel = ref<'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3'>(
  savedSettings.whisperModel || 'base'
)
const providerError = ref<string | null>(null)
const showWhisperSettings = ref(savedSettings.provider === 'whisper')
const isSwitchingProvider = ref(false)
const isStarting = ref(false)
const connectionTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const previousProvider = ref<'web-speech' | 'whisper'>(savedSettings.provider)

// Connection status for Whisper
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
const whisperConnectionStatus = ref<ConnectionStatus>('disconnected')

// Check browser compatibility
const isWebSocketSupported = typeof WebSocket !== 'undefined'

// Register Whisper provider on mount
onMounted(() => {
  if (!providerRegistry.has('whisper')) {
    providerRegistry.register('whisper', () => new WhisperProvider())
  }
})

// Cleanup timeout on unmount
onUnmounted(() => {
  if (connectionTimeout.value) {
    clearTimeout(connectionTimeout.value)
  }
})

const transcription = useTranscription({
  provider: provider.value,
  language: provider.value === 'whisper' ? 'en' : language.value,
})

const {
  isTranscribing,
  transcript,
  currentUtterance,
  error,
  start,
  stop,
  exportTranscript,
  switchProvider,
  provider: currentProvider,
} = transcription

// Watch for provider changes and update hint text
const providerHint = computed(() => {
  if (provider.value === 'whisper') {
    return 'Using Whisper server for transcription. Requires a running Whisper WebSocket server.'
  }
  return 'This uses your browser's speech recognition. It is best-effort and may require microphone permission.'
})

// Watch provider selection and show/hide Whisper settings
watch(provider, (newProvider) => {
  showWhisperSettings.value = newProvider === 'whisper'
  saveSettings({
    provider: newProvider,
    language: language.value,
    whisperUrl: whisperUrl.value,
    whisperModel: whisperModel.value,
  })
})

// Watch language changes
watch(language, () => {
  saveSettings({
    provider: provider.value,
    language: language.value,
    whisperUrl: whisperUrl.value,
    whisperModel: whisperModel.value,
  })
})

// Watch Whisper settings - warn if changing during active transcription
watch([whisperUrl, whisperModel], ([newUrl, newModel], [oldUrl, oldModel]) => {
  if (isTranscribing.value && provider.value === 'whisper') {
    if (newUrl !== oldUrl || newModel !== oldModel) {
      providerError.value =
        'Settings changed. Stop transcription and restart to apply new Whisper server URL or model.'
    }
  }
  saveSettings({
    provider: provider.value,
    language: language.value,
    whisperUrl: whisperUrl.value,
    whisperModel: whisperModel.value,
  })
})

// Validate Whisper URL format
function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:'
  } catch {
    return false
  }
}

// Apply provider switch
async function applyProviderChange() {
  // Prevent concurrent switches
  if (isSwitchingProvider.value) {
    return
  }

  // Validate Whisper URL if switching to Whisper
  if (provider.value === 'whisper') {
    if (!isValidWebSocketUrl(whisperUrl.value)) {
      providerError.value = 'Invalid WebSocket URL. Must start with ws:// or wss://'
      whisperConnectionStatus.value = 'error'
      return
    }
  }

  // Check browser support for Whisper
  if (provider.value === 'whisper' && !isWebSocketSupported) {
    providerError.value = 'WebSocket is not supported in this browser. Please use Web Speech API.'
    provider.value = 'web-speech' // Revert selection
    whisperConnectionStatus.value = 'error'
    return
  }

  isSwitchingProvider.value = true
  previousProvider.value = currentProvider.value as 'web-speech' | 'whisper'

  if (isTranscribing.value) {
    // Stop current transcription before switching
    stop()
  }

  // Clear all error states
  providerError.value = null
  whisperConnectionStatus.value = provider.value === 'whisper' ? 'connecting' : 'disconnected'

  // Set up connection timeout feedback (10s for Whisper)
  if (provider.value === 'whisper' && connectionTimeout.value) {
    clearTimeout(connectionTimeout.value)
  }

  if (provider.value === 'whisper') {
    connectionTimeout.value = setTimeout(() => {
      if (whisperConnectionStatus.value === 'connecting') {
        whisperConnectionStatus.value = 'error'
        providerError.value = `Connection timeout. Whisper server at ${whisperUrl.value} did not respond within 10 seconds.`
      }
    }, 10000)
  }

  try {
    if (provider.value === 'whisper') {
      await switchProvider('whisper', {
        serverUrl: whisperUrl.value,
        model: whisperModel.value,
        language: 'en', // Whisper uses ISO language codes
      })
      whisperConnectionStatus.value = 'connected'
      if (connectionTimeout.value) {
        clearTimeout(connectionTimeout.value)
        connectionTimeout.value = null
      }
    } else {
      await switchProvider('web-speech', {
        language: language.value,
      })
      whisperConnectionStatus.value = 'disconnected'
      if (connectionTimeout.value) {
        clearTimeout(connectionTimeout.value)
        connectionTimeout.value = null
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to switch provider'
    providerError.value = errorMessage

    // Automatic fallback to Web Speech if Whisper fails
    if (provider.value === 'whisper') {
      whisperConnectionStatus.value = 'error'
      providerError.value = `${errorMessage}. Falling back to Web Speech API.`

      // Revert to Web Speech
      provider.value = 'web-speech'
      try {
        await switchProvider('web-speech', {
          language: language.value,
        })
        whisperConnectionStatus.value = 'disconnected'
      } catch (fallbackErr) {
        providerError.value = `Failed to switch provider and fallback failed: ${errorMessage}`
        console.error('Provider switch and fallback error:', fallbackErr)
      }
    } else {
      // If Web Speech fails, revert to previous provider
      provider.value = previousProvider.value
      try {
        if (previousProvider.value === 'whisper') {
          await switchProvider('whisper', {
            serverUrl: whisperUrl.value,
            model: whisperModel.value,
            language: 'en',
          })
        } else {
          await switchProvider('web-speech', {
            language: language.value,
          })
        }
      } catch (revertErr) {
        console.error('Provider revert error:', revertErr)
      }
    }

    console.error('Provider switch error:', err)
  } finally {
    isSwitchingProvider.value = false
  }
}

// Provide transcription instance so App.vue can access it for persistence
provide('transcription', transcription)

const transcriptPersistence = useTranscriptPersistence()
const callRecording = useCallRecording()
const persistenceEnabled = computed(() => transcriptPersistence.persistenceEnabled.value)
const recordingPersistenceEnabled = computed(() => callRecording.persistenceEnabled.value)

function togglePersistence() {
  transcriptPersistence.setPersistenceEnabled(!persistenceEnabled.value)
}

function toggleRecordingPersistence() {
  callRecording.setPersistenceEnabled(!recordingPersistenceEnabled.value)
}

const transcriptText = computed(() => {
  const lines = transcript.value
    .slice(-50)
    .map((e: any) =>
      e?.participantName ? `${e.participantName}: ${e.text}` : String(e?.text ?? '')
    )
  return lines.join('\n')
})

async function toggleTranscription() {
  if (isTranscribing.value) {
    await stop()
    whisperConnectionStatus.value = 'disconnected'
    return
  }

  // Prevent concurrent start calls
  if (isStarting.value) {
    return
  }

  isStarting.value = true

  try {
    // Apply provider changes if needed before starting
    if (currentProvider.value !== provider.value) {
      await applyProviderChange()
      // If provider switch failed, don't start transcription
      if (providerError.value && provider.value === 'whisper') {
        return
      }
    }

    // Set connection status for Whisper
    if (provider.value === 'whisper') {
      whisperConnectionStatus.value = 'connecting'
    }

    await start()

    // Update connection status on successful start
    if (provider.value === 'whisper') {
      whisperConnectionStatus.value = 'connected'
    }

    // Clear errors on successful start
    providerError.value = null
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to start transcription'
    providerError.value = errorMessage

    if (provider.value === 'whisper') {
      whisperConnectionStatus.value = 'error'

      // Automatic fallback to Web Speech if Whisper start fails
      providerError.value = `${errorMessage}. Falling back to Web Speech API.`
      provider.value = 'web-speech'

      try {
        await applyProviderChange()
        await start()
        whisperConnectionStatus.value = 'disconnected'
      } catch (fallbackErr) {
        providerError.value = `Failed to start transcription and fallback failed: ${errorMessage}`
        console.error('Start transcription and fallback error:', fallbackErr)
      }
    }

    console.error('Start transcription error:', err)
  } finally {
    isStarting.value = false
  }
}

// Watch for transcription errors to update connection status
watch(error, (newError) => {
  if (newError && provider.value === 'whisper' && isTranscribing.value) {
    // Check if error is connection-related
    const errorMsg = newError.message.toLowerCase()
    if (errorMsg.includes('timeout') || errorMsg.includes('connection') || errorMsg.includes('websocket')) {
      whisperConnectionStatus.value = 'error'
    }
  } else if (!newError && provider.value === 'whisper' && isTranscribing.value) {
    whisperConnectionStatus.value = 'connected'
  }
})

function downloadTxt() {
  const txt = exportTranscript('txt')
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcript-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="transcription-settings">
    <!-- Configuration Section -->
    <div class="settings-section">
      <h3 class="section-header">
        <span class="section-icon">⚙️</span>
        <span>Configuration</span>
      </h3>

      <div class="section-content">
        <p class="hint">{{ providerHint }}</p>

        <div class="setting-item">
          <div class="setting-info">
            <label>Provider</label>
            <p class="setting-hint">Choose your transcription service</p>
          </div>
          <div class="setting-control-group">
            <select
              v-model="provider"
              :disabled="isTranscribing || isSwitchingProvider"
              @change="applyProviderChange"
              class="setting-control"
            >
              <option value="web-speech">Web Speech API</option>
              <option value="whisper" :disabled="!isWebSocketSupported">
                Whisper Server{{ !isWebSocketSupported ? ' (not supported)' : '' }}
              </option>
            </select>
            <span v-if="isSwitchingProvider" class="switching-indicator">Switching...</span>
          </div>
        </div>

        <!-- Whisper Settings (shown when Whisper is selected) -->
        <div v-if="showWhisperSettings" class="whisper-settings">
          <!-- Connection Status Indicator -->
          <div v-if="provider === 'whisper'" class="connection-status">
            <span
              class="status-indicator"
              :class="{
                'status-connecting': whisperConnectionStatus === 'connecting',
                'status-connected': whisperConnectionStatus === 'connected',
                'status-error': whisperConnectionStatus === 'error',
                'status-disconnected': whisperConnectionStatus === 'disconnected',
              }"
            >
              <span class="status-dot"></span>
              <span class="status-text">
                {{
                  whisperConnectionStatus === 'connecting'
                    ? 'Connecting...'
                    : whisperConnectionStatus === 'connected'
                      ? 'Connected'
                      : whisperConnectionStatus === 'error'
                        ? 'Connection Error'
                        : 'Disconnected'
                }}
              </span>
            </span>
          </div>

          <div class="setting-item">
            <label for="whisper-url">Server URL</label>
            <input
              id="whisper-url"
              v-model="whisperUrl"
              type="text"
              placeholder="ws://localhost:8765/transcribe"
              :disabled="isTranscribing || isSwitchingProvider"
              class="whisper-input"
            />
          </div>

          <div class="setting-item">
            <label for="whisper-model">Model</label>
            <select
              id="whisper-model"
              v-model="whisperModel"
              :disabled="isTranscribing || isSwitchingProvider"
              @change="applyProviderChange"
            >
              <option value="tiny">Tiny (fastest, least accurate)</option>
              <option value="base">Base (balanced)</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large (most accurate, slowest)</option>
              <option value="large-v2">Large v2</option>
              <option value="large-v3">Large v3</option>
            </select>
          </div>
        </div>

        <!-- Language selector (only for Web Speech API) -->
        <div v-if="provider === 'web-speech'" class="setting-item">
          <div class="setting-info">
            <label>Language</label>
            <p class="setting-hint">Select the language for transcription</p>
          </div>
          <select v-model="language" :disabled="isTranscribing" class="setting-control">
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="sv-SE">Swedish</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Storage Settings -->
    <div class="settings-section">
      <h3 class="section-header">
        <span class="section-icon">💾</span>
        <span>Storage</span>
      </h3>

      <div class="section-content">
        <div class="setting-item">
          <div class="setting-info">
            <label for="transcript-persistence-toggle">Save Transcripts</label>
            <p class="setting-hint">
              Automatically save transcripts to your device when calls end. Transcripts are linked
              to call history.
            </p>
          </div>
          <button
            id="transcript-persistence-toggle"
            class="toggle-btn"
            :class="{ active: persistenceEnabled }"
            @click="togglePersistence"
          >
            <span class="toggle-slider"></span>
          </button>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label for="recording-persistence-toggle">Save Recordings</label>
            <p class="setting-hint">
              Automatically save call recordings to your device when calls end. Recordings are
              linked to call history.
            </p>
          </div>
          <button
            id="recording-persistence-toggle"
            class="toggle-btn"
            :class="{ active: recordingPersistenceEnabled }"
            @click="toggleRecordingPersistence"
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Live Transcription Controls -->
    <div class="settings-section">
      <h3 class="section-header">
        <span class="section-icon">🎙️</span>
        <span>Live Transcription</span>
      </h3>

      <div class="section-content">
        <button
          class="btn btn-primary"
          type="button"
          :disabled="isStarting || isSwitchingProvider"
          @click="toggleTranscription"
        >
          <span v-if="isStarting">Starting...</span>
          <span v-else>{{ isTranscribing ? 'Stop transcription' : 'Start transcription' }}</span>
        </button>

        <button
          v-if="transcript.length > 0"
          class="btn btn-secondary"
          type="button"
          @click="downloadTxt"
        >
          Download transcript (.txt)
        </button>

        <p v-if="error || providerError" class="error">
          {{ error?.message || providerError }}
        </p>
      </div>
    </div>

    <!-- Live Preview -->
    <div v-if="isTranscribing || transcript.length > 0" class="settings-section preview-section">
      <h3 class="section-header">
        <span class="section-icon">📄</span>
        <span>Live Preview</span>
      </h3>

      <div class="section-content">
        <div class="preview">
          <div v-if="currentUtterance" class="interim">
            <span class="interim-label">Speaking:</span>
            {{ currentUtterance }}
          </div>
          <pre v-if="transcript.length > 0" class="transcript">{{ transcriptText }}</pre>
          <div v-else class="empty-preview">Transcript will appear here...</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transcription-settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  margin: 0;
}

.section-icon {
  font-size: 1rem;
}

.section-content {
  padding: 0.75rem;
}

.hint {
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.875rem 0;
  gap: 1rem;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-info label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.setting-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.setting-control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.toggle-btn {
  position: relative;
  width: 48px;
  height: 24px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-btn.active {
  background: var(--color-primary);
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-btn.active .toggle-slider {
  transform: translateX(24px);
}

.setting-control {
  min-width: 150px;
  max-width: 200px;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.setting-control:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.setting-control:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.setting-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.setting-item input {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}

.whisper-settings {
  margin: 0.5rem 0;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.whisper-settings .setting-item {
  border-bottom: none;
  padding: 0.5rem 0;
}

.whisper-settings .setting-item:last-child {
  padding-bottom: 0;
}

.whisper-input {
  width: 100%;
  max-width: 100%;
}

.switching-indicator {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
  font-style: italic;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-status {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: background 0.2s;
}

.status-connecting .status-dot {
  background: var(--color-warning, #ffa500);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-connected .status-dot {
  background: var(--color-success, #10b981);
}

.status-error .status-dot {
  background: var(--color-error);
}

.status-disconnected .status-dot {
  background: var(--text-tertiary);
}

.status-text {
  color: var(--text-secondary);
  font-weight: 500;
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

.btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  margin-bottom: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.error {
  margin: 0.75rem 0 0;
  color: var(--color-error);
  font-size: 0.875rem;
}

.preview-section {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.preview {
  max-height: 300px;
  overflow-y: auto;
}

.interim {
  padding: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.interim-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-right: 0.5rem;
}

.empty-preview {
  padding: 2rem;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  font-style: italic;
}

.transcript {
  margin: 0;
  white-space: pre-wrap;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
  font-size: 0.8rem;
  line-height: 1.25;
  color: var(--text-primary);
}
</style>
