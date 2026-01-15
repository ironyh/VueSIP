/**
 * useSentiment - Real-time sentiment analysis composable
 *
 * Analyzes transcription text for sentiment in real-time,
 * providing escalation alerts for negative sentiment.
 *
 * @module composables/useSentiment
 */

import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'

/**
 * Options for configuring sentiment analysis
 */
export interface SentimentOptions {
  /** Threshold below which escalation is triggered (-1 to 1) */
  escalationThreshold?: number
  /** Window size in seconds for trend calculation */
  windowSize?: number
  /** Minimum text length to analyze */
  minTextLength?: number
  /** Smoothing factor for sentiment (0-1, higher = more smoothing) */
  smoothingFactor?: number
  /** Custom sentiment analyzer function */
  analyzer?: (text: string) => Promise<SentimentResult>
}

/**
 * Result of sentiment analysis
 */
export interface SentimentResult {
  /** Sentiment score from -1 (negative) to 1 (positive) */
  score: number
  /** Confidence level from 0 to 1 */
  confidence: number
  /** Human-readable sentiment label */
  label: 'positive' | 'negative' | 'neutral'
}

/**
 * Breakdown of detected emotions
 */
export interface EmotionBreakdown {
  joy: number
  anger: number
  sadness: number
  fear: number
  surprise: number
  neutral: number
}

/**
 * Alert generated when sentiment triggers escalation
 */
export interface SentimentAlert {
  id: string
  type: 'escalation' | 'trend_decline' | 'sustained_negative'
  message: string
  sentiment: number
  timestamp: Date
  acknowledged: boolean
}

/**
 * Direction of sentiment trend
 */
export type SentimentTrend = 'improving' | 'declining' | 'stable'

/**
 * Return type for useSentiment composable
 */
export interface UseSentimentReturn {
  // State
  currentSentiment: Ref<number>
  sentimentTrend: ComputedRef<SentimentTrend>
  emotionBreakdown: Ref<EmotionBreakdown>
  alerts: Ref<SentimentAlert[]>
  isAnalyzing: Ref<boolean>
  confidence: Ref<number>

  // History
  sentimentHistory: Ref<Array<{ score: number; timestamp: Date }>>
  averageSentiment: ComputedRef<number>

  // Methods
  analyzeSentiment: (text: string) => Promise<SentimentResult>
  acknowledgeAlert: (alertId: string) => void
  clearAlerts: () => void
  reset: () => void

  // Events
  onEscalation: (callback: (alert: SentimentAlert) => void) => () => void
  onSentimentChange: (callback: (sentiment: number, trend: SentimentTrend) => void) => () => void
}

// ============================================================================
// Built-in Sentiment Analyzer - Keyword-based approach
// ============================================================================

/**
 * Weighted keywords for positive sentiment
 */
const POSITIVE_KEYWORDS: Record<string, number> = {
  // Strong positive (0.8-1.0)
  excellent: 0.9,
  fantastic: 0.9,
  amazing: 0.9,
  wonderful: 0.9,
  outstanding: 0.9,
  perfect: 1.0,
  love: 0.85,
  great: 0.8,
  awesome: 0.85,
  brilliant: 0.85,
  delighted: 0.9,
  thrilled: 0.9,

  // Moderate positive (0.5-0.7)
  good: 0.6,
  nice: 0.5,
  happy: 0.7,
  pleased: 0.7,
  satisfied: 0.65,
  helpful: 0.6,
  thank: 0.55,
  thanks: 0.55,
  appreciate: 0.65,
  glad: 0.6,
  fine: 0.4,
  okay: 0.3,
  sure: 0.3,
  yes: 0.2,
  agree: 0.5,
  understand: 0.4,
  resolved: 0.7,
  fixed: 0.6,
  working: 0.5,
}

/**
 * Weighted keywords for negative sentiment
 */
