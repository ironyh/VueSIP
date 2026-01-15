/**
 * useCallSummary - Call summarization and action item extraction composable
 *
 * Generates summaries from call transcriptions, extracts action items,
 * identifies topics, and provides structured call reports.
 *
 * @module composables/useCallSummary
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

// =============================================================================
// Types
// =============================================================================

/**
 * Options for configuring call summary generation
 */
export interface CallSummaryOptions {
  /** Maximum summary length in words */
  maxLength?: number
  /** Summary format */
  format?: 'bullet-points' | 'paragraph' | 'structured'
  /** Include sentiment in summary */
  includeSentiment?: boolean
  /** Custom summarizer function */
  summarizer?: (text: string, options: CallSummaryOptions) => Promise<CallSummaryResult>
}

/**
 * Action item extracted from transcription
 */
export interface ActionItem {
  /** Unique identifier */
  id: string
  /** Description of the action */
  description: string
  /** Priority level */
  priority: 'low' | 'medium' | 'high'
  /** Person responsible (if identified) */
  assignee?: string
  /** Due date (if identified) */
  dueDate?: string
  /** Current status */
  status: 'pending' | 'completed'
  /** Quote from transcription where this was extracted */
  extractedFrom: string
}

/**
 * Topic mentioned in the call with frequency and sentiment
 */
export interface TopicMention {
  /** Topic name/keyword */
  topic: string
  /** Number of times mentioned */
  count: number
  /** Sentiment associated with topic (-1 to 1) */
  sentiment: number
  /** Example excerpts mentioning this topic */
  excerpts: string[]
}

/**
 * Complete call summary result
 */
export interface CallSummaryResult {
  /** Generated summary text */
  summary: string
  /** Extracted action items */
  actionItems: ActionItem[]
  /** Identified topics */
  topics: TopicMention[]
  /** Sentiment analysis */
  sentiment: {
    /** Overall call sentiment (-1 to 1) */
    overall: number
    /** Sentiment at start of call */
    start: number
    /** Sentiment at end of call */
    end: number
    /** Sentiment trend */
    trend: 'improved' | 'declined' | 'stable'
  }
  /** Call duration in seconds */
  duration: number
  /** Speaker breakdown (if identifiable) */
  speakerBreakdown?: {
    /** Agent speaking percentage */
    agent: number
    /** Caller speaking percentage */
    caller: number
  }
  /** Key phrases from the call */
  keyPhrases: string[]
  /** Detected call type */
  callType: 'support' | 'sales' | 'inquiry' | 'complaint' | 'general'
}

/**
 * Return type for useCallSummary composable
 */
export interface UseCallSummaryReturn {
  // State
  /** Whether summary generation is in progress */
  isGenerating: Ref<boolean>
  /** Most recent summary result */
  lastSummary: Ref<CallSummaryResult | null>
  /** Error message if any */
  error: Ref<string | null>

  // Computed
  /** Whether a summary has been generated */
  hasSummary: ComputedRef<boolean>

  // Methods
  /** Generate a complete call summary from transcription */
  generateSummary: (
    transcription: string,
    options?: CallSummaryOptions
  ) => Promise<CallSummaryResult>
  /** Extract action items from transcription */
  extractActionItems: (transcription: string) => ActionItem[]
  /** Extract topics from transcription */
  extractTopics: (transcription: string) => TopicMention[]
  /** Detect the type of call */
  detectCallType: (transcription: string) => CallSummaryResult['callType']
  /** Extract key phrases using TF-IDF-like scoring */
  extractKeyPhrases: (transcription: string, limit?: number) => string[]

  // Utilities
  /** Format summary result in specified format */
  formatSummary: (result: CallSummaryResult, format: CallSummaryOptions['format']) => string
  /** Estimate sentiment from transcription */
  estimateSentiment: (transcription: string) => CallSummaryResult['sentiment']

  /** Get high priority action items */
  getHighPriorityActionItems: (items: ActionItem[]) => ActionItem[]
  /** Get pending action items */
  getPendingActionItems: (items: ActionItem[]) => ActionItem[]
  /** Count action items by status */
  countActionItemsByStatus: (items: ActionItem[]) => { pending: number; completed: number }
  /** Mark action item as completed */
  completeActionItem: (items: ActionItem[], id: string) => boolean

