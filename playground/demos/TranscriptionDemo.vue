<template>
  <div class="transcription-demo">
    <!-- Browser Compatibility Warning -->
    <Message v-if="!isSpeechSupported" severity="warn" :closable="false" class="mb-4">
      <template #icon>
        <span class="text-xl">⚠️</span>
      </template>
      Your browser doesn't support the Web Speech API. You can still use the demo with mock
      playback.
    </Message>

    <!-- Scenario Selector -->
    <Card class="mb-4">
      <template #title>
        <div class="flex align-items-center gap-2">
          <span>🎭</span>
          <span>Select Scenario</span>
        </div>
      </template>
      <template #content>
        <div class="scenario-grid">
          <div
            v-for="scenario in scenarios"
            :key="scenario.id"
            :class="['scenario-card', { active: selectedScenario?.id === scenario.id }]"
            @click="selectScenario(scenario)"
          >
            <span class="scenario-icon">{{ scenario.icon }}</span>
            <div class="scenario-info">
              <strong>{{ scenario.name }}</strong>
              <small>{{ scenario.description }}</small>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Tab Navigation -->
    <TabView v-model:activeIndex="activeTab" class="transcription-tabs">
      <!-- Tab 1: Basic Transcription -->
      <TabPanel>
        <template #header>
          <span class="tab-header">
            <span class="tab-icon">🎤</span>
            <span>Basic</span>
          </span>
        </template>

        <div class="tab-content">
          <div class="controls-row mb-4">
            <div class="flex gap-2">
              <Button
                :label="isPlayingMock ? 'Stop Demo' : 'Play Demo'"
                :icon="isPlayingMock ? 'pi pi-stop' : 'pi pi-play'"
                :severity="isPlayingMock ? 'danger' : 'success'"
                @click="toggleMockPlayback"
                :disabled="!selectedScenario"
              />
              <Button
                v-if="isSpeechSupported"
                :label="isTranscribing ? 'Stop Mic' : 'Use Mic'"
                :icon="isTranscribing ? 'pi pi-microphone-slash' : 'pi pi-microphone'"
                :severity="isTranscribing ? 'warning' : 'info'"
                @click="toggleTranscription"
              />
              <Button
                label="Clear"
                icon="pi pi-trash"
                severity="secondary"
                @click="clearTranscript"
                :disabled="transcriptEntries.length === 0"
              />
            </div>
            <div class="flex gap-2">
              <Dropdown
                v-model="exportFormat"
                :options="exportFormats"
                optionLabel="label"
                optionValue="value"
                placeholder="Export as..."
                class="w-8rem"
              />
              <Button
                label="Export"
                icon="pi pi-download"
                severity="secondary"
                @click="handleExport"
                :disabled="transcriptEntries.length === 0"
              />
            </div>
          </div>

          <!-- Transcript Display -->
          <div class="transcript-container">
            <div v-if="transcriptEntries.length === 0" class="empty-state">
              <span class="empty-icon">📝</span>
              <p>Select a scenario and click "Play Demo" to see transcription in action</p>
              <p v-if="isSpeechSupported" class="text-sm text-500">
                Or click "Use Mic" to transcribe your voice
              </p>
            </div>
            <TransitionGroup name="transcript" tag="div" class="transcript-entries">
              <div
                v-for="entry in transcriptEntries"
                :key="entry.id"
                :class="['transcript-entry', entry.speaker]"
              >
                <div class="entry-header">
                  <span class="speaker-badge">
                    {{
                      entry.speaker === 'local'
                        ? selectedScenario?.localRole || 'You'
                        : selectedScenario?.remoteRole || 'Remote'
                    }}
                  </span>
                  <span class="timestamp">{{ formatTimestamp(entry.timestamp) }}</span>
                </div>
                <p class="entry-text">{{ entry.text }}</p>
              </div>
            </TransitionGroup>
            <div v-if="currentUtterance" class="interim-text">
              <span class="typing-indicator">●●●</span>
              {{ currentUtterance }}
            </div>
          </div>

          <!-- Progress to Next Tab -->
          <div v-if="transcriptEntries.length >= 3 && activeTab === 0" class="next-level-prompt">
            <Message severity="info" :closable="false">
              <template #icon><span>💡</span></template>
              Ready for more? Check out the <strong>Keywords</strong> tab to detect important
              phrases!
              <Button label="Go to Keywords" size="small" class="ml-3" @click="activeTab = 1" />
            </Message>
          </div>
        </div>
      </TabPanel>

      <!-- Tab 2: Keywords -->
      <TabPanel>
        <template #header>
          <span class="tab-header">
            <span class="tab-icon">🔑</span>
            <span>Keywords</span>
            <Badge
              v-if="keywordMatches.length > 0"
              :value="keywordMatches.length"
              severity="danger"
              class="ml-2"
            />
          </span>
        </template>

        <div class="tab-content">
          <!-- Keyword Configuration -->
          <div class="keyword-config mb-4">
            <div class="flex align-items-center justify-content-between mb-3">
              <h4 class="m-0">Active Keywords</h4>
              <Button
                label="Add Keyword"
                icon="pi pi-plus"
                size="small"
                @click="showAddKeyword = true"
              />
            </div>
            <div class="keyword-tags">
              <Tag
                v-for="kw in activeKeywords"
                :key="kw.phrase"
                :severity="
                  kw.severity === 'critical'
                    ? 'danger'
                    : kw.severity === 'warning'
                      ? 'warn'
                      : 'info'
                "
                :value="kw.phrase"
                class="keyword-tag"
              >
                <span>{{ kw.phrase }}</span>
                <i class="pi pi-times ml-2 cursor-pointer" @click="removeKeyword(kw.phrase)"></i>
              </Tag>
            </div>
          </div>

          <!-- Keyword Matches -->
          <div v-if="keywordMatches.length > 0" class="keyword-matches mb-4">
            <h4>Detected Keywords</h4>
            <div class="match-list">
              <div
                v-for="match in keywordMatches"
                :key="match.id"
                :class="['match-item', match.severity]"
              >
                <span class="match-keyword">{{ match.keyword }}</span>
                <span class="match-context">"...{{ match.context }}..."</span>
                <span class="match-time">{{ formatTimestamp(match.timestamp) }}</span>
              </div>
            </div>
          </div>

          <!-- Same transcript display -->
          <div class="transcript-container compact">
            <div
              v-for="entry in transcriptEntries"
              :key="entry.id"
              :class="['transcript-entry', entry.speaker]"
              v-html="highlightKeywords(entry.text)"
            ></div>
          </div>

          <!-- Progress to AI tab -->
          <div v-if="keywordMatches.length >= 2 && activeTab === 1" class="next-level-prompt">
            <Message severity="info" :closable="false">
              <template #icon><span>🤖</span></template>
              Want AI-powered coaching suggestions? Check out the <strong>AI Assist</strong> tab!
              <Button label="Go to AI Assist" size="small" class="ml-3" @click="activeTab = 2" />
            </Message>
          </div>
        </div>
      </TabPanel>

      <!-- Tab 3: AI Assist -->
      <TabPanel>
        <template #header>
          <span class="tab-header">
            <span class="tab-icon">🤖</span>
            <span>AI Assist</span>
          </span>
        </template>

        <div class="tab-content">
          <!-- API Configuration -->
          <Card class="mb-4">
            <template #title>
              <div class="flex align-items-center gap-2">
                <span>⚙️</span>
                <span>AI Configuration</span>
              </div>
            </template>
            <template #content>
              <div class="ai-config">
                <div class="config-row">
                  <label>Mode:</label>
                  <SelectButton
                    v-model="aiConfig.provider"
                    :options="aiProviders"
                    optionLabel="label"
                    optionValue="value"
                    @change="saveAIConfig"
                  />
                </div>
                <div v-if="aiConfig.provider !== 'mock'" class="config-row mt-3">
                  <label>API Key:</label>
                  <div class="flex gap-2 flex-1">
                    <Password
                      v-model="aiConfig.apiKey"
                      :feedback="false"
                      toggleMask
                      placeholder="Enter your API key"
                      class="flex-1"
                      @change="saveAIConfig"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      outlined
                      @click="clearAIConfig"
                      v-tooltip="'Clear saved key'"
                    />
                  </div>
                </div>
                <Message
                  v-if="aiConfig.provider !== 'mock'"
                  severity="warn"
                  class="mt-3"
                  :closable="false"
                >
                  <small>
                    ⚠️ API keys are stored in localStorage for demo convenience. For production use,
                    implement secure backend storage.
                  </small>
                </Message>
              </div>
            </template>
          </Card>

          <!-- AI Suggestions Panel -->
          <div class="ai-suggestions-panel">
            <div class="panel-header">
              <h4>
                <span>💡</span> Coaching Suggestions
                <Tag
                  :value="aiConfig.provider === 'mock' ? 'Demo Mode' : 'Live AI'"
                  :severity="aiConfig.provider === 'mock' ? 'info' : 'success'"
                  class="ml-2"
                />
              </h4>
            </div>
            <div class="suggestions-list">
              <TransitionGroup name="suggestion">
                <div
                  v-for="suggestion in aiSuggestions"
                  :key="suggestion.id"
                  :class="['suggestion-card', suggestion.type]"
                >
                  <span class="suggestion-icon">
                    {{
                      suggestion.type === 'tip' ? '💡' : suggestion.type === 'warning' ? '⚠️' : '✅'
                    }}
                  </span>
                  <span class="suggestion-text">{{ suggestion.message }}</span>
                </div>
              </TransitionGroup>
              <div v-if="aiSuggestions.length === 0" class="empty-suggestions">
                <p>Suggestions will appear as the conversation progresses</p>
              </div>
            </div>
          </div>

          <!-- Sentiment Analysis -->
          <Card class="mt-4">
            <template #title>
              <div class="flex align-items-center gap-2">
                <span>📊</span>
                <span>Sentiment Analysis</span>
              </div>
            </template>
            <template #content>
              <div class="sentiment-display">
                <div class="sentiment-indicator" :class="sentiment.overall">
                  <span class="sentiment-emoji">
                    {{
                      sentiment.overall === 'positive'
                        ? '😊'
                        : sentiment.overall === 'negative'
                          ? '😟'
                          : '😐'
                    }}
                  </span>
                  <span class="sentiment-label">{{ sentiment.overall }}</span>
                  <span class="sentiment-confidence"
                    >{{ Math.round(sentiment.confidence * 100) }}% confident</span
                  >
                </div>
                <div v-if="sentiment.indicators.length > 0" class="sentiment-indicators">
                  <Tag
                    v-for="indicator in sentiment.indicators"
                    :key="indicator"
                    :value="indicator"
                    severity="secondary"
                    class="mr-2 mb-2"
                  />
                </div>
              </div>
            </template>
          </Card>

          <!-- Compact transcript -->
          <div class="transcript-container compact mt-4">
            <div
              v-for="entry in transcriptEntries"
              :key="entry.id"
              :class="['transcript-entry', entry.speaker]"
            >
              {{ entry.text }}
            </div>
          </div>
        </div>
      </TabPanel>
    </TabView>

    <!-- Add Keyword Dialog -->
    <Dialog
      v-model:visible="showAddKeyword"
      header="Add Keyword"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="flex flex-column gap-3">
        <div class="field">
          <label for="new-keyword">Phrase</label>
          <InputText
            id="new-keyword"
            v-model="newKeyword.phrase"
            class="w-full"
            placeholder="e.g., cancel, refund"
          />
        </div>
        <div class="field">
          <label for="keyword-severity">Severity</label>
          <Dropdown
            id="keyword-severity"
            v-model="newKeyword.severity"
            :options="severityOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" severity="secondary" @click="showAddKeyword = false" />
        <Button label="Add" @click="addCustomKeyword" :disabled="!newKeyword.phrase" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import SelectButton from 'primevue/selectbutton'

