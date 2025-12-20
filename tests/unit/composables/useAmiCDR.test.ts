/**
 * useAmiCDR composable unit tests
 *
 * CDR (Call Detail Records) composable providing:
 * - Real-time CDR event processing
 * - Call statistics and analytics
 * - Filtering and export capabilities
 * - Agent and queue statistics
 *
 * @see src/composables/useAmiCDR.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useAmiCDR } from '@/composables/useAmiCDR'
import type { AmiClient } from '@/core/AmiClient'
import type { CdrRecord } from '@/types/cdr.types'
import { createMockAmiClient, createAmiEvent, type MockAmiClient } from '../utils/mockFactories'

/**
 * Test fixtures for consistent CDR test data
 */
const TEST_FIXTURES = {
  dispositions: {
    answered: 'ANSWERED',
    noAnswer: 'NO ANSWER',
    busy: 'BUSY',
    failed: 'FAILED',
    cancel: 'CANCEL',
  },
  channels: {
    standard: 'PJSIP/1001-00000001',
    trunk: 'PJSIP/trunk-00000001',
    destination: 'PJSIP/1002-00000002',
  },
  numbers: {
    source: '1001',
    destination: '1002',
    external: '5551234',
  },
  durations: {
    short: '30',
    medium: '120',
    long: '300',
  },
  times: {
    now: () => new Date(),
    twoMinutesAgo: () => new Date(Date.now() - 120000),
    tenSecondsAfter: (baseTime: Date) => new Date(baseTime.getTime() + 10000),
  },
} as const

/**
 * Factory function: Create CDR event with sensible defaults
 *
 * Creates a complete CDR event with all required fields.
 * Override any field by passing them in the overrides object.
 *
 * @param overrides - Optional field overrides
 * @returns Complete CDR event object
 */
function createCdrEvent(overrides: Partial<Record<string, string>> = {}) {
  const now = TEST_FIXTURES.times.now()
  const startTime = TEST_FIXTURES.times.twoMinutesAgo()
  const answerTime = TEST_FIXTURES.times.tenSecondsAfter(startTime)

  return createAmiEvent('Cdr', {
    AccountCode: '',
    Source: TEST_FIXTURES.numbers.source,
    Destination: TEST_FIXTURES.numbers.destination,
    DestinationContext: 'default',
    CallerID: `"User ${TEST_FIXTURES.numbers.source}" <${TEST_FIXTURES.numbers.source}>`,
    Channel: TEST_FIXTURES.channels.standard,
    DestinationChannel: TEST_FIXTURES.channels.destination,
    LastApplication: 'Dial',
    LastData: 'PJSIP/1002',
    StartTime: startTime.toISOString(),
    AnswerTime: answerTime.toISOString(),
    EndTime: now.toISOString(),
    Duration: TEST_FIXTURES.durations.medium,
    BillableSeconds: '110',
    Disposition: TEST_FIXTURES.dispositions.answered,
    AMAFlags: 'DOCUMENTATION',
    UniqueID: `${Date.now()}.${Math.floor(Math.random() * 1000)}`,
    UserField: '',
    ...overrides,
  })
}

/**
 * Factory function: Create answered CDR event
 */
function createAnsweredCdr(billableSeconds: string = '110') {
  return createCdrEvent({
    Disposition: TEST_FIXTURES.dispositions.answered,
    BillableSeconds: billableSeconds,
  })
}

/**
 * Factory function: Create unanswered CDR event
 */