  // Export
  /** Export summary as plain text */
  exportAsText: (result: CallSummaryResult) => string
  /** Export summary as JSON */
  exportAsJSON: (result: CallSummaryResult) => string
  /** Export summary as HTML */
  exportAsHTML: (result: CallSummaryResult) => string
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Patterns for detecting action item commitments
 */
const COMMITMENT_PATTERNS = [
  /\bi will\b/i,
  /\bi'll\b/i,
  /\bwe will\b/i,
  /\bwe'll\b/i,
  /\bgoing to\b/i,
  /\blet me\b/i,
  /\bi can\b/i,
  /\bi'm going to\b/i,
]

/**
 * Patterns for detecting requests
 */
const REQUEST_PATTERNS = [
  /\bplease\b/i,
  /\bcould you\b/i,
  /\bwould you\b/i,
  /\bcan you\b/i,
  /\bwill you\b/i,
]

/**
 * Patterns for detecting deadlines/timeframes
 */
const DEADLINE_PATTERNS = [
  /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  /\bby\s+(tomorrow|today|tonight)/i,
  /\bwithin\s+(\d+)\s*(hours?|days?|weeks?|minutes?)/i,
  /\bnext\s+(week|month|day)/i,
  /\b(\d+)\s*(-|to)\s*(\d+)\s*(business\s+)?days?\b/i,
  /\b(this|next)\s+(week|month)\b/i,
  /\bby\s+(end\s+of\s+)?(the\s+)?(day|week|month)\b/i,
]

/**
 * Patterns for follow-up actions
 */
const FOLLOW_UP_PATTERNS = [
  /\bfollow\s*up\b/i,
  /\bget\s+back\s+to\b/i,
  /\bcheck\s+on\b/i,
  /\bsend\b.*\b(email|confirmation|details)/i,
  /\bcall\s+(you\s+)?back\b/i,
  /\bupdate\s+(you|me)\b/i,
]

/**
 * Keywords for call type detection
 */
const CALL_TYPE_KEYWORDS: Record<CallSummaryResult['callType'], string[]> = {
  support: [
    'problem',
    'issue',
    'broken',
    'not working',
    'fix',
    'error',
    'help',
    'support',
    'trouble',
    'reset',
    'troubleshoot',
  ],
  sales: [
    'price',
    'cost',
    'buy',
    'purchase',
    'discount',
    'offer',
    'deal',
    'plan',
    'subscribe',
    'upgrade',
    'package',
  ],
  inquiry: [
    'information',
    'how does',
    'what is',
    'can you tell',
    'wondering',
    'question',
    'explain',
    'details',
  ],
  complaint: [
    'complaint',
    'frustrated',
    'angry',
    'unacceptable',
    'terrible',
    'worst',
    'disappointed',
    'refund',
    'cancel',
    'demand',
  ],
  general: [],
}

/**
 * Sentiment keywords with scores
 */
const POSITIVE_KEYWORDS: Record<string, number> = {
  excellent: 0.9,
  fantastic: 0.9,
  amazing: 0.9,
  wonderful: 0.9,
  perfect: 1.0,
  great: 0.8,
  good: 0.6,
  nice: 0.5,
  happy: 0.7,
  pleased: 0.7,
  satisfied: 0.65,
  helpful: 0.6,
  thank: 0.55,
  thanks: 0.55,
  appreciate: 0.65,
  resolved: 0.7,
  fixed: 0.6,
}

const NEGATIVE_KEYWORDS: Record<string, number> = {
  terrible: -0.9,
  horrible: -0.9,
  awful: -0.9,
  hate: -0.9,
  furious: -1.0,
  unacceptable: -0.9,
  worst: -0.95,
  bad: -0.6,
  poor: -0.55,
  disappointed: -0.7,
  frustrated: -0.75,
  angry: -0.8,
  upset: -0.7,
  annoyed: -0.65,
  problem: -0.4,
  issue: -0.35,
  broken: -0.6,
  failed: -0.55,
  wrong: -0.5,
  error: -0.4,
  complaint: -0.5,
  cancel: -0.5,
  refund: -0.4,
}

/**
 * Common stopwords to filter from key phrases
 */
const STOPWORDS = new Set([
  'i',
  'me',
  'my',
  'myself',
  'we',
  'our',
  'ours',
  'ourselves',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  'he',
  'him',
  'his',
  'himself',
  'she',
  'her',
  'hers',
  'herself',
  'it',
  'its',
  'itself',
  'they',
  'them',
  'their',
  'theirs',
  'themselves',
  'what',
  'which',
  'who',
  'whom',
  'this',
  'that',
  'these',
  'those',
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'having',
  'do',
  'does',
  'did',
  'doing',
  'a',
  'an',
  'the',
  'and',
  'but',
  'if',
  'or',
  'because',
  'as',
  'until',
  'while',
  'of',
  'at',
  'by',
  'for',
  'with',
  'about',
  'against',
  'between',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'to',
  'from',
  'up',
  'down',
  'in',
  'out',
  'on',
  'off',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  's',
  't',
  'can',
  'will',
  'just',
  'don',
  'should',
  'now',
  "don't",
  "i'm",
  "i'll",
  "i've",
  "it's",
  "that's",
  "what's",
  "let's",
  "we'll",
  "we're",
  "you're",
  "they're",
  "can't",
  "won't",
  "wouldn't",
  "couldn't",
  "shouldn't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "hasn't",
  "haven't",
  "hadn't",
  "doesn't",
  "didn't",
  'hello',
  'hi',
  'hey',
  'yes',
  'yeah',
  'ok',
  'okay',
  'um',
  'uh',
  'well',
  'like',
  'right',
  'actually',
  'basically',
  'really',
  'just',
  'agent',
  'caller',
])

/**
 * Topic keywords for identification
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  billing: [
    'billing',
    'bill',
    'charge',
    'charged',
    'invoice',
    'payment',
    'pay',
    'price',
    'cost',
    'fee',
    'credit',
    'debit',
  ],
  account: ['account', 'login', 'password', 'username', 'profile', 'settings', 'access'],
  technical: ['error', 'bug', 'crash', 'slow', 'loading', 'connection', 'update', 'install'],
  shipping: ['shipping', 'delivery', 'ship', 'deliver', 'tracking', 'order', 'package'],
  refund: ['refund', 'return', 'money back', 'reimburse', 'credit'],
  product: ['product', 'item', 'purchase', 'bought', 'quality'],
  service: ['service', 'subscription', 'plan', 'upgrade', 'downgrade'],
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Handle speaker prefixes (Agent:, Caller:, etc.)
  const withoutSpeakers = text.replace(/^(agent|caller|speaker\s*\d*):\s*/gim, '')

  // Split on sentence-ending punctuation followed by space or newline
  const sentences = withoutSpeakers.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)

  return sentences
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

