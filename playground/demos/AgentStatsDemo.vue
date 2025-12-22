<template>
  <div class="agent-stats-demo">
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

    <Message severity="info" :closable="false" class="mb-4">
      <template #default>
        <div>
          <p class="m-0 mb-2">
            The Agent Statistics feature tracks individual agent performance metrics in real-time.
            Monitor KPIs like calls per hour, average handle time, service level, and occupancy rates.
          </p>
          <p class="m-0 text-sm">
            <i class="pi pi-info-circle mr-1"></i>
            <strong>Note:</strong> This demo simulates agent call activity. In production, statistics
            are automatically collected from AMI events when agents handle queue calls.
          </p>
        </div>
      </template>
    </Message>

    <!-- Controls -->
    <Panel header="Agent Configuration" class="mb-4">
      <div class="flex flex-wrap gap-4 align-items-end">
        <div class="flex flex-column gap-2">
          <label for="agent-id" class="font-medium">Agent ID</label>
          <InputText
            id="agent-id"
            v-model="agentIdInput"
            placeholder="e.g., 1001"
            :disabled="isTracking"
            class="w-12rem"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="period" class="font-medium">Period</label>
          <Dropdown
            id="period"
            v-model="selectedPeriod"
            :options="periodOptions"
            option-label="label"
            option-value="value"
            :disabled="isTracking"
            class="w-12rem"
            @change="handlePeriodChange"
          />
        </div>
        <div class="flex gap-2 flex-wrap">
          <Button
            v-if="!isTracking"
            label="Start Tracking"
            icon="pi pi-play"
            severity="success"
            @click="handleStartTracking"
          />
          <Button
            v-else
            label="Stop Tracking"
            icon="pi pi-stop"
            severity="danger"
            @click="handleStopTracking"
          />
          <Button
            label="Simulate Call"
            icon="pi pi-phone"
            severity="secondary"
            :disabled="!isTracking"
            @click="handleSimulateCall"
          />
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            severity="secondary"
            :disabled="!isTracking || !stats"
            @click="handleRefresh"
          />
        </div>
      </div>
    </Panel>

    <!-- Performance Level Badge -->
    <div v-if="stats" class="flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
      <Tag
        :value="formatPerformanceLevel(performanceLevel)"
        :severity="getPerformanceSeverity(performanceLevel)"
        :icon="getPerformanceIcon(performanceLevel)"
        class="text-lg px-4 py-2"
      />
      <div class="flex align-items-center gap-2 text-color-secondary text-sm">
        <i class="pi pi-clock"></i>
        <span>Last updated: {{ formatTime(stats.lastUpdated) }}</span>
      </div>
    </div>

    <!-- KPI Cards -->
    <div v-if="stats" class="grid mb-4">
      <div class="col-12 md:col-6 lg:col-4 xl:col-2">
        <Card class="kpi-card-prime">
          <template #content>
            <div class="flex align-items-center gap-3">
              <div class="kpi-icon-wrapper bg-blue-100 text-blue-600">
                <i class="pi pi-phone text-2xl"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-blue-600">{{ callsPerHour.toFixed(1) }}</div>
                <div class="text-sm text-color-secondary font-medium">Calls/Hour</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-4 xl:col-2">
        <Card class="kpi-card-prime">
          <template #content>
            <div class="flex align-items-center gap-3">
              <div class="kpi-icon-wrapper bg-purple-100 text-purple-600">
                <i class="pi pi-clock text-2xl"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-purple-600">{{ formatSeconds(avgHandleTime) }}</div>
                <div class="text-sm text-color-secondary font-medium">Avg Handle Time</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-4 xl:col-2">
        <Card class="kpi-card-prime">
          <template #content>
            <div class="flex align-items-center gap-3">
              <div class="kpi-icon-wrapper bg-pink-100 text-pink-600">
                <i class="pi pi-bullseye text-2xl"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-pink-600">{{ serviceLevel.toFixed(1) }}%</div>
                <div class="text-sm text-color-secondary font-medium">Service Level</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-4 xl:col-2">
        <Card class="kpi-card-prime">
          <template #content>
            <div class="flex align-items-center gap-3">
              <div class="kpi-icon-wrapper bg-green-100 text-green-600">
                <i class="pi pi-chart-line text-2xl"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-600">{{ occupancy.toFixed(1) }}%</div>
                <div class="text-sm text-color-secondary font-medium">Occupancy</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-4 xl:col-2">
        <Card class="kpi-card-prime">
          <template #content>
            <div class="flex align-items-center gap-3">
              <div class="kpi-icon-wrapper bg-orange-100 text-orange-600">
                <i class="pi pi-bolt text-2xl"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-orange-600">{{ utilization.toFixed(1) }}%</div>
                <div class="text-sm text-color-secondary font-medium">Utilization</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
      <div class="col-12 md:col-6 lg:col-4 xl:col-2">
        <Card class="kpi-card-prime">
          <template #content>
            <div class="flex align-items-center gap-3">
              <div class="kpi-icon-wrapper bg-indigo-100 text-indigo-600">
                <i class="pi pi-microphone text-2xl"></i>
              </div>
              <div>
                <div class="text-2xl font-bold text-indigo-600">{{ formattedTalkTime }}</div>
                <div class="text-sm text-color-secondary font-medium">Total Talk Time</div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Call Statistics -->
    <Panel v-if="stats" header="Call Statistics" class="mb-4">
      <template #icons>
        <i class="pi pi-phone text-primary"></i>
      </template>
      <div class="grid">
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3">
            <div class="text-sm text-color-secondary mb-1">Total Calls</div>
            <div class="text-xl font-bold">{{ stats.totalCalls }}</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3">
            <div class="text-sm text-color-secondary mb-1">Inbound</div>
            <div class="text-xl font-bold text-blue-600">{{ stats.inboundCalls }}</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3">
            <div class="text-sm text-color-secondary mb-1">Outbound</div>
            <div class="text-xl font-bold text-green-600">{{ stats.outboundCalls }}</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card bg-red-50 border-round p-3">
            <div class="text-sm text-color-secondary mb-1">Missed</div>
            <div class="text-xl font-bold text-red-600">{{ stats.missedCalls }}</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3">
            <div class="text-sm text-color-secondary mb-1">Transferred</div>
            <div class="text-xl font-bold text-purple-600">{{ stats.transferredCalls }}</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3">
            <div class="text-sm text-color-secondary mb-1">FCR Rate</div>
            <div class="text-xl font-bold text-teal-600">{{ stats.performance.fcrRate.toFixed(1) }}%</div>
          </div>
        </div>
      </div>
    </Panel>

    <!-- Alerts -->
    <Panel v-if="alerts.length > 0" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-exclamation-triangle text-orange-500"></i>
          <span class="font-bold">Active Alerts</span>
          <Tag :value="String(alertCount)" severity="danger" rounded class="ml-2" />
        </div>
      </template>
      <div class="flex flex-column gap-3 mb-3">
        <Message
          v-for="alert in alerts"
          :key="alert.id"
          :severity="getAlertSeverity(alert.level)"
          :closable="false"
          :class="{ 'opacity-60': alert.acknowledged }"
        >
          <template #default>
            <div class="flex align-items-start justify-content-between gap-3 w-full">
              <div class="flex-1">
                <div class="flex align-items-center gap-2 mb-2">
                  <Tag
                    :value="alert.level === 'critical' ? 'Critical' : 'Warning'"
                    :severity="alert.level === 'critical' ? 'danger' : 'warn'"
                    class="text-xs"
                  />
                  <span class="text-sm text-color-secondary flex align-items-center gap-1">
                    <i class="pi pi-clock text-xs"></i>
                    {{ formatTime(alert.timestamp) }}
                  </span>
                </div>
                <div class="font-medium">{{ alert.message }}</div>
              </div>
              <Button
                v-if="!alert.acknowledged"
                icon="pi pi-check"
                severity="success"
                size="small"
                rounded
                outlined
                v-tooltip.top="'Acknowledge'"
                @click="acknowledgeAlert(alert.id)"
              />
            </div>
          </template>
        </Message>
      </div>
      <Button
        v-if="alertCount > 0"
        label="Acknowledge All"
        icon="pi pi-check-circle"
        severity="success"
        size="small"
        @click="acknowledgeAllAlerts"
      />
    </Panel>

    <!-- Queue Stats -->
    <Panel v-if="stats && topQueues.length > 0" header="Queue Performance" class="mb-4">
      <template #icons>
        <i class="pi pi-users text-primary"></i>
      </template>
      <DataTable :value="topQueues" stripedRows class="p-datatable-sm">
        <Column field="queue" header="Queue">
          <template #body="{ data }">
            <span class="font-semibold">{{ data.queue }}</span>
          </template>
        </Column>
        <Column field="callsHandled" header="Handled">
          <template #body="{ data }">
            <Tag :value="String(data.callsHandled)" severity="success" />
          </template>
        </Column>
        <Column field="callsMissed" header="Missed">
          <template #body="{ data }">
            <Tag :value="String(data.callsMissed)" :severity="data.callsMissed > 0 ? 'danger' : 'secondary'" />
          </template>
        </Column>
        <Column header="Avg Handle Time">
          <template #body="{ data }">
            <span class="font-mono text-primary">{{ formatSeconds(data.avgHandleTime) }}</span>
          </template>
        </Column>
      </DataTable>
    </Panel>

    <!-- Hourly Distribution -->
    <Panel v-if="stats && hasHourlyData" class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-chart-bar text-primary"></i>
          <span class="font-bold">Hourly Distribution</span>
        </div>
      </template>
      <div class="hourly-chart">
        <div v-for="hour in getHourlyBreakdown()" :key="hour.hour" class="hour-bar-container">
          <div class="hour-bar-wrapper">
            <div
              class="hour-bar"
              :style="{ height: getBarHeight(hour.callCount) + '%' }"
              :class="{ 'peak-hour': peakHours.includes(hour.hour) }"
              v-tooltip.top="{ value: `${hour.hour}:00 - ${hour.callCount} calls`, showDelay: 200 }"
            >
            </div>
          </div>
          <span class="hour-label" :class="{ 'peak-label': peakHours.includes(hour.hour) }">{{
            hour.hour
          }}</span>
        </div>
      </div>
      <div v-if="peakHours.length > 0" class="flex align-items-center gap-2 mt-3 p-3 surface-100 border-round">
        <i class="pi pi-chart-line text-orange-500"></i>
        <span class="text-color-secondary font-medium">Peak hours:</span>
        <div class="flex gap-2 flex-wrap">
          <Tag
            v-for="hour in peakHours"
            :key="hour"
            :value="`${hour}:00`"
            severity="warn"
            class="font-mono"
          />
        </div>
      </div>
    </Panel>

    <!-- Recent Calls -->
    <Panel v-if="stats && stats.recentCalls.length > 0" header="Recent Calls" class="mb-4">
      <template #icons>
        <i class="pi pi-history text-primary"></i>
      </template>
      <DataTable :value="stats.recentCalls.slice(0, 10)" stripedRows class="p-datatable-sm">
        <Column header="Direction" style="width: 80px">
          <template #body="{ data }">
            <Tag
              :value="data.direction === 'inbound' ? 'IN' : 'OUT'"
              :severity="data.direction === 'inbound' ? 'info' : 'secondary'"
              class="font-mono"
            />
          </template>
        </Column>
        <Column field="remoteParty" header="Remote Party">
          <template #body="{ data }">
            <div class="font-medium">{{ data.remoteParty }}</div>
            <div class="text-xs text-color-secondary">
              <span v-if="data.queue" class="mr-2">{{ data.queue }}</span>
              <span>{{ formatTime(data.startTime) }}</span>
            </div>
          </template>
        </Column>
        <Column header="Duration" style="width: 100px">
          <template #body="{ data }">
            <span v-if="data.disposition === 'answered'" class="font-mono text-primary">
              {{ formatSeconds(data.talkTime) }}
            </span>
            <span v-else class="text-color-secondary">-</span>
          </template>
        </Column>
        <Column header="Status" style="width: 100px">
          <template #body="{ data }">
            <Tag
              :value="data.disposition"
              :severity="getDispositionSeverity(data.disposition)"
              class="text-capitalize"
            />
          </template>
        </Column>
      </DataTable>
    </Panel>

    <!-- Export Actions -->
    <Panel v-if="stats" header="Export Data" class="mb-4">
      <template #icons>
        <i class="pi pi-download text-primary"></i>
      </template>
      <div class="flex gap-2 flex-wrap">
        <Button label="Export CSV" icon="pi pi-file" severity="secondary" @click="handleExportCsv" />
        <Button label="Export JSON" icon="pi pi-file-export" severity="secondary" @click="handleExportJson" />
        <Button label="Reset Stats" icon="pi pi-trash" severity="danger" outlined @click="handleResetStats" />
      </div>
    </Panel>

    <!-- Empty State -->
    <Message v-if="!stats && !isTracking" severity="info" :closable="false" class="mb-4">
      <template #default>
        <div class="text-center py-4">
          <i class="pi pi-chart-bar text-6xl text-color-secondary mb-3 block"></i>
          <h4 class="m-0 mb-2">No Statistics Available</h4>
          <p class="m-0 text-color-secondary">
            Enter an agent ID and click "Start Tracking" to begin monitoring agent performance.
          </p>
        </div>
      </template>
    </Message>

    <!-- Code Example -->
    <Panel header="Code Example" toggleable collapsed class="mb-4">
      <template #icons>
        <i class="pi pi-code text-primary"></i>
      </template>
      <pre class="surface-900 text-white p-4 border-round overflow-auto m-0"><code class="text-sm">import { useAmiAgentStats } from 'vuesip'