const NEGATIVE_KEYWORDS: Record<string, number> = {
  // Strong negative (-0.8 to -1.0)
  terrible: -0.9,
  horrible: -0.9,
  awful: -0.9,
  disgusting: -0.95,
  hate: -0.9,
  furious: -1.0,
  outraged: -1.0,
  unacceptable: -0.9,
  worst: -0.95,
  ridiculous: -0.85,

  // Moderate negative (-0.5 to -0.7)
  bad: -0.6,
  poor: -0.55,
  disappointed: -0.7,
  frustrated: -0.75,
  angry: -0.8,
  upset: -0.7,
  annoyed: -0.65,
  unhappy: -0.7,
  dissatisfied: -0.7,
  problem: -0.4,
  issue: -0.35,
  broken: -0.6,
  failed: -0.55,
  wrong: -0.5,
  error: -0.4,
  mistake: -0.45,
  complaint: -0.5,
  complain: -0.55,
  waiting: -0.3,
  slow: -0.4,
  never: -0.3,
  no: -0.15,
  not: -0.1,
  cancel: -0.5,
  refund: -0.4,
  waste: -0.6,
  useless: -0.7,
  incompetent: -0.85,
}

/**
 * Intensifier words that amplify sentiment
 */
const INTENSIFIERS: Record<string, number> = {
  very: 1.5,
  really: 1.4,
  extremely: 1.8,
  absolutely: 1.7,
  completely: 1.6,
  totally: 1.5,
  incredibly: 1.6,
  so: 1.3,
  quite: 1.2,
  pretty: 1.1,
  somewhat: 0.8,
  slightly: 0.6,
  'a bit': 0.7,
  'kind of': 0.7,
  'sort of': 0.7,
}

/**
 * Negation words that flip sentiment
 */
const NEGATIONS = new Set([
  'not',
  "n't",
  'never',
  'no',
  'none',
  'nothing',
  'neither',
  'nobody',
  'nowhere',
  'hardly',
  'barely',
  'scarcely',
])

/**
 * Emotion-specific keywords
 */
const EMOTION_KEYWORDS: Record<keyof EmotionBreakdown, string[]> = {
  joy: [
    'happy',
    'glad',
    'delighted',
    'pleased',
    'thrilled',
    'excited',
    'wonderful',
    'great',
    'love',
    'enjoy',
  ],
  anger: [
    'angry',
    'furious',
    'outraged',
    'mad',
    'annoyed',
    'frustrated',
    'irritated',
    'hate',
    'ridiculous',
  ],
  sadness: ['sad', 'disappointed', 'unhappy', 'upset', 'depressed', 'miserable', 'sorry', 'regret'],
  fear: ['worried', 'afraid', 'scared', 'anxious', 'nervous', 'concerned', 'terrified', 'panic'],
  surprise: ['surprised', 'amazed', 'shocked', 'astonished', 'unexpected', 'wow', 'incredible'],
  neutral: [],
}

/**
 * Generate a unique ID for alerts
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Clamp a value to a range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Strip punctuation and normalize a word for matching
 */