/**
 * Calculate word frequency map
 */
function calculateWordFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const word of words) {
    if (!STOPWORDS.has(word) && word.length > 2) {
      freq.set(word, (freq.get(word) || 0) + 1)
    }
  }
  return freq
}

/**
 * Score a sentence for extractive summarization
 */
function scoreSentence(
  sentence: string,
  index: number,
  totalSentences: number,
  wordFreq: Map<string, number>
): number {
  let score = 0
  const words = tokenize(sentence)

  // Position scoring: first and last sentences are important
  if (index === 0) {
    score += 2.0
  } else if (index === totalSentences - 1) {
    score += 1.5
  } else if (index < totalSentences * 0.2) {
    score += 1.0
  }

  // Length scoring: prefer medium-length sentences (10-30 words)
  const wordCount = words.length
  if (wordCount >= 10 && wordCount <= 30) {
    score += 1.0
  } else if (wordCount >= 5 && wordCount <= 40) {
    score += 0.5
  }

  // Keyword presence scoring
  for (const word of words) {
    const freq = wordFreq.get(word) || 0
    if (freq > 1) {
      score += freq * 0.3
    }
  }

  // Action word scoring
  const actionWords = ['resolved', 'fixed', 'processed', 'confirmed', 'sent', 'completed', 'will']
  for (const actionWord of actionWords) {
    if (sentence.toLowerCase().includes(actionWord)) {
      score += 0.5
    }
  }

  // Numbers often indicate specific information
  if (/\d+/.test(sentence)) {
    score += 0.3
  }

  return score
}

/**
 * Detect assignee from context
 */
function detectAssignee(sentence: string): string | undefined {
  // Check for first person (agent commitment)
  if (/\b(i will|i'll|i can|let me|i'm going to)\b/i.test(sentence)) {
    return 'agent'
  }

  // Check for requests to caller
  if (/\b(please|could you|would you|can you|you need to|you should)\b/i.test(sentence)) {
    return 'caller'
  }

  return undefined
}

/**
 * Extract deadline from sentence
 */
function extractDeadline(sentence: string): string | undefined {
  for (const pattern of DEADLINE_PATTERNS) {
    const match = sentence.match(pattern)
    if (match) {
      return match[0]
    }
  }
  return undefined
}

/**
 * Determine action item priority
 */
function determinePriority(sentence: string): ActionItem['priority'] {
  const urgentWords = ['urgent', 'immediately', 'asap', 'right away', 'emergency', 'critical']
  const importantWords = ['important', 'priority', 'soon', 'today', 'tomorrow']

  const lowerSentence = sentence.toLowerCase()

  for (const word of urgentWords) {
    if (lowerSentence.includes(word)) {
      return 'high'
    }
  }

  for (const word of importantWords) {
    if (lowerSentence.includes(word)) {
      return 'medium'
    }
  }

  // Check for deadlines - shorter deadlines = higher priority
  if (/within\s*\d+\s*(hour|minute)/i.test(sentence)) {
    return 'high'
  }
  if (/today|tonight|tomorrow/i.test(sentence)) {
    return 'medium'
  }

  return 'low'
}

/**
 * Calculate sentiment for a segment of text
 */
function calculateSegmentSentiment(text: string): number {
  const words = tokenize(text)
  let totalScore = 0
  let matchCount = 0

  for (const word of words) {
    if (word in POSITIVE_KEYWORDS) {
      totalScore += POSITIVE_KEYWORDS[word] ?? 0
      matchCount++
    }
    if (word in NEGATIVE_KEYWORDS) {
      totalScore += NEGATIVE_KEYWORDS[word] ?? 0
      matchCount++
    }
  }

  if (matchCount === 0) return 0
  return Math.max(-1, Math.min(1, totalScore / matchCount))
}

