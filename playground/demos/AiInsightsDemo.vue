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
            <i v-if="hasSummary" class="pi pi-check-circle text-green-500"></i>
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
                  <Tag :value="String(rule.priority)" size="small" />
                </div>
              </div>
            </Panel>

            <Panel header="Disabled Rules" toggleable>
              <div v-if="disabledRules.length === 0" class="empty-state">No disabled rules</div>
              <div v-else class="rule-list">
                <div v-for="rule in disabledRules" :key="rule.id" class="rule-item muted">
                  <span class="rule-name">{{ rule.name }}</span>
                  <Tag :value="String(rule.priority)" size="small" severity="secondary" />
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
