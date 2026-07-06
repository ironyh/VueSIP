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

## AMI Composables and Reconnect

`useConnectionRecovery` above covers the SIP/WebRTC layer. The AMI layer has its
own reconnect logic: `useAmi` reconnects the AMI WebSocket on drop, and on every
reconnect it constructs a **new** `AmiClient` instance.

AMI composables (`useAmiAgentLogin`, `useAmiCallback`, `useAmiMWI`,
`useAmiConfBridge`, `useAmiPjsip`, `useAmiSystem`, …) take a reactive
`amiClientRef: Ref<AmiClient | null>` rather than a snapshot client. They watch
that ref and **(re)bind their event listeners** whenever the underlying client
changes — so after an AMI reconnect, listeners move to the new client
automatically. No manual re-binding is needed.

```ts
import { computed } from 'vue'
import { useAmi, useAmiAgentLogin } from 'vuesip'

const ami = useAmi()
await ami.connect({
  /* ... */
})

// Pass a ref/getter, NOT ami.getClient() (a snapshot that goes stale on reconnect).
const { login, logout } = useAmiAgentLogin(
  computed(() => ami.getClient()),
  {
    agentId: '1001',
    interface: 'PJSIP/1001',
    defaultQueues: ['sales'],
  }
)
```

::: warning
Passing `ami.getClient()` (a snapshot) instead of `computed(() => ami.getClient())`
will leave the composable bound to the original client after the first AMI
reconnect — its listeners stop firing and its actions throw "Not connected".
Always pass a ref/getter.
:::

## Related

- [Call Quality](/examples/call-quality)
- [Session Persistence](/examples/settings)
