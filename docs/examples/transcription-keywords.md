# Keyword Detection

Detect specific words and phrases during transcription.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#transcription) or run `pnpm dev` → Navigate to **TranscriptionDemo** in the playground (Keywords tab)
:::

## Overview

Keyword detection features:

- Define keywords/phrases to watch for
- Real-time alerts when detected
- Confidence thresholds
- Custom actions on detection

## Quick Start

```vue
<script setup lang="ts">
import { useCallSession, useTranscription } from 'vuesip'

const { currentCall } = useCallSession()

const { transcript, startTranscription, keywordMatches } = useTranscription(currentCall, {
  keywords: [
    { phrase: 'escalate', action: 'alert' },
    { phrase: 'supervisor', action: 'alert' },
    { phrase: 'cancel', action: 'log' },
    { phrase: 'refund', action: 'highlight' },
  ],
  onKeyword: (keyword, entry) => {
    console.log(`Keyword "${keyword}" detected:`, entry.text)
  },
})
</script>

<template>
  <div class="keyword-demo">
    <div class="keywords-matched">
      <h4>Detected Keywords</h4>
      <div v-for="match in keywordMatches" :key="match.id" class="match">
        <span class="keyword">{{ match.keyword }}</span>
        <span class="context">{{ match.context }}</span>
      </div>
    </div>
  </div>
</template>
```

## Key Composables

| Composable         | Purpose                              |
| ------------------ | ------------------------------------ |
| `useTranscription` | Transcription with keyword detection |

## Related

- [Real-Time Transcription](/examples/transcription)
- [Transcription Guide](/guide/transcription)
