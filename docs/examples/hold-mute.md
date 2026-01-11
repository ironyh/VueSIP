# Hold & Mute

Basic call controls for holding and muting calls.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#call-mute-patterns) or run `pnpm dev` → Navigate to **CallControlsDemo** in the playground
:::

## Overview

Essential call controls:

- Hold/unhold calls
- Mute/unmute microphone
- Mute patterns for specific scenarios

## Quick Start

```vue
<script setup lang="ts">
import { useCallSession, useCallHold } from 'vuesip'

const { currentCall, toggleMute, isMuted } = useCallSession()
const { hold, unhold, isHeld } = useCallHold(currentCall)
</script>

<template>
  <div class="controls-demo">
    <button @click="toggleMute">
      {{ isMuted ? 'Unmute' : 'Mute' }}
    </button>
    <button @click="isHeld ? unhold() : hold()">
      {{ isHeld ? 'Resume' : 'Hold' }}
    </button>
  </div>
</template>
```

## Key Composables

| Composable       | Purpose                |
| ---------------- | ---------------------- |
| `useCallSession` | Mute controls          |
| `useCallHold`    | Hold/unhold operations |

## Related

- [Basic Call](/examples/basic-call)
- [DTMF Tones](/examples/dtmf)
- [Call Controls Guide](/guide/call-controls)
