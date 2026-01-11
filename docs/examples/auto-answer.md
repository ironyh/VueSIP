# Auto Answer

Automatic call answering based on configurable rules.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#auto-answer) or run `pnpm dev` → Navigate to **AutoAnswerDemo** in the playground
:::

## Overview

Auto-answer capabilities:

- Enable/disable auto-answer
- Configurable delay before answering
- Caller ID filtering
- Queue call handling

## Quick Start

```vue
<script setup lang="ts">
import { useSipAutoAnswer } from 'vuesip'

const { isEnabled, enable, disable, setDelay, delay, addAllowedCaller } = useSipAutoAnswer({
  enabled: false,
  delayMs: 2000,
  allowedCallers: [],
})
</script>

<template>
  <div class="auto-answer-demo">
    <label>
      <input type="checkbox" :checked="isEnabled" @change="isEnabled ? disable() : enable()" />
      Auto-Answer Enabled
    </label>

    <div v-if="isEnabled">
      <label>
        Delay (ms):
        <input type="number" :value="delay" @input="setDelay(Number($event.target.value))" />
      </label>
    </div>
  </div>
</template>
```

## Key Composables

| Composable         | Purpose                   |
| ------------------ | ------------------------- |
| `useSipAutoAnswer` | Auto-answer configuration |

## Related

- [Basic Call](/examples/basic-call)
- [Agent Login](/examples/agent-login)
