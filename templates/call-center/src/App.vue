<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Checkbox from 'primevue/checkbox'
import AgentDashboard from './components/AgentDashboard.vue'
import QueueStats from './components/QueueStats.vue'
import CallPanel from './components/CallPanel.vue'
import SupervisorPanel from './components/SupervisorPanel.vue'
import TranscriptionPanel from './components/TranscriptionPanel.vue'
import SystemStatus from './components/SystemStatus.vue'
import { useAgent } from './composables/useAgent'
import { useQueues } from './composables/useQueues'
import type { KeywordMatch } from 'vuesip'
import {
  ensurePermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  createNotificationManager,
} from 'vuesip'

// Agent composable
const agent = useAgent()

// Queues composable
const queues = useQueues()

// Configuration form
const configForm = ref({
  sipUri: import.meta.env.VITE_SIP_USER || '',
  wsUri: import.meta.env.VITE_SIP_URI || '',
  password: import.meta.env.VITE_SIP_PASSWORD || '',
  displayName: import.meta.env.VITE_SIP_DISPLAY_NAME || 'Call Center Agent',
  amiWsUrl: import.meta.env.VITE_AMI_WS_URL || '',
  agentId: '',
  queues: '',
  isSupervisor: false,
})

// UI state
const statusMessage = ref('')
const activeTab = ref(0)
const notificationsEnabled = ref(isNotificationsEnabled())
const swNotificationsEnabled = ref(false)
const notifManager = createNotificationManager({ strategy: 'auto' })

try {
  swNotificationsEnabled.value = localStorage.getItem('vuesip_sw_notifications_enabled') === 'true'
} catch {}

// Computed
const isConfigValid = computed(
  () =>
    configForm.value.wsUri &&
    configForm.value.sipUri &&
    configForm.value.password &&
    configForm.value.amiWsUrl &&
    configForm.value.agentId &&
    configForm.value.queues
)

