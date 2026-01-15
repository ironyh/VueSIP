import type { ExampleDefinition } from './types'
import AiInsightsDemo from '../demos/AiInsightsDemo.vue'

export const aiInsightsExample: ExampleDefinition = {
  id: 'ai-insights',
  icon: '🧠',
  title: 'AI-Powered Insights',
  description: 'Sentiment analysis, call summaries, and smart routing with helper utilities',
  category: 'sip',
  tags: ['Advanced', 'AI', 'Sentiment', 'Summary', 'Routing'],
  component: AiInsightsDemo,
  setupGuide: `<p>This demo showcases AI-powered call analysis composables:</p>
<ul>
  <li><strong>Sentiment Tab:</strong> Real-time emotion tracking with alerts and trend analysis</li>
  <li><strong>Summary Tab:</strong> Generate call summaries with action items and topic extraction</li>
  <li><strong>Routing Tab:</strong> Rule-based smart routing with decision history</li>
</ul>
<p>Use the sample transcriptions to see analysis in action, or enter your own text.</p>`,
  codeSnippets: [
    {
      title: 'Sentiment Analysis',
      description: 'Track caller emotions and get alerts',
      code: `import { useSentiment } from 'vuesip'

const {
  currentSentiment,
  hasActiveAlerts,
  alertCount,
  getSentimentLabel,
  getDominantEmotion,
  getAlertsByType,
  getRecentAlerts,
} = useSentiment()

// Check sentiment status
const label = getSentimentLabel(currentSentiment.value) // 'positive' | 'negative' | 'neutral'
const emotion = getDominantEmotion() // 'happy' | 'frustrated' | etc.

// Alert management
if (hasActiveAlerts.value) {
  const negativeAlerts = getAlertsByType('negative')
  const recentAlerts = getRecentAlerts(300) // last 5 minutes
}`,
    },
    {
      title: 'Call Summarization',
      description: 'Generate summaries and extract action items',
      code: `import { useCallSummary } from 'vuesip'

const {
  generateSummary,
  hasSummary,
  lastSummary,
  getHighPriorityActionItems,
  countActionItemsByStatus,
  completeActionItem,
} = useCallSummary()

// Generate summary from transcription
const result = await generateSummary(transcriptionText)

// Work with action items
const urgent = getHighPriorityActionItems(result.actionItems)
const counts = countActionItemsByStatus(result.actionItems)
// { pending: 3, completed: 1 }

// Mark item complete
const updated = completeActionItem(result.actionItems, itemId)`,
    },
    {
      title: 'Smart Routing',
      description: 'Rule-based call routing with batch operations',
      code: `import { useSmartRouting } from 'vuesip'

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
} = useSmartRouting()

// Check rule status
console.log(\`\${enabledRulesCount.value} of \${ruleCount.value} rules active\`)

// Batch operations
enableAllRules()  // Enable all rules at once
disableAllRules() // Disable all rules at once

// Get filtered rule lists
const active = enabledRules.value
const inactive = disabledRules.value`,
    },
  ],
}
