<template>
  <div class="blacklist-demo">
    <Card class="demo-card">
      <template #title>
        <div class="demo-header">
          <span class="demo-icon">🚫</span>
          <span>Call Blacklist</span>
        </div>
      </template>
      <template #subtitle>Block unwanted callers and manage blacklist rules</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false">
            <template #icon><i class="pi pi-exclamation-triangle"></i></template>
            Connect to AMI to manage the blacklist
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
            <Tag severity="info" :value="`${activeCount} blocked`" />
            <Tag severity="warning" :value="`${stats.blockedToday} blocked today`" />
          </div>

          <!-- Block New Number -->
          <Panel header="Block Number" :toggleable="true" class="section-panel">
            <div class="form-grid">
              <div class="form-field">
                <label>Phone Number *</label>
                <InputText v-model="newBlock.number" placeholder="+1234567890 or 1900*" />
                <small>Use * as wildcard (e.g., 1900* blocks all 1900 numbers)</small>
              </div>
              <div class="form-field">
                <label>Reason</label>
                <Dropdown
                  v-model="newBlock.reason"
                  :options="reasons"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select reason"
                />
              </div>
              <div class="form-field">
                <label>Action</label>
                <Dropdown
                  v-model="newBlock.action"
                  :options="actions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select action"
                />
              </div>
              <div class="form-field">
                <label>Description</label>
                <InputText v-model="newBlock.description" placeholder="Known spam caller" />
              </div>
              <div class="form-field">
                <label>Expires In (hours)</label>
                <InputNumber v-model="newBlock.expiresInHours" :min="0" placeholder="Never (leave empty)" />
              </div>
            </div>
            <div class="form-actions">
              <Button
                label="Block Number"
                icon="pi pi-ban"
                severity="danger"
                @click="blockNewNumber"
                :loading="isLoading"
                :disabled="!newBlock.number"
              />
            </div>
          </Panel>

          <!-- Quick Check -->
          <Panel header="Check Number" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="check-form">
              <InputText v-model="checkNumber" placeholder="Enter number to check" />
              <Button label="Check" icon="pi pi-search" @click="doCheckNumber" />
            </div>
            <div v-if="checkResult !== null" class="check-result">
              <Tag :severity="checkResult ? 'danger' : 'success'" :value="checkResult ? 'BLOCKED' : 'NOT BLOCKED'" />
              <span v-if="checkResult && checkEntry">
                Reason: {{ checkEntry.reason }} | Action: {{ checkEntry.action }}
              </span>
            </div>
          </Panel>

          <!-- Blocklist -->
          <Panel header="Blocked Numbers" :toggleable="true" class="section-panel">
            <div class="search-bar">
              <InputText v-model="searchTerm" placeholder="Search blocklist..." class="search-input" />
              <Dropdown v-model="filterStatus" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="All statuses" />
            </div>
            <DataTable :value="filteredBlocklist" size="small" :rows="10" :paginator="filteredBlocklist.length > 10">
              <Column field="number" header="Number" sortable />
              <Column field="reason" header="Reason" sortable>
                <template #body="{ data }">
                  <Tag :severity="getReasonSeverity(data.reason)" :value="data.reason" />
                </template>
              </Column>
              <Column field="action" header="Action" sortable />
              <Column field="status" header="Status" sortable>
                <template #body="{ data }">
                  <Tag :severity="data.status === 'active' ? 'success' : 'secondary'" :value="data.status" />
                </template>
              </Column>
              <Column field="blockedCount" header="Blocked" sortable />
              <Column field="blockedAt" header="Added">
                <template #body="{ data }">
                  {{ formatDate(data.blockedAt) }}
                </template>
              </Column>
              <Column header="Actions" style="width: 120px">
                <template #body="{ data }">
                  <div class="action-buttons">
                    <Button
                      v-if="data.status === 'active'"
                      icon="pi pi-pause"
                      size="small"
                      severity="secondary"
                      @click="disableBlock(data.number)"
                      v-tooltip="'Disable'"
                    />
                    <Button
                      v-else
                      icon="pi pi-play"
                      size="small"
                      severity="success"
                      @click="enableBlock(data.number)"
                      v-tooltip="'Enable'"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      severity="danger"
                      @click="unblockNumber(data.number)"
                      v-tooltip="'Remove'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <div v-if="blocklist.length === 0" class="empty-state">
              <i class="pi pi-check-circle"></i>
              <span>No blocked numbers</span>
            </div>
          </Panel>

          <!-- Import/Export -->
          <Panel header="Import / Export" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="import-export-grid">
              <div class="export-section">
                <h5>Export Blocklist</h5>
                <div class="format-buttons">
                  <Button label="JSON" icon="pi pi-download" size="small" @click="doExport('json')" />
                  <Button label="CSV" icon="pi pi-download" size="small" @click="doExport('csv')" />
                  <Button label="TXT" icon="pi pi-download" size="small" @click="doExport('txt')" />
                </div>
              </div>
              <div class="import-section">
                <h5>Import Blocklist</h5>
                <div class="import-form">
                  <Dropdown v-model="importFormat" :options="formats" optionLabel="label" optionValue="value" placeholder="Format" />
                  <Textarea v-model="importData" rows="3" placeholder="Paste data here..." />
                  <Button label="Import" icon="pi pi-upload" @click="doImport" :disabled="!importData" />
                </div>
              </div>
            </div>
          </Panel>

          <!-- Stats -->
          <Panel header="Statistics" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">{{ stats.totalEntries }}</span>
                <span class="stat-label">Total Entries</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.activeEntries }}</span>
                <span class="stat-label">Active</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.disabledEntries }}</span>
                <span class="stat-label">Disabled</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.totalBlockedCalls }}</span>
                <span class="stat-label">Total Blocked</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.blockedToday }}</span>
                <span class="stat-label">Blocked Today</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ stats.blockedThisWeek }}</span>
                <span class="stat-label">This Week</span>
              </div>
            </div>
            <Divider />
            <h5>By Reason</h5>
            <div class="reason-breakdown">
              <div v-for="(count, reason) in stats.byReason" :key="reason" class="reason-item">
                <span class="reason-label">{{ reason }}</span>
                <span class="reason-count">{{ count }}</span>
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
import { useAmiBlacklist, type BlockReason, type BlockAction, type BlockEntry } from '@/composables'
import { playgroundAmiClient } from '../sipClient'
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'
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

