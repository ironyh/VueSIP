# Call Transfer

Blind and attended call transfers to other extensions.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#call-transfer) or run `pnpm dev` → Navigate to **CallTransferDemo** in the playground
:::

## Overview

Call transfer capabilities:

- Blind (cold) transfer - Transfer immediately
- Attended (warm) transfer - Consult before transferring
- Transfer status feedback
- Transfer cancellation

## Quick Start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useCallSession, useCallTransfer } from 'vuesip'

const { currentCall } = useCallSession()
const {
  blindTransfer,
  attendedTransfer,
  completeTransfer,
  cancelTransfer,
  transferState,
  isTransferring,
} = useCallTransfer(currentCall)

const targetExtension = ref('')

async function handleBlindTransfer() {
  await blindTransfer(targetExtension.value)
}

async function handleAttendedTransfer() {
  await attendedTransfer(targetExtension.value)
}
</script>

<template>
  <div class="transfer-demo">
    <input v-model="targetExtension" placeholder="Transfer to..." />

    <div class="transfer-buttons">
      <button @click="handleBlindTransfer" :disabled="!targetExtension || isTransferring">
        Blind Transfer
      </button>
      <button @click="handleAttendedTransfer" :disabled="!targetExtension || isTransferring">
        Attended Transfer
      </button>
    </div>

    <div v-if="transferState === 'consulting'" class="consulting">
      <p>Consulting with {{ targetExtension }}...</p>
      <button @click="completeTransfer">Complete Transfer</button>
      <button @click="cancelTransfer">Cancel</button>
    </div>
  </div>
</template>
```

## Key Composables

| Composable        | Purpose                       |
| ----------------- | ----------------------------- |
| `useCallTransfer` | Transfer operations and state |

## Related

- [Basic Call](/examples/basic-call)
- [Multi-Line](/examples/multi-line)