import { useAmi } from 'vuesip'

const ami = useAmi()
const {
  stats,
  performanceLevel,
  callsPerHour,
  avgHandleTime,
  serviceLevel,
  occupancy,
  alerts,
  startTracking,
  stopTracking,
  refresh,
  compareToTeam,
  exportCsv,
  acknowledgeAlert
} = useAmiAgentStats(ami.getClient(), {
  agentId: '1001',
  queues: ['sales', 'support'],
  period: 'today',
  realTimeUpdates: true,
  serviceLevelThreshold: 20,
  onAlert: (alert) => {
    console.log('Alert:', alert.message)
  }
})

// Start tracking
startTracking()

// Access metrics
console.log('Performance:', performanceLevel.value)
console.log('Calls/hour:', callsPerHour.value)

// Compare to team
const comparison = compareToTeam()
console.log('Strengths:', comparison?.strengths)

// Export data
const csv = exportCsv()
downloadFile(csv, 'agent-stats.csv')</code></pre>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type {
  AgentStatsPeriod,
  AgentPerformanceLevel,
  AgentCallDirection,
} from '../../src/types/agentstats.types'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// PrimeVue Components
import Card from 'primevue/card'
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Period options for dropdown
const periodOptions = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
]

// Helper functions for PrimeVue severity mapping
const getPerformanceSeverity = (
  level: AgentPerformanceLevel | null
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' => {
  switch (level) {
    case 'excellent':
      return 'success'
    case 'good':
      return 'info'
    case 'average':
      return 'warn'
    case 'needs_improvement':
      return 'danger'
    case 'critical':
      return 'danger'
    default:
      return 'secondary'
  }
}

