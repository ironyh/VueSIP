# Call Center Agent Example

This example demonstrates building a provider-agnostic call center agent interface using VueSip's call center composables.

## Overview

The call center system uses a provider adapter pattern:

- **Provider-agnostic composables** (`useAgentState`, `useAgentQueue`, `useAgentMetrics`) work with any backend
- **Platform adapters** (`createAsteriskAdapter`, future FreeSWITCH/Cloud) implement the `CallCenterProvider` interface

## Basic Usage

```vue
<script setup lang="ts">
import { useCallCenterProvider, useAgentState, useAgentQueue, useAgentMetrics } from 'vuesip'

// Configure provider (Asterisk example)
const { provider, connect, disconnect, isConnected } = useCallCenterProvider({
  type: 'asterisk',
  connection: {
    host: 'pbx.example.com',
    port: 5038,
    username: 'agent',
    secret: 'password',
  },
  agent: {
    id: 'agent-001',
    extension: 'PJSIP/1001',
    name: 'John Doe',
  },
  defaultQueues: ['support', 'sales'],
  pauseReasons: ['Lunch', 'Break', 'Meeting', 'Training'],
})

// Agent state management
const { status, isLoggedIn, isOnCall, isPaused, sessionDuration, login, logout, pause, unpause } =
  useAgentState(provider)

// Queue management
const { queues, activeQueues, joinQueue, leaveQueue, pauseInQueue } = useAgentQueue(provider)

// Metrics tracking
const { callsPerHour, utilizationPercent, fetchMetrics, startAutoRefresh } = useAgentMetrics(
  provider,
  { autoRefreshInterval: 30000 }
)

// Connect on mount
onMounted(async () => {
  await connect()
  startAutoRefresh()
})
</script>

<template>
  <div class="agent-panel">
    <!-- Status Bar -->
    <div class="status-bar">
      <span :class="['status-indicator', status]">{{ status }}</span>
      <span class="session-time">Session: {{ sessionDuration }}</span>
    </div>

    <!-- Login/Logout -->
    <div v-if="!isLoggedIn">
      <button @click="login()">Login to Queues</button>
    </div>
    <div v-else>
      <button @click="logout()">Logout</button>
    </div>

    <!-- Pause Controls -->
    <div v-if="isLoggedIn && !isOnCall" class="pause-controls">
      <button v-if="!isPaused" @click="pause('Break')">Take Break</button>
      <button v-else @click="unpause()">Return from Break</button>
    </div>

    <!-- Queue List -->
    <div class="queues">
      <h3>My Queues</h3>
      <div v-for="queue in queues" :key="queue.name" class="queue-item">
        <span>{{ queue.displayName }}</span>
        <span>{{ queue.callsHandled }} calls</span>
        <span :class="{ paused: queue.isPaused }">
          {{ queue.isPaused ? 'Paused' : 'Active' }}
        </span>
      </div>
    </div>

    <!-- Metrics -->
    <div class="metrics">
      <div>Calls/Hour: {{ callsPerHour.toFixed(1) }}</div>
      <div>Utilization: {{ utilizationPercent.toFixed(1) }}%</div>
    </div>
  </div>
</template>
```

## Switching Providers

The same composables work with different backends:

```typescript
// Asterisk
const { provider } = useCallCenterProvider({
  type: 'asterisk',
  connection: { host: 'asterisk.local', port: 5038, username: 'admin', secret: 'pass' },
  agent: { id: 'agent-001', extension: 'PJSIP/1001' },
})

// FreeSWITCH (future)
const { provider } = useCallCenterProvider({
  type: 'freeswitch',
  connection: { host: 'freeswitch.local', port: 8021, password: 'ClueCon' },
  agent: { id: 'agent-001', extension: 'sofia/internal/1001' },
})

// Cloud API (future)
const { provider } = useCallCenterProvider({
  type: 'cloud',
  connection: { apiKey: 'your-api-key', endpoint: 'https://api.provider.com' },
  agent: { id: 'agent-001', extension: '+15551234567' },
})
```

## API Reference

<<<<<<< HEAD
See the [Call Center API Reference](/api/generated/index.md#usecallcenterprovider) for complete documentation.
=======
See the [Call Center API Reference](/api/call-center) for complete documentation.

> > > > > > > origin/feature/ami-advanced-features
