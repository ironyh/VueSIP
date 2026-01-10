# Call Timer

Real-time call duration tracking and display.

::: tip Try It Live
Run `pnpm dev` → Navigate to **CallTimerDemo** in the playground
:::

## Overview

Call timer features:

- Live call duration display
- Format options (HH:MM:SS)
- Automatic start/stop on call state changes

## Quick Start

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useCallSession } from 'vuesip'

const { currentCall, callDuration } = useCallSession()

const formattedDuration = computed(() => {
  const seconds = callDuration.value
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
})
</script>

<template>
  <div class="timer-demo">
    <div class="timer" v-if="currentCall">
      {{ formattedDuration }}
    </div>
  </div>
</template>
```

## Key Composables

| Composable       | Purpose                     |
| ---------------- | --------------------------- |
| `useCallSession` | Provides `callDuration` ref |

## Related

- [Basic Call](/examples/basic-call)
- [Call History](/examples/call-history)
