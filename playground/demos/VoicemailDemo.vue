<template>
  <div class="voicemail-demo">
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
          <span class="demo-icon">📬</span>
          <span>Voicemail</span>
        </div>
      </template>
      <template #subtitle>Access and manage voicemail messages</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            Connect to AMI to access voicemail
          </Message>
          <div class="connection-form">
            <InputText v-model="amiUrl" placeholder="ws://pbx:8089/ws" class="url-input" />
            <Button label="Connect" @click="connectAmi" :loading="connecting" />
          </div>
        </div>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <Tag :severity="isConnected ? 'success' : 'danger'" :value="isConnected ? 'Connected' : 'Disconnected'" />
            <Tag severity="info" :value="`${monitoredMailboxes.length} monitored`" />
            <Tag v-if="hasWaitingMessages" severity="warning" :value="`${totalNewMessages} new`" />
          </div>

          <!-- Monitor Mailbox -->
          <Panel header="Monitor Mailbox" :toggleable="true" class="section-panel">
            <Message severity="info" :closable="false" class="info-message">
              <span class="info-icon">💡</span>
              <span><strong>Mailbox format:</strong> extension@context (e.g., <code>1001@default</code>)</span>
            </Message>
            <div class="monitor-form">
              <div class="form-field">
                <label>
                  Extension Number
                  <span class="field-hint">✓ Required</span>
                </label>
                <InputText
                  v-model="newMailbox.extension"
                  placeholder="1001, 2000, etc."
                />
                <small class="field-help">The mailbox extension number</small>
              </div>
              <div class="form-field">
                <label>
                  Asterisk Context
                  <span
                    class="field-hint help-icon"
                    v-tooltip.right="'The Asterisk dial plan context where this mailbox is configured. Common contexts: default, internal, from-pstn'"
                  >
                    ❓
                  </span>
                </label>
                <InputText
                  v-model="newMailbox.context"
                  placeholder="default (most common)"
                />
                <small class="field-help">Dial plan context (usually "default")</small>
              </div>
              <Button
                label="📬 Monitor Mailbox"
                @click="startMonitoring"
                :disabled="!newMailbox.extension"
                class="monitor-button"
              />
            </div>
          </Panel>

          <!-- MWI Status -->
          <Panel header="Message Waiting Indicators" :toggleable="true" class="section-panel">
            <div v-if="mwiList.length > 0" class="mwi-grid">
              <div v-for="mwi in mwiList" :key="mwi.mailbox" class="mwi-card" :class="{ 'has-messages': mwi.waiting }">
                <div class="mwi-header">
                  <span class="mailbox-name">{{ mwi.mailbox }}</span>
                  <Button
                    label="×"
                    size="small"
                    severity="secondary"
                    text
                    @click="stopMonitoring(mwi.mailbox)"
                  />
                </div>
                <div class="mwi-counts">
                  <div class="count-item new-count">
                    <span class="count-value">{{ mwi.newMessages }}</span>
                    <span class="count-label">New</span>
                  </div>
                  <div class="count-item old-count">
                    <span class="count-value">{{ mwi.oldMessages }}</span>
                    <span class="count-label">Old</span>
                  </div>
                </div>
                <div class="mwi-status">
                  <Tag :severity="mwi.waiting ? 'warning' : 'success'" :value="mwi.waiting ? 'Messages Waiting' : 'No New Messages'" />
                </div>
                <div class="mwi-actions">
                  <Button
                    label="Refresh"
                    size="small"
                    severity="secondary"
                    @click="refreshMailbox(mwi.mailbox)"
                  />
                  <Button
                    label="Details"
                    size="small"
                    @click="showMailboxDetails(mwi.mailbox)"
                  />
                </div>
                <div v-if="mwi.lastUpdated" class="mwi-updated">
                  Last updated: {{ formatTime(mwi.lastUpdated) }}
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <span class="empty-icon">📭</span>
              <span>No mailboxes being monitored</span>
              <small>Add a mailbox above to start monitoring</small>
            </div>
          </Panel>

          <!-- Mailbox Info -->
          <Panel header="Voicemail Users" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="mailbox-actions">
              <Button
                label="Load All Users"
                @click="loadVoicemailUsers"
                :loading="isLoading"
              />
            </div>
            <DataTable v-if="mailboxInfoList.length > 0" :value="mailboxInfoList" size="small" :rows="10" :paginator="mailboxInfoList.length > 10">
              <Column field="mailbox" header="Mailbox" sortable />
              <Column field="fullName" header="Name" sortable />
              <Column field="email" header="Email" />
              <Column field="newMessageCount" header="New" sortable>
                <template #body="{ data }">
                  <Tag v-if="data.newMessageCount > 0" severity="warning" :value="data.newMessageCount" />
                  <span v-else class="text-muted">0</span>
                </template>
              </Column>
              <Column field="oldMessageCount" header="Old" sortable />
              <Column header="Actions" style="width: 100px">
                <template #body="{ data }">
                  <Button
                    label="Monitor"
                    size="small"
                    @click="monitorMailboxFromList(data.mailbox)"
                    v-tooltip="'Monitor'"
                  />
                </template>
              </Column>
            </DataTable>
          </Panel>

          <!-- Summary Stats -->
          <Panel header="Summary" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">{{ totalNewMessages }}</span>
                <span class="stat-label">Total New</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ totalOldMessages }}</span>
                <span class="stat-label">Total Old</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ monitoredMailboxes.length }}</span>
                <span class="stat-label">Monitored</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ hasWaitingMessages ? 'Yes' : 'No' }}</span>
                <span class="stat-label">Waiting</span>
              </div>
            </div>
          </Panel>
        </template>

        <Divider />

        <h4>Code Example</h4>
        <pre class="code-block">{{ codeExample }}</pre>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAmiVoicemail } from '@/composables'
