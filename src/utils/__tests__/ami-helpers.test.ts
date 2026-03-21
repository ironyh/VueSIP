/**
 * AMI Helpers Unit Tests
 *
 * @group utils
 */

import { describe, it, expect } from 'vitest'
import {
  validateAmiPhoneNumber,
  validateExtension,
  validateQueueName,
  validateChannel,
  validateContext,
  validateInterface,
  validateAmiWebSocketUrl,
  calculatePercentage,
  calculateAverage,
  calculateRate,
  formatAmiDuration,
  createDurationMetric,
  formatAmiPhoneNumber,
  formatTimestamp,
  isDateInRange,
  sortByField,
  createErrorMessage,
  isNetworkError,
  isTimeoutError,
  parseUnixTimestamp,
  toUnixTimestamp,
  parseAmiBoolean,
  safeParseNumber,
  sanitizePhoneNumber,
  sanitizeExtension,
  validateTimeout,
  validatePriority,
  groupBy,
  createLookupMap,
  deduplicateBy,
  createAmiError,
} from '../ami-helpers'

// ============================================================================
// Validation Helpers
// ============================================================================

describe('validateAmiPhoneNumber', () => {
  it('should validate correct phone numbers', () => {
    expect(validateAmiPhoneNumber('5551234').isValid).toBe(true)
    expect(validateAmiPhoneNumber('555-1234').isValid).toBe(true)
    expect(validateAmiPhoneNumber('+1 555 123 4567').isValid).toBe(true)
    expect(validateAmiPhoneNumber('(555) 123-4567').isValid).toBe(true)
    expect(validateAmiPhoneNumber('5551234 x123').isValid).toBe(true)
    expect(validateAmiPhoneNumber('5551234 ext.123').isValid).toBe(true)
  })

  it('should reject invalid phone numbers', () => {
    expect(validateAmiPhoneNumber('').isValid).toBe(false)
    expect(validateAmiPhoneNumber('ab').isValid).toBe(false) // too short
    expect(validateAmiPhoneNumber('555;DROP TABLE--').isValid).toBe(false)
    expect(validateAmiPhoneNumber('555<script>').isValid).toBe(false)
  })

  it('should return errors for invalid numbers', () => {
    const result = validateAmiPhoneNumber('')
    expect(result.errors).toBeDefined()
    expect(result.errors?.length).toBeGreaterThan(0)
  })
})

describe('validateExtension', () => {
  it('should validate correct extensions', () => {
    expect(validateExtension('1001').isValid).toBe(true)
    expect(validateExtension('SIP/1001').isValid).toBe(true)
    expect(validateExtension('PJSIP/user').isValid).toBe(true)
    expect(validateExtension('user_name-1').isValid).toBe(true)
  })

  it('should reject invalid extensions', () => {
    expect(validateExtension('').isValid).toBe(false)
    expect(validateExtension('user;DROP').isValid).toBe(false)
    expect(validateExtension('user@domain').isValid).toBe(false)
  })
})

describe('validateQueueName', () => {
  it('should validate correct queue names', () => {
    expect(validateQueueName('support').isValid).toBe(true)
    expect(validateQueueName('sales-1').isValid).toBe(true)
    expect(validateQueueName('queue_1').isValid).toBe(true)
  })

  it('should reject invalid queue names', () => {
    expect(validateQueueName('').isValid).toBe(false)
    expect(validateQueueName('queue;DROP').isValid).toBe(false)
  })
})

describe('validateChannel', () => {
  it('should validate correct channels', () => {
    expect(validateChannel('SIP/1001').isValid).toBe(true)
    expect(validateChannel('PJSIP/endpoint1').isValid).toBe(true)
    expect(validateChannel('IAX2/peer').isValid).toBe(true)
  })

  it('should reject invalid channels', () => {
    expect(validateChannel('').isValid).toBe(false)
  })
})

describe('validateContext', () => {
  it('should validate correct contexts', () => {
    expect(validateContext('from-internal').isValid).toBe(true)
    expect(validateContext('from-outside').isValid).toBe(true)
  })

  it('should reject invalid contexts', () => {
    expect(validateContext('').isValid).toBe(false)
  })
})

describe('validateInterface', () => {
  it('should validate correct interfaces', () => {
    expect(validateInterface('SIP/1001').isValid).toBe(true)
    expect(validateInterface('PJSIP/trunk').isValid).toBe(true)
  })

  it('should reject invalid interfaces', () => {
    expect(validateInterface('').isValid).toBe(false)
  })
})

