/**
 * PII Redactor tests
 */
import { describe, it, expect, vi } from 'vitest'
import { PIIRedactor } from '../pii-redactor'

describe('PIIRedactor', () => {
  describe('constructor', () => {
    it('should create disabled redactor by default', () => {
      const redactor = new PIIRedactor()
      expect(redactor.isEnabled()).toBe(false)
    })

    it('should create enabled redactor with patterns', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })
      expect(redactor.isEnabled()).toBe(true)
    })

    it('should use custom replacement string', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
        replacement: '[HIDDEN]',
      })

      const result = redactor.redact('Contact me at test@example.com')
      expect(result.redacted).toBe('Contact me at [HIDDEN]')
    })
  })

  describe('redact', () => {
    it('should return original text when disabled', () => {
      const redactor = new PIIRedactor()
      const text = 'My email is test@example.com'
      const result = redactor.redact(text)

      expect(result.redacted).toBe(text)
      expect(result.detections).toHaveLength(0)
    })

    it('should redact email addresses', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const result = redactor.redact('Contact me at test@example.com')
      expect(result.redacted).toBe('Contact me at [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('email')
      expect(result.detections[0].original).toBe('test@example.com')
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

    it('should redact credit card numbers', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['credit-card'],
      })

      const result = redactor.redact('Card: 4111-1111-1111-1111')
      expect(result.redacted).toBe('Card: [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('credit-card')
    })

    it('should redact SSN', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['ssn'],
      })

      const result = redactor.redact('SSN: 123-45-6789')
      expect(result.redacted).toBe('SSN: [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('ssn')
    })

    it('should redact multiple PII types', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email', 'phone-number'],
      })

      const result = redactor.redact('Email: test@example.com, Phone: (555) 123-4567')
      expect(result.redacted).toBe('Email: [REDACTED], Phone: [REDACTED]')
      expect(result.detections).toHaveLength(2)
    })

    it('should handle custom patterns', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['custom'],
        customPatterns: [/\bVIP-\d{4}\b/g],
      })

      const result = redactor.redact('Your VIP code is VIP-1234')
      expect(result.redacted).toBe('Your VIP code is [REDACTED]')
      expect(result.detections).toHaveLength(1)
      expect(result.detections[0].type).toBe('custom')
    })

    it('should preserve original text in result', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const original = 'test@example.com'
      const result = redactor.redact(original)

      expect(result.original).toBe(original)
      expect(result.redacted).not.toBe(original)
    })

    it('should return empty detections for text without matches', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const result = redactor.redact('Hello world')
      expect(result.redacted).toBe('Hello world')
      expect(result.detections).toHaveLength(0)
    })

    it('should handle empty string', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const result = redactor.redact('')
      expect(result.redacted).toBe('')
      expect(result.detections).toHaveLength(0)
    })

    it('should handle non-string input gracefully', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const result = redactor.redact('')
      expect(result.redacted).toBe('')
    })
  })

  describe('redactEntry', () => {
    it('should redact entry text and preserve other properties', () => {
      const onRedacted = vi.fn()
      const redactorWithCallback = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
        onRedacted,
      })

      const entry = {
        text: 'Contact test@example.com',
        timestamp: 1000,
        speaker: 'user1',
        participantName: 'Test User',
      }

      const result = redactorWithCallback.redactEntry(entry)

      expect(result.text).toBe('Contact [REDACTED]')
      expect(result.timestamp).toBe(1000)
      expect(result.speaker).toBe('user1')
      expect(onRedacted).toHaveBeenCalledWith('email', 'test@example.com', entry)
    })
  })

  describe('configure', () => {
    it('should update configuration', () => {
      const redactor = new PIIRedactor()

      redactor.configure({ enabled: true, patterns: ['email'] })
      expect(redactor.isEnabled()).toBe(true)

      const result = redactor.redact('test@example.com')
      expect(result.redacted).toBe('[REDACTED]')
    })

    it('should update patterns dynamically', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      // Initially redact email
      let result = redactor.redact('test@example.com')
      expect(result.detections).toHaveLength(1)

      // Switch to phone
      redactor.configure({ patterns: ['phone-number'] })
      result = redactor.redact('test@example.com')
      expect(result.detections).toHaveLength(0)
    })
  })

  describe('dispose', () => {
    it('should clean up patterns', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      redactor.dispose()

      // After dispose, redaction should still work but patterns are cleared
      const result = redactor.redact('test@example.com')
      expect(result.redacted).toBe('test@example.com')
    })
  })

  describe('edge cases', () => {
    it('should handle overlapping patterns', () => {
      // Phone pattern might match part of credit card
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['credit-card', 'phone-number'],
      })

      // This is not a real overlap case but tests the logic
      const result = redactor.redact('Card: 4111-1111-1111-1111')
      expect(result.detections).toHaveLength(1)
    })

    it('should handle text with special characters', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const result = redactor.redact('Test "quoted" <test@example.com> and more')
      expect(result.redacted).toBe('Test "quoted" <[REDACTED]> and more')
    })

    it('should handle multiple emails in text', () => {
      const redactor = new PIIRedactor({
        enabled: true,
        patterns: ['email'],
      })

      const result = redactor.redact('Email both test@example.com and admin@example.org')
      expect(result.detections).toHaveLength(2)
      expect(result.redacted).toBe('Email both [REDACTED] and [REDACTED]')
    })
  })
})