import { playgroundAmiClient } from '../sipClient'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Divider from 'primevue/divider'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Connection - use standardized storage key
const amiUrl = ref(localStorage.getItem('vuesip-ami-url') || 'ws://localhost:8089/ws')
const connecting = ref(false)
const realIsConnected = computed(() => playgroundAmiClient.isConnected.value)

// Simulated voicemail data
const simulatedMWI = ref([
  {
    mailbox: '1001@default',
    newMessages: 3,
    oldMessages: 7,
    waiting: true,
    lastUpdated: new Date(),
  },
  {
    mailbox: '1002@default',
    newMessages: 0,
    oldMessages: 2,
    waiting: false,
    lastUpdated: new Date(),
  },
  {
    mailbox: '1003@default',
    newMessages: 1,
    oldMessages: 0,
    waiting: true,
    lastUpdated: new Date(),
  },
])

const simulatedMailboxes = ref([
  { mailbox: '1001', fullName: 'John Smith', email: 'john@company.com', newMessageCount: 3, oldMessageCount: 7 },
  { mailbox: '1002', fullName: 'Jane Doe', email: 'jane@company.com', newMessageCount: 0, oldMessageCount: 2 },
  { mailbox: '1003', fullName: 'Bob Johnson', email: 'bob@company.com', newMessageCount: 1, oldMessageCount: 0 },
  { mailbox: '1004', fullName: 'Alice Williams', email: 'alice@company.com', newMessageCount: 0, oldMessageCount: 5 },
])

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? true : realIsConnected.value
)

const connectAmi = async () => {
  connecting.value = true
  try {
    localStorage.setItem('vuesip-ami-url', amiUrl.value)
    await playgroundAmiClient.connect({ url: amiUrl.value })
  } catch (e) {
    console.error('Failed to connect:', e)
  } finally {
    connecting.value = false
  }
}

// Create a computed ref for the AMI client
const amiClientRef = computed(() => playgroundAmiClient.getClient())

// Voicemail composable
const {
  mwiStates,
  mailboxes,
  isLoading: realIsLoading,
  totalNewMessages: realTotalNewMessages,
  totalOldMessages: realTotalOldMessages,
  hasWaitingMessages: realHasWaitingMessages,
  getMwiState: _getMwiState,
  getMailboxInfo,
  getVoicemailUsers,
  refreshMailbox: refresh,
  monitorMailbox,
  unmonitorMailbox,
  onMwiChange,
} = useAmiVoicemail(amiClientRef, {
  onNewMessage: (mailbox, count) => {
    console.log(`New message in ${mailbox}: ${count} total`)
  },
})

// Computed properties for simulation mode
const isLoading = computed(() =>
  isSimulationMode.value ? false : realIsLoading.value
)

const totalNewMessages = computed(() => {
  if (isSimulationMode.value) {
    return simulatedMWI.value.reduce((sum, mwi) => sum + mwi.newMessages, 0)
  }
  return realTotalNewMessages.value
})

const totalOldMessages = computed(() => {
  if (isSimulationMode.value) {
    return simulatedMWI.value.reduce((sum, mwi) => sum + mwi.oldMessages, 0)
  }
  return realTotalOldMessages.value
})

