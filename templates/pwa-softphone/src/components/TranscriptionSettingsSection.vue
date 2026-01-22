<script setup lang="ts">
import { computed, ref, provide, onMounted, watch } from 'vue'
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

// Check browser compatibility
const isWebSocketSupported = typeof WebSocket !== 'undefined'

// Register Whisper provider on mount
onMounted(() => {
  if (!providerRegistry.has('whisper')) {
    providerRegistry.register('whisper', () => new WhisperProvider())
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

// Watch Whisper settings
watch([whisperUrl, whisperModel], () => {
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
      return
    }
  }

  // Check browser support for Whisper
  if (provider.value === 'whisper' && !isWebSocketSupported) {
    providerError.value = 'WebSocket is not supported in this browser. Please use Web Speech API.'
    provider.value = 'web-speech' // Revert selection
    return
  }

  isSwitchingProvider.value = true

  if (isTranscribing.value) {
    // Stop current transcription before switching
    stop()
  }

  // Clear all error states
  providerError.value = null
  // Note: transcription.error is a ComputedRef, so we can't directly clear it
  // It will be cleared when the provider successfully switches

  try {
    if (provider.value === 'whisper') {
      await switchProvider('whisper', {
        serverUrl: whisperUrl.value,
        model: whisperModel.value,
        language: 'en', // Whisper uses ISO language codes
      })
    } else {
      await switchProvider('web-speech', {
        language: language.value,
      })
    }
  } catch (err) {
    providerError.value = err instanceof Error ? err.message : 'Failed to switch provider'
    console.error('Provider switch error:', err)
    // Optionally revert provider on failure (commented out to let user see error)
    // provider.value = currentProvider.value
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
      if (providerError.value) {
        return
      }
    }

    await start()
    // Clear errors on successful start
    providerError.value = null
  } catch (err) {
    providerError.value = err instanceof Error ? err.message : 'Failed to start transcription'
    console.error('Start transcription error:', err)
  } finally {
    isStarting.value = false
  }
}

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
  <section class="settings-section">
    <h3>Transcription (beta)</h3>

    <p class="hint">{{ providerHint }}</p>

    <div class="setting-item">
      <label>Provider</label>
      <select
        v-model="provider"
        :disabled="isTranscribing || isSwitchingProvider"
        @change="applyProviderChange"
      >
        <option value="web-speech">Web Speech API</option>
        <option value="whisper" :disabled="!isWebSocketSupported">
          Whisper Server{{ !isWebSocketSupported ? ' (not supported)' : '' }}
        </option>
      </select>
      <span v-if="isSwitchingProvider" class="switching-indicator">Switching...</span>
    </div>

    <!-- Whisper Settings (shown when Whisper is selected) -->
    <div v-if="showWhisperSettings" class="whisper-settings">
      <div class="setting-item">
        <label for="whisper-url">Server URL</label>
        <input
          id="whisper-url"
          v-model="whisperUrl"
          type="text"
          placeholder="ws://localhost:8765/transcribe"
          :disabled="isTranscribing"
          class="whisper-input"
        />
      </div>

      <div class="setting-item">
        <label for="whisper-model">Model</label>
        <select
          id="whisper-model"
          v-model="whisperModel"
          :disabled="isTranscribing"
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
      <label>Language</label>
      <select v-model="language" :disabled="isTranscribing">
        <option value="en-US">English (US)</option>
        <option value="en-GB">English (UK)</option>
        <option value="sv-SE">Swedish</option>
        <option value="es-ES">Spanish</option>
        <option value="fr-FR">French</option>
        <option value="de-DE">German</option>
      </select>
    </div>

    <button
      class="btn"
      type="button"
      :disabled="isStarting || isSwitchingProvider"
      @click="toggleTranscription"
    >
      <span v-if="isStarting">Starting...</span>
      <span v-else>{{ isTranscribing ? 'Stop transcription' : 'Start transcription' }}</span>
    </button>

    <button v-if="transcript.length > 0" class="btn secondary" type="button" @click="downloadTxt">
      Download transcript (.txt)
    </button>

    <div class="setting-item">
      <div class="setting-info">
        <label for="transcript-persistence-toggle">Save Transcripts</label>
        <p class="setting-description">
          Automatically save transcripts to your device when calls end. Transcripts are linked to
          call history.
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
        <p class="setting-description">
          Automatically save call recordings to your device when calls end. Recordings are linked to
          call history.
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

    <p v-if="error || providerError" class="error">
      {{ error?.message || providerError }}
    </p>

    <div v-if="isTranscribing || transcript.length > 0" class="preview">
      <div class="preview-title">Live</div>
      <div v-if="currentUtterance" class="interim">{{ currentUtterance }}</div>
      <pre class="transcript">{{ transcriptText }}</pre>
    </div>
  </section>
</template>

<style scoped>
.hint {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item label {
  font-weight: 500;
}

.setting-info {
  flex: 1;
  margin-right: 1rem;
}

.setting-info label {
  display: block;
  margin-bottom: 0.25rem;
}

.setting-description {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
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

.setting-item select,
.setting-item input {
  flex: 1;
  max-width: 200px;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
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

.btn {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
}

.btn.secondary {
  background: transparent;
}

.error {
  margin: 0.75rem 0 0;
  color: var(--color-error);
  font-size: 0.875rem;
}

.preview {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
}

.preview-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.interim {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
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
