<template>
  <div class="call-history-demo">
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
      <p class="m-0 line-height-3">
        The Call History feature tracks all incoming and outgoing calls automatically. You can
        filter, search, export, and view statistics about your call activity.
      </p>
      <p class="mt-3 mb-0 surface-100 p-3 border-round border-left-3 border-primary text-sm">
        <strong>Note:</strong> Call history is stored in IndexedDB and persists across browser
        sessions. You'll see entries here after making or receiving calls.
      </p>
    </Message>

    <!-- Statistics Overview -->
    <Panel class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-chart-bar"></i>
          <span class="font-semibold">Call Statistics</span>
        </div>
      </template>
      <div class="grid">
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ statistics.totalCalls }}</div>
            <div class="text-sm text-500">Total Calls</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ statistics.incomingCalls }}</div>
            <div class="text-sm text-500">Incoming</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ statistics.outgoingCalls }}</div>
            <div class="text-sm text-500">Outgoing</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card border-round p-3 text-center surface-danger-subtle">
            <div class="text-3xl font-bold text-red-500 mb-2">{{ statistics.missedCalls }}</div>
            <div class="text-sm text-500">Missed</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ formatDuration(statistics.totalDuration) }}</div>
            <div class="text-sm text-500">Total Duration</div>
          </div>
        </div>
        <div class="col-6 md:col-4 lg:col-2">
          <div class="stat-card surface-100 border-round p-3 text-center">
            <div class="text-3xl font-bold text-primary mb-2">{{ formatDuration(Math.round(statistics.averageDuration)) }}</div>
            <div class="text-sm text-500">Avg Duration</div>
          </div>
        </div>
      </div>
    </Panel>

    <!-- Filters and Actions -->
    <div class="flex flex-wrap align-items-center gap-3 mb-4">
      <div class="flex flex-wrap gap-3 flex-1">
        <span class="p-input-icon-left flex-1" style="min-width: 200px;">
          <i class="pi pi-search"></i>
          <InputText
            v-model="searchQuery"
            placeholder="Search by name or number..."
            class="w-full"
            @input="handleSearch"
          />
        </span>

        <Dropdown
          v-model="filterDirection"
          :options="directionOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All Calls"
          class="w-auto"
          @change="handleFilterChange"
        />

        <Dropdown
          v-model="filterType"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All Types"
          class="w-auto"
          @change="handleFilterChange"
        />
      </div>

      <div class="flex gap-2">
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          :disabled="totalCalls === 0"
          @click="handleExport"
        />
        <Button
          label="Clear All"
          icon="pi pi-trash"
          severity="danger"
          outlined
          :disabled="totalCalls === 0"
          @click="handleClearHistory"
        />
      </div>
    </div>

    <!-- Call History List -->
    <Panel class="mb-4">
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-history"></i>
          <span class="font-semibold">Call History</span>
          <Tag v-if="filteredHistory.length > 0" severity="secondary" class="ml-2">
            {{ filteredHistory.length }}
          </Tag>
        </div>
      </template>

      <div v-if="totalCalls === 0" class="flex flex-column align-items-center justify-content-center py-6 text-500">
        <i class="pi pi-inbox text-5xl mb-3 opacity-50"></i>
        <h4 class="m-0 mb-2 text-700">No Call History</h4>
        <p class="m-0 text-sm">Your call history will appear here after you make or receive calls.</p>
      </div>

      <div v-else-if="filteredHistory.length === 0" class="flex flex-column align-items-center justify-content-center py-6 text-500">
        <i class="pi pi-search text-5xl mb-3 opacity-50"></i>
        <h4 class="m-0 mb-2 text-700">No Results Found</h4>
        <p class="m-0 text-sm">No calls match your current filters. Try adjusting your search.</p>
      </div>

      <div v-else class="flex flex-column gap-2">
        <div
          v-for="entry in paginatedHistory"
          :key="entry.id"
          class="flex align-items-center gap-3 p-3 border-round surface-hover cursor-pointer"
          :class="{
            'surface-danger-subtle': entry.wasMissed && !entry.wasAnswered,
          }"
        >
          <div class="flex flex-column align-items-center" style="min-width: 50px;">
            <Tag :severity="entry.direction === 'incoming' ? 'info' : 'secondary'" class="text-xs">
              {{ entry.direction === 'incoming' ? 'IN' : 'OUT' }}
            </Tag>
            <Tag v-if="entry.hasVideo" severity="help" class="mt-1 text-xs">VIDEO</Tag>
          </div>

          <div class="flex-1 min-w-0">
            <div class="font-medium text-overflow-ellipsis overflow-hidden white-space-nowrap">
              {{ entry.remoteDisplayName || entry.remoteUri }}
            </div>
            <div class="flex gap-3 text-xs text-500 mt-1">
              <span v-if="entry.remoteDisplayName" class="text-overflow-ellipsis overflow-hidden">
                {{ entry.remoteUri }}
              </span>
              <span>{{ formatDate(entry.startTime) }}</span>
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            <div v-if="entry.wasAnswered" class="font-mono font-medium text-primary mb-1">
              {{ formatDuration(entry.duration) }}
            </div>
            <Tag v-if="entry.wasMissed && !entry.wasAnswered" severity="danger">Missed</Tag>
            <Tag v-else-if="entry.wasAnswered" severity="success">Answered</Tag>
          </div>

          <Button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            v-tooltip.left="'Delete entry'"
            @click="handleDeleteEntry(entry.id)"
          />
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex align-items-center justify-content-center gap-3 pt-4 border-top-1 surface-border mt-4">
        <Button
          label="Previous"
          icon="pi pi-chevron-left"
          severity="secondary"
          size="small"
          :disabled="currentPage === 1"
          @click="currentPage--"
        />
        <span class="text-sm text-500">Page {{ currentPage }} of {{ totalPages }}</span>
        <Button
          label="Next"
          icon="pi pi-chevron-right"
          iconPos="right"
          severity="secondary"
          size="small"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        />
      </div>
    </Panel>

    <!-- Code Example -->
    <Panel>
      <template #header>
        <div class="flex align-items-center gap-2">
          <i class="pi pi-code"></i>
          <span class="font-semibold">Code Example</span>
        </div>
      </template>
      <pre class="surface-900 text-100 p-4 border-round overflow-auto m-0"><code class="text-sm line-height-3">import { useCallHistory } from 'vuesip'

