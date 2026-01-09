<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useSipClient, useCallSession, useTranscription } from 'vuesip'

// SIP Configuration (can be overridden via form)
const sipConfig = ref({
  uri: import.meta.env.VITE_SIP_URI || '',
  sipUri: import.meta.env.VITE_SIP_USER || '',
  password: import.meta.env.VITE_SIP_PASSWORD || '',
  displayName: import.meta.env.VITE_SIP_DISPLAY_NAME || 'VueSip User',
})

// SIP Client
const {
  connect,
  disconnect,
  isConnected,
  isRegistered,
  error: sipError,
  isConnecting,
  updateConfig,
  getClient,
} = useSipClient()

// Get SIP client ref for useCallSession
const sipClientRef = computed(() => getClient())

// Call Session (with built-in DTMF support)
const {
  makeCall,
  hangup,
  answer,
  state: callState,
  isActive,
  remoteUri,
  remoteDisplayName,
  duration,
  sendDTMF,
} = useCallSession(sipClientRef)

// Transcription - auto-starts with call
const {
  isTranscribing,
  transcript,
  currentUtterance,
  start: startTranscription,
  stop: stopTranscription,
  clear: clearTranscription,
  exportTranscript,
} = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
  localName: 'Me',
  remoteName: 'Caller',
})

// UI State
const targetNumber = ref('')
const showConfig = ref(true)
const statusMessage = ref('')
const sendingDtmf = ref(false)
const showTranscript = ref(true)

// Computed
const isConfigured = computed(
  () => sipConfig.value.uri && sipConfig.value.sipUri && sipConfig.value.password
)

