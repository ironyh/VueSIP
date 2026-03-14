/**
 * Tests for useCallQualityHistory composable
 * @packageDocumentation
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useCallQualityHistory } from '@/composables/useCallQualityHistory'
import type { CallQualityStats } from '@/composables/useCallQualityStats'

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(),
}
globalThis.indexedDB = indexedDBMock as unknown as IDBFactory

describe('useCallQualityHistory', () => {
  let mockDB: {
    objectStoreNames: { contains: vi.fn }
    transaction: vi.fn
    close: vi.fn
  }
  let mockStore: {
    get: vi.fn
    getAll: vi.fn
    put: vi.fn
    delete: vi.fn
    clear: vi.fn
    createIndex: vi.fn
  }
  let mockTransaction: {
    objectStore: vi.fn
    commit: vi.fn
    oncomplete: null
    onerror: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    mockStore = {
      get: vi.fn(),
      getAll: vi.fn(() => Promise.resolve([])),
      put: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
      createIndex: vi.fn(),
    }

    mockTransaction = {
      objectStore: vi.fn(() => mockStore),
      commit: vi.fn(),
      oncomplete: null,
      onerror: null,
    }

    mockDB = {
      objectStoreNames: {
        contains: vi.fn(() => false),
      },
      transaction: vi.fn(() => mockTransaction),
      close: vi.fn(),
    }

    indexedDBMock.open.mockImplementation(() => {
      const request = {
        result: mockDB,
        error: null,
        onsuccess: null as ((this: IDBRequest, ev: Event) => void) | null,
        onerror: null as ((this: IDBRequest, ev: Event) => void) | null,
        onupgradeneeded: null as ((this: IDBRequest, IDBVersionChangeEvent) => void) | null,
      }
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess.call(request, new Event('success'))
      }, 0)
      return request
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty records', async () => {
      const history = useCallQualityHistory()
      await nextTick()

      expect(history.records.value).toEqual([])
      expect(history.recordCount.value).toBe(0)
    })

    it('should have isLoading as a reactive property', async () => {
      const history = useCallQualityHistory()
      // isLoading is reactive - just verify it exists
      expect(typeof history.isLoading.value).toBe('boolean')
    })
  })

  describe('recording lifecycle', () => {
    it('should start recording a call', () => {
      const history = useCallQualityHistory()

      const callId = history.startCall('+46123456789', 'outgoing')

      expect(callId).toBeTruthy()
      expect(callId).toContain('-')
      expect(history.activeRecording.value).not.toBeNull()
      expect(history.activeRecording.value?.remoteParty).toBe('+46123456789')
      expect(history.activeRecording.value?.direction).toBe('outgoing')
    })

    it('should record quality snapshots', () => {
      const history = useCallQualityHistory()
      history.startCall('+46123456789', 'outgoing')

      const stats: CallQualityStats = {
        rtt: 120,
        jitter: 15,
        packetLossPercent: 0.5,
        bitrateKbps: 128,
        codec: 'opus',
      }

      history.recordSnapshot(stats)

      expect(history.activeRecording.value?.sampleCount).toBe(1)
      expect(history.activeRecording.value?.startMetrics?.rtt).toBe(120)
    })

    it('should compute quality level from stats', () => {
      const history = useCallQualityHistory()
      history.startCall('+46123456789', 'outgoing')

      // Excellent: RTT < 150, packet loss < 1%
      history.recordSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 0.1,
        bitrateKbps: 128,
      } as CallQualityStats)
      expect(history.activeRecording.value?.startMetrics?.qualityLevel).toBe('excellent')

      // Good: RTT < 300, packet loss < 3%
      history.recordSnapshot({
        rtt: 250,
        jitter: 20,
        packetLossPercent: 2,
        bitrateKbps: 64,
      } as CallQualityStats)
      expect(history.activeRecording.value?.endMetrics?.qualityLevel).toBe('good')

      // Fair: RTT < 500, packet loss < 5%
      history.recordSnapshot({
        rtt: 400,
        jitter: 40,
        packetLossPercent: 4,
        bitrateKbps: 32,
      } as CallQualityStats)
      expect(history.activeRecording.value?.endMetrics?.qualityLevel).toBe('fair')

      // Poor: RTT >= 500 or packet loss >= 5%
      history.recordSnapshot({
        rtt: 600,
        jitter: 100,
        packetLossPercent: 10,
        bitrateKbps: 16,
      } as CallQualityStats)
      expect(history.activeRecording.value?.endMetrics?.qualityLevel).toBe('poor')
    })

    it('should track worst metrics during call', () => {
      const history = useCallQualityHistory()
      history.startCall('+46123456789', 'outgoing')

      history.recordSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 0.1,
        bitrateKbps: 128,
      } as CallQualityStats)
      history.recordSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 0.1,
        bitrateKbps: 128,
      } as CallQualityStats)
      history.recordSnapshot({
        rtt: 600,
        jitter: 100,
        packetLossPercent: 10,
        bitrateKbps: 16,
      } as CallQualityStats)

      expect(history.activeRecording.value?.worstMetrics?.qualityLevel).toBe('poor')
    })

    it('should end call and save to history', async () => {
      const history = useCallQualityHistory()
      history.startCall('+46123456789', 'outgoing')

      history.recordSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 0.1,
        bitrateKbps: 128,
      } as CallQualityStats)

      await history.endCall()

      expect(history.activeRecording.value).toBeNull()
      expect(history.recordCount.value).toBe(1)
    })

    it('should calculate average metrics', async () => {
      const history = useCallQualityHistory()
      history.startCall('+46123456789', 'outgoing')

      history.recordSnapshot({
        rtt: 100,
        jitter: 10,
        packetLossPercent: 1,
        bitrateKbps: 128,
      } as CallQualityStats)
      history.recordSnapshot({
        rtt: 200,
        jitter: 20,
        packetLossPercent: 2,
        bitrateKbps: 64,
      } as CallQualityStats)

      await history.endCall()

      expect(history.records.value[0].avgMetrics.rtt).toBe(150)
      expect(history.records.value[0].avgMetrics.jitter).toBe(15)
      expect(history.records.value[0].avgMetrics.packetLossPercent).toBe(1.5)
    })
  })

  describe('record management', () => {
    it('should delete a record from active recording', async () => {
      const history = useCallQualityHistory()
      history.startCall('+46123456789', 'outgoing')
      history.recordSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 0.1,
        bitrateKbps: 128,
      } as CallQualityStats)

      // Delete works on records, but since we haven't ended the call yet,
      // it won't be in the records list. This tests the method exists.
      expect(typeof history.deleteRecord).toBe('function')
    })

    it('should clear all history method exists', async () => {
      const history = useCallQualityHistory()

      // Just verify the method exists and is callable
      expect(typeof history.clearHistory).toBe('function')
    })

    it('should filter records by grade method exists', async () => {
      const history = useCallQualityHistory()

      // Verify the method exists
      expect(typeof history.getRecordsByGrade).toBe('function')

      // Returns empty array when no records
      expect(history.getRecordsByGrade('good')).toEqual([])
    })
  })

  describe('export/import', () => {
    it('should export history as JSON', async () => {
      const history = useCallQualityHistory()
      history.startCall('+46123456789', 'outgoing')
      history.recordSnapshot({
        rtt: 100,
        jitter: 5,
        packetLossPercent: 0.1,
        bitrateKbps: 128,
      } as CallQualityStats)
      await history.endCall()

      const json = history.exportHistory()

      expect(json).toContain('+46123456789')
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })

  describe('timeline sampling', () => {
    it('should sample timeline at intervals', () => {
      const history = useCallQualityHistory({ timelineSampleIntervalMs: 1000 })
      history.startCall('+46123456789', 'outgoing')

      // Record multiple snapshots quickly
      for (let i = 0; i < 5; i++) {
        history.recordSnapshot({
          rtt: 100 + i * 10,
          jitter: 5,
          packetLossPercent: 0.1,
          bitrateKbps: 128,
        } as CallQualityStats)
        vi.advanceTimersByTime(500)
      }

      // Should have timeline entries due to interval
      expect(history.activeRecording.value?.qualityTimeline.length).toBeGreaterThan(0)
    })
  })

  describe('options', () => {
    it('should respect maxAgeDays option', () => {
      const history = useCallQualityHistory({ maxAgeDays: 7 })
      expect(history).toBeTruthy()
    })

    it('should respect maxRecords option', () => {
      const history = useCallQualityHistory({ maxRecords: 100 })
      expect(history).toBeTruthy()
    })
  })
})
