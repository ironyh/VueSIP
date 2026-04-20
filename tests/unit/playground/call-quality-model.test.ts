import { describe, expect, it } from 'vitest'
import {
  calculateMos,
  getNetworkBanner,
  getQualityVerdict,
} from '../../../playground/demos/CallQuality/qualityModel'

describe('CallQuality qualityModel', () => {
  it('keeps healthy calls in the excellent band', () => {
    const mos = calculateMos({ jitter: 8, loss: 0.2, rtt: 55 })
    expect(mos).toBeGreaterThanOrEqual(4)
    expect(getQualityVerdict(mos)).toEqual({ tier: 'ok', label: 'Excellent' })
    expect(getNetworkBanner({ jitter: 8, loss: 0.2, rtt: 55 }).severity).toBe('ok')
  })

  it('marks borderline links as acceptable and actionable', () => {
    const mos = calculateMos({ jitter: 34, loss: 1.4, rtt: 190 })
    expect(mos).toBeGreaterThanOrEqual(3.4)
    expect(getQualityVerdict(mos)).toEqual({ tier: 'warn', label: 'Acceptable' })
    expect(getNetworkBanner({ jitter: 34, loss: 1.4, rtt: 190 })).toMatchObject({
      severity: 'warn',
      title: 'Network is unstable',
    })
  })

  it('flags severe impairment as degraded', () => {
    const mos = calculateMos({ jitter: 72, loss: 4.2, rtt: 340 })
    expect(getQualityVerdict(mos)).toEqual({ tier: 'bad', label: 'Degraded' })
    expect(getNetworkBanner({ jitter: 72, loss: 4.2, rtt: 340 })).toMatchObject({
      severity: 'bad',
      title: 'Audio may drop out',
    })
  })
})
