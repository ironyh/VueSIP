/**
 * PII redaction module for transcripts
 * @packageDocumentation
 */

import type {
  TranscriptEntry,
  RedactionConfig,
  RedactionResult,
  PIIType,
} from '@/types/transcription.types'
import { createLogger } from '@/utils/logger'

const logger = createLogger('PIIRedactor')

/**
 * Built-in PII detection patterns
 */
const PII_PATTERNS: Record<Exclude<PIIType, 'custom'>, RegExp> = {
  'credit-card': /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  'phone-number': /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  address:
    /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl)\b/gi,
  name: /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
  'date-of-birth': /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)?\d{2}\b/g,
}

/**
 * Redacts personally identifiable information from transcript text
 *
 * @remarks
 * Supports credit cards, SSN, phone numbers, email addresses, and custom patterns.
 * Critical for PCI-DSS, HIPAA, and GDPR compliance.
 *
 * @example
 * ```ts
 * const redactor = new PIIRedactor({
 *   enabled: true,
 *   patterns: ['credit-card', 'ssn'],
 *   onRedacted: (type, original) => auditLog(type)
 * })
 *
 * const result = redactor.redact('My card is 4111 1111 1111 1111')
 * // result.redacted = 'My card is [REDACTED]'
 * ```
 */
export class PIIRedactor {
  private config: RedactionConfig
  private activePatterns: Array<{ type: PIIType; pattern: RegExp }> = []

  constructor(config: Partial<RedactionConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      patterns: config.patterns ?? [],
      replacement: config.replacement ?? '[REDACTED]',
      customPatterns: config.customPatterns ?? [],
      onRedacted: config.onRedacted,
    }

    this.buildActivePatterns()
  }

  /**
   * Build the list of active patterns based on config
   */
  private buildActivePatterns(): void {
    this.activePatterns = []

    for (const type of this.config.patterns) {
      if (type === 'custom') {
        // Add custom patterns
        for (const pattern of this.config.customPatterns ?? []) {
          this.activePatterns.push({ type: 'custom', pattern })
        }
      } else if (PII_PATTERNS[type]) {
        // Add built-in pattern
        this.activePatterns.push({
          type,
          pattern: new RegExp(PII_PATTERNS[type].source, PII_PATTERNS[type].flags),
        })
      }
    }

    logger.debug('Active patterns configured', {
      count: this.activePatterns.length,
      types: this.config.patterns,
    })
  }

  /**
   * Update redaction configuration
   */
  configure(config: Partial<RedactionConfig>): void {
    this.config = { ...this.config, ...config }
    this.buildActivePatterns()
  }

  /**
   * Check if redaction is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Redact PII from text
   * @param text - Text to redact
   * @returns Redaction result with original, redacted text, and detections
   */
  redact(text: string): RedactionResult {
    if (!this.config.enabled) {
      return { original: text, redacted: text, detections: [] }
    }

    const detections: RedactionResult['detections'] = []
    let redactedText = text

    // Find all matches first to avoid overlapping issues
    const allMatches: Array<{
      type: PIIType
      original: string
      start: number
      end: number
    }> = []

    for (const { type, pattern } of this.activePatterns) {
      // Reset regex lastIndex
      pattern.lastIndex = 0

      let match: RegExpExecArray | null
      while ((match = pattern.exec(text)) !== null) {
        allMatches.push({
          type,
          original: match[0],
          start: match.index,
          end: match.index + match[0].length,
        })
      }
    }

    // Sort by position (descending) to replace from end to start
    allMatches.sort((a, b) => b.start - a.start)

    // Remove overlapping matches (keep earlier/longer ones)
    const filteredMatches = allMatches.filter((match, index) => {
      for (let i = index + 1; i < allMatches.length; i++) {
        const other = allMatches[i]
        if (!other) continue
        // Check overlap
        if (match.start < other.end && match.end > other.start) {
          return false // This match overlaps with an earlier one
        }
      }
      return true
    })

    // Apply redactions
    for (const match of filteredMatches) {
      redactedText =
        redactedText.slice(0, match.start) + this.config.replacement + redactedText.slice(match.end)

      detections.push({
        type: match.type,
        original: match.original,
        position: { start: match.start, end: match.end },
      })
    }

    // Sort detections by position (ascending) for the result
    detections.sort((a, b) => a.position.start - b.position.start)

    if (detections.length > 0) {
      logger.debug('PII redacted', {
        count: detections.length,
        types: [...new Set(detections.map((d) => d.type))],
      })
    }

    return { original: text, redacted: redactedText, detections }
  }

  /**
   * Redact PII from a transcript entry and call callback
   * @param entry - Transcript entry to redact
   * @returns Modified entry with redacted text
   */
  redactEntry(entry: TranscriptEntry): TranscriptEntry {
    const result = this.redact(entry.text)

    // Call callback for each detection
    if (this.config.onRedacted) {
      for (const detection of result.detections) {
        this.config.onRedacted(detection.type, detection.original, entry)
      }
    }

    return {
      ...entry,
      text: result.redacted,
    }
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    this.activePatterns = []
  }
}
