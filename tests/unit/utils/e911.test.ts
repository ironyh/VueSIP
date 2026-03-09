/**
 * E911 utility tests
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  isValidExtension,
  generateE911Id,
  createDefaultE911Config,
  createEmptyE911Stats,
  formatE911Location,
} from '@/utils/e911'

describe('e911', () => {
  describe('sanitizeInput', () => {
    it('should return empty string for undefined input', () => {
      expect(sanitizeInput(undefined as unknown as string)).toBe('')
    })

    it('should return empty string for null input', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      expect(sanitizeInput(123 as unknown as string)).toBe('')
    })

    it('should strip dangerous characters', () => {
      // The function removes < > ' " ; & | ` $ \
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script')
    })

    it('should strip semicolons', () => {
      expect(sanitizeInput('test;rm -rf;')).toBe('testrm -rf')
    })

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello')
    })

    it('should limit to 255 characters', () => {
      const long = 'a'.repeat(300)
      expect(sanitizeInput(long).length).toBe(255)
    })
  })

  describe('sanitizeEmail', () => {
    it('should return undefined for undefined input', () => {
      expect(sanitizeEmail(undefined)).toBeUndefined()
    })

    it('should return undefined for null input', () => {
      expect(sanitizeEmail(null as unknown as string)).toBeUndefined()
    })

    it('should return undefined for non-string input', () => {
      expect(sanitizeEmail(123 as unknown as string)).toBeUndefined()
    })

    it('should trim and sanitize email', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com')
    })

    it('should strip dangerous characters from email', () => {
      expect(sanitizeEmail('test@<script>example.com')).toBe('test@scriptexample.com')
    })

    it('should limit to 254 characters', () => {
      const local = 'a'.repeat(250)
      const result = sanitizeEmail(`${local}@example.com`)
      expect(result?.length).toBeLessThanOrEqual(254)
    })
  })

  describe('sanitizePhone', () => {
    it('should return undefined for undefined input', () => {
      expect(sanitizePhone(undefined)).toBeUndefined()
    })

    it('should return undefined for null input', () => {
      expect(sanitizePhone(null as unknown as string)).toBeUndefined()
    })

    it('should keep only valid phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
    })

    it('should strip letters', () => {
      expect(sanitizePhone('555-123-ABCD')).toBe('555-123-')
    })

    it('should trim whitespace', () => {
      expect(sanitizePhone('  5551234567  ')).toBe('5551234567')
    })

    it('should limit to 20 characters', () => {
      const long = '1'.repeat(30)
      expect(sanitizePhone(long)?.length).toBe(20)
    })
  })

  describe('sanitizeUrl', () => {
    it('should return undefined for undefined input', () => {
      expect(sanitizeUrl(undefined)).toBeUndefined()
    })

    it('should return undefined for null input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBeUndefined()
    })

    it('should return undefined for non-http URLs', () => {
      expect(sanitizeUrl('ftp://example.com')).toBeUndefined()
      expect(sanitizeUrl('javascript:alert(1)')).toBeUndefined()
    })

    it('should accept http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should accept https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('should strip dangerous characters', () => {
      expect(sanitizeUrl('https://example.com?param=<script>')).toBe(
        'https://example.com?param=script'
      )
    })

    it('should limit to 2048 characters', () => {
      const long = 'a'.repeat(3000)
      expect(sanitizeUrl(`https://example.com/${long}`)?.length).toBeLessThanOrEqual(2048)
    })
  })

  describe('isValidExtension', () => {
    it('should return false for undefined input', () => {
      expect(isValidExtension(undefined as unknown as string)).toBe(false)
    })

    it('should return false for null input', () => {
      expect(isValidExtension(null as unknown as string)).toBe(false)
    })

    it('should return false for non-string input', () => {
      expect(isValidExtension(123 as unknown as string)).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidExtension('')).toBe(false)
    })

    it('should accept alphanumeric extensions', () => {
      expect(isValidExtension('abc123')).toBe(true)
    })

    it('should accept underscores and hyphens', () => {
      expect(isValidExtension('test_ext-1')).toBe(true)
    })

    it('should accept asterisks and hashes', () => {
      expect(isValidExtension('*#-')).toBe(true)
    })

    it('should reject extensions over 32 characters', () => {
      expect(isValidExtension('a'.repeat(33))).toBe(false)
    })

    it('should reject special characters', () => {
      expect(isValidExtension('test@ext')).toBe(false)
      expect(isValidExtension('test.ext')).toBe(false)
    })
  })

  describe('generateE911Id', () => {
    it('should generate unique IDs', () => {
      const id1 = generateE911Id()
      const id2 = generateE911Id()
      expect(id1).not.toBe(id2)
    })

    it('should include timestamp and random component', () => {
      const id = generateE911Id()
      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe('createDefaultE911Config', () => {
    it('should create default config with expected values', () => {
      const config = createDefaultE911Config()
      expect(config.enabled).toBe(true)
      expect(config.emergencyNumbers).toContain('911')
      expect(config.testNumbers).toContain('933')
      expect(config.recipients).toEqual([])
      expect(config.recordCalls).toBe(true)
      expect(config.directDialing).toBe(true)
      expect(config.onSiteNotification).toBe(true)
      expect(config.dispatchableLocationRequired).toBe(true)
    })
  })

  describe('createEmptyE911Stats', () => {
    it('should create empty stats with zero values', () => {
      const stats = createEmptyE911Stats()
      expect(stats.totalCalls).toBe(0)
      expect(stats.testCalls).toBe(0)
      expect(stats.callsWithLocation).toBe(0)
      expect(stats.notificationsSent).toBe(0)
      expect(stats.notificationsDelivered).toBe(0)
      expect(stats.callbacksReceived).toBe(0)
      expect(stats.avgCallDuration).toBe(0)
      expect(stats.avgNotificationTime).toBe(0)
    })
  })

  describe('formatE911Location', () => {
    it('should return name if no civic or geo', () => {
      const result = formatE911Location({ name: 'Test Location' })
      expect(result).toBe('Test Location')
    })

    it('should format civic address', () => {
      const location = {
        name: 'Test',
        civic: {
          houseNumber: '123',
          streetName: 'Main',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62701',
        },
      }
      const result = formatE911Location(location)
      expect(result).toContain('123')
      expect(result).toContain('Main')
      expect(result).toContain('Springfield')
      expect(result).toContain('IL')
    })

    it('should format geo coordinates', () => {
      const location = {
        name: 'Test',
        geo: {
          latitude: 40.712776,
          longitude: -74.005974,
        },
      }
      const result = formatE911Location(location)
      expect(result).toContain('GPS:')
      expect(result).toContain('40.712776')
      expect(result).toContain('-74.005974')
    })

    it('should include building and floor info', () => {
      const location = {
        name: 'Test',
        civic: {
          houseNumber: '100',
          buildingName: 'Office Tower',
          floor: '5',
          room: '501',
        },
      }
      const result = formatE911Location(location)
      expect(result).toContain('Office Tower')
      expect(result).toContain('Floor 5')
      expect(result).toContain('Room 501')
    })
  })
})