describe('validateAmiWebSocketUrl', () => {
  it('should validate correct WebSocket URLs', () => {
    expect(validateAmiWebSocketUrl('ws://localhost:8088/ari').isValid).toBe(true)
    expect(validateAmiWebSocketUrl('wss://server.com/ari').isValid).toBe(true)
  })

  it('should reject invalid WebSocket URLs', () => {
    expect(validateAmiWebSocketUrl('').isValid).toBe(false)
    expect(validateAmiWebSocketUrl('http://localhost').isValid).toBe(false)
    expect(validateAmiWebSocketUrl('ws://').isValid).toBe(false)
  })
})

describe('validateTimeout', () => {
  it('should validate correct timeouts', () => {
    expect(validateTimeout(1000).isValid).toBe(true)
    expect(validateTimeout(30000).isValid).toBe(true)
  })

  it('should reject invalid timeouts', () => {
    expect(validateTimeout(0).isValid).toBe(false)
    expect(validateTimeout(-1).isValid).toBe(false)
    expect(validateTimeout(-100).isValid).toBe(false)
  })
})

describe('validatePriority', () => {
  it('should validate correct priorities', () => {
    expect(validatePriority(1).isValid).toBe(true)
    expect(validatePriority(50).isValid).toBe(true)
    expect(validatePriority(99).isValid).toBe(true)
  })

  it('should reject invalid priorities', () => {
    expect(validatePriority(0).isValid).toBe(false)
    expect(validatePriority(-1).isValid).toBe(false)
    expect(validatePriority(100).isValid).toBe(false)
  })
})

// ============================================================================
// Calculation Helpers
// ============================================================================

describe('calculatePercentage', () => {
  it('should calculate percentages correctly', () => {
    const result = calculatePercentage(25, 100)
    expect(result.percentage).toBe(25)
  })

  it('should handle zero denominator', () => {
    const result = calculatePercentage(10, 0)
    expect(result.percentage).toBe(0)
  })

  it('should calculate decimal percentages', () => {
    const result = calculatePercentage(1, 3)
    expect(result.percentage).toBeCloseTo(33.33, 1)
  })
})

describe('calculateAverage', () => {
  it('should calculate average correctly', () => {
    expect(calculateAverage([10, 20, 30])).toBe(20)
    expect(calculateAverage([5])).toBe(5)
  })

  it('should return 0 for empty array', () => {
    expect(calculateAverage([])).toBe(0)
  })
})

describe('calculateRate', () => {
  it('should calculate rate correctly', () => {
    const result = calculateRate(50, 60, 'second')
    expect(result.rate).toBeCloseTo(0.83, 1)
  })

  it('should handle zero time', () => {
    const result = calculateRate(10, 0, 'second')
    expect(result.rate).toBe(0)
  })

  it('should calculate per minute rate', () => {
    const result = calculateRate(60, 60, 'minute')
    expect(result.rate).toBe(60)
  })
})

// ============================================================================
// Formatting Helpers
// ============================================================================

describe('formatAmiDuration', () => {
  it('should format duration in short format', () => {
    expect(formatAmiDuration(0)).toBe('0s')
    expect(formatAmiDuration(59)).toBe('59s')
    expect(formatAmiDuration(60)).toBe('1m')
    expect(formatAmiDuration(90)).toBe('1m 30s')
  })

  it('should format duration in long format', () => {
    expect(formatAmiDuration(0, 'long')).toBe('0 seconds')
    expect(formatAmiDuration(60, 'long')).toBe('1 minute')
    expect(formatAmiDuration(3600, 'long')).toBe('1 hour')
    expect(formatAmiDuration(3661, 'long')).toBe('1 hour, 1 minute, 1 second')
  })
})

describe('createDurationMetric', () => {
  it('should create duration metric', () => {
    const metric = createDurationMetric(125)
    expect(metric.seconds).toBe(125)
    expect(metric.formatted).toBe('2m 5s')
  })
})

describe('formatAmiPhoneNumber', () => {
  it('should format phone numbers in US format', () => {
    expect(formatAmiPhoneNumber('5551234567')).toBe('(555) 123-4567')
  })

  it('should format phone numbers in international format', () => {
    expect(formatAmiPhoneNumber('+16123456789', 'international')).toBe('+1 612-345-6789')
  })

  it('should return raw format', () => {
    expect(formatAmiPhoneNumber('(555) 123-4567', 'raw')).toBe('5551234567')
  })

  it('should handle short numbers', () => {
    expect(formatAmiPhoneNumber('123')).toBe('123')
  })
})

describe('formatTimestamp', () => {
  it('should format timestamps with time', () => {
    const date = new Date('2026-01-15T10:30:00Z')
    const result = formatTimestamp(date, true)
    expect(result).toContain('2026')
  })

  it('should format timestamps without time', () => {
    const date = new Date('2026-01-15T10:30:00Z')
    const result = formatTimestamp(date, false)
    expect(result).not.toContain(':')
  })
})

// ============================================================================
// Date/Range Helpers
// ============================================================================

