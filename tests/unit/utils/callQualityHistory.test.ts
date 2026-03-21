import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  startCallQualityTracking,
  recordQualitySnapshot,
  stopCallQualityTracking,
  formatQualityLevel,
  getQualityLevelColor,
} from '@/utils/callQualityHistory'

describe('callQualityHistory', () => {
  // Mock Date.now to ensure consistent timestamps for distribution tests
  let mockTime = 1000000
  beforeEach(() => {
    mockTime = 1000000
    vi.spyOn(Date, 'now').mockImplementation(() => mockTime)
  })

  describe('startCallQualityTracking', () => {
    it('should initialize tracking for a new call', () => {
      startCallQualityTracking('call-123', 'outbound', 'sip:100@pbx.example.com')

      recordQualitySnapshot(
        { rtt: 50, jitter: 10, packetLossPercent: 0.5, bitrateKbps: 64, codec: 'opus' },
        'good'
      )

      const summary = stopCallQualityTracking()
      expect(summary).not.toBeNull()
      expect(summary?.callId).toBe('call-123')
      expect(summary?.direction).toBe('outbound')
      expect(summary?.remoteUri).toBe('sip:100@pbx.example.com')
      expect(summary?.sampleCount).toBe(1)
    })

    it('should handle inbound calls', () => {
      startCallQualityTracking('call-456', 'inbound', 'sip:200@pbx.example.com')
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 50, jitter: 10, packetLossPercent: 0.5, bitrateKbps: 64, codec: 'opus' },
        'good'
      )

      const summary = stopCallQualityTracking()
      expect(summary?.direction).toBe('inbound')
      expect(summary?.callId).toBe('call-456')
    })
  })

  describe('recordQualitySnapshot', () => {
    it('should buffer quality records during active call', () => {
      startCallQualityTracking('call-789', 'outbound', 'sip:300@pbx.example.com')
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 50, jitter: 10, packetLossPercent: 0.5, bitrateKbps: 64, codec: 'opus' },
        'good'
      )
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 60, jitter: 12, packetLossPercent: 1.0, bitrateKbps: 64, codec: 'opus' },
        'fair'
      )

      const summary = stopCallQualityTracking()
      expect(summary?.sampleCount).toBe(2)
      expect(summary?.avgRtt).toBe(55)
      expect(summary?.maxRtt).toBe(60)
      expect(summary?.avgJitter).toBe(11)
    })

    it('should handle null values gracefully', () => {
      startCallQualityTracking('call-null', 'outbound', 'sip:test@pbx.example.com')
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null, codec: null },
        'unknown'
      )

      const summary = stopCallQualityTracking()
      expect(summary?.avgRtt).toBeNull()
      expect(summary?.avgJitter).toBeNull()
    })

    it('should not record if no call is active', () => {
      // Without starting a call, recording should be silent no-op
      recordQualitySnapshot(
        { rtt: 50, jitter: 10, packetLossPercent: 0.5, bitrateKbps: 64, codec: 'opus' },
        'good'
      )

      const summary = stopCallQualityTracking()
      expect(summary).toBeNull()
    })
  })

  describe('stopCallQualityTracking', () => {
    it('should return null if no call was being tracked', () => {
      const summary = stopCallQualityTracking()
      expect(summary).toBeNull()
    })

    it('should return null if no records were collected', () => {
      startCallQualityTracking('call-empty', 'outbound', 'sip:test@pbx.example.com')
      const summary = stopCallQualityTracking()
      expect(summary).toBeNull()
    })

    it('should calculate quality distribution correctly', () => {
      startCallQualityTracking('call-dist', 'outbound', 'sip:dist@pbx.example.com')

      // Record with different timestamps (1 second apart)
      // Need 4 records to get 3 periods counted (last record doesn't count without a subsequent record)
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 50, jitter: 10, packetLossPercent: 0.5, bitrateKbps: 64, codec: 'opus' },
        'excellent'
      )
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 50, jitter: 10, packetLossPercent: 0.5, bitrateKbps: 64, codec: 'opus' },
        'good'
      )
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 200, jitter: 50, packetLossPercent: 5, bitrateKbps: 32, codec: 'pcmu' },
        'poor'
      )
      // Add one more to complete the poor period counting
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 200, jitter: 50, packetLossPercent: 5, bitrateKbps: 32, codec: 'pcmu' },
        'poor'
      )

      const summary = stopCallQualityTracking()

      expect(summary?.qualityDistribution.excellent).toBe(1) // 1 second at excellent
      expect(summary?.qualityDistribution.good).toBe(1) // 1 second at good
      expect(summary?.qualityDistribution.poor).toBe(1) // 1 second at poor
    })

    it('should determine overall quality as excellent when >50% excellent', () => {
      startCallQualityTracking('call-quality', 'outbound', 'sip:quality@pbx.example.com')

      // More than 50% excellent (4 excellent, 1 good, plus one more to complete periods)
      // The distribution counting works such that we need an extra record to count the last period
      for (let i = 0; i < 4; i++) {
        mockTime += 1000
        recordQualitySnapshot(
          { rtt: 50, jitter: 10, packetLossPercent: 0.5, bitrateKbps: 64, codec: 'opus' },
          'excellent'
        )
      }
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 100, jitter: 20, packetLossPercent: 1, bitrateKbps: 64, codec: 'opus' },
        'good'
      )
      // Add one more to complete the counting
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 100, jitter: 20, packetLossPercent: 1, bitrateKbps: 64, codec: 'opus' },
        'good'
      )

      const summary = stopCallQualityTracking()
      // 4 excellent out of 6 = 66% > 50%
      expect(summary?.overallQuality).toBe('excellent')
    })

    it('should mark as poor if >10% poor quality', () => {
      startCallQualityTracking('call-poor', 'outbound', 'sip:poor@pbx.example.com')

      // Need 6 records: 4 good, then poor, then one more to count the poor period
      // (the last record's quality period isn't counted unless there's a subsequent record)
      // So: good(1s), good(1s), good(1s), good(1s), poor(1s), any(1s)
      for (let i = 0; i < 4; i++) {
        mockTime += 1000
        recordQualitySnapshot(
          { rtt: 50, jitter: 10, packetLossPercent: 0, bitrateKbps: 64, codec: 'opus' },
          'good'
        )
      }
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 500, jitter: 100, packetLossPercent: 20, bitrateKbps: 8, codec: 'pcmu' },
        'poor'
      )
      // Add one more to count the poor period
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 500, jitter: 100, packetLossPercent: 20, bitrateKbps: 8, codec: 'pcmu' },
        'poor'
      )

      const summary = stopCallQualityTracking()
      expect(summary?.hadQualityIssues).toBe(true)
      // 4 good, 2 poor = 2/6 = 33% > 10%
      expect(summary?.overallQuality).toBe('poor')
    })

    it('should get primary codec correctly', () => {
      startCallQualityTracking('call-codec', 'outbound', 'sip:codec@pbx.example.com')

      for (let i = 0; i < 3; i++) {
        mockTime += 1000
        recordQualitySnapshot(
          { rtt: 50, jitter: 10, packetLossPercent: 0, bitrateKbps: 64, codec: 'opus' },
          'good'
        )
      }
      mockTime += 1000
      recordQualitySnapshot(
        { rtt: 50, jitter: 10, packetLossPercent: 0, bitrateKbps: 64, codec: 'pcmu' },
        'good'
      )

      const summary = stopCallQualityTracking()
      expect(summary?.codec).toBe('opus')
    })
  })

  describe('formatQualityLevel', () => {
    it('should return Swedish labels', () => {
      expect(formatQualityLevel('excellent')).toBe('Utmärkt')
      expect(formatQualityLevel('good')).toBe('Bra')
      expect(formatQualityLevel('fair')).toBe('Acceptabel')
      expect(formatQualityLevel('poor')).toBe('Dålig')
      expect(formatQualityLevel('unknown')).toBe('Okänd')
    })
  })

  describe('getQualityLevelColor', () => {
    it('should return correct colors', () => {
      expect(getQualityLevelColor('excellent')).toBe('#22c55e')
      expect(getQualityLevelColor('good')).toBe('#84cc16')
      expect(getQualityLevelColor('fair')).toBe('#eab308')
      expect(getQualityLevelColor('poor')).toBe('#ef4444')
      expect(getQualityLevelColor('unknown')).toBe('#6b7280')
    })
  })
})