const hasWaitingMessages = computed(() => {
  if (isSimulationMode.value) {
    return simulatedMWI.value.some(mwi => mwi.waiting)
  }
  return realHasWaitingMessages.value
})

// Convert maps to arrays for display - use simulated data in simulation mode
const mwiList = computed(() =>
  isSimulationMode.value
    ? simulatedMWI.value
    : Array.from(mwiStates.value.values())
)
const mailboxInfoList = computed(() =>
  isSimulationMode.value
    ? simulatedMailboxes.value
    : Array.from(mailboxes.value.values())
)
const monitoredMailboxes = computed(() =>
  isSimulationMode.value
    ? simulatedMWI.value.map(m => m.mailbox)
    : Array.from(mwiStates.value.keys())
)

// Form state
const newMailbox = reactive({
  extension: '',
  context: 'default',
})

// Actions
const startMonitoring = () => {
  if (!newMailbox.extension) return

  if (isSimulationMode.value) {
    // Add to simulated data if not already monitored
    const mailboxId = `${newMailbox.extension}@${newMailbox.context}`
    if (!simulatedMWI.value.some(m => m.mailbox === mailboxId)) {
      simulatedMWI.value.push({
        mailbox: mailboxId,
        newMessages: Math.floor(Math.random() * 5),
        oldMessages: Math.floor(Math.random() * 10),
        waiting: Math.random() > 0.5,
        lastUpdated: new Date(),
      })
    }
  } else {
    monitorMailbox(newMailbox.extension, newMailbox.context)
  }
  newMailbox.extension = ''
}

const stopMonitoring = (mailbox: string) => {
  if (isSimulationMode.value) {
    // Remove from simulated data
    const index = simulatedMWI.value.findIndex(m => m.mailbox === mailbox)
    if (index > -1) {
      simulatedMWI.value.splice(index, 1)
    }
  } else {
    const parts = mailbox.split('@')
    const ext = parts[0] ?? ''
    const ctx = parts[1]
    unmonitorMailbox(ext, ctx)
  }
}

const refreshMailbox = async (mailbox: string) => {
  if (isSimulationMode.value) {
    // Update message counts randomly in simulation
    const mwi = simulatedMWI.value.find(m => m.mailbox === mailbox)
    if (mwi) {
      mwi.newMessages = Math.floor(Math.random() * 5)
      mwi.oldMessages = Math.floor(Math.random() * 10)
      mwi.waiting = mwi.newMessages > 0
      mwi.lastUpdated = new Date()
    }
  } else {
    const parts = mailbox.split('@')
    const ext = parts[0] ?? ''
    const ctx = parts[1]
    try {
      await refresh(ext, ctx)
    } catch (e) {
      console.error('Failed to refresh mailbox:', e)
    }
  }
}

const showMailboxDetails = async (mailbox: string) => {
  if (isSimulationMode.value) {
    // Show simulated mailbox details
    const parts = mailbox.split('@')
    const ext = parts[0] ?? ''
    const mwi = simulatedMWI.value.find(m => m.mailbox === mailbox)
    const user = simulatedMailboxes.value.find(u => u.mailbox === ext)
    const info = {
      mailbox: ext,
      fullName: user?.fullName || 'Unknown User',
      email: user?.email || 'unknown@example.com',
      newMessages: mwi?.newMessages || 0,
      oldMessages: mwi?.oldMessages || 0,
    }
    console.log('Mailbox info:', info)
    alert(`Mailbox: ${info.mailbox}\nName: ${info.fullName}\nEmail: ${info.email}\nNew: ${info.newMessages}\nOld: ${info.oldMessages}`)
  } else {
    const parts = mailbox.split('@')
    const ext = parts[0] ?? ''
    const ctx = parts[1]
    try {
      const info = await getMailboxInfo(ext, ctx)
      console.log('Mailbox info:', info)
      // Could open a dialog here
    } catch (e) {
      console.error('Failed to get mailbox info:', e)
    }
  }
}

const loadVoicemailUsers = async () => {
  if (isSimulationMode.value) {
    // Already showing simulated users via computed property
    console.log('Showing simulated voicemail users:', simulatedMailboxes.value.length)
    return
  }
  try {
    const users = await getVoicemailUsers()
    console.log('Loaded voicemail users:', users.length)
  } catch (e) {
    console.error('Failed to load voicemail users:', e)
  }
}

const monitorMailboxFromList = (mailbox: string) => {
  if (isSimulationMode.value) {
    // Use the simulation-aware startMonitoring function
    newMailbox.extension = mailbox
    newMailbox.context = 'default'
    startMonitoring()
  } else {
    monitorMailbox(mailbox, 'default')
  }
}

