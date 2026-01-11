# Queue Monitor

Live queue statistics and monitoring.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#queue-monitor) or run `pnpm dev` → Navigate to **QueueMonitorDemo** in the playground
:::

## Overview

Queue monitoring features:

- Queue wait times
- Calls waiting count
- Service level metrics
- Agent availability

## Quick Start

```vue
<script setup lang="ts">
import { useAmiQueues } from 'vuesip'

const { queues, refreshQueues } = useAmiQueues()
</script>

<template>
  <div class="queue-monitor-demo">
    <div v-for="queue in queues" :key="queue.name" class="queue-card">
      <h4>{{ queue.name }}</h4>
      <div class="metrics">
        <div class="metric">
          <span class="value">{{ queue.callsWaiting }}</span>
          <span class="label">Waiting</span>
        </div>
        <div class="metric">
          <span class="value">{{ queue.avgWaitTime }}s</span>
          <span class="label">Avg Wait</span>
        </div>
        <div class="metric">
          <span class="value">{{ queue.agentsAvailable }}</span>
          <span class="label">Agents Ready</span>
        </div>
        <div class="metric">
          <span class="value">{{ queue.serviceLevel }}%</span>
          <span class="label">SL</span>
        </div>
      </div>
    </div>
  </div>
</template>
```

## Key Composables

| Composable     | Purpose          |
| -------------- | ---------------- |
| `useAmiQueues` | Queue statistics |

## Related

- [Agent Login](/examples/agent-login)
- [CDR Dashboard](/examples/cdr-dashboard)
