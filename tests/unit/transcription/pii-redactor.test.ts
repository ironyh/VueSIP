/**
 * Tests for PIIRedactor
 */

import { describe, it, expect, vi } from 'vitest'
import { PIIRedactor } from '@/transcription/features/pii-redactor'
import type { TranscriptEntry } from '@/types/transcription.types'

describe('PIIRedactor', () => {
  describe('initialization', () => {
    it('should initialize with disabled redaction by default', () => {
      const redactor = new PIIRedactor()
      expect(redactor.isEnabled()).toBe(false)
    })

    it('should respect enabled option', () => {
      const redactor = new PIIRedactor({ enabled: true, patterns: [] })
      expect(redactor.isEnabled()).toBe(true)
    })
  })

  describe('redact', () => {
    it('should not redact when disabled', () => {
      const redactor = new PIIRedactor({ enabled: false, patterns: ['credit-card'] })

      const result = redactor.redact('My card is 4111 1111 1111 1111')

      expect(result.redacted).toBe('My card is 4111 1111 1111 1111')
      expect(result.detections).toHaveLength(0)
    })

    it('should redact credit card numbers', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['credit-card'],
      })

      const result = redactor.redact('My card is 4111 1111 1111 1111')

      expect(result.redacted).toBe('My card is [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('credit-card')
    })

    it('should redact SSN', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['ssn'],
      })

      const result = redactor.redact('My SSN is 123-45-6789')

      expect(result.redacted).toBe('My SSN is [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('ssn')
    })

    it('should redact phone numbers', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['phone-number'],
      })

      const result = redactor.redact('Call me at (555) 123-4567')

      expect(result.redacted).toBe('Call me at [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('phone-number')
    })

    it('should redact email addresses', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const result = redactor.redact('Email me at test@example.com please')

      expect(result.redacted).toBe('Email me at [REDACTED] please')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('email')
    })

    it('should redact multiple PII types', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['credit-card', 'email'],
      })

      const result = redactor.redact('Card 4111 1111 1111 1111, email test@example.com')

      expect(result.redacted).toBe('Card [REDACTED], email [REDACTED]')
      expect(result.detections).toHaveLength(2)
    })

    it('should use custom replacement text', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['ssn'],
        replacement: '***',
      })

      const result = redactor.redact('SSN: 123-45-6789')

      expect(result.redacted).toBe('SSN: ***')
    })
  })

  describe('redactEntry', () => {
    it('should redact PII from transcript entry', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['credit-card'],
      })

      const entry: TranscriptEntry = {
        id: 'test-1',
        text: 'My card is 4111 1111 1111 1111',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      const redacted = redactor.redactEntry(entry)

      expect(redacted.text).toBe('My card is [REDACTED]')
      expect(redacted.id).toBe(entry.id) // Other fields preserved
    })

    it('should call onRedacted callback for each detection', () => {
      const onRedacted = vi.fn()
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['credit-card', 'email'],
        onRedacted,
      })

      const entry: TranscriptEntry = {
        id: 'test-1',
        text: 'Card 4111111111111111 email test@test.com',
        speaker: 'remote',
        timestamp: Date.now(),
        isFinal: true,
      }

      redactor.redactEntry(entry)

      expect(onRedacted).toHaveBeenCalledTimes(2)
      expect(onRedacted).toHaveBeenCalledWith('credit-card', expect.any(String), entry)
      expect(onRedacted).toHaveBeenCalledWith('email', expect.any(String), entry)
    })
  })

  describe('configure', () => {
    it('should update configuration', () => {
      const redactor = new PIIRedactor({ enabled: false, patterns: [] })
      expect(redactor.isEnabled()).toBe(false)

      redactor.configure({ enabled: true, patterns: ['ssn'] })
      expect(redactor.isEnabled()).toBe(true)

      const result = redactor.redact('SSN: 123-45-6789')
      expect(result.detections).toHaveLength(1)
    })
  })

  describe('custom patterns', () => {
    it('should support custom regex patterns', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['custom'],
        customPatterns: [/CONF-\d{6}/g],
      })

      const result = redactor.redact('Reference: CONF-123456')

      expect(result.redacted).toBe('Reference: [REDACTED]')
      expect(result.detections[0].type).toBe('custom')
    })
  })
})