// Methods
async function handleConnect() {
  try {
    statusMessage.value = ''
    const queueList = configForm.value.queues.split(',').map((q) => q.trim())

    await agent.configure({
      sipUri: configForm.value.sipUri,
      wsUri: configForm.value.wsUri,
      password: configForm.value.password,
      displayName: configForm.value.displayName,
      amiWsUrl: configForm.value.amiWsUrl,
      agentId: configForm.value.agentId,
      queues: queueList,
    })

    await agent.connect()

    // Initialize queue monitoring
    queues.initialize(agent.amiClient, queueList)
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
    if (!notificationsEnabled.value) {
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
    await agent.disconnect()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Disconnect failed'
  }
}

async function handleLogin() {
  try {
    await agent.login()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Login failed'
  }
}

async function handleLogout() {
  try {
    await agent.logout()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Logout failed'
  }
}

async function handlePause(reason: string) {
  try {
    await agent.pause(reason)
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Pause failed'
  }
}

async function handleUnpause() {
  try {
    await agent.unpause()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Unpause failed'
  }
}

async function handleDial(number: string) {
  try {
    await agent.makeCall(number)
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Call failed'
  }
}

async function handleAnswer() {
  try {
    await agent.answer()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Answer failed'
  }
}

async function handleHangup() {
  try {
    await agent.hangup()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Hangup failed'
  }
}

async function handleHold() {
  try {
    await agent.hold()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Hold failed'
  }
}

async function handleUnhold() {
  try {
    await agent.unhold()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Unhold failed'
  }
}

async function handleTransfer(target: string) {
  try {
    await agent.transfer(target)
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Transfer failed'
  }
}

async function handleDTMF(digit: string) {
  try {
    await agent.sendDTMF(digit)
  } catch (err) {
    console.error('DTMF error:', err)
  }
}

// Notify on incoming ringing
watch(
  () => ({
    state: agent.callState.value,
    name: agent.remoteDisplayName.value,
    uri: agent.remoteUri.value,
  }),
  async ({ state, name, uri }) => {
    if (!notificationsEnabled.value) return
    if (state === 'ringing') {
      const display = name || uri || 'Unknown'
      await notifManager.notifyIncomingCall({
        title: 'Incoming call',
        body: `From ${display}`,
        icon: '/logo.svg',
      })
    }
  }
)

function handleDisposition(code: string, notes: string) {
  console.log('Disposition:', code, notes)
  // In production, this would save to CRM/database
}

function handleClearWrapUp() {
  agent.clearWrapUp()
}

// Supervisor handlers
function handleSpy(agentInterface: string) {
  console.log('Spy on:', agentInterface)
  // Use AMI ChanSpy
}

function handleWhisper(agentInterface: string) {
  console.log('Whisper to:', agentInterface)
  // Use AMI ChanSpy with whisper mode
}

function handleBarge(agentInterface: string) {
  console.log('Barge into:', agentInterface)
  // Use AMI ChanSpy with barge mode
}

function handleStopMonitor() {
  console.log('Stop monitoring')
  // Hangup spy channel
}

// Transcription handlers
function handleKeywordDetected(match: KeywordMatch) {
  console.log('Keyword detected:', match.matchedText, '- Action:', match.rule.action)
  // In production, trigger agent assist UI, show knowledge base articles, etc.
}

function handleTranscriptExported(format: string, content: string) {
  console.log(`Transcript exported as ${format}:`, content.length, 'characters')
  // In production, save to CRM, send via email, etc.
}

// Cleanup
onUnmounted(async () => {
  if (agent.isConnected.value) {
    await agent.disconnect()
  }
})
</script>

<template>
  <div class="call-center">
    <div class="header">
      <h1>VueSip Call Center</h1>
      <div
        class="status-indicator"
        :class="{
          connected: agent.isRegistered.value,
          connecting: agent.isConnected.value && !agent.isRegistered.value,
        }"
      >
        <i class="pi pi-circle-fill" />
        <span>
          {{
            agent.isRegistered.value
              ? 'Ready'
              : agent.isConnected.value
                ? 'Connecting...'
                : 'Disconnected'
          }}
        </span>
      </div>
    </div>

    <!-- Configuration Panel -->
    <Card v-if="!agent.isConnected.value" class="config-card">
      <template #title>Connect to Call Center</template>
      <template #content>
        <form @submit.prevent="handleConnect">
          <div class="form-grid">
            <div class="form-field">
              <label for="wsUri">WebSocket URI</label>
              <InputText
                id="wsUri"
                v-model="configForm.wsUri"
                placeholder="wss://sip.example.com:8089/ws"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="sipUri">SIP URI</label>
              <InputText
                id="sipUri"
                v-model="configForm.sipUri"
                placeholder="sip:agent@example.com"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="password">Password</label>
              <InputText
                id="password"
                v-model="configForm.password"
                type="password"
                placeholder="Your SIP password"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="displayName">Display Name</label>
              <InputText
                id="displayName"
                v-model="configForm.displayName"
                placeholder="Agent Name"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="amiWsUrl">AMI WebSocket URL</label>
              <InputText
                id="amiWsUrl"
                v-model="configForm.amiWsUrl"
                placeholder="ws://pbx.example.com:8080"
                class="w-full"
              />
            </div>
            <div class="form-field">
              <label for="agentId">Agent ID</label>
              <InputText
                id="agentId"
                v-model="configForm.agentId"
                placeholder="1001"
                class="w-full"
              />
            </div>
            <div class="form-field full-width">
              <label for="queues">Queues (comma-separated)</label>
              <InputText
                id="queues"
                v-model="configForm.queues"
                placeholder="sales,support"
                class="w-full"
              />
            </div>
            <div class="form-field full-width checkbox-field">
              <Checkbox id="supervisor" v-model="configForm.isSupervisor" :binary="true" />
              <label for="supervisor">Supervisor Mode</label>
            </div>
          </div>
          <Button
            type="submit"
            label="Connect"
            icon="pi pi-sign-in"
            :disabled="!isConfigValid"
            class="w-full mt-3"
          />
        </form>
        <p v-if="statusMessage" class="error-message">{{ statusMessage }}</p>
      </template>
    </Card>

    <!-- Main Interface -->
    <div v-else class="main-interface">
      <div class="left-panel">
        <AgentDashboard
          :agent-id="agent.agentId.value"
          :agent-state="agent.agentState.value"
          :is-connected="agent.isConnected.value"
          :calls-handled="agent.callsHandled.value"
          :avg-talk-time="agent.avgTalkTime.value"
          :pause-reason="agent.pauseReason.value"
          @login="handleLogin"
          @logout="handleLogout"
          @pause="handlePause"
          @unpause="handleUnpause"
        />

        <CallPanel
          :call-state="agent.callState.value"
          :is-on-hold="agent.isOnHold.value"
          :is-muted="agent.isMuted.value"
          :remote-uri="agent.remoteUri.value"
          :remote-display-name="agent.remoteDisplayName.value"
          :duration="agent.duration.value"
          :agent-state="agent.agentState.value"
          @answer="handleAnswer"
          @hangup="handleHangup"
          @hold="handleHold"
          @unhold="handleUnhold"
          @transfer="handleTransfer"
          @dial="handleDial"
          @dtmf="handleDTMF"
          @disposition="handleDisposition"
          @clear-wrap-up="handleClearWrapUp"
        />

        <SystemStatus :ami-client="agent.amiClient" />
      </div>

      <div class="right-panel">
        <TabView v-model:active-index="activeTab">
          <TabPanel header="Queues">
            <QueueStats
              :queues="queues.queues.value"
              :callers="queues.callers.value"
              :total-calls="queues.totalCalls.value"
              :available-agents="queues.availableAgents.value"
              :longest-wait="queues.longestWait.value"
              :average-service-level="queues.averageServiceLevel.value"
            />
          </TabPanel>

          <TabPanel header="Transcription">
            <TranscriptionPanel
              :is-call-active="agent.isOnCall.value"
              :remote-display-name="agent.remoteDisplayName.value"
              @keyword-detected="handleKeywordDetected"
              @transcript-exported="handleTranscriptExported"
            />
          </TabPanel>

          <TabPanel v-if="configForm.isSupervisor" header="Supervisor">
            <SupervisorPanel
              :queues="queues.queues.value"
              :is-supervisor-mode="configForm.isSupervisor"
              @spy="handleSpy"
              @whisper="handleWhisper"
              @barge="handleBarge"
              @stop-monitor="handleStopMonitor"
            />
          </TabPanel>

          <TabPanel header="Settings">
            <div class="settings-section">
              <h4>Connection</h4>
              <p>Agent: {{ configForm.agentId }}</p>
              <p>Queues: {{ configForm.queues }}</p>
              <Button
                label="Disconnect"
                icon="pi pi-sign-out"
                class="p-button-secondary w-full"
                @click="handleDisconnect"
              />
              <div class="notif-settings mt-3">
                <h4>Desktop Notifications</h4>
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
                <h4 class="mt-2">Service Worker (Actions)</h4>
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
            </div>
          </TabPanel>
        </TabView>
      </div>
    </div>
  </div>
</template>

<style scoped>
.call-center {
  min-height: 100vh;
  padding: 20px;
  background: var(--surface-ground);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: var(--red-500);
}

.status-indicator.connected {
  color: var(--green-500);
}

.status-indicator.connecting {
  color: var(--yellow-500);
}

.status-indicator i {
  font-size: 0.5rem;
}

.config-card {
  max-width: 600px;
  margin: 0 auto;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
}

.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.w-full {
  width: 100%;
}

.mt-3 {
  margin-top: 16px;
}

.error-message {
  color: var(--red-500);
  text-align: center;
  margin-top: 12px;
}

.main-interface {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 20px;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-panel {
  background: var(--surface-card);
  border-radius: 8px;
  padding: 16px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-section h4 {
  margin: 0;
}

.settings-section p {
  margin: 0;
  color: var(--text-color-secondary);
}

@media (max-width: 1024px) {
  .main-interface {
    grid-template-columns: 1fr;
  }
}
</style>
