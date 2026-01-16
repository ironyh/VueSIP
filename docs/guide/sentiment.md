# Sentiment Analysis

Analyze real-time transcription text for sentiment and trigger alerts.

## Usage

```ts
import { ref } from 'vue'
import { useSentiment } from 'vuesip'

const transcript = ref('')
const sentiment = useSentiment(transcript, {
  escalationThreshold: -0.5,
  windowSize: 30,
})

sentiment.onEscalation((alert) => {
  console.log('Escalation:', alert.message)
})

transcript.value = 'I am extremely frustrated with this service'
```

## Options
- `escalationThreshold`: trigger escalation below this score.
- `windowSize`: seconds to compute trend/averages.
- `minTextLength`: skip very short texts.
- `smoothingFactor`: smooths current score.
- `analyzer(text)`: provide a custom analyzer.

## Notes
- Default analyzer is keyword-based (English). For other languages or better accuracy, pass a custom analyzer.
- Alerts: `escalation`, `trend_decline`, `sustained_negative`.

