# AI Insights Demo & Tutorial Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a playground demo and tutorial part 5 showcasing the AI-powered composables (useSentiment, useCallSummary, useSmartRouting) and their new helper methods.

**Architecture:** Two deliverables: (1) An interactive Vue playground demo with mock transcription data that showcases all helper methods, (2) A markdown tutorial following the existing Part 1-4 structure with progressive disclosure.

**Tech Stack:** Vue 3 Composition API, TypeScript, PrimeVue components (for demo), Markdown (for tutorial)

---

## Task 1: Create Example Definition File

**Files:**

- Create: `playground/examples/ai-insights.ts`

**Step 1: Create the example definition**

```typescript
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
```

**Step 2: Verify the file was created correctly**

Run: `cat playground/examples/ai-insights.ts | head -20`
Expected: File content matches what was written

**Step 3: Commit**

```bash
git add playground/examples/ai-insights.ts
git commit -m "feat(playground): add ai-insights example definition"
```

---

## Task 2: Register Example in Index

**Files:**

- Modify: `playground/examples/index.ts`

**Step 1: Add the import at the top of the file (after line ~56)**

Add after the `mwiExample` import:

```typescript
import { aiInsightsExample } from './ai-insights'
```

**Step 2: Add to sipExamples array (after transcriptionExample)**

Find the `sipExamples` array and add `aiInsightsExample` after `transcriptionExample`:

```typescript
export const sipExamples = [
  // ... existing examples ...
  transcriptionExample,
  aiInsightsExample, // Add this line
]
```

**Step 3: Verify the changes**

Run: `grep -n "aiInsightsExample" playground/examples/index.ts`
Expected: Two matches - import line and array entry

**Step 4: Commit**

```bash
git add playground/examples/index.ts
git commit -m "feat(playground): register ai-insights in example list"
```

---

## Task 3: Create Demo Component - Template Section

**Files:**

- Create: `playground/demos/AiInsightsDemo.vue`

**Step 1: Create the file with template section**