const getPerformanceIcon = (level: AgentPerformanceLevel | null): string => {
  switch (level) {
    case 'excellent':
      return 'pi pi-star-fill'
    case 'good':
      return 'pi pi-check-circle'
    case 'average':
      return 'pi pi-minus-circle'
    case 'needs_improvement':
      return 'pi pi-exclamation-triangle'
    case 'critical':
      return 'pi pi-times-circle'
    default:
      return 'pi pi-info-circle'
  }
}

const getAlertSeverity = (level: string): 'success' | 'info' | 'warn' | 'error' => {
  switch (level) {
    case 'critical':
      return 'error'
    case 'warning':
      return 'warn'
    default:
      return 'info'
  }
}

const getDispositionSeverity = (
  disposition: string
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' => {
  switch (disposition) {
    case 'answered':
      return 'success'
    case 'missed':
      return 'danger'
    case 'transferred':
      return 'info'
    default:
      return 'secondary'
  }
}

// Simulated composable state (since AMI client is not available in playground)
const stats = ref<any>(null)
const _allAgentStats = ref<Map<string, any>>(new Map())
const alerts = ref<any[]>([])
const _isLoading = ref(false)
const _error = ref<string | null>(null)
const isTracking = ref(false)

// Form inputs
const agentIdInput = ref('1001')
const selectedPeriod = ref<AgentStatsPeriod>('today')

