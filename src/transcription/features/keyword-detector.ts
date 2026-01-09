/**
 * Keyword detection module for transcripts
 * @packageDocumentation
 */

import type {
  TranscriptEntry,
  KeywordRule,
  KeywordMatch,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('KeywordDetector')

/**
 * Generates unique IDs for keyword rules
 */
function generateId(): string {
  return `kw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Detects keywords and phrases in transcript entries
 *
 * @example
 * ```ts
 * const detector = new KeywordDetector()
 * detector.addRule({ phrase: 'cancel subscription', action: 'retention' })
 * detector.onMatch((match) => showAgentAssistCard(match.rule.action))
 *
 * // On each transcript entry:
 * detector.detect(entry)
 * ```
 */
export class KeywordDetector {
  private rules: KeywordRule[] = []
  private matchCallbacks: Array<(match: KeywordMatch) => void> = []

  /**
   * Add a keyword detection rule
   * @param rule - Rule configuration (without id)
   * @returns Generated rule ID
   */
  addRule(rule: Omit<KeywordRule, 'id'>): string {
    const id = generateId()
    const fullRule: KeywordRule = { ...rule, id }
    this.rules.push(fullRule)
    logger.debug('Rule added', { id, phrase: String(rule.phrase) })
    return id
  }

  /**
   * Remove a rule by ID
   * @param id - Rule ID to remove
   */
  removeRule(id: string): void {
    const index = this.rules.findIndex(r => r.id === id)
    if (index !== -1) {
      this.rules.splice(index, 1)
      logger.debug('Rule removed', { id })
    }
  }

  /**
   * Get all registered rules
   */
  getRules(): KeywordRule[] {
    return [...this.rules]
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules = []
    logger.debug('All rules cleared')
  }

  /**
   * Detect keywords in a transcript entry
   * @param entry - Transcript entry to scan
   * @returns Array of matches found
   */
  detect(entry: TranscriptEntry): KeywordMatch[] {
    const matches: KeywordMatch[] = []

    for (const rule of this.rules) {
      // Check speaker filter
      if (rule.speakerFilter && rule.speakerFilter !== entry.speaker) {
        continue
      }

      const match = this.matchRule(rule, entry)
      if (match) {
        matches.push(match)
        this.matchCallbacks.forEach(cb => cb(match))
      }
    }

    if (matches.length > 0) {
      logger.debug('Keywords detected', {
        entryId: entry.id,
        matchCount: matches.length,
        actions: matches.map(m => m.rule.action),
      })
    }

    return matches
  }

  /**
   * Match a single rule against an entry
   */
  private matchRule(rule: KeywordRule, entry: TranscriptEntry): KeywordMatch | null {
    const text = entry.text
    const searchText = rule.caseSensitive ? text : text.toLowerCase()

    let matchedText: string | null = null
    let position: { start: number; end: number } | null = null

    if (rule.phrase instanceof RegExp) {
      // Regex matching
      const regex = rule.caseSensitive
        ? rule.phrase
        : new RegExp(rule.phrase.source, rule.phrase.flags + (rule.phrase.flags.includes('i') ? '' : 'i'))

      const match = searchText.match(regex)
      if (match && match.index !== undefined) {
        matchedText = text.slice(match.index, match.index + match[0].length)
        position = { start: match.index, end: match.index + match[0].length }
      }
    } else {
      // String matching
      const searchPhrase = rule.caseSensitive ? rule.phrase : rule.phrase.toLowerCase()
      const index = searchText.indexOf(searchPhrase)

      if (index !== -1) {
        matchedText = text.slice(index, index + rule.phrase.length)
        position = { start: index, end: index + rule.phrase.length }
      }
    }

    if (matchedText && position) {
      return {
        rule,
        matchedText,
        entry,
        position,
      }
    }

    return null
  }

  /**
   * Register callback for keyword matches
   * @param callback - Function called when keyword is detected
   * @returns Unsubscribe function
   */
  onMatch(callback: (match: KeywordMatch) => void): () => void {
    this.matchCallbacks.push(callback)
    return () => {
      const index = this.matchCallbacks.indexOf(callback)
      if (index !== -1) {
        this.matchCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    this.rules = []
    this.matchCallbacks = []
  }
}