```vue
<template>
  <div class="ai-insights-demo">
    <!-- Sample Transcription Input -->
    <Card class="mb-4">
      <template #title>
        <div class="flex align-items-center gap-2">
          <span>📝</span>
          <span>Sample Transcription</span>
        </div>
      </template>
      <template #content>
        <div class="sample-selector mb-3">
          <Button
            v-for="sample in sampleTranscripts"
            :key="sample.id"
            :label="sample.name"
            :severity="selectedSample === sample.id ? 'primary' : 'secondary'"
            size="small"
            @click="loadSample(sample.id)"
          />
        </div>
        <Textarea
          v-model="transcriptText"
          rows="6"
          class="w-full"
          placeholder="Enter call transcription or select a sample above..."
        />
        <div class="flex gap-2 mt-3">
          <Button
            label="Analyze All"
            icon="pi pi-bolt"
            @click="analyzeAll"
            :disabled="!transcriptText"
          />
          <Button label="Clear" icon="pi pi-trash" severity="secondary" @click="clearAll" />
        </div>
      </template>
    </Card>

    <!-- Tab Navigation -->
    <TabView v-model:activeIndex="activeTab">
      <!-- Sentiment Tab -->
      <TabPanel>
        <template #header>
          <span class="tab-header">
            <span>😊</span>
            <span>Sentiment</span>
            <Badge v-if="hasActiveAlerts" :value="alertCount" severity="danger" />
          </span>
        </template>

        <div class="sentiment-content">
          <!-- Sentiment Score Display -->
          <div class="sentiment-score-card mb-4">
            <div class="score-display">
              <span class="score-emoji">{{ sentimentEmoji }}</span>
              <div class="score-details">
                <div class="score-value">{{ (currentSentiment * 100).toFixed(0) }}%</div>
                <div class="score-label">{{ getSentimentLabel(currentSentiment) }}</div>
              </div>
            </div>
            <div class="emotion-breakdown">
              <div class="emotion-item">
                <span>Dominant:</span>
                <Tag :value="dominantEmotion" />
              </div>
              <div class="emotion-item">
                <span>Trend:</span>
                <Tag :value="sentimentTrend" :severity="trendSeverity" />
              </div>
            </div>
          </div>

          <!-- Alerts Section -->
          <Panel header="Alerts" toggleable class="mb-4">
            <template #icons>
              <Badge :value="alertCount" :severity="hasActiveAlerts ? 'danger' : 'secondary'" />
            </template>
            <div v-if="alerts.length === 0" class="text-center text-muted py-4">
              No alerts detected
            </div>
            <div v-else class="alert-list">
              <div v-for="alert in alerts" :key="alert.id" class="alert-item">
                <span class="alert-icon">{{ alertIcon(alert.type) }}</span>
                <div class="alert-content">
                  <strong>{{ alert.type }}</strong>
                  <small>{{ alert.message }}</small>
                </div>
                <Button
                  icon="pi pi-check"
                  severity="secondary"
                  size="small"
                  rounded
                  @click="acknowledgeAlert(alert.id)"
                />
              </div>
            </div>
          </Panel>

          <!-- Alert Filters -->
          <div class="alert-filters">
            <Button label="Recent (5min)" size="small" @click="showRecentAlerts" />
            <Button label="Negative Only" size="small" @click="showNegativeAlerts" />
          </div>
        </div>
      </TabPanel>

      <!-- Summary Tab -->
      <TabPanel>
        <template #header>
          <span class="tab-header">
            <span>📋</span>
            <span>Summary</span>
            <i v-if="hasSummary" class="pi pi-check-circle text-green-500" />
          </span>
        </template>

        <div class="summary-content">
          <!-- Summary Generation -->
          <div v-if="!hasSummary" class="empty-state">
            <p>Click "Analyze All" to generate a call summary</p>
          </div>

          <div v-else>
            <!-- Summary Text -->
            <Card class="mb-4">
              <template #title>Summary</template>
              <template #content>
                <p>{{ lastSummary?.summary }}</p>
                <div class="summary-meta">
                  <Tag :value="lastSummary?.callType" />
                  <span>Duration: ~{{ Math.round((lastSummary?.duration || 0) / 60) }} min</span>
                </div>
              </template>
            </Card>

            <!-- Action Items -->
            <Panel header="Action Items" toggleable class="mb-4">
              <template #icons>
                <span class="text-sm">
                  {{ actionItemCounts.pending }} pending / {{ actionItemCounts.completed }} done
                </span>
              </template>
              <div class="action-filters mb-3">
                <Button
                  label="All"
                  :severity="actionFilter === 'all' ? 'primary' : 'secondary'"
                  size="small"
                  @click="actionFilter = 'all'"
                />
                <Button
                  label="High Priority"
                  :severity="actionFilter === 'high' ? 'primary' : 'secondary'"
                  size="small"
                  @click="actionFilter = 'high'"
                />
                <Button
                  label="Pending"
                  :severity="actionFilter === 'pending' ? 'primary' : 'secondary'"
                  size="small"
                  @click="actionFilter = 'pending'"
                />
              </div>
              <div class="action-list">
                <div
                  v-for="item in filteredActionItems"
                  :key="item.id"
                  :class="['action-item', `priority-${item.priority}`]"
                >
                  <Checkbox
                    :modelValue="item.status === 'completed'"
                    @update:modelValue="toggleActionItem(item.id)"
                    binary
                  />
                  <div class="action-content">
                    <span>{{ item.description }}</span>
                    <div class="action-meta">
                      <Tag
                        :value="item.priority"
                        :severity="prioritySeverity(item.priority)"
                        size="small"
                      />
                      <span v-if="item.assignee">{{ item.assignee }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>

            <!-- Topics -->
            <Panel header="Topics Discussed" toggleable>
              <div class="topics-grid">
                <Tag
                  v-for="topic in lastSummary?.topics"
                  :key="topic.topic"
                  :value="`${topic.topic} (${topic.count})`"
                  :severity="topicSeverity(topic.sentiment)"
                />
              </div>
            </Panel>
          </div>
        </div>
      </TabPanel>

      <!-- Routing Tab -->
      <TabPanel>
        <template #header>
          <span class="tab-header">
            <span>🛤️</span>
            <span>Routing</span>
          </span>
        </template>

        <div class="routing-content">
          <!-- Rule Stats -->
          <div class="rule-stats mb-4">
            <div class="stat-card">
              <div class="stat-value">{{ ruleCount }}</div>
              <div class="stat-label">Total Rules</div>
            </div>
            <div class="stat-card enabled">
              <div class="stat-value">{{ enabledRulesCount }}</div>
              <div class="stat-label">Enabled</div>
            </div>
            <div class="stat-card disabled">
              <div class="stat-value">{{ disabledRulesCount }}</div>
              <div class="stat-label">Disabled</div>
            </div>
          </div>

          <!-- Batch Actions -->
          <div class="batch-actions mb-4">
            <Button label="Enable All" icon="pi pi-check-circle" @click="enableAllRules" />
            <Button
              label="Disable All"
              icon="pi pi-times-circle"
              severity="secondary"
              @click="disableAllRules"
            />
          </div>

          <!-- Rule Lists -->
          <div class="rule-panels">
            <Panel header="Enabled Rules" toggleable class="mb-3">
              <div v-if="enabledRules.length === 0" class="empty-state">No enabled rules</div>
              <div v-else class="rule-list">
                <div v-for="rule in enabledRules" :key="rule.id" class="rule-item">
                  <span class="rule-name">{{ rule.name }}</span>
                  <Tag :value="rule.priority" size="small" />
                </div>
              </div>
            </Panel>

            <Panel header="Disabled Rules" toggleable>
              <div v-if="disabledRules.length === 0" class="empty-state">No disabled rules</div>
              <div v-else class="rule-list">
                <div v-for="rule in disabledRules" :key="rule.id" class="rule-item muted">
                  <span class="rule-name">{{ rule.name }}</span>
                  <Tag :value="rule.priority" size="small" severity="secondary" />
                </div>
              </div>
            </Panel>
          </div>

          <!-- Decision History -->
          <Panel v-if="hasDecisionHistory" header="Decision History" toggleable class="mt-4">
            <div class="decision-list">
              <div v-for="(decision, idx) in decisionHistory" :key="idx" class="decision-item">
                <span class="decision-time">{{ formatTime(decision.timestamp) }}</span>
                <span class="decision-rule">{{ decision.ruleName }}</span>
                <Tag :value="decision.action" size="small" />
              </div>
            </div>
          </Panel>
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>
```

