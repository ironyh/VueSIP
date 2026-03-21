/**
 * E911 Utilities Unit Tests
 *
 * @module tests/unit/utils/e911.test
 */

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

describe('utils/e911', () => {
  describe('sanitizeInput', () => {
    it('should return empty string for null input', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('')
    })

    it('should return empty string for undefined input', () => {
      expect(sanitizeInput(undefined as unknown as string)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      expect(sanitizeInput(123 as unknown as string)).toBe('')
    })

    it('should strip dangerous characters', () => {
      expect(sanitizeInput('<script>alert(xss)</script>')).toBe('scriptalert(xss)/script')
      expect(sanitizeInput("'; DROP TABLE users; --")).toBe('DROP TABLE users --')
      expect(sanitizeInput('test${inject}')).toBe('test{inject}')
      expect(sanitizeInput('test`backtick`')).toBe('testbacktick')
    })

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world')
    })

    it('should limit to 255 characters', () => {
      const longInput = 'a'.repeat(300)
      expect(sanitizeInput(longInput)).toHaveLength(255)
    })

    it('should pass through safe strings unchanged', () => {
      expect(sanitizeInput('Hello World 123')).toBe('Hello World 123')
    })
  })

  describe('sanitizeEmail', () => {
    it('should return undefined for null input', () => {
      expect(sanitizeEmail(null as unknown as string)).toBeUndefined()
    })

    it('should return undefined for undefined input', () => {
      expect(sanitizeEmail(undefined)).toBeUndefined()
    })

    it('should return undefined for non-string input', () => {
      expect(sanitizeEmail(123 as unknown as string)).toBeUndefined()
    })

    it('should strip dangerous characters', () => {
      expect(sanitizeEmail('test<script>@example.com')).toBe('testscript@example.com')
    })

    it('should trim and limit to 254 characters', () => {
      const longEmail = 'a'.repeat(300) + '@example.com'
      expect(sanitizeEmail(longEmail)).toHaveLength(254)
    })

    it('should pass through valid emails', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com')
      expect(sanitizeEmail('test.user+tag@example.co.uk')).toBe('test.user+tag@example.co.uk')
    })
  })

  describe('sanitizePhone', () => {
    it('should return undefined for null input', () => {
      expect(sanitizePhone(null as unknown as string)).toBeUndefined()
    })

    it('should return undefined for undefined input', () => {
      expect(sanitizePhone(undefined)).toBeUndefined()
    })

    it('should keep only allowed characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
      expect(sanitizePhone('+46 70 123 45 67')).toBe('+46 70 123 45 67')
    })

    it('should strip non-phone characters', () => {
      expect(sanitizePhone('555-1234#*')).toBe('555-1234')
    })

    it('should trim whitespace', () => {
      expect(sanitizePhone('  5551234  ')).toBe('5551234')
    })

    it('should limit to 20 characters', () => {
      const longPhone = '1'.repeat(25)
      expect(sanitizePhone(longPhone)).toHaveLength(20)
    })
  })

  describe('sanitizeUrl', () => {
    it('should return undefined for null input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBeUndefined()
    })

    it('should return undefined for undefined input', () => {
      expect(sanitizeUrl(undefined)).toBeUndefined()
    })

    it('should return undefined for non-http URLs', () => {
      expect(sanitizeUrl('ftp://example.com')).toBeUndefined()
      expect(sanitizeUrl('javascript:alert(1)')).toBeUndefined()
    })

    it('should accept http:// URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should accept https:// URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('should strip dangerous characters', () => {
      expect(sanitizeUrl('https://example.com?param=<script>')).toBe(
        'https://example.com?param=script'
      )
    })

    it('should limit to 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2050)
      expect(sanitizeUrl(longUrl)).toHaveLength(2048)
    })
  })

  describe('isValidExtension', () => {
    it('should return false for null input', () => {
      expect(isValidExtension(null as unknown as string)).toBe(false)
    })

    it('should return false for undefined input', () => {
      expect(isValidExtension(undefined as unknown as string)).toBe(false)
    })

    it('should return false for non-string input', () => {
      expect(isValidExtension(123 as unknown as string)).toBe(false)
    })

    it('should accept alphanumeric extensions', () => {
      expect(isValidExtension('user123')).toBe(true)
      expect(isValidExtension('ext_001')).toBe(true)
    })

    it('should accept special characters _*#-', () => {
      expect(isValidExtension('ext*')).toBe(true)
      expect(isValidExtension('test-1')).toBe(true)
      expect(isValidExtension('#')).toBe(true)
    })

    it('should reject extensions over 32 characters', () => {
      expect(isValidExtension('a'.repeat(33))).toBe(false)
    })

    it('should reject empty strings', () => {
      expect(isValidExtension('')).toBe(false)
    })
  })

  describe('generateE911Id', () => {
    it('should generate unique IDs', () => {
      const id1 = generateE911Id()
      const id2 = generateE911Id()
      expect(id1).not.toBe(id2)
    })

    it('should include timestamp', () => {
      const id = generateE911Id()
      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe('createDefaultE911Config', () => {
    it('should create default config with correct structure', () => {
      const config = createDefaultE911Config()
      expect(config).toHaveProperty('enabled', true)
      expect(config).toHaveProperty('emergencyNumbers', ['911'])
      expect(config).toHaveProperty('testNumbers', ['933'])
      expect(config).toHaveProperty('recipients', [])
      expect(config).toHaveProperty('recordCalls', true)
    })

    it('should set lastUpdated to current date', () => {
      const config = createDefaultE911Config()
      expect(config.lastUpdated).toBeInstanceOf(Date)
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
    it('should return name when no civic or geo data', () => {
      const location = { name: 'Test Location' }
      expect(formatE911Location(location)).toBe('Test Location')
    })

    it('should format civic address correctly', () => {
      const location = {
        name: 'Test',
        civic: {
          houseNumber: '123',
          streetName: 'Main',
          streetSuffix: 'St',
          city: 'Springfield',
          state: 'IL',
          postalCode: '62701',
          country: 'USA',
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('123 Main St')
      expect(formatted).toContain('Springfield')
      expect(formatted).toContain('IL')
      expect(formatted).toContain('62701')
    })

    it('should include house number suffix', () => {
      const location = {
        name: 'Test',
        civic: {
          houseNumber: '123',
          houseNumberSuffix: 'A',
          streetName: 'Main',
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('123A')
    })

    it('should include directional prefixes', () => {
      const location = {
        name: 'Test',
        civic: {
          houseNumber: '123',
          preDirectional: 'N',
          streetName: 'Main',
          postDirectional: 'W',
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('123 N Main W')
    })

    it('should include building info', () => {
      const location = {
        name: 'Test',
        civic: {
          houseNumber: '123',
          buildingName: 'Office Building',
          floor: '3',
          room: '301',
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('Office Building')
      expect(formatted).toContain('Floor 3')
      expect(formatted).toContain('Room 301')
    })

    it('should format geo coordinates', () => {
      const location = {
        name: 'Test',
        geo: {
          latitude: 40.712776,
          longitude: -74.005974,
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('GPS:')
      expect(formatted).toContain('40.712776')
      expect(formatted).toContain('-74.005974')
    })

    it('should combine civic and geo', () => {
      const location = {
        name: 'Test',
        civic: {
          houseNumber: '123',
          city: 'NYC',
        },
        geo: {
          latitude: 40.712776,
          longitude: -74.005974,
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('123')
      expect(formatted).toContain('NYC')
      expect(formatted).toContain('GPS:')
    })
  })
})
