<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, watch, inject } from 'vue'
import DialPad from './components/DialPad.vue'
import CallScreen from './components/CallScreen.vue'
import IncomingCall from './components/IncomingCall.vue'
import Settings from './components/Settings.vue'
import SettingsMenu from './components/SettingsMenu.vue'
import CallDetailView from './components/CallDetailView.vue'
import { usePhone } from './composables/usePhone'
import { usePushNotifications } from './composables/usePushNotifications'
import { usePwaInstall } from './composables/usePwaInstall'
import { useTranscription } from 'vuesip'
import { useTranscriptPersistence } from './composables/useTranscriptPersistence'
import { useCallRecording } from './composables/useCallRecording'

// Phone composable
const phone = usePhone()

// Push notifications
const {
  isSupported: pushSupported,
  isPermissionGranted: pushPermissionGranted,
  requestPermission: requestPushPermission,
  showNotification,
} = usePushNotifications()

// PWA install
const { canInstall, promptInstall, isInstalled } = usePwaInstall()

// UI state
const activeTab = ref<'dialpad' | 'history' | 'settings'>('dialpad')
const showIncomingModal = ref(false)
const statusMessage = ref('')
const selectedCallId = ref<string | null>(null)
const showCallDetail = ref(false)
const historySearchQuery = ref('')

// Persistence
const transcriptPersistence = useTranscriptPersistence()
const callRecording = useCallRecording()
const currentCallId = ref<string | null>(null)

// Get transcription instance from TranscriptionSettingsSection via inject
const transcription = inject<ReturnType<typeof useTranscription>>('transcription', null)

// Filtered history with search (metadata only for now - transcript search can be async enhancement)
const filteredHistory = computed(() => {
  const entries = phone.historyEntries.value
  const query = historySearchQuery.value.toLowerCase().trim()

  if (!query) return entries

  // Search through call metadata
  return entries.filter((entry) => {
    const remoteUri = entry.remoteUri?.toLowerCase() || ''
    const remoteName = entry.remoteDisplayName?.toLowerCase() || ''
    const localUri = entry.localUri?.toLowerCase() || ''
    const direction = entry.direction?.toLowerCase() || ''
    const dateStr = new Date(entry.startTime).toLocaleString().toLowerCase()

    return (
      remoteUri.includes(query) ||
      remoteName.includes(query) ||
      localUri.includes(query) ||
      direction.includes(query) ||
      dateStr.includes(query)
    )
  })
})

// Async transcript search (enhancement - searches saved transcripts)
const transcriptSearchResults = ref<Set<string>>(new Set())
const isSearchingTranscripts = ref(false)
let transcriptSearchTimeout: ReturnType<typeof setTimeout> | null = null

watch(historySearchQuery, async (query) => {
  // Clear previous timeout
  if (transcriptSearchTimeout) {
    clearTimeout(transcriptSearchTimeout)
  }

  if (!query.trim() || !transcriptPersistence.persistenceEnabled.value) {
    transcriptSearchResults.value.clear()
    isSearchingTranscripts.value = false
    return
  }

  // Debounce transcript search (search metadata immediately, transcripts after delay)
  transcriptSearchTimeout = setTimeout(async () => {
    isSearchingTranscripts.value = true
    const results = new Set<string>()
    const queryLower = query.toLowerCase()

    try {
      // Check all history entries for matching transcripts
      for (const entry of phone.historyEntries.value) {
        const transcript = await transcriptPersistence.getTranscript(entry.id)
        if (transcript) {
          const transcriptText = transcript
            .map((e) => e.text)
            .join(' ')
            .toLowerCase()
          if (transcriptText.includes(queryLower)) {
            results.add(entry.id)
          }
        }
      }
    } catch (error) {
      console.error('Error searching transcripts:', error)
    } finally {
      transcriptSearchResults.value = results
      isSearchingTranscripts.value = false
    }
  }, 300)
})

// Combined filtered history (metadata + transcript matches)
const finalFilteredHistory = computed(() => {
  const metadataMatches = filteredHistory.value
  const query = historySearchQuery.value.toLowerCase().trim()

  if (!query) return metadataMatches

  // If transcript search found matches, include those even if they didn't match metadata
  if (transcriptSearchResults.value.size > 0) {
    const transcriptMatches = phone.historyEntries.value.filter((entry) =>
      transcriptSearchResults.value.has(entry.id)
    )
    // Combine and deduplicate
    const combined = [...metadataMatches, ...transcriptMatches]
    const unique = combined.filter(
      (entry, index, self) => index === self.findIndex((e) => e.id === entry.id)
    )
    return unique
  }

  return metadataMatches
})