function normalizeWord(word: string): string {
  return word.replace(/[^a-z']/g, '')
}

/**
 * Check if a word contains a negation contraction
 */
function containsNegation(word: string): boolean {
  return word.includes("n't") || word.includes("n't")
}

/**
 * Default sentiment analyzer using keyword-based approach
 */
async function defaultAnalyzer(text: string): Promise<SentimentResult> {
  const normalizedText = text.toLowerCase()
  const rawWords = normalizedText.split(/\s+/)

  let totalScore = 0
  let matchCount = 0
  let negationActive = false
  let intensifier = 1

  for (let i = 0; i < rawWords.length; i++) {
    const rawWord = rawWords[i]
    if (!rawWord) continue

    // Check for negation contraction in the word itself (e.g., "don't", "isn't")
    if (containsNegation(rawWord)) {
      negationActive = true
    }

    const word = normalizeWord(rawWord)
    if (!word) continue

    // Check for negation
    if (NEGATIONS.has(word)) {
      negationActive = true
      continue
    }

    // Check for intensifier
    if (word in INTENSIFIERS) {
      intensifier = INTENSIFIERS[word] ?? 1
      continue
    }

    // Check positive keywords
    if (word in POSITIVE_KEYWORDS) {
      let score = (POSITIVE_KEYWORDS[word] ?? 0) * intensifier
      if (negationActive) {
        score = -score * 0.8 // Negation flips and slightly reduces magnitude
      }
      totalScore += score
      matchCount++
      negationActive = false
      intensifier = 1
      continue
    }

    // Check negative keywords
    if (word in NEGATIVE_KEYWORDS) {
      let score = (NEGATIVE_KEYWORDS[word] ?? 0) * intensifier
      if (negationActive) {
        score = -score * 0.8 // Negation flips negative to positive
      }
      totalScore += score
      matchCount++
      negationActive = false
      intensifier = 1
      continue
    }

    // Reset modifiers if no keyword matched
    if (i > 0) {
      negationActive = false
      intensifier = 1
    }
  }

  // Calculate final score
  let finalScore = 0
  let confidence = 0

  if (matchCount > 0) {
    finalScore = clamp(totalScore / matchCount, -1, 1)
    // Confidence based on number of matches relative to text length
    confidence = clamp(matchCount / Math.max(rawWords.length * 0.3, 1), 0, 1)
  }

  // Determine label
  let label: 'positive' | 'negative' | 'neutral'
  if (finalScore > 0.2) {
    label = 'positive'
  } else if (finalScore < -0.2) {
    label = 'negative'
  } else {
    label = 'neutral'
  }

  return {
    score: finalScore,
    confidence,
    label,
  }
}

/**
 * Calculate emotion breakdown from text
 */
function calculateEmotionBreakdown(text: string): EmotionBreakdown {
  const normalizedText = text.toLowerCase()
  const breakdown: EmotionBreakdown = {
    joy: 0,
    anger: 0,
    sadness: 0,
    fear: 0,
    surprise: 0,
    neutral: 0,
  }

  let totalMatches = 0

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    if (emotion === 'neutral') continue

    let emotionScore = 0
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        emotionScore++
        totalMatches++
      }
    }
    breakdown[emotion as keyof EmotionBreakdown] = emotionScore
  }

  // Normalize to percentages
  if (totalMatches > 0) {
    for (const emotion of Object.keys(breakdown) as Array<keyof EmotionBreakdown>) {
      if (emotion !== 'neutral') {
        breakdown[emotion] = breakdown[emotion] / totalMatches
      }
    }
    // Calculate neutral as remainder
    const emotionSum =
      breakdown.joy + breakdown.anger + breakdown.sadness + breakdown.fear + breakdown.surprise
    breakdown.neutral = Math.max(0, 1 - emotionSum)
  } else {
    // No emotion keywords found, default to neutral
    breakdown.neutral = 1
  }

  return breakdown
}

/**
 * Vue composable for real-time sentiment analysis
 *
 * Features:
 * - Real-time sentiment scoring from transcription
 * - Trend calculation (improving/declining/stable)
 * - Emotion breakdown estimation
 * - Escalation alerts for negative sentiment
 * - History tracking with configurable window
 * - Support for custom sentiment analyzers
 *
 * @param transcriptionRef - Reactive reference to transcription text
 * @param options - Configuration options
 * @returns Sentiment analysis state and methods
 *
 * @example
 * ```typescript
 * const transcription = ref('')
 * const {
 *   currentSentiment,
 *   sentimentTrend,
 *   alerts,
 *   onEscalation
 * } = useSentiment(transcription, {
 *   escalationThreshold: -0.5,
 *   windowSize: 30
 * })
 *
 * // Listen for escalations
 * const unsubscribe = onEscalation((alert) => {
 *   console.log('Escalation triggered:', alert.message)
 * })
 *
 * // Update transcription
 * transcription.value = 'I am very frustrated with this service'
 * // currentSentiment will update automatically
 * ```
 */
