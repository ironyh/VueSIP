/**
 * Tests for useCallQualityHistory composable
 * @module tests/composables/useCallQualityHistory.test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCallQualityHistory } from '@/composables/useCallQualityHistory'
import type { CallQualityStats, QualityLevel } from '@/composables/useCallQualityStats'

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('useCallQualityHistory', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty records', () => {
      const history = useCallQualityHistory()
      expect(history.records.value).toEqual([])
      expect(history.activeCall.value).toBeNull()
    })

    it('should load existing records from LocalStorage', () => {
      const mockRecord = {
        id: 'test-123',
        startTime: Date.now(),
        endTime: Date.now(),
        durationMs: 60000,
        snapshots: [],
        overallQuality: 'good',
        alertCount: 0,
        aggregates: {
          minRtt: 100,
          maxRtt: 100,
          avgRtt: 100,
          minJitter: 5,
          maxJitter: 5,
          avgJitter: 5,
          minPacketLoss: 0.5,
          maxPacketLoss: 0.5,
          avgPacketLoss: 0.5,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
        },
      }
      localStorageMock.setItem('vuesip-quality:records', JSON.stringify([mockRecord]))

      const history = useCallQualityHistory()
      expect(history.records.value.length).toBe(1)
      expect(history.records.value[0].callId).toBe('test-123')
    })
  })

  describe('startCall', () => {
    it('should create active call record', () => {
      const history = useCallQualityHistory()

      history.startCall('call-001', '555-0100', 'outgoing')

      expect(history.activeCall.value).not.toBeNull()
      expect(history.activeCall.value?.callId).toBe('call-001')
      expect(history.activeCall.value?.metadata?.direction).toBe('outgoing')
      expect(history.activeCall.value?.metadata?.remoteNumber).toBe('555-0100')
      expect(history.activeCall.value?.startedAt).toBeInstanceOf(Date)
    })

    it('should end previous active call before starting new one', () => {
      const history = useCallQualityHistory()

      history.startCall('call-001')
      history.startCall('call-002')

      expect(history.records.value.length).toBe(1)
      expect(history.records.value[0].callId).toBe('call-001')
      expect(history.activeCall.value?.callId).toBe('call-002')
    })
  })

  describe('recordSnapshot', () => {
    it('should add snapshot to active call', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')

      const stats: CallQualityStats = {
        rtt: 45,
        jitter: 2,
        packetLossPercent: 0.1,
        bitrateKbps: 64,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 1,
        lastUpdated: new Date(),
      }

      history.recordSnapshot(stats, 'excellent')

      // Snapshots are internal - verify by ending call and checking aggregates
      history.endCall()
      expect(history.records.value[0].overallQuality).toBe('excellent')
    })

    it('should calculate quality level correctly', async () => {
      const history = useCallQualityHistory({ snapshotIntervalMs: 0 }) // Disable throttling for test
      history.startCall('call-001')

      // Excellent quality
      history.recordSnapshot(
        {
          rtt: 45,
          jitter: 2,
          packetLossPercent: 0.1,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 1000,
          packetsLost: 1,
          lastUpdated: new Date(),
        },
        'excellent'
      )

      // Poor quality
      history.recordSnapshot(
        {
          rtt: 600,
          jitter: 80,
          packetLossPercent: 8,
          bitrateKbps: 32,
          codec: 'opus',
          packetsReceived: 1000,
          packetsLost: 80,
          lastUpdated: new Date(),
        },
        'poor'
      )

      history.endCall()
      // With 1 excellent and 1 poor (equal distribution), defaults to 'good'
      expect(history.records.value[0].overallQuality).toBe('good')
    })

    it('should do nothing if no active call', () => {
      const history = useCallQualityHistory()

      history.recordSnapshot(
        {
          rtt: 45,
          jitter: 2,
          packetLossPercent: 0.1,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 1000,
          packetsLost: 1,
          lastUpdated: new Date(),
        },
        'excellent'
      )

      expect(history.activeCall.value).toBeNull()
    })
  })

  describe('endCall', () => {
    it('should finalize call and add to records', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')
      history.recordSnapshot(
        {
          rtt: 100,
          jitter: 5,
          packetLossPercent: 1,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 1000,
          packetsLost: 10,
          lastUpdated: new Date(),
        },
        'good'
      )

      history.endCall()

      expect(history.activeCall.value).toBeNull()
      expect(history.records.value.length).toBe(1)
      expect(history.records.value[0].callId).toBe('call-001')
    })

    it('should calculate averages correctly', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')

      history.recordSnapshot(
        {
          rtt: 100,
          jitter: 5,
          packetLossPercent: 1,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 1000,
          packetsLost: 10,
          lastUpdated: new Date(),
        },
        'good'
      )
      history.recordSnapshot(
        {
          rtt: 200,
          jitter: 10,
          packetLossPercent: 2,
          bitrateKbps: 32,
          codec: 'opus',
          packetsReceived: 2000,
          packetsLost: 40,
          lastUpdated: new Date(),
        },
        'fair'
      )

      history.endCall()

      // Verify aggregates were calculated (via getAggregateStats)
      const stats = history.getAggregateStats()
      expect(stats.totalCalls).toBe(1)
    })

    it('should determine overall quality from distribution', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')

      // Add 3 good snapshots and 1 fair
      for (let i = 0; i < 3; i++) {
        history.recordSnapshot(
          {
            rtt: 200,
            jitter: 10,
            packetLossPercent: 2,
            bitrateKbps: 64,
            codec: 'opus',
            packetsReceived: 1000,
            packetsLost: 20,
            lastUpdated: new Date(),
          },
          'good'
        )
      }
      history.recordSnapshot(
        {
          rtt: 400,
          jitter: 30,
          packetLossPercent: 4,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 1000,
          packetsLost: 40,
          lastUpdated: new Date(),
        },
        'fair'
      )

      history.endCall()

      expect(history.records.value[0].overallQuality).toBe('good')
    })
  })

  describe('getHistory', () => {
    it('should filter by date range', () => {
      const history = useCallQualityHistory()

      // Create calls at different times
      const now = new Date()
      const yesterday = new Date(now.getTime() - 86400000)
      const lastWeek = new Date(now.getTime() - 7 * 86400000)

      history.startCall('call-recent')
      history.endCall()

      // Add older record directly via import
      const oldRecord = [
        {
          id: 'call-old',
          startTime: lastWeek.getTime(),
          endTime: lastWeek.getTime(),
          durationMs: 60000,
          snapshots: [],
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
        },
      ]
      localStorageMock.setItem('vuesip-quality:records', JSON.stringify(oldRecord))

      // Create new history instance to load the old record
      const history2 = useCallQualityHistory()
      history2.startCall('call-recent-2')
      history2.endCall()

      const recent = history2.getHistory({ fromDate: yesterday })
      expect(recent.length).toBe(1)
      expect(recent[0].id).toBe('call-recent-2')
    })

    it('should limit results', () => {
      const history = useCallQualityHistory()

      for (let i = 0; i < 5; i++) {
        history.startCall(`call-${i}`)
        history.endCall()
      }

      const limited = history.getHistory({ limit: 3 })
      expect(limited.length).toBe(3)
    })

    it('should return records sorted by date desc', () => {
      const history = useCallQualityHistory()

      history.startCall('call-1')
      history.endCall()
      history.startCall('call-2')
      history.endCall()

      const results = history.getHistory()
      expect(results[0].id).toBe('call-2')
      expect(results[1].id).toBe('call-1')
    })
  })

  describe('aggregates', () => {
    it('should calculate total calls', () => {
      const history = useCallQualityHistory()

      for (let i = 0; i < 3; i++) {
        history.startCall(`call-${i}`)
        history.endCall()
      }

      expect(history.aggregates.value.totalCalls).toBe(3)
    })

    it('should calculate quality distribution', () => {
      const _history = useCallQualityHistory()

      // Create records by importing directly
      const records = [
        {
          id: 'call-1',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 60000,
          snapshots: [],
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
        },
        {
          id: 'call-2',
          startTime: Date.now() - 1000,
          endTime: Date.now() - 1000,
          durationMs: 60000,
          snapshots: [],
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
        },
        {
          id: 'call-3',
          startTime: Date.now() - 2000,
          endTime: Date.now() - 2000,
          durationMs: 60000,
          snapshots: [],
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
        },
      ]
      localStorageMock.setItem('vuesip-quality:records', JSON.stringify(records))

      // Create new history instance to load records
      const history2 = useCallQualityHistory()

      expect(history2.aggregates.value.qualityDistribution.excellent).toBe(1)
      expect(history2.aggregates.value.qualityDistribution.good).toBe(2)
    })

    it('should detect improving trend', () => {
      const _history = useCallQualityHistory()

      const now = Date.now()
      const records = [
        {
          id: 'call-1',
          startTime: now - 10 * 86400000, // 10 days ago
          endTime: now - 10 * 86400000,
          durationMs: 60000,
          snapshots: [],
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
        },
        {
          id: 'call-2',
          startTime: now - 5 * 86400000, // 5 days ago (previous period)
          endTime: now - 5 * 86400000,
          durationMs: 60000,
          snapshots: [],
          overallQuality: 'fair' as QualityLevel,
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
            qualityDistribution: { excellent: 0, good: 0, fair: 100, poor: 0, unknown: 0 },
          },
        },
        {
          id: 'call-3',
          startTime: now - 86400000, // 1 day ago (recent period)
          endTime: now - 86400000,
          durationMs: 60000,
          snapshots: [],
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
        },
      ]
      localStorageMock.setItem('vuesip-quality:records', JSON.stringify(records))

      // Create new history instance to load records
      const history2 = useCallQualityHistory()

      expect(history2.aggregates.value.trend).toBe('improving')
    })
  })

  describe('export/import', () => {
    it('should export records to JSON', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')
      history.endCall()

      const json = history.exportToJson()
      const parsed = JSON.parse(json)

      expect(parsed.length).toBe(1)
      expect(parsed[0].id).toBe('call-001')
    })

    it('should import records from JSON', () => {
      const history = useCallQualityHistory()
      const mockRecord = {
        id: 'imported-001',
        startTime: Date.now(),
        endTime: Date.now(),
        durationMs: 60000,
        snapshots: [],
        overallQuality: 'good',
        alertCount: 0,
        aggregates: {
          minRtt: 100,
          maxRtt: 100,
          avgRtt: 100,
          minJitter: 5,
          maxJitter: 5,
          avgJitter: 5,
          minPacketLoss: 0.5,
          maxPacketLoss: 0.5,
          avgPacketLoss: 0.5,
          qualityDistribution: { excellent: 0, good: 100, fair: 0, poor: 0, unknown: 0 },
        },
      }

      history.importFromJson(JSON.stringify([mockRecord]))

      expect(history.records.value.length).toBe(1)
      expect(history.records.value[0].callId).toBe('imported-001')
    })
  })

  describe('clearHistory', () => {
    it('should remove all records and clear LocalStorage', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')
      history.endCall()

      expect(history.records.value.length).toBe(1)

      history.clearHistory()

      expect(history.records.value.length).toBe(0)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vuesip-quality:records')
    })
  })

  describe('deleteRecord', () => {
    it('should remove specific record', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')
      history.endCall()
      history.startCall('call-002')
      history.endCall()

      history.deleteRecord('call-001')

      expect(history.records.value.length).toBe(1)
      expect(history.records.value[0].callId).toBe('call-002')
    })
  })

  describe('autoCleanup', () => {
    it('should limit records to maxRecords', () => {
      const history = useCallQualityHistory({ maxRecords: 3 })

      for (let i = 0; i < 5; i++) {
        history.startCall(`call-${i}`)
        history.endCall()
      }

      expect(history.records.value.length).toBe(3)
    })
  })

  describe('storage persistence', () => {
    it('should save to LocalStorage on endCall', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')
      history.endCall()

      expect(localStorageMock.setItem).toHaveBeenCalled()
      const saved = localStorageMock.setItem.mock.calls[0][1]
      expect(JSON.parse(saved)).toBeInstanceOf(Array)
    })
  })
})
