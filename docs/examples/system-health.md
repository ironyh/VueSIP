# System Health

Monitor Asterisk system health and performance via AMI.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#system-health) or run `pnpm dev` → Navigate to **SystemHealthDemo** in the playground
:::

## Overview

System health monitoring features:

- System version and uptime
- Active calls and channels
- CPU and memory usage
- Module status
- Load/unload/reload modules
- Reload configuration

## Quick Start

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAmi, useAmiSystem } from 'vuesip'

const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

const {
  systemInfo,
  moduleList,
  isLoading,
  healthStatus,
  activeCalls,
  loadModule,
  reloadConfig,
  refresh,
} = useAmiSystem(computed(() => ami.getClient()))

await refresh()
</script>

<template>
  <div class="system-health-demo">
    <div class="status-bar">
      <span :class="['health', healthStatus]">{{ healthStatus }}</span>
      <span>Uptime: {{ formatUptime(systemInfo?.uptime) }}</span>
      <span>{{ activeCalls }} active calls</span>
    </div>

    <div v-if="systemInfo" class="metrics">
      <div class="metric">
        <span class="label">Version</span>
        <span class="value">{{ systemInfo.version }}</span>
      </div>
      <div class="metric">
        <span class="label">CPU</span>
        <span class="value">{{ systemInfo.cpuUsage }}%</span>
      </div>
      <div class="metric">
        <span class="label">Memory</span>
        <span class="value">{{ systemInfo.memoryUsage }}%</span>
      </div>
      <div class="metric">
        <span class="label">Channels</span>
        <span class="value">{{ systemInfo.activeChannels }}</span>
      </div>
    </div>
  </div>
</template>
```

## System Metrics

```typescript
// Access system information
const info = systemInfo.value
console.log('Version:', info?.version)
console.log('Uptime:', info?.uptime, 'seconds')
console.log('Active channels:', info?.activeChannels)
console.log('Calls processed:', info?.callsProcessed)

// Resource metrics
console.log('CPU usage:', info?.cpuUsage, '%')
console.log('Memory usage:', info?.memoryUsage, '%')
console.log('File descriptors:', info?.openFileDescriptors)
console.log('Thread count:', info?.threadCount)

// Health assessment
console.log('Overall health:', healthStatus.value)
// Returns: 'healthy' | 'degraded' | 'critical'
```

## Module Management

```typescript
// List all modules
console.log('Loaded modules:', moduleList.value)

// Load a module
await loadModule('res_pjsip.so')

// Unload a module
await unloadModule('res_pjsip.so')

// Reload a module
await reloadModule('res_pjsip.so')

// Reload entire configuration
await reloadConfig()
```

## Key Composables

| Composable     | Purpose                  |
| -------------- | ------------------------ |
| `useAmiSystem` | System health monitoring |

## Related

- [PJSIP Endpoints](/examples/pjsip-endpoints)
- [Message Waiting](/examples/mwi)