// Computed values
const performanceLevel = computed<AgentPerformanceLevel | null>(() => {
  return stats.value?.performanceLevel ?? null
})

const callsPerHour = computed(() => stats.value?.performance.callsPerHour ?? 0)
const avgHandleTime = computed(() => stats.value?.performance.avgHandleTime ?? 0)
const serviceLevel = computed(() => stats.value?.performance.serviceLevel ?? 100)
const occupancy = computed(() => stats.value?.performance.occupancy ?? 0)
const utilization = computed(() => stats.value?.performance.utilization ?? 0)
const formattedTalkTime = computed(() => formatDuration(stats.value?.totalTalkTime ?? 0))
const alertCount = computed(() => alerts.value.filter((a) => !a.acknowledged).length)

const topQueues = computed(() => {
  if (!stats.value?.queueStats.length) return []
  return [...stats.value.queueStats]
    .sort((a: any, b: any) => b.callsHandled - a.callsHandled)
    .slice(0, 5)
})

const peakHours = computed(() => {
  if (!stats.value?.hourlyStats.length) return []
  const sorted = [...stats.value.hourlyStats]
    .filter((h: any) => h.callCount > 0)
    .sort((a: any, b: any) => b.callCount - a.callCount)
  return sorted.slice(0, 3).map((h: any) => h.hour)
})

