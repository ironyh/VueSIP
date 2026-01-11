import type { ExampleDefinition } from './types'
import TranscriptionDemo from '../demos/TranscriptionDemo.vue'

export const transcriptionExample: ExampleDefinition = {
  id: 'transcription',
  icon: '🎤',
  title: 'Real-Time Transcription',
  description: 'Live speech-to-text with AI-powered analysis and keyword detection',
  category: 'sip',
  tags: ['Advanced', 'AI', 'Transcription', 'Keywords'],
  component: TranscriptionDemo,
  setupGuide: `<p>This demo showcases real-time voice transcription with progressive features:</p>
<ul>
  <li><strong>Basic Tab:</strong> Live speech-to-text using Browser Speech API (no setup needed)</li>
  <li><strong>Keywords Tab:</strong> Detect important phrases with customizable alerts</li>
  <li><strong>AI Assist Tab:</strong> Get real-time coaching suggestions and sentiment analysis</li>
</ul>
<p>Select a scenario to see industry-specific examples, or use your microphone for live transcription.</p>
<p><strong>Browser Support:</strong> Chrome, Edge, Safari support Web Speech API. Firefox users can use mock playback.</p>`,
  codeSnippets: [
    {
      title: 'Basic Transcription',
      description: 'Start transcribing with the Web Speech API',
      code: `import { useTranscription } from 'vuesip'

const {
  isTranscribing,
  transcript,
  start,
  stop,
  exportTranscript,
} = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
})

// Start transcribing
await start()

// Export when done
const text = exportTranscript('txt')`,
    },
    {
      title: 'Keyword Detection',
      description: 'Alert when specific phrases are spoken',
      code: `import { useTranscription } from 'vuesip'

const { transcript, addKeyword, onKeywordDetected } = useTranscription({
  provider: 'web-speech',
  keywords: [
    { phrase: 'cancel', action: 'retention-alert' },
    { phrase: 'supervisor', action: 'escalation' },
    { phrase: 'frustrated', action: 'sentiment-flag' },
  ],
  onKeywordDetected: (match) => {
    showAlert(\`Detected: \${match.rule.phrase}\`)
  },
})

// Add keywords dynamically
addKeyword({ phrase: 'refund', action: 'billing-alert' })`,
    },
    {
      title: 'AI-Assisted Analysis',
      description: 'Send transcript to LLM for real-time coaching',
      code: `import { useTranscription } from 'vuesip'
import { ref, watch } from 'vue'

const { transcript } = useTranscription({ provider: 'web-speech' })

const aiSuggestions = ref<string[]>([])
const apiKey = localStorage.getItem('openai-api-key')

// Analyze every few entries
watch(transcript, async (entries) => {
  if (entries.length % 3 === 0 && apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Analyze this call transcript. Provide 1-2 brief coaching suggestions.',
        }, {
          role: 'user',
          content: entries.map(e => \`\${e.speaker}: \${e.text}\`).join('\\n'),
        }],
      }),
    })
    const data = await response.json()
    aiSuggestions.value.push(data.choices[0].message.content)
  }
}, { deep: true })`,
    },
    {
      title: 'Export Formats',
      description: 'Export transcripts in multiple formats',
      code: `import { useTranscription } from 'vuesip'

const { exportTranscript } = useTranscription()

// Plain text with timestamps
const txt = exportTranscript('txt', { includeTimestamps: true })

// JSON for processing
const json = exportTranscript('json')

// Subtitle formats
const srt = exportTranscript('srt')  // SubRip format
const vtt = exportTranscript('vtt')  // WebVTT format

// CSV for spreadsheets
const csv = exportTranscript('csv')`,
    },
  ],
}
