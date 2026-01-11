# DTMF Tones

Send DTMF (touch) tones during active calls for IVR navigation and feature codes.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#dtmf) or run `pnpm dev` → Navigate to **DtmfDemo** in the playground
:::

## Overview

DTMF (Dual-Tone Multi-Frequency) tones are used to:

- Navigate IVR (Interactive Voice Response) menus
- Enter PIN codes and account numbers
- Dial feature codes (e.g., \*72 for call forwarding)
- Control conference bridges

## Quick Start

```vue
<script setup lang="ts">
import { useCallSession, useDTMF } from 'vuesip'

const { currentCall } = useCallSession()
const { sendDTMF, sendDTMFSequence, isSending } = useDTMF(currentCall)

const dialpad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
const enteredDigits = ref('')

async function handleDigit(digit: string) {
  enteredDigits.value += digit
  await sendDTMF(digit)
}

async function handleSequence() {
  // Send PIN with delays between digits
  await sendDTMFSequence('1234#', { intervalMs: 200 })
}

function clear() {
  enteredDigits.value = ''
}
</script>

<template>
  <div class="dtmf-demo">
    <!-- Display -->
    <div class="display">
      <input :value="enteredDigits" readonly placeholder="Enter digits" />
      <button @click="clear">Clear</button>
    </div>

    <!-- Dialpad -->
    <div class="dialpad">
      <button
        v-for="digit in dialpad"
        :key="digit"
        @click="handleDigit(digit)"
        :disabled="!currentCall || isSending"
        class="digit-btn"
      >
        {{ digit }}
      </button>
    </div>

    <!-- Quick Actions -->
    <div class="actions">
      <button @click="sendDTMFSequence('*72')">Call Forward On</button>
      <button @click="sendDTMFSequence('*73')">Call Forward Off</button>
    </div>
  </div>
</template>

<style scoped>
.dialpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 240px;
}

.digit-btn {
  aspect-ratio: 1;
  font-size: 1.5rem;
  font-weight: bold;
}
</style>
```

## Features

- **Single Digit**: Send individual DTMF tones
- **Sequences**: Send multiple digits with configurable delays
- **Configurable Duration**: Set tone length (default: 100ms)
- **Visual Feedback**: Show which digits have been sent
- **Feature Codes**: Quick access to common PBX features

## Key Composables

| Composable       | Purpose                             |
| ---------------- | ----------------------------------- |
| `useDTMF`        | Send DTMF tones during active calls |
| `useCallSession` | Provides active call context        |

## API Reference

```typescript
import { useDTMF } from 'vuesip'

const {
  // Send single digit
  sendDTMF, // (digit: string, duration?: number) => Promise<void>

  // Send sequence with delays
  sendDTMFSequence, // (sequence: string, options?: DTMFSequenceOptions) => Promise<void>

  // State
  isSending, // Ref<boolean> - Is currently sending
  lastSent, // Ref<string | null> - Last digit sent
} = useDTMF(callSession)
```

## Sequence Options

```typescript
await sendDTMFSequence('1234#', {
  intervalMs: 200, // Delay between digits (default: 100)
  durationMs: 100, // Tone duration (default: 100)
  onDigit: (digit) => console.log(`Sent: ${digit}`),
})
```

## Common Feature Codes

| Code  | Function             |
| ----- | -------------------- |
| `*72` | Call Forward Enable  |
| `*73` | Call Forward Disable |
| `*67` | Block Caller ID      |
| `*69` | Call Return          |
| `*70` | Disable Call Waiting |
| `#`   | Confirm/Submit       |

## Related

- [Basic Audio Call](/examples/basic-call)
- [Call Controls](/examples/hold-mute)
- [Call Controls Guide](/guide/call-controls)
- [API: useDTMF](/api/composables#usedtmf)
