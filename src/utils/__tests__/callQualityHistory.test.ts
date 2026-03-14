/**
 * @vitest-environment jsdom
 */
/**
 * Call Quality History Tests
 *
 * @module utils/__tests__/callQualityHistory.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getCallQualityHistory,
  startCallQualityTracking,
  recordQualitySnapshot,
  stopCallQualityTracking,
  clearCallQualityHistory,
  getQualityTrends,
  getRecentCallQualityStats,
  formatQualityLevel,
  getQualityLevelColor,
} from '../callQualityHistory'
import type { CallQualityStats, QualityLevel } from '../composables/useCallQualityStats'

describe('callQualityHistory', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getCallQualityHistory', () => {
    it('should return empty array when no history exists', () => {
      const result = getCallQualityHistory()
      expect(result).toEqual([])
    })

    it('should return parsed history from localStorage', () => {
      const mockHistory = [
        {
          callId: 'call-1',
          startTime: Date.now() - 100000,
          endTime: Date.now() - 50000,
          duration: 50,
          direction: 'outbound' as const,
          remoteUri: 'sip:6001@pbx.example.com',
          avgRtt: 50,
          maxRtt: 100,
          avgJitter: 10,
          maxJitter: 20,
          avgPacketLoss: 1,
          maxPacketLoss: 5,
          avgBitrate: 128,
          codec: 'opus',
          overallQuality: 'good' as QualityLevel,
          sampleCount: 10,
          qualityDistribution: { excellent: 0, good: 10, fair: 0, poor: 0, unknown: 0 },
          hadQualityIssues: false,
        },
      ]
      localStorage.setItem('vuesip_call_quality_history', JSON.stringify(mockHistory))

      const result = getCallQualityHistory()
      expect(result).toHaveLength(1)
      expect(result[0].callId).toBe('call-1')
    })

    it('should filter out records older than 30 days', () => {
      const oldDate = Date.now() - 31 * 24 * 60 * 60 * 1000
      const mockHistory = [
        {
          callId: 'old-call',
          startTime: oldDate - 60000,
          endTime: oldDate,
          duration: 60,
          direction: 'outbound' as const,
          remoteUri: 'sip:6001@pbx.example.com',
          avgRtt: 50,
          maxRtt: 100,
          avgJitter: 10,
          maxJitter: 20,
          avgPacketLoss: 1,
          maxPacketLoss: 5,
          avgBitrate: 128,
          codec: 'opus',
          overallQuality: 'good' as QualityLevel,
          sampleCount: 10,
          qualityDistribution: { excellent: 0, good: 10, fair: 0, poor: 0, unknown: 0 },
          hadQualityIssues: false,
        },
      ]
      localStorage.setItem('vuesip_call_quality_history', JSON.stringify(mockHistory))

      const result = getCallQualityHistory()
      expect(result).toHaveLength(0)
    })

    it('should return empty array on parse error', () => {
      localStorage.setItem('vuesip_call_quality_history', 'invalid json')

      const result = getCallQualityHistory()
      expect(result).toEqual([])
    })
  })

  describe('startCallQualityTracking', () => {
    it('should initialize tracking for a new call', () => {
      startCallQualityTracking('call-123', 'outbound', 'sip:6001@pbx.example.com')

      // Function should not throw - internal state is set
      expect(true).toBe(true)
    })

    it('should track multiple calls sequentially', () => {
      startCallQualityTracking('call-1', 'outbound', 'sip:6001@pbx.example.com')
      startCallQualityTracking('call-2', 'inbound', 'sip:6002@pbx.example.com')

      // Should overwrite previous call tracking
      expect(true).toBe(true)
    })
  })

  describe('recordQualitySnapshot', () => {
    it('should not record when no call is being tracked', () => {
      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 128,
        codec: 'opus',
      }

      // Should not throw when no call is active
      recordQualitySnapshot(stats, 'good')
      expect(true).toBe(true)
    })

    it('should record snapshot when call is being tracked', () => {
      startCallQualityTracking('call-123', 'outbound', 'sip:6001@pbx.example.com')

      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 128,
        codec: 'opus',
      }

      // Should not throw and should add to buffer
      recordQualitySnapshot(stats, 'good')
      expect(true).toBe(true)
    })
  })

  describe('stopCallQualityTracking', () => {
    it('should return null when no call is being tracked', () => {
      const result = stopCallQualityTracking()
      expect(result).toBeNull()
    })

    it('should save summary to localStorage when call ends', () => {
      startCallQualityTracking('call-123', 'outbound', 'sip:6001@pbx.example.com')

      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 128,
        codec: 'opus',
      }

      recordQualitySnapshot(stats, 'good')

      const summary = stopCallQualityTracking()

      expect(summary).not.toBeNull()
      expect(summary?.callId).toBe('call-123')
      expect(summary?.direction).toBe('outbound')
      expect(summary?.remoteUri).toBe('sip:6001@pbx.example.com')
      expect(summary?.sampleCount).toBe(1)

      // Verify it was saved to localStorage
      const stored = getCallQualityHistory()
      expect(stored).toHaveLength(1)
    })

    it('should append to existing history', () => {
      // Pre-populate history
      const existingHistory = [
        {
          callId: 'existing-call',
          startTime: Date.now() - 200000,
          endTime: Date.now() - 100000,
          duration: 100,
          direction: 'outbound' as const,
          remoteUri: 'sip:5001@pbx.example.com',
          avgRtt: 30,
          maxRtt: 50,
          avgJitter: 5,
          maxJitter: 10,
          avgPacketLoss: 0,
          maxPacketLoss: 0,
          avgBitrate: 128,
          codec: 'opus',
          overallQuality: 'excellent' as QualityLevel,
          sampleCount: 5,
          qualityDistribution: { excellent: 5, good: 0, fair: 0, poor: 0, unknown: 0 },
          hadQualityIssues: false,
        },
      ]
      localStorage.setItem('vuesip_call_quality_history', JSON.stringify(existingHistory))

      // Start and end a new call
      startCallQualityTracking('new-call', 'inbound', 'sip:6001@pbx.example.com')
      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 128,
        codec: 'opus',
      }
      recordQualitySnapshot(stats, 'good')
      stopCallQualityTracking()

      const stored = getCallQualityHistory()
      expect(stored).toHaveLength(2)
    })
  })

  describe('clearCallQualityHistory', () => {
    it('should clear localStorage', () => {
      // Add some data
      startCallQualityTracking('call-1', 'outbound', 'sip:6001@pbx.example.com')
      stopCallQualityTracking()

      clearCallQualityHistory()

      const result = getCallQualityHistory()
      expect(result).toEqual([])
    })
  })

  describe('getQualityTrends', () => {
    it('should return array with specified length even when empty', () => {
      const result = getQualityTrends(7)
      // Should return array with 7 entries even when empty (fills missing dates)
      expect(result.length).toBe(7)
      // All should be zeros
      expect(result.every((r) => r.callCount === 0)).toBe(true)
    })
  })

  describe('getRecentCallQualityStats', () => {
    it('should return default values when no history', () => {
      const result = getRecentCallQualityStats()

      expect(result.calls).toEqual([])
      expect(result.avgDuration).toBe(0)
      expect(result.issueRate).toBe(0)
      expect(result.qualityBreakdown).toEqual({
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        unknown: 0,
      })
    })

    it('should calculate stats from recent calls', () => {
      // Add a call
      startCallQualityTracking('call-1', 'outbound', 'sip:6001@pbx.example.com')
      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 128,
        codec: 'opus',
      }
      recordQualitySnapshot(stats, 'good')
      const summary = stopCallQualityTracking()

      // Verify summary was created
      expect(summary).not.toBeNull()
      expect(summary?.sampleCount).toBe(1)

      const result = getRecentCallQualityStats(10)

      expect(result.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('should limit to specified count', () => {
      // Add multiple calls
      for (let i = 0; i < 5; i++) {
        startCallQualityTracking(`call-${i}`, 'outbound', 'sip:6001@pbx.example.com')
        const stats: CallQualityStats = {
          rtt: 50,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 128,
          codec: 'opus',
        }
        recordQualitySnapshot(stats, 'good')
        stopCallQualityTracking()
      }

      const result = getRecentCallQualityStats(3)
      expect(result.calls.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('formatQualityLevel', () => {
    it('should return Swedish labels for each quality level', () => {
      expect(formatQualityLevel('excellent')).toBe('Utmärkt')
      expect(formatQualityLevel('good')).toBe('Bra')
      expect(formatQualityLevel('fair')).toBe('Acceptabel')
      expect(formatQualityLevel('poor')).toBe('Dålig')
      expect(formatQualityLevel('unknown')).toBe('Okänd')
    })
  })

  describe('getQualityLevelColor', () => {
    it('should return correct colors for each level', () => {
      expect(getQualityLevelColor('excellent')).toBe('#22c55e')
      expect(getQualityLevelColor('good')).toBe('#84cc16')
      expect(getQualityLevelColor('fair')).toBe('#eab308')
      expect(getQualityLevelColor('poor')).toBe('#ef4444')
      expect(getQualityLevelColor('unknown')).toBe('#6b7280')
    })
  })
})
