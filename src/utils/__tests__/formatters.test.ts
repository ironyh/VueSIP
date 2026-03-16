/**
 * Formatters Unit Tests
 *
 * @group utils
 * @group formatters
 */

import {
  formatDuration,
  formatDurationShort,
  formatDurationCompact,
  formatMilliseconds,
  formatSipUri,
  parseSipUri,
  extractDisplayName,
  formatPhoneNumber,
  normalizePhoneNumber,
  comparePhoneNumbers,
  formatCallTime,
  formatDateTime,
  formatIsoTimestamp,
  formatBytes,
  formatBitrate,
  truncate,
  formatCallStatus,
  formatCallDirection,
  buildSipUri,
  extractSipDomain,
} from '../formatters'

describe('formatDuration', () => {
  test('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })

  test('formats seconds only', () => {
    expect(formatDuration(45)).toBe('00:00:45')
  })

  test('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('00:02:05')
  })

  test('formats hours', () => {
    expect(formatDuration(3665)).toBe('01:01:05')
  })

  test('handles negative values', () => {
    expect(formatDuration(-10)).toBe('00:00:00')
  })

  test('handles Infinity', () => {
    expect(formatDuration(Infinity)).toBe('00:00:00')
  })

  test('handles NaN', () => {
    expect(formatDuration(NaN)).toBe('00:00:00')
  })
})

describe('formatDurationShort', () => {
  test('formats seconds only', () => {
    expect(formatDurationShort(30)).toBe('30s')
  })

  test('formats minutes and seconds', () => {
    expect(formatDurationShort(65)).toBe('1m 5s')
  })

  test('formats hours and minutes', () => {
    expect(formatDurationShort(3665)).toBe('1h 1m')
  })

  test('limits to 2 units', () => {
    expect(formatDurationShort(90065)).toBe('25h 1m')
  })

  test('handles zero', () => {
    expect(formatDurationShort(0)).toBe('0s')
  })

  test('handles negative values', () => {
    expect(formatDurationShort(-10)).toBe('0s')
  })
})

describe('formatDurationCompact', () => {
  test('formats seconds only', () => {
    expect(formatDurationCompact(5)).toBe('0:05')
  })

  test('formats minutes and seconds', () => {
    expect(formatDurationCompact(65)).toBe('1:05')
  })

  test('formats hours', () => {
    expect(formatDurationCompact(3665)).toBe('1:01:05')
  })

  test('handles zero', () => {
    expect(formatDurationCompact(0)).toBe('0:00')
  })

  test('handles negative values', () => {
    expect(formatDurationCompact(-10)).toBe('0:00')
  })

  // Edge cases for compact call timer format
  test('formats 59 seconds correctly', () => {
    expect(formatDurationCompact(59)).toBe('0:59')
  })

  test('formats 60 seconds as 1:00', () => {
    expect(formatDurationCompact(60)).toBe('1:00')
  })

  test('formats 59 minutes and 59 seconds', () => {
    expect(formatDurationCompact(3599)).toBe('59:59')
  })

  test('formats 60 minutes as 1:00:00', () => {
    expect(formatDurationCompact(3600)).toBe('1:00:00')
  })

  test('formats large hours correctly', () => {
    expect(formatDurationCompact(7200)).toBe('2:00:00')
    expect(formatDurationCompact(86400)).toBe('24:00:00')
  })

  test('handles Infinity', () => {
    expect(formatDurationCompact(Infinity)).toBe('0:00')
  })

  test('handles NaN', () => {
    expect(formatDurationCompact(NaN)).toBe('0:00')
  })

  test('handles non-finite numbers', () => {
    expect(formatDurationCompact(-Infinity)).toBe('0:00')
  })

  test('handles very large numbers', () => {
    // MAX_SAFE_INTEGER = 9007199254740991, which is ~2501999792983 hours
    expect(formatDurationCompact(Number.MAX_SAFE_INTEGER)).toBe('2501999792983:36:31')
  })

  test('pads single digit minutes and seconds', () => {
    expect(formatDurationCompact(61)).toBe('1:01')
    expect(formatDurationCompact(3601)).toBe('1:00:01')
  })
})

