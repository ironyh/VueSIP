<template>
  <div class="cdr-dashboard-demo">
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

    <h2>CDR Dashboard</h2>
    <p class="description">
      Real-time Call Detail Record (CDR) processing and analytics via AMI. View call statistics,
      agent performance, and export data.
    </p>

    <!-- AMI Connection Status -->
    <div class="flex flex-wrap align-items-center gap-3 mb-4">
      <Tag :severity="amiConnected ? 'success' : 'secondary'" class="px-3 py-2">
        <i :class="['mr-2', amiConnected ? 'pi pi-shield' : 'pi pi-ban']"></i>
        AMI: {{ amiConnected ? 'CONNECTED' : 'DISCONNECTED' }}
      </Tag>
      <Tag v-if="totalCount > 0" severity="info" class="px-3 py-2">
        <i class="pi pi-file mr-2"></i>
        {{ totalCount }} CDR Records
      </Tag>
    </div>

    <!-- AMI Configuration -->
    <Panel class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-cog"></i>
          <span class="font-semibold">AMI Configuration</span>
        </div>
      </template>
      <div class="grid">
        <div class="col-12 md:col-4">
          <label class="block text-sm font-medium mb-2">WebSocket URL</label>
          <InputText v-model="amiUrl" placeholder="ws://localhost:8088/ami" class="w-full" />
        </div>
        <div class="col-12 md:col-4">
          <label class="block text-sm font-medium mb-2">Username</label>
          <InputText v-model="amiUsername" placeholder="admin" class="w-full" />
        </div>
        <div class="col-12 md:col-4">
          <label class="block text-sm font-medium mb-2">Secret</label>
          <Password v-model="amiSecret" placeholder="secret" :feedback="false" class="w-full" toggleMask />
        </div>
      </div>
      <div class="mt-3">
        <Button
          :label="amiConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'"
          :icon="amiConnected ? 'pi pi-power-off' : 'pi pi-link'"
          :severity="amiConnected ? 'danger' : 'primary'"
          :loading="isConnecting"
          :disabled="isConnecting"
          @click="toggleAmiConnection"
        />
      </div>
    </Panel>

    <!-- Stats Overview -->
    <Panel v-if="amiConnected" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-chart-bar"></i>
          <span class="font-semibold">Today's Statistics</span>
        </div>
      </template>
      <div class="grid">
        <div class="col-12 sm:col-6 lg:col-4 xl:col-2">
          <div class="kpi-card total-calls">
            <div class="kpi-icon">
              <i class="pi pi-phone text-xl"></i>
            </div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats.totalCalls }}</div>
              <div class="kpi-label">Total Calls</div>
            </div>
          </div>
        </div>

        <div class="col-12 sm:col-6 lg:col-4 xl:col-2">
          <div class="kpi-card answered-calls">
            <div class="kpi-icon">
              <i class="pi pi-check text-xl"></i>
            </div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats.answeredCalls }}</div>
              <div class="kpi-label">Answered</div>
            </div>
          </div>
        </div>

        <div class="col-12 sm:col-6 lg:col-4 xl:col-2">
          <div class="kpi-card missed-calls">
            <div class="kpi-icon">
              <i class="pi pi-phone text-xl" style="transform: rotate(135deg)"></i>
            </div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats.missedCalls }}</div>
              <div class="kpi-label">Missed</div>
            </div>
          </div>
        </div>

        <div class="col-12 sm:col-6 lg:col-4 xl:col-2">
          <div class="kpi-card failed-calls">
            <div class="kpi-icon">
              <i class="pi pi-exclamation-circle text-xl"></i>
            </div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats.failedCalls }}</div>
              <div class="kpi-label">Failed</div>
            </div>
          </div>
        </div>

        <div class="col-12 sm:col-6 lg:col-4 xl:col-2">
          <div class="kpi-card talk-time">
            <div class="kpi-icon">
              <i class="pi pi-clock text-xl"></i>
            </div>
            <div class="kpi-content">
              <div class="kpi-value">{{ formatDuration(stats.averageTalkTime) }}</div>
              <div class="kpi-label">Avg Talk Time</div>
            </div>
          </div>
        </div>

        <div class="col-12 sm:col-6 lg:col-4 xl:col-2">
          <div class="kpi-card answer-rate">
            <div class="kpi-icon">
              <i class="pi pi-chart-line text-xl"></i>
            </div>
            <div class="kpi-content">
              <div class="kpi-value">{{ formatPercent(stats.answerRate) }}</div>
              <div class="kpi-label">Answer Rate</div>
            </div>
          </div>
        </div>
      </div>
    </Panel>

    <!-- Disposition Chart -->
    <Panel v-if="amiConnected && stats.totalCalls > 0" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-chart-pie"></i>
          <span class="font-semibold">Call Disposition</span>
        </div>
      </template>
      <div class="flex flex-column gap-2">
        <div
          v-for="(count, disposition) in stats.byDisposition"
          :key="disposition"
          class="disposition-bar"
          :style="{ width: getDispositionWidth(count) + '%' }"
          :class="getDispositionClass(disposition)"
        >
          <span class="font-medium text-sm">{{ disposition }}</span>
          <span class="font-bold">{{ count }}</span>
        </div>
      </div>
    </Panel>

    <!-- Agent Stats -->
    <Panel v-if="amiConnected && Object.keys(agentStatsData).length > 0" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-users"></i>
          <span class="font-semibold">Agent Performance</span>
        </div>
      </template>
      <div class="grid">
        <div v-for="(agentStat, agent) in agentStatsData" :key="agent" class="col-12 md:col-6 lg:col-4">
          <Card>
            <template #header>
              <div class="flex justify-content-between align-items-center p-3 surface-ground">
                <span class="font-semibold">Agent {{ agent }}</span>
                <Tag severity="info">{{ agentStat.callsHandled }} calls</Tag>
              </div>
            </template>
            <template #content>
              <div class="flex gap-4">
                <div class="flex flex-column">
                  <span class="text-sm text-500">Talk Time</span>
                  <span class="font-semibold">{{ formatDuration(agentStat.totalTalkTime) }}</span>
                </div>
                <div class="flex flex-column">
                  <span class="text-sm text-500">Avg Talk</span>
                  <span class="font-semibold">{{ formatDuration(agentStat.averageTalkTime) }}</span>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </Panel>

    <!-- Queue Stats -->
    <Panel v-if="amiConnected && Object.keys(queueStatsData).length > 0" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-th-large"></i>
          <span class="font-semibold">Queue Performance</span>
        </div>
      </template>
      <div class="grid">
        <div v-for="(queueStat, queue) in queueStatsData" :key="queue" class="col-12 md:col-6 lg:col-4">
          <Card>
            <template #header>
              <div class="flex justify-content-between align-items-center p-3 surface-ground">
                <span class="font-semibold">{{ queue }}</span>
                <Tag :severity="getServiceLevelSeverity(queueStat.serviceLevelPct)">
                  SL: {{ formatPercent(queueStat.serviceLevelPct) }}
                </Tag>
              </div>
            </template>
            <template #content>
              <div class="grid">
                <div class="col-6">
                  <div class="flex flex-column mb-2">
                    <span class="text-sm text-500">Offered</span>
                    <span class="font-semibold">{{ queueStat.callsOffered }}</span>
                  </div>
                  <div class="flex flex-column">
                    <span class="text-sm text-500">Abandoned</span>
                    <span class="font-semibold">{{ queueStat.callsAbandoned }}</span>
                  </div>
                </div>
                <div class="col-6">
                  <div class="flex flex-column mb-2">
                    <span class="text-sm text-500">Answered</span>
                    <span class="font-semibold">{{ queueStat.callsAnswered }}</span>
                  </div>
                  <div class="flex flex-column">
                    <span class="text-sm text-500">Avg Wait</span>
                    <span class="font-semibold">{{ formatDuration(queueStat.averageWaitTime) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </Panel>

    <!-- CDR Records Table -->
    <Panel v-if="amiConnected" class="mb-4">
      <template #header>
        <div class="flex justify-content-between align-items-center w-full flex-wrap gap-2">
          <div class="flex align-items-center gap-2">
            <i class="pi pi-list"></i>
            <span class="font-semibold">Recent CDR Records</span>
          </div>
          <div class="flex gap-2">
            <Button label="Export CSV" icon="pi pi-download" severity="secondary" size="small" @click="handleExportCSV" />
            <Button label="Export JSON" icon="pi pi-download" severity="secondary" size="small" @click="handleExportJSON" />
            <Button label="Clear" icon="pi pi-trash" severity="danger" size="small" @click="clearRecords" />
          </div>
        </div>
      </template>

      <!-- Filters -->
      <div class="grid mb-3">
        <div class="col-12 md:col-4">
          <label class="block text-sm text-500 mb-1">Direction</label>
          <Dropdown
            v-model="filterDirection"
            :options="directionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Directions"
            class="w-full"
          />
        </div>
        <div class="col-12 md:col-4">
          <label class="block text-sm text-500 mb-1">Disposition</label>
          <Dropdown
            v-model="filterDisposition"
            :options="dispositionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All Dispositions"
            class="w-full"
          />
        </div>
        <div class="col-12 md:col-4">
          <label class="block text-sm text-500 mb-1">Search</label>
          <InputText v-model="searchQuery" placeholder="Source or destination..." class="w-full" />
        </div>
      </div>

      <DataTable
        :value="filteredRecords"
        :rows="50"
        :rowClass="getRowClass"
        scrollable
        scrollHeight="400px"
        class="p-datatable-sm"
        emptyMessage="No CDR records yet. Make some calls!"
      >
        <Column field="startTime" header="Time" style="min-width: 100px">
          <template #body="{ data }">
            {{ formatTime(data.startTime) }}
          </template>
        </Column>
        <Column field="direction" header="Direction" style="min-width: 80px">
          <template #body="{ data }">
            <Tag :severity="getDirectionSeverity(data.direction)" size="small">
              {{ getDirectionLabel(data.direction) }}
            </Tag>
          </template>
        </Column>
        <Column field="source" header="Source" style="min-width: 100px">
          <template #body="{ data }">
            {{ data.source || '-' }}
          </template>
        </Column>
        <Column field="destination" header="Destination" style="min-width: 100px">
          <template #body="{ data }">
            {{ data.destination || '-' }}
          </template>
        </Column>
        <Column field="duration" header="Duration" style="min-width: 80px">
          <template #body="{ data }">
            {{ formatDuration(data.duration) }}
          </template>
        </Column>
        <Column field="billableSeconds" header="Talk Time" style="min-width: 80px">
          <template #body="{ data }">
            {{ formatDuration(data.billableSeconds) }}
          </template>
        </Column>
        <Column field="disposition" header="Disposition" style="min-width: 100px">
          <template #body="{ data }">
            <Tag :severity="getDispositionSeverity(data.disposition)" size="small">
              {{ data.disposition }}
            </Tag>
          </template>
        </Column>
      </DataTable>
    </Panel>

    <!-- Simulate CDR (for demo) -->
    <Panel v-if="amiConnected" class="mb-4 surface-warning">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-bolt"></i>
          <span class="font-semibold">Simulate CDR (Demo)</span>
        </div>
      </template>
      <Message severity="warn" :closable="false" class="mb-3">
        Generate sample CDR records to test the dashboard.
      </Message>
      <div class="flex flex-wrap gap-2">
        <Button label="Answered Call" icon="pi pi-check" severity="success" @click="simulateCdr('ANSWERED')" />
        <Button label="Missed Call" icon="pi pi-phone" severity="warn" @click="simulateCdr('NO ANSWER')" />
        <Button label="Busy" icon="pi pi-ban" severity="help" @click="simulateCdr('BUSY')" />
        <Button label="Failed" icon="pi pi-times" severity="danger" @click="simulateCdr('FAILED')" />
        <Button label="Generate 10 Random" icon="pi pi-sync" severity="info" @click="simulateMultiple" />
      </div>
    </Panel>

    <!-- Error Display -->
    <Message v-if="error" severity="error" :closable="true" @close="error = null" class="mb-4">
      {{ error }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useAmiCDR } from '../../src/composables/useAmiCDR'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import type {
  CdrDisposition,
  CdrDirection,
  CdrRecord,
  AgentCdrStats,
  QueueCdrStats,
} from '../../src/types/cdr.types'

// PrimeVue components
import Panel from 'primevue/panel'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Dropdown from 'primevue/dropdown'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

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

// Dropdown options for filters
const directionOptions = [
  { label: 'All', value: '' },
  { label: 'Inbound', value: 'inbound' },
  { label: 'Outbound', value: 'outbound' },
  { label: 'Internal', value: 'internal' },
]

const dispositionOptions = [
  { label: 'All', value: '' },
  { label: 'Answered', value: 'ANSWERED' },
  { label: 'No Answer', value: 'NO ANSWER' },
  { label: 'Busy', value: 'BUSY' },
  { label: 'Failed', value: 'FAILED' },
]

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
      (r) => r.source.toLowerCase().includes(query) || r.destination.toLowerCase().includes(query)
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
      const eventListeners: Map<
        string,
        Set<(data: { data: Record<string, string> }) => void>
      > = new Map()

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
  const duration =
    disposition === 'ANSWERED'
      ? Math.floor(Math.random() * 300) + 30
      : Math.floor(Math.random() * 30)
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
  const dispositions: CdrDisposition[] = [
    'ANSWERED',
    'ANSWERED',
    'ANSWERED',
    'NO ANSWER',
    'BUSY',
    'ANSWERED',
    'ANSWERED',
    'CANCEL',
    'ANSWERED',
    'FAILED',
  ]
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

const getDirectionLabel = (direction: CdrDirection): string => {
  switch (direction) {
    case 'inbound':
      return 'IN'
    case 'outbound':
      return 'OUT'
    case 'internal':
      return 'INT'
    default:
      return '?'
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



// PrimeVue severity helpers
const getServiceLevelSeverity = (sl: number): 'success' | 'warn' | 'danger' => {
  if (sl >= 80) return 'success'
  if (sl >= 60) return 'warn'
  return 'danger'
}

const getDirectionSeverity = (direction: CdrDirection): 'success' | 'info' | 'secondary' => {
  switch (direction) {
    case 'inbound':
      return 'success'
    case 'outbound':
      return 'info'
    case 'internal':
      return 'secondary'
    default:
      return 'secondary'
  }
}

const getDispositionSeverity = (disposition: string): 'success' | 'warn' | 'danger' | 'secondary' | 'info' => {
  switch (disposition) {
    case 'ANSWERED':
      return 'success'
    case 'NO ANSWER':
    case 'CANCEL':
      return 'warn'
    case 'BUSY':
      return 'info'
    case 'FAILED':
    case 'CONGESTION':
      return 'danger'
    default:
      return 'secondary'
  }
}

const getRowClass = (data: CdrRecord): string => {
  return data.disposition === 'ANSWERED' ? '' : 'opacity-70'
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
  color: var(--text-color-secondary);
  margin-bottom: 2rem;
}

/* KPI Cards */
.kpi-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  transition: all var(--transition-base);
  overflow: hidden;
  cursor: default;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: transparent;
}

.kpi-card:hover::before {
  opacity: 1;
}

/* KPI Card Variants */
.kpi-card.total-calls .kpi-icon {
  background: var(--gradient-blue);
}
.kpi-card.total-calls::before {
  background: var(--gradient-blue);
}
.kpi-card.total-calls:hover {
  box-shadow: var(--shadow-blue);
}

.kpi-card.answered-calls .kpi-icon {
  background: var(--gradient-green);
}
.kpi-card.answered-calls::before {
  background: var(--gradient-green);
}
.kpi-card.answered-calls:hover {
  box-shadow: var(--shadow-green);
}

.kpi-card.missed-calls .kpi-icon {
  background: var(--gradient-orange);
}
.kpi-card.missed-calls::before {
  background: var(--gradient-orange);
}

.kpi-card.failed-calls .kpi-icon {
  background: var(--gradient-red);
}
.kpi-card.failed-calls::before {
  background: var(--gradient-red);
}

.kpi-card.talk-time .kpi-icon {
  background: var(--gradient-purple);
}
.kpi-card.talk-time::before {
  background: var(--gradient-purple);
}
.kpi-card.talk-time:hover {
  box-shadow: var(--shadow-purple);
}

.kpi-card.answer-rate .kpi-icon {
  background: var(--gradient-indigo);
}
.kpi-card.answer-rate::before {
  background: var(--gradient-indigo);
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-on-gradient);
  box-shadow: var(--shadow-sm);
}

.kpi-content {
  flex: 1;
  min-width: 0;
}

.kpi-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  line-height: 1.2;
  background: linear-gradient(135deg, currentColor, currentColor);
  -webkit-background-clip: text;
  background-clip: text;
}

.kpi-card.answered-calls .kpi-value {
  background: var(--gradient-green);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.kpi-card.missed-calls .kpi-value {
  background: var(--gradient-orange);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.kpi-card.failed-calls .kpi-value {
  background: var(--gradient-red);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.kpi-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
  font-weight: var(--font-medium);
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

/* PrimeVue DataTable row styling */
:deep(.opacity-70) {
  opacity: 0.7;
}

/* Surface warning panel */
.surface-warning {
  background: var(--yellow-50);
}
</style>
