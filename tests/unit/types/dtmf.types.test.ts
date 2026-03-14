/**
 * Unit tests for DTMF type definitions and utilities
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest'
import {
  isDTMFTone,
  validateDTMFTones,
  parseDTMFTones,
  RFC2833_EVENT_CODES,
  DTMF_CONSTANTS,
} from '../../../src/types/dtmf.types'

describe('dtmf.types', () => {
  describe('isDTMFTone', () => {
    it('should return true for valid digit tones', () => {
      expect(isDTMFTone('0')).toBe(true)
      expect(isDTMFTone('5')).toBe(true)
      expect(isDTMFTone('9')).toBe(true)
    })

    it('should return true for special tones', () => {
      expect(isDTMFTone('*')).toBe(true)
      expect(isDTMFTone('#')).toBe(true)
    })

    it('should return true for extended tones A-D', () => {
      expect(isDTMFTone('A')).toBe(true)
      expect(isDTMFTone('B')).toBe(true)
      expect(isDTMFTone('C')).toBe(true)
      expect(isDTMFTone('D')).toBe(true)
    })

    it('should return false for lowercase letters', () => {
      expect(isDTMFTone('a')).toBe(false)
      expect(isDTMFTone('d')).toBe(false)
    })

    it('should return false for invalid characters', () => {
      expect(isDTMFTone('E')).toBe(false)
      expect(isDTMFTone('x')).toBe(false)
      expect(isDTMFTone('@')).toBe(false)
      expect(isDTMFTone('')).toBe(false)
    })

    it('should return false for multi-character strings', () => {
      expect(isDTMFTone('12')).toBe(false)
      expect(isDTMFTone('*#')).toBe(false)
    })
  })

  describe('validateDTMFTones', () => {
    it('should return true for valid single tone', () => {
      expect(validateDTMFTones('5')).toBe(true)
      expect(validateDTMFTones('*')).toBe(true)
      expect(validateDTMFTones('#')).toBe(true)
    })

    it('should return true for valid tone sequences', () => {
      expect(validateDTMFTones('123')).toBe(true)
      expect(validateDTMFTones('*123#')).toBe(true)
      expect(validateDTMFTones('ABCDEF')).toBe(false) // D is valid but E, F are not
    })

    it('should return false for empty string', () => {
      expect(validateDTMFTones('')).toBe(false)
    })

    it('should return false for invalid characters', () => {
      expect(validateDTMFTones('12x')).toBe(false)
      expect(validateDTMFTones('*#@')).toBe(false)
    })

    it('should handle mixed case correctly', () => {
      expect(validateDTMFTones('a')).toBe(false) // lowercase not valid
      expect(validateDTMFTones('A')).toBe(true)
    })
  })

  describe('parseDTMFTones', () => {
    it('should parse single valid tone', () => {
      const result = parseDTMFTones('5')
      expect(result).toEqual(['5'])
    })

    it('should parse valid tone sequence', () => {
      const result = parseDTMFTones('123*#ABC')
      expect(result).toEqual(['1', '2', '3', '*', '#', 'A', 'B', 'C'])
    })

    it('should convert lowercase to uppercase', () => {
      const result = parseDTMFTones('abc')
      expect(result).toEqual(['A', 'B', 'C'])
    })

    it('should throw error for invalid characters', () => {
      expect(() => parseDTMFTones('12x')).toThrow('Invalid DTMF characters: X')
    })

    it('should return empty array for empty string', () => {
      const result = parseDTMFTones('')
      expect(result).toEqual([])
    })

    it('should throw error for all invalid characters', () => {
      expect(() => parseDTMFTones('xyz')).toThrow('Invalid DTMF characters: X, Y, Z')
    })
  })

  describe('RFC2833_EVENT_CODES', () => {
    it('should have correct mapping for digits 0-9', () => {
      expect(RFC2833_EVENT_CODES['0']).toBe(0)
      expect(RFC2833_EVENT_CODES['5']).toBe(5)
      expect(RFC2833_EVENT_CODES['9']).toBe(9)
    })

    it('should have correct mapping for special tones', () => {
      expect(RFC2833_EVENT_CODES['*']).toBe(10)
      expect(RFC2833_EVENT_CODES['#']).toBe(11)
    })

    it('should have correct mapping for extended tones', () => {
      expect(RFC2833_EVENT_CODES['A']).toBe(12)
      expect(RFC2833_EVENT_CODES['B']).toBe(13)
      expect(RFC2833_EVENT_CODES['C']).toBe(14)
      expect(RFC2833_EVENT_CODES['D']).toBe(15)
    })
  })

  describe('DTMF_CONSTANTS', () => {
    it('should have valid duration bounds', () => {
      expect(DTMF_CONSTANTS.MIN_DURATION).toBeLessThan(DTMF_CONSTANTS.MAX_DURATION)
      expect(DTMF_CONSTANTS.DEFAULT_DURATION).toBeGreaterThanOrEqual(DTMF_CONSTANTS.MIN_DURATION)
      expect(DTMF_CONSTANTS.DEFAULT_DURATION).toBeLessThanOrEqual(DTMF_CONSTANTS.MAX_DURATION)
    })

    it('should have valid inter-tone gap bounds', () => {
      expect(DTMF_CONSTANTS.MIN_INTER_TONE_GAP).toBeLessThan(DTMF_CONSTANTS.MAX_INTER_TONE_GAP)
      expect(DTMF_CONSTANTS.DEFAULT_INTER_TONE_GAP).toBeGreaterThanOrEqual(
        DTMF_CONSTANTS.MIN_INTER_TONE_GAP
      )
      expect(DTMF_CONSTANTS.DEFAULT_INTER_TONE_GAP).toBeLessThanOrEqual(
        DTMF_CONSTANTS.MAX_INTER_TONE_GAP
      )
    })

    it('should have valid RFC2833 payload type', () => {
      expect(DTMF_CONSTANTS.RFC2833_PAYLOAD_TYPE).toBe(101)
    })

    it('should have correct SIP INFO content type', () => {
      expect(DTMF_CONSTANTS.SIPINFO_CONTENT_TYPE).toBe('application/dtmf-relay')
    })
  })
})
