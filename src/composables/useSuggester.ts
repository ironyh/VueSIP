/**
 * useSuggester — Suggest triage questions based on live transcription text
 *
 * Matches transcribed keywords against a question bank and surfaces
 * relevant follow-up questions as clickable suggestions.
 *
 * @module composables/useSuggester
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface TriageQuestionBank {
  [keyword: string]: string[]
}

export interface Suggestion {
  id: string
  text: string
  matchedKeyword: string
  score: number
}

export interface UseSuggesterOptions {
  /**
   * Maximum number of suggestions to return (default: 8)
   */
  maxSuggestions?: number
  /**
   * Minimum keyword match score to include (0-1, default: 0.3)
   */
  minScore?: number
  /**
   * Additional keywords to always include (unconditional suggestions)
   */
  alwaysInclude?: string[]
}

export interface UseSuggesterReturn {
  /** All currently matched suggestions */
  suggestions: ComputedRef<Suggestion[]>
  /** Index of currently keyboard-focused suggestion (-1 = none) */
  focusedIndex: Ref<number>
  /** Currently selected suggestion (keyboard or click) */
  selectedSuggestion: Ref<Suggestion | null>
  /** Update transcription text and recompute suggestions */
  updateText: (text: string) => void
  /** Clear all suggestions */
  clear: () => void
  /** Select a suggestion by index (keyboard navigation) */
  selectByIndex: (index: number) => void
  /** Move focus up one position */
  focusUp: () => void
  /** Move focus down one position */
  focusDown: () => void
  /** Pick the currently focused suggestion */
  pickFocused: () => Suggestion | null
  /** Dismiss all suggestions */
  dismiss: () => void
}

/**
 * Score a keyword match based on:
 * - Proximity to end of text (more recent = higher)
 * - Word boundary matches (higher than partial)
 * - Multiple occurrences (slightly higher)
 */
function scoreKeywordMatch(keyword: string, text: string): number {
  const lowerText = text.toLowerCase()
  const lowerKw = keyword.toLowerCase()

  if (!lowerText.includes(lowerKw)) return 0

  let score = 0.3 // base score for any match

  // Check for word boundary match (higher confidence)
  const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(lowerKw)}`, 'i')
  if (wordBoundaryRegex.test(text)) {
    score += 0.3
  }

  // Count occurrences (diminishing returns)
  const occurrences = (lowerText.match(new RegExp(escapeRegex(lowerKw), 'g')) || []).length
  score += Math.min(occurrences * 0.1, 0.3)

  // Proximity to end of text (recency bonus)
  const lastIndex = lowerText.lastIndexOf(lowerKw)
  const recencyRatio = lastIndex / Math.max(lowerText.length, 1)
  score += (1 - recencyRatio) * 0.1

  return Math.min(score, 1.0)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Score a question based on keyword match quality
 */
function scoreQuestion(keyword: string, question: string, matchScore: number): number {
  // Questions containing the keyword verbatim score higher
  const lowerQ = question.toLowerCase()
  const lowerKw = keyword.toLowerCase()
  if (lowerQ.includes(lowerKw)) {
    return matchScore + 0.1
  }
  return matchScore
}

export function useSuggester(
  questionBank: TriageQuestionBank,
  options: UseSuggesterOptions = {}
): UseSuggesterReturn {
  const { maxSuggestions = 8, minScore = 0.3, alwaysInclude = [] } = options

  const currentText = ref('')
  const focusedIndex = ref(-1)
  const selectedSuggestion = ref<Suggestion | null>(null)

  const suggestions = computed<Suggestion[]>(() => {
    const text = currentText.value
    const matched: Suggestion[] = []

    // Always-include questions (unconditional — shown even with empty text)
    for (const kw of alwaysInclude) {
      const questions = questionBank[kw] || []
      for (const q of questions.slice(0, 2)) {
        matched.push({
          id: `always-${kw}-${q}`,
          text: q,
          matchedKeyword: kw,
          score: 1.0,
        })
      }
    }

    // Skip keyword matching if text is empty (but alwaysInclude still shows)
    if (text.trim()) {
      // Keyword-matched questions
      for (const [keyword, questions] of Object.entries(questionBank)) {
        const matchScore = scoreKeywordMatch(keyword, text)
        if (matchScore >= minScore) {
          for (const question of questions) {
            const qScore = scoreQuestion(keyword, question, matchScore)
            matched.push({
              id: `${keyword}-${question}`,
              text: question,
              matchedKeyword: keyword,
              score: qScore,
            })
          }
        }
      }
    }

    // Sort by score descending, deduplicate by question text
    const seen = new Set<string>()
    const deduped: Suggestion[] = []
    for (const s of matched.sort((a, b) => b.score - a.score)) {
      if (!seen.has(s.text)) {
        seen.add(s.text)
        deduped.push(s)
      }
    }

    return deduped.slice(0, maxSuggestions)
  })

  function updateText(text: string) {
    currentText.value = text
    focusedIndex.value = -1
    selectedSuggestion.value = null
  }

  function clear() {
    currentText.value = ''
    focusedIndex.value = -1
    selectedSuggestion.value = null
  }

  function selectByIndex(index: number) {
    const len = suggestions.value.length
    if (len === 0) {
      focusedIndex.value = -1
      selectedSuggestion.value = null
      return
    }
    // Normalize index: negative wraps from end, over len wraps from start
    let normalized = index
    if (index < 0) {
      normalized = len + index
    } else if (index >= len) {
      normalized = index - len
    }
    if (normalized < 0 || normalized >= len) {
      focusedIndex.value = -1
      selectedSuggestion.value = null
      return
    }
    focusedIndex.value = normalized
    selectedSuggestion.value = suggestions.value[normalized] ?? null
  }

  function focusUp() {
    selectByIndex(focusedIndex.value - 1)
  }

  function focusDown() {
    selectByIndex(focusedIndex.value + 1)
  }

  function pickFocused(): Suggestion | null {
    if (focusedIndex.value >= 0 && focusedIndex.value < suggestions.value.length) {
      const picked = suggestions.value[focusedIndex.value] ?? null
      selectedSuggestion.value = picked
      return picked
    }
    return null
  }

  function dismiss() {
    focusedIndex.value = -1
    selectedSuggestion.value = null
  }

  return {
    suggestions,
    focusedIndex,
    selectedSuggestion,
    updateText,
    clear,
    selectByIndex,
    focusUp,
    focusDown,
    pickFocused,
    dismiss,
  }
}
