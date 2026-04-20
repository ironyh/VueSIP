import { describe, expect, it } from 'vitest'
import {
  formatCompact,
  formatHHMMSS,
  formatHuman,
  formatMMSS,
} from '../../../playground/demos/CallTimer/formatters'

describe('CallTimer formatters', () => {
  it('formats zero values consistently across all displays', () => {
    expect(formatMMSS(0)).toBe('0:00')
    expect(formatHHMMSS(0)).toBe('0:00:00')
    expect(formatHuman(0)).toBe('0 seconds')
    expect(formatCompact(0)).toBe('0s')
  })

  it('formats sub-hour durations for compact timer cards', () => {
    expect(formatMMSS(65)).toBe('1:05')
    expect(formatHHMMSS(65)).toBe('0:01:05')
    expect(formatHuman(65)).toBe('1m 5s')
    expect(formatCompact(65)).toBe('1m 5s')
  })

  it('formats hour-scale durations without losing minute boundaries', () => {
    expect(formatMMSS(3661)).toBe('61:01')
    expect(formatHHMMSS(3661)).toBe('1:01:01')
    expect(formatHuman(3661)).toBe('1h 1m 1s')
    expect(formatCompact(3661)).toBe('1h 1m')
  })
})
