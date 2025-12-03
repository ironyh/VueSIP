/**
 * useAmiCDR composable unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiCDR } from '@/composables/useAmiCDR'
import type { AmiClient } from '@/core/AmiClient'
import type { CdrRecord } from '@/types/cdr.types'
import { createMockAmiClient, createAmiEvent, type MockAmiClient } from '../utils/mockFactories'

/**
 * Create a mock CDR event
 */
function createCdrEvent(overrides: Partial<Record<string, string>> = {}) {
  const now = new Date()
  const startTime = new Date(now.getTime() - 120000) // 2 minutes ago
  const answerTime = new Date(startTime.getTime() + 10000) // 10 seconds after start

  return createAmiEvent('Cdr', {
    AccountCode: '',
    Source: '1001',
    Destination: '1002',
    DestinationContext: 'default',
    CallerID: '"User 1001" <1001>',
    Channel: 'PJSIP/1001-00000001',
    DestinationChannel: 'PJSIP/1002-00000002',
    LastApplication: 'Dial',
    LastData: 'PJSIP/1002',
    StartTime: startTime.toISOString(),
    AnswerTime: answerTime.toISOString(),
    EndTime: now.toISOString(),
    Duration: '120',
    BillableSeconds: '110',
    Disposition: 'ANSWERED',
    AMAFlags: 'DOCUMENTATION',
    UniqueID: `${Date.now()}.${Math.floor(Math.random() * 1000)}`,
    UserField: '',
    ...overrides,
  })
}

