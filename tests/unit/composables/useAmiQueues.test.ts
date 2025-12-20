/**
 * Tests for useAmiQueues composable
 *
 * Queue management composable providing:
 * - Real-time queue status monitoring and updates
 * - Member management (pause/unpause, add/remove, penalty setting)
 * - Caller tracking (join/leave/abandon events)
 * - Queue metrics and statistics (service level, wait times, availability)
 * - Computed aggregates across all queues
 *
 * @see src/composables/useAmiQueues.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useAmiQueues } from '@/composables/useAmiQueues'
import { QueueMemberStatus } from '@/types/ami.types'
import type { AmiClient } from '@/core/AmiClient'
import type {
  QueueInfo,
  QueueMember,
  QueueEntry,
  QueueSummary,
  AmiMessage,
  AmiQueueMemberStatusEvent,
  AmiQueueCallerJoinEvent,
  AmiQueueCallerLeaveEvent,
  AmiQueueCallerAbandonEvent,
} from '@/types/ami.types'

/**
 * Test fixtures for consistent test data across all queue test suites
 */
const TEST_FIXTURES = {
  queues: {
    sales: 'sales-queue',
    support: 'support-queue',
    internal: 'internal-queue',
  },
  members: {
    sip1000: 'SIP/1000',
    sip2000: 'SIP/2000',
    sip3000: 'SIP/3000',
    local1000: 'Local/1000@context',
  },
  pauseReasons: {
    default: ['Break', 'Lunch', 'Meeting', 'Training'],
    custom: ['Coffee', 'Meeting', 'Training'],
  },
  errors: {
    clientNotConnected: 'AMI client not connected',
    networkError: 'Network error',
  },
  serverId: 1,
} as const

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

/**
 * Factory function: Create mock AMI client with queue-specific methods
 *
 * Provides:
 * - Queue status retrieval
 * - Queue summary statistics
 * - Member management (pause, add, remove, penalty)
 * - Event subscription tracking
 *
 * @returns Mock AmiClient instance
 */
const createMockClient = (): AmiClient => {
  Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])

  return {
    getQueueStatus: vi.fn().mockResolvedValue([]),
    getQueueSummary: vi.fn().mockResolvedValue([]),
    queuePause: vi.fn().mockResolvedValue(undefined),
    queueAdd: vi.fn().mockResolvedValue(undefined),
    queueRemove: vi.fn().mockResolvedValue(undefined),
    queuePenalty: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = []
      eventHandlers[event].push(handler)
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (eventHandlers[event]) {
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler)
      }
    }),
  } as unknown as AmiClient
}

/**
 * Helper: Trigger client events for testing real-time updates
 */
function triggerClientEvent(event: string, ...args: unknown[]) {
  eventHandlers[event]?.forEach(handler => handler(...args))
}

/**
 * Factory function: Create mock queue with sensible defaults
 *
 * @param name - Queue name
 * @param overrides - Optional property overrides
 * @returns QueueInfo object
 */
function createMockQueue(name: string, overrides?: Partial<QueueInfo>): QueueInfo {
  return {
    name,
    strategy: 'ringall',
    calls: 0,
    holdtime: 0,
    talktime: 0,
    completed: 0,
    abandoned: 0,
    serviceLevelPerf: 0,
    serviceLevel: 60,
    weight: 0,
    members: [],
    entries: [],
    lastUpdated: new Date(),
    serverId: TEST_FIXTURES.serverId,
    ...overrides,
  }
}

/**
 * Factory function: Create mock queue member with sensible defaults
 *
 * @param iface - Member interface (e.g., SIP/1000)
 * @param overrides - Optional property overrides
 * @returns QueueMember object
 */
function createMockMember(iface: string, overrides?: Partial<QueueMember>): QueueMember {
  return {
    queue: 'test-queue',
    name: 'Test Agent',
    interface: iface,
    stateInterface: iface,
    membership: 'static',
    penalty: 0,
    callsTaken: 0,
    lastCall: 0,
    lastPause: 0,
    loginTime: 0,
    inCall: false,
    status: QueueMemberStatus.NotInUse,
    statusLabel: 'Available',
    paused: false,
    pausedReason: '',
    wrapupTime: 0,
    ringinuse: true,
    serverId: TEST_FIXTURES.serverId,
    ...overrides,
  }
}