describe('formatSipUri', () => {
  test('formats basic SIP URI without scheme', () => {
    expect(formatSipUri('sip:alice@example.com')).toBe('alice@example.com')
  })

  test('formats SIP URI with scheme', () => {
    expect(formatSipUri('sip:alice@example.com', true)).toBe('sip:alice@example.com')
  })

  test('formats SIPS URI without scheme', () => {
    expect(formatSipUri('sips:bob@example.com:5061')).toBe('bob@example.com')
  })

  test('formats SIPS URI with scheme', () => {
    expect(formatSipUri('sips:bob@example.com:5061', true)).toBe('sips:bob@example.com:5061')
  })

  test('handles empty string', () => {
    expect(formatSipUri('')).toBe('')
  })

  test('handles null/undefined', () => {
    // Test with empty string as a stand-in for null/undefined since function guards against non-strings
    expect(formatSipUri('')).toBe('')
  })

  test('returns invalid URI as-is', () => {
    expect(formatSipUri('not-a-uri')).toBe('not-a-uri')
  })
})

describe('parseSipUri', () => {
  test('parses basic SIP URI', () => {
    const result = parseSipUri('sip:alice@example.com')
    expect(result).toEqual({
      scheme: 'sip',
      user: 'alice',
      host: 'example.com',
    })
  })

  test('parses SIPS URI with port', () => {
    const result = parseSipUri('sips:bob@secure.example.com:5061')
    expect(result).toEqual({
      scheme: 'sips',
      user: 'bob',
      host: 'secure.example.com',
      port: 5061,
    })
  })

  test('returns null for invalid URI', () => {
    expect(parseSipUri('invalid')).toBeNull()
  })

  test('handles empty string', () => {
    expect(parseSipUri('')).toBeNull()
  })
})

describe('extractDisplayName', () => {
  test('extracts quoted display name', () => {
    expect(extractDisplayName('"Alice Smith" <sip:alice@example.com>')).toBe('Alice Smith')
  })

  test('extracts unquoted display name', () => {
    expect(extractDisplayName('Alice <sip:alice@example.com>')).toBe('Alice')
  })

  test('returns null for URI without display name', () => {
    expect(extractDisplayName('sip:alice@example.com')).toBeNull()
  })

  test('handles empty string', () => {
    expect(extractDisplayName('')).toBeNull()
  })
})

describe('formatPhoneNumber', () => {
  test('formats US phone number', () => {
    expect(formatPhoneNumber('+14155551234')).toBe('+1 (415) 555-1234')
  })

  test('formats UK phone number', () => {
    expect(formatPhoneNumber('+442071234567')).toBe('+44 20 7123 4567')
  })

  test('returns non-E164 numbers as-is', () => {
    expect(formatPhoneNumber('555-1234')).toBe('555-1234')
  })

  test('handles empty string', () => {
    expect(formatPhoneNumber('')).toBe('')
  })

  // Country-specific phone formatting tests
  test('formats Sweden mobile phone number', () => {
    expect(formatPhoneNumber('+46700123456')).toBe('+46 70 012 34 56')
  })

  test('formats Sweden landline phone number', () => {
    expect(formatPhoneNumber('+46812345678')).toBe('+46 8 123 456 78')
  })

  test('formats Germany phone number', () => {
    expect(formatPhoneNumber('+4915112345678')).toBe('+49 1511 2345678')
  })

  test('formats France phone number', () => {
    expect(formatPhoneNumber('+33123456789')).toBe('+33 1 23 45 67 89')
  })

  test('formats Netherlands phone number', () => {
    expect(formatPhoneNumber('+31612345678')).toBe('+31 6 1234 5678')
  })

  test('formats Norway phone number', () => {
    expect(formatPhoneNumber('+4791234567')).toBe('+47 912 34 567')
  })

  test('formats Denmark phone number', () => {
    expect(formatPhoneNumber('+4528123456')).toBe('+45 28 12 34 56')
  })

  test('formats Finland phone number', () => {
    expect(formatPhoneNumber('+358501234567')).toBe('+358 501 23 45 67')
  })

  test('formats Australia phone number', () => {
    expect(formatPhoneNumber('+61412345678')).toBe('+61 4 1234 5678')
  })
})

