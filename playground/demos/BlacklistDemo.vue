<template>
  <div class="blacklist-demo">
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
          <span class="demo-icon" aria-hidden="true">🚫</span>
          <span>Call blacklist</span>
        </div>
      </template>
      <template #subtitle>Block unwanted callers and manage blacklist rules</template>
      <template #content>
        <!-- Connection Status -->
        <div v-if="!isConnected" class="connection-panel">
          <Message severity="warn" :closable="false" role="alert">
            <template #icon
            ><i class="pi pi-exclamation-triangle text-xl" aria-hidden="true"></i
            ></template>
            Connect to AMI to manage the blacklist
          </Message>
          <div class="connection-form">
            <label for="ami-url-input" class="sr-only">AMI WebSocket URL</label>
            <InputText
              id="ami-url-input"
              v-model="amiUrl"
              placeholder="ws://pbx:8089/ws"
              class="url-input"
              aria-required="true"
            />
            <Button
              label="Connect"
              icon="pi pi-link"
              @click="connectAmi"
              :loading="connecting"
              aria-label="Connect to AMI server"
            />
          </div>
        </div>

        <template v-else>
          <!-- Status Bar -->
          <div class="status-bar">
            <Tag
              :severity="isConnected ? 'success' : 'danger'"
              :value="isConnected ? 'Connected' : 'Disconnected'"
            />
            <Tag severity="info" :value="`${activeCount} blocked`" />
            <Tag severity="warning" :value="`${stats.blockedToday} blocked today`" />
          </div>

          <!-- Block New Number -->
          <Panel header="Block Number" :toggleable="true" class="section-panel">
            <div class="form-grid">
              <div class="form-field col-12">
                <label for="block-phone-number">Phone Number *</label>
                <InputText
                  id="block-phone-number"
                  v-model="newBlock.number"
                  placeholder="+1234567890 or 1900*"
                  aria-required="true"
                  aria-describedby="phone-help"
                  class="w-full"
                />
                <small id="phone-help"
                >Use * as wildcard (e.g., 1900* blocks all 1900 numbers)</small
                >
              </div>
              <div class="form-field col-12 sm:col-6">
                <label for="block-reason">Reason</label>
                <Dropdown
                  id="block-reason"
                  v-model="newBlock.reason"
                  :options="reasons"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select reason"
                  class="w-full"
                />
              </div>
              <div class="form-field col-12 sm:col-6">
                <label for="block-action">Action</label>
                <Dropdown
                  id="block-action"
                  v-model="newBlock.action"
                  :options="actions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Select action"
                  class="w-full"
                />
              </div>
              <div class="form-field col-12 sm:col-6">
                <label for="block-description">Description</label>
                <InputText
                  id="block-description"
                  v-model="newBlock.description"
                  placeholder="Known spam caller"
                  class="w-full"
                />
              </div>
              <div class="form-field col-12 sm:col-6">
                <label for="block-expires">Expires In (hours)</label>
                <InputNumber
                  id="block-expires"
                  v-model="newBlock.expiresInHours"
                  :min="0"
                  placeholder="Never (leave empty)"
                  class="w-full"
                />
              </div>
            </div>
            <div class="form-actions flex flex-column md:flex-row gap-2">
              <Button
                label="Block Number"
                icon="pi pi-ban"
                severity="danger"
                @click="blockNewNumber"
                :loading="isLoading"
                :disabled="!newBlock.number"
                aria-label="Add number to blacklist"
                class="w-full md:w-auto"
              />
            </div>
          </Panel>

          <!-- Quick Check -->
          <Panel header="Check Number" :toggleable="true" :collapsed="true" class="section-panel">
            <div class="check-form">
              <label for="check-number-input" class="sr-only">Check if number is blocked</label>
              <InputText
                id="check-number-input"
                v-model="checkNumber"
                placeholder="Enter number to check"
              />
              <Button
                label="Check"
                icon="pi pi-search"
                @click="doCheckNumber"
                aria-label="Check if number is blocked"
              />
            </div>
            <div v-if="checkResult !== null" class="check-result" role="status" aria-live="polite">
              <Tag
                :severity="checkResult ? 'danger' : 'success'"
                :value="checkResult ? 'BLOCKED' : 'NOT BLOCKED'"
              />
              <span v-if="checkResult && checkEntry">
                Reason: {{ checkEntry.reason }} | Action: {{ checkEntry.action }}
              </span>
            </div>
          </Panel>

          <!-- Blocklist -->
          <Panel header="Blocked Numbers" :toggleable="true" class="section-panel">
            <div class="search-bar">
              <label for="blocklist-search" class="sr-only">Search blocklist</label>
              <InputText
                id="blocklist-search"
                v-model="searchTerm"
                placeholder="Search blocklist..."
                class="search-input"
                aria-label="Search blocked numbers"
              />
              <label for="blocklist-filter" class="sr-only">Filter by status</label>
              <Dropdown
                id="blocklist-filter"
                v-model="filterStatus"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="All statuses"
                aria-label="Filter blocked numbers by status"
              />
            </div>
            <DataTable
              :value="filteredBlocklist"
              size="small"
              :rows="10"
              :paginator="filteredBlocklist.length > 10"
            >
              <Column field="number" header="Number" sortable />
              <Column field="reason" header="Reason" sortable>
                <template #body="{ data }">
                  <Tag :severity="getReasonSeverity(data.reason)" :value="data.reason" />
                </template>
              </Column>
              <Column field="action" header="Action" sortable />
              <Column field="status" header="Status" sortable>
                <template #body="{ data }">
                  <Tag
                    :severity="data.status === 'active' ? 'success' : 'secondary'"
                    :value="data.status"
                  />
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
                  <div
                    class="action-buttons"
                    role="group"
                    :aria-label="`Actions for ${data.number}`"
                  >
                    <Button
                      v-if="data.status === 'active'"
                      icon="pi pi-pause"
                      size="small"
                      severity="secondary"
                      @click="disableBlock(data.number)"
                      :aria-label="`Disable blocking for ${data.number}`"
                      v-tooltip="'Disable'"
                    />
                    <Button
                      v-else
                      icon="pi pi-play"
                      size="small"
                      severity="success"
                      @click="enableBlock(data.number)"
                      :aria-label="`Enable blocking for ${data.number}`"
                      v-tooltip="'Enable'"
                    />
                    <Button
                      icon="pi pi-trash"
                      size="small"
                      severity="danger"
                      @click="unblockNumber(data.number)"
                      :aria-label="`Remove ${data.number} from blacklist`"
                      v-tooltip="'Remove'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <div v-if="blocklist.length === 0" class="empty-state" role="status">
              <i class="pi pi-check-circle text-4xl" aria-hidden="true"></i>
              <span>No blocked numbers</span>
            </div>
          </Panel>

          <!-- Import/Export -->
          <Panel
            header="Import / Export"
            :toggleable="true"
            :collapsed="true"
            class="section-panel"
          >
            <div class="import-export-grid">
              <div class="export-section">
                <h5>Export Blocklist</h5>
                <div class="format-buttons" role="group" aria-label="Export format options">
                  <Button
                    label="JSON"
                    icon="pi pi-download"
                    size="small"
                    @click="doExport('json')"
                    aria-label="Export blocklist as JSON"
                  />
                  <Button
                    label="CSV"
                    icon="pi pi-download"
                    size="small"
                    @click="doExport('csv')"
                    aria-label="Export blocklist as CSV"
                  />
                  <Button
                    label="TXT"
                    icon="pi pi-download"
                    size="small"
                    @click="doExport('txt')"
                    aria-label="Export blocklist as TXT"
                  />
                </div>
              </div>
              <div class="import-section">
                <h5>Import Blocklist</h5>
                <div class="import-form">
                  <label for="import-format" class="sr-only">Import format</label>
                  <Dropdown
                    id="import-format"
                    v-model="importFormat"
                    :options="formats"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Format"
                    aria-label="Select import format"
                  />
                  <label for="import-data" class="sr-only">Import data</label>
                  <Textarea
                    id="import-data"
                    v-model="importData"
                    rows="3"
                    placeholder="Paste data here..."
                    aria-label="Paste blocklist data to import"
                  />
                  <Button
                    label="Import"
                    icon="pi pi-upload"
                    @click="doImport"
                    :disabled="!importData"
                    aria-label="Import blocklist data"
                  />
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
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import {
  Card,
  Panel,
  Button,
  InputText,
  InputNumber,
  Dropdown,
  Textarea,
  DataTable,
  Column,
  Tag,
  Message,
  Divider,
} from './shared-components'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// AMI Connection - use standardized storage key
const amiUrl = ref(localStorage.getItem('vuesip-ami-url') || 'ws://localhost:8089/ws')
const connecting = ref(false)
const realIsConnected = computed(() => playgroundAmiClient.isConnected.value)

// Effective values for simulation
const isConnected = computed(() =>
  isSimulationMode.value ? simulation.isConnected.value : realIsConnected.value
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

// blacklist composable
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
    result = result.filter((e) => e.status === filterStatus.value)
  }

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(
      (e) => e.number.toLowerCase().includes(term) || e.description?.toLowerCase().includes(term)
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
/* Screen reader only class for accessible labels */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

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
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
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
