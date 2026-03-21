/**
 * E911 Utilities Unit Tests
 *
 * @group utils/e911
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
} from '../e911'

describe('e911 utilities', () => {
  describe('sanitizeInput', () => {
    it('should return empty string for null/undefined', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('')
      expect(sanitizeInput(undefined as unknown as string)).toBe('')
    })

    it('should return empty string for non-string input', () => {
      expect(sanitizeInput(123 as unknown as string)).toBe('')
      expect(sanitizeInput({} as unknown as string)).toBe('')
    })

    it('should strip dangerous characters', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script')
      expect(sanitizeInput('foo\'bar"baz')).toBe('foobarbaz')
      expect(sanitizeInput('foo;bar|baz')).toBe('foobarbaz')
      expect(sanitizeInput('foo`bar$baz')).toBe('foobarbaz')
    })

    it('should trim and limit to 255 chars', () => {
      const long = 'a'.repeat(300)
      expect(sanitizeInput(long).length).toBe(255)
      expect(sanitizeInput('  hello  ')).toBe('hello')
    })

    it('should pass through safe strings', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World')
      expect(sanitizeInput('+1 555 123 4567')).toBe('+1 555 123 4567')
    })
  })

  describe('sanitizeEmail', () => {
    it('should return undefined for null/undefined', () => {
      expect(sanitizeEmail(undefined)).toBeUndefined()
      expect(sanitizeEmail(null as unknown as string)).toBeUndefined()
    })

    it('should strip dangerous characters', () => {
      expect(sanitizeEmail('<script>@example.com')).toBe('script@example.com')
      expect(sanitizeEmail("test'@example.com")).toBe('test@example.com')
    })

    it('should trim and limit to 254 chars', () => {
      const long = 'a'.repeat(300)
      expect(sanitizeEmail(long + '@example.com')?.length).toBeLessThanOrEqual(254)
    })

    it('should pass through valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com')
      expect(sanitizeEmail('user.name+tag@example.co.uk')).toBe('user.name+tag@example.co.uk')
    })
  })

  describe('sanitizePhone', () => {
    it('should return undefined for null/undefined', () => {
      expect(sanitizePhone(undefined)).toBeUndefined()
      expect(sanitizePhone(null as unknown as string)).toBeUndefined()
    })

    it('should keep only valid phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
      expect(sanitizePhone('+46 70 123 45 67')).toBe('+46 70 123 45 67')
      expect(sanitizePhone('abc123def')).toBe('123')
    })

    it('should trim and limit to 20 chars', () => {
      const long = '+' + '1'.repeat(30)
      expect(sanitizePhone(long)?.length).toBeLessThanOrEqual(20)
    })
  })

  describe('sanitizeUrl', () => {
    it('should return undefined for null/undefined', () => {
      expect(sanitizeUrl(undefined)).toBeUndefined()
      expect(sanitizeUrl(null as unknown as string)).toBeUndefined()
    })

    it('should require http/https prefix', () => {
      expect(sanitizeUrl('ftp://example.com')).toBeUndefined()
      expect(sanitizeUrl('example.com')).toBeUndefined()
    })

    it('should pass through valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
      expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path')
    })

    it('should strip dangerous characters', () => {
      expect(sanitizeUrl('https://example.com?a=1<script>')).toBe('https://example.com?a=1script')
    })

    it('should limit to 2048 chars', () => {
      const long = 'https://example.com/' + 'a'.repeat(3000)
      expect(sanitizeUrl(long)?.length).toBeLessThanOrEqual(2048)
    })
  })

  describe('isValidExtension', () => {
    it('should return false for null/undefined', () => {
      expect(isValidExtension(undefined as unknown as string)).toBe(false)
      expect(isValidExtension(null as unknown as string)).toBe(false)
    })

    it('should validate correct extensions', () => {
      expect(isValidExtension('123')).toBe(true)
      expect(isValidExtension('abc')).toBe(true)
      expect(isValidExtension('test_123')).toBe(true)
      expect(isValidExtension('*#-')).toBe(true)
      expect(isValidExtension('A1B2C3')).toBe(true)
    })

    it('should reject invalid extensions', () => {
      expect(isValidExtension('')).toBe(false)
      expect(isValidExtension('a'.repeat(33))).toBe(false) // too long
      expect(isValidExtension('foo bar')).toBe(false) // spaces
      expect(isValidExtension('foo@bar')).toBe(false) // special chars
    })
  })

  describe('generateE911Id', () => {
    it('should generate unique IDs', () => {
      const id1 = generateE911Id()
      const id2 = generateE911Id()
      expect(id1).not.toBe(id2)
    })

    it('should match expected format', () => {
      const id = generateE911Id()
      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe('createDefaultE911Config', () => {
    it('should create valid default config', () => {
      const config = createDefaultE911Config()
      expect(config.enabled).toBe(true)
      expect(config.emergencyNumbers).toContain('911')
      expect(config.testNumbers).toContain('933')
      expect(config.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('createEmptyE911Stats', () => {
    it('should create empty stats with zeros', () => {
      const stats = createEmptyE911Stats()
      expect(stats.totalCalls).toBe(0)
      expect(stats.testCalls).toBe(0)
      expect(stats.callsWithLocation).toBe(0)
      expect(stats.notificationsSent).toBe(0)
    })
  })

  describe('formatE911Location', () => {
    it('should return name as fallback', () => {
      const location = {
        id: '1',
        name: 'Test Location',
        type: 'civic' as const,
        isDefault: false,
        isVerified: false,
        extensions: [],
        lastUpdated: new Date(),
      }
      expect(formatE911Location(location)).toBe('Test Location')
    })

    it('should format civic address', () => {
      const location = {
        id: '1',
        name: 'Office',
        type: 'civic' as const,
        isDefault: false,
        isVerified: false,
        extensions: [],
        lastUpdated: new Date(),
        civic: {
          houseNumber: '123',
          streetName: 'Main',
          city: 'Springfield',
          state: 'OR',
          postalCode: '12345',
          country: 'US',
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('123')
      expect(formatted).toContain('Main')
      expect(formatted).toContain('Springfield')
    })

    it('should format geo coordinates', () => {
      const location = {
        id: '1',
        name: 'Office',
        type: 'geo' as const,
        isDefault: false,
        isVerified: false,
        extensions: [],
        lastUpdated: new Date(),
        geo: {
          latitude: 45.5123,
          longitude: -122.6789,
          timestamp: new Date(),
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('GPS:')
      expect(formatted).toContain('45.512300')
      expect(formatted).toContain('-122.678900')
    })

    it('should combine civic and geo', () => {
      const location = {
        id: '1',
        name: 'Office',
        type: 'combined' as const,
        isDefault: false,
        isVerified: false,
        extensions: [],
        lastUpdated: new Date(),
        civic: {
          houseNumber: '123',
          streetName: 'Main',
          city: 'Springfield',
          state: 'OR',
          postalCode: '12345',
          country: 'US',
        },
        geo: {
          latitude: 45.5123,
          longitude: -122.6789,
          timestamp: new Date(),
        },
      }
      const formatted = formatE911Location(location)
      expect(formatted).toContain('123')
      expect(formatted).toContain('GPS:')
    })
  })
})
