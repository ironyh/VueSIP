# Real-Time Transcription

VueSip provides a comprehensive real-time transcription system with support for multiple providers, keyword detection, PII redaction, and export formats.

## Zero Config - One-Liners

Start transcribing immediately with sensible defaults:

```typescript
// Minimal setup - just start transcribing
const { transcript, start, stop } = useTranscription()
await start() // Uses Web Speech API with browser default language

// With auto-detected language
const { transcript, start } = useTranscription({ autoDetectLanguage: true })

// Full redaction for compliance (credit cards, SSN, phone, email)
const { transcript, start } = useTranscription({
  redaction: { enabled: true, patterns: ['credit-card', 'ssn', 'phone-number', 'email'] },
})

// Agent assist with keyword detection
const { start } = useTranscription({
  keywords: [
    { phrase: 'help', action: 'assist' },
    { phrase: 'cancel', action: 'retention' },
  ],
  onKeywordDetected: (match) => showAgentCard(match.rule.action),
})

// Export-ready transcription (great for meeting notes)
const { exportTranscript, start, stop } = useTranscription()
await start()
// ... after the call ...
stop()
const subtitles = exportTranscript('srt') // Ready for video

// Custom participant names (Agent/Customer instead of local/remote)
const { transcript, start } = useTranscription({
  localName: 'Agent',
  remoteName: 'Customer',
})
// Transcript shows: "Agent: How can I help?" instead of "local: How can I help?"
```

## Popular Provider Examples

### OpenAI Whisper (Built-in Provider)