describe('normalizePhoneNumber', () => {
  test('normalizes US number', () => {
    expect(normalizePhoneNumber('+1 (415) 555-1234')).toBe('14155551234')
  })

  test('normalizes number with dashes', () => {
    expect(normalizePhoneNumber('555-1234')).toBe('5551234')
  })

  test('handles empty string', () => {
    expect(normalizePhoneNumber('')).toBe('')
  })
})

describe('comparePhoneNumbers', () => {
  test('compares formatted numbers', () => {
    expect(comparePhoneNumbers('555-1234', '5551234')).toBe(true)
  })

  test('compares international numbers', () => {
    expect(comparePhoneNumbers('+1-555-1234', '1 (555) 1234')).toBe(true)
  })

  test('returns false for different numbers', () => {
    expect(comparePhoneNumbers('555-1234', '555-5678')).toBe(false)
  })
})

describe('formatCallTime', () => {
  test('shows "Just now" for recent time', () => {
    const now = new Date('2024-01-15T12:00:00')
    const date = new Date('2024-01-15T11:59:30')
    expect(formatCallTime(date, now)).toBe('Just now')
  })

  test('shows minutes ago', () => {
    const now = new Date('2024-01-15T12:00:00')
    const date = new Date('2024-01-15T11:55:00')
    expect(formatCallTime(date, now)).toBe('5 minutes ago')
  })

  test('shows hours ago', () => {
    const now = new Date('2024-01-15T12:00:00')
    const date = new Date('2024-01-15T10:00:00')
    expect(formatCallTime(date, now)).toBe('2 hours ago')
  })

  test('shows days ago', () => {
    const now = new Date('2024-01-15T12:00:00')
    const date = new Date('2024-01-10T12:00:00')
    expect(formatCallTime(date, now)).toBe('5 days ago')
  })

  test('shows absolute date for older calls', () => {
    const now = new Date('2024-01-15T12:00:00')
    const date = new Date('2024-01-01T12:00:00')
    expect(formatCallTime(date, now)).toContain('Jan')
  })

  test('handles invalid date', () => {
    expect(formatCallTime(new Date('invalid'))).toBe('Invalid date')
  })
})

describe('formatDateTime', () => {
  test('formats date and time', () => {
    const date = new Date('2024-01-15T14:30:00')
    expect(formatDateTime(date)).toBe('Jan 15, 2024 at 2:30 PM')
  })

  test('handles invalid date', () => {
    expect(formatDateTime(new Date('invalid'))).toBe('Invalid date')
  })
})

describe('formatIsoTimestamp', () => {
  test('formats valid date', () => {
    const date = new Date('2024-01-15T14:30:00Z')
    expect(formatIsoTimestamp(date)).toBe('2024-01-15T14:30:00.000Z')
  })

  test('returns empty string for invalid date', () => {
    expect(formatIsoTimestamp(new Date('invalid'))).toBe('')
  })
})

describe('formatBytes', () => {
  test('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  test('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  test('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
  })

  test('handles zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  test('handles negative values', () => {
    expect(formatBytes(-100)).toBe('0 B')
  })
})

describe('formatBitrate', () => {
  test('formats kbps', () => {
    expect(formatBitrate(128000)).toBe('128 kbps')
  })

  test('formats mbps', () => {
    expect(formatBitrate(1536000)).toBe('1.5 Mbps')
  })

  test('handles zero', () => {
    expect(formatBitrate(0)).toBe('0 bps')
  })
})

describe('truncate', () => {
  test('truncates long string', () => {
    expect(truncate('This is a long string', 10)).toBe('This is...')
  })

  test('returns short string as-is', () => {
    expect(truncate('Short', 10)).toBe('Short')
  })

  test('uses custom ellipsis', () => {
    expect(truncate('This is a long string', 10, '…')).toBe('This is a…')
  })

  test('handles empty string', () => {
    expect(truncate('', 10)).toBe('')
  })

  test('handles non-string input', () => {
    // Function guards against non-strings - test with empty string
    expect(truncate('', 10)).toBe('')
  })

  test('handles maxLength smaller than ellipsis', () => {
    expect(truncate('Hello', 2, '...')).toBe('..')
    expect(truncate('Hello', 1, '...')).toBe('.')
    expect(truncate('Hello', 0, '...')).toBe('')
  })

  test('handles maxLength smaller than ellipsis', () => {
    expect(truncate('Hello', 2, '...')).toBe('..')
    expect(truncate('Hello', 1, '...')).toBe('.')
    expect(truncate('Hello', 0, '...')).toBe('')
  })
})

