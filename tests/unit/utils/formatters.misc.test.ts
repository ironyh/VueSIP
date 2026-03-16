/**
 * Tests for miscellaneous formatting utilities
 */

import { describe, it, expect } from 'vitest'
import {
  titleCase,
  truncate,
  formatCallDirection,
  formatCallStatus,
  formatBytes,
  formatBitrate,
  formatCallTime,
  formatDateTime,
  formatIsoTimestamp,
  formatSipStatusCode,
} from '@/utils/formatters'

describe('titleCase', () => {
  it('should convert lowercase string to title case', () => {
    expect(titleCase('hello')).toBe('Hello')
  })

  it('should convert uppercase string to title case', () => {
    expect(titleCase('HELLO')).toBe('Hello')
  })

  it('should handle mixed case string', () => {
    expect(titleCase('hElLo')).toBe('Hello')
  })

  it('should handle empty string', () => {
    expect(titleCase('')).toBe('')
  })

  it('should handle single character', () => {
    expect(titleCase('a')).toBe('A')
  })

  it('should handle string with spaces', () => {
    expect(titleCase('hello world')).toBe('Hello world')
  })

  it('should handle null input', () => {
    expect(titleCase(null as unknown as string)).toBe('')
  })

  it('should handle undefined input', () => {
    expect(titleCase(undefined as unknown as string)).toBe('')
  })
})

describe('truncate', () => {
  it('should not truncate string shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('should truncate string longer than maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('should use custom ellipsis', () => {
    expect(truncate('hello world', 8, '…')).toBe('hello w…')
  })

  it('should handle exact length string', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('should handle maxLength smaller than ellipsis', () => {
    expect(truncate('hello', 1, '...')).toBe('.')
  })

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('')
  })
})

describe('formatCallDirection', () => {
  it('should format incoming direction', () => {
    expect(formatCallDirection('incoming')).toBe('Incoming')
  })

  it('should format outgoing direction', () => {
    expect(formatCallDirection('outgoing')).toBe('Outgoing')
  })

  it('should title case unknown direction', () => {
    expect(formatCallDirection('internal')).toBe('Internal')
  })

  it('should handle empty string', () => {
    expect(formatCallDirection('')).toBe('')
  })

  it('should handle uppercase input', () => {
    expect(formatCallDirection('INCOMING')).toBe('Incoming')
    expect(formatCallDirection('OUTGOING')).toBe('Outgoing')
  })

  it('should handle mixed case input', () => {
    expect(formatCallDirection('InCoMiNg')).toBe('Incoming')
    expect(formatCallDirection('OuTgOiNg')).toBe('Outgoing')
  })

  it('should handle null input', () => {
    expect(formatCallDirection(null as unknown as string)).toBe('')
  })

  it('should handle undefined input', () => {
    expect(formatCallDirection(undefined as unknown as string)).toBe('')
  })

  it('should handle numeric input as string', () => {
    expect(formatCallDirection('123' as unknown as string)).toBe('123')
  })
})

describe('formatCallStatus', () => {
  it('should format completed status', () => {
    expect(formatCallStatus('completed')).toBe('Completed')
  })

  it('should format missed status', () => {
    expect(formatCallStatus('missed')).toBe('Missed')
  })

  it('should format busy status', () => {
    expect(formatCallStatus('busy')).toBe('Busy')
  })

  it('should format cancelled status', () => {
    expect(formatCallStatus('cancelled')).toBe('Cancelled')
  })

  it('should return unknown status as-is', () => {
    expect(formatCallStatus('custom')).toBe('custom')
  })

  it('should handle empty string', () => {
    expect(formatCallStatus('')).toBe('')
  })

  it('should handle null input', () => {
    expect(formatCallStatus(null as unknown as string)).toBe('')
  })

  it('should handle undefined input', () => {
    expect(formatCallStatus(undefined as unknown as string)).toBe('')
  })

  it('should handle uppercase input', () => {
    expect(formatCallStatus('COMPLETED')).toBe('Completed')
    expect(formatCallStatus('MISSED')).toBe('Missed')
  })

  it('should handle mixed case input', () => {
    expect(formatCallStatus('CoMpLeTeD')).toBe('Completed')
  })
})

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('should format bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB')
  })

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('should use custom decimal places', () => {
    expect(formatBytes(1536, 2)).toBe('1.5 KB')
  })
})

describe('formatBitrate', () => {
  it('should format 0 bps', () => {
    expect(formatBitrate(0)).toBe('0 bps')
  })

  it('should format bps', () => {
    expect(formatBitrate(500)).toBe('500 bps')
  })

  it('should format kbps', () => {
    expect(formatBitrate(1000)).toBe('1 kbps')
  })

  it('should format mbps', () => {
    expect(formatBitrate(1000000)).toBe('1 Mbps')
  })

  it('should use custom decimal places', () => {
    expect(formatBitrate(1500, 2)).toBe('1.5 kbps')
  })
})

describe('formatCallTime', () => {
  it('should format as Just now for recent times', () => {
    const now = new Date()
    const callTime = new Date(now.getTime() - 30 * 1000) // 30 seconds ago
    const result = formatCallTime(callTime, now)
    expect(result).toBe('Just now')
  })

  it('should format as minutes ago', () => {
    const now = new Date()
    const callTime = new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes ago
    const result = formatCallTime(callTime, now)
    expect(result).toBe('5 minutes ago')
  })

  it('should format as hours ago', () => {
    const now = new Date()
    const callTime = new Date(now.getTime() - 14 * 60 * 60 * 1000) // 14 hours ago
    const result = formatCallTime(callTime, now)
    expect(result).toBe('14 hours ago')
  })
})

describe('formatDateTime', () => {
  it('should format date time', () => {
    const date = new Date('2024-01-15T14:30:00')
    const result = formatDateTime(date)
    expect(result).toContain('2024')
    expect(result).toContain('15')
    expect(result).toContain('30')
  })
})

describe('formatIsoTimestamp', () => {
  it('should format ISO timestamp', () => {
    const date = new Date('2024-01-15T14:30:00.000Z')
    const result = formatIsoTimestamp(date)
    expect(result).toBe('2024-01-15T14:30:00.000Z')
  })
})

describe('formatSipStatusCode', () => {
  it('should format 200 OK', () => {
    expect(formatSipStatusCode(200)).toBe('OK')
  })

  it('should format 404 Not Found', () => {
    expect(formatSipStatusCode(404)).toBe('Not Found')
  })

  it('should format 488 Not Acceptable', () => {
    expect(formatSipStatusCode(488)).toBe('Not Acceptable Here')
  })

  it('should use custom reason phrase', () => {
    expect(formatSipStatusCode(180, 'Ringing')).toBe('Ringing: Ringing')
  })

  it('should return empty string for null statusCode', () => {
    expect(formatSipStatusCode(null as any)).toBe('')
  })

  it('should return empty string for undefined statusCode', () => {
    expect(formatSipStatusCode(undefined as any)).toBe('')
  })
})