const hasHourlyData = computed(() => {
  return stats.value?.hourlyStats.some((h: any) => h.callCount > 0)
})


// Simulated tracking
let simulationTimer: ReturnType<typeof setInterval> | null = null

function handleStartTracking() {
  if (!agentIdInput.value.trim()) {
    alert('Please enter an agent ID')
    return
  }

  isTracking.value = true

  // Initialize stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  stats.value = {
    agentId: agentIdInput.value,
    interface: `PJSIP/${agentIdInput.value}`,
    name: `Agent ${agentIdInput.value}`,
    period: selectedPeriod.value,
    periodStart: todayStart,
    periodEnd: todayEnd,
    totalCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    internalCalls: 0,
    missedCalls: 0,
    transferredCalls: 0,
    voicemailCalls: 0,
    totalTalkTime: 0,
    totalHoldTime: 0,
    totalWrapTime: 0,
    totalHandleTime: 0,
    totalLoginTime: 3600, // Simulated 1 hour login
    totalAvailableTime: 0,
    totalPausedTime: 0,
    totalOnCallTime: 0,
    performance: {
      callsPerHour: 0,
      avgHandleTime: 0,
      avgTalkTime: 0,
      avgWrapTime: 0,
      avgHoldTime: 0,
      fcrRate: 100,
      serviceLevel: 100,
      occupancy: 0,
      utilization: 0,
      avgQualityScore: 0,
      transferRate: 0,
      holdRate: 0,
    },
    queueStats: [],
    hourlyStats: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      callCount: 0,
      talkTime: 0,
      avgHandleTime: 0,
      serviceLevel: 0,
    })),
    recentCalls: [],
    performanceLevel: 'average' as AgentPerformanceLevel,
    lastUpdated: new Date(),
  }
}

function handleStopTracking() {
  isTracking.value = false
  if (simulationTimer) {
    clearInterval(simulationTimer)
    simulationTimer = null
  }
}