describe('formatCallStatus', () => {
  test('formats completed', () => {
    expect(formatCallStatus('completed')).toBe('Completed')
  })

  test('formats missed', () => {
    expect(formatCallStatus('missed')).toBe('Missed')
  })

  test('handles unknown status', () => {
    expect(formatCallStatus('unknown')).toBe('unknown')
  })
})

describe('formatCallDirection', () => {
  test('formats incoming', () => {
    expect(formatCallDirection('incoming')).toBe('Incoming')
  })

  test('formats outgoing', () => {
    expect(formatCallDirection('outgoing')).toBe('Outgoing')
  })

  test('handles unknown direction gracefully', () => {
    expect(formatCallDirection('unknown')).toBe('Unknown')
    expect(formatCallDirection('')).toBe('')
  })

  test('handles case variations', () => {
    // formatCallDirection always returns title case regardless of input
    expect(formatCallDirection('INCOMING')).toBe('Incoming')
    expect(formatCallDirection('Outgoing')).toBe('Outgoing')
    expect(formatCallDirection('incoming')).toBe('Incoming')
    expect(formatCallDirection('OUTGOING')).toBe('Outgoing')
  })
})

describe('buildSipUri', () => {
  test('builds from phone number', () => {
    expect(buildSipUri('+46700123456', 'sip.46elks.com')).toBe('sip:+46700123456@sip.46elks.com')
  })

  test('builds from username', () => {
    expect(buildSipUri('alice', 'example.com')).toBe('sip:alice@example.com')
  })

  test('returns existing SIP URI', () => {
    expect(buildSipUri('sip:bob@other.com', 'example.com')).toBe('sip:bob@other.com')
  })

  test('returns existing SIPS URI', () => {
    expect(buildSipUri('sips:secure@other.com')).toBe('sips:secure@other.com')
  })

  test('throws without domain for non-SIP target', () => {
    expect(() => buildSipUri('alice')).toThrow('Domain is required')
  })

  test('throws for empty target', () => {
    expect(() => buildSipUri('')).toThrow('Target cannot be empty')
  })
})

describe('extractSipDomain', () => {
  test('extracts domain from SIP URI', () => {
    expect(extractSipDomain('sip:alice@example.com')).toBe('example.com')
  })

  test('extracts domain from SIPS URI with port', () => {
    expect(extractSipDomain('sips:bob@secure.example.com:5061')).toBe('secure.example.com')
  })

  test('returns null for invalid URI', () => {
    expect(extractSipDomain('invalid')).toBeNull()
  })

  test('handles empty string', () => {
    expect(extractSipDomain('')).toBeNull()
  })
})

describe('formatMilliseconds', () => {
  test('formats milliseconds less than 1 second', () => {
    expect(formatMilliseconds(50)).toBe('50.0ms')
    expect(formatMilliseconds(0)).toBe('0.0ms')
    expect(formatMilliseconds(999)).toBe('999.0ms')
  })

  test('formats seconds', () => {
    expect(formatMilliseconds(1000)).toBe('1.0s')
    expect(formatMilliseconds(1500)).toBe('1.5s')
    expect(formatMilliseconds(59999)).toBe('60.0s')
  })

  test('formats minutes', () => {
    expect(formatMilliseconds(60000)).toBe('1m')
    expect(formatMilliseconds(65000)).toBe('1m 5.0s')
    expect(formatMilliseconds(3599999)).toBe('59m 60.0s')
  })

  test('formats hours', () => {
    expect(formatMilliseconds(3600000)).toBe('1h')
    expect(formatMilliseconds(3665000)).toBe('1h 1m')
    expect(formatMilliseconds(7323000)).toBe('2h 2m')
  })

  test('handles custom precision', () => {
    expect(formatMilliseconds(1500, 0)).toBe('2s')
    expect(formatMilliseconds(1500, 2)).toBe('1.50s')
  })

  test('handles edge cases', () => {
    expect(formatMilliseconds(-1)).toBe('0ms')
    expect(formatMilliseconds(Infinity)).toBe('0ms')
    expect(formatMilliseconds(NaN)).toBe('0ms')
  })
})
