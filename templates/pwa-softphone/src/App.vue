<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import DialPad from './components/DialPad.vue'
import CallScreen from './components/CallScreen.vue'
import IncomingCall from './components/IncomingCall.vue'
import Settings from './components/Settings.vue'
import Elks46OutboundSettings from './components/Elks46OutboundSettings.vue'
import TranscriptionSettingsSection from './components/TranscriptionSettingsSection.vue'
import { usePhone } from './composables/usePhone'
import { usePushNotifications } from './composables/usePushNotifications'
import { usePwaInstall } from './composables/usePwaInstall'

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
const settingsSubTab = ref<'general' | 'transcription'>('general')
const showIncomingModal = ref(false)
const statusMessage = ref('')

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

          <div v-else-if="activeTab === 'history'" class="history-view">
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
            <ul v-else class="history-list">
              <li
                v-for="entry in phone.historyEntries.value"
                :key="entry.id"
                class="history-item"
                @click="handleCall(entry.remoteUri)"
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

          <div v-else-if="activeTab === 'settings'" class="settings-view">
            <!-- Settings Sub-Tabs -->
            <div class="settings-tabs">
              <button
                class="settings-tab"
                :class="{ active: settingsSubTab === 'general' }"
                @click="settingsSubTab = 'general'"
              >
                General
              </button>
              <button
                class="settings-tab"
                :class="{ active: settingsSubTab === 'transcription' }"
                @click="settingsSubTab = 'transcription'"
              >
                Transcription
              </button>
            </div>

            <!-- General Settings -->
            <div v-if="settingsSubTab === 'general'" class="settings-content">
              <Elks46OutboundSettings
                v-if="phone.currentConfig.value?.providerId === '46elks'"
                :is-connected="phone.isConnected.value"
                @updated="phone.refresh46ElksOutboundPreferences"
              />

              <div v-if="phone.accounts.value.length > 0" class="settings-section">
                <h3>Accounts</h3>
                <div class="setting-item">
                  <label>Outbound Account</label>
                  <select
                    :value="phone.outboundAccountId.value || ''"
                    @change="(e) => phone.setOutboundAccount((e.target as HTMLSelectElement).value)"
                  >
                    <option v-for="acc in phone.accounts.value" :key="acc.id" :value="acc.id">
                      {{ acc.name }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="settings-section">
                <h3>Audio Devices</h3>

                <div class="setting-item">
                  <label>Microphone</label>
                  <select
                    :value="phone.selectedAudioInputId.value"
                    @change="(e) => phone.selectAudioInput((e.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="device in phone.audioInputDevices.value"
                      :key="device.deviceId"
                      :value="device.deviceId"
                    >
                      {{ device.label || 'Microphone ' + device.deviceId.slice(0, 8) }}
                    </option>
                  </select>
                </div>

                <div class="setting-item">
                  <label>Speaker</label>
                  <select
                    :value="phone.selectedAudioOutputId.value"
                    @change="(e) => phone.selectAudioOutput((e.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="device in phone.audioOutputDevices.value"
                      :key="device.deviceId"
                      :value="device.deviceId"
                    >
                      {{ device.label || 'Speaker ' + device.deviceId.slice(0, 8) }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="settings-section">
                <h3>Notifications</h3>
                <div class="setting-item">
                  <span>Push Notifications</span>
                  <span class="badge" :class="{ active: pushPermissionGranted }">
                    {{ pushPermissionGranted ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              </div>

              <button class="disconnect-btn" @click="handleDisconnect">
                <svg
                  class="icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Disconnect
              </button>
            </div>

            <!-- Transcription Settings -->
            <div v-else-if="settingsSubTab === 'transcription'" class="settings-content">
              <TranscriptionSettingsSection />
            </div>
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
