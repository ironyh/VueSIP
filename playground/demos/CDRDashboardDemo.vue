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

    <Card class="demo-card surface-card border-none shadow-2">
      <template #title>
        <div class="flex align-items-center gap-2 text-xl font-bold text-900 mb-2">
          <i class="pi pi-chart-bar text-primary text-2xl" aria-hidden="true"></i>
          <span>CDR Dashboard</span>
        </div>
      </template>
      <template #subtitle>
        <span class="text-600"
          >Real-time Call Detail Record (CDR) processing and analytics via AMI.</span
        >
      </template>
      <template #content>
        <!-- AMI Configuration & Status -->
        <Panel
          header="Connection"
          :toggleable="true"
          class="mb-4 connection-panel"
          :class="{ 'border-primary': amiConnected }"
        >
          <template #header>
            <div class="flex align-items-center gap-2">
              <i class="pi pi-server text-lg" aria-hidden="true"></i>
              <span class="font-semibold">AMI Configuration</span>
              <Tag
                v-if="amiConnected"
                class="ml-2"
                severity="success"
                value="Connected"
                icon="pi pi-check"
              />
              <Tag v-else class="ml-2" severity="danger" value="Disconnected" icon="pi pi-times" />
            </div>
          </template>

          <div class="form-grid grid p-fluid align-items-end">
            <div class="col-12 md:col-4">
              <label for="ami-url-input" class="font-medium text-600 mb-2 block"
                >WebSocket URL</label
              >
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon"
                  ><i class="pi pi-globe text-base" aria-hidden="true"></i
                ></span>
                <InputText
                  id="ami-url-input"
                  v-model="amiUrl"
                  placeholder="ws://localhost:8088/ami"
                  :disabled="amiConnected || isConnecting"
                  aria-required="true"
                />
              </div>
            </div>
            <div class="col-12 md:col-3">
              <label for="ami-username-input" class="font-medium text-600 mb-2 block"
                >Username</label
              >
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon"
                  ><i class="pi pi-user text-base" aria-hidden="true"></i
                ></span>
                <InputText
                  id="ami-username-input"
                  v-model="amiUsername"
                  placeholder="admin"
                  :disabled="amiConnected || isConnecting"
                  aria-required="true"
                />
              </div>
            </div>
            <div class="col-12 md:col-3">
              <label for="ami-secret-input" class="font-medium text-600 mb-2 block">Secret</label>
              <div class="p-inputgroup">
                <span class="p-inputgroup-addon"
                  ><i class="pi pi-lock text-base" aria-hidden="true"></i
                ></span>
                <Password
                  inputId="ami-secret-input"
                  v-model="amiSecret"
                  placeholder="It's a secret..."
                  :feedback="false"
                  toggleMask
                  :disabled="amiConnected || isConnecting"
                  inputClass="w-full"
                  aria-required="true"
                />
              </div>
            </div>
            <div class="col-12 md:col-2">
              <Button
                @click="toggleAmiConnection"
                :label="amiConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'"
                :icon="
                  isConnecting
                    ? 'pi pi-spin pi-spinner'
                    : amiConnected
                      ? 'pi pi-power-off'
                      : 'pi pi-link'
                "
                :severity="amiConnected ? 'danger' : 'primary'"
                :disabled="isConnecting"
                class="w-full"
                :aria-label="amiConnected ? 'Disconnect from AMI' : 'Connect to AMI'"
              />
            </div>
          </div>
        </Panel>

        <!-- Main Dashboard View -->
        <div v-if="amiConnected" class="fade-in">
          <!-- Stats Overview -->
          <div class="grid mb-4">
            <div class="col-12 md:col-6 lg:col-2">
              <div
                class="surface-card shadow-1 p-3 border-round h-full border-left-3 border-blue-500"
              >
                <div class="flex justify-content-between mb-3">
                  <div>
                    <span class="block text-500 font-medium mb-3">Total Calls</span>
                    <div class="text-900 font-medium text-xl">{{ stats.totalCalls }}</div>
                  </div>
                  <div
                    class="flex align-items-center justify-content-center bg-blue-100 border-round"
                    style="width: 2.5rem; height: 2.5rem"
                  >
                    <i class="pi pi-phone text-blue-500 text-xl" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 md:col-6 lg:col-2">
              <div
                class="surface-card shadow-1 p-3 border-round h-full border-left-3 border-green-500"
              >
                <div class="flex justify-content-between mb-3">
                  <div>
                    <span class="block text-500 font-medium mb-3">Answered</span>
                    <div class="text-900 font-medium text-xl">{{ stats.answeredCalls }}</div>
                  </div>
                  <div
                    class="flex align-items-center justify-content-center bg-green-100 border-round"
                    style="width: 2.5rem; height: 2.5rem"
                  >
                    <i class="pi pi-check-circle text-green-500 text-xl" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 md:col-6 lg:col-2">
              <div
                class="surface-card shadow-1 p-3 border-round h-full border-left-3 border-orange-500"
              >
                <div class="flex justify-content-between mb-3">
                  <div>
                    <span class="block text-500 font-medium mb-3">Missed</span>
                    <div class="text-900 font-medium text-xl">{{ stats.missedCalls }}</div>
                  </div>
                  <div
                    class="flex align-items-center justify-content-center bg-orange-100 border-round"
                    style="width: 2.5rem; height: 2.5rem"
                  >
                    <i
                      class="pi pi-phone text-orange-500 text-xl"
                      style="transform: rotate(135deg)"
                      aria-hidden="true"
                    ></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 md:col-6 lg:col-2">
              <div
                class="surface-card shadow-1 p-3 border-round h-full border-left-3 border-red-500"
              >
                <div class="flex justify-content-between mb-3">
                  <div>
                    <span class="block text-500 font-medium mb-3">Failed</span>
                    <div class="text-900 font-medium text-xl">{{ stats.failedCalls }}</div>
                  </div>
                  <div
                    class="flex align-items-center justify-content-center bg-red-100 border-round"
                    style="width: 2.5rem; height: 2.5rem"
                  >
                    <i class="pi pi-times-circle text-red-500 text-xl" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 md:col-6 lg:col-2">
              <div
                class="surface-card shadow-1 p-3 border-round h-full border-left-3 border-cyan-500"
              >
                <div class="flex justify-content-between mb-3">
                  <div>
                    <span class="block text-500 font-medium mb-3">Avg Talk</span>
                    <div class="text-900 font-medium text-xl">
                      {{ formatDuration(stats.averageTalkTime) }}
                    </div>
                  </div>
                  <div
                    class="flex align-items-center justify-content-center bg-cyan-100 border-round"
                    style="width: 2.5rem; height: 2.5rem"
                  >
                    <i class="pi pi-clock text-cyan-500 text-xl" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 md:col-6 lg:col-2">
              <div
                class="surface-card shadow-1 p-3 border-round h-full border-left-3 border-purple-500"
              >
                <div class="flex justify-content-between mb-3">
                  <div>
                    <span class="block text-500 font-medium mb-3">Answer Rate</span>
                    <div class="text-900 font-medium text-xl">
                      {{ formatPercent(stats.answerRate) }}
                    </div>
                  </div>
                  <div
                    class="flex align-items-center justify-content-center bg-purple-100 border-round"
                    style="width: 2.5rem; height: 2.5rem"
                  >
                    <i class="pi pi-chart-pie text-purple-500 text-xl" aria-hidden="true"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="grid mb-4">
            <!-- Disposition Chart -->
            <div class="col-12 md:col-6">
              <Panel header="Call Disposition" class="h-full shadow-1 surface-card border-round">
                <template #icons>
                  <Button
                    icon="pi pi-refresh"
                    text
                    rounded
                    @click="() => {}"
                    aria-label="Refresh chart"
                  />
                </template>
                <div class="disposition-list flex flex-column gap-3 mt-2 pr-2">
                  <div
                    v-for="(count, disposition) in stats.byDisposition"
                    :key="disposition"
                    class="disposition-item"
                  >
                    <div class="flex justify-content-between mb-1">
                      <span class="font-medium text-700">{{ disposition }}</span>
                      <span class="font-bold text-primary"
                        >{{ count }}
                        <small class="text-500">({{ calculatePercentage(count) }}%)</small></span
                      >
                    </div>
                    <ProgressBar
                      :value="getDispositionWidth(count)"
                      :showValue="false"
                      class="h-1rem border-round"
                      :class="getDispositionBarClass(disposition)"
                    />
                  </div>
                  <div v-if="stats.totalCalls === 0" class="text-center p-4 text-500">
                    No call data available.
                  </div>
                </div>
              </Panel>
            </div>

            <!-- Agent Stats -->
            <div class="col-12 md:col-6">
              <Panel header="Agent Performance" class="h-full shadow-1 surface-card border-round">
                <div
                  class="agent-list flex flex-column gap-2 mt-2"
                  style="max-height: 300px; overflow-y: auto"
                >
                  <div
                    v-if="Object.keys(agentStatsData).length === 0"
                    class="text-center p-4 text-500"
                  >
                    No agent activity yet.
                  </div>
                  <div
                    v-for="(agentStat, agent) in agentStatsData"
                    :key="agent"
                    class="agent-item p-3 surface-50 border-round border-1 surface-border hover:surface-100 transition-colors transition-duration-150"
                  >
                    <div class="flex justify-content-between align-items-center mb-2">
                      <div class="flex align-items-center gap-2">
                        <Avatar
                          icon="pi pi-user"
                          shape="circle"
                          class="bg-indigo-100 text-indigo-500"
                          aria-hidden="true"
                        />
                        <span class="font-bold text-lg text-800">Agent {{ agent }}</span>
                      </div>
                      <Tag severity="info" :value="`${agentStat.callsHandled} calls`" rounded />
                    </div>
                    <div class="grid grid-nogutter text-sm pt-2 border-top-1 surface-border">
                      <div class="col-6 flex align-items-center gap-2 text-600">
                        <i class="pi pi-clock text-base" aria-hidden="true"></i>
                        <span
                          >Total:
                          <span class="text-900 font-medium">{{
                            formatDuration(agentStat.totalTalkTime)
                          }}</span></span
                        >
                      </div>
                      <div class="col-6 flex align-items-center gap-2 text-600 justify-content-end">
                        <i class="pi pi-stopwatch text-base" aria-hidden="true"></i>
                        <span
                          >Avg:
                          <span class="text-900 font-medium">{{
                            formatDuration(agentStat.averageTalkTime)
                          }}</span></span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <!-- CDR Records Table -->
          <Panel header="Recent CDR Records" class="mb-4 shadow-1 surface-card border-round">
            <template #icons>
              <div class="flex gap-2">
                <Button
                  icon="pi pi-download"
                  label="CSV"
                  size="small"
                  outlined
                  @click="handleExportCSV"
                  v-tooltip.top="'Export as CSV'"
                  aria-label="Export as CSV"
                />
                <Button
                  icon="pi pi-code"
                  label="JSON"
                  size="small"
                  outlined
                  @click="handleExportJSON"
                  v-tooltip.top="'Export as JSON'"
                  aria-label="Export as JSON"
                />
                <Button
                  icon="pi pi-trash"
                  label="Clear"
                  size="small"
                  severity="danger"
                  outlined
                  @click="clearRecords"
                  v-tooltip.top="'Clear all records'"
                  aria-label="Clear all records"
                />
              </div>
            </template>

            <!-- Filters -->
            <div class="filters grid p-fluid mb-4 mt-2">
              <div class="col-12 md:col-3">
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon"
                    ><i class="pi pi-arrows-alt text-base" aria-hidden="true"></i
                  ></span>
                  <Dropdown
                    v-model="filterDirection"
                    :options="directionOptions"
                    optionLabel="label"
                    optionValue="value"
                    showClear
                    placeholder="Direction"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="col-12 md:col-3">
                <div class="p-inputgroup">
                  <span class="p-inputgroup-addon"
                    ><i class="pi pi-flag text-base" aria-hidden="true"></i
                  ></span>
                  <Dropdown
                    v-model="filterDisposition"
                    :options="dispositionOptions"
                    showClear
                    placeholder="Disposition"
                    class="w-full"
                  />
                </div>
              </div>
              <div class="col-12 md:col-6">
                <span class="p-input-icon-left w-full">
                  <i class="pi pi-search text-base" aria-hidden="true"></i>
                  <InputText
                    v-model="searchQuery"
                    placeholder="Search source or destination..."
                    class="w-full"
                  />
                </span>
              </div>
            </div>

            <DataTable
              :value="filteredRecords"
              paginator
              :rows="10"
              :rowsPerPageOptions="[10, 20, 50]"
              responsiveLayout="scroll"
              size="small"
              class="p-datatable-sm"
              showGridlines
              stripedRows
            >
              <template #empty>
                <div class="text-center p-5">
                  <i class="pi pi-file text-4xl text-300 mb-3"></i>
                  <div class="text-600 font-medium">No CDR records matching your filters.</div>
                </div>
              </template>

              <Column field="startTime" header="Time" sortable style="min-width: 120px">
                <template #body="{ data }">
                  <span class="text-sm font-medium">{{
                    formatTime(new Date(data.startTime))
                  }}</span>
                </template>
              </Column>

              <Column field="direction" header="Direction" sortable style="width: 120px">
                <template #body="{ data }">
                  <Tag :severity="getDirectionSeverity(data.direction)" rounded>
                    {{ getDirectionLabel(data.direction) }}
                  </Tag>
                </template>
              </Column>

              <Column field="source" header="Source" sortable>
                <template #body="{ data }">
                  <div class="flex align-items-center gap-2">
                    <i class="pi pi-arrow-right text-300 text-xs" aria-hidden="true"></i>
                    <span class="font-mono text-900">{{ data.source }}</span>
                  </div>
                </template>
              </Column>

              <Column field="destination" header="Destination" sortable>
                <template #body="{ data }">
                  <div class="flex align-items-center gap-2">
                    <i class="pi pi-arrow-left text-300 text-xs" aria-hidden="true"></i>
                    <span class="font-mono text-900">{{ data.destination }}</span>
                  </div>
                </template>
              </Column>

              <Column field="duration" header="Duration" sortable style="width: 100px">
                <template #body="{ data }">
                  <span class="text-600">{{ formatDuration(data.duration) }}</span>
                </template>
              </Column>

              <Column field="billableSeconds" header="Talk Time" sortable style="width: 100px">
                <template #body="{ data }">
                  <span class="font-medium text-900">{{
                    formatDuration(data.billableSeconds)
                  }}</span>
                </template>
              </Column>

              <Column field="disposition" header="Disposition" sortable style="width: 130px">
                <template #body="{ data }">
                  <Tag
                    :severity="getDispositionSeverity(data.disposition)"
                    :icon="getDispositionIcon(data.disposition)"
                    class="w-full"
                  >
                    {{ data.disposition }}
                  </Tag>
                </template>
              </Column>
            </DataTable>
          </Panel>

          <!-- Simulate CDR (for demo) -->
          <Panel header="Simulate Call Data" class="mb-4 shadow-1 surface-card border-round">
            <div
              class="flex flex-column md:flex-row align-items-center justify-content-between gap-3"
            >
              <div>
                <h3 class="text-lg font-medium m-0 mb-1">Generate Demo Data</h3>
                <p class="m-0 text-secondary text-sm">
                  Create fake CDR records to populate the dashboard.
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <Button
                  label="Answered"
                  severity="success"
                  size="small"
                  icon="pi pi-check"
                  @click="simulateCdr('ANSWERED')"
                  aria-label="Simulate answered call"
                />
                <Button
                  label="Missed"
                  severity="warning"
                  size="small"
                  icon="pi pi-phone"
                  @click="simulateCdr('NO ANSWER')"
                  aria-label="Simulate missed call"
                />
                <Button
                  label="Busy"
                  severity="help"
                  size="small"
                  icon="pi pi-ban"
                  @click="simulateCdr('BUSY')"
                  aria-label="Simulate busy call"
                />
                <Button
                  label="Failed"
                  severity="danger"
                  size="small"
                  icon="pi pi-times"
                  @click="simulateCdr('FAILED')"
                  aria-label="Simulate failed call"
                />
                <Button
                  label="Generate Batch (10)"
                  severity="secondary"
                  outlined
                  size="small"
                  icon="pi pi-list"
                  @click="simulateMultiple"
                  aria-label="Generate batch of 10 calls"
                />
              </div>
            </div>
          </Panel>
        </div>
      </template>
    </Card>

    <!-- Error Display -->
    <Dialog
      v-model:visible="errorVisible"
      header="Error"
      :modal="true"
      :closable="false"
      class="p-dialog-alert"
    >
      <div class="flex align-items-center gap-3">
        <div class="border-circle bg-red-100 p-3 flex align-items-center justify-content-center">
          <i
            class="pi pi-exclamation-triangle text-red-500 text-2xl"
            role="img"
            aria-label="Error"
          ></i>
        </div>
        <span class="text-lg">{{ error }}</span>
      </div>
      <template #footer>
        <Button label="Dismiss" @click="error = null" autofocus severity="secondary" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useAmiCDR } from '../../src/composables/useAmiCDR'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'
