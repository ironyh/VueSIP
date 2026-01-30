# Analytics

Enterprise analytics provides reactive call/agent/queue metrics with time-series helpers and export utilities.

## Quick Start

```ts
import { useCallAnalytics } from '@vuesip/enterprise/analytics'

const analytics = useCallAnalytics({
  enableRealtime: true,
  refreshInterval: 30000,
  serviceLevelThreshold: 20,
})

// Optional: define a time range window for dashboards
const now = new Date()
analytics.setTimeRange({
  start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
  end: now,
  granularity: 'hour',
})

// Track agent state changes
analytics.updateAgentState('agent-1', 'available', 'Agent One')

// Record a completed call
analytics.recordCall({
  duration: 210,
  waitTime: 12,
  agentId: 'agent-1',
  queueName: 'support',
  outcome: 'completed',
  talkTime: 180,
  wrapUpTime: 30,
  firstCallResolved: true,
  sentiment: 0.6,
})

await analytics.refresh()
```

## Usage Example: Live KPI Dashboard

```ts
import { computed, onMounted, watch } from 'vue'
import { useCallAnalytics } from '@vuesip/enterprise/analytics'

const analytics = useCallAnalytics({
  enableRealtime: true,
  refreshInterval: 15000,
  serviceLevelThreshold: 20,
})

const kpis = computed(() => ({
  serviceLevel: analytics.metrics.value.serviceLevelPercent,
  avgHandleTime: analytics.metrics.value.averageHandleTime,
  abandonRate:
    analytics.metrics.value.abandonedCalls / Math.max(analytics.metrics.value.totalCalls, 1),
}))

const callVolumeSeries = computed(() =>
  analytics.callVolume.value.map((point) => ({
    x: point.timestamp,
    y: point.value,
  }))
)

onMounted(() => analytics.refresh())

watch(analytics.metrics, (next) => {
  if (next.serviceLevelPercent < 85) {
    notifyOps('Service level risk', { serviceLevel: next.serviceLevelPercent })
  }
})
```

## Usage Example: Shift Report Export

```ts
const report = analytics.generateReport({
  title: 'Support Shift A',
  includeAgents: true,
  includeQueues: true,
  includeSentiment: true,
  includeTimeSeries: true,
})

downloadText(report, 'vuesip-shift-report.txt')
```

## Metrics

- Total/Completed/Missed/Abandoned
- Handle/Wait time averages
- Service level percent

## Time Series

The composable derives call volume, handle times, and sentiment history for charting.

## Export

```ts
const csv = analytics.exportMetrics('csv')
const json = analytics.exportMetrics('json')
```

## Agent and Queue Reports

```ts
const agent = analytics.getAgentReport('agent-1')
const queue = analytics.getQueueReport('support')
```

Export metrics as JSON/CSV for dashboards or audit.