export function useSentiment(
  transcriptionRef: Ref<string> | ComputedRef<string>,
  options: SentimentOptions = {}
): UseSentimentReturn {
  const {
    escalationThreshold = -0.5,
    windowSize = 30,
    minTextLength = 3,
    smoothingFactor = 0.3,
    analyzer = defaultAnalyzer,
  } = options

  // ============================================================================
  // State
  // ============================================================================

  const currentSentiment = ref(0)
  const emotionBreakdown = ref<EmotionBreakdown>({
    joy: 0,
    anger: 0,
    sadness: 0,
    fear: 0,
    surprise: 0,
    neutral: 1,
  })
  const alerts = ref<SentimentAlert[]>([])
  const isAnalyzing = ref(false)
  const confidence = ref(0)
  const sentimentHistory = ref<Array<{ score: number; timestamp: Date }>>([])

  // Internal state
  let previousText = ''
  let sustainedNegativeCount = 0
  const escalationCallbacks: Array<(alert: SentimentAlert) => void> = []
  const sentimentChangeCallbacks: Array<(sentiment: number, trend: SentimentTrend) => void> = []

  // ============================================================================
  // Computed
  // ============================================================================

  /**
   * Calculate sentiment trend based on recent history
   */
  const sentimentTrend = computed<SentimentTrend>(() => {
    const history = sentimentHistory.value
    if (history.length < 2) return 'stable'

    // Look at recent entries within the window
    const now = Date.now()
    const windowMs = windowSize * 1000
    const recentHistory = history.filter((h) => now - h.timestamp.getTime() < windowMs)

    if (recentHistory.length < 2) return 'stable'

    // Calculate trend using linear regression
    const n = recentHistory.length
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0

    for (let i = 0; i < n; i++) {
      const item = recentHistory[i]
      if (!item) continue
      const x = i
      const y = item.score
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

    // Determine trend based on slope
    if (slope > 0.05) return 'improving'
    if (slope < -0.05) return 'declining'
    return 'stable'
  })

  /**
   * Calculate average sentiment over the window
   */
  const averageSentiment = computed<number>(() => {
    const history = sentimentHistory.value
    if (history.length === 0) return 0

    // Filter to recent entries within the window
    const now = Date.now()
    const windowMs = windowSize * 1000
    const recentHistory = history.filter((h) => now - h.timestamp.getTime() < windowMs)

    if (recentHistory.length === 0) return 0

    const sum = recentHistory.reduce((acc, h) => acc + h.score, 0)
    return sum / recentHistory.length
  })

  // ============================================================================
  // Methods
  // ============================================================================

  /**
   * Analyze sentiment of given text
   */
  async function analyzeSentiment(text: string): Promise<SentimentResult> {
    if (!text || text.length < minTextLength) {
      return { score: 0, confidence: 0, label: 'neutral' }
    }

    isAnalyzing.value = true

    try {
      const result = await analyzer(text)

      // Apply smoothing to current sentiment
      const smoothedScore =
        currentSentiment.value * smoothingFactor + result.score * (1 - smoothingFactor)

      currentSentiment.value = smoothedScore
      confidence.value = result.confidence

      // Update emotion breakdown
      emotionBreakdown.value = calculateEmotionBreakdown(text)

      // Add to history
      const historyEntry = { score: result.score, timestamp: new Date() }
      sentimentHistory.value.push(historyEntry)

      // Trim history to keep only entries within the window
      const now = Date.now()
      const windowMs = windowSize * 1000
      sentimentHistory.value = sentimentHistory.value.filter(
        (h) => now - h.timestamp.getTime() < windowMs * 2 // Keep 2x window for trend calc
      )

      // Check for alerts
      checkForAlerts(smoothedScore)

      // Notify sentiment change callbacks
      const trend = sentimentTrend.value
      sentimentChangeCallbacks.forEach((cb) => cb(smoothedScore, trend))

      return result
    } finally {
      isAnalyzing.value = false
    }
  }

  /**
   * Check if alerts should be generated
   */
  function checkForAlerts(sentiment: number): void {
    // Escalation alert for dropping below threshold
    if (sentiment < escalationThreshold) {
      const alert: SentimentAlert = {
        id: generateAlertId(),
        type: 'escalation',
        message: `Sentiment dropped below threshold (${sentiment.toFixed(2)} < ${escalationThreshold})`,
        sentiment,
        timestamp: new Date(),
        acknowledged: false,
      }
      alerts.value.push(alert)
      escalationCallbacks.forEach((cb) => cb(alert))

      // Track sustained negative
      sustainedNegativeCount++
      if (sustainedNegativeCount >= 3) {
        const sustainedAlert: SentimentAlert = {
          id: generateAlertId(),
          type: 'sustained_negative',
          message: `Sustained negative sentiment detected (${sustainedNegativeCount} consecutive)`,
          sentiment,
          timestamp: new Date(),
          acknowledged: false,
        }
        alerts.value.push(sustainedAlert)
        escalationCallbacks.forEach((cb) => cb(sustainedAlert))
      }
    } else {
      sustainedNegativeCount = 0
    }

    // Trend decline alert
    if (sentimentTrend.value === 'declining' && sentiment < 0) {
      const hasRecentTrendAlert = alerts.value.some(
        (a) => a.type === 'trend_decline' && Date.now() - a.timestamp.getTime() < 10000 // Within last 10 seconds
      )

      if (!hasRecentTrendAlert) {
        const alert: SentimentAlert = {
          id: generateAlertId(),
          type: 'trend_decline',
          message: 'Sentiment trend is declining',
          sentiment,
          timestamp: new Date(),
          acknowledged: false,
        }
        alerts.value.push(alert)
        escalationCallbacks.forEach((cb) => cb(alert))
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  function acknowledgeAlert(alertId: string): void {
    const alert = alerts.value.find((a) => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  /**
   * Clear all alerts
   */
  function clearAlerts(): void {
    alerts.value = []
  }

  /**
   * Reset all state
   */
  function reset(): void {
    currentSentiment.value = 0
    emotionBreakdown.value = {
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      surprise: 0,
      neutral: 1,
    }
    alerts.value = []
    isAnalyzing.value = false
    confidence.value = 0
    sentimentHistory.value = []
    previousText = ''
    sustainedNegativeCount = 0
  }

  /**
   * Register callback for escalation events
   */
  function onEscalation(callback: (alert: SentimentAlert) => void): () => void {
    escalationCallbacks.push(callback)
    return () => {
      const index = escalationCallbacks.indexOf(callback)
      if (index > -1) {
        escalationCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for sentiment change events
   */
  function onSentimentChange(
    callback: (sentiment: number, trend: SentimentTrend) => void
  ): () => void {
    sentimentChangeCallbacks.push(callback)
    return () => {
      const index = sentimentChangeCallbacks.indexOf(callback)
      if (index > -1) {
        sentimentChangeCallbacks.splice(index, 1)
      }
    }
  }

  // ============================================================================
  // Watchers
  // ============================================================================

  const stopWatch = watch(
    transcriptionRef,
    async (newText) => {
      if (newText && newText !== previousText && newText.length >= minTextLength) {
        previousText = newText
        await analyzeSentiment(newText)
      }
    },
    { immediate: true }
  )

  // ============================================================================
  // Cleanup
  // ============================================================================

  onUnmounted(() => {
    stopWatch()
    escalationCallbacks.length = 0
    sentimentChangeCallbacks.length = 0
  })

  // ============================================================================
  // Return Interface
  // ============================================================================

  return {
    // State
    currentSentiment,
    sentimentTrend,
    emotionBreakdown,
    alerts,
    isAnalyzing,
    confidence,

    // History
    sentimentHistory,
    averageSentiment,

    // Methods
    analyzeSentiment,
    acknowledgeAlert,
    clearAlerts,
    reset,

    // Events
    onEscalation,
    onSentimentChange,
  }
}