// Check for incoming calls
watch(
  () => phone.callState.value,
  (newState) => {
    if (newState === 'ringing' && phone.direction.value === 'incoming') {
      if (phone.shouldAutoAnswerIncoming.value) {
        // 46elks REST-originate flow: the outbound call is bridged via an incoming
        // call to our WebRTC client; answer automatically.
        void handleAnswer()
        return
      }

      showIncomingModal.value = true
      // Show push notification if app is in background
      if (document.hidden && pushPermissionGranted.value) {
        showNotification('Incoming Call', {
          body: [
            phone.remoteDisplayName.value || phone.remoteUri.value || 'Unknown Caller',
            phone.calledLine.value ? `Line: ${phone.calledLine.value}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          tag: 'incoming-call',
          requireInteraction: true,
        })
      }
    } else if (newState === 'idle' || newState === 'active') {
      showIncomingModal.value = false
    }
  }
)

// Track call ID and manage recording/transcription persistence
watch(
  () => phone.callState.value,
  async (newState, oldState) => {
    // When call becomes active, capture call ID and start recording if enabled
    if (newState === 'active' && oldState !== 'active') {
      const session = phone.session?.value as any
      currentCallId.value = session?.id || null

      // Start recording if persistence is enabled
      // Note: We need to get the combined audio stream from the call session
      // For now, recording is manual - user starts it in settings
      // TODO: Auto-start recording when persistence enabled and call becomes active
    }

    // When call ends, save transcript and recording
    if ((newState === 'idle' || newState === 'terminated') && oldState === 'active') {
      const callId = currentCallId.value
      if (callId) {
        // Save transcript if persistence enabled and transcription instance is available
        if (
          transcription &&
          transcriptPersistence.persistenceEnabled.value &&
          transcription.transcript.value.length > 0
        ) {
          await transcriptPersistence.saveTranscript(callId, transcription.transcript.value)
        }

        // Stop and save recording if active
        if (callRecording.isRecording.value) {
          await callRecording.stopRecording()
        }

        // Clear current call ID
        currentCallId.value = null
      }
    }
  }
)

// Computed
const hasActiveCall = computed(
  () =>
    phone.callState.value === 'active' ||
    phone.callState.value === 'held' ||
    phone.callState.value === 'calling'
)

const showCallScreen = computed(() => hasActiveCall.value)

// Methods
async function handleCall(number: string) {
  try {
    statusMessage.value = ''
    await phone.call(number)
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Call failed'
  }
}

function handleDTMF(digit: string) {
  if (phone.isActive.value) {
    phone.sendDTMF(digit)
  }
}

async function handleAnswer() {
  try {
    await phone.answerCall()
    showIncomingModal.value = false
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Failed to answer'
  }
}

async function handleReject() {
  try {
    await phone.rejectCall()
    showIncomingModal.value = false
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Failed to reject'
  }
}

async function handleEndCall() {
  try {
    await phone.endCall()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Failed to end call'
  }
}

function handleHistoryClick(callId: string) {
  // Check if user wants to view details (long press or click on info icon)
  // For now, single click shows detail view
  selectedCallId.value = callId
  showCallDetail.value = true
}

function handleBackFromDetail() {
  showCallDetail.value = false
  selectedCallId.value = null
}

async function handleConnect(config: any) {
  try {
    statusMessage.value = ''
    await phone.configure(config)
    await phone.connectPhone()
    // Request push permission after connecting
    if (pushSupported.value && !pushPermissionGranted.value) {
      await requestPushPermission()
    }
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Connection failed'
  }
}

async function handleDisconnect() {
  try {
    await phone.disconnectPhone()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Disconnect failed'
  }
}

// Cleanup
onUnmounted(async () => {
  if (phone.isConnected.value) {
    await phone.disconnectPhone()
  }
})

// Handle notification deep links (Phase 3 - SW notification actions)
// URL params: ?notifAction=answer|decline|open&callId=<id>
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const notifAction = params.get('notifAction')
  const callId = params.get('callId')

  if (notifAction) {
    console.debug('[VueSIP] Processing notification action:', { notifAction, callId })

    // Clear the URL params to prevent re-processing on refresh
    const url = new URL(window.location.href)
    url.searchParams.delete('notifAction')
    url.searchParams.delete('callId')
    window.history.replaceState({}, '', url.toString())

    // Process the action
    if (notifAction === 'answer') {
      // If there's an incoming call, answer it
      if (phone.callState.value === 'ringing' && phone.direction.value === 'incoming') {
        handleAnswer()
      } else {
        console.warn('[VueSIP] Answer action but no ringing incoming call')
      }
    } else if (notifAction === 'decline') {
      // If there's an incoming call, reject it
      if (phone.callState.value === 'ringing' && phone.direction.value === 'incoming') {
        handleReject()
      } else {
        console.warn('[VueSIP] Decline action but no ringing incoming call')
      }
    } else if (notifAction === 'open') {
      // Just opened from notification click - show incoming modal if call is ringing
      if (phone.callState.value === 'ringing' && phone.direction.value === 'incoming') {
        showIncomingModal.value = true
      }
    }
  }
})
</script>

<template>
  <div class="app" :class="{ 'dark-mode': true }">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <h1>Softphone</h1>
        <div
          class="status-badge"
          :class="{
            connected: phone.isRegistered.value,
            connecting: phone.isConnecting.value,
          }"
        >
          <span class="status-dot"></span>
          <span class="status-text">
            {{
              phone.isRegistered.value
                ? 'Ready'
                : phone.isConnecting.value
                  ? 'Connecting...'
                  : 'Offline'
            }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-main">
      <!-- Call Screen Overlay -->
      <Transition name="slide-up">
        <CallScreen
          v-if="showCallScreen"
          :call-state="phone.callState.value"
          :is-on-hold="phone.isOnHold.value"
          :is-muted="phone.isMuted.value"
          :is-speaker-on="phone.isSpeakerOn.value"
          :remote-display-name="phone.remoteDisplayName.value"
          :remote-uri="phone.remoteUri.value"
          :duration="phone.duration.value"
          :status-line1="phone.callStatusLine1.value"
          :status-line2="phone.callStatusLine2.value"
          :called-line="phone.calledLine.value"
          @end-call="handleEndCall"
          @toggle-hold="phone.toggleHold"
          @toggle-mute="phone.toggleMute"
          @toggle-speaker="phone.toggleSpeaker"
          @send-dtmf="handleDTMF"
        />
      </Transition>

      <!-- Incoming Call Modal -->
      <Transition name="fade">
        <IncomingCall
          v-if="showIncomingModal"
          :caller-name="phone.remoteDisplayName.value || 'Unknown'"
          :caller-number="phone.remoteUri.value || ''"
          :called-line="phone.calledLine.value"
          @answer="handleAnswer"
          @reject="handleReject"
        />
      </Transition>

      <!-- Configuration View (when not connected) -->
      <div v-if="!phone.isConnected.value" class="config-view">
        <Settings
          :is-connecting="phone.isConnecting.value"
          :error-message="statusMessage"
          @connect="handleConnect"
        />

        <!-- PWA Install Prompt -->
        <div v-if="canInstall && !isInstalled" class="install-prompt">
          <button class="install-button" @click="promptInstall">
            <svg
              class="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            Install App
          </button>
        </div>
      </div>

      <!-- Main Phone Interface (when connected, no active call) -->
      <div v-else-if="!showCallScreen" class="phone-interface">
        <!-- Tab Content -->
        <div class="tab-content">
          <DialPad
            v-if="activeTab === 'dialpad'"
            :outbound-primary="phone.outboundPrimary.value"
            :outbound-secondary="phone.outboundSecondary.value"
            :outbound-title="phone.outboundTitle.value"
            :can-cycle-outbound="phone.canCycleOutbound.value"
            @cycle-outbound="phone.cycleOutbound"
            @call="handleCall"
            @digit="handleDTMF"
          />

          <div v-else-if="activeTab === 'history' && !showCallDetail" class="history-view">
            <!-- Search Bar -->
            <div class="history-search">
              <svg
                class="search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                v-model="historySearchQuery"
                type="text"
                placeholder="Search calls..."
                class="search-input"
              />
              <button
                v-if="historySearchQuery"
                class="clear-search-btn"
                @click="historySearchQuery = ''"
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="phone.historyEntries.value.length === 0" class="empty-state">
              <svg
                class="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No recent calls</p>
            </div>
            <div v-else-if="finalFilteredHistory.length === 0" class="empty-state">
              <svg
                class="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p>No calls match "{{ historySearchQuery }}"</p>
              <p v-if="isSearchingTranscripts" class="searching-hint">Searching transcripts...</p>
            </div>
            <div
              v-if="isSearchingTranscripts && finalFilteredHistory.length > 0"
              class="search-status"
            >
              <span class="search-status-text">Searching transcripts...</span>
            </div>
            <ul v-else class="history-list">
              <li
                v-for="entry in finalFilteredHistory"
                :key="entry.id"
                class="history-item"
                @click="handleHistoryClick(entry.id)"
              >
                <div class="history-icon" :class="entry.direction">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path v-if="entry.direction === 'outgoing'" d="M5 19l14-14M12 5h7v7" />
                    <path v-else d="M19 5L5 19M5 12V5h7" />
                  </svg>
                </div>
                <div class="history-details">
                  <span class="history-name">{{ entry.remoteDisplayName || entry.remoteUri }}</span>
                  <span class="history-time">{{ new Date(entry.startTime).toLocaleString() }}</span>
                </div>
                <span class="history-duration">{{ formatDuration(entry.duration) }}</span>
              </li>
            </ul>
            <button
              v-if="phone.historyEntries.value.length > 0"
              class="clear-history-btn"
              @click="phone.clearHistory"
            >
              Clear History
            </button>
          </div>

          <!-- Call Detail View -->
          <CallDetailView
            v-else-if="activeTab === 'history' && showCallDetail && selectedCallId"
            :call-id="selectedCallId"
            @back="handleBackFromDetail"
          />

          <div v-else-if="activeTab === 'settings'" class="settings-view">
            <SettingsMenu
              :is-connected="phone.isConnected.value"
              :accounts="phone.accounts.value"
              :outbound-account-id="phone.outboundAccountId.value"
              :audio-input-devices="phone.audioInputDevices.value"
              :audio-output-devices="phone.audioOutputDevices.value"
              :selected-audio-input-id="phone.selectedAudioInputId.value"
              :selected-audio-output-id="phone.selectedAudioOutputId.value"
              :push-permission-granted="pushPermissionGranted"
              :current-provider-id="phone.currentConfig.value?.providerId"
              @disconnect="handleDisconnect"
              :on-set-outbound-account="(id) => phone.setOutboundAccount(id)"
              :on-select-audio-input="(id) => phone.selectAudioInput(id)"
              :on-select-audio-output="(id) => phone.selectAudioOutput(id)"
              :on-refresh46-elks-preferences="phone.refresh46ElksOutboundPreferences"
            />
          </div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav">
          <button
            class="nav-item"
            :class="{ active: activeTab === 'dialpad' }"
            @click="activeTab = 'dialpad'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="6" height="6" rx="1" />
              <rect x="9" y="3" width="6" height="6" rx="1" />
              <rect x="15" y="3" width="6" height="6" rx="1" />
              <rect x="3" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
              <rect x="15" y="9" width="6" height="6" rx="1" />
              <rect x="3" y="15" width="6" height="6" rx="1" />
              <rect x="9" y="15" width="6" height="6" rx="1" />
              <rect x="15" y="15" width="6" height="6" rx="1" />
            </svg>
            <span>Dialpad</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeTab === 'history' }"
            @click="activeTab = 'history'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>
          <button
            class="nav-item"
            :class="{ active: activeTab === 'settings' }"
            @click="activeTab = 'settings'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Settings</span>
          </button>
        </nav>
      </div>

      <!-- Error Message -->
      <div v-if="statusMessage" class="error-toast">
        {{ statusMessage }}
      </div>
    </main>
  </div>
</template>

<script lang="ts">
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--bg-tertiary);
  font-size: 0.75rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
}

.status-badge.connected .status-dot {
  background: var(--color-success);
}

.status-badge.connecting .status-dot {
  background: var(--color-warning);
  animation: pulse 1s infinite;
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

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  position: relative;
}

.config-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.install-prompt {
  margin-top: auto;
  padding: 1rem;
}

.install-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.install-button:hover {
  background: var(--color-primary-dark);
}

.install-button .icon {
  width: 20px;
  height: 20px;
}

.phone-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

/* History View */
.history-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.history-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
}

.search-icon {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-right: 0.5rem;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.clear-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.clear-search-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.clear-search-btn svg {
  width: 16px;
  height: 16px;
}

.search-status {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-align: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: 0.5rem;
}

.search-status-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.search-status-text::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--text-secondary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.empty-state .icon {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s;
}

.history-item:hover {
  background: var(--bg-secondary);
}

.history-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
}

.history-icon svg {
  width: 20px;
  height: 20px;
}

.history-icon.outgoing {
  color: var(--color-success);
}

.history-icon.incoming {
  color: var(--color-primary);
}

.history-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.history-name {
  font-weight: 500;
}

.history-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.history-duration {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.clear-history-btn {
  margin-top: 1rem;
  padding: 0.75rem;
  background: transparent;
  color: var(--color-error);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-history-btn:hover {
  background: var(--color-error);
  color: white;
}

/* Settings View */
.settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.settings-tab {
  flex: 1;
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-tab:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.settings-tab.active {
  background: var(--color-primary);
  color: white;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.settings-section h3 {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-weight: 500;
}

.setting-item select {
  flex: 1;
  max-width: 200px;
  padding: 0.5rem;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge.active {
  background: var(--color-success);
  color: white;
}

.disconnect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem;
  background: var(--color-error);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.disconnect-btn:hover {
  opacity: 0.9;
}

.disconnect-btn .icon {
  width: 20px;
  height: 20px;
}

/* Bottom Navigation */
.bottom-nav {
  display: flex;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 0.5rem;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom, 0));
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.nav-item:hover,
.nav-item.active {
  color: var(--color-primary);
}

.nav-item svg {
  width: 24px;
  height: 24px;
}

.nav-item span {
  font-size: 0.75rem;
  font-weight: 500;
}

/* Error Toast */
.error-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  background: var(--color-error);
  color: white;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