**Step 2: Verify file structure**

Run: `head -20 playground/demos/AiInsightsDemo.vue`
Expected: Template section starts correctly

---

## Task 4: Create Demo Component - Script Section

**Files:**

- Modify: `playground/demos/AiInsightsDemo.vue`

**Step 1: Add the script section after template**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSentiment, useCallSummary, useSmartRouting } from '../../src/composables'
import type { ActionItem } from '../../src/composables/useCallSummary'

// PrimeVue components
import Card from 'primevue/card'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Panel from 'primevue/panel'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import Checkbox from 'primevue/checkbox'

// =============================================================================
// Sample Data
// =============================================================================

const sampleTranscripts = [
  {
    id: 'support',
    name: '🔧 Support Call',
    text: `Agent: Thank you for calling support, how can I help you today?
Caller: I'm really frustrated. My internet has been down for three days and nobody has helped me.
Agent: I'm so sorry to hear that. Let me look into this right away for you.
Caller: This is unacceptable. I work from home and I've lost money because of this.
Agent: I completely understand your frustration. I can see there was an outage in your area. I will personally follow up within 24 hours to ensure this is resolved.
Caller: Okay, I appreciate that. Please send me a confirmation email.
Agent: Absolutely, I'll send that right now. Is there anything else I can help with?
Caller: No, thank you for your help today.`,
  },
  {
    id: 'sales',
    name: '💼 Sales Inquiry',
    text: `Agent: Good morning! Thanks for your interest in our enterprise plan.
Caller: Hi, yes I'm looking at upgrading. What's the price difference?
Agent: Great question! The enterprise plan is $299 per month and includes priority support.
Caller: That sounds good. Can you send me a proposal by end of week?
Agent: Absolutely! I'll prepare a custom proposal and send it by Friday.
Caller: Perfect. I'm excited about the new features.
Agent: Wonderful! We're happy to have you. I'll follow up next week to answer any questions.`,
  },
  {
    id: 'complaint',
    name: '😠 Complaint',
    text: `Agent: Hello, how may I assist you?
Caller: I want to speak to a supervisor immediately. This is the worst service I've ever received.
Agent: I'm sorry you're having a bad experience. Can you tell me what happened?
Caller: I was charged twice for my subscription and nobody has fixed it. I'm furious.
Agent: I sincerely apologize. Let me look at your account right now and issue a refund today.
Caller: You better, or I'm cancelling everything.
Agent: I understand. I've processed the refund and you'll see it within 3-5 business days.
Caller: Fine. I'll be checking my account.`,
  },
]