describe('useAmiCDR', () => {
  let mockClient: MockAmiClient
  let clientRef: ReturnType<typeof ref<AmiClient | null>>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockClient = createMockAmiClient()
    clientRef = ref(mockClient as unknown as AmiClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have empty records initially', () => {
      const { records } = useAmiCDR(clientRef)
      expect(records.value).toHaveLength(0)
    })

    it('should have no error initially', () => {
      const { error } = useAmiCDR(clientRef)
      expect(error.value).toBeNull()
    })

    it('should not be processing initially', () => {
      const { isProcessing } = useAmiCDR(clientRef)
      expect(isProcessing.value).toBe(false)
    })

    it('should have zero total count initially', () => {
      const { totalCount } = useAmiCDR(clientRef)
      expect(totalCount.value).toBe(0)
    })

    it('should have zero stats initially', () => {
      const { stats } = useAmiCDR(clientRef)
      expect(stats.value.totalCalls).toBe(0)
      expect(stats.value.answeredCalls).toBe(0)
      expect(stats.value.answerRate).toBe(0)
    })
  })

  describe('CDR event processing', () => {
    it('should process CDR events', async () => {
      const { records, totalCount } = useAmiCDR(clientRef)

      const cdrEvent = createCdrEvent()
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      expect(records.value).toHaveLength(1)
      expect(totalCount.value).toBe(1)
      expect(records.value[0].source).toBe('1001')
      expect(records.value[0].destination).toBe('1002')
      expect(records.value[0].disposition).toBe('ANSWERED')
    })

    it('should parse CDR fields correctly', async () => {
      const { records } = useAmiCDR(clientRef)

      const cdrEvent = createCdrEvent({
        Source: '5551234',
        Destination: '5559876',
        Duration: '300',
        BillableSeconds: '280',
        Disposition: 'ANSWERED',
      })
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      const record = records.value[0]
      expect(record.source).toBe('5551234')
      expect(record.destination).toBe('5559876')
      expect(record.duration).toBe(300)
      expect(record.billableSeconds).toBe(280)
      expect(record.disposition).toBe('ANSWERED')
    })

    it('should handle NO ANSWER disposition', async () => {
      const { records } = useAmiCDR(clientRef)

      const cdrEvent = createCdrEvent({
        Disposition: 'NO ANSWER',
        AnswerTime: '',
        BillableSeconds: '0',
      })
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      expect(records.value[0].disposition).toBe('NO ANSWER')
      expect(records.value[0].answerTime).toBeNull()
      expect(records.value[0].billableSeconds).toBe(0)
    })

    it('should handle BUSY disposition', async () => {
      const { records } = useAmiCDR(clientRef)

      const cdrEvent = createCdrEvent({
        Disposition: 'BUSY',
        AnswerTime: '',
        BillableSeconds: '0',
      })
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      expect(records.value[0].disposition).toBe('BUSY')
    })

    it('should handle FAILED disposition', async () => {
      const { records } = useAmiCDR(clientRef)

      const cdrEvent = createCdrEvent({
        Disposition: 'FAILED',
      })
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      expect(records.value[0].disposition).toBe('FAILED')
    })

    it('should add new records at the beginning', async () => {
      const { records } = useAmiCDR(clientRef)

      const cdrEvent1 = createCdrEvent({ Source: 'first' })
      const cdrEvent2 = createCdrEvent({ Source: 'second' })

      mockClient._triggerEvent('event', cdrEvent1)
      await nextTick()
      mockClient._triggerEvent('event', cdrEvent2)
      await nextTick()

      expect(records.value[0].source).toBe('second')
      expect(records.value[1].source).toBe('first')
    })

    it('should handle invalid date strings gracefully', async () => {
      const { records } = useAmiCDR(clientRef)

      const cdrEvent = createCdrEvent({
        StartTime: 'invalid-date',
        AnswerTime: 'also-invalid',
        EndTime: '',
      })
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      // Should still create a record with fallback dates
      expect(records.value).toHaveLength(1)
      expect(records.value[0].startTime).toBeInstanceOf(Date)
      expect(records.value[0].endTime).toBeInstanceOf(Date)
      // Invalid answer time should be null
      expect(records.value[0].answerTime).toBeNull()
    })

    it('should respect maxRecords limit', async () => {
      const { records } = useAmiCDR(clientRef, { maxRecords: 5 })

      for (let i = 0; i < 10; i++) {
        const cdrEvent = createCdrEvent({ Source: `source-${i}` })
        mockClient._triggerEvent('event', cdrEvent)
        await nextTick()
      }

      expect(records.value).toHaveLength(5)
      expect(records.value[0].source).toBe('source-9')
    })

    it('should call onCdr callback', async () => {
      const onCdr = vi.fn()
      useAmiCDR(clientRef, { onCdr })

      const cdrEvent = createCdrEvent()
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      expect(onCdr).toHaveBeenCalledTimes(1)
      expect(onCdr).toHaveBeenCalledWith(
        expect.objectContaining({
          source: '1001',
          destination: '1002',
        })
      )
    })

    it('should apply transformCdr', async () => {
      const transformCdr = vi.fn((cdr: CdrRecord) => ({
        ...cdr,
        customFields: { transformed: 'true' },
      }))

      const { records } = useAmiCDR(clientRef, { transformCdr })

      const cdrEvent = createCdrEvent()
      mockClient._triggerEvent('event', cdrEvent)
      await nextTick()

      expect(transformCdr).toHaveBeenCalled()
      expect(records.value[0].customFields?.transformed).toBe('true')
    })
  })

  describe('statistics calculation', () => {
    it('should calculate total calls', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'BUSY' }))
      await nextTick()

      expect(stats.value.totalCalls).toBe(3)
    })

    it('should calculate answered calls', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      await nextTick()

      expect(stats.value.answeredCalls).toBe(2)
    })

    it('should calculate missed calls', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'CANCEL' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      await nextTick()

      expect(stats.value.missedCalls).toBe(2)
    })

    it('should calculate answer rate', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      await nextTick()

      expect(stats.value.answerRate).toBe(75)
    })

    it('should calculate average talk time', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED', BillableSeconds: '100' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED', BillableSeconds: '200' }))
      await nextTick()

      expect(stats.value.averageTalkTime).toBe(150)
    })

    it('should track disposition breakdown', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'BUSY' }))
      await nextTick()

      expect(stats.value.byDisposition['ANSWERED']).toBe(2)
      expect(stats.value.byDisposition['NO ANSWER']).toBe(1)
      expect(stats.value.byDisposition['BUSY']).toBe(1)
    })
  })

  describe('filtering', () => {
    beforeEach(async () => {
      // Add test data
      const { records: _records } = useAmiCDR(clientRef)
    })

    it('should filter by direction', async () => {
      const { getRecords } = useAmiCDR(clientRef, {
        detectDirection: (cdr) => (cdr.source.startsWith('555') ? 'inbound' : 'outbound'),
      })

      mockClient._triggerEvent('event', createCdrEvent({ Source: '5551234' }))
      mockClient._triggerEvent('event', createCdrEvent({ Source: '1001' }))
      await nextTick()

      const inbound = getRecords({ direction: 'inbound' })
      expect(inbound).toHaveLength(1)
      expect(inbound[0].source).toBe('5551234')
    })

    it('should filter by disposition', async () => {
      const { getRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'BUSY' }))
      await nextTick()

      const answered = getRecords({ disposition: 'ANSWERED' })
      expect(answered).toHaveLength(1)
    })

    it('should filter by multiple dispositions', async () => {
      const { getRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'BUSY' }))
      await nextTick()

      const missed = getRecords({ disposition: ['NO ANSWER', 'BUSY'] })
      expect(missed).toHaveLength(2)
    })

    it('should filter by source', async () => {
      const { getRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Source: '1001' }))
      mockClient._triggerEvent('event', createCdrEvent({ Source: '1002' }))
      await nextTick()

      const filtered = getRecords({ source: '1001' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].source).toBe('1001')
    })

    it('should filter by destination', async () => {
      const { getRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Destination: '5551234' }))
      mockClient._triggerEvent('event', createCdrEvent({ Destination: '5559876' }))
      await nextTick()

      const filtered = getRecords({ destination: '5551234' })
      expect(filtered).toHaveLength(1)
    })

    it('should filter by duration', async () => {
      const { getRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Duration: '30' }))
      mockClient._triggerEvent('event', createCdrEvent({ Duration: '120' }))
      mockClient._triggerEvent('event', createCdrEvent({ Duration: '300' }))
      await nextTick()

      const filtered = getRecords({ minDuration: 60, maxDuration: 200 })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].duration).toBe(120)
    })

    it('should apply limit and offset', async () => {
      const { getRecords } = useAmiCDR(clientRef)

      for (let i = 0; i < 10; i++) {
        mockClient._triggerEvent('event', createCdrEvent({ Source: `100${i}` }))
      }
      await nextTick()

      const filtered = getRecords({ limit: 3, offset: 2 })
      expect(filtered).toHaveLength(3)
    })

    it('should sort by field', async () => {
      const { getRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Duration: '100' }))
      mockClient._triggerEvent('event', createCdrEvent({ Duration: '300' }))
      mockClient._triggerEvent('event', createCdrEvent({ Duration: '200' }))
      await nextTick()

      const ascending = getRecords({ sortBy: 'duration', sortOrder: 'asc' })
      expect(ascending[0].duration).toBe(100)
      expect(ascending[2].duration).toBe(300)

      const descending = getRecords({ sortBy: 'duration', sortOrder: 'desc' })
      expect(descending[0].duration).toBe(300)
      expect(descending[2].duration).toBe(100)
    })
  })

  describe('export', () => {
    it('should export to CSV', async () => {
      const { exportRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Source: '1001', Destination: '1002' }))
      await nextTick()

      const csv = exportRecords({ format: 'csv' })
      expect(csv).toContain('uniqueId')
      expect(csv).toContain('1001')
      expect(csv).toContain('1002')
    })

    it('should export to JSON', async () => {
      const { exportRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Source: '1001' }))
      await nextTick()

      const json = exportRecords({ format: 'json' })
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].source).toBe('1001')
    })

    it('should export specific fields', async () => {
      const { exportRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      const csv = exportRecords({
        format: 'csv',
        fields: ['source', 'destination', 'duration'],
        includeHeader: true,
      })
      expect(csv).toContain('source,destination,duration')
      expect(csv).not.toContain('uniqueId')
    })

    it('should export with filter', async () => {
      const { exportRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'ANSWERED' }))
      mockClient._triggerEvent('event', createCdrEvent({ Disposition: 'NO ANSWER' }))
      await nextTick()

      const json = exportRecords({ format: 'json' }, { disposition: 'ANSWERED' })
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(1)
    })

    it('should sanitize CSV values to prevent injection attacks', async () => {
      const { exportRecords } = useAmiCDR(clientRef)

      // Create CDR with potentially dangerous formula characters
      mockClient._triggerEvent('event', createCdrEvent({ Source: '=SUM(A1:A10)' }))
      mockClient._triggerEvent('event', createCdrEvent({ Source: '+cmd|calc.exe' }))
      mockClient._triggerEvent('event', createCdrEvent({ Source: '-dangerous' }))
      mockClient._triggerEvent('event', createCdrEvent({ Source: '@malicious' }))
      await nextTick()

      const csv = exportRecords({ format: 'csv', fields: ['source'] })

      // Values starting with formula characters should be prefixed with single quote
      expect(csv).toContain("'=SUM(A1:A10)")
      expect(csv).toContain("'+cmd|calc.exe")
      expect(csv).toContain("'-dangerous")
      expect(csv).toContain("'@malicious")

      // Original dangerous values should NOT appear unescaped
      expect(csv).not.toMatch(/^=SUM/m)
      expect(csv).not.toMatch(/^\+cmd/m)
    })
  })

  describe('helper methods', () => {
    it('should get today calls', async () => {
      const { getTodayCalls } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      const todayCalls = getTodayCalls()
      expect(todayCalls).toHaveLength(1)
    })

    it('should get call detail by uniqueId', async () => {
      const { getCallDetail, records } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      const uniqueId = records.value[0].uniqueId
      const detail = getCallDetail(uniqueId)
      expect(detail).toBeDefined()
      expect(detail?.uniqueId).toBe(uniqueId)
    })

    it('should return undefined for unknown uniqueId', () => {
      const { getCallDetail } = useAmiCDR(clientRef)
      const detail = getCallDetail('unknown-id')
      expect(detail).toBeUndefined()
    })

    it('should calculate service level', async () => {
      const { calculateServiceLevel } = useAmiCDR(clientRef)

      // 3 answered calls: 2 within 20 seconds, 1 over
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: 'ANSWERED',
          Duration: '100', // 100 total - 90 billable = 10 sec ring time (within threshold)
          BillableSeconds: '90',
        })
      )
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: 'ANSWERED',
          Duration: '80', // 80 total - 65 billable = 15 sec ring time (within threshold)
          BillableSeconds: '65',
        })
      )
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: 'ANSWERED',
          Duration: '120', // 120 total - 90 billable = 30 sec ring time (over threshold)
          BillableSeconds: '90',
        })
      )
      await nextTick()

      const sl = calculateServiceLevel(20) // 20 second threshold
      expect(sl).toBeCloseTo(66.67, 0) // 2 out of 3
    })

    it('should get hourly breakdown', async () => {
      const { getHourlyBreakdown } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      const breakdown = getHourlyBreakdown(new Date())
      expect(Object.keys(breakdown)).toHaveLength(24)
    })

    it('should clear records', async () => {
      const { records, totalCount, clearRecords } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      expect(records.value).toHaveLength(2)
      expect(totalCount.value).toBe(2)

      clearRecords()

      expect(records.value).toHaveLength(0)
      expect(totalCount.value).toBe(0)
    })
  })

  describe('agent stats', () => {
    it('should track agent statistics', async () => {
      const { agentStats } = useAmiCDR(clientRef)

      // CDR with agent in destination channel
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: 'ANSWERED',
          DestinationChannel: 'PJSIP/1001-00000001',
          BillableSeconds: '120',
        })
      )
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: 'ANSWERED',
          DestinationChannel: 'PJSIP/1001-00000002',
          BillableSeconds: '180',
        })
      )
      await nextTick()

      expect(agentStats.value['1001']).toBeDefined()
      expect(agentStats.value['1001'].callsHandled).toBe(2)
      expect(agentStats.value['1001'].totalTalkTime).toBe(300)
    })

    it('should get specific agent stats', async () => {
      const { getAgentStats } = useAmiCDR(clientRef)

      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: 'ANSWERED',
          DestinationChannel: 'PJSIP/1002-00000001',
          BillableSeconds: '60',
        })
      )
      await nextTick()

      const stats = getAgentStats('1002')
      expect(stats).not.toBeNull()
      expect(stats?.agent).toBe('1002')
      expect(stats?.callsHandled).toBe(1)
    })

    it('should return null for unknown agent', () => {
      const { getAgentStats } = useAmiCDR(clientRef)
      const stats = getAgentStats('unknown')
      expect(stats).toBeNull()
    })
  })

  describe('queue stats', () => {
    it('should track queue statistics', async () => {
      const { queueStats } = useAmiCDR(clientRef)

      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          LastApplication: 'Queue',
          LastData: 'sales',
          Disposition: 'ANSWERED',
        })
      )
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          LastApplication: 'Queue',
          LastData: 'sales',
          Disposition: 'NO ANSWER',
        })
      )
      await nextTick()

      expect(queueStats.value['sales']).toBeDefined()
      expect(queueStats.value['sales'].callsOffered).toBe(2)
      expect(queueStats.value['sales'].callsAnswered).toBe(1)
      expect(queueStats.value['sales'].callsAbandoned).toBe(1)
    })

    it('should get specific queue stats', async () => {
      const { getQueueStats } = useAmiCDR(clientRef)

      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          LastApplication: 'Queue',
          LastData: 'support',
          Disposition: 'ANSWERED',
        })
      )
      await nextTick()

      const stats = getQueueStats('support')
      expect(stats).not.toBeNull()
      expect(stats?.queue).toBe('support')
    })

    it('should return null for unknown queue', () => {
      const { getQueueStats } = useAmiCDR(clientRef)
      const stats = getQueueStats('unknown')
      expect(stats).toBeNull()
    })
  })

  describe('event listeners', () => {
    it('should subscribe to CDR events', async () => {
      const listener = vi.fn()
      const { onCdrEvent } = useAmiCDR(clientRef)

      const unsubscribe = onCdrEvent(listener)
      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      expect(listener).toHaveBeenCalledTimes(1)
      unsubscribe()
    })

    it('should unsubscribe from CDR events', async () => {
      const listener = vi.fn()
      const { onCdrEvent } = useAmiCDR(clientRef)

      const unsubscribe = onCdrEvent(listener)
      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('direction detection', () => {
    it('should use custom direction detection', async () => {
      const { records } = useAmiCDR(clientRef, {
        detectDirection: (cdr) => {
          if (cdr.channel.includes('trunk')) return 'inbound'
          return 'internal'
        },
      })

      mockClient._triggerEvent('event', createCdrEvent({ Channel: 'PJSIP/trunk-00000001' }))
      await nextTick()

      expect(records.value[0].direction).toBe('inbound')
    })

    it('should default to unknown for unrecognized patterns', async () => {
      const { records } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      // Default detection for internal PJSIP channels
      expect(['internal', 'unknown']).toContain(records.value[0].direction)
    })
  })

  describe('client changes', () => {
    it('should handle client disconnect', async () => {
      const { records } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()
      expect(records.value).toHaveLength(1)

      // Disconnect client
      clientRef.value = null
      await nextTick()

      // Records should still be there
      expect(records.value).toHaveLength(1)
    })

    it('should handle client reconnect', async () => {
      const { records } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()
      expect(records.value).toHaveLength(1)

      // Create new client
      const newClient = createMockAmiClient()
      clientRef.value = newClient as unknown as AmiClient
      await nextTick()

      // Trigger event on new client
      newClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      expect(records.value).toHaveLength(2)
    })
  })
})
