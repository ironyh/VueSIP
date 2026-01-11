# Connection Recovery

Automatic reconnection and session recovery for network issues.

::: tip Try It Live
Run `pnpm dev` → Navigate to **ConnectionRecoveryDemo** in the playground
:::

## Overview

Connection recovery features:

- Connection monitoring
- Automatic reconnection attempts
- Exponential backoff
- Session state preservation
- ICE restart handling

## Quick Start

```vue
<script setup lang="ts">
import { useConnectionRecovery } from 'vuesip'

const { recoveryState, isRecovering, attemptCount, lastError, manualReconnect, cancelRecovery } =
  useConnectionRecovery({
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    enableIceRestart: true,
  })
</script>

<template>
  <div class="recovery-demo">
    <div :class="['status', recoveryState]">
      {{ recoveryState }}
    </div>

    <div v-if="isRecovering">
      <p>Reconnecting... Attempt {{ attemptCount }}</p>
      <button @click="cancelRecovery">Cancel</button>
    </div>

    <button v-if="recoveryState === 'failed'" @click="manualReconnect">Retry Connection</button>
  </div>
</template>
```

## Key Composables

| Composable              | Purpose                         |
| ----------------------- | ------------------------------- |
| `useConnectionRecovery` | Automatic reconnection handling |
| `useSessionPersistence` | Session state preservation      |

## Recovery States

| State          | Description          |
| -------------- | -------------------- |
| `connected`    | Normal operation     |
| `disconnected` | Lost connection      |
| `recovering`   | Attempting reconnect |
| `failed`       | Recovery failed      |

## Related

- [Call Quality](/examples/call-quality)
- [Session Persistence](/examples/settings)
