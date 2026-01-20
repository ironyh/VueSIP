<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import Card from 'primevue/card'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Dialpad from './components/Dialpad.vue'
import CallControls from './components/CallControls.vue'
import CallHistory from './components/CallHistory.vue'
import DeviceSettings from './components/DeviceSettings.vue'
import Elks46ApiLogin from './components/Elks46ApiLogin.vue'
import TelnyxApiLogin from './components/TelnyxApiLogin.vue'
import TranscriptView from './components/TranscriptView.vue'
import RecordingControls from './components/RecordingControls.vue'
import { usePhone } from './composables/usePhone'
import { useProviderSelector, version } from 'vuesip'
import type { ProviderConfig } from 'vuesip'
import {
  ensurePermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  createNotificationManager,
} from 'vuesip'

// Phone composable
const phone = usePhone()

// Provider selector composable
const {
  providers,
  selectedProvider,
  credentials,
  isConfigured,
  selectProvider,
  updateCredential,
  saveCredentials,
  clearCredentials,
  getSipConfig,
} = useProviderSelector({
  storage: 'local',
  defaultProvider: 'own-pbx',
})

// UI state
const showTransferDialog = ref(false)
const transferTarget = ref('')
const activeTab = ref(0)
const statusMessage = ref('')
const notificationsEnabled = ref(isNotificationsEnabled())
const swNotificationsEnabled = ref(false)
const notifManager = createNotificationManager({ strategy: 'auto' })

// Load SW flag
try {
  swNotificationsEnabled.value = localStorage.getItem('vuesip_sw_notifications_enabled') === 'true'
} catch {}

// Auto-save credentials with debounce when form values change
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => ({ ...credentials }),
  () => {
    // Clear existing timer
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
    }
    // Debounce save by 500ms to avoid excessive writes
    saveDebounceTimer = setTimeout(() => {
      if (selectedProvider.value) {
        saveCredentials()
      }
    }, 500)
  },
  { deep: true }
)

// Device selection persistence
const DEVICE_STORAGE_KEY = 'vuesip_device_preferences'

interface DevicePreferences {
  audioInputId: string | null
  audioOutputId: string | null
}

function saveDevicePreferences() {
  const prefs: DevicePreferences = {
    audioInputId: phone.selectedAudioInputId.value,
    audioOutputId: phone.selectedAudioOutputId.value,
  }
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Storage might be full or disabled
  }
}

function loadDevicePreferences(): DevicePreferences | null {
  try {
    const data = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (data) {
      return JSON.parse(data) as DevicePreferences
    }
  } catch {
    // Invalid JSON or storage error
  }
  return null
}

// Restore device preferences when devices become available
watch(
  () => phone.audioInputDevices.value.length,
  (newLength) => {
    if (newLength > 0) {
      const prefs = loadDevicePreferences()
      if (prefs) {
        // Restore audio input if the device still exists
        if (prefs.audioInputId) {
          const deviceExists = phone.audioInputDevices.value.some(
            (d) => d.deviceId === prefs.audioInputId
          )
          if (deviceExists) {
            phone.selectAudioInput(prefs.audioInputId)
          }
        }
        // Restore audio output if the device still exists
        if (prefs.audioOutputId) {
          const deviceExists = phone.audioOutputDevices.value.some(
            (d) => d.deviceId === prefs.audioOutputId
          )
          if (deviceExists) {
            phone.selectAudioOutput(prefs.audioOutputId)
          }
        }
      }
    }
  },
  { immediate: true }
)

// API login state
const use46ElksApiLogin = ref(true) // Show API login by default for 46 elks
const useTelnyxApiLogin = ref(true) // Show API login by default for Telnyx

// Check if current provider is 46 elks or Telnyx
const is46ElksProvider = computed(() => selectedProvider.value?.id === '46elks')
const isTelnyxProvider = computed(() => selectedProvider.value?.id === 'telnyx')

// Handle provider change from dropdown
function handleProviderChange(provider: ProviderConfig) {
  selectProvider(provider.id)
  // Reset API login preferences when switching providers
  use46ElksApiLogin.value = true
  useTelnyxApiLogin.value = true
}

// Handle credentials from 46 elks API login
function handle46ElksCredentials(creds: { phoneNumber: string; secret: string }) {
  // Auto-fill the credentials from API
  updateCredential('phoneNumber', creds.phoneNumber)
  updateCredential('secret', creds.secret)
  // Save credentials immediately for persistence across refreshes
  saveCredentials()
  // Switch to showing the filled form (ready to connect)
  use46ElksApiLogin.value = false
}