describe('isDateInRange', () => {
  it('should check if date is in range', () => {
    const date = new Date('2026-01-15')
    const range = {
      startedAt: new Date('2026-01-01'),
      endedAt: new Date('2026-01-31'),
    }
    expect(isDateInRange(date, range)).toBe(true)
  })

  it('should return false for dates outside range', () => {
    const date = new Date('2026-02-15')
    const range = {
      startedAt: new Date('2026-01-01'),
      endedAt: new Date('2026-01-31'),
    }
    expect(isDateInRange(date, range)).toBe(false)
  })
})

// ============================================================================
// Array Helpers
// ============================================================================

describe('sortByField', () => {
  it('should sort ascending by default', () => {
    const items = [{ a: 3 }, { a: 1 }, { a: 2 }]
    const result = sortByField(items, 'a')
    expect(result[0].a).toBe(1)
    expect(result[2].a).toBe(3)
  })

  it('should sort descending when specified', () => {
    const items = [{ a: 3 }, { a: 1 }, { a: 2 }]
    const result = sortByField(items, 'a', 'desc')
    expect(result[0].a).toBe(3)
    expect(result[2].a).toBe(1)
  })
})

// ============================================================================
// Error Helpers
// ============================================================================

describe('createErrorMessage', () => {
  it('should create error message from Error object', () => {
    const error = new Error('Test error')
    expect(createErrorMessage(error)).toBe('Test error')
  })

  it('should handle string errors', () => {
    expect(createErrorMessage('String error')).toBe('String error')
  })

  it('should include context when provided', () => {
    const error = new Error('Test error')
    const message = createErrorMessage(error, 'AMI operation')
    expect(message).toContain('Test error')
  })
})

describe('isNetworkError', () => {
  it('should detect network errors', () => {
    const error = new Error('Network error')
    expect(isNetworkError(error)).toBe(true)
  })

  it('should detect connection errors', () => {
    const error = new Error('Connection refused')
    expect(isNetworkError(error)).toBe(true)
  })

  it('should return false for non-network errors', () => {
    const error = new Error('Some other error')
    expect(isNetworkError(error)).toBe(false)
  })
})

describe('isTimeoutError', () => {
  it('should detect timeout errors', () => {
    const error = new Error('Request timeout')
    expect(isTimeoutError(error)).toBe(true)
  })

  it('should detect timeout in error message', () => {
    const error = new Error('Connection timeout')
    expect(isTimeoutError(error)).toBe(true)
  })

  it('should return false for non-timeout errors', () => {
    const error = new Error('ETIMEDOUT')
    expect(isTimeoutError(error)).toBe(false)
  })
})

// ============================================================================
// Timestamp Helpers
// ============================================================================

describe('parseUnixTimestamp', () => {
  it('should parse unix timestamp', () => {
    const date = parseUnixTimestamp(1704067200)
    expect(date.getFullYear()).toBe(2024)
  })
})

describe('toUnixTimestamp', () => {
  it('should convert to unix timestamp', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const timestamp = toUnixTimestamp(date)
    expect(timestamp).toBeGreaterThan(0)
  })
})

// ============================================================================
// Parse Helpers
// ============================================================================

describe('parseAmiBoolean', () => {
  it('should parse AMI boolean values', () => {
    expect(parseAmiBoolean('yes')).toBe(true)
    expect(parseAmiBoolean('true')).toBe(true)
    expect(parseAmiBoolean('1')).toBe(true)
    expect(parseAmiBoolean('no')).toBe(false)
    expect(parseAmiBoolean('false')).toBe(false)
    expect(parseAmiBoolean('0')).toBe(false)
  })
})

describe('safeParseNumber', () => {
  it('should parse numbers safely', () => {
    expect(safeParseNumber('123')).toBe(123)
    expect(safeParseNumber(456)).toBe(456)
    expect(safeParseNumber(undefined)).toBe(0)
    expect(safeParseNumber('abc', 42)).toBe(42)
  })
})

// ============================================================================
// Sanitization Helpers
// ============================================================================

describe('sanitizePhoneNumber', () => {
  it('should sanitize phone numbers', () => {
    expect(sanitizePhoneNumber('555;DROP TABLE--')).toBe('555')
  })

  it('should preserve valid characters', () => {
    expect(sanitizePhoneNumber('+1 (555) 123-4567')).toBe('+1 (555) 123-4567')
  })
})

describe('sanitizeExtension', () => {
  it('should sanitize extensions', () => {
    expect(sanitizeExtension('SIP/1001')).toBe('SIP/1001')
    expect(sanitizeExtension('  user  ')).toBe('user')
  })
})

// ============================================================================
// Collection Helpers (previously untested)
// ============================================================================