import { useTranscription } from 'vuesip'
import type { TranscriptEntry } from '@/types/transcription.types'

import { scenarios, type Scenario, type ScenarioKeyword } from './transcription/scenarios'
import {
  loadSavedConfig,
  saveConfig,
  clearConfig,
  getMockSuggestions,
  getMockSentiment,
  getAISuggestions,
  type AIServiceConfig,
  type AISuggestion,
  type SentimentAnalysis,
} from './transcription/ai-service'

// Check browser support
const isSpeechSupported = ref(
  typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
)

// Tab state
const activeTab = ref(0)

// Scenario state
const selectedScenario = ref<Scenario | null>(null)

// Mock playback state
const isPlayingMock = ref(false)
const mockPlaybackTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const currentMockLine = ref(0)

// Local transcript entries (for mock playback)
const transcriptEntries = ref<TranscriptEntry[]>([])

// Transcription composable
const {
  isTranscribing,
  transcript,
  currentUtterance,
  start,
  stop,
  clear,
  addKeyword,
  exportTranscript,
} = useTranscription({
  provider: 'web-speech',
  language: 'en-US',
})

// Keywords state
const activeKeywords = ref<ScenarioKeyword[]>([])
const keywordMatches = ref<
  Array<{
    id: string
    keyword: string
    context: string
    timestamp: number
    severity: 'critical' | 'warning' | 'info'
  }>
