# Analytics

Reactive analytics state and helpers for dashboards.

## Quick Start

```ts
import { useCallAnalytics } from '@vuesip/enterprise/analytics'

const { metrics, callVolume, refresh, setTimeRange } = useCallAnalytics()

await refresh()
setTimeRange({ preset: 'last_24_hours' })
```

## Metrics

- Total/Completed/Missed/Abandoned
- Handle/Wait time averages
- Service level percent