describe('useAmiQueues', () => {
  let mockClient: AmiClient

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key])
    mockClient = createMockClient()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Initialization Tests
   * Verify composable starts with correct initial state
   */
  describe('Initialization', () => {
    describe.each([
      {
        description: 'valid client',
        client: () => createMockClient(),
        expectedQueues: 0,
        expectedLoading: false,
        expectedError: null,
      },
      {
        description: 'null client',
        client: null,
        expectedQueues: 0,
        expectedLoading: false,
        expectedError: null,
      },
    ])('with $description', ({ client, expectedQueues, expectedLoading, expectedError }) => {
      it(`should initialize with ${expectedQueues} queues, loading=${expectedLoading}, error=${expectedError}`, () => {
        const actualClient = typeof client === 'function' ? client() : client
        const { queues, queueList, loading, error } = useAmiQueues(actualClient)

        expect(queues.value.size).toBe(expectedQueues)
        expect(queueList.value).toEqual([])
        expect(loading.value).toBe(expectedLoading)
        expect(error.value).toBe(expectedError)
      })
    })
  })

  /**
   * Data Fetching Tests
   * Verify queue data refresh, loading states, and error handling
   *
   * Loading states:
   * - false initially
   * - true during fetch
   * - false after completion (success or error)
   */
  describe('Data Fetching', () => {
    describe.each([
      {
        description: 'empty results',
        mockQueues: [],
        expectedSize: 0,
        expectedLoading: false,
      },
      {
        description: '2 queues',
        mockQueues: [
          { name: TEST_FIXTURES.queues.sales, calls: 5 },
          { name: TEST_FIXTURES.queues.support, calls: 3 },
        ],
        expectedSize: 2,
        expectedLoading: false,
      },
    ])('successful fetch with $description', ({ mockQueues, expectedSize, expectedLoading }) => {
      it(`should result in ${expectedSize} queues, loading=${expectedLoading}`, async () => {
        const queues = mockQueues.map(q => createMockQueue(q.name, q))
        ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue(queues)

        const { refresh, queues: queueMap, queueList, loading, lastRefresh } = useAmiQueues(mockClient)

        expect(loading.value).toBe(false)

        const refreshPromise = refresh()
        expect(loading.value).toBe(true)

        await refreshPromise

        expect(loading.value).toBe(expectedLoading)
        expect(queueMap.value.size).toBe(expectedSize)
        expect(queueList.value.length).toBe(expectedSize)
        if (expectedSize > 0) {
          expect(lastRefresh.value).toBeInstanceOf(Date)
        }
      })
    })

    /**
     * Error handling tests
     * Verify error state management when operations fail
     */
    describe('error handling', () => {
      describe.each([
        {
          description: 'null client',
          setupError: (_client: any) => null,
          expectedError: TEST_FIXTURES.errors.clientNotConnected,
        },
        {
          description: 'network error',
          setupError: (client: any) => {
            ;(client.getQueueStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
              new Error(TEST_FIXTURES.errors.networkError)
            )
            return client
          },
          expectedError: TEST_FIXTURES.errors.networkError,
        },
      ])('$description', ({ setupError, expectedError }) => {
        it(`should set error to "${expectedError}"`, async () => {
          const client = setupError(mockClient)
          const { refresh, error, loading } = useAmiQueues(client)

          await refresh()

          expect(error.value).toBe(expectedError)
          expect(loading.value).toBe(false)
        })
      })
    })

    it('should apply queue filter', async () => {
      const mockQueues: QueueInfo[] = [
        createMockQueue('sales-queue'),
        createMockQueue('internal-queue'),
        createMockQueue('support-queue'),
      ]

      ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueues)

      const { refresh, queues, queueList } = useAmiQueues(mockClient, {
        queueFilter: (q) => q.name.endsWith('-queue') && !q.name.startsWith('internal'),
      })

      await refresh()

      expect(queues.value.size).toBe(2)
      expect(queueList.value.map(q => q.name)).toContain('sales-queue')
      expect(queueList.value.map(q => q.name)).toContain('support-queue')
    })

    it('should apply member filter', async () => {
      const mockQueues: QueueInfo[] = [
        createMockQueue('test-queue', {
          members: [
            createMockMember('SIP/1000'),
            createMockMember('Local/1000@context'),
            createMockMember('SIP/2000'),
          ],
        }),
      ]

      ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueues)

      const { refresh, queues } = useAmiQueues(mockClient, {
        memberFilter: (m) => m.interface.startsWith('SIP/'),
      })

      await refresh()

      const queue = queues.value.get('test-queue')
      expect(queue?.members.length).toBe(2)
    })

    it('should call onQueueUpdate callback', async () => {
      const onQueueUpdate = vi.fn()
      const mockQueues: QueueInfo[] = [createMockQueue('test-queue')]

      ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueues)

      const { refresh } = useAmiQueues(mockClient, { onQueueUpdate })

      await refresh()

      expect(onQueueUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'test-queue' })
      )
    })
  })

  describe('refreshQueue', () => {
    it('should refresh specific queue', async () => {
      const mockQueue = createMockQueue('test-queue', { calls: 10 })
      ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue([mockQueue])

      const { refreshQueue, queues } = useAmiQueues(mockClient)

      await refreshQueue('test-queue')

      expect(mockClient.getQueueStatus).toHaveBeenCalledWith('test-queue')
      expect(queues.value.get('test-queue')?.calls).toBe(10)
    })

    it('should set error when client is null', async () => {
      const { refreshQueue, error } = useAmiQueues(null)

      await refreshQueue('test-queue')

      expect(error.value).toBe('AMI client not connected')
    })
  })

  describe('getSummary', () => {
    it('should get queue summaries', async () => {
      const mockSummaries: QueueSummary[] = [
        { queue: 'sales-queue', loggedIn: 5, available: 3, callers: 2, holdtime: 30, talktime: 120, longest: 45 },
        { queue: 'support-queue', loggedIn: 3, available: 2, callers: 1, holdtime: 20, talktime: 90, longest: 15 },
      ]

      ;(mockClient.getQueueSummary as ReturnType<typeof vi.fn>).mockResolvedValue(mockSummaries)

      const { getSummary, summaries } = useAmiQueues(mockClient)

      const result = await getSummary()

      expect(result.length).toBe(2)
      expect(summaries.value).toEqual(mockSummaries)
    })

    it('should throw when client is null', async () => {
      const { getSummary } = useAmiQueues(null)

      await expect(getSummary()).rejects.toThrow('AMI client not connected')
    })
  })

  /**
   * Member Management Tests
   * Verify pause/unpause, add/remove, and penalty management
   *
   * Member operations:
   * - Pause with optional reason
   * - Unpause and clear reason
   * - Add with configuration
   * - Remove from queue
   * - Set penalty value
   */
  describe('Member Management', () => {
    describe.each([
      {
        operation: 'pauseMember',
        description: 'pause member',
        initialState: { paused: false, pausedReason: '' },
        action: (composable: any) => composable.pauseMember('test-queue', TEST_FIXTURES.members.sip1000, 'Lunch'),
        expectedCall: ['test-queue', TEST_FIXTURES.members.sip1000, true, 'Lunch'],
        expectedState: { paused: true, pausedReason: 'Lunch' },
      },
      {
        operation: 'unpauseMember',
        description: 'unpause member',
        initialState: { paused: true, pausedReason: 'Lunch' },
        action: (composable: any) => composable.unpauseMember('test-queue', TEST_FIXTURES.members.sip1000),
        expectedCall: ['test-queue', TEST_FIXTURES.members.sip1000, false],
        expectedState: { paused: false, pausedReason: '' },
      },
    ])('$description', ({ operation, initialState, action, expectedCall, expectedState }) => {
      it(`should ${operation.replace('Member', ' member')}`, async () => {
        const { queues, [operation]: memberOp } = useAmiQueues(mockClient) as any

        queues.value.set('test-queue', createMockQueue('test-queue', {
          members: [createMockMember(TEST_FIXTURES.members.sip1000, initialState)],
        }))

        await action({ [operation]: memberOp, queues })

        if (operation === 'pauseMember') {
          expect(mockClient.queuePause).toHaveBeenCalledWith(...expectedCall)
        } else {
          expect(mockClient.queuePause).toHaveBeenCalledWith(...expectedCall)
        }

        const member = queues.value.get('test-queue')?.members[0]
        expect(member?.paused).toBe(expectedState.paused)
        expect(member?.pausedReason).toBe(expectedState.pausedReason)
      })

      it('should call onMemberUpdate callback', async () => {
        const onMemberUpdate = vi.fn()
        const { queues, [operation]: memberOp } = useAmiQueues(mockClient, { onMemberUpdate }) as any

        queues.value.set('test-queue', createMockQueue('test-queue', {
          members: [createMockMember(TEST_FIXTURES.members.sip1000, initialState)],
        }))

        await action({ [operation]: memberOp, queues })

        expect(onMemberUpdate).toHaveBeenCalled()
      })

      it('should throw when client is null', async () => {
        const { [operation]: memberOp } = useAmiQueues(null) as any

        await expect(
          action({ [operation]: memberOp })
        ).rejects.toThrow(TEST_FIXTURES.errors.clientNotConnected)
      })
    })

    describe('addMember', () => {
    it('should add member to queue', async () => {
      ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue([
        createMockQueue('test-queue', { members: [createMockMember('SIP/1000')] }),
      ])

      const { addMember } = useAmiQueues(mockClient)

      await addMember('test-queue', 'SIP/1000', { memberName: 'Agent 1', penalty: 1 })

      expect(mockClient.queueAdd).toHaveBeenCalledWith('test-queue', 'SIP/1000', { memberName: 'Agent 1', penalty: 1 })
    })

    it('should throw when client is null', async () => {
      const { addMember } = useAmiQueues(null)

      await expect(addMember('test-queue', 'SIP/1000')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('removeMember', () => {
    it('should remove member from queue', async () => {
      const { queues, removeMember } = useAmiQueues(mockClient)

      queues.value.set('test-queue', createMockQueue('test-queue', {
        members: [createMockMember('SIP/1000'), createMockMember('SIP/2000')],
      }))

      await removeMember('test-queue', 'SIP/1000')

      expect(mockClient.queueRemove).toHaveBeenCalledWith('test-queue', 'SIP/1000')
      expect(queues.value.get('test-queue')?.members.length).toBe(1)
      expect(queues.value.get('test-queue')?.members[0].interface).toBe('SIP/2000')
    })

    it('should throw when client is null', async () => {
      const { removeMember } = useAmiQueues(null)

      await expect(removeMember('test-queue', 'SIP/1000')).rejects.toThrow('AMI client not connected')
    })
  })

    describe('setPenalty', () => {
      it('should set member penalty', async () => {
        const { queues, setPenalty } = useAmiQueues(mockClient)

        queues.value.set('test-queue', createMockQueue('test-queue', {
          members: [createMockMember('SIP/1000', { penalty: 0 })],
        }))

        await setPenalty('test-queue', 'SIP/1000', 5)

        expect(mockClient.queuePenalty).toHaveBeenCalledWith('test-queue', 'SIP/1000', 5)
        expect(queues.value.get('test-queue')?.members[0].penalty).toBe(5)
      })

      it('should throw when client is null', async () => {
        const { setPenalty } = useAmiQueues(null)

        await expect(setPenalty('test-queue', 'SIP/1000', 5)).rejects.toThrow('AMI client not connected')
      })
    })
  })

  /**
   * Computed Properties Tests
   * Verify aggregated statistics across all queues
   */
  describe('computed properties', () => {
    it('should compute totalCallers', async () => {
      const { queues, totalCallers } = useAmiQueues(mockClient)

      queues.value.set('queue1', createMockQueue('queue1', { calls: 5 }))
      queues.value.set('queue2', createMockQueue('queue2', { calls: 3 }))

      await nextTick()

      expect(totalCallers.value).toBe(8)
    })

    it('should compute totalAvailable', async () => {
      const { queues, totalAvailable } = useAmiQueues(mockClient)

      queues.value.set('queue1', createMockQueue('queue1', {
        members: [
          createMockMember('SIP/1000', { paused: false, status: QueueMemberStatus.NotInUse }),
          createMockMember('SIP/2000', { paused: true, status: QueueMemberStatus.NotInUse }),
          createMockMember('SIP/3000', { paused: false, status: QueueMemberStatus.InUse }),
        ],
      }))

      await nextTick()

      expect(totalAvailable.value).toBe(1)
    })

    it('should compute totalPaused', async () => {
      const { queues, totalPaused } = useAmiQueues(mockClient)

      queues.value.set('queue1', createMockQueue('queue1', {
        members: [
          createMockMember('SIP/1000', { paused: true }),
          createMockMember('SIP/2000', { paused: true }),
          createMockMember('SIP/3000', { paused: false }),
        ],
      }))

      await nextTick()

      expect(totalPaused.value).toBe(2)
    })

    it('should compute longestWait', async () => {
      const { queues, longestWait } = useAmiQueues(mockClient)

      queues.value.set('queue1', createMockQueue('queue1', {
        entries: [
          { queue: 'queue1', position: 1, channel: '', uniqueId: '1', callerIdNum: '', callerIdName: '', connectedLineNum: '', connectedLineName: '', wait: 30, priority: 0, serverId: 1 },
          { queue: 'queue1', position: 2, channel: '', uniqueId: '2', callerIdNum: '', callerIdName: '', connectedLineNum: '', connectedLineName: '', wait: 45, priority: 0, serverId: 1 },
        ],
      }))
      queues.value.set('queue2', createMockQueue('queue2', {
        entries: [
          { queue: 'queue2', position: 1, channel: '', uniqueId: '3', callerIdNum: '', callerIdName: '', connectedLineNum: '', connectedLineName: '', wait: 60, priority: 0, serverId: 1 },
        ],
      }))

      await nextTick()

      expect(longestWait.value).toEqual({ queue: 'queue2', wait: 60 })
    })

    it('should compute overallServiceLevel', async () => {
      const { queues, overallServiceLevel } = useAmiQueues(mockClient)

      queues.value.set('queue1', createMockQueue('queue1', { serviceLevelPerf: 80 }))
      queues.value.set('queue2', createMockQueue('queue2', { serviceLevelPerf: 90 }))

      await nextTick()

      expect(overallServiceLevel.value).toBe(85)
    })

    it('should return 0 for overallServiceLevel when no queues have data', async () => {
      const { queues, overallServiceLevel } = useAmiQueues(mockClient)

      queues.value.set('queue1', createMockQueue('queue1', { serviceLevelPerf: 0 }))

      await nextTick()

      expect(overallServiceLevel.value).toBe(0)
    })
  })

  describe('event handling', () => {
    it('should handle member status events', async () => {
      const onMemberUpdate = vi.fn()
      const { queues } = useAmiQueues(mockClient, { onMemberUpdate })

      // Setup queue
      queues.value.set('test-queue', createMockQueue('test-queue', {
        members: [createMockMember('SIP/1000')],
      }))

      const event: AmiMessage<AmiQueueMemberStatusEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueMemberStatus',
          Queue: 'test-queue',
          MemberName: 'Agent 1',
          Interface: 'SIP/1000',
          StateInterface: 'SIP/1000',
          Membership: 'static',
          Penalty: '0',
          CallsTaken: '10',
          LastCall: '1234567890',
          LastPause: '0',
          LoginTime: '0',
          InCall: '0',
          Status: String(QueueMemberStatus.InUse),
          Paused: '0',
          PausedReason: '',
          WrapupTime: '0',
          Ringinuse: '1',
        },
      }

      triggerClientEvent('queueMemberStatus', event)
      await nextTick()

      const member = queues.value.get('test-queue')?.members.find(m => m.interface === 'SIP/1000')
      expect(member?.status).toBe(QueueMemberStatus.InUse)
      expect(member?.callsTaken).toBe(10)
      expect(onMemberUpdate).toHaveBeenCalled()
    })

    it('should handle caller join events', async () => {
      const onCallerJoin = vi.fn()
      const { queues } = useAmiQueues(mockClient, { onCallerJoin })

      queues.value.set('test-queue', createMockQueue('test-queue'))

      const event: AmiMessage<AmiQueueCallerJoinEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueCallerJoin',
          Queue: 'test-queue',
          Position: '1',
          Channel: 'SIP/external-00000001',
          Uniqueid: '123.456',
          CallerIDNum: '5551234567',
          CallerIDName: 'External Caller',
          ConnectedLineNum: '',
          ConnectedLineName: '',
        },
      }

      triggerClientEvent('queueCallerJoin', event)
      await nextTick()

      expect(queues.value.get('test-queue')?.entries.length).toBe(1)
      expect(queues.value.get('test-queue')?.calls).toBe(1)
      expect(onCallerJoin).toHaveBeenCalled()
    })

    it('should handle caller leave events', async () => {
      const onCallerLeave = vi.fn()
      const { queues } = useAmiQueues(mockClient, { onCallerLeave })

      const entry: QueueEntry = {
        queue: 'test-queue',
        position: 1,
        channel: 'SIP/external-00000001',
        uniqueId: '123.456',
        callerIdNum: '5551234567',
        callerIdName: 'External Caller',
        connectedLineNum: '',
        connectedLineName: '',
        wait: 30,
        priority: 0,
        serverId: 1,
      }

      queues.value.set('test-queue', createMockQueue('test-queue', {
        calls: 1,
        entries: [entry],
      }))

      const event: AmiMessage<AmiQueueCallerLeaveEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueCallerLeave',
          Queue: 'test-queue',
          Uniqueid: '123.456',
        },
      }

      triggerClientEvent('queueCallerLeave', event)
      await nextTick()

      expect(queues.value.get('test-queue')?.entries.length).toBe(0)
      expect(queues.value.get('test-queue')?.calls).toBe(0)
      expect(onCallerLeave).toHaveBeenCalledWith(
        expect.objectContaining({ uniqueId: '123.456' }),
        'test-queue'
      )
    })

    it('should handle caller abandon events', async () => {
      const onCallerAbandon = vi.fn()
      const { queues } = useAmiQueues(mockClient, { onCallerAbandon })

      const entry: QueueEntry = {
        queue: 'test-queue',
        position: 1,
        channel: 'SIP/external-00000001',
        uniqueId: '123.456',
        callerIdNum: '5551234567',
        callerIdName: 'External Caller',
        connectedLineNum: '',
        connectedLineName: '',
        wait: 30,
        priority: 0,
        serverId: 1,
      }

      queues.value.set('test-queue', createMockQueue('test-queue', {
        calls: 1,
        abandoned: 0,
        entries: [entry],
      }))

      const event: AmiMessage<AmiQueueCallerAbandonEvent> = {
        type: 1,
        server_id: 1,
        server_name: 'test',
        ssl: false,
        data: {
          Event: 'QueueCallerAbandon',
          Queue: 'test-queue',
          Uniqueid: '123.456',
        },
      }

      triggerClientEvent('queueCallerAbandon', event)
      await nextTick()

      expect(queues.value.get('test-queue')?.entries.length).toBe(0)
      expect(queues.value.get('test-queue')?.abandoned).toBe(1)
      expect(onCallerAbandon).toHaveBeenCalled()
    })
  })

  describe('getPauseReasons', () => {
    it('should return default pause reasons', () => {
      const { getPauseReasons } = useAmiQueues(mockClient)

      const reasons = getPauseReasons()

      expect(reasons).toContain('Break')
      expect(reasons).toContain('Lunch')
    })

    it('should return custom pause reasons', () => {
      const customReasons = ['Coffee', 'Meeting', 'Training']
      const { getPauseReasons } = useAmiQueues(mockClient, { pauseReasons: customReasons })

      expect(getPauseReasons()).toEqual(customReasons)
    })
  })

  /**
   * Status Label Tests
   * Verify correct mapping of queue member status codes to human-readable labels
   */
  describe('getStatusLabel', () => {
    describe.each([
      {
        status: QueueMemberStatus.NotInUse,
        expectedLabel: 'Available',
        description: 'NotInUse status',
      },
      {
        status: QueueMemberStatus.InUse,
        expectedLabel: 'In Use',
        description: 'InUse status',
      },
      {
        status: QueueMemberStatus.Busy,
        expectedLabel: 'Busy',
        description: 'Busy status',
      },
      {
        status: QueueMemberStatus.Ringing,
        expectedLabel: 'Ringing',
        description: 'Ringing status',
      },
    ])('$description', ({ status, expectedLabel }) => {
      it(`should return "${expectedLabel}" for ${status}`, () => {
        const { getStatusLabel } = useAmiQueues(mockClient)

        expect(getStatusLabel(status)).toBe(expectedLabel)
      })
    })

    it('should allow custom status labels', () => {
      const { getStatusLabel } = useAmiQueues(mockClient, {
        statusLabels: {
          [QueueMemberStatus.NotInUse]: 'Ready',
        },
      })

      expect(getStatusLabel(QueueMemberStatus.NotInUse)).toBe('Ready')
    })
  })
})
