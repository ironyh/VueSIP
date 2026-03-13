/**
 * Tests for duration formatting utilities
 */

import { describe, it, expect } from 'vitest'
import { formatDuration, formatDurationShort, formatDurationCompact } from '@/utils/formatters'

describe('formatDuration', () => {
  it('should format zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })

  it('should format seconds only', () => {
    expect(formatDuration(65)).toBe('00:01:05')
  })

  it('should format minutes and seconds', () => {
    expect(formatDuration(3665)).toBe('01:01:05')
  })

  it('should handle negative values', () => {
    expect(formatDuration(-10)).toBe('00:00:00')
  })

  it('should handle Infinity', () => {
    expect(formatDuration(Infinity)).toBe('00:00:00')
  })

  it('should handle NaN', () => {
    expect(formatDuration(NaN)).toBe('00:00:00')
  })
})

describe('formatDurationShort', () => {
  it('should format seconds only', () => {
    expect(formatDurationShort(30)).toBe('30s')
  })

  it('should format minutes and seconds', () => {
    expect(formatDurationShort(65)).toBe('1m 5s')
  })

  it('should format hours and minutes', () => {
    expect(formatDurationShort(3665)).toBe('1h 1m')
  })

  it('should format zero as 0s', () => {
    expect(formatDurationShort(0)).toBe('0s')
  })

  it('should limit to 2 units', () => {
    expect(formatDurationShort(90061)).toBe('25h 1m')
  })

  it('should handle negative values', () => {
    expect(formatDurationShort(-10)).toBe('0s')
  })
})

describe('formatDurationCompact', () => {
  it('should format zero as 0:00', () => {
    expect(formatDurationCompact(0)).toBe('0:00')
  })

  it('should format seconds only without leading zero on minutes', () => {
    expect(formatDurationCompact(5)).toBe('0:05')
    expect(formatDurationCompact(30)).toBe('0:30')
    expect(formatDurationCompact(59)).toBe('0:59')
  })

  it('should format minutes and seconds', () => {
    expect(formatDurationCompact(65)).toBe('1:05')
    expect(formatDurationCompact(600)).toBe('10:00')
    expect(formatDurationCompact(3599)).toBe('59:59')
  })

  it('should format hours with full HH:MM:SS', () => {
    expect(formatDurationCompact(3600)).toBe('1:00:00')
    expect(formatDurationCompact(3665)).toBe('1:01:05')
    expect(formatDurationCompact(7200)).toBe('2:00:00')
    expect(formatDurationCompact(86399)).toBe('23:59:59')
  })

  it('should handle negative values', () => {
    expect(formatDurationCompact(-10)).toBe('0:00')
  })

  it('should handle Infinity', () => {
    expect(formatDurationCompact(Infinity)).toBe('0:00')
  })

  it('should handle NaN', () => {
    expect(formatDurationCompact(NaN)).toBe('0:00')
  })
})