describe('groupBy', () => {
  interface QueueMember {
    name: string
    queue: string
    penalty: number
  }

  it('should group items by string field', () => {
    const members: QueueMember[] = [
      { name: 'alice', queue: 'support', penalty: 0 },
      { name: 'bob', queue: 'support', penalty: 1 },
      { name: 'carol', queue: 'sales', penalty: 0 },
    ]

    const result = groupBy(members, 'queue')

    expect(result.get('support')).toHaveLength(2)
    expect(result.get('sales')).toHaveLength(1)
  })

  it('should group items by number field', () => {
    const items = [
      { label: 'a', priority: 1 },
      { label: 'b', priority: 1 },
      { label: 'c', priority: 2 },
    ]

    const result = groupBy(items, 'priority')

    expect(result.get('1')).toHaveLength(2)
    expect(result.get('2')).toHaveLength(1)
  })

  it('should return empty map for empty array', () => {
    const result = groupBy([], 'name')
    expect(result.size).toBe(0)
  })

  it('should convert non-string field values to string keys', () => {
    const items = [
      { id: 10, label: 'ten' },
      { id: 20, label: 'twenty' },
    ]

    const result = groupBy(items, 'id')

    expect(result.get('10')).toHaveLength(1)
    expect(result.get('20')).toHaveLength(1)
  })
})

describe('createLookupMap', () => {
  interface Queue {
    name: string
    strategy: string
    members: number
  }

  it('should create a map keyed by the specified field', () => {
    const queues: Queue[] = [
      { name: 'support', strategy: 'ringall', members: 5 },
      { name: 'sales', strategy: 'leastrecent', members: 3 },
    ]

    const result = createLookupMap(queues, 'name')

    expect(result.get('support')).toEqual({ name: 'support', strategy: 'ringall', members: 5 })
    expect(result.get('sales')).toEqual({ name: 'sales', strategy: 'leastrecent', members: 3 })
  })

  it('should overwrite duplicate keys with later item', () => {
    const items = [
      { id: 'dup', label: 'first' },
      { id: 'dup', label: 'second' },
    ]

    const result = createLookupMap(items, 'id')

    expect(result.size).toBe(1)
    expect(result.get('dup')).toEqual({ id: 'dup', label: 'second' })
  })

  it('should return empty map for empty array', () => {
    const result = createLookupMap([], 'name')
    expect(result.size).toBe(0)
  })

  it('should convert numeric field values to string keys', () => {
    const items = [{ id: 42, label: 'answer' }]

    const result = createLookupMap(items, 'id')

    expect(result.get('42')).toEqual({ id: 42, label: 'answer' })
  })
})

describe('deduplicateBy', () => {
  interface Call {
    uniqueId: string
    duration: number
  }

  it('should remove duplicates by field, keeping first occurrence', () => {
    const calls: Call[] = [
      { uniqueId: 'aa', duration: 60 },
      { uniqueId: 'bb', duration: 30 },
      { uniqueId: 'aa', duration: 90 }, // duplicate
      { uniqueId: 'cc', duration: 45 },
    ]

    const result = deduplicateBy(calls, 'uniqueId')

    expect(result).toHaveLength(3)
    expect(result[0].uniqueId).toBe('aa')
    expect(result[0].duration).toBe(60) // first occurrence kept
    expect(result[2].uniqueId).toBe('cc')
  })

  it('should return empty array for empty input', () => {
    expect(deduplicateBy([], 'id')).toEqual([])
  })

  it('should convert field values to strings for comparison', () => {
    const items = [
      { id: 1, label: 'one' },
      { id: '1', label: 'one-string' }, // same string key "1"
      { id: 2, label: 'two' },
    ]

    const result = deduplicateBy(items, 'id')

    // "1" === "1" so second item overwrites first
    expect(result).toHaveLength(2)
  })
})

describe('createAmiError', () => {
  it('should create an AMI error with operation and message', () => {
    const result = createAmiError('addToQueue', 'Invalid queue name')

    expect(result).toEqual({
      operation: 'addToQueue',
      message: 'Invalid queue name',
    })
  })

  it('should include details when provided', () => {
    const result = createAmiError('parkCall', 'Parking failed', {
      slot: 'ParkedUp_1',
      channel: 'SIP/1001',
    })

    expect(result).toEqual({
      operation: 'parkCall',
      message: 'Parking failed',
      details: {
        slot: 'ParkedUp_1',
        channel: 'SIP/1001',
      },
    })
  })

  it('should omit details field when not provided', () => {
    const result = createAmiError('originate', 'Timeout')

    expect(result).not.toHaveProperty('details')
  })

  it('should handle undefined details gracefully', () => {
    const result = createAmiError('originate', 'Error', undefined)

    expect(result).toEqual({
      operation: 'originate',
      message: 'Error',
    })
    expect(result).not.toHaveProperty('details')
  })
})