>([])
const showAddKeyword = ref(false)
const newKeyword = ref({ phrase: '', severity: 'info' as const })
const severityOptions = [
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warning' },
  { label: 'Critical', value: 'critical' },
]

// AI state
const aiConfig = ref<AIServiceConfig>(loadSavedConfig())
const aiSuggestions = ref<AISuggestion[]>([])
const sentiment = ref<SentimentAnalysis>({ overall: 'neutral', confidence: 0.5, indicators: [] })
const aiProviders = [
  { label: 'Demo Mode', value: 'mock' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
]

// Export options
const exportFormat = ref('txt')
const exportFormats = [
  { label: 'TXT', value: 'txt' },
  { label: 'SRT', value: 'srt' },
  { label: 'VTT', value: 'vtt' },
  { label: 'JSON', value: 'json' },
]

// Scenario selection
function selectScenario(scenario: Scenario) {
  selectedScenario.value = scenario
  activeKeywords.value = [...scenario.keywords]

  // Clear previous state
  clearTranscript()
  aiSuggestions.value = []
  keywordMatches.value = []

  // Register keywords
  scenario.keywords.forEach((kw) => {
    addKeyword({ phrase: kw.phrase, action: kw.action })
  })
}

// Mock playback
function toggleMockPlayback() {
  if (isPlayingMock.value) {
    stopMockPlayback()
  } else {
    startMockPlayback()
  }
}

function startMockPlayback() {
  if (!selectedScenario.value) return

  isPlayingMock.value = true
  currentMockLine.value = 0
  playNextMockLine()
}

function playNextMockLine() {
  if (!selectedScenario.value || !isPlayingMock.value) return

  const conversation = selectedScenario.value.conversation
  if (currentMockLine.value >= conversation.length) {
    stopMockPlayback()
    return
  }

  const line = conversation[currentMockLine.value]

  mockPlaybackTimer.value = setTimeout(
    () => {
      // Add to transcript
      const entry: TranscriptEntry = {
        id: `mock-${Date.now()}`,
        participantId: line.speaker,
        speaker: line.speaker,
        text: line.text,
        timestamp: Date.now(),
        isFinal: true,
        confidence: 0.95,
      }
      transcriptEntries.value = [...transcriptEntries.value, entry]

      // Check for keyword matches
      checkKeywords(entry)

      // Update AI suggestions
      updateAISuggestions()

      currentMockLine.value++
      playNextMockLine()
    },
    currentMockLine.value === 0 ? 500 : line.delayMs
  )
}

function stopMockPlayback() {
  isPlayingMock.value = false
  if (mockPlaybackTimer.value) {
    clearTimeout(mockPlaybackTimer.value)
    mockPlaybackTimer.value = null
  }
}

// Transcription controls
function toggleTranscription() {
  if (isTranscribing.value) {
    stop()
  } else {
    start()
  }
}

function clearTranscript() {
  clear()
  transcriptEntries.value = []
  keywordMatches.value = []
  aiSuggestions.value = []
  currentMockLine.value = 0
  sentiment.value = { overall: 'neutral', confidence: 0.5, indicators: [] }
}

// Keyword detection
function checkKeywords(entry: TranscriptEntry) {
  const text = entry.text.toLowerCase()

  activeKeywords.value.forEach((kw) => {
    if (text.includes(kw.phrase.toLowerCase())) {
      const startIdx = Math.max(0, text.indexOf(kw.phrase.toLowerCase()) - 20)
      const endIdx = Math.min(
        text.length,
        text.indexOf(kw.phrase.toLowerCase()) + kw.phrase.length + 20
      )

      keywordMatches.value.push({
        id: `match-${Date.now()}-${kw.phrase}`,
        keyword: kw.phrase,
        context: entry.text.slice(startIdx, endIdx),
        timestamp: entry.timestamp,
        severity: kw.severity,
      })
    }
  })
}

function highlightKeywords(text: string): string {
  let result = text
  activeKeywords.value.forEach((kw) => {
    const regex = new RegExp(`(${kw.phrase})`, 'gi')
    const severity =
      kw.severity === 'critical' ? 'danger' : kw.severity === 'warning' ? 'warn' : 'info'
    result = result.replace(regex, `<mark class="keyword-highlight ${severity}">$1</mark>`)
  })
  return result
}

function removeKeyword(phrase: string) {
  activeKeywords.value = activeKeywords.value.filter((kw) => kw.phrase !== phrase)
}

function addCustomKeyword() {
  if (newKeyword.value.phrase) {
    activeKeywords.value.push({
      phrase: newKeyword.value.phrase,
      action: 'highlight',
      severity: newKeyword.value.severity,
    })
    newKeyword.value = { phrase: '', severity: 'info' }
    showAddKeyword.value = false
  }
}

// AI functions
function saveAIConfig() {
  saveConfig(aiConfig.value)
}

function clearAIConfig() {
  clearConfig()
  aiConfig.value = { provider: 'mock' }
}

async function updateAISuggestions() {
  if (!selectedScenario.value) return

  // Mock suggestions
  if (aiConfig.value.provider === 'mock') {
    aiSuggestions.value = getMockSuggestions(selectedScenario.value, currentMockLine.value)
  } else {
    // Real AI suggestions (throttled)
    if (transcriptEntries.value.length % 3 === 0) {
      const suggestions = await getAISuggestions(aiConfig.value, transcriptEntries.value, {
        scenario: selectedScenario.value.industry,
        localRole: selectedScenario.value.localRole,
      })
      aiSuggestions.value = [...aiSuggestions.value, ...suggestions]
    }
  }

  // Update sentiment
  sentiment.value = getMockSentiment(transcriptEntries.value)
}

// Export
function handleExport() {
  const content = exportTranscript(exportFormat.value as 'txt' | 'srt' | 'vtt' | 'json')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transcript.${exportFormat.value}`
  a.click()
  URL.revokeObjectURL(url)
}

// Formatting
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Watch for new transcript entries from real transcription
watch(
  transcript,
  (entries) => {
    if (entries.length > 0 && !isPlayingMock.value) {
      // Sync real transcription entries
      transcriptEntries.value = entries
      const lastEntry = entries[entries.length - 1]
      checkKeywords(lastEntry)
      updateAISuggestions()
    }
  },
  { deep: true }
)

// Cleanup
onUnmounted(() => {
  stopMockPlayback()
  stop()
})
</script>

<style scoped>
.transcription-demo {
  padding: 1rem;
}

/* Scenario Grid */
.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.scenario-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid var(--surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.scenario-card:hover {
  border-color: var(--primary-color);
  background: var(--surface-hover);
}

.scenario-card.active {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.scenario-icon {
  font-size: 2rem;
}

.scenario-info {
  display: flex;
  flex-direction: column;
}

.scenario-info small {
  color: var(--text-color-secondary);
}

/* Tab Header */
.tab-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-icon {
  font-size: 1.1rem;
}

/* Controls */
.controls-row {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

/* Transcript Display */
.transcript-container {
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1rem;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
}

.transcript-container.compact {
  min-height: 150px;
  max-height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.transcript-entry {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  animation: fadeIn 0.3s ease;
}

.transcript-entry.local {
  background: var(--blue-50);
  margin-right: 2rem;
}

.transcript-entry.remote {
  background: var(--surface-100);
  margin-left: 2rem;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.speaker-badge {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--primary-color);
}

.timestamp {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.entry-text {
  margin: 0;
  line-height: 1.5;
}

.interim-text {
  padding: 0.5rem;
  color: var(--text-color-secondary);
  font-style: italic;
}

.typing-indicator {
  animation: blink 1s infinite;
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Keyword styles */
.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyword-tag {
  cursor: default;
}

.keyword-tag i {
  font-size: 0.75rem;
}

:deep(.keyword-highlight) {
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
}

:deep(.keyword-highlight.danger) {
  background: var(--red-100);
  color: var(--red-700);
}

:deep(.keyword-highlight.warn) {
  background: var(--yellow-100);
  color: var(--yellow-700);
}

:deep(.keyword-highlight.info) {
  background: var(--blue-100);
  color: var(--blue-700);
}

.keyword-matches {
  background: var(--surface-50);
  padding: 1rem;
  border-radius: 8px;
}

.match-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  border-left: 3px solid;
  margin-bottom: 0.5rem;
  background: white;
}

.match-item.critical {
  border-color: var(--red-500);
}

.match-item.warning {
  border-color: var(--yellow-500);
}

.match-item.info {
  border-color: var(--blue-500);
}

.match-keyword {
  font-weight: 600;
  min-width: 80px;
}

.match-context {
  flex: 1;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.match-time {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

/* AI Panel */
.ai-config {
  display: flex;
  flex-direction: column;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.config-row label {
  min-width: 80px;
  font-weight: 500;
}

.ai-suggestions-panel {
  background: var(--surface-ground);
  border-radius: 8px;
  padding: 1rem;
}

.panel-header h4 {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.suggestions-list {
  min-height: 100px;
}

.suggestion-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  animation: slideIn 0.3s ease;
}

.suggestion-card.tip {
  background: var(--blue-50);
}

.suggestion-card.warning {
  background: var(--yellow-50);
}

.suggestion-card.success {
  background: var(--green-50);
}

.suggestion-icon {
  font-size: 1.25rem;
}

.empty-suggestions {
  text-align: center;
  color: var(--text-color-secondary);
  padding: 2rem;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Sentiment */
.sentiment-display {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sentiment-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
}

.sentiment-indicator.positive {
  background: var(--green-50);
}

.sentiment-indicator.negative {
  background: var(--red-50);
}

.sentiment-indicator.neutral {
  background: var(--surface-100);
}

.sentiment-emoji {
  font-size: 2rem;
}

.sentiment-label {
  font-weight: 600;
  text-transform: capitalize;
}

.sentiment-confidence {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

/* Next level prompt */
.next-level-prompt {
  margin-top: 1rem;
}

/* Transitions */
.transcript-enter-active,
.transcript-leave-active,
.suggestion-enter-active,
.suggestion-leave-active {
  transition: all 0.3s ease;
}

.transcript-enter-from,
.suggestion-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.transcript-leave-to,
.suggestion-leave-to {
  opacity: 0;
}
</style>
