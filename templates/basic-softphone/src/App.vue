<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
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
import { usePhone } from './composables/usePhone'
import { useProviderSelector } from 'vuesip'
import type { ProviderConfig } from 'vuesip'

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

// Handle provider change from dropdown
function handleProviderChange(provider: ProviderConfig) {
  selectProvider(provider.id)
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

async function handleDisconnect() {
  try {
    await phone.disconnectPhone()
    // Clear stored credentials on disconnect
    clearCredentials()
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

            <!-- Dynamic Provider Login Form -->
            <template v-if="selectedProvider">
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
            </template>

            <Button
              type="submit"
              label="Connect"
              icon="pi pi-sign-in"
              :loading="phone.isConnecting.value"
              :disabled="!isFormValid"
              class="w-full"
            />
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
              :remote-display-name="phone.remoteDisplayName.value"
              :remote-uri="phone.remoteUri.value"
              :duration="phone.duration.value"
              @answer="phone.answerCall"
              @reject="phone.rejectCall"
              @hangup="phone.endCall"
              @toggle-hold="phone.toggleHold"
              @toggle-mute="phone.toggleMute"
              @transfer="handleTransferClick"
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
                @select-input="phone.selectAudioInput"
                @select-output="phone.selectAudioOutput"
              />

              <div class="disconnect-section">
                <Button
                  label="Disconnect"
                  icon="pi pi-sign-out"
                  class="p-button-secondary w-full"
                  @click="handleDisconnect"
                />
              </div>
            </TabPanel>
          </TabView>
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
</style>