// Blacklist composable
const {
  blocklist,
  stats,
  isLoading,
  activeCount,
  isBlocked,
  getBlockEntry,
  blockNumber,
  unblockNumber: unblock,
  enableBlock: enable,
  disableBlock: disable,
  exportList,
  importList,
  refresh: _refresh,
} = useAmiBlacklist(playgroundAmiClient.getClient(), {
  onNumberBlocked: (entry) => console.log('Number blocked:', entry.number),
  onCallBlocked: (number) => console.log('Call blocked from:', number),
})

// Form state
const newBlock = reactive({
  number: '',
  reason: 'spam' as BlockReason,
  action: 'hangup' as BlockAction,
  description: '',
  expiresInHours: null as number | null,
})

const reasons: Array<{ label: string; value: BlockReason }> = [
  { label: 'Spam', value: 'spam' },
  { label: 'Telemarketer', value: 'telemarketer' },
  { label: 'Robocall', value: 'robocall' },
  { label: 'Scam', value: 'scam' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Unwanted', value: 'unwanted' },
  { label: 'Manual', value: 'manual' },
]

const actions: Array<{ label: string; value: BlockAction }> = [
  { label: 'Hangup', value: 'hangup' },
  { label: 'Busy', value: 'busy' },
  { label: 'Congestion', value: 'congestion' },
  { label: 'Voicemail', value: 'voicemail' },
  { label: 'Announcement', value: 'announcement' },
]

const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Disabled', value: 'disabled' },
  { label: 'Expired', value: 'expired' },
]

const formats = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
  { label: 'TXT', value: 'txt' },
]

// Search and filter
const searchTerm = ref('')
const filterStatus = ref('all')

