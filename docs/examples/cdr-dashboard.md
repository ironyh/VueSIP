# CDR Dashboard

Call detail records and reporting.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#cdr-dashboard) or run `pnpm dev` → Navigate to **CDRDashboardDemo** in the playground
:::

## Overview

CDR dashboard features:

- Call history search
- Duration and disposition tracking
- Export capabilities
- Date range filtering

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useAmiCDR } from 'vuesip'

const { records, searchCDR, exportCSV, totalCalls, avgDuration } = useAmiCDR()

const dateRange = ref({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date(),
})
</script>

<template>
  <div class="cdr-dashboard">
    <!-- Summary -->
    <div class="summary">
      <div class="stat">
        <span class="value">{{ totalCalls }}</span>
        <span class="label">Total Calls</span>
      </div>
      <div class="stat">
        <span class="value">{{ avgDuration }}s</span>
        <span class="label">Avg Duration</span>
      </div>
    </div>

    <!-- Records Table -->
    <table class="cdr-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>From</th>
          <th>To</th>
          <th>Duration</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in records" :key="record.uniqueid">
          <td>{{ new Date(record.calldate).toLocaleString() }}</td>
          <td>{{ record.src }}</td>
          <td>{{ record.dst }}</td>
          <td>{{ record.billsec }}s</td>
          <td>{{ record.disposition }}</td>
        </tr>
      </tbody>
    </table>

    <button @click="exportCSV">Export CSV</button>
  </div>
</template>
```

## Key Composables

| Composable  | Purpose                |
| ----------- | ---------------------- |
| `useAmiCDR` | CDR records and search |

## Related

- [Agent Login](/examples/agent-login)
- [Queue Monitor](/examples/queue-monitor)
- [AMI Guide](/guide/ami-cdr)