// Handle credentials from Telnyx API login
function handleTelnyxCredentials(creds: { username: string; password: string }) {
  // Auto-fill the credentials from API
  updateCredential('username', creds.username)
  updateCredential('password', creds.password)
  // Save credentials immediately for persistence across refreshes
  saveCredentials()
  // Switch to showing the filled form (ready to connect)
  useTelnyxApiLogin.value = false
}

// Switch to manual entry for 46 elks
function handleUseManual46Elks() {
  use46ElksApiLogin.value = false
}

// Switch to manual entry for Telnyx
function handleUseManualTelnyx() {
  useTelnyxApiLogin.value = false
}

// Device selection with persistence
function handleSelectAudioInput(deviceId: string) {
  phone.selectAudioInput(deviceId)
  saveDevicePreferences()
}

function handleSelectAudioOutput(deviceId: string) {
  phone.selectAudioOutput(deviceId)
  saveDevicePreferences()
}

// Check if all required fields are filled
const isFormValid = computed(() => isConfigured.value)

const hasActiveCall = computed(
  () =>
    phone.callState.value === 'active' ||
    phone.callState.value === 'held' ||
    phone.callState.value === 'ringing' ||
    phone.callState.value === 'calling'
)

// Methods
async function handleConnect() {
  try {
    statusMessage.value = ''
    // Save credentials to storage before connecting
    saveCredentials()
    // Get SIP config from provider selector
    const sipConfig = getSipConfig()
    if (!sipConfig) {
      statusMessage.value = 'Invalid configuration'
      return
    }
    await phone.configure(sipConfig)
    await phone.connectPhone()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Connection failed'
  }
}

async function enableNotifications() {
  const granted = await ensurePermission(true)
  setNotificationsEnabled(granted)
  notificationsEnabled.value = granted
}

function disableNotifications() {
  setNotificationsEnabled(false)
  notificationsEnabled.value = false
}

async function enableSwNotifications() {
  try {
    localStorage.setItem('vuesip_sw_notifications_enabled', 'true')
    swNotificationsEnabled.value = true
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/sw.js')
    }
    if (notificationsEnabled.value === false) {
      await enableNotifications()
    }
  } catch {}
}

async function disableSwNotifications() {
  try {
    localStorage.setItem('vuesip_sw_notifications_enabled', 'false')
    swNotificationsEnabled.value = false
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      await reg?.unregister()
    }
  } catch {}
}

async function handleDisconnect() {
  try {
    await phone.disconnectPhone()
    // Keep credentials saved - user can manually clear via clearCredentials() if needed
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Disconnect failed'
  }
}

async function handleCall(number: string) {
  try {
    await phone.call(number)
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Call failed'
  }
}

async function handleDTMF(digit: string) {
  if (phone.isActive.value) {
    try {
      await phone.sendDTMF(digit)
    } catch (err) {
      console.error('DTMF error:', err)
    }
  }
}

// Notify on incoming ringing
watch(
  () => ({
    state: phone.callState.value,
    dir: phone.direction.value,
    name: phone.remoteDisplayName.value,
    uri: phone.remoteUri.value,
  }),
  async ({ state, dir, name, uri }) => {
    if (!notificationsEnabled.value) return
    if (state === 'ringing' && dir === 'incoming') {
      const display = name || uri || 'Unknown'
      await notifManager.notifyIncomingCall({
        title: 'Incoming call',
        body: `From ${display}`,
        icon: '/logo.svg',
      })
    }
  }
)

// Handle deep-link actions from SW notification
try {
  const params = new URLSearchParams(window.location.search)
  const notifAction = params.get('notifAction')
  if (notifAction === 'answer') {
    setTimeout(() => {
      if (phone.callState.value === 'ringing') phone.answerCall()
    }, 0)
  } else if (notifAction === 'decline') {
    setTimeout(() => {
      if (phone.callState.value === 'ringing') phone.rejectCall()
    }, 0)
  }
} catch {}

function handleTransferClick() {
  transferTarget.value = ''
  showTransferDialog.value = true
}

async function handleTransfer() {
  // Transfer functionality would be implemented here
  // For now, just close the dialog
  showTransferDialog.value = false
  statusMessage.value = 'Transfer not yet implemented'
}

// Cleanup
onUnmounted(async () => {
  // Clear debounce timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }
  if (phone.isConnected.value) {
    await phone.disconnectPhone()
  }
})
</script>