function handleSimulateCall() {
  if (!stats.value) return

  const queues = ['sales', 'support', 'billing']
  const directions: AgentCallDirection[] = ['inbound', 'outbound']
  const dispositions = ['answered', 'answered', 'answered', 'missed', 'transferred'] as const

  const direction = directions[Math.floor(Math.random() * directions.length)]
  const disposition = dispositions[Math.floor(Math.random() * dispositions.length)]
  const queue = queues[Math.floor(Math.random() * queues.length)]
  const talkTime = disposition === 'answered' ? Math.floor(Math.random() * 300) + 60 : 0
  const waitTime = Math.floor(Math.random() * 30)
  const wrapTime = disposition === 'answered' ? Math.floor(Math.random() * 60) : 0
  const hour = new Date().getHours()

  const call = {
    callId: `call-${Date.now()}`,
    queue: direction === 'inbound' ? queue : undefined,
    remoteParty: `+1555${Math.floor(Math.random() * 10000000)
      .toString()
      .padStart(7, '0')}`,
    direction,
    startTime: new Date(Date.now() - (talkTime + waitTime) * 1000),
    answerTime: disposition === 'answered' ? new Date(Date.now() - talkTime * 1000) : undefined,
    endTime: new Date(),
    waitTime,
    talkTime,
    holdTime: 0,
    wrapTime,
    disposition,
    recorded: Math.random() > 0.5,
    qualityScore: disposition === 'answered' ? 3 + Math.random() * 2 : undefined,
  }

  // Add call to recent calls
  stats.value.recentCalls.unshift(call)
  if (stats.value.recentCalls.length > 50) {
    stats.value.recentCalls = stats.value.recentCalls.slice(0, 50)
  }

  // Update totals
  stats.value.totalCalls++
  stats.value.totalTalkTime += talkTime
  stats.value.totalWrapTime += wrapTime
  stats.value.totalHandleTime += talkTime + wrapTime

  if (direction === 'inbound') stats.value.inboundCalls++
  else if (direction === 'outbound') stats.value.outboundCalls++

  if (disposition === 'missed') stats.value.missedCalls++
  else if (disposition === 'transferred') stats.value.transferredCalls++

  // Update hourly stats
  const hourlyBucket = stats.value.hourlyStats[hour]
  hourlyBucket.callCount++
  hourlyBucket.talkTime += talkTime

  // Update queue stats
  if (call.queue) {
    let queueStats = stats.value.queueStats.find((q: any) => q.queue === call.queue)
    if (!queueStats) {
      queueStats = {
        queue: call.queue,
        callsHandled: 0,
        callsMissed: 0,
        talkTime: 0,
        avgHandleTime: 0,
        avgWaitTime: 0,
        serviceLevel: 100,
        loginTime: 0,
        availableTime: 0,
        pausedTime: 0,
      }
      stats.value.queueStats.push(queueStats)
    }
    if (disposition === 'answered') {
      queueStats.callsHandled++
      queueStats.talkTime += talkTime
    } else if (disposition === 'missed') {
      queueStats.callsMissed++
    }
  }

  // Update performance metrics
  updatePerformance()

  // Check thresholds
  checkThresholds()

  stats.value.lastUpdated = new Date()
}

function updatePerformance() {
  if (!stats.value) return

  const {
    totalCalls,
    totalTalkTime,
    totalHandleTime,
    totalWrapTime,
    totalLoginTime,
    transferredCalls,
  } = stats.value
  const loginHours = totalLoginTime / 3600

  stats.value.performance = {
    callsPerHour: loginHours > 0 ? totalCalls / loginHours : 0,
    avgHandleTime: totalCalls > 0 ? totalHandleTime / totalCalls : 0,
    avgTalkTime: totalCalls > 0 ? totalTalkTime / totalCalls : 0,
    avgWrapTime: totalCalls > 0 ? totalWrapTime / totalCalls : 0,
    avgHoldTime: 0,
    fcrRate: totalCalls > 0 ? ((totalCalls - transferredCalls) / totalCalls) * 100 : 100,
    serviceLevel: calculateServiceLevel(),
    occupancy: totalLoginTime > 0 ? (totalTalkTime / totalLoginTime) * 100 : 0,
    utilization: totalLoginTime > 0 ? ((totalTalkTime + totalWrapTime) / totalLoginTime) * 100 : 0,
    avgQualityScore: calculateAvgQualityScore(),
    transferRate: totalCalls > 0 ? (transferredCalls / totalCalls) * 100 : 0,
    holdRate: 0,
  }

  stats.value.performanceLevel = calculatePerformanceLevel()
}