// =============================================================================
// Composables
// =============================================================================

const {
  currentSentiment,
  alerts,
  hasActiveAlerts,
  alertCount,
  getSentimentLabel,
  getDominantEmotion,
  getAlertsByType,
  getRecentAlerts,
  analyzeSentiment,
  acknowledgeAlert,
  reset: resetSentiment,
} = useSentiment()

const {
  generateSummary,
  hasSummary,
  lastSummary,
  getHighPriorityActionItems,
  getPendingActionItems,
  countActionItemsByStatus,
  completeActionItem,
  reset: resetSummary,
} = useCallSummary()

const {
  rules,
  ruleCount,
  hasRules,
  enabledRulesCount,
  disabledRulesCount,
  enabledRules,
  disabledRules,
  hasDecisionHistory,
  decisionHistory,
  enableAllRules,
  disableAllRules,
  addRule,
  reset: resetRouting,
} = useSmartRouting()

// =============================================================================
// State
// =============================================================================

const transcriptText = ref('')
const selectedSample = ref<string | null>(null)
const activeTab = ref(0)
const actionFilter = ref<'all' | 'high' | 'pending'>('all')
const actionItems = ref<ActionItem[]>([])

// =============================================================================
// Computed
// =============================================================================

const sentimentEmoji = computed(() => {
  const score = currentSentiment.value
  if (score > 0.3) return '😊'
  if (score > 0) return '🙂'
  if (score > -0.3) return '😐'
  if (score > -0.6) return '😟'
  return '😠'
})

const dominantEmotion = computed(() => getDominantEmotion())

const sentimentTrend = computed(() => {
  if (!lastSummary.value) return 'N/A'
  return lastSummary.value.sentiment.trend
})

const trendSeverity = computed(() => {
  const trend = sentimentTrend.value
  if (trend === 'improved') return 'success'
  if (trend === 'declined') return 'danger'
  return 'secondary'
})

const actionItemCounts = computed(() => {
  return countActionItemsByStatus(actionItems.value)
})

const filteredActionItems = computed(() => {
  if (actionFilter.value === 'high') {
    return getHighPriorityActionItems(actionItems.value)
  }
  if (actionFilter.value === 'pending') {
    return getPendingActionItems(actionItems.value)
  }
  return actionItems.value
})

// =============================================================================
// Methods
// =============================================================================

function loadSample(id: string) {
  const sample = sampleTranscripts.find((s) => s.id === id)
  if (sample) {
    transcriptText.value = sample.text
    selectedSample.value = id
  }
}

async function analyzeAll() {
  if (!transcriptText.value) return

  // Analyze sentiment
  analyzeSentiment(transcriptText.value)

  // Generate summary
  const result = await generateSummary(transcriptText.value)
  actionItems.value = result.actionItems
}

function clearAll() {
  transcriptText.value = ''
  selectedSample.value = null
  actionItems.value = []
  resetSentiment()
  resetSummary()
}

function toggleActionItem(id: string) {
  actionItems.value = completeActionItem(actionItems.value, id)
}

function showRecentAlerts() {
  const recent = getRecentAlerts(300) // 5 minutes
  console.log('Recent alerts:', recent)
}

function showNegativeAlerts() {
  const negative = getAlertsByType('negative')
  console.log('Negative alerts:', negative)
}

function alertIcon(type: string) {
  switch (type) {
    case 'negative':
      return '⚠️'
    case 'escalation':
      return '📢'
    default:
      return 'ℹ️'
  }
}

function prioritySeverity(priority: string) {
  switch (priority) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    default:
      return 'secondary'
  }
}

function topicSeverity(sentiment: number) {
  if (sentiment > 0.2) return 'success'
  if (sentiment < -0.2) return 'danger'
  return 'secondary'
}

function formatTime(timestamp: Date) {
  return timestamp.toLocaleTimeString()
}

// =============================================================================
// Initialize Demo Rules
// =============================================================================

