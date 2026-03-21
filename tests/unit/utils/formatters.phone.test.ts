/**
 * Tests for phone number formatting utilities
 */

import { describe, it, expect } from 'vitest'
import { normalizePhoneNumber, comparePhoneNumbers, formatPhoneNumber } from '@/utils/formatters'

describe('normalizePhoneNumber', () => {
  it('should remove all non-digit characters', () => {
    expect(normalizePhoneNumber('+46-70-012-34-56')).toBe('46700123456')
  })

  it('should handle parentheses', () => {
    expect(normalizePhoneNumber('+1 (555) 123-4567')).toBe('15551234567')
  })

  it('should handle spaces', () => {
    expect(normalizePhoneNumber('46 70 012 34 56')).toBe('46700123456')
  })

  it('should return empty string for empty input', () => {
    expect(normalizePhoneNumber('')).toBe('')
  })

  it('should handle already normalized numbers', () => {
    expect(normalizePhoneNumber('46700123456')).toBe('46700123456')
  })
})

describe('comparePhoneNumbers', () => {
  it('should compare numbers with different formatting', () => {
    expect(comparePhoneNumbers('555-1234', '5551234')).toBe(true)
  })

  it('should compare numbers with country codes', () => {
    expect(comparePhoneNumbers('+1-555-1234', '1 (555) 1234')).toBe(true)
  })

  it('should handle Swedish phone numbers', () => {
    expect(comparePhoneNumbers('+46 70 012 34 56', '+46 70 012 34 56')).toBe(true)
  })

  it('should return false for different numbers', () => {
    expect(comparePhoneNumbers('555-1234', '555-5678')).toBe(false)
  })

  it('should handle empty strings', () => {
    expect(comparePhoneNumbers('', '')).toBe(true)
    expect(comparePhoneNumbers('123', '')).toBe(false)
  })
})

describe('formatPhoneNumber', () => {
  it('should format Swedish mobile numbers', () => {
    const result = formatPhoneNumber('+46700123456')
    expect(result).toContain('70')
    expect(result).toContain('012')
    expect(result).toContain('34 56')
  })

  it('should format Swedish 79x mobile numbers', () => {
    const result = formatPhoneNumber('+46791234567')
    // 79x is a valid Swedish mobile prefix (Tre, Telenor, etc.)
    expect(result).toBe('+46 79 123 45 67')
  })

  it('should format Swedish 74x mobile numbers (M2M/IoT)', () => {
    const result = formatPhoneNumber('+46741234567')
    // 74x is used for M2M/IoT services in Sweden
    expect(result).toBe('+46 74 123 45 67')
  })

  it('should format Swedish 72x mobile numbers', () => {
    const result = formatPhoneNumber('+46721234567')
    expect(result).toBe('+46 72 123 45 67')
  })

  it('should format Swedish 73x mobile numbers', () => {
    const result = formatPhoneNumber('+46731234567')
    expect(result).toBe('+46 73 123 45 67')
  })

  it('should format US numbers', () => {
    const result = formatPhoneNumber('+14155551234')
    expect(result).toContain('415')
    expect(result).toContain('555')
    expect(result).toContain('1234')
  })

  // Country-specific formatting tests (uncovered areas)
  it('should format German numbers (+49)', () => {
    const result = formatPhoneNumber('+493012345678')
    // Germany: +49 XX XXXXXXXX (landline like Berlin 30) or +49 XXX XXXXXXXX (mobile like 151/176/177)
    // Landline: +49 XX XXXXXXXX where XX is 2-5 digit area code
    // Mobile: +49 XXX XXXXXXXX where XXX is 3-digit mobile prefix
    expect(result).toMatch(/^\+49 \d{2,3} \d{5,8}$/)
  })

  it('should format Netherlands numbers (+31)', () => {
    const result = formatPhoneNumber('+31612345678')
    // Netherlands: +31 X XXXX XXXX
    expect(result).toMatch(/^\+31 \d{1} \d{4} \d{4}$/)
  })

  it('should format Finland mobile numbers (+358 40/50 prefix)', () => {
    // Mobile: +358 40 123456, +358 50 123456
    expect(formatPhoneNumber('+35840123456')).toBe('+358 40 123456')
    expect(formatPhoneNumber('+35850123456')).toBe('+358 50 123456')
  })

  it('should format Finland landline numbers (+358 9 prefix)', () => {
    // Helsinki landline: +358 9 123456
    expect(formatPhoneNumber('+3589123456')).toBe('+358 9 123456')
  })

  // Note: formatPhoneNumber has bugs with +49 (Germany), +47 (Norway), +45 (Denmark), +33 (France)
  // that produce malformed output like "+4 930" instead of "+49 30"
  // Bug filed separately
})