// Register MWI change listener
onMwiChange((mwi) => {
  console.log('MWI changed:', mwi.mailbox, mwi.newMessages, 'new')
})

// Helpers
const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

const codeExample = `import { useAmiVoicemail } from 'vuesip'

const {
  mwiStates,
  totalNewMessages,
  hasWaitingMessages,
  getMwiState,
  monitorMailbox,
  unmonitorMailbox,
  onMwiChange,
} = useAmiVoicemail(amiClientRef, {
  onNewMessage: (mailbox, count) => {
    console.log(\`New message in \${mailbox}: \${count} total\`)
  },
})

// Monitor a mailbox
monitorMailbox('1001', 'default')

// Check MWI state
const mwi = await getMwiState('1001')
console.log(\`\${mwi.newMessages} new messages\`)

// Listen for MWI changes
onMwiChange((mwi) => {
  if (mwi.waiting) {
    showNotification(\`New voicemail in \${mwi.mailbox}\`)
  }
})

// Get mailbox info
const info = await getMailboxInfo('1001')
console.log('Mailbox owner:', info?.fullName)

// Check total messages
watch(totalNewMessages, (count) => {
  updateBadge(count)
})`
</script>

<style scoped>
.voicemail-demo {
  max-width: 1000px;
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
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.connection-panel {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, var(--surface-ground) 0%, var(--surface-card) 100%);
  border-radius: 12px;
  border: 1px solid var(--surface-border);
}

.connection-form {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.url-input {
  flex: 1;
  font-size: 0.95rem;
}

.status-bar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.section-panel {
  margin-bottom: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.monitor-form {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: 8px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 150px;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.field-hint {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--orange-500);
  text-transform: none;
  letter-spacing: normal;
}

.help-icon {
  cursor: help;
  font-size: 1rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.help-icon:hover {
  opacity: 1;
}

.field-help {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  font-style: italic;
  margin-top: -0.25rem;
}

.info-message {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-icon {
  font-size: 1.25rem;
}

.info-message code {
  background: var(--surface-ground);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
  border: 1px solid var(--surface-border);
}

.monitor-button {
  align-self: flex-end;
  font-weight: 600;
}

.mwi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  padding: 0.5rem;
}

.mwi-card {
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 12px;
  border: 2px solid var(--surface-border);
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.mwi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.mwi-card.has-messages {
  border-color: var(--orange-400);
  background: linear-gradient(135deg, var(--orange-50) 0%, rgba(255, 167, 38, 0.05) 100%);
  box-shadow: 0 2px 8px rgba(255, 167, 38, 0.2);
}

.mwi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--surface-border);
}

.mailbox-name {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--primary-color);
  letter-spacing: -0.5px;
}

.mwi-counts {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 10px;
  flex: 1;
  border: 2px solid var(--surface-border);
  transition: all 0.2s ease;
}

.count-item:hover {
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.count-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.new-count .count-value {
  color: var(--orange-500);
  text-shadow: 0 2px 4px rgba(255, 167, 38, 0.2);
}

.old-count .count-value {
  color: var(--text-color-secondary);
}

.count-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mwi-status {
  margin-bottom: 1rem;
}

.mwi-actions {
  display: flex;
  gap: 0.5rem;
}

.mwi-actions button {
  flex: 1;
}

.mwi-updated {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--surface-border);
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-align: center;
}

.mailbox-actions {
  margin-bottom: 1.25rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1.25rem;
  padding: 0.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem;
  background: linear-gradient(135deg, var(--surface-ground) 0%, var(--surface-card) 100%);
  border-radius: 12px;
  border: 2px solid var(--surface-border);
  transition: all 0.3s ease;
}

.stat-item:hover {
  border-color: var(--primary-color);
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 0.25rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  color: var(--text-color-secondary);
  background: var(--surface-ground);
  border-radius: 12px;
  border: 2px dashed var(--surface-border);
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
  filter: grayscale(0.3);
}

.empty-state small {
  font-size: 0.85rem;
  opacity: 0.7;
}

.text-muted {
  color: var(--text-color-secondary);
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.25rem;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* Dark mode enhancements */
@media (prefers-color-scheme: dark) {
  .demo-card {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }

  .mwi-card {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .mwi-card:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  .mwi-card.has-messages {
    background: linear-gradient(135deg, rgba(255, 167, 38, 0.15) 0%, rgba(255, 167, 38, 0.08) 100%);
    box-shadow: 0 2px 8px rgba(255, 167, 38, 0.25);
  }

  .stat-item:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
}
</style>