// Add sample routing rules for demo
if (!hasRules.value) {
  addRule({
    name: 'VIP Customer',
    conditions: [{ field: 'callerType', operator: 'equals', value: 'vip' }],
    actions: [{ type: 'route', destination: 'priority-queue' }],
    priority: 100,
    enabled: true,
  })
  addRule({
    name: 'Sales Inquiry',
    conditions: [{ field: 'intent', operator: 'contains', value: 'purchase' }],
    actions: [{ type: 'route', destination: 'sales-team' }],
    priority: 80,
    enabled: true,
  })
  addRule({
    name: 'After Hours',
    conditions: [{ field: 'time', operator: 'between', value: '18:00-08:00' }],
    actions: [{ type: 'route', destination: 'voicemail' }],
    priority: 50,
    enabled: false,
  })
}
</script>
```

**Step 2: Verify script was added**

Run: `grep -n "useSentiment" playground/demos/AiInsightsDemo.vue`
Expected: Shows import line in script section

---

## Task 5: Create Demo Component - Style Section

**Files:**

- Modify: `playground/demos/AiInsightsDemo.vue`

**Step 1: Add the style section at the end of the file**

```vue
<style scoped>
.ai-insights-demo {
  max-width: 900px;
  margin: 0 auto;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Sample Selector */
.sample-selector {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Sentiment Section */
.sentiment-score-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}

.score-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.score-emoji {
  font-size: 3rem;
}

.score-value {
  font-size: 2rem;
  font-weight: bold;
}

.score-label {
  text-transform: capitalize;
  color: var(--text-color-secondary);
}

.emotion-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.emotion-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Alerts */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 6px;
}

.alert-icon {
  font-size: 1.25rem;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.alert-content small {
  color: var(--text-color-secondary);
}

.alert-filters {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Action Items */
.action-filters {
  display: flex;
  gap: 0.5rem;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: 6px;
  border-left: 3px solid var(--surface-border);
}

.action-item.priority-high {
  border-left-color: var(--red-500);
}

.action-item.priority-medium {
  border-left-color: var(--yellow-500);
}

.action-item.priority-low {
  border-left-color: var(--green-500);
}

.action-content {
  flex: 1;
}

.action-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  align-items: center;
}

/* Topics */
.topics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Summary Meta */
.summary-meta {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  align-items: center;
  color: var(--text-color-secondary);
}

/* Routing Section */
.rule-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1rem;
  background: var(--surface-card);
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}

.stat-card.enabled {
  border-color: var(--green-500);
}

.stat-card.disabled {
  border-color: var(--red-500);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
}

.stat-label {
  color: var(--text-color-secondary);
}

.batch-actions {
  display: flex;
  gap: 0.5rem;
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--surface-ground);
  border-radius: 4px;
}

.rule-item.muted {
  opacity: 0.6;
}

.decision-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.decision-item {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.5rem;
  font-size: 0.9rem;
}