/**
 * Parse speaker turns from transcription
 */
function parseSpeakerTurns(
  transcription: string
): Array<{ speaker: string; text: string; index: number }> {
  const turns: Array<{ speaker: string; text: string; index: number }> = []
  const lines = transcription.split('\n')
  let currentIndex = 0

  for (const line of lines) {
    const speakerMatch = line.match(/^(agent|caller|speaker\s*\d*):\s*/i)
    if (speakerMatch) {
      const speaker = (speakerMatch[1] ?? 'unknown').toLowerCase()
      const text = line.substring(speakerMatch[0].length)
      if (text.trim()) {
        turns.push({ speaker, text, index: currentIndex })
      }
    } else if (line.trim()) {
      // Line without speaker prefix - treat as continuation
      turns.push({ speaker: 'unknown', text: line.trim(), index: currentIndex })
    }
    currentIndex++
  }

  return turns
}

// =============================================================================
// Main Composable
// =============================================================================

/**
 * Vue composable for call summarization and action item extraction
 *
 * Features:
 * - Extractive summarization (no ML required)
 * - Action item extraction using pattern matching
 * - Topic identification using keyword frequency
 * - Call type classification
 * - Key phrase extraction using TF-IDF-like scoring
 * - Multiple export formats (text, JSON, HTML)
 *
 * @param options - Default options for summary generation
 * @returns Call summary state and methods
 *
 * @example
 * ```typescript
 * const { generateSummary, extractActionItems, exportAsText } = useCallSummary()
 *
 * const result = await generateSummary(`
 *   Agent: Hello, how can I help you today?
 *   Caller: I'm having trouble with my billing.
 *   Agent: I'll look into that and send you a confirmation email.
 * `)
 *
 * console.log(result.actionItems)
 * // [{ description: "Send confirmation email", priority: "medium", ... }]
 * ```
 */
