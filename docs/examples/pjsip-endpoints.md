# PJSIP Endpoints

Manage PJSIP endpoints and registrations via AMI.

::: tip Try It Live
Run `pnpm dev` → Navigate to **PjsipDemo** in the playground
:::

## Overview

PJSIP endpoint management features:

- List all endpoints
- Monitor endpoint state
- Track registrations
- Qualify endpoints
- View endpoint details

## Quick Start

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useAmi, useAmiPjsip } from 'vuesip'

const ami = useAmi()
await ami.connect('ws://pbx:8089/ws')

const {
  endpointList,
  registrationList,
  isLoading,
  registeredCount,
  onlineCount,
  qualifyEndpoint,
  refresh,
} = useAmiPjsip(computed(() => ami.getClient()))

await refresh()
</script>

<template>
  <div class="pjsip-demo">
    <div class="status-bar">
      <span>{{ endpointList.length }} endpoints</span>
      <span>{{ registeredCount }} registered</span>
      <span>{{ onlineCount }} online</span>
    </div>

    <div v-for="ep in endpointList" :key="ep.endpoint" class="endpoint-card">
      <h4>{{ ep.endpoint }}</h4>
      <span :class="['state', ep.state.toLowerCase()]">{{ ep.state }}</span>
      <div class="info">
        <span>Transport: {{ ep.transport }}</span>
        <span>Channels: {{ ep.activeChannels }}/{{ ep.maxContacts }}</span>
      </div>
      <button @click="qualifyEndpoint(ep.endpoint)">Qualify</button>
    </div>
  </div>
</template>
```

## Endpoint Monitoring

```typescript
// Get endpoint details
const endpoint = getEndpoint('1001')
console.log('State:', endpoint?.state)
console.log('Transport:', endpoint?.transport)

// Find registered endpoints
const registered = endpointList.value.filter((e) => e.state === 'Reachable' || e.state === 'Online')

// Use computed properties
console.log(`${registeredCount.value} of ${endpointList.value.length} registered`)
```

## Qualify Endpoints

```typescript
// Qualify a single endpoint
const result = await qualifyEndpoint('1001')
console.log('Qualify result:', result)

// Qualify all endpoints
for (const endpoint of endpointList.value) {
  await qualifyEndpoint(endpoint.endpoint)
}

// Refresh to get updated status
await refresh()
```

## Key Composables

| Composable    | Purpose                   |
| ------------- | ------------------------- |
| `useAmiPjsip` | PJSIP endpoint management |

## Related

- [System Health](/examples/system-health)
- [Message Waiting](/examples/mwi)