const {
  history,
  filteredHistory,
  searchHistory,
  getStatistics,
  exportHistory,
  setFilter,
  clearHistory
} = useCallHistory()

// Get all history
console.log('Total calls:', history.value.length)

// Search history
const results = searchHistory('john')

// Filter history
setFilter({
  direction: 'incoming',
  wasAnswered: true,
  dateFrom: new Date('2024-01-01')
})

// Get statistics
const stats = getStatistics()
console.log(\`Total calls: \${stats.totalCalls}\`)
console.log(\`Missed calls: \${stats.missedCalls}\`)

// Export to CSV
await exportHistory({
  format: 'csv',
  filename: 'my-call-history'
})</code></pre>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallHistory } from '../../src'
import { useSimulation } from '../composables/useSimulation'
import SimulationControls from '../components/SimulationControls.vue'

// PrimeVue components
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

// Dropdown options
const directionOptions = [
  { label: 'All Calls', value: '' },
  { label: 'Incoming Only', value: 'incoming' },
  { label: 'Outgoing Only', value: 'outgoing' },
]

const typeOptions = [
  { label: 'All Types', value: '' },
  { label: 'Answered', value: 'answered' },
  { label: 'Missed', value: 'missed' },
]

// Simulation system
const simulation = useSimulation()
const { isSimulationMode, activeScenario } = simulation

// Call History composable
const {
  history: _history,
  filteredHistory,
  totalCalls,
  missedCallsCount: _missedCallsCount,
  searchHistory: _searchHistory,
  getStatistics,
  exportHistory,
  setFilter,
  clearHistory,
  deleteEntry,
} = useCallHistory()

// State
const searchQuery = ref('')
const filterDirection = ref<'' | 'incoming' | 'outgoing'>('')
const filterType = ref<'' | 'answered' | 'missed'>('')
const currentPage = ref(1)
const itemsPerPage = 10

// Computed
const statistics = computed(() => getStatistics())

const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredHistory.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredHistory.value.length / itemsPerPage)
})

// Methods
const handleSearch = () => {
  currentPage.value = 1
  updateFilter()
}

const handleFilterChange = () => {
  currentPage.value = 1
  updateFilter()
}

const updateFilter = () => {
  const filter: any = {}

  if (searchQuery.value) {
    filter.searchQuery = searchQuery.value
  }

  if (filterDirection.value) {
    filter.direction = filterDirection.value
  }

  if (filterType.value === 'answered') {
    filter.wasAnswered = true
  } else if (filterType.value === 'missed') {
    filter.wasMissed = true
    filter.wasAnswered = false
  }

  setFilter(Object.keys(filter).length > 0 ? filter : null)
}

const handleExport = async () => {
  try {
    await exportHistory({
      format: 'csv',
      filename: 'vuesip-call-history',
      includeMetadata: false,
    })
  } catch (error) {
    console.error('Export failed:', error)
    alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const handleClearHistory = async () => {
  if (!confirm('Are you sure you want to clear all call history? This cannot be undone.')) {
    return
  }

  try {
    await clearHistory()
    currentPage.value = 1
  } catch (error) {
    console.error('Clear history failed:', error)
    alert(`Failed to clear history: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const handleDeleteEntry = async (entryId: string) => {
  try {
    await deleteEntry(entryId)
  } catch (error) {
    console.error('Delete entry failed:', error)
    alert(`Failed to delete entry: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }
}
</script>

<style scoped>
.call-history-demo {
  max-width: 900px;
  margin: 0 auto;
}

/* Stat card hover effect */
.stat-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Surface for danger/missed items */
.surface-danger-subtle {
  background: var(--red-50);
}

/* Hover effect for history entries */
.surface-hover {
  transition: background 0.2s;
}

.surface-hover:hover {
  background: var(--surface-100);
}

/* Monospace for duration */
.font-mono {
  font-family: var(--font-family-monospace, monospace);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .flex-wrap {
    flex-direction: column;
  }

  :deep(.p-dropdown) {
    width: 100% !important;
  }
}
</style>