export function useCallSummary(options?: CallSummaryOptions): UseCallSummaryReturn {
  const defaultOptions: CallSummaryOptions = {
    maxLength: 100,
    format: 'paragraph',
    includeSentiment: true,
    ...options,
  }

  // ==========================================================================
  // State
  // ==========================================================================

  const isGenerating = ref(false)
  const lastSummary = ref<CallSummaryResult | null>(null)
  const error = ref<string | null>(null)

  // ==========================================================================
  // Computed
  // ==========================================================================

  const hasSummary = computed<boolean>(() => lastSummary.value !== null)

  // ==========================================================================
  // Methods
  // ==========================================================================

  /**
   * Extract action items from transcription text
   */
  function extractActionItems(transcription: string): ActionItem[] {
    const actionItems: ActionItem[] = []
    const sentences = splitIntoSentences(transcription)

    for (const sentence of sentences) {
      let isActionItem = false
      let actionDescription = ''

      // Check for commitments
      for (const pattern of COMMITMENT_PATTERNS) {
        if (pattern.test(sentence)) {
          isActionItem = true
          // Extract the action part after the commitment phrase
          const match = sentence.match(pattern)
          if (match) {
            const afterMatch = sentence.substring(sentence.indexOf(match[0]) + match[0].length)
            // Clean up the description
            actionDescription = afterMatch
              .replace(/[.!?]$/, '')
              .trim()
              .replace(/^(the\s+)?/, '')
            if (actionDescription.length > 5) {
              // Capitalize first letter
              actionDescription =
                actionDescription.charAt(0).toUpperCase() + actionDescription.slice(1)
            }
          }
          break
        }
      }

      // Check for requests
      if (!isActionItem) {
        for (const pattern of REQUEST_PATTERNS) {
          if (pattern.test(sentence)) {
            isActionItem = true
            actionDescription = sentence
              .replace(/^(please|could you|would you|can you|will you)\s*/i, '')
              .replace(/[.!?]$/, '')
              .trim()
            if (actionDescription.length > 5) {
              actionDescription =
                actionDescription.charAt(0).toUpperCase() + actionDescription.slice(1)
            }
            break
          }
        }
      }

      // Check for follow-ups
      if (!isActionItem) {
        for (const pattern of FOLLOW_UP_PATTERNS) {
          if (pattern.test(sentence)) {
            isActionItem = true
            // Extract a meaningful description
            const match = sentence.match(pattern)
            if (match) {
              actionDescription = sentence
                .replace(/^(i will|i'll|we will|we'll|let me)\s*/i, '')
                .replace(/[.!?]$/, '')
                .trim()
              if (actionDescription.length > 5) {
                actionDescription =
                  actionDescription.charAt(0).toUpperCase() + actionDescription.slice(1)
              }
            }
            break
          }
        }
      }

      if (isActionItem && actionDescription.length > 5) {
        const actionItem: ActionItem = {
          id: generateId(),
          description: actionDescription,
          priority: determinePriority(sentence),
          assignee: detectAssignee(sentence),
          dueDate: extractDeadline(sentence),
          status: 'pending',
          extractedFrom: sentence.trim(),
        }
        actionItems.push(actionItem)
      }
    }

    // Deduplicate similar action items
    const uniqueItems: ActionItem[] = []
    for (const item of actionItems) {
      const isDuplicate = uniqueItems.some((existing) => {
        const similarity = calculateTextSimilarity(
          existing.description.toLowerCase(),
          item.description.toLowerCase()
        )
        return similarity > 0.7
      })
      if (!isDuplicate) {
        uniqueItems.push(item)
      }
    }

    return uniqueItems
  }

  /**
   * Calculate simple text similarity (Jaccard-like)
   */
  function calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(tokenize(text1))
    const words2 = new Set(tokenize(text2))

    if (words1.size === 0 && words2.size === 0) return 1

    const intersection = new Set([...words1].filter((x) => words2.has(x)))
    const union = new Set([...words1, ...words2])

    return intersection.size / union.size
  }

  /**
   * Extract topics from transcription
   */
  function extractTopics(transcription: string): TopicMention[] {
    const topics: TopicMention[] = []
    const lowerText = transcription.toLowerCase()
    const sentences = splitIntoSentences(transcription)

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      let count = 0
      const excerpts: string[] = []
      let sentimentSum = 0
      let sentimentCount = 0

      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        const matches = lowerText.match(regex)
        if (matches) {
          count += matches.length

          // Find sentences containing this keyword for excerpts
          for (const sentence of sentences) {
            if (
              sentence.toLowerCase().includes(keyword) &&
              !excerpts.includes(sentence) &&
              excerpts.length < 3
            ) {
              excerpts.push(sentence.trim())
              sentimentSum += calculateSegmentSentiment(sentence)
              sentimentCount++
            }
          }
        }
      }

      if (count > 0) {
        topics.push({
          topic,
          count,
          sentiment: sentimentCount > 0 ? sentimentSum / sentimentCount : 0,
          excerpts,
        })
      }
    }

    // Sort by count descending
    topics.sort((a, b) => b.count - a.count)

    return topics
  }

  /**
   * Detect the type of call based on keywords
   */
  function detectCallType(transcription: string): CallSummaryResult['callType'] {
    const lowerText = transcription.toLowerCase()
    const scores: Record<CallSummaryResult['callType'], number> = {
      support: 0,
      sales: 0,
      inquiry: 0,
      complaint: 0,
      general: 0,
    }

    for (const [type, keywords] of Object.entries(CALL_TYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi')
        const matches = lowerText.match(regex)
        if (matches) {
          scores[type as CallSummaryResult['callType']] += matches.length
        }
      }
    }

    // Find the type with highest score
    let maxScore = 0
    let detectedType: CallSummaryResult['callType'] = 'general'

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score
        detectedType = type as CallSummaryResult['callType']
      }
    }

    return detectedType
  }

  /**
   * Extract key phrases using TF-IDF-like scoring
   */
  function extractKeyPhrases(transcription: string, limit: number = 10): string[] {
    const words = tokenize(transcription)
    const wordFreq = calculateWordFrequency(words)

    // Calculate document frequency (for TF-IDF approximation)
    const sentences = splitIntoSentences(transcription)
    const docFreq = new Map<string, number>()

    for (const sentence of sentences) {
      const sentenceWords = new Set(tokenize(sentence))
      for (const word of sentenceWords) {
        if (!STOPWORDS.has(word) && word.length > 2) {
          docFreq.set(word, (docFreq.get(word) || 0) + 1)
        }
      }
    }

    // Calculate TF-IDF scores
    const tfidfScores: Array<{ word: string; score: number }> = []
    const totalDocs = sentences.length || 1

    for (const [word, tf] of wordFreq) {
      const df = docFreq.get(word) || 1
      const idf = Math.log(totalDocs / df)
      const tfidf = tf * idf

      // Boost for longer words (more specific)
      const lengthBoost = word.length > 6 ? 1.2 : 1

      // Boost for topic keywords
      let topicBoost = 1
      for (const keywords of Object.values(TOPIC_KEYWORDS)) {
        if (keywords.includes(word)) {
          topicBoost = 1.5
          break
        }
      }

      tfidfScores.push({ word, score: tfidf * lengthBoost * topicBoost })
    }

    // Sort by score and return top phrases
    tfidfScores.sort((a, b) => b.score - a.score)

    return tfidfScores.slice(0, limit).map((item) => item.word)
  }

  /**
   * Estimate sentiment from transcription
   */
  function estimateSentiment(transcription: string): CallSummaryResult['sentiment'] {
    const sentences = splitIntoSentences(transcription)
    const totalSentences = sentences.length

    if (totalSentences === 0) {
      return { overall: 0, start: 0, end: 0, trend: 'stable' }
    }

    // Calculate overall sentiment
    const overallSentiment = calculateSegmentSentiment(transcription)

    // Calculate start sentiment (first 25% of sentences)
    const startCount = Math.max(1, Math.floor(totalSentences * 0.25))
    const startText = sentences.slice(0, startCount).join(' ')
    const startSentiment = calculateSegmentSentiment(startText)

    // Calculate end sentiment (last 25% of sentences)
    const endCount = Math.max(1, Math.floor(totalSentences * 0.25))
    const endText = sentences.slice(-endCount).join(' ')
    const endSentiment = calculateSegmentSentiment(endText)

    // Determine trend
    let trend: 'improved' | 'declined' | 'stable'
    const diff = endSentiment - startSentiment

    if (diff > 0.2) {
      trend = 'improved'
    } else if (diff < -0.2) {
      trend = 'declined'
    } else {
      trend = 'stable'
    }

    return {
      overall: overallSentiment,
      start: startSentiment,
      end: endSentiment,
      trend,
    }
  }

  /**
   * Get high priority action items
   */
  function getHighPriorityActionItems(items: ActionItem[]): ActionItem[] {
    return items.filter((item) => item.priority === 'high')
  }

  /**
   * Get pending action items
   */
  function getPendingActionItems(items: ActionItem[]): ActionItem[] {
    return items.filter((item) => item.status === 'pending')
  }

  /**
   * Count action items by status
   */
  function countActionItemsByStatus(items: ActionItem[]): { pending: number; completed: number } {
    return {
      pending: items.filter((i) => i.status === 'pending').length,
      completed: items.filter((i) => i.status === 'completed').length,
    }
  }

  /**
   * Mark action item as completed
   */
  function completeActionItem(items: ActionItem[], id: string): boolean {
    const item = items.find((i) => i.id === id)
    if (item) {
      item.status = 'completed'
      return true
    }
    return false
  }

  /**
   * Generate extractive summary from transcription
   */
  function generateExtractSummary(transcription: string, maxWords: number): string {
    const sentences = splitIntoSentences(transcription)

    if (sentences.length === 0) {
      return ''
    }

    if (sentences.length <= 3) {
      return sentences.join(' ')
    }

    // Calculate word frequency for scoring
    const allWords = tokenize(transcription)
    const wordFreq = calculateWordFrequency(allWords)

    // Score all sentences
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, index, sentences.length, wordFreq),
    }))

    // Sort by score descending
    scoredSentences.sort((a, b) => b.score - a.score)

    // Select top sentences up to maxWords
    const selectedSentences: Array<{ sentence: string; index: number }> = []
    let totalWords = 0

    for (const scored of scoredSentences) {
      const sentenceWords = tokenize(scored.sentence).length
      if (totalWords + sentenceWords <= maxWords || selectedSentences.length === 0) {
        selectedSentences.push({ sentence: scored.sentence, index: scored.index })
        totalWords += sentenceWords
      }
      if (totalWords >= maxWords) break
    }

    // Sort selected sentences by original order for coherence
    selectedSentences.sort((a, b) => a.index - b.index)

    return selectedSentences.map((s) => s.sentence).join(' ')
  }

  /**
   * Calculate speaker breakdown
   */
  function calculateSpeakerBreakdown(
    transcription: string
  ): CallSummaryResult['speakerBreakdown'] | undefined {
    const turns = parseSpeakerTurns(transcription)

    if (turns.length === 0) {
      return undefined
    }

    let agentWords = 0
    let callerWords = 0

    for (const turn of turns) {
      const wordCount = tokenize(turn.text).length
      if (turn.speaker === 'agent') {
        agentWords += wordCount
      } else if (turn.speaker === 'caller') {
        callerWords += wordCount
      }
    }

    const total = agentWords + callerWords
    if (total === 0) {
      return undefined
    }

    return {
      agent: Math.round((agentWords / total) * 100),
      caller: Math.round((callerWords / total) * 100),
    }
  }

  /**
   * Estimate call duration from transcription (rough estimate)
   */
  function estimateDuration(transcription: string): number {
    // Rough estimate: ~150 words per minute spoken
    const words = tokenize(transcription).length
    return Math.round((words / 150) * 60)
  }

  /**
   * Generate a complete call summary
   */
  async function generateSummary(
    transcription: string,
    opts?: CallSummaryOptions
  ): Promise<CallSummaryResult> {
    const mergedOptions = { ...defaultOptions, ...opts }

    isGenerating.value = true
    error.value = null

    try {
      // If custom summarizer provided, use it
      if (mergedOptions.summarizer) {
        const result = await mergedOptions.summarizer(transcription, mergedOptions)
        lastSummary.value = result
        return result
      }

      // Generate summary using extractive summarization
      const summary = generateExtractSummary(transcription, mergedOptions.maxLength || 100)

      // Extract all components
      const actionItems = extractActionItems(transcription)
      const topics = extractTopics(transcription)
      const callType = detectCallType(transcription)
      const keyPhrases = extractKeyPhrases(transcription)
      const sentiment = estimateSentiment(transcription)
      const duration = estimateDuration(transcription)
      const speakerBreakdown = calculateSpeakerBreakdown(transcription)

      const result: CallSummaryResult = {
        summary,
        actionItems,
        topics,
        sentiment,
        duration,
        speakerBreakdown,
        keyPhrases,
        callType,
      }

      lastSummary.value = result
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Summary generation failed'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Format summary result in specified format
   */
  function formatSummary(
    result: CallSummaryResult,
    format: CallSummaryOptions['format'] = 'paragraph'
  ): string {
    switch (format) {
      case 'bullet-points': {
        const bullets: string[] = []

        if (result.summary) {
          bullets.push(`Summary: ${result.summary}`)
        }

        if (result.callType !== 'general') {
          bullets.push(`Call Type: ${result.callType}`)
        }

        if (result.sentiment) {
          const sentimentLabel =
            result.sentiment.overall > 0.2
              ? 'Positive'
              : result.sentiment.overall < -0.2
                ? 'Negative'
                : 'Neutral'
          bullets.push(`Sentiment: ${sentimentLabel} (${result.sentiment.trend})`)
        }

        if (result.actionItems.length > 0) {
          bullets.push('Action Items:')
          for (const item of result.actionItems) {
            bullets.push(`  - ${item.description} (${item.priority} priority)`)
          }
        }

        if (result.topics.length > 0) {
          bullets.push(`Topics: ${result.topics.map((t) => t.topic).join(', ')}`)
        }

        return bullets.map((b) => `- ${b}`).join('\n')
      }

      case 'structured': {
        const sections: string[] = []

        sections.push('=== CALL SUMMARY ===')
        sections.push('')
        sections.push(result.summary || 'No summary available.')
        sections.push('')

        sections.push(`Call Type: ${result.callType}`)
        sections.push(`Duration: ~${Math.round(result.duration / 60)} minutes`)
        sections.push('')

        if (result.sentiment) {
          sections.push('--- SENTIMENT ---')
          sections.push(`Overall: ${(result.sentiment.overall * 100).toFixed(0)}%`)
          sections.push(`Trend: ${result.sentiment.trend}`)
          sections.push('')
        }

        if (result.actionItems.length > 0) {
          sections.push('--- ACTION ITEMS ---')
          for (const item of result.actionItems) {
            sections.push(
              `[${item.priority.toUpperCase()}] ${item.description}${item.assignee ? ` (${item.assignee})` : ''}`
            )
          }
          sections.push('')
        }

        if (result.topics.length > 0) {
          sections.push('--- TOPICS ---')
          for (const topic of result.topics) {
            sections.push(`${topic.topic}: ${topic.count} mentions`)
          }
          sections.push('')
        }

        if (result.keyPhrases.length > 0) {
          sections.push('--- KEY PHRASES ---')
          sections.push(result.keyPhrases.join(', '))
        }

        return sections.join('\n')
      }

      case 'paragraph':
      default:
        return result.summary || ''
    }
  }

  /**
   * Export summary as plain text
   */
  function exportAsText(result: CallSummaryResult): string {
    const lines: string[] = []

    lines.push('CALL SUMMARY REPORT')
    lines.push('='.repeat(50))
    lines.push('')

    lines.push('SUMMARY')
    lines.push('-'.repeat(20))
    lines.push(result.summary || 'No summary available.')
    lines.push('')

    lines.push('CALL DETAILS')
    lines.push('-'.repeat(20))
    lines.push(`Type: ${result.callType}`)
    lines.push(`Duration: ${Math.round(result.duration / 60)} minutes`)
    if (result.speakerBreakdown) {
      lines.push(`Agent Speaking: ${result.speakerBreakdown.agent}%`)
      lines.push(`Caller Speaking: ${result.speakerBreakdown.caller}%`)
    }
    lines.push('')

    lines.push('SENTIMENT')
    lines.push('-'.repeat(20))
    lines.push(`Overall: ${(result.sentiment.overall * 100).toFixed(0)}%`)
    lines.push(`Start: ${(result.sentiment.start * 100).toFixed(0)}%`)
    lines.push(`End: ${(result.sentiment.end * 100).toFixed(0)}%`)
    lines.push(`Trend: ${result.sentiment.trend}`)
    lines.push('')

    if (result.actionItems.length > 0) {
      lines.push('ACTION ITEMS')
      lines.push('-'.repeat(20))
      for (let i = 0; i < result.actionItems.length; i++) {
        const item = result.actionItems[i]
        if (!item) continue
        lines.push(`${i + 1}. [${item.priority.toUpperCase()}] ${item.description}`)
        if (item.assignee) {
          lines.push(`   Assignee: ${item.assignee}`)
        }
        if (item.dueDate) {
          lines.push(`   Due: ${item.dueDate}`)
        }
        lines.push(`   Source: "${item.extractedFrom}"`)
      }
      lines.push('')
    }

    if (result.topics.length > 0) {
      lines.push('TOPICS DISCUSSED')
      lines.push('-'.repeat(20))
      for (const topic of result.topics) {
        const sentimentLabel =
          topic.sentiment > 0.2 ? 'positive' : topic.sentiment < -0.2 ? 'negative' : 'neutral'
        lines.push(`- ${topic.topic} (${topic.count} mentions, ${sentimentLabel})`)
      }
      lines.push('')
    }

    if (result.keyPhrases.length > 0) {
      lines.push('KEY PHRASES')
      lines.push('-'.repeat(20))
      lines.push(result.keyPhrases.join(', '))
    }

    return lines.join('\n')
  }

  /**
   * Export summary as JSON
   */
  function exportAsJSON(result: CallSummaryResult): string {
    return JSON.stringify(result, null, 2)
  }

  /**
   * Export summary as HTML
   */
  function exportAsHTML(result: CallSummaryResult): string {
    const escapeHtml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    const sentimentColor =
      result.sentiment.overall > 0.2
        ? '#28a745'
        : result.sentiment.overall < -0.2
          ? '#dc3545'
          : '#6c757d'

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Call Summary Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .summary-box { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
    .action-item { background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin: 10px 0; }
    .priority-high { border-left: 4px solid #dc3545; }
    .priority-medium { border-left: 4px solid #ffc107; }
    .priority-low { border-left: 4px solid #28a745; }
    .topic-badge { display: inline-block; background: #e9ecef; padding: 5px 10px; margin: 5px; border-radius: 20px; }
    .sentiment-indicator { font-size: 24px; color: ${sentimentColor}; }
    .key-phrases { color: #666; font-style: italic; }
    .meta { color: #888; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Call Summary Report</h1>

  <div class="summary-box">
    <p>${escapeHtml(result.summary || 'No summary available.')}</p>
  </div>

  <div class="meta">
    <strong>Call Type:</strong> ${escapeHtml(result.callType)} |
    <strong>Duration:</strong> ~${Math.round(result.duration / 60)} minutes
    ${result.speakerBreakdown ? `| <strong>Agent:</strong> ${result.speakerBreakdown.agent}% | <strong>Caller:</strong> ${result.speakerBreakdown.caller}%` : ''}
  </div>

  <h2>Sentiment Analysis</h2>
  <p class="sentiment-indicator">
    ${result.sentiment.overall > 0.2 ? '&#x1F603;' : result.sentiment.overall < -0.2 ? '&#x1F61E;' : '&#x1F610;'}
    ${escapeHtml(result.sentiment.trend)}
  </p>
  <p>
    Overall: ${(result.sentiment.overall * 100).toFixed(0)}% |
    Start: ${(result.sentiment.start * 100).toFixed(0)}% |
    End: ${(result.sentiment.end * 100).toFixed(0)}%
  </p>

  ${
    result.actionItems.length > 0
      ? `
  <h2>Action Items (${result.actionItems.length})</h2>
  ${result.actionItems
    .map(
      (item) => `
  <div class="action-item priority-${item.priority}">
    <strong>${escapeHtml(item.description)}</strong>
    <div class="meta">
      Priority: ${item.priority}
      ${item.assignee ? `| Assignee: ${escapeHtml(item.assignee)}` : ''}
      ${item.dueDate ? `| Due: ${escapeHtml(item.dueDate)}` : ''}
    </div>
    <div class="meta">Source: "${escapeHtml(item.extractedFrom)}"</div>
  </div>
  `
    )
    .join('')}
  `
      : ''
  }

  ${
    result.topics.length > 0
      ? `
  <h2>Topics Discussed</h2>
  <div>
    ${result.topics.map((topic) => `<span class="topic-badge">${escapeHtml(topic.topic)} (${topic.count})</span>`).join('')}
  </div>
  `
      : ''
  }

  ${
    result.keyPhrases.length > 0
      ? `
  <h2>Key Phrases</h2>
  <p class="key-phrases">${escapeHtml(result.keyPhrases.join(', '))}</p>
  `
      : ''
  }

  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 0.8em;">
    Generated by VueSIP Call Summary
  </footer>
</body>
</html>
`

    return html.trim()
  }

  // ==========================================================================
  // Return Interface
  // ==========================================================================

  return {
    // State
    isGenerating,
    lastSummary,
    error,

    // Computed
    hasSummary,

    // Methods
    generateSummary,
    extractActionItems,
    extractTopics,
    detectCallType,
    extractKeyPhrases,

    // Utilities
    formatSummary,
    estimateSentiment,
    getHighPriorityActionItems,
    getPendingActionItems,
    countActionItemsByStatus,
    completeActionItem,

    // Export
    exportAsText,
    exportAsJSON,
    exportAsHTML,
  }
}
