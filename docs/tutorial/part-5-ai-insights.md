# Part 5: AI-Powered Insights

**Time: 15 minutes** | [&larr; Previous](/tutorial/part-4-advanced) | [Back to Tutorial Index](/tutorial/)

Add intelligent features to your calls: sentiment analysis, automatic summarization, and smart routing.

> Try it live
>
> - Open the Playground demo: /playground/#ai-insights (select “AI-Powered Insights”)
> - Or run locally: `pnpm dev`, navigate to Playground, and pick “AI-Powered Insights” from the Examples list

## What You'll Build

- **Sentiment Analysis** - Track caller emotions in real-time
- **Call Summaries** - Auto-generate summaries with action items
- **Smart Routing** - Rule-based call routing decisions

## Sentiment Analysis

Monitor caller emotions throughout the call and receive alerts when sentiment drops.

### Quick example (with transcript updates)

```vue
<script setup lang="ts">
import { useSentiment } from 'vuesip'

const {
  currentSentiment,
  hasActiveAlerts,
  alertCount,
  getSentimentLabel,
  getDominantEmotion,
  analyzeSentiment,
} = useSentiment()

// Call this whenever your transcription text updates
function onTranscriptUpdate(text: string) {
  analyzeSentiment(text)
}
</script>

<template>
  <div class="sentiment-quick">
    <div class="score">
      <span>{{ getSentimentLabel(currentSentiment) }}</span>
      <small v-if="hasActiveAlerts">• Alerts: {{ alertCount }}</small>
    </div>
    <div class="emotion">Dominant: {{ getDominantEmotion() }}</div>
  </div>
</template>
```

### Basic Setup

```vue
<script setup lang="ts">
import { useSentiment } from 'vuesip'

const {
  currentSentiment,
  hasActiveAlerts,
  alertCount,
  getSentimentLabel,
  getDominantEmotion,
  analyzeSentiment,
} = useSentiment()

// Analyze text (typically from transcription)
function onTranscriptUpdate(text: string) {
  analyzeSentiment(text)
}
</script>

<template>
  <div class="sentiment-display">
    <!-- Sentiment Score -->
    <div class="score">
      <span class="emoji">{{ currentSentiment > 0 ? '😊' : '😟' }}</span>
      <span>{{ getSentimentLabel(currentSentiment) }}</span>
    </div>

    <!-- Alert Badge -->
    <div v-if="hasActiveAlerts" class="alerts">⚠️ {{ alertCount }} alert(s)</div>

    <!-- Dominant Emotion -->
    <div class="emotion">Feeling: {{ getDominantEmotion() }}</div>
  </div>
</template>
```

### Alert Management

Handle sentiment alerts when callers become frustrated:

```typescript
import { useSentiment } from 'vuesip'

const { alerts, getAlertsByType, getRecentAlerts, acknowledgeAlert } = useSentiment()

// Get only negative sentiment alerts
const negativeAlerts = getAlertsByType('negative')

// Get alerts from the last 5 minutes
const recentAlerts = getRecentAlerts(300)

// Mark an alert as handled
function handleAlert(alertId: string) {
  acknowledgeAlert(alertId)
  // Optionally escalate to supervisor
}
```

## Call Summarization

Generate comprehensive call summaries with extracted action items and topics.

### Generating Summaries

```vue
<script setup lang="ts">
import { useCallSummary } from 'vuesip'

const { generateSummary, hasSummary, lastSummary, isGenerating } = useCallSummary()

async function summarizeCall(transcription: string) {
  const result = await generateSummary(transcription)

  console.log('Summary:', result.summary)
  console.log('Call Type:', result.callType)
  console.log('Topics:', result.topics)
  console.log('Action Items:', result.actionItems)
}
</script>

<template>
  <div class="summary-panel">
    <button @click="summarizeCall(transcript)" :disabled="isGenerating">
      {{ isGenerating ? 'Generating...' : 'Generate Summary' }}
    </button>

    <div v-if="hasSummary">
      <h3>{{ lastSummary.callType }} Call</h3>
      <p>{{ lastSummary.summary }}</p>
    </div>
  </div>
</template>
```

### Working with Action Items

The summary extracts commitments and follow-ups as action items:

