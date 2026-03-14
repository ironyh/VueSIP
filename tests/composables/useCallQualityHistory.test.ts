/**
 * Tests for useCallQualityHistory composable
 * @module tests/composables/useCallQualityHistory.test
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCallQualityHistory } from '@/composables/useCallQualityHistory'
import type { CallQualityStats } from '@/composables/useCallQualityStats'

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
        callId: 'test-123',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 60,
        snapshots: [],
        overallQuality: 'good',
        worstQuality: 'fair',
        averages: { rtt: 100, jitter: 5, packetLossPercent: 0.5, bitrateKbps: 64 },
        alertCount: 0,
      }
      localStorageMock.setItem('vuesip-quality', JSON.stringify([JSON.stringify(mockRecord)]))

      const history = useCallQualityHistory()
      expect(history.records.value.length).toBe(1)
      expect(history.records.value[0].callId).toBe('test-123')
    })
  })

  describe('startCall', () => {
    it('should create active call record', () => {
      const history = useCallQualityHistory()

      history.startCall('call-001', { direction: 'outbound', remoteNumber: '555-0100' })

      expect(history.activeCall.value).not.toBeNull()
      expect(history.activeCall.value?.callId).toBe('call-001')
      expect(history.activeCall.value?.metadata?.direction).toBe('outbound')
      expect(history.activeCall.value?.metadata?.remoteNumber).toBe('555-0100')
      expect(history.activeCall.value?.startedAt).toBeInstanceOf(Date)
      expect(history.activeCall.value?.snapshots).toEqual([])
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

  describe('addSnapshot', () => {
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

      history.addSnapshot(stats)

      expect(history.activeCall.value?.snapshots.length).toBe(1)
      expect(history.activeCall.value?.snapshots[0].rtt).toBe(45)
      expect(history.activeCall.value?.snapshots[0].qualityLevel).toBe('excellent')
    })

    it('should calculate quality level correctly', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')

      // Excellent quality
      history.addSnapshot({
        rtt: 45,
        jitter: 2,
        packetLossPercent: 0.1,
        bitrateKbps: 64,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 1,
        lastUpdated: new Date(),
      })

      // Poor quality
      history.addSnapshot({
        rtt: 600,
        jitter: 80,
        packetLossPercent: 8,
        bitrateKbps: 32,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 80,
        lastUpdated: new Date(),
      })

      expect(history.activeCall.value?.snapshots[0].qualityLevel).toBe('excellent')
      expect(history.activeCall.value?.snapshots[1].qualityLevel).toBe('poor')
      expect(history.activeCall.value?.worstQuality).toBe('poor')
    })

    it('should do nothing if no active call', () => {
      const history = useCallQualityHistory()

      history.addSnapshot({
        rtt: 45,
        jitter: 2,
        packetLossPercent: 0.1,
        bitrateKbps: 64,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 1,
        lastUpdated: new Date(),
      })

      expect(history.activeCall.value).toBeNull()
    })
  })

  describe('endCall', () => {
    it('should finalize call and add to records', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')
      history.addSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 1,
        bitrateKbps: 64,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 10,
        lastUpdated: new Date(),
      })

      history.endCall()

      expect(history.activeCall.value).toBeNull()
      expect(history.records.value.length).toBe(1)
      expect(history.records.value[0].callId).toBe('call-001')
      expect(history.records.value[0].durationSeconds).toBeGreaterThanOrEqual(0)
      expect(history.records.value[0].endedAt).toBeInstanceOf(Date)
    })

    it('should calculate averages correctly', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')

      history.addSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 1,
        bitrateKbps: 64,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 10,
        lastUpdated: new Date(),
      })
      history.addSnapshot({
        rtt: 200,
        jitter: 10,
        packetLossPercent: 2,
        bitrateKbps: 32,
        codec: 'opus',
        packetsReceived: 2000,
        packetsLost: 40,
        lastUpdated: new Date(),
      })

      history.endCall()

      const record = history.records.value[0]
      expect(record.averages.rtt).toBe(150)
      expect(record.averages.jitter).toBe(7.5)
      expect(record.averages.packetLossPercent).toBe(1.5)
      expect(record.averages.bitrateKbps).toBe(48)
    })

    it('should determine overall quality from most common level', () => {
      const history = useCallQualityHistory()
      history.startCall('call-001')

      // Add 3 good snapshots and 1 fair
      for (let i = 0; i < 3; i++) {
        history.addSnapshot({
          rtt: 200,
          jitter: 10,
          packetLossPercent: 2,
          bitrateKbps: 64,
          codec: 'opus',
          packetsReceived: 1000,
          packetsLost: 20,
          lastUpdated: new Date(),
        })
      }
      history.addSnapshot({
        rtt: 400,
        jitter: 30,
        packetLossPercent: 4,
        bitrateKbps: 64,
        codec: 'opus',
        packetsReceived: 1000,
        packetsLost: 40,
        lastUpdated: new Date(),
      })

      history.endCall()

      expect(history.records.value[0].overallQuality).toBe('good')
    })
  })

  describe('query', () => {
    it('should filter by date range', () => {
      const history = useCallQualityHistory()

      // Create calls at different times
      const now = new Date()
      const yesterday = new Date(now.getTime() - 86400000)
      const lastWeek = new Date(now.getTime() - 7 * 86400000)

      history.startCall('call-recent')
      history.endCall()

      // Manually modify record dates
      history.records.value[0].startedAt = now

      // Add older record directly
      history.records.value.push({
        callId: 'call-old',
        startedAt: lastWeek,
        endedAt: lastWeek,
        durationSeconds: 60,
        snapshots: [],
        overallQuality: 'good',
        worstQuality: 'good',
        averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
        alertCount: 0,
      })

      const recent = history.query({ from: yesterday })
      expect(recent.length).toBe(1)
      expect(recent[0].callId).toBe('call-recent')
    })

    it('should limit results', () => {
      const history = useCallQualityHistory()

      for (let i = 0; i < 5; i++) {
        history.startCall(`call-${i}`)
        history.endCall()
      }

      const limited = history.query({ limit: 3 })
      expect(limited.length).toBe(3)
    })

    it('should sort by date', async () => {
      const history = useCallQualityHistory()

      history.startCall('call-1')
      history.endCall()
      await new Promise((resolve) => setTimeout(resolve, 10)) // Small delay for ordering
      history.startCall('call-2')
      history.endCall()

      const desc = history.query({ sort: 'desc' })
      expect(desc[0].callId).toBe('call-2')

      const asc = history.query({ sort: 'asc' })
      expect(asc[0].callId).toBe('call-1')
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
      const history = useCallQualityHistory()

      // Create calls with different qualities by manipulating records directly
      history.records.value = [
        {
          callId: 'call-1',
          startedAt: new Date(),
          endedAt: new Date(),
          durationSeconds: 60,
          snapshots: [],
          overallQuality: 'excellent',
          worstQuality: 'excellent',
          averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
          alertCount: 0,
        },
        {
          callId: 'call-2',
          startedAt: new Date(),
          endedAt: new Date(),
          durationSeconds: 60,
          snapshots: [],
          overallQuality: 'good',
          worstQuality: 'good',
          averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
          alertCount: 0,
        },
        {
          callId: 'call-3',
          startedAt: new Date(),
          endedAt: new Date(),
          durationSeconds: 60,
          snapshots: [],
          overallQuality: 'good',
          worstQuality: 'good',
          averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
          alertCount: 0,
        },
      ]

      expect(history.aggregates.value.qualityDistribution.excellent).toBe(1)
      expect(history.aggregates.value.qualityDistribution.good).toBe(2)
    })

    it('should detect improving trend', () => {
      const history = useCallQualityHistory()

      history.records.value = [
        {
          callId: 'call-1',
          startedAt: new Date('2024-01-01'),
          endedAt: new Date(),
          durationSeconds: 60,
          snapshots: [],
          overallQuality: 'poor',
          worstQuality: 'poor',
          averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
          alertCount: 0,
        },
        {
          callId: 'call-2',
          startedAt: new Date('2024-01-02'),
          endedAt: new Date(),
          durationSeconds: 60,
          snapshots: [],
          overallQuality: 'fair',
          worstQuality: 'fair',
          averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
          alertCount: 0,
        },
        {
          callId: 'call-3',
          startedAt: new Date('2024-01-03'),
          endedAt: new Date(),
          durationSeconds: 60,
          snapshots: [],
          overallQuality: 'excellent',
          worstQuality: 'excellent',
          averages: { rtt: null, jitter: null, packetLossPercent: null, bitrateKbps: null },
          alertCount: 0,
        },
      ]

      expect(history.aggregates.value.trend).toBe('improving')
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
      expect(JSON.parse(parsed[0]).callId).toBe('call-001')
    })

    it('should import records from JSON', () => {
      const history = useCallQualityHistory()
      const mockRecord = JSON.stringify({
        callId: 'imported-001',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 60,
        snapshots: [],
        overallQuality: 'good',
        worstQuality: 'good',
        averages: { rtt: 100, jitter: 5, packetLossPercent: 0.5, bitrateKbps: 64 },
        alertCount: 0,
      })

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
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('vuesip-quality')
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
      const history = useCallQualityHistory({ maxRecords: 3, autoCleanup: true })

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
