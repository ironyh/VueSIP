# Multi-Line

Handle multiple concurrent calls with line management.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#multi-line) or run `pnpm dev` → Navigate to **MultiLineDemo** in the playground
:::

## Overview

Multi-line phone system supporting:

- Up to 5 concurrent calls
- Visual call line management
- Call switching between lines
- Individual line controls (hold, mute)
- Call duration tracking per line

## Quick Start

```vue
<script setup lang="ts">
import { useMultiLine } from 'vuesip'

const {
  lines,
  activeLine,
  availableLines,
  makeCallOnLine,
  switchToLine,
  holdLine,
  unholdLine,
  hangupLine,
} = useMultiLine({ maxLines: 5 })
</script>

<template>
  <div class="multiline-demo">
    <div class="line-panel">
      <div
        v-for="line in lines"
        :key="line.id"
        :class="['line', { active: line.id === activeLine?.id }]"
        @click="switchToLine(line.id)"
      >
        <span class="line-number">Line {{ line.number }}</span>
        <span class="line-status">{{ line.state }}</span>
        <button @click.stop="holdLine(line.id)">Hold</button>
        <button @click.stop="hangupLine(line.id)">End</button>
      </div>
    </div>
  </div>
</template>
```

## Key Composables

| Composable     | Purpose                    |
| -------------- | -------------------------- |
| `useMultiLine` | Multi-line call management |

## Related

- [Basic Call](/examples/basic-call)
- [Call Transfer](/examples/call-transfer)
- [Multi-Line Guide](/guide/multi-line)
