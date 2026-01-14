<script setup lang="ts">
/**
 * IVR Tester - Main Application Component
 *
 * Interactive tool for testing IVR (Interactive Voice Response) systems.
 * Provides visual tree building, DTMF input, transcription, and session management.
 */
import { ref, computed, onUnmounted, watch } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import ToastService from 'primevue/toastservice'
import { useProviderSelector } from 'vuesip'
import type { ProviderConfig } from 'vuesip'

// Components
import IvrTree from './components/IvrTree.vue'
import DtmfKeypad from './components/DtmfKeypad.vue'
import TranscriptPanel from './components/TranscriptPanel.vue'
import CallTimeline from './components/CallTimeline.vue'
import TestSession from './components/TestSession.vue'

// Composable
import { useIvrTester } from './composables/useIvrTester'
import type { ExportFormat, DtmfEntry } from './composables/useIvrTester'

// Initialize IVR tester
const ivrTester = useIvrTester()

// Provider selector
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

// UI State
const showConnectionPanel = ref(true)
const statusMessage = ref('')
const activeRightTab = ref(0)

// Computed
const isConnected = computed(() => ivrTester.isConnected.value)
const isCallActive = computed(() => ivrTester.isCallActive.value)
const callStatus = computed(() => {
  if (!isConnected.value) return 'Disconnected'
  if (ivrTester.callState.value === 'calling') return 'Calling...'
  if (ivrTester.callState.value === 'ringing') return 'Ringing...'
  if (ivrTester.callState.value === 'active') return 'Connected'
  return 'Ready'
})

// Provider change handler
function handleProviderChange(provider: ProviderConfig): void {
  selectProvider(provider.id)
}

// Connect to SIP server
async function handleConnect(): Promise<void> {
  try {
    statusMessage.value = ''
    saveCredentials()
    const sipConfig = getSipConfig()
    if (!sipConfig) {
      statusMessage.value = 'Invalid configuration'
      return
    }
    await ivrTester.configure(sipConfig)
    await ivrTester.connect()
    showConnectionPanel.value = false
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Connection failed'
  }
}

// Disconnect from SIP server
async function handleDisconnect(): Promise<void> {
  try {
    await ivrTester.disconnect()
    clearCredentials()
    showConnectionPanel.value = true
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Disconnect failed'
  }
}

// Start new test
function handleStartTest(targetNumber: string, sessionName?: string): void {
  ivrTester.startTest(targetNumber, sessionName)
}

// End current test
function handleEndTest(): void {
  ivrTester.endTest()
}

// Send DTMF digit
function handleDtmfDigit(digit: string): void {
  if (isCallActive.value) {
    ivrTester.sendDtmf(digit)
  }
}

// Handle DTMF click from timeline or transcript
function handleDtmfClick(entry: DtmfEntry): void {
  // Could implement navigation to tree node or highlighting
  console.log('DTMF clicked:', entry)
}

// Handle timeline seek
function handleTimelineSeek(timestamp: number): void {
  // Could implement audio playback seek if recording is available
  console.log('Seek to:', new Date(timestamp))
}

// Tree interactions
function handleNodeClick(nodeId: string): void {
  ivrTester.navigateTo(nodeId)
}

function handleAnnotate(nodeId: string, text: string): void {
  ivrTester.annotateNode(nodeId, text)
}

function handleMarkEndpoint(nodeId: string, isEndpoint: boolean): void {
  ivrTester.markAsEndpoint(nodeId, isEndpoint)
}

// Session management
function handleLoadSession(sessionId: string): void {
  ivrTester.loadSession(sessionId)
}

function handleDeleteSession(sessionId: string): void {
  ivrTester.deleteSession(sessionId)
}

