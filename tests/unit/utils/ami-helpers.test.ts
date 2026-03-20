/**
 * AMI Helper Utilities Tests
 *
 * Comprehensive test coverage for AMI validation, sanitization, calculation,
 * formatting, filtering, error handling, and data transformation utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  // Validation functions (existing)
  validateAmiPhoneNumber,
  validateExtension,
  validateChannel,
  // Validation functions (new coverage)
  validateQueueName,
  validateContext,
  validateInterface,
  validateAmiWebSocketUrl,
  validateTimeout,
  validatePriority,
  // Sanitization functions (existing)
  sanitizePhoneNumber,
  sanitizeExtension,
  // Calculation helpers
  calculatePercentage,
  calculateAverage,
  calculateRate,
  // Formatting helpers
  formatAmiDuration,
  createDurationMetric,
  formatAmiPhoneNumber,
  formatTimestamp,
  // Filtering & sorting helpers
  isDateInRange,
  sortByField,
  // Error helpers
  createAmiError,
  isNetworkError,
  isTimeoutError,
  // Data transformation helpers
  parseUnixTimestamp,
  toUnixTimestamp,
  parseAmiBoolean,
  safeParseNumber,
  groupBy,
  createLookupMap,
  deduplicateBy,
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

  describe('validateQueueName', () => {
    it('should validate valid queue names', () => {
      expect(validateQueueName('support').isValid).toBe(true)
      expect(validateQueueName('sales-queue').isValid).toBe(true)
      expect(validateQueueName('tech_queue_01').isValid).toBe(true)
      expect(validateQueueName('Queue123').isValid).toBe(true)
    })

    it('should reject empty queue names', () => {
      const result = validateQueueName('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Queue name is required')
    })

    it('should reject queue names with invalid characters', () => {
      const result = validateQueueName('support;DROP--')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Queue name must contain only letters, numbers, underscores, or hyphens'
      )
    })

    it('should reject queue names that are too long', () => {
      const longName = 'a'.repeat(129)
      const result = validateQueueName(longName)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Queue name must be 1-128 characters')
    })
  })

  describe('validateContext', () => {
    it('should validate valid context names', () => {
      expect(validateContext('default').isValid).toBe(true)
      expect(validateContext('from-internal').isValid).toBe(true)
      expect(validateContext('queue_context.01').isValid).toBe(true)
    })

    it('should reject empty context', () => {
      const result = validateContext('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Context is required')
    })

    it('should reject context with invalid characters', () => {
      const result = validateContext('context;DROP')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Context contains invalid characters')
    })

    it('should reject context that is too long', () => {
      const longContext = 'a'.repeat(65)
      const result = validateContext(longContext)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Context must be 1-64 characters')
    })
  })

  describe('validateInterface', () => {
    it('should validate valid SIP interfaces', () => {
      expect(validateInterface('SIP/1001').isValid).toBe(true)
      expect(validateInterface('PJSIP/2001').isValid).toBe(true)
      expect(validateInterface('IAX2/extension').isValid).toBe(true)
      expect(validateInterface('DAHDI/1').isValid).toBe(true)
    })

    it('should reject empty interface', () => {
      const result = validateInterface('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Interface is required')
    })

    it('should reject interface with invalid format', () => {
      expect(validateInterface('INVALID/1001').isValid).toBe(false)
      expect(validateInterface('SIP/').isValid).toBe(false)
    })

    it('should reject interface with injection attempts', () => {
      const result = validateInterface('SIP/1001;DROP--')
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateAmiWebSocketUrl', () => {
    it('should validate valid WebSocket URLs', () => {
      expect(validateAmiWebSocketUrl('ws://localhost:8088/ari').isValid).toBe(true)
      expect(validateAmiWebSocketUrl('wss://ami.example.com/ari').isValid).toBe(true)
      expect(validateAmiWebSocketUrl('ws://127.0.0.1:8088').isValid).toBe(true)
    })

    it('should reject empty URL', () => {
      const result = validateAmiWebSocketUrl('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('WebSocket URL is required')
    })

    it('should reject URL without ws:// or wss:// prefix', () => {
      const result = validateAmiWebSocketUrl('http://localhost:8088')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('URL must start with ws:// or wss://')
    })

    it('should reject invalid URL format', () => {
      const result = validateAmiWebSocketUrl('ws://')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid URL format')
    })
  })

  describe('validateTimeout', () => {
    it('should validate positive integers', () => {
      expect(validateTimeout(1000).isValid).toBe(true)
      expect(validateTimeout(1).isValid).toBe(true)
      expect(validateTimeout(30000).isValid).toBe(true)
    })

    it('should reject NaN', () => {
      const result = validateTimeout(NaN)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Timeout must be a number')
    })

    it('should reject zero and negative values', () => {
      expect(validateTimeout(0).isValid).toBe(false)
      expect(validateTimeout(-1).isValid).toBe(false)
      expect(validateTimeout(-1000).isValid).toBe(false)
      const result = validateTimeout(-1)
      expect(result.errors).toContain('Timeout must be positive')
    })

    it('should reject non-integer values', () => {
      const result = validateTimeout(1.5)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Timeout must be an integer')
    })
  })

  describe('validatePriority', () => {
    it('should validate priorities in range 1-99', () => {
      expect(validatePriority(1).isValid).toBe(true)
      expect(validatePriority(50).isValid).toBe(true)
      expect(validatePriority(99).isValid).toBe(true)
    })

    it('should reject NaN', () => {
      const result = validatePriority(NaN)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Priority must be a number')
    })

    it('should reject priorities below 1', () => {
      const result = validatePriority(0)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Priority must be between 1 and 99')
    })

    it('should reject priorities above 99', () => {
      const result = validatePriority(100)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Priority must be between 1 and 99')
    })

    it('should reject non-integer priorities', () => {
      const result = validatePriority(1.5)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Priority must be an integer')
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

  describe('sanitizeExtension', () => {
    it('should preserve valid extension characters', () => {
      expect(sanitizeExtension('1001')).toBe('1001')
      expect(sanitizeExtension('SIP/user')).toBe('SIP/user')
      expect(sanitizeExtension('queue-01')).toBe('queue-01')
      expect(sanitizeExtension('ext.100')).toBe('ext.100')
    })

    it('should remove dangerous characters like semicolons and angle brackets', () => {
      // semicolon is removed, but alphanumeric and hyphens are kept
      expect(sanitizeExtension('1001;DROP--')).toBe('1001DROP--')
      // angle brackets are removed
      expect(sanitizeExtension('ext<script>')).toBe('extscript')
    })

    it('should trim whitespace', () => {
      expect(sanitizeExtension('  1001  ')).toBe('1001')
    })
  })

  describe('createAmiError', () => {
    it('should create standardized error objects', () => {
      const error = createAmiError('addToQueue', 'Invalid queue', { queue: 'test' })
      expect(error.operation).toBe('addToQueue')
      expect(error.message).toBe('Invalid queue')
      expect(error.details).toEqual({ queue: 'test' })
    })

    it('should create error without details', () => {
      const error = createAmiError('originate', 'Connection failed')
      expect(error.operation).toBe('originate')
      expect(error.message).toBe('Connection failed')
      expect(error.details).toBeUndefined()
    })
  })
})

describe('AMI Helper Utilities - Calculation Helpers', () => {
  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      const result = calculatePercentage(25, 100)
      expect(result.percentage).toBe(25)
      expect(result.numerator).toBe(25)
      expect(result.denominator).toBe(100)
    })

    it('should handle zero denominator', () => {
      const result = calculatePercentage(10, 0)
      expect(result.percentage).toBe(0)
      expect(result.numerator).toBe(10)
      expect(result.denominator).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      const result = calculatePercentage(1, 3)
      expect(result.percentage).toBeCloseTo(33.33, 2)
    })

    it('should handle 100% case', () => {
      const result = calculatePercentage(50, 50)
      expect(result.percentage).toBe(100)
    })
  })

  describe('calculateAverage', () => {
    it('should calculate average of numbers', () => {
      expect(calculateAverage([10, 20, 30])).toBe(20)
      expect(calculateAverage([5, 15])).toBe(10)
    })

    it('should return 0 for empty array', () => {
      expect(calculateAverage([])).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      expect(calculateAverage([1, 2, 3])).toBe(2)
      expect(calculateAverage([1, 1, 1, 2])).toBe(1.25)
    })

    it('should handle single element', () => {
      expect(calculateAverage([42])).toBe(42)
    })
  })

  describe('calculateRate', () => {
    it('should calculate rate per second', () => {
      // 60 events in 60 seconds = 1 event/second
      const result = calculateRate(60, 60, 'second')
      expect(result.rate).toBe(1)
      expect(result.unit).toBe('second')
    })

    it('should calculate rate per minute', () => {
      // 60 events in 3600 seconds = 1 event/minute
      const result = calculateRate(60, 3600, 'minute')
      expect(result.rate).toBe(1)
    })

    it('should calculate rate per hour', () => {
      // 120 events in 3600 seconds = 120 events/hour
      const result = calculateRate(120, 3600, 'hour')
      expect(result.rate).toBe(120)
    })

    it('should calculate rate per day', () => {
      // 2400 events in 86400 seconds = 2400 events/day
      const result = calculateRate(2400, 86400, 'day')
      expect(result.rate).toBe(2400)
    })

    it('should return 0 for zero duration', () => {
      const result = calculateRate(100, 0, 'second')
      expect(result.rate).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      // 1 event in 3 seconds = 0.333... events/second
      const result = calculateRate(1, 3, 'second')
      expect(result.rate).toBeCloseTo(0.33, 2)
    })
  })
})

describe('AMI Helper Utilities - Formatting Helpers', () => {
  describe('formatAmiDuration', () => {
    it('should format short duration with seconds only', () => {
      expect(formatAmiDuration(45)).toBe('45s')
    })

    it('should format short duration with minutes and seconds', () => {
      expect(formatAmiDuration(125)).toBe('2m 5s')
    })

    it('should format short duration with hours, minutes, seconds', () => {
      expect(formatAmiDuration(3665)).toBe('1h 1m 5s')
    })

    it('should format long duration with full words', () => {
      expect(formatAmiDuration(125, 'long')).toBe('2 minutes, 5 seconds')
    })

    it('should format long duration with hours', () => {
      expect(formatAmiDuration(3665, 'long')).toBe('1 hour, 1 minute, 5 seconds')
    })

    it('should handle zero correctly in short format', () => {
      expect(formatAmiDuration(0)).toBe('0s')
    })

    it('should handle zero correctly in long format', () => {
      expect(formatAmiDuration(0, 'long')).toBe('0 seconds')
    })

    it('should format 1 hour in long format with singular', () => {
      expect(formatAmiDuration(3600, 'long')).toBe('1 hour')
    })

    it('should format 1 minute in long format with singular', () => {
      expect(formatAmiDuration(60, 'long')).toBe('1 minute')
    })
  })

  describe('createDurationMetric', () => {
    it('should create duration metric with short format', () => {
      const metric = createDurationMetric(125)
      expect(metric.seconds).toBe(125)
      expect(metric.formatted).toBe('2m 5s')
    })

    it('should create duration metric with long format', () => {
      const metric = createDurationMetric(125, 'long')
      expect(metric.seconds).toBe(125)
      expect(metric.formatted).toBe('2 minutes, 5 seconds')
    })
  })

  describe('formatAmiPhoneNumber', () => {
    it('should format US phone numbers', () => {
      expect(formatAmiPhoneNumber('5551234567', 'us')).toBe('(555) 123-4567')
    })

    it('should format international phone numbers', () => {
      expect(formatAmiPhoneNumber('15551234567', 'international')).toBe('+1 555-123-4567')
    })

    it('should return raw cleaned number', () => {
      expect(formatAmiPhoneNumber('555-123-4567', 'raw')).toBe('5551234567')
    })

    it('should handle phone numbers with non-digit characters', () => {
      expect(formatAmiPhoneNumber('(555) 123-4567', 'us')).toBe('(555) 123-4567')
    })

    it('should return input for invalid US format', () => {
      // 11 digits needed for US format
      expect(formatAmiPhoneNumber('5551234', 'us')).toBe('5551234')
    })
  })

  describe('formatTimestamp', () => {
    it('should format date with time', () => {
      const date = new Date('2024-01-15T10:30:00')
      const result = formatTimestamp(date, true)
      expect(result).toContain('2024')
      expect(result).toContain('10')
    })

    it('should format date without time', () => {
      const date = new Date('2024-01-15T10:30:00')
      const result = formatTimestamp(date, false)
      expect(result).toContain('2024')
      expect(result).toContain('15')
    })
  })
})

describe('AMI Helper Utilities - Filtering & Sorting Helpers', () => {
  describe('isDateInRange', () => {
    it('should return true when date is within range', () => {
      const date = new Date('2024-06-15')
      const range = {
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-12-31'),
      }
      expect(isDateInRange(date, range)).toBe(true)
    })

    it('should return false when date is before range', () => {
      const date = new Date('2023-06-15')
      const range = {
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-12-31'),
      }
      expect(isDateInRange(date, range)).toBe(false)
    })

    it('should return false when date is after range', () => {
      const date = new Date('2025-06-15')
      const range = {
        startedAt: new Date('2024-01-01'),
        endedAt: new Date('2024-12-31'),
      }
      expect(isDateInRange(date, range)).toBe(false)
    })

    it('should return true when only start is specified', () => {
      const date = new Date('2024-06-15')
      const range = { startedAt: new Date('2024-01-01') }
      expect(isDateInRange(date, range)).toBe(true)
    })

    it('should return true when only end is specified', () => {
      const date = new Date('2024-06-15')
      const range = { endedAt: new Date('2024-12-31') }
      expect(isDateInRange(date, range)).toBe(true)
    })

    it('should return true when neither start nor end is specified', () => {
      const date = new Date('2024-06-15')
      const range = {}
      expect(isDateInRange(date, range)).toBe(true)
    })
  })

  describe('sortByField', () => {
    it('should sort array in ascending order by field', () => {
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ]
      const sorted = sortByField(items, 'name')
      expect(sorted[0].name).toBe('Alice')
      expect(sorted[1].name).toBe('Bob')
      expect(sorted[2].name).toBe('Charlie')
    })

    it('should sort array in descending order by field', () => {
      const items = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
        { name: 'Charlie', age: 30 },
      ]
      const sorted = sortByField(items, 'age', 'desc')
      expect(sorted[0].age).toBe(35)
      expect(sorted[1].age).toBe(30)
      expect(sorted[2].age).toBe(25)
    })

    it('should not mutate original array', () => {
      const items = [
        { name: 'Bob', age: 30 },
        { name: 'Alice', age: 25 },
      ]
      const sorted = sortByField(items, 'name')
      expect(items[0].name).toBe('Bob')
      expect(sorted[0].name).toBe('Alice')
    })

    it('should handle numeric fields', () => {
      const items = [{ id: 3 }, { id: 1 }, { id: 2 }]
      const sorted = sortByField(items, 'id', 'asc')
      expect(sorted[0].id).toBe(1)
      expect(sorted[2].id).toBe(3)
    })
  })
})

describe('AMI Helper Utilities - Error Helpers', () => {
  describe('isNetworkError', () => {
    it('should detect network-related errors', () => {
      expect(isNetworkError(new Error('network error'))).toBe(true)
      expect(isNetworkError(new Error('connection refused'))).toBe(true)
      expect(isNetworkError(new Error('connection timeout'))).toBe(true)
      expect(isNetworkError(new Error('host unreachable'))).toBe(true)
    })

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('invalid input'))).toBe(false)
      expect(isNetworkError(new Error('authentication failed'))).toBe(false)
    })

    it('should return false for non-Error inputs', () => {
      expect(isNetworkError('not an error')).toBe(false)
      expect(isNetworkError(null)).toBe(false)
      expect(isNetworkError(undefined)).toBe(false)
      expect(isNetworkError({})).toBe(false)
    })
  })

  describe('isTimeoutError', () => {
    it('should detect timeout errors', () => {
      expect(isTimeoutError(new Error('Request timeout'))).toBe(true)
      expect(isTimeoutError(new Error('timeout exceeded'))).toBe(true)
      expect(isTimeoutError(new Error('TIMEOUT'))).toBe(true)
    })

    it('should return false for non-timeout errors', () => {
      expect(isTimeoutError(new Error('connection error'))).toBe(false)
      expect(isTimeoutError(new Error('invalid response'))).toBe(false)
    })

    it('should return false for non-Error inputs', () => {
      expect(isTimeoutError('timeout')).toBe(false)
      expect(isTimeoutError(null)).toBe(false)
      expect(isTimeoutError(undefined)).toBe(false)
    })
  })
})

describe('AMI Helper Utilities - Data Transformation Helpers', () => {
  describe('parseUnixTimestamp', () => {
    it('should convert Unix timestamp to Date', () => {
      const date = parseUnixTimestamp(1704067200) // 2024-01-01 00:00:00 UTC
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January
      expect(date.getDate()).toBe(1)
    })

    it('should handle zero timestamp', () => {
      const date = parseUnixTimestamp(0)
      expect(date.getFullYear()).toBe(1970)
    })
  })

  describe('toUnixTimestamp', () => {
    it('should convert Date to Unix timestamp', () => {
      const date = new Date('2024-01-01T00:00:00Z')
      const timestamp = toUnixTimestamp(date)
      expect(timestamp).toBe(1704067200)
    })

    it('should floor milliseconds', () => {
      const date = new Date('2024-01-01T00:00:00.999Z')
      const timestamp = toUnixTimestamp(date)
      expect(timestamp).toBe(1704067200)
    })
  })

  describe('parseAmiBoolean', () => {
    it('should parse yes/no strings', () => {
      expect(parseAmiBoolean('yes')).toBe(true)
      expect(parseAmiBoolean('no')).toBe(false)
      expect(parseAmiBoolean('YES')).toBe(true)
      expect(parseAmiBoolean('NO')).toBe(false)
    })

    it('should parse true/false strings', () => {
      expect(parseAmiBoolean('true')).toBe(true)
      expect(parseAmiBoolean('false')).toBe(false)
      expect(parseAmiBoolean('TRUE')).toBe(true)
      expect(parseAmiBoolean('FALSE')).toBe(false)
    })

    it('should parse 1/0 strings', () => {
      expect(parseAmiBoolean('1')).toBe(true)
      expect(parseAmiBoolean('0')).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(parseAmiBoolean('  yes  ')).toBe(true)
      expect(parseAmiBoolean('  no  ')).toBe(false)
    })

    it('should return false for unknown values', () => {
      expect(parseAmiBoolean('maybe')).toBe(false)
      expect(parseAmiBoolean('')).toBe(false)
    })
  })

  describe('safeParseNumber', () => {
    it('should return number as-is', () => {
      expect(safeParseNumber(42)).toBe(42)
      expect(safeParseNumber(0)).toBe(0)
      expect(safeParseNumber(-10)).toBe(-10)
    })

    it('should parse valid string numbers', () => {
      expect(safeParseNumber('123')).toBe(123)
      expect(safeParseNumber('0')).toBe(0)
      expect(safeParseNumber('-50')).toBe(-50)
    })

    it('should return fallback for invalid strings', () => {
      expect(safeParseNumber('invalid', 0)).toBe(0)
      expect(safeParseNumber('', 99)).toBe(99)
      expect(safeParseNumber('abc', -1)).toBe(-1)
    })

    it('should return fallback for undefined', () => {
      expect(safeParseNumber(undefined, 10)).toBe(10)
    })

    it('should use default fallback of 0', () => {
      expect(safeParseNumber('invalid')).toBe(0)
    })

    it('should handle decimal strings', () => {
      expect(safeParseNumber('3.14', 0)).toBeCloseTo(3.14)
    })
  })

  describe('groupBy', () => {
    it('should group items by field', () => {
      const items = [
        { type: 'a', name: 'item1' },
        { type: 'b', name: 'item2' },
        { type: 'a', name: 'item3' },
      ]
      const groups = groupBy(items, 'type')
      expect(groups.get('a')).toHaveLength(2)
      expect(groups.get('b')).toHaveLength(1)
    })

    it('should handle items with same key', () => {
      const items = [
        { status: 'active', id: 1 },
        { status: 'active', id: 2 },
        { status: 'inactive', id: 3 },
      ]
      const groups = groupBy(items, 'status')
      expect(groups.get('active')).toHaveLength(2)
      expect(groups.get('inactive')).toHaveLength(1)
    })

    it('should group items with undefined field as "undefined" key', () => {
      const items = [{ name: 'a' }, { name: 'b' }]
      const groups = groupBy(items, 'nonexistent' as any)
      // String(undefined) === "undefined"
      expect(groups.get('undefined')).toHaveLength(2)
    })
  })

  describe('createLookupMap', () => {
    it('should create map with field as key', () => {
      const items = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]
      const map = createLookupMap(items, 'id')
      expect(map.get('1')?.name).toBe('Alice')
      expect(map.get('2')?.name).toBe('Bob')
    })

    it('should overwrite duplicate keys', () => {
      const items = [
        { id: '1', name: 'Alice' },
        { id: '1', name: 'Bob' },
      ]
      const map = createLookupMap(items, 'id')
      expect(map.get('1')?.name).toBe('Bob')
    })
  })

  describe('deduplicateBy', () => {
    it('should deduplicate items by field', () => {
      const items = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '1', name: 'Alice2' },
      ]
      const result = deduplicateBy(items, 'id')
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Alice')
      expect(result[1].name).toBe('Bob')
    })

    it('should preserve first occurrence order', () => {
      const items = [
        { key: 'a', val: 1 },
        { key: 'b', val: 2 },
        { key: 'a', val: 3 },
        { key: 'c', val: 4 },
      ]
      const result = deduplicateBy(items, 'key')
      expect(result[0].val).toBe(1)
      expect(result[1].val).toBe(2)
      expect(result[2].val).toBe(4)
    })

    it('should return empty array for empty input', () => {
      expect(deduplicateBy([], 'id')).toHaveLength(0)
    })
  })
})
