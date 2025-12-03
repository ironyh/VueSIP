/**
 * useAmiQueues composable unit tests
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

// Store event handlers for simulation
const eventHandlers: Record<string, Function[]> = {}

// Create mock AMI client
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

// Helper to trigger client events
function triggerClientEvent(event: string, ...args: unknown[]) {
  eventHandlers[event]?.forEach(handler => handler(...args))
}

// Helper to create mock queue
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
    serverId: 1,
    ...overrides,
  }
}

// Helper to create mock member
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
    serverId: 1,
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

  describe('initial state', () => {
    it('should have empty queues initially', () => {
      const { queues, queueList } = useAmiQueues(mockClient)

      expect(queues.value.size).toBe(0)
      expect(queueList.value).toEqual([])
    })

    it('should have loading as false initially', () => {
      const { loading } = useAmiQueues(mockClient)

      expect(loading.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = useAmiQueues(mockClient)

      expect(error.value).toBeNull()
    })

    it('should handle null client gracefully', () => {
      const { queues, error } = useAmiQueues(null)

      expect(queues.value.size).toBe(0)
      expect(error.value).toBeNull()
    })
  })

  describe('refresh', () => {
    it('should refresh queue data', async () => {
      const mockQueues: QueueInfo[] = [
        createMockQueue('sales-queue', { calls: 5 }),
        createMockQueue('support-queue', { calls: 3 }),
      ]

      ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueues)

      const { refresh, queues, queueList, loading, lastRefresh } = useAmiQueues(mockClient)

      expect(loading.value).toBe(false)

      const refreshPromise = refresh()
      expect(loading.value).toBe(true)

      await refreshPromise

      expect(loading.value).toBe(false)
      expect(queues.value.size).toBe(2)
      expect(queueList.value.length).toBe(2)
      expect(lastRefresh.value).toBeInstanceOf(Date)
    })

    it('should set error when client is null', async () => {
      const { refresh, error } = useAmiQueues(null)

      await refresh()

      expect(error.value).toBe('AMI client not connected')
    })

    it('should handle refresh errors', async () => {
      ;(mockClient.getQueueStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const { refresh, error, loading } = useAmiQueues(mockClient)

      await refresh()

      expect(error.value).toBe('Network error')
      expect(loading.value).toBe(false)
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

  describe('pauseMember', () => {
    it('should pause queue member', async () => {
      const { queues, pauseMember } = useAmiQueues(mockClient)

      // Setup queue with member
      queues.value.set('test-queue', createMockQueue('test-queue', {
        members: [createMockMember('SIP/1000', { paused: false })],
      }))

      await pauseMember('test-queue', 'SIP/1000', 'Lunch')

      expect(mockClient.queuePause).toHaveBeenCalledWith('test-queue', 'SIP/1000', true, 'Lunch')
      expect(queues.value.get('test-queue')?.members[0].paused).toBe(true)
      expect(queues.value.get('test-queue')?.members[0].pausedReason).toBe('Lunch')
    })

    it('should call onMemberUpdate callback', async () => {
      const onMemberUpdate = vi.fn()
      const { queues, pauseMember } = useAmiQueues(mockClient, { onMemberUpdate })

      queues.value.set('test-queue', createMockQueue('test-queue', {
        members: [createMockMember('SIP/1000')],
      }))

      await pauseMember('test-queue', 'SIP/1000', 'Break')

      expect(onMemberUpdate).toHaveBeenCalled()
    })

    it('should throw when client is null', async () => {
      const { pauseMember } = useAmiQueues(null)

      await expect(pauseMember('test-queue', 'SIP/1000')).rejects.toThrow('AMI client not connected')
    })
  })

  describe('unpauseMember', () => {
    it('should unpause queue member', async () => {
      const { queues, unpauseMember } = useAmiQueues(mockClient)

      queues.value.set('test-queue', createMockQueue('test-queue', {
        members: [createMockMember('SIP/1000', { paused: true, pausedReason: 'Lunch' })],
      }))

      await unpauseMember('test-queue', 'SIP/1000')

      expect(mockClient.queuePause).toHaveBeenCalledWith('test-queue', 'SIP/1000', false)
      expect(queues.value.get('test-queue')?.members[0].paused).toBe(false)
      expect(queues.value.get('test-queue')?.members[0].pausedReason).toBe('')
    })

    it('should throw when client is null', async () => {
      const { unpauseMember } = useAmiQueues(null)

      await expect(unpauseMember('test-queue', 'SIP/1000')).rejects.toThrow('AMI client not connected')
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

  describe('getStatusLabel', () => {
    it('should return correct status labels', () => {
      const { getStatusLabel } = useAmiQueues(mockClient)

      expect(getStatusLabel(QueueMemberStatus.NotInUse)).toBe('Available')
      expect(getStatusLabel(QueueMemberStatus.InUse)).toBe('In Use')
      expect(getStatusLabel(QueueMemberStatus.Busy)).toBe('Busy')
      expect(getStatusLabel(QueueMemberStatus.Ringing)).toBe('Ringing')
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
