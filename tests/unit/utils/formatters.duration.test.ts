/**
 * Tests for duration formatting utilities
 */

import { describe, it, expect } from 'vitest'
import { formatDuration, formatDurationShort } from '@/utils/formatters'

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
