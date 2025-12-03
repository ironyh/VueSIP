<template>
  <div class="voicemail-demo">
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
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to access voicemail
          </Message>
          <div class="connection-form">
            <InputText v-model="amiUrl" placeholder="ws://pbx:8089/ws" class="url-input" />
            <Button label="Connect" icon="pi pi-link" @click="connectAmi" :loading="connecting" />
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
            <div class="monitor-form">
              <div class="form-field">
                <label>Mailbox</label>
                <InputText v-model="newMailbox.extension" placeholder="1001" />
              </div>
              <div class="form-field">
                <label>Context</label>
                <InputText v-model="newMailbox.context" placeholder="default" />
              </div>
              <Button
                label="Monitor"
                icon="pi pi-plus"
                @click="startMonitoring"
                :disabled="!newMailbox.extension"
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
                    icon="pi pi-times"
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
                    icon="pi pi-refresh"
                    size="small"
                    severity="secondary"
                    @click="refreshMailbox(mwi.mailbox)"
                  />
                  <Button
                    label="Details"
                    icon="pi pi-info-circle"
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
              <i class="pi pi-inbox"></i>
              <span>No mailboxes being monitored</span>
              <small>Add a mailbox above to start monitoring</small>
            </div>
          </Panel>

          <!-- Mailbox Info -->
          <Panel header="Voicemail Users" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="mailbox-actions">
              <Button
                label="Load All Users"
                icon="pi pi-download"
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
                    icon="pi pi-eye"
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
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Divider from 'primevue/divider'

// AMI Connection
const amiUrl = ref(localStorage.getItem('ami_url') || 'ws://localhost:8089/ws')
const connecting = ref(false)
const isConnected = computed(() => playgroundAmiClient.isConnected.value)

const connectAmi = async () => {
  connecting.value = true
  try {
    localStorage.setItem('ami_url', amiUrl.value)
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
  isLoading,
  totalNewMessages,
  totalOldMessages,
  hasWaitingMessages,
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

// Convert maps to arrays for display
const mwiList = computed(() => Array.from(mwiStates.value.values()))
const mailboxInfoList = computed(() => Array.from(mailboxes.value.values()))
const monitoredMailboxes = computed(() => Array.from(mwiStates.value.keys()))

// Form state
const newMailbox = reactive({
  extension: '',
  context: 'default',
})

// Actions
const startMonitoring = () => {
  if (newMailbox.extension) {
    monitorMailbox(newMailbox.extension, newMailbox.context)
    newMailbox.extension = ''
  }
}

const stopMonitoring = (mailbox: string) => {
  const parts = mailbox.split('@')
  const ext = parts[0] ?? ''
  const ctx = parts[1]
  unmonitorMailbox(ext, ctx)
}

const refreshMailbox = async (mailbox: string) => {
  const parts = mailbox.split('@')
  const ext = parts[0] ?? ''
  const ctx = parts[1]
  try {
    await refresh(ext, ctx)
  } catch (e) {
    console.error('Failed to refresh mailbox:', e)
  }
}

const showMailboxDetails = async (mailbox: string) => {
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

const loadVoicemailUsers = async () => {
  try {
    const users = await getVoicemailUsers()
    console.log('Loaded voicemail users:', users.length)
  } catch (e) {
    console.error('Failed to load voicemail users:', e)
  }
}

const monitorMailboxFromList = (mailbox: string) => {
  monitorMailbox(mailbox, 'default')
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
  max-width: 900px;
  margin: 0 auto;
}

.demo-card {
  margin: 1rem;
}

.demo-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-icon {
  font-size: 1.5rem;
}

.connection-panel {
  margin-bottom: 1rem;
}

.connection-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.url-input {
  flex: 1;
}

.status-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.section-panel {
  margin-bottom: 1rem;
}

.monitor-form {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color-secondary);
}

.mwi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.mwi-card {
  padding: 1rem;
  background: var(--surface-ground);
  border-radius: 8px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.mwi-card.has-messages {
  border-color: var(--orange-300);
  background: var(--orange-50);
}

.mwi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.mailbox-name {
  font-weight: 600;
  font-size: 1.125rem;
}

.mwi-counts {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.count-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 1rem;
  background: var(--surface-card);
  border-radius: 6px;
  flex: 1;
}

.count-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.new-count .count-value {
  color: var(--orange-500);
}

.old-count .count-value {
  color: var(--text-color-secondary);
}

.count-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.mwi-status {
  margin-bottom: 0.75rem;
}

.mwi-actions {
  display: flex;
  gap: 0.5rem;
}

.mwi-updated {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.mailbox-actions {
  margin-bottom: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 6px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.empty-state i {
  font-size: 2rem;
}

.empty-state small {
  font-size: 0.75rem;
}

.text-muted {
  color: var(--text-color-secondary);
}

.code-block {
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
