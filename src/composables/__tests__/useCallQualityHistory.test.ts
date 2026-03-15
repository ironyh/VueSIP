/**
 * useCallQualityHistory Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCallQualityHistory } from '../useCallQualityHistory'
import type { CallQualityStats, QualityLevel } from '../useCallQualityStats'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useCallQualityHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('initialization', () => {
    it('should start with no active call', () => {
      const { isTracking, activeCallId } = useCallQualityHistory()

      expect(isTracking.value).toBe(false)
      expect(activeCallId.value).toBeNull()
    })

    it('should load existing records from localStorage', () => {
      const existingRecords = [
        {
          id: 'test-1',
          startTime: Date.now() - 10000,
          endTime: Date.now() - 5000,
          durationMs: 5000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: 50,
            maxRtt: 100,
            avgRtt: 75,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 50, good: 50, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingRecords))

      const { getHistory } = useCallQualityHistory()
      const history = getHistory()

      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('test-1')
    })

    it('should filter out expired records', () => {
      const oldRecord = {
        id: 'old-1',
        startTime: Date.now() - 40 * 24 * 60 * 60 * 1000, // 40 days ago
        endTime: Date.now() - 40 * 24 * 60 * 60 * 1000,
        durationMs: 1000,
        overallQuality: 'poor' as QualityLevel,
        alertCount: 0,
        aggregates: {
          minRtt: null,
          maxRtt: null,
          avgRtt: null,
          minJitter: null,
          maxJitter: null,
          avgJitter: null,
          minPacketLoss: null,
          maxPacketLoss: null,
          avgPacketLoss: null,
          qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 100, unknown: 0 },
        },
        snapshots: [],
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify([oldRecord]))

      const { getHistory } = useCallQualityHistory()

      expect(getHistory()).toHaveLength(0)
    })
  })

  describe('call tracking lifecycle', () => {
    it('should start tracking a new call', () => {
      const { startCall, isTracking, activeCallId } = useCallQualityHistory()

      startCall('call-123', '+46123456789', 'outgoing')

      expect(isTracking.value).toBe(true)
      expect(activeCallId.value).toBe('call-123')
    })

    it('should end current call before starting new one', () => {
      const { startCall, endCall, getHistory } = useCallQualityHistory()

      startCall('call-1')
      endCall()

      startCall('call-2')
      endCall()

      expect(getHistory()).toHaveLength(2)
    })

    it('should end call and create record', () => {
      const { startCall, endCall, getHistory, isTracking } = useCallQualityHistory()

      startCall('call-abc', '+46701234567', 'incoming')
      const record = endCall()

      expect(record).not.toBeNull()
      expect(record?.id).toBe('call-abc')
      expect(record?.remoteIdentity).toBe('+46701234567')
      expect(record?.direction).toBe('incoming')
      expect(record?.durationMs).toBeGreaterThanOrEqual(0)
      expect(isTracking.value).toBe(false)
      expect(getHistory()).toHaveLength(1)
    })

    it('should return null when ending without active call', () => {
      const { endCall } = useCallQualityHistory()

      const record = endCall()

      expect(record).toBeNull()
    })
  })

  describe('snapshot recording', () => {
    it('should record snapshots during active call', () => {
      const { startCall, recordSnapshot, endCall } = useCallQualityHistory({
        snapshotIntervalMs: 0, // No throttling for tests
      })

      const stats: CallQualityStats = {
        rtt: 100,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 64,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 10,
        lastUpdated: new Date(),
      }

      startCall('call-test')
      recordSnapshot(stats, 'good')
      const record = endCall()

      expect(record?.snapshots).toHaveLength(1)
      expect(record?.snapshots[0].rtt).toBe(100)
      expect(record?.snapshots[0].qualityLevel).toBe('good')
    })

    it('should throttle snapshots by interval', () => {
      const { startCall, recordSnapshot, endCall } = useCallQualityHistory({
        snapshotIntervalMs: 1000,
      })

      const stats: CallQualityStats = {
        rtt: 100,
        jitter: null,
        packetLossPercent: null,
        bitrateKbps: null,
        codec: null,
        packetsReceived: null,
        packetsLost: null,
        lastUpdated: new Date(),
      }

      startCall('call-test')
      recordSnapshot(stats, 'good')
      recordSnapshot(stats, 'good') // Should be throttled
      recordSnapshot(stats, 'good') // Should be throttled
      const record = endCall()

      expect(record?.snapshots).toHaveLength(1)
    })

    it('should not record snapshots without active call', () => {
      const { recordSnapshot, getHistory } = useCallQualityHistory()

      const stats: CallQualityStats = {
        rtt: 100,
        jitter: null,
        packetLossPercent: null,
        bitrateKbps: null,
        codec: null,
        packetsReceived: null,
        packetsLost: null,
        lastUpdated: new Date(),
      }

      recordSnapshot(stats, 'good')

      expect(getHistory()).toHaveLength(0)
    })

    it('should record multiple snapshots', () => {
      const { startCall, recordSnapshot, endCall } = useCallQualityHistory({
        snapshotIntervalMs: 0,
      })

      startCall('call-test')

      for (let i = 0; i < 5; i++) {
        recordSnapshot(
          {
            rtt: 50 + i * 10,
            jitter: 5 + i,
            packetLossPercent: i * 0.5,
            bitrateKbps: 64,
            codec: 'opus',
            packetsReceived: 100 + i * 10,
            packetsLost: i,
            lastUpdated: new Date(),
          },
          i < 2 ? 'excellent' : 'good'
        )
      }

      const record = endCall()

      expect(record?.snapshots).toHaveLength(5)
      expect(record?.aggregates.avgRtt).toBe(70) // (50+60+70+80+90)/5
    })
  })

  describe('alert counting', () => {
    it('should count alerts during call', () => {
      const { startCall, recordAlert, endCall } = useCallQualityHistory()

      startCall('call-test')
      recordAlert()
      recordAlert()
      recordAlert()
      const record = endCall()

      expect(record?.alertCount).toBe(3)
    })

    it('should not record alerts without active call', () => {
      const { recordAlert, getHistory } = useCallQualityHistory()

      recordAlert()
      recordAlert()

      expect(getHistory()).toHaveLength(0)
    })
  })

  describe('aggregate calculation', () => {
    it('should calculate correct aggregates from snapshots', () => {
      const { startCall, recordSnapshot, endCall } = useCallQualityHistory({
        snapshotIntervalMs: 0,
      })

      startCall('call-test')

      recordSnapshot(
        {
          rtt: 50,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 100,
          packetsLost: 1,
          lastUpdated: new Date(),
        },
        'excellent'
      )

      recordSnapshot(
        {
          rtt: 100,
          jitter: 20,
          packetLossPercent: 2,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 200,
          packetsLost: 4,
          lastUpdated: new Date(),
        },
        'good'
      )

      recordSnapshot(
        {
          rtt: 150,
          jitter: 30,
          packetLossPercent: 3,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 300,
          packetsLost: 9,
          lastUpdated: new Date(),
        },
        'fair'
      )

      const record = endCall()

      expect(record?.aggregates.minRtt).toBe(50)
      expect(record?.aggregates.maxRtt).toBe(150)
      expect(record?.aggregates.avgRtt).toBe(100)
      expect(record?.aggregates.minJitter).toBe(10)
      expect(record?.aggregates.maxJitter).toBe(30)
      expect(record?.aggregates.avgJitter).toBe(20)
      expect(record?.aggregates.minPacketLoss).toBe(1)
      expect(record?.aggregates.maxPacketLoss).toBe(3)
      expect(record?.aggregates.avgPacketLoss).toBe(2)
    })

    it('should determine overall quality based on distribution', () => {
      const { startCall, recordSnapshot, endCall } = useCallQualityHistory({
        snapshotIntervalMs: 0,
      })

      startCall('call-excellent')
      for (let i = 0; i < 10; i++) {
        recordSnapshot(
          {
            rtt: 50,
            jitter: 5,
            packetLossPercent: 0.1,
            bitrateKbps: 64,
            codec: 'opus',
            packetsReceived: 100,
            packetsLost: 0,
            lastUpdated: new Date(),
          },
          'excellent'
        )
      }
      expect(endCall()?.overallQuality).toBe('excellent')

      startCall('call-poor')
      for (let i = 0; i < 10; i++) {
        recordSnapshot(
          {
            rtt: 800,
            jitter: 100,
            packetLossPercent: 10,
            bitrateKbps: 32,
            codec: 'opus',
            packetsReceived: 100,
            packetsLost: 10,
            lastUpdated: new Date(),
          },
          'poor'
        )
      }
      expect(endCall()?.overallQuality).toBe('poor')
    })
  })

  describe('history filtering', () => {
    it('should filter by date range', () => {
      const records = [
        {
          id: 'call-1',
          startTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
          endTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
          durationMs: 1000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
        {
          id: 'call-2',
          startTime: Date.now() - 5 * 24 * 60 * 60 * 1000,
          endTime: Date.now() - 5 * 24 * 60 * 60 * 1000,
          durationMs: 1000,
          overallQuality: 'poor' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 100, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { getHistory } = useCallQualityHistory()
      const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const filtered = getHistory({ fromDate })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('call-1')
    })

    it('should filter by minimum quality', () => {
      const records = [
        {
          id: 'excellent-call',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 1000,
          overallQuality: 'excellent' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 100, good: 0, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
        {
          id: 'poor-call',
          startTime: Date.now() - 1000,
          endTime: Date.now() - 1000,
          durationMs: 1000,
          overallQuality: 'poor' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 100, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { getHistory } = useCallQualityHistory()
      const filtered = getHistory({ minQuality: 'good' })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('excellent-call')
    })

    it('should limit results', () => {
      const records = Array.from({ length: 20 }, (_, i) => ({
        id: `call-${i}`,
        startTime: Date.now() - i * 1000,
        endTime: Date.now() - i * 1000,
        durationMs: 1000,
        overallQuality: 'good' as QualityLevel,
        alertCount: 0,
        aggregates: {
          minRtt: null,
          maxRtt: null,
          avgRtt: null,
          minJitter: null,
          maxJitter: null,
          avgJitter: null,
          minPacketLoss: null,
          maxPacketLoss: null,
          avgPacketLoss: null,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
        },
        snapshots: [],
      }))

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { getHistory } = useCallQualityHistory()
      const limited = getHistory({ limit: 5 })

      expect(limited).toHaveLength(5)
    })
  })

  describe('trends', () => {
    it('should generate trends for specified days', () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const records = [
        {
          id: 'today-good',
          startTime: today.setHours(12, 0, 0, 0),
          endTime: today.setHours(12, 5, 0, 0),
          durationMs: 300000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
        {
          id: 'yesterday-excellent',
          startTime: yesterday.setHours(12, 0, 0, 0),
          endTime: yesterday.setHours(12, 5, 0, 0),
          durationMs: 300000,
          overallQuality: 'excellent' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 100, good: 0, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { getTrends } = useCallQualityHistory()
      const trends = getTrends(2)

      expect(trends.labels).toHaveLength(2)
      expect(trends.scores).toHaveLength(2)
      expect(trends.callCounts).toHaveLength(2)
      expect(trends.callCounts.reduce((a, b) => a + b, 0)).toBe(2)
    })
  })

  describe('aggregate stats', () => {
    it('should calculate aggregate stats for period', () => {
      const records = [
        {
          id: 'call-1',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 60000,
          overallQuality: 'excellent' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 100, good: 0, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
        {
          id: 'call-2',
          startTime: Date.now() - 1000,
          endTime: Date.now() - 1000,
          durationMs: 120000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { getAggregateStats } = useCallQualityHistory()
      const stats = getAggregateStats(7)

      expect(stats.totalCalls).toBe(2)
      expect(stats.avgQualityScore).toBe(90) // (100 + 80) / 2
      expect(stats.avgDurationMs).toBe(90000) // (60000 + 120000) / 2
    })

    it('should return zeros when no records', () => {
      const { getAggregateStats } = useCallQualityHistory()
      const stats = getAggregateStats(7)

      expect(stats.totalCalls).toBe(0)
      expect(stats.avgQualityScore).toBe(0)
      expect(stats.avgDurationMs).toBe(0)
    })
  })

  describe('export/import', () => {
    it('should export history as JSON', () => {
      const records = [
        {
          id: 'call-1',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 1000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { exportHistory } = useCallQualityHistory()
      const json = exportHistory()

      expect(JSON.parse(json)).toEqual(records)
    })

    it('should import history from JSON', () => {
      const newRecords = [
        {
          id: 'imported-1',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 1000,
          overallQuality: 'excellent' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 100, good: 0, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      const { importHistory, getHistory } = useCallQualityHistory()
      const result = importHistory(JSON.stringify(newRecords))

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(getHistory()).toHaveLength(1)
    })

    it('should dedupe on import', () => {
      const existing = [
        {
          id: 'call-1',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 1000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existing))

      const { importHistory, getHistory } = useCallQualityHistory()
      const result = importHistory(JSON.stringify(existing))

      expect(result.imported).toBe(1)
      expect(getHistory()).toHaveLength(1) // Deduped
    })

    it('should handle invalid import JSON', () => {
      const { importHistory } = useCallQualityHistory()
      const result = importHistory('not valid json')

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle non-array import', () => {
      const { importHistory } = useCallQualityHistory()
      const result = importHistory('{"id": "not-an-array"}')

      expect(result.success).toBe(false)
      expect(result.imported).toBe(0)
    })
  })

  describe('deletion', () => {
    it('should clear all history', () => {
      const records = [
        {
          id: 'call-1',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 1000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { clearHistory, getHistory } = useCallQualityHistory()
      clearHistory()

      expect(getHistory()).toHaveLength(0)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })

    it('should delete specific record', () => {
      const records = [
        {
          id: 'call-1',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 1000,
          overallQuality: 'good' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
        {
          id: 'call-2',
          startTime: Date.now() - 1000,
          endTime: Date.now() - 1000,
          durationMs: 1000,
          overallQuality: 'excellent' as QualityLevel,
          alertCount: 0,
          aggregates: {
            minRtt: null,
            maxRtt: null,
            avgRtt: null,
            minJitter: null,
            maxJitter: null,
            avgJitter: null,
            minPacketLoss: null,
            maxPacketLoss: null,
            avgPacketLoss: null,
            qualityDistribution: { excellent: 100, good: 0, fair: 0, poor: 0, unknown: 0 },
          },
          snapshots: [],
        },
      ]

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { deleteRecord, getHistory } = useCallQualityHistory()
      const deleted = deleteRecord('call-1')

      expect(deleted).toBe(true)
      expect(getHistory()).toHaveLength(1)
      expect(getHistory()[0].id).toBe('call-2')
    })

    it('should return false when deleting non-existent record', () => {
      const { deleteRecord } = useCallQualityHistory()
      const deleted = deleteRecord('non-existent')

      expect(deleted).toBe(false)
    })
  })

  describe('storage options', () => {
    it('should use custom storage key', () => {
      const { startCall, endCall } = useCallQualityHistory({
        storageKey: 'custom-key',
      })

      startCall('call-1')
      endCall()

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-key:records',
        expect.any(String)
      )
    })

    it('should respect maxRecords limit', () => {
      const records = Array.from({ length: 150 }, (_, i) => ({
        id: `call-${i}`,
        startTime: Date.now() - i * 1000,
        endTime: Date.now() - i * 1000,
        durationMs: 1000,
        overallQuality: 'good' as QualityLevel,
        alertCount: 0,
        aggregates: {
          minRtt: null,
          maxRtt: null,
          avgRtt: null,
          minJitter: null,
          maxJitter: null,
          avgJitter: null,
          minPacketLoss: null,
          maxPacketLoss: null,
          avgPacketLoss: null,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
        },
        snapshots: [],
      }))

      localStorageMock.getItem.mockReturnValue(JSON.stringify(records))

      const { getHistory } = useCallQualityHistory({ maxRecords: 50 })

      expect(getHistory()).toHaveLength(50)
    })
  })
})