```typescript
import { useCallSummary } from 'vuesip'

const {
  lastSummary,
  getHighPriorityActionItems,
  getPendingActionItems,
  countActionItemsByStatus,
  completeActionItem,
} = useCallSummary()

// After generating summary
const result = await generateSummary(transcription)

// Get only high priority items
const urgent = getHighPriorityActionItems(result.actionItems)
// [{ description: "Send confirmation email", priority: "high", ... }]

// Get pending items only
const pending = getPendingActionItems(result.actionItems)

// Count by status
const counts = countActionItemsByStatus(result.actionItems)
// { pending: 3, completed: 1 }

// Mark item as completed
const updated = completeActionItem(result.actionItems, itemId)
```

### Export Formats

Export summaries in different formats:

```typescript
import { useCallSummary } from 'vuesip'

const { lastSummary, exportAsText, exportAsJSON, exportAsHTML } = useCallSummary()

// Plain text report
const textReport = exportAsText(lastSummary)

// JSON for APIs
const jsonData = exportAsJSON(lastSummary)

// HTML for emails
const htmlReport = exportAsHTML(lastSummary)
```

## Smart Routing

For a live demo, open the Examples page and select "AI Insights".

Create rule-based routing decisions with batch management.

### Rule Management

```vue
<script setup lang="ts">
import { useSmartRouting } from 'vuesip'

const {
  ruleCount,
  hasRules,
  enabledRulesCount,
  disabledRulesCount,
  enabledRules,
  disabledRules,
  hasDecisionHistory,
  enableAllRules,
  disableAllRules,
  addRule,
} = useSmartRouting()
</script>

<template>
  <div class="routing-panel">
    <!-- Rule Statistics -->
    <div class="stats">
      <span>Total: {{ ruleCount }}</span>
      <span>Active: {{ enabledRulesCount }}</span>
      <span>Inactive: {{ disabledRulesCount }}</span>
    </div>

    <!-- Batch Actions -->
    <div class="actions">
      <button @click="enableAllRules">Enable All</button>
      <button @click="disableAllRules">Disable All</button>
    </div>

    <!-- Rule Lists -->
    <div class="rules">
      <h4>Active Rules</h4>
      <ul>
        <li v-for="rule in enabledRules" :key="rule.id">
          {{ rule.name }}
        </li>
      </ul>
    </div>
  </div>
</template>
```

### Creating Rules

```typescript
import { useSmartRouting } from 'vuesip'

const { addRule } = useSmartRouting()

// Add a VIP customer routing rule
addRule({
  name: 'VIP Priority',
  conditions: [{ field: 'callerType', operator: 'equals', value: 'vip' }],
  actions: [{ type: 'route', destination: 'priority-queue' }],
  priority: 100,
  enabled: true,
})

// Add after-hours rule
addRule({
  name: 'After Hours',
  conditions: [{ field: 'time', operator: 'between', value: '18:00-08:00' }],
  actions: [{ type: 'route', destination: 'voicemail' }],
  priority: 50,
  enabled: true,
})
```

## Putting It All Together

Here's a complete example combining all three features:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSentiment, useCallSummary, useSmartRouting } from 'vuesip'

// Initialize composables
const sentiment = useSentiment()
const summary = useCallSummary()
const routing = useSmartRouting()

const transcription = ref('')

// Watch for sentiment alerts
watch(sentiment.hasActiveAlerts, (hasAlerts) => {
  if (hasAlerts && sentiment.alertCount.value > 2) {
    // Auto-escalate if multiple alerts
    console.log('Escalating call due to negative sentiment')
  }
})

// End of call handler
async function endCall() {
  // Generate summary
  const result = await summary.generateSummary(transcription.value)

  // Log action items for CRM
  const urgent = summary.getHighPriorityActionItems(result.actionItems)
  console.log('Follow-up required:', urgent)

  // Check routing decision history
  if (routing.hasDecisionHistory.value) {
    console.log('Routing decisions:', routing.decisionHistory.value)
  }
}
</script>
```

## Next Steps

Congratulations! You've completed the VueSIP tutorial. Here's what you can explore next:

- **[API Reference](/api/)** - Detailed documentation for all composables
- **[Playground](/playground/)** - Interactive demos for all features
- **[Examples](https://github.com/vuesip/vuesip/tree/main/examples)** - Complete application examples

::: tip Enterprise Features
For advanced call center features like CRM integration, compliance recording, and advanced analytics, check out the `@vuesip/enterprise` package.
:::