function calculateServiceLevel(): number {
  if (!stats.value) return 100
  const answeredInTime = stats.value.recentCalls.filter(
    (c: any) => c.disposition === 'answered' && c.waitTime <= 20
  ).length
  const totalAnswered = stats.value.recentCalls.filter(
    (c: any) => c.disposition === 'answered'
  ).length
  return totalAnswered > 0 ? (answeredInTime / totalAnswered) * 100 : 100
}

function calculateAvgQualityScore(): number {
  if (!stats.value) return 0
  const callsWithQuality = stats.value.recentCalls.filter((c: any) => c.qualityScore !== undefined)
  if (callsWithQuality.length === 0) return 0
  const sum = callsWithQuality.reduce((acc: number, c: any) => acc + (c.qualityScore || 0), 0)
  return sum / callsWithQuality.length
}

function calculatePerformanceLevel(): AgentPerformanceLevel {
  if (!stats.value) return 'average'

  const metrics = stats.value.performance
  let score = 0
  let factors = 0

  // Service level (weight: 3)
  if (metrics.serviceLevel >= 90) score += 15
  else if (metrics.serviceLevel >= 80) score += 12
  else if (metrics.serviceLevel >= 70) score += 9
  else if (metrics.serviceLevel >= 60) score += 6
  else score += 3
  factors += 15

  // Occupancy (weight: 2)
  if (metrics.occupancy >= 80) score += 10
  else if (metrics.occupancy >= 60) score += 8
  else if (metrics.occupancy >= 40) score += 6
  else if (metrics.occupancy >= 20) score += 4
  else score += 2
  factors += 10

  // Handle time (weight: 2)
  if (metrics.avgHandleTime > 0) {
    if (metrics.avgHandleTime <= 180) score += 10
    else if (metrics.avgHandleTime <= 300) score += 8
    else if (metrics.avgHandleTime <= 450) score += 6
    else if (metrics.avgHandleTime <= 600) score += 4
    else score += 2
    factors += 10
  }

  // Calls per hour (weight: 1)
  if (metrics.callsPerHour >= 10) score += 5
  else if (metrics.callsPerHour >= 7) score += 4
  else if (metrics.callsPerHour >= 5) score += 3
  else if (metrics.callsPerHour >= 3) score += 2
  else score += 1
  factors += 5

  const percentage = (score / factors) * 100

  if (percentage >= 85) return 'excellent'
  if (percentage >= 70) return 'good'
  if (percentage >= 55) return 'average'
  if (percentage >= 40) return 'needs_improvement'
  return 'critical'
}

function checkThresholds() {
  if (!stats.value) return

  const thresholds = [
    {
      metric: 'avgHandleTime',
      warningThreshold: 300,
      criticalThreshold: 600,
      higherIsBetter: false,
    },
    { metric: 'serviceLevel', warningThreshold: 80, criticalThreshold: 60, higherIsBetter: true },
    { metric: 'occupancy', warningThreshold: 30, criticalThreshold: 20, higherIsBetter: true },
  ]

  for (const threshold of thresholds) {
    const value = stats.value.performance[threshold.metric]
    let level: 'warning' | 'critical' | null = null

    if (threshold.higherIsBetter) {
      if (value < threshold.criticalThreshold) level = 'critical'
      else if (value < threshold.warningThreshold) level = 'warning'
    } else {
      if (value > threshold.criticalThreshold) level = 'critical'
      else if (value > threshold.warningThreshold) level = 'warning'
    }

    if (level) {
      const existingAlert = alerts.value.find(
        (a) => a.agentId === stats.value.agentId && a.metric === threshold.metric && !a.acknowledged
      )

      if (!existingAlert) {
        alerts.value.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          agentId: stats.value.agentId,
          metric: threshold.metric,
          currentValue: value,
          thresholdValue:
            level === 'critical' ? threshold.criticalThreshold : threshold.warningThreshold,
          level,
          message: `${threshold.metric} is ${threshold.higherIsBetter ? 'below' : 'above'} ${level} threshold: ${value.toFixed(1)}`,
          timestamp: new Date(),
          acknowledged: false,
        })
      }
    }
  }
}

