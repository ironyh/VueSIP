# Analytics

Enterprise analytics provides reactive call/agent/queue metrics with time-series helpers and export utilities.

## Quick Start

```ts
import { useCallAnalytics } from '@vuesip/enterprise/analytics'

const a = useCallAnalytics()
await a.refresh()
a.setTimeRange({ preset: 'last_24_hours' })

// Record a call outcome
a.recordCall({
  contactId: 'abc',
  type: 'completed',
  talkTime: 180,
  waitTime: 12,
  queue: 'support',
  resolved: true,
})
```

## Metrics

- Total/Completed/Missed/Abandoned
- Handle/Wait time averages
- Service level percent

## Time Series

The composable derives call volume, handle times, and sentiment history for charting.

## Export

Export metrics as JSON/CSV for dashboards or audit.
