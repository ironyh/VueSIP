/**
 * Tests for useCallQualityHistory composable
 * @packageDocumentation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useCallQualityHistory } from '@/composables/useCallQualityHistory'
import type { CallQualityStats } from '@/composables/useCallQualityStats'
import type { CallDirection, TerminationCause } from '@/types/call.types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('useCallQualityHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty history', () => {
      const history = useCallQualityHistory({ persist: false })

      expect(history.history.value).toEqual([])
      expect(history.callCount.value).toBe(0)
      expect(history.isRecording.value).toBe(false)
    })

    it('should load history from localStorage when persist is true', () => {
      const mockRecord = {
        callId: 'test-123',
        direction: 'outgoing' as CallDirection,
        remoteParty: '+46123456789',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 60,
        wasAnswered: true,
        snapshots: [],
        summary: {
          avgRtt: 100,
          maxRtt: 150,
          avgJitter: 10,
          maxJitter: 20,
          avgPacketLoss: 0.5,
          maxPacketLoss: 1,
          overallQuality: 'good' as const,
          snapshotCount: 0,
          callDurationSeconds: 60,
        },
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockRecord]))

      const history = useCallQualityHistory({ persist: true, storageKey: 'test_key' })

      expect(history.callCount.value).toBe(1)
      expect(history.history.value[0].callId).toBe('test-123')
    })

    it('should handle corrupt localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const history = useCallQualityHistory({ persist: true })

      expect(history.history.value).toEqual([])
    })

    it('should handle non-array localStorage data', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ notAnArray: true }))

      const history = useCallQualityHistory({ persist: true })

      expect(history.history.value).toEqual([])
    })
  })

  describe('recording lifecycle', () => {
    it('should start recording a call', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')

      expect(history.isRecording.value).toBe(true)
    })

    it('should mark call as answered', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'incoming', '+46987654321')
      history.markAnswered()

      // Stop recording to verify wasAnswered flag
      history.stopRecording()

      expect(history.history.value[0].wasAnswered).toBe(true)
    })

    it('should stop recording and save to history', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording()

      expect(history.isRecording.value).toBe(false)
      expect(history.callCount.value).toBe(1)
      expect(history.history.value[0].callId).toBe('call-1')
      expect(history.history.value[0].direction).toBe('outgoing')
      expect(history.history.value[0].remoteParty).toBe('+46123456789')
    })

    it('should record termination cause', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording('busy' as TerminationCause)

      expect(history.history.value[0].terminationCause).toBe('busy')
    })

    it('should calculate duration on stop', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')

      // Simulate time passing
      const startTime = Date.now()
      vi.advanceTimersByTime(5000)

      history.stopRecording()

      expect(history.history.value[0].duration).toBeGreaterThanOrEqual(0)
      expect(history.history.value[0].endTime).toBeGreaterThanOrEqual(startTime)
    })

    it('should not stop recording if not started', () => {
      const history = useCallQualityHistory({ persist: false })

      // Should not throw
      history.stopRecording()

      expect(history.callCount.value).toBe(0)
    })
  })

  describe('snapshot recording', () => {
    it('should record quality snapshots', () => {
      const history = useCallQualityHistory({ persist: false })
      const stats: CallQualityStats = {
        rtt: 100,
        jitter: 15,
        packetLossPercent: 1.5,
        bitrateKbps: 64,
        codec: 'PCMU',
        packetsReceived: 1000,
        packetsLost: 15,
        lastUpdated: new Date(),
      }

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.recordSnapshot(stats, 'good')
      history.stopRecording()

      const record = history.history.value[0]
      expect(record.snapshots).toHaveLength(1)
      expect(record.snapshots[0].rtt).toBe(100)
      expect(record.snapshots[0].jitter).toBe(15)
      expect(record.snapshots[0].packetLossPercent).toBe(1.5)
      expect(record.snapshots[0].qualityLevel).toBe('good')
    })

    it('should handle multiple snapshots', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')

      // Record multiple snapshots
      for (let i = 0; i < 5; i++) {
        history.recordSnapshot(
          {
            rtt: 100 + i * 10,
            jitter: 10 + i,
            packetLossPercent: i * 0.5,
            bitrateKbps: 64,
            codec: 'PCMU',
            packetsReceived: 1000 + i * 100,
            packetsLost: i,
            lastUpdated: new Date(),
          },
          i < 3 ? 'good' : 'fair'
        )
      }

      history.stopRecording()

      const record = history.history.value[0]
      expect(record.snapshots).toHaveLength(5)
      expect(record.summary.snapshotCount).toBe(5)
    })

    it('should not record snapshots when not recording', () => {
      const history = useCallQualityHistory({ persist: false })
      const stats: CallQualityStats = {
        rtt: 100,
        jitter: 15,
        packetLossPercent: 1.5,
        bitrateKbps: 64,
        codec: 'PCMU',
        packetsReceived: 1000,
        packetsLost: 15,
        lastUpdated: new Date(),
      }

      // Should not throw
      history.recordSnapshot(stats, 'good')
    })
  })

  describe('summary computation', () => {
    it('should compute averages correctly', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')

      history.recordSnapshot(
        {
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 100,
          packetsLost: 1,
          lastUpdated: new Date(),
        },
        'good'
      )
      history.recordSnapshot(
        {
          rtt: 200,
          jitter: 20,
          packetLossPercent: 2,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 200,
          packetsLost: 4,
          lastUpdated: new Date(),
        },
        'fair'
      )
      history.recordSnapshot(
        {
          rtt: 300,
          jitter: 30,
          packetLossPercent: 3,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 300,
          packetsLost: 9,
          lastUpdated: new Date(),
        },
        'poor'
      )

      history.stopRecording()

      const summary = history.history.value[0].summary
      expect(summary.avgRtt).toBe(200)
      expect(summary.maxRtt).toBe(300)
      expect(summary.avgJitter).toBe(20)
      expect(summary.maxJitter).toBe(30)
      expect(summary.avgPacketLoss).toBe(2)
      expect(summary.maxPacketLoss).toBe(3)
    })

    it('should determine overall quality as poor if any poor snapshots exist', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')

      history.recordSnapshot(
        {
          rtt: 100,
          jitter: 10,
          packetLossPercent: 0.5,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 100,
          packetsLost: 0,
          lastUpdated: new Date(),
        },
        'excellent'
      )
      history.recordSnapshot(
        {
          rtt: 600,
          jitter: 80,
          packetLossPercent: 10,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 200,
          packetsLost: 20,
          lastUpdated: new Date(),
        },
        'poor'
      )

      history.stopRecording()

      expect(history.history.value[0].summary.overallQuality).toBe('poor')
    })

    it('should determine overall quality as unknown for empty snapshots', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording()

      expect(history.history.value[0].summary.overallQuality).toBe('unknown')
      expect(history.history.value[0].summary.avgRtt).toBeNull()
    })

    it('should handle null values in stats gracefully', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')

      history.recordSnapshot(
        {
          rtt: null,
          jitter: null,
          packetLossPercent: null,
          bitrateKbps: null,
          codec: null,
          packetsReceived: null,
          packetsLost: null,
          lastUpdated: new Date(),
        },
        'unknown'
      )

      history.stopRecording()

      const summary = history.history.value[0].summary
      expect(summary.avgRtt).toBeNull()
      expect(summary.avgJitter).toBeNull()
      expect(summary.avgPacketLoss).toBeNull()
    })
  })

  describe('entries view', () => {
    it('should provide simplified entries for list views', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.recordSnapshot(
        {
          rtt: 100,
          jitter: 10,
          packetLossPercent: 1,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 100,
          packetsLost: 1,
          lastUpdated: new Date(),
        },
        'poor'
      )
      history.stopRecording()

      const entries = history.entries.value
      expect(entries).toHaveLength(1)
      expect(entries[0].callId).toBe('call-1')
      expect(entries[0].remoteParty).toBe('+46123456789')
      expect(entries[0].quality).toBe('poor')
      expect(entries[0].hadAlerts).toBe(true)
      expect(entries[0].date).toBeInstanceOf(Date)
    })

    it('should mark entries without quality issues as not having alerts', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.recordSnapshot(
        {
          rtt: 50,
          jitter: 5,
          packetLossPercent: 0.1,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 100,
          packetsLost: 0,
          lastUpdated: new Date(),
        },
        'excellent'
      )
      history.stopRecording()

      expect(history.entries.value[0].hadAlerts).toBe(false)
    })
  })

  describe('max calls limit', () => {
    it('should enforce max calls limit', () => {
      const history = useCallQualityHistory({ persist: false, maxCalls: 3 })

      // Add 5 calls
      for (let i = 0; i < 5; i++) {
        history.startRecording(`call-${i}`, 'outgoing', `+4612345678${i}`)
        history.stopRecording()
      }

      expect(history.callCount.value).toBe(3)
      // Should keep newest (reversed order)
      expect(history.history.value[0].callId).toBe('call-4')
      expect(history.history.value[2].callId).toBe('call-2')
    })
  })

  describe('clear and delete', () => {
    it('should clear all history', () => {
      const history = useCallQualityHistory({ persist: true })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording()

      history.clearHistory()

      expect(history.callCount.value).toBe(0)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })

    it('should delete a specific record', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46111111111')
      history.stopRecording()
      history.startRecording('call-2', 'incoming', '+46222222222')
      history.stopRecording()

      history.deleteRecord('call-1')

      expect(history.callCount.value).toBe(1)
      expect(history.history.value[0].callId).toBe('call-2')
    })
  })

  describe('poor quality filtering', () => {
    it('should return calls with poor or fair quality', () => {
      const history = useCallQualityHistory({ persist: false })

      // Add excellent call
      history.startRecording('call-1', 'outgoing', '+46111111111')
      history.recordSnapshot(
        {
          rtt: 50,
          jitter: 5,
          packetLossPercent: 0.1,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 100,
          packetsLost: 0,
          lastUpdated: new Date(),
        },
        'excellent'
      )
      history.stopRecording()

      // Add poor call
      history.startRecording('call-2', 'incoming', '+46222222222')
      history.recordSnapshot(
        {
          rtt: 500,
          jitter: 80,
          packetLossPercent: 10,
          bitrateKbps: 64,
          codec: 'PCMU',
          packetsReceived: 100,
          packetsLost: 10,
          lastUpdated: new Date(),
        },
        'poor'
      )
      history.stopRecording()

      const poorCalls = history.getPoorQualityCalls()
      expect(poorCalls).toHaveLength(1)
      expect(poorCalls[0].callId).toBe('call-2')
    })
  })

  describe('export and import', () => {
    it('should export history as JSON', () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording()

      const exported = history.exportHistory()
      const parsed = JSON.parse(exported)

      expect(parsed).toHaveLength(1)
      expect(parsed[0].callId).toBe('call-1')
    })

    it('should import valid history JSON', () => {
      const history = useCallQualityHistory({ persist: false })

      const mockData = [
        {
          callId: 'imported-1',
          direction: 'outgoing',
          remoteParty: '+46111111111',
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 60,
          wasAnswered: true,
          snapshots: [],
          summary: {
            avgRtt: 100,
            maxRtt: 150,
            avgJitter: 10,
            maxJitter: 20,
            avgPacketLoss: 0.5,
            maxPacketLoss: 1,
            overallQuality: 'good',
            snapshotCount: 0,
            callDurationSeconds: 60,
          },
        },
      ]

      const success = history.importHistory(JSON.stringify(mockData))

      expect(success).toBe(true)
      expect(history.callCount.value).toBe(1)
      expect(history.history.value[0].callId).toBe('imported-1')
    })

    it('should reject invalid JSON during import', () => {
      const history = useCallQualityHistory({ persist: false })

      const success = history.importHistory('invalid json')

      expect(success).toBe(false)
    })

    it('should reject non-array JSON during import', () => {
      const history = useCallQualityHistory({ persist: false })

      const success = history.importHistory(JSON.stringify({ notAnArray: true }))

      expect(success).toBe(false)
    })

    it('should filter out invalid records during import', () => {
      const history = useCallQualityHistory({ persist: false })

      const mixedData = [
        { callId: 'valid', startTime: Date.now(), snapshots: [] },
        { invalid: 'no callId' },
        { callId: 'also-valid', startTime: Date.now(), snapshots: [] },
      ]

      const success = history.importHistory(JSON.stringify(mixedData))

      expect(success).toBe(true)
      expect(history.callCount.value).toBe(2)
    })
  })

  describe('persistence', () => {
    it('should save to localStorage when history changes', async () => {
      const history = useCallQualityHistory({ persist: true, storageKey: 'vuesip_test' })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording()

      await nextTick()

      expect(localStorageMock.setItem).toHaveBeenCalledWith('vuesip_test', expect.any(String))
    })

    it('should not save when persist is false', async () => {
      const history = useCallQualityHistory({ persist: false })

      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording()

      await nextTick()

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })

      const history = useCallQualityHistory({ persist: true })

      // Should not throw
      history.startRecording('call-1', 'outgoing', '+46123456789')
      history.stopRecording()

      await nextTick()
    })
  })
})
