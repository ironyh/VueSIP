/**
 * AMI Helper Utilities Tests
 *
 * Comprehensive test coverage for AMI validation, sanitization, and utility functions.
 */

import { describe, it, expect } from 'vitest'
import {
  // Validation functions
  validateAmiPhoneNumber,
  validateExtension,
  validateChannel,
  // Sanitization functions
  sanitizePhoneNumber,
  // Error helpers
  createAmiError,
} from '@/utils/ami-helpers'

describe('AMI Helper Utilities - Security Validation', () => {
  describe('validateAmiPhoneNumber', () => {
    it('should validate standard phone numbers', () => {
      expect(validateAmiPhoneNumber('555-1234').isValid).toBe(true)
      expect(validateAmiPhoneNumber('(555) 123-4567').isValid).toBe(true)
      expect(validateAmiPhoneNumber('+1-555-123-4567').isValid).toBe(true)
    })

    it('should validate numbers with extensions', () => {
      expect(validateAmiPhoneNumber('555-1234 x567').isValid).toBe(true)
      expect(validateAmiPhoneNumber('555-1234 ext. 567').isValid).toBe(true)
    })

    it('should reject SQL injection attempts', () => {
      const result = validateAmiPhoneNumber('555;DROP TABLE--')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid phone number format')
    })

    it('should reject empty numbers', () => {
      const result = validateAmiPhoneNumber('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Phone number is required')
    })
  })

  describe('validateExtension', () => {
    it('should validate alphanumeric extensions', () => {
      expect(validateExtension('1001').isValid).toBe(true)
      expect(validateExtension('SIP/user').isValid).toBe(true)
      expect(validateExtension('queue_01').isValid).toBe(true)
    })

    it('should reject injection attempts', () => {
      const result = validateExtension('user;DROP TABLE')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Extension contains invalid characters')
    })
  })

  describe('validateChannel', () => {
    it('should validate channel names', () => {
      expect(validateChannel('SIP/1001-00000001').isValid).toBe(true)
      expect(validateChannel('PJSIP/user@domain').isValid).toBe(true)
    })

    it('should reject malicious channels', () => {
      expect(validateChannel('ch;DROP').isValid).toBe(false)
    })
  })

  describe('sanitizePhoneNumber', () => {
    it('should preserve valid formatting', () => {
      expect(sanitizePhoneNumber('555-1234')).toBe('555-1234')
      expect(sanitizePhoneNumber('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
    })

    it('should remove dangerous characters', () => {
      expect(sanitizePhoneNumber('555;DROP TABLE--')).toBe('555')
      expect(sanitizePhoneNumber('555<script>alert(1)</script>')).toBe('555(1)')
    })
  })

  describe('createAmiError', () => {
    it('should create standardized error objects', () => {
      const error = createAmiError('addToQueue', 'Invalid queue', { queue: 'test' })
      expect(error.operation).toBe('addToQueue')
      expect(error.message).toBe('Invalid queue')
      expect(error.details).toEqual({ queue: 'test' })
    })
  })
})
