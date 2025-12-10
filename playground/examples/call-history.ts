import type { ExampleDefinition } from './types'
import CallHistoryDemo from '../demos/CallHistoryDemo.vue'

export const callHistoryExample: ExampleDefinition = {
  id: 'call-history',
  icon: '📋',
  title: 'Call History',
  description: 'View and manage call history',
  category: 'utility',
  tags: ['Advanced', 'History', 'Analytics'],
  component: CallHistoryDemo,
  setupGuide: '<p>Call history is automatically tracked and stored in IndexedDB. View statistics, search, filter, and export your call history.</p>',
  codeSnippets: [
    {
      title: 'Using Call History',
      description: 'Access and manage call history',
      code: `import { useCallHistory } from 'vuesip'

const {
  history,
  searchHistory,
  getStatistics,
  exportHistory,
  clearHistory
} = useCallHistory()

// Get all call history
console.log(history.value)

// Search history
const results = searchHistory('john')

// Get statistics
const stats = getStatistics()
console.log(\`Total calls: \${stats.totalCalls}\`)

// Export to CSV
await exportHistory({
  format: 'csv',
  filename: 'my-calls'
})`,
    },
    {
      title: 'Call Record Model',
      description: 'Structure of call history entries',
      code: `interface CallRecord {
  id: string                    // Unique call ID
  direction: 'inbound' | 'outbound'
  remoteUri: string            // SIP URI of other party
  remoteName?: string          // Display name if available
  localUri: string             // Your SIP URI
  startTime: Date              // When call started
  answerTime?: Date            // When call was answered
  endTime: Date                // When call ended
  duration: number             // Total duration in seconds
  talkTime: number             // Actual talk time (excluding ring)
  status: CallStatus           // Final call status
  recordingUrl?: string        // If call was recorded
  notes?: string               // User notes
  tags?: string[]              // Custom tags
}

type CallStatus =
  | 'completed'    // Normal call completion
  | 'missed'       // Incoming call not answered
  | 'busy'         // Remote party busy
  | 'failed'       // Call failed to connect
  | 'rejected'     // Call was rejected
  | 'cancelled'    // Outgoing call cancelled

// Display helpers
const statusLabels: Record<CallStatus, string> = {
  completed: 'Completed',
  missed: 'Missed',
  busy: 'Busy',
  failed: 'Failed',
  rejected: 'Declined',
  cancelled: 'Cancelled',
}

const statusIcons: Record<CallStatus, string> = {
  completed: '✅',
  missed: '📵',
  busy: '📞',
  failed: '❌',
  rejected: '🚫',
  cancelled: '↩️',
}`,
    },
    {
      title: 'Filtering and Sorting',
      description: 'Advanced history filtering options',
      code: `import { computed, ref } from 'vue'

interface HistoryFilters {
  direction?: 'inbound' | 'outbound' | 'all'
  status?: CallStatus | 'all'
  dateRange?: { start: Date; end: Date }
  search?: string
  minDuration?: number
}

const filters = ref<HistoryFilters>({
  direction: 'all',
  status: 'all',
})

const sortBy = ref<'date' | 'duration' | 'name'>('date')
const sortOrder = ref<'asc' | 'desc'>('desc')

const filteredHistory = computed(() => {
  let result = [...history.value]

  // Apply direction filter
  if (filters.value.direction && filters.value.direction !== 'all') {
    result = result.filter(r => r.direction === filters.value.direction)
  }

  // Apply status filter
  if (filters.value.status && filters.value.status !== 'all') {
    result = result.filter(r => r.status === filters.value.status)
  }

  // Apply date range filter
  if (filters.value.dateRange) {
    const { start, end } = filters.value.dateRange
    result = result.filter(r => {
      const date = new Date(r.startTime)
      return date >= start && date <= end
    })
  }

  // Apply search filter
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(r =>
      r.remoteUri.toLowerCase().includes(search) ||
      r.remoteName?.toLowerCase().includes(search)
    )
  }

  // Apply minimum duration filter
  if (filters.value.minDuration) {
    result = result.filter(r => r.duration >= filters.value.minDuration!)
  }

  // Sort results
  result.sort((a, b) => {
    let comparison = 0
    switch (sortBy.value) {
      case 'date':
        comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        break
      case 'duration':
        comparison = a.duration - b.duration
        break
      case 'name':
        comparison = (a.remoteName || a.remoteUri).localeCompare(b.remoteName || b.remoteUri)
        break
    }
    return sortOrder.value === 'asc' ? comparison : -comparison
  })

  return result
})`,
    },
    {
      title: 'Call Statistics Dashboard',
      description: 'Aggregate statistics from call history',
      code: `interface CallStatistics {
  totalCalls: number
  inboundCalls: number
  outboundCalls: number
  missedCalls: number
  completedCalls: number
  totalDuration: number         // seconds
  averageDuration: number       // seconds
  longestCall: CallRecord | null
  busiestHour: number          // 0-23
  busiestDay: string           // day of week
  topContacts: { uri: string; name?: string; count: number }[]
}

const statistics = computed<CallStatistics>(() => {
  const records = history.value

  if (records.length === 0) {
    return {
      totalCalls: 0,
      inboundCalls: 0,
      outboundCalls: 0,
      missedCalls: 0,
      completedCalls: 0,
      totalDuration: 0,
      averageDuration: 0,
      longestCall: null,
      busiestHour: 0,
      busiestDay: 'Monday',
      topContacts: [],
    }
  }

  const inbound = records.filter(r => r.direction === 'inbound')
  const outbound = records.filter(r => r.direction === 'outbound')
  const missed = records.filter(r => r.status === 'missed')
  const completed = records.filter(r => r.status === 'completed')

  const totalDuration = completed.reduce((sum, r) => sum + r.duration, 0)

  // Find busiest hour
  const hourCounts = new Array(24).fill(0)
  records.forEach(r => {
    const hour = new Date(r.startTime).getHours()
    hourCounts[hour]++
  })
  const busiestHour = hourCounts.indexOf(Math.max(...hourCounts))

  // Find busiest day
  const dayCounts: Record<string, number> = {}
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  records.forEach(r => {
    const day = days[new Date(r.startTime).getDay()]
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  const busiestDay = Object.entries(dayCounts)
    .sort(([,a], [,b]) => b - a)[0][0]

  // Top contacts
  const contactCounts: Record<string, { name?: string; count: number }> = {}
  records.forEach(r => {
    if (!contactCounts[r.remoteUri]) {
      contactCounts[r.remoteUri] = { name: r.remoteName, count: 0 }
    }
    contactCounts[r.remoteUri].count++
  })
  const topContacts = Object.entries(contactCounts)
    .map(([uri, data]) => ({ uri, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalCalls: records.length,
    inboundCalls: inbound.length,
    outboundCalls: outbound.length,
    missedCalls: missed.length,
    completedCalls: completed.length,
    totalDuration,
    averageDuration: completed.length > 0 ? totalDuration / completed.length : 0,
    longestCall: completed.length > 0
      ? completed.reduce((max, r) => r.duration > max.duration ? r : max)
      : null,
    busiestHour,
    busiestDay,
    topContacts,
  }
})`,
    },
    {
      title: 'Export Formats',
      description: 'Export history in different formats',
      code: `type ExportFormat = 'csv' | 'json' | 'pdf'

interface ExportOptions {
  format: ExportFormat
  filename?: string
  filters?: HistoryFilters
  includeNotes?: boolean
}

const exportToCSV = (records: CallRecord[]): string => {
  const headers = [
    'Date',
    'Time',
    'Direction',
    'Remote Party',
    'Duration',
    'Status',
  ].join(',')

  const rows = records.map(r => [
    new Date(r.startTime).toLocaleDateString(),
    new Date(r.startTime).toLocaleTimeString(),
    r.direction,
    r.remoteName || r.remoteUri,
    formatDuration(r.duration),
    r.status,
  ].map(v => \`"\${v}"\`).join(','))

  return [headers, ...rows].join('\\n')
}

const exportToJSON = (records: CallRecord[]): string => {
  return JSON.stringify(records, null, 2)
}

const downloadExport = async (options: ExportOptions) => {
  const records = options.filters
    ? applyFilters(history.value, options.filters)
    : history.value

  let content: string
  let mimeType: string
  let extension: string

  switch (options.format) {
    case 'csv':
      content = exportToCSV(records)
      mimeType = 'text/csv'
      extension = 'csv'
      break
    case 'json':
      content = exportToJSON(records)
      mimeType = 'application/json'
      extension = 'json'
      break
    case 'pdf':
      // Use PDF library for this
      content = await generatePDF(records)
      mimeType = 'application/pdf'
      extension = 'pdf'
      break
  }

  const filename = options.filename || \`call-history-\${Date.now()}\`
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = \`\${filename}.\${extension}\`
  a.click()

  URL.revokeObjectURL(url)
}`,
    },
    {
      title: 'Call History UI Component',
      description: 'Display call history with interactions',
      code: `<template>
  <div class="call-history">
    <!-- Filters -->
    <div class="filters">
      <select v-model="filters.direction">
        <option value="all">All Calls</option>
        <option value="inbound">Incoming</option>
        <option value="outbound">Outgoing</option>
      </select>

      <select v-model="filters.status">
        <option value="all">All Status</option>
        <option value="completed">Completed</option>
        <option value="missed">Missed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <input
        v-model="filters.search"
        type="search"
        placeholder="Search..."
      />
    </div>

    <!-- History List -->
    <div class="history-list">
      <div
        v-for="record in filteredHistory"
        :key="record.id"
        class="call-record"
        :class="[record.direction, record.status]"
      >
        <span class="icon">
          {{ record.direction === 'inbound' ? '📥' : '📤' }}
          {{ statusIcons[record.status] }}
        </span>

        <div class="details">
          <span class="name">{{ record.remoteName || record.remoteUri }}</span>
          <span class="time">{{ formatDate(record.startTime) }}</span>
        </div>

        <span class="duration">{{ formatDuration(record.duration) }}</span>

        <div class="actions">
          <button @click="callBack(record)" title="Call back">📞</button>
          <button @click="deleteRecord(record.id)" title="Delete">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-bar">
      <button @click="exportHistory({ format: 'csv' })">Export CSV</button>
      <button @click="clearHistory()" class="danger">Clear All</button>
    </div>
  </div>
</template>`,
    },
    {
      title: 'IndexedDB Storage',
      description: 'Persist call history locally',
      code: `const DB_NAME = 'vuesip-call-history'
const DB_VERSION = 1
const STORE_NAME = 'calls'

let db: IDBDatabase | null = null

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('startTime', 'startTime')
        store.createIndex('remoteUri', 'remoteUri')
        store.createIndex('status', 'status')
      }
    }
  })
}

const saveCallRecord = async (record: CallRecord): Promise<void> => {
  if (!db) db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put(record)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

const loadAllRecords = async (): Promise<CallRecord[]> => {
  if (!db) db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

const deleteRecord = async (id: string): Promise<void> => {
  if (!db) db = await openDatabase()

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}`,
    },
  ],
}