const filteredBlocklist = computed(() => {
  let result = [...blocklist.value]

  if (filterStatus.value !== 'all') {
    result = result.filter(e => e.status === filterStatus.value)
  }

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(e =>
      e.number.toLowerCase().includes(term) ||
      e.description?.toLowerCase().includes(term)
    )
  }

  return result
})

// Check number
const checkNumber = ref('')
const checkResult = ref<boolean | null>(null)
const checkEntry = ref<BlockEntry | undefined>(undefined)

const doCheckNumber = () => {
  if (checkNumber.value) {
    checkResult.value = isBlocked(checkNumber.value)
    checkEntry.value = getBlockEntry(checkNumber.value)
  }
}

// Actions
const blockNewNumber = async () => {
  try {
    await blockNumber(newBlock.number, {
      reason: newBlock.reason,
      action: newBlock.action,
      description: newBlock.description || undefined,
      expiresIn: newBlock.expiresInHours ? newBlock.expiresInHours * 60 * 60 * 1000 : undefined,
    })
    // Reset form
    newBlock.number = ''
    newBlock.description = ''
    newBlock.expiresInHours = null
  } catch (e) {
    console.error('Failed to block number:', e)
  }
}

const unblockNumber = async (number: string) => {
  try {
    await unblock(number)
  } catch (e) {
    console.error('Failed to unblock:', e)
  }
}

const enableBlock = async (number: string) => {
  try {
    await enable(number)
  } catch (e) {
    console.error('Failed to enable block:', e)
  }
}

const disableBlock = async (number: string) => {
  try {
    await disable(number)
  } catch (e) {
    console.error('Failed to disable block:', e)
  }
}

// Import/Export
const importFormat = ref<'json' | 'csv' | 'txt'>('json')
const importData = ref('')

const doExport = (format: 'json' | 'csv' | 'txt') => {
  const data = exportList(format)
  const blob = new Blob([data], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `blacklist.${format}`
  a.click()
  URL.revokeObjectURL(url)
}

const doImport = async () => {
  try {
    const result = await importList(importData.value, importFormat.value)
    console.log('Import result:', result)
    importData.value = ''
  } catch (e) {
    console.error('Import failed:', e)
  }
}

// Helpers
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const getReasonSeverity = (reason: string) => {
  switch (reason) {
    case 'spam':
    case 'scam':
      return 'danger'
    case 'harassment':
      return 'warning'
    case 'telemarketer':
    case 'robocall':
      return 'info'
    default:
      return 'secondary'
  }
}

const codeExample = `import { useAmiBlacklist } from 'vuesip'

const {
  blocklist,
  stats,
  isBlocked,
  blockNumber,
  unblockNumber,
  exportList,
  importList,
} = useAmiBlacklist(amiClient, {
  onNumberBlocked: (entry) => {
    console.log('Blocked:', entry.number)
  },
  onCallBlocked: (number) => {
    console.log('Blocked call from:', number)
  },
})

// Add a number to blacklist
await blockNumber('+1234567890', {
  reason: 'spam',
  action: 'hangup',
  description: 'Known spam caller',
})

// Block with wildcard pattern
await blockNumber('1900*', {
  reason: 'telemarketer',
  action: 'busy',
})

// Check if number is blocked
if (isBlocked('+1234567890')) {
  console.log('This number is blocked')
}

// Export blocklist
const data = exportList('json')

// Import blocklist
await importList(jsonData, 'json')`
</script>

<style scoped>
.blacklist-demo {
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
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

.form-field small {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.form-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.check-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.check-form .p-inputtext {
  flex: 1;
}

.check-result {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: 6px;
}

.search-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
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

.import-export-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.export-section h5,
.import-section h5 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.format-buttons {
  display: flex;
  gap: 0.5rem;
}

.import-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  padding: 0.5rem;
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

.reason-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--surface-ground);
  border-radius: 4px;
  font-size: 0.875rem;
}

.reason-count {
  font-weight: 600;
  color: var(--primary-color);
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

@media (max-width: 768px) {
  .import-export-grid {
    grid-template-columns: 1fr;
  }
}
</style>
