# Real-Time Transcription

Live speech-to-text transcription during calls with timestamps and speaker identification.

::: tip Try It Live
[**View on play.vuesip.com**](https://play.vuesip.com/#transcription) or run `pnpm dev` → Navigate to **TranscriptionDemo** in the playground
:::

## Overview

VueSip provides comprehensive real-time transcription capabilities:

- Live speech-to-text during active calls
- Millisecond-accurate timestamps
- Speaker identification (local vs remote)
- Multiple provider support (Browser, Deepgram, AssemblyAI, Google, Azure)
- Keyword detection and PII redaction
- Export to multiple formats

## Quick Start

```vue
<script setup lang="ts">
import { useCallSession, useTranscription } from 'vuesip'

const { currentCall } = useCallSession()

const { isTranscribing, transcript, startTranscription, stopTranscription, exportTranscript } =
  useTranscription(currentCall, {
    provider: 'browser', // Uses Web Speech API
    language: 'en-US',
    includeTimestamps: true,
    includeSpeakerLabels: true,
  })
</script>

<template>
  <div class="transcription-demo">
    <!-- Controls -->
    <div class="controls">
      <button
        @click="isTranscribing ? stopTranscription() : startTranscription()"
        :class="{ active: isTranscribing }"
      >
        {{ isTranscribing ? 'Stop' : 'Start' }} Transcription
      </button>

      <button @click="exportTranscript('txt')">Export TXT</button>
    </div>

    <!-- Live Transcript -->
    <div class="transcript">
      <div v-for="entry in transcript" :key="entry.id" :class="['entry', entry.speaker]">
        <span class="timestamp">{{ formatTimestamp(entry.timestamp) }}</span>
        <span class="speaker">{{ entry.speaker === 'local' ? 'You' : 'Remote' }}:</span>
        <span class="text">{{ entry.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>
```

## Features

### Core Transcription

- **Real-Time Processing**: Live speech-to-text as conversation happens
- **Timestamps**: Millisecond-accurate timing for each utterance
- **Speaker Labels**: Automatic identification of local vs remote speakers
- **Confidence Scores**: Quality indicators for transcription accuracy

### Provider Support

| Provider     | Type  | Features                               |
| ------------ | ----- | -------------------------------------- |
| `browser`    | Free  | Web Speech API, no API key needed      |
| `deepgram`   | Cloud | High accuracy, real-time streaming     |
| `assemblyai` | Cloud | Speaker diarization, custom vocabulary |
| `google`     | Cloud | 125+ languages, enhanced models        |
| `azure`      | Cloud | Enterprise features, custom models     |

### Advanced Features

- **Keyword Detection**: Alert when specific words/phrases are spoken
- **PII Redaction**: Automatically mask sensitive information
- **Custom Vocabulary**: Add domain-specific terms
- **Multi-Language**: Support for 100+ languages

## Configuration Options

```typescript
const transcription = useTranscription(callSession, {
  // Provider selection
  provider: 'deepgram',
  apiKey: 'your-api-key',

  // Language settings
  language: 'en-US',

  // Feature flags
  includeTimestamps: true,
  includeSpeakerLabels: true,
  includeConfidenceScores: true,

  // Advanced options
  keywords: ['urgent', 'escalate', 'supervisor'],
  redactPII: true,
  customVocabulary: ['VueSip', 'WebRTC'],

  // Callbacks
  onTranscript: (entry) => console.log('New:', entry),
  onKeyword: (keyword, entry) => alert(`Keyword detected: ${keyword}`),
})
```

## Export Formats

```typescript
// Export to different formats
await exportTranscript('txt') // Plain text
await exportTranscript('json') // Structured JSON
await exportTranscript('srt') // Subtitle format
await exportTranscript('vtt') // WebVTT format
```

### Export Example Output (TXT)

```
Call Transcript - 2024-01-15 14:30:00

[00:00:05] You: Hello, thank you for calling support.
[00:00:12] Remote: Hi, I'm having an issue with my account.
[00:00:20] You: I'd be happy to help. Can you describe the problem?
```

## Key Composables

| Composable         | Purpose                                |
| ------------------ | -------------------------------------- |
| `useTranscription` | Core transcription functionality       |
| `useCallSession`   | Provides call context for audio stream |

## Return Values

```typescript
const {
  // State
  isTranscribing, // Ref<boolean> - Is transcription active
  isPaused, // Ref<boolean> - Is transcription paused
  transcript, // Ref<TranscriptEntry[]> - All entries
  currentText, // Ref<string> - Current partial text

  // Metrics
  wordCount, // ComputedRef<number> - Total words
  duration, // ComputedRef<number> - Total duration

  // Actions
  startTranscription,
  stopTranscription,
  pauseTranscription,
  resumeTranscription,
  clearTranscript,
  exportTranscript,

  // Provider info
  providerCapabilities,
} = useTranscription(callSession, options)
```

## Best Practices

1. **Start Early**: Begin transcription when call connects, not after
2. **Handle Pauses**: Use pause/resume for holds to avoid gaps
3. **Export Regularly**: Auto-save transcripts for long calls
4. **Provider Selection**: Use browser API for testing, cloud for production

## Related

- [Keyword Detection](/examples/transcription-keywords)
- [Transcription Guide](/guide/transcription)
- [API: useTranscription](/api/composables#usetranscription)
- [Call Quality](/examples/call-quality)