import {
  Card,
  Panel,
  Button,
  InputText,
  Password,
  Dropdown,
  DataTable,
  Column,
  Tag,
  ProgressBar,
  Dialog,
  Avatar,
} from './shared-components'

import type {
  CdrDisposition,
  CdrDirection,
  AgentCdrStats,
  QueueCdrStats,
} from '../../src/types/cdr.types'

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
const filterDisposition = ref<CdrDisposition | null>(null)
const searchQuery = ref('')

const directionOptions = [
  { label: 'All', value: '' },
  { label: 'Inbound', value: 'inbound' },
  { label: 'Outbound', value: 'outbound' },
  { label: 'Internal', value: 'internal' },
]

const dispositionOptions = ['ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED']

// Initialize useAmiCDR composable
const {
  records,
  stats,
  agentStats,
  queueStats,
  totalCount: _totalCount,
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

// Error handling
const errorVisible = computed({
  get: () => !!error.value,
  set: (val) => {
    if (!val) error.value = null
  },
})

// Computed
const agentStatsData = computed(() => agentStats.value as Record<string, AgentCdrStats>)
const _queueStatsData = computed(() => queueStats.value as Record<string, QueueCdrStats>)

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

const calculatePercentage = (count: number): string => {
  if (stats.value.totalCalls === 0) return '0'
  return ((count / stats.value.totalCalls) * 100).toFixed(1)
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString()
}

const getDirectionLabel = (direction: CdrDirection): string => {
  switch (direction) {
    case 'inbound':
      return 'Inbound'
    case 'outbound':
      return 'Outbound'
    case 'internal':
      return 'Internal'
    default:
      return 'Unknown'
  }
}

const getDirectionSeverity = (direction: CdrDirection | undefined): string => {
  switch (direction) {
    case 'inbound':
      return 'info'
    case 'outbound':
      return 'success'
    case 'internal':
      return 'secondary'
    default:
      return 'contrast'
  }
}

const getDispositionSeverity = (disposition: string): string => {
  switch (disposition) {
    case 'ANSWERED':
      return 'success'
    case 'NO ANSWER':
    case 'CANCEL':
      return 'warning'
    case 'BUSY':
      return 'help'
    case 'FAILED':
    case 'CONGESTION':
      return 'danger'
    default:
      return 'secondary'
  }
}

const getDispositionIcon = (disposition: string): string => {
  switch (disposition) {
    case 'ANSWERED':
      return 'pi pi-check'
    case 'NO ANSWER':
    case 'CANCEL':
      return 'pi pi-phone'
    case 'BUSY':
      return 'pi pi-ban'
    case 'FAILED':
    case 'CONGESTION':
      return 'pi pi-times'
    default:
      return 'pi pi-question'
  }
}

const getDispositionBarClass = (disposition: string): string => {
  // PrimeVue ProgressBar doesn't accept color classes easily in 'mode="determinate"' without custom formatting generally,
  // but we can pass utility classes if we are doing direct styling.
  // Actually, standard PrimeVue ProgressBar usually supports 'severity' in v4, but for v3 we might need inline styles or specific classes
  // We'll rely on our custom classes for now or standard ones.
  switch (disposition) {
    case 'ANSWERED':
      return 'bg-green-500'
    case 'NO ANSWER':
      return 'bg-orange-500'
    case 'BUSY':
      return 'bg-purple-500'
    case 'FAILED':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

// Compute width for custom charts (or value for ProgressBar)
const getDispositionWidth = (count: number): number => {
  if (stats.value.totalCalls === 0) return 0
  return Math.round((count / stats.value.totalCalls) * 100)
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
  max-width: 1400px;
  margin: 0 auto;
}

/* Custom transitions or overrides */
.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.p-progressbar-value) {
  transition: width 0.5s ease-in-out;
}

/* Custom color overrides for progress bars if standard classes don't apply automatically to the 'value' part */
:deep(.bg-green-500 .p-progressbar-value) {
  background-color: var(--green-500) !important;
}
:deep(.bg-orange-500 .p-progressbar-value) {
  background-color: var(--orange-500) !important;
}
:deep(.bg-purple-500 .p-progressbar-value) {
  background-color: var(--purple-500) !important;
}
:deep(.bg-red-500 .p-progressbar-value) {
  background-color: var(--red-500) !important;
}
:deep(.bg-gray-500 .p-progressbar-value) {
  background-color: var(--gray-500) !important;
}

/* Font Monospace for IDs/Sources */
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
