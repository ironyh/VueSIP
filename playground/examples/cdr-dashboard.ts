import type { ExampleDefinition } from './types'
import CDRDashboardDemo from '../demos/CDRDashboardDemo.vue'

export const cdrDashboardExample: ExampleDefinition = {
  id: 'cdr-dashboard',
  icon: '📈',
  title: 'CDR Dashboard',
  description: 'Call Detail Records and analytics dashboard',
  category: 'ami',
  tags: ['Advanced', 'Analytics', 'Reporting'],
  component: CDRDashboardDemo,
  setupGuide: `<p>View and analyze Call Detail Records (CDR). Track call volumes, durations, answer rates, and identify calling patterns.</p>
<h4>Setup Steps:</h4>
<ol>
  <li>Configure AMI WebSocket proxy (amiws) on your Asterisk server</li>
  <li>Connect to AMI using the unified AmiService</li>
  <li>Use the CDR composable for call analytics</li>
</ol>`,
  codeSnippets: [
    {
      title: 'Initialize AMI & CDR Service',
      description: 'Connect to AMI and access CDR features',
      code: `import { getAmiService } from '@/services/AmiService'

// Get the singleton AMI service instance
const amiService = getAmiService()

// Connect to AMI WebSocket proxy
await amiService.connect({
  url: 'ws://your-pbx:8080/ami',
  username: 'admin',
  password: 'secret',
})

// Get CDR composable via unified service
const cdr = amiService.useCDR()

// Check connection
console.log('AMI Connected:', amiService.isConnected.value)`,
    },
    {
      title: 'Access CDR Statistics',
      description: 'Get call analytics and metrics',
      code: `import { getAmiService } from '@/services/AmiService'
import { watch } from 'vue'

const amiService = getAmiService()
const cdr = amiService.useCDR()

// Access reactive statistics
watch(cdr.stats, (stats) => {
  console.log('Total calls:', stats.totalCalls)
  console.log('Answer rate:', stats.answerRate.toFixed(1) + '%')
  console.log('Avg talk time:', stats.averageTalkTime + 's')
})

// Get summary metrics
const summary = cdr.getSummary()
console.log('Summary:', summary)`,
    },
    {
      title: 'Query CDR Records',
      description: 'Search and filter call records',
      code: `import { getAmiService } from '@/services/AmiService'

const amiService = getAmiService()
const cdr = amiService.useCDR()

// Get records for a date range
const records = await cdr.getRecords({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  disposition: 'ANSWERED',
})

records.forEach(record => {
  console.log('Call from', record.src, 'to', record.dst)
  console.log('Duration:', record.duration, 'seconds')
})`,
    },
    {
      title: 'CDR Data Models',
      description: 'TypeScript interfaces for call detail records',
      code: `// Complete CDR data model
interface CallDetailRecord {
  id: string
  uniqueid: string
  linkedid: string

  // Call parties
  src: string
  dst: string
  clid: string // Caller ID
  dcontext: string // Destination context

  // Timestamps
  calldate: Date
  start: Date
  answer: Date | null
  end: Date

  // Durations (in seconds)
  duration: number // Total duration
  billsec: number // Billable seconds (answered time)
  ringTime: number // Time spent ringing
  holdTime: number // Time on hold

  // Disposition
  disposition: 'ANSWERED' | 'NO ANSWER' | 'BUSY' | 'FAILED' | 'CONGESTION'
  amaflags: number

  // Channel info
  channel: string
  dstchannel: string
  lastapp: string
  lastdata: string

  // Additional metadata
  userfield: string
  accountcode: string
  sequence: number

  // Recording info
  recordingfile?: string
  recordingUrl?: string
}

interface CDRStats {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  busyCalls: number
  failedCalls: number

  answerRate: number // Percentage
  avgTalkTime: number // Seconds
  avgRingTime: number // Seconds
  avgHoldTime: number // Seconds
  totalTalkTime: number // Seconds

  peakHour: number // 0-23
  busiestDay: string // Day name

  inboundCalls: number
  outboundCalls: number
  internalCalls: number
}

interface CDRFilter {
  startDate?: Date
  endDate?: Date
  src?: string
  dst?: string
  disposition?: string[]
  minDuration?: number
  maxDuration?: number
  accountcode?: string
  hasRecording?: boolean
}`,
    },
    {
      title: 'CDR Statistics Calculator',
      description: 'Compute analytics from CDR records',
      code: `import { ref, computed, watch } from 'vue'

class CDRAnalytics {
  private records = ref<CallDetailRecord[]>([])

  readonly stats = computed<CDRStats>(() => {
    const recs = this.records.value
    if (recs.length === 0) return this.emptyStats()

    const answered = recs.filter(r => r.disposition === 'ANSWERED')
    const missed = recs.filter(r => r.disposition === 'NO ANSWER')
    const busy = recs.filter(r => r.disposition === 'BUSY')
    const failed = recs.filter(r => r.disposition === 'FAILED')

    // Calculate averages
    const avgTalkTime = answered.length > 0
      ? answered.reduce((sum, r) => sum + r.billsec, 0) / answered.length
      : 0

    const avgRingTime = recs.reduce((sum, r) => sum + r.ringTime, 0) / recs.length

    // Find peak hour
    const hourCounts = new Array(24).fill(0)
    recs.forEach(r => {
      const hour = new Date(r.calldate).getHours()
      hourCounts[hour]++
    })
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

    // Find busiest day
    const dayCounts: Record<string, number> = {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    recs.forEach(r => {
      const day = dayNames[new Date(r.calldate).getDay()]
      dayCounts[day] = (dayCounts[day] || 0) + 1
    })
    const busiestDay = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'

    return {
      totalCalls: recs.length,
      answeredCalls: answered.length,
      missedCalls: missed.length,
      busyCalls: busy.length,
      failedCalls: failed.length,
      answerRate: (answered.length / recs.length) * 100,
      avgTalkTime: Math.round(avgTalkTime),
      avgRingTime: Math.round(avgRingTime),
      avgHoldTime: 0,
      totalTalkTime: answered.reduce((sum, r) => sum + r.billsec, 0),
      peakHour,
      busiestDay,
      inboundCalls: recs.filter(r => r.dcontext === 'from-trunk').length,
      outboundCalls: recs.filter(r => r.dcontext === 'from-internal').length,
      internalCalls: recs.filter(r => r.dcontext === 'ext-local').length,
    }
  })

  // Time-series data for charts
  readonly hourlyDistribution = computed(() => {
    const hours = new Array(24).fill(0)
    this.records.value.forEach(r => {
      hours[new Date(r.calldate).getHours()]++
    })
    return hours.map((count, hour) => ({ hour, count }))
  })

  readonly dailyTrend = computed(() => {
    const days: Record<string, { total: number, answered: number }> = {}
    this.records.value.forEach(r => {
      const date = new Date(r.calldate).toISOString().split('T')[0]
      if (!days[date]) days[date] = { total: 0, answered: 0 }
      days[date].total++
      if (r.disposition === 'ANSWERED') days[date].answered++
    })
    return Object.entries(days)
      .map(([date, data]) => ({ date, ...data, answerRate: (data.answered / data.total) * 100 }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  setRecords(records: CallDetailRecord[]): void {
    this.records.value = records
  }

  private emptyStats(): CDRStats {
    return {
      totalCalls: 0, answeredCalls: 0, missedCalls: 0, busyCalls: 0, failedCalls: 0,
      answerRate: 0, avgTalkTime: 0, avgRingTime: 0, avgHoldTime: 0, totalTalkTime: 0,
      peakHour: 0, busiestDay: 'N/A', inboundCalls: 0, outboundCalls: 0, internalCalls: 0,
    }
  }
}`,
    },
    {
      title: 'CDR Dashboard UI Component',
      description: 'Vue component for displaying CDR analytics',
      code: `<template>
  <div class="cdr-dashboard">
    <!-- Date Range Selector -->
    <div class="date-range">
      <input type="date" v-model="startDate" />
      <span>to</span>
      <input type="date" v-model="endDate" />
      <button @click="loadRecords">Load</button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ stats.totalCalls }}</span>
        <span class="stat-label">Total Calls</span>
      </div>
      <div class="stat-card success">
        <span class="stat-value">{{ stats.answerRate.toFixed(1) }}%</span>
        <span class="stat-label">Answer Rate</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ formatDuration(stats.avgTalkTime) }}</span>
        <span class="stat-label">Avg Talk Time</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ stats.peakHour }}:00</span>
        <span class="stat-label">Peak Hour</span>
      </div>
    </div>

    <!-- Disposition Breakdown -->
    <div class="chart-section">
      <h4>Call Disposition</h4>
      <div class="disposition-chart">
        <div
          v-for="(item, index) in dispositionData"
          :key="item.label"
          class="bar"
          :style="{
            width: item.percentage + '%',
            backgroundColor: dispositionColors[index]
          }"
        >
          <span>{{ item.label }}: {{ item.count }}</span>
        </div>
      </div>
    </div>

    <!-- Hourly Distribution -->
    <div class="chart-section">
      <h4>Hourly Call Volume</h4>
      <div class="hourly-chart">
        <div
          v-for="hour in hourlyData"
          :key="hour.hour"
          class="hour-bar"
          :style="{ height: (hour.count / maxHourlyCount * 100) + '%' }"
          :title="\`\${hour.hour}:00 - \${hour.count} calls\`"
        >
          <span class="hour-label">{{ hour.hour }}</span>
        </div>
      </div>
    </div>

    <!-- Records Table -->
    <div class="records-section">
      <h4>Recent Calls</h4>
      <table class="cdr-table">
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>From</th>
            <th>To</th>
            <th>Duration</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in paginatedRecords" :key="record.id">
            <td>{{ formatDate(record.calldate) }}</td>
            <td>{{ record.src }}</td>
            <td>{{ record.dst }}</td>
            <td>{{ formatDuration(record.billsec) }}</td>
            <td>
              <span class="status-badge" :class="record.disposition.toLowerCase()">
                {{ record.disposition }}
              </span>
            </td>
            <td>
              <button v-if="record.recordingUrl" @click="playRecording(record)">
                🎧
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="pagination">
        <button @click="currentPage--" :disabled="currentPage === 1">Prev</button>
        <span>Page {{ currentPage }} of {{ totalPages }}</span>
        <button @click="currentPage++" :disabled="currentPage === totalPages">Next</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const dispositionColors = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
</script>`,
    },
    {
      title: 'CDR Export and Reporting',
      description: 'Generate reports and export CDR data',
      code: `// CDR Export utilities
class CDRExporter {
  // Export to CSV
  static toCSV(records: CallDetailRecord[]): string {
    const headers = [
      'Date', 'Time', 'Source', 'Destination', 'CallerID',
      'Duration', 'Billable', 'Disposition', 'Channel'
    ].join(',')

    const rows = records.map(r => [
      new Date(r.calldate).toLocaleDateString(),
      new Date(r.calldate).toLocaleTimeString(),
      r.src,
      r.dst,
      \`"\${r.clid}"\`,
      r.duration,
      r.billsec,
      r.disposition,
      r.channel
    ].join(','))

    return [headers, ...rows].join('\\n')
  }

  // Export to JSON
  static toJSON(records: CallDetailRecord[]): string {
    return JSON.stringify(records, null, 2)
  }

  // Generate summary report
  static generateReport(records: CallDetailRecord[], stats: CDRStats): string {
    const startDate = records.length > 0
      ? new Date(Math.min(...records.map(r => new Date(r.calldate).getTime())))
      : new Date()
    const endDate = records.length > 0
      ? new Date(Math.max(...records.map(r => new Date(r.calldate).getTime())))
      : new Date()

    return \`
# Call Detail Report
Generated: \${new Date().toLocaleString()}
Period: \${startDate.toLocaleDateString()} - \${endDate.toLocaleDateString()}

## Summary Statistics
- Total Calls: \${stats.totalCalls}
- Answered: \${stats.answeredCalls} (\${stats.answerRate.toFixed(1)}%)
- Missed: \${stats.missedCalls}
- Busy: \${stats.busyCalls}
- Failed: \${stats.failedCalls}

## Performance Metrics
- Average Talk Time: \${formatDuration(stats.avgTalkTime)}
- Average Ring Time: \${formatDuration(stats.avgRingTime)}
- Total Talk Time: \${formatDuration(stats.totalTalkTime)}
- Peak Hour: \${stats.peakHour}:00
- Busiest Day: \${stats.busiestDay}

## Call Direction
- Inbound: \${stats.inboundCalls}
- Outbound: \${stats.outboundCalls}
- Internal: \${stats.internalCalls}
\`
  }

  // Download file
  static download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}

// Usage
const exportCSV = () => {
  const csv = CDRExporter.toCSV(records.value)
  CDRExporter.download(csv, \`cdr-\${Date.now()}.csv\`, 'text/csv')
}

const exportReport = () => {
  const report = CDRExporter.generateReport(records.value, stats.value)
  CDRExporter.download(report, \`cdr-report-\${Date.now()}.md\`, 'text/markdown')
}`,
    },
    {
      title: 'Real-time CDR Updates',
      description: 'Live CDR monitoring with WebSocket updates',
      code: `import { ref, onMounted, onUnmounted } from 'vue'

interface CDREvent {
  type: 'new_call' | 'call_answered' | 'call_ended' | 'recording_ready'
  record: CallDetailRecord
  timestamp: Date
}

class LiveCDRMonitor {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  public events = ref<CDREvent[]>([])
  public isConnected = ref(false)
  public recentCalls = ref<CallDetailRecord[]>([])

  constructor(
    private wsUrl: string,
    private onNewRecord?: (record: CallDetailRecord) => void
  ) {}

  connect(): void {
    this.ws = new WebSocket(this.wsUrl)

    this.ws.onopen = () => {
      this.isConnected.value = true
      this.reconnectAttempts = 0
      console.log('CDR WebSocket connected')
    }

    this.ws.onmessage = (event) => {
      const data: CDREvent = JSON.parse(event.data)
      this.handleEvent(data)
    }

    this.ws.onclose = () => {
      this.isConnected.value = false
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('CDR WebSocket error:', error)
    }
  }

  private handleEvent(event: CDREvent): void {
    this.events.value.unshift(event)

    // Keep only last 100 events
    if (this.events.value.length > 100) {
      this.events.value = this.events.value.slice(0, 100)
    }

    switch (event.type) {
      case 'call_ended':
        // Add to recent calls
        this.recentCalls.value.unshift(event.record)
        if (this.recentCalls.value.length > 50) {
          this.recentCalls.value = this.recentCalls.value.slice(0, 50)
        }
        this.onNewRecord?.(event.record)
        break

      case 'recording_ready':
        // Update existing record with recording URL
        const existing = this.recentCalls.value.find(
          r => r.uniqueid === event.record.uniqueid
        )
        if (existing) {
          existing.recordingUrl = event.record.recordingUrl
        }
        break
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      console.log(\`Reconnecting in \${delay}ms (attempt \${this.reconnectAttempts})\`)
      setTimeout(() => this.connect(), delay)
    }
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }
}

// Live activity feed component
const useLiveCDR = (wsUrl: string) => {
  const monitor = new LiveCDRMonitor(wsUrl)

  onMounted(() => monitor.connect())
  onUnmounted(() => monitor.disconnect())

  return {
    isConnected: monitor.isConnected,
    events: monitor.events,
    recentCalls: monitor.recentCalls,
  }
}`,
    },
    {
      title: 'CDR Search and Filtering',
      description: 'Advanced search with multiple filter criteria',
      code: `import { ref, computed } from 'vue'

// Advanced filter state
const filters = ref<CDRFilter>({
  startDate: undefined,
  endDate: undefined,
  src: '',
  dst: '',
  disposition: [],
  minDuration: undefined,
  maxDuration: undefined,
  accountcode: '',
  hasRecording: undefined,
})

// Quick filter presets
const filterPresets = {
  today: () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    filters.value.startDate = today
    filters.value.endDate = new Date()
  },

  thisWeek: () => {
    const start = new Date()
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    filters.value.startDate = start
    filters.value.endDate = new Date()
  },

  missedCalls: () => {
    filters.value.disposition = ['NO ANSWER', 'BUSY']
  },

  longCalls: () => {
    filters.value.minDuration = 300 // 5+ minutes
  },

  withRecording: () => {
    filters.value.hasRecording = true
  },
}

// Apply filters to records
const applyFilters = (records: CallDetailRecord[]): CallDetailRecord[] => {
  return records.filter(record => {
    const f = filters.value

    // Date range
    if (f.startDate && new Date(record.calldate) < f.startDate) return false
    if (f.endDate && new Date(record.calldate) > f.endDate) return false

    // Source/destination (partial match)
    if (f.src && !record.src.includes(f.src)) return false
    if (f.dst && !record.dst.includes(f.dst)) return false

    // Disposition
    if (f.disposition?.length && !f.disposition.includes(record.disposition)) return false

    // Duration range
    if (f.minDuration !== undefined && record.billsec < f.minDuration) return false
    if (f.maxDuration !== undefined && record.billsec > f.maxDuration) return false

    // Account code
    if (f.accountcode && record.accountcode !== f.accountcode) return false

    // Has recording
    if (f.hasRecording === true && !record.recordingUrl) return false
    if (f.hasRecording === false && record.recordingUrl) return false

    return true
  })
}

// Filtered records
const filteredRecords = computed(() => applyFilters(allRecords.value))

// Clear all filters
const clearFilters = () => {
  filters.value = {
    startDate: undefined,
    endDate: undefined,
    src: '',
    dst: '',
    disposition: [],
    minDuration: undefined,
    maxDuration: undefined,
    accountcode: '',
    hasRecording: undefined,
  }
}

// Search with text query
const searchQuery = ref('')

const searchRecords = computed(() => {
  if (!searchQuery.value) return filteredRecords.value

  const query = searchQuery.value.toLowerCase()
  return filteredRecords.value.filter(r =>
    r.src.toLowerCase().includes(query) ||
    r.dst.toLowerCase().includes(query) ||
    r.clid.toLowerCase().includes(query) ||
    r.channel.toLowerCase().includes(query)
  )
})`,
    },
  ],
}