.decision-time {
  color: var(--text-color-secondary);
  font-family: monospace;
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.text-muted {
  color: var(--text-color-secondary);
}
</style>
```

**Step 2: Verify the complete file**

Run: `wc -l playground/demos/AiInsightsDemo.vue`
Expected: ~500-600 lines total

**Step 3: Commit the demo component**

```bash
git add playground/demos/AiInsightsDemo.vue
git commit -m "feat(playground): add AI Insights demo component"
```

---

## Task 6: Create Tutorial Part 5 - Main Content

**Files:**

- Create: `docs/tutorial/part-5-ai-insights.md`

**Step 1: Create the tutorial file**

````markdown
# Part 5: AI-Powered Insights

**Time: 15 minutes** | [&larr; Previous](/tutorial/part-4-advanced) | [Back to Tutorial Index](/tutorial/)

Add intelligent features to your calls: sentiment analysis, automatic summarization, and smart routing.

## What You'll Build

- **Sentiment Analysis** - Track caller emotions in real-time
- **Call Summaries** - Auto-generate summaries with action items
- **Smart Routing** - Rule-based call routing decisions

## Sentiment Analysis

Monitor caller emotions throughout the call and receive alerts when sentiment drops.

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
````

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
import { useSentiment } from 'vuesip'

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

````

**Step 2: Verify the file was created**

Run: `head -30 docs/tutorial/part-5-ai-insights.md`
Expected: Shows the header and introduction

**Step 3: Commit the tutorial**

```bash
git add docs/tutorial/part-5-ai-insights.md
git commit -m "docs(tutorial): add Part 5 AI-Powered Insights"
````

---

## Task 7: Update Tutorial Index

**Files:**

- Modify: `docs/tutorial/index.md`

**Step 1: Update the learning path table**

Find the table in `docs/tutorial/index.md` and add Part 5:

```markdown
| Part                                                      | Duration | What You'll Build               |
| --------------------------------------------------------- | -------- | ------------------------------- |
| [1. Hello VueSIP](/tutorial/part-1-hello)                 | 5 min    | Your first call using mock mode |
| [2. Building a Softphone](/tutorial/part-2-softphone)     | 15 min   | Complete UI with call controls  |
| [3. Real Server Connection](/tutorial/part-3-real-server) | 10 min   | Connect to a real SIP provider  |
| [4. Advanced Features](/tutorial/part-4-advanced)         | 20 min   | Transfer, conference, recording |
| [5. AI-Powered Insights](/tutorial/part-5-ai-insights)    | 15 min   | Sentiment, summaries, routing   |
```

**Step 2: Update the "What You'll Learn" section**

Add after Part 4 section:

```markdown
### Part 5: AI-Powered Insights (15 minutes)

- Real-time sentiment analysis with alerts
- Automatic call summarization
- Action item extraction and management
- Smart routing with batch operations
```

**Step 3: Verify the changes**

Run: `grep -n "Part 5" docs/tutorial/index.md`
Expected: Two matches - table row and section header

**Step 4: Commit**

```bash
git add docs/tutorial/index.md
git commit -m "docs(tutorial): add Part 5 to tutorial index"
```

---

## Task 8: Update Part 4 Navigation

**Files:**

- Modify: `docs/tutorial/part-4-advanced.md`

**Step 1: Update the navigation header**

Find line 3 and update:

```markdown
**Time: 20 minutes** | [&larr; Previous](/tutorial/part-3-real-server) | [Next &rarr;](/tutorial/part-5-ai-insights) | [Back to Tutorial Index](/tutorial/)
```

**Step 2: Verify the change**

Run: `head -5 docs/tutorial/part-4-advanced.md`
Expected: Shows updated navigation with Part 5 link

**Step 3: Commit**

```bash
git add docs/tutorial/part-4-advanced.md
git commit -m "docs(tutorial): add Part 5 navigation link to Part 4"
```

---

## Task 9: Run Linting and Type Check

**Files:**

- None (validation only)

**Step 1: Run lint check**

Run: `npm run lint`
Expected: No errors

**Step 2: Run type check**

Run: `npm run typecheck`
Expected: No TypeScript errors

**Step 3: If errors, fix them**

Address any linting or type errors before proceeding.

---

## Task 10: Test the Playground Demo

**Files:**

- None (manual verification)

**Step 1: Start the dev server**

Run: `npm run dev:playground`
Expected: Server starts on localhost

**Step 2: Open the playground in browser**

Navigate to: `http://localhost:5173/?example=ai-insights`
Expected: Demo loads without errors

**Step 3: Test each tab**

- Load a sample transcription
- Click "Analyze All"
- Verify sentiment tab shows data
- Verify summary tab shows results
- Verify routing tab shows rules

---

## Task 11: Build Documentation

**Files:**

- None (build verification)

**Step 1: Build the docs**

Run: `npm run docs:build`
Expected: Build completes without errors

**Step 2: Preview docs locally**

Run: `npm run docs:preview`
Expected: Can navigate to /tutorial/part-5-ai-insights

---

## Task 12: Final Commit

**Files:**

- None

**Step 1: Review all changes**

Run: `git status`
Expected: All files committed

**Step 2: Create final summary commit if needed**

If there are any uncommitted fixes:

```bash
git add -A
git commit -m "fix: address review feedback for AI insights demo and tutorial"
```

---

## Summary

This plan creates:

1. **Playground Demo** (`playground/demos/AiInsightsDemo.vue`)
   - Interactive 3-tab interface
   - Sample transcripts for testing
   - Showcases all new helper methods

2. **Tutorial Part 5** (`docs/tutorial/part-5-ai-insights.md`)
   - 15-minute learning module
   - Progressive code examples
   - Follows existing tutorial style

3. **Integration**
   - Example registered in playground index
   - Tutorial index updated
   - Navigation links connected