function handleRefresh() {
  if (!stats.value) return
  updatePerformance()
  stats.value.lastUpdated = new Date()
}

function handlePeriodChange() {
  // Period change would reset stats in real implementation
  if (stats.value) {
    stats.value.period = selectedPeriod.value
  }
}

function acknowledgeAlert(alertId: string) {
  const alert = alerts.value.find((a) => a.id === alertId)
  if (alert) {
    alert.acknowledged = true
  }
}

function acknowledgeAllAlerts() {
  alerts.value.forEach((alert) => {
    alert.acknowledged = true
  })
}

function getHourlyBreakdown() {
  return stats.value?.hourlyStats || []
}

function getBarHeight(callCount: number): number {
  if (!stats.value) return 0
  const maxCalls = Math.max(...stats.value.hourlyStats.map((h: any) => h.callCount), 1)
  return (callCount / maxCalls) * 100
}

function handleExportCsv() {
  if (!stats.value) return

  const headers = [
    'Call ID',
    'Queue',
    'Remote Party',
    'Direction',
    'Start Time',
    'End Time',
    'Wait Time',
    'Talk Time',
    'Disposition',
  ]

  const rows = stats.value.recentCalls.map((call: any) =>
    [
      call.callId,
      call.queue || '',
      call.remoteParty,
      call.direction,
      call.startTime.toISOString(),
      call.endTime?.toISOString() || '',
      call.waitTime,
      call.talkTime,
      call.disposition,
    ].join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  downloadFile(csv, 'agent-stats.csv', 'text/csv')
}

function handleExportJson() {
  if (!stats.value) return
  const json = JSON.stringify(stats.value, null, 2)
  downloadFile(json, 'agent-stats.json', 'application/json')
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function handleResetStats() {
  if (!confirm('Are you sure you want to reset all statistics?')) return
  if (stats.value) {
    handleStopTracking()
    stats.value = null
    alerts.value = []
  }
}

// Utility functions
function formatSeconds(seconds: number): string {
  if (seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatPerformanceLevel(level: AgentPerformanceLevel | null): string {
  if (!level) return 'Unknown'
  return level
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

onUnmounted(() => {
  handleStopTracking()
})
</script>

<style scoped>
.agent-stats-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* KPI Card Styling for PrimeVue Card */
.kpi-card-prime {
  height: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.kpi-card-prime:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.kpi-card-prime :deep(.p-card-body) {
  padding: 1rem;
}

.kpi-card-prime :deep(.p-card-content) {
  padding: 0;
}

.kpi-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.kpi-card-prime:hover .kpi-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

/* Stat Card in Call Statistics Panel */
.stat-card {
  text-align: center;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

/* Hourly Chart Custom Styling */
.hourly-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  padding: 0.5rem;
  background: var(--surface-50);
  border-radius: 8px;
}

.hour-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.hour-bar-wrapper {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: flex-end;
}

.hour-bar {
  width: 100%;
  background: linear-gradient(to top, var(--primary-color), var(--primary-400));
  border-radius: 4px 4px 0 0;
  min-height: 2px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.hour-bar:hover {
  transform: scaleY(1.05);
  filter: brightness(1.1);
}

.hour-bar.peak-hour {
  background: linear-gradient(to top, var(--orange-500), var(--orange-400));
}

.hour-label {
  font-size: 0.625rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
  font-weight: 600;
}

.hour-label.peak-label {
  color: var(--orange-500);
  font-weight: 700;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .agent-stats-demo {
    padding: 1rem;
  }
}
</style>