function createUnansweredCdr(disposition: string = TEST_FIXTURES.dispositions.noAnswer) {
  return createCdrEvent({
    Disposition: disposition,
    AnswerTime: '',
    BillableSeconds: '0',
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

  /**
   * Initial State Tests
   * Verify composable starts with correct initial state
   */
  describe('Initial State', () => {
    describe.each([
      {
        description: 'records',
        getter: (composable: ReturnType<typeof useAmiCDR>) => composable.records.value,
        expected: [],
        matcher: 'toEqual',
      },
      {
        description: 'error',
        getter: (composable: ReturnType<typeof useAmiCDR>) => composable.error.value,
        expected: null,
        matcher: 'toBe',
      },
      {
        description: 'isProcessing',
        getter: (composable: ReturnType<typeof useAmiCDR>) => composable.isProcessing.value,
        expected: false,
        matcher: 'toBe',
      },
      {
        description: 'totalCount',
        getter: (composable: ReturnType<typeof useAmiCDR>) => composable.totalCount.value,
        expected: 0,
        matcher: 'toBe',
      },
    ])('$description initialization', ({ getter, expected, matcher }) => {
      it(`should initialize ${matcher === 'toBe' ? 'as' : 'with'} ${JSON.stringify(expected)}`, () => {
        const composable = useAmiCDR(clientRef)
        const value = getter(composable)

        if (matcher === 'toBe') {
          expect(value).toBe(expected)
        } else {
          expect(value).toEqual(expected)
        }
      })
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

    /**
     * Disposition Handling Tests
     * Verify correct processing of different call dispositions
     */
    describe.each([
      {
        disposition: TEST_FIXTURES.dispositions.noAnswer,
        expectAnswerTime: null,
        expectBillableSeconds: 0,
        description: 'NO ANSWER',
      },
      {
        disposition: TEST_FIXTURES.dispositions.busy,
        expectAnswerTime: null,
        expectBillableSeconds: 0,
        description: 'BUSY',
      },
      {
        disposition: TEST_FIXTURES.dispositions.failed,
        expectAnswerTime: null,
        expectBillableSeconds: 0,
        description: 'FAILED',
      },
    ])('$description disposition', ({ disposition, expectAnswerTime, expectBillableSeconds }) => {
      it(`should handle ${disposition} correctly`, async () => {
        const { records } = useAmiCDR(clientRef)

        const cdrEvent = createUnansweredCdr(disposition)
        mockClient._triggerEvent('event', cdrEvent)
        await nextTick()

        expect(records.value[0].disposition).toBe(disposition)
        expect(records.value[0].answerTime).toBe(expectAnswerTime)
        expect(records.value[0].billableSeconds).toBe(expectBillableSeconds)
      })
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

  /**
   * Statistics Calculation Tests
   * Verify correct calculation of call statistics and analytics
   *
   * NOTE: These tests have pre-existing failures (7 stats tests fail).
   * We're not fixing the failures, just improving code quality while
   * maintaining the current pass/fail status.
   */
  describe('Statistics Calculation', () => {
    it('should calculate total calls', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createUnansweredCdr(TEST_FIXTURES.dispositions.noAnswer))
      mockClient._triggerEvent('event', createUnansweredCdr(TEST_FIXTURES.dispositions.busy))
      await nextTick()

      expect(stats.value.totalCalls).toBe(3)
    })

    it('should calculate answered calls', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createUnansweredCdr())
      await nextTick()

      expect(stats.value.answeredCalls).toBe(2)
    })

    it('should calculate missed calls', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createUnansweredCdr(TEST_FIXTURES.dispositions.noAnswer))
      mockClient._triggerEvent('event', createUnansweredCdr(TEST_FIXTURES.dispositions.cancel))
      mockClient._triggerEvent('event', createAnsweredCdr())
      await nextTick()

      expect(stats.value.missedCalls).toBe(2)
    })

    it('should calculate answer rate', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createUnansweredCdr())
      await nextTick()

      expect(stats.value.answerRate).toBe(75)
    })

    it('should calculate average talk time', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createAnsweredCdr('100'))
      mockClient._triggerEvent('event', createAnsweredCdr('200'))
      await nextTick()

      expect(stats.value.averageTalkTime).toBe(150)
    })

    it('should track disposition breakdown', async () => {
      const { stats } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createUnansweredCdr(TEST_FIXTURES.dispositions.noAnswer))
      mockClient._triggerEvent('event', createUnansweredCdr(TEST_FIXTURES.dispositions.busy))
      await nextTick()

      expect(stats.value.byDisposition[TEST_FIXTURES.dispositions.answered]).toBe(2)
      expect(stats.value.byDisposition[TEST_FIXTURES.dispositions.noAnswer]).toBe(1)
      expect(stats.value.byDisposition[TEST_FIXTURES.dispositions.busy]).toBe(1)
    })
  })

  /**
   * Filtering Tests
   * Verify record filtering by various criteria
   *
   * Supports filtering by:
   * - Direction (inbound/outbound/internal)
   * - Disposition (answered/missed/busy/failed)
   * - Source and destination numbers
   * - Duration ranges
   * - Sorting and pagination
   */
  describe('Filtering', () => {
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

  /**
   * Export Tests
   * Verify CDR export functionality
   *
   * Supports:
   * - CSV and JSON export formats
   * - Field selection
   * - Filtering before export
   * - CSV injection attack prevention
   */
  describe('Export', () => {
    /**
     * Format-specific export tests
     * Verify different export formats produce correct output
     */
    describe.each([
      {
        format: 'csv' as const,
        description: 'CSV format',
        expectedContains: ['uniqueId', TEST_FIXTURES.numbers.source, TEST_FIXTURES.numbers.destination],
        parser: (data: string) => data,
      },
      {
        format: 'json' as const,
        description: 'JSON format',
        expectedContains: [],
        parser: (data: string) => JSON.parse(data),
      },
    ])('$description export', ({ format, expectedContains, parser }) => {
      it(`should export to ${format.toUpperCase()}`, async () => {
        const { exportRecords } = useAmiCDR(clientRef)

        mockClient._triggerEvent('event', createCdrEvent())
        await nextTick()

        const exported = exportRecords({ format })
        const parsed = parser(exported)

        if (format === 'csv') {
          expectedContains.forEach(item => {
            expect(exported).toContain(item)
          })
        } else if (format === 'json') {
          expect(parsed).toHaveLength(1)
          expect(parsed[0].source).toBe(TEST_FIXTURES.numbers.source)
        }
      })
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

      mockClient._triggerEvent('event', createAnsweredCdr())
      mockClient._triggerEvent('event', createUnansweredCdr())
      await nextTick()

      const json = exportRecords({ format: 'json' }, { disposition: TEST_FIXTURES.dispositions.answered })
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(1)
    })

    /**
     * CSV Injection Prevention Tests
     * Verify CSV export prevents formula injection attacks
     *
     * Dangerous prefixes: =, +, -, @
     * Should be escaped with single quote prefix
     */
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

  /**
   * Helper Methods Tests
   * Verify utility methods for record access and analytics
   */
  describe('Helper Methods', () => {
    it('should get today calls', async () => {
      const { getTodayCalls } = useAmiCDR(clientRef)

      mockClient._triggerEvent('event', createCdrEvent())
      await nextTick()

      const todayCalls = getTodayCalls()
      expect(todayCalls).toHaveLength(1)
    })

    /**
     * Call Detail Retrieval Tests
     * Verify retrieving specific CDR by unique ID
     */
    describe('getCallDetail', () => {
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

  /**
   * Agent Statistics Tests
   * Verify agent performance tracking and metrics
   *
   * Tracks per-agent:
   * - Calls handled
   * - Total talk time
   * - Average talk time
   */
  describe('Agent Statistics', () => {
    it('should track agent statistics', async () => {
      const { agentStats } = useAmiCDR(clientRef)

      // CDR with agent in destination channel
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: TEST_FIXTURES.dispositions.answered,
          DestinationChannel: 'PJSIP/1001-00000001',
          BillableSeconds: '120',
        })
      )
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          Disposition: TEST_FIXTURES.dispositions.answered,
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
          Disposition: TEST_FIXTURES.dispositions.answered,
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

  /**
   * Queue Statistics Tests
   * Verify queue performance tracking and metrics
   *
   * Tracks per-queue:
   * - Calls offered
   * - Calls answered
   * - Calls abandoned
   * - Service level
   */
  describe('Queue Statistics', () => {
    it('should track queue statistics', async () => {
      const { queueStats } = useAmiCDR(clientRef)

      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          LastApplication: 'Queue',
          LastData: 'sales',
          Disposition: TEST_FIXTURES.dispositions.answered,
        })
      )
      mockClient._triggerEvent(
        'event',
        createCdrEvent({
          LastApplication: 'Queue',
          LastData: 'sales',
          Disposition: TEST_FIXTURES.dispositions.noAnswer,
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
          Disposition: TEST_FIXTURES.dispositions.answered,
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

  /**
   * Event Listener Tests
   * Verify CDR event subscription and cleanup
   */
  describe('Event Listeners', () => {
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

  /**
   * Direction Detection Tests
   * Verify call direction classification
   *
   * Supports:
   * - Custom detection logic
   * - Inbound/outbound/internal classification
   * - Trunk-based detection
   */
  describe('Direction Detection', () => {
    it('should use custom direction detection', async () => {
      const { records } = useAmiCDR(clientRef, {
        detectDirection: (cdr) => {
          if (cdr.channel.includes('trunk')) return 'inbound'
          return 'internal'
        },
      })

      mockClient._triggerEvent('event', createCdrEvent({ Channel: TEST_FIXTURES.channels.trunk }))
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

  /**
   * Client Lifecycle Tests
   * Verify handling of client disconnect and reconnect
   */
  describe('Client Changes', () => {
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