const formattedDuration = computed(() => {
  const mins = Math.floor(duration.value / 60)
  const secs = duration.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const statusText = computed(() => {
  if (sipError.value) return `Error: ${sipError.value.message}`
  if (isConnecting.value) return 'Connecting...'
  if (!isConnected.value) return 'Disconnected'
  if (!isRegistered.value) return 'Connected, registering...'
  return 'Ready'
})

// DTMF Keypad
const dtmfKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Auto-start/stop transcription with call
watch(isActive, async (active) => {
  if (active && !isTranscribing.value) {
    try {
      await startTranscription()
    } catch (err) {
      console.error('Transcription failed:', err)
    }
  } else if (!active && isTranscribing.value) {
    stopTranscription()
  }
})

// Methods
function handleExportTranscript() {
  const content = exportTranscript('txt')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcript-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
async function handleConnect() {
  try {
    statusMessage.value = 'Connecting...'

    // Update configuration before connecting
    updateConfig({
      uri: sipConfig.value.uri,
      sipUri: sipConfig.value.sipUri,
      password: sipConfig.value.password,
      displayName: sipConfig.value.displayName,
    })

    await connect()
    showConfig.value = false
    statusMessage.value = ''
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Connection failed'
  }
}

async function handleDisconnect() {
  try {
    await disconnect()
    showConfig.value = true
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Disconnect failed'
  }
}

async function handleCall() {
  if (!targetNumber.value) return
  try {
    await makeCall(targetNumber.value)
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Call failed'
  }
}

async function handleHangup() {
  try {
    await hangup()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Hangup failed'
  }
}

async function handleAnswer() {
  try {
    await answer()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Answer failed'
  }
}

async function handleDTMF(digit: string) {
  try {
    sendingDtmf.value = true
    await sendDTMF(digit)
    setTimeout(() => {
      sendingDtmf.value = false
    }, 200)
  } catch (err) {
    sendingDtmf.value = false
    console.error('DTMF error:', err)
  }
}

// Cleanup
onUnmounted(async () => {
  if (isConnected.value) {
    await disconnect()
  }
})
</script>

<template>
  <div class="app">
    <header>
      <h1>VueSip Minimal</h1>
      <div class="status" :class="{ connected: isRegistered }">
        {{ statusText }}
      </div>
    </header>

    <!-- Configuration Panel -->
    <section v-if="showConfig" class="config-panel">
      <h2>SIP Configuration</h2>
      <form @submit.prevent="handleConnect">
        <div class="form-group">
          <label for="uri">WebSocket URI</label>
          <input
            id="uri"
            v-model="sipConfig.uri"
            type="text"
            placeholder="wss://sip.example.com:8089/ws"
            required
          />
        </div>
        <div class="form-group">
          <label for="sipUri">SIP URI</label>
          <input
            id="sipUri"
            v-model="sipConfig.sipUri"
            type="text"
            placeholder="sip:1000@example.com"
            required
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="sipConfig.password"
            type="password"
            placeholder="Your SIP password"
            required
          />
        </div>
        <div class="form-group">
          <label for="displayName">Display Name</label>
          <input
            id="displayName"
            v-model="sipConfig.displayName"
            type="text"
            placeholder="Your Name"
          />
        </div>
        <button type="submit" :disabled="!isConfigured || isConnecting">
          {{ isConnecting ? 'Connecting...' : 'Connect' }}
        </button>
      </form>
      <p v-if="statusMessage" class="error">{{ statusMessage }}</p>
    </section>

    <!-- Call Panel -->
    <section v-else class="call-panel">
      <div class="call-info">
        <div v-if="isActive" class="active-call">
          <div class="remote-party">
            {{ remoteDisplayName || remoteUri || 'Unknown' }}
          </div>
          <div class="call-duration">{{ formattedDuration }}</div>
          <div class="call-state">{{ callState }}</div>
        </div>
        <div v-else-if="callState === 'ringing'" class="incoming-call">
          <div class="remote-party">
            Incoming: {{ remoteDisplayName || remoteUri || 'Unknown' }}
          </div>
          <div class="call-actions">
            <button class="answer-btn" @click="handleAnswer">Answer</button>
            <button class="hangup-btn" @click="handleHangup">Decline</button>
          </div>
        </div>
      </div>

      <!-- Dial Pad -->
      <div v-if="!isActive && callState !== 'ringing'" class="dial-section">
        <input
          v-model="targetNumber"
          type="tel"
          placeholder="Enter number or SIP URI"
          class="dial-input"
          @keyup.enter="handleCall"
        />
        <button class="call-btn" :disabled="!targetNumber" @click="handleCall">Call</button>
      </div>

      <!-- DTMF Keypad (shown during active call) -->
      <div v-if="isActive" class="dtmf-keypad">
        <button
          v-for="key in dtmfKeys"
          :key="key"
          class="dtmf-key"
          :class="{ playing: sendingDtmf }"
          @click="handleDTMF(key)"
        >
          {{ key }}
        </button>
      </div>

      <!-- Transcript (shown during active call) -->
      <div v-if="isActive && showTranscript" class="transcript-section">
        <div class="transcript-header">
          <span class="transcript-title">
            Transcript
            <span v-if="isTranscribing" class="live-indicator">LIVE</span>
          </span>
          <div class="transcript-actions">
            <button
              type="button"
              class="transcript-btn"
              :disabled="transcript.length === 0"
              @click="handleExportTranscript"
            >
              Export
            </button>
            <button
              type="button"
              class="transcript-btn"
              :disabled="transcript.length === 0"
              @click="clearTranscription"
            >
              Clear
            </button>
            <button type="button" class="transcript-btn" @click="showTranscript = false">
              Hide
            </button>
          </div>
        </div>
        <div class="transcript-entries">
          <div
            v-for="entry in transcript"
            :key="entry.id"
            :class="['transcript-entry', `speaker-${entry.speaker}`]"
          >
            <span class="entry-speaker">{{ entry.participantName || entry.speaker }}</span>
            <span class="entry-text">{{ entry.text }}</span>
          </div>
          <div v-if="currentUtterance" class="transcript-entry interim">
            <span class="entry-speaker">...</span>
            <span class="entry-text">{{ currentUtterance }}</span>
          </div>
          <div v-if="transcript.length === 0 && !currentUtterance" class="transcript-empty">
            Transcript will appear here...
          </div>
        </div>
      </div>
      <button
        v-if="isActive && !showTranscript"
        type="button"
        class="show-transcript-btn"
        @click="showTranscript = true"
      >
        Show Transcript
      </button>

      <!-- Hangup Button -->
      <button v-if="isActive" class="hangup-btn" @click="handleHangup">Hang Up</button>

      <!-- Disconnect Button -->
      <button class="disconnect-btn" @click="handleDisconnect">Disconnect</button>

      <p v-if="statusMessage" class="error">{{ statusMessage }}</p>
    </section>

    <!-- Audio Elements -->
    <audio ref="remoteAudio" autoplay />
  </div>
</template>

<style scoped>
.app {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  margin: 0 0 10px;
  font-size: 24px;
}

.status {
  padding: 8px 16px;
  border-radius: 20px;
  background: #fee;
  color: #c00;
  font-size: 14px;
}

.status.connected {
  background: #efe;
  color: #060;
}

.config-panel,
.call-panel {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 12px;
}

h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #007bff;
}

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button[type='submit'],
.call-btn {
  background: #007bff;
  color: white;
}

button[type='submit']:hover:not(:disabled),
.call-btn:hover:not(:disabled) {
  background: #0056b3;
}

.hangup-btn {
  background: #dc3545;
  color: white;
  margin-top: 12px;
}

.hangup-btn:hover {
  background: #c82333;
}

.answer-btn {
  background: #28a745;
  color: white;
  flex: 1;
}

.answer-btn:hover {
  background: #218838;
}

.disconnect-btn {
  background: #6c757d;
  color: white;
  margin-top: 12px;
}

.disconnect-btn:hover {
  background: #5a6268;
}

.error {
  color: #dc3545;
  font-size: 14px;
  margin-top: 12px;
}

.call-info {
  margin-bottom: 20px;
}

.active-call,
.incoming-call {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
}

.remote-party {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.call-duration {
  font-size: 32px;
  font-family: monospace;
  margin-bottom: 8px;
}

.call-state {
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
}

.call-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.dial-section {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.dial-input {
  flex: 1;
}

.dial-section .call-btn {
  width: auto;
  padding: 12px 24px;
}

.dtmf-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.dtmf-key {
  padding: 16px;
  font-size: 20px;
  font-weight: 600;
  background: white;
  border: 1px solid #ddd;
  width: auto;
}

.dtmf-key:hover {
  background: #e9ecef;
}

.dtmf-key.playing {
  background: #007bff;
  color: white;
}

/* Transcript Styles */
.transcript-section {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.transcript-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.transcript-title {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-indicator {
  padding: 2px 6px;
  background: #28a745;
  color: white;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.transcript-actions {
  display: flex;
  gap: 4px;
}

.transcript-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  width: auto;
}

.transcript-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.transcript-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.transcript-entries {
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transcript-entry {
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 13px;
}

.speaker-local {
  background: #e3f2fd;
  margin-left: 20px;
}

.speaker-remote {
  background: #f5f5f5;
  margin-right: 20px;
}

.interim {
  opacity: 0.6;
  font-style: italic;
}

.entry-speaker {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  display: block;
  margin-bottom: 2px;
  color: #666;
}

.entry-text {
  display: block;
}

.transcript-empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 16px;
}

.show-transcript-btn {
  background: #f5f5f5;
  border: 1px solid #ddd;
  margin-bottom: 12px;
  font-size: 14px;
}

.show-transcript-btn:hover {
  background: #e9ecef;
}
</style>
