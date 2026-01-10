# Call Recording

Server-side call recording management.

::: tip Try It Live
Run `pnpm dev` → Navigate to **CallRecordingDemo** in the playground
:::

## Overview

Recording features:

- Start/stop recording
- Recording status indicator
- Recording file management
- Permission handling

## Quick Start

```vue
<script setup lang="ts">
import { useAmiRecording, useRecordingIndicator } from 'vuesip'

const { isRecording, startRecording, stopRecording, pauseRecording, resumeRecording } =
  useAmiRecording()

const { indicatorState, colors } = useRecordingIndicator()
</script>

<template>
  <div class="recording-demo">
    <div class="indicator" :style="{ backgroundColor: colors.background }">
      <span class="dot" :class="{ recording: isRecording }"></span>
      {{ indicatorState }}
    </div>

    <div class="controls">
      <button v-if="!isRecording" @click="startRecording">Start Recording</button>
      <button v-else @click="stopRecording">Stop Recording</button>
    </div>
  </div>
</template>
```

## Key Composables

| Composable              | Purpose                       |
| ----------------------- | ----------------------------- |
| `useAmiRecording`       | Server-side recording control |
| `useRecordingIndicator` | Visual recording status       |
| `useLocalRecording`     | Client-side recording         |

## Related

- [Basic Call](/examples/basic-call)
- [CDR Dashboard](/examples/cdr-dashboard)
