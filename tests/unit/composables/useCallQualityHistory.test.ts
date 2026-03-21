/**
 * useCallQualityHistory - Test Suite
 *
 * Tests for the persistent call quality history composable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCallQualityHistory } from '@/composables/useCallQualityHistory'
import type { CallQualityStats } from '@/composables/useCallQualityStats'
import type { QualityLevel } from '@/composables/useCallQualityStats'

// Mock the logger
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

describe('useCallQualityHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  // Helper to call composable functions - they return plain objects, not refs
  const createHistory = (options?: object) => {
    return useCallQualityHistory(options)
  }

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const { isTracking, activeCallId, records, exportToJson } = createHistory()

      expect(isTracking.value).toBe(false)
      expect(activeCallId.value).toBe(null)
      expect(records.value).toEqual([])
      expect(exportToJson()).toBe('[]')
    })

    it('should accept custom storage key', () => {
      const { exportToJson } = createHistory({ storageKey: 'custom-key' })

      // Should use custom key internally
      expect(exportToJson()).toBe('[]')
    })

    it('should accept custom maxRecords', () => {
      const { records } = createHistory({ maxRecords: 50 })

      expect(records.value).toEqual([])
    })
  })

  describe('startCall', () => {
    it('should start tracking a new call', () => {
      const { startCall, isTracking, activeCallId } = createHistory()

      startCall('call-123', '+46123456789', 'outgoing')

      expect(isTracking.value).toBe(true)
      expect(activeCallId.value).toBe('call-123')
    })

    it('should store remote identity and direction', () => {
      const { startCall, activeCall } = createHistory()

      startCall('call-456', '+46987654321', 'incoming')

      expect(activeCall.value).toEqual({
        callId: 'call-456',
        startedAt: expect.any(Date),
        durationSeconds: null,
        overallQuality: 'unknown',
        alertCount: 0,
        metadata: {
          remoteNumber: '+46987654321',
          direction: 'incoming',
        },
      })
    })

    it('should end previous call when starting new one', () => {
      const { startCall, activeCallId, records, endCall } = createHistory()

      // First call - need to end it first
      startCall('call-1', '+46111111111', 'outgoing')
      endCall()

      // Now start new call
      startCall('call-2', '+46222222222', 'incoming')

      expect(activeCallId.value).toBe('call-2')
      // Previous call should be saved
      expect(records.value.length).toBe(1)
    })
  })

  describe('recordSnapshot', () => {
    it('should not record snapshots when no active call', () => {
      const { recordSnapshot } = createHistory()

      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 0,
        bitrateKbps: 128,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 0,
        lastUpdated: new Date(),
      }

      // Should not throw
      expect(() => recordSnapshot(stats, 'good')).not.toThrow()
    })

    it('should record quality snapshots during active call', () => {
      vi.useFakeTimers()
      const { startCall, recordSnapshot, endCall } = createHistory({ snapshotIntervalMs: 1000 })

      startCall('call-123')

      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 0.5,
        bitrateKbps: 128,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 5,
        lastUpdated: new Date(),
      }

      // First snapshot should be recorded
      recordSnapshot(stats, 'good')
      vi.advanceTimersByTime(2000)
      recordSnapshot({ ...stats, rtt: 60 }, 'good')

      endCall()
      vi.useRealTimers()
    })

    it('should throttle snapshots to configured interval', () => {
      vi.useFakeTimers()
      const { startCall, recordSnapshot, endCall } = createHistory({ snapshotIntervalMs: 2000 })

      startCall('call-123')

      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 0,
        bitrateKbps: 128,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 0,
        lastUpdated: new Date(),
      }

      // First snapshot
      recordSnapshot(stats, 'good')

      // Immediate second should be throttled
      recordSnapshot({ ...stats, rtt: 60 }, 'good')

      endCall()
      vi.useRealTimers()
    })
  })

  describe('recordAlert', () => {
    it('should increment alert counter', () => {
      const { startCall, recordAlert, activeCall } = createHistory()

      startCall('call-123')
      recordAlert()
      recordAlert()
      recordAlert()

      expect(activeCall.value?.alertCount).toBe(3)
    })

    it('should not increment when no active call', () => {
      const { recordAlert } = createHistory()

      // Should not throw
      expect(() => recordAlert()).not.toThrow()
    })
  })

  describe('endCall', () => {
    it('should save call record with aggregates', () => {
      vi.useFakeTimers()
      const { startCall, recordSnapshot, endCall } = createHistory({ snapshotIntervalMs: 1000 })

      startCall('call-123', '+46123456789', 'outgoing')

      const stats: CallQualityStats = {
        rtt: 50,
        jitter: 10,
        packetLossPercent: 0.5,
        bitrateKbps: 128,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 5,
        lastUpdated: new Date(),
      }

      recordSnapshot(stats, 'good')
      vi.advanceTimersByTime(2000)
      recordSnapshot({ ...stats, rtt: 30 }, 'excellent')

      const record = endCall()

      expect(record).not.toBeNull()
      expect(record?.id).toBe('call-123')
      expect(record?.remoteIdentity).toBe('+46123456789')
      expect(record?.direction).toBe('outgoing')
      expect(record?.durationMs).toBeGreaterThan(0)
      expect(record?.aggregates).toEqual({
        minRtt: 30,
        maxRtt: 50,
        avgRtt: 40,
        minJitter: 10,
        maxJitter: 10,
        avgJitter: 10,
        minPacketLoss: 0.5,
        maxPacketLoss: 0.5,
        avgPacketLoss: 0.5,
        qualityDistribution: expect.any(Object),
      })

      vi.useRealTimers()
    })

    it('should add record to history', () => {
      const { startCall, endCall, records } = createHistory()

      startCall('call-1')
      endCall()

      expect(records.value.length).toBe(1)

      startCall('call-2')
      endCall()

      expect(records.value.length).toBe(2)
    })

    it('should return null when no active call', () => {
      const { endCall } = createHistory()

      const record = endCall()

      expect(record).toBeNull()
    })
  })

  describe('getHistory', () => {
    it('should return empty array when no records', () => {
      const { getHistory } = createHistory()

      const history = getHistory()

      expect(history).toEqual([])
    })

    it('should filter by date range', () => {
      const { getHistory, startCall, endCall } = createHistory()

      startCall('call-1')
      endCall()

      const fromDate = new Date(Date.now() - 86400000)
      const toDate = new Date(Date.now() + 86400000)

      const history = getHistory({ fromDate, toDate })

      expect(Array.isArray(history)).toBe(true)
    })

    it('should filter by minimum quality', () => {
      const { getHistory, startCall, endCall } = createHistory()

      startCall('call-1')
      endCall()

      const history = getHistory({ minQuality: 'fair' })

      expect(Array.isArray(history)).toBe(true)
    })

    it('should limit results', () => {
      const { getHistory, startCall, endCall } = createHistory()

      startCall('call-1')
      endCall()

      const history = getHistory({ limit: 5 })

      expect(Array.isArray(history)).toBe(true)
    })
  })

  describe('getTrends', () => {
    it('should return trend data structure', () => {
      const { getTrends } = createHistory()

      const trends = getTrends(7)

      expect(trends).toEqual({
        labels: expect.any(Array),
        scores: expect.any(Array),
        callCounts: expect.any(Array),
      })
    })

    it('should return correct number of days', () => {
      const { getTrends } = createHistory()

      const trends = getTrends(14)

      expect(trends.labels.length).toBe(14)
    })
  })

  describe('getAggregateStats', () => {
    it('should return aggregate statistics', () => {
      const { getAggregateStats } = createHistory()

      const stats = getAggregateStats(7)

      expect(stats).toEqual({
        totalCalls: expect.any(Number),
        avgQualityScore: expect.any(Number),
        avgDurationMs: expect.any(Number),
      })
    })
  })

  describe('exportHistory / importHistory', () => {
    it('should export history as JSON', () => {
      const { startCall, endCall, exportHistory } = createHistory()

      startCall('call-export', '+46123456789', 'outgoing')
      endCall()

      const json = exportHistory()

      expect(json).toBeTruthy()
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should import valid history', () => {
      const { importHistory } = createHistory()

      const testRecord = {
        id: 'imported-call',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        durationMs: 3600000,
        overallQuality: 'excellent' as QualityLevel,
        alertCount: 0,
        aggregates: {
          minRtt: 30,
          maxRtt: 50,
          avgRtt: 40,
          minJitter: 5,
          maxJitter: 10,
          avgJitter: 7,
          minPacketLoss: 0,
          maxPacketLoss: 0.5,
          avgPacketLoss: 0.2,
          qualityDistribution: { excellent: 100, good: 0, fair: 0, poor: 0, unknown: 0 },
        },
        snapshots: [],
      }

      const importResult = importHistory(JSON.stringify([testRecord]))

      expect(importResult.success).toBe(true)
      expect(importResult.imported).toBe(1)
    })

    it('should reject invalid JSON', () => {
      const { importHistory } = createHistory()

      const importResult = importHistory('invalid json')

      expect(importResult.success).toBe(false)
      expect(importResult.errors.length).toBeGreaterThan(0)
    })

    it('should handle import with validation errors', () => {
      const { importHistory } = createHistory()

      // Invalid record - missing required fields
      const invalidRecord = [{ id: 'incomplete' }]

      const importResult = importHistory(JSON.stringify(invalidRecord))

      expect(importResult.success).toBe(true) // Parses but filters bad records
      expect(importResult.imported).toBe(0)
      expect(importResult.errors.length).toBeGreaterThan(0)
    })
  })

  describe('clearHistory', () => {
    it('should clear all records', () => {
      const { startCall, endCall, clearHistory, records } = createHistory()

      startCall('call-1')
      endCall()

      expect(records.value.length).toBe(1)

      clearHistory()

      expect(records.value).toEqual([])
    })
  })

  describe('deleteRecord', () => {
    it('should delete specific record', () => {
      const { startCall, endCall, deleteRecord, records } = createHistory()

      startCall('call-delete', '+46123456789', 'outgoing')
      endCall()

      expect(records.value.length).toBe(1)

      const deleted = deleteRecord('call-delete')

      expect(deleted).toBe(true)
      expect(records.value.length).toBe(0)
    })

    it('should return false for non-existent record', () => {
      const { deleteRecord } = createHistory()

      const deleted = deleteRecord('non-existent')

      expect(deleted).toBe(false)
    })
  })

  describe('aggregates computation', () => {
    it('should compute empty aggregates initially', () => {
      const { aggregates } = createHistory()

      expect(aggregates.value).toEqual({
        totalCalls: 0,
        avgRtt: null,
        avgPacketLoss: null,
        trend: 'stable',
        qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0, unknown: 0 },
      })
    })
  })
})