<template>
  <div class="softphone">
    <Card class="phone-card">
      <template #header>
        <div class="phone-header">
          <h1>VueSip Softphone</h1>
          <div
            class="status-indicator"
            :class="{
              connected: phone.isRegistered.value,
              connecting: phone.isConnecting.value,
            }"
          >
            <i class="pi pi-circle-fill" />
            <span>
              {{
                phone.isRegistered.value
                  ? 'Ready'
                  : phone.isConnecting.value
                    ? 'Connecting...'
                    : 'Disconnected'
              }}
            </span>
          </div>
        </div>
      </template>

      <template #content>
        <!-- Configuration Panel with Provider Selector -->
        <div v-if="!phone.isConnected.value" class="config-panel">
          <h2>Connect to SIP Server</h2>
          <form @submit.prevent="handleConnect">
            <!-- Provider Selector Dropdown -->
            <div class="form-field">
              <label for="provider">Provider</label>
              <Dropdown
                id="provider"
                :model-value="selectedProvider"
                :options="providers"
                option-label="name"
                placeholder="Select a provider"
                class="w-full"
                @update:model-value="handleProviderChange"
              />
            </div>

            <!-- 46 elks API Login (when selected) -->
            <template v-if="is46ElksProvider && use46ElksApiLogin">
              <Elks46ApiLogin
                @credentials-ready="handle46ElksCredentials"
                @use-manual="handleUseManual46Elks"
              />
            </template>

            <!-- Telnyx API Login (when selected) -->
            <template v-else-if="isTelnyxProvider && useTelnyxApiLogin">
              <TelnyxApiLogin
                @credentials-ready="handleTelnyxCredentials"
                @use-manual="handleUseManualTelnyx"
              />
            </template>

            <!-- Dynamic Provider Login Form (for other providers or manual entry) -->
            <template v-else-if="selectedProvider">
              <div v-for="field in selectedProvider.fields" :key="field.name" class="form-field">
                <label :for="field.name">{{ field.label }}</label>
                <Dropdown
                  v-if="field.type === 'select' && field.options"
                  :id="field.name"
                  :model-value="credentials[field.name]"
                  :options="field.options"
                  option-label="label"
                  option-value="value"
                  :placeholder="field.placeholder"
                  class="w-full"
                  @update:model-value="
                    (val: string | undefined) => updateCredential(field.name, val ?? '')
                  "
                />
                <InputText
                  v-else
                  :id="field.name"
                  :model-value="credentials[field.name]"
                  :type="field.type === 'password' ? 'password' : 'text'"
                  :placeholder="field.placeholder"
                  class="w-full"
                  @update:model-value="
                    (val: string | undefined) => updateCredential(field.name, val ?? '')
                  "
                />
                <small v-if="field.helpText" class="help-text">
                  {{ field.helpText }}
                  <a v-if="field.helpUrl" :href="field.helpUrl" target="_blank" rel="noopener">
                    Learn more
                  </a>
                </small>
              </div>

              <!-- Show "Use API" link for 46 elks when in manual mode -->
              <div v-if="is46ElksProvider && !use46ElksApiLogin" class="api-login-link">
                <Button
                  label="Login with API credentials instead"
                  link
                  class="p-button-sm"
                  @click="use46ElksApiLogin = true"
                />
              </div>

              <!-- Show "Use API" link for Telnyx when in manual mode -->
              <div v-if="isTelnyxProvider && !useTelnyxApiLogin" class="api-login-link">
                <Button
                  label="Login with API key instead"
                  link
                  class="p-button-sm"
                  @click="useTelnyxApiLogin = true"
                />
              </div>

              <Button
                type="submit"
                label="Connect"
                icon="pi pi-sign-in"
                :loading="phone.isConnecting.value"
                :disabled="!isFormValid"
                class="w-full"
              />
            </template>
          </form>
          <p v-if="statusMessage" class="error-message">{{ statusMessage }}</p>
        </div>

        <!-- Phone Interface -->
        <div v-else class="phone-interface">
          <!-- Active Call View -->
          <div v-if="hasActiveCall" class="call-view">
            <CallControls
              :call-state="phone.callState.value"
              :is-on-hold="phone.isOnHold.value"
              :is-muted="phone.isMuted.value"
              :remote-display-name="phone.remoteDisplayName.value ?? undefined"
              :remote-uri="phone.remoteUri.value"
              :duration="phone.duration.value"
              @answer="phone.answerCall"
              @reject="phone.rejectCall"
              @hangup="phone.endCall"
              @toggle-hold="phone.toggleHold"
              @toggle-mute="phone.toggleMute"
              @transfer="handleTransferClick"
            />

            <!-- Recording Controls during active call -->
            <RecordingControls
              v-if="phone.isActive.value"
              :local-stream="phone.localStream.value"
              :remote-stream="phone.remoteStream.value"
              :is-call-active="phone.isActive.value"
            />

            <!-- Transcript during active call -->
            <TranscriptView
              v-if="phone.isActive.value"
              :is-call-active="phone.isActive.value"
              :remote-display-name="phone.remoteDisplayName.value ?? undefined"
            />

            <!-- DTMF during active call -->
            <div v-if="phone.isActive.value" class="dtmf-section">
              <Dialpad @digit="handleDTMF" @call="() => {}" />
            </div>
          </div>

          <!-- Idle View with Tabs -->
          <TabView v-else v-model:activeIndex="activeTab">
            <TabPanel header="Dialpad">
              <Dialpad @call="handleCall" @digit="handleDTMF" />
            </TabPanel>

            <TabPanel header="History">
              <CallHistory
                :entries="phone.historyEntries.value"
                @call="handleCall"
                @clear="phone.clearHistory"
              />
            </TabPanel>

            <TabPanel header="Settings">
              <DeviceSettings
                :audio-input-devices="phone.audioInputDevices.value"
                :audio-output-devices="phone.audioOutputDevices.value"
                :selected-audio-input-id="phone.selectedAudioInputId.value"
                :selected-audio-output-id="phone.selectedAudioOutputId.value"
                @select-input="handleSelectAudioInput"
                @select-output="handleSelectAudioOutput"
              />

              <div class="notif-settings">
                <h3>Desktop Notifications</h3>
                <p class="help-text">Show an OS notification on incoming calls.</p>
                <div class="notif-actions">
                  <Button
                    v-if="!notificationsEnabled"
                    label="Enable Notifications"
                    icon="pi pi-bell"
                    class="w-full"
                    @click="enableNotifications"
                  />
                  <Button
                    v-else
                    label="Disable Notifications"
                    icon="pi pi-bell-slash"
                    class="p-button-secondary w-full"
                    @click="disableNotifications"
                  />
                </div>

                <h4>Service Worker (Actions)</h4>
                <p class="help-text">
                  Enable Answer/Decline buttons via Service Worker notifications.
                </p>
                <div class="notif-actions">
                  <Button
                    v-if="!swNotificationsEnabled"
                    label="Enable SW Notifications"
                    icon="pi pi-bell"
                    class="w-full"
                    @click="enableSwNotifications"
                  />
                  <Button
                    v-else
                    label="Disable SW Notifications"
                    icon="pi pi-bell-slash"
                    class="p-button-secondary w-full"
                    @click="disableSwNotifications"
                  />
                </div>
              </div>

              <div class="disconnect-section">
                <Button
                  label="Disconnect"
                  icon="pi pi-sign-out"
                  class="p-button-secondary w-full"
                  @click="handleDisconnect"
                />
                <Button
                  label="Clear Saved Credentials"
                  icon="pi pi-trash"
                  class="p-button-text p-button-sm w-full mt-2"
                  @click="clearCredentials"
                />
              </div>
            </TabPanel>
          </TabView>
        </div>
      </template>

      <template #footer>
        <div class="phone-footer">
          <span class="version">VueSip v{{ version }}</span>
        </div>
      </template>
    </Card>

    <!-- Transfer Dialog -->
    <Dialog
      v-model:visible="showTransferDialog"
      header="Transfer Call"
      :style="{ width: '300px' }"
      modal
    >
      <div class="transfer-form">
        <label for="transfer-target">Transfer to:</label>
        <InputText
          id="transfer-target"
          v-model="transferTarget"
          placeholder="Enter number or SIP URI"
          class="w-full"
        />
      </div>
      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showTransferDialog = false" />
        <Button
          label="Transfer"
          icon="pi pi-share-alt"
          :disabled="!transferTarget"
          @click="handleTransfer"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.softphone {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--surface-ground);
}

