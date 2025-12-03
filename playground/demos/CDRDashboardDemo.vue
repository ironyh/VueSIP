<template>
  <div class="cdr-dashboard-demo">
    <h2>📊 CDR Dashboard</h2>
    <p class="description">
      Real-time Call Detail Record (CDR) processing and analytics via AMI.
      View call statistics, agent performance, and export data.
    </p>

    <!-- AMI Connection Status -->
    <div class="status-section">
      <div :class="['status-badge', amiConnected ? 'connected' : 'disconnected']">
        AMI: {{ amiConnected ? 'CONNECTED' : 'DISCONNECTED' }}
      </div>
      <div v-if="totalCount > 0" class="count-badge">{{ totalCount }} CDR Records</div>
    </div>

    <!-- AMI Configuration -->
    <div class="config-section">
      <h3>AMI Configuration</h3>
      <div class="form-row">
        <div class="form-group">
          <label>WebSocket URL</label>
          <input v-model="amiUrl" type="text" placeholder="ws://localhost:8088/ami" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="amiUsername" type="text" placeholder="admin" />
        </div>
        <div class="form-group">
          <label>Secret</label>
          <input v-model="amiSecret" type="password" placeholder="secret" />
        </div>
      </div>
      <button @click="toggleAmiConnection" :disabled="isConnecting">
        {{ amiConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect' }}
      </button>
    </div>

    <!-- Stats Overview -->
    <div v-if="amiConnected" class="stats-overview">
      <h3>Today's Statistics</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalCalls }}</div>
          <div class="stat-label">Total Calls</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">{{ stats.answeredCalls }}</div>
          <div class="stat-label">Answered</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">{{ stats.missedCalls }}</div>
          <div class="stat-label">Missed</div>
        </div>
        <div class="stat-card error">
          <div class="stat-value">{{ stats.failedCalls }}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatDuration(stats.averageTalkTime) }}</div>
          <div class="stat-label">Avg Talk Time</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ formatPercent(stats.answerRate) }}</div>
          <div class="stat-label">Answer Rate</div>
        </div>
      </div>
    </div>

    <!-- Disposition Chart -->
    <div v-if="amiConnected && stats.totalCalls > 0" class="disposition-chart">
      <h3>Call Disposition</h3>
      <div class="disposition-bars">
        <div
          v-for="(count, disposition) in stats.byDisposition"
          :key="disposition"
          class="disposition-bar"
          :style="{ width: getDispositionWidth(count) + '%' }"
          :class="getDispositionClass(disposition)"
        >
          <span class="disposition-label">{{ disposition }}</span>
          <span class="disposition-count">{{ count }}</span>
        </div>
      </div>
    </div>

    <!-- Agent Stats -->
    <div v-if="amiConnected && Object.keys(agentStatsData).length > 0" class="agent-stats-section">
      <h3>Agent Performance</h3>
      <div class="agent-cards">
        <div v-for="(agentStat, agent) in agentStatsData" :key="agent" class="agent-card">
          <div class="agent-header">
            <span class="agent-name">Agent {{ agent }}</span>
            <span class="agent-calls">{{ agentStat.callsHandled }} calls</span>
          </div>
          <div class="agent-metrics">
            <div class="metric">
              <span class="metric-label">Talk Time</span>
              <span class="metric-value">{{ formatDuration(agentStat.totalTalkTime) }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Talk</span>
              <span class="metric-value">{{ formatDuration(agentStat.averageTalkTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Queue Stats -->
    <div v-if="amiConnected && Object.keys(queueStatsData).length > 0" class="queue-stats-section">
      <h3>Queue Performance</h3>
      <div class="queue-cards">
        <div v-for="(queueStat, queue) in queueStatsData" :key="queue" class="queue-card">
          <div class="queue-header">
            <span class="queue-name">{{ queue }}</span>
            <span class="queue-sl" :class="getServiceLevelClass(queueStat.serviceLevelPct)">
              SL: {{ formatPercent(queueStat.serviceLevelPct) }}
            </span>
          </div>
          <div class="queue-metrics">
            <div class="metric">
              <span class="metric-label">Offered</span>
              <span class="metric-value">{{ queueStat.callsOffered }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Answered</span>
              <span class="metric-value">{{ queueStat.callsAnswered }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Abandoned</span>
              <span class="metric-value">{{ queueStat.callsAbandoned }}</span>
            </div>
            <div class="metric">
              <span class="metric-label">Avg Wait</span>
              <span class="metric-value">{{ formatDuration(queueStat.averageWaitTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CDR Records Table -->
    <div v-if="amiConnected" class="records-section">
      <div class="section-header">
        <h3>Recent CDR Records</h3>
        <div class="export-buttons">
          <button @click="handleExportCSV" class="export-btn">📥 Export CSV</button>
          <button @click="handleExportJSON" class="export-btn">📥 Export JSON</button>
          <button @click="clearRecords" class="clear-btn">🗑️ Clear</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Direction</label>
          <select v-model="filterDirection">
            <option value="">All</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Disposition</label>
          <select v-model="filterDisposition">
            <option value="">All</option>
            <option value="ANSWERED">Answered</option>
            <option value="NO ANSWER">No Answer</option>
            <option value="BUSY">Busy</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Search</label>
          <input v-model="searchQuery" type="text" placeholder="Source or destination..." />
        </div>
      </div>

      <div class="records-table-container">
        <table class="records-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Direction</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Duration</th>
              <th>Talk Time</th>
              <th>Disposition</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in filteredRecords"
              :key="record.uniqueId"
              :class="getRecordClass(record)"
            >
              <td class="time-col">{{ formatTime(record.startTime) }}</td>
              <td class="direction-col">
                <span :class="['direction-badge', record.direction]">
                  {{ getDirectionIcon(record.direction) }}
                </span>
              </td>
              <td class="source-col">{{ record.source || '-' }}</td>
              <td class="dest-col">{{ record.destination || '-' }}</td>
              <td class="duration-col">{{ formatDuration(record.duration) }}</td>
              <td class="billable-col">{{ formatDuration(record.billableSeconds) }}</td>
              <td class="disposition-col">
                <span :class="['disposition-badge', getDispositionClass(record.disposition)]">
                  {{ record.disposition }}
                </span>
              </td>
            </tr>
            <tr v-if="filteredRecords.length === 0">
              <td colspan="7" class="empty-row">No CDR records yet. Make some calls!</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Simulate CDR (for demo) -->
    <div v-if="amiConnected" class="simulate-section">
      <h3>Simulate CDR (Demo)</h3>
      <p class="hint">Generate sample CDR records to test the dashboard.</p>
      <div class="simulate-buttons">
        <button @click="simulateCdr('ANSWERED')" class="sim-btn answered">
          ✓ Answered Call
        </button>
        <button @click="simulateCdr('NO ANSWER')" class="sim-btn missed">⚪ Missed Call</button>
        <button @click="simulateCdr('BUSY')" class="sim-btn busy">📵 Busy</button>
        <button @click="simulateCdr('FAILED')" class="sim-btn failed">❌ Failed</button>
        <button @click="simulateMultiple" class="sim-btn multiple">📊 Generate 10 Random</button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-section">
      <p class="error-message">{{ error }}</p>
      <button @click="error = null">Dismiss</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useAmiCDR } from '../../src/composables/useAmiCDR'
import type {
  CdrDisposition,
  CdrDirection,
  CdrRecord,
  AgentCdrStats,
  QueueCdrStats,
} from '../../src/types/cdr.types'

// AMI Connection State (simulated for demo)
const amiUrl = ref('ws://localhost:8088/ami')
const amiUsername = ref('admin')
const amiSecret = ref('')
const amiConnected = ref(false)
const isConnecting = ref(false)

// Mock AMI Client for demo
const mockAmiClient = ref<{
  sendAction: (action: Record<string, string>) => Promise<{ data: { Response: string } }>
  on: (event: string, callback: (data: { data: Record<string, string> }) => void) => void
  off: (event: string, callback: (data: { data: Record<string, string> }) => void) => void
  _triggerEvent: (event: string, data: { data: Record<string, string> }) => void
} | null>(null)

// Filters
const filterDirection = ref<CdrDirection | ''>('')
const filterDisposition = ref<CdrDisposition | ''>('')
const searchQuery = ref('')

// Initialize useAmiCDR composable
const {
  records,
  stats,
  agentStats,
  queueStats,
  totalCount,
  error,
  getRecords: _getRecords,
  exportRecords,
  clearRecords: clearAllRecords,
} = useAmiCDR(mockAmiClient, {
  maxRecords: 100,
  autoStats: true,
  onCdr: (cdr) => {
    console.log('New CDR:', cdr.uniqueId, cdr.disposition)
  },
})

// Computed
const agentStatsData = computed(() => agentStats.value as Record<string, AgentCdrStats>)
const queueStatsData = computed(() => queueStats.value as Record<string, QueueCdrStats>)

const filteredRecords = computed(() => {
  let result = records.value

  if (filterDirection.value) {
    result = result.filter((r) => r.direction === filterDirection.value)
  }

  if (filterDisposition.value) {
    result = result.filter((r) => r.disposition === filterDisposition.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (r) =>
        r.source.toLowerCase().includes(query) || r.destination.toLowerCase().includes(query)
    )
  }

  return result.slice(0, 50) // Limit display
})

// Methods
const toggleAmiConnection = async () => {
  if (amiConnected.value) {
    mockAmiClient.value = null
    amiConnected.value = false
    clearAllRecords()
  } else {
    isConnecting.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Create mock AMI client with event triggering
      const eventListeners: Map<string, Set<(data: { data: Record<string, string> }) => void>> =
        new Map()

      mockAmiClient.value = {
        sendAction: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return { data: { Response: 'Success' } }
        },
        on: (event: string, callback: (data: { data: Record<string, string> }) => void) => {
          if (!eventListeners.has(event)) {
            eventListeners.set(event, new Set())
          }
          eventListeners.get(event)!.add(callback)
        },
        off: (event: string, callback: (data: { data: Record<string, string> }) => void) => {
          eventListeners.get(event)?.delete(callback)
        },
        _triggerEvent: (event: string, data: { data: Record<string, string> }) => {
          eventListeners.get(event)?.forEach((cb) => cb(data))
        },
      }

      amiConnected.value = true
    } catch (err) {
      console.error('Connection failed:', err)
    } finally {
      isConnecting.value = false
    }
  }
}

const simulateCdr = (disposition: CdrDisposition) => {
  if (!mockAmiClient.value) return

  const now = new Date()
  const duration = disposition === 'ANSWERED' ? Math.floor(Math.random() * 300) + 30 : Math.floor(Math.random() * 30)
  const billable = disposition === 'ANSWERED' ? duration - Math.floor(Math.random() * 10) : 0

  const sources = ['1001', '1002', '1003', '1004', '1005']
  const destinations = ['1001', '1002', '1003', '5551234567', '5559876543']
  const queues = ['sales', 'support', 'billing']
  const agents = ['1001', '1002', '1003']

  const startTime = new Date(now.getTime() - duration * 1000)
  const answerTime =
    disposition === 'ANSWERED'
      ? new Date(startTime.getTime() + Math.floor(Math.random() * 10) * 1000)
      : null

  const cdrEvent = {
    data: {
      Event: 'Cdr',
      AccountCode: '',
      Source: sources[Math.floor(Math.random() * sources.length)],
      Destination: destinations[Math.floor(Math.random() * destinations.length)],
      DestinationContext: 'default',
      CallerID: `"User" <${sources[Math.floor(Math.random() * sources.length)]}>`,
      Channel: `PJSIP/${sources[Math.floor(Math.random() * sources.length)]}-${Date.now().toString(16)}`,
      DestinationChannel: `PJSIP/${destinations[Math.floor(Math.random() * destinations.length)]}-${Date.now().toString(16)}`,
      LastApplication: Math.random() > 0.5 ? 'Queue' : 'Dial',
      LastData: Math.random() > 0.5 ? queues[Math.floor(Math.random() * queues.length)] : '',
      StartTime: startTime.toISOString(),
      AnswerTime: answerTime?.toISOString() || '',
      EndTime: now.toISOString(),
      Duration: duration.toString(),
      BillableSeconds: billable.toString(),
      Disposition: disposition,
      AMAFlags: 'DOCUMENTATION',
      UniqueID: `${Date.now()}.${Math.floor(Math.random() * 1000)}`,
      UserField: '',
    },
  }

  // Add agent if answered
  if (disposition === 'ANSWERED') {
    cdrEvent.data.DestinationChannel = `PJSIP/${agents[Math.floor(Math.random() * agents.length)]}-${Date.now().toString(16)}`
  }

  mockAmiClient.value._triggerEvent('event', cdrEvent)
}

const simulateMultiple = () => {
  const dispositions: CdrDisposition[] = ['ANSWERED', 'ANSWERED', 'ANSWERED', 'NO ANSWER', 'BUSY', 'ANSWERED', 'ANSWERED', 'CANCEL', 'ANSWERED', 'FAILED']
  dispositions.forEach((disp, i) => {
    setTimeout(() => simulateCdr(disp), i * 100)
  })
}

const handleExportCSV = () => {
  const csv = exportRecords({ format: 'csv', includeHeader: true })
  downloadFile(csv, 'cdr-export.csv', 'text/csv')
}

const handleExportJSON = () => {
  const json = exportRecords({ format: 'json' })
  downloadFile(json, 'cdr-export.json', 'application/json')
}

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const clearRecords = () => {
  clearAllRecords()
}

// Formatters
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins < 60) return `${mins}:${secs.toString().padStart(2, '0')}`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatPercent = (value: number): string => {
  return `${Math.round(value)}%`
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString()
}

const getDirectionIcon = (direction: CdrDirection): string => {
  switch (direction) {
    case 'inbound':
      return '📥'
    case 'outbound':
      return '📤'
    case 'internal':
      return '🔄'
    default:
      return '❓'
  }
}

const getDispositionClass = (disposition: string): string => {
  switch (disposition) {
    case 'ANSWERED':
      return 'success'
    case 'NO ANSWER':
    case 'CANCEL':
      return 'warning'
    case 'BUSY':
      return 'busy'
    case 'FAILED':
    case 'CONGESTION':
      return 'error'
    default:
      return ''
  }
}

const getDispositionWidth = (count: number): number => {
  if (stats.value.totalCalls === 0) return 0
  return Math.max(5, (count / stats.value.totalCalls) * 100)
}

const getRecordClass = (record: CdrRecord): string => {
  return record.disposition === 'ANSWERED' ? '' : 'faded'
}

const getServiceLevelClass = (sl: number): string => {
  if (sl >= 80) return 'sl-good'
  if (sl >= 60) return 'sl-warning'
  return 'sl-bad'
}

// Cleanup
onUnmounted(() => {
  if (amiConnected.value) {
    mockAmiClient.value = null
  }
})
</script>

<style scoped>
.cdr-dashboard-demo {
  max-width: 1200px;
  margin: 0 auto;
}

.description {
  color: #666;
  margin-bottom: 2rem;
}

.status-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.status-badge,
.count-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
}

.status-badge.connected {
  background-color: #10b981;
  color: white;
}

.status-badge.disconnected {
  background-color: #6b7280;
  color: white;
}

.count-badge {
  background-color: #3b82f6;
  color: white;
}

.config-section,
.stats-overview,
.disposition-chart,
.agent-stats-section,
.queue-stats-section,
.records-section,
.simulate-section,
.error-section {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.form-group {
  flex: 1;
  min-width: 200px;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

button {
  padding: 0.625rem 1.25rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background-color: #2563eb;
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.stat-card.success {
  border-left: 4px solid #10b981;
}

.stat-card.warning {
  border-left: 4px solid #f59e0b;
}

.stat-card.error {
  border-left: 4px solid #ef4444;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Disposition Chart */
.disposition-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.disposition-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background: #e5e7eb;
  min-width: 100px;
  transition: width 0.3s ease;
}

.disposition-bar.success {
  background: #10b981;
  color: white;
}

.disposition-bar.warning {
  background: #f59e0b;
  color: white;
}

.disposition-bar.busy {
  background: #8b5cf6;
  color: white;
}

.disposition-bar.error {
  background: #ef4444;
  color: white;
}

.disposition-label {
  font-weight: 500;
  font-size: 0.875rem;
}

.disposition-count {
  font-weight: 700;
}

/* Agent/Queue Cards */
.agent-cards,
.queue-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.agent-card,
.queue-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.agent-header,
.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.agent-name,
.queue-name {
  font-weight: 600;
}

.agent-calls {
  font-size: 0.875rem;
  color: #6b7280;
}

.queue-sl {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.queue-sl.sl-good {
  background: #d1fae5;
  color: #065f46;
}

.queue-sl.sl-warning {
  background: #fef3c7;
  color: #92400e;
}

.queue-sl.sl-bad {
  background: #fee2e2;
  color: #991b1b;
}

.agent-metrics,
.queue-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.metric-value {
  font-weight: 600;
}

/* Records Section */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-header h3 {
  margin: 0;
}

.export-buttons {
  display: flex;
  gap: 0.5rem;
}

.export-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  background-color: #6b7280;
}

.export-btn:hover:not(:disabled) {
  background-color: #4b5563;
}

.clear-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  background-color: #dc2626;
}

.clear-btn:hover:not(:disabled) {
  background-color: #b91c1c;
}

/* Filters */
.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 150px;
}

.filter-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.filter-group input,
.filter-group select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Records Table */
.records-table-container {
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.records-table th,
.records-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.records-table th {
  background: #f3f4f6;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

.records-table tbody tr:hover {
  background: #f9fafb;
}

.records-table tbody tr.faded {
  opacity: 0.7;
}

.direction-badge {
  font-size: 1rem;
}

.disposition-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.disposition-badge.success {
  background: #d1fae5;
  color: #065f46;
}

.disposition-badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.disposition-badge.busy {
  background: #ede9fe;
  color: #5b21b6;
}

.disposition-badge.error {
  background: #fee2e2;
  color: #991b1b;
}

.empty-row {
  text-align: center;
  color: #6b7280;
  padding: 2rem !important;
}

/* Simulate Section */
.simulate-section {
  background: #fffbeb;
  border-color: #fcd34d;
}

.hint {
  color: #92400e;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.simulate-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sim-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.sim-btn.answered {
  background-color: #10b981;
}

.sim-btn.answered:hover {
  background-color: #059669;
}

.sim-btn.missed {
  background-color: #f59e0b;
}

.sim-btn.missed:hover {
  background-color: #d97706;
}

.sim-btn.busy {
  background-color: #8b5cf6;
}

.sim-btn.busy:hover {
  background-color: #7c3aed;
}

.sim-btn.failed {
  background-color: #ef4444;
}

.sim-btn.failed:hover {
  background-color: #dc2626;
}

.sim-btn.multiple {
  background-color: #3b82f6;
}

/* Error Section */
.error-section {
  background: #fef2f2;
  border-color: #fecaca;
}

.error-message {
  color: #dc2626;
  margin: 0 0 1rem;
}
</style>