VueSip includes a built-in `WhisperProvider` that connects to Whisper WebSocket servers like [faster-whisper-server](https://github.com/fedirz/faster-whisper-server) or [whisper.cpp](https://github.com/ggerganov/whisper.cpp):

```typescript
import { providerRegistry, WhisperProvider, useTranscription } from 'vuesip'

// Register the built-in Whisper provider
providerRegistry.register('whisper', () => new WhisperProvider())

// Use with your Whisper server
const { transcript, start, stop } = useTranscription({
  provider: 'whisper',
  providerOptions: {
    serverUrl: 'ws://localhost:8765/transcribe',
    model: 'base', // tiny, base, small, medium, large, large-v2, large-v3
    language: 'en', // ISO language code
    sampleRate: 16000, // Audio sample rate (default: 16000)
    chunkDuration: 1000, // Send audio every N ms (default: 1000)
    autoReconnect: true, // Auto-reconnect on disconnect (default: true)
  },
})

await start()
```

#### Setting Up a Whisper Server

**Option 1: faster-whisper-server (Recommended)**

```bash
# Install faster-whisper-server
pip install faster-whisper-server

# Run with default settings (port 8765)
faster-whisper-server --model base --language en

# Or with GPU acceleration
faster-whisper-server --model large-v3 --device cuda
```

**Option 2: whisper.cpp WebSocket Server**

```bash
# Clone and build whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp && make

# Download a model
./models/download-ggml-model.sh base.en

# Run the server (requires building with WebSocket support)
./examples/server/server -m models/ggml-base.en.bin --port 8765
```

#### WhisperProvider Features

| Feature            | Support                             |
| ------------------ | ----------------------------------- |
| Streaming          | ✅ Real-time transcription          |
| Interim Results    | ✅ Partial transcripts as you speak |
| Language Detection | ✅ Auto-detect language             |
| Punctuation        | ✅ Automatic punctuation            |
| Word Timestamps    | ✅ Per-word timing info             |
| 99+ Languages      | ✅ Full Whisper language support    |
| Auto-Reconnect     | ✅ Exponential backoff retry        |
| Audio Format       | PCM16 16kHz (auto-converted)        |

### Deepgram (Cloud, Real-time)

```typescript
class DeepgramProvider implements TranscriptionProvider {
  readonly name = 'deepgram'
  readonly capabilities = {
    streaming: true,
    interimResults: true,
    languageDetection: true,
    multiChannel: true,
    punctuation: true,
    speakerDiarization: true,
    wordTimestamps: true,
    supportedLanguages: ['en-US', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'ko', 'zh'],
  }

  async initialize(options: ProviderOptions) {
    const params = new URLSearchParams({
      model: options.model || 'nova-2',
      language: options.language || 'en-US',
      punctuate: 'true',
      interim_results: 'true',
    })
    this.ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ['token', options.apiKey])
  }
  // ... implement other methods
}

providerRegistry.register('deepgram', () => new DeepgramProvider())
```

## Quick Start

```vue
<script setup>
import { useTranscription } from 'vuesip'

const { isTranscribing, transcript, currentUtterance, start, stop, exportTranscript } =
  useTranscription({
    language: 'en-US',
  })

async function toggleTranscription() {
  if (isTranscribing.value) {
    stop()
  } else {
    await start()
  }
}
</script>

<template>
  <button @click="toggleTranscription">
    {{ isTranscribing ? 'Stop' : 'Start' }} Transcription
  </button>

  <!-- Current in-progress utterance -->
  <p v-if="currentUtterance" class="interim">{{ currentUtterance }}</p>

  <!-- Full transcript -->
  <div v-for="entry in transcript" :key="entry.id" class="entry">
    <span class="speaker">{{ entry.speaker }}:</span>
    <span class="text">{{ entry.text }}</span>
  </div>
</template>
```

## Features

### Multi-Provider Support

VueSip uses a pluggable provider architecture. The default provider is `web-speech` (browser native), but you can add custom providers for services like:

- **web-speech**: Browser's built-in Web Speech API (free, Chrome-optimized)
- Custom providers: Deepgram, AssemblyAI, Google Cloud, Azure, etc.

```typescript
import { useTranscription, providerRegistry, WebSpeechProvider } from 'vuesip'

// Register the default provider
providerRegistry.register('web-speech', () => new WebSpeechProvider())

// Use a specific provider
const { start } = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
})
```

### Keyword Detection

Detect keywords or phrases in real-time for agent assist scenarios:

```typescript
const { addKeyword, removeKeyword } = useTranscription({
  keywords: [
    { phrase: 'help', action: 'assist' },
    { phrase: 'cancel', action: 'retention' },
    { phrase: /refund|money back/i, action: 'escalate' },
  ],
  onKeywordDetected: (match) => {
    console.log('Keyword detected:', match.matchedText)
    showAssistCard(match.rule.action)
  },
})

// Add keywords dynamically
const id = addKeyword({ phrase: 'complaint', action: 'log' })

// Remove a keyword
removeKeyword(id)
```

### PII Redaction

Automatically redact sensitive information for compliance (PCI-DSS, HIPAA, GDPR):

```typescript
const { transcript } = useTranscription({
  redaction: {
    enabled: true,
    patterns: ['credit-card', 'ssn', 'phone-number', 'email'],
    replacement: '[REDACTED]',
    onRedacted: (type, original, entry) => {
      auditLog(`Redacted ${type} from call transcript`)
    },
  },
})

// Original: "My card is 4111 1111 1111 1111"
// Redacted: "My card is [REDACTED]"
```

Supported PII types:

- `credit-card` - Credit card numbers
- `ssn` - Social Security Numbers
- `phone-number` - Phone numbers
- `email` - Email addresses
- `address` - Street addresses
- `name` - Names with titles (Mr./Mrs./Dr.)
- `date-of-birth` - Dates in common formats
- `custom` - Your own regex patterns

### Multi-Participant Support

Enable transcription per-participant in multi-party calls:

```typescript
const {
  participants,
  enableParticipant,
  disableParticipant,
  setParticipantLanguage,
  setParticipantName,
  localEnabled,
  remoteEnabled,
} = useTranscription()

// Toggle local/remote transcription
localEnabled.value = true
remoteEnabled.value = true

// Manage individual participants
enableParticipant('user-123')
disableParticipant('user-456')
setParticipantLanguage('user-123', 'es-ES')

// Set display names for participants
setParticipantName('local', 'Agent Sarah')
setParticipantName('remote', 'John Smith')
setParticipantName('user-123', 'Supervisor Mike')
```

### Export Formats

Export transcripts in multiple formats:

```typescript
const { exportTranscript, transcript } = useTranscription()

// JSON format
const json = exportTranscript('json')

// Plain text
const txt = exportTranscript('txt')

// SRT subtitles (for video)
const srt = exportTranscript('srt')

// WebVTT subtitles
const vtt = exportTranscript('vtt')

// CSV for spreadsheets
const csv = exportTranscript('csv')

// With filtering options
const localOnly = exportTranscript('txt', {
  speakerFilter: 'local',
  startTime: Date.now() - 60000, // Last minute
  endTime: Date.now(),
})
```

### Search Transcript

Search through transcript history:

```typescript
const { searchTranscript } = useTranscription()

// Search all entries
const results = searchTranscript('refund')

// Filter by speaker
const localResults = searchTranscript('help', { speaker: 'local' })
```

## API Reference

### Options

```typescript
interface TranscriptionOptions {
  // Provider configuration
  provider?: string // Provider name (default: 'web-speech')
  language?: string // Language code (default: 'en-US')
  autoDetectLanguage?: boolean // Auto-detect language
  providerOptions?: ProviderOptions

  // Participant toggles
  localEnabled?: boolean // Transcribe local audio (default: true)
  remoteEnabled?: boolean // Transcribe remote audio (default: true)
  localName?: string // Display name for local participant
  remoteName?: string // Display name for remote participant

  // Keyword detection
  keywords?: Omit<KeywordRule, 'id'>[]
  onKeywordDetected?: (match: KeywordMatch) => void

  // PII redaction
  redaction?: RedactionConfig

  // Callbacks
  onTranscript?: (entry: TranscriptEntry) => void
  onError?: (error: Error) => void
}
```

### Return Values

```typescript
interface UseTranscriptionReturn {
  // State
  state: ComputedRef<TranscriptionState>
  isTranscribing: ComputedRef<boolean>
  transcript: Ref<TranscriptEntry[]>
  currentUtterance: Ref<string>
  error: ComputedRef<Error | null>

  // Controls
  start: () => Promise<void>
  stop: () => void
  clear: () => void

  // Per-source toggles
  localEnabled: Ref<boolean>
  remoteEnabled: Ref<boolean>

  // Participant management
  participants: Ref<Map<string, ParticipantConfig>>
  enableParticipant: (id: string) => void
  disableParticipant: (id: string) => void
  setParticipantLanguage: (id: string, language: string) => void
  setParticipantName: (id: string, name: string) => void

  // Language
  detectedLanguage: Ref<string | null>
  lockLanguage: (language: string) => void

  // Provider
  provider: ComputedRef<string>
  switchProvider: (name: string, options?: ProviderOptions) => Promise<void>
  getCapabilities: () => ProviderCapabilities | null

  // Keywords
  addKeyword: (rule: Omit<KeywordRule, 'id'>) => string
  removeKeyword: (id: string) => void
  getKeywords: () => KeywordRule[]

  // Export
  exportTranscript: (format: ExportFormat, options?: ExportOptions) => string
  searchTranscript: (query: string, options?: { speaker?: SpeakerType }) => TranscriptEntry[]

  // Events
  onTranscript: (callback: (entry: TranscriptEntry) => void) => () => void
  onKeywordDetected: (callback: (match: KeywordMatch) => void) => () => void
}
```

## Creating Custom Providers

Implement the `TranscriptionProvider` interface to add support for additional transcription services:

```typescript
import type {
  TranscriptionProvider,
  ProviderCapabilities,
  ProviderOptions,
  TranscriptResult,
  AudioSource,
} from 'vuesip'
import { providerRegistry } from 'vuesip'

class MyCustomProvider implements TranscriptionProvider {
  readonly name = 'my-provider'

  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    interimResults: true,
    languageDetection: true,
    multiChannel: true,
    punctuation: true,
    speakerDiarization: true,
    wordTimestamps: true,
    supportedLanguages: ['en-US', 'es-ES', 'fr-FR'],
  }

  async initialize(options: ProviderOptions): Promise<void> {
    // Connect to your service
  }

  startStream(audioSource: AudioSource): void {
    // Begin transcribing the audio stream
  }

  stopStream(): void {
    // Stop transcription
  }

  onInterim(callback: (text: string, sourceId: string) => void): void {
    // Register interim result callback
  }

  onFinal(callback: (result: TranscriptResult, sourceId: string) => void): void {
    // Register final result callback
  }

  onError(callback: (error: Error) => void): void {
    // Register error callback
  }

  dispose(): void {
    // Clean up resources
  }
}

// Register the provider
providerRegistry.register('my-provider', () => new MyCustomProvider())

// Use it
const { start } = useTranscription({ provider: 'my-provider' })
```

## Browser Support

The default `web-speech` provider uses the Web Speech API which has the following support:

| Browser | Support | Notes                              |
| ------- | ------- | ---------------------------------- |
| Chrome  | Full    | Best accuracy and language support |
| Edge    | Full    | Chromium-based                     |
| Safari  | Partial | Some limitations                   |
| Firefox | No      | Use a custom provider              |

For production use with Firefox or better accuracy, consider integrating a cloud-based provider like Deepgram or AssemblyAI.