function handleExportSession(format: ExportFormat, sessionId?: string): void {
  const exported = ivrTester.exportSession(format, sessionId)
  if (exported) {
    // Create download
    const blob = new Blob([exported], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ivr-session-${Date.now()}.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

function handleImportSession(jsonData: string): void {
  try {
    ivrTester.importSession(jsonData)
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Import failed'
  }
}

function handleClearAllSessions(): void {
  ivrTester.clearAllSessions()
}

function handleAddNote(note: string): void {
  ivrTester.addSessionNote(note)
}

// Clear transcript
function handleClearTranscript(): void {
  // Would need to implement in composable if needed
  console.log('Clear transcript requested')
}

// Cleanup on unmount
onUnmounted(async () => {
  if (isConnected.value) {
    await ivrTester.disconnect()
  }
})
</script>

<template>
  <div class="ivr-tester">
    <!-- Header -->
    <header class="app-header">
      <div class="header-left">
        <h1>
          <i class="pi pi-sitemap" />
          IVR Tester
        </h1>
        <span class="subtitle">VueSIP Interactive Voice Response Testing Tool</span>
      </div>
      <div class="header-right">
        <div
          class="connection-status"
          :class="{
            connected: isConnected && !isCallActive,
            'in-call': isCallActive,
          }"
        >
          <span class="status-dot" />
          <span>{{ callStatus }}</span>
        </div>
        <Button
          v-if="isConnected"
          icon="pi pi-sign-out"
          class="p-button-text p-button-sm"
          title="Disconnect"
          @click="handleDisconnect"
        />
      </div>
    </header>

    <!-- Connection Panel -->
    <div v-if="showConnectionPanel && !isConnected" class="connection-panel">
      <Card class="connection-card">
        <template #header>
          <div class="card-header">
            <i class="pi pi-phone" />
            <span>Connect to SIP Server</span>
          </div>
        </template>
        <template #content>
          <form @submit.prevent="handleConnect">
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
                </small>
              </div>

              <Button
                type="submit"
                label="Connect"
                icon="pi pi-sign-in"
                :loading="ivrTester.isConnecting.value"
                :disabled="!isConfigured"
                class="w-full connect-btn"
              />
            </template>

            <p v-if="statusMessage" class="error-message">{{ statusMessage }}</p>
          </form>
        </template>
      </Card>
    </div>

    <!-- Main Interface -->
    <div v-else class="main-interface">
      <Splitter class="main-splitter">
        <!-- Left Panel: IVR Tree -->
        <SplitterPanel :size="40" :min-size="25" class="tree-panel">
          <div class="panel-header">
            <h2>
              <i class="pi pi-sitemap" />
              IVR Navigation Tree
            </h2>
          </div>
          <div class="panel-content">
            <IvrTree
              :root-node="ivrTester.ivrTree.value"
              :current-node-id="ivrTester.currentNodeId.value"
              :show-annotations="true"
              @node-click="handleNodeClick"
              @annotate="handleAnnotate"
              @mark-endpoint="handleMarkEndpoint"
            />
          </div>
        </SplitterPanel>

        <!-- Right Panel: Controls and Timeline -->
        <SplitterPanel :size="60" :min-size="40" class="controls-panel">
          <!-- Test Session Component -->
          <TestSession
            :current-session="ivrTester.currentSession.value"
            :saved-sessions="ivrTester.savedSessions.value"
            :is-test-active="ivrTester.isTestActive.value"
            :is-call-active="isCallActive"
            :call-status="callStatus"
            :call-duration="ivrTester.callDuration.value"
            @start-test="handleStartTest"
            @end-test="handleEndTest"
            @load-session="handleLoadSession"
            @delete-session="handleDeleteSession"
            @export-session="handleExportSession"
            @import-session="handleImportSession"
            @clear-all-sessions="handleClearAllSessions"
            @add-note="handleAddNote"
          />

          <!-- Timeline -->
          <CallTimeline
            :dtmf-history="ivrTester.dtmfHistory.value"
            :transcript-entries="ivrTester.transcriptEntries.value"
            :start-time="ivrTester.currentSession.value?.startTime ?? null"
            :end-time="ivrTester.currentSession.value?.endTime ?? null"
            :duration="ivrTester.callDuration.value"
            :is-active="isCallActive"
            @seek="handleTimelineSeek"
            @dtmf-click="handleDtmfClick"
          />

          <!-- Tabs for Keypad and Transcript -->
          <TabView v-model:active-index="activeRightTab" class="bottom-tabs">
            <TabPanel>
              <template #header>
                <span><i class="pi pi-th-large" /> Keypad</span>
              </template>
              <div class="keypad-container">
                <DtmfKeypad
                  :disabled="!isCallActive"
                  :play-tones="true"
                  size="medium"
                  @digit="handleDtmfDigit"
                />
              </div>
            </TabPanel>

            <TabPanel>
              <template #header>
                <span><i class="pi pi-microphone" /> Transcript</span>
              </template>
              <TranscriptPanel
                :entries="ivrTester.transcriptEntries.value"
                :dtmf-history="ivrTester.dtmfHistory.value"
                :current-transcript="ivrTester.currentTranscript.value"
                :is-recording="ivrTester.isTranscribing.value"
                :auto-scroll="true"
                @clear="handleClearTranscript"
              />
            </TabPanel>
          </TabView>
        </SplitterPanel>
      </Splitter>
    </div>
  </div>
</template>

<style scoped>
.ivr-tester {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-ground);
  color: var(--text-color);
}

/* Header */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-500);
}

.header-left h1 i {
  font-size: 1.25rem;
}

.subtitle {
  display: block;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-top: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--surface-100);
  border-radius: 20px;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.connection-status.connected {
  color: var(--green-500);
  background: var(--green-50);
}

.connection-status.in-call {
  color: var(--blue-500);
  background: var(--blue-50);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.connection-status.in-call .status-dot {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* Connection Panel */
.connection-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.connection-card {
  width: 100%;
  max-width: 420px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--primary-500);
  color: white;
  font-weight: 600;
}

.card-header i {
  font-size: 1.25rem;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color);
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.w-full {
  width: 100%;
}

.connect-btn {
  margin-top: 8px;
}

.error-message {
  color: var(--red-500);
  font-size: 0.875rem;
  text-align: center;
  margin-top: 12px;
}

/* Main Interface */
.main-interface {
  flex: 1;
  overflow: hidden;
}

.main-splitter {
  height: 100%;
  background: transparent;
}

/* Tree Panel */
.tree-panel {
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border-right: 1px solid var(--surface-border);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-border);
}

.panel-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
}

.panel-header h2 i {
  color: var(--primary-500);
}

.panel-content {
  flex: 1;
  overflow: auto;
}

/* Controls Panel */
.controls-panel {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow: auto;
}

/* Bottom Tabs */
.bottom-tabs {
  flex: 1;
  min-height: 300px;
}

.bottom-tabs :deep(.p-tabview-panels) {
  padding: 0;
  flex: 1;
}

.bottom-tabs :deep(.p-tabview-panel) {
  height: 100%;
}

/* Keypad Container */
.keypad-container {
  display: flex;
  justify-content: center;
  padding: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .main-splitter {
    flex-direction: column;
  }

  .tree-panel {
    border-right: none;
    border-bottom: 1px solid var(--surface-border);
  }

  .app-header {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .header-left {
    text-align: center;
  }
}
</style>