.phone-card {
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.phone-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: var(--primary-500);
  color: white;
}

.phone-header h1 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.status-indicator i {
  font-size: 0.5rem;
  color: var(--red-400);
}

.status-indicator.connected i {
  color: var(--green-400);
}

.status-indicator.connecting i {
  color: var(--yellow-400);
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

.config-panel {
  padding: 16px 0;
}

.config-panel h2 {
  margin: 0 0 16px;
  font-size: 1.125rem;
  text-align: center;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.help-text a {
  color: var(--primary-500);
  text-decoration: none;
  margin-left: 4px;
}

.help-text a:hover {
  text-decoration: underline;
}

.w-full {
  width: 100%;
}

.notif-settings {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mt-2 {
  margin-top: 8px;
}

.error-message {
  color: var(--red-500);
  font-size: 0.875rem;
  text-align: center;
  margin-top: 12px;
}

.phone-interface {
  min-height: 400px;
}

.call-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dtmf-section {
  border-top: 1px solid var(--surface-200);
  padding-top: 16px;
}

.disconnect-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--surface-200);
}

.transfer-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transfer-form label {
  font-size: 0.875rem;
  font-weight: 500;
}

.api-login-link {
  text-align: center;
  margin: 8px 0;
}

.phone-footer {
  text-align: center;
  padding: 8px;
  border-top: 1px solid var(--surface-200);
}

.phone-footer .version {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  opacity: 0.7;
}
</style>
